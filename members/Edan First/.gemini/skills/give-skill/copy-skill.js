#!/usr/bin/env node
/**
 * copy-skill.js — Copy a skill from this member to a target member.
 * Copies into all 3 folders: .claude / .gemini / .agents
 * Usage: node copy-skill.js --skill <skill-name> --member <target-member-folder-name>
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const skillIdx  = args.indexOf('--skill');
const memberIdx = args.indexOf('--member');

if (skillIdx === -1 || !args[skillIdx + 1] || memberIdx === -1 || !args[memberIdx + 1]) {
  console.error('Usage: node copy-skill.js --skill <skill-name> --member <target-member-folder-name>');
  process.exit(1);
}

const skillName    = args[skillIdx + 1];
const targetMember = args[memberIdx + 1];

const memberRoot  = path.resolve(__dirname, '../../..');
const membersDir  = path.resolve(__dirname, '../../../..');

const sourcePath = path.join(memberRoot, '.claude', 'skills', skillName);
if (!fs.existsSync(sourcePath)) {
  console.error(`Source skill not found: ${sourcePath}`);
  process.exit(1);
}

const targetRoot = path.join(membersDir, targetMember);
if (!fs.existsSync(targetRoot)) {
  console.error(`Target member folder not found: ${targetRoot}`);
  process.exit(1);
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dst, name);
    fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

const FOLDERS = ['.claude', '.gemini', '.agents'];
for (const folder of FOLDERS) {
  const dest = path.join(targetRoot, folder, 'skills', skillName);
  copyDir(sourcePath, dest);
  console.log(`  -> ${dest}`);
}

console.log(`Done. Skill "${skillName}" copied to "${targetMember}".`);
