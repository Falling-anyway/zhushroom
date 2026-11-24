"use strict";

const { addIcon, ItemView, Notice, Platform, Plugin, PluginSettingTab, Setting, setIcon, TFile } = require("obsidian");

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

/* ==== PET_ART_BEGIN ==== */
/* 桌宠美术：红色蘑菇。轮廓从 MUSHROOM_ICON 的路径拆成四段，
   叠色顺序 = 身体(红) → 脸(白) → 帽上斑点(白) → 眼睛(红)，与原图一致。 */
const PET_INK = "#9D2932";
const PET_FACE_COLOR = "#FFFFFF";
const PET_SHADOW = "rgba(60, 20, 26, 0.18)";

const PET_BODY_D = "M51.89 84.43 L47.13 84.43 L36.11 83.46 L31.57 82.81 L26.60 81.51 L24.32 80.44 L22.65 79.08 L21.46 76.92 L20.64 72.76 L13.30 72.22 L11.02 71.35 L10.05 70.49 L7.83 68.05 L6.00 62.97 L6.00 58.76 L6.76 54.00 L9.35 46.87 L13.03 39.95 L19.78 31.68 L18.97 36.16 L19.30 40.71 L21.03 45.35 L23.25 47.57 L25.73 49.08 L28.65 49.84 L32.54 49.63 L36.86 48.33 L34.33 44.59 L33.24 42.21 L33.62 40.44 L35.68 39.89 L37.45 41.24 L40.16 45.35 L37.24 48.05 L38.32 49.79 L41.40 52.98 L42.81 52.87 L44.27 51.73 L44.48 50.65 L40.81 46.75 L40.37 45.79 L41.73 45.08 L42.98 43.73 L44.48 40.48 L44.92 34.44 L43.62 30.54 L40.00 26.27 L37.62 24.76 L32.87 23.57 L28.49 23.83 L33.73 20.11 L36.86 18.49 L41.62 16.65 L46.81 15.57 L53.19 15.57 L60.11 17.19 L66.27 20.11 L75.89 27.24 L80.70 32.49 L77.51 33.19 L74.64 37.13 L74.10 41.35 L74.97 43.63 L76.86 45.62 L78.05 46.16 L79.67 46.59 L82.49 46.28 L84.32 45.29 L85.78 43.73 L86.54 41.90 L86.70 39.68 L89.03 43.40 L91.29 48.38 L93.24 54.00 L94.00 58.76 L93.78 63.95 L92.48 67.41 L90.98 69.57 L88.97 71.35 L86.70 72.22 L79.67 72.65 L78.32 77.36 L76.70 79.52 L74.59 81.30 L72.11 82.38 L68.33 83.24 L51.89 84.43 Z";
const PET_FACE_D = "M52.60 81.90 L67.57 81.08 L71.89 80.11 L74.06 79.03 L75.95 77.13 L77.02 73.46 L76.26 67.95 L74.21 64.16 L71.57 61.73 L66.38 59.25 L57.41 57.95 L47.03 57.62 L37.19 58.49 L32.76 59.46 L28.22 61.84 L25.57 64.49 L23.72 67.95 L23.29 69.79 L23.41 74.87 L24.05 77.13 L24.87 77.83 L30.05 80.01 L34.06 80.87 L36.65 80.87 L41.62 81.84 L52.60 81.90 Z";
const PET_DOT_D = "M63.62 50.11 L65.88 48.60 L65.88 46.22 L64.11 44.12 L63.13 43.79 L61.07 44.12 L58.97 46.11 L58.97 48.93 L60.11 49.84 L63.62 50.11 Z";
const PET_EYE_D = ["M40.86 78.06 L39.14 77.62 L38.44 76.81 L37.57 74.54 L37.35 72.28 L37.57 69.79 L38.97 65.46 L40.10 64.22 L41.62 64.00 L42.53 64.82 L43.72 67.84 L43.95 72.71 L42.98 76.60 L42.49 77.30 L40.86 78.06 Z", "M59.67 78.06 L57.45 77.24 L56.05 72.81 L56.26 67.84 L57.45 64.82 L58.38 64.00 L59.90 64.22 L61.03 65.46 L62.53 70.54 L62.65 73.14 L62.10 75.73 L60.76 77.73 L59.67 78.06 Z"];

