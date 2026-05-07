// ===== CONFIG =====
const STATE_KEY = 'lth_state_v2';
// ==================

// In-memory state (source of truth while service worker is alive).
// Persisted to chrome.storage.session on every change so it survives SW sleeps.
let memState = {
    currentTabId:    null,
    currentWindowId: null,
    markedTabId:     null,
};
let stateLoaded = false;

// === Serialized handler queue ===
// All event handlers run through this chain. Guarantees: no two handlers
// touch tabs/scripts at the same time. Eliminates race conditions on
// rapid tab switches.
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

// === Marker control ===
async function startMarker(tabId) {
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

async function stopMarker(tabId) {
    const tab = await getTabSafe(tabId);
    if (!tab || !canInject(tab.url)) return;
    try {
        await chrome.scripting.executeScript({
            target: { tabId },
            func:   () => { if (window.__lthMarker) window.__lthMarker.stop(); },
        });
    } catch (e) {
        console.warn('[LTH] stop inject failed for', tabId, e && e.message);
    }
}

// === Core handler ===
async function handleTabSwitch(newActiveTabId, newWindowId) {
    await loadState();
    const leavingTabId = memState.currentTabId;
    const wasMarkedId  = memState.markedTabId;

    memState.currentTabId    = newActiveTabId;
    memState.currentWindowId = newWindowId;
    await saveState();

    // If user returned to the marked tab, clear it
    if (wasMarkedId != null && wasMarkedId === newActiveTabId) {
        await stopMarker(wasMarkedId);
        memState.markedTabId = null;
        await saveState();
    }

    // Only one tab marked at a time — clear any other lingering marker
    if (memState.markedTabId != null && memState.markedTabId !== newActiveTabId) {
        await stopMarker(memState.markedTabId);
        memState.markedTabId = null;
        await saveState();
    }

    // Mark the tab we just left
    if (leavingTabId != null && leavingTabId !== newActiveTabId) {
        const ok = await startMarker(leavingTabId);
        memState.markedTabId = ok ? leavingTabId : null;
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
        if (memState.markedTabId === tabId) {
            memState.markedTabId = null;
            changed = true;
        }
        if (changed) await saveState();
    });
});

// Re-inject if the marked tab navigates (its previous content-script context is gone).
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status !== 'complete') return;
    enqueue(async () => {
        await loadState();
        if (memState.markedTabId !== tabId) return;
        if (memState.currentTabId === tabId) return;
        const ok = await startMarker(tabId);
        if (!ok) {
            memState.markedTabId = null;
            await saveState();
        }
    });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === 'clear') {
        enqueue(async () => {
            await loadState();
            if (memState.markedTabId != null) {
                await stopMarker(memState.markedTabId);
                memState.markedTabId = null;
                await saveState();
            }
            sendResponse({ ok: true });
        });
        return true;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    enqueue(async () => {
        memState = {
            currentTabId:    null,
            currentWindowId: null,
            markedTabId:     null,
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
            markedTabId:     null,
        };
        stateLoaded = true;
        await saveState();
    });
});
