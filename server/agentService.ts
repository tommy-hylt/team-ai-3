import { spawn, ChildProcess } from "child_process";
import { readFile, writeFile, appendFile } from "fs/promises";
import { randomBytes } from "crypto";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import treeKill from "tree-kill";
import Member from "./member.ts";
import { getSessionId, saveSessionId, expireSession } from "./sessionService.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROCESS_FILE = join(__dirname, "processes.json");

// Force restart to clear deadlocks
function generateUUIDv7(): string {
  const now = BigInt(Date.now());
  const bytes = Buffer.alloc(16);
  bytes.writeBigUInt64BE(now << 16n, 0);
  randomBytes(10).copy(bytes, 6);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

const serverId = generateUUIDv7();
console.log(`[agentService] Server instance ID: ${serverId}`);

export function getServerId(): string {
  return serverId;
}

const activeProcesses = new Map<string, { process: ChildProcess; memberId: string; pid: number; executable: string; startTime: string; server: string }>();
const cancelledRequests = new Set<string>();
const memberLocks = new Map<string, Promise<void>>();

async function acquireLock(memberId: string): Promise<() => void> {
  const existing = memberLocks.get(memberId) || Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  memberLocks.set(memberId, next);
  await existing;
  return () => {
    if (memberLocks.get(memberId) === next) {
      memberLocks.delete(memberId);
    }
    release();
  };
}

function syncProcessFile() {
  const entries = Array.from(activeProcesses.entries()).map(([requestId, entry]) => ({
    requestId,
    memberId: entry.memberId,
    pid: entry.pid,
    executable: entry.executable,
    startTime: entry.startTime,
    server: entry.server,
  }));
  writeFile(PROCESS_FILE, JSON.stringify(entries, null, 2)).catch((err) => {
    console.error("[syncProcessFile] Failed to write processes.json:", err.message);
  });
}

export function cancelRequest(requestId: string): boolean {
  cancelledRequests.add(requestId);
  const entry = activeProcesses.get(requestId);
  if (entry) {
    const pid = entry.process.pid;
    console.log(`[cancelRequest] Killing process tree for PID ${pid}, request ${requestId}`);
    activeProcesses.delete(requestId);
    syncProcessFile();
    if (pid) {
      treeKill(pid, "SIGTERM", (err) => {
        if (err) console.error(`[cancelRequest] tree-kill error for PID ${pid}:`, err.message);
        else console.log(`[cancelRequest] Process tree for PID ${pid} killed successfully`);
      });
    }
    return true;
  }
  return false;
}

export function cancelAllRequests(memberId: string) {
  console.log(`[cancelAllRequests] Cancelling all requests for member ${memberId}`);
  for (const [requestId, entry] of activeProcesses.entries()) {
    if (entry.memberId === memberId) {
      cancelledRequests.add(requestId);
      const pid = entry.process.pid;
      console.log(`[cancelAllRequests] Killing process tree for PID ${pid}, request ${requestId}`);
      activeProcesses.delete(requestId);
      if (pid) {
        treeKill(pid, "SIGTERM", (err) => {
          if (err) console.error(`[cancelAllRequests] tree-kill error for PID ${pid}:`, err.message);
          else console.log(`[cancelAllRequests] Process tree for PID ${pid} killed successfully`);
        });
      }
    }
  }
  syncProcessFile();
}

export function isMemberBusy(memberId: string): boolean {
  for (const entry of activeProcesses.values()) {
    if (entry.memberId === memberId) return true;
  }
  return false;
}

interface AgentArgPart {
  type: "basic" | "resume";
  parts: string[];
}

interface AgentConfig {
  executable: string;
  args: AgentArgPart[];
}

export async function runAgent(member: Member, requestText: string, requestId: string) {
  const release = await acquireLock(member.id);
  try {
    if (!member.agents.length) {
      console.log(`[runAgent] No agents configured for "${member.id}"`);
      return { text: "Error: No agent configured for this member.", agentName: "system" };
    }

    const memberDir = join(__dirname, "../members", member.id);

    // Try each agent in order, falling back to the next on failure
    for (let i = 0; i < member.agents.length; i++) {
      const agentName = member.agents[i];
      
      if (cancelledRequests.has(requestId)) {
        console.log(`[runAgent] Request ${requestId} cancelled`);
        cancelledRequests.delete(requestId);
        return { text: "Request cancelled.", agentName: "system" };
      }

      const agentConfig = await loadAgentConfig(agentName);
      if (!agentConfig) {
        console.log(`[runAgent] Agent config not found for "${agentName}"`);
        continue;
      }

      const result = await tryAgent(member, agentName, agentConfig, memberDir, requestText, requestId);
      if (result) {
        return result;
      }
    }

    return { text: "Error: All agents failed. Please try again later.", agentName: "system" };
  } catch (e: any) {
    console.error(`[runAgent] Unexpected error:`, e);
    return { text: `Error: ${e.message}`, agentName: "system" };
  } finally {
    cancelledRequests.delete(requestId);
    release();
  }
}

async function tryAgent(
  member: Member,
  agentName: string,
  config: AgentConfig,
  memberDir: string,
  requestText: string,
  requestId: string,
): Promise<{ text: string, agentName: string } | undefined> {
  const sessionId = await getSessionId(member.id, agentName);

  // Try resume if we have a session
  if (sessionId) {
    console.log(`[tryAgent] Attempting resume for "${agentName}" with sessionId=${sessionId}`);
    const result = await invokeAgent(config, memberDir, requestText, requestId, member.id, agentName, sessionId);
    if (!result.failed) {
      if (result.sessionId) {
        await saveSessionId(member.id, agentName, result.sessionId);
      }
      return { text: result.text, agentName };
    }
    // If cancelled, don't retry with fresh invocation
    if (cancelledRequests.has(requestId)) {
      console.log(`[tryAgent] Request ${requestId} was cancelled, not retrying`);
      return undefined;
    }
    console.log(`[tryAgent] Resume failed for "${agentName}", expiring session`);
    await expireSession(member.id, agentName);
  }

  // If cancelled, don't start fresh invocation
  if (cancelledRequests.has(requestId)) {
    console.log(`[tryAgent] Request ${requestId} was cancelled, skipping fresh invocation`);
    return undefined;
  }

  // Fresh invocation
  const freshPrompt = `IMPORTANT: You are currently acting as '${member.name}', an AI team member operating in your dedicated workspace.
Your identity and core instructions are defined in './CHARACTER.md'.
Your long-term memory and project context are stored in './MEMORY.md'.

MANDATORY FIRST STEP:
You must read both './CHARACTER.md' and './MEMORY.md' now to understand your role, personality, and history before addressing the request below.

User Request:
${requestText}`;
  console.log(`[tryAgent] Fresh invocation for "${agentName}"`);
  const result = await invokeAgent(config, memberDir, freshPrompt, requestId, member.id, agentName);
  if (!result.failed) {
    if (result.sessionId) {
      console.log(`[tryAgent] Saving session ID for "${agentName}": ${result.sessionId}`);
      await saveSessionId(member.id, agentName, result.sessionId);
    }
    return { text: result.text, agentName };
  }

  console.log(`[tryAgent] Agent "${agentName}" failed`);
  return undefined;
}

interface InvokeResult extends AgentResult {
  failed: boolean;
}

async function invokeAgent(
  config: AgentConfig,
  cwd: string,
  prompt: string,
  requestId: string,
  memberId: string,
  agentName: string,
  sessionId?: string,
): Promise<InvokeResult> {
  const finalArgs: string[] = [];
  for (const argPart of config.args) {
    if (argPart.type === "basic") {
      finalArgs.push(...argPart.parts);
    } else if (argPart.type === "resume" && sessionId) {
      finalArgs.push(...argPart.parts);
      finalArgs.push(sessionId);
    }
  }

  console.log(`[invokeAgent] Executing: ${config.executable} ${finalArgs.join(' ')}`);
  console.log(`[invokeAgent] prompt length=${prompt.length} chars, resume=${!!sessionId}`);

  const startTime = Date.now();
  const result = await executeAgent(config.executable, finalArgs, cwd, requestId, memberId, agentName, prompt);
  const elapsed = Date.now() - startTime;
  console.log(`[invokeAgent] Completed in ${elapsed}ms, result length=${result?.text?.length || 0}`);

  const failed = isAgentResponseFailed(result.text);
  return { ...result, failed };
}

function isAgentResponseFailed(text: string): boolean {
  if (!text) return true;
  const t = text.trim();
  if (t.startsWith("Agent failed.") || t.startsWith("Agent process error:") || t.startsWith("Error:")) return true;
  
  // Anchored patterns for common CLI quota/limit leaks
  const failurePatterns = [
    /^you've hit your limit . resets \d+(am|pm)( \([^)]+\))?$/i, // Claude (account for dot separator)
    /^quota exceeded$/i,                                         // Gemini (strict)
    /^rate limit reached$/i,                                     // OpenAI/Codex (strict)
    /^too many requests$/i                                       // Generic (strict)
  ];

  return failurePatterns.some(re => re.test(t));
}

async function loadAgentConfig(agentName: string): Promise<AgentConfig | undefined> {
  const configPath = join(__dirname, "../agents", agentName, "agent.json");
  try {
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content) as AgentConfig;
  } catch {
    return undefined;
  }
}

