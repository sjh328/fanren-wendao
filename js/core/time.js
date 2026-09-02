/* ======================================================================
 * §7 时间系统
 * ====================================================================== */
const Time = {
  /** 推进游戏日数（每次行动调用） */
  add(days) {
    const p = Game.player;
    if (!p) return;
    p.day += days;
    p.age += days / 365;
    // 丹毒衰减：每 30 日 -5
    if (p.poison > 0 && p.day % 30 < 10) {
      const dec = Math.max(0, Math.floor(p.poison - Math.min(p.poison, 5 + (p.realmIdx >= 5 ? 5 : 0))));
      p.poison = dec;
    }
    // 跨年：触发世界事件与寿元判定
    const prevYear = Math.floor((p.day - days) / 365);
    const curYear = Math.floor(p.day / 365);
    if (curYear > prevYear) {
      for (let y = prevYear + 1; y <= curYear; y++) WorldSys.onYear(y);
      const lifespan = Stat.compute(p).lifespan;
      if (p.age >= lifespan) { Game.gameOver('寿元耗尽'); return; }
    }
  },
  /** 简短标签：第 N 年 某月 */
  label(p) {
    const y = Math.floor(p.day / 365) + 1;
    const m = Math.min(11, Math.floor((p.day % 365) / 30));
    const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return `第${y}年 · ${MONTHS[m]}`;
  },
  labelLong(p) {
    return this.label(p) + '下旬';
  },
};
window.Time = Time;