#!/usr/bin/env node
/**
 * todos.js — Manage member todos via the team-ai server API.
 * Todos fire once at an exact datetime (up to minute precision).
 * Member ID and UUIDs are handled automatically.
 *
 * Commands:
 *   list
 *   add    --time "<YYYY-MM-DD HH:MM>" --text "<message>" [--notify]
 *   edit   --id <uuid> [--time "<YYYY-MM-DD HH:MM>"] [--text "<message>"] [--notify] [--status active|disabled]
 *   delete --id <uuid>
 */
const http = require('http');
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

function hasFlag(name) {
  return rest.includes(name);
}

// Convert "YYYY-MM-DD HH:MM" to ISO 8601
function toISO(timeStr) {
  const [datePart, timePart] = timeStr.trim().split(" ");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart || "00:00").split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute, 0).toISOString();
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

const apiBase = `/api/members/${encodeURIComponent(memberId)}/todos`;
const getTodos  = ()      => request('GET',  apiBase);
const saveTodos = (todos) => request('POST', apiBase, todos);

// --- Commands ---
async function main() {
  if (!command || command === 'list') {
    const todos = await getTodos();
    if (todos.length === 0) {
      console.log('No todos configured.');
    } else {
      todos.forEach((t, i) => {
        console.log(`[${i + 1}] id:      ${t.id}`);
        console.log(`     time:    ${t.triggerTime}`);
        console.log(`     text:    ${t.requestText}`);
        console.log(`     status:  ${t.status ?? 'active'}`);
        console.log(`     notify:  ${t.notify ?? false}`);
      });
    }
    return;
  }

  if (command === 'add') {
    const time = getArg('--time');
    const text = getArg('--text');
    if (!time || !text) {
      console.error('Usage: todos.js add --time "<YYYY-MM-DD HH:MM>" --text "<message>" [--notify]');
      process.exit(1);
    }
    const todo = {
      id: randomUUID(),
      triggerTime: toISO(time),
      requestText: text,
      notify: hasFlag('--notify'),
      status: 'active',
    };
    const todos = await getTodos();
    todos.push(todo);
    await saveTodos(todos);
    console.log(`Added  id:      ${todo.id}`);
    console.log(`       time:    ${todo.triggerTime}`);
    console.log(`       text:    ${text}`);
    console.log(`       notify:  ${todo.notify}`);
    console.log(`       status:  ${todo.status}`);
    return;
  }

  if (command === 'edit') {
    const id = getArg('--id');
    if (!id) { console.error('Usage: todos.js edit --id <uuid> [--time "<YYYY-MM-DD HH:MM>"] [--text "<message>"] [--notify] [--status active|disabled]'); process.exit(1); }
    const todos = await getTodos();
    const t = todos.find(t => t.id === id);
    if (!t) { console.error(`Todo not found: ${id}`); process.exit(1); }
    const time   = getArg('--time');
    const text   = getArg('--text');
    const status = getArg('--status');
    if (time)   t.triggerTime = toISO(time);
    if (text)   t.requestText = text;
    if (status) t.status      = status;
    if (hasFlag('--notify')) t.notify = true;
    await saveTodos(todos);
    console.log(`Updated id:      ${id}`);
    console.log(`        time:    ${t.triggerTime}`);
    console.log(`        text:    ${t.requestText}`);
    console.log(`        notify:  ${t.notify ?? false}`);
    console.log(`        status:  ${t.status ?? 'active'}`);
    return;
  }

  if (command === 'delete') {
    const id = getArg('--id');
    if (!id) { console.error('Usage: todos.js delete --id <uuid>'); process.exit(1); }
    const todos = await getTodos();
    const filtered = todos.filter(t => t.id !== id);
    if (filtered.length === todos.length) { console.error(`Todo not found: ${id}`); process.exit(1); }
    await saveTodos(filtered);
    console.log(`Deleted ${id}`);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error('Commands: list, add, edit, delete');
  process.exit(1);
}

main().catch(err => { console.error(err.message); process.exit(1); });