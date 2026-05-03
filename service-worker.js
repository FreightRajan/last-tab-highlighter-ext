const GROUP_COLOR = "yellow";
const GROUP_TITLE = "Last";

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const { lastActiveTabId } = await chrome.storage.session.get("lastActiveTabId");
  await chrome.storage.session.set({ lastActiveTabId: tabId });

  if (lastActiveTabId == null || lastActiveTabId === tabId) return;

  await highlightTab(lastActiveTabId);
});

chrome.tabs.onRemoved.addListener(async (closedId) => {
  const { lastActiveTabId } = await chrome.storage.session.get("lastActiveTabId");
  if (lastActiveTabId === closedId) {
    await chrome.storage.session.remove("lastActiveTabId");
  }
});

async function highlightTab(tabId) {
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }

  const [existingGroup] = await chrome.tabGroups.query({
    windowId: tab.windowId,
    color: GROUP_COLOR,
  });

  if (existingGroup) {
    const inGroup = await chrome.tabs.query({ groupId: existingGroup.id });
    const stale = inGroup.filter((t) => t.id !== tabId).map((t) => t.id);
    if (stale.length) await chrome.tabs.ungroup(stale);

    if (tab.groupId !== existingGroup.id) {
      await chrome.tabs.group({ groupId: existingGroup.id, tabIds: tabId });
    }
    return;
  }

  const groupId = await chrome.tabs.group({ tabIds: tabId });
  await chrome.tabGroups.update(groupId, {
    color: GROUP_COLOR,
    title: GROUP_TITLE,
  });
}
