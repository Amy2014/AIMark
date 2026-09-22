# \# AIMARK

# 

# Annotate live web pages with precise DOM locators. Copy structured prompts for AI coding agents—or use the same notes for bug reports and requirements.

# 

# MARK is a Chrome / Edge extension (Manifest V3). It does not bind to any frontend repository: copy the extension folder, load it unpacked, and use it on any normal `http` / `https` page.

# 

# \---

# 

# \## Overview

# 

# MARK overlays the page you already have open. It does not take a screenshot or clone a fake page—you annotate the running UI.

# !\[Pick an element and annotate](imgs/review.gif)

# 

# \*\*Features\*\*

# 

# \- Hover to highlight a DOM element; right-click to attach a note to that element.

# \- Add a freeform note without picking an element. On copy, it is included as-is (no fabricated DOM locator).

# \- A floating panel lists all notes for the session; edit or delete them.

# \- \*\*Copy all\*\* builds markdown with selectors, visible text, HTML snippets, and the page route. Freeform items are labeled as custom prompts.

# \- After you enable MARK once on a tab, refresh keeps it on and restores notes for that tab.

# 

# \*\*Privacy\*\*

# 

# \- Notes live in the page’s `sessionStorage`.

# \- “Enabled for this tab” is stored in the extension’s `chrome.storage.session`.

# \- Nothing is uploaded to a server.

# 

# \---

# 

# \## Background

# 

# UI change requests often start as “look at the page”: spacing is wrong, this button label should change, this cell wraps on a narrow screen. Screenshots and long verbal prompts still leave the receiver (or an AI agent) hunting for the right template and styles.

# 

# When you hand the same task to an AI coding agent, the gap is worse. A screenshot shows the symptom, but the agent lacks a stable DOM identity—so it edits the wrong node or searches the whole repo. Another round of “it’s the operations column in that table” often costs more than the change itself.

# 

# MARK started as a project-local inject during `npm start`, then became a standalone extension so any team can use the same pick-and-annotate flow for AI prompts, bugs, and requirements—without wiring it into each app’s build.

# 

# \---

# 

# \## Pain points

# 

# | Pain | Before | With MARK |

# | --- | --- | --- |

# | Hard to say \*which\* piece of UI | Screenshot + verbal location | Click the real element; notes carry selectors and nearby structure |

# | Unstable targeting for AI | Describe symptoms; model guesses the component | Copy prefers `data-testid`, `id`, text, CSS path, etc.; host stripped, route kept |

# | Some notes don’t map to a node | Force-bind an element or open another doc | \*\*Add\*\* writes unbound notes; copy treats them as custom prompts |

# | Only works inside one repo | Script tied to a business app’s dev mode | Extension is decoupled; works on http / https pages |

# | Refresh turns it off | Inject lived only for that document load | Remembers the tab is enabled; remounts after refresh; notes remain |

# 

# MARK turns “this element on the page” into a transferable, precise note. It does not replace a bug tracker and does not change your repository by itself.

# 

# \---

# 

# \## Usage

# 

# \### Install

# !\[step1](imgs/1.png)

# 

# 1\. Open `chrome://extensions` (Edge: `edge://extensions`).

# 2\. Turn on \*\*Developer mode\*\*.

# 3\. Click \*\*Load unpacked\*\* and select the folder that contains `manifest.json`.

# 4\. After you change extension code, click \*\*Reload\*\* on the extension card, then refresh the target page.

# 

# Browser built-in pages (`chrome://`, `edge://`, …) cannot be injected.

# 

# 

# \### Annotate a page

# 

# 1\. Open the page; click the MARK toolbar icon.

# 2\. Click \*\*Enable\*\*. A floating \*\*MARK\*\* button appears (bottom-right). Status shows the page is on. Use \*\*Disable\*\* to turn it off.

# &#x20;  !\[step2](imgs/2.png)

# &#x20;  !\[step3](imgs/3.png)

# 3\. Open the panel → \*\*Pick element\*\*. Hover highlights the DOM under the cursor. Right-click → \*\*Annotate\*\*, write a bug / requirement / change note, add it to the list.

# &#x20;  !\[step4](imgs/4.png)

# 4\. While picking, the button becomes \*\*Cancel pick\*\*. Left-clicks on the page are blocked; the context menu is overridden for annotate.

# 5\. For notes that are not about one element, click \*\*Add\*\* (unbound / custom prompt).

# 6\. Edit text in the list; delete sits on the same row as the truncated title.

# 7\. \*\*Copy all\*\* — bound items include locators; unbound items are copied as custom prompts.

# 

# Example of generated prompt structure:

# 

# ```text

# Please apply the following items as local UI/interaction changes in the current frontend repo.

# Prefer locators for items that include targeting info; for items labeled “custom prompt”, follow the text as-is and do not force a DOM binding.

