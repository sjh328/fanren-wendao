
/* ======================================================================
 * §1.7 增量扩展（v5）：职业专属叙事 Narrative
 * 只改文案，不改数值——所有取词函数均从 GameData.DAO_FLAVOR 取当前大道
 * 的专属语料；未择道者一律回落原文案。
 * ====================================================================== */
const Narrative = {
  flavor() { const p = Game.player; return (p && p.dao && GameData.DAO_FLAVOR[p.dao]) || null; },
  /** 历练场景句（treasure / fortune / trap），有专属语料才追加。
   *  v41（E431）：改走 flavor 通道——六道语料自此不受日志精简档（lite）滤除，且可用「见闻」过滤钮单列。 */
  logScene(kind) {
    const f = this.flavor();
    if (!f || !f[kind] || !f[kind].length) return;
    Log.add(Utils.pick(f[kind]), 'flavor');
  },
  /** 普攻动词短语（未择道保持原文案「你出手攻击」） */
  attack() { const f = this.flavor(); return f ? Utils.pick(f.attack) : '你出手攻击'; },
  victory() { const f = this.flavor(); return f ? Utils.pick(f.victory) : null; },
  defeat() { const f = this.flavor(); return f ? Utils.pick(f.defeat) : null; },
  tribSuccess() { const f = this.flavor(); return f ? Utils.pick(f.tribSuccess) : null; },
  tribFail() { const f = this.flavor(); return f ? Utils.pick(f.tribFail) : null; },
  /** 遇常驻修士时的礼数括注 */
  greet() { const f = this.flavor(); return f ? f.greet : null; },
  /** v41（E433）：观察语回归——纯取句函数（无渲染副作用，语料取自 DAO_FLAVOR.observe）。
   *  传 id 时按 id 稳定取句（同一 NPC 初遇所见之句不随重渲染漂移），缺省随机取句；
   *  江湖页 NPC 行初遇（未结识）处消费。 */
  observe(id) {
    const f = this.flavor();
    if (!f || !f.observe || !f.observe.length) return null;
    if (!id) return Utils.pick(f.observe);
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return f.observe[h % f.observe.length];
  },
  /** 红尘劫三选文案：随道途而变，value 与顺序与原版完全一致（数值逻辑不变） */
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
