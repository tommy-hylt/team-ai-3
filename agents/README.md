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
  "name": "agy-3.1-flash-lite",
  "executable": "agy",
  "args": [
    { "type": "basic", "parts": ["--model", "Gemini 3.5 Flash (Low)", "--dangerously-skip-permissions"] },
    { "type": "resume", "parts": ["--conversation"] }
  ]
}
```

- `executable`: The command-line tool to run (e.g., `claude`, `agy`, `grok`, `codex`).
- `args`: An array of parts conditionally included based on session history.
    - `type: "basic"`: Always included.
    - `type: "resume"`: Included when a stored session ID exists, to resume a conversation.
- **The prompt is delivered via a stdin pipe by default — but `grok` and `agy` are exceptions**, handled by special-case code in `server/agentService.ts` (`isGrok`/`isAgy`), not by anything in `agent.json`:
    - `grok` reads the prompt from a `--prompt-file <path>` (a temp file), not stdin.
    - `agy` reads the prompt from an inline `--print <text>` argument, not stdin, and is spawned with `shell:false` (unlike every other executable) so the multi-line prompt survives intact instead of being mangled by cmd.exe.
    - If you add a new executable and requests to it hang forever instead of erroring, check whether it's silently waiting on an interactive TUI because it doesn't actually read the prompt from stdin.

> **`agy`'s `--model` value must be the exact tiered display name from `agy models`** (e.g. `"Gemini 3.1 Pro (High)"`), not a plain model ID like `gemini-3.1-pro`. The vendor has changed this catalog's format before without notice — if an agy-based agent starts failing with `invalid --model "..."`, run `agy models` and update `agent.json` to match before assuming anything else is wrong.

> **`agy` does not treat the OS-level spawn `cwd` as its workspace by itself.** It keeps its own persistent directory→project registry (`~/.gemini/antigravity-cli/cache/projects.json`); a directory it has never seen before falls through to a shared scratch project instead of the member's own folder — silently writing files to the wrong place with no error. `server/agentService.ts` passes `--add-dir <cwd>` on every `agy` invocation to force it to register/use the correct directory regardless of prior state. Confirmed 2026-07-23 after a brand-new member's first-ever `agy` request wrote its files into that shared scratch dir.

## Available Agent Families

- **Claude**: `claude-haiku-4-5`, `claude-sonnet-5`, `claude-opus-4-8`, `claude-fable-5`
- **Agy (Google Gemini successor)**: `agy-3.1-flash-lite`, `agy-3.5-flash`, `agy-3.1-pro`
- **Grok (xAI)**: `grok-composer-2.5-fast`, `grok-4.5`
- **Codex (OpenAI)**: `codex-gpt-5.6-luna`, `codex-gpt-5.6-terra`, `codex-gpt-5.6-sol`
