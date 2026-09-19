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
  // v34（D4）：黑市赌袋期望——低福缘(luck0)应微负、高福运(luck10)不得显著正；碎片不得再入彩头
  // v35（E148/U6）：采样扩至 [0, 10, 17.5, 23]——原 {0,10} 恰好绕开转正区间（盈亏平衡胜率 93.3%
  // ≈ luck 17.1，满气运端原可达 100% 胜率静默转正；v35 起胜率钳顶 75%）
  // v36（E225）：midRate 0.35 恒定 → max(0, 0.6−winRate)（与实盘 black.js roll<60 分支同源——
  // 胜率≥60% 时中档恒 0）；删除 loseRate<0 continue——胜率钳顶 75% 后 loseRate 恒正，
  // 该分支只会吃掉合法采样（luck=17.5/23 两点自 v35 起从未真正执行，满气运端是门禁盲区）。
  // betSamples 记录真实执行的采样点数（验收：4 采样点全执行）
  const betProblems = [];
  const betEv23 = [];
  let betSamples = 0, betTotal = 0;
  for (let r = 0; r <= 6; r++) {
    const cost = Math.round(200 * G.stoneEco(r));
    const tier = Math.min(4, Math.floor(r / 2) + 1);
    const mats = G.matsByTier(tier);
    if (!mats.length) continue;
    for (const luck of [0, 10, 17.5, 23]) {
      betTotal++;
      let evSum = 0, used = 0;
      for (const m of mats) {
        const mp = G.ITEMS[m].price || 1;
        const qty = Math.min(999, Math.max(2, Math.round(cost * 0.6 / mp)));
        const win = qty * 2 + Math.ceil(qty * 0.5);
        const winRate = Math.min(75, 25 + luck * 4) / 100, midRate = Math.max(0, 0.6 - winRate), loseRate = 1 - winRate - midRate;
        used++;
        evSum += winRate * (win * mp) + midRate * (qty * mp) - loseRate * Math.round(100 * G.stoneEco(r)) - cost;
      }
      if (used) betSamples++;
      const ev = evSum / mats.length;
      if (luck === 23) betEv23.push(`r${r}:${Math.round(ev)}`);
      if (ev > cost * 0.6) betProblems.push(`[赌袋正期望] r${r} luck${luck} 期望 +${Math.round(ev)}（成本 ${cost}）`);
    }
  }
  // v35（U6）：宗门贡献兑换汇率横向检测——面值/贡献超出同表中枢（9~50）的发行即倒挂
  //（v35 前 m_xianjing 800 贡献兑 2 枚卖店 45000 灵石、面值/贡献 125，构成 ×6 印钞环）
  const sectProblems = [];
  for (const row of G.SECT_EXCHANGE) {
    if (!row.item || row.item.startsWith('_')) continue;
    const d = G.ITEMS[row.item];
    if (!d || !d.price) continue;
    const facePerContrib = (d.price * (row.qty || 1)) / row.cost;
    if (facePerContrib > 60) {
      sectProblems.push(`[贡献汇率倒挂] ${row.item}(${d.name}) 成本${row.cost}贡献 → 面值${d.price * (row.qty || 1)}（面值/贡献 ${facePerContrib.toFixed(1)}，同表中枢 9~50）`);
    }
  }
  // v35（U6）：画符现金流分境界扫描——变现期望（期望产量EV × 池均价 × 0.45 × stoneEco）
  // 对 drawPrice 不得为正（v35 前单击净赚 231×eco/日，成本阶梯被 Time.add 结构性废掉）
  // v36（E224）：按 seasonOf ∈ {0,1,2,3} 四季复扫——仲夏 +2 已摊入 expectedQty（craft.js E224），
  // 夏季转卖期望原 +9.1% 在门禁外的缺口自此在扫
  const drawProblems = [];
  {
    const realPlayer2 = Game.player;
    try {
      for (let r = 0; r <= 9; r++) {
        for (const tierLv of [0, 2, 6]) {
          for (const season of [0, 1, 2, 3]) {
            const fp = { ...fake, dao: 'talisman', realmIdx: r, daoExp: { talisman: 99999 }, day: [60, 160, 260, 340][season] };   // seasonOf 按 day%365 分季：孟春/仲夏/季秋/隆冬
            // 按阈值表反推：tierLv 档对应的经验直接用 mock——tierLevel 只依赖 DAO_TIERS 阈值
            Game.player = fp;
            // 构造 daoExp 令 tierLevel 命中目标档
            const tiers = (G.DAO_TIERS['talisman'] || {}).tiers || [];
            fp.daoExp = { talisman: tiers[tierLv - 1] ? tiers[tierLv - 1].need : 0 };
            const pool = CraftSys.talismanPool(fp);
            const avg = pool.reduce((s, id) => s + (G.ITEMS[id].price || 0), 0) / Math.max(1, pool.length);
            const resale = CraftSys.expectedQty(fp) * avg * 0.45 * G.stoneEco(r);
            const cost = CraftSys.drawPrice(fp);
            if (resale > cost * 1.05) drawProblems.push(`[画符正期望] r${r} 符道${tierLv}境 季${season} 变现${Math.round(resale)} > 成本${cost}`);
          }
        }
      }
    } finally { Game.player = realPlayer2; }
  }
  // v35（U6）：拍卖功法池品阶单调性——grade 越高底价/门槛不得更低（v35 前 grade5 雷神经 9000/r2
  // 比 grade3 大衍 12000/r3 便宜且门槛低两境）
  const auctionGradeProblems = [];
  {
    const gfLots = AuctionSys.LOT_POOL
      .map(l => ({ ...l, grade: (G.ITEMS[l.item] || {}).grade || null }))
      .filter(l => l.grade != null && (G.ITEMS[l.item] || {}).type === 'gongfa')
      .sort((a, b) => a.grade - b.grade);
    for (let i = 1; i < gfLots.length; i++) {
      const prev = gfLots[i - 1], cur = gfLots[i];
      if (cur.grade > prev.grade && cur.base < prev.base) {
        auctionGradeProblems.push(`[拍卖品阶倒挂] ${cur.item}(grade${cur.grade}) 底价${cur.base} < ${prev.item}(grade${prev.grade}) 底价${prev.base}`);
      }
      if (cur.grade > prev.grade && (cur.minRealm || 0) < (prev.minRealm || 0)) {
        auctionGradeProblems.push(`[拍卖门槛倒挂] ${cur.item}(grade${cur.grade}) minRealm${cur.minRealm} < ${prev.item}(grade${prev.grade}) minRealm${prev.minRealm}`);
      }
    }
  }
  // v36（E225）第七路「同表档位单调性」三族检测——现有六路全是跨渠道检测，对表内档位塌陷零覆盖
  //（v35 E147 拍卖功法倒挂同族）
  const tierProblems = [];
  {
    // ① 丹药族 a) 配方对倒挂：ALCHEMY_RECIPES 中 need 深度相等（键集相同且数量相等）且 rate 相等的
    // 配方对，单价（price/use.exp）倒挂 >30% 报警（注入样例验证锚：pojing 2600 旧值时 r4/r11 命中）
    const recipes = G.ALCHEMY_RECIPES.filter(x => x.out && G.ITEMS[x.out] && G.ITEMS[x.out].use && G.ITEMS[x.out].use.exp);
    const groups = {};
    for (const x of recipes) {
      const key = Object.keys(x.need || {}).sort().join('+') + '|' + Object.values(x.need || {}).join('+') + '|' + x.rate;
      (groups[key] = groups[key] || []).push(x);
    }
    for (const arr of Object.values(groups)) {
      for (let i = 0; i < arr.length; i++) for (let j = i + 1; j < arr.length; j++) {
        const a = G.ITEMS[arr[i].out], b = G.ITEMS[arr[j].out];
        const ua = a.price / a.use.exp, ub = b.price / b.use.exp;
        const hi = Math.max(ua, ub), lo = Math.min(ua, ub);
        if (lo > 0 && hi / lo > 1.3) tierProblems.push(`[配方对倒挂] ${arr[i].out}(${ua.toFixed(3)}) 与 ${arr[j].out}(${ub.toFixed(3)}) 同 need 同 rate 单价差 ${((hi / lo - 1) * 100).toFixed(0)}%`);
      }
    }
    // ① 丹药族 b) 档位塌陷：比较集限定配方产出丹（use.exp 且无战斗双用效果——双用丹的渠道
    // 溢价属设计内，全表跨渠道比单价会误伤培元/九转/太初等渠道差异化定价）。同 grade 多枚
    // 配方丹组内单价差 >30% 即死品（E222 病灶本义：pojing 1.30 完爆 posha 0.56「两品成死品」）。
    // 注入锚：pojing 2600 时 r4/r11 单价差 132% 命中。
    // 不做跨 grade 单价比价——境界通胀下单价随 grade 单调上升是设计内（元神丹/太初相对低档
    // 单价高数倍属「后期丹更贵」而非塌陷），跨档比单价必然误报
    const pureOut = recipes.filter(x => { const d = G.ITEMS[x.out]; return !d.use.mpPct && !d.use.hpPct && !d.battle; });
    const pByGrade = {};
    for (const x of pureOut) {
      const d = G.ITEMS[x.out];
      (pByGrade[d.grade] = pByGrade[d.grade] || {})[x.out] = d.price / d.use.exp;
    }
    for (const g of Object.keys(pByGrade)) {
      const entries = Object.entries(pByGrade[g]);
      if (entries.length < 2) continue;
      const units = entries.map(([id, u]) => ({ id, u }));
      const worst = units.reduce((a, b) => (b.u > a.u ? b : a)), best = units.reduce((a, b) => (b.u < a.u ? b : a));
      if (best.u > 0 && worst.u / best.u > 1.3) {
        tierProblems.push(`[丹药同档死品] grade${g} ${G.ITEMS[worst.id].name} 单价 ${worst.u.toFixed(3)} 较 ${G.ITEMS[best.id].name} ${best.u.toFixed(3)} 劣 ${((worst.u / best.u - 1) * 100).toFixed(0)}%`);
      }
    }
    // ② 种子族：相邻 grade 档最优日均（(2×作物价−种子价)/days 取档内最大）——高档 < 低档或塌陷 >25%
    // 报警；档内不互查（灵芝 39.2/冰魄 413.3 同为 grade2 属设计内小值）
    const seeds = Object.values(G.ITEMS).filter(d => d.type === 'seed' && d.crop && G.ITEMS[d.crop] && d.days);
    const sByGrade = {};
    for (const s of seeds) {
      const per = (2 * G.ITEMS[s.crop].price - s.price) / s.days;
      sByGrade[s.grade] = Math.max(sByGrade[s.grade] || 0, per);
    }
    const sGrades = Object.keys(sByGrade).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < sGrades.length; i++) {
      const lo = sByGrade[sGrades[i - 1]], hi = sByGrade[sGrades[i]];
      if (hi < lo) tierProblems.push(`[种子档位倒挂] grade${sGrades[i]} 最优日均 ${hi.toFixed(1)} < grade${sGrades[i - 1]} ${lo.toFixed(1)}`);
      else if (lo > 0 && hi < lo * 0.75) tierProblems.push(`[种子档位塌陷] grade${sGrades[i]} 最优日均 ${hi.toFixed(1)} 较 grade${sGrades[i - 1]} ${lo.toFixed(1)} 塌陷 ${((1 - hi / lo) * 100).toFixed(0)}%`);
    }
    // ③ 符箓池：tal_* price 随 grade 非单调报警（按 grade 分组最低价应随 grade 递增）
    const tals = Object.values(G.ITEMS).filter(d => d.type === 'talisman' && d.grade >= 1 && d.price);
    const tByGrade = {};
    for (const t of tals) tByGrade[t.grade] = Math.min(tByGrade[t.grade] || Infinity, t.price);
    const tGrades = Object.keys(tByGrade).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < tGrades.length; i++) {
      if (tByGrade[tGrades[i]] < tByGrade[tGrades[i - 1]]) tierProblems.push(`[符箓档位倒挂] grade${tGrades[i]} 最低价 ${tByGrade[tGrades[i]]} < grade${tGrades[i - 1]} ${tByGrade[tGrades[i - 1]]}`);
    }
  }
  // v36（E225）第八路「per-action 现金流榜」——PLAN_V35 U6⑤ 承诺、v35 实施时被静默丢弃。
  // 枚举可循环动作按净灵石/游戏日排序 Top10；论道/切磋为零灵石动作只进 E220 横向表不进本榜。
  // 报警：Top1 > 300×eco(该境)（层奖日额度同量级线）或 Top1/中位数 > 8×
  const actionBoard = [];
  {
    const sell = id => ShopSys.sellPrice(id);
    const eco = r => G.stoneEco(r);
    for (let r = 0; r <= 9; r++) {
      const fp = { ...fake, dao: 'talisman', realmIdx: r, day: 160, daoExp: { talisman: 99999 } };
      Game.player = fp;
      try {
        // 画符变卖（1 日/张）：变现期望 − 成本
        const pool = CraftSys.talismanPool(fp);
        const avg = pool.reduce((s, id) => s + (G.ITEMS[id].price || 0), 0) / Math.max(1, pool.length);
        const drawNet = CraftSys.expectedQty(fp) * avg * 0.45 * eco(r) - CraftSys.drawPrice(fp);
        actionBoard.push({ action: `画符变卖(r${r})`, perDay: drawNet / 1 });
        // 炼丹（2 日/炉，基础成丹率，产出卖店）：各配方取最优
        for (const rec of G.ALCHEMY_RECIPES) {
          const out = G.ITEMS[rec.out];
          if (!out || !out.price) continue;
          const matsCost = Object.entries(rec.need || {}).reduce((s, [id, n]) => s + (G.ITEMS[id] ? G.ITEMS[id].price || 0 : 0) * n, 0);
          const net = (rec.rate / 100) * sell(rec.out) - matsCost;
          actionBoard.push({ action: `炼丹·${out.name}(r${r})`, perDay: net / 2 });
        }
        // 灵田种植净收益（生长被动不占行动，按日均）：基础口径 (2×作物价−种子价)/days
        for (const s of Object.values(G.ITEMS)) {
          if (s.type !== 'seed' || !s.crop || !G.ITEMS[s.crop] || !s.days) continue;
          actionBoard.push({ action: `灵田·${s.name}(r${r})`, perDay: (2 * G.ITEMS[s.crop].price - s.price) / s.days });
        }
        // 悬赏领赏（猎杀型均值 4.5 杀 × 2 日/杀）
        actionBoard.push({ action: `悬赏领赏(r${r})`, perDay: (60 * eco(r)) / 9 });
        // 塔绩兑换（每胜层 +1 绩、塔战零游戏日 → 每绩价值 = 发放灵石价值/绩成本，折 1 层/日）
        for (const rd of TowerSys.REDEEMS) {
          let val = 0;
          if (rd.id === 'stones') val = 120 * eco(r);
          else if (rd.id === 'ore') val = 8 * (G.ITEMS['m_xuantie'] ? G.ITEMS['m_xuantie'].price : 0);
          else if (rd.id === 'pill') val = sell('pill_peiyuan');
          else if (rd.id === 'leijing') val = sell('m_leijing');
          else continue;   // 器魂等无灵石卖价去向不入灵石榜
          const cost = TowerSys.redeemCost(fp, rd);
          if (cost > 0) actionBoard.push({ action: `塔绩·${rd.name}(r${r})`, perDay: val / cost });
        }
        // 黑市价差（卖黑市 vs 坊市，月开市三日 → /30 摊；取池内最大价差单品）
        let bestBlack = 0;
        for (const x of BlackSys.POOL) {
          const d = G.ITEMS[x.id];
          if (!d || !d.price) continue;
          bestBlack = Math.max(bestBlack, (BlackSys.price(fp, x.id) - sell(x.id)) / 30);
        }
        if (bestBlack > 0) actionBoard.push({ action: `黑市价差(r${r})`, perDay: bestBlack });
        // 拍卖倒卖（60 日一期）：稳健出价买入 → 0.45 卖出
        for (const lot of AuctionSys.LOT_POOL) {
          const d = G.ITEMS[lot.item];
          if (!d || !d.price || lot.minRealm > r) continue;
          actionBoard.push({ action: `拍卖倒卖·${d.name}(r${r})`, perDay: (Math.floor(d.price * 0.45) - Math.round(lot.base * 1.15)) / 60 });
        }
      } finally { Game.player = realPlayer; }
    }
  }
  actionBoard.sort((a, b) => b.perDay - a.perDay);
  const top10 = actionBoard.slice(0, 10);
  const boardProblems = [];
  if (top10.length) {
    const ecoOf = a => Number(a.match(/r(\d+)\)$/)[1]);
    const top1 = top10[0];
    const line = 300 * G.stoneEco(ecoOf(top1.action));
    if (top1.perDay > line) boardProblems.push(`[现金流榜登顶] ${top1.action} 净 ${Math.round(top1.perDay)}/日 > 300×eco 线 ${Math.round(line)}`);
    const mids = actionBoard.map(x => x.perDay).sort((a, b) => a - b);
    const median = mids[Math.floor(mids.length / 2)];
    if (median > 0 && top1.perDay / median > 8) boardProblems.push(`[现金流榜离群] Top1 ${top1.action} 为中位数 ${Math.round(median)} 的 ${(top1.perDay / median).toFixed(1)} 倍（>8×）`);
  }
  return { rows: rows.length, zeroPrice, problems, auctionProblems, betProblems, betSamples, betTotal, betEv23, sectProblems, drawProblems, auctionGradeProblems, tierProblems, top10, boardProblems, boardAll: actionBoard.length };
});

