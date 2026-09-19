/* v35 视觉验收截图：桌面 1440×900 ×3（洞府·一键照料+修行卡新行 / 坊市·符坊画符新定价+宗门领赏日限 / 江湖·行游在外+切磋日限）
 *              移动 390×844 ×3（游历·黄历断签标红 / 修炼·今日修行卡浇水抚兽行 / 问道·主线） */
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

async function boot(viewport) {
  await page.setViewport(viewport);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(400);
  await page.evaluate(() => { Save.remove('3'); Save.remove('auto'); Game.actions['st-newgame']({ slot: '3' }); });
  await sleep(250);
  await page.evaluate(() => { document.getElementById('create-name').value = '淬锋道人'; Game.actions['st-start']({}, null); });
  await sleep(600);
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => {
      const t = document.getElementById('tutorial');
      if (t && !t.className.includes('hidden')) { t.querySelector('[data-action="tut-skip"]')?.click(); return 1; }
      const sm = document.getElementById('story-modal');
      if (sm && !sm.className.includes('hidden')) { (document.querySelector('.story-opt') || document.querySelector('[data-action="story-next"]'))?.click(); return 1; }
      const pm = document.getElementById('popup-modal');
      if (pm && !pm.className.includes('hidden')) { [...pm.querySelectorAll('.popup-btns .btn')].find(x => /确定|继续|收下|踏上|合上|稳步/.test(x.textContent))?.click(); return 1; }
      return 0;
    });
    if (!st) break;
    await sleep(120);
  }
  await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 5; p.layer = 2; p.exp = 300000; p.age = 46;
    p.attrs = { gen: 8, comp: 9, luck: 8, body: 8 };
    p.stones = { low: 320000, mid: 60, high: 4 };
    p.dao = 'talisman';
    p.counters = Object.assign(p.counters, { wins: 120, battles: 180, explores: 60, towerWins: 40, towerBest: 18, signs: 30, forges: 4, maxDepth: 4 });
    p.signStreak = 5; p.signDay = Math.floor(p.day) - 10;   // v35：断签标红（超三日容差）
    p.sect = { id: 'qingyun', contrib: 9200, peakContrib: 9200, faction: null, questsDone: 4, tasks: [] };
    p._claimDay = Math.floor(p.day); p._claimCount = 4;   // v35：领赏余量 2/6
    p.gongfa = { gf_qingyun: { level: 4, exp: 10 }, gf_wanjian: { level: 3, exp: 30 } };
    p.battleDeck = ['gf_wanjian', 'gf_qingyun'];
    p.equipped = {
      weapon: { id: 'w_sanqing', enhance: 10, affixes: { prefix: 'shawei' }, stars: { prefix: 1 } },
      armor: { id: 's_xt_jia', enhance: 8, affixes: { prefix: 'yugu', suffix: 'jingji' } },
      accessory: { id: 's_xt_pei', enhance: 5, affixes: { suffix: 'ningqi' } },
    };
    p.cave = { lv: 4, dongtian: 1, plots: [
      { seed: 'm_lingcao', crop: 'm_lingcao', plantedDay: Math.floor(p.day) - 5, days: 12, wateredDay: -1 },
      { seed: 'm_lingzhi', crop: 'm_lingzhi', plantedDay: Math.floor(p.day) - 9, days: 14, wateredDay: Math.floor(p.day) },
      { seed: 'm_xuelian', crop: 'm_xuelian', plantedDay: Math.floor(p.day) - 2, days: 16, wateredDay: -1, pested: true },
    ], builds: { beast: 2, train: 2, lib: 1, forge: 2, spring: 2, treasury: 1 } };
    p.beasts = { list: [
      { uid: 1, id: 'm_lang', name: '苍狼王', species: 'beast', power: 22, level: 10, exp: 200, bond: 84, patDay: -1, tactic: 'guard', skills: [{ name: '兽王撕咬', kind: 'bleed', pct: 4.5, rounds: 2 }] },
      { uid: 2, id: 'm_dushe', name: '青斑毒蟒', species: 'snake', power: 19, level: 8, exp: 90, bond: 42, patDay: Math.floor(p.day), skills: [{ name: '淬毒獠牙', kind: 'poison', pct: 3, rounds: 3 }] },
    ], active: 1, active2: null, nextId: 3 };
    p.tower = { best: 18, today: { day: Math.floor(p.day), used: 1, bought: 0, stones: 0 }, run: null };
    p.insight = 78; p.fortune = 60; p.karma = 6; p.poison = 10;
    p.reputation = 88;
    p.quest = { ch: 6, side: {}, bonus: {} };
    p.personal = { n1: 3, n17: 2 };
    p.world = p.world || { nextEventYear: 3, history: [{ type: 'lingchao', year: 2 }], magicMaps: [], preachUntil: 0, ruinsUntil: 0, warUntil: 0, lingchaoUntil: 0, beastMaps: [], market: null, rebuildUntil: 0, turmoilUntil: 0, lingyiUntil: 0, _evResched34: true };
    p.world.nextEventYear = 3; p.world._evResched34 = true;
    Game.subTab = { shop: 'craft', cave: 'home', map: 'world', jianghu: 'list' };
    UI.markDirty('all');
    UI.renderAll();
  });
  await sleep(300);
}

fs.mkdirSync('gui-test-screenshots', { recursive: true });
async function clearTransient(keepModal = null) {
  await page.evaluate((keep) => {
    document.querySelectorAll('#announce .announce-item').forEach(el => el.remove());
    document.querySelectorAll('#toast .toast-item').forEach(el => el.remove());
    document.querySelectorAll('.modal').forEach(el => { if (el.id !== keep) el.classList.add('hidden'); });
    const t = document.getElementById('toast'); if (t) t.style.display = 'none';
    const a = document.getElementById('announce'); if (a) a.style.display = 'none';
    const dr = document.getElementById('drawer-backdrop'); if (dr) dr.classList.remove('on');
    const ms = document.getElementById('more-sheet'); if (ms) { ms.classList.add('hidden'); ms.classList.remove('on'); }
  }, keepModal);
  await sleep(300);
}

console.log('desktop pass');
await boot({ width: 1440, height: 900, deviceScaleFactor: 1 });
// 1. 修炼页顶：今日修行卡（浇水/抚兽/虫害行 + 一键行权）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v35-d-dailycard.png' });
// 2. 坊市·符坊：画符新定价（成本挂产量）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'shop:craft' }); });
await sleep(400);
await page.evaluate(() => { const dc = [...document.querySelectorAll('.shop-section-title')].find(c => c.textContent.includes('符坊')); if (dc) dc.scrollIntoView({ block: 'center' }); });
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v35-d-craft-draw.png' });
// 3. 宗门：领赏余量 + 差事指引
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'sect' }); });
await sleep(400);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v35-d-sect-claim.png' });

console.log('mobile pass');
await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
// 4. 游历·天下：黄历断签标红（连签已断 · 今日重新计程）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'map:world' }); });
await sleep(400);
await page.evaluate(() => { const sc = document.querySelector('.sign-card'); if (sc) sc.scrollIntoView({ block: 'start' }); });
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v35-m-sign-broken.png' });
// 5. 江湖：行游在外 tag + 切磋禁用
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'jianghu' }); });
await sleep(500);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v35-m-jianghu-away.png' });
// 6. 兽栏斗兽场：胜算预估
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cave:beast' }); });
await sleep(400);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v35-m-beast.png' });

await browser.close();
console.log('done: 6 screenshots in gui-test-screenshots/');
