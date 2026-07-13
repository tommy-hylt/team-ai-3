---
name: update-agents
description: Update agent configurations for members via the server API — check each member's current agent list and update as needed.
---

When called, use the server API to review and update agent configurations for all members.

## Workflow

### 1. List all members

```
GET http://localhost:8699/api/members
```

### 2. For each member, get their current details

```
GET http://localhost:8699/api/members/{memberId}/details
```

This returns the member's current `agents` array and the `availableAgents` list (agents installed on the server).

### 3. Determine what updates are needed

Compare each member's `agents` list against `availableAgents`. Common actions:
- Remove agents that no longer appear in `availableAgents`
- Add newly available agents that the member should have

Use your judgement based on the member's role and current configuration.

### 4. Apply updates via the API

```
POST http://localhost:8699/api/members/{memberId}/details
Content-Type: application/json

{ "agents": ["agent-name-1", "agent-name-2"] }
```

The server handles all persistence — no file edits needed.

### 5. Report to the user

Summarize which members were reviewed, what changes were made, and the final agent list for each updated member.

## Notes

- `availableAgents` in the details response is the authoritative list of installed agents
- Members that already have a valid, up-to-date agent list can be left unchanged
- Prefer lightweight/fast agents as primary, heavier ones as fallback
