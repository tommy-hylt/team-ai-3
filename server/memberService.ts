import { readdir, readFile, writeFile, mkdir, cp } from "fs/promises";
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
    
  return (await Promise.all(memberPromises)).filter((member) => !!member && member.status !== "deleted");
}

export async function getMember(name: string) {
  const member = await loadMember(name);
  if (member?.status === "deleted") return undefined;
  return member;
}

export async function createMember(data: any) {
  const name = data.name.trim();
  const memberDir = join(__dirname, "../members", name);
  
  await mkdir(memberDir, { recursive: true });

  const memberJson = {
    name: name,
    description: data.description || "",
    agents: data.agents || ["gemini-2.5-flash"],
    status: "active"
  };

  await Promise.all([
    writeFile(join(memberDir, "member.json"), JSON.stringify(memberJson, null, 2), "utf-8"),
    writeFile(join(memberDir, "CHARACTER.md"), data.character || "", "utf-8"),
    writeFile(join(memberDir, "MEMORY.md"), data.memory || "", "utf-8"),
    writeFile(join(memberDir, "requests.json"), "[]", "utf-8"),
    writeFile(join(memberDir, "responses.json"), "[]", "utf-8"),
  ]);

  if (data.cloneFrom) {
    const sourceDir = join(__dirname, "../members", data.cloneFrom);
    const vendorFolders = [".claude", ".gemini", ".agent"];

    for (const vendor of vendorFolders) {
      const sourceSkills = join(sourceDir, vendor, "skills");
      const destSkills = join(memberDir, vendor, "skills");

      try {
        if (data.includeSkills && Array.isArray(data.includeSkills)) {
          // Selective copy
          for (const skillName of data.includeSkills) {
            const src = join(sourceSkills, skillName);
            const dst = join(destSkills, skillName);
            await mkdir(dirname(dst), { recursive: true });
            try {
              await cp(src, dst, { recursive: true });
            } catch {
              // specific skill might not exist in this vendor folder, ignore
            }
          }
        } else {
          // Copy all
          await cp(sourceSkills, destSkills, { recursive: true });
        }
      } catch (e) {
        // Source skills folder might not exist, which is fine
      }
    }
  }

  return await getMemberDetails(name);
}

export async function getMemberDetails(name: string) {
  const member = await loadMember(name);
  if (!member || member.status === "deleted") return undefined;

  const charPath = join(__dirname, "../members", name, "CHARACTER.md");
  const memPath = join(__dirname, "../members", name, "MEMORY.md");
  const agentsDir = join(__dirname, "../agents");

  const [character, memory, agentEntries] = await Promise.all([
    tryReadFile(charPath) || "",
    tryReadFile(memPath) || "",
    readdir(agentsDir, { withFileTypes: true }),
  ]);

  const availableAgents = agentEntries
    .filter(e => e.isDirectory())
    .map(e => e.name);

  return { ...member, character, memory, availableAgents };
}

export async function updateMemberDetails(name: string, data: any) {
  const memberDir = join(__dirname, "../members", name);
  
  if (data.description !== undefined || data.agents !== undefined) {
    const memberJsonPath = join(memberDir, "member.json");
    const current = await loadMember(name);
    if (current) {
      const updated = {
        ...current,
        description: data.description ?? current.description,
        agents: data.agents ?? current.agents,
      };
      // Remove id before saving as it's derived from folder name
      const { id, ...rest } = updated as any;
      await writeFile(memberJsonPath, JSON.stringify(rest, null, 2), "utf-8");
    }
  }

  if (data.character !== undefined) {
    const charPath = join(memberDir, "CHARACTER.md");
    await writeFile(charPath, data.character, "utf-8");
  }

  if (data.memory !== undefined) {
    const memPath = join(memberDir, "MEMORY.md");
    await writeFile(memPath, data.memory, "utf-8");
  }

  return await getMemberDetails(name);
}

export async function deleteMember(name: string) {
  const memberJsonPath = join(__dirname, "../members", name, "member.json");
  try {
    const member = await loadMember(name);
    if (!member) return false;
    
    const updated = { ...member, status: "deleted" };
    const { id, ...rest } = updated as any;
    await writeFile(memberJsonPath, JSON.stringify(rest, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
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

async function tryReadFile(path: string) {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return undefined;
  }
}
