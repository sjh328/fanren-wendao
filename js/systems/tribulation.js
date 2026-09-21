
/* ======================================================================
 * §22 天劫渡劫 Tribulation（大境界突破三策博弈，替换原概率判定）
 * ====================================================================== */
const Tribulation = {
  state: null,
  /** 天劫威力：100 为基准，随目标境界每阶 +10，孽障推高、气运削减 */
  power(p, target = 2) { return Math.max(50, 100 + (target || 2) * 10 + (p.karma || 0) * 2.5 - (p.fortune || 0) * 2); },
  /** 境界劫难系数：目标境界越高，成算折损越重（金丹劫 −7% …… 真仙劫 −31.5%，下限 −50%） */
  realmPenalty(target) { return Utils.clamp(1 - (target || 2) * 0.035, 0.5, 1); },
  /** 护身法宝所需品级 ≈ 目标境界（筑基用灵级护心镜、金丹用玄级玄龟甲、元婴起用地级龙鳞宝甲） */
  artifactGrade(targetRealm) { return Utils.clamp(targetRealm, 1, 3); },
  /** v29 修瑕：品级放宽为「不低于所需」——天级/仙级护甲此前反而无资格挡劫；脏档失效装备 id 判空防炸 */
  findArtifact(p, grade) {
    for (const id of Object.keys(p.bag)) {
      const d = GameData.ITEMS[id];
      if (d && d.type === 'artifact' && d.slot === 'armor' && (d.grade || 0) >= grade) return { from: 'bag', id };
    }
    const eq = p.equipped.armor;
    const eqId = eq ? Utils.eqId(eq) : null;
    const eqDef = eqId ? GameData.ITEMS[eqId] : null;
    if (eqDef && eqDef.type === 'artifact' && (eqDef.grade || 0) >= grade) return { from: 'equipped', id: eqId };
    return null;
  },
  chances() {
    const S = this.state;
    const realmPenalty = this.realmPenalty(S.target);                 // 境界愈高，天劫愈凶
    const mult = Utils.clamp(1 - (S.power - 100) / 500, 0.35, 1.1) * realmPenalty;
    return {
      endure: Utils.clamp(S.base * 0.82 * mult, 3, 97),    // 硬抗：最低，成则根基深厚厚赐
      artifact: Utils.clamp(S.base * 1.3 * mult, 3, 97),   // 法宝挡劫：最高
      hide: Utils.clamp(S.base * 1.0 * mult, 3, 97),       // 借地躲劫：居中
    };
  },
  async run(bonus = 0, opts = {}) {
    const p = Game.player;
    const target = p.realmIdx + 1;
    // v30 护栏：天劫进行中拒绝重入——闭关循环曾可在劫弹窗未决时反复调 run（连环吞渡劫丹/覆写回溯备份）
    if (this.state) return;
    Save.write('bak', Game.player);   // v6：冲关之前，自动备份至临时槽位，失利可回溯
    // v34（E118）：本次渡劫燃耗台账——原回溯把渡劫丹/借运/法宝一并从 bak 还原，SL 零成本
    //（唯一代价 +8 孽障 ≈ 劫威 +20 ≈ 成算 −3%，理性玩家必然败了就回）。台账在回溯后重扣，损耗不归。
    this._attemptSpend = { dan: false, borrow: null, artifact: null };
    // v29 天年：渡劫丹——药力应劫而化，成算 +5（一丹一劫）
    p.flags = p.flags || {};
    let dujieBonus = 0;
    if ((p.flags.dujieDan || 0) > 0) {
      p.flags.dujieDan--;
      dujieBonus = 5;
      this._attemptSpend.dan = true;
      Log.add('识海中渡劫丹的药力轰然化开，道基如蒙金光（成算 +5）。', 'gain');
    }
    // v31 仙劫：opts.xian——XianSys 阶满引动，成算沿用同一张三策表，成败分支各走仙阶口径
    const xian = !!opts.xian;
    const effTarget = xian ? 9 + (opts.xianTo || 10) : target;   // 仙劫劫威续推（地仙晋阶 ≈ 渡劫之后又两级）
    this.state = {
      target,
      xian,
      xianTo: opts.xianTo || 0,
      xianYuanAtStart: xian ? (p.counters.xianyuan || 0) : 0,   // 仙劫失利折仙元三成的基准
      base: Cultivate.breakthroughChance(p, bonus + dujieBonus),
      power: this.power(p, effTarget),
      artifact: this.findArtifact(p, xian ? 4 : this.artifactGrade(target)),
      busy: false, logs: [],
    };
    Log.add(xian
      ? `你收敛仙光，向 <b>${(GameData.XIAN_TIERS[(opts.xianTo || 2) - 1] || {}).name || '下一阶'}</b> 发起冲击——刹那间天外劫云翻卷，<b>仙劫</b>降临了！`
      : `你收敛心神，向 <b>${GameData.REALM_NAMES[target]}</b> 境发起最后的冲击——刹那间天地变色，九霄雷云翻涌，<b>天劫</b>降临了！`, 'system');
    document.getElementById('tribulation-modal').classList.remove('hidden');
    this.render();
  },
  /** v30 借天运：渡劫前燃 20 气运换三策各 +5 成算（每劫限一次）——气运自此有了正经消费端
   *  v32（D6）：仙劫改燃仙元 50——仙籍之身气运已淡，天外之劫以仙元借力 */
  borrow() {
    const S = this.state;
    const p = Game.player;
    if (!S || S.busy || S._borrowed) return;
    if (S.xian) {
      if ((p.counters.xianyuan || 0) < 50) { UI.toast('仙元不足 50，天时不予'); return; }
      p.counters.xianyuan -= 50;
      S._borrowed = true;
      S.base += 5;
      if (this._attemptSpend) this._attemptSpend.borrow = { xian: true, amt: 50 };
      this.log('你燃五十仙元，向天外借得一线时来运转——三策成算各 +5。', 'log-system');
    } else {
      if ((p.fortune || 0) < 20) { UI.toast('气运不足 20，天时不予'); return; }
      p.fortune -= 20;
      S._borrowed = true;
      S.base += 5;
      if (this._attemptSpend) this._attemptSpend.borrow = { xian: false, amt: 20 };
      this.log('你燃二十年气运，向天借得一线时来运转——三策成算各 +5。', 'log-system');
    }
    this.render();
  },
  log(html, cls = 'log-warn') {
    if (this.state) this.state.logs.push({ html, cls });
    const box = document.getElementById('trib-log');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'log-entry ' + cls;
    div.innerHTML = html;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },
  render() {
    const S = this.state;
    if (!S) return;
    const p = Game.player;
    const c = this.chances();
    const art = S.artifact ? GameData.ITEMS[S.artifact.id] : null;
    const gradeName = S.xian ? GameData.GRADE_NAMES[4] : GameData.GRADE_NAMES[this.artifactGrade(S.target)];
    const title = S.xian ? '— 仙 劫 将 至 —' : '— 天 劫 将 至 —';
    document.getElementById('trib-box').innerHTML = `
      <div class="battle-head" style="color:var(--gold)">${title}</div>
      <div class="card-desc" style="margin-bottom:8px">劫云压顶，${S.xian ? '仙威' : '劫威'}如狱。当前劫威 <b class="hl">${S.power.toFixed(0)}</b>
      （气运 ${p.fortune || 0} 削之，孽障 ${p.karma || 0} 长之）。<br>三策在手，生死自择——</div>
      <div class="trib-opts">
        <button class="btn trib-opt" data-action="trib-strategy" data-strategy="endure" ${S.busy ? 'disabled' : ''}>
          <span class="trib-name">硬抗天劫</span>
          <span class="trib-chance">成算 ${c.endure.toFixed(0)}%</span>
          <span class="trib-note">成功率最低 · 成则雷火淬体，得永久厚赐【根基深厚】：全属性 +20%，此后历劫难度皆降一成</span>
        </button>
        <button class="btn trib-opt" data-action="trib-borrow" ${(S.busy || S._borrowed || (S.xian ? (p.counters.xianyuan || 0) < 50 : (Game.player.fortune || 0) < 20)) ? 'disabled' : ''} title="${S.xian ? '燃 50 仙元' : '燃 20 点气运'}，三策成算各 +5（每劫限一次）">
          <span class="trib-name">燃运借力${S._borrowed ? ' · 已借' : ''}</span>
          <span class="trib-chance">${S._borrowed ? '已成' : (S.xian ? '仙元 -50' : '气运 -20')}</span>
          <span class="trib-note">${S.xian ? '以仙元借天外之时——三策成算各 +5。' : '以气运借天时——三策成算各 +5。天道姻缘，用一分少一分。'}</span>
        </button>
        <button class="btn trib-opt" data-action="trib-strategy" data-strategy="artifact" ${S.busy || !art ? 'disabled' : ''}>
          <span class="trib-name">法宝挡劫</span>
          <span class="trib-chance">成算 ${c.artifact.toFixed(0)}%</span>
          <span class="trib-note">${art ? `耗去一件【${art.name}】` : `需一件${gradeName}护身法宝（防具）`} · 成则身负【根基虚浮】：此后历劫难度皆增一成五</span>
        </button>
        <button class="btn trib-opt" data-action="trib-strategy" data-strategy="hide" ${S.busy ? 'disabled' : ''}>
          <span class="trib-name">借地躲劫</span>
          <span class="trib-chance">成算 ${c.hide.toFixed(0)}%</span>
          <span class="trib-note">成功率居中 · 成亦无得，欺天而过，孽障 +10</span>
        </button>
      </div>
      <div id="trib-log" class="trib-log"></div>`;
    const logBox = document.getElementById('trib-log');
    if (logBox) {
      for (const { html, cls } of S.logs) {
        const div = document.createElement('div');
        div.className = 'log-entry ' + cls;
        div.innerHTML = html;
        logBox.appendChild(div);
      }
      logBox.scrollTop = logBox.scrollHeight;
    }
  },
  async choose(strategy) {
    const S = this.state;
    const p = Game.player;
    if (!S || S.busy || p.dead) return;
    S.busy = true;
    const c = this.chances();
    const chance = c[strategy];
    this.render();
    // 法宝挡劫：先耗去护身法宝
    if (strategy === 'artifact') {
      if (!S.artifact) { S.busy = false; this.render(); return; }
      const art = GameData.ITEMS[S.artifact.id];
      if (S.artifact.from === 'bag') Bag.removeItem(S.artifact.id, 1);
      else p.equipped.armor = null;
      if (this._attemptSpend) this._attemptSpend.artifact = { ...S.artifact };
      Log.add(`你祭出 <b>${art.name}</b>，宝光冲霄，替你硬撼天雷！`, 'info');
    }
    const names = { endure: '以肉身硬抗天劫', artifact: '以法宝抵挡天劫', hide: '遁入地脉借地躲劫' };
    this.log(`你横下心来——${names[strategy]}！`, 'log-system');
    await Utils.sleep(700);
    // 天劫异象（心魔之权重随孽障增长）
    const phen = Utils.pickWeighted({
      ziqi: 25,
      xinmo: 15 + (p.karma || 0) * 0.5,
      xiangrui: 15,
      fanjie: 15 + ((p.karma || 0) >= 50 ? 10 : 0),
    });
    if (phen === 'ziqi') {
      p.fortune = (p.fortune || 0) + 20;
      this.log('东方紫气三万里，浩浩荡荡贯体而入——【紫气东来】！气运 +20。', 'log-gain');
    } else if (phen === 'xinmo') {
      p.karma = (p.karma || 0) + 15;
      this.log('心湖之中魔影森然，呢喃如潮——【心魔入侵】！孽障 +15。', 'log-loss');
    } else if (phen === 'xiangrui') {
      const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 2, 1, 4);
      const mat = Utils.pick(GameData.matsByTier(tier));
      Bag.addItem(mat, 1);
      this.log(`劫云缝隙间霞光垂落——【天降祥瑞】！得 ${GameData.ITEMS[mat].name} ×1。`, 'log-gain');
    } else {
      const lost = Math.round(p.exp * 0.1);
      p.exp = Math.max(0, p.exp - lost);
      this.log(`一道逆雷没入丹田——【天道反噬】！修为 -${Utils.fmtNum(lost)}。`, 'log-loss');
    }
    await Utils.sleep(800);
    // 渡劫结果
    if (Utils.chance(chance)) {
      // v31 仙劫：成败各走仙阶口径——晋仙阶、仙体回满，不落 realmIdx
      if (S.xian) {
        p.breakStreak = 0;
        // v32 修瑕（E31）：仙劫成功分支补齐天劫同款副作用——无伤成就判定 + 全屏异象（opts.xian 此前未复用全量）
        if (p.hp >= Stat.compute(p).maxHp * 0.999) { p.flags = p.flags || {}; p.flags.tribFullHp = true; }
        const st2 = Stat.compute(p);
        p.hp = st2.maxHp; p.mp = st2.maxMp;
        this.log('仙劫散去，霞光满身——你于云端之上缓缓睁眼——成了！', 'log-realm');
        UI.realmShow((GameData.XIAN_TIERS[S.xianTo - 1] || {}).ascendText || '仙劫散去，仙骨自成。', GameData.REALM_AURA[9] || '#e8e8e8');
        // v32（D6）：仙劫异象池——按三策授一道永久仙绩小词缀（雷池淬体/仙官观礼/仙障心魔试炼）
        const vision = (GameData.XIAN_VISIONS || []).find(v2 => v2.strategy === strategy);
        if (vision) {
          p.flags = p.flags || {};
          const already = !!p.flags[vision.flag];   // v33（E85）：词缀幂等但原重复播报「铭入仙骨」——已是永绩不再复播
          p.flags[vision.flag] = true;
          this.log(`【异象 · ${vision.name}】${vision.desc}`, 'log-gain');
          if (!already) Log.add(`仙劫异象铭入仙骨——【${vision.name}】成永绩。`, 'realm');
        }
        if (typeof XianSys !== 'undefined') XianSys.tribSuccess(p, S.xianTo, strategy);
        UI.toast(`仙劫功成！晋 ${GameData.XIAN_TIERS[S.xianTo - 1].name}`);
        await Utils.sleep(900);
        document.getElementById('tribulation-modal').classList.add('hidden');
        this.state = null;
        Game.afterAction();
        return;
      }
      if (p.hp >= Stat.compute(p).maxHp * 0.999) { p.flags = p.flags || {}; p.flags.tribFullHp = true; }   // v20 无伤渡劫成就（判定须在回血前，且先于 st 声明避免 TDZ）
      p.realmIdx++; p.layer = 0; p.exp = Math.min(Math.floor((p.expOverflow || 0) / 2), GameData.layerNeed(p.realmIdx, 0) - 1); p.insight = 0; p.insightSrc = []; p.expOverflow = 0;   // v37（E264）：感悟清零时来源 FIFO 池同步清空（双池一致）
      p.breakStreak = 0;   // v8 挫而愈坚：成功即清零
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      NpcSys.onPlayerRealmUp(p); // §24 灵气潮汐：大境界突破，常驻修士亦随之一进
      const tsLine = Narrative.tribSuccess();   // v5：道途突破句
      if (tsLine) this.log(tsLine, 'log-realm');
      this.log('雷劫散尽，你于焦土之上缓缓睁眼——成了！', 'log-realm');
      UI.realmShow(GameData.REALM_ASCEND_TEXT[p.realmIdx] || '道基蜕变，气象一新。', GameData.REALM_AURA[p.realmIdx] || '#e8e8e8');   // v5：全屏异象 + 境界描写渐显
      Ambience.sfx('breakthrough');
      Log.add(`${Utils.pick(GameData.FLAVOR.breakSuccess)}`, 'realm');
      Log.add(`恭喜！你渡劫功成，晋入 <b>${GameData.REALM_NAMES[p.realmIdx]}</b> 期！寿元上限提升至 ${st.lifespan} 岁。`, 'realm');
      Story.chron(`渡劫功成，晋入${GameData.REALM_NAMES[p.realmIdx]}期`);   // v19 年表
      const gr = NpcSys.realmGreeting(p);   // v19 突破贺语
      if (gr) { Log.add(`${gr.name}（${gr.title}）登门道贺——${gr.line}`, 'event'); Story.chron(`${gr.name} 登门道贺，贺你晋入${GameData.REALM_NAMES[p.realmIdx]}期`); }
      Guide.realmTip(p);   // v19 分阶段教学
      if (strategy === 'endure') {
        p.rootDeep = true; p.rootWeak = false;
        Log.add('雷火淬体，道基如金——得永久厚赐【根基深厚】：全属性 +20%，此后历劫难度皆降一成。', 'gain');
      } else if (strategy === 'artifact') {
        p.rootWeak = true; p.rootDeep = false;
        Log.add('借宝渡劫，终究隔了一层——身负【根基虚浮】：此后历劫难度皆增一成五。', 'warn');
      } else {
        p.karma = (p.karma || 0) + 10;
        Log.add('你遁地避雷，欺天而过——因果自负，孽障 +10。', 'warn');
      }
      UI.announce(`渡劫功成 · 晋入${GameData.REALM_NAMES[p.realmIdx]}期`, 'gold');   // v4
      UI.toast(`渡劫成功！${GameData.REALM_NAMES[p.realmIdx]}期`);
      // v35（E130）修瑕：成功分支原无 return，坠落至函数尾段的「失利专用」收尾——每次突破成功都折寿
      // 十年（与上方「寿元上限提升」播报自相矛盾）、道侣道贺说成「劫输了」、宿敌照常趁虚偷袭、
      // pendingDao 误置。收尾归位：成功自持收场，失利尾段只在 else 内走。
      await Utils.sleep(900);
      document.getElementById('tribulation-modal').classList.add('hidden');
      this.state = null;
      Game.afterAction();
      return;
    } else {
      if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 8, '渡劫失利');
      // §24 渡劫虚弱期：道侣/结拜概率护法
      const aid = NpcSys.tryAid(p, 'trib');
      // v10 境界特性 · 劫体（渡劫起）：失利保留九成修为
      // v31 修瑕（E17）：护法保留率单独计算——原三目在 realmIdx>=8 时劫体分量吞掉 aid 分量，
      // 高境护法反成负收益（修为同样多、感悟还少 5），与静修冲关版（aid 0.8/0.6）语义也不一致
      let keepPct;
      if (aid) keepPct = p.realmIdx >= 8 ? 0.95 : 0.8;
      else keepPct = p.realmIdx >= 8 ? 0.9 : 0.6;
      let insGain;
      if (aid) {
        if (!S.xian) p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * keepPct);
        insGain = 10;
        Cultivate.addInsight(p, insGain);
        this.log(`危难之际，<b>${aid.name}</b> 护法相助，为你护住道基！`, 'log-gain');
      } else {
        if (!S.xian) p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * keepPct);
        insGain = 15;
        Cultivate.addInsight(p, insGain);
      }
      // v31 仙劫失利：折仙元三成、不折寿——仙劫非天劫，雷火不蚀寿元，蚀的是仙家资粮
      if (S.xian) {
        const lost = Math.round((S.xianYuanAtStart || 0) * 0.3);
        p.counters.xianyuan = Math.max(0, (p.counters.xianyuan || 0) - lost);
        this.log(`仙元溃散三成（-${Utils.fmtNum(lost)}）——道行未损，来日再叩。`, 'log-loss');
      }
      // v8 挫而愈坚：连败保底，越挫越勇
      p.breakStreak = (p.breakStreak || 0) + 1;
      const streakBonus = Math.min(15, p.breakStreak * 5);
      if (p.breakStreak >= 2) this.log(`【挫而愈坚】你已连败 ${p.breakStreak} 次——道心反而愈发坚韧，下次成算 +${streakBonus}%！`, 'log-gain');
      // §26 大乘渡劫失败：窥得兵解转世之机
      if (S.target === 8 && !p.dead) {
        p.canReincarnate = true;
        this.log('大道崩殂，仙路断绝……然冥冥中你窥见一线生机：<b>兵解转世</b>之机（修炼页可用）。', 'log-warn');
      }
      this.log('雷光贯体，你喷血倒飞，勉强保住道基……', 'log-loss');
      const tfLine = Narrative.tribFail();   // v5：道途挫败句
      if (tfLine) this.log(tfLine, 'log-loss');
      UI.realmShow(Utils.pick(GameData.REALM_FAIL_TEXT), '#d05b5b');   // v5：失败亦有异象
      Log.add(`${Utils.pick(GameData.FLAVOR.breakFail)}（突破感悟 +${insGain}，修为有所损耗）`, 'loss');
      UI.announce('渡 劫 失 利 · 天 劫 未 过', 'bad');   // v4
      // v6：渡劫失利，可选择回溯到引动天劫之前
      const rollback = await UI.popup({
        title: '渡劫失利 · 回溯因果',
        html: `天劫未过，折损已定。<br>是否回溯因果，回到<b>引动天劫之前</b>的那一刻？<br><span class="neg">回溯后：修为境界尽数复原、天劫重新酝酿；但本次燃耗的渡劫丹、气运／仙元与护身法宝不归——天道无情，因果有价（孽障 +12）。</span>`,
        options: [{ text: '回溯因果', value: true, primary: true }, { text: '继续前行', value: false }],
      });
      if (rollback && Game.rollbackBackup()) {
        // v18：回溯因果须付出代价——孽障+8，防止无限SL
        // v34（E118）：本次渡劫燃耗不随 bak 复原——渡劫丹/借运/法宝回溯后重扣（台账重放），
        // 孽障代价 8→12；原回溯连消耗一并还原，败了就回溯成了零成本读档
        const p = Game.player;
        if (p) {
          p.karma = Math.min(100, (p.karma || 0) + 12);
          const spend = this._attemptSpend || {};
          const back = [];
          if (spend.dan && (p.flags.dujieDan || 0) > 0) { p.flags.dujieDan--; back.push('渡劫丹药力复又化去'); }
          if (spend.borrow) {
            if (spend.borrow.xian) p.counters.xianyuan = Math.max(0, (p.counters.xianyuan || 0) - spend.borrow.amt);
            else p.fortune = Math.max(0, (p.fortune || 0) - spend.borrow.amt);
            back.push(spend.borrow.xian ? '借来的仙元焚尽' : '借来的气运焚尽');
          }
          if (spend.artifact) {
            if (spend.artifact.from === 'bag') Bag.removeItem(spend.artifact.id, 1);
            else if (Utils.eqId(p.equipped.armor || {}) === spend.artifact.id) p.equipped.armor = null;
            back.push(`挡劫的${(GameData.ITEMS[spend.artifact.id] || {}).name || '法宝'}已随劫灰消散`);
          }
          Log.add(`因果逆转，孽障缠身（孽障 +12）。${back.length ? `——${back.join('、')}，燃耗不归。` : ''}`, 'loss');
        }
        this._attemptSpend = null;
        document.getElementById('tribulation-modal').classList.add('hidden');
        this.state = null;
        return;
      }
      // —— v35（E130）：以下「失利专用」收尾整段移入 else——原位于 if/else 之后，
      // 成功分支因无 return 坠落到此：折寿/道侣安慰/宿敌偷袭/叩问大道在突破成功时全部误发。
      // v29 天年：渡劫失利折寿十年（选择回溯者本次渡劫已尽数抹去，不折寿）
      if (!p.dead && !S.xian) Time.cutLife(p, 10, '天劫反噬');   // v31：仙劫失利折仙元不折寿
      // v30 补遗：道侣共渡天劫——失利之际道侣扶住你（心魔 -2，患难见真情）
      if (!p.dead && p.partner) {
        const ps = (typeof NpcSys !== 'undefined' && NpcSys.state) ? NpcSys.state(p, p.partner) : null;
        const pd = (typeof NpcSys !== 'undefined' && NpcSys.def) ? NpcSys.def(p.partner) : null;
        if (ps && ps.alive && pd) {
          ps.rel = Utils.clamp(ps.rel + 3, -100, 100);
          if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, -2, '道侣安慰');
          if (typeof NpcSys !== 'undefined' && NpcSys.mem) NpcSys.mem(p, p.partner, 'story', '共渡天劫');
          Log.add(`<b>${pd.name}</b> 顶着余雷冲上雷台扶住你：「劫输了，人还在——来日方长。」（交情 +3，心魔 -2）`, 'gain');
        }
      }
      // §24 渡劫虚弱期：宿敌趁火打劫
      let ambushNpc = null;
      if (!p.dead) {
        const ambId = NpcSys.tribAmbush(p);
        if (ambId) {
          const saved = p.partner && Utils.chance(55) ? p.partner
            : ((p.sworn || []).length && Utils.chance(40) ? p.sworn[0] : null);
          if (saved) {
            p.npcs[saved].rel = Utils.clamp(p.npcs[saved].rel + 5, -100, 100);
            this.log(`千钧一发之际，<b>${NpcSys.def(saved).name}</b> 自天外赶来，一剑逼退偷袭者！`, 'log-gain');
          } else {
            ambushNpc = ambId;
            this.log(`劫云未散，杀机已至——<b>${NpcSys.def(ambId).name}</b> 趁你渡劫虚弱，悍然出手偷袭！`, 'log-loss');
          }
          await Utils.sleep(700);
        }
      }
      await Utils.sleep(900);
      document.getElementById('tribulation-modal').classList.add('hidden');
      this.state = null;
      // v36（E201）：渡劫失利偷袭段对齐 dungeon E59 时序（E143 同族第 12 处）——原 pendingDao
      // 与 afterAction 先行、偷袭 400ms 后才开战：叩问弹窗与节庆在偷袭开打前弹出相撞，且
      // pendingDao 被 game.js 叩问闸门提前消费（下方注释自述「若遇偷袭则战后开启」零实现）。
      // 现开战在前、afterAction 在后：偷袭战 end() 收尾链自然承接节庆与叩问
      if (ambushNpc) {
        p.pendingDao = true;
        await Utils.sleep(400);
        Battle.start(null, { enemy: NpcSys.buildEnemy(p, ambushNpc), npcId: ambushNpc, mode: 'hunt', ambush: true, mapName: '渡劫之地' });
        Game.afterAction();
      } else {
        p.pendingDao = true;
        Game.afterAction();
      }
    }
  },
};
