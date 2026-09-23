
/* ======================================================================
 * §9 功法系统（学习 / 参悟升级）
 * ====================================================================== */
const GongfaSys = {
  maxLevel(def) { return 5 + def.grade; },
  /** 升到下一级所需功法感悟 */
  needExp(def, level) { return Math.round(60 * Math.pow(1.9, level) * (def.grade + 1)); },
  learn(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    if (!def || def.type !== 'gongfa' || p.gongfa[itemId]) return;
    if (!DaoSys.canLearnGongfa(p, def)) return; // 体修难悟高阶法诀
    Bag.removeItem(itemId, 1);
    p.gongfa[itemId] = { level: 1, exp: 0 };
    p.counters.learns = (p.counters.learns || 0) + 1;   // v11 剧情计数
    Log.add(`你翻开典籍，依法修行，成功入门 <b class="grade-${def.grade}">${def.name}</b>！`, 'gain');
    Game.afterAction();
  },
  study(gfId) {
    const p = Game.player;
    const g = p.gongfa[gfId];
    const def = GameData.ITEMS[gfId];
    if (!g || !def) return;
    if (g.level >= this.maxLevel(def)) { UI.toast('此功法已修至大成'); return; }
    let gain = 18 + Stat.compOf(p) * 4 + Utils.rand(0, 12);   // v32 修瑕（E38）：改用有效悟性（转世传承/讲道加成），与全游戏悟性口径统一
    if (p.realmIdx >= 7) gain *= 2;   // v10 境界特性 · 万法归宗（大乘）：参悟所得翻倍
    if (p.cave && p.cave.builds && p.cave.builds.lib) gain *= 1 + p.cave.builds.lib * 0.2;   // v19 藏经室
    // v38（E338）：藏经室「顿悟」——参悟 2%/阶几率所得 ×2（藏经出顿悟，从均值改尖峰）；
    // v38（E314）：洞天三重「太虚」再 +10%（与藏经室同一点判定）
    const epiphany = Utils.chance(((p.cave && p.cave.builds && p.cave.builds.lib) || 0) * 2 + ((p.cave && p.cave.dongtian >= 3) ? 10 : 0));
    if (epiphany) gain *= 2;
    g.exp += gain;
    if (p.dao) DaoSys.gain(p, Math.round((def.daoLimit === p.dao ? 20 : 8) * ((p.flags && p.flags.treeSage) ? 1.25 : 1)));   // v16 道境经验：参悟；v38（E341）：「生而知之」遗风 +25%
    Time.add(5);
    if (p.dead) return;
    let up = false;
    const costMul = def.custom ? 1.3 : 1;   // v38（E301）：自创功法参悟成本 ×1.3
    while (g.level < this.maxLevel(def) && g.exp >= this.needExp(def, g.level) * costMul) {
      g.exp -= this.needExp(def, g.level) * costMul;
      g.level++;
      up = true;
    }
    if (up) {
      Log.add(`你反复参悟，<b class="grade-${def.grade}">${def.name}</b> 修至 <b>第${g.level}层</b>！${epiphany ? '（太虚顿悟，所得翻倍）' : ''}`, 'gain');
    } else {
      Log.add(`你潜心参悟 ${def.name}，略有所得。（功法感悟 +${gain}${epiphany ? '· 太虚顿悟' : ''}）`, 'info');
    }
    Game.afterAction();
  },

  /* ========== v38（E301）：自创功法「悟法」==========
   * 道境 ≥4 重且大乘境可开炉——择一「式」（攻/御/辅），从已大成功法的奥义拆三个「意」，
   * 拟名而成一世至多三部的本命之学。数值锚 grade4 带：差异化靠组合，不靠数值。 */
  CUSTOM_MAX: 3,
  /** 已解锁的意韵模块：任一大成功法的奥义 fx 含同键即解锁（GF_MASTERY 单源） */
  availModules(p) {
    const keys = new Set();
    for (const [id, g] of Object.entries(p.gongfa)) {
      const mst = GameData.GF_MASTERY[id];
      if (!mst || g.level < this.maxLevel(GameData.ITEMS[id] || {})) continue;
      for (const k of Object.keys(mst.fx)) keys.add(k);
    }
    return (GameData.GONGFA_MODULES || []).filter(m => keys.has(m.fxKey));
  },
  freeSlot(p) {
    for (let i = 1; i <= this.CUSTOM_MAX; i++) if (!p.gongfa[`custom_${i}`]) return i;
    return null;
  },
  /** 由配置合成自创功法定义并注册进 ITEMS（读档/创功两处调用，幂等） */
  buildCustom(p, slot) {
    const cfg = (p.customGongfa || {})[`custom_${slot}`];
    if (!cfg) return null;
    const total = {};
    for (const mid of cfg.mods) {
      const m = (GameData.GONGFA_MODULES || []).find(x => x.id === mid);
      if (!m) continue;
      total[m.fxKey] = (total[m.fxKey] || 0) + m.val;
    }
    const bonus = {};
    for (const [k, v] of Object.entries(total)) bonus[k] = [v, Math.round(v / 3 * 10) / 10];   // [基础, 每层]——grade4 带内
    const sk = cfg.gtype === 'attack'
      ? { tag: '创', name: '悟法·杀生', kind: 'damage', power: 3.0, mp: 12, desc: '凝平生所学于一击的自创杀招' }
      : cfg.gtype === 'defense'
      ? { tag: '创', name: '悟法·守御', kind: 'buffDef', power: 40, rounds: 3, mp: 10, desc: '罡气随心而动的自创守御' }
      : { tag: '创', name: '悟法·调息', kind: 'heal', power: 35, mp: 10, desc: '自创调息之术，气血回复 35%' };
    const def = {
      id: `custom_${slot}`, name: cfg.name, type: 'gongfa', grade: 4, price: 0, custom: true,
      desc: `自创功法「${cfg.name}」——${cfg.mods.map(mid => ((GameData.GONGFA_MODULES || []).find(x => x.id === mid) || {}).name || mid).join('、')}。`,
      bonus, skill: sk,
    };
    GameData.ITEMS[def.id] = def;
    return def;
  },
  /** 读档/进入游戏时把自创功法重新注册进 ITEMS（static ITEMS 不含运行期产物） */
  syncCustom(p) {
    if (!p || !p.customGongfa) return;
    for (const id of Object.keys(p.customGongfa)) this.buildCustom(p, Number(String(id).replace('custom_', '')) || 0);
  },
  /** 开炉创功：三步弹窗（式 → 三意 → 拟名），成本 = 感悟 80 + 修为凝练 + 上古碎片 ×1 + 大额灵石 */
  async createCustom() {
    const p = Game.player;
    if (!p.dao || DaoSys.tierLevel(p) < 4 || p.realmIdx < 7) { UI.toast('悟法之境：须道境四重、且修至大乘方有机缘'); return; }
    const slot = this.freeSlot(p);
    if (!slot) { UI.toast(`悟法名额已满（一世至多 ${this.CUSTOM_MAX} 部）`); return; }
    const modsPool = this.availModules(p);
    if (modsPool.length < 3) { UI.toast('意韵不足——须先将有奥义的大成功法修至大成（至少三种不同意韵）'); return; }
    // 第一步：择式
    const gtype = await UI.popup({
      title: `悟法 · 择式（第 ${slot}/${this.CUSTOM_MAX} 部）`,
      html: '道感既足，可以己身证道——先择此功的<b>根基之式</b>：<br><span class="tip-line">· 攻式：威力 3.0× 的自创杀招（12% 灵力）<br>· 御式：罡气随心，减伤 40% 三回合（10% 灵力）<br>· 辅式：气血回复 35% 的自创调息（10% 灵力）</span>',
      options: [
        { text: '攻式——一击破万法', value: 'attack', primary: true },
        { text: '御式——不动如山岳', value: 'defense' },
        { text: '辅式——生生不自息', value: 'support' },
      ],
    });
    if (!gtype) return;
    // 第二步：拆三意（依次三选，已选不再现）
    const mods = [];
    for (let i = 1; i <= 3; i++) {
      const rest = modsPool.filter(m => !mods.includes(m.id));
      const pick = await UI.popup({
        title: `悟法 · 拆意（第 ${i}/3 意）`,
        html: `从你已大成的奥义中拆出一缕「意」融入此功${mods.length ? `（已纳：${mods.map(mid => modsPool.find(x => x.id === mid).name).join('、')}）` : ''}：`,
        options: rest.map(m => ({ text: `${m.name}——${m.hint}`, value: m.id })),
      });
      if (!pick) return;
      mods.push(pick);
    }
    // 第三步：拟名（四个候选，取其一）
    const nm = mid => ((GameData.GONGFA_MODULES || []).find(x => x.id === mid) || {}).name || '';
    const cands = [
      `${mods.map(nm).map(s => s.slice(0, 2)).join('')}诀`,
      `${p.name}·${nm(mods[0]).slice(0, 2)}${nm(mods[1]).slice(0, 2)}经`,
      `${nm(mods[0]).slice(0, 2)}${nm(mods[2]).slice(0, 2)}真解`,
      `太上${nm(mods[1]).slice(0, 2)}篇`,
    ];
    const name = await UI.popup({
      title: '悟法 · 拟名',
      html: '万法有名，名立则法成——为此功取一个道号吧：',
      options: cands.map(c => ({ text: c, value: c, primary: c === cands[0] })),
    });
    if (!name) return;
    // 成本：感悟 80 + 修为凝练 layerNeed×0.15 + 上古碎片 ×1 + 灵石 2000×sinkCurve
    const expCost = Math.round(GameData.layerNeed(p.realmIdx, 3) * 0.15);
    const stoneCost = Math.round(2000 * GameData.sinkCurve(p.realmIdx));
    if ((p.insight || 0) < 80) { UI.toast(`感悟不足（需 80，现 ${p.insight || 0}）`); return; }
    if (p.exp < expCost) { UI.toast('当前境界修为不足以凝练此功'); return; }
    if (Bag.count('m_gupian') < 1) { UI.toast('需【上古法宝碎片】×1 为引'); return; }
    if (!Bag.spendStones(stoneCost)) { UI.toast(`灵石不足（需 ${Utils.fmtNum(stoneCost)}）`); return; }
    Bag.removeItem('m_gupian', 1);
    Cultivate.spendInsight(p, 80);
    p.exp -= expCost;
    Time.add(7);   // 闭关七日凝法
    if (p.dead) return;
    p.customGongfa = p.customGongfa || {};
    p.customGongfa[`custom_${slot}`] = { name, gtype, mods };
    this.buildCustom(p, slot);
    p.gongfa[`custom_${slot}`] = { level: 1, exp: 0 };
    Log.add(`【悟法功成】你闭关七日，融${mods.map(nm).join('、')}三意于一炉——自创功法 <b class="grade-4">「${name}」</b> 由此问世！（感悟 -80、修为凝练 -${Utils.fmtNum(expCost)}、上古碎片 -1、灵石 -${Utils.fmtNum(stoneCost)}）`, 'realm');
    if (typeof Game !== 'undefined' && Game.milestone) Game.milestone('msWufa', '自 创 功 法 · 问 世');   // v38（E328）里程碑
    UI.announce('✦ 自 创 功 法 · 问 世 ✦', 'gold');
    Story.chron(`自创功法「${name}」问世`);
    Game.afterAction();
  },
};
