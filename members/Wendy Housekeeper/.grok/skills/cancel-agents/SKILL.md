---
name: cancel-agents
description: Cancel stale running/pending requests across all members — any request older than 1 day that is still running or pending is cancelled via the server API.
---

When called, run the cancel-agents script to clean up stale requests for all members.

## Workflow

### 1. Run the cancel script

```
node ".claude/skills/cancel-agents/cancel.js"
```

This script:
- Loops over every member folder in `../` (siblings of your working directory)
- Reads each member's `requests.json`
- Finds any request whose status is `"running"` or `"pending"` and whose `requestTime` is more than 1 day (24 hours) old
- Calls `POST http://localhost:8699/api/requests/{id}/cancel` with `{ memberId }` for each stale request

### 2. Review the output

The script prints a per-member report:
- `Cancelled` — request was successfully aborted
- `Failed` — server returned an error
- `Error` — network or other error during the API call
- Members with no stale requests are skipped silently

### 3. Report to the user

Summarize how many stale requests were found and cancelled across all members.

## Notes

- A request is "stale" if its `requestTime` is more than 24 hours ago and its status is still `running` or `pending`
- The server marks cancelled requests as `"aborted"` in the member's `requests.json`
- If the server is not running, the script will report connection errors for each stale request
