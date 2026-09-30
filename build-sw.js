/* 오프라인용 서비스워커 만들기: 앱 파일과 아이콘 전체를 미리 저장
 *   node build-sw.js   (파일을 고친 뒤 한 번 실행하면 버전이 올라가 새로 받는다)
 */
const fs = require("fs");
const path = require("path");
const root = __dirname;
const files = ["./", "index.html", "manifest.json", "css/app.css", "js/icons.js", "js/core.js", "js/tasks.js", "js/app.js", "icons/app-icon.svg", "icons/app-icon-512.png"];
for (const d of ["icons/c", "icons/k"]) for (const f of fs.readdirSync(path.join(root, d))) files.push(`${d}/${f}`);
const ver = "vpwb-" + new Date().toISOString().replace(/\D/g, "").slice(0, 12);
const sw = `/* 자동 생성 — build-sw.js */
const CACHE = "${ver}";
const FILES = ${JSON.stringify(files)};
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => { if (e.request.method !== "GET" || new URL(e.request.url).origin !== self.location.origin) return; e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request))); });
`;
fs.writeFileSync(path.join(root, "sw.js"), sw);
console.log("sw.js", ver, files.length + "개 파일");
