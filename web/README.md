# Team AI / web

A Vite-powered React frontend for interacting with the AI Team. Talks to the server (`../server`) purely over HTTP + SSE — no server-side rendering, no shared process.

## How the Web App Is Actually Served — read this before "fixing" a UI bug

**The live app is served by the Express server, not by the Vite dev server.** Running `npm run dev` here starts a Vite dev server on `:5173` with hot-module-reload — that's a convenience for iterating on components, but **it is not what users actually see.** The real app is the build in `web/dist`, served by the Express server itself at `http://localhost:8699` (`express.static()` — see `../server/README.md`) — that URL (or whatever tunnel/reverse-proxy points at this machine's `:8699`) is what's actually used day to day, regardless of whether `vite dev` happens to also be running on `:5173`.

Consequences:
- **After any change under `/web`, rebuild before it's visible anywhere real users look**: `npm run build`. Editing `src/*.tsx` alone does nothing for the app served at `:8699` until you rebuild — the two can drift arbitrarily far apart, since `:5173` always reflects current source while `:8699` reflects whatever you last built.
- The Vite dev server (`:5173`) renders a fully working UI of its own — that's precisely what makes it dangerous to reach for while debugging: it's easy to convince yourself a fix works because the dev server shows it, while the actually-served build at `:8699` is still stale. **Never use `:5173` to verify a fix is live for the user; only use it for local HMR-driven iteration, and always finish by rebuilding.**
- `vite preview` (port `4173` by default) is a *different, unrelated* thing you may see running on this machine — it can belong to an entirely different project. Don't assume a process on `4173` is this app's frontend; check its command line (`Get-CimInstance Win32_Process`) before trusting it.
- If a change "isn't showing up," check in this order: (1) did you rebuild `web/dist`? (2) is the server (`:8699`) actually serving the freshly built `index.html`/hashed asset filenames — `curl http://localhost:8699/` and compare the asset hash to `web/dist/index.html`? (3) only then suspect the code itself.

## Architecture

This project follows "Tommy's Rules":
- **State management**: Pure React Context + Provider + hook pattern (`MemberContext`/`MemberProvider`). No external state library.
- **Styling**: Plain `.css` files, one per component, no CSS-in-JS or utility framework. Note: plain CSS files do **not** get SCSS-style nesting for free — this codebase relies on native CSS nesting support (modern browsers) and Vite/esbuild tolerates it with warnings, not errors; keep nested selectors under a class (`.Parent .Child`), not a bare element start (`pre {`) if you want to avoid the ambiguity warning esbuild prints at build time.
- **Structure**: Feature-based, mostly one component per file, colocated `.css`.
- **Types**: Shared shapes in `src/types.ts`; the `Member` type is actually imported straight from `../../server/member` (single source of truth across the client/server boundary, since both are TypeScript in the same repo).
- **Routing**: `react-router-dom`, all routes declared in `App.tsx`.

## Real-Time Updates

`Chat.tsx` opens one SSE connection per selected member (`GET /api/members/:id/events`) and listens for `request` / `response` / `status_update` events pushed by the server — chat updates arrive live without polling. A 30s heartbeat comment keeps the connection alive through most proxies/tunnels.

## Chat Send Status (spinner → tick)

Outgoing messages show a small spinner next to the timestamp while the `POST /request` is in flight, then a check icon once it's confirmed reached the server — added because on a bad connection, a message could appear to send (optimistic UI) while actually failing silently. Two details worth knowing if you touch this (`sendStatus` state, `sendStartTimes` ref in `Chat.tsx`):
- The tick is deliberately **not persisted** — it's local UI feedback for the current session only, not chat history state. It intentionally disappears on refresh.
- There's an enforced **800ms minimum spinner lifetime** so it's actually perceptible on fast connections, not a single-frame flicker. Watch for the temp-ID → real-ID swap when implementing anything similar: the message's `id` changes as soon as the server ack arrives, so `sendStatus` must be re-keyed to the real ID *immediately*, with only the sending→sent visual transition delayed — otherwise there's a gap where neither spinner nor tick renders.

## Execution Log Viewer

