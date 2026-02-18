# Team AI / web

A Vite-powered React frontend for interacting with the AI Team.

## Architecture

This project strictly follows "Tommy's Rules":
- **State Management**: Pure React Context + Provider + Hook pattern. No external state libraries.
- **Styling**: Plain `.css` files. No CSS-in-JS or utility frameworks.
- **Structure**: Feature-based organization with single-file focus for components.
- **Types**: Shared types defined in `src/types.ts` for consistency.

## Features

- **Member List**: Sidebar to browse available AI members.
- **Chat Interface**: Real-time interaction with members, capturing and displaying agent responses.
- **Member Creation & Editing**: Interface to create new members or edit existing ones.
- **Skills Management**: Browse, create, edit, and delete skills. Compares `.claude`, `.gemini`, and `.agent` vendor folders and shows sync warnings when skills or files are missing.
- **Optimistic Updates**: Immediate UI feedback when sending messages.

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev` (Runs on port 5173 by default)
3. Ensure the **server** is running on port 8699.
