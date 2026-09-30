/* 시지각 워크북 — 태블릿 앱 (갤럭시탭 + S펜)
 * 문항은 인쇄본과 같은 엔진(VP.makePage)으로 만든다. 같은 영역·단계·쪽 = 같은 문항.
 * 기록은 이 기기의 localStorage 에만 저장한다(내보내기 없음).
 */
(function () {
  const $ = (s) => document.querySelector(s);
  const NS = "http://www.w3.org/2000/svg";
  const LS = "vpwb.v1", LSS = "vpwb.settings";
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let DB = load(LS, { children: [], sessions: [] });
  const S = Object.assign({ pic: "3d", lineTasks: "line", theme: "kid", big: false, scan: false, scanSec: 2, cvi: false, pen: true, sound: true, tts: false, child: "", area: "A", level: 1, page: 1 }, load(LSS, {}));
  const saveS = () => save(LSS, S);
  const saveDB = () => save(LS, DB);

  // ================= 화면 전환 =================
  function show(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.toggle("on", s.id === id));
    document.body.classList.toggle("cvi", S.cvi && id === "play");
  }

  // ================= 시작 화면 =================
  function renderHome() {
    const sel = $("#childSel");
    sel.innerHTML = DB.children.length ? DB.children.map((c) => `<option ${c.code === S.child ? "selected" : ""}>${esc(c.code)}</option>`).join("") : `<option value="">(아동 코드를 추가하세요)</option>`;
    if (!S.child && DB.children[0]) S.child = DB.children[0].code;
    segSet("#themeSeg", S.theme);
    segSet("#levelSeg", String(S.level));
    segSet("#picSeg", S.pic); segSet("#lineSeg", S.lineTasks);
    $("#areaGrid").innerHTML = VP.AREA_ORDER.map((a) => `<button data-a="${a}" class="${a === S.area ? "on" : ""}" style="background:${VP.AREAS[a].color}"><b>${a}</b>${VP.AREAS[a].name[S.theme]}</button>`).join("");
    const done = new Set(DB.sessions.filter((x) => x.child === S.child && x.theme === S.theme && x.area === S.area && x.level === S.level).map((x) => x.page));
    $("#pageRow").innerHTML = [...Array(10)].map((_, i) => `<button data-p="${i + 1}" class="${S.page === i + 1 ? "on" : ""} ${done.has(i + 1) ? "done" : ""}">${i + 1}</button>`).join("");
    $("#optBig").checked = S.big; $("#optScan").checked = S.scan; $("#optCvi").checked = S.cvi; $("#optPen").checked = S.pen; $("#optSound").checked = S.sound; $("#optTts").checked = S.tts;
    $("#optScanSec").value = S.scanSec; $("#optScanOut").textContent = S.scanSec + "초";
    $("#btnStart").disabled = !S.child;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function segSet(sel, v) { document.querySelectorAll(sel + " button").forEach((b) => b.classList.toggle("on", b.dataset.v === v)); }

  function bindHome() {
    $("#childSel").onchange = (e) => { S.child = e.target.value; const c = DB.children.find((x) => x.code === S.child); if (c) S.theme = c.theme || S.theme; saveS(); renderHome(); };
    $("#childAdd").onclick = () => {
      const code = $("#childNew").value.trim();
      if (!code) return;
      if (!DB.children.some((c) => c.code === code)) DB.children.push({ code, theme: S.theme, created: new Date().toISOString() });
      S.child = code; $("#childNew").value = ""; saveDB(); saveS(); renderHome();
    };
    $("#themeSeg").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; S.theme = b.dataset.v; const c = DB.children.find((x) => x.code === S.child); if (c) { c.theme = S.theme; saveDB(); } saveS(); renderHome(); };
    $("#picSeg").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; S.pic = b.dataset.v; saveS(); renderHome(); };
    $("#lineSeg").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; S.lineTasks = b.dataset.v; saveS(); renderHome(); };
    $("#levelSeg").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; S.level = +b.dataset.v; S.page = 1; saveS(); renderHome(); };
    $("#areaGrid").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; S.area = b.dataset.a; S.page = 1; saveS(); renderHome(); };
    $("#pageRow").onclick = (e) => { const b = e.target.closest("button"); if (!b) return; S.page = +b.dataset.p; saveS(); renderHome(); };
    const opt = (id, key, f) => ($(id).onchange = (e) => { S[key] = f ? f(e.target) : e.target.checked; saveS(); renderHome(); });
    opt("#optBig", "big"); opt("#optScan", "scan"); opt("#optCvi", "cvi"); opt("#optPen", "pen"); opt("#optSound", "sound"); opt("#optTts", "tts");
    $("#optScanSec").oninput = (e) => { S.scanSec = +e.target.value; $("#optScanOut").textContent = S.scanSec + "초"; saveS(); };
    $("#btnStart").onclick = () => { unlockAudio(); startPage(); };
    $("#btnRecords").onclick = () => { renderRecords(); show("records"); };
    $("#btnRecBack").onclick = () => { renderHome(); show("home"); };
    $("#recChild").onchange = (e) => renderRecords(e.target.value);
    $("#btnDelChild").onclick = () => {
      const code = $("#recChild").value;
      if (!code || !confirm(`'${code}' 아동과 모든 기록을 지울까요? 되돌릴 수 없습니다.`)) return;
      DB.children = DB.children.filter((c) => c.code !== code);
      DB.sessions = DB.sessions.filter((s) => s.child !== code);
      if (S.child === code) S.child = DB.children[0] ? DB.children[0].code : "";
      saveDB(); saveS(); renderRecords();
    };
    $("#btnInfo").onclick = () => $("#info").showModal();
    $("#btnAgain").onclick = () => startPage();
    $("#btnNext").onclick = () => { if (S.page < 10) S.page++; else if (S.level < 3) { S.level++; S.page = 1; } saveS(); startPage(); };
    $("#btnToHome").onclick = () => { renderHome(); show("home"); };
    $("#btnSpeak").onclick = () => speak(P && P.page.instr, true);
    // 🏠 1초 길게 누르기 → 끝내기
    const hb = $("#btnHome"); let ht = null, t0 = 0;
    const bar = hb.querySelector("i");
    const stop = () => { clearInterval(ht); ht = null; bar.style.width = "0"; };
    hb.onpointerdown = (e) => { e.preventDefault(); t0 = Date.now(); ht = setInterval(() => { const p = Math.min(1, (Date.now() - t0) / 1000); bar.style.width = p * 100 + "%"; if (p >= 1) { stop(); quitPlay(); } }, 30); };
    hb.onpointerup = hb.onpointerleave = hb.onpointercancel = stop;
    window.addEventListener("keydown", (e) => {
      if ((e.code === "Space" || e.code === "Enter") && scanSel) { e.preventDefault(); scanSel(); }
      if (e.code === "Escape" && $("#play").classList.contains("on")) quitPlay();
    });
    window.addEventListener("resize", () => cur && cur.fit());
  }

  // ================= 소리·음성 =================
  let AC = null;
  function unlockAudio() { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); AC.resume(); } catch (e) {} }
  function sound(kind) {
    if (!S.sound || !AC) return;
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.connect(g); g.connect(AC.destination);
    if (kind === "ok") { o.type = "sine"; o.frequency.setValueAtTime(660, t); o.frequency.setValueAtTime(990, t + 0.09); }
    else if (kind === "done") { o.type = "triangle"; [523, 659, 784, 1047].forEach((f, i) => o.frequency.setValueAtTime(f, t + i * 0.1)); }
    else { o.type = "sine"; o.frequency.setValueAtTime(220, t); }
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
    const len = kind === "done" ? 0.5 : 0.22;
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.start(t); o.stop(t + len + 0.02);
  }
  function speak(txt, force) {
    if (!txt || (!S.tts && !force) || !window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(txt.replace(/[○□▶→]/g, " "));
    u.lang = "ko-KR"; u.rate = 0.95;
    speechSynthesis.speak(u);
  }

  // ================= 활동 진행 =================
  let P = null, cur = null, scanT = null, scanSel = null;

  function startPage() {
    VP.STYLE = { pic: S.pic, lineTasks: S.lineTasks };
    const page = VP.makePage(S.area, S.level, S.theme, S.page);
    const items = page.items.filter((i) => i.mode !== "label");
    P = { page, items, idx: 0, results: [], t0: Date.now() };
    show("play");
    $("#playTitle").textContent = `${S.area} ${VP.AREAS[S.area].name[S.theme]} ${"★".repeat(S.level)} · ${S.page}쪽`;
    $("#instr").textContent = page.instr;
    $("#progress").innerHTML = items.map(() => "<span></span>").join("");
    speak(page.instr);
    runItem();
  }
  function quitPlay() { clearStage(); speechSynthesis && speechSynthesis.cancel(); P = null; renderHome(); show("home"); }

  function clearStage() {
    clearInterval(scanT); scanT = null; scanSel = null;
    if (cur && cur.cleanup) cur.cleanup();
    cur = null;
    $("#stage").innerHTML = ""; $("#tools").innerHTML = "";
  }

  function runItem() {
    clearStage();
    const it = P.items[P.idx];
    [...$("#progress").children].forEach((s, i) => s.classList.toggle("cur", i === P.idx));
    const t0 = Date.now();
    const done = (res) => {
      clearInterval(scanT); scanT = null; scanSel = null;
      res.ms = Date.now() - t0; res.mode = it.mode;
      P.results.push(res);
      const dot = $("#progress").children[P.idx];
      dot.classList.remove("cur"); dot.classList.add(res.ok ? "ok" : "bad");
      sound(res.ok ? "done" : "ok");
      setTimeout(() => { P.idx++; P.idx < P.items.length ? runItem() : finishPage(); }, res.ok ? 900 : 600);
    };
    (MODES[it.mode] || MODES.one)(it, done);
  }

  function finishPage() {
    clearStage();
    const n = P.results.length, correct = P.results.filter((r) => r.ok).length, errors = P.results.reduce((a, r) => a + (r.errors || 0), 0), ms = Date.now() - P.t0;
    DB.sessions.push({ child: S.child, theme: S.theme, area: S.area, level: S.level, page: S.page, date: new Date().toISOString(), n, correct, errors, ms, opts: { big: S.big, scan: S.scan, cvi: S.cvi }, detail: P.results.map((r) => ({ m: r.mode, ok: r.ok, e: r.errors || 0, ms: r.ms, sc: r.score })) });
    saveDB();
    const pct = Math.round((correct / n) * 100);
    $("#resEmoji").textContent = pct >= 90 ? "🌟" : pct >= 60 ? "👍" : "💪";
    $("#resTitle").textContent = pct >= 90 ? "아주 잘했어요!" : pct >= 60 ? "잘했어요!" : "끝까지 해냈어요!";
    $("#resStats").innerHTML = `한 번에 맞힌 문항 <b>${correct} / ${n}</b> (${pct}%)<br>다시 고친 횟수 ${errors}번 · 걸린 시간 ${fmtTime(ms)}`;
    $("#btnNext").textContent = S.page < 10 ? `다음 쪽 (${S.page + 1}) ▶` : S.level < 3 ? "다음 단계 ▶" : "처음부터 ▶";
    show("result");
  }
  const fmtTime = (ms) => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`; };

  // ---------- SVG 올리기 (내용 + 겹침 층) ----------
  function mount(svgStr) {
    const stage = $("#stage");
    const wrap = document.createElement("div");
    wrap.className = "wrap";
    wrap.innerHTML = svgStr;
    const content = wrap.firstElementChild;
    content.classList.add("content");
    const w = +content.dataset.w, h = +content.dataset.h;
    const ov = document.createElementNS(NS, "svg");
    ov.setAttribute("viewBox", `0 0 ${w} ${h}`);
    ov.classList.add("ov");
    ov.innerHTML = `<g class="marks"></g><g class="inkL"></g><g class="top"></g>`;
    wrap.appendChild(ov);
    stage.appendChild(wrap);
    const hits = [...content.querySelectorAll(".hit")].map((g) => {
      const r = g.querySelector(".hitbox");
      const x = +r.getAttribute("x"), y = +r.getAttribute("y"), ww = +r.getAttribute("width"), hh = +r.getAttribute("height");
      return { id: g.dataset.hit, x, y, w: ww, h: hh, cx: x + ww / 2, cy: y + hh / 2 };
    });
    const M = {
      wrap, content, ov, w, h, hits,
      marks: ov.querySelector(".marks"), inkL: ov.querySelector(".inkL"), top: ov.querySelector(".top"),
      fit() {
        const sw = stage.clientWidth - 24, sh = stage.clientHeight - 24;
        const k = Math.min(sw / w, sh / h);
        wrap.style.width = w * k + "px"; wrap.style.height = h * k + "px";
      },
    };
    M.fit();
    cur = M;
    return M;
  }
  function pt(M, e) {
    const p = M.ov.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(M.ov.getScreenCTM().inverse());
  }
  function el(parent, tag, attrs) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    parent.appendChild(n);
    return n;
  }
  function markRect(M, h, cls, layer) {
    return el(layer || M.marks, "rect", { x: h.x - 0.6, y: h.y - 0.6, width: h.w + 1.2, height: h.h + 1.2, rx: 2, class: cls });
  }
  function flash(M, h) { const r = markRect(M, h, "mk-bad"); setTimeout(() => r.remove(), 700); }
  function findHit(M, p, list) {
    list = list || M.hits;
    const pad = S.big ? 5 : 0.8;
    let best = null, bd = 1e9;
    for (const h of list) {
      const inside = p.x >= h.x - pad && p.x <= h.x + h.w + pad && p.y >= h.y - pad && p.y <= h.y + h.h + pad;
      const d = Math.hypot(p.x - h.cx, p.y - h.cy);
      if (inside && d < bd) { best = h; bd = d; }
    }
    if (!best && S.big) for (const h of list) { const d = Math.hypot(p.x - h.cx, p.y - h.cy); if (d < 12 && d < bd) { best = h; bd = d; } }
    return best;
  }
  /* 터치 받기. 스위치 모드이면 화면 어디를 눌러도 '지금 강조된 것'을 고른다 */
  function onTap(M, fn) {
    M.ov.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (S.scan && scanSel) { scanSel(); return; }
      const h = findHit(M, pt(M, e));
      if (h) fn(h);
    });
  }
  function startScan(M, listFn, pick) {
    if (!S.scan) return;
    let k = -1, r = null, curH = null;
    const step = () => {
      const L = listFn();
      if (!L.length) return;
      k = (k + 1) % L.length;
      r && r.remove();
      curH = L[k];
      r = markRect(M, curH, "mk-scan" + (S.cvi ? " pulse" : ""), M.top);
    };
    step();
    scanT = setInterval(step, S.scanSec * 1000 * (S.cvi ? 1.3 : 1));
    scanSel = () => { if (curH) { const h = curH; pick(h); } };
  }
  function tools(html) { $("#tools").innerHTML = html; return $("#tools"); }
  function msg(text, ms) {
    const m = document.createElement("div");
    m.className = "msg"; m.textContent = text;
    $("#stage").appendChild(m);
    setTimeout(() => m.remove(), ms || 1800);
  }
  const noScan = () => { if (S.scan) msg("그리기 활동은 스위치로 할 수 없어요 — 치료사가 손을 도와주세요", 3000); };

  // ================= 활동별 처리 =================
  function selectLoop(M, ans, multi, done) {
    ans = ans.map(String);
    const found = new Set();
    let errors = 0;
    const pick = (h) => {
      if (ans.includes(h.id)) {
        if (found.has(h.id)) return;
        found.add(h.id); markRect(M, h, "mk-ok"); sound("ok");
        if (!multi || found.size === ans.length) done({ ok: errors === 0, errors });
      } else { flash(M, h); errors++; sound("bad"); }
    };
    onTap(M, pick);
    startScan(M, () => M.hits.filter((h) => !found.has(h.id)), pick);
  }

  const MODES = {
    one(it, done) { const M = mount(it.svg); selectLoop(M, it.answer, false, done); },
    all(it, done) { const M = mount(it.svg); selectLoop(M, it.answer, true, done); },

    track(it, done) {
      const M = mount(it.svg);
      const n = it.answer.length;
      let i = 0, errors = 0, cue = null;
      const ys = (k) => (M.h / (n + 1)) * (k + 1);
      const showCue = () => { cue && cue.remove(); cue = el(M.top, "rect", { x: 0, y: ys(i) - 13, width: 30, height: 26, rx: 4, class: "mk-cue pulse" }); };
      showCue();
      const pick = (h) => {
        if (h.id === "e" + it.answer[i]) {
          markRect(M, h, "mk-ok"); sound("ok"); i++;
          if (i >= n) { cue.remove(); done({ ok: errors === 0, errors }); } else showCue();
        } else if (h.id[0] === "e") { flash(M, h); errors++; sound("bad"); }
      };
      onTap(M, pick);
      startScan(M, () => M.hits.filter((h) => h.id[0] === "e"), pick);
    },

    memory(it, done) {
      const M = mount(it.show);
      const sec = (it.showSec || 5) * (S.cvi ? 1.5 : 1);
      const cd = document.createElement("div"); cd.className = "countdown"; cd.innerHTML = "<i></i>";
      $("#stage").appendChild(cd);
      const bar = cd.firstChild; const t0 = Date.now();
      const tick = setInterval(() => {
        const p = 1 - (Date.now() - t0) / (sec * 1000);
        bar.style.width = Math.max(0, p * 100) + "%";
        if (p <= 0) { clearInterval(tick); ask(); }
      }, 50);
      M.cleanup = () => clearInterval(tick);
      const ask = () => {
        clearStage();
        const A = mount(it.ask);
        if (it.sub === "cells") return cellsToggle(A, it.answer, done);
        selectLoop(A, it.answer, it.sub === "all", done);
      };
    },

    dots(it, done) {
      const M = mount(it.svg);
      const n = it.answer;
      const byId = Object.fromEntries(M.hits.map((h) => [h.id, h]));
      let k = 0, errors = 0;
      const line = (a, b) => el(M.inkL, "line", { x1: a.cx, y1: a.cy, x2: b.cx, y2: b.cy, class: "snap", "stroke-width": 1.2 });
      markRect(M, byId.d0, "mk-cue pulse", M.top);
      const pick = (h) => {
        if (h.id === "d" + k) {
          if (k > 0) line(byId["d" + (k - 1)], h);
          markRect(M, h, "mk-ok"); sound("ok"); k++;
          if (k >= n) { line(h, byId.d0); done({ ok: errors <= 1, errors }); }
        } else if (+h.id.slice(1) > k) { flash(M, h); errors++; sound("bad"); }
      };
      onTap(M, pick);
      startScan(M, () => M.hits.filter((h) => +h.id.slice(1) >= k), pick);
    },

    cells(it, done) {
      const M = mount(it.svg);
      const colors = it.colors;
      let color = colors[0];
      const fill = {};
      const rects = {};
      const bar = tools(colors.map((c, i) => `<button class="sw ${i ? "" : "on"}" data-c="${c}" style="background:${c}"></button>`).join("") + `<button class="btn" data-x="clear">모두 지우기</button><button class="btn okc" data-x="check">확인</button>`);
      bar.onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.c) { color = b.dataset.c; bar.querySelectorAll(".sw").forEach((s) => s.classList.toggle("on", s === b)); }
        if (b.dataset.x === "clear") { for (const k in rects) rects[k].remove(); for (const k in fill) delete fill[k]; }
        if (b.dataset.x === "check") check();
      };
      const paint = (h) => {
        rects[h.id] && rects[h.id].remove();
        if (fill[h.id] === color) { delete fill[h.id]; return; }
        fill[h.id] = color;
        rects[h.id] = el(M.inkL, "rect", { x: h.x + 0.4, y: h.y + 0.4, width: h.w - 0.8, height: h.h - 0.8, fill: color });
      };
      onTap(M, paint);
      let errors = 0;
      const check = () => {
        const want = {}; for (const k in it.answer) want[k] = it.answer[k];
        const wrong = M.hits.filter((h) => (want[h.id] || null) !== (fill[h.id] || null));
        if (!wrong.length) return done({ ok: errors === 0, errors });
        errors++; sound("bad");
        wrong.forEach((h) => flash(M, h));
        offerSkip(done, () => ({ ok: false, errors }));
      };
    },

    blocks(it, done) {
      const M = mount(it.svg);
      const st = {}, shapes = {};
      const TRI = { 2: [[0, 0], [1, 0], [0, 1]], 3: [[0, 0], [1, 0], [1, 1]], 4: [[1, 0], [1, 1], [0, 1]], 5: [[0, 0], [1, 1], [0, 1]] };
      const draw = (h) => {
        shapes[h.id] && shapes[h.id].remove();
        const v = st[h.id] || 0;
        if (v === 1) shapes[h.id] = el(M.inkL, "rect", { x: h.x, y: h.y, width: h.w, height: h.h, fill: it.color });
        if (v >= 2) shapes[h.id] = el(M.inkL, "path", { d: "M" + TRI[v].map((p) => `${h.x + p[0] * h.w} ${h.y + p[1] * h.h}`).join("L") + "Z", fill: it.color });
      };
      onTap(M, (h) => { st[h.id] = ((st[h.id] || 0) + 1) % 6; draw(h); });
      let errors = 0;
      const bar = tools(`<span class="hint" style="align-self:center">칸을 누를 때마다 모양이 바뀌어요</span><button class="btn" data-x="clear">모두 지우기</button><button class="btn okc" data-x="check">확인</button>`);
      bar.onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.x === "clear") M.hits.forEach((h) => { st[h.id] = 0; draw(h); });
        if (b.dataset.x === "check") {
          const wrong = M.hits.filter((h) => (st[h.id] || 0) !== (it.answer[h.id] || 0));
          if (!wrong.length) return done({ ok: errors === 0, errors });
          errors++; sound("bad"); wrong.forEach((h) => flash(M, h));
          offerSkip(done, () => ({ ok: false, errors }));
        }
      };
    },

    copy(it, done) {
      noScan();
      const M = mount(it.svg);
      const g = it.grid;
      const cs = g.cs || g.size / g.cells, cols = g.cols || g.cells, rows = g.rows || g.cells;
      const segs = new Set();
      const segEls = {};
      const strokes = [];
      const LP = (i, j) => [g.x + i * cs, g.y + j * cs];
      const near = (p) => {
        const i = Math.round((p.x - g.x) / cs), j = Math.round((p.y - g.y) / cs);
        if (i < 0 || j < 0 || i > cols || j > rows) return null;
        const [x, y] = LP(i, j);
        return Math.hypot(p.x - x, p.y - y) < cs * (S.big ? 0.45 : 0.36) ? [i, j] : null;
      };
      const addSeg = (a, b, list) => {
        const k = VP.segKey(a, b);
        if (segs.has(k)) return;
        segs.add(k); list.push(k);
        const [p, q] = [LP(...a), LP(...b)];
        segEls[k] = el(M.inkL, "line", { x1: p[0], y1: p[1], x2: q[0], y2: q[1], class: "snap", "stroke-width": Math.max(1, cs * 0.09) });
      };
      drawInput(M, {
        start(p, st) { st.anchor = near(p); st.added = []; },
        move(p, st) {
          const n = near(p);
          if (!n) return;
          if (!st.anchor) { st.anchor = n; return; }
          const [ax, ay] = st.anchor, dx = n[0] - ax, dy = n[1] - ay;
          if (!dx && !dy) return;
          // 곧은 방향(가로·세로·대각선)이면 중간 점까지 한 칸씩 잇는다
          if (dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy)) {
            const steps = Math.max(Math.abs(dx), Math.abs(dy)), sx = Math.sign(dx), sy = Math.sign(dy);
            for (let s = 0; s < steps; s++) addSeg([ax + sx * s, ay + sy * s], [ax + sx * (s + 1), ay + sy * (s + 1)], st.added);
          }
          st.anchor = n;
        },
        end(p, st) { if (st.added.length) strokes.push(st.added); },
        keepInk: false,
      });
      let errors = 0, marks = [];
      const clearMarks = () => { marks.forEach((m) => m.remove()); marks = []; };
      const bar = tools(`<button class="btn" data-x="undo">↶ 한 획 지우기</button><button class="btn" data-x="clear">모두 지우기</button><button class="btn okc" data-x="check">확인</button>`);
      bar.onclick = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        clearMarks();
        if (b.dataset.x === "undo") { const last = strokes.pop() || []; last.forEach((k) => { segs.delete(k); segEls[k].remove(); }); }
        if (b.dataset.x === "clear") { segs.forEach((k) => segEls[k].remove()); segs.clear(); strokes.length = 0; }
        if (b.dataset.x === "check") {
          const want = new Set(it.answer);
          const miss = [...want].filter((k) => !segs.has(k)), extra = [...segs].filter((k) => !want.has(k));
          if (!miss.length && !extra.length) return done({ ok: errors === 0, errors, score: 100 });
          errors++; sound("bad");
          const line = (k, cls) => { const [a, b2] = VP.parseSeg(k).map((q) => LP(...q)); marks.push(el(M.top, "line", { x1: a[0], y1: a[1], x2: b2[0], y2: b2[1], class: cls, "stroke-width": Math.max(1, cs * 0.1) })); };
          extra.forEach((k) => line(k, "extra"));
          if (errors >= 2) miss.forEach((k) => line(k, "miss")); // 두 번째 확인부터 빠진 선을 알려 준다
          msg(errors >= 2 ? "초록 점선이 빠진 선, 빨간 선이 잘못 그린 선이에요" : "다시 비교해 볼까요?");
          const score = Math.round((100 * (want.size - miss.length)) / want.size) - extra.length * 10;
          offerSkip(done, () => ({ ok: false, errors, score: Math.max(0, score) }));
        }
      };
    },

    trace(it, done) { freeDraw(it, done, "trace"); },
    path(it, done) { freeDraw(it, done, "path"); },
    maze(it, done) { freeDraw(it, done, "maze"); },
  };

  /* 틀린 뒤 '다음으로' 버튼 (치료사가 넘길 수 있게) */
  function offerSkip(done, resFn) {
    const bar = $("#tools");
    if (bar.querySelector("[data-x=skip]")) return;
    const b = document.createElement("button");
    b.className = "btn"; b.dataset.x = "skip"; b.textContent = "다음으로 ▶";
    b.onclick = (e) => { e.stopPropagation(); done(resFn()); };
    bar.appendChild(b);
  }

  /* 손가락·S펜 입력. S펜 우선이면 펜을 쓰기 시작한 뒤로 손 터치는 무시(손바닥 거부) */
  let sawPen = false;
  function drawInput(M, h) {
    let st = null, poly = null, pts = null, pid = null;
    M.ov.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "pen") sawPen = true;
      if (S.pen && sawPen && e.pointerType === "touch") return;
      if (st) return;
      e.preventDefault();
      try { M.ov.setPointerCapture(e.pointerId); } catch (err) {}
      pid = e.pointerId;
      st = {}; pts = [];
      const p = pt(M, e);
      pts.push(p);
      poly = el(M.inkL, "polyline", { class: "ink", "stroke-width": h.inkW || 1.1, "stroke-opacity": h.keepInk === false ? 0.35 : 1, points: `${p.x},${p.y}` });
      h.start(p, st);
    });
    M.ov.addEventListener("pointermove", (e) => {
      if (!st || e.pointerId !== pid) return;
      const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
      const evs = co.length ? co : [e];
      for (const ev of evs) {
        const p = pt(M, ev);
        pts.push(p);
        h.move(p, st);
      }
      poly.setAttribute("points", pts.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(" "));
    });
    const up = (e) => {
      if (!st || e.pointerId !== pid) return;
      h.end(pts[pts.length - 1], st, pts);
      if (h.keepInk === false) poly.remove();
      st = null; pid = null;
    };
    M.ov.addEventListener("pointerup", up);
    M.ov.addEventListener("pointercancel", up);
  }

  /* 경로 위의 점 표본 */
  function samplePath(M, d, n) {
    const p = el(M.top, "path", { d, fill: "none", stroke: "none" });
    const L = p.getTotalLength();
    const out = [...Array(n + 1).keys()].map((i) => { const q = p.getPointAtLength((L * i) / n); return { x: q.x, y: q.y }; });
    p.remove();
    return out;
  }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function freeDraw(it, done, kind) {
    noScan();
    const M = mount(it.svg);
    const strokes = [];
    drawInput(M, { start() {}, move() {}, end(p, st, pts) { strokes.push({ pts: pts.slice(), el: M.inkL.lastChild }); }, inkW: kind === "maze" ? 1.4 : 1.1 });
    let errors = 0;
    const bar = tools(`<button class="btn" data-x="undo">↶ 한 획 지우기</button><button class="btn" data-x="clear">모두 지우기</button><button class="btn okc" data-x="check">확인</button>`);
    bar.onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.x === "undo") { const s = strokes.pop(); s && s.el.remove(); }
      if (b.dataset.x === "clear") { strokes.forEach((s) => s.el.remove()); strokes.length = 0; }
      if (b.dataset.x === "check") {
        const all = [].concat(...strokes.map((s) => s.pts));
        if (!all.length) return msg("먼저 그려 보세요");
        const r = evaluate(M, it, kind, all);
        msg(r.text, 2600);
        if (r.ok) return setTimeout(() => done({ ok: errors === 0, errors, score: r.score }), 700);
        errors++; sound("bad");
        offerSkip(done, () => ({ ok: false, errors, score: r.score }));
      }
    };
  }

  function evaluate(M, it, kind, ink) {
    if (kind === "trace" || kind === "path") {
      const tol = kind === "trace" ? 2.6 : it.width / 2 + 0.8;
      const line = samplePath(M, it.path, 80);
      const cov = line.filter((q) => ink.some((p) => dist(p, q) < tol)).length / line.length;
      let score = Math.round(cov * 100);
      if (kind === "path") {
        // 길 밖으로 나간 점의 비율
        const near = ink.filter((p) => { const x = p.x; return line.some((q) => dist(p, q) < it.width / 2 + 0.6); }).length / ink.length;
        const out = Math.round((1 - near) * 100);
        score = Math.max(0, score - out);
        return { ok: cov >= 0.85 && out <= 12, score, text: `길 따라가기 ${Math.round(cov * 100)}% · 벗어난 부분 ${out}%` };
      }
      return { ok: cov >= 0.75, score, text: `점선 따라 긋기 ${score}%` };
    }
    // 미로: 칸 이동을 따라가며 벽을 넘었는지 센다
    const m = it.maze, walls = new Set(m.walls);
    const cellOf = (p) => [Math.floor((p.x - m.ox) / m.cs), Math.floor((p.y - m.oy) / m.cs)];
    let prev = null, cross = 0, reached = false, started = false;
    for (const p of ink) {
      const c = cellOf(p);
      if (c[0] < 0 || c[1] < 0 || c[0] >= m.cols || c[1] >= m.rows) { if (prev) cross++; prev = null; continue; }
      if (c[0] === 0 && c[1] === 0) started = true;
      if (c[0] === m.cols - 1 && c[1] === m.rows - 1) reached = true;
      if (prev && (prev[0] !== c[0] || prev[1] !== c[1])) {
        const dx = c[0] - prev[0], dy = c[1] - prev[1];
        if (Math.abs(dx) + Math.abs(dy) > 1) cross++;
        else if (dx === 1 && walls.has(`${prev[0]},${prev[1]},R`)) cross++;
        else if (dx === -1 && walls.has(`${c[0]},${c[1]},R`)) cross++;
        else if (dy === 1 && walls.has(`${prev[0]},${prev[1]},D`)) cross++;
        else if (dy === -1 && walls.has(`${c[0]},${c[1]},D`)) cross++;
      }
      prev = c;
    }
    const ok = started && reached && cross === 0;
    return { ok, score: ok ? 100 : Math.max(0, 100 - cross * 20 - (reached ? 0 : 40)), text: ok ? "도착! 벽을 넘지 않았어요" : !reached ? "아직 도착하지 않았어요" : `벽을 ${cross}번 넘었어요` };
  }

  /* 기억한 칸 칠하기: 정답 수만큼 칠하면 자동으로 확인 */
  function cellsToggle(M, ans, done) {
    const on = new Map();
    let errors = 0;
    const pick = (h) => {
      if (on.has(h.id)) { on.get(h.id).remove(); on.delete(h.id); return; }
      on.set(h.id, el(M.inkL, "rect", { x: h.x + 0.4, y: h.y + 0.4, width: h.w - 0.8, height: h.h - 0.8, fill: S.theme === "kid" ? "#ff4d4d" : "#343a40" }));
      if (on.size === ans.length) {
        const wrong = [...on.keys()].filter((k) => !ans.includes(k));
        if (!wrong.length) { M.hits.filter((h2) => ans.includes(h2.id)).forEach((h2) => markRect(M, h2, "mk-ok")); return done({ ok: errors === 0, errors }); }
        errors++; sound("bad");
        wrong.forEach((k) => { flash(M, M.hits.find((h2) => h2.id === k)); on.get(k).remove(); on.delete(k); });
        if (errors >= 2) { M.hits.filter((h2) => ans.includes(h2.id)).forEach((h2) => markRect(M, h2, "mk-cue")); setTimeout(() => done({ ok: false, errors }), 1800); }
      }
    };
    onTap(M, pick);
    startScan(M, () => M.hits.filter((h) => !on.has(h.id)), pick);
  }

  // ================= 기록 =================
  function renderRecords(code) {
    const kids = DB.children.map((c) => c.code);
    code = code || S.child || kids[0] || "";
    $("#recChild").innerHTML = kids.map((k) => `<option ${k === code ? "selected" : ""}>${esc(k)}</option>`).join("");
    const mine = DB.sessions.filter((s) => s.child === code);
    const themes = [...new Set(mine.map((s) => s.theme))];
    let mat = "";
    for (const th of themes.length ? themes : [S.theme]) {
      mat += `<h3 style="margin:12px 0 6px">${th === "kid" ? "유아·초등 저학년용" : "초등 고학년·청소년용"}</h3><table class="rec"><tr><th>영역</th><th>1단계</th><th>2단계</th><th>3단계</th></tr>`;
      for (const a of VP.AREA_ORDER) {
        mat += `<tr><td style="text-align:left"><b style="color:${VP.AREAS[a].color}">${a}</b> ${VP.AREAS[a].name[th]}</td>`;
        for (const l of [1, 2, 3]) {
          const ss = mine.filter((s) => s.theme === th && s.area === a && s.level === l);
          if (!ss.length) { mat += "<td>·</td>"; continue; }
          const last = ss.slice(-3), pct = Math.round((100 * last.reduce((x, s) => x + s.correct / s.n, 0)) / last.length);
          const two = ss.slice(-2);
          const up = l < 3 && two.length === 2 && two.every((s) => s.correct / s.n >= 0.9);
          mat += `<td><div class="bar"><i style="width:${pct}%;background:${VP.AREAS[a].color}"></i></div>${pct}% <small>(${ss.length}회)</small>${up ? ' <span class="up">▲다음 단계</span>' : ""}</td>`;
        }
        mat += "</tr>";
      }
      mat += "</table>";
    }
    $("#recMatrix").innerHTML = mine.length ? mat : "<p class='hint'>아직 기록이 없어요.</p>";
    $("#recList").innerHTML = mine.length
      ? `<table class="rec"><tr><th>날짜</th><th>쪽</th><th>정답</th><th>고친 횟수</th><th>시간</th><th>보조</th></tr>` +
        mine.slice().reverse().map((s) => {
          const d = new Date(s.date);
          const o = [s.opts.big && "큰터치", s.opts.scan && "스위치", s.opts.cvi && "CVI"].filter(Boolean).join("·");
          return `<tr><td>${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}</td><td>${s.theme === "kid" ? "유아" : "청소년"} ${s.area}-${s.level}-${String(s.page).padStart(2, "0")}</td><td>${s.correct}/${s.n}</td><td>${s.errors}</td><td>${fmtTime(s.ms)}</td><td>${o}</td></tr>`;
        }).join("") + "</table>"
      : "";
  }

  // ================= 시작 =================
  bindHome();
  renderHome();
  // 오프라인 저장은 배포 주소에서만 (개발 중 localhost 에서는 옛 파일이 남지 않게 끔)
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  else if ("serviceWorker" in navigator) navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  window.__VPAPP = { S, DB: () => DB, startPage, MODES, cur: () => cur, P: () => P }; // 점검용
})();
