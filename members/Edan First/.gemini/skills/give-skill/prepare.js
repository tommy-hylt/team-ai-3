#!/usr/bin/env node
/**
 * prepare.js — Ensure .claude / .gemini / .agents skill folders are in sync.
 * Uses .claude as source of truth (falls back to first folder found).
 * Usage: node prepare.js --skill <skill-name>
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const skillIdx = args.indexOf('--skill');
if (skillIdx === -1 || !args[skillIdx + 1]) {
  console.error('Usage: node prepare.js --skill <skill-name>');
  process.exit(1);
}
const skillName = args[skillIdx + 1];

const memberRoot = path.resolve(__dirname, '../../..');
const FOLDERS = ['.claude', '.gemini', '.agents'];
const skillPaths = FOLDERS.map(f => path.join(memberRoot, f, 'skills', skillName));

// Recursively hash a directory into a string for comparison
function hashDir(dir) {
  if (!fs.existsSync(dir)) return null;
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) return fs.readFileSync(dir, 'utf8');
  return fs.readdirSync(dir).sort().map(name => {
    const full = path.join(dir, name);
    return fs.statSync(full).isDirectory()
      ? `${name}/[${hashDir(full)}]`
      : `${name}:${fs.readFileSync(full, 'utf8')}`;
  }).join('|');
}

// Recursively copy src dir into dst dir
function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// Pick source of truth: prefer .claude, fall back to first existing
const sourceDir = skillPaths.find(p => fs.existsSync(p));
if (!sourceDir) {
  console.error(`Skill "${skillName}" not found in any of the 3 folders.`);
  process.exit(1);
}

const sourceHash = hashDir(sourceDir);
const outOfSync = skillPaths.filter(p => hashDir(p) !== sourceHash);

if (outOfSync.length === 0) {
  console.log(`OK  "${skillName}" is in sync across all 3 folders.`);
} else {
  console.log(`Syncing "${skillName}" from: ${sourceDir}`);
  for (const dest of outOfSync) {
    copyDir(sourceDir, dest);
    console.log(`  -> synced ${dest}`);
  }
  console.log('Done.');
}
