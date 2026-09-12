/* v28 复现：移动端点「道途」抽屉后画面变暗、不可操作 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find(f => f && fs.existsSync(f));
const URL = 'http://localhost:8341/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 300000, executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.on('console', m => { const t = m.type(); if (t === 'error' || t === 'warning') console.log('[console.' + t + ']', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));

await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto(URL, { waitUntil: 'networkidle0' });
await sleep(400);
await page.evaluate(() => { Save.remove('3'); Save.remove('auto'); Game.actions['st-newgame']({ slot: '3' }); });
await sleep(250);
await page.evaluate(() => { document.getElementById('create-name').value = '复现道人'; Game.actions['st-start']({}, null); });
await sleep(600);
for (let i = 0; i < 80; i++) {
  const st = await page.evaluate(() => {
    const t = document.getElementById('tutorial');
    if (t && !t.className.includes('hidden')) { t.querySelector('[data-action="tut-skip"]')?.click(); return 1; }
    const sm = document.getElementById('story-modal');
    if (sm && !sm.className.includes('hidden')) { (document.querySelector('.story-opt') || document.querySelector('[data-action="story-next"]'))?.click(); return 1; }
    const pm = document.getElementById('popup-modal');
    if (pm && !pm.className.includes('hidden')) { [...pm.querySelectorAll('.popup-btns .btn')].find(x => /确定|继续|收下|踏上/.test(x.textContent))?.click(); return 1; }
    return 0;
  });
  if (!st) break;
  await sleep(120);
}
await sleep(300);

// 点「☰ 道途」抽屉按钮
await page.evaluate(() => { Game.actions['act-drawer']({ panel: 'left' }); });
await sleep(700);   // 等过渡结束

const diag = await page.evaluate(() => {
  const out = { errors: [] };
  const pl = document.getElementById('panel-left');
  const bd = document.getElementById('drawer-backdrop');
  const cs = el => el ? getComputedStyle(el) : null;
  const p = cs(pl), b = cs(bd);
  out.panel = p && { position: p.position, zIndex: p.zIndex, transform: p.transform, top: p.top, left: p.left, width: p.width, height: p.height, opacity: p.opacity, filter: p.filter, willChange: p.willChange, contain: p.contain, zoom: p.zoom, classes: pl.className };
  out.backdrop = b && { zIndex: b.zIndex, opacity: b.opacity, pointerEvents: b.pointerEvents, position: b.position };
  // 沿祖先链找层叠上下文元凶
  out.ancestors = [];
  let el = pl?.parentElement;
  while (el) {
    const c = cs(el);
    const sus = {};
    if (c.transform !== 'none') sus.transform = c.transform;
    if (c.filter !== 'none') sus.filter = c.filter;
    if (c.willChange !== 'auto') sus.willChange = c.willChange;
    if (c.contain !== 'none') sus.contain = c.contain;
    if (parseFloat(c.opacity) < 1) sus.opacity = c.opacity;
    if (c.zoom && c.zoom !== '1') sus.zoom = c.zoom;
    if (c.isolation === 'isolate') sus.isolation = c.isolation;
    if (c.perspective !== 'none') sus.perspective = c.perspective;
    if (c.backdropFilter && c.backdropFilter !== 'none') sus.backdropFilter = c.backdropFilter;
    if (Object.keys(sus).length) out.ancestors.push({ tag: el.tagName + (el.id ? '#' + el.id : '') + '.' + [...el.classList].join('.'), ...sus });
    el = el.parentElement;
  }
  // 面板中心点命中测试：抽屉打开时中心应命中面板内部元素
  const r = pl.getBoundingClientRect();
  out.panelRect = { x: r.x, y: r.y, w: r.width, h: r.height };
  const cx = r.x + r.width / 2, cy = Math.min(r.y + 200, window.innerHeight - 10);
  const hit = document.elementFromPoint(cx, cy);
  out.hitAt = { cx, cy, hit: hit ? hit.tagName + (hit.id ? '#' + hit.id : '') + '.' + [...hit.classList].join('.') : null, inPanel: hit ? pl.contains(hit) : null };
  // 根/正文字号 zoom 现场
  out.root = { htmlZoom: cs(document.documentElement).zoom, bodyZoom: cs(document.body).zoom, innerW: window.innerWidth, dpr: window.devicePixelRatio };
  return out;
});
console.log(JSON.stringify(diag, null, 2));

fs.mkdirSync('gui-test-screenshots', { recursive: true });
await page.screenshot({ path: 'gui-test-screenshots/v28-repro-drawer.png' });
await browser.close();
console.log('REPRO DONE');
