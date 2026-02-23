---
name: cleanup-prepare
description: End-of-session cleanup skill. Summarizes tasks done, methodology, and key learnings. Updates relevant skills and writes a compact summary into MEMORY.md.
---

At the end of a working session, perform the following cleanup and consolidation steps.

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

Output this summary to the user in the chat before writing anything.

## 2. Update Existing Skills

If any skill's behavior was found to be incorrect, incomplete, or could be improved based on this session:
- Read the relevant SKILL.md
- Edit it to add or correct the relevant section (e.g. Troubleshooting, Notes, Workflow)
- Keep edits minimal and targeted — do not rewrite the whole skill

Skills directory: `C:\Users\User\Desktop\260204 TeamAI2\team-ai-3\members\Edan First\.claude\skills\`

## 3. Create New Skills (if applicable)

If a repeatable workflow or tool was used that isn't captured in any existing skill, create a new skill:
- Directory: `.claude/skills/<skill-name>/SKILL.md`
- Include frontmatter: `name` and `description`
- Write a clear workflow with prerequisites, steps, and troubleshooting

## 4. Update MEMORY.md

Write a compact summary of the session into MEMORY.md at:
`C:\Users\User\.claude\projects\C--Users-User-Desktop-260204-TeamAI2-team-ai-3\memory\MEMORY.md`

Rules for updating MEMORY.md:
- **Rewrite and compact** if the file is getting long or has stale/redundant entries
- Keep total length under 150 lines
- Add session learnings under relevant existing sections, or create a new section if needed
- Remove information that is no longer accurate or useful
- Do NOT duplicate information already captured in skill files

## Notes

- Always show the summary to the user first before making file edits
- Ask the user to confirm before creating a new skill (unless it's obvious)
- MEMORY.md is the source of truth for cross-session context; keep it accurate and concise
