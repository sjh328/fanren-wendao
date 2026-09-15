/* v31 视觉验收截图：桌面 1440×900 ×3（修炼·仙阶卡+仙途条四阶节点 / 坊市·祭炼堂连祭炼+祝福徽标 / 游历·塔绩兑换所雷晶核加价）
 *              移动 390×844 ×3（修炼主页·仙阶卡 / 轮回镜·仙籍行 / 存档弹窗·重看引导+文件导入+存储占用） */
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
  await page.evaluate(() => { document.getElementById('create-name').value = '登仙道人'; Game.actions['st-start']({}, null); });
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
    p.realmIdx = 9; p.layer = 3; p.exp = 2500000000; p.age = 96;
    p.attrs = { gen: 8, comp: 9, luck: 8, body: 8 };
    p.stones = { low: 68000, mid: 320, high: 9 };
    p.dao = 'sword';
    p.flags.ascended = true;   // v31 仙阶：飞升后
    p.xianjie = { idx: 1, layer: 1 };
    p.counters = Object.assign(p.counters, { xianyuan: 13400, wins: 210, battles: 300, explores: 90, towerWins: 96, towerBest: 41 });
    p.sect = { id: 'qingyun', contrib: 9200, faction: null, tasks: [
      { type: 'cult', target: null, need: 400000, progress: 130000, name: '参悟剑心', desc: '门中差事 · 参悟剑心：累计获得修为 400000' },
    ] };
    p.gongfa = { gf_qingyun: { level: 4, exp: 10 }, gf_wanjian: { level: 3, exp: 30 } };
    p.equipped = {
      weapon: { id: 'w_sanqing', enhance: 12, affixes: { prefix: 'shawei' } },
      armor: { id: 'a_xianpao', enhance: 9, affixes: { prefix: 'yugu' } },
      accessory: { id: 's_xy_huan', enhance: 6, affixes: { suffix: 'ningqi' } },
    };
    p.enhBless = { w_sanqing: 40 };
    p.qihun = 34;
    p.cave = { lv: 5, dongtian: 2, plots: [], builds: { beast: 2, train: 3, lib: 2, forge: 2, spring: 2, treasury: 2 } };
    p.benming = { lv: 6 };
    p.beasts = { list: [{ uid: 1, id: 'm_lang', name: '苍狼王', species: 'beast', power: 22, level: 10, exp: 200, bond: 84, skills: [{ name: '兽王撕咬', kind: 'bleed', pct: 4.5, rounds: 2 }, { name: '裂地重扑', kind: 'stun', rounds: 1 }, { name: '守主之啸', kind: 'weaken', pct: 18, rounds: 2 }] }], active: 1, active2: null, nextId: 2 };
    p.tower = { best: 41, today: { day: Math.floor(p.day), used: 1, bought: 0, stones: 0 }, run: null };
    p.insight = 62; p.fortune = 66; p.karma = 6; p.poison = 12;
    p.reputation = 96;
    p.quest = { ch: 9, side: {}, bonus: {} };
    p.personal = { n1: 3, n8: 3, n21: 3 };
    Game.subTab = { shop: 'forge', cave: 'home', map: 'tower' };
    UI.markDirty('all');
    UI.renderAll();
  });
  await sleep(300);
}

fs.mkdirSync('gui-test-screenshots', { recursive: true });
async function clearTransient() {
  await page.evaluate(() => {
    document.querySelectorAll('#announce .announce-item').forEach(el => el.remove());
    document.querySelectorAll('#toast .toast-item').forEach(el => el.remove());
  });
  await sleep(250);
}

console.log('desktop pass');
await boot({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await page.evaluate(() => { document.querySelector('.xian-card')?.scrollIntoView({ block: 'center' }); });
await sleep(300);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v31-d-cultivate-xian.png' });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'shop:forge' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v31-d-forge.png' });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'map:tower' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v31-d-tower.png' });

console.log('mobile pass');
await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await page.evaluate(() => { document.querySelector('.xian-card')?.scrollIntoView({ block: 'center' }); });
await sleep(300);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v31-m-home.png' });
await page.evaluate(() => {
  const legacy = ReincarnationSys.readLegacy();
  legacy.xianjieBest = 1;
  legacy.pastLives = legacy.pastLives || [];
  legacy.pastLives.push({ no: 1, who: '登仙道人（渡劫期）', life: '白日飞升，仙门之外' });
  ReincarnationSys.writeLegacy(legacy);
  Game.actions['act-mirror']();
});
await sleep(200);
await page.evaluate(() => { const b = document.getElementById('popup-body'); if (b) b.scrollTop = b.scrollHeight; });
await sleep(500);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v31-m-mirror.png' });
await page.evaluate(() => { UI.closePopup(); Game.actions['act-save-open'](); });
await sleep(500);
await page.evaluate(() => { const b = document.getElementById('popup-body'); if (b) b.scrollTop = b.scrollHeight; });
await sleep(200);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v31-m-save.png' });

await browser.close();
console.log('SHOTS DONE');
