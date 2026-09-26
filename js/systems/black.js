
/* ======================================================================
 * §11.9 v13 黑市 BlackSys（每月开市三日：暗巷奇货 + 还价）
 * 开市规则：游戏日内 day % 30 < 3；货物按日哈希确定性生成。
 * v33（E79）：头注原写「高价收购」，实无此功能（出售走坊市）——注释清理防误导。
 * v40（E387）：巷角赌袋摊（陷阱货）整体删除——与拍卖古匣重复且全面劣于，动作与按钮同批拆除。
 * ====================================================================== */
const BlackSys = {
  isOpen(p) { return Math.floor(p.day || 0) % 30 < 3; },
  daysLeft(p) { return 3 - Math.floor(p.day % 30); },
  POOL: [
    { id: 'm_qianghua', w: 24 }, { id: 'm_neidan', w: 14 }, { id: 'pill_xingshen', w: 8 },
    { id: 'pill_poxiao', w: 8 }, { id: 'm_xingchen', w: 8 }, { id: 'm_huolin', w: 12 },
    { id: 'pill_lingxi', w: 6 }, { id: 'm_danfang', w: 6 }, { id: 'm_xianjing', w: 4 },
    { id: 's_cx_gou', w: 5 }, { id: 's_xt_pei', w: 5 }, { id: 'gf_feixian', w: 5 },
    { id: 'm_bingpo', w: 12 }, { id: 'seed_xingchen', w: 4 }, { id: 'm_xuecan', w: 10 },
    { id: 'm_jiaojin', w: 6 },   // v29：蛟筋断头路补全——原仅 r6+ 掉落与 22000 贡献一条路，赤霄神剑（grade3 内容）中期无料
    { id: 'm_yaopi', w: 10 },   // v30 断头路补全：妖兽皮革原仅 tier1 掉落（金丹后随 dropTier 绝迹），f3/f13 炼器线中后期无料
    { id: 'm_leijing', w: 5 },   // v31 断头路补全：雷晶核 tier-4 池 11 选 1 均匀掉落，期望 11 掉/枚——f19-f22 与 a4-a6 丹方共抢，黑市补一条定向料源
    { id: 'm_xiancui', w: 6 },   // v31 断头路补全：仙灵翠原仅仙灵种（原 r8 上架）一源，f19/f20 中期即需求
    /* v40（E387）：去同款+独家奇货——原五格坊市同款丹/符/种（贵六成，抽到即废格）整批撤下，
     * 替换为「ITEMS 有 def 而 SHOP 不上架」的独家货：醒神丹/破晓散/灵犀丹（E317 研创个人丹）
     * + 丹方残页 + 仙晶；强化石权重 16→24（高权重）。
     * 独家格占比 17/18 ≥70%（price-audit 独家格占比路）。选品避开 tier 均价兜底购料环：
     * 入池材料按黑市 1.6× 价均高于所在 tier 的收集兜底 floor（第八路复核） */
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
  /** 黑市售价：基准 × 1.6 × 境界经济（材料类随行情）。
   *  v20 修瑕：定价 0 的稀有物（套装件/秘境功法等）按品阶折算基准价，杜绝 800 灵石捡漏地级套装。
   *  v28 联动：声望亦及于暗巷——侠名在外，蒙面人也给面子（吃 RepSys.priceMul ±15%）。
   *  v40（E371）：还价触怒的涨价落盘消费——当日 ×p._haggleMul（1.15），次日自清
   *  （原 cost×1.15 只进日志、price() 按哈希重算从不消费，「触怒要涨价」是假威慑）。 */
  price(p, id) {
    const def = GameData.ITEMS[id];
    let base = def.price || 0;
    // v30 修瑕：兜底价接境界行情——原 2000×3^grade 恒价，玄天/赤霄散件 8.64 万在后期形同白送
    if (!base) base = Math.round(2000 * Math.pow(3, Utils.clamp(def.grade ?? def.tier ?? 1, 0, 5)) * Math.pow(GameData.stoneEco(p.realmIdx), 0.5));
    if (def.ecoPrice) base = Math.round(base * GameData.stoneEco(p.realmIdx));
    const repMul = (typeof RepSys !== 'undefined' && RepSys.priceMul) ? RepSys.priceMul(p) : 1;
    const today = Math.floor(p.day || 0);
    const mul = (p._haggleFailDay === today && p._haggleMul) ? p._haggleMul : 1;
    if (p._haggleMul != null && p._haggleFailDay !== today) delete p._haggleMul;   // 次日清除（惰性）
    return Math.max(1, Math.round(base * 1.6 * repMul * mul));
  },
  buy(id) {
    const p = Game.player;
    this.buyAsync(id, this.price(p, id));
  },
  async buyAsync(id, cost) {
    const p = Game.player;
    const def = GameData.ITEMS[id];
    // v39（E353）：首弹主按钮改「买 下（直购）」——直购自此一击成交；还价成功亦直接成交
    //（原还价后还有一道最终确认弹窗，删除），收据统一走 Log
    const first = await UI.popup({
      title: '黑市 · 暗巷交易',
      html: `「识货的道友——」蒙面商贾掀开布角：<br><b>${def.name}</b><br>${def.desc}<br>索价 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石（坊市价高六成）。<br><span class="tip-line">· 亦可试着还价——成算视悟性与福缘而定，触怒了商人可是要涨价的。</span>`,
      options: [
        { text: '买 下（直购）', value: 'buy', primary: true },
        { text: '讨价还价', value: 'haggle' },
        { text: '摇头离去', value: 'leave' },
      ],
    });
    if (!first || first === 'leave') return;
    if (first === 'buy') {
      if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
      Bag.addItem(id, 1);
      Log.add(`你在暗巷购得 <b>${def.name}</b>，花费 ${Utils.fmtNum(cost)} 灵石。蒙面人转身没入黑暗。`, 'info');
      Game.afterAction();
      return;
    }
    // v19 讨价还价：悟性/福缘判定（v28 联动：有效悟性/福缘——装备与讲道加成一并计入）
    // v29 修瑕：当日还价失败过再还必败——此前失败后关弹窗重开即可免费重掷，「触怒商人」形同虚设
    const shamed = (p._haggleFailDay || -1) === Math.floor(p.day);
    // v38（E337/E340）：万宝商会【商路情报】每日首谈必成；称号「散人不羁」黑市售价 -5%
    const wanbao = p.sect && p.sect.id === 'wanbao' && p._wanbaoHaggleDay !== Math.floor(p.day);
    const rate = shamed ? 0 : (wanbao ? 100 : Utils.clamp(20 + Stat.compOf(p) * 4 + Stat.compute(p).luck * 4, 10, 75));
    if (Utils.chance(rate)) {
      if (wanbao) p._wanbaoHaggleDay = Math.floor(p.day);
      if (Game.titleOn(p, 'freeRep')) cost = Math.round(cost * 0.95);
      cost = Math.round(cost * 0.75);
      if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
      Bag.addItem(id, 1);
      Log.add(`你巧舌如簧${wanbao ? '（商路情报在手，一锤定音）' : ''}，蒙面商贾咬牙认了——以 <b>${Utils.fmtNum(cost)}</b> 灵石成交，【<b>${def.name}</b>】入手。`, 'gain');
      Game.afterAction();
    } else {
      // v40（E371）：涨价落盘——原只把 cost×1.15 写进日志，price() 从不消费；现落 p._haggleMul，
      // 当日 price() 单源 ×1.15（播报数值即实际成交价），次日自清
      p._haggleMul = 1.15;
      p._haggleFailDay = Math.floor(p.day);
      Log.add(`还价触怒了商贾——「不识抬举！」索价涨至 <b>${Utils.fmtNum(this.price(p, id))}</b> 灵石。${shamed ? '（他已认得你，今日休想再砍价）' : ''}`, 'warn');
    }
  },
  // v40（E387）：原巷角赌袋摊（陷阱货）整体删除——与拍卖古匣同一赌局且全面劣于
  //（金额小、三重惩罚），黑市专注「暗巷奇货+还价」；坊市动作与卡面按钮同批拆除
};
