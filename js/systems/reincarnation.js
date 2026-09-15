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
    if (typeof Meta !== 'undefined' && Meta.data) {
      Meta.data.marksGiven = Meta.data.marksGiven || {};
      if (Meta.data.marksGiven[why]) return false;
      Meta.data.marksGiven[why] = 1;
      Meta.save();
    }
    const legacy = this.readLegacy();
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
    await UI.popup({
      title: '轮回镜',
      html: `<div class="stat-line"><span>历世</span><b>第 ${Math.max(1, lives + (lives ? 0 : 1))} 世将至 · 已历 ${lives} 次兵解</b></div>
        <div class="stat-line"><span>轮回印记</span><b>${marks} 枚（全属性永久 +${marks}%）</b></div>
        <div class="stat-line"><span>传承树</span><b>${tier}/10 层 · ${nextTxt}</b></div>
        <div class="tip-line" style="margin-top:6px"><b>印记来路</b>：兵解转世 +1（寿满天年再 +1）｜图鉴大成 +1｜登天塔三十层 +1｜白日飞升 +2｜个人线全通 +1</div>
        <div class="shop-section-title" style="margin-top:8px">◈ 传承树 · 十层</div>${rows}
        <div class="shop-section-title" style="margin-top:8px">◈ 前世恩怨</div><div class="tip-line">· ${grudgesTxt}</div>
        <div class="shop-section-title" style="margin-top:8px">◈ 前世编年</div>${pasts}`,
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
    // v18 传承树：每3枚印记解锁一层天赋
    const treeTier = Math.floor((legacy.marks || 0) / 3);
    if (treeTier >= 1) p2.stones.low += Math.round((origin ? origin.start.stones : 150) || 0); // 初始灵石翻倍（v29 修瑕：随遇而安按默认 150 计，此前 +0 落空）
    if (treeTier >= 2) p2.attrs.comp = Math.min(10, p2.attrs.comp + 2); // 悟性+2
    if (treeTier >= 3 && kept) p2.bag[kept] = (p2.bag[kept] || 0) + 1; // 多带一件法宝
    if (treeTier >= 4) p2.attrs.luck = Math.min(10, p2.attrs.luck + 2); // 福缘+2
    if (treeTier >= 5) { for (const k of ['gen', 'comp', 'luck', 'body']) p2.attrs[k] = Math.min(10, p2.attrs[k] + 1); } // 全属性+1
    // v19 传承树扩至八层
    if (treeTier >= 6) p2.reputation = (p2.reputation || 0) + 30;   // 名门之后：初始声望
    if (treeTier >= 7) p2.fortune = (p2.fortune || 0) + 10;   // 福泽绵长：初始气运
    if (treeTier >= 8) p2.bag['m_gupian'] = (p2.bag['m_gupian'] || 0) + 1;   // 骨血传玉：自带一枚上古碎片
    // v20 传承树九、十层
    if (treeTier >= 9) p2.flags.daoYunEcho = true;   // 道韵残响：转世保留一条已激活道韵（Stat 消费）
    if (treeTier >= 10) p2.rerollBest = true;   // 逆天改命：创角四维重掷三次取最优
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
    if (towerBest >= 10) Log.add(`前世登天塔 <b>${towerBest}</b> 层的足印化作资粮——气运 +5${towerBest >= 20 ? '、悟性 +1' : ''}。`, 'gain');
    Log.add('前世记忆未消——你可即刻叩问大道，游历中偶有前世洞府机缘。', 'info');
    Game.afterAction();
    UI.toast(`转世成功 · 第${legacy.lives}世`);
  },
};
