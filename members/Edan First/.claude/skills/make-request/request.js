#!/usr/bin/env node
/**
 * request.js — Send a request to another team member via the team-ai server.
 * Requester name is read automatically from member.json.
 *
 * Usage: node request.js --member "<member-folder-name>" --text "<message>"
 */
const http = require('http');
const fs   = require('fs');
const path = require('path');

const [,, ...rest] = process.argv;

function getArg(name) {
  const idx = rest.indexOf(name);
  return idx !== -1 ? rest[idx + 1] : null;
}

const member = getArg('--member');
const text   = getArg('--text');

if (!member || !text) {
  console.error('Usage: request.js --member "<member-folder-name>" --text "<message>"');
  process.exit(1);
}

// Auto-read requester name from member.json
const memberJsonPath = path.join(__dirname, '../../..', 'member.json');
const { name: requester } = JSON.parse(fs.readFileSync(memberJsonPath, 'utf8'));

const body = JSON.stringify({ text, requester });

const req = http.request({
  hostname: 'localhost',
  port: 8699,
  path: `/api/members/${encodeURIComponent(member)}/request`,
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
      const result = JSON.parse(raw);
      console.log(`OK  requestId: ${result.requestId}`);
      console.log(`    from:      ${requester}`);
      console.log(`    to:        ${member}`);
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
