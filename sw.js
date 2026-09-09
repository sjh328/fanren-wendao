/* ======================================================================
 * v24 追加：Service Worker（PWA 离线游玩）
 * 策略：
 *   · 页面导航：网络优先（新版本 HTML 即刻生效），断网回落缓存
 *   · 同源静态资源（game.js?v=N / style.css?v=N / 图标）：stale-while-revalidate
 *     —— 先给缓存（离线可玩），后台顺手更新；?v=N 变更即新 URL，天然免缓存污染
 *   · Google Fonts（字体 CSS/woff2）：运行时缓存，首访后离线也有书卷气
 * 升级提示：改动 sw.js 时把 VERSION 常量 +1 即可，旧缓存自动清空。
 * ====================================================================== */
const VERSION = 'fanren-wd-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 页面导航：网络优先，断网回落
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  const cacheable = url.origin === self.location.origin
    || url.hostname === 'fonts.googleapis.com'
    || url.hostname === 'fonts.gstatic.com';
  if (!cacheable) return;

  // 静态资源：stale-while-revalidate
  e.respondWith(
    caches.match(req).then((hit) => {
      const fetching = fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || fetching;
    })
  );
});
