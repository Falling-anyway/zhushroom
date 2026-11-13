"use strict";

const { addIcon, ItemView, Notice, Plugin, setIcon, TFile } = require("obsidian");

const PAGE_PATH = "猪事顺利.html";
const VIEW_TYPE = "zhushroom-page-view";
const ICON_ID = "zhushi-pig";
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

const ICON_ID_MUSHROOM = "zhushi-mushroom";
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
    this.registerView(VIEW_TYPE, (leaf) => new ZhushiView(leaf));

    /* 上次保存的侧边栏图标：没存过就用小猪 */
    const data = await this.loadData();
    const logo = data && data.logo === "mushroom" ? "mushroom" : "pig";
    const iconId = logo === "mushroom" ? ICON_ID_MUSHROOM : ICON_ID;
    this.logo = logo;
    this.ribbonEl = this.addRibbonIcon(iconId, "打开猪事顺利", () => this.openPage());
    this.addCommand({ id: "open-zhushi", name: "打开猪事顺利", callback: () => this.openPage() });

    this.registerDomEvent(window, "message", (ev) => this.onFrameMessage(ev));

    /* 启动时自动打开：等布局与各视图类型注册完成后再调，避免 view 类型尚未注册 */
    this.app.workspace.onLayoutReady(() => {
      window.setTimeout(() => this.openPage(true), 300);
    });
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
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
      case "list": {
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
