
/* ======================================================================
 * §7 时间系统
 * ====================================================================== */
const Time = {
  MONTHS: ['孟春', '仲春', '季春', '孟夏', '仲夏', '季夏', '孟秋', '仲秋', '季秋', '孟冬', '仲冬', '季冬'],
  add(days) {
    const p = Game.player;
    if (!p || p.dead) return;
    const prevYear = Math.floor(p.day / 365);
    p.day += days;
    NpcSys.wander(p, days);   // v5：岁月流逝，常驻修士偶改游历之地
    // v10 境界特性 · 合道（炼虚起）：丹毒消退加倍
    p.poison = Math.max(0, p.poison - (p.realmIdx >= 5 ? 0.7 : 0.35) * days);
    const newYear = Math.floor(p.day / 365);
    if (newYear > prevYear) {
      p.age = 16 + newYear;
      // §23/§24 世界随年推进：NPC 修炼成长 + 百年大事件
      for (let y0 = prevYear + 1; y0 <= newYear; y0++) WorldSys.onYear(p, y0 + 1);
      const st = Stat.compute(p);
      Log.add(`又是一年春秋，你如今 <b>${p.age}</b> 岁。`, 'system');
      if (p.age > st.lifespan * 0.9) Log.add('你隐隐感到体内生机流逝，寿元无多了……', 'warn');
      if (p.age > st.lifespan) { Game.gameOver('寿元'); return; }
    }
  },
  label(p) {
    const year = Math.floor(p.day / 365) + 1;
    const month = this.MONTHS[Math.min(11, Math.floor((p.day % 365) / 30))];
    return `第${year}年 · ${month}`;
  },
  /* ---------- v5：更细的游戏内时间 ---------- */
  /** 每月第几日的古风称谓（初一~三十） */
  dayName(n) {
    const N = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (n <= 10) return '初' + N[n - 1];
    if (n < 20) return '十' + N[n - 11];
    if (n === 20) return '二十';
    if (n < 30) return '廿' + N[n - 21];
    return '三十';
  },
  /** 年 / 月 / 日全显（顶栏用） */
  labelLong(p) {
    const year = Math.floor(p.day / 365) + 1;
    const doy = Math.floor(p.day % 365);
    const month = this.MONTHS[Math.min(11, Math.floor(doy / 30))];
    return `第${year}年 · ${month}${this.dayName(Math.floor(doy % 30) + 1)}`;
  },
  /** 旬（上/中/下旬）：NPC 行游轮换与坊市市况的时间刻度 */
  xunLabel(p) {
    const doy = Math.floor(p.day % 365);
    const month = this.MONTHS[Math.min(11, Math.floor(doy / 30))];
    const xun = ['上旬', '中旬', '下旬'][Math.min(2, Math.floor((doy % 30) / 10))];
    return `${month}·${xun}`;
  },
};
