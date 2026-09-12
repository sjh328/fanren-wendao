
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
    // v24 日常仪式（求签/灵田/悬赏）不再进建议——修炼页「今日修行」卡与页签红点已全程承接，
    // 腾出的位置给支线结案与个人线续谈两条「内容型」提醒，避免 2.8 万字剧情内容被静默挤掉
    if (typeof QuestSys !== 'undefined' && QuestSys.sideClaimable && QuestSys.sideClaimable(p)) {
      t.push({ text: '<b>奇遇可了结</b>——支线已达成，结案领赏入问道录', go: 'quest' });
    }
    if (typeof PersonalSys !== 'undefined' && PersonalSys.anyAvailable && PersonalSys.anyAvailable(p)) {
      t.push({ text: '<b>新知</b>：有故人似有心事——江湖页「续谈」可赴约一叙', go: 'jianghu' });
    }
    // v24 新知扩容：寻宝归来 / 碎片将齐 / 道韵将成
    if ((p.beasts && p.beasts.list || []).some(b => b.trip && Math.floor(p.day || 0) >= b.trip.until)) {
      t.push({ text: '<b>新知</b>：灵兽寻宝已归——洞府·灵兽可点「归来」收取灵材', go: 'cave:beast' });
    }
    if ((p.counters.gupianGot || 0) >= 9 && !p.benming) {
      t.push({ text: '<b>新知</b>：上古碎片已足九枚——秘境页可合成本命法宝', go: 'map:realm' });
    }
    if (Object.values(p.gongfa || {}).some(g => g.level >= 2) && !(typeof Stat !== 'undefined' && Stat.activeDaoYun(p).length)) {
      t.push({ text: '<b>新知</b>：功法将可共鸣成韵——功法页道韵卡已标出缺口', go: 'gongfa' });
    }
    // v23 奇市提醒：黑市开市 / 拍卖将止，错过不再无感
    if (BlackSys.isOpen(p)) t.push({ text: `暗巷黑市开市中（余 ${BlackSys.daysLeft(p)} 日）——奇货与赌局，福缘者得`, go: 'shop:odd' });
    {
      const lot = AuctionSys.state(p);
      const left = Math.max(0, lot.until - Math.floor(p.day || 0));
      if (left <= 10) t.push({ text: `拍卖行本期拍品将止（余 ${left} 日）——稳健/激进/天价，各凭眼光`, go: 'shop:odd' });
    }
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
    // v25 登天塔首遇新知
    if (typeof TowerSys !== 'undefined' && TowerSys.unlockOk(p) && !(p.counters.towerWins || 0) && TowerSys.leftToday(p) > 0) {
      t.push({ text: '<b>新知</b>：城西<b>登天塔</b>开塔了——每层一战、三层赠福、五层开箱，败北无性命之虞', go: 'map:tower' });
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
    return t.slice(0, 5);   // v11 四条 → v23 五条：容纳主线 + 紧急 + 日常 + 新知/奇市提醒
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
      const cost = CaveSys.rushCost(p);   // v24 定价单源化（随境界）
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
      // v23 自动补种：空田按持有量最多的种子播满（种子唯一用途即播种）
      const seeds = Object.keys(p.bag).filter(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'seed' && p.bag[id] > 0)
        .sort((a, b) => p.bag[b] - p.bag[a]);
      if (seeds.length) {
        let pn = 0;
        const n2 = CaveSys.plotCount(p);
        for (let i = 0; i < n2 && p.bag[seeds[0]] > 0; i++) {
          if (!p.cave.plots[i]) {
            const sd = GameData.ITEMS[seeds[0]];
            p.cave.plots[i] = { seed: seeds[0], crop: sd.crop, days: sd.days, plantedDay: Math.floor(p.day) };
            Bag.removeItem(seeds[0], 1);
            pn++;
          }
        }
        if (pn) {
          done.push(`自动补种 ×${pn}（${GameData.ITEMS[seeds[0]].name}）`);
          Log.add(`你顺手把 ${pn} 块空田都播上了【${GameData.ITEMS[seeds[0]].name}】。`, 'info');
        }
      }
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
    // 4.5 v28 扩容：已达成的宗门任务一并领取（贡献/灵石入账，任务板自动换新）
    if (p.sect && Array.isArray(p.sect.tasks)) {
      let sn = 0;
      for (let i = 0; i < p.sect.tasks.length; i++) {
        const t = p.sect.tasks[i];
        if (t && t.progress >= t.need) { SectSys.claim(i); sn++; }
      }
      if (sn) done.push(`宗门任务领赏 ×${sn}`);
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
