# Team AI / agents

Agent templates: each one tells the server which CLI to run and exactly how to invoke it for a given model. The server never talks to a vendor API directly — everything goes through that vendor's own CLI tool as a spawned OS process (see `server/README.md` for the full execution pipeline).

## Template Structure

```text
agents/<agentName>/
  agent.json       — how to invoke it (required)
  DESCRIPTION.md    — human-readable blurb shown in the member-edit UI (required in practice, though not enforced)
```

`<agentName>` is the ID members reference in their `member.json`'s `agents` array — it does **not** have to match the vendor's own model name (e.g. `codex-gpt-5.6-sol` maps to `-m gpt-5.6-sol`), so pick something stable and descriptive; renaming this folder breaks every member currently referencing it (see "Retiring or Renaming an Agent" below).

### `agent.json` Schema

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

- **`executable`**: the command-line tool to run (`claude`, `grok`, `codex`, ...). Must be on `PATH` for the account the server runs as.
- **`args`**: an ordered list of argument groups, concatenated in array order into the final argv:
  - `type: "basic"` — its `parts` are always included, always in order.
  - `type: "resume"` — its `parts` are included **only when a stored session ID exists** for this `(member, agent)` pair (see `sessionService.ts`), and the session ID itself is appended as one more trailing argument right after those parts. So `{"type": "resume", "parts": ["-r"]}` becomes `-r <sessionId>` on a follow-up message, and is omitted entirely on the first message to a member.
- **The prompt itself is not in `agent.json` at all.** It's piped over **stdin by default** by `invokeAgent()`/`executeAgent()` in `server/agentService.ts`. `grok` is the sole exception, handled by special-case code (`isGrok` check), not by anything declarable here — see the quirks table below.

### Per-Vendor CLI Quirks

| Vendor | Executable | Prompt delivery | Output format | Notes |
|---|---|---|---|---|
| Claude | `claude` | stdin | `stream-json` — ends with a `{"type":"result","result":"...","session_id":"..."}` line | `-r <sessionId>` resumes. `--dangerously-skip-permissions` needed for unattended/headless use. |
| Grok (xAI) | `grok` | **`--prompt-file <path>`, not stdin** | `streaming-json` — `{"type":"text","data":...}` chunks, `{"type":"end","sessionId":...}` marker | Piping to stdin in headless mode silently launches its interactive TUI and hangs forever instead of erroring — this is the one case `server/agentService.ts` special-cases (writes the prompt to a temp file under `server/logs/`). `-r <sessionId>` resumes. |
| Codex (OpenAI) | `codex` | stdin | `exec --json` — streams `thread.started` → `item.completed` (with `agent_message`) → `turn.completed` | `resume <sessionId>` (a literal subcommand, not a flag) resumes. |

**If you add a new executable and requests to it hang forever instead of erroring or completing, suspect stdin first** — check whether the CLI actually reads a prompt from stdin in its headless/non-interactive mode, or whether (like grok) it silently falls back to an interactive prompt that will never receive input from a detached, `stdio: "ignore"`-adjacent spawn. A request that never completes and produces no log file under `server/logs/` is the signature of this exact bug. Verify by manually running the CLI headlessly from a terminal with the exact args you're about to configure, piping in a test prompt, before wiring it into `agent.json`.

The parsing side (`tryParseAgentJson()`/`extractResponse()` in `agentService.ts`) already handles all three formats above plus a few generic fallbacks (`json.text`, `json.response`, a raw-text fallback). If a new vendor's output doesn't match any existing shape, extend `extractResponse()` rather than adding another special-cased branch elsewhere — keep the executable-specific logic isolated to the one `isGrok`-style check plus this parser.

## Adding a New Agent

1. Manually run the vendor's CLI headlessly from a terminal first, with the flags you intend to use, and confirm it accepts a prompt via stdin (or figure out now if it needs the grok-style file-based workaround) and prints a parseable response to stdout. Don't skip this — it's the fastest way to catch the "hangs forever" class of bug before it's live for a real member.
2. Create `agents/<agentName>/agent.json` following the schema above, plus a `DESCRIPTION.md` (shown in the UI's agent picker — see the existing folders for tone/format).
3. Point a throwaway/test member at it and verify a full round trip, including resume: send one message, then a follow-up, and confirm the second one actually resumes context rather than starting fresh. **Billy Test** (`members/Billy Test`) exists exactly for this — swap her `agents` to the new one via `POST /api/members/Billy Test/details`, ask her for the secret code in her `MEMORY.md`, and confirm the round trip through `CHARACTER.md`/`MEMORY.md` → CLI → response actually works. Clean up her `requests.json`/`responses.json` test entries and restore her prior `agents` value afterward.
4. Only then point real members at it.

## Retiring or Renaming an Agent

Deleting or renaming an `agents/<name>/` folder does **not** produce an error for members still referencing the old name — `loadAgentConfig()` just returns `undefined`, and `runAgent()`'s fallback loop silently moves on to the member's next configured agent (or fails outright with "All agents failed" if it was the only one). This has caused real, silent breakage before. Before deleting or renaming:

1. `GET /api/members` and check every member's `agents` array for the name you're about to remove (or grep `members/*/member.json`).
2. Migrate each one to the replacement agent (`POST /api/members/:id/details` with an updated `agents` array).
3. Only then delete the old `agents/<name>/` folder.

## Current Agent Lineup

- **Claude**: `claude-haiku-4-5`, `claude-sonnet-5`, `claude-opus-4-8`, `claude-fable-5`
- **Grok (xAI)**: `grok-4.5` (currently the only Grok model this account's subscription provides — run `grok models` to check before assuming a second tier is available again)
- **Codex (OpenAI)**: `codex-gpt-5.6-luna`, `codex-gpt-5.6-terra`, `codex-gpt-5.6-sol`

Superseded/removed names (kept here so a stray reference in old data is recognizable): `claude-haiku`/`claude-sonnet`/`claude-opus` (renamed to versioned names above), `grok-build` (→ `grok-4.5`), `grok-composer-2.5-fast` (removed 2026-07-27 — `grok models` started reporting `"unknown model id"` for it, meaning the subscription no longer includes this tier; no members were referencing it at removal time), `codex-gpt-5.4`/`codex-gpt-5.4-mini`/`codex-gpt-5.3-codex` (→ the GPT-5.6 family above).

> **Google/agy was removed 2026-07-25.** The `agy` (antigravity-cli, Gemini) subscription was cancelled; every member previously on an `agy-*` agent was migrated to an equivalent Claude tier, and the CLI itself was uninstalled from this machine. If Gemini support is ever added back, budget real time for it — it was, by a wide margin, the highest-maintenance vendor integration this repo has had: no stdin support (needed `--print <text>` + `--add-dir <cwd>` + `shell:false` just to work at all), a tiered display-name model catalog (`"Gemini 3.1 Pro (High)"`, not `gemini-3.1-pro`) that changed format without notice, a directory→project registry that silently wrote a brand-new member's first message to a shared scratch folder instead of their own directory unless `--add-dir` was passed, a default 5-minute `--print-timeout` that killed legitimately long-running tasks, and intermittent Windows-keyring auth timeouts that failed a valid, unexpired token roughly at random. Check git history around 2026-07-17 through 2026-07-25 for the full trail before starting over. Its `.gemini` skill-vendor folder was also fully removed from the skill-sync system (`server/fileService.ts`, `server/memberService.ts`, member folders) on 2026-07-26 — the vendor set is now just `.claude` / `.agents` / `.grok`.
