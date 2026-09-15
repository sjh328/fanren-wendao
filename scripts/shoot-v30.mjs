/* v30 视觉验收截图：桌面 1440×900 ×3（修炼·轮回镜按钮+仙途 / 坊市·祭炼堂词缀重铸+器魂 / 游历·登天塔塔绩兑换）
 *              移动 390×844 ×3（修炼主界面 / 问道·内容完成度总览 / 洞府·洞天营造） */
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
  await page.evaluate(() => { document.getElementById('create-name').value = '大器道人'; Game.actions['st-start']({}, null); });
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
    p.realmIdx = 4; p.layer = 2; p.exp = 40000; p.age = 27;
    p.attrs = { gen: 7, comp: 9, luck: 7, body: 7 };
    p.stones = { low: 52000, mid: 260, high: 6 };
    p.dao = 'sword';
    p.sect = { id: 'qingyun', contrib: 4200, faction: null, tasks: [
      { type: 'kill', target: 'm_shikui', need: 4, progress: 4, name: '剑试诸锋', desc: '门中差事 · 剑试诸锋：击杀 遗迹石傀 ×4' },
      { type: 'cult', target: null, need: 4000, progress: 1300, name: '参悟剑心', desc: '门中差事 · 参悟剑心：累计获得修为 4000' },
    ] };
    p.gongfa = { gf_qingyun: { level: 3, exp: 10 }, gf_wanjian: { level: 2, exp: 30 } };
    p.equipped = {
      weapon: { id: 'w_sanqing', enhance: 8, affixes: { prefix: 'shawei' } },
      armor: { id: 'a_xuangui', enhance: 6, affixes: { prefix: 'yugu' } },
      accessory: { id: 'z_qiankun', enhance: 3, affixes: { suffix: 'ningqi' } },
    };
    p.qihun = 26;
    p.cave = { lv: 5, dongtian: 1, plots: [
      { seed: 'seed_lingzhi', crop: 'm_lingzhi', days: 10, plantedDay: Math.floor(p.day) - 9 },
      { seed: 'seed_bingpo', crop: 'm_bingpo', days: 22, plantedDay: Math.floor(p.day) - 6 },
      null, null, null, null,
    ], builds: { beast: 1, train: 2, lib: 1, forge: 1, spring: 1, treasury: 1 } };
    p.beasts = { list: [{ uid: 1, id: 'm_lang', name: '苍狼', species: 'beast', power: 12, level: 6, exp: 200, bond: 66, skills: [{ name: '兽王撕咬', kind: 'bleed', pct: 3, rounds: 2 }] }], active: 1, active2: null, nextId: 2 };
    p.counters = Object.assign(p.counters, { wins: 120, battles: 160, explores: 40, towerWins: 62, towerBest: 34, towerBestAll: 0 });
    p.tower = { best: 34, today: { day: Math.floor(p.day), used: 1, bought: 0, stones: 0 }, run: null };
    p.insight = 62; p.fortune = 46; p.karma = 6; p.poison = 12;
    p.quest = { ch: 5, side: {}, bonus: {} };
    p.personal = { n1: 3, n8: 2, n21: 1 };
    const st = Stat.compute(p); p.hp = Math.round(st.maxHp * 0.78); p.mp = Math.round(st.maxMp * 0.6);
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
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v30-d-cultivate.png' });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'shop:forge' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v30-d-forge.png' });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'map:tower' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v30-d-tower.png' });

console.log('mobile pass');
await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v30-m-home.png' });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'quest' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v30-m-quest.png' });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cave:home' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v30-m-cave.png' });

await browser.close();
console.log('SHOTS DONE');
