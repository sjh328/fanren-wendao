
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
  rank(p) {
    if (!p.sect) return null;
    const contrib = p.sect.contrib || 0;
    for (let i = this.RANKS.length - 1; i >= 0; i--) {
      if (contrib >= this.RANKS[i].contribNeed) return this.RANKS[i];
    }
    return this.RANKS[0];
  },
  /** v29：下一职位（宗门页晋升进度条用） */
  rankNext(p) {
    if (!p.sect) return null;
    const c = p.sect.contrib || 0;
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
    // v30 补遗：差事五式——历练（任意地图探索）与问签（黄历求签）两类真钩子补齐每宗五条
    // v32（F4）差事按宗门特色加权——剑宗多讨伐、丹/商多采集、磐岩多修行、周天多历练问签
    const SECT_W = {
      qingyun: { kill: 3, collect: 1, cult: 1, explore: 2, sign: 1 },
      danxia:  { kill: 1, collect: 3, cult: 2, explore: 1, sign: 1 },
      wanbao:  { kill: 1, collect: 3, cult: 1, explore: 2, sign: 2 },
      panyan:  { kill: 2, collect: 2, cult: 3, explore: 1, sign: 1 },
      zhoutian:{ kill: 1, collect: 1, cult: 2, explore: 3, sign: 2 },
    };
    const type = Utils.pickWeighted((p.sect && SECT_W[p.sect.id]) || { kill: 1, collect: 1, cult: 1, explore: 1, sign: 1 });
    // v30 宗门特色差事：本宗名目替代通用名目（35%），机制不变、文案见宗门气象
    const flav = p.sect && GameData.SECT_QUEST_FLAVOR && GameData.SECT_QUEST_FLAVOR[p.sect.id];
    const flavorName = (flav && Utils.chance(35)) ? flav[type] : null;
    if (type === 'kill') {
      const pool = this.taskMonsters(realm * 4 + p.layer);
      if (pool.length) {
        const target = Utils.pick(pool);
        const need = Utils.rand(3, 5);
        return { type, target, need, progress: 0, name: flavorName || `讨伐 · ${GameData.MONSTERS[target].name}`, desc: flavorName ? `门中差事 · ${flavorName}：击杀 ${GameData.MONSTERS[target].name} ×${need}` : `击杀 ${GameData.MONSTERS[target].name} ×${need}` };
      }
    }
    if (type === 'collect') {
      const tier = Math.min(4, Math.floor(realm / 2) + 1);
      const target = Utils.pick(GameData.matsByTier(tier));
      const need = Utils.rand(3, 6);
      return { type, target, need, progress: 0, name: flavorName || `采集 · ${GameData.ITEMS[target].name}`, desc: flavorName ? `门中差事 · ${flavorName}：上交 ${GameData.ITEMS[target].name} ×${need}` : `上交 ${GameData.ITEMS[target].name} ×${need}` };
    }
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
  newTask(p) { return this.wrapDanger(this.genTask(p), p); },
  /** 敌对派系借刀杀人：派系成员偶接高危任务（战时概率大涨）；force 用于入派当日立威（无视原任务类型） */
  wrapDanger(t, p, force = false) {
    if (!t || !p.sect || !p.sect.faction) return t;
    if (!force && (t.type !== 'kill' || !Utils.chance(WorldSys.warActive(p) ? 55 : 26))) return t;
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
    p.sect = { id: sectId, contrib: 0, faction: null, rank: 'outer', tasks: [this.newTask(p), this.newTask(p), this.newTask(p)] };
    Log.add(`你焚香沐浴，正式拜入 <b>${sect.name}</b>！${sect.bonusText}。当前职位：<b>外门弟子</b>。`, 'system');
    Game.afterAction();
  },
  submit(taskIdx) {
    const p = Game.player;
    const t = p.sect.tasks[taskIdx];
    if (!t || t.type !== 'collect' || t.progress >= t.need) return;
    const have = Bag.count(t.target);
    if (have <= 0) { UI.toast('背包中没有所需材料'); return; }
    const take = Math.min(have, t.need - t.progress);
    Bag.removeItem(t.target, take);
    t.progress += take;
    Log.add(`你向宗门上交 ${GameData.ITEMS[t.target].name} ×${take}。`, 'info');
    if (t.progress >= t.need) Log.add('任务已可领取奖励！', 'gain');
    Game.afterAction();
  },
  claim(taskIdx) {
    const p = Game.player;
    const t = p.sect.tasks[taskIdx];
    if (!t || t.progress < t.need) return;
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
    Game.afterAction();
    Battle.start(t.target, { mapName: '宗门生死状', sectDanger: taskIdx });
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
      html: `确定依附 <b>${f.name}</b> 吗？<br>${f.desc}<br>${f.giftText}。<br><span class="neg">站队之后，敌对派系将给你派发高危任务，且不可改换门庭。</span>`,
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

  /* ---------- v22 宗门大比：每五年一届，三轮车轮战，胜负皆有名次 ---------- */
  TOURNEY_EVERY: 5,
  TOURNEY_ROUNDS: ['首轮', '次轮', '决胜轮'],
  TOURNEY_FOES: ['同门师兄', '同门师姐', '首座大师兄'],
  /** 行动收尾钩子：每逢五年（游戏年）开一届大比 */
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
  /** 生成当轮对手：同门弟子（兽形灵技拟态），一轮强过一轮 */
  tourneyOpponent(p, round) {
    const rp = p.realmIdx * 4 + p.layer;
    const delta = Math.min(round, 1);   // v29 修瑕：对手至多 +1 档——决胜轮原为 rp+2，刚突破新境界时最难受
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
        KarmaSys.addFortune(8, true);
        Log.add('<b>三轮全胜，大比魁首！</b>掌门亲授魁首玉佩，门中扬名——气运 +8。（生涯魁首 ' + p.flags.tourneyChamp + ' 次）', 'realm');
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
