
/* ======================================================================
 * §25 肉鸽式秘境 DungeonSys（随机节点路线 / 撤离 / 陨落惩罚 / 本命法宝）
 * ====================================================================== */
const DungeonSys = {
  /** 深度收益倍率 */
  dm(depth) { return 1 + depth * 0.25; },
  /** v18：侦查符预览节点风险（消耗一张符箓） */
  scout() {
    const p = Game.player;
    const D = p.dungeon;
    if (!D || D.stuck) return;
    const hasTal = Object.keys(p.bag).some(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman');
    if (!hasTal) { UI.toast('需消耗一张符箓以施展窥探秘术'); return; }
    const talId = Object.keys(p.bag).filter(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman').sort((a, b) => (GameData.ITEMS[a].price || 0) - (GameData.ITEMS[b].price || 0))[0];   // v35（E155）：改耗价最低的符——原取首个命中，可能无声烧掉金光符等保命高符
    Bag.removeItem(talId, 1);
    const nodeNames = { battle: '⚔ 战斗', treasure: '🎁 宝箱', fortune: '✨ 奇遇', trap: '⚠ 陷阱', npc: '🗣 遭遇', boss: '☠ 守关' };
    const info = D.choices.map((t, i) => `${i === 0 ? '左' : '右'}路：${nodeNames[t] || t}`).join(' | ');
    UI.toast(`窥探结果：${info}`);
    if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 2, '窥探秘术，心事被暗处记下');   // v37（E245）：窥探符 +2——心魔新行为来源
    Log.add(`你以符箓为媒，灵光一闪窥得前路——${info}。`, 'info');
  },
  /** v29：秘境门票——按推荐境界灵石经济定价，入历一次一付
   *  v30 复核：×0.6 只占单次满通关收入约 0.2%，形同虚设——提至 ×2（约占 0.7%，保门票体感） */
  ticketOf(R) { return Math.round(GameData.stoneEco(R.recRealm) * 2); },
  enter(idx) {
    const p = Game.player;
    if (Battle.active || p.dead) return;
    const R = GameData.SECRET_REALMS[idx];
    if (!R) return;
    if (p.realmIdx < R.recRealm) { UI.toast(`需 ${GameData.REALM_NAMES[R.recRealm]}期方可入内`); return; }
    // v29：秘境准入门票——此前入场无成本且 Boss 固定巨款+气运，秘境成了无本万利的通胀主泵
    const ticket = this.ticketOf(R);
    if (!Bag.spendStones(ticket)) { UI.toast(`入秘境需备开门灵石 ${Utils.fmtNum(ticket)} 枚`); return; }
    Meta.see('realm', R.id);   // v6 图鉴
    if (R.rule) Log.add(`【地脉 · ${R.name}】${R.rule.txt}`, 'system');   // v32（F7）：入秘境先识地脉规则
    // v38（E307）：秘境异变——入秘 roll 1~2 条（30% 双异变），入口公示、可花灵石净化一条
    const muts = [];
    const mutPool = (GameData.DUNGEON_MUTATIONS || []).slice();
    const mutN = Utils.chance(30) ? 2 : 1;
    for (let i = 0; i < mutN && mutPool.length; i++) {
      const m = mutPool.splice(Utils.rand(0, mutPool.length - 1), 1)[0];
      muts.push(m.id);
    }
    const guZhou = muts.includes('guzhou');
    p.dungeon = { realm: idx, depth: 0, total: GameData.DUNGEON_TOTAL_LAYERS + (guZhou ? 1 : 0), choices: [], gains: [], stuck: false, muts };
    if (muts.length) {
      Log.add(`【异变】此行地气有异：${muts.map(id => { const d = (GameData.DUNGEON_MUTATIONS || []).find(x => x.id === id); return `<b>${d.name}</b>（${d.desc}）`; }).join('；')}。`, 'warn');
    }
    this.genRoute(p.dungeon);
    this.genChoices(p.dungeon);
    Log.add(`你以 ${Utils.fmtNum(ticket)} 灵石付清开门之资，踏入 <b>${R.name}</b>——雾气在身后合拢，退路只剩来时那条。`, 'system');
    Game.activeTab = 'map';
    Game.subTab = Game.subTab || {};
    Game.subTab.map = 'realm';   // v22 直达游历·秘境分栏
    Game.afterAction();
  },
  /** v22 预生成整条随机路线（每层二选一，末层守关）——供「前方预览」，亦兼容旧档补齐 */
  genRoute(D) {
    const R = GameData.SECRET_REALMS[D.realm];
    const total = D.total || GameData.DUNGEON_TOTAL_LAYERS;
    const start = D.depth || 0;
    const route = [];
    for (let d = 0; d < start; d++) route.push(['battle', 'treasure']);   // 旧档已走过的层：占位补齐
    for (let d = start; d < total - 1; d++) {
      const w = { ...R.weights };
      const bias = d * 2;
      w.battle += bias;                                  // 愈深愈多战
      w.trap += Math.floor(bias / 2) + (this.hasMut(D, 'huanzhen') ? 10 : 0);   // 愈深愈多陷阱；v38（E307）：幻阵迷踪 +10
      w.treasure = Math.max(6, w.treasure - Math.floor(bias / 3));
      const types = [];
      let guard = 0;
      while (types.length < 2 && guard++ < 30) {
        const t = Utils.pickWeighted(w);
        if (!types.includes(t)) types.push(t);
      }
      route.push(types.length ? types : ['battle', 'treasure']);
    }
    route.push(['boss']);
    D.route = route;
  },
  /** 当前层二选一：从预生成路线中取本层岔口 */
  genChoices(D) {
    if (!D.route) this.genRoute(D);
    D.choices = D.route[D.depth] || ['boss'];
    D.stuck = false;
  },
  /** v38（E307）：异变判定单源 */
  hasMut(D, id) { return !!(D && Array.isArray(D.muts) && D.muts.includes(id)); },
  /** v38（E307）：净化一条异变（20×境界系数灵石） */
  purify(id) {
    const p = Game.player;
    const D = p.dungeon;
    if (!D || !this.hasMut(D, id)) return;
    const cost = Math.round(20 * GameData.stoneEco(p.realmIdx));
    if (!Bag.spendStones(cost)) { UI.toast(`净化异变需灵石 ${Utils.fmtNum(cost)}`); return; }
    D.muts = D.muts.filter(x => x !== id);
    if (id === 'guzhou') D.total = GameData.DUNGEON_TOTAL_LAYERS;   // 古咒净化：层数回落
    const d = (GameData.DUNGEON_MUTATIONS || []).find(x => x.id === id);
    Log.add(`你以灵石引动地气，将【${d.name}】异变生生磨平——秘境脉络为此清朗一分。（灵石 -${Utils.fmtNum(cost)}）`, 'gain');
    Game.afterAction();
  },
  makeEnemy(R, depth, forceElite = false) {
    const mid = Utils.pick(R.pool);
    const target = R.recRealm * 4 + Math.floor(depth * 0.8);
    // v30 修瑕：精英基线改由 buildMonster 统一（原事后置 e.elite=true，吃词缀却吃不到 crit 基线）
    const wantElite = forceElite || Utils.chance(12 + depth * 3);
    const e = buildMonster(mid, Math.max(0, target - GameData.MONSTERS[mid].power), { elitePlus: wantElite });
    // v32（F7）秘境个性：每秘境一道地脉规则，守敌随之变形——秘境不再是换皮刷怪
    if (R.rule) {
      // v38（E337）：周天阁【阵法传习】——守敌地脉加成（>1 项）削弱一档（偏移 ×0.6）
      const wk = (Game.player.sect && Game.player.sect.id === 'zhoutian') ? 0.6 : 1;
      const adj = v => v > 1 ? 1 + (v - 1) * wk : v;
      if (R.rule.hp) e.hpMax = Math.round(e.hpMax * adj(R.rule.hp));
      if (R.rule.atk) e.atk = Math.round(e.atk * adj(R.rule.atk));
      if (R.rule.def) e.def = Math.round(e.def * adj(R.rule.def));
      if (R.rule.spd) e.spd = Math.round(e.spd * adj(R.rule.spd));
      e._realmRule = R.rule.txt + (wk < 1 ? '（周天阵法传习已削弱其地脉加成）' : '');
    }
    // v38（E307）：异变改写守敌——血月攻 +10%、深寒速 +10%、古咒守关必双词缀
    const D2 = Game.player.dungeon;
    if (this.hasMut(D2, 'xueyue')) e.atk = Math.round(e.atk * 1.1);
    if (this.hasMut(D2, 'shenhan')) e.spd = Math.round(e.spd * 1.1);
    if (this.hasMut(D2, 'guzhou') && forceElite) e._forceFx2 = true;
    if (wantElite) {
      e.hpMax = Math.round(e.hpMax * 1.6);
      e.atk = Math.round(e.atk * 1.3);
      e.expGain = Math.round(e.expGain * 2);
      e.stoneGain = Math.round(e.stoneGain * 2);
    }
    return e;
  },
  gain(D, text) { D.gains.push(text); if (D.gains.length > 12) D.gains.shift(); },
  /** 失传功法产出（已学已藏则折算碎片） */
  grantLostGongfa(p) {
    const pool = ['gf_wangchen', 'gf_hunyuan', 'gf_niepan'].filter(id => !p.gongfa[id] && !p.bag[id]);
    if (!pool.length) {
      Bag.addItem('m_gupian', 2);
      return null;
    }
    const id = Utils.pick(pool);
    Bag.addItem(id, 1);
    return GameData.ITEMS[id].name;
  },
  async resolve(i) {
    const p = Game.player;
    const D = p.dungeon;
    if (!D || D.stuck || Battle.active) return;
    const type = D.choices[i];
    if (!type) return;
    const R = GameData.SECRET_REALMS[D.realm];
    const dm = this.dm(D.depth);
    // v32 修瑕（A3）：战斗类节点原「先清 choices 再开战」——战斗中刷新/关页（或节庆年兽抢战被
    // Battle.start 静默丢弃）后读档，本层节点凭空消失只剩撤离，深入进度与门票沉没。
    // 改为：开战前置守卫 + 成功开战后才清空，失败回滚重掷本层。
    // v38（E307）：逐层异变账——幻阵每层感悟 +1、天佑每层气血自复一成
    if (this.hasMut(D, 'huanzhen')) Cultivate.addInsight(p, 1);
    if (this.hasMut(D, 'tianyou')) {
      const st0 = Stat.compute(p);
      if (p.hp < st0.maxHp) p.hp = Math.min(st0.maxHp, p.hp + Math.round(st0.maxHp * 0.1));
    }
    if (type === 'battle') {
      if (Battle.active) { this.genChoices(D); Game.afterAction(); return; }
      D.choices = [];
      // v32 修瑕（E59）：秘境原全程不耗游戏日——探索 2 日/闭关 30 日而秘境九层连刷零耗时，
      // 且不推进日结算/寿元/日限（宝箱节点灵石成无限刷管）。每节点计 1 日。
      Time.add(1);
      if (p.dead) { UI.toast('岁月不饶人——你在秘境深处走到了天年尽头'); return; }
      const e = this.makeEnemy(R, D.depth);
      Log.add(`你循着灵光拐过一道石廊——<b>${e.name}</b> 自阴影中扑来！`, 'event');
      // v38（E307）：异变入战——剑冢攻防、瘴雾开局、孤勇禁协战、深寒 DOT
      Battle.start(null, { enemy: e, dungeon: { realm: D.realm, depth: D.depth }, mapName: R.name,
        mutJzz: this.hasMut(D, 'jianzhong'), noPet: this.hasMut(D, 'guyong'), startHpPct: this.hasMut(D, 'zhangwu') ? 0.9 : null, mutShenhan: this.hasMut(D, 'shenhan') });
      Game.afterAction();   // v32（A3）：afterAction 挪到开战之后——dailySettle 的节庆检查见 Battle.active 自会挂起
      return;
    }
    if (type === 'boss') {
      if (Battle.active) { this.genChoices(D); Game.afterAction(); return; }
      D.choices = [];
      Time.add(1);   // v32 修瑕（E59）：同上——每节点计 1 日
      if (p.dead) { UI.toast('岁月不饶人——你在秘境深处走到了天年尽头'); return; }
      const e = this.makeEnemy(R, D.depth + 2, true);
      Log.add('雾气骤然退散——守关者自沉眠中睁开了眼睛！<b>此乃秘境最深处，胜则满载而归！</b>', 'system');
      Battle.start(null, { enemy: e, dungeon: { realm: D.realm, depth: D.depth }, boss: true, mapName: R.name + ' · 最深处',
        mutJzz: this.hasMut(D, 'jianzhong'), noPet: this.hasMut(D, 'guyong'), startHpPct: this.hasMut(D, 'zhangwu') ? 0.9 : null, mutShenhan: this.hasMut(D, 'shenhan') });   // v38（E307）
      Game.afterAction();
      return;
    }
    D.choices = [];
    Time.add(1);   // v32 修瑕（E59）：非战斗节点同样计 1 日
    if (p.dead) { UI.toast('岁月不饶人——你在秘境深处走到了天年尽头'); return; }
    // v17 非战斗节点：处理 → 结算演出卡（图标 + 结果摘要 + 继续深入）
    let result = null;
    if (type === 'treasure') {
      if (Utils.chance(15)) {
        const dmg = Math.round(Stat.compute(p).maxHp * Utils.rand(8, 14) / 100);
        p.hp = Math.max(1, p.hp - dmg);
        Log.add(`秘境宝箱竟然是活的——一口宝箱妖咬了你一口！气血 -${dmg}。`, 'loss');
        this.gain(D, '宝箱妖反噬');
        result = { icon: '🎁', title: '宝 箱 · 箱中藏妖', cls: 'loss', lines: [`你掀开古匣，匣内竟藏着一口<b>宝箱妖</b>！它狠狠咬了你一口——气血 <span class="neg">-${dmg}</span>。`, '大意了……下次开箱前，先听三息动静。'] };
      } else {
        // v38（E300）：阵道 3 重 A 脉「奇门遁甲」——秘境收获 +10%；v38（E307）：血月 ×1.2 / 孤勇 ×1.3
        const qiMen = p.dao === 'array' && DaoSys.hasPath(p, 3, 'qiMen') ? 1.1 : 1;
        const mutGain = (this.hasMut(D, 'xueyue') ? 1.2 : 1) * (this.hasMut(D, 'guyong') ? 1.3 : 1);
        const stones = Math.round(Utils.rand(14, 24) * GameData.stoneEco(R.recRealm) * dm * qiMen * mutGain);
        Bag.addStones(stones);
        const parts = [`灵石 ${Utils.fmtNum(stones)}`];
        if (Utils.chance((40 + depth2(D.depth)) * (this.hasMut(D, 'fukuan') ? 1.5 : 1))) {
          const mat = Utils.pick(GameData.matsByTier(Math.min(4, Math.floor(R.recRealm / 2) + 2)));
          Bag.addItem(mat, 1);
          parts.push(`${GameData.ITEMS[mat].name} ×1`);
        }
        if (Utils.chance(20 + D.depth * 3)) {
          Bag.addItem('m_gupian', 1);
          parts.push('上古法宝碎片 ×1');
        }
        Log.add(`你于 ${R.name} 第 ${D.depth + 1} 层寻得一只古匣——${parts.join('、')}。（深入第 ${D.depth + 1} 层，收益倍率 ×${dm.toFixed(2)}）`, 'gain');
        this.gain(D, `宝箱（第${D.depth + 1}层）`);
        result = { icon: '🎁', title: '宝 箱 · 古匣开启', cls: 'gain', lines: [`你于第 ${D.depth + 1} 层寻得一只落满尘土的<b>古匣</b>，撬开铜锁——`, `获得 <b class="hl">${parts.join('、')}</b>。`, `（本层收益倍率 ×${dm.toFixed(2)}）`] };
      }
    } else if (type === 'fortune') {
      // v38（E300）：阵道 3 重 A 脉「奇门遁甲」——秘境收获 +10%；v38（E307）：灵潮 ×2 / 孤勇 ×1.3
      const gain = Math.round(Utils.rand(70, 120) * GameData.eco(R.recRealm) * dm
        * (p.dao === 'array' && DaoSys.hasPath(p, 3, 'qiMen') ? 1.1 : 1)
        * (this.hasMut(D, 'lingchao') ? 2 : 1) * (this.hasMut(D, 'guyong') ? 1.3 : 1));
      Cultivate.addExp(p, gain);
      const insGain = Utils.rand(3, 7);
      Cultivate.addInsight(p, insGain);   // v33（E106）：走统一入口——原直写 min(100,·)，感悟满百时奇遇感悟静默蒸发
      const parts = [`修为 +${Utils.fmtNum(gain)}`, `突破感悟 +${insGain}`];
      let extra = '';
      if (D.depth >= 4 && Utils.chance(14)) {
        const gf = this.grantLostGongfa(p);
        if (gf) { extra = `蒲团之下竟压着一册<b>失传功法【${gf}】</b>！`; this.gain(D, `失传功法·${gf}`); }
        else { parts.push('上古法宝碎片 ×2'); Bag.addItem('m_gupian', 2); extra = '另得上古法宝碎片 ×2。'; }
      } else if (Utils.chance(18)) {
        parts.push('上古法宝碎片 ×1');
        Bag.addItem('m_gupian', 1);
        extra = '另得上古法宝碎片 ×1。';
      }
      // v20 天机果：深处偶得的破桎异果
      if (D.depth >= 4 && Utils.chance(8)) {
        Bag.addItem('fruit_tianji', 1);
        parts.push('天机果 ×1');
        extra += '蒲团之下竟还藏着一枚<b>天机果</b>！';
      }
      Log.add(`你误入一处天然道场，残存的道韵仍自流转。${parts.join('、')}。${extra}`, 'gain');
      this.gain(D, `奇遇（第${D.depth + 1}层）`);
      result = { icon: '✨', title: '奇 遇 · 道场遗韵', cls: 'gain', lines: [`你误入一处天然<b>道场</b>，残存的道韵仍自流转。`, `获得 <b class="hl">${parts.join('、')}</b>。${extra}`] };
    } else if (type === 'trap') {
      const dmg = Math.round(Stat.compute(p).maxHp * Math.min(35, 9 + D.depth * 2) / 100);
      p.hp = Math.max(1, p.hp - dmg);
      Log.add(`你误触上古禁制！一道灵光炸开，气血 -${dmg}。此地凶险，步步惊心。`, 'loss');
      this.gain(D, `禁制（第${D.depth + 1}层）`);
      result = { icon: '⚠', title: '陷 阱 · 上古禁制', cls: 'loss', lines: [`你一脚踩上石纹，<b>上古禁制</b>骤然亮起！灵光炸开——`, `气血 <span class="neg">-${dmg}</span>。`, '此地凶险，步步惊心。'] };
    } else if (type === 'npc') {
      result = await this.npcNode(R, D, dm);
    }
    D.depth++;
    p.counters.maxDepth = Math.max(p.counters.maxDepth || 0, D.depth);   // v11 剧情计数
    this.genChoices(D);
    if (result) await this.nodeResult(result, D, R);
    Game.afterAction();
  },
  /** v17 节点类型图标 */
  nodeIcon(t) {
    return { battle: '⚔ ', treasure: '🎁 ', fortune: '✨ ', trap: '⚠ ', npc: '🗣 ', boss: '☠ ' }[t] || '';
  },
  /** v17 秘境节点结算演出卡：统一展示节点结果与当前进度 */
  async nodeResult(r, D, R) {
    const p = Game.player;
    const D2 = p.dungeon || D;
    await UI.popup({
      title: `${r.icon} ${r.title}`,
      html: `
        <div class="dungeon-result ${r.cls}">
          ${r.lines.map(l => `<div class="dungeon-result-line">${l}</div>`).join('')}
          <div class="tip-line" style="margin-top:10px">· 已深入 <b>第 ${Math.min(D2.depth, D2.total)} 层</b> / ${D2.total} 层
            ${D2.gains && D2.gains.length ? ` · 已掠得：${D2.gains.slice(-4).join('；')}` : ''}</div>
        </div>`,
      options: [{ text: '继 续 深 入 ▸', value: true, primary: true }],
    });
  },
  /** 秘境遭遇：散商 / 残修 / 前辈 */
  /** 秘境遭遇：散商 / 残修 / 前辈（v17：返回结算卡 lines） */
  async npcNode(R, D, dm) {
    const p = Game.player;
    const kind = Utils.pickWeighted({ merchant: 35, senior: 35, wounded: 30 });
    if (kind === 'merchant') {
      const pool = ['w_sanqing', 'a_xuangui', 'z_qiankun', 'w_zhuxian', 'a_longlin', 'z_taiji', 'gf_lieyang', 'gf_xuantian', 'gf_tiangang'];
      const item = Utils.pick(pool);
      const def = GameData.ITEMS[item];
      const cost = Math.round((def.price || 8000) * 0.65);
      const buy = await UI.popup({
        title: '秘境散商',
        html: `石室内竟有一位摆摊的散修，货架上只有一件东西：<br><b>${def.name}</b> —— ${def.desc}<br>索价 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石。`,
        options: [{ text: '买下', value: true, primary: true }, { text: '不买', value: false }],
      });
      if (buy) {
        if (Bag.spendStones(cost)) {
          Bag.addItem(item, 1);
          Log.add(`你买下了 ${def.name}。散商收了灵石，人便消失在雾中。`, 'gain');
          this.gain(D, `购得${def.name}`);
          return { icon: '🗣', title: '遭 遇 · 秘境散商', cls: 'gain', lines: [`你以 <b class="hl">${Utils.fmtNum(cost)}</b> 灵石购得 <b>${def.name}</b>。`, '散商收了灵石，人便消失在雾中。'] };
        }
        Log.add('你摸了摸储物袋，只能拱手告辞。', 'info');
        return { icon: '🗣', title: '遭 遇 · 秘境散商', cls: 'warn', lines: ['你摸了摸储物袋——灵石不济，只得拱手告辞。', '散商也不恼，收拾货担，遁入雾中。'] };
      }
      Log.add('你摇了摇头，散商也不恼，化作一道遁光去了。', 'info');
      return { icon: '🗣', title: '遭 遇 · 秘境散商', cls: 'info', lines: ['你摇了摇头——此物虽好，与你无缘。', '散商也不恼，化作一道遁光去了。'] };
    } else if (kind === 'senior') {
      const gain = Math.round(Utils.rand(60, 100) * GameData.eco(R.recRealm) * dm);
      Cultivate.addExp(p, gain);
      Cultivate.addInsight(p, 5);   // v33（E106）：走统一入口（原直写满值静默蒸发）
      const parts = [`修为 +${Utils.fmtNum(gain)}`, '突破感悟 +5'];
      let extra = '';
      if (D.depth >= 3 && Utils.chance(10)) {
        const gf = this.grantLostGongfa(p);
        if (gf) { extra = `临散前，残影将一册<b>失传功法【${gf}】</b>推到你面前。`; this.gain(D, `失传功法·${gf}`); }
      }
      Log.add(`一位枯坐的前辈残影向你传了一缕真意。${parts.join('、')}。${extra}`, 'gain');
      this.gain(D, `前辈传法（第${D.depth + 1}层）`);
      return { icon: '🗣', title: '遭 遇 · 前辈残影', cls: 'gain', lines: [`一位枯坐的<b>前辈残影</b>缓缓睁眼，向你传了一缕真意。`, `获得 <b class="hl">${parts.join('、')}</b>。${extra}`] };
    } else {
      const hasPill = Bag.count('pill_liaoshang') > 0;
      const choice = await UI.popup({
        title: '重伤散修',
        html: `一名散修倒在秘境禁制下，气若游丝。「道友……救我……我的储物袋里，有上古碎片……」<br>${hasPill ? '你身上正好有【疗伤丹】。' : '你身无丹药，只能以真元续他一命（损一成气血）。'}`,
        options: hasPill
          ? [{ text: '赠丹相救', value: 'pill', primary: true }, { text: '趁机动手', value: 'rob' }, { text: '绕行', value: 'leave' }]
          : [{ text: '以真元相救', value: 'qi', primary: true }, { text: '趁机动手', value: 'rob' }, { text: '绕行', value: 'leave' }],
      });
      if (choice === 'pill' || choice === 'qi') {
        if (choice === 'pill') Bag.removeItem('pill_liaoshang', 1);
        else p.hp = Math.max(1, p.hp - Math.round(Stat.compute(p).maxHp * 0.1));
        if (Utils.chance(65)) {
          Bag.addItem('m_gupian', 1);
          Log.add('散修以秘法支撑到出口，临别将一块上古法宝碎片塞进你手中。', 'gain');
          this.gain(D, '碎片（救人所赠）');
          return { icon: '🗣', title: '遭 遇 · 重伤散修', cls: 'gain', lines: ['你以真元/灵药助其续命，散修缓过一口气。', '临别时，他将一块<b class="hl">上古法宝碎片</b>塞进你手中：「此恩……来世再报。」'] };
        }
        Log.add('散修养好伤势，千恩万谢地遁走了。', 'info');
        return { icon: '🗣', title: '遭 遇 · 重伤散修', cls: 'gain', lines: ['你出手相救，散修缓过气来，千恩万谢地遁走了。', '善因已种，未必即报。'] };
      } else if (choice === 'rob') {
        const stones = Math.round(Utils.rand(20, 40) * GameData.stoneEco(R.recRealm) * dm);
        Bag.addStones(stones);
        Bag.addItem('m_gupian', 1);
        KarmaSys.addKarma(Utils.rand(6, 10), true);
        Log.add(`你面无表情地搜走了他的储物袋：灵石 ${Utils.fmtNum(stones)}、上古法宝碎片 ×1。他绝望的眼神，你权当没看见。（孽障增加）`, 'gain');
        this.gain(D, '夺宝（重伤散修）');
        return { icon: '🗣', title: '遭 遇 · 见财起意', cls: 'loss', lines: [`你面无表情地搜走了他的储物袋：<b>灵石 ${Utils.fmtNum(stones)}、上古法宝碎片 ×1</b>。`, '他绝望的眼神，你权当没看见。（孽障增加）'] };
      }
      Log.add('你绕开了他。秘境之中，各安天命。', 'info');
      return { icon: '🗣', title: '遭 遇 · 重伤散修', cls: 'info', lines: ['你绕开了他。', '秘境之中，各安天命。'] };
    }
  },
  /** 战胜节点：深入一层 */
  onVictory(dctx, boss = false) {
    const p = Game.player;
    const D = p.dungeon;
    if (!D) return;
    D.depth++;
    if (boss) p.counters.bossKills = (p.counters.bossKills || 0) + 1;   // v6 成就计数
    p.counters.maxDepth = Math.max(p.counters.maxDepth || 0, D.depth);   // v11 剧情计数
    const R = GameData.SECRET_REALMS[D.realm];
    if (boss) {
      const gf = this.grantLostGongfa(p);
      Bag.addItem('m_gupian', 3);
      // v30 堵漏：Boss 灵石每秘境每日限一次——此前门票占通关收入 0.2%，Boss 巨款可无限复刷
      p.counters.bossStoneDay = p.counters.bossStoneDay || {};
      const _today2 = Math.floor(p.day || 0);
      const stoneOk = p.counters.bossStoneDay[R.id] !== _today2;
      if (stoneOk) p.counters.bossStoneDay[R.id] = _today2;
      const stones = stoneOk ? Math.round(Utils.rand(60, 100) * GameData.stoneEco(R.recRealm) * 2) : 0;
      if (stones > 0) Bag.addStones(stones);
      // v29：Boss 气运每秘境每日限一次——重复通关不再无限灌气运（配合 KarmaSys 气运软上限 150）
      p.counters.bossFortuneDay = p.counters.bossFortuneDay || {};
      const _today = Math.floor(p.day || 0);
      let fortuneTxt = '';
      if (p.counters.bossFortuneDay[R.id] !== _today) {
        p.counters.bossFortuneDay[R.id] = _today;
        KarmaSys.addFortune(10);
        fortuneTxt = '（气运 +10）';
      } else {
        fortuneTxt = '（今日此间气运已得过，不再进益）';
      }
      // v27 修瑕：通关秘境从未按 realm 去重计数，成就「秘境征服者」永不可解锁
      p.counters.clearedRealms = p.counters.clearedRealms || {};
      p.counters.clearedRealms[R.id] = 1;
      p.counters.dungeonClears = Object.keys(p.counters.clearedRealms).length;
      // v34（E121）：播报对齐实发——无功法分支原写「碎片 ×2、碎片 ×3」共 5 枚，实际只发 3 枚（Bag.addItem 3）
      Log.add(`<b>${R.name}</b> 最深处的宝库向你敞开！${gf ? `失传功法【${gf}】、` : ''}上古法宝碎片 ×3、${stones > 0 ? `灵石 ${Utils.fmtNum(stones)}` : '宝库灵石今日已被你取过（不再进益）'}——你满载而归！${fortuneTxt}`, 'gain');
      p.dungeon = null;
      Log.add('你退出秘境，回望雾中洞口，只觉造化玄奇。', 'system');
      return;
    }
    this.gain(D, `战斗得利（第${D.depth}层）`);
    if (p.dao === 'array') DaoSys.gain(p, 15);   // v16 阵道：探秘
    if (D.depth >= D.total) { p.dungeon = null; return; }
    this.genChoices(D);
  },
  /** 秘境中战败：损失背包 30% 物品 */
  async onDefeat() {
    const p = Game.player;
    if (!p.dungeon) return;
    const lost = [];
    for (const [id, qty] of Object.entries(p.bag)) {
      const lose = Math.floor(qty * 0.3);
      if (lose > 0) { Bag.removeItem(id, lose); lost.push(`${GameData.ITEMS[id].name}×${lose}`); }
    }
    p.dungeon = null;
    p.hp = Math.max(1, Math.round(Stat.compute(p).maxHp * 0.2));
    Log.add(`你陨落于秘境之中……魂归之时，秘境禁制吞去了你储物袋三成之物：${lost.join('、') || '些许杂物'}。`, 'loss');
    await UI.popup({
      title: '陨落 · 秘境',
      html: '秘境禁制轰然而落，你被硬生生震出界外。<br><span class="neg">背包内三成之物，永远留在了秘境深处。</span>',
      options: [{ text: '挣扎爬起', value: true, primary: true }],
    });
    Log.add('再睁眼时，你已躺在山门外。秘境无情，来日再战。', 'warn');
  },
  /** 战斗中遁走：困在原地，只能撤离 */
  onFlee() {
    const p = Game.player;
    if (!p.dungeon) return;
    p.dungeon.stuck = true;
    p.dungeon.choices = [];
    Log.add('你退出争斗，藏进石隙——此地不宜久留，趁早撤离为上。', 'warn');
  },
  /** 撤离：带走当前收益 */
  async retreat() {
    const p = Game.player;
    const D = p.dungeon;
    if (!D) return;
    const R = GameData.SECRET_REALMS[D.realm];
    const ok = await UI.popup({
      title: '撤离秘境',
      html: `你已深入 <b>第 ${D.depth} 层</b>（共 ${D.total} 层）。<br>所掠已尽入囊中，然愈深愈险——确定循来路撤离吗？`,
      options: [{ text: '撤离', value: true }, { text: '继续深入', value: false }],
    });
    if (!ok) return;
    p.dungeon = null;
    Log.add(`你循着来路退出 ${R.name}，身后雾气合拢。深入 ${D.depth} 层，全身而退。`, 'system');
    Game.afterAction();
  },
  /** 九枚碎片 → 本命法宝 */
  async synth() {
    const p = Game.player;
    if (Bag.count('m_gupian') < 9) { UI.toast('碎片不足九枚'); return; }
    const ok = await UI.popup({
      title: '炼化 · 本命法宝',
      html: '九枚上古法宝碎片悬浮周身，隐隐排成一件古宝的形状。<br>以心头精血炼之，可成<b>本命法宝</b>——与神魂相合，攻防气感皆得其益。',
      options: [{ text: '滴血炼化', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    Bag.removeItem('m_gupian', 9);
    Bag.addItem('z_benming', 1);
    // v37（E239）：本命合成演出——规格压过灵兽蜕变（realmShow 全屏异象 + 专属音色 + 金色公告）
    // v37（E232）：死音效 inherit 接线（与 E239 同点）
    UI.realmShow('精血为引，古宝认主——自此神魂相合。', '#b89a5a');
    if (typeof Ambience !== 'undefined') Ambience.sfx('inherit');
    UI.announce('✦ 本命法宝 · 炼化功成 ✦', 'gold');
    Log.add('精血没入碎片，轰鸣声中，一件古朴法宝环绕周身——<b>本命法宝</b>炼化成了！（可在乾坤袋中装备）', 'gain');
    Game.afterAction();
  },
};
