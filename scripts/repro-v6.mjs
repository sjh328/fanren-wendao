import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PAGEERR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle0' });
await page.evaluate(() => { Save.remove('3'); Save.remove('auto'); localStorage.setItem('fanren_wd_tutorial', '1'); });
// 注入与 v3 V6 相同的种子
await page.evaluate(() => Game.actions['st-newgame']({ slot: '3' }));
await sleep(250);
await page.evaluate(() => { document.getElementById('create-name').value = '转世道人'; Game.actions['st-start']({}, null); });
await sleep(700);
await page.evaluate(() => {
  const p = Game.player;
  p.name = '转世道人'; p.realmIdx = 7; p.layer = 3; p.exp = GameData.layerNeed(7, 3);
  p.karma = 300; p.insight = 0; p.dao = 'sword'; p.sect = null; p.canReincarnate = false; p.reinc = null;
  p.bag = { w_zhuxian: 1, pill_liaoshang: 3 };
  p.npcs = { n3: { realmIdx: 1, layer: 0, exp: 0, rel: -50, alive: true, map: 'village', met: true, grudge: true, pastLife: false } };
  UI.renderAll();
});
await page.evaluate(() => { Game.actions['act-tab']({ tab: 'cultivate' }); });
await sleep(300);
await page.evaluate(() => { const b = document.querySelector('[data-action="act-breakthrough"]'); b && b.click(); });
await sleep(600);
await page.evaluate(() => { const b = document.querySelector('[data-action="trib-strategy"][data-strategy="hide"]'); b && b.click(); });
await sleep(4600);
// 记录 rollback 弹窗并选「继续前行」
let pop = await page.evaluate(() => {
  const pm = document.getElementById('popup-modal');
  if (pm && !pm.className.includes('hidden')) { const t = document.querySelector('#popup-body')?.innerText.slice(0, 30); [...pm.querySelectorAll('.popup-btns .btn')].reverse()[0]?.click(); return t; }
  return null;
});
console.log('rollback popup:', pop);
await sleep(800);
const canRe = await page.evaluate(() => ({ can: Game.player.canReincarnate, realm: Game.player.realmIdx, bag: Object.keys(Game.player.bag) }));
console.log('after trib:', JSON.stringify(canRe));
// 打开兵解（直呼 open 捕获拒绝）
const openErr = await page.evaluate(async () => { try { ReincarnationSys.open(); return 'called'; } catch (e) { return 'THROW ' + e.message; } });
console.log('open():', openErr);
await sleep(400);
for (let i = 0; i < 3; i++) {
  const info = await page.evaluate(() => {
    const pm = document.getElementById('popup-modal');
    if (!pm || pm.className.includes('hidden')) return { none: true };
    const title = (document.querySelector('#popup-body') || {}).innerText?.slice(0, 26);
    const btns = [...pm.querySelectorAll('.popup-btns .btn')].map(b => b.innerText);
    return { title, btn0: btns[0] };
  });
  console.log('popup#' + i, JSON.stringify(info));
  if (!info.none) {
    await page.evaluate(() => { const b = document.querySelector('#popup-modal .popup-btns .btn'); b && b.click(); });
    await sleep(450);
  }
}
await sleep(600);
const p2 = await page.evaluate(() => ({
  origin: Game.player.origin,
  bag: Game.player.bag,
  n3: Game.player.npcs && Game.player.npcs.n3,
  reinc: Game.player.reinc,
}));
console.log('p2:', JSON.stringify(p2));
console.log('errors:', errs);
await browser.close();
