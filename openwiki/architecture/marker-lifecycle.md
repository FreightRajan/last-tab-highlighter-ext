---
type: guide
title: Marker lifecycle and constraints
description: Explain serialized tab events, worker persistence, injection, and title restoration.
tags: [repository, development]
verified:
  - by: openwiki/0.7.0
    at: 2026-10-05T03:53:51.432Z
sources:
  - id: openwiki-source-f22365b596e25ba4bf7c6003
    resource: repo://background.js
  - id: openwiki-source-33784e8411f34531e1834579
    resource: repo://content.js
generated: { by: "codex", at: "2026-10-05T03:53:51.432Z" }
---

# Marker lifecycle and constraints

## Worker state and ordering

`background.js` owns `currentTabId`, `currentWindowId`, and `markedTabId` in `memState`. It loads and saves that object under `lth_state_v2` in `chrome.storage.session`. A promise chain (`handlerQueue`/`enqueue`) serializes tab, window, navigation, clear, install, and startup work so asynchronous handlers do not mutate marker state concurrently.

`handleTabSwitch` saves the new active tab, removes the previous marker, and attempts to mark the tab being left. Only a successful injection becomes `markedTabId`. The tab that is active is not the target of the new marker.

Tab activation and window focus events use the same switch path. Closing a tracked tab clears its ID; completion of navigation in a marked background tab re-injects the content script. Popup clear stops the marker and resets `markedTabId`. Installation initializes from the currently active tab; browser startup resets the state without querying an initial active tab in that handler.

## Content marker

`startMarker` injects `content.js`; `stopMarker` calls `window.__lthMarker.stop()` in the target tab. The content script is idempotent: reinjection reuses the existing marker object. While active, it keeps a static prefix on `document.title` and watches an existing `<title>` element with `MutationObserver`, rather than a polling timer.

The script snapshots the base title when a marker starts. Stop disconnects the observer and restores that snapshot. If the site updates its title while marked, stopping restores the earlier snapshot rather than preserving the most recent site title. Also, no observer is installed if there is no `<title>` element at start. These details matter when working on dynamic-title behavior.

`PREFIX` and `PREFIX_REGEX` are coupled: changing the visible prefix requires updating stripping behavior too. The observer only watches the title element found when starting; do not assume it follows a replacement title node.

## Safe extension points

Preserve the serialized queue and session state contract when adding event listeners. Keep non-injectable pages and failed `chrome.scripting.executeScript` calls nonfatal. Test duplicate injections and stop/start cycles to avoid stacked prefixes or orphaned observers. No favicon or tab-group mutation occurs in the current marker implementation.

Return to [quickstart](../quickstart.md) for installation and the focused manual check sequence.
