import { readdir, readFile, writeFile, mkdir, rm, stat } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MEMBERS_DIR = join(__dirname, "../members");
const VENDOR_FOLDERS = [".claude", ".gemini", ".agent"];

function memberDir(memberId: string) {
  return join(MEMBERS_DIR, memberId);
}

/** List entries (files/dirs) at a relative path inside a member folder */
export async function listFiles(memberId: string, relativePath: string) {
  const fullPath = join(memberDir(memberId), relativePath);
  try {
    const entries = await readdir(fullPath, { withFileTypes: true });
    return entries.map(e => ({
      name: e.name,
      type: e.isDirectory() ? "directory" : "file",
    }));
  } catch {
    return [];
  }
}

/** Get file content by relative path */
export async function getFile(memberId: string, relativePath: string) {
  const fullPath = join(memberDir(memberId), relativePath);
  try {
    return await readFile(fullPath, "utf-8");
  } catch {
    return undefined;
  }
}

/** Save file content, with skill sync across vendor folders */
export async function saveFile(memberId: string, relativePath: string, content: string) {
  const paths = getSkillSyncPaths(relativePath);
  const base = memberDir(memberId);

  for (const p of paths) {
    const fullPath = join(base, p);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, "utf-8");
  }
}

/** Delete file or folder, with skill sync across vendor folders */
export async function deleteFile(memberId: string, relativePath: string) {
  const paths = getSkillSyncPaths(relativePath);
  const base = memberDir(memberId);

  for (const p of paths) {
    const fullPath = join(base, p);
    try {
      const s = await stat(fullPath);
      await rm(fullPath, { recursive: s.isDirectory() });
    } catch {
      // already gone
    }
  }
}

/**
 * If path is inside a vendor skills folder (e.g. .claude/skills/foo/SKILL.md),
 * return all 3 vendor paths. Otherwise return just the original path.
 */
function getSkillSyncPaths(relativePath: string): string[] {
  const normalized = relativePath.replace(/\\/g, "/");

  for (const vendor of VENDOR_FOLDERS) {
    const prefix = `${vendor}/skills/`;
    if (normalized.startsWith(prefix)) {
      const rest = normalized.slice(prefix.length);
      return VENDOR_FOLDERS.map(v => `${v}/skills/${rest}`);
    }
  }

  return [relativePath];
}

/** Check if a skill exists in all 3 vendor folders */
export async function checkSkillSync(memberId: string, skillName: string) {
  const base = memberDir(memberId);
  const results: Record<string, boolean> = {};

  for (const vendor of VENDOR_FOLDERS) {
    const skillPath = join(base, vendor, "skills", skillName);
    try {
      await stat(skillPath);
      results[vendor] = true;
    } catch {
      results[vendor] = false;
    }
  }

  return results;
}

/** Check if a file exists in all 3 vendor skill folders and content matches */
export async function checkFileSync(memberId: string, skillName: string, fileName: string) {
  const base = memberDir(memberId);
  const results: Record<string, { exists: boolean; content?: string; mtime?: number; size?: number }> = {};

  for (const vendor of VENDOR_FOLDERS) {
    const filePath = join(base, vendor, "skills", skillName, fileName);
    try {
      const s = await stat(filePath);
      const content = await readFile(filePath, "utf-8");
      results[vendor] = { 
        exists: true, 
        content,
        mtime: s.mtimeMs,
        size: s.size
      };
    } catch {
      results[vendor] = { exists: false };
    }
  }

  return results;
}
