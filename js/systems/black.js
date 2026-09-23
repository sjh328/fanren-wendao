
/* ======================================================================
 * §11.9 v13 黑市 BlackSys（每月开市三日：暗巷奇货 / 福缘陷阱）
 * 开市规则：游戏日内 day % 30 < 3；货物按日哈希确定性生成。
 * 陷阱货：来路不明的超低价——福缘高者捡漏，福缘低者破财。
 * v33（E79）：头注原写「高价收购」，实无此功能（出售走坊市）——注释清理防误导。
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
    { id: 'm_jiaojin', w: 6 },   // v29：蛟筋断头路补全——原仅 r6+ 掉落与 22000 贡献一条路，赤霄神剑（grade3 内容）中期无料
    { id: 'm_yaopi', w: 10 },   // v30 断头路补全：妖兽皮革原仅 tier1 掉落（金丹后随 dropTier 绝迹），f3/f13 炼器线中后期无料
    { id: 'm_leijing', w: 5 },   // v31 断头路补全：雷晶核 tier-4 池 11 选 1 均匀掉落，期望 11 掉/枚——f19-f22 与 a4-a6 丹方共抢，黑市补一条定向料源
    { id: 'm_xiancui', w: 6 },   // v31 断头路补全：仙灵翠原仅仙灵种（原 r8 上架）一源，f19/f20 中期即需求
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
   *  v28 联动：声望亦及于暗巷——侠名在外，蒙面人也给面子（吃 RepSys.priceMul ±15%）。 */
  price(p, id) {
    const def = GameData.ITEMS[id];
    let base = def.price || 0;
    // v30 修瑕：兜底价接境界行情——原 2000×3^grade 恒价，玄天/赤霄散件 8.64 万在后期形同白送
    if (!base) base = Math.round(2000 * Math.pow(3, Utils.clamp(def.grade ?? def.tier ?? 1, 0, 5)) * Math.pow(GameData.stoneEco(p.realmIdx), 0.5));
    if (def.ecoPrice) base = Math.round(base * GameData.stoneEco(p.realmIdx));
    const repMul = (typeof RepSys !== 'undefined' && RepSys.priceMul) ? RepSys.priceMul(p) : 1;
    return Math.max(1, Math.round(base * 1.6 * repMul));
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
        Log.add(`你巧舌如簧${wanbao ? '（商路情报在手，一锤定音）' : ''}，蒙面商贾咬牙认了——索价降至 <b>${Utils.fmtNum(cost)}</b> 灵石。`, 'gain');
      } else {
        cost = Math.round(cost * 1.15);
        p._haggleFailDay = Math.floor(p.day);
        Log.add(`还价触怒了商贾——「不识抬举！」索价涨至 <b>${Utils.fmtNum(cost)}</b> 灵石。${shamed ? '（他已认得你，今日休想再砍价）' : ''}`, 'warn');
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
    // v29 修瑕：袋中之物随境界经济加量——此前成本随 eco 膨胀而奖品是固定 1~2 份材料，高境负期望 350 倍
    const matQty = Utils.clamp(Math.round(cost * 0.6 / Math.max(1, GameData.ITEMS[mat].price)), 2, 999);
    const ok = await UI.popup({
      title: '来路不明的储物袋',
      html: `巷角有一个血渍未干的储物袋，摊主开价 <span class="hl">${Utils.fmtNum(cost)}</span> 灵石——袋里似有<b>${GameData.ITEMS[mat].name}</b>的光泽。<br><span class="neg">福缘高者或可捡漏，福缘低者……恐怕要破财免灾。</span>`,
      options: [{ text: '赌一手', value: true }, { text: '不碰晦气', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    p.mysteryDay = day;
    const luck = Stat.compute(p).luck + Math.floor((p.fortune || 0) / 20);   // v28 联动：装备福缘亦护身
    const roll = Math.random() * 100;
    // v35（E148）：胜率钳顶 75%——原无上限，满气运端（天机果 luck12+装备+气运 150）胜率 100%，
    // 期望转正（盈亏平衡点 93.3%）；钳顶后赌袋重归「低福缘微负、高福缘微正但封口」的休闲定位
    if (roll < Math.min(75, 25 + luck * 4)) {
      // v34（D2）：中奖统一「材料 ×2.5」——原 r<3 彩头另送 m_gupian（面值 6000）：v30 堵漏把彩头
      // 「只发低境」，恰好把正期望锁死在低境（200 灵石博 6000 面值碎片，20 日白拿本命法宝）。
      // 碎片自赌袋除名；低福缘微负、高福缘微正，捡漏感保留。
      Bag.addItem(mat, matQty * 2 + Math.ceil(matQty * 0.5));
      Log.add(`你赌对了！袋中竟是${GameData.ITEMS[mat].name} ×${matQty * 2 + Math.ceil(matQty * 0.5)}——今日的运气，值了。`, 'gain');
      Ambience.sfx('rare');
    } else if (roll < 60) {
      Bag.addItem(mat, matQty);
      Log.add(`袋中确有${GameData.ITEMS[mat].name} ×${matQty}，不算亏，也不算赚。`, 'info');
    } else {
      KarmaSys.addKarma(4, true);
      if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 3, '赌局失利');   // v37（E245）：赌局失利 +3——心魔新行为来源
      const fine = Math.round(100 * GameData.stoneEco(p.realmIdx));
      // v26 修瑕：罚款实扣实报（此前下品灵石不足时分文未扣，日志却照写扣钱）
      const paid = Bag.spendStonesMax(fine);
      Log.add(`袋中只有几块破布——这是一桩栽赃的买卖！失主寻来，你只得赔钱了事：灵石 -${Utils.fmtNum(paid)}${paid < fine ? '（囊中羞涩，尽数奉上）' : ''}，还沾了一身晦气（孽障 +4）。`, 'loss');
      UI.toast('破财免灾……', true);
    }
    Game.afterAction();
  },
};
