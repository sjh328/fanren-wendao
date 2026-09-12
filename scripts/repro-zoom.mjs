/* 验证：设置→界面字号 110%（根级 zoom）后，移动端抽屉是否仍正常 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(f => fs.existsSync(f));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle0' });
await sleep(400);
await page.evaluate(() => { Save.remove('3'); Save.remove('auto'); Game.actions['st-newgame']({ slot: '3' }); });
await sleep(250);
await page.evaluate(() => { document.getElementById('create-name').value = '缩放道人'; Game.actions['st-start']({}, null); });
await sleep(700);
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
// 开 110% 大字号，再开抽屉
await page.evaluate(() => { Ambience.applyFontScale(110); Game.actions['act-drawer']({ panel: 'left' }); });
await sleep(700);
const diag = await page.evaluate(() => {
  const pl = document.getElementById('panel-left');
  const r = pl.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, Math.min(r.y + 200, window.innerHeight - 10));
  return {
    zoom: getComputedStyle(document.documentElement).zoom,
    panelRect: { x: r.x, y: r.y, w: r.width, h: r.height },
    hit: hit ? hit.tagName + (hit.id ? '#' + hit.id : '') : null,
    inPanel: hit ? pl.contains(hit) : null,
    innerW: window.innerWidth,
  };
});
console.log(JSON.stringify(diag, null, 2));
fs.mkdirSync('gui-test-screenshots', { recursive: true });
await page.screenshot({ path: 'gui-test-screenshots/v28-repro-zoom.png' });
await browser.close();
