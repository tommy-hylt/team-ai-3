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

### Server
- `GET /api/server/id`: Get the unique UUIDv7 for the current server instance.
  - **Returns:** `{ serverId: "..." }`

### Members
- `GET /api/members`: List all active members.
  - **Returns:** Array of basic member profile objects.
- `POST /api/members`: Create a new member or clone an existing one.
  - **Body:** `{ name: "...", cloneFrom?: "...", cloneOptions?: { cloneSkills: boolean, cloneMemory: boolean } }`
  - **Returns:** The newly created member details object.
- `GET /api/members/:id`: Get basic info for a member.
  - **Returns:** The basic member profile object.
- `GET /api/members/:id/details`: Get full details (character, memory, agents) for a member.
  - **Returns:** Member details object `{ character: "...", memory: "...", agents: [...] }`.
- `POST /api/members/:id/details`: Update details for a member.
  - **Body:** Partial member details object `{ character?: "...", memory?: "...", agents?: [...] }`.
  - **Returns:** The updated member details object.
- `DELETE /api/members/:id`: Soft delete a member.
  - **Returns:** `{ ok: true }`

### Chat
- `GET /api/members/:id/chat`: Retrieve chat history.
  - **Returns:** Array of chat message objects (combined requests and responses).
- `POST /api/members/:id/chat/clear`: Clear chat history and abort running requests.
  - **Returns:** `{ ok: true }`
- `GET /api/members/:id/events`: SSE endpoint for real-time chat updates.
  - **Returns:** Event stream (`text/event-stream`).
- `POST /api/members/:id/request`: Post a new request to a member (agent runs in the background).
  - **Body:** `{ text: "Message content", requester: "User" }`
  - **Returns:** `{ ok: true, requestId: "..." }`
- `POST /api/requests/:id/cancel`: Kill a running agent process.
  - **Body:** `{ memberId: "Member Name" }`
  - **Returns:** `{ ok: true, killed: boolean, message: "..." }`

### Files & Skills
- `GET /api/members/:id/files?path=<relative>`: List files/directories.
  - **Returns:** Array of file entry objects `{ name: "...", isDirectory: boolean, ... }`.
- `GET /api/members/:id/files/<relative>`: Get file content.
  - **Returns:** `{ content: "..." }`
- `GET /api/members/:id/skills/:skillName/files/:fileName/sync`: Get detailed sync comparison metadata.
  - **Returns:** Sync results indicating synchronization state across AI vendors.
- `POST /api/members/:id/files`: Save a file (auto-syncs across vendors for skills).
  - **Body:** `{ path: "file/path.txt", content: "..." }`
  - **Returns:** `{ ok: true }`
- `DELETE /api/members/:id/files/<relative>`: Delete a file or folder (auto-syncs for skills).
  - **Returns:** `{ ok: true }`

### Notifications
- `GET /api/push/public-key`: Get VAPID public key.
  - **Returns:** `{ publicKey: "..." }`
- `POST /api/push/subscribe`: Register a browser for push notifications.
  - **Body:** Web Push subscription object `{ endpoint: "...", keys: { p256dh: "...", auth: "..." } }`.
  - **Returns:** `{ ok: true }`
