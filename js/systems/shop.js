
/* ======================================================================
 * §11 商店系统
 * ====================================================================== */
const ShopSys = {
  price(itemId) {
    const def = GameData.ITEMS[itemId];
    const p = Game.player;
    const disc = Stat.compute(p).shopDiscount + (typeof SectSys !== 'undefined' && SectSys.commandActive && SectSys.commandActive(p, 'market') ? 5 : 0);   // v19 长老令·开市
    // v5：叠加坊市行情（每 30 日一茬，±20% 内波动），宗门折扣与战时涨价照旧
    // v20 修瑕：ecoPrice（符箓时价）同步作用于买价——此前只涨卖价，构成「低买高卖」印钞循环
    let base = def.price || 0;
    if (def.ecoPrice) base = Math.round(base * GameData.stoneEco(p.realmIdx));
    // v30：法宝直购价随境界微涨（相对上架境界至多三倍）——grade1-3 恒价在后期形同白菜，
    // 毕业装获取走「炼器/掉落/兑换」三线后，坊市直购保持可行但不再恒价
    if (def.type === 'artifact' && (def.grade || 0) >= 1) {
      const row = (GameData.SHOP || []).find(r => r.item === itemId);
      const minR = row ? (row.minRealm || 0) : 0;
      base = Math.round(base * Utils.clamp(1 + 0.66 * (p.realmIdx - minR), 1, 3));   // v31（E47）：线性爬坡——原 3.8^(r-minR) 恒在 r=minR+1 跳顶 3 倍，『微涨』名不副实
    }
    // v24 声望接线：名望高者坊市给面子（买价九折/九二折，劣迹昭彰者吃溢价）；卖价不受声望影响
    const repMul = (typeof RepSys !== 'undefined' && RepSys.priceMul) ? RepSys.priceMul(p) : 1;
    // v33（E91）：灵疫当年药价腾贵（丹药与灵药材 ×1.15；卖价同乘，ratio 不变无套利口）
    const drug = (def.type === 'pill' || WorldSys.isHerb(itemId)) ? WorldSys.herbMul(p) : 1;
    return Math.max(1, Math.round(base * (1 - disc / 100) * WorldSys.priceMul(p) * WorldSys.marketMul(p, itemId) * repMul * drug));
  },
  sellPrice(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    let base = def.price || 0;
    // 符箓为时价之物：随境界经济浮动
    if (def.ecoPrice) base = Math.round(base * GameData.stoneEco(p.realmIdx));
    let v = Math.max(1, Math.floor(base * 0.45));   // v32（E16）：卖价基数 0.4→0.45 微补偿——获取加成自此不吃卖价（斩断倒卖套利）
    // 丹道：出售丹药价格提升两成五
    if (p.dao === 'pill' && def.type === 'pill') v = Math.round(v * 1.25);
    if (p.dao === 'pill' && def.type === 'pill' && DaoSys.tierLevel(p) >= 2) v = Math.round(v * 1.15);   // v10 丹道六境·药理境
    // v29 修瑕：卖价同吃坊市行情——两侧乘数同源后即时倒卖必亏，跨行情低买高卖成为正经营生
    // v32 修瑕（E16）：成交款走原额入账——原经 Bag.addStones 再叠道心/个人线/stonePct 获取链
    // （成型档实测卖侧 ≈0.856×base vs 买侧 ≈0.78×base，买→立即卖 +9.7%/循环零耗时无限刷）
    const drug = (def.type === 'pill' || WorldSys.isHerb(itemId)) ? WorldSys.herbMul(p) : 1;   // v33（E91）：药价腾贵两侧同乘
    return Math.max(1, Math.round(v * WorldSys.priceMul(p) * WorldSys.marketMul(p, itemId) * drug));
  },
  buy(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    const cost = this.price(itemId);
    if (def.type === 'gongfa' && (p.gongfa[itemId] || p.bag[itemId])) { UI.toast('你已修习或已藏有此功法'); return; }   // v29 修瑕：补背包判重
    if (def.type === 'gongfa' && !DaoSys.canLearnGongfa(p, def)) return; // 体修难悟高阶法诀
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    Bag.addItem(itemId, 1);
    Log.add(`你购得 <b>${def.name}</b>，花费 ${Utils.fmtNum(cost)} 下品灵石。`, 'info');
    Game.afterAction();
  },
  /** v23 批量购买：逐次按当前市价扣款，灵石不足自动停（功法仍宜单购，此处仅兜底） */
  buyMulti(itemId, times = 5) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    if (!def) return;
    let bought = 0, spent = 0;
    for (let i = 0; i < times; i++) {
      if (def.type === 'gongfa' && (p.gongfa[itemId] || p.bag[itemId])) break;
      const cost = this.price(itemId);
      if (!Bag.spendStones(cost)) break;
      Bag.addItem(itemId, 1);
      bought++; spent += cost;
    }
    if (!bought) { UI.toast('灵石不足——一件也未买成'); return; }
    Log.add(`你连买了 ${bought} 件<b>${def.name}</b>，共花费 ${Utils.fmtNum(spent)} 下品灵石。${bought < times ? '（灵石不济，止步于此）' : ''}`, 'info');
    Game.afterAction();
  },
  async sell(itemId, all = false) {
    const qty = all ? Bag.count(itemId) : 1;
    if (qty <= 0) return;
    const def = GameData.ITEMS[itemId];
    const gain = this.sellPrice(itemId) * qty;
    // v24 确认统一：全售须二次确认（售一不弹）
    if (all) {
      const ok = await UI.popup({
        title: '全售确认',
        html: `将把 <b>${def.name}</b> ×${qty} 全数售予坊市，合计 <b class="hl">${Utils.fmtNum(gain)}</b> 下品灵石。<br><span class="neg">售出之物概不赎回。</span>`,
        options: [{ text: '全 部 售 出', value: true, primary: true }, { text: '再想想', value: false }],
      });
      if (!ok) return;
    }
    Bag.removeItem(itemId, qty);
    Bag.addStonesRaw(gain);   // v32 修瑕（E16）：出售款原额入账，不吃灵石获取加成（「获取加成」语义收窄为战斗/事件掉落）
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
    Bag.addStonesRaw(gain);   // v32 修瑕（E16）：同坊市出售——原额入账
    Log.add(`你将凡品杂物打包售予坊市（${count} 件），得 <b>${Utils.fmtNum(gain)}</b> 下品灵石。`, 'gain');
    Game.afterAction();
  },
};
