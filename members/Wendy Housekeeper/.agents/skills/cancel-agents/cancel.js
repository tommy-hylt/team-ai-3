#!/usr/bin/env node
/**
 * cancel.js — Cancel stale running/pending requests across all members.
 *
 * Uses the server API throughout (same endpoints as the web cancel button).
 * A request is "stale" if its status is "running" or "pending"
 * and its requestTime is more than 1 day (24 hours) old.
 *
 * Usage: node ".claude/skills/cancel-agents/cancel.js"
 */

const SERVER_URL = 'http://localhost:8699';
const STALE_MS = 24 * 60 * 60 * 1000; // 1 day in milliseconds

async function main() {
  const now = Date.now();

  // 1. List all members via API
  let members;
  try {
    members = await fetch(`${SERVER_URL}/api/members`).then(r => r.json());
  } catch (err) {
    console.error(`Failed to reach server at ${SERVER_URL}: ${err.message}`);
    process.exit(1);
  }

  let totalStale = 0;
  let totalCancelled = 0;

  for (const member of members) {
    // 2. Get chat history for this member (contains requests with type:"request")
    let history;
    try {
      history = await fetch(`${SERVER_URL}/api/members/${encodeURIComponent(member.id)}/chat`).then(r => r.json());
    } catch (err) {
      console.warn(`[${member.id}]  Error fetching chat: ${err.message}`);
      continue;
    }

    const stale = history.filter(item =>
      item.type === 'request' &&
      (item.status === 'running' || item.status === 'pending') &&
      (now - new Date(item.requestTime).getTime()) > STALE_MS
    );

    if (stale.length === 0) continue;

    console.log(`\n[${member.id}]`);

    for (const req of stale) {
      totalStale++;
      const ageHours = ((now - new Date(req.requestTime).getTime()) / (1000 * 60 * 60)).toFixed(1);
      const preview = req.text.length > 40 ? req.text.substring(0, 40) + '…' : req.text;

      // 3. Cancel via the same API the web cancel button uses
      try {
        const res = await fetch(`${SERVER_URL}/api/requests/${req.id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId: member.id }),
        });
        const data = await res.json();

        if (data.ok) {
          totalCancelled++;
          console.log(`  Cancelled  [${req.status}]  ${req.id.substring(0, 8)}…  (${ageHours}h old)  "${preview}"`);
        } else {
          console.log(`  Failed     [${req.status}]  ${req.id.substring(0, 8)}…  ${JSON.stringify(data)}`);
        }
      } catch (err) {
        console.log(`  Error      [${req.status}]  ${req.id.substring(0, 8)}…  ${err.message}`);
      }
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Done. ${totalCancelled}/${totalStale} stale request(s) cancelled.`);
}

main();
