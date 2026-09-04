/** 秘境深度对宝箱附加掉率的辅助 */
function depth2(depth) { return depth * 2; }

/* ======================================================================
 * §26 兵解转生 ReincarnationSys（多周目 / 轮回印记 / 前世恩怨）
 * ====================================================================== */
const ReincarnationSys = {
  /** 轮回 legacy 按存档位独立存放，不污染玩家存档结构 */
  legacyKey() { return 'legacy_' + (Game.slot == null ? 'auto' : Game.slot); },
  readLegacy() {
    const d = Save.read(this.legacyKey());
    return d && typeof d === 'object' ? d : { lives: 0, marks: 0, kept: null, grudges: [] };
  },
  writeLegacy(l) {
    const raw = JSON.stringify(l);
    try {
      if (Save.storage.setItem) Save.storage.setItem(Save.KEY + this.legacyKey(), raw);
      else Save.mem[Save.KEY + this.legacyKey()] = raw;
    } catch (e) { /* ignore */ }
  },
  async open() {
    const p = Game.player;
    if (!p.canReincarnate) { UI.toast('尚无兵解转世之机'); return; }
    const legacy = this.readLegacy();
    const ok = await UI.popup({
      title: '兵解转世',
      html: `渡劫失利，大道蒙尘。兵解者，散去肉身、以神魂投胎再修——<br>
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
    await this.execute(p, legacy, kept, origin);
  },
  async execute(oldP, legacy, kept, origin) {
    // 前世仇怨：只带走此生尚存的心结（已化解者不入轮回）
    const grudges = Object.keys(oldP.npcs || {}).filter(id => oldP.npcs[id].grudge && oldP.npcs[id].alive);
    legacy.lives = (legacy.lives || 0) + 1;
    legacy.marks = (legacy.marks || 0) + 1;
    legacy.kept = kept || null;
    legacy.grudges = grudges;
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
    if (treeTier >= 1) p2.stones.low += Math.round(origin ? origin.start.stones || 0 : 0); // 初始灵石翻倍
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
    if (kept) p2.bag[kept] = 1;
    for (const gid of grudges) {
      const s = p2.npcs[gid];
      if (s) { s.rel = -35; s.grudge = true; s.pastLife = true; }
    }
    Game.player = p2;
    p2.pendingDao = true; // 前世记忆：可即刻叩问大道
    Log.clear();
    Log.add('<b>兵解转世</b>——一道流光划破夜空，落入凡间某处。啼哭声中，你重开一世。', 'system');
    Log.add(`此为第 <b>${legacy.lives}</b> 世：轮回印记 ×${legacy.marks}（全属性 +${legacy.marks}%）、前世悟性传承 +10%${kept ? `、携【${GameData.ITEMS[kept].name}】转世` : ''}。`, 'gain');
    if (grudges.length) Log.add(`前世仇怨如附骨之疽：${grudges.map(id => (NpcSys.def(id) || {}).name).filter(Boolean).join('、')} 与你再结梁子。`, 'warn');
    Log.add('前世记忆未消——你可即刻叩问大道，游历中偶有前世洞府机缘。', 'info');
    Game.afterAction();
    UI.toast(`转世成功 · 第${legacy.lives}世`);
  },
};
