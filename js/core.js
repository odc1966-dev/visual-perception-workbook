/* 시지각 워크북 — 공용 도구: 난수, SVG 그리기, 도형, 점선 패턴
 * 모든 좌표 단위는 mm (인쇄 A4 기준). 앱에서는 SVG가 화면 크기에 맞춰 늘어난다.
 */
(function (VP) {
  // ---------- 시드 난수 (같은 시드 = 같은 문항) ----------
  VP.rng = function (seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const r = {
      f: next,
      range: (a, b) => a + next() * (b - a),
      int: (a, b) => a + Math.floor(next() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      shuffle(arr) {
        const x = arr.slice();
        for (let i = x.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          [x[i], x[j]] = [x[j], x[i]];
        }
        return x;
      },
      sample: (arr, n) => r.shuffle(arr).slice(0, n),
      chance: (p) => next() < p,
    };
    return r;
  };
  VP.hashSeed = function (...parts) {
    let h = 2166136261;
    for (const ch of parts.join("|")) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  let uidN = 0;
  VP.uid = (p) => (p || "u") + ++uidN;

  // ---------- SVG 기본 ----------
  const f1 = (n) => Math.round(n * 100) / 100;
  VP.f1 = f1;
  VP.svg = (w, h, inner, cls) =>
    `<svg class="${cls || "it"}" viewBox="0 0 ${f1(w)} ${f1(h)}" data-w="${f1(w)}" data-h="${f1(h)}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">${inner}</svg>`;

  /* 아이콘: x,y = 중심, s = 한 변. opt: line(선화), flip(좌우반전), rot(도), op(불투명도) */
  VP.icon = function (hex, x, y, s, opt) {
    opt = opt || {};
    const url = VP.iconUrl(hex, opt.line);
    let tf = "";
    if (opt.rot || opt.flip) {
      tf = ` transform="translate(${f1(x)} ${f1(y)})${opt.rot ? ` rotate(${opt.rot})` : ""}${opt.flip ? " scale(-1 1)" : ""} translate(${f1(-x)} ${f1(-y)})"`;
    }
    return `<image href="${url}" x="${f1(x - s / 2)}" y="${f1(y - s / 2)}" width="${f1(s)}" height="${f1(s)}"${tf}${opt.op ? ` opacity="${opt.op}"` : ""}/>`;
  };

  /* 선택 가능한 영역. 앱은 data-hit로 터치를 받고, 인쇄에서는 보이지 않는다 */
  VP.hit = (id, x, y, w, h, inner, rx) =>
    `<g class="hit" data-hit="${id}"><rect class="hitbox" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx == null ? 2 : rx}"/>${inner}</g>`;

  VP.box = (x, y, w, h, opt) => {
    opt = opt || {};
    return `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${opt.rx == null ? 3 : opt.rx}" fill="${opt.fill || "none"}" stroke="${opt.stroke || "#999"}" stroke-width="${opt.sw || 0.4}"${opt.dash ? ` stroke-dasharray="${opt.dash}"` : ""}/>`;
  };
  VP.text = (x, y, s, size, opt) => {
    opt = opt || {};
    return `<text x="${f1(x)}" y="${f1(y)}" font-size="${size}" text-anchor="${opt.anchor || "middle"}" dominant-baseline="central" fill="${opt.fill || "#333"}" font-weight="${opt.weight || 700}" font-family="${opt.font || "'Malgun Gothic', sans-serif"}">${s}</text>`;
  };

  // ---------- 도형 ----------
  const poly = (pts) => "M" + pts.map((p) => f1(p[0]) + " " + f1(p[1])).join("L") + "Z";
  const reg = (n, r, start) => {
    const a = [];
    for (let i = 0; i < n; i++) {
      const t = (start == null ? -90 : start) * (Math.PI / 180) + (i * 2 * Math.PI) / n;
      a.push([r * Math.cos(t), r * Math.sin(t)]);
    }
    return a;
  };
  /* 모든 도형은 원점 중심, 반지름 1 크기에 맞춘 점 목록 (원·타원·하트는 특수 처리) */
  const SHAPES = {
    circle: null,
    ellipse: null,
    heart: null,
    semicircle: null,
    square: [[-0.8, -0.8], [0.8, -0.8], [0.8, 0.8], [-0.8, 0.8]],
    rect: [[-1, -0.55], [1, -0.55], [1, 0.55], [-1, 0.55]],
    triangle: reg(3, 1, -90).map((p) => [p[0], p[1] + 0.2]),
    rtri: [[-0.85, 0.75], [0.85, 0.75], [-0.85, -0.85]],
    tallTri: [[0, -1], [0.5, 0.9], [-0.5, 0.9]],
    diamond: [[0, -1], [0.65, 0], [0, 1], [-0.65, 0]],
    pentagon: reg(5, 1),
    hexagon: reg(6, 1, 0),
    trapezoid: [[-0.5, -0.6], [0.5, -0.6], [1, 0.6], [-1, 0.6]],
    parallelogram: [[-0.55, -0.6], [1, -0.6], [0.55, 0.6], [-1, 0.6]],
    star: (() => {
      const a = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 0.42 : 1;
        const t = -Math.PI / 2 + (i * Math.PI) / 5;
        a.push([r * Math.cos(t), r * Math.sin(t) + 0.08]);
      }
      return a;
    })(),
    cross: [[-0.3, -0.9], [0.3, -0.9], [0.3, -0.3], [0.9, -0.3], [0.9, 0.3], [0.3, 0.3], [0.3, 0.9], [-0.3, 0.9], [-0.3, 0.3], [-0.9, 0.3], [-0.9, -0.3], [-0.3, -0.3]],
    lshape: [[-0.8, -0.9], [-0.25, -0.9], [-0.25, 0.35], [0.8, 0.35], [0.8, 0.9], [-0.8, 0.9]],
    tshape: [[-0.9, -0.85], [0.9, -0.85], [0.9, -0.3], [0.28, -0.3], [0.28, 0.9], [-0.28, 0.9], [-0.28, -0.3], [-0.9, -0.3]],
    arrow: [[-0.9, -0.25], [0.2, -0.25], [0.2, -0.65], [0.95, 0], [0.2, 0.65], [0.2, 0.25], [-0.9, 0.25]],
    flag: [[-0.7, -0.9], [0.8, -0.55], [-0.45, -0.2], [-0.45, 0.9], [-0.7, 0.9]],
  };
  VP.SHAPE_NAMES = Object.keys(SHAPES);
  /* 도형 path d 문자열. sx: 좌우반전(-1) */
  VP.shapeD = function (type, cx, cy, r, rot, sx) {
    rot = ((rot || 0) * Math.PI) / 180;
    sx = sx || 1;
    const T = (p) => {
      const x = p[0] * sx, y = p[1];
      return [cx + r * (x * Math.cos(rot) - y * Math.sin(rot)), cy + r * (x * Math.sin(rot) + y * Math.cos(rot))];
    };
    if (type === "circle") return circleD(cx, cy, r * 0.9, r * 0.9, 0);
    if (type === "ellipse") return circleD(cx, cy, r, r * 0.55, rot);
    if (type === "heart") {
      const pts = [];
      for (let i = 0; i < 48; i++) {
        const t = (i / 48) * 2 * Math.PI;
        const x = 16 * Math.pow(Math.sin(t), 3) / 17;
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17;
        pts.push([x, y + 0.05]);
      }
      return poly(pts.map(T));
    }
    if (type === "semicircle") {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = Math.PI + (i / 24) * Math.PI;
        pts.push([Math.cos(t), Math.sin(t) * 1 + 0.45]);
      }
      return poly(pts.map(T));
    }
    return poly(SHAPES[type].map(T));
  };
  /* 다각형 꼭짓점 좌표 (원·타원·하트·반원은 null) */
  VP.shapeVerts = function (type, cx, cy, r, rot) {
    if (!SHAPES[type]) return null;
    rot = ((rot || 0) * Math.PI) / 180;
    return SHAPES[type].map((p) => [cx + r * (p[0] * Math.cos(rot) - p[1] * Math.sin(rot)), cy + r * (p[0] * Math.sin(rot) + p[1] * Math.cos(rot))]);
  };
  function circleD(cx, cy, rx, ry, rot) {
    const pts = [];
    for (let i = 0; i < 40; i++) {
      const t = (i / 40) * 2 * Math.PI;
      const x = rx * Math.cos(t), y = ry * Math.sin(t);
      pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
    }
    return poly(pts);
  }
  VP.shape = (type, cx, cy, r, opt) => {
    opt = opt || {};
    return `<path d="${VP.shapeD(type, cx, cy, r, opt.rot, opt.sx)}" fill="${opt.fill || "none"}" stroke="${opt.stroke || "#222"}" stroke-width="${opt.sw == null ? 0.8 : opt.sw}" stroke-linejoin="round"/>`;
  };

  // ---------- 점선 패턴 (n×n 점 위의 선분 모음) ----------
  /* 선분 키: "x1,y1-x2,y2" (정렬됨). 인접한 점끼리만(대각선 포함) 잇는다 */
  const segKey = (a, b) => {
    const s = [a, b].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    return `${s[0][0]},${s[0][1]}-${s[1][0]},${s[1][1]}`;
  };
  const parseSeg = (k) => k.split("-").map((p) => p.split(",").map(Number));
  VP.segKey = segKey;
  VP.parseSeg = parseSeg;

  VP.pattern = {
    /* 이어진 선(한붓) 패턴: 점 n개 격자에서 m개 선분. diag: 대각선 허용 */
    random(r, n, m, diag) {
      for (let tries = 0; tries < 200; tries++) {
        const set = new Set();
        let p = [r.int(0, n - 1), r.int(0, n - 1)];
        let guard = 0;
        while (set.size < m && guard++ < 100) {
          const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
          if (diag) dirs.push([1, 1], [-1, -1], [1, -1], [-1, 1]);
          const d = r.pick(dirs);
          const q = [p[0] + d[0], p[1] + d[1]];
          if (q[0] < 0 || q[1] < 0 || q[0] >= n || q[1] >= n) continue;
          const k = segKey(p, q);
          if (set.has(k)) { p = q; continue; }
          // 대각선 X자 교차는 피한다(모사가 모호해짐)
          if (d[0] && d[1]) {
            const x0 = Math.min(p[0], q[0]), y0 = Math.min(p[1], q[1]);
            const other = d[0] === d[1] ? segKey([x0 + 1, y0], [x0, y0 + 1]) : segKey([x0, y0], [x0 + 1, y0 + 1]);
            if (set.has(other)) continue;
          }
          set.add(k);
          p = q;
        }
        if (set.size === m) return [...set].sort();
      }
      return [];
    },
    /* 변형: 회전(90° 단위 k), 좌우반전 */
    transform(segs, n, k, mirror) {
      const T = (pt) => {
        let [x, y] = pt;
        if (mirror) x = n - 1 - x;
        for (let i = 0; i < (k || 0); i++) [x, y] = [n - 1 - y, x];
        return [x, y];
      };
      return segs.map((s) => { const [a, b] = parseSeg(s); return segKey(T(a), T(b)); }).sort();
    },
    same: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
    /* 선분 하나를 바꾼 비슷한 패턴 */
    mutate(r, segs, n, diag) {
      for (let t = 0; t < 100; t++) {
        const s = segs.slice();
        const i = r.int(0, s.length - 1);
        const [a] = parseSeg(s[i]);
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        if (diag) dirs.push([1, 1], [-1, -1], [1, -1], [-1, 1]);
        const d = r.pick(dirs);
        const q = [a[0] + d[0], a[1] + d[1]];
        if (q[0] < 0 || q[1] < 0 || q[0] >= n || q[1] >= n) continue;
        const k = segKey(a, q);
        if (s.includes(k)) continue;
        s[i] = k;
        const out = s.sort();
        if (!VP.pattern.same(out, segs)) return out;
      }
      return segs;
    },
    /* 좌우 반전이 어떤 회전과도 같지 않은가 (방향 과제용) */
    chiral(segs, n) {
      const m = VP.pattern.transform(segs, n, 0, true);
      for (let k = 0; k < 4; k++) if (VP.pattern.same(VP.pattern.transform(segs, n, k), m)) return false;
      return true;
    },
    /* 회전 대칭이 없는가 (회전해도 모양이 바뀜) */
    asym(segs, n) {
      for (let k = 1; k < 4; k++) if (VP.pattern.same(VP.pattern.transform(segs, n, k), segs)) return false;
      return true;
    },
    /* 그리기. x,y = 왼쪽 위, size = 한 변. opt: color, sw, dots, grid, rot(도) */
    draw(segs, n, x, y, size, opt) {
      opt = opt || {};
      const pad = size * 0.12, step = (size - pad * 2) / (n - 1);
      const P = (p) => [x + pad + p[0] * step, y + pad + p[1] * step];
      let s = "";
      if (opt.frame !== false) s += VP.box(x, y, size, size, { stroke: opt.frameColor || "#bbb", sw: 0.35, rx: 1.5 });
      if (opt.dots !== false) {
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
          const [px, py] = P([i, j]);
          s += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(Math.max(0.45, size * 0.018))}" fill="#9aa"/>`;
        }
      }
      const sw = opt.sw || Math.max(0.7, size * 0.045);
      const d = segs.map((k) => { const [a, b] = parseSeg(k).map(P); return `M${f1(a[0])} ${f1(a[1])}L${f1(b[0])} ${f1(b[1])}`; }).join("");
      let g = `<path d="${d}" stroke="${opt.color || "#222"}" stroke-width="${f1(sw)}" stroke-linecap="round" fill="none"/>`;
      if (opt.rot) {
        const c = [x + size / 2, y + size / 2];
        s = `<g transform="rotate(${opt.rot} ${f1(c[0])} ${f1(c[1])})">${s}${g}</g>`;
        return s;
      }
      return s + g;
    },
  };

  // ---------- 곡선 (Catmull-Rom → 베지어) ----------
  VP.smoothPath = function (pts) {
    let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${f1(c1[0])} ${f1(c1[1])} ${f1(c2[0])} ${f1(c2[1])} ${f1(p2[0])} ${f1(p2[1])}`;
    }
    return d;
  };

  /* 겹치지 않게 흩어 놓기 (거부 표집) */
  VP.scatter = function (r, n, w, h, minDist, margin) {
    margin = margin || 0;
    const pts = [];
    let tries = 0;
    while (pts.length < n && tries++ < 20000) {
      const p = [r.range(margin, w - margin), r.range(margin, h - margin)];
      if (pts.every((q) => Math.hypot(p[0] - q[0], p[1] - q[1]) >= minDist)) pts.push(p);
    }
    return pts;
  };

  // 테마별 색
  VP.PALETTE = {
    kid: { line: "#e8453c", fills: ["#ff6b6b", "#ffd43b", "#51cf66", "#4dabf7", "#ff922b", "#cc5de8"], cell: ["#ff4d4d", "#ffd43b", "#2f9e44", "#4c6ef5", "#ff922b"] },
    teen: { line: "#1f2d4d", fills: ["#495057", "#1c7ed6", "#2b8a3e", "#e8590c", "#5f3dc4", "#c92a2a"], cell: ["#343a40", "#1c7ed6", "#2b8a3e", "#e8590c", "#868e96"] },
  };
})(window.VP = window.VP || {});
