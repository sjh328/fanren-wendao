/* v34 视觉验收截图：桌面 1440×900 ×3（洞府·一键照料 / 奇市·拍期将止+热度 / 修炼·悟道调息）
 *              移动 390×844 ×3（云归·离线小结 / 游历·黄历连签 / 问道·主线进度轨） */
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
  await page.evaluate(() => { document.getElementById('create-name').value = '通脉道人'; Game.actions['st-start']({}, null); });
  await sleep(600);
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => {
      const t = document.getElementById('tutorial');
      if (t && !t.className.includes('hidden')) { t.querySelector('[data-action="tut-skip"]')?.click(); return 1; }
      const sm = document.getElementById('story-modal');
      if (sm && !sm.className.includes('hidden')) { (document.querySelector('.story-opt') || document.querySelector('[data-action="story-next"]'))?.click(); return 1; }
      const pm = document.getElementById('popup-modal');
      if (pm && !pm.className.includes('hidden')) { [...pm.querySelectorAll('.popup-btns .btn')].find(x => /确定|继续|收下|踏上|合上/.test(x.textContent))?.click(); return 1; }
      return 0;
    });
    if (!st) break;
    await sleep(120);
  }
  await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 7; p.layer = 2; p.exp = 9000000; p.age = 76;
    p.attrs = { gen: 8, comp: 9, luck: 8, body: 8 };
    p.stones = { low: 99000, mid: 660, high: 12 };
    p.dao = 'sword';
    p.counters = Object.assign(p.counters, { wins: 190, battles: 280, explores: 80, towerWins: 90, towerBest: 36, signs: 40, forges: 6, maxDepth: 6 });
    p.signStreak = 5; p.signDay = Math.floor(p.day) - 1;
    p.sect = { id: 'qingyun', contrib: 8600, peakContrib: 8600, faction: null, questsDone: 4, tasks: [] };
    p.gongfa = { gf_qingyun: { level: 4, exp: 10 }, gf_wanjian: { level: 3, exp: 30 } };
    p.battleDeck = ['gf_wanjian', 'gf_qingyun'];
    p.equipped = {
      weapon: { id: 'w_sanqing', enhance: 12, affixes: { prefix: 'shawei' }, stars: { prefix: 2 } },
      armor: { id: 's_xt_jia', enhance: 9, affixes: { prefix: 'yugu', suffix: 'jingji' } },
      accessory: { id: 's_xt_pei', enhance: 6, affixes: { suffix: 'ningqi' } },
    };
    p.qihun = 34;
    p.cave = { lv: 5, dongtian: 2, plots: [
      { seed: 'm_lingcao', crop: 'm_lingcao', plantedDay: Math.floor(p.day) - 5, days: 12, wateredDay: -1 },
      { seed: 'm_lingzhi', crop: 'm_lingzhi', plantedDay: Math.floor(p.day) - 9, days: 14, wateredDay: Math.floor(p.day) },
      { seed: 'm_xuelian', crop: 'm_xuelian', plantedDay: Math.floor(p.day) - 2, days: 16, wateredDay: -1 },
    ], builds: { beast: 2, train: 3, lib: 2, forge: 2, spring: 2, treasury: 2 } };
    p.beasts = { list: [
      { uid: 1, id: 'm_lang', name: '苍狼王', species: 'beast', power: 22, level: 10, exp: 200, bond: 84, patDay: -1, tactic: 'guard', skills: [{ name: '兽王撕咬', kind: 'bleed', pct: 4.5, rounds: 2 }] },
      { uid: 2, id: 'm_dushe', name: '青斑毒蟒', species: 'snake', power: 19, level: 8, exp: 90, bond: 42, patDay: Math.floor(p.day), skills: [{ name: '淬毒獠牙', kind: 'poison', pct: 3, rounds: 3 }] },
    ], active: 1, active2: null, nextId: 3 };
    p.tower = { best: 36, today: { day: Math.floor(p.day), used: 1, bought: 0, stones: 0 }, run: null };
    p.insight = 78; p.fortune = 60; p.karma = 6; p.poison = 10;
    p.reputation = 88;
    p.quest = { ch: 8, side: {}, bonus: {} };
    p.personal = { n1: 3, n17: 3, n23: 2 };
    p.world = p.world || { nextEventYear: 3, history: [{ type: 'lingchao', year: 2 }], magicMaps: [], preachUntil: 0, ruinsUntil: 0, warUntil: 0, lingchaoUntil: 0, beastMaps: [], market: null, rebuildUntil: 0, turmoilUntil: 0, lingyiUntil: 0, _evResched34: true };
    p.world.nextEventYear = 3; p.world._evResched34 = true;
    Game.subTab = { shop: 'odd', cave: 'home', map: 'world' };
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
// 1. 洞府主页：一键照料按钮 + 洞天营造（先验料后扣钱）+ 灵田/灵兽概览
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cave' }); });
await sleep(400);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v34-d-cave-care.png' });
// 2. 奇市拍卖：围观热度 + 拍期将止（≤3 日 danger tag）
await page.evaluate(() => {
  const p = Game.player;
  p.auction = { item: 's_xy_jian', seq: 3, views: 7, base: 30000, until: Math.floor(p.day) + 2 };
  UI.markDirty('all'); UI.renderAll();
  Game.actions['act-tab']({ tab: 'shop:odd' });
});
await sleep(400);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v34-d-auction-urgent.png' });
// 3. 修炼页：悟道（新收益口径）+ 调息（+2 感悟）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await page.evaluate(() => { const dc = [...document.querySelectorAll('.card')].find(c => c.textContent.includes('悟道') || c.textContent.includes('调息')); if (dc) dc.scrollIntoView({ block: 'start' }); });
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v34-d-cultivate.png' });

console.log('mobile pass');
await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
// 4. 云归·离线小结（离线重做的回家仪式）
await page.evaluate(async () => {
  const p = Game.player;
  p.cave.builds.spring = 2;
  const snap = { v: 1, player: JSON.parse(JSON.stringify(p)), meta: { name: p.name, realmText: 'x', day: Math.floor(p.day), age: p.age, ts: Date.now() - 90 * 60000, dead: false } };
  localStorage.setItem('fanren_wd_auto', JSON.stringify(snap));
  localStorage.setItem('fanren_wd_3', JSON.stringify(snap));
  Game.player = null;   // 防 beforeunload 自动存档把构造的旧 ts 覆盖成 now
  UI.renderStart();
});
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(800);
  await page.click('[data-action="st-load"][data-slot="3"]');
  await sleep(1200);
const showed = await page.evaluate(() => {
  const t = (document.getElementById('popup-title') || {}).textContent || '';
  return t.includes('离 线 小 结');
});
console.log('offline summary popup:', showed);
await clearTransient('popup-modal');
await page.screenshot({ path: 'gui-test-screenshots/v34-m-offline.png' });
await page.evaluate(() => { UI.closePopup?.(); });
// 5. 游历·天下：黄历连签进度（连签第 6/7 日）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'map:world' }); });
await sleep(400);
await page.evaluate(() => { const sc = document.querySelector('.sign-card'); if (sc) sc.scrollIntoView({ block: 'start' }); });
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v34-m-sign.png' });
// 6. 问道·主线进度轨
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'quest' }); });
await sleep(400);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v34-m-quest.png' });

await browser.close();
console.log('done: 6 screenshots in gui-test-screenshots/');
