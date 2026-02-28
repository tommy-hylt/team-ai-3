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
- **notify** — whether the user should receive a push notification when the response is ready
- **echo** — whether the response should be returned for follow-up processing

### 2. Resolve the target member's folder name

List the members directory (`../` relative to your working directory) and find the folder whose name matches the target member (case-insensitive partial match, e.g. `"Ava"` → `"Ava Admin"`).

### 3. Send the request

Decide on the flags based on context, then run the script:

| Flag | Default | Use when |
|---|---|---|
| `--notify` | off | The **user** should be alerted when the response arrives (e.g. user is waiting for an answer) |
| `--echo` | off | You need the response back for **follow-up** (e.g. chaining requests, summarising replies) |

For routine member-to-member communication where no follow-up is needed, omit both flags.

```
node ".claude/skills/make-request/request.js" --member "<target-folder-name>" --text "<message>" [--notify] [--echo]
```

### 4. Report to user

Tell the user the request was sent and include the `requestId`. The response is processed asynchronously by the target member's agent.
