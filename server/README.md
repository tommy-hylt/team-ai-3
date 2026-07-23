# Team AI / server

A Node.js Express server that manages AI team members and executes agents.

## API Documentation

All API endpoints are prefixed with `/api`.

### 👥 Members

#### `GET /api/members`
List all active team members.
- **Returns:** `Member[]` (Array of member objects).

#### `POST /api/members`
Create a new team member.
- **Body:**
  - `name` (string, **mandatory**): The display name of the member.
- **Returns:** Member details object.

#### `GET /api/members/:id`
Get basic info for a specific member.
- **Returns:** Member object.

#### `DELETE /api/members/:id`
Soft-delete a member (marks status as "deleted").
- **Returns:** `{ ok: true }`.

#### `GET /api/members/:id/details`
Get full details (character, memory, agents) for a member.
- **Returns:** `{ character: string, memory: string, agents: string[] }`.

#### `POST /api/members/:id/details`
Update a member's configuration.
- **Body:**
  - `character` (string, optional): Updates character description.
  - `memory` (string, optional): Updates memory context.
  - `agents` (string[], optional): Updates the list of agent models to use.
- **Returns:** Updated details object.

#### `GET /api/members/running`
Get the running state of all members. A member is **running** if they have any request with `status === "running"` in `requests.json`. Use this for UI indicators.
- **Returns:** `{ [memberId]: boolean }`.
- **Note:** This route must be registered before `GET /api/members/:id` in Express to avoid "running" being matched as a member ID.

#### `GET /api/members/:id/busy`
Check if a member has an active OS-level worker process registered in `processes.json`. A member is **busy** if a worker entry exists — but note this can be stale if a worker died without cleanup. Use for process-level checks, not UI indicators.
- **Returns:** `{ busy: boolean }`.

---

### Busy vs Running — Two Distinct Concepts

| | Source of truth | Function | Endpoint | Use for |
|---|---|---|---|---|
| **Busy** | `processes.json` | `isMemberBusy()` in `agentService.ts` | `GET /api/members/:id/busy` | Process-level checks |
| **Running** | `requests.json` | `hasMemberRunningRequest()` in `chatService.ts` | `GET /api/members/running` | UI indicators |

`processes.json` can accumulate stale entries when workers die without calling `DELETE /api/processes/:requestId`. Never rely on it for UI running indicators.

---

### 💬 Chat & Agents

#### `GET /api/members/:id/chat`
Retrieve full chat history (requests and responses).
- **Returns:** `MessageType[]` (Array of messages, sorted chronologically).

#### `POST /api/members/:id/request`
Post a new request to a member (triggers the background agent execution).
- **Body:**
  - `text` (string, **mandatory**): The message to send.
  - `requester` (string, **mandatory**): Name of the user/agent making the request.
  - `notify` (boolean, **mandatory**): Whether to send a push notification when finished.
  - `echo` (boolean, **mandatory**): Whether the response should be sent back to the requester.
- **Returns:** `{ ok: true, requestId: string }`.

#### `POST /api/members/:id/responses`
Post a new response for a member (typically used by background workers).
- **Body:**
  - `text` (string, **mandatory**): The response content.
  - `requestId` (string, optional): The ID of the request this response is for.
  - `time` (Date string, optional): When the response was generated (defaults to server current time).
  - `agent` (string, optional): Name of the agent that generated the response.
  - `notify` (boolean, optional): Whether to trigger a push notification.
  - `echo` (string, optional): ID of a member to automatically echo this response to.
- **Returns:** `{ ok: true }`.

#### `POST /api/requests/:id/cancel`
Terminate a running agent process.
- **Body:**
  - `memberId` (string, **mandatory**): The member the request belongs to.
- **Returns:** `{ ok: true, killed: boolean }`.

#### `POST /api/members/:id/chat/clear`
Wipe all chat history and cancel any active requests for a member.
- **Returns:** `{ ok: true }`.

#### `GET /api/members/:id/events`
**SSE Endpoint**: Opens a real-time event stream for a member.
- **Events:** `request`, `response`, `status_update`.

#### `GET /api/requests/:id/logs`
Fetch execution logs for a specific request.
- **Returns:** `{ logs: { filename: string, content: string }[] }`.

---

### Agent Execution (`agentService.ts`)

Agent CLIs are configured under `/agents/<name>/agent.json` (executable + args). `invokeAgent()` pipes the prompt to the child process's **stdin by default**, but two executables need special-casing because they don't support that in headless mode — piping to stdin instead leaves them stuck waiting on their interactive TUI, which just hangs (no error) rather than failing fast:

- **`grok`**: prompt goes to a `--prompt-file <path>` (written to a temp file in `server/logs/`), not stdin.
- **`agy`**: prompt goes to an inline `--print <text>` argument, not stdin. Since `agy.exe` is a real executable (not an npm `.cmd` shim like most other CLIs here), it's spawned with `shell:false` instead of the default `shell:true` — this lets Node's own argument quoting preserve a multi-line prompt correctly, where `cmd.exe` (used by `shell:true`) would otherwise split it apart on the embedded whitespace/newlines. `shell:false` does not affect window visibility; that's governed separately by the `windowsHide`/`detached` options already set on the parent worker process.

`agy`'s `--model` value must also match the exact tiered display name from `agy models` (e.g. `"Gemini 3.1 Pro (High)"`) — this CLI's model catalog format has changed vendor-side without notice before.

`agy` also does not treat the spawn `cwd` as its workspace by itself — it keeps its own persistent directory→project registry (`~/.gemini/antigravity-cli/cache/projects.json`), and a directory it has never seen before silently falls through to a shared scratch project instead of the member's own folder. `invokeAgent()` always passes `--add-dir <cwd>` on `agy` calls to force it to use the correct directory regardless of prior registration state.

If adding a new agent executable, verify prompt delivery works headlessly before assuming stdin — a request that never completes and produces no log file is the signature of this bug.

---

### 📂 Files

#### `GET /api/members/:id/files`
List files in a member's workspace.
- **Query Params:** `path` (string, optional): Subdirectory to list.
- **Returns:** `FileEntry[]`.

#### `GET /api/members/:id/files/*`
Get content of a specific file.
- **Returns:** `{ content: string }`.

#### `POST /api/members/:id/files`
Save or create a file in the workspace.
- **Body:**
  - `path` (string, **mandatory**): Relative path within workspace.
  - `content` (string, optional): Content to write (defaults to empty string).
- **Returns:** `{ ok: true }`.

#### `DELETE /api/members/:id/files/*`
Delete a file from the workspace.
- **Returns:** `{ ok: true }`.

---

### 🔁 Routines

#### `GET /api/members/:id/routines`
Get all scheduled routines for a member.
- **Returns:** `Routine[]`.

#### `POST /api/members/:id/routines`
Save/Update the list of routines for a member.
- **Body:** `Routine[]` (Array of all routines for the member).
- **Returns:** `{ ok: true }`.

---

### 🔔 Notifications & System

#### `GET /api/push/public-key`
Retrieve VAPID public key for Web Push subscription.
- **Returns:** `{ publicKey: string }`.

#### `POST /api/push/subscribe`
Register a browser for push notifications.
- **Body:** `Subscription` (Web Push subscription object).
- **Returns:** `{ ok: true }`.

#### `GET /api/server/id`
Get the unique ID of the current server instance.
- **Returns:** `{ serverId: string }`.
