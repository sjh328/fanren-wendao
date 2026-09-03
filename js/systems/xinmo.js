
/* ======================================================================
 * §21.4 v19 心魔劫 XinmoSys（心魔值 0~100：丹毒反噬/渡劫失利/玄影窥伺累积）
 * 心魔满百必劫：幻境自战心魔化身。胜则道心凝练（全属性+1%/次，永久叠加），
 * 败则心魔暂伏（心魔值回落四成五），修为受挫。
 * ====================================================================== */
const XinmoSys = {
  THRESHOLD: 100,
  /** 心魔值增减（唯一入口） */
  add(p, n, why) {
    if (!p || !n) return;
    const before = p.xinmo || 0;
    p.xinmo = Math.max(0, Math.min(160, before + n));
    if (n > 0 && p.xinmo > before) {
      Log.add(`心魔滋长 +${n}${why ? `（${why}）` : ''}——当前心魔值 <b>${Math.round(p.xinmo)}</b>。`, 'warn');
      if (before < this.THRESHOLD && p.xinmo >= this.THRESHOLD) {
        Log.add('<b>心魔已成气候！它在你识海深处叩门——再不降伏，修行必受其乱。</b>', 'loss');
        UI.toast('心魔值已满，速去修炼页降伏心魔！', true);
        Ambience.sfx('xinmo');   // v19 心魔音
      }
    }
  },
  ready(p) { return (p.xinmo || 0) >= this.THRESHOLD; },
  cleared(p) { return (p.flags && p.flags.xinmoCleared) || 0; },
  /** 全属性加成（Stat.finalScale 消费）：每降伏一次 +1% */
  scale(p) { return 1 + this.cleared(p) * 0.01; },
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
      id: null, name: '心魔化身', elite: true, power: pw, species: 'ghost',
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
    Battle.start(null, { mapName: '识海 · 心魔劫', enemy, story: {
      onEnd: (win) => {
        const pp = Game.player;
        if (win) {
          pp.xinmo = 0;
          pp.flags = pp.flags || {};
          pp.flags.xinmoCleared = (pp.flags.xinmoCleared || 0) + 1;
          pp.insight = Math.min(100, (pp.insight || 0) + 10);
          Log.add(`<b>心魔伏诛！</b>你于幻境中直视本心，道心愈发凝练通透——全属性永久 +${pp.flags.xinmoCleared}%。（突破感悟 +10）`, 'realm');
          UI.announce('✦ 心魔劫 · 降伏 ✦', 'gold');
          Ambience.sfx('victory');
          Story.chron('降伏心魔，道心凝练');
        } else {
          pp.xinmo = 45;
          const lost = Math.round(pp.exp * 0.05);
          pp.exp = Math.max(0, pp.exp - lost);
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