await browser.close();
let md = `# v20 经济审计报告（scripts/price-audit.mjs 自动生成）\n\n采样画像：realm3、行情中位。\n\n- 物品总数：${report.rows}\n- 定价为 0 的稀有物（无坊市渠道，按品阶折算黑市价）：${report.zeroPrice.join('、') || '无'}\n\n## 问题清单（${report.problems.length}）\n`;
md += report.problems.length ? report.problems.map(p => `- ${p}`).join('\n') + '\n' : '- 无套利路径与定价倒挂。\n';
md += `\n## v34 扩容检测\n\n- 拍卖池倒挂（${report.auctionProblems.length}）：\n` + (report.auctionProblems.length ? report.auctionProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `- 黑市赌袋期望越界（${report.betProblems.length}）：\n` + (report.betProblems.length ? report.betProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `\n## v35 扩容检测\n\n- 宗门贡献汇率倒挂（${report.sectProblems.length}）：\n` + (report.sectProblems.length ? report.sectProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `- 画符现金流越界（${report.drawProblems.length}，四季复扫）：\n` + (report.drawProblems.length ? report.drawProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `- 拍卖功法品阶倒挂（${report.auctionGradeProblems.length}）：\n` + (report.auctionGradeProblems.length ? report.auctionGradeProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `\n## v36 扩容检测\n\n- 赌袋采样执行：${report.betSamples}/${report.betTotal}（四采样点全执行为验收线；满气运端已并入上方赌袋检测）\n`;
md += `- 满气运端（luck23）EV 信息行：${report.betEv23.join('、')}（门禁线 0.6×成本；处方预期 ≤0 待数据侧后续校准，见 UPDATE_NOTES）\n`;
md += `- 第七路·同表档位单调性（${report.tierProblems.length}）：\n` + (report.tierProblems.length ? report.tierProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 丹药配方对/丹药档位/种子相邻档/符箓池全零。\n');
md += `- 第八路·per-action 现金流榜（采样 ${report.boardAll} 行，Top10）：\n`;
md += (report.top10.length ? report.top10.map((x, i) => `  ${i + 1}. ${x.action} —— 净 ${Math.round(x.perDay).toLocaleString()} 灵石/日`).join('\n') + '\n' : '  - 无。\n');
md += `- 第八路·榜报警（${report.boardProblems.length}）：\n` + (report.boardProblems.length ? report.boardProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无越 300×eco 线或 Top1/中位 >8× 的离群动作。\n');
console.log(md);
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/price-audit.md', md);
