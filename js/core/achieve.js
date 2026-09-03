
/* ======================================================================
 * §1.10 增量扩展（v6）：成就系统 Achieve（五类三十项）
 * 完成奖励少量气运或灵石；进度存于 Meta，随档、转世不重置。
 * ====================================================================== */
const Achieve = {
  CATS: { realm: '境界', dao: '职业', battle: '战斗', exp: '奇遇', reinc: '转世' },
  stonesTotal(p) { return p.stones.low + p.stones.mid * 100 + p.stones.high * 10000; },
  rewardText(r) { return r.fortune ? `气运 +${r.fortune}` : `灵石 +${Utils.fmtNum(r.stones)}`; },
  DEFS: [
    /* ---- 境界 ---- */
    { id: 'r1', cat: 'realm', name: '初入道途', desc: '突破至筑基期', reward: { fortune: 3 }, test: p => p.realmIdx >= 1 },
    { id: 'r2', cat: 'realm', name: '金丹大道', desc: '突破至金丹期', reward: { fortune: 5 }, test: p => p.realmIdx >= 2 },
    { id: 'r3', cat: 'realm', name: '元婴出窍', desc: '突破至元婴期', reward: { fortune: 8 }, test: p => p.realmIdx >= 3 },
    { id: 'r4', cat: 'realm', name: '化神通玄', desc: '突破至化神期', reward: { fortune: 10 }, test: p => p.realmIdx >= 4 },
    { id: 'r5', cat: 'realm', name: '合体无为', desc: '突破至合体期', reward: { fortune: 12 }, test: p => p.realmIdx >= 6 },
    { id: 'r6', cat: 'realm', name: '白日飞升', desc: '修至真仙期', reward: { fortune: 20 }, test: p => p.realmIdx >= 9 },
    /* ---- 职业 ---- */
    { id: 'd0', cat: 'dao', name: '道途初定', desc: '择定第一条大道', reward: { stones: 200 }, test: p => !!p.dao },
    { id: 'd1', cat: 'dao', name: '剑心桀骜', desc: '剑修之身赢下十五场战斗', reward: { stones: 800 }, prog: p => `${Math.min(15, p.counters.wins || 0)}/15`, test: p => p.dao === 'sword' && (p.counters.wins || 0) >= 15 },
    { id: 'd2', cat: 'dao', name: '丹道藏珍', desc: '丹道之身同时藏有三种丹药', reward: { stones: 600 }, test: p => p.dao === 'pill' && Object.keys(p.bag).filter(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'pill').length >= 3 },
    { id: 'd3', cat: 'dao', name: '笔落惊雷', desc: '符修之身藏符十张', reward: { stones: 600 }, prog: p => `${Math.min(10, Object.entries(p.bag).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman').reduce((s, [, n]) => s + n, 0))}/10`, test: p => p.dao === 'talisman' && Object.entries(p.bag).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman').reduce((s, [, n]) => s + n, 0) >= 10 },
    { id: 'd4', cat: 'dao', name: '金刚不坏', desc: '体修之身气血上限逾五百', reward: { stones: 800 }, test: p => p.dao === 'body' && Stat.compute(p).maxHp >= 500 },
    { id: 'd5', cat: 'dao', name: '先手布阵', desc: '阵道之身历练二十五次', reward: { stones: 600 }, prog: p => `${Math.min(25, p.counters.explores || 0)}/25`, test: p => p.dao === 'array' && (p.counters.explores || 0) >= 25 },
    /* ---- 战斗 ---- */
    { id: 'b1', cat: 'battle', name: '初试锋芒', desc: '赢下第一场战斗', reward: { stones: 100 }, test: p => (p.counters.wins || 0) >= 1 },
    { id: 'b2', cat: 'battle', name: '十战十稳', desc: '赢下十场战斗', reward: { stones: 300 }, prog: p => `${Math.min(10, p.counters.wins || 0)}/10`, test: p => (p.counters.wins || 0) >= 10 },
    { id: 'b3', cat: 'battle', name: '百战老修', desc: '历经五十场战斗', reward: { fortune: 5 }, prog: p => `${Math.min(50, p.counters.battles || 0)}/50`, test: p => (p.counters.battles || 0) >= 50 },
    { id: 'b4', cat: 'battle', name: '精英克星', desc: '斩杀五尊精英妖魔', reward: { stones: 1000 }, prog: p => `${Math.min(5, p.counters.killsElite || 0)}/5`, test: p => (p.counters.killsElite || 0) >= 5 },
    { id: 'b5', cat: 'battle', name: '以武会友', desc: '与同道切磋一场', reward: { fortune: 2 }, test: p => (p.counters.spars || 0) >= 1 },
    { id: 'b6', cat: 'battle', name: '败而不馁', desc: '尝过败绩之后重夺三胜', reward: { fortune: 3 }, test: p => (p.counters.defeats || 0) >= 1 && (p.counters.wins || 0) >= 3 },
    /* ---- 奇遇 ---- */
    { id: 'e1', cat: 'exp', name: '第一桶金', desc: '灵石积蓄逾千', reward: { fortune: 3 }, test: p => this.stonesTotal(p) >= 1000 },
    { id: 'e2', cat: 'exp', name: '富甲一方', desc: '灵石积蓄逾十万', reward: { fortune: 8 }, test: p => this.stonesTotal(p) >= 100000 },
    { id: 'e3', cat: 'exp', name: '因果随身', desc: '孽障五十，因果如影随形', reward: { stones: 800 }, prog: p => `${Math.min(50, p.karma || 0)}/50`, test: p => (p.karma || 0) >= 50 },
    { id: 'e4', cat: 'exp', name: '福缘深厚', desc: '气运五十，天眷其身', reward: { stones: 1000 }, prog: p => `${Math.min(50, p.fortune || 0)}/50`, test: p => (p.fortune || 0) >= 50 },
    { id: 'e5', cat: 'exp', name: '秘境凯旋', desc: '击败秘境最深处的守关者', reward: { fortune: 10 }, test: p => (p.counters.bossKills || 0) >= 1 },
    { id: 'e6', cat: 'exp', name: '仙侣同途', desc: '与心悦之人结为道侣', reward: { fortune: 10 }, test: p => !!p.partner },
    /* ---- 转世 ---- */
    { id: 's1', cat: 'reinc', name: '窥见轮回', desc: '窥得兵解转世之机', reward: { stones: 500 }, test: p => !!p.canReincarnate },
    { id: 's2', cat: 'reinc', name: '轮回初醒', desc: '完成第一次兵解转世', reward: { fortune: 8 }, test: p => !!p.reinc },
    { id: 's3', cat: 'reinc', name: '宿命重逢', desc: '身负前世恩怨，与故人重逢', reward: { stones: 600 }, test: p => Object.values(p.npcs || {}).some(s => s.pastLife) },
    { id: 's4', cat: 'reinc', name: '三生三世', desc: '历经三世轮回', reward: { fortune: 15 }, test: p => p.reinc && (p.reinc.lives || 0) >= 3 },
    { id: 's5', cat: 'reinc', name: '印记斑驳', desc: '累计三枚轮回印记', reward: { fortune: 12 }, prog: p => `${Math.min(3, p.reinc ? (p.reinc.marks || 0) : 0)}/3`, test: p => p.reinc && (p.reinc.marks || 0) >= 3 },
    { id: 's6', cat: 'reinc', name: '宿慧渐开', desc: '转世之身历练十次', reward: { stones: 800 }, prog: p => `${Math.min(10, p.counters.explores || 0)}/10`, test: p => p.reinc && (p.counters.explores || 0) >= 10 },
    /* ---- v18 挑战成就 ---- */
    { id: 'c1', cat: 'battle', name: '无伤之道', desc: '在一场战斗中毫发无伤地获胜', reward: { fortune: 5 }, test: p => (p.counters.hitlessWins || 0) >= 1 },
    { id: 'c2', cat: 'battle', name: '雷霆之速', desc: '三回合内结束一场战斗', reward: { fortune: 8 }, test: p => (p.counters.quickWins || 0) >= 1 },
    { id: 'c3', cat: 'battle', name: '越境斩敌', desc: '以低于敌方的境界取胜', reward: { fortune: 12 }, test: p => (p.counters.upsetWins || 0) >= 1 },
    { id: 'c4', cat: 'exp', name: '驯兽大师', desc: '驯服五种不同种族的灵兽', reward: { stones: 1500 }, test: p => (p.counters.tameSpecies || 0) >= 5 },
    { id: 'c5', cat: 'exp', name: '秘境征服者', desc: '通关全部十座秘境', reward: { fortune: 15 }, test: p => (p.counters.dungeonClears || 0) >= 10 },
  ],
  /** 每次行动收尾时检查：解锁则发奖并播报 */
  check() {
    const p = Game.player;
    if (!p || p.dead) return;
    const got = Meta.data.achv;
    const unlocked = [];
    for (const d of this.DEFS) {
      if (got[d.id]) continue;
      let ok = false;
      try { ok = d.test(p); } catch (e) { ok = false; }
      if (ok) unlocked.push(d);
    }
    if (!unlocked.length) return;
    for (const d of unlocked) {
      got[d.id] = Math.floor(p.day);
      if (d.reward.stones) Bag.addStones(d.reward.stones);
      if (d.reward.fortune) KarmaSys.addFortune(d.reward.fortune, true);
      Log.add(`✦ 成就达成 <b>【${d.name}】</b>——${d.desc}。（${this.rewardText(d.reward)}）`, 'system');
      UI.toast(`成就达成：${d.name}`);
    }
    Meta.save();
    UI.renderAll();
    Save.autoSave();
  },
};
