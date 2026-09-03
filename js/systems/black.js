
/* ======================================================================
 * §11.9 v13 黑市 BlackSys（每月开市三日：暗巷奇货 / 高价收购 / 福缘陷阱）
 * 开市规则：游戏日内 day % 30 < 3；货物按日哈希确定性生成。
 * 陷阱货：来路不明的超低价——福缘高者捡漏，福缘低者破财。
 * ====================================================================== */
const BlackSys = {
  isOpen(p) { return Math.floor(p.day || 0) % 30 < 3; },
  daysLeft(p) { return 3 - Math.floor(p.day % 30); },
  POOL: [
    { id: 'm_qianghua', w: 16 }, { id: 'm_neidan', w: 14 }, { id: 'seed_xuelian', w: 10 },
    { id: 'seed_lianhun', w: 10 }, { id: 'm_xingchen', w: 8 }, { id: 'm_huolin', w: 12 },
    { id: 'tal_bingpo', w: 10 }, { id: 'tal_posha', w: 8 }, { id: 'pill_xuanling', w: 10 },
    { id: 's_cx_gou', w: 5 }, { id: 's_xt_pei', w: 5 }, { id: 'gf_feixian', w: 5 },
    { id: 'm_bingpo', w: 12 }, { id: 'seed_xingchen', w: 4 }, { id: 'm_xuecan', w: 10 },
  ],
  /** 暗巷货（确定性哈希）：今日四件货物 */
  goods(p) {
    const day = Math.floor(p.day);
    const seed = Utils.hashStr('black' + day);
    const out = [];
    const used = new Set();
    for (let i = 0; i < 4; i++) {
      let h = Utils.hashStr('b' + seed + ':' + i) % this.POOL.length;
      let guard = 0;
      while (used.has(this.POOL[h].id) && guard++ < 20) h = (h + 1) % this.POOL.length;
      const g = this.POOL[h];
      used.add(g.id);
      out.push(g.id);
    }
    return out;
  },
  /** 黑市售价：基准 × 1.6 × 境界经济（材料类随行情） */
  price(p, id) {
    const def = GameData.ITEMS[id];
    let base = def.price || 500;
    if (def.ecoPrice) base = Math.round(base * GameData.stoneEco(p.realmIdx));
    return Math.max(1, Math.round(base * 1.6));
  },
  buy(id) {
    const p = Game.player;
    this.buyAsync(id, this.price(p, id));
  },
  async buyAsync(id, cost) {
    const p = Game.player;
    const def = GameData.ITEMS[id];
    const first = await UI.popup({
      title: '黑市 · 暗巷交易',
      html: `「识货的道友——」蒙面商贾掀开布角：<br><b>${def.name}</b><br>${def.desc}<br>索价 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石（坊市价高六成）。<br><span class="tip-line">· 亦可试着还价——成算视悟性与福缘而定，触怒了商人可是要涨价的。</span>`,
      options: [
        { text: '买 下', value: 'buy', primary: true },
        { text: '讨价还价', value: 'haggle' },
        { text: '摇头离去', value: 'leave' },
      ],
    });
    if (!first || first === 'leave') return;
    if (first === 'haggle') {
      // v19 讨价还价：悟性/福缘判定
      const rate = Utils.clamp(20 + p.attrs.comp * 4 + p.attrs.luck * 4, 10, 75);
      if (Utils.chance(rate)) {
        cost = Math.round(cost * 0.75);
        Log.add(`你巧舌如簧，蒙面商贾咬牙认了——索价降至 <b>${Utils.fmtNum(cost)}</b> 灵石。`, 'gain');
      } else {
        cost = Math.round(cost * 1.15);
        Log.add(`还价触怒了商贾——「不识抬举！」索价涨至 <b>${Utils.fmtNum(cost)}</b> 灵石。`, 'warn');
      }
    }
    const ok = await UI.popup({
      title: '黑市 · 暗巷交易',
      html: `【${def.name}】最终索价 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石。`,
      options: [{ text: '成交', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    Bag.addItem(id, 1);
    Log.add(`你在暗巷购得 <b>${def.name}</b>，花费 ${Utils.fmtNum(cost)} 灵石。蒙面人转身没入黑暗。`, 'info');
    Game.afterAction();
  },
  /** 陷阱货：超低价的「来路不明」之物 */
  async buyMystery() {
    const p = Game.player;
    const day = Math.floor(p.day);
    if ((p.mysteryDay || -1) === day) { UI.toast('今日的便宜货你已看过，无利可图'); return; }
    const cost = Math.round(200 * GameData.stoneEco(p.realmIdx));
    const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 1, 1, 4);
    const mat = Utils.pick(GameData.matsByTier(tier));
    const ok = await UI.popup({
      title: '来路不明的储物袋',
      html: `巷角有一个血渍未干的储物袋，摊主开价 <span class="hl">${Utils.fmtNum(cost)}</span> 灵石——袋里似有<b>${GameData.ITEMS[mat].name}</b>的光泽。<br><span class="neg">福缘高者或可捡漏，福缘低者……恐怕要破财免灾。</span>`,
      options: [{ text: '赌一手', value: true }, { text: '不碰晦气', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    p.mysteryDay = day;
    const luck = p.attrs.luck + Math.floor((p.fortune || 0) / 20);
    const roll = Math.random() * 100;
    if (roll < 25 + luck * 4) {
      Bag.addItem(mat, 2);
      Bag.addItem('m_gupian', 1);
      Log.add(`你赌对了！袋中竟是${GameData.ITEMS[mat].name} ×2，夹层里还藏着一枚上古法宝碎片——今日的运气，值了。`, 'gain');
      Ambience.sfx('rare');
    } else if (roll < 60) {
      Bag.addItem(mat, 1);
      Log.add(`袋中确有${GameData.ITEMS[mat].name} ×1，不算亏，也不算赚。`, 'info');
    } else {
      KarmaSys.addKarma(4, true);
      const fine = Math.round(100 * GameData.stoneEco(p.realmIdx));
      if (p.stones.low >= fine) p.stones.low -= fine;
      Log.add(`袋中只有几块破布——这是一桩栽赃的买卖！失主寻来，你只得赔钱了事：灵石 -${Utils.fmtNum(fine)}，还沾了一身晦气（孽障 +4）。`, 'loss');
      UI.toast('破财免灾……', true);
    }
    Game.afterAction();
  },
};
