function tryParseAgentJson(output: string) {
  const trimmed = output.trim();
  let lastOpen = trimmed.lastIndexOf("{");
  let lastClose = trimmed.lastIndexOf("}");
  
  while (lastOpen !== -1) {
    if (lastClose > lastOpen) {
      const candidate = trimmed.substring(lastOpen, lastClose + 1);
      try {
        const json = JSON.parse(candidate);
        if (json.response) return json.response;
        if (json.text) return json.text;
      } catch (e) {}
    }
    lastOpen = trimmed.lastIndexOf("{", lastOpen - 1);
  }
  return undefined;
}

const testOutput = `YOLO mode is enabled. All tool calls will be automatically approved.
Loaded cached credentials.
{
  "session_id": "8fcb57ad-de69-4790-afe1-18d4d4bed77e",
  "response": "Hello! I've completed the previous task.",
  "stats": {}
}`;

console.log("Parsed:", tryParseAgentJson(testOutput));
