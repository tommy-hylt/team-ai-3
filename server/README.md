# Team AI / server

A Node.js Express server that manages AI team members and executes agents.

## Features

- **Member Management**: Reads member configurations and data from the `members/` directory.
- **Agent Execution**: Spawns agent processes using `child_process.spawn`.
- **Chat History**: Persists requests and responses to member-specific JSON files.
- **Real-time Updates**: Streams chat events to clients via Server-Sent Events (SSE).
- **Push Notifications**: Integrated Web Push for mobile and desktop background alerts.
- **TypeScript & ESM**: Written in TypeScript using ES Modules, powered by `tsx` for development.

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev` (Runs on port 8699)

## API Endpoints

### Members
- `GET /api/members`: List all active members.
- `POST /api/members`: Create a new member or clone an existing one.
- `GET /api/members/:id`: Get basic info for a member.
- `GET /api/members/:id/details`: Get full details (character, memory, agents) for a member.
- `POST /api/members/:id/details`: Update details for a member.
- `DELETE /api/members/:id`: Soft delete a member.

### Chat
- `GET /api/members/:id/chat`: Retrieve chat history.
- `POST /api/members/:id/chat/clear`: Clear chat history and abort running requests.
- `GET /api/members/:id/events`: SSE endpoint for real-time chat updates.
- `POST /api/members/:id/request`: Post a new request (responds immediately, agent runs in background).
- `POST /api/requests/:id/cancel`: Kill a running agent process.

### Files & Skills
- `GET /api/members/:id/files?path=<relative>`: List files/directories.
- `GET /api/members/:id/files/<relative>`: Get file content.
- `GET /api/members/:id/skills/:skillName/files/:fileName/sync`: Get detailed sync comparison metadata.
- `POST /api/members/:id/files`: Save a file (auto-syncs across vendors for skills).
- `DELETE /api/members/:id/files/<relative>`: Delete a file or folder (auto-syncs for skills).

### Notifications
- `GET /api/push/public-key`: Get VAPID public key.
- `POST /api/push/subscribe`: Register a browser for push notifications.
