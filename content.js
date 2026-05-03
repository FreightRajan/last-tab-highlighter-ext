(function () {
    // Idempotent: subsequent injections just (re)start the existing strobe.
    if (window.__lthStrobe) {
        try { window.__lthStrobe.start(); } catch (e) { /* ignore */ }
        return;
    }

    const COLORS = [
        { hex: '#ff3838', emoji: '\u{1F534}' }, // red
        { hex: '#ff9500', emoji: '\u{1F7E0}' }, // orange
        { hex: '#ffd000', emoji: '\u{1F7E1}' }, // yellow
        { hex: '#3acb3a', emoji: '\u{1F7E2}' }, // green
        { hex: '#3b8aff', emoji: '\u{1F535}' }, // blue
        { hex: '#a55cff', emoji: '\u{1F7E3}' }, // purple
    ];
    const INTERVAL_MS = 700;
    const PREFIX_REGEX = /^[\u{1F534}\u{1F7E0}\u{1F7E1}\u{1F7E2}\u{1F535}\u{1F7E3}]\s*/u;

    let intervalId    = null;
    let originalTitle = null;
    let originalIcons = null;
    let cycleIdx      = 0;

    function makeIconDataUrl(hex) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 32, 32);
        ctx.beginPath();
        ctx.arc(16, 16, 14, 0, 2 * Math.PI);
        ctx.fillStyle = hex;
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

    function setTitleWithPrefix(emoji) {
        const baseTitle = (document.title || '').replace(PREFIX_REGEX, '');
        document.title  = emoji + ' ' + baseTitle;
    }

    function tick() {
        const c = COLORS[cycleIdx % COLORS.length];
        cycleIdx++;
        try {
            setIcon(makeIconDataUrl(c.hex));
            setTitleWithPrefix(c.emoji);
        } catch (e) {
            console.warn('[LTH content] tick failed', e);
        }
    }

    function start() {
        if (intervalId !== null) return;
        snapshotIfNeeded();
        tick();
        intervalId = setInterval(tick, INTERVAL_MS);
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
    }

    window.__lthStrobe = { start, stop };
    start();
})();
