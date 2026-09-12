import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERR:', e.message));
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle0' });
await page.evaluate(() => { localStorage.setItem('fanren_wd_tutorial', '1'); Save.remove('3'); });
await page.evaluate(() => {
  window.__calls = { show: 0, showStory: 0, finish: 0 };
  const ts = Tutorial.show.bind(Tutorial);
  Tutorial.show = (...a) => { window.__calls.show++; return ts(...a); };
  const qs = QuestSys.showStory.bind(QuestSys);
  QuestSys.showStory = (...a) => { window.__calls.showStory++; return qs(...a); };
  const tf = Tutorial.finish.bind(Tutorial);
  Tutorial.finish = (...a) => { window.__calls.finish++; return tf(...a); };
});
await page.evaluate(() => Game.actions['st-newgame']({ slot: '3' }));
await sleep(250);
await page.evaluate(() => { document.getElementById('create-name').value = '插桩'; Game.actions['st-start']({}, null); });
await sleep(800);
const r = await page.evaluate(() => ({
  calls: window.__calls,
  open: (document.getElementById('story-modal') || { className: 'x' }).className,
  tut: (document.getElementById('tutorial') || { className: 'x' }).className,
  onDonePending: typeof Tutorial.onDone === 'function',
}));
console.log(JSON.stringify(r, null, 1));
await browser.close();
