
/* ======================================================================
 * §11.6 v13 洞府经营 CaveSys（聚灵阵 / 灵田种植 / 兽栏）
 * 筑基解锁「洞府」页签：洞府每升一级，修炼效率 +4%、灵田 +1 块（上限 8）、兽栏 +1 位。
 * 灵田：播种（种子=type:'seed'）→ 按游戏日生长 → 成熟收获；过熟 20 日后收获减半。
 * ====================================================================== */
const CaveSys = {
  MAX_LV: 5,
  /** v19 洞府建筑：灵兽窝（兽栏+2/级）/ 演武场（攻防+2%/级）/ 藏经室（参悟+20%/级），各至三阶 */
  BUILDS: [
    { id: 'beast', name: '灵兽窝', icon: '🐾', desc: '兽栏位 +2/阶，灵兽居所愈发宽裕。' },
    { id: 'train', name: '演武场', icon: '⚔', desc: '演武淬体：攻击、防御 +2%/阶。' },
    { id: 'lib',   name: '藏经室', icon: '📖', desc: '藏经参悟：功法参悟所得 +20%/阶。' },
    /* ---- v20 营造扩容 ---- */
    { id: 'forge',    name: '炼器室', icon: '⚒', desc: '炉火纯青：炼器成器率 +4%/阶。' },
    { id: 'spring',   name: '灵泉',   icon: '⛲', desc: '每日涌出灵石：80 × 阶 × 境界系数（六境封顶），自动入账。' },   // v33（E108）：描述补齐封顶口径（实现为 min(6, realm)，防「后期灵泉失灵」误解）
    { id: 'treasury', name: '藏宝阁', icon: '💎', desc: '聚财有道：灵石获取 +3%/阶。' },
  ],
  BUILD_KEYS: ['beast', 'train', 'lib', 'forge', 'spring', 'treasury'],
  buildLv(p, id) { return (p.cave && p.cave.builds && p.cave.builds[id]) || 0; },
  /** v38（E337）：磐岩谷【营造匠心】——营造/洞天/扩建费用 85 折 */
  costMul(p) { return (p.sect && p.sect.id === 'panyan') ? 0.85 : 1; },
  buildCost(p, id) {
    const lv = this.buildLv(p, id);
    // v30：曲线族统一（原 2^min(4,r) 封顶 r4，与同族 2.2^r 不一致；r7+ 相对贬值 >99%）
    return { stones: Math.round(4000 * Math.pow(3, lv) * GameData.sinkCurve(p.realmIdx) / 16 * this.costMul(p)), ore: 4 + lv * 3 };
  },
  async upgradeBuild(id) {
    const p = Game.player;
    if (!p.cave) { UI.toast('洞府尚未开辟'); return; }
    const def = this.BUILDS.find(b => b.id === id);
    if (!def) return;
    const lv = this.buildLv(p, id);
    if (lv >= 3) { UI.toast('此建筑已至三阶圆满'); return; }
    if (!p.cave.builds) p.cave.builds = { beast: 0, train: 0, lib: 0 };
    const c = this.buildCost(p, id);
    const ok = await UI.popup({
      title: `${def.name} · ${lv ? '升' : '建'}至${['', '一', '二', '三'][lv + 1]}阶`,
      html: `${def.icon} ${def.desc}<br>需灵石 <span class="hl">${Utils.fmtNum(c.stones)}</span> 与【玄铁矿】×${c.ore}。`,
      options: [{ text: '兴土木', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (Bag.count('m_xuantie') < c.ore) { UI.toast('玄铁矿不足'); return; }
    if (!Bag.spendStones(c.stones)) { UI.toast('灵石不足'); return; }
    Bag.removeItem('m_xuantie', c.ore);
    p.cave.builds[id] = lv + 1;
    Log.add(`洞府【<b>${def.name}</b>】${lv ? '扩' : '落'}成${['', '一', '二', '三'][lv + 1]}阶！${def.desc}`, 'gain');
    Story.chron(`洞府 ${def.name} 成${['', '一', '二', '三'][lv + 1]}阶`);
    Ambience.sfx('forge');
    Game.afterAction();
  },
  /** 洞府加成（Stat.compute 调用）：修炼效率 +4%/级；炼丹房（v18：每级+5%成丹率） */
  cultBonus(p) { return p.cave ? p.cave.lv * 4 + (p.cave.dongtian || 0) * 3 : 0; },   // v30：洞天营造每层修炼 +3%
  /** v30 洞天营造：洞府五层之上再辟洞天（至四重）——r6+ 全幅缩放的灵石沉淀池 */
  DONGTIAN_MAX: 4,
  DONGTIAN_NAMES: ['洞天未辟', '一重 · 灵潮洞天', '二重 · 星槎洞天', '三重 · 太虚洞天', '四重 · 大罗洞天'],
  dongtianCost(p) {
    const lv = (p.cave && p.cave.dongtian) || 0;
    return { stones: Math.round(4000 * Math.pow(3, lv) * GameData.sinkCurve(p.realmIdx) * this.costMul(p)), ore: 20 + lv * 10 };
  },
  /** v30：洞府卡内「营造洞天」区块 */
  dongtianRow(p) {
    const lv = (p.cave && p.cave.dongtian) || 0;
    const c = this.dongtianCost(p);
    const maxed = lv >= this.DONGTIAN_MAX;
    const needCave = p.cave && p.cave.lv < this.MAX_LV;
    return `<div class="shop-section-title" style="margin-top:8px">◈ 洞天营造 <span class="tag magic">${this.DONGTIAN_NAMES[lv]}</span></div>
      <div class="tip-line">· 五层之上再辟洞天：每重修炼效率 +3%（现 +${lv * 3}%）。${needCave ? '（须先扩洞府至五层）' : ''}</div>
      ${maxed || needCave ? '' : `<div class="action-row"><button class="btn btn-primary" data-action="act-cave-dongtian">营造下一重（${Utils.fmtNum(c.stones)}灵石 · 玄铁矿 ×${c.ore}）</button></div>`}`;
  },
  async upgradeDongtian() {
    const p = Game.player;
    if (!p.cave) { UI.toast('洞府尚未开辟'); return; }
    if ((p.cave.dongtian || 0) >= this.DONGTIAN_MAX) { UI.toast('洞天已至四重，造化之极'); return; }
    if (p.cave.lv < this.MAX_LV) { UI.toast('须先将洞府扩至五层，方可营造洞天'); return; }
    const c = this.dongtianCost(p);
    const next = this.DONGTIAN_NAMES[(p.cave.dongtian || 0) + 1];
    const ok = await UI.popup({
      title: `洞天营造 · ${next}`,
      html: `洞府五层之上再辟洞天——每重洞天：修炼效率 <b>+3%</b>，聚灵之气更胜一层。<br>
        需灵石 <span class="hl">${Utils.fmtNum(c.stones)}</span>、玄铁矿 ×${c.ore}。`,
      options: [{ text: '营 造', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    // v34（E114）：先验材料再扣灵石——原顺序矿不足时灵石已扣、洞天未成（白扣不退），对齐 upgrade() 口径
    if (Bag.count('m_xuantie') < c.ore) { UI.toast('玄铁矿不足'); return; }
    if (!Bag.spendStones(c.stones)) { UI.toast('灵石不足'); return; }
    Bag.removeItem('m_xuantie', c.ore);
    p.cave.dongtian = (p.cave.dongtian || 0) + 1;
    Log.add(`洞天已成——【<b>${this.DONGTIAN_NAMES[p.cave.dongtian]}</b>】虚境张开，灵潮自天外来投（修炼效率 +3%）。`, 'realm');
    UI.announce('✦ 洞天营造 · 功成', 'gold');
    Game.afterAction();
  },
  pillBonus(p) { return p.cave ? p.cave.lv * 5 : 0; },
  /** v18：访客事件（每日第一次进入洞府时触发）；v27 auto=离线回放模式（不回环 afterAction） */
  visitorEvent(p, auto = false) {
    if (!p.cave || p.cave._visitorDay === Math.floor(p.day)) return;
    // v30：离线回放静默（30 日离线曾一口气灌 30 条访客日志，与 v27「auto 从简」不符）
    p.cave._visitorDay = Math.floor(p.day);
    // v28 联动：福缘深厚者，来访更频（气运每点 +0.5% 触发率）
    if (!Utils.chance(15 * (typeof KarmaSys !== 'undefined' && KarmaSys.goodEventMult ? KarmaSys.goodEventMult(p) : 1))) return;
    const events = [
      { text: '一位散修前来拜访，与你论道半日，颇有收获。（感悟 +2）', fn: () => { Cultivate.addInsight(p, 2, false); } },
      { text: '一只灵鹤衔来一枚灵果，落在你的洞府门前。（灵芝 +1）', fn: () => { Bag.addItem('m_lingzhi', 1); } },
      { text: '一位同门前来切磋，点到为止，助你精进。', fn: () => { Cultivate.addExp(p, Math.round(20 * GameData.eco(p.realmIdx))); } },
      /* ---- v19 访客扩充 ---- */
      { text: '坊市货郎路过，捎来一袋打折的玄铁矿——半卖半送。（玄铁矿 +2）', fn: () => { Bag.addItem('m_xuantie', 2); } },
      { text: '一位符师登门讨茶，临走留下一张手绘护身符以谢茶资。（金光符 +1）', fn: () => { Bag.addItem('tal_jinguang', 1); } },
      { text: '夜半有琴音自山间传来，你听了一夜，晨起神清气爽。（修为 +若干）', fn: () => { Cultivate.addExp(p, Math.round(45 * GameData.eco(p.realmIdx))); } },
      { text: '一只走失的灵犬赖在你门前不走，你喂了它三日，它衔来一枚妖兽内丹作谢。（妖兽内丹 +1）', fn: () => { Bag.addItem('m_neidan', 1); } },
      { text: '有人影在你洞府外徘徊——是暗处的眼睛又来了？（心魔 +2，玄影客的视线）', fn: () => { if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 2, '洞府外的视线'); } },
    ];
    // v19 好友来访：关系最好且相识的修士携礼登门
    const friendIds = Object.keys(p.npcs || {}).filter(id => p.npcs[id].alive && p.npcs[id].met && p.npcs[id].rel >= 30);
    if (friendIds.length) {
      const fid = friendIds.sort((a, b) => p.npcs[b].rel - p.npcs[a].rel)[0];
      const nd = NpcSys.def(fid);
      if (nd) events.push({ text: `${nd.name} 云游至此，登门一叙，临别赠礼。（交情微增，共同记忆 +1）`, fn: () => {
        const st2 = NpcSys.state(p, fid);
        if (st2) { st2.rel = Utils.clamp(st2.rel + 2, -100, 100); NpcSys.mem(p, fid, 'story', '洞府来访'); }
      } });
      // v28 联动：莫逆之交（rel≥60）登门备厚礼——交情深度第一次反哺洞府日常
      const bestie = friendIds.map(id => p.npcs[id]).find(s2 => s2.rel >= 60);
      if (bestie) {
        const bid = friendIds.find(id => p.npcs[id].rel >= 60);
        const bnd = NpcSys.def(bid);
        if (bnd) events.push({ text: `${bnd.name} 携厚礼远道而来——莫逆之交，不寻常礼。（上品灵材 ×1、灵石若干）`, fn: () => {
          const st2 = NpcSys.state(p, bid);
          if (st2) { st2.rel = Utils.clamp(st2.rel + 3, -100, 100); NpcSys.mem(p, bid, 'story', '厚礼登门'); }
          const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 2, 1, 5);
          Bag.addItem(Utils.pick(GameData.matsByTier(tier)), 1);
          Bag.addStones(Math.round(80 * GameData.stoneEco(p.realmIdx)));
        } });
      }
    }
    const ev = Utils.pick(events);
    ev.fn();
    if (!auto) Log.add(`【洞府访客】${ev.text}`, 'info');   // v30：离线回放静默（30 日离线曾灌 30 条日志）
    // v32 修瑕（E62）：回环 afterAction 拆除——visitorEvent 由 dailySettle 调用，而 dailySettle
    // 在 afterAction 尾部，此处再调 afterAction 曾使整条收尾链（渲染/存档/成就/日更）双跑一遍
  },
  /** v38（E338）：藏宝阁——每月凝一缕「寻宝灵机」（灵机入身，下次探索必遇宝箱且收获更丰） */
  treasuryDaily(p, auto = false) {
    if (!p.cave || !p.cave.builds || !p.cave.builds.treasury) return;
    const mk = Math.floor((p.day || 0) / 30);
    if ((p.cave._tmapMonth || -1) >= mk) return;
    p.cave._tmapMonth = mk;
    p.flags = p.flags || {};
    p.flags.treasureHunt = (p.flags.treasureHunt || 0) + 1;
    if (!auto) Log.add('【藏宝阁】阁中灵机一月一凝——一缕<b>寻宝灵机</b>入你眉宇（下次游历必遇宝箱，收获更丰）。', 'gain');
  },
  /** v38（E338）：演武场——练武之地每日一演：当日本日首战开局连击 +1、道境经验微增 */
  async drillTrain() {
    const p = Game.player;
    if (!this.buildLv(p, 'train')) { UI.toast('先在洞府营造一座演武场'); return; }
    const today = Math.floor(p.day || 0);
    if (p._trainDay === today) { UI.toast('今日已演武过——筋骨也要歇息'); return; }
    p._trainDay = today;
    Time.add(1);
    if (p.dead) return;
    if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 5);
    Log.add('【演武】你在演武场与假人拆了半日招——拳脚生风，明日出手必有先手之利（本日首战：开局连击 +1）。', 'gain');
    Game.afterAction();
  },
  /** v20 聚灵加速：花灵石点燃聚灵阵，点燃后 3 日内修炼效率 ×1.5 */
  /** v24 聚灵加速定价单源化：随境界走 stoneEco 曲线（解除 v20 的 4 境封顶，高境灵石有了日常去路）
   *  v38（E314）：洞天一重「灵潮」——聚灵窗口 3→4 日 */
  RUSH_WINDOW() { const p = Game.player; return (p && p.cave && p.cave.dongtian >= 1) ? 4 : 3; },
  rushCost(p) { return Math.round(120 * GameData.stoneEco(p ? p.realmIdx : 0)); },
  async spiritRush() {
    const p = Game.player;
    if (!p.cave) { UI.toast('洞府尚未开辟'); return; }
    const today = Math.floor(p.day || 0);
    // v36（E218）：3 日窗口口径——窗口未激活才可再点，防窗口内重复扣款顺延覆写 rushDay
    // v38（E314）：洞天一重「灵潮」——窗口延长至 4 日
    const WIN = this.RUSH_WINDOW();
    const inWindow = p.rushDay != null && today - p.rushDay < WIN;
    if (inWindow) { UI.toast(`聚灵阵灵机未散（余 ${WIN - (today - p.rushDay)} 日），无需再燃`); return; }
    const cost = this.rushCost(p);
    // v36（E218）：净收益按场景实算——修炼增量 0.5×baseGain（窗口恰覆盖一轮）、闭关增量 8×baseGain（开局一次结算被窗口整段 ×1.5）
    const nextRound = Utils.fmtNum(Math.round(Cultivate.baseGain(p) * 0.5));
    const secludeBonus = Utils.fmtNum(Math.round(Cultivate.baseGain(p) * 8));
    const ok = await UI.popup({
      title: '聚灵加速',
      html: `燃烧灵石为聚灵阵供能——<b>点燃后 ${WIN} 日内修炼效率 ×1.5</b>（下一轮修炼约 +${nextRound} 修为；若即将闭关，整轮闭关约 +${secludeBonus} 修为）。<br>需灵石 <span class="hl">${Utils.fmtNum(cost)}</span>。<br><span class="tip-line">· 灵机未散（${WIN} 日内）不可再燃；闭关与自动修炼同样受益。诚实账：挂机流净赚仅约 +${nextRound} 修为对 ${Utils.fmtNum(cost)} 灵石——聚灵的正确定位是闭关前点燃。</span>`,
      options: [{ text: '点燃聚灵阵', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    p.rushDay = today;
    Log.add(`聚灵阵轰然全开——3 日内修炼效率 ×1.5！（灵石 -${Utils.fmtNum(cost)}）`, 'system');
    Story.chron('点燃聚灵阵（日修加速）');
    Game.afterAction();
  },
  /** v20 灵泉：每日首次入洞府自动涌出灵石（日界防重）；v27 auto=离线回放（只入账不逐日刷屏）
   *  v38（E302）：化身「驻守护府」——灵泉产出 ×1.2 */
  springDaily(p, auto = false) {
    if (!p.cave || !p.cave.builds || !p.cave.builds.spring) return;
    const today = Math.floor(p.day || 0);
    if (p.cave._springDay === today) return;
    p.cave._springDay = today;
    const guardOn = p.avatar && p.avatar.on && (p.avatar.task === 'guard' || (p.avatar.lv >= 9 && p.avatar.task2 === 'guard'));
    const gain = Math.round(80 * p.cave.builds.spring * GameData.stoneEco(Math.min(6, p.realmIdx)) * (guardOn ? 1.2 : 1));   // v29：封顶 4→6，后期灵泉不再是摆设；v38：驻守 ×1.2
    Bag.addStones(gain);
    if (auto && typeof Game !== 'undefined' && Game._offlineAgg) Game._offlineAgg.spring = (Game._offlineAgg.spring || 0) + gain;   // v34（E1）：灵泉离线入账并入日报——原只报「照常涌出」不给数额，玩家对不上账
    if (!auto) Log.add(`【灵泉】洞府灵泉今日涌出灵石 <b>${Utils.fmtNum(gain)}</b> 枚，已自动收入储物袋。${guardOn ? '（化身驻守，泉眼愈旺 ×1.2）' : ''}`, 'gain');
  },

  /* ========== v38（E305）：洞府阵法与夜袭守御 ========== */
  /** 阵眼内某旗的 Effective 面数——阵道 6 重 B 脉「地载万物」×1.3、周天阁「阵法传习」×1.25 */
  flagCount(p, itemId) {
    return ((p.cave && p.cave.formation) || []).filter(x => x === itemId).length;
  },
  flagPower(p, itemId) {
    let n = this.flagCount(p, itemId);
    if (!n) return 0;
    if (p.dao === 'array' && typeof DaoSys !== 'undefined' && DaoSys.hasPath(p, 6, 'diZai')) n *= 1.3;
    if (p.sect && p.sect.id === 'zhoutian') n *= 1.25;   // v38（E337）：周天阁「阵法传习」
    return n;
  },
  /** 布阵 / 收旗（同一动作：格内有旗则取下，空格则放入袋中第一面旗） */
  toggleFlag(idx) {
    const p = Game.player;
    if (!p.cave) return;
    p.cave.formation = p.cave.formation || [null, null, null, null, null, null, null, null, null];
    const cur = p.cave.formation[idx];
    if (cur) {
      p.cave.formation[idx] = null;
      Bag.addItem(cur, 1);
      Log.add(`你取下阵眼上的【${GameData.ITEMS[cur].name}】，阵光微黯。`, 'info');
    } else {
      const FLAG_ORDER = ['b_juling', 'b_yudi', 'b_cangfeng', 'b_lianxi'];
      const have = FLAG_ORDER.find(id => Bag.count(id) > 0);
      if (!have) { UI.toast('囊中并无阵旗——炼器坊可锻四方阵旗'); return; }
      Bag.removeItem(have, 1);
      p.cave.formation[idx] = have;
      Log.add(`你将【${GameData.ITEMS[have].name}】插上第 ${idx + 1} 道阵眼——旗面灵光流转，阵成！`, 'gain');
    }
    Game.afterAction();
  },
  /** 夜袭判定（dailySettle 钩子）：宿敌 ≥2 者夜夜有险——藏锋旗每面 -15%（下限 0.5%） */
  nightRaidCheck(p, auto = false) {
    if (p.realmIdx < 1 || p.dead) return;
    const grudges = (typeof NpcSys !== 'undefined' && NpcSys.grudgeCount) ? NpcSys.grudgeCount(p) : 0;
    if (grudges < 2) return;
    if (p.cave && p.cave._raidDay === Math.floor(p.day || 0)) return;   // 每日至多一袭
    const chance = Math.max(0.5, 3 * (1 - 0.15 * this.flagCount(p, 'b_cangfeng')));
    if (!Utils.chance(chance)) return;
    p.cave = p.cave || {};
    p.cave._raidDay = Math.floor(p.day || 0);
    const ids = Object.keys(p.npcs || {}).filter(id => p.npcs[id] && p.npcs[id].grudge && p.npcs[id].alive);
    const npcId = ids[Utils.rand(0, ids.length - 1)];
    if (!npcId) return;
    if (auto) { this.resolveNightRaid(p, npcId, true); return; }
    // 在线：置挂起旗标，afterAction 收尾（无战斗无剧情弹窗时）结算——节庆同款时序防弹窗相撞
    p.pendingNightRaid = npcId;
  },
  /** 夜袭结算：化身驻守可先挡一袭；守御=御敌旗+驻守+境差；胜反夺灵石、败损一茬庄稼 */
  resolveNightRaid(p, npcId, auto = false) {
    const s = p.npcs[npcId];
    const d = (typeof NpcSys !== 'undefined' && NpcSys.def) ? NpcSys.def(npcId) : null;
    if (!s || !d) return;
    // 化身驻守：先替主身挡下（化身神识受挫，三日不可换差）
    const guardOn = p.avatar && p.avatar.on && (p.avatar.task === 'guard' || (p.avatar.lv >= 9 && p.avatar.task2 === 'guard'));
    if (guardOn && Utils.chance(45)) {
      p.avatar.cdDay = Math.floor(p.day || 0) + AvatarSys.SWITCH_CD;
      Log.add(`【夜袭】<b>${d.name}</b> 趁夜来犯——化身凝形拦在府门：「此地有我。」一场恶斗后贼人遁去（化身神识受挫，${AvatarSys.SWITCH_CD} 日不可换差）。`, 'warn');
      return;
    }
    const myR = p.realmIdx * 4 + p.layer;
    const hisR = (s.realmIdx || 0) * 4 + (s.layer || 0);
    const yudi = this.flagPower(p, 'b_yudi');
    const odds = Utils.clamp(Math.round(52 + yudi * 8 + (guardOn ? 8 : 0) + (myR - hisR) * 6), 15, 92);
    if (Utils.chance(odds)) {
      const stones = Math.round(40 * GameData.stoneEco(Math.min(6, p.realmIdx)));
      Bag.addStones(stones);
      s.rel = Utils.clamp((s.rel || 0) + 6, -100, 100);
      const cleared = Utils.chance(30);
      if (cleared) s.grudge = false;
      Log.add(`【夜袭】<b>${d.name}</b> 趁夜来犯——阵旗灵光骤起，你早有防备！一番缠斗将其击退，反夺其随身灵石 <b>${Utils.fmtNum(stones)}</b>（交情 +6${cleared ? '，恩怨就此两清' : ''}；守御胜算 ${odds}%）。`, 'gain');
      if (typeof Story !== 'undefined' && Story.chron) Story.chron(`${d.name} 夜袭洞府，被你击退`);
    } else {
      // 败：损失一茬将熟的庄稼 + 灵石小罚
      const plots = this.plotsOf(p);
      const ripe = plots.map((pl, i) => (pl && pl.seed) ? i : -1).filter(i => i >= 0);
      let lossTxt = '田中并无作物，贼人空手掳去些许灵石';
      if (ripe.length) {
        const idx = ripe[Utils.rand(0, ripe.length - 1)];
        const cropName = GameData.ITEMS[plots[idx].crop] ? GameData.ITEMS[plots[idx].crop].name : '作物';
        plots[idx] = null;
        lossTxt = `第 ${idx + 1} 田的【${cropName}】被连根掳去`;
      }
      const stTot = (p.stones ? (p.stones.low || 0) + (p.stones.mid || 0) * 100 + (p.stones.high || 0) * 10000 : 0);
      const fine = Math.round(stTot * 0.05);
      if (fine > 0) Bag.spendStonesMax(fine);
      Log.add(`【夜袭】<b>${d.name}</b> 趁夜来犯——阵旗被其一剑挑落，你仓促应战不敌退走！${lossTxt}${fine > 0 ? `、散失灵石 ${Utils.fmtNum(fine)}` : ''}。（守御胜算 ${odds}%——多设御敌旗、遣化身驻守可固守御）`, 'loss');
    }
    if (auto && typeof Game !== 'undefined' && Game._offlineAgg) Game._offlineAgg.nightRaid = (Game._offlineAgg.nightRaid || 0) + 1;
  },

  /** v34（F1）一键照料 + v35（U3）照料核心抽出：全田浇水 + 全兽抚摸 + 全田除虫——
   *  一键照料（洞府页）与一键行权（今日修行卡）共用同一 helper，行为严格一致。
   *  返回 { watered, patted, cured } 供两处各自汇总。 */
  careCore(p) {
    const today = Math.floor(p.day || 0);
    let watered = 0, patted = 0, cured = 0;
    // 全田浇水（逻辑与 water() 一致：剩余生长期 ×0.9）
    // v35（E154）修瑕：成熟田（remaining=0）不再计入浇水业绩——原照记 watered++，
    // 一键照料日志「浇水 8 块」实有一半是零效果凑数
    const plots = this.plotsOf(p);
    for (let i = 0; i < plots.length; i++) {
      const plot = plots[i];
      if (!plot || !plot.seed || plot.wateredDay === today) continue;
      const grown = Math.max(0, Math.floor(p.day || 0) - (plot.plantedDay || 0));
      const remaining = Math.max(0, (plot.days || 0) - grown);
      // v36（E202）：顺手除虫提到熟田判定之前——原 remaining<=0 continue 把除虫一并挡在成熟田外，
      // 而 checkPest 照样给熟田上虫、harvest 照罚过熟折半：只有惩罚没有出口
      if (plot.pested) { plot.pested = false; cured++; }
      if (remaining <= 0) continue;   // 已熟之田无需雨露
      plot.wateredDay = today;
      plot.days = grown + Math.max(1, Math.round(remaining * 0.9));
      watered++;
    }
    // 全兽抚摸（与 BeastSys.pat 一致：+4~8 亲昵，触发第三技检查）
    if (typeof BeastSys !== 'undefined') {
      for (const b of (p.beasts && p.beasts.list || [])) {
        if (b.patDay === today) continue;
        b.patDay = today;
        b.bond = Math.min(100, (b.bond || 0) + Utils.rand(4, 8));
        if (BeastSys.checkThirdSkill) BeastSys.checkThirdSkill(b);
        patted++;
      }
    }
    return { watered, patted, cured };
  },
  /** v34（F1）：一键照料——全田浇水 + 全兽抚摸 + 除虫 + 未求签则求签，一纸小账。
   *  满配洞府每日「浇水×8 + 摸兽×N + 求签」十二余次纯仪式点击，放置游戏被手点绑架；
   *  收益规则逐项与单次操作完全一致，只是合并结算。 */
  careAll() {
    const p = Game.player;
    if (!p.cave) { UI.toast('洞府尚未开辟'); return; }
    const today = Math.floor(p.day || 0);
    const { watered, patted, cured } = this.careCore(p);
    // 求签（未签时补一签）
    let signed = false;
    if (typeof DailySign !== 'undefined' && p.signDay !== today) {
      DailySign.draw();
      signed = p.signDay === today;
    }
    if (!watered && !patted && !signed && !cured) { UI.toast('今日的照料都已做过了'); return; }
    const parts = [];
    if (watered) parts.push(`灵田浇水 ${watered} 块`);
    if (patted) parts.push(`灵兽抚摸 ${patted} 只`);
    if (cured) parts.push(`除虫 ${cured} 块`);
    if (signed) parts.push('黄历求签一卦');
    Log.add(`【一键照料】${parts.join('、')}——洞府诸事俱毕，灵气氤氲。`, 'gain');
    Game.afterAction();
  },
  async water(idx) {
    const p = Game.player;
    const plots = this.plotsOf(p);
    const plot = plots[idx];
    if (!plot) { UI.toast('此田无作物'); return; }
    if (plot.wateredDay === Math.floor(p.day)) { UI.toast('今日已浇过水了'); return; }
    plot.wateredDay = Math.floor(p.day);
    // v27 修瑕：浇水按「剩余生长期」打折——此前对总生长期乘 0.9，临近成熟时浇水等于当日催熟
    const grown = Math.max(0, Math.floor(p.day) - (plot.plantedDay || 0));
    const remaining = Math.max(0, (plot.days || 0) - grown);
    plot.days = grown + (remaining > 0 ? Math.max(1, Math.round(remaining * 0.9)) : 0);
    Log.add(`你以灵泉浇灌第 ${idx + 1} 田，作物生长加快了一分。`, 'info');
    if (typeof Ambience !== 'undefined') Ambience.sfx('plant');   // v37（E232）：农事音
    Game.afterAction();
  },
  /** v20 接线：每日一次的虫害检查（此前为无调用方的死代码）
   *  v38（E305）：敛息旗——每面虫害几率 -1%（下限 0.5%）；阵道地载万物 ×1.3、周天阁阵法传习 ×1.25 */
  checkPest(p) {
    if (!p.cave) return;
    const today = Math.floor(p.day || 0);
    if (p.cave._pestDay === today) return;
    p.cave._pestDay = today;
    const pestChance = Math.max(0.5, 3 - this.flagPower(p, 'b_lianxi'));
    const plots = this.plotsOf(p);
    for (let i = 0; i < plots.length; i++) {
      const plot = plots[i];
      if (!plot || plot.pested) continue;
      if (Utils.chance(pestChance)) {
        plot.pested = true;
        const cropName = (GameData.ITEMS[plot.crop] || {}).name || '作物';
        Log.add(`第 ${i + 1} 田的【${cropName}】遭了虫害——必须除虫，否则收成将大减！`, 'warn');
      }
    }
  },
  /** v18：除虫 */
  async removePest(idx) {
    const p = Game.player;
    const plots = this.plotsOf(p);
    const plot = plots[idx];
    if (!plot || !plot.pested) { UI.toast('此田并无虫害'); return; }
    plot.pested = false;
    Log.add(`你以灵药除去了第 ${idx + 1} 田的虫害，作物重焕生机。`, 'gain');
    Game.afterAction();
  },
  freshCave() { return { lv: 1, plots: [null, null, null, null, null, null, null, null], formation: [null, null, null, null, null, null, null, null, null] }; },
  unlockText: '洞府 · 筑基期解锁',
  unlocked(p) { return p.realmIdx >= 1; },
  plotsOf(p) {
    if (!p.cave) p.cave = this.freshCave();
    // v38（E288）防御：旧种子档/异构档 cave 无 plots 时回退空阵列——checkPest/照料不再被 .length 打断
    if (!Array.isArray(p.cave.plots)) p.cave.plots = [null, null, null, null, null, null, null, null];
    return p.cave.plots;
  },
  plotCount(p) { return Math.min(8, 4 + (p.cave ? p.cave.lv - 1 : 0)); },
  upCost(p) {
    const lv = p.cave ? p.cave.lv : 1;
    return {
      stones: Math.round(2000 * Math.pow(3, lv - 1) * GameData.sinkCurve(p.realmIdx) / 2.2 * this.costMul(p)),   // v30：曲线族统一；v38（E337）：磐岩谷匠心 85 折
      mats: lv === 1 ? null : { m_xuantie: 2 + lv, m_lingzhi: lv >= 3 ? 2 : 1 },
    };
  },
  async upgrade() {
    const p = Game.player;
    if (!this.unlocked(p)) { UI.toast('须至筑基期方可开辟洞府'); return; }
    if (!p.cave) p.cave = this.freshCave();
    if (p.cave.lv >= this.MAX_LV) { UI.toast('洞府已至五层，聚灵之极'); return; }
    const c = this.upCost(p);
    const matsTxt = c.mats ? Object.entries(c.mats).map(([id, n]) => `${GameData.ITEMS[id].name} ×${n}`).join('、') : '';
    const ok = await UI.popup({
      title: `扩 建 洞 府（${p.cave.lv} → ${p.cave.lv + 1} 层）`,
      html: `扩建洞府，聚灵阵随之精进：<br>
        · 修炼效率 <b class="hl">+4%</b>（现 +${p.cave.lv * 4}%）<br>
        · 灵田扩至 <b class="hl">${Math.min(8, 4 + p.cave.lv)} 块</b><br>
        · 兽栏扩至 <b class="hl">${BeastSys.maxSlots(p) + 1} 位</b><br>
        需灵石 <span class="hl">${Utils.fmtNum(c.stones)}</span>${matsTxt ? `、${matsTxt}` : ''}。`,
      options: [{ text: '扩 建', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    // v27 修瑕：先验材料再扣灵石——此前材料不足时灵石已扣、扩建未成（白扣不退）
    if (c.mats) {
      for (const [id, n] of Object.entries(c.mats)) {
        if (Bag.count(id) < n) { UI.toast(`${GameData.ITEMS[id].name}不足`); return; }
      }
    }
    if (!Bag.spendStones(c.stones)) { UI.toast('灵石不足'); return; }
    if (c.mats) {
      for (const [id, n] of Object.entries(c.mats)) Bag.removeItem(id, n);
    }
    p.cave.lv++;
    Log.add(`你斥重金扩建洞府——聚灵阵嗡鸣不止，灵气如今浓缩如雾：修炼效率 +${p.cave.lv * 4}%，灵田 ${this.plotCount(p)} 块。`, 'system');
    UI.announce(`✦ 洞府扩建 · ${p.cave.lv} 层`, 'gold');
    Game.afterAction();
  },
  /** 播种 */
  async plant(idx) {
    const p = Game.player;
    const plots = this.plotsOf(p);
    if (idx >= this.plotCount(p)) { UI.toast('此田尚未开垦（扩建洞府可增田）'); return; }
    // v38（E311）：{lastCrop,streak} 土地记忆对象不算作物——仅 lastCrop/streak 字段的槽位可再播种
    if (plots[idx] && plots[idx].seed) { UI.toast('此田已有作物'); return; }
    const seeds = Object.keys(p.bag).filter(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'seed');
    if (!seeds.length) { UI.toast('囊中没有种子——坊市杂货区有售'); return; }
    const opts = seeds.map(id => ({ text: `${GameData.ITEMS[id].name}（${GameData.ITEMS[id].days}日熟）`, value: id }));
    opts.push({ text: '取消', value: null });
    const seedId = await UI.popup({
      title: `播种 · 第 ${idx + 1} 田`,
      html: '择一种子播入灵田。作物按游戏日生长，离线亦在生长；成熟后请及时采收，过熟廿日则减半收成。',
      options: opts,
    });
    if (!seedId) return;
    Bag.removeItem(seedId, 1);
    const sd = GameData.ITEMS[seedId];
    // v38（E311）：轮作与连作——上茬同种则连作 streak+1；换种轮作则生长期 -20%（土地记忆随田不随茬）
    const hist = plots[idx] || {};
    const streak = (hist.lastCrop === seedId) ? (hist.streak || 0) + 1 : 1;
    const rotDays = (hist.lastCrop && hist.lastCrop !== seedId) ? Math.max(1, Math.round(sd.days * 0.8)) : sd.days;
    plots[idx] = { seed: seedId, crop: sd.crop, days: rotDays, plantedDay: Math.floor(p.day), lastCrop: seedId, streak };
    Log.add(`你在第 ${idx + 1} 田播下了【${sd.name}】，${rotDays} 日后可收。${streak >= 3 ? '（此田已连作三茬——收成时有灵机变异之机）' : (rotDays < sd.days ? '（轮作得宜，生长期缩短两成）' : '')}`, 'info');
    if (typeof Ambience !== 'undefined') Ambience.sfx('plant');   // v37（E232）：农事音（死音效 plant 接线）
    Game.afterAction();
  },
  /** 收获：进度按当前游戏日结算；过熟 20+ 日减半
   *  v38（E311）：连作第 3 茬起 15% 灵机变异——收成 ×1.5 且多结一枚种子 */
  harvest(idx) {
    const p = Game.player;
    const plots = this.plotsOf(p);
    const plot = plots[idx];
    if (!plot) return;
    const grown = Math.floor(p.day) - plot.plantedDay;
    if (grown < plot.days) { UI.toast(`尚未成熟（还差 ${plot.days - grown} 日）`); return; }
    const over = grown - plot.days;
    let qty = 2;
    if (over >= 20) qty = 1;
    if (plot.pested) qty = Math.max(0, qty - 1); // v18：虫害减产
    if (typeof Art !== 'undefined' && Art.seasonOf(p) === 2) qty += 1;   // v20 季秋丰收：产量 +1
    const mutate = (plot.streak || 0) >= 3 && Utils.chance(15);
    if (mutate) qty += 1;   // 变异 ×1.5（2→3 档）
    const streakKeep = plot.streak || 0, lastCropKeep = plot.lastCrop || plot.seed;
    plots[idx] = { lastCrop: lastCropKeep, streak: streakKeep };   // 土地记忆留田（下茬轮作/连作判定用）
    // v32 修瑕（E64）：qty=0 原仍 Bag.addItem(crop,0) 污染、harvests 照计数并播「收获 ×0」
    if (qty > 0) {
      Bag.addItem(plot.crop, qty);
      if (mutate) Bag.addItem(plot.seed, 1);   // 变异之株自行结种
      p.counters.harvests = (p.counters.harvests || 0) + 1;   // v20 成就计数
      Log.add(`第 ${idx + 1} 田的【${GameData.ITEMS[plot.crop].name}】熟了——收获 ×${qty}${over >= 20 ? '（过熟日久，收成折半）' : ''}${typeof Art !== 'undefined' && Art.seasonOf(p) === 2 ? '（季秋丰收）' : ''}${mutate ? '。<b>灵机变异</b>——此株灵韵异于常种，多结一株收成并自结一枚种子！' : ''}。`, 'gain');
      if (typeof Ambience !== 'undefined') Ambience.sfx('plant');   // v37（E232）：农事音
    } else {
      Log.add(`第 ${idx + 1} 田的【${GameData.ITEMS[plot.crop].name}】颗粒无收——虫害把收成啃了个精光。`, 'warn');
    }
    Game.afterAction();
  },
  renderPlots(p) {
    const plots = this.plotsOf(p);
    const n = this.plotCount(p);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const plot = plots[i];
      // v38（E311）：{lastCrop, streak} 为土地记忆对象（无 seed）——渲染与空田同款，可再播种
      if (!plot || !plot.seed) {
        rows.push(`
        <div class="shop-row plot-row">
          <div class="gf-info"><div class="gf-name">第 ${i + 1} 田 <span class="tag">空田</span></div>
          <div class="gf-desc">沃土待垦，可播下种子。</div></div>
          <div class="gf-actions"><button class="btn btn-sm" data-action="act-cave-plant" data-i="${i}">播 种</button></div>
        </div>`);
      } else {
        const grown = Math.max(0, Math.floor(p.day) - plot.plantedDay);
        const pct = Utils.clamp(grown / plot.days * 100, 0, 100);
        const ripe = grown >= plot.days;
        const over = grown - plot.days;
        rows.push(`
        <div class="shop-row plot-row">
          <div class="gf-info">
            <div class="gf-name">第 ${i + 1} 田 · ${GameData.ITEMS[plot.crop].name} ${ripe ? '<span class="tag safe">已成熟</span>' : `<span class="tag">生长中 ${grown}/${plot.days}日</span>`}</div>
            <div class="bar" style="height:12px"><div class="bar-fill exp" style="width:${pct}%"></div><span class="bar-text">${Math.floor(pct)}%</span></div>
            <div class="gf-desc">可收 ×2｜过熟 20 日折半｜季秋 +1</div>
            ${ripe && over >= 20 ? '<div class="gf-desc"><span class="neg">过熟日久，收获将折半，请尽快采收。</span></div>' : ''}
          </div>
          <div class="gf-actions">${ripe
            ? `<button class="btn btn-sm btn-primary" data-action="act-cave-harvest" data-i="${i}">收 获</button>${plot.pested ? `<button class="btn btn-sm btn-danger" data-action="act-cave-pest" data-i="${i}">除 虫</button>` : ''}`
            : `<button class="btn btn-sm" data-action="act-cave-water" data-i="${i}">浇 水</button>${plot.pested ? `<button class="btn btn-sm btn-danger" data-action="act-cave-pest" data-i="${i}">除 虫</button>` : ''}`}</div>
        </div>`);
      }
    }
    return rows.join('');
  },
};