Each message with an associated request has a terminal-icon toggle that fetches `GET /api/requests/:id/logs` and renders the raw CLI output. Each log entry's header shows a live-ticking "updated Xs ago" derived from the log file's `mtime` (see `server/README.md`'s API docs) — this is what lets you tell a genuinely stuck agent call from one that's just still working: a frozen, growing "ago" means no new output in a while; one that keeps resetting near zero means it's actively writing. While a request is still `"running"` and its log panel is open, the frontend re-polls every 3 seconds so this stays live instead of showing a stale one-time snapshot.

## Markdown Rendering Gotchas (`react-markdown` v10)

Both the chat view and the file viewer (`MemberFileEdit.tsx`) render markdown with custom `img`/`a` component overrides, resolving member-relative paths and absolute Windows paths in agent output into working links (the internal file-viewer route or the raw-file endpoint) instead of dead hrefs. Two non-obvious library behaviors to know about before touching `urlTransform`/`resolveMemberFileHref` in `Chat.tsx`:

1. **The default URL sanitizer treats `C:` as an unrecognized protocol and strips it.** A Windows absolute path like `C:\Users\...\screenshot.png` written by an agent would otherwise silently become a dead link. The custom `urlTransform` explicitly lets absolute-Windows-path-shaped URLs through unchanged before falling back to `defaultUrlTransform` for everything else (so genuinely dangerous schemes are still sanitized normally).
2. **react-markdown percent-encodes the raw href before your code ever sees it** — spaces become `%20`, and critically, backslashes become `%5C`. A regex written against a literal backslash (`C:\Users\...`) will never match what actually reaches `urlTransform`; it has to also match the encoded form (`C:%5CUsers%5C...`). Decode with `decodeURIComponent` before doing path comparisons in `resolveMemberFileHref`.

The file viewer's image resolution is separate: relative image paths there resolve against the *viewed file's own directory*, not the member root, since a file being read (unlike a chat message) does have a well-defined "current location."

## Skill Sync UI

`SkillList.tsx` / `SkillEdit.tsx` / `SkillFileEdit.tsx` list skills across all 3 vendor folders (`.claude`, `.agents`, `.grok`), union their names, and flag any skill/file that's missing or out-of-sync in one or more folders (comparing content, not just presence — using the sync-check endpoints in `server/README.md`). Creating/editing/deleting a file under a skill folder from the UI writes through `POST /api/members/:id/files`, which the server mirrors across all 3 vendor folders automatically (see `fileService.ts`) — the frontend doesn't need to (and shouldn't) write to more than one vendor path itself.

## Web Push Notifications

`pushManager.ts` registers `public/sw.js` and subscribes via the VAPID key from `GET /api/push/public-key`. The service worker has some deliberate anti-noise logic worth knowing if push behavior seems "wrong": on receiving a push, it checks whether a client window for that member's chat is already open and *visible*, and if so suppresses the notification — then re-checks after a **5-second delay** to handle the race where the SSE update and the push arrive close together and the tab was in the process of becoming visible. Notification titles are phrased "`<Member> sent a new message`" (member name first) so the sender is visible even when a mobile OS collapses/truncates the notification.

## Features Summary

- **Member List**: Sidebar to browse available AI members with notification subscription prompts.
- **Chat Interface**: Real-time interaction via SSE, multiline input, Ctrl+Enter to send, send-status indicator, execution log viewer with live staleness indicator.
- **Member Creation & Cloning**: Create new members or selectively clone existing ones (including skills).
- **Skills Management**: Browse/create/edit/delete skills across all 3 vendor folders with sync-status warnings.
- **Request Control**: Cancel running agent requests.
- **Web Push Notifications**: Background notifications for new messages, suppressed when the relevant chat is already visible.
- **Drafts**: Auto-saving of chat inputs to `localStorage`.
- **Message History**: Last 5 sent messages per member cached in `localStorage`, resendable from a small history button.
- **File Viewer**: Markdown files render inline, including images by relative path resolved against the viewed file's own directory.

## Getting Started

1. Install dependencies: `npm install`.
2. For active frontend iteration: `npm run dev` (port 5173, HMR) — see the warning at the top of this file about what this does and does not affect.
3. To make a change actually visible to users: `npm run build` (writes `web/dist`, served by the already-running server on `:8699`).
4. Ensure the **server** is running on port 8699 either way — the dev server proxies `/api/*` to it (see `vite.config.ts`).
