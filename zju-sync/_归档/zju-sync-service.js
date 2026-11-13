#!/usr/bin/env node
/* 猪事顺利 · 学在浙大待办本地同步服务
 *
 * 作用：在没有篡改猴、没有跨域豁免的环境里（例如 Obsidian 内嵌页面），
 *      用本机 Node 代为请求 courses.zju.edu.cn，并把结果同时给出两份：
 *        1) http://127.0.0.1:8765/todos  —— 页面可以直接 fetch（已带 CORS / 私有网络预检头）
 *        2) <库>\01-每日日程\zju-todos.json —— fetch 被拦时的文件兜底
 *
 * 用法：
 *   1. 浏览器登录 https://courses.zju.edu.cn，F12 → Network → 任一 api 请求 → 复制 Cookie 的值
 *   2. 粘进同目录的 zju-cookie.txt（单独一行，注释行以 # 开头会被忽略）
 *   3. node zju-sync-service.js
 *   4. （可选）把「启动学在浙大同步.bat」的快捷方式放进启动文件夹，开机自动跑
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

/* 任何未处理的异常都不应该让常驻服务直接退出 */
process.on('unhandledRejection', (e) => {
  try { log('未处理的 Promise 异常（已忽略）：' + (e && e.message ? e.message : e)); } catch (x) {}
});
process.on('uncaughtException', (e) => {
  try { log('未捕获异常（已忽略）：' + (e && e.message ? e.message : e)); } catch (x) {}
});

/* 打包成 exe（Node SEA）后 __dirname 不可靠，统一用可执行文件所在目录 */
let IS_SEA = false;
try { IS_SEA = require('node:sea').isSea(); } catch (e) { IS_SEA = false; }
const APP_DIR = IS_SEA ? path.dirname(process.execPath) : __dirname;

const CFG = {
  host: '127.0.0.1',
  port: 8765,
  logFile: path.join(APP_DIR, 'zju-sync.log'),
  configFile: path.join(APP_DIR, 'zju-sync.config.json'),
  /* 页面源文件（改完页面后，服务启动时会自动复制一份到本目录，方便整包发给别人） */
  pageSource: '<你的库路径>\\猪事顺利.html',
  pageTarget: path.join(APP_DIR, '猪事顺利.html'),
  /* 教务网（正方）课表 */
  jarFile: path.join(APP_DIR, 'zju-cookies.json'),
  timetableFile: 'zju-timetable.json',
  zdbkPage: 'https://zdbk.zju.edu.cn/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N253508&layout=default&su=<你的学号>',
  timetableApi: 'https://zdbk.zju.edu.cn/jwglxt/kbcx/xskbcx_cxXsKb.html?gnmkdm=N253508&su=<你的学号>',
  /* 按教务网页面自己的格式请求：xqm=序号|名称，并带上 captcha_value */
  /* 学期代号照 Celechron：1|秋 / 1|冬 / 2|春 / 2|夏 */
  timetableBodies: [
    'xnm=2026-2027&xqm=1%7C%E7%A7%8B&xqmmc=%E7%A7%8B&xxqf=0&xsfs=0&captcha_value=',
    'xnm=2026-2027&xqm=1%7C%E5%86%AC&xqmmc=%E5%86%AC&xxqf=0&xsfs=0&captcha_value=',
    'xnm=2026-2027&xqm=2%7C%E6%98%A5&xqmmc=%E6%98%A5&xxqf=0&xsfs=0&captcha_value=',
    'xnm=2026-2027&xqm=2%7C%E5%A4%8F&xqmmc=%E5%A4%8F&xxqf=0&xsfs=0&captcha_value='
  ],
  timetableGapMs: 4000,
  /* 校历（节假日 / 调休 / 作息时间），来源：Celechron 的 calendar.celechron.top */
  calendarBase: 'http://calendar.celechron.top/',
  calendarFile: 'zju-calendar.json',
  api: 'https://courses.zju.edu.cn/api/todos?no-intercept=true',
  cookieFile: path.join(APP_DIR, 'zju-cookie.txt'),
  vaultScheduleDir: '<你的库路径>\\日程\\01-每日日程',
  cacheFile: 'zju-todos.json',
  refreshMinutes: 10,      // 定时刷新并写缓存文件；0 = 只在被请求时抓
  cacheSeconds: 300,       // /todos 的内存缓存时长
  requestTimeoutMs: 8000,  // 单次超时；失败会自动重试 3 次
  coursesApi: 'https://courses.zju.edu.cn/api/my-courses?page=1&page_size=200',
  coursesFile: 'zju-courses.json',
  portal: 'https://courses.zju.edu.cn/user/index',
  cdpPort: 9333,
  loginTimeoutMs: 5 * 60 * 1000
};

