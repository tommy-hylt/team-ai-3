# Team AI / server

A Node.js Express server that manages AI team members and executes agents.

## Features

- **Member Management**: Reads member configurations and data from the `members/` directory.
- **Agent Execution**: Spawns agent processes using `child_process.spawn`.
- **Chat History**: Persists requests and responses to member-specific JSON files.
- **TypeScript & ESM**: Written in TypeScript using ES Modules, powered by `tsx` for development.

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev` (Runs on port 8699)

## API Endpoints

- `GET /api/members`: List all members.
- `POST /api/members`: Create a new member.
- `GET /api/members/:id`: Get basic info for a member.
- `GET /api/members/:id/details`: Get full details (character, memory, agents) for a member.
- `POST /api/members/:id/details`: Update details for a member.
- `GET /api/members/:id/chat`: Retrieve chat history.
- `POST /api/members/:id/request`: Post a new request and trigger the agent.
- `GET /api/members/:id/files?path=<relative>`: List files/directories at a relative path inside a member folder.
- `GET /api/members/:id/files/<relative>`: Get file content by relative path.
- `POST /api/members/:id/files`: Save a file (`{ path, content }`). Auto-syncs across `.claude`, `.gemini`, and `.agent` vendor folders when the path is inside a `/skills/` directory.
- `DELETE /api/members/:id/files/<relative>`: Delete a file or folder. Auto-syncs skill deletions across vendor folders.
