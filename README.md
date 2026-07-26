# Team AI

An autonomous AI team management system: an Express backend that runs AI agent CLIs (Claude, Grok, Codex) as real OS processes on behalf of persistent "members," and a React/Vite frontend to chat with them.

## Overview

Team AI lets you manage multiple AI agents, each with their own persona, long-term memory, and specialized skills. You chat with them in real time, clone them to create new members, schedule recurring/one-shot automated requests, and develop shared skills synchronized across multiple AI vendor CLIs.

Each member is *not* a chatbot session that resets — it's a durable identity backed by a folder on disk (`CHARACTER.md` + `MEMORY.md` + chat history), and the process that answers a given message is a short-lived CLI invocation that the server spawns, waits on, and tears down. Understanding that split — durable member state vs. ephemeral agent process — explains most of the design decisions in this repo.

## Project Structure

- **`/server`** — Node.js/Express API. Manages member data, spawns and supervises agent CLI processes, serves the built frontend, provides real-time updates via SSE. See `server/README.md`.
- **`/web`** — React/Vite frontend. See `web/README.md`.
- **`/agents`** — Agent config templates: which CLI to run and how to invoke it for each model. See `agents/README.md`.
- **`/members`** — Per-member persistent state: persona, memory, chat history, skills. See `members/README.md`.

## Key Features

- **Multi-Agent Architecture**: Claude, Grok, and Codex CLI-based agents. Each vendor's CLI has its own quirks for how it wants the prompt delivered (stdin vs. a file vs. an inline argument) — see `agents/README.md` and `server/README.md` before adding a new one.
- **Detached, Restart-Proof Execution**: Every agent request runs in its own detached worker process (`agent-worker.ts`), separate from the Express server's own process tree. A request that's mid-flight survives the server being edited/restarted/crashing — see "Agent Processes Must Survive Server Restarts" in `server/README.md`. This is a load-bearing design decision; don't casually swap the dev-restart tool without reading that section first.
- **Real-time Chat**: Live updates via Server-Sent Events (SSE) and webhook pings. An interactive execution-log viewer shows each log file's last-write time so you can tell "still working" from "actually stuck" at a glance. Markdown links/images resolve to a member's own files where possible.
- **Routines & Todos**: Schedule recurring (cron) or one-shot requests per member; toggle active/disabled.
- **Web Push Notifications**: Notified when an agent replies even if the tab is closed.
- **Skill System**: Shared skills synchronized across all supported AI vendor formats (`.claude`, `.agents`, `.grok`).
- **Smart Drafts & History**: Chat inputs auto-save to local storage; the last 5 sent messages per member are resendable from a history picker.

## Getting Started

Run the root `dev.cmd` to start both the server and the web dev server in parallel:

```cmd
dev.cmd
```

- Server: http://localhost:8699
- Web dev server (HMR, for active frontend work only): http://localhost:5173

## Cleaning Up Stray Agent Processes

When the server crashes or is killed, spawned agent processes (Claude, Grok, Codex) can become orphans. The server tracks all active agent PIDs in `server/processes.json` at runtime. Each record includes a `server` field — a UUIDv7 identifying the server instance that spawned it.

To kill orphaned processes from a previous server instance, run:

```cmd
server\killProcesses.cmd
```

The script will:

1. Read `server/processes.json`.
2. Query `GET /api/server/id` on the running server to get the current instance ID.
3. Kill only processes whose `server` field does not match the current instance (orphans from an old server).
4. If the server is not running, kill all tracked processes (they are all orphans).

`processes.json` is git-ignored and maintained automatically by the server.

## Where to Look for What

| Question | Read |
|---|---|
| Why did my code edit kill an in-flight agent request? | `server/README.md` → "Agent Processes Must Survive Server Restarts" |
| How does a member's prompt actually reach the CLI (stdin/file/arg)? | `agents/README.md` |
| Why isn't my frontend change showing up? | `server/README.md` or `web/README.md` → "How the Web App Is Actually Served" |
| What files make up a member, and which are tracked in git? | `members/README.md` |
| Full HTTP API reference | `server/README.md` |
