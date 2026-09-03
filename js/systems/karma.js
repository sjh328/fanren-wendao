
/* ======================================================================
 * §20 气运因果 KarmaSys（气运 / 孽障 / 斩三尸 / 仇家偷袭）
 * ====================================================================== */
const KarmaSys = {
  addFortune(n, silent = false) {
    const p = Game.player;
    // v18 道心烙印【慎/敛/正/渡】：气运获取加成（仅正向）
    if (n > 0 && typeof DaoxinSys !== 'undefined') n = Math.max(1, Math.round(n * DaoxinSys.gainMult(p, 'fortuneMult')));
    p.fortune = (p.fortune || 0) + n;
    if (!silent) Log.add(`冥冥之中似有天意垂青——气运 +${n}。`, 'gain');
  },
  addKarma(n, silent = false) {
    const p = Game.player;
    // v18 道心烙印【戾/杀/厉/慈/容】：孽障增减（仅正向放大，负向/减免取整不低于1）
    if (n > 0 && typeof DaoxinSys !== 'undefined') n = Math.max(1, Math.round(n * DaoxinSys.gainMult(p, 'karmaMult')));
    p.karma = (p.karma || 0) + n;
    if (!silent) Log.add(`因果簿上又添一笔血墨——孽障 +${n}。`, 'loss');
  },
  /** 气运：好事事件（宝箱/机缘/贵人）权重倍率，每10点+5% */
  goodEventMult(p) { return 1 + (p.fortune || 0) * 0.005; },
  /** 气运：稀有掉落加成（百分点），每10点+3% */
  rareDropBonus(p) { return Utils.clamp((p.fortune || 0) * 0.3, 0, 45); },
  /** 孽障：仇家偷袭概率（百分点），每10点+4% */
  ambushChance(p) { return Utils.clamp((p.karma || 0) * 0.4, 0, 60); },
  /** 斩三尸：孽障≥100 方可施展 */
  async slayCorpses() {
    const p = Game.player;
    if ((p.karma || 0) < 100) return;
    const ok = await UI.popup({
      title: '斩三尸',
      html: `孽障缠身（当前 ${p.karma}），已碍道途。<br>斩三尸者，斩善念、斩恶念、斩执念——<br>· 孽障清零<br><span class="neg">· 当前小境界修为尽数散去</span><br><span class="neg">· 永久损失 5% 全属性上限（已累计折损 ${(p.statLossPct || 0)}%）</span><br><br>此举凶险，道友三思。`,
      options: [{ text: '执剑，斩！', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    p.karma = 0;
    p.exp = 0;
    p.statLossPct = (p.statLossPct || 0) + 5;
    Log.add('你闭目内视，于识海深处斩出三剑——善尸、恶尸、执念尸应声而碎！孽障尽消。然大道五十、天衍四九，那缺失的一分，再也回不来了。', 'system');
    UI.toast('三尸已斩，因果暂清');
    Game.afterAction();
  },
};

/* ======================================================================
 * §20.5 v18 江湖声望 RepSys
 * 声望影响：悬赏品质 / 黑市价格 / NPC 初始关系 / 江湖称号
 * ====================================================================== */
const RepSys = {
  LEVELS: [
    { min: -100, name: '声名狼藉', color: 'neg' },
    { min: -30,  name: '籍籍无名', color: 'dim' },
    { min: 0,    name: '初露头角', color: '' },
    { min: 30,   name: '小有名气', color: 'hl' },
    { min: 80,   name: '名动一方', color: 'gold' },
    { min: 150,  name: '威震天下', color: 'grade-5' },
  ],
  level(p) {
    const rep = p.reputation || 0;
    for (let i = this.LEVELS.length - 1; i >= 0; i--) {
      if (rep >= this.LEVELS[i].min) return this.LEVELS[i];
    }
    return this.LEVELS[0];
  },
  add(p, amount, reason = '') {
    p.reputation = Utils.clamp((p.reputation || 0) + amount, -100, 200);
    if (reason) Log.add(`声望 ${amount > 0 ? '+' : ''}${amount}（${reason}）`, amount > 0 ? 'gain' : 'loss');
  },
  /** 声望对商店价格的折扣/溢价 */
  priceMul(p) {
    const rep = p.reputation || 0;
    if (rep >= 80) return 0.85;
    if (rep >= 30) return 0.92;
    if (rep >= 0) return 1.0;
    if (rep >= -30) return 1.05;
    return 1.15;
  },
  /** 声望对悬赏品质的加成 */
  bountyBonus(p) {
    const rep = p.reputation || 0;
    if (rep >= 150) return 1.5;
    if (rep >= 80) return 1.3;
    if (rep >= 30) return 1.15;
    return 1.0;
  },
};
window.RepSys = RepSys;
