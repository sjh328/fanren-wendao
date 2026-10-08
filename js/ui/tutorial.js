
/* ======================================================================
 * §15 新手引导
 * v42（E487）任务化重构——五页整栏说明书改为「跟我做」真任务链：
 *   点一次修炼 → 完成一次游历探索 → 打开乾坤袋装备一件兵器 → 看一眼问道页目标 → 领取首次悬赏。
 *   每步 target 降到 .btn 级；完成动作经 Game.actions 既有入口挂钩（arm() 运行时包裹，零侵入），
 *   状态型任务由 probe() 判定；#tutorial 加 .tut-task 入浮卡模式（样式见 style.css E487 段）——
 *   遮罩透明化、pointer-events 收敛到任务卡，高亮目标直接可见可点（教程层 --z-story+5=140
 *   高于一切弹层，E486 --z 层级合同）。可跳过（「跳过引导」/ESC 链保持，game.js:126 原样）。
 * v42（E488）手册分节解锁——教程毕只弹「三分钟上手」一节（finish → UI.helpSection）；
 *   其余六章在系统首次解锁时 toast 附「玩法说明 · 新章节」一键直达该节（UI.helpToast →
 *   UI.helpModal(key) 锚点）。解锁判定在本文件检测 Guide.LOCKS 翻转（guide.js:30 定义，
 *   归 W2A 波次本包不动）；防重记忆落 p.flags.unlockedTips（v42 E507 迁移默认 {}，此处兜底自建）。
 * ====================================================================== */
