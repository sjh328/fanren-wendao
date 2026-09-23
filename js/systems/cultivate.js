
/* ======================================================================
 * §8 修炼系统（普通修炼 / 调息 / 闭关 / 突破 / 飞升）
 * ====================================================================== */
const Cultivate = {
  /** 一次普通修炼的基础修为（3 日）；邪修吞噬灵气，效率+80%；悟性取有效值（转世/讲道加成） */
  baseGain(p) {
    let g = (12 + Stat.compOf(p) * 2) * GameData.eco(p.realmIdx) * (1 + p.layer * 0.15);
    if (typeof SectSys !== 'undefined' && SectSys.commandActive && SectSys.commandActive(p, 'teach')) g *= 1.2;   // v19 长老令·传功
    if (p.dao === 'demonic') g *= 1.8;
    if (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 3) g *= 1.2;   // v10 魔道六境·化功境
    if (p.dao === 'array' && DaoSys.tierLevel(p) >= 2) g *= 1.1;   // v10 阵道六境·聚灵境
    if (typeof Art !== 'undefined' && Art.seasonOf(p) === 0) g *= 1.1;   // v20 孟春灵潮：修炼 +10%
    if (typeof WorldSys !== 'undefined' && WorldSys.lingchaoActive && WorldSys.lingchaoActive(p)) g *= 1.2;   // v20 天下大事·灵潮
    if (p.rushDay != null && Math.floor(p.day || 0) - p.rushDay < (typeof CaveSys !== 'undefined' && CaveSys.RUSH_WINDOW ? CaveSys.RUSH_WINDOW() : 3)) g *= 1.5;   // v36（E218）：聚灵 3 游戏日窗口；v38（E314）：洞天灵潮 4 日
    g *= 1 + 0.03 * ((typeof CaveSys !== 'undefined' && CaveSys.flagPower) ? CaveSys.flagPower(p, 'b_juling') : 0);   // v38（E305）：聚灵旗 +3%/面（地载万物/阵法传习加成）
    return g;
  },
  /** v20 闭关效率：隆冬蛰伏 +10% */
  secludeMul(p) { return (typeof Art !== 'undefined' && Art.seasonOf(p) === 3) ? 1.1 : 1; },
  gainMult() {
    return (1 + Stat.compute(Game.player).cultPct / 100) * Utils.randF(0.9, 1.15);
  },
  /** v33（E87）：闭关预估用期望中值 1.025——原预估混入同一随机数种子外的独立一掷，展示值必与实发对不上 */
  gainMultExp() {
    return (1 + Stat.compute(Game.player).cultPct / 100) * 1.025;
  },
  /** 增加修为并处理境界内进层；返回是否发生过进层 */
  addExp(p, amount, silent = false) {
    let leveled = false;
    p.exp += amount;
    SectSys.onCultivate(amount);
    while (p.layer < 3) {
      const need = GameData.layerNeedT(p, p.realmIdx, p.layer);
      if (p.exp < need) break;
      p.exp -= need;
      p.layer++;
      leveled = true;
      if (!silent) {
        Log.add(`水到渠成！你的修为迈入 <b>${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}</b>！`, 'realm');
        UI.announce(`突 境 · ${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}`, 'gold');   // v4
      }
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
    }
    if (p.layer === 3) {
      const need = GameData.layerNeedT(p, p.realmIdx, 3);
      if (p.exp > need) {
        const over = p.exp - need;
        p.exp = need;
        if (p.realmIdx >= 9) {
          // v30 仙途续航：真仙圆满之后修为溢流炼作「仙元」——修为轴有终点，道境没有。
          // v34（E117）：拆除双喂——道境经验声明口径是「职业行为积累、不随修为境界绑定」，
          // 溢流一轮闭关动辄数千道境经验，把剑仙境等行为轴秒满；自此仙元独享溢流。
          const daoGain = Math.max(1, Math.round(over / (GameData.eco(9) * 0.05) * ((p.flags && p.flags.visionLeichi) ? 1.1 : 1) * ((p.cave && p.cave.dongtian >= 4) ? 1.05 : 1) * (Game.titleOn(p, 'daoZuYuan') ? 1.1 : 1)));   // v32（D6）雷池淬体 +10%；v38（E314）大罗洞天 +5%；v38（E340）道祖法印 +10%
          p.counters.xianyuan = (p.counters.xianyuan || 0) + daoGain;
          // v34：播报节流——原 xianyuan%50<daoGain 在 daoGain>50 时恒真，长闭关每轮刷一条
          if (daoGain >= 500 || p.counters.xianyuan % 500 < daoGain) Log.add(`修为满溢，尽数炼作 <b>仙元</b>（道境资粮 +${daoGain} · 累计 ${p.counters.xianyuan}）——修为轴有终点，道境没有。`, 'gain');
        } else {
          // v18：溢出修为保留，突破后自动计入
          p.expOverflow = (p.expOverflow || 0) + over;
        }
      }
    }
    return leveled;
  },
  /** v28 联动：感悟单源入口——满百后溢出不再蒸发，按修炼口径折算修为（感悟圆融，化作修为）。
   *  大额感悟源（讲道/心魔劫/个人线/前世机缘/上签等）统一走此口，小处直写不受影响。
   *  v34（A2）：r<9 折算汇率 80×eco（≈219 倍单日修炼产出）改为 baseGain×0.125/点——与悟道同汇率
   *  （2.75×eco/点），自随乘数缩放，感悟溢出永远是「小份额炼化」而非旁路成长曲线的第二台印钞机。
   *  v37（E264/E265）：感悟来源 FIFO 双池——p.insight 保留为总量缓存（消费端读数不变），
   *  p.insightSrc: [{v, regen}] 记来源（仅调息 regen=true；听讲/灵潮/丹药/事件/剧情等一律 false），
   *  悟道支出按 FIFO 扣减得纯度 ρ=再生占比，收益按纯度折算（见 wuDao）。全仓 insight 增发自此收口单源，
   *  直写形态（insight 钳百式）仅存本函数体内（verify-v23 SA 锚：白名单外零命中）。 */
  INSIGHT_SRC_CAP: 50,
  addInsight(p, n, regen = false) {
    if (!n) return;
    const before = p.insight || 0;
    p.insight = Math.min(100, before + n);
    const gain = p.insight - before;
    if (gain > 0) {
      const src = p.insightSrc = (Array.isArray(p.insightSrc) ? p.insightSrc : []);
      const last = src[src.length - 1];
      if (last && last.regen === !!regen) last.v += gain;   // 同源相邻段合并防膨胀
      else src.push({ v: gain, regen: !!regen });
      // 段数上限 50：超限相邻合并防存档膨胀（合并段按量大者归档，纯度误差 ≤1 段；悟道消费使池常态远短于此）
      while (src.length > this.INSIGHT_SRC_CAP) {
        const a = src.shift(), b = src.shift();
        src.unshift({ v: a.v + b.v, regen: a.v >= b.v ? a.regen : b.regen });
      }
    }
    const spill = n - gain;
    if (spill > 0) {
      // v32 修瑕（E26）：r9 溢出走仙元定值 spill×50（与悟道 1000/20 同汇率）。
      // v34（E117）：不再双喂 DaoSys（口径同 addExp 溢流）。
      if (p.realmIdx >= 9) {
        const yuan = spill * 50;
        p.counters.xianyuan = (p.counters.xianyuan || 0) + yuan;
        Log.add(`感悟已臻圆融，余韵炼作 <b>仙元 +${Utils.fmtNum(yuan)}</b>。`, 'gain');
      } else {
        const exp = Math.round(spill * this.baseGain(p) * 0.125);
        if (exp > 0) {
          // v31 修瑕（E20）：不再 silent——大额感悟折算的修为曾可静默连跳小层（无日志/浮字/公告，出关对不上账）
          this.addExp(p, exp);
          Log.add(`感悟已臻圆融，余韵化作修为 <b>+${Utils.fmtNum(exp)}</b>。`, 'gain');
        }
      }
    }
  },
  /** v37（E264）：感悟支出单源——按 FIFO 扣减来源池；返回本次消耗中「再生感悟」占比 ρ（0~1）。
   *  池空（老档未迁/防御态）视同全再生——行为不回退（迁移后新入账按真实来源归池）。 */
  spendInsight(p, n) {
    const total = p.insight || 0;
    const take = Math.min(n, total);
    if (take <= 0) return 1;
    const src = Array.isArray(p.insightSrc) ? p.insightSrc : [];
    // v38（E278）修瑕：池空（老档 insight>0 未迁来源 / 防御态）应视同全再生 ρ=1——原实发 regenTake(0)/take=0，
    // 与 insightPurity 的「池空视同全再生」相反，老档悟道被静默折到 0.3 底折
    if (!src.length) { p.insight = Math.max(0, total - take); return 1; }
    let regenTake = 0, left = take;
    while (left > 0 && src.length) {
      const seg = src[0];
      const d = Math.min(seg.v, left);
      if (seg.regen) regenTake += d;
      seg.v -= d; left -= d;
      if (seg.v <= 0.0001) src.shift();
    }
    p.insight = Math.max(0, total - take);
    return regenTake / take;
  },
  /** v37（E264）：纯度预览（悟道弹窗/卡面用，非变更）——与 spendInsight 同口径；池空视同全再生 */
  insightPurity(p, n) {
    const total = p.insight || 0;
    const take = Math.min(n, total);
    if (take <= 0) return 1;
    const src = Array.isArray(p.insightSrc) ? p.insightSrc : [];
    if (!src.length) return 1;
    let regenTake = 0, left = take;
    for (const seg of src) {
      if (left <= 0) break;
      const d = Math.min(seg.v, left);
      if (seg.regen) regenTake += d;
      left -= d;
    }
    return regenTake / take;
  },
  /** v37（E265）：纯度底折系数——ρ=0（纯外源感悟）时悟道收益保留比例。balance-sim 购买悟道链门禁
   *  与回滚验证（临时注 1.0 实测门禁非零退出）锚此常量；0.3 时纯购买链 ≈2.12× 修炼日均（带 ≤2.2 内） */
  WUDAO_PUR_FLOOR: 0.3,
  /** v37（E265）：悟道成本随境界微涨——20+2×realmIdx，拉长纯购买链回本周期（纯度折算之外的第二道保险） */
  wuDaoCost(p) { return 20 + (p.realmIdx || 0) * 2; },
  /** v32（D5）：悟道——满溢感悟的主动出口：耗突破感悟炼作修为（飞升后炼作仙元），每日一次。
   *  感悟成算降权 0.5:1 后，囤积的感悟自此有第二条去路（飞升前后皆有用）。
   *  v34（A2）：r<9 收益 20×80×eco（≈219 倍单日修炼，听讲环路整条旁路 ×5.4 曲线）改为
   *  baseGain×2.5（≈7.5 天修炼量/次）——自随乘数缩放，悟道始终是「主动加餐」而非第二主粮；
   *  不再双喂 DaoSys。
   *  v37（E264/E265）：感悟纯度折算——收益 = baseGain×2.5×(WUDAO_PUR_FLOOR + (1−WUDAO_PUR_FLOOR)×ρ)：
   *  自然链（ρ=1，纯调息感悟）2.5× 全额不变；纯购买链（ρ=0，筑基丹喂发）折底 ≈2.12× 修炼日均入带
   *  （现状 ×7.08）；听讲链（ρ=0.2）双带内。成本 20→20+2×realmIdx（wuDaoCost）。 */
  async wuDao() {
    const p = Game.player;
    if (!p || p.dead) return;
    const today = Math.floor(p.day || 0);
    if (p._wuDaoDay === today) { UI.toast('今日已悟过一场——大道贵在日积月累'); return; }
    const cost = this.wuDaoCost(p);
    if ((p.insight || 0) < cost) { UI.toast(`突破感悟不足 ${cost} 点`); return; }
    const r9 = p.realmIdx >= 9;
    const rho = this.insightPurity(p, cost);
    const pur = this.WUDAO_PUR_FLOOR + (1 - this.WUDAO_PUR_FLOOR) * rho;
    const estExp = Math.round(this.baseGain(p) * 2.5 * pur);
    const estYuan = Math.round(1000 * pur);
    const ok = await UI.popup({
      title: '悟 道',
      html: `闭目吐纳，将满溢的感悟淬入道基（每日一次）。<br>· 耗突破感悟 ${cost} 点${r9 ? `，炼作 <b>仙元 ≈${Utils.fmtNum(estYuan)}</b>` : `，炼作修为 <b>+${Utils.fmtNum(estExp)}</b>`}。<br><span class="tip-line">· 感悟纯度 ${Math.round(rho * 100)}%——打坐调息所生的感悟纯粹，丹药/听讲等外源感悟炼作折价。</span>`,
      options: [{ text: '悟 道', value: true, primary: true }, { text: '再想想', value: false }],
    });
    if (!ok) return;
    p._wuDaoDay = today;
    const rho2 = this.spendInsight(p, cost);   // v37：实扣 FIFO 并取真实纯度（预览与实发同口径）
    const pur2 = this.WUDAO_PUR_FLOOR + (1 - this.WUDAO_PUR_FLOOR) * rho2;
    if (r9) {
      const yuan = Math.round(1000 * pur2);
      p.counters.xianyuan = (p.counters.xianyuan || 0) + yuan;
      Log.add(`你于蒲团上进入忘我之境——${cost} 点感悟在识海中炼作 <b>仙元 +${Utils.fmtNum(yuan)}</b>（感悟纯度 ${Math.round(rho2 * 100)}%）。`, 'gain');
    } else {
      const expGain = Math.round(this.baseGain(p) * 2.5 * pur2);
      this.addExp(p, expGain);
      Log.add(`你于蒲团上进入忘我之境——${cost} 点感悟淬入道基，修为 <b>+${Utils.fmtNum(expGain)}</b>（感悟纯度 ${Math.round(rho2 * 100)}%）。`, 'gain');
    }
    Game.afterAction();
  },
  normal() {
    const p = Game.player;
    let gain = Math.round(this.baseGain(p) * this.gainMult());
    let evNote = '';
    // v8 灵机事件（v19 扩池）：基础四类 + 六道职业特化 + 境界异象，按身份动态构建（8% 触发）
    if (Utils.chance(8)) {
      const pool = { surge: 35, epiphany: 25, heartDemon: 25, glean: 15 };
      const daoEv = { sword: 'jianMeng', pill: 'danXiang', talisman: 'fuGuang', body: 'tiWu', array: 'zhenXian', demonic: 'xueYong' };
      if (p.dao && daoEv[p.dao]) pool[daoEv[p.dao]] = 18;   // 职业特化
      if (p.realmIdx >= 1) pool.lingZhu = 10;               // 筑基起：灵露洗尘
      if (p.realmIdx >= 3) pool.shenYou = 12;               // 元婴起：神游太虚
      const kind = Utils.pickWeighted(pool);
      if (kind === 'surge') {
        gain = Math.round(gain * 2.5);
        Log.add('【灵机】行功之际，灵气忽如潮涌而来，天地之力尽数灌入丹田！', 'realm');
        evNote = '（灵气潮涌 · 修为 ×2.5）';
      } else if (kind === 'epiphany') {
        gain = Math.round(gain * 1.5);
        this.addInsight(p, 3);
        Log.add('【灵机】吐纳之间忽有所悟，此番修行事半功倍。（突破感悟 +3）', 'gain');
        evNote = '（醍醐灌顶 · 修为 ×1.5）';
      } else if (kind === 'heartDemon') {
        gain = Math.max(1, Math.round(gain * 0.55));
        this.addInsight(p, 6);
        Log.add('【心魔】识海中魔音滋扰，你苦守灵台方寸——虽折了些修为，道心却愈发澄明。（突破感悟 +6）', 'warn');
        evNote = '（心魔滋扰 · 修为折损）';
      } else if (kind === 'glean') {
        const stones = Math.round(Utils.rand(12, 24) * GameData.stoneEco(p.realmIdx));
        Bag.addStones(stones);
        Log.add(`【拾遗】收功之时袖中沙沙作响——竟是行功震落的灵石碎屑。灵石 +${Utils.fmtNum(stones)}。`, 'gain');
      } else if (kind === 'jianMeng') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】梦中有人仗剑而歌，醒来指间犹有剑意流转。', 'gain');
        evNote = '（剑鸣入梦 · 剑意 +15）';
      } else if (kind === 'danXiang') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】行功之际，鼻端忽过一缕异香，丹火自燃三分。', 'gain');
        evNote = '（丹香引火 · 丹火 +15）';
      } else if (kind === 'fuGuang') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】指尖无意识勾画，醒来满纸符纹自成篇章。', 'gain');
        evNote = '（符光乍现 · 符道 +15）';
      } else if (kind === 'tiWu') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】一夜酣眠，筋骨自行开阖吐纳——肉身自有真意。', 'gain');
        evNote = '（体悟玄机 · 体魄 +15）';
      } else if (kind === 'zhenXian') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】低首见石纹纵横，竟是半幅天然阵图。', 'gain');
        evNote = '（阵纹显化 · 阵道 +15）';
      } else if (kind === 'xueYong') {
        if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 15);
        Log.add('【灵机】血气翻涌如潮，你顺势引而不发——煞意淬入经脉。', 'gain');
        evNote = '（血气翻涌 · 魔性 +15）';
      } else if (kind === 'lingZhu') {
        p.mp = Stat.compute(p).maxMp;
        p.poison = Math.max(0, p.poison - 5);
        Log.add('【灵机】草木灵露凝于窗棂，你掬而洗尘——灵力充盈，丹毒稍解。（灵力全满，丹毒 -5）', 'gain');
        evNote = '（灵露洗尘）';
      } else if (kind === 'shenYou') {
        gain = Math.round(gain * 1.8);
        this.addInsight(p, 2);
        Log.add('【灵机】神识离体，遨游星海一瞬——归来时天地都已换了一副面目。（修为 ×1.8，感悟 +2）', 'realm');
        evNote = '（神游太虚 · 修为 ×1.8）';
      }
    }
    this.addExp(p, gain);
    UI.float(`修为 +${Utils.fmtNum(gain)}${evNote ? ' ' + evNote.replace(/[（）]/g, ' ') : ''}`);   // v21 行动浮字
    Time.add(3);
    if (p.dead) return;
    if (p.dao === 'array') DaoSys.gain(p, 1);   // v16 阵道：聚灵
    if (p.dao === 'demonic') DaoSys.gain(p, 2);   // v16 魔性：化功
    p.hp = Math.min(Stat.compute(p).maxHp, Math.round(p.hp + Stat.compute(p).maxHp * 0.08));
    Log.add(`${Utils.pick(GameData.FLAVOR.cultivate)}（修为 <b>+${Utils.fmtNum(gain)}</b>）${evNote}`, 'info');
    Game.afterAction();
  },
  rest() {
    const p = Game.player;
    const st = Stat.compute(p);
    p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * 0.5));
    p.mp = Math.min(st.maxMp, p.mp + Math.round(st.maxMp * 0.5));
    // v10 境界特性 · 胎息（练气）：调息时气机自转，化解丹毒更胜他境
    // v26 修瑕：原条件 realmIdx>=0 恒真，「胎息」形同虚设——练气 5 点、其余境界 3 点
    const detox = p.realmIdx === 0 ? 5 : 3;
    if (detox) p.poison = Math.max(0, p.poison - detox);
    Time.add(1);
    p._restDay = Math.floor(p.day || 0);   // v38（E325）：行权扩容判据（今日已调息）
    if (p.dead) return;
    if (p.dao === 'body') DaoSys.gain(p, 10);   // v16 体魄：吐纳炼体
    // v34（F3）：调息 +2 感悟——修炼自回血、闭关回更多，调息原是三枚死按钮之一；
    // 打坐凝神偶有顿悟，赋予其独有收益后成为「回血顺便赚感悟」的低耗决策点。
    // v35（E159）：原「每游戏日限一次」守卫在 Time.add(1) 之后判定，dayNow 恒为新日、守卫永不拦截——
    // 但「一次调息恰耗一日」本身构成天然日限，效果与设计意图一致；现移除死守卫并注明口径
    // v37（E264）：调息感悟是全游戏唯一的「再生感悟」源（regen=true）——悟道纯度 ρ 的分母来源
    this.addInsight(p, 2, true);
    Log.add(`你寻一处灵气充裕之地打坐调息，气血灵力恢复大半${detox ? `，气机流转间化解了 ${detox} 点丹毒` : ''}，凝神之际偶有所悟（突破感悟 +2）。`, 'gain');
    Game.afterAction();
  },
  secludeCost(p) { return Math.round(30 * GameData.stoneEco(p.realmIdx)); },
  async seclude() {
    const p = Game.player;
    const cost = this.secludeCost(p);
    // v35（U5c）：真仙圆满态预估改报仙元——原预估恒按修为口径（「≈6.8 亿修为」），实发却是
    // 溢流折算的仙元（数字币种双失真）
    const r9Full = p.realmIdx >= 9 && p.layer === 3 && p.exp >= GameData.layerNeedT(p, p.realmIdx, 3);
    const est = Math.round(this.baseGain(p) * 10 * 1.6 * this.gainMultExp());
    const ok = await UI.popup({
      title: '闭关修炼',
      html: `闭关三十日，心无旁骛，修行效率远胜平日。<br>
        ${r9Full
          ? `修为轴已至尽头——预计可炼 <span class="hl">仙元 ≈${Utils.fmtNum(Math.max(1, Math.round(est / (GameData.eco(9) * 0.05))))}</span>（圆满态溢流折算，视加成略有浮动）。`
          : `预计可得修为 <span class="hl">≈${Utils.fmtNum(est)}</span>（视悟性与诸般加成略有浮动）。`}<br>
        需支付洞府灵石开销 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石／轮。<br>
        <span class="neg">若修为已至圆满，闭关中会自行冲关。</span>
        <label class="opt-line"><input type="checkbox" id="seclude-until-level">
          连续闭关 · 至下一小境界自动出关</label>`,
      options: [
        { text: '闭 关', value: true, primary: true },
        { text: '再想想', value: false },
      ],
    });
    if (!ok) return;
    // v4：勾选后进入连续闭关，进阶即止；未勾选保持原有单轮闭关
    const cb = document.getElementById('seclude-until-level');
    if (cb && cb.checked) { await this.secludeLoop(); return; }
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足，付不起洞府开销'); return; }
    const gain = Math.round(this.baseGain(p) * 10 * 1.6 * this.gainMult() * this.secludeMul(p));   // v20 隆冬蛰伏
    if (p.dao === 'array') DaoSys.gain(p, 10);   // v16 阵道：聚灵
    if (p.dao === 'demonic') DaoSys.gain(p, 20);   // v16 魔性：化功
    Log.add(`${Utils.pick(GameData.FLAVOR.seclude)}（修为 <b>+${Utils.fmtNum(gain)}</b>，丹毒稍减）`, 'info');
    const yuanBefore = p.counters.xianyuan || 0;
    this.addExp(p, gain);
    const yuanGain = (p.counters.xianyuan || 0) - yuanBefore;   // v35（U5c）：圆满态溢流折算的仙元入账
    UI.float(`修为 +${Utils.fmtNum(gain)} · 丹毒 -12`);   // v21 行动浮字
    p.poison = Math.max(0, p.poison - 12);
    Time.add(30);
    if (p.dead) return;
    let advanced = false;
    if (p.layer === 3 && p.exp >= GameData.layerNeedT(p, p.realmIdx, 3)) {
      await Utils.sleep(400);
      const r0 = p.realmIdx, l0 = p.layer;
      await this.breakthrough(10);
      // v35（U5c）修瑕：r9 圆满时 breakthrough 早退（358 行 realmIdx>=9 直接 return），
      // 原 advanced 恒置 true 吞掉结算报告——圆满态单轮闭关从此「无出关一纸账」。
      // 现以境界是否真变迁为准。
      advanced = p.realmIdx !== r0 || p.layer !== l0;
    }
    Game.afterAction();
    if (!advanced) this.settleReport({ rounds: 1, exp: gain, xianyuan: yuanGain, days: 30, advanced: 0, from: null, to: this.realmLabel(p) });   // v21 结算报告
  },
  /** v21：闭关结算报告——出关一纸小账，进益历历在目 */
  realmLabel(p) { return GameData.REALM_NAMES[p.realmIdx] + GameData.LAYER_NAMES[p.layer]; },
  settleReport(rep) {
    const p = Game.player;
    if (!p || p.dead) return;
    const rows = [
      [`闭关轮次`, `${rep.rounds} 轮`],
      [`修为进益`, `<b class="hl">+${Utils.fmtNum(Math.round(rep.exp))}</b>`],
      // v35（U5c）：圆满态溢流炼作的仙元单独成行——原报告只报名义修为，真仙圆满期对不上账
      ...(rep.xianyuan > 0 ? [[`仙元炼化`, `<b class="hl" style="color:var(--gold,#d4af37)">+${Utils.fmtNum(Math.round(rep.xianyuan))}</b>`]] : []),
      [`丹毒化解`, `<b style="color:var(--ok)">-${rep.rounds * 12}</b>`],
      [`历时`, `${Utils.fmtNum(rep.days)} 日`],
    ];
    if (rep.advanced > 0) rows.push([`境界变迁`, `<b class="hl">${rep.from} → ${this.realmLabel(p)}</b>${rep.advanced > 1 ? `（${rep.advanced} 次进阶）` : ''}`]);
    UI.popup({
      title: '出 关 · 结 算',
      html: `<div class="seclude-report">${rows.map(([k, v]) => `<div class="sr-row"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
        <div class="tip-line" style="text-align:center">· 推门而出，天地一新。</div>`,
      options: [{ text: '出关大吉', value: true, primary: true }],
    });
  },
  /** v4：连续闭关——每轮三十日，修为迈进新的小境界（进层或大境界突破成功）即自动出关；
   *  灵石不济、寿元将尽或达成上限轮数时亦会中止。 */
  async secludeLoop() {
    let p = Game.player;
    Log.add('你拂尘入室，立誓非至进境，不出此关。', 'system');
    let rounds = 0;
    const rep = { rounds: 0, exp: 0, xianyuan: 0, days: 0, advanced: 0, from: this.realmLabel(p) };   // v21 结算报告累计（v35（U5c）：补仙元行）
    while (rounds++ < 120) {
      if (!p || p.dead || Game.player !== p) return;   // 兵解/回溯等更换玩家对象时，旧循环立即作废
      // v29 修瑕：剧情/弹窗挂起时闭关暂停——此前节庆弹窗会被下一轮闭关的自动取消逻辑顶掉
      // v30 修瑕：天劫弹窗未决同样必须暂停——原守护只查剧情/弹窗，冲关劫决期间循环继续烧灵石岁月、
      //          重入 Tribulation.run 连环吞渡劫丹并反复覆写回溯备份 bak（对齐 autocult 的守护）
      // v31 修瑕：战斗进行中同样必须暂停——守护此前缺 Battle.active，循环间隙点探索开战后闭关照常烧岁月
      // v35（E152）：补叩问大道弹窗守护——dao-modal 不是 UI.popup，转道后渡劫失利（pendingDao）
      // 弹出的叩问大道在场时，循环原会继续烧灵石与岁月（与 AutoCult 的守护不对称）
      if ((typeof Story !== 'undefined' && Story.active && Story.active()) || UI._popupResolve || Tribulation.state
        || (typeof Battle !== 'undefined' && Battle.active)
        || (document.getElementById('dao-modal') && !document.getElementById('dao-modal').classList.contains('hidden'))) {
        Log.add('天劫将至、外事来扰，你暂敛心神，出关一顾。', 'warn');
        break;
      }
      const beforeLayer = p.layer, beforeRealm = p.realmIdx;
      const cost = this.secludeCost(p);
      if (!Bag.spendStones(cost)) {
        UI.toast('灵石不济，闭关被迫中止');
        Log.add('洞府灵石开销难以为继，你只得提前出关。', 'warn');
        break;
      }
      const gain = Math.round(this.baseGain(p) * 10 * 1.6 * this.gainMult() * this.secludeMul(p));   // v20 隆冬蛰伏
      if (p.dao === 'array') DaoSys.gain(p, 10);   // v16 阵道：聚灵
      if (p.dao === 'demonic') DaoSys.gain(p, 20);   // v16 魔性：化功
      Log.add(`${Utils.pick(GameData.FLAVOR.seclude)}（第${rounds}轮 · 修为 <b>+${Utils.fmtNum(gain)}</b>，丹毒稍减）`, 'info');
      const yuanBefore = p.counters.xianyuan || 0;
      this.addExp(p, gain);
      rep.xianyuan += (p.counters.xianyuan || 0) - yuanBefore;   // v35（U5c）：圆满态溢流折算的仙元
      rep.rounds++; rep.exp += gain; rep.days += 30;
      p.poison = Math.max(0, p.poison - 12);
      Time.add(30);
      if (p.dead || Game.player !== p) return;
      Game.afterAction();
      // 圆满冲关（与单轮闭关同款逻辑）：天劫博弈中胜出即境界跃升
      if (p.layer === 3 && p.exp >= GameData.layerNeedT(p, p.realmIdx, 3)) {
        await Utils.sleep(400);
        await this.breakthrough(10);
        if (!p || p.dead || Game.player !== p) return;
      }
      // 已至下一小境界 → 自动出关
      if (p.layer !== beforeLayer || p.realmIdx !== beforeRealm) {
        rep.advanced++;
        Log.add('修为已然进阶，你推门而出，只觉天地一新——此番闭关，功成。', 'system');
        UI.toast('闭关有成 · 已至新的小境界');
        break;
      }
      // v32 修瑕（E37）：真仙圆满后修为轴已顶——原循环无「无可再进」出口，顶满 120 轮（约 3600 日）
      // 可一次刷出仙阶全线需求约 7 倍的仙元（节奏崩坏）。圆满态至多再闭六轮即请出关。
      if (p.realmIdx >= 9 && p.layer === 3 && p.exp >= GameData.layerNeed(9, 3) && rounds >= 6) {
        Log.add('修为早已圆满，再往下只是水磨工夫——你收功出关，余韵自会炼作仙元。', 'system');
        break;
      }
      await Utils.sleep(120);   // 留出渲染与日志滚动的时间
    }
    Game.afterAction();
    if (rep.rounds > 0) this.settleReport(rep);   // v21 结算报告
  },
  /** 突破成算（大境界渡劫基准）：感悟/悟性/气运/孽障/大道/根基/挫而愈坚 皆计入 */
  breakthroughChance(p, bonus = 0) {
    // v30 修瑕：感悟 1:1 计成算可饱和打穿（满百 +100 把三策博弈与境界惩罚全部架空）——降权为 0.5:1
    let chance = 40 + Stat.compOf(p) * 2 + (p.insight || 0) * 0.5 + bonus;
    // v18 残玉共鸣九重 · 两世归一：两世道韵归一，突破成算 +3%
    if ((p.jade || 0) >= 9) chance += 3;
    chance += (p.fortune || 0) * 0.2;   // 气运：每10点 +2%
    chance -= (p.karma || 0) * 0.2;     // 孽障：每10点 -2%
    chance -= Math.floor((p.xinmo || 0) / 10);   // v28 联动：心魔蚀道——未降伏的心魔每10点 -1% 成算（满百另有心魔劫）
    chance += Math.min(15, (p.breakStreak || 0) * 5);   // v8 挫而愈坚：连败保底，每次失利 +5%（上限 +15%）
    if (p.flags && p.flags.visionXinzhang) chance += 2;   // v32（D6）：仙障心魔试炼——道基愈坚，突破成算永久 +2
    if (p.realmIdx >= 8) chance += 8;   // v10 境界特性 · 劫体（渡劫）：半身已在雷海
    if (p.dao === 'sword') chance *= 0.77;  // 剑心桀骜：渡劫难度+30%
    if (p.dao === 'body') chance *= 1.4;    // 金刚不坏：渡劫成算+40%
    // v38（E321/E300）：职业渡劫收敛——丹/符/阵以战力换百艺，天劫微宽（+4/+2/+2），
    // 邪修自持 1.8× 修炼不另补；六职业至飞升离散收敛进 ±15% 带（balance-sim 职业矩阵看门）
    if (p.dao === 'pill') chance += 4;
    if (p.dao === 'talisman') chance += 2;
    if (p.dao === 'array') chance += 2;
    if (p.rootDeep) chance *= 1.1;          // 根基深厚：历劫难度-10%
    if (p.rootWeak) chance *= 0.85;         // 根基虚浮：历劫难度+15%
    return Utils.clamp(chance, 5, 95);
  },
  /** 大境界突破：练气→筑基为静修冲关（无天劫）；金丹劫起进入天劫三策博弈（小境界进层仍在 addExp 中自动结算） */
  async breakthrough(bonus = 0) {
    const p = Game.player;
    if (p.layer !== 3 || p.exp < GameData.layerNeedT(p, p.realmIdx, 3)) return;
    if (p.realmIdx >= 9) return;
    if (p.realmIdx + 1 < GameData.TRIB_START) {
      await this.quietBreakthrough(bonus);
      return;
    }
    await Tribulation.run(bonus);
  },

  /** v9 筑基瓶颈：练气圆满冲筑基，水到渠成的静修冲关——无天劫，成算另 +15%，
   *  失利同样保留修为与感悟，并计入挫而愈坚。 */
  async quietBreakthrough(bonus = 0) {
    const p = Game.player;
    const chance = Utils.clamp(this.breakthroughChance(p, bonus + 15), 5, 95);
    Log.add('你收敛心神，向 <b>筑基</b> 瓶颈发起最后的冲击——气海翻涌，道基将成！', 'system');
    await Utils.sleep(700);
    if (Utils.chance(chance)) {
      p.realmIdx = 1; p.layer = 0; p.exp = Math.min(Math.floor((p.expOverflow || 0) / 2), GameData.layerNeed(1, 0) - 1); p.insight = 0; p.insightSrc = []; p.expOverflow = 0;   // v37（E264）：境界重置清空感悟总量缓存时，来源 FIFO 池同步清空（双池一致）
      p.breakStreak = 0;
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      NpcSys.onPlayerRealmUp(p);
      const tsLine = Narrative.tribSuccess();
      if (tsLine) Log.add(tsLine, 'realm');
      UI.realmShow(GameData.REALM_ASCEND_TEXT[1] || '道基初成，气象一新。', GameData.REALM_AURA[1]);
      Ambience.sfx('breakthrough');
      Log.add(`${Utils.pick(GameData.FLAVOR.breakSuccess)}`, 'realm');
      Log.add(`恭喜！你静修冲关功成，晋入 <b>筑基</b> 期——从此踏入修士之列！寿元上限提升至 ${st.lifespan} 岁。`, 'realm');
      const gr = NpcSys.realmGreeting(p);   // v19 突破贺语
      if (gr) { Log.add(`${gr.name}（${gr.title}）登门道贺——${gr.line}`, 'event'); Story.chron(`${gr.name} 登门道贺，贺你晋入筑基期`); }
      Guide.realmTip(p);   // v19 分阶段教学
      UI.announce('筑基功成 · 步入修士之列', 'gold');
      UI.toast('筑基成功！');
    } else {
      const aid = NpcSys.tryAid(p, 'trib');
      let insGain;
      if (aid) {
        p.exp = Math.round(GameData.layerNeedT(p, p.realmIdx, 3) * 0.8);
        insGain = 10;
        this.addInsight(p, insGain);
        Log.add(`危难之际，<b>${aid.name}</b> 从旁点拨，你稳住气机——冲击虽败，根基无损！`, 'gain');
      } else {
        p.exp = Math.round(GameData.layerNeedT(p, p.realmIdx, 3) * 0.6);
        insGain = 15;
        this.addInsight(p, insGain);
      }
      p.breakStreak = (p.breakStreak || 0) + 1;
      const streakBonus = Math.min(15, p.breakStreak * 5);
      UI.realmShow(Utils.pick(GameData.REALM_FAIL_TEXT), '#d05b5b');
      Log.add(`${Utils.pick(GameData.FLAVOR.breakFail)}（突破感悟 +${insGain}，修为有所损耗）`, 'loss');
      UI.announce('冲 关 未 破', 'bad');
      if (p.breakStreak >= 2) Log.add(`【挫而愈坚】你已连败 ${p.breakStreak} 次——下次冲关成算 +${streakBonus}%！`, 'gain');
    }
    p.pendingDao = true;   // 初入筑基叩问大道（失败则待来日功成再启）
    Game.afterAction();
  },
  /** 真仙圆满 → 渡劫飞升（通关仪式） */
  async ascend() {
    const p = Game.player;
    if (p.realmIdx !== 9 || p.layer !== 3 || p.flags.ascended) return;
    const ok = await UI.popup({
      title: '渡劫飞升',
      html: '九霄雷云汇聚，仙门已现。<br>你修为已至真仙圆满，只差最后一步——<br><span class="hl">引动天劫，白日飞升，位列仙班！</span><br><br>此去灵界，人界之事再与你无碍。',
      options: [
        { text: '引动天劫！', value: true, primary: true },
        { text: '再等等', value: false },
      ],
    });
    if (!ok) return;
    // v30 飞升实义化：终局一劫改为真判定——成算沿突破公式（真仙劫体 +8 已含），失败保留 40% 圆满修为并可再叩
    // v31 修瑕（E19）：仙劫同款耗渡劫丹——丹药 tooltip 言「引动天劫即耗」，而飞升按钮恰叫「引动天劫」，
    // 玩家囤丹渡仙劫却完全无效（渡劫丹在最高一劫失义）
    p.flags = p.flags || {};
    let dujieBonus = 0;
    if ((p.flags.dujieDan || 0) > 0) {
      p.flags.dujieDan--;
      dujieBonus = 5;
      Log.add('识海中渡劫丹的药力轰然化开，道基如蒙金光（成算 +5）。', 'gain');
    }
    const chance = Utils.clamp(this.breakthroughChance(p, 15 + dujieBonus), 5, 95);
    Log.add(`你一步踏空，直上九霄！九重雷劫轰然而落——天劫成算 <b class="hl">${chance.toFixed(0)}%</b>，你于雷海之中放声长啸——`, 'realm');
    await Utils.sleep(700);
    if (!Utils.chance(chance)) {
      const lost = Math.round(p.exp * 0.6);
      p.exp = Math.max(0, p.exp - lost);
      Time.cutLife(p, 10, '仙劫失利，雷火蚀身');
      const st2 = Stat.compute(p);
      p.hp = Math.max(1, Math.round(st2.maxHp * 0.3));
      Log.add(`仙劫失利！雷火反噬，你自云端跌落人间——圆满修为折损六成，折寿十年。仙门未闭，来日再叩。`, 'loss');
      UI.toast('仙劫失利 · 调息后再战', true);
      Game.afterAction();
      return;
    }
    Log.add('雷劫散尽，霞光万道。你身披仙光，回望人界一眼，翩然登仙。', 'realm');
    await Utils.sleep(500);
    p.flags.ascended = true;
    if (typeof ReincarnationSys !== 'undefined' && ReincarnationSys.grantMarks) ReincarnationSys.grantMarks(2, 'ascend');   // v30：白日飞升 +2 印记
    if (typeof ReincarnationSys !== 'undefined' && ReincarnationSys.showLifeReport) ReincarnationSys.showLifeReport(p, '白日飞升');   // v38（E319）：飞升小结（异步弹窗不阻塞）
    UI.realmShow('霞举飞升，肉身成圣——凡人之躯，终成不朽。', GameData.REALM_AURA[9]);   // v5
    UI.announce('✦ 白日飞升 · 位列仙班 ✦', 'gold');   // v4
    Ambience.sfx('breakthrough');
    Bag.addItem('z_taiji', 1);
    Bag.addStones(Math.round(5000 * GameData.stoneEco(9)));
    Log.add('天道降下仙缘：获赠【太极玉】与巨额灵石！你已飞升证道，仍可留在人界继续游历。', 'gain');
    const choice = await UI.popup({
      title: '✦ 位列仙班 ✦',
      html: `恭喜道友 <span class="hl">${Utils.esc(p.name)}</span> 白日飞升，证道成仙！<br><br>凡人之躯，逆天而行，此为大道之始。<br><br>你也可以选择<b>兵解转世</b>，携带仙缘重开一世。`,
      options: [{ text: '继续游历', value: 'stay', primary: true }, { text: '兵解转世', value: 'reinc' }],
    });
    if (choice === 'reinc') {
      p.canReincarnate = true;
      Log.add('你于仙门之前驻足回望，选择兵解转世——携一缕仙缘，重入轮回。', 'system');
      UI.toast('兵解转世之机已现（修炼页可用）');
    }
    Game.afterAction();
    // v22 飞升结语：三百年因果的收笔（一次性，先落盘后演出）
    if (!p.flags.epilogueDone) {
      p.flags.epilogueDone = true;
      await UI.popup({
        title: '✦ 尾 声 · 仙门之后 ✦',
        html: `<div class="story-p">雷光散尽的刹那，你眉心那点朱砂微微一烫。</div>
        <div class="story-p">三百年前，有人以一缕真灵封玉留志；三百年后，有人白衣登仙，替他把没走完的路走完了。</div>
        <div class="story-p">血河旧案早已昭雪。故人或有转世，或有仙名——而你的名字，自此写进了人界说书人的段子里。</div>
        <div class="story-p">仙门之后，另有一番天地。这段人间烟火的因果，就留在这里罢。</div>`,
        options: [{ text: '携道而往', value: true, primary: true }],
      });
      Story.chron('飞升 · 尾声');
      Game.afterAction();
    }
  },
};
