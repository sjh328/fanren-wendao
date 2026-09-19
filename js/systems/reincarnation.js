/* ======================================================================
 * §26 兵解转生 ReincarnationSys（多周目 / 轮回印记 / 前世恩怨）
 * ====================================================================== */
const ReincarnationSys = {
  /** v29 修瑕：轮回 legacy 改全局单键——血脉跨存档位不再断绝（读取时并合旧分键数据，只增不减） */
  legacyKey() { return 'legacy_global'; },
  readLegacy() {
    const fresh = { lives: 0, marks: 0, marksEarned: 0, treeExtra: 0, executed: {}, kept: null, grudges: [] };
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
      cur.marksEarned = Math.max(cur.marksEarned || 0, o.marksEarned || 0);
      cur.treeExtra = Math.max(cur.treeExtra || 0, o.treeExtra || 0);
      cur.towerBest = Math.max(cur.towerBest || 0, o.towerBest || 0);
      if (!cur.kept && o.kept) cur.kept = o.kept;
      if ((!cur.grudges || !cur.grudges.length) && Array.isArray(o.grudges)) cur.grudges = o.grudges;
    }
    if (!cur) return fresh;
    // v32 印记分账（A5/D1）：marks 原三位一体（属性/树层/预约货币同源），来世预约扣费曾倒扣
    // 传承树层数与永久属性。自此 marksEarned（累计获得，只增）决定树层 1~10 与属性基数；
    // marks（余额）专供消费端（来世预约/传承树 11~15）。老档 marksEarned 缺失时以当前余额
    // 起算（保守，不追溯历史铸造）。
    // v33（A1）修瑕：回填条件原为 `== null`——但 cur 可能由 fresh（marksEarned:0）起底
    // （全局键不存在、仅旧分键 legacy_auto/1/2/3 存在的 v29 前老档），0 恒非 null 致回填
    // 永不命中：这批档读档即树层归零、属性归零而余额照在。改真值判定（分账后 earned 只增
    // 且初始=marks，earned=0 而 marks>0 必为老档，回填无副作用）。
    if (!cur.marksEarned) cur.marksEarned = cur.marks || 0;
    if (cur.treeExtra == null) cur.treeExtra = 0;
    return cur;
  },
  /** v32（D2）：传承树 1~10 层随累计印记自动点亮（每 3 枚一层、封顶 30 枚），11~15 层以余额解锁 */
  TREE_EXTRA_COST: 4,
  baseTier(legacy) { return Math.floor(Math.min(30, legacy.marksEarned || 0) / 3) + (legacy.treeExtra || 0); },
  writeLegacy(l) {
    // v35（E133）修瑕：内存档路径原直拼 `Save.KEY + this.legacyKey()` 写 mem（mem['fanren_wd_legacy_global']），
    // 而 Save.read('legacy_global') 读的是 mem['legacy_global']——隐私模式/禁存储下 write 只写不读，
    // 历世数/印记/传承树/前世编年整链每会话清零、marksGiven 去重失效（E123 同族第 3 例）。统一走 Save.writeRaw
    Save.writeRaw(this.legacyKey(), JSON.stringify(l));
  },
  /** v30 轮回镜：印记多元化发放入口（图鉴大成/塔30层/飞升/个人线全通）——跨世去重，即时落盘 */
  /** v32 修瑕（E32）：传承树唯一源——原 TREE_NAMES 与 execute 内 TREE_EFFECTS 双源命名
   *  （E22 单源化不彻底），树名改动曾两处漂移。现效果与名字同表，TREE_NAMES 由其派生。
   *  apply(p2, ctx)：ctx = { kept（携入轮回的法宝 id）, origin（出身定义） } */
  TREE_EFFECTS: [
    { name: '一世之家', desc: '初始灵石翻倍', apply: (p2, ctx) => { p2.stones.low += Math.round((ctx.origin ? ctx.origin.start.stones : 150) || 0); } },
    { name: '生而知之', desc: '悟性 +2', apply: (p2) => { p2.attrs.comp = Math.min(10, p2.attrs.comp + 2); } },
    { name: '故物重携', desc: '多带一件法宝', apply: (p2, ctx) => { if (ctx.kept) p2.bag[ctx.kept] = (p2.bag[ctx.kept] || 0) + 1; } },
    { name: '福缘深厚', desc: '福缘 +2', apply: (p2) => { p2.attrs.luck = Math.min(10, p2.attrs.luck + 2); } },
    { name: '道基天成', desc: '全属性 +1', apply: (p2) => { for (const k of ['gen', 'comp', 'luck', 'body']) p2.attrs[k] = Math.min(10, p2.attrs[k] + 1); } },
    { name: '名门之后', desc: '初始声望 +30', apply: (p2) => { p2.reputation = (p2.reputation || 0) + 30; } },
    { name: '福泽绵长', desc: '初始气运 +10', apply: (p2) => { p2.fortune = (p2.fortune || 0) + 10; } },
    { name: '骨血传玉', desc: '自带上古碎片', apply: (p2) => { p2.bag['m_gupian'] = (p2.bag['m_gupian'] || 0) + 1; } },
    { name: '道韵残响', desc: '保留一条前世道韵', apply: (p2) => { p2.flags.daoYunEcho = true; } },
    { name: '逆天改命', desc: '四维重掷取最优', apply: (p2) => { p2.rerollBest = true; } },
    /* —— v32（D2）传承树 11~15 层（余额解锁）—— */
    // v35（E149）修瑕：道胎原 layer=2 实发「练气后期」（LAYER_NAMES[2]），与描述「练气二层」差一档、
    // 且与来世预约「生而近道（练气三层）」同质撞车——归位为 layer=1（练气中期），两者拉开一档
    { name: '道胎', desc: '出生即练气二层', apply: (p2) => { p2.layer = Math.max(p2.layer, 1); } },
    { name: '灵兽通心', desc: '驯服初始亲昵 +20', apply: (p2) => { p2.bondGift = 20; } },
    { name: '旧识遍江湖', desc: '初始声望 +50', apply: (p2) => { p2.reputation = (p2.reputation || 0) + 50; } },
    { name: '道骨', desc: '全属性再 +1', apply: (p2) => { for (const k of ['gen', 'comp', 'luck', 'body']) p2.attrs[k] = Math.min(10, p2.attrs[k] + 1); } },
    { name: '轮回行者', desc: '每次兵解额外 +1 印记', apply: (p2) => { p2.flags.reincWalker = true; } },
  ],
  get TREE_NAMES() { return this.TREE_EFFECTS.map(t => `${t.name}（${t.desc}）`); },
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
    legacy.marksEarned = (legacy.marksEarned || 0) + n;   // v32（D1）：分账——累计获得同步入账
    this.writeLegacy(legacy);
    // v32 修瑕（E34）+ v35（E180）：当世 grantMarks 原只回写已兵解者（p.reinc 存在）——首世玩家
    // 靠图鉴大成/登天塔/飞升攒下的印记「全属性永久 +X%」当世一个百分点不加（轮回镜承诺失义，
    // 且开始界面即可开轮回镜）。现首世建立轻量 reinc 使承诺当世兑现；firstLife 标记隔离前世
    // 专属语义（成就「轮回初醒」仍须真正兵解、前世洞府机缘仍只属转世者）
    if (Game.player) {
      if (!Game.player.reinc) Game.player.reinc = { lives: 0, marks: 0, compPct: 0, grudges: [], firstLife: true };
      Game.player.reinc.marks = Math.min(30, legacy.marksEarned || 0);
    }
    Log.add(`✦ 轮回印记 +${n}（${why}）——血脉深处的道韵又厚了一分（累计获得 ${legacy.marksEarned} 枚）。`, 'realm');
    UI.toast(`✦ 轮回印记 +${n}`);
    return true;
  },
  /** v30 轮回镜：跨世面板——世数 / 印记 / 十层传承树 / 仇怨 / 前世编年（开始界面与游戏内皆可开） */
  async mirror() {
    const legacy = this.readLegacy();
    const marks = legacy.marks || 0;
    const earned = legacy.marksEarned || 0;
    const lives = legacy.lives || 0;
    const tier = this.baseTier(legacy);
    const rows = this.TREE_NAMES.map((name, i) => {
      const extra = i >= 10;   // v32（D2）：11~15 层以余额解锁
      const on = extra ? (legacy.treeExtra || 0) >= i - 9 : tier >= i + 1;
      const needTxt = extra
        ? (on ? '（已解锁）' : `（余额解锁 ${this.TREE_EXTRA_COST} 枚）`)
        : (on ? '' : `（需累计 ${(i + 1) * 3} 枚）`);
      return `<div class="tip-line">· ${on ? '<b class="hl">✦</b>' : '<span style="color:var(--text-faint)">🔒</span>'} 第${i + 1}层 <b>${name}</b>${needTxt}</div>`;
    }).join('');
    const nextEarned = tier < 10 ? `1~10 层距下一层还差 <b class="hl">${(Math.floor(earned / 3) + 1) * 3 - earned}</b> 枚累计印记` : '';
    const extraIdx = legacy.treeExtra || 0;
    const natFull = Math.floor(Math.min(30, earned) / 3) >= 10;   // v32：1~10 层须按累计自然点满，余额层不可预购跳层
    const nextExtra = natFull && extraIdx < 5
      ? `第 ${11 + extraIdx} 层可以 <b class="hl">${this.TREE_EXTRA_COST}</b> 枚余额解锁`
      : (extraIdx >= 5 ? '十五层圆满——血脉之道，已至极致' : '');
    const nextTxt = [nextEarned, nextExtra].filter(Boolean).join('；') || '十层圆满——血脉之道，已至极致';
    const buyOpt = (natFull && extraIdx < 5 && marks >= this.TREE_EXTRA_COST)
      ? { text: `✦ 解锁传承树第 ${11 + extraIdx} 层 · ${this.TREE_NAMES[10 + extraIdx]}（耗 ${this.TREE_EXTRA_COST} 枚余额）`, value: '__buyTree' }
      : null;
    const grudgesTxt = (legacy.grudges || []).length
      ? (legacy.grudges.map(id => (typeof NpcSys !== 'undefined' && NpcSys.def(id) || {}).name).filter(Boolean).join('、') || '（前世的恩怨仍在人间游荡）')
      : '无';
    const pasts = (legacy.pastLives || []).map(l => `<div class="tip-line">· 第${l.no}世 · ${l.who} —— ${l.life}</div>`).join('') || '<div class="tip-line">· 尘世茫茫，尚无记录。</div>';
    // v31 仙籍：历世最高仙阶（跨世展示）
    const xjBest = legacy.xianjieBest || 0;
    const xjTxt = xjBest > 0 ? `<b class="hl">${(GameData.XIAN_TIERS[xjBest - 1] || {}).name || '?'}</b>${xjBest >= 4 ? '（道祖之境自在此心）' : ''}` : '未入仙籍';
    const res = await UI.popup({
      title: '轮回镜',
      html: `<div class="stat-line"><span>历世</span><b>第 ${lives + 1} 世将至 · 已历 ${lives} 次兵解</b></div>
        <div class="stat-line"><span>轮回印记</span><b>累计 ${earned} 枚 · 余额 ${marks} 枚（全属性永久 +${Math.min(30, earned)}%）</b></div>
        <div class="stat-line"><span>传承树</span><b>${tier}/15 层 · ${nextTxt}</b></div>
        <div class="tip-line" style="margin-top:6px"><b>印记来路</b>：兵解转世 +1/世（寿满天年再 +1）｜个人线每条 +1｜图鉴每类 +1｜白日飞升 +2｜登天塔三十层 +1｜道祖之境 +1</div>
        <div class="shop-section-title" style="margin-top:8px">◈ 传承树 · 十五层</div>${rows}
        <div class="shop-section-title" style="margin-top:8px">◈ 前世恩怨</div><div class="tip-line">· ${grudgesTxt}</div>
        <div class="shop-section-title" style="margin-top:8px">◈ 前世编年</div>${pasts}
        <div class="shop-section-title" style="margin-top:8px">◈ 仙籍</div><div class="tip-line">· 历世最高仙阶：${xjTxt}</div>`,
      options: buyOpt ? [buyOpt, { text: '合 上 镜', value: true, primary: true }] : [{ text: '合 上 镜', value: true, primary: true }],
    });
    if (res === '__buyTree') {
      // v32（D2）：传承树 11~15 层解锁（扣余额，不影响累计获得与属性）
      const lg = this.readLegacy();
      if ((lg.marks || 0) < this.TREE_EXTRA_COST) return this.mirror();   // v33（E83）：购买口二次余额校验（弹窗生成时校验与扣费之间存在任何异步消费即可能透支）
      lg.marks = (lg.marks || 0) - this.TREE_EXTRA_COST;
      lg.treeExtra = (lg.treeExtra || 0) + 1;
      this.writeLegacy(lg);
      Log.add(`血脉轰鸣——传承树第 ${10 + lg.treeExtra} 层【${this.TREE_NAMES[9 + lg.treeExtra]}】解锁！（印记余额 ${lg.marks}）`, 'realm');
      UI.toast(`传承树第 ${10 + lg.treeExtra} 层解锁`);
      return this.mirror();   // 重开镜面继续查看
    }
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
        · 得 1 枚<b>轮回印记</b>：累计获得数决定全属性加成（+1%/枚，封顶 30）与传承树 1~10 层（现累计 ${legacy.marksEarned || 0} 枚）<br>
        · 传承树已解锁 ${this.baseTier(legacy)}/15 层：1~10 层随累计印记自动点亮，11~15 层可以余额解锁<br>
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
    const curPlanCost = curPlan ? ((PLANS.find(x => x.id === curPlan) || {}).cost || 0) : 0;
    const pickPlan = await UI.popup({
      title: '来世预约',
      html: `轮回镜前，你可以此生的印记，为来世预约一份底气（现印记 <b>${legacy.marks || 0}</b>）。<br><span class="tip-line">· 预约即时生效、仅此一次；换约自动退掉旧约印记、补扣差额。</span>`,
      options: PLANS.map(pl => {
        const owned = curPlan === pl.id;
        const net = pl.cost - (owned ? 0 : curPlanCost);   // v33（E84）：换约退差价——原换约不退旧价（6 枚旧约换 2 枚新约实付 8 枚）
        const afford = (legacy.marks || 0) >= Math.max(0, net);
        return { text: `${owned ? '✓ 已预约 · ' : ''}${pl.name}（${owned ? '已约' : `${net >= 0 ? pl.cost : `退 ${curPlanCost} 补 ${pl.cost}`}`} 印记）——${pl.desc}${!owned && !afford ? '（印记不足）' : ''}`, value: owned ? null : pl.id };
      }).concat([{ text: curPlan ? '维持现有预约' : '不作预约', value: null }]),
    });
    if (pickPlan) {
      const pl = PLANS.find(x => x.id === pickPlan);
      if (pl && curPlan !== pl.id) {
        const net = pl.cost - curPlanCost;
        if ((legacy.marks || 0) >= Math.max(0, net)) {
          legacy.marks = (legacy.marks || 0) - net;   // v33（E84）：净差额结算
          legacy.plan = pl.id;
          this.writeLegacy(legacy);
          Log.add(`轮回镜中光华一闪——${curPlan ? '旧约印记已退、' : ''}你以净 ${net >= 0 ? net : 0} 枚印记（付 ${pl.cost}${curPlanCost ? ` 退 ${curPlanCost}` : ''}）预约了来世的【${pl.name}】。（印记余 ${legacy.marks}）`, 'realm');
        } else UI.toast('印记不足（换约需补差额）');
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
    // v32（D7）：兵解防重护栏——同一世（同 lifeUid）重复 execute 不再发印记与世数，
    // 堵「手动槽留旧档反复兵解刷印记/世数」的漏网（去重集只挡一次性来源，挡不住每世基础 +1）
    // v33（E88）：指纹单源化——migrate 自 v32 起必派生 lifeUid，execute 侧兜底公式删除
    //（双轨并存是漂移温床）；极老档缺 lifeUid 时跳过护栏（退回 v31 前行为，不误伤）
    const fp = oldP.lifeUid;
    legacy.executed = legacy.executed || {};
    const reExecuted = fp ? !!legacy.executed[fp] : false;
    if (fp && !reExecuted) {
      legacy.executed[fp] = 1;
      const exKeys = Object.keys(legacy.executed);
      if (exKeys.length > 40) delete legacy.executed[exKeys[0]];   // 防无界增长
      const walkerBonus = (oldP.flags && oldP.flags.reincWalker) ? 1 : 0;   // v32（D2）传承树十五层
      legacy.lives = (legacy.lives || 0) + 1;
      legacy.marks = (legacy.marks || 0) + 1 + (extraMarks || 0) + walkerBonus;
      legacy.marksEarned = (legacy.marksEarned || 0) + 1 + (extraMarks || 0) + walkerBonus;
    }
    legacy.kept = kept || null;
    legacy.grudges = grudges;
    // v28 联动：跨世塔绩入传承——登天塔的足印不随轮回散去
    legacy.towerBest = Math.max(legacy.towerBest || 0, (oldP.counters && oldP.counters.towerBest) || 0);
    // v30 轮回镜：前世编年归档（保留最近三世）；v32（D7）重复兵解不重复归档
    if (!reExecuted) {
      legacy.pastLives = (legacy.pastLives || []).slice(-2);
      legacy.pastLives.push({
        no: legacy.lives,
        who: `${oldP.name}（${GameData.REALM_NAMES[oldP.realmIdx] || '?'}期）`,
        life: oldP.flags && oldP.flags.ascended ? '白日飞升，仙门之外' : (oldP.lifeCut ? `折寿 ${oldP.lifeCut} 年，抱憾而终` : '一生行止，留待后说'),
      });
    }
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
    const pendingTreeTier = this.baseTier(legacy);   // v32（D1）：树层改按累计获得（含余额层），不再随预约扣费回退
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
    p2.reinc = { lives: legacy.lives, marks: Math.min(30, legacy.marksEarned || 0), compPct: 10, grudges: grudges };   // v32（D1）：属性口径改累计获得（封顶 30），不随预约扣费回退
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
    const treeTier = this.baseTier(legacy);   // v32（D1）：累计获得 + 余额层
    // v35（E132）修瑕：基础携带改为「无条件 +1」且置于树层效果之前——原兜底式 `!p2.bag[kept]`
    // 会被「故物重携」自己加的那件堵死（树层 +1 后条件即假、兜底跳过），第 3 层自 v26 起是死天赋
    if (kept) p2.bag[kept] = (p2.bag[kept] || 0) + 1;
    // v32 修瑕（E32）：树效果走模块唯一源 TREE_EFFECTS（apply 参数化 p2/ctx），出生天赋清单日志随之
    const unlockedTalents = this.TREE_EFFECTS.filter((t2, i2) => treeTier >= i2 + 1);
    for (const t2 of unlockedTalents) t2.apply(p2, { kept, origin });
    // v28 联动：前世塔绩化作来世资粮——跨世登塔最佳 ≥10 层气运 +5，≥20 层再 +1 悟性
    const towerBest = legacy.towerBest || 0;
    if (towerBest >= 10) p2.fortune = (p2.fortune || 0) + 5;
    if (towerBest >= 20) p2.attrs.comp = Math.min(10, p2.attrs.comp + 1);
    for (const gid of grudges) {
      const s = p2.npcs[gid];
      if (s) { s.rel = -35; s.grudge = true; s.pastLife = true; }
    }
    Game.player = p2;
    p2.pendingDao = true; // 前世记忆：可即刻叩问大道
    Save.write('auto', p2);   // v29：坐化档的 dead 标记随新身落盘清除，防「已坐化无法读取」误锁
    Log.clear();
    if (reExecuted) Log.add('轮回深处旧影一闪——此世因果已了，再入轮回亦无新得。（防重复兵解护栏）', 'warn');
    Log.add('<b>兵解转世</b>——一道流光划破夜空，落入凡间某处。啼哭声中，你重开一世。', 'system');
    Log.add(`此为第 <b>${legacy.lives}</b> 世：轮回印记累计 ${legacy.marksEarned || 0}（全属性 +${Math.min(30, legacy.marksEarned || 0)}%）、前世悟性传承 +10%${kept ? `、携【${GameData.ITEMS[kept].name}】转世` : ''}。`, 'gain');
    if (grudges.length) Log.add(`前世仇怨如附骨之疽：${grudges.map(id => (NpcSys.def(id) || {}).name).filter(Boolean).join('、')} 与你再结梁子。`, 'warn');
    // v31（E22）：出生天赋清单——传承树解锁到第几层、带来哪些天赋，一目了然
    if (unlockedTalents.length) Log.add(`血脉深处的传承苏醒（传承树 ${treeTier}/15 层）：${unlockedTalents.map(t2 => t2.name).join('、')}。`, 'gain');
    if (towerBest >= 10) Log.add(`前世登天塔 <b>${towerBest}</b> 层的足印化作资粮——气运 +5${towerBest >= 20 ? '、悟性 +1' : ''}。`, 'gain');
    Log.add('前世记忆未消——你可即刻叩问大道，游历中偶有前世洞府机缘。', 'info');
    Game.afterAction();
    UI.toast(`转世成功 · 第${legacy.lives}世`);
  },
};
