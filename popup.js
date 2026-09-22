const statusEl = document.getElementById('status');
const toggleBtn = document.getElementById('toggle');
const copyBtn = document.getElementById('copy');
const errEl = document.getElementById('err');

function setError(message) {
  errEl.textContent = message || '';
}

function canInject(url) {
  if (!url) return false;
  return /^(https?|file):/i.test(url);
}

async function currentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error('没有活动标签页');
  if (!canInject(tab.url || '')) throw new Error('此页面不能注入（浏览器内置页不行）');
  return tab;
}

async function ensureInjected(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['lib/ai-annotate.js', 'content.js'],
  });
}

function needsInject(error) {
  const message = String(error && error.message ? error.message : error);
  return /Receiving end does not exist|Could not establish connection/i.test(message);
}

async function send(type) {
  const tab = await currentTab();
  try {
    return await chrome.tabs.sendMessage(tab.id, { type });
  } catch (error) {
    if (!needsInject(error)) throw error;
    await ensureInjected(tab.id);
    return chrome.tabs.sendMessage(tab.id, { type });
  }
}

function remember(tabId, enabled) {
  return chrome.runtime.sendMessage({ type: 'setEnabled', tabId, enabled });
}

function render(mounted) {
  statusEl.textContent = mounted ? '当前页已开启' : '当前页未开启';
  toggleBtn.textContent = mounted ? '关闭' : '开启';
  copyBtn.disabled = !mounted;
}

toggleBtn.addEventListener('click', async () => {
  setError('');
  toggleBtn.disabled = true;
  try {
    const tab = await currentTab();
    const status = await send('status');
    const next = status && status.mounted ? 'unmount' : 'mount';
    await send(next);
    await remember(tab.id, next === 'mount');
    const after = await send('status');
    render(!!(after && after.mounted));
  } catch (error) {
    setError(error && error.message ? error.message : String(error));
  } finally {
    toggleBtn.disabled = false;
  }
});

copyBtn.addEventListener('click', async () => {
  setError('');
  try {
    await send('copy');
    statusEl.textContent = '已复制到剪贴板';
  } catch (error) {
    setError(error && error.message ? error.message : String(error));
  }
});

(async () => {
  try {
    const result = await send('status');
    render(!!(result && result.mounted));
  } catch (error) {
    statusEl.textContent = '当前页未开启';
    setError(error && error.message ? error.message : String(error));
  }
})();
