
/* ======================================================================
 * §27 v31「登仙」仙界四阶 XianSys（地仙 → 天仙 → 金仙 → 大罗）
 * 真仙圆满 → 白日飞升之后，修为溢流所炼的「仙元」（Cultivate.addExp 溢流单源）
 * 在此续行登仙之路：每阶三层以仙元晋；阶满引动「仙劫」（复用天劫三策表，
 * Tribulation 以 opts.xian 参数化）；大罗圆满证「道祖之境」。
 * 属性收益：每层全属性 +1.5%、修炼效率 +2%（Stat.compute 消费）；
 * 寿元：入阶续仙寿（GameData.XIAN_TIERS[].life）。
 * ====================================================================== */
const XianSys = {
  /** 仙阶数据（未入阶 idx=0） */
  tiers() { return GameData.XIAN_TIERS; },
  cur(p) { return (p.xianjie && p.xianjie.idx) || 0; },
  layer(p) { return (p.xianjie && p.xianjie.layer) || 0; },
  def(p) { return this.cur(p) === 0 ? null : (GameData.XIAN_TIERS[this.cur(p) - 1] || null); },   // v32 修瑕（E28）：idx=0 原错回地仙定义——advanceLayer 的 enterFirst 分支成死代码（无籍也可「晋层」的语义陷阱）
  yuan(p) { return (p.counters && p.counters.xianyuan) || 0; },
  /** 已晋层数（全属性/修炼效率消费）；v32 修瑕（E36）：未飞升而残留仙籍的脏档不再吃加成 */
  layersTotal(p) { return (this.unlocked(p) && this.cur(p) > 0) ? (this.cur(p) - 1) * 3 + this.layer(p) : 0; },
  /** 下一层所需仙元（阶内补层）；阶满返回 0 */
  nextNeed(p) {
    const d = this.def(p);
    if (!d || this.layer(p) >= 3) return 0;
    return d.layerNeed;
  },
  /** 是否开启（白日飞升之后） */
  unlocked(p) { return !!(p && p.flags && p.flags.ascended); },
  /** 大罗圆满（道祖之境） */
  isDaozu(p) { return this.cur(p) >= 4 && this.layer(p) >= 3; },

  /** 晋层：消耗仙元（阶内初/中/后期） */
  advanceLayer() {
    const p = Game.player;
    if (!this.unlocked(p)) return;
    if (this.isDaozu(p)) { UI.toast('道祖之境，仙途已极'); return; }
    const d = this.def(p);
    if (!d) {
      // 未入仙阶：初入地仙第一层（飞升后首次晋层）
      return this.enterFirst();
    }
    if (this.layer(p) >= 3) {
      // v32 修瑕（E29）：大罗圆满原仍提示「引动仙劫晋入下一阶」——其下再无阶，应指证道祖之境
      UI.toast(this.cur(p) >= 4 ? '大罗已圆满——可证道祖之境' : `${d.name}已圆满——引动仙劫方可晋入${(GameData.XIAN_TIERS[this.cur(p)] || {}).name || '下一阶'}`);
      return;
    }
    const need = d.layerNeed;
    if (this.yuan(p) < need) { UI.toast(`仙元不足（需 ${Utils.fmtNum(need)}）`); return; }
    p.counters.xianyuan -= need;
    p.xianjie.layer++;
    Log.add(`仙元入体，道行更进——你晋入 <b>${d.name}${GameData.XIAN_LAYER_NAMES[this.layer(p) - 1]}</b>！（全属性 +1.5%，修炼效率 +2%）`, 'realm');
    UI.announce(`✦ 仙阶晋升 · ${d.name}${GameData.XIAN_LAYER_NAMES[this.layer(p) - 1]}`, 'gold');
    Ambience.sfx('breakthrough');
    Game.afterAction();
  },
  /** 飞升后首次入仙阶（地仙初期） */
  enterFirst() {
    const p = Game.player;
    if (!p.xianjie) p.xianjie = { idx: 0, layer: 0 };
    p.xianjie.idx = 1;
    p.xianjie.layer = 0;
    const d = this.def(p);
    Log.add(`<b>仙籍落名</b>——你正式踏入 <b>${d.name}</b> 之列！${d.ascendText}`, 'realm');
    UI.announce('✦ 仙籍落名 · 地仙', 'gold');
    Ambience.sfx('breakthrough');
    Story.chron('仙籍落名，初入地仙');
    Game.afterAction();
  },
  /** 阶满引动仙劫（复用 Tribulation 三策，opts.xian 参数化）；大罗圆满则证道祖之境 */
  async trib() {
    const p = Game.player;
    if (!this.unlocked(p) || this.cur(p) === 0) return;
    const d = this.def(p);
    if (!d || this.layer(p) < 3) { UI.toast('仙阶未满三重，劫数未至'); return; }
    if (this.cur(p) >= 4) {
      // 大罗圆满：证道祖之境（一次性）
      if (p.flags.daozu) { UI.toast('道祖之境，仙途已极'); return; }
      const ok2 = await UI.popup({
        title: '证 道 祖 之 境',
        html: `大罗已圆满。再进一步，便是万道归一的<b>道祖之境</b>——此后仙途无劫，唯余逍遥。<br><span class="tip-line">· 证道获轮回印记 +1，并以此身名留轮回镜。</span>`,
        options: [{ text: '证 道', value: true, primary: true }, { text: '从容些再说', value: false }],
      });
      if (!ok2) return;
      this.daozuCheck(p);
      Game.afterAction();
      return;
    }
    const nx = GameData.XIAN_TIERS[this.cur(p)] || null;
    if (!nx) { UI.toast('道祖之境，仙途已极'); return; }
    const ok = await UI.popup({
      title: `仙 劫 · 晋 ${nx.name}`,
      html: `${d.name}已圆满。仙劫非天劫——劫云自天外而来，为试道行、亦为淬仙骨。<br>三策依旧：硬抗得厚赐、法宝挡劫、借地避劫。<br><span class="tip-line">· 仙劫失利折仙元三成，不折寿。</span>`,
      options: [
        { text: `引动仙劫，晋入${nx.name}`, value: true, primary: true },
        { text: '再修一修', value: false },
      ],
    });
    if (!ok) return;
    Tribulation.run(0, { xian: true, xianTo: this.cur(p) + 1 });
  },
  /** 仙劫功成（Tribulation.choose 成功分支回调） */
  tribSuccess(p, to, strategy) {
    if (!p.xianjie) p.xianjie = { idx: 0, layer: 0 };
    p.xianjie.idx = to;
    p.xianjie.layer = 0;
    const d = GameData.XIAN_TIERS[to - 1];
    if (strategy === 'endure') { p.rootDeep = true; p.rootWeak = false; }
    else if (strategy === 'artifact') { p.rootWeak = true; p.rootDeep = false; }
    else p.karma = (p.karma || 0) + 10;
    // 跨世仙籍（轮回镜展示）
    if (typeof ReincarnationSys !== 'undefined') {
      const legacy = ReincarnationSys.readLegacy();
      legacy.xianjieBest = Math.max(legacy.xianjieBest || 0, to);
      ReincarnationSys.writeLegacy(legacy);
    }
    Log.add(`仙劫散去，霞光满身——你晋入 <b>${d.name}</b> 之列！${d.ascendText}`, 'realm');
    UI.announce(`✦ 仙劫功成 · 晋 ${d.name} ✦`, 'gold');
    Story.chron(`仙劫功成，晋入${d.name}`);
    if (to >= 4) UI.toast('大罗已成——圆满之后，道祖之境可期');
    // 大罗圆满：道祖之境一次性大奖
    this.daozuCheck(p);
  },
  /** 晋层后/仙劫后检查大罗圆满 */
  daozuCheck(p) {
    if (!this.isDaozu(p) || p.flags.daozu) return;
    p.flags.daozu = true;
    p.counters.xianyuan = (p.counters.xianyuan || 0);
    if (typeof ReincarnationSys !== 'undefined' && ReincarnationSys.grantMarks) ReincarnationSys.grantMarks(1, 'dao_zu');
    Log.add(`<b>道祖之境</b>——大罗圆满，万道归一。人间修士穷尽想象的尽头，也不过是你此刻的起点。（轮回印记 +1）`, 'realm');
    UI.announce('✦ 道 祖 之 境 ✦', 'gold');
    Story.chron('证道祖之境');
  },
  /** 仙界访客（dailySettle 钩子，日一次；(p, auto) 离线静默入账） */
  dailyCheck(p, auto = false) {
    if (!this.unlocked(p) || this.cur(p) === 0 || p.dead) return;
    if (!Daily.resetIfNew(p, '_xianVisitDay')) return;   // v32（G3）：日界判定迁入日结总线单源
    if (!Utils.chance(30)) return;
    const ev = Utils.pick(GameData.XIAN_VISITORS);
    const got = ev.fn(p);
    if (!auto) Log.add(`【仙界访客】${ev.text}（${got}）`, 'event');
    else {
      // v32 修瑕（E60）：离线访客原逐条刷（30 日约 9 条「曾有仙客到访」）——聚合进日报
      // v33（E82）：聚合条件放宽为 auto——在线按日补结（E27）原静默入账零感知，同进日报
      const agg = Game._offlineAgg = Game._offlineAgg || {};
      agg.xianVisit = (agg.xianVisit || 0) + 1;
    }
  },
  /** 状态区块（Stat 明细与修炼页仙阶卡共用） */
  label(p) {
    const idx = this.cur(p);
    if (idx === 0) return '未入仙籍';
    const d = GameData.XIAN_TIERS[idx - 1];
    const ln = this.layer(p) >= 3 ? '圆满' : GameData.XIAN_LAYER_NAMES[this.layer(p)];
    return `${d.name} · ${ln}`;
  },
};
window.XianSys = XianSys;