# 

# Page route: /data-dashboard

# Item count: 2

# 

# \## 1. …

# 

# \*\*User intent:\*\* …

# \*\*Target element locators (try in order):\*\*

# 1\. `span.…`

# …

# 

# \## 2. …

# …

# ```

# 

# \- \*\*Disable\*\*, or close the tab, clears auto-enable for that tab. New tabs do not auto-enable.

# \- `Alt+Shift+A` toggles the panel.

# \- Same-tab refresh remounts MARK and restores notes from `sessionStorage`. Closing the tab drops notes. Fully quitting the browser clears which tabs were enabled—you need \*\*Enable\*\* again.

# 

# \---

# 

# \## How it works

# 

# \### Why an extension

# 

# Injecting into one app’s build only helps that project and couples to the business bundle. MARK uses Manifest V3: the popup sends `chrome.tabs.sendMessage` to mount / unmount. Permissions: `activeTab`, `scripting`, `storage`. Content scripts match `http://\*/\*` and `https://\*/\*` at `document\_idle`. Scripts may load on those pages, but the UI mounts only when that tab is marked enabled.

# 

# \### Isolated overlay

# 

# \- `lib/ai-annotate.js` — annotate UI and logic  

# \- `content.js` — message bridge  

# 

# They run in the extension isolated world. UI hosts on `document.documentElement` as `#qa-ai-annotate-host`, with styles in Shadow DOM so business CSS / DOM / JS stay separate. In pick mode, page left-clicks are suppressed and the context menu is replaced for annotate.

# 

# Hover / right-click resolve the real DOM node via `elementFromPoint` and a highlight overlay sized with `getBoundingClientRect`—not screenshot pixels.

# 

# \### Locators and copy text

# 

# For a selected node, MARK collects several locators (not a single fragile selector): test attributes (`data-testid`, `data-cy`, `data-qa`, …), `id`, `aria-label`, role, stable classes, visible text, a CSS path, truncated `outerHTML`, and viewport rect. The prompt prefix can be customized per scenario; the default targets frontend UI fixes and includes the page route.

# 

# \### Limits

# 

# \- Built-in browser pages cannot be injected.

# \- Enable state is tied to Chrome `tabId`; a new tab or a closed tab does not keep prior enable / history.

# 

# \---

# 

# \## License

# 

# Add your license here when you publish the repository.

# 

# \---

# 

# \# MARK（中文）

# 

# 在真实网页上精准框选 DOM、添加批注，并把多条批注收成带元素定位的提示词——可直接交给 AI 改代码，也可用于报 Bug、提需求。

# 

# 「每次都要写冗长的提示词，生怕描述不到位，AI 理解错我的意思」——用 AI 写代码时是否也有同样困扰？例如要改某个页面 / Tab / 表格 / 单元格下的一段文本（邮箱格式），只保留邮箱前缀：以往往往靠截图或很长一段描述，还可能被理解错。MARK 用来快速、精准地定位真实页面元素并附上 prompt。

# 

# MARK 是浏览器扩展，不绑定某一个前端仓库。扩展目录可整夹复制，在 Chrome 或 Edge 加载后，对任意普通网页使用。

# 

# \---

# 

# \## 1. 工具概述

# 

# MARK 叠在当前打开的页面上，不另开截图，也不克隆假页面。看到的就是正在运行的界面。

# 

# \*\*主要能力\*\*

# 

# \- 悬停高亮元素，右键写一条绑定该元素的标注。

# \- 不点选元素，直接增加一条说明；复制时原样附上，不编造 DOM 定位。

# \- 悬浮面板汇总本次标注，可改字、可删除。

# \- 一键复制全部：绑定元素的条目带选择器、文案、结构片段和页面路由；未绑定的标成「自定义提示词」。

# \- 同一标签页刷新后自动再开启，已写的标注还在。

# 

# \*\*隐私\*\*

# 

# \- 条目在当前网页的 `sessionStorage`。

# \- 是否开启记在扩展的 `chrome.storage.session`。

# \- 不上传服务器。

# 

# \---

# 

# \## 2. 开发背景

# 

# 前端改界面时，需求经常来自「看着页面说」：间距不对、按钮文案要换、窄屏挤在一起。口头描述、截图红框，落到代码里仍要自己找模板和样式。

# 

# 交给 AI 时缺口更明显：截图能说明现象，但 Agent 看不到稳定的 DOM 标识，容易改错节点或全仓库搜索。再补一句「就是那个表格里的操作列」，沟通成本往往高于改动本身。

# 

# 最初做成业务仓库开发态脚本（仅 `npm start` 注入），有三个限制：换项目要再接一遍；刷新脚本就没了；能力被收窄成「只给 AI 写 Prompt」。同一套点选也适合记 Bug 和写需求，因此改成独立扩展，工具名定为 MARK。

