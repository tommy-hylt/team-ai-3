#!/usr/bin/env node
/**
 * response.js — Add a response to this member's chat history via the team-ai server.
 * Member name and ID are read automatically from member.json.
 * No matching request is required — requestId is intentionally left blank.
 *
 * Usage: node response.js --text "<message>" [--notify]
 *
 *   --notify   Send a push notification to the user when this response is posted (default: off)
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const [,, ...rest] = process.argv;

function getArg(name) {
  const idx = rest.indexOf(name);
  return idx !== -1 ? rest[idx + 1] : null;
}

const text = getArg('--text');

if (!text) {
  console.error('Usage: response.js --text "<message>" [--notify]');
  process.exit(1);
}

// Auto-read member info from member.json
const memberJsonPath = path.join(__dirname, '../../..', 'member.json');
const { name: memberName } = JSON.parse(fs.readFileSync(memberJsonPath, 'utf8'));

// Derive member ID from folder name (= API :id)
const memberId = path.basename(path.resolve(__dirname, '../../..'));

const notify = rest.includes('--notify');

const body = JSON.stringify({
  text,
  agent: memberName,
  notify,
});

const req = http.request({
  hostname: 'localhost',
  port: 8699,
  path: `/api/members/${encodeURIComponent(memberId)}/responses`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
}, (res) => {
  let raw = '';
  res.on('data', chunk => raw += chunk);
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log(`OK  Response posted as "${memberName}"`);
      console.log(`    notify: ${notify}`);
    } else {
      console.error(`Error ${res.statusCode}: ${raw}`);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`Connection failed: ${e.message}`);
  console.error('Is the server running on port 8699?');
  process.exit(1);
});

req.write(body);
req.end();
