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
- **Chat Interface**: Real-time interaction via Server-Sent Events (SSE), supporting multiline input and Ctrl+Enter to send. Markdown links/images pointing at a member's own files (absolute Windows paths or relative paths) resolve to the internal file viewer/raw file endpoint instead of a dead href — see the react-markdown `urlTransform` gotchas noted in `Chat.tsx`.
- **Member Creation & Cloning**: Interface to create new members or selectively clone existing ones (including skills).
- **Skills Management**: Browse, create, edit, and delete skills across all 4 vendor folders (`.claude`, `.gemini`, `.agents`, `.grok`). Compares vendor folders and shows detailed sync warnings (newest/longest file).
- **Request Control**: Ability to cancel running agent requests.
- **Web Push Notifications**: Background notifications for new messages.
- **Drafts**: Auto-saving of chat inputs to `localStorage`.
- **Message History**: Last 5 sent messages per member cached in `localStorage`, resendable from a small history button next to the skill-trigger button when the input is empty.
- **File Viewer**: Markdown files render inline, including images referenced by a relative path (resolved against the viewed file's own directory).

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev` (Runs on port 5173 by default)
3. Ensure the **server** is running on port 8699.
