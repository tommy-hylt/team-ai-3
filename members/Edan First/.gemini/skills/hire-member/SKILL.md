---
name: hire-member
description: Create a new team member via the server API. Example — "hire a Japanese language tutor named Yuki".
---

Create a new member by calling the server API directly.

## API

```
POST http://localhost:8699/api/members
Content-Type: application/json

{
  "name": "<FirstName Role>",
  "description": "<one-line role summary>",
  "agents": ["<agent>"],
  "teams": ["<team>"],
  "character": "<CHARACTER.md content>",
  "memory": ""
}
```

Returns the created member details object.

## Field Reference

| Field | Required | Default | Description |
|---|---|---|---|
| `name` | Yes | — | Display name, also used as the folder name. Use `"FirstName Role"` format (e.g. `"Yuki Tutor"`). |
| `description` | No | `""` | One-line summary of the member's role, shown in the UI. |
| `agents` | No | `["gemini-2.5-flash"]` | AI model(s) to power this member. See agent guide below. |
| `teams` | No | `["General"]` | Team(s) for UI grouping (e.g. `["Dev"]`, `["HR", "General"]`). |
| `character` | No | `""` | Full content of `CHARACTER.md` — personality, role, responsibilities, behaviour instructions. |
| `memory` | No | `""` | Initial content of `MEMORY.md`. Typically left empty on hire. |

## Agent Selection Guide

| Agent | Best for |
|---|---|
| `gemini-2.5-flash` | Default. Fast and capable. Good for most general-purpose members. |
| `gemini-2.5-pro` | Complex reasoning, research, long-context analysis. |
| `gemini-2.0-flash` | Lightweight tasks, high-frequency routines. |
| `claude-sonnet` | Nuanced writing, instruction-following, chat-heavy roles. |
| `claude-opus` | Senior or complex roles requiring deep reasoning. |
| `claude-haiku` | Simple, fast, repetitive tasks. |
| `codex-gpt-5.3-codex` | Coding-focused roles (programmer, code reviewer). |
| `codex-gpt-5.2` | General coding with broader knowledge. |
| `codex-gpt-5.1-codex-mini` | Lightweight coding tasks. |

Multiple agents can be listed — the server uses the first available.

## Workflow

1. Gather details from the user's request: name, role, teams, agent
2. Compose the `character` field — describe who they are, their responsibilities, communication style, and any behavioural constraints
3. Call the API
4. Report the created member's name, agent, and teams to the user