/* 可选配置：{ "port": 8765, "vaultScheduleDir": "D:\\MyVault\\日程\\01-每日日程" } */
try {
  if (fs.existsSync(CFG.configFile)) {
    const cfg = JSON.parse(fs.readFileSync(CFG.configFile, 'utf8'));
    if (cfg && typeof cfg === 'object') Object.assign(CFG, cfg);
  }
} catch (e) { /* 配置坏了就用默认 */ }

let cache = { at: 0, list: null, error: null };
let lastWrite = null;
let loginRunning = false;
let lastLoginTry = 0;

function log(...args) {
  const d = new Date();
  const t = [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
  const line = '[' + t + '] ' + args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  try { console.log(line); } catch (e) { /* GUI 子系统下没有控制台 */ }
  try {
    if (fs.existsSync(CFG.logFile) && fs.statSync(CFG.logFile).size > 2 * 1024 * 1024) {
      fs.writeFileSync(CFG.logFile, '', 'utf8');
    }
    fs.appendFileSync(CFG.logFile, line + '\n', 'utf8');
  } catch (e) { /* 日志写不了就算了 */ }
}

/* ---------------- Cookie ---------------- */
function readCookie() {
  try {
    const raw = fs.readFileSync(CFG.cookieFile, 'utf8');
    const lines = raw.split(/\r?\n/).map(s => s.trim())
      .filter(s => s && !s.startsWith('#'));
    const text = lines.join('\n');
    /* 允许直接粘整段 Copy as cURL：cookie 可能写在 -H 'cookie: ...'，也可能是 -b '...' */
    const mHeaderCurl = /(?:-H|--header)\s+['"](?:cookie|Cookie):\s*([^'"]+)['"]/.exec(text);
    if (mHeaderCurl) return mHeaderCurl[1].trim();
    const mB = /(?:^|\s)(?:-b|--cookie)\s+(['"])([\s\S]*?)\1/.exec(text);
    if (mB) return mB[2].replace(/\\\s*$/gm, '').trim();
    /* 允许粘成「Cookie: a=b; c=d」这种带前缀的写法 */
    const mHeader = /^\s*cookie:\s*(.+)$/im.exec(text);
    if (mHeader) return mHeader[1].trim();
    return lines.join(' ').trim();
  } catch (e) {
    return '';
  }
}

/* ---------------- 页面文件同步 ---------------- */
function syncPageFile() {
  try {
    if (!CFG.pageSource || !CFG.pageTarget) return;
    if (!fs.existsSync(CFG.pageSource)) return;
    const srcStat = fs.statSync(CFG.pageSource);
    const dstStat = fs.existsSync(CFG.pageTarget) ? fs.statSync(CFG.pageTarget) : null;
    if (dstStat && dstStat.mtimeMs >= srcStat.mtimeMs) return;
    fs.copyFileSync(CFG.pageSource, CFG.pageTarget);
    log('已更新页面文件：' + path.basename(CFG.pageTarget));
  } catch (e) {
    log('同步页面文件失败：' + (e && e.message ? e.message : e));
  }
}

/* ---------------- Cookie Jar（按域名存，学在浙大 + 教务网共用一份） ---------------- */
function loadJar() {
  try {
    const raw = fs.readFileSync(CFG.jarFile, 'utf8');
    const j = JSON.parse(raw);
    if (j && Array.isArray(j.cookies)) return j.cookies;
  } catch (e) { /* 没有 jar */ }
  return [];
}

function saveJar(cookies) {
  try {
    fs.writeFileSync(CFG.jarFile, JSON.stringify({
      savedAt: new Date().toISOString(),
      cookies: cookies
    }, null, 2), 'utf8');
    return true;
  } catch (e) {
    log('写 Cookie 文件失败：' + (e && e.message ? e.message : e));
    return false;
  }
}

/* 按主机名拼 Cookie 头：优先精确域名，其次父域（如 .zju.edu.cn） */
let pendingJar = null;   // 登录过程中先放这里，验证通过才写盘，避免把好凭证覆盖掉

function cookieForHost(host) {
  const jar = pendingJar || loadJar();
  if (jar.length) {
    const picked = jar
      .filter(c => {
        const d = String(c.domain || '').replace(/^\./, '');
        return d && (host === d || host.endsWith('.' + d));
      })
      .sort((a, b) => String(b.domain).length - String(a.domain).length);
    const seen = {};
    const parts = [];
    picked.forEach(c => {
      if (!c.name || seen[c.name]) return;
      seen[c.name] = true;
      parts.push(c.name + '=' + c.value);
    });
    if (parts.length) return parts.join('; ');
  }
  /* 兜底：旧的扁平文件只对学在浙大有效 */
  if (host.indexOf('courses.zju.edu.cn') >= 0) return readCookieFlat();
  return '';
}

function readCookieFlat() {
  try {
    const raw = fs.readFileSync(CFG.cookieFile, 'utf8');
    const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
    const text = lines.join('\n');
    const mHeaderCurl = /(?:-H|--header)\s+['"](?:cookie|Cookie):\s*([^'"]+)['"]/.exec(text);
    if (mHeaderCurl) return mHeaderCurl[1].trim();
    const mB = /(?:^|\s)(?:-b|--cookie)\s+(['"])([\s\S]*?)\1/.exec(text);
    if (mB) return mB[2].replace(/\\\s*$/gm, '').trim();
    const mHeader = /^\s*cookie:\s*(.+)$/im.exec(text);
    if (mHeader) return mHeader[1].trim();
    return lines.join(' ').trim();
  } catch (e) {
    return '';
  }
}

/* ---------------- Cookie 写入 ---------------- */
function saveCookie(text) {
  try {
    fs.writeFileSync(CFG.cookieFile, String(text || '').trim() + '\n', 'utf8');
    return true;
  } catch (e) {
    log('保存 Cookie 失败：' + (e && e.message ? e.message : e));
    return false;
  }
}

/* ---------------- 首次使用：打开浏览器登录，自动抓 Cookie ---------------- */
function findBrowser() {
  const cands = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  for (const p of cands) {
    try { if (p && fs.existsSync(p)) return p; } catch (e) {}
  }
  return null;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* 用浏览器自带的调试协议（CDP）把 Cookie 取出来，用户不用手抄 */
function cdpGetCookies(wsUrl) {
  return new Promise((resolve) => {
    let settled = false;
    let ws = null;
    const finish = (v) => {
      if (settled) return;
      settled = true;
      try { if (ws) ws.close(); } catch (e) {}
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), 8000);
    try { ws = new WebSocket(wsUrl); } catch (e) { clearTimeout(timer); return finish(null); }
    ws.onopen = () => {
      try {
        ws.send(JSON.stringify({ id: 1, method: 'Network.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Storage.getCookies' }));
      } catch (e) { finish(null); }
    };
    ws.onmessage = (ev) => {
      let msg = null;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg && msg.id === 2) {
        clearTimeout(timer);
        finish((msg.result && msg.result.cookies) || []);
      }
    };
    ws.onerror = () => { clearTimeout(timer); finish(null); };
    ws.onclose = () => { clearTimeout(timer); finish(null); };
  });
}

function cookieHeaderFrom(list) {
  const parts = [];
  const seen = {};
  (list || []).forEach(c => {
    if (!c || !c.name) return;
    const domain = String(c.domain || '');
    if (domain && domain.indexOf('zju.edu.cn') < 0) return;
    if (seen[c.name]) return;
    seen[c.name] = true;
    parts.push(c.name + '=' + c.value);
  });
  return parts.join('; ');
}

async function ensureLogin() {
  if (loginRunning) return false;
  loginRunning = true;
  try { return await loginAndCapture(); } finally { loginRunning = false; }
}

async function loginAndCapture() {
  const profile = path.join(APP_DIR, '.login-profile');
  let child = null;
  let wsUrl = null;

  const probe = async () => {
    try {
      const r = await fetch('http://127.0.0.1:' + CFG.cdpPort + '/json/version', { signal: AbortSignal.timeout(800) });
      const j = await r.json();
      return (j && j.webSocketDebuggerUrl) || null;
    } catch (e) { return null; }
  };

  /* 1) 先连已经开着调试端口的浏览器（「登录一次.bat」会先把它拉起来） */
  for (let i = 0; i < 10 && !wsUrl; i++) {
    wsUrl = await probe();
    if (!wsUrl) await sleep(500);
  }

  /* 2) 没有就自己拉一个；SEA 里 spawn 可能失败，失败不致命 */
  if (!wsUrl) {
    const exe = findBrowser();
    if (!exe) {
      log('没找到 Edge / Chrome：请手动把 Cookie 粘进 ' + CFG.cookieFile);
      return false;
    }
    log('正在打开浏览器，请在弹出的窗口里登录学在浙大（登录成功后会自动关闭）');
    try {
      /* SEA 里直接 spawn 浏览器会被拒（退出码 21），改为让 PowerShell 用 Start-Process 拉起 */
      const ps1 = path.join(APP_DIR, '.open-login.ps1');
      const argList = [
        '--remote-debugging-port=' + CFG.cdpPort,
        '--user-data-dir=' + profile,
        '--no-first-run',
        '--no-default-browser-check',
        '--new-window',
        CFG.portal,
        CFG.zdbkPage
      ].map(a => "'" + String(a).replace(/'/g, "''") + "'").join(',');
      fs.writeFileSync(ps1,
        'Start-Process -FilePath ' + "'" + String(exe).replace(/'/g, "''") + "'" +
        ' -ArgumentList ' + argList + '\n', 'utf8');
      child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', ps1],
        { stdio: 'ignore', detached: true, windowsHide: true });
      log('浏览器进程 pid=' + (child && child.pid));
      if (child) {
        child.on('error', e => log('[浏览器] 启动失败：' + (e && e.message ? e.message : e)));
        child.on('exit', (code, sig) => log('[浏览器] 进程退出 code=' + code + ' signal=' + sig));
      }
      if (child && typeof child.unref === 'function') child.unref();
    } catch (e) {
      log('打开浏览器失败：' + (e && e.message ? e.message : e));
    }
    for (let i = 0; i < 40 && !wsUrl; i++) {
      wsUrl = await probe();
      if (!wsUrl) await sleep(500);
    }
  }

  if (!wsUrl) {
    log('浏览器调试端口没起来：请先双击「登录一次.bat」（它会带着调试端口打开浏览器）');
    return false;
  }

  const deadline = Date.now() + CFG.loginTimeoutMs;
  let toldCourses = false;
  log('等待登录中（最多 ' + Math.round(CFG.loginTimeoutMs / 60000) + ' 分钟）：学在浙大和教务网都要登录');
  while (Date.now() < deadline) {
    await sleep(2000);
    let cookies = null;
    try { cookies = await cdpGetCookies(wsUrl); } catch (e) { cookies = null; }
    if (!cookies || !cookies.length) continue;
    const zju = cookies.filter(c => String(c.domain || '').indexOf('zju.edu.cn') >= 0);
    if (!zju.length) continue;
    pendingJar = zju;
    const t1 = await fetchTodos(true);
    const t2 = await fetchTimetable(true);
    /* 课表若是「缓存兜底」（stale）说明教务网还没登录，不能算成功 */
    const ttFresh = t2.ok && !t2.stale;
    if (t1.ok && ttFresh) {
      saveJar(zju);
      pendingJar = null;
      log('登录成功：待办 ' + t1.list.length + ' 条，课表 ' + t2.kbList.length + ' 段');
      cdpCloseBrowser(wsUrl);
      try { if (child) child.kill(); } catch (e) {}
      return true;
    }
    if (t1.ok && !ttFresh && !toldCourses) {
      toldCourses = true;
      log('学在浙大已登录，但教务网还没登录：请在弹出的窗口里打开一次教务网「学生课表查询」页并停在那页');
    }
  }
  pendingJar = null;
  log('等待登录超时；重新双击「登录一次.bat」可以再来一次');
  cdpCloseBrowser(wsUrl);
  try { if (child) child.kill(); } catch (e) {}
  return false;
}

function cdpCloseBrowser(wsUrl) {
  try {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      try { ws.send(JSON.stringify({ id: 99, method: 'Browser.close' })); } catch (e) {}
    };
  } catch (e) {}
}
/* ---------------- 抓取 ---------------- */
async function fetchTodos(force) {
  const now = Date.now();
  if (!force && cache.list && now - cache.at < CFG.cacheSeconds * 1000) {
    return { ok: true, cached: true, list: cache.list, at: cache.at };
  }

  const cookie = cookieForHost('courses.zju.edu.cn');
  if (!cookie) {
    cache.error = 'NO_COOKIE';
    log('还没有学在浙大的登录态：启动登录窗口或把 Cookie 粘进 ' + CFG.cookieFile);
    return { ok: false, code: 'NO_COOKIE' };
  }

  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await fetchOnce(cookie);
    } catch (e) {
      lastErr = e;
      log('抓取失败（第 ' + attempt + '/3 次）：' + (e && e.message ? e.message : e));
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
    }
  }
  cache.error = 'NETWORK';
  return { ok: false, code: 'NETWORK' };
}

async function fetchOnce(cookie) {
  {
    const res = await fetch(CFG.api, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'https://courses.zju.edu.cn/user/index',
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) zhushi-sync/1.0'
      },
      signal: AbortSignal.timeout(CFG.requestTimeoutMs)
    });

    if (res.status === 401 || res.status === 403) {
      cache.error = 'AUTH';
      log('登录态失效（HTTP ' + res.status + '）：需要重新登录一次（双击「登录一次.bat」）');
      if (!loginRunning && Date.now() - lastLoginTry > 5 * 60 * 1000) {
        lastLoginTry = Date.now();
        ensureLogin().then(ok => {
          if (ok) { log('重新登录成功，继续同步'); fetchTodos(true); fetchCourses(true); fetchTimetable(true); }
        });
      }
      return { ok: false, code: 'AUTH' };
    }
    if (res.status !== 200) {
      cache.error = 'HTTP_' + res.status;
      return { ok: false, code: 'HTTP_' + res.status };
    }

    let json = null;
    try { json = await res.json(); } catch (e) { json = null; }
    if (!json || !Array.isArray(json.todo_list)) {
      cache.error = 'AUTH';   // 登录失效时返回的是登录页 html
      return { ok: false, code: 'AUTH' };
    }

    cache = { at: Date.now(), list: json.todo_list, error: null };
    log('抓取成功：' + json.todo_list.length + ' 条待办');
    writeCacheFile(json.todo_list);
    return { ok: true, list: json.todo_list, at: cache.at };
  }
}

