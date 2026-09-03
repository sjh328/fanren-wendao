
/* ======================================================================
 * §9 功法系统（学习 / 参悟升级）
 * ====================================================================== */
const GongfaSys = {
  maxLevel(def) { return 5 + def.grade; },
  /** 升到下一级所需功法感悟 */
  needExp(def, level) { return Math.round(60 * Math.pow(1.9, level) * (def.grade + 1)); },
  learn(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    if (!def || def.type !== 'gongfa' || p.gongfa[itemId]) return;
    if (!DaoSys.canLearnGongfa(p, def)) return; // 体修难悟高阶法诀
    Bag.removeItem(itemId, 1);
    p.gongfa[itemId] = { level: 1, exp: 0 };
    p.counters.learns = (p.counters.learns || 0) + 1;   // v11 剧情计数
    Log.add(`你翻开典籍，依法修行，成功入门 <b class="grade-${def.grade}">${def.name}</b>！`, 'gain');
    Game.afterAction();
  },
  study(gfId) {
    const p = Game.player;
    const g = p.gongfa[gfId];
    const def = GameData.ITEMS[gfId];
    if (!g || !def) return;
    if (g.level >= this.maxLevel(def)) { UI.toast('此功法已修至大成'); return; }
    let gain = 18 + p.attrs.comp * 4 + Utils.rand(0, 12);
    if (p.realmIdx >= 7) gain *= 2;   // v10 境界特性 · 万法归宗（大乘）：参悟所得翻倍
    if (p.cave && p.cave.builds && p.cave.builds.lib) gain *= 1 + p.cave.builds.lib * 0.2;   // v19 藏经室
    g.exp += gain;
    if (p.dao) DaoSys.gain(p, def.daoLimit === p.dao ? 20 : 8);   // v16 道境经验：参悟
    Time.add(5);
    if (p.dead) return;
    let up = false;
    while (g.level < this.maxLevel(def) && g.exp >= this.needExp(def, g.level)) {
      g.exp -= this.needExp(def, g.level);
      g.level++;
      up = true;
    }
    if (up) {
      Log.add(`你反复参悟，<b class="grade-${def.grade}">${def.name}</b> 修至 <b>第${g.level}层</b>！`, 'gain');
    } else {
      Log.add(`你潜心参悟 ${def.name}，略有所得。（功法感悟 +${gain}）`, 'info');
    }
    Game.afterAction();
  },
};
