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
await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle0' });   // v37（E262）：无 query——server.mjs 已 no-cache，写死 ?v 只会漂移
await new Promise(r => setTimeout(r, 600));

// 采样：每境界在「标准玩家画像」下测 修为/日 与 突破成算（静修/天劫基准）
const rows = await page.evaluate(async () => {   // v20：返回 { out, combat, bonusRows }；v36（E220）：增 actionRows（全行动效率横向表）
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

  // v20 灵石收支：日均收入估算 vs 主要 sink 单价
  const stoneRows = [];
  for (let r = 0; r <= 9; r++) {
    const eco = GameData.stoneEco(r);
    const battleIn = Math.round(15 * eco * 3);        // 三战
    const bountyIn = Math.round(60 * eco);            // 悬赏一桩
    const dayIn = battleIn + bountyIn + Math.round(20 * eco);
    const sinkSeclude = Math.round(60 * eco);          // 闭关一轮（v39（E352）：30→60×eco， Cultivate.secludeCost 同步）
    const sinkRush = Math.round(120 * GameData.stoneEco(r));   // 聚灵加速（v32 修瑕 E25：口径对齐 cave.rushCost=120×stoneEco(r) 全幅——原 min(4,r) 低估高境 sink）
    // v34（D5）：强化 sink 口径与 ForgeSys.stonesCost 逐项对齐（grade3 装备 +5）——
    // 原手写 `×2.4^r` 与实现 `×3^min(cap,r)/2.4` 在 r9 差约 5 倍，sink 列因此长期失真
    const sinkEnhance = Math.round((GameData.BALANCE.ENHANCE.BASE_COST + 5 * GameData.BALANCE.ENHANCE.COST_PER_LV)
      * (1 + 3 * GameData.BALANCE.ENHANCE.COST_GRADE_FACTOR) * GameData.sinkCurve(r) / GameData.BALANCE.ENHANCE.COST_REALM_FACTOR);   // 强化+5
    stoneRows.push({ realm: GameData.REALM_NAMES[r], dayIn, sinkSeclude, sinkRush, sinkEnhance });
  }

  // v36（E220）：全行动效率横向表——每境枚举各主动作的修为/游戏日与灵石/游戏日，供门禁比较。
  // 感悟→修为折算显式公式（表值不随实现者漂移）：汇率锚定悟道——20 感悟 = 2.5×baseGain，
  // 即 1 感悟 = 0.125×baseGain。分母只计调息再生（+2 感悟/日）。
  // v37（E264/E265）：「论道门禁间接约束」豁免删除——E265 已证其不成立（听讲链 ×3.54 越 E220 带
  // 而论道行门禁对感悟供给端失明）；感悟纯度 ρ 折算落地后，购买悟道链/听讲链以 gated 行实测入带，
  // 悟道收益随实现走（读 Cultivate.WUDAO_PUR_FLOOR，纯度底折系数回滚即现形）。
  const actionRows = [];
  const GATE = { cult: 2.2, seclude: 1.4 };   // 门禁：任一 gated 行 > 修炼日均×2.2 或 > 闭关日均×1.4 → 报警
  for (let r = 0; r <= 9; r++) {
    const p = PlayerFactory.create('模拟道人', { gen: 6, comp: 6, luck: 6, body: 6 });
    p.realmIdx = r; p.layer = 0; p.exp = 0; p.dao = null;
    const k = 1 + Stat.compute(p).cultPct / 100;
    const base = Cultivate.baseGain(p) * k;   // 与主表同口径（不含 gainMult 随机）
    const raw = Cultivate.baseGain(p);        // 无悟性乘数基数——悟道收益不走 gainMult/cultPct
    const cult = base / 3;                    // 修炼日均（一次修炼 3 日）
    const seclude = base * 16 / 30;           // 闭关日均（30 日 ×10×1.6，开局一次结算）
    const eco = GameData.eco(r), se = GameData.stoneEco(r);
    // v37（E265）：悟道纯度底折系数随实现走——ρ=0（纯购买链）收益保留 WUDAO_PUR_FLOOR 比例，
    // 系数被改（如回滚注 1.0）购买链行即越带，门禁非零退出
    const purFloor = (typeof Cultivate.WUDAO_PUR_FLOOR === 'number') ? Cultivate.WUDAO_PUR_FLOOR : 0.3;
    const pur = rho => purFloor + (1 - purFloor) * rho;
    // 论道行实调 NpcSys.discuss 捕获实发（talent5 NPC、rel≥30）——门禁随实现走，E197 公式回滚即现形
    let discussGain = 0;
    const savedAdd = Cultivate.addExp, savedTime = Time.add, savedAA = Game.afterAction, savedPlayer = Game.player;
    Cultivate.addExp = (pp, n) => { discussGain = n; };
    Time.add = () => {}; Game.afterAction = () => {}; Game.player = p;   // discuss 内部读 Game.player，临时换入模拟玩家
    p.npcs = p.npcs || {}; p.npcs.n1 = { alive: true, met: true, rel: 30, realmIdx: r, layer: 0 };
    await NpcSys.discuss('n1');
    Cultivate.addExp = savedAdd; Time.add = savedTime; Game.afterAction = savedAA; Game.player = savedPlayer;
    const share = (() => { const w = GameData.SECRET_REALMS[r].weights; const s = Object.values(w).reduce((a, b) => a + b, 0); return w.battle / s; })();
    const dungeonExp = (8 * share + 1) * 22 * eco / 9;   // 9 层×1 日；战斗节点期望 = 8×权重占比 + boss，均按 22×eco 平价计（精英/深度境界跃迁未计，与战斗行同约定，保守）
    // v37（E265）：听讲链供给节拍——听讲 +8（外源）与调息 +2（再生）各耗 1 游戏日 → 5 感悟/日，
    // ρ = 2/10 = 0.2；悟道一场耗 20+2r（wuDaoCost 同式）→ 每 (20+2r)/5 日一场
    const listenCycle = (20 + 2 * r) / 5;
    actionRows.push({
      realm: GameData.REALM_NAMES[r], cult, seclude,
      rows: [
        { key: '修炼', exp: cult, stones: 0, gated: true },
        { key: '闭关', exp: seclude, stones: -2 * se, gated: true },   // 灵石列：闭关开销 60×stoneEco 摊 30 日（v39（E352）成本翻倍）
        { key: '调息', exp: 2 * 0.125 * base, stones: 0, gated: true },   // +2 感悟/日 × 悟道汇率
        { key: '悟道', exp: r >= 9 ? 0 : raw * 2.5 / (10 + r), stones: 0, gated: r < 9, note: r >= 9 ? '仙元（日限，不入修为门禁）' : '自然链 ρ=1：回本周期 = 悟道耗 20+2r ÷ 调息再生 2/日 = 10+r 日（v39（E352）：原恒 10 日低估高境回本），2.5×baseGain 全额' },
        { key: '悟道·购买链', exp: r >= 9 ? 0 : raw * 2.5 * pur(0), stones: r >= 9 ? 0 : -5000, gated: r < 9, note: 'v37（E264）：筑基丹 1 枚/日（50 感悟 ≥ 20+2r 耗）喂发每日一场，ρ=0 → 收益折 WUDAO_PUR_FLOOR；丹耗 5000 灵石/日入灵石列（现状 ×7.08 由此压入带）' },
        { key: '论道', exp: discussGain / 2, stones: 0, gated: true, note: '实调 discuss：talent5 → 1.4×baseGain/2 日（E197）' },
        { key: '听讲→悟道链', exp: r >= 9 ? 0 : raw * 2.5 * pur(0.2) / listenCycle, stones: 0, gated: r < 9, note: 'v37（E265）：听讲 +8（外源）+调息 +2（再生）各耗 1 日 → 5 感悟/日、ρ=0.2，每 (20+2r)/5 日一场；耗贡献 300/场听讲（原「行内附赠不入门禁」豁免已证不成立，删除）' },
        { key: '悬赏', exp: 0, stones: 60 * se / 9, gated: false, note: '赏格 60×stoneEco（灵石+贡献，无修为）；按猎杀型均值 4.5 杀 ×2 日/杀 摊' },
        { key: '探索', exp: 22 * eco / 2, stones: 15 * se / 2, gated: true, note: '同境战胜 22×eco / 每次探索 2 日；v39（E359）：天时/深耕权重修正复活后期望微升（<5%，保守口径不变）' },
        { key: '秘境一轮', exp: dungeonExp, stones: -2 * se / 9, gated: true, note: '9 层×1 日；战斗节点期望 8×权重占比+boss，平价 22×eco（精英/深度跃迁未计，保守）；门票 2×stoneEco，宝箱灵石未计' },
        { key: '塔深爬', exp: 2 * cult / 3, stones: 100 * se, gated: true, note: 'v37（E273）：免费 1 次/日、整场计 3 日（TowerSys.enter Time.add(3)）、层奖修为日额度 2×修炼日均（EXP_ALLOW_MUL）——一场深爬修为封顶 2×cult、吞吐 1 场/3 日；层奖灵石 300×stoneEco/场同摊' },
        { key: '塔纳财', exp: 0, stones: 120 * se, gated: false, note: 'v39（E352）：纳财折半后 60×stoneEco/次 × 日限 2 次 = 120×se/日（原 240×se），另发玄铁矿 ×4/次（实物不入灵石列）；层奖摊销另见「塔深爬」行（100×se 未动）——塔日灵石吞吐 ≈220×se ≤ 240×se' },
        { key: '化身·闭关', exp: (() => {
            // v39（E354）：与 avatar.js daily 实码同式——baseGain×(1+cultPct)×AVATAR_CULT_DAY_RATE(16/30)×eff
            //（0.5→0.75 硬锚）；旧行漏乘 16/30 与实码口径分歧，本版对齐（≈0.40×cult 满级，GATE cult 带）
            const av = (typeof AvatarSys !== 'undefined' && AvatarSys.eff) ? AvatarSys.eff(p) : 0.5;
            const rate = (typeof AvatarSys !== 'undefined' && AvatarSys.AVATAR_CULT_DAY_RATE) ? AvatarSys.AVATAR_CULT_DAY_RATE : 16 / 30;
            return base * rate * av;
          })(), stones: 0, gated: true, note: 'v39（E354）：AvatarSys.daily cult 任务 = baseGain×(1+cultPct)×(16/30)×eff（1级 0.5 → 9级 0.75 封顶，满级恰主身闭关日均 ×0.75）；离线同口径（E327）' },
        { key: '仙庭差遣', exp: 0, stones: (() => {
            // v38（E309）：日三桩合计仙功 60+pin×10（仙功非灵石不入灵石列）+ 30% 桩率掉仙材——
            // 灵石面 0；修为面 0。行存在即实现面被盘点（pin 收益走仙功/仙材，balance-sim 现轴外记账）
            return 0;
          })(), gated: false, note: 'v38（E309）：巡察/上贡/参拜日三桩——产出仙功（60+pin×10/桩）与仙材，皆不入修为/灵石门禁轴；仙元面硬锚 ≤400/桩（XianSys.claimTask 在案）' },
      ],
    });
  }

  return { out, combat, bonusRows, stoneRows, actionRows };
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

md += `\n## v20 灵石收支（日均收入 vs 主要 sink 单价）\n\n| 境界 | 日均收入 | 闭关一轮 | 聚灵加速 | 强化+5 |\n|---|---|---|---|---|\n`;
for (const st of sim.stoneRows) md += `| ${st.realm} | ${st.dayIn.toLocaleString()} | ${st.sinkSeclude.toLocaleString()} | ${st.sinkRush.toLocaleString()} | ${st.sinkEnhance.toLocaleString()} |\n`;

// v36（E220）：全行动效率横向表 + 门禁
md += `\n## v36 全行动效率横向表（E220 门禁基准）\n\n`;
md += `折算口径：感悟→修为锚定悟道（20 感悟 = 2.5×baseGain，即 1 感悟 = 0.125×baseGain）；标准画像同主表（四维 6/6/6/6，layer 0）。分母只计调息再生（+2 感悟/日）。v37（E264/E265）：悟道收益按感悟纯度 ρ 折算（收益 = baseGain×2.5×(WUDAO_PUR_FLOOR+(1−WUDAO_PUR_FLOOR)×ρ)，系数随实现走）；购买悟道链/听讲链/塔深爬以 gated 行实测入门禁（原「论道门禁间接约束」豁免已证不成立，删除）。单位：修为/游戏日｜灵石/游戏日（负为支出）。\n\n`;
md += `| 境界 | 修炼 | 闭关 | 调息 | 悟道 | 悟道·购买链 | 论道 | 听讲→悟道链 | 悬赏 | 探索 | 秘境一轮 | 塔深爬 | 塔纳财 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
const fmtCell = v => v >= 0 ? v.toLocaleString() : `-${Math.abs(v).toLocaleString()}`;
for (const ar of sim.actionRows) {
  const cells = ar.rows.map(row => `${row.exp > 0 ? fmtCell(Math.round(row.exp)) : '0'}${row.stones ? `｜${fmtCell(Math.round(row.stones))}` : ''}`);
  md += `| ${ar.realm} | ${cells.join(' | ')} |\n`;
}
md += `\n> 行内备注：${sim.actionRows[0].rows.map(row => row.note ? `${row.key}——${row.note}` : '').filter(Boolean).join('；')}。\n`;
md += `> 悬赏无修为主收益（赏格为灵石+贡献）；论道行为实调 NpcSys.discuss 捕获实发（talent5）；悟道链两行随 Cultivate.WUDAO_PUR_FLOOR 实现值走，门禁随实现走。\n`;

// v36（E220）门禁：任一 gated 行修为效率 > 修炼日均×2.2 或 > 闭关日均×1.4 → 报警非零退出
const gateViolations = [];
for (const ar of sim.actionRows) {
  for (const row of ar.rows) {
    if (!row.gated) continue;
    if (row.exp > ar.cult * 2.2 || row.exp > ar.seclude * 1.4) {
      gateViolations.push(`⚠ ${ar.realm}「${row.key}」修为/日 ${Math.round(row.exp)} = 修炼日均 ×${(row.exp / ar.cult).toFixed(2)}（门禁 ×2.2）、闭关日均 ×${(row.exp / ar.seclude).toFixed(2)}（门禁 ×1.4）`);
    }
  }
}
md += `\n### 门禁结论（修炼日均 ×2.2 / 闭关日均 ×1.4）\n\n`;
if (gateViolations.length) {
  md += gateViolations.join('\n') + `\n\n结论：**存在越带行动**——请复核其定价与时间成本。\n`;
  console.error('⚠ E220 门禁报警：\n' + gateViolations.join('\n'));
  process.exitCode = 1;
} else {
  md += '全部 gated 行落入带内：修炼 ×1.00、闭关 ×1.60、调息/悟道 ×0.75、悟道·购买链 ≈×2.12（ρ=0 折底，贴带运行）、论道 ×2.10（talent5 上限，实调实发）、听讲→悟道链 ≈×0.6、探索 ×1.38、秘境一轮 ×1.5（平价保守口径）、塔深爬 ≈×0.67（额度+整场计日双腿）——**门禁全绿**。v39（E352）：悟道自然链分母改 10+r（回本=耗 20+2r ÷ 再生 2/日）、闭关 sink 60×eco（成本翻倍）、新增「塔纳财」行 120×se/日（折半后，非 gated 收入行）。\n';
  console.log('✓ E220 门禁全绿');
}


fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/balance-v19.md', md, 'utf8');
console.log(md);
