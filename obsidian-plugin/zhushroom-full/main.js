"use strict";

const { addIcon, ItemView, Notice, Plugin, setIcon, TFile, WorkspaceLeaf } = require("obsidian");

const PAGE_PATH = "猪事顺利.html";
const VIEW_TYPE = "zhushroom-page-view";
const ICON_ID = "zhushi-pig";
/* openFile 补丁的标记，避免与其它插件互相覆盖 */
const PATCH_MARK = Symbol.for("zhushroom-full.openFile");
/* 页面里的「选择 Obsidian 库」选的就是这一层；插件直写时也以它为根 */
const SYNC_ROOT = "日程";
const PIG_ICON = `
  <g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5.5 8 4 4.5l4 1.2M18.5 8 20 4.5l-4 1.2" />
    <path d="M12 5c-5.5 0-9 3.4-9 8s3.7 8 9 8 9-3.4 9-8-3.5-8-9-8Z" />
    <path d="M8.5 11h.01M15.5 11h.01" />
    <ellipse cx="12" cy="15.4" rx="3.1" ry="2.2" />
    <path d="M11 15.4h.01M13 15.4h.01" />
  </g>`;

/* 学在浙大网页标签页的自定义图标：Obsidian 1.9 的核心 Web viewer 用站点 favicon，
   站点给的是另一枚青色标记，这里按用户要求换成「学在浙大」logo（内联 PNG，避免外链） */
const ZJU_TAB_HOST = /(^|\.)zju\.edu\.cn$/i;
const ZJU_TAB_LOGO = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NCA2NCIgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0Ij4KICA8cmVjdCB4PSIzIiB5PSIzIiB3aWR0aD0iNTgiIGhlaWdodD0iNTgiIHJ4PSIxMyIgZmlsbD0iI2ZmZmZmZiIgc3Ryb2tlPSIjQzlEQ0MyIiBzdHJva2Utd2lkdGg9IjIuNSIvPgogIDxnIGZpbGw9IiNDNkRDQTYiPgogICAgPHJlY3QgeD0iMjYuNSIgeT0iMTIiIHdpZHRoPSIxMSIgaGVpZ2h0PSI1IiByeD0iMi41Ii8+CiAgPC9nPgogIDxyZWN0IHg9IjE1IiB5PSIxOS41IiB3aWR0aD0iMzQiIGhlaWdodD0iNS41IiByeD0iMi43NSIgZmlsbD0iIzRGOEU5QyIvPgogIDxyZWN0IHg9IjIxIiB5PSIyNyIgd2lkdGg9IjIyIiBoZWlnaHQ9IjUuNSIgcng9IjIuNzUiIGZpbGw9IiM5ODUxNkYiLz4KICA8cmVjdCB4PSIyMS41IiB5PSIzNC41IiB3aWR0aD0iMjEiIGhlaWdodD0iNS41IiByeD0iMi43NSIgZmlsbD0iI0E4QUFBQyIvPgogIDxyZWN0IHg9IjI2LjUiIHk9IjQyIiB3aWR0aD0iMTEiIGhlaWdodD0iNSIgcng9IjIuNSIgZmlsbD0iI0VCRDBCRiIvPgogIDxyZWN0IHg9IjI3LjUiIHk9IjQ5IiB3aWR0aD0iOSIgaGVpZ2h0PSI0LjUiIHJ4PSIyLjI1IiBmaWxsPSIjRDNFNUMwIi8+Cjwvc3ZnPg==";
const ZJU_TAB_CSS = [
  '.workspace-tab-header.zs-zju-tab .workspace-tab-header-inner-icon {',
  '  background-image: url("' + ZJU_TAB_LOGO + '");',
  '  background-size: contain;',
  '  background-repeat: no-repeat;',
  '  background-position: center;',
  '}',
  '.workspace-tab-header.zs-zju-tab .workspace-tab-header-inner-icon > * { opacity: 0; }'
].join("\n");

