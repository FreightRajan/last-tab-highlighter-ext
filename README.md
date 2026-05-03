# Last Tab Highlighter (Chrome Extension)

A Chrome extension that auto-groups your most recently visited tab into a colored tab group — so when you're 40 tabs deep, the tab you just left is visibly highlighted in the tab strip.

Unlike a Tampermonkey script (which can only modify the favicon and title), this uses Chrome's `tabGroups` API to color the actual tab background.

## How it works

When you switch from tab A → tab B, tab A gets put into a one-tab colored group titled `◀ HERE`. Switch to tab C and now B becomes the colored one. Only one tab is ever marked.

Click the toolbar icon to open the popup, where you can change the color, switch on RGB mode, or clear all highlights.

## Install

1. Clone this repo (don't download as ZIP — the deploy script needs git):
```
   git clone https://github.com/FreightRajan/last-tab-highlighter-ext.git
```
2. Open `chrome://extensions`
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked**
5. Select the cloned folder
6. Done — switch tabs and watch the previous one turn yellow (or whatever color you pick)

## Picking a color

Click the extension's toolbar icon to open the popup:

- **Pick a color** — choose any of Chrome's nine supported tab-group colors: grey, blue, red, yellow, green, pink, purple, cyan, orange.
- **RGB mode** — each tab switch picks the next color in a rainbow cycle (red → orange → yellow → green → cyan → blue → purple → pink → repeat).
- **Clear all highlights** — wipe the marker group; the next tab switch starts fresh.

Settings save automatically and sync across your Chrome installs via `chrome.storage.sync`.

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

Most settings are now in the popup. The CONFIG block at the top of `background.js` still controls:

| Option | Default | Notes |
|---|---|---|
| `GROUP_TITLE` | `'◀ HERE'` | The label shown on the group's colored pill. Set to `''` to hide. |
| `RGB_CYCLE`   | `['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink']` | Order used in RGB mode. Must use Chrome's allowed names. |

## Permissions

- `tabs` — detect tab activation events
- `tabGroups` — create and color the marker group
- `storage` — persist your color preference (`storage.sync`) and the previously-active tab across service-worker restarts (`storage.session`)

No network access, no data collection, no content scripts.

## Changelog

- **1.3.0** — rock-solid tab-switch reliability. All event handlers now run through a serialized promise queue (no race conditions on rapid switches). State lives in memory with `chrome.storage.session` as a backup, so SW sleeps don't drop the marker. Marker group tracked by ID and verified before reuse. Listens for `chrome.tabGroups.onRemoved` to clean up state if you manually break the group. UI unchanged.
- **1.2.0** — added a popup with a color picker (grey/blue/red/yellow/green/pink/purple/cyan/orange) and an RGB cycle mode. Toolbar click now opens the popup; the clear-highlights action moved into a button there.
- **1.1.0** — persist state in `chrome.storage.session` (fixes "highlight disappears after opening a new tab"). Added Windows deploy script.
- **1.0.0** — initial release.

## License

MIT
