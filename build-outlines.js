/* 점선 따라 그리기용 윤곽 데이터 만들기
 *   node build-outlines.js  →  js/outlines.js
 * icons/k/*.svg(OpenMoji 선화)의 path 들을 모아 VP.OUTLINE[hex] = { d:[...], n:복잡도 } 로 저장한다.
 */
const fs = require("fs");
const path = require("path");
const dir = path.join(__dirname, "icons", "k");
const out = {};
for (const f of fs.readdirSync(dir)) {
  const svg = fs.readFileSync(path.join(dir, f), "utf8");
  const ds = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1]);
  // 원·타원은 path 로 바꿔 넣는다
  for (const m of svg.matchAll(/<circle[^>]*cx="([\d.]+)"[^>]*cy="([\d.]+)"[^>]*r="([\d.]+)"/g)) {
    const [cx, cy, r] = m.slice(1).map(Number);
    ds.push(`M${cx + r} ${cy}A${r} ${r} 0 1 1 ${cx - r} ${cy}A${r} ${r} 0 1 1 ${cx + r} ${cy}`);
  }
  if (!ds.length) continue;
  const n = ds.reduce((a, d) => a + d.length, 0);
  out[f.replace(".svg", "")] = { d: ds, n };
}
fs.writeFileSync(path.join(__dirname, "js", "outlines.js"), "/* 자동 생성 — build-outlines.js (OpenMoji 선화, CC BY-SA 4.0) */\nwindow.VP = window.VP || {};\nVP.OUTLINE = " + JSON.stringify(out) + ";\n");
console.log("outlines", Object.keys(out).length, (fs.statSync(path.join(__dirname, "js", "outlines.js")).size / 1024).toFixed(0) + "KB");
