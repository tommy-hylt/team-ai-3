#!/usr/bin/env node
/**
 * routines.js — Manage member routines via the team-ai server API.
 * Member ID and UUIDs are handled automatically.
 *
 * Commands:
 *   list
 *   add    --cron "<pattern>" --text "<message>"
 *   edit   --id <uuid> [--cron "<pattern>"] [--text "<message>"]
 *   delete --id <uuid>
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// Derive member ID from folder name (= API :id)
const memberId = path.basename(path.resolve(__dirname, '../../..'));

// --- Arg parsing ---
const [,, command, ...rest] = process.argv;

function getArg(name) {
  const idx = rest.indexOf(name);
  return idx !== -1 ? rest[idx + 1] : null;
}

// --- HTTP helpers ---
function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body != null ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: 8699,
      path: urlPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(raw));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${raw}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const apiBase = `/api/members/${encodeURIComponent(memberId)}/routines`;
const getRoutines  = ()         => request('GET',  apiBase);
const saveRoutines = (routines) => request('POST', apiBase, routines);

// --- Commands ---
async function main() {
  if (!command || command === 'list') {
    const routines = await getRoutines();
    if (routines.length === 0) {
      console.log('No routines configured.');
    } else {
      routines.forEach((r, i) => {
        console.log(`[${i + 1}] id:   ${r.id}`);
        console.log(`     cron: ${r.cronPattern}`);
        console.log(`     text: ${r.requestText}`);
        console.log(`     last: ${r.lastTime || '(never)'}`);
      });
    }
    return;
  }

  if (command === 'add') {
    const cron = getArg('--cron');
    const text = getArg('--text');
    if (!cron || !text) {
      console.error('Usage: routines.js add --cron "<pattern>" --text "<message>"');
      process.exit(1);
    }
    const now = new Date().toISOString();
    const routine = { id: randomUUID(), cronPattern: cron, requestText: text, startTime: now, lastTime: now };
    const routines = await getRoutines();
    routines.push(routine);
    await saveRoutines(routines);
    console.log(`Added  id:   ${routine.id}`);
    console.log(`       cron: ${cron}`);
    console.log(`       text: ${text}`);
    return;
  }

  if (command === 'edit') {
    const id = getArg('--id');
    if (!id) { console.error('Usage: routines.js edit --id <uuid> [--cron "<pattern>"] [--text "<message>"]'); process.exit(1); }
    const routines = await getRoutines();
    const r = routines.find(r => r.id === id);
    if (!r) { console.error(`Routine not found: ${id}`); process.exit(1); }
    const cron = getArg('--cron');
    const text = getArg('--text');
    if (cron) r.cronPattern = cron;
    if (text) r.requestText = text;
    await saveRoutines(routines);
    console.log(`Updated id:   ${id}`);
    console.log(`        cron: ${r.cronPattern}`);
    console.log(`        text: ${r.requestText}`);
    return;
  }

  if (command === 'delete') {
    const id = getArg('--id');
    if (!id) { console.error('Usage: routines.js delete --id <uuid>'); process.exit(1); }
    const routines = await getRoutines();
    const filtered = routines.filter(r => r.id !== id);
    if (filtered.length === routines.length) { console.error(`Routine not found: ${id}`); process.exit(1); }
    await saveRoutines(filtered);
    console.log(`Deleted ${id}`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Commands: list, add, edit, delete');
  process.exit(1);
}

main().catch(err => { console.error(err.message); process.exit(1); });