interface AgentResult {
  text: string;
  sessionId?: string;
}

function executeAgent(executable: string, args: string[], cwd: string, requestId: string, memberId: string, agentName: string, stdinData?: string): Promise<AgentResult> {
  return new Promise((resolve) => {
    console.log(`[executeAgent] Spawning: ${executable} ${args.join(' ')} (cwd: ${cwd})`);
    const env = { ...process.env };
    delete env.CLAUDECODE;
    // Re-enable shell for command discovery (especially for .cmd files on Windows like gemini)
    const proc = spawn(executable, args, { shell: true, env, cwd });
    
    // Register process
    activeProcesses.set(requestId, { process: proc, memberId, pid: proc.pid!, executable, startTime: new Date().toISOString(), server: serverId });
    syncProcessFile();

    let stdout = "";
    let stderr = "";
    let isResolved = false;

    console.log(`[executeAgent] Process PID: ${proc.pid}`);

    const logFilePath = join(__dirname, "logs", `${requestId}-${agentName}.log`);

    if (stdinData) {
      console.log(`[executeAgent] Writing ${stdinData.length} chars to stdin`);
      proc.stdin.write(stdinData);
      proc.stdin.end();
    }

    proc.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      appendFile(logFilePath, chunk, "utf-8").catch(() => {});
      console.log(`[executeAgent] stdout chunk (${chunk.length} chars): ${chunk.substring(0, 200)}`);
    });

    proc.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      appendFile(logFilePath, chunk, "utf-8").catch(() => {});
      console.log(`[executeAgent] stderr chunk (${chunk.length} chars): ${chunk.substring(0, 200)}`);
    });

    proc.on("error", (err) => {
      console.error(`[executeAgent] Process error:`, err);
      activeProcesses.delete(requestId);
      syncProcessFile();
      if (!isResolved) {
        isResolved = true;
        resolve({ text: `Agent process error: ${err.message}` });
      }
    });

    proc.on("exit", (code) => {
      activeProcesses.delete(requestId);
      syncProcessFile();
      console.log(`[executeAgent] Process exited with code ${code}`);
      
      // Dump full raw output to a dedicated log file for debugging multiple messages
      const debugLog = `\n=========================================\n` +
        `Time: ${new Date().toISOString()}\n` +
        `Member: ${memberId}\n` +
        `Request: ${requestId}\n` +
        `Exit: ${code}\n` +
        `--- STDOUT ---\n${stdout}\n` +
        `--- STDERR ---\n${stderr}\n`;
      appendFile(join(__dirname, "agent_raw_output.log"), debugLog, "utf-8").catch(err => 
        console.error("[executeAgent] Failed to write raw log:", err)
      );

      console.log(`[executeAgent] Total stdout: ${stdout.length} chars`);
      console.log(`[executeAgent] Total stderr: ${stderr.length} chars`);
      if (stdout.length > 0) {
        console.log(`[executeAgent] stdout preview: ${stdout.substring(0, 500)}`);
      }
      if (stderr.length > 0) {
        console.log(`[executeAgent] stderr preview: ${stderr.substring(0, 500)}`);
      }

      if (isResolved) return;

      const parsed = tryParseAgentJson(stdout);
      if (parsed) {
        isResolved = true;
        console.log(`[executeAgent] Parsed JSON response: ${parsed.text.substring(0, 200)}`);
        if (parsed.sessionId) {
          console.log(`[executeAgent] Found session ID: ${parsed.sessionId}`);
        }
        resolve(parsed);
        return;
      }

      isResolved = true;
      if (code !== 0 && code !== null) {
        console.log(`[executeAgent] Non-zero exit code, returning error`);
        resolve({ text: `Agent failed. Code ${code}. Error: ${stderr}` });
        return;
      }

      console.log(`[executeAgent] Returning raw stdout`);
      resolve({ text: stdout.trim() });
    });
  });
}