/* 每种表情：eyes 会跟着鼠标平移，extras 不跟随 */
const PET_MOOD_FACES = {
  neutral: {
    eyes: [
      { d: PET_EYE_D[0], fill: true },
      { d: PET_EYE_D[1], fill: true }
    ],
    extras: []
  },
  happy: {
    eyes: [
      { d: "M36.20 71.60 Q40.65 64.60 45.10 71.60", stroke: 2.60 },
      { d: "M54.90 71.60 Q59.35 64.60 63.80 71.60", stroke: 2.60 }
    ],
    extras: [
      { type: "blush" },
      { d: "M45.20 79.40 Q50.00 83.40 54.80 79.40", stroke: 2.20 }
    ]
  },
  angry: {
    eyes: [
      { d: "M36.00 67.60 L44.90 71.80 L44.90 74.60 L36.00 70.40 Z", fill: true },
      { d: "M64.00 67.60 L55.10 71.80 L55.10 74.60 L64.00 70.40 Z", fill: true }
    ],
    extras: [
      { d: "M34.20 62.60 L46.40 67.20", stroke: 2.20 },
      { d: "M65.80 62.60 L53.60 67.20", stroke: 2.20 },
      { d: "M46.20 80.40 L53.80 80.40", stroke: 2.20 },
      { type: "anger" }
    ]
  },
  sleepy: {
    eyes: [
      { d: "M36.60 71.40 Q40.65 73.60 44.70 71.40", stroke: 2.60 },
      { d: "M55.30 71.40 Q59.35 73.60 63.40 71.40", stroke: 2.60 }
    ],
    extras: [
      { d: "M47.60 80.20 Q50.00 82.20 52.40 80.20", stroke: 2.00 },
      { type: "zzz" }
    ]
  },
  surprised: {
    eyes: [
      { type: "circle", cx: 40.65, cy: 70.60, r: 3.50 },
      { type: "circle", cx: 59.35, cy: 70.60, r: 3.50 }
    ],
    extras: [
      { type: "circle", cx: 50.00, cy: 80.40, r: 2.60 },
      { type: "bang" }
    ]
  }
};

/* 每种表情随机挑一句 */
const PET_LINES = {
  neutral: ["咕噜～", "我在这儿", "慢慢来"],
  happy: ["咕噜咕噜～", "今天也辛苦啦", "摸摸头最好了"],
  angry: ["再戳就生气啦！", "哼！", "别戳了别戳了"],
  sleepy: ["让我眯一会儿…", "好困呀…", "呼…呼…"],
  surprised: ["诶？", "吓我一跳", "怎么了怎么了"]
};

/* 把 "M x y Q …Z" 里的所有坐标点整体平移 / 纵向缩放（只用于跟随与眨眼） */
function petShiftPath(d, dx, dy, sy) {
  const nums = String(d).match(/-?\d+(?:\.\d+)?/g) || [];
  if (nums.length < 4 || nums.length % 2 !== 0) return d;
  const pts = [];
  for (let i = 0; i < nums.length; i += 2) pts.push([parseFloat(nums[i]), parseFloat(nums[i + 1])]);
  let cy = 0;
  for (const p of pts) cy += p[1];
  cy /= pts.length;
  /* 按「每两个数一个点」重排：偶数位是 x，奇数位是 y（含 Q 的控制点） */
  let idx = 0;
  return String(d).replace(/-?\d+(?:\.\d+)?/g, () => {
    const p = pts[idx >> 1];
    const v = (idx % 2 === 0) ? p[0] + dx : cy + (p[1] - cy) * sy + dy;
    idx += 1;
    return v.toFixed(2);
  });
}
/* ==== PET_ART_END ==== */

