
/* ======================================================================
 * §21 百艺坊 CraftSys（炼丹 / 画符）
 * ====================================================================== */
const CraftSys = {
  /** v26：当前选中火候（null=平火随心；会话级选择，单炉生效，连炉不受影响） */
  _fire: null,
  setFire(f) {
    this._fire = (f && this.FIRES[f]) ? f : null;
    UI.markDirty('content');
    UI.renderAll();
  },
  /** v18：火候选择（影响成丹率与品质）；v26 起拥有炼制坊内联入口 */
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
  /** 成丹率：基础 × 丹道1.6 + 气运微助 + 洞府炼丹房 + 火候
   *  v27 联动：洞府等级（炼丹房）+5%/级成丹率——此前 CaveSys.pillBonus 定义了却从未被调用 */
  rate(p, recipe, fire = null) {
    let r = recipe.rate;
    if (p.dao === 'pill') r *= 1.6;
    if (p.dao === 'pill' && DaoSys.tierLevel(p) >= 1) r += 10;
    r += Utils.clamp((p.fortune || 0) * 0.1, 0, 15);
    if (typeof CaveSys !== 'undefined' && CaveSys.pillBonus) r += CaveSys.pillBonus(p);
    if (p.sect && p.sect.faction === 'danding') r += 8;   // v36（E226）：丹鼎阁派系 perk——炼丹成丹率 +8%
    if ((p.poison || 0) > Stat.poisonCap(p) * 0.5) r -= 5;   // v28 联动：手有浮毒，丹火不稳（丹毒过半成丹率 -5）
    if (fire) r += this.fireMatch(p, recipe, fire);
    if (p.dao === 'pill' && DaoSys.tierLevel(p) >= 6) return Utils.clamp(r, 40, 95);
    return Utils.clamp(r, 5, 95);
  },
  /** v18：丹药品质判定（上品/极品）；v27 修瑕：武火「上品率 +10%」此前从未实现 */
  rollQuality(p, recipe, fire = null) {
    let sup = 6, supreme = 1;
    if (p.dao === 'pill' && DaoSys.tierLevel(p) >= 4) { sup = 12; supreme = 2; } // 炉火纯青
    if (fire === 'wu') sup += 10;
    if (Utils.chance(supreme)) return 'supreme';
    if (Utils.chance(sup)) return 'superior';
    return 'normal';
  },
  haveMats(p, recipe) {
    return Object.entries(recipe.need).every(([id, n]) => Bag.count(id) >= n);
  },
  /** 炼丹：耗药材，赌成丹；times>1 为批量连炉（药材不足自动停炉，汇总一行结算）
   *  v18：火候选择 + 品质判定 */
  /** v19 失传丹方参悟：集齐残页即可永久解锁配方 */
  async studyRecipe(recipeId) {
    const p = Game.player;
    const r = GameData.ALCHEMY_RECIPES.find(x => x.id === recipeId);
    if (!r || !r.needPages) return;
    p.flags = p.flags || {};
    if ((p.flags.recipeOk || {})[r.id]) { UI.toast('此丹方早已参悟'); return; }
    const have = Bag.count('m_danfang');
    if (have < r.needPages) { UI.toast(`残页不足（${have}/${r.needPages}）`); return; }
    const out = GameData.ITEMS[r.out];
    const ok = await UI.popup({
      title: `参悟失传丹方 · ${out.name}`,
      html: `以 ${r.needPages} 页【丹方残页】互校补全，失传的炼法在炉火中重新亮起。<br>参悟后可永久炼制【<b>${out.name}</b>】。`,
      options: [{ text: '参 悟', value: true, primary: true }, { text: '再凑凑', value: false }],
    });
    if (!ok) return;
    Bag.removeItem('m_danfang', r.needPages);
    p.flags.recipeOk = p.flags.recipeOk || {};
    p.flags.recipeOk[r.id] = true;
    const insGain = p.sect && p.sect.faction === 'cangjing' ? Math.round(6 * 1.15) : 6;   // v36（E226）：藏经楼派系 perk——参悟所得 +15%（6→7）
    Cultivate.addInsight(p, insGain, false);   // v37（E264）：感悟增发收口单源（参悟残页=外源感悟）
    Log.add(`你将 ${r.needPages} 页残稿拼合推演——失传丹方【<b>${out.name}</b>】重见天日！（突破感悟 +${insGain}）`, 'realm');
    UI.announce(`✦ 丹方重光 · ${out.name} ✦`, 'gold');
    Story.chron(`参悟失传丹方「${out.name}」`);
    Ambience.sfx('rare');
    Game.afterAction();
  },
  alchemy(recipeId, times = 1) {
    const p = Game.player;
    const r = GameData.ALCHEMY_RECIPES.find(x => x.id === recipeId);
    if (!r) return;
    // v19 失传丹方：须先以残页参悟
    if (r.needPages && !(p.flags.recipeOk || {})[r.id]) { UI.toast('此丹方失传——需先集齐丹方残页参悟'); return; }
    times = Utils.clamp(Math.floor(Number(times)) || 1, 1, 99);
    // v26：单炉按炼制坊当前选中火候行火（连炉保持平火，批量收益不受赌博式火候影响）
    const fire = times === 1 ? (this._fire || null) : null;
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
        // v27 修瑕：品质先判定、翻倍后入包——此前极品在 addItem 之后才 ×2，袋中只得一枚、日志却按两枚记账
        const qual = this.rollQuality(p, r, fire);
        let qty = isCrit ? 2 : 1;   // v26：极品翻倍需要可变（原 const 与 ×2 冲突）
        if (qual === 'supreme') { supremeN++; qty *= 2; DaoSys.gain(p, 10); }
        else if (qual === 'superior') { supN++; DaoSys.gain(p, 5); }
        Bag.addItem(r.out, qty);
        p.counters.craftsOk = (p.counters.craftsOk || 0) + 1;
        DaoSys.gain(p, 8);
        made += qty;
        if (isCrit) critN++;
        gainMap[r.out] = (gainMap[r.out] || 0) + qty;
      }
    }
    if (!tried) { UI.toast('药材不足'); return; }
    const fireTxt = fire ? `（${this.FIRES[fire].name}）` : '';
    if (times === 1 && tried === 1) {
      // 单炉：保持原有文案 + v26 火候/品质注记
      if (made) {
        const qualTxt = supremeN ? '【极品】丹光凝而不散！' : (critN ? '（丹成上品，一炉双丹！）' : (supN ? '（上品，药香清正）' : `（成丹率 ${rate.toFixed(0)}%）`));
        Log.add(`丹炉青烟直上，一缕丹香盈野——<b>${out.name}</b> ×${made} 出炉！${qualTxt}${fireTxt}`, 'gain');
      } else {
        Log.add(`丹炉一声闷响，药力尽数散作飞灰……（药材已耗，成丹率 ${rate.toFixed(0)}%）${fireTxt}`, 'loss');
      }
    } else {
      const parts = Object.entries(gainMap).map(([id, n]) => `${GameData.ITEMS[id].name} ×${n}`);
      const qualBits = [critN ? `上品双丹 ×${critN}` : '', supN ? `上品 ×${supN}` : '', supremeN ? `极品 ×${supremeN}` : ''].filter(Boolean).join('、');
      Log.add(`你连开 ${tried} 炉：${made ? `成丹 ${parts.join('、')}${qualBits ? `（${qualBits}）` : ''}` : '药材尽毁，未得丹药'}。（成丹率 ${rate.toFixed(0)}%）`, made ? 'gain' : 'loss');
    }
    Game.afterAction();
  },
  /** v35（E128）：画符成本挂预期产出单源定价——原 40×eco 固定成本对符池严重脱钩：
   *  r4+ 符池 8 种均价 75.4、产量期望 8 张，变现 271×eco，单击净赚 231×eco/日（≈11~15 场战斗收入）；
   *  且 v18 的同日成本阶梯被 Time.add(1) 每画推进一日、_drawCount 恒归零，防印钞设计结构性失效。
   *  现按「符池均价 × 期望产量EV × 0.55 × stoneEco」定价：倒卖期望约 -18% 归负，
   *  自用（符箓战斗爆发价值远高于面值）依旧划算——画符回归「符修的核心产出」而非印钞机。 */
  talismanPool(p) {
    const pool = ['tal_huoshe', 'tal_zilei'];
    if (p.realmIdx >= 1) pool.push('tal_jinguang', 'tal_jifengfu');
    if (p.realmIdx >= 2) pool.push('tal_fuling', 'tal_shigu');
    if (p.realmIdx >= 3) pool.push('tal_bingpo');
    if (p.realmIdx >= 4) pool.push('tal_posha');
    return pool;
  },
  /** 期望产量（与 drawTalisman 实发逐项同源：rand(0,2) 取均值 1；v36（E224）补仲夏期望——
   *  91/365 摊入避免 drawCost 逐日跳变；drawTalisman 实发仲夏 +2 不动（v20 天时风味），定价把权重算进去） */
  expectedQty(p) {
    let q = 3 + (p.realmIdx >= 2 ? 1 : 0) + (DaoSys.tierLevel(p) >= 1 ? 1 : 0);
    q *= 1 + (DaoSys.tierLevel(p) >= 2 ? 0.2 : 0.12);   // 朱砂境 20% 翻倍（此前 12%）
    if (DaoSys.tierLevel(p) >= 6) q += 2;   // 符仙境 +2（在翻倍后追加）
    q += (typeof Art !== 'undefined' && Art.seasonOf(p) === 1 ? 2 * 91 / 365 : 0);   // v36（E224）：仲夏窗口 91/365 摊入期望——E128「成本与实发同源」的季节缺口补齐
    return q;
  },
  drawCost(p) {
    const pool = this.talismanPool(p);
    const avg = pool.reduce((s2, id) => s2 + (GameData.ITEMS[id].price || 0), 0) / Math.max(1, pool.length);
    return Math.max(40, Math.round(this.expectedQty(p) * avg * 0.55 * GameData.stoneEco(p.realmIdx)));
  },
  /** 同日连画阶梯（1×→5×）：一次画符即推进一日，实际仅在极窄窗口生效，保留以防未来时耗改动 */
  drawMult(p) { return 1 + Math.min(4, (p._drawCount || 0) * 0.75); },
  /** UI 显示价（成本 × 当日阶梯） */
  drawPrice(p) { return Math.round(this.drawCost(p) * this.drawMult(p)); },
  /** 画符（符修专属）：耗灵石出符，可自用可售卖 */
  /** 画符（符修专属）：耗灵石出符，可自用可售卖；v13 起随境界逐步解锁新符箓
   *  v18：每日画符成本递增（首次 1×，每轮 +50%，最多 5 倍），防止印钞 */
  drawTalisman() {
    const p = Game.player;
    if (p.dao !== 'talisman') return;
    // v18：当日画符次数累加（每日重置）
    const today = Math.floor(p.day);
    if (p._drawDay !== today) { p._drawDay = today; p._drawCount = 0; }
    // v31 修瑕（E38）：扣款成功后才计数——原失败（灵石不足）也烧当日档位与成就轮次，
    // 且把当日成本系数推高一档；显示价与实收同步（原按钮恒显首档价）
    const costMult = 1 + Math.min(4, (p._drawCount || 0) * 0.75);
    const cost = Math.round(this.drawCost(p) * costMult);
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足，置不起朱砂灵纸'); return; }
    p._drawCount = (p._drawCount || 0) + 1;
    p.counters.talRounds = (p.counters.talRounds || 0) + 1;   // v27 修瑕：画符轮次从未计数，成就「画符千张」永不可解锁
    Time.add(1);
    let qty = 2 + Utils.rand(0, 2) + (p.realmIdx >= 2 ? 1 : 0) + (DaoSys.tierLevel(p) >= 1 ? 1 : 0);   // v10 符道三境·描符境
    if (typeof Art !== 'undefined' && Art.seasonOf(p) === 1) qty += 2;   // v20 仲夏雷雨：朱砂易引雷，成符 +2
    if (Utils.chance(p.dao === 'talisman' && DaoSys.tierLevel(p) >= 2 ? 20 : 12)) qty *= 2;   // v10 符道六境·朱砂境
    if (DaoSys.tierLevel(p) >= 6) qty += 2;   // v10 符道六境·符仙境
    // v13 符池：随境界逐步解锁高阶符箓（v35（E128）抽单源 talismanPool——成本定价与实发同池）
    const pool = this.talismanPool(p);
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
