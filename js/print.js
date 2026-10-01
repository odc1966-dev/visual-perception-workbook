/* 인쇄용 책 조립: print.html?theme=kid&areas=ABCDEFGH&levels=1,2,3&pages=1-10
 * sample=1 이면 영역×레벨마다 한 쪽씩(유아용은 홀수 쪽, 청소년용은 짝수 쪽 → 두 권을 합치면 모든 유형이 보임)
 */
(function (VP) {
  const q = new URLSearchParams(location.search);
  const theme = q.get("theme") === "teen" ? "teen" : "kid";
  const areas = (q.get("areas") || "ABCDEFGH").split("");
  const levels = (q.get("levels") || "1,2,3").split(",").map(Number);
  const [p0, p1] = (q.get("pages") || "1-10").split("-").map(Number);
  const sample = q.get("sample") === "1";
  const kid = theme === "kid";
  // 그림 사실성: pic=3d(기본)|flat|line, line=line(기본)|real
  VP.STYLE = { pic: q.get("pic") || "3d", lineTasks: q.get("line") || "line" };
  const book = document.getElementById("book");
  const THEME_NAME = { kid: "유아·초등 저학년용", teen: "초등 고학년·청소년용" };
  const MASCOT = { kid: ["1F989", "1F407", "1F43F"], teen: [] };
  const stars = (l) => "★".repeat(l) + "☆".repeat(3 - l);
  const pages = [];

  function el(html) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function cover() {
    const areaList = VP.AREA_ORDER.filter((a) => areas.includes(a)).map((a) => `<div><b style="background:${VP.AREAS[a].color}">${a}</b>${VP.AREAS[a].name[theme]}${kid ? "" : ""}</div>`).join("");
    const m = kid ? `<div class="mascots">${MASCOT.kid.map((h) => `<img src="${VP.iconUrl(h)}">`).join("")}</div>` : "";
    return `<section class="page cover ${theme}">${m}<h1>시지각 워크북</h1><div class="sub">${THEME_NAME[theme]}${sample ? " · 샘플" : ""}</div><div class="areas">${areaList}</div><div class="note">★☆☆ 1단계 · ★★☆ 2단계 · ★★★ 3단계</div></section>`;
  }

  function page(p) {
    const A = VP.AREAS[p.area];
    const code = `${p.area}-${p.level}-${String(p.no).padStart(2, "0")}`;
    const mascot = kid ? `<img class="mascot" src="${VP.iconUrl(MASCOT.kid[(p.no + p.level) % 3])}">` : "";
    const rec = kid ? `<div class="rec">날짜 <span></span></div>` : `<div class="rec">날짜 <span></span> 정답 <span></span> 시간 <span></span></div>`;
    const hd = kid
      ? `<div class="hd"><div class="badge" style="background:${A.color}">${p.area}</div><div class="ttl">${A.name.kid}</div><div class="lv" style="color:${A.color}">${stars(p.level)}</div><div class="sp"></div>${rec}${mascot}</div>`
      : `<div class="hd"><div class="badge" style="background:${A.color}">${p.area}</div><div><div class="ttl">${A.name.teen}</div><div class="code">MISSION ${code}</div></div><div class="lv" style="color:${A.color}">${stars(p.level)}</div><div class="sp"></div>${rec}</div>`;
    // v2 장점 반영: 문항마다 카드 + 번호 배지 (한 쪽에 문항이 여러 개일 때)
    const list = p.items.filter((it) => it.mode !== "label");
    const multi = list.length > 1;
    let no = 0;
    const items = p.items.map((it) => it.mode === "label" ? it.svg : `<div class="card${multi ? "" : " single"}" data-mode="${it.mode}">${multi ? `<span class="num">${++no}</span>` : ""}${it.svg}</div>`).join("");
    return `<section class="page ${theme}" style="--acc:${A.color};--tint:${A.color}1c">${hd}<div class="instr">${p.instr}</div><div class="items">${items}</div><div class="ft"><span>시지각 워크북 · ${THEME_NAME[theme]}</span><span>${code}</span></div></section>`;
  }

  function logSheet() {
    const rowsH = [...Array(22)].map(() => "<tr><td></td><td></td><td></td><td></td><td></td><td></td></tr>").join("");
    return `<section class="page ${theme}"><div class="hd" style="--tint:#eee"><div class="ttl">회기 기록지</div><div class="sp"></div><div class="rec">아동 코드 <span></span></div></div><table class="log"><tr><th style="width:18mm">날짜</th><th style="width:22mm">쪽 번호</th><th style="width:22mm">정답/문항</th><th style="width:18mm">시간</th><th style="width:26mm">도움 정도</th><th>관찰</th></tr>${rowsH}</table><div class="ft"><span>도움 정도: 독립 · 언어 단서 · 시범 · 신체 도움</span><span></span></div></section>`;
  }

  function credit() {
    return `<section class="page ${theme}"><div class="hd" style="--tint:#eee"><div class="ttl">그림 출처</div></div><div class="credit"><p>사실적 3D 그림: <b>Microsoft Fluent Emoji 3D</b> — Copyright (c) Microsoft Corporation, MIT License<br>https://github.com/microsoft/fluentui-emoji</p><p>선화(윤곽선) 그림과 단순 컬러 그림: <b>OpenMoji</b> – the open-source emoji and icon project. License: CC BY-SA 4.0<br>https://openmoji.org · https://github.com/hfg-gmuend/openmoji</p><p>격자, 도형, 선, 미로 등 나머지 그림은 문항 생성 프로그램으로 새로 만든 것입니다.</p></div></section>`;
  }

  if (q.get("cover") !== "0") pages.push(cover());
  for (const a of areas) for (const l of levels) {
    const nk = VP.AREAS[a].kinds[l].length;
    if (q.get("sample") === "new") {
      // 새로 추가한 유형만 한 쪽씩
      const NEW = q.get("kinds") ? q.get("kinds").split(",") : ["A_numPath", "A_trail", "B_seq", "B_rows", "D_pair", "F_pie"];
      for (let k = 1; k <= nk; k++) { const pg = VP.makePage(a, l, theme, k); if (NEW.includes(pg.kind)) pages.push(page(pg)); }
    } else if (sample) pages.push(page(VP.makePage(a, l, theme, kid ? 1 : 2)));
    else for (let n = p0; n <= p1; n++) pages.push(page(VP.makePage(a, l, theme, n)));
  }
  if (q.get("log") === "1") pages.push(logSheet());
  if (q.get("credit") !== "0") pages.push(credit());
  book.innerHTML = pages.join("");

  // 하나 고르기 문항: 선택지 아래에 ○ 표시 칸 (v2 장점 반영)
  const NS = "http://www.w3.org/2000/svg";
  document.querySelectorAll('.card[data-mode="one"] > svg').forEach((sv) => {
    const hs = [...sv.querySelectorAll(".hit > .hitbox")].map((r) => ({ x: +r.getAttribute("x"), y: +r.getAttribute("y"), w: +r.getAttribute("width"), h: +r.getAttribute("height") }));
    if (hs.length < 2) return;
    const bottoms = hs.map((h) => h.y + h.h), maxB = Math.max(...bottoms);
    const oneRow = Math.max(...bottoms) - Math.min(...bottoms) < 3 && hs.every((h, i) => !i || Math.abs(h.x - hs[i - 1].x) > 3);
    if (!oneRow) return;
    const vb = sv.getAttribute("viewBox").split(" ").map(Number);
    const extra = 6;
    vb[3] = Math.max(vb[3], maxB + extra);
    sv.setAttribute("viewBox", vb.join(" "));
    hs.forEach((h) => {
      const c = document.createElementNS(NS, "circle");
      c.setAttribute("cx", h.x + h.w / 2); c.setAttribute("cy", maxB + 3); c.setAttribute("r", 2.2);
      c.setAttribute("fill", "#fff"); c.setAttribute("stroke", "#868e96"); c.setAttribute("stroke-width", 0.35);
      sv.appendChild(c);
    });
  });

  // 문항이 넘치는 쪽은 그림 폭을 줄여 한 쪽에 맞춘다
  document.querySelectorAll(".page .items").forEach((box) => {
    for (let t = 0; t < 4 && box.scrollHeight > box.clientHeight + 1; t++) {
      const k = box.clientHeight / box.scrollHeight;
      box.querySelectorAll("svg.it").forEach((sv) => { const w = sv.getBoundingClientRect().width; sv.style.width = w * k * 0.98 + "px"; });
    }
  });

  // 모든 그림이 로드되면 표시 (인쇄 스크립트가 기다린다)
  const imgs = [...document.images];
  const svgImgs = document.querySelectorAll("image").length;
  Promise.all(imgs.map((i) => (i.complete ? 1 : new Promise((r) => (i.onload = i.onerror = r))))).then(() => {
    setTimeout(() => (document.body.dataset.ready = "1"), 300 + svgImgs * 2);
  });
})(window.VP);
