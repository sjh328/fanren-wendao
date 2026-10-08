
/* ======================================================================
 * §1.7 增量扩展（v5）：职业专属叙事 Narrative
 * 只改文案，不改数值——所有取词函数均从 GameData.DAO_FLAVOR 取当前大道
 * 的专属语料；未择道者一律回落原文案。
 * ====================================================================== */
const Narrative = {
  flavor() { const p = Game.player; return (p && p.dao && GameData.DAO_FLAVOR[p.dao]) || null; },
  /** v42（E495）：取句单源——基础池 5% 概率落稀有句池（kindRare，flavor-v42 扩容），余者均匀取基础池 */
  _pick(kind) {
    const f = this.flavor();
    const base = f && f[kind];
    if (!base || !base.length) return null;
    const rare = f[kind + 'Rare'];
    if (rare && rare.length && Utils.chance(5)) return Utils.pick(rare);
    return Utils.pick(base);
  },
  /** 历练场景句（treasure / fortune / trap / observe），有专属语料才追加。
   *  v41（E431）：改走 flavor 通道——六道语料自此不受日志精简档（lite）滤除，且可用「见闻」过滤钮单列。
   *  v42（E495）：稀有句走 _pick 单源（5% 概率）。 */
  logScene(kind) {
    const f = this.flavor();
    if (!f || !f[kind] || !f[kind].length) return;
    Log.add(this._pick(kind), 'flavor');
  },
  /** 普攻动词短语（未择道保持原文案「你出手攻击」）。
   *  v42（E495）：按敌方种族分池——读 Battle 会话敌 species（buildMonster 单源携带），ghost/construct/
   *  human 各有专属分池（flavor-v42 扩容），其余种族与无会话场景走道池；5% 稀有句仍适用 */
  attack() {
    const f = this.flavor();
    if (!f) return '你出手攻击';
    const e = (typeof Battle !== 'undefined' && Battle.active && Battle.active.enemy) || null;
    const sp = e && e.species;
    const spPool = sp && f['attack_' + sp];
    const pool = (spPool && spPool.length) ? spPool : f.attack;
    const rare = f.attackRare;
    if (rare && rare.length && Utils.chance(5)) return Utils.pick(rare);
    return (pool && pool.length) ? Utils.pick(pool) : '你出手攻击';
  },
  victory() { return this._pick('victory'); },
  defeat() { return this._pick('defeat'); },
  tribSuccess() { return this._pick('tribSuccess'); },
  tribFail() { return this._pick('tribFail'); },
  /** 遇常驻修士时的礼数括注 */
  greet() { const f = this.flavor(); return f ? f.greet : null; },
  /** v41（E433）：观察语回归——纯取句函数（无渲染副作用，语料取自 DAO_FLAVOR.observe）。
   *  传 id 时按 id 稳定取句（同一 NPC 初遇所见之句不随重渲染漂移），缺省随机取句；
   *  江湖页 NPC 行初遇（未结识）处消费。
   *  v42（E498）：道池 × 性情池交叉取词——常驻修士按性情归类（TEMPER_CLASS，flavor-v42 载入）
   *  落性情公共池（温婉/冷厉/豪迈/癫狂/阴鸷），同 id 仍哈希稳定取句；游历打量（无 id）与
   *  未归类性情走道池原文案。 */
  observe(id) {
    const f = this.flavor();
    if (!f || !f.observe || !f.observe.length) return null;
    let pool = f.observe;
    if (id && typeof NpcSys !== 'undefined' && NpcSys.def) {
      const d = NpcSys.def(id);
      const cls = d && GameData.TEMPER_CLASS && GameData.TEMPER_CLASS[d.temper];
      const tp = cls && GameData.TEMPER_OBSERVE && GameData.TEMPER_OBSERVE[cls];
      if (tp && tp.length) pool = tp;
    }
    if (!id) return Utils.pick(pool);
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return pool[h % pool.length];
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
