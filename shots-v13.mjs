/* v13 视觉验收截图 v3：成就预解锁防弹幕 / 元素定位截长页 / 特效时序修正 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const SHOT = 'D:/code/javacode/game/gui-test-screenshots';
fs.mkdirSync(SHOT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--window-size=1280,760'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
await page.goto('http://localhost:8341/index.html', { waitUntil: 'domcontentloaded' });
await sleep(500);
const clearFx = () => page.evaluate(() => {
  const a = document.getElementById('announce'); if (a) a.innerHTML = '';
  const t = document.getElementById('toast'); if (t) t.innerHTML = '';
});
await page.click('[data-action="st-newgame"][data-slot="3"]');
await sleep(300);
await page.evaluate(() => { document.getElementById('create-name').value = '万象真人'; });
await page.click('[data-action="st-start"]');
await sleep(500);
for (let i = 0; i < 6; i++) { const b = await page.$('[data-action="tut-next"]'); if (!b) break; try { await b.click(); } catch (e) { break; } await sleep(80); }
await page.evaluate(() => {
  const p = Game.player;
  p.name = '万象真人';
  p.realmIdx = 2; p.layer = 2; p.day = 420; p.age = 30;
  p.dao = 'sword';
  p.quest = { ch: 9, side: {} };
  p.stones = { low: 5200, mid: 30, high: 2 };
  p.attrs = { gen: 7, comp: 7, luck: 7, body: 7 };
  p.insight = 20;
  p.equipped = { weapon: 's_cx_jian', armor: 's_xt_jia', accessory: 'z_xingpan' };
  p.enhanced = { s_cx_jian: 4, s_xt_jia: 2 };
  Object.assign(p.bag, { m_xuantie: 12, m_lingcao: 5, m_neidan: 3, pill_kuangbao: 2, tal_bingpo: 2, tal_fuling: 1, seed_lingzhi: 2, gf_hansha: 1, pill_liaoshang: 5 });
  p.cave = { lv: 3, plots: new Array(6).fill(null) };
  const sd = GameData.ITEMS['seed_lingzhi'];
  p.cave.plots[0] = { seed: 'seed_lingzhi', crop: sd.crop, days: sd.days, plantedDay: 402 };
  const sc = GameData.ITEMS['seed_lingcao'];
  p.cave.plots[1] = { seed: 'seed_lingcao', crop: sc.crop, days: sc.days, plantedDay: 415 };
  p.beasts = { active: 1, nextId: 2, list: [{ uid: 1, id: 'm_linghou', name: '灵猴', species: 'beast', power: 4, level: 3, exp: 120, skills: [{ name: '挠心爪', w: 25, kind: 'bleed', pct: 2, rounds: 2 }] }] };
  p.npcs.n14.rel = 62; p.npcs.n14.met = true;
  p.npcs.n2.rel = 45; p.npcs.n2.met = true;
  p.counters.wins = 30; p.counters.killsElite = 8; p.counters.explores = 40; p.counters.befriends = 3;
  // 预解锁全部成就：防止战斗/操作触发的成就弹幕刷屏
  for (const d of Achieve.DEFS) Meta.data.achv[d.id] = Math.floor(p.day);
  // 预收录全部图鉴：防止 Meta.see toast 刷屏
  for (const id of Object.keys(GameData.MONSTERS)) Meta.data.codex.monster[id] = 1;
  Anim.reset();
  UI.renderAll();
});
await sleep(900);
await clearFx();
await page.screenshot({ path: `${SHOT}/v13_01_main.png` });

const gotoTab = async (tab) => {
  await page.evaluate((t) => {
    Game.activeTab = t;
    UI.renderTabs();
    UI.renderTabContent();
    const box = document.getElementById('tab-content');
    box.scrollTop = 0;
  }, tab);
  await sleep(350);
  await clearFx();
};
const scrollToText = async (txt) => {
  await page.evaluate((t) => {
    const el = document.getElementById('tab-content');
    const target = [...el.querySelectorAll('.shop-section-title, .card-title')].find(n => n.textContent.includes(t));
    if (target) target.scrollIntoView({ block: 'start' });
    else el.scrollTop = el.scrollHeight;
  }, txt);
  await sleep(320);
  await clearFx();
};

// 游历页
await gotoTab('map');
await page.screenshot({ path: `${SHOT}/v13_02_map_top.png` });
await page.evaluate(() => { const cards = document.querySelectorAll('#tab-content .map-card'); if (cards.length) cards[0].scrollIntoView({ block: 'start' }); });
await sleep(320);
await clearFx();
await page.screenshot({ path: `${SHOT}/v13_03_map_cards.png` });

// 洞府
await gotoTab('cave');
await page.screenshot({ path: `${SHOT}/v13_04_cave_top.png` });
await page.evaluate(() => { const el = document.getElementById('tab-content'); el.scrollTop = el.scrollHeight; });
await sleep(320);
await clearFx();
await page.screenshot({ path: `${SHOT}/v13_05_cave_bottom.png` });

// 坊市：元素定位三段
await gotoTab('shop');
await page.screenshot({ path: `${SHOT}/v13_06_shop_1.png` });
await scrollToText('悬赏任务板');
await page.screenshot({ path: `${SHOT}/v13_07_shop_2.png` });
await scrollToText('祭炼强化');
await page.screenshot({ path: `${SHOT}/v13_08_shop_3.png` });
await scrollToText('炼器坊');
await page.screenshot({ path: `${SHOT}/v13_08b_shop_forge.png` });

// 江湖
await gotoTab('jianghu');
await page.screenshot({ path: `${SHOT}/v13_09_jianghu.png` });
await page.evaluate(() => { const el = document.getElementById('tab-content'); el.scrollTop += el.clientHeight * 0.8; });
await sleep(300);
await clearFx();
await page.screenshot({ path: `${SHOT}/v13_09b_jianghu_list.png` });

// 战斗
await page.evaluate(async () => {
  document.getElementById('announce').innerHTML = '';
  await Battle.start('m_dushe', { mapName: '青峰山' });
  const B = Battle.active;
  B.busy = false; B.over = false;
  StatusFx.add(B.enemy.fx, { kind: 'poison', pct: 3, rounds: 3 });
  StatusFx.add(B.enemy.fx, { kind: 'defdown', pct: 35, rounds: 2 });
  StatusFx.add(B.myFx, { kind: 'atkup', pct: 30, rounds: 3 });
  B.combo = 3;
  B.enemy.hp = Math.round(B.enemy.hpMax * 0.35);
  B.morale = 60;
  document.getElementById('announce').innerHTML = '';
  Battle.render();
});
await sleep(700);
await clearFx();
await page.screenshot({ path: `${SHOT}/v13_10_battle.png` });
await page.evaluate(() => { if (Battle.active) Battle.end(); });
await sleep(300);

// 雷光特效（render 后触发）
await page.evaluate(async () => {
  await Battle.start('m_yaohu', { mapName: '万妖山脉' });
  const B = Battle.active;
  B.busy = false; B.over = false;
  document.getElementById('announce').innerHTML = '';
  Battle.render();
  Battle.fxShow('lightning');
});
await sleep(260);
await clearFx();
await page.screenshot({ path: `${SHOT}/v13_11_battle_fx.png` });
await page.evaluate(() => { if (Battle.active) Battle.end(); });
await sleep(400);

// 开始界面
await sleep(2000);
await clearFx();
await page.evaluate(() => Game.exitToStart());
await sleep(500);
await clearFx();
await page.screenshot({ path: `${SHOT}/v13_12_start.png` });

console.log('SHOTS v3 DONE');
await browser.close();
