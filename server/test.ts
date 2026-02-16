import { listMembers } from "./memberService.ts";

async function test() {
  const members = await listMembers();
  console.log("Found members:", members.map(m => m.name));
  
  if (members.length === 0) {
    console.error("No members found. Check if ../members directory exists and contains member.json files.");
    process.exit(1);
  }
}

test();