/* ---------------- 写缓存文件（给页面兜底读） ---------------- */
function writeCacheFile(list) {
  try {
    const dir = CFG.vaultScheduleDir;
    if (!dir || !fs.existsSync(dir)) {
      log('跳过写缓存文件：目录不存在 ' + dir);
      return;
    }
    const payload = {
      source: 'zju-sync-service',
      fetchedAt: new Date().toISOString(),
      count: list.length,
      todo_list: list
    };
    const file = path.join(dir, CFG.cacheFile);
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    lastWrite = file;
    log('已写缓存文件：' + file);
  } catch (e) {
    log('写缓存文件失败：' + (e && e.message ? e.message : e));
  }
}

/* ---------------- 教务网课表（正方 jwglxt） ---------------- */
let timetableCache = { at: 0, kbList: null, meta: null };

function writeTimetableFile(json) {
  try {
    const dir = CFG.vaultScheduleDir;
    if (!dir || !fs.existsSync(dir)) return;
    const payload = {
      source: 'zju-sync-service',
      fetchedAt: new Date().toISOString(),
      semester: (json && json.xnm) || '',
      kbList: (json && json.kbList) || []
    };
    fs.writeFileSync(path.join(dir, CFG.timetableFile), JSON.stringify(payload, null, 2), 'utf8');
    log('已写课表缓存：' + CFG.timetableFile);
  } catch (e) {
    log('写课表缓存失败：' + (e && e.message ? e.message : e));
  }
}

