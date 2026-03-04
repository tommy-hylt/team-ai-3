---
name: browser-adaptor
description: Control Chrome with the user's real profile, cookies, and login sessions via CLI scripts. Use when the user asks to visit, interact with, or extract information from websites that require login (e.g. Google, GitHub, internal tools).
---

Control the user's Chrome browser (with their real profile, cookies, and login sessions) via CLI scripts.

**Use this skill when the user asks you to visit, interact with, or extract information from websites that require login** (e.g. Google, GitHub, internal tools). Unlike headless browsers, this controls the user's actual Chrome — so all existing sessions and credentials are available.

## Prerequisites

Before using the scripts, read the full script reference:

```
C:\Users\User\Desktop\260207 BrowserAdaptor\browser-adaptor\cli\scripts\README.md
```

## Setup (run once per session)

The server must already be running. Ensure the extension is connected:

```bat
node "C:\Users\User\Desktop\260207 BrowserAdaptor\browser-adaptor\cli\scripts\prepare.js"
```

This checks `/health`. If the extension is disconnected it opens Chrome to wake the service worker and retries (up to 3 times). **Always run this before any other script.**

## Script reference (quick)

All scripts live in `C:\Users\User\Desktop\260207 BrowserAdaptor\browser-adaptor\cli\scripts\`.

Run them with: `node <script> [args]`

### Navigation / tabs

| Script | Usage |
|---|---|
| `url.js` | Print current page URL |
| `navigate.js <url>` | Navigate current tab to URL |
| `new-tab.js <url>` | Open URL in a new tab |
| `tabs-list.js` | List all open tabs (id, url, title) |
| `tab-switch.js <tabId>` | Switch to tab by id |
| `tab-switch.js --url <substring>` | Switch to tab whose URL contains substring |

### Mouse / keyboard

| Script | Usage |
|---|---|
| `click.js <x> <y>` | Click at viewport coordinates (CSS pixels) |
| `click.js --selector "CSS"` | Click element by CSS selector |
| `click.js --backendNodeId <id>` | Click element by AXTree/DOM backend node id |
| `type.js "text"` | Insert text (CDP `Input.insertText`) |
| `key-press.js <key>` | Press a key (e.g. `Enter`, `Tab`, `Escape`) |
| `key-down.js <key>` | Key down event |
| `key-up.js <key>` | Key up event |
| `mouse-move.js <x> <y>` | Move mouse to coordinates |
| `mouse-down.js <x> <y> [button]` | Mouse button down |
| `mouse-up.js <x> <y> [button]` | Mouse button up |

### Content extraction

| Script | Usage |
|---|---|
| `text.js` | Get `innerText` of entire page body |
| `text.js <selector>` | Get `innerText` of element |
| `text.js --backendNodeId <id>` | Get `innerText` by backend node id |
| `html.js` | Get full page `outerHTML` |
| `html.js <selector>` | Get `outerHTML` of element |
| `ax-tree.js` | Dump full accessibility tree |
| `screenshot.js <path>` | Save screenshot to file |

### Bookmarks

| Script | Usage |
|---|---|
| `bookmarks.js` | Flat list of bookmarks `[{title, url, path}]` |
| `bookmarks.js --all` | Full bookmarks tree |

### Utilities

| Script | Usage |
|---|---|
| `health.js` | Print server/extension health status |
| `prepare.js` | Ensure extension is connected (auto-wakes Chrome) |

## Typical workflow

1. Run `prepare.js` to ensure connectivity.
2. Use `navigate.js` or `new-tab.js` to go to the target page.
3. Read page content with `text.js`, `html.js`, or `ax-tree.js`.
4. Interact using `click.js`, `type.js`, `key-press.js` as needed.
5. Extract results with `text.js` or `screenshot.js`.

## Custom .mjs scripts

When writing one-off helper scripts with `import { cdp } from '../lib/bridge.js'`:
- **Place them in the scripts directory**: `C:\Users\User\Desktop\260207 BrowserAdaptor\browser-adaptor\cli\scripts\`
- Do NOT place them on the Desktop or elsewhere — ESM relative imports (`../lib/bridge.js`) require the script to be inside the `cli/scripts/` folder. Absolute `C:/...` import paths fail with `ERR_UNSUPPORTED_ESM_URL_SCHEME`.
- Run with: `node "C:\Users\User\Desktop\260207 BrowserAdaptor\browser-adaptor\cli\scripts\yourscript.mjs"`

## React Select dropdowns

React Select renders a hidden `input[role="combobox"]` that is only ~4px wide — clicking it via CDP coordinates or `--selector` does nothing visible.

**Pattern to interact with React Select:**
1. Use `Runtime.evaluate` with `document.createTreeWalker` to find the visible wrapper `div` whose `textContent` contains `"Select or type to search..."` and has `getBoundingClientRect().width > 50`.
2. Get the `x`/`y` coordinates from `getBoundingClientRect()`.
3. Click those coordinates with `click.js <x> <y>`.
4. Type the search term with `type.js "term"`.
5. The dropdown option appears — click its coordinates.

See `cf_find_select_dropdown.mjs` and `cf_get_new_domain_coords.mjs` for reference implementations.

## SPA tab switching

Clicking `[role="tab"]` elements via CDP mouse events (coordinate or selector click) often has no effect on React SPAs.

**Fix:** Use `Runtime.evaluate` to call `.click()` directly on the element:
```js
const tab = [...document.querySelectorAll('[role="tab"]')].find(t => t.textContent.includes('Tab Name'));
tab.click();
```

## Troubleshooting

If scripts fail with "No extension connected":
1. Run `prepare.js` again.
2. If still failing, manually open/switch a tab in Chrome to wake the extension service worker.
3. Check that the server is running (`health.js` should return `{ok: true, connected: true}`).

If focus lands on the wrong field when typing:
- Use `getBoundingClientRect()` via `Runtime.evaluate` to get exact coordinates of the intended element.
- Click those specific coordinates before typing to ensure correct focus.
- Press `Escape` first if a dropdown is unexpectedly open.
