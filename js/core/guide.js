
/* ======================================================================
 * §1.11 增量扩展（v6）：智能目标指引 Guide
 * 按玩家实时状态给出下一步建议；并负责标签页的分步解锁。
 * ====================================================================== */
const Guide = {
  /** 功能解锁阶段：0 = 初入练气；1 = 练气中期；2 = 筑基 */
  stage(p) { return p.realmIdx >= 1 ? 2 : (p.layer >= 1 ? 1 : 0); },
    /** v19 分阶段教学：大境界首次抵达时给一段要诀提示 */
  REALM_TIPS: {
    1: '【筑基要诀】可拜入宗门、开辟洞府、择定大道——江湖页可结交修士，坊市可置办法宝。',
    2: '【金丹要诀】自此突破需渡天劫：硬抗/法宝/借地三策各有所得，劫前记得备份存档！',
    3: '【元婴要诀】秘境碎片可铸本命法宝——集齐九枚，魔魂可克。交情深者可结拜、结侣。',
  },
  realmTip(p) {
    if (!p || !this.REALM_TIPS[p.realmIdx]) return;
    const key = 'tut_r' + p.realmIdx;
    p.flags = p.flags || {};
    if (p.flags[key]) return;
    p.flags[key] = true;
    Log.add(this.REALM_TIPS[p.realmIdx], 'system');
    UI.announce(`✦ ${GameData.REALM_NAMES[p.realmIdx]}期 · 要诀 ✦`, 'gold');
  },
LOCKS: {
    map: { stage: 1, hint: '游历 · 练气中期解锁' },
    shop: { stage: 1, hint: '坊市 · 练气中期解锁' },
    jianghu: { stage: 2, hint: '江湖 · 筑基期解锁' },
    sect: { stage: 2, hint: '宗门 · 筑基期解锁' },
    cave: { stage: 2, hint: '洞府 · 筑基期解锁' },
  },
  tabLocked(tab) {
    const p = Game.player;
    const L = this.LOCKS[tab];
    if (!p || !L) return null;
    return this.stage(p) >= L.stage ? null : L.hint;
  },
  /** 当前建议：按优先级取前三条 */
  tips(p) {
    const t = [];
    const st = Stat.compute(p);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const full = p.layer === 3 && p.exp >= need;
    if (full && p.realmIdx < 9) t.push(`修为已至圆满，可冲击 <b>${GameData.REALM_NAMES[p.realmIdx + 1]}</b> 期瓶颈（预估成算 ${Cultivate.breakthroughChance(p, p.realmIdx + 1 < GameData.TRIB_START ? 15 : 0).toFixed(0)}%）`);
    else if (full && p.realmIdx === 9 && !p.flags.ascended) t.push('真仙圆满，仙门已开——可白日飞升');
    if (p.realmIdx >= 1 && !p.dao) t.push('大道未定，如无舵之舟——宜叩问大道');
    // v11 主线目标提示（置顶）
    const qc = QuestSys.CHAPTERS[QuestSys.currentChapterIdx(p)];
    if (qc) {
      const undone = qc.steps.find(st => !QuestSys.stepDone(st, p, qc.supR));
      if (undone) t.splice(Math.min(1, t.length), 0, `<b>主线·${qc.title}</b>：${undone.desc}`);
    }
    if (AutoCult.active) t.push(`自动修炼中（${AutoCult.rounds} 轮，修为 +${Utils.fmtNum(Math.max(0, this.totalExp(p) - AutoCult.startExp))}），可随时停止`);
    if ((p.karma || 0) >= 100) t.push('孽障缠身，可于修炼页<b>斩三尸</b>');
    else if ((p.karma || 0) >= 60) t.push('孽障渐高，仇家窥伺于后——宜谨言慎行');
    const cap = Stat.poisonCap(p);   // v20：上限单源化
    if (p.poison > cap * 0.75) t.push('丹毒将满，宜服解毒丹或停药休养');
    if (p.hp < st.maxHp * 0.3) t.push('气血衰微，宜打坐调息或服丹补满');
    if (p.canReincarnate) t.push('兵解转世之机已现——或可重开一世');
    if (p.world && p.world.pending) t.push('天下大势正待抉择，可于游历页参与');
    if (NpcSys.grudgeCount(p) > 0) t.push('有宿敌伺机报复——宜化解仇怨或早做备战');
    if (!t.length) {
      if (p.exp >= need * 0.8 && !full) t.push(`修为将满（${Math.round(p.exp / need * 100)}%），再积攒片刻便可冲关`);
      else t.push('修炼积攒修为，或外出历练搏杀机缘');
    }
    return t.slice(0, 4);   // v11：容纳主线目标提示
  },
  totalExp(p) {
    let sum = 0;
    for (let l = 0; l < p.layer; l++) sum += GameData.layerNeed(p.realmIdx, l);
    return sum + p.exp;
  },
};
