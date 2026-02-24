#!/usr/bin/env tsx
/**
 * View chat history for a member.
 * Usage: tsx scripts/chat-history.ts "Ava Admin"
 */
import { getChatHistory } from "../chatService.ts";

const memberName = process.argv[2];

if (!memberName) {
  console.error("Usage: tsx scripts/chat-history.ts <member-name>");
  process.exit(1);
}

const history = await getChatHistory(memberName);

if (history.length === 0) {
  console.log(`No chat history for "${memberName}".`);
  process.exit(0);
}

console.log(`Chat history for "${memberName}" (${history.length} messages):\n`);

for (const entry of history) {
  const time = new Date((entry as any).time || (entry as any).requestTime).toLocaleString();
  if (entry.type === "request") {
    const req = entry as any;
    console.log(`[${time}] REQUEST from ${req.requester}:`);
    console.log(`  ${req.text}`);
  } else {
    console.log(`[${time}] RESPONSE:`);
    console.log(`  ${(entry as any).text?.substring(0, 200)}${(entry as any).text?.length > 200 ? "..." : ""}`);
  }
  console.log();
}
