---
name: summarize-session
description: Session summary skill. Call anytime to summarize tasks done so far, methodology, and key learnings. Updates relevant skills and writes a compact summary into MEMORY.md.
---

When called, perform the following summarization and consolidation steps.

## 1. Summarize the Session

Review the full conversation and produce a structured summary:

### Tasks Completed
List each task the user asked for and what was done to complete it.

### Methodology
For each task, briefly describe the approach taken — tools used, decisions made, order of steps.

### Key Points / Learnings
Highlight anything worth remembering across sessions:
- Gotchas, edge cases, or surprising behaviors discovered
- Patterns that worked well (or didn't)
- Environment-specific notes (paths, credentials, tool quirks)
- Decisions made that affect future work

## 2. Update Existing Skills

If any skill's behavior was found to be incorrect, incomplete, or could be improved based on this session:
- Read the relevant SKILL.md
- Edit it to add or correct the relevant section (e.g. Troubleshooting, Notes, Workflow)
- Keep edits minimal and targeted — do not rewrite the whole skill

Skills directory: `.claude/skills/` (relative to the member's working directory)

## 3. Create New Skills (if applicable)

If a repeatable workflow or tool was used that isn't captured in any existing skill, create a new skill:
- Directory: `.claude/skills/<skill-name>/SKILL.md`
- Include frontmatter: `name` and `description`
- Write a clear workflow with prerequisites, steps, and troubleshooting

## 4. Update MEMORY.md

**Target file: `MEMORY.md` in the member's own folder** — the same folder that contains `member.json` and `CHARACTER.md`. This is the member's working directory root. Do NOT write to any other path (e.g. not the Claude auto-memory path under `.claude/projects/...`).

Read the file first, then rewrite it with the updated content.

Rules:
- **Rewrite and compact** if the file is getting long or has stale/redundant entries
- Keep total length under 300 lines
- Add session learnings under relevant existing sections, or create a new section if needed
- Remove information that is no longer accurate or useful
- Do NOT duplicate information already captured in skill files

## Notes

- MEMORY.md lives alongside `member.json` in the member's root folder — not in any `.claude/` subfolder
