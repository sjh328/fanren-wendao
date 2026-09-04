
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
  findArtifact(p, grade) {
    for (const id of Object.keys(p.bag)) {
      const d = GameData.ITEMS[id];
      if (d && d.type === 'artifact' && d.slot === 'armor' && d.grade === grade) return { from: 'bag', id };
    }
    const eq = p.equipped.armor;
    const eqId = eq ? Utils.eqId(eq) : null;
    if (eqId && GameData.ITEMS[eqId].grade === grade) return { from: 'equipped', id: eqId };
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
  async run(bonus = 0) {
    const p = Game.player;
    const target = p.realmIdx + 1;
    Save.write('bak', Game.player);   // v6：冲关之前，自动备份至临时槽位，失利可回溯
    this.state = {
      target,
      base: Cultivate.breakthroughChance(p, bonus),
      power: this.power(p, target),
      artifact: this.findArtifact(p, this.artifactGrade(target)),
      busy: false, logs: [],
    };
    Log.add(`你收敛心神，向 <b>${GameData.REALM_NAMES[target]}</b> 境发起最后的冲击——刹那间天地变色，九霄雷云翻涌，<b>天劫</b>降临了！`, 'system');
    document.getElementById('tribulation-modal').classList.remove('hidden');
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
    const gradeName = GameData.GRADE_NAMES[this.artifactGrade(S.target)];
    document.getElementById('trib-box').innerHTML = `
      <div class="battle-head" style="color:var(--gold)">— 天 劫 将 至 —</div>
      <div class="card-desc" style="margin-bottom:8px">雷云压顶，劫威如狱。当前天劫威力 <b class="hl">${S.power.toFixed(0)}</b>
      （气运 ${p.fortune || 0} 削之，孽障 ${p.karma || 0} 长之）。<br>三策在手，生死自择——</div>
      <div class="trib-opts">
        <button class="btn trib-opt" data-action="trib-strategy" data-strategy="endure" ${S.busy ? 'disabled' : ''}>
          <span class="trib-name">硬抗天劫</span>
          <span class="trib-chance">成算 ${c.endure.toFixed(0)}%</span>
          <span class="trib-note">成功率最低 · 成则雷火淬体，得永久厚赐【根基深厚】：全属性 +20%，此后历劫难度皆降一成</span>
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
      p.realmIdx++; p.layer = 0; p.exp = Math.min(Math.floor((p.expOverflow || 0) / 2), GameData.layerNeed(p.realmIdx, 0) - 1); p.insight = 0; p.expOverflow = 0;
      if (p.hp >= st.maxHp * 0.999) { p.flags = p.flags || {}; p.flags.tribFullHp = true; }   // v20 无伤渡劫成就
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
    } else {
      if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 8, '渡劫失利');
      // §24 渡劫虚弱期：道侣/结拜概率护法
      const aid = NpcSys.tryAid(p, 'trib');
      // v10 境界特性 · 劫体（渡劫起）：失利保留九成修为
      const keepPct = p.realmIdx >= 8 ? 0.9 : (aid ? 0.8 : 0.6);
      let insGain;
      if (aid) {
        p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * keepPct);
        insGain = 10;
        p.insight = Math.min(100, p.insight + insGain);
        this.log(`危难之际，<b>${aid.name}</b> 护法相助，为你护住道基！`, 'log-gain');
      } else {
        p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * keepPct);
        insGain = 15;
        p.insight = Math.min(100, p.insight + insGain);
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
        html: `天劫未过，折损已定。<br>是否回溯因果，回到<b>引动天劫之前</b>的那一刻？<br><span class="neg">回溯后：本次渡劫的机缘与损耗尽数抹去，天劫重新酝酿。</span>`,
        options: [{ text: '回溯因果', value: true, primary: true }, { text: '继续前行', value: false }],
      });
      if (rollback && Game.rollbackBackup()) {
        // v18：回溯因果须付出代价——孽障+8，防止无限SL
        const p = Game.player;
        if (p) { p.karma = Math.min(100, (p.karma || 0) + 8); Log.add('因果逆转，孽障缠身（孽障 +8）。', 'loss'); }
        document.getElementById('tribulation-modal').classList.add('hidden');
        this.state = null;
        return;
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
    p.pendingDao = true; // 初入筑基（或转世重修）叩问大道；若遇偷袭则战后开启
    Game.afterAction();
    if (ambushNpc) {
      await Utils.sleep(400);
      Battle.start(null, { enemy: NpcSys.buildEnemy(p, ambushNpc), npcId: ambushNpc, mode: 'hunt', ambush: true, mapName: '渡劫之地' });
    }
  },
};
