
/* ======================================================================
 * §21.5 v8 黄历 · 每日一签 DailySign（每日仪式：游戏内每日一支签，立即生效）
 * ====================================================================== */
const DailySign = {
  POOLS: [
    { id: 'luck',    w: 22, text: '上上签 · 灵气充盈', desc: '天地灵机今向你倾斜。',
      apply(p) { const g = Math.round(Cultivate.baseGain(p) * 5); Cultivate.addExp(p, g); return `修为 +${Utils.fmtNum(g)}`; } },
    { id: 'wealth',  w: 22, text: '上签 · 财源广进', desc: '袖里乾坤，今日偏财入账。',
      apply(p) { const s = Math.round(60 * GameData.stoneEco(p.realmIdx)); Bag.addStones(s); return `灵石 +${Utils.fmtNum(s)}`; } },
    { id: 'insight', w: 22, text: '中签 · 醍醐味', desc: '心头忽过一线清明。',
      apply(p) { p.insight = Math.min(100, p.insight + 8); return '突破感悟 +8'; } },
    { id: 'vigour',  w: 17, text: '中上签 · 气血调达', desc: '百脉舒畅，旧伤尽去。',
      apply(p) { const st = Stat.compute(p); p.hp = st.maxHp; p.mp = st.maxMp; return '气血灵力尽复'; } },
    { id: 'mishap',  w: 17, text: '下签 · 小有蹉跎', desc: '行路崴了脚，还破点小财。',
      apply(p) {
        const hpLoss = Math.max(1, Math.round(Stat.compute(p).maxHp * 0.12));
        p.hp = Math.max(1, p.hp - hpLoss);
        const sLoss = Math.min(p.stones.low, Math.round(15 * GameData.stoneEco(p.realmIdx)));
        p.stones.low -= sLoss;
        return `气血 -${Math.round(hpLoss)}、灵石 -${Utils.fmtNum(sLoss)}`;
      } },
  ],
  draw() {
    const p = Game.player;
    if (!p || p.dead) return;
    const today = Math.floor(p.day);
    if (p.signDay === today) { UI.toast('今日已求过签，明日再来'); return; }
    // v10 境界特性 · 仙眷（真仙）：必得上签及以上（滤去下签）
    const pools = p.realmIdx >= 9 ? this.POOLS.filter(x => x.id !== 'mishap') : this.POOLS;
    const total = pools.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total, item = pools[pools.length - 1];
    for (const x of pools) { r -= x.w; if (r <= 0) { item = x; break; } }
    const effect = item.apply(p);
    p.signDay = today;
    p.signText = item.text;
    p.signDesc = item.desc;
    Log.add(`【黄历】你诚心摇签，得一支<b>${item.text}</b>——${item.desc}（${effect}）`, item.id === 'mishap' ? 'warn' : 'gain');
    Game.afterAction();
  },
};
