import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import treeKill from "tree-kill";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROCESS_FILE = join(__dirname, "processes.json");
const SERVER_URL = "http://localhost:8699/api/server/id";

async function main() {
  let entries;
  try {
    const content = await readFile(PROCESS_FILE, "utf-8");
    entries = JSON.parse(content);
  } catch {
    console.log("No processes.json found — nothing to clean up.");
    return;
  }

  if (!entries.length) {
    console.log("No tracked processes.");
    return;
  }

  // Try to get current server ID
  let currentServerId = null;
  try {
    const res = await fetch(SERVER_URL);
    if (res.ok) {
      const data = await res.json();
      currentServerId = data.serverId;
      console.log(`Current server ID: ${currentServerId}`);
    }
  } catch {
    console.log("Server is not running — all tracked processes are orphans.");
  }

  const toKill = [];
  const toKeep = [];

  for (const entry of entries) {
    if (currentServerId && entry.server === currentServerId) {
      toKeep.push(entry);
    } else {
      toKill.push(entry);
    }
  }

  if (!toKill.length) {
    console.log("No stale processes to kill.");
    return;
  }

  console.log(`Killing ${toKill.length} stale process(es)...`);
  const kills = toKill.map(
    (entry) =>
      new Promise((resolve) => {
        console.log(`  PID ${entry.pid} (${entry.executable}, member=${entry.memberId}, server=${entry.server})`);
        treeKill(entry.pid, "SIGTERM", (err) => {
          if (err) console.log(`    -> already gone or error: ${err.message}`);
          else console.log(`    -> killed`);
          resolve();
        });
      })
  );

  await Promise.all(kills);
  await writeFile(PROCESS_FILE, JSON.stringify(toKeep, null, 2));
  console.log("Done.");
}

main();
