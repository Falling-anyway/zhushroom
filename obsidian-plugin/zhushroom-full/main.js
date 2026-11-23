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
  <path fill="currentColor" fill-rule="evenodd" d="M51.89 84.43 L47.13 84.43 L36.11 83.46 L31.57 82.81 L26.60 81.51 L24.32 80.44 L22.65 79.08 L21.46 76.92 L20.64 72.76 L13.30 72.22 L11.02 71.35 L10.05 70.49 L7.83 68.05 L6.00 62.97 L6.00 58.76 L6.76 54.00 L9.35 46.87 L13.03 39.95 L19.78 31.68 L18.97 36.16 L19.30 40.71 L21.03 45.35 L23.25 47.57 L25.73 49.08 L28.65 49.84 L32.54 49.63 L36.86 48.33 L34.33 44.59 L33.24 42.21 L33.62 40.44 L35.68 39.89 L37.45 41.24 L40.16 45.35 L37.24 48.05 L38.32 49.79 L41.40 52.98 L42.81 52.87 L44.27 51.73 L44.48 50.65 L40.81 46.75 L40.37 45.79 L41.73 45.08 L42.98 43.73 L44.48 40.48 L44.92 34.44 L43.62 30.54 L40.00 26.27 L37.62 24.76 L32.87 23.57 L28.49 23.83 L33.73 20.11 L36.86 18.49 L41.62 16.65 L46.81 15.57 L53.19 15.57 L60.11 17.19 L66.27 20.11 L75.89 27.24 L80.70 32.49 L77.51 33.19 L74.64 37.13 L74.10 41.35 L74.97 43.63 L76.86 45.62 L78.05 46.16 L79.67 46.59 L82.49 46.28 L84.32 45.29 L85.78 43.73 L86.54 41.90 L86.70 39.68 L89.03 43.40 L91.29 48.38 L93.24 54.00 L94.00 58.76 L93.78 63.95 L92.48 67.41 L90.98 69.57 L88.97 71.35 L86.70 72.22 L79.67 72.65 L78.32 77.36 L76.70 79.52 L74.59 81.30 L72.11 82.38 L68.33 83.24 L51.89 84.43 Z M52.60 81.90 L67.57 81.08 L71.89 80.11 L74.06 79.03 L75.95 77.13 L77.02 73.46 L76.26 67.95 L74.21 64.16 L71.57 61.73 L66.38 59.25 L57.41 57.95 L47.03 57.62 L37.19 58.49 L32.76 59.46 L28.22 61.84 L25.57 64.49 L23.72 67.95 L23.29 69.79 L23.41 74.87 L24.05 77.13 L24.87 77.83 L30.05 80.01 L34.06 80.87 L36.65 80.87 L41.62 81.84 L52.60 81.90 Z M40.86 78.06 L39.14 77.62 L38.44 76.81 L37.57 74.54 L37.35 72.28 L37.57 69.79 L38.97 65.46 L40.10 64.22 L41.62 64.00 L42.53 64.82 L43.72 67.84 L43.95 72.71 L42.98 76.60 L42.49 77.30 L40.86 78.06 Z M59.67 78.06 L57.45 77.24 L56.05 72.81 L56.26 67.84 L57.45 64.82 L58.38 64.00 L59.90 64.22 L61.03 65.46 L62.53 70.54 L62.65 73.14 L62.10 75.73 L60.76 77.73 L59.67 78.06 Z M63.62 50.11 L65.88 48.60 L65.88 46.22 L64.11 44.12 L63.13 43.79 L61.07 44.12 L58.97 46.11 L58.97 48.93 L60.11 49.84 L63.62 50.11 Z" />
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
