
/* ======================================================================
 * §21 百艺坊 CraftSys（炼丹 / 画符）
 * ====================================================================== */
const CraftSys = {
  /** v18：火候选择（影响成丹率与品质） */
  FIRES: {
    wen: { name: '文火', key: 0, desc: '文火慢煨，药性绵长（成丹率+5%）' },
    wu: { name: '武火', key: 1, desc: '武火急攻，药力霸道（成丹率-3%，上品率+10%）' },
    both: { name: '文武交替', key: 2, desc: '文武轮转，火候最正（若配方契合，成丹率+12%）' },
  },
  /** 火候与配方契合度 */
  fireMatch(p, recipe, fire) {
    const t = (p.dao === 'pill' && DaoSys.tierLevel(p) >= 3) ? 30 : 0; // 丹火境可辨火候
    if (fire === 'both' && Utils.chance(35 + t)) return 12; // 契合：+12%
    if (fire === 'wen') return 5;
    if (fire === 'wu') return -3;
    return 0;
  },
  /** 成丹率：基础 × 丹道1.6 + 气运微助 + 火候 */
  rate(p, recipe, fire = null) {
    let r = recipe.rate;
    if (p.dao === 'pill') r *= 1.6;
    if (p.dao === 'pill' && DaoSys.tierLevel(p) >= 1) r += 10;
    r += Utils.clamp((p.fortune || 0) * 0.1, 0, 15);
    if (fire) r += this.fireMatch(p, recipe, fire);
    if (p.dao === 'pill' && DaoSys.tierLevel(p) >= 6) return Utils.clamp(r, 40, 95);
    return Utils.clamp(r, 5, 95);
  },
  /** v18：丹药品质判定（上品/极品） */
  rollQuality(p, recipe) {
    let sup = 6, supreme = 1;
    if (p.dao === 'pill' && DaoSys.tierLevel(p) >= 4) { sup = 12; supreme = 2; } // 炉火纯青
    if (Utils.chance(supreme)) return 'supreme';
    if (Utils.chance(sup)) return 'superior';
    return 'normal';
  },
  haveMats(p, recipe) {
    return Object.entries(recipe.need).every(([id, n]) => Bag.count(id) >= n);
  },
  /** 炼丹：耗药材，赌成丹；times>1 为批量连炉（药材不足自动停炉，汇总一行结算）
   *  v18：火候选择 + 品质判定 */
  alchemy(recipeId, times = 1) {
    const p = Game.player;
    const r = GameData.ALCHEMY_RECIPES.find(x => x.id === recipeId);
    if (!r) return;
    times = Utils.clamp(Math.floor(Number(times)) || 1, 1, 99);
    // 单炉时弹出火候选择
    let fire = null;
    if (times === 1) {
      // 火候选择在渲染时已通过按钮传入
    }
    const rate = this.rate(p, r, fire);
    const out = GameData.ITEMS[r.out];
    let tried = 0, made = 0, critN = 0, supN = 0, supremeN = 0;
    const gainMap = {};
    while (tried < times) {
      if (!this.haveMats(p, r)) break;
      for (const [id, n] of Object.entries(r.need)) Bag.removeItem(id, n);
      p.counters.crafts = (p.counters.crafts || 0) + 1;
      Time.add(2);
      tried++;
      if (p.dead) break;
      if (Utils.chance(rate)) {
        DaoSys.gain(p, 25);
        const isCrit = Utils.chance(p.dao === 'pill' && DaoSys.tierLevel(p) >= 4 ? 15 : 10);
        const qty = isCrit ? 2 : 1;
        Bag.addItem(r.out, qty);
        p.counters.craftsOk = (p.counters.craftsOk || 0) + 1;
        DaoSys.gain(p, 8);
        made += qty;
        if (isCrit) critN++;
        // v18：品质判定
        const qual = this.rollQuality(p, r);
        if (qual === 'supreme') { supremeN++; }
        else if (qual === 'superior') { supN++; }
        gainMap[r.out] = (gainMap[r.out] || 0) + qty;
      }
    }
    if (!tried) { UI.toast('药材不足'); return; }
    if (times === 1 && tried === 1) {
      // 单炉：保持原有文案
      if (made) {
        Log.add(`丹炉青烟直上，一缕丹香盈野——<b>${out.name}</b> ×${made} 出炉！${critN ? '（丹成上品，一炉双丹！）' : `（成丹率 ${rate.toFixed(0)}%）`}`, 'gain');
      } else {
        Log.add(`丹炉一声闷响，药力尽数散作飞灰……（药材已耗，成丹率 ${rate.toFixed(0)}%）`, 'loss');
      }
    } else {
      const parts = Object.entries(gainMap).map(([id, n]) => `${GameData.ITEMS[id].name} ×${n}`);
      Log.add(`你连开 ${tried} 炉：${made ? `成丹 ${parts.join('、')}${critN ? `（含上品双丹 ×${critN}）` : ''}` : '药材尽毁，未得丹药'}。（成丹率 ${rate.toFixed(0)}%）`, made ? 'gain' : 'loss');
    }
    Game.afterAction();
  },
  drawCost(p) { return Math.round(40 * GameData.stoneEco(p.realmIdx)); },
  /** 画符（符修专属）：耗灵石出符，可自用可售卖 */
  /** 画符（符修专属）：耗灵石出符，可自用可售卖；v13 起随境界逐步解锁新符箓
   *  v18：每日画符成本递增（首次 1×，每轮 +50%，最多 5 倍），防止印钞 */
  drawTalisman() {
    const p = Game.player;
    if (p.dao !== 'talisman') return;
    // v18：当日画符次数累加（每日重置）
    const today = Math.floor(p.day);
    if (p._drawDay !== today) { p._drawDay = today; p._drawCount = 0; }
    p._drawCount = (p._drawCount || 0) + 1;
    const costMult = 1 + Math.min(4, (p._drawCount - 1) * 0.5);
    const cost = Math.round(this.drawCost(p) * costMult);
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足，置不起朱砂灵纸'); return; }
    Time.add(1);
    let qty = 2 + Utils.rand(0, 2) + (p.realmIdx >= 2 ? 1 : 0) + (DaoSys.tierLevel(p) >= 1 ? 1 : 0);   // v10 符道三境·描符境
    if (Utils.chance(p.dao === 'talisman' && DaoSys.tierLevel(p) >= 2 ? 20 : 12)) qty *= 2;   // v10 符道六境·朱砂境
    if (DaoSys.tierLevel(p) >= 6) qty += 2;   // v10 符道六境·符仙境
    // v13 符池：随境界解锁高阶符箓
    const pool = ['tal_huoshe', 'tal_zilei'];
    if (p.realmIdx >= 1) pool.push('tal_jinguang', 'tal_jifengfu');
    if (p.realmIdx >= 2) pool.push('tal_fuling', 'tal_shigu');
    if (p.realmIdx >= 3) pool.push('tal_bingpo');
    if (p.realmIdx >= 4) pool.push('tal_posha');
    const out = {};
    for (let i = 0; i < qty; i++) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      out[pick] = (out[pick] || 0) + 1;
    }
    for (const [id, n] of Object.entries(out)) if (n) Bag.addItem(id, n);
    if (p.dao === 'talisman') DaoSys.gain(p, qty * 4);   // v16 符道：画符
    const parts = Object.entries(out).map(([id, n]) => `${GameData.ITEMS[id].name} ×${n}`);
    Log.add(`你焚香沐手，朱砂勾雷文、灵纸蕴符罡——成符 ${parts.join('、')}！`, 'gain');
    Game.afterAction();
  },
};
