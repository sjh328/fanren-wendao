
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
    4: '【化神要诀】登天塔「塔心祝福」与天级炼器图纸已就绪——高阶材料秘境更深处分出。',
    5: '【炼虚要诀】龙渊海眼已开——雷狱级材料在此；道境六重与必杀熟练是战力新轴。',
    6: '【合体要诀】拍卖高阶拍品渐多，灵石宜留作拍行竞价；天塔深处的塔材可炼鸣铃。',
    7: '【大乘要诀】渡劫丹可备一劫之用——雷晶核入药，劫前三日服下成算更稳。',
    8: '【渡劫要诀】九霄雷狱已开，仙缘近在咫尺——法宝挡劫品阶不低于所需即可代劫。',
    9: '【真仙要诀】仙门之外另有天地——塔影照心、门前影、残玉终响，两世之问将决于此。',
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
    const need = GameData.layerNeedT(p, p.realmIdx, p.layer);
    const cap = Stat.poisonCap(p);   // v20：上限单源化（v22 提前：新知丹毒提示亦用）
    const full = p.layer === 3 && p.exp >= need;
    // v34（E5）：与 renderFocus 同一条首命中链——focus 主/副卡只显示链上第一条，
    // 建议区只对「正被 focus 显示的那一条」去重，其余同域建议（斩三尸/丹毒等）照常保留
    const fa =
      (full && p.realmIdx < 9) ? 'realm' :
      (full && p.realmIdx === 9 && !p.flags.ascended) ? 'ascend' :
      (p.realmIdx >= 1 && !p.dao) ? 'dao' :
      ForgeSys.gupianReady(p) ? 'gupian' :   // v35（E160）：单源判定
      ((p.karma || 0) >= 100) ? 'karma' :
      (p.poison > cap * 0.75) ? 'poison' :
      (p.hp < st.maxHp * 0.3) ? 'hp' : null;
    if (full && p.realmIdx < 9 && fa !== 'realm') t.push({ text: `修为已至圆满，可冲击 <b>${GameData.REALM_NAMES[p.realmIdx + 1]}</b> 期瓶颈（预估成算 ${Cultivate.breakthroughChance(p, p.realmIdx + 1 < GameData.TRIB_START ? 15 : 0).toFixed(0)}%）`, go: 'cultivate' });
    else if (full && p.realmIdx === 9 && !p.flags.ascended && fa !== 'ascend') t.push({ text: '真仙圆满，仙门已开——可白日飞升', go: 'cultivate' });
    if (p.realmIdx >= 1 && !p.dao && fa !== 'dao') t.push({ text: '大道未定，如无舵之舟——宜叩问大道', go: 'cultivate' });
    // v11 主线目标提示（置顶）
    const qc = QuestSys.CHAPTERS[QuestSys.currentChapterIdx(p)];
    if (qc) {
      const undone = qc.steps.find(st => !QuestSys.stepDone(st, p, qc.supR));
      if (undone) t.splice(Math.min(1, t.length), 0, { text: `<b>主线·${qc.title}</b>：${undone.desc}`, go: 'quest' });
    }
    if (AutoCult.active) t.push({ text: `自动修炼中（${AutoCult.rounds} 轮，修为 +${Utils.fmtNum(Math.max(0, this.totalExp(p) - AutoCult.startExp))}），可随时停止`, go: 'cultivate' });
    if ((p.karma || 0) >= 100 && fa !== 'karma') t.push({ text: '孽障缠身，可于修炼页<b>斩三尸</b>', go: 'cultivate' });
    else if ((p.karma || 0) >= 60) t.push({ text: '孽障渐高，仇家窥伺于后——宜谨言慎行' });
    if (p.poison > cap * 0.75 && fa !== 'poison') t.push({ text: '丹毒将满，宜服解毒丹或停药休养', go: 'cultivate' });
    if (p.hp < st.maxHp * 0.3 && fa !== 'hp') t.push({ text: '气血衰微，宜打坐调息或服丹补满', go: 'cultivate' });
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
    if (ForgeSys.gupianReady(p) && fa !== 'gupian') {   // v35（E160）：单源判定
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
    // v33（D9/E103）：升档新知——v32/v33 新系统对老档零感知路径，补三条条件化引导
    if (!(p.flags && p.flags.tut_v33sign) && (p.counters.signs || 0) > 0 && (p.signStreak || 0) < 7) {
      t.push({ text: '<b>新知</b>：黄历<b>连签</b>三日内不断即延续——满七日必得上上签、气运 +3', go: 'map:world' });
      p.flags = p.flags || {}; p.flags.tut_v33sign = true;
    }
    if (!(p.flags && p.flags.tut_v33rule) && (p.counters.maxDepth || 0) > 0) {
      t.push({ text: '<b>新知</b>：十座秘境各有<b>地脉规则</b>——入秘先识规则，守敌随之变形；战中亦可见', go: 'map:realm' });
      p.flags = p.flags || {}; p.flags.tut_v33rule = true;
    }
    if (!(p.flags && p.flags.tut_v33fee) && (p.counters.forges || 0) > 0) {
      t.push({ text: '<b>新知</b>：炼器坊开炉今起收取<b>工费</b>——配方行已标价；善用残片入炉可省材料', go: 'shop:craft' });
      p.flags = p.flags || {}; p.flags.tut_v33fee = true;
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
    for (let l = 0; l < p.layer; l++) sum += GameData.layerNeedT(p, p.realmIdx, l);
    return sum + p.exp;
  },
  /** v22 一键日常：求签 → 聚灵 → 采收灵田 → 照料（浇水/抚兽/除虫）→ 领悬赏 → 宗门领赏，一纸小账回报
   *  v35（U3）日常归一：原「一键行权」与洞府「一键照料」两张皮——各办一半日常，虫害无人接管；
   *  现行权吸收照料核心（共用 CaveSys.careCore，行为与一键照料严格一致）。
   *  聚灵扣款不再静默：首日弹一次确认（可选「以后不再询问」），花钱决策回到明面上。 */
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
    // 2 聚灵加速（v35（U3）：首日明示价格并征求同意，可选「以后不再询问」——原静默扣款，
    // 后期每日 137 万灵石的支出藏在家务按钮里）
    // v36（E218）：聚灵 3 日窗口终态守卫——窗口未激活（!inWindow）才询问/点燃；inWindow 时整步
    // 跳过（不弹窗不扣款）。E205 的单日跳过与三态偏好语义不变
    const inWindow = p.rushDay != null && today - p.rushDay < 3;
    if (p.cave && !inWindow && p._autoRush !== 'skip' && p._autoRushSkipDay !== today) {
      const cost = CaveSys.rushCost(p);
      let go = p._autoRush === 'always';
      if (!go) {
        const c = await UI.popup({
          title: '一键行权 · 聚灵加速',
          html: `今日聚灵阵尚未点燃：燃 <b>${Utils.fmtNum(cost)}</b> 灵石，<b>点燃后 3 日内修炼效率 ×1.5</b>（下一轮修炼约 +${Utils.fmtNum(Math.round(Cultivate.baseGain(p) * 0.5))} 修为；若即将闭关，整轮闭关约 +${Utils.fmtNum(Math.round(Cultivate.baseGain(p) * 8))} 修为）。<br><span class="tip-line">选择「以后不再询问」后，一键行权将默认照常聚灵（灵石不足时自动跳过）；偏好随时可在设置中心修改。</span>`,
          options: [
            { text: `今日聚灵（-${Utils.fmtNum(cost)}）`, value: 'once', primary: true },
            { text: '以后都聚，不再询问', value: 'always' },
            { text: '今日跳过', value: 'skip', primary: false },
          ],
        });
        if (c === 'always') { p._autoRush = 'always'; go = true; }
        else if (c === 'once') go = true;
        else if (c === 'skip') { p._autoRushSkipDay = today; }   // v36（E205）：仅当日——undefined（ESC/遮罩）不落任何偏好，下一行权自然重问
      }
      if (go) {
        if (Bag.spendStones(cost)) {
          p.rushDay = today;
          Log.add(`聚灵阵轰然全开——3 日内修炼效率 ×1.5！（灵石 -${Utils.fmtNum(cost)}）`, 'system');
          done.push('聚灵加速');
        } else {
          Log.add('聚灵阵静默着——灵石不足，今日便不点了。', 'info');
        }
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
    // 3.5 v35（U3）：照料核心——浇水/抚兽/除虫（与洞府「一键照料」共用同一 helper）
    if (p.cave) {
      const { watered, patted, cured } = CaveSys.careCore(p);
      if (watered) done.push(`全田浇水 ×${watered}`);
      if (patted) done.push(`灵兽抚摸 ×${patted}`);
      if (cured) done.push(`除虫 ×${cured}`);
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
    // v38（E325）：行权扩容——调息 / 悟道 / 宗门听讲（安静三件，逐项自停）
    if (!p.dead && p._restDay !== today && !Battle.active) {
      try { Cultivate.rest(); if (p._restDay === today) done.push('打坐调息'); } catch (e) {}
    }
    if (!p.dead && (p._wuDaoDay || -1) !== today && (p.insight || 0) >= Cultivate.wuDaoCost(p) && !Battle.active) {
      try { await Cultivate.wuDao(); if (p._wuDaoDay === today) done.push('悟道炼作'); } catch (e) {}
    }
    if (!p.dead && p.sect && p.listenDay !== today && p.sect.contrib >= 300 && !Battle.active && Game.actions['act-sect-listen']) {
      try { await Game.actions['act-sect-listen']({}, null); if (p.listenDay === today) done.push('宗门听讲'); } catch (e) {}
    }
    if (!done.length) { UI.toast('今日诸事皆已办妥——安心修行便是'); return; }
    await UI.popup({
      title: '✦ 一键行权 · 小账',
      html: done.map(x => `<div class="tip-line">· ${x} ✓</div>`).join('')
        + '<div class="tip-line" style="margin-top:6px">· 各项收支明细见「游历记载」。</div>',
      options: [{ text: '收 下', value: true, primary: true }],
    });
    // v38（E325）：以武会友收尾——问剑优先，次切磋好感最高者（开战即止，战报自见）
    if (!p.dead && !Battle.active && !Story.active && !UI._popupResolve) {
      try {
        if ((p._wenjianDay || -1) !== today && typeof RankSys !== 'undefined' && RankSys.board) {
          const rk = RankSys.board(p);
          const myIdx = rk.findIndex(r => r.id === 'me');
          if (myIdx > 0) {
            const ahead = rk[myIdx - 1];
            const stA = ahead && p.npcs[ahead.id];
            if (stA && stA.alive && !NpcSys.isAway(p, ahead.id)) { await RankSys.challengeAhead(); return; }
          }
        }
      } catch (e) {}
      try {
        if ((p._sparCount || 0) < 3) {
          const cand = Object.entries(p.npcs || {})
            .filter(([id, s]) => s && s.alive && s.met && s.rel >= 8 && s.sparDay !== today && !(typeof NpcSys !== 'undefined' && NpcSys.isAway && NpcSys.isAway(p, id)))
            .sort((a, b) => b[1].rel - a[1].rel)[0];
          if (cand) { await NpcSys.spar(cand[0]); return; }
        }
      } catch (e) {}
    }
    Game.afterAction();
  },
};
