/* 시지각 워크북 — 8개 영역 문항 생성기
 * VP.makePage(area, level, theme, pageNo) → { instr, items:[item...] }
 * item = { svg(인쇄·앱 공용), mode, answer, ... }
 *   mode: all(모두 고르기) · one(하나 고르기) · track(선 따라가기) · memory(보고 기억)
 *         cells(칸 칠하기) · copy(격자 모사) · path(길 따라 긋기) · maze(미로)
 */
(function (VP) {
  const { svg, icon, hit, box, text, shape, f1 } = VP;
  const W = 180; // 항목 폭(mm)

  // ---------- 공통 도우미 ----------
  function pool(ctx, n, opt) {
    opt = opt || {};
    let arr = ctx.icons.filter((i) => !(opt.not || []).includes(i.hex));
    if (opt.dir) arr = arr.filter((i) => i.dir);
    if (opt.cat) arr = arr.filter((i) => i.cat === opt.cat);
    return ctx.r.sample(arr, n);
  }
  /* 같은 분류(비슷한 것) 우선으로 방해 그림 고르기 */
  function similar(ctx, target, n, extraNot) {
    const not = [target.hex].concat(extraNot || []);
    const same = ctx.r.shuffle(ctx.icons.filter((i) => i.cat === target.cat && !not.includes(i.hex)));
    const other = ctx.r.shuffle(ctx.icons.filter((i) => i.cat !== target.cat && !not.includes(i.hex)));
    return same.concat(other).slice(0, n);
  }
  /* 한 줄: 왼쪽 보기 상자 + 오른쪽 선택지 n개 */
  function rowLayout(n, sampleW, h) {
    const x0 = sampleW + 8, cw = (W - x0) / n;
    return { x0, cw, cx: (i) => x0 + cw * i + cw / 2, cy: h / 2 };
  }
  const sampleBox = (ctx, w, h) => box(1, 2, w - 2, h - 4, { fill: ctx.tint, stroke: ctx.accent, sw: 0.6, rx: 3 });
  const divider = (x, h) => `<line x1="${f1(x)}" y1="4" x2="${f1(x)}" y2="${f1(h - 4)}" stroke="#ccc" stroke-width="0.4"/>`;
  const rows = (items) => items;

  // ================= A. 시각 주의·탐색 =================
  function A_cancel(ctx) {
    const { r, level } = ctx;
    const nKinds = level === 3 ? 2 : 1;
    const targets = pool(ctx, nKinds);
    const cfg = [null, { rows: 3, cols: 4, s: 30, nt: 4, nd: 2 }, { rows: 5, cols: 6, s: 20, nt: 7, nd: 4 }, { n: 56, s: 14.5, nt: 5, nd: 7 }][level];
    // 방해 그림: 목표와 같은 분류를 섞는다(레벨이 오를수록 많이)
    const dist = similar(ctx, targets[0], cfg.nd, targets.map((t) => t.hex));
    const band = 34;
    let s = box(0, 0, W, band - 4, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 });
    s += text(24, (band - 4) / 2, "찾을 그림", 5.5, { fill: ctx.accent });
    targets.forEach((t, i) => (s += icon(t.hex, 62 + i * 34, (band - 4) / 2, 24)));
    const cells = [];
    let total, positions;
    if (level < 3) {
      total = cfg.rows * cfg.cols;
      const cw = W / cfg.cols, ch = (level === 1 ? 44 : 31);
      positions = [];
      for (let y = 0; y < cfg.rows; y++) for (let x = 0; x < cfg.cols; x++) positions.push([cw * x + cw / 2, band + 4 + ch * y + ch / 2]);
    } else {
      total = cfg.n;
      positions = VP.scatter(r, total, W, 190, 21, 9).map((p) => [p[0], p[1] + band + 2]);
      total = positions.length;
    }
    const nt = cfg.nt * nKinds;
    const kinds = [];
    for (let i = 0; i < nt; i++) kinds.push({ ic: targets[i % nKinds], t: true });
    while (kinds.length < total) kinds.push({ ic: dist[kinds.length % dist.length], t: false });
    const order = r.shuffle(kinds);
    const answer = [];
    order.forEach((k, i) => {
      const [x, y] = positions[i];
      const rot = level === 3 ? r.pick([0, 0, -15, 15]) : 0;
      s += hit(i, x - cfg.s / 2 - 2, y - cfg.s / 2 - 2, cfg.s + 4, cfg.s + 4, icon(k.ic.hex, x, y, cfg.s, { rot }), 3);
      if (k.t) answer.push(i);
    });
    const h = level === 1 ? band + 4 + 44 * 3 : level === 2 ? band + 4 + 31 * 5 : band + 196;
    return {
      instr: ctx.kid ? "위의 그림과 똑같은 그림을 모두 찾아 ○ 하세요." : `위의 그림 ${nKinds === 2 ? "두 가지를" : "을"} 모두 찾아 ○ 표시하세요. 왼쪽 위부터 차례로 훑어보세요.`,
      items: [{ svg: svg(W, h, s), mode: "all", answer }],
    };
  }

  function A_track(ctx) {
    const { r, level } = ctx;
    const n = [0, 2, 3, 5][level];
    const perItem = level === 3 ? 1 : 2;
    const h = level === 3 ? 212 : 104;
    const items = [];
    for (let it = 0; it < perItem; it++) {
      const lefts = pool(ctx, n);
      const rights = pool(ctx, n, { not: lefts.map((i) => i.hex) });
      let perm;
      do perm = r.shuffle([...Array(n).keys()]); while (perm.some((p, i) => p === i) && n > 1 && r.f() < 0.9);
      const ys = (k) => (h / (n + 1)) * (k + 1);
      const sw = [0, 2.2, 1.5, 1.1][level];
      const nk = [0, 2, 3, 4][level];
      let s = "";
      for (let i = 0; i < n; i++) {
        const pts = [[27, ys(i)]];
        for (let k = 1; k <= nk; k++) pts.push([27 + ((153 - 27) * k) / (nk + 1) + r.range(-6, 6), r.range(10, h - 10)]);
        pts.push([153, ys(perm[i])]);
        s += `<path d="${VP.smoothPath(pts)}" fill="none" stroke="${ctx.kid ? "#5c5f66" : "#343a40"}" stroke-width="${sw}" stroke-linecap="round"/>`;
      }
      const is = level === 3 ? 18 : 24;
      for (let i = 0; i < n; i++) {
        s += `<circle cx="4.5" cy="${f1(ys(i))}" r="4" fill="${ctx.accent}"/>` + text(4.5, ys(i), i + 1, 4.8, { fill: "#fff" });
        s += icon(lefts[i].hex, 17, ys(i), is);
        s += hit("e" + i, 153, ys(i) - is / 2 - 1, W - 153, is + 2, icon(rights[i].hex, 164, ys(i), is) + box(174, ys(i) - 3.5, 6, 7, { stroke: "#888", rx: 1 }), 2);
      }
      items.push({ svg: svg(W, h, s), mode: "track", answer: perm });
    }
    return {
      instr: ctx.kid ? "왼쪽 그림에서 출발해 선을 따라가 보세요. 도착한 그림 옆 □에 번호를 써요." : "번호에서 출발해 선을 눈으로 따라가세요. 도착한 그림 옆 □에 번호를 쓰세요.",
      items,
    };
  }

  // ================= B. 시각 변별 =================
  function patFor(ctx, n, m, diag) {
    return VP.pattern.random(ctx.r, n, m, diag);
  }
  function distinctMutants(ctx, base, n, cnt, diag) {
    const out = [];
    let g = 0;
    while (out.length < cnt && g++ < 300) {
      const m = VP.pattern.mutate(ctx.r, base, n, diag);
      if (!VP.pattern.same(m, base) && !out.some((o) => VP.pattern.same(o, m))) out.push(m);
    }
    return out;
  }
  const patOpt = (ctx) => ({ color: ctx.patColor });

  function B_match(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    if (level === 1) {
      for (let k = 0; k < 5; k++) {
        const t = pool(ctx, 1)[0];
        const choices = r.shuffle([t].concat(similar(ctx, t, 2)));
        const L = rowLayout(3, 42, 44);
        let s = sampleBox(ctx, 42, 44) + icon(t.hex, 21, 22, 30) + divider(L.x0 - 4, 44);
        choices.forEach((c, i) => (s += hit(i, L.cx(i) - 18, 4, 36, 36, icon(c.hex, L.cx(i), 22, 30))));
        items.push({ svg: svg(W, 44, s), mode: "one", answer: [choices.indexOf(t)] });
      }
    } else if (level === 2 && kid) {
      // 두 그림 묶음: 순서까지 같은 것
      for (let k = 0; k < 6; k++) {
        const [a, b] = pool(ctx, 2);
        const [c1, c2] = similar(ctx, a, 2, [b.hex]);
        const opts = r.shuffle([[a, b], [b, a], [a, c1], [c2, b]]);
        const strip = (pair, x, y) => icon(pair[0].hex, x - 7.3, y, 13.5) + icon(pair[1].hex, x + 7.3, y, 13.5);
        const L = rowLayout(4, 38, 32);
        const bw = L.cw - 3;
        let s = sampleBox(ctx, 38, 32) + strip([a, b], 19, 16) + divider(L.x0 - 4, 32);
        opts.forEach((p, i) => (s += hit(i, L.cx(i) - bw / 2, 3, bw, 26, box(L.cx(i) - bw / 2, 3, bw, 26, { stroke: "#bbb", rx: 2 }) + strip(p, L.cx(i), 16))));
        items.push({ svg: svg(W, 32, s), mode: "one", answer: [opts.findIndex((p) => p[0] === a && p[1] === b)] });
      }
    } else {
      const n = level === 2 ? 3 : 4, m = level === 2 ? r.int(3, 4) : r.int(6, 7), nc = level === 2 ? 4 : 5, cs = level === 2 ? 30 : 28;
      const h = cs + 6;
      for (let k = 0; k < 6; k++) {
        const base = patFor(ctx, n, m, level === 3);
        const opts = r.shuffle([base].concat(distinctMutants(ctx, base, n, nc - 1, level === 3)));
        const L = rowLayout(nc, cs + 8, h);
        let s = sampleBox(ctx, cs + 8, h) + VP.pattern.draw(base, n, 4, 3, cs, patOpt(ctx)) + divider(L.x0 - 4, h);
        opts.forEach((p, i) => (s += hit(i, L.cx(i) - cs / 2, 3, cs, cs, VP.pattern.draw(p, n, L.cx(i) - cs / 2, 3, cs, patOpt(ctx)))));
        items.push({ svg: svg(W, h, s), mode: "one", answer: [opts.findIndex((p) => VP.pattern.same(p, base))] });
      }
    }
    return { instr: ctx.kid ? "왼쪽 그림과 똑같은 것을 찾아 ○ 하세요." : "왼쪽 보기와 완전히 같은 것을 하나 찾아 ○ 표시하세요.", items };
  }

  function B_odd(ctx) {
    const { r, level } = ctx;
    const items = [];
    if (level === 1) {
      for (let k = 0; k < 5; k++) {
        const t = pool(ctx, 1)[0], d = similar(ctx, t, 1)[0];
        const pos = r.int(0, 4);
        let s = "";
        for (let i = 0; i < 5; i++) s += hit(i, 36 * i + 2, 3, 32, 36, icon((i === pos ? d : t).hex, 36 * i + 18, 21, 28));
        items.push({ svg: svg(W, 42, s), mode: "one", answer: [pos] });
      }
    } else {
      const n = level === 2 ? 3 : 4, cnt = level === 2 ? 6 : 7, m = level === 2 ? r.int(3, 4) : r.int(6, 7), cs = level === 2 ? 26 : 22;
      for (let k = 0; k < 6; k++) {
        const base = patFor(ctx, n, m, level === 3);
        const odd = distinctMutants(ctx, base, n, 1, level === 3)[0];
        const pos = r.int(0, cnt - 1), cw = W / cnt;
        let s = "";
        for (let i = 0; i < cnt; i++) s += hit(i, cw * i + (cw - cs) / 2, 2, cs, cs, VP.pattern.draw(i === pos ? odd : base, n, cw * i + (cw - cs) / 2, 2, cs, patOpt(ctx)));
        items.push({ svg: svg(W, cs + 4, s), mode: "one", answer: [pos] });
      }
    }
    return { instr: ctx.kid ? "한 줄에서 모양이 다른 하나를 찾아 ○ 하세요." : "한 줄에서 나머지와 다른 하나를 찾아 ○ 표시하세요.", items };
  }

  // ================= C. 전경-배경 =================
  function overlapCluster(ctx, n, cx, cy, S) {
    const { r } = ctx;
    const a0 = r.range(0, Math.PI * 2);
    const rad = n === 2 ? S * 0.26 : S * 0.32;
    return [...Array(n).keys()].map((i) => {
      const a = a0 + (i * 2 * Math.PI) / n + r.range(-0.25, 0.25);
      return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad];
    });
  }
  function C_overlap(ctx) {
    const { r, level } = ctx;
    const cfg = [null, { n: 2, S: 44, nc: 4, cols: 2, h: 90, per: 2 }, { n: 3, S: 42, nc: 6, cols: 3, h: 90, per: 2 }, { n: 5, S: 40, nc: 9, cols: 3, h: 100, per: 2 }][level];
    const items = [];
    for (let k = 0; k < cfg.per; k++) {
      const inside = pool(ctx, cfg.n);
      const others = pool(ctx, cfg.nc - cfg.n, { not: inside.map((i) => i.hex) });
      const pts = overlapCluster(ctx, cfg.n, 42, cfg.h / 2, cfg.S);
      let s = box(0, 1, 84, cfg.h - 2, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 });
      inside.forEach((ic, i) => (s += icon(ic.hex, pts[i][0], pts[i][1], cfg.S, { line: true, rot: level === 3 ? r.int(-20, 20) : 0 })));
      s += divider(88, cfg.h);
      const choices = r.shuffle(inside.concat(others));
      const rowsN = Math.ceil(cfg.nc / cfg.cols), cw = (W - 92) / cfg.cols, ch = cfg.h / rowsN, is = Math.min(cw, ch) * 0.72;
      const answer = [];
      choices.forEach((c, i) => {
        const x = 92 + cw * (i % cfg.cols) + cw / 2, y = ch * Math.floor(i / cfg.cols) + ch / 2;
        s += hit(i, x - cw / 2 + 1, y - ch / 2 + 1, cw - 2, ch - 2, icon(c.hex, x, y, is, { line: true }));
        if (inside.includes(c)) answer.push(i);
      });
      items.push({ svg: svg(W, cfg.h, s), mode: "all", answer });
    }
    return { instr: ctx.kid ? "왼쪽에 겹쳐 있는 그림을 오른쪽에서 모두 찾아 ○ 하세요." : "왼쪽에 겹쳐 그려진 그림을 오른쪽에서 모두 찾아 ○ 표시하세요.", items };
  }
  function C_shapes(ctx) {
    const { r, level } = ctx;
    const basic = ["circle", "square", "triangle", "star", "heart", "diamond", "hexagon", "cross", "semicircle", "pentagon"];
    const n = level === 1 ? 3 : 4, nc = level === 1 ? 4 : 6;
    const items = [];
    for (let k = 0; k < 2; k++) {
      const types = r.sample(basic, nc);
      const inside = types.slice(0, n);
      const pts = overlapCluster(ctx, n, 42, 45, 46);
      let s = box(0, 1, 84, 88, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 });
      inside.forEach((t, i) => (s += shape(t, pts[i][0], pts[i][1], 22, { sw: 0.9 })));
      s += divider(88, 90);
      const choices = r.shuffle(types), cols = level === 1 ? 2 : 3, cw = (W - 92) / cols, ch = 90 / Math.ceil(nc / cols);
      const answer = [];
      choices.forEach((t, i) => {
        const x = 92 + cw * (i % cols) + cw / 2, y = ch * Math.floor(i / cols) + ch / 2;
        s += hit(i, x - cw / 2 + 1, y - ch / 2 + 1, cw - 2, ch - 2, shape(t, x, y, Math.min(cw, ch) * 0.34, { sw: 0.9 }));
        if (inside.includes(t)) answer.push(i);
      });
      items.push({ svg: svg(W, 90, s), mode: "all", answer });
    }
    return { instr: ctx.kid ? "겹쳐진 모양 속에 숨은 모양을 오른쪽에서 모두 찾아 ○ 하세요." : "겹쳐진 도형 속에 들어 있는 도형을 오른쪽에서 모두 찾아 ○ 표시하세요.", items };
  }
  function C_hidden(ctx) {
    const { r } = ctx;
    const targets = pool(ctx, 3);
    const bg = pool(ctx, 18, { not: targets.map((t) => t.hex) });
    const band = 32;
    let s = box(0, 0, W, band - 4, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 }) + text(24, 14, "찾을 그림", 5.5, { fill: ctx.accent });
    targets.forEach((t, i) => (s += icon(t.hex, 62 + i * 30, 14, 22, { line: true })));
    const pts = VP.scatter(r, 64, W, 186, 14, 10);
    const tIdx = r.sample([...pts.keys()], 3);
    const answer = [];
    pts.forEach((p, i) => {
      const ti = tIdx.indexOf(i);
      const ic = ti >= 0 ? targets[ti] : r.pick(bg);
      s += hit(i, p[0] - 9, p[1] + band - 9, 18, 18, icon(ic.hex, p[0], p[1] + band, 24, { line: true, rot: r.int(-40, 40) }));
      if (ti >= 0) answer.push(i);
    });
    return { instr: ctx.kid ? "복잡한 그림 속에 숨은 세 그림을 찾아 ○ 하세요." : "복잡한 배경 속에 숨은 세 그림을 찾아 ○ 표시하세요.", items: [{ svg: svg(W, band + 190, s), mode: "all", answer }] };
  }

  // ================= D. 형태 항상성 =================
  const SIMILAR_SETS = [
    ["square", "rect", "parallelogram", "trapezoid", "diamond"],
    ["triangle", "rtri", "tallTri", "flag"],
    ["pentagon", "hexagon", "circle", "ellipse"],
    ["lshape", "tshape", "cross", "arrow"],
  ];
  function D_shapes(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    const nc = level === 1 ? 6 : level === 2 ? 7 : 7;
    for (let k = 0; k < 5; k++) {
      let target, others;
      if (level === 1) {
        const basic = ["circle", "square", "triangle", "star", "heart", "cross"];
        target = r.pick(basic);
        others = basic.filter((b) => b !== target);
      } else {
        const set = r.pick(SIMILAR_SETS);
        target = r.pick(set);
        others = set.filter((b) => b !== target);
      }
      const nt = r.int(2, 3);
      const list = r.shuffle([...Array(nt).fill(target), ...[...Array(nc - nt)].map(() => r.pick(others))]);
      const L = rowLayout(nc, 36, 40);
      const fills = VP.PALETTE[ctx.theme].fills;
      const style = (i) => {
        if (level === 1) return { fill: kid ? r.pick(fills) : "#495057", stroke: "none", sw: 0 };
        if (level === 2) return { fill: "none", stroke: "#222", sw: 0.8 };
        return r.chance(0.5) ? { fill: r.pick(fills), stroke: "none", sw: 0 } : { fill: "none", stroke: "#222", sw: 0.8 };
      };
      let s = sampleBox(ctx, 36, 40) + shape(target, 18, 20, 12, level === 1 ? { fill: kid ? fills[0] : "#495057", stroke: "none", sw: 0 } : { sw: 0.9 }) + divider(L.x0 - 4, 40);
      const answer = [];
      list.forEach((t, i) => {
        const maxR = Math.min(13, L.cw * 0.43);
        const sc = r.range(maxR * 0.45, maxR);
        const rot = level === 1 ? 0 : r.int(0, 359);
        s += hit(i, L.cx(i) - L.cw / 2 + 1, 3, L.cw - 2, 34, shape(t, L.cx(i), 20, sc, Object.assign({ rot }, style(i))));
        if (t === target) answer.push(i);
      });
      items.push({ svg: svg(W, 40, s), mode: "all", answer });
    }
    return { instr: ctx.kid ? (level === 1 ? "크기와 색이 달라도 왼쪽과 같은 모양을 모두 찾아 ○ 하세요." : "기울어져 있어도 왼쪽과 같은 모양을 모두 찾아 ○ 하세요.") : "크기·방향·색이 달라도 왼쪽과 같은 모양을 모두 찾아 ○ 표시하세요.", items };
  }
  function D_icons(ctx) {
    const { r, level } = ctx;
    const items = [];
    for (let k = 0; k < 5; k++) {
      const t = pool(ctx, 1)[0];
      const ds = similar(ctx, t, 3);
      const nc = 6, nt = r.int(2, 3);
      const list = r.shuffle([...Array(nt).fill(t), ...[...Array(nc - nt)].map((_, i) => ds[i % ds.length])]);
      const L = rowLayout(nc, 36, 40);
      let s = sampleBox(ctx, 36, 40) + icon(t.hex, 18, 20, 26) + divider(L.x0 - 4, 40);
      const answer = [];
      list.forEach((ic, i) => {
        // 돌린 그림이 옆 칸을 넘지 않게 칸 폭에 맞춰 크기 상한을 둔다
        const maxS = Math.min(26, L.cw * (level === 1 ? 0.9 : 0.74));
        const sz = r.range(maxS * 0.5, maxS);
        const line = level >= 2 ? r.chance(0.5) : r.chance(0.3);
        const rot = level === 1 ? 0 : r.int(-160, 160);
        s += hit(i, L.cx(i) - L.cw / 2 + 1, 3, L.cw - 2, 34, icon(ic.hex, L.cx(i), 20, sz, { line, rot }));
        if (ic === t) answer.push(i);
      });
      items.push({ svg: svg(W, 40, s), mode: "all", answer });
    }
    return { instr: ctx.kid ? "크기나 색이 달라도 왼쪽과 같은 그림을 모두 찾아 ○ 하세요." : "크기·색·기울기가 달라도 왼쪽과 같은 물건을 모두 찾아 ○ 표시하세요.", items };
  }
  function D_patterns(ctx) {
    const { r } = ctx;
    const items = [];
    for (let k = 0; k < 6; k++) {
      let base;
      do base = patFor(ctx, 4, r.int(5, 6), true); while (!VP.pattern.asym(base, 4));
      const muts = distinctMutants(ctx, base, 4, 3, true);
      const nc = 6, nt = r.int(2, 3);
      const list = r.shuffle([...Array(nt).fill(base), ...[...Array(nc - nt)].map((_, i) => muts[i % muts.length])]);
      const L = rowLayout(nc, 34, 34);
      let s = sampleBox(ctx, 34, 34) + VP.pattern.draw(base, 4, 4, 4, 26, Object.assign({ frame: false, dots: false }, patOpt(ctx))) + divider(L.x0 - 4, 34);
      const answer = [];
      list.forEach((p, i) => {
        const sz = r.range(L.cw * 0.6, L.cw * 0.9);
        s += hit(i, L.cx(i) - L.cw / 2 + 1, 2, L.cw - 2, 30, VP.pattern.draw(p, 4, L.cx(i) - sz / 2, 17 - sz / 2, sz, Object.assign({ frame: false, dots: false, rot: r.int(0, 359), sw: 1 }, patOpt(ctx))));
        if (p === base) answer.push(i);
      });
      items.push({ svg: svg(W, 34, s), mode: "all", answer });
    }
    return { instr: ctx.kid ? "돌아가 있거나 크기가 달라도 왼쪽과 같은 모양을 모두 찾아 ○ 하세요." : "회전·크기가 달라도 왼쪽과 같은 모양을 모두 찾아 ○ 표시하세요.", items };
  }

  // ================= E. 공간 관계 =================
  function E_oddFlip(ctx) {
    const { r } = ctx;
    const items = [];
    for (let k = 0; k < 5; k++) {
      const t = pool(ctx, 1, { dir: true })[0];
      const pos = r.int(0, 4);
      let s = "";
      for (let i = 0; i < 5; i++) s += hit(i, 36 * i + 2, 3, 32, 36, icon(t.hex, 36 * i + 18, 21, 28, { flip: i === pos }));
      items.push({ svg: svg(W, 42, s), mode: "one", answer: [pos] });
    }
    return { instr: ctx.kid ? "혼자 다른 쪽을 보고 있는 그림을 찾아 ○ 하세요." : "한 줄에서 방향이 다른 하나를 찾아 ○ 표시하세요.", items };
  }
  function E_sameDir(ctx) {
    const { r, level } = ctx;
    const items = [];
    for (let k = 0; k < 5; k++) {
      const t = pool(ctx, 1, { dir: true })[0];
      const nc = 6;
      // 보기와 같은 방향(정답)과 다른 방향: 1단계는 좌우반전만, 2단계는 회전도 섞음
      const variants = level === 1 ? [{ flip: true }] : [{ flip: true }, { rot: 90 }, { rot: 180 }, { rot: -90 }, { flip: true, rot: 90 }, { flip: true, rot: 180 }];
      const nt = level === 1 ? r.int(2, 3) : r.int(1, 2);
      const list = r.shuffle([...Array(nt).fill({}), ...[...Array(nc - nt)].map(() => r.pick(variants))]);
      const L = rowLayout(nc, 36, 40);
      let s = sampleBox(ctx, 36, 40) + icon(t.hex, 18, 20, 26) + divider(L.x0 - 4, 40);
      const answer = [];
      list.forEach((v, i) => {
        s += hit(i, L.cx(i) - L.cw / 2 + 1, 3, L.cw - 2, 34, icon(t.hex, L.cx(i), 20, 22, v));
        if (!v.flip && !v.rot) answer.push(i);
      });
      items.push({ svg: svg(W, 40, s), mode: "all", answer });
    }
    return { instr: ctx.kid ? "왼쪽 그림과 똑같은 방향인 것을 모두 찾아 ○ 하세요." : "왼쪽 보기와 방향까지 똑같은 것을 모두 찾아 ○ 표시하세요.", items };
  }
  function E_glyphs(ctx) {
    const { r, kid } = ctx;
    const sets = kid ? null : [["b", "d", "p", "q"], ["6", "9"], ["ㅏ", "ㅓ", "ㅗ", "ㅜ"], ["ㄱ", "ㄴ"], ["2", "5"], ["M", "W"]];
    const rowsN = 7, cols = 9, cw = W / cols, ch = 26;
    let s = "", answer = [];
    let target, drawG;
    if (kid) {
      const dirs = [0, 90, 180, 270];
      target = r.pick(dirs);
      drawG = (g, x, y) => shape("arrow", x, y, 8.5, { rot: g, fill: ctx.accent, stroke: "none", sw: 0 });
      var pickG = () => r.pick(dirs);
    } else {
      const set = r.pick(sets);
      target = r.pick(set);
      drawG = (g, x, y) => text(x, y, g, 13, { fill: "#222", weight: 400, font: "Arial, 'Malgun Gothic', sans-serif" });
      var pickG = () => r.pick(set);
    }
    const band = 30;
    s += box(0, 0, W, band - 4, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 }) + text(24, 13, "찾을 모양", 5.5, { fill: ctx.accent }) + drawG(target, 60, 13);
    const n = rowsN * cols, nt = 12;
    const list = r.shuffle([...Array(nt).fill(target), ...[...Array(n - nt)].map(() => { let g; do g = pickG(); while (g === target); return g; })]);
    list.forEach((g, i) => {
      const x = cw * (i % cols) + cw / 2, y = band + ch * Math.floor(i / cols) + ch / 2;
      s += hit(i, x - cw / 2 + 1, y - ch / 2 + 1, cw - 2, ch - 2, drawG(g, x, y));
      if (g === target) answer.push(i);
    });
    return { instr: kid ? "위의 화살표와 같은 방향인 화살표를 모두 찾아 ○ 하세요." : "위의 글자와 같은 것을 모두 찾아 ○ 표시하세요. 뒤집힌 글자에 주의하세요.", items: [{ svg: svg(W, band + ch * rowsN, s), mode: "all", answer }] };
  }
  function E_rotate(ctx) {
    const { r } = ctx;
    const items = [];
    for (let k = 0; k < 6; k++) {
      let base;
      do base = patFor(ctx, 4, r.int(5, 6), true); while (!VP.pattern.chiral(base, 4) || !VP.pattern.asym(base, 4));
      const nc = 6, nt = r.int(2, 3);
      const list = r.shuffle([...Array(nc)].map((_, i) => ({ same: i < nt, k: r.int(i < nt ? 1 : 0, 3) })));
      const L = rowLayout(nc, 34, 34);
      let s = sampleBox(ctx, 34, 34) + VP.pattern.draw(base, 4, 4, 4, 26, patOpt(ctx)) + divider(L.x0 - 4, 34);
      const answer = [];
      list.forEach((v, i) => {
        const p = VP.pattern.transform(base, 4, v.k, !v.same);
        s += hit(i, L.cx(i) - 12.5, 4, 25, 25, VP.pattern.draw(p, 4, L.cx(i) - 12.5, 4, 25, patOpt(ctx)));
        if (v.same) answer.push(i);
      });
      items.push({ svg: svg(W, 34, s), mode: "all", answer });
    }
    return { instr: ctx.kid ? "돌리면 왼쪽과 똑같아지는 것을 모두 찾아 ○ 하세요. (뒤집힌 것은 달라요)" : "회전하면 보기와 같아지는 것을 모두 찾으세요. 뒤집힌(거울) 모양은 다른 것입니다.", items };
  }
  function E_rotIcon(ctx) {
    const { r } = ctx;
    const items = [];
    for (let k = 0; k < 5; k++) {
      const t = pool(ctx, 1, { dir: true })[0];
      const nc = 6, nt = r.int(2, 3);
      const list = r.shuffle([...Array(nc)].map((_, i) => ({ flip: i >= nt, rot: r.int(20, 340) })));
      const L = rowLayout(nc, 36, 40);
      let s = sampleBox(ctx, 36, 40) + icon(t.hex, 18, 20, 26) + divider(L.x0 - 4, 40);
      const answer = [];
      list.forEach((v, i) => {
        s += hit(i, L.cx(i) - L.cw / 2 + 1, 3, L.cw - 2, 34, icon(t.hex, L.cx(i), 20, 22, v));
        if (!v.flip) answer.push(i);
      });
      items.push({ svg: svg(W, 40, s), mode: "all", answer });
    }
    return { instr: ctx.kid ? "뒤집히지 않고 돌아가기만 한 그림을 모두 찾아 ○ 하세요." : "뒤집히지 않고 회전만 한 것을 모두 찾아 ○ 표시하세요.", items };
  }

  // ================= F. 시각 통합(완성) =================
  function maskIcon(ctx, hex, cx, cy, S, kind, line) {
    const { r } = ctx;
    const id = VP.uid("m");
    let m = "";
    const x0 = cx - S / 2, y0 = cy - S / 2;
    if (kind === "side") {
      // 한쪽을 회색 가림막으로 덮기
      const side = r.int(0, 3), p = r.range(0.35, 0.45);
      const rc = [[x0, y0, S * p, S], [x0 + S * (1 - p), y0, S * p, S], [x0, y0, S, S * p], [x0, y0 + S * (1 - p), S, S * p]][side];
      return icon(hex, cx, cy, S, { line }) + `<rect x="${f1(rc[0] - 1)}" y="${f1(rc[1] - 1)}" width="${f1(rc[2] + 2)}" height="${f1(rc[3] + 2)}" rx="3" fill="#ced4da"/>`;
    }
    if (kind === "blocks" || kind === "blocksHard") {
      const n = kind === "blocks" ? 5 : 7, show = kind === "blocks" ? 0.55 : 0.42, cs = S / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (r.f() < show) m += `<rect x="${f1(x0 + i * cs)}" y="${f1(y0 + j * cs)}" width="${f1(cs + 0.05)}" height="${f1(cs + 0.05)}" fill="#fff"/>`;
    }
    if (kind === "stripes") {
      // 블라인드처럼 띠 모양으로 가림: 보이는 띠 60%, 가리는 띠 40%
      const n = 6, sh = S / n, ang = r.pick([0, 90]);
      let st = "";
      for (let i = -n; i < n * 2; i++) st += `<rect x="${f1(x0 - S)}" y="${f1(y0 + i * sh)}" width="${f1(S * 3)}" height="${f1(sh * 0.6)}" fill="#fff"/>`;
      m = `<g transform="rotate(${ang} ${f1(cx)} ${f1(cy)})">${st}</g>`;
    }
    return `<defs><mask id="${id}" maskUnits="userSpaceOnUse" x="${f1(x0 - 2)}" y="${f1(y0 - 2)}" width="${f1(S + 4)}" height="${f1(S + 4)}">${m}</mask></defs><g mask="url(#${id})">${icon(hex, cx, cy, S, { line })}</g>`;
  }
  function F_mask(ctx, kind) {
    const { r, level } = ctx;
    const items = [];
    const nc = level === 3 ? 5 : 4, line = kind !== "side";
    for (let k = 0; k < 4; k++) {
      const t = pool(ctx, 1)[0];
      const choices = r.shuffle([t].concat(similar(ctx, t, nc - 1)));
      const L = rowLayout(nc, 50, 50);
      let s = box(1, 1, 48, 48, { fill: "#fff", stroke: ctx.accent, sw: 0.6 }) + maskIcon(ctx, t.hex, 25, 25, 40, kind, line) + divider(L.x0 - 4, 50);
      choices.forEach((c, i) => (s += hit(i, L.cx(i) - 15, 10, 30, 30, icon(c.hex, L.cx(i), 25, 26, { line: line && level === 3 }))));
      items.push({ svg: svg(W, 50, s), mode: "one", answer: [choices.indexOf(t)] });
    }
    return { instr: ctx.kid ? "왼쪽에 조금만 보이는 그림은 무엇일까요? 오른쪽에서 찾아 ○ 하세요." : "일부만 보이는 왼쪽 그림이 무엇인지 오른쪽에서 찾아 ○ 표시하세요.", items };
  }
  function F_gapShape(ctx) {
    const { r, level } = ctx;
    const items = [];
    const basic = level === 1 ? ["circle", "square", "triangle", "star", "heart", "cross", "diamond", "semicircle"] : [].concat(...SIMILAR_SETS, ["star", "heart"]);
    for (let k = 0; k < 5; k++) {
      const set = level === 1 ? basic : r.pick(SIMILAR_SETS).concat(r.sample(["star", "heart", "circle"], 1));
      const opts = r.sample(Array.from(new Set(set)), 4);
      const t = opts[0];
      const choices = r.shuffle(opts);
      const L = rowLayout(4, 44, 44);
      const rot = level === 1 ? 0 : r.int(0, 359);
      const dash = level === 1 ? `${r.int(55, 65)} ${100 - 60}` : "9 11";
      let s = box(1, 1, 42, 42, { fill: "#fff", stroke: ctx.accent, sw: 0.6 }) + `<path d="${VP.shapeD(t, 22, 22, 15, rot)}" pathLength="100" stroke-dasharray="${dash}" stroke-dashoffset="${r.int(0, 99)}" fill="none" stroke="#222" stroke-width="1.1" stroke-linecap="round"/>` + divider(L.x0 - 4, 44);
      const fill = ctx.kid ? VP.PALETTE.kid.fills[3] : "#adb5bd";
      choices.forEach((c, i) => (s += hit(i, L.cx(i) - 17, 5, 34, 34, shape(c, L.cx(i), 22, 13, { rot, fill, stroke: "#222", sw: 0.5 }))));
      items.push({ svg: svg(W, 44, s), mode: "one", answer: [choices.indexOf(t)] });
    }
    return { instr: ctx.kid ? "선이 끊어진 모양은 무엇일까요? 같은 모양을 찾아 ○ 하세요." : "끊어진 선을 이어 보면 어떤 도형인지 찾아 ○ 표시하세요.", items };
  }

  // ================= G. 시각 기억 =================
  /* 인쇄: 왼쪽(기억할 것) | 가리개 선 | 오른쪽(찾기). 앱: show → ask */
  function memRow(ctx, showW, h, showInner, askInner, extra) {
    const cut = showW + 5;
    const guide = `<line x1="${f1(cut)}" y1="0" x2="${f1(cut)}" y2="${f1(h)}" stroke="#adb5bd" stroke-width="0.5" stroke-dasharray="2 1.5"/>`;
    const paper = svg(W, h, box(1, 1, showW - 2, h - 2, { fill: ctx.tint, stroke: ctx.accent, sw: 0.6 }) + showInner + guide + `<g transform="translate(${f1(cut + 4)} 0)">${askInner}</g>`);
    return Object.assign({ svg: paper, mode: "memory", show: svg(showW, h, box(1, 1, showW - 2, h - 2, { fill: ctx.tint, stroke: ctx.accent, sw: 0.6 }) + showInner), ask: svg(W - cut - 4, h, askInner) }, extra);
  }
  function G_icons(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    const nShow = level === 1 ? 1 : kid ? 2 : 3;
    const nc = level === 1 ? (kid ? 3 : 4) : 6;
    const h = level === 1 ? 46 : 42;
    const showW = level === 1 ? 44 : nShow * 21 + 8;
    for (let k = 0; k < 4; k++) {
      const shown = pool(ctx, nShow);
      const dist = similar(ctx, shown[0], nc - nShow, shown.map((s) => s.hex));
      const choices = r.shuffle(shown.concat(dist));
      const aw = W - showW - 9, cw = aw / nc;
      let showI = "";
      shown.forEach((ic, i) => (showI += icon(ic.hex, showW / 2 + (i - (nShow - 1) / 2) * 21, h / 2, level === 1 ? 30 : 19)));
      let ask = "";
      const answer = [];
      choices.forEach((c, i) => {
        const is = Math.min(cw * 0.8, level === 1 ? 28 : 22);
        ask += hit(i, cw * i + 1, h / 2 - is / 2 - 2, cw - 2, is + 4, icon(c.hex, cw * i + cw / 2, h / 2, is));
        if (shown.includes(c)) answer.push(i);
      });
      items.push(memRow(ctx, showW, h, showI, ask, { answer, sub: nShow === 1 ? "one" : "all", showSec: level === 1 ? 3 : 5 }));
    }
    return { instr: ctx.kid ? "왼쪽 그림을 5초 동안 보고 종이로 가려요. 오른쪽에서 본 그림을 찾아 ○ 하세요." : "왼쪽을 5초 동안 보고 점선을 따라 가리세요. 오른쪽에서 보았던 것을 모두 찾아 ○ 표시하세요.", items };
  }
  function gridCells(x, y, n, size, filled, opt) {
    opt = opt || {};
    const cs = size / n;
    let s = "";
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const id = j * n + i, f = filled && filled[id];
      const cell = `<rect x="${f1(x + i * cs)}" y="${f1(y + j * cs)}" width="${f1(cs)}" height="${f1(cs)}" fill="${f || "#fff"}" stroke="#666" stroke-width="0.35"/>`;
      s += opt.hits ? hit("c" + id, x + i * cs, y + j * cs, cs, cs, cell, 0) : cell;
    }
    return s;
  }
  function G_position(ctx) {
    const { r, kid } = ctx;
    const items = [];
    const n = 4, nf = kid ? 3 : 5, size = 56, h = 62;
    for (let k = 0; k < 3; k++) {
      const ids = r.sample([...Array(n * n).keys()], nf);
      const filled = {};
      ids.forEach((id) => (filled[id] = ctx.kid ? VP.PALETTE.kid.cell[0] : "#343a40"));
      const showW = size + 8;
      const showI = gridCells(4, 3, n, size, filled);
      const ask = gridCells(8, 3, n, size, null, { hits: true });
      items.push(memRow(ctx, showW, h, showI, ask, { answer: ids.map((i) => "c" + i), sub: "cells", n, showSec: 5 }));
    }
    return { instr: ctx.kid ? "색칠된 칸을 잘 보고 가려요. 오른쪽 빈 칸에 같은 자리를 색칠하세요." : "왼쪽 칸의 위치를 5초 동안 기억한 뒤 가리고, 오른쪽에 같은 위치를 칠하세요.", items };
  }
  function G_sequence(ctx) {
    const { r, kid } = ctx;
    const items = [];
    const n = kid ? 3 : 4, is = 15, h = 66;
    for (let k = 0; k < 3; k++) {
      const seq = pool(ctx, n);
      const perms = [seq];
      while (perms.length < 3) {
        const p = r.shuffle(seq);
        if (!perms.some((q) => q.every((v, i) => v === p[i]))) perms.push(p);
      }
      const opts = r.shuffle(perms);
      const showW = n * 18 + 8;
      let showI = "";
      seq.forEach((ic, i) => (showI += icon(ic.hex, 4 + 9 + i * 18, h / 2, is)));
      let ask = "";
      opts.forEach((p, j) => {
        let inner = box(0, 3 + j * 21, n * 18 + 4, 19, { stroke: "#bbb", rx: 2 });
        p.forEach((ic, i) => (inner += icon(ic.hex, 2 + 9 + i * 18, 3 + j * 21 + 9.5, is)));
        ask += hit(j, 0, 3 + j * 21, n * 18 + 4, 19, inner);
      });
      items.push(memRow(ctx, showW, h, showI, ask, { answer: [opts.indexOf(seq)], sub: "one", showSec: 6 }));
    }
    return { instr: ctx.kid ? "그림의 순서를 잘 보고 가려요. 순서가 똑같은 줄을 찾아 ○ 하세요." : "왼쪽 그림의 순서를 기억한 뒤 가리고, 같은 순서인 줄을 찾아 ○ 표시하세요.", items };
  }

  // ================= H. 시각-운동 협응 =================
  function latticeGrid(x, y, cells, size, opt) {
    opt = opt || {};
    const cs = size / cells;
    let s = "";
    if (opt.dotsOnly) {
      for (let i = 0; i <= cells; i++) for (let j = 0; j <= cells; j++) s += `<circle cx="${f1(x + i * cs)}" cy="${f1(y + j * cs)}" r="0.9" fill="#333"/>`;
      return s;
    }
    for (let i = 0; i <= cells; i++) {
      s += `<line x1="${f1(x + i * cs)}" y1="${f1(y)}" x2="${f1(x + i * cs)}" y2="${f1(y + size)}" stroke="#555" stroke-width="0.3"/>`;
      s += `<line x1="${f1(x)}" y1="${f1(y + i * cs)}" x2="${f1(x + size)}" y2="${f1(y + i * cs)}" stroke="#555" stroke-width="0.3"/>`;
    }
    return s;
  }
  function segsPath(segs, x, y, cs, color, sw) {
    const d = segs.map((k) => { const [a, b] = VP.parseSeg(k); return `M${f1(x + a[0] * cs)} ${f1(y + a[1] * cs)}L${f1(x + b[0] * cs)} ${f1(y + b[1] * cs)}`; }).join("");
    return `<path d="${d}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" fill="none"/>`;
  }
  function straightLines(r, pts, count) {
    // 1단계: 가로·세로 곧은 선 1~2개 (원자료의 첫 단계와 같은 난이도)
    const set = new Set();
    let g = 0;
    while (set.size === 0 || (g++ < 50 && [...set].length < count * 2)) {
      const vert = r.chance(0.5), fixed = r.int(0, pts - 1), a = r.int(0, pts - 3), len = r.int(2, pts - 1 - a);
      const tmp = [];
      for (let t = a; t < a + len; t++) tmp.push(vert ? VP.segKey([fixed, t], [fixed, t + 1]) : VP.segKey([t, fixed], [t + 1, fixed]));
      if (tmp.some((k) => set.has(k))) continue;
      tmp.forEach((k) => set.add(k));
      if (--count <= 0) break;
    }
    return [...set].sort();
  }
  function H_copy(ctx, dotsOnly) {
    const { r, level } = ctx;
    const cells = [0, 3, 4, 5][level], size = [0, 54, 58, 62][level];
    const h = size + 8, cs = size / cells;
    const items = [];
    for (let k = 0; k < 3; k++) {
      const segs = level === 1 ? straightLines(r, cells + 1, r.int(1, 2)) : VP.pattern.random(r, cells + 1, level === 2 ? r.int(3, 5) : r.int(7, 10), true);
      const color = ctx.kid ? VP.PALETTE.kid.line : "#1f2d4d";
      const sw = [0, 1.6, 1.3, 1.1][level];
      const mx = 10, bx = W - size - 10;
      let s = latticeGrid(mx, 4, cells, size, { dotsOnly }) + segsPath(segs, mx, 4, cs, color, sw);
      s += `<path d="M${f1(mx + size + 8)} ${f1(h / 2)}h${f1(bx - mx - size - 22)}" stroke="#ced4da" stroke-width="1.2"/><path d="M${f1(bx - 10)} ${f1(h / 2 - 3)}l5 3l-5 3z" fill="#ced4da"/>`;
      s += `<g class="canvas" data-grid="${f1(bx)},4,${cells},${f1(size)}">${latticeGrid(bx, 4, cells, size, { dotsOnly })}</g>`;
      items.push({ svg: svg(W, h, s), mode: "copy", answer: segs, grid: { x: bx, y: 4, cells, size } });
    }
    return { instr: ctx.kid ? "왼쪽 그림을 보고 오른쪽 칸에 똑같이 그려 보세요." : dotsOnly ? "왼쪽 점판의 선을 오른쪽 점판에 똑같이 옮겨 그리세요." : "왼쪽 격자의 선을 오른쪽 격자의 같은 자리에 옮겨 그리세요.", items };
  }
  function H_cells(ctx) {
    const { r, level } = ctx;
    const n = [0, 3, 4, 5][level], size = [0, 54, 58, 62][level], h = size + 8;
    const nf = [0, [1, 2], [3, 5], [5, 7]][level], ncol = [0, 1, 2, 3][level];
    const items = [];
    const pal = VP.PALETTE[ctx.theme].cell;
    for (let k = 0; k < 3; k++) {
      const ids = r.sample([...Array(n * n).keys()], r.int(nf[0], nf[1]));
      const cols = r.sample(pal, ncol);
      const filled = {};
      ids.forEach((id, i) => (filled[id] = cols[i % ncol]));
      const bx = W - size - 10;
      let s = gridCells(10, 4, n, size, filled);
      s += `<path d="M${f1(10 + size + 8)} ${f1(h / 2)}h${f1(bx - size - 40)}" stroke="#ced4da" stroke-width="1.2"/><path d="M${f1(bx - 10)} ${f1(h / 2 - 3)}l5 3l-5 3z" fill="#ced4da"/>`;
      s += gridCells(bx, 4, n, size, null, { hits: true });
      const answer = {};
      for (const k in filled) answer["c" + k] = filled[k];
      items.push({ svg: svg(W, h, s), mode: "cells", answer, n, colors: cols });
    }
    return { instr: ctx.kid ? "왼쪽과 같은 자리에 같은 색을 칠해 보세요." : "왼쪽과 같은 위치에 같은 색을 칠하세요.", items };
  }
  function H_path(ctx) {
    const { r, level } = ctx;
    const items = [];
    const wid = level === 1 ? 14 : 8, h = 104, amp = level === 1 ? 22 : 34, nk = level === 1 ? 3 : 5;
    for (let k = 0; k < 2; k++) {
      const [a, b] = pool(ctx, 2);
      const pts = [[24, h / 2 + r.range(-15, 15)]];
      for (let i = 1; i <= nk; i++) pts.push([24 + (132 * i) / (nk + 1), h / 2 + (i % 2 ? 1 : -1) * r.range(amp * 0.5, amp)]);
      pts.push([156, h / 2 + r.range(-15, 15)]);
      const d = VP.smoothPath(pts);
      let s = `<path d="${d}" stroke="#495057" stroke-width="${wid + 1}" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#fff" stroke-width="${wid - 0.2}" fill="none" stroke-linecap="round"/>`;
      s += `<path d="${d}" stroke="#ced4da" stroke-width="0.5" stroke-dasharray="2 2" fill="none"/>`;
      s += icon(a.hex, 12, pts[0][1], 22) + icon(b.hex, 168, pts[pts.length - 1][1], 22);
      items.push({ svg: svg(W, h, `<g class="canvas">${s}</g>`), mode: "path", path: d, width: wid, answer: null });
    }
    return { instr: ctx.kid ? "선에 닿지 않게 길 가운데로 연필을 움직여 친구에게 가요." : "길의 양쪽 선에 닿지 않도록 가운데를 따라 한 번에 이어 그리세요.", items };
  }
  function H_maze(ctx) {
    const { r, level } = ctx;
    const cols = level === 2 ? 7 : 11, rowsN = level === 2 ? 7 : 12, cs = level === 2 ? 22 : 15;
    const w = cols * cs, h = rowsN * cs;
    // 깊이 우선 미로
    const seen = new Set(), walls = new Set();
    for (let x = 0; x < cols; x++) for (let y = 0; y < rowsN; y++) { walls.add(`${x},${y},R`); walls.add(`${x},${y},D`); }
    const stack = [[0, 0]];
    seen.add("0,0");
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const nb = r.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1]]).map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < cols && b < rowsN && !seen.has(a + "," + b));
      if (!nb.length) { stack.pop(); continue; }
      const [nx, ny] = nb[0];
      if (nx > x) walls.delete(`${x},${y},R`); else if (nx < x) walls.delete(`${nx},${ny},R`); else if (ny > y) walls.delete(`${x},${y},D`); else walls.delete(`${nx},${ny},D`);
      seen.add(nx + "," + ny);
      stack.push([nx, ny]);
    }
    const ox = (W - w) / 2, oy = 4;
    let d = `M${f1(ox + cs)} ${f1(oy)}H${f1(ox + w)}V${f1(oy + h)}M${f1(ox + w - cs)} ${f1(oy + h)}H${f1(ox)}V${f1(oy)}`;
    walls.forEach((k) => {
      const [x, y, t] = k.split(",");
      const X = ox + (+x + 1) * cs, Y = oy + (+y + 1) * cs;
      if (t === "R" && +x < cols - 1) d += `M${f1(X)} ${f1(Y - cs)}V${f1(Y)}`;
      if (t === "D" && +y < rowsN - 1) d += `M${f1(X - cs)} ${f1(Y)}H${f1(X)}`;
    });
    const [a, b] = pool(ctx, 2);
    let s = `<path d="${d}" stroke="${ctx.kid ? "#5c7cfa" : "#343a40"}" stroke-width="${level === 2 ? 1.6 : 1.1}" stroke-linecap="square" fill="none"/>`;
    s += icon(a.hex, ox + cs / 2, oy - 0.5 + cs / 2, cs * 0.75, { op: 0.9 }) + icon(b.hex, ox + w - cs / 2, oy + h - cs / 2, cs * 0.75);
    return { instr: ctx.kid ? "미로의 선을 넘지 않고 출발 그림에서 도착 그림까지 길을 그려요." : "벽을 넘지 않고 왼쪽 위에서 오른쪽 아래까지 길을 그리세요.", items: [{ svg: svg(W, h + 8, `<g class="canvas">${s}</g>`), mode: "maze", answer: null, maze: { cols, rows: rowsN, cs, ox, oy, walls: [...walls] } }] };
  }

  // =====================================================================
  // 추가 활동 (2026-09-30, 인터넷 참고자료 반영)
  //  - 점 잇기·좌→우 줄 훑기: 시각 추적·탐색 활동 (OT Toolbox 등 작업치료 활동 자료)
  //  - 다른 그림 찾기, 숨은 도형(TVPS-4 figure-ground 형식), 조각 맞추기(시각 분석·통합)
  //  - 위치어·대칭 그리기(공간 관계), 없어진 것 찾기(시각 기억)
  //  - 도형 따라 그리기(Beery VMI 발달 순서), 블록 무늬(블록 디자인·파케트리 형식)
  // =====================================================================

  /* 도형 외곽선 위의 점 n개 (브라우저의 path 길이 측정 사용) */
  function outlinePoints(type, cx, cy, r, n, rot) {
    const V = VP.shapeVerts(type, cx, cy, r, rot);
    if (V) {
      // 꼭짓점을 반드시 포함하고, 남는 점은 변 길이에 비례해 나눠 준다
      const len = V.map((a, i) => { const b = V[(i + 1) % V.length]; return Math.hypot(b[0] - a[0], b[1] - a[1]); });
      const per = len.reduce((a, b) => a + b, 0);
      const cnt = len.map((l) => Math.max(1, Math.round((n * l) / per)));
      const sum = () => cnt.reduce((a, b) => a + b, 0);
      const ratio = (k) => len[k] / cnt[k];
      while (sum() < n) { let k = 0; cnt.forEach((_, i) => { if (ratio(i) > ratio(k)) k = i; }); cnt[k]++; }
      while (sum() > n) { let k = -1; cnt.forEach((c, i) => { if (c > 1 && (k < 0 || ratio(i) < ratio(k))) k = i; }); if (k < 0) break; cnt[k]--; }
      const out = [];
      V.forEach((a, i) => { const b = V[(i + 1) % V.length]; for (let k = 0; k < cnt[i]; k++) out.push([a[0] + ((b[0] - a[0]) * k) / cnt[i], a[1] + ((b[1] - a[1]) * k) / cnt[i]]); });
      return out;
    }
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", VP.shapeD(type, cx, cy, r, rot));
    const L = p.getTotalLength();
    return [...Array(n).keys()].map((i) => { const q = p.getPointAtLength((L * i) / n); return [q.x, q.y]; });
  }

  // ---------- A. 점 잇기 ----------
  function A_dots(ctx) {
    const { r, level } = ctx;
    const n = [0, 10, 20, 30][level];
    const types = level === 1 ? ["star", "heart", "triangle", "square", "diamond", "cross"] : ["star", "heart", "cross", "arrow", "flag", "tshape", "lshape", "hexagon", "pentagon", "trapezoid"];
    const t = r.pick(types);
    const h = 200, cx = W / 2, cy = h / 2 + 4;
    const pts = outlinePoints(t, cx, cy, 82, n, level === 3 ? r.pick([0, 90, 180, 270]) : 0);
    const start = r.int(0, n - 1);
    const order = [...Array(n).keys()].map((i) => pts[(start + i) % n]);
    let s = `<path d="M${order.map((p) => f1(p[0]) + " " + f1(p[1])).join("L")}Z" class="ans" stroke="none" fill="none"/>`;
    order.forEach((p, i) => {
      const dx = p[0] - cx, dy = p[1] - cy, dl = Math.hypot(dx, dy) || 1;
      const lx = p[0] + (dx / dl) * 5, ly = p[1] + (dy / dl) * 5;
      const dot = `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${level === 1 ? 1.8 : 1.2}" fill="${i === 0 ? ctx.accent : "#222"}"/>` + text(lx, ly, i + 1, level === 1 ? 5 : 3.8, { fill: i === 0 ? ctx.accent : "#333" });
      s += hit("d" + i, p[0] - 4, p[1] - 4, 8, 8, dot, 4);
    });
    return { instr: ctx.kid ? `1부터 ${n}까지 순서대로 점을 이어 보세요. 무슨 모양이 나올까요?` : `1부터 ${n}까지 번호 순서대로 점을 잇고, 마지막 점은 1과 이으세요.`, items: [{ svg: svg(W, h + 8, s), mode: "dots", answer: n }] };
  }

  // ---------- A. 줄 훑기(왼쪽 → 오른쪽) ----------
  function A_rows(ctx) {
    const { r, level, kid } = ctx;
    const rowsN = level === 2 ? 8 : 10, cols = level === 2 ? 10 : 13;
    const band = 30, rh = level === 2 ? 22 : 18, x0 = 12, cw = (W - x0) / cols;
    let draw, target, pickD;
    if (kid) {
      // 결합 탐색: 색과 모양이 모두 같아야 목표 (빨간 동그라미 ↔ 빨간 네모·파란 동그라미)
      const cols2 = VP.PALETTE.kid.fills.slice(0, 4), shapes = ["circle", "square", "triangle", "star"];
      target = { c: r.pick(cols2), s: r.pick(shapes) };
      const others = [];
      for (const c of cols2) for (const sh of shapes) if (c !== target.c || sh !== target.s) if (c === target.c || sh === target.s || level === 3) others.push({ c, s: sh });
      draw = (g, x, y) => shape(g.s, x, y, level === 2 ? 5.2 : 4.4, { fill: g.c, stroke: "none", sw: 0 });
      pickD = () => r.pick(others);
    } else {
      const sets = [["가", "거", "고", "구", "기", "갸"], ["바", "파", "다", "타", "마"], ["b", "d", "p", "q", "h"], ["E", "F", "L", "T"], ["3", "8", "6", "9", "5"], ["m", "n", "u", "w"]];
      const set = r.pick(sets);
      target = r.pick(set);
      draw = (g, x, y) => text(x, y, g, level === 2 ? 8 : 6.6, { fill: "#222", weight: 400, font: "'Malgun Gothic', Arial, sans-serif" });
      pickD = () => { let g; do g = r.pick(set); while (g === target); return g; };
    }
    let s = box(0, 0, W, band - 4, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 }) + text(24, 13, kid ? "찾을 모양" : "찾을 글자", 5.5, { fill: ctx.accent }) + draw(target, 60, 13);
    const answer = [];
    for (let y = 0; y < rowsN; y++) {
      const yy = band + y * rh + rh / 2;
      s += `<path d="M1 ${f1(yy - 3)}l5 3l-5 3z" fill="${ctx.accent}"/>`;
      const nt = r.int(1, 3), pos = r.sample([...Array(cols).keys()], nt);
      for (let x = 0; x < cols; x++) {
        const g = pos.includes(x) ? target : pickD();
        const id = y * cols + x, xx = x0 + cw * x + cw / 2;
        s += hit(id, xx - cw / 2 + 0.5, yy - rh / 2 + 1, cw - 1, rh - 2, draw(g, xx, yy));
        if (pos.includes(x)) answer.push(id);
      }
      s += `<line x1="${x0}" y1="${f1(yy + rh / 2)}" x2="${W}" y2="${f1(yy + rh / 2)}" stroke="#eee" stroke-width="0.3"/>`;
    }
    return { instr: kid ? "화살표가 있는 줄부터 한 줄씩 왼쪽에서 오른쪽으로 보면서, 색과 모양이 모두 같은 것을 찾아 ○ 하세요." : "한 줄씩 왼쪽→오른쪽으로 읽듯이 훑으며 찾을 글자에 ○ 표시하세요. 걸린 시간을 적어 보세요.", items: [{ svg: svg(W, band + rowsN * rh, s), mode: "all", answer }] };
  }

  // ---------- B. 다른 그림 찾기 ----------
  function B_spot(ctx) {
    const { r, level } = ctx;
    const nd = [0, 3, 4, 5][level], ni = [0, 8, 11, 14][level];
    const stacked = level === 3;
    const pw = stacked ? W : 86, ph = stacked ? 100 : 104, is = stacked ? 17 : 17;
    const items = [];
    for (let k = 0; k < (stacked ? 1 : 2); k++) {
      const ics = pool(ctx, ni);
      const pts = VP.scatter(r, ni, pw, ph, is * 1.25, is * 0.7);
      const diffIdx = r.sample([...pts.keys()], nd);
      const kinds = ["gone", "swap"].concat(level === 3 ? ["flip"] : []).concat(level >= 2 ? ["big"] : []);
      const ox = stacked ? 0 : W - pw, oy = stacked ? ph + 6 : 0;
      let L = VP.box(0, 0, pw, ph, { stroke: ctx.accent, sw: 0.6 }), R = VP.box(ox, oy, pw, ph, { stroke: ctx.accent, sw: 0.6 });
      const answer = [];
      pts.forEach((p, i) => {
        const ic = ics[i];
        L += icon(ic.hex, p[0], p[1], is);
        const X = ox + p[0], Y = oy + p[1];
        let inner = icon(ic.hex, X, Y, is);
        if (diffIdx.includes(i)) {
          const kd = r.pick(kinds);
          if (kd === "gone") inner = "";
          if (kd === "swap") inner = icon(similar(ctx, ic, 1, ics.map((c) => c.hex))[0].hex, X, Y, is);
          if (kd === "flip") inner = icon(ic.hex, X, Y, is, { flip: true, rot: ic.dir ? 0 : 180 });
          if (kd === "big") inner = icon(ic.hex, X, Y, is * 1.45);
          answer.push("s" + i);
        }
        R += hit("s" + i, X - is / 2, Y - is / 2, is, is, inner);
      });
      items.push({ svg: svg(W, stacked ? ph * 2 + 6 : ph, L + R), mode: "all", answer });
    }
    return { instr: ctx.kid ? `두 그림에서 다른 곳 ${nd}군데를 찾아 ${level === 3 ? "아래" : "오른쪽"} 그림에 ○ 하세요.` : `두 그림을 비교해 다른 곳 ${nd}군데를 찾아 ${level === 3 ? "아래" : "오른쪽"} 그림에 ○ 표시하세요.`, items };
  }

  // ---------- C. 숨은 도형 찾기 (복잡한 무늬 속에 보기 모양이 들어 있는 것) ----------
  function shiftSegs(segs, dx, dy) {
    return segs.map((k) => { const [a, b] = VP.parseSeg(k); return VP.segKey([a[0] + dx, a[1] + dy], [b[0] + dx, b[1] + dy]); });
  }
  function containsAt(design, sample, n) {
    const set = new Set(design);
    for (let dx = -n; dx <= n; dx++) for (let dy = -n; dy <= n; dy++) {
      const sh = shiftSegs(sample, dx, dy);
      if (sh.every((k) => set.has(k))) return true;
    }
    return false;
  }
  function inBounds(segs, n) { return segs.every((k) => VP.parseSeg(k).every((p) => p[0] >= 0 && p[1] >= 0 && p[0] < n && p[1] < n)); }
  function C_embed(ctx) {
    const { r, level } = ctx;
    const n = level === 2 ? 4 : 5, sm = level === 2 ? 3 : 4, extra = level === 2 ? 5 : 9, nc = 4;
    const items = [];
    const allSegs = [];
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const q = [x + dx, y + dy];
      if (q[0] < n && q[1] >= 0 && q[1] < n) allSegs.push(VP.segKey([x, y], q));
    }
    for (let k = 0; k < 5; k++) {
      let sample;
      do sample = VP.pattern.random(r, 3, sm, true); while (sample.length !== sm);
      const build = (core) => {
        for (let t = 0; t < 200; t++) {
          const dx = r.int(0, n - 3), dy = r.int(0, n - 3);
          const moved = shiftSegs(core, dx, dy);
          if (!inBounds(moved, n)) continue;
          const set = new Set(moved);
          r.shuffle(allSegs).slice(0, extra * 2).forEach((s2) => { if (set.size < moved.length + extra) set.add(s2); });
          return [...set].sort();
        }
      };
      const good = build(sample);
      const opts = [good];
      let g = 0;
      while (opts.length < nc && g++ < 400) {
        const d = build(VP.pattern.mutate(r, sample, 3, true));
        if (d && !containsAt(d, sample, n)) opts.push(d);
      }
      const list = r.shuffle(opts);
      const L = rowLayout(nc, 30, 34);
      let s = sampleBox(ctx, 30, 34) + VP.pattern.draw(sample, 3, 5, 6, 20, Object.assign({ frame: false }, patOpt(ctx))) + divider(L.x0 - 4, 34);
      list.forEach((p, i) => (s += hit(i, L.cx(i) - 15, 2, 30, 30, VP.pattern.draw(p, n, L.cx(i) - 15, 2, 30, { color: "#222", sw: 0.9 }))));
      items.push({ svg: svg(W, 34, s), mode: "one", answer: [list.indexOf(good)] });
    }
    return { instr: ctx.kid ? "왼쪽 모양이 숨어 있는 그림을 찾아 ○ 하세요. (돌리지 않은 모양 그대로 숨어 있어요)" : "왼쪽 모양이 방향 그대로 숨어 있는 무늬를 찾아 ○ 표시하세요.", items };
  }

  // ---------- E. 위치 알아보기 (위·아래·왼쪽·오른쪽) ----------
  function E_position(ctx) {
    const { r, level, kid } = ctx;
    const n = level === 1 ? 3 : 4, cs = level === 1 ? 24 : 20;
    const ics = pool(ctx, n * n);
    const gx = (W - n * cs) / 2;
    let s = "";
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      s += `<rect x="${f1(gx + i * cs)}" y="${f1(j * cs)}" width="${cs}" height="${cs}" fill="#fff" stroke="#adb5bd" stroke-width="0.4"/>`;
      s += icon(ics[j * n + i].hex, gx + i * cs + cs / 2, j * cs + cs / 2, cs * 0.72);
    }
    const DIRS = [["오른쪽", 1, 0, 0], ["왼쪽", -1, 0, 180], ["위", 0, -1, -90], ["아래", 0, 1, 90]];
    const top = n * cs + 6, qh = 28, nq = level === 1 ? 4 : 5;
    const answer = [];
    for (let q = 0; q < nq; q++) {
      let i, j, steps;
      for (;;) {
        i = r.int(0, n - 1); j = r.int(0, n - 1);
        steps = level === 1 ? [r.pick(DIRS)] : r.chance(0.5) ? [r.pick(DIRS)] : [r.pick(DIRS.slice(0, 2)), r.pick(DIRS.slice(2))];
        const ti = i + steps.reduce((a, d) => a + d[1], 0), tj = j + steps.reduce((a, d) => a + d[2], 0);
        if (ti >= 0 && tj >= 0 && ti < n && tj < n) { var tgt = ics[tj * n + ti]; break; }
      }
      const y = top + q * qh + qh / 2;
      s += icon(ics[j * n + i].hex, 14, y, 18);
      steps.forEach((d, k) => {
        s += shape("arrow", 34 + k * 30, y - 3, 5, { rot: d[3], fill: ctx.accent, stroke: "none", sw: 0 }) + text(34 + k * 30, y + 6, d[0], 3.6, { fill: ctx.accent });
      });
      const choices = r.shuffle([tgt].concat(r.sample(ics.filter((c) => c !== tgt && c !== ics[j * n + i]), 2)));
      const cx0 = 100;
      s += text(cx0 - 12, y, "→", 6, { fill: "#999" });
      choices.forEach((c, k) => {
        s += hit(`q${q}_${k}`, cx0 + k * 27 - 11, y - 11, 22, 22, box(cx0 + k * 27 - 11, y - 11, 22, 22, { stroke: "#ccc", rx: 2 }) + icon(c.hex, cx0 + k * 27, y, 17));
        if (c === tgt) answer.push(`q${q}_${k}`);
      });
    }
    return { instr: kid ? "위의 판에서 그림을 찾고, 화살표 쪽으로 한 칸 가면 무엇이 있는지 ○ 하세요." : "판에서 왼쪽 그림을 찾아 화살표 방향으로(두 개면 차례로) 한 칸씩 이동한 곳의 그림에 ○ 표시하세요.", items: [{ svg: svg(W, top + nq * qh, s), mode: "all", answer }] };
  }

  // ---------- E. 대칭 그리기 ----------
  function rectGrid(x, y, cols, rows, cs) {
    let s = "";
    for (let i = 0; i <= cols; i++) s += `<line x1="${f1(x + i * cs)}" y1="${f1(y)}" x2="${f1(x + i * cs)}" y2="${f1(y + rows * cs)}" stroke="#555" stroke-width="0.3"/>`;
    for (let j = 0; j <= rows; j++) s += `<line x1="${f1(x)}" y1="${f1(y + j * cs)}" x2="${f1(x + cols * cs)}" y2="${f1(y + j * cs)}" stroke="#555" stroke-width="0.3"/>`;
    return s;
  }
  function E_symmetry(ctx) {
    const { r, level } = ctx;
    const half = level === 2 ? 3 : 4, rows = level === 2 ? 4 : 5, cs = level === 2 ? 14 : 12;
    const items = [];
    for (let k = 0; k < 2; k++) {
      let segs;
      do {
        segs = VP.pattern.random(r, Math.max(half, rows) + 1, level === 2 ? r.int(4, 5) : r.int(6, 8), level === 3)
          .filter((q) => VP.parseSeg(q).every((p) => p[0] <= half && p[1] <= rows))
          .filter((q) => !VP.parseSeg(q).every((p) => p[0] === half)); // 가운데 선 위의 선분은 제외
      } while (segs.length < (level === 2 ? 3 : 5) || !segs.some((q) => VP.parseSeg(q).some((p) => p[0] === half)));
      const mirror = segs.map((q) => { const [a, b] = VP.parseSeg(q); return VP.segKey([2 * half - a[0], a[1]], [2 * half - b[0], b[1]]); }).sort();
      const gw = half * 2 * cs, x = (W - gw) / 2, h = rows * cs + 8;
      let s = rectGrid(x, 4, half * 2, rows, cs) + segsPath(segs, x, 4, cs, ctx.patColor, 1.3);
      s += `<line x1="${f1(x + half * cs)}" y1="0" x2="${f1(x + half * cs)}" y2="${f1(h)}" stroke="${ctx.accent}" stroke-width="0.9" stroke-dasharray="3 1.5"/>`;
      s += `<g class="canvas"></g>`;
      items.push({ svg: svg(W, h, s), mode: "copy", answer: mirror, grid: { x, y: 4, cols: half * 2, rows, cs, lattice: true } });
    }
    return { instr: ctx.kid ? "가운데 점선에 거울을 세웠어요. 오른쪽에 거울에 비친 모양을 그려 보세요." : "가운데 점선을 기준으로 왼쪽 선과 대칭이 되도록 오른쪽을 완성하세요.", items };
  }

  // ---------- F. 조각 맞추기 ----------
  function F_pieces(ctx) {
    const { r, level } = ctx;
    const items = [];
    for (let k = 0; k < 4; k++) {
      const t = pool(ctx, 1)[0];
      const choices = r.shuffle([t].concat(similar(ctx, t, 3)));
      const S = 34, W0 = 64, h = 48;
      let s = box(1, 1, W0 - 2, h - 2, { fill: "#fff", stroke: ctx.accent, sw: 0.6 });
      // 조각: 1단계 좌우 반쪽, 2단계 네 조각(자리 유지), 3단계 네 조각(자리 섞고 돌림)
      const pieces = level === 1 ? [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]] : [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
      const slots = level === 3 ? r.shuffle(pieces) : pieces;
      pieces.forEach((pc, i) => {
        const id = VP.uid("cp");
        const x0 = W0 / 2 - S / 2, y0 = h / 2 - S / 2;
        const cx = x0 + (pc[0] + pc[2] / 2) * S, cy = y0 + (pc[1] + pc[3] / 2) * S;
        const sl = slots[i], gap = level === 1 ? 5 : 4;
        const tx = (sl[0] + sl[2] / 2 - 0.5) * S * 2 * (1 + gap / S) - (pc[0] + pc[2] / 2 - 0.5) * S * 2 + (sl[0] + sl[2] / 2 - 0.5) * gap;
        const ty = (sl[1] + sl[3] / 2 - 0.5) * S * 2 * (1 + gap / S) - (pc[1] + pc[3] / 2 - 0.5) * S * 2 + (sl[1] + sl[3] / 2 - 0.5) * gap;
        const dx = (sl[0] - pc[0]) * S + (sl[0] + sl[2] / 2 - 0.5) * gap * 2;
        const dy = (sl[1] - pc[1]) * S + (sl[1] + sl[3] / 2 - 0.5) * gap * 2;
        const rot = level === 3 ? r.pick([0, 90, 180, 270]) : 0;
        s += `<defs><clipPath id="${id}"><rect x="${f1(x0 + pc[0] * S)}" y="${f1(y0 + pc[1] * S)}" width="${f1(pc[2] * S)}" height="${f1(pc[3] * S)}"/></clipPath></defs>`;
        s += `<g transform="translate(${f1(dx)} ${f1(dy)}) rotate(${rot} ${f1(cx)} ${f1(cy)})"><g clip-path="url(#${id})">${icon(t.hex, W0 / 2, h / 2, S)}</g><rect x="${f1(x0 + pc[0] * S)}" y="${f1(y0 + pc[1] * S)}" width="${f1(pc[2] * S)}" height="${f1(pc[3] * S)}" fill="none" stroke="#ced4da" stroke-width="0.3"/></g>`;
        void tx; void ty;
      });
      const L = rowLayout(4, W0, h);
      s += divider(L.x0 - 4, h);
      choices.forEach((c, i) => (s += hit(i, L.cx(i) - 15, h / 2 - 15, 30, 30, icon(c.hex, L.cx(i), h / 2, 26))));
      items.push({ svg: svg(W, h, s), mode: "one", answer: [choices.indexOf(t)] });
    }
    return { instr: ctx.kid ? "조각들을 합치면 어떤 그림이 될까요? 오른쪽에서 찾아 ○ 하세요." : level === 3 ? "섞이고 돌아간 조각들을 머릿속으로 맞추면 어떤 그림인지 찾아 ○ 표시하세요." : "조각을 합치면 어떤 그림이 되는지 찾아 ○ 표시하세요.", items };
  }

  // ---------- G. 없어진 것 찾기 ----------
  function G_missing(ctx) {
    const { r, level, kid } = ctx;
    const n = [0, kid ? 3 : 4, kid ? 4 : 5, kid ? 5 : 6][level];
    const items = [];
    const h = 58;
    for (let k = 0; k < 3; k++) {
      const shown = pool(ctx, n);
      const gone = r.pick(shown);
      const rest = r.shuffle(shown.filter((x) => x !== gone));
      const cols = Math.ceil(n / 2), showW = cols * 20 + 10;
      let showI = "";
      shown.forEach((ic, i) => (showI += icon(ic.hex, 5 + 10 + (i % cols) * 20, h / 2 + (Math.floor(i / cols) - 0.5) * 22, 17)));
      const choices = r.shuffle([gone].concat(similar(ctx, gone, 1, shown.map((x) => x.hex)), r.sample(rest, 2)));
      let ask = "";
      rest.forEach((ic, i) => (ask += icon(ic.hex, 8 + i * 15, 11, 12)));
      ask += text(2, 26, "없어진 것은?", 4.6, { anchor: "start", fill: ctx.accent });
      // 선택지는 오른쪽 칸 폭 안에 고르게 (보기 그림이 많아도 넘치지 않게)
      const aw = W - showW - 9, ccw = Math.min(22, (aw - 26) / 4), cis = Math.min(17, ccw - 2);
      choices.forEach((c, i) => (ask += hit(i, 26 + i * ccw, 34, ccw - 1, 20, icon(c.hex, 26 + i * ccw + ccw / 2, 44, cis))));
      items.push(memRow(ctx, showW, h, showI, ask, { answer: [choices.indexOf(gone)], sub: "one", showSec: level === 1 ? 4 : 6 }));
    }
    return { instr: kid ? "왼쪽 그림들을 잘 보고 가려요. 오른쪽 위에서 하나가 없어졌어요. 없어진 그림에 ○ 하세요." : "왼쪽을 기억하고 가리세요. 오른쪽 위에 남은 그림을 보고, 없어진 하나를 아래에서 골라 ○ 표시하세요.", items };
  }

  // ---------- H. 도형 따라 그리기 (Beery VMI 발달 순서 참고) ----------
  const VMI_SHAPES = {
    1: ["vline", "hline", "circle", "cross"],
    2: ["rdiag", "ldiag", "square", "xcross", "triangle"],
    3: ["diamond", "hdiamond", "dividedRect", "twoCircles", "star6"],
  };
  function vmiPath(k, cx, cy, s) {
    const h = s / 2;
    const P = (pts, close) => "M" + pts.map((p) => f1(cx + p[0] * h) + " " + f1(cy + p[1] * h)).join("L") + (close ? "Z" : "");
    const circ = (x, y, rr) => `M${f1(x + rr)} ${f1(y)}A${f1(rr)} ${f1(rr)} 0 1 1 ${f1(x - rr)} ${f1(y)}A${f1(rr)} ${f1(rr)} 0 1 1 ${f1(x + rr)} ${f1(y)}`;
    switch (k) {
      case "vline": return P([[0, -0.9], [0, 0.9]]);
      case "hline": return P([[-0.9, 0], [0.9, 0]]);
      case "circle": return circ(cx, cy, h * 0.85);
      case "cross": return P([[0, -0.9], [0, 0.9]]) + P([[-0.9, 0], [0.9, 0]]);
      case "rdiag": return P([[-0.8, 0.8], [0.8, -0.8]]);
      case "ldiag": return P([[-0.8, -0.8], [0.8, 0.8]]);
      case "square": return P([[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]], true);
      case "xcross": return P([[-0.8, -0.8], [0.8, 0.8]]) + P([[0.8, -0.8], [-0.8, 0.8]]);
      case "triangle": return P([[0, -0.85], [0.85, 0.75], [-0.85, 0.75]], true);
      case "diamond": return P([[0, -0.95], [0.6, 0], [0, 0.95], [-0.6, 0]], true);
      case "hdiamond": return P([[-0.95, 0], [0, -0.6], [0.95, 0], [0, 0.6]], true);
      case "dividedRect": return P([[-0.9, -0.55], [0.9, -0.55], [0.9, 0.55], [-0.9, 0.55]], true) + P([[-0.9, -0.55], [0.9, 0.55]]) + P([[0.9, -0.55], [-0.9, 0.55]]) + P([[0, -0.55], [0, 0.55]]);
      case "twoCircles": return circ(cx - h * 0.3, cy, h * 0.55) + circ(cx + h * 0.3, cy, h * 0.55);
      case "star6": return P([[0, -0.9], [0.78, 0.45], [-0.78, 0.45]], true) + P([[0, 0.9], [0.78, -0.45], [-0.78, -0.45]], true);
    }
  }
  function H_trace(ctx) {
    const { r, level } = ctx;
    const list = VMI_SHAPES[level];
    const start = r.int(0, list.length - 1);
    const rowsN = 4, h = 50, s0 = 38;
    const items = [];
    for (let k = 0; k < rowsN; k++) {
      const key = list[(start + k) % list.length];
      const cols = [30, 90, 150];
      let s = "";
      cols.forEach((cx) => (s += box(cx - 24, 3, 48, h - 6, { stroke: "#ced4da", rx: 3 })));
      s += `<path d="${vmiPath(key, cols[0], h / 2, s0)}" stroke="${ctx.patColor}" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="${vmiPath(key, cols[1], h / 2, s0)}" stroke="#adb5bd" stroke-width="1" stroke-dasharray="1.6 1.6" fill="none"/><circle cx="${f1(cols[1])}" cy="${f1(h / 2)}" r="0" />`;
      s += `<g class="canvas" data-box="${cols[2] - 24},3,48,${h - 6}"></g>`;
      items.push({ svg: svg(W, h, s), mode: "trace", shape: key, path: vmiPath(key, cols[1], h / 2, s0), answer: null });
    }
    const hdr = svg(W, 7, text(30, 3.5, "보고", 3.6, { fill: "#888" }) + text(90, 3.5, "따라 긋기", 3.6, { fill: "#888" }) + text(150, 3.5, "혼자 그리기", 3.6, { fill: "#888" }));
    items.unshift({ svg: hdr, mode: "label" });
    return { instr: ctx.kid ? "왼쪽 모양을 보고, 가운데 점선을 따라 그린 다음 오른쪽 칸에 혼자 그려 보세요." : "보기 → 점선 따라 긋기 → 빈칸에 혼자 그리기 순서로 연습하세요.", items };
  }

  // ---------- H. 블록 무늬 (블록 디자인) ----------
  /* 칸 상태: 0 빈칸, 1 전체, 2~5 반쪽 삼각형(칠해진 모서리: 2 왼위, 3 오위, 4 오아래, 5 왼아래) */
  function blockCell(x, y, cs, st, color, hitId) {
    let inner = `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(cs)}" height="${f1(cs)}" fill="#fff" stroke="#666" stroke-width="0.35"/>`;
    const tri = { 2: [[0, 0], [1, 0], [0, 1]], 3: [[0, 0], [1, 0], [1, 1]], 4: [[1, 0], [1, 1], [0, 1]], 5: [[0, 0], [1, 1], [0, 1]] };
    if (st === 1) inner += `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(cs)}" height="${f1(cs)}" fill="${color}"/>`;
    if (st >= 2) inner += `<path d="M${tri[st].map((p) => f1(x + p[0] * cs) + " " + f1(y + p[1] * cs)).join("L")}Z" fill="${color}"/>`;
    return hitId ? hit(hitId, x, y, cs, cs, inner, 0) : inner;
  }
  function H_blocks(ctx) {
    const { r, level } = ctx;
    const n = level === 2 ? 3 : 4, size = level === 2 ? 48 : 60, cs = size / n, h = size + 8;
    const color = ctx.kid ? VP.PALETTE.kid.cell[0] : "#1f2d4d";
    const items = [];
    for (let k = 0; k < 3; k++) {
      const st = [...Array(n * n)].map(() => r.pick(level === 2 ? [0, 0, 1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 2, 3, 4, 5]));
      const bx = W - size - 12;
      let s = "";
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += blockCell(12 + i * cs, 4 + j * cs, cs, st[j * n + i], color);
      s += `<path d="M${f1(12 + size + 8)} ${f1(h / 2)}h${f1(bx - size - 42)}" stroke="#ced4da" stroke-width="1.2"/><path d="M${f1(bx - 10)} ${f1(h / 2 - 3)}l5 3l-5 3z" fill="#ced4da"/>`;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) s += blockCell(bx + i * cs, 4 + j * cs, cs, 0, color, "c" + (j * n + i));
      const answer = {};
      st.forEach((v, i) => (answer["c" + i] = v));
      items.push({ svg: svg(W, h, s), mode: "blocks", answer, n, color });
    }
    return { instr: ctx.kid ? "왼쪽 무늬와 똑같이 오른쪽 칸을 칠해 보세요. 반쪽만 칠한 칸도 있어요." : "왼쪽 블록 무늬를 오른쪽에 똑같이 칠하세요. 삼각형(반 칸)의 방향에 주의하세요.", items };
  }

  // =====================================================================
  // 추가 활동 2 (2026-10-01, 사용자 제공 치료자료의 '과제 형식'만 참고해 새로 생성)
  //  - 숫자 길 미로·순서대로 잇기: 주의·탐색 (시지각 워크북 스캔본, 기초인지워크북2의 형식)
  //  - 패턴 이어 가기·두 줄 비교: 변별 (시지각 훈련 프로그램의 줄 비교 형식)
  //  - 같은 것끼리 짝 잇기: 형태 항상성
  //  - 원 조각 맞추기: 시각 완성
  // =====================================================================

  // ---------- A. 숫자(그림) 길 미로 ----------
  function A_numPath(ctx) {
    const { r, level, kid } = ctx;
    const [cols, rows] = [[0, 0], [5, 5], [7, 6], [9, 7]][level];
    const cs = [0, 22, 19, 16.5][level];
    // 출발(왼쪽)부터 도착(오른쪽)까지, 앞뒤 칸 말고는 서로 닿지 않는 길
    let path;
    for (let t = 0; t < 500; t++) {
      const start = [0, r.int(0, rows - 1)];
      const p = [start], seen = new Set([start.join()]);
      let ok = true;
      while (p[p.length - 1][0] < cols - 1) {
        const [x, y] = p[p.length - 1];
        const opts = r.shuffle([[1, 0], [1, 0], [0, 1], [0, -1]]).map(([dx, dy]) => [x + dx, y + dy])
          .filter(([a, b]) => a < cols && b >= 0 && b < rows && !seen.has(a + "," + b))
          .filter(([a, b]) => p.slice(0, -1).every(([c, d]) => Math.abs(c - a) + Math.abs(d - b) > 1));
        if (!opts.length) { ok = false; break; }
        p.push(opts[0]); seen.add(opts[0].join());
        if (p.length > cols * rows) { ok = false; break; }
      }
      if (ok && p.length >= cols + (level - 1) * 2) { path = p; break; }
    }
    const onPath = new Set(path.map((q) => q.join()));
    let tgt, others, draw;
    if (kid) {
      const t = pool(ctx, 1)[0];
      const ds = level === 3 ? similar(ctx, t, 4) : pool(ctx, 4, { not: [t.hex] });
      tgt = t; others = ds;
      draw = (g, x, y) => icon(g.hex, x, y, cs * 0.72);
    } else {
      const sets = [null, ["1", "4", "7", "2", "5"], ["6", "9", "3", "5", "2", "8"], ["6", "8", "9", "3", "0", "5"]];
      const set = sets[level];
      tgt = r.pick(set); others = set.filter((d) => d !== tgt);
      draw = (g, x, y) => text(x, y, g, cs * 0.6, { fill: "#222", weight: 700, font: "Arial, 'Malgun Gothic', sans-serif" });
    }
    const ox = (W - cols * cs) / 2, oy = 4;
    let s = "";
    const answer = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const id = "c" + (y * cols + x), on = onPath.has(x + "," + y);
      const g = on ? tgt : r.pick(others);
      const X = ox + x * cs, Y = oy + y * cs;
      s += hit(id, X, Y, cs, cs, `<rect x="${f1(X)}" y="${f1(Y)}" width="${f1(cs)}" height="${f1(cs)}" fill="#fff" stroke="${ctx.accent}" stroke-width="0.4"/>` + draw(g, X + cs / 2, Y + cs / 2), 0);
      if (on) answer.push(id);
    }
    // 출발·도착 화살표 (찾을 숫자·그림을 함께 보여 줌)
    const sy = oy + path[0][1] * cs + cs / 2, ey = oy + path[path.length - 1][1] * cs + cs / 2;
    const tab = (x, y, dir) => `<path d="M${f1(x)} ${f1(y - cs * 0.42)}h${f1(dir * cs * 0.55)}l${f1(dir * cs * 0.3)} ${f1(cs * 0.42)}l${f1(-dir * cs * 0.3)} ${f1(cs * 0.42)}h${f1(-dir * cs * 0.55)}z" fill="#fff" stroke="${ctx.accent}" stroke-width="0.9"/>`;
    s += tab(ox - cs * 0.9, sy, 1) + draw(tgt, ox - cs * 0.55, sy);
    s += tab(ox + cols * cs + cs * 0.9, ey, -1) + draw(tgt, ox + cols * cs + cs * 0.55, ey);
    return {
      instr: kid ? "왼쪽 그림과 같은 그림만 밟고 오른쪽까지 가요. 길이 되는 칸을 칠해 보세요." : "왼쪽 화살표의 숫자만 따라 오른쪽 화살표까지 가는 길을 찾아 칸을 칠하세요. (가로·세로로만 이어져요)",
      items: [{ svg: svg(W, rows * cs + 8, s), mode: "all", answer }],
    };
  }

  // ---------- A. 순서대로 잇기 (트레일 형식) ----------
  function A_trail(ctx) {
    const { r, level, kid } = ctx;
    let labels, colorSeq = null;
    if (kid && level === 1) {
      colorSeq = r.sample(VP.PALETTE.kid.cell.concat(["#cc5de8", "#f783ac"]), 5);
      labels = colorSeq.map(() => "");
    } else if (!kid && level === 3) {
      const ko = ["가", "나", "다", "라", "마", "바", "사"];
      labels = [];
      for (let i = 0; i < 7; i++) labels.push(String(i + 1), ko[i]);
    } else {
      const n = kid ? [0, 0, 10, 15][level] : [0, 15, 25][level];
      labels = [...Array(n).keys()].map((i) => String(i + 1));
    }
    const n = labels.length, h = 200, band = colorSeq ? 26 : 0;
    const pts = VP.scatter(r, n, W, h - band, n > 15 ? 21 : 26, 8).map((p) => [p[0], p[1] + band]);
    const R = n > 15 ? 4.6 : colorSeq ? 7 : 5.6;
    let s = "";
    if (colorSeq) {
      s += box(0, 0, W, 20, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 }) + text(22, 10, "이 순서로", 5, { fill: ctx.accent });
      colorSeq.forEach((c, i) => { s += `<circle cx="${f1(52 + i * 22)}" cy="10" r="5.5" fill="${c}"/>`; if (i < colorSeq.length - 1) s += text(63 + i * 22, 10, "→", 4.5, { fill: "#999" }); });
    }
    pts.forEach((p, i) => {
      const fill = colorSeq ? colorSeq[i] : "#fff";
      const inner = `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${R}" fill="${fill}" stroke="${colorSeq ? "none" : "#333"}" stroke-width="0.5"${colorSeq ? ' filter="url(#vpShadow)"' : ""}/>` + (labels[i] ? text(p[0], p[1], labels[i], R * 0.95, { fill: "#222" }) : "");
      s += hit("d" + i, p[0] - R - 1, p[1] - R - 1, R * 2 + 2, R * 2 + 2, inner, R);
    });
    const instr = colorSeq ? "위에 있는 색 순서대로 동그라미를 선으로 이어 보세요."
      : !kid && level === 3 ? "1 → 가 → 2 → 나 → 3 → 다 … 처럼 숫자와 글자를 번갈아 순서대로 이으세요."
      : `1부터 ${n}까지 순서대로 동그라미를 선으로 이으세요.${kid ? "" : " 걸린 시간을 적어 보세요."}`;
    return { instr, items: [{ svg: svg(W, h + 4, s), mode: "dots", answer: n, open: true }] };
  }

  // ---------- B. 패턴 이어 가기 ----------
  function B_seq(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    const cellW = 15.5, h = 30, shown = level === 1 ? 5 : 6, esz = 13.5;
    for (let k = 0; k < 5; k++) {
      let seq, choices, drawE;
      if (level < 3) {
        const unitPat = level === 1 ? "AB" : r.pick(["ABC", "AAB", "ABB", "ABCC"]);
        const letters = [...new Set(unitPat)];
        const els = kid ? pool(ctx, letters.length + 2) : r.sample(["circle", "square", "triangle", "star", "heart", "diamond", "cross", "hexagon"], letters.length + 2);
        const colors = r.sample(VP.PALETTE[ctx.theme].fills, letters.length + 2);
        const map = Object.fromEntries(letters.map((l, i) => [l, i]));
        seq = [...Array(shown + 1).keys()].map((i) => map[unitPat[i % unitPat.length]]);
        drawE = kid ? (e, x, y, sz) => icon(els[e].hex, x, y, sz) : (e, x, y, sz) => shape(els[e], x, y, sz * 0.42, { fill: colors[e], stroke: "none", sw: 0 });
        const ans = seq[shown];
        choices = r.shuffle([ans].concat(r.sample([...Array(letters.length + 2).keys()].filter((i) => i !== ans), 3)));
        choices = choices.map((e) => ({ e, ok: e === ans }));
      } else {
        // 3단계: 한 방향으로 일정하게 도는 모양 (회전 규칙 찾기)
        const type = r.pick(["arrow", "flag", "lshape", "tshape"]);
        const step = r.pick([45, 90, -45, -90]), a0 = r.pick([0, 45, 90, 180]);
        const color = kid ? r.pick(VP.PALETTE.kid.fills) : "#1c7ed6";
        seq = [...Array(shown + 1).keys()].map((i) => a0 + i * step);
        drawE = (e, x, y, sz) => shape(type, x, y, sz * 0.4, { rot: e.rot != null ? e.rot : e, sx: e.sx || 1, fill: color, stroke: "none", sw: 0 });
        const ans = seq[shown];
        // 화살표·T자는 좌우 대칭이라 뒤집으면 정답과 같아질 수 있어 바로 앞 단계 모양으로 대신한다
        const sym = type === "arrow" || type === "tshape";
        const opts = [{ rot: ans }, { rot: ans + step }, { rot: ans - step * 2 }, sym ? { rot: ans - step } : { rot: ans, sx: -1 }];
        choices = r.shuffle(opts.map((o, i) => ({ e: o, ok: i === 0 })));
      }
      let s = "";
      for (let i = 0; i < shown; i++) s += drawE(seq[i], 4 + cellW * i + cellW / 2, h / 2, esz);
      const qx = 4 + cellW * shown;
      s += box(qx + 1, h / 2 - 9, cellW - 2, 18, { stroke: ctx.accent, sw: 0.7, dash: "1.5 1", rx: 3 }) + text(qx + cellW / 2, h / 2, "?", 8, { fill: ctx.accent });
      const x0 = Math.max(qx + cellW + 8, 112);
      s += divider(x0 - 4, h);
      const cw = (W - x0) / 4;
      const answer = [];
      choices.forEach((c, i) => {
        s += hit(i, x0 + cw * i + 1, 3, cw - 2, h - 6, drawE(c.e, x0 + cw * i + cw / 2, h / 2, esz));
        if (c.ok) answer.push(i);
      });
      items.push({ svg: svg(W, h, s), mode: "one", answer });
    }
    return { instr: ctx.kid ? "규칙을 찾아 ? 에 들어갈 것을 오른쪽에서 골라 ○ 하세요." : level === 3 ? "모양이 도는 규칙을 찾아 ? 에 올 모양을 고르세요." : "반복 규칙을 찾아 ? 에 들어갈 것을 오른쪽에서 고르세요.", items };
  }

  // ---------- B. 두 줄 비교하기 ----------
  function B_rows(ctx) {
    const { r, level, kid } = ctx;
    const n = [0, 3, 5, 6][level], rowsN = 7, h = 24;
    const items = [];
    let s = "";
    const answer = [];
    const half = (W - 14) / 2, cw = Math.min(16, (half - 6) / n);
    const glyphSets = [["b", "d", "p", "q"], ["가", "거", "고", "구"], ["6", "9", "8", "3"], ["E", "F", "B", "P"], ["m", "n", "u", "w"]];
    const gset = r.pick(glyphSets);
    const diffRows = r.sample([...Array(rowsN).keys()], r.int(2, 4)); // 다른 줄은 2~4개
    for (let k = 0; k < rowsN; k++) {
      let L, draw;
      if (kid || level < 3) {
        const els = kid ? pool(ctx, 6) : r.sample(["circle", "square", "triangle", "star", "heart", "diamond", "cross", "hexagon", "pentagon"], 6);
        const colors = VP.PALETTE[ctx.theme].fills;
        L = [...Array(n)].map(() => r.int(0, 5));
        const col = L.map(() => r.int(0, colors.length - 1));
        draw = (arr, x0, y) => arr.map((e, i) => kid ? icon(els[e % 6].hex, x0 + cw * i + cw / 2, y, cw * 0.82) : shape(els[e % 6], x0 + cw * i + cw / 2, y, cw * 0.36, { fill: colors[col[i] % colors.length], stroke: "none", sw: 0 })).join("");
      } else {
        L = [...Array(n)].map(() => r.int(0, gset.length - 1));
        draw = (arr, x0, y) => arr.map((e, i) => text(x0 + cw * i + cw / 2, y, gset[e % gset.length], 9, { fill: "#222", weight: 400, font: "Arial, 'Malgun Gothic', sans-serif" })).join("");
      }
      const mod = kid || level < 3 ? 6 : gset.length;
      let R = L.slice();
      if (diffRows.includes(k)) {
        if (r.chance(0.5) && n > 2) { const i = r.int(0, n - 2); [R[i], R[i + 1]] = [R[i + 1], R[i]]; }
        if (R.join() === L.join()) { const i = r.int(0, n - 1); R[i] = (R[i] + 1 + r.int(0, mod - 2)) % mod; }
      }
      const y = k * h + h / 2;
      s += `<text x="2" y="${f1(y)}" font-size="4" dominant-baseline="central" fill="#999" font-family="'Malgun Gothic'">${k + 1}</text>`;
      s += box(8, y - h / 2 + 2, half - 2, h - 4, { stroke: "#ced4da", rx: 2 }) + draw(L, 10, y);
      const rx = 8 + half + 6;
      const isDiff = R.join() !== L.join();
      s += hit("r" + k, rx, y - h / 2 + 2, half - 2, h - 4, box(rx, y - h / 2 + 2, half - 2, h - 4, { stroke: "#ced4da", rx: 2 }) + draw(R, rx + 2, y));
      if (isDiff) answer.push("r" + k);
    }
    items.push({ svg: svg(W, rowsN * h, s), mode: "all", answer });
    return { instr: ctx.kid ? "왼쪽과 오른쪽을 비교해서, 다른 줄의 오른쪽에 ○ 하세요." : "줄마다 왼쪽과 오른쪽을 비교해 하나라도 다른 줄의 오른쪽에 ○ 표시하세요.", items };
  }

  // ---------- D. 같은 것끼리 짝 잇기 ----------
  function D_pair(ctx) {
    const { r, level } = ctx;
    const n = 5, h = 200;
    const ics = pool(ctx, n);
    const perm = r.shuffle([...Array(n).keys()]);
    const ys = (k) => (h / (n + 1)) * (k + 1);
    let s = "";
    for (let i = 0; i < n; i++) {
      s += icon(ics[i].hex, 17, ys(i), 24) + `<circle cx="34" cy="${f1(ys(i))}" r="1.6" fill="#333"/>`;
    }
    // 오른쪽: 같은 그림을 크기·방향·선화로 바꿔 섞어 놓음
    for (let j = 0; j < n; j++) {
      const i = perm.indexOf(j);
      const sz = level === 1 ? r.range(16, 30) : r.range(18, 28);
      const rot = level === 1 ? 0 : r.int(-150, 150);
      const line = level === 3 ? r.chance(0.6) : false;
      s += `<circle cx="146" cy="${f1(ys(j))}" r="1.6" fill="#333"/>`;
      s += hit("e" + j, 150, ys(j) - 16, 30, 32, icon(ics[i].hex, 165, ys(j), sz, { rot, line }));
    }
    const answer = [...Array(n).keys()].map((i) => perm[i]);
    return { instr: ctx.kid ? "왼쪽 그림과 같은 그림을 오른쪽에서 찾아 점과 점을 선으로 이어요." : "크기·방향·색이 달라도 같은 물건끼리 점을 선으로 이으세요.", items: [{ svg: svg(W, h, s), mode: "track", answer }] };
  }

  // ---------- F. 원 조각 맞추기 ----------
  function sectorD(cx, cy, R, a0, a1) {
    const rad = (a) => ((a - 90) * Math.PI) / 180;
    const p = (a) => [cx + R * Math.cos(rad(a)), cy + R * Math.sin(rad(a))];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M${f1(cx)} ${f1(cy)}L${f1(x0)} ${f1(y0)}A${R} ${R} 0 ${large} 1 ${f1(x1)} ${f1(y1)}Z`;
  }
  function F_pie(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    const color = kid ? r.pick(["#4c6ef5", "#f76707", "#2f9e44", "#e64980"]) : "#1f3a93";
    const h = 44, R = 16;
    for (let k = 0; k < 4; k++) {
      const unit = level === 1 ? 90 : 45;
      const span = level === 1 ? 90 : unit * r.int(1, 3);
      const a0 = level === 1 ? r.pick([0, 90, 180, 270]) : unit * r.int(0, 7);
      const piece = (a, sp, cx, cy) => {
        const mid = ((a + sp / 2 - 90) * Math.PI) / 180;
        const off = R * 0.38;
        return `<path d="${sectorD(cx - Math.cos(mid) * off, cy - Math.sin(mid) * off, R, a, a + sp)}" fill="${color}" filter="url(#vpShadow)"/><path d="${sectorD(cx - Math.cos(mid) * off, cy - Math.sin(mid) * off, R, a, a + sp)}" fill="url(#vpGloss)"/>`;
      };
      let s = box(1, 1, 44, h - 2, { fill: "#fff", stroke: ctx.accent, sw: 0.6 });
      s += `<path d="${sectorD(23, h / 2, R, a0 + span, a0 + 360)}" fill="${color}" filter="url(#vpShadow)"/><path d="${sectorD(23, h / 2, R, a0 + span, a0 + 360)}" fill="url(#vpGloss)"/>`;
      s += `<path d="${sectorD(23, h / 2, R, a0, a0 + span)}" fill="none" stroke="#adb5bd" stroke-width="0.5" stroke-dasharray="1.2 1"/>`;
      const wrong = [];
      const seen = new Set([a0 + "," + span]);
      const cand = level === 1
        ? [[a0, 180], [a0 + 90, 90], [a0, 45], [a0 + 180, 90], [a0 - 90, 90]]
        : [[a0 + unit, span], [a0 - unit, span], [a0, span + unit], [a0, Math.max(unit, span - unit)], [a0 + 180, span], [a0 + unit, span + unit]];
      for (const c of r.shuffle(cand)) { const key = (((c[0] % 360) + 360) % 360) + "," + c[1]; if (!seen.has(key) && wrong.length < 3) { seen.add(key); wrong.push(c); } }
      const choices = r.shuffle([[a0, span, true]].concat(wrong.map((w) => [w[0], w[1], false])));
      const L = rowLayout(4, 46, h);
      s += divider(L.x0 - 4, h);
      const answer = [];
      choices.forEach((c, i) => { s += hit(i, L.cx(i) - 17, 4, 34, h - 8, piece(c[0], c[1], L.cx(i), h / 2)); if (c[2]) answer.push(i); });
      items.push({ svg: svg(W, h, s), mode: "one", answer });
    }
    return { instr: ctx.kid ? "동그라미에서 빠진 조각을 오른쪽에서 찾아 ○ 하세요. (모양과 방향이 꼭 맞아야 해요)" : "원에서 빠진 조각과 크기·방향이 정확히 맞는 조각을 고르세요.", items };
  }

  // ---------- B. 크기·길이 비교 (사용자 제공 '크기, 길이, 무게, 양' 활동지의 형식 참고) ----------
  function B_size(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    const n = level === 1 ? 4 : 5, h = 40;
    // 단계가 오를수록 크기 차이가 작아진다 (1단계 약 35%, 2단계 18%, 3단계 9%)
    const gap = [0, 0.35, 0.18, 0.09][level];
    const qs = [];
    for (let k = 0; k < 5; k++) qs.push(r.pick(level === 1 ? ["big", "small", "long", "short"] : ["big", "small", "long", "short", "tall"]));
    const LABEL = { big: "가장 큰 것", small: "가장 작은 것", long: "가장 긴 것", short: "가장 짧은 것", tall: "키가 가장 큰 것" };
    const colors = VP.PALETTE[ctx.theme].fills;
    for (const q of qs) {
      const scales = [];
      let s0 = 1;
      for (let i = 0; i < n; i++) { scales.push(s0); s0 *= 1 - gap * r.range(0.9, 1.15); }
      const order = r.shuffle(scales.map((v, i) => i));
      const want = q === "big" || q === "long" || q === "tall" ? 0 : n - 1; // 0 = 가장 큼
      const L = rowLayout(n, 40, h);
      let s = box(1, 4, 38, h - 8, { fill: ctx.tint, stroke: ctx.accent, sw: 0.6 }) + text(20, h / 2, LABEL[q], q === "tall" ? 4.4 : kid ? 5.4 : 5, { fill: ctx.accent });
      s += divider(L.x0 - 4, h);
      const answer = [];
      const ic = pool(ctx, 1)[0];
      const col = r.pick(colors);
      order.forEach((si, i) => {
        const sc = scales[si], cx = L.cx(i);
        let inner;
        if (q === "long" || q === "short") {
          // 길이: 같은 굵기의 막대(연필 모양)를 길이만 다르게
          const len = (L.cw - 4) * sc, x0 = cx - len / 2, y0 = h / 2 - 2.6;
          inner = `<g filter="url(#vpShadow)"><rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(len - 4)}" height="5.2" rx="1" fill="${col}"/><path d="M${f1(x0 + len - 4)} ${f1(y0)}l4 2.6l-4 2.6z" fill="#f1c27d"/><rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(len - 4)}" height="5.2" rx="1" fill="url(#vpGloss)"/></g>`;
        } else if (q === "tall") {
          // 키: 아래를 맞춘 기둥 높이 비교
          const hh = (h - 10) * sc, y1 = h - 5;
          inner = `<g filter="url(#vpShadow)"><rect x="${f1(cx - 4)}" y="${f1(y1 - hh)}" width="8" height="${f1(hh)}" rx="1.5" fill="${col}"/><rect x="${f1(cx - 4)}" y="${f1(y1 - hh)}" width="8" height="${f1(hh)}" rx="1.5" fill="url(#vpGloss)"/></g>`;
        } else {
          // 크기: 같은 그림을 크기만 다르게 (3단계는 조금씩 기울여 판단을 어렵게)
          inner = icon(ic.hex, cx, h / 2, Math.min(L.cw - 3, h - 6) * sc, { rot: level === 3 ? r.int(-25, 25) : 0 });
        }
        s += hit(i, cx - L.cw / 2 + 1, 2, L.cw - 2, h - 4, inner);
        if (si === want) answer.push(i);
      });
      items.push({ svg: svg(W, h, s), mode: "one", answer });
    }
    return { instr: kid ? "왼쪽에 적힌 것을 오른쪽에서 찾아 ○ 하세요." : "줄마다 왼쪽 조건에 맞는 것을 하나 골라 ○ 표시하세요. 차이가 작으니 꼼꼼히 비교하세요.", items };
  }

  // =====================================================================
  // 추가 활동 3 (2026-10-06): ① 생활·글자 ② 공간·기억 ③ 그림 인식 ④ 손 쓰기 + 칠교
  // =====================================================================

  // ---------- 한글 음절 바꾸기 (비슷한 방해 글자 만들기) ----------
  const SIM_VOWEL = { 0: [4, 8, 2], 4: [0, 13, 6], 8: [13, 0, 12], 13: [8, 4, 17], 20: [18, 13, 8], 18: [20, 13], 1: [5, 0], 5: [1, 4], 2: [6, 0], 6: [2, 4], 12: [17, 8], 17: [12, 13] };
  const SIM_CHO = { 0: [15, 3, 1], 15: [0, 3], 3: [16, 0, 2], 16: [3, 0], 7: [17, 9], 17: [7, 9], 12: [14, 9], 14: [12, 9], 11: [18, 2], 18: [11, 12], 2: [5, 3], 5: [2, 3], 9: [12, 14], 6: [7, 9] };
  function koMutate(r, word) {
    const chars = [...word];
    for (let t = 0; t < 30; t++) {
      const i = r.int(0, chars.length - 1), code = chars[i].charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) continue;
      let cho = Math.floor(code / 588), jung = Math.floor((code % 588) / 28), jong = code % 28;
      const k = r.int(0, 2);
      if (k === 0 && SIM_VOWEL[jung]) jung = r.pick(SIM_VOWEL[jung]);
      else if (k === 1 && SIM_CHO[cho]) cho = r.pick(SIM_CHO[cho]);
      else jong = jong ? 0 : r.pick([4, 8, 16, 21]);
      const c = String.fromCharCode(0xac00 + cho * 588 + jung * 28 + jong);
      if (c !== chars[i]) { const o = chars.slice(); o[i] = c; return o.join(""); }
    }
    return word + "";
  }
  const KO_WORDS2 = ["사과", "학교", "버스", "우유", "가방", "연필", "시계", "의자", "병원", "은행", "기차", "바다", "나무", "모자", "양말", "우산", "포도", "거울", "숟가락", "치약"];
  const KO_WORDS3 = ["도서관", "편의점", "지하철", "냉장고", "운동화", "컴퓨터", "휴대폰", "선생님", "햄버거", "초콜릿", "놀이터", "자전거", "텔레비전", "아이스크림", "소방차"];
  const FONT_STYLES = [
    { f: "'Malgun Gothic', sans-serif", w: 400 }, { f: "'Malgun Gothic', sans-serif", w: 900 },
    { f: "Batang, 'Noto Serif KR', serif", w: 400 }, { f: "Gungsuh, 'Noto Serif KR', serif", w: 700 },
    { f: "Gulim, 'Noto Sans KR', sans-serif", w: 400 }, { f: "'Malgun Gothic', sans-serif", w: 700, skew: -14 },
    { f: "'Malgun Gothic', sans-serif", w: 900, outline: true },
  ];
  function styledText(x, y, s, size, st, color) {
    const fill = st.outline ? "none" : color;
    const stroke = st.outline ? ` stroke="${color}" stroke-width="${f1(size * 0.05)}"` : "";
    const t = `<text x="${f1(x)}" y="${f1(y)}" font-size="${f1(size)}" text-anchor="middle" dominant-baseline="central" font-family="${st.f.replace(/"/g, "'")}" font-weight="${st.w}" fill="${fill}"${stroke}>${s}</text>`;
    return st.skew ? `<g transform="translate(${f1(x)} ${f1(y)}) skewX(${st.skew}) translate(${f1(-x)} ${f1(-y)})">${t}</g>` : t;
  }

  // ---------- ① D. 글꼴이 달라도 같은 글자·단어 ----------
  function D_font(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    const colors = VP.PALETTE[ctx.theme].fills.concat(["#212529"]);
    for (let k = 0; k < 5; k++) {
      let target, dists;
      if (kid && level === 1) { target = String(r.int(1, 9)); dists = r.sample("0123456789".split("").filter((d) => d !== target), 4); }
      else if (kid && level === 2) {
        const cons = "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ".split(""), simC = { ㄱ: "ㅋㄴ", ㅋ: "ㄱㅌ", ㄷ: "ㅌㄹ", ㅌ: "ㄷㅋ", ㅂ: "ㅍㅁ", ㅍ: "ㅂㅁ", ㅈ: "ㅊㅅ", ㅊ: "ㅈㅅ", ㅇ: "ㅎㅁ", ㅎ: "ㅇㅊ", ㄴ: "ㄱㄷ", ㄹ: "ㄷㅌ", ㅁ: "ㅂㅇ", ㅅ: "ㅈㅊ" };
        target = r.pick(cons); dists = r.shuffle([...simC[target]].concat(r.sample(cons.filter((c) => c !== target), 2)));
      } else {
        const base = kid ? r.pick(["가", "나", "다", "마", "바", "사", "아", "자", "하", "고", "누", "도"]) : level === 1 ? r.pick(["가", "너", "도", "류", "미", "보", "수", "어", "주", "카", "티", "효"]) : level === 2 ? r.pick(KO_WORDS2) : r.pick(KO_WORDS3);
        target = base;
        const set = new Set();
        for (let t = 0; t < 40 && set.size < 4; t++) { const m = koMutate(r, base); if (m !== base) set.add(m); }
        dists = [...set];
        if (!dists.length) dists = r.sample(KO_WORDS2.filter((w) => w !== base), 3);
      }
      const nc = 6, nt = r.int(2, 3);
      const list = r.shuffle([...Array(nt).fill(target), ...[...Array(nc - nt)].map((_, i) => dists[i % dists.length])]);
      const L = rowLayout(nc, 38, 36);
      const size = target.length >= 3 ? 7 : target.length === 2 ? 9 : /[ㄱ-ㅎ]/.test(target) ? 17 : 13;
      let s = sampleBox(ctx, 38, 36) + styledText(19, 18, target, size * 1.05, FONT_STYLES[0], "#212529") + divider(L.x0 - 4, 36);
      const answer = [];
      list.forEach((t, i) => {
        // 자음 낱자는 바탕·궁서 글꼴에서 아주 작게 나와 맑은 고딕 계열만 쓴다
        const pool2 = /[ㄱ-ㅎ]/.test(target) ? [FONT_STYLES[0], FONT_STYLES[1], FONT_STYLES[5], FONT_STYLES[6]] : FONT_STYLES.slice(level === 1 ? 0 : 1);
        const st = r.pick(pool2);
        const sz = size * r.range(level === 1 ? 0.85 : 0.7, 1.15);
        s += hit(i, L.cx(i) - L.cw / 2 + 1, 3, L.cw - 2, 30, styledText(L.cx(i), 18, t, Math.min(sz, (L.cw - 2) / Math.max(1, t.length) * 1.05), st, r.pick(colors)));
        if (t === target) answer.push(i);
      });
      items.push({ svg: svg(W, 36, s), mode: "all", answer });
    }
    return { instr: kid ? "글씨 모양이나 색이 달라도 왼쪽과 같은 글자를 모두 찾아 ○ 하세요." : "글꼴·크기·색이 달라도 왼쪽과 같은 글자(단어)를 모두 찾아 ○ 표시하세요. 비슷한 글자에 주의하세요.", items };
  }

  // ---------- ① A. 장보기 목록 찾기(유아) · 메뉴판 정보 찾기(청소년) ----------
  function A_shop(ctx) {
    const { r, level, kid } = ctx;
    if (kid) {
      const nList = level === 1 ? 2 : 3;
      const list = pool(ctx, nList, { cat: undefined });
      const rowsN = [0, 3, 4, 5][level], cols = [0, 6, 7, 8][level], cs = W / cols, rh = [0, 34, 30, 26][level];
      const others = level === 3 ? similar(ctx, list[0], 6, list.map((x) => x.hex)) : pool(ctx, 6, { not: list.map((x) => x.hex) });
      const band = 30;
      let s = box(0, 0, W, band - 4, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 }) + text(26, 13, "장보기 목록", 5.2, { fill: ctx.accent });
      list.forEach((ic, i) => (s += box(56 + i * 30, 2, 26, 22, { fill: "#fff", stroke: "#ced4da", rx: 2 }) + icon(ic.hex, 69 + i * 30, 13, 18)));
      const n = rowsN * cols, cells = [];
      list.forEach((ic) => { for (let t = 0; t < r.int(1, 2); t++) cells.push(ic); });
      while (cells.length < n) cells.push(r.pick(others));
      const order = r.shuffle(cells), answer = [];
      for (let y = 0; y < rowsN; y++) {
        const yy = band + 4 + y * rh;
        s += `<rect x="0" y="${f1(yy + rh - 4)}" width="${W}" height="3" rx="1" fill="#c8a27a"/>`; // 선반
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x, ic = order[i], X = cs * x + cs / 2;
          s += hit(i, X - cs / 2 + 1, yy, cs - 2, rh - 4, icon(ic.hex, X, yy + (rh - 4) / 2, Math.min(cs, rh - 4) * 0.82));
          if (list.includes(ic)) answer.push(i);
        }
      }
      return { instr: "장보기 목록에 있는 물건을 선반에서 모두 찾아 ○ 하세요.", items: [{ svg: svg(W, band + 4 + rowsN * rh, s), mode: "all", answer }] };
    }
    // 청소년: 메뉴판에서 가격 조건에 맞는 것 찾기
    const foods = ctx.icons.filter((i) => i.cat === "음식" && !["1F944", "1F374"].includes(i.hex));
    const menu = r.sample(foods, 12);
    const prices = level === 1 ? [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000] : [2500, 2050, 5200, 2550, 3500, 3050, 5300, 2500, 4500, 4050];
    let target, cond;
    const price = [];
    if (level < 3) {
      target = level === 1 ? r.pick(prices) : 2500;
      const idx = r.sample([...Array(12).keys()], 3);
      for (let i = 0; i < 12; i++) price.push(idx.includes(i) ? target : r.pick(prices.filter((p) => p !== target)));
      cond = (p) => p === target;
    } else {
      const lim = r.pick([3000, 4000]);
      for (let i = 0; i < 12; i++) price.push(r.pick([1800, 2500, 2900, 3000, 3100, 3500, 3900, 4000, 4200, 5000]));
      cond = (p) => p <= lim; target = lim;
    }
    const won = (p) => p.toLocaleString("ko-KR") + "원";
    const cols = 3, cw = W / cols, ch = 34, band = 14;
    let s = `<rect x="0" y="0" width="${W}" height="${band + 4 * ch + 4}" rx="4" fill="#2b2118"/>` + text(W / 2, 7.5, "MENU · 오늘의 메뉴", 5.5, { fill: "#ffe8a3" });
    const answer = [];
    menu.forEach((ic, i) => {
      const x = cw * (i % cols), y = band + ch * Math.floor(i / cols);
      const inner = `<rect x="${f1(x + 2)}" y="${f1(y + 2)}" width="${f1(cw - 4)}" height="${ch - 4}" rx="3" fill="#3a2d22"/>` + icon(ic.hex, x + 15, y + ch / 2, 22) + text(x + 30, y + 11, ic.name, ic.name.length > 5 ? 3.6 : 4.4, { anchor: "start", fill: "#fff" }) + text(x + 30, y + 22, won(price[i]), 5.2, { anchor: "start", fill: "#ffd43b" });
      s += hit(i, x + 2, y + 2, cw - 4, ch - 4, inner);
      if (cond(price[i])) answer.push(i);
    });
    const q = level < 3 ? `${won(target)}인 메뉴를 모두 찾아 ○ 표시하세요.${level === 2 ? " (2,050원·2,550원과 헷갈리지 않게)" : ""}` : `${won(target)} 이하로 살 수 있는 메뉴를 모두 찾아 ○ 표시하세요.`;
    return { instr: "메뉴판을 훑어보며 " + q, items: [{ svg: svg(W, band + 4 * ch + 4, s), mode: "all", answer }] };
  }

  // ---------- ① E. 지도 길 찾기 ----------
  function E_map(ctx) {
    const { r, level, kid } = ctx;
    const n = [0, 4, 5, 5][level], cs = [0, 19, 16, 16][level];
    const items = [];
    const DIR = [[0, -1, "위", 270], [1, 0, "오른쪽", 0], [0, 1, "아래", 90], [-1, 0, "왼쪽", 180]];
    for (let k = 0; k < 2; k++) {
      let start, cmds, end;
      for (let t = 0; t < 300; t++) {
        start = [r.int(0, n - 1), r.int(0, n - 1)];
        let p = start.slice(), face = 0;
        cmds = [];
        const steps = [0, 2, 3, 4][level];
        let ok = true;
        for (let s2 = 0; s2 < steps; s2++) {
          if (level === 3) {
            // 3단계: 내가 바라보는 방향 기준으로 돌기(왼쪽·오른쪽)
            if (s2 > 0) { const turn = r.pick([1, 3]); face = (face + turn) % 4; cmds.push({ turn: turn === 1 ? "오른쪽으로 돌기" : "왼쪽으로 돌기" }); }
            const d = DIR[face], len = r.int(1, 2);
            p = [p[0] + d[0] * len, p[1] + d[1] * len];
            cmds.push({ fwd: len });
          } else {
            const d = r.pick(DIR), len = r.int(1, level === 1 ? 2 : 3);
            p = [p[0] + d[0] * len, p[1] + d[1] * len];
            cmds.push({ dir: d, len });
          }
          if (p[0] < 0 || p[1] < 0 || p[0] >= n || p[1] >= n) { ok = false; break; }
        }
        if (ok && (p[0] !== start[0] || p[1] !== start[1])) { end = p; break; }
      }
      const ics = pool(ctx, 6);
      const land = {};
      land[end.join()] = ics[0];
      const free = [];
      for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) if (!(x === start[0] && y === start[1]) && !(x === end[0] && y === end[1])) free.push([x, y]);
      r.sample(free, 5).forEach((c, i) => (land[c.join()] = ics[i + 1]));
      const ox = 4, oy = 4, mapW = n * cs, h = Math.max(mapW + 8, 16 + cmds.length * (level === 3 ? 9 : 11) + 34);
      let s = `<rect x="${ox}" y="${oy}" width="${mapW}" height="${mapW}" rx="2" fill="#d3f9d8"/>`;
      for (let i = 0; i <= n; i++) {
        s += `<line x1="${f1(ox + i * cs)}" y1="${oy}" x2="${f1(ox + i * cs)}" y2="${f1(oy + mapW)}" stroke="#adb5bd" stroke-width="0.4"/><line x1="${ox}" y1="${f1(oy + i * cs)}" x2="${f1(ox + mapW)}" y2="${f1(oy + i * cs)}" stroke="#adb5bd" stroke-width="0.4"/>`;
      }
      for (const key in land) { const [x, y] = key.split(",").map(Number); s += icon(land[key].hex, ox + x * cs + cs / 2, oy + y * cs + cs / 2, cs * 0.78); }
      const sx = ox + start[0] * cs + cs / 2, sy = oy + start[1] * cs + cs / 2;
      s += `<circle cx="${f1(sx)}" cy="${f1(sy)}" r="${f1(cs * 0.36)}" fill="#e03131"/>` + (level === 3 ? shape("arrow", sx, sy, cs * 0.26, { rot: 270, fill: "#fff", stroke: "none", sw: 0, flat: true }) : text(sx, sy, "출발", cs * 0.2, { fill: "#fff" }));
      // 명령 목록
      const cx0 = ox + mapW + 8;
      s += text(cx0, 8, level === 3 ? "출발(빨간 화살표 방향을 보고 있어요)" : "출발에서", 4, { anchor: "start", fill: "#495057" });
      cmds.forEach((c, i) => {
        const y = 16 + i * (level === 3 ? 9 : 11);
        let label;
        if (c.dir) { label = `${c.dir[2]}으로 ${c.len}칸`.replace("위으로", "위로").replace("아래으로", "아래로"); s += shape("arrow", cx0 + 4, y, 3.2, { rot: c.dir[3], fill: ctx.accent, stroke: "none", sw: 0 }); }
        else if (c.turn) label = "↻ " + c.turn;
        else label = `앞으로 ${c.fwd}칸`;
        s += text(cx0 + (c.dir ? 10 : 2), y, `${i + 1}. ${label}`, 4.4, { anchor: "start", fill: "#212529" });
      });
      // 선택지
      const choices = r.shuffle([ics[0]].concat(r.sample(ics.slice(1), 3)));
      const chY = h - 18, cw = (W - cx0) / 4;
      s += text(cx0, chY - 13, "도착한 곳은?", 4.4, { anchor: "start", fill: ctx.accent });
      const answer = [];
      choices.forEach((c, i) => { s += hit(i, cx0 + cw * i, chY - 9, cw - 2, 20, box(cx0 + cw * i, chY - 9, cw - 2, 20, { stroke: "#ced4da", rx: 2 }) + icon(c.hex, cx0 + cw * i + cw / 2 - 1, chY + 1, 15)); if (c === ics[0]) answer.push(i); });
      items.push({ svg: svg(W, h, s), mode: "one", answer });
    }
    return { instr: kid ? "빨간 출발점에서 순서대로 칸을 옮겨 가 보세요. 도착한 곳의 그림을 찾아 ○ 하세요." : level === 3 ? "빨간 화살표 방향을 보고 출발해, 명령대로 걷고 돌아 보세요. 도착한 곳을 고르세요." : "출발점에서 명령 순서대로 칸을 옮겨 도착한 곳의 그림을 고르세요.", items };
  }

  // ---------- ② E. 쌓기나무 ----------
  function isoCubes(hm, ox, oy, a, color) {
    // hm[x][y] = 높이. 뒤(작은 x+y)부터 그린다
    const nx = hm.length, ny = hm[0].length;
    const P = (x, y, z) => [ox + (x - y) * a * 0.87, oy + (x + y) * a * 0.5 - z * a];
    let s = "";
    const cubes = [];
    for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) for (let z = 0; z < hm[x][y]; z++) cubes.push([x, y, z]);
    cubes.sort((p, q) => p[0] + p[1] - (q[0] + q[1]) || p[2] - q[2]);
    const poly = (pts, fill) => `<path d="M${pts.map((p) => f1(p[0]) + " " + f1(p[1])).join("L")}Z" fill="${fill}" stroke="#343a40" stroke-width="0.35" stroke-linejoin="round"/>`;
    for (const [x, y, z] of cubes) {
      const top = [P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)];
      const left = [P(x, y + 1, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x, y + 1, z)];
      const right = [P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x + 1, y + 1, z), P(x + 1, y, z)];
      s += poly(top, color[0]) + poly(left, color[1]) + poly(right, color[2]);
    }
    return s;
  }
  function E_cubes(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    const col = kid ? ["#ffd43b", "#fab005", "#e67700"] : ["#a5d8ff", "#4dabf7", "#1971c2"];
    const nRows = level === 3 ? 3 : 4;
    for (let k = 0; k < nRows; k++) {
      const nx = level === 1 ? 2 : 3, ny = level === 1 ? 2 : 3, maxH = level === 1 ? 2 : 3;
      // 뒤쪽이 앞쪽보다 낮지 않게 → 모든 기둥의 윗면이 보여 개수를 셀 수 있다
      // 뒤 기둥이 앞 기둥보다 낮지 않게(계단식) → 모든 기둥의 윗면이 보여 셀 수 있다
      const [lo0, hi0] = [null, [3, 6], [5, 10], [4, 12]][level];
      let hm, total;
      for (let t = 0; t < 400; t++) {
        hm = [...Array(nx)].map(() => Array(ny).fill(0));
        for (let x = nx - 1; x >= 0; x--) for (let y = ny - 1; y >= 0; y--) {
          const lo = Math.max(x + 1 < nx ? hm[x + 1][y] : 0, y + 1 < ny ? hm[x][y + 1] : 0);
          hm[x][y] = Math.min(maxH, lo + (r.chance(0.55) ? 1 : 0));
        }
        total = hm.flat().reduce((a, b) => a + b, 0);
        if (total >= lo0 && total <= hi0) break;
      }
      const h = level === 3 ? 62 : 50, a = level === 3 ? 8.5 : 8;
      let s = box(1, 1, 64, h - 2, { fill: ctx.tint, stroke: ctx.accent, sw: 0.6 }) + isoCubes(hm, 33, h / 2 - (maxH * a) / 2 + 4 - (nx + ny) * a * 0.12, a, col);
      s += divider(70, h);
      const answer = [];
      if (level < 3) {
        const opts = r.shuffle([total, total + 1, Math.max(1, total - 1), total + 2].filter((v, i, arr) => arr.indexOf(v) === i)).slice(0, 4);
        const cw = (W - 74) / opts.length;
        opts.forEach((v, i) => { s += hit(i, 74 + cw * i + 2, 8, cw - 4, h - 16, box(74 + cw * i + 2, 8, cw - 4, h - 16, { stroke: "#ced4da", rx: 3 }) + text(74 + cw * i + cw / 2, h / 2, v + "개", 9, { fill: "#212529" })); if (v === total) answer.push(i); });
      } else {
        // 3단계: 위에서 본 모양 고르기
        const top = hm.map((col2) => col2.map((v) => (v > 0 ? 1 : 0)));
        const variants = [top];
        for (let t = 0; t < 50 && variants.length < 4; t++) {
          const v = top.map((c) => c.slice());
          const x = r.int(0, nx - 1), y = r.int(0, ny - 1);
          v[x][y] = 1 - v[x][y];
          if (!variants.some((u) => u.flat().join() === v.flat().join()) && v.flat().some((q) => q)) variants.push(v);
        }
        const opts = r.shuffle(variants);
        const cw = (W - 74) / 4, g = 8;
        opts.forEach((v, i) => {
          let inner = "";
                    // 그림과 같은 방향(비스듬한 마름모 판)으로 위에서 본 모양
          const cx = 74 + cw * i + cw / 2, cy = h / 2 - (nx + ny - 2) * g * 0.36;
          for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) {
            const px = cx + (x - y) * g * 0.72, py = cy + (x + y) * g * 0.72;
            inner += `<path d="M${f1(px)} ${f1(py - g * 0.72)}L${f1(px + g * 0.72)} ${f1(py)}L${f1(px)} ${f1(py + g * 0.72)}L${f1(px - g * 0.72)} ${f1(py)}Z" fill="${v[x][y] ? col[0] : "#fff"}" stroke="#868e96" stroke-width="0.3"/>`;
          }
          s += hit(i, 74 + cw * i + 2, 6, cw - 4, h - 12, inner);
          if (v === top) answer.push(i);
        });
      }
      items.push({ svg: svg(W, h, s), mode: "one", answer });
    }
    return { instr: level === 3 ? (kid ? "쌓기나무를 위에서 내려다보면 어떤 모양일까요? 골라 ○ 하세요." : "쌓기나무를 위에서 내려다본 모양을 고르세요. (보이지 않는 아래칸도 생각해요)") : kid ? "쌓기나무는 모두 몇 개일까요? 맞는 수에 ○ 하세요. (아래에 숨은 것도 세요)" : "쌓기나무의 개수를 세어 고르세요. 아래에 받치고 있는 나무도 셉니다.", items };
  }

  // ---------- ② G. 순서 기억 (Corsi 블록 형식) ----------
  function G_corsi(ctx) {
    const { r, level } = ctx;
    const n = level === 1 ? 3 : 4, len = [0, 3, 4, 5][level] + (ctx.kid ? 0 : 1), size = 52, h = 58;
    const items = [];
    for (let k = 0; k < 3; k++) {
      const seq = r.sample([...Array(n * n).keys()], len);
      const showW = size + 8;
      let showI = gridCells(4, 3, n, size, null);
      const cs = size / n;
      seq.forEach((id, i) => { const x = 4 + (id % n) * cs, y = 3 + Math.floor(id / n) * cs; showI += `<circle cx="${f1(x + cs / 2)}" cy="${f1(y + cs / 2)}" r="${f1(cs * 0.34)}" fill="${ctx.accent}"/>` + text(x + cs / 2, y + cs / 2, i + 1, cs * 0.36, { fill: "#fff" }); });
      const ask = gridCells(8, 3, n, size, null, { hits: true });
      items.push(memRow(ctx, showW, h, showI, ask, { answer: seq.map((i) => "c" + i), sub: "order", n, showSec: len * 1.2 + 1, seq: seq.map((i) => "c" + i) }));
    }
    return { instr: ctx.kid ? "번호 순서를 잘 보고 가려요. 오른쪽 빈 칸의 같은 자리에 번호를 써 보세요." : "칸의 번호 순서를 기억한 뒤 가리고, 오른쪽 같은 자리에 순서대로 번호를 쓰세요.", items };
  }

  // ---------- ② G. 물건이 있던 자리 ----------
  function G_where(ctx) {
    const { r, level } = ctx;
    const n = level === 1 ? 3 : 4, nObj = [0, 3, 4, 6][level] + (ctx.kid ? 0 : 1), size = 52, h = 58;
    const items = [];
    for (let k = 0; k < 3; k++) {
      const objs = pool(ctx, nObj), cells = r.sample([...Array(n * n).keys()], nObj);
      const cs = size / n;
      let showI = gridCells(4, 3, n, size, null);
      objs.forEach((ic, i) => (showI += icon(ic.hex, 4 + (cells[i] % n) * cs + cs / 2, 3 + Math.floor(cells[i] / n) * cs + cs / 2, cs * 0.78)));
      const ti = r.int(0, nObj - 1);
      const ask = box(0, 12, 20, 24, { fill: "#fff", stroke: ctx.accent, sw: 0.6 }) + icon(objs[ti].hex, 10, 24, 15) + text(10, 42, "어디?", 4, { fill: ctx.accent }) + gridCells(24, 3, n, size, null, { hits: true });
      items.push(memRow(ctx, size + 8, h, showI, ask, { answer: ["c" + cells[ti]], sub: "one", showSec: 3 + nObj }));
    }
    return { instr: ctx.kid ? "그림들이 어디에 있는지 잘 보고 가려요. 오른쪽 그림이 있던 칸에 ○ 하세요." : "물건의 위치를 기억한 뒤 가리고, 오른쪽에 제시된 물건이 있던 칸에 ○ 표시하세요.", items };
  }

  // ---------- ③ B. 그림자(실루엣) 짝 찾기 ----------
  function B_sil(ctx) {
    const { r, level } = ctx;
    const items = [];
    const sil = (inner) => `<g filter="url(#vpSil)">${inner}</g>`;
    for (let k = 0; k < 5; k++) {
      const t = pool(ctx, 1, level === 3 ? { dir: true } : {})[0];
      const ds = level === 1 ? pool(ctx, 3, { not: [t.hex] }).filter((d) => d.cat !== t.cat).concat(pool(ctx, 3, { not: [t.hex] })).slice(0, 3) : similar(ctx, t, 3);
      const toSil = k % 2 === 0; // 그림 → 그림자 / 그림자 → 그림 번갈아
      let opts = [{ ic: t, ok: true }].concat(ds.map((d) => ({ ic: d })));
      if (level === 3) opts = [{ ic: t, ok: true }, { ic: t, flip: true }].concat(ds.slice(0, 2).map((d) => ({ ic: d })));
      opts = r.shuffle(opts);
      const L = rowLayout(4, 42, 42);
      const sIn = icon(t.hex, 21, 21, 30);
      let s = sampleBox(ctx, 42, 42) + (toSil ? sIn : sil(sIn)) + divider(L.x0 - 4, 42);
      const answer = [];
      opts.forEach((o, i) => {
        const inner = icon(o.ic.hex, L.cx(i), 21, 28, { flip: o.flip });
        s += hit(i, L.cx(i) - 16, 5, 32, 32, toSil ? sil(inner) : inner);
        if (o.ok) answer.push(i);
      });
      items.push({ svg: svg(W, 42, s), mode: "one", answer });
    }
    return { instr: ctx.kid ? "왼쪽 그림과 그림자가 짝이 되는 것을 찾아 ○ 하세요." : level === 3 ? "왼쪽과 짝이 되는 그림자(또는 그림)를 고르세요. 좌우가 뒤집힌 것은 짝이 아닙니다." : "왼쪽과 짝이 되는 그림자(또는 그림)를 찾아 ○ 표시하세요.", items };
  }

  // ---------- ③ F. 반쪽 그림 완성 ----------
  function F_half(ctx) {
    const { r, level } = ctx;
    const items = [];
    const vertical = true; // 좌우 반쪽 (위아래로 자르면 위쪽이 비어 있는 그림이 많음)
    for (let k = 0; k < 4; k++) {
      const t = pool(ctx, 1)[0];
      const ds = level === 1 ? pool(ctx, 3, { not: [t.hex] }) : similar(ctx, t, level === 3 ? 4 : 3);
      const opts = r.shuffle([t].concat(ds));
      const S = 32, h = 44;
      const half = (hex, cx, cy, which) => {
        const id = VP.uid("hf"), x0 = cx - S / 2, y0 = cy - S / 2;
        const rc = vertical ? (which === 0 ? [x0, y0, S / 2, S] : [cx, y0, S / 2, S]) : which === 0 ? [x0, y0, S, S / 2] : [x0, cy, S, S / 2];
        return `<defs><clipPath id="${id}"><rect x="${f1(rc[0])}" y="${f1(rc[1])}" width="${f1(rc[2])}" height="${f1(rc[3])}"/></clipPath></defs><g clip-path="url(#${id})">${icon(hex, cx, cy, S)}</g>`;
      };
      let s = box(1, 1, 48, h - 2, { fill: "#fff", stroke: ctx.accent, sw: 0.6 }) + half(t.hex, 25, h / 2, 0);
      s += vertical ? `<line x1="25" y1="5" x2="25" y2="${h - 5}" stroke="#adb5bd" stroke-width="0.4" stroke-dasharray="1.5 1"/>` : `<line x1="7" y1="${h / 2}" x2="43" y2="${h / 2}" stroke="#adb5bd" stroke-width="0.4" stroke-dasharray="1.5 1"/>`;
      const L = rowLayout(opts.length, 50, h);
      s += divider(L.x0 - 4, h);
      const answer = [];
      opts.forEach((o, i) => {
        // 나머지 반쪽만 보이게: 왼쪽 반 → 오른쪽 반, 위쪽 반 → 아래쪽 반
        const cx = L.cx(i) - (vertical ? S / 4 : 0), cy = h / 2 - (vertical ? 0 : S / 4);
        s += hit(i, L.cx(i) - L.cw / 2 + 1, 3, L.cw - 2, h - 6, half(o.hex, cx, cy, 1));
        if (o === t) answer.push(i);
      });
      items.push({ svg: svg(W, h, s), mode: "one", answer });
    }
    return { instr: ctx.kid ? "왼쪽 그림의 나머지 반쪽을 오른쪽에서 찾아 ○ 하세요." : "왼쪽 반쪽 그림과 이어지는 나머지 반쪽을 고르세요.", items };
  }

  // ---------- ④ H. 점선 윤곽 따라 그리기 ----------
  function outlineSvg(hex, x, y, S, color, dash, sw) {
    const o = VP.OUTLINE[hex];
    const sc = S / 72;
    return `<g transform="translate(${f1(x - S / 2)} ${f1(y - S / 2)}) scale(${f1(sc)})" fill="none" stroke="${color}" stroke-width="${f1(sw / sc)}" stroke-linecap="round" stroke-linejoin="round"${dash ? ` stroke-dasharray="${f1(dash[0] / sc)} ${f1(dash[1] / sc)}"` : ""}>${o.d.map((d) => `<path d="${d}"/>`).join("")}</g>`;
  }
  function outlinePts(hex, x, y, S) {
    const o = VP.OUTLINE[hex], sc = S / 72, pts = [];
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    for (const d of o.d) {
      p.setAttribute("d", d);
      const L = p.getTotalLength(), n = Math.max(4, Math.round(L / 3));
      for (let i = 0; i <= n; i++) { const q = p.getPointAtLength((L * i) / n); pts.push([f1(x - S / 2 + q.x * sc), f1(y - S / 2 + q.y * sc)]); }
    }
    return pts;
  }
  function H_outline(ctx) {
    const { r, level } = ctx;
    const avail = ctx.icons.filter((i) => VP.OUTLINE && VP.OUTLINE[i.hex]).sort((a, b) => VP.OUTLINE[a.hex].n - VP.OUTLINE[b.hex].n);
    const third = Math.ceil(avail.length / 3);
    const band = level === 1 ? avail.slice(0, third) : level === 2 ? avail.slice(third, third * 2) : avail.slice(third * 2);
    const items = [];
    for (let k = 0; k < 2; k++) {
      const ic = r.pick(band), h = 104, S = 92;
      let s = box(1, 2, 40, 40, { fill: ctx.tint, stroke: ctx.accent, sw: 0.6 }) + icon(ic.hex, 21, 22, 30) + text(21, 48, "보기", 4, { fill: ctx.accent });
      s += outlineSvg(ic.hex, 110, h / 2, S, "#adb5bd", [1.4, 1.3], 0.7);
      items.push({ svg: svg(W, h, s), mode: "trace", pts: outlinePts(ic.hex, 110, h / 2, S), answer: null });
    }
    return { instr: ctx.kid ? "점선을 따라 그림을 그려 보세요. 다 그리면 보기처럼 색칠해도 좋아요." : "점선을 따라 윤곽을 그리세요. 선이 끊기지 않게 천천히 이어 그리세요.", items };
  }

  // ---------- ④ H. 숫자·한글 따라 쓰기 ----------
  function glyphPts(chars, x, y, size) {
    const c = document.createElement("canvas"), k = 4; // 1mm = 4px
    const w = Math.ceil(size * chars.length * 1.1 * k), hh = Math.ceil(size * 1.3 * k);
    c.width = w; c.height = hh;
    const g = c.getContext("2d");
    g.font = `700 ${size * k}px 'Malgun Gothic', sans-serif`;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(chars, w / 2, hh / 2);
    const data = g.getImageData(0, 0, w, hh).data, pts = [];
    for (let py = 0; py < hh; py += k) for (let px = 0; px < w; px += k) if (data[(py * w + px) * 4 + 3] > 128) pts.push([f1(x - w / 2 / k + px / k), f1(y - hh / 2 / k + py / k)]);
    return pts;
  }
  function H_letters(ctx) {
    const { r, level, kid } = ctx;
    const sets = kid ? [null, "123456789".split(""), "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ".split(""), "가나다라마바사아자차카타파하".split("")]
      : [null, "ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ".split(""), "가나도로무부소우주추코투포후".split(""), KO_WORDS2.filter((w) => w.length === 2)];
    const items = [];
    const h = 46;
    for (const ch of r.sample(sets[level], 4)) {
      const size = ch.length === 2 ? 17 : 26;
      const cols = [26, 70, 114, 158];
      let s = "";
      cols.forEach((cx, i) => (s += box(cx - 21, 3, 42, h - 6, { stroke: "#ced4da", rx: 3 }) + `<line x1="${cx - 19}" y1="${h / 2}" x2="${cx + 19}" y2="${h / 2}" stroke="#f1f3f5" stroke-width="0.3"/>`));
      s += `<text x="26" y="${h / 2}" font-size="${size}" text-anchor="middle" dominant-baseline="central" font-family="'Malgun Gothic', sans-serif" font-weight="700" fill="${ctx.patColor}">${ch}</text>`;
      for (const cx of [70, 114]) s += `<text x="${cx}" y="${h / 2}" font-size="${size}" text-anchor="middle" dominant-baseline="central" font-family="'Malgun Gothic', sans-serif" font-weight="700" fill="#e9ecef" stroke="#adb5bd" stroke-width="0.35" stroke-dasharray="1 0.8">${ch}</text>`;
      items.push({ svg: svg(W, h, s), mode: "trace", pts: glyphPts(ch, 70, h / 2, size).concat(glyphPts(ch, 114, h / 2, size)), answer: null });
    }
    return { instr: kid ? "보기 글자를 보고, 흐린 글자 위를 따라 쓴 다음 마지막 칸에 혼자 써 보세요." : "보기 → 흐린 글자 두 번 따라 쓰기 → 빈칸에 혼자 쓰기 순서로 연습하세요.", items };
  }

  // ---------- ④ H. 가위질 선 (오려 보기) ----------
  function H_cut(ctx) {
    const { r, level } = ctx;
    const items = [];
    const kinds = level === 1 ? ["straight", "curve"] : level === 2 ? ["zigzag", "wave"] : ["circle", "star"];
    for (const kd of kinds) {
      const h = 100, y = h / 2;
      let d;
      if (kd === "straight") d = `M24 ${y}H170`;
      if (kd === "curve") d = VP.smoothPath([[24, y], [70, y - 22], [120, y + 22], [170, y]]);
      if (kd === "zigzag") { d = `M24 ${y}`; for (let i = 1; i <= 8; i++) d += `L${f1(24 + i * 18)} ${f1(y + (i % 2 ? -18 : 18))}`; }
      if (kd === "wave") { const pts = [[24, y]]; for (let i = 1; i <= 6; i++) pts.push([24 + i * 24, y + (i % 2 ? -24 : 24)]); d = VP.smoothPath(pts); }
      if (kd === "circle") d = `M${f1(102 + 38)} ${y}A38 38 0 1 1 ${f1(102 - 38)} ${y}A38 38 0 1 1 ${f1(102 + 38)} ${y}`;
      if (kd === "star") d = VP.shapeD("star", 102, y + 2, 42, 0);
      let s = `<path d="${d}" fill="none" stroke="#e9ecef" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
      s += `<path d="${d}" fill="none" stroke="#212529" stroke-width="0.9" stroke-dasharray="3 2"/>`;
      s += icon("2702", kd === "circle" || kd === "star" ? 30 : 12, kd === "circle" ? y : kd === "star" ? y - 30 : y, 14);
      items.push({ svg: svg(W, h, `<g class="canvas">${s}</g>`), mode: "path", path: d, width: 7, answer: null });
    }
    return { instr: ctx.kid ? "가위로 점선을 따라 오려 보세요. (태블릿에서는 손가락으로 점선을 따라가요)" : "점선을 따라 가위로 오리세요. 종이를 잡은 손을 돌려 가며 자르세요.", items };
  }

  // ---------- 칠교놀이 ----------
  /* 정사각형(한 변 4) 칠교 조각의 기본 자리. type: L(큰 삼각형) M(중간) S(작은) Q(정사각형) P(평행사변형) */
  const TANGRAM = [
    { t: "L", p: [[0, 0], [4, 0], [2, 2]], c: "#ff6b6b" }, { t: "L", p: [[0, 0], [2, 2], [0, 4]], c: "#4dabf7" },
    { t: "S", p: [[4, 0], [4, 2], [3, 1]], c: "#ffd43b" }, { t: "Q", p: [[3, 1], [4, 2], [3, 3], [2, 2]], c: "#51cf66" },
    { t: "S", p: [[2, 2], [3, 3], [1, 3]], c: "#cc5de8" }, { t: "P", p: [[0, 4], [1, 3], [3, 3], [2, 4]], c: "#ff922b" },
    { t: "M", p: [[4, 2], [4, 4], [2, 4]], c: "#20c997" },
  ];
  const TG_ADJ = [[1, 2, 3], [0, 4, 5], [0, 3], [0, 2, 4, 6], [1, 3, 5], [1, 4, 6], [3, 5]];
  VP.TANGRAM = TANGRAM;
  function E_tangram(ctx) {
    const { r, level } = ctx;
    const items = [];
    const u = 12.5; // 조각 1칸 = 12.5mm (오려 쓰는 조각과 같은 크기, 큰 정사각형 5cm)
    for (let k = 0; k < 2; k++) {
      const want = level === 1 ? r.int(2, 3) : level === 2 ? r.int(4, 5) : 6;
      // 서로 붙어 있는 조각들만 골라 모양을 만든다
      let set = [r.int(0, 6)];
      while (set.length < want) { const nb = r.shuffle(set.flatMap((i) => TG_ADJ[i]).filter((i) => !set.includes(i))); set.push(nb[0]); }
      const rot = level === 3 ? r.pick([45, 135, 225, 315]) : r.pick([0, 90, 180, 270]);
      const R = (p) => { const [x, y] = [p[0] - 2, p[1] - 2]; const a = (rot * Math.PI) / 180; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)]; };
      const slots = set.map((i) => ({ t: TANGRAM[i].t, i, p: TANGRAM[i].p.map(R) }));
      const xs = slots.flatMap((s2) => s2.p.map((p) => p[0])), ys = slots.flatMap((s2) => s2.p.map((p) => p[1]));
      const minX = Math.min(...xs), minY = Math.min(...ys), wU = Math.max(...xs) - minX, hU = Math.max(...ys) - minY;
      // 돌린 모양의 실제 크기로 왼쪽 칸을 잡고, 오른쪽 받침 칸이 조각을 다 담을 만큼 높이를 준다
      const box0 = Math.max(wU, hU) * u + 4;
      // 받침 칸에 놓을 조각: 처음 각도(1단계는 정답 각도, 그 외는 45° 배수만큼 돌림)와 겹치지 않는 자리를 미리 계산
      const trayX = box0 + 16, trayW = W - trayX;
      const tray = [];
      { let cx = trayX, cy = 14, rowH = 0;
        set.forEach((i, k) => {
          const base = TANGRAM[i].p.map((q) => [q[0] * u, q[1] * u]);
          const c = [base.reduce((t, q) => t + q[0], 0) / base.length, base.reduce((t, q) => t + q[1], 0) / base.length];
          const ang = rot + (level === 1 ? 0 : 45 * (1 + ((k * 3 + i) % 7)));
          const a2 = (ang * Math.PI) / 180;
          const V = base.map((q) => [(q[0] - c[0]) * Math.cos(a2) - (q[1] - c[1]) * Math.sin(a2), (q[0] - c[0]) * Math.sin(a2) + (q[1] - c[1]) * Math.cos(a2)]);
          const xs = V.map((q) => q[0]), ys = V.map((q) => q[1]);
          const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
          if (cx + bw > trayX + trayW && cx > trayX) { cx = trayX; cy += rowH + 3; rowH = 0; }
          tray.push({ ang, x: f1(cx - Math.min(...xs)), y: f1(cy - Math.min(...ys)) });
          cx += bw + 3; rowH = Math.max(rowH, bh);
        });
        var trayBottom = cy + rowH; }
      const h = Math.max(box0 + 12, trayBottom + 4), ox = 6 + (box0 - wU * u) / 2, oy = 4 + (h - 8 - hU * u) / 2;
      slots.forEach((s2) => (s2.p = s2.p.map((p) => [f1(ox + (p[0] - minX) * u), f1(oy + (p[1] - minY) * u)])));
      const polyD = (p) => "M" + p.map((q) => q[0] + " " + q[1]).join("L") + "Z";
      let s = slots.map((s2) => `<path d="${polyD(s2.p)}" fill="#ced4da" stroke="#ced4da" stroke-width="0.4" stroke-linejoin="round"/>`).join("");
      if (level === 1) s += slots.map((s2) => `<path d="${polyD(s2.p)}" fill="none" stroke="#868e96" stroke-width="0.4" stroke-dasharray="1.5 1"/>`).join("");
      s += text(box0 + 24, 10, `조각 ${want}개`, 4.4, { anchor: "start", fill: ctx.accent });
      s += `<g class="tray"></g>`;
      items.push({ svg: svg(W, h, s), mode: "tangram", rot, trayPos: tray, slots: slots.map((s2) => ({ t: s2.t, i: s2.i, p: s2.p })), u, tray: { x: box0 + 16, y: 14, w: W - (box0 + 16), h: h - 15 }, answer: null });
    }
    return { instr: ctx.kid ? "칠교 조각을 오려서 회색 모양을 채워 보세요. (태블릿에서는 조각을 끌어 옮기고, 눌러서 돌려요)" : "칠교 조각으로 회색 모양을 빈틈없이 채우세요. 조각 수가 적혀 있어요.", items };
  }
  /* 인쇄용: 칠교 조각 오리기 쪽 */
  VP.tangramCutout = function () {
    const u = 12.5;
    let s = `<g transform="translate(58 20)">` + TANGRAM.map((pc) => `<path d="M${pc.p.map((q) => f1(q[0] * u) + " " + f1(q[1] * u)).join("L")}Z" fill="${pc.c}" stroke="#212529" stroke-width="0.6" stroke-dasharray="2 1.5" stroke-linejoin="round"/>`).join("") + `</g>`;
    s += icon("2702", 30, 14, 12);
    return svg(W, 4 * u + 30, s);
  };

  // =====================================================================
  // 추가 활동 3 (2026-10-19) — C·E 다양화
  //  같은 점 격자 무늬가 여러 영역에서 반복된다는 의견에 따라 새 형식을 더함(기존 유형은 유지)
  //  C: 위장 무늬 속 찾기 · 겹친 그림 세기 · 한 모양만 따라 그리기 · 글자 숲 낱말 찾기 (장면 숨은그림은 GPT 그림을 받은 뒤 추가 — GPT_이미지_요청문.md)
  //  E: 위치어(위·아래·안·밖·앞·뒤·옆) · 종이 접어 구멍 뚫기 · 다른 쪽에서 보면(관점 바꾸기)
  // =====================================================================
  const hasJong = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c < 11172 && c % 28 !== 0; };
  const josa = (w, a, b) => w + (hasJong(w) ? a : b);
  const clipRect = (x, y, w, h) => { const id = VP.uid("cl"); return { id, def: `<clipPath id="${id}"><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="3"/></clipPath>` }; };

  // ---------- C. 위장 무늬 속 찾기 (배경 무늬와 같은 선 속에 숨은 그림) ----------
  function camoBg(r, kind, x0, y0, w, h, color, dens) {
    let s = "";
    if (kind === "dots") {
      const g = 4.2 / Math.sqrt(dens);
      for (let y = g / 2; y < h; y += g) for (let x = g / 2; x < w; x += g) s += `<circle cx="${f1(x0 + x + r.range(-g, g) * 0.35)}" cy="${f1(y0 + y + r.range(-g, g) * 0.35)}" r="${f1(r.range(0.45, 0.85))}" fill="${color}"/>`;
    } else if (kind === "waves") {
      const gap = 5.5 / dens, ph = r.range(0, 6);
      for (let y = gap / 2; y < h; y += gap) {
        let d = `M${f1(x0)} ${f1(y0 + y)}`;
        for (let x = 3; x <= w; x += 3) d += `L${f1(x0 + x)} ${f1(y0 + y + Math.sin(x / 5 + y / 4 + ph) * gap * 0.38)}`;
        s += `<path d="${d}" fill="none" stroke="${color}" stroke-width="0.45"/>`;
      }
    } else {
      const n = Math.round((w * h) / (115 / dens));
      for (let i = 0; i < n; i++) {
        const cx = r.range(0, w), cy = r.range(0, h), pts = [];
        for (let k = 0; k < 4; k++) pts.push([x0 + cx + r.range(-8, 8), y0 + cy + r.range(-8, 8)]);
        s += `<path d="${VP.smoothPath(pts)}" fill="none" stroke="${color}" stroke-width="0.45" stroke-linecap="round"/>`;
      }
    }
    return s;
  }
  function C_camo(ctx) {
    const { r, level } = ctx;
    const cfg = [null, { bg: ["dots"], col: "#adb5bd", dens: 1, n: 7, nt: 2, kinds: 1, S: 30, rot: 0 }, { bg: ["waves"], col: "#868e96", dens: 1.1, n: 10, nt: 3, kinds: 1, S: 25, rot: 15 }, { bg: ["waves", "scribble"], col: "#495057", dens: 1.25, n: 14, nt: 4, kinds: 2, S: 21, rot: 35 }][level];
    const targets = pool(ctx, cfg.kinds);
    const dist = similar(ctx, targets[0], 6, targets.map((t) => t.hex));
    const band = 32, fh = 180;
    let s = box(0, 0, W, band - 4, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 }) + text(24, 14, "찾을 그림", 5.5, { fill: ctx.accent });
    targets.forEach((t, i) => (s += icon(t.hex, 62 + i * 30, 14, 22, { line: true })));
    const cl = clipRect(0, band, W, fh);
    s += cl.def + `<g clip-path="url(#${cl.id})">` + cfg.bg.map((b) => camoBg(r, b, 0, band, W, fh, cfg.col, cfg.dens)).join("") + `</g>`;
    s += box(0, band, W, fh, { stroke: ctx.accent, sw: 0.5 });
    const pts = VP.scatter(r, cfg.n, W, fh, cfg.S * 1.05, cfg.S / 2 + 2);
    const nt = Math.min(cfg.nt, pts.length - 1);
    const kinds = [];
    for (let i = 0; i < pts.length; i++) kinds.push(i < nt ? targets[i % targets.length] : dist[i % dist.length]);
    const order = r.shuffle(kinds);
    const answer = [];
    pts.forEach((p, i) => {
      const ic = order[i];
      s += hit(i, p[0] - cfg.S / 2, band + p[1] - cfg.S / 2, cfg.S, cfg.S, icon(ic.hex, p[0], band + p[1], cfg.S, { line: true, rot: cfg.rot ? r.int(-cfg.rot, cfg.rot) : 0 }));
      if (targets.includes(ic)) answer.push(i);
    });
    return { instr: ctx.kid ? "무늬 속에 숨은 그림을 모두 찾아 ○ 하세요. 무늬에 속지 마세요!" : `배경 무늬 속에 숨은 위의 그림${targets.length > 1 ? " 두 가지를" : "을"} 모두 찾아 ○ 표시하세요.`, items: [{ svg: svg(W, band + fh + 2, s), mode: "all", answer }] };
  }

  // ---------- C. 겹친 그림 세기 ----------
  function C_count(ctx) {
    const { r, level } = ctx;
    const cfg = [null, { tot: 4, S: 30, max: 3 }, { tot: 6, S: 27, max: 4 }, { tot: 8, S: 25, max: 5 }][level];
    const h = 74, fw = 110;
    const items = [];
    for (let k = 0; k < 3; k++) {
      const t = pool(ctx, 1)[0];
      const cnt = r.int(2, cfg.max);
      const others = level === 3 ? similar(ctx, t, cfg.tot - cnt) : pool(ctx, cfg.tot - cnt, { not: [t.hex] });
      const list = r.shuffle(Array(cnt).fill(t).concat(others));
      // 좁은 곳에 모아 놓아 서로 겹치게 한다(못 놓으면 조금씩 넓힘)
      let pts = [], aw, ah;
      for (let g = 0; g < 80 && pts.length !== list.length; g++) {
        const f = 1 + g * 0.015;
        aw = Math.min(fw - 6, cfg.S * (1.1 + 0.28 * cfg.tot) * f); ah = Math.min(h - 6, cfg.S * 1.45 * f);
        pts = VP.scatter(r, list.length, aw, ah, cfg.S * 0.42, cfg.S * 0.5);
      }
      const ax = (fw - aw) / 2, ay = (h - ah) / 2;
      let s = box(0, 1, fw, h - 2, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 });
      list.forEach((ic, i) => (s += icon(ic.hex, ax + pts[i][0], ay + pts[i][1], cfg.S * r.range(0.88, 1.08), { line: true, rot: level === 1 ? 0 : r.int(-30, 30) })));
      s += divider(fw + 4, h);
      s += icon(t.hex, fw + 18, 16, 18, { line: true }) + text(fw + 30, 16, "몇 개?", 6, { anchor: "start", fill: ctx.accent });
      let opts = [cnt - 1, cnt, cnt + 1, cnt + 2];
      if (opts[0] < 1) opts = [cnt, cnt + 1, cnt + 2, cnt + 3];
      const bw = (W - fw - 8) / 4;
      const answer = [];
      opts.forEach((v, i) => {
        const x = fw + 8 + bw * i;
        s += hit(i, x + 1, 34, bw - 2, 26, box(x + 1, 34, bw - 2, 26, { stroke: "#ced4da", rx: 3 }) + text(x + bw / 2, 47, v, 10, { fill: "#212529" }));
        if (v === cnt) answer.push(i);
      });
      items.push({ svg: svg(W, h, s), mode: "one", answer });
    }
    return { instr: ctx.kid ? "겹쳐진 그림 속에서 오른쪽 그림이 몇 개인지 세어 맞는 수에 ○ 하세요." : "겹친 그림 속에서 오른쪽 그림이 몇 개 있는지 세어 고르세요. 돌아가 있는 것도 셉니다.", items };
  }

  // ---------- C. 겹친 모양 중 하나만 따라 그리기 ----------
  function C_trace(ctx) {
    const { r, level } = ctx;
    const basic = ["circle", "square", "triangle", "star", "heart", "diamond", "hexagon", "cross", "pentagon"];
    const n = [0, 3, 4, 5][level], h = 84, R = 21;
    const items = [];
    for (let k = 0; k < 2; k++) {
      const types = r.sample(basic, n);
      const rots = types.map(() => (level === 3 ? r.int(0, 359) : 0));
      const pts = overlapCluster(ctx, n, 118, h / 2, 64);
      let s = sampleBox(ctx, 52, h) + shape(types[0], 26, h / 2 - 6, 15, { fill: ctx.accent, stroke: "none", sw: 0, rot: rots[0] }) + text(26, h - 12, "이 모양만", 4.6, { fill: ctx.accent });
      s += divider(56, h);
      types.forEach((t, i) => (s += shape(t, pts[i][0], pts[i][1], R, { sw: 1, stroke: "#222", rot: rots[i] })));
      const D = (i) => VP.shapeD(types[i], pts[i][0], pts[i][1], R, rots[i]);
      items.push({ svg: svg(W, h, s), mode: "trace", path: D(0), avoid: types.slice(1).map((t, i) => D(i + 1)), answer: null });
    }
    return { instr: ctx.kid ? "겹친 모양 중에서 왼쪽 모양만 찾아 색연필로 따라 그려 보세요. 다른 모양은 그리지 않아요." : "겹친 도형 중 왼쪽 도형의 윤곽만 골라 끊기지 않게 따라 그리세요.", items };
  }

  // ---------- C. 글자 숲 낱말 찾기 ----------
  function C_words(ctx) {
    const { r, level, kid } = ctx;
    const n = (kid ? [0, 4, 5, 6] : [0, 5, 6, 7])[level];
    const nw = (kid ? [0, 2, 3, 4] : [0, 3, 4, 5])[level];
    const dirs = level === 1 && kid ? [[1, 0]] : [[1, 0], [0, 1]];
    const cand = ctx.icons.filter((i) => /^[가-힣]{2,4}$/.test(i.name) && i.name.length <= n - 1);
    const chars = [...new Set(cand.map((i) => i.name).join(""))];
    const count = (grid, word) => {
      let c = 0;
      for (const [dx, dy] of [[1, 0], [0, 1]]) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        if (x + dx * (word.length - 1) >= n || y + dy * (word.length - 1) >= n) continue;
        let s2 = "";
        for (let k = 0; k < word.length; k++) s2 += grid[(y + dy * k) * n + x + dx * k];
        if (s2 === word) c++;
      }
      return c;
    };
    let words, grid, cells;
    for (let t = 0; t < 400; t++) {
      words = [];
      const seen = new Set();
      for (const c of r.shuffle(cand)) { if (!seen.has(c.name)) { words.push(c); seen.add(c.name); } if (words.length === nw) break; }
      grid = Array(n * n).fill(null);
      cells = [];
      let ok = true;
      for (const w of words) {
        let placed = false;
        for (let g = 0; g < 200 && !placed; g++) {
          const [dx, dy] = r.pick(dirs), L = w.name.length;
          const x = r.int(0, n - 1 - dx * (L - 1)), y = r.int(0, n - 1 - dy * (L - 1));
          const idx = [...Array(L).keys()].map((k) => (y + dy * k) * n + x + dx * k);
          if (idx.every((id) => grid[id] === null)) { idx.forEach((id, k) => (grid[id] = w.name[k])); cells.push(...idx); placed = true; }
        }
        if (!placed) { ok = false; break; }
      }
      if (!ok) continue;
      // 1단계는 낱말에 없는 글자로만 채우고, 2·3단계는 낱말 글자도 섞어 헷갈리게 한다
      const filler = level === 1 ? chars.filter((ch) => !words.some((w) => w.name.includes(ch))) : chars;
      for (let i = 0; i < n * n; i++) if (grid[i] === null) grid[i] = r.pick(filler);
      if (words.every((w) => count(grid, w.name) === 1)) break;
    }
    const cs = Math.min(21, (W - 66) / n), gx = 64 + (W - 64 - n * cs) / 2, gy = 2;
    const iconOnly = !kid && level === 3;
    const h = Math.max(n * cs + 4, nw * 17 + 6);
    let s = box(0, 1, 58, h - 2, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 });
    words.forEach((w, i) => {
      const y = 11 + i * 17;
      s += icon(w.hex, 11, y, 13);
      if (!iconOnly) s += text(21, y, w.name, 5.6, { anchor: "start", fill: "#212529" });
    });
    s += box(gx, gy, n * cs, n * cs, { stroke: "#868e96", sw: 0.5, rx: 2 });
    grid.forEach((ch, i) => {
      const x = gx + (i % n) * cs, y = gy + Math.floor(i / n) * cs;
      s += hit("c" + i, x, y, cs, cs, `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(cs)}" height="${f1(cs)}" fill="none" stroke="#dee2e6" stroke-width="0.3"/>` + text(x + cs / 2, y + cs / 2, ch, f1(cs * 0.56), { fill: "#212529" }), 0);
    });
    const answer = [...new Set(cells)].map((i) => "c" + i);
    const dirTxt = dirs.length === 1 ? "가로(→)로" : "가로(→)나 세로(↓)로";
    return { instr: iconOnly ? `왼쪽 그림의 이름을 글자 숲에서 찾아 묶으세요. 낱말은 ${dirTxt} 숨어 있습니다.` : kid ? `왼쪽 낱말을 글자 숲에서 찾아 글자마다 ○ 하세요. 낱말은 ${dirTxt} 숨어 있어요.` : `왼쪽 낱말을 글자 숲에서 찾아 묶으세요. 낱말은 ${dirTxt} 숨어 있습니다.`, items: [{ svg: svg(W, h, s), mode: "all", answer }] };
  }

  // ---------- C. 장면 숨은그림 (GPT 선화 장면 + 따로 그린 물건을 프로그램이 숨김, 2026-10-19) ----------
  /* 그림: icons/scenes(장면 1536×1024), icons/hidden(물건, 흰 속 있음), icons/hiddenL(선만 — tools/scene-prep.ps1 로 생성)
   * SCENE_DENS: 장면을 32×21칸으로 나눈 선 밀도(0~9). 선이 빽빽한 곳에 숨긴다 */
  const SCENE_DENS = {
    k_bedroom: "534434332102011323323369777878466862223643041339667423532847242436787663610001095251124445292334136737606304123956564264755932561489669672020219659220537649366317999789801434255563415945595268142632999220388543589465574936941779839393366663226673438876578519999897916478342255589853244554168647807968768553555664767565461643928386133241333424262575769615797999761652650635462239730116276948687935668604253235435104574552086884562242576466245363734721486433313577876688686494766665585735433765240111315476655675765225537463313113020202348229754731584775822301204021111283374852745565146852210310213246543111111133445461477465655557431111100101012010100113334433311100110111",
    k_farm: "465530000044000000000391015356265443531569889100101327983567539754654774749979033542339016946999579875465399598796794693565897989969988977997794645779976398687689999896598997985554635764678973999999855679779979999989698855919679598877787599699995965675849499985956597979998779999655695227996996916733433147899998754645997979869797893994443753566697799997856896677999968788777756789999969992555899999899978999999999999997954277559998999599999999999999999754359999789984999999999999859984469869998999489699499999996847868599496678993994993999999999774367998536989743929555999995649399667332655949445244649459877558828699695336487554658655765366974399756678966854222276867794",
    k_forest: "869735869999776362056777977888878675328696745674140147948779934488433958575656365363324298975615473249556784347712320547385865266640582976858873841634534748941466340455765556574176032535770624961334845786585556324654679598239241438999557679568999999999973356921387956799697799888968978524599822799997978259466558399992654799643685699999379445355979689999655735798497840168765467979999999787863599998966899474368999966979994899999999939088634893759837997999746699559698743465999999999882029998675744855837979994796689964089999998852332746379599937999997589999959983343358784896999999960127604019656884220346569999999998219994448554211333324249697984694447954132211111212222",
    k_kitchen: "560331429424784067899989436567746624517839999999232424344248749954223799999759992525343253657799699896685989999924664666546578995999517468999998398434533895989946496375566776533999945999889999177965994224939974999699996999961687199965695699739399888999999749597999994387676786459679997999999999987799997745687799585977994859898616999956671000778959778946999996349999768699968457174444569799994796494999956076591600311699974574765853855765787716017108473669346465673347599724683372165797455327243362349999696244196945969475114346236789977897745926989896526153762657999348688769238869967553263565448691123899622178656753697857968585911797779911795497974855687774656597555648",
    k_playground: "548241653221000003310322133234354676645330012001200121584572256436516577653221212222202461179578847614994472130310000425067649474424595696460021025420025252537134513978993934246232325656493435184339569749426143149969399774763789998999994449839897394958754475599948899953784569494949479255495999969952898999999999999999565299998899752954586799793986964588999997899516854566497969936759329879889998636753732002056058532695852552344522741344549304374555535222423526455466697969898796235476733220311998744269467646788756655365310579234568714296657946563836560031354575233579444645624665464786141432035572467565755767479965992003303665368675473757045542626799011220255565455544",
    k_underwater: "365331330040000000300000000214307884548961220001004000000023056168975698866100441120431300335669896932789984176950419741002436996976779965999999921479735356867899797389444676899465222637698679897786792355124994735656678989794899989547833531155999996998998949543678879953720578999656697989495465399799666488848943994862428575793296521486599945649965369795867299694111654998633799666947677767376116322255444468989879586867696454554111211299969978785966669566565411431225999986959635789995799999343310299989465749518766799989998941256499766644779967767799988999752236941487573489666666912587895461293676353274725878843332523999622256440146899576573010153404321111003633343233",
    t_camping: "959999999690000410000000008999999699999629923554510220000003799995999999199839245654542010059998969989998997496456453466453324589499999999998997455543445434499994999863999999999963376334299999849931419599999979999998999999877375004365499999333421355999979794998737046989999991110010067996999999986778999933232514337555999999979889969999995493213971405799999999986899969996995584439996239998997365657656999799586999952449978999695267464468998999999999997974679989999996289888989999998999998528999999976696995999997410135106996769475883433589652499322139935487777756457674599999999962069877664129655445568999999779999899896422895457889993039999999721019979334987997892122125",
    t_library: "797996996999599989899793585576797979996799999999999996979386967956799998889999999999999396776389787999987989999999999993875859998978999789999799999999998568699978789998997987999999959997897999897888989999989989999599967978997967989899899799899996999999884999888898999988998999949999999719898999799999989989999399999999199979999999999999999996999999999999999899994159999999999999999999989999999999999399979999999996999999999999999999999999999977799999959999445999998898999999999999769799998775663989810013399999999799999999987754530112489999999988999999339999667864588999999999878999645599987985779899898898897776999999934600399999889989668756566978898637246996996769666685",
    t_market: "552143389999989999700211319693994649924335998999974026546997979987679974624699999665589793989999869769499954389997777897969999999697999989685559999998899999999589979999699999999998999999999855997999989999999999998899997316959989999999999996589977689978999989999989999999999997569899999999999899999978999999999999959999999999789999999999999999899999999999997999989999999999999999899999999999999999969999998879999799989999999999999999999696779999999999899896999799999979868799759999999999999999999879586778999999999999999998999696597776579998999999999989923986978845576669999999999994359789866735445656457949999999711796647435546654445445772379999475553242325424323455342953",
    t_station: "696454997995598977964665978600006665722999687696979966799793000036787845677987999286689999900001313579732669979898687999999000565734267888547999999987999970016959678984985978998999999999123665685176988668989999999999352579976856659698767799699998564746698988599697899999996999997999999699999935989989999999999996569999999999969478599999999999966699999999999999995999999999999999999999999999999999999999997349999999999999999899999799997631179999999999999998898899855653343759999999999999996999999954331334549999994559999969999638552322354317999944799795390836496710310344338999646998971937488221112110534027993486115921234212211121114432237845941124221112121111100032230016",
    t_street: "989999999999999798962799799899509999999989999999989558994989999898999999899899999899999949999999999998996256999999999999899978999899949764997899999797997997998988999697999699999889988999999997949968999999997544669765489799899599979999999655569959998799999996997799999999899885589999898999779999999999997979865999799799998899999999999999999999999999999998999999999999999999999999999999999997969999999997999959999999999999999999999999868759796999999999999999999999999998856669999998998989999999999999989999999999999999989969988898888998899999989999999999553446678997988979899998999997481244334587867986878779689999912423311213386666766787677899924413111221213466655666465666",
    t_workshop: "999963545555534558854544364655629999989776614444566556546679559599999844858432325447775359767797999999999789999956648648397846988999797999979999799998495999769779993779879659996999985758575793969978999999898987879655966868988689779999999999769998679999967775482599999998999999977898778899489977799999999998999977987979988386577999999999889999999577699764954669999899899979998999989998448699998999886862346777654599997686795889793449944413337999969668889889699866646346885999967998468754655974585839787998419529998996557277856699489987976883258344865364276578563395455898952977454589951599998536598435438525949999999999499555256465344322256399999999999999675444421111112244",
  };
  const SCENE_SIMILAR = { k_playground: ["cup", "spoon"], k_kitchen: ["leaf", "cup", "cat"], k_forest: ["leaf", "mushroom"], k_underwater: ["shell", "leaf"], k_bedroom: ["star", "bow", "ring", "umbrella"], k_farm: ["leaf"], t_library: ["leaf", "umbrella", "bell"], t_street: ["leaf", "bell"], t_camping: ["leaf"], t_market: ["leaf"], t_workshop: ["leaf", "heart", "bell", "umbrella", "key"], t_station: ["leaf", "bell"] };
  const HIDDEN_NAME = { spoon: "숟가락", key: "열쇠", umbrella: "우산", sock: "양말", banana: "바나나", fish: "물고기", star: "별", cup: "컵", hammer: "망치", feather: "깃털", button: "단추", hat: "모자", glove: "장갑", bow: "리본", snail: "달팽이", leaf: "나뭇잎", bell: "종", ring: "반지", toothbrush: "칫솔", comb: "빗", mushroom: "버섯", paintbrush: "붓", clip: "클립", pushpin: "압정", glasses: "안경", bird: "새", cat: "고양이", shell: "조개", pencil: "연필", heart: "하트" };
  function C_scene(ctx) {
    const { r, level, kid } = ctx;
    const base = VP.ICON_BASE || "icons/";
    const ids = Object.keys(SCENE_DENS).filter((k) => k[0] === (kid ? "k" : "t"));
    const sc = ids[(ctx.pageNo + level) % ids.length];
    const cfg = [null, { n: 3, S: 24, rot: 0, line: false }, { n: 4, S: 19, rot: 30, line: !kid }, { n: 6, S: 15, rot: 180, line: true }][level];
    const objs = r.sample(Object.keys(HIDDEN_NAME).filter((o) => !SCENE_SIMILAR[sc].includes(o)), cfg.n);
    const band = 30, ih = (W * 1024) / 1536, COLS = 32, ROWS = 21, cwm = W / COLS, chm = ih / ROWS;
    const dens = SCENE_DENS[sc];
    // 후보 칸: 선이 있는 곳(밀도 3 이상), 물건이 그림 밖으로 나가지 않는 곳
    const cand = [];
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      const x = (i + 0.5) * cwm, y = (j + 0.5) * chm, dv = +dens[j * COLS + i];
      if (dv >= 3 && x > cfg.S * 0.6 && x < W - cfg.S * 0.6 && y > cfg.S * 0.6 && y < ih - cfg.S * 0.6) cand.push({ x, y, w: dv });
    }
    const pts = [];
    for (let g = 0; g < 2000 && pts.length < cfg.n; g++) {
      const c = r.pick(cand);
      if (r.f() * 9 > c.w) continue; // 빽빽할수록 잘 뽑힘
      if (pts.every((p) => Math.hypot(p.x - c.x, p.y - c.y) > cfg.S * 1.6)) pts.push({ x: c.x + r.range(-cwm, cwm) * 0.4, y: c.y + r.range(-chm, chm) * 0.4 });
    }
    let s = box(0, 0, W, band - 4, { fill: ctx.tint, stroke: ctx.accent, sw: 0.5 }) + text(14, 13, "찾을 것", 4.6, { fill: ctx.accent });
    const cw = (W - 28) / objs.length;
    objs.forEach((o, i) => {
      const x = 28 + cw * i;
      s += `<image href="${base}hidden/${o}.png" x="${f1(x + 1)}" y="3" width="20" height="20"/>` + (cw > 34 ? text(x + 23, 13, HIDDEN_NAME[o], 4, { anchor: "start", fill: "#212529" }) : "");
    });
    s += `<image href="${base}scenes/${sc}.png" x="0" y="${band}" width="${W}" height="${f1(ih)}"/>`;
    s += box(0, band, W, ih, { stroke: ctx.accent, sw: 0.5, rx: 1 });
    const answer = [];
    pts.forEach((p, i) => {
      const rot = cfg.rot ? r.int(-cfg.rot, cfg.rot) : 0, S = cfg.S * r.range(0.9, 1.1), x = p.x, y = band + p.y;
      const img = `<image href="${base}${cfg.line ? "hiddenL" : "hidden"}/${objs[i]}.png" x="${f1(x - S / 2)}" y="${f1(y - S / 2)}" width="${f1(S)}" height="${f1(S)}"${rot ? ` transform="rotate(${rot} ${f1(x)} ${f1(y)})"` : ""}/>`;
      s += hit("t" + i, x - S * 0.55, y - S * 0.55, S * 1.1, S * 1.1, img);
      answer.push("t" + i);
    });
    return { instr: kid ? "그림 속에 숨어 있는 물건을 모두 찾아 ○ 하세요." : "장면 속에 숨은 물건을 모두 찾아 ○ 표시하세요. 돌아가 있거나 선이 겹쳐 있을 수 있습니다.", items: [{ svg: svg(W, band + ih + 1, s), mode: "all", answer }] };
  }
  // ---------- E. 위치어 (위·아래·안·밖·앞·뒤·옆) ----------
  const PREP_BIG = ["1F4E6", "1FA91", "1F6CF", "1F6AA", "1FA9F", "1F6C1", "1F682", "1F68C", "1F692", "1F691", "1F69C", "2708", "1F6A2", "1F681", "1F680", "1F308", "2600", "2601", "1F319", "1F5A5", "1F4FA", "1F5A8", "1F4DA"];
  /* 장면 하나(48×40 칸 기준, k배). ref: table | box | openBox. subs: [{hex, pos}] */
  function prepScene(ref, subs, ox, oy, k) {
    const X = (v) => f1(ox + v * k), Y = (v) => f1(oy + v * k);
    const P = (pts, fill) => `<path d="M${pts.map((p) => X(p[0]) + " " + Y(p[1])).join("L")}Z" fill="${fill}" stroke="#7a4f2a" stroke-width="${f1(0.35 * k)}" stroke-linejoin="round"/>`;
    const ic = (hex, x, y, s) => icon(hex, ox + x * k, oy + y * k, s * k);
    const fl = 35;
    let refBack = "", refFront = "";
    if (ref === "table") {
      refFront = P([[11, 18], [37, 18], [37, 20.6], [11, 20.6]], "#b07d4f") + P([[13, 20.6], [15, 20.6], [15, fl], [13, fl]], "#9c6b40") + P([[33, 20.6], [35, 20.6], [35, fl], [33, fl]], "#9c6b40");
    } else {
      const top = [[13, 20], [35, 20], [39, 16], [17, 16]], side = [[35, 20], [39, 16], [39, 31], [35, fl]], front = [[13, 20], [35, 20], [35, fl], [13, fl]];
      if (ref === "openBox") {
        refBack = P(top, "#8d5a2b") + P(side, "#d9a35f");
        refFront = P(front, "#f1c27d");
      } else {
        refFront = P(side, "#d9a35f") + P(top, "#f7d9a6") + P(front, "#f1c27d") + `<line x1="${X(24)}" y1="${Y(20)}" x2="${X(28)}" y2="${Y(16)}" stroke="#c9a06a" stroke-width="${f1(1.2 * k)}"/>`;
      }
    }
    const POS = {
      table: { 위: [24, 12, 12], 아래: [24, 29.5, 10], 옆L: [5.5, 29.5, 11], 옆R: [42.5, 29.5, 10.5] },
      box: { 위: [26, 10, 12], 앞: [22, 31, 13], 뒤: [33, 15, 11], 옆L: [6, 29.5, 11], 옆R: [43, 29.5, 10] },
      openBox: { 안: [24, 19, 12], 밖L: [6, 29.5, 11], 밖R: [43, 29.5, 10] },
    }[ref];
    const BEHIND = { 뒤: 1, 안: 1 };
    let s = `<line x1="${X(1)}" y1="${Y(fl)}" x2="${X(47)}" y2="${Y(fl)}" stroke="#ced4da" stroke-width="${f1(0.5 * k)}"/>`;
    subs.filter((q) => q.pos === "뒤").forEach((q) => (s += ic(q.hex, ...POS[q.pos])));
    s += refBack;
    subs.filter((q) => q.pos === "안").forEach((q) => (s += ic(q.hex, ...POS[q.pos])));
    s += refFront;
    subs.filter((q) => !BEHIND[q.pos]).forEach((q) => (s += ic(q.hex, ...POS[q.pos])));
    return s;
  }
  const PREP_WORD = { 위: "위", 아래: "아래", 옆L: "옆", 옆R: "옆", 안: "안", 밖L: "밖", 밖R: "밖", 앞: "앞", 뒤: "뒤" };
  const PREP_LR = { 옆L: "왼쪽", 옆R: "오른쪽" };
  function E_prep(ctx) {
    const { r, level, kid } = ctx;
    const per = level === 2 ? 4 : 3;
    const items = [];
    const refName = { table: "탁자", box: "상자", openBox: "상자" };
    const off = r.int(0, 1);
    for (let q = 0; q < per; q++) {
      let ref, choices, prompt, subsList, correct;
      if (level < 3) {
        const sets = level === 1 ? [["table", ["위", "아래", r.pick(["옆L", "옆R"])]], ["openBox", ["안", r.pick(["밖L", "밖R"])]]] : [["box", ["위", "앞", "뒤", r.pick(["옆L", "옆R"])]], ["table", ["위", "아래", "옆L", "옆R"]]];
        const [rf, poses] = sets[(q + off) % 2];
        ref = rf;
        const sub = pool(ctx, 1, { not: PREP_BIG })[0];
        const tgt = r.pick(poses);
        choices = r.shuffle(poses);
        subsList = choices.map((p) => [{ hex: sub.hex, pos: p }]);
        correct = choices.indexOf(tgt);
        const word = level === 2 && ref === "table" && PREP_LR[tgt] ? PREP_LR[tgt] : PREP_WORD[tgt];
        prompt = { icons: [sub.hex], txt: `${josa(sub.name, "이", "가")} ${refName[ref]} ${word}에 있어요.` };
      } else {
        ref = "box";
        const [a, b] = pool(ctx, 2, { not: PREP_BIG });
        const ALL = ["위", "앞", "뒤", "옆L", "옆R"];
        const bad = (p1, p2) => p1 === p2 || (p1 === "위" && p2 === "뒤") || (p1 === "뒤" && p2 === "위");
        let p1, p2, p3;
        do { [p1, p2, p3] = r.sample(ALL, 3); } while (bad(p1, p2) || bad(p1, p3) || bad(p3, p2) || bad(p2, p1));
        const combos = [[p1, p2], [p2, p1], [p1, p3], [p3, p2]];
        const order = r.shuffle([0, 1, 2, 3]);
        subsList = order.map((ci) => [{ hex: a.hex, pos: combos[ci][0] }, { hex: b.hex, pos: combos[ci][1] }]);
        correct = order.indexOf(0);
        const wd = (p) => PREP_LR[p] || PREP_WORD[p];
        prompt = { icons: [a.hex, b.hex], txt: `${josa(a.name, "은", "는")} 상자 ${wd(p1)}에, ${josa(b.name, "은", "는")} 상자 ${wd(p2)}에 있어요.` };
      }
      const nc = subsList.length, cw = W / nc, kk = Math.min(1.3, (cw - 3) / 48), top = 10, ch = 40 * kk + 2;
      let s = "";
      prompt.icons.forEach((h2, i) => (s += icon(h2, 4 + i * 8, 4.5, 7.5)));
      s += text(4 + prompt.icons.length * 8 + 1, 4.5, prompt.txt, 4.6, { anchor: "start", fill: ctx.accent });
      subsList.forEach((subs, i) => {
        const x = cw * i + 1.5, sx = x + (cw - 3 - 48 * kk) / 2;
        s += hit(i, x, top, cw - 3, ch, box(x, top, cw - 3, ch, { stroke: "#dee2e6", rx: 2 }) + prepScene(ref, subs, sx, top + 1, kk));
      });
      items.push({ svg: svg(W, top + ch + 1, s), mode: "one", answer: [correct] });
    }
    return { instr: kid ? "글을 읽고(들려주고) 그 말에 맞는 그림을 찾아 ○ 하세요." : "문장에 맞는 그림을 골라 ○ 표시하세요. 위치를 나타내는 말(위·아래·앞·뒤·옆·안)에 주의하세요.", items };
  }

  // ---------- E. 종이 접어 구멍 뚫기 ----------
  function E_fold(ctx) {
    const { r, level, kid } = ctx;
    const n = 4, P = 26, cs = P / n;
    const per = level === 3 ? 2 : 3;
    const items = [];
    const K = (c, rr) => c + "," + rr;
    const mir = (set, ax) => set.map(([c, rr]) => (ax === "v" ? [n - 1 - c, rr] : [c, n - 1 - rr]));
    const shift = (set, ax) => set.map(([c, rr]) => (ax === "v" ? [(c + n / 2) % n, rr] : [c, (rr + n / 2) % n]));
    const uni = (...sets) => { const m = new Map(); sets.flat().forEach((p) => m.set(K(...p), p)); return [...m.values()]; };
    const sig = (set) => set.map((p) => K(...p)).sort().join("|");
    const REG = { vL: [0, 1, 0, 3], vR: [2, 3, 0, 3], hU: [0, 3, 0, 1], hD: [0, 3, 2, 3] }; // c0,c1,r0,r1
    const paper = (x, y, c0, c1, r0, r1, shade) => {
      let s = `<rect x="${f1(x)}" y="${f1(y)}" width="${f1((c1 - c0 + 1) * cs)}" height="${f1((r1 - r0 + 1) * cs)}" fill="${shade || "#fffaf0"}" stroke="#868e96" stroke-width="0.45"/>`;
      for (let i = 1; i <= c1 - c0; i++) s += `<line x1="${f1(x + i * cs)}" y1="${f1(y)}" x2="${f1(x + i * cs)}" y2="${f1(y + (r1 - r0 + 1) * cs)}" stroke="#e9ecef" stroke-width="0.3"/>`;
      for (let j = 1; j <= r1 - r0; j++) s += `<line x1="${f1(x)}" y1="${f1(y + j * cs)}" x2="${f1(x + (c1 - c0 + 1) * cs)}" y2="${f1(y + j * cs)}" stroke="#e9ecef" stroke-width="0.3"/>`;
      return s;
    };
    const holes = (x, y, set, c0, r0) => set.map(([c, rr]) => `<circle cx="${f1(x + (c - c0 + 0.5) * cs)}" cy="${f1(y + (rr - r0 + 0.5) * cs)}" r="${f1(cs * 0.27)}" fill="#212529"/>`).join("");
    const intersect = (a, b) => [Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])];
    /* 접는 그림: 현재 종이(region) 위에 접는 선과 화살표 */
    const foldPanel = (x, y, reg, f) => {
      const [c0, c1, r0, r1] = reg;
      const mv = { vL: [2, 3, r0, r1], vR: [0, 1, r0, r1], hU: [c0, c1, 2, 3], hD: [c0, c1, 0, 1] }[f];
      let s = paper(x, y, c0, c1, r0, r1);
      s += `<rect x="${f1(x + (mv[0] - c0) * cs)}" y="${f1(y + (mv[2] - r0) * cs)}" width="${f1((mv[1] - mv[0] + 1) * cs)}" height="${f1((mv[3] - mv[2] + 1) * cs)}" fill="${ctx.accent}" fill-opacity="0.13"/>`;
      const v = f[0] === "v";
      if (v) s += `<line x1="${f1(x + (2 - c0) * cs)}" y1="${f1(y - 2)}" x2="${f1(x + (2 - c0) * cs)}" y2="${f1(y + (r1 - r0 + 1) * cs + 2)}" stroke="${ctx.accent}" stroke-width="0.7" stroke-dasharray="1.6 1.2"/>`;
      else s += `<line x1="${f1(x - 2)}" y1="${f1(y + (2 - r0) * cs)}" x2="${f1(x + (c1 - c0 + 1) * cs + 2)}" y2="${f1(y + (2 - r0) * cs)}" stroke="${ctx.accent}" stroke-width="0.7" stroke-dasharray="1.6 1.2"/>`;
      // 접는 화살표(움직이는 쪽 가운데 → 반대쪽)
      const mx = x + ((mv[0] + mv[1] + 1) / 2 - c0) * cs, my = y + ((mv[2] + mv[3] + 1) / 2 - r0) * cs;
      const kx = { vL: -1, vR: 1, hU: 0, hD: 0 }[f], ky = { vL: 0, vR: 0, hU: -1, hD: 1 }[f];
      const ex = mx + kx * 2 * cs, ey = my + ky * 2 * cs, qx = (mx + ex) / 2 - ky * 0 + (v ? 0 : 7), qy = (my + ey) / 2 - (v ? 7 : 0);
      s += `<path d="M${f1(mx)} ${f1(my)}Q${f1(qx)} ${f1(qy)} ${f1(ex)} ${f1(ey)}" fill="none" stroke="${ctx.accent}" stroke-width="0.9"/>`;
      const ang = Math.atan2(ey - qy, ex - qx);
      s += `<path d="M${f1(ex)} ${f1(ey)}L${f1(ex - 2.4 * Math.cos(ang - 0.45))} ${f1(ey - 2.4 * Math.sin(ang - 0.45))}L${f1(ex - 2.4 * Math.cos(ang + 0.45))} ${f1(ey - 2.4 * Math.sin(ang + 0.45))}Z" fill="${ctx.accent}"/>`;
      return s;
    };
    for (let q = 0; q < per; q++) {
      const folds = level === 3 ? [r.pick(["vL", "vR"]), r.pick(["hU", "hD"])] : [r.pick(level === 1 ? ["vL", "vR"] : ["vL", "vR", "hU", "hD"])];
      let reg = [0, 3, 0, 3];
      const regs = [reg];
      folds.forEach((f) => { reg = intersect(reg, REG[f]); regs.push(reg); });
      const nh = level === 1 ? (kid ? 1 : 2) : level === 2 ? 2 : r.int(1, 2);
      const cellsIn = [];
      for (let c = reg[0]; c <= reg[1]; c++) for (let rr = reg[2]; rr <= reg[3]; rr++) cellsIn.push([c, rr]);
      const punched = r.sample(cellsIn, nh);
      const axes = folds.map((f) => f[0]);
      let correct = punched;
      axes.forEach((ax) => (correct = uni(correct, mir(correct, ax))));
      const cands = [punched, uni(punched, shift(punched, axes[0]))];
      if (axes.length === 2) {
        cands.push(uni(punched, mir(punched, axes[0])), uni(punched, mir(punched, axes[1])));
        let t2 = uni(punched, shift(punched, axes[0])); t2 = uni(t2, shift(t2, axes[1])); cands.push(t2);
      } else cands.push(uni(punched, mir(punched, axes[0] === "v" ? "h" : "v")), uni(punched, mir(punched, axes[0]), mir(punched, axes[0] === "v" ? "h" : "v")));
      const seen = new Set([sig(correct)]), opts = [correct];
      for (const c of r.shuffle(cands)) { if (opts.length >= 4) break; if (!seen.has(sig(c))) { seen.add(sig(c)); opts.push(c); } }
      for (let g = 0; g < 100 && opts.length < 4; g++) {
        const c = correct.slice(); c[r.int(0, c.length - 1)] = [r.int(0, n - 1), r.int(0, n - 1)];
        const u = uni(c);
        if (!seen.has(sig(u))) { seen.add(sig(u)); opts.push(u); }
      }
      const list = r.shuffle(opts);
      // 1줄: 접기 단계 → 구멍 → 펼치면?
      const steps = folds.length + 1, pw = P + 12, sx0 = (W - (steps * pw + 26)) / 2;
      let s = "";
      folds.forEach((f, i) => {
        const g = regs[i], x = sx0 + i * pw + (P - (g[1] - g[0] + 1) * cs) / 2;
        s += foldPanel(x, 4, g, f) + text(sx0 + i * pw + P + 6, 4 + P / 2, "→", 5, { fill: "#adb5bd" });
      });
      const xl = sx0 + folds.length * pw + (P - (reg[1] - reg[0] + 1) * cs) / 2, yl = 4 + (P - (reg[3] - reg[2] + 1) * cs) / 2;
      s += `<rect x="${f1(xl + 0.9)}" y="${f1(yl + 0.9)}" width="${f1((reg[1] - reg[0] + 1) * cs)}" height="${f1((reg[3] - reg[2] + 1) * cs)}" fill="#f1f3f5" stroke="#adb5bd" stroke-width="0.35"/>`;
      s += paper(xl, yl, reg[0], reg[1], reg[2], reg[3]) + holes(xl, yl, punched, reg[0], reg[2]);
      s += text(sx0 + steps * pw + 10, 4 + P / 2, "펼치면?", 4.8, { fill: ctx.accent });
      // 2줄: 선택지
      const top = P + 12, cw = W / 4;
      const answer = [];
      list.forEach((o, i) => {
        const x = cw * i + (cw - P) / 2;
        s += hit(i, cw * i + 3, top - 3, cw - 6, P + 6, paper(x, top, 0, 3, 0, 3) + holes(x, top, o, 0, 0));
        if (o === correct) answer.push(i);
      });
      items.push({ svg: svg(W, top + P + 4, s), mode: "one", answer });
    }
    return { instr: kid ? "종이를 접어서 구멍을 뚫었어요. 펼치면 어떤 모양일까요? 맞는 것에 ○ 하세요." : "종이를 화살표대로 접은 뒤 검은 점 자리에 구멍을 뚫었습니다. 펼쳤을 때의 모양을 고르세요.", items };
  }

  // ---------- E. 다른 쪽에서 보면 (관점 바꾸기) ----------
  const person = (x, y, label, color) => `<circle cx="${f1(x)}" cy="${f1(y - 2.2)}" r="2.3" fill="${color}"/><path d="M${f1(x - 4)} ${f1(y + 3.4)}Q${f1(x)} ${f1(y - 1.4)} ${f1(x + 4)} ${f1(y + 3.4)}Z" fill="${color}"/>` + text(x, y + 7, label, 3.6, { fill: color });
  function E_view(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    const per = 2, h = 74, me = "#1c7ed6", fr = "#e64980";
    for (let q = 0; q < per; q++) {
      let s = `<rect x="10" y="16" width="52" height="34" rx="2" fill="#e6c9a8" stroke="#a47148" stroke-width="0.5"/>`;
      s += person(36, 58, "나", me);
      let choices, correct;
      const drawRow = (cx, cy, row, size) => row.map((ic, i) => icon(ic.hex, cx + (i - (row.length - 1) / 2) * size * 1.15, cy, size)).join("");
      if (level === 2) {
        const objs = pool(ctx, 3);
        objs.forEach((o, i) => (s += icon(o.hex, 19 + i * 17, 33, 14)));
        s += person(36, 4, "친구", fr);
        const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
        const want = [2, 1, 0], ego = [0, 1, 2];
        const others = r.sample(perms.filter((p) => p.join() !== want.join() && p.join() !== ego.join()), 2);
        choices = r.shuffle([want, ego].concat(others));
        correct = choices.indexOf(want);
        choices = choices.map((p) => ({ front: p.map((i) => objs[i]) }));
      } else {
        const objs = pool(ctx, 4);
        // g[col][row]: row 0 = 친구 쪽(위), row 1 = 내 쪽(아래)
        const g = [[objs[0], objs[2]], [objs[1], objs[3]]];
        [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([c, rr]) => (s += icon(g[c][rr].hex, 24 + c * 24, 24.5 + rr * 17, 13)));
        const VIEW = {
          S: { front: [g[0][1], g[1][1]], back: [g[0][0], g[1][0]] },
          N: { front: [g[1][0], g[0][0]], back: [g[1][1], g[0][1]] },
          W: { front: [g[0][0], g[0][1]], back: [g[1][0], g[1][1]] },
          E: { front: [g[1][1], g[1][0]], back: [g[0][1], g[0][0]] },
        };
        const at = r.pick(["N", "W", "E"]);
        s += at === "N" ? person(36, 4, "친구", fr) : at === "W" ? person(4.5, 30, "친구", fr) : person(67.5, 30, "친구", fr);
        const keys = r.shuffle(["S", "N", "W", "E"]);
        choices = keys.map((k2) => VIEW[k2]);
        correct = keys.indexOf(at);
      }
      s += divider(76, h);
      s += text(80, 5, "친구 눈에는?", 4.4, { anchor: "start", fill: fr });
      const cw = (W - 80) / 2, chh = (h - 10) / 2;
      const answer = [];
      choices.forEach((c, i) => {
        const x = 80 + cw * (i % 2), y = 10 + chh * Math.floor(i / 2);
        let inner = box(x + 1, y + 1, cw - 2, chh - 2, { stroke: "#dee2e6", rx: 2 });
        inner += `<rect x="${f1(x + 6)}" y="${f1(y + chh - 9)}" width="${f1(cw - 12)}" height="4" rx="1" fill="#e6c9a8" stroke="#a47148" stroke-width="0.4"/>`;
        if (c.back) inner += drawRow(x + cw / 2, y + chh - 19, c.back, 10) + drawRow(x + cw / 2, y + chh - 13, c.front, 12.5);
        else inner += drawRow(x + cw / 2, y + chh - 15.5, c.front, 12.5);
        s += hit(i, x + 1, y + 1, cw - 2, chh - 2, inner);
        if (i === correct) answer.push(i);
      });
      items.push({ svg: svg(W, h, s), mode: "one", answer });
    }
    return { instr: kid ? "위에서 내려다본 탁자예요. 친구 자리에 앉으면 물건이 어떻게 보일까요? 친구 눈에 보이는 모습에 ○ 하세요." : "위에서 본 탁자 그림입니다. 친구 자리에서 바라보면 물건이 어떻게 보일지(왼쪽·오른쪽, 앞·뒤) 고르세요.", items };
  }

  // =====================================================================
  // 추가 활동 4 (2026-10-19) — B·D·G 다양화 (점 격자 무늬 대신 속성 카드·그리는 방식·색 기억)
  //  속성 카드: 모양·색·개수·무늬 중 몇 가지가 다른 카드. TVPS의 '세부 변별' 형식을 참고해 새로 생성
  // =====================================================================
  const CARD_COL = ["#e03131", "#1c7ed6", "#2f9e44", "#f59f00", "#7048e8"];
  const CARD_SH = ["circle", "square", "triangle", "star", "heart", "diamond"];
  const CARD_PAT = ["solid", "outline", "stripes", "dots"];
  /* 칠 방식: solid(칠) outline(선) dash(점선) dot(점점이) stripes(줄무늬) dots(물방울) double(두 겹) */
  function styledShape(t, cx, cy, R, rot, st, color) {
    const d = VP.shapeD(t, cx, cy, R, rot);
    if (st === "solid") return `<path d="${d}" fill="${color}" stroke="${color}" stroke-width="0.4" stroke-linejoin="round"/>`;
    if (st === "stripes" || st === "dots") {
      // pattern 채우기는 Edge 인쇄에서 그림으로 바뀌어 PDF가 커지므로, 모양으로 잘라낸 선·점으로 그린다
      const id = VP.uid("cp");
      let inner = "";
      if (st === "stripes") {
        let dd = "";
        for (let o = -2 * R; o <= 2 * R; o += 1.9) dd += `M${f1(cx + o - R)} ${f1(cy + R)}L${f1(cx + o + R)} ${f1(cy - R)}`;
        inner = `<path d="${dd}" stroke="${color}" stroke-width="0.75"/>`;
      } else {
        let dd = "";
        for (let y = cy - R; y <= cy + R; y += 2.3) for (let x = cx - R; x <= cx + R; x += 2.3) dd += `M${f1(x - 0.55)} ${f1(y)}a0.55 0.55 0 1 0 1.1 0a0.55 0.55 0 1 0 -1.1 0`;
        inner = `<path d="${dd}" fill="${color}"/>`;
      }
      return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g><path d="${d}" fill="none" stroke="${color}" stroke-width="0.6" stroke-linejoin="round"/>`;
    }
    const dash = st === "dash" ? ` stroke-dasharray="2 1.2"` : st === "dot" ? ` stroke-dasharray="0.01 1.8" stroke-linecap="round"` : "";
    let s = `<path d="${d}" fill="none" stroke="${color}" stroke-width="${st === "dot" ? 1.2 : 0.9}" stroke-linejoin="round"${dash}/>`;
    if (st === "double") s += `<path d="${VP.shapeD(t, cx, cy, R * 0.62, rot)}" fill="none" stroke="${color}" stroke-width="0.7" stroke-linejoin="round"/>`;
    return s;
  }
  const cardKey = (c) => `${c.sh}|${c.col}|${c.pat}|${c.n}`;
  function drawCard(c, x, y, w, h) {
    let s = box(x, y, w, h, { fill: "#fff", stroke: "#adb5bd", sw: 0.4, rx: 2 });
    const R = Math.min(h * 0.3, w / (c.n * 2.5));
    for (let i = 0; i < c.n; i++) s += styledShape(c.sh, x + w / 2 + (i - (c.n - 1) / 2) * R * 2.3, y + h / 2, R, 0, c.pat, c.col);
    return s;
  }
  /* 단계별로 달라지는 속성 */
  const cardAttrs = (ctx) => {
    const L = ctx.level + (ctx.kid ? 0 : 1);
    return L <= 1 ? ["sh", "col"] : L === 2 ? ["sh", "col", "n"] : ["sh", "col", "n", "pat"];
  };
  function randCard(r, attrs) {
    return { sh: r.pick(CARD_SH), col: r.pick(CARD_COL), pat: attrs.includes("pat") ? r.pick(CARD_PAT) : "solid", n: attrs.includes("n") ? r.int(1, 3) : 1 };
  }
  /* 속성 하나만 바꾼 카드 */
  function mutCard(r, c, attrs) {
    const a = r.pick(attrs), m = Object.assign({}, c);
    const ALT = { sh: CARD_SH, col: CARD_COL, pat: CARD_PAT, n: [1, 2, 3] };
    m[a] = r.pick(ALT[a].filter((v) => v !== c[a]));
    return m;
  }

  // ---------- B. 똑같은 카드 찾기 ----------
  function B_cards(ctx) {
    const { r, level, kid } = ctx;
    const attrs = cardAttrs(ctx);
    const nc = (kid ? [0, 4, 5, 6] : [0, 5, 6, 7])[level], h = 32;
    const items = [];
    for (let k = 0; k < 5; k++) {
      const base = randCard(r, attrs);
      const opts = [base], seen = new Set([cardKey(base)]);
      for (let g = 0; g < 200 && opts.length < nc; g++) { const m = mutCard(r, base, attrs); if (!seen.has(cardKey(m))) { seen.add(cardKey(m)); opts.push(m); } }
      const list = r.shuffle(opts);
      const L = rowLayout(list.length, 40, h);
      let s = sampleBox(ctx, 40, h) + drawCard(base, 4, 5, 32, h - 10) + divider(L.x0 - 4, h);
      list.forEach((c, i) => (s += hit(i, L.cx(i) - L.cw / 2 + 1, 3, L.cw - 2, h - 6, drawCard(c, L.cx(i) - L.cw / 2 + 1.5, 4, L.cw - 3, h - 8))));
      items.push({ svg: svg(W, h, s), mode: "one", answer: [list.indexOf(base)] });
    }
    const what = attrs.includes("pat") ? "모양·색·개수·무늬" : attrs.includes("n") ? "모양·색·개수" : "모양과 색";
    return { instr: kid ? `왼쪽 카드와 ${what}이 모두 똑같은 카드를 찾아 ○ 하세요.` : `왼쪽 카드와 ${what}이 모두 같은 카드를 하나 찾아 ○ 표시하세요.`, items };
  }

  // ---------- B. 똑같은 짝 찾기 ----------
  function B_pairs(ctx) {
    const { r, level, kid } = ctx;
    const attrs = cardAttrs(ctx);
    const N = [0, 8, 12, 16][level], cols = 4, rowsN = N / cols, cw = W / cols, ch = level === 3 ? 30 : 34;
    const base = randCard(r, attrs);
    const cards = [base], seen = new Set([cardKey(base)]);
    // 절반은 짝과 한 가지만 다른 카드(헷갈리게), 나머지는 아무 카드
    for (let g = 0; g < 500 && cards.length < N - 1; g++) {
      const c = cards.length < N / 2 ? mutCard(r, base, attrs) : randCard(r, attrs);
      if (!seen.has(cardKey(c))) { seen.add(cardKey(c)); cards.push(c); }
    }
    cards.push(base);
    const list = r.shuffle(cards.map((c, i) => ({ c, i })));
    let s = "";
    const answer = [];
    list.forEach((o, i) => {
      const x = cw * (i % cols), y = ch * Math.floor(i / cols);
      s += hit(i, x + 2, y + 2, cw - 4, ch - 4, drawCard(o.c, x + 3, y + 3, cw - 6, ch - 6));
      if (o.c === base) answer.push(i);
    });
    return { instr: kid ? "카드 중에서 완전히 똑같은 두 장을 찾아 ○ 하세요." : "모든 카드 중 완전히 같은 두 장을 찾아 ○ 표시하세요. 한 가지만 다른 카드에 주의하세요.", items: [{ svg: svg(W, ch * rowsN, s), mode: "all", answer }] };
  }

  // ---------- D. 그리는 방식이 달라도 같은 모양 ----------
  function D_style(ctx) {
    const { r, level, kid } = ctx;
    const items = [];
    const nc = level === 1 ? 6 : 7, h = 40;
    const STY = level === 1 ? ["solid", "outline", "stripes", "dots"] : ["solid", "outline", "dash", "dot", "stripes", "dots", "double"];
    for (let k = 0; k < 5; k++) {
      let target, others;
      if (level === 1) { const basic = ["circle", "square", "triangle", "star", "heart", "cross"]; target = r.pick(basic); others = basic.filter((b) => b !== target); }
      else { const set = r.pick(SIMILAR_SETS); target = r.pick(set); others = set.filter((b) => b !== target); }
      const nt = r.int(2, 3);
      const list = r.shuffle([...Array(nt).fill(target), ...[...Array(nc - nt)].map(() => r.pick(others))]);
      const L = rowLayout(nc, 36, h);
      let s = sampleBox(ctx, 36, h) + styledShape(target, 18, h / 2, 12, 0, "outline", "#222") + divider(L.x0 - 4, h);
      const answer = [];
      list.forEach((t, i) => {
        const maxR = Math.min(13, L.cw * 0.43), R = level === 3 ? r.range(maxR * 0.5, maxR) : r.range(maxR * 0.75, maxR);
        const rot = level === 1 ? 0 : r.int(0, 359);
        s += hit(i, L.cx(i) - L.cw / 2 + 1, 3, L.cw - 2, h - 6, styledShape(t, L.cx(i), h / 2, R, rot, r.pick(STY), r.pick(CARD_COL)));
        if (t === target) answer.push(i);
      });
      items.push({ svg: svg(W, h, s), mode: "all", answer });
    }
    return { instr: kid ? "색칠, 줄무늬, 점선처럼 그린 방법이 달라도 왼쪽과 같은 모양을 모두 찾아 ○ 하세요." : "칠·무늬·선 종류·방향이 달라도 왼쪽과 같은 모양을 모두 찾아 ○ 표시하세요.", items };
  }

  // ---------- G. 카드 기억 ----------
  function G_card(ctx) {
    const { r, level, kid } = ctx;
    const attrs = cardAttrs(ctx);
    const items = [], h = 36, showW = 44;
    for (let k = 0; k < 4; k++) {
      const base = randCard(r, attrs);
      const opts = [base], seen = new Set([cardKey(base)]);
      for (let g = 0; g < 200 && opts.length < 4; g++) { const m = mutCard(r, base, attrs); if (!seen.has(cardKey(m))) { seen.add(cardKey(m)); opts.push(m); } }
      const list = r.shuffle(opts);
      const aw = W - showW - 9, cw = aw / 4;
      let ask = "";
      list.forEach((c, i) => (ask += hit(i, cw * i + 1, 3, cw - 2, h - 6, drawCard(c, cw * i + 1.5, 4, cw - 3, h - 8))));
      items.push(memRow(ctx, showW, h, drawCard(base, 5, 5, showW - 10, h - 10), ask, { answer: [list.indexOf(base)], sub: "one", showSec: 3 + level }));
    }
    return { instr: kid ? "왼쪽 카드를 잘 보고 종이로 가려요. 오른쪽에서 똑같은 카드를 찾아 ○ 하세요." : "왼쪽 카드를 기억한 뒤 점선을 따라 가리고, 똑같은 카드를 찾아 ○ 표시하세요.", items };
  }

  // ---------- G. 색깔 기억 ----------
  function G_color(ctx) {
    const { r, level } = ctx;
    const n = [0, 3, 4, 5][level], h = 34, showW = n * 17 + 8;
    const items = [];
    for (let k = 0; k < 4; k++) {
      const shs = r.sample(CARD_SH, n), cols = r.sample(CARD_COL, n);
      let showI = "";
      shs.forEach((t, i) => (showI += styledShape(t, 4 + 8.5 + i * 17, h / 2, 6.5, 0, "solid", cols[i])));
      const q = r.int(0, n - 1);
      const choices = r.shuffle([cols[q]].concat(r.sample(CARD_COL.filter((c) => c !== cols[q]), 3)));
      let ask = styledShape(shs[q], 12, h / 2, 9, 0, "dash", "#868e96") + text(26, h / 2, "?", 8, { fill: "#868e96" });
      const answer = [];
      const aw = W - showW - 9, sw = Math.min(20, (aw - 34) / 4);
      choices.forEach((c, i) => {
        const x = 34 + sw * i + sw / 2;
        ask += hit(i, x - sw / 2 + 1, h / 2 - 8, sw - 2, 16, `<circle cx="${f1(x)}" cy="${f1(h / 2)}" r="${f1(Math.min(6.5, sw * 0.36))}" fill="${c}" stroke="#495057" stroke-width="0.4"/>`);
        if (c === cols[q]) answer.push(i);
      });
      items.push(memRow(ctx, showW, h, showI, ask, { answer, sub: "one", showSec: 2 + n }));
    }
    return { instr: ctx.kid ? "모양들의 색깔을 잘 보고 가려요. 오른쪽 모양이 무슨 색이었는지 ○ 하세요." : "각 모양의 색을 기억한 뒤 가리고, 오른쪽 모양이 무슨 색이었는지 고르세요.", items };
  }

  // ================= 영역 정의 =================
  VP.AREAS = {
    A: { name: { kid: "꼼꼼히 찾기", teen: "시각 주의·탐색" }, full: "시각 주의·탐색", color: "#e8590c", kinds: { 1: [A_cancel, A_track, A_dots, A_numPath, A_trail, A_shop], 2: [A_cancel, A_track, A_rows, A_numPath, A_dots, A_trail, A_shop], 3: [A_cancel, A_track, A_rows, A_numPath, A_dots, A_trail, A_shop] } },
    B: { name: { kid: "똑같은 것 찾기", teen: "시각 변별" }, full: "시각 변별", color: "#f08c00", kinds: { 1: [B_match, B_cards, B_odd, B_spot, B_seq, B_pairs, B_rows, B_size, B_sil], 2: [B_match, B_cards, B_odd, B_spot, B_seq, B_pairs, B_rows, B_size, B_sil], 3: [B_match, B_cards, B_odd, B_spot, B_seq, B_pairs, B_rows, B_size, B_sil] } },
    C: { name: { kid: "숨은 그림 찾기", teen: "전경-배경 구분" }, full: "전경-배경(도형-배경)", color: "#2f9e44", kinds: { 1: [C_overlap, C_scene, C_camo, C_shapes, C_count, C_trace, C_words], 2: [C_overlap, C_scene, C_camo, C_shapes, C_count, C_embed, C_trace, C_words], 3: [C_overlap, C_scene, C_camo, C_hidden, C_count, C_embed, C_trace, C_words] } },
    D: { name: { kid: "모양 알아보기", teen: "형태 항상성" }, full: "형태 항상성", color: "#0c8599", kinds: { 1: [D_shapes, D_style, D_icons, D_pair, D_font], 2: [D_shapes, D_style, D_icons, D_pair, D_font], 3: [D_patterns, D_style, D_icons, D_shapes, D_pair, D_font] } },
    E: { name: { kid: "방향 알아보기", teen: "공간 관계" }, full: "공간 관계", color: "#1c7ed6", kinds: { 1: [E_oddFlip, E_prep, E_sameDir, E_position, E_fold, E_map, E_cubes, E_tangram], 2: [E_sameDir, E_prep, E_glyphs, E_view, E_position, E_symmetry, E_fold, E_map, E_cubes, E_tangram], 3: [E_rotate, E_view, E_rotIcon, E_prep, E_symmetry, E_fold, E_map, E_cubes, E_tangram] } },
    F: { name: { kid: "무엇일까요?", teen: "시각 완성" }, full: "시각 통합(시각 완성)", color: "#7048e8", kinds: { 1: [(c) => F_mask(c, "side"), F_gapShape, F_pieces, F_pie, F_half], 2: [(c) => F_mask(c, "blocks"), F_gapShape, F_pieces, F_pie, F_half], 3: [(c) => F_mask(c, "blocksHard"), (c) => F_mask(c, "stripes"), F_pieces, F_pie, F_half] } },
    G: { name: { kid: "기억하기", teen: "시각 기억" }, full: "시각 기억", color: "#d6336c", kinds: { 1: [G_icons, G_card, G_position, G_missing, G_color, G_where, G_corsi], 2: [G_icons, G_card, G_position, G_missing, G_color, G_where, G_corsi], 3: [G_sequence, G_card, G_position, G_missing, G_color, G_where, G_corsi] } },
    H: { name: { kid: "따라 그리기", teen: "시각-운동 협응" }, full: "시각-운동 협응", color: "#8f5b1f", kinds: { 1: [H_trace, H_copy, H_cells, H_path, H_outline, H_letters, H_cut], 2: [H_trace, H_copy, H_path, H_blocks, H_maze, H_outline, H_letters, H_cut], 3: [H_trace, H_copy, (c) => H_copy(c, true), H_maze, H_blocks, H_outline, H_letters, H_cut] } },
  };
  VP.AREA_ORDER = "ABCDEFGH".split("");

  VP.makePage = function (area, level, theme, pageNo) {
    const A = VP.AREAS[area];
    const r = VP.rng(VP.hashSeed(area, level, theme, pageNo));
    const kid = theme === "kid";
    const ctx = {
      r, level, theme, kid, pageNo,
      icons: VP.ICONS[theme],
      accent: A.color,
      tint: A.color + "14",
      patColor: kid ? VP.PALETTE.kid.line : "#1f2d4d",
    };
    // 3단계 G 영역처럼 G_position이 1·2단계와 겹치지 않게 순환
    const kinds = A.kinds[level];
    const fn = kinds[(pageNo - 1) % kinds.length];
    const page = fn(ctx);
    page.kind = fn.name; page.area = area; page.level = level; page.theme = theme; page.no = pageNo;
    return page;
  };
})(window.VP = window.VP || {});
