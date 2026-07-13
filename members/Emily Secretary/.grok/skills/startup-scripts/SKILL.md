---
name: startup-scripts
description: Manage startup scripts in C:\Program Files (Mine)\Startup Scripts\
---

# Startup Scripts Skill

## Overview

Startup scripts live in `C:\Program Files (Mine)\Startup Scripts\`. They control what gets launched at startup.

## File Naming Conventions

- `run-*.cmd` — **Orchestrators**: called directly at startup; they `START` one or more `call-*.cmd` scripts
- `call-*.cmd` — **Launchers**: each one CDs to a specific app folder and calls its startup script
- Supporting scripts (e.g. `nord-wait.js`) handle dependency waiting logic

## Orchestrators

| File | Behaviour |
|------|-----------|
| `run-normal.cmd` | Starts apps immediately, no checks. For general-purpose services. |
| `run-nord.cmd` | Waits for NordVPN to be ready (via `nord-wait.js`) before launching. Checks for Japan IP via ip-api.com. |
| `run-admin.cmd` | Starts mobile remote desktop (admin context). |

## Adding a New App

1. Create `call-<app-name>.cmd` following this pattern:
   ```cmd
   CD "C:\path\to\app"

   CALL dev.cmd
   ```
2. Add `START call-<app-name>.cmd` to the appropriate `run-*.cmd`:
   - Use `run-normal.cmd` for most apps
   - Use `run-nord.cmd` only if the app requires Nord/Node to be ready first

## Notes

- Scripts may change over time — always read the files before editing
- Keep launcher names short: `call-<app>.cmd`, not `call-<full-project-name>.cmd`
- Current apps in `run-normal.cmd`: browser-adaptor, console-panel, team-ai-server
- Current apps in `run-nord.cmd`: openclaw (after nord-wait)
