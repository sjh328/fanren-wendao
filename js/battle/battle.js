
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
    // v20 首战保底：敌方整体削弱（ctx.mercy < 1）
    let mercyTxt = '';
    if (ctx.mercy && ctx.mercy < 1) {
      enemy.hpMax = Math.round(enemy.hpMax * ctx.mercy);
      enemy.atk = Math.round(enemy.atk * ctx.mercy);
      // v34（C7）：日志挪到 active 建档之后——原在 this.log 时刻 B.logs 容器尚不存在，
      // 渲染只回放 B.logs，这条开局削弱提示从未显示过
      mercyTxt = '【初入江湖】对方见你面生，未出全力——这是一场善意的较量。';
    }
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
    if (mercyTxt) this.log(mercyTxt, 'log-system');   // v34（C7）：建档后再入日志（原在建档前调用即被渲染抹掉）
    p.counters.battles++;
    document.getElementById('battle-modal').classList.remove('hidden');
    if (typeof UI !== 'undefined' && UI.syncAnnouncePos) UI.syncAnnouncePos();   // v21 公告让位
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
    B.zmax = 6 + (DaoSys.tierLevel(p) >= 3 ? 2 : 0);   // v20 道境三重以上真元上限扩至 8
    B.stats = { out: 0, in: 0, maxCombo: 0, src: { attack: 0, skill: 0, ult: 0, beast: 0, dot: 0, thorns: 0, counter: 0 } };
    // v30 灵兽合击：副战灵兽不空转——开局战意 +15、真元 +1（气机相随）
    if (typeof BeastSys !== 'undefined' && p.beasts && p.beasts.active2 && p.beasts.list.find(x => x.uid === p.beasts.active2)) {
      B.morale = Math.min(100, (B.morale || 0) + 15);
      B.zhenyuan = 1;
      this.log('【副战灵兽】气机相随——你以充沛战意迎战（战意 +15，真元 +1）。', 'log-gain');
    }
    // v20 多波遭遇：探索妖群战按 waveIds 依次接战
    B.waveIds = ctx.waveIds || null;
    B.waveIdx = 0;
    if (B.waveIds && B.waveIds.length > 1) this.log(`妖群环伺——预计将<b>接连遭遇 ${B.waveIds.length} 波</b>！且战且退，或一鼓作气。`, 'log-warn');
    if (B.enemy && B.enemy.elite) this.rollEliteFx(B);
    // v20 天气联动：夜战敌方攻势更盛；雾战双方闪避皆升
    if (ctx.wx && ctx.wx.night) {
      B.enemy.atk = Math.round(B.enemy.atk * 1.15);
      this.log('【夜战】月黑风高，妖物借着夜色愈发凶悍——敌方攻击 +15%，然夜行所获亦丰。', 'log-warn');
    }
    if (ctx.wx && ctx.wx.sky === 'fog') {
      B.fogDodge = 5;
      this.log('【雾战】雾气迷目——双方身形皆难捉摸（闪避 +5%）。', 'log-system');
    }
    if (!ctx.firstStrike && !ctx.ambush) this.planIntent();   // v20 意图预演：先手局由敌方先动再规划
    // v19 词缀·护盾：战斗开场金光护体
    const startFx = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? ForgeSys.suffixFx(Game.player) : {};
    if (startFx.shield > 0) {
      StatusFx.add(B.myFx, { kind: 'shield', pct: Math.round(startFx.shield * 100), rounds: 2 });
      this.log('法宝灵光自发——一层金光罩住周身。', 'log-system');
      this.fxShow('gold-halo');   // v20 状态特效
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
    // v32 修瑕（E15）：DOM 与数组同步裁剪——原只 append 不删首子，第 121 条起 DOM 子数恒大于
    // 数组长度，render 的「搬回」条件永不成立，每次渲染退回整段重建 120 条（v30 增量优化失效回退）
    while (box.children.length >= 120 && box.firstChild) box.removeChild(box.firstChild);
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
    if (B) B.morale = Utils.clamp((B.morale || 0) + n, 0, GameData.BALANCE.COMBAT.MORALE_MAX);   // v34（C9）：上限接线集中配置
  },
  moraleMul() {
    const B = this.active;
    return 1 + (B && B.morale ? B.morale * GameData.BALANCE.COMBAT.MORALE_PER_POINT : 0);   // v32（E24）：接线集中配置
  },
  /** v13：连击倍率（每层 +4%，上限五层 +20%）；受击中断 */
  comboMul() {
    const B = this.active;
    const C = GameData.BALANCE.COMBAT;   // v32（E24）：接线集中配置
    const cap = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? C.COMBO_MAX + (ForgeSys.suffixFx(Game.player).comboUp || 0) : C.COMBO_MAX;   // v19 词缀·连击上限
    return 1 + (B ? Math.min(cap, B.combo || 0) * C.COMBO_PER_LAYER : 0);
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
    const mul = this.speed === 3 ? 0.05 : this.speed === 2 ? 0.5 : 1;   // v30：极速档近零等待——放置游戏的晚年全靠自动+极速，链路打磨到只剩结算
    return Utils.sleep(Math.max(20, Math.round(ms * mul)));
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
  /** v13：敌方有效攻防（计入狂暴/铁壁/玩家施加的破防迟滞/虚弱）
   *  v34（C3）：补读被「偷梁换柱」转嫁到己身的玩家增益（atkup/agiup/critup）——
   *  原写入后无任何读取端，偷来的增益只渲染 tag 零生效，实际效果单向白偷 */
  enAtk(e) {
    let atk = e.atk * (e.raged ? 1.3 : 1);
    if (e._phase2) atk *= 1.25;   // v19 Boss 二阶段：血线过半，杀意暴涨
    if (e._raged2) atk *= 1.3;    // v19 精英词缀·血性（二度狂暴）
    // v30 修瑕：虚弱生效——玩家侧写入方（邪修必杀/灵兽慑心之嚎）早已存在，读取方一直缺失
    atk *= 1 - StatusFx.pctOf(e.fx, 'weaken') / 100;
    atk *= 1 + StatusFx.pctOf(e.fx, 'atkup') / 100;   // v34（C3）：偷来的狂暴真实生效
    return Math.max(1, Math.round(atk));
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
    spd *= 1 + StatusFx.pctOf(e.fx, 'agiup') / 100;   // v34（C3）：偷来的轻身真实生效
    return Math.max(1, Math.round(spd));
  },
  /** v19 敌方精英词缀判定 */
  eFx(B, id) { return !!(B.enemyFxIds && B.enemyFxIds.includes(id)); },
  /** v34（C1/C2）：敌方受击统一响应——精英词缀「魔棘」反伤与「不灭」复活原先只在普攻路径接线，
   *  必杀/本命/法诀/符箓/人兽合击打上去零反弹、一发带走直接跳过复活（同一词缀时灵时不灵）。
   *  dmg>0 时结算反伤；随后无论 dmg 都复查不灭。伤害路径在扣除敌方气血后统一调用。 */
  onEnemyHit(B, st, dmg) {
    const p = Game.player;
    if (dmg > 0 && this.eFx(B, 'e_thorns') && p.hp > 0) {
      const back = Math.max(1, Math.round(dmg * 0.15));
      p.hp = Math.max(0, p.hp - back);
      this.pushFloat('me', `-${back}`, 'dmg');
      this.log(`【魔棘】${B.enemy.name} 周身魔刺反卷——你受 <b>${back}</b> 点伤害！`, 'log-warn');
    }
    if (B.enemy.hp <= 0 && this.eFx(B, 'e_reborn') && !B.enemy._rebornUsed) {
      B.enemy._rebornUsed = true;
      B.enemy.hp = Math.round(B.enemy.hpMax * 0.3);
      this.log(`【不灭】${B.enemy.name} 气息骤然暴涨——它以三成气血自死境爬了回来！`, 'log-warn');
      UI.toast(`${B.enemy.name} 触发【不灭】！`, true);
    }
  },
  /* ---------- v19 敌方情报卡 ---------- */
  infoCard() {
    const B = this.active;
    if (!B || !B.enemy) return;
    const e = B.enemy;
    const rel = GameData.speciesRelation(e.species, 'human');
    const relTxt = rel > 0 ? '<span class="neg">克制你（普攻伤害 -15%，其对你 +15%；法诀/符箓/必杀不吃克制）</span>'
      : rel < 0 ? '<span style="color:var(--ok)">你克制它（普攻伤害 +15%）</span>' : '无克制';   // v32 修瑕（E11）：克制实发只乘普攻——情报卡曾宣称一切伤害 ±15%
    const skillTxt = (e.skills || []).map(sk => `· <b>${sk.name}</b>（${StatusFx.DEFS[sk.kind] ? StatusFx.DEFS[sk.kind].name : sk.kind}）`).join('<br>') || '· 普攻与重击';
    const affTxt = (B.enemyFxIds || []).map(fid => { const d = (GameData.ELITE_AFFIXES || []).find(x => x.id === fid); return d ? `◆<b>${d.name}</b>：${d.desc}` : ''; }).filter(Boolean).join('<br>') || '无';
    const drops = e.dropTier ? `材料品阶：${['', '凡', '灵', '玄', '地'][e.dropTier] || e.dropTier}级${e.rareDrop ? `；稀有掉落：<b>${(GameData.ITEMS[e.rareDrop] || {}).name || '?'}</b>` : ''}` : '来历不明之物';
    const tpl = e.tpl ? (GameData.MONSTER_TEMPLATES.find(t => t.id === e.tpl) || {}) : null;
    UI.popup({
      title: `情报 · ${e.name}`,
      html: `<div class="tip-line">${e.realmLabel}${e.elite ? ' · 精英' : ''}${tpl ? ` · 习性【<b>${tpl.name}</b>】${tpl.desc}` : ''} · 战力 ${e.power}</div>
        <div class="stat-line"><span>种族克制</span><b>${relTxt}</b></div>
        <div class="stat-line"><span>攻/防/速</span><b>${this.enAtk(e)} / ${this.enDef(e)} / ${this.enSpd(e)}</b></div>
        <div class="tip-line" style="margin-top:4px">技能池：<br>${skillTxt}</div>
        <div class="tip-line" style="margin-top:4px">词缀：<br>${affTxt}</div>
        <div class="tip-line" style="margin-top:4px">${drops}</div>`,
      options: [{ text: '收 起', value: true, primary: true }],
    });
  },

  /** v20 精英词缀掷取（1~2 条 + 互斥表过滤；守财实时加成攻防血） */
  rollEliteFx(B) {
    const e = B.enemy;
    for (let tries = 0; tries < 40 && (!B.enemyFxIds || !B.enemyFxIds.length); tries++) {
      const pool = GameData.ELITE_AFFIXES.slice();
      const n = (e._forceFx2 || Utils.chance(30)) ? 2 : 1;   // v30：塔守 Boss 必带双词缀
      B.enemyFxIds = [];
      for (let i = 0; i < n && pool.length; i++) {
        const a = pool.splice(Utils.rand(0, pool.length - 1), 1)[0];
        B.enemyFxIds.push(a.id);
      }
      // 互斥过滤：任一对同时出现则重掷
      const pairs = GameData.ELITE_AFFIX_MUTEX || [];
      if (B.enemyFxIds.length === 2 && pairs.some(([x, y]) => B.enemyFxIds.includes(x) && B.enemyFxIds.includes(y))) B.enemyFxIds = [];
    }
    if (!B.enemyFxIds || !B.enemyFxIds.length) B.enemyFxIds = [GameData.ELITE_AFFIXES[0].id];
    for (const fid of B.enemyFxIds) {
      if (fid === 'e_swift') e._fxSwift = true;
      if (fid === 'e_wall') e._fxWall = true;
      if (fid === 'e_reborn') e._rebornUsed = false;
      if (fid === 'e_rage2') e._canRage2 = true;
      if (fid === 'e_mirror') e._mirror = 0;
      if (fid === 'e_gold') {
        e._fxGold = true;
        e.hpMax = Math.round(e.hpMax * 1.2); e.atk = Math.round(e.atk * 1.2); e.def = Math.round(e.def * 1.2);
      }
      if (fid === 'e_tstorm') { e._fxTstorm = true; e.atk = Math.round(e.atk * 0.7); }
    }
    e.hp = e.hpMax;   // v29 修瑕：词缀改完血上限即回满——此前「守财」精英自带约 17% 隐形掉血
    this.log(`【${e.name}】词缀：${B.enemyFxIds.map(fid => { const d = GameData.ELITE_AFFIXES.find(x => x.id === fid); return d ? `◆${d.name}` : ''; }).join('')}——点其名旁 🔍 可查情报。`, 'log-warn');
  },

  /** v20 敌方意图预演：与敌方回合同一棵决策树，提前算出下一手并在面板公示——读招博弈由此成立 */
  planIntent() {
    const B = this.active;
    if (!B || B.over || !B.enemy || B.enemy.hp <= 0) { if (B) B.intent = null; return; }
    B.intent = this.enemyDecide();
  },
  /** 决策树（纯函数化）：返回 {kind, ...}；kind: strike / skill / charge / finisher */
  enemyDecide() {
    const B = this.active;
    const p = Game.player;
    const st = Stat.compute(p);
    const e = B.enemy;
    const rageBonus = e.raged ? 8 : 0;
    const hpPct = e.hp / e.hpMax;
    const hasSkill = e.skills && e.skills.length > 0;
    const playerHasDebuff = StatusFx.has(B.myFx, 'defdown') || StatusFx.has(B.myFx, 'weaken') || StatusFx.has(B.myFx, 'slow');
    const playerLowHp = p.hp < st.maxHp * 0.4;
    const playerBuffed = StatusFx.has(B.myFx, 'atkup') || StatusFx.has(B.myFx, 'defup') || StatusFx.has(B.myFx, 'agiup');
    const healSkill = hasSkill ? e.skills.find(s => s.kind === 'heal') : null;
    const guardSkill = hasSkill ? e.skills.find(s => s.kind === 'guard') : null;
    const debuffSkill = hasSkill ? e.skills.find(s => ['defdown', 'slow', 'weaken', 'poison', 'burn', 'bleed'].includes(s.kind)) : null;
    const mpburnSkill = hasSkill ? e.skills.find(s => s.kind === 'mpburn') : null;   // v31（D5）：针对法诀型玩家的摄灵压制
    const controlSkill = hasSkill ? e.skills.find(s => ['stun', 'freeze'].includes(s.kind)) : null;
    const drainSkill = hasSkill ? e.skills.find(s => s.kind === 'drain') : null;
    // v29：咆哮每场限一次、治疗每场限两次——终结「叠攻/奶量螺旋」的拖沓对局
    const roarSkill = hasSkill && !e._roared ? e.skills.find(s => s.kind === 'roar') : null;
    if (healSkill) e._healCount = e._healCount || 0;
    if (e.charging) return { kind: 'finisher' };
    // v29：习性偏好——同一模板不再只改数值：速攻偏冲锋、铁壁偏坚守、狂战偏重击、狡诈偏削益、坚韧偏自愈
    // v30 AI 2.0：反制读招——玩家连续两回合同一动作时，狡诈型加紧削益、狂战型更下重手
    // v31（D5）：针对性应对升格——近三手高频法诀者遭削益/摄灵压制，连普攻者遭铁壁格挡应对
    const recent = B.playerMoves || [];
    const sameTwice = recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2]
      && ['attack', 'skill'].includes(recent[recent.length - 1]);
    const skillHeavy = recent.slice(-3).filter(k => k === 'skill').length >= 2;
    const attackHeavy = recent.length >= 3 && recent.slice(-3).every(k => k === 'attack');
    const pref = e.tpl;
    if (pref === 'iron' && guardSkill && !e.guardRounds && Utils.chance(45 + (attackHeavy ? 20 : 0))) return { kind: 'skill', sk: guardSkill };
    if (pref === 'cunning' && debuffSkill && Utils.chance(40 + rageBonus + (sameTwice ? 20 : 0) + (skillHeavy ? 15 : 0))) return { kind: 'skill', sk: debuffSkill };
    if (pref === 'cunning' && mpburnSkill && skillHeavy && Utils.chance(35)) return { kind: 'skill', sk: mpburnSkill };
    if (pref === 'tough' && healSkill && (e._healCount || 0) < 2 && hpPct < 0.6 && Utils.chance(45)) return { kind: 'skill', sk: healSkill };
    if (pref === 'swift' && Utils.chance(35 + rageBonus + (attackHeavy ? 10 : 0))) return { kind: 'charge' };
    if (pref === 'berserk') return { kind: 'strike', heavy: Utils.chance(55 + rageBonus + (sameTwice ? 20 : 0)) };
    if (hpPct < 0.25 && healSkill && (e._healCount || 0) < 2 && Utils.chance(70)) return { kind: 'skill', sk: healSkill };
    if (hpPct < 0.35 && guardSkill && !e.guardRounds && Utils.chance(60)) return { kind: 'skill', sk: guardSkill };
    if (playerBuffed && debuffSkill && Utils.chance(50 + rageBonus)) return { kind: 'skill', sk: debuffSkill };
    if (playerLowHp && drainSkill && Utils.chance(50 + rageBonus)) return { kind: 'skill', sk: drainSkill };
    // v36（E212）：控制守卫补 freeze——原只查 stun，清冷 temper「冰弦裂魂」冰封玩家后敌方仍投控，
    // StatusFx.add 双控并存、下一 act 被 controlledConsume 的 removeKinds(['stun','freeze']) 一次性全清，
    // AI 整手浪费（MONSTERS 表无 freeze 技，敌方侧唯一来源即清冷 temper——数据谱系经 grep 实证）
    if (!playerLowHp && controlSkill && !StatusFx.has(B.myFx, 'stun') && !StatusFx.has(B.myFx, 'freeze') && Utils.chance(35 + rageBonus)) return { kind: 'skill', sk: controlSkill };
    if (hpPct < 0.5 && !e.raged && roarSkill && Utils.chance(45 + rageBonus)) return { kind: 'skill', sk: roarSkill };
    if (hasSkill && Utils.chance(50 + rageBonus)) {
      // v36（E212）：通用技能池同样排除已命中玩家的控制类——清冷 NPC 若冰弦裂魂为唯一技，
      // 本池是其投控的另一条活路径，不排除则「已冰封不再投控」的收口有名无实（stun 同族同洞一并堵上）
      const pool2 = e.skills.filter(s => !((s.kind === 'roar' && e._roared) || (s.kind === 'heal' && (e._healCount || 0) >= 2)
        || (s.kind === 'stun' && StatusFx.has(B.myFx, 'stun')) || (s.kind === 'freeze' && StatusFx.has(B.myFx, 'freeze'))));
      if (!pool2.length) return { kind: 'strike', heavy: Utils.chance(30) };
      // v30 AI 2.0：模板绑定技能权重——速攻偏控、铁壁偏守愈、狂战偏血性、狡诈偏蚀益、坚韧偏汲养
      const PREF_SKILL_W = {
        swift: { stun: 2, freeze: 2 },
        iron: { guard: 2, heal: 1.6 },
        berserk: { roar: 2, bleed: 1.8 },
        cunning: { defdown: 2, mpburn: 2, weaken: 1.8, slow: 1.5 },
        tough: { heal: 1.8, drain: 1.8 },
      };
      const total = pool2.reduce((s, x) => s + (x.w || 1) * ((PREF_SKILL_W[pref] || {})[x.kind] || 1), 0);
      let r = Math.random() * total, sk = pool2[pool2.length - 1];
      for (const s of pool2) { r -= (s.w || 1) * ((PREF_SKILL_W[pref] || {})[s.kind] || 1); if (r <= 0) { sk = s; break; } }
      return { kind: 'skill', sk };
    }
    if (Utils.chance((e.elite ? 30 : 20) + rageBonus)) return { kind: 'charge' };
    return { kind: 'strike', heavy: Utils.chance((e.elite ? 35 : 25) + Math.floor(rageBonus / 2)) };
  },
  /** 意图展示文案 */
  intentLabel(intent) {
    if (!intent) return '';
    if (intent.kind === 'finisher') return '☠ 杀招 ×2.1';
    if (intent.kind === 'charge') return '💤 蓄力（下回合杀招）';
    if (intent.kind === 'strike') return intent.heavy ? '⚔ 重击' : '⚔ 普攻';
    if (intent.kind === 'skill') {
      // v36（E229）：技能型出手按 kind 标注——直伤/附毒焰血（尾缀回合数）/资源型（摄灵/铁壁/咆哮/自愈）
      const k = intent.sk.kind;
      if (k === 'mpburn') return `✦ ${intent.sk.name}（摄灵）`;
      if (k === 'guard') return `✦ ${intent.sk.name}（铁壁）`;
      if (k === 'roar') return `✦ ${intent.sk.name}（咆哮）`;
      if (k === 'heal') return `✦ ${intent.sk.name}（自愈）`;
      if (k === 'stun' || k === 'freeze') return `✦ ${intent.sk.name}（禁锢）`;
      if (k === 'poison' || k === 'burn' || k === 'bleed' || k === 'cursed') return `✦ ${intent.sk.name}（${k === 'poison' ? '附毒' : k === 'burn' ? '附焰' : k === 'bleed' ? '附血' : '附咒'}${intent.sk.rounds || (k === 'poison' ? 3 : k === 'cursed' ? 3 : 2)} 回合）`;
      const d = StatusFx.DEFS[k];
      return `✦ ${intent.sk.name}${d ? `（${d.name}）` : ''}`;
    }
    return '？';
  },
  /** v32（C1）：意图伤害预估——按敌方出手公式估 85%~115% 区间（格挡/防御/护体另算），
   *  「这手要不要防、能不能抢破招」从体感变成可计算的决策。
   *  v36（E229）：覆盖技能型出手——直伤/附毒焰血类按 enemySkill 实际乘数走同式 afterDef 估区间；
   *  纯资源型（摄灵/铁壁/咆哮/自愈）无气血直伤不估区间；区间歧义说明收敛在 intent-tag title 一处 */
  intentEstimate(intent) {
    const B = this.active;
    if (!B || !intent) return '';
    if (intent.kind !== 'strike' && intent.kind !== 'finisher' && intent.kind !== 'skill') return '';
    const p = Game.player;
    const st = Stat.compute(p);
    let mult;
    if (intent.kind === 'finisher') mult = 2.1;
    else if (intent.kind === 'strike') mult = intent.heavy ? 1.55 : 1;
    else {
      const k = intent.sk.kind;
      // enemySkill kindMap 各 case 实际乘数（与结算逐项同源）；纯资源/禁锢类无直伤估
      const SKILL_MULT = { damage: (intent.sk.mult || 1), poison: 0.8, burn: 0.9, bleed: 1.1, cursed: 0.9, defdown: 0.9, slow: 0.85, weaken: 0.9, drain: (intent.sk.mult || 1.2), mpburn: 0.6, stun: 0.8, freeze: 0.8 };
      if (k === 'guard' || k === 'roar' || k === 'heal') return '';   // 资源型：不伤气血，不估区间
      mult = SKILL_MULT[k];
      if (mult == null) return '';
    }
    const base = Stat.afterDef(this.enAtk(B.enemy) * mult, this.myDef(st));
    return ` ≈${Math.max(1, Math.round(base * 0.85))}~${Math.round(base * 1.15)}`;
  },

  /* ---------- v19 职业必杀技 ---------- */
  ultList() {
    const p = Game.player;
    return p.dao ? (GameData.BATTLE_SKILLS[p.dao] || []) : [];
  },
  /** v33（E67）：束缚/冰封对一切主动手段一视同仁——原控制只在 act()（普攻/法诀/防御/道具）入口被
   *  消耗，必杀/本命战技可照常出手且控制永不消耗（被控玩家连点必杀即可无视禁锢，敌控技形同虚设）。
   *  返回 true 表示本回合被控制吃掉（完整走完被控流程），调用方直接 return。 */
  async controlledConsume(st) {
    const B = this.active;
    if (!B) return false;
    if (!StatusFx.has(B.myFx, 'stun') && !StatusFx.has(B.myFx, 'freeze')) return false;
    B.busy = true;
    const frozen = StatusFx.has(B.myFx, 'freeze');
    this.log(`你身形被【${frozen ? '冰封' : '束缚'}】禁锢，纵有杀招在手亦难施展——这一回合无法动弹！`, 'log-warn');
    B.myFx = StatusFx.removeKinds(B.myFx, ['stun', 'freeze']);
    this.render();
    await this.wait(500);
    await this.enemyTurn();
    if (!this.active) return true;
    // v31 修瑕：缺敌方死亡判定——敌方若在己方回合殒命（如反伤/DOT），尸身会悬在场上、战斗永不收束
    if (B.enemy.hp <= 0) { await this.victory(); return true; }
    if (await this.afterEnemyPhase(st)) return true;
    B.busy = false;
    this.render();
    this.autoNext();
    return true;
  },
  async actUlt(id) {
    const B = this.active;
    const p = Game.player;
    const st = Stat.compute(p);
    if (!B || B.over || B.busy) return;
    const sk = this.ultList().find(x => x.id === id);
    if (!sk) return;
    if ((B.zhenyuan || 0) < sk.cost) { UI.toast('真元不足'); return; }
    if (await this.controlledConsume(st)) return;   // v33（E67）：被控不可施必杀
    B.busy = true;
    B.zhenyuan -= sk.cost;
    B.menu = null;
    try {
    // v20 必杀熟练度：每式使用累积，每 8 次升一重（至三重），效果 +6%/重
    p.ultLv = p.ultLv || {};
    const uses = (p.ultLv[id] || 0) + 1;
    p.ultLv[id] = uses;
    const mst = Math.min(3, Math.floor(uses / 8));
    const mstMul = 1 + mst * 0.06;
    if (uses % 8 === 0) { this.log(`【必杀精进】${sk.name} 愈发圆融如意——熟练 ${mst} 重（效果 +${mst * 6}%）！`, 'log-gain'); UI.toast(`${sk.name} 熟练 ${mst} 重`); }
    this.log(`【必杀 · ${sk.name}】${sk.desc}${mst ? `（熟练 ${mst} 重）` : ''}`, 'log-crit');
    Ambience.sfx('crit');
    this.fxShow({ sword: 'sword', pill: 'fire', talisman: 'lightning', body: 'quake', array: 'array', demonic: 'demonic' }[p.dao] || 'sword');   // v19 必杀全屏特效
    await this.wait(500);
    const hits = sk.hits || 1;
    if (sk.selfHp) { p.hp = Math.max(1, Math.round(p.hp * (1 - sk.selfHp))); this.log(`你燃血催招，气血降至 ${p.hp}！`, 'log-warn'); }
    for (let h = 0; h < hits && B.enemy.hp > 0; h++) {
      let dmg = Stat.afterDef(this.myAtk(st) * (sk.mult || 1) * mstMul, this.enDef(B.enemy)) * Utils.randF(0.95, 1.2) * this.moraleMul();
      const crit = Utils.chance(this.myCrit(st) + (sk.crit || 0) + StatusFx.pctOf(B.enemy.fx, 'vuln'));   // v30：破绽加成会心
      if (crit) dmg *= 1.7;
      dmg = Math.max(1, Math.round(dmg));
      B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
      B.stats.out += dmg;
      if (B.stats.src) B.stats.src.ult += dmg;
      this.pushFloat('enemy', `-${dmg}`, crit ? 'crit' : 'dmg');
      B.hitShake = true;
      this.addMorale(10);
      this.gainZyOnCrit(p, crit);   // v32 修瑕（E8）：必杀多段会心同样回真元（聚气归元）
      this.onEnemyHit(B, st, dmg);   // v34（C1/C2）：魔棘反伤/不灭复活全路径接线
      if (sk.leech && p.hp < st.maxHp) {
        const heal = Math.max(1, Math.round(dmg * sk.leech));
        p.hp = Math.min(st.maxHp, p.hp + heal);
        this.log(`血气倒灌——回复 <b>${heal}</b> 点气血。`, 'log-gain');
      }
      await this.wait(360);
      if (hits > 1 && h > 0) this.log(`第${['二', '三', '四', '五'][h - 1] || h + 1}段杀招接踵而至！再造成 <b>${Math.max(0, dmg)}</b> 点伤害。`, 'log-crit');
    }
    if (sk.heal) {
      const heal = Math.round(st.maxHp * sk.heal * mstMul);
      p.hp = Math.min(st.maxHp, p.hp + heal);
      this.log(`丹香入腹——回复 <b>${heal}</b> 点气血。`, 'log-gain');
    }
    if (sk.burn && B.enemy.hp > 0) { StatusFx.add(B.enemy.fx, { kind: 'burn', pct: sk.burn.pct, rounds: sk.burn.rounds }); this.log(`${B.enemy.name} 被丹火缠身！`, 'log-gain'); }
    if (sk.defdown && B.enemy.hp > 0) { StatusFx.add(B.enemy.fx, { kind: 'defdown', pct: sk.defdown, rounds: sk.rounds || 2 }); this.log(`${B.enemy.name} 防御大破！`, 'log-gain'); }
    if (sk.weaken && B.enemy.hp > 0) { StatusFx.add(B.enemy.fx, { kind: 'weaken', pct: sk.weaken, rounds: sk.rounds || 2 }); this.log(`${B.enemy.name} 力量被蚀！`, 'log-gain'); }
    if (sk.slow && B.enemy.hp > 0) { StatusFx.add(B.enemy.fx, { kind: 'slow', pct: sk.slow, rounds: sk.rounds || 2 }); this.log(`${B.enemy.name} 身形迟滞！`, 'log-gain'); }
    if (sk.guard) { this.gainBuff({ kind: 'shield', pct: sk.guard, rounds: sk.rounds || 3 }); this.log('金身罩体，水火难侵！', 'log-gain'); }
    if (sk.stun && B.enemy.hp > 0 && Utils.chance(sk.stun * this.ctrlDecayOnEnemy())) { StatusFx.add(B.enemy.fx, { kind: 'stun', rounds: 1 }); this.log(`${B.enemy.name} 被震得神魂摇晃，下回合难以行动！`, 'log-gain'); }
    if (sk.freeze && B.enemy.hp > 0 && Utils.chance(sk.freeze * this.ctrlDecayOnEnemy())) { StatusFx.add(B.enemy.fx, { kind: 'freeze', rounds: 1 }); this.log(`紫雷封形——${B.enemy.name} 被冻结一回合！`, 'log-gain'); }   // v32（E9）：必杀控制同吃递减
    if (B.enemy.hp <= 0) { await this.victory(); return; }
    await this.enemyTurn(st);
    if (!B.over) {
      if (B.enemy.hp <= 0) { await this.victory(); return; }   // v20：反伤/反击等中途斩杀
      if (await this.afterEnemyPhase(st)) return;
    }
    this.render();
    B.busy = false;
    this.autoNext();
    } catch (err) {
      // v32 修瑕（A1）：必杀路径原无异常兜底——任何异常都会让 busy 永不复位（全场按钮禁用、自动战斗卡死）
      console.error('必杀异常:', err);
      B.busy = false;
      if (!B.over) { this.log('（气机一时紊乱，此回合作废）', 'log-warn'); this.render(); }
    }
  },

  /** v20 本命法宝觉醒战技：guard3 金光 / strike6 锁魂 / strike9 归一斩（每战各一次） */
  async actBenming(k) {
    const B = this.active;
    const p = Game.player;
    const st = Stat.compute(p);
    if (!B || B.over || B.busy) return;
    if (B.bmUsed && B.bmUsed[k]) return;
    const bmLv = (p.benming && p.benming.lv) || 0;
    const need = { guard3: 3, strike6: 6, strike9: 9 }[k] || 0;
    if (bmLv < need) { UI.toast('本命法宝阶数不足'); return; }
    if (await this.controlledConsume(st)) return;   // v33（E67）：被控不可发本命战技
    B.busy = true;
    B.menu = null;
    try {
    if (k === 'guard3') {
      B.bmUsed.guard3 = true;
      this.gainBuff({ kind: 'shield', pct: 30, rounds: 2 });
      this.log('【本命·护主金光】法宝自主嗡鸣，金光罩体——两回合内所受伤害减轻三成！', 'log-gain');
    } else if (k === 'strike6') {
      B.bmUsed.strike6 = true;
      this.log('【本命·锁魂一击】法宝化作流光直贯敌身！', 'log-crit');
      this.fxShow('lightning');
      await this.wait(400);
      let dmg = Stat.afterDef(this.myAtk(st) * 2.5, this.enDef(B.enemy)) * Utils.randF(0.95, 1.2) * this.moraleMul();
      dmg = Math.max(1, Math.round(dmg));
      B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
      B.stats.out += dmg; if (B.stats.src) B.stats.src.ult += dmg;
      StatusFx.add(B.enemy.fx, { kind: 'defdown', pct: 30, rounds: 3 });
      this.pushFloat('enemy', `-${dmg}`, 'crit');
      B.hitShake = true;
      this.onEnemyHit(B, st, dmg);   // v34（C1/C2）：魔棘反伤/不灭复活全路径接线
      this.log(`造成 <b>${dmg}</b> 点伤害，敌方防御大破！`, 'log-crit');
    } else if (k === 'strike9') {
      B.bmUsed.strike9 = true;
      this.log('【本命·两世归一斩】两世道韵合流于器，一斩而下！', 'log-crit');
      this.fxShow('sword');
      await this.wait(500);
      let dmg = Stat.afterDef(this.myAtk(st) * 4.0, this.enDef(B.enemy)) * Utils.randF(1.0, 1.25) * this.moraleMul();
      dmg = Math.max(1, Math.round(dmg));
      B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
      const heal = Math.round(st.maxHp * 0.15);
      p.hp = Math.min(st.maxHp, p.hp + heal);
      B.stats.out += dmg; if (B.stats.src) B.stats.src.ult += dmg;
      this.pushFloat('enemy', `-${dmg}`, 'crit');
      this.pushFloat('me', `+${heal}`, 'heal');
      B.hitShake = true;
      this.onEnemyHit(B, st, dmg);   // v34（C1/C2）：魔棘反伤/不灭复活全路径接线
      this.log(`造成 <b>${dmg}</b> 点伤害，并借器反哺回复 <b>${heal}</b> 点气血！`, 'log-crit');
    }
    this.render();
    if (B.enemy.hp <= 0) { await this.victory(); return; }
    await this.wait(400);
    await this.enemyTurn();
    if (!this.active) return;
    if (B.enemy.hp <= 0) { await this.victory(); return; }
    if (await this.afterEnemyPhase(st)) return;
    B.busy = false;
    this.render();
    this.autoNext();
    } catch (err) {
      // v32 修瑕（A1）：本命战技路径同补异常兜底（busy 永锁防护与必杀一致）
      console.error('本命战技异常:', err);
      B.busy = false;
      if (!B.over) { this.log('（气机一时紊乱，此回合作废）', 'log-warn'); this.render(); }
    }
  },

  /** v32（C7）：凝神——战意与真元的主动互转通道（不耗行动回合，每回合一次）：
   *  20 战意换 1 真元，或 15 战意净化一项自身负面。给防御/控制抗压局一个主动解法。
   *  v34（C4）：被束缚/冰封时同样禁用（E67 漏网的不耗行动入口），且净化列表不再包含控制本身——
   *  原被控点凝神 → 15 战意洗掉束缚且不耗行动，敌方控制技退化成「替玩家扣 15 战意」。 */
  async actNingshen() {
    const B = this.active;
    if (!B || B.busy || B.over) return;
    if (B._ningUsed) { UI.toast('凝神一转——本回合已用过（敌方回合后可再用）'); return; }
    if (StatusFx.has(B.myFx, 'stun') || StatusFx.has(B.myFx, 'freeze')) { UI.toast('身被禁锢，心神难凝——先设法脱困'); return; }
    const negs = (B.myFx || []).filter(x => ['poison', 'burn', 'bleed', 'cursed', 'defdown', 'slow', 'weaken', 'vuln'].includes(x.kind) && x.rounds > 0);
    const v = await UI.popup({
      title: '⚡ 凝 神',
      html: `敛息凝神，战意与真元互换一息（<b>不耗行动回合</b>，每回合一次）。<br>当前战意 <b>${B.morale || 0}</b> · 真元 <b>${B.zhenyuan || 0}/${B.zmax || 6}</b>${(B.zhenyuan || 0) >= (B.zmax || 6) ? '（真元已满，换气无益）' : ''}。`,
      options: [
        ...((B.zhenyuan || 0) < (B.zmax || 6) ? [{ text: '20 战意 → 1 真元', value: 'zy' }] : []),   // v33（E70）：真元满不再提供换气项——原满元照扣 20 战意白费
        ...(negs.length ? [{ text: `15 战意 → 净化【${(StatusFx.DEFS[negs[0].kind] || {}).name || '负面'}】`, value: 'purge' }] : []),
        { text: '收 势', value: null },
      ],
    });
    // v34（C4）：popup 等待期间快速双开可双份结算——resolve 后复查再扣
    if (v && (B._ningUsed || B.over)) { UI.toast('凝神一转——本回合已用过'); return; }
    if (v === 'zy') {
      if ((B.morale || 0) < 20) { UI.toast('战意不足 20'); return; }
      B.morale -= 20;
      B.zhenyuan = Math.min(B.zmax || 6, (B.zhenyuan || 0) + 1);
      this.log('你凝神一转，滚腾的战意化作一缕真元。（战意 -20，真元 +1）', 'log-gain');
      B._ningUsed = true;
    } else if (v === 'purge') {
      if ((B.morale || 0) < 15) { UI.toast('战意不足 15'); return; }
      B.morale -= 15;
      const target = negs[0];
      B.myFx = StatusFx.removeKinds(B.myFx, [target.kind]);
      this.log(`你凝神护体，战意化作金光涤荡——【${(StatusFx.DEFS[target.kind] || {}).name || '负面'}】尽数消散！（战意 -15）`, 'log-gain');
      B._ningUsed = true;
    }
    this.render();
  },

  /** v13：给敌方施加状态（符箓/破煞法诀） */
  /** v32 修瑕（E8）：塔规则祝福「聚气归元」单源入口——各伤害会心入口统一调用 */
  gainZyOnCrit(p, crit) {
    const B = this.active;
    if (!B || !crit) return;
    const gain = (B.ctx && B.ctx.tower && typeof TowerSys !== 'undefined' && TowerSys.modsOf) ? (TowerSys.modsOf(p).zyCrit || 0) : 0;
    if (!gain) return;
    B.zhenyuan = Math.min(B.zmax || 6, (B.zhenyuan || 0) + gain);
  },
  /** v32 修瑕（E9）：玩家侧控制递减——与 v31 D3 敌方侧对称。同一敌人连续受束缚/冰封，
   *  控制成算每次 -15%（下限 40%）：高亲昵灵兽追击+符箓/必杀曾可把敌方链式永控。 */
  ctrlDecayOnEnemy() {
    const B = this.active;
    if (!B) return 1;
    B.enemyCtrlN = (B.enemyCtrlN || 0) + 1;
    return Math.max(40, 100 - (B.enemyCtrlN - 1) * 15) / 100;
  },

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
    // v32 修瑕（A1）：p/st 原只声明在 me 分支内——v31 塔规则祝福「蚀骨双煞」在敌方分支引用
    // st.maxHp/p.hp 即 ReferenceError：持祝福的塔战只要敌方带 DOT，敌方回合整体作废（被 act 的
    // try/catch 吞成「气机紊乱」）且 DOT 永不衰减＝敌方被永久定身。提升至顶部两分支共用。
    const p = Game.player;
    const st = Stat.compute(p);
    if (who === 'me') {
      const rain = B.ctx && B.ctx.wx && B.ctx.wx.sky === 'rain';
      let dotDmg = 0;
      for (const x of B.myFx) {
        if (!(StatusFx.DEFS[x.kind] || {}).dot) continue;
        let v = Math.max(1, Math.round(st.maxHp * (x.pct || 3) / 100));
        if (x.kind === 'burn' && rain) v = Math.max(1, Math.round(v * 0.8));   // v20 雨天灼烧 -20%
        dotDmg += v;
      }
      if (dotDmg > 0) {
        // v30：真罡护体——所受 DOT 减半
        if (StatusFx.has(B.myFx, 'ward')) { dotDmg = Math.max(1, Math.round(dotDmg / 2)); parts.push('（真罡护体，毒火减半）'); }
        p.hp = Math.max(0, p.hp - dotDmg);
        B.stats.in += dotDmg;   // v29 修瑕：DOT 计入承受伤害（无伤胜/结算口径）
        this.pushFloat('me', `-${dotDmg}`, 'dmg');
        parts.push(`（毒火蚀体，气血 -${dotDmg}）`);
      }
      B.myFx = StatusFx.decayDots(B.myFx);
    } else {
      const e = B.enemy;
      const rain = B.ctx && B.ctx.wx && B.ctx.wx.sky === 'rain';
      let dotDmg = 0;
      for (const x of e.fx) {
        if (!(StatusFx.DEFS[x.kind] || {}).dot) continue;
        let v = Math.max(1, Math.round(e.hpMax * (x.pct || 3) / 100));
        if (x.kind === 'burn' && rain) v = Math.max(1, Math.round(v * 0.8));   // v20 雨天灼烧 -20%
        dotDmg += v;
      }
      if (dotDmg > 0) {
        // v31（D4）：塔规则祝福「蚀骨双煞」——敌方 DOT 翻倍，自身受 2% 反噬
        const twMods = (B.ctx.tower && typeof TowerSys !== 'undefined' && TowerSys.state) ? TowerSys.modsOf(Game.player) : {};
        if (twMods.dotMul) {
          dotDmg = Math.round(dotDmg * twMods.dotMul);
          const self = Math.max(1, Math.round(st.maxHp * (twMods.dotSelf || 0)));
          p.hp = Math.max(0, p.hp - self);
          this.pushFloat('me', `-${self}`, 'dmg');
          parts.push(`（蚀骨双煞反噬 -${self}）`);
        }
        e.hp = Math.max(0, e.hp - dotDmg);
        this.pushFloat('enemy', `-${dotDmg}`, 'dmg');
        if (B.stats && B.stats.src) B.stats.src.dot += dotDmg;
        if (B.stats) B.stats.out += dotDmg;   // v32 修瑕（E4）：敌方毒火原不入总伤——结算卡「共造成」小于构成之和
        parts.push(`${e.name} 在毒火中哀嚎（气血 -${dotDmg}）`);
        this.onEnemyHit(B, st, dotDmg);   // v36（E206）：敌方 DOT 路径接线——魔棘对毒火一视同仁反弹（反伤打玩家不回调自身、无递归）；「不灭」复活后 enemyTurn 的 hp<=0 判定自然放行
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
    // v30：记录玩家行动序列——敌方「反制读招」AI（连续同动作时狡诈/狂战应变）由此成立
    B.playerMoves = (B.playerMoves || []).slice(-4); B.playerMoves.push(kind);
    // v31 修瑕：补记最近一手动作——灵兽追击成算吃「主人刚普攻命中」（beast.js assist 原读 B.lastAct，
    // 全工程零赋值恒 undefined，加成从未生效）
    B.lastAct = kind;
    this.render();
    try {
    // v13 束缚/冰封：本次行动被跳过，控制状态随即消耗（v33（E67）：流程单源化为 controlledConsume，必杀/本命同守此门）
    if (await this.controlledConsume(st)) return;
    // v13 灵兽协助：出战灵兽有四成几率抢先扑击
    if (typeof BeastSys !== 'undefined' && await BeastSys.assist(st)) { await this.victory(); return; }
    // v35（E171）：魔棘反伤可经助战把玩家打到 0 血——行动前统一查存活（塔心不灭/元婴代死/
    // defeat 判定单源于 afterEnemyPhase），不再带着尸体继续出手
    if (p.hp <= 0) { await this.afterEnemyPhase(st); return; }
    switch (kind) {
      case 'attack': {
        const daoTier = DaoSys.tierLevel(p);
        const enSpd = this.enSpd(B.enemy);
        // v10 剑心六境·剑仙境：普攻必中
        const miss = (p.dao === 'sword' && daoTier >= 6) ? 0 : Utils.clamp(3 + (enSpd - this.mySpd(st)) + (B.fogDodge || 0) + (B.enemy.dodge || 0), 2, GameData.BALANCE.COMBAT.PLAYER_MISS_MAX);   // v29：敌方闪避生效；v34（C9）：失手上限接线集中配置
        if (Utils.chance(miss)) {
          this.log(`你奋力一击，却被 ${B.enemy.name} 敏捷地避开了！`);
          this.pushFloat('enemy', '闪避', 'miss');
          Ambience.sfx('miss');
          this.addMorale(-4);
          B.combo = 0;
        } else {
          let dmg = Stat.afterDef(this.myAtk(st), this.enDef(B.enemy)) * Utils.randF(GameData.BALANCE.COMBAT.DMG_RAND_MIN, GameData.BALANCE.COMBAT.DMG_RAND_MAX) * this.moraleMul() * this.comboMul();   // v32（E24）：伤害随机区间接线集中配置
          // v30 连携·势尽一击：法诀之后接普攻收尾——招式相衔，一击 +15%
          if (B.lastSkillTag != null) { dmg *= 1.15; this.log('【连携·势尽】法力余韵未散，此击顺势而发——+15%！', 'log-gain'); }
          B.lastSkillTag = null; B.skillChain = 0; B.skillSeq = 0;   // v32（C3）：普攻断连珠之势
          // v18 种族克制（玩家恒为人族；v20 修瑕：移除恒真三元死条件）
          const speciesRel = GameData.speciesRelation('human', B.enemy.species);
          if (speciesRel > 0) dmg *= 1 + GameData.BALANCE.SPECIES_COUNTER.bonus;
          else if (speciesRel < 0) dmg *= 1 - GameData.BALANCE.SPECIES_COUNTER.bonus;   // v35（E173）：克制幅度接线 SPECIES_COUNTER.bonus（原字面量 ±15%）
          const eqFx = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? ForgeSys.suffixFx(p) : {};   // v19 词缀特效
          // v19 词缀·斩杀：对血量低于两成的敌人增伤
          if (eqFx.execute > 0 && B.enemy.hp < B.enemy.hpMax * 0.2) dmg *= 1 + eqFx.execute;
          // v30：破绽状态——敌人露出破绽时更易被会心
          const crit = Utils.chance(this.myCrit(st) + StatusFx.pctOf(B.enemy.fx, 'vuln'));
          // v10 剑心六境·剑芒境：暴击伤害 +20%
          if (crit) dmg *= (p.dao === 'sword' && daoTier >= 2 ? 1.9 : GameData.BALANCE.COMBAT.CRIT_MULT);   // v32（E24）：暴击倍率接线集中配置
          // 剑修：剑心通明伤害翻倍（剑心通明境触发率提至三成）
          const jianxin = p.dao === 'sword' && Utils.chance(daoTier >= 3 ? 30 : 20);
          if (jianxin) dmg *= 2;
          // v10 般若六境·易筋境：普攻伤害 +10%
          if (p.dao === 'body' && daoTier >= 4) dmg *= 1.1;
          dmg = Math.max(1, Math.round(dmg));
          B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
          if (B.stats && B.stats.src) B.stats.src.attack += dmg;
          // v20 破招：对蓄力中的敌人打出会心，可打断杀招并追加五成攻击的伤害
          if (crit && B.enemy.charging) {
            B.enemy.charging = false;
            B.intent = null;
            p.counters.breaks = (p.counters.breaks || 0) + 1;   // v27 修瑕：破招从未计数，成就「破招行家」永不可解锁
            const brk = Math.max(1, Math.round(Stat.afterDef(this.myAtk(st) * 0.5, this.enDef(B.enemy)) * Utils.randF(0.9, 1.1)));
            B.enemy.hp = Math.max(0, B.enemy.hp - brk);
            if (B.stats) { B.stats.out += brk; if (B.stats.src) B.stats.src.attack += brk; }   // v31 修瑕（E5）：破招追加未入 src.attack
            this.pushFloat('enemy', `-${brk}`, 'crit');
            this.log(`【破招】会心正中蓄力破绽——${B.enemy.name} 的杀招被硬生生打断，再受 <b>${brk}</b> 点伤害！`, 'log-crit');
          }
          const comboCap = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? 5 + (ForgeSys.suffixFx(p).comboUp || 0) : 5;   // v19 词缀·连击上限
          B.combo = Math.min(comboCap, (B.combo || 0) + 1);   // v13 连击累积
          B.stats.out += dmg; if (B.combo > B.stats.maxCombo) B.stats.maxCombo = B.combo;   // v19 统计
          // v31（D4）：塔规则祝福「聚气归元」——会心额外 +1 真元
          let zyGain = (crit || jianxin) ? 2 : 1;
          B.zhenyuan = Math.min(B.zmax || 6, (B.zhenyuan || 0) + zyGain);   // v19 真元（v20 上限随道境）
          this.gainZyOnCrit(p, crit);   // v32 修瑕（E8）：聚气归元单源化——原只在普攻会心结算，必杀/合击会心不回真元
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
            if (B.stats) { B.stats.out += echo; if (B.stats.src) B.stats.src.attack += echo; }   // v31 修瑕（E5）：追伤不入统计——结算卡「共造成」系统性偏低
            this.log(`剑气余韵追至！再对 ${B.enemy.name} 造成 <b>${echo}</b> 点伤害。`, 'log-crit');
          }
          // v10 境界特性 · 法相（合体起）：两成几率引动法相，追加五成攻击的一击
          // v34（C5）：走战斗内攻防口径——原用面板原始 atk，狂暴/虚弱/敌方防御全不生效（对堆防敌零减免）
          if (p.realmIdx >= 6 && B.enemy.hp > 0 && Utils.chance(20)) {
            const extra = Math.max(1, Math.round(Stat.afterDef(this.myAtk(st) * 0.5, this.enDef(B.enemy))));
            B.enemy.hp = Math.max(0, B.enemy.hp - extra);
            if (B.stats) { B.stats.out += extra; if (B.stats.src) B.stats.src.attack += extra; }
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
          // v19 精英词缀·魔棘/不灭 → v34（C1/C2）：抽 onEnemyHit 单源，必杀/本命/法诀/符箓/合击同享
          this.onEnemyHit(B, st, dmg);
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
        // v30 连招体系：同类连放「势涨」+6%/层（至多3层）；异类交替「互济」+10%；
        // 按出战技能盘顺序出招「循势」+8%（打乱则从该诀重新起势）——技能盘从过滤器变成构筑
        const tag = sk.tag || ({ damage: '攻', heal: '疗', buffDef: '守', buffDodge: '影' }[sk.kind]);
        if (B.lastSkillTag === tag) {
          B.skillChain = Math.min(3, (B.skillChain || 0) + 1);
          power *= 1 + 0.06 * B.skillChain;
          this.log(`【连携·势涨】同源法诀连绵不绝——威力 +${6 * B.skillChain}%！`, 'log-gain');
        } else if (B.lastSkillTag != null) {
          power *= 1.10;
          this.log('【连携·互济】刚柔并济，法力相生——此诀 +10%！', 'log-gain');
          B.skillChain = 0;
        } else B.skillChain = 0;
        B.lastSkillTag = tag;
        // v32（C3）连珠：连续施法三连起每连 +4%（上限 +12%）——盘内连绵成势的构筑奖励；
        // 普攻/防御/道具断势（连招状态经 C2 势标签可视化）
        B.skillSeq = (B.skillSeq || 0) + 1;
        if (B.skillSeq >= 3) {
          const lz = Math.min(3, B.skillSeq - 2) * 0.04;
          power *= 1 + lz;
          this.log(`【连珠】法诀如珠连贯，第 ${B.skillSeq} 诀顺势而燃——+${Math.round(lz * 100)}%！`, 'log-gain');
        }
        const deck = (Array.isArray(p.battleDeck) ? p.battleDeck : []).filter(id => p.gongfa[id] && GameData.ITEMS[id] && GameData.ITEMS[id].skill);
        if (deck.length > 1) {
          const pos = deck.indexOf(arg);
          if (pos >= 0) {
            if ((B.deckCursor || 0) === pos) { power *= 1.08; this.log('【循势】法诀依盘序运转，灵力如环无端——+8%！', 'log-gain'); }
            B.deckCursor = (pos + 1) % deck.length;
          }
        }
        // v10 剑心三境·第三重「万剑归宗」：法诀伤害 +25%
        if (p.dao === 'sword' && DaoSys.tierLevel(p) >= 5) power *= 1.25;
        // v20 雨天：雷系法诀 +20%
        if (B.ctx && B.ctx.wx && B.ctx.wx.sky === 'rain' && /雷/.test(def.name)) power *= 1.2;
        if (sk.kind === 'damage') {
          // v34（C6）：雾战闪避对法诀生效——开场文案「双方身形皆难捉摸」，原只有普攻侧吃到 B.fogDodge
          const miss = Utils.clamp(3 + (this.enSpd(B.enemy) - this.mySpd(st)) + (B.fogDodge || 0) + (B.enemy.dodge || 0), 2, GameData.BALANCE.COMBAT.SKILL_MISS_MAX);   // v29：敌方闪避生效；v34（C9）：法诀失手与普攻分档接线
          if (Utils.chance(miss)) {
            this.log(`你施展【${sk.name}】，却被对方堪堪避过！`);
            this.pushFloat('enemy', '闪避', 'miss');
          } else {
            let dmg = Stat.afterDef(this.myAtk(st) * power, this.enDef(B.enemy)) * Utils.randF(0.9, 1.15) * this.moraleMul() * this.comboMul();
            if (this.eFx(B, 'e_tstorm')) dmg *= 1.3;   // v20 精英词缀·雷皮：受法诀伤害 +30%
            const crit = Utils.chance(this.myCrit(st) + StatusFx.pctOf(B.enemy.fx, 'vuln'));   // v30：破绽加成会心
            if (crit) dmg *= 1.7;
            dmg = Math.max(1, Math.round(dmg));
            B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
            this.pushFloat('enemy', `-${dmg}`, crit ? 'crit' : 'dmg');
            if (B.stats) { B.stats.out += dmg; if (B.stats.src) B.stats.src.skill += dmg; }
            B.hitShake = true;
            this.addMorale(10);
            Battle.fxShow('sword');
            this.gainZyOnCrit(p, crit);   // v36（E209）：法诀会心回真元——塔祝福「聚气归元」（无普攻限定）原只接普攻/必杀，主输出手段漏接
            this.onEnemyHit(B, st, dmg);   // v34（C1/C2）：魔棘反伤/不灭复活全路径接线
            this.log(`你施展 <b>${sk.name}</b>！${crit ? '会心一击！' : ''}造成 <b>${dmg}</b> 点伤害！`, 'log-crit');
          }
        } else if (sk.kind === 'heal') {
          const heal = Math.round(st.maxHp * power / 100);
          p.hp = Math.min(st.maxHp, p.hp + heal);
          this.pushFloat('me', `+${heal}`, 'heal');
          this.log(`你施展 <b>${sk.name}</b>，气血恢复 ${heal} 点。`, 'log-gain');
        } else if (sk.kind === 'buffDef') {
          const fresh = B.buffs.defRounds <= 0;   // 续施不重复触发
          B.buffs.defPower = power; B.buffs.defRounds = sk.rounds;
          // v35（E140）修瑕：镜像补接——法诀护体系走旧 B.buffs 直写不经 gainBuff，「镜像」永不触发
          //（同词缀下丹药/符箓增益会触发）；因 B.buffs 与 StatusFx 是两套体系，防御不可双计，
          // 故走专用探针只补镜像反应，不落 fx
          if (fresh) this.mirrorProbe();
          this.log(`你施展 <b>${sk.name}</b>，周身罡气激荡，防御大增！`, 'log-gain');
        } else if (sk.kind === 'buffDodge') {
          const fresh2 = B.buffs.dodgeRounds <= 0;
          B.buffs.dodgeBonus = power; B.buffs.dodgeRounds = sk.rounds;
          if (fresh2) this.mirrorProbe();   // v35（E140）：残影步类同理
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
            // v27 修瑕：祭符伤害此前用面板原始 atk，狂暴/虚弱等状态不生效（与全战斗口径不一致）
            let dmg = Stat.afterDef(this.myAtk(st) * (def.power || 2.2), this.enDef(B.enemy)) * Utils.randF(0.95, 1.1) * this.moraleMul() * this.comboMul();
            if (p.dao === 'talisman' && DaoSys.tierLevel(p) >= 3) dmg *= 1.3;   // v10 符道六境·雷笔境
            if (this.eFx(B, 'e_tstorm')) dmg *= 1.3;   // v20 精英词缀·雷皮
            if (B.ctx && B.ctx.wx && B.ctx.wx.sky === 'rain' && /雷/.test(def.name)) dmg *= 1.2;   // v20 雨天雷符 +20%
            dmg = Math.max(1, Math.round(dmg));
            B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
            this.pushFloat('enemy', `-${dmg}`, 'crit');
            if (B.stats) { B.stats.out += dmg; if (B.stats.src) B.stats.src.skill += dmg; }
            B.hitShake = true;
            this.addMorale(8);
            this.onEnemyHit(B, st, dmg);   // v34（C1/C2）：魔棘反伤/不灭复活全路径接线
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
              const thunder = Math.max(1, Math.round(this.myAtk(st) * 0.2));
              B.enemy.hp = Math.max(0, B.enemy.hp - thunder);
              if (B.stats) { B.stats.out += thunder; if (B.stats.src) B.stats.src.skill += thunder; }   // v31 修瑕（E5）：追雷不入统计
              this.onEnemyHit(B, st, 0);   // v34（C1）：追雷补不灭复查（反伤不重复结算，传 0）
              this.log(`一道追雷随符而落！再对 ${B.enemy.name} 造成 <b>${thunder}</b> 点伤害！`, 'log-crit');
            }
          } else if (fk === 'shield') {
            this.gainBuff({ kind: 'shield', pct: def.power || 40, rounds: def.rounds || 2 });
            this.pushFloat('me', '金光护体', 'heal');
            this.log(`你祭出 <b>${def.name}</b>——金光罩体，${def.rounds || 2} 回合内所受伤害减轻${def.power || 40}%！`, 'log-gain');
          } else if (fk === 'dodge') {
            this.gainBuff({ kind: 'agiup', pct: 30, rounds: def.rounds || 2 });
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
            if (Utils.chance(resist + (1 - this.ctrlDecayOnEnemy()) * 100)) {   // v32（E9）：冰封符吃控制递减——连续祭符成功率衰减
              this.log(`【${def.name}】寒气罩落，却被 ${B.enemy.name} 以妖力震碎——未能封住其身形！`, 'log-warn');
            } else {
              Battle.fxShow('ice-frost');
            this.applyEnemyFx(B.enemy, { kind: 'freeze', rounds: def.rounds || 1 }, `【${def.name}】寒气封形——${B.enemy.name} 被冰封，下一回合无法动弹！`);
            }
          } else if (fk === 'vuln') {
            // v30：破阵符——符光如镜照出气机破绽，敌人更易被会心
            Battle.fxShow('fire');
            this.applyEnemyFx(B.enemy, { kind: 'vuln', pct: def.power || 30, rounds: def.rounds || 2 }, `【${def.name}】符光如镜——${B.enemy.name} 气机破绽毕露，受击更易被会心（+${def.power || 30}%），持续 ${def.rounds || 2} 回合！`);
          } else if (fk === 'ward') {
            // v30：真罡符——真罡护体，所受毒火减半
            this.gainBuff({ kind: 'ward', pct: 50, rounds: def.rounds || 2 });
            this.pushFloat('me', '真罡护体', 'heal');
            this.log(`你祭出 <b>${def.name}</b>——真罡罩体，${def.rounds || 2} 回合内所受毒火蚀骨之伤减半！`, 'log-gain');
          }
        } else if (def.buff) {
          // v13 战斗增益丹：狂暴 / 铁骨 / 轻身 / 明目（v31：走 gainBuff 统一入口——镜像词缀由此覆盖一切增益）
          const b = def.buff;
          if (b.atkPct) this.gainBuff({ kind: 'atkup', pct: b.atkPct, rounds: b.rounds || 3 });
          if (b.defPct) this.gainBuff({ kind: 'defup', pct: b.defPct, rounds: b.rounds || 3 });
          if (b.spdPct || b.dodge) this.gainBuff({ kind: 'agiup', pct: Math.max(b.spdPct || 0, b.dodge || 0), rounds: b.rounds || 3 });
          // v27 修瑕：轻身丹「闪避 +10%」此前从未生效——dodge 需并入闪避加成而非只取 max 塞进身法
          if (b.dodge) { B.buffs.dodgeBonus = b.dodge; B.buffs.dodgeRounds = b.rounds || 3; }
          if (b.crit) this.gainBuff({ kind: 'critup', pct: b.crit, rounds: b.rounds || 3 });
          this.pushFloat('me', def.name, 'heal');
          this.log(`你服下 <b>${def.name}</b>——${def.desc.split('——')[1] || '气力涌动'}！`, 'log-gain');
        } else {
          Pill.apply(p, def, true);
          this.log(`你服下 <b>${def.name}</b>！`, 'log-gain');
        }
        B.lastSkillTag = null; B.skillChain = 0; B.skillSeq = 0;   // v33（E69）：道具断势——v32 注释宣称「普攻/防御/道具断势」，道具分支漏网（符箓成不断势的免费填充物）
        break;
      }
      case 'defend': {
        B.defending = true;
        // v31 修瑕（E15）：防御打断连携——lastSkillTag 跨回合保留曾让「法诀→防御→普攻」白吃势尽加成（免费囤 buff）
        B.lastSkillTag = null; B.skillChain = 0; B.skillSeq = 0;   // v32（C3）：防御断连珠之势
        if (p.dao === 'body') DaoSys.gain(p, 6);   // v16 体魄
        this.addMorale(6);
        B.zhenyuan = Math.min(B.zmax || 6, (B.zhenyuan || 0) + 1);   // v19 真元（v20 上限随道境）
        p.mp = Math.min(st.maxMp, p.mp + Math.round(st.maxMp * 0.15));
        this.log('你凝神戒备，摆出防御姿态，灵力缓缓回复，战意亦在蓄积。', 'log-gain');
        break;
      }
      case 'combo': {
        // v30 灵兽合击：亲昵≥60 的人兽合击技——心意相通，人兽如一
        // v31（D2）：从「每战一次」改付费充能——首用免费，此后 3 战意 2 真元一次（多波与长战不再浪费）
        const comboN = B.comboUsed || 0;
        const needMorale = comboN > 0 ? 3 : 0, needZy = comboN > 0 ? 2 : 0;
        if (typeof BeastSys === 'undefined' || !BeastSys.comboReady(p)) { UI.toast('人兽合击未就绪（需出战灵兽且亲昵 ≥ 60）'); B.busy = false; this.render(); return; }
        if (comboN > 0 && ((B.morale || 0) < needMorale || (B.zhenyuan || 0) < needZy)) {
          UI.toast(`战意/真元不足——再次合击需战意 ${needMorale}、真元 ${needZy}`);
          B.busy = false; this.render(); return;
        }
        if (comboN > 0) { B.morale -= needMorale; B.zhenyuan -= needZy; }
        B.comboUsed = comboN + 1;
        const b = BeastSys.activeBeast(p);
        this.log(`【人兽合击】${b.name} 与你心意相通，人兽如一！${comboN > 0 ? '（战意 -3，真元 -2）' : ''}`, 'log-crit');
        this.fxShow('lightning');
        Ambience.sfx('crit');
        await this.wait(400);
        const spFx = { snake: ['poison', 5, 3], beast: ['bleed', 4, 3], element: ['burn', 5, 3], plant: ['slow', 30, 2], swarm: ['defdown', 25, 2] }[b.species] || ['bleed', 4, 3];
        const comboFeed = 1 + Math.min(5, (B.combo || 0)) * 0.04;   // v31（D2）：合击吃连击层（每层 +4%，上限 +20%）
        const bondBoost = ((b.bond || 0) >= 100 ? 1.25 : 1);   // v31（E-灵兽）：亲昵满百合击 +25%
        let cdmg = Stat.afterDef(this.myAtk(st) * (1.2 + b.power * 0.015 + b.level * 0.05) * (b.evolved ? 1.3 : 1) * comboFeed * bondBoost, this.enDef(B.enemy)) * Utils.randF(0.95, 1.2) * this.moraleMul();
        cdmg = Math.max(1, Math.round(cdmg));
        B.enemy.hp = Math.max(0, B.enemy.hp - cdmg);
        this.pushFloat('enemy', `-${cdmg}`, 'crit');
        B.hitShake = true;
        if (B.stats) { B.stats.out += cdmg; if (B.stats.src) { B.stats.src.beast += Math.round(cdmg / 2); B.stats.src.attack += cdmg - Math.round(cdmg / 2); } }
        this.addMorale(12);
        if (B.enemy.hp > 0) this.applyEnemyFx(B.enemy, { kind: spFx[0], pct: spFx[1], rounds: spFx[2] });
        this.onEnemyHit(B, st, cdmg);   // v34（C1/C2）：魔棘反伤/不灭复活全路径接线
        this.log(`人兽合力，一击贯穿——<b>${cdmg}</b> 点伤害，${(StatusFx.DEFS[spFx[0]] || {}).name || ''}随之而落！`, 'log-crit');
        break;
      }
      case 'flee': {
        // v27 修瑕：遁走成算改用结算后身法口径（此前用敌方原始 spd，「迅影」「迟滞」均不参与）
        const chance = Utils.clamp(GameData.BALANCE.COMBAT.FLEE_BASE + (this.mySpd(st) - this.enSpd(B.enemy)) * 2, 10, 90);   // v32（E24）：遁走基础成算接线集中配置
        if (Utils.chance(chance)) {
          this.log('你虚晃一招，遁走而去，好汉不吃眼前亏！', 'log-warn');
          await this.wait(700);
          if (B.ctx.spar) NpcSys.afterSpar(p, B.ctx.npcId, false);
          if (B.ctx.dungeon) DungeonSys.onFlee();
          if (B.ctx.tower) TowerSys.onFlee();   // v25：塔内遁走等同离塔，保全部收获
          // v27 修瑕：剧情战遁走此前不回调 onEnd——Story.cur 悬挂、主线永久停摆（软锁）
          if (B.ctx.story) {
            const cb = B.ctx.story.onEnd; B.ctx.story.onEnd = null;
            this.end(false);
            if (cb) cb(false);
            return;
          }
          // v27 修瑕：宗门大比遁走此前不结算本轮——免费重赛到三连胜（白嫖夺魁）
          if (B.ctx.tourney) {
            this.end(false);
            SectSys.onTourneyRound(false);
            return;
          }
          this.end(false);
          return;
        }
        this.log('你转身欲逃，却被对方拦住去路！', 'log-warn');
        break;
      }
    }
    this.render();
    if (B.enemy.hp <= 0) { await this.victory(); return; }
    // v35（E171）：魔棘反伤致死不再被敌方对着尸体补完整一轮——直接进收尾判定
    if (p.hp <= 0) { await this.afterEnemyPhase(st); return; }
    await this.wait(560);
    await this.enemyTurn();
    if (!this.active) return;
    if (B.enemy.hp <= 0) { await this.victory(); return; }   // v20：反伤/反击等中途斩杀
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

  /** v31（E11）：玩家增益统一入口——新获一类增益时触发精英词缀「镜像」。
   *  原镜像只认丹药 buff 分支：法诀护体/符箓金光疾风/本命金光等一切增益均不触发，与词缀描述不符。 */
  gainBuff(st) {
    const B = this.active;
    if (!B) return;
    const fresh = !StatusFx.has(B.myFx, st.kind);
    StatusFx.add(B.myFx, st);
    if (fresh) this.mirrorProbe();
  },

  /** v35（E140）：镜像反应探针——供 gainBuff 与法诀 buffDef/buffDodge（旧 B.buffs 直写路径，
   *  不入 StatusFx 故不能走 gainBuff，否则防御双计）共用 */
  mirrorProbe() {
    const B = this.active;
    if (!B || !B.enemy || B.enemy.hp <= 0) return;
    if (this.eFx(B, 'e_mirror')) {
      B.enemy._mirror = (B.enemy._mirror || 0) + 1;
      B.enemy.atk = Math.round(B.enemy.atk * 1.08);
      this.log(`【镜像】${B.enemy.name} 映照你的增益，妖气涨了一分（攻击 +8%）！`, 'log-warn');
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
    // v32 修瑕（E7）：塔心不灭原只在 enemyStrike 直伤结算内拦截——中毒/蚀骨反噬致死直接走
    // defeat，与「每场首次致死伤害」描述不符。挪到收口处统一拦截（DOT/反噬/直伤全覆盖）。
    if (p.hp <= 0 && B.ctx && B.ctx.tower && typeof TowerSys !== 'undefined' && TowerSys.modsOf && TowerSys.modsOf(p).undying && !B._undied) {
      B._undied = true;
      p.hp = 1;
      this.log('【塔心不灭】塔灵托住你将散的气机——一息生机尚存（本场不再触发）！', 'log-gain');
      UI.announce('✦ 塔心不灭 ✦', 'gold');
    }
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
    // v34（C8）：去掉 p.mp>0 死条件——被摄灵/裂魂抽干（mp=0）后回灵词缀原永久失效，
    // 恰在玩家最需要回灵的时刻罢工，与「每回合回复灵力」描述矛盾
    if (turnFx.mpRegen > 0 && p.mp < st.maxMp) {
      const mpReg = Math.max(1, Math.round(st.maxMp * turnFx.mpRegen * 0.01));
      p.mp = Math.min(st.maxMp, p.mp + mpReg);
      this.log(`法宝温养灵台——灵力回涌 ${mpReg} 点。`, 'log-gain');
    }
    B.turn = (B.turn || 1) + 1;
    B._ningUsed = false;   // v32（C7）：凝神每回合一次，敌方回合后恢复
    return false;
  },

  /** v20 自动战斗策略配置（持久化）：血线阈值 / 必杀偏好 / 符箓保留 */
  AUTO_KEY: 'fanren_wd_autocfg',
  autoCfg() {
    if (!this._cfg) {
      this._cfg = { hp: 40, ult: 'auto', tal: 0 };
      try {
        const raw = Save.storage.getItem ? Save.storage.getItem(this.AUTO_KEY) : Save.mem[this.AUTO_KEY];
        if (raw) Object.assign(this._cfg, JSON.parse(raw) || {});
      } catch (e) { /* ignore */ }
    }
    return this._cfg;
  },
  async autoCfgPopup() {
    const c = this.autoCfg();
    const ok = await UI.popup({
      title: '自动战斗 · 策略',
      html: `替你执掌招式的起居注——按此策略自动出招。<br>
        <div class="auto-row">残血服药线 <select id="ac-hp">${[30, 40, 50, 60].map(v => `<option value="${v}" ${c.hp === v ? 'selected' : ''}>${v}%</option>`).join('')}</select></div>
        <div class="auto-row">必杀偏好 <select id="ac-ult">
          <option value="auto" ${c.ult === 'auto' ? 'selected' : ''}>有真元就放</option>
          <option value="save" ${c.ult === 'save' ? 'selected' : ''}>攒满真元再放</option>
          <option value="off" ${c.ult === 'off' ? 'selected' : ''}>不自动放必杀</option>
        </select></div>
        <div class="auto-row">符箓保留 <select id="ac-tal">${[0, 1, 2, 3].map(v => `<option value="${v}" ${c.tal === v ? 'selected' : ''}>留 ${v} 张</option>`).join('')}</select></div>
        <div class="tip-line">· 残血服药线同时决定法诀治疗与血遁类必杀的出手时机。</div>`,
      options: [{ text: '记 下', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    c.hp = Number(document.getElementById('ac-hp').value) || 40;
    c.ult = document.getElementById('ac-ult').value || 'auto';
    c.tal = Number(document.getElementById('ac-tal').value) || 0;
    try {
      const raw = JSON.stringify(c);
      if (Save.storage.setItem) Save.storage.setItem(this.AUTO_KEY, raw); else Save.mem[this.AUTO_KEY] = raw;
    } catch (e) { /* ignore */ }
    UI.toast('自动战斗策略已更新');
    this.render();
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
    const cfg = this.autoCfg();
    const hpLine = st.maxHp * (cfg.hp / 100);
    // 1) 残血：优先疗伤丹（v32 修瑕 E12：改由廉到贵——原最贵的大还丹先吃）
    if (p.hp < hpLine) {
      const healPill = ['pill_liaoshang', 'pill_guben', 'pill_dahuan'].find(id => Bag.count(id) > 0);
      if (healPill) { this.act('item', healPill); return; }
    }
    // 2) 敌方蓄力杀招在即：防御化解
    if (B.enemy.charging) { this.act('defend'); return; }
    // 3) 被束缚/冰封：行动会被跳过，直接点防御等待
    if (StatusFx.has(B.myFx, 'stun') || StatusFx.has(B.myFx, 'freeze')) { this.act('defend'); return; }
    // v20 3.5) 职业必杀策略表：真元够且条件满足即施放（各道打法各异；偏好可攒满/禁用）
    if (cfg.ult !== 'off') {
      const ultStrategy = {
        sword:    { id: 'us1', when: () => B.enemy.hp > B.enemy.hpMax * 0.5 },                 // 敌健在则剑斩削血
        pill:     { id: 'up2', when: () => p.hp < hpLine * 1.6 },                              // 血线偏低以丹心续命
        talisman: { id: 'ut1', when: () => B.enemy.hp > B.enemy.hpMax * 0.2 },                 // 雷狱压制
        body:     { id: 'ub1', when: () => !!B.enemy.elite || B.enemy.hp > B.enemy.hpMax * 0.7 }, // 精英或开局崩山震
        array:    { id: 'ua2', when: () => B.enemy.hp > B.enemy.hpMax * 0.3 },                 // 八方杀阵收割
        demonic:  { id: 'ud1', when: () => p.hp < hpLine * 1.75 },                             // 血遁吸血续航
      }[p.dao];
      const zOk = cfg.ult === 'save' ? (B.zhenyuan || 0) >= (B.zmax || 6) : (B.zhenyuan || 0) >= 3;
      if (ultStrategy && zOk && ultStrategy.when()) {
        const sk = (GameData.BATTLE_SKILLS[p.dao] || []).find(x => x.id === ultStrategy.id);
        if (sk && (B.zhenyuan || 0) >= sk.cost) { this.actUlt(ultStrategy.id); return; }
      }
    }
    // v36（E210）：3.6) 合击步——autoPilot 决策链原永不用人兽合击（act('combo') 全工程唯一触发点
    // 在按钮），免费首用 + 最高常规倍率长期闲置。首用免费不设护栏；付费合击需战意≥3 且真元≥2
    // （对齐 act('combo') 消耗口径），且敌方血量高于普攻期望伤才值当（防浪费）
    if (typeof BeastSys !== 'undefined' && BeastSys.comboReady(p)) {
      const comboN = B.comboUsed || 0;
      if (comboN === 0 || ((B.morale || 0) >= 3 && (B.zhenyuan || 0) >= 2 && B.enemy.hp > this.myAtk(st))) {
        this.act('combo'); return;
      }
    }
    // v18 4) 自动祭符：符修优先，伤害符/控制符（v20：保留张数可配置）
    if (p.dao === 'talisman') {
      const talList = Object.entries(p.bag).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman' && p.bag[id] > (cfg.tal || 0));
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
      if (p.hp < st.maxHp * 0.35 && healSkills.length) {
        // v35（E139）修瑕：比较器原读死键 `.heal`（治疗法诀的回复量字段是 `.power`，全表无 .heal），
        // 恒 0 空转、永远施放插入序第一个治疗诀——v32（E12）的「按回复量择优」从未生效
        healSkills.sort((a2, b2) => ((GameData.ITEMS[b2[0]].skill || {}).power || 0) - ((GameData.ITEMS[a2[0]].skill || {}).power || 0));
        this.act('skill', healSkills[0][0]); return;
      }
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
    // v32（C5）：敌方自状态管理——坚韧/铁壁型回合初两成五几率「运功逼毒」清自身最早一条
    // 毒火/减益；狡诈型两成几率偷取玩家一项增益转为己用。长战不再单边倒计时。
    const NEG_KINDS = ['poison', 'burn', 'bleed', 'cursed', 'defdown', 'slow', 'weaken', 'vuln'];
    if ((e.tpl === 'tough' || e.tpl === 'iron') && (e.fx || []).some(x2 => NEG_KINDS.includes(x2.kind)) && Utils.chance(25)) {
      const idx2 = e.fx.findIndex(x2 => NEG_KINDS.includes(x2.kind));
      const removed = e.fx.splice(idx2, 1)[0];
      this.log(`${e.name} 沉腰坐马运功逼毒——【${(StatusFx.DEFS[removed.kind] || {}).name || removed.kind}】被生生逼出体外！`, 'log-warn');
    } else if (e.tpl === 'cunning' && Utils.chance(20)) {
      const GOOD_STEAL = ['atkup', 'agiup', 'critup'];
      const idx3 = (B.myFx || []).findIndex(x3 => GOOD_STEAL.includes(x3.kind) && x3.rounds > 0);
      if (idx3 >= 0) {
        const stolen = B.myFx.splice(idx3, 1)[0];
        StatusFx.add(e.fx, { kind: stolen.kind, pct: stolen.pct, rounds: stolen.rounds });
        this.log(`【偷梁换柱】${e.name} 袖中一拂，你的【${(StatusFx.DEFS[stolen.kind] || {}).name || ''}】竟被夺去转嫁己身！`, 'log-warn');
      }
    }
    // v30 节奏2.0：久战力竭——第 8 回合起守势崩解（防 -25%）、第 14 回合起气力不济（攻 -15%），
    // 终结「坚守+治疗×2+铁壁」的拖沓对局螺旋
    if (!(B.ctx.spar || B.ctx.story || B.ctx.tourney) && (B.turn || 1) >= 8 && !e._exhausted) {
      e._exhausted = true;
      e.def = Math.round(e.def * 0.75);
      this.log(`${e.name} 久战力竭——攻势虽在，守势已然崩解（防御 -25%）！`, 'log-gain');
    }
    if ((B.turn || 1) >= 14 && !e._weary) {
      e._weary = true;
      e.atk = Math.round(e.atk * 0.85);
      this.log(`${e.name} 气力不济，动作明显迟滞了（攻击 -15%）——胜负之机已现！`, 'log-gain');
    }
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
    if (e.hp <= 0) { this.planIntent(); return; }
    if (StatusFx.has(e.fx, 'stun') || StatusFx.has(e.fx, 'freeze')) {
      const frozen = StatusFx.has(e.fx, 'freeze');
      this.log(`${e.name} 被【${frozen ? '冰封' : '束缚'}】困住，这一回合动弹不得！`, 'log-gain');
      e.fx = StatusFx.removeKinds(e.fx, ['stun', 'freeze']);
      // v27 修瑕：敌方被缚跳过回合时照常收尾——此前提前 return 不复位防御标记、不衰减增益，
      // 玩家「防御 + 冰封」连招可白吃一整回合 40% 减伤与反击机会
      if (B.buffs.defRounds > 0) { B.buffs.defRounds--; if (B.buffs.defRounds === 0) B.buffs.defPower = 0; }
      if (B.buffs.dodgeRounds > 0) { B.buffs.dodgeRounds--; if (B.buffs.dodgeRounds === 0) B.buffs.dodgeBonus = 0; }
      if (e.guardRounds > 0) { e.guardRounds--; if (e.guardRounds === 0) e.guardPower = 0; }
      // v30：状态引擎统一衰减（金光盾/真罡/敌方虚弱自此不再漏衰减）
      B.myFx = StatusFx.tick(B.myFx, 'mineEnd');
      e.fx = StatusFx.tick(e.fx, 'enemyEnd');
      B.defending = false;
      this.planIntent();
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
    // v18 敌方 AI 状态机已抽为 enemyDecide()（v20）；此处执行【意图预演】承诺的下一手——
    // 玩家在面板上看到的就是敌人即将打出的招，防御/破招/遁走的博弈由此成立
    const act = B.intent || this.enemyDecide();
    B.intent = null;
    if (act.kind === 'finisher') {
      // 蓄力完成：杀招
      e.charging = false;
      this.log(`${e.name} 蓄势已满，<b>杀招</b>轰然落下！`, 'log-crit');
      this.enemyStrike(st, 2.1, true);
    } else if (act.kind === 'skill') {
      this.enemySkill(st, act.sk);
    } else if (act.kind === 'charge') {
      e.charging = true;
      this.log(`${e.name} 妖气翻涌、筋肉隆起——它正在<b>蓄力</b>，下回合将施展杀招！`, 'log-warn');
      this.pushFloat('enemy', '蓄力', 'miss');
      // v24 情境教学：首次遭遇蓄力，教一次「防御破招」
      const pp = Game.player;
      if (pp && !(pp.flags || {}).tut_parry) {
        pp.flags = pp.flags || {};
        pp.flags.tut_parry = true;
        setTimeout(() => UI.toast('⚔ 教学：敌正蓄力——此刻选【防御】可破招反击！'), 400);
      }
    } else {
      const heavy = !!act.heavy;
      this.enemyStrike(st, heavy ? 1.55 : 1, heavy);
    }
    // v20 精英词缀·群狼：驰援撕咬
    if (this.eFx(B, 'e_wolf') && e.hp > 0 && p.hp > 0 && Utils.chance(15)) {
      this.log(`【群狼·驰援】一头幼狼应声扑出，狠狠咬了你一口！`, 'log-warn');
      this.enemyStrike(st, 0.6, false, '幼狼撕咬');
    }
    // 回合数递减
    if (B.buffs.defRounds > 0) { B.buffs.defRounds--; if (B.buffs.defRounds === 0) B.buffs.defPower = 0; }
    if (B.buffs.dodgeRounds > 0) { B.buffs.dodgeRounds--; if (B.buffs.dodgeRounds === 0) B.buffs.dodgeBonus = 0; }
    if (e.guardRounds > 0) { e.guardRounds--; if (e.guardRounds === 0) e.guardPower = 0; }
    // v30：状态引擎统一衰减（同上）
    B.myFx = StatusFx.tick(B.myFx, 'mineEnd');
    e.fx = StatusFx.tick(e.fx, 'enemyEnd');
    B.defending = false;
    this.planIntent();   // v20：预演下一手，供玩家回合读招
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
        this.fxShow('poison-mist');   // v20 绿雾特效
        this.log(`【${sk.name}】毒液入体——你中毒了！每回合将损血，持续 ${sk.rounds || 3} 回合。`, 'log-loss');
        Ambience.sfx('poison');
      },
      burn: () => {
        this.enemyStrike(st, 0.9, false);
        StatusFx.add(B.myFx, { kind: 'burn', pct: sk.pct || 3.5, rounds: sk.rounds || 2 });
        this.fxShow('burn-spark');   // v20 火星特效
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
        e._ctrlN = (e._ctrlN || 0) + 1;
        const ctrlResist = Math.max(40, 100 - (e._ctrlN - 1) * 15) / 100;   // v31（D3）：控制递减
        if (Utils.chance((e.elite ? 75 : 55) * ctrlResist)) {
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
        e.guardPower = sk.def || GameData.BALANCE.COMBAT.GUARD_DEF_BASE;   // v34（C9）：接线集中配置
        e.guardRounds = sk.rounds || 2;
        this.pushFloat('enemy', '铁壁', 'heal');
        this.log(`【${sk.name}】${e.name} 硬甲铿锵——防御大增（+${sk.def || GameData.BALANCE.COMBAT.GUARD_DEF_BASE}%），持续 ${sk.rounds || 2} 回合！`, 'log-warn');
      },
      roar: () => {
        e._roared = true;   // v29：每场限一次
        e.atk = Math.round(e.atk * (1 + (sk.atk || 25) / 100));
        this.pushFloat('enemy', '咆哮', 'crit');
        this.log(`【${sk.name}】${e.name} 发出震天咆哮——攻击提升${sk.atk || 25}%！`, 'log-warn');
        Ambience.sfx('rage');
      },
      heal: () => {
        e._healCount = (e._healCount || 0) + 1;   // v29：每场限两次
        const healed = Math.max(1, Math.round(e.hpMax * (sk.pct || 15) / 100));
        e.hp = Math.min(e.hpMax, e.hp + healed);
        this.pushFloat('enemy', `+${healed}`, 'heal');
        this.log(`【${sk.name}】${e.name} 汲取天地生机，回复 ${healed} 点气血！`, 'log-warn');
      },
      /* v30 修瑕：敌方技能池补齐——原 kindMap 无 freeze/cursed，NPC「冰弦裂魂」与雷狱主宰核心技
         「灭世雷罚」都退化为 1.0× 白板普攻，顶配敌人的招式表名存实亡 */
      freeze: () => {
        e._ctrlN = (e._ctrlN || 0) + 1;
        const cr2 = Math.max(40, 100 - (e._ctrlN - 1) * 15) / 100;   // v31（D3）：控制递减
        if (Utils.chance((e.elite ? 75 : 55) * cr2)) {
          StatusFx.add(B.myFx, { kind: 'freeze', rounds: sk.rounds || 1 });
          this.log(`【${sk.name}】凛霜冻结血脉——你被<b>冰封</b>，下回合无法行动！`, 'log-loss');
        } else {
          this.log(`【${sk.name}】你真气鼓荡震碎寒霜，没有被冻住！`, 'log-warn');
          this.enemyStrike(st, 0.8, false);
        }
      },
      cursed: () => {
        this.enemyStrike(st, 0.9, false, `${sk.name}命中`);
        StatusFx.add(B.myFx, { kind: 'cursed', pct: sk.pct || 8, rounds: sk.rounds || 3 });
        this.log(`【${sk.name}】咒雷入体不去——每回合将受其蚀骨，持续 ${sk.rounds || 3} 回合！`, 'log-loss');
      },
    };
    (kindMap[sk.kind] || (() => this.enemyStrike(st, 1, false)))();
  },

  /** v8：敌方一次攻击结算（mult 威力倍率；杀招同样可被闪避/格挡/防御化解；v13 计入状态修正） */
  enemyStrike(st, mult, heavy, tagText) {
    const B = this.active;
    const p = Game.player;
    const e = B.enemy;
    const dodgeChance = Utils.clamp(3 + (this.mySpd(st) - this.enSpd(e)) * 1.1 + st.dodge + (B.buffs.dodgeRounds > 0 ? B.buffs.dodgeBonus : 0) + (B.fogDodge || 0), 0, GameData.BALANCE.COMBAT.ENEMY_DODGE_MAX);
    if (Utils.chance(dodgeChance)) {
      this.log(`${e.name} ${tagText || (heavy ? '杀招当头' : '扑击而来')}，却被你身形一晃，堪堪避过！`);
      this.pushFloat('me', '闪避', 'miss');
      this.addMorale(6);
      return;
    }
    let dmg = Stat.afterDef(this.enAtk(e) * mult, this.myDef(st)) * Utils.randF(GameData.BALANCE.COMBAT.DMG_RAND_MIN, GameData.BALANCE.COMBAT.DMG_RAND_MAX);   // v35（E173）：敌方随机区间接线集中配置
    // v18 种族克制：敌方攻击时计算种族关系
    const speciesRel = GameData.speciesRelation(e.species, 'human');
    if (speciesRel > 0) dmg *= 1 + GameData.BALANCE.SPECIES_COUNTER.bonus;
    else if (speciesRel < 0) dmg *= 1 - GameData.BALANCE.SPECIES_COUNTER.bonus;
    // v34（C3）：会心计入被偷走的「明目」增益（偷梁换柱 critup 此前零读取）
    const crit = Utils.chance(e.crit + StatusFx.pctOf(e.fx, 'critup'));
    if (crit) dmg *= GameData.BALANCE.COMBAT.ENEMY_CRIT_MULT;   // v35（E173）：接线集中配置（原字面量 1.6）
    const preMit = dmg;   // v29：总减伤封顶锚点（攻防/克制/暴击之后）
    const blocked = Utils.chance(st.block);
    if (blocked) dmg *= GameData.BALANCE.COMBAT.BLOCK_REDUCTION;   // v32（E24）：接线集中配置
    if (B.defending) dmg *= GameData.BALANCE.COMBAT.DEFEND_REDUCTION;
    // v13 金光护体（金光符）：减伤
    const shieldPct = StatusFx.pctOf(B.myFx, 'shield');
    if (shieldPct > 0) dmg *= 1 - shieldPct / 100;
    // v10 职业道境 · 般若一重「铜皮境」：所受伤害 -8%
    if (p.dao === 'body' && DaoSys.tierLevel(p) >= 1) dmg *= 0.92;
    // v10 境界特性 · 金丹护体：单次伤害超过三成气血上限时减免两成
    let guarded = false;
    if (p.realmIdx >= 2 && dmg > st.maxHp * 0.3) { dmg *= 0.8; guarded = true; }
    // v29：多层减伤连乘曾可趋近零伤——总减免封顶 85%，防御流仍强但不再无敌
    dmg = Math.max(preMit * 0.15, dmg);
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
    // v20 精英词缀·瘟疫 / 裂魂
    if (this.eFx(B, 'e_plague') && p.hp > 0 && Utils.chance(25)) {
      const kind = Utils.pick(['poison', 'burn', 'bleed']);
      StatusFx.add(B.myFx, { kind, pct: 2.5, rounds: 2 });
      text += `<br>【瘟疫】${(StatusFx.DEFS[kind] || {}).name || '蚀毒'}入体——每回合将损血！`;
    }
    if (this.eFx(B, 'e_soul') && p.hp > 0 && st.maxMp > 0) {
      const mpLost = Math.max(1, Math.round(st.maxMp * 0.2));
      p.mp = Math.max(0, p.mp - mpLost);
      text += `<br>【裂魂】阴冷之力摄走你 ${mpLost} 点灵力。`;
    }
    // v20 反击：防御姿态下被命中，两成五几率顺势还一手（五成攻）
    if (B.defending && p.hp > 0 && e.hp > 0 && Utils.chance(25)) {
      const cDmg = Math.max(1, Math.round(Stat.afterDef(this.myAtk(st) * 0.5, this.enDef(e)) * Utils.randF(0.9, 1.1)));
      e.hp = Math.max(0, e.hp - cDmg);
      if (B.stats) { B.stats.out += cDmg; if (B.stats.src) B.stats.src.counter += cDmg; }
      this.pushFloat('enemy', `-${cDmg}`, 'dmg');
      text += `<br>【反击】你借力卸势、顺势还招——${e.name} 受 <b>${cDmg}</b> 点伤害！`;
      this.onEnemyHit(B, st, 0);   // v36（E206）：反击致死路径接线——传 0 仅复查「不灭」，不触发魔棘防「反伤套反伤」双计
    }
    // v19 词缀·反伤/荆棘
    const thorns = (typeof ForgeSys !== 'undefined' && ForgeSys.suffixFx) ? ForgeSys.suffixFx(p).thorns : 0;
    if (thorns > 0 && e.hp > 0 && p.hp > 0) {
      const back = Math.max(1, Math.round(dmg * thorns));
      e.hp = Math.max(0, e.hp - back);
      this.pushFloat('enemy', `-${back}`, 'dmg');
      if (B.stats && B.stats.src) B.stats.src.thorns += back;
      text += `<br>【词缀·反伤】荆棘归鞘——${e.name} 反受 <b>${back}</b> 点伤害。`;
      this.onEnemyHit(B, st, 0);   // v36（E206）：词缀反伤致死路径接线——传 0 仅复查「不灭」防双计
    }
    this.log(text, crit ? 'log-crit' : 'log-battle');
  },

  rollDrops(e, ctx = {}, rate = 1) {
    const p = Game.player;
    const drops = [];
    // v36（E208）：掉落系数单源——rate（多波半额 0.5 等）× ctx.dropMul（魔域 1.4 / 兽潮 1.3 / 深耕等）
    // 原主掉落不乘 rate（E169「半额掉落」只折了经验未折材料）、dropMul 自 v20 起是死参数，
    // 倍率数值自此真实生效；魔域/深耕/兽潮「额外一撮」块保留原状（本身即 dropMul 的呈现）
    const coef = rate * (ctx.dropMul || 1);
    // v20 夜战：夜行所获亦丰（额外掉落判定）
    if (ctx.wx && ctx.wx.night && Utils.chance(35 * coef)) {
      const mat = Utils.pick(GameData.matsByTier(e.dropTier));
      Bag.addItem(mat, 1);
      drops.push(`${GameData.ITEMS[mat].name} ×1（夜获）`);
    }
    if (Utils.chance(45 * coef)) {   // v36（E207）：主掉落补乘 rate——中间波材料期望 0.540→0.270 件/波，E169 声明归真
      const qty = Utils.chance(20) ? 2 : 1;
      const mat = Utils.pick(GameData.matsByTier(e.dropTier));
      Bag.addItem(mat, qty);
      drops.push(`${GameData.ITEMS[mat].name} ×${qty}`);
    }
    // v20 精英词缀·守财：死后掉落翻倍（额外一次材料掷取）
    if (e._fxGold && Utils.chance(60 * coef)) {
      const qty = Utils.chance(20) ? 2 : 1;
      const mat = Utils.pick(GameData.matsByTier(e.dropTier));
      Bag.addItem(mat, qty);
      drops.push(`${GameData.ITEMS[mat].name} ×${qty}（守财遗财）`);
    }
    // v19 丹方残页：精英 12% / 普通妖兽 3%
    if (Utils.chance((e.elite ? 12 : 3) * coef)) {
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
    if (e.rareDrop && Utils.chance((30 + KarmaSys.rareDropBonus(p)) * coef)) {
      const rd = GameData.ITEMS[e.rareDrop];
      if (!(rd.type === 'gongfa' && p.gongfa[e.rareDrop])) {
        Bag.addItem(e.rareDrop, 1);
        drops.push(`【${rd.name}】`);
      }
    }
    // v32 修瑕（E7）：仙缘套装断头路补源——灵墟/雷狱精英第二稀有掉落（仙缘剑/铃）
    // v33（E78）修瑕：气运加成原全额叠加（10+45=55%），与「一成几率」文案差五倍——
    // 第二稀有单独压系数（封顶约二成），大福缘仍占便宜但不至于刷穿断头路
    if (e.rareDrop2 && Utils.chance((10 + Math.round(KarmaSys.rareDropBonus(p) * 0.25)) * coef)) {
      const rd2 = GameData.ITEMS[e.rareDrop2];
      if (rd2) { Bag.addItem(e.rareDrop2, 1); drops.push(`【${rd2.name}】`); }
    }
    return drops;
  },

  async victory() {
    const B = this.active;
    const p = Game.player;
    if (!B) return;   // v30：closeOverlays 读档等时机可能已清空战斗（in-flight await 链回防）
    B.over = true;
    B.won = true;   // v23：战斗回顾胜负标记
    // v20 多波遭遇：妖群未绝 → 半额结算本波，立即接战下一波（仅普通战斗）
    if (B.ctx.waveIds && (B.waveIdx || 0) < B.ctx.waveIds.length - 1
      && !B.ctx.spar && !B.ctx.story && !B.ctx.dungeon && !B.ctx.npcId && !B.ctx.weType && !B.ctx.sectDanger && !B.ctx.tourney) {
      B.over = false;
      const waveExp = Math.round(B.enemy.expGain * 0.5);
      Cultivate.addExp(p, waveExp);
      p.counters.wins++;
      // v35（E169）修瑕：中间波原只发半额修为——灵石/掉落全无、悬赏/宗门/精英计数只认最终波，
      // 三波妖群的前两波白打（悬赏目标在波内时「亲手斩杀却不推进」，玩家直观感受为任务坏了）
      const waveStone = Math.round(B.enemy.stoneGain * 0.5);
      if (waveStone > 0) Bag.addStones(waveStone);
      const waveDrops = this.rollDrops(B.enemy, B.ctx, 0.5);
      if (B.enemy.elite) p.counters.killsElite = (p.counters.killsElite || 0) + 1;
      if (B.enemy.id) { SectSys.onKill(B.enemy.id); BountySys.onKill(B.enemy.id); }
      Log.add(`你击溃了第 ${B.waveIdx + 1} 波妖群（修为 +${Utils.fmtNum(waveExp)}${waveStone ? `、灵石 +${Utils.fmtNum(waveStone)}` : ''}）——喘息未定，第 ${B.waveIdx + 2} 波已扑到眼前！`, 'warn');
      if (waveDrops.length) Log.add(`捡获：${waveDrops.join('、')}。`, 'log-gain');
      B.waveIdx++;
      const e2 = buildMonster(B.ctx.waveIds[B.waveIdx]);
      // v30 修瑕：续波与首波同口径——夜战倍率 1.1→1.15、补吃 worldMul、补图鉴收录（原续波敌不 Meta.see，图鉴漏收）
      if (e2.id) Meta.see('monster', e2.id);
      e2.hp = e2.hpMax; e2.fx = []; e2.guardRounds = 0; e2.guardPower = 0; e2.raged = false; e2.charging = false;
      if (B.ctx.worldMul) {
        e2.hpMax = Math.round(e2.hpMax * B.ctx.worldMul); e2.atk = Math.round(e2.atk * B.ctx.worldMul);
        e2.expGain = Math.round(e2.expGain * B.ctx.worldMul); e2.stoneGain = Math.round(e2.stoneGain * B.ctx.worldMul);
        e2.hp = e2.hpMax;
      }
      if (B.ctx.wx && B.ctx.wx.night) e2.atk = Math.round(e2.atk * 1.15);
      // v31 修瑕（E6）：灵压/慑魂为常驻气场——续波同样受压（原开场压制只作用首波，续波相对变强）
      if (p.realmIdx >= 1) { e2.atk = Math.round(e2.atk * 0.9); e2.def = Math.round(e2.def * 0.9); }
      if (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 4) e2.crit = Math.round((e2.crit || 0) / 2);
      // v32 修瑕（E6）：阵道开场压制原只作用首波——后两波敌攻防凭空回升三成，与「抢先布阵」矛盾。
      // 续波按同款概率重掷阵法压制。
      if (B.ctx.arraySetup) {
        const pot = B.ctx.arrayGrand ? 0.5 : (B.ctx.arrayPotent ? 0.6 : 0.7);
        e2.atk = Math.round(e2.atk * pot); e2.def = Math.round(e2.def * pot);
        this.log('【阵旗重张】阵光再起——新扑上来的妖兽同样被困入阵中！', 'log-gain');
      } else if (p.dao === 'array' && DaoSys.tierLevel(p) >= 5 && Utils.chance(DaoSys.tierLevel(p) >= 6 ? 35 : 20)) {
        e2.atk = Math.round(e2.atk * 0.6); e2.def = Math.round(e2.def * 0.6);
        this.log('【杀阵】阵光骤起——新入阵者攻守尽堕四成！', 'log-crit');
      }
      // v31 修瑕（E6）：续波重置「每战一次」标记——原十波妖群只有一次人兽合击/一次本命觉醒/一次元婴代死
      // v36（E204）：重置清单抽 waveReset 单源，并并入连击层/连携势四字段（跨波滚存清零）
      this.waveReset(B);
      B.enemy = e2;
      B.enemyFxIds = [];
      if (e2.elite) this.rollEliteFx(B); else B.enemyFxIds = [];
      B.intent = null;
      if (!B.ctx.firstStrike && !B.ctx.ambush) this.planIntent();   // v35（E170）：续波重掷意图——原置空不重掷，每波首回合读招博弈断档一轮
      Anim.drop('bt-ehp');
      this.log(`⚔ 第 ${B.waveIdx + 1} 波——<b class="grade-0">${e2.name}</b>（${e2.realmLabel}${e2.elite ? ' · 精英' : ''}${e2.tplName ? ' · ' + e2.tplName : ''}）杀入战团！`, 'warn');
      B.busy = false;   // v22 修瑕：先解忙再渲染——原顺序会把 disabled 按钮锁死整场多波战斗（手动战斗卡死）
      this.render();
      this.autoNext();
      return;
    }
    const st = Stat.compute(p);
    // v25 登天塔：塔内战——先收战斗（腾出 Battle.active），再由 TowerSys 结算层奖并续层
    if (B.ctx.tower) {
      this.log(`${B.enemy.name} 寸寸崩解，化作满阶流萤——塔阶又向上亮起一层。`, 'log-system');
      this.end(false);
      await TowerSys.onVictory(B);
      return;
    }
    // v22 宗门大比：同门较技，点到为止，一轮战毕回传大比分
    if (B.ctx.tourney) {
      this.log('台上二人收势而立，裁判长老高声唱名。', 'log-system');
      Cultivate.addExp(p, Math.round(B.enemy.expGain * 0.3));
      p.counters.spars = (p.counters.spars || 0) + 1;
      await this.wait(700);
      SectSys.onTourneyRound(true);
      this.end(false);
      return;
    }
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
    if (p.hp < st.maxHp * 0.1) p.counters.lowHpWins = (p.counters.lowHpWins || 0) + 1;   // v20 残血翻盘
    if (B.stats.out > st.atk * 100) p.counters.bigOut = (p.counters.bigOut || 0) + 1;   // v20 一夜屠魔
    p.counters.wins++;
    if (B.enemy.elite) p.counters.killsElite = (p.counters.killsElite || 0) + 1;   // v6 成就计数
    // v27 修瑕：三项战斗挑战成就（无伤/速胜/越境）此前从未计数，永不可解锁
    if (B.stats && B.stats.in === 0) p.counters.hitlessWins = (p.counters.hitlessWins || 0) + 1;
    if ((B.turn || 1) <= 3) p.counters.quickWins = (p.counters.quickWins || 0) + 1;
    if ((B.enemy.power || 0) > (p.realmIdx * 4 + p.layer) + 2) p.counters.upsetWins = (p.counters.upsetWins || 0) + 1;
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
    const expGain = Math.round(B.enemy.expGain * arrBonus * (p.sect && p.sect.faction === 'tianshu' ? 1.1 : 1));   // v36（E226）：天枢殿派系 perk——每战获胜修为 +10%（对齐 commandActive 形态）
    const stoneGain = Math.round(B.enemy.stoneGain * arrBonus * (B.enemy._fxGold ? 1.5 : 1) * (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 5 ? 1.5 : 1));   // v10 魔君境；v20 守财
    Cultivate.addExp(p, expGain);
    // v31 修瑕（E4）：「福缘深厚，额外掉落灵石一袋」此前只进文案无实发——真给 15% 加成
    const luckBonus = (st.luck >= 8 && Utils.chance(15)) ? Math.max(1, Math.round(stoneGain * 0.15)) : 0;
    Bag.addStones(stoneGain + luckBonus);
    this.log(`战利品：修为 +${Utils.fmtNum(expGain)}，灵石 +${Utils.fmtNum(stoneGain + luckBonus)}${arrBonus > 1 ? '（阵道造诣，于遗迹所获更丰）' : ''}${luckBonus ? '（福缘深厚，额外掉落灵石一袋）' : ''}`, 'log-gain');
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
    if (B.ctx.npcId && B.ctx.mode === 'confront') NpcSys.onConfrontWin(p, B.ctx.npcId, !!B.ctx.showdown);
    if (B.ctx.mode === 'war' && p.sect) {
      p.sect.contrib += 200;
      this.log('战功赫赫！宗门贡献 +200。', 'log-gain');
      // v32 修瑕（E41）：宗门大战击杀 NPC 原零后果——「NPC 牵连」打完即忘（rel/grudge/记忆全不变）
      if (B.ctx.npcId && typeof NpcSys !== 'undefined' && NpcSys.onWarKill) NpcSys.onWarKill(p, B.ctx.npcId);
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
    UI.announce('战 斗 胜 利', 'ok');   // v4
    Ambience.sfx('victory');   // v5
    // v19 结算卡
    // v30 修瑕：结算卡须在 end(false) 之前挂载——原顺序先 end()（modal 已加 hidden）再守卫
    //          「modal 未隐藏」，恒 false，结算卡自 v19 起从未显示过（v29 的 5s 可点击也改在死分支里）
    if (B.stats) {
      const el = document.getElementById('battle-box');
      if (el && !document.getElementById('battle-modal').className.includes('hidden')) {
        const SRC_NAMES = { attack: '普攻', skill: '法诀/符', ult: '必杀', beast: '灵兽', dot: '毒火', thorns: '反伤', counter: '反击' };
        const srcTxt = Object.entries(B.stats.src || {}).filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1]).map(([k, v]) => `${SRC_NAMES[k] || k} ${Utils.fmtNum(v)}`).join(' · ');
        const box = document.createElement('div');
        box.className = 'bt-summary';
        box.innerHTML = `<div class="bt-sum-title">✦ 战 斗 结 算 ✦</div>
          <div class="tip-line">· 历时 <b>${B.turn || 1}</b> 回合 ｜ 最高连击 <b>×${B.stats.maxCombo}</b></div>
          <div class="tip-line">· 共造成 <b>${Utils.fmtNum(B.stats.out)}</b> 伤害，承受 <b>${Utils.fmtNum(B.stats.in)}</b> 伤害</div>
          ${srcTxt ? `<div class="tip-line">· 伤害构成：${srcTxt}</div>` : ''}
          <div class="tip-line">· 终局真元 ${B.zhenyuan || 0}/${B.zmax || 6}</div>`;
        el.appendChild(box);
        box.style.cursor = 'pointer';
        box.title = '点击关闭';
        box.addEventListener('click', () => box.remove());
        setTimeout(() => { if (box.isConnected) box.remove(); }, 5000);   // v29：2.6s→5s 且点击可提前关
      }
    }
    this.end(false);
    Log.add(`你击败了 <b>${B.enemy.name}</b>，获得修为 ${Utils.fmtNum(expGain)}、灵石 ${Utils.fmtNum(stoneGain)}${drops.length ? `、${drops.join('、')}` : ''}${p.dao === 'demonic' ? `，并吞噬其精元（修为额外 +${Utils.fmtNum(Math.round(expGain * (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 1 ? 0.3 : 0.2)))}）` : ''}。`, 'gain');
  },

  async defeat() {
    const B = this.active;
    const p = Game.player;
    if (!B) return;   // v30：closeOverlays 读档等时机可能已清空战斗（in-flight await 链回防）
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
    // v22 宗门大比落败：点到为止，止步仍领已胜彩头
    if (B.ctx.tourney) {
      const stT = Stat.compute(p);
      p.hp = Math.max(1, Math.round(stT.maxHp * 0.3));
      SectSys.onTourneyRound(false);
      this.end(false);
      return;
    }
    // v25 登天塔：塔内败北不出人命——止步结算，无灵石修为折损
    if (B.ctx.tower) {
      const stT2 = Stat.compute(p);
      p.hp = Math.max(1, Math.round(stT2.maxHp * 0.3));
      TowerSys.onDefeat();
      this.end(false);
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
    // v30 修瑕：战败罚款走总资产口径——原只扣下品余钱，归并后 low 恒 <100，实际惩罚 ≤19 灵石形同虚设
    const totalStones = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
    const lostLow = Bag.spendStonesMax(Math.round(totalStones * 0.2 * mul));
    p.hp = Math.max(1, Math.round(st.maxHp * 0.3));
    p.mp = Math.round(st.maxMp * 0.2);
    p.counters.defeats = (p.counters.defeats || 0) + 1;   // v6 成就计数
    // v27 联动：败北亦有道心代价——普通败北心魔 +3（切磋/大比/塔/秘境/剧情战不在此列，各分支已提前返回）
    if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 3, '败北之辱');
    // v36（E226）：高危生死状战败追加真实代价——灵石再折损一成（吃 aid 减免口径）+ 心魔 +5
    if (B.ctx.dangerTask) {
      const dangerLost = Bag.spendStonesMax(Math.round(totalStones * 0.1 * mul));
      if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 5, '生死状折损');
      Log.add(`生死状落败——敌对派系的耳目四布，此败折损甚重（灵石 -${Utils.fmtNum(dangerLost)}，心魔 +5）。`, 'loss');
    }
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
    if (this.active) {
      const logs = (this.active.logs || []).slice(-60);
      this.lastLogs = logs;   // v19 战斗回顾（兼容保留）
      // v23：最近三场回顾（会话内存，不进存档）
      const B2 = this.active;
      this.history = [{ foe: (B2.enemy && B2.enemy.name) || '?', won: !!B2.won, logs },
        ...(this.history || [])].slice(0, 3);
    }
    const B = this.active;
    const p = Game.player;
    // 邪修：杀伐之气萦绕，每场战斗孽障 +1
    // v30 修瑕：切磋/大比/剧情战/驯服等「点到为止」场合不再记杀业——原 end() 无差别结算
    if (B && p && p.dao === 'demonic' && !(B.ctx.spar || B.ctx.tourney || B.ctx.story || B._tame)) {
      p.karma = (p.karma || 0) + 1;
      DaoSys.gain(p, 2);   // v16 魔性
      Log.add('杀伐之气萦绕不去——孽障 +1。', 'loss');
    }
    const box = document.getElementById('battle-box');
    if (box) box.innerHTML = '';
    document.getElementById('battle-modal').classList.add('hidden');
    if (typeof UI !== 'undefined' && UI.syncAnnouncePos) UI.syncAnnouncePos();   // v21 公告归位
    this.active = null;
    Game.afterAction();
  },

  /** v36（E204）：多波续波跨波字段重置单源——v31 E6 七字段清单并入连击层/连携势四字段
   *  （B.combo/lastSkillTag/skillChain/skillSeq：上一波攒下的连击 comboMul +20%/层与法诀「势」的
   *  势尽 +15% 原跨波全额带入续波首击，恰是续波喘息 morale-30 要防的滚存）；此后新增跨波字段只改此处 */
  waveReset(B) {
    B.comboUsed = 0;   // 合击改付费充能后续波重置为「首用免费」（v31 E6）
    B.bmUsed = {};
    B.infantSaved = false;
    B.jadeSaved = false;
    B.enemyCtrlN = 0;   // v32（E9）：控制递减按波重计
    B.turn = 1;   // v32 修瑕（E14）：回合数跨波累计曾让续波新怪一进场就自带「久战力竭 -25%」（口径与「久战」文案不符）——现按波重计
    B.morale = Math.max(0, (B.morale || 0) - 30);   // 续波喘息：战意小幅回落，避免跨波无限滚存
    B.combo = 0;             // v36（E204）：连击层清零
    B.lastSkillTag = null;   // v36（E204）：法诀「势」跨波清零
    B.skillChain = 0;
    B.skillSeq = 0;
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
      // v20 出战技能盘：p.battleDeck 配置后仅展示盘内法诀（未配置或盘内皆未修则回落全部）
      const pool = Object.entries(p.gongfa).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].skill);
      const deck = (Array.isArray(p.battleDeck) ? p.battleDeck : []).filter(id => p.gongfa[id] && GameData.ITEMS[id] && GameData.ITEMS[id].skill);
      const eff = deck.length ? pool.filter(([id]) => deck.includes(id)) : pool;
      const skills = (eff.length ? eff : pool)
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
    const bound = !!(B.myFx && (StatusFx.has(B.myFx, 'stun') || StatusFx.has(B.myFx, 'freeze')));   // v33（E67）：被控时必杀/本命按钮同步置灰
    const boundTip = bound ? '（身被禁锢，无法施展）' : '';
    const ultBtns = ults.length ? ults.map(sk =>
      `<button class="btn btn-sm ult-btn" data-action="bt-ult" data-ult="${sk.id}" ${(B.busy || bound || (B.zhenyuan || 0) < sk.cost) ? 'disabled' : ''} title="${sk.desc}${boundTip}">${sk.name}<span style="color:var(--text-faint)">（真元${sk.cost}）</span></button>`).join('') : '';
    const ultRow = ultBtns ? `<div class="bt-sub ult-row">${ultBtns}</div>` : '';
    // v20 本命法宝觉醒战技（喂养 3/6/9 阶各解锁一式，每战各限一次）
    const bmLv = (p.benming && p.benming.lv) || 0;
    const bmOwn = (typeof ForgeSys !== 'undefined' && ForgeSys.benmingOwn) ? ForgeSys.benmingOwn(p) : false;
    B.bmUsed = B.bmUsed || {};
    const bmBtns = [];
    if (bmOwn && bmLv >= 3 && !B.bmUsed.guard3) bmBtns.push(`<button class="btn btn-sm" data-action="bt-benming" data-k="guard3" ${(B.busy || bound) ? 'disabled' : ''} title="金光罩体：两回合减伤三成${boundTip}">◍ 护主金光</button>`);
    if (bmOwn && bmLv >= 6 && !B.bmUsed.strike6) bmBtns.push(`<button class="btn btn-sm" data-action="bt-benming" data-k="strike6" ${(B.busy || bound) ? 'disabled' : ''} title="2.5× 伤害并破防三成${boundTip}">◈ 锁魂一击</button>`);
    if (bmOwn && bmLv >= 9 && !B.bmUsed.strike9) bmBtns.push(`<button class="btn btn-sm btn-primary" data-action="bt-benming" data-k="strike9" ${(B.busy || bound) ? 'disabled' : ''} title="4.0× 伤害并回复一成五气血${boundTip}">✦ 两世归一斩</button>`);
    const bmRow = bmBtns.length ? `<div class="bt-sub">${bmBtns.join('')}</div>` : '';
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
      `<button class="btn btn-sm" data-action="bt-autocfg" title="自动战斗策略">⚙策略</button>`,
      `<button class="btn btn-sm" data-action="bt-speed" title="战斗速度">速度 ${speedLabels[this.speed] || '×1'}</button>`,
      `<button class="btn btn-sm" data-action="bt-ning" ${B.over ? 'disabled' : ''} title="凝神：20战意换1真元，或15战意净化一项负面（不耗行动，每回合一次）">⚡凝神</button>`,   // v32（C7）
    ].join('');
    const canTame = !!(B.enemy.id && !B.enemy.elite && !(B.ctx && (B.ctx.tower || B.ctx.story || B.ctx.dungeon || B.ctx.weType || B.ctx.sectDanger != null)) && typeof BeastSys !== 'undefined' && BeastSys.TAMEABLE.includes(B.enemy.species)
      && !(B.ctx && B.ctx.waveIds && B.ctx.waveIds.length > 1)   // v33（E71）：多波妖群驯服首怪＝白捡半场经验跳过剩余波次
      && B.enemy.hp > 0 && B.enemy.hp <= B.enemy.hpMax * 0.2 && !B.over);   // v30：按 TAMEABLE 表判定；v31：塔影不可驯；v32（A2）：剧情/秘境/生死状/世界事件之敌非无主野兽，不可驯（驯服曾绕过全部结算分发，第一章可被驯服卡死）
    // v30 灵兽合击：亲昵 ≥60 的出战灵兽解锁人兽合击；v31（D2）：首用免费，此后 3 战意 2 真元充能
    const comboReady = typeof BeastSys !== 'undefined' && BeastSys.comboReady(p) && !B.over
      && (!(B.comboUsed > 0) || ((B.morale || 0) >= 3 && (B.zhenyuan || 0) >= 2));
    const comboBtn = comboReady
      ? `<button class="btn btn-sm btn-primary btn-glow" data-action="bt-combo" ${B.busy ? 'disabled' : ''} title="人兽如一的重击${(B.comboUsed || 0) > 0 ? '（再击耗战意3·真元2）' : '（每战首次免费）'}，附带物种效果">✦ 人兽合击</button>`
      : '';
    const tameBtn = canTame
      ? `<button class="btn btn-sm btn-primary btn-glow" data-action="bt-tame">✦ 驯 服（灵兽残血）</button>`
      : '';

    // v30 渲染增量化：已渲染的战斗日志原样保留——原每次出手都重建 #battle-box 并回放至多 120 条（极速档 O(回合²)）
    const _prevLog = document.getElementById('bt-log');
    const _prevCount = _prevLog ? _prevLog.children.length : -1;
    document.getElementById('battle-box').innerHTML = `
      <div class="battle-head">— 修 罗 场 —</div>
      <div class="bt-side side-enemy ${e.raged ? 'raged' : ''}" data-species="${e.species || 'beast'}">
        <div class="bt-name-row"><span class="bt-name enemy"><button class="bt-info-btn" data-action="bt-info" title="查看情报">🔍</button>${e.name}${e.elite ? ' <span class="tag danger">精英</span>' : ''}${e.tplName ? ` <span class="tag tpl" title="习性模板：${(GameData.MONSTER_TEMPLATES.find(t => t.id === e.tpl) || {}).desc || ''}">${e.tplName}</span>` : ''}${e._realmRule ? ` <span class="tag tpl" title="地脉规则：此秘境守敌受地脉加成（入秘时已公示）">${e._realmRule}</span>` : ''}${(B.waveIds && B.waveIds.length > 1) ? ` <span class="tag warn">第 ${B.waveIdx + 1}/${B.waveIds.length} 波</span>` : ''}${B.intent && !B.over ? ` <span class="tag intent-tag" title="意图预演：据此选择防御、破招或遁走（预估为未计格挡/会心的基础区间）">下一手 · ${this.intentLabel(B.intent)}${this.intentEstimate(B.intent)}</span>` : ''}${!(B.ctx.spar || B.ctx.story || B.ctx.tourney) && (B.turn || 1) === 7 && !e._exhausted ? ' <span class="tag safe">力竭将现</span>' : ''}${(B.enemyFxIds || []).length ? ' ' + B.enemyFxIds.map(fid => { const d = (GameData.ELITE_AFFIXES || []).find(x => x.id === fid); return d ? `<span class="tag danger" title="${d.desc}">◆${d.name}</span>` : ''; }).join('') : ''}${e.raged ? ' <span class="tag danger">狂暴</span>' : ''}${e._raged2 ? ' <span class="tag danger">血性</span>' : ''}${e._phase2 ? ' <span class="tag danger">狂乱</span>' : ''}${e.charging ? ' <span class="tag danger">蓄力杀招</span>' : ''}${StatusFx.has(e.fx, 'stun') || StatusFx.has(e.fx, 'freeze') ? ' <span class="tag">被缚</span>' : ''}${StatusFx.has(B.myFx, 'stun') || StatusFx.has(B.myFx, 'freeze') ? ' <span class="tag danger" title="你被禁锢——普攻/法诀/必杀/本命皆不可出，本回合行动将被跳过">身被禁锢</span>' : ''}</span><span class="bt-realm">${e.realmLabel} · 攻${this.enAtk(e)} 防${this.enDef(e)}</span></div>
        <div class="bt-figure enemy-fig" aria-hidden="true"></div>
        <div class="fx-tags">${StatusFx.tagsHtml(e.fx)}</div>
        <div class="bar"><div class="bar-fill hp${e.raged ? ' rage' : ''}" style="width:${ePct}%"></div><span class="bar-text"><span class="num-anim" data-nk="bt-ehp" data-nv="${e.hp}">${e.hp}</span> / ${e.hpMax}</span></div>
      </div>
      <div class="bt-vs">—— ✦ ——</div>
      <div class="bt-side side-me">
        <div class="bt-name-row"><span class="bt-name me">${Utils.esc(p.name)}${B.combo >= 2 ? ` <span class="tag combo">连击×${B.combo}</span>` : ''}${B.lastSkillTag != null ? ` <span class="tag combo" title="连携势——此刻身负「${B.lastSkillTag}」势：同势连放 +6%/层、异势互济 +10%、法诀后普攻势尽 +15%">势·${B.lastSkillTag}${(B.skillChain || 0) > 0 ? `×${B.skillChain}` : ''}</span>` : ''}${B.auto ? ' <span class="tag safe">自动</span>' : ''}</span><span class="bt-realm">攻${this.myAtk(st)} 防${this.myDef(st)} · 暴击${this.myCrit(st).toFixed(0)}%</span></div>   <!-- v32（C2）：连携势可视化 -->
        <div class="bt-figure me-fig" aria-hidden="true"></div>
        <div class="bar" title="气血 ${p.hp} / ${st.maxHp}"><div class="bar-fill hp${hpPct <= 30 ? ' low' : ''}" style="width:${hpPct}%"></div><span class="bar-text"><span class="num-anim" data-nk="bt-hp" data-nv="${p.hp}">${p.hp}</span> / ${st.maxHp}</span></div>
        <div class="bar" title="灵力 ${p.mp} / ${st.maxMp}"><div class="bar-fill mp" style="width:${mpPct}%"></div><span class="bar-text${(p.mp || 0) <= 0 ? ' dim' : ''}"><span class="num-anim" data-nk="bt-mp" data-nv="${p.mp}">${p.mp}</span> / ${st.maxMp}</span></div>
        <div class="bar morale-bar" title="战意：连击提升，受挫回落（每点 +0.4% 伤害）"><div class="bar-fill morale" style="width:${B.morale || 0}%"></div><span class="bar-text${(B.morale || 0) <= 0 ? ' dim' : ''}">战意 ${B.morale || 0}${(B.morale || 0) >= 100 ? '（伤害 +40%）' : ''}</span></div>
        <div class="bar morale-bar" title="真元：普攻命中+1，会心+2，防御+1（用于职业必杀；道境三重上限扩至8）"><div class="bar-fill" style="width:${(B.zhenyuan || 0) / (B.zmax || 6) * 100}%;background:linear-gradient(90deg,#5a6ac7,#a04ab0)"></div><span class="bar-text${(B.zhenyuan || 0) <= 0 ? ' dim' : ''}">真元 ${B.zhenyuan || 0}/${B.zmax || 6}</span></div>
        <div class="fx-tags">${StatusFx.tagsHtml(B.myFx)}</div>
      </div>
      <div id="bt-log"></div>
      ${sub}
      ${ultRow}
      ${bmRow}
      ${comboBtn}
      ${tameBtn}
      <div class="bt-actions" style="margin-top:8px">${btns}</div>
      <div class="bt-ctl">${ctlBtns}</div>
    `;
    Anim.scan(document.getElementById('battle-box'));   // v4：战斗数值滚动
    // v7：浮动伤害/治疗数字 + 敌方受击震动（战斗即时反馈）
    const eside = document.querySelector('#battle-box .side-enemy');
    const mside = document.querySelector('#battle-box .side-me');
    // v13：敌方剪影立绘（v20 Boss 专属立绘优先：宗主/玄影客/心魔化身）
    const efig = document.querySelector('#battle-box .enemy-fig');
    if (efig) efig.innerHTML = (e.bossArt && Art.boss(e.bossArt)) || Art.monster(e.species || 'beast', !!e.elite);
    // v18：主角剪影立绘
    const mfig = document.querySelector('#battle-box .me-fig');
    if (mfig) mfig.innerHTML = Art.player(p.dao);
    if (B.floats.length && (typeof Ambience === 'undefined' || Ambience.animOn !== false)) {   // v20 性能模式可关浮动数字
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
    // v30 渲染增量化：若旧日志节点条目数与 B.logs 完全一致（战斗 log() 已是增量追加），
    // 直接把旧节点搬回新壳——省去至多 120 条 innerHTML 的重复解析（极速档 O(回合²) → O(回合)）
    const logBox = document.getElementById('bt-log');
    if (logBox) {
      if (_prevLog && _prevCount === B.logs.length) {
        logBox.replaceWith(_prevLog);
      } else {
        for (const { html, cls } of B.logs) {
          const div = document.createElement('div');
          div.className = 'log-entry ' + cls;
          div.innerHTML = html;
          logBox.appendChild(div);
        }
        logBox.scrollTop = logBox.scrollHeight;
      }
    }
    // v13：重播挂起的技能特效（render 重建 DOM 后特效层需重建）
    if (this._pendingFx) {
      const kind = this._pendingFx;
      this._pendingFx = null;
      this._playFx(kind);
    }
  },
};
