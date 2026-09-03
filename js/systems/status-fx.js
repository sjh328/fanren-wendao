
/* ======================================================================
 * §13 探索与随机事件
 * ====================================================================== */
const buildMonster = (id, delta = 0) => {
  const d = GameData.MONSTERS[id];
  const rp = Utils.clamp(d.power + delta, 0, 60);
  const realmIdx = Utils.clamp(Math.floor(rp / 4), 0, 9);
  const e = !!d.elite;
  // v20 习性模板：同一妖兽不同个体养成不同打法（无模板为主，五种习性均摊）
  const tplId = Utils.pickWeighted(GameData.MONSTER_TEMPLATE_WEIGHTS);
  const tpl = GameData.MONSTER_TEMPLATES.find(t => t.id === tplId) || null;
  const m = (v, k) => Math.round(v * ((tpl && tpl[k]) || 1));
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
    hpMax: m(Math.round((55 + Math.pow(rp, 1.6) * 5) * (d.hp || 1) * (e ? 1.7 : 1)), 'hp'),
    atk: m(Math.round((6 + rp * 2.6) * (d.atk || 1) * (e ? 1.35 : 1)), 'atk'),
    def: m(Math.round((3 + rp * 1.6) * (d.def || 1)), 'def'),
    spd: m(Math.round((6 + rp * 0.9) * (d.spd || 1)), 'spd'),
    dodge: d.dodge || 0,
    crit: (e ? 10 : 4) + ((tpl && tpl.crit) || 0),
    expGain: Math.round(22 * GameData.eco(realmIdx) * (e ? 2.2 : 1)),
    stoneGain: Math.round(Utils.rand(10, 20) * GameData.stoneEco(realmIdx) * (d.stoneMul || 1) * (e ? 2.5 : 1)),
    dropTier: Math.min(4, Math.floor(realmIdx / 2) + 1),
    rareDrop: d.rareDrop || null,
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
    const dots = ['poison', 'burn', 'bleed'];
    for (const x of list) if (dots.includes(x.kind)) x.rounds--;
    return list.filter(x => x.rounds > 0);
  },
  /** 衰减指定类别状态（回合末的增减益） */
  decayKinds(list, kinds) {
    for (const x of list) if (kinds.includes(x.kind)) x.rounds--;
    return list.filter(x => x.rounds > 0);
  },
  /** 移除指定类别状态（控制状态在其拥有者回合被消耗） */
  removeKinds(list, kinds) { return list.filter(x => !kinds.includes(x.kind)); },
  /** 清除全部负面（清心丹）：负面（DOT/减益/控制）尽去，增益保留 */
  purge(list) {
    const neg = ['poison', 'burn', 'bleed', 'defdown', 'slow', 'weaken', 'stun', 'freeze'];
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
