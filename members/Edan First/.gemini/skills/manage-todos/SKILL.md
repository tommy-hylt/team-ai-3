---
name: manage-todos
description: Manage one-time todos for a member via the team-ai server. Todos fire at an exact date/time (up to the minute). Example - add a todo to send the report at 3pm today.
---

Todos are one-time scheduled tasks that fire at an exact datetime (up to minute precision). When triggered, the server sends `requestText` to the member's agent as if it were a user message.

## Script

All operations go through `.claude/skills/manage-todos/todos.js`. It automatically reads the member ID from the folder name and generates UUIDs - no manual input needed.

```
node ".claude/skills/manage-todos/todos.js" list
node ".claude/skills/manage-todos/todos.js" add    --time "<YYYY-MM-DD HH:MM>" --text "<message>" [--notify]
node ".claude/skills/manage-todos/todos.js" edit   --id <uuid> [--time "<YYYY-MM-DD HH:MM>"] [--text "<message>"] [--notify] [--status active|disabled]
node ".claude/skills/manage-todos/todos.js" delete --id <uuid>
```

| Flag/Arg | Default | Use when |
|---|---|---|
| `--time` | required | Exact datetime to trigger the todo (e.g. `"2026-04-12 15:30"`) |
| `--notify` | off | The user should receive a push notification when this todo fires |
| `--status disabled` | active | Temporarily pause a todo without deleting it |

## Workflow

1. Translate the user's natural language time description into an exact `YYYY-MM-DD HH:MM` datetime
2. Run the appropriate script command
3. Report the result to the user - include the trigger time and `requestText` so they can verify

For `edit` and `delete`, run `list` first to get the todo `id`.

## Time Format Examples

| Natural language | `--time` value |
|---|---|
| Today at 3pm | `"2026-04-12 15:00"` |
| Tomorrow at 9:30am | `"2026-04-13 09:30"` |
| Friday at noon | `"2026-04-17 12:00"` |
| 25 April at 8am | `"2026-04-25 08:00"` |

Always use 24-hour format. Use today's date as the reference when the user says today, tonight, this evening, etc.

## Notes

- Todos apply to the **current member** by default (the script reads the member ID from its own folder path)
- Todos fire once at the specified time and do not repeat
- `triggerTime` must be in ISO 8601 format - the script handles conversion from `YYYY-MM-DD HH:MM` input
