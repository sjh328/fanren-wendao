/* v27 视觉验收截图：双视口六屏（桌面 1440×900 ×3 + 移动 390×844 ×3） */
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
  console.log('boot: opening slot');
  await page.evaluate(() => { Save.remove('3'); Save.remove('auto'); Game.actions['st-newgame']({ slot: '3' }); });
  await sleep(250);
  await page.evaluate(() => { document.getElementById('create-name').value = '归一道人'; Game.actions['st-start']({}, null); });
  console.log('boot: started');
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
  console.log('boot: injecting progress');
  // 注入一段有内容的进度：金丹·宗门·功法·灵兽·悬赏·洞府·灵田
  await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 2; p.layer = 1; p.exp = 200; p.age = 22;
    p.attrs = { gen: 7, comp: 8, luck: 6, body: 6 };
    p.stones = { low: 3600, mid: 42, high: 2 };
    p.dao = 'sword';
    p.sect = { id: 'qingyun', contrib: 1860, faction: null, tasks: [
      { type: 'kill', target: 'm_yezhu', need: 4, progress: 3, name: '讨伐 · 野猪王', desc: '击杀 野猪王 ×4' },
      { type: 'collect', target: 'm_lingcao', need: 5, progress: 5, name: '采集 · 灵草', desc: '上交 灵草 ×5' },
      { type: 'cult', target: null, need: 400, progress: 130, name: '修行 · 精进不休', desc: '累计获得修为 400' },
    ] };
    p.gongfa = { gf_qingyun: { level: 3, exp: 10 }, gf_wuxiang: { level: 2, exp: 30 } };
    p.equipped = { weapon: { id: 'w_qinggang', enhance: 3, affixes: { prefix: 'sharp' } }, armor: { id: 'a_huxin', enhance: 1 }, accessory: null };
    p.cave = { lv: 3, plots: [
      { seed: 'seed_lingcao', crop: 'm_lingcao', days: 6, plantedDay: Math.floor(p.day) - 7 },
      { seed: 'seed_lingzhi', crop: 'm_lingzhi', days: 12, plantedDay: Math.floor(p.day) - 4 },
      null, null,
    ], builds: { beast: 1, train: 1, lib: 0, forge: 0, spring: 1, treasury: 0 } };
    p.beasts = { list: [{ uid: 1, id: 'm_yezhu', name: '铁鬃野猪', species: 'beast', power: 9, level: 4, exp: 120, bond: 30, skills: [] }], active: 1, active2: null, nextId: 2 };
    p.bounties = { day: Math.floor(p.day), list: [
      { type: 'kill', target: 'm_lang', need: 4, progress: 4, name: '猎杀 · 苍狼', desc: '击杀 苍狼 ×4' },
      { type: 'collect', target: 'm_yaopi', need: 3, progress: 1, name: '收购 · 妖皮', desc: '上交 妖皮 ×3' },
      { type: 'spar', target: null, need: 1, progress: 0, name: '较技 · 以武会友', desc: '赢得一场切磋（江湖页发起）' },
    ] };
    p.npcs = p.npcs || {};
    for (const d of GameData.NPCS.slice(0, 6)) p.npcs[d.id] = { alive: true, met: true, rel: [-10, 35, 60, 5, -30, 80][p.npcs && Object.keys(p.npcs).length] || 20, realmIdx: 2, layer: 2, map: 'qingfeng', sparWins: 2, sparLoses: 1 };
    p.reputation = 95;
    p.counters = Object.assign(p.counters, { wins: 34, battles: 41, explores: 18, killsElite: 3, crafts: 6, craftsOk: 4, pills: 5, learns: 2, signs: 3 });
    p.insight = 34; p.fortune = 21; p.karma = 18; p.poison = 22; p.hp = 0.72; p.mp = 0.5;
    const st = Stat.compute(p); p.hp = Math.round(st.maxHp * 0.72); p.mp = Math.round(st.maxMp * 0.5);
    p.quest = { ch: 2, side: {}, bonus: {} };
    Game.subTab = { shop: 'craft', cave: 'home', map: 'atlas' };
    UI.markDirty('all');
    UI.renderAll();
  });
  console.log('boot: done');
  await sleep(300);
}

fs.mkdirSync('gui-test-screenshots', { recursive: true });

// v27 回路：公告（#announce）是 2 秒居中演出——截屏前清场，避免把瞬态演出拍成叠印
async function clearTransient() {
  await page.evaluate(() => {
    document.querySelectorAll('#announce .announce-item').forEach(el => el.remove());
    document.querySelectorAll('#toast .toast-item').forEach(el => el.remove());
  });
  await sleep(250);
}

console.log('desktop pass');
// 桌面三屏
await boot({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v27-d-cultivate.png' });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'quest' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v27-d-quest.png' });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'jianghu' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v27-d-jianghu.png' });

console.log('mobile pass');
// 移动三屏
await boot({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v27-m-cultivate.png' });
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'quest' }); });
await sleep(400);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v27-m-quest.png' });
await page.evaluate(async () => {
  Battle.start(null, { enemy: buildMonster('m_yezhu', 2), mapName: '青峰山' });
  await new Promise(r => setTimeout(r, 400));
});
await sleep(600);
await clearTransient();
await page.screenshot({ path: 'gui-test-screenshots/v27-m-battle.png' });

await browser.close();
console.log('SHOTS DONE');
