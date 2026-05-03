# Last Tab Highlighter

A minimal Chrome extension (Manifest V3) that auto-groups your most recently visited tab into a yellow tab group, so you never lose your place when you wander.

## How it works

When you switch tabs, the tab you just left is automatically placed into a yellow tab group named "Last". Any tab previously in that group is removed, so the yellow group always contains exactly the one tab you most recently came from.

## Install (developer mode)

1. Clone this repo (or download as ZIP and extract).
2. Open `chrome://extensions` in Chrome.
3. Toggle on **Developer mode** (top right).
4. Click **Load unpacked** and select the `last-tab-highlighter-ext` folder.

## Permissions

- `tabs` — detect tab switches and read tab metadata.
- `tabGroups` — recolor and rename the highlight group.
- `storage` — remember the previously-active tab across service-worker restarts (uses `chrome.storage.session`, wiped on browser close).

## License

MIT.