/* ==== PET_CSS_BEGIN ==== */
const PET_CSS = [
  "#zhushroom-pet{position:fixed;z-index:100;pointer-events:none;left:0;top:0;will-change:transform}",
  "#zhushroom-pet .zspet-look{transform:translate(var(--lx,0px),var(--ly,0px));transition:transform .1s linear}",
  "#zhushroom-pet .zspet-svg{display:block;width:100%;height:100%;pointer-events:auto;cursor:grab;overflow:visible;",
  "  filter:drop-shadow(0 6px 10px " + PET_SHADOW + ");transition:transform .16s ease}",
  "#zhushroom-pet:hover .zspet-svg{transform:scale(1.04)}",
  "#zhushroom-pet.is-dragging .zspet-svg{cursor:grabbing;transform:scale(1.06)}",
  "#zhushroom-pet.is-dragging .zspet-art{animation:none}",
  "#zhushroom-pet.pet-breath .zspet-art{animation:zspetBreath 4.2s ease-in-out infinite;transform-origin:50% 92%}",
  "@keyframes zspetBreath{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2px) scale(1.012)}}",
  "#zhushroom-pet.pet-hop .zspet-art{animation:zspetHop .6s cubic-bezier(.34,1.4,.64,1)}",
  "@keyframes zspetHop{0%,100%{transform:translateY(0) scale(1)}35%{transform:translateY(-7px) scale(.98,1.03)}70%{transform:translateY(0) scale(1.04,.96)}}",
  "#zhushroom-pet.mood-angry .zspet-art{animation:zspetShake .28s ease-in-out 3}",
  "@keyframes zspetShake{0%,100%{transform:translateX(0) rotate(0)}25%{transform:translateX(-2px) rotate(-2deg)}75%{transform:translateX(2px) rotate(2deg)}}",
  "#zhushroom-pet.mood-surprised .zspet-art{animation:zspetPop .32s cubic-bezier(.34,1.56,.64,1)}",
  "@keyframes zspetPop{0%{transform:scale(1)}45%{transform:scale(1.12,.92)}100%{transform:scale(1)}}",
  "#zhushroom-pet .zspet-eye,#zhushroom-pet .zspet-extras path,#zhushroom-pet .zspet-extras circle{transition:opacity .12s linear}",
  "#zhushroom-pet .zspet-blush{fill:" + PET_INK + ";opacity:.22}",
  "#zhushroom-pet .zspet-anger{stroke:" + PET_INK + ";stroke-width:2.2;stroke-linecap:round;fill:none;animation:zspetAnger .9s ease-in-out infinite}",
  "@keyframes zspetAnger{0%,100%{opacity:.78}50%{opacity:1}}",
  "#zhushroom-pet .zspet-zzz{fill:" + PET_INK + ";font-size:10px;font-weight:700;opacity:.6;animation:zspetZzz 2.6s ease-in-out infinite}",
  "@keyframes zspetZzz{0%,100%{opacity:.15;transform:translateY(0)}50%{opacity:.6;transform:translateY(-2px)}}",
  "#zhushroom-pet .zspet-bang{stroke:" + PET_INK + ";stroke-width:3;stroke-linecap:round;fill:none}",
  "#zhushroom-pet .zspet-bubble{position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%) translateY(4px);",
  "  max-width:180px;padding:6px 10px;border-radius:12px;background:var(--background-primary,#fff);color:var(--text-normal,#333);",
  "  border:1px solid var(--background-modifier-border,#e2e2e2);box-shadow:0 4px 14px " + PET_SHADOW + ";",
  "  font-size:12px;line-height:1.4;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}",
  "#zhushroom-pet .zspet-bubble.on{opacity:1;transform:translateX(-50%) translateY(0)}",
  "html.zspet-no-motion #zhushroom-pet .zspet-art,html.zspet-no-motion #zhushroom-pet .zspet-anger,",
  "html.zspet-no-motion #zhushroom-pet .zspet-zzz{animation:none!important}",
  "@media (prefers-reduced-motion: reduce){#zhushroom-pet .zspet-art,#zhushroom-pet .zspet-anger,#zhushroom-pet .zspet-zzz{animation:none!important}}"
].join("\n");
/* ==== PET_CSS_END ==== */

/* ==== PET_LOGIC_BEGIN ==== */
const PET_SIZE_MIN = 72;
const PET_SIZE_MAX = 120;
const PET_DEFAULT = { x: 0.94, y: 0.90, scale: 96, enabled: true, bubble: true, motion: true };

class ZhushiPet {
  constructor(plugin) {
    this.plugin = plugin;
    this.el = null;
    this.svg = null;
    this.faceLayer = null;
    this.eyeEls = [];
    this.eyeBase = [];
    this.mood = "neutral";
    this.pokeCount = 0;
    this.pokeTimer = null;
    this.blinkTimer = null;
    this.sleepTimer = null;
    this.bubbleTimer = null;
    this.saveTimer = null;
    this.drag = null;
    this.eyeDX = 0;
    this.eyeDY = 0;
    this.eyeTX = 0;
    this.eyeTY = 0;
    this.raf = 0;
    this.idleTimer = null;
    this.lastPointerAt = 0;
    this.pointer = { x: -1, y: -1 };
    this.onMoveBound = false;
    this.cfg = Object.assign({}, PET_DEFAULT, plugin.petState || {});
    this._onPointerMove = this.onPointerMove.bind(this);
    this._onPointerDownDoc = this.onDocPointerDown.bind(this);
    this._onResize = this.onResize.bind(this);
    this._onVisibility = this.onVisibility.bind(this);
    this._onMoveDrag = this.onDragMove.bind(this);
    this._onUpDrag = this.onDragEnd.bind(this);
  }

