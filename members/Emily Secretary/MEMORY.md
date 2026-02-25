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

## User Preferences
- When user says "Hey yo", reply "OPOP"