# 

# \---

# 

# \## 3. 解决的痛点

# 

# | 痛点 | 以前 | MARK |

# | --- | --- | --- |

# | 说不清是哪一块 | 截图加口头位置 | 点到真实元素，条目带选择器和附近结构 |

# | 交给 AI 时定位不稳 | 只贴现象，模型猜组件 | 优先 `data-testid`、`id`、文案、CSS 路径等；去掉主机名，只留路由 |

# | 说明对不上某个节点 | 硬绑元素或另开文档 | 「增加」写入不绑定说明，复制按自定义提示词原样执行 |

# | 只在一个项目里能用 | 嵌在业务工程开发模式 | 扩展与仓库解耦，http / https 都能开 |

# | 一刷新就关掉 | 注入只存在于当次文档 | 记住该标签页已开启，刷新后自动再挂上，条目还在 |

# 

# 它解决的是「从页面上定位问题元素，转为一条可转交的精准说明」。不代替缺陷系统，也不自动改仓库。

# 

# \---

# 

# \## 4. 使用方法

# 

# \### 4.1 安装

# 

# 1\. Chrome 打开 `chrome://extensions`（Edge 用 `edge://extensions`）。

# 2\. 打开「开发者模式」。

# 3\. 点「加载已解压的扩展程序」，选中含 `manifest.json` 的扩展目录。

# 4\. 改过扩展代码后，在扩展管理页点刷新；已打开的业务页再刷新一次。

# 

# 浏览器内置页（`chrome://`、`edge://` 等）不能注入。若是压缩包，需先解压再加载。

# 

# \### 4.2 在页面上标注

# 

# 1\. 打开要标注的网页，点工具栏 MARK 图标。

# 2\. 弹窗里点「开启」。右下角出现悬浮按钮「MARK」，状态为「当前页已开启」；可点「关闭」关掉工具。

# 3\. 点悬浮按钮 →「点选元素」。悬停时 DOM 高亮；右键「写标注」，在气泡里写下 Bug、需求或修改说明，加入列表。

# 4\. 点选状态下按钮变为「取消点选」；会禁止原页面左键操作，并覆盖右键菜单为添加标注。

# 5\. 说明不针对某个元素时，在面板点「增加」（不绑定元素）。

# 6\. 列表可改文字；删除与标题同行，过长标题截断。

# 7\. 「复制全部」：绑定元素带定位；未绑定以「自定义提示词」原样附上。

# 

# 默认生成的提示词会带前缀「请按下列条目，对当前前端仓库做局部 UI/交互修改…」，并包含页面路由与条目定位信息（可按场景改模板）。

# 

# \- 点「关闭」或关掉该标签页后，不会自动开启；新开标签页也不会自己开。

# \- `Alt+Shift+A` 打开或收起面板。

# \- 同一标签页刷新会自动再开启，列表从该页 `sessionStorage` 恢复。关掉标签页后标注消失。完全退出浏览器后，「哪些标签页开着」也会清空，需重新点「开启」。

# 

# \---

# 

# \## 5. 实现原理

# 

# \### 5.1 为什么是扩展

# 

# 页面脚本嵌进某个前端工程后，只能在特定项目用，也容易和业务包耦合。扩展用 Chrome Manifest V3：工具栏弹窗通过 `chrome.tabs.sendMessage` 通知页面开启 / 关闭。权限：`activeTab`、`scripting`、`storage`。内容脚本匹配 `http://\*/\*`、`https://\*/\*`，在 `document\_idle` 注入；界面仅在该标签页被记为「已开启」时挂上。

# 

# \### 5.2 与页面 DOM / CSS / JS 隔离

# 

# 注入 `lib/ai-annotate.js`（标注逻辑）与 `content.js`（收扩展消息），跑在扩展隔离环境。界面挂在 `document.documentElement` 上的宿主节点 `qa-ai-annotate-host`，样式进 Shadow DOM，避免污染业务。进入点选（Picking）后禁止原页面左键，右键统一为「添加标注」。点选的是真实 DOM，不是截图像素；不绑定元素的条目复制时单独成段。

# 

# \### 5.3 元素定位与复制文本

# 

# 对选中节点收集一组定位信息，而不是只留一个可能失效的选择器：优先测试属性（`data-testid`、`data-cy`、`data-qa` 等）、`id`、`aria-label`、角色、稳定 class、可见文案；并保留 CSS 路径、截断 outerHTML、视口位置。提示词模板可按场景自定义；默认面向前端调试，带「请按下列条目…」前缀与页面路由。

# 

# \### 5.4 边界

# 

# \- 内置浏览器页面不能注入。

# \- 开启记忆与 Chrome `tabId` 绑定；新开 tab 或关闭 tab 后，历史标注与开启状态不会保留。

# 

