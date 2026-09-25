
/* ======================================================================
 * §29 元神化身 AvatarSys（v38 E302）
 * 化神境（realmIdx≥4）经「神游太虚」灵机所化的并行第二身：
 *   · 三任务择一（化神~八重神识）：闭关 / 游历 / 驻守；切换冷却 3 游戏日
 *   · 神识 1~9 级：并行效率 0.5→0.75；九重开双任务栏
 *   · 离线照常运行（dailySettle auto 回放同源同量，E327）
 * 收益硬锚：单任务 ≤ 主身对应行动日额度 ×0.75（balance-sim「化身并行」行看门）
 * ====================================================================== */
const AvatarSys = {
  UNLOCK_REALM: 4,
  LV_CAP: 9,
  SWITCH_CD: 3,
  /** v39（E354）：主身闭关日均口径具名常量——闭关 30 日=baseGain×10×1.6=16×baseGain（cultivate.js
   *  seclude 同式），日均即 16/30×baseGain；化身代主闭关满级 eff=0.75 时恰为「主身闭关日额度 ×0.75」 */
  AVATAR_CULT_DAY_RATE: 16 / 30,

  unlocked(p) { return p.realmIdx >= this.UNLOCK_REALM; },
  lv(p) { return (p.avatar && p.avatar.lv) || 1; },
  /** 并行效率：1 级 0.5 → 9 级 0.75（每级 +3.1%，钳顶 0.75） */
  eff(p) { return Math.min(0.75, 0.5 + (this.lv(p) - 1) * 0.031); },
  /** v39（E354）：神识晋升成本 min(100, 20+lv×10)（lv 为升级前等级：1→2 花 30 … 8→9 花 100 封顶）——
   *  旧式 30×lv 在 lv4 需 120 > 感悟硬上限 100（cultivate.js 钳制），lv5~9 永不可达；
   *  新式 lv1→9 共 8 次累计 520 感悟 ≈260 日调息，化神→飞升窗口内九重可达。 */
  upCost(p) { const lv = this.lv(p); return Math.min(100, 20 + lv * 10); },   // 晋级感悟（外源入池）
  tasks(p) {
    const a = p.avatar || {};
    return [a.task, a.lv >= this.LV_CAP ? a.task2 : null].filter(Boolean);
  },
  state(p) { return p.avatar || {}; },

  toggle(p) {
    if (!this.unlocked(p)) { UI.toast('化神境方有神识外放之能'); return; }
    p.avatar = p.avatar || { on: false, task: null, task2: null, lv: 1, cdDay: 0, day: 0 };
    p.avatar.on = !p.avatar.on;
    Log.add(p.avatar.on
      ? '你凝神入定，一缕神识离体化形——<b>元神化身</b>自此长驻洞府，代你行功。'
      : '神识归窍，化身散作清光——元神回归本尊。', p.avatar.on ? 'system' : 'info');
    Game.afterAction();
  },
  setTask(p, task, slot) {
    const a = p.avatar;
    if (!a || !a.on) return;
    const key = slot === 2 ? 'task2' : 'task';
    const today = Math.floor(p.day || 0);
    if (a[key] === task) return;
    if (a.cdDay && a.cdDay > today) { UI.toast(`神识调转需时——${a.cdDay - today} 日后方可换差`); return; }
    a[key] = task;
    a.cdDay = today + this.SWITCH_CD;
    const NAMES = { cult: '代主闭关', explore: '代主游历', guard: '驻守护府' };
    Log.add(`化身领命——<b>${NAMES[task] || task}</b>${slot === 2 ? '（第二差事）' : ''}。神识调转，三日内不再更换。`, 'info');
    Game.afterAction();
  },
  upgrade(p) {
    if (!this.unlocked(p)) return;
    const a = this.state(p);
    const lv = a.lv || 1;
    if (lv >= this.LV_CAP) { UI.toast('神识已至九重圆满'); return; }
    const cost = this.upCost(p);   // v39（E354）：min(100, 20+lv×10)——lv4 起 30×lv 式超感悟硬上限永不可达的病灶修复
    if ((p.insight || 0) < cost) { UI.toast(`感悟不足（需 ${cost}，现 ${p.insight || 0}）`); return; }
    Cultivate.spendInsight(p, cost);
    a.lv = lv + 1;
    Log.add(`神识温养，化身凝实一分——<b>神识 ${a.lv} 重</b>（并行效率 ${(this.eff(p) * 100).toFixed(1)}%）${a.lv >= this.LV_CAP ? '！九重既至，化身可<b>并行两桩差事</b>。' : '。'}`, 'gain');
    Game.afterAction();
  },

  /** 日更钩子（dailySettle 调用；auto=离线回放）——化身逐日行功 */
  daily(p, auto = false) {
    const a = p.avatar;
    if (!a || !a.on || !this.unlocked(p) || p.dead) return;
    const today = Math.floor(p.day || 0);
    if ((a.day || 0) >= today) return;   // 日界防重（同日多次 dailySettle）
    a.day = today;
    for (const t of this.tasks(p)) {
      if (t === 'cult') {
        // 代主闭关：主身闭关日均口径 × 并行效率（走 addExp 单源，不冲关不积丹毒）
        // v39（E354）：乘 AVATAR_CULT_DAY_RATE=16/30（主身闭关 30 日=16×baseGain 的日均，
        // cultivate.js seclude 同式）——满级 eff=0.75 时恰为「主身闭关日额度 ×0.75」自述锚；
        // 旧实现漏乘该系数，低神识等级日产虚高约一倍（中低级实削，UPDATE_NOTES 削弱明示）
        const st = Stat.compute(p);
        const gain = Math.round(Cultivate.baseGain(p) * (1 + (st.cultPct || 0) / 100) * AvatarSys.AVATAR_CULT_DAY_RATE * this.eff(p));
        Cultivate.addExp(p, gain, true);
        if (auto) { Game._offlineAgg = Game._offlineAgg || {}; Game._offlineAgg.avatarExp = (Game._offlineAgg.avatarExp || 0) + gain; }
        else Log.add(`【化身·闭关】元神行功不辍——修为 +${Utils.fmtNum(gain)}。`, 'gain');
      } else if (t === 'explore') {
        // 代主游历：以神识踏查已解锁最深的舆图——灵石四成带，两成捎回灵材；遇险则空手而归（无惩罚）
        const maps = (GameData.MAPS || []).filter(m => (m.recRealm || 0) <= p.realmIdx + 1);
        const map = maps[maps.length - 1] || GameData.MAPS[0];
        const er = Math.max(map.recRealm || 0, p.realmIdx - 2);
        const stones = Math.round(Utils.rand(8, 16) * GameData.stoneEco(Math.min(9, er)) * this.eff(p) / 0.5 * 0.4);
        Bag.addStones(stones);
        let matTxt = '';
        if (Utils.chance(20)) {
          const tier = Utils.clamp(Math.floor(er / 2) + 1, 1, 3);
          const mat = Utils.pick(GameData.matsByTier(tier));
          Bag.addItem(mat, 1);
          matTxt = `、捎回${GameData.ITEMS[mat].name} ×1`;
        }
        if (auto) { Game._offlineAgg = Game._offlineAgg || {}; Game._offlineAgg.avatarStones = (Game._offlineAgg.avatarStones || 0) + stones; }
        else Log.add(`【化身·游历】神识踏遍${map.name}——觅得灵石 ${Utils.fmtNum(stones)}${matTxt}。`, 'gain');
      }
      // guard：驻守无直接产出——灵泉 ×1.2（springDaily 消费）与夜袭守御（CaveSys 消费）
    }
  },
};