/* 侧边栏「学在浙大」图标：彩色胶囊 logo，缩放 100/64 以适配 Obsidian 的 addIcon 视口 */
const ICON_ID_ZJU = "zhushi-zju";
const ZJU_ICON = `
  <g transform="translate(-10.8 -12.2) scale(1.9)">
    <rect x="26.5" y="12" width="11" height="5" rx="2.5" fill="#C6DCA6" />
    <rect x="15" y="19.5" width="34" height="5.5" rx="2.75" fill="#4F8E9C" />
    <rect x="21" y="27" width="22" height="5.5" rx="2.75" fill="#98516F" />
    <rect x="21.5" y="34.5" width="21" height="5.5" rx="2.75" fill="#A8AAAC" />
    <rect x="26.5" y="42" width="11" height="5" rx="2.5" fill="#EBD0BF" />
    <rect x="27.5" y="49" width="9" height="4.5" rx="2.25" fill="#D3E5C0" />
  </g>`;const ICON_ID_MUSHROOM = "zhushi-mushroom";
/* 线条风蘑菇：半圆菌盖 + 短菌柄 + 三个菌盖斑点 */
const MUSHROOM_ICON = `
  <g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M3.6 12.2C3.6 7.6 7.4 4 12 4s8.4 3.6 8.4 8.2c0 .6-.5 1-1.1 1H4.7c-.6 0-1.1-.4-1.1-1Z" />
    <path d="M9.6 13.4v3.3c0 1.9 1.1 3.3 2.4 3.3s2.4-1.4 2.4-3.3v-3.3" />
    <path d="M8.6 9.5h.01M12 7.3h.01M15.4 9.5h.01" />
  </g>`;

class ZhushiView extends ItemView {
  constructor(leaf) {
    super(leaf);
    this.frame = null;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "猪事顺利";
  }

  getIcon() {
    return ICON_ID;
  }

  async onOpen() {
    const host = this.contentEl;
    host.empty();
    host.style.padding = "0";
    host.style.overflow = "hidden";
    const html = await this.app.vault.adapter.read(PAGE_PATH);
    const frame = host.createEl("iframe", {
      attr: {
        style: "width:100%;height:100%;border:0;display:block;background:#fff"
      }
    });
    frame.srcdoc = html;
    this.frame = frame;
  }

  async onClose() {
    this.frame = null;
    this.contentEl.empty();
  }
}

