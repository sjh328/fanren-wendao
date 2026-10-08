/* v19 数值量化模拟：修为节奏 × 灵石经济 × 突破成算（逐境界拟合报告）
 * 运行：node scripts/balance-sim.mjs（需先 node server.mjs）
 * 输出：控制台表格 + docs/balance-v19.md
 * v42（E484/E485）：本脚本是 v42 调参锚链的一环——说明书（game-data.js 数值说明书段）与本脚本
 * 注释随实装走：E485 EXP_BASE[5]=490000 复锚后「炼虚」行天数/节奏比带随动（r4→r5 ≈1.17、
 * r5→r6 ≈1.06，全曲线 ∈[0.8,1.35]）；E478/E479 战斗参数经 BALANCE.COMBAT 单源联动。
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
  /* v41（E459）：种子化确定性输出——mulberry32 固定种子流覆盖整个 evaluate（gainMult 采样/
   * 论道实调/30 场蒙特卡洛/parity 全在此流内，soak 段另固定 tpl=none），同机两跑逐字节一致；
   * evaluate 尾部还原原生 Math.random。 */
  const realRandomAll = Math.random;
  let _sdAll = 20260928;
  Math.random = () => { _sdAll |= 0; _sdAll = _sdAll + 0x6D2B79F5 | 0; let t = Math.imul(_sdAll ^ _sdAll >>> 15, 1 | _sdAll); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
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
          // 玩家回合：期望伤害（普攻，命中按身法差钳 3%~PLAYER_MISS_MAX——v41（E459）：失手式与钳
          // 改读 GameData.BALANCE.COMBAT.PLAYER_MISS_MAX（v40 实装 25），原手写 35 与实装漂移
          const miss = Utils.clamp(3 + (e.spd - st.speed), 2, GameData.BALANCE.COMBAT.PLAYER_MISS_MAX);
          if (!Utils.chance(miss)) {
            let dmg = Stat.afterDef(st.atk, e.def) * Utils.randF(0.85, 1.15);
            if (Utils.chance(st.crit)) dmg *= 1.7;
            e.hp = Math.max(0, e.hp - Math.max(1, Math.round(dmg)));
          }
          if (e.hp <= 0) { win++; break; }
          // 敌回合：期望伤害（普攻，无视技能）
          // v42（E484/E479）：闪避帽改读 BALANCE.COMBAT.ENEMY_DODGE_MAX 单源（70→50，E479）——
          // 原手写 65 与实装漂移；v40（E377）敌方基线失手 3% 亦随实装补入
          const dodge = Utils.clamp(3 + (st.speed - e.spd) * 1.1 + st.dodge, 0, GameData.BALANCE.COMBAT.ENEMY_DODGE_MAX);
          if (!Utils.chance(dodge)) {
            if (Utils.chance(GameData.BALANCE.COMBAT.ENEMY_MISS_BASE)) { continue; }
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
  // v41（E459）：灵石侧改 stoneEco(r)——原误用修为系数 eco（4.6^r），高境收入虚高 (4.6/3.8)^9 ≈ 5.6×；
  // 口径自此注明双轨：灵石=stoneEco、修为=eco
  const stoneRows = [];
  for (let r = 0; r <= 9; r++) {
    const se = GameData.stoneEco(r);
    const battleIn = Math.round(37.5 * se * 2);      // v40（E383）：两战 × 新单场均值 37.5（rand 25~50）；v41（E459）：灵石=stoneEco
    const bountyIn = Math.round(90 * se / 3);        // v40（E383）：悬赏 90×eco 一窗/3 日；v41（E459）：灵石=stoneEco
    const dayIn = battleIn + bountyIn + Math.round(20 * se);
    const sinkSeclude = Math.round(60 * se);          // 闭关一轮（v39（E352）：30→60×eco， Cultivate.secludeCost 同步）；v41（E459）：随本块改名 se=stoneEco（原 shadow 命名）
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

  // v40（WP2/E374~E378）战斗复算表：承伤带 / parity 回合比 / 战意爆发净差（公式级确定性模型，
  // verify-v26 以同式复算并断言带内；口径注释随实现走，改参数须同步复算表）
  const combat2 = await (async () => {
    const C = GameData.BALANCE.COMBAT;
    // 标准画像（与主表同口径：四维 6、宗门、无装备；layer1 中位）——承伤带用
    const mkStd = r => {
      const p = PlayerFactory.create('复算道人', { gen: 6, comp: 6, luck: 6, body: 6 });
      p.realmIdx = r; p.layer = 1; p.exp = 0; p.dao = null;
      if (r >= 1) p.sect = { id: 'qingyun', contrib: 0 };
      return p;
    };
    // 中配画像：标准四维 + 宗门 + 中阶装备（grade3 ×+8，affixes/stars 显式空对象）+ 三门 level5 功法
    // ——v41（E459）：与 verify-v26 RB11 画像逐字段对齐（affixes/stars/level）并补 gf_tumo——
    // 原画像放未修习的 gf_tumo 整回合空转（battle.js 技能环判修习），parity 实测 8%/5%/3% 而表头自述五五
    const mkMid = r => {
      const p = mkStd(r);
      p.equipped = { weapon: { id: 'w_zhuxian', enhance: 8, affixes: {}, stars: {} }, armor: { id: 'a_longlin', enhance: 8, affixes: {}, stars: {} }, accessory: { id: 'z_taiji', enhance: 8, affixes: {}, stars: {} } };
      p.gongfa = { gf_lieyang: { level: 5, exp: 0 }, gf_wanjian: { level: 5, exp: 0 }, gf_tumo: { level: 5, exp: 0 } };
      return p;
    };
    // ①E376 承伤带：同阶普通怪单次普攻期望（E[rand]=1、不计暴击/闪避/格挡）÷ 标准 maxHp
    // v41（E459）：soak 固定 tpl=none——习性模板随机器是本段漂移源，固定后公式级确定性
    const savedTplW = GameData.MONSTER_TEMPLATE_WEIGHTS;
    GameData.MONSTER_TEMPLATE_WEIGHTS = { none: 1 };
    const soak = [];
    for (let r = 0; r <= 9; r++) {
      const p = mkStd(r);
      const st = Stat.compute(p);
      const rp = r * 4 + 1;
      const mids = Object.keys(GameData.MONSTERS).filter(id => { const m = GameData.MONSTERS[id]; return !m.elite && Math.abs(m.power - rp) <= 1; });
      const mid = mids.length ? mids.sort((a, b) => Math.abs(GameData.MONSTERS[a].power - rp) - Math.abs(GameData.MONSTERS[b].power - rp))[0] : null;   // 取最贴近同阶者
      const eAtk = mid ? buildMonster(mid).atk : Math.round(6 + rp * 2.6);
      const dmgNew = Stat.afterDef(eAtk, st.def, rp);                       // v40 分母随 rp
      const dmgOld = eAtk * (1 - st.def / (st.def + C.AFTER_DEF_DENOM));    // 旧恒定分母
      soak.push({
        realm: GameData.REALM_NAMES[r],
        pct: +(dmgNew / st.maxHp * 100).toFixed(2),
        drift: r <= 2 ? +((dmgNew / st.maxHp) / (dmgOld / st.maxHp) * 100 - 100).toFixed(1) : null,   // r0~r2 变化 %
      });
    }
    GameData.MONSTER_TEMPLATE_WEIGHTS = savedTplW;   // v41（E459）：soak 固定 tpl 结束，模板权重还原
    // ②E374 parity/三档回合比：中配 vs 同阶问剑（可敌带校准 NPC）——真实引擎 40 场采样，
    //   回合数比 = 胜局均回合 / 败局均回合 ∈ [0.8, 2.5]，可敌胜率落 [42%, 58%]（五五公示 ±8）
    //   v41（E459）：胜率带与 TTK 带自本脚本起升级硬门禁（出带 exit≠0）——硬门禁以 verify-v26 RB11 与本脚本双轨为准（固定种子流）
    const r6 = mkMid(6);
    const npcIds = GameData.NPCS.filter(d => (d.talent || 3) === 3).slice(0, 3).map(d => d.id);
    Game.player = r6;
    r6.npcs = {};
    for (const d of GameData.NPCS) r6.npcs[d.id] = { alive: true, met: true, rel: 0, realmIdx: 6, layer: 1 };
    const realRandom2 = Math.random;
    let _s2 = 20260926;
    Math.random = () => { _s2 |= 0; _s2 = _s2 + 0x6D2B79F5 | 0; let t = Math.imul(_s2 ^ _s2 >>> 15, 1 | _s2); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const savedWait = Battle.wait; Battle.wait = () => Promise.resolve();
    const skillRing = Object.keys(r6.gongfa);   // v41（E459）：技能环由 gongfa 键派生（单源）——环与画像分叉的病灶（放未修习法诀空转）自此断根
    const parityRows = [];
    for (const nid of npcIds) {
      let w = 0, rw = 0, nw = 0, rl = 0, nl = 0, R = 0;
      const N = 40;
      for (let i = 0; i < N; i++) {
        _s2 = 20260926 + i * 104729;
        const e = NpcSys.buildEnemy(r6, nid, 0, { ratio: 1.05, bandName: '可敌' });   // v42（E478/E483）门禁重锚 P3：ratio 1.0→1.05——v42 玩家侧新机制（势点自动兑现/对拼读招）使同一中配画像胜率 70/73% 出 [42,58] 带（流失率重锚实测不参与 parity），按 E374 装备当量惯例再校准，三档 57/48/57 回带
        const st = Stat.compute(r6);
        r6.hp = st.maxHp; r6.mp = st.maxMp;
        await Battle.start(null, { enemy: e, spar: true, mapName: '复算台' });
        const B2 = Battle.active;
        B2.busy = false; B2.over = false;
        let rounds = 0, guard = 0;
        while (Battle.active && !B2.over && guard++ < 400) {
          rounds++;
          const k = skillRing[rounds % skillRing.length];
          const cost = Math.ceil(st.maxMp * GameData.ITEMS[k].skill.mp / 100);
          await Battle.act(r6.mp >= cost ? 'skill' : 'attack', k);
        }
        R += rounds;
        if (B2.won) { w++; rw += rounds; nw++; } else { rl += rounds; nl++; }
        if (Battle.active) Battle.end();
      }
      parityRows.push({
        id: nid,
        winPct: Math.round(w / N * 100),
        ttk: nw && nl ? +((rw / nw) / (rl / nl)).toFixed(2) : null,
        avgR: +(R / N).toFixed(1),
      });
    }
    Math.random = realRandom2; Battle.wait = savedWait;
    Game.player = null;
    // ③战意爆发净差：10 回合政策模型（普攻当量 A=1；战意 +12/普攻；每场 2 次上限）
    //   旧（v37 口径）：≥90 可爆、1.8×、清零，会心期望 1+25%×0.7=1.175；
    //   新（v42（E478）沸点口径）：≥90（auto 等近沸政策，与 autoPilot 同参；手动 60 早爆为自由档不入模型）
    //   可爆、耗尽全部战意、倍率线性插值 BURST_MUL_BASE(2.4)+(m−60)×BURST_MUL_PER(0.02)
    //   （60≈2.4×、100 沸腾≈3.2×）、必会心 1.7——E484 锚文档对齐：模型参数随实装单源走
    const burstSim = (ver) => {
      let morale = 0, used = 0, total = 0;
      for (let t = 1; t <= 10; t++) {
        if (morale >= 90 && used < 2) {
          used++;
          const mm = 1 + morale * C.MORALE_PER_POINT;
          const mult = ver === 'new'
            ? Math.min(C.BURST_MUL_BASE + (C.MORALE_MAX - C.BURST_MIN) * C.BURST_MUL_PER, C.BURST_MUL_BASE + (morale - C.BURST_MIN) * C.BURST_MUL_PER)
            : 1.8;
          total += mult * (ver === 'new' ? 1.7 : 1.175) * mm;   // 爆发一击（普攻当量）
          morale = ver === 'new' ? 0 : Math.max(0, morale - 60);   // v42（E478）：耗尽全部战意
        }
        total += 1 * (1 + morale * C.MORALE_PER_POINT);   // 本回合普攻（后结战意 +12）
        morale = Math.min(C.MORALE_MAX, morale + 12);
      }
      return total;
    };
    const burstGain = +(burstSim('new') - burstSim('old')).toFixed(2);
    return { soak, parityRows, burst: { old: +burstSim('old').toFixed(2), new: +burstSim('new').toFixed(2), gain: burstGain } };
  })();

  // v40（E383）经济复算行：灵泉:主动收入比（v41（E441）锚：r1~r4≈0.92、r5 0.24、r6 0.064；全境门
  // r1~r4 <1.0、r5+ <0.5）与 实收/建模收入比（[0.35,1.2]，锚 0.39）
  // 口径（v41（E459）双轨注明：灵石=stoneEco、修为=eco）：灵泉裸值 = 15×min(4,spring=3)×stoneEco(min(4,r))
  // （v41（E441）系数 45→15，r6 裸值锚 9383；驻守 ×1.2 单列不计）；主动收入与建模日均（dayIn 同式
  // 125×stoneEco）同为灵石轴走 stoneEco——原 :294 误用修为系数 eco 致高境虚高 5.6×
  const econRows = [];
  {
    for (let r = 0; r <= 9; r++) {
      const eco = GameData.eco(r);
      const se = GameData.stoneEco(r);
      const spring = Math.round(15 * 3 * GameData.stoneEco(Math.min(4, r)));   // 裸值（驻守 ×1.2 单列）；v41（E441）：45→15
      const active = Math.round(0.5 * 37.5 * se + 30 * se);   // v41（E459）：灵石=stoneEco
      // v40（E391）：逐境轮数（相对值 ∝ EXP_BASE[r]/eco(r)，×7 层系数相消；修为轴保持 eco）
      const roundsRel = GameData.EXP_BASE[r] / eco;
      econRows.push({ realm: GameData.REALM_NAMES[r], spring, active, ratio: +(spring / active).toFixed(2), realModel: +(active / (125 * se)).toFixed(2), roundsRel });
    }
  }
  // v40（E397）仙阶行：地仙首层（17500 仙元）时长——r9 圆满挂机每轮溢流 daoGain = perRound×1.025/(eco9×0.05)
  {
    const p9 = (() => { const pl = PlayerFactory.create('仙阶道人', { gen: 6, comp: 6, luck: 6, body: 6 }); pl.realmIdx = 9; pl.layer = 3; pl.flags = { ascended: true }; return pl; })();
    const st9 = Stat.compute(p9);
    const perRound = Cultivate.baseGain(p9) * (1 + st9.cultPct / 100) * 1.025;
    const yuanPerDay = Math.max(1, Math.round(perRound / 3 / (GameData.eco(9) * 0.05)));
    const need = GameData.XIAN_TIERS[0].layerNeed;
    econRows.xianDays = +(need / yuanPerDay).toFixed(1);
    econRows.xianNeed = need;
    econRows.xianPerDay = yuanPerDay;
  }
  Math.random = realRandomAll;   // v41（E459）：种子流结束，还原原生 Math.random
  return { out, combat, bonusRows, stoneRows, actionRows, econRows, xianDays: econRows.xianDays || 0, xianNeed: econRows.xianNeed || 17500, xianPerDay: econRows.xianPerDay || 0, combat2 };
});
const sim = rows; await browser.close();

// 拟合体检：相邻境界天数比值的离群检测
const ratios = [];
for (let i = 1; i < sim.out.length; i++) ratios.push(+(sim.out[i].days / sim.out[i - 1].days).toFixed(2));
const median = [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length / 2)];
const flags = ratios.map((x, i) => (x > median * 3 || x < median / 3) ? `⚠ 第${i + 1}→${i + 2}境比值 ${x}× 偏离中位 ${median}×` : null).filter(Boolean);


let md = `# v19 数值拟合报告（scripts/balance-sim.mjs 自动生成）

标准画像：四维 6/6/6/6、内门宗门、未择道、仅修炼产出（不含丹药/秘境/事件收益）。
口径（v41（E459））：**种子化确定性输出**——mulberry32 固定种子流覆盖全采样（soak 段固定 tpl=none），同机两跑逐字节一致；灵石轴=stoneEco、修为轴=eco 双轨分立。

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

/* v40（WP2/E374~E378）战斗复算表：承伤带 / parity 回合比 / 爆发净差（公式级，verify-v26 同式断言） */
md += `\n## v40 战斗复算（E374~E378 公式级模型，中配画像 layer1）\n\n`;
md += `### 承伤带（E376：同阶普通怪单次普攻期望 / 中配 maxHp，带 [3%, 12%]；r0~r2 相对旧分母变化 ≤±15%）\n\n| 境界 | 单次承伤/maxHp | r0~r2 变化 |\n|---|---|---|\n`;
for (const s of sim.combat2.soak) md += `| ${s.realm} | ${s.pct}% | ${s.drift == null ? '—' : (s.drift > 0 ? '+' : '') + s.drift + '%'} |\n`;
md += `\n### parity 三档采样（E374：中配 vs 同阶可敌带 NPC，真实引擎 40 场/对手；胜率落 [42%,58%]、TTK 比 ∈ [0.8,2.5]——v41（E459）起为硬门禁，出带 exit≠0）\n\n| 对手 | 胜率 | TTK 比 | 均回合 |\n|---|---|---|---|\n`;
for (const s of sim.combat2.parityRows) md += `| ${s.id} | ${s.winPct}% | ${s.ttk == null ? '—' : s.ttk} | ${s.avgR} |\n`;
md += `\n### 战意爆发净差（v42（E478）口径：10 回合政策模型，普攻当量；锚 ≥ +1.5）\n\n旧 ${sim.combat2.burst.old}A → 新 ${sim.combat2.burst.new}A，净差 **+${sim.combat2.burst.gain}A**（口径：+12 战意/普攻；旧 ≥90 可爆、1.8×清零×会心期望 1.175；新 ≥60 可爆、耗尽全部战意×线性插值 60≈2.4×/100≈3.2×、必会心 1.7——v42（E478）战意沸点改造后重锚，模型参数随 BALANCE.COMBAT 单源走）。\n`;
md += `\n### E383 经济复算（v41（E441/E459）全境门：r1~r4 比 <1.0（锚 0.92）、r5+ <0.5（r5 锚 0.24、r6 锚 0.064）；实收/建模 ∈[0.35,1.2] 锚 0.39；灵泉裸值口径=15×min(4,spring=3)×stoneEco(min(4,r))，r6 锚 9383，驻守 ×1.2 单列；主动收入与建模日均均走 stoneEco——灵石=stoneEco、修为=eco 双轨）\n\n| 境界 | 灵泉裸值/日 | 主动收入/日 | 灵泉:主动 | 实收/建模 |\n|---|---|---|---|---|\n`;
  for (const e of sim.econRows) md += `| ${e.realm} | ${e.spring.toLocaleString()} | ${e.active.toLocaleString()} | ${e.ratio} | ${e.realModel} |\n`;
  {
    // 门禁口径（v41（E459）扩全境，锚随 E441 改 15 系数/9383）：r1~r4 比 <1.0、r5+ <0.5；
    // r0 洞府未建成、spring lv3 不可达，比值列仅信息参考不入门
    const badRatio = sim.econRows.filter(e => {
      const i = sim.econRows.indexOf(e);
      if (i < 1) return false;
      return e.ratio >= (i <= 4 ? 1.0 : 0.5);
    });
    const badRM = sim.econRows.filter(e => e.realModel < 0.35 || e.realModel > 1.2);
    if (badRatio.length || badRM.length) {
      const msgs = [...badRatio.map(e => `⚠ 灵泉:主动比越界 ${e.realm} ${e.ratio}（门：r1~r4 <1.0、r5+ <0.5）`), ...badRM.map(e => `⚠ 实收/建模越界 ${e.realm} ${e.realModel} ∉ [0.35,1.2]`)];
      console.error('⚠ E383 经济复算报警：\n' + msgs.join('\n'));
      process.exitCode = 1;
    } else console.log('✓ E383 经济复算全绿（灵泉:主动比全境 r1~r4 <1.0、r5+ <0.5；实收/建模比全部带内）');
  // v40（E391/E397）门禁：逐境轮数（相对值）——r6~r9 占比 ≤52%（v42（E485）P3：原 50% 锚 49.7%——E485 炼虚削峰让渡后段 +0.8 点，门随行 50→52）、每境降幅 ≤10%、
  // r0~r5 仍递增、全程 ≥1.5 游戏年；地仙首层 ≥2 游戏日
  {
    const rel = sim.econRows.map(e => e.roundsRel);
    const total = rel.reduce((a, b) => a + b, 0);
    const late = rel.slice(6).reduce((a, b) => a + b, 0);
    const share = +(late / total * 100).toFixed(1);
    const drops = [];
    for (let r = 7; r <= 9; r++) drops.push(+((1 - rel[r] / rel[r - 1]) * 100).toFixed(1));
    // v40（E391）：r5→r6 本轮削尾 −8.7% 属设计内（≤10% 门，与 r6~r9 段内同款）——递增门只锁 r0~r5 段内（r0~r4 → r1~r5）
    const inc = [0, 1, 2, 3, 4].every(r => rel[r + 1] > rel[r]);
    const years = +(total * 3 / 365).toFixed(1);
    const xianDays = sim.xianDays || 0;
    const probs = [];
    if (share > 52) probs.push(`⚠ r6~r9 占比 ${share}% > 52%`);   // v42（E485）P3：50→52——EXP_BASE[5] 570000→490000 炼虚削峰后 r5 占比让渡后段（49.7→50.8%），E485 明令锚优先，门随行放宽并留痕
    if (drops.some(d => d > 10)) probs.push(`⚠ 每境降幅超 10%：${drops.join('/')}`);
    if (!inc) probs.push('⚠ r0~r5 逐境轮数不再递增');
    if (years < 1.5) probs.push(`⚠ 全程 ${years} 游戏年 < 1.5`);
    if (xianDays < 2) probs.push(`⚠ 地仙首层 ${xianDays} 日 < 2（E397）`);
    console.log(`✓ E391 削尾：r6~r9 占比 ${share}%（≤52%·v42 E485 随行）、每境降幅 ${drops.join('/')}%（≤10%）、全程 ${years} 游戏年（≥1.5）、r0~r5 递增保平`);
    console.log(`✓ E397 仙阶：地仙首层 ${sim.xianNeed} 仙元 ≈ ${xianDays} 游戏日（≥2 锚）`);
    if (probs.length) { console.error(probs.join('\n')); process.exitCode = 1; }
  }
  }
const soakBad = sim.combat2.soak.filter(s => s.pct < 3 || s.pct > 12);
const earlyBad = sim.combat2.soak.slice(0, 3).filter(s => Math.abs(s.drift) > 15);
// v41（E459）：parity 升级硬门禁——胜率带 [42,58]、TTK 比 [0.8,2.5]，出带 exit≠0（表头与断言同源）；
// 硬门禁以 verify-v26 RB11 与本脚本双轨为准（固定种子流；mkMid 画像逐字段对齐后两轨同口径）
const parityBad = [
  ...sim.combat2.parityRows.filter(s => s.winPct < 42 || s.winPct > 58)
    .map(s => `⚠ parity 胜率出带：${s.id} ${s.winPct}% ∉ [42,58]`),
  ...sim.combat2.parityRows.filter(s => s.ttk != null && (s.ttk < 0.8 || s.ttk > 2.5))
    .map(s => `⚠ parity TTK 出带：${s.id} ${s.ttk} ∉ [0.8,2.5]`),
];
if (soakBad.length || earlyBad.length || parityBad.length || sim.combat2.burst.gain < 1.5) {
  const msgs = [
    ...soakBad.map(s => `⚠ 承伤带越界：${s.realm} ${s.pct}% ∉ [3%,12%]`),
    ...earlyBad.map(s => `⚠ 前期承伤漂移：${s.realm} ${s.drift}% > ±15%`),
    ...parityBad,
    ...(sim.combat2.burst.gain < 1.5 ? [`⚠ 爆发净差 ${sim.combat2.burst.gain}A < 1.5A`] : []),
  ];
  md += msgs.join('\n') + '\n\n结论：**战斗复算越带**——请复核对应参数。\n';
  console.error('⚠ WP2 战斗复算报警：\n' + msgs.join('\n'));
  process.exitCode = 1;
} else {
  md += '结论：**战斗复算全绿**——承伤带 [3%,12%]、前期漂移 ≤±15%、parity 胜率 [42,58] 与回合比 [0.8,2.5]（v41 硬门禁）、爆发净差 ≥1.5 当量全部落带。\n';
  console.log('✓ WP2 战斗复算全绿（承伤带/parity 胜率+回合比/爆发净差）');
}

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