const Tutorial = {
  /** 五步任务链（key 供 stub 计次与 data-task 寻址；acts=完成挂钩的既有动作键；
   *  check=状态判定（p → bool）；target=高亮选择器按序回落——.btn 级主目标优先，页签键兜底） */
  TASKS: [
    {
      key: 'cultivate', icon: '🧘', title: '点一次修炼', acts: ['act-cultivate'],
      target: ['[data-action="act-cultivate"]'],
      hint: '点击高亮的「修 炼」主按钮行功三日——修为与灵机会自然入账。',
      check() { return !!this._hits.cultivate; },
    },
    {
      key: 'explore', icon: '⛰', title: '完成一次游历探索', acts: [],
      target: ['[data-action="act-explore"]', '[data-action="act-tab"][data-tab="map"]'],
      hint: '游历在<b>练气中期</b>解锁——此前先安心修炼。解锁后去「游历 · 舆图」任选一地探索。',
      check(p) { return (p.counters.explores || 0) >= 1; },
    },
    {
      key: 'equip', icon: '🎒', title: '打开乾坤袋 · 装备一件兵器', acts: ['act-equip'],
      target: ['[data-action="act-equip"]', '[data-action="act-drawer"][data-panel="right"]'],
      hint: '囊中已有一柄铁剑——在乾坤袋点「装备」即可披挂（法宝大幅提升战力）。',
      check(p) { return !!(p.equipped && p.equipped.weapon); },
    },
    {
      key: 'quest', icon: '📜', title: '看一眼问道页目标', acts: ['act-tab'],
      target: ['[data-action="act-tab"][data-tab="quest"]'],
      hint: '问道页是主线全程的总览——十章进度、目标直达，迷路时去那里。',
      check() { return Game.activeTab === 'quest'; },
    },
    {
      key: 'bounty', icon: '📋', title: '领取首次悬赏', acts: ['act-bounty-claim'],
      target: ['[data-action="act-bounty-claim"]', '[data-action="act-tab"][data-tab="shop:bounty"]', '[data-action="act-tab"][data-tab="shop"]'],
      hint: '悬赏板在坊市 · 悬赏——猎杀目标游历时自动计入，达成后点「领赏」。',
      check(p) { return !!this._hits.bounty || ((p.bounties && p.bounties.list) || []).some(bt => bt == null); },
    },
  ],
  /** v42（E488）：LOCKS 翻转 → 手册章节映射（键 = Guide.LOCKS 键；值 = [章节名, helpFolds 键, 一句话]） */
  TIP_CHAPTERS: {
    map: ['战斗要诀', 'battle', '游历搏杀的意图博弈与战斗要诀'],
    shop: ['营生与经济', 'econ', '坊市买卖、悬赏与奇市的营生门道'],
    jianghu: ['江湖与恩怨', 'jianghu', '结交、结拜、道侣与恩怨了断'],
    sect: ['修行与境界', 'realm', '宗门差事、大道六择与境界冲关'],
    cave: ['杂录', 'misc', '洞府营生、离线规则与图鉴杂录'],
  },
  TOWER_TIP: ['登天塔', 'tower', '每层一战、三层赠福、五层开箱——筑基后城西开塔'],
  idx: 0,
  _taskMode: false,
  _hits: {},
  _armed: false,
  show(force = false) {
    const seen = Save.storage.getItem ? Save.storage.getItem('fanren_wd_tutorial') : Save.mem['fanren_wd_tutorial'];
    if (seen && !force) return false;   // 早退时 onDone 由调用方立即接力（v31 修瑕语义保持）
    this.idx = 0;
    this._hits = {};
    this._taskMode = true;
    const el = document.getElementById('tutorial');
    el.classList.remove('hidden');
    el.classList.add('tut-task');
    this.arm();
    this.render();
    // v42（E487）：任务链非阻塞——开篇剧情即时接力（旧版教程阻塞全屏、第一章压到链尾；
    // game.js 侧调用形式不变：show() 返回 true 后 onDone 不再由 finish() 二次消费）
    if (typeof this.onDone === 'function') { const cb = this.onDone; this.onDone = null; cb(); }
    return true;
  },
  /** v42（E487）：完成动作挂钩——对任务链涉及的既有动作键做运行时包裹（原函数转调后探针），
   *  零侵入 Game.actions 定义（game.js 侧不感知）；包裹一次，与教程显隐无关 */
  arm() {
    if (this._armed) return;
    this._armed = true;
    const acts = new Set(['act-tab']);   // 问道任务经切页即达，包裹只为即时反馈（probe 有渲染心跳兜底）
    for (const t of this.TASKS) for (const a of (t.acts || [])) acts.add(a);
    for (const act of acts) {
      const orig = Game.actions[act];
      if (typeof orig !== 'function' || orig._tutWrapped) continue;
      const wrapped = async (d, el) => {
        if (act === 'act-cultivate') this._hits.cultivate = true;   // 点一次修炼即计（ Cultivate.normal 无独立计数）
        if (act === 'act-bounty-claim') this._hits.bounty = true;
        const r = await orig(d, el);
        try { this.probe(); } catch (e) { /* 引导探针异常不干扰动作 */ }
        return r;
      };
      wrapped._tutWrapped = true;
      Game.actions[act] = wrapped;
    }
  },
  /** v42（E487）：当前任务完成判定——arm 包裹与 UI.renderAll 心跳（heartbeat）双路触发 */
  probe() {
    if (!this._taskMode) return;
    const p = Game.player;
    if (!p) return;
    const t = this.TASKS[this.idx];
    if (!t) { this.finish(); return; }
    let ok = false;
    try { ok = !!t.check.call(this, p); } catch (e) { ok = false; }
    if (ok) this.advance();
  },
  advance() {
    const t = this.TASKS[this.idx];
    if (t) Log.add(`【引导】任务完成——${t.title}`, 'info');
    this.idx++;
    if (this.idx >= this.TASKS.length) this.finish();
    else this.render();
  },
  /** v42（E487）：data-action="tut-task-done" 处理器——「我做好了 ✓」手动确认（动作检测
   *  未覆盖的路径如一键行权代领悬赏的兜底口）；未达成时提示而非强进 */
  taskDone() {
    if (!this._taskMode) return;
    const t = this.TASKS[this.idx];
    const p = Game.player;
    if (!t || !p) return;
    let ok = false;
    try { ok = !!t.check.call(this, p); } catch (e) { ok = false; }
    if (ok) this.advance();
    else UI.toast('此事尚未做成——照提示做一次，或先「暂跳此步」');
  },
  render() {
    const t = this.TASKS[this.idx];
    if (!t) { this.finish(); return; }
    document.getElementById('tutorial-step').innerHTML = `
      <div class="t-icon">${t.icon}</div><h3 class="tut-task-goal">任务 ${this.idx + 1}/${this.TASKS.length} · ${t.title}</h3>
      <div class="tut-task-hint">${t.hint}</div>
      <div style="text-align:center;margin-top:var(--sp-2)"><button class="btn btn-sm" data-action="tut-task-done" data-task="${t.key}">我做好了 ✓</button></div>`;
    document.getElementById('tutorial-dots').innerHTML =
      this.TASKS.map((_, i) => `<span class="${i <= this.idx ? 'on' : ''}"></span>`).join('');
    const next = document.querySelector('[data-action="tut-next"]');
    if (next) next.textContent = '暂跳此步';   // 任务模式下「下一步」即跳过本步（不标完成）
    // 聚光高亮：.btn 级目标按序回落；滚进视野——移动端 860px 下高亮目标保证在视口内（E487 验收）
    document.querySelectorAll('.tut-highlight').forEach(el => el.classList.remove('tut-highlight'));
    let el = null;
    for (const sel of (t.target || [])) { el = document.querySelector(sel); if (el) break; }
    if (el) {
      el.classList.add('tut-highlight');
      setTimeout(() => { try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' }); } catch (e) { /* ignore */ } }, 60);
    }
  },
  /** v42（E487）：任务模式下为「暂跳此步」；链尾即结业 */
  next() {
    if (this.idx < this.TASKS.length - 1) { this.idx++; this.render(); }
    else this.finish();
  },
  prev() { if (this.idx > 0) { this.idx--; this.render(); } },   // 按钮在任务模式由样式隐藏（链只进不退），ESC/重看路径保留
  finish() {
    document.getElementById('tutorial').classList.add('hidden');
    document.getElementById('tutorial').classList.remove('tut-task');
    this._taskMode = false;
    document.querySelectorAll('.tut-highlight').forEach(el => el.classList.remove('tut-highlight'));
    UI.closeDrawers();   // v25：教程毕抽屉自愈——开局第一屏永远从完整主界面开始
    try {
      if (Save.storage.setItem) Save.storage.setItem('fanren_wd_tutorial', '1');
      else Save.mem['fanren_wd_tutorial'] = '1';
    } catch (e) { /* ignore */ }
    if (Game.player) {
      Game.player.flags.tutorialDone = true;
      // v42（E488）：教程毕只弹「三分钟上手」一节——其余六章随系统首解锁 toast 直达（probeUnlocks）
      UI.popup({
        title: '✦ 玩法手册 · 三分钟上手',
        html: UI.helpSection('getting'),
        options: [{ text: '踏上仙途', value: true, primary: true }],
      });
      Save.autoSave();
    }
  },
  /** v42（E487/E488）：行动收尾渲染心跳（UI.renderAll 调用）——任务链探针 + 手册分节解锁检测 */
  heartbeat() {
    this.probeUnlocks();
    this.probe();
  },
  /** v42（E488）：手册分节解锁——检测 Guide.LOCKS 翻转与塔解锁，首次建账时对已解锁者静默补记
   *  （旧档升级不补发旧章节 toast，此后每次新解锁 toast 一次、unlockedTips 防重复读档重发） */
  probeUnlocks() {
    const p = Game.player;
    if (!p || p.dead) return;
    p.flags = p.flags || {};
    if (!p.flags.unlockedTips) {
      p.flags.unlockedTips = {};
      for (const k of Object.keys(Guide.LOCKS)) if (!Guide.tabLocked(k)) p.flags.unlockedTips[k] = 1;
      return;   // 首次建账只补记不播报
    }
    const fresh = [];
    for (const [tab, chapter] of Object.entries(this.TIP_CHAPTERS)) {
      if (p.flags.unlockedTips[tab] || Guide.tabLocked(tab)) continue;
      p.flags.unlockedTips[tab] = 1;
      fresh.push(chapter);
    }
    if (!p.flags.unlockedTips.tower && typeof TowerSys !== 'undefined' && TowerSys.unlockOk && TowerSys.unlockOk(p)) {
      p.flags.unlockedTips.tower = 1;
      fresh.push(this.TOWER_TIP);
    }
    if (fresh.length) UI.helpToast(fresh);
  },
};
