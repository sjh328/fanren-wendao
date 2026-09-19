
/* ======================================================================
 * §11.9 v19 拍卖行 AuctionSys（每六十日一件稀有拍品，三档出价博弈）
 * ====================================================================== */
const AuctionSys = {
  /* v29：补 minRealm 门槛（底价随境界经济浮动，低境不再白捡毕业神装）
   * v35（E147）：功法拍品按品阶重定价——原 v13 旧价与品阶体系脱节：grade5 九天雷神经 9000/minRealm2
   * 比 grade3 大衍神诀 12000/minRealm3 还便宜且门槛低两境，金丹期 1.2 万灵石锁定毕业功法。
   * 现按 grade3≥10000/grade4≥20000/grade5≥45000 重排，池内相邻品阶底价单调（price-audit 门禁） */
  LOT_POOL: [
    { item: 's_hj_sha', base: 16000, minRealm: 3 }, { item: 's_hj_pao', base: 15000, minRealm: 3 }, { item: 's_hj_ling', base: 14000, minRealm: 3 },
    { item: 's_xy_jian', base: 30000, minRealm: 4 }, { item: 's_xy_ling', base: 28000, minRealm: 4 },
    // v35（E174）：minRealm 1→0——原 LOT_POOL 最低门槛 1 使 r0 时 usable 恒空、回落全池，
    // 练气期 60 日锁期内掷出的必然是整期不可竞拍的拍品（v31 E41 要修的场景在 r0 原样复现）
    { item: 'm_danfang', base: 4000, minRealm: 0 },
    { item: 'gf_zhoutian', base: 10000, minRealm: 3 }, { item: 'gf_leishen', base: 48000, minRealm: 5 },
    { item: 'gf_hunyuan', base: 20000, minRealm: 4 }, { item: 'gf_niepan', base: 46000, minRealm: 5 },
    { item: 'w_sanqing', base: 12000, minRealm: 3 }, { item: 'pill_zaohua', base: 160000, minRealm: 6 },
    // v34（D1）：造化仙丹底价 15000/minRealm4 → 160000/6——原与坊市价 350000（转卖 157500）脱钩 23 倍、
    // 门槛还低两境：r4 落槌 17250 转手 157500，60 日一轮零风险套利。现稳健出价已高于转卖价，倒挂归负。

    { item: 'gf_dayan', base: 12000, minRealm: 3 }, { item: 'm_gupian', base: 10000, minRealm: 3 },
    { item: 'gf_wangchen', base: 22000, minRealm: 4 }, { item: 'gf_feixian', base: 10000, minRealm: 3 },
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
    // v32 修瑕（E20）：估值两处失真修复——①ecoPrice 物（符箓等时价之物）原按 base 记期望
    //（r6 时 tal_huoshe 单项低估约 3000）；②0 价稀有物原按 500 记（gf_jianxin 宗门兑价 3 万贡献）
    const GRADE_FALLBACK = [300, 800, 2000, 6000, 16000, 40000];
    const valOf = (x) => {
      const def = GameData.ITEMS[x.id];
      if (!def) return 500;
      let v = def.price || 0;
      if (!v) v = GRADE_FALLBACK[Utils.clamp(def.grade || 0, 0, 5)] || 500;
      if (def.ecoPrice) v = Math.round(v * GameData.stoneEco(p.realmIdx || 0));
      return v;
    };
    const wsum = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2, 0);
    const ev = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2 * valOf(x), 0) / wsum;
    return Math.max(200, Math.round(ev * 0.85));
  },
  state(p) {
    const day = Math.floor(p.day || 0);
    if (!p.auction || p.auction.until < day) {
      // v29 修瑕：拍品种子带期号 seq——此前同日中标后 hash('auction@'+day) 恒重新掷出同一件，可无限复购
      const prev = p.auction;
      const seq = (prev && prev.seq) || 0;
      const mystery = Utils.chance(10);
      if (mystery) {
        p.auction = { item: 'mystery', seq, base: this.mysteryBase(p), until: day + this.PERIOD };
      } else {
        // v31 修瑕（E41）：先按当前境界过滤可竞拍拍品再取模——原可在 60 日锁期内掷出整期不可竞拍的拍品，
        // 低境玩家整期只能看着一件「不可用之物」
        // v34（D1）：已修习/道途不合的功法不再掷出——坊市买功法有判重与 canLearnGongfa 双闸，
        // 拍卖行此前两闸全绕（已修习者重复拍下=白烧钱无提示）
        const usable = this.LOT_POOL.filter(x => {
          if ((x.minRealm || 0) > (p.realmIdx || 0)) return false;
          const d2 = GameData.ITEMS[x.item];
          if (d2 && d2.type === 'gongfa' && (p.gongfa && p.gongfa[x.item])) return false;
          if (d2 && d2.type === 'gongfa' && typeof DaoSys !== 'undefined' && DaoSys.canLearnGongfa && !DaoSys.canLearnGongfa(p, d2, true)) return false;
          return true;
        });
        const pool2 = usable.length ? usable : this.LOT_POOL;
        const lot2 = pool2[Utils.hashStr('auction@' + day + '#' + seq) % pool2.length];
        const gate = Math.min(8, lot2.minRealm || 0);
      // v30 复核：底价随境界但限三境溢阶——原 3.8^min(8,r) 全幅膨胀，r6+ 拍品性价比远逊坊市，无人竞拍
      const mul = Math.pow(3.8, Utils.clamp(Math.min(8, p.realmIdx || 0) - gate, 0, 3));
      // v32（E5）影子竞价·热度：拍品每被流拍/围观一轮，底价随关注热度上浮（封顶三成）——
      // 「每个人都盯着的那件」不会便宜。
      // v33（E77）修瑕：热度原是永久棘轮——views 只增不随拍品重置（约十期后一切拍品永久 +30%），
      // 且古匣期不带 views 整体清零。现按拍品语义：同一件拍品连任才累计围观，换品即归一。
      const sameLot = prev && prev.item === lot2.item && prev.seq === seq;
      const views = sameLot ? ((prev.views || 0) + 1) : 1;
      const hot = 1 + Math.min(0.3, (views - 1) * 0.03);
      p.auction = { item: lot2.item, seq, views, base: Math.round(lot2.base * mul * hot), until: day + this.PERIOD };
      }
    }
    return p.auction;
  },
  async bid(mode) {
    const p = Game.player;
    const a = this.state(p);
    const isMystery = a.item === 'mystery';
    // v32 修瑕（E20）：古匣日限一枚——原中奖即 until=0 同日可连环开匣（与塔雷晶核同款护栏）
    // v33（E73）修瑕：日限原记在 p.auction.boxDay——bid 中标后 until=0，下次渲染 state() 即整体替换
    // 该对象、boxDay 随之蒸发（切个页签就能再开）。改挂 p 本体走日结总线，日限自此跨轮换存续。
    // v33 补：判定不做真值 coercion（`|| -1` 在第 0 日恒失配——开局首日可连开两匣）
    if (isMystery && p._boxDay === Math.floor(p.day || 0)) { UI.toast('古匣灵机未复——今日已开启过一回，明日再来'); return; }
    // v29：拍品境界门槛——低境不再能低价竞得远超自身境界的拍品
    if (!isMystery) {
      const lot = this.LOT_POOL.find(x => x.item === a.item);
      if (lot && (p.realmIdx || 0) < lot.minRealm) { UI.toast(`此拍品非当前境界可用之物（需${GameData.REALM_NAMES[lot.minRealm]}期以上）`); return; }
      // v34（D1）：功法拍品出价前双闸（掷品已过滤，此处兜底旧档已掷出的在期拍品）
      const gd = GameData.ITEMS[a.item];
      if (gd && gd.type === 'gongfa') {
        if (p.gongfa && p.gongfa[a.item]) { UI.toast('此诀你已修习，重拍无用'); return; }
        if (typeof DaoSys !== 'undefined' && !DaoSys.canLearnGongfa(p, gd)) return;
      }
    }
    const def = isMystery ? { name: '未鉴定·蒙尘古匣', desc: '匣上封皮剥落，看不出内里乾坤——可能是废纸，也可能是仙家至宝。' } : (GameData.ITEMS[a.item] || { name: a.item, desc: '' });   // v33（E80）：脏档残留已下架 id 时不再 TypeError
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
        // v30 修瑕：开奖与定价同池分层——原开奖仍用全量 MYSTERY_POOL，v29 的「低境只出低品」只落了一半（定价分了层、开奖没分），期望倒挂依旧
        const pool = this.mysteryPool(p);
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
      p.auction.until = -1;   // 本期拍品易主，刷新下一件（v35（E175）：原 until=0 与开局 day=0 相撞——`until < day` 恒假，第 0 日内可对同一拍品无限复购）
      if (isMystery) Daily.resetIfNew(p, '_boxDay');   // v32 修瑕（E20）+ v33（E73）：古匣日限一枚（迁 p 本体日结总线，防 state() 轮换清账）
      p.auction.seq = (p.auction.seq || 0) + 1;   // v29：期号递进——同日不再掷出同一件拍品
      Ambience.sfx('auction');   // v19 落槌音
    } else {
      // v27 修瑕：退款走原额入账（不吃灵石获取加成）——此前退款被加成放大，落标反而净赚
      Bag.addStonesRaw(price);
      // v32（E5）影子竞价·截胡：激进出价失利后，两成五几率有神秘修士抬价——底价上浮一成
      if (mode === 'bold' && Utils.chance(25)) {
        p.auction.base = Math.round(a.base * 1.1);
        Log.add('竞价失利——人群中另有神秘修士志在必得，底价被抬上一成！', 'warn');
      } else {
        Log.add(`竞价失利——有人以更高价截胡。灵石已原路退回。`, 'warn');
      }
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
  /** v30：布施定价单源化（卡面显示价与弹窗实收共用此函数） */
  priceOf(p, t) { return Math.round(t.stones * Math.max(1, GameData.sinkCurve(p.realmIdx) / 2.2)); },   // v30：曲线族统一
  async donate(id) {
    const p = Game.player;
    const t = this.TIERS.find(x => x.id === id);
    if (!t) return;
    const stones = this.priceOf(p, t);   // v29：封顶 5→8，大后期仍是消孽出口
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
