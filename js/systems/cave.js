
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
    { id: 'spring',   name: '灵泉',   icon: '⛲', desc: '每日涌出灵石：80 × 阶 × 境界系数，自动入账。' },
    { id: 'treasury', name: '藏宝阁', icon: '💎', desc: '聚财有道：灵石获取 +3%/阶。' },
  ],
  BUILD_KEYS: ['beast', 'train', 'lib', 'forge', 'spring', 'treasury'],
  buildLv(p, id) { return (p.cave && p.cave.builds && p.cave.builds[id]) || 0; },
  buildCost(p, id) {
    const lv = this.buildLv(p, id);
    return { stones: Math.round(4000 * Math.pow(3, lv) * Math.pow(2, Math.min(4, p.realmIdx))), ore: 4 + lv * 3 };
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
  cultBonus(p) { return p.cave ? p.cave.lv * 4 : 0; },
  pillBonus(p) { return p.cave ? p.cave.lv * 5 : 0; },
  /** v18：访客事件（每日第一次进入洞府时触发） */
  visitorEvent(p) {
    if (!p.cave || p.cave._visitorDay === Math.floor(p.day)) return;
    p.cave._visitorDay = Math.floor(p.day);
    if (!Utils.chance(15)) return;
    const events = [
      { text: '一位散修前来拜访，与你论道半日，颇有收获。（感悟 +2）', fn: () => { p.insight = Math.min(100, (p.insight || 0) + 2); } },
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
    }
    const ev = Utils.pick(events);
    ev.fn();
    Log.add(`【洞府访客】${ev.text}`, 'info');
    Game.afterAction();
  },
  /** v20 灵泉：每日首次入洞府自动涌出灵石（日界防重） */
  springDaily(p) {
    if (!p.cave || !p.cave.builds || !p.cave.builds.spring) return;
    const today = Math.floor(p.day || 0);
    if (p.cave._springDay === today) return;
    p.cave._springDay = today;
    const gain = Math.round(80 * p.cave.builds.spring * GameData.stoneEco(Math.min(4, p.realmIdx)));
    Bag.addStones(gain);
    Log.add(`【灵泉】洞府灵泉今日涌出灵石 <b>${Utils.fmtNum(gain)}</b> 枚，已自动收入储物袋。`, 'gain');
  },
  async water(idx) {
    const p = Game.player;
    const plots = this.plotsOf(p);
    const plot = plots[idx];
    if (!plot) { UI.toast('此田无作物'); return; }
    if (plot.wateredDay === Math.floor(p.day)) { UI.toast('今日已浇过水了'); return; }
    plot.wateredDay = Math.floor(p.day);
    plot.days = Math.max(1, Math.round(plot.days * 0.9));
    Log.add(`你以灵泉浇灌第 ${idx + 1} 田，作物生长加快了一分。`, 'info');
    Game.afterAction();
  },
  /** v20 接线：每日一次的虫害检查（此前为无调用方的死代码） */
  checkPest(p) {
    if (!p.cave) return;
    const today = Math.floor(p.day || 0);
    if (p.cave._pestDay === today) return;
    p.cave._pestDay = today;
    const plots = this.plotsOf(p);
    for (let i = 0; i < plots.length; i++) {
      const plot = plots[i];
      if (!plot || plot.pested) continue;
      if (Utils.chance(3)) {
        plot.pested = true;
        Log.add(`第 ${i + 1} 田的【${GameData.ITEMS[plot.crop].name}】遭了虫害——必须除虫，否则收成将大减！`, 'warn');
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
  freshCave() { return { lv: 1, plots: [null, null, null, null] }; },
  unlockText: '洞府 · 筑基期解锁',
  unlocked(p) { return p.realmIdx >= 1; },
  plotsOf(p) {
    if (!p.cave) p.cave = this.freshCave();
    return p.cave.plots;
  },
  plotCount(p) { return Math.min(8, 4 + (p.cave ? p.cave.lv - 1 : 0)); },
  upCost(p) {
    const lv = p.cave ? p.cave.lv : 1;
    return {
      stones: Math.round(2000 * Math.pow(3, lv - 1) * Math.pow(2.2, Math.max(0, p.realmIdx - 1))),
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
        · 兽栏扩至 <b class="hl">${4 + p.cave.lv + 1} 位</b><br>
        需灵石 <span class="hl">${Utils.fmtNum(c.stones)}</span>${matsTxt ? `、${matsTxt}` : ''}。`,
      options: [{ text: '扩 建', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(c.stones)) { UI.toast('灵石不足'); return; }
    if (c.mats) {
      for (const [id, n] of Object.entries(c.mats)) {
        if (Bag.count(id) < n) { UI.toast(`${GameData.ITEMS[id].name}不足`); return; }
      }
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
    if (plots[idx]) { UI.toast('此田已有作物'); return; }
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
    plots[idx] = { seed: seedId, crop: sd.crop, days: sd.days, plantedDay: Math.floor(p.day) };
    Log.add(`你在第 ${idx + 1} 田播下了【${sd.name}】，${sd.days} 日后可收。`, 'info');
    Game.afterAction();
  },
  /** 收获：进度按当前游戏日结算；过熟 20+ 日减半 */
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
    Bag.addItem(plot.crop, qty);
    Log.add(`第 ${idx + 1} 田的【${GameData.ITEMS[plot.crop].name}】熟了——收获 ×${qty}${over >= 20 ? '（过熟日久，收成折半）' : ''}${typeof Art !== 'undefined' && Art.seasonOf(p) === 2 ? '（季秋丰收）' : ''}。`, 'gain');
    plots[idx] = null;
    p.counters.harvests = (p.counters.harvests || 0) + 1;   // v20 成就计数
    Game.afterAction();
  },
  renderPlots(p) {
    const plots = this.plotsOf(p);
    const n = this.plotCount(p);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const plot = plots[i];
      if (!plot) {
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
            ${ripe && over >= 20 ? '<div class="gf-desc"><span class="neg">过熟日久，收获将折半，请尽快采收。</span></div>' : ''}
          </div>
          <div class="gf-actions">${ripe
            ? `<button class="btn btn-sm btn-primary" data-action="act-cave-harvest" data-i="${i}">收 获</button>`
            : `<button class="btn btn-sm" data-action="act-cave-water" data-i="${i}">浇 水</button>${plot.pested ? `<button class="btn btn-sm btn-danger" data-action="act-cave-pest" data-i="${i}">除 虫</button>` : ''}`}</div>
        </div>`);
      }
    }
    return rows.join('');
  },
};
