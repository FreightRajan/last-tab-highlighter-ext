# Last Tab Highlighter (Chrome Extension)

Marks the tab you just left with a `◀ HERE` prefix in its title, so when you're 40 tabs deep you can find your way back. Return to the tab and the prefix is removed.

No favicon changes. No tab groups. Just the page's own title.

## How it works

When you switch from tab A → tab B, the extension injects `content.js` into tab A. That script prepends `◀ HERE ` to `document.title` and installs a `MutationObserver` so the prefix stays put even on sites that constantly rewrite their own title (Gmail unread counts, Slack, Discord, etc.). When you return to tab A, the observer is disconnected and the original title is restored.

Only the most recent "leaving" tab is marked — switching A → B → C means C is marked (and B's marker is cleared, since you've passed it).

## Install

1. Clone this repo (don't download as ZIP — the deploy script needs git):
```
   git clone https://github.com/FreightRajan/last-tab-highlighter-ext.git
```
2. Open `chrome://extensions`
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked**
5. Select the cloned folder
6. Switch tabs and watch the previous tab's title pick up a `◀ HERE` prefix

## Clearing the marker

Three ways:
- Switch back to the marked tab — the prefix is removed automatically.
- Click the extension's toolbar icon and press **Clear marker** in the popup.
- Close the marked tab.

## What pages don't get marked?

The extension can't inject scripts into Chrome's protected pages, so those are silently skipped:
- `chrome://`, `chrome-extension://`, `edge://`, `about:`, etc.
- The Chrome Web Store (`chrome.google.com/webstore`, `chromewebstore.google.com`)

Switching away from any other tab — http(s), local files — works as expected.

## One-click deploy on Windows

After a change is pushed to GitHub, pull + reload in one move with the included PowerShell script.

**One-time setup:**

1. Repo must be cloned with `git clone` (not downloaded as ZIP).
2. Confirm `$RepoPath` and `$ExtensionId` at the top of `deploy-lth.ps1` match your install. Find the extension ID at `chrome://extensions` (toggle Developer mode if hidden).
3. Create a desktop shortcut:
   - Right-click desktop → **New** → **Shortcut**
   - Location: `powershell.exe -ExecutionPolicy Bypass -File "C:\Users\nijil\Downloads\last-tab-highlighter-ext-main\deploy-lth.ps1"`
   - Name it "Deploy LTH"

**Daily use:** double-click the shortcut. It pulls the latest from GitHub and opens the Chrome extension page. Click the circular reload arrow on the extension card.

> **Why one click and not zero?** Chrome blocks scripts from programmatically reloading unpacked extensions. That click is a security boundary.

## Configuration (advanced)

Tweak the constant at the top of `content.js`:

| Option | Default | Notes |
|---|---|---|
| `PREFIX` | `'◀ HERE '` | The string prepended to the title. The trailing space separates it from the page's own title. |

## Permissions

- `scripting` — inject `content.js` into the leaving tab
- `storage` — track which tab is "previous" across service-worker restarts (`storage.session`)
- `<all_urls>` host permission — required so injection works on every site you visit

No network access, no data collection, no favicon manipulation.

## Changelog

- **2.1.0** — removed all favicon manipulation and color cycling. The marker is now a static `◀ HERE` prefix on the leaving tab's title — same look as the v1.x tab-group title, but applied to the page's own title instead of a tab group. Added a `MutationObserver` to keep the prefix sticky on sites that rewrite their own title.
- **2.0.0** — complete rewrite. Removed tab groups; the previous tab is now highlighted by strobing its own favicon and title through cycling RGB colors. Uses `chrome.scripting.executeScript()` and a content script that snapshots the original favicon/title on start and restores them on stop. Removed `tabGroups` permission, added `scripting` and `<all_urls>`.
- **1.3.0** — rock-solid tab-switch reliability. All event handlers now run through a serialized promise queue (no race conditions on rapid switches). State lives in memory with `chrome.storage.session` as a backup, so SW sleeps don't drop the marker. Marker group tracked by ID and verified before reuse. Listens for `chrome.tabGroups.onRemoved` to clean up state if you manually break the group. UI unchanged.
- **1.2.0** — added a popup with a color picker (grey/blue/red/yellow/green/pink/purple/cyan/orange) and an RGB cycle mode. Toolbar click now opens the popup; the clear-highlights action moved into a button there.
- **1.1.0** — persist state in `chrome.storage.session` (fixes "highlight disappears after opening a new tab"). Added Windows deploy script.
- **1.0.0** — initial release.

## License

MIT
