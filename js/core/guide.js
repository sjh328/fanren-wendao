
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
  /** 当前建议：按优先级取前三条；v21 返回 {text, go}，go=可直达页签（无则纯提示） */
  tips(p) {
    const t = [];
    const st = Stat.compute(p);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const cap = Stat.poisonCap(p);   // v20：上限单源化（v22 提前：新知丹毒提示亦用）
    const full = p.layer === 3 && p.exp >= need;
    if (full && p.realmIdx < 9) t.push({ text: `修为已至圆满，可冲击 <b>${GameData.REALM_NAMES[p.realmIdx + 1]}</b> 期瓶颈（预估成算 ${Cultivate.breakthroughChance(p, p.realmIdx + 1 < GameData.TRIB_START ? 15 : 0).toFixed(0)}%）`, go: 'cultivate' });
    else if (full && p.realmIdx === 9 && !p.flags.ascended) t.push({ text: '真仙圆满，仙门已开——可白日飞升', go: 'cultivate' });
    if (p.realmIdx >= 1 && !p.dao) t.push({ text: '大道未定，如无舵之舟——宜叩问大道', go: 'cultivate' });
    // v11 主线目标提示（置顶）
    const qc = QuestSys.CHAPTERS[QuestSys.currentChapterIdx(p)];
    if (qc) {
      const undone = qc.steps.find(st => !QuestSys.stepDone(st, p, qc.supR));
      if (undone) t.splice(Math.min(1, t.length), 0, { text: `<b>主线·${qc.title}</b>：${undone.desc}`, go: 'quest' });
    }
    if (AutoCult.active) t.push({ text: `自动修炼中（${AutoCult.rounds} 轮，修为 +${Utils.fmtNum(Math.max(0, this.totalExp(p) - AutoCult.startExp))}），可随时停止`, go: 'cultivate' });
    if ((p.karma || 0) >= 100) t.push({ text: '孽障缠身，可于修炼页<b>斩三尸</b>', go: 'cultivate' });
    else if ((p.karma || 0) >= 60) t.push({ text: '孽障渐高，仇家窥伺于后——宜谨言慎行' });
    if (p.poison > cap * 0.75) t.push({ text: '丹毒将满，宜服解毒丹或停药休养', go: 'cultivate' });
    if (p.hp < st.maxHp * 0.3) t.push({ text: '气血衰微，宜打坐调息或服丹补满', go: 'cultivate' });
    if (p.canReincarnate) t.push({ text: '兵解转世之机已现——或可重开一世', go: 'cultivate' });
    if (p.world && p.world.pending) t.push({ text: '天下大势正待抉择，可于游历页参与', go: 'map:world' });
    if (NpcSys.grudgeCount(p) > 0) t.push({ text: '有宿敌伺机报复——宜化解仇怨或早做备战', go: 'jianghu' });
    // v21 日常仪式提醒（v22：子页签深链直达）：黄历 / 灵田 / 悬赏
    if (p.signDay !== Math.floor(p.day || 0)) t.push({ text: '今日黄历尚未求签——一签定小机缘', go: 'map:world' });
    const ripe = ((p.cave && p.cave.plots) || []).filter(pl => pl && pl.seed && (Math.floor(p.day || 0) - (pl.plantedDay || 0)) >= (pl.days || 0)).length;
    if (ripe > 0) t.push({ text: `灵田有 <b>${ripe}</b> 块作物已然成熟——请及时采收`, go: 'cave:farm' });
    if ((p.bounties && p.bounties.list || []).some(bt => bt && bt.progress >= bt.need)) t.push({ text: '悬赏目标已然达成——可去坊市领取赏格', go: 'shop:bounty' });   // v21: 领后置空条目判空
    // v22 首遇新知：情境化提示，随条件自解——新系统第一时间被看见（置于紧急事项之后，不挤占优先位）
    if (Object.keys(p.bag).some(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'artifact')
      && !Object.values(p.equipped || {}).every(e => e)) {
      t.push({ text: '<b>新知</b>：乾坤袋中有法宝未佩戴——装备可大幅提升战力', go: '' });
    }
    if (p.realmIdx >= ((GameData.SECRET_REALMS[0] || {}).recRealm || 0) && !(p.counters.maxDepth || 0)) {
      t.push({ text: '<b>新知</b>：你的境界已可探索<b>秘境</b>——九层随机险地，深处藏失传功法', go: 'map:realm' });
    }
    if (p.realmIdx >= 1 && ((p.bounties && p.bounties.list) || []).some(bt => bt && bt.progress < bt.need)) {
      t.push({ text: '<b>新知</b>：坊市悬赏板贴出了新悬赏——猎杀目标游历时自动计入', go: 'shop:bounty' });
    }
    if (p.poison > cap * 0.5 && p.poison <= cap * 0.75) {
      t.push({ text: '<b>新知</b>：丹毒已过半——服丹宜缓，或备几枚解毒丹', go: 'cultivate' });
    }
    if (p.sect && p.sect.tourney) {
      t.push({ text: '<b>新知</b>：<b>宗门大比</b>正酣——登台比武，三连胜可夺魁首', go: 'sect' });
    }
    if (Object.keys(p.bag).some(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'gongfa') && !Object.keys(p.gongfa || {}).length) {
      t.push({ text: '<b>新知</b>：背包有功法典籍未修习——功法页学习可提升修炼效率', go: 'gongfa' });
    }
    if (!t.length) {
      if (p.exp >= need * 0.8 && !full) t.push({ text: `修为将满（${Math.round(p.exp / need * 100)}%），再积攒片刻便可冲关`, go: 'cultivate' });
      else t.push({ text: '修炼积攒修为，或外出历练搏杀机缘', go: 'cultivate' });
    }
    return t.slice(0, 4);   // v11：容纳主线目标提示
  },
  totalExp(p) {
    let sum = 0;
    for (let l = 0; l < p.layer; l++) sum += GameData.layerNeed(p.realmIdx, l);
    return sum + p.exp;
  },
  /** v22 一键日常：求签 → 聚灵 → 采收灵田 → 领悬赏，一纸小账回报（无可办则提示） */
  async dailyAll() {
    const p = Game.player;
    if (!p || p.dead) return;
    const done = [];
    const today = Math.floor(p.day || 0);
    // 1 黄历求签
    if (p.signDay !== today) {
      DailySign.draw();
      if (p.signDay === today) done.push('黄历求签');
    }
    // 2 聚灵加速（静默执行，省去确认弹窗）
    if (p.cave && p.rushDay !== today) {
      const cost = Math.round(120 * GameData.stoneEco(Math.min(4, p.realmIdx)));
      if (Bag.spendStones(cost)) {
        p.rushDay = today;
        Log.add(`聚灵阵轰然全开——今日修炼效率 ×1.5！（灵石 -${Utils.fmtNum(cost)}）`, 'system');
        done.push('聚灵加速');
      } else {
        Log.add('聚灵阵静默着——灵石不足，今日便不点了。', 'info');
      }
    }
    // 3 采收成熟灵田
    if (p.cave && p.cave.plots) {
      let n = 0;
      (p.cave.plots || []).forEach((pl, i) => {
        if (pl && pl.seed && (today - (pl.plantedDay || 0)) >= (pl.days || 0)) { CaveSys.harvest(i); n++; }
      });
      if (n) done.push(`采收灵田 ×${n}`);
    }
    // 4 领取已达成的悬赏——先刷新当日榜单（stateOf 有日界再生），再按当前榜领取
    const B = (typeof BountySys !== 'undefined') ? BountySys.stateOf(p) : null;
    if (B && B.list) {
      let bn = 0;
      for (let i = 0; i < B.list.length; i++) {
        const bt = B.list[i];
        if (bt && bt.progress >= bt.need) { BountySys.claim(i); bn++; }
      }
      if (bn) done.push(`悬赏领赏 ×${bn}`);
    }
    if (!done.length) { UI.toast('今日诸事皆已办妥——安心修行便是'); return; }
    await UI.popup({
      title: '✦ 一键行权 · 小账',
      html: done.map(x => `<div class="tip-line">· ${x} ✓</div>`).join('')
        + '<div class="tip-line" style="margin-top:6px">· 各项收支明细见「游历记载」。</div>',
      options: [{ text: '收 下', value: true, primary: true }],
    });
    Game.afterAction();
  },
};
