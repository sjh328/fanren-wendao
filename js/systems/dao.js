
/* ======================================================================
 * §19 大道职业体系 DaoSys（六选一，筑基解锁，可弃道重修）
 * ====================================================================== */
const DaoSys = {
  get(p) { return p.dao ? GameData.DAO_CLASSES.find(d => d.id === p.dao) : null; },
  name(p) { const d = this.get(p); return d ? d.name : (p.realmIdx >= 1 ? '未定' : '——'); },
  /** v16 道境经验（daoExp[daoId]），由职业专属行为积累——不随修为境界绑定 */
  exp(p) { return (p.daoExp || {})[p.dao] || 0; },
  /** v16 道境层数：由道境经验推导（每重有独立经验阈值） */
  tierLevel(p) {
    if (!p || !p.dao) return 0;
    let lv = 0;
    for (const t of (GameData.DAO_TIERS[p.dao] || {}).tiers || []) {
      if (this.exp(p) >= t.need) lv++;
    }
    return lv;
  },
  /** v16 增加道境经验（各系统钩子调用）；经验跨过阈值即晋一重 */
  gain(p, amount, silent = false) {
    if (!p || !p.dao || !amount) return;
    const def = GameData.DAO_TIERS[p.dao];
    if (!def) return;
    if (!p.daoExp) p.daoExp = {};
    const before = this.tierLevel(p);
    p.daoExp[p.dao] = Math.min(2000000, (p.daoExp[p.dao] || 0) + amount);
    const after = this.tierLevel(p);
    if (after > before && !silent) {
      const t = def.tiers[after - 1];
      const CN = ['一', '二', '三', '四', '五', '六'];
      UI.announce(`✦ 道境晋升 · ${t.name}`, 'gold');
      Ambience.sfx('breakthrough');
      Log.add(`你于道途中再进一步——${def.name}晋入 <b>第${CN[after - 1]}重 · ${t.name}</b>！${t.desc}`, 'realm');
    }
  },
  /** v16 道境信息：{ def, lv 已入重数, exp 当前经验, cur 当前重, next 下一重, nextNeed 还需经验 } */
  tierInfo(p) {
    const def = p && p.dao ? GameData.DAO_TIERS[p.dao] : null;
    if (!def) return null;
    const lv = this.tierLevel(p);
    const exp = this.exp(p);
    const next = lv < def.tiers.length ? def.tiers[lv] : null;
    return {
      def, lv, exp,
      cur: lv > 0 ? def.tiers[lv - 1] : null,
      next,
      nextNeed: next ? Math.max(0, next.need - exp) : 0,
      curNeed: lv > 0 ? def.tiers[lv - 1].need : 0,
    };
  },
  /** v16 状态栏道境区块 HTML：当前重 + 经验条 + 下一重需求 + 获取方式 */
  statusHtml(p) {
    const t = this.tierInfo(p);
    if (!t) return '';
    const CN = ['一', '二', '三', '四', '五', '六'];
    const pct = t.next ? Utils.clamp((t.exp - t.curNeed) / (t.next.need - t.curNeed) * 100, 0, 100) : 100;
    return `<div class="stat-line"><span>${t.def.name}</span><b class="hl">${t.lv > 0 ? `第${CN[t.lv - 1]}重 · ${t.cur.name}` : '未入重'}</b></div>`
      + (t.cur ? `<div class="tip-line" style="margin:0 0 4px">· ${t.cur.desc}</div>` : '')
      + (t.next
        ? `<div class="dao-exp">
            <div class="bar" title="${t.def.expName} ${Math.floor(t.exp)} → ${t.next.need}"><div class="bar-fill exp" style="width:${pct}%"></div><span class="bar-text">${t.def.expName} ${Math.floor(t.exp)}/${t.next.need}</span></div>
            <div class="tip-line" style="margin:0 0 4px">· 下一重「${t.next.name}」：${t.def.expName}攒至 ${t.next.need} 可成</div>
          </div>`
        : `<div class="tip-line" style="margin:0 0 4px">· 六重已圆满，道境极境！</div>`)
      + `<div class="tip-line" style="margin:0 0 4px;color:var(--text-faint)">· ${t.def.expDesc}</div>`;
  },
  /** 大道对属性的直接影响（在 Stat.compute 中折算） */
  bonus(p) {
    const b = { atkPct: 0, defPct: 0, hpPct: 0, mpPct: 0 };
    if (p.dao === 'sword') { b.atkPct += 50; b.defPct -= 20; }
    if (p.dao === 'pill') { b.atkPct -= 15; }
    if (p.dao === 'body') { b.hpPct += 100; b.defPct += 50; }
    if (p.dao === 'body' && DaoSys.tierLevel(p) >= 2) b.hpPct += 10;   // v10 般若六境·炼脏境
    return b;
  },
  /** 大道选择弹窗 */
  openModal() {
    document.getElementById('dao-box').innerHTML = GameData.DAO_CLASSES.map(d => `
      <button class="dao-card" data-action="dao-pick" data-dao="${d.id}">
        <span class="dao-name">${d.name}</span>
        <span class="dao-motto">${d.motto}</span>
        <span class="dao-desc">${d.desc}</span>
      </button>`).join('');
    document.getElementById('dao-modal').classList.remove('hidden');
  },
  async pick(id) {
    const p = Game.player;
    if (!p || p.dao) { document.getElementById('dao-modal').classList.add('hidden'); return; }
    const d = GameData.DAO_CLASSES.find(x => x.id === id);
    if (!d) return;
    const ok = await UI.popup({
      title: '叩问大道',
      html: `自此一念，终身不悔。<br>确定以 <b>${d.name}</b> 为毕生大道吗？<br><span class="neg">大道一经选定，中途转道需跌落一个大境界。</span>`,
      options: [{ text: '此生不悔', value: true, primary: true }, { text: '再想想', value: false }],
    });
    if (!ok) return;
    p.dao = id;
    document.getElementById('dao-modal').classList.add('hidden');
    Log.add(`道途既定，此心不悔——你自此踏上 <b>${d.name}</b> 之路（${d.motto}）。`, 'system');
    UI.toast(`大道既定：${d.name}`);
    Game.afterAction();
  },
  /** 转修他道：跌落一个大境界、清空当前境界修为、清除原大道 */
  async changeDao() {
    const p = Game.player;
    if (!p || !p.dao) return;
    if (p.realmIdx < 1) { UI.toast('你尚未筑基，大道未成'); return; }
    const ok = await UI.popup({
      title: '转修他道',
      html: `转道逆天，代价惨重：<br>· <span class="neg">跌落一个大境界</span>（${GameData.REALM_NAMES[p.realmIdx]} → ${GameData.REALM_NAMES[p.realmIdx - 1]}）<br>· <span class="neg">当前境界修为尽失</span><br>· 原有大道加成尽数消散，须重新叩问大道<br><br>确定弃道重修吗？`,
      options: [{ text: '弃道重修', value: true }, { text: '罢了', value: false }],
    });
    if (!ok) return;
    p.realmIdx -= 1; p.layer = 0; p.exp = 0; p.insight = 0; p.dao = null;
    const st = Stat.compute(p);
    p.hp = Math.min(p.hp, st.maxHp); p.mp = Math.min(p.mp, st.maxMp);
    Log.add('你自废道基，逆天转道！一声长啸中境界跌落、修为尽散——自此之后，前路重新来过。', 'warn');
    UI.toast('大道已弃，前尘尽消');
    Game.afterAction();
    // 转道后重新叩问大道
    await Utils.sleep(400);
    this.openModal();
  },
  /** 体修不可修习玄级及以上法诀；v13 大道专属功法道途不合者不可修 */
  canLearnGongfa(p, def) {
    if (p.dao === 'body' && def.grade >= 2) {
      UI.toast('体修之躯，难悟玄级及以上法诀');
      Log.add('你运转体修功法，只觉神识滞涩——高阶法诀与肉身之道相悖，无从修习。', 'warn');
      return false;
    }
    if (def.daoLimit && p.dao !== def.daoLimit) {
      const dname = (GameData.DAO_CLASSES.find(x => x.id === def.daoLimit) || {}).name || '特定大道';
      UI.toast(`此乃${dname}秘传，道途不合，无从修习`);
      return false;
    }
    if (def.daoLimit && !p.dao) {
      const dname = (GameData.DAO_CLASSES.find(x => x.id === def.daoLimit) || {}).name || '特定大道';
      UI.toast(`此乃${dname}秘传——须先择定大道`);
      return false;
    }
    return true;
  },
};
