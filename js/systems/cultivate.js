
/* ======================================================================
 * §8 修炼系统（普通修炼 / 调息 / 闭关 / 突破 / 飞升）
 * ====================================================================== */
const Cultivate = {
  /** 一次普通修炼的基础修为（3 日）；邪修吞噬灵气，效率+80%；悟性取有效值（转世/讲道加成） */
  baseGain(p) {
    let g = (12 + Stat.compOf(p) * 2) * GameData.eco(p.realmIdx) * (1 + p.layer * 0.15);
    if (typeof SectSys !== 'undefined' && SectSys.commandActive && SectSys.commandActive(p, 'teach')) g *= 1.2;   // v19 长老令·传功
    if (p.dao === 'demonic') g *= 1.8;
    if (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 3) g *= 1.2;   // v10 魔道六境·化功境
    if (p.dao === 'array' && DaoSys.tierLevel(p) >= 2) g *= 1.1;   // v10 阵道六境·聚灵境
    if (typeof Art !== 'undefined' && Art.seasonOf(p) === 0) g *= 1.1;   // v20 孟春灵潮：修炼 +10%
    if (typeof WorldSys !== 'undefined' && WorldSys.lingchaoActive && WorldSys.lingchaoActive(p)) g *= 1.2;   // v20 天下大事·灵潮
    if (p.rushDay === Math.floor(p.day || 0)) g *= 1.5;   // v20 聚灵加速
    return g;
  },
  /** v20 聚灵加速：当日 ×1.5（洞府点燃，日限一次） */
  rushMul(p) { return (p.rushDay === Math.floor(p.day || 0)) ? 1.5 : 1; },
  /** v20 闭关效率：隆冬蛰伏 +10% */
  secludeMul(p) { return (typeof Art !== 'undefined' && Art.seasonOf(p) === 3) ? 1.1 : 1; },
  gainMult() {
    return (1 + Stat.compute(Game.player).cultPct / 100) * Utils.randF(0.9, 1.15);
  },
  /** 增加修为并处理境界内进层；返回是否发生过进层 */
  addExp(p, amount, silent = false) {
    let leveled = false;
    p.exp += amount;
    SectSys.onCultivate(amount);
    while (p.layer < 3) {
      const need = GameData.layerNeed(p.realmIdx, p.layer);
      if (p.exp < need) break;
      p.exp -= need;
      p.layer++;
      leveled = true;
      if (!silent) {
        Log.add(`水到渠成！你的修为迈入 <b>${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}</b>！`, 'realm');
        UI.announce(`突 境 · ${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}`, 'gold');   // v4
      }
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
    }
    if (p.layer === 3) {
      const need = GameData.layerNeed(p.realmIdx, 3);
      // v18：溢出修为保留，突破后自动计入
      if (p.exp > need) {
        p.expOverflow = (p.expOverflow || 0) + (p.exp - need);
        p.exp = need;
      }
    }
    return leveled;
  },
  normal() {
    const p = Game.player;
    let gain = Math.round(this.baseGain(p) * this.gainMult());
    let evNote = '';
    // v8 灵机事件（v19 扩池）：基础四类 + 六道职业特化 + 境界异象，按身份动态构建（8% 触发）
    if (Utils.chance(8)) {
      const pool = { surge: 35, epiphany: 25, heartDemon: 25, glean: 15 };
      const daoEv = { sword: 'jianMeng', pill: 'danXiang', talisman: 'fuGuang', body: 'tiWu', array: 'zhenXian', demonic: 'xueYong' };
      if (p.dao && daoEv[p.dao]) pool[daoEv[p.dao]] = 18;   // 职业特化
      if (p.realmIdx >= 1) pool.lingZhu = 10;               // 筑基起：灵露洗尘
      if (p.realmIdx >= 3) pool.shenYou = 12;               // 元婴起：神游太虚
      const kind = Utils.pickWeighted(pool);
      if (kind === 'surge') {
        gain = Math.round(gain * 2.5);
        Log.add('【灵机】行功之际，灵气忽如潮涌而来，天地之力尽数灌入丹田！', 'realm');
        evNote = '（灵气潮涌 · 修为 ×2.5）';
      } else if (kind === 'epiphany') {
        gain = Math.round(gain * 1.5);
        p.insight = Math.min(100, p.insight + 3);
        Log.add('【灵机】吐纳之间忽有所悟，此番修行事半功倍。（突破感悟 +3）', 'gain');
        evNote = '（醍醐灌顶 · 修为 ×1.5）';
      } else if (kind === 'heartDemon') {
        gain = Math.max(1, Math.round(gain * 0.55));
        p.insight = Math.min(100, p.insight + 6);
        Log.add('【心魔】识海中魔音滋扰，你苦守灵台方寸——虽折了些修为，道心却愈发澄明。（突破感悟 +6）', 'warn');
        evNote = '（心魔滋扰 · 修为折损）';
      } else if (kind === 'glean') {
        const stones = Math.round(Utils.rand(12, 24) * GameData.stoneEco(p.realmIdx));
        Bag.addStones(stones);
        Log.add(`【拾遗】收功之时袖中沙沙作响——竟是行功震落的灵石碎屑。灵石 +${Utils.fmtNum(stones)}。`, 'gain');
      } else if (kind === 'jianMeng') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】梦中有人仗剑而歌，醒来指间犹有剑意流转。', 'gain');
        evNote = '（剑鸣入梦 · 剑意 +15）';
      } else if (kind === 'danXiang') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】行功之际，鼻端忽过一缕异香，丹火自燃三分。', 'gain');
        evNote = '（丹香引火 · 丹火 +15）';
      } else if (kind === 'fuGuang') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】指尖无意识勾画，醒来满纸符纹自成篇章。', 'gain');
        evNote = '（符光乍现 · 符道 +15）';
      } else if (kind === 'tiWu') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】一夜酣眠，筋骨自行开阖吐纳——肉身自有真意。', 'gain');
        evNote = '（体悟玄机 · 体魄 +15）';
      } else if (kind === 'zhenXian') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】低首见石纹纵横，竟是半幅天然阵图。', 'gain');
        evNote = '（阵纹显化 · 阵道 +15）';
      } else if (kind === 'xueYong') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】血气翻涌如潮，你顺势引而不发——煞意淬入经脉。', 'gain');
        evNote = '（血气翻涌 · 魔性 +15）';
      } else if (kind === 'lingZhu') {
        p.mp = Stat.compute(p).maxMp;
        p.poison = Math.max(0, p.poison - 5);
        Log.add('【灵机】草木灵露凝于窗棂，你掬而洗尘——灵力充盈，丹毒稍解。（灵力全满，丹毒 -5）', 'gain');
        evNote = '（灵露洗尘）';
      } else if (kind === 'shenYou') {
        gain = Math.round(gain * 1.8);
        p.insight = Math.min(100, (p.insight || 0) + 2);
        Log.add('【灵机】神识离体，遨游星海一瞬——归来时天地都已换了一副面目。（修为 ×1.8，感悟 +2）', 'realm');
        evNote = '（神游太虚 · 修为 ×1.8）';
      }
    }
    this.addExp(p, gain);
    Time.add(3);
    if (p.dead) return;
    if (p.dao === 'array') DaoSys.gain(p, 1);   // v16 阵道：聚灵
    if (p.dao === 'demonic') DaoSys.gain(p, 2);   // v16 魔性：化功
    p.hp = Math.min(Stat.compute(p).maxHp, Math.round(p.hp + Stat.compute(p).maxHp * 0.08));
    Log.add(`${Utils.pick(GameData.FLAVOR.cultivate)}（修为 <b>+${Utils.fmtNum(gain)}</b>）${evNote}`, 'info');
    Game.afterAction();
  },
  rest() {
    const p = Game.player;
    const st = Stat.compute(p);
    p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * 0.5));
    p.mp = Math.min(st.maxMp, p.mp + Math.round(st.maxMp * 0.5));
    // v10 境界特性 · 胎息（练气）：调息时气机自转，额外化解丹毒
    const detox = p.realmIdx >= 0 ? 5 : 0;
    if (detox) p.poison = Math.max(0, p.poison - detox);
    Time.add(1);
    if (p.dead) return;
    if (p.dao === 'body') DaoSys.gain(p, 10);   // v16 体魄：吐纳炼体
    Log.add(`你寻一处灵气充裕之地打坐调息，气血灵力恢复大半${detox ? `，气机流转间化解了 ${detox} 点丹毒` : ''}。`, 'gain');
    Game.afterAction();
  },
  secludeCost(p) { return Math.round(30 * GameData.stoneEco(p.realmIdx)); },
  async seclude() {
    const p = Game.player;
    const cost = this.secludeCost(p);
    const ok = await UI.popup({
      title: '闭关修炼',
      html: `闭关三十日，心无旁骛，修行效率远胜平日。<br>
        预计可得修为 <span class="hl">≈${Utils.fmtNum(Math.round(this.baseGain(p) * 10 * 1.6))}</span>（视悟性略有浮动）。<br>
        需支付洞府灵石开销 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石／轮。<br>
        <span class="neg">若修为已至圆满，闭关中会自行冲关。</span>
        <label class="opt-line"><input type="checkbox" id="seclude-until-level">
          连续闭关 · 至下一小境界自动出关</label>`,
      options: [
        { text: '闭 关', value: true, primary: true },
        { text: '再想想', value: false },
      ],
    });
    if (!ok) return;
    // v4：勾选后进入连续闭关，进阶即止；未勾选保持原有单轮闭关
    const cb = document.getElementById('seclude-until-level');
    if (cb && cb.checked) { await this.secludeLoop(); return; }
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足，付不起洞府开销'); return; }
    const gain = Math.round(this.baseGain(p) * 10 * 1.6 * this.gainMult() * this.secludeMul(p));   // v20 隆冬蛰伏
    if (p.dao === 'array') DaoSys.gain(p, 10);   // v16 阵道：聚灵
    if (p.dao === 'demonic') DaoSys.gain(p, 20);   // v16 魔性：化功
    Log.add(`${Utils.pick(GameData.FLAVOR.seclude)}（修为 <b>+${Utils.fmtNum(gain)}</b>，丹毒稍减）`, 'info');
    this.addExp(p, gain);
    p.poison = Math.max(0, p.poison - 12);
    Time.add(30);
    if (p.dead) return;
    if (p.layer === 3 && p.exp >= GameData.layerNeed(p.realmIdx, 3)) {
      await Utils.sleep(400);
      await this.breakthrough(10);
    }
    Game.afterAction();
  },
  /** v4：连续闭关——每轮三十日，修为迈进新的小境界（进层或大境界突破成功）即自动出关；
   *  灵石不济、寿元将尽或达成上限轮数时亦会中止。 */
  async secludeLoop() {
    let p = Game.player;
    Log.add('你拂尘入室，立誓非至进境，不出此关。', 'system');
    let rounds = 0;
    while (rounds++ < 120) {
      if (!p || p.dead || Game.player !== p) return;   // 兵解/回溯等更换玩家对象时，旧循环立即作废
      const beforeLayer = p.layer, beforeRealm = p.realmIdx;
      const cost = this.secludeCost(p);
      if (!Bag.spendStones(cost)) {
        UI.toast('灵石不济，闭关被迫中止');
        Log.add('洞府灵石开销难以为继，你只得提前出关。', 'warn');
        break;
      }
      const gain = Math.round(this.baseGain(p) * 10 * 1.6 * this.gainMult() * this.secludeMul(p));   // v20 隆冬蛰伏
      if (p.dao === 'array') DaoSys.gain(p, 10);   // v16 阵道：聚灵
      if (p.dao === 'demonic') DaoSys.gain(p, 20);   // v16 魔性：化功
      Log.add(`${Utils.pick(GameData.FLAVOR.seclude)}（第${rounds}轮 · 修为 <b>+${Utils.fmtNum(gain)}</b>，丹毒稍减）`, 'info');
      this.addExp(p, gain);
      p.poison = Math.max(0, p.poison - 12);
      Time.add(30);
      if (p.dead || Game.player !== p) return;
      Game.afterAction();
      // 圆满冲关（与单轮闭关同款逻辑）：天劫博弈中胜出即境界跃升
      if (p.layer === 3 && p.exp >= GameData.layerNeed(p.realmIdx, 3)) {
        await Utils.sleep(400);
        await this.breakthrough(10);
        if (!p || p.dead || Game.player !== p) return;
      }
      // 已至下一小境界 → 自动出关
      if (p.layer !== beforeLayer || p.realmIdx !== beforeRealm) {
        Log.add('修为已然进阶，你推门而出，只觉天地一新——此番闭关，功成。', 'system');
        UI.toast('闭关有成 · 已至新的小境界');
        break;
      }
      await Utils.sleep(120);   // 留出渲染与日志滚动的时间
    }
    Game.afterAction();
  },
  /** 突破成算（大境界渡劫基准）：感悟/悟性/气运/孽障/大道/根基/挫而愈坚 皆计入 */
  breakthroughChance(p, bonus = 0) {
    let chance = 40 + Stat.compOf(p) * 2 + p.insight + bonus;
    // v18 残玉共鸣九重 · 两世归一：两世道韵归一，突破成算 +3%
    if ((p.jade || 0) >= 9) chance += 3;
    chance += (p.fortune || 0) * 0.2;   // 气运：每10点 +2%
    chance -= (p.karma || 0) * 0.2;     // 孽障：每10点 -2%
    chance += Math.min(15, (p.breakStreak || 0) * 5);   // v8 挫而愈坚：连败保底，每次失利 +5%（上限 +15%）
    if (p.realmIdx >= 8) chance += 8;   // v10 境界特性 · 劫体（渡劫）：半身已在雷海
    if (p.dao === 'sword') chance *= 0.77;  // 剑心桀骜：渡劫难度+30%
    if (p.dao === 'body') chance *= 1.4;    // 金刚不坏：渡劫成算+40%
    if (p.rootDeep) chance *= 1.1;          // 根基深厚：历劫难度-10%
    if (p.rootWeak) chance *= 0.85;         // 根基虚浮：历劫难度+15%
    return Utils.clamp(chance, 5, 95);
  },
  /** 大境界突破：练气→筑基为静修冲关（无天劫）；金丹劫起进入天劫三策博弈（小境界进层仍在 addExp 中自动结算） */
  async breakthrough(bonus = 0) {
    const p = Game.player;
    if (p.layer !== 3 || p.exp < GameData.layerNeed(p.realmIdx, 3)) return;
    if (p.realmIdx >= 9) return;
    if (p.realmIdx + 1 < GameData.TRIB_START) {
      await this.quietBreakthrough(bonus);
      return;
    }
    await Tribulation.run(bonus);
  },

  /** v9 筑基瓶颈：练气圆满冲筑基，水到渠成的静修冲关——无天劫，成算另 +15%，
   *  失利同样保留修为与感悟，并计入挫而愈坚。 */
  async quietBreakthrough(bonus = 0) {
    const p = Game.player;
    const chance = Utils.clamp(this.breakthroughChance(p, bonus + 15), 5, 95);
    Log.add('你收敛心神，向 <b>筑基</b> 瓶颈发起最后的冲击——气海翻涌，道基将成！', 'system');
    await Utils.sleep(700);
    if (Utils.chance(chance)) {
      p.realmIdx = 1; p.layer = 0; p.exp = Math.min(Math.floor((p.expOverflow || 0) / 2), GameData.layerNeed(1, 0) - 1); p.insight = 0; p.expOverflow = 0;
      p.breakStreak = 0;
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      NpcSys.onPlayerRealmUp(p);
      const tsLine = Narrative.tribSuccess();
      if (tsLine) Log.add(tsLine, 'realm');
      UI.realmShow(GameData.REALM_ASCEND_TEXT[1] || '道基初成，气象一新。', GameData.REALM_AURA[1]);
      Ambience.sfx('breakthrough');
      Log.add(`${Utils.pick(GameData.FLAVOR.breakSuccess)}`, 'realm');
      Log.add(`恭喜！你静修冲关功成，晋入 <b>筑基</b> 期——从此踏入修士之列！寿元上限提升至 ${st.lifespan} 岁。`, 'realm');
      const gr = NpcSys.realmGreeting(p);   // v19 突破贺语
      if (gr) { Log.add(`${gr.name}（${gr.title}）登门道贺——${gr.line}`, 'event'); Story.chron(`${gr.name} 登门道贺，贺你晋入筑基期`); }
      Guide.realmTip(p);   // v19 分阶段教学
      UI.announce('筑基功成 · 步入修士之列', 'gold');
      UI.toast('筑基成功！');
    } else {
      const aid = NpcSys.tryAid(p, 'trib');
      let insGain;
      if (aid) {
        p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * 0.8);
        insGain = 10;
        p.insight = Math.min(100, p.insight + insGain);
        Log.add(`危难之际，<b>${aid.name}</b> 从旁点拨，你稳住气机——冲击虽败，根基无损！`, 'gain');
      } else {
        p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * 0.6);
        insGain = 15;
        p.insight = Math.min(100, p.insight + insGain);
      }
      p.breakStreak = (p.breakStreak || 0) + 1;
      const streakBonus = Math.min(15, p.breakStreak * 5);
      UI.realmShow(Utils.pick(GameData.REALM_FAIL_TEXT), '#d05b5b');
      Log.add(`${Utils.pick(GameData.FLAVOR.breakFail)}（突破感悟 +${insGain}，修为有所损耗）`, 'loss');
      UI.announce('冲 关 未 破', 'bad');
      if (p.breakStreak >= 2) Log.add(`【挫而愈坚】你已连败 ${p.breakStreak} 次——下次冲关成算 +${streakBonus}%！`, 'gain');
    }
    p.pendingDao = true;   // 初入筑基叩问大道（失败则待来日功成再启）
    Game.afterAction();
  },
  /** 真仙圆满 → 渡劫飞升（通关仪式） */
  async ascend() {
    const p = Game.player;
    if (p.realmIdx !== 9 || p.layer !== 3 || p.flags.ascended) return;
    const ok = await UI.popup({
      title: '渡劫飞升',
      html: '九霄雷云汇聚，仙门已现。<br>你修为已至真仙圆满，只差最后一步——<br><span class="hl">引动天劫，白日飞升，位列仙班！</span><br><br>此去灵界，人界之事再与你无碍。',
      options: [
        { text: '引动天劫！', value: true, primary: true },
        { text: '再等等', value: false },
      ],
    });
    if (!ok) return;
    Log.add('你一步踏空，直上九霄！九重雷劫轰然而落，你于雷海之中放声长啸——', 'realm');
    await Utils.sleep(700);
    Log.add('雷劫散尽，霞光万道。你身披仙光，回望人界一眼，翩然登仙。', 'realm');
    await Utils.sleep(500);
    p.flags.ascended = true;
    UI.realmShow('霞举飞升，肉身成圣——凡人之躯，终成不朽。', GameData.REALM_AURA[9]);   // v5
    UI.announce('✦ 白日飞升 · 位列仙班 ✦', 'gold');   // v4
    Ambience.sfx('breakthrough');
    Bag.addItem('z_taiji', 1);
    Bag.addStones(Math.round(5000 * GameData.stoneEco(9)));
    Log.add('天道降下仙缘：获赠【太极玉】与巨额灵石！你已飞升证道，仍可留在人界继续游历。', 'gain');
    await UI.popup({
      title: '✦ 位列仙班 ✦',
      html: `恭喜道友 <span class="hl">${Utils.esc(p.name)}</span> 白日飞升，证道成仙！<br><br>凡人之躯，逆天而行，此为大道之始。<br><br>你也可以选择<b>兵解转世</b>，携带仙缘重开一世。`,
      options: [{ text: '继续游历', value: 'stay', primary: true }, { text: '兵解转世', value: 'reinc' }],
    }).then(choice => {
      if (choice === 'reinc') {
        p.canReincarnate = true;
        Log.add('你于仙门之前驻足回望，选择兵解转世——携一缕仙缘，重入轮回。', 'system');
        UI.toast('兵解转世之机已现（修炼页可用）');
      }
    });
    Game.afterAction();
  },
};
