import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ headless: 'new', executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', m => { if (m.type() === 'error') console.log('CERR', m.text().slice(0, 400)); });
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle2' });
await page.evaluate(async () => {
  const pl = PlayerFactory.create('T', { gen: 5, comp: 5, luck: 5, body: 5 });
  pl.flags.tutorialDone = true;
  pl.realmIdx = 2; pl.layer = 0;
  pl.cave = { lv: 1, plots: [null, null, null, null], builds: {}, formation: [null, null, null, null, null, null, null, null, null] };
  pl.cave.builds.train = 1;
  localStorage.setItem('fanren_wd_3', JSON.stringify({ v: 1, player: pl, meta: { ts: Date.now(), dead: false } }));
  UI.renderStart();
  document.querySelector('[data-action="st-load"][data-slot="3"]')?.click();
  await new Promise(r => setTimeout(r, 500));
  UI.closeOverlays();
  Game.actions['act-tab']({ tab: 'map' });
  try { Game.actions['act-tab']({ tab: 'cave' }); } catch (e) { console.error('ACTTAB', e.stack ? e.stack.split('\n').slice(0, 4).join(' | ') : e.message); }
});
await new Promise(r => setTimeout(r, 400));
await browser.close();
console.log('done');
