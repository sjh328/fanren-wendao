/* v36 视觉验收截图（judge 双视口六屏，选题按 docs/PLAN_V36.md「测试与回归要求」）：
 * 桌面 1440×900 ×3：
 *   1) 修炼·今日修行卡（悟道行 todo/可悟 + 聚灵新口径「已点燃 · 3 日内修炼 ×1.5（余 N 日）」）——E219/E218
 *   2) 万宝阁·塔绩兑换所（器魂五枚新项 + 纳财日限两次 + 雷晶核境界加价）——E221
 *   3) 战斗·意图栏（技能型敌人直伤区间 ≈lo~hi 与 附毒/禁锢/资源型标注）——E229
 * 移动 390×844 ×3：
 *   4) 问道录·温书模式（抉择卡纯文本化 + 前尘所选一行说明 + foot「继 续」钮）——E199
 *   5) 玩法手册（四成五回收 / 离线六成 120 日 / 悬赏三日一换——UI.FACTS 拼串）——E231/E215/E216
 *   6) 宗门·大比开幕 + 派系面板（丹鼎 perk 成丹率 +8% 与七五折秘藏 900）——E213/E226
 * 运行前提：node server.mjs（localhost:8341）。输出 gui-test-screenshots/sv36_*.png，stdout 逐行打印路径。 */
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
  await page.evaluate(() => { document.getElementById('create-name').value = '正本道人'; Game.actions['st-start']({}, null); });
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
    p.counters = Object.assign(p.counters, { wins: 260, battles: 300, explores: 60, towerWins: 260, towerBest: 18, signs: 30, forges: 4, maxDepth: 4 });
    p.signStreak = 5; p.signDay = Math.floor(p.day);
    p.sect = { id: 'qingyun', contrib: 9200, peakContrib: 9200, faction: 'danding', questsDone: 4, tasks: [] };
    p._claimDay = Math.floor(p.day); p._claimCount = 4;
    p.gongfa = { gf_qingyun: { level: 4, exp: 10 }, gf_wanjian: { level: 3, exp: 30 } };
    p.battleDeck = ['gf_wanjian', 'gf_qingyun'];
    p.equipped = {
      weapon: { id: 'w_sanqing', enhance: 10, affixes: { prefix: 'shawei' }, stars: { prefix: 1 } },
      armor: { id: 's_xt_jia', enhance: 8, affixes: { prefix: 'yugu', suffix: 'jingji' } },
      accessory: { id: 's_xt_pei', enhance: 5, affixes: { suffix: 'ningqi' } },
    };
    p.cave = { lv: 4, dongtian: 1, plots: [
      { seed: 'seed_lingcao', crop: 'm_lingcao', plantedDay: Math.floor(p.day) - 5, days: 12, wateredDay: -1 },
      { seed: 'seed_lingzhi', crop: 'm_lingzhi', plantedDay: Math.floor(p.day) - 9, days: 14, wateredDay: Math.floor(p.day) },
      { seed: 'seed_xuelian', crop: 'm_xuelian', plantedDay: Math.floor(p.day) - 2, days: 19, wateredDay: -1, pested: true },
    ], builds: { beast: 2, train: 2, lib: 1, forge: 2, spring: 2, treasury: 1 } };
    p.beasts = { list: [
      { uid: 1, id: 'm_lang', name: '苍狼王', species: 'beast', power: 22, level: 10, exp: 200, bond: 84, patDay: -1, tactic: 'guard', skills: [{ name: '兽王撕咬', kind: 'bleed', pct: 4.5, rounds: 2 }] },
      { uid: 2, id: 'm_dushe', name: '青斑毒蟒', species: 'snake', power: 19, level: 8, exp: 90, bond: 42, patDay: Math.floor(p.day), skills: [{ name: '淬毒獠牙', kind: 'poison', pct: 3, rounds: 3 }] },
    ], active: 1, active2: null, nextId: 3 };
    p.tower = { best: 18, today: { day: Math.floor(p.day), used: 1, bought: 0, stones: 0, stonesRedeemDay: -1, stonesRedeemN: 0 }, run: null };
    // v36 E219/E218：悟道行可悟态（insight≥20 未悟）+ 聚灵窗口内 ok 态（点燃次日 → 余 2 日）
    p.insight = 45; p.fortune = 60; p.karma = 6; p.poison = 10;
    p._wuDaoDay = -1;
    p.rushDay = Math.floor(p.day) - 1;
    p.reputation = 88;
    p.quest = { ch: 6, side: {}, bonus: {} };
    p.personal = { n1: 3, n17: 2 };
    // v36 E199：温书模式前置——c2_end 已看且当年抉择有记录（前尘所选数据源）
    p.story = { seen: { c2_end: 10, c1_end: 8 }, mid: {}, choices: { c2_end: 'copy', k2_map_method: 'copy' }, flags: {} };
    p.world = p.world || { nextEventYear: 3, history: [{ type: 'lingchao', year: 2 }], magicMaps: [], preachUntil: 0, ruinsUntil: 0, warUntil: 0, lingchaoUntil: 0, beastMaps: [], market: null, rebuildUntil: 0, turmoilUntil: 0, lingyiUntil: 0, _evResched34: true };
    p.world.nextEventYear = 3; p.world._evResched34 = true;
    // v36 E213/E226：大比进行中（第 3 年开幕）+ 丹鼎派系已站队（perk 与七五折面板）
    p.sect.tourney = { round: 0, wins: 0, openDay: Math.floor(p.day) };
    p.sect.lastTourney = 3;
    Game.subTab = { shop: 'market', cave: 'home', map: 'world', jianghu: 'list' };
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
// 1. 修炼页顶：今日修行卡（悟道行 + 聚灵窗口口径）——E219/E218
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/sv36_d_dailycard.png' });
console.log('gui-test-screenshots/sv36_d_dailycard.png');
// 2. 万宝阁：塔绩兑换所（器魂五枚新项 + 纳财日限两次 + 雷晶核加价）——E221
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'shop' }); });
await sleep(400);
await page.evaluate(() => { const dc = [...document.querySelectorAll('.shop-section-title')].find(c => c.textContent.includes('塔绩兑换所')); if (dc) dc.scrollIntoView({ block: 'center' }); });
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/sv36_d_tower-redeem.png' });
console.log('gui-test-screenshots/sv36_d_tower-redeem.png');
// 3. 战斗意图栏：技能型敌人直伤区间 + 附毒/禁锢/资源型标注——E229
await page.evaluate(() => {
  const e = (typeof buildMonster === 'function' ? buildMonster('m_jianling') : null) || buildMonster('m_lang');
  e.skills = [
    { name: '冰弦裂魂', kind: 'freeze', rounds: 1, w: 5 },
    { name: '噬血咒', kind: 'bleed', pct: 3, rounds: 2, w: 5 },
    { name: '阴风摄灵', kind: 'mpburn', pct: 25, w: 3 },
  ];
  e.hp = e.hpMax;
  Battle.start(null, { enemy: e, mapName: '意图栏验收' });
});
await sleep(900);
await page.evaluate(() => {
  const intent = document.querySelector('.intent-tag');
  if (intent) intent.scrollIntoView({ block: 'center' });
});
await sleep(300);
await page.screenshot({ path: 'gui-test-screenshots/sv36_d_battle-intent.png' });
console.log('gui-test-screenshots/sv36_d_battle-intent.png');
await page.evaluate(() => { if (Battle.active) { Battle.active.over = true; Battle.active.busy = true; } Battle.end(); });
await sleep(300);

