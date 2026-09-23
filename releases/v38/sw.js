/* ======================================================================
 * v24 追加：Service Worker（PWA 离线游玩）
 * 策略：
 *   · 页面导航：网络优先（新版本 HTML 即刻生效），断网回落缓存
 *   · 同源静态资源（game.js?v=N / style.css?v=N / 图标）：stale-while-revalidate
 *     —— 先给缓存（离线可玩），后台顺手更新；?v=N 变更即新 URL，天然免缓存污染
 *   · Google Fonts（字体 CSS/woff2）：运行时缓存，首访后离线也有书卷气
 * 升级提示：改动 sw.js 时把 VERSION 常量 +1 即可，旧缓存自动清空。
 * ====================================================================== */
const VERSION = 'fanren-wd-v13';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './game.js?v=54',     // v32 修瑕（E47）：预缓存主资源——原缺 game.js/style.css，首访离线打开 HTML 404 白屏
  './style.css?v=54',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/favicon-32.png',
  './icons/apple-touch-icon.png',   // v30：iOS 离线首装图标补齐（index.html 已引用）
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
      // v34（G5）：同 cache 内陈旧 ?v=N-1 条目清理——release bump ?v 后旧 query 条目原永不清除，
      // 随版本无限累积；按 index.html 当前引用重建预缓存清单，其余 game.js/style.css 条目删除
      .then(() => self.rebuildPrecache())
      .then(() => self.clients.claim())
  );
});

// v34（G5）：以当前 CORE 清单为白名单重整 cache——先放入新条目，再删除同名资源的旧 query 条目
self.rebuildPrecache = async function () {
  const cache = await caches.open(VERSION);
  const wanted = new Set();
  for (const url of CORE) {
    try {
      await cache.add(url);
      wanted.add(new URL(url, self.location).href);
    } catch (err) { /* 离线安装期预缓存失败不阻塞 */ }
  }
  const keys = await cache.keys();
  await Promise.all(keys.map((r) => {
    if (wanted.has(r.href)) return null;
    const u = new URL(r.href);
    const staleCore = CORE.some((c) => u.pathname === new URL(c, self.location).pathname);
    return staleCore ? cache.delete(r) : null;   // 只清主资源的旧变体，其余照常保留
  }));
};

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
