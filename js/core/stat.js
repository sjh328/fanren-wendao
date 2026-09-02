/* ======================================================================
 * §6 属性计算 Stat
 * 每次调用 compute 实时从玩家模型 + 装备 + 功法 + 套装 + 境界 + 道境
 * 输出完整战斗属性（atk / def / speed / crit / dodge / block / maxHp / maxMp / lifespan）。
 * ====================================================================== */
const Stat = {
  compute(p) {
    if (!p) return { atk: 0, def: 0, speed: 0, crit: 0, dodge: 0, block: 0, maxHp: 0, maxMp: 0, lifespan: 100 };
    const r = p.realmIdx;
    const L = p.layer;
    // 基础属性：根骨→攻击与身法，悟性→修炼效率（不在 stat 内），福缘→暴击/掉宝，体魄→气血与防御
    const baseAtk = 8 + p.attrs.gen * 3 + r * 4;
    const baseDef = 6 + p.attrs.body * 2 + r * 3;
    const baseSpd = 10 + p.attrs.gen * 2 + r * 2;
    const baseHp = 80 + p.attrs.body * 15 + Math.pow(r, 1.6) * 6;
    const baseMp = 40 + p.attrs.comp * 8 + r * 4;
    // 功法加成
    let perkAtkPct = 0, perkDefPct = 0, perkHpPct = 0, perkMpPct = 0, perkSpdPct = 0;
    let perkCrit = 0, perkDodge = 0, perkBlock = 0, perkCult = 0;
    for (const [id, g] of Object.entries(p.gongfa)) {
      const def = GameData.ITEMS[id];
      if (!def || !def.bonus) continue;
      for (const [k, v] of Object.entries(def.bonus)) {
        if (k === 'cult') { perkCult += v[0] + (g.level - 1) * v[1]; continue; }
        if (k === 'atkPct') { perkAtkPct += v[0] + (g.level - 1) * v[1]; continue; }
        if (k === 'defPct') { perkDefPct += v[0] + (g.level - 1) * v[1]; continue; }
        if (k === 'hpPct') { perkHpPct += v[0] + (g.level - 1) * v[1]; continue; }
        if (k === 'mpPct') { perkMpPct += v[0] + (g.level - 1) * v[1]; continue; }
        if (k === 'spdPct') { perkSpdPct += v[0] + (g.level - 1) * v[1]; continue; }
        if (k === 'crit') { perkCrit += v[0] + (g.level - 1) * v[1]; continue; }
        if (k === 'dodge') { perkDodge += v[0] + (g.level - 1) * v[1]; continue; }
        if (k === 'block') { perkBlock += v[0] + (g.level - 1) * v[1]; continue; }
      }
    }
    // 装备加成
    let eqAtk = 0, eqAtkPct = 0, eqDef = 0, eqDefPct = 0, eqHp = 0, eqHpPct = 0, eqMp = 0, eqMpPct = 0, eqSpd = 0, eqSpdPct = 0;
    let eqCrit = 0, eqDodge = 0, eqBlock = 0, eqCult = 0, eqLuck = 0, eqStonePct = 0;
    for (const slot of ['weapon', 'armor', 'accessory']) {
      const id = p.equipped[slot];
      if (!id) continue;
      const def = GameData.ITEMS[id];
      if (!def || !def.bonus) continue;
      // 强化加成
      const enhLv = p.enhanced && p.enhanced[id] ? p.enhanced[id] : 0;
      const enhMult = 1 + enhLv * 0.1;
      for (const [k, v] of Object.entries(def.bonus)) {
        if (k === 'atk') { eqAtk += Math.round(v * enhMult); continue; }
        if (k === 'def') { eqDef += Math.round(v * enhMult); continue; }
        if (k === 'hp') { eqHp += Math.round(v * enhMult); continue; }
        if (k === 'mp') { eqMp += Math.round(v * enhMult); continue; }
        if (k === 'spd') { eqSpd += Math.round(v * enhMult); continue; }
        if (k === 'atkPct') { eqAtkPct += v; continue; }
        if (k === 'defPct') { eqDefPct += v; continue; }
        if (k === 'hpPct') { eqHpPct += v; continue; }
        if (k === 'mpPct') { eqMpPct += v; continue; }
        if (k === 'spdPct') { eqSpdPct += v; continue; }
        if (k === 'crit') { eqCrit += v; continue; }
        if (k === 'dodge') { eqDodge += v; continue; }
        if (k === 'block') { eqBlock += v; continue; }
        if (k === 'cult') { eqCult += v; continue; }
        if (k === 'luck') { eqLuck += v; continue; }
        if (k === 'stonePct') { eqStonePct += v; continue; }
      }
    }
    // 套装加成
    let setAtkPct = 0, setDefPct = 0, setHpPct = 0, setCrit = 0;
    const activeSets = ForgeSys.activeSets(p);
    for (const s of activeSets) {
      if (s.bonus.atkPct) setAtkPct += s.bonus.atkPct;
      if (s.bonus.defPct) setDefPct += s.bonus.defPct;
      if (s.bonus.hpPct) setHpPct += s.bonus.hpPct;
      if (s.bonus.crit) setCrit += s.bonus.crit;
    }
    // 宗门加成
    let sectBonus = { atkPct: 0, defPct: 0, hpPct: 0, cult: 0, dodge: 0, stonePct: 0, pillPct: 0, poisonReduce: 0, shopDiscount: 0 };
    if (p.sect) {
      const sd = GameData.SECTS.find(s => s.id === p.sect.id);
      if (sd && sd.bonus) Object.assign(sectBonus, sd.bonus);
    }
    // 职业加成
    if (p.dao === 'sword') perkAtkPct += 50; // 剑修 攻击+50%
    if (p.dao === 'body') { perkHpPct += 100; perkDefPct += 50; } // 体修 hp+100% def+50%
    if (p.dao === 'pill') perkAtkPct -= 15; // 丹道 攻击-15%
    // 般若六境·炼脏境：气血+10%
    if (p.dao === 'body' && DaoSys.tierLevel(p) >= 2) perkHpPct += 10;
    // 轮回印记
    const markPct = (p.reinc && p.reinc.marks) ? p.reinc.marks : 0;
    // 境界特性
    const realmAtkPct = 0, realmDefPct = 0, realmHpPct = 0;
    // 根基深厚
    const rootDeep = p.rootDeep ? 1.2 : 1;
    const rootWeak = p.rootWeak ? 0.85 : 1;
    const atk = Math.round((baseAtk + eqAtk) * (1 + (perkAtkPct + eqAtkPct + setAtkPct + sectBonus.atkPct + markPct) / 100) * rootDeep * rootWeak);
    const def = Math.round((baseDef + eqDef) * (1 + (perkDefPct + eqDefPct + setDefPct + sectBonus.defPct + markPct) / 100) * rootDeep);
    const maxHp = Math.round((baseHp + eqHp) * (1 + (perkHpPct + eqHpPct + setHpPct + sectBonus.hpPct + markPct) / 100) * rootDeep);
    const maxMp = Math.round((baseMp + eqMp) * (1 + (perkMpPct + eqMpPct + markPct) / 100));
    const speed = Math.round((baseSpd + eqSpd) * (1 + (perkSpdPct + eqSpdPct + markPct) / 100));
    const crit = Utils.clamp(5 + perkCrit + eqCrit + setCrit + p.attrs.luck * 1.5 + markPct, 0, 75);
    const dodge = Utils.clamp(2 + perkDodge + eqDodge + sectBonus.dodge + p.attrs.body * 0.2 + markPct * 0.3, 0, 35);
    const block = Utils.clamp(2 + perkBlock + eqBlock + p.attrs.body * 0.3 + markPct * 0.2, 0, 60);
    const lifespan = GameData.LIFESPAN[p.realmIdx] || 120;
    return { atk, def, maxHp, maxMp, speed, crit, dodge, block, lifespan, cult: perkCult + eqCult, luck: p.attrs.luck + eqLuck, stonePct: eqStonePct + sectBonus.stonePct, pillPct: sectBonus.pillPct, poisonReduce: sectBonus.poisonReduce, shopDiscount: sectBonus.shopDiscount };
  },
  /** 防御减伤公式：结余伤害 = 攻击 × (1 - 防御 / (防御 + 140)) */
  afterDef(atk, def) {
    return Math.max(1, Math.round(atk * (1 - def / (def + 140))));
  },
};
window.Stat = Stat;