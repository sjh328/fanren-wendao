// PWA 图标生成器：以游戏「宣纸水墨 + 朱砂道印」视觉，用无头 Chrome 截图产出各尺寸 PNG
// 运行：node scripts/make-icons.mjs   （产物写入 icons/，提交进仓库，平时无需重跑）
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'icons');
fs.mkdirSync(OUT, { recursive: true });

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Google/Chrome/Application/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find(f => fs.existsSync(f));

// pad：安全边距占边长比例（maskable 需保证中心 80% 安全区）
const TARGETS = [
  { file: 'icon-192.png', size: 192, pad: 0.10 },
  { file: 'icon-512.png', size: 512, pad: 0.10 },
  { file: 'maskable-512.png', size: 512, pad: 0.24 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0.08 },
  { file: 'favicon-32.png', size: 32, pad: 0.02 },
];

const art = (pad) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}
  .icon{position:relative;width:100vw;height:100vh;
    background:radial-gradient(130% 130% at 28% 18%, #f9f3e3 0%, #f0e6ca 52%, #e0d0a6 100%);}
  .sun{position:absolute;right:14%;top:10%;width:16%;height:16%;border-radius:50%;
    background:radial-gradient(circle at 38% 32%, #fdf9ec, #ecdcae 78%);opacity:.85}
  .mtn{position:absolute;left:-6%;bottom:-5%;width:112%;height:52%;opacity:.15}
  .seal{position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);
    width:${(1 - 2 * pad) * 100}vmin;height:${(1 - 2 * pad) * 100}vmin;
    background:linear-gradient(155deg,#a8433a 0%,#96352d 55%,#832a24 100%);
    border-radius:16%;box-shadow:0 2px 14px rgba(90,40,30,.35), inset 0 0 0 3px rgba(249,243,227,.9), inset 0 0 0 7px rgba(249,243,227,.35);
    display:flex;align-items:center;justify-content:center}
  .dao{font-family:KaiTi,STKaiti,'LXGW WenKai','Microsoft YaHei',serif;font-weight:700;
    color:#f9f3e3;line-height:1;transform:translateY(2%);
    font-size:${(1 - 2 * pad) * 58}vmin;text-shadow:0 2px 6px rgba(60,20,14,.35)}
</style></head><body><div class="icon">
  <div class="sun"></div>
  <svg class="mtn" viewBox="0 0 400 180" preserveAspectRatio="none">
    <polygon points="0,180 60,70 130,150 210,40 300,140 360,80 400,180" fill="#5e7a54"/>
    <polygon points="0,180 90,110 180,170 270,100 400,180" fill="#4d6b44" opacity=".8"/>
  </svg>
  <div class="seal"><div class="dao">道</div></div>
</div></body></html>`;

const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu', '--force-color-profile=srgb'] });
try {
  const page = await browser.newPage();
  for (const t of TARGETS) {
    await page.setViewport({ width: t.size, height: t.size, deviceScaleFactor: 1 });
    await page.setContent(art(t.pad), { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 120));   // 字形/渐变渲染余量
    await page.screenshot({ path: path.join(OUT, t.file) });
    console.log(`✓ ${t.file} (${t.size}×${t.size})`);
  }
} finally {
  await browser.close();
}
console.log(`图标已生成至 ${OUT}`);
