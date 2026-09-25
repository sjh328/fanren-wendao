
/* ======================================================================
 * §12 宗门系统（加入 / 任务 / 兑换）
 * ====================================================================== */
const SectSys = {
  /** v18：宗门职位体系 */
  RANKS: [
    { id: 'outer', name: '外门弟子', contribNeed: 0, bonus: {} },
    { id: 'inner', name: '内门弟子', contribNeed: 500, bonus: { cult: 5, stonePct: 5 } },
    { id: 'core', name: '亲传弟子', contribNeed: 2000, bonus: { cult: 10, atkPct: 5, defPct: 5 } },
    { id: 'elder', name: '长老', contribNeed: 8000, bonus: { cult: 15, atkPct: 10, defPct: 10, hpPct: 10 } },
  ],
  /** v34（E115）：历史峰值贡献——职位一旦凭贡献挣得，不因花贡献兑换而回落。
   *  原按「当前贡献」判定：攒够 8000 当长老，换两件法宝即跌回内门、长老令资格随之蒸发——
   *  贡献既是货币又是职位门槛，两个用途共用一个值等于「花钱惩罚地位」。兑换照旧扣当前贡献。 */
  peakContrib(p) {
    if (!p.sect) return 0;
    p.sect.peakContrib = Math.max(p.sect.peakContrib || 0, p.sect.contrib || 0);
    return p.sect.peakContrib;
  },
  rank(p) {
    if (!p.sect) return null;
    const contrib = this.peakContrib(p);
    for (let i = this.RANKS.length - 1; i >= 0; i--) {
      if (contrib >= this.RANKS[i].contribNeed) return this.RANKS[i];
    }
    return this.RANKS[0];
  },
  /** v29：下一职位（宗门页晋升进度条用） */
  rankNext(p) {
    if (!p.sect) return null;
    const c = this.peakContrib(p);
    return this.RANKS.find(r => r.contribNeed > c) || null;
  },
  taskMonsters(rp) {
    return Object.entries(GameData.MONSTERS)
      .filter(([, m]) => m && !m.elite && m.power >= rp - 4 && m.power <= rp + 2)
      .map(([id]) => id);
  },
  /* ---------- v19 长老实权：每日下令（演武/开市/传功），次日更张 ---------- */
  COMMANDS: [
    { id: 'drill',  name: '开炉演武', desc: '门派任务与悬赏酬劳 +50%（至明日）' },
    { id: 'market', name: '传令开市', desc: '坊市购物额外九五折（至明日）' },
    { id: 'teach',  name: '长老传功', desc: '修炼效率 +20%（至明日）' },
  ],
  isElder(p) { const r = this.rank(p); return r && r.id === 'elder'; },
  commandActive(p, kind) {
    return !!(p.sect && p.sect.command && p.sect.command.kind === kind && Math.floor(p.day || 0) < p.sect.command.until);
  },
  async command() {
    const p = Game.player;
    if (!p.sect) { UI.toast('尚未拜入宗门'); return; }
    if (!this.isElder(p)) { UI.toast('需长老之位方可号令门中'); return; }
    const today = Math.floor(p.day || 0);
    if (p.sect.command && p.sect.command.day === today) { UI.toast('今日已下令，明日再议'); return; }
    const pickCmd = await UI.popup({
      title: '长老令 · 号令门中',
      html: `以长老之权下令，次日更张。<br>${this.COMMANDS.map((c, i) => `${i + 1}. <b>${c.name}</b>——${c.desc}`).join('<br>')}`,
      options: this.COMMANDS.map((c, i) => ({ text: c.name, value: c.id, primary: i === 0 })).concat([{ text: '再议', value: null }]),
    });
    if (!pickCmd) return;
    p.sect.command = { kind: pickCmd, day: today, until: today + 1 };   // v26 修瑕：与「至明日／次日更张」文案对齐（原 today+2 白得两日）
    const c = this.COMMANDS.find(x => x.id === pickCmd);
    Log.add(`【长老令】<b>${c.name}</b>——${c.desc}`, 'system');
    Story.chron(`宗门下令「${c.name}」`);
    Game.afterAction();
  },
  genTask(p) {
    const realm = p.realmIdx;
    // v37（E242）：差事/悬赏池互斥（轻方案）——宗门差事只余修行/历练/问签三门（门中供养，贡献向），
    // 讨伐与采集归悬赏板（江湖赏格，灵石向+连锁），两板同构委托的重复感自此消除
    const SECT_W = {   // v32（F4）按宗门特色加权；v37（E242）删 kill/collect 键——讨伐/采集不再自宗门生成，不留死配置
      qingyun: { cult: 1, explore: 2, sign: 1 },
      danxia:  { cult: 2, explore: 1, sign: 1 },
      wanbao:  { cult: 1, explore: 2, sign: 2 },
      panyan:  { cult: 3, explore: 1, sign: 1 },
      zhoutian:{ cult: 2, explore: 3, sign: 2 },
    };
    // v37（E242）：生死状升格为宗门独占生成支（派系成员才可掷；战时概率大涨）——
    // 原 wrapDanger 在普通 kill 任务上二次掷点，普通 kill 支一删它即断线；
    // 掷点（chance(war?55:26)）与 elites 选取自 wrapDanger 原样前置搬入
    if (p.sect && p.sect.faction && Utils.chance(WorldSys.warActive(p) ? 55 : 26)) {
      const rp = realm * 4 + p.layer;
      const elites = Object.entries(GameData.MONSTERS)
        .filter(([, m]) => m.elite && m.power >= rp - 1 && m.power <= rp + 4).map(([id]) => id);
      if (elites.length) {
        const target = Utils.pick(elites);
        return { type: 'kill', target, need: 1, progress: 0, danger: true, name: '高危 · 生死状', desc: `讨伐 ${GameData.MONSTERS[target].name}（敌对派系借刀杀人，赏格翻倍）` };
      }
    }
    const type = Utils.pickWeighted((p.sect && SECT_W[p.sect.id]) || { cult: 1, explore: 1, sign: 1 });
    // v30 宗门特色差事：本宗名目替代通用名目（35%），机制不变、文案见宗门气象
    const flav = p.sect && GameData.SECT_QUEST_FLAVOR && GameData.SECT_QUEST_FLAVOR[p.sect.id];
    const flavorName = (flav && Utils.chance(35)) ? flav[type] : null;
    const need = Math.round(120 * GameData.eco(realm));
    if (type === 'explore') {
      const need2 = Utils.rand(3, 5);
      return { type, target: null, need: need2, progress: 0, name: flavorName || '历练 · 行走山河', desc: flavorName ? `门中差事 · ${flavorName}：外出历练 ${need2} 次（任意地图）` : `外出历练 ${need2} 次（任意地图）` };
    }
    if (type === 'sign') {
      return { type, target: null, need: 1, progress: 0, name: flavorName || '问签 · 黄历一卦', desc: flavorName ? `门中差事 · ${flavorName}：黄历求签 1 次` : '黄历求签 1 次' };
    }
    return { type: 'cult', target: null, need, progress: 0, name: flavorName || '修行 · 精进不休', desc: flavorName ? `门中差事 · ${flavorName}：累计获得修为 ${Utils.fmtNum(need)}` : `累计获得修为 ${Utils.fmtNum(need)}` };
  },
  rewards(p, task) {
    const realm = p.realmIdx;
    let contrib = 30 + realm * 22, stones = Math.round(45 * GameData.stoneEco(realm));
    if (task && task.danger) { contrib *= 2; stones *= 2; }        // 高危生死状：赏格翻倍
    if (WorldSys.warActive(p)) { contrib = Math.round(contrib * 1.5); stones = Math.round(stones * 1.5); } // 宗门大战：悬赏暴涨
    // v27 修瑕：长老令「开炉演武」文案称门派任务与悬赏酬劳 +50%——此前只有悬赏半边生效
    if (this.commandActive(p, 'drill')) { contrib = Math.round(contrib * 1.5); stones = Math.round(stones * 1.5); }
    return { contrib, stones };
  },
  /** 生成任务并按派系立场折算高危生死状 */
  newTask(p) { return this.genTask(p); },   // v39（E365）：普通分支删除——genTask 已内置生死状支，wrapDanger 仅留入派立威 force 支
  /** 敌对派系借刀杀人：派系成员偶接高危任务（战时概率大涨）；force 用于入派当日立威（无视原任务类型）。
   *  v37（E242）：普通 kill/collect 生成支已删——普通任务（cult/explore/sign）永非 kill，在此自然短路；
   *  生死状改由 genTask 独占生成支直出（已带 danger=true，此處不再二次掷点改派目标）。
   *  force 入派立威路径继续生效。 */
  /** v39（E365）：wrapDanger 缩减为「入派立威」单支——普通分支已死（genTask 自 v37 起内置
   *  生死状生成支，sect.js 顶部掷点前置），force 直掷生死状并入调用点 joinFaction。 */
  wrapDanger(t, p) {
    if (!t || !p.sect || !p.sect.faction) return t;
    const rp = p.realmIdx * 4 + p.layer;
    const elites = Object.entries(GameData.MONSTERS)
      .filter(([, m]) => m.elite && m.power >= rp - 1 && m.power <= rp + 4).map(([id]) => id);
    if (!elites.length) return t;
    t.type = 'kill'; t.target = Utils.pick(elites); t.need = 1; t.progress = 0; t.danger = true;
    t.name = '高危 · 生死状';
    t.desc = `讨伐 ${GameData.MONSTERS[t.target].name}（敌对派系借刀杀人，赏格翻倍）`;
    return t;
  },
  join(sectId) {
    const p = Game.player;
    if (p.sect) { UI.toast('你已拜入宗门，不可再改投他门'); return; }
    if (p.realmIdx < 1) { UI.toast('须至筑基期方可拜入宗门'); return; }
    const sect = GameData.SECTS.find(s => s.id === sectId);
    // v38（E286）：删除死字段 rank:'outer'——职位全由 peakContrib 推导（SectSys.rank），该字段从不被读
    p.sect = { id: sectId, contrib: 0, faction: null, tasks: [this.newTask(p), this.newTask(p), this.newTask(p)] };
    Log.add(`你焚香沐浴，正式拜入 <b>${sect.name}</b>！${sect.bonusText}。当前职位：<b>外门弟子</b>。`, 'system');
    Game.afterAction();
  },
  /** v37（E242）：collect 提交流随生成支一并删除（submit 全函数移除）——采集悬赏归悬赏板，
   *  宗门任务不再有上交环节；kill（生死状）经 onKill 推进、claim 领赏，两流皆保留 */
  /** v37（E242）：差事改制读档播报——存量 collect/普通 kill 任务已在迁移步作废重掷，此处补一条可读日志 */
  reformNotice(p) {
    if (p && p.sect && p.sect._reform37) {
      delete p.sect._reform37;
      Log.add('门中差事已改制：讨伐与采集归悬赏行商，门中只留修行/历练/问签三门供养' + (p.sect.faction ? '（派系生死状特派照旧）' : '') + '。', 'system');
    }
  },
  /** v35（E129）：差事领赏每日上限——贡献是货币而非印钞机（cult 类任务一次修炼即满、claim 后即换新
   *  且无限制，配合兑换环节可整日刷贡献）。6 桩/日，跨日重置 */
  CLAIM_DAILY: 6,
  claimLeft(p) {
    const today = Math.floor(p.day || 0);
    if (p._claimDay !== today) return this.CLAIM_DAILY;
    return Math.max(0, this.CLAIM_DAILY - (p._claimCount || 0));
  },
  claim(taskIdx) {
    const p = Game.player;
    const t = p.sect.tasks[taskIdx];
    if (!t || t.progress < t.need) return;
    const today = Math.floor(p.day || 0);
    if (p._claimDay !== today) { p._claimDay = today; p._claimCount = 0; }
    if ((p._claimCount || 0) >= this.CLAIM_DAILY) { UI.toast(`今日差事赏格已领满（${this.CLAIM_DAILY} 桩）——门中也要按例办事，明日再来`); return; }
    p._claimCount = (p._claimCount || 0) + 1;
    const r = this.rewards(p, t);
    p.sect.contrib += r.contrib;
    // v32（F4）连勤有赏：每完成三桩差事额外 +20% 贡献——门中勤勉自此有复利
    p.sect.questsDone = (p.sect.questsDone || 0) + 1;
    const streakBonus = (p.sect.questsDone % 3 === 0) ? Math.round(r.contrib * 0.2) : 0;
    if (streakBonus) p.sect.contrib += streakBonus;
    Bag.addStones(r.stones);
    // v27 联动：门派差事践诺立信——声望 +1（声望体系新产出端）
    if (typeof RepSys !== 'undefined' && RepSys.add) RepSys.add(p, 1, '门派差事践诺');
    Log.add(`任务完成！获得 <b>贡献 ${r.contrib}</b> 点、灵石 ${Utils.fmtNum(r.stones)}。${streakBonus ? `（勤勉有赏 · 每三桩差事贡献 +${streakBonus}）` : ''}`, 'gain');   // v33（E111）：「连勤」实为终身累计每三桩，文案对齐语义
    p.sect.tasks[taskIdx] = this.newTask(p);
    Game.afterAction();
  },
  /** v38（E337）：青云剑宗【剑冢演武】——每旬一次与剑傀免费对练：当日前两战开局战意 +10、必杀熟练 +2 */
  qingyunDrill() {
    const p = Game.player;
    if (!p.sect || p.sect.id !== 'qingyun') { UI.toast('此乃青云剑宗弟子的机缘'); return; }
    const xun = Math.floor((p.day || 0) / 10);
    if ((p.flags || {})._drillXun === xun) { UI.toast('本旬已演武过——剑冢剑傀也要歇息'); return; }
    p.flags = p.flags || {};
    p.flags._drillXun = xun;
    p._drillBuffDay = Math.floor(p.day || 0) + 1;
    p._drillN = 0;
    Time.add(1);
    if (p.dead) return;
    if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 6);
    Log.add('【剑冢演武】你于剑冢之中与千年剑傀拆了三百招——招式熟极而流，明日出剑必有如神助（当日前两战：开局战意 +10、必杀熟练精进）。', 'gain');
    Game.afterAction();
  },
  /** v38（E344）：亲传弟子·代行差事——指派门下弟子代行本桩：即刻了结，赏格七折、耗时两日 */
  async delegate(taskIdx) {
    const p = Game.player;
    if (!p.sect) return;
    const rk = this.rank(p);
    if (!rk || (rk.id !== 'core' && rk.id !== 'elder')) { UI.toast('亲传弟子方有差事代行之权'); return; }
    const t = p.sect.tasks[taskIdx];
    if (!t || t.danger) { UI.toast('生死状大事，须亲身历险'); return; }
    const today = Math.floor(p.day || 0);
    if (p._claimDay !== today) { p._claimDay = today; p._claimCount = 0; }
    if ((p._claimCount || 0) >= this.CLAIM_DAILY) { UI.toast(`今日差事赏格已领满（${this.CLAIM_DAILY} 桩）`); return; }
    const ok = await UI.popup({
      title: '代行差事',
      html: `指派门下弟子代行本桩「${t.name}」——即刻了结，然<b>赏格七折、耗时两日</b>。<br><span class="tip-line">· 当了师父，自有人跑腿；但门中功过簿记得分明。</span>`,
      options: [{ text: '遣弟子代行', value: true, primary: true }, { text: '亲身去办', value: false }],
    });
    if (!ok) return;
    p._claimCount = (p._claimCount || 0) + 1;
    const r = this.rewards(p, t);
    const contrib = Math.round(r.contrib * 0.7);
    const stones = Math.round(r.stones * 0.7);
    p.sect.contrib += contrib;
    p.sect.questsDone = (p.sect.questsDone || 0) + 1;
    Bag.addStones(stones);
    Time.add(2);
    if (p.dead) return;
    Log.add(`【代行】门中弟子替你办妥了「${t.name}」——贡献 +${contrib}、灵石 ${Utils.fmtNum(stones)}（七折赏格，耗时两日）。`, 'gain');
    p.sect.tasks[taskIdx] = this.newTask(p);
    Game.afterAction();
  },
  /** v38（E344）：长老·季议——每季一票，定全宗一季之方向（自己受益的宗门 buff） */
  COUNCILS: [
    { id: 'war',   name: '整军经武', desc: '战斗获胜修为 +5%（一季）' },
    { id: 'trade', name: '通商惠工', desc: '坊市再享九七折（一季）' },
    { id: 'cult',  name: '勤修不辍', desc: '修炼效率 +3%（一季）' },
  ],
  councilKey(p) { return `${Math.floor((p.day || 0) / 365)}-${typeof Art !== 'undefined' && Art.seasonOf ? Art.seasonOf(p) : 0}`; },
  council(p) { return (p.sect && p.sect.council && p.sect.council.key === this.councilKey(p)) ? p.sect.council.choice : null; },
  async councilVote(choice) {
    const p = Game.player;
    if (!p.sect) return;
    const rk = this.rank(p);
    if (!rk || rk.id !== 'elder') { UI.toast('长老家方有一票之权'); return; }
    const c = this.COUNCILS.find(x => x.id === choice);
    if (!c) return;
    p.sect.council = { key: this.councilKey(p), choice };
    Log.add(`【季议】你以长老之位投下关键一票——本季宗门施行<b>「${c.name}」</b>：${c.desc}。`, 'system');
    Game.afterAction();
  },
  /** 高危生死状：接状即战，敌对派系借刀杀人 */
  async goDanger(taskIdx) {
    const p = Game.player;
    if (!p.sect) return;
    const t = p.sect.tasks[taskIdx];
    if (!t || !t.danger || t.progress >= t.need) return;
    const ok = await UI.popup({
      title: '高危 · 生死状',
      html: `${t.desc}<br><br><span class="neg">敌对派系借刀杀意，此行九死一生；然赏格翻倍。</span><br>若退缩，将换发一桩寻常任务。`,
      options: [{ text: '接下生死状', value: true, primary: true }, { text: '退缩换任务', value: false }],
    });
    if (!ok) {
      p.sect.tasks[taskIdx] = this.newTask(p);
      Log.add('你婉拒了高危差事，换了桩寻常任务。', 'info');
      Game.afterAction();
      return;
    }
    Battle.start(t.target, { mapName: '宗门生死状', sectDanger: taskIdx, dangerTask: true });   // v36（E226）：dangerTask 旗标——战败侧追加真实代价（处方的 explore.js 入口实锚为生死状接取开战处：生死状是「接了才生效」的契约，野外偶遇同名精英不应触发）
    Game.afterAction();   // v35（E143）：先 start 后 afterAction——对齐 dungeon 模式，防节庆在开战前触发后被 Battle.start 静默丢弃
  },
  onDangerWin(taskIdx) {
    const p = Game.player;
    if (!p.sect) return;
    const t = p.sect.tasks[taskIdx];
    if (!t || !t.danger) return;
    t.progress = t.need;
    Log.add('生死状任务已然达成，可回宗门领取翻倍赏格！', 'gain');
  },
  exchange(idx) {
    const p = Game.player;
    const row = GameData.SECT_EXCHANGE[idx];
    if (!row) return;
    // v30 特殊兑换：贡献换声望礼 / 器魂（单向有损的次级货币汇率网）
    if (row.special) {
      if (p.sect.contrib < row.cost) { UI.toast('贡献点不足'); return; }
      const names = { rep: '侠名帖', qihun: '器魂' };
      const ok2 = row.special === 'rep';
      const apply = () => {
        p.sect.contrib -= row.cost;
        if (row.special === 'rep') { p.reputation = (p.reputation || 0) + row.qty; Log.add(`你为宗门奔走办差所积的贡献，换作一纸<b>侠名帖</b>传扬江湖——声望 +${row.qty}。`, 'gain'); }
        else { p.qihun = (p.qihun || 0) + row.qty; Log.add(`宗门藏库取出一匣<b>器魂</b> ×${row.qty}——前代弟子分解的旧器精魄。`, 'gain'); }
        Game.afterAction();
      };
      const UI2 = UI.popup({ title: `兑换 · ${names[row.special]}`, html: `以 <b>${row.cost}</b> 贡献兑 ${names[row.special]} ×${row.qty}？`, options: [{ text: '兑 换', value: true, primary: true }, { text: '作罢', value: false }] });
      return UI2.then(v => { if (v) apply(); });
    }
    const def = GameData.ITEMS[row.item];
    // v37（E263）：境界门槛拦截——渡劫/太初/元神/造化四丹 minRealm 对齐坊市上架境。
    // 兑丹卖店套利窗口本就集中在筑基~金丹初（低境卖值/贡献最高 16.7×），门槛即斩断主窗口；
    // 兑换列表（ui.js）同步置灰显门槛，此处为运行时兜底
    if (row.minRealm != null && p.realmIdx < row.minRealm) {
      UI.toast(`此丹非小境界可承——须至${GameData.REALM_NAMES[row.minRealm]}期方可兑换`);
      return;
    }
    if (def.type === 'gongfa' && (p.gongfa[row.item] || p.bag[row.item])) { UI.toast('你已修习或已藏有此功法'); return; }   // v29 修瑕：补背包判重
    if (def.type === 'gongfa' && !DaoSys.canLearnGongfa(p, def)) return; // 体修难悟高阶法诀
    if (p.sect.contrib < row.cost) { UI.toast('贡献点不足'); return; }
    p.sect.contrib -= row.cost;
    Bag.addItem(row.item, row.qty || 1);
    Log.add(`你以 ${row.cost} 贡献兑换了 <b>${def.name}</b>${row.qty > 1 ? ` ×${row.qty}` : ''}。`, 'gain');
    Game.afterAction();
  },
  /** 长老派系 · 站队（终身有效），入门有礼 */
  async joinFaction(fid) {
    const p = Game.player;
    if (!p.sect) return;
    if (p.sect.faction) { UI.toast('你已站过队，不可再改换门庭'); return; }
    const f = GameData.SECT_FACTIONS.find(x => x.id === fid);
    if (!f) return;
    const ok = await UI.popup({
      title: '长老派系 · 站队',
      html: `确定依附 <b>${f.name}</b> 吗？<br>${f.desc}<br>${f.perkText ? `派系传承之利：${f.perkText}；可在长老处七五折兑换派系秘藏。<br>` : ''}${f.giftText}。<br><span class="neg">站队之后，敌对派系将给你派发高危生死状——战败折损甚重，且不可改换门庭。</span>`,
      options: [{ text: '执弟子礼', value: true, primary: true }, { text: '再观望观望', value: false }],
    });
    if (!ok) return;
    p.sect.faction = fid;
    if (f.gift.stones) Bag.addStones(f.gift.stones);
    if (f.gift.item) Bag.addItem(f.gift.item, 1);
    if (f.gift.extra) for (const [id, n] of Object.entries(f.gift.extra)) Bag.addItem(id, n);
    if (f.gift.gongfa) { const g = Utils.pick(f.gift.gongfa); if (!p.gongfa[g]) Bag.addItem(g, 1); }
    Log.add(`你正式依附 <b>${f.name}</b>——${f.motto}。${f.giftText}。`, 'system');
    // 敌对派系当日便递来一份"见面礼"——生死状
    const i = Utils.rand(0, p.sect.tasks.length - 1);
    p.sect.tasks[i] = this.wrapDanger(this.genTask(p), p, true);
    Game.afterAction();
  },
  /** 派系专属秘藏兑换 */
  factionExchange(idx) {
    const p = Game.player;
    if (!p.sect || !p.sect.faction) return;
    const f = GameData.SECT_FACTIONS.find(x => x.id === p.sect.faction);
    const row = f.exclusive[idx];
    if (!row) return;
    const def = GameData.ITEMS[row.item];
    if (def.type === 'gongfa' && (p.gongfa[row.item] || p.bag[row.item])) { UI.toast('你已修习或已藏有此功法'); return; }   // v29 修瑕：补背包判重
    if (def.type === 'gongfa' && !DaoSys.canLearnGongfa(p, def)) return;
    if (p.sect.contrib < row.cost) { UI.toast('贡献点不足'); return; }
    p.sect.contrib -= row.cost;
    Bag.addItem(row.item, 1);
    Log.add(`你以 ${row.cost} 贡献换取了派系秘藏 <b>${def.name}</b>。`, 'gain');
    Game.afterAction();
  },
  /** 击杀钩子：推进讨伐任务 */
  onKill(monsterId) {
    const p = Game.player;
    if (!p.sect || !Array.isArray(p.sect.tasks)) return;   // v31：宗门档缺 tasks 数组时不再崩（异种档自愈）
    for (const t of p.sect.tasks) {
      if (t.type === 'kill' && t.target === monsterId && t.progress < t.need) {
        t.progress++;
        if (t.progress >= t.need) Log.add('宗门讨伐任务已完成，可回去领取奖励！', 'gain');
        else Log.add(`讨伐任务进度：${t.progress}/${t.need}。`, 'info');
      }
    }
  },
  /** v30 补遗：历练钩子（任意地图探索 +1）——探索计数处调用 */
  onExplore() {
    const p = Game.player;
    if (!p.sect || !Array.isArray(p.sect.tasks)) return;   // v31：宗门档缺 tasks 数组时不再崩（异种档自愈）
    for (const t of p.sect.tasks) {
      if (t.type === 'explore' && t.progress < t.need) {
        t.progress++;
        if (t.progress >= t.need) Log.add('宗门历练任务已完成，可回去领取奖励！', 'gain');
      }
    }
  },
  /** v30 补遗：问签钩子（黄历求签）——求签处调用 */
  onSign() {
    const p = Game.player;
    if (!p.sect || !Array.isArray(p.sect.tasks)) return;   // v31：宗门档缺 tasks 数组时不再崩（异种档自愈）
    for (const t of p.sect.tasks) {
      if (t.type === 'sign' && t.progress < t.need) {
        t.progress = t.need;
        Log.add('宗门问签任务已完成，可回去领取奖励！', 'gain');
      }
    }
  },
  /** v30 补遗：亲传弟子「门中弟子历练」——门中后辈代师行走江湖，每日有产出（离线回放同样入账） */
  discipleDaily(p, auto = false) {
    if (!p.sect) return;
    const r = this.rank(p);
    if (!r || (r.id !== 'core' && r.id !== 'elder')) return;
    const today = Math.floor(p.day || 0);
    if ((p.sect._discipleDay || -1) === today) return;
    p.sect._discipleDay = today;
    const stones = Math.round(12 * GameData.stoneEco(Math.min(6, p.realmIdx)));
    Bag.addStones(stones);
    let extra = '';
    if (Utils.chance(18)) {
      const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 1, 1, 3);
      const mat = Utils.pick(GameData.matsByTier(tier));
      Bag.addItem(mat, 1);
      extra = `，还捎回一份【${GameData.ITEMS[mat].name}】`;
    }
    // v32 修瑕（E60）：离线回放原逐日刷 30 条日志——聚合进日报（Game.flushOfflineAgg 收口）
    // v33（E82）：聚合条件放宽为 auto——在线按日补结（E27）原静默入账零感知，同进日报
    if (auto) {
      const agg = Game._offlineAgg = Game._offlineAgg || {};
      agg.disciple = (agg.disciple || 0) + stones;
      if (extra) agg.discipleExtra = (agg.discipleExtra || 0) + 1;
    } else {
      Log.add(`【门中弟子历练】亲传在身，门中后辈代师行走江湖——缴回灵石 ${Utils.fmtNum(stones)}${extra}。`, 'gain');
    }
  },
  /** 修炼钩子：推进修行任务 */
  onCultivate(amount) {
    const p = Game.player;
    if (!p.sect || !Array.isArray(p.sect.tasks)) return;   // v31：宗门档缺 tasks 数组时不再崩（异种档自愈）
    for (const t of p.sect.tasks) {
      if (t.type === 'cult' && t.progress < t.need) {
        t.progress = Math.min(t.need, t.progress + amount);
        if (t.progress >= t.need) Log.add('宗门修行任务已完成，可回去领取奖励！', 'gain');
      }
    }
  },

  /* ---------- v22 宗门大比：每三年一届，三轮车轮战，胜负皆有名次 ---------- */
  // v36（E213）：TOURNEY_EVERY 5→3——实玩约 3 年至飞升，5 年一届使首届大比落到飞升之后、
  // 整链成准死内容；3 年一届保证凡间一世至少一届、首届落在金丹前后 day≈730~1095；
  // 仙界长岁照常供应。30 日过期规则保留（:360-363）
  TOURNEY_EVERY: 3,
  TOURNEY_ROUNDS: ['首轮', '次轮', '决胜轮'],
  TOURNEY_FOES: ['同门师兄', '同门师姐', '首座大师兄'],
  /** 行动收尾钩子：每逢三年（游戏年）开一届大比 */
  tourneyCheck(p) {
    if (!p.sect) return;
    const y = WorldSys.year(p);
    if (y <= 0 || y % this.TOURNEY_EVERY !== 0) return;
    // v29 修瑕：开赛 30 日未战自动下届再开——此前一届永不落幕，「大比未战」引导提醒永久挂起
    if (p.sect.tourney && Math.floor(p.day) - (p.sect.tourney.openDay != null ? p.sect.tourney.openDay : Math.floor(p.day)) > 30) {
      p.sect.tourney = null;
      Log.add('本届大比已落幕——你错过了赛程，只得待下届再登台。', 'info');
    }
    if ((p.sect.lastTourney || 0) >= y) return;
    if (p.sect.tourney) return;
    p.sect.tourney = { round: 0, wins: 0, openDay: Math.floor(p.day) };
    p.sect.lastTourney = y;
    Log.add('锣鼓喧天——<b>宗门大比</b>开幕了！三轮车轮战，同门比试点到为止；胜场越多彩头越厚，三连胜者魁首扬名。', 'system');
    Story.chron('宗门大比开幕');
    UI.announce('⚔ 宗门大比开幕', 'gold');
  },
  /** 生成当轮对手：v39（E360）大比 NPC 化——本宗同门按境界贴近取材（不再用怪物拟态改名），
   *  敌式复用 NpcSys.buildEnemy（E282 已对齐 buildEnemy 基式），点到为止不结怨；
   *  本宗无可出战之同门时回落兽形拟态旧制。 */
  tourneyOpponent(p, round) {
    const rp = p.realmIdx * 4 + p.layer;
    const delta = Math.min(round, 1);   // v29 修瑕：对手至多 +1 档——决胜轮原为 rp+2，刚突破新境界时最难受
    const target = rp + delta;
    const ids = GameData.NPCS.filter(d => d.sect === p.sect.id).map(d => d.id)
      .filter(id => { const s = p.npcs[id]; return s && s.alive && id !== p.partner && !(p.sworn || []).includes(id); });
    if (ids.length) {
      ids.sort((a, b) => {
        const pa = p.npcs[a] || {}, pb = p.npcs[b] || {};
        const da = Math.abs((pa.realmIdx || 0) * 4 + (pa.layer || 0) - target);
        const db = Math.abs((pb.realmIdx || 0) * 4 + (pb.layer || 0) - target);
        return da - db || (pb.realmIdx || 0) - (pa.realmIdx || 0);
      });
      const nid = ids[0];
      if (p.sect.tourney) p.sect.tourney.lastFoe = nid;   // 魁首贺语取材
      const e = NpcSys.buildEnemy(p, nid);
      e.elite = false;
      return e;
    }
    const pool = this.taskMonsters(rp + delta);
    const mid = pool.length ? Utils.pick(pool) : Utils.pick(Object.keys(GameData.MONSTERS));
    const e = buildMonster(mid, Math.max(0, rp + delta - GameData.MONSTERS[mid].power));
    e.name = `${this.TOURNEY_FOES[round] || '同门弟子'}·${Utils.pick(GameData.NAMES)}`;
    e.elite = false;
    return e;
  },
  /** 登台比武（第 T.round 轮） */
  tourneyFight() {
    const p = Game.player;
    const T = p.sect && p.sect.tourney;
    if (!T) { UI.toast('当前没有进行中的大比'); return; }
    if (Battle.active) return;
    if (T.round >= 3) { UI.toast('三轮已毕'); return; }
    Battle.start(null, {
      enemy: this.tourneyOpponent(p, T.round),
      tourney: true,
      mapName: `宗门大比 · ${this.TOURNEY_ROUNDS[T.round]}`,
    });
  },
  /** 一轮战罢（胜负皆入此）：发彩头 / 定名次 */
  onTourneyRound(win) {
    const p = Game.player;
    const T = p.sect && p.sect.tourney;
    if (!T) return;
    if (win) {
      T.wins++;
      T.round++;
      const stones = Math.round(120 * GameData.stoneEco(p.realmIdx) * (T.wins + 1) / 2);
      const contrib = 80 + p.realmIdx * 40;
      p.sect.contrib += contrib;
      Bag.addStones(stones);
      KarmaSys.addFortune(2, true);
      Log.add(`大比${this.TOURNEY_ROUNDS[T.wins - 1] || ''}胜出！彩头：贡献 +${contrib}、灵石 ${Utils.fmtNum(stones)}、气运 +2。`, 'gain');
      if (T.round >= 3) {
        p.flags = p.flags || {};
        p.flags.tourneyChamp = (p.flags.tourneyChamp || 0) + 1;
        p.rankHonor = (p.rankHonor || 0) + 1;   // v37（E244）：魁首折算天骄榜功勋 +1——排名成为可运营资产
        KarmaSys.addFortune(8, true);
        Log.add('<b>三轮全胜，大比魁首！</b>掌门亲授魁首玉佩，门中扬名——气运 +8。（生涯魁首 ' + p.flags.tourneyChamp + ' 次）', 'realm');
        // v39（E360）：魁首贺语——决胜轮对手（本宗 NPC）lineFor realm 池贺语一句 + 记忆
        const foeId = T.lastFoe;
        if (foeId && typeof NpcSys !== 'undefined' && NpcSys.def) {
          const fd = NpcSys.def(foeId);
          if (fd) {
            const line = NpcSys.lineFor(p, foeId, 'realm') || '「三阵连克，魁首之名，实至名归——他日山下再会，还请手下留情。」';
            NpcSys.mem(p, foeId, 'story', '大比折服于你');
            Log.add(`<b>${fd.name}</b> 上前抱拳，心服口服：${line}`, 'event');
          }
        }
        Story.chron('宗门大比 · 魁首');
        UI.announce('⚔ 大比魁首 · 三连胜', 'gold');
        p.sect.tourney = null;
      } else {
        Log.add('下一轮对手已定，且去台下调息片刻。', 'info');
      }
    } else {
      Log.add('大比止步于此——虽未登顶，已胜诸场的彩头尽入囊中。来届再战。', 'warn');
      Story.chron(`宗门大比 · ${T.wins} 胜止步`);
      p.sect.tourney = null;
    }
    Game.afterAction();
  },
};
