
/* ======================================================================
 * §21.4 v19 心魔劫 XinmoSys（心魔值 0~100：丹毒反噬/渡劫失利/玄影窥伺/邪行业障累积）
 * 心魔满百必劫：幻境自战心魔化身。胜则道心凝练（全属性+1%/次，永久叠加），
 * 败则心魔暂伏（心魔值回落四成五），修为受挫。
 * v37（E245）：心魔上限如实化与来源扩容——
 * · 凝练封顶 +20% 为本世不可达装饰（一劫一胜 +1%，一世至多两三劫），改如实 min(6, cleared)%；
 * · realmIdx≥6 心魔 70 即劫（高境决策密度更高，心魔是「选择的代价」而非纯惩罚尾巴）；
 * · 行为来源扩容：邪修吞噬精元 +3 / 丹毒超限仍服丹 +4 / 窥探符 +2 / 赌局失利 +3 / 背刺得手 +5
 *   （各挂对应系统调用点；3~6 次降伏本世可达，凝练上限自此真实可触）。
 * ====================================================================== */
const XinmoSys = {
  THRESHOLD: 100,
  /** v37（E245）：心魔劫阈值——炼虚（realmIdx≥6）起 70 即劫，其余满百 */
  threshold(p) { return (p && p.realmIdx >= 6) ? 70 : 100; },
  /** 心魔值增减（唯一入口） */
  add(p, n, why) {
    if (!p || !n) return;
    const before = p.xinmo || 0;
    p.xinmo = Math.max(0, Math.min(160, before + n));
    if (n > 0 && p.xinmo > before) {
      Log.add(`心魔滋长 +${n}${why ? `（${why}）` : ''}——当前心魔值 <b>${Math.round(p.xinmo)}</b>。`, 'warn');
      const th = this.threshold(p);
      if (before < th && p.xinmo >= th) {
        Log.add('<b>心魔已成气候！它在你识海深处叩门——再不降伏，修行必受其乱。</b>', 'loss');
        UI.toast('心魔值已满，速去修炼页降伏心魔！', true);
        Ambience.sfx('xinmo');   // v19 心魔音
      }
    }
  },
  ready(p) { return (p.xinmo || 0) >= this.threshold(p); },
  cleared(p) { return (p.flags && p.flags.xinmoCleared) || 0; },
  /** 全属性加成（Stat.finalScale 消费）：每降伏一次 +1%，封顶 +6%（v37（E245）：原 +20% 为
   *  本世不可达装饰，改如实——扩源后每世 3~6 次降伏可期，封顶真实可触） */
  scale(p) { return 1 + Math.min(6, this.cleared(p)) * 0.01; },
  /* ========== v41（E448）②：六道心象池（贪/嗔/痴/慢/疑/惰）——池写本文件不进 game-data ==========
   *  每象专属开场词 2 句 + 技能组 3 门（复用既有敌人 skills 白名单机制）；剪影现算零新存档字段 */
  IMAGES: {
    tan:  { name: '贪', lines: ['「你攥着那些灵石的样子，像极了饿鬼攥着供饭。」', '「再囤一分，你的道心便再轻一分——你我，都清楚。」'],
      skills: [{ name: '摄物贪手', w: 35, kind: 'drain', mult: 1.15, leech: 0.5 }, { name: '万物皆可夺', w: 30, kind: 'bleed', pct: 3, rounds: 2 }, { name: '贪壑难填', w: 25, kind: 'weaken', pct: 22, rounds: 2 }] },
    chen: { name: '嗔', lines: ['「记仇吗？你夜里翻来覆去嚼的那些名字——都是我喂你的。」', '「火烧起来的时候，你可从没想过扑。」'],
      skills: [{ name: '瞋火燎心', w: 35, kind: 'burn', pct: 4, rounds: 2 }, { name: '怒涛血刃', w: 30, kind: 'bleed', pct: 3.5, rounds: 2 }, { name: '一念成魔', w: 25, kind: 'stun', rounds: 1 }] },
    chi:  { name: '痴', lines: ['「参了三百遍的那一句话，你其实一个字也没懂。」', '「困住你的从来不是关，是你自己画的圈。」'],
      skills: [{ name: '执念缠身', w: 35, kind: 'slow', pct: 28, rounds: 2 }, { name: '痴梦不解', w: 30, kind: 'freeze', rounds: 1 }, { name: '钻牛角尖', w: 25, kind: 'defdown', pct: 22, rounds: 2 }] },
    man:  { name: '慢', lines: ['「榜首也好、魁首也罢——你早觉得全天下的道理都该让路了。」', '「低头？你忘了怎么写了。」'],
      skills: [{ name: '我慢高山', w: 35, kind: 'roar', atk: 25, rounds: 2 }, { name: '目下无尘', w: 30, kind: 'weaken', pct: 25, rounds: 2 }, { name: '傲骨为障', w: 25, kind: 'guard', def: 35, rounds: 2 }] },
    yi:   { name: '疑', lines: ['「背刺过人的手，梦里也攥不拢——你数过他们临走的眼神吗？」', '「誓是你说碎就碎的，如今你猜谁都会这样对你。」'],
      skills: [{ name: '疑影憧憧', w: 35, kind: 'weaken', pct: 25, rounds: 2 }, { name: '猜忌成刃', w: 30, kind: 'poison', pct: 3.5, rounds: 3 }, { name: '倒戈一击', w: 25, kind: 'bleed', pct: 3, rounds: 2 }] },
    duo:  { name: '惰', lines: ['「修行？明日再说吧——这话你已经说了多少个明日？」', '「你把日子都睡成了同一日，还问我为何寻上门。」'],
      skills: [{ name: '怠惰如泥', w: 35, kind: 'slow', pct: 30, rounds: 2 }, { name: '拖字诀', w: 30, kind: 'guard', def: 30, rounds: 2 }, { name: '懒骨蚀神', w: 25, kind: 'weaken', pct: 20, rounds: 2 }] },
  },
  /** v41（E448）②：心象剪影现算——按本世 counters/孽障/记忆推主象，因果对表：
   *  杀孽（孽障·精英杀）→嗔、背刺/破誓（记忆·宽恕）→疑、存灵石→贪、荣誉在身→慢、
   *  论道切磋求知之执→痴、挂机搁身→惰；济世（散财/侠名）为池外善念，消嗔减疑。
   *  返回 { id, name, sev(0.3~1 重度，镜像 0.95~1.05 语义带), lines, skills }——不落盘 */
  imageOf(p) {
    const c = p.counters || {};
    const betrayN = Object.values(p.npcs || {}).reduce((n, s) => n + (((s || {}).mem || []).filter(m => m.t === 'betray').length), 0);
    const mercyN = (p.oaths && p.oaths.mercy) ? Object.values(p.oaths.mercy).reduce((a, b) => a + (Number(b) || 0), 0) : 0;
    const poorCap = (typeof OathSys !== 'undefined' && OathSys.poorCap) ? Math.max(1, OathSys.poorCap(p)) : 1;
    const w = {
      chen: (p.karma || 0) * 0.4 + (c.killsElite || 0) * 2,
      yi:   betrayN * 25 + mercyN * 15,
      tan:  Math.min(40, (typeof Bag !== 'undefined' && Bag.stonesTotal ? Bag.stonesTotal(p) : 0) / poorCap * 40),
      man:  (p.rankHonor || 0) * 3 + ((p.flags && p.flags.tourneyChamp) || 0) * 8,
      chi:  (c.learns || 0) * 2 + (c.spars || 0) * 0.5,
      duo:  (typeof AutoCult !== 'undefined' && AutoCult.active) ? 20 : 0,
    };
    const good = (c.donates || 0) * 3 + ((p.reputation || 0) >= 80 ? 12 : 0);   // 济世→善：善念折冲杀业
    w.chen = Math.max(0, w.chen - good);
    w.yi = Math.max(0, w.yi - good);
    const rows = Object.entries(w).sort((a, b2) => b2[1] - a[1]);
    const topId = rows[0][0];
    const topW = rows[0][1];
    const img = this.IMAGES[topId];
    return { id: topId, name: img.name, sev: topW <= 0 ? 0.5 : Utils.clamp(topW / 40, 0.3, 1), lines: img.lines, skills: img.skills };
  },
  /** 降伏心魔：幻境之战（胜负皆了局）
   *  v41（E448）①：化身改玩家 Stat 镜像——旧基式 55+5rp^1.6 零 parity，E374 后仪式战相对塌陷。
   *  hp=玩家 maxHp×1.1、atk=玩家 atk×0.9、def=玩家 def、spd=玩家 speed；
   *  心象重度 sev ∈ 0.3~1 折 0.95~1.05 语义带（旗鼓相当带微调，E420② 带名），70 心魔即劫的「选择的代价」复归 */
  start() {
    const p = Game.player;
    if (!this.ready(p) || Battle.active || Story.active()) return;
    Log.add('你阖目入定，识海深处黑雾翻涌——心魔化身，踏着你自己的模样而来。', 'warn');
    Story.chron('心魔劫起，识海自战');
    const st = Stat.compute(p);
    const img = this.imageOf(p);
    const trim = 0.95 + 0.10 * img.sev;
    const rp = Utils.clamp(p.realmIdx * 4 + p.layer + 2, 1, 60);
    const rIdx = Utils.clamp(Math.floor(rp / 4), 0, 9);
    const enemy = {
      id: null, name: `心魔化身 · ${img.name}相`, elite: true, power: rp, species: 'ghost', bossArt: 'xinmo',
      realmLabel: GameData.REALM_NAMES[rIdx] + GameData.LAYER_NAMES[Utils.clamp(rp % 4, 0, 3)],
      hpMax: Math.round(st.maxHp * 1.1 * trim),
      atk: Math.round(st.atk * 0.9 * trim),
      def: Math.round(st.def), spd: Math.round(st.speed),
      dodge: 8, crit: 12,
      skills: img.skills.slice(0, 3),
      expGain: Math.round(30 * GameData.eco(rIdx)), stoneGain: 0, dropTier: 2, rareDrop: null, hp: 0,
      _storyBark: `${img.lines[0]}\n${img.lines[1]}`,
    };
    // v20 心魔镜像：它抬手的，分明是你自己的成名绝技
    const dmgGf = Object.entries(p.gongfa || {})
      .map(([id]) => GameData.ITEMS[id])
      .filter(d => d && d.skill && d.skill.kind === 'damage')
      .sort((a, b) => b.skill.power - a.skill.power)[0];
    if (dmgGf) {
      enemy.skills.unshift({ name: '心魔·' + dmgGf.skill.name, w: 35, kind: 'bleed', pct: 3, rounds: 2 });
      enemy._storyBark += '\n（它抬手的那一式，分明是你修的【' + dmgGf.skill.name + '】——）';
    }
    if ((p.benming && p.benming.lv >= 6) || (p.jade || 0) >= 6) {
      enemy.skills.push({ name: '心魔·两世噬', w: 25, kind: 'drain', mult: 1.25, leech: 0.5 });
    }
    Battle.start(null, { mapName: '识海 · 心魔劫', enemy, story: {
      onEnd: (win) => {
        const pp = Game.player;
        if (win) {
          pp.xinmo = 0;
          pp.flags = pp.flags || {};
          pp.flags.xinmoCleared = (pp.flags.xinmoCleared || 0) + 1;
          Cultivate.addInsight(pp, 10);   // v28：满百溢出折算修为
          Log.add(`<b>心魔伏诛！</b>你于幻境中直视本心，道心愈发凝练通透——全属性永久 +${pp.flags.xinmoCleared}%。（突破感悟 +10）`, 'realm');
          UI.announce('✦ 心魔劫 · 降伏 ✦', 'gold');
          Ambience.sfx('victory');
          Story.chron('降伏心魔，道心凝练');
        } else {
          pp.xinmo = 45;
          const lost = Math.round(pp.exp * 0.05);
          pp.exp = Math.max(0, pp.exp - lost);
          Time.cutLife(pp, 5, '心魔反噬，神魂耗损');   // v29 天年
          Log.add(`心魔难伏，它化作黑雾散去，临散前留下一声嗤笑。心魔值回落至 45，层修为 -${Utils.fmtNum(lost)}。
道心之劫，败亦是修行——整理心境，再来。`, 'loss');
          Story.chron('心魔劫失利，心魔暂伏');
        }
        Game.afterAction();
      },
    } });
  },
};
window.XinmoSys = XinmoSys;
