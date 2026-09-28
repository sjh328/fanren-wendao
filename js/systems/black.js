
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
  /** 暗巷货（确定性哈希）：今日四件货物
   *  v41（E437）：境界过滤——r<3 不掷 grade≥3 之物（grade3 套装件/高阶种子按品阶兜底计价，
   *  低境掷出即百万级死物噪音格；飞仙步 grade3 亦然，双闸与过滤两道各自兜底） */
  goods(p) {
    const day = Math.floor(p.day);
    const seed = Utils.hashStr('black' + day);
    const out = [];
    const used = new Set();
    const low = (p.realmIdx || 0) < 3;
    const pool = low ? this.POOL.filter(g => {
      const d = GameData.ITEMS[g.id];
      return !d || (d.grade || 0) < 3;
    }) : this.POOL;
    for (let i = 0; i < 4; i++) {
      let h = Utils.hashStr('b' + seed + ':' + i) % pool.length;
      let guard = 0;
      while (used.has(pool[h].id) && guard++ < 20) h = (h + 1) % pool.length;
      const g = pool[h];
      used.add(g.id);
      out.push(g.id);
    }
    return out;
  },
  /** 黑市售价：基准 × 1.6 × 境界经济（材料类随行情）。
   *  v20 修瑕：定价 0 的稀有物（套装件/秘境功法等）按品阶折算基准价，杜绝 800 灵石捡漏地级套装。
   *  v28 联动：声望亦及于暗巷——侠名在外，蒙面人也给面子（吃 RepSys.priceMul ±15%）。
   *  v40（E371）：还价触怒的涨价落盘消费——当日涨价（播报数值即显示成交价）。
   *  v41（E437）：涨价升为 ×1.3，键位迁 p.sess.haggleMul/haggleFailDay（E428 迁移后的唯一键位，
   *  严禁复活旧版顶层还价键（field-audit 门禁盯防））；且触怒当日商贾拂袖而去、一律拒卖（buyAsync 顶闸）。 */
  price(p, id) {
    const def = GameData.ITEMS[id];
    let base = def.price || 0;
    // v30 修瑕：兜底价接境界行情——原 2000×3^grade 恒价，玄天/赤霄散件 8.64 万在后期形同白送
    if (!base) base = Math.round(2000 * Math.pow(3, Utils.clamp(def.grade ?? def.tier ?? 1, 0, 5)) * Math.pow(GameData.stoneEco(p.realmIdx), 0.5));
    if (def.ecoPrice) base = Math.round(base * GameData.stoneEco(p.realmIdx));
    const repMul = (typeof RepSys !== 'undefined' && RepSys.priceMul) ? RepSys.priceMul(p) : 1;
    const today = Math.floor(p.day || 0);
    const sess = p.sess || {};
    const mul = (sess.haggleFailDay === today && sess.haggleMul) ? sess.haggleMul : 1;
    if (sess.haggleMul != null && sess.haggleFailDay !== today) sess.haggleMul = null;   // 次日清除（惰性）
    return Math.max(1, Math.round(base * 1.6 * repMul * mul));
  },
  buy(id) {
    const p = Game.player;
    this.buyAsync(id, this.price(p, id));
  },
  async buyAsync(id, cost) {
    const p = Game.player;
    const def = GameData.ITEMS[id];
    const today = Math.floor(p.day || 0);
    // v41（E437）：功法双闸——对齐坊市/拍卖行（已修习/已藏有判重 + canLearnGongfa）。
    // 原 POOL 挂 grade3 gf_feixian 两闸全无：r6 约 474 万灵石可买死物；不可学者示其道体所碍。
    if (def.type === 'gongfa') {
      if ((p.gongfa && p.gongfa[id]) || (p.bag && p.bag[id])) { UI.toast('此诀你已修习，重金莫掷'); return; }
      if (typeof DaoSys !== 'undefined' && DaoSys.canLearnGongfa && !DaoSys.canLearnGongfa(p, def)) return;
    }
    // v41（E437）：还价触怒的当日拒卖——「拂袖而去」（涨价 ×1.3 由 price() 单源消费、显示于货价）
    const sess = p.sess || (p.sess = { haggleMul: null, haggleFailDay: null });
    if (sess.haggleFailDay === today) {
      Log.add('蒙面商贾认得你——「今日休想再做我生意！」他袖子一甩，没入黑暗。', 'warn');
      UI.toast('商贾拂袖而去——今日黑市与你无缘', true);
      return;
    }
    // v39（E353）：首弹主按钮改「买 下（直购）」——直购自此一击成交；还价成功亦直接成交
    //（原还价后还有一道最终确认弹窗，删除），收据统一走 Log
    // v41（E437）：直购给正当溢价——爽快成交声望 +1（还价省两成五、但有触怒 ×1.3 加价加拒卖之险）
    const first = await UI.popup({
      title: '黑市 · 暗巷交易',
      html: `「识货的道友——」蒙面商贾掀开布角：<br><b>${def.name}</b><br>${def.desc}<br>索价 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石（坊市价高六成）。<br><span class="tip-line">· 亦可试着还价——成算视悟性与福缘而定，触怒了商人可是要涨价的；爽快直购，商贾必念你的好（声望 +1）。</span>`,
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
      if (typeof RepSys !== 'undefined' && RepSys.add) RepSys.add(p, 1, '暗巷爽快直购');   // v41（E437）：直购溢价之外的正当甜头
      Log.add(`你在暗巷购得 <b>${def.name}</b>，花费 ${Utils.fmtNum(cost)} 灵石。蒙面人收了灵石，难得爽快，转身没入黑暗。（声望 +1）`, 'info');
      Game.afterAction();
      return;
    }
    // v19 讨价还价：悟性/福缘判定（v28 联动：有效悟性/福缘——装备与讲道加成一并计入）
    // v38（E337/E340）：万宝商会【商路情报】每日首谈必成；称号「散人不羁」黑市售价 -5%
    const wanbao = p.sect && p.sect.id === 'wanbao' && p._wanbaoHaggleDay !== today;
    const rate = wanbao ? 100 : Utils.clamp(20 + Stat.compOf(p) * 4 + Stat.compute(p).luck * 4, 10, 75);
    if (Utils.chance(rate)) {
      if (wanbao) p._wanbaoHaggleDay = today;
      if (Game.titleOn(p, 'freeRep')) cost = Math.round(cost * 0.95);
      cost = Math.round(cost * 0.75);
      if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
      Bag.addItem(id, 1);
      Log.add(`你巧舌如簧${wanbao ? '（商路情报在手，一锤定音）' : ''}，蒙面商贾咬牙认了——以 <b>${Utils.fmtNum(cost)}</b> 灵石成交，【<b>${def.name}</b>】入手。`, 'gain');
      Game.afterAction();
    } else {
      // v41（E437）：还价失败代价升为当日涨价 ×1.3（原 ×1.15）且商贾拂袖而去——当日一律拒卖。
      // 涨价落 p.sess.haggleMul / p.sess.haggleFailDay（E428 迁移后的唯一键位，严禁顶层 _ 键）
      sess.haggleMul = 1.3;
      sess.haggleFailDay = today;
      Log.add(`还价触怒了商贾——「不识抬举！」索价涨至 <b>${Utils.fmtNum(this.price(p, id))}</b> 灵石。他袖子一甩，今日这巷子你不必再来了。`, 'warn');
    }
  },
  // v40（E387）：原巷角赌袋摊（陷阱货）整体删除——与拍卖古匣同一赌局且全面劣于
  //（金额小、三重惩罚），黑市专注「暗巷奇货+还价」；坊市动作与卡面按钮同批拆除

  /* ---------- v41（E438）：暗巷销赃——道德轴经济（侠义走坊市，魔道走暗巷） ----------
   * 基数 0.55×面值：孽障每 40 点 +0.05（至 0.70× 封顶）、声望每满一档 −0.03（档=30/60/80/90/120/150）。
   * 侠客 120 声望暗巷仅 0.40×<坊市 0.45×、孽障 120 者可得 ≈0.67×>坊市——两道分流自洽。
   * 货品限杀戮掉落类材料与富余丹药（type/存量白名单，纯读算）；UI 出售入口落 E470。 */
  /** 声望折价档——单源 RepSys.STEPS（E438 修偏：原为手抄第二份，调声望阈值时销赃折价会静默漂移；
   *  karma.js 在拼接序先于本模块，字面量期引用安全） */
  SELL_REP_STEPS: RepSys.STEPS,
  /** 销赃折价系数（UI 预览同消费；price-audit 不经此路——本行注释曾误记「price-audit 销赃路同消费」，
   *  随单源化一并校正）；两位小数取整防浮点尾差 */
  sellRate(p) {
    const karmaMul = 0.55 + Math.min(0.15, Math.floor((p.karma || 0) / 40) * 0.05);
    const repCut = this.SELL_REP_STEPS.filter(t => (p.reputation || 0) >= t).length * 0.03;
    return Math.max(0.3, Math.round((karmaMul - repCut) * 100) / 100);
  },
  /** 暗巷收货白名单：杀戮掉落类材料（灵药材走坊市正路）+ 富余丹药（十枚以上方值当暗巷脱手） */
  alleySellable(id) {
    const def = GameData.ITEMS[id];
    if (!def) return false;
    if (def.type === 'material' && !(typeof WorldSys !== 'undefined' && WorldSys.isHerb(id))) return true;
    if (def.type === 'pill' && Bag.count(id) > 10) return true;
    return false;
  },
  /** 销赃一件（act-black-sell） */
  sell(id) {
    const p = Game.player;
    if (!this.isOpen(p)) { UI.toast('暗巷闭市——月首三日再来'); return; }
    if (!this.alleySellable(id)) { UI.toast('此物来路太正，暗巷不收——请走坊市'); return; }
    if (Bag.count(id) < 1) return;
    const def = GameData.ITEMS[id];
    let face = def.price || 0;
    // v20 同款修瑕：0 价稀有物按品阶兜底面值（暗巷也不做亏心赔本生意）
    if (!face) face = GameData.GRADE_FALLBACK[Utils.clamp(def.grade || 0, 0, 5)] || 500;
    if (def.ecoPrice) face = Math.round(face * GameData.stoneEco(p.realmIdx || 0));
    const stones = Math.max(1, Math.floor(face * this.sellRate(p)));
    Bag.removeItem(id, 1);
    Bag.addStonesRaw(stones);   // 销赃款原额入账（对齐坊市出售口径）
    Log.add(`你把【${def.name}】在暗巷脱手——蒙面人数出 ${Utils.fmtNum(stones)} 灵石，交易无声无息。`, 'info');
    Game.afterAction();
  },
};
