
/* ======================================================================
 * §11.9 v19 拍卖行 AuctionSys（每六十日一件稀有拍品，三档出价博弈）
 * ====================================================================== */
const AuctionSys = {
  LOT_POOL: [
    { item: 's_hj_sha', base: 16000 }, { item: 's_hj_pao', base: 15000 }, { item: 's_hj_ling', base: 14000 },
    { item: 's_xy_jian', base: 30000 }, { item: 's_xy_ling', base: 28000 },
    { item: 'gf_zhoutian', base: 6000 }, { item: 'gf_leishen', base: 9000 },
    { item: 'gf_hunyuan', base: 9000 }, { item: 'gf_niepan', base: 9000 },
    { item: 'w_sanqing', base: 12000 }, { item: 'pill_zaohua', base: 15000 },
    { item: 'gf_dayan', base: 12000 }, { item: 'm_gupian', base: 10000 },
    { item: 'gf_wangchen', base: 15000 }, { item: 'gf_feixian', base: 15000 },
  ],
  PERIOD: 60,
  state(p) {
    const day = Math.floor(p.day || 0);
    if (!p.auction || p.auction.until < day) {
      const lot = this.LOT_POOL[Utils.hashStr('auction@' + day) % this.LOT_POOL.length];
      p.auction = { item: lot.item, base: Math.round(lot.base * GameData.stoneEco(Math.min(4, p.realmIdx)) / GameData.stoneEco(2)), until: day + this.PERIOD };
    }
    return p.auction;
  },
  async bid(mode) {
    const p = Game.player;
    const a = this.state(p);
    const def = GameData.ITEMS[a.item];
    // 三档：稳健 ×1.15 必成九成五 / 激进 ×0.9 六成 / 天价 ×1.6 必成
    const opts = {
      steady: { mul: 1.15, rate: 95, label: '稳健出价' },
      bold: { mul: 0.9, rate: 60, label: '激进出价' },
      dump: { mul: 1.6, rate: 100, label: '天价收购' },
    }[mode];
    if (!opts) return;
    const price = Math.round(a.base * opts.mul);
    const ok = await UI.popup({
      title: `竞拍 · ${def.name}`,
      html: `${def.desc}<br>底价 <span class="hl">${Utils.fmtNum(a.base)}</span> 灵石。<br>
        【${opts.label}】出价 <b>${Utils.fmtNum(price)}</b> 灵石，成算约 <b>${opts.rate}%</b>${opts.rate < 100 ? '；落标则灵石原路退回' : ''}。<br>
        拍期还剩 ${a.until - Math.floor(p.day)} 日。`,
      options: [{ text: '落 槌', value: true, primary: true }, { text: '再看看', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(price)) { UI.toast('灵石不足'); return; }
    const win = Utils.chance(opts.rate);
    if (win) {
      Bag.addItem(a.item, 1);
      Log.add(`拍卖行落槌——【<b>${def.name}</b>】归你所有！（出价 ${Utils.fmtNum(price)} 灵石）`, 'gain');
      UI.announce('✦ 竞拍得手 · ' + def.name + ' ✦', 'gold');
      Story.chron(`拍卖行竞得「${def.name}」`);
      p.auction.until = 0;   // 本期拍品易主，刷新下一件
      Ambience.sfx('rare');
    } else {
      Bag.addStones(price);
      Log.add(`竞价失利——有人以更高价截胡。灵石已原路退回。`, 'warn');
    }
    Game.afterAction();
  },
};

/* ======================================================================
 * §11.10 v19 布施 Donate（散财消业：声望↑ 气运↑ 孽障↓）
 * ====================================================================== */
const DonateSys = {
  TIERS: [
    { id: 'small',  name: '施粥舍药', stones: 500,    rep: 2,  fortune: 1, karma: -1 },
    { id: 'mid',    name: '修桥筑观', stones: 5000,   rep: 6,  fortune: 3, karma: -3 },
    { id: 'large',  name: '广建义庄', stones: 50000,  rep: 15, fortune: 8, karma: -8 },
  ],
  async donate(id) {
    const p = Game.player;
    const t = this.TIERS.find(x => x.id === id);
    if (!t) return;
    const stones = Math.round(t.stones * Math.max(1, Math.pow(2.2, Math.min(5, p.realmIdx) - 1) / 1));
    const ok = await UI.popup({
      title: `布施 · ${t.name}`,
      html: `散财于世间疾苦——声望 +${t.rep}，气运 +${t.fortune}，孽障 ${t.karma}。<br>需灵石 <span class="hl">${Utils.fmtNum(stones)}</span>。`,
      options: [{ text: '行 善', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(stones)) { UI.toast('灵石不足'); return; }
    if (typeof RepSys !== 'undefined' && RepSys.add) RepSys.add(p, t.rep, '布施行善');
    KarmaSys.addFortune(t.fortune);
    if (t.karma < 0) KarmaSys.addKarma(t.karma, true);
    Log.add(`你散财行【${t.name}】之善——声望 +${t.rep}，气运 +${t.fortune}，孽障 ${t.karma}。`, 'gain');
    Story.chron(`布施行善「${t.name}」`);
    Game.afterAction();
  },
};
