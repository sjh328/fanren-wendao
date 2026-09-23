
/* ======================================================================
 * §13 探索与随机事件
 * ====================================================================== */
const buildMonster = (id, delta = 0, opts = {}) => {
  const d = GameData.MONSTERS[id];
  const rp = Utils.clamp(d.power + delta, 0, 60);
  const realmIdx = Utils.clamp(Math.floor(rp / 4), 0, 9);
  // v31 修瑕：elitePlus（秘境 forced 精英/魔域入侵/夺宝怪）并入对象构造——原修复写在 return 之后
  // 且把取整函数 m 误当怪物对象，整段不可达，手工精英整体退化为「隐形精英」（有词缀无基线）。
  // 数据精英（d.elite）吃全部倍率；elitePlus 只补精英旗标与 crit 基线（调用方自带数值倍率，不叠乘）
  const dataElite = !!d.elite;
  const e = dataElite || !!opts.elitePlus;
  // v20 习性模板：同一妖兽不同个体养成不同打法（无模板为主，五种习性均摊）
  const tplId = Utils.pickWeighted(GameData.MONSTER_TEMPLATE_WEIGHTS);
  const tpl = GameData.MONSTER_TEMPLATES.find(t => t.id === tplId) || null;
  const m = (v, k) => Math.round(v * ((tpl && tpl[k]) || 1));
  // v38（E318）：转世劫难「群邪环伺」——天下之敌 hp/atk ×1.10（全部怪物统一入口）
  const foeMul = (typeof Game !== 'undefined' && Game.player && Game.player.reinc && Array.isArray(Game.player.reinc.trials) && Game.player.reinc.trials.includes('foe')) ? 1.1 : 1;
  return {
    id,
    name: d.name,
    elite: e,
    power: rp,
    species: d.species || 'beast',
    tpl: tpl ? tpl.id : null,
    tplName: tpl ? tpl.name : null,
    skills: (d.skills || []).map(s => ({ ...s })),
    realmLabel: GameData.REALM_NAMES[realmIdx] + GameData.LAYER_NAMES[Utils.clamp(rp % 4, 0, 3)],
    hpMax: Math.round(m(Math.round((55 + Math.pow(rp, 1.6) * 5) * (d.hp || 1) * (dataElite ? 1.7 : 1)), 'hp') * foeMul),
    atk: Math.round(m(Math.round((6 + rp * 2.6) * (d.atk || 1) * (dataElite ? 1.35 : 1)), 'atk') * foeMul),
    def: m(Math.round((3 + rp * 1.6) * (d.def || 1)), 'def'),
    spd: m(Math.round((6 + rp * 0.9) * (d.spd || 1)), 'spd'),
    dodge: d.dodge || 0,
    crit: (e ? 10 : 4) + ((tpl && tpl.crit) || 0),
    expGain: Math.round(22 * GameData.eco(realmIdx) * (dataElite ? 2.2 : 1)),
    stoneGain: Math.round(Utils.rand(10, 20) * GameData.stoneEco(realmIdx) * (d.stoneMul || 1) * (dataElite ? 2.5 : 1)),
    dropTier: Math.min(4, Math.floor(realmIdx / 2) + 1),
    rareDrop: d.rareDrop || null,
    rareDrop2: d.rareDrop2 || null,   // v32（E7）：第二稀有掉落（仙缘套装补源）
    hp: 0,
  };
};

/* ======================================================================
 * §13.5 v13 战斗状态效果 StatusFx（中毒/灼烧/流血/破防/迟滞/虚弱/束缚/冰封 + 增益）
 * 敌我双向：敌方技能给玩家挂负面（B.myFx），玩家符箓/法诀给敌方挂减益（B.enemy.fx）。
 * ====================================================================== */
