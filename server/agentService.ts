import { exec } from "child_process";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { Member } from "./member.ts";
import { getChatHistory } from "./chatService.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface AgentArgPart {
  type: "basic" | "resume";
  parts: string[];
}

interface AgentConfig {
  executable: string;
  args: AgentArgPart[];
}

export async function runAgent(member: Member, requestText: string) {
  const agentName = member.agents[0]; // Use first agent for now
  if (!agentName) {
    return "Error: No agent configured for this member.";
  }

  const agentConfig = await loadAgentConfig(agentName);
  if (!agentConfig) {
    return `Error: Agent configuration for '${agentName}' not found.`;
  }

  const history = await getChatHistory(member.id);
  const hasHistory = history.some(h => h.type === "response");

  const context = await loadMemberContext(member.id);
  const prompt = hasHistory 
    ? requestText 
    : `${context}\n\nUser Request: ${requestText}`;

  const finalArgs: string[] = [];
  for (const argPart of agentConfig.args) {
    if (argPart.type === "basic" || (argPart.type === "resume" && hasHistory)) {
      finalArgs.push(...argPart.parts);
    }
  }
  
  // Append the prompt at the end
  finalArgs.push(`"${prompt.replace(/"/g, '\\"')}"`);

  return await executeAgent(agentConfig.executable, finalArgs);
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

async function loadMemberContext(memberName: string) {
  const memberDir = join(__dirname, "../members", memberName);
  const charPath = join(memberDir, "CHARACTER.md");
  const memPath = join(memberDir, "MEMORY.md");

  const [charContent, memContent] = await Promise.all([
    tryReadFile(charPath),
    tryReadFile(memPath),
  ]);

  return `CHARACTER:
${charContent || ""}

MEMORY:
${memContent || ""}`;
}

async function tryReadFile(path: string) {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}

function executeAgent(executable: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    const command = `${executable} ${args.join(" ")}`;
    exec(command, (error, stdout, stderr) => {
      if (error) {
        // Even if it failed, try to parse JSON error from stdout
        const parsed = tryParseGeminiJson(stdout);
        if (parsed) {
          resolve(parsed);
          return;
        }
        resolve(`Agent failed. Error: ${stderr || error.message}`);
        return;
      }

      // Try to parse as Agent JSON first
      const parsed = tryParseAgentJson(stdout);
      if (parsed) {
        resolve(parsed);
        return;
      }

      resolve(stdout.trim());
    });
  });
}

function tryParseAgentJson(output: string): string | undefined {
  const lines = output.trim().split("\n");
  
  // Try to find any line that is a valid JSON object
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        const json = JSON.parse(line);
        
        // Gemini format
        if (json.text) return json.text;
        if (json.replies && Array.isArray(json.replies)) return json.replies.join("\n");
        
        // Claude format
        if (json.type === "result" && json.result) return json.result;
        
        // Codex format (JSONL stream)
        // Codex often sends multiple JSON objects, we look for the one with the actual result or error
        if (json.type === "turn.finished" && json.result) return json.result;
        if (json.type === "error" && json.message) return `Error: ${json.message}`;
        if (json.error && json.error.message) return `Error: ${json.error.message}`;
      } catch {
        // Not a valid JSON on this line, continue
      }
    }
  }
  
  // Try multi-line JSON if single-line parsing failed
  const lastOpen = output.lastIndexOf("{");
  const lastClose = output.lastIndexOf("}");
  if (lastOpen !== -1 && lastClose > lastOpen) {
    try {
      const candidate = output.substring(lastOpen, lastClose + 1);
      const json = JSON.parse(candidate);
      if (json.text) return json.text;
      if (json.result) return json.result;
      if (json.replies && Array.isArray(json.replies)) return json.replies.join("\n");
    } catch {
      // Not valid JSON
    }
  }

  return undefined;
}
