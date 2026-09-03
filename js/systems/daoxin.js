
/* ======================================================================
 * §20.6 v18 残玉共鸣 + 道心烙印 DaoxinSys
 * 设计原则：剧情与角色互相成就，但不互相锁死——
 *   · 主线每完结一章 → 残玉共鸣 +1 重（+1.5% 全属性），三/六/九重解锁战斗异能；
 *     不做主线不会卡进度，只会错失这层羁绊。
 *   · 每次章末抉择 → 铸一枚永久「道心烙印」，你的选择就是你的人格面板；
 *     烙印只给收益型加成，无惩罚项。
 *   · 境界远超主线进度时，玄影客的窥伺渐紧（小额滋扰，90 日一次，不阻塞）。
 * ====================================================================== */
const DaoxinSys = {
  MAX_ATTUNE: 9,
  BONUS_PER_ATTUNE: 1.5,   // 每重共鸣全属性 +1.5%

  /** 道心烙印表：key = `章末场景id:抉择value` */
  IMPRINTS: {
    /* 第一章 · 尘缘 */
    'c1_end:vengeance': { name: '戾', desc: '以仇为薪，其火愈烈——攻击 +3%，孽障获取 +15%。', fx: { atkPct: 3, karmaMult: 0.15 } },
    'c1_end:caution':   { name: '慎', desc: '人心最靠不住——闪避 +2，气运获取 +15%。', fx: { dodge: 2, fortuneMult: 0.15 } },
    'c1_end:clarity':   { name: '明', desc: '查清真相，好好活着——暴击 +2，修炼效率 +3%。', fx: { crit: 2, cultPct: 3 } },
    /* 第二章 · 青峰疑云 */
    'c2_end:copy':      { name: '匠', desc: '拓印求知，不动根本——修炼效率 +4%。', fx: { cultPct: 4 } },
    'c2_end:take':      { name: '霸', desc: '实物在手，胜过记忆——灵石获取 +10%。', fx: { stoneMult: 0.10 } },
    'c2_end:memorize':  { name: '敛', desc: '藏锋守拙，多一分气运——气运获取 +10%。', fx: { fortuneMult: 0.10 } },
    /* 第三章 · 筑基风云 */
    'c3_end:defy':      { name: '锋', desc: '想要玉，自己来拿——暴击 +3%。', fx: { crit: 3 } },
    'c3_end:feign':     { name: '韧', desc: '与虎谋皮，曲则全——防御 +3%。', fx: { defPct: 3 } },
    'c3_end:silent':    { name: '渊', desc: '渊默而雷声——闪避 +3%。', fx: { dodge: 3 } },
    /* 第四章 · 红尘炼心 */
    'c4_end:blade':     { name: '杀', desc: '以杀止杀，最诚实的公道——攻击 +4%，孽障获取 +10%。', fx: { atkPct: 4, karmaMult: 0.10 } },
    'c4_end:justice':   { name: '正', desc: '罪孽当暴露于天日——气运获取 +10%。', fx: { fortuneMult: 0.10 } },
    'c4_end:mercy':     { name: '慈', desc: '谨慎即是慈悲——孽障获取 -10%，防御 +2%。', fx: { karmaMult: -0.10, defPct: 2 } },
    /* 第五章 · 金丹之秘 */
    'c5_end:accept':    { name: '承', desc: '前世之债，今生来偿——气血 +4%。', fx: { hpPct: 4 } },
    'c5_end:sever':     { name: '断', desc: '我是我，他是他——闪避 +2，暴击 +1。', fx: { dodge: 2, crit: 1 } },
    'c5_end:leverage':  { name: '谋', desc: '以执念为刃，反制于人——灵石获取 +10%。', fx: { stoneMult: 0.10 } },
    /* 第六章 · 元婴杀局 */
    'c6_end:slay':      { name: '厉', desc: '杀伐果断，道心愈厉——暴击 +2，孽障获取 +10%。', fx: { crit: 2, karmaMult: 0.10 } },
    'c6_end:interrogate': { name: '察', desc: '问渡船人，察而后动——修炼效率 +4%。', fx: { cultPct: 4 } },
    'c6_end:spare':     { name: '容', desc: '不为已甚，直取要害——孽障获取 -15%，气血 +2%。', fx: { karmaMult: -0.15, hpPct: 2 } },
    /* 第七章 · 血河旧账 */
    'c7_end:open':      { name: '堂', desc: '堂堂之阵，正气在胸——攻击 +3%。', fx: { atkPct: 3 } },
    'c7_end:dark':      { name: '隐', desc: '先断其爪，再扼其喉——闪避 +3%。', fx: { dodge: 3 } },
    'c7_end:blade':     { name: '借', desc: '坐山观虎斗，收渔翁利——灵石获取 +15%。', fx: { stoneMult: 0.15 } },
    /* 第八章 · 大乘问道 */
    'c8_end:together':  { name: '同', desc: '道途最贵，有人同担——防御 +3%。', fx: { defPct: 3 } },
    'c8_end:entrust':   { name: '托', desc: '道心因托付而愈定——气血 +3%。', fx: { hpPct: 3 } },
    'c8_end:alone':     { name: '孤', desc: '独行者，道心至坚——攻击 +5%。', fx: { atkPct: 5 } },
    /* 第九章 · 天劫决战 */
    'c9_end:redeem':    { name: '渡', desc: '杀伐止于慈悲——气运获取 +15%。', fx: { fortuneMult: 0.15 } },
    'c9_end:execute':   { name: '决', desc: '恩怨两清，一剑了断——攻击 +5%。', fx: { atkPct: 5 } },
    'c9_end:walk':      { name: '忘', desc: '劫火焚尽，恩怨随灭——防御 +4%。', fx: { defPct: 4 } },
  },

  /** 主线完结一章 → 残玉共鸣 +1 */
  attune(p, chaptersDone) {
    const before = p.jade || 0;
    p.jade = Math.max(before, Math.min(this.MAX_ATTUNE, chaptersDone));
    if (p.jade > before) {
      const abl = { 3: '玉灵护体', 6: '血河噬敌', 9: '两世归一' }[p.jade];
      Log.add(`【残玉共鸣 · 第${this.CN[p.jade]}重】怀中残玉嗡鸣一声，与你道韵相合——全属性 +1.5%。${abl ? `并觉醒异能：<b>${abl}</b>。` : ''}`, 'realm');
      UI.announce(`✦ 残玉共鸣 · ${p.jade}/9 ✦`, 'gold');
      Ambience.sfx('rare');
    }
  },
  CN: ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'],

  /** 共鸣全属性加成（百分比） */
  attunePct(p) { return (p.jade || 0) * this.BONUS_PER_ATTUNE; },

  /** 已铸烙印列表 */
  listOf(p) {
    const out = [];
    const ch = (p && p.story && p.story.choices) || {};
    for (const [key, val] of Object.entries(ch)) {
      const def = this.IMPRINTS[`${key}:${val}`];
      if (def) out.push(def);
    }
    return out;
  },
  /** 烙印效果聚合（Stat.compute 调用） */
  bonusOf(p) {
    const agg = { atkPct: 0, defPct: 0, hpPct: 0, crit: 0, dodge: 0, cultPct: 0 };
    for (const im of this.listOf(p)) {
      for (const [k, v] of Object.entries(im.fx)) {
        if (k in agg) agg[k] += v;
      }
    }
    return agg;
  },
  stoneMult(p) {
    let m = 1;
    for (const im of this.listOf(p)) if (im.fx.stoneMult) m += im.fx.stoneMult;
    return m;
  },
  /** 气运/孽障获取倍率（只作用于正向增量） */
  gainMult(p, kind) {
    let m = 1;
    for (const im of this.listOf(p)) {
      const v = im.fx[kind];
      if (v) m += v;
    }
    return Math.max(0.3, m);
  },

  /** 玄影窥伺：境界领先主线两大境界 → 每 90 游戏日一次小额滋扰（软约束，不阻塞） */
  shadowNudge(p) {
    if (!p || p.dead || p.flags.ascended) return;
    const q = p.quest || { ch: 0 };
    if (q.ch >= 9) return;
    if (p.realmIdx < q.ch + 2) return;   // 领先不足两大境界，不滋扰
    const today = Math.floor(p.day);
    if (p.shadowDay != null && today - p.shadowDay < 90) return;
    p.shadowDay = today;
    const lose = Math.round(8 * GameData.stoneEco(Math.min(5, p.realmIdx)));
    let txt = '【玄影客的视线】夜半窗外一闪而过的黑影，晨起时储物袋瘪了几分——';
    if (Bag.spendStones(lose)) txt += `灵石 -${Utils.fmtNum(lose)}，`;
    p.fortune = Math.max(0, (p.fortune || 0) - 1);
    if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 2, '玄影窥伺');
    txt += '气运 -1。主线荒废太久，暗处的目光愈发迫近……（推进问道主线可斩断窥伺）';
    Log.add(txt, 'warn');
    UI.toast('玄影客的视线迫近了', true);
  },

  /** 左栏展示 */
  statusHtml(p) {
    if (!p) return '';
    const parts = [];
    if (p.jade) parts.push(`<span class="chip lucky" title="残玉共鸣：每重全属性+1.5%。三重【玉灵护体】每战一次替你挡下致命伤；六重【血河噬敌】普攻按孽障汲取修为；九重【两世归一】突破成算+3%。">残玉 <b>${p.jade}/9</b></span>`);
    for (const im of this.listOf(p)) {
      parts.push(`<span class="chip" title="道心烙印 · ${im.desc}">【${im.name}】</span>`);
    }
    return parts.length ? `<div class="chip-row">${parts.join('')}</div>` : '';
  },

  /** v18 开篇卷轴的角色注脚：残玉随行低语；第八章决战前夜道侣客串。返回场景数组（可能为空） */
  openEcho(p, chapter) {
    const scenes = [];
    // 道侣客串（第八章 · 决战前夜）
    if (chapter === 8 && p.partner) {
      const pd = (typeof NpcSys !== 'undefined' && NpcSys.def) ? NpcSys.def(p.partner) : null;
      if (pd) {
        scenes.push({ t: 'dialog', who: pd.name, title: pd.title, text: `「这一战，我陪你走到底。\n你若不归——我便把你的道，接着走下去。」\n\n${pd.name} 递来一枚护身符，针脚细密，是你从未见过的手工。` });
      }
    }
    // 残玉低语（共鸣 > 0 时随行）
    if (p.jade > 0) {
      scenes.push({ t: 'narr', text: `怀中残玉微微发烫——它已随你共历 ${DaoxinSys.CN[p.jade]}章因果，玉身深处隐有星河流转。\n此番启程，玉中似有低语相送：「道途尚远，吾与君同。」` });
    }
    return scenes;
  },
};
window.DaoxinSys = DaoxinSys;