/* 读上一次写下的课表缓存，供教务网会话失效时兜底 */
function readTimetableFile() {
  try {
    if (!CFG.vaultScheduleDir) return null;
    const f = path.join(CFG.vaultScheduleDir, CFG.timetableFile);
    if (!fs.existsSync(f)) return null;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (j && Array.isArray(j.kbList) && j.kbList.length) return j;
  } catch (e) { /* 缓存不可用 */ }
  return null;
}

/* ---------------- 校历：节假日 / 调休 / 作息 ---------------- */
let calendarCache = { at: 0, data: null };

function academicYearStart(d) {
  var y = d.getFullYear();
  return d.getMonth() + 1 >= 9 ? y : y - 1;
}

function readCalendarFile() {
  try {
    if (!CFG.vaultScheduleDir) return null;
    var f = path.join(CFG.vaultScheduleDir, CFG.calendarFile);
    if (!fs.existsSync(f)) return null;
    var j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (j && (j.holiday || j.exchange)) return j;
  } catch (e) {}
  return null;
}

async function fetchCalendar(force) {
  var now = Date.now();
  if (!force && calendarCache.data && now - calendarCache.at < 6 * 3600 * 1000) {
    return { ok: true, data: calendarCache.data };
  }
  var y = academicYearStart(new Date());
  var names = [y + '-' + (y + 1) + '-1.json', y + '-' + (y + 1) + '-2.json'];
  for (var i = 0; i < names.length; i++) {
    try {
      var res = await fetch(CFG.calendarBase + names[i], { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      var j = await res.json();
      if (!j || !(j.holiday || j.exchange || j.sessionTime)) continue;
      calendarCache = { at: Date.now(), data: j };
      log('校历：' + names[i] + '（放假 ' + Object.keys(j.holiday || {}).length + ' 天，调休 ' + Object.keys(j.exchange || {}).length + ' 条）');
      try {
        if (CFG.vaultScheduleDir && fs.existsSync(CFG.vaultScheduleDir)) {
          fs.writeFileSync(path.join(CFG.vaultScheduleDir, CFG.calendarFile), JSON.stringify(j, null, 2), 'utf8');
        }
      } catch (e) {}
      return { ok: true, data: j };
    } catch (e) {
      log('校历抓取失败（' + names[i] + '）：' + (e && e.message ? e.message : e));
    }
  }
  var cachedCal = readCalendarFile();
  if (cachedCal) return { ok: true, data: cachedCal, stale: true };
  return { ok: false, code: 'NO_CALENDAR' };
}

async function fetchTimetable(force) {
  const now = Date.now();
  if (!force && timetableCache.kbList && now - timetableCache.at < CFG.cacheSeconds * 1000) {
    return { ok: true, kbList: timetableCache.kbList, meta: timetableCache.meta, at: timetableCache.at };
  }
  const cookie = cookieForHost('zdbk.zju.edu.cn');
  if (!cookie) return { ok: false, code: 'NO_ZDBK' };

  const merged = {};
  const metaList = [];
  let got = 0;

  for (const body of CFG.timetableBodies) {
    if (merged && Object.keys(merged).length) await new Promise(r => setTimeout(r, CFG.timetableGapMs || 4000));
    try {
      const res = await fetch(CFG.timetableApi, {
        method: 'POST',
        headers: {
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': CFG.zdbkPage,
          'Cookie': cookie
        },
        body: body,
        signal: AbortSignal.timeout(CFG.requestTimeoutMs)
      });
      const text = await res.text();
      if (res.status !== 200) continue;
      let json = null;
      try { json = JSON.parse(text); } catch (e) { json = null; }
      if (!json || !Array.isArray(json.kbList)) continue;
      got++;
      metaList.push({ xnm: json.xnm, xqm: json.xqm, count: json.kbList.length });
      json.kbList.forEach(it => {
        /* 同一门课同一时段只保留一条；不同学期（xxq）视为不同条目 */
        const key = [it.kcb, it.xqj, it.djj, it.skcd, it.xxq].join('|');
        merged[key] = it;
      });
      log('课表分学期：' + (json.xqm || '?') + ' ' + json.kbList.length + ' 段');
    } catch (e) {
      log('课表抓取失败：' + (e && e.message ? e.message : e));
    }
  }

  if (got) {
    /* 与上一次缓存取并集：某个学期这次没抓到也不该丢课 */
    const prev = readTimetableFile();
    if (prev && Array.isArray(prev.kbList)) {
      prev.kbList.forEach(it => {
        const key = [it.kcb, it.xqj, it.djj, it.skcd, it.xxq].join('|');
        if (!merged[key]) merged[key] = it;
      });
    }
    const kbList = Object.keys(merged).map(k => merged[k]);
    const meta = { xnm: metaList[0] && metaList[0].xnm, semesters: metaList };
    timetableCache = { at: Date.now(), kbList: kbList, meta: meta };
    log('课表合并后共 ' + kbList.length + ' 段');
    writeTimetableFile({ xnm: meta.xnm, kbList: kbList });
    return { ok: true, kbList: kbList, meta: meta };
  }

  const fallback = readTimetableFile();
  if (fallback) {
    log('教务网会话不可用，先返回上次缓存的课表（' + fallback.kbList.length + ' 段）');
    return { ok: true, kbList: fallback.kbList, meta: fallback, stale: true };
  }
  return { ok: false, code: 'AUTH' };
}
/* ---------------- 课程列表（本学期） ---------------- */
let courseCache = { at: 0, list: [], semester: '' };

/* 「本学期」= 学年号最大的那一学年里的课（秋冬/秋/冬/短 都算），再按学期号降序排 */
function pickCurrentSemester(courses) {
  const withYear = courses.filter(c => c && c.academic_year && typeof c.academic_year.sort === 'number');
  if (!withYear.length) return { list: courses, semester: '' };
  let best = null;
  withYear.forEach(c => { if (!best || c.academic_year.sort > best.sort) best = c.academic_year; });
  const current = withYear.filter(c => c.academic_year.sort === best.sort);
  current.sort((a, b) => ((b.semester && b.semester.sort) || 0) - ((a.semester && a.semester.sort) || 0));
  return { list: current, semester: best.name || '' };
}

async function fetchCourses(force) {
  const now = Date.now();
  if (!force && courseCache.list.length && now - courseCache.at < CFG.cacheSeconds * 1000) {
    return { ok: true, list: courseCache.list, semester: courseCache.semester };
  }
  const cookie = cookieForHost('courses.zju.edu.cn');
  if (!cookie) return { ok: false, code: 'NO_COOKIE' };

  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(CFG.coursesApi, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Referer': 'https://courses.zju.edu.cn/user/index',
          'Cookie': cookie
        },
        signal: AbortSignal.timeout(CFG.requestTimeoutMs)
      });
      if (res.status === 401 || res.status === 403) {
        log('课程列表：登录态失效（HTTP ' + res.status + '）');
        return { ok: false, code: 'AUTH' };
      }
      if (res.status !== 200) return { ok: false, code: 'HTTP_' + res.status };
      const json = await res.json();
      const all = (json && json.courses) || [];
      const picked = pickCurrentSemester(all);
      const seen = {};
      const list = [];
      picked.list.forEach(c => {
        const name = (c && c.name ? String(c.name) : '').trim();
        if (!name || seen[name]) return;
        seen[name] = true;
        list.push({ name: name, id: c.id, code: c.course_code || '' });
      });
      courseCache = { at: Date.now(), list: list, semester: picked.semester };
      log('课程列表：' + list.length + ' 门（' + (picked.semester || '未标注学期') + '）');
      writeCoursesFile(list, picked.semester);
      return { ok: true, list: list, semester: picked.semester };
    } catch (e) {
      lastErr = e;
      log('课程列表抓取失败（第 ' + attempt + '/3 次）：' + (e && e.message ? e.message : e));
      if (attempt < 3) await new Promise(r => setTimeout(r, 1500));
    }
  }
  return { ok: false, code: 'NETWORK' };
}

