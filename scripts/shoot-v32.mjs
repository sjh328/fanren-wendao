/* v32 视觉验收截图：桌面 1440×900 ×3（战斗·意图预估+势标签+凝神钮 / 坊市·祭炼堂套装炼化+器魂阶梯 / 游历·秘境地脉规则）
 *              移动 390×844 ×3（修炼页·悟道按钮 / 兽栏·协战策略 / 轮回镜·印记分账+15 层树） */
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
  await page.evaluate(() => { document.getElementById('create-name').value = '点睛道人'; Game.actions['st-start']({}, null); });
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
    p.counters = Object.assign(p.counters, { wins: 190, battles: 280, explores: 80, towerWins: 90, towerBest: 36 });
    p.sect = { id: 'qingyun', contrib: 8600, faction: null, questsDone: 4, tasks: [
      { type: 'kill', target: 'm_chilin', need: 4, progress: 2, name: '讨伐 · 赤鳞蛇', desc: '门中差事 · 讨伐：击杀 赤鳞蛇 ×4' },
    ] };
    p.gongfa = { gf_qingyun: { level: 4, exp: 10 }, gf_wanjian: { level: 3, exp: 30 } };
    p.battleDeck = ['gf_wanjian', 'gf_qingyun'];
    p.equipped = {
      weapon: { id: 'w_sanqing', enhance: 12, affixes: { prefix: 'shawei' }, stars: { prefix: 2 } },
      armor: { id: 's_xt_jia', enhance: 9, affixes: { prefix: 'yugu', suffix: 'jingji' } },   // v32：凑玄天两件触发套装炼化区
      accessory: { id: 's_xt_pei', enhance: 6, affixes: { suffix: 'ningqi' } },
    };
    p.qihun = 34;
    p.setForge = { xuantian: 2 };
    p._recastN = { w_sanqing: 1 };
    p.cave = { lv: 5, dongtian: 2, plots: [], builds: { beast: 2, train: 3, lib: 2, forge: 2, spring: 2, treasury: 2 } };
    p.benming = { lv: 6 };
    p.beasts = { list: [{ uid: 1, id: 'm_lang', name: '苍狼王', species: 'beast', power: 22, level: 10, exp: 200, bond: 84, tactic: 'guard', skills: [{ name: '兽王撕咬', kind: 'bleed', pct: 4.5, rounds: 2 }, { name: '裂地重扑', kind: 'stun', rounds: 1 }, { name: '守主之啸', kind: 'weaken', pct: 18, rounds: 2 }] }], active: 1, active2: null, nextId: 2 };
    p.tower = { best: 36, today: { day: Math.floor(p.day), used: 1, bought: 0, stones: 0 }, run: null };
    p.insight = 78; p.fortune = 60; p.karma = 6; p.poison = 10;
    p.reputation = 88;
    p.quest = { ch: 8, side: {}, bonus: {} };
    p.personal = { n1: 3, n17: 3, n23: 2 };
    Game.subTab = { shop: 'forge', cave: 'home', map: 'dungeon' };
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
    // v32 重拍修正：残留 modal 的毛玻璃遮罩与空 toast 胶囊曾毁掉桌面三屏——
    // 除指定保留者外一律强制隐藏，toast/announce 容器整个藏掉
    document.querySelectorAll('.modal').forEach(el => {
      if (el.id !== keep) el.classList.add('hidden');
    });
    const t = document.getElementById('toast'); if (t) t.style.display = 'none';
    const a = document.getElementById('announce'); if (a) a.style.display = 'none';
    const dr = document.getElementById('drawer-backdrop'); if (dr) dr.classList.remove('on');
    const ms = document.getElementById('more-sheet'); if (ms) { ms.classList.add('hidden'); ms.classList.remove('on'); }
  }, keepModal);
  await sleep(300);
}

console.log('desktop pass');
await boot({ width: 1440, height: 900, deviceScaleFactor: 1 });
// 1. 战斗面板：意图预估 + 势标签 + 凝神钮
await page.evaluate(() => {
  const p = Game.player;
  Battle.start('m_tianlong', { mapName: '演武 · 知彼' });   // v32 重拍修正：m_lang 非有效怪物 id，空 battle-modal 曾是整屏毛玻璃元凶
  if (Battle.active) {
    Battle.active.lastSkillTag = '攻'; Battle.active.skillChain = 2;   // 预置连携势标签便于验收
    Battle.active.intent = { kind: 'strike', heavy: true };   // 预置重击意图——意图伤害预估区间只对攻击类出手输出
    Battle.render();
    Battle.render();
  }
});
await sleep(900);
await page.evaluate(() => { document.getElementById('battle-modal')?.classList.remove('hidden'); });
await sleep(300);
await clearTransient('battle-modal');
await page.screenshot({ path: 'gui-test-screenshots/v32-d-battle.png' });
await page.evaluate(() => { if (Battle.active) Battle.end(false); });
// 2. 祭炼堂：套装炼化 + 器魂阶梯 + 词缀星
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'shop:forge' }); });
await sleep(400);
await page.evaluate(() => { const sec = document.getElementById('set-forge-sec'); if (sec) sec.scrollIntoView({ block: 'start' }); else window.scrollTo(0, 600); });   // v32：套装炼化入视口，下缘带出熔铸回收器魂行
await sleep(300);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v32-d-forge.png' });
// 3. 秘境：地脉规则
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'map' }); });
await sleep(400);
await page.evaluate(() => { try { DungeonSys.enter(3); } catch (e) {} const lw = document.getElementById('log-wrap'); if (lw && lw.classList.contains('collapsed')) Game.actions['log-toggle'](); });   // v32：展开日志——折叠态只显最新一条，地脉行会被开门行顶掉
await sleep(500);
await clearTransient(null);
await page.screenshot({ path: 'gui-test-screenshots/v32-d-dungeon.png' });
await page.evaluate(() => { const p2 = Game.player; if (p2.dungeon) p2.dungeon = null; UI.markDirty('all'); UI.renderAll(); });

console.log('mobile pass');
await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
// 4. 修炼页：悟道按钮
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v32-m-cultivate.png' });
// 5. 兽栏：协战策略
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cave:beast' }); });
await sleep(400);
await page.evaluate(() => { document.querySelector('.fold.npc-more summary')?.click(); });
await sleep(300);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v32-m-beast.png' });
// 6. 轮回镜：印记分账 + 15 层树
await page.evaluate(() => {
  const legacy = ReincarnationSys.readLegacy();
  legacy.marks = 14; legacy.marksEarned = 30; legacy.treeExtra = 2; legacy.lives = 3;
  legacy.xianjieBest = 0;
  legacy.pastLives = [{ no: 1, who: '点睛道人（金丹期）', life: '一生行止，留待后说' }, { no: 2, who: '点睛道人（元婴期）', life: '一生行止，留待后说' }];
  ReincarnationSys.writeLegacy(legacy);
  Game.actions['act-mirror']();
});
await sleep(300);
await page.evaluate(() => { const b = document.getElementById('popup-body'); if (b) b.scrollTop = 0; });   // v32 重拍：分账口径在弹窗顶部
await sleep(500);
await clearTransient('popup-modal');
await page.screenshot({ path: 'gui-test-screenshots/v32-m-mirror.png' });

await browser.close();
console.log('SHOTS DONE');
