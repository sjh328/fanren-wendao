/* v33 视觉验收截图：桌面 1440×900 ×3（战斗·身被禁锢+地脉tag / 奇市·拍卖围观热度 / 炼制坊·开炉工费）
 *              移动 390×844 ×3（修炼·今日修行卡连签计程 / 游历·黄历连签进度 / 问道录·抉择树回响计数） */
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
  await page.evaluate(() => { document.getElementById('create-name').value = '回响道人'; Game.actions['st-start']({}, null); });
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
    p.realmIdx = 7; p.layer = 2; p.exp = 900000; p.age = 76;
    p.attrs = { gen: 8, comp: 9, luck: 8, body: 8 };
    p.stones = { low: 99000, mid: 660, high: 12 };
    p.dao = 'sword';
    p.flags.ascended = false;
    p.counters = Object.assign(p.counters, { wins: 190, battles: 280, explores: 80, towerWins: 90, towerBest: 36, signs: 40, forges: 6, maxDepth: 6 });
    p.signStreak = 5; p.signDay = Math.floor(p.day) - 1;   // v33：连签第 6/7 日进度
    p.sect = { id: 'qingyun', contrib: 8600, faction: null, questsDone: 4, tasks: [
      { type: 'kill', target: 'm_chilin', need: 4, progress: 2, name: '讨伐 · 赤鳞蛇', desc: '门中差事 · 讨伐：击杀 赤鳞蛇 ×4' },
    ] };
    p.gongfa = { gf_qingyun: { level: 4, exp: 10 }, gf_wanjian: { level: 3, exp: 30 } };
    p.battleDeck = ['gf_wanjian', 'gf_qingyun'];
    p.equipped = {
      weapon: { id: 'w_sanqing', enhance: 12, affixes: { prefix: 'shawei' }, stars: { prefix: 2 } },
      armor: { id: 's_xt_jia', enhance: 9, affixes: { prefix: 'yugu', suffix: 'jingji' } },
      accessory: { id: 's_xt_pei', enhance: 6, affixes: { suffix: 'ningqi' } },
    };
    p.qihun = 34;
    p.setForge = { xuantian: 2 };
    p._recastN = { w_sanqing: 1 };
    p.cave = { lv: 5, dongtian: 2, plots: [], builds: { beast: 2, train: 3, lib: 2, forge: 2, spring: 2, treasury: 2 } };
    p.benming = { lv: 6 };
    p.beasts = { list: [{ uid: 1, id: 'm_lang', name: '苍狼王', species: 'beast', power: 22, level: 10, exp: 200, bond: 84, tactic: 'guard', skills: [{ name: '兽王撕咬', kind: 'bleed', pct: 4.5, rounds: 2 }] }], active: 1, active2: null, nextId: 2 };
    p.tower = { best: 36, today: { day: Math.floor(p.day), used: 1, bought: 0, stones: 0 }, run: null };
    p.insight = 78; p.fortune = 60; p.karma = 6; p.poison = 10;
    p.reputation = 88;
    p.quest = { ch: 8, side: {}, bonus: {} };
    p.personal = { n1: 3, n17: 3, n23: 2 };
    // v33：抉择回响样例（抉择树计数 + 回响旗标）
    p.story = p.story || { seen: {}, mid: {}, choices: {}, flags: {} };
    Object.assign(p.story.choices, { c1_end: 'vengeance', c2_end: 'copy', c4_end: 'mercy', c5_end: 'accept', k1_promise: 'vengeance', k5_past_accept: 'accept', k4_dilemma_answer: 'mercy' });
    Object.assign(p.story.flags, { k2_relic_seen: true, k6_first_survive: true });
    p.flags.visionLeichi = true;   // 仙绩行
    Game.subTab = { shop: 'odd', cave: 'home', map: 'dungeon' };
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
// 1. 战斗：身被禁锢 tag + 地脉规则 tag + 必杀置灰
await page.evaluate(() => {
  Battle.start('m_tianlong', { mapName: '演武 · 规则一致' });
  if (Battle.active) {
    Battle.active.enemy._realmRule = '剑气禁制——守敌攻 +15%';   // v33（E109/D6）：地脉规则战内可见
    Battle.active.myFx = [{ kind: 'stun', rounds: 1 }];          // v33（E67/D3）：被控——按钮置灰+意图栏提示
    Battle.active.intent = { kind: 'strike', heavy: true };
    Battle.render();
  }
});
await sleep(900);
await page.evaluate(() => { document.getElementById('battle-modal')?.classList.remove('hidden'); });
await sleep(300);
await clearTransient('battle-modal');
await page.screenshot({ path: 'gui-test-screenshots/v33-d-battle.png' });
await page.evaluate(() => { if (Battle.active) Battle.end(false); });
// 2. 奇市：拍卖围观热度 + 古匣日限标签
await page.evaluate(() => {
  const p = Game.player;
  p.auction = { item: 's_xy_jian', seq: 3, views: 7, base: 30000, until: Math.floor(p.day) + 40 };
  UI.markDirty('all'); UI.renderAll();
  Game.actions['act-tab']({ tab: 'shop:odd' });
});
await sleep(400);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v33-d-auction.png' });
// 3. 炼制坊：开炉工费
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'shop:craft' }); });
await sleep(400);
await page.evaluate(() => { const rows = [...document.querySelectorAll('.shop-row')]; const t = rows.find(r => r.textContent.includes('屠龙刀')); if (t) t.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 800); });
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v33-d-forgefee.png' });

console.log('mobile pass');
await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
// 4. 修炼页：今日修行卡连签计程
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await page.evaluate(() => { const dc = [...document.querySelectorAll('.card')].find(c => c.textContent.includes('今日修行')); if (dc) dc.scrollIntoView({ block: 'start' }); });
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v33-m-dailycard.png' });
// 5. 游历·天下：黄历连签进度（黄历卡挂在 world 子页签下）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'map:world' }); });
await sleep(400);
await page.evaluate(() => { const sc = document.querySelector('.sign-card'); if (sc) sc.scrollIntoView({ block: 'start' }); });
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v33-m-sign.png' });
// 6. 问道录·抉择树回响计数
await page.evaluate(() => { QuestSys.openArchive('choices'); });
await sleep(500);
await clearTransient('popup-modal');
await page.screenshot({ path: 'gui-test-screenshots/v33-m-choices.png' });
await page.evaluate(() => { UI.closePopup?.(); });

await browser.close();
console.log('done: 6 screenshots in gui-test-screenshots/');
