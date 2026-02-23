import { spawn, ChildProcess } from "child_process";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Member } from "./member.ts";
import { getSessionId, saveSessionId, expireSession } from "./sessionService.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

const activeProcesses = new Map<string, { process: ChildProcess; memberId: string }>();
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

export function cancelRequest(requestId: string): boolean {
  const entry = activeProcesses.get(requestId);
  if (entry) {
    console.log(`[cancelRequest] Killing process ${entry.process.pid} for request ${requestId}`);
    // On Windows, killing without shell:true might be more direct
    entry.process.kill();
    activeProcesses.delete(requestId);
    return true;
  }
  return false;
}

export function cancelAllRequests(memberId: string) {
  console.log(`[cancelAllRequests] Cancelling all requests for member ${memberId}`);
  for (const [requestId, entry] of activeProcesses.entries()) {
    if (entry.memberId === memberId) {
      console.log(`[cancelAllRequests] Killing process ${entry.process.pid} for request ${requestId}`);
      entry.process.kill();
      activeProcesses.delete(requestId);
    }
  }
}

interface AgentArgPart {
  type: "basic" | "resume";
  parts: string[];
}

interface AgentConfig {
  executable: string;
  args: AgentArgPart[];
  resume_with_id?: string[];    // e.g. ["--session-id"] for claude, ["-r"] for gemini
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
      const isFallback = i > 0;
      console.log(`[runAgent] ${isFallback ? "Fallback" : "Starting"} for member="${member.id}", agent="${agentName}"`);

      const agentConfig = await loadAgentConfig(agentName);
      if (!agentConfig) {
        console.log(`[runAgent] Agent config not found for "${agentName}", skipping`);
        continue;
      }

      const result = await tryAgent(member.id, agentName, agentConfig, memberDir, requestText, requestId);
      if (result) return result;
    }

    return { text: "Error: All agents failed. Please try again later.", agentName: "system" };
  } finally {
    release();
  }
}

