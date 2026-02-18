# Team AI / agents

This folder contains AI agent templates, defining how different models are invoked by the system.

An agent template is a directory under `agents/` containing:
- `agent.json`: Configuration for the executable and its arguments.
- `DESCRIPTION.md`: A human-readable description of the agent.

## Template structure

```
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
    { "type": "basic", "parts": ["-m", "gemini-2.5-flash", "-y"] },
    { "type": "resume", "parts": ["-r"] },
    { "type": "resume", "parts": ["-r"] }
  ],
  "resume_with_id": ["-r"]
}
```

- `executable`: The command-line tool to run (e.g., `claude`, `gemini`).
- `args`: An array of parts conditionally included based on session history.
    - `type: "basic"`: Always included.
    - `type: "resume"`: Included when a stored session ID exists.
- `resume_with_id`: Args to pass for session resume (e.g., `["--session-id"]` for Claude, `["-r"]` for Gemini).
- Prompt is delivered via stdin pipe (no `-p` flag needed).

## Available Agent Families (6)

- **Claude**: `claude-haiku`, `claude-sonnet`, `claude-opus`
- **Gemini**: `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`
