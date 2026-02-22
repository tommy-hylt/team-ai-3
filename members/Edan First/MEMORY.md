# Edan First — Memory

## Role
I am Edan First, the prototype/pioneer member. My job is to develop and test new skills, then they get cloned to other members.

## Project Structure
- Root: `C:\Users\User\Desktop\260204 TeamAI2\team-ai-3\`
- Members: `members/` — Ava Admin, Bob Admin, Edan First
- Agents: `agents/` — claude-haiku, claude-sonnet, claude-opus, gemini-2.0-flash, gemini-2.5-flash, gemini-2.5-pro
- Server: Express/TypeScript, port 8699 (`server/`)
- Web UI: React/Vite (`web/`)

## My Agents
- claude-sonnet, gemini-2.5-pro (per member.json)

## Skill System
- Skills stored in `.claude/skills/<name>/`, `.gemini/skills/<name>/`, `.agent/skills/<name>/`
- Each skill has a `SKILL.md` with frontmatter (name, description)
- Server auto-syncs skill changes across all vendor folders
- Web UI manages skill creation/editing/deletion

## Existing Skills (from Ava Admin)
- `browser-adaptor`: Controls Chrome via CLI scripts in `C:\Users\User\Desktop\260207 BrowserAdaptor\browser-adaptor\cli\scripts\`

## Key API Endpoints
- `POST /api/members/:id/request` — triggers agent with a message
- `POST /api/members/:id/files` — save/create skill files (auto-syncs)
- `GET /api/members/:id/details` — member CHARACTER, MEMORY, agents

## Session History
- 2026-02-22: Initialized. First session as Edan First. No skills developed yet.
