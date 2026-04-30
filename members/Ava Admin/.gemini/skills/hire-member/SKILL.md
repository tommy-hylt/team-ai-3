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
| `agents` | No | — | AI model(s) to power this member. Always choose based on the member's role — see Agent Selection below. |
| `teams` | No | `["General"]` | Team(s) for UI grouping (e.g. `["Dev"]`, `["HR", "General"]`). |
| `character` | No | `""` | Full content of `CHARACTER.md` — personality, role, responsibilities, behaviour instructions. |
| `memory` | No | `""` | Initial content of `MEMORY.md`. Typically left empty on hire. |

## Agent Selection

Available agents are discovered at runtime. You must list the `agents/` folder (located at `../../agents/` relative to the workspace root) to find currently supported models.

Each agent folder contains a `DESCRIPTION.md` explaining its strengths and best-use cases.

Always pick the agent that best fits the member's role and responsibilities. Never fall back to a default — read the descriptions and make an informed choice.

Multiple agents can be listed in the `agents` field — the server uses the first available one that is currently configured.

## Name Format

Member names follow the pattern `"FirstName Position"` (e.g. `"Yuki Tutor"`, `"Marco Analyst"`).

- **FirstName** — a common English given name (e.g. Alice, Ben, Clara, David, Fiona, George, Helen, Ivan, Julia, Kevin, Laura, Mike, Nina, Oscar, Paula, Quinn, Rachel, Sam, Tina, Victor, Wendy, Xavier, Yasmine, Zara).
- **Position** — a concise job or status title (e.g. Programmer, Analyst, Designer, Manager, Researcher, Planner, Assistant, Coordinator, Engineer, Advisor, Tutor, Administrator).

If the user provides only a first name, infer a suitable position based on the described role.
If the user provides only a position (or role description) but no first name, choose a fitting English given name.
If neither is provided, choose both a name and position that fit the described role or context.

## Workflow

1. **Mandatory Step:** Explicitly re-read the project's `agents` folder (located at `../../agents/` relative to the workspace root or equivalent path) on every run to verify current agent availability.
   - List the directory to find available agent names (folder names).
   - Read `DESCRIPTION.md` within the chosen agent's folder if more context on its capabilities is needed.
   - Do not rely on previously seen or cached agent lists, as availability changes frequently.
2. Gather details from the user's request: name, role, teams, agent
3. List the members directory (`../../members/` relative to the skill folder, or check `GET http://localhost:8699/api/members`) to get all existing member names
4. If filling in a first name, ensure it does not match the first name of any existing member (case-insensitive). Pick a different name if there is a clash
5. If the name is missing a first name or position (or both), fill in suitable values following the Name Format above — clash-free
6. Compose the `character` field — describe who they are, their responsibilities, communication style, and any behavioural constraints
7. Call the API
8. Report the created member's name (including any filled-in parts), agent, and teams to the user