  mount() {
    if (!this.cfg.enabled) return;
    if (document.getElementById("zhushroom-pet")) return;
    const wrap = document.createElement("div");
    wrap.id = "zhushroom-pet";
    wrap.className = "pet-breath mood-neutral";
    wrap.style.width = this.size() + "px";
    wrap.style.height = this.size() + "px";
    wrap.innerHTML =
      '<div class="zspet-bubble" aria-hidden="true"></div>' +
      '<svg class="zspet-svg" viewBox="0 0 100 100" aria-hidden="true">' +
      '<g class="zspet-look">' +
      '<g class="zspet-art">' +
      '<path class="zspet-body" d="' + PET_BODY_D + '" fill="' + PET_INK + '"/>' +
      '<path class="zspet-face" d="' + PET_FACE_D + '" fill="' + PET_FACE_COLOR + '"/>' +
      '<path class="zspet-dot" d="' + PET_DOT_D + '" fill="' + PET_FACE_COLOR + '"/>' +
      '<g class="zspet-extras"></g>' +
      '<g class="zspet-eyes"></g>' +
      "</g></g></svg>";
    document.body.appendChild(wrap);
    this.el = wrap;
    this.svg = wrap.querySelector(".zspet-svg");
    this.faceLayer = wrap.querySelector(".zspet-eyes");
    this.extraLayer = wrap.querySelector(".zspet-extras");
    this.applyPosition();
    this.paintMood("neutral");
    this.svg.addEventListener("pointerdown", (e) => this.onDragStart(e));
    this.svg.addEventListener("dblclick", (e) => { e.preventDefault(); this.setMood("surprised", 700); });
    document.addEventListener("pointermove", this._onPointerMove, { passive: true });
    document.addEventListener("pointerdown", this._onPointerDownDoc, { passive: true });
    window.addEventListener("resize", this._onResize);
    document.addEventListener("visibilitychange", this._onVisibility);
    this.onMoveBound = true;
    this.applyMotion();
    this.restartSleepTimer();
  }

  size() {
    const n = Number(this.cfg.scale) || 96;
    return Math.max(PET_SIZE_MIN, Math.min(PET_SIZE_MAX, n));
  }

  applyPosition() {
    if (!this.el) return;
    const w = this.size();
    const maxX = Math.max(0, window.innerWidth - w);
    const maxY = Math.max(0, window.innerHeight - w);
    const left = Math.min(maxX, Math.max(0, Number(this.cfg.x) * maxX || 0));
    const top = Math.min(maxY, Math.max(0, Number(this.cfg.y) * maxY || 0));
    this.el.style.left = Math.round(left) + "px";
    this.el.style.top = Math.round(top) + "px";
  }

  applyMotion() {
    const on = this.cfg.motion !== false && !matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.toggle("zspet-no-motion", !on);
    this.el && this.el.classList.toggle("pet-breath", !!on);
    if (!on) {
      this.stopBlink();
      this.stopIdle();
      this.stopEyeLoop();
      this.detachFollow();
    } else {
      this.startBlink();
      this.attachFollow();
      this.startIdle();
      this.startEyeLoop();
    }
  }

