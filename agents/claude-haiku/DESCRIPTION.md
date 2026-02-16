# claude-haiku

Use this agent when you need:
- the lowest cost / highest throughput Claude option
- quick triage, routing, small edits, lightweight reasoning

Avoid when:
- the task is complex and requires deep reasoning or long context
- you expect many tool calls / multi-step planning where a stronger model is worth it

Command notes:
- Uses Claude Code CLI (`claude`).
- Uses `-p <prompt>` (print mode; exits when done).
- Uses `--model haiku` (alias; other common aliases: `sonnet`, `opus`).
- Uses `--dangerously-skip-permissions` (so your surrounding system must enforce safety)
