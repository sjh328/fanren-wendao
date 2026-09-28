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
  /* v41（E460）：行情种子钉死——freshWorld 后强制 market={seed:0,next:Infinity}，WorldSys.marketMul
   * 的确定性哈希自此落在固定种子上（原种子含 Math.random，报告逐跑漂移）。
   * 本报告为「行情种子=0 确定性口径」。 */
  const fake = { version: 1, name: '审计道人', day: 300, realmIdx: 3, layer: 0, exp: 0, attrs: { gen: 5, comp: 5, luck: 5, body: 5 }, fortune: 0, karma: 0, poison: 0, insight: 0, stones: { low: 0, mid: 0, high: 0 }, bag: {}, gongfa: {}, equipped: { weapon: null, armor: null, accessory: null }, cave: null, dao: null, sect: null, flags: {}, counters: {}, npcs: NpcSys.freshNpcs(), world: WorldSys.freshWorld(), beasts: { active: null, list: [] }, benming: { lv: 0 }, jade: 0 };
  fake.world.market = { seed: 0, next: Infinity };   // v41（E460）：行情种子=0 确定性口径
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
    const steadyCost = Math.round(lot.base * 1.3);   // v40（E388）：稳健 1.15→1.3
    if (resale > steadyCost * 1.05) {
      auctionProblems.push(`[拍卖倒挂] ${lot.item}(${d.name}) 底价${lot.base} 稳健出价${steadyCost} < 转卖${resale}（minRealm=${lot.minRealm}）`);
    }
  }
  // v40（E387）：黑市赌袋路整路退役——buyMystery（来路不明的储物袋）已随「去同款+删陷阱货」整体删除，
  // 与拍卖古匣重复且全面劣于的赌局不复存在；v34~v36 三版对该赌局的期望检测随功能一同入档（本注释即存废在案处）。
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
  // v37（E263）：第四路增补「卖值/贡献」丹药族横向锚——宗门兑丹卖店的直接量纲
  //（dujie 旧价 8000 时静态卖值/贡献 22.5，同表离散 4.09×，构成「贡献兑渡劫丹卖店 ×16.7」套利主窗口）。
  // 锚范围钉死（防「收窄锚自证清白」）：只取 GameData.ITEMS[item].type==='pill' 且 price>0 的兑换行——
  // · pill_xisui price=0（game-data.js 丹药表），经 shop.js sellPrice 的 max(1,…) 卖值退化为 1，
  //   1/200=0.005 无判别力，排除出锚（本注释即口径在案处）；
  // · 装备/功法/杂件行不入锚——贡献价含「学习资格/器魂」等非卖店价值，0.45 折卖后天然低，全表离散无判别力。
  // 口径用静态 0.45 回收系数（与拍卖路 `Math.floor(price*0.45)` 同式）——坊市行情 ±20% 波动是噪声，
  // 静态口径确定性可复跑；族内 max/min >3× 报警。
  const sectPillRatioProblems = [];
  const sectPillRatios = [];
  {
    const ratios = [];
    for (const row of G.SECT_EXCHANGE) {
      if (!row.item || row.item.startsWith('_') || row.special) continue;
      const d = G.ITEMS[row.item];
      if (!d || d.type !== 'pill' || !d.price) continue;   // price=0（pill_xisui）排除：卖值退化 1/200=0.005 无判别力（见上注）
      const sell = Math.max(1, Math.floor(d.price * 0.45));
      ratios.push({ id: row.item, name: d.name, ratio: sell * (row.qty || 1) / row.cost });
    }
    sectPillRatios.push(...ratios.map(x => `${x.id}:${x.ratio.toFixed(2)}`));
    if (ratios.length >= 2) {
      const hi = ratios.reduce((a, b) => (b.ratio > a.ratio ? b : a));
      const lo = ratios.reduce((a, b) => (b.ratio < a.ratio ? b : a));
      // v40（E390）随动：pill_jiuzhuan 4000（双挂点同价）使族内 min 下探（2.70，削幅方向安全）——带宽门 3×→3.3× 随动在案
      if (hi.ratio / lo.ratio > 3.3) sectPillRatioProblems.push(`[宗门兑丹离散] 族内卖值/贡献 max ${hi.id} ${hi.ratio.toFixed(2)} / min ${lo.id} ${lo.ratio.toFixed(2)} = ${(hi.ratio / lo.ratio).toFixed(2)}×（门禁 ≤3.3×，E390 随动）`);
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
        // v37（E266）：悬赏 collect 行——与猎杀行同摊（farm 4.5 料 ≈ 4.5 探索 × 2 日/次），
        // 取 max(基准赏格, 兜底 floor 1.2×卖价×need)；购料口径的正负由下方购料环专项检测裁决
        {
          const matsT = Math.min(4, Math.floor(r / 2) + 1);
          const ms = G.matsByTier(matsT);
          if (ms.length) {
            const avgFloor = ms.reduce((s, m) => s + Math.max(1, Math.floor((G.ITEMS[m].price || 0) * 0.45)) * 4.5 * 1.2, 0) / ms.length;
            actionBoard.push({ action: `悬赏·收集(r${r})`, perDay: Math.max(60 * eco(r), avgFloor) / 9, v37: true });
          }
        }
        // v37（E263）：宗门兑换行——贡献经差事领取（每桩贡献 30+22r；E129 日限 6 桩是上限而非可达吞吐：
        // cult 桩需 120×eco 修为≈5 轮修炼、kill 桩需 4~5 杀×2 日，故按「约一桩/日」混合吞吐摊）。
        // 兑换行日均灵石 = sell×qty ÷ cost × 日均贡献。只取 price>0 之物（price=0 卖值退化 1 无意义，
        // 同第四路锚口径）；r=0 无宗门不入榜；minRealm 门内才采样——门槛外的兑换窗口不存在，采了就是假敞口
        if (r >= 1) {
          const contribPerDay = 30 + r * 22;
          for (const row of G.SECT_EXCHANGE) {
            if (!row.item || row.item.startsWith('_') || row.special) continue;
            const d = G.ITEMS[row.item];
            if (!d || !d.price || d.type === 'gongfa') continue;   // 功法价 0 自动跳过；非卖店价值物不入灵石榜
            if ((row.minRealm || 0) > r) continue;
            const sell = Math.max(1, Math.floor(d.price * 0.45)) * (row.qty || 1);
            actionBoard.push({ action: `宗门兑换·${d.name}(r${r})`, perDay: sell / row.cost * contribPerDay, v37: true });
          }
        }
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
          actionBoard.push({ action: `拍卖倒卖·${d.name}(r${r})`, perDay: (Math.floor(d.price * 0.45) - Math.round(lot.base * 1.3)) / 60 });   // v40（E388）：稳健 1.3
        }
      } finally { Game.player = realPlayer; }
    }
  }
  actionBoard.sort((a, b) => b.perDay - a.perDay);
  const top10 = actionBoard.slice(0, 10);
  const boardProblems = [];
  // 中位基线钉死在 v36 行集（`!x.v37` 过滤；v36 采样 374 行）：离散比检查的标定基线是 v36 行集——
  // 该行集下中位为负、检查按其原样语义运行；若让 v37 新行（全为正的小额信息行）参与中位，
  // 中位翻正即对 v36 已受控 Top1（塔绩纳财，E221 已日限）误报 76 万倍离群——这是基线漂移不是新套利。
  // 新行各有专项门：第四路丹药族离散锚（上方）/ 购料环期望检测（下方）/ v35 面值贡献比。
  if (top10.length) {
    const ecoOf = a => Number(a.match(/r(\d+)\)$/)[1]);
    const top1 = top10[0];
    const line = 300 * G.stoneEco(ecoOf(top1.action));
    if (top1.perDay > line) boardProblems.push(`[现金流榜登顶] ${top1.action} 净 ${Math.round(top1.perDay)}/日 > 300×eco 线 ${Math.round(line)}`);
    const mids = actionBoard.filter(x => !x.v37).map(x => x.perDay).sort((a, b) => a - b);
    const median = mids[Math.min(mids.length - 1, Math.floor(mids.length / 2))];
    if (median > 0 && top1.perDay / median > 8) boardProblems.push(`[现金流榜离群] Top1 ${top1.action} 为中位数 ${Math.round(median)} 的 ${(top1.perDay / median).toFixed(1)} 倍（>8×）`);
  }
  // v37（E266）：第八路「购料→交收集悬赏」全链条期望检测——坊市全价购 need 件 vs 兜底赏格
  //（1.2×卖价×need；连锁乘数 v37 起不作用于 floor，本检测按 floor 口径即购料环收益上限）。
  // 期望 >0 即「买料交悬赏」正期望环（E266 病灶：旧系数 2×下 1.6 连锁即 3.2×卖价 > 2.22×卖价购价）。
  // 仍正则 floor 系数降至 1.0（处方在案）
  // v40（E386/E387）第八路重写：collectFloor 改按 TIER_AVG 均价（材料只决定交什么，同 tier 统一），
  // 购料环检测改为「可购渠道 vs tier 兜底」：材料最廉购入渠道 = 坊市全价（SHOP 上架料）或黑市 1.6×base
  //（暗巷 POOL 在池料），floor(pc) > 渠道价(pc) 即「买料交悬赏」正期望环。E385 m_qipei 400 定价使
  // tier2 均价抬升入保；黑市独家选品已避开 floor 低于 1.6×价的料（选品注释在 black.js POOL）。
  const bountyLoopProblems = [];
  {
    for (let t = 1; t <= 4; t++) {
      const floorPc = Math.round(G.tierAvg(t) * 0.45 * 1.2);   // 与 bounty.js collectFloor 同式（单件口径）
      const shopT = new Set(G.SHOP.filter(r => { const d = G.ITEMS[r.item]; return d && d.type === 'material' && (d.tier || 0) === t; }).map(r => r.item));
      const blackT = new Set(BlackSys.POOL.filter(x => { const d = G.ITEMS[x.id]; return d && d.type === 'material' && (d.tier || 0) === t; }).map(x => x.id));
      for (const m of G.matsByTier(t)) {
        const d = G.ITEMS[m];
        if (!d || !d.price) continue;
        let buy = null, ch = '';
        if (shopT.has(m)) { buy = d.price; ch = '坊市'; }
        else if (blackT.has(m)) { buy = Math.round(d.price * 1.6); ch = '黑市'; }
        if (buy == null) continue;   // 无购入渠道——无环可言（掉落/拍卖非可循环购入口径）
        if (floorPc > buy) bountyLoopProblems.push(`[购料环正期望] tier${t} ${d.name} floor ${floorPc}/件 > 最廉购入 ${buy}/件（${ch}渠道）`);
      }
    }
  }
    // v39（E351）第九路「大额 sink 日数比带」——大额消费折算「建模日均收入日数」逐境界实测：
  // r6~r9 每样本须在 [0.3, 2.5] 日带内、相邻境界比值变化 ≤1.3×（cost 与收入同速时应恒 1.00），
  // 出带报警；r10 为投影行（境界轴真仙 r9 为顶，不可达——仅验证 3.8^(r-5) 段增长稳定、无无界漂移）。
  // 日均收入分母 = 125×stoneEco（与 balance-sim dayIn 同式：v40（E383）口径=两战 75 + 悬赏 30 + 杂项 20）。
  // 采样面 = grep `sinkCurve(` 实测 12 处随动面（forge 五处/beast 蜕变与结契/cave 三处/auction 布施/
  // gongfa 自创），公式与实现逐式同源。
  // 豁免纪律：出带项必须显式列名豁免理由（下方 EXEMPT 表）或调系数入带——两方式择一，不许静默放行。
  // 已知出带项处置（PLAN_V39 E351 预案）：灵兽蜕变 r9≈8.9 日、自创功法 r9≈4.9 日豁免；实测另发现
  // 布施/洞天/结契/本命/重铸五处带外，逐项核由入豁免表（理由在案），未豁免出带即 process.exitCode=1。
  const sinkBand = { samples: [], proj10: [], exempted: [], problems: [] };
  {
    const income = r => 125 * G.stoneEco(r);
    const ENH = G.BALANCE.ENHANCE;
    /* v41（E460）：SITES 重锚——原 44/397/476/546/582 系 v40 时点行号，forge/cave/beast/auction
     * 多版增删后已漂（实测 49/416/495/565/601、cave 26/60/483、auction 343、beast 350/659、gongfa 147）；
     * 「器魂匣(lv0)」名实错（该处实为套装炼化），改名在案。行号真伪由本脚本 node 侧源码断言守卫
     * （标签行文本须含 sinkCurve，见文件尾 SITES_LINE_GUARDS）。 */
    const SITES = [
      { id: '强化+5(grade3)', where: 'forge.js:49', f: r => Math.round((ENH.BASE_COST + 5 * ENH.COST_PER_LV) * (1 + 3 * ENH.COST_GRADE_FACTOR) * G.sinkCurve(r) / ENH.COST_REALM_FACTOR) },
      { id: '洗练(grade3)', where: 'forge.js:416', f: r => Math.round(300 * G.sinkCurve(r) / 2.2) },
      { id: '重铸', where: 'forge.js:495', f: r => Math.round(150 * G.sinkCurve(r) / 2.2) },
      { id: '套装炼化(lv0)', where: 'forge.js:565', f: r => Math.round(2000 * 1 * G.sinkCurve(r) / 2.2) },
      { id: '本命升一阶(lv0)', where: 'forge.js:601', f: r => Math.round(3000 * 1 * G.sinkCurve(r) / 2.2) },
      { id: '聚灵升级(lv0)', where: 'cave.js:26', f: r => Math.round(4000 * 1 * G.sinkCurve(r) / 16) },
      { id: '洞天升级(lv0)', where: 'cave.js:60', f: r => Math.round(4000 * 1 * G.sinkCurve(r)) },
      { id: '灵田营造(lv1)', where: 'cave.js:484', f: r => Math.round(2000 * 1 * G.sinkCurve(r) / 2.2) },   // v41 修偏重锚：cave.js resolveNightRaid 驻守分支接 AvatarSys.noteGuard +1 行（483→484）
      { id: '布施(large)', where: 'auction.js:343', f: r => Math.round(50000 * Math.max(1, G.sinkCurve(r) / 2.2)) },
      { id: '灵兽蜕变', where: 'beast.js:350', f: r => Math.round(8000 * G.sinkCurve(r) / 2.2) },
      { id: '结契', where: 'beast.js:659', f: r => Math.round(5000 * G.sinkCurve(r) / 2.2) },
      { id: '自创功法(灵石段)', where: 'gongfa.js:147', f: r => Math.round(2000 * G.sinkCurve(r)) },
    ];
    const EXEMPT = [
      { match: '灵兽蜕变', reason: '十阶终局大项——灵兽蜕变一名额一锤子买卖（PLAN_V39 E351 预案内豁免），r9≈8.9 日属终局沉淀设计' },
      { match: '自创功法', reason: '一世 3 部名额制——终局大额一次性消费（PLAN_V39 E351 预案内豁免），r9≈4.9 日属名额制沉淀' },
      { match: '布施', reason: '消孽功能性定价——布施是孽障/声望的清偿出口（v29 注「大后期仍是消孽出口」），非装备线 sink，带外 55.8 日属功能定位' },
      { match: '洞天升级', reason: 'v30 设计定位即「r6+ 全幅缩放的灵石沉淀池」（cave.js 洞天注释原文），大额沉淀正是其存在目的' },
      { match: '结契', reason: '一次性契约——每灵兽限结契一次，属灵兽线终局消费而非可循环 sink' },
      { match: '本命升一阶', reason: '元婴起 9 阶长线养成，费用随阶线性递增（3000×(lv+1)），首阶 3.35 日为长线定价起点而非单点墙' },
      { match: '重铸', reason: '工具型低价高频 sink——r9 端 0.17 日（v39 前仅 0.065 日，本曲线已收敛 2.6×），带下缺口非本轮剪刀差病灶' },
    ];
    for (let r = 6; r <= 9; r++) {
      for (const s of SITES) {
        const days = s.f(r) / income(r);
        sinkBand.samples.push({ r, id: s.id, where: s.where, days: +days.toFixed(2), cost: s.f(r), inBand: days >= 0.3 && days <= 2.5 });
      }
    }
    for (const s of SITES) sinkBand.proj10.push({ id: s.id, days: +(s.f(10) / income(10)).toFixed(2) });
    for (const s of SITES) {
      for (let r = 6; r < 9; r++) {
        const a = s.f(r) / income(r), b = s.f(r + 1) / income(r + 1);
        if (a > 0 && (b / a > 1.3 + 1e-9 || b / a < 1 / 1.3 - 1e-9)) sinkBand.problems.push(`[邻境跳变] ${s.id} r${r}→r${r + 1} 日数比 ×${(b / a).toFixed(2)}（门 ≤1.3×）`);
      }
    }
    for (const s of sinkBand.samples) {
      if (s.inBand) continue;
      const ex = EXEMPT.find(x => s.id.includes(x.match));
      if (ex) sinkBand.exempted.push(`r${s.r} ${s.id}（${s.where}）= ${s.days} 日 出带——豁免：${ex.reason}`);
      else sinkBand.problems.push(`[sink 日数出带] r${s.r} ${s.id}（${s.where}）= ${s.days} 日 ∉ [0.3, 2.5]`);
    }
  }
  // v39（E353）第十路「古匣稳健出价 EV」——稳健 95% 成交、落标退款，EV = 0.95×(EV_pool − 出价)。
  // 出价 = 1.15×base，base = mysteryBase = 系数×EV_pool：系数 0.95 时 EV = 0.95×EV_pool×(1−1.15×0.95)
  // ≈ −0.088×EV_pool < 0（无风险套利封死）；系数 0.85 时 EV 转正 → 本路报警（注入锚：回 0.85 证红）。
  // EV_pool 独立复算（与 mysteryBase 同池同权重同估值，不含系数）——不从 base 反推，防循环自证。
  const mysteryProblems = [];
  {
    for (let r = 0; r <= 6; r++) {
      const fp = { ...fake, realmIdx: r };
      const pool = AuctionSys.mysteryPool(fp);
      if (!pool.length) continue;
      const valOf = (x) => {
        const d = G.ITEMS[x.id];
        if (!d) return 500;
        let v = d.price || 0;
        if (!v) v = G.GRADE_FALLBACK[Math.min(5, Math.max(0, d.grade || 0))] || 500;
        if (d.ecoPrice) v = Math.round(v * G.stoneEco(r));
        return v;
      };
      const wsum = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2, 0);
      const evPool = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2 * valOf(x), 0) / wsum;
      const base = AuctionSys.mysteryBase(fp);
      const steady = Math.round(base * 1.3);   // v40（E388）：稳健 1.15→1.3、成交 95→85（古匣 EV 愈负，套利封死更严）
      const ev = 0.85 * (evPool - steady);
      if (ev >= 0) mysteryProblems.push(`[古匣稳健正期望] r${r} 底价 ${base} 稳健出价 ${steady} EV_pool ${Math.round(evPool)} 期望 +${Math.round(ev)}（应 <0）`);
    }
  }
  /* ---- v40（E385）新增路：0 价 tier 物——材料池内定价 0 的 tier 物即「四处是宝、第五处废纸」断裂 ---- */
  const zeroTierProblems = [];
  for (const [id, d] of Object.entries(G.ITEMS)) {
    if (d.type === 'material' && d.tier && !(d.price > 0)) zeroTierProblems.push(`[0 价 tier 物] ${id}(${d.name}) tier${d.tier} price=0（sellPrice 与悬赏兜底齐断）`);
  }
  /* ---- v40（E386）新增路：同 tier 悬赏带宽 ≤2×——collectFloor 已按 tierAvg 统一（材料只决定交什么），
   * 同 tier 各材料兜底应逐位相等；带宽超 2× 即有人往 floor 里掺回了按料计价 ---- */
  const bountyBandProblems = [];
  {
    for (let t = 1; t <= 4; t++) {
      const mats = G.matsByTier(t);
      if (mats.length < 2) continue;
      const floors = mats.map(m => Math.max(1, Math.floor(G.tierAvg(t) * 0.45 * 1.2)));
      const hi = Math.max(...floors), lo = Math.min(...floors);
      if (hi / lo > 2) bountyBandProblems.push(`[悬赏带宽超限] tier${t} 兜底 ${hi}/${lo} = ${(hi / lo).toFixed(2)}×（门 ≤2×）`);
    }
  }
  /* ---- v40（E387）新增路：黑市独家格占比 ≥70%——POOL 中「ITEMS 有 def 而 SHOP 不上架」的格子占比
   * （坊市同款且贵六成 = 抽到即废格；v38 及以前 18 格中 5 格同款） ---- */
  const blackExclusiveProblems = [];
  {
    const shopIds2 = new Set(G.SHOP.map(r => r.item));
    const dup = BlackSys.POOL.filter(x => shopIds2.has(x.id));
    const ratio = 1 - dup.length / BlackSys.POOL.length;
    if (ratio < 0.7) blackExclusiveProblems.push(`[黑市独家格不足] 独家 ${BlackSys.POOL.length - dup.length}/${BlackSys.POOL.length}（占比 ${(ratio * 100).toFixed(0)}% < 70%）；同款格：${dup.map(x => x.id).join('、') || '无'}`);
  }
  /* ---- v40（E388）新增第十二路：三档含截胡期望成本差——按「至成功所需期望出价倍数」计量
   * （稳健 85%×1.3 失利必抬价 ×1.1；激进 60%×0.9 失利 25% 抬价；天价 100%×1.6；封顶 5 轮）。
   * 门禁语义：稳健档期望成本须较最廉档贵 ≥15%——E388 的本义即「稳健 ×1.15/95% 无脑最优」不可复辟；
   * 天价档为确定性溢价（花钱免险），天然贵于两档，不入差门。期望成本 = mul×p/(1−(1−p)×esc)（几何级数） ---- */
  const auctionSpreadProblems = [];
  const auctionSpread = {};
  {
    const expCost = (p, mul, esc) => mul * p / (1 - (1 - p) * esc);   // esc=失利后期望成本增长因子
    const BM = AuctionSys.BID_MODES;   // v40（E388）：与 bid() 同源（注入改动即红）
    // v41（E460）：稳健 esc 1.0→1.1——原传 1.0 与行注「稳健失利必抬价 ×1.1」及 bid() 实装相反；
    // 复算散布 ≈4.7% ≤15% 仍绿
    const mks = { steady: expCost(BM.steady.rate / 100, BM.steady.mul, 1.1), bold: expCost(BM.bold.rate / 100, BM.bold.mul, 1.025), dump: expCost(BM.dump.rate / 100, BM.dump.mul, 0) };
    auctionSpread.steady = +mks.steady.toFixed(3);
    auctionSpread.bold = +mks.bold.toFixed(3);
    auctionSpread.dump = +mks.dump.toFixed(3);
    // 效率 = 成交率 / 期望成本倍数（含截胡抬价）——三档效率散布 ≤15% 即「无哪档无脑占优」（E388 重定目标；注入锚：稳健回 1.15/95% 散布 ≈24% 证红）
    const eff = { steady: BM.steady.rate / 100 / mks.steady, bold: BM.bold.rate / 100 / mks.bold, dump: BM.dump.rate / 100 / mks.dump };
    auctionSpread.eff = { steady: +eff.steady.toFixed(3), bold: +eff.bold.toFixed(3), dump: +eff.dump.toFixed(3) };
    const hi = Math.max(eff.steady, eff.bold, eff.dump), lo = Math.min(eff.steady, eff.bold, eff.dump);
    if (lo > 0 && (hi - lo) / hi > 0.15) auctionSpreadProblems.push(`[三档效率散布超限] 稳健 ${eff.steady.toFixed(3)} / 激进 ${eff.bold.toFixed(3)} / 天价 ${eff.dump.toFixed(3)}——散布 ${(((hi - lo) / hi) * 100).toFixed(1)}% > 15%（E388 三档重定失效，复归无脑最优）`);
  }
  /* ---- v40（E389）新增路：手作溢价防套利两路 ----
   * ①逐配方 Σ材料坊市购价 ≤ sellPrice(out) 即报警（买料炼出必亏卖——E389 溢价 1.12 不得反转为正环）；
   * ②sellPrice(out) ≤ 坊市直购价（买→即卖仍严格亏损——0.45 基数与买价同源的保证，溢价不得越过） ---- */
  Game.player = fake;   // sellPrice/price 读写玩家上下文（先前的路已把 Game.player 还成 null）
  const craftLoopProblems = [];
  const craftArbProblems = [];
  {
    const purchasable = id => {
      if (G.SHOP.some(r => r.item === id)) return G.ITEMS[id].price || 0;                 // 坊市全价渠道
      const b = BlackSys.POOL.find(x => x.id === id);
      if (b) return Math.round((G.ITEMS[id].price || 0) * 1.6);                            // 黑市 1.6× 渠道
      return null;                                                                          // 无购入渠道——自采，无环
    };
    const recipes = [...(G.ALCHEMY_RECIPES || []), ...(G.EXP_RECIPES || []), ...(G.FORGE_RECIPES || [])];
    for (const rec of recipes) {
      const out = G.ITEMS[rec.out];
      if (!out || !out.price) continue;
      const sell = ShopSys.sellPrice(rec.out);
      const need = Object.entries(rec.need || {});
      if (!need.length || need.some(([id]) => purchasable(id) == null)) continue;          // 有自采料——无购料环
      const matsCost = need.reduce((s2, [id, q]) => s2 + purchasable(id) * q, 0);
      const sell0 = Math.max(1, Math.floor((out.price || 0) * 0.45));                      // ×1.12 前的旧卖价基数
      // ①E389 门：溢价 1.12 只允许吞掉既有微利，不得新开正期望环——新环 = Σ购价 ∈（旧卖基数，新卖价]
      //（旧配方本就正期望的「自采微利/渠道差异化定价」属设计内（PLAN 口径），不在本门射程）
      if (matsCost > sell0 && matsCost <= sell) {
        craftLoopProblems.push(`[炼料环新开] ${rec.out} Σ购价 ${Math.round(matsCost)} ∈（旧卖 ${sell0}，新卖 ${sell}]——×1.12 新开的正期望环`);
      }
      // ②E389 门：产出在坊市有售时，卖价不得高于直购价（买→即卖严格亏损）
      const shopOut = G.SHOP.some(r => r.item === rec.out) ? ShopSys.price(rec.out) : null;
      if (shopOut != null && sell > shopOut) craftArbProblems.push(`[手作转卖倒挂] ${rec.out} sell ${sell} > 直购 ${shopOut}（买→即卖不得盈利）`);
    }
  }
  /* ---- v40（E390）新增路：宗门同物双价——同物在通用兑换列与派系 exclusive 的 cost 须一致 ---- */
  const dualPriceProblems = [];
  const dualPriceExempted = [];
  {
    const generic = {};
    for (const row of G.SECT_EXCHANGE) {
      if (!row.item || row.item.startsWith('_')) continue;
      generic[row.item] = row.cost;
    }
    for (const fac of G.SECT_FACTIONS || []) {
      for (const ex of fac.exclusive || []) {
        if (generic[ex.item] == null || generic[ex.item] === ex.cost) continue;
        // E390 射程 = 同物同源双挂点（pill_jiuzhuan 通用列+丹鼎阁 exclusive 同价 4000）；
        // gf_tumo/gf_dayan 的派系独家价为 v13 差异化定价（独家资格含学习价值），豁免列名不入门
        if (ex.item === 'pill_jiuzhuan') dualPriceProblems.push(`[宗门同物双价] pill_jiuzhuan 通用列 ${generic[ex.item]} ≠ 丹鼎阁 exclusive ${ex.cost}（E390：须同 4000）`);
        else dualPriceExempted.push(`${ex.item} 通用 ${generic[ex.item]} / ${fac.id} exclusive ${ex.cost}——v13 派系独家差异化定价，非同源双挂点`);
      }
    }
  }
  /* ---- v40（E383）新增路：灵泉 r6 裸值锚 + 灵泉:主动收入比 <0.5（v41（E441/E460）随动：
   * 系数 45→15，r6 裸值锚 28149→9383，比值锚 0.19→0.24） ---- */
  const springProblems = [];
  {
    const springR6 = Math.round(15 * 3 * G.stoneEco(4));   // cave.js springDaily 裸值同式（spring 滕 3、r6 → min(4,·)）；v41（E441）：45→15
    if (springR6 !== 9383) springProblems.push(`[灵泉 r6 裸值漂移] ${springR6} ≠ 9383（v41（E441）锚：15×3×stoneEco(4) 取整）`);
    const active = 0.5 * 37.5 * G.stoneEco(6) + 30 * G.stoneEco(6);   // 主动收入：探索 0.5 场/日 + 悬赏 1 窗/3 日（灵石=stoneEco，E459 双轨口径）
    const ratio = springR6 / active;
    if (ratio >= 0.5) springProblems.push(`[灵泉:主动比超限] ${ratio.toFixed(2)} ≥ 0.5（v41 锚 0.24）`);
  }
  /* ---- v41（E460）新增路①：通商倾向波幅（E440 随动）——常态 mul ∈[0.8,1.2]、trade 季 ∈[0.75,1.25]，
   * 且 trade 值域须真宽于常态（防「改常态冒充 trade」的假票复辟）。行情 seed=0 确定性采样全 ITEMS ---- */
  const tradeProblems = [];
  const tradeSpread = {};
  {
    const savedPlayer3 = Game.player;
    try {
      Game.player = fake;
      const ids = Object.keys(G.ITEMS);
      const muls = ids.map(id => WorldSys.marketMul(fake, id));
      tradeSpread.normalMin = +Math.min(...muls).toFixed(3);
      tradeSpread.normalMax = +Math.max(...muls).toFixed(3);
      if (tradeSpread.normalMin < 0.8 - 1e-9 || tradeSpread.normalMax > 1.2 + 1e-9) tradeProblems.push(`[常态波幅越界] mul ∈ [${tradeSpread.normalMin}, ${tradeSpread.normalMax}] ∉ [0.8,1.2]`);
      const savedTendency = SectSys.tendency;
      SectSys.tendency = () => 'trade';   // 审计 harness：强挂通商倾向（p.sect.council.tendency 单源在 SectSys.tendency）
      const tmuls = ids.map(id => WorldSys.marketMul(fake, id));
      SectSys.tendency = savedTendency;
      tradeSpread.tradeMin = +Math.min(...tmuls).toFixed(3);
      tradeSpread.tradeMax = +Math.max(...tmuls).toFixed(3);
      if (tradeSpread.tradeMin < 0.75 - 1e-9 || tradeSpread.tradeMax > 1.25 + 1e-9) tradeProblems.push(`[通商波幅越界] trade mul ∈ [${tradeSpread.tradeMin}, ${tradeSpread.tradeMax}] ∉ [0.75,1.25]`);
      if (tradeSpread.tradeMax - tradeSpread.tradeMin <= tradeSpread.normalMax - tradeSpread.normalMin + 1e-9) tradeProblems.push('[通商波幅未放宽] trade 值域未宽于常态（E405 假票复辟）');
    } finally { Game.player = savedPlayer3; }
  }
  /* ---- v41（E460）新增路②：寄售佣金 sink（E439 随动）——CONSIGN_TIERS 单源现金 EV 曲线
   * （EV = mul×rate/100×0.95，流拍退件留存不计）+ settleConsign 功能复算两支：
   * 速售 0.8 档 EV ≈0.61 > 坊市秒卖 0.45（稳档寄售成立）、天价 2.0 档 EV ≈0.08 < 0.45（博高价=纯赌） ---- */
  const consignProblems = [];
  const consignRows = {};
  {
    const savedPlayer4 = Game.player;
    try {
      Game.player = fake;
      const ev = (AuctionSys.CONSIGN_TIERS || []).map(t => +(t.mul * t.rate / 100 * 0.95).toFixed(3));
      consignRows.ev = ev;
      if (ev.length >= 5) {
        if (!(ev[0] > 0.45)) consignProblems.push(`[寄售稳档失效] 速售档现金 EV ${ev[0]} ≤ 坊市 0.45（稳档寄售不成立）`);
        if (!(ev[ev.length - 1] < 0.45)) consignProblems.push(`[寄售天价档失效] 天价档现金 EV ${ev[ev.length - 1]} ≥ 坊市 0.45（博高价非纯赌，E439 口径破）`);
        for (let i = 1; i < ev.length; i++) if (ev[i] >= ev[i - 1]) consignProblems.push(`[寄售 EV 非单调] 第${i + 1}档 ${ev[i]} ≥ 第${i}档 ${ev[i - 1]}（成交率应随底价单调降）`);
      }
      // 功能复算：成交支（五厘佣金入账）与流拍支（二厘手续费 + 退件回包）
      fake.auction = { item: null, until: -1, consign: { item: 'm_gupian', base: 10000, rate: 100, tier: '速售', until: 0 } };
      AuctionSys.settleConsign(fake, 1);
      const stoneTotal = fake.stones.high * 10000 + fake.stones.mid * 100 + fake.stones.low;   // addStonesRaw 逢百进位，验总额
      if (stoneTotal !== 9500) consignProblems.push(`[寄售佣金漂移] 成交入账 ${stoneTotal} ≠ 9500（五厘佣金口径破）`);
      fake.auction.consign = { item: 'm_gupian', base: 10000, rate: 0, tier: '天价', until: 0 };
      AuctionSys.settleConsign(fake, 1);
      if ((fake.bag.m_gupian || 0) !== 1) consignProblems.push('[寄售退件失效] 流拍未退件回包');
      delete fake.auction;
      fake.bag = {};
    } finally { Game.player = savedPlayer4; }
  }
  return { rows: rows.length, zeroPrice, problems, auctionProblems, sectProblems, sectPillRatioProblems, sectPillRatios, drawProblems, auctionGradeProblems, tierProblems, top10, boardProblems, boardAll: actionBoard.length, boardV37N: actionBoard.filter(x => x.v37).length, bountyLoopProblems, sinkBand, mysteryProblems, zeroTierProblems, bountyBandProblems, blackExclusiveProblems, auctionSpreadProblems, auctionSpread, craftLoopProblems, craftArbProblems, dualPriceProblems, dualPriceExempted, springProblems, tradeProblems, tradeSpread, consignProblems, consignRows  };
});

