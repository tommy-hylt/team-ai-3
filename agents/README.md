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
  "name": "agy-2.5-flash",
  "executable": "agy",
  "args": [
    { "type": "basic", "parts": ["--model", "gemini-2.5-flash", "--dangerously-skip-permissions"] },
    { "type": "resume", "parts": ["--conversation"] }
  ]
}
```

- `executable`: The command-line tool to run (e.g., `claude`, `agy`, `grok`, `codex`).
- `args`: An array of parts conditionally included based on session history.
    - `type: "basic"`: Always included.
    - `type: "resume"`: Included when a stored session ID exists, to resume a conversation.
- The prompt is delivered via a stdin pipe to the executable.

## Available Agent Families

- **Claude**: `claude-haiku-4-5`, `claude-sonnet-5`, `claude-opus-4-8`, `claude-fable-5`
- **Agy (Google Gemini successor)**: `agy-3.1-flash-lite`, `agy-3.5-flash`, `agy-3.1-pro`
- **Grok (xAI)**: `grok-composer-2.5-fast`, `grok-4.5`
- **Codex (OpenAI)**: `codex-gpt-5.6-luna`, `codex-gpt-5.6-terra`, `codex-gpt-5.6-sol`
