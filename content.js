(function () {
    // Idempotent: subsequent injections just (re)start the existing marker.
    if (window.__lthMarker) {
        try { window.__lthMarker.start(); } catch (e) { /* ignore */ }
        return;
    }

    // ===== CONFIG =====
    const PREFIX = '◀ HERE ';            // ◀ HERE
    const PREFIX_REGEX = /^◀\s*HERE\s+/; // matches our prefix at start of title
    // ==================

    let originalTitle = null;
    let titleObserver = null;
    let active        = false;

    function baseTitle() {
        return (document.title || '').replace(PREFIX_REGEX, '');
    }

    function applyPrefix() {
        if (!active) return;
        const desired = PREFIX + baseTitle();
        if (document.title !== desired) {
            document.title = desired;
        }
    }

    function start() {
        if (active) return;
        active = true;
        if (originalTitle === null) originalTitle = baseTitle();
        applyPrefix();

        // Pages like Gmail rewrite their own title constantly; observer
        // reasserts our prefix without needing a polling timer.
        const titleEl = document.querySelector('title');
        if (titleEl && titleObserver === null) {
            titleObserver = new MutationObserver(() => applyPrefix());
            titleObserver.observe(titleEl, {
                childList:     true,
                characterData: true,
                subtree:       true,
            });
        }
    }

    function stop() {
        active = false;
        if (titleObserver !== null) {
            titleObserver.disconnect();
            titleObserver = null;
        }
        if (originalTitle !== null) {
            document.title = originalTitle;
            originalTitle = null;
        }
    }

    window.__lthMarker = { start, stop };
    start();
})();
