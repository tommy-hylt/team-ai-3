# Team AI

An autonomous AI team management system with an Express backend and a React/Vite frontend.

## Overview

Team AI allows you to manage multiple AI agents, each with their own unique character, memory, and specialized skills. You can chat with them in real-time, clone them to create new members, and develop shared skills that are synchronized across multiple AI vendors (Claude, Gemini, etc.).

## Project Structure

- **`/members`**: Stores the profiles, persistent memory, and chat history for each AI team member.
- **`/server`**: A Node.js Express server that manages member data, executes AI agent CLI tools, and provides real-time updates via SSE.
- **`/web`**: A React frontend built with Vite, following strict "Tommy's Rules" for lean and maintainable code.
- **`/agents`**: Configuration templates for different AI agent models.

## Key Features

- **Multi-Agent Architecture**: Support for Claude, Gemini, and Codex CLI-based AI agents.
- **Detached Execution**: Agent CLI tools run in a resilient, detached background worker process (`agent-worker.ts`), ensuring tasks finish and save to disk even if the main server restarts or crashes.
- **Real-time Chat**: Live updates via Server-Sent Events (SSE) and webhook pings. Includes an interactive execution log viewer.
- **Routines System**: Schedule automated background tasks and requests for members using cron patterns. You can toggle routines active/disabled.
- **Web Push Notifications**: Get notified when an agent replies even if the tab is closed.
- **Skill System**: Shared skills synchronized across all supported AI vendor formats (`.claude`, `.gemini`, `.agents`).
- **Smart Drafts**: Chat inputs are automatically saved to local storage.

## Getting Started

Run the root `dev.cmd` to start both the server and the web application in parallel.

```cmd
dev.cmd
```

- Server: http://localhost:8699
- Web UI: http://localhost:5173

## Cleaning Up Stray Agent Processes

When the server crashes or is killed, spawned agent processes (Claude, Gemini) can become orphans. The server tracks all active agent PIDs in `server/processes.json` at runtime. Each record includes a `server` field — a UUIDv7 that identifies the server instance that spawned it.

To kill orphaned processes from a previous server instance, run:

```cmd
server\killProcesses.cmd
```

The script will:

1. Read `server/processes.json`
2. Query `GET /api/server/id` on the running server to get the current instance ID
3. Kill only processes whose `server` field does not match the current instance (orphans from an old server)
4. If the server is not running, kill all tracked processes (they are all orphans)

The `processes.json` file is git-ignored and maintained automatically by the server.
