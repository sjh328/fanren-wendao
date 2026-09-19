
/* ======================================================================
 * §1.12 增量扩展（v6）：挂机修炼 AutoCult
 * 目标：指定境界 / 攒够修为 / 运行时长；期间自动普通修炼，
 * 修为圆满或遭遇战斗自动暂停，结束后汇总本轮收益。
 * ====================================================================== */
const AutoCult = {
  active: false, target: null,
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
        <div class="tip-line">· 修为圆满或遭遇战斗时将<b>自动停下</b>，等待你亲手冲关／应对。</div>`,
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
      if (kind === 'exp' && p.realmIdx >= 9 && p.layer === 3 && p.exp >= GameData.layerNeed(p.realmIdx, 3) && p.flags && p.flags.ascended) {
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
      Cultivate.normal();   // 一轮普通修炼（自带日志 / 时间 / 收尾渲染）
      // v34（G2）：abort（读档/返回开始界面）后当轮成果无人落盘——settle 已 force 存过、
      // 循环下轮即退，本轮 normal 的修为随关页蒸发。检测到已停即补一次落盘再退。
      if (!this.active) { if (typeof Save !== 'undefined') Save.autoSave(true); return; }
      const p2 = Game.player;
      if (!p2 || p2.dead) { this.finish('寿元将尽，自动修炼停止'); return; }
      this.rounds++;
      const need = GameData.layerNeed(p2.realmIdx, p2.layer);
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
          await Utils.sleep(280);
          continue;
        }
        this.pause(p2.realmIdx < 9 ? '修为已至圆满——请亲手冲击瓶颈' : '真仙圆满——仙门已开，请亲手飞升');
        return;
      }
      if (this.reached(p2)) { this.finish('目标达成'); return; }
      await Utils.sleep(280);
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
    const r9Full = p.realmIdx >= 9 && p.layer === 3 && p.exp >= GameData.layerNeed(p.realmIdx, 3) && p.flags && p.flags.ascended;
    if (r9Full) {
      const yuan = (p.counters.xianyuan || 0) - (this.startYuan || 0);
      Log.add(`本次自动修炼小结：${this.rounds} 轮吐纳，游戏内历时 ${days} 日，修为尽炼仙元 <b>+${Utils.fmtNum(Math.max(0, yuan))}</b>（累计 ${Utils.fmtNum(p.counters.xianyuan || 0)}）。`, 'gain');
    } else {
      Log.add(`本次自动修炼小结：${this.rounds} 轮吐纳，游戏内历时 ${days} 日，累计修为 <b>+${Utils.fmtNum(Math.max(0, gained))}</b>。`, 'gain');
    }
    UI.renderAll();
  },
};
