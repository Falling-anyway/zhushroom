"use strict";

const { addIcon, ItemView, Notice, Plugin, setIcon, TFile } = require("obsidian");

const PAGE_PATH = "猪事顺利.html";
const VIEW_TYPE = "zhushroom-page-view";
const ICON_ID = "zhushi-pig";
/* openFile 补丁的标记，避免与其它插件互相覆盖 */
/* 页面里的「选择 Obsidian 库」选的就是这一层；插件直写时也以它为根 */
const SYNC_ROOT = "日程";
let currentLogo = "mushroom";   /* 当前侧边栏图标：mushroom（默认）| pig */
const PIG_ICON = `
  <g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M5.5 8 4 4.5l4 1.2M18.5 8 20 4.5l-4 1.2" />
    <path d="M12 5c-5.5 0-9 3.4-9 8s3.7 8 9 8 9-3.4 9-8-3.5-8-9-8Z" />
    <path d="M8.5 11h.01M15.5 11h.01" />
    <ellipse cx="12" cy="15.4" rx="3.1" ry="2.2" />
    <path d="M11 15.4h.01M13 15.4h.01" />
  </g>`;

const ICON_ID_MUSHROOM = "zhushi-mushroom";
/* 实心蘑菇（由图片矢量化描出，单色 currentColor，深浅主题自动反色） */
const MUSHROOM_ICON = `
  <path fill="currentColor" fill-rule="evenodd" d="M51.57 68.47 L47.50 68.47 L38.06 67.64 L34.17 67.08 L29.91 65.97 L27.96 65.05 L26.53 63.89 L25.51 62.04 L24.81 58.47 L18.52 58.01 L16.57 57.27 L15.74 56.53 L13.84 54.44 L12.27 50.09 L12.27 46.48 L12.92 42.41 L15.14 36.30 L18.29 30.37 L24.07 23.29 L23.38 27.13 L23.66 31.02 L25.14 35.00 L27.04 36.90 L29.17 38.19 L31.67 38.84 L35.00 38.66 L38.70 37.55 L36.53 34.35 L35.60 32.31 L35.93 30.79 L37.69 30.32 L39.21 31.48 L41.53 35.00 L39.03 37.31 L39.95 38.80 L42.59 41.53 L43.80 41.44 L45.05 40.46 L45.23 39.54 L42.08 36.20 L41.71 35.37 L42.87 34.77 L43.94 33.61 L45.23 30.83 L45.60 25.65 L44.49 22.31 L41.39 18.66 L39.35 17.36 L35.28 16.34 L31.53 16.57 L36.02 13.38 L38.70 11.99 L42.78 10.42 L47.22 9.49 L52.69 9.49 L58.61 10.88 L63.89 13.38 L72.13 19.49 L76.25 23.98 L73.52 24.58 L71.06 27.96 L70.60 31.57 L71.34 33.52 L72.96 35.23 L73.98 35.69 L75.37 36.06 L77.78 35.79 L79.35 34.95 L80.60 33.61 L81.25 32.04 L81.39 30.14 L83.38 33.33 L85.32 37.59 L86.99 42.41 L87.64 46.48 L87.45 50.93 L86.34 53.89 L85.05 55.74 L83.33 57.27 L81.39 58.01 L75.37 58.38 L74.21 62.41 L72.82 64.26 L71.02 65.79 L68.89 66.71 L65.65 67.45 L51.57 68.47 Z M52.18 66.30 L65.00 65.60 L68.70 64.77 L70.56 63.84 L72.18 62.22 L73.10 59.07 L72.45 54.35 L70.69 51.11 L68.43 49.03 L63.98 46.90 L56.30 45.79 L47.41 45.51 L38.98 46.25 L35.19 47.08 L31.30 49.12 L29.03 51.39 L27.45 54.35 L27.08 55.93 L27.18 60.28 L27.73 62.22 L28.43 62.82 L32.87 64.68 L36.30 65.42 L38.52 65.42 L42.78 66.25 L52.18 66.30 Z M42.13 63.01 L40.65 62.64 L40.05 61.94 L39.31 60.00 L39.12 58.06 L39.31 55.93 L40.51 52.22 L41.48 51.16 L42.78 50.97 L43.56 51.67 L44.58 54.26 L44.77 58.43 L43.94 61.76 L43.52 62.36 L42.13 63.01 Z M58.24 63.01 L56.34 62.31 L55.14 58.52 L55.32 54.26 L56.34 51.67 L57.13 50.97 L58.43 51.16 L59.40 52.22 L60.69 56.57 L60.79 58.80 L60.32 61.02 L59.17 62.73 L58.24 63.01 Z M61.62 39.07 L63.56 37.78 L63.56 35.74 L62.04 33.94 L61.20 33.66 L59.44 33.94 L57.64 35.65 L57.64 38.06 L58.61 38.84 L61.62 39.07 Z" />
`;

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
    return currentLogo === "pig" ? ICON_ID : ICON_ID_MUSHROOM;
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
    this.registerView(VIEW_TYPE, (leaf) => new ZhushiView(leaf));

    /* 记录「打开时间」，最近笔记才能真的按打开先后排序 */
    this.registerEvent(this.app.workspace.on("file-open", (file) => {
      if (!file || !file.path) return;
      this.openTimes = this.openTimes || {};
      this.openTimes[file.path] = Date.now();
      this.pruneOpenTimes();
      this.scheduleSaveOpenTimes();
    }));

    /* 上次保存的侧边栏图标：没存过就用蘑菇 */
    const data = await this.loadData();
    const logo = data && data.logo === "pig" ? "pig" : "mushroom";
    /* 每篇笔记最后一次被打开的时间（毫秒），右栏「最近笔记」按它排序 */
    this.openTimes = (data && data.openTimes && typeof data.openTimes === "object") ? data.openTimes : {};
    const iconId = logo === "mushroom" ? ICON_ID_MUSHROOM : ICON_ID;
    this.logo = logo;
    currentLogo = logo;
    this.ribbonEl = this.addRibbonIcon(iconId, "打开猪事顺利", () => this.openPage());
    this.addCommand({ id: "open-zhushi", name: "打开猪事顺利", callback: () => this.openPage() });

    this.registerDomEvent(window, "message", (ev) => this.onFrameMessage(ev));

    /* 启动时自动打开：等布局与各视图类型注册完成后再调，避免 view 类型尚未注册。
       先关掉上次留下的标签页，让每次启动都只剩「猪事顺利」这一页 */
    this.app.workspace.onLayoutReady(() => {
      window.setTimeout(async () => {
        await this.restoreSidebarsOnce();
        this.closeOtherLeaves();
        await this.openPage(true);
      }, 300);
    });

  }

  onunload() {
    if (this._saveOpenTimesTimer) {
      clearTimeout(this._saveOpenTimesTimer);
      this._saveOpenTimesTimer = null;
    }
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
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

  /* 切换左侧边栏图标：kind = "pig" | "mushroom" */
  async setLogo(kind) {
    try {
      const logo = kind === "pig" ? "pig" : "mushroom";
      const iconId = logo === "mushroom" ? ICON_ID_MUSHROOM : ICON_ID;
      this.logo = logo;
      currentLogo = logo;
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
      /* 给「最近笔记」范围选择器：一次返回所有文件夹与所有笔记 */
      case "tree": {
        const folders = [];
        const notes = [];
        try {
          const all = this.app.vault.getAllLoadedFiles
            ? this.app.vault.getAllLoadedFiles()
            : [];
          for (const f of all) {
            if (!f || !f.path) continue;
            if (Array.isArray(f.children)) {
              if (f.path && f.path !== "/") folders.push(f.path);
            } else if (/\.md$/i.test(f.path)) {
              notes.push(f.path);
            }
          }
        } catch (e) {}
        folders.sort((x, y) => x.localeCompare(y));
        notes.sort((x, y) => x.localeCompare(y));
        return { folders: folders.slice(0, 1200), notes: notes.slice(0, 4000) };
      }      /* 列出库里的所有文件夹，供「最近笔记」筛选面板使用 */
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
        /* 页面设置的显示范围：include = 只看这些，exclude = 不显示这些；都能是文件夹或单篇笔记。
           同一路径同时命中时取较深的规则，同深度以「不显示」优先 */
        const normPath = (x) => String(x || "").replace(/^\/+|\/+$/g, "");
        const incList = Array.isArray(a.include) ? a.include.map(normPath).filter(Boolean) : [];
        const excList = Array.isArray(a.exclude) ? a.exclude.map(normPath).filter(Boolean) : [];
        /* 兼容旧参数：folders 视为 include */
        if (!incList.length && Array.isArray(a.folders)) {
          a.folders.map(normPath).filter(Boolean).forEach((x) => incList.push(x));
        }
        const scopeState = (p) => {
          const path = String(p || "");
          let best = { depth: -1, state: "" };
          const consider = (list, state) => {
            for (const entry of list) {
              if (path !== entry && !path.startsWith(entry + "/")) continue;
              const depth = entry.split("/").length;
              if (depth > best.depth || (depth === best.depth && state === "hide")) {
                best = { depth, state };
              }
            }
          };
          consider(incList, "show");
          consider(excList, "hide");
          if (best.state) return best.state;
          return incList.length ? "hide" : "show";
        };
        const inScope = (p) => scopeState(p) === "show";
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
        if (!out.length && !incList.length && !excList.length) {
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