  /* ---------- 表情 ---------- */
  paintMood(mood) {
    if (!this.faceLayer) return;
    const face = PET_MOOD_FACES[mood] || PET_MOOD_FACES.neutral;
    this.eyeEls = [];
    this.eyeBase = [];
    let html = "";
    face.eyes.forEach((e) => {
      if (e.type === "circle") {
        html += '<circle class="zspet-eye" cx="' + e.cx + '" cy="' + e.cy + '" r="' + e.r + '" fill="' + PET_INK + '"/>';
        return;
      }
      const stroke = e.stroke ? ' stroke="' + PET_INK + '" stroke-width="' + e.stroke + '" stroke-linecap="round" fill="none"' : ' fill="' + PET_INK + '"';
      html += '<path class="zspet-eye" d="' + e.d + '"' + stroke + "/>";
      this.eyeBase.push(e.d);
    });
    this.faceLayer.innerHTML = html;
    this.eyeEls = Array.prototype.slice.call(this.faceLayer.querySelectorAll(".zspet-eye"));

    let extra = "";
    face.extras.forEach((x) => {
      if (x.type === "blush") {
        extra += '<ellipse class="zspet-blush" cx="30.5" cy="74.6" rx="4.2" ry="2.3"/>';
        extra += '<ellipse class="zspet-blush" cx="69.5" cy="74.6" rx="4.2" ry="2.3"/>';
      } else if (x.type === "anger") {
        extra += '<g class="zspet-anger"><path d="M76 16 L84 24"/><path d="M84 16 L76 24"/></g>';
      } else if (x.type === "zzz") {
        extra += '<text class="zspet-zzz" x="76" y="28">z</text><text class="zspet-zzz" x="84" y="19">z</text>';
      } else if (x.type === "bang") {
        extra += '<path class="zspet-bang" d="M86 15 L86 25"/><circle cx="86" cy="29.5" r="1.8" fill="' + PET_INK + '"/>';
      } else if (x.type === "circle") {
        extra += '<circle cx="' + x.cx + '" cy="' + x.cy + '" r="' + x.r + '" fill="' + PET_INK + '"/>';
      } else {
        extra += '<path d="' + x.d + '" stroke="' + PET_INK + '" stroke-width="' + x.stroke + '" stroke-linecap="round" fill="none"/>';
      }
    });
    if (this.extraLayer) this.extraLayer.innerHTML = extra;
    this.applyEyes();
  }

  setMood(mood, holdMs) {
    if (!this.el) return;
    this.mood = mood;
    this.el.className = "pet-breath mood-" + mood + (this.cfg.motion === false ? " no-motion" : "");
    this.paintMood(mood);
    if (holdMs) setTimeout(() => { if (this.mood === mood) this.setMood("neutral"); }, holdMs);
    this.restartSleepTimer();
  }

  applyEyes() {
    const sy = this.blinking ? 0.18 : 1;
    this.eyeEls.forEach((el, i) => {
      const base = this.eyeBase[i];
      if (!base) return;
      el.setAttribute("d", petShiftPath(base, this.eyeDX, this.eyeDY, sy));
    });
  }

  /* ---------- 眨眼 ---------- */
  startBlink() {
    if (this.blinkTimer) return;
    this.blinkTimer = setInterval(() => {
      if (document.hidden) return;
      this.blinking = true;
      this.applyEyes();
      setTimeout(() => { this.blinking = false; this.applyEyes(); }, 130);
    }, 5600);
  }

  stopBlink() {
    if (this.blinkTimer) { clearInterval(this.blinkTimer); this.blinkTimer = null; }
    this.stopIdle();
    this.stopEyeLoop();
    this.blinking = false;
    this.applyEyes();
  }

  /* ---------- 眼睛跟随 ---------- */
  attachFollow() {
    if (this.followBound) return;
    this.followBound = true;
  }

  detachFollow() {
    this.followBound = false;
    this.eyeDX = 0;
    this.eyeDY = 0;
    this.applyEyes();
  }

