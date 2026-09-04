
/* ======================================================================
 * §11.9 v19 拍卖行 AuctionSys（每六十日一件稀有拍品，三档出价博弈）
 * ====================================================================== */
const AuctionSys = {
  LOT_POOL: [
    { item: 's_hj_sha', base: 16000 }, { item: 's_hj_pao', base: 15000 }, { item: 's_hj_ling', base: 14000 },
    { item: 's_xy_jian', base: 30000 }, { item: 's_xy_ling', base: 28000 },
    { item: 'm_danfang', base: 4000 },
    { item: 'gf_zhoutian', base: 6000 }, { item: 'gf_leishen', base: 9000 },
    { item: 'gf_hunyuan', base: 9000 }, { item: 'gf_niepan', base: 9000 },
    { item: 'w_sanqing', base: 12000 }, { item: 'pill_zaohua', base: 15000 },
    { item: 'gf_dayan', base: 12000 }, { item: 'm_gupian', base: 10000 },
    { item: 'gf_wangchen', base: 15000 }, { item: 'gf_feixian', base: 15000 },
    { item: 'fruit_tianji', base: 22000 },   // v20 天机果（先天破桎）
  ],
  PERIOD: 60,
  /** v20 神秘拍品：一成几率拍的是未鉴定之物（低价购入，鉴定为 1~5 品任意物） */
  MYSTERY_POOL: [
    { id: 'pill_juqi', grade: 0 }, { id: 'm_lingcao', grade: 1 }, { id: 'tal_huoshe', grade: 1 },
    { id: 'w_qinggang', grade: 1 }, { id: 'pill_pojing', grade: 2 }, { id: 'z_qiankun', grade: 2 },
    { id: 'gf_tiangang', grade: 2 }, { id: 'm_gupian', grade: 4 }, { id: 'pill_taichu', grade: 4 },
    { id: 'fruit_tianji', grade: 4 }, { id: 'w_zhuxian', grade: 3 }, { id: 'gf_jianxin', grade: 5 },
  ],
  state(p) {
    const day = Math.floor(p.day || 0);
    if (!p.auction || p.auction.until < day) {
      const mystery = Utils.chance(10);
      if (mystery) {
        // 神秘拍品：底价按中位拍品折半，鉴定期满揭晓
        p.auction = { item: 'mystery', base: Math.round(4000 * GameData.stoneEco(Math.min(4, p.realmIdx)) / GameData.stoneEco(2)), until: day + this.PERIOD };
      } else {
        const lot = this.LOT_POOL[Utils.hashStr('auction@' + day) % this.LOT_POOL.length];
        p.auction = { item: lot.item, base: Math.round(lot.base * GameData.stoneEco(Math.min(4, p.realmIdx)) / GameData.stoneEco(2)), until: day + this.PERIOD };
      }
    }
    return p.auction;
  },
  async bid(mode) {
    const p = Game.player;
    const a = this.state(p);
    const isMystery = a.item === 'mystery';
    const def = isMystery ? { name: '未鉴定·蒙尘古匣', desc: '匣上封皮剥落，看不出内里乾坤——可能是废纸，也可能是仙家至宝。' } : GameData.ITEMS[a.item];
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
      if (isMystery) {
        // 鉴定：权重向低品倾斜，仙缘罕见
        const pool = this.MYSTERY_POOL;
        const total = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2, 0);
        let r = Math.random() * total, hit = pool[pool.length - 1];
        for (const x of pool) { r -= (6 - Math.min(5, x.grade)) * 2; if (r <= 0) { hit = x; break; } }
        Bag.addItem(hit.id, 1);
        const gd = GameData.ITEMS[hit.id];
        Log.add(`古匣开启——${(6 - Math.min(5, hit.grade)) >= 5 ? '匣中竟是' : '竟是一册'}【<b>${gd.name}</b>】！（${(gd.desc || '').slice(0, 26)}…）`, hit.grade >= 3 ? 'gain' : 'info');
        if (hit.grade >= 3) { UI.announce('✦ 古匣生辉 · ' + gd.name + ' ✦', 'gold'); Ambience.sfx('rare'); }
        else UI.toast('古匣鉴成：' + gd.name);
        Story.chron(`拍卖行购得神秘古匣，鉴出「${gd.name}」`);
      } else {
        Bag.addItem(a.item, 1);
        Log.add(`拍卖行落槌——【<b>${def.name}</b>】归你所有！（出价 ${Utils.fmtNum(price)} 灵石）`, 'gain');
        UI.announce('✦ 竞拍得手 · ' + def.name + ' ✦', 'gold');
        Story.chron(`拍卖行竞得「${def.name}」`);
      }
      p.auction.until = 0;   // 本期拍品易主，刷新下一件
      Ambience.sfx('auction');   // v19 落槌音
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
