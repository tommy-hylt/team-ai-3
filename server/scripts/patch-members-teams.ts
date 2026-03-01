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
        if (!member.teams) {
          member.teams = ["General"];
          await writeFile(memberJsonPath, JSON.stringify(member, null, 2), "utf-8");
          console.log(`Patched ${entry.name}`);
        } else {
          console.log(`Skipped ${entry.name} (already has teams)`);
        }
      } catch (err: any) {
        console.error(`Failed to patch ${entry.name}:`, err.message);
      }
    }
  }
}

patchMembers();
