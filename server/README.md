# Team AI / server

A Node.js Express server that manages AI team members and executes agents.

## Features

- **Member Management**: Reads member configurations and data from the `members/` directory.
- **Agent Execution**: Spawns agent processes using `child_process.spawn` in non-interactive mode.
- **Chat History**: Persists requests and responses to member-specific JSON files.
- **TypeScript & ESM**: Written in TypeScript using ES Modules, powered by `tsx` for development.

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev` (Runs on port 3000)

## API Endpoints

- `GET /api/members`: List all members.
- `GET /api/members/:name`: Get details for a specific member.
- `GET /api/members/:name/chat`: Retrieve chat history.
- `POST /api/members/:name/request`: Post a new request and trigger the agent.
