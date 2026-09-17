
/* ======================================================================
 * §11.7 v13 灵兽系统 BeastSys（驯服 / 养成 / 助战）
 * 战斗中将可驯妖兽打至两成血以下，出现「驯服」：成功率受福缘与境界差影响。
 * 灵兽出战：每回合四成几率协助攻击，并给主人一项被动加成（随品阶成长）。
 * 洞府兽栏：出战 1 只 + 仓储（4 + 洞府等级）只。
 * ====================================================================== */
const BeastSys = {
  TAMEABLE: ['beast', 'snake', 'swarm', 'plant', 'element'],   // 可驯物种（人形/傀儡/阴魂不可驯）
  /** 被动加成映射：物种 → 属性键 */
  PASSIVE: { beast: 'atkPct', snake: 'crit', plant: 'hpPct', swarm: 'dodge', element: 'cult' },
  NAME: { atkPct: '攻击', crit: '暴击', hpPct: '气血', dodge: '闪避', cult: '修炼效率' },
  maxSlots(p) { return 4 + (p.cave ? p.cave.lv : 1) + (p.cave && p.cave.builds ? (p.cave.builds.beast || 0) * 2 : 0); },   // v19 灵兽窝
  activeBeast(p) { return p.beasts ? p.beasts.list.find(b => b.uid === p.beasts.active) || null : null; },
  /** 战斗面板驯服入口 */
  async tame() {
    const B = Battle.active;
    const p = Game.player;
    if (B && B.busy) return;   // v32 修瑕（E5）：原无 busy 守卫——在途回合中点驯服，双流程并发操作同一 B.enemy
    if (!B || B.over || !B.enemy) return;
    const e = B.enemy;
    if (B.ctx && B.ctx.tower) { UI.toast('塔影乃气相所化，散即重凝——无从驯服'); return; }   // v31 修瑕：塔影可驯曾致一次登塔内无限重踏无限驯兽
    if (!this.TAMEABLE.includes(e.species)) { UI.toast('此物灵智已开或非血肉之躯，无法驯服'); return; }
    if (e.hp > e.hpMax * 0.2) { UI.toast('需先将其打至两成血以下，方能驯服'); return; }
    const slotFull = p.beasts.list.length >= this.maxSlots(p);
    const diff = (e.power - (p.realmIdx * 4 + p.layer)) * 5;
    const tameSkill = p.tameSkill || 0;
    const luckEff = Stat.compute(p).luck;   // v28 联动：装备福缘（本命法宝等）同样助驯
    const rate = Utils.clamp(45 + luckEff * 2 - diff + Math.floor(tameSkill / 10), 8, 90);
    const ok = await UI.popup({
      title: `驯服 · ${e.name}`,
      html: `${e.name} 已力竭，野性渐敛。你缓缓探出神识，以灵力温沟通其灵智……<br>
        · 成功率 <b class="hl">${rate.toFixed(0)}%</b>（福缘 ${luckEff}${diff > 0 ? `，境界压制 -${diff}` : ''}）<br>
        ${slotFull ? `<span class="neg">兽栏已满（${this.maxSlots(p)} 位）——驯服将放归野外。</span>` : `兽栏余位：${this.maxSlots(p) - p.beasts.list.length}。`}`,
      options: [{ text: '尝试驯服', value: true, primary: true }, { text: '罢了，斩之', value: false }],
    });
    if (!ok) return;
    B.busy = true;
    await Battle.wait(700);
    if (Utils.chance(rate)) {
      const beast = {
        uid: p.beasts.nextId || 1,
        id: e.id, name: e.name, species: e.species, power: e.power,
        level: 1, exp: 0,
        bond: Math.min(100, p.bondGift || 0),   // v32（D2）传承树十二层「灵兽通心」：驯服初始亲昵
        skills: (e.skills || []).slice(0, 1).map(s => ({ ...s })),
      };
      p.beasts.nextId = (p.beasts.nextId || 1) + 1;
      if (slotFull) {
        p.tameSkill = Math.min(100, (p.tameSkill || 0) + 8);
        Log.add(`你以神识温言相抚，${e.name} 俯首帖耳……可惜兽栏已满，你只能为其解开封印，目送它遁入山林。（驯服心得 +8/100）`, 'info');
      } else {
        p.beasts.list.push(beast);
        if (!p.beasts.active) p.beasts.active = beast.uid;
        Ambience.sfx('tame');
        Log.add(`神识相融，心意相通——<b>${e.name}</b> 竟俯首认主！灵兽图谱又添一员，出战可协力攻敌。`, 'gain');
        UI.announce(`✦ 灵兽认主 · ${e.name}`, 'gold');
        Meta.see('monster', e.id);
        // v27 修瑕：驯服物种去重从未计数，成就「驯兽大师」永不可解锁
        p.counters.tamedSpecies = p.counters.tamedSpecies || {};
        if (!p.counters.tamedSpecies[e.species]) {
          p.counters.tamedSpecies[e.species] = 1;
          p.counters.tameSpecies = Object.keys(p.counters.tamedSpecies).length;
        }
      }
      B.enemy.hp = 0;
      p.counters.tames = (p.counters.tames || 0) + 1;   // v24 章助缘计数
      Battle.log(`${e.name} 驯服功成！`, 'log-gain');   // v31 修瑕：原 B.log 调不存在的方法必抛异常——驯服成功即软锁（victoryTame 永不执行）
      await Battle.wait(500);
      Battle.victoryTame();
      return;
    }
    Log.add(`${e.name} 灵智倔强，猛然挣脱你的神识，带着一身伤痕遁走了——此战算你胜，却少了战利品。`, 'warn');
    B.enemy.hp = 0;
    await Battle.wait(400);
    Battle.victoryTame(true);
  },
  /** 驯服结算的轻量胜利（战利品减半/无） */
  victoryTame(fled = false) {
    const B = Battle.active;
    const p = Game.player;
    if (!B) return;
    B.over = true;
    B.won = true;   // v30 修瑕：驯服战原不置 won，战斗回顾里全部记为负场
    B._tame = true;   // v30：标记驯服场——邪修「每战孽障+1」不再结算（点到为止）
    p.counters.wins++;
    const gain = Math.round(B.enemy.expGain * 0.5);
    Cultivate.addExp(p, gain);
    if (!fled && B.enemy.id) BountySys.onKill(B.enemy.id);   // v30 修瑕：目标已被驯走=目标已消除，悬赏猎杀照计进度（走脱不算）
    if (fled) Bag.addStones(Math.round(B.enemy.stoneGain * 0.3));
    Log.add(fled
      ? `兽虽走脱，你仍获修为 +${Utils.fmtNum(gain)}，并捡到些许灵石。`
      : `${B.enemy.name} 认主之后，自动为你衔来修为造化：修为 +${Utils.fmtNum(gain)}。`, 'gain');
    Battle.end();
    UI.announce(fled ? '灵 兽 走 脱' : '驯 服 功 成', fled ? 'bad' : 'ok');
    // v32 修瑕（A2）：驯服结算原绕过全部战斗上下文分发——剧情战被驯服则 onEnd 丢失（第一章野猪
    // 可被驯服，章节永久卡死）、秘境被驯服则推进蒸发、生死状被驯服则宗门战不结算。
    // 此处按 ctx 补齐与 Battle.victory 同款的分发（canTame 已同步排除上述场合，此处为双保险）。
    if (B.ctx) {
      if (B.ctx.dungeon) DungeonSys.onVictory(B.ctx.dungeon, B.ctx.boss);
      if (B.ctx.sectDanger != null) SectSys.onDangerWin(B.ctx.sectDanger);
      if (B.ctx.story) { const cb = B.ctx.story.onEnd; B.ctx.story.onEnd = null; if (cb) cb(true); }
    }
  },
  /** 出战灵兽的被动加成（Stat.compute 调用） */
  passive(p) {
    const b = this.activeBeast(p);
    const b2 = p.beasts ? p.beasts.list.find(x => x.uid === p.beasts.active2) || null : null;   // v19 副战灵兽（仅被动，五成效力）
    const one = (bb, mul) => {
      if (!bb) return null;
      const key = this.PASSIVE[bb.species] || 'atkPct';
      return [key, Math.round((bb.power * 0.6 + bb.level * 0.8) * mul * (bb.evolved ? 1.4 : 1))];
    };
    const entries = [one(b, 1), one(b2, 0.5)].filter(Boolean);
    const out = {};
    for (const [k, v] of entries) out[k] = (out[k] || 0) + v;
    return out;
  },
  /** v19 物种天生技能（灵兽五阶习得，九阶精进）——仅可驯五物种（v30 清理：ghost/construct 不可驯，条目为死数据） */
  SPECIES_SKILLS: {
    beast:    { name: '兽王撕咬', kind: 'bleed', pct: 3, rounds: 2 },
    snake:    { name: '淬毒獠牙', kind: 'poison', pct: 3, rounds: 3 },
    swarm:    { name: '蚀甲之群', kind: 'defdown', pct: 20, rounds: 2 },
    plant:    { name: '缠丝藤缚', kind: 'slow', pct: 25, rounds: 2 },
    element:  { name: '灵焰灼身', kind: 'burn', pct: 3.5, rounds: 2 },
  },
  /** v20 十阶第二天生技（每物种另一路打法） */
  SPECIES_SKILLS2: {
    beast:    { name: '裂地重扑', kind: 'stun', rounds: 1 },
    snake:    { name: '腐骨毒雾', kind: 'poison', pct: 4, rounds: 3 },
    swarm:    { name: '蚀魂之群', kind: 'mpburn', pct: 20 },
    plant:    { name: '盘根错节', kind: 'slow', pct: 30, rounds: 2 },
    element:  { name: '灵爆', kind: 'burn', pct: 5, rounds: 2 },
  },
  /** v31 亲昵 ≥80 的第三天生技（守护/相哺一路——人兽默契的具象） */
  SPECIES_SKILLS3: {
    beast:    { name: '守主之啸', kind: 'weaken', pct: 18, rounds: 2 },
    snake:    { name: '灵蛇吐信', kind: 'bleed', pct: 3, rounds: 2 },
    swarm:    { name: '群翼蔽主', kind: 'guard', def: 25, rounds: 2 },
    plant:    { name: '青藤续脉', kind: 'heal', pct: 8 },
    element:  { name: '灵息涤尘', kind: 'heal', pct: 9 },
  },
  /** v30：人兽合击就绪判定（出战灵兽 + 亲昵 ≥60） */
  comboReady(p) {
    const b = this.activeBeast(p);
    return !!(b && (b.bond || 0) >= 60);
  },
  /** 战斗中灵兽协助攻击（Battle.act 开头调用）
   *  v30 合击 2.0：从「40% 定率扑一下」改策略驱动——主人刚普攻命中/连击层高时追击欲更强；
   *  主人刚放法诀时，灵兽按物种呼应（兽撕咬/蛇淬毒/焰灼身/藤缚/群蚀甲） */
  async assist(st) {
    const B = Battle.active;
    const p = Game.player;
    const b = this.activeBeast(p);
    if (!B || !b || B.over) return false;
    // v32（C4）：协战策略三选（b.tactic 持久化，兽栏可切）——集火（敌残血追击欲 +30）/
    // 控场（+12 且缠敌更紧）/护主（主人危难时挺身，护主/回哺技效力 +50%）
    const tac = b.tactic || 'focus';
    let chase = 28 + (B.combo || 0) * 5 + (b.bond || 0) * 0.2 + (B.lastAct === 'attack' ? 15 : 0) + (typeof B.lastSkillTag === 'string' ? 10 : 0);
    if (tac === 'focus' && B.enemy.hp <= B.enemy.hpMax * 0.3) chase += 30;
    if (tac === 'control') chase += 12;
    if (tac === 'guard' && p.hp < Stat.compute(p).maxHp * 0.4) chase += 15;
    if (!Utils.chance(Utils.clamp(chase, 5, 80))) return false;   // v30：亲昵/连击/招式呼应皆入追击成算
    const dmg = Math.max(1, Math.round(st.atk * (0.22 + b.level * 0.03) * (1 + b.power * 0.02) * (b.evolved ? 1.3 : 1) * Utils.randF(0.8, 1.2)));   // v19 进化 ×1.3
    B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
    B.hitShake = true;
    if (B.stats) { B.stats.out += dmg; if (B.stats.src) B.stats.src.beast += dmg; }   // v20 伤害构成统计
    Battle.pushFloat('enemy', `-${dmg}`, 'dmg');   // v31 修瑕：原 B.pushFloat 必抛 TypeError——助战掷中即被吞成「气机紊乱」，玩家行动作废
    // v18：灵兽技能实效化——施加真实技能效果（毒/流血/减益等）；v20 支持双技
    // v30 修瑕：技能语义补全——原白名单缺 drain/mpburn/guard/heal/freeze，野性继承技与
    //          傀儡/阴魂系招式被静默丢弃；现按语义分别结算（伤敌/削敌/护主/续主）
    let skillNote = '';
    const mySt = Stat.compute(p);
      for (const sk of (b.skills || []).slice(0, (b.bond || 0) >= 80 ? 3 : 2)) {
      if (!sk.kind) continue;
      if (['poison', 'burn', 'bleed', 'defdown', 'slow', 'weaken'].includes(sk.kind)) {
        Battle.applyEnemyFx(B.enemy, { kind: sk.kind, pct: (sk.pct || 2) * 0.6, rounds: sk.rounds || 2 });
        skillNote += `【${sk.name}】`;
      } else if (sk.kind === 'stun' || sk.kind === 'freeze') {
        // v32 修瑕（E9）：协战施控原直施加不进递减——高亲昵灵兽每回合 28~80% 追击附带冰缚，
        // 可把敌方链式永控（恰是 v31 D3 控制递减要终结的玩法的镜像）。走玩家侧控制递减。
        if (Utils.chance(100 * Battle.ctrlDecayOnEnemy())) {
          Battle.applyEnemyFx(B.enemy, { kind: sk.kind, pct: (sk.pct || 2) * 0.6, rounds: 1 });
          skillNote += `【${sk.name}】`;
        } else skillNote += `【${sk.name}·被挣脱】`;
      } else if (sk.kind === 'drain') {
        const heal = Math.max(1, Math.round(dmg * (sk.leech || 0.4)));
        p.hp = Math.min(mySt.maxHp, p.hp + heal);
        skillNote += `【${sk.name}·汲摄回哺 +${heal}】`;
      } else if (sk.kind === 'mpburn') {
        const extra = Math.max(1, Math.round(dmg * 0.25));
        B.enemy.hp = Math.max(0, B.enemy.hp - extra);
        if (B.stats) { B.stats.out += extra; if (B.stats.src) B.stats.src.beast += extra; }
        skillNote += `【${sk.name}·蚀魂 +${extra}】`;
      } else if (sk.kind === 'guard') {
        StatusFx.add(B.myFx, { kind: 'shield', pct: tac === 'guard' ? 30 : 20, rounds: 2 });   // v32（C4）：护主策略下金光更厚
        skillNote += `【${sk.name}·护主金光】`;
      } else if (sk.kind === 'heal') {
        const heal = Math.max(1, Math.round(mySt.maxHp * (tac === 'guard' ? 0.12 : 0.08)));   // v32（C4）：护主策略下回哺更沛
        p.hp = Math.min(mySt.maxHp, p.hp + heal);
        skillNote += `【${sk.name}·回春 +${heal}】`;
      }
    }
    Battle.log(`${skillNote}你的灵兽 <b>${b.name}</b> 亦张牙舞爪扑上助战——造成 <b>${dmg}</b> 点伤害！`, 'log-gain');
    Battle.render();
    await Battle.wait(360);
    // v30：法诀呼应——主人刚施展过法诀，灵兽以天生属性补一手侵扰（五成几率）
    if (B.lastSkillTag && B.enemy.hp > 0 && Utils.chance(50)) {
      const echo = { beast: ['bleed', 3, 2], snake: ['poison', 3, 2], element: ['burn', 3, 2], plant: ['slow', 20, 2], swarm: ['defdown', 18, 2] }[b.species];
      if (echo) {
        Battle.applyEnemyFx(B.enemy, { kind: echo[0], pct: echo[1], rounds: echo[2] });
        Battle.render();
        await Battle.wait(300);
      }
    }
    return B.enemy.hp <= 0;
  },
  /** 喂食内丹：+500 灵兽经验 */
  /** v32 修瑕（E2）：第三天生技补发——十阶且亲昵 ≥80 即独立检查（原判定嵌在升阶分支内：
   *  先满十阶、后磨亲昵的正常养成顺序 up 恒 false，第三技对多数存档永久不可得） */
  checkThirdSkill(b) {
    if (!b || b.level < 10 || (b.bond || 0) < 80) return false;
    if ((b.skills || []).length >= 3 || !this.SPECIES_SKILLS3[b.species]) return false;
    b.skills.push({ ...this.SPECIES_SKILLS3[b.species] });
    Log.add(`亲昵已深——【${b.name}】将毕生所悟与你相授，领悟第三天生技【${b.skills[b.skills.length - 1].name}】！！`, 'gain');
    UI.announce('✦ 人兽契合 · 第三天生技 ✦', 'gold');
    return true;
  },
  /** v32（C4）：协战策略三选——集火/控场/护主（随灵兽持久化，兽栏「照管」内切换） */
  TACTICS: { focus: '集火', control: '控场', guard: '护主' },
  cycleTactic(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    const order = ['focus', 'control', 'guard'];
    b.tactic = order[(order.indexOf(b.tactic || 'focus') + 1) % order.length];
    Log.add(`【${b.name}】的协战策略调整为<b>${this.TACTICS[b.tactic]}</b>——集火：敌残血追击愈勇；控场：出手更勤、缠敌更紧；护主：你危难时它必挺身（金光/回哺 +50%）。`, 'info');
    Game.afterAction();
  },
  feed(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    if (Bag.count('m_neidan') < 1) { UI.toast('需【妖兽内丹】一枚'); return; }
    Bag.removeItem('m_neidan', 1);
    b.exp += 500;
    let up = false;
    while (b.level < 10 && b.exp >= b.level * 400) { b.exp -= b.level * 400; b.level++; up = true; }
      if (up) {
        let extra = '';
        // v19 五阶习得物种天生技，九阶精进
        if (b.level === 5 && (!b.skills || !b.skills.length) && this.SPECIES_SKILLS[b.species]) {
          b.skills = [{ ...this.SPECIES_SKILLS[b.species] }];
          extra = `，并领悟天生技【${b.skills[0].name}】`;
        } else if (b.level === 9 && b.skills && b.skills.length && b.skills[0].pct) {
          b.skills[0].pct = Math.round(b.skills[0].pct * 1.5 * 10) / 10;
          extra = `，天生技【${b.skills[0].name}】威力精进`;
        }
        // v20 十阶开第二天生技
        if (b.level >= 10 && (!b.skills || b.skills.length < 2) && this.SPECIES_SKILLS2[b.species]) {
          b.skills = b.skills || [];
          b.skills.push({ ...this.SPECIES_SKILLS2[b.species] });
          extra = `，并领悟第二天生技【${b.skills[b.skills.length - 1].name}】！`;
        }
        // v32 修瑕（E2）：第三技判定移出 if(up)（checkThirdSkill 在下方独立执行，亲昵路线不再漏发）
        Log.add(`【${b.name}】吞下内丹，周身妖气一涨——灵兽升至 <b>${b.level} 阶</b>！${extra || '协助作战愈发骁勇。'}`, 'gain');
        UI.toast(`${b.name} 升至 ${b.level} 阶`);
      } else {
      Log.add(`【${b.name}】吞下内丹，妖气渐长（灵兽经验 +500）。`, 'info');
    }
    this.checkThirdSkill(b);   // v32 修瑕（E2）：喂食即检查第三技（十阶+亲昵 ≥80 任意时点补发）
    Game.afterAction();
  },
  setActive(uid) {
    const p = Game.player;
    // v31 修瑕（E14）：在途派遣的灵兽不可设为出战——原可同时吃派遣寻宝与出战协战双重收益
    const b0 = p.beasts.list.find(x => x.uid === uid);
    if (b0 && b0.trip) { UI.toast('它还在外头寻宝未归，无暇出战'); return; }
    p.beasts.active = p.beasts.active === uid ? null : uid;
    if (p.beasts.active != null && p.beasts.active2 === uid) p.beasts.active2 = null;   // v32 修瑕（E3）：同一灵兽曾可同时占出战+副战双槽（被动按 1.0+0.5 双份白赚 ×1.5）
    const b = this.activeBeast(p);
    Log.add(b ? `你放出 <b>${b.name}</b> 随行出战。` : '灵兽归栏歇息。', 'info');
    Game.afterAction();
  },
  /** v19 副战灵兽：不出手协战，但被动以五成效力加身 */
  setActive2(uid) {
    const p = Game.player;
    const b0 = p.beasts.list.find(x => x.uid === uid);
    if (b0 && b0.trip) { UI.toast('它还在外头寻宝未归，无暇护持'); return; }   // v31 修瑕（E14）同上
    if (p.beasts.active === uid) p.beasts.active = null;
    p.beasts.active2 = p.beasts.active2 === uid ? null : uid;
    const b = p.beasts.list.find(x => x.uid === p.beasts.active2);
    Log.add(b ? `<b>${b.name}</b> 化作一道灵光护持你身——被动以五成效力相佐。` : '副战灵兽归栏。', 'info');
    Game.afterAction();
  },
  /** v19 灵兽进化：十阶圆满 + 妖兽内丹×5，蜕凡成王——被动 ×1.4、协战 ×1.3 */
  async evolve(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    if (b.evolved) { UI.toast('它已完成蜕变'); return; }
    if (b.level < 10) { UI.toast('需修至十阶圆满方可蜕变'); return; }
    const cost = Math.round(8000 * GameData.sinkCurve(p.realmIdx) / 2.2);   // v30：曲线族统一（原 2.2^min(8,r) 封顶）
    const ok = await UI.popup({
      title: `灵兽蜕变 · ${b.name}`,
      html: `${b.name} 已至十阶圆满，妖气内蕴——以五枚【妖兽内丹】引其蜕凡成王。<br>蜕变后：<b>战力 +5、被动 ×1.4、协战 ×1.3</b>，名称冠以「王」号。<br>需灵石 <span class="hl">${Utils.fmtNum(cost)}</span> 与【妖兽内丹】×5（持有 ${Bag.count('m_neidan')}）。`,
      options: [{ text: '引 其 蜕 变', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    if (Bag.count('m_neidan') < 5) { UI.toast('妖兽内丹不足'); return; }
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    Bag.removeItem('m_neidan', 5);
    b.evolved = true;
    b.power = Utils.clamp(b.power + 5, 0, 60);
    if (!/王$/.test(b.name)) b.name = b.name + '王';
    Log.add(`<b>妖光冲霄——${b.name} 蜕凡成王！</b>战力 +5，被动 ×1.4，协战 ×1.3。`, 'realm');
    UI.announce(`✦ 灵兽蜕变 · ${b.name} ✦`, 'gold');
    Story.chron(`灵兽「${b.name}」蜕凡成王`);
    Ambience.sfx('evolve');
    Game.afterAction();
  },
  /** v19 抚摸：每日一次，亲昵 +4~8（协战几率 +0.1%/点） */
  pat(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    const today = Math.floor(p.day || 0);
    if (b.patDay === today) { UI.toast('今日已抚摸过它了'); return; }
    b.patDay = today;
    b.bond = Math.min(100, (b.bond || 0) + Utils.rand(4, 8));
    Log.add(`你轻抚 <b>${b.name}</b> 的脊背，它眯起眼，尾巴轻轻扫过你的手腕。（亲昵 ${b.bond}/100，协战几率微增）`, 'gain');
    this.checkThirdSkill(b);   // v32 修瑕（E2）：抚摸到 80 的当下即补发第三技
    Game.afterAction();
  },
  /** v20 寻宝派遣：灵兽外出 N 日带回灵材（离线也计时） */
  async dispatch(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    if (b.trip) { UI.toast('它已在寻宝途中'); return; }
    if (p.beasts.active === uid || p.beasts.active2 === uid) { UI.toast('出战/护持中的灵兽不可派遣'); return; }
    const days = await UI.popup({
      title: `派遣寻宝 · ${b.name}`,
      html: `放它独自外出寻宝——归期越久，带回的灵材越厚。<br>派遣期间不可出战，归来时自动入栏。`,
      options: [
        { text: '三 日', value: 3, primary: true },
        { text: '七 日', value: 7 },
        { text: '十五 日', value: 15 },
        { text: '作罢', value: null },
      ],
    });
    if (!days) return;
    b.trip = { until: Math.floor(p.day || 0) + days, days };
    Log.add(`你系上小竹篓，<b>${b.name}</b> 欢快地窜入山林——${days} 日后归来。`, 'info');
    Game.afterAction();
  },
  /** v20 寻宝归来结算；v31（E-灵兽）归来三选一——灵材/灵石/情谊各有侧重，保底不落空 */
  async claimTrip(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b || !b.trip) return;
    const today = Math.floor(p.day || 0);
    if (today < b.trip.until) { UI.toast(`尚未归来（还差 ${b.trip.until - today} 日）`); return; }
    const tier = Utils.clamp(Math.floor(b.power / 12) + Math.floor(b.trip.days / 6), 1, 4);
    const mat = Utils.pick(GameData.matsByTier(tier));
    // v28 联动：亲昵近六十的灵兽，外出更肯用心——多衔一份材料回来
    const qty = (b.trip.days >= 7 ? 2 : 1) + ((b.bond || 0) >= 60 ? 1 : 0);
    const stones = Math.round((30 + b.power * 2) * b.trip.days * GameData.stoneEco(Math.min(6, p.realmIdx)) / 3);   // v29：封顶 4→6
    const days = b.trip.days;
    b.exp += days * 120;
    const choice = await UI.popup({
      title: `寻宝归来 · ${b.name}`,
      html: `【${b.name}】叼着竹篓欢快归来，竹篓里泛着灵光——它邀你来挑这一趟的收成：`,
      options: [
        { text: `灵材为主（${GameData.ITEMS[mat].name} ×${qty} + 灵石 ${Utils.fmtNum(stones)}）`, value: 'mat', primary: true },
        { text: `灵石为主（灵石 ${Utils.fmtNum(Math.round(stones * 2.2))}）`, value: 'stones' },
        { text: `情谊为重（灵石 ${Utils.fmtNum(Math.round(stones / 2))}、亲昵 +6、经验 +${days * 60}）`, value: 'bond' },
      ],
    });
    if (choice === 'stones') {
      const s2 = Math.round(stones * 2.2);
      Bag.addStones(s2);
      Log.add(`竹篓里竟是满满的灵石——灵石 +${Utils.fmtNum(s2)}。【${b.name}】得意地摇了摇尾巴。`, 'gain');
    } else if (choice === 'bond') {
      Bag.addStones(Math.round(stones / 2));
      b.bond = Math.min(100, (b.bond || 0) + 6);
      b.exp += days * 60;
      Log.add(`你把灵石收下，把竹篓还给它，揉了揉它的脑袋——亲昵 +6，经验 +${days * 60}。【${b.name}】蹭了蹭你的手心。`, 'gain');
      this.checkThirdSkill(b);   // v32 修瑕（E2）：归来路线同样补检第三技
    } else {
      Bag.addItem(mat, qty);
      Bag.addStones(stones);
      Log.add(`【${b.name}】叼着竹篓归来——带回【${GameData.ITEMS[mat].name}】×${qty}、灵石 ${Utils.fmtNum(stones)}，妖气也涨了几分。`, 'gain');
    }
    if (b.level < 10 && b.exp >= b.level * 400) UI.toast(`${b.name} 经验涨了，可喂内丹升阶`);   // v32 修瑕（E13）：十阶封顶后此提示是永久误导
    b.trip = null;
    Game.afterAction();
  },
  /** v20 斗兽场：押注观战，胜得 1.6 倍彩头（v30：日限三场，防满养成兽正期望无限复投） */
  async arena() {
    const p = Game.player;
    const b = this.activeBeast(p);
    if (!b) { UI.toast('需先有一头出战灵兽'); return; }
    p.counters.arena = p.counters.arena || { day: 0, n: 0 };
    if (p.counters.arena.day !== Math.floor(p.day || 0)) { p.counters.arena.day = Math.floor(p.day || 0); p.counters.arena.n = 0; }
    if (p.counters.arena.n >= 3) { UI.toast('今日斗兽场已罢（日限三场）——明日再来'); return; }
    const eco = GameData.stoneEco(Math.min(5, p.realmIdx));
    const tiers = [
      { name: '小注', base: 100 },
      { name: '中注', base: 800 },
      { name: '豪注', base: 5000 },
    ];
    const pick = await UI.popup({
      title: `斗兽场 · ${b.name}`,
      html: `洞府演武场难得热闹—— ${b.name}（${b.level} 阶${b.evolved ? ' · 蜕变' : ''}）对阵山野妖王。<br>押它一注，胜者得 1.6 倍彩头。`,
      options: tiers.map((t, i) => ({ text: `${t.name}（${Utils.fmtNum(Math.round(t.base * eco))}灵石）`, value: i, primary: i === 0 })).concat([{ text: '看看就好', value: null }]),
    });
    if (pick == null) return;
    const cost = Math.round(tiers[pick].base * eco);
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    p.counters.arena.n++;
    Time.add(1);
    // v29 修瑕：对手同权重吃养成项（阶数/蜕变/亲昵）——此前 oppScore 只看 power，
    // 养成后胜率远超盈亏点（赔付 1.8 倍），斗兽场成了正期望印钞机
    // v30 复核：满养成兽仍 +20%~47% 期望——对手阶数/蜕变分布再压一档并加日限三场
    const oppPower = Utils.clamp(Math.round(b.power * Utils.randF(0.8, 1.3)), 1, 60);
    const oppLevel = Math.max(1, b.level + Utils.rand(-1, 3));
    const oppEvo = Utils.chance(Utils.clamp(18 + b.level * 7, 0, 75));
    const oppBond = Utils.rand(0, Math.max(12, b.bond || 0));
    const myScore = b.power + b.level * 2 + (b.evolved ? 8 : 0) + (b.bond || 0) / 10 + Utils.rand(0, 10);
    const oppScore = oppPower + oppLevel * 2 + (oppEvo ? 8 : 0) + oppBond / 10 + Utils.rand(0, 10);
    const win = myScore >= oppScore;
    if (win) {
      const prize = Math.round(cost * 1.6);
      Bag.addStones(prize);
      p.counters.arenaWins = (p.counters.arenaWins || 0) + 1;
      Log.add(`⚔ 斗兽场——<b>${b.name}</b> 三招逼退对手，满场喝彩！彩头灵石 ${Utils.fmtNum(prize)}。（斗兽连胜 ${p.counters.arenaWins} 场）`, 'gain');
      if (p.counters.arenaWins % 5 === 0) { KarmaSys.addFortune(2); Log.add('驯兽的名声传开了——气运 +2。', 'gain'); }
    } else {
      Log.add(`⚔ 斗兽场——<b>${b.name}</b> 苦战落败，垂头丧气地缩到你脚边。押注的 ${Utils.fmtNum(cost)} 灵石归了庄家。`, 'loss');
    }
    Game.afterAction();
  },
  async free(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    const ok = await UI.popup({
      title: `放归 · ${b.name}`,
      html: `确定将 <b>${b.name}</b> 放归山林吗？此后它将重回天地，不再随你修行。`,
      options: [{ text: '放 归', value: true }, { text: '算了', value: false }],
    });
    if (!ok) return;
    p.beasts.list = p.beasts.list.filter(x => x.uid !== uid);
    if (p.beasts.active === uid) p.beasts.active = null;
    if (p.beasts.active2 === uid) p.beasts.active2 = null;   // v26 修瑕：放归「护持中」灵兽后副位不再悬挂
    Log.add(`你解开灵契，${b.name} 绕你三匝，长啸一声遁入山林。`, 'info');
    Game.afterAction();
  },
};
