---
name: make-response
description: Post a response to your own chat history without a matching request. Use when you want to send a message to the user directly. Example — "tell the user the task is done".
---

Post a response directly into this member's chat. No matching request is needed — `requestId` is intentionally left blank. The member's name is filled automatically from `member.json`.

## Workflow

### 1. Compose the response text

Determine what to say to the user from context.

### 2. Decide on --notify

| Flag | Default | Use when |
|---|---|---|
| `--notify` | off | The user should receive a push notification for this response |

### 3. Post the response

```
node ".claude/skills/make-response/response.js" --text "<message>" [--notify]
```

### 4. Report to user

Confirm the response was posted.
