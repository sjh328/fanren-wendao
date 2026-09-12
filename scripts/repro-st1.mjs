import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle0' });
// 场景 A：教程已看过（localStorage 置位）→ 新档应直接开剧情
await page.evaluate(() => localStorage.setItem('fanren_wd_tutorial', '1'));
await page.evaluate(() => { Save.remove('3'); Game.actions['st-newgame']({ slot: '3' }); });
await sleep(250);
await page.evaluate(() => { document.getElementById('create-name').value = '测试甲'; Game.actions['st-start']({}, null); });
await sleep(700);
const a = await page.evaluate(() => ({
  open: !(document.getElementById('story-modal')||{className:''}).className.includes('hidden'),
  tutOpen: !(document.getElementById('tutorial')||{className:'hidden'}).className.includes('hidden'),
  seen: !!(Game.player.story && Game.player.story.seen.c1_open),
  flagsTut: Game.player.flags.tutorialDone,
}));
console.log('A(教程已看):', JSON.stringify(a));
// 场景 B：教程未看过 → 新档先教程，skip 后剧情应接力
await page.evaluate(() => { localStorage.removeItem('fanren_wd_tutorial'); Game.exitToStart(); });
await sleep(300);
await page.evaluate(() => { Save.remove('3'); Game.actions['st-newgame']({ slot: '3' }); });
await sleep(250);
await page.evaluate(() => { document.getElementById('create-name').value = '测试乙'; Game.actions['st-start']({}, null); });
await sleep(700);
const b0 = await page.evaluate(() => ({
  tutOpen: !(document.getElementById('tutorial')||{className:'hidden'}).className.includes('hidden'),
  storyOpen: !(document.getElementById('story-modal')||{className:''}).className.includes('hidden'),
}));
console.log('B0(新教程):', JSON.stringify(b0));
await page.evaluate(() => { const t = document.getElementById('tutorial'); t.querySelector('[data-action="tut-skip"]')?.click(); });
await sleep(600);
const b1 = await page.evaluate(() => ({
  storyOpen: !(document.getElementById('story-modal')||{className:''}).className.includes('hidden'),
  seen: !!(Game.player.story && Game.player.story.seen.c1_open),
  popupUp: !(document.getElementById('popup-modal')||{className:'hidden'}).className.includes('hidden'),
}));
console.log('B1(skip后):', JSON.stringify(b1));
console.log('errors:', errs);
await browser.close();
