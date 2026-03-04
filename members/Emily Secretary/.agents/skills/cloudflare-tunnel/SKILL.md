---
name: cloudflare-tunnel
description: Manage Cloudflare Zero Trust tunnels and Access apps — read/add/remove published application routes (hostname → localhost:port mappings) and manage Access application domains. Uses browser-adaptor skill.
---

Manage Cloudflare Zero Trust tunnel routes and Access application domains via the browser-adaptor skill.

## Prerequisites

- browser-adaptor skill running and connected
- User logged into Cloudflare in Chrome (navigate to `https://dash.cloudflare.com` to check)

## Discovering IDs from the dashboard

Never hardcode IDs. Retrieve them fresh from the URL each session.

### Account ID

1. Navigate to `https://one.dash.cloudflare.com/`
2. If the account selector appears, click the account button (use Runtime.evaluate `.dispatchEvent(new MouseEvent('click', {bubbles:true}))`)
3. The URL becomes `https://one.dash.cloudflare.com/{accountId}/...`
4. Extract with `url.js` and parse: `new URL(location.href).pathname.split('/')[1]`

### Tunnel ID

1. Navigate to `https://one.dash.cloudflare.com/{accountId}/networks/connectors`
2. Find the tunnel row by name (e.g. "HeyaHyperW") using `text.js`
3. Click the ⋮ context menu on the row → **Configure**
4. The URL becomes `.../connectors/cloudflare-tunnels/cfd_tunnel/{tunnelId}/edit`
5. Extract tunnelId: `new URL(location.href).pathname.split('/').find((s,i,a) => a[i-1] === 'cfd_tunnel')`

### Access App IDs

1. Navigate to `https://one.dash.cloudflare.com/{accountId}/access-controls/apps`
2. Find the app row by name, click ⋮ → **Edit**
3. The URL becomes `.../access-controls/apps/self-hosted/{appId}/edit`
4. Extract appId: `new URL(location.href).pathname.split('/').find((s,i,a) => a[i-1] === 'self-hosted')`

## Key URL patterns

```
# Zero Trust home (may show account selector)
https://one.dash.cloudflare.com/

# Tunnel connectors list
https://one.dash.cloudflare.com/{accountId}/networks/connectors

# Tunnel edit page (Published application routes tab)
https://one.dash.cloudflare.com/{accountId}/networks/connectors/cloudflare-tunnels/cfd_tunnel/{tunnelId}/edit?tab=overview

# Add a new published application route
https://one.dash.cloudflare.com/{accountId}/networks/connectors/cloudflare-tunnels/{tunnelId}/public-hostname/add

# Access apps list
https://one.dash.cloudflare.com/{accountId}/access-controls/apps

# Edit an Access app
https://one.dash.cloudflare.com/{accountId}/access-controls/apps/self-hosted/{appId}/edit?tab=basic-info
```

## Workflow: Read tunnel routes

1. Run browser-adaptor `prepare.js`
2. Navigate to the tunnel edit page
3. Switch to "Published application routes" tab by calling `.click()` via Runtime.evaluate on the `[role="tab"]` button containing that text
4. Read with `text.js` or `screenshot.js`

**Tab switching — must use Runtime.evaluate `.click()`, not CDP mouse events:**
```js
const tabs = [...document.querySelectorAll('[role="tab"]')];
const tab = tabs.find(t => t.innerText.includes('Published application routes'));
tab.click();
```

## Workflow: Add a tunnel route

1. Navigate directly to the add page URL (the `<a>` "Add" button is NOT a `<button>`, navigate by href)
2. Fill **Subdomain** input (placeholder `www`) — click field, Ctrl+A, type subdomain
3. Fill **Domain** — it's a React Select component:
   - Find the visible `div` containing "Select or type to search..." text (NOT the hidden `[role="combobox"]` which is 4px wide)
   - Click it, then `type.js "rubbish"` to filter, then click the option `div`
4. Leave **Path** empty (matches all paths)
5. Click **Type** combobox (also React Select, but smaller), select `HTTP`
6. Fill **URL** input (placeholder `localhost:8080`) — click, Ctrl+A, type `localhost:PORT`
7. Click **Save** button

**React Select gotcha**: The underlying `input[role="combobox"]` is only 4px wide — do NOT click it. Instead find the visible wrapper div by its placeholder text and click that.

## Workflow: Remove a tunnel route

1. Navigate to tunnel Published application routes tab
2. Click the ⋮ menu button for the target row (`[aria-label="Context menu"]` in the row)
3. Click **Delete** from the menu (`[role="menuitem"]` or matching button)
4. Confirm in the dialog by clicking **Delete hostname**

## Workflow: Add domain to Access app

1. Navigate to the Access app edit URL
2. Scroll to **Public hostname** section
3. Click **+ Add public hostname** link
4. A new empty row appears at the bottom
5. Type subdomain into the new row's `input[placeholder="(optional) subdomain"]`
6. For the domain dropdown: get the `div` containing "Select or type to search..." — its coords via:
   ```js
   document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT)
   // find leaf node with text "Select or type to search..."
   // getBoundingClientRect() to get click coords
   ```
7. Click domain div, type to search, click option
8. Click **Save application**

## Workflow: Remove domain from Access app

1. Navigate to Access app edit URL
2. Find the subdomain input with the target value, get its bounding rect
3. Find buttons to the RIGHT of that input at the same y-coordinate (within 30px) — that's the ✕ Remove button
4. Click it
5. Click **Save application**

## Account selection

When first navigating to `one.dash.cloudflare.com`, an account selector may appear. The account button is a `<button class="account_button">`. Use Runtime.evaluate `.dispatchEvent(new MouseEvent('click', {bubbles:true, cancelable:true}))` to click it — CDP mouse events do not work here.

## Writing custom .mjs scripts

For complex interactions, write helper scripts at:
```
C:\Users\User\Desktop\260207 BrowserAdaptor\browser-adaptor\cli\scripts\<name>.mjs
```
Use relative imports: `import { cdp } from '../lib/bridge.js'`

**Do NOT** put scripts on the Desktop with absolute import paths — ESM loader on Windows rejects `C:/...` paths.

## Troubleshooting

| Issue | Solution |
|---|---|
| Account selector won't respond to clicks | Use Runtime.evaluate `.dispatchEvent(new MouseEvent('click', {bubbles:true}))` |
| Tab click doesn't switch content | Use `tab.click()` via Runtime.evaluate, not CDP mouse events |
| Domain dropdown won't open | Don't click the hidden combobox (4px wide). Find the visible wrapper div with "Select or type" text |
| "Add" button not found as `<button>` | It's an `<a>` tag — navigate to its href directly |
| Typed text goes to wrong field | Take a screenshot first to confirm focus. Session Duration dropdown may steal focus if nearby. |
| Cookie consent banner blocking | `document.querySelector('button').click()` on "Allow All" button |
