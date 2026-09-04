
/* ======================================================================
 * §6 属性计算（功法 / 法宝 / 宗门 加成汇总）
 * ====================================================================== */
const Stat = {
  /** 汇总已学功法的加成 */
  gongfaBonus(p) {
    const total = {};
    for (const [id, g] of Object.entries(p.gongfa)) {
      const def = GameData.ITEMS[id];
      if (!def || !def.bonus) continue;
      for (const [k, [base, per]] of Object.entries(def.bonus)) {
        total[k] = (total[k] || 0) + base + per * (g.level - 1);
      }
    }
    // v19 道韵协同：特定功法组合双修至三层以上，共鸣生韵（v20 扩池合并消费）
    for (const dy of (GameData.DAO_YUN || []).concat(GameData.DAO_YUN_EXTRA || [])) {
      if (!dy.need.every(gid => p.gongfa[gid] && p.gongfa[gid].level >= 3)) continue;
      for (const [k, v] of Object.entries(dy.fx)) total[k] = (total[k] || 0) + v;
    }
    // v20 传承树九层「道韵残响」：转世继承的上一世最强道韵（保存于 p.reinc.echo）
    if (p.reinc && p.reinc.echo) for (const [k, v] of Object.entries(p.reinc.echo)) total[k] = (total[k] || 0) + v;
    // v20 功法大成奥义：修至满层解锁专属被动
    for (const [id, g] of Object.entries(p.gongfa)) {
      const def = GameData.ITEMS[id];
      const mst = def && GameData.GF_MASTERY[id];
      if (!mst || g.level < GongfaSys.maxLevel(def)) continue;
      for (const [k, v] of Object.entries(mst.fx)) total[k] = (total[k] || 0) + v;
    }
    return total;
  },
  /** v19 已激活的道韵列表（功法页展示；v20 扩池合并） */
  activeDaoYun(p) {
    return (GameData.DAO_YUN || []).concat(GameData.DAO_YUN_EXTRA || [])
      .filter(dy => dy.need.every(gid => p.gongfa[gid] && p.gongfa[gid].level >= 3));
  },
  /** 汇总已穿戴法宝的加成（v13：数值属性受强化等级 +10%/级 加成；套装加成并入） */
  equipBonus(p) {
    const total = {};
    // v18: 装备槽位存 {id, enhance}，使用 Utils.eqId 兼容
    for (const slotId of Object.values(p.equipped)) {
      const id = Utils.eqId(slotId);
      if (!id) continue;
      const def = GameData.ITEMS[id];
      if (!def || !def.bonus) continue;
      const enhLv = (typeof ForgeSys !== 'undefined' && ForgeSys.lvOf) ? ForgeSys.lvOf(p, slotId) : 0;
      const enhMul = 1 + enhLv * 0.1;
      for (const [k, v] of Object.entries(def.bonus)) {
        const flat = k === 'atk' || k === 'def' || k === 'hp' || k === 'mp' || k === 'spd';
        total[k] = (total[k] || 0) + (flat ? v * enhMul : v);
      }
    }
    // v13 套装加成
    if (typeof ForgeSys !== 'undefined' && ForgeSys.setBonus) {
      for (const [k, v] of Object.entries(ForgeSys.setBonus(p))) total[k] = (total[k] || 0) + v;
    }
    // v19 词缀前缀加成
    if (typeof ForgeSys !== 'undefined' && ForgeSys.affixBonus) {
      for (const [k, v] of Object.entries(ForgeSys.affixBonus(p))) total[k] = (total[k] || 0) + v;
    }
    return total;
  },
  sectBonus(p) {
    if (!p.sect) return {};
    const sect = GameData.SECTS.find(s => s.id === p.sect.id);
    const base = sect ? { ...sect.bonus } : {};
    // v18：宗门职位加成
    const rank = SectSys.rank(p);
    if (rank && rank.bonus) {
      for (const [k, v] of Object.entries(rank.bonus)) {
        base[k] = (base[k] || 0) + v;
      }
    }
    return base;
  },
  /** 有效悟性：转世传承 +10%／层，圣地讲道限时翻倍（§26 / §23） */
  compOf(p) {
    let c = (p.attrs && p.attrs.comp) || 5;
    if (p.reinc && p.reinc.compPct) c *= 1 + p.reinc.compPct / 100;
    const w = p.world;
    if (w && w.preachUntil) {
      const y = Math.floor((p.day || 0) / 365) + 1;
      if (y <= w.preachUntil) c *= 2;
    }
    return c;
  },
  compute(p) {
    const rp = p.realmIdx * 4 + p.layer;
    const gf = this.gongfaBonus(p);
    const eq = this.equipBonus(p);
    const sb = this.sectBonus(p);
    const dao = DaoSys.bonus(p);            // §19 大道职业加成
    // v13 灵兽被动 / 洞府聚灵阵加成
    const beastPass = (typeof BeastSys !== 'undefined' && BeastSys.passive) ? BeastSys.passive(p) : {};
    const caveCult = (typeof CaveSys !== 'undefined' && CaveSys.cultBonus) ? CaveSys.cultBonus(p) : 0;
    const rootPct = p.rootDeep ? 20 : 0;    // §22 根基深厚：全属性 +20%
    const lossPct = Math.min(50, p.statLossPct || 0); // §20 斩三尸：全属性永久折损（上限50%）
    const marks = p.reinc ? (p.reinc.marks || 0) : 0; // §26 轮回印记：每枚 +1% 全属性
    // v18 残玉共鸣 + 道心烙印
    const dx = (typeof DaoxinSys !== 'undefined' && DaoxinSys.bonusOf) ? DaoxinSys.bonusOf(p) : {};
    const jadePct = (typeof DaoxinSys !== 'undefined' && DaoxinSys.attunePct) ? DaoxinSys.attunePct(p) : 0;
    // v19 个人线永久加成
    const pl = (typeof PersonalSys !== 'undefined' && PersonalSys.bonusOf) ? PersonalSys.bonusOf(p) : {};
    const A = p.attrs;
    const compEff = this.compOf(p);
    const finalScale = (1 + rootPct / 100) * (1 - lossPct / 100) * (1 + marks * 0.01)
      * (1 + jadePct / 100)
      * ((typeof XinmoSys !== 'undefined' && XinmoSys.scale) ? XinmoSys.scale(p) : 1)
      * (1 + ((p.benming && p.benming.lv) || 0) * 0.01)
      * ((typeof RankSys !== 'undefined' && RankSys.isTop && RankSys.isTop(p)) ? 1.02 : 1);   // v13 天下第一：全属性 +2%

    const maxHp = Math.round((90 + A.body * 15 + Math.pow(rp, 1.6) * 6 + (eq.hp || 0))
      * (1 + ((gf.hpPct || 0) + (eq.hpPct || 0) + (dao.hpPct || 0) + (beastPass.hpPct || 0) + (dx.hpPct || 0) + (pl.hpPct || 0)) / 100) * finalScale);
    const maxMp = Math.round((40 + compEff * 8 + rp * 4 + (eq.mp || 0))
      * (1 + ((gf.mpPct || 0) + (dao.mpPct || 0)) / 100) * finalScale);
    const atk = Math.round((8 + A.gen * 2 + rp * 3 + (eq.atk || 0))
      * (1 + ((gf.atkPct || 0) + (eq.atkPct || 0) + (sb.atkPct || 0) + (dao.atkPct || 0) + (beastPass.atkPct || 0) + (dx.atkPct || 0) + (pl.atkPct || 0)) / 100) * finalScale);
    const def = Math.round((4 + A.body * 1.2 + rp * 1.8 + (eq.def || 0))
      * (1 + ((gf.defPct || 0) + (eq.defPct || 0) + (dao.defPct || 0) + (dx.defPct || 0) + (pl.defPct || 0)) / 100) * finalScale);
    const speed = Math.round((8 + (A.gen + A.body) / 2 + rp * 0.8 + (eq.spd || 0))
      * (1 + (gf.spdPct || 0) / 100) * finalScale);
    return {
      maxHp, maxMp, atk, def, speed,
      crit: Utils.clamp(5 + (A.luck + (eq.luck || 0)) * 0.6 + (gf.crit || 0) + (eq.crit || 0) + (beastPass.crit || 0) + (dx.crit || 0) + (pl.crit || 0), 0, 75),
      dodge: Utils.clamp((gf.dodge || 0) + (eq.dodge || 0) + (sb.dodge || 0) + (beastPass.dodge || 0) + (dx.dodge || 0) + (pl.dodge || 0) + (p.dao === 'array' && DaoSys.tierLevel(p) >= 4 ? 8 : 0), 0, 35),   // v10 阵道六境·迷踪境 · v13 宗门/灵兽
      block: Utils.clamp(8 + (gf.block || 0) + (p.dao === 'body' && DaoSys.tierLevel(p) >= 3 ? 10 : 0), 0, 60),   // v10 般若六境·铁骨境
      cultPct: (gf.cult || 0) + (eq.cult || 0) + (sb.cult || 0) + caveCult + (beastPass.cult || 0) + (dx.cultPct || 0),
      stonePct: (sb.stonePct || 0) + (eq.stonePct || 0) + (((p.cave && p.cave.builds && p.cave.builds.treasury) || 0) * 3),   // v20 藏宝阁
      luck: A.luck + (eq.luck || 0),
      pillPct: (sb.pillPct || 0) + (pl.pillPct || 0),
      poisonReduce: sb.poisonReduce || 0,
      shopDiscount: sb.shopDiscount || 0,
      lifespan: GameData.LIFESPAN[p.realmIdx],
    };
  },
  /** 防御减伤后的伤害期望值 */
  /** 防御减伤后的伤害期望值 */
  afterDef(atk, def) { return atk * (1 - def / (def + (GameData.BALANCE.COMBAT.AFTER_DEF_DENOM || 140))); },
  /** v20 丹毒上限单源化（原公式散落 5 处硬编码）：60 + 体魄×8，炼虚「合道」+20 */
  poisonCap(p) { return 60 + ((p.attrs && p.attrs.body) || 0) * 8 + (p.realmIdx >= 5 ? 20 : 0); },
  /** v20 综合战力：攻防血三维加权，用于自我衡量/地图校准/宿敌对比 */
  power(p) {
    const st = this.compute(p);
    return Math.round(st.atk * 2 + st.def * 1.5 + st.maxHp * 0.3 + st.speed * 1 + st.crit * 2 + st.dodge * 1.5 + st.block * 0.5);
  },
  /** v20 属性明细：列出某项属性的构成来源（逐行标注） */
  breakdown(p, key) {
    const st = this.compute(p);
    const gf = this.gongfaBonus(p);
    const eq = this.equipBonus(p);
    const sb = this.sectBonus(p);
    const dao = (typeof DaoSys !== 'undefined' && DaoSys.bonus) ? DaoSys.bonus(p) : {};
    const beastPass = (typeof BeastSys !== 'undefined' && BeastSys.passive) ? BeastSys.passive(p) : {};
    const dx = (typeof DaoxinSys !== 'undefined' && DaoxinSys.bonusOf) ? DaoxinSys.bonusOf(p) : {};
    const pl = (typeof PersonalSys !== 'undefined' && PersonalSys.bonusOf) ? PersonalSys.bonusOf(p) : {};
    const pctOf = (obj, k) => obj[k] || 0;
    const base = {
      atk: 8 + p.attrs.gen * 2 + (p.realmIdx * 4 + p.layer) * 3,
      def: 4 + p.attrs.body * 1.2 + (p.realmIdx * 4 + p.layer) * 1.8,
      maxHp: 90 + p.attrs.body * 15 + Math.pow(p.realmIdx * 4 + p.layer, 1.6) * 6,
      maxMp: 40 + this.compOf(p) * 8 + (p.realmIdx * 4 + p.layer) * 4,
      speed: 8 + (p.attrs.gen + p.attrs.body) / 2 + (p.realmIdx * 4 + p.layer) * 0.8,
      crit: 5 + (p.attrs.luck + (eq.luck || 0)) * 0.6,
      dodge: 0, block: 8, cultPct: 0, stonePct: 0, luck: p.attrs.luck, pillPct: 0,
    }[key] || 0;
    const src = [
      { name: '基础（先天+境界）', v: base },
      { name: '功法' + (this.activeDaoYun(p).length ? '（含道韵/奥义）' : ''), v: key === 'crit' || key === 'dodge' || key === 'block' || key === 'cultPct' || key === 'stonePct' || key === 'pillPct' ? pctOf(gf, key) : key.endsWith('Pct') || key === 'maxHp' || key === 'maxMp' ? (key === 'maxHp' ? pctOf(gf, 'hpPct') : key === 'maxMp' ? pctOf(gf, 'mpPct') : pctOf(gf, key + 'Pct')) : pctOf(gf, key) },
      { name: '装备（强化/词缀/套装）', v: key === 'maxHp' ? (eq.hp || 0) + pctOf(eq, 'hpPct') : key === 'maxMp' ? (eq.mp || 0) + pctOf(eq, 'mpPct') : key === 'crit' || key === 'dodge' || key === 'block' || key === 'cultPct' || key === 'stonePct' || key === 'luck' ? pctOf(eq, key) : pctOf(eq, key === 'speed' ? 'spd' : key === 'atk' || key === 'def' ? key : key + 'Pct') },
      { name: '宗门与职位', v: key === 'atk' || key === 'def' ? pctOf(sb, key + 'Pct') : key === 'crit' || key === 'dodge' || key === 'cultPct' || key === 'stonePct' || key === 'pillPct' || key === 'luck' ? pctOf(sb, key) : 0 },
      { name: '大道与道境', v: key === 'atk' || key === 'def' || key === 'maxHp' || key === 'maxMp' ? pctOf(dao, key === 'maxHp' ? 'hpPct' : key === 'maxMp' ? 'mpPct' : key + 'Pct') : 0 },
      { name: '灵兽（含护持）', v: key === 'crit' || key === 'dodge' || key === 'cultPct' ? pctOf(beastPass, key) : key === 'atk' || key === 'def' || key === 'maxHp' ? pctOf(beastPass, key === 'maxHp' ? 'hpPct' : key + 'Pct') : 0 },
      { name: '道心烙印', v: key === 'crit' || key === 'dodge' || key === 'cultPct' ? pctOf(dx, key) : key === 'atk' || key === 'def' || key === 'maxHp' ? pctOf(dx, key === 'maxHp' ? 'hpPct' : key + 'Pct') : 0 },
      { name: '个人线', v: key === 'crit' || key === 'dodge' || key === 'pillPct' ? pctOf(pl, key) : key === 'atk' || key === 'def' || key === 'maxHp' ? pctOf(pl, key === 'maxHp' ? 'hpPct' : key + 'Pct') : 0 },
      { name: '洞府（聚灵/藏宝）', v: key === 'cultPct' ? ((p.cave && p.cave.lv) || 0) * 4 : key === 'stonePct' ? (((p.cave && p.cave.builds && p.cave.builds.treasury) || 0) * 3) : 0 },
      { name: '轮回印记/残玉共鸣/心魔凝练', v: key === 'atk' || key === 'def' || key === 'maxHp' || key === 'maxMp' || key === 'speed' ? Math.round(base * (((p.reinc ? (p.reinc.marks || 0) * 0.01 : 0) + ((p.jade || 0) * 0.015) + ((p.flags && p.flags.xinmoCleared) || 0) * 0.01 + ((p.benming && p.benming.lv) || 0) * 0.01)) * 100) / 100 : 0 },
    ].filter(x => Math.abs(x.v) > 0.01);
    return { final: st[key], src };
  },
};
