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
const rows = await page.evaluate(() => {   // v20：返回 { out, combat, bonusRows }
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

// v20 战斗曲线：标准玩家 vs 同境界普通怪（含防御减伤/闪避钳制/模板中性），估平均回合数与胜率趋势
  const combat = [];
  for (let r = 0; r <= 9; r++) {
    const p = PlayerFactory.create('模拟道人', { gen: 6, comp: 6, luck: 6, body: 6 });
    p.realmIdx = r; p.layer = 0; p.exp = 0; p.dao = null;
    if (r >= 1) { p.sect = { id: 'qingyun', contrib: 0, rank: 'inner' }; }
    const st = Stat.compute(p);
    const monsterIds = Object.keys(GameData.MONSTERS).filter(id => { const m = GameData.MONSTERS[id]; return !m.elite && Math.abs(m.power - (r * 4)) <= 1; });
    let turnsSum = 0, n = 0, win = 0;
    for (const mid of monsterIds.slice(0, 6)) {
      // 蒙特卡洛 30 场
      for (let k = 0; k < 30; k++) {
        const e = buildMonster(mid);
        e.hp = e.hpMax; e.fx = []; e.charging = false;
        let hp = st.maxHp, turns = 0, guard = 0;
        while (e.hp > 0 && hp > 0 && guard++ < 200) {
          turns++;
          // 玩家回合：期望伤害（普攻，命中按身法差钳 3~35% 失手）
          const miss = Utils.clamp(3 + (e.spd - st.speed), 2, 35);
          if (!Utils.chance(miss)) {
            let dmg = Stat.afterDef(st.atk, e.def) * Utils.randF(0.85, 1.15);
            if (Utils.chance(st.crit)) dmg *= 1.7;
            e.hp = Math.max(0, e.hp - Math.max(1, Math.round(dmg)));
          }
          if (e.hp <= 0) { win++; break; }
          // 敌回合：期望伤害（普攻，无视技能）
          const dodge = Utils.clamp(3 + (st.speed - e.spd) * 1.1 + st.dodge, 0, 65);
          if (!Utils.chance(dodge)) {
            let dmg = Stat.afterDef(e.atk, st.def) * Utils.randF(0.85, 1.15);
            if (Utils.chance(e.crit)) dmg *= 1.6;
            hp = Math.max(0, hp - Math.max(1, Math.round(dmg)));
          }
        }
        turnsSum += Math.min(turns, 200); n++;
      }
    }
    combat.push({ realm: GameData.REALM_NAMES[r], avgTurns: +(turnsSum / Math.max(1, n)).toFixed(1), winPct: Math.round(win / Math.max(1, n) * 100) });
  }
  // v20 加成汇总：各系统满额对攻/血的贡献（防滚雪球监控）
  const bonusRows = [];
  {
    const mk = () => { const p = PlayerFactory.create('加成道人', { gen: 6, comp: 6, luck: 6, body: 6 }); p.realmIdx = 6; p.sect = { id: 'qingyun', contrib: 9999, rank: 'elder' }; return p; };
    const p0 = mk(); const a0 = Stat.compute(p0);
    const p1 = mk(); p1.equipped = { weapon: { id: 'w_zhuxian', enhance: 10, affixes: { prefix: 'pojun', suffix: 'duopo' } }, armor: { id: 'a_longlin', enhance: 10, affixes: { prefix: 'yugu', suffix: 'jingji' } }, accessory: { id: 'z_taiji', enhance: 10, affixes: { prefix: 'fort', suffix: 'combo' } } }; p1.gongfa = { gf_jianxin: { level: 10, exp: 0 }, gf_wanjian: { level: 10, exp: 0 }, gf_hongmeng: { level: 10, exp: 0 }, gf_tumo: { level: 10, exp: 0 } };
    const a1 = Stat.compute(p1);
    bonusRows.push({ name: '装备+10&词缀 vs 裸装', atk0: a0.atk, atk1: a1.atk, hp0: a0.maxHp, hp1: a1.maxHp });
  }
  return { out, combat, bonusRows };
});
const sim = rows; await browser.close();

// 拟合体检：相邻境界天数比值的离群检测
const ratios = [];
for (let i = 1; i < sim.out.length; i++) ratios.push(+(sim.out[i].days / sim.out[i - 1].days).toFixed(2));
const median = [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length / 2)];
const flags = ratios.map((x, i) => (x > median * 3 || x < median / 3) ? `⚠ 第${i + 1}→${i + 2}境比值 ${x}× 偏离中位 ${median}×` : null).filter(Boolean);


let md = `# v19 数值拟合报告（scripts/balance-sim.mjs 自动生成）

标准画像：四维 6/6/6/6、内门宗门、未择道、仅修炼产出（不含丹药/秘境/事件收益）。

| 境界 | 修为/日 | 境内总需求 | 纯修炼天数 | 战胜收益(修为/灵石) | 突破成算 | 寿元 |
|---|---|---|---|---|---|---|
`;
sim.out.forEach((r, i) => {
  md += `| ${r.realm} | ${r.gainPerDay.toLocaleString()} | ${r.need.toLocaleString()} | ${r.days.toLocaleString()} | ${r.battleExp.toLocaleString()} / ${r.battleStones.toLocaleString()} | ${i === 0 ? r.breakChance + '%' : (i < 2 ? '静修+' + 15 : r.trib)} | ${r.lifespan}岁 |\n`;
});
md += `\n## 节奏体检\n\n相邻境界纯修炼天数比值：${ratios.join(' → ')}（中位 ${median}×）\n\n`;
md += flags.length ? flags.join('\n') + '\n\n结论：存在节奏离群段，建议复核该境界的产出/需求曲线。\n' : '结论：无离群段——各境界节奏平顺，未发现断崖或暴冲。\n';
md += `\n> 口径说明：实际推进中战斗/丹药/事件占修为大头（同境战胜 ≈ ${(sim.out[0].battleExp / sim.out[0].gainPerDay).toFixed(1)} 天纯修炼产出，随境界同标度放大），故上表「纯修炼天数」为节奏上限参考。\n`;

// v20 战斗曲线与加成汇总表
md += `\n## v20 战斗曲线（标准玩家 vs 同境普通怪，30 场蒙特卡洛均值）\n\n| 境界 | 平均回合 | 胜率 |\n|---|---|---|\n`;
for (const c of sim.combat) md += `| ${c.realm} | ${c.avgTurns} | ${c.winPct}% |\n`;
md += `\n## v20 加成汇总（满配 vs 裸装，防滚雪球监控）\n\n| 项 | 攻击 | 气血 |\n|---|---|---|\n`;
for (const b of sim.bonusRows) md += `| ${b.name} | ${b.atk0} → ${b.atk1}（×${(b.atk1 / Math.max(1, b.atk0)).toFixed(2)}） | ${b.hp0} → ${b.hp1}（×${(b.hp1 / Math.max(1, b.hp0)).toFixed(2)}） |\n`;

fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/balance-v19.md', md, 'utf8');
console.log(md);
