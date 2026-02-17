# TeamAI2 / agents

This folder contains **agent templates**.

An agent template is a folder under `agents/` that defines:

- how to start the agent (a `.cmd` wrapper)
- default flags / model selection
- a short description of when to choose it

## Template structure

```
agents/<agentName>/
  agent.json
  DESCRIPTION.md
  start-agent.cmd
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
    { "type": "basic", "parts": ["-p"] }
  ]
}
```

- `executable` is the command to run.
- `args` is an array of parts that are conditionally included based on session history.

## Agents (9)

### Claude Code (3)

- `claude-haiku/`
- `claude-sonnet/`
- `claude-opus/`

### Gemini CLI (3)

- `gemini-2.0-flash/`
- `gemini-2.5-flash/`
- `gemini-2.5-pro/`

### Codex CLI (3)

- `codex-o3-mini/`
- `codex-gpt-4.1-mini/`
- `codex-gpt-4.1/`
