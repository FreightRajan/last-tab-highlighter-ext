# Last Tab Highlighter (Chrome Extension)

A Chrome extension that auto-groups your most recently visited tab into a yellow tab group — so when you're 40 tabs deep, the tab you just left is visibly highlighted in the tab strip.

Unlike a Tampermonkey script (which can only modify the favicon and title), this uses Chrome's `tabGroups` API to color the actual tab background.

## How it works

When you switch from tab A → tab B, tab A gets put into a one-tab yellow group titled `◀ HERE`. Switch to tab C and now B becomes the yellow one. Only one tab is ever marked. Click the extension's toolbar icon to clear all markers.

## Install

1. Clone this repo (don't download as ZIP — the deploy script needs git):
```
   git clone https://github.com/FreightRajan/last-tab-highlighter-ext.git
```
2. Open `chrome://extensions`
3. Toggle **Developer mode** on (top right)
4. Click **Load unpacked**
5. Select the cloned folder
6. Done — switch tabs and watch the previous one go yellow

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

## Configuration

Edit the CONFIG block at the top of `background.js`:

| Option | Default | Notes |
|---|---|---|
| `GROUP_COLOR` | `'yellow'` | Chrome only allows: `grey`, `blue`, `red`, `yellow`, `green`, `pink`, `purple`, `cyan`, `orange`. |
| `GROUP_TITLE` | `'◀ HERE'` | The label shown on the group's colored pill. Set to `''` to hide. |

## Permissions

- `tabs` — detect tab activation events
- `tabGroups` — create and color the marker group
- `storage` — persist state across MV3 service worker sleeps

No network access, no data collection, no content scripts.

## Changelog

- **1.1.0** — persist state in `chrome.storage.session` (fixes "highlight disappears after opening a new tab"). Added Windows deploy script.
- **1.0.0** — initial release.

## License

MIT
