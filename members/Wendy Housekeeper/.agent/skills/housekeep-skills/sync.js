#!/usr/bin/env node
/**
 * sync.js — Housekeep skill folders across all members.
 *
 * For each member, ensures .claude/skills/, .gemini/skills/, and .agent/skills/
 * contain the same set of skills with identical contents.
 *
 * Source of truth: the existing skill folder whose newest file mtime is latest.
 *
 * Usage: node sync.js
 */

const fs = require('fs');
const path = require('path');

const FOLDERS = ['.claude', '.gemini', '.agent'];

// __dirname = <members>/<MemberName>/.claude/skills/housekeep-skills
// memberRoot = <members>/<MemberName>  (go up 3 levels)
// membersDir = <members>              (go up 4 levels)
const membersDir = path.resolve(__dirname, '../../../..');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Recursively copy src → dst, creating directories as needed. */
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    if (fs.statSync(s).isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

/**
 * Return the latest mtime (ms) of any file recursively under dirPath.
 * Returns -Infinity if the path does not exist or contains no files.
 */
function newestMtime(dirPath) {
  if (!fs.existsSync(dirPath)) return -Infinity;
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) return stat.mtimeMs;
  let latest = -Infinity;
  for (const name of fs.readdirSync(dirPath)) {
    const t = newestMtime(path.join(dirPath, name));
    if (t > latest) latest = t;
  }
  return latest;
}

/**
 * Recursively produce a canonical string fingerprint of a directory.
 * Returns null if the path does not exist.
 */
function hashDir(dirPath) {
  if (!fs.existsSync(dirPath)) return null;
  const stat = fs.statSync(dirPath);
  if (!stat.isDirectory()) return fs.readFileSync(dirPath, 'utf8');
  return fs.readdirSync(dirPath)
    .sort()
    .map(name => {
      const full = path.join(dirPath, name);
      return fs.statSync(full).isDirectory()
        ? `${name}/[${hashDir(full)}]`
        : `${name}:${fs.readFileSync(full, 'utf8')}`;
    })
    .join('|');
}

// ── Main ─────────────────────────────────────────────────────────────────────

const memberEntries = fs.readdirSync(membersDir, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

let totalSynced = 0;
let totalOk = 0;

for (const memberName of memberEntries) {
  const memberRoot = path.join(membersDir, memberName);

  // Collect which skill folders exist for this member
  const skillsDirs = FOLDERS.map(f => path.join(memberRoot, f, 'skills'));
  const existingSkillsDirs = skillsDirs.filter(d => fs.existsSync(d));

  if (existingSkillsDirs.length === 0) continue; // member has no skills at all

  // Gather the union of all skill names across all 3 folders
  const allSkills = new Set();
  for (const sd of existingSkillsDirs) {
    for (const entry of fs.readdirSync(sd, { withFileTypes: true })) {
      if (entry.isDirectory()) allSkills.add(entry.name);
    }
  }

  if (allSkills.size === 0) continue;

  console.log(`\n[${memberName}]`);

  for (const skillName of [...allSkills].sort()) {
    // Paths for this skill in each of the 3 folders
    const skillPaths = FOLDERS.map(f => path.join(memberRoot, f, 'skills', skillName));

    // Pick source of truth: the existing folder with the newest file mtime
    const existing = skillPaths.filter(p => fs.existsSync(p));
    if (existing.length === 0) continue; // shouldn't happen, but guard anyway
    const source = existing.reduce((a, b) => newestMtime(a) >= newestMtime(b) ? a : b);

    const sourceHash = hashDir(source);
    const outOfSync = skillPaths.filter(p => hashDir(p) !== sourceHash);

    if (outOfSync.length === 0) {
      console.log(`  OK     ${skillName}`);
      totalOk++;
    } else {
      for (const dest of outOfSync) {
        copyDir(source, dest);
        console.log(`  Synced ${skillName}  →  ${path.relative(memberRoot, dest)}`);
      }
      totalSynced++;
    }
  }
}

console.log(`\n─────────────────────────────────`);
console.log(`Done. ${totalOk} skill(s) already in sync, ${totalSynced} skill(s) synced.`);
