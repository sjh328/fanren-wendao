/* ======================================================================
 * §13.9 v25 登天塔 TowerSys（「掌上乾坤」新玩法）
 * 筑基期解锁的无限爬塔：每层一战（塔内缩放守影），气血跨层延续；
 * 每 3 层三选一「塔心祝福」，每 5 层开宝箱并回复三成气血；
 * 败北止步不出人命（血线抬至三成，无灵石修为折损）。
 * 每日免费 1 次 + 可灵石加购 1 次；最高层双记录（Meta 跨世 / counters 本档）。
 * 祝福全部实现为敌人侧数值模组与结算乘数——零侵入战斗公式，出塔即弃。
 * ====================================================================== */
const TowerSys = {
  /** 塔心祝福池（唯一不重复领取；mod 为乘算模组，heal/healChest 为加算回复比例） */
  BUFFS: [
    { id: 'twb_atk',    name: '慑魄低吟', desc: '塔内守影攻击 -12%', mod: { atk: 0.88 } },
    { id: 'twb_def',    name: '碎甲罡风', desc: '塔内守影防御 -20%', mod: { def: 0.80 } },
    { id: 'twb_hp',     name: '蚀灵血煞', desc: '塔内守影气血 -12%', mod: { hp: 0.88 } },
    { id: 'twb_spd',    name: '迟滞咒纹', desc: '塔内守影身法 -15%', mod: { spd: 0.85 } },
    { id: 'twb_all',    name: '塔灵低语', desc: '塔内守影全属性 -5%', mod: { all: 0.95 } },
    { id: 'twb_stone',  name: '点石成金', desc: '层奖灵石 +40%', mod: { stone: 1.4 } },
    { id: 'twb_stone2', name: '聚宝盆纹', desc: '层奖灵石 +25%（可与点石成金叠乘）', mod: { stone: 1.25 } },
    { id: 'twb_exp',    name: '顿悟钟声', desc: '层奖修为 +50%', mod: { exp: 1.5 } },
    { id: 'twb_exp2',   name: '壁上残篇', desc: '层奖修为 +25%（可与顿悟钟声叠乘）', mod: { exp: 1.25 } },
    { id: 'twb_heal',   name: '回春玉露', desc: '每层战后半炷香回复 10% 气血', mod: { heal: 0.10 } },
    { id: 'twb_heal2',  name: '深泉心露', desc: '每层战后半炷香回复 18% 气血', mod: { heal: 0.18 } },
    { id: 'twb_chest',  name: '剥灵之手', desc: '宝箱所获翻倍', mod: { chest: 2 } },
    { id: 'twb_healc',  name: '避劫福纹', desc: '每逢五层的大回复额外 +15%', mod: { healChest: 0.15 } },
    { id: 'twb_risk',   name: '破釜沉舟', desc: '塔内守影防御 -30%，但攻击 +8%', mod: { def: 0.70, atk: 1.08 } },
    { id: 'twb_guard',  name: '金刚护体', desc: '塔内守影攻击再 -8%', mod: { atk: 0.92 } },
    /* ---- v30 天塔 roguelike：扩池至 25（含诅咒祝福：拿牺牲换强力） ---- */
    { id: 'twb_all2',   name: '万象俱蚀', desc: '塔内守影全属性 -10%（罕见）', mod: { all: 0.90 } },
    { id: 'twb_stone3', name: '点金神手', desc: '层奖灵石 ×2（罕见）', mod: { stone: 2 } },
    { id: 'twb_exp3',   name: '大悟碑文', desc: '层奖修为 ×2（罕见）', mod: { exp: 2 } },
    { id: 'twb_heal3',  name: '生生玉露', desc: '每层战后回复 26% 气血（罕见）', mod: { heal: 0.26 } },
    { id: 'twb_def3',   name: '碎玉崩雷', desc: '塔内守影防御 -35%（罕见）', mod: { def: 0.65 } },
    { id: 'twb_hp2',    name: '摄魂蚀魄', desc: '塔内守影气血 -25%', mod: { hp: 0.75 } },
    { id: 'twb_cgreed', name: '贪狼血誓', desc: '层奖灵石 +80%，守影攻击 +10%（诅咒祝福）', mod: { stone: 1.8, atk: 1.10 }, curse: true },
    { id: 'twb_cexp',   name: '慧极必伤', desc: '层奖修为 +80%，守影气血 +12%（诅咒祝福）', mod: { exp: 1.8, hp: 1.12 }, curse: true },
    { id: 'twb_cglass', name: '琉璃贪匣', desc: '宝箱所获 ×2.5，五层大回复 -30%（诅咒祝福）', mod: { chest: 2.5, healChest: -0.30 }, curse: true },
    { id: 'twb_cswift', name: '迅影之殇', desc: '守影身法 -40%，防御 +25%（诅咒祝福）', mod: { spd: 0.6, def: 1.25 }, curse: true },
    /* ---- v31 规则祝福：改变打法而非单纯乘算 ---- */
    { id: 'twb_rdot',  name: '蚀骨双煞', desc: '你对守影的毒/焰/血伤害翻倍，但每次结算自身也受其 2% 上限反噬（规则祝福）', mod: { dotMul: 2, dotSelf: 0.02 }, rule: true },
    { id: 'twb_rzy',   name: '聚气归元', desc: '会心一击额外回复 1 点真元（规则祝福）', mod: { zyCrit: 1 }, rule: true },
    { id: 'twb_rund',  name: '塔心不灭', desc: '塔内每场战斗首次致死伤害保留一息生机（规则祝福）', mod: { undying: 1 }, rule: true },
  ],

  unlockOk(p) { return p.realmIdx >= 1; },
  extraCost(p) { return Math.round(80 * GameData.stoneEco(p.realmIdx)); },

  /** v30 塔绩兑换所：塔绩 = p.counters.towerWins（累计胜层），兑换扣除；最高层纪录不受影响 */
  REDEEMS: [
    { id: 'stones', name: '塔灵纳财', cost: 15, desc: '灵石 120×境界经济' },
    { id: 'ore',    name: '玄铁一匣', cost: 20, desc: '玄铁矿 ×8' },
    { id: 'pill',   name: '培元丹一炉', cost: 30, desc: '培元丹 ×1' },
    { id: 'leijing', name: '雷晶核（塔心所藏）', cost: 60, desc: '雷晶核 ×1——渡劫丹主材' },
  ],
  /** 塔绩兑换实耗（v31 E10：雷晶核等渡劫主材随境界加价 + 日限一枚——原恒 60 塔绩，后期约两日白拿一枚） */
  redeemCost(p, r) { return r.id === 'leijing' ? r.cost + (p.realmIdx || 0) * 15 : r.cost; },
  async redeem(k) {
    const p = Game.player;
    const r = this.REDEEMS.find(x => x.id === k);
    if (!r) return;
    const cost = this.redeemCost(p, r);
    if (r.id === 'leijing') {
      const today = Math.floor(p.day || 0);
      this.syncToday(p);
      if ((p.tower.today.leijingDay || -1) === today) { UI.toast('塔心的雷晶核今日已被请走——塔灵需要时间再凝一枚'); return; }
    }
    if ((p.counters.towerWins || 0) < cost) { UI.toast('塔绩不足'); return; }
    const ok = await UI.popup({
      title: `塔绩兑换 · ${r.name}`,
      html: `${r.desc}。<br>需塔绩 <b>${cost}</b>（当前 ${p.counters.towerWins || 0}）。`,
      options: [{ text: '兑 换', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if ((p.counters.towerWins || 0) < cost) { UI.toast('塔绩不足'); return; }
    p.counters.towerWins -= cost;
    if (r.id === 'leijing') p.tower.today.leijingDay = Math.floor(p.day || 0);
    if (r.id === 'stones') { const s = Math.round(120 * GameData.stoneEco(p.realmIdx)); Bag.addStones(s); Log.add(`塔灵倾囊——灵石 +${Utils.fmtNum(s)}。`, 'gain'); }
    else if (r.id === 'ore') { Bag.addItem('m_xuantie', 8); Log.add('塔灵奉上玄铁矿 ×8——塔基深处所凝。', 'gain'); }
    else if (r.id === 'pill') { Bag.addItem('pill_peiyuan', 1); Log.add('塔灵奉上培元丹 ×1——塔中丹房的陈年存货。', 'gain'); }
    else if (r.id === 'leijing') { Bag.addItem('m_leijing', 1); Log.add('塔心深处取出一枚<b>雷晶核</b>——塔灵言道：「此物应劫而生，渡劫丹的主材。」', 'gain'); }
    UI.renderAll();
    Game.afterAction();
  },

  /** 塔状态自愈结构（老档无缝） */
  state(p) {
    if (!p.tower) p.tower = { best: 0, today: { day: 0, used: 0, bought: 0 }, run: null };
    if (!p.tower.today || typeof p.tower.today.day !== 'number') p.tower.today = { day: 0, used: 0, bought: 0 };
    return p.tower;
  },
  syncToday(p) {
    const t = this.state(p);
    const d = Math.floor(p.day || 0);
    // v31 修瑕：层奖灵石日额度同随换日清零——此前只清 used/bought，历史层奖累计达上限后每日层奖恒 0，
    // 与「归于明日」文案相反
    if (t.today.day !== d) { t.today.day = d; t.today.used = 0; t.today.bought = 0; t.today.stones = 0; }
  },
  leftToday(p) {
    const t = this.state(p);
    this.syncToday(p);
    return Math.max(0, 1 + t.today.bought - t.today.used);
  },
  /** 灵石加购一次（每日至多一次） */
  async buyExtra() {
    const p = Game.player;
    const t = this.state(p);
    this.syncToday(p);
    if (t.today.bought >= 1) { UI.toast('今日加购次数已用尽'); return; }
    const cost = this.extraCost(p);
    const ok = await UI.popup({
      title: '登天塔 · 灵石加购',
      html: `今日免费次数已尽。燃 <b class="hl">${Utils.fmtNum(cost)}</b> 灵石再登一次塔？<br><span class="tip-line">· 日限加购一次；塔内祝福与宝箱照常。</span>`,
      options: [{ text: '加购一次', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    t.today.bought++;
    Log.add(`你以 ${Utils.fmtNum(cost)} 灵石购得一次登天机缘。`, 'system');
    UI.renderAll();
  },

  /** 已持祝福的乘算模组 */
  modsOf(p) {
    const run = this.state(p).run;
    const mods = {};
    if (!run) return mods;
    for (const id of run.buffs) {
      const b = this.BUFFS.find(x => x.id === id);
      if (!b) continue;
      for (const [k, v] of Object.entries(b.mod)) {
        mods[k] = k === 'heal' || k === 'healChest' ? (mods[k] || 0) + v : (mods[k] || 1) * v;
      }
    }
    return mods;
  },
  buffNames(p) {
    const run = this.state(p).run;
    if (!run || !run.buffs.length) return [];
    return run.buffs.map(id => (this.BUFFS.find(b => b.id === id) || {}).name).filter(Boolean);
  },

  /** 塔内守影：以本档妖兽池为底，按境界 + 层数深度缩放（词缀/习性天然继承）
   *  v30 机制层：每 10 层一位「塔守」Boss——精英化、气血×1.5、攻×1.25、必带双词缀 */
  foeFor(p, floor) {
    const target = Utils.clamp(p.realmIdx * 4 + Math.floor((floor - 1) / 2), 0, 60);
    // v29 修瑕：按缩放后战力就近取形——此前全池随机，练气期会打出「塔影·雷狱主宰」的穿帮
    const nearIds = Object.keys(GameData.MONSTERS).filter(k => Math.abs(GameData.MONSTERS[k].power - target) <= 4);
    const id = Utils.pick(nearIds.length ? nearIds : Object.keys(GameData.MONSTERS));
    const bossFloor = floor % 10 === 0;
    const e = buildMonster(id, target - GameData.MONSTERS[id].power);
    e.name = (bossFloor ? '塔守 · ' : '塔影 · ') + e.name;
    if (bossFloor) {
      e.elite = true;
      e._forceFx2 = true;
      e.hpMax = Math.round(e.hpMax * 1.5);
      e.atk = Math.round(e.atk * 1.25);
      e.expGain = Math.round(e.expGain * 1.5);
    }
    const m = this.modsOf(p);
    const mul = (v, f) => Math.max(1, Math.round(v * f));
    if (m.all) { e.hpMax = mul(e.hpMax, m.all); e.atk = mul(e.atk, m.all); e.def = mul(e.def, m.all); e.spd = Math.max(1, Math.round(e.spd * m.all)); }
    if (m.hp) e.hpMax = mul(e.hpMax, m.hp);
    if (m.atk) e.atk = mul(e.atk, m.atk);
    if (m.def) e.def = mul(e.def, m.def);
    if (m.spd) e.spd = Math.max(1, Math.round(e.spd * m.spd));
    e.stoneGain = 0; e.dropTier = 0; e.rareDrop = null;   // 掉落由层奖统一接管
    e.hp = e.hpMax;
    return e;
  },

  /** 进塔（耗一次次数） */
  enter() {
    const p = Game.player;
    if (!this.unlockOk(p)) { UI.toast('登天塔须筑基期方可登临'); return; }
    const t = this.state(p);
    this.syncToday(p);
    if (this.leftToday(p) <= 0) { UI.toast('今日登天次数已尽——明日再来，或灵石加购'); return; }
    // v32 修瑕（E10）：气血门槛原在 nextFloor 才查——enter 已 used++，血线边缘误点即白耗今日次数
    const stT = Stat.compute(p);
    if (p.hp <= Math.max(2, Math.round(stT.maxHp * 0.1))) { UI.toast('气血近乎枯竭——先疗伤，再叩塔门'); return; }
    t.today.used++;
    t.run = { floor: 1, buffs: [] };
    Log.add('你推开通天塔的厚重石门——塔内灵压如山，每层都有一头「守影」踞阶而踞。', 'story');
    UI.renderAll();
    this.nextFloor();
  },
  /** 中途退出后续登（run 仍在，接着打当前层） */
  resume() {
    const p = Game.player;
    if (!this.state(p).run) { UI.toast('当前没有进行中的登塔'); return; }
    this.nextFloor();
  },
  /** 收手离塔：已得层奖入囊，祝福清空 */
  leave() {
    const p = Game.player;
    const t = this.state(p);
    if (!t.run) return;
    const cleared = t.run.floor - 1;
    const nextNo = t.run.floor;
    t.run = null;
    Log.add(`你在第 ${nextNo} 层前收手离塔——${cleared} 层的收获落袋，塔门在身后缓缓合拢。`, 'story');
    UI.renderAll();
  },

  /** 开打当前层 */
  nextFloor() {
    const p = Game.player;
    const run = this.state(p).run;
    if (!run) return;
    // v30 修瑕：濒死劝退口径明确化——原 p.hp<=1 语义模糊（hp=2 可登、hp=1 被拒）
    const stT = Stat.compute(p);
    if (p.hp <= Math.max(2, Math.round(stT.maxHp * 0.1))) { UI.toast('气血近乎枯竭——先疗伤，或收手离塔'); UI.renderAll(); return; }
    const foe = this.foeFor(p, run.floor);
    if (run.riskAtk) foe.atk = Math.round(foe.atk * run.riskAtk);   // v32（C6）：跳层赌约代价——守影攻击 +25%（本次登塔内）
    Battle.start(null, {
      tower: true,
      enemy: foe,
      mapName: `登天塔 · 第 ${run.floor} 层`,
    });
    const names = this.buffNames(p);
    if (names.length && Battle.active) {
      Battle.log(`【塔心祝福】${names.join('、')}——祝福之力与你同在。`, 'log-gain');
      Battle.render();
    }
  },

  /** 胜利结算（Battle.victory 的 ctx.tower 分支调用） */
  async onVictory(B) {
    const p = Game.player;
    const t = this.state(p);
    const run = t.run;
    if (!run) return;
    const mods = this.modsOf(p);
    const exp = Math.round(B.enemy.expGain * 0.5 * (mods.exp || 1));
    // v30 堵漏：层奖灵石设每日总额度（300×境界经济）——原守影战力钳 60 而层奖线性无界，
    // 高战玩家配回春祝福可近乎无限爬层，塔成了后期最粗的可重复收入管
    this.syncToday(p);
    const t2 = this.state(p);
    t2.today.stones = t2.today.stones || 0;
    const rawStones = Math.round((8 + run.floor * 3) * GameData.stoneEco(p.realmIdx) * (mods.stone || 1));
    const allowance = Math.max(0, 300 * GameData.stoneEco(p.realmIdx) - t2.today.stones);
    const stones = Math.min(rawStones, allowance);
    t2.today.stones += stones;
    if (stones < rawStones) Log.add('塔灵今日缘法已尽——再往上的层奖灵石将归于明日（修为照旧）。', 'warn');
    Cultivate.addExp(p, exp);
    Bag.addStones(stones);
    p.counters.wins++;
    p.counters.towerWins = (p.counters.towerWins || 0) + 1;
    // 气血：五层大回复三成（+避劫福纹），其余层吃回春/深泉模组
    const st = Stat.compute(p);
    const healPct = (mods.heal || 0) + (run.floor % 5 === 0 ? 0.30 + (mods.healChest || 0) : 0);
    if (healPct > 0) p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * healPct));
    // v30：登天塔三十层——轮回印记 +1（跨世一次性）
    if (run.floor >= 30 && typeof ReincarnationSys !== 'undefined' && ReincarnationSys.grantMarks) ReincarnationSys.grantMarks(1, 'tower_30');
    // 纪录（本档 + 跨世）
    if (run.floor > t.best) t.best = run.floor;
    if (run.floor > (p.counters.towerBest || 0)) p.counters.towerBest = run.floor;
    if (run.floor > (Meta.data.towerBest || 0)) { Meta.data.towerBest = run.floor; Meta.save(); }
    const floor = run.floor;
    run.floor++;
    Log.add(`登天塔第 ${floor} 层已克——层奖：修为 +${Utils.fmtNum(exp)}、灵石 +${Utils.fmtNum(stones)}${healPct > 0 ? `，气血回复 ${Math.round(healPct * 100)}%` : ''}。`, 'gain');
    Game.afterAction();
    // 每 5 层：宝箱；每 7 层：奇遇层；每 3 层：祝福三选一；其余层自动续层
    // v31 修瑕（E7）：多重合层并列触发——原 else-if 串联曾让 15/30/45 层宝箱吞掉祝福、35/70 层吞掉奇遇；
    // 仅最后一环推进层，任一环「离塔」即中止后续环节
    const steps = [];
    if (floor % 5 === 0) steps.push('chest');
    if (floor % 7 === 0) steps.push('event');
    if (floor % 3 === 0) steps.push('bless');
    let quitAll = false;
    if (!steps.length) { await Battle.wait(900); this.nextFloor(); }
    else {
      for (let i = 0; i < steps.length; i++) {
        const advance = i === steps.length - 1;
        const s = steps[i];
        const quit = s === 'chest' ? await this.chestStep(p, run, mods, floor, advance)
          : s === 'event' ? await this.eventStep(p, run, mods, floor, advance)
          : await this.blessStep(p, run, floor, advance);
        if (quit) { quitAll = true; break; }
      }
      // v32（C6）跳层赌约——v35（E138）修瑕：原接受分支 `run.floor += 1` 抬高的是**已开打的这一层**，
      // 被跳层照发层奖（且按被抬高层计价）、最高层纪录虚增——赌约成了稳赚不赔的正期望。
      // 现接受分支改为「作废刚开打的这一层」：该层战斗（弹窗拦路、尚未出手）就地收场、
      // 跳进再下一层——被跳层真正一无所获，层奖/纪录/文案三者归位；拒绝则照常作战（v32 体验不变）。
      // 兜底：若该层已被打完（自动战斗等时机已过），赌约作罢不追溯。
      if (!quitAll && run && run.floor < 90 && Utils.chance(15)) {
        const skipTarget = run.floor;   // 即将开打/刚开打的下一层
        let settled = false;
        UI.popup({
          title: '✦ 登天塔 · 跳层赌约',
          html: `塔中忽起异风——下一层的守影气息暴涨。<br><span class="tip-line">· 赌约：跳过第 ${skipTarget} 层（放弃其层奖），直上第 ${skipTarget + 1} 层；此后守影攻击 +25%（本次登塔内）。塔绩 +1。</span>`,
          options: [{ text: '掷下赌约 · 直上二层', value: true, primary: true }, { text: '稳步登楼', value: false }],
        }).then(ok2 => {
          if (settled || !ok2) return;
          settled = true;
          const B = Battle.active;
          if (!run || !B || B.over || !B.ctx || B.ctx.mapName !== `登天塔 · 第 ${skipTarget} 层`) {
            Log.add('塔风已散——这一层已在脚下，赌约错过了兑现的时机。', 'info');
            return;
          }
          run.floor += 1;   // 连同常规 +1 合计跳两层
          run.risk = (run.risk || 0) + 1;
          run.riskAtk = 1.25;
          p.counters.towerWins = (p.counters.towerWins || 0) + 1;
          Log.add('你应下赌约——塔风呼啸，石阶在脚下连退两层！（塔绩 +1，此后守影更凶）', 'event');
          Battle.end();   // 作废被跳层（未出手，零损耗）
          this.nextFloor();
        });
      }
    }
  },

  /** v30 每 7 层奇遇层：灵泉石台 / 行脚商人 / 塔灵赐福——爬塔从「刷纪录」变「每层都在做选择」；advance 同 blessStep */
  async eventStep(p, run, mods, floor, advance = true) {
    const eco = GameData.stoneEco(p.realmIdx);
    const vendorMat = Utils.pick(['tw_sand', 'tw_iron', 'tw_core']);
    const price = Math.round(60 * eco);
    const pool = this.BUFFS.filter(b => !run.buffs.includes(b.id));
    // v31 修瑕（E8）：塔灵「赐福」从全池均匀抽取——可能塞给你诅咒祝福（琉璃贪匣），gift 池滤除 curse
    const giftPool = pool.filter(b => !b.curse);
    const gift = giftPool.length ? Utils.pick(giftPool) : null;
    const stNow = Stat.compute(p);
    const v = await UI.popup({
      title: `✦ 登天塔 · 第 ${floor} 层 · 塔中奇遇`,
      html: `<div class="tip-line">这一层没有守影——只有一方石台、一个行脚商人，与一缕若有若无的塔灵。</div>`,
      options: [
        { text: `灵泉石台（回复六成气血）`, value: 'spring', primary: true },
        { text: `行脚商人（${Utils.fmtNum(price)} 灵石购【${GameData.ITEMS[vendorMat].name}】×3）`, value: 'vendor' },
        ...(gift ? [{ text: `塔灵赐福（随机获赠【${gift.name}】）`, value: 'gift' }] : []),
        ...(p.hp > stNow.maxHp * 0.35 ? [{ text: '血祭塔灵（自损现血三成，换一道未持有的祝福）', value: 'blood' }] : []),   // v32（C6）：血祭塔灵——风险换稀有祝福
        { text: '径直登层', value: '__skip' },
      ],
    });
    if (v === 'spring') {
      const st = Stat.compute(p);
      p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * 0.6));
      Log.add('塔心石台涌出温热灵泉——沐浴一番，气血尽复六成。', 'gain');
    } else if (v === 'vendor') {
      if (!Bag.spendStones(price)) { UI.toast('灵石不足，商人耸耸肩走了'); }
      else { Bag.addItem(vendorMat, 3); Log.add(`行脚商人收了灵石，从褡裢里摸出【${GameData.ITEMS[vendorMat].name}】×3：「塔里的东西，比下面划算。」`, 'gain'); }
    } else if (v === 'gift' && gift) {
      run.buffs.push(gift.id);
      Log.add(`塔灵低语一声——【<b>${gift.name}</b>】入体：${gift.desc}`, 'gain');
      UI.toast(`✦ 塔灵赐福：${gift.name}`);
    } else if (v === 'blood') {
      // v32（C6）：血祭塔灵——自损现血三成，优先换规则祝福（稀有档），次取任意未持有祝福
      const cost = Math.max(1, Math.round(p.hp * 0.3));
      p.hp = Math.max(1, p.hp - cost);
      const unowned = this.BUFFS.filter(b2 => !run.buffs.includes(b2.id));
      const pool2 = unowned.filter(b2 => b2.rule).length ? unowned.filter(b2 => b2.rule) : unowned;
      const pick2 = pool2.length ? Utils.pick(pool2) : null;
      if (pick2) {
        run.buffs.push(pick2.id);
        Log.add(`你割掌祭血（气血 -${cost}）——塔灵低啸一声，【<b>${pick2.name}</b>】入体：${pick2.desc}`, 'gain');
        UI.toast(`✦ 血祭得福：${pick2.name}`);
      } else Log.add('你割掌祭血（气血 -' + cost + '）——塔灵静默良久，似是福缘已尽。', 'warn');
    }
    if (advance) this.nextFloor();
    return false;
  },

  /** 祝福三选一（第四项永远是离塔出口）；advance=false 时只结算不推进层（多重合层并列触发） */
  async blessStep(p, run, floor, advance = true) {
    const pool = this.BUFFS.filter(b => !run.buffs.includes(b.id));
    // v27 修瑕：sort(random) 非均匀洗牌，靠前祝福系统性偏低——改 Fisher–Yates
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks = pool.slice(0, 3);
    const v = await UI.popup({
      title: `✦ 登天塔 · 第 ${floor} 层已克`,
      html: `<div class="tip-line">塔心浮动，三道祝福任择其一——出塔即散，塔内长存。</div>
        <div class="tip-line">· 已持 ${run.buffs.length} 道祝福：${this.buffNames(p).join('、') || '无'}</div>`,
      options: [...picks.map(b => ({ text: `${b.name}｜${b.desc}`, value: b.id })),
        { text: '收手离塔（带足战利品）', value: '__quit' }],
    });
    if (v === '__quit' || v == null) {
      if (v === '__quit') { this.leave(); return true; }
      UI.toast('你未能决意——本层祝福机会已过（可继续登层）');   // v30 修瑕：ESC 曾静默吞掉三选一
      if (advance) this.nextFloor();
      return false;
    }
    run.buffs.push(v);
    const b = this.BUFFS.find(x => x.id === v);
    UI.toast(`✦ 塔心祝福：${b.name}`);
    Log.add(`塔心祝福入体：<b>${b.name}</b>——${b.desc}。`, 'gain');
    if (advance) this.nextFloor();
    return false;
  },

  /** 五层宝箱；advance=false 时只结算不推进层（多重合层并列触发） */
  async chestStep(p, run, mods, floor, advance = true) {
    const bonus = Math.round(20 * GameData.stoneEco(p.realmIdx) * (mods.stone || 1));
    Bag.addStones(bonus);
    const pool = [
      { id: 'm_gupian', w: 22 }, { id: 'tw_sand', w: 26 }, { id: 'tw_iron', w: 16 },
      { id: 'tw_core', w: 8 }, { id: 'pill_ningqi', w: 16 }, { id: 'pill_xisui', w: 6 },
      { id: 'tal_zilei', w: 6 },
      // v30 断头路补全：九天仙袍原全源码零获取渠道，法宝/妖兽图鉴因此永不可能收满——30 层后宝箱可出
      { id: 'a_xianpao', w: 3, minFloor: 30 },
    ].filter(x => GameData.ITEMS[x.id] && (!x.minFloor || floor >= x.minFloor));
    const total = pool.reduce((s, x) => s + x.w, 0);
    let roll = Math.random() * total, drop = pool[0].id;
    for (const x of pool) { roll -= x.w; if (roll <= 0) { drop = x.id; break; } }
    // v31 修瑕：取整——琉璃贪匣 chest=2.5 时原式得 2.5 件小数物品直写存档
    const n = Math.max(1, Math.round(1 + (mods.chest ? mods.chest - 1 : 0)));
    Bag.addItem(drop, n);
    const def = GameData.ITEMS[drop];
    // v31 修瑕：文案与实发同源——回复比例与 onVictory:233 同式（原恒写「三成」，诅咒祝福吸干后仍是死文案）
    const healPct = (mods.heal || 0) + 0.30 + (mods.healChest || 0);
    const healTxt = healPct > 0 ? `气血回复 ${Math.round(healPct * 100)}%` : '气血回复……宝气被诅咒祝福吸去了（0）';
    const v = await UI.popup({
      title: `✦ 登天塔 · 第 ${floor} 层宝箱`,
      html: `<div class="tip-line">石阶尽头的鎏金宝箱应声而开——</div>
        <div class="tip-line">· 灵石 <b class="hl">+${Utils.fmtNum(bonus)}</b>${mods.chest > 1 ? '（剥灵之手翻倍）' : ''}</div>
        <div class="tip-line">· ${this.gradeName(def)} ×${n}</div>
        <div class="tip-line">· ${healTxt}，塔风一清。</div>`,
      options: [{ text: '继续登层', value: true, primary: true }, { text: '收手离塔（带足战利品）', value: '__quit' }],
    });
    if (v === '__quit' || v == null) {
      if (v === '__quit') { this.leave(); return true; }
      // v35（E172）：ESC 对齐 blessStep——原静默滞留不续层，玩家被丢回游历页如同掉线
      // （宝箱重物已在弹窗前置入，故仅提示续层）
      if (advance) this.nextFloor();
      return false;
    }
    if (advance) this.nextFloor();
    return false;
  },

  gradeName(def) {
    const g = def.tier || def.grade || 1;
    return `<b class="grade-${g}">${def.name}</b>`;
  },

  /** 塔内败北：止步结算，无折损（Battle.defeat 的 ctx.tower 分支调用） */
  onDefeat() {
    const p = Game.player;
    const t = this.state(p);
    const floor = t.run ? t.run.floor : 0;
    t.run = null;
    Log.add(`你在登天塔第 ${floor} 层力竭而止——塔影散去，已得收获尽数落袋，本档最佳 第 ${t.best} 层。`, 'warn');
    UI.announce(`登天塔 · 止步第 ${floor} 层`, 'bad');
  },
  /** 塔内遁走：等同离塔（保全部收获） */
  onFlee() {
    const p = Game.player;
    const t = this.state(p);
    if (!t.run) return;
    const cleared = t.run.floor - 1;
    t.run = null;
    Log.add(`你从第 ${cleared + 1} 层遁走离塔——好汉不吃眼前亏，${cleared} 层收获俱在。`, 'system');
  },
};

window.TowerSys = TowerSys;   // v25：暴露全局以便调试与自动化测试
