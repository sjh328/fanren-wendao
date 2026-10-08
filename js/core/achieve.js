
/* ======================================================================
 * §1.10 增量扩展（v6）：成就系统 Achieve（66 项常规 + 10 项隐藏，随版本追加；
 * 含境界九档/职业/战斗/奇遇/转世/经营/大比/天塔/终章/v42 鼎新四项/隐藏）
 * v42（E499）成就梯度：DEFS 带 rare 分（1~3）——成就积分 = Σ已达成 rare，缓存于
 * Meta.codex.achvPts（既有容器），里程碑 50/100/150 发限定称号（flavor-v42 concat 进
 * TITLES）与气运小赏，一次性不重发（Meta.codex.achvMile 记忆）；隐藏成就未达成
 * name/desc 显示「??？」（getter 按 Meta 活读，达成后显真容，旧渲染链零改动）。
 * 完成奖励少量气运或灵石；进度存于 Meta，随档、转世不重置。
 * ====================================================================== */
const Achieve = {
  CATS: { realm: '境界', dao: '职业', battle: '战斗', exp: '奇遇', reinc: '转世' },
  stonesTotal(p) { return Bag.stonesTotal(p); },   // v39（E365）：转调 Bag 单源
  rewardText(r) { return r.fortune ? `气运 +${r.fortune}` : `灵石 +${Utils.fmtNum(r.stones)}`; },
  /** v42（E499）：成就积分 = Σrare（已达成项 rare 分之和，缺省 1）——实时精算，写档仅作缓存 */
  points() {
    const got = (typeof Meta !== 'undefined' && Meta.data && Meta.data.achv) || {};
    let s = 0;
    for (const d of this.DEFS) if (got[d.id]) s += d.rare || 1;
    return s;
  },
  /** v42（E499）：积分里程碑表 [分值, 气运小赏]——限定称号条目由 flavor-v42.js concat 进 TITLES */
  MILESTONES: [[50, 5], [100, 8], [150, 12]],
  /** v29：成就灵石奖励随境界经济缩放——固定面值在大后期形同虚设 */
  rewardOf(d, p) {
    const r = { ...d.reward };
    if (r.stones) r.stones = Math.round(r.stones * GameData.stoneEco(Math.min(6, p ? p.realmIdx || 0 : 0)));
    return r;
  },
  DEFS: [
    /* ---- 境界 ---- */
    { id: 'r1', cat: 'realm', name: '初入道途', desc: '突破至筑基期', rare: 1, reward: { fortune: 3 }, test: p => p.realmIdx >= 1 },
    { id: 'r2', cat: 'realm', name: '金丹大道', desc: '突破至金丹期', rare: 1, reward: { fortune: 5 }, test: p => p.realmIdx >= 2 },
    { id: 'r3', cat: 'realm', name: '元婴出窍', desc: '突破至元婴期', rare: 1, reward: { fortune: 8 }, test: p => p.realmIdx >= 3 },
    { id: 'r4', cat: 'realm', name: '化神通玄', desc: '突破至化神期', rare: 2, reward: { fortune: 10 }, test: p => p.realmIdx >= 4 },
    { id: 'r4b', cat: 'realm', name: '炼虚合道', desc: '突破至炼虚期', rare: 2, reward: { fortune: 12 }, test: p => p.realmIdx >= 5 },   // v24 补档
    { id: 'r5', cat: 'realm', name: '合体无为', desc: '突破至合体期', rare: 2, reward: { fortune: 13 }, test: p => p.realmIdx >= 6 },
    { id: 'r5b', cat: 'realm', name: '大乘渐满', desc: '突破至大乘期', rare: 2, reward: { fortune: 14 }, test: p => p.realmIdx >= 7 },   // v24 补档
    { id: 'r5c', cat: 'realm', name: '劫火淬身', desc: '突破至渡劫期', rare: 2, reward: { fortune: 16 }, test: p => p.realmIdx >= 8 },   // v24 补档
    { id: 'r6', cat: 'realm', name: '真仙之体', desc: '修至真仙期', rare: 3, reward: { fortune: 20 }, test: p => p.realmIdx >= 9 },
    /* ---- 职业 ---- */
    { id: 'd0', cat: 'dao', name: '道途初定', desc: '择定第一条大道', rare: 1, reward: { stones: 200 }, test: p => !!p.dao },
    { id: 'd1', cat: 'dao', name: '剑心桀骜', desc: '剑修之身赢下十五场战斗', rare: 2, reward: { stones: 800 }, prog: p => `${Math.min(15, p.counters.wins || 0)}/15`, test: p => p.dao === 'sword' && (p.counters.wins || 0) >= 15 },
    { id: 'd2', cat: 'dao', name: '丹道藏珍', desc: '丹道之身同时藏有三种丹药', rare: 2, reward: { stones: 600 }, test: p => p.dao === 'pill' && Object.keys(p.bag).filter(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'pill').length >= 3 },
    { id: 'd3', cat: 'dao', name: '笔落惊雷', desc: '符修之身藏符十张', rare: 2, reward: { stones: 600 }, prog: p => `${Math.min(10, Object.entries(p.bag).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman').reduce((s, [, n]) => s + n, 0))}/10`, test: p => p.dao === 'talisman' && Object.entries(p.bag).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman').reduce((s, [, n]) => s + n, 0) >= 10 },
    { id: 'd4', cat: 'dao', name: '金刚不坏', desc: '体修之身气血上限逾五百', rare: 2, reward: { stones: 800 }, test: p => p.dao === 'body' && Stat.compute(p).maxHp >= 500 },
    { id: 'd5', cat: 'dao', name: '先手布阵', desc: '阵道之身历练二十五次', rare: 2, reward: { stones: 600 }, prog: p => `${Math.min(25, p.counters.explores || 0)}/25`, test: p => p.dao === 'array' && (p.counters.explores || 0) >= 25 },
    /* ---- 战斗 ---- */
    { id: 'b1', cat: 'battle', name: '初试锋芒', desc: '赢下第一场战斗', rare: 1, reward: { stones: 100 }, test: p => (p.counters.wins || 0) >= 1 },
    { id: 'b2', cat: 'battle', name: '十战十稳', desc: '赢下十场战斗', rare: 1, reward: { stones: 300 }, prog: p => `${Math.min(10, p.counters.wins || 0)}/10`, test: p => (p.counters.wins || 0) >= 10 },
    { id: 'b3', cat: 'battle', name: '百战老修', desc: '历经五十场战斗', rare: 2, reward: { fortune: 5 }, prog: p => `${Math.min(50, p.counters.battles || 0)}/50`, test: p => (p.counters.battles || 0) >= 50 },
    { id: 'b4', cat: 'battle', name: '精英克星', desc: '斩杀五尊精英妖魔', rare: 2, reward: { stones: 1000 }, prog: p => `${Math.min(5, p.counters.killsElite || 0)}/5`, test: p => (p.counters.killsElite || 0) >= 5 },
    { id: 'b5', cat: 'battle', name: '以武会友', desc: '与同道切磋一场', rare: 1, reward: { fortune: 2 }, test: p => (p.counters.spars || 0) >= 1 },
    { id: 'b6', cat: 'battle', name: '败而不馁', desc: '尝过败绩之后重夺三胜', rare: 2, reward: { fortune: 3 }, test: p => (p.counters.defeats || 0) >= 1 && (p.counters.wins || 0) >= 3 },
    /* ---- 奇遇 ---- */
    { id: 'e1', cat: 'exp', name: '第一桶金', desc: '灵石积蓄逾千', rare: 1, reward: { fortune: 3 }, test: p => Achieve.stonesTotal(p) >= 1000 },   // v32 修瑕（A11）：原 this 在顶层对象字面量里指向 window——调用必抛 TypeError 被 check 吞掉，成就永不解锁
    { id: 'e2', cat: 'exp', name: '富甲一方', desc: '灵石积蓄逾十万', rare: 2, reward: { fortune: 8 }, test: p => Achieve.stonesTotal(p) >= 100000 },
    { id: 'e3', cat: 'exp', name: '因果随身', desc: '孽障五十，因果如影随形', rare: 1, reward: { stones: 800 }, prog: p => `${Math.min(50, p.karma || 0)}/50`, test: p => (p.karma || 0) >= 50 },
    { id: 'e4', cat: 'exp', name: '福缘深厚', desc: '气运五十，天眷其身', rare: 2, reward: { stones: 1000 }, prog: p => `${Math.min(50, p.fortune || 0)}/50`, test: p => (p.fortune || 0) >= 50 },
    { id: 'e5', cat: 'exp', name: '秘境凯旋', desc: '击败秘境最深处的守关者', rare: 2, reward: { fortune: 10 }, test: p => (p.counters.bossKills || 0) >= 1 },
    { id: 'e6', cat: 'exp', name: '仙侣同途', desc: '与心悦之人结为道侣', rare: 2, reward: { fortune: 10 }, test: p => !!p.partner },
    /* ---- 转世 ---- */
    { id: 's1', cat: 'reinc', name: '窥见轮回', desc: '窥得兵解转世之机', rare: 1, reward: { stones: 500 }, test: p => !!p.canReincarnate },
    { id: 's2', cat: 'reinc', name: '轮回初醒', desc: '完成第一次兵解转世', rare: 2, reward: { fortune: 8 }, test: p => !!p.reinc && !p.reinc.firstLife },   // v35（E180）：首世印记轻量 reinc 不算兵解
    { id: 's3', cat: 'reinc', name: '宿命重逢', desc: '身负前世恩怨，与故人重逢', rare: 2, reward: { stones: 600 }, test: p => Object.values(p.npcs || {}).some(s => s.pastLife) },
    { id: 's4', cat: 'reinc', name: '三生三世', desc: '历经三世轮回', rare: 3, reward: { fortune: 15 }, test: p => p.reinc && (p.reinc.lives || 0) >= 3 },
    { id: 's5', cat: 'reinc', name: '印记斑驳', desc: '累计三枚轮回印记', rare: 2, reward: { fortune: 12 }, prog: p => `${Math.min(3, p.reinc ? (p.reinc.marks || 0) : 0)}/3`, test: p => p.reinc && (p.reinc.marks || 0) >= 3 },
    { id: 's6', cat: 'reinc', name: '宿慧渐开', desc: '转世之身历练十次', rare: 2, reward: { stones: 800 }, prog: p => `${Math.min(10, p.counters.explores || 0)}/10`, test: p => !!p.reinc && !p.reinc.firstLife && (p.counters.explores || 0) >= 10 },
    /* ---- v18 挑战成就 ---- */
    { id: 'c1', cat: 'battle', name: '无伤之道', desc: '在一场战斗中毫发无伤地获胜', rare: 2, reward: { fortune: 5 }, test: p => (p.counters.hitlessWins || 0) >= 1 },
    { id: 'c2', cat: 'battle', name: '雷霆之速', desc: '三回合内结束一场战斗', rare: 2, reward: { fortune: 8 }, test: p => (p.counters.quickWins || 0) >= 1 },
    { id: 'c3', cat: 'battle', name: '越境斩敌', desc: '以低于敌方的境界取胜', rare: 3, reward: { fortune: 12 }, test: p => (p.counters.upsetWins || 0) >= 1 },
    { id: 'c4', cat: 'exp', name: '驯兽大师', desc: '驯服五种不同种族的灵兽', rare: 2, reward: { stones: 1500 }, test: p => (p.counters.tameSpecies || 0) >= 5 },
    { id: 'c5', cat: 'exp', name: '秘境征服者', desc: '通关全部十座秘境', rare: 3, reward: { fortune: 15 }, test: p => (p.counters.dungeonClears || 0) >= 10 },
    /* ---- v20 经营与挑战成就（+12） ---- */
    { id: 'v1', cat: 'exp', name: '丹炉百炼', desc: '炼丹成丹一百炉', rare: 2, reward: { stones: 3000 }, prog: p => `${Math.min(100, (p.counters.craftsOk || 0))}/100`, test: p => (p.counters.craftsOk || 0) >= 100 },
    { id: 'v2', cat: 'exp', name: '画符千张', desc: '累计画符五十轮', rare: 2, reward: { stones: 2000 }, prog: p => `${Math.min(50, (p.counters.talRounds || 0))}/50`, test: p => (p.counters.talRounds || 0) >= 50 },
    { id: 'v3', cat: 'exp', name: '灵田大丰', desc: '收获作物三十次', rare: 2, reward: { stones: 2000 }, prog: p => `${Math.min(30, (p.counters.harvests || 0))}/30`, test: p => (p.counters.harvests || 0) >= 30 },
    { id: 'v4', cat: 'exp', name: '斗兽常客', desc: '斗兽场累计十胜', rare: 2, reward: { fortune: 8 }, prog: p => `${Math.min(10, (p.counters.arenaWins || 0))}/10`, test: p => (p.counters.arenaWins || 0) >= 10 },
    { id: 'v5', cat: 'battle', name: '无伤渡劫', desc: '渡劫成功时气血满盈', rare: 3, reward: { fortune: 12 }, test: p => (p.flags && p.flags.tribFullHp) || false },
    { id: 'v6', cat: 'battle', name: '残血翻盘', desc: '气血低于一成时反败为胜', rare: 3, reward: { fortune: 10 }, test: p => (p.counters.lowHpWins || 0) >= 1 },
    { id: 'v7', cat: 'battle', name: '一夜屠魔', desc: '单场战斗输出逾自身攻击百倍', rare: 3, reward: { fortune: 10 }, test: p => (p.counters.bigOut || 0) >= 1 },
    { id: 'v8', cat: 'battle', name: '破招行家', desc: '破招打断蓄力十次', rare: 2, reward: { stones: 2500 }, prog: p => `${Math.min(10, (p.counters.breaks || 0))}/10`, test: p => (p.counters.breaks || 0) >= 10 },
    { id: 'v9', cat: 'reinc', name: '宿命轮回', desc: '历经五世轮回', rare: 3, reward: { fortune: 20 }, prog: p => `${Math.min(5, p.reinc ? (p.reinc.lives || 0) : 0)}/5`, test: p => p.reinc && (p.reinc.lives || 0) >= 5 },
    { id: 'v10', cat: 'reinc', name: '印记如星', desc: '累计十枚轮回印记', rare: 3, reward: { fortune: 18 }, prog: p => `${Math.min(10, p.reinc ? (p.reinc.marks || 0) : 0)}/10`, test: p => p.reinc && (p.reinc.marks || 0) >= 10 },
    { id: 'v11', cat: 'dao', name: '道韵全通', desc: '同时激活四条道韵', rare: 3, reward: { fortune: 12 }, test: p => (typeof Stat !== 'undefined' && Stat.activeDaoYun(p).length) >= 4 },
    { id: 'v12', cat: 'dao', name: '奥义宗师', desc: '三部功法修至大成', rare: 3, reward: { fortune: 10 }, test: p => Object.entries(p.gongfa || {}).filter(([id, g]) => GameData.ITEMS[id] && g.level >= GongfaSys.maxLevel(GameData.ITEMS[id])).length >= 3 },
    /* ---- v22 宗门大比 ---- */
    { id: 'w1', cat: 'battle', name: '大比魁首', desc: '于宗门大比三轮全胜夺魁', rare: 2, reward: { fortune: 10 }, test: p => (p.flags && p.flags.tourneyChamp) || false },
    /* ---- v25 登天塔与真仙终章 ---- */
    { id: 'tw1', cat: 'battle', name: '初登天塔', desc: '登天塔抵达第五层', rare: 1, reward: { stones: 800 }, prog: p => `${Math.min(5, p.counters.towerBest || 0)}/5`, test: p => (p.counters.towerBest || 0) >= 5 },
    { id: 'tw2', cat: 'battle', name: '拾级而上', desc: '登天塔抵达第十二层', rare: 2, reward: { fortune: 6 }, prog: p => `${Math.min(12, p.counters.towerBest || 0)}/12`, test: p => (p.counters.towerBest || 0) >= 12 },
    { id: 'tw3', cat: 'battle', name: '塔影同高', desc: '登天塔抵达第二十层', rare: 2, reward: { fortune: 10 }, prog: p => `${Math.min(20, p.counters.towerBest || 0)}/20`, test: p => (p.counters.towerBest || 0) >= 20 },
    { id: 'tw4', cat: 'battle', name: '塔顶之风', desc: '登天塔抵达第三十层', rare: 3, reward: { fortune: 15 }, prog: p => `${Math.min(30, p.counters.towerBest || 0)}/30`, test: p => (p.counters.towerBest || 0) >= 30 },
    { id: 'c10a', cat: 'exp', name: '仙门之外', desc: '踏出仙门，亲见门后天地', rare: 3, reward: { fortune: 20 }, test: p => (p.flags && p.flags.beyondGate) || false },
    /* ---- v31 成就扩容 ---- */
    { id: 'x1', cat: 'exp', name: '洞天福地', desc: '洞天营造至二重', rare: 2, reward: { fortune: 8 }, prog: p => `${Math.min(2, (p.cave && p.cave.dongtian) || 0)}/2`, test: p => (p.cave && (p.cave.dongtian || 0) >= 2) },
    { id: 'x2', cat: 'dao', name: '本命通灵', desc: '本命法宝喂养至五阶', rare: 2, reward: { stones: 5000 }, prog: p => `${Math.min(5, (p.benming && p.benming.lv) || 0)}/5`, test: p => ((p.benming && p.benming.lv) || 0) >= 5 },
    { id: 'x3', cat: 'reinc', name: '仙籍有名', desc: '白日飞升后落名仙籍', rare: 2, reward: { fortune: 15 }, test: p => (p.xianjie && (p.xianjie.idx || 0) >= 1) },
    { id: 'x4', cat: 'realm', name: '大罗之巅', desc: '证得大罗仙位', rare: 3, reward: { fortune: 25 }, test: p => (p.xianjie && (p.xianjie.idx || 0) >= 4) },
    { id: 'x5', cat: 'exp', name: '侠名远播', desc: '声望达一百', rare: 2, reward: { stones: 4000 }, prog: p => `${Math.min(100, (p.reputation || 0))}/100`, test: p => (p.reputation || 0) >= 100 },
    { id: 'x6', cat: 'battle', name: '派系中人', desc: '在宗门派系之争中站队', rare: 2, reward: { stones: 1500 }, test: p => !!(p.sect && p.sect.faction) },
    /* ---- v42（P3 整合·接缝自查跨系统钩子）鼎新玩法成就（+4）——本版旗舰新内容入册；
     *  扫荡计次挂 counters.sweeps 子键（E522 写点 explore.js sweep5，counters 子键不入 field-audit 顶层扫描）---- */
    { id: 'nw1', cat: 'exp', name: '别有洞天', desc: '开辟一方随身小世界', rare: 2, reward: { fortune: 10 }, test: p => (p.xianjie && (p.xianjie.worlds || []).length >= 1) },   // v42（E520）
    { id: 'nw2', cat: 'exp', name: '秘藏有灵', desc: '一次秘境行中携得三枚秘藏遗物', rare: 2, reward: { fortune: 8 }, test: p => !!(p.dungeon && Array.isArray(p.dungeon.relics) && p.dungeon.relics.length >= 3) },   // v42（E521·本局遗物集，出秘境自然消散故限「一次秘境行」）
    { id: 'nw3', cat: 'battle', name: '一念定胜负', desc: '同图三连胜后完成一次同带扫荡', rare: 2, reward: { fortune: 8 }, prog: p => `${Math.min(1, p.counters.sweeps || 0)}/1`, test: p => (p.counters.sweeps || 0) >= 1 },   // v42（E522）
    { id: 'nw4', cat: 'reinc', name: '前世今生', desc: '与前世故人执手相认', rare: 3, reward: { fortune: 15 }, test: p => Object.values(p.npcs || {}).some(s => s && s.bondAccepted) },   // v42（E523）
    /* ---- v42（E499）隐藏成就（+10）——未达成 name/desc 显示「??？」（getter 按 Meta 活读，
     *  达成后显真容；rare 均为 2~3 高分，凑积分里程碑的主要洼地）---- */
    { id: 'h1', cat: 'battle', hidden: true, rare: 3, reward: { fortune: 20 }, get name() { return (Meta.data.achv && Meta.data.achv.h1) ? '不动如山' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h1) ? '累计十场战斗毫发无伤地获胜' : '??？'; }, test: p => (p.counters.hitlessWins || 0) >= 10 },
    { id: 'h2', cat: 'battle', hidden: true, rare: 3, reward: { fortune: 20 }, get name() { return (Meta.data.achv && Meta.data.achv.h2) ? '迅雷之影' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h2) ? '累计十场战斗三回合内取胜' : '??？'; }, test: p => (p.counters.quickWins || 0) >= 10 },
    { id: 'h3', cat: 'battle', hidden: true, rare: 3, reward: { fortune: 22 }, get name() { return (Meta.data.achv && Meta.data.achv.h3) ? '以下克上' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h3) ? '累计十场以低于敌方的境界取胜' : '??？'; }, test: p => (p.counters.upsetWins || 0) >= 10 },
    { id: 'h4', cat: 'battle', hidden: true, rare: 2, reward: { fortune: 15 }, get name() { return (Meta.data.achv && Meta.data.achv.h4) ? '血战余勇' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h4) ? '累计五场残血反败为胜' : '??？'; }, test: p => (p.counters.lowHpWins || 0) >= 5 },
    { id: 'h5', cat: 'exp', hidden: true, rare: 3, reward: { stones: 12000 }, get name() { return (Meta.data.achv && Meta.data.achv.h5) ? '丹道通神' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h5) ? '炼丹成丹五百炉' : '??？'; }, test: p => (p.counters.craftsOk || 0) >= 500 },
    { id: 'h6', cat: 'exp', hidden: true, rare: 3, reward: { fortune: 25 }, get name() { return (Meta.data.achv && Meta.data.achv.h6) ? '踏遍山河' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h6) ? '累计游历一千次' : '??？'; }, test: p => (p.counters.explores || 0) >= 1000 },
    { id: 'h7', cat: 'battle', hidden: true, rare: 3, reward: { fortune: 25 }, get name() { return (Meta.data.achv && Meta.data.achv.h7) ? '塔外之天' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h7) ? '登天塔抵达第四十层' : '??？'; }, test: p => (p.counters.towerBest || 0) >= 40 },
    { id: 'h8', cat: 'reinc', hidden: true, rare: 3, reward: { fortune: 30 }, get name() { return (Meta.data.achv && Meta.data.achv.h8) ? '九世问道' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h8) ? '历经九世轮回' : '??？'; }, test: p => p.reinc && (p.reinc.lives || 0) >= 9 },
    { id: 'h9', cat: 'exp', hidden: true, rare: 2, reward: { fortune: 18 }, get name() { return (Meta.data.achv && Meta.data.achv.h9) ? '金兰满座' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h9) ? '与三位同道结为金兰' : '??？'; }, test: p => (p.sworn || []).length >= 3 },
    { id: 'h10', cat: 'realm', hidden: true, rare: 3, reward: { fortune: 35 }, get name() { return (Meta.data.achv && Meta.data.achv.h10) ? '道祖之尊' : '??？'; }, get desc() { return (Meta.data.achv && Meta.data.achv.h10) ? '证得道祖之境' : '??？'; }, test: p => !!(p.flags && p.flags.daozu) },
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
      try { ok = d.test(p); } catch (e) { ok = false; console.warn('成就判定异常:', d.id, e); }   // v32（A11）：静默吞异常曾掩盖「死成就」
      if (ok) unlocked.push(d);
    }
    if (!unlocked.length) return;
    for (const d of unlocked) {
      got[d.id] = Math.floor(p.day);
      const rw = this.rewardOf(d, p);
      if (rw.stones) Bag.addStones(rw.stones);
      if (rw.fortune) KarmaSys.addFortune(rw.fortune, true);
      Log.add(`✦ 成就达成 <b>【${d.name}】</b>——${d.desc}。（${this.rewardText(rw)}）`, 'system');
      UI.toast(`成就达成：${d.name}`);
    }
    // v42（E499）：成就积分缓存入 Meta.codex（既有容器，export/import 的 Object.assign 通道自动透传）；
    // 里程碑 50/100/150 一次性发限定称号入录提示 + 气运小赏（Meta.codex.achvMile 记忆防重发）
    try {
      Meta.data.codex.achvPts = this.points();
      const mile = Meta.data.codex.achvMile || 0;
      for (const [m, ft] of this.MILESTONES) {
        if (Meta.data.codex.achvPts >= m && mile < m) {
          Meta.data.codex.achvMile = m;
          KarmaSys.addFortune(ft, true);
          Log.add(`✦ 成就积分跨过 <b>${m}</b>——限定称号已入称号录，气运 +${ft}。`, 'system');
          UI.toast(`成就积分 ${m}：限定称号解锁`);
        }
      }
    } catch (e) { console.warn('成就积分结算异常:', e); }
    Meta.save();
    // v34（E126）：check 唯一调用点在 afterAction 内且已先于其渲染/存档（v34 调序）——
    // 此处不再自渲染自存档（原 markDirty×3 + renderAll + autoSave 在同一次行动里全为重复功）
  },
};
