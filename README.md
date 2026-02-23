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

- **Multi-Agent Architecture**: Support for Claude, Gemini, and other CLI-based AI agents.
- **Real-time Chat**: Live updates via Server-Sent Events (SSE).
- **Web Push Notifications**: Get notified when an agent replies even if the tab is closed.
- **Skill System**: Shared skills synchronized across all supported AI vendor formats.
- **Smart Drafts**: Chat inputs are automatically saved to local storage.
- **Soft Delete**: Members can be marked as deleted without losing their data on disk.

## Getting Started

Run the root `dev.cmd` to start both the server and the web application in parallel.

```cmd
dev.cmd
```

- Server: http://localhost:8699
- Web UI: http://localhost:5173
