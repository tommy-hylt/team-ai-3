# Team AI / members

Each subfolder here is one AI team member's complete, durable state: identity, memory, chat history, and skills. The server treats the folder name itself as the member's ID — renaming a folder renames the member (and breaks anything that referenced the old name, e.g. `agents` arrays on other members' `echo`/relay setups, or bookmarked URLs).

## Member Folder Structure

### Core Configuration (tracked in git — see "Git Tracking" below)
- **`member.json`**: `{ name, description, agents: string[], teams: string[] }`. `agents` is a priority-ordered list of names from `/agents` — the server tries each in order, falling back on failure. There is **no `status` field and no soft-delete** (see below) — earlier docs claiming otherwise were wrong.
- **`CHARACTER.md`**: The foundational persona, tone, and behavior — read by the agent CLI at the start of every fresh (non-resumed) conversation.
- **`MEMORY.md`**: Long-term context, history, and evolving knowledge — also read fresh every time, and the reason editing it (via `POST /details`) expires all active sessions server-side: a resumed session would otherwise keep using the old in-context memory instead of picking up the edit.

### Chat History & Runtime State (**not** tracked in git — see below)
- **`requests.json`** / **`responses.json`**: Full chat history, maintained by `chatService.ts`. Source of truth for `GET /chat` and for whether a member is currently "running" a request.
- **`sessions.json`**: One entry per `(agent, status)`, maintained by `sessionService.ts` — tracks the CLI's own session/thread ID per agent so a follow-up message resumes context instead of starting fresh. `status: "active" | "expired"`.
- **`routines.json`** / **`todos.json`**: Scheduled requests — recurring (cron) and one-shot respectively. See `server/README.md`'s "Routines & Todos Scheduling".
- **`shortcuts.json`**: A flat array of relative file paths the user has pinned for quick access — shown as a "Shortcuts" section on the file browser's root page. Purely a UI convenience; not read by agents, not synced to vendor folders.
- **`processes.json`** is **not** per-member — it's a single shared file under `server/`, not here.

### Skills (vendor folders, sync'd automatically)
- **`.claude/skills/<skill-name>/`**, **`.agents/skills/<skill-name>/`**, **`.grok/skills/<skill-name>/`** — the same skill content, mirrored across all 3 AI vendor CLI conventions so any of a member's configured agents can use it regardless of which vendor's CLI happens to be running. Each skill folder typically holds a `SKILL.md` plus any supporting files.
- Writing to any one of these three via the web UI (or `POST /api/members/:id/files`) automatically mirrors the change to the other two (`fileService.ts`'s `getSkillSyncPaths()`) — you should almost never need to write to more than one vendor path by hand. If they ever do drift (e.g. from a manual edit outside the app), the Skills UI (`web/README.md`) flags it, and the `sync-skills` skill (below) can reconcile it in bulk.
- A 4th folder, `.gemini/skills/`, existed historically for Google/agy support. It was removed entirely on 2026-07-26 along with the rest of Gemini support (see `agents/README.md`) — don't recreate it without re-adding the vendor to `server/fileService.ts`'s `VENDOR_FOLDERS` and `server/memberService.ts`'s clone logic first, or it'll just be dead, unsynced storage.

## Deleting a Member Is Permanent

`DELETE /api/members/:id` does `rm(memberDir, { recursive: true, force: true })` — the **entire folder is gone**, immediately, with no soft-delete, no trash, no undo. The web UI's own confirmation dialog says as much. If a member's folder isn't one of the four tracked in git (next section), deleting it has no recovery path at all. Back up the folder first if there's any doubt.

## Git Tracking — Only 4 Members Are Version-Controlled

Check `.gitignore` at the repo root: only **Ava Admin**, **Edan First**, **Emily Secretary**, and **Wendy Housekeeper** are tracked in git at all (and even for those four, only `member.json`/`CHARACTER.md`/`MEMORY.md` plus the three skill vendor folders — chat history, sessions, routines, and todos are excluded everywhere, including for these four). Every other member folder (test members, personal/local team members, anything created after cloning this repo) is **entirely untracked, local-only state** — `git status` won't see it, `git log` has no history for it, and it will not appear on another machine after a fresh clone.

This means: if you're relying on git as a backup for a member's memory or skills, check first whether that member is one of the four above. If not, treat that folder like any other local, unbacked-up data — the repo's own tooling won't protect it.

## Special-Purpose Members Worth Knowing About

- **Billy Test** (untracked, local): the standard agent-change verification member. Her `MEMORY.md` contains a secret code; the standard smoke test is to point her `agents` at whatever you're verifying and ask her for it, confirming the full `CHARACTER.md`/`MEMORY.md` → CLI → response round trip actually works before rolling a change out further. See `agents/README.md`'s "Adding a New Agent."
- **Edan First** / **Ava Admin**: carry a `give-skill` skill (in all 3 vendor folders) that copies one of their own skills to another named member, across all 3 vendor folders in one step — useful for propagating a newly written skill without manually copying files three times per target member.
- **Wendy Housekeeper**: carries a `sync-skills` skill that walks every member's skill folders, picks the newest version of each skill as source of truth, and reconciles any that have drifted out of sync across `.claude`/`.agents`/`.grok` — the bulk version of what the web UI's per-file sync warnings surface one at a time. Her `MEMORY.md` also doubles as a running log of past sync runs (historical, not meant to be "corrected" for accuracy after the fact — it's what actually happened at the time).
