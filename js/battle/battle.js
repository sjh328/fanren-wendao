
/* ======================================================================
 * §14 战斗系统（回合制）
 * ====================================================================== */
const Battle = {
  active: null,

  async start(monsterId, ctx = {}) {
    if (this.active) return;
    const p = Game.player;
    const st = Stat.compute(p);
    if (p.hp <= 0) p.hp = 1;
    const enemy = ctx.enemy || buildMonster(monsterId);
    // §23 魔域狂化：气血/攻击/收益同步放大
    if (ctx.worldMul) {
      enemy.hpMax = Math.round(enemy.hpMax * ctx.worldMul);
      enemy.atk = Math.round(enemy.atk * ctx.worldMul);
      enemy.expGain = Math.round(enemy.expGain * ctx.worldMul);
      enemy.stoneGain = Math.round(enemy.stoneGain * ctx.worldMul);
    }
    enemy.hp = enemy.hpMax;
    // v13：敌方状态容器（玩家施加的减益）与铁壁/狂暴字段
    enemy.fx = [];
    enemy.guardRounds = 0; enemy.guardPower = 0;
    enemy.raged = false;
    enemy.charging = false;
    Anim.drop('bt-ehp', 'bt-hp', 'bt-mp');   // v4：新一场战斗，血量记忆清零
    // v6：图鉴收录（妖兽 / 常驻修士）
    if (enemy.id) Meta.see('monster', enemy.id);
    if (enemy.npcId) Meta.see('npc', enemy.npcId);
    this.active = {
      enemy, ctx,
      busy: false, over: false,
      defending: false,
      buffs: { defPower: 0, defRounds: 0, dodgeBonus: 0, dodgeRounds: 0 },
      menu: null,
      logs: [],
      floats: [],      // v7：浮动伤害/治疗数字队列（render 时飘出）
      hitShake: false, // v7：敌方受击震动标记
      morale: 0,       // v8：战意（0~100，攻防博弈资源，最高 +40% 伤害）
      infantSaved: false, // v10：元婴代死每场一次
      jadeSaved: false,   // v18：残玉玉灵护体每场一次（共鸣三重解锁）
      myFx: [],        // v13：玩家身上状态（增益 + 敌方施加的负面）
      combo: 0,        // v13：连击层数（普攻命中累积，受击中断）
      auto: false,     // v13：自动战斗开关
    };
    // v13：战斗速度偏好（1 / 2 / 极速），存偏好
    this.speed = this.speed || this.loadSpeed();
    p.counters.battles++;
    document.getElementById('battle-modal').classList.remove('hidden');
    if (typeof Ambience !== 'undefined' && Ambience.setMood) Ambience.setMood(ctx.boss ? 'boss' : 'battle');   // v19 情境配乐（守关 Boss 独立情境）
    this.log(`⚔ 于${ctx.mapName || '荒野'}遭遇 <b class="grade-0">${enemy.name}</b>（${enemy.realmLabel}${enemy.elite ? ' · 精英' : ''}）！`, 'warn');
    if (enemy._storyBark) this.log(enemy._storyBark, 'log-event');   // v19 剧情战入场台词
    if (ctx.spar) this.log('此为切磋较技，点到为止，不伤性命。', 'log-system');
    else if (ctx.mode === 'hunt') this.log('来者与你恩怨纠葛，今番不死不休！', 'log-warn');
    // v10 境界特性 · 灵压（筑基起）：先声夺人，敌方攻防被压制一成
    if (p.realmIdx >= 1) {
      enemy.atk = Math.round(enemy.atk * 0.9);
      enemy.def = Math.round(enemy.def * 0.9);
      this.log('【灵压】你气机一振，无形威压笼罩四野——敌方攻防被压制一成！', 'log-gain');
    }
    // v10 魔道六境·慑魂境：邪气慑魂，敌方暴击率减半
    if (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 4) {
      enemy.crit = Math.round((enemy.crit || 0) / 2);
      this.log('【慑魂】你眼底魔光一闪——敌方被慑得心神不定，暴击率减半！', 'log-gain');
    }
    // 阵道：抢先布阵，压制敌方三成攻防（困阵境压制四成）
    if (ctx.arraySetup) {
      const pot = ctx.arrayGrand ? 0.5 : (ctx.arrayPotent ? 0.6 : 0.7);
      enemy.atk = Math.round(enemy.atk * pot);
      enemy.def = Math.round(enemy.def * pot);
      this.log(ctx.arrayGrand
        ? '【天罗阵网】天地皆阵，敌方攻守被压制五成！'
        : ctx.arrayPotent
        ? '【困龙阵】阵旗早埋，阵光骤起——敌方攻守皆被压制四成！'
        : '你早已抢先布下两仪微尘阵！阵光流转间，敌方攻势守势皆被压制三成。', 'log-gain');
    } else if (p.dao === 'array' && DaoSys.tierLevel(p) >= 5 && Utils.chance(DaoSys.tierLevel(p) >= 6 ? 35 : 20)) {
      // v10 阵道三重 · 杀阵境：战斗开场两成几率直接布下杀阵
      enemy.atk = Math.round(enemy.atk * 0.6);
      enemy.def = Math.round(enemy.def * 0.6);
      this.log('【杀阵】你袖袍一振，杀阵先成——四方阵光封锁天地，敌方攻守尽堕四成！', 'log-crit');
    }
    this.render();
    // v19 真元与战斗统计、精英词缀掷取
    const B = this.active;
    B.zhenyuan = 0;
    B.stats = { out: 0, in: 0, maxCombo: 0 };
    if (B.enemy && B.enemy.elite) {
      const pool = GameData.ELITE_AFFIXES.slice();
      const n = Utils.chance(30) ? 2 : 1;
      B.enemyFxIds = [];
      for (let i = 0; i < n && pool.length; i++) {
        const a = pool.splice(Utils.rand(0, pool.length - 1), 1)[0];
        B.enemyFxIds.push(a.id);
        if (a.id === 'e_swift') B.enemy._fxSwift = true;
        if (a.id === 'e_wall') B.enemy._fxWall = true;
        if (a.id === 'e_reborn') B.enemy._rebornUsed = false;
        if (a.id === 'e_rage2') B.enemy._canRage2 = true;
      }
      if (B.enemyFxIds.length) this.log(`【${B.enemy.name}】词缀：${B.enemyFxIds.map(fid => { const d = GameData.ELITE_AFFIXES.find(x => x.id === fid); return d ? `◆${d.name}` : ''; }).join('')}——点其名旁 🔍 可查情报。`, 'log-warn');
    }
    // v19 词缀·护盾：战斗开场金光护体
    const startFx = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? ForgeSys.suffixFx(Game.player) : {};
    if (startFx.shield > 0) {
      StatusFx.add(B.myFx, { kind: 'shield', pct: Math.round(startFx.shield * 100), rounds: 2 });
      this.log('法宝灵光自发——一层金光罩住周身。', 'log-system');
    }
    if (ctx.firstStrike || ctx.ambush) {
      this.log(ctx.ambush ? '仇家蓄谋已久，抢先出手！' : '对方修为高深，抢先出手！', 'warn');
      await this.wait(600);
      await this.enemyTurn();
      if (!this.active) return;
      if (Game.player.hp <= 0 && !(await this.infantSave())) { await this.defeat(); return; }
      this.active.busy = false;
      this.render();
    }
  },

  /** v10 境界特性 · 元婴代死（元婴起）：每场战斗首次致命伤由元婴代受，保留两成五气血；
   *  v18 残玉共鸣三重 · 玉灵护体：元婴未成亦可由残玉代挡一次（保留一成五气血），每战一次 */
  infantSave() {
    const B = this.active;
    const p = Game.player;
    if (B && p && p.realmIdx >= 3 && !B.infantSaved) {
      B.infantSaved = true;
      const st = Stat.compute(p);
      p.hp = Math.max(1, Math.round(st.maxHp * 0.25));
      this.log('【元婴代死】千钧一发，元婴破窍而出替你受下这一击！你喷出一口精血，强行稳住道基。', 'log-crit');
      this.pushFloat('me', '元婴代死', 'heal');
      return true;
    }
    // v18 玉灵护体
    if (B && p && (p.jade || 0) >= 3 && !B.jadeSaved) {
      B.jadeSaved = true;
      const st = Stat.compute(p);
      p.hp = Math.max(1, Math.round(st.maxHp * 0.15));
      this.log('【玉灵护体】千钧一发，怀中残玉迸发温润光华，替你挡下这一击！玉面浮现一道细纹——它与你，共担此劫。', 'log-crit');
      this.pushFloat('me', '玉灵护体', 'heal');
      Ambience.sfx('rare');
      return true;
    }
    return false;
  },

  log(html, cls = 'log-battle') {
    // 同时写入战斗记录数组（render 重建 DOM 后可回放）与页面
    if (this.active) {
      this.active.logs.push({ html, cls });
      // 限长：超长战斗时避免回放成本随回合数无界增长
      if (this.active.logs.length > 120) this.active.logs.shift();
    }
    const box = document.getElementById('bt-log');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'log-entry ' + cls;
    div.innerHTML = html;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },

  /** v7：浮动数字（伤害/治疗/闪避），render 时在对应一侧飘出 */
  pushFloat(side, text, kind = 'dmg') {
    if (this.active) this.active.floats.push({ side, text, kind });
  },
  /** v8：战意增减（0~100）与伤害倍率（每点战意 +0.4%，满值 +40%） */
  addMorale(n) {
    const B = this.active;
    if (B) B.morale = Utils.clamp((B.morale || 0) + n, 0, 100);
  },
  moraleMul() {
    const B = this.active;
    return 1 + (B && B.morale ? B.morale * 0.004 : 0);
  },
  /** v13：连击倍率（每层 +4%，上限五层 +20%）；受击中断 */
  comboMul() {
    const B = this.active;
    const cap = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? 5 + (ForgeSys.suffixFx(Game.player).comboUp || 0) : 5;   // v19 词缀·连击上限
    return 1 + (B ? Math.min(cap, B.combo || 0) * 0.04 : 0);
  },
  /** v13：战斗速度（1=原速 2=两倍 3=极速），偏好持久化 */
  SPEED_KEY: 'fanren_wd_bspeed',
  loadSpeed() {
    try {
      const v = Number(Save.storage.getItem ? Save.storage.getItem(this.SPEED_KEY) : Save.mem[this.SPEED_KEY]);
      return [1, 2, 3].includes(v) ? v : 1;
    } catch (e) { return 1; }
  },
  setSpeed(v) {
    this.speed = v;
    try { if (Save.storage.setItem) Save.storage.setItem(this.SPEED_KEY, String(v)); else Save.mem[this.SPEED_KEY] = String(v); } catch (e) { /* ignore */ }
    if (this.active) this.render();
  },
  /** 统一等待（受战斗速度缩放：2=两倍速 3=极速） */
  wait(ms) {
    const mul = this.speed === 3 ? 0.15 : this.speed === 2 ? 0.5 : 1;
    return Utils.sleep(Math.max(30, Math.round(ms * mul)));
  },
  /** v13：玩家有效攻防（计入增益/减益状态与敌方铁壁等） */
  myAtk(st) {
    const B = this.active;
    let atk = st.atk;
    if (B) {
      atk *= 1 + StatusFx.pctOf(B.myFx, 'atkup') / 100;
      atk *= 1 - StatusFx.pctOf(B.myFx, 'weaken') / 100;
    }
    return Math.round(atk);
  },
  myDef(st) {
    const B = this.active;
    let def = st.def;
    if (B) {
      def *= 1 + StatusFx.pctOf(B.myFx, 'defup') / 100;
      def *= 1 - StatusFx.pctOf(B.myFx, 'defdown') / 100;
      def *= B.buffs.defRounds > 0 ? 1 + B.buffs.defPower / 100 : 1;
    }
    return Math.round(def);
  },
  mySpd(st) {
    const B = this.active;
    let spd = st.speed;
    if (B) {
      spd *= 1 + StatusFx.pctOf(B.myFx, 'agiup') / 100;
      spd *= 1 - StatusFx.pctOf(B.myFx, 'slow') / 100;
    }
    return Math.round(spd);
  },
  myCrit(st) {
    const B = this.active;
    return st.crit + (B ? StatusFx.pctOf(B.myFx, 'critup') : 0);
  },
  /** v13：敌方有效攻防（计入狂暴/铁壁/玩家施加的破防迟滞） */
  enAtk(e) {
    let atk = e.atk * (e.raged ? 1.3 : 1);
    if (e._phase2) atk *= 1.25;   // v19 Boss 二阶段：血线过半，杀意暴涨
    if (e._raged2) atk *= 1.3;    // v19 精英词缀·血性（二度狂暴）
    return Math.round(atk);
  },
  enDef(e) {
    let def = e.def * (1 - StatusFx.pctOf(e.fx, 'defdown') / 100);
    if (e.guardRounds > 0) def *= 1 + (e.guardPower || 0) / 100;
    if (e._fxWall) def *= 1.25;   // v19 精英词缀·坚甲
    return Math.round(def);
  },
  enSpd(e) {
    let spd = e.spd * (1 - StatusFx.pctOf(e.fx, 'slow') / 100);
    if (e._fxSwift) spd *= 1.2;   // v19 精英词缀·迅影
    return Math.max(1, Math.round(spd));
  },
  /** v19 敌方精英词缀判定 */
  eFx(B, id) { return !!(B.enemyFxIds && B.enemyFxIds.includes(id)); },
  /* ---------- v19 敌方情报卡 ---------- */
  infoCard() {
    const B = this.active;
    if (!B || !B.enemy) return;
    const e = B.enemy;
    const rel = GameData.speciesRelation(e.species, 'human');
    const relTxt = rel > 0 ? '<span class="neg">克制你（你对其伤害 -15%，其对你 +15%）</span>'
      : rel < 0 ? '<span style="color:var(--ok)">你克制它（伤害 +15%）</span>' : '无克制';
    const skillTxt = (e.skills || []).map(sk => `· <b>${sk.name}</b>（${StatusFx.DEFS[sk.kind] ? StatusFx.DEFS[sk.kind].name : sk.kind}）`).join('<br>') || '· 普攻与重击';
    const affTxt = (B.enemyFxIds || []).map(fid => { const d = (GameData.ELITE_AFFIXES || []).find(x => x.id === fid); return d ? `◆<b>${d.name}</b>：${d.desc}` : ''; }).filter(Boolean).join('<br>') || '无';
    const drops = e.dropTier ? `材料品阶：${['', '凡', '灵', '玄', '地'][e.dropTier] || e.dropTier}级${e.rareDrop ? `；稀有掉落：<b>${(GameData.ITEMS[e.rareDrop] || {}).name || '?'}</b>` : ''}` : '来历不明之物';
    UI.popup({
      title: `情报 · ${e.name}`,
      html: `<div class="tip-line">${e.realmLabel}${e.elite ? ' · 精英' : ''} · 战力 ${e.power}</div>
        <div class="stat-line"><span>种族克制</span><b>${relTxt}</b></div>
        <div class="stat-line"><span>攻/防/速</span><b>${this.enAtk(e)} / ${this.enDef(e)} / ${this.enSpd(e)}</b></div>
        <div class="tip-line" style="margin-top:4px">技能池：<br>${skillTxt}</div>
        <div class="tip-line" style="margin-top:4px">词缀：<br>${affTxt}</div>
        <div class="tip-line" style="margin-top:4px">${drops}</div>`,
      options: [{ text: '收 起', value: true, primary: true }],
    });
  },

  /* ---------- v19 职业必杀技 ---------- */
  ultList() {
    const p = Game.player;
    return p.dao ? (GameData.BATTLE_SKILLS[p.dao] || []) : [];
  },
  async actUlt(id) {
    const B = this.active;
    const p = Game.player;
    const st = Stat.compute(p);
    if (!B || B.over || B.busy) return;
    const sk = this.ultList().find(x => x.id === id);
    if (!sk) return;
    if ((B.zhenyuan || 0) < sk.cost) { UI.toast('真元不足'); return; }
    B.busy = true;
    B.zhenyuan -= sk.cost;
    B.menu = null;
    this.log(`【必杀 · ${sk.name}】${sk.desc}`, 'log-crit');
    Ambience.sfx('crit');
    this.fxShow({ sword: 'sword', pill: 'fire', talisman: 'lightning', body: 'quake', array: 'array', demonic: 'demonic' }[p.dao] || 'sword');   // v19 必杀全屏特效
    await this.wait(500);
    const hits = sk.hits || 1;
    if (sk.selfHp) { p.hp = Math.max(1, Math.round(p.hp * (1 - sk.selfHp))); this.log(`你燃血催招，气血降至 ${p.hp}！`, 'log-warn'); }
    for (let h = 0; h < hits && B.enemy.hp > 0; h++) {
      let dmg = Stat.afterDef(this.myAtk(st) * (sk.mult || 1), this.enDef(B.enemy)) * Utils.randF(0.95, 1.2) * this.moraleMul();
      const crit = Utils.chance(this.myCrit(st) + (sk.crit || 0));
      if (crit) dmg *= 1.7;
      dmg = Math.max(1, Math.round(dmg));
      B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
      B.stats.out += dmg;
      this.pushFloat('enemy', `-${dmg}`, crit ? 'crit' : 'dmg');
      B.hitShake = true;
      this.addMorale(10);
      if (sk.leech && p.hp < st.maxHp) {
        const heal = Math.max(1, Math.round(dmg * sk.leech));
        p.hp = Math.min(st.maxHp, p.hp + heal);
        this.log(`血气倒灌——回复 <b>${heal}</b> 点气血。`, 'log-gain');
      }
      await this.wait(360);
      if (hits > 1) this.log(`第二段杀招接踵而至！再造成 <b>${Math.max(0, dmg)}</b> 点伤害。`, 'log-crit');
    }
    if (sk.heal) {
      const heal = Math.round(st.maxHp * sk.heal);
      p.hp = Math.min(st.maxHp, p.hp + heal);
      this.log(`丹香入腹——回复 <b>${heal}</b> 点气血。`, 'log-gain');
    }
    if (sk.burn && B.enemy.hp > 0) { StatusFx.add(B.enemy.fx, { kind: 'burn', pct: sk.burn.pct, rounds: sk.burn.rounds }); this.log(`${B.enemy.name} 被丹火缠身！`, 'log-gain'); }
    if (sk.defdown && B.enemy.hp > 0) { StatusFx.add(B.enemy.fx, { kind: 'defdown', pct: sk.defdown, rounds: sk.rounds || 2 }); this.log(`${B.enemy.name} 防御大破！`, 'log-gain'); }
    if (sk.weaken && B.enemy.hp > 0) { StatusFx.add(B.enemy.fx, { kind: 'weaken', pct: sk.weaken, rounds: sk.rounds || 2 }); this.log(`${B.enemy.name} 力量被蚀！`, 'log-gain'); }
    if (sk.slow && B.enemy.hp > 0) { StatusFx.add(B.enemy.fx, { kind: 'slow', pct: sk.slow, rounds: sk.rounds || 2 }); this.log(`${B.enemy.name} 身形迟滞！`, 'log-gain'); }
    if (sk.guard) { StatusFx.add(B.myFx, { kind: 'shield', pct: sk.guard, rounds: sk.rounds || 3 }); this.log('金身罩体，水火难侵！', 'log-gain'); }
    if (sk.stun && B.enemy.hp > 0 && Utils.chance(sk.stun)) { StatusFx.add(B.enemy.fx, { kind: 'stun', rounds: 1 }); this.log(`${B.enemy.name} 被震得神魂摇晃，下回合难以行动！`, 'log-gain'); }
    if (sk.freeze && B.enemy.hp > 0 && Utils.chance(sk.freeze)) { StatusFx.add(B.enemy.fx, { kind: 'freeze', rounds: 1 }); this.log(`紫雷封形——${B.enemy.name} 被冻结一回合！`, 'log-gain'); }
    if (B.enemy.hp <= 0) { await this.victory(); return; }
    await this.enemyTurn(st);
    if (!B.over) { if (await this.afterEnemyPhase(st)) return; }
    this.render();
    B.busy = false;
    this.autoNext();
  },

  /** v13：给敌方施加状态（符箓/破煞法诀） */
  applyEnemyFx(e, st, logFmt) {
    StatusFx.add(e.fx, st);
    const d = StatusFx.DEFS[st.kind];
    if (d) this.log(logFmt || `${e.name} 陷入【${d.name}】${st.pct ? `（${Math.round(st.pct)}%）` : ''}，持续 ${st.rounds} 回合！`, 'log-gain');
  },
  /** v13：结算一方的 DOT（dot 状态按最大生命百分比损血），返回文案 */
  tickDots(who) {
    const B = this.active;
    if (!B) return '';
    const parts = [];
    if (who === 'me') {
      const p = Game.player;
      const st = Stat.compute(p);
      let dotDmg = 0;
      for (const x of B.myFx) {
        if (!(StatusFx.DEFS[x.kind] || {}).dot) continue;
        dotDmg += Math.max(1, Math.round(st.maxHp * (x.pct || 3) / 100));
      }
      if (dotDmg > 0) {
        p.hp = Math.max(0, p.hp - dotDmg);
        this.pushFloat('me', `-${dotDmg}`, 'dmg');
        parts.push(`（毒火蚀体，气血 -${dotDmg}）`);
      }
      B.myFx = StatusFx.decayDots(B.myFx);
    } else {
      const e = B.enemy;
      let dotDmg = 0;
      for (const x of e.fx) {
        if (!(StatusFx.DEFS[x.kind] || {}).dot) continue;
        dotDmg += Math.max(1, Math.round(e.hpMax * (x.pct || 3) / 100));
      }
      if (dotDmg > 0) {
        e.hp = Math.max(0, e.hp - dotDmg);
        this.pushFloat('enemy', `-${dotDmg}`, 'dmg');
        parts.push(`${e.name} 在毒火中哀嚎（气血 -${dotDmg}）`);
      }
      e.fx = StatusFx.decayDots(e.fx);
    }
    return parts.join('');
  },

  async act(kind, arg) {
    const B = this.active;
    if (!B || B.busy || B.over) return;
    const p = Game.player;
    const st = Stat.compute(p);
    B.busy = true;
    B.menu = null;
    this.render();
    try {
    // v13 束缚/冰封：本次行动被跳过，控制状态随即消耗
    if (StatusFx.has(B.myFx, 'stun') || StatusFx.has(B.myFx, 'freeze')) {
      const frozen = StatusFx.has(B.myFx, 'freeze');
      this.log(`你身形被【${frozen ? '冰封' : '束缚'}】禁锢，这一回合无法动弹！`, 'log-warn');
      B.myFx = StatusFx.removeKinds(B.myFx, ['stun', 'freeze']);
      this.render();
      await this.wait(500);
      await this.enemyTurn();
      if (!this.active) return;
      if (await this.afterEnemyPhase(st)) return;
      B.busy = false;
      this.render();
      this.autoNext();
      return;
    }
    // v13 灵兽协助：出战灵兽有四成几率抢先扑击
    if (typeof BeastSys !== 'undefined' && await BeastSys.assist(st)) { await this.victory(); return; }
    switch (kind) {
      case 'attack': {
        const daoTier = DaoSys.tierLevel(p);
        const enSpd = this.enSpd(B.enemy);
        // v10 剑心六境·剑仙境：普攻必中
        const miss = (p.dao === 'sword' && daoTier >= 6) ? 0 : Utils.clamp(3 + (enSpd - this.mySpd(st)), 2, 35);
        if (Utils.chance(miss)) {
          this.log(`你奋力一击，却被 ${B.enemy.name} 敏捷地避开了！`);
          this.pushFloat('enemy', '闪避', 'miss');
          Ambience.sfx('miss');
          this.addMorale(-4);
          B.combo = 0;
        } else {
          let dmg = Stat.afterDef(this.myAtk(st), this.enDef(B.enemy)) * Utils.randF(0.85, 1.15) * this.moraleMul() * this.comboMul();
          // v18 种族克制
          const speciesRel = GameData.speciesRelation(p.dao ? 'human' : 'human', B.enemy.species);
          if (speciesRel > 0) dmg *= 1.15;
          else if (speciesRel < 0) dmg *= 0.85;
          const eqFx = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? ForgeSys.suffixFx(p) : {};   // v19 词缀特效
          // v19 词缀·斩杀：对血量低于两成的敌人增伤
          if (eqFx.execute > 0 && B.enemy.hp < B.enemy.hpMax * 0.2) dmg *= 1 + eqFx.execute;
          const crit = Utils.chance(this.myCrit(st));
          // v10 剑心六境·剑芒境：暴击伤害 +20%
          if (crit) dmg *= (p.dao === 'sword' && daoTier >= 2 ? 1.9 : 1.7);
          // 剑修：剑心通明伤害翻倍（剑心通明境触发率提至三成）
          const jianxin = p.dao === 'sword' && Utils.chance(daoTier >= 3 ? 30 : 20);
          if (jianxin) dmg *= 2;
          // v10 般若六境·易筋境：普攻伤害 +10%
          if (p.dao === 'body' && daoTier >= 4) dmg *= 1.1;
          dmg = Math.max(1, Math.round(dmg));
          B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
          const comboCap = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? 5 + (ForgeSys.suffixFx(p).comboUp || 0) : 5;   // v19 词缀·连击上限
          B.combo = Math.min(comboCap, (B.combo || 0) + 1);   // v13 连击累积
          B.stats.out += dmg; if (B.combo > B.stats.maxCombo) B.stats.maxCombo = B.combo;   // v19 统计
          B.zhenyuan = Math.min(6, (B.zhenyuan || 0) + (crit || jianxin ? 2 : 1));   // v19 真元
          if (p.dao === 'sword') DaoSys.gain(p, (crit || jianxin) ? 20 : 12);   // v16 剑意
          this.pushFloat('enemy', `-${dmg}`, (crit || jianxin) ? 'crit' : 'dmg');
          B.hitShake = true;
          if (crit) Ambience.sfx('crit');
          this.addMorale((crit || jianxin) ? 18 : 12);
          const comboTxt = B.combo >= 2 ? `<span style="color:var(--gold)">连击×${B.combo}</span>` : '';
          const tags = [crit ? '会心一击！' : '', jianxin ? '【剑心通明】！' : '', comboTxt].filter(Boolean).join('');
          this.log(`${tags}${Narrative.attack()}，对 ${B.enemy.name} 造成 <b>${dmg}</b> 点伤害。`, (crit || jianxin) ? 'log-crit' : 'log-battle');   // v5：招式语气随道途
          // v18 残玉共鸣六重 · 血河噬敌：普攻命中，按自身孽障汲取对方精元为修为（每10点孽障+1%伤害转化，上限三成）
          if ((p.jade || 0) >= 6 && (p.karma || 0) > 0) {
            const drain = Math.round(dmg * Math.min(0.3, (p.karma || 0) * 0.001));
            if (drain > 0) { Cultivate.addExp(p, drain, true); this.pushFloat('me', `+${drain}修为`, 'heal'); }
          }
          // v10 剑心六境·剑气境「剑意初鸣」：一成五几率剑气余韵，追加三成伤害
          if (p.dao === 'sword' && daoTier >= 1 && B.enemy.hp > 0 && Utils.chance(15)) {
            const echo = Math.max(1, Math.round(dmg * 0.3));
            B.enemy.hp = Math.max(0, B.enemy.hp - echo);
            this.log(`剑气余韵追至！再对 ${B.enemy.name} 造成 <b>${echo}</b> 点伤害。`, 'log-crit');
          }
          // v10 境界特性 · 法相（合体起）：两成几率引动法相，追加五成攻击的一击
          if (p.realmIdx >= 6 && B.enemy.hp > 0 && Utils.chance(20)) {
            const extra = Math.max(1, Math.round(st.atk * 0.5));
            B.enemy.hp = Math.max(0, B.enemy.hp - extra);
            this.log(`【法相】天地法相随行，一掌拍落！追加 <b>${extra}</b> 点伤害！`, 'log-crit');
          }
          // v10 般若六境·金刚境：普攻附带两成吸血
          if (p.dao === 'body' && daoTier >= 5 && p.hp < st.maxHp) {
            const heal = Math.max(1, Math.round(dmg * 0.2));
            p.hp = Math.min(st.maxHp, p.hp + heal);
            this.log(`金刚不坏，血气反哺——回复 <b>${heal}</b> 点气血。`, 'log-gain');
          }
          // v10 魔道六境·炼髓境：普攻附带一成吸血
          if (p.dao === 'demonic' && daoTier >= 2 && p.hp < st.maxHp) {
            const heal2 = Math.max(1, Math.round(dmg * 0.1));
            p.hp = Math.min(st.maxHp, p.hp + heal2);
            this.log(`炼髓噬血——回复 <b>${heal2}</b> 点气血。`, 'log-gain');
          }
          // v19 词缀·吸血/夺魄：普攻回复伤害的气血
          if (eqFx.leech > 0 && p.hp < st.maxHp) {
            const heal3 = Math.max(1, Math.round(dmg * eqFx.leech));
            p.hp = Math.min(st.maxHp, p.hp + heal3);
            this.log(`【词缀·吸血】血气倒流——回复 <b>${heal3}</b> 点气血。`, 'log-gain');
          }
          // v19 精英词缀·魔棘：敌受击反弹一成五
          if (this.eFx(B, 'e_thorns') && p.hp > 0) {
            const back = Math.max(1, Math.round(dmg * 0.15));
            p.hp = Math.max(0, p.hp - back);
            this.pushFloat('me', `-${back}`, 'dmg');
            this.log(`【魔棘】${B.enemy.name} 周身魔刺反卷——你受 <b>${back}</b> 点伤害！`, 'log-warn');
          }
          // v19 精英词缀·不灭：濒死复活一次
          if (B.enemy.hp <= 0 && this.eFx(B, 'e_reborn') && !B.enemy._rebornUsed) {
            B.enemy._rebornUsed = true;
            B.enemy.hp = Math.round(B.enemy.hpMax * 0.3);
            this.log(`【不灭】${B.enemy.name} 气息骤然暴涨——它以三成气血自死境爬了回来！`, 'log-warn');
            UI.toast(`${B.enemy.name} 触发【不灭】！`, true);
          }
        }
        break;
      }
      case 'skill': {
        const g = p.gongfa[arg];
        const def = GameData.ITEMS[arg];
        if (!g || !def || !def.skill) break;
        const sk = def.skill;
        const cost = Math.ceil(st.maxMp * sk.mp / 100 * (p.dao === 'talisman' ? 1.2 : 1)); // 符修：法诀灵力消耗+20%
        if (p.mp < cost) { this.log('灵力不足，法诀难以催动！', 'log-warn'); B.busy = false; this.render(); return; }
        p.mp -= cost;
        let power = sk.power * (1 + (g.level - 1) * 0.06);
        // v10 剑心三境·第三重「万剑归宗」：法诀伤害 +25%
        if (p.dao === 'sword' && DaoSys.tierLevel(p) >= 5) power *= 1.25;
        if (sk.kind === 'damage') {
          const miss = Utils.clamp(3 + (this.enSpd(B.enemy) - this.mySpd(st)), 2, 35);
          if (Utils.chance(miss)) {
            this.log(`你施展【${sk.name}】，却被对方堪堪避过！`);
            this.pushFloat('enemy', '闪避', 'miss');
          } else {
            let dmg = Stat.afterDef(this.myAtk(st) * power, this.enDef(B.enemy)) * Utils.randF(0.9, 1.15) * this.moraleMul() * this.comboMul();
            const crit = Utils.chance(this.myCrit(st));
            if (crit) dmg *= 1.7;
            dmg = Math.max(1, Math.round(dmg));
            B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
            this.pushFloat('enemy', `-${dmg}`, crit ? 'crit' : 'dmg');
            B.hitShake = true;
            this.addMorale(10);
            Battle.fxShow('sword');
            this.log(`你施展 <b>${sk.name}</b>！${crit ? '会心一击！' : ''}造成 <b>${dmg}</b> 点伤害！`, 'log-crit');
          }
        } else if (sk.kind === 'heal') {
          const heal = Math.round(st.maxHp * power / 100);
          p.hp = Math.min(st.maxHp, p.hp + heal);
          this.pushFloat('me', `+${heal}`, 'heal');
          this.log(`你施展 <b>${sk.name}</b>，气血恢复 ${heal} 点。`, 'log-gain');
        } else if (sk.kind === 'buffDef') {
          B.buffs.defPower = power; B.buffs.defRounds = sk.rounds;
          this.log(`你施展 <b>${sk.name}</b>，周身罡气激荡，防御大增！`, 'log-gain');
        } else if (sk.kind === 'buffDodge') {
          B.buffs.dodgeBonus = power; B.buffs.dodgeRounds = sk.rounds;
          this.log(`你施展 <b>${sk.name}</b>，身形化作残影！`, 'log-gain');
        }
        break;
      }
      case 'item': {
        if (!Bag.count(arg)) break;
        const def = GameData.ITEMS[arg];
        // v10 符道三境·第三重「言出法随」：符修祭符两成几率不消耗
        const freeCast = def.type === 'talisman' && p.dao === 'talisman' && DaoSys.tierLevel(p) >= 5 && Utils.chance(35);
        if (!freeCast) Bag.removeItem(arg, 1);
        if (def.type === 'talisman') {
          DaoSys.gain(p, 12);   // v16 符道：祭符
          const fk = def.fkind || 'damage';
          if (fk === 'damage') {
            // 伤害符：符光必中，高额爆发（雷笔境 +30%）
            let dmg = Stat.afterDef(st.atk * (def.power || 2.2), this.enDef(B.enemy)) * Utils.randF(0.95, 1.1) * this.moraleMul() * this.comboMul();
            if (p.dao === 'talisman' && DaoSys.tierLevel(p) >= 3) dmg *= 1.3;   // v10 符道六境·雷笔境
            dmg = Math.max(1, Math.round(dmg));
            B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
            this.pushFloat('enemy', `-${dmg}`, 'crit');
            B.hitShake = true;
            this.addMorale(8);
            Battle.fxShow(fk === 'damage' && (def.power || 0) >= 3 ? 'lightning' : 'fire');
            this.log(`${freeCast ? '【言出法随】指尖符光自生，此符未耗！' : `你祭出 <b>${def.name}</b>！`}符光如电，轰然炸裂——对 ${B.enemy.name} 造成 <b>${dmg}</b> 点伤害！`, 'log-crit');
            if (def.debuff) {
              for (const [kind, pct] of Object.entries(def.debuff)) {
                if (kind === 'rounds') continue;
                this.applyEnemyFx(B.enemy, { kind, pct, rounds: def.debuff.rounds || 2 });
              }
            }
            // v10 符道六境·追雷境：三成几率引动追雷
            if (p.dao === 'talisman' && DaoSys.tierLevel(p) >= 4 && B.enemy.hp > 0 && Utils.chance(30)) {
              const thunder = Math.max(1, Math.round(st.atk * 0.2));
              B.enemy.hp = Math.max(0, B.enemy.hp - thunder);
              this.log(`一道追雷随符而落！再对 ${B.enemy.name} 造成 <b>${thunder}</b> 点伤害！`, 'log-crit');
            }
          } else if (fk === 'shield') {
            StatusFx.add(B.myFx, { kind: 'shield', pct: def.power || 40, rounds: def.rounds || 2 });
            this.pushFloat('me', '金光护体', 'heal');
            this.log(`你祭出 <b>${def.name}</b>——金光罩体，${def.rounds || 2} 回合内所受伤害减轻${def.power || 40}%！`, 'log-gain');
          } else if (fk === 'dodge') {
            StatusFx.add(B.myFx, { kind: 'agiup', pct: 30, rounds: def.rounds || 2 });
            B.buffs.dodgeBonus = def.power || 25; B.buffs.dodgeRounds = def.rounds || 2;
            this.log(`你祭出 <b>${def.name}</b>——身化疾风，来去无踪！`, 'log-gain');
          } else if (fk === 'slow') {
            Battle.fxShow('ice');
            this.applyEnemyFx(B.enemy, { kind: 'slow', pct: def.power || 30, rounds: def.rounds || 2 }, `【${def.name}】符光化索缚住 ${B.enemy.name}——其身法迟滞${def.power || 30}%，持续 ${def.rounds || 2} 回合！`);
          } else if (fk === 'defdown') {
            Battle.fxShow('fire');
            this.applyEnemyFx(B.enemy, { kind: 'defdown', pct: def.power || 35, rounds: def.rounds || 2 }, `【${def.name}】腐甲蚀骨——${B.enemy.name} 防御剧降${def.power || 35}%，持续 ${def.rounds || 2} 回合！`);
          } else if (fk === 'freeze') {
            Battle.fxShow('ice');
            const resist = B.enemy.elite ? 30 : 12;
            if (Utils.chance(resist)) {
              this.log(`【${def.name}】寒气罩落，却被 ${B.enemy.name} 以妖力震碎——未能封住其身形！`, 'log-warn');
            } else {
              this.applyEnemyFx(B.enemy, { kind: 'freeze', rounds: def.rounds || 1 }, `【${def.name}】寒气封形——${B.enemy.name} 被冰封，下一回合无法动弹！`);
            }
          }
        } else if (def.buff) {
          // v13 战斗增益丹：狂暴 / 铁骨 / 轻身 / 明目
          const b = def.buff;
          if (b.atkPct) StatusFx.add(B.myFx, { kind: 'atkup', pct: b.atkPct, rounds: b.rounds || 3 });
          if (b.defPct) StatusFx.add(B.myFx, { kind: 'defup', pct: b.defPct, rounds: b.rounds || 3 });
          if (b.spdPct || b.dodge) StatusFx.add(B.myFx, { kind: 'agiup', pct: Math.max(b.spdPct || 0, b.dodge || 0), rounds: b.rounds || 3 });
          if (b.crit) StatusFx.add(B.myFx, { kind: 'critup', pct: b.crit, rounds: b.rounds || 3 });
          this.pushFloat('me', def.name, 'heal');
          this.log(`你服下 <b>${def.name}</b>——${def.desc.split('——')[1] || '气力涌动'}！`, 'log-gain');
        } else {
          Pill.apply(p, def, true);
          this.log(`你服下 <b>${def.name}</b>！`, 'log-gain');
        }
        break;
      }
      case 'defend': {
        B.defending = true;
        if (p.dao === 'body') DaoSys.gain(p, 6);   // v16 体魄
        this.addMorale(6);
        B.zhenyuan = Math.min(6, (B.zhenyuan || 0) + 1);   // v19 真元
        p.mp = Math.min(st.maxMp, p.mp + Math.round(st.maxMp * 0.15));
        this.log('你凝神戒备，摆出防御姿态，灵力缓缓回复，战意亦在蓄积。', 'log-gain');
        break;
      }
      case 'flee': {
        const chance = Utils.clamp(45 + (st.speed - B.enemy.spd) * 2, 10, 90);
        if (Utils.chance(chance)) {
          this.log('你虚晃一招，遁走而去，好汉不吃眼前亏！', 'log-warn');
          await this.wait(700);
          if (B.ctx.spar) NpcSys.afterSpar(p, B.ctx.npcId, false);
          if (B.ctx.dungeon) DungeonSys.onFlee();
          this.end(false);
          return;
        }
        this.log('你转身欲逃，却被对方拦住去路！', 'log-warn');
        break;
      }
    }
    this.render();
    if (B.enemy.hp <= 0) { await this.victory(); return; }
    await this.wait(560);
    await this.enemyTurn();
    if (!this.active) return;
    if (await this.afterEnemyPhase(st)) return;
    B.busy = false;
    this.render();
    this.autoNext();
    } catch (err) {
      // 兜底：任何异常都不能让战斗永久卡死（busy 不复位会禁用所有按钮）
      console.error('战斗异常:', err);
      B.busy = false;
      if (!B.over) { this.log('（气机一时紊乱，此回合作废）', 'log-warn'); this.render(); }
    }
  },

  /** v13：敌方回合后的统一收尾（玩家 DOT 结算 / 死亡判定 / 增益衰减 / 不灭回血 / 回合推进） */
  async afterEnemyPhase(st) {
    const B = this.active;
    const p = Game.player;
    if (!B) return true;
    // 玩家身上 DOT 结算（毒/焰/血）
    const dotTxt = this.tickDots('me');
    if (dotTxt) { this.log(dotTxt, 'log-loss'); this.render(); }
    if (p.hp <= 0 && !(await this.infantSave())) { await this.defeat(); return true; }
    if (!this.active) return true;   // 回溯/转世等导致战斗被清空的兜底
    // v10 般若六境·不灭境：行动一次，气血自续
    if (p.dao === 'body' && DaoSys.tierLevel(p) >= 6 && Game.player.hp > 0 && Game.player.hp < st.maxHp) {
      const regen = Math.max(1, Math.round(st.maxHp * 0.03));
      Game.player.hp = Math.min(st.maxHp, Game.player.hp + regen);
      this.log(`不灭金身生生不息——气血自续 ${regen} 点。`, 'log-gain');
    }
    // v19 词缀·回灵/凝气：每回合回复灵力
    const turnFx = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? ForgeSys.suffixFx(p) : {};
    if (turnFx.mpRegen > 0 && p.mp > 0 && p.mp < st.maxMp) {
      const mpReg = Math.max(1, Math.round(st.maxMp * turnFx.mpRegen * 0.01));
      p.mp = Math.min(st.maxMp, p.mp + mpReg);
      this.log(`法宝温养灵台——灵力回涌 ${mpReg} 点。`, 'log-gain');
    }
    B.turn = (B.turn || 1) + 1;
    return false;
  },

  /** v13 自动战斗：回合收尾后若开启自动，择机自动出招（策略：残血吃丹 → 敌蓄力则防御 → 有蓝放最强法诀 → 普攻） */
  autoNext() {
    const B = this.active;
    if (!B || B.over || !B.auto || B.busy) return;
    setTimeout(() => {
      const b2 = this.active;
      if (!b2 || b2.over || !b2.auto || b2.busy) return;
      this.autoPilot();
    }, Math.max(120, Math.round(420 * (this.speed === 3 ? 0.15 : this.speed === 2 ? 0.5 : 1))));
  },
  autoPilot() {
    const B = this.active;
    const p = Game.player;
    const st = Stat.compute(p);
    if (!B || B.busy || B.over) return;
    // 1) 残血：优先疗伤丹，其次大还丹/固本丹
    if (p.hp < st.maxHp * 0.4) {
      const healPill = ['pill_dahuan', 'pill_guben', 'pill_liaoshang'].find(id => Bag.count(id) > 0);
      if (healPill) { this.act('item', healPill); return; }
    }
    // 2) 敌方蓄力杀招在即：防御化解
    if (B.enemy.charging) { this.act('defend'); return; }
    // 3) 被束缚/冰封：行动会被跳过，直接点防御等待
    if (StatusFx.has(B.myFx, 'stun') || StatusFx.has(B.myFx, 'freeze')) { this.act('defend'); return; }
    // v19 3.5) 职业必杀策略表：真元够且条件满足即施放（各道打法各异）
    const ultStrategy = {
      sword:    { id: 'us1', when: () => B.enemy.hp > B.enemy.hpMax * 0.5 },                 // 敌健在则剑斩削血
      pill:     { id: 'up2', when: () => p.hp < st.maxHp * 0.65 },                            // 血线偏低以丹心续命
      talisman: { id: 'ut1', when: () => B.enemy.hp > B.enemy.hpMax * 0.2 },                 // 雷狱压制
      body:     { id: 'ub1', when: () => !!B.enemy.elite || B.enemy.hp > B.enemy.hpMax * 0.7 }, // 精英或开局崩山震
      array:    { id: 'ua2', when: () => B.enemy.hp > B.enemy.hpMax * 0.3 },                 // 八方杀阵收割
      demonic:  { id: 'ud1', when: () => p.hp < st.maxHp * 0.7 },                            // 血遁吸血续航
    }[p.dao];
    if (ultStrategy && (B.zhenyuan || 0) >= 3 && ultStrategy.when()) {
      const sk = (GameData.BATTLE_SKILLS[p.dao] || []).find(x => x.id === ultStrategy.id);
      if (sk && (B.zhenyuan || 0) >= sk.cost) { this.actUlt(ultStrategy.id); return; }
    }
    // v18 4) 自动祭符：符修优先，伤害符/控制符
    if (p.dao === 'talisman') {
      const talList = Object.entries(p.bag).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman');
      if (talList.length) {
        // 优先伤害符，其次控制符
        const dmgTal = talList.find(([id]) => GameData.ITEMS[id].fkind === 'damage');
        const controlTal = talList.find(([id]) => ['slow', 'defdown', 'freeze'].includes(GameData.ITEMS[id].fkind || ''));
        if (dmgTal) { this.act('item', dmgTal[0]); return; }
        if (controlTal && !StatusFx.has(B.enemy.fx, 'slow') && !StatusFx.has(B.enemy.fx, 'defdown')) {
          this.act('item', controlTal[0]); return;
        }
      }
    }
    // 5) 蓝够：放威力最高的伤害法诀（血量低时优先治疗法诀）
    const skills = Object.entries(p.gongfa)
      .filter(([id]) => {
        const d = GameData.ITEMS[id];
        if (!d || !d.skill) return false;
        const cost = Math.ceil(st.maxMp * d.skill.mp / 100 * (p.dao === 'talisman' ? 1.2 : 1));
        return p.mp >= cost;
      });
    if (skills.length) {
      const healSkills = skills.filter(([id]) => (GameData.ITEMS[id].skill || {}).kind === 'heal');
      const dmgSkills = skills.filter(([id]) => (GameData.ITEMS[id].skill || {}).kind === 'damage');
      if (p.hp < st.maxHp * 0.35 && healSkills.length) { this.act('skill', healSkills[0][0]); return; }
      if (dmgSkills.length) {
        dmgSkills.sort((a, b) => (GameData.ITEMS[b[0]].skill.power) - (GameData.ITEMS[a[0]].skill.power));
        this.act('skill', dmgSkills[0][0]);
        return;
      }
    }
    // 6) 默认普攻
    this.act('attack');
  },

  async enemyTurn() {
    const B = this.active;
    if (!B || B.over) return;
    const p = Game.player;
    const st = Stat.compute(p);
    const e = B.enemy;
    // v19 Boss 二阶段：血线过半，杀意暴涨
    if (!e._phase2 && e.hp > 0 && e.hp < e.hpMax * 0.5) {
      e._phase2 = true;
      this.log(`<b>${e.name} 血线过半，杀意暴涨——它的气息陡然凌厉了数分！</b>`, 'log-warn');
      UI.toast(`${e.name} 进入狂乱状态！`, true);
    }
    // v19 精英词缀·血性：狂暴后可再度狂暴
    if (e.raged && e._canRage2 && !e._raged2 && e.hp > 0 && e.hp < e.hpMax * 0.4) {
      e._raged2 = true;
      this.log(`【血性】${e.name} 目眦欲裂，狂暴之上再燃狂暴——攻 +30%！`, 'log-warn');
    }
    await this.wait(420);
    // v13 敌方 DOT 结算（毒/焰/血）与控制判定（被缚/冰封则跳过本回合）
    const dotTxt = this.tickDots('enemy');
    if (dotTxt) this.log(dotTxt, 'log-gain');
    if (e.hp <= 0) return;
    if (StatusFx.has(e.fx, 'stun') || StatusFx.has(e.fx, 'freeze')) {
      const frozen = StatusFx.has(e.fx, 'freeze');
      this.log(`${e.name} 被【${frozen ? '冰封' : '束缚'}】困住，这一回合动弹不得！`, 'log-gain');
      e.fx = StatusFx.removeKinds(e.fx, ['stun', 'freeze']);
      await this.wait(400);
      return;
    }
    // v13 精英狂暴：血量低于四成触发一次
    if (e.elite && !e.raged && e.hp <= e.hpMax * 0.4) {
      e.raged = true;
      this.log(`<b>【狂暴】</b>${e.name} 目眦欲裂，妖气暴涨如潮——它已入狂暴之态，攻势凌厉了三分！`, 'log-crit');
      this.pushFloat('enemy', '狂暴', 'crit');
      Ambience.sfx('rage');
      await this.wait(500);
    }
    // v18 敌方 AI 状态机：根据血量/状态/技能池做决策
    const rageBonus = e.raged ? 8 : 0;
    const hpPct = e.hp / e.hpMax;
    const hasSkill = e.skills && e.skills.length > 0;
    // 玩家状态检测
    const playerHasDebuff = StatusFx.has(B.myFx, 'defdown') || StatusFx.has(B.myFx, 'weaken') || StatusFx.has(B.myFx, 'slow');
    const playerLowHp = p.hp < st.maxHp * 0.4;
    const playerBuffed = StatusFx.has(B.myFx, 'atkup') || StatusFx.has(B.myFx, 'defup') || StatusFx.has(B.myFx, 'agiup');
    // 收集可用技能类型
    const healSkill = hasSkill ? e.skills.find(s => s.kind === 'heal') : null;
    const guardSkill = hasSkill ? e.skills.find(s => s.kind === 'guard') : null;
    const debuffSkill = hasSkill ? e.skills.find(s => ['defdown', 'slow', 'weaken', 'poison', 'burn', 'bleed'].includes(s.kind)) : null;
    const controlSkill = hasSkill ? e.skills.find(s => ['stun', 'freeze'].includes(s.kind)) : null;
    const drainSkill = hasSkill ? e.skills.find(s => s.kind === 'drain') : null;
    const roarSkill = hasSkill ? e.skills.find(s => s.kind === 'roar') : null;
    // 决策树
    if (e.charging) {
      // 蓄力完成：杀招
      e.charging = false;
      this.log(`${e.name} 蓄势已满，<b>杀招</b>轰然落下！`, 'log-crit');
      this.enemyStrike(st, 2.1, true);
    } else if (hpPct < 0.25 && healSkill && Utils.chance(70)) {
      // 濒死：优先治疗
      this.enemySkill(st, healSkill);
    } else if (hpPct < 0.35 && guardSkill && !e.guardRounds && Utils.chance(60)) {
      // 残血：开防御
      this.enemySkill(st, guardSkill);
    } else if (playerBuffed && debuffSkill && Utils.chance(50 + rageBonus)) {
      // 玩家有增益：驱散/削弱
      this.enemySkill(st, debuffSkill);
    } else if (playerLowHp && drainSkill && Utils.chance(50 + rageBonus)) {
      // 玩家残血：吸血斩杀
      this.enemySkill(st, drainSkill);
    } else if (!playerLowHp && controlSkill && !StatusFx.has(B.myFx, 'stun') && Utils.chance(35 + rageBonus)) {
      // 控制技能
      this.enemySkill(st, controlSkill);
    } else if (hpPct < 0.5 && !e.raged && roarSkill && Utils.chance(45 + rageBonus)) {
      // 半血增伤
      this.enemySkill(st, roarSkill);
    } else if (hasSkill && Utils.chance(50 + rageBonus)) {
      // 技能池随机
      const total = e.skills.reduce((s, x) => s + (x.w || 1), 0);
      let r = Math.random() * total, sk = e.skills[e.skills.length - 1];
      for (const s of e.skills) { r -= (s.w || 1); if (r <= 0) { sk = s; break; } }
      this.enemySkill(st, sk);
    } else if (Utils.chance((e.elite ? 30 : 20) + rageBonus) && !e.charging) {
      // 蓄力
      e.charging = true;
      this.log(`${e.name} 妖气翻涌、筋肉隆起——它正在<b>蓄力</b>，下回合将施展杀招！`, 'log-warn');
      this.pushFloat('enemy', '蓄力', 'miss');
    } else {
      // 普攻
      const heavy = Utils.chance((e.elite ? 35 : 25) + Math.floor(rageBonus / 2));
      this.enemyStrike(st, heavy ? 1.55 : 1, heavy);
    }
    // 回合数递减
    if (B.buffs.defRounds > 0) { B.buffs.defRounds--; if (B.buffs.defRounds === 0) B.buffs.defPower = 0; }
    if (B.buffs.dodgeRounds > 0) { B.buffs.dodgeRounds--; if (B.buffs.dodgeRounds === 0) B.buffs.dodgeBonus = 0; }
    if (e.guardRounds > 0) { e.guardRounds--; if (e.guardRounds === 0) e.guardPower = 0; }
    B.myFx = StatusFx.decayKinds(B.myFx, ['defdown', 'slow', 'weaken', 'atkup', 'defup', 'agiup', 'critup']);
    e.fx = StatusFx.decayKinds(e.fx, ['defdown', 'slow']);
    B.defending = false;
  },

  /** v13：敌方专属技能结算（毒/焰/血/破防/迟滞/虚弱/束缚/吸血/摄魂/铁壁/咆哮/自愈） */
  enemySkill(st, sk) {
    const B = this.active;
    const p = Game.player;
    const e = B.enemy;
    const kindMap = {
      poison: () => {
        this.enemyStrike(st, 0.8, false, `${sk.name}命中`);
        StatusFx.add(B.myFx, { kind: 'poison', pct: sk.pct || 3, rounds: sk.rounds || 3 });
        this.log(`【${sk.name}】毒液入体——你中毒了！每回合将损血，持续 ${sk.rounds || 3} 回合。`, 'log-loss');
        Ambience.sfx('poison');
      },
      burn: () => {
        this.enemyStrike(st, 0.9, false);
        StatusFx.add(B.myFx, { kind: 'burn', pct: sk.pct || 3.5, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】烈焰缠身——你被灼烧了！每回合将损血，持续 ${sk.rounds || 2} 回合。`, 'log-loss');
      },
      bleed: () => {
        this.enemyStrike(st, 1.1, false);
        StatusFx.add(B.myFx, { kind: 'bleed', pct: sk.pct || 2.5, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】伤口深可见骨——你流血不止！每回合将损血，持续 ${sk.rounds || 2} 回合。`, 'log-loss');
      },
      defdown: () => {
        this.enemyStrike(st, 0.9, false);
        StatusFx.add(B.myFx, { kind: 'defdown', pct: sk.pct || 25, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】你的护体罡气被破——防御下降${sk.pct || 25}%，持续 ${sk.rounds || 2} 回合！`, 'log-loss');
      },
      slow: () => {
        this.enemyStrike(st, 0.85, false);
        StatusFx.add(B.myFx, { kind: 'slow', pct: sk.pct || 25, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】气血滞涩，身法迟缓——身法下降${sk.pct || 25}%，持续 ${sk.rounds || 2} 回合！`, 'log-loss');
      },
      weaken: () => {
        this.enemyStrike(st, 0.9, false);
        StatusFx.add(B.myFx, { kind: 'weaken', pct: sk.pct || 20, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】劲力被卸——攻击下降${sk.pct || 20}%，持续 ${sk.rounds || 2} 回合！`, 'log-loss');
      },
      stun: () => {
        if (Utils.chance(e.elite ? 75 : 55)) {
          StatusFx.add(B.myFx, { kind: 'stun', rounds: sk.rounds || 1 });
          this.log(`【${sk.name}】你被震得气血翻腾，僵在原地——下回合无法行动！`, 'log-loss');
        } else {
          this.log(`【${sk.name}】你强提真气稳住身形，堪堪没有被震住！`, 'log-warn');
          this.enemyStrike(st, 0.8, false);
        }
      },
      drain: () => {
        const before = p.hp;
        this.enemyStrike(st, sk.mult || 1.2, true);
        const dealt = Math.max(0, before - p.hp);
        if (dealt > 0) {
          const healed = Math.max(1, Math.round(dealt * (sk.leech || 0.5)));
          e.hp = Math.min(e.hpMax, e.hp + healed);
          this.pushFloat('enemy', `+${healed}`, 'heal');
          this.log(`【${sk.name}】${e.name} 汲取你的精血，回复 ${healed} 点气血！`, 'log-loss');
        }
      },
      mpburn: () => {
        const burn = Math.max(1, Math.round(st.maxMp * (sk.pct || 25) / 100));
        p.mp = Math.max(0, p.mp - burn);
        this.pushFloat('me', `-${burn}灵力`, 'miss');
        this.log(`【${sk.name}】阴冷之力摄走你的灵力 ${burn} 点！`, 'log-loss');
        this.enemyStrike(st, 0.6, false);
      },
      guard: () => {
        e.guardPower = sk.def || 40;
        e.guardRounds = sk.rounds || 2;
        this.pushFloat('enemy', '铁壁', 'heal');
        this.log(`【${sk.name}】${e.name} 硬甲铿锵——防御大增（+${sk.def || 40}%），持续 ${sk.rounds || 2} 回合！`, 'log-warn');
      },
      roar: () => {
        e.atk = Math.round(e.atk * (1 + (sk.atk || 25) / 100));
        this.pushFloat('enemy', '咆哮', 'crit');
        this.log(`【${sk.name}】${e.name} 发出震天咆哮——攻击提升${sk.atk || 25}%！`, 'log-warn');
        Ambience.sfx('rage');
      },
      heal: () => {
        const healed = Math.max(1, Math.round(e.hpMax * (sk.pct || 15) / 100));
        e.hp = Math.min(e.hpMax, e.hp + healed);
        this.pushFloat('enemy', `+${healed}`, 'heal');
        this.log(`【${sk.name}】${e.name} 汲取天地生机，回复 ${healed} 点气血！`, 'log-warn');
      },
    };
    (kindMap[sk.kind] || (() => this.enemyStrike(st, 1, false)))();
  },

  /** v8：敌方一次攻击结算（mult 威力倍率；杀招同样可被闪避/格挡/防御化解；v13 计入状态修正） */
  enemyStrike(st, mult, heavy, tagText) {
    const B = this.active;
    const p = Game.player;
    const e = B.enemy;
    const dodgeChance = Utils.clamp(3 + (this.mySpd(st) - this.enSpd(e)) * 1.1 + st.dodge + (B.buffs.dodgeRounds > 0 ? B.buffs.dodgeBonus : 0), 0, 65);
    if (Utils.chance(dodgeChance)) {
      this.log(`${e.name} ${tagText || (heavy ? '杀招当头' : '扑击而来')}，却被你身形一晃，堪堪避过！`);
      this.pushFloat('me', '闪避', 'miss');
      this.addMorale(6);
      return;
    }
    let dmg = Stat.afterDef(this.enAtk(e) * mult, this.myDef(st)) * Utils.randF(0.85, 1.15);
    // v18 种族克制：敌方攻击时计算种族关系
    const speciesRel = GameData.speciesRelation(e.species, 'human');
    if (speciesRel > 0) dmg *= 1.15;
    else if (speciesRel < 0) dmg *= 0.85;
    const crit = Utils.chance(e.crit);
    if (crit) dmg *= 1.6;
    const blocked = Utils.chance(st.block);
    if (blocked) dmg *= 0.45;
    if (B.defending) dmg *= 0.4;
    // v13 金光护体（金光符）：减伤
    const shieldPct = StatusFx.pctOf(B.myFx, 'shield');
    if (shieldPct > 0) dmg *= 1 - shieldPct / 100;
    // v10 职业道境 · 般若一重「铜皮境」：所受伤害 -8%
    if (p.dao === 'body' && DaoSys.tierLevel(p) >= 1) dmg *= 0.92;
    // v10 境界特性 · 金丹护体：单次伤害超过三成气血上限时减免两成
    let guarded = false;
    if (p.realmIdx >= 2 && dmg > st.maxHp * 0.3) { dmg *= 0.8; guarded = true; }
    dmg = Math.max(1, Math.round(dmg));
    p.hp = Math.max(0, p.hp - dmg);
    B.stats.in += dmg;   // v19 统计
    B.combo = 0;   // v13 受击中断连击
    B.playerHit = true; // v18：玩家受击标记
    // v19 精英词缀·汲血
    if (this.eFx(B, 'e_leech') && e.hp > 0) {
      const leech = Math.max(1, Math.round(dmg * 0.3));
      e.hp = Math.min(e.hpMax, e.hp + leech);
      this.pushFloat('enemy', `+${leech}`, 'heal');
      this.log(`【汲血】${e.name} 吮吸血气，回复 <b>${leech}</b> 点气血。`, 'log-warn');
    }
    if (blocked) Ambience.sfx('block');
    else if (crit) Ambience.sfx('crit');
    else Ambience.sfx('hit');
    if (p.dao === 'body') DaoSys.gain(p, blocked ? 8 : 4);   // v16 体魄
    this.pushFloat('me', `-${dmg}`, crit || heavy ? 'crit' : 'dmg');
    this.addMorale(blocked ? 4 : -8);
    let text = crit ? `${e.name} 会心一击！你受到 <b>${dmg}</b> 点伤害！`
      : `${e.name} ${tagText || (heavy ? '施展杀招' : '攻击你')}，你受到 ${dmg} 点伤害。`;
    if (blocked) text += '（你举功格挡，卸去大半力道）';
    if (shieldPct > 0) text += '（金光卸力）';
    if (guarded) text += '（金丹护体，震开两成巨力）';
    // v19 词缀·反伤/荆棘
    const thorns = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? ForgeSys.suffixFx(p).thorns : 0;
    if (thorns > 0 && e.hp > 0 && p.hp > 0) {
      const back = Math.max(1, Math.round(dmg * thorns));
      e.hp = Math.max(0, e.hp - back);
      this.pushFloat('enemy', `-${back}`, 'dmg');
      text += `<br>【词缀·反伤】荆棘归鞘——${e.name} 反受 <b>${back}</b> 点伤害。`;
    }
    this.log(text, crit ? 'log-crit' : 'log-battle');
  },

  rollDrops(e, ctx = {}) {
    const p = Game.player;
    const drops = [];
    if (Utils.chance(45)) {
      const qty = Utils.chance(20) ? 2 : 1;
      const mat = Utils.pick(GameData.matsByTier(e.dropTier));
      Bag.addItem(mat, qty);
      drops.push(`${GameData.ITEMS[mat].name} ×${qty}`);
    }
    // v19 丹方残页：精英 12% / 普通妖兽 3%
    if (Utils.chance(e.elite ? 12 : 3)) {
      Bag.addItem('m_danfang', 1);
      drops.push('丹方残页 ×1');
    }
    // §23 魔域掉落提升：额外一撮战利品，偶得上古碎片
    if (ctx.dropMul) {
      if (Utils.chance(30)) {
        const mat = Utils.pick(GameData.matsByTier(e.dropTier));
        Bag.addItem(mat, 1);
        drops.push(`${GameData.ITEMS[mat].name} ×1`);
      }
      if (Utils.chance(10)) {
        Bag.addItem('m_gupian', 1);
        drops.push('【上古法宝碎片】');
      }
    }
    if (e.rareDrop && Utils.chance(30 + KarmaSys.rareDropBonus(p))) {
      const rd = GameData.ITEMS[e.rareDrop];
      if (!(rd.type === 'gongfa' && p.gongfa[e.rareDrop])) {
        Bag.addItem(e.rareDrop, 1);
        drops.push(`【${rd.name}】`);
      }
    }
    return drops;
  },

  async victory() {
    const B = this.active;
    const p = Game.player;
    B.over = true;
    const st = Stat.compute(p);
    // §24 切磋：点到为止，不取性命不掠财物
    if (B.ctx.spar) {
      this.log('二人收势而立，抱拳一礼——点到为止。', 'log-system');
      NpcSys.afterSpar(p, B.ctx.npcId, true);
      p.counters.spars = (p.counters.spars || 0) + 1;   // v6 成就计数
      BountySys.onSpar();   // v13 悬赏切磋进度
      Cultivate.addExp(p, Math.round(B.enemy.expGain * 0.3));
      await this.wait(700);
      this.end(false);
      Log.add(`你与 ${B.enemy.name} 切磋一场，略胜半招，颇有精进。`, 'gain');
      return;
    }
    this.log(`${B.enemy.name} 轰然倒地！你获得了胜利！`, 'log-system');
    p.counters.wins++;
    if (B.enemy.elite) p.counters.killsElite = (p.counters.killsElite || 0) + 1;   // v6 成就计数
    // v19 剧情战：轻奖励、必入戏（主线战不受普通掉落与败绩规则影响）
    if (B.ctx.story) {
      Cultivate.addExp(p, Math.round(B.enemy.expGain * 0.5));
      await this.wait(650);
      this.end(false);
      const cb = B.ctx.story.onEnd; B.ctx.story.onEnd = null;
      if (cb) cb(true);
      return;
    }
    if (p.dao === 'demonic') DaoSys.gain(p, 6);   // v16 魔性：杀戮
    await this.wait(650);
    // 阵道：秘境遗迹收益+20%；邪修：吞噬精元，额外汲取两成修为
    const arrBonus = (B.ctx.mapId === 'ruins' && p.dao === 'array') ? 1.2 : 1;
    const expGain = Math.round(B.enemy.expGain * arrBonus);
    const stoneGain = Math.round(B.enemy.stoneGain * arrBonus * (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 5 ? 1.5 : 1));   // v10 魔君境
    Cultivate.addExp(p, expGain);
    Bag.addStones(stoneGain);
    this.log(`战利品：修为 +${Utils.fmtNum(expGain)}，灵石 +${Utils.fmtNum(stoneGain)}${arrBonus > 1 ? '（阵道造诣，于遗迹所获更丰）' : ''}${st.luck >= 8 && Utils.chance(15) ? '（福缘深厚，额外掉落灵石一袋）' : ''}`, 'log-gain');
    if (p.dao === 'demonic') {
      const extra = Math.round(expGain * (DaoSys.tierLevel(p) >= 1 ? 0.3 : 0.2));   // v10 血煞境：汲取提至三成
      Cultivate.addExp(p, extra);
      DaoSys.gain(p, 20);   // v16 魔性
      this.log(`你吞噬了对手残存的精元，额外汲取修为 ${Utils.fmtNum(extra)}。`, 'log-gain');
    }
    const drops = this.rollDrops(B.enemy, B.ctx);
    // v10 魔道六境·魔尊境：两成几率夺其天材地宝
    if (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 6 && Utils.chance(20)) {
      const tier = Math.min(4, Math.floor(p.realmIdx / 2) + 1);
      const mat = Utils.pick(GameData.matsByTier(tier));
      Bag.addItem(mat, 1);
      drops.push(`【${GameData.ITEMS[mat].name}】（魔尊摄宝）`);
    }
    if (drops.length) this.log(`捡获：${drops.join('、')}。`, 'log-gain');
    const vLine = Narrative.victory();   // v5：胜后收势句
    if (vLine) this.log(vLine, 'log-gain');
    if (B.enemy.id) SectSys.onKill(B.enemy.id);
    BountySys.onKill(B.enemy.id);   // v13 悬赏猎杀进度
    // §24 恩怨 / 了断 / 立场结算
    if (B.ctx.npcId && B.ctx.mode === 'hunt') NpcSys.onPlayerKillsNpc(p, B.ctx.npcId);
    if (B.ctx.npcId && B.ctx.mode === 'confront') NpcSys.onConfrontWin(p, B.ctx.npcId);
    if (B.ctx.mode === 'war' && p.sect) {
      p.sect.contrib += 200;
      this.log('战功赫赫！宗门贡献 +200。', 'log-gain');
    }
    if (B.ctx.sectDanger != null) SectSys.onDangerWin(B.ctx.sectDanger);
    // §23 魔界入侵：参与奖励
    if (B.ctx.weType === 'demon') {
      KarmaSys.addFortune(15);
      Bag.addItem('m_gupian', 1);
      this.log('你斩落狂化魔物，摘下一枚魔核与一块上古碎片！气运 +15。', 'log-gain');
    }
    // §25 秘境推进
    if (B.ctx.dungeon) DungeonSys.onVictory(B.ctx.dungeon, B.ctx.boss);
    await this.wait(900);
    this.end(false);
    UI.announce('战 斗 胜 利', 'ok');   // v4
    Ambience.sfx('victory');   // v5
    // v19 结算卡
    if (B.stats) {
      const el = document.getElementById('battle-box');
      if (el && !document.getElementById('battle-modal').className.includes('hidden')) {
        const box = document.createElement('div');
        box.className = 'bt-summary';
        box.innerHTML = `<div class="bt-sum-title">✦ 战 斗 结 算 ✦</div>
          <div class="tip-line">· 历时 <b>${B.turn || 1}</b> 回合 ｜ 最高连击 <b>×${B.stats.maxCombo}</b></div>
          <div class="tip-line">· 共造成 <b>${Utils.fmtNum(B.stats.out)}</b> 伤害，承受 <b>${Utils.fmtNum(B.stats.in)}</b> 伤害</div>
          <div class="tip-line">· 终局真元 ${B.zhenyuan || 0}/6</div>`;
        el.appendChild(box);
        setTimeout(() => { box.remove(); }, 2600);
      }
    }
    Log.add(`你击败了 <b>${B.enemy.name}</b>，获得修为 ${Utils.fmtNum(expGain)}、灵石 ${Utils.fmtNum(stoneGain)}${drops.length ? `、${drops.join('、')}` : ''}${p.dao === 'demonic' ? `，并吞噬其精元（修为额外 +${Utils.fmtNum(Math.round(expGain * (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 1 ? 0.3 : 0.2)))}）` : ''}。`, 'gain');
  },

  async defeat() {
    const B = this.active;
    const p = Game.player;
    B.over = true;
    this.log('你眼前一黑，重重倒了下去……', 'log-loss');
    await this.wait(900);
    // §24 切磋落败：点到为止，不伤根本
    if (B.ctx.spar) {
      NpcSys.afterSpar(p, B.ctx.npcId, false);
      p.counters.spars = (p.counters.spars || 0) + 1;   // v6 成就计数
      p.hp = Math.max(1, Math.round(Stat.compute(p).maxHp * 0.2));
      this.end(false);
      Log.add(`你与 ${B.enemy.name} 切磋落败，技不如人，虽无大碍亦有所悟。`, 'info');
      return;
    }
    // §25 秘境陨落：背包三成之物永远留在其中
    if (B.ctx.dungeon) {
      await DungeonSys.onDefeat();
      this.end(false);
      return;
    }
    // v19 剧情战落败：胜负皆入戏，不落惩罚
    if (B.ctx.story) {
      const st2 = Stat.compute(p);
      p.hp = Math.max(1, Math.round(st2.maxHp * 0.3));
      p.mp = Math.round(st2.maxMp * 0.3);
      this.end(false);
      Log.add('剧情一战落败……你收拾心情，故事仍要继续。', 'warn');
      const cb = B.ctx.story.onEnd; B.ctx.story.onEnd = null;
      if (cb) cb(false);
      return;
    }
    const st = Stat.compute(p);
    // §24 危机相助：好友/结拜/道侣概率出手
    const aid = NpcSys.tryAid(p, 'battle');
    const mul = aid ? 0.4 : 1;
    if (aid) Log.add(`危急关头，<b>${aid.name}</b> 仗剑而至，拼死将你救出！折损因此大减。`, 'gain');
    const lostExp = Math.round(p.exp * 0.1 * mul);
    p.exp = Math.max(0, p.exp - lostExp);
    const lostLow = Math.round(p.stones.low * 0.2 * mul);
    p.stones.low -= lostLow;
    p.hp = Math.max(1, Math.round(st.maxHp * 0.3));
    p.mp = Math.round(st.maxMp * 0.2);
    p.counters.defeats = (p.counters.defeats || 0) + 1;   // v6 成就计数
    Time.add(3);
    Log.add(`不知过了多久，你被人救回了村中。此战折损修为 ${Utils.fmtNum(lostExp)}、灵石 ${Utils.fmtNum(lostLow)}，捡回一条性命。`, 'loss');
    Log.add('伤敌不足，修身有余。且调理伤势，再图精进。', 'warn');
    const dLine = Narrative.defeat();   // v5：败后道心句
    if (dLine) this.log(dLine, 'log-loss');
    this.end(false);
    UI.announce('战 斗 落 败', 'bad');   // v4
  },

  /** 结束战斗（统一收尾） */
  end() {
    if (typeof Ambience !== 'undefined' && Ambience.setMood) Ambience.setMood('calm');   // v19 情境配乐
    // v19 战斗回顾：留档最近一场的记录
    if (this.active) this.lastLogs = (this.active.logs || []).slice(-60);
    const B = this.active;
    const p = Game.player;
    // 邪修：杀伐之气萦绕，每场战斗孽障 +1
    if (B && p && p.dao === 'demonic') {
      p.karma = (p.karma || 0) + 1;
      DaoSys.gain(p, 2);   // v16 魔性
      Log.add('杀伐之气萦绕不去——孽障 +1。', 'loss');
    }
    const box = document.getElementById('battle-box');
    if (box) box.innerHTML = '';
    document.getElementById('battle-modal').classList.add('hidden');
    this.active = null;
    Game.afterAction();
  },

  /** v13：全屏技能特效（剑光/雷落/火焰/冰霜）。
   *  render 会整体重建战斗 DOM，故特效先挂起，render 完成后重播，避免被 innerHTML 重建清除。 */
  fxShow(kind) {
    this._pendingFx = kind;
    const modal = document.getElementById('battle-modal');
    if (modal && !modal.classList.contains('hidden') && document.getElementById('bt-log')) this._playFx(kind);
  },
  _playFx(kind) {
    const modal = document.getElementById('battle-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    let layer = document.getElementById('bt-fx-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'bt-fx-layer';
      modal.querySelector('.battle-box').appendChild(layer);
    }
    const fx = document.createElement('div');
    fx.className = `bt-fx fx-${kind || 'sword'}`;
    layer.appendChild(fx);
    setTimeout(() => fx.remove(), 900);
  },

  /** 战斗界面渲染 */
  render() {
    const B = this.active;
    if (!B) return;
    const p = Game.player;
    const st = Stat.compute(p);
    const e = B.enemy;
    const hpPct = Utils.clamp(p.hp / st.maxHp * 100, 0, 100);
    const mpPct = Utils.clamp(p.mp / st.maxMp * 100, 0, 100);
    const ePct = Utils.clamp(e.hp / e.hpMax * 100, 0, 100);

    let sub = '';
    if (B.menu === 'skill') {
      const skills = Object.entries(p.gongfa)
        .filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].skill)
        .map(([id, g]) => {
          const def = GameData.ITEMS[id];
          const sk = def.skill;
          const cost = Math.ceil(st.maxMp * sk.mp / 100 * (p.dao === 'talisman' ? 1.2 : 1));   // 与实际扣费一致（符修 +20%）
          const dis = B.busy || p.mp < cost;
          return `<button class="btn btn-sm" data-action="bt-skill" data-gf="${id}" ${dis ? 'disabled' : ''}>
            <span class="grade-${def.grade}">${sk.name}</span>
            <span style="color:var(--mp)">（灵力${cost}）</span></button>`;
        });
      sub = skills.length
        ? `<div class="bt-sub">${skills.join('')}<button class="btn btn-sm" data-action="bt-back">返回</button></div>`
        : `<div class="bt-sub"><button class="btn btn-sm" data-action="bt-back">你尚未修习带神通的法诀，返回</button></div>`;
    } else if (B.menu === 'item') {
      const pills = Object.keys(p.bag)
        .filter(id => {
          const d = GameData.ITEMS[id];
          return d && (d.type === 'pill' || d.type === 'talisman');
        })
        .map(id => `<button class="btn btn-sm" data-action="bt-item" data-item="${id}" ${B.busy ? 'disabled' : ''}>
          ${GameData.ITEMS[id].name} ×${p.bag[id]}</button>`);
      sub = pills.length
        ? `<div class="bt-sub">${pills.join('')}<button class="btn btn-sm" data-action="bt-back">返回</button></div>`
        : `<div class="bt-sub"><button class="btn btn-sm" data-action="bt-back">囊中空空如也，返回</button></div>`;
    }

    // v19 必杀按钮行
    const ults = this.ultList();
    const ultBtns = ults.length ? ults.map(sk =>
      `<button class="btn btn-sm ult-btn" data-action="bt-ult" data-ult="${sk.id}" ${(B.busy || (B.zhenyuan || 0) < sk.cost) ? 'disabled' : ''} title="${sk.desc}">${sk.name}<span style="color:var(--text-faint)">（真元${sk.cost}）</span></button>`).join('') : '';
    const ultRow = ultBtns ? `<div class="bt-sub ult-row">${ultBtns}</div>` : '';
    const speedLabels = { 1: '×1', 2: '×2', 3: '极速' };
    const btns = [
      `<button class="btn" data-action="bt-attack" ${B.busy ? 'disabled' : ''}>普 攻</button>`,
      `<button class="btn" data-action="bt-menu" data-menu="skill" ${B.busy ? 'disabled' : ''}>法 诀</button>`,
      `<button class="btn" data-action="bt-defend" ${B.busy ? 'disabled' : ''}>防 御</button>`,
      `<button class="btn" data-action="bt-menu" data-menu="item" ${B.busy ? 'disabled' : ''}>道 具</button>`,
      `<button class="btn" data-action="bt-flee" ${B.busy ? 'disabled' : ''}>遁 走</button>`,
    ].join('');
    // v13 自动战斗 / 速度 / 驯服（妖兽残血可驯）
    const ctlBtns = [
      `<button class="btn btn-sm ${B.auto ? 'btn-primary' : ''}" data-action="bt-auto" ${B.over ? 'disabled' : ''}>${B.auto ? '◼ 停止自动' : '▶ 自动战斗'}</button>`,
      `<button class="btn btn-sm" data-action="bt-speed" title="战斗速度">速度 ${speedLabels[this.speed] || '×1'}</button>`,
    ].join('');
    const canTame = !!(B.enemy.id && !B.enemy.elite && B.enemy.species !== 'human' && B.enemy.species !== 'construct'
      && B.enemy.hp > 0 && B.enemy.hp <= B.enemy.hpMax * 0.2 && !B.over);
    const tameBtn = canTame
      ? `<button class="btn btn-sm btn-primary btn-glow" data-action="bt-tame">✦ 驯 服（灵兽残血）</button>`
      : '';

    document.getElementById('battle-box').innerHTML = `
      <div class="battle-head">— 修 罗 场 —</div>
      <div class="bt-side side-enemy ${e.raged ? 'raged' : ''}" data-species="${e.species || 'beast'}">
        <div class="bt-name-row"><span class="bt-name enemy"><button class="bt-info-btn" data-action="bt-info" title="查看情报">🔍</button>${e.name}${e.elite ? ' <span class="tag danger">精英</span>' : ''}${(B.enemyFxIds || []).length ? ' ' + B.enemyFxIds.map(fid => { const d = (GameData.ELITE_AFFIXES || []).find(x => x.id === fid); return d ? `<span class="tag danger" title="${d.desc}">◆${d.name}</span>` : ''; }).join('') : ''}${e.raged ? ' <span class="tag danger">狂暴</span>' : ''}${e._raged2 ? ' <span class="tag danger">血性</span>' : ''}${e._phase2 ? ' <span class="tag danger">狂乱</span>' : ''}${e.charging ? ' <span class="tag danger">蓄力杀招</span>' : ''}${StatusFx.has(e.fx, 'stun') || StatusFx.has(e.fx, 'freeze') ? ' <span class="tag">被缚</span>' : ''}</span><span class="bt-realm">${e.realmLabel} · 攻${this.enAtk(e)} 防${this.enDef(e)}</span></div>
        <div class="bt-figure enemy-fig" aria-hidden="true"></div>
        <div class="fx-tags">${StatusFx.tagsHtml(e.fx)}</div>
        <div class="bar"><div class="bar-fill hp${e.raged ? ' rage' : ''}" style="width:${ePct}%"></div><span class="bar-text"><span class="num-anim" data-nk="bt-ehp" data-nv="${e.hp}">${e.hp}</span> / ${e.hpMax}</span></div>
      </div>
      <div class="bt-vs">—— ✦ ——</div>
      <div class="bt-side side-me">
        <div class="bt-name-row"><span class="bt-name me">${Utils.esc(p.name)}${B.combo >= 2 ? ` <span class="tag combo">连击×${B.combo}</span>` : ''}${B.auto ? ' <span class="tag safe">自动</span>' : ''}</span><span class="bt-realm">攻${this.myAtk(st)} 防${this.myDef(st)} · 暴击${this.myCrit(st).toFixed(0)}%</span></div>
        <div class="bt-figure me-fig" aria-hidden="true"></div>
        <div class="bar" title="气血 ${p.hp} / ${st.maxHp}"><div class="bar-fill hp${hpPct <= 30 ? ' low' : ''}" style="width:${hpPct}%"></div><span class="bar-text"><span class="num-anim" data-nk="bt-hp" data-nv="${p.hp}">${p.hp}</span> / ${st.maxHp}</span></div>
        <div class="bar" title="灵力 ${p.mp} / ${st.maxMp}"><div class="bar-fill mp" style="width:${mpPct}%"></div><span class="bar-text"><span class="num-anim" data-nk="bt-mp" data-nv="${p.mp}">${p.mp}</span> / ${st.maxMp}</span></div>
        <div class="bar morale-bar" title="战意：连击提升，受挫回落（每点 +0.4% 伤害）"><div class="bar-fill morale" style="width:${B.morale || 0}%"></div><span class="bar-text">战意 ${B.morale || 0}${(B.morale || 0) >= 100 ? '（伤害 +40%）' : ''}</span></div>
        <div class="bar morale-bar" title="真元：普攻命中+1，会心+2，防御+1（用于职业必杀）"><div class="bar-fill" style="width:${(B.zhenyuan || 0) / 6 * 100}%;background:linear-gradient(90deg,#5a6ac7,#a04ab0)"></div><span class="bar-text">真元 ${B.zhenyuan || 0}/6</span></div>
        <div class="fx-tags">${StatusFx.tagsHtml(B.myFx)}</div>
      </div>
      <div id="bt-log"></div>
      ${sub}
      ${ultRow}
      ${tameBtn}
      <div class="bt-actions" style="margin-top:8px">${btns}</div>
      <div class="bt-ctl">${ctlBtns}</div>
    `;
    Anim.scan(document.getElementById('battle-box'));   // v4：战斗数值滚动
    // v7：浮动伤害/治疗数字 + 敌方受击震动（战斗即时反馈）
    const eside = document.querySelector('#battle-box .side-enemy');
    const mside = document.querySelector('#battle-box .side-me');
    // v13：敌方剪影立绘
    const efig = document.querySelector('#battle-box .enemy-fig');
    if (efig) efig.innerHTML = Art.monster(e.species || 'beast', !!e.elite);
    // v18：主角剪影立绘
    const mfig = document.querySelector('#battle-box .me-fig');
    if (mfig) mfig.innerHTML = Art.player(p.dao);
    if (B.floats.length) {
      const usedPositions = [];
      for (const f of B.floats) {
        const host = f.side === 'enemy' ? eside : mside;
        if (!host) continue;
        const d = document.createElement('div');
        d.className = 'float-num ' + f.kind;
        d.textContent = f.text;
        // v18：浮动数字排队，避免重叠
        let left;
        for (let attempt = 0; attempt < 10; attempt++) {
          left = 20 + Math.floor(Math.random() * 50);
          if (!usedPositions.some(p => Math.abs(p - left) < 12)) break;
        }
        usedPositions.push(left);
        d.style.left = left + '%';
        d.style.top = (10 + usedPositions.length * 18) + '%';
        host.appendChild(d);
        setTimeout(() => d.remove(), 1100);
      }
      B.floats = [];
    }
    if (B.hitShake && eside) {
      eside.classList.remove('enemy-shake');
      void eside.offsetWidth;
      eside.classList.add('enemy-shake');
      B.hitShake = false;
    }
    // v18：玩家受击震动反馈
    if (B.playerHit && mside) {
      mside.classList.remove('player-hit');
      void mside.offsetWidth;
      mside.classList.add('player-hit');
      B.playerHit = false;
    }
    // render 会整体重建战斗 DOM，这里回放历史战斗日志
    const logBox = document.getElementById('bt-log');
    if (logBox) {
      for (const { html, cls } of B.logs) {
        const div = document.createElement('div');
        div.className = 'log-entry ' + cls;
        div.innerHTML = html;
        logBox.appendChild(div);
      }
      logBox.scrollTop = logBox.scrollHeight;
    }
    // v13：重播挂起的技能特效（render 重建 DOM 后特效层需重建）
    if (this._pendingFx) {
      const kind = this._pendingFx;
      this._pendingFx = null;
      this._playFx(kind);
    }
  },
};
