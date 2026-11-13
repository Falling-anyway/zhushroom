// ==UserScript==
// @name         猪事顺利 · 学在浙大待办同步
// @namespace    zhushi.zju.sync
// @version      1.3.0
// @description  从「学在浙大」拉取未完成的待办（作业/考试/测验/问卷），自动合并成「猪事顺利」里的 DDL 事项
// @match        file:///*
// @match        http://127.0.0.1/*
// @match        http://localhost/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @grant        unsafeWindow
// @connect      courses.zju.edu.cn
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  /* ========================= 可调参数 =========================
   *  改完保存，刷新页面即可生效（不用重装脚本）
   * ========================================================== */
  const CFG = {
    intervalMinutes: 10,     // 自动同步间隔（分钟）；0 = 只在打开页面时同步一次
    category: 'study',       // 事项分类：study 学习 / work 工作 / life 生活 / exercise 运动 / social 社交
    contentPrefix: '',       // 事项标题前缀，例如 '【学在浙大】'
    markGoneAsDone: true,    // 待办消失（已交或已失效）→ 自动打勾，避免 DDL 一直挂着
    showButton: true,        // 页面顶部没有「同步学在浙大」按钮时，才在左下角补一个浮动按钮
    requestTimeoutMs: 20000
  };
  /* ========================================================== */

  const W = (typeof unsafeWindow !== 'undefined' && unsafeWindow) ? unsafeWindow : window;

  // 只在「猪事顺利」这个页面上工作
  if (!/猪事顺利/.test(document.title || '')) return;
  if (!document.getElementById('calendar') || !document.getElementById('weekLabel')) return;

  // 页面自己带按钮时（1.1+），脚本不再画自己的 UI，结果通过 return + 事件交给页面
  const PAGE_HAS_BUTTON = !!document.getElementById('zjuSyncBtn');
  const USE_FALLBACK_UI = !!CFG.showButton && !PAGE_HAS_BUTTON;

  const EVENTS_KEY = 'weeklyPlanEvents';
  const API = 'https://courses.zju.edu.cn/api/todos?no-intercept=true';
  const PORTAL = 'https://courses.zju.edu.cn/user/index';
  const TYPE_CN = { homework: '作业', exam: '考试', quiz: '测验', survey: '问卷', questionnaire: '问卷', discussion: '讨论' };

  /* ------------------------------ 小工具 ------------------------------ */
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function parseDeadline(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return {
      date: d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()),
      time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()),
      ms: d.getTime(),
      text: d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
    };
  }

  function buildContent(t) {
    let s = t.title || '学在浙大待办';
    /* 课程名放在标题前面，形如「计算机网络 lab 6」 */
    if (t.course_name) s = t.course_name + ' ' + s;
    return CFG.contentPrefix + s;
  }

  function buildNotes(t, when) {
    const type = TYPE_CN[t.type] || t.type || '待办';
    const lines = [];
    lines.push('学在浙大 · ' + (t.course_name || '未知课程') + '（' + type + '）');
    lines.push('截止：' + when.text);
    if (t.course_code) lines.push('课程代码：' + t.course_code);
    lines.push('打开：https://courses.zju.edu.cn/course/' + (t.course_id || '') + '/learning-activity#/' + t.id);
    return lines.join('\n');
  }

  /* ------------------------------ 网络 ------------------------------ */
  function gmRequest() {
    return new Promise(function (resolve, reject) {
      if (typeof GM_xmlhttpRequest !== 'function') {
        reject({ code: 'NO_GM' });
        return;
      }
      GM_xmlhttpRequest({
        method: 'GET',
        url: API,
        timeout: CFG.requestTimeoutMs,
        headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        onload: function (res) { resolve(res); },
        onerror: function () { reject({ code: 'NETWORK' }); },
        ontimeout: function () { reject({ code: 'NETWORK' }); },
        onabort: function () { reject({ code: 'NETWORK' }); }
      });
    });
  }

  async function fetchTodos() {
    const res = await gmRequest();
    if (res.status === 401 || res.status === 403) throw { code: 'AUTH' };
    if (res.status !== 200) throw { code: 'HTTP_' + res.status };
    let json = null;
    try { json = JSON.parse(res.responseText); } catch (e) { json = null; }
    // 登录态失效时服务端会把 html 登录页返回回来，JSON.parse 会失败
    if (!json || !Array.isArray(json.todo_list)) throw { code: 'AUTH' };
    return json.todo_list;
  }

  /* ------------------------------ 数据读写 ------------------------------ */
  function readEvents() {
    try {
      const raw = W.localStorage.getItem(EVENTS_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object') ? obj : {};
    } catch (e) {
      return {};
    }
  }

  function sortDay(list) {
    list.sort(function (a, b) {
      const ta = (a && a.time) ? a.time : '99:99';
      const tb = (b && b.time) ? b.time : '99:99';
      return ta < tb ? -1 : (ta > tb ? 1 : 0);
    });
  }

  function refreshApp() {
    try { if (typeof W.render === 'function') W.render(); } catch (e) { /* 忽略 */ }
  }

  /* ------------------------------ 合并 ------------------------------ */
  function mergeTodos(todos) {
    const events = readEvents();
    const before = JSON.stringify(events);

    Object.keys(events).forEach(function (d) { if (!Array.isArray(events[d])) delete events[d]; });

    const index = new Map();
    Object.keys(events).forEach(function (d) {
      events[d].forEach(function (ev) {
        if (ev && ev.zjuTodoId !== undefined && ev.zjuTodoId !== null && ev.zjuTodoId !== '') {
          index.set(String(ev.zjuTodoId), { date: d, ev: ev });
        }
      });
    });

    const seen = new Set();
    let added = 0, updated = 0, adopted = 0;

    (todos || []).forEach(function (t) {
      if (!t || t.id === undefined || t.id === null) return;
      const id = String(t.id);
      const when = parseDeadline(t.end_time);
      if (!when) return;
      seen.add(id);

      const content = buildContent(t);
      const notes = buildNotes(t, when);
      let hit = index.get(id);

      // 兼容：事项被手动编辑过会丢掉 zjuTodoId，按「同一天 + 同标题」认领，避免重复添加
      if (!hit) {
        const list = events[when.date] || [];
        for (let i = 0; i < list.length; i++) {
          const cand = list[i];
          if (cand && cand.content === content && (cand.zjuTodoId === undefined || cand.zjuTodoId === null || cand.zjuTodoId === '')) {
            cand.zjuTodoId = id;
            hit = { date: when.date, ev: cand };
            index.set(id, hit);
            adopted++;
            break;
          }
        }
      }

      if (hit) {
        const ev = hit.ev;
        let changed = false;
        if (ev.content !== content) { ev.content = content; changed = true; }
        if (ev.notes !== notes) { ev.notes = notes; changed = true; }
        if (ev.category !== CFG.category) { ev.category = CFG.category; changed = true; }
        if ((ev.course || '') !== (t.course_name || '')) { ev.course = t.course_name || ''; changed = true; }
        if (ev.time !== when.time) { ev.time = when.time; changed = true; }
        if (ev.isDDL !== true) { ev.isDDL = true; changed = true; }
        if (ev.zjuEnd !== when.ms) { ev.zjuEnd = when.ms; changed = true; }
        if (ev.zjuAutoDone === true) {
          ev.done = false;
          delete ev.zjuAutoDone;
          changed = true;
        }
        if (hit.date !== when.date) {
          const oldList = events[hit.date] || [];
          const pos = oldList.indexOf(ev);
          if (pos >= 0) oldList.splice(pos, 1);
          if (!oldList.length) delete events[hit.date];
          if (!events[when.date]) events[when.date] = [];
          events[when.date].push(ev);
          sortDay(events[when.date]);
          hit.date = when.date;
          changed = true;
        }
        if (changed) updated++;
      } else {
        if (!events[when.date]) events[when.date] = [];
        events[when.date].push({
          content: content,
          category: CFG.category,
          time: when.time,
          done: false,
          isProject: 'no',
          projectName: null,
          isDDL: true,
          notes: notes,
          course: (t.course_name || ''),
          zjuTodoId: id,
          zjuCourseId: (t.course_id === undefined ? null : t.course_id),
          zjuEnd: when.ms
        });
        sortDay(events[when.date]);
        added++;
      }
    });

    // 待办消失了（已提交 / 已失效）→ 自动打勾
    let autoDone = 0, skippedAutoDone = false;
    if (CFG.markGoneAsDone) {
      if (!(todos || []).length && index.size) {
        skippedAutoDone = true;   // 返回 0 项时保守处理，避免登录异常把事项全打勾
      }
      index.forEach(function (hit, id) {
        if (skippedAutoDone) return;
        if (seen.has(id)) return;
        const ev = hit.ev;
        if (!ev || ev.done === true) return;
        ev.done = true;
        ev.zjuAutoDone = true;
        autoDone++;
      });
    }

    const after = JSON.stringify(events);
    const changed = after !== before;
    if (changed) {
      try { W.localStorage.setItem(EVENTS_KEY, after); }
      catch (e) { return { ok: false, code: 'STORAGE' }; }
      refreshApp();
    }
    return { ok: true, added: added, updated: updated, adopted: adopted, autoDone: autoDone, skippedAutoDone: skippedAutoDone, total: (todos || []).length, changed: changed };
  }

  /* ------------------------------ 兜底界面（页面没有按钮时才出现） ------------------------------ */
  let box = null, btn = null, tip = null, syncing = false, hideTimer = null;

  function injectStyle() {
    if (document.getElementById('zju-sync-style')) return;
    const st = document.createElement('style');
    st.id = 'zju-sync-style';
    st.textContent = [
      '.zju-sync-box{position:fixed;left:14px;bottom:14px;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-start;gap:5px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}',
      '.zju-sync-btn{background:#fff;border:1px solid #c8d4c0;border-radius:20px;color:#5a7a52;font-size:12px;padding:6px 14px;cursor:pointer;box-shadow:0 2px 10px rgba(61,92,53,.12);font-family:inherit;transition:background .2s}',
      '.zju-sync-btn:hover{background:#f5edc8}',
      '.zju-sync-btn[disabled]{opacity:.55;cursor:default}',
      '.zju-sync-tip{font-size:11px;line-height:1.45;color:#8fa888;background:rgba(255,255,255,.94);border-radius:8px;padding:3px 8px;max-width:270px;box-shadow:0 2px 8px rgba(61,92,53,.10);display:none}',
      '.zju-sync-tip.show{display:block}',
      '.zju-sync-tip.ok{color:#457635}',
      '.zju-sync-tip.warn{color:#a8762a;cursor:pointer}',
      '.zju-sync-tip.err{color:#a05050}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(st);
  }

  function ensureUI() {
    if (box || !USE_FALLBACK_UI) return;
    injectStyle();
    box = document.createElement('div');
    box.className = 'zju-sync-box';
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zju-sync-btn';
    btn.textContent = '同步学在浙大';
    btn.addEventListener('click', function () { runSync(true); });
    tip = document.createElement('div');
    tip.className = 'zju-sync-tip';
    box.appendChild(btn);
    box.appendChild(tip);
    (document.body || document.documentElement).appendChild(box);
  }

  function setStatus(text, tone, opts) {
    if (!USE_FALLBACK_UI) return;
    opts = opts || {};
    ensureUI();
    if (!tip) return;
    tip.textContent = text;
    tip.className = 'zju-sync-tip show' + (tone ? ' ' + tone : '');
    tip.onclick = opts.onClick || null;
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (opts.hideAfter !== 0) {
      hideTimer = setTimeout(function () { tip.className = 'zju-sync-tip'; }, opts.hideAfter || 25000);
    }
  }

  /* ------------------------------ 把结果交给页面 ------------------------------ */
  function emit(result) {
    try {
      document.dispatchEvent(new CustomEvent('zhushi-zju-sync', { detail: result }));
    } catch (e) { /* 忽略 */ }
  }

  /* ------------------------------ 同步主流程 ------------------------------ */
  let authBroken = false;

  async function runSync(manual) {
    if (syncing) return { ok: false, message: '正在同步中，请稍候', manual: !!manual };
    syncing = true;
    if (btn) btn.disabled = true;
    if (manual || !authBroken) setStatus('正在同步学在浙大…', '', { hideAfter: 0 });

    let result;
    try {
      const todos = await fetchTodos();
      authBroken = false;
      const r = mergeTodos(todos);
      if (!r.ok && r.code === 'STORAGE') {
        setStatus('同步到了，但写不进本地存储（可能是浏览器限制）', 'err');
        result = { ok: false, message: '写不进本地存储', manual: !!manual };
      } else {
        const bits = [];
        if (r.added) bits.push('新增 ' + r.added);
        if (r.updated) bits.push('更新 ' + r.updated);
        if (r.autoDone) bits.push('打勾 ' + r.autoDone);
        if (r.skippedAutoDone) bits.push('返回 0 项，未自动打勾');
        const summary = bits.length ? bits.join(' · ') : '无变化';
        const msg = summary + '（共 ' + r.total + ' 项待办）';
        setStatus('已同步 ' + clockNow() + '：' + msg, 'ok');
        try { GM_setValue('lastSyncAt', Date.now()); } catch (e) { /* 忽略 */ }
        result = { ok: true, message: msg, changed: r.added > 0 || r.updated > 0 || r.autoDone > 0, manual: !!manual };
      }
    } catch (e) {
      const code = (e && e.code) || 'UNKNOWN';
      let msg, tone = 'err', opts = {};
      if (code === 'AUTH') {
        authBroken = true;
        msg = '登录态已失效，需先去学在浙大登录一次';
        tone = 'warn';
        opts = { hideAfter: 0, onClick: function () { try { GM_openInTab(PORTAL, { active: true }); } catch (err) { window.open(PORTAL, '_blank'); } } };
      } else if (code === 'NO_GM') {
        msg = '没有 GM_xmlhttpRequest 权限，请检查脚本头部 @grant';
      } else if (code === 'NETWORK') {
        msg = '连不上学在浙大（网络或超时）';
      } else {
        msg = '同步失败：' + code;
      }
      setStatus(msg, tone, opts);
      result = { ok: false, message: msg, manual: !!manual };
    } finally {
      syncing = false;
      if (btn) btn.disabled = false;
    }

    if (!manual) emit(result);
    return result;
  }

  function clockNow() {
    const d = new Date();
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  /* ------------------------------ 给页面用的接口 ------------------------------ */
  try {
    if (W) W.__zhushiZjuSync = function () { return runSync(true); };
  } catch (e) { /* 忽略 */ }

  /* ------------------------------ 启动 ------------------------------ */
  if (USE_FALLBACK_UI) {
    ensureUI();
    let last = 0;
    try { last = Number(GM_getValue('lastSyncAt', 0)) || 0; } catch (e) { last = 0; }
    if (last) {
      const d = new Date(last);
      setStatus('上次同步 ' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()), '');
    }
    runSync(false);
  } else {
    // 页面有按钮：打开时静默同步一次，成功且无变化就不打扰
    runSync(false);
  }

  if (CFG.intervalMinutes > 0) {
    setInterval(function () {
      if (!document.hidden) runSync(false);
    }, CFG.intervalMinutes * 60000);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    let last = 0;
    try { last = Number(GM_getValue('lastSyncAt', 0)) || 0; } catch (e) { last = 0; }
    const gap = CFG.intervalMinutes > 0 ? CFG.intervalMinutes * 60000 : 5 * 60000;
    if (Date.now() - last > gap) runSync(false);
  });
})();