  onPointerMove(e) {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.lastPointerAt = Date.now();
    if (this.drag) return;
    if (!this.followBound || !this.el) return;
    if (this.mood !== "neutral" && this.mood !== "happy") return;
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.tickEyes();
    });
  }

  tickEyes() {
    if (!this.el || this.pointer.x < 0) return;
    const r = this.el.getBoundingClientRect();
    const dx = this.pointer.x - (r.left + r.width / 2);
    const dy = this.pointer.y - (r.top + r.height / 2);
    this.eyeTX = Math.max(-1, Math.min(1, dx / 200)) * 6.0;
    this.eyeTY = Math.max(-1, Math.min(1, dy / 200)) * 4.2;
  }

  /* 头部整体微微朝向鼠标（与眼睛叠加成视差） */
  applyLook() {
    if (!this.el) return;
    const k = this.size() / 100;
    this.el.style.setProperty("--lx", (this.eyeDX * k * 0.62).toFixed(2) + "px");
    this.el.style.setProperty("--ly", (this.eyeDY * k * 0.62).toFixed(2) + "px");
  }

  /* ---------- 待机：环视、偶尔蹦一下 ---------- */
  startIdle() {
    if (this.idleTimer) return;
    this.idleTimer = setInterval(() => {
      if (!this.el || document.hidden) return;
      if (this.drag) return;
      if (this.mood !== "neutral" && this.mood !== "happy") return;
      const idleFor = Date.now() - (this.lastPointerAt || 0);
      if (idleFor < 2600) return;
      /* 环视：随机看向一侧 */
      this.eyeTX = (Math.random() * 2 - 1) * 3.4;
      this.eyeTY = (Math.random() * 2 - 1) * 2.2;
      /* 每 3 次环视，轻轻蹦一下 */
      this.idleTick = (this.idleTick || 0) + 1;
      if (this.idleTick % 3 === 0) this.hop();
    }, 3200);
  }

  stopIdle() {
    if (this.idleTimer) { clearInterval(this.idleTimer); this.idleTimer = null; }
    this.el && this.el.classList.remove("pet-hop");
  }

  hop() {
    if (!this.el || this.cfg.motion === false) return;
    this.el.classList.remove("pet-hop");
    void this.el.offsetWidth;
    this.el.classList.add("pet-hop");
    setTimeout(() => this.el && this.el.classList.remove("pet-hop"), 700);
  }

  /* 眼睛平滑跟随（每帧向目标插值） */
  startEyeLoop() {
    if (this.eyeLoop) return;
    const step = () => {
      this.eyeLoop = requestAnimationFrame(step);
      if (!this.el) return;
      const dx = this.eyeTX - this.eyeDX;
      const dy = this.eyeTY - this.eyeDY;
      if (Math.abs(dx) < 0.02 && Math.abs(dy) < 0.02) return;
      this.eyeDX += dx * 0.22;
      this.eyeDY += dy * 0.22;
      this.applyEyes();
      this.applyLook();
    };
    this.eyeLoop = requestAnimationFrame(step);
  }

  stopEyeLoop() {
    if (this.eyeLoop) { cancelAnimationFrame(this.eyeLoop); this.eyeLoop = 0; }
    this.eyeDX = 0; this.eyeDY = 0; this.eyeTX = 0; this.eyeTY = 0;
    this.applyEyes();
    this.applyLook();
  }

  /* ---------- 拖动 / 点击 ---------- */
  onDragStart(e) {
    if (e.button !== 0) return;
    const r = this.el.getBoundingClientRect();
    this.drag = { id: e.pointerId, startX: e.clientX, startY: e.clientY, left: r.left, top: r.top, moved: 0 };
    this.el.classList.add("is-dragging");
    try { this.svg.setPointerCapture(e.pointerId); } catch (err) {}
    window.addEventListener("pointermove", this._onMoveDrag);
    window.addEventListener("pointerup", this._onUpDrag);
    window.addEventListener("pointercancel", this._onUpDrag);
    e.preventDefault();
  }

  onDragMove(e) {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    const dx = e.clientX - this.drag.startX;
    const dy = e.clientY - this.drag.startY;
    this.drag.moved = Math.max(this.drag.moved, Math.abs(dx) + Math.abs(dy));
    const w = this.size();
    const left = Math.min(Math.max(0, this.drag.left + dx), Math.max(0, window.innerWidth - w));
    const top = Math.min(Math.max(0, this.drag.top + dy), Math.max(0, window.innerHeight - w));
    this.el.style.left = Math.round(left) + "px";
    this.el.style.top = Math.round(top) + "px";
  }

  onDragEnd(e) {
    if (!this.drag) return;
    const moved = this.drag.moved;
    window.removeEventListener("pointermove", this._onMoveDrag);
    window.removeEventListener("pointerup", this._onUpDrag);
    window.removeEventListener("pointercancel", this._onUpDrag);
    this.el.classList.remove("is-dragging");
    this.drag = null;
    if (moved < 4) {
      this.onPoke();
      return;
    }
    const w = this.size();
    const r = this.el.getBoundingClientRect();
    this.cfg.x = Math.max(0, Math.min(1, r.left / Math.max(1, window.innerWidth - w)));
    this.cfg.y = Math.max(0, Math.min(1, r.top / Math.max(1, window.innerHeight - w)));
    this.scheduleSave();
    this.setMood("happy", 900);
  }

  onPoke() {
    this.pokeCount += 1;
    if (this.pokeTimer) clearTimeout(this.pokeTimer);
    this.pokeTimer = setTimeout(() => { this.pokeCount = 0; this.setMood("neutral"); }, 2600);
    if (this.pokeCount >= 6) {
      this.setMood("angry", 1400);
      this.say("angry");
    } else if (this.pokeCount >= 3) {
      this.setMood("happy");
      this.say("angry");
    } else {
      this.setMood("happy");
      this.say("happy");
    }
  }

  onDocPointerDown() {
    this.restartSleepTimer();
  }

  /* ---------- 闲置打瞌睡 ---------- */
  restartSleepTimer() {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    this.sleepTimer = setTimeout(() => {
      if (document.hidden || !this.el) return;
      if (this.mood === "angry") return;
      this.setMood("sleepy");
      this.say("sleepy");
    }, 45000);
  }

  /* ---------- 气泡 ---------- */
  say(mood) {
    if (this.cfg.bubble === false || !this.el) return;
    const pool = PET_LINES[mood] || PET_LINES.neutral;
    const text = pool[Math.floor(Math.random() * pool.length)];
    const bubble = this.el.querySelector(".zspet-bubble");
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add("on");
    /* 直接写内联样式，避免被外部 CSS 或主题覆盖掉透明度 */
    bubble.style.setProperty("opacity", "1", "important");
    bubble.style.setProperty("transform", "translateX(-50%) translateY(0)", "important");
    if (this.bubbleTimer) clearTimeout(this.bubbleTimer);
    this.bubbleTimer = setTimeout(() => {
      bubble.classList.remove("on");
      bubble.style.setProperty("opacity", "0", "important");
      bubble.style.setProperty("transform", "translateX(-50%) translateY(4px)", "important");
    }, 2400);
  }

  /* ---------- 其它 ---------- */
  onResize() {
    this.applyPosition();
  }

  onVisibility() {
    if (document.hidden) {
      if (this.blinkTimer) { clearInterval(this.blinkTimer); this.blinkTimer = null; }
    } else if (this.cfg.motion !== false) {
      this.startBlink();
    }
  }

  scheduleSave() {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      try { this.plugin.savePetState(this.cfg); } catch (e) {}
    }, 400);
  }

  setEnabled(on) {
    this.cfg.enabled = !!on;
    if (on) this.mount();
    else this.destroy();
  }

  setScale(px) {
    this.cfg.scale = Math.max(PET_SIZE_MIN, Math.min(PET_SIZE_MAX, Number(px) || 96));
    if (this.el) {
      this.el.style.width = this.size() + "px";
      this.el.style.height = this.size() + "px";
      this.applyPosition();
    }
    this.scheduleSave();
  }

  setBubble(on) {
    this.cfg.bubble = !!on;
    this.scheduleSave();
  }

  setMotion(on) {
    this.cfg.motion = !!on;
    this.applyMotion();
    this.scheduleSave();
  }

  resetPosition() {
    this.cfg.x = PET_DEFAULT.x;
    this.cfg.y = PET_DEFAULT.y;
    this.applyPosition();
    this.scheduleSave();
  }

  destroy() {
    if (this.sleepTimer) { clearTimeout(this.sleepTimer); this.sleepTimer = null; }
    if (this.pokeTimer) { clearTimeout(this.pokeTimer); this.pokeTimer = null; }
    if (this.bubbleTimer) { clearTimeout(this.bubbleTimer); this.bubbleTimer = null; }
    if (this.saveTimer) { clearTimeout(this.saveTimer); this.saveTimer = null; }
    this.stopBlink();
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    window.removeEventListener("pointermove", this._onMoveDrag);
    window.removeEventListener("pointerup", this._onUpDrag);
    window.removeEventListener("pointercancel", this._onUpDrag);
    if (this.onMoveBound) {
      document.removeEventListener("pointermove", this._onPointerMove);
      document.removeEventListener("pointerdown", this._onPointerDownDoc);
      window.removeEventListener("resize", this._onResize);
      document.removeEventListener("visibilitychange", this._onVisibility);
      this.onMoveBound = false;
    }
    if (this.el && this.el.parentNode) this.el.parentNode.removeChild(this.el);
    this.el = null;
    this.svg = null;
    this.faceLayer = null;
    this.extraLayer = null;
  }
}

class ZhushroomPetSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    const pet = this.plugin.pet;
    const cfg = (pet && pet.cfg) || Object.assign({}, PET_DEFAULT, this.plugin.petState || {});

    new Setting(containerEl)
      .setName("显示桌宠")
      .setDesc("在窗口右下角放一只可拖动的红色蘑菇；只在 Obsidian 内显示。")
      .addToggle((t) => t.setValue(cfg.enabled !== false).onChange((v) => {
        this.plugin.petState.enabled = v;
        this.plugin.savePetState(this.plugin.petState);
        if (!pet) return;
        pet.setEnabled(v);
      }));

    new Setting(containerEl)
      .setName("大小")
      .setDesc("72 – 120 px")
      .addSlider((s) => s.setLimits(PET_SIZE_MIN, PET_SIZE_MAX, 4)
        .setValue(Number(cfg.scale) || 96)
        .setDynamicTooltip()
        .onChange((v) => {
          this.plugin.petState.scale = v;
          if (pet) pet.setScale(v);
          else this.plugin.savePetState(this.plugin.petState);
        }));

    new Setting(containerEl)
      .setName("台词气泡")
      .addToggle((t) => t.setValue(cfg.bubble !== false).onChange((v) => {
        this.plugin.petState.bubble = v;
        if (pet) pet.setBubble(v);
        else this.plugin.savePetState(this.plugin.petState);
      }));

    new Setting(containerEl)
      .setName("动画")
      .setDesc("待机呼吸、眨眼、眼睛跟随；关掉后只剩点击换表情。")
      .addToggle((t) => t.setValue(cfg.motion !== false).onChange((v) => {
        this.plugin.petState.motion = v;
        if (pet) pet.setMotion(v);
        else this.plugin.savePetState(this.plugin.petState);
      }));

    new Setting(containerEl)
      .setName("位置")
      .setDesc("把桌宠拖到想要的位置会记住；也可以在这里重置。")
      .addButton((b) => b.setButtonText("重置到右下角").onClick(() => {
        if (pet) pet.resetPosition();
        else {
          this.plugin.petState.x = PET_DEFAULT.x;
          this.plugin.petState.y = PET_DEFAULT.y;
          this.plugin.savePetState(this.plugin.petState);
        }
        new Notice("桌宠位置已重置");
      }));
  }
}
/* ==== PET_LOGIC_END ==== */

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

    /* 桌宠：只在桌面端出现；开关 / 大小 / 位置存在 data.pet */
    this.petState = Object.assign({}, PET_DEFAULT, (data && data.pet) || {});
    this.addCommand({ id: "toggle-pet", name: "显示/隐藏桌宠", callback: () => this.togglePet() });
    this.addCommand({
      id: "reset-pet-position",
      name: "重置桌宠位置",
      callback: () => {
        if (!this.pet) return new Notice("桌宠仅在桌面端可用");
        this.pet.resetPosition();
        new Notice("桌宠位置已重置");
      }
    });
    this.addCommand({ id: "pet-next-mood", name: "桌宠：换一个表情", callback: () => this.cyclePetMood() });
    this.addSettingTab(new ZhushroomPetSettingTab(this.app, this));

    if (Platform.isDesktopApp) {
      try {
        const petStyle = document.createElement("style");
        petStyle.id = "zhushroom-pet-style";
        petStyle.textContent = PET_CSS;
        document.head.appendChild(petStyle);
        this.register(() => petStyle.remove());
        this.pet = new ZhushiPet(this);
        this.pet.mount();
      } catch (e) {
        console.error("[猪事顺利] 桌宠初始化失败", e);
      }
    }

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
    if (this.pet) {
      try { this.pet.destroy(); } catch (e) {}
      this.pet = null;
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

  /* ---------- 桌宠 ---------- */
  async savePetState(state) {
    try {
      this.petState = Object.assign({}, PET_DEFAULT, state || {});
      const data = (await this.loadData()) || {};
      data.pet = this.petState;
      await this.saveData(data);
    } catch (e) {
      console.error("[猪事顺利] 保存桌宠设置失败", e);
    }
  }

  togglePet() {
    if (!this.pet) {
      new Notice("桌宠仅在桌面端可用");
      return;
    }
    const next = this.pet.cfg.enabled === false;
    this.petState.enabled = next;
    if (next) this.pet.mount();
    else this.pet.destroy();
    this.pet.cfg.enabled = next;
    this.savePetState(this.petState);
    new Notice(next ? "桌宠已显示" : "桌宠已隐藏");
  }

  cyclePetMood() {
    if (!this.pet) {
      new Notice("桌宠仅在桌面端可用");
      return;
    }
    const moods = ["neutral", "happy", "angry", "sleepy", "surprised"];
    const i = moods.indexOf(this.pet.mood);
    this.pet.setMood(moods[(i + 1) % moods.length], 1200);
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
      });
      /* leaf.updateHeader() 不是公开 API，改用 layout-change 事件触发标签页重绘 */
      try { this.app.workspace.trigger("layout-change"); } catch (e) {}
      const data = (await this.loadData()) || {};
      data.logo = logo;
      await this.saveData(data);
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
