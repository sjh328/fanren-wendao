/* v20 经济审计：全物品获取/回收途径价格核对（需先 node server.mjs）
 * 运行：node scripts/price-audit.mjs
 * 输出：docs/price-audit.md + 控制台——0 价稀有物、卖买倒挂、黑市/坊市/回收价差
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find(f => f && fs.existsSync(f)) || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 500));

const report = await page.evaluate(() => {
  const G = GameData;
  const fake = { version: 1, name: '审计道人', day: 300, realmIdx: 3, layer: 0, exp: 0, attrs: { gen: 5, comp: 5, luck: 5, body: 5 }, fortune: 0, karma: 0, poison: 0, insight: 0, stones: { low: 0, mid: 0, high: 0 }, bag: {}, gongfa: {}, equipped: { weapon: null, armor: null, accessory: null }, cave: null, dao: null, sect: null, flags: {}, counters: {}, npcs: NpcSys.freshNpcs(), world: WorldSys.freshWorld(), beasts: { active: null, list: [] }, benming: { lv: 0 }, jade: 0 };
  const shopIds = new Set(G.SHOP.map(r => r.item));
  const blackIds = new Set(BlackSys.POOL.map(x => x.id));
  const realPlayer = Game.player;
  Game.player = fake;
  const rows = [];
  try {
    for (const [id, def] of Object.entries(G.ITEMS)) {
      const grade = def.grade ?? def.tier ?? 0;
      rows.push({
        id, name: def.name, type: def.type, grade, base: def.price || 0,
        sell: ShopSys.sellPrice(id),
        shop: shopIds.has(id) ? ShopSys.price(id) : null,
        black: blackIds.has(id) ? BlackSys.price(fake, id) : null,
      });
    }
  } finally { Game.player = realPlayer; }
  const problems = [];
  for (const r of rows) {
    if (r.base === 0 && r.grade >= 1 && r.black != null && r.black < 1000 * (r.grade + 1)) {
      problems.push(`[0价+黑市贱卖] ${r.id}(${r.name}) 品阶${r.grade} 黑市仅 ${r.black}`);
    }
    if (r.shop != null && r.sell >= r.shop) problems.push(`[倒挂] ${r.id}(${r.name}) 回收${r.sell} ≥ 坊市买价${r.shop}`);
    if (r.black != null && r.grade >= 3 && r.black < r.sell * 3) problems.push(`[黑市利润薄] ${r.id}(${r.name}) 黑市${r.black} < 回收${r.sell}×3`);
  }
  const zeroPrice = rows.filter(r => r.base === 0).map(r => `${r.id}(${r.grade}阶)`);
  // v34（D4）：拍卖池倒挂检测——底价×1.15（稳健出价）若仍低于转卖价 0.45×price，
  // 即为「零风险低买高卖」套利口（v34 前 pill_zaohua 倒挂 23 倍即漏网于此）
  const auctionProblems = [];
  for (const lot of AuctionSys.LOT_POOL) {
    const d = G.ITEMS[lot.item];
    if (!d || !d.price) continue;   // 无坊市价之物（装备/功法）无转卖套利面
    const resale = Math.floor(d.price * 0.45);
    const steadyCost = Math.round(lot.base * 1.15);
    if (resale > steadyCost * 1.05) {
      auctionProblems.push(`[拍卖倒挂] ${lot.item}(${d.name}) 底价${lot.base} 稳健出价${steadyCost} < 转卖${resale}（minRealm=${lot.minRealm}）`);
    }
  }
  // v34（D4）：黑市赌袋期望——低福缘(luck0)应微负、高福缘(luck10)不得显著正；碎片不得再入彩头
  const betProblems = [];
  for (let r = 0; r <= 6; r++) {
    const cost = Math.round(200 * G.stoneEco(r));
    const tier = Math.min(4, Math.floor(r / 2) + 1);
    const mats = G.matsByTier(tier);
    if (!mats.length) continue;
    for (const luck of [0, 10]) {
      let evSum = 0;
      for (const m of mats) {
        const mp = G.ITEMS[m].price || 1;
        const qty = Math.min(999, Math.max(2, Math.round(cost * 0.6 / mp)));
        const win = qty * 2 + Math.ceil(qty * 0.5);
        const winRate = (25 + luck * 4) / 100, midRate = 0.35, loseRate = 1 - winRate - midRate;
        if (loseRate < 0) continue;
        evSum += winRate * (win * mp) + midRate * (qty * mp) - loseRate * Math.round(100 * G.stoneEco(r)) - cost;
      }
      const ev = evSum / mats.length;
      if (ev > cost * 0.6) betProblems.push(`[赌袋正期望] r${r} luck${luck} 期望 +${Math.round(ev)}（成本 ${cost}）`);
    }
  }
  return { rows: rows.length, zeroPrice, problems, auctionProblems, betProblems };
});

await browser.close();
let md = `# v20 经济审计报告（scripts/price-audit.mjs 自动生成）\n\n采样画像：realm3、行情中位。\n\n- 物品总数：${report.rows}\n- 定价为 0 的稀有物（无坊市渠道，按品阶折算黑市价）：${report.zeroPrice.join('、') || '无'}\n\n## 问题清单（${report.problems.length}）\n`;
md += report.problems.length ? report.problems.map(p => `- ${p}`).join('\n') + '\n' : '- 无套利路径与定价倒挂。\n';
md += `\n## v34 扩容检测\n\n- 拍卖池倒挂（${report.auctionProblems.length}）：\n` + (report.auctionProblems.length ? report.auctionProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `- 黑市赌袋期望越界（${report.betProblems.length}）：\n` + (report.betProblems.length ? report.betProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
console.log(md);
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/price-audit.md', md);
