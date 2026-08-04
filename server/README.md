# Team AI / server

A Node.js/Express server that manages AI team members and executes agent CLIs as real OS processes. Also serves the built frontend (see "Serving the Web App" below).

## Request Lifecycle, End to End

1. Client `POST /api/members/:id/request` with `{ text, requester, notify, echo }`.
2. Server writes the request to `members/<id>/requests.json` (status `"running"`), broadcasts it over SSE, and **responds immediately** with `{ ok: true, requestId }` — the HTTP request does not wait for the agent to finish.
3. Server calls `spawnWorker(memberId, requestId)`, which spawns a **detached** child process running `scripts/agent-worker.ts` via `tsx`. This worker is a separate OS process from the server — see "Agent Processes Must Survive Server Restarts" below for why that separation is the whole point.
4. The worker loads the member, reads `CHARACTER.md`/`MEMORY.md`-aware prompt, and calls `runAgent()` → `tryAgent()` (per-agent-in-list fallback, session resume logic) → `invokeAgent()` → `executeAgent()`, which actually `spawn()`s the CLI (`claude`, `grok`, `codex`, ...).
5. The CLI's stdout/stderr stream to `server/logs/<requestId>-<agentName>.log` as they arrive, and the full raw dump also lands in `server/agent_raw_output.log` on exit — both are your first stop when a response looks wrong or a request seems stuck.
6. When the CLI exits, the worker `POST`s the result to `/api/members/:id/responses` on the (still-running, possibly-since-restarted) server, which appends it to `responses.json`, marks the request `"completed"`, and broadcasts it over SSE.
7. The worker unregisters itself (`DELETE /api/processes/:requestId`) and exits.

