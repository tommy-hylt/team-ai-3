import { readdir, readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Member from "./member";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function listMembers() {
  const membersDir = join(__dirname, "../members");
  const entries = await readdir(membersDir, { withFileTypes: true });
  
  const memberPromises = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => loadMember(entry.name));
    
  return (await Promise.all(memberPromises)).filter((member) => !!member);
}

export async function getMember(name: string) {
  return await loadMember(name);
}

async function loadMember(name: string) {
  const memberJsonPath = join(__dirname, "../members", name, "member.json");
  
  try {
    const content = await readFile(memberJsonPath, "utf-8");
    const member = JSON.parse(content) as Member;
    member.id = name;
    return member;
  } catch {
    return undefined;
  }
}
