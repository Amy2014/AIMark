const KEY = 'enabledTabIds';

function readIds(data) {
  const raw = data && data[KEY];
  return Array.isArray(raw) ? raw.filter((id) => typeof id === 'number') : [];
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || (message.type !== 'shouldMount' && message.type !== 'setEnabled')) return;

  const tabId = message.type === 'shouldMount' ? sender.tab && sender.tab.id : message.tabId;
  if (typeof tabId !== 'number') {
    sendResponse({ ok: false, mount: false });
    return;
  }

  chrome.storage.session.get(KEY).then((data) => {
    const ids = new Set(readIds(data));
    if (message.type === 'shouldMount') {
      sendResponse({ ok: true, mount: ids.has(tabId) });
      return;
    }
    if (message.enabled) ids.add(tabId);
    else ids.delete(tabId);
    return chrome.storage.session.set({ [KEY]: [...ids] }).then(() => sendResponse({ ok: true }));
  }).catch((error) => {
    sendResponse({ ok: false, mount: false, error: String(error) });
  });
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.get(KEY).then((data) => {
    const ids = readIds(data).filter((id) => id !== tabId);
    return chrome.storage.session.set({ [KEY]: ids });
  });
});