async function tryAgent(
  memberId: string,
  agentName: string,
  config: AgentConfig,
  memberDir: string,
  requestText: string,
  requestId: string,
): Promise<{ text: string, agentName: string } | undefined> {
  const sessionId = await getSessionId(memberId, agentName);

  // Try resume if we have a session
  if (sessionId) {
    console.log(`[tryAgent] Attempting resume for "${agentName}" with sessionId=${sessionId}`);
    const result = await invokeAgent(config, memberDir, requestText, requestId, memberId, sessionId);
    if (!result.failed) {
      if (result.sessionId) {
        await saveSessionId(memberId, agentName, result.sessionId);
      }
      return { text: result.text, agentName };
    }
    console.log(`[tryAgent] Resume failed for "${agentName}", expiring session`);
    await expireSession(memberId, agentName);
  }

  // Fresh invocation
  const freshPrompt = `Please read CHARACTER.md and MEMORY.md first.\n\n${requestText}`;
  console.log(`[tryAgent] Fresh invocation for "${agentName}"`);
  const result = await invokeAgent(config, memberDir, freshPrompt, requestId, memberId);
  if (!result.failed) {
    if (result.sessionId) {
      console.log(`[tryAgent] Saving session ID for "${agentName}": ${result.sessionId}`);
      await saveSessionId(memberId, agentName, result.sessionId);
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
  sessionId?: string,
): Promise<InvokeResult> {
  const finalArgs: string[] = [];
  for (const argPart of config.args) {
    if (argPart.type === "basic") {
      finalArgs.push(...argPart.parts);
    } else if (argPart.type === "resume" && sessionId) {
      // Add the standard resume flags from args definition (e.g. -c for claude, -r for gemini)
      finalArgs.push(...argPart.parts);

      // If we have a specific flag to pass the session ID, add it if not already present
      if (config.resume_with_id && config.resume_with_id.length > 0) {
        const idFlag = config.resume_with_id[0];
        if (!argPart.parts.includes(idFlag)) {
          finalArgs.push(...config.resume_with_id);
          finalArgs.push(sessionId);
        }
      }
    }
  }

  console.log(`[invokeAgent] Executing: ${config.executable} ${finalArgs.join(' ')}`);
  console.log(`[invokeAgent] prompt length=${prompt.length} chars, resume=${!!sessionId}`);

  const startTime = Date.now();
  const result = await executeAgent(config.executable, finalArgs, cwd, requestId, memberId, prompt);
  const elapsed = Date.now() - startTime;
  console.log(`[invokeAgent] Completed in ${elapsed}ms, result length=${result.text.length}`);

  const failed = !result.text
    || result.text.startsWith("Agent failed.")
    || result.text.startsWith("Agent process error:")
    || result.text.startsWith("Error:");
  return { ...result, failed };
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

function executeAgent(executable: string, args: string[], cwd: string, requestId: string, memberId: string, stdinData?: string): Promise<AgentResult> {
  return new Promise((resolve) => {
    console.log(`[executeAgent] Spawning: ${executable} ${args.join(' ')} (cwd: ${cwd})`);
    const env = { ...process.env };
    delete env.CLAUDECODE;
    // Disable shell for more reliable process control
    const proc = spawn(executable, args, { shell: false, env, cwd });
    
    // Register process
    activeProcesses.set(requestId, { process: proc, memberId });

    let stdout = "";
    let stderr = "";

    console.log(`[executeAgent] Process PID: ${proc.pid}`);

    if (stdinData) {
      console.log(`[executeAgent] Writing ${stdinData.length} chars to stdin`);
      proc.stdin.write(stdinData);
      proc.stdin.end();
    }

    proc.stdout.on("data", (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log(`[executeAgent] stdout chunk (${chunk.length} chars): ${chunk.substring(0, 200)}`);
    });
    proc.stderr.on("data", (data) => {
      const chunk = data.toString();
      stderr += chunk;
      console.log(`[executeAgent] stderr chunk (${chunk.length} chars): ${chunk.substring(0, 200)}`);
    });

    proc.on("error", (err) => {
      console.error(`[executeAgent] Process error:`, err);
      activeProcesses.delete(requestId);
      resolve({ text: `Agent process error: ${err.message}` });
    });

    proc.on("close", (code) => {
      activeProcesses.delete(requestId);
      console.log(`[executeAgent] Process closed with code ${code}`);
      console.log(`[executeAgent] Total stdout: ${stdout.length} chars`);
      console.log(`[executeAgent] Total stderr: ${stderr.length} chars`);
      if (stdout.length > 0) {
        console.log(`[executeAgent] stdout preview: ${stdout.substring(0, 500)}`);
      }
      if (stderr.length > 0) {
        console.log(`[executeAgent] stderr preview: ${stderr.substring(0, 500)}`);
      }

      const parsed = tryParseAgentJson(stdout);
      if (parsed) {
        console.log(`[executeAgent] Parsed JSON response: ${parsed.text.substring(0, 200)}`);
        if (parsed.sessionId) {
          console.log(`[executeAgent] Found session ID: ${parsed.sessionId}`);
        }
        resolve(parsed);
        return;
      }

      if (code !== 0) {
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

  let lastOpen = trimmed.lastIndexOf("{");
  let lastClose = trimmed.lastIndexOf("}");

  while (lastOpen !== -1) {
    if (lastClose > lastOpen) {
      const candidate = trimmed.substring(lastOpen, lastClose + 1);
      try {
        const json = JSON.parse(candidate);
        const result = extractResponse(json);
        if (result) return result;
      } catch { }
    }
    lastOpen = trimmed.lastIndexOf("{", lastOpen - 1);
  }

  const lines = trimmed.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        const json = JSON.parse(line);
        const result = extractResponse(json);
        if (result) return result;
      } catch { }
    }
  }

  return undefined;
}

function extractResponse(json: any): AgentResult | undefined {
  // Extract session_id from any JSON that contains it
  const sessionId = json.session_id || json.sessionId || undefined;

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
