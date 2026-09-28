
/* ======================================================================
 * §1.12 增量扩展（v6）：挂机修炼 AutoCult
 * 目标：指定境界 / 攒够修为 / 运行时长；期间自动普通修炼，
 * 修为圆满或遭遇战斗自动暂停，结束后汇总本轮收益。
 * ====================================================================== */
const AutoCult = {
  active: false, target: null,
  // v40（E394）：挂机节奏三档（快/常/缓）——纯体验零数值变动；偏好落 localStorage（与战斗速度同款）
  PACE_KEY: 'fanren_wd_apace',
  PACES: { fast: 80, normal: 280, slow: 600 },
  loadPace() {
    let v = 'normal';
    try { v = (Save.storage.getItem ? Save.storage.getItem(this.PACE_KEY) : Save.mem[this.PACE_KEY]) || 'normal'; } catch (e) {}
    return ['fast', 'normal', 'slow'].includes(v) ? v : 'normal';
  },
  paceMs() {
    let v = 'normal';
    try { v = (Save.storage.getItem ? Save.storage.getItem(this.PACE_KEY) : Save.mem[this.PACE_KEY]) || 'normal'; } catch (e) {}
    return this.PACES[v] || 280;
  },
  setPace(v) {
    try { if (Save.storage.setItem) Save.storage.setItem(this.PACE_KEY, String(v)); else Save.mem[this.PACE_KEY] = String(v); } catch (e) { /* ignore */ }
    UI.toast(`挂机节奏：${{ fast: '快（80ms/轮）', normal: '常（280ms/轮）', slow: '缓（600ms/轮）' }[v] || '常（280ms/轮）'}`);
  },
  rounds: 0, startExp: 0, startDay: 0, startReal: 0,
  async open() {
    const p = Game.player;
    if (this.active) { UI.toast('自动修炼已在进行中'); return; }
    const realmOpts = GameData.REALM_NAMES.map((n, i) => `<option value="${i}">${n}期</option>`).join('');
    const popupPending = UI.popup({   // v26：先发起弹窗（DOM 同步注入），接线后再 await
      title: '自动修炼',
      html: `心无旁骛，自行吐纳——期间将自动进行普通修炼，收益尽数入账。<br>
        <div class="auto-row">
          <select id="auto-kind">
            <option value="realm">修至指定境界</option>
            <option value="exp">攒够指定修为</option>
            <option value="time">运行指定时长（分钟）</option>
            <option value="xian" ${p.flags && p.flags.ascended ? '' : 'disabled'} title="${p.flags && p.flags.ascended ? '' : '白日飞升后方可选此目标'}">攒够指定仙元（飞升后）</option>
          </select>
          <select id="auto-realm">${realmOpts}</select>
          <input id="auto-val" type="number" min="1" placeholder="数值" class="hidden">
        </div>
        <div class="tip-line">· 修为圆满或遭遇战斗时将<b>自动停下</b>，等待你亲手冲关／应对。</div>
        <div class="tip-line">· 挂机节奏：<button class="btn btn-sm ${this.paceMs() === 80 ? 'btn-primary' : ''}" data-action="act-autocult-pace" data-pace="fast">快（80ms）</button> <button class="btn btn-sm ${this.paceMs() === 280 ? 'btn-primary' : ''}" data-action="act-autocult-pace" data-pace="normal">常（280ms）</button> <button class="btn btn-sm ${this.paceMs() === 600 ? 'btn-primary' : ''}" data-action="act-autocult-pace" data-pace="slow">缓（600ms）</button></div>`,
      options: [{ text: '开 始', value: true, primary: true }, { text: '取 消', value: false }],
    });
    // v26 修瑕：按目标类型显隐输入控件（攒修为/限时两目标此前输入框恒隐藏，形同不可用）。
    // 注意：UI.popup 同步注入 DOM 后才返回 Promise——接线必须在 await 之前完成，弹窗关闭后节点即销毁。
    {
      const kindSel = document.getElementById('auto-kind');
      const realmSel = document.getElementById('auto-realm');
      const valInput = document.getElementById('auto-val');
      if (kindSel && realmSel && valInput) {
        const sync = () => {
          const isRealm = kindSel.value === 'realm';
          realmSel.classList.toggle('hidden', !isRealm);
          valInput.classList.toggle('hidden', isRealm);
        };
        kindSel.addEventListener('change', sync);
        sync();
      }
    }
    const ok = await popupPending;
    if (!ok) return;
    const kind = document.getElementById('auto-kind').value;
    let target = null;
    if (kind === 'realm') {
      const realm = Number(document.getElementById('auto-realm').value);
      if (realm <= p.realmIdx) { UI.toast('你已不弱于此境'); return; }
      target = { kind, realm, label: `修至${GameData.REALM_NAMES[realm]}期（每逢圆满自停，待你亲手冲关）` };
    } else {
      const val = Number(document.getElementById('auto-val').value);
      if (!isFinite(val) || val <= 0) { UI.toast('请填写目标数值'); return; }
      // v35（U5）：真仙圆满期「攒修为」目标永远不可达（修为轴已顶、totalExp 冻结）——
      // 开启时即刻拦截并指路仙元目标，不再让挂机循环每 0.28s 空转刷日志
      if (kind === 'exp' && p.realmIdx >= 9 && p.layer === 3 && p.exp >= GameData.layerNeedT(p, p.realmIdx, 3) && p.flags && p.flags.ascended) {
        UI.toast('修为轴已至尽头——圆满态请改选「攒够指定仙元」');
        return;
      }
      target = kind === 'xian'
        ? { kind, need: Math.round(val), label: `攒够 ${Utils.fmtNum(Math.round(val))} 仙元` }   // v32（D4）：仙元挂机目标
        : kind === 'exp'
        ? { kind, need: Math.round(val), label: `攒够 ${Utils.fmtNum(Math.round(val))} 修为` }
        : { kind, minutes: Utils.clamp(val, 1, 720), label: `运行 ${Utils.clamp(val, 1, 720)} 分钟` };
    }
    this.start(target);
  },
  start(target) {
    const p = Game.player;
    if (!p || this.active) return;
    this.target = target;
    this.active = true;
    this.rounds = 0;
    this._expFellBack = false;   // v35（U5）：exp 目标飞升后转仙元的一次性标记
    this._rushTriedDay = -1;   // v41（E422）：聚灵首问重臂
    this._smartHold = false;   // v41（E423）：智能档滞回状态重臂
    if (typeof Cultivate !== 'undefined') Cultivate._autoRep = null;   // v41（E423）：智能闭关聚合账重臂
    this.startExp = Guide.totalExp(p);
    this.startYuan = p.counters.xianyuan || 0;   // v35（U5）：圆满态小结改报仙元增量
    this.startDay = p.day;
    this.startReal = Date.now();
    if (typeof Save !== 'undefined' && Save.setThrottle) Save.setThrottle(true);   // v26：挂机期存档节流（行动结算照常，仅去重落盘）
    Log.add(`你入定自行吐纳——<b>自动修炼</b>开启，目标：${target.label}。`, 'system');
    UI.renderAll();
    this.run();
  },
  async run() {
    try {
    while (this.active) {
      const p = Game.player;
      if (!p || p.dead) { this.finish('道途中断'); return; }
      if (Battle.active || Tribulation.state) { this.pause('遭遇战斗，自动修炼暂停'); return; }
      // v7：有弹窗待决（叩问大道 / 红尘劫等）时挂起等待，不穿透、不中断
      // v15：剧情演出中同样挂起
      if (Story.active() || UI._popupResolve || (document.getElementById('dao-modal') && !document.getElementById('dao-modal').classList.contains('hidden'))) {
        await Utils.sleep(300);
        continue;
      }
      // v40（E393）：与离线流同待遇——三偏好接线
      // ① v41（E422）：聚灵三态问法根治模态死循环——挂机语境同款三态（今日聚灵/以后都聚/今日跳过），
      // 偏好落 p.ui.rush（Guide.prefMode 单源）；拒答/点燃后 _rushTriedDay 前移至窗口真过期之日，
      // 静默整整一个窗口期（旧守卫只看当日、恰被一轮修炼 3 日耗尽，10 轮弹 10 次的病灶自此拔除）
      if (p.cave && Guide.prefMode(p, 'rush') !== 'skip') {
        const winNow = (typeof CaveSys !== 'undefined' && CaveSys.RUSH_WINDOW) ? CaveSys.RUSH_WINDOW() : 3;
        const today = Math.floor(p.day || 0);
        const inWin = p.rushDay != null && today - p.rushDay < winNow;
        if (!inWin && (this._rushTriedDay || -1) < today) {
          const mode = Guide.prefMode(p, 'rush');
          const holdQuiet = () => { this._rushTriedDay = today + winNow - 1; };   // 前移：本窗口期内不再问
          if (mode === 'always') {
            await CaveSys.spiritRush({ ask: false });
            holdQuiet();
          } else {
            const cost = CaveSys.rushCost(p);
            const c = await UI.popup({
              title: '自动修炼 · 聚灵加速',
              html: `今日聚灵阵尚未点燃：燃 <b>${Utils.fmtNum(cost)}</b> 灵石，<b>${winNow} 日内修炼/闭关效率 ×1.5</b>。<br><span class="tip-line">选择「以后都聚」后，挂机将在每次灵机散尽时自动续燃（灵石不足自动跳过）；偏好随时可在设置中心修改。</span>`,
              options: [
                { text: `今日聚灵（-${Utils.fmtNum(cost)}）`, value: 'once', primary: true },
                { text: '以后都聚，不再询问', value: 'always' },
                { text: '今日跳过', value: 'skip', primary: false },
              ],
            });
            if (c === 'always') { p.ui = p.ui || {}; p.ui.rush = 'always'; await CaveSys.spiritRush({ ask: false }); }
            else if (c === 'once') await CaveSys.spiritRush({ ask: false });
            holdQuiet();   // 拒答（含 ESC）同样前移——undefined 不落任何偏好
          }
          if (!this.active) return;
        }
      }
      // ② 悟道偏好 always：感悟满百静默直悟
      // v41（E424）：冲关让位——圆满冲关在即（exp ≥60%）感悟留而不化，一日只记一句不刷屏
      const wuNeed = GameData.layerNeedT(p, p.realmIdx, 3);
      if (p.layer === 3 && p.exp >= wuNeed * 0.6 && (p.insight || 0) >= Cultivate.wuDaoCost(p)) {
        if (this._wudaoYieldDay !== Math.floor(p.day || 0)) {
          this._wudaoYieldDay = Math.floor(p.day || 0);
          Log.add('冲关在即，感悟留而不化——圆满资粮且存于识海，待冲关时尽数兑现。', 'system');
        }
      } else if (typeof Guide !== 'undefined' && Guide.prefMode(p, 'wudao') === 'always'
        && (p.insight || 0) >= Cultivate.wuDaoCost(p) && (p._wuDaoDay || -1) !== Math.floor(p.day || 0)) {
        try { await Cultivate.wuDao({ silent: true }); } catch (e) { console.error('挂机·悟道异常:', e); }
        if (!this.active) return;
      }
      // ③ 日界内嵌一次静默行权（求签/照料/悬赏/听讲等，与离线流同待遇；小账按偏好静默）
      if (this._dailyDay !== Math.floor(p.day || 0)) {
        this._dailyDay = Math.floor(p.day || 0);
        try { if (!p.dead && !Battle.active && typeof Guide !== 'undefined' && Guide.dailyAll) await Guide.dailyAll({ silent: true }); } catch (e) {}
        if (!this.active) return;
      }
      // v41（E423）：挂机方式 p.ui.engine（智能/普通，默认智能）——智能档在灵石存量 ≥ 3 轮闭关开销
      // 且未在闭关时自动改跑 secludeLoop(1,{auto:true}) 轮制（进层自动出关续开）；滞回防震荡：
      // 跌破 1 轮开销即回落普通修炼，攒回 3 轮开销才重启智能（一个入口管全部挂机，日均对齐闭关）
      const cost1 = Cultivate.secludeCost(p);
      const tot = (typeof Bag !== 'undefined' && Bag.stonesTotal) ? Bag.stonesTotal(p) : 0;
      if (tot < cost1) this._smartHold = true;
      else if (tot >= cost1 * 3) this._smartHold = false;
      if (((p.ui && p.ui.engine) || 'smart') === 'smart' && !this._smartHold && !Cultivate._looping) {
        await Cultivate.secludeLoop(1, { auto: true });   // settleReport 走 auto 语境聚合，不弹「出关·结算」模态（v5 静默规格）
        if (Tribulation.state || Battle.active) { this.pause('天劫／战事起，自动修炼暂停'); return; }   // 闭关中冲关引劫——交回亲手渡劫
      } else {
        Cultivate.normal({ manual: false });   // 一轮普通修炼（自带日志 / 时间 / 收尾渲染）——挂机不带亲修
      }
      // v34（G2）：abort（读档/返回开始界面）后当轮成果无人落盘——settle 已 force 存过、
      // 循环下轮即退，本轮 normal 的修为随关页蒸发。检测到已停即补一次落盘再退。
      if (!this.active) { if (typeof Save !== 'undefined') Save.autoSave(true); return; }
      const p2 = Game.player;
      if (!p2 || p2.dead) { this.finish('寿元将尽，自动修炼停止'); return; }
      this.rounds++;
      const need = GameData.layerNeedT(p2, p2.realmIdx, p2.layer);
      if (p2.layer === 3 && p2.exp >= need) {
        // v32 修瑕（D4）：飞升圆满原「即停等飞升」——仙籍之身修为恒圆满，AutoCult 每轮即停，
        // 仙元从此没有挂机路径。圆满后改为继续空转（溢流自动炼作仙元），只受目标达成控制。
        if (p2.realmIdx >= 9 && p2.flags && p2.flags.ascended) {
          // v35（U5）：中途飞升致 exp 目标不可达（totalExp 冻结）时，改以仙元增量继续记账并提示——
          // 原循环以 0.28s/轮无限空转刷日志，玩家只能手动停
          if (this.target && this.target.kind === 'exp' && !this._expFellBack) {
            this._expFellBack = true;
            this.target = { kind: 'xian', need: (p2.counters.xianyuan || 0) + 1, label: '修为轴已顶 · 转攒仙元' };
            Log.add('修为轴已至尽头——自动修炼转为持续炼化仙元，随时可手动停下。', 'system');
          }
          if (this.reached(p2)) { this.finish('目标达成'); return; }
          await Utils.sleep(this.paceMs());   // v40（E394）：挂机节奏三档（快 80/常 280/缓 600）
          continue;
        }
        // v38（E326）：静修境（金丹前）圆满自动冲关——静修无劫无碍，挂机链全通
        if (p2.realmIdx + 1 < GameData.TRIB_START) {
          Log.add('【自动冲关】修为已至圆满——静修冲关，水到渠成……', 'realm');
          await Cultivate.breakthrough(10);
          if (!this.active) return;
          continue;
        }
        // v38（E326）：金丹起仍亲手渡劫；真仙圆满给出「转攒仙元/停机」双钮，减少来回翻页
        const pickEnd = await UI.popup({
          title: '自动修炼 · 圆满待决',
          html: p2.realmIdx < 9
            ? '修为已至圆满——金丹引劫，须亲手冲击瓶颈。'
            : '真仙圆满——仙门已开，飞升须亲手叩之。',
          options: [
            { text: '停机，由我亲手冲关', value: 'stop', primary: true },
            ...(p2.realmIdx >= 9 ? [{ text: '不飞升了——继续空转攒仙元', value: 'yuan' }] : []),
          ],
        });
        if (pickEnd === 'yuan') {
          this.target = { kind: 'xian', need: (p2.counters.xianyuan || 0) + 1, label: '转攒仙元' };
          Log.add('自动修炼转为持续炼化仙元——仙途不辍，随时可停。', 'system');
          continue;
        }
        this.pause(p2.realmIdx < 9 ? '修为已至圆满——请亲手冲击瓶颈' : '真仙圆满——仙门已开，请亲手飞升');
        return;
      }
      if (this.reached(p2)) { this.finish('目标达成'); return; }
      await Utils.sleep(this.paceMs());   // v40（E394）：挂机节奏三档（快 80/常 280/缓 600）
    }
    } catch (err) {
      // v30 自愈：单轮异常不再让循环静默死亡（active 挂真）——记日志、停表、交回手动
      console.error('自动修炼异常:', err);
      Log.add('自动修炼忽遇一丝紊乱，自行为你停了下来——修为与存档均无碍。', 'warn');
      this.finish('异常自愈');
    }
  },
  reached(p) {
    const t = this.target;
    if (!t) return true;
    if (t.kind === 'realm') return p.realmIdx >= t.realm;
    if (t.kind === 'exp') return Guide.totalExp(p) - this.startExp >= t.need;
    if (t.kind === 'xian') return (p.counters.xianyuan || 0) >= t.need;   // v32（D4）
    return Date.now() - this.startReal >= t.minutes * 60000;
  },
  pause(reason) {
    this.active = false;
    this.settle();
    Log.add(`【自动修炼 · 暂停】${reason}`, 'warn');
    this.summary();
  },
  finish(reason) {
    this.active = false;
    this.settle();
    Log.add(`【自动修炼 · 完成】${reason}`, 'system');
    this.summary();
  },
  /** 读档 / 返回开始界面时静默中止 */
  abort() { this.active = false; this.settle(); },
  /** v26：停止时解除节流并强制落盘一次，保证挂机成果即时落袋 */
  settle() {
    if (typeof Save !== 'undefined' && Save.setThrottle) {
      const wasThr = Save._thr;
      Save.setThrottle(false);
      if (wasThr && Game.player && !Game.player.dead) Save.autoSave(true);
    }
  },
  summary() {
    const p = Game.player;
    if (!p) { UI.renderAll(); return; }
    const gained = Guide.totalExp(p) - this.startExp;
    const days = Math.max(0, Math.floor(p.day - this.startDay));
    // v35（U5）修瑕：真仙圆满态 totalExp 恒为常数——挂机攒仙元（系统明确支持的玩法）停机小结
    // 恒报「累计修为 +0」；圆满态改报仙元增量，与离线小结的贴心程度对齐
    const r9Full = p.realmIdx >= 9 && p.layer === 3 && p.exp >= GameData.layerNeedT(p, p.realmIdx, 3) && p.flags && p.flags.ascended;
    if (r9Full) {
      const yuan = (p.counters.xianyuan || 0) - (this.startYuan || 0);
      Log.add(`本次自动修炼小结：${this.rounds} 轮吐纳，游戏内历时 ${days} 日，修为尽炼仙元 <b>+${Utils.fmtNum(Math.max(0, yuan))}</b>（累计 ${Utils.fmtNum(p.counters.xianyuan || 0)}）。`, 'gain');
    } else {
      Log.add(`本次自动修炼小结：${this.rounds} 轮吐纳，游戏内历时 ${days} 日，累计修为 <b>+${Utils.fmtNum(Math.max(0, gained))}</b>。`, 'gain');
    }
    // v41（E423）：智能闭关聚合入小结——每轮闭关收益经 settleReport(auto) 累计至此，一行入挂机日报
    const ar = (typeof Cultivate !== 'undefined' && Cultivate._autoRep) || null;
    if (ar && ar.rounds > 0) {
      Log.add(`智能闭关 ${ar.rounds} 轮 · 修为 <b>+${Utils.fmtNum(Math.round(ar.exp))}</b>${ar.advanced ? ` · 进层 ×${ar.advanced}` : ''}。`, 'gain');
      Cultivate._autoRep = null;
    }
    UI.renderAll();
  },
};
