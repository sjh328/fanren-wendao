/* v14 UI 全面升级验收截图 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const SHOT = 'D:/code/javacode/game/gui-test-screenshots';
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
  p.name = '万象真人'; p.realmIdx = 2; p.layer = 2; p.day = 420; p.age = 30;
  p.dao = 'sword'; p.quest = { ch: 9, side: {} };
  p.stones = { low: 5200, mid: 30, high: 2 };
  p.attrs = { gen: 7, comp: 7, luck: 7, body: 7 }; p.insight = 20;
  p.equipped = { weapon: 's_cx_jian', armor: 's_xt_jia', accessory: 'z_xingpan' };
  p.enhanced = { s_cx_jian: 4, s_xt_jia: 2 };
  Object.assign(p.bag, { m_xuantie: 12, m_lingcao: 5, m_neidan: 3, pill_kuangbao: 2, tal_bingpo: 2, seed_lingzhi: 2, gf_hansha: 1, pill_liaoshang: 5 });
  p.cave = { lv: 3, plots: new Array(6).fill(null) };
  const sd = GameData.ITEMS['seed_lingzhi'];
  p.cave.plots[0] = { seed: 'seed_lingzhi', crop: sd.crop, days: sd.days, plantedDay: 402 };
  p.beasts = { active: 1, nextId: 2, list: [{ uid: 1, id: 'm_linghou', name: '灵猴', species: 'beast', power: 4, level: 3, exp: 120, skills: [] }] };
  p.npcs.n14.rel = 62; p.npcs.n14.met = true; p.npcs.n2.rel = 45; p.npcs.n2.met = true;
  p.counters.wins = 30; p.counters.killsElite = 8; p.counters.explores = 40; p.counters.befriends = 3;
  for (const d of Achieve.DEFS) Meta.data.achv[d.id] = 1;
  for (const id of Object.keys(GameData.MONSTERS)) Meta.data.codex.monster[id] = 1;
  Anim.reset();
  UI.renderAll();
});
await sleep(800);
await clearFx();
await page.screenshot({ path: `${SHOT}/v14_01_main.png` });
// 修炼页左栏滚动到底（道行状态+建议区）
await page.evaluate(() => { document.getElementById('panel-left').scrollTop = document.getElementById('panel-left').scrollHeight; });
await sleep(300);
await clearFx();
await page.screenshot({ path: `${SHOT}/v14_02_left_bottom.png` });
// 日志展开态
await page.evaluate(() => { document.getElementById('panel-left').scrollTop = 0; Log.toggleCollapse(); });
await sleep(500);
await clearFx();
await page.screenshot({ path: `${SHOT}/v14_03_log_open.png` });
await page.evaluate(() => Log.toggleCollapse());
// 游历页
await page.evaluate(() => { Game.activeTab = 'map'; UI.renderTabs(); UI.renderTabContent(); document.getElementById('tab-content').scrollTop = 0; });
await sleep(400);
await clearFx();
await page.screenshot({ path: `${SHOT}/v14_04_map.png` });
// 移动端
await page.setViewport({ width: 390, height: 780 });
await sleep(500);
await page.evaluate(() => { Game.activeTab = 'cultivate'; UI.renderTabs(); UI.renderTabContent(); });
await sleep(400);
await clearFx();
await page.screenshot({ path: `${SHOT}/v14_05_mobile.png` });
console.log('V14 SHOTS DONE');
await browser.close();
