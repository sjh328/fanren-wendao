/* v19 新界面视觉验收：截图巡览（无断言）
 * 运行：node shots-v19.mjs（需先 node server.mjs）
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find(f => f && fs.existsSync(f)) || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8341/index.html';
const DIR = 'gui-test-screenshots';
fs.mkdirSync(DIR, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--window-size=1280,800'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 760 });
page.on('pageerror', e => console.log('PAGEERR:', String(e).slice(0, 160)));
let idx = 0;
const shot = async (tag) => {
  idx++;
  const p = `${DIR}/v19_${String(idx).padStart(2, '0')}_${tag}.png`;
  await page.screenshot({ path: p });
  console.log('shot:', p);
};

await page.goto(URL, { waitUntil: 'networkidle0' });
await sleep(600);

// 种子一个进度丰富的存档（筑基·剑修·宗门·人脉·营造·个人线·残玉）
const SEED = {
  name: '万象真人', attrs: { gen: 8, comp: 8, luck: 7, body: 7 }, realmIdx: 1, layer: 2, exp: 100,
  stones: { low: 60000, mid: 60, high: 3 }, dao: 'sword', sect: { id: 'qingyun', contrib: 1200, rank: 'inner' },
  hp: 800, mp: 300, poison: 10, insight: 20, fortune: 25, karma: 20, jade: 3,
  bag: { pill_juqi: 5, pill_liaoshang: 6, w_qinggang: 1, a_xingyi: 1, gf_tuna: 1, gf_jianxin: 1, tal_jinguang: 3, m_xuantie: 20, m_shentie: 4, m_jiaojin: 3, m_haixin: 2 },
  gongfa: { gf_tuna: { level: 4, exp: 0 }, gf_jianxin: { level: 3, exp: 10 } },
  equipped: { weapon: { id: 'w_qinggang', enhance: 3, affixes: { prefix: 'sharp', suffix: 'leech' } }, armor: { id: 'a_xingyi', enhance: 1, affixes: { suffix: 'shield' } }, accessory: null },
  day: 420, age: 18, quest: { ch: 3, side: { s1: true } },
  npcs: (() => { const o = {}; for (const d of [1, 2, 5, 6, 13, 22, 23]) { o['n' + d] = { realmIdx: 3, layer: 1, exp: 0, rel: 75, alive: true, map: 'village', met: true, grudge: false, pastLife: false, mem: [{ d: 100, t: 'story', x: '剧情同场' }, { d: 200, t: 'spar', x: '切磋获胜' }] }; } return o; })(),
  personal: { n1: 2 }, cave: { lv: 2, plots: [], builds: { beast: 1, train: 1, lib: 1 } },
  beasts: { active: null, active2: null, list: [{ uid: 1, id: 'm_yezhu', name: '野猪王', species: 'beast', power: 8, level: 5, exp: 0, skills: [{ name: '兽王撕咬', kind: 'bleed', pct: 3, rounds: 2 }], bond: 60 }], nextId: 2 },
  story: { seen: { c1_open: 1, c1_mid: 1, c1_end: 1, c2_open: 1, c2_mid: 1, c2_end: 1, c3_open: 1 }, mid: { c1: 1, c2: 1 }, choices: { c1_end: 'vengeance', c2_end: 'copy' }, flags: { k1_promise: true, k2_map_method: true } },
  chronicle: [{ d: 30, txt: '主线 · 第一章「尘缘」完结' }, { d: 120, txt: '渡劫功成，晋入筑基期' }, { d: 300, txt: '个人线【剑冢心猿】第二幕 落幕' }],
  flags: { tutorialDone: true, tut_r1: true }, xinmo: 55, benming: { lv: 2 },
};
await page.evaluate((seed) => {
  const p = PlayerFactory.migrate(seed);
  Game.player = p;
  Game.slot = 3;
  Save.autoSave(true);
}, SEED);
// 重新读档进入游戏，走正规入口
await page.reload({ waitUntil: 'networkidle0' });
await sleep(700);
await page.evaluate(() => {
  const d = JSON.parse(localStorage.getItem('fanren_wd_auto'));
  if (d) { Game.player = PlayerFactory.migrate(d.player); Game.slot = 3; }
});
await page.evaluate(() => { document.getElementById('start-screen').classList.add('hidden'); document.getElementById('game-screen').classList.remove('hidden'); UI.renderAll(); });
await sleep(600);
await shot('main_ui');

// 江湖页（肖像+主线定位+续谈）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'jianghu' }); });
await sleep(400);
await shot('jianghu');

// 坊市（拍卖行+布施+洗练+本命喂养）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'shop' }); });
await sleep(400);
await shot('shop_economy');

// 坊市底部（拍卖与布施区块）
await page.evaluate(() => { const el = document.getElementById('tab-content'); el.scrollTop = el.scrollHeight; });
await sleep(200);
await shot('shop_auction');

// 修炼页（心魔卡）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(300);
await shot('cultivate_xinmo');

// 洞府（营造）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cave' }); });
await sleep(300);
await shot('cave_builds');

// 问道录 · 人物志 / 年表 / 抉择树
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'quest' }); });
await sleep(300);
await page.evaluate(() => { UI.closePopup = UI.closePopup || (() => {}); QuestSys.openArchive('figures'); });
await sleep(400);
await shot('archive_figures');
await page.evaluate(() => { QuestSys.openArchive('chron'); });
await sleep(300);
await shot('archive_chron');
await page.evaluate(() => { QuestSys.openArchive('choices'); });
await sleep(300);
await shot('archive_choices');
await page.evaluate(() => { if (UI._popupResolve) UI.popupChoose(-1); });
await sleep(200);

// 战斗（真元条+必杀按钮+精英词缀+情报卡）
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'map' }); });
await sleep(300);
await page.evaluate(async () => {
  const p = Game.player;
  p.hp = Stat.compute(p).maxHp; p.mp = Stat.compute(p).maxMp;
  Battle.start('m_toumu', { mapName: '青峰山' });
  const B = Battle.active;
  B.zhenyuan = 5;
  B.enemyFxIds = ['e_leech', 'e_swift'];
  B.enemy._fxSwift = true;
  Battle.render();
});
await sleep(400);
await shot('battle_v19');
// 情报卡
await page.evaluate(() => Battle.infoCard());
await sleep(300);
await shot('battle_info');
await page.evaluate(() => { if (UI._popupResolve) UI.popupChoose(-1); Battle.end(); });
await sleep(300);

console.log('v19 截图巡览完成，共', idx, '张');
await browser.close();
