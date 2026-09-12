/* v28 冒烟：移动端单行顶栏/五键底栏/更多面板 + 桌面回归 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].find(f => f && fs.existsSync(f));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

async function boot(viewport) {
  await page.setViewport(viewport);
  await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle0' });
  await sleep(400);
  await page.evaluate(() => { Save.remove('3'); Save.remove('auto'); Game.actions['st-newgame']({ slot: '3' }); });
  await sleep(250);
  await page.evaluate(() => { document.getElementById('create-name').value = '重光道人'; Game.actions['st-start']({}, null); });
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
  await sleep(250);
}

fs.mkdirSync('gui-test-screenshots', { recursive: true });

// 移动端
await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.evaluate(() => { document.querySelectorAll('#announce .announce-item, #toast .toast-item').forEach(el => el.remove()); });
await sleep(200);
await page.screenshot({ path: 'gui-test-screenshots/v28-m-home.png' });
// 开更多面板
await page.evaluate(() => { UI.toggleMore(); });
await sleep(500);
await page.screenshot({ path: 'gui-test-screenshots/v28-m-sheet.png' });
// 点面板里的 宗门（锁定→toast）与 悬赏板（锁定→toast），再点 功法（未锁）
await page.evaluate(() => { [...document.querySelectorAll('#more-sheet .sheet-main')].find(b => b.dataset.tab === 'gongfa')?.click(); });
await sleep(400);
await page.screenshot({ path: 'gui-test-screenshots/v28-m-gongfa.png' });
// 道途抽屉再验证
await page.evaluate(() => { Game.actions['act-drawer']({ panel: 'left' }); });
await sleep(500);
await page.screenshot({ path: 'gui-test-screenshots/v28-m-drawer.png' });
const mHit = await page.evaluate(() => {
  const pl = document.getElementById('panel-left');
  const r = pl.getBoundingClientRect();
  const hit = document.elementFromPoint(r.x + r.width / 2, Math.min(r.y + 200, window.innerHeight - 10));
  return { inPanel: hit ? pl.contains(hit) : false, hit: hit && (hit.id || hit.className) };
});
console.log('mobile drawer hit:', JSON.stringify(mHit));

// 桌面
await boot({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await page.evaluate(() => { document.querySelectorAll('#announce .announce-item, #toast .toast-item').forEach(el => el.remove()); });
await sleep(200);
await page.screenshot({ path: 'gui-test-screenshots/v28-d-cultivate.png' });
console.log('desktop errors so far:', errs.length);
console.log('SMOKE DONE');
await browser.close();
if (errs.length) { console.log('ERRORS:\n' + errs.slice(0, 10).join('\n')); process.exit(1); }
