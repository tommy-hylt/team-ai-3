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
  "name": "claude-haiku-4-5",
  "executable": "claude",
  "args": [
    { "type": "basic", "parts": ["--model", "claude-haiku-4-5-20251001", "--dangerously-skip-permissions", "--print", "--verbose", "--output-format", "stream-json"] },
    { "type": "resume", "parts": ["-r"] }
  ]
}
```

- `executable`: The command-line tool to run (e.g., `claude`, `grok`, `codex`).
- `args`: An array of parts conditionally included based on session history.
    - `type: "basic"`: Always included.
    - `type: "resume"`: Included when a stored session ID exists, to resume a conversation.
- **The prompt is delivered via a stdin pipe by default — but `grok` is an exception**, handled by special-case code in `server/agentService.ts` (`isGrok`), not by anything in `agent.json`: it reads the prompt from a `--prompt-file <path>` (a temp file), not stdin.
    - If you add a new executable and requests to it hang forever instead of erroring, check whether it's silently waiting on an interactive TUI because it doesn't actually read the prompt from stdin.

> **Google/agy was removed 2026-07-25.** The `agy` (antigravity-cli) subscription was cancelled; every member previously on an `agy-*` agent was migrated to an equivalent Claude tier, and the CLI itself was uninstalled from this machine. If Gemini support is ever added back, note the vendor quirks that made `agy` unusually high-maintenance: no stdin support (needed `--print <text>` + `--add-dir <cwd>` + `shell:false`), a tiered display-name model catalog that changed format without notice, a directory→project registry that silently wrote to a shared scratch folder for never-before-seen directories, a default 5-minute `--print-timeout`, and intermittent Windows-keyring auth timeouts.

## Available Agent Families

- **Claude**: `claude-haiku-4-5`, `claude-sonnet-5`, `claude-opus-4-8`, `claude-fable-5`
- **Grok (xAI)**: `grok-composer-2.5-fast`, `grok-4.5`
- **Codex (OpenAI)**: `codex-gpt-5.6-luna`, `codex-gpt-5.6-terra`, `codex-gpt-5.6-sol`
