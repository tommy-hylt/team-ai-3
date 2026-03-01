import { readdir, readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const membersDir = join(__dirname, "../../members");

async function patchRoutines() {
  const entries = await readdir(membersDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const routinesJsonPath = join(membersDir, entry.name, "routines.json");
      try {
        const content = await readFile(routinesJsonPath, "utf-8");
        const routines = JSON.parse(content);
        let changed = false;

        if (Array.isArray(routines)) {
          for (const routine of routines) {
            if (!routine.status) {
              routine.status = "active";
              changed = true;
            }
          }
        }

        if (changed) {
          await writeFile(routinesJsonPath, JSON.stringify(routines, null, 2), "utf-8");
          console.log(`Patched routines for ${entry.name}`);
        } else {
          console.log(`Skipped routines for ${entry.name} (already has status or no routines)`);
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error(`Failed to patch routines for ${entry.name}:`, err.message);
        }
      }
    }
  }
}

patchRoutines();
