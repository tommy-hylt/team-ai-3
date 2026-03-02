# Team AI / agents

This folder contains AI agent templates, defining how different models are invoked by the system.

An agent template is a directory under `agents/` containing:
- `agent.json`: Configuration for the executable and its arguments.
- `DESCRIPTION.md`: A human-readable description of the agent shown in the UI.

## Template structure

```text
agents/<agentName>/
  agent.json
  DESCRIPTION.md
```

### agent.json

Minimal schema:

```json
{
  "name": "gemini-2.5-flash",
  "executable": "gemini",
  "args": [
    { "type": "basic", "parts": ["-m", "gemini-2.5-flash", "-y", "-o", "json"] },
    { "type": "resume", "parts": ["-r"] }
  ]
}
```

- `executable`: The command-line tool to run (e.g., `claude`, `gemini`, `codex`).
- `args`: An array of parts conditionally included based on session history.
    - `type: "basic"`: Always included.
    - `type: "resume"`: Included when a stored session ID exists, to resume a conversation.
- The prompt is delivered via a stdin pipe to the executable.

## Available Agent Families (9 total)

- **Claude**: `claude-haiku`, `claude-sonnet`, `claude-opus`
- **Gemini**: `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`
- **Codex (OpenAI)**: `codex-gpt-5.2`, `codex-gpt-5.3-codex`, `codex-gpt-5.3-codex-spark`