const StatusFx = {
  DEFS: {
    poison:  { name: '中毒', tag: '毒', cls: 'fx-poison', dot: true },
    burn:    { name: '灼烧', tag: '焰', cls: 'fx-burn', dot: true },
    bleed:   { name: '流血', tag: '血', cls: 'fx-bleed', dot: true },
    cursed:  { name: '咒雷', tag: '咒', cls: 'fx-burn', dot: true },   // v30：敌方「灭世雷罚」等咒术 DOT（原 kind 无处理器退化为普攻）
    defdown: { name: '破防', tag: '破', cls: 'fx-defdown' },
    slow:    { name: '迟滞', tag: '滞', cls: 'fx-slow' },
    weaken:  { name: '虚弱', tag: '弱', cls: 'fx-weaken' },
    stun:    { name: '束缚', tag: '缚', cls: 'fx-stun', skip: true },
    freeze:  { name: '冰封', tag: '冰', cls: 'fx-stun', skip: true },
    shield:  { name: '金光', tag: '盾', cls: 'fx-shield' },
    atkup:   { name: '狂暴', tag: '狂', cls: 'fx-atk' },
    defup:   { name: '铁骨', tag: '骨', cls: 'fx-def' },
    agiup:   { name: '轻身', tag: '风', cls: 'fx-agi' },
    critup:  { name: '明目', tag: '目', cls: 'fx-agi' },
    vuln:    { name: '破绽', tag: '隙', cls: 'fx-defdown' },   // v30：下次受击更易被会心（破阵符/连携体系）
    ward:    { name: '真罡', tag: '罡', cls: 'fx-shield' },   // v30：真罡护体，所受 DOT 减半（真罡符）
  },
  add(list, st) {
    const old = list.find(x => x.kind === st.kind);
    if (old) { old.rounds = Math.max(old.rounds, st.rounds); old.pct = Math.max(old.pct || 0, st.pct || 0); }
    else list.push({ ...st });
  },
  has(list, kind) { return list.some(x => x.kind === kind && x.rounds > 0); },
  pctOf(list, kind) { const x = list.find(y => y.kind === kind && y.rounds > 0); return x ? (x.pct || 0) : 0; },
  /** 回合衰减：DOT 状态结算后衰减；其余状态（控制/增减益）由各自时机处理，此处不动 */
  decayDots(list) {
    const dots = ['poison', 'burn', 'bleed', 'cursed'];
    for (const x of list) if (dots.includes(x.kind)) x.rounds--;
    return list.filter(x => x.rounds > 0);
  },
  /* v30 状态引擎：统一衰减时相——原衰减清单散落四路调用点各自维护，kind 易漏
   *（金光盾/敌方虚弱曾双双漏衰减）。所有回合末衰减统一走 tick(list, phase)。 */
  AUG_MINE: ['defdown', 'slow', 'weaken', 'atkup', 'defup', 'agiup', 'critup', 'shield', 'ward'],
  // v33（E68）修瑕：补 atkup/agiup/critup——「偷梁换柱」把玩家增益转嫁敌方后原永不衰减（不在任何
  // 衰减表内），被偷一次狂暴丹＝敌方整场永久 +攻/身法/暴击，长战越偷越强
  AUG_ENEMY: ['defdown', 'slow', 'weaken', 'vuln', 'atkup', 'agiup', 'critup'],   // v31 修瑕：破绽漏入衰减表——一张破阵符曾=敌方永久 +30% 被会心
  tick(list, phase) {
    const kinds = phase === 'enemyEnd' ? this.AUG_ENEMY : this.AUG_MINE;
    for (const x of list) if (kinds.includes(x.kind)) x.rounds--;
    return list.filter(x => x.rounds > 0);
  },
  /** 移除指定类别状态（控制状态在其拥有者回合被消耗） */
  removeKinds(list, kinds) { return list.filter(x => !kinds.includes(x.kind)); },
  /** 清除全部负面（清心丹）：负面（DOT/减益/控制）尽去，增益保留 */
  purge(list) {
    const neg = ['poison', 'burn', 'bleed', 'cursed', 'defdown', 'slow', 'weaken', 'stun', 'freeze', 'vuln'];
    return list.filter(x => !neg.includes(x.kind));
  },
  tagsHtml(list) {
    return (list || []).map(x => {
      const d = this.DEFS[x.kind];
      if (!d) return '';
      const pct = x.pct ? ` ${Math.round(x.pct)}%` : '';
      return `<span class="fx-tag ${d.cls}" title="${d.name}${pct} · 余 ${x.rounds} 回合">${d.tag}${x.rounds}</span>`;
    }).join('');
  },
};
