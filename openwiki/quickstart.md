---
type: guide
title: Last Tab Highlighter quickstart
description: Locate extension behavior, installation steps, and focused verification paths.
tags: [repository, development]
verified:
  - by: openwiki/0.7.0
    at: 2026-10-05T03:53:51.432Z
sources:
  - id: openwiki-source-f22365b596e25ba4bf7c6003
    resource: repo://background.js
  - id: openwiki-source-83fc474ee5065f9798ab3539
    resource: repo://deploy-lth.ps1
  - id: openwiki-source-b25e71362ad2d0521bb4e04c
    resource: repo://manifest.json
  - id: openwiki-source-dda1dc9054b73bb09bf02f85
    resource: repo://popup.js
  - id: openwiki-source-23775c3de52f3ab95a13cb8b
    resource: repo://README.md
generated: { by: "codex", at: "2026-10-05T03:53:51.432Z" }
---

# Last Tab Highlighter quickstart

Last Tab Highlighter is a Manifest V3 Chrome extension. It marks the most recently left injectable tab by prefixing its title with `◀ HERE `. It uses no framework or build step.

## Install and work

Load the repository folder through **chrome://extensions → Developer mode → Load unpacked**. Reload the extension card after source changes. The Windows `deploy-lth.ps1` helper pulls with `git pull --rebase` and opens the extension page; the final reload is manual. Its local path and extension ID are installation-specific.

| Task | Source |
|---|---|
| Change tab/window switching and cleanup | `background.js` |
| Change the prefix or dynamic-title behavior | `content.js` |
| Change the clear action and its feedback | `popup.html`, `popup.css`, `popup.js` |
| Change version, permissions, or worker entry point | `manifest.json` |
| Change Windows pull/reload assistance | `deploy-lth.ps1` |

Read [marker lifecycle](architecture/marker-lifecycle.md) before changing event handling or persistence.

## Suggested smoke checks

Start on A, switch to B, then C: A should first be marked, then B; C is active and should not be marked. Return to a marked tab, use the popup Clear marker button, close a marked tab, switch windows quickly, and navigate a marked background tab. Also exercise a page that changes its title and a protected browser page. The README's A→B→C sentence names C as marked, but the implementation marks the leaving tab B.

The injection guard permits HTTP, HTTPS, and file URLs but excludes Chrome Web Store URLs. Injection can still fail because browser permission and page restrictions apply. The repository contains no automated test runner; these are recommended checks, not a claim that a browser smoke test has run.
