// ===== CONFIG =====
const GROUP_COLOR = 'yellow';
const GROUP_TITLE = '◀ HERE';
const STATE_KEY   = 'lth_state_v1';
// ==================

async function getState() {
    const data = await chrome.storage.session.get(STATE_KEY);
    return data[STATE_KEY] || { currentTabId: null, currentWindowId: null };
}

async function setState(state) {
    await chrome.storage.session.set({ [STATE_KEY]: state });
}

async function ensureBaseline() {
    const state = await getState();
    if (state.currentTabId == null) {
        try {
            const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
            if (activeTab) {
                state.currentTabId = activeTab.id;
                state.currentWindowId = activeTab.windowId;
                await setState(state);
            }
        } catch (e) { /* ignore */ }
    }
    return state;
}

async function applyMarkerGroup(windowId, tabId) {
    const groupId = await chrome.tabs.group({ tabIds: [tabId], createProperties: { windowId } });
    await chrome.tabGroups.update(groupId, {
        color: GROUP_COLOR,
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
    const state = await ensureBaseline();
    const leavingTabId = state.currentTabId;

    await setState({ currentTabId: newActiveTabId, currentWindowId: newWindowId });

    await ungroupTab(newActiveTabId);

    if (leavingTabId != null && leavingTabId !== newActiveTabId) {
        await markTab(leavingTabId);
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
        await setState({ currentTabId: null, currentWindowId: null });
    }
});

chrome.action.onClicked.addListener(async () => {
    await clearAllMarkers();
    await setState({ currentTabId: null, currentWindowId: null });
});

chrome.runtime.onInstalled.addListener(async () => {
    await clearAllMarkers();
    await setState({ currentTabId: null, currentWindowId: null });
    await ensureBaseline();
});

chrome.runtime.onStartup.addListener(async () => {
    await clearAllMarkers();
    await setState({ currentTabId: null, currentWindowId: null });
    await ensureBaseline();
});
