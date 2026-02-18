#!/usr/bin/env tsx
/**
 * Run an agent directly for a member.
 * Usage: tsx scripts/run-agent.ts "Ava Admin" "hello"
 */
import { getMember } from "../memberService.ts";
import { runAgent } from "../agentService.ts";

const [memberName, requestText] = process.argv.slice(2);

if (!memberName || !requestText) {
  console.error("Usage: tsx scripts/run-agent.ts <member-name> <request-text>");
  process.exit(1);
}

const member = await getMember(memberName);
if (!member) {
  console.error(`Member not found: "${memberName}"`);
  process.exit(1);
}

console.log(`Running agent for "${member.id}" (agent: ${member.agents[0]})...`);
console.log(`Request: ${requestText}\n`);

const response = await runAgent(member, requestText);
console.log("--- Response ---");
console.log(response);
