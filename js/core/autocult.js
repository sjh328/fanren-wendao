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
    const ok = await UI.popup({
      title: '自动修炼',
      html: `心无旁骛，自行吐纳——期间将自动进行普通修炼，收益尽数入账。<br>
        <div class="auto-row">
          <select id="auto-kind">
            <option value="realm">修至指定境界</option>
            <option value="exp">攒够指定修为</option>
            <option value="time">运行指定时长（分钟）</option>
          </select>
          <select id="auto-realm">${realmOpts}</select>
          <input id="auto-val" type="number" min="1" placeholder="数值" class="hidden">
        </div>
        <div class="tip-line">· 修为圆满或遭遇战斗时将<b>自动停下</b>，等待你亲手冲关／应对。</div>`,
      options: [{ text: '开 始', value: true, primary: true }, { text: '取 消', value: false }],
    });
    if (!ok) return;
    const kind = document.getElementById('auto-kind').value;
    let target = null;
    if (kind === 'realm') {
      const realm = Number(document.getElementById('auto-realm').value);
      if (realm <= p.realmIdx) { UI.toast('你已不弱于此境'); return; }
      target = { kind, realm, label: `修至${GameData.REALM_NAMES[realm]}期` };
    } else {
      const val = Number(document.getElementById('auto-val').value);
      if (!isFinite(val) || val <= 0) { UI.toast('请填写目标数值'); return; }
      target = kind === 'exp'
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
    this.startExp = Guide.totalExp(p);
    this.startDay = p.day;
    this.startReal = Date.now();
    Log.add(`你入定自行吐纳——<b>自动修炼</b>开启，目标：${target.label}。`, 'system');
    UI.renderAll();
    this.run();
  },
  async run() {
    while (this.active) {
      const p = Game.player;
      if (!p || p.dead) { this.finish('道途中断'); return; }
      if (Battle.active || Tribulation.state) { this.pause('遭遇战斗，自动修炼暂停'); return; }
      if (Story.active() || UI._popupResolve || (document.getElementById('dao-modal') && !document.getElementById('dao-modal').classList.contains('hidden'))) {
        await Utils.sleep(300);
        continue;
      }
      Cultivate.normal();
      const p2 = Game.player;
      if (!p2 || p2.dead) { this.finish('寿元将尽，自动修炼停止'); return; }
      this.rounds++;
      const need = GameData.layerNeed(p2.realmIdx, p2.layer);
      if (p2.layer === 3 && p2.exp >= need) {
        this.pause(p2.realmIdx < 9 ? '修为已至圆满——请亲手冲击瓶颈' : '真仙圆满——仙门已开，请亲手飞升');
        return;
      }
      if (this.reached(p2)) { this.finish('目标达成'); return; }
      await Utils.sleep(280);
    }
  },
  reached(p) {
    const t = this.target;
    if (!t) return true;
    if (t.kind === 'realm') return p.realmIdx >= t.realm;
    if (t.kind === 'exp') return Guide.totalExp(p) - this.startExp >= t.need;
    return Date.now() - this.startReal >= t.minutes * 60000;
  },
  pause(reason) {
    this.active = false;
    Log.add(`【自动修炼 · 暂停】${reason}`, 'warn');
    this.summary();
  },
  finish(reason) {
    this.active = false;
    Log.add(`【自动修炼 · 完成】${reason}`, 'system');
    this.summary();
  },
  abort() { this.active = false; },
  summary() {
    const p = Game.player;
    if (!p) { UI.renderAll(); return; }
    const gained = Guide.totalExp(p) - this.startExp;
    const days = Math.max(0, Math.floor(p.day - this.startDay));
    Log.add(`本次自动修炼小结：${this.rounds} 轮吐纳，游戏内历时 ${days} 日，累计修为 <b>+${Utils.fmtNum(Math.max(0, gained))}</b>。`, 'gain');
    UI.renderAll();
  },
};
window.AutoCult = AutoCult;