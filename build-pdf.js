/* 인쇄용 PDF 만들기 (Microsoft Edge 헤드리스 사용)
 *   node build-pdf.js sample          → 샘플 두 권
 *   node build-pdf.js full            → 유아용·청소년용 × 영역 8권 (영역별 분책)
 *   node build-pdf.js full A kid      → 한 영역·한 테마만
 * 결과: D:\OT\워크북\시지각\
 */
const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const EDGE = ["C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((p) => fs.existsSync(p));
const OUT = "D:/OT/워크북/시지각";
const PAGE = "file:///" + path.resolve(__dirname, "print.html").replace(/\\/g, "/");
const THEMES = { kid: "유아용", teen: "청소년용" };
const AREA_NAME = { A: "시각주의탐색", B: "시각변별", C: "전경배경", D: "형태항상성", E: "공간관계", F: "시각완성", G: "시각기억", H: "시각운동협응" };

function print(query, file) {
  const out = path.join(OUT, file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  execFileSync(EDGE, ["--headless=new", "--disable-gpu", "--no-pdf-header-footer", "--virtual-time-budget=20000", `--print-to-pdf=${out}`, `${PAGE}?${query}`], { stdio: "ignore" });
  console.log("✔", file, (fs.statSync(out).size / 1024).toFixed(0) + "KB");
}

const [mode, onlyArea, onlyTheme] = process.argv.slice(2);
if (mode === "new") {
  for (const t of Object.keys(THEMES)) print(`theme=${t}&sample=new&cover=0&credit=0`, `새유형샘플_${THEMES[t]}.pdf`);
} else if (mode === "sample") {
  for (const t of Object.keys(THEMES)) print(`theme=${t}&sample=1`, `샘플_${THEMES[t]}.pdf`);
} else if (mode === "full") {
  for (const t of Object.keys(THEMES)) {
    if (onlyTheme && onlyTheme !== t) continue;
    for (const a of Object.keys(AREA_NAME)) {
      if (onlyArea && onlyArea !== a) continue;
      print(`theme=${t}&areas=${a}&pages=1-10&log=1`, `${THEMES[t]}/${a}_${AREA_NAME[a]}_${THEMES[t]}.pdf`);
    }
  }
} else {
  console.log("사용법: node build-pdf.js sample | full [영역] [kid|teen]");
}
