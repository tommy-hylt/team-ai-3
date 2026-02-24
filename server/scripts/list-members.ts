#!/usr/bin/env tsx
/**
 * List all members and their agents.
 * Usage: tsx scripts/list-members.ts
 */
import { listMembers } from "../memberService.ts";

const members = await listMembers();

if (members.length === 0) {
  console.log("No members found.");
  process.exit(0);
}

for (const member of members) {
  if (!member) continue;
  console.log(`${member.name}`);
  console.log(`  Description: ${member.description || "(none)"}`);
  console.log(`  Agents: ${member.agents.join(", ")}`);
  console.log();
}
