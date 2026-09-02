/* ======================================================================
 * §1.7 增量扩展（v5）：职业专属叙事 Narrative
 * 只改文案，不改数值——所有取词函数均从 GameData.DAO_FLAVOR 取当前大道
 * 的专属语料；未择道者一律回落原文案。
 * ====================================================================== */
const Narrative = {
  flavor() { const p = Game.player; return (p && p.dao && GameData.DAO_FLAVOR[p.dao]) || null; },
  /** 历练场景句（treasure / fortune / trap），有专属语料才追加 */
  logScene(kind) {
    const f = this.flavor();
    if (!f || !f[kind] || !f[kind].length) return;
    Log.add(Utils.pick(f[kind]), 'info');
  },
  /** 普攻动词短语（未择道保持原文案「你出手攻击」） */
  attack() { const f = this.flavor(); return f ? Utils.pick(f.attack) : '你出手攻击'; },
  victory() { const f = this.flavor(); return f ? Utils.pick(f.victory) : null; },
  defeat() { const f = this.flavor(); return f ? Utils.pick(f.defeat) : null; },
  tribSuccess() { const f = this.flavor(); return f ? Utils.pick(f.tribSuccess) : null; },
  tribFail() { const f = this.flavor(); return f ? Utils.pick(f.tribFail) : null; },
  /** 遇常驻修士时的礼数括注 */
  greet() { const f = this.flavor(); return f ? f.greet : null; },
  /** 陌生修士观察句 */
  observe() { const f = this.flavor(); return (f && f.observe) ? Utils.pick(f.observe) : null; },
  /** 红尘劫三选文案：随道途而变 */
  dilemmaOptions() {
    const f = this.flavor();
    const d = f && f.dilemma;
    return [
      { text: (d && d.help) || '出手相助（气运↑，有所损耗）', value: 'help', primary: true },
      { text: (d && d.rob) || '趁火打劫（孽障↑，有所进账）', value: 'rob' },
      { text: (d && d.ignore) || '视而不见（一身轻）', value: 'ignore' },
    ];
  },
};
window.Narrative = Narrative;