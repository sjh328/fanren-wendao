// 探针：复刻 verify-game T7 探索循环，抓 explore 抛错
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('pageerror', e => console.error('[pageerror]', e.message));
page.on('console', m => { const t = m.text(); if (t.startsWith('[dbg]')) console.error(t); });
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));
// 新档
await page.click('[data-action="st-newgame"][data-slot="3"]');
await new Promise(r => setTimeout(r, 300));
await page.evaluate(() => { document.getElementById('create-name').value = '探针道人'; });
await page.click('[data-action="st-start"]');
await new Promise(r => setTimeout(r, 400));
// 关引导 + 上手清单 + 剧情
await page.evaluate(() => {
  const t = document.getElementById('tutorial');
  if (t && !t.className.includes('hidden')) { const b = t.querySelector('[data-action="tut-skip"]'); if (b) b.click(); }
  if (UI._popupResolve) UI.popupChoose(0);
  document.getElementById('popup-modal')?.classList.add('hidden');
});
await new Promise(r => setTimeout(r, 300));
for (let i = 0; i < 6; i++) {
  const st = await page.evaluate(() => {
    document.getElementById('story-modal')?.classList.add('hidden');
    const tab = document.querySelector('[data-action="act-tab"][data-tab="map"]'); console.error('[dbg] tab=' + (tab ? tab.className : 'NULL') + ' realm=' + Game.player.realmIdx + ' layer=' + Game.player.layer + ' exp=' + Game.player.exp + ' tutorialDone=' + Game.player.flags.tutorialDone); if (tab && !tab.className.includes('locked')) tab.click();
    if (Story.active()) Story.close();
    const b = document.querySelector('[data-action="act-explore"][data-map="village"]');
    if (!b) return { err: 'no-btn' };
    b.click();
    return { ok: true, battle: !document.getElementById('battle-modal').className.includes('hidden'), battleActive: !!Battle.active };
  });
  console.error('[dbg] e' + i + ' ' + JSON.stringify(st));
  await new Promise(r => setTimeout(r, 800));
  // 若入战则直接结束
  const inB = await page.evaluate(() => !!Battle.active);
  if (inB) { await page.evaluate(() => { if (Battle.active) { Battle.active.over = true; Battle.end(); } }); }
}
await browser.close();
