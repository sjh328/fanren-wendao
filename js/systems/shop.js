
/* ======================================================================
 * §11 商店系统
 * ====================================================================== */
const ShopSys = {
  price(itemId) {
    const def = GameData.ITEMS[itemId];
    const p = Game.player;
    const disc = Stat.compute(p).shopDiscount + (typeof SectSys !== 'undefined' && SectSys.commandActive && SectSys.commandActive(p, 'market') ? 5 : 0);   // v19 长老令·开市
    // v5：叠加坊市行情（每 30 日一茬，±20% 内波动），宗门折扣与战时涨价照旧
    return Math.max(1, Math.round((def.price || 0) * (1 - disc / 100) * WorldSys.priceMul(p) * WorldSys.marketMul(p, itemId)));
  },
  sellPrice(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    let base = def.price || 0;
    // 符箓为时价之物：随境界经济浮动
    if (def.ecoPrice) base = Math.round(base * GameData.stoneEco(p.realmIdx));
    let v = Math.max(1, Math.floor(base * 0.4));
    // 丹道：出售丹药价格提升五成
    if (p.dao === 'pill' && def.type === 'pill') v = Math.round(v * 1.5);
    if (p.dao === 'pill' && def.type === 'pill' && DaoSys.tierLevel(p) >= 2) v = Math.round(v * 1.25);   // v10 丹道六境·药理境
    return Math.max(1, Math.round(v * WorldSys.priceMul(p)));
  },
  buy(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    const cost = this.price(itemId);
    if (def.type === 'gongfa' && p.gongfa[itemId]) { UI.toast('你已修习此功法'); return; }
    if (def.type === 'gongfa' && !DaoSys.canLearnGongfa(p, def)) return; // 体修难悟高阶法诀
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    Bag.addItem(itemId, 1);
    Log.add(`你购得 <b>${def.name}</b>，花费 ${Utils.fmtNum(cost)} 下品灵石。`, 'info');
    Game.afterAction();
  },
  sell(itemId, all = false) {
    const qty = all ? Bag.count(itemId) : 1;
    if (qty <= 0) return;
    const def = GameData.ITEMS[itemId];
    const gain = this.sellPrice(itemId) * qty;
    Bag.removeItem(itemId, qty);
    Bag.addStones(gain);
    Log.add(`你售出 ${def.name} ×${qty}，得 ${Utils.fmtNum(gain)} 下品灵石。`, 'gain');
    Game.afterAction();
  },
  convert(dir) {
    const s = Game.player.stones;
    const tryOp = (cond, fn, msg) => {
      if (cond) { fn(); Log.add(msg, 'info'); }
      else UI.toast('灵石不足，无法兑换');
    };
    if (dir === 'up1') tryOp(s.low >= 100, () => { s.low -= 100; s.mid++; }, '你将一百下品灵石兑换为一枚中品灵石。');
    if (dir === 'down1') tryOp(s.mid >= 1, () => { s.mid--; s.low += 100; }, '你将一枚中品灵石兑换为一百下品灵石。');
    if (dir === 'up2') tryOp(s.mid >= 100, () => { s.mid -= 100; s.high++; }, '你将一百中品灵石兑换为一枚上品灵石。');
    if (dir === 'down2') tryOp(s.high >= 1, () => { s.high--; s.mid += 100; }, '你将一枚上品灵石兑换为一百中品灵石。');
    Game.afterAction();
  },
  /* ---------- v4 一键减负：凡品清理 ---------- */
  /** 背包中可按「凡品」打包出售的物品：凡级（grade 0）装备 + 一阶（tier 1）材料 */
  commonSaleList() {
    const p = Game.player;
    if (!p) return [];
    return Object.keys(p.bag).filter(id => {
      const d = GameData.ITEMS[id];
      if (!d) return false;
      if (d.type === 'artifact') return (d.grade || 0) === 0;
      if (d.type === 'material') return (d.tier || 0) <= 1;
      return false;
    }).map(id => {
      const qty = p.bag[id];
      const each = this.sellPrice(id);
      return { id, name: GameData.ITEMS[id].name, qty, each, sum: each * qty };
    });
  },
  /** 一键出售凡品：确认后打包售予坊市 */
  async sellCommon() {
    const rows = this.commonSaleList();
    if (!rows.length) { UI.toast('背包中没有可出售的凡品杂物'); return; }
    const total = rows.reduce((s, r) => s + r.sum, 0);
    const count = rows.reduce((s, r) => s + r.qty, 0);
    const ok = await UI.popup({
      title: '一键出售凡品',
      html: `将把以下凡级装备与一阶材料打包售予坊市：<br>
        ${rows.map(r => `· ${r.name} ×${r.qty}（${Utils.fmtNum(r.sum)} 灵石）`).join('<br>')}<br><br>
        共 ${count} 件，合计可得 <b class="hl">${Utils.fmtNum(total)}</b> 下品灵石。`,
      options: [{ text: '打包出售', value: true, primary: true }, { text: '再想想', value: false }],
    });
    if (!ok) return;
    let gain = 0;
    for (const r of rows) { Bag.removeItem(r.id, r.qty); gain += r.sum; }
    Bag.addStones(gain);
    Log.add(`你将凡品杂物打包售予坊市（${count} 件），得 <b>${Utils.fmtNum(gain)}</b> 下品灵石。`, 'gain');
    Game.afterAction();
  },
};
