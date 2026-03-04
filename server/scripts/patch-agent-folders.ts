import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const membersDir = join(process.cwd(), 'members');

function patchFolders() {
  const members = readdirSync(membersDir).filter(name => statSync(join(membersDir, name)).isDirectory());
  for (const member of members) {
    const agentDir = join(membersDir, member, '.agent');
    const agentsDir = join(membersDir, member, '.agents');
    try {
      if (statSync(agentDir).isDirectory()) {
        console.log(`Renaming .agent to .agents for ${member}`);
        execSync(`git mv ".agent" ".agents"`, { cwd: join(membersDir, member) });
      }
    } catch (e) {
      // ignore
    }
  }
}

function replaceInFiles(dir: string) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      replaceInFiles(fullPath);
    } else if (fullPath.endsWith('.md') || fullPath.endsWith('.js')) {
      let content = readFileSync(fullPath, 'utf8');
      if (content.includes('.agent')) {
        content = content.replace(/\.agent\b/g, '.agents');
        writeFileSync(fullPath, content, 'utf8');
        console.log(`Patched ${fullPath}`);
      }
    }
  }
}

console.log("Patching folders...");
patchFolders();
console.log("Patching files...");
replaceInFiles(membersDir);
console.log("Done.");
