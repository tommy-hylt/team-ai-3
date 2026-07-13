---
name: manage-routines
description: Manage scheduled routines for a member via the team-ai server. Supports listing, adding, editing, and deleting routines. Example — "create a daily routine to check the weather at 7am".
---

Routines are scheduled tasks that fire on a cron schedule. When triggered, the server sends `requestText` to the member's agent as if it were a user message.

## Script

All operations go through `.claude/skills/manage-routines/routines.js`. It automatically reads the member ID from the folder name and generates UUIDs — no manual input needed.

```
node ".claude/skills/manage-routines/routines.js" list
node ".claude/skills/manage-routines/routines.js" add    --cron "<pattern>" --text "<message>" [--notify]
node ".claude/skills/manage-routines/routines.js" edit   --id <uuid> [--cron "<pattern>"] [--text "<message>"] [--notify] [--status active|disabled]
node ".claude/skills/manage-routines/routines.js" delete --id <uuid>
```

| Flag/Arg | Default | Use when |
|---|---|---|
| `--notify` | off | The user should receive a push notification each time this routine fires |
| `--status disabled` | active | Temporarily pause a routine without deleting it |

## Workflow

1. Translate the user's natural language description into a cron pattern (see reference below)
2. Run the appropriate script command
3. Report the result to the user — include the cron pattern and `requestText` so they can verify

For `edit` and `delete`, run `list` first to get the routine `id`.

## Cron Pattern Reference

| Schedule | Pattern |
|---|---|
| Every day at 7am | `0 7 * * *` |
| Every Monday at 9am | `0 9 * * 1` |
| Every hour | `0 * * * *` |
| Every 30 minutes | `*/30 * * * *` |
| Weekdays at 8am | `0 8 * * 1-5` |
| 1st of every month at noon | `0 12 1 * *` |

## Notes

- Routines apply to the **current member** by default (the script reads the member ID from its own folder path)
- The server polls every 5 seconds and throttles to 1 routine dispatch per 5 seconds globally
- `startTime` and `lastTime` are both set to now on creation, so routines do not fire immediately
