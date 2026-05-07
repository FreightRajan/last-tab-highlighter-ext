// ===== CONFIG =====
const STATE_KEY    = 'lth_state_v2';
const SETTINGS_KEY = 'effectMode';
const DEFAULT_MODE = 'strobe';
// ==================

// In-memory state (source of truth while service worker is alive).
// Persisted to chrome.storage.session on every change so it survives SW sleeps.
let memState = {
    currentTabId:    null,
    currentWindowId: null,
    strobingTabId:   null,
};
let stateLoaded = false;

// === Serialized handler queue ===
let handlerQueue = Promise.resolve();
function enqueue(fn) {
    handlerQueue = handlerQueue.then(fn).catch(e => console.error('[LTH]', e));
    return handlerQueue;
}

// === State persistence ===
async function loadState() {
    if (stateLoaded) return memState;
    try {
        const data = await chrome.storage.session.get(STATE_KEY);
        if (data[STATE_KEY]) memState = { ...memState, ...data[STATE_KEY] };
    } catch (e) { /* ignore */ }
    stateLoaded = true;
    return memState;
}

async function saveState() {
    try { await chrome.storage.session.set({ [STATE_KEY]: memState }); }
    catch (e) { /* ignore */ }
}

async function getMode() {
    try {
        const s = await chrome.storage.sync.get({ [SETTINGS_KEY]: DEFAULT_MODE });
        return s[SETTINGS_KEY];
    } catch (e) { return DEFAULT_MODE; }
}

// === Injection guards ===
function canInject(url) {
    if (!url) return false;
    if (!/^(https?|file):/i.test(url)) return false;
    if (/^https?:\/\/chrome\.google\.com\/webstore/i.test(url)) return false;
    if (/^https?:\/\/chromewebstore\.google\.com/i.test(url)) return false;
    return true;
}

async function getTabSafe(tabId) {
    try { return await chrome.tabs.get(tabId); }
    catch (e) { return null; }
}

// === Strobe control ===
async function startStrobe(tabId) {
    const mode = await getMode();
    if (mode === 'off') return false;
    const tab = await getTabSafe(tabId);
    if (!tab || !canInject(tab.url)) return false;
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            files:  ['content.js'],
        });
        return true;
    } catch (e) {
        console.warn('[LTH] start inject failed for', tabId, e && e.message);
        return false;
    }
}

async function stopStrobe(tabId) {
    const tab = await getTabSafe(tabId);
    if (!tab || !canInject(tab.url)) return;
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func:   () => { if (window.__lthStrobe) window.__lthStrobe.stop(); },
        });
    } catch (e) {
        console.warn('[LTH] stop inject failed for', tabId, e && e.message);
    }
}

// === Core handler ===
async function handleTabSwitch(newActiveTabId, newWindowId) {
    await loadState();
    const leavingTabId  = memState.currentTabId;
    const wasStrobingId = memState.strobingTabId;

    memState.currentTabId    = newActiveTabId;
    memState.currentWindowId = newWindowId;
    await saveState();

    if (wasStrobingId != null && wasStrobingId === newActiveTabId) {
        await stopStrobe(wasStrobingId);
        memState.strobingTabId = null;
        await saveState();
    }

    if (memState.strobingTabId != null && memState.strobingTabId !== newActiveTabId) {
        await stopStrobe(memState.strobingTabId);
        memState.strobingTabId = null;
        await saveState();
    }

    if (leavingTabId != null && leavingTabId !== newActiveTabId) {
        const ok = await startStrobe(leavingTabId);
        memState.strobingTabId = ok ? leavingTabId : null;
        await saveState();
    }
}

// === Event listeners (all serialized) ===
chrome.tabs.onActivated.addListener((activeInfo) => {
    enqueue(() => handleTabSwitch(activeInfo.tabId, activeInfo.windowId));
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    enqueue(async () => {
        const [activeTab] = await chrome.tabs.query({ active: true, windowId });
        if (activeTab) await handleTabSwitch(activeTab.id, windowId);
    });
});

chrome.tabs.onRemoved.addListener((tabId) => {
    enqueue(async () => {
        await loadState();
        let changed = false;
        if (memState.currentTabId === tabId) {
            memState.currentTabId = null;
            changed = true;
        }
        if (memState.strobingTabId === tabId) {
            memState.strobingTabId = null;
            changed = true;
        }
        if (changed) await saveState();
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status !== 'complete') return;
    enqueue(async () => {
        await loadState();
        if (memState.strobingTabId !== tabId) return;
        if (memState.currentTabId === tabId) return;
        const ok = await startStrobe(tabId);
        if (!ok) {
            memState.strobingTabId = null;
            await saveState();
        }
    });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === 'clear') {
        enqueue(async () => {
            await loadState();
            if (memState.strobingTabId != null) {
                await stopStrobe(memState.strobingTabId);
                memState.strobingTabId = null;
                await saveState();
            }
            sendResponse({ ok: true });
        });
        return true;
    }
});

// When mode is set to 'off', stop any in-flight strobe immediately.
// Mode change between 'strobe' and 'smooth' is handled by content.js's own
// storage listener — no background action needed there.
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (!(SETTINGS_KEY in changes)) return;
    const newMode = changes[SETTINGS_KEY].newValue;
    if (newMode !== 'off') return;
    enqueue(async () => {
        await loadState();
        if (memState.strobingTabId != null) {
            await stopStrobe(memState.strobingTabId);
            memState.strobingTabId = null;
            await saveState();
        }
    });
});

chrome.runtime.onInstalled.addListener(() => {
    enqueue(async () => {
        memState = {
            currentTabId:    null,
            currentWindowId: null,
            strobingTabId:   null,
        };
        stateLoaded = true;
        const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (activeTab) {
            memState.currentTabId    = activeTab.id;
            memState.currentWindowId = activeTab.windowId;
        }
        await saveState();
    });
});

chrome.runtime.onStartup.addListener(() => {
    enqueue(async () => {
        memState = {
            currentTabId:    null,
            currentWindowId: null,
            strobingTabId:   null,
        };
        stateLoaded = true;
        await saveState();
    });
});
