---
name: sync-skills
description: Sync skill folders across all members — ensures .claude/skills/, .gemini/skills/, and .agents/skills/ are identical for each member. Uses .claude/skills/ as source of truth.
---

When called, run the sync script to housekeep skill folders for all members.

## Workflow

### 1. Run the sync script

```
node ".claude/skills/sync-skills/sync.js"
```

This script:
- Loops over every member folder in `../` (siblings of your working directory)
- For each member that has at least one skills folder, checks whether `.claude/skills/`, `.gemini/skills/`, and `.agents/skills/` contain identical skills
- Where they differ, copies missing or outdated skills from the source of truth folder to the others

### 2. Review the output

The script prints a per-member, per-skill report:
- `OK` — skill is already in sync across all 3 folders
- `Synced` — skill was copied from source of truth to one or more out-of-sync folders
- Members with no skills folders at all are skipped silently

### 3. Report to the user

Summarize which members and skills were synced, and which were already in sync.

## Notes

- Source of truth: the existing skill folder whose newest file modification time is the latest
- A skill folder is "out of sync" if it is missing or its contents differ from the source of truth
- The script compares file contents recursively (all files in the skill folder, not just SKILL.md)
- Members with no skills folders at all are skipped (no folders created for them)
