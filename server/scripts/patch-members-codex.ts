import { readdir, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const membersDir = join(__dirname, "../../members");

async function patchMembers() {
  const entries = await readdir(membersDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const memberJsonPath = join(membersDir, entry.name, "member.json");
      try {
        const content = await readFile(memberJsonPath, "utf-8");
        const member = JSON.parse(content);
        let changed = false;

        if (Array.isArray(member.agents)) {
          member.agents = member.agents.map((agent: string) => {
            if (agent === "codex-gpt-5.1-codex-mini") {
              changed = true;
              return "codex-gpt-5.3-codex-spark";
            }
            return agent;
          });
        }

        if (changed) {
          await writeFile(memberJsonPath, JSON.stringify(member, null, 2), "utf-8");
          console.log(`Patched ${entry.name}`);
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error(`Failed to patch ${entry.name}:`, err.message);
        }
      }
    }
  }
}

patchMembers();
