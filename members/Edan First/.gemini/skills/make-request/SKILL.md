---
name: make-request
description: Send a request to another team member via the team-ai server. Usage example — "ask Ava to summarise the project status".
---

Send a text request to another member. The server runs the target member's agent and returns a response asynchronously. The `requester` field is filled automatically from `member.json`.

## Workflow

### 1. Parse the request

Extract from the user's message:
- **target member** — who to send to (e.g. `Ava`)
- **message text** — what to ask or tell them

### 2. Resolve the target member's folder name

List the members directory (`../` relative to your working directory) and find the folder whose name matches the target member (case-insensitive partial match, e.g. `"Ava"` → `"Ava Admin"`).

### 3. Send the request

```
node ".claude/skills/make-request/request.js" --member "<target-folder-name>" --text "<message>"
```

The script auto-reads your name from `member.json` and URL-encodes the member name. Returns the `requestId` on success.

### 4. Report to user

Tell the user the request was sent and include the `requestId`. The response is processed asynchronously by the target member's agent.
