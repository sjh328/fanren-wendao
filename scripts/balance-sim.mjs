/* v19 数值量化模拟：修为节奏 × 灵石经济 × 突破成算（逐境界拟合报告）
 * 运行：node scripts/balance-sim.mjs（需先 node server.mjs）
 * 输出：控制台表格 + docs/balance-v19.md
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find(f => f && fs.existsSync(f)) || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:8341/index.html?v=33', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 600));

// 采样：每境界在「标准玩家画像」下测 修为/日 与 突破成算（静修/天劫基准）
const rows = await page.evaluate(() => {
  const out = [];
  for (let r = 0; r <= 9; r++) {
    const p = PlayerFactory.create('模拟道人', { gen: 6, comp: 6, luck: 6, body: 6 });
    p.realmIdx = r; p.layer = 0; p.exp = 0; p.dao = null;
    if (r >= 1) { p.sect = { id: 'qingyun', contrib: 0, rank: 'inner' }; }
    const st = Stat.compute(p);
    // 修为/日：三次采样取均值（gainMult 含 ±12.5% 随机）
    let gainSum = 0;
    const N = 60;
    for (let i = 0; i < N; i++) gainSum += Cultivate.baseGain(p) * (1 + st.cultPct / 100);
    const gainPerAction = gainSum / N;
    const gainPerDay = gainPerAction / 3;   // 一次修炼 3 日
    // 该境界总需求（四层）
    let need = 0;
    for (let L = 0; L < 4; L++) need += GameData.layerNeed(r, L);
    const days = Math.round(need / gainPerDay);
    // 战斗收益（打赢同境界普通怪）：修为/灵石
    const rp = r * 4;
    const battleExp = Math.round(22 * GameData.eco(r));
    const battleStones = Math.round(15 * GameData.stoneEco(r));
    // 突破成算（基准，无感悟/气运修正）：静修 or 天劫三策中位
    const baseBreak = Utils.clamp(40 + 6 * 2, 5, 95);
    const tribBase = r >= 2 ? Utils.clamp((40 + 6 * 2) * (1 - (r + 1) * 0.035), 5, 95) : null;
    out.push({
      realm: GameData.REALM_NAMES[r],
      gainPerDay: Math.round(gainPerDay),
      need,
      days,
      battleExp, battleStones,
      breakChance: Math.round(baseBreak),
      trib: tribBase == null ? '—（静修冲关）' : Math.round(tribBase) + '%（劫威基准）',
      lifespan: GameData.LIFESPAN[r],
    });
  }
  return out;
});
await browser.close();

// 拟合体检：相邻境界天数比值的离群检测
const ratios = [];
for (let i = 1; i < rows.length; i++) ratios.push(+(rows[i].days / rows[i - 1].days).toFixed(2));
const median = [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length / 2)];
const flags = ratios.map((x, i) => (x > median * 3 || x < median / 3) ? `⚠ 第${i + 1}→${i + 2}境比值 ${x}× 偏离中位 ${median}×` : null).filter(Boolean);

let md = `# v19 数值拟合报告（scripts/balance-sim.mjs 自动生成）

标准画像：四维 6/6/6/6、内门宗门、未择道、仅修炼产出（不含丹药/秘境/事件收益）。

| 境界 | 修为/日 | 境内总需求 | 纯修炼天数 | 战胜收益(修为/灵石) | 突破成算 | 寿元 |
|---|---|---|---|---|---|---|
`;
rows.forEach((r, i) => {
  md += `| ${r.realm} | ${r.gainPerDay.toLocaleString()} | ${r.need.toLocaleString()} | ${r.days.toLocaleString()} | ${r.battleExp.toLocaleString()} / ${r.battleStones.toLocaleString()} | ${i === 0 ? r.breakChance + '%' : (i < 2 ? '静修+' + 15 : r.trib)} | ${r.lifespan}岁 |\n`;
});
md += `\n## 节奏体检\n\n相邻境界纯修炼天数比值：${ratios.join(' → ')}（中位 ${median}×）\n\n`;
md += flags.length ? flags.join('\n') + '\n\n结论：存在节奏离群段，建议复核该境界的产出/需求曲线。\n' : '结论：无离群段——各境界节奏平顺，未发现断崖或暴冲。\n';
md += `\n> 口径说明：实际推进中战斗/丹药/事件占修为大头（同境战胜 ≈ ${(rows[0].battleExp / rows[0].gainPerDay).toFixed(1)} 天纯修炼产出，随境界同标度放大），故上表「纯修炼天数」为节奏上限参考。\n`;

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/balance-v19.md', md, 'utf8');
console.log(md);