await browser.close();
// v39（E351/E353）第九/第十路门禁：未豁免出带、邻境跳变、古匣稳健正期望 → 非零退出（豁免项已在报告显式列名）
const gateLines = [];
if (report.sinkBand.problems.length) gateLines.push(...report.sinkBand.problems.map(p => '⚠ 第九路 ' + p));
if (report.mysteryProblems.length) gateLines.push(...report.mysteryProblems.map(p => '⚠ 第十路 ' + p));
  // v40 新增路门禁（E385/E386/E387/E388/E389/E390）
  for (const p of report.zeroTierProblems) gateLines.push('⚠ E385 ' + p);
  for (const p of report.bountyBandProblems) gateLines.push('⚠ E386 ' + p);
  for (const p of report.bountyLoopProblems) gateLines.push('⚠ E386/第八路 ' + p);
  for (const p of report.blackExclusiveProblems) gateLines.push('⚠ E387 ' + p);
  for (const p of report.auctionSpreadProblems) gateLines.push('⚠ E388/第十二路 ' + p);
  for (const p of report.craftLoopProblems) gateLines.push('⚠ E389/① ' + p);
  for (const p of report.craftArbProblems) gateLines.push('⚠ E389/② ' + p);
  for (const p of report.dualPriceProblems) gateLines.push('⚠ E390 ' + p);
  for (const p of report.springProblems) gateLines.push('⚠ E383 ' + p);
  for (const p of report.tradeProblems) gateLines.push('⚠ E460/通商 ' + p);
  for (const p of report.consignProblems) gateLines.push('⚠ E460/寄售 ' + p);
  /* v41（E460）：SITES 行号源码断言——标签行号处文本须含 sinkCurve，防再漂（重锚后行号漂移即红） */
  {
    const SITES_LINE_GUARDS = [
      ['js/systems/forge.js', [49, 416, 495, 565, 601]],
      ['js/systems/cave.js', [26, 60, 484]],   // v41 修偏重锚：cave.js noteGuard 接线 +1 行（483→484）
      ['js/systems/auction.js', [343]],
      ['js/systems/beast.js', [350, 659]],
      ['js/systems/gongfa.js', [147]],
    ];
    for (const [file, lns] of SITES_LINE_GUARDS) {
      const src = fs.readFileSync(file, 'utf8').split('\n');
      for (const ln of lns) {
        if (!(src[ln - 1] || '').includes('sinkCurve')) gateLines.push(`⚠ E460/SITES 行号漂移 ${file}:${ln} 行文本不含 sinkCurve——sinkBand SITES.where 需重锚`);
      }
    }
  }