function tryParseAgentJson(output: string): AgentResult | undefined {
  const trimmed = output.trim();
  const lines = trimmed.split("\n");

  let finalResult: AgentResult | undefined = undefined;
  let collectedSessionId: string | undefined = undefined;

  // 0. Regex fallback for session ID in case JSON parsing fails entirely due to formatting
  const sessionMatch = trimmed.match(/"session_id"\s*:\s*"([^"]+)"/) || trimmed.match(/"sessionId"\s*:\s*"([^"]+)"/) || trimmed.match(/"thread_id"\s*:\s*"([^"]+)"/);
  if (sessionMatch) {
    collectedSessionId = sessionMatch[1];
  }

  // 1. Try parsing JSONL top-to-bottom to collect thread/session IDs and text
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith("{") && l.endsWith("}")) {
      try {
        const json = JSON.parse(l);
        if (json.thread_id) collectedSessionId = json.thread_id;
        if (json.session_id) collectedSessionId = json.session_id;
        if (json.sessionId) collectedSessionId = json.sessionId;

        const result = extractResponse(json);
        if (result && result.text) {
          finalResult = result;
          if (result.sessionId) collectedSessionId = result.sessionId;
        }
      } catch { }
    }
  }

  if (finalResult && finalResult.text) {
    return { text: finalResult.text, sessionId: finalResult.sessionId || collectedSessionId };
  }

  // 2. Try block-based parsing (for Claude/Gemini single huge objects)
  let lastOpen = trimmed.lastIndexOf("{");
  let lastClose = trimmed.lastIndexOf("}");

  while (lastOpen !== -1) {
    if (lastClose > lastOpen) {
      const candidate = trimmed.substring(lastOpen, lastClose + 1);
      try {
        const json = JSON.parse(candidate);
        const result = extractResponse(json);
        if (result && result.text) {
          result.sessionId = result.sessionId || collectedSessionId;
          return result;
        }
      } catch { }
    }
    lastOpen = trimmed.lastIndexOf("{", lastOpen - 1);
  }

  // Fallback to raw text but preserve any session ID we managed to extract via regex
  return { text: trimmed, sessionId: collectedSessionId };
}

function extractResponse(json: any): AgentResult | undefined {
  // Extract session_id from any JSON that contains it
  const sessionId = json.session_id || json.sessionId || json.thread_id || undefined;

  // Codex JSONL handling
  if (json.type === "item.completed" && json.item && json.item.type === "agent_message" && json.item.text) {
    return { text: json.item.text, sessionId };
  }

  if (json.response) return { text: json.response, sessionId };
  if (json.text) return { text: json.text, sessionId };
  if (json.replies && Array.isArray(json.replies)) return { text: json.replies.join("\n"), sessionId };

  if (json.type === "result" && json.result) return { text: json.result, sessionId };
  if (json.result && typeof json.result === "string") return { text: json.result, sessionId };

  if (json.type === "turn.finished" && json.result) return { text: json.result, sessionId };
  if (json.type === "error" && json.message) return { text: `Error: ${json.message}`, sessionId };
  if (json.error && json.error.message) return { text: `Error: ${json.error.message}`, sessionId };

  return undefined;
}
