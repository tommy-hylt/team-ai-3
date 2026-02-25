---
name: give-skill
description: Copy one of your skills to another member. Usage example — "give your cleanup-prepare skill to Ava".
---

Copy a skill from this member to a target member, deploying it into all 3 skill folders (`.claude`, `.gemini`, `.agent`).

## Workflow

### 1. Parse the request

Extract from the user's message:
- **skill name** — e.g. `cleanup-prepare`
- **target member** — e.g. `Ava`

### 2. Resolve the target member folder

List the members directory (`../` relative to your working directory) to find the full folder name that matches the target member name (case-insensitive partial match is fine, e.g. "Ava" → "Ava Admin").

### 3. Verify the skill exists

Check that `.claude/skills/<skill-name>/` exists in your working directory.

### 4. Sync your 3 source folders

Run the prepare script to ensure your `.claude`, `.gemini`, and `.agent` copies of the skill are identical before copying:

```
node ".claude/skills/give-skill/prepare.js" --skill <skill-name>
```

This uses `.claude/skills/<skill-name>/` as the source of truth and syncs the other two folders to match.

### 5. Copy the skill to the target member

```
node ".claude/skills/give-skill/copy-skill.js" --skill <skill-name> --member "<target-member-folder-name>"
```

This copies from your `.claude/skills/<skill-name>/` into the target member's `.claude/skills/<skill-name>/`, `.gemini/skills/<skill-name>/`, and `.agent/skills/<skill-name>/`.

### 6. Report result

Tell the user which skill was copied and to which member.

## Scripts

Both scripts live in `.claude/skills/give-skill/` and use `__dirname`-relative paths — no hardcoded absolute paths.

| Script | Purpose |
|---|---|
| `prepare.js --skill <name>` | Sync this member's 3 skill folders before copying |
| `copy-skill.js --skill <name> --member <folder>` | Copy skill to target member's 3 folders |
