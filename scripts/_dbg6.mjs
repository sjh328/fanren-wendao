import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const browser = await puppeteer.launch({ headless: true, protocolTimeout: 60000, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
page.on('pageerror', e => console.log('PAGEERR', String(e).slice(0, 200)));
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle2' });
// 直接落一个 v15 式新档并进入游戏
await page.evaluate(() => {
  document.getElementById('create-name') && (document.getElementById('create-name').value = '');
});
// 触发 v15 早期同款：开始新游戏
await page.evaluate(() => {
  const pl = null;
  document.querySelector('[data-action="st-newgame"]')?.click();
});
await new Promise(r => setTimeout(r, 800));
const client = await page.createCDPSession();
await client.send('Debugger.enable');
const raced = await Promise.race([
  page.evaluate(() => { localStorage.setItem('probe', 'ok'); return 'eval-ok'; }).then(() => 'eval-ok').catch(e => 'eval-err: ' + String(e).slice(0, 80)),
  new Promise(async res => { await new Promise(r => setTimeout(r, 4000)); client.send('Debugger.pause').catch(() => {}); res('paused'); }),
]);
console.log('race:', raced);
let stacks = [];
client.on('Debugger.paused', async ev => {
  for (const cf of ev.callFrames.slice(0, 6)) {
    stacks.push(cf.functionName + ' @ ' + (cf.url || '').split('/').pop() + ':' + (cf.location ? cf.location.lineNumber : cf.lineNumber));
  }
  await client.send('Debugger.resume').catch(() => {});
});
await new Promise(r => setTimeout(r, 1500));
console.log('stacks:', JSON.stringify(stacks, null, 1));
await browser.close();