If the server is unreachable when the worker tries to report back (e.g. it's mid-restart), the worker falls back to writing the response directly to `responses.json` itself — the worker has its own copy of the persistence logic (`chatService.ts` functions) for exactly this case.

---

## Agent Processes Must Survive Server Restarts

This is the single most important design invariant in this codebase, and the one most likely to be silently broken by a well-intentioned tooling change. **Read this before changing anything about how the dev server restarts.**

**Why it matters:** agent CLI calls can legitimately run for minutes. The server's own source gets edited constantly during development. If editing `server.ts` could kill an in-progress agent call, every edit would risk destroying real work-in-progress and would look to the person waiting on it like the assistant simply "hung" — because from the outside, a killed detached worker and a genuinely stuck one look identical (no response ever arrives).

**The design:** `spawnWorker()` in `agentService.ts` spawns `agent-worker.ts` with `detached: true` + `child.unref()`. The intent is that this worker (and the CLI process it in turn spawns) lives in its own process tree, independent of the server's — so restarting or crashing the server has no effect on requests already in flight.

**Where this broke (2026-07 incident):** the server's dev script was switched from `tsx watch` to `nodemon`. On Windows, `nodemon` restarts its target with `taskkill /pid <PID> /T /F` (see `node_modules/nodemon/lib/monitor/run.js`) — the **`/T` flag recursively kills the entire process tree rooted at that PID**. Critically, **Windows does not erase OS-level parent-PID lineage just because a child was spawned with `detached: true`** — that flag mainly detaches from the parent's console/signal group, unlike a POSIX process-group detach. `taskkill /T` walks the real OS process tree regardless, so it found and killed the "detached" worker (and the CLI process under it) anyway. Every edit to `server.ts` while a request was running silently killed that request — indistinguishable, from the outside, from the agent simply hanging. This caused real, repeated, hard-to-diagnose incidents before the process-tree relationship was identified (via `node_modules/nodemon/lib/monitor/run.js` and matching process start timestamps against session transcripts).

**The fix:** reverted the dev script to `tsx watch`, whose restart mechanism sends a plain `SIGTERM`/`SIGKILL` only to the one child process it directly spawned — it does not walk or kill descendants, so detached workers are untouched by a server restart, restoring the original design.

**Why nodemon was introduced in the first place, and why that's no longer a tradeoff:** `tsx watch` was originally swapped out because the server's own runtime writes (`processes.json`, `logs/*.log`, `out.log`, etc.) were triggering restart loops — the server watching its own output and reacting to it. But `tsx watch` already supports `--ignore`, so that problem could have been (and now is) solved without giving up the safer restart semantics:

```json
"dev": "tsx watch --ignore ../members --ignore ../web --ignore ../agents --ignore processes.json --ignore subscriptions.json --ignore vapid.json --ignore logs --ignore out.log --ignore err.log --ignore server.log --ignore agent_raw_output.log server.ts"
```

**Guardrails going forward:**
- Do not reintroduce `nodemon` (or any other Windows-targeting restart tool) for this server without first checking how it terminates the old process. If it uses `taskkill /T` or any recursive/tree-based kill, it will break this invariant again.
- If you need to manually restart the server while agent requests might be in flight (e.g. while actively debugging server.ts yourself), do **not** just kill the whole terminal/tree. Identify the exact PID(s) of the server's own process chain and kill only those, non-recursively, then relaunch as an independent detached tree. Killing your own supervising process's tree while a request depends on surviving it is the exact bug described above, self-inflicted.
- `processes.json` (see below) exists specifically so that even a full server restart can still find and clean up (or leave alone) worker-spawned OS processes it didn't directly parent in its current lifetime.

---

## How the Web App Is Actually Served — read this before "fixing" a UI bug

**The live app is served by the Express server, not by the Vite dev server.** `server.ts` runs `express.static()` on `web/dist` and serves `index.html` for any non-`/api` route — `http://localhost:8699` (or whatever tunnel/reverse-proxy points at this machine's `:8699`) is what's actually used day to day, regardless of whether `vite dev` happens to also be running on `:5173`.

Consequences:
- **After any change under `/web`, rebuild before it's visible anywhere real users look**: `cd web && npm run build`. Editing `web/src/*.tsx` alone does nothing for the app served at `:8699` until you rebuild.
- The Vite dev server (`:5173`) renders a fully working UI of its own — that's precisely what makes it dangerous to reach for while debugging: it's easy to convince yourself a fix works because the dev server shows it, while the actually-served build at `:8699` is still stale. **Never use `:5173` to verify a fix is live for the user; only use it for local HMR-driven iteration, and always finish by rebuilding.**
- `vite preview` (port `4173` by default) is a *different, unrelated* thing you may see running on this machine — it can belong to an entirely different project. Don't assume a process on `4173` is this app's frontend; check its command line (`Get-CimInstance Win32_Process`) before trusting it.
- If a change "isn't showing up," check in this order: (1) did you rebuild `web/dist`? (2) is the server (`:8699`) actually serving the freshly built `index.html`/hashed asset filenames — `curl http://localhost:8699/` and compare the asset hash to `web/dist/index.html`? (3) only then suspect the code itself.

---

## File Layout Per Request

| File | Written by | Purpose |
|---|---|---|
| `members/<id>/requests.json` / `responses.json` | server (or worker fallback) | Persistent chat history; source of truth for `GET /chat` and the "running" status. |
| `members/<id>/sessions.json` | `sessionService.ts` | One entry per `(agent, status)` — tracks the CLI's own session/thread ID so a follow-up message can resume context instead of starting fresh. `status: "active" | "expired"`; expired when a resume attempt fails or character/memory changes (which invalidates continuity). |
| `server/processes.json` | workers, via `POST`/`DELETE /api/processes` | Source of truth for **worker-spawned** OS processes — lets `cancelRequest`/orphan-cleanup find a process across a server restart, since the server's in-memory `activeProcesses` map only tracks processes it spawned directly in its *current* lifetime. |
| `server/logs/<requestId>-<agentName>.log` | `executeAgent()` | Raw stdout+stderr for one request, appended live as the CLI produces it — this is what the chat UI's log-viewer icon shows, including a live "updated Xs ago" derived from the file's mtime. |
| `server/agent_raw_output.log` | `executeAgent()` | Append-only full dump (stdout+stderr+exit code+timestamps) for every request ever run — the first place to look when the parsed response looks wrong even though the CLI clearly said something else. |
| `server/out.log` / `err.log` | `spawnWorker()` | stdout/stderr of the worker process itself (not the CLI it spawns) — check here if a worker seems to have died before even reaching `executeAgent`. |

---

## Busy vs Running — Two Distinct Concepts

| | Source of truth | Function | Endpoint | Use for |
|---|---|---|---|---|
| **Busy** | `processes.json` | `isMemberBusy()` in `agentService.ts` | `GET /api/members/:id/busy` | Process-level checks (e.g. routines/todos won't dispatch a new request to a member that's already busy). |
| **Running** | `requests.json` | `hasMemberRunningRequest()` in `chatService.ts` | `GET /api/members/running` | UI indicators. |

`processes.json` can accumulate stale entries when a worker dies without calling `DELETE /api/processes/:requestId`. Never rely on it for UI running indicators — use "Running" for that.

---

## Agent Execution (`agentService.ts`)

Agent CLIs are configured under `/agents/<name>/agent.json` (executable + args) — see `agents/README.md` for the full schema and per-vendor quirks. `invokeAgent()` pipes the prompt to the child process's **stdin by default**, but `grok` needs special-casing because it doesn't support that in headless mode — piping to stdin instead leaves it stuck waiting on its interactive TUI, which just hangs (no error) rather than failing fast: its prompt goes to a `--prompt-file <path>` (a temp file under `server/logs/`), not stdin.

If adding a new agent executable, verify prompt delivery works headlessly before assuming stdin — a request that never completes and produces no log file is the signature of this bug.

Each member can list multiple agents in priority order (`member.agents`); `runAgent()` tries them in sequence, falling back to the next on failure (`isAgentResponseFailed()` detects known quota/auth/rate-limit failure text patterns). Sessions are tracked per-`(member, agent)` pair, so falling back to a different agent starts that agent fresh rather than trying to resume a session it never had.

> Google/agy (antigravity-cli) support was removed 2026-07-25 after the subscription was cancelled. It needed unusually heavy special-casing (`--print`/`--add-dir`/`shell:false`, a tiered model-name catalog, a directory→project registry, a 5-minute default timeout, intermittent keyring auth hangs) — worth reading `agents/README.md`'s note on it before reintroducing Gemini support.

---

## Routines & Todos Scheduling

Both `routineService.ts` and `todoService.ts` run an independent `setInterval(..., 5000)` loop that:
1. Re-reads every member's `routines.json`/`todos.json` from disk each tick (no in-memory source of truth for the schedules themselves — only the dispatch queue is in-memory).
2. **Routines** (recurring, `cronPattern` via `cron-parser`): computes the next fire time from `lastTime`/`startTime`; if it's due, updates `lastTime` and enqueues. Re-enabling a disabled routine sets `lastTime = now`, deliberately skipping any runs missed while it was off rather than firing a backlog.
3. **Todos** (one-shot, `triggerTime`): if due, moves it out of the file entirely (removed from `todos.json` on fire — no re-fire, no residue) and enqueues.
4. Drains the queue at a **global throttle of one dispatch per 5 seconds across the entire server** (not per-member) — this exists to avoid a stampede of simultaneous CLI spawns if many routines/todos come due at once. Each dispatch also checks `isMemberBusy()` first and skips (leaving it queued) if that member already has a process running.
5. Dispatching a routine/todo is otherwise identical to a normal chat request: `addRequest` + SSE broadcast + `spawnWorker`, with `requester: "Routine"` or `"Todo"`.

---

## API Documentation

All API endpoints are prefixed with `/api`.

### 👥 Members

#### `GET /api/members`
List all team members.
- **Returns:** `Member[]`.

#### `POST /api/members`
Create a new team member. Optionally clone skills from an existing member.
- **Body:**
  - `name` (string, **mandatory**): Display name — also becomes the folder name under `/members`.
  - `description`, `character`, `memory`, `agents`, `teams` (all optional): seed values; sensible defaults are used otherwise (e.g. `agents` defaults to `["claude-haiku-4-5"]`).
  - `cloneFrom` (string, optional): another member's ID to copy skills from.
  - `includeSkills` (string[], optional): if set alongside `cloneFrom`, copies only these named skills instead of all of them.
- **Returns:** Member details object.

#### `GET /api/members/:id`
Get basic info (the raw `member.json` contents plus `id`) for a specific member.
- **Returns:** Member object.

#### `DELETE /api/members/:id`
**Permanently deletes the member's entire folder** (`rm(memberDir, { recursive: true, force: true })`) — chat history, memory, character, skills, everything. There is no soft-delete/undo; the frontend's own confirmation dialog says as much. If you need to preserve a member, back up their folder first (or rely on git, for the four members that are actually tracked — see `members/README.md`).
- **Returns:** `{ ok: true }`.

#### `GET /api/members/:id/details`
Get full details (character, memory, agents, and the list of available agent templates) for a member.
- **Returns:** `{ character: string, memory: string, agents: string[], availableAgents: string[], ... }`.

#### `POST /api/members/:id/details`
Update a member's configuration. Editing `character` or `memory` also expires all active agent sessions for that member (a stale resumed session would otherwise ignore the update).
- **Body:**
  - `character` (string, optional): Updates character description.
  - `memory` (string, optional): Updates memory context.
  - `agents` (string[], optional): Updates the list of agent template names to try, in priority order.
  - `description`, `teams` (optional): metadata fields.
- **Returns:** Updated details object.

#### `GET /api/members/running`
Get the running state of all members. A member is **running** if they have any request with `status === "running"` in `requests.json`. Use this for UI indicators.
- **Returns:** `{ [memberId]: boolean }`.
- **Note:** This route must be registered before `GET /api/members/:id` in Express to avoid `"running"` being matched as a member ID.

#### `GET /api/members/:id/busy`
Check if a member has an active OS-level worker process registered in `processes.json`. See "Busy vs Running" above — this can be stale if a worker died without cleanup; use for process-level checks, not UI indicators.
- **Returns:** `{ busy: boolean }`.

---

### 💬 Chat & Agents

#### `GET /api/members/:id/chat`
Retrieve full chat history (requests and responses, merged and sorted chronologically).
- **Returns:** `MessageType[]`.

#### `POST /api/members/:id/request`
Post a new request to a member. Returns immediately; the agent runs asynchronously in a detached worker (see "Request Lifecycle" above).
- **Body:**
  - `text` (string, **mandatory**): The message to send.
  - `requester` (string, **mandatory**): Name of the user/member making the request.
  - `notify` (boolean, **mandatory**): Whether to send a push notification when finished.
  - `echo` (boolean, **mandatory**): Whether the response should also be posted back as a request to the requester (member-to-member relay).
- **Returns:** `{ ok: true, requestId: string }`.

#### `POST /api/members/:id/responses`
Post a new response for a member. Called by the detached worker when the CLI finishes; not typically called directly by the frontend.
- **Body:**
  - `text` (string, **mandatory**): The response content.
  - `requestId` (string, optional): The ID of the request this response is for — enables status update, echo relay, and push notification.
  - `time` (Date string, optional): Defaults to server current time.
  - `agent` (string, optional): Name of the agent that generated the response (shown in the UI).
  - `notify` (boolean, optional): Whether to trigger a push notification.
  - `echo` (string, optional): ID of a member to automatically relay this response to as a new request.
- **Returns:** `{ ok: true }`.

#### `POST /api/requests/:id/cancel`
Terminate a running agent process — kills the OS process tree via `tree-kill`, checking both the in-memory map (direct invocations) and `processes.json` (worker-spawned). Always marks the request `"aborted"` even if no live process is found (e.g. after a server restart).
- **Body:**
  - `memberId` (string, **mandatory**): The member the request belongs to.
- **Returns:** `{ ok: true, killed: boolean }`.

#### `POST /api/members/:id/chat/clear`
Wipe all chat history, cancel any active requests, and expire all sessions for a member.
- **Returns:** `{ ok: true }`.

#### `GET /api/members/:id/events`
**SSE endpoint.** Opens a real-time event stream for a member; a `:` comment heartbeat is sent every 30s to keep the connection alive through proxies.
- **Events:** `request`, `response`, `status_update`.

#### `GET /api/requests/:id/logs`
Fetch execution logs for a specific request (matches `server/logs/<id>-*.log`).
- **Returns:** `{ logs: { filename: string, content: string, mtime: number }[] }`. `mtime` is the log file's last-modified time (ms since epoch) — lets the client judge whether a still-running request is actively producing output or appears stuck (the chat UI polls this every 3s while a log panel for a running request is open, and shows a live-ticking "updated Xs ago").

---

### 📂 Files

#### `GET /api/members/:id/rootpath`
Get the absolute filesystem path to a member's folder — used by the frontend to resolve absolute-path links found in agent responses back to relative paths.
- **Returns:** `{ rootPath: string }`.

#### `GET /api/members/:id/files`
List files in a member's workspace.
- **Query params:** `path` (string, optional): Subdirectory to list.
- **Returns:** `FileEntry[]` (`{ name, type: "file" | "directory" }`).

#### `GET /api/members/:id/files/*`
Get text content of a specific file, as JSON.
- **Returns:** `{ content: string }`.

#### `GET /api/members/:id/files-raw/*`
Get the raw bytes of a file with an appropriate `Content-Type` (images, etc.) — used for inline rendering rather than the JSON-wrapped text endpoint above.

#### `POST /api/members/:id/files`
Save or create a text file in the workspace. If the path is inside a vendor skills folder (`.claude/skills/...`, `.agents/skills/...`, `.grok/skills/...`), the write is automatically mirrored to the equivalent path in the other two vendor folders (see `fileService.ts`'s `getSkillSyncPaths()`).
- **Body:**
  - `path` (string, **mandatory**): Relative path within the workspace.
  - `content` (string, optional): Defaults to empty string.
- **Returns:** `{ ok: true }`.

#### `POST /api/members/:id/files/upload`
Upload a binary file (multipart form, field name `file`) to a given path — same vendor-skill-folder mirroring as above applies.

#### `DELETE /api/members/:id/files/*`
Delete a file or folder from the workspace, mirrored across vendor skill folders the same way.
- **Returns:** `{ ok: true }`.

#### `GET /api/members/:id/skills/:skillName/files/:fileName/sync`
Check whether a specific skill file is identical across all 3 vendor folders.
- **Returns:** `{ [vendor]: { exists: boolean, content?: string, mtime?: number, size?: number } }`.

#### `GET /api/members/:id/shortcuts`
List a member's shortcut file paths (persisted in `members/<id>/shortcuts.json`, deliberately not synced to any vendor folder — it's a personal quick-access list, not agent-facing content). The file browser's root page renders these as a quick-access section.
- **Returns:** `string[]` (relative paths).

#### `POST /api/members/:id/shortcuts`
Add a file to the shortcut list (deduplicated — adding an already-present path is a no-op).
- **Body:**
  - `path` (string, **mandatory**): Relative path within the workspace.
- **Returns:** `{ ok: true, shortcuts: string[] }` (the full updated list).

#### `DELETE /api/members/:id/shortcuts/*`
Remove a file from the shortcut list. Does not delete the file itself — only unpins it. Removing a path that isn't a shortcut is a no-op.
- **Returns:** `{ ok: true, shortcuts: string[] }`.

---

### 🔁 Routines & Todos

#### `GET /api/members/:id/routines`
Get all scheduled routines (recurring, cron-based) for a member.
- **Returns:** `Routine[]`.

#### `POST /api/members/:id/routines`
Save/replace the full list of routines for a member. Re-activating a previously disabled routine resets `lastTime` to now (skips any runs missed while disabled) rather than firing a backlog.
- **Body:** `Routine[]`.
- **Returns:** `{ ok: true }`.

#### `GET /api/members/:id/todos`
Get all scheduled todos (one-shot, fire-once-and-remove) for a member.
- **Returns:** `Todo[]`.

#### `POST /api/members/:id/todos`
Save/replace the full list of todos for a member.
- **Body:** `Todo[]`.
- **Returns:** `{ ok: true }`.

---

### 🔔 Notifications & System

#### `GET /api/push/public-key`
Retrieve the VAPID public key for Web Push subscription (generated once on first server start and persisted to `server/vapid.json`).
- **Returns:** `{ publicKey: string }`.

#### `POST /api/push/subscribe`
Register a browser for push notifications (deduplicated by endpoint, persisted to `server/subscriptions.json`).
- **Body:** `Subscription` (Web Push subscription object).
- **Returns:** `{ ok: true }`.

#### `GET /api/server/id`
Get the unique instance ID (UUIDv7, regenerated on every server start) of the current server process — used by `killProcesses.cmd`/`.js` to distinguish this server's own tracked processes from orphans left by a previous instance.
- **Returns:** `{ serverId: string }`.

#### `POST /api/processes` / `DELETE /api/processes/:requestId`
Register/unregister a worker-spawned OS process in `processes.json`. Called by `agent-worker.ts`, not the frontend.