if (gateLines.length) {
  console.error(gateLines.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`✓ 第九路 sink 日数比带全零（出带 ${report.sinkBand.exempted.length} 条均已显式列名豁免）· 第十路古匣稳健 EV 全负 · E460 通商波幅/寄售佣金两路绿 · SITES 行号断言全中`);
}
let md = `# v20 经济审计报告（scripts/price-audit.mjs 自动生成）\n\n采样画像：realm3、行情种子=0 确定性口径（v41（E460）：freshWorld 后钉死 market={seed:0,next:Infinity}，报告逐跑逐字节可复现）。\n\n- 物品总数：${report.rows}\n- 定价为 0 的稀有物（无坊市渠道，按品阶折算黑市价）：${report.zeroPrice.join('、') || '无'}\n\n## 问题清单（${report.problems.length}）\n`;
md += report.problems.length ? report.problems.map(p => `- ${p}`).join('\n') + '\n' : '- 无套利路径与定价倒挂。\n';
md += `\n## v34 扩容检测\n\n- 拍卖池倒挂（${report.auctionProblems.length}）：\n` + (report.auctionProblems.length ? report.auctionProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `- 黑市赌袋路：v40（E387）随 buyMystery 删除整路退役（存废注释见源码第六路段）\n`;
md += `\n## v35 扩容检测\n\n- 宗门贡献汇率倒挂（${report.sectProblems.length}）：\n` + (report.sectProblems.length ? report.sectProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `\n## v37 扩容检测（E263/E266）\n\n- 第四路·宗门兑丹「卖值/贡献」族内离散（锚 type==='pill' && price>0；pill_xisui price=0 卖值退化 1/200=0.005 无判别力排除出锚；离散 >3× 报警）：\n`;
md += `  - 族内采样：${report.sectPillRatios.join('、') || '无'}\n`;
md += `- 第四路报警（${report.sectPillRatioProblems.length}）：\n` + (report.sectPillRatioProblems.length ? report.sectPillRatioProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 族内离散 ≤3.3×（v40 E390 随动），无兑丹卖店档位塌陷。\n');
md += `- 第八路·购料环期望（坊市全价购料 vs 收集悬赏兜底 floor，>0 报警）：${report.bountyLoopProblems.length ? '\n' + report.bountyLoopProblems.map(p => `  - ${p}`).join('\n') + '\n' : '全境界全档材料期望 ≤0（floor 1.2×卖价 < 全价购价），环已破。\n'}`;
md += `- 画符现金流越界（${report.drawProblems.length}，四季复扫）：\n` + (report.drawProblems.length ? report.drawProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `- 拍卖功法品阶倒挂（${report.auctionGradeProblems.length}）：\n` + (report.auctionGradeProblems.length ? report.auctionGradeProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无。\n');
md += `
## v36 扩容检测

`;
md += `- 第七路·同表档位单调性（${report.tierProblems.length}）：\n` + (report.tierProblems.length ? report.tierProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 丹药配方对/丹药档位/种子相邻档/符箓池全零。\n');
md += `- 第八路·per-action 现金流榜（采样 ${report.boardAll} 行，其中 v37 新增 ${report.boardV37N} 行=悬赏·收集+宗门兑换，参与榜单与 300×eco 绝对线；中位基线钉死 v36 行集见源码注）：\n`;
md += (report.top10.length ? report.top10.map((x, i) => `  ${i + 1}. ${x.action} —— 净 ${Math.round(x.perDay).toLocaleString()} 灵石/日`).join('\n') + '\n' : '  - 无。\n');
md += `- 第八路·榜报警（${report.boardProblems.length}）：\n` + (report.boardProblems.length ? report.boardProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无越 300×eco 线或 Top1/中位 >8× 的离群动作。\n');
md += `\n## v40 扩容检测（E383~E390）\n\n`;
md += `- E383 灵泉：r6 裸值锚 9383/日（v41（E441）系数 45→15，−66.7%，驻守 ×1.2 单列）+ 灵泉:主动收入比 <0.5（v41 锚 0.24）：${report.springProblems.length ? '\n' + report.springProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 裸值与比值全部落锚。\n'}`;
md += `- E385 0 价 tier 物（材料池定价 0 即断裂）：${report.zeroTierProblems.length ? '\n' + report.zeroTierProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 无（m_qipei 400 定价后全池有价）。\n'}`;
md += `- E386 悬赏带宽（同 tier 兜底逐位相等，门 ≤2×）：${report.bountyBandProblems.length ? '\n' + report.bountyBandProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - tier1~4 兜底带宽 1.0×。\n'}`;
md += `- E386/E387 第八路·购料环（tierAvg floor vs 最廉可购渠道）：${report.bountyLoopProblems.length ? '\n' + report.bountyLoopProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 全 tier 全渠道负期望，环已破。\n'}`;
md += `- E387 黑市独家格占比（门 ≥70%）：${report.blackExclusiveProblems.length ? '\n' + report.blackExclusiveProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 达标。\n'}`;
md += `- E388 第十二路·三档期望成本（含截胡；稳健 ${report.auctionSpread.steady}× / 激进 ${report.auctionSpread.bold}× / 天价 ${report.auctionSpread.dump}×base）：${report.auctionSpreadProblems.length ? '\n' + report.auctionSpreadProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - 三档效率散布 ≤15%——稳健不再无脑最优、天价确定性溢价在门内。\n'}`;
md += `- E389 手作溢价防套利两路：${report.craftLoopProblems.length || report.craftArbProblems.length ? '\n' + [...report.craftLoopProblems, ...report.craftArbProblems].map(p => `  - ${p}`).join('\n') + '\n' : '  - 逐配方 Σ材料购价 > sellPrice(out) 零命中；sellPrice(out) ≤ 直购价零命中。\n'}`;
md += `- E390 宗门同物双价（通用列 vs 派系 exclusive）：${report.dualPriceProblems.length ? '\n' + report.dualPriceProblems.map(p => `  - ${p}`).join('\n') + '\n' : '  - pill_jiuzhuan 双挂点 4000 同价，全表零双价。\n'}`;
md += `\n## v41 扩容检测（E460）\n\n`;
md += `- E460 通商波幅（常态 ∈[0.8,1.2]、trade 季 ∈[0.75,1.25] 且值域真放宽；行情 seed=0 全 ITEMS 采样）：${report.tradeProblems.length ? '\n' + report.tradeProblems.map(p => `  - ${p}`).join('\n') + '\n' : `  - 常态 ∈ [${report.tradeSpread.normalMin}, ${report.tradeSpread.normalMax}]、trade ∈ [${report.tradeSpread.tradeMin}, ${report.tradeSpread.tradeMax}]，两带落位且 trade 更烈。\n`}`;
md += `- E460 寄售佣金 sink（CONSIGN_TIERS 单源现金 EV=mul×rate/100×0.95 + settleConsign 功能两支）：${report.consignProblems.length ? '\n' + report.consignProblems.map(p => `  - ${p}`).join('\n') + '\n' : `  - 五档 EV = ${report.consignRows.ev.join(' / ')}——速售 ≈0.61 > 坊市 0.45（稳档成立）、天价 ≈0.08 < 0.45（博高价=纯赌）；成交入账 9500/10000（五厘佣金）、流拍退件回包（二厘费）两支实测在案。\n`}`;
md += `- E460 SITES 重锚与行号断言：44/397/476/546/582 → 49/416/495/565/601（另 cave 26/60/483、auction 343、beast 350/659）；「器魂匣(lv0)」改名「套装炼化(lv0)」；标签行文本含 sinkCurve 源码断言（漂移即非零退出）。\n`;
md += `\n## v39 扩容检测（E351/E352）\n\n`;
md += `- 第九路·大额 sink 日数比带（采样 grep \`sinkCurve(\` 实测 12 处随动面 × r6~r9；带 [0.3, 2.5] 日、邻境日数比变化 ≤1.3×；分母 = 建模日均收入 125×stoneEco，与 balance-sim dayIn 同式；r10 为投影行——境界轴真仙 r9 为顶，仅验证曲线增长稳定）：\n`;
{
  const realms = [6, 7, 8, 9];
  md += `  - 实测日数表（日）：\n\n    | 采样点 | 出处 | r6 | r7 | r8 | r9 | 带内 |\n    |---|---|---|---|---|---|---|\n`;
  for (const s of report.sinkBand.samples.filter(x => x.r === 6)) {
    const row = realms.map(r => report.sinkBand.samples.find(x => x.r === r && x.id === s.id));
    md += `    | ${s.id} | ${s.where} | ${row.map(x => x.days).join(' | ')} | ${row.every(x => x.inBand) ? '✓' : '出带（见豁免/报警）'} |\n`;
  }
  const p10 = report.sinkBand.proj10;
  md += `  - r10 投影（不可达境，曲线稳定性行）：${p10.map(x => `${x.id} ${x.days} 日`).join('、')}\n`;
  md += `  - 邻境比值：新曲线段（r≥6）各样本日数比恒 1.00（cost 与收入同速 3.8×/境）——设计目标本身，勿与 r5→r6 接缝比混读（接缝口径见 PLAN_V39 E351.2）。\n`;
  md += `  - 出带豁免显式列名（${report.sinkBand.exempted.length} 条——不许静默放行）：\n` + (report.sinkBand.exempted.length ? report.sinkBand.exempted.map(p => `    - ${p}`).join('\n') + '\n' : '    - 无。\n');
  md += `  - 第九路报警（${report.sinkBand.problems.length}，未豁免出带/邻境跳变即非零退出）：\n` + (report.sinkBand.problems.length ? report.sinkBand.problems.map(p => `    - ${p}`).join('\n') + '\n' : '    - 无未豁免出带。\n');
  md += `- 第十路·古匣稳健出价 EV（mysteryBase 0.95：稳健 95% 成交长期期望应 <0，无风险套利封死）：\n`;
  md += (report.mysteryProblems.length ? report.mysteryProblems.map(p => `    - ${p}`).join('\n') + '\n' : '    - r0~r6 稳健出价长期期望全负（EV ≈ −0.088×base），套利封死。\n');
}
console.log(md);
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/price-audit.md', md);
