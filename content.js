(function () {
    // Idempotent: subsequent injections just refresh the existing strobe state.
    if (window.__lthStrobe) {
        try { window.__lthStrobe.refresh(); } catch (e) { /* ignore */ }
        return;
    }

    // ===== CONFIG =====
    const STROBE_COLORS = [
        { hex: '#ff3838', emoji: '\u{1F534}' }, // red
        { hex: '#ff9500', emoji: '\u{1F7E0}' }, // orange
        { hex: '#ffd000', emoji: '\u{1F7E1}' }, // yellow
        { hex: '#3acb3a', emoji: '\u{1F7E2}' }, // green
        { hex: '#3b8aff', emoji: '\u{1F535}' }, // blue
        { hex: '#a55cff', emoji: '\u{1F7E3}' }, // purple
    ];
    const STROBE_INTERVAL_MS = 700;
    const SMOOTH_INTERVAL_MS = 50;
    const SMOOTH_HUE_STEP    = 5; // degrees per tick → 360° / 5 / 20fps = 3.6s per full rotation
    const SMOOTH_TITLE_PREFIX = '◀'; // ◀
    const PREFIX_REGEX = /^[\u{1F534}\u{1F7E0}\u{1F7E1}\u{1F7E2}\u{1F535}\u{1F7E3}◀]\s*/u;
    // ==================

    let mode          = null;
    let intervalId    = null;
    let originalTitle = null;
    let originalIcons = null;
    let cycleIdx      = 0;
    let hueDeg        = 0;

    function makeCircleIcon(fillStyle) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 32, 32);
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, 2 * Math.PI);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        return canvas.toDataURL('image/png');
    }

    function snapshotIfNeeded() {
        if (originalTitle === null) {
            originalTitle = (document.title || '').replace(PREFIX_REGEX, '');
        }
        if (originalIcons === null) {
            const links = document.querySelectorAll('link[rel*="icon"]');
            originalIcons = Array.from(links).map((l) => ({
                rel:   l.getAttribute('rel'),
                href:  l.getAttribute('href'),
                type:  l.getAttribute('type'),
                sizes: l.getAttribute('sizes'),
            }));
        }
    }

    function setIcon(dataUrl) {
        document.querySelectorAll('link[rel*="icon"]').forEach((l) => l.remove());
        const link = document.createElement('link');
        link.rel  = 'icon';
        link.type = 'image/png';
        link.href = dataUrl;
        link.dataset.lth = '1';
        document.head.appendChild(link);
    }

    function setTitleWithPrefix(prefix) {
        const baseTitle = (document.title || '').replace(PREFIX_REGEX, '');
        document.title  = prefix + ' ' + baseTitle;
    }

    function tickStrobe() {
        const c = STROBE_COLORS[cycleIdx % STROBE_COLORS.length];
        cycleIdx++;
        try {
            setIcon(makeCircleIcon(c.hex));
            setTitleWithPrefix(c.emoji);
        } catch (e) { console.warn('[LTH content] strobe tick failed', e); }
    }

    function tickSmooth() {
        try {
            setIcon(makeCircleIcon('hsl(' + hueDeg + ', 100%, 50%)'));
            setTitleWithPrefix(SMOOTH_TITLE_PREFIX);
            hueDeg = (hueDeg + SMOOTH_HUE_STEP) % 360;
        } catch (e) { console.warn('[LTH content] smooth tick failed', e); }
    }

    function start() {
        if (intervalId !== null) return;
        if (mode !== 'strobe' && mode !== 'smooth') return;
        snapshotIfNeeded();
        if (mode === 'smooth') {
            tickSmooth();
            intervalId = setInterval(tickSmooth, SMOOTH_INTERVAL_MS);
        } else {
            tickStrobe();
            intervalId = setInterval(tickStrobe, STROBE_INTERVAL_MS);
        }
    }

    function stop() {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (originalTitle !== null) {
            document.title = originalTitle;
            originalTitle = null;
        }
        document.querySelectorAll('link[data-lth="1"]').forEach((l) => l.remove());
        if (originalIcons !== null) {
            originalIcons.forEach((orig) => {
                const link = document.createElement('link');
                if (orig.rel)   link.setAttribute('rel',   orig.rel);
                if (orig.type)  link.setAttribute('type',  orig.type);
                if (orig.sizes) link.setAttribute('sizes', orig.sizes);
                if (orig.href)  link.setAttribute('href',  orig.href);
                document.head.appendChild(link);
            });
            originalIcons = null;
        }
        cycleIdx = 0;
        hueDeg   = 0;
    }

    async function readMode() {
        try {
            const s = await chrome.storage.sync.get({ effectMode: 'strobe' });
            return s.effectMode;
        } catch (e) {
            return 'strobe';
        }
    }

    async function refresh() {
        const newMode = await readMode();
        if (newMode === mode && (mode === 'off' || intervalId !== null)) return;
        if (intervalId !== null) stop();
        mode = newMode;
        if (mode !== 'off') start();
    }

    chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        if ('effectMode' in changes) refresh();
    });

    window.__lthStrobe = { start, stop, refresh };
    refresh();
})();
