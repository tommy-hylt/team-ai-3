#!/usr/bin/env tsx
/**
 * Test JSON parsing on agent output.
 * Usage: echo '{"result":"hello","session_id":"abc"}' | tsx scripts/test-agent-parse.ts
 *    or: tsx scripts/test-agent-parse.ts < output.json
 */

// Read all stdin
export {};
const chunks: Buffer[] = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}
const input = Buffer.concat(chunks).toString("utf-8");

if (!input.trim()) {
  console.error("No input received. Pipe agent output via stdin.");
  console.error('Example: echo \'{"result":"hello","session_id":"abc"}\' | tsx scripts/test-agent-parse.ts');
  process.exit(1);
}

console.log(`Input (${input.length} chars):`);
console.log(input.substring(0, 500));
if (input.length > 500) console.log("...(truncated)");
console.log();

// Inline the parsing logic to avoid import issues when testing standalone
const trimmed = input.trim();

function extractResponse(json: any) {
  const sessionId = json.session_id || json.sessionId || undefined;
  if (json.response) return { text: json.response, sessionId };
  if (json.text) return { text: json.text, sessionId };
  if (json.replies && Array.isArray(json.replies)) return { text: json.replies.join("\n"), sessionId };
  if (json.type === "result" && json.result) return { text: json.result, sessionId };
  if (json.result && typeof json.result === "string") return { text: json.result, sessionId };
  if (json.type === "turn.finished" && json.result) return { text: json.result, sessionId };
  if (json.type === "error" && json.message) return { text: `Error: ${json.message}`, sessionId };
  if (json.error?.message) return { text: `Error: ${json.error.message}`, sessionId };
  return undefined;
}

// Try brace-matching approach
let found = false;
let lastOpen = trimmed.lastIndexOf("{");
let lastClose = trimmed.lastIndexOf("}");

while (lastOpen !== -1) {
  if (lastClose > lastOpen) {
    const candidate = trimmed.substring(lastOpen, lastClose + 1);
    try {
      const json = JSON.parse(candidate);
      const result = extractResponse(json);
      if (result) {
        console.log("Parsed result:");
        console.log(`  text: ${result.text.substring(0, 200)}${result.text.length > 200 ? "..." : ""}`);
        console.log(`  sessionId: ${result.sessionId || "(none)"}`);
        console.log(`  raw JSON keys: ${Object.keys(json).join(", ")}`);
        found = true;
        break;
      }
    } catch { }
  }
  lastOpen = trimmed.lastIndexOf("{", lastOpen - 1);
}

// Try line-by-line approach
if (!found) {
  const lines = trimmed.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      try {
        const json = JSON.parse(line);
        const result = extractResponse(json);
        if (result) {
          console.log(`Parsed result (from line ${i + 1}):`);
          console.log(`  text: ${result.text.substring(0, 200)}`);
          console.log(`  sessionId: ${result.sessionId || "(none)"}`);
          found = true;
          break;
        }
      } catch { }
    }
  }
}

if (!found) {
  console.log("Could not parse any known response format from input.");
  console.log("Would return raw stdout as-is.");
}
