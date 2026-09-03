
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
    const talId = Object.keys(p.bag).find(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman');
    Bag.removeItem(talId, 1);
    const nodeNames = { battle: '⚔ 战斗', treasure: '🎁 宝箱', fortune: '✨ 奇遇', trap: '⚠ 陷阱', npc: '🗣 遭遇', boss: '☠ 守关' };
    const info = D.choices.map((t, i) => `${i === 0 ? '左' : '右'}路：${nodeNames[t] || t}`).join(' | ');
    UI.toast(`窥探结果：${info}`);
    Log.add(`你以符箓为媒，灵光一闪窥得前路——${info}。`, 'info');
  },
  enter(idx) {
    const p = Game.player;
    if (Battle.active || p.dead) return;
    const R = GameData.SECRET_REALMS[idx];
    if (!R) return;
    if (p.realmIdx < R.recRealm) { UI.toast(`需 ${GameData.REALM_NAMES[R.recRealm]}期方可入内`); return; }
    Meta.see('realm', R.id);   // v6 图鉴
    p.dungeon = { realm: idx, depth: 0, total: GameData.DUNGEON_TOTAL_LAYERS, choices: [], gains: [], stuck: false };
    this.genChoices(p.dungeon);
    Log.add(`你寻得入口，踏入 <b>${R.name}</b>——雾气在身后合拢，退路只剩来时那条。`, 'system');
    Game.activeTab = 'map';
    Game.afterAction();
  },
  /** 随机节点路线：每层二选一，最深处为守关者 */
  genChoices(D) {
    const R = GameData.SECRET_REALMS[D.realm];
    if (D.depth >= D.total - 1) { D.choices = ['boss']; D.stuck = false; return; }
    const w = { ...R.weights };
    const bias = D.depth * 2;
    w.battle += bias;                                  // 愈深愈多战
    w.trap += Math.floor(bias / 2);                    // 愈深愈多陷阱
    w.treasure = Math.max(6, w.treasure - Math.floor(bias / 3));
    const types = [];
    let guard = 0;
    while (types.length < 2 && guard++ < 30) {
      const t = Utils.pickWeighted(w);
      if (!types.includes(t)) types.push(t);
    }
    D.choices = types.length ? types : ['battle', 'treasure'];
    D.stuck = false;
  },
  makeEnemy(R, depth, forceElite = false) {
    const mid = Utils.pick(R.pool);
    const target = R.recRealm * 4 + Math.floor(depth * 0.8);
    const e = buildMonster(mid, Math.max(0, target - GameData.MONSTERS[mid].power));
    if (forceElite || Utils.chance(12 + depth * 3)) {
      e.elite = true;
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
    D.choices = [];
    if (type === 'battle') {
      const e = this.makeEnemy(R, D.depth);
      Log.add(`你循着灵光拐过一道石廊——<b>${e.name}</b> 自阴影中扑来！`, 'event');
      Game.afterAction();
      Battle.start(null, { enemy: e, dungeon: { realm: D.realm, depth: D.depth }, mapName: R.name });
      return;
    }
    if (type === 'boss') {
      const e = this.makeEnemy(R, D.depth + 2, true);
      Log.add('雾气骤然退散——守关者自沉眠中睁开了眼睛！<b>此乃秘境最深处，胜则满载而归！</b>', 'system');
      Game.afterAction();
      Battle.start(null, { enemy: e, dungeon: { realm: D.realm, depth: D.depth }, boss: true, mapName: R.name + ' · 最深处' });
      return;
    }
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
        const stones = Math.round(Utils.rand(14, 24) * GameData.stoneEco(R.recRealm) * dm);
        Bag.addStones(stones);
        const parts = [`灵石 ${Utils.fmtNum(stones)}`];
        if (Utils.chance(40 + depth2(D.depth))) {
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
      const gain = Math.round(Utils.rand(70, 120) * GameData.eco(R.recRealm) * dm);
      Cultivate.addExp(p, gain);
      const insGain = Utils.rand(3, 7);
      p.insight = Math.min(100, p.insight + insGain);
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
      p.insight = Math.min(100, p.insight + 5);
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
      const stones = Math.round(Utils.rand(60, 100) * GameData.stoneEco(R.recRealm) * 2);
      Bag.addStones(stones);
      KarmaSys.addFortune(10);
      Log.add(`<b>${R.name}</b> 最深处的宝库向你敞开！${gf ? `失传功法【${gf}】、` : '上古法宝碎片 ×2、'}上古法宝碎片 ×3、灵石 ${Utils.fmtNum(stones)}——你满载而归！（气运 +10）`, 'gain');
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
    Log.add('精血没入碎片，轰鸣声中，一件古朴法宝环绕周身——<b>本命法宝</b>炼化成了！（可在乾坤袋中装备）', 'gain');
    Game.afterAction();
  },
};
