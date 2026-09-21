/* ======================================================================
 * shoot.mjs —— v37（E262）：视觉验收截图参数化工具（合并原 shoot 系列十份同构脚本）
 * 用法：node scripts/shoot.mjs <version> --desktop tab1,tab2,tab3 --mobile tab4,tab5,tab6
 *   · version   版本号（仅用于截图文件名前缀 sv<version>_*.png）
 *   · desktop   桌面 1440×900 依序截图的页签（deep-link 形态，如 cult / shop:market / map:realm）
 *   · mobile    移动 390×844 依序截图的页签（缺省则跳过移动视口）
 * 每屏：boot（新建 3 号档 + 中期养成态注入）→ 深链跳转 → 截图 → stdout 打印路径。
 * 运行前提：node server.mjs（localhost:8341）。B9 judge 双视口六屏验收即用本工具。
 * ====================================================================== */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const args = process.argv.slice(2);
const ver = (args.find(a => !a.startsWith('--')) || '').replace(/^v/i, '');
if (!ver) {
  console.error('✗ 用法：node scripts/shoot.mjs <version> [--desktop tab1,tab2,tab3] [--mobile tab4,tab5,tab6]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] || '').split(',').filter(Boolean) : def;
};
const DESKTOP = opt('--desktop', ['cultivate', 'shop:market', 'map:realm']);
const MOBILE = opt('--mobile', []);

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find(f => f && fs.existsSync(f));
const URL = 'http://localhost:8341/index.html';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
fs.mkdirSync('gui-test-screenshots', { recursive: true });

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 300000, executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();

async function boot(viewport) {
  await page.setViewport(viewport);
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(400);
  await page.evaluate(() => { Save.remove('3'); Save.remove('auto'); Game.actions['st-newgame']({ slot: '3' }); });
  await sleep(250);
  await page.evaluate(() => { document.getElementById('create-name').value = '清源道人'; Game.actions['st-start']({}, null); });
  await sleep(600);
  // 教程/剧情/弹窗逐个清场（新建档的开篇链）
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
  // 中期养成态注入（承 shoot-v36 画像，供各页签有内容可拍）
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
      weapon: { id: 'w_sanqing', enhance: 12, affixes: { prefix: 'shawei' }, stars: { prefix: 1 }, mech: 'combochase' },
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
    p.tower = { best: 18, today: { day: Math.floor(p.day), used: 1, bought: 0, stones: 0, exp: 0, stonesRedeemDay: -1, stonesRedeemN: 0 }, run: null };
    // v37 E219/E277：悟道行可悟态 + 聚灵窗口内 ok 态；v37 E244/E246：功勋与携往生记档
    p.insight = 45; p.fortune = 60; p.karma = 6; p.poison = 10;
    p._wuDaoDay = -1;
    p.rushDay = Math.floor(p.day) - 1;
    p.rankHonor = 2; p.pastXianyuan = 0;
    p.reputation = 88;
    p.quest = { ch: 6, side: {}, bonus: {} };
    p.personal = { n1: 3, n17: 2 };
    p.story = { seen: { c2_end: 10, c1_end: 8, c7_open: 5 }, mid: {}, choices: { c2_end: 'copy', k2_map_method: 'copy' }, flags: {} };
    p.world = p.world || { nextEventYear: 3, history: [{ type: 'lingchao', year: 2 }], magicMaps: [], preachUntil: 0, ruinsUntil: 0, warUntil: 0, lingchaoUntil: 0, beastMaps: [], market: null, rebuildUntil: 0, turmoilUntil: 0, lingyiUntil: 0, _evResched34: true, _eraRecal37: true };
    p.world.nextEventYear = 3; p.world._evResched34 = true;
    p.sect.tourney = { round: 0, wins: 0, openDay: Math.floor(p.day) };
    p.sect.lastTourney = 3;
    Game.subTab = { shop: 'market', cave: 'home', map: 'world', jianghu: 'list' };
    UI.markDirty('all');
    UI.renderAll();
  });
  await sleep(300);
}

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

async function shoot(tab, i, tag) {
  const isHelp = tab === 'help';
  await page.evaluate((t) => {
    // v37：'help' 为伪页签——先切问道页再开玩法手册弹窗（手册无独立页签，沿 v36 拍法）
    if (t === 'help') { Game.actions['act-tab']({ tab: 'quest' }); UI.helpModal(); return; }
    Game.actions['act-tab']({ tab: t });
  }, tab);
  await sleep(700);
  await clearTransient(isHelp ? 'popup-modal' : null);
  const file = `gui-test-screenshots/sv${ver}_${tag}${i + 1}_${tab.replace(/[:/]/g, '-')}.png`;
  await page.screenshot({ path: file });
  console.log('✓ ' + file);
}

if (DESKTOP.length) {
  await boot({ width: 1440, height: 900, deviceScaleFactor: 1 });
  let i = 0;
  for (const tab of DESKTOP) { await shoot(tab, i, 'd'); i++; }
}
if (MOBILE.length) {
  await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  let i = 0;
  for (const tab of MOBILE) { await shoot(tab, i, 'm'); i++; }
}
await browser.close();
console.log(`✅ sv${ver} 截图完成：桌面 ${DESKTOP.length} 屏 + 移动 ${MOBILE.length} 屏`);