function writeCoursesFile(list, semester) {
  try {
    const dir = CFG.vaultScheduleDir;
    if (!dir || !fs.existsSync(dir)) return;
    const payload = {
      source: 'zju-sync-service',
      fetchedAt: new Date().toISOString(),
      semester: semester || '',
      count: list.length,
      courses: list
    };
    fs.writeFileSync(path.join(dir, CFG.coursesFile), JSON.stringify(payload, null, 2), 'utf8');
  } catch (e) {
    log('写课程缓存失败：' + (e && e.message ? e.message : e));
  }
}

/* ---------------- HTTP 服务 ---------------- */
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  res.setHeader('Cache-Control', 'no-store');
}

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  setCors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + CFG.host + ':' + CFG.port);

  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    sendJson(res, 200, {
      ok: true,
      cookie: !!cookieForHost('courses.zju.edu.cn'),
      cookiesInJar: loadJar().length,
      timetableSegments: timetableCache.kbList ? timetableCache.kbList.length : 0,
      lastFetch: cache.at ? new Date(cache.at).toISOString() : null,
      lastError: cache.error,
      cacheFile: lastWrite || path.join(CFG.vaultScheduleDir, CFG.cacheFile)
    });
    return;
  }

  if (req.method === 'POST' && url.pathname === '/cookie') {
    let body = '';
    req.on('data', c => { if (body.length < 65536) body += c; });
    req.on('end', () => {
      const cookie = String(body || '').trim();
      if (!cookie) { sendJson(res, 400, { ok: false, code: 'EMPTY' }); return; }
      try {
        fs.writeFileSync(CFG.cookieFile, cookie + '\n', 'utf8');
        cache = { at: 0, list: null, error: null };
        sendJson(res, 200, { ok: true });
        log('Cookie 已更新');
      } catch (e) {
        sendJson(res, 500, { ok: false, code: 'WRITE_FAILED', message: String(e && e.message || e) });
      }
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/todos') {
    const force = url.searchParams.get('force') === '1';
    const r = await fetchTodos(force);
    if (r.ok) {
      sendJson(res, 200, {
        ok: true,
        fetchedAt: new Date(r.at).toISOString(),
        count: r.list.length,
        todo_list: r.list
      });
    } else {
      sendJson(res, 200, { ok: false, code: r.code });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/courses') {
    const forceCourses = url.searchParams.get('force') === '1';
    const c = await fetchCourses(forceCourses);
    if (c.ok) {
      sendJson(res, 200, { ok: true, semester: c.semester, count: c.list.length, courses: c.list });
    } else {
      sendJson(res, 200, { ok: false, code: c.code });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/calendar') {
    const r = await fetchCalendar(url.searchParams.get('force') === '1');
    if (r.ok) sendJson(res, 200, { ok: true, stale: !!r.stale, calendar: r.data });
    else sendJson(res, 200, { ok: false, code: r.code });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/timetable') {
    const forceTt = url.searchParams.get('force') === '1';
    const r = await fetchTimetable(forceTt);
    if (r.ok) sendJson(res, 200, { ok: true, kbList: r.kbList, meta: r.meta, stale: !!r.stale });
    else sendJson(res, 200, { ok: false, code: r.code });
    return;
  }

  sendJson(res, 404, { ok: false, code: 'NOT_FOUND' });
});

server.on('error', (e) => {
  if (e && e.code === 'EADDRINUSE') {
    log('端口 ' + CFG.port + ' 已被占用：服务可能已经在运行');
  } else {
    log('服务错误：' + (e && e.message ? e.message : e));
  }
  process.exit(1);
});

/* ---- 单独登录模式：zju-sync-service.exe --login ---- */
if (process.argv.indexOf('--login') >= 0) {
  log('登录模式：将打开浏览器，请登录学在浙大并进入一次教务网课表页');
  ensureLogin().then(ok => {
    if (ok) log('登录完成，凭证已保存；可以关掉这个窗口了');
    else log('没有登录成功；可以重新运行本命令再试');
    setTimeout(() => process.exit(ok ? 0 : 1), 800);
  });
  return;
}

server.listen(CFG.port, CFG.host, () => {
  log('已启动：http://' + CFG.host + ':' + CFG.port + '（/health · /todos · POST /cookie）');
  log('Cookie 文件：' + CFG.cookieFile + (readCookie() ? '（已配置）' : '（还没有配置）'));
  log('缓存文件：' + path.join(CFG.vaultScheduleDir, CFG.cacheFile));
  syncPageFile();

  // 启动后稍等再抓，避开刚开机时的 DNS / TLS 抖动
  setTimeout(async () => {
    if (!readCookie()) {
      log('还没有登录学在浙大，正在打开浏览器…（在弹出的窗口里登录一次，之后都会自动记住）');
      const ok = await ensureLogin();
      if (!ok) { log('没登录成功，服务继续运行；你可以随时点页面上的「同步学在浙大」重试'); return; }
      await new Promise(r => setTimeout(r, 1000));
    }
    await fetchTodos(true);
    await fetchCourses(true);
    await fetchTimetable(true);
    await fetchCalendar(true);
  }, 2000);
  if (CFG.refreshMinutes > 0) {
    setInterval(() => { fetchTodos(true); }, CFG.refreshMinutes * 60000);
  }
});
