
/* ======================================================================
 * §11.8 v13 悬赏任务板 BountySys（坊市每三日刷新一批悬赏）
 * 类型：猎杀妖兽 / 上交材料 / 切磋获胜；未领的悬赏可存续三日（v32 修瑕 E42：文案对齐实发）。
 * ====================================================================== */
const BountySys = {
  freshBounties(p) {
    const rp = p.realmIdx * 4 + p.layer;
    const list = [];
    // 猎杀
    const pool = SectSys.taskMonsters(rp);
    if (pool.length) {
      const mid = Utils.pick(pool);
      const need = Utils.rand(3, 6);
      list.push({ type: 'kill', target: mid, need, progress: 0, name: `猎杀 · ${GameData.MONSTERS[mid].name}`, desc: `击杀 ${GameData.MONSTERS[mid].name} ×${need}` });
    }
    // 收集
    const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 1, 1, 4);
    const mats = GameData.matsByTier(tier);
    if (mats.length) {
      const mid = Utils.pick(mats);
      const need = Utils.rand(3, 6);
      list.push({ type: 'collect', target: mid, need, progress: 0, name: `收购 · ${GameData.ITEMS[mid].name}`, desc: `上交 ${GameData.ITEMS[mid].name} ×${need}` });
    }
    // 切磋
    list.push({ type: 'spar', target: null, need: 1, progress: 0, name: '较技 · 以武会友', desc: '赢得一场切磋（江湖页发起）' });
    return list;
  },
  stateOf(p) {
    if (!p.bounties) p.bounties = { day: Math.floor(p.day), list: [] };
    const today = Math.floor(p.day);
    if (!p.bounties.list.length || today - p.bounties.day > 2) {
      p.bounties = { day: today, list: this.freshBounties(p) };
    }
    return p.bounties;
  },
  rewards(p) {
    const realm = p.realmIdx;
    let stones = Math.round(60 * GameData.stoneEco(realm));
    // v32（F3）宗门内乱次年回响：乱局佣兵生意好做——悬赏赏格 ×1.1
    const w = p.world;
    if (w && w.turmoilUntil) {
      const y2 = Math.floor((p.day || 0) / 365) + 1;
      if (y2 <= w.turmoilUntil) stones = Math.round(stones * 1.1);
      else w.turmoilUntil = 0;
    }
    return { stones, contrib: 25 + realm * 15 };
  },
  submit(idx) {
    const p = Game.player;
    const B = this.stateOf(p);
    const t = B.list[idx];
    if (!t || t.type !== 'collect' || t.progress >= t.need) return;
    const have = Bag.count(t.target);
    if (have <= 0) { UI.toast('背包中没有所需材料'); return; }
    const take = Math.min(have, t.need - t.progress);
    Bag.removeItem(t.target, take);
    t.progress += take;
    Log.add(`你把 ${GameData.ITEMS[t.target].name} ×${take} 交予悬赏行商。`, 'info');
    if (t.progress >= t.need) Log.add('悬赏已然达成，可领取赏格！', 'gain');
    Game.afterAction();
  },
  /** v35（E144）：收集悬赏兜底赏格单源——原 claim 实发 ×2 而 UI 预览漏乘（预览腰斩），
   *  玩家据预览做「卖店 vs 交悬赏」决策全部失真。两处共用此式 */
  collectFloor(t) {
    return Math.round(ShopSys.sellPrice(t.target) * t.need * 2);
  },
  claim(idx) {
    const p = Game.player;
    const B = this.stateOf(p);
    const t = B.list[idx];
    if (!t || t.progress < t.need) return;
    let r = this.rewards(p);
    // v29 修瑕：收材料悬赏的赏格兜底——此前境界 0 交 3~6 个一阶材料（卖店值 72~240）只赏 60 灵石，交悬赏不如摆摊
    if (t.type === 'collect') {
      r.stones = Math.max(r.stones, this.collectFloor(t));
    }
    // v27 联动：声望赏格真正入账——此前 UI 标注 ×1.15/×1.3/×1.5 而实发从未乘算
    const repBonus = (typeof RepSys !== 'undefined' && RepSys.bountyBonus) ? RepSys.bountyBonus(p) : 1;
    if (repBonus > 1) r = { stones: Math.round(r.stones * repBonus), contrib: Math.round(r.contrib * repBonus) };
    if (typeof SectSys !== 'undefined' && SectSys.commandActive && SectSys.commandActive(p, 'drill')) r = { stones: Math.round(r.stones * 1.5), contrib: Math.round(r.contrib * 1.5) };   // v19 长老令·演武
    // v27 联动：践诺立信——完成悬赏声望 +1（声望体系自布施之外的第二产出端）
    if (typeof RepSys !== 'undefined' && RepSys.add) RepSys.add(p, 1, '悬赏践诺');
    if (Utils.chance(25)) KarmaSys.addFortune(2);
    Ambience.sfx('bounty');
    let chainTxt = '';
    // v19 连锁悬赏：赏格代代加码；v30 连锁 1→3 级；v31 修瑕（E13）：实发统一走 CHAIN_MUL 表——
    // 原实发用 1+chain*0.6（连锁Ⅲ=×2.8）而文案按 CHAIN_MUL[3]=×3 宣称，两口径打架
    const CHAIN_MUL = [1, 1.6, 2.2, 3];
    const CHAIN_CHANCE = [25, 22, 18];
    const CHAIN_TAG = ['', '连锁 · ', '连锁Ⅱ · ', '连锁Ⅲ · '];
    const curChain = t.chain || 0;
    const mul = CHAIN_MUL[curChain] || 1;
    const gainStones = Math.round(r.stones * mul);
    Bag.addStones(gainStones);
    if (p.sect) p.sect.contrib += Math.round(r.contrib * mul);
    Log.add(`悬赏【${t.name}】交付！赏得灵石 ${Utils.fmtNum(gainStones)}${p.sect ? `、宗门贡献 +${Math.round(r.contrib * mul)}` : ''}。`, 'gain');
    if (curChain < 3 && (t.type === 'kill' || t.type === 'collect') && Utils.chance(CHAIN_CHANCE[curChain])) {
      const nc = curChain + 1;
      const baseName = t.name.replace(/^(连锁Ⅱ?Ⅲ? · )/, '');
      const nt = { ...t, need: t.need + 2, progress: 0, chain: nc, name: `${CHAIN_TAG[nc]}${baseName}`, desc: `${t.desc.replace(/×\d+/, `×${t.need + 2}`)}（连锁${['Ⅰ', 'Ⅱ', 'Ⅲ'][nc - 1] || ''} · 赏格 ×${CHAIN_MUL[nc]}）` };
      B.list[idx] = nt;
      chainTxt = nc < 3 ? '行商追加了一张<b>连锁悬赏</b>——目标更多，赏格更厚！' : '行商搬出压箱底的赏格——<b>连锁Ⅲ</b>！办成这一单，江湖都知道你的名号。';
    } else {
      B.list[idx] = null;
    }
    if (chainTxt) Log.add(chainTxt, 'event');
    Game.afterAction();
  },
  /** 战斗胜利钩子（Battle.victory 调用） */
  onKill(monsterId) {
    const p = Game.player;
    if (!p.bounties) return;
    for (const t of p.bounties.list) {
      if (t && t.type === 'kill' && t.target === monsterId && t.progress < t.need) {
        t.progress++;
        if (t.progress >= t.need) Log.add('悬赏猎杀已然达成，可去坊市领取赏格！', 'gain');
        else Log.add(`悬赏进度：${t.progress}/${t.need}。`, 'info');
      }
    }
  },
  /** 切磋胜利钩子 */
  onSpar() {
    const p = Game.player;
    if (!p.bounties) return;
    for (const t of p.bounties.list) {
      if (t && t.type === 'spar' && t.progress < t.need) {
        t.progress++;
        Log.add('悬赏【以武会友】已然达成，可去坊市领取赏格！', 'gain');
      }
    }
  },
};
