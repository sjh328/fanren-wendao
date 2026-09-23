import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 200)));
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle2' });
const r = await page.evaluate(async () => {
  const pl = PlayerFactory.create('T', { gen: 5, comp: 5, luck: 5, body: 5 });
  pl.flags.tutorialDone = true;
  localStorage.setItem('fanren_wd_3', JSON.stringify({ v: 1, player: pl, meta: { ts: Date.now(), dead: false } }));
  UI.renderStart();
  document.querySelector('[data-action="st-load"][data-slot="3"]')?.click();
  await new Promise(r => setTimeout(r, 500));
  UI.closeOverlays();
  // 模拟 v7 场景：先 map 后 cave，中间一场战斗开关
  Game.actions['act-tab']({ tab: 'map' });
  try { Game.player._autoWin = 'off'; await Battle.start('m_dushe', { mapName: '测试' }); } catch (e) { return 'start: ' + e.message; }
  Battle.end();
  let err = '';
  try { Game.actions['act-tab']({ tab: 'cave' }); } catch (e) { err = e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e.message; }
  return { err, content: document.getElementById('tab-content').innerText.slice(0, 30) };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
