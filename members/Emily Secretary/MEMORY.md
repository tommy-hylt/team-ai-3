# Emily Secretary — Memory

## Role
Primary secretary. Handles tasks ranging from simple file work to complex Cloudflare/infrastructure management.

## Skills Available
- `browser-adaptor`: Control real Chrome via CLI scripts (CDP). Use for any login-required website interaction.
- `cloudflare-tunnel`: Manage Cloudflare Zero Trust tunnel routes and Access app domains. Discover IDs from URL — never hardcode.
- `manage-routines`: List/add/edit/delete scheduled routines via server API (GET then POST full array).
- `make-request`: Send a request to another member via POST /api/members/:id/request.
- `summarize-session`: Summarize session, update skills, write to this MEMORY.md.
- `startup-scripts`: Manage startup scripts in `C:\Program Files (Mine)\Startup Scripts\`.
- `use-google-cli`: Use `gws` CLI to interact with Google Drive, Calendar, Gmail etc. Auth already set up.

## Cloudflare Work (sessions 1–2)
- Tunnel: HeyaHyperW (HEALTHY). Routes: ports 6485, 5173, 8787, 8699.
- Access apps: HeyaTunnel-LongSession (mobileremotedesktop, vitedefault, consolepanel, teamai) and HeyaTunnel-ShortSession (mobileremotedesktop-shortsession, consolepanel-shortsession).
- Removed openclaw route (port 18789) from tunnel and LongSession.
- Added teamai.rubbishnetworkgoaway.uk → localhost:8699 to tunnel and LongSession.
- IDs must always be discovered fresh from the URL — see cloudflare-tunnel skill.

## Startup Scripts (session 3)
- Folder: `C:\Program Files (Mine)\Startup Scripts\`
- Two types: `run-*.cmd` (orchestrators) and `call-*.cmd` (individual launchers)
- `run-normal.cmd`: starts browser-adaptor, console-panel, team-ai-server immediately
- `run-nord.cmd`: waits for NordVPN (Japan IP check) via `nord-wait.js`, then starts openclaw
- team-ai-3 server launcher: `call-team-ai-server.cmd` → `team-ai-3\server\dev.cmd`

## Browser Adaptor Gotchas
- React forms / account buttons: use `Runtime.evaluate` with `new MouseEvent('click', {bubbles:true, cancelable:true})` — CDP mouse events don't trigger React handlers.
- React Select dropdowns: hidden combobox is ~4px wide. Find visible wrapper div via TreeWalker on `textContent` "Select or type to search...", click its `getBoundingClientRect()` coords.
- SPA tab switching: `[role="tab"]` requires `tab.click()` via `Runtime.evaluate`, not CDP mouse events.
- Custom .mjs scripts: place in `cli/scripts/` dir — absolute `C:/...` ESM import paths fail on Windows.
- Wrong focus when typing: get exact coords via `getBoundingClientRect()`, click before typing; press Escape if a dropdown is open.
- `--selector` click hits hidden elements and returns `{x:0,y:0}` — use more specific selectors or Runtime.evaluate.

## Google Drive Upload (session 4)
- Browser-based upload via CDP is NOT feasible: Drive uses a hidden same-origin iframe for file inputs, bypassing all main-window JS patches (setFileInputFiles, createElement patch, drag-and-drop, prototype patching all fail)
- Solution: use `gws` CLI (already installed globally). Skill: `use-google-cli`
- Credentials: `C:\Users\User\.config\gws\client_secret.json` (Desktop app OAuth client)
- Project: `workspacecliauth`, Client ID: `588624123772-qnt79fg3d19nba4lbb828durqs5caek0.apps.googleusercontent.com`
- Test user: `tommyheyalaptop@gmail.com` added to OAuth consent screen
- Upload: `gws drive +upload "<file>" --parent <folder_id>`
- Temp folder ID: `1HZoMd6SzKGa3lgfIExUxEQuZV3HvjsmV`
- `gws auth login` must be run by the user (opens browser OAuth) — Emily cannot run it

## Angular Material / Google Cloud Console Gotchas
- `mat-mdc-chip-input` (email chip fields): use native `HTMLInputElement.prototype.value` setter + `input` event + `keydown Enter` event via `Runtime.evaluate`. Value reads back empty after chip creation — that's normal, check screenshot.
- `cfc-select` / `cfc-option` dropdowns: use `document.querySelector('cfc-select').click()` then find `cfc-option` by textContent and `.click()` it
- Radio buttons: use `input[type="radio"].click()` + `.checked = true` + dispatch `change` event via JS
- Coordinate-based clicks often fail on Angular Material components — prefer JS `.click()` via `Runtime.evaluate`

## User Preferences
- When user says "Hey yo", reply "OPOP"
