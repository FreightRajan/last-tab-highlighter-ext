// ===== CONFIG =====
const GROUP_TITLE      = '◀ HERE';
const STATE_KEY        = 'lth_state_v3';
const RGB_CYCLE        = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'];
const DEFAULT_SETTINGS = { colorMode: 'fixed', fixedColor: 'yellow' };
// ==================

// In-memory state (source of truth while service worker is alive).
// Persisted to chrome.storage.session on every change so it survives SW sleeps.
let memState = {
    currentTabId:    null,
    currentWindowId: null,
    markedTabId:     null,
    markedGroupId:   null,
    rgbIndex:        0,
};
let stateLoaded = false;

// === Serialized handler queue ===
// All event handlers run through this chain. Guarantees: no two handlers
// touch tab groups at the same time. Eliminates the race conditions where
// rapid tab switches would leave stale or missing markers.
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

async function getSettings() {
    return await chrome.storage.sync.get(DEFAULT_SETTINGS);
}

// === Color selection ===
async function pickAndAdvanceColor() {
    const settings = await getSettings();
    if (settings.colorMode !== 'rgb') {
        return settings.fixedColor || 'yellow';
    }
    const idx   = (memState.rgbIndex || 0) % RGB_CYCLE.length;
    const color = RGB_CYCLE[idx];
    memState.rgbIndex = (idx + 1) % RGB_CYCLE.length;
    await saveState();
    return color;
}

// === Group helpers ===
async function groupExists(groupId) {
    if (groupId == null) return false;
    try {
        await chrome.tabGroups.get(groupId);
        return true;
    } catch (e) {
        return false;
    }
}

async function ungroupTab(tabId) {
    if (tabId == null) return;
    try { await chrome.tabs.ungroup(tabId); }
    catch (e) { /* not in a group, or tab is gone — fine */ }
}

async function clearAllMarkers() {
    // Clear our tracked group first (fast path)
    if (memState.markedGroupId != null && await groupExists(memState.markedGroupId)) {
        try {
            const tabs = await chrome.tabs.query({ groupId: memState.markedGroupId });
            for (const t of tabs) await ungroupTab(t.id);
        } catch (e) { /* ignore */ }
    }
    // Belt-and-suspenders: also sweep any other groups with our title
    // (handles state migrations, leftover groups from previous versions, etc.)
    try {
        const groups = await chrome.tabGroups.query({ title: GROUP_TITLE });
        for (const g of groups) {
            const tabs = await chrome.tabs.query({ groupId: g.id });
            for (const t of tabs) await ungroupTab(t.id);
        }
    } catch (e) { /* ignore */ }

    memState.markedTabId   = null;
    memState.markedGroupId = null;
    await saveState();
}

async function markTab(tabId) {
    if (tabId == null) return;
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab) return;

        // Always start clean — guarantees only one marker exists at a time
        await clearAllMarkers();

        const color   = await pickAndAdvanceColor();
        const groupId = await chrome.tabs.group({
            tabIds: [tabId],
            createProperties: { windowId: tab.windowId }
        });
        await chrome.tabGroups.update(groupId, {
            color,
            title: GROUP_TITLE,
            collapsed: false
        });

        memState.markedTabId   = tabId;
        memState.markedGroupId = groupId;
        await saveState();
    } catch (e) {
        console.error('[LTH] markTab failed for', tabId, e);
        // Recovery: nuke everything so we don't get stuck
        await clearAllMarkers();
    }
}

// === Core handler ===
async function handleTabSwitch(newActiveTabId, newWindowId) {
    await loadState();
    const leavingTabId = memState.currentTabId;

    // Update "current" first — if SW dies mid-handler, next event has correct baseline
    memState.currentTabId    = newActiveTabId;
    memState.currentWindowId = newWindowId;
    await saveState();

    // Make sure the tab we just entered isn't wearing the marker
    if (memState.markedTabId === newActiveTabId) {
        await ungroupTab(newActiveTabId);
        memState.markedTabId   = null;
        memState.markedGroupId = null;
        await saveState();
    }

    // Mark the tab we just left
    if (leavingTabId != null && leavingTabId !== newActiveTabId) {
        await markTab(leavingTabId);
    }
}

// === Recolor existing markers when settings change ===
async function recolorExistingMarker() {
    const settings = await getSettings();
    if (settings.colorMode !== 'fixed') return;
    const color = settings.fixedColor || 'yellow';
    if (memState.markedGroupId != null && await groupExists(memState.markedGroupId)) {
        try { await chrome.tabGroups.update(memState.markedGroupId, { color }); }
        catch (e) { /* ignore */ }
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
            memState.markedTabId   = null;
            memState.markedGroupId = null;
            changed = true;
        }
        if (changed) await saveState();
    });
});

chrome.tabGroups.onRemoved.addListener((group) => {
    enqueue(async () => {
        await loadState();
        if (memState.markedGroupId === group.id) {
            memState.markedTabId   = null;
            memState.markedGroupId = null;
            await saveState();
        }
    });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === 'clear') {
        enqueue(async () => {
            await clearAllMarkers();
            memState.rgbIndex = 0;
            await saveState();
            sendResponse({ ok: true });
        });
        return true;
    }
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (!('colorMode' in changes) && !('fixedColor' in changes)) return;
    enqueue(() => recolorExistingMarker());
});

chrome.runtime.onInstalled.addListener(() => {
    enqueue(async () => {
        await clearAllMarkers();
        memState = {
            currentTabId:    null,
            currentWindowId: null,
            markedTabId:     null,
            markedGroupId:   null,
            rgbIndex:        0,
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
        await clearAllMarkers();
        memState = {
            currentTabId:    null,
            currentWindowId: null,
            markedTabId:     null,
            markedGroupId:   null,
            rgbIndex:        0,
        };
        stateLoaded = true;
        await saveState();
    });
});
