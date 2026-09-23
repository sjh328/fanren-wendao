
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
      // v37（E246）：阶满指引补仙元去处——「可于转世时携往生」（1000:1 折气运 / 2000:1 折悟性）
      UI.toast(this.cur(p) >= 4 ? '大罗已圆满——可证道祖之境；仙元可于转世时携往生' : `${d.name}已圆满——引动仙劫方可晋入${(GameData.XIAN_TIERS[this.cur(p)] || {}).name || '下一阶'}；余下仙元可于转世时携往生`);
      return;
    }
    const need = d.layerNeed;
    if (this.yuan(p) < need) { UI.toast(`仙元不足（需 ${Utils.fmtNum(need)}）`); return; }
    p.counters.xianyuan -= need;
    p.xianjie.layer++;
    // v35（E146）修瑕：播报原读「晋升前」的层名（names[layer-1]）——晋入中期播成「初期」、
    // 晋入圆满播成「后期」，与 label()（layer>=3 → 圆满）口径差一位
    const ln2 = this.layer(p) >= 3 ? '圆满' : GameData.XIAN_LAYER_NAMES[this.layer(p)];
    Log.add(`仙元入体，道行更进——你晋入 <b>${d.name}${ln2}</b>！（全属性 +1.5%，修炼效率 +2%）`, 'realm');
    UI.announce(`✦ 仙阶晋升 · ${d.name}${ln2}`, 'gold');
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
    // v36（E230）：仙界仪式按仙阶分档演出——落名（地仙 t1）/晋层（t1~t2）/证道（t3）
    UI.realmShow(`仙籍落名 · ${d.name}`, '#cfe3f5', 2);
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
    // v36（E230）：晋层按仙阶分档演出——t1~t2 档（同 v19 突破分档法，证道另走 t3）
    UI.realmShow(`仙劫功成 · 晋 ${d.name}`, '#cfe3f5', to <= 2 ? 2 : 5);
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
    // v38（E284）：删除无效果死行 `p.counters.xianyuan = (p.counters.xianyuan || 0);`
    if (typeof ReincarnationSys !== 'undefined' && ReincarnationSys.grantMarks) ReincarnationSys.grantMarks(1, 'dao_zu');
    if (typeof ReincarnationSys !== 'undefined' && ReincarnationSys.showLifeReport) ReincarnationSys.showLifeReport(p, '证道祖');   // v38（E319）：道祖小结
    Log.add(`<b>道祖之境</b>——大罗圆满，万道归一。人间修士穷尽想象的尽头，也不过是你此刻的起点。（轮回印记 +1）`, 'realm');
    // v36（E230）：证道祖之境配白金色 t3 档全屏异象（4.6s 上行长尾）+ 终局专属音色——最高里程碑
    // 的演出密度自此不低于普通突破；演出非阻塞（setTimeout 摘除），announce aria-live 读屏可达
    UI.realmShow('道 祖 之 境 · 万 道 归 一', '#e8e0f0', 9);
    Ambience.sfx('daoZu');
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

  /* ========== v38（E309）：仙庭体系——仙界从挂机场变官场经营 ========== */
  /* 仙功晋品（九品仙吏 → 一品仙尊）；差遣日三桩；仙市折扣；仙兵借用；心魔罢黜 */
  PINS: [0, 300, 800, 1800, 3600, 6500, 11000, 18000, 30000],
  PIN_NAMES: ['九品仙吏', '八品仙丞', '七品仙卫', '六品仙使', '五品仙官', '四品仙卿', '三品仙侯', '二品仙君', '一品仙尊'],
  gong(p) { return (p.xianCourt && p.xianCourt.gong) || 0; },
  pin(p) {
    const g = this.gong(p);
    let pin = 1;
    for (let i = 1; i < this.PINS.length; i++) if (g >= this.PINS[i]) pin = i + 1;
    return pin;
  },
  pinName(p) { return this.PIN_NAMES[this.pin(p) - 1] || '九品仙吏'; },
  pinNext(p) { return this.pin(p) >= 9 ? null : this.PINS[this.pin(p)]; },
  /** 云海深层解锁（品 ≥5） */
  deepOpen(p) { return this.pin(p) >= 5; },
  courtState(p) { return p.xianCourt || (p.xianCourt = { gong: 0, day: 0, claims: {}, base: {} }); },
  /** 差遣三桩（日更）：巡察（胜 1 场）/ 上贡（炼丹 1 炉）/ 参拜（求签 1 次） */
  TASKS: [
    { id: 'patrol', name: '巡察妖患', desc: '胜一场战斗（妖氛清剿）', need: 1, counter: 'wins' },
    { id: 'tribute', name: '上贡仙丹', desc: '开炉炼丹一炉（仙庭香火）', need: 1, counter: 'crafts' },
    { id: 'alms',   name: '参拜仙官', desc: '黄历求签一次（诚心可鉴）', need: 1, counter: null },
  ],
  taskProg(p, t) {
    const c = this.courtState(p);
    if (t.id === 'alms') return p.signDay === Math.floor(p.day || 0) ? 1 : 0;
    const base = (c.base || {})[t.counter] || 0;
    return Math.max(0, ((p.counters || {})[t.counter] || 0) - base);
  },
  /** 日更钩子：差遣换日重掷基线 + 心魔罢黜（仙官也修心） */
  courtDaily(p, auto = false) {
    if (!this.unlocked(p) || p.dead) return;
    const c = this.courtState(p);
    const today = Math.floor(p.day || 0);
    if (c.day !== today) {
      c.day = today;
      c.claims = {};
      c.base = { wins: (p.counters || {}).wins || 0, crafts: (p.counters || {}).crafts || 0 };
    }
    // 罢黜：心魔 ≥80，仙功折一成（每日至多一次）
    if ((p.xinmo || 0) >= 80 && c._dismissDay !== today) {
      c._dismissDay = today;
      const lost = Math.round(this.gong(p) * 0.1);
      if (lost > 0) {
        c.gong = Math.max(0, this.gong(p) - lost);
        Log.add(`【仙庭】心魔深重（${Math.round(p.xinmo)}）——仙官名录上你的考功被朱笔一勾，仙功 -${lost}。仙官也须修心。`, 'loss');
      }
    }
  },
  claimTask(i) {
    const p = Game.player;
    if (!this.unlocked(p)) return;
    const c = this.courtState(p);
    const t = this.TASKS[i];
    if (!t || c.claims[t.id]) return;
    if (this.taskProg(p, t) < t.need) { UI.toast('此桩差遣尚未达成'); return; }
    c.claims[t.id] = true;
    const pinBefore = this.pin(p);
    const gongGain = 60 + pinBefore * 10;
    c.gong = this.gong(p) + gongGain;
    // v38（E328）：仙官晋品——里程碑
    if (this.pin(p) > pinBefore && typeof Game !== 'undefined' && Game.milestone) Game.milestone('msPin' + this.pin(p), `仙 官 晋 品 · ${this.pinName(p)}`, '#dfe8f5');
    let extra = '';
    if (Utils.chance(30)) {
      const mat = Utils.pick(['m_leijing', 'm_xiancui', 'm_xianjing', 'm_danfang', 'm_gupian']);
      Bag.addItem(mat, 1);
      extra = `，仙庭另赐${GameData.ITEMS[mat].name} ×1`;
    }
    Log.add(`【仙庭差遣】「${t.name}」办得妥帖——仙功 +${gongGain}${extra}。${this.pinNext(p) ? `（距${this.PIN_NAMES[this.pin(p)]}晋${this.PIN_NAMES[this.pin(p) + 1] || ''}尚需仙功 ${Utils.fmtNum(Math.max(0, this.pinNext(p) - this.gong(p)))}）` : '（一品之尊，仙庭人臣之极）'}`, 'gain');
    Game.afterAction();
  },
  /** 仙市：仙材专柜，仙石易物——品阶愈高折扣愈深 */
  MARKET: [
    { item: 'm_leijing', base: 150000 },
    { item: 'm_xiancui', base: 120000 },
    { item: 'm_xianjing', base: 50000, qty: 2 },
    { item: 'm_danfang', base: 2600, qty: 2 },
    { item: 'm_gupian', base: 6000, qty: 2 },
  ],
  marketPrice(p, row) {
    const disc = 1 - (this.pin(p) - 1) * 0.04;
    return Math.round(row.base * disc);
  },
  async courtBuy(i) {
    const p = Game.player;
    if (!this.unlocked(p)) return;
    const row = this.MARKET[i];
    if (!row) return;
    const price = this.marketPrice(p, row);
    const qty = row.qty || 1;
    const def = GameData.ITEMS[row.item];
    const ok = await UI.popup({
      title: '仙市 · 易物',
      html: `以灵石易仙材：<br>【${def.name}】×${qty}——索价 <span class="hl">${Utils.fmtNum(price)}</span> 灵石（${this.pinName(p)}仙市折 ${Math.round((1 - (this.pin(p) - 1) * 0.04) * 100)}%）。`,
      options: [{ text: '易 之', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(price)) { UI.toast('灵石不足'); return; }
    Bag.addItem(row.item, qty);
    Log.add(`你在仙市易得【${def.name}】×${qty}——仙官只收灵石，不问来处。（-${Utils.fmtNum(price)}）`, 'gain');
    Game.afterAction();
  },
};
window.XianSys = XianSys;