console.log('mobile pass');
await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
// 4. 问道录·温书模式：c2_end 重读翻至抉择卡（纯文本 + 前尘所选 + foot 继 续）——E199
await page.evaluate(() => {
  QuestSys.reread('c2_end');
});
await sleep(600);
// 纯鼠标连点「继 续」直至抉择/细察卡（自停场景无 foot 前进由 foot 承担——温书态全部有 foot）
await page.evaluate(async () => {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  for (let i = 0; i < 40; i++) {
    const c = Story.cur;
    if (!c) break;
    const sc = c.scenes[c.idx];
    if (sc && (sc.t === 'choice' || sc.t === 'investigate')) break;   // 温书抉择卡停住入镜
    const btn = document.querySelector('#story-box [data-action="story-next"]');
    if (!btn) break;
    btn.click();
    await wait(60);
  }
});
await sleep(400);
await page.screenshot({ path: 'gui-test-screenshots/sv36_m_wenshu.png' });
console.log('gui-test-screenshots/sv36_m_wenshu.png');
await page.evaluate(() => { Story.close(); });
await sleep(200);
// 5. 玩法手册：四成五回收 / 离线六成 120 日 / 悬赏三日一换（UI.FACTS 拼串）——E231/E215/E216
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'shop' }); });
await sleep(400);
await page.evaluate(() => { UI.helpModal(); });
await sleep(500);
await page.evaluate(() => {
  const folds = [...document.querySelectorAll('#popup-body details.fold')];
  const target = folds.find(d => /杂录|营生/.test(d.querySelector('summary')?.textContent || ''));
  if (target) { target.open = true; target.scrollIntoView({ block: 'start' }); }
});
await sleep(300);
await page.screenshot({ path: 'gui-test-screenshots/sv36_m_manual.png' });
console.log('gui-test-screenshots/sv36_m_manual.png');
await page.evaluate(() => { UI.popupChoose(-1); });
await sleep(300);
// 6. 宗门：大比进行中 + 派系面板（丹鼎 perk + 七五折秘藏 900）——E213/E226
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'sect' }); });
await sleep(500);
await page.evaluate(() => {
  const tourney = [...document.querySelectorAll('.card-title, .shop-section-title')].find(c => c.textContent.includes('大比'));
  if (tourney) tourney.scrollIntoView({ block: 'start' });
});
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/sv36_m_sect-faction.png' });
console.log('gui-test-screenshots/sv36_m_sect-faction.png');

await browser.close();
console.log('done: 6 screenshots in gui-test-screenshots/');
