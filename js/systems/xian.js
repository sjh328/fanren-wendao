
/* ======================================================================
 * §27 v31「登仙」仙界四阶 XianSys（地仙 → 天仙 → 金仙 → 大罗）
 * 真仙圆满 → 白日飞升之后，修为溢流所炼的「仙元」（Cultivate.addExp 溢流单源）
 * 在此续行登仙之路：每阶三层以仙元晋；阶满引动「仙劫」（复用天劫三策表，
 * Tribulation 以 opts.xian 参数化）；大罗圆满证「道祖之境」。
 * 属性收益：每层全属性 +1.5%、修炼效率 +2%（Stat.compute 消费）；
 * 寿元：入阶续仙寿（GameData.XIAN_TIERS[].life）。
 * ====================================================================== */
const XianSys = {
  /** v40（E373）：无消费死方法 tiers()/nextNeed() 删除（缺陷猎手 deadscan 复核全仓零调用，
   *  数据直读 GameData.XIAN_TIERS[].layerNeed） */
  cur(p) { return (p.xianjie && p.xianjie.idx) || 0; },
  layer(p) { return (p.xianjie && p.xianjie.layer) || 0; },
  def(p) { return this.cur(p) === 0 ? null : (GameData.XIAN_TIERS[this.cur(p) - 1] || null); },   // v32 修瑕（E28）：idx=0 原错回地仙定义——advanceLayer 的 enterFirst 分支成死代码（无籍也可「晋层」的语义陷阱）
  yuan(p) { return (p.counters && p.counters.xianyuan) || 0; },
  /** 已晋层数（全属性/修炼效率消费）；v32 修瑕（E36）：未飞升而残留仙籍的脏档不再吃加成 */
  layersTotal(p) { return (this.unlocked(p) && this.cur(p) > 0) ? (this.cur(p) - 1) * 3 + this.layer(p) : 0; },
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
    const need = Math.round(d.layerNeed * this.yuanCostMul(p));   // v40（E398）：考功不足（merit < 品阶×4）时仙元 ×1.5 软门槛
    if (this.yuan(p) < need) {
      UI.toast(`仙元不足（需 ${Utils.fmtNum(need)}）${need > d.layerNeed ? '——考功政绩不足，仙元消耗 ×1.5（先行考功可免）' : ''}`);
      return;
    }
    p.counters.xianyuan -= need;
    p.xianjie.layer++;
    if (need > d.layerNeed) Log.add('【仙庭】因考功政绩不足，此次晋层多耗了五成仙元——官声不可轻慢。', 'warn');
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
    // v42（E520）：证道祖门槛——大罗圆满还须一方小世界历经三纪（开辟→三纪全链通后方可证道）；
    // 仙元自此降为加速货币（可投资小世界提前纪年）。t0~t3 晋层零变化，门槛只挂道祖一档。
    if (this.bestEra(p) < 3) {
      Log.add('大罗圆满，万道在望——然<b>道祖之境</b>须以一方亲手开辟的小世界为证：此界历经三纪，方见真章。', 'warn');
      UI.toast('证道祖需一方小世界达三纪——修炼页「小世界」可开辟（仙元可投资加速纪年）');
      return;
    }
    p.flags.daozu = true;
    // v38（E284）：删除无效果死行 `p.counters.xianyuan = (p.counters.xianyuan || 0);`
    if (typeof ReincarnationSys !== 'undefined' && ReincarnationSys.grantMarks) ReincarnationSys.grantMarks(1, 'dao_zu');
    if (typeof ReincarnationSys !== 'undefined' && ReincarnationSys.showLifeReport) ReincarnationSys.showLifeReport(p, '证道祖');   // v38（E319）：道祖小结
    Log.add(`<b>道祖之境</b>——大罗圆满，万道归一。亲手开辟的小世界已历三纪，草木山石皆沾道音。人间修士穷尽想象的尽头，也不过是你此刻的起点。（轮回印记 +1）`, 'realm');
    // v36（E230）：证道祖之境配白金色 t3 档全屏异象（4.6s 上行长尾）+ 终局专属音色——最高里程碑
    // 的演出密度自此不低于普通突破；演出非阻塞（setTimeout 摘除），announce aria-live 读屏可达
    UI.realmShow('道 祖 之 境 · 万 道 归 一', '#e8e0f0', 9);
    Ambience.sfx('daoZu');
    UI.announce('✦ 道 祖 之 境 ✦', 'gold');
    Story.chron('证道祖之境');
  },

  /* ========== v42（E520）：开辟小世界 · 周目传承（旗舰）==========
   * 大罗圆满后可耗仙元+灵石（挂 sinkCurve）开辟一方程序生成的小世界（地貌/灵脉/生灵三轴，
   * WORLD_BIOMES 定偏向）；每 30 游戏日一「纪」，产出感悟/仙元/灵石随纪年成长（价值锚 ≈2~4 日
   * 主动收入/纪，复算式与锚值在案）；仙元可投资加速纪年（仙元自此有了溢流之外的第二去处）；
   * 证道祖须一方小世界历三纪；产出写入 ReincarnationSys.legacy.subworlds，下一周目开局继承
   * 「一方小天地」词条。存档：p.xianjie.worlds（E507 迁移默认 []），零新顶层。 */
  ERA_DAYS: 30,
  /** 三纪产出复算锚（verify/price-audit 同式）：纪值 = 125×stoneEco（建模日均，与 balance-sim dayIn 同式）
   *  × 1.2 × (1+era×0.15)；分成：灵石 60% / 仙元与感悟折算 40%。bias 偏向：石/元/悟三系。 */
  worlds(p) { return (p.xianjie && Array.isArray(p.xianjie.worlds)) ? p.xianjie.worlds : []; },
  bestEra(p) { return this.worlds(p).reduce((m, w) => Math.max(m, w.era || 0), 0); },
  canOpen(p) { return this.unlocked(p) && this.cur(p) >= 4 && this.layer(p) >= 3; },   // 大罗圆满方开辟
  openCost(p) { return { stones: Math.round(2000 * GameData.sinkCurve(p.realmIdx || 9) / 2.2), yuan: 30000 }; },
  eraBias(w) {
    const B = GameData.WORLD_BIOMES;
    const stone = w.vein === 'lingmai' || w.life === 'yaoshou' || w.land === 'shanhe';
    const yuan = w.vein === 'xuanyun' || w.life === 'shiren';
    const ins = w.vein === 'daoyun' || w.life === 'lingzhi';
    return { stone: stone ? 1.35 : 1, yuan: yuan ? 1.6 : 1, ins: ins ? 1.8 : 1 };
  },
  worldName(w) {
    const B = GameData.WORLD_BIOMES;
    const land = (B.land.find(x => x.id === w.land) || {}).name || '无名之地';
    return `${land} · ${w.name || '小世界'}`;
  },
  eraYield(p, w, era) {
    const dayIn = 125 * GameData.stoneEco(p.realmIdx || 9);
    const value = dayIn * 1.2 * (1 + era * 0.15);
    const bias = this.eraBias(w);
    const stones = Math.round(value * 0.6 * bias.stone);
    const yuan = Math.round((1500 + era * 300) * bias.yuan);
    const insight = Math.min(100, Math.round((10 + era * 3) * bias.ins));
    return { stones, yuan, insight };
  },
  /** 纪年推进（Game.dailySettle 挂钩，auto=离线回放静默）：每满 ERA_DAYS 日进一纪，产出入账并写 legacy */
  subworldTick(p, auto = false) {
    const ws = this.worlds(p);
    if (!ws.length || p.dead) return;
    const today = Math.floor(p.day || 0);
    for (const w of ws) {
      let guard = 0;
      // v42 修瑕：纪年基点用 ?? 判空——开局第 0 日开辟时 lastTickDay/createdDay 合法为 0，
      // 原旧式 `||` 把 0 当缺失回落 today，条件恒假、纪年永不推进（W1C sfx 同类病灶）
      while (today - (w.lastTickDay ?? w.createdDay ?? today) >= this.ERA_DAYS && guard++ < 12) {
        w.lastTickDay = (w.lastTickDay ?? w.createdDay ?? today) + this.ERA_DAYS;
        w.era = (w.era || 0) + 1;
        const y = this.eraYield(p, w, w.era);
        Bag.addStones(y.stones);
        p.counters.xianyuan = (p.counters.xianyuan || 0) + y.yuan;
        Cultivate.addInsight(p, y.insight);
        const line = `${this.worldName(w)}历第 ${w.era} 纪——灵石 +${Utils.fmtNum(y.stones)}、仙元 +${Utils.fmtNum(y.yuan)}、感悟 +${y.insight}。`;
        if (auto) { const agg = Game._offlineAgg = Game._offlineAgg || {}; agg.subworld = (agg.subworld || 0) + 1; Log.add(`【小世界】${line}`, 'info'); }
        else Log.add(`【小世界】${line}`, 'gain');
      }
    }
    // 周目传承：产出纪年写入全局 legacy（转世继承通道既有）
    if (typeof ReincarnationSys !== 'undefined' && ReincarnationSys.writeLegacy) {
      const legacy = ReincarnationSys.readLegacy();
      const snap = JSON.stringify(ws.map(w => ({ name: this.worldName(w), era: w.era || 0 })));
      if ((legacy.subworldSnap || '') !== snap) {
        legacy.subworldSnap = snap;
        legacy.subworlds = ws.map(w => ({ name: this.worldName(w), era: w.era || 0 }));
        ReincarnationSys.writeLegacy(legacy);
      }
    }
  },
  /** 开辟 / 投资（契约签名 openSubworld(p, invest)）——invest=null 走开辟流；invest=world 序号走投资流 */
  async openSubworld(p, invest = null) {
    if (!this.canOpen(p)) { UI.toast('大罗圆满后方可开辟小世界'); return; }
    if (invest == null) {
      if (this.worlds(p).length >= 3) { UI.toast('三界已开辟——道祖之境，三界足矣'); return; }
      const cost = this.openCost(p);
      const B = GameData.WORLD_BIOMES;
      const pickAxis = (key, label) => ({
        key, label, type: 'radio',
        options: B[key].map(o => ({ value: o.id, label: `${o.name}——${o.desc}` })),
      });
      const form = await UI.form({
        title: '开辟小世界',
        html: `以大罗之力为胎、仙元为引，辟一方属于你的世界。三轴定其性：<br>
          <span class="tip-line">· 需仙元 ${Utils.fmtNum(cost.yuan)}、灵石 ${Utils.fmtNum(cost.stones)}（开辟之后每 ${this.ERA_DAYS} 日自历一纪，产出随纪年成长；仙元可投资加速纪年）。</span>`,
        fields: [pickAxis('land', '地貌'), pickAxis('vein', '灵脉'), pickAxis('life', '生灵')],
        confirm: '开 辟',
      });
      if (!form) return;
      if (this.worlds(p).length >= 3) { UI.toast('三界已开辟'); return; }
      if ((this.yuan(p)) < cost.yuan) { UI.toast(`仙元不足（需 ${Utils.fmtNum(cost.yuan)}）`); return; }
      if (!Bag.spendStones(cost.stones)) { UI.toast('灵石不足'); return; }
      p.counters.xianyuan -= cost.yuan;
      const w = {
        land: form.land, vein: form.vein, life: form.life,
        name: (GameData.WORLD_BIOMES.vein.find(x => x.id === form.vein) || {}).name || '小世界',
        era: 0, createdDay: Math.floor(p.day || 0), lastTickDay: Math.floor(p.day || 0),
      };
      p.xianjie.worlds = p.xianjie.worlds || [];
      p.xianjie.worlds.push(w);
      UI.realmShow('开 天 辟 地 · 一方世界自掌中生', '#cfe3f5', 5);
      Ambience.sfx('daoZu');
      UI.announce('✦ 开辟小世界 ✦', 'gold');
      Log.add(`你以大罗之力<b>开辟小世界</b>——【${this.worldName(w)}】自虚空中成型！三轴既定，每 ${this.ERA_DAYS} 日自历一纪，此界所出自归你的道场。`, 'realm');
      Story.chron(`开辟小世界「${this.worldName(w)}」`);
      Game.afterAction();
      return;
    }
    // 投资流：仙元加速纪年（每投资一次，纪年时钟提前 10 日）
    const w = this.worlds(p)[invest];
    if (!w) return;
    const ahead = Math.floor(p.day || 0) - (w.lastTickDay ?? w.createdDay ?? Math.floor(p.day || 0));
    const costYuan = Math.round(5000 * (1 + (w.era || 0) * 0.5));
    const ok = await UI.popup({
      title: `仙元灌顶 · ${this.worldName(w)}`,
      html: `以仙元灌入世界胎膜，纪年时钟提前：<br>· 每次 <b>提前 10 日</b>（今已历 ${Math.max(0, ahead)}/${this.ERA_DAYS} 日，纪年 ${w.era || 0}）。<br>· 需仙元 <span class="hl">${Utils.fmtNum(costYuan)}</span>（随纪年水涨）。`,
      options: [{ text: '灌 顶', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (this.yuan(p) < costYuan) { UI.toast(`仙元不足（需 ${Utils.fmtNum(costYuan)}）`); return; }
    p.counters.xianyuan -= costYuan;
    w.lastTickDay = (w.lastTickDay ?? w.createdDay ?? Math.floor(p.day || 0)) - 10;
    Log.add(`仙元如江河灌入【${this.worldName(w)}】——界中日月奔涌，纪年时钟提前了十日。`, 'gain');
    this.subworldTick(p, false);   // 灌顶可能直接催熟一纪
    Game.afterAction();
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
  /** v40（E398）：官声轴——merit（考功政绩）/ demerit（罢黜记录）。晋品仙元需求不变，
   *  merit 不足（<晋品需求的 40%）时仙元消耗 ×1.5 软门槛（不锁死）；
   *  v41（E444）官声做实（v5 定死口径）：demerit 为罢黜记录，官市对你**加价**——×(1+min(0.30, demerit×0.05))，
   *  demerit=5 → ×1.25、≥6 → ×1.30 帽（折扣方向会让「多被贬官」变理财手段，且与「merit 不足→仙元 ×1.5」
   *  对称——v41 定死惩罚轴并如实明示）；merit 每 10 点官市折上折 1%（帽 5%，与 demerit 反号成两轴区分度） */
  merit(p) { return (p.xianCourt && p.xianCourt.merit) || 0; },
  demerit(p) { return (p.xianCourt && p.xianCourt.demerit) || 0; },
  addMerit(p, n) {
    const c = this.courtState(p);
    if (n >= 0) { c.merit = (c.merit || 0) + n; }
    else { c.merit = (c.merit || 0) + n; c.demerit = (c.demerit || 0) - n; }   // 负值扣政绩+记过
  },
  /** v40（E398）②：晋品仙元软门槛——考功不足（merit < pin×4）时晋层仙元消耗 ×1.5（不锁死） */
  yuanCostMul(p) { return this.merit(p) < this.pin(p) * 4 ? 1.5 : 1; },
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
  /** v40（E398）③：每品专属特权单源（仙庭页与消费端共用）——
   *  六品=仙市行情预告（仙市页显示明日行情方向）/ 四品=每日一次镇心魔 −10（ courtDaily 消费）
   *  / 二品=差遣四桩（TASKS 可领四桩）/ 一品=仙市七五折（marketPrice 折扣加深） */
  PRIVS: [
    { pin: 4, id: 'marketHint', name: '仙市行情预告', desc: '仙市页可见坊市行情走向' },
    { pin: 6, id: 'calmXinmo', name: '每日镇心魔', desc: '每日一次心魔 −10（仙庭页执行）' },
    { pin: 8, id: 'fourTasks', name: '差遣四桩', desc: '每日可领四桩差遣' },
    { pin: 9, id: 'market75', name: '仙市七五折', desc: '仙市易物七五折' },
  ],
  hasPriv(p, id) {
    const pin = this.pin(p);
    return this.PRIVS.some(x => x.id === id && pin >= x.pin);   // v40（E398）：数字越大品越高
  },
  courtState(p) { return p.xianCourt || (p.xianCourt = { gong: 0, day: 0, claims: {}, base: {} }); },
  /** 差遣三桩（日更）：巡察（胜 1 场）/ 上贡（炼丹 1 炉）/ 参拜（求签 1 次）；
   *  v40（E398）二品特权「差遣四桩」：追加第四桩「巡夜」（夜巡护佑） */
  TASKS: [
    { id: 'patrol', name: '巡察妖患', desc: '胜一场战斗（妖氛清剿）', need: 1, counter: 'wins' },
    { id: 'tribute', name: '上贡仙丹', desc: '开炉炼丹一炉（仙庭香火）', need: 1, counter: 'crafts' },
    { id: 'alms',   name: '参拜仙官', desc: '黄历求签一次（诚心可鉴）', need: 1, counter: null },
  ],
  TASK_EXTRA: { id: 'night', name: '巡夜护佑', desc: '外出巡行一次（任意地图探索）', need: 1, counter: 'explores' },
  taskList(p) {
    return this.hasPriv(p, 'fourTasks') ? [...this.TASKS, this.TASK_EXTRA] : this.TASKS;
  },
  taskProg(p, t) {
    const c = this.courtState(p);
    if (t.id === 'alms') return p.signDay === Math.floor(p.day || 0) ? 1 : 0;
    const base = (c.base || {})[t.counter] || 0;
    return Math.max(0, ((p.counters || {})[t.counter] || 0) - base);
  },
  /** 日更钩子：差遣换日重掷基线 + 心魔罢黜（仙官也修心）+
   *  v40（E398）四品特权「每日镇心魔 −10」（手动在仙庭页执行，此处只重置 privUsed） */
  courtDaily(p, auto = false) {
    if (!this.unlocked(p) || p.dead) return;
    const c = this.courtState(p);
    const today = Math.floor(p.day || 0);
    if (c.day !== today) {
      c.day = today;
      c.claims = {};
      c.base = { wins: (p.counters || {}).wins || 0, crafts: (p.counters || {}).crafts || 0, explores: (p.counters || {}).explores || 0 };
    }
    // 罢黜：心魔 ≥80 → v40（E398）改走官声：demerit+3 且仙功折一成；merit<0 停差遣（claims 清空）
    if ((p.xinmo || 0) >= 80 && c._dismissDay !== today) {
      c._dismissDay = today;
      c.demerit = (c.demerit || 0) + 3;
      c.merit = Math.max(-10, (c.merit || 0) - 2);   // v40（E398）：罢黜扣政绩——merit<0 停差遣分支自此可达
      const lost = Math.round(this.gong(p) * 0.1);
      if (lost > 0) {
        c.gong = Math.max(0, this.gong(p) - lost);
        Log.add(`【仙庭】心魔深重（${Math.round(p.xinmo)}）——仙官名录上你的考功被朱笔一勾：官声受损（demerit +3），仙功 -${lost}。仙官也须修心。`, 'loss');
      }
      if (this.merit(p) < 0 && c.day === today) {
        c.claims = {};
        Log.add('【仙庭】官声狼藉——今日差遣暂停，先行修心赎功。', 'warn');
      }
    }
  },
  /** v40（E398）四品特权：每日一次镇心魔 −10（仙庭页按钮，日一次） */
  calmXinmo() {
    const p = Game.player;
    if (!this.unlocked(p) || !this.hasPriv(p, 'calmXinmo')) { UI.toast('四品仙卿方可行此特权'); return; }
    const c = this.courtState(p);
    const today = Math.floor(p.day || 0);
    if (c._calmDay === today) { UI.toast('今日已镇过心魔——明日再来'); return; }
    c._calmDay = today;
    p.xinmo = Math.max(0, (p.xinmo || 0) - 10);
    Log.add(`【仙庭特权】仙官诵静心咒镇魂——心魔 -10（现 ${Math.round(p.xinmo)}）。`, 'gain');
    Game.afterAction();
  },
  /** v40（E398）①考功评级：领赏时按当日超额量评级（超额 ≥1 倍需求=优异 merit+2；达标=称职 +1；
   *  领赏时不足（progress 超 need 由 claim 保证）——此处只按超额倍数分档 */
  meritGrade(p, t) {
    const prog = this.taskProg(p, t);
    if (prog >= t.need * 2) return { grade: '优异', delta: 2 };
    if (prog >= t.need) return { grade: '称职', delta: 1 };
    return { grade: '欠缺', delta: 0 };
  },
  claimTask(i) {
    const p = Game.player;
    if (!this.unlocked(p)) return;
    const c = this.courtState(p);
    const t = this.taskList(p)[i];
    if (!t || c.claims[t.id]) return;
    if (this.taskProg(p, t) < t.need) { UI.toast('此桩差遣尚未达成'); return; }
    // v40（E398）①：考功评级——超额倍数定 merit（欠缺不扣，称职+1、优异+2）
    const mg = this.meritGrade(p, t);
    if (mg.delta > 0) this.addMerit(p, mg.delta);
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
    Log.add(`【仙庭差遣】「${t.name}」考功${mg.grade}（官声 +${mg.delta}）——仙功 +${gongGain}${extra}。${this.pinNext(p) ? `（距${this.PIN_NAMES[this.pin(p)]}晋${this.PIN_NAMES[this.pin(p) + 1] || ''}尚需仙功 ${Utils.fmtNum(Math.max(0, this.pinNext(p) - this.gong(p)))}）` : '（一品之尊，仙庭人臣之极）'}`, 'gain');
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
    // v40（E398）一品特权「仙市七五折」乘法叠加；v41（E444）①②：官声两轴做实——
    // demerit 加价（每点 +5%，帽 +30%）与 merit 折上折（每 10 点 −1%，帽 −5%）反号，四重乘法叠加
    const disc = (1 - (this.pin(p) - 1) * 0.04) * (this.hasPriv(p, 'market75') ? 0.75 : 1)   // v40（E398）：乘法叠加
      * (1 - Math.min(0.05, Math.floor(Math.max(0, this.merit(p)) / 10) * 0.01))
      * (1 + Math.min(0.30, this.demerit(p) * 0.05));
    return Math.round(row.base * disc);
  },
  async courtBuy(i) {
    const p = Game.player;
    if (!this.unlocked(p)) return;
    const row = this.MARKET[i];
    if (!row) return;
    const price = this.marketPrice(p, row);
    // v41（E444）③：折扣公示反推单源——公示折=实付折（±1pp），特权生效另注，官声两轴如实分列
    const pct = Math.round((1 - price / row.base) * 100);
    const dem = this.demerit(p);
    const mer = Math.min(5, Math.floor(Math.max(0, this.merit(p)) / 10));
    const qty = row.qty || 1;
    const def = GameData.ITEMS[row.item];
    const ok = await UI.popup({
      title: '仙市 · 易物',
      html: `以灵石易仙材：<br>【${def.name}】×${qty}——索价 <span class="hl">${Utils.fmtNum(price)}</span> 灵石（${this.pinName(p)}仙市实付折 <b>${pct}%</b>${this.hasPriv(p, 'market75') ? '，含一品仙市七五折' : ''}${mer ? `，考功折上折 −${mer}%` : ''}${dem ? `；<span class="neg">官声受损（罢黜 ${dem} 记），官市加价 +${Math.round(Math.min(0.30, dem * 0.05) * 100)}%</span>` : ''}）。`,
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
