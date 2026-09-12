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
  ],

  unlockOk(p) { return p.realmIdx >= 1; },
  extraCost(p) { return Math.round(80 * GameData.stoneEco(p.realmIdx)); },

  /** 塔状态自愈结构（老档无缝） */
  state(p) {
    if (!p.tower) p.tower = { best: 0, today: { day: 0, used: 0, bought: 0 }, run: null };
    if (!p.tower.today || typeof p.tower.today.day !== 'number') p.tower.today = { day: 0, used: 0, bought: 0 };
    return p.tower;
  },
  syncToday(p) {
    const t = this.state(p);
    const d = Math.floor(p.day || 0);
    if (t.today.day !== d) { t.today.day = d; t.today.used = 0; t.today.bought = 0; }
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

  /** 塔内守影：以本档妖兽池为底，按境界 + 层数深度缩放（词缀/习性天然继承） */
  foeFor(p, floor) {
    const target = Utils.clamp(p.realmIdx * 4 + Math.floor((floor - 1) / 2), 0, 60);
    const id = Utils.pick(Object.keys(GameData.MONSTERS));
    const e = buildMonster(id, target - GameData.MONSTERS[id].power);
    e.name = '塔影 · ' + e.name;
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
    if (p.hp <= 1) { UI.toast('气血近乎枯竭——先疗伤，或收手离塔'); UI.renderAll(); return; }
    const foe = this.foeFor(p, run.floor);
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
    const stones = Math.round((8 + run.floor * 3) * GameData.stoneEco(p.realmIdx) * (mods.stone || 1));
    Cultivate.addExp(p, exp);
    Bag.addStones(stones);
    p.counters.wins++;
    p.counters.towerWins = (p.counters.towerWins || 0) + 1;
    // 气血：五层大回复三成（+避劫福纹），其余层吃回春/深泉模组
    const st = Stat.compute(p);
    const healPct = (mods.heal || 0) + (run.floor % 5 === 0 ? 0.30 + (mods.healChest || 0) : 0);
    if (healPct > 0) p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * healPct));
    // 纪录（本档 + 跨世）
    if (run.floor > t.best) t.best = run.floor;
    if (run.floor > (p.counters.towerBest || 0)) p.counters.towerBest = run.floor;
    if (run.floor > (Meta.data.towerBest || 0)) { Meta.data.towerBest = run.floor; Meta.save(); }
    const floor = run.floor;
    run.floor++;
    Log.add(`登天塔第 ${floor} 层已克——层奖：修为 +${Utils.fmtNum(exp)}、灵石 +${Utils.fmtNum(stones)}${healPct > 0 ? `，气血回复 ${Math.round(healPct * 100)}%` : ''}。`, 'gain');
    Game.afterAction();
    // 每 5 层：宝箱；每 3 层：祝福三选一；其余层自动续层
    if (floor % 5 === 0) await this.chestStep(p, run, mods, floor);
    else if (floor % 3 === 0) await this.blessStep(p, run, floor);
    else { await Battle.wait(900); this.nextFloor(); }
  },

  /** 祝福三选一（第四项永远是离塔出口） */
  async blessStep(p, run, floor) {
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
    if (v === '__quit' || v == null) { if (v === '__quit') this.leave(); return; }
    run.buffs.push(v);
    const b = this.BUFFS.find(x => x.id === v);
    UI.toast(`✦ 塔心祝福：${b.name}`);
    Log.add(`塔心祝福入体：<b>${b.name}</b>——${b.desc}。`, 'gain');
    this.nextFloor();
  },

  /** 五层宝箱 */
  async chestStep(p, run, mods, floor) {
    const bonus = Math.round(20 * GameData.stoneEco(p.realmIdx) * (mods.stone || 1));
    Bag.addStones(bonus);
    const pool = [
      { id: 'm_gupian', w: 22 }, { id: 'tw_sand', w: 26 }, { id: 'tw_iron', w: 16 },
      { id: 'tw_core', w: 8 }, { id: 'pill_ningqi', w: 16 }, { id: 'pill_xisui', w: 6 },
      { id: 'tal_zilei', w: 6 },
    ].filter(x => GameData.ITEMS[x.id]);
    const total = pool.reduce((s, x) => s + x.w, 0);
    let roll = Math.random() * total, drop = pool[0].id;
    for (const x of pool) { roll -= x.w; if (roll <= 0) { drop = x.id; break; } }
    const n = 1 + (mods.chest ? mods.chest - 1 : 0);
    Bag.addItem(drop, n);
    const def = GameData.ITEMS[drop];
    const v = await UI.popup({
      title: `✦ 登天塔 · 第 ${floor} 层宝箱`,
      html: `<div class="tip-line">石阶尽头的鎏金宝箱应声而开——</div>
        <div class="tip-line">· 灵石 <b class="hl">+${Utils.fmtNum(bonus)}</b>${mods.chest > 1 ? '（剥灵之手翻倍）' : ''}</div>
        <div class="tip-line">· ${this.gradeName(def)} ×${n}</div>
        <div class="tip-line">· 气血回复三成，塔风一清。</div>`,
      options: [{ text: '继续登层', value: true, primary: true }, { text: '收手离塔（带足战利品）', value: '__quit' }],
    });
    if (v === '__quit' || v == null) { if (v === '__quit') this.leave(); return; }
    this.nextFloor();
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