module.exports = class ZhushiRibbonPlugin extends Plugin {
  async onload() {
    addIcon(ICON_ID, PIG_ICON);
    addIcon(ICON_ID_MUSHROOM, MUSHROOM_ICON);
    addIcon(ICON_ID_ZJU, ZJU_ICON);


    this.addCommand({ id: "open-zju", name: "打开学在浙大", callback: () => this.openZjuSite() });
    this.registerView(VIEW_TYPE, (leaf) => new ZhushiView(leaf));

    /* 学在浙大网页标签页改用「学在浙大」logo：核心 Web viewer 的图标来自站点 favicon */
    const tabStyle = document.createElement("style");
    tabStyle.id = "zhushroom-zju-tab-icon";
    tabStyle.textContent = ZJU_TAB_CSS;
    document.head.appendChild(tabStyle);
    this.register(() => tabStyle.remove());
    this.registerEvent(this.app.workspace.on("layout-change", () => this.markZjuTabs()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.markZjuTabs()));
    /* 记录「打开时间」，最近笔记才能真的按打开先后排序 */
    this.registerEvent(this.app.workspace.on("file-open", (file) => {
      if (!file || !file.path) return;
      this.openTimes = this.openTimes || {};
      this.openTimes[file.path] = Date.now();
      this.pruneOpenTimes();
      this.scheduleSaveOpenTimes();
    }));

    /* 上次保存的侧边栏图标：没存过就用小猪 */
    const data = await this.loadData();
    const logo = data && data.logo === "mushroom" ? "mushroom" : "pig";
    /* 每篇笔记最后一次被打开的时间（毫秒），右栏「最近笔记」按它排序 */
    this.openTimes = (data && data.openTimes && typeof data.openTimes === "object") ? data.openTimes : {};
    const iconId = logo === "mushroom" ? ICON_ID_MUSHROOM : ICON_ID;
    this.logo = logo;
    this.ribbonEl = this.addRibbonIcon(iconId, "打开猪事顺利", () => this.openPage());
    /* 侧边栏「学在浙大」入口：只负责在系统浏览器里打开学在浙大网站 */
    this.addRibbonIcon(ICON_ID_ZJU, "打开学在浙大", () => this.openZjuSite());
    this.addCommand({ id: "open-zhushi", name: "打开猪事顺利", callback: () => this.openPage() });

    this.registerDomEvent(window, "message", (ev) => this.onFrameMessage(ev));

    /* 启动时自动打开：等布局与各视图类型注册完成后再调，避免 view 类型尚未注册。
       先关掉上次留下的标签页，让每次启动都只剩「猪事顺利」这一页 */
    this.app.workspace.onLayoutReady(() => {
      window.setTimeout(async () => {
        await this.restoreSidebarsOnce();
        try {
          this.ensureOutlinePanel();
        } catch (e) {}
        this.closeOtherLeaves();
        await this.openPage(true);
        this.markZjuTabs();
      }, 300);
    });

    this.patchOpenFile();
  }

  onunload() {
    if (this._saveOpenTimesTimer) {
      clearTimeout(this._saveOpenTimesTimer);
      this._saveOpenTimesTimer = null;
    }
    this.unpatchOpenFile();
    try {
      this.app.workspace.iterateAllLeaves((leaf) => {
        if (leaf.tabHeaderEl) leaf.tabHeaderEl.classList.remove("zs-zju-tab");
      });
    } catch (e) {}
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  /* 用系统浏览器打开学在浙大：优先 Electron 的 shell.openExternal，退回 window.open */
  openZjuSite() {
    const url = "https://courses.zju.edu.cn/";
    try {
      const { shell } = require("electron");
      if (shell && shell.openExternal) {
        shell.openExternal(url);
        return;
      }
    } catch (e) {}
    window.open(url, "_blank", "noopener");
  }
  /* 给「学在浙大」网页标签页打标记：按 leaf 的 url 判断，命中就换图标 */
  markZjuTabs() {
    const ws = this.app.workspace;
    if (!ws || !ws.iterateAllLeaves) return;
    ws.iterateAllLeaves((leaf) => {
      let url = "";
      try {
        const st = leaf.view && leaf.view.getState ? leaf.view.getState() : null;
        url = (st && (st.url || st.state && st.state.url)) || (leaf.view && leaf.view.url) || "";
      } catch (e) {
        url = "";
      }
      let header = leaf.tabHeaderEl || null;
      if (!header) {
        /* 旧版本没有 tabHeaderEl：按标签标题文字找回对应表头 */
        let title = "";
        try {
          title = leaf.view && leaf.view.getDisplayText ? leaf.view.getDisplayText() : "";
        } catch (e) {
          title = "";
        }
        if (!title) return;
        const all = Array.prototype.slice.call(document.querySelectorAll(".workspace-tab-header"));
        header = all.find((h) => {
          const label = h.getAttribute("aria-label") || "";
          const text = (h.textContent || "").trim();
          return label === title || text === title;
        }) || null;
        if (!header) return;
      }
      let hit = false;
      try {
        hit = ZJU_TAB_HOST.test(new URL(String(url)).hostname);
      } catch (e) {
        hit = false;
      }
      header.classList.toggle("zs-zju-tab", hit);
    });
  }
  /* 关掉除本插件视图之外的所有标签页（启动时用，不保留上次会话） */
  /* 只清理主编辑区：左右侧边栏（文件浏览器、搜索、反向链接…）绝对不能动 */
  closeOtherLeaves() {
    const ws = this.app.workspace;
    const targets = [];
    ws.iterateAllLeaves((leaf) => {
      const root = leaf.getRoot ? leaf.getRoot() : null;
      if (root !== ws.rootSplit) return;           // 侧边栏叶子，跳过
      const type = leaf.view && leaf.view.getViewType ? leaf.view.getViewType() : "";
      if (type !== VIEW_TYPE) targets.push(leaf);
    });
    targets.forEach((leaf) => {
      try { leaf.detach(); } catch (e) { /* 已关闭 */ }
    });
  }

  /* 只做一次：把之前被误删的侧边栏视图补回来（文件浏览器 + 反向链接） */
  async restoreSidebarsOnce() {
    const data = (await this.loadData()) || {};
    if (data.sidebarsRestored) return;
    const ws = this.app.workspace;
    const hasType = (root, type) => {
      let found = false;
      ws.iterateAllLeaves((leaf) => {
        if (found) return;
        if ((leaf.getRoot ? leaf.getRoot() : null) !== root) return;
        const st = leaf.getViewState ? leaf.getViewState() : null;
        if (st && st.type === type) found = true;
      });
      return found;
    };
    try {
      if (!hasType(ws.leftSplit, "file-explorer")) {
        const leaf = ws.getLeftLeaf(false);
        if (leaf) await leaf.setViewState({ type: "file-explorer", active: false });
      }
      if (!hasType(ws.rightSplit, "backlink")) {
        const leaf = ws.getRightLeaf(false);
        if (leaf) await leaf.setViewState({ type: "backlink", active: false });
      }
    } catch (e) { /* 视图类型不可用时跳过 */ }
    data.sidebarsRestored = true;
    await this.saveData(data);
  }

  /* 让「打开文件」落到新标签页：否则点击笔记会把猪事顺利这一页顶掉 */
  patchOpenFile() {
    const proto = WorkspaceLeaf.prototype;
    const original = proto.openFile;
    if (!original) return;
    if (original[PATCH_MARK]) return;
    const self = this;

    /* 规则：打开任何文件都进新标签页，不覆盖当前这一页。
       例外只有两种 —— 目标就是当前页里的文件、当前页还是空标签（那就地打开，不浪费一个新页） */
    const patched = function (file, openState) {
      try {
        if (!(file instanceof TFile)) return original.call(this, file, openState);
        const state = this.getViewState ? this.getViewState() : null;
        const currentPath = state && state.state && state.state.file;
        if (currentPath === file.path) return original.call(this, file, openState);
        if (state && state.type === "empty") return original.call(this, file, openState);

        const existing = self.findLeafByPath(file.path);
        if (existing && existing !== this) {
          self.app.workspace.setActiveLeaf(existing, { focus: true });
          return Promise.resolve();
        }

        const leaf = self.app.workspace.getLeaf("tab");
        return original.call(leaf, file, Object.assign({}, openState, { active: true }));
      } catch (e) { /* 退回默认行为 */ }
      return original.call(this, file, openState);
    };
    patched[PATCH_MARK] = { previous: original };
    this._patchedOpenFile = patched;
    proto.openFile = patched;
  }


  /* 这个文件是不是已经在某个标签页里开着 */
  findLeafByPath(path) {
    let found = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (found) return;
      const state = leaf.getViewState ? leaf.getViewState() : null;
      if (state && state.state && state.state.file === path) found = leaf;
    });
    return found;
  }
  unpatchOpenFile() {
    const proto = WorkspaceLeaf.prototype;
    if (this._patchedOpenFile && proto.openFile === this._patchedOpenFile) {
      proto.openFile = this._patchedOpenFile[PATCH_MARK].previous;
    }
  }

  /* silent = true 时不弹「未找到」提示（启动自动打开用） */
  async openPage(silent) {
    const file = this.app.vault.getAbstractFileByPath(PAGE_PATH);
    if (!(file instanceof TFile)) {
      if (!silent) new Notice("未找到猪事顺利.html");
      return;
    }

    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }

    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  /* 页面的桥：握手 + 读写「日程」目录 */
  async onFrameMessage(ev) {
    const d = ev.data;
    if (!d || typeof d !== "object") return;
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    const view = leaves.map((l) => l.view).find((v) => v && v.frame && v.frame.contentWindow === ev.source);
    if (!view) return;

    if (d.zsPing) {
      ev.source.postMessage({ zsPong: true, rootName: SYNC_ROOT }, "*");
      return;
    }
    if (!d.zsReq) return;

    try {
      const value = await this.doFsOp(d.op, d.args || {});
      ev.source.postMessage({ zsReply: true, id: d.id, ok: true, value: value }, "*");
    } catch (e) {
      ev.source.postMessage({ zsReply: true, id: d.id, ok: false, error: String((e && e.message) || e) }, "*");
    }
  }

  /* 打开记录只留最近 300 条，避免 data.json 越滚越大 */
  pruneOpenTimes() {
    try {
      const entries = Object.entries(this.openTimes || {});
      if (entries.length <= 300) return;
      entries.sort((a, b) => b[1] - a[1]);
      this.openTimes = Object.fromEntries(entries.slice(0, 300));
    } catch (e) {}
  }

  /* 打开记录攒 1.5 秒再落盘，连续翻笔记不会每篇都写一次 data.json */
  scheduleSaveOpenTimes() {
    if (this._saveOpenTimesTimer) return;
    this._saveOpenTimesTimer = setTimeout(async () => {
      this._saveOpenTimesTimer = null;
      try {
        const data = (await this.loadData()) || {};
        data.openTimes = this.openTimes;
        await this.saveData(data);
      } catch (e) {}
    }, 1500);
  }
  /* 左栏加一个「大纲」面板：核心插件 outline 若被关掉就先打开，再在最左侧栏新建一个分栏放它 */
  ensureOutlinePanel() {
    try {
      const ip = this.app.internalPlugins;
      const outlinePlugin = ip && ip.plugins && ip.plugins.outline;
      if (outlinePlugin && outlinePlugin.enabled === false) {
        outlinePlugin.enable(true);
      }
    } catch (e) {}
    const ws = this.app.workspace;
    if (!ws) return;
    try {
      /* 已经有大纲面板（左栏右栏都算）就不再重复创建 */
      if (ws.getLeavesOfType("outline").length) return;
      const leaf = ws.getLeftLeaf(true);
      if (!leaf) return;
      leaf.setViewState({ type: "outline", active: false });
    } catch (e) {}
  }

  /* 切换左侧边栏图标：kind = "pig" | "mushroom" */
  async setLogo(kind) {
    try {
      const logo = kind === "mushroom" ? "mushroom" : "pig";
      const iconId = logo === "mushroom" ? ICON_ID_MUSHROOM : ICON_ID;
      this.logo = logo;
      if (this.ribbonEl) setIcon(this.ribbonEl, iconId);
      /* 已打开的视图：让标签页图标跟着变 */
      this.app.workspace.getLeavesOfType(VIEW_TYPE).forEach((leaf) => {
        if (leaf.view) leaf.view.getIcon = () => iconId;
        try {
          leaf.updateHeader();
        } catch (e) {}
      });
      await this.saveData({ logo: logo });
    } catch (e) {
      console.error("[猪事顺利] 切换侧边栏图标失败", e);
    }
  }

  async doFsOp(op, a) {
    const adapter = this.app.vault.adapter;
    const full = (p) => {
      const rel = String(p == null ? "" : p).replace(/^\/+/, "");
      return rel ? SYNC_ROOT + "/" + rel : SYNC_ROOT;
    };
    const ensureDir = async (path) => {
      const cut = path.lastIndexOf("/");
      if (cut <= 0) return;
      const dir = path.slice(0, cut);
      if (!(await adapter.exists(dir))) await adapter.mkdir(dir);
    };

    switch (op) {
      case "read": {
        const path = full(a.path);
        if (!(await adapter.exists(path))) return null;
        return await adapter.read(path);
      }
      case "write": {
        const path = full(a.path);
        await ensureDir(path);
        const text = String(a.data == null ? "" : a.data);
        const existing = this.app.vault.getAbstractFileByPath(path);
        if (existing instanceof TFile) {
          await this.app.vault.modify(existing, text);
        } else {
          try {
            await this.app.vault.create(path, text);
          } catch (e) {
            /* 磁盘上已有但索引里没有时，直接走 adapter 覆盖 */
            await adapter.write(path, text);
          }
        }
        return "ok";
      }
      case "exists":
        return await adapter.exists(full(a.path));
      case "mkdir": {
        const path = full(a.path);
        if (!(await adapter.exists(path))) await adapter.mkdir(path);
        return "ok";
      }
      case "remove": {
        const path = full(a.path);
        if (await adapter.exists(path)) await adapter.remove(path);
        return "ok";
      }
      /* 列出库里的所有文件夹，供「最近笔记」筛选面板使用 */
      case "folders": {
        const out = [];
        try {
          const all = this.app.vault.getAllLoadedFiles
            ? this.app.vault.getAllLoadedFiles()
            : [];
          for (const f of all) {
            if (!f || !f.path) continue;
            /* TFolder 才有 children 数组 */
            if (!Array.isArray(f.children)) continue;
            if (!f.path || f.path === "/") continue;
            out.push(f.path);
          }
        } catch (e) {}
        out.sort((x, y) => x.localeCompare(y));
        return out.slice(0, 800);
      }      /* 最近打开过的笔记：给页面右栏「最近笔记」用 */
      case "recent": {
        const limit = Math.max(1, Math.min(20, Number(a.limit) || 5));
        const times = this.openTimes && typeof this.openTimes === "object" ? this.openTimes : {};
        let files = [];
        try {
          files = this.app.vault.getMarkdownFiles() || [];
        } catch (e) {
          files = [];
        }
        /* 页面设置里限定只看某些文件夹时，按前缀过滤 */
        const folders = Array.isArray(a.folders)
          ? a.folders.map((x) => String(x || "").replace(/^\/+|\/+$/g, "")).filter(Boolean)
          : [];
        const inScope = (p) => {
          if (!folders.length) return true;
          const path = String(p || "");
          return folders.some((dir) => path === dir || path.startsWith(dir + "/"));
        };
        const scored = [];
        for (const f of files) {
          if (!f || !f.path) continue;
          if (!inScope(f.path)) continue;
          const opened = times[f.path] || 0;
          const mtime = (f.stat && f.stat.mtime) || 0;
          scored.push({
            path: f.path,
            name: f.name || f.path.split("/").pop(),
            /* 打开过的按打开时间；没打开过的用修改时间兜底，保证右栏一开始也有内容 */
            score: opened || mtime
          });
        }
        scored.sort((x, y) => y.score - x.score || x.path.localeCompare(y.path));
        const out = scored.slice(0, limit).map((x) => ({ path: x.path, name: x.name }));
        /* 万一 vault 拿不到列表，退回 Obsidian 自带的「最近打开」（限定文件夹时不用它，否则会绕过筛选） */
        if (!out.length && !folders.length) {
          try {
            const paths = this.app.workspace.getLastOpenFiles
              ? this.app.workspace.getLastOpenFiles()
              : [];
            for (const p of paths) {
              const path = /\.md$/i.test(p) ? p : p + ".md";
              if (!this.app.vault.getAbstractFileByPath(path)) continue;
              if (out.some((x) => x.path === path)) continue;
              out.push({ path, name: path.split("/").pop() });
              if (out.length >= limit) break;
            }
          } catch (e) {}
        }
        return out;
      }      /* 从页面点开一条笔记：开在新标签页，不影响当前页面 */
      case "openFile": {
        const file = this.app.vault.getAbstractFileByPath(String(a.path || ""));
        if (!file) return false;
        const leaf = this.app.workspace.getLeaf("tab");
        if (!leaf) return false;
        await leaf.openFile(file, { active: true });
        return true;
      }      case "list": {
        const path = full(a.path);
        if (!(await adapter.exists(path))) return [];
        const listed = await adapter.list(path);
        const prefix = path + "/";
        return listed.files
          .map((p) => ({ name: p.slice(prefix.length), kind: "file" }))
          .concat(listed.folders.map((p) => ({ name: p.slice(prefix.length), kind: "directory" })));
      }
      case "setLogo":
        await this.setLogo(a.kind);
        return "ok";
      default:
        throw new Error("未知操作：" + op);
    }
  }
};
