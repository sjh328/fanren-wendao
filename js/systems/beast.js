
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
    if (!B || B.over || !B.enemy) return;
    const e = B.enemy;
    if (!this.TAMEABLE.includes(e.species)) { UI.toast('此物灵智已开或非血肉之躯，无法驯服'); return; }
    if (e.hp > e.hpMax * 0.2) { UI.toast('需先将其打至两成血以下，方能驯服'); return; }
    const slotFull = p.beasts.list.length >= this.maxSlots(p);
    const diff = (e.power - (p.realmIdx * 4 + p.layer)) * 5;
    const tameSkill = p.tameSkill || 0;
    const rate = Utils.clamp(45 + p.attrs.luck * 2 - diff + Math.floor(tameSkill / 10), 8, 90);
    const ok = await UI.popup({
      title: `驯服 · ${e.name}`,
      html: `${e.name} 已力竭，野性渐敛。你缓缓探出神识，以灵力温沟通其灵智……<br>
        · 成功率 <b class="hl">${rate.toFixed(0)}%</b>（福缘 ${p.attrs.luck}${diff > 0 ? `，境界压制 -${diff}` : ''}）<br>
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
      }
      B.enemy.hp = 0;
      B.log(`${e.name} 驯服功成！`, 'log-gain');
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
    p.counters.wins++;
    const gain = Math.round(B.enemy.expGain * 0.5);
    Cultivate.addExp(p, gain);
    if (fled) Bag.addStones(Math.round(B.enemy.stoneGain * 0.3));
    Log.add(fled
      ? `兽虽走脱，你仍获修为 +${Utils.fmtNum(gain)}，并捡到些许灵石。`
      : `${B.enemy.name} 认主之后，自动为你衔来修为造化：修为 +${Utils.fmtNum(gain)}。`, 'gain');
    Battle.end();
    UI.announce(fled ? '灵 兽 走 脱' : '驯 服 功 成', fled ? 'bad' : 'ok');
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
  /** v19 物种天生技能（灵兽五阶习得，九阶精进） */
  SPECIES_SKILLS: {
    beast:    { name: '兽王撕咬', kind: 'bleed', pct: 3, rounds: 2 },
    snake:    { name: '淬毒獠牙', kind: 'poison', pct: 3, rounds: 3 },
    swarm:    { name: '蚀甲之群', kind: 'defdown', pct: 20, rounds: 2 },
    plant:    { name: '缠丝藤缚', kind: 'slow', pct: 25, rounds: 2 },
    element:  { name: '灵焰灼身', kind: 'burn', pct: 3.5, rounds: 2 },
    ghost:    { name: '摄魂低语', kind: 'drain', mult: 1.15, leech: 0.4 },
    construct:{ name: '铁壁守护', kind: 'guard', def: 30, rounds: 2 },
  },
  /** v20 十阶第二天生技（每物种另一路打法） */
  SPECIES_SKILLS2: {
    beast:    { name: '裂地重扑', kind: 'stun', rounds: 1 },
    snake:    { name: '腐骨毒雾', kind: 'poison', pct: 4, rounds: 3 },
    swarm:    { name: '蚀魂之群', kind: 'mpburn', pct: 20 },
    plant:    { name: '盘根错节', kind: 'slow', pct: 30, rounds: 2 },
    element:  { name: '灵爆', kind: 'burn', pct: 5, rounds: 2 },
    ghost:    { name: '慑心之嚎', kind: 'weaken', pct: 25, rounds: 2 },
    construct:{ name: '地裂震波', kind: 'stun', rounds: 1 },
  },
  /** 战斗中灵兽协助攻击（Battle.act 开头调用）：40% 几率出手 */
  async assist(st) {
    const B = Battle.active;
    const p = Game.player;
    const b = this.activeBeast(p);
    if (!B || !b || B.over || !Utils.chance(40 + (b.bond || 0) * 0.1)) return false;   // v19 抚摸亲昵加成
    const dmg = Math.max(1, Math.round(st.atk * (0.22 + b.level * 0.03) * (1 + b.power * 0.02) * (b.evolved ? 1.3 : 1) * Utils.randF(0.8, 1.2)));   // v19 进化 ×1.3
    B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
    B.hitShake = true;
    if (B.stats) { B.stats.out += dmg; if (B.stats.src) B.stats.src.beast += dmg; }   // v20 伤害构成统计
    B.pushFloat('enemy', `-${dmg}`, 'dmg');
    // v18：灵兽技能实效化——施加真实技能效果（毒/流血/减益等）；v20 支持双技
    let skillNote = '';
    for (const sk of (b.skills || []).slice(0, 2)) {
      if (sk.kind && ['poison', 'burn', 'bleed', 'defdown', 'slow', 'weaken', 'stun'].includes(sk.kind)) {
        Battle.applyEnemyFx(B.enemy, { kind: sk.kind, pct: (sk.pct || 2) * 0.6, rounds: sk.rounds || 2 });
        skillNote += `【${sk.name}】`;
      }
    }
    B.log(`${skillNote}你的灵兽 <b>${b.name}</b> 亦张牙舞爪扑上助战——造成 <b>${dmg}</b> 点伤害！`, 'log-gain');
    Battle.render();
    await Battle.wait(360);
    return B.enemy.hp <= 0;
  },
  /** 喂食内丹：+500 灵兽经验 */
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
        Log.add(`【${b.name}】吞下内丹，周身妖气一涨——灵兽升至 <b>${b.level} 阶</b>！${extra || '协助作战愈发骁勇。'}`, 'gain');
        UI.toast(`${b.name} 升至 ${b.level} 阶`);
      } else {
      Log.add(`【${b.name}】吞下内丹，妖气渐长（灵兽经验 +500）。`, 'info');
    }
    Game.afterAction();
  },
  setActive(uid) {
    const p = Game.player;
    p.beasts.active = p.beasts.active === uid ? null : uid;
    const b = this.activeBeast(p);
    Log.add(b ? `你放出 <b>${b.name}</b> 随行出战。` : '灵兽归栏歇息。', 'info');
    Game.afterAction();
  },
  /** v19 副战灵兽：不出手协战，但被动以五成效力加身 */
  setActive2(uid) {
    const p = Game.player;
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
    const cost = Math.round(8000 * Math.pow(2.2, Math.min(5, p.realmIdx)));
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
  /** v20 寻宝归来结算 */
  claimTrip(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b || !b.trip) return;
    const today = Math.floor(p.day || 0);
    if (today < b.trip.until) { UI.toast(`尚未归来（还差 ${b.trip.until - today} 日）`); return; }
    const tier = Utils.clamp(Math.floor(b.power / 12) + Math.floor(b.trip.days / 6), 1, 4);
    const mat = Utils.pick(GameData.matsByTier(tier));
    const qty = b.trip.days >= 7 ? 2 : 1;
    const stones = Math.round((30 + b.power * 2) * b.trip.days * GameData.stoneEco(Math.min(4, p.realmIdx)) / 3);
    Bag.addItem(mat, qty);
    Bag.addStones(stones);
    b.exp += b.trip.days * 120;
    Log.add(`【${b.name}】叼着竹篓归来——带回【${GameData.ITEMS[mat].name}】×${qty}、灵石 ${Utils.fmtNum(stones)}，妖气也涨了几分。`, 'gain');
    if (b.exp >= b.level * 400) UI.toast(`${b.name} 经验涨了，可喂内丹升阶`);
    b.trip = null;
    Game.afterAction();
  },
  /** v20 斗兽场：押注观战，胜得 1.8 倍彩头 */
  async arena() {
    const p = Game.player;
    const b = this.activeBeast(p);
    if (!b) { UI.toast('需先有一头出战灵兽'); return; }
    const eco = GameData.stoneEco(Math.min(5, p.realmIdx));
    const tiers = [
      { name: '小注', base: 100 },
      { name: '中注', base: 800 },
      { name: '豪注', base: 5000 },
    ];
    const pick = await UI.popup({
      title: `斗兽场 · ${b.name}`,
      html: `洞府演武场难得热闹—— ${b.name}（${b.level} 阶${b.evolved ? ' · 蜕变' : ''}）对阵山野妖王。<br>押它一注，胜者得 1.8 倍彩头。`,
      options: tiers.map((t, i) => ({ text: `${t.name}（${Utils.fmtNum(Math.round(t.base * eco))}灵石）`, value: i, primary: i === 0 })).concat([{ text: '看看就好', value: null }]),
    });
    if (pick == null) return;
    const cost = Math.round(tiers[pick].base * eco);
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    Time.add(1);
    const oppPower = Utils.clamp(Math.round(b.power * Utils.randF(0.8, 1.3)), 1, 60);
    const myScore = b.power + b.level * 2 + (b.evolved ? 8 : 0) + (b.bond || 0) / 10 + Utils.rand(0, 10);
    const oppScore = oppPower + Utils.rand(0, 14);
    const win = myScore >= oppScore;
    if (win) {
      const prize = Math.round(cost * 1.8);
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
    Log.add(`你解开灵契，${b.name} 绕你三匝，长啸一声遁入山林。`, 'info');
    Game.afterAction();
  },
};
