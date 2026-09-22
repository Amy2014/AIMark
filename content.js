(function () {
  if (globalThis.__qaAiAnnotateBound) return;
  globalThis.__qaAiAnnotateBound = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const type = message && message.type;
    if (type === 'mount') {
      globalThis.mountAiAnnotate();
      sendResponse({ ok: true, mounted: true });
      return;
    }
    if (type === 'unmount') {
      globalThis.unmountAiAnnotate();
      sendResponse({ ok: true, mounted: false });
      return;
    }
    if (type === 'status') {
      sendResponse({
        ok: true,
        mounted: typeof globalThis.isAiAnnotateMounted === 'function' && globalThis.isAiAnnotateMounted(),
      });
      return;
    }
    if (type === 'copy') {
      Promise.resolve(globalThis.copyAiAnnotatePrompts())
        .then(() => sendResponse({ ok: true }))
        .catch((error) => sendResponse({ ok: false, error: String(error) }));
      return true;
    }
    return;
  });

  chrome.runtime.sendMessage({ type: 'shouldMount' }, (res) => {
    if (chrome.runtime.lastError) return;
    if (res && res.mount && typeof globalThis.mountAiAnnotate === 'function') {
      globalThis.mountAiAnnotate();
    }
  });
})();
