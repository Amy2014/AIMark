/* MARK annotation tool. */
(function (exports) {
/**
 * MARK：在网页上点选元素并写标注。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mountAiAnnotate = exports.copyAiAnnotatePrompts = exports.unmountAiAnnotate = exports.isAiAnnotateMounted = void 0;
const HOST_ID = 'qa-ai-annotate-host';
const STORAGE_KEY = 'qa-ai-annotate-items';
let teardown = null;
let copyAllFn = null;
function isAiAnnotateMounted() {
    return !!document.getElementById(HOST_ID);
}
exports.isAiAnnotateMounted = isAiAnnotateMounted;
function unmountAiAnnotate() {
    teardown?.();
    teardown = null;
    copyAllFn = null;
    document.getElementById(HOST_ID)?.remove();
}
exports.unmountAiAnnotate = unmountAiAnnotate;
function copyAiAnnotatePrompts() {
    if (!copyAllFn)
        return Promise.resolve();
    return copyAllFn();
}
exports.copyAiAnnotatePrompts = copyAiAnnotatePrompts;
function uid() {
    return `ann_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function truncate(s, n) {
    const t = (s || '').replace(/\s+/g, ' ').trim();
    return t.length > n ? `${t.slice(0, n)}…` : t;
}
/** 仅路由（pathname + search + hash），不含 host */
function pageRoute() {
    return `${location.pathname}${location.search}${location.hash}`;
}
function isOwnUi(el) {
    if (!(el instanceof Node))
        return false;
    const host = document.getElementById(HOST_ID);
    return !!(host && (el === host || host.contains(el)));
}
/** 过滤不稳定 / 框架生成 class */
function stableClasses(el) {
    return Array.from(el.classList).filter((c) => {
        if (!c)
            return false;
        if (/^(ng-|cdk-|ant-wave|ng-star-inserted)/.test(c))
            return false;
        if (/^[a-z]{1,3}-[a-f0-9]{5,}$/i.test(c))
            return false;
        if (c.length > 48)
            return false;
        return true;
    }).slice(0, 6);
}
function buildCssPath(el) {
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur.nodeType === 1 && depth < 6 && cur !== document.body && cur !== document.documentElement) {
        let part = cur.tagName.toLowerCase();
        if (cur.id && !/\d{4,}/.test(cur.id)) {
            part += `#${CSS.escape(cur.id)}`;
            parts.unshift(part);
            break;
        }
        const classes = stableClasses(cur);
        if (classes[0]) {
            part += `.${CSS.escape(classes[0])}`;
        }
        const parent = cur.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
            if (siblings.length > 1) {
                const idx = siblings.indexOf(cur) + 1;
                part += `:nth-of-type(${idx})`;
            }
        }
        parts.unshift(part);
        cur = parent;
        depth += 1;
    }
    return parts.join(' > ');
}
function collectSelectors(el) {
    const selectors = [];
    const push = (s) => {
        const v = (s || '').trim();
        if (v && !selectors.includes(v))
            selectors.push(v);
    };
    const testId = el.getAttribute('data-testid');
    const dataCy = el.getAttribute('data-cy');
    const dataQa = el.getAttribute('data-qa') || el.getAttribute('data-test-id');
    if (testId)
        push(`[data-testid="${testId}"]`);
    if (dataCy)
        push(`[data-cy="${dataCy}"]`);
    if (dataQa)
        push(`[data-qa="${dataQa}"]`);
    if (el.id)
        push(`#${CSS.escape(el.id)}`);
    const aria = el.getAttribute('aria-label');
    if (aria)
        push(`${el.tagName.toLowerCase()}[aria-label="${aria}"]`);
    const name = el.getAttribute('name');
    if (name)
        push(`${el.tagName.toLowerCase()}[name="${name}"]`);
    const placeholder = el.getAttribute('placeholder');
    if (placeholder)
        push(`${el.tagName.toLowerCase()}[placeholder="${placeholder}"]`);
    const classes = stableClasses(el);
    if (classes.length) {
        push(`${el.tagName.toLowerCase()}.${classes.map((c) => CSS.escape(c)).join('.')}`);
    }
    const text = truncate(el.textContent || '', 40);
    if (text && text.length >= 2 && text.length <= 40) {
        push(`文案含「${text}」的 <${el.tagName.toLowerCase()}>`);
    }
    push(buildCssPath(el));
    return { preferred: selectors[0] || buildCssPath(el), selectors };
}
function describeElement(el) {
    const { preferred, selectors } = collectSelectors(el);
    const rect = el.getBoundingClientRect();
    return {
        preferred,
        selectors,
        tag: el.tagName.toLowerCase(),
        idAttr: el.id || '',
        classes: stableClasses(el),
        text: truncate(el.textContent || '', 80),
        ariaLabel: el.getAttribute('aria-label') || '',
        role: el.getAttribute('role') || '',
        outerHtmlSnippet: truncate(el.outerHTML || '', 280),
        rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
        },
        pageUrl: pageRoute(),
    };
}
function loadItems() {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function saveItems(items) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
    catch {
        /* ignore quota */
    }
}
function buildBatchMarkdown(items) {
    if (!items.length)
        return '';
    const lines = [
        '请按下列条目，对当前前端仓库做局部 UI/交互修改。带定位信息的条目请优先用标识在代码/模板中定位；标注为「自定义提示词」的条目请原样执行，不要强行绑定 DOM。',
        '',
        `页面路由：${pageRoute()}`,
        `条目数：${items.length}`,
        '',
    ];
    items.forEach((it, i) => {
        if (it.freeform || !it.locator) {
            lines.push(`## ${i + 1}. 自定义提示词`);
            lines.push('');
            lines.push(it.prompt);
            lines.push('');
            return;
        }
        const loc = it.locator;
        lines.push(`## ${i + 1}. ${truncate(it.prompt, 60) || '未命名修改'}`);
        lines.push('');
        lines.push(`**用户意图：** ${it.prompt}`);
        lines.push('');
        lines.push('**目标元素定位（按优先级尝试）：**');
        loc.selectors.forEach((s, si) => lines.push(`${si + 1}. \`${s}\``));
        lines.push('');
        lines.push(`- tag: \`${loc.tag}\``);
        if (loc.idAttr)
            lines.push(`- id: \`${loc.idAttr}\``);
        if (loc.classes.length)
            lines.push(`- classes: \`${loc.classes.join(' ')}\``);
        if (loc.ariaLabel)
            lines.push(`- aria-label: ${loc.ariaLabel}`);
        if (loc.role)
            lines.push(`- role: ${loc.role}`);
        if (loc.text)
            lines.push(`- 可见文案: ${loc.text}`);
        lines.push(`- 视口位置: x=${loc.rect.x}, y=${loc.rect.y}, w=${loc.rect.w}, h=${loc.rect.h}`);
        lines.push(`- outerHTML 摘要: \`${loc.outerHtmlSnippet.replace(/`/g, "'")}\``);
        lines.push('');
    });
    lines.push('---');
    lines.push('请逐条修改；改完说明改了哪些文件。不要扩大无关重构范围。');
    return lines.join('\n');
}
const CSS_TEXT = `
:host, * { box-sizing: border-box; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
.root { all: initial; font-family: inherit; color: #fff; }
.fab {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483645;
  display: flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 14px; border: 1px solid rgba(98,155,253,.4); border-radius: 999px;
  background: linear-gradient(135deg, #0b1220 0%, #121a2c 100%);
  color: #fff; font-size: 13px; font-weight: 600;
  box-shadow: 0 8px 28px rgba(0,0,0,.45); cursor: pointer;
}
.fab[data-on="1"] {
  background: linear-gradient(135deg, #3b6fd4 0%, #629bfd 100%);
  border-color: rgba(117,159,247,.65); color: #fff;
}
.fab .badge {
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
  background: #629bfd; color: #fff; font-size: 11px; line-height: 18px; text-align: center;
}
.panel {
  position: fixed; right: 16px; bottom: 64px; z-index: 2147483645;
  width: min(420px, calc(100vw - 24px)); height: 480px; max-height: 480px;
  display: none; flex-direction: column;
  background: linear-gradient(165deg, #0a0f1a 0%, #101826 55%, #152034 100%);
  color: #fff; border: 1px solid rgba(98,155,253,.28); border-radius: 12px;
  box-shadow: 0 18px 48px rgba(0,0,0,.55), 0 0 0 1px rgba(98,155,253,.1) inset;
  overflow: hidden;
}
.panel[data-open="1"] { display: flex; }
.panel__head {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid rgba(98,155,253,.18);
  background: rgba(98,155,253,.12); flex-shrink: 0;
}
.panel__title { font-size: 13px; font-weight: 700; flex-shrink: 0; color: #fff; }
.panel__actions { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.btn {
  border: 1px solid rgba(98,155,253,.32); background: rgba(16,24,40,.92);
  color: #fff; border-radius: 8px;
  height: 28px; padding: 0 10px; font-size: 12px; cursor: pointer;
}
.btn:hover { background: rgba(98,155,253,.22); border-color: rgba(117,159,247,.5); color: #fff; }
.btn--primary {
  background: linear-gradient(135deg, #3b6fd4 0%, #629bfd 100%);
  border-color: rgba(117,159,247,.5); color: #fff; font-weight: 600;
}
.btn--primary:hover { filter: brightness(1.06); }
.btn--danger {
  color: #fda4af; border-color: rgba(244,63,94,.35); background: rgba(76,5,25,.35);
}
.btn--danger:hover { background: rgba(127,29,29,.45); }
.btn--danger-ghost {
  border: none; background: transparent; color: #fb7185; height: 24px; padding: 0 4px;
  flex-shrink: 0; font-size: 12px; cursor: pointer;
}
.btn--danger-ghost:hover { color: #fda4af; text-decoration: underline; }
.panel__hint {
  padding: 8px 12px; font-size: 12px; color: rgba(255,255,255,.62);
  border-bottom: 1px solid rgba(98,155,253,.14); flex-shrink: 0;
}
.panel__list {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden;
  padding: 8px; display: flex; flex-direction: column; gap: 8px;
}
.item {
  border: 1px solid rgba(98,155,253,.2); border-radius: 10px; padding: 8px;
  background: rgba(14,20,34,.82); flex-shrink: 0;
}
.item__head {
  display: flex; align-items: center; gap: 8px; margin-bottom: 6px; min-width: 0;
}
.item__meta {
  flex: 1 1 auto; min-width: 0;
  font-size: 11px; color: rgba(255,255,255,.7);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.item__prompt {
  width: 100%; min-height: 56px; resize: vertical;
  border: 1px solid rgba(98,155,253,.25); border-radius: 8px;
  padding: 6px 8px; font-size: 12px; line-height: 1.4;
  background: rgba(6,10,18,.82); color: #fff; caret-color: #629bfd;
}
.item__prompt:focus { outline: none; border-color: #629bfd; box-shadow: 0 0 0 2px rgba(98,155,253,.22); }
.item__prompt::placeholder { color: rgba(255,255,255,.35); }
.empty { padding: 24px 12px; text-align: center; color: rgba(255,255,255,.45); font-size: 12px; }
.hl {
  position: fixed; pointer-events: none; z-index: 2147483644;
  border: 2px solid #629bfd; background: rgba(98,155,253,.16); border-radius: 2px;
  display: none;
}
.hl[data-show="1"] { display: block; }
.tag {
  position: fixed; z-index: 2147483644; pointer-events: none;
  background: linear-gradient(135deg, #3b6fd4 0%, #629bfd 100%);
  color: #fff; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px;
  max-width: 360px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: none;
}
.tag[data-show="1"] { display: block; }
.menu {
  position: fixed; z-index: 2147483646; min-width: 160px;
  background: linear-gradient(165deg, #0b1220 0%, #152034 100%);
  border: 1px solid rgba(98,155,253,.32); border-radius: 10px;
  box-shadow: 0 14px 36px rgba(0,0,0,.55); padding: 4px; display: none;
}
.menu[data-open="1"] { display: block; }
.menu button {
  display: block; width: 100%; text-align: left; border: none; background: transparent;
  padding: 8px 10px; border-radius: 8px; font-size: 12px; cursor: pointer; color: #fff;
}
.menu button:hover { background: rgba(98,155,253,.22); color: #fff; }
.bubble {
  position: fixed; z-index: 2147483647; width: min(360px, calc(100vw - 24px));
  background: linear-gradient(165deg, #0a0f1a 0%, #152034 100%);
  border: 1px solid rgba(98,155,253,.32); border-radius: 12px;
  box-shadow: 0 18px 44px rgba(0,0,0,.6); padding: 10px; display: none;
  color: #fff;
}
.bubble[data-open="1"] { display: block; }
.bubble__loc { font-size: 11px; color: rgba(255,255,255,.65); margin-bottom: 6px; word-break: break-all; }
.bubble textarea {
  width: 100%; min-height: 72px; border: 1px solid rgba(98,155,253,.28); border-radius: 8px;
  padding: 8px; font-size: 12px; resize: vertical;
  background: rgba(6,10,18,.82); color: #fff; caret-color: #629bfd;
}
.bubble textarea:focus { outline: none; border-color: #629bfd; box-shadow: 0 0 0 2px rgba(98,155,253,.22); }
.bubble textarea::placeholder { color: rgba(255,255,255,.35); }
.bubble__row { display: flex; justify-content: flex-end; gap: 6px; margin-top: 8px; }
.toast {
  position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%);
  z-index: 2147483647;
  background: rgba(10,15,26,.94); color: #fff;
  border: 1px solid rgba(98,155,253,.35);
  padding: 8px 14px; border-radius: 999px; font-size: 12px; display: none;
  box-shadow: 0 8px 24px rgba(0,0,0,.45);
}
.toast[data-show="1"] { display: block; }
`;
function mountAiAnnotate() {
    if (typeof window === 'undefined' || typeof document === 'undefined')
        return;
    if (document.getElementById(HOST_ID))
        return;
    let items = loadItems();
    let mode = 'idle';
    let panelOpen = false;
    let hovered = null;
    let pendingEl = null;
    let pendingLocator = null;
    let bubbleFreeform = false;
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.setAttribute('data-qa-ai-annotate', '1');
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = CSS_TEXT;
    shadow.appendChild(style);
    const root = document.createElement('div');
    root.className = 'root';
    root.innerHTML = `
    <div class="hl" id="hl"></div>
    <div class="tag" id="tag"></div>
    <div class="menu" id="menu">
      <button type="button" data-act="annotate">写标注</button>
      <button type="button" data-act="cancel">取消点选</button>
    </div>
    <div class="bubble" id="bubble">
      <div class="bubble__loc" id="bubbleLoc"></div>
      <textarea id="bubbleInput" placeholder="Bug、需求或修改说明"></textarea>
      <div class="bubble__row">
        <button type="button" class="btn" data-act="bubble-cancel">取消</button>
        <button type="button" class="btn btn--primary" data-act="bubble-ok">加入列表</button>
      </div>
    </div>
    <div class="panel" id="panel">
      <div class="panel__head">
        <div class="panel__title">MARK</div>
        <div class="panel__actions">
          <button type="button" class="btn" data-act="add">增加</button>
          <button type="button" class="btn" id="pickBtn" data-act="pick">点选元素</button>
          <button type="button" class="btn btn--primary" data-act="copy">复制全部</button>
          <button type="button" class="btn btn--danger" data-act="clear">清空</button>
        </div>
      </div>
      <div class="panel__hint">悬停高亮，右键写标注。也可直接增加一条不绑元素的说明，最后复制全部。</div>
      <div class="panel__list" id="list"></div>
    </div>
    <button type="button" class="fab" id="fab" title="Alt+Shift+A">MARK<span class="badge" id="badge">0</span></button>
    <div class="toast" id="toast"></div>
  `;
    shadow.appendChild(root);
    const hl = shadow.getElementById('hl');
    const tag = shadow.getElementById('tag');
    const menu = shadow.getElementById('menu');
    const bubble = shadow.getElementById('bubble');
    const bubbleLoc = shadow.getElementById('bubbleLoc');
    const bubbleInput = shadow.getElementById('bubbleInput');
    const panel = shadow.getElementById('panel');
    const list = shadow.getElementById('list');
    const fab = shadow.getElementById('fab');
    const badge = shadow.getElementById('badge');
    const toast = shadow.getElementById('toast');
    const pickBtn = shadow.getElementById('pickBtn');
    let toastTimer = null;
    function showToast(msg) {
        toast.textContent = msg;
        toast.dataset.show = '1';
        if (toastTimer)
            window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => {
            toast.dataset.show = '0';
        }, 1600);
    }
    function setHighlight(el) {
        hovered = el;
        if (!el) {
            hl.dataset.show = '0';
            tag.dataset.show = '0';
            return;
        }
        const r = el.getBoundingClientRect();
        hl.style.left = `${r.left}px`;
        hl.style.top = `${r.top}px`;
        hl.style.width = `${Math.max(r.width, 1)}px`;
        hl.style.height = `${Math.max(r.height, 1)}px`;
        hl.dataset.show = '1';
        const { preferred } = collectSelectors(el);
        tag.textContent = `${el.tagName.toLowerCase()} · ${preferred}`;
        const top = Math.max(4, r.top - 22);
        tag.style.left = `${Math.max(4, r.left)}px`;
        tag.style.top = `${top}px`;
        tag.dataset.show = '1';
    }
    function closeMenu() {
        menu.dataset.open = '0';
    }
    function closeBubble() {
        bubble.dataset.open = '0';
        pendingEl = null;
        pendingLocator = null;
        bubbleFreeform = false;
        bubbleInput.value = '';
    }
    function placeBubble(clientX, clientY) {
        const left = Math.min(clientX, window.innerWidth - 380);
        const top = Math.min(clientY, window.innerHeight - 200);
        bubble.style.left = `${Math.max(8, left)}px`;
        bubble.style.top = `${Math.max(8, top)}px`;
        bubble.dataset.open = '1';
        closeMenu();
        panelOpen = true;
        syncChrome();
        window.setTimeout(() => bubbleInput.focus(), 0);
    }
    function openBubble(el, clientX, clientY) {
        pendingEl = el;
        pendingLocator = describeElement(el);
        bubbleFreeform = false;
        bubbleLoc.textContent = pendingLocator.preferred;
        bubbleInput.value = '';
        bubbleInput.placeholder = 'Bug、需求或修改说明';
        placeBubble(clientX, clientY);
    }
    function openFreeformBubble() {
        pendingEl = null;
        pendingLocator = null;
        bubbleFreeform = true;
        bubbleLoc.textContent = '不绑定元素（复制时原样附上）';
        bubbleInput.value = '';
        bubbleInput.placeholder = '直接写说明，例如：列表加载失败，或希望支持批量导出';
        const rect = panel.getBoundingClientRect();
        placeBubble(Math.max(16, rect.left - 8), Math.max(16, rect.top + 48));
    }
    function setPicking(on) {
        mode = on ? 'picking' : 'idle';
        fab.dataset.on = on ? '1' : '0';
        if (!on)
            setHighlight(null);
        closeMenu();
        syncChrome();
    }
    function syncChrome() {
        badge.textContent = String(items.length);
        panel.dataset.open = panelOpen ? '1' : '0';
        fab.dataset.on = mode === 'picking' ? '1' : '0';
        const picking = mode === 'picking';
        pickBtn.textContent = picking ? '取消点选' : '点选元素';
        pickBtn.classList.toggle('btn--primary', picking);
        renderList();
    }
    function renderList() {
        if (!items.length) {
            list.innerHTML = `<div class="empty">还没有标注。点选元素后右键，或直接点「增加」。</div>`;
            return;
        }
        list.innerHTML = items
            .map((it, idx) => {
            const title = it.freeform || !it.locator
                ? `#${idx + 1} · 未绑定元素`
                : `#${idx + 1} · ${it.locator.preferred}`;
            return `
      <div class="item" data-id="${it.id}">
        <div class="item__head">
          <div class="item__meta" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
          <button type="button" class="btn--danger-ghost" data-act="del" data-id="${it.id}">删除</button>
        </div>
        <textarea class="item__prompt" data-id="${it.id}">${escapeHtml(it.prompt)}</textarea>
      </div>`;
        })
            .join('');
    }
    function escapeHtml(s) {
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
    function persist() {
        saveItems(items);
        syncChrome();
    }
    function addItem(prompt, locator, freeform = false) {
        items = [
            ...items,
            {
                id: uid(),
                createdAt: Date.now(),
                prompt: prompt.trim(),
                freeform,
                locator: freeform ? null : locator,
            },
        ];
        persist();
        showToast('已加入列表');
    }
    async function copyAll() {
        const md = buildBatchMarkdown(items);
        if (!md) {
            showToast('列表为空');
            return;
        }
        try {
            await navigator.clipboard.writeText(md);
            showToast('已复制');
        }
        catch {
            const ta = document.createElement('textarea');
            ta.value = md;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            showToast('已复制');
        }
    }
    fab.addEventListener('click', () => {
        panelOpen = !panelOpen;
        if (panelOpen && mode === 'idle') {
            /* keep */
        }
        syncChrome();
    });
    shadow.addEventListener('click', (e) => {
        const t = e.target;
        if (!t)
            return;
        const act = t.getAttribute('data-act');
        if (!act)
            return;
        e.preventDefault();
        e.stopPropagation();
        if (act === 'pick') {
            if (mode === 'picking') {
                setPicking(false);
                showToast('已取消点选');
            }
            else {
                setPicking(true);
                panelOpen = true;
                syncChrome();
                showToast('右键元素即可写标注');
            }
            return;
        }
        if (act === 'add') {
            openFreeformBubble();
            return;
        }
        if (act === 'copy') {
            void copyAll();
            return;
        }
        if (act === 'clear') {
            items = [];
            persist();
            showToast('已清空');
            return;
        }
        if (act === 'del') {
            const id = t.getAttribute('data-id');
            items = items.filter((x) => x.id !== id);
            persist();
            return;
        }
        if (act === 'annotate' && pendingEl) {
            const r = pendingEl.getBoundingClientRect();
            openBubble(pendingEl, r.left + 8, r.bottom + 8);
            return;
        }
        if (act === 'cancel') {
            setPicking(false);
            return;
        }
        if (act === 'bubble-cancel') {
            closeBubble();
            return;
        }
        if (act === 'bubble-ok') {
            const text = bubbleInput.value.trim();
            if (!text) {
                showToast('请先填写修改说明');
                return;
            }
            if (bubbleFreeform) {
                addItem(text, null, true);
            }
            else if (pendingLocator) {
                addItem(text, pendingLocator, false);
            }
            else {
                showToast('请先填写修改说明');
                return;
            }
            closeBubble();
            setPicking(false);
            panelOpen = true;
            syncChrome();
        }
    });
    shadow.addEventListener('input', (e) => {
        const t = e.target;
        if (!t || !t.classList.contains('item__prompt'))
            return;
        const id = t.getAttribute('data-id');
        items = items.map((it) => (it.id === id ? { ...it, prompt: t.value } : it));
        saveItems(items);
    });
    const onMove = (e) => {
        if (mode !== 'picking')
            return;
        if (isOwnUi(e.target)) {
            setHighlight(null);
            return;
        }
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || isOwnUi(el) || el === document.documentElement || el === document.body) {
            setHighlight(null);
            return;
        }
        setHighlight(el);
    };
    const onContext = (e) => {
        if (mode !== 'picking')
            return;
        if (isOwnUi(e.target))
            return;
        e.preventDefault();
        e.stopPropagation();
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (!el || isOwnUi(el))
            return;
        pendingEl = el;
        pendingLocator = describeElement(el);
        setHighlight(el);
        menu.style.left = `${Math.min(e.clientX, window.innerWidth - 180)}px`;
        menu.style.top = `${Math.min(e.clientY, window.innerHeight - 90)}px`;
        menu.dataset.open = '1';
    };
    const onClickCapture = (e) => {
        if (mode !== 'picking')
            return;
        if (isOwnUi(e.target))
            return;
        // 点选模式下吞掉点击，避免误触业务按钮；用右键标注
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
    };
    const onKey = (e) => {
        if (e.altKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            panelOpen = !panelOpen;
            syncChrome();
            return;
        }
        if (e.key === 'Escape') {
            closeMenu();
            closeBubble();
            if (mode === 'picking')
                setPicking(false);
        }
    };
    document.addEventListener('mousemove', onMove, true);
    document.addEventListener('contextmenu', onContext, true);
    document.addEventListener('click', onClickCapture, true);
    document.addEventListener('keydown', onKey, true);
    teardown = () => {
        document.removeEventListener('mousemove', onMove, true);
        document.removeEventListener('contextmenu', onContext, true);
        document.removeEventListener('click', onClickCapture, true);
        document.removeEventListener('keydown', onKey, true);
        host.remove();
    };
    copyAllFn = copyAll;
    syncChrome();
    // eslint-disable-next-line no-console
    console.info('[MARK] 已启用。右下角按钮或 Alt+Shift+A 打开面板。');
}
exports.mountAiAnnotate = mountAiAnnotate;

  globalThis.mountAiAnnotate = exports.mountAiAnnotate;
  globalThis.unmountAiAnnotate = exports.unmountAiAnnotate;
  globalThis.copyAiAnnotatePrompts = exports.copyAiAnnotatePrompts;
  globalThis.isAiAnnotateMounted = exports.isAiAnnotateMounted;
})({});
