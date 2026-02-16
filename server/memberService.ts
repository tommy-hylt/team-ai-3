import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { Member } from "./member.ts";

export async function listMembers() {
  const membersDir = join(process.cwd(), "../members");
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
  const memberJsonPath = join(process.cwd(), "../members", name, "member.json");
  
  try {
    const content = await readFile(memberJsonPath, "utf-8");
    const member = JSON.parse(content) as Member;
    member.id = name;
    return member;
  } catch {
    return undefined;
  }
}
