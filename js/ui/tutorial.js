
/* ======================================================================
 * §15 新手引导
 * ====================================================================== */
const Tutorial = {
  steps: [
    { icon: '☯', title: '欢迎踏入仙途', text: '这里是弱肉强食的修真界。你将以凡人之躯，一步步修炼至飞升成仙。<br>境界面板、行动操作、背包菜单都在眼前——且听我一一道来。', target: null },
    { icon: '📜', title: '左侧 · 道途面板', text: '随时查看你的<b>境界修为</b>、气血灵力、先天四维（根骨 / 悟性 / 福缘 / 体魄）与战斗属性。<br>每个境界都有独有的<b>境界特性</b>，择定大道后更可修炼<b>职业道境</b>——皆在此一览。修为攒满即可突破，寿元耗尽则道消身殒，切莫蹉跎岁月。', target: '#panel-left' },
    { icon: '⚔', title: '中央 · 行动与游历', text: '<b>修炼</b>积攒修为，<b>探索</b>历练搏杀，<b>坊市</b>买卖丹药法器，筑基后可拜入<b>宗门</b>。<br>下方游历记载会记录你的每一步。遇敌时可选普攻、法诀、丹药或遁走。', target: '#panel-center' },
    { icon: '🎒', title: '右侧 · 背包与存档', text: '丹药、功法、法宝、材料分类收纳。法宝可装备，功法可参悟升级。<br>菜单中可随时存读档（共三档 + 自动存档）。', target: '#panel-right' },
    { icon: '🕳', title: '最后一句忠告', text: '丹药虽好，丹毒伤身；地图凶险，量力而行。<br>境界不足莫闯险地，否则……重伤事小，道消事大。<br>此外：「游历」页有<b>天下大势</b>与各大境界的<b>秘境</b>，「江湖」页可结交二十四位常驻修士——恩怨情仇，皆是道途。<br><b>祝道友早日飞升！</b>', target: null },
  ],
  idx: 0,
  show(force = false) {
    const seen = Save.storage.getItem ? Save.storage.getItem('fanren_wd_tutorial') : Save.mem['fanren_wd_tutorial'];
    if (seen && !force) return;
    this.idx = 0;
    document.getElementById('tutorial').classList.remove('hidden');
    this.render();
  },
  render() {
    const s = this.steps[this.idx];
    document.getElementById('tutorial-step').innerHTML = `
      <div class="t-icon">${s.icon}</div><h3>${s.title}</h3><div>${s.text}</div>`;
    document.getElementById('tutorial-dots').innerHTML =
      this.steps.map((_, i) => `<span class="${i === this.idx ? 'on' : ''}"></span>`).join('');
    const next = document.querySelector('[data-action="tut-next"]');
    if (next) next.textContent = this.idx === this.steps.length - 1 ? '踏入仙途' : '下一步';
    // v18：聚光高亮目标区域
    document.querySelectorAll('.tut-highlight').forEach(el => el.classList.remove('tut-highlight'));
    if (s.target) {
      const el = document.querySelector(s.target);
      if (el) el.classList.add('tut-highlight');
    }
  },
  next() {
    if (this.idx < this.steps.length - 1) { this.idx++; this.render(); }
    else this.finish();
  },
  prev() { if (this.idx > 0) { this.idx--; this.render(); } },
  finish() {
    document.getElementById('tutorial').classList.add('hidden');
    document.querySelectorAll('.tut-highlight').forEach(el => el.classList.remove('tut-highlight'));
    try {
      if (Save.storage.setItem) Save.storage.setItem('fanren_wd_tutorial', '1');
      else Save.mem['fanren_wd_tutorial'] = '1';
    } catch (e) { /* ignore */ }
    if (Game.player) {
      Game.player.flags.tutorialDone = true;
      // v20 三分钟上手清单：引导结束后给一张速览卡
      UI.popup({
        title: '✦ 三分钟上手清单',
        html: `<div class="tip-line">· <b>修炼</b>攒修为，圆满后冲关；练气→筑基无天劫，金丹起有三策博弈。</div>
          <div class="tip-line">· <b>游历</b>探地图搏机缘，遇敌注意敌方「下一手」意图——蓄力就防御或破招。</div>
          <div class="tip-line">· <b>坊市</b>买丹药法宝；丹毒将满（左栏提示）就停口或服解毒丹。</div>
          <div class="tip-line">· 筑基后解锁 <b>洞府/宗门/江湖</b>：种田、领任务、结交修士（可结为道侣）。</div>
          <div class="tip-line">· 每章主线完结送残玉共鸣（全属性+1.5%），跟主线走不吃亏。</div>
          <div class="tip-line">· 卡住了就点左栏「当前建议」——它会告诉你下一步。</div>`,
        options: [{ text: '踏上仙途', value: true, primary: true }],
      });
      Save.autoSave();
    }
  },
};
