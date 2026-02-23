# Team AI / web

A Vite-powered React frontend for interacting with the AI Team.

## Architecture

This project strictly follows "Tommy's Rules":
- **State Management**: Pure React Context + Provider + Hook pattern. No external state libraries.
- **Styling**: Plain `.css` files. No CSS-in-JS or utility frameworks.
- **Structure**: Feature-based organization with single-file focus for components.
- **Types**: Shared types defined in `src/types.ts` for consistency.

## Features

- **Member List**: Sidebar to browse available AI members with notification subscription prompts.
- **Chat Interface**: Real-time interaction via Server-Sent Events (SSE), supporting multiline input and Ctrl+Enter to send.
- **Member Creation & Cloning**: Interface to create new members or selectively clone existing ones (including skills).
- **Skills Management**: Browse, create, edit, and delete skills. Compares vendor folders and shows detailed sync warnings (newest/longest file).
- **Request Control**: Ability to cancel running agent requests.
- **Web Push Notifications**: Background notifications for new messages.
- **Drafts**: Auto-saving of chat inputs to `localStorage`.

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev` (Runs on port 5173 by default)
3. Ensure the **server** is running on port 8699.
