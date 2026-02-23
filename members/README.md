# Team AI / members

This directory contains individual AI team member profiles and their persistent state.

## Member Folder Structure

Each member has their own subfolder (e.g., `Ava Admin`).

### Core Configuration
- **`member.json`**: Basic metadata:
  - `name`: Display name.
  - `description`: A short biography.
  - `agents`: A list of compatible agent template names (from the `agents/` folder).
  - `status`: "active" or "deleted" (supports soft delete).
- **`CHARACTER.md`**: Defines the foundational persona, tone, and behavior.
- **`MEMORY.md`**: Stores long-term context, history, and evolving knowledge.

### Chat History (JSON Logs)
- **`requests.json`**: A history of all user requests received by this member.
- **`responses.json`**: A history of all agent-generated responses.

These history files are automatically maintained by the `chatService` in the backend.

### Skills

Skills are stored in vendor-specific folders that are kept in sync:
- **`.claude/skills/<skill-name>/`**: Skills for Claude agents.
- **`.gemini/skills/<skill-name>/`**: Skills for Gemini agents.
- **`.agent/skills/<skill-name>/`**: Skills for generic agents.

Each skill folder typically contains a `SKILL.md` file and any additional files the skill needs. When a skill is created, edited, or deleted via the web UI, changes are automatically mirrored across all three vendor folders.
