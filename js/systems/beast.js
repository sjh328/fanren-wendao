
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
      Battle.log(`${e.name} 驯服功成！`, 'log-gain');   // v31 修瑕：原 B.log 调不存在的方法必抛异常
      await Battle.wait(500);
      // v34（E113）：P0——v31 修瑕只把 B.log 换成了 Battle.log，结算调用仍是并不存在的
      // Battle.victoryTame（真身在本对象上）——驯服成功/走脱各路径在 wait 后必抛 TypeError，
      // B.busy 恒真、B.over 不置位，战斗永久卡死。改调 BeastSys.victoryTame。
      this.victoryTame();
      return;
    }
    Log.add(`${e.name} 灵智倔强，猛然挣脱你的神识，带着一身伤痕遁走了——此战算你胜，却少了战利品。`, 'warn');
    B.enemy.hp = 0;
    await Battle.wait(400);
    this.victoryTame(true);   // v34（E113）：同上——Battle.victoryTame 不存在
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
    let chase = 28 + (B.combo || 0) * 5 + (b.bond || 0) * 0.2 + (B.lastAct === 'attack' ? 15 : 0) + (typeof B.lastSkillTag === 'string' ? 10 : 0)
      + (this.assistBonus ? this.assistBonus(p) : 0);   // v38（E340/E343）：御兽行家 +5、兽族忠勇 +8
    if (tac === 'focus' && B.enemy.hp <= B.enemy.hpMax * 0.3) chase += 30;
    if (tac === 'control') chase += 12;
    if (tac === 'guard' && p.hp < Stat.compute(p).maxHp * 0.4) chase += 15;
    if (!Utils.chance(Utils.clamp(chase, 5, 80))) return false;   // v30：亲昵/连击/招式呼应皆入追击成算
    const dmg = Math.max(1, Math.round(st.atk * (0.22 + b.level * 0.03) * (1 + b.power * 0.02) * (b.evolved ? 1.3 : 1) * Utils.randF(0.8, 1.2)));   // v19 进化 ×1.3
    let hitTotal = dmg;   // v35（E141）：含蚀魂等追加，供 onEnemyHit 结算（反伤/不灭）
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
        hitTotal += extra;
        if (B.stats) { B.stats.out += extra; if (B.stats.src) B.stats.src.beast += extra; }
        skillNote += `【${sk.name}·蚀魂 +${extra}】`;
      } else if (sk.kind === 'guard') {
        Battle.gainBuff({ kind: 'shield', pct: tac === 'guard' ? 30 : 20, rounds: 2 });   // v32（C4）：护主策略下金光更厚；v33（E72）：走统一增益入口——原直加绕过镜像词缀（v32 E11 口径：一切增益均触发镜像）
        skillNote += `【${sk.name}·护主金光】`;
      } else if (sk.kind === 'heal') {
        const heal = Math.max(1, Math.round(mySt.maxHp * (tac === 'guard' ? 0.12 : 0.08)));   // v32（C4）：护主策略下回哺更沛
        p.hp = Math.min(mySt.maxHp, p.hp + heal);
        skillNote += `【${sk.name}·回春 +${heal}】`;
      }
    }
    Battle.log(`${skillNote}你的灵兽 <b>${b.name}</b> 亦张牙舞爪扑上助战——造成 <b>${dmg}</b> 点伤害！`, 'log-gain');
    // v35（E141）修瑕：助战路径原未接 onEnemyHit——带「不灭」的精英可被灵兽补刀无声跳过复活、
    // 「魔棘」对助战伤害零反弹（同一词缀时灵时不灵）。按总伤（含蚀魂追加）统一结算
    Battle.onEnemyHit(B, st, hitTotal);
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
    let extra = '';
    // v35（E142）修瑕：物种技/精进判定移入 while 逐级结算——原只在循环结束后做 `b.level === 5/9`
    // 等值比较，攒经验跳级（4 级兽攒 3899 经验一口 4→6、8 级攒两趟派遣 8→10）可永漏五阶天生技与
    // 九阶精进且无补救；逐级结算后任何跳级路径都不再漏
    while (b.level < 10 && b.exp >= b.level * 400) {
      b.exp -= b.level * 400;
      b.level++;
      up = true;
      // v19 五阶习得物种天生技，九阶精进
      // v34（E122）：原死条件 `!b.skills.length` 把「带继承技驯来」的灵兽（驯服即 slice 一条技能）
      // 永远挡在第一物种技门外——同物种两种养成结果且无任何说明。改为按物种 id 判重补插。
      if (b.level === 5 && this.SPECIES_SKILLS[b.species] && !(b.skills || []).some(s => s && s.name === this.SPECIES_SKILLS[b.species].name)) {
        b.skills = b.skills || [];
        b.skills.unshift({ ...this.SPECIES_SKILLS[b.species] });
        extra = `，并领悟天生技【${b.skills[0].name}】`;
      } else if (b.level === 9 && b.skills && b.skills.length) {
        // v38（E280）修瑕：九阶精进原只认 skills[0].pct——天生技被继承技挤到非首位、或首位是
        // 无 pct 的控制技（stun 类）时精进静默落空。改为优先锁定本物种天生技，其次首个带 pct 者
        const spName = this.SPECIES_SKILLS[b.species] && this.SPECIES_SKILLS[b.species].name;
        const tgt = b.skills.find(s => s && spName && s.name === spName && s.pct) || b.skills.find(s => s && s.pct);
        if (tgt) {
          tgt.pct = Math.round(tgt.pct * 1.5 * 10) / 10;
          extra = `，天生技【${tgt.name}】威力精进`;
        }
      }
      // v20 十阶开第二天生技
      // v38（E280）修瑕：原条件 skills.length<2 把「带 2 条继承技驯来」的灵兽永挡在第二天生技门外
      // （E122 同族）——改按物种技名判重补插
      if (b.level >= 10 && this.SPECIES_SKILLS2[b.species] && !(b.skills || []).some(s => s && s.name === this.SPECIES_SKILLS2[b.species].name)) {
        b.skills = b.skills || [];
        b.skills.push({ ...this.SPECIES_SKILLS2[b.species] });
        extra = `，并领悟第二天生技【${b.skills[b.skills.length - 1].name}】！`;
      }
    }
    if (up) {
      // v32 修瑕（E2）：第三技判定移出 if(up)（checkThirdSkill 在下方独立执行，亲昵路线不再漏发）
      Log.add(`【${b.name}】吞下内丹，周身妖气一涨——灵兽升至 <b>${b.level} 阶</b>！${extra || '协助作战愈发骁勇。'}`, 'gain');
      UI.toast(`${b.name} 升至 ${b.level} 阶`);
    } else {
      Log.add(`【${b.name}】吞下内丹，妖气渐长（灵兽经验 +500）。`, 'info');
    }
    this.checkThirdSkill(b);   // v32 修瑕（E2）：喂食即检查第三技（十阶+亲昵 ≥80 任意时点补发）
    Game.afterAction();
  },
  /** v37（E235）：连喂五枚——内丹不足、灵兽十阶圆满即自停（逐枚走 feed 单口同一结算核，
   *  升阶的逐级结算/物种技补插不重入；汇总一条播报） */
  async feedMulti(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    if (b.level >= 10) { UI.toast('它已十阶圆满——蜕变请用「蜕变」'); return; }
    if (Bag.count('m_neidan') < 1) { UI.toast('需【妖兽内丹】一枚'); return; }
    let fed = 0;
    while (fed < 5 && b.level < 10 && Bag.count('m_neidan') >= 1) {
      await this.feed(uid);
      fed++;
    }
    Log.add(`连喂内丹 ×${fed}——【${b.name}】妖气蒸腾（${b.level} 阶 · 经验 ${Math.floor(b.exp)}）。`, 'gain');
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
    // v38（E314）：洞天二重「星槎」——派遣时长 -20%（下限 3 日）
    if (p.cave && p.cave.dongtian >= 2) days = Math.max(3, Math.ceil(days * 0.8));
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
  /** v20 斗兽场：押注观战，胜得 1.6 倍彩头（v30：日限三场）
   *  v35（U2/E177）重构：斗兽场从「盲押陷阱」变「可决策的风险定价」——原对手分布下初始兽
   *  胜率 21%、中期 24%（对 1.6 倍赔付期望 -61%~-66%，中前期是纯亏陷阱），仅毕业兽 +32%，
   *  且界面零胜率信息。现胜算由养成度（力量/阶数/蜕变/亲昵四维加权）单点定夺：
   *  低养成 ≈44%、满养成 ≈77%（毕业兽正期望保留、日限三场封量），面板实时显示胜算预估
   *  与 62.5% 保本线——押不押、押多大，第一次有据可依。 */
  arenaWinP(b) {
    const s = Utils.clamp(b.power, 1, 60) / 60 * 0.4 + (b.level / 10) * 0.3 + (b.evolved ? 0.15 : 0) + Math.min(1, (b.bond || 0) / 100) * 0.15;
    return Math.round(Utils.clamp(42 + 35 * s, 42, 77));
  },
  /** v38（E343）：出战灵兽物种单源（战斗各物种招牌消费） */
  speciesOf(p) {
    const b = this.activeBeast(p);
    return b ? b.species : null;
  },
  /** v38（E340/E343）：协战追击率加成——称号「御兽行家」+5%、兽族招牌「忠勇」+8 */
  assistBonus(p) {
    let n = 0;
    if (Game.titleOn(p, 'beastAssist')) n += 5;
    const sp = this.speciesOf(p);
    if (sp === 'beast') n += 8;
    return n;
  },
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
    const winP = this.arenaWinP(b);
    const pick = await UI.popup({
      title: `斗兽场 · ${b.name}`,
      html: `洞府演武场难得热闹—— ${b.name}（${b.level} 阶${b.evolved ? ' · 蜕变' : ''}${(b.bond || 0) >= 80 ? ' · 心有灵犀' : ''}）对阵山野妖王。<br>
        <span class="tip-line">· 胜算预估 <b class="hl">${winP}%</b>（按力量/阶数/蜕变/亲昵折算）</span>
        <span class="tip-line">· 胜者得 1.6 倍彩头——胜算 62.5% 方为保本，养成愈深，胜算愈高。</span>`,
      options: tiers.map((t, i) => ({ text: `${t.name}（${Utils.fmtNum(Math.round(t.base * eco))}灵石）`, value: i, primary: i === 0 })).concat([{ text: '看看就好', value: null }]),
    });
    if (pick == null) return;
    const cost = Math.round(tiers[pick].base * eco);
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    p.counters.arena.n++;
    Time.add(1);
    const win = Utils.chance(winP);
    // v38（E313）：斗兽连胜——连胜三场解锁「擂主战」（日一场，胜算 −8 对强敌）
    if (win) {
      p.beastArena = p.beastArena || { streak: 0, champDay: 0 };
      p.beastArena.streak = (p.beastArena.streak || 0) + 1;
      const prize = Math.round(cost * 1.6);
      Bag.addStones(prize);
      p.counters.arenaWins = (p.counters.arenaWins || 0) + 1;
      Log.add(`⚔ 斗兽场——<b>${b.name}</b> 三招逼退对手，满场喝彩！彩头灵石 ${Utils.fmtNum(prize)}。（斗兽连胜 ${p.counters.arenaWins} 场${p.beastArena.streak >= 3 ? ` · 场内连胜 ${p.beastArena.streak}——擂主战已解锁！` : ` · 场内连胜 ${p.beastArena.streak}/3`}）`, 'gain');
      if (p.counters.arenaWins % 5 === 0) { KarmaSys.addFortune(2); Log.add('驯兽的名声传开了——气运 +2。', 'gain'); }
    } else {
      p.beastArena = p.beastArena || { streak: 0, champDay: 0 };
      p.beastArena.streak = 0;
      Log.add(`⚔ 斗兽场——<b>${b.name}</b> 苦战落败，垂头丧气地缩到你脚边。押注的 ${Utils.fmtNum(cost)} 灵石归了庄家。（场内连胜清零）`, 'loss');
    }
    Game.afterAction();
  },
  /** v38（E313）：斗兽擂主赛——连胜三场解锁，日一场；对手随连胜递强（我方最强兽 ×1.15×(1+5%连胜)）
   *  胜算沿用 arenaWinP 单点 −8 手感位（强敌 handicap）；奖励走既有资源阶梯，败则连胜清零 */
  async champFight() {
    const p = Game.player;
    const b = this.activeBeast(p);
    if (!b) { UI.toast('需先有一头出战灵兽'); return; }
    p.beastArena = p.beastArena || { streak: 0, champDay: 0 };
    if ((p.beastArena.streak || 0) < 3) { UI.toast('场内连胜三场，擂主方会应战'); return; }
    const today = Math.floor(p.day || 0);
    if (p.beastArena.champDay === today) { UI.toast('今日已挑战过擂主——擂主也要歇气，明日再来'); return; }
    const best = p.beasts.list.reduce((m, x) => Math.max(m, x.power || 0), 0);
    const foeP = Math.min(70, Math.round(best * 1.15 * (1 + 0.05 * (p.beastArena.streak || 0))));
    const winP = Utils.clamp(this.arenaWinP(b) - 8, 30, 72);
    const ok = await UI.popup({
      title: `擂主战 · 第 ${p.beastArena.streak} 连胜`,
      html: `场内连胜三场，<b>老擂主</b>亲自下场会你——其座下灵兽战力约 <b class="hl">${foeP}</b>（你方 ${b.name} 战力 ${b.power}）。<br>
        <span class="tip-line">· 胜算预估 <b class="hl">${winP}%</b>（强敌让八分）<br>· 胜：玄铁 ×(3+连胜)、器魂 ×2、灵石 ${Utils.fmtNum(Math.round(200 * GameData.stoneEco(Math.min(5, p.realmIdx))))}；败：连胜清零。</span>`,
      options: [{ text: '应 战', value: true, primary: true }, { text: '改日再战', value: false }],
    });
    if (!ok) return;
    p.beastArena.champDay = today;
    Time.add(1);
    if (Utils.chance(winP)) {
      const streak = p.beastArena.streak || 0;
      const iron = 3 + streak, stones = Math.round(200 * GameData.stoneEco(Math.min(5, p.realmIdx)));
      Bag.addItem('m_xuantie', iron);
      p.qihun = (p.qihun || 0) + 2;
      Bag.addStones(stones);
      p.beastArena.streak = streak + 1;
      Log.add(`⚔ 擂主战——<b>${b.name}</b> 力挫老擂主的座下灵兽，满堂彩声雷动！得玄铁矿 ×${iron}、器魂 +2、灵石 ${Utils.fmtNum(stones)}。（擂台连胜 ${streak + 1}）`, 'gain');
      UI.toast('擂主战告捷！');
    } else {
      p.beastArena.streak = 0;
      Log.add(`⚔ 擂主战——老擂主宝刀未老，<b>${b.name}</b> 苦战落败。（场内连胜清零，改日再图）`, 'loss');
    }
    Game.afterAction();
  },
  /* ========== v38（E303）：灵兽繁育——双十阶结契生蛋，技能遗传 2~4 门（超野生上限） ========== */
  BREED_CD: 90,
  HATCH_DAYS: 15,
  async breed(uidA) {
    const p = Game.player;
    const a = p.beasts.list.find(x => x.uid === uidA);
    if (!a) return;
    if (a.level < 10) { UI.toast('结契双方皆须十阶圆满'); return; }
    if (p.beasts.egg) { UI.toast('府中已有灵蛋待孵'); return; }
    const today = Math.floor(p.day || 0);
    if ((a.breedCd || 0) > today) { UI.toast(`${a.name} 元气未复（${a.breedCd - today} 日后方可结契）`); return; }
    // v39（E360）：血亲拦截补全——除直系祖链外，双方 lineage 共享任一亲代 id（同父母兄弟姊妹）亦拦截
    const sharesKin = x => (x.lineage || []).some(u => (a.lineage || []).includes(u));
    const cands = p.beasts.list.filter(x => x.uid !== uidA && x.level >= 10 && (x.breedCd || 0) <= today
      && !(x.lineage || []).includes(uidA) && !(a.lineage || []).includes(x.uid) && !sharesKin(x));
    if (!cands.length) { UI.toast('并无合适的结契对象（另需十阶、非血亲、休契期已满）'); return; }
    const uidB = await UI.popup({
      title: `结契繁育 · ${a.name}`,
      html: '择一位十阶伴侣结契——两兽情投，诞下灵蛋（十五日可孵）：<br><span class="tip-line">· 后代天生技自双亲技能池遗传 2~4 门（野生至多三门，繁育可破四门）<br>· 资质 0.9~1.2 浮动；血亲（亲代/子嗣互配）不可结契；结契后双亲休契九十日</span>',
      options: cands.map(x => ({ text: `${x.name}（${x.level} 阶${x.evolved ? ' · 蜕变' : ''} · 技能 ${(x.skills || []).length} 门）`, value: x.uid, primary: x.evolved })).concat([{ text: '作罢', value: null }]),
    });
    if (!uidB) return;
    const b = p.beasts.list.find(x => x.uid === uidB);
    if (!b) return;
    const cost = Math.round(5000 * GameData.sinkCurve(p.realmIdx) / 2.2);
    if (!Bag.spendStones(cost)) { UI.toast(`结契需灵石 ${Utils.fmtNum(cost)}`); return; }
    a.breedCd = today + this.BREED_CD;
    b.breedCd = today + this.BREED_CD;
    p.beasts.egg = { hatchDay: today + this.HATCH_DAYS, parents: [uidA, uidB] };
    Log.add(`【结契】${a.name} 与 ${b.name} 情投意合，于兽栏深处结契——一枚温润的<b>灵蛋</b>已入孵（${this.HATCH_DAYS} 日后可孵）。`, 'system');
    Story.chron('灵兽结契，灵蛋入孵');
    Game.afterAction();
  },
  async hatchEgg() {
    const p = Game.player;
    const egg = p.beasts && p.beasts.egg;
    if (!egg) return;
    const today = Math.floor(p.day || 0);
    if (today < egg.hatchDay) { UI.toast(`灵蛋尚温（还差 ${egg.hatchDay - today} 日破壳）`); return; }
    const pa = p.beasts.list.find(x => x.uid === egg.parents[0]);
    const pb = p.beasts.list.find(x => x.uid === egg.parents[1]);
    if (!pa || !pb) { p.beasts.egg = null; UI.toast('亲代已不在栏中，灵蛋灵机涣散——就此作罢'); return; }
    // 后代：物种随亲、资质 0.9~1.2、技能自双亲技能池遗传 2~4 门（按名去重）、初始亲昵 40
    const species = Utils.chance(50) ? pa.species : pb.species;
    const baseId = Utils.chance(50) ? pa.id : pb.id;
    const skillPool = [];
    for (const par of [pa, pb]) for (const sk of (par.skills || [])) if (sk && !skillPool.some(s2 => s2.name === sk.name)) skillPool.push(sk);
    const nSkills = Utils.rand(2, Math.min(4, skillPool.length));
    const skills = skillPool.slice().sort(() => Math.random() - 0.5).slice(0, nSkills).map(s2 => ({ ...s2 }));
    const power = Utils.clamp(Math.round(((pa.power + pb.power) / 2) * Utils.randF(0.9, 1.2)), 1, 60);
    const uid = p.beasts.nextId++;
    const child = {
      uid, id: baseId, species, name: `${(GameData.MONSTERS[baseId] || {}).name || pa.name}·嗣`,
      power, level: 1, exp: 0, bond: 40, skills, evolved: false, tactic: 'focus',
      lineage: [egg.parents[0], egg.parents[1]],
    };
    p.beasts.list.push(child);
    p.beasts.egg = null;
    // v38（E328）：首只四技灵兽——里程碑
    if (skills.length >= 4 && typeof Game !== 'undefined' && Game.milestone) Game.milestone('msBeast4', '四 技 灵 兽 · 天 生 王者');
    if (typeof Meta !== 'undefined' && Meta.see) Meta.see('monster', baseId);
    Log.add(`【破壳】灵蛋应声而裂——一头<b>${child.name}</b> 探出头来！资质 ${power}（亲代均值浮动），天生技遗传 ${skills.length} 门：${skills.map(s2 => s2.name).join('、')}。`, 'realm');
    UI.announce('✦ 灵 兽 出 世 ✦', 'gold');
    Story.chron(`灵蛋破壳，${child.name} 入栏`);
    Game.afterAction();
  },
  async free(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    // v38（E281）修瑕：放归「派遣中」灵兽原无守卫——在途收益静默蒸发（trip.until 无人结算）
    if (b.trip && b.trip.until > Math.floor(p.day || 0)) {
      UI.toast(`${b.name} 正在外寻宝（旬后方归），归来方可放归`); return;
    }
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
