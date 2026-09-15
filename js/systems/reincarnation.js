/* ======================================================================
 * §26 兵解转生 ReincarnationSys（多周目 / 轮回印记 / 前世恩怨）
 * ====================================================================== */
const ReincarnationSys = {
  /** v29 修瑕：轮回 legacy 改全局单键——血脉跨存档位不再断绝（读取时并合旧分键数据，只增不减） */
  legacyKey() { return 'legacy_global'; },
  readLegacy() {
    const fresh = { lives: 0, marks: 0, kept: null, grudges: [] };
    let cur = null;
    const d = Save.read(this.legacyKey());
    if (d && typeof d === 'object') cur = { ...d };
    // 旧版按存档位分键（legacy_auto/1/2/3）：各项取最大值并合，一次性迁移、不回写旧键
    for (const k of ['legacy_auto', 'legacy_1', 'legacy_2', 'legacy_3']) {
      const o = Save.read(k);
      if (!o || typeof o !== 'object') continue;
      cur = cur || { ...fresh };
      cur.lives = Math.max(cur.lives || 0, o.lives || 0);
      cur.marks = Math.max(cur.marks || 0, o.marks || 0);
      cur.towerBest = Math.max(cur.towerBest || 0, o.towerBest || 0);
      if (!cur.kept && o.kept) cur.kept = o.kept;
      if ((!cur.grudges || !cur.grudges.length) && Array.isArray(o.grudges)) cur.grudges = o.grudges;
    }
    return cur || fresh;
  },
  writeLegacy(l) {
    const raw = JSON.stringify(l);
    try {
      if (Save.storage.setItem) Save.storage.setItem(Save.KEY + this.legacyKey(), raw);
      else Save.mem[Save.KEY + this.legacyKey()] = raw;
    } catch (e) { /* ignore */ }
  },
  /** v30 轮回镜：印记多元化发放入口（图鉴大成/塔30层/飞升/个人线全通）——跨世去重，即时落盘 */
  TREE_NAMES: [
    '一世之家（初始灵石翻倍）', '生而知之（悟性 +2）', '故物重携（多带一件法宝）', '福缘深厚（福缘 +2）',
    '道基天成（全属性 +1）', '名门之后（初始声望 +30）', '福泽绵长（初始气运 +10）', '骨血传玉（自带上古碎片）',
    '道韵残响（保留一条道韵）', '逆天改命（四维重掷取最优）',
  ],
  grantMarks(n, why) {
    // v31 修瑕：去重集改存全局 legacy（跨档单键）——原存 Meta.data.marksGiven，随每次 Meta.load
    // 重建被丢弃，重进游戏后图鉴大成/个人线全通/白日飞升等印记全部可跨世重刷（多周目经济崩坏）。
    // 旧档 Meta 里尚存的去重集在此一次性并合迁移，只增不减。
    const legacy = this.readLegacy();
    legacy.marksGiven = legacy.marksGiven || {};
    if (typeof Meta !== 'undefined' && Meta.data && Meta.data.marksGiven) {
      for (const k of Object.keys(Meta.data.marksGiven)) if (!legacy.marksGiven[k]) legacy.marksGiven[k] = 1;
      delete Meta.data.marksGiven;
    }
    if (legacy.marksGiven[why]) return false;
    legacy.marksGiven[why] = 1;
    legacy.marks = (legacy.marks || 0) + n;
    this.writeLegacy(legacy);
    Log.add(`✦ 轮回印记 +${n}（${why}）——血脉深处的道韵又厚了一分（累计 ${legacy.marks} 枚）。`, 'realm');
    UI.toast(`✦ 轮回印记 +${n}`);
    return true;
  },
  /** v30 轮回镜：跨世面板——世数 / 印记 / 十层传承树 / 仇怨 / 前世编年（开始界面与游戏内皆可开） */
  async mirror() {
    const legacy = this.readLegacy();
    const marks = legacy.marks || 0;
    const lives = legacy.lives || 0;
    const tier = Math.floor(marks / 3);
    const rows = this.TREE_NAMES.map((name, i) => {
      const on = tier >= i + 1;
      return `<div class="tip-line">· ${on ? '<b class="hl">✦</b>' : '<span style="color:var(--text-faint)">🔒</span>'} 第${i + 1}层 <b>${name}</b>${on ? '' : `（需印记 ${(i + 1) * 3} 枚）`}</div>`;
    }).join('');
    const nextTxt = tier < 10 ? `距下一层还差 <b class="hl">${(tier + 1) * 3 - marks}</b> 枚印记` : '十层圆满——血脉之道，已至极致';
    const grudgesTxt = (legacy.grudges || []).length
      ? (legacy.grudges.map(id => (typeof NpcSys !== 'undefined' && NpcSys.def(id) || {}).name).filter(Boolean).join('、') || '（前世的恩怨仍在人间游荡）')
      : '无';
    const pasts = (legacy.pastLives || []).map(l => `<div class="tip-line">· 第${l.no}世 · ${l.who} —— ${l.life}</div>`).join('') || '<div class="tip-line">· 尘世茫茫，尚无记录。</div>';
    // v31 仙籍：历世最高仙阶（跨世展示）
    const xjBest = legacy.xianjieBest || 0;
    const xjTxt = xjBest > 0 ? `<b class="hl">${(GameData.XIAN_TIERS[xjBest - 1] || {}).name || '?'}</b>${xjBest >= 4 ? '（道祖之境自在此心）' : ''}` : '未入仙籍';
    await UI.popup({
      title: '轮回镜',
      html: `<div class="stat-line"><span>历世</span><b>第 ${lives + 1} 世将至 · 已历 ${lives} 次兵解</b></div>
        <div class="stat-line"><span>轮回印记</span><b>${marks} 枚（全属性永久 +${marks}%）</b></div>
        <div class="stat-line"><span>传承树</span><b>${tier}/10 层 · ${nextTxt}</b></div>
        <div class="tip-line" style="margin-top:6px"><b>印记来路</b>：兵解转世 +1（寿满天年再 +1）｜图鉴大成 +1｜登天塔三十层 +1｜白日飞升 +2｜个人线全通 +1</div>
        <div class="shop-section-title" style="margin-top:8px">◈ 传承树 · 十层</div>${rows}
        <div class="shop-section-title" style="margin-top:8px">◈ 前世恩怨</div><div class="tip-line">· ${grudgesTxt}</div>
        <div class="shop-section-title" style="margin-top:8px">◈ 前世编年</div>${pasts}
        <div class="shop-section-title" style="margin-top:8px">◈ 仙籍</div><div class="tip-line">· 历世最高仙阶：${xjTxt}</div>`,
      options: [{ text: '合 上 镜', value: true, primary: true }],
    });
  },

  /** v29 天年：opts.force=坐化转世（寿元尽亦入轮回）；opts.extraMarks=额外印记（寿满天年） */
  async open(opts = {}) {
    const p = Game.player;
    if (!p.canReincarnate && !opts.force) { UI.toast('尚无兵解转世之机'); return; }
    const legacy = this.readLegacy();
    const ok = await UI.popup({
      title: '兵解转世',
      html: `${opts.deathNote ? opts.deathNote + '<br>' : ''}渡劫失利，大道蒙尘。兵解者，散去肉身、以神魂投胎再修——<br>
        · 转世继承 <b>10% 悟性加成</b>与<b>前世记忆</b>（游历中偶得前世洞府机缘）<br>
        · 可携<b>一件法宝</b>入轮回<br>
        · 得 1 枚<b>轮回印记</b>：永久 +1% 全属性上限，可叠加（现累计 ${legacy.marks || 0} 枚）<br>
        · 传承树已解锁 ${Math.floor((legacy.marks || 0) / 3)} 层：每3枚印记解锁一层天赋<br>
        · 来世重择<b>出身与大道</b>；前世仇怨，亦会随记忆寻来<br>
        <span class="neg">此世修为、境界、灵石、宗门尽付东流。</span>`,
      options: [{ text: '兵 解', value: true, primary: true }, { text: '再苟一时', value: false }],
    });
    if (!ok) return;
    // v31 来世预约：印记消费端——花印记为来世定制一份底气（被动加成第一次变主动构建）
    const PLANS = [
      { id: 'ring',   cost: 6, name: '仙缘随行', desc: '来世开场自带【仙缘玉环】×1（grade5 饰品）' },
      { id: 'layer3', cost: 4, name: '生而近道', desc: '来世初始境界即为练气三层' },
      { id: 'comp',   cost: 2, name: '宿慧一点', desc: '来世悟性 +1（上限十）' },
    ];
    const curPlan = legacy.plan || null;
    const pickPlan = await UI.popup({
      title: '来世预约',
      html: `轮回镜前，你可以此生的印记，为来世预约一份底气（现印记 <b>${legacy.marks || 0}</b>）。<br><span class="tip-line">· 预约即时生效、仅此一次；再下一次兵解前可重新预约。</span>`,
      options: PLANS.map(pl => {
        const owned = curPlan === pl.id;
        const afford = (legacy.marks || 0) >= pl.cost;
        return { text: `${owned ? '✓ 已预约 · ' : ''}${pl.name}（${pl.cost} 印记）——${pl.desc}${!owned && !afford ? '（印记不足）' : ''}`, value: owned ? null : pl.id };
      }).concat([{ text: curPlan ? '维持现有预约' : '不作预约', value: null }]),
    });
    if (pickPlan) {
      const pl = PLANS.find(x => x.id === pickPlan);
      if (pl && curPlan !== pl.id && (legacy.marks || 0) >= pl.cost) {
        legacy.marks -= pl.cost;
        legacy.plan = pl.id;
        this.writeLegacy(legacy);
        Log.add(`轮回镜中光华一闪——你以 ${pl.cost} 枚印记预约了来世的【${pl.name}】。（印记余 ${legacy.marks}）`, 'realm');
      }
    }
    // 择法宝入轮回
    const arts = Object.keys(p.bag)
      .filter(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'artifact')
      .sort((a, b) => (GameData.ITEMS[b].grade || 0) - (GameData.ITEMS[a].grade || 0))
      .slice(0, 6);
    let kept = null;
    if (arts.length) {
      kept = await UI.popup({
        title: '携带入轮回',
        html: '择一件法宝，以本命精血温养护持，随身入轮回：',
        options: [...arts.map(id => ({ text: GameData.ITEMS[id].name, value: id })), { text: '不带法宝', value: null }],
      });
    }
    // 择出身
    const originId = await UI.popup({
      title: '转世 · 投胎出身',
      html: '神魂坠入轮回，可择来世出身：',
      options: [...GameData.ORIGINS.map(o => ({ text: `${o.name} · ${o.desc}`, value: o.id })), { text: '随遇而安（不择出身）', value: null }],
    });
    if (originId === undefined) return;
    const origin = GameData.ORIGINS.find(o => o.id === originId) || null;
    await this.execute(p, legacy, kept, origin, opts.extraMarks || 0);
  },
  async execute(oldP, legacy, kept, origin, extraMarks = 0) {
    // 前世仇怨：只带走此生尚存的心结（已化解者不入轮回）
    const grudges = Object.keys(oldP.npcs || {}).filter(id => oldP.npcs[id].grudge && oldP.npcs[id].alive);
    legacy.lives = (legacy.lives || 0) + 1;
    legacy.marks = (legacy.marks || 0) + 1 + (extraMarks || 0);
    legacy.kept = kept || null;
    legacy.grudges = grudges;
    // v28 联动：跨世塔绩入传承——登天塔的足印不随轮回散去
    legacy.towerBest = Math.max(legacy.towerBest || 0, (oldP.counters && oldP.counters.towerBest) || 0);
    // v30 轮回镜：前世编年归档（保留最近三世）
    legacy.pastLives = (legacy.pastLives || []).slice(-2);
    legacy.pastLives.push({
      no: legacy.lives,
      who: `${oldP.name}（${GameData.REALM_NAMES[oldP.realmIdx] || '?'}期）`,
      life: oldP.flags && oldP.flags.ascended ? '白日飞升，仙门之外' : (oldP.lifeCut ? `折寿 ${oldP.lifeCut} 年，抱憾而终` : '一生行止，留待后说'),
    });
    this.writeLegacy(legacy);
    // v20 道韵残响：传承树九层保留上一世最强的一条已激活道韵
    let echo = null;
    if (oldP.flags && oldP.flags.daoYunEcho) {
      const active = (typeof Stat !== 'undefined' && Stat.activeDaoYun) ? Stat.activeDaoYun(oldP) : [];
      if (active.length) echo = active[active.length - 1].fx;
    }
    // 新身
    // v31 修瑕（E18）：传承树十层「逆天改命」当世生效——rollAttrs 读的是 Game.player.rerollBest（前世的
    // 旗标），本世旗标在 create 之后才写入，首个攒够 30 印记的转世拿不到三掷取优（晚一世才生效）。
    // 先按新 treeTier 临时置位再掷；旧身对象随即被丢弃，无需还原。
    const pendingTreeTier = Math.floor((legacy.marks || 0) / 3);
    if (pendingTreeTier >= 10 && Game.player && !Game.player.rerollBest) Game.player.rerollBest = true;
    const attrs = PlayerFactory.rollAttrs();
    if (origin) for (const [k, v] of Object.entries(origin.mods)) attrs[k] = Utils.clamp(attrs[k] + v, 1, 10);
    const p2 = PlayerFactory.create(oldP.name, attrs);
    p2.origin = origin ? origin.id : null;
    if (origin) {
      p2.stones.low += origin.start.stones || 0;
      for (const [id, n] of Object.entries(origin.start.bag || {})) p2.bag[id] = (p2.bag[id] || 0) + n;
      if (origin.start.karma) p2.karma = (p2.karma || 0) + origin.start.karma;   // v19 血河遗孤：孽障随行
      if (origin.start.jade) p2.jade = Math.max(p2.jade || 0, origin.start.jade);   // v19：残玉先鸣
      if (origin.tameSkill) p2.tameSkill = Math.max(p2.tameSkill || 0, origin.tameSkill);   // v19：驯手心得
    }
    p2.reinc = { lives: legacy.lives, marks: legacy.marks, compPct: 10, grudges: grudges };
    if (echo) p2.reinc.echo = echo;   // v20 道韵残响
    // v31 多周目变奏：前世残忆旗标——c2/c5/c7 开篇将演出「前世残忆」变体场景（story._vis req 路由）
    p2.story = { seen: {}, mid: {}, choices: {}, flags: { remembrance: true } };
    // v31 来世预约兑现：legacy.plan 在新身落地（兑现后清除，防重复）
    if (legacy.plan === 'ring') { p2.bag['s_xy_huan'] = (p2.bag['s_xy_huan'] || 0) + 1; }
    else if (legacy.plan === 'layer3') { p2.layer = 2; }
    else if (legacy.plan === 'comp') { p2.attrs.comp = Math.min(10, p2.attrs.comp + 1); }
    if (legacy.plan) { Log.add(`来世预约兑现——【${{ ring: '仙缘随行', layer3: '生而近道', comp: '宿慧一点' }[legacy.plan] || legacy.plan}】随神魂入胎。`, 'gain'); legacy.plan = null; this.writeLegacy(legacy); }
    // v18 传承树：每3枚印记解锁一层天赋；v31 修瑕（E22）：效果单源化为 TREE_EFFECTS 表——
    // 原散落 10 个 if，层间耦合曾两度出连环 bug；行为逐条等价，另附出生天赋清单日志
    const treeTier = Math.floor((legacy.marks || 0) / 3);
    const TREE_EFFECTS = [
      { at: 1,  name: '一世之家 · 初始灵石翻倍', apply: () => { p2.stones.low += Math.round((origin ? origin.start.stones : 150) || 0); } },
      { at: 2,  name: '生而知之 · 悟性 +2', apply: () => { p2.attrs.comp = Math.min(10, p2.attrs.comp + 2); } },
      { at: 3,  name: '故物重携 · 多带一件法宝', apply: () => { if (kept) p2.bag[kept] = (p2.bag[kept] || 0) + 1; } },
      { at: 4,  name: '福缘深厚 · 福缘 +2', apply: () => { p2.attrs.luck = Math.min(10, p2.attrs.luck + 2); } },
      { at: 5,  name: '道基天成 · 全属性 +1', apply: () => { for (const k of ['gen', 'comp', 'luck', 'body']) p2.attrs[k] = Math.min(10, p2.attrs[k] + 1); } },
      { at: 6,  name: '名门之后 · 初始声望 +30', apply: () => { p2.reputation = (p2.reputation || 0) + 30; } },
      { at: 7,  name: '福泽绵长 · 初始气运 +10', apply: () => { p2.fortune = (p2.fortune || 0) + 10; } },
      { at: 8,  name: '骨血传玉 · 自带上古碎片', apply: () => { p2.bag['m_gupian'] = (p2.bag['m_gupian'] || 0) + 1; } },
      { at: 9,  name: '道韵残响 · 保留一条前世道韵', apply: () => { p2.flags.daoYunEcho = true; } },
      { at: 10, name: '逆天改命 · 创角四维三掷取优', apply: () => { p2.rerollBest = true; } },
    ];
    const unlockedTalents = TREE_EFFECTS.filter(t2 => treeTier >= t2.at);
    for (const t2 of unlockedTalents) t2.apply();
    // v28 联动：前世塔绩化作来世资粮——跨世登塔最佳 ≥10 层气运 +5，≥20 层再 +1 悟性
    const towerBest = legacy.towerBest || 0;
    if (towerBest >= 10) p2.fortune = (p2.fortune || 0) + 5;
    if (towerBest >= 20) p2.attrs.comp = Math.min(10, p2.attrs.comp + 1);
    // v26 修瑕：第三层「多带一件法宝」加的那件不再被这里覆盖回 1
    if (kept && !p2.bag[kept]) p2.bag[kept] = 1;
    for (const gid of grudges) {
      const s = p2.npcs[gid];
      if (s) { s.rel = -35; s.grudge = true; s.pastLife = true; }
    }
    Game.player = p2;
    p2.pendingDao = true; // 前世记忆：可即刻叩问大道
    Save.write('auto', p2);   // v29：坐化档的 dead 标记随新身落盘清除，防「已坐化无法读取」误锁
    Log.clear();
    Log.add('<b>兵解转世</b>——一道流光划破夜空，落入凡间某处。啼哭声中，你重开一世。', 'system');
    Log.add(`此为第 <b>${legacy.lives}</b> 世：轮回印记 ×${legacy.marks}（全属性 +${legacy.marks}%）、前世悟性传承 +10%${kept ? `、携【${GameData.ITEMS[kept].name}】转世` : ''}。`, 'gain');
    if (grudges.length) Log.add(`前世仇怨如附骨之疽：${grudges.map(id => (NpcSys.def(id) || {}).name).filter(Boolean).join('、')} 与你再结梁子。`, 'warn');
    // v31（E22）：出生天赋清单——传承树解锁到第几层、带来哪些天赋，一目了然
    if (unlockedTalents.length) Log.add(`血脉深处的传承苏醒（传承树 ${treeTier}/10 层）：${unlockedTalents.map(t2 => t2.name.split(' · ')[0]).join('、')}。`, 'gain');
    if (towerBest >= 10) Log.add(`前世登天塔 <b>${towerBest}</b> 层的足印化作资粮——气运 +5${towerBest >= 20 ? '、悟性 +1' : ''}。`, 'gain');
    Log.add('前世记忆未消——你可即刻叩问大道，游历中偶有前世洞府机缘。', 'info');
    Game.afterAction();
    UI.toast(`转世成功 · 第${legacy.lives}世`);
  },
};
