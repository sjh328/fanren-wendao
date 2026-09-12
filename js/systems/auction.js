
/* ======================================================================
 * §11.9 v19 拍卖行 AuctionSys（每六十日一件稀有拍品，三档出价博弈）
 * ====================================================================== */
const AuctionSys = {
  /* v29：补 minRealm 门槛（底价随境界经济浮动，低境不再白捡毕业神装） */
  LOT_POOL: [
    { item: 's_hj_sha', base: 16000, minRealm: 3 }, { item: 's_hj_pao', base: 15000, minRealm: 3 }, { item: 's_hj_ling', base: 14000, minRealm: 3 },
    { item: 's_xy_jian', base: 30000, minRealm: 4 }, { item: 's_xy_ling', base: 28000, minRealm: 4 },
    { item: 'm_danfang', base: 4000, minRealm: 1 },
    { item: 'gf_zhoutian', base: 6000, minRealm: 2 }, { item: 'gf_leishen', base: 9000, minRealm: 2 },
    { item: 'gf_hunyuan', base: 9000, minRealm: 3 }, { item: 'gf_niepan', base: 9000, minRealm: 3 },
    { item: 'w_sanqing', base: 12000, minRealm: 3 }, { item: 'pill_zaohua', base: 15000, minRealm: 4 },
    { item: 'gf_dayan', base: 12000, minRealm: 3 }, { item: 'm_gupian', base: 10000, minRealm: 3 },
    { item: 'gf_wangchen', base: 15000, minRealm: 4 }, { item: 'gf_feixian', base: 15000, minRealm: 4 },
    { item: 'fruit_tianji', base: 22000, minRealm: 4 },   // v20 天机果（先天破桎）
  ],
  PERIOD: 60,
  /** v20 神秘拍品：一成几率拍的是未鉴定之物（低价购入，鉴定为按境界分层的物品） */
  MYSTERY_POOL: [
    { id: 'pill_juqi', grade: 0 }, { id: 'm_lingcao', grade: 1 }, { id: 'tal_huoshe', grade: 1 },
    { id: 'w_qinggang', grade: 1 }, { id: 'pill_pojing', grade: 2 }, { id: 'z_qiankun', grade: 2 },
    { id: 'gf_tiangang', grade: 2 }, { id: 'm_gupian', grade: 4 }, { id: 'pill_taichu', grade: 4 },
    { id: 'fruit_tianji', grade: 4 }, { id: 'w_zhuxian', grade: 3 }, { id: 'gf_jianxin', grade: 5 },
  ],
  /** v29：古匣奖池按境界分层——低境只可能开出低品物（原全池恒定，练气 277 灵石博 1.5 万期望） */
  mysteryPool(p) {
    const cap = Math.min(5, (p.realmIdx || 0) + 1);
    return this.MYSTERY_POOL.filter(x => x.grade <= cap);
  },
  /** v29：古匣底价按当前奖池期望×0.85 定价——仍是赌博（有方差），但不再是印钞机 */
  mysteryBase(p) {
    const pool = this.mysteryPool(p);
    if (!pool.length) return 500;
    const wsum = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2, 0);
    const ev = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2 * ((GameData.ITEMS[x.id] && GameData.ITEMS[x.id].price) || 500), 0) / wsum;
    return Math.max(200, Math.round(ev * 0.85));
  },
  state(p) {
    const day = Math.floor(p.day || 0);
    if (!p.auction || p.auction.until < day) {
      // v29 修瑕：拍品种子带期号 seq——此前同日中标后 hash('auction@'+day) 恒重新掷出同一件，可无限复购
      const seq = (p.auction && p.auction.seq) || 0;
      const ecoR = Math.min(8, p.realmIdx);   // v29：底价随境界上限 4 → 8（后期拍行重新成为灵石去向）
      const mystery = Utils.chance(10);
      if (mystery) {
        p.auction = { item: 'mystery', seq, base: this.mysteryBase(p), until: day + this.PERIOD };
      } else {
        const lot = this.LOT_POOL[Utils.hashStr('auction@' + day + '#' + seq) % this.LOT_POOL.length];
        const gate = Math.min(8, lot.minRealm || 0);
        p.auction = { item: lot.item, seq, base: Math.round(lot.base * GameData.stoneEco(ecoR) / GameData.stoneEco(gate)), until: day + this.PERIOD };
      }
    }
    return p.auction;
  },
  async bid(mode) {
    const p = Game.player;
    const a = this.state(p);
    const isMystery = a.item === 'mystery';
    // v29：拍品境界门槛——低境不再能低价竞得远超自身境界的拍品
    if (!isMystery) {
      const lot = this.LOT_POOL.find(x => x.item === a.item);
      if (lot && (p.realmIdx || 0) < lot.minRealm) { UI.toast(`此拍品非当前境界可用之物（需${GameData.REALM_NAMES[lot.minRealm]}期以上）`); return; }
    }
    const def = isMystery ? { name: '未鉴定·蒙尘古匣', desc: '匣上封皮剥落，看不出内里乾坤——可能是废纸，也可能是仙家至宝。' } : GameData.ITEMS[a.item];
    // 三档：稳健 ×1.15 必成九成五 / 激进 ×0.9 六成 / 天价 ×1.6 必成
    const opts = {
      steady: { mul: 1.15, rate: 95, label: '稳健出价' },
      bold: { mul: 0.9, rate: 60, label: '激进出价' },
      dump: { mul: 1.6, rate: 100, label: '天价收购' },
    }[mode];
    if (!opts) return;
    // v28 联动：激进出价吃「鉴宝眼光」——有效悟性与气运抬升成算（封顶 +15，稳健/天价不动）
    if (mode === 'bold') {
      const eye = Math.round(Stat.compOf(p)) + Math.floor((p.fortune || 0) / 10);
      opts.rate = Math.min(100, opts.rate + Math.min(15, eye));
    }
    const price = Math.round(a.base * opts.mul);
    const ok = await UI.popup({
      title: `竞拍 · ${def.name}`,
      html: `${def.desc}<br>底价 <span class="hl">${Utils.fmtNum(a.base)}</span> 灵石。<br>
        【${opts.label}】出价 <b>${Utils.fmtNum(price)}</b> 灵石，成算约 <b>${opts.rate}%</b>${opts.rate < 100 ? '；落标则灵石原路退回' : ''}。<br>
        本期第 ${(a.seq || 0) + 1} 件拍品，拍期还剩 ${a.until - Math.floor(p.day)} 日。`,
      options: [{ text: '落 槌', value: true, primary: true }, { text: '再看看', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(price)) { UI.toast('灵石不足'); return; }
    const win = Utils.chance(opts.rate);
    if (win) {
      p.counters.auctionWins = (p.counters.auctionWins || 0) + 1;   // v24 章助缘计数
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
      p.auction.seq = (p.auction.seq || 0) + 1;   // v29：期号递进——同日不再掷出同一件拍品
      Ambience.sfx('auction');   // v19 落槌音
    } else {
      // v27 修瑕：退款走原额入账（不吃灵石获取加成）——此前退款被加成放大，落标反而净赚
      Bag.addStonesRaw(price);
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
    const stones = Math.round(t.stones * Math.max(1, Math.pow(2.2, Math.min(8, p.realmIdx) - 1) / 1));   // v29：封顶 5→8，大后期仍是消孽出口
    const ok = await UI.popup({
      title: `布施 · ${t.name}`,
      html: `散财于世间疾苦——声望 +${t.rep}，气运 +${t.fortune}，孽障 ${t.karma}。<br>需灵石 <span class="hl">${Utils.fmtNum(stones)}</span>。`,
      options: [{ text: '行 善', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(stones)) { UI.toast('灵石不足'); return; }
    p.counters.donates = (p.counters.donates || 0) + 1;   // v24 章助缘计数
    if (typeof RepSys !== 'undefined' && RepSys.add) RepSys.add(p, t.rep, '布施行善');
    KarmaSys.addFortune(t.fortune);
    if (t.karma < 0) KarmaSys.addKarma(t.karma, true);
    Log.add(`你散财行【${t.name}】之善——声望 +${t.rep}，气运 +${t.fortune}，孽障 ${t.karma}。`, 'gain');
    Story.chron(`布施行善「${t.name}」`);
    Game.afterAction();
  },
};
