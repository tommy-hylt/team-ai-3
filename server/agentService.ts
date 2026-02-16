import { spawn } from "child_process";
import { readFile } from "fs/promises";
import { join } from "path";
import { Member } from "./member.ts";

export async function runAgent(member: Member, requestText: string) {
  const agentName = member.agents[0]; // Use first agent for now
  if (!agentName) {
    return "Error: No agent configured for this member.";
  }

  const agentConfig = await loadAgentConfig(agentName);
  if (!agentConfig) {
    return `Error: Agent configuration for '${agentName}' not found.`;
  }

  const context = await loadMemberContext(member.id);
  const prompt = `${context}

User Request: ${requestText}`;

  return await executeAgent(agentConfig.executable, [...agentConfig.args, prompt]);
}

async function loadAgentConfig(agentName: string) {
  const configPath = join(process.cwd(), "../agents", agentName, "agent.json");
  try {
    const content = await readFile(configPath, "utf-8");
    return JSON.parse(content) as { executable: string; args: string[] };
  } catch {
    return undefined;
  }
}

async function loadMemberContext(memberName: string) {
  const memberDir = join(process.cwd(), "../members", memberName);
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
    const process = spawn(executable, args, { shell: true });
    let output = "";
    let error = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      error += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0) {
        resolve(`Agent failed with code ${code}. Error: ${error}`);
        return;
      }
      resolve(output.trim());
    });
  });
}
