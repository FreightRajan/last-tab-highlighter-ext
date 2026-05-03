// ===== CONFIG =====
const GROUP_TITLE       = '◀ HERE';
const STATE_KEY         = 'lth_state_v1';
const RGB_CYCLE         = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue', 'purple', 'pink'];
const DEFAULT_SETTINGS  = { colorMode: 'fixed', fixedColor: 'yellow' };
// ==================

async function getState() {
    const data = await chrome.storage.session.get(STATE_KEY);
    return data[STATE_KEY] || { currentTabId: null, currentWindowId: null, rgbIndex: 0 };
}

async function setState(state) {
    await chrome.storage.session.set({ [STATE_KEY]: state });
}

async function getSettings() {
    return await chrome.storage.sync.get(DEFAULT_SETTINGS);
}

async function pickAndAdvanceColor() {
    const settings = await getSettings();
    if (settings.colorMode !== 'rgb') {
        return settings.fixedColor || 'yellow';
    }
    const state = await getState();
    const idx   = (typeof state.rgbIndex === 'number' ? state.rgbIndex : 0) % RGB_CYCLE.length;
    const color = RGB_CYCLE[idx];
    await setState({ ...state, rgbIndex: (idx + 1) % RGB_CYCLE.length });
    return color;
}

async function ensureBaseline() {
    const state = await getState();
    if (state.currentTabId == null) {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            if (activeTab) {
                state.currentTabId    = activeTab.id;
                state.currentWindowId = activeTab.windowId;
                await setState(state);
            }
        } catch (e) { /* ignore */ }
    }
    return state;
}

async function applyMarkerGroup(windowId, tabId) {
    const color   = await pickAndAdvanceColor();
    const groupId = await chrome.tabs.group({ tabIds: [tabId], createProperties: { windowId } });
    await chrome.tabGroups.update(groupId, {
        color,
        title: GROUP_TITLE,
        collapsed: false
    });
    return groupId;
}

async function ungroupTab(tabId) {
    try { await chrome.tabs.ungroup(tabId); } catch (e) { /* not in a group; ignore */ }
}

async function clearAllMarkers(exceptTabId = null) {
    try {
        const groups = await chrome.tabGroups.query({ title: GROUP_TITLE });
        for (const g of groups) {
            const tabs = await chrome.tabs.query({ groupId: g.id });
            for (const t of tabs) {
                if (t.id !== exceptTabId) await ungroupTab(t.id);
            }
        }
    } catch (e) { console.error('clearAllMarkers error', e); }
}

async function markTab(tabId) {
    if (tabId == null) return;
    try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab) return;
        await clearAllMarkers(tabId);
        await applyMarkerGroup(tab.windowId, tabId);
    } catch (e) {
        await clearAllMarkers();
    }
}

async function handleTabSwitch(newActiveTabId, newWindowId) {
    const state        = await ensureBaseline();
    const leavingTabId = state.currentTabId;

    await setState({ ...state, currentTabId: newActiveTabId, currentWindowId: newWindowId });

    await ungroupTab(newActiveTabId);

    if (leavingTabId != null && leavingTabId !== newActiveTabId) {
        await markTab(leavingTabId);
    }
}

async function recolorExistingMarkers() {
    const settings = await getSettings();
    if (settings.colorMode !== 'fixed') return;
    const color  = settings.fixedColor || 'yellow';
    const groups = await chrome.tabGroups.query({ title: GROUP_TITLE });
    for (const g of groups) {
        try { await chrome.tabGroups.update(g.id, { color }); } catch (e) { /* ignore */ }
    }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await handleTabSwitch(activeInfo.tabId, activeInfo.windowId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, windowId });
        if (!activeTab) return;
        await handleTabSwitch(activeTab.id, windowId);
    } catch (e) { /* ignore */ }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
    const state = await getState();
    if (state.currentTabId === tabId) {
        await setState({ ...state, currentTabId: null, currentWindowId: null });
    }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.action === 'clear') {
        (async () => {
            await clearAllMarkers();
            await setState({ currentTabId: null, currentWindowId: null, rgbIndex: 0 });
            sendResponse({ ok: true });
        })();
        return true;
    }
});

chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'sync') return;
    if (!('colorMode' in changes) && !('fixedColor' in changes)) return;
    await recolorExistingMarkers();
});

chrome.runtime.onInstalled.addListener(async () => {
    await clearAllMarkers();
    await setState({ currentTabId: null, currentWindowId: null, rgbIndex: 0 });
    await ensureBaseline();
});

chrome.runtime.onStartup.addListener(async () => {
    await clearAllMarkers();
    await setState({ currentTabId: null, currentWindowId: null, rgbIndex: 0 });
    await ensureBaseline();
});
