
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
  /** 降伏心魔：幻境之战（胜负皆了局） */
  start() {
    const p = Game.player;
    if (!this.ready(p) || Battle.active || Story.active()) return;
    const rp = Utils.clamp(p.realmIdx * 4 + p.layer + 2, 1, 60);
    Log.add('你阖目入定，识海深处黑雾翻涌——心魔化身，踏着你自己的模样而来。', 'warn');
    Story.chron('心魔劫起，识海自战');
    const pw = rp;
    const rIdx = Utils.clamp(Math.floor(pw / 4), 0, 9);
    const enemy = {
      id: null, name: '心魔化身', elite: true, power: pw, species: 'ghost', bossArt: 'xinmo',
      realmLabel: GameData.REALM_NAMES[rIdx] + GameData.LAYER_NAMES[Utils.clamp(pw % 4, 0, 3)],
      hpMax: Math.round((55 + Math.pow(pw, 1.6) * 5) * 1.7 * 0.9),
      atk: Math.round((6 + pw * 2.6) * 1.35 * 0.9),
      def: Math.round((4 + pw * 2.2) * 0.9), spd: Math.round(7 + pw * 0.9),
      dodge: 8, crit: 12,
      skills: [
        { name: '心魔低语', w: 30, kind: 'weaken', pct: 25, rounds: 2 },
        { name: '旧事重演', w: 30, kind: 'bleed', pct: 3, rounds: 2 },
        { name: '心渊噬魂', w: 25, kind: 'drain', mult: 1.2, leech: 0.5 },
      ],
      expGain: Math.round(30 * GameData.eco(rIdx)), stoneGain: 0, dropTier: 2, rareDrop: null, hp: 0,
      _storyBark: '心魔化身开口，用的却是你自己的声音：「你不敢看的那一面……就是我。」',
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
