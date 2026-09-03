
/* ======================================================================
 * §10 背包系统（物品 / 灵石）
 * ====================================================================== */
const Bag = {
  addItem(itemId, qty = 1) {
    const p = Game.player;
    p.bag[itemId] = (p.bag[itemId] || 0) + qty;
    if (itemId === 'm_gupian') p.counters.gupianGot = (p.counters.gupianGot || 0) + qty;   // v11 剧情计数
    // v4：获得地级及以上稀有物品时，居中公告
    const def = GameData.ITEMS[itemId];
    if (def && (def.grade || 0) >= 3) { UI.announce(`✦ 获得稀有 · ${def.name}`, 'gold'); Ambience.sfx('rare'); }
    // v6：图鉴收录（功法 / 法宝）
    if (def && def.type === 'gongfa') Meta.see('gongfa', itemId);
    if (def && def.type === 'artifact') Meta.see('artifact', itemId);
  },
  removeItem(itemId, qty = 1) {
    const p = Game.player;
    if (!p.bag[itemId]) return;
    p.bag[itemId] -= qty;
    if (p.bag[itemId] <= 0) delete p.bag[itemId];
  },
  count(itemId) { return Game.player.bag[itemId] || 0; },
  addStones(amount) {
    const p = Game.player;
    // v18 道心烙印【霸/谋/借】：灵石获取加成
    if (amount > 0 && typeof DaoxinSys !== 'undefined') amount *= DaoxinSys.stoneMult(p);
    if (amount > 0 && typeof PersonalSys !== 'undefined' && PersonalSys.bonusOf) amount *= PersonalSys.bonusOf(p).stoneMult;   // v19 个人线财路
    p.stones.low += Math.round(amount * (1 + Stat.compute(p).stonePct / 100));
    // 自动向上归并，便于展示
    while (p.stones.low >= 100) { const n = Math.floor(p.stones.low / 100); p.stones.mid += n; p.stones.low -= n * 100; }
    while (p.stones.mid >= 100) { const n = Math.floor(p.stones.mid / 100); p.stones.high += n; p.stones.mid -= n * 100; }
  },
  /** 优先花下品；不足时自动从上品兑换，返回是否成功 */
  spendStones(amount) {
    const p = Game.player;
    if (p.stones.low < amount) {
      while (p.stones.low < amount && (p.stones.mid > 0 || p.stones.high > 0)) {
        if (p.stones.mid > 0) { p.stones.mid--; p.stones.low += 100; }
        else { p.stones.high--; p.stones.mid += 100; }
      }
      // 归并可能产生的零头
      while (p.stones.mid >= 100 && p.stones.low < amount) { p.stones.mid -= 100; p.stones.low += 100; }
    }
    if (p.stones.low < amount) return false;
    p.stones.low -= amount;
    return true;
  },
  stonesText() {
    const s = Game.player.stones;
    const parts = [`下品 ${Utils.fmtNum(s.low)}`];
    if (s.mid) parts.push(`中品 ${Utils.fmtNum(s.mid)}`);
    if (s.high) parts.push(`上品 ${Utils.fmtNum(s.high)}`);
    return parts.join(' · ');
  },
  use(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    if (!def || def.type !== 'pill' || !this.count(itemId)) return;
    this.removeItem(itemId, 1);
    Pill.apply(p, def);
    Game.afterAction();
  },
  /* ---------- v4 一键减负：低阶丹药批量服用 ---------- */
  /** 战斗外一键服用凡级回血/回灵丹（疗伤丹 / 回灵丹），补满状态自动停止；
   *  丹毒将溢出时自动收手，避免药力反噬损毁修为。 */
  autoUseLowPills() {
    const p = Game.player;
    if (!p) return;
    let usedHp = 0, usedMp = 0, poisonBlocked = false;
    let guard = 0;
    while (guard++ < 40) {
      const st = Stat.compute(p);
      const cap = 60 + p.attrs.body * 8 + (p.realmIdx >= 5 ? 20 : 0);
      // 疗伤丹：气血未满才服
      if (Bag.count('pill_liaoshang') > 0 && p.hp < st.maxHp) {
        const gain = (GameData.ITEMS['pill_liaoshang'].poison || 0) * (1 - st.poisonReduce / 100);
        if (p.poison + gain > cap) { poisonBlocked = true; break; }
        Bag.removeItem('pill_liaoshang', 1);
        Pill.apply(p, GameData.ITEMS['pill_liaoshang'], true);
        usedHp++;
        continue;
      }
      // 回灵丹：灵力未满才服
      if (Bag.count('pill_huiling') > 0 && p.mp < st.maxMp) {
        const gain = (GameData.ITEMS['pill_huiling'].poison || 0) * (1 - st.poisonReduce / 100);
        if (p.poison + gain > cap) { poisonBlocked = true; break; }
        Bag.removeItem('pill_huiling', 1);
        Pill.apply(p, GameData.ITEMS['pill_huiling'], true);
        usedMp++;
        continue;
      }
      break;
    }
    if (!usedHp && !usedMp) {
      UI.toast(poisonBlocked ? '丹毒将满，不宜再服' : '气血灵力充盈，无需服丹');
      return;
    }
    Time.add(1);
    if (p.dead) return;
    Log.add(`你盘膝调息，一口气服下疗伤丹 ×${usedHp}、回灵丹 ×${usedMp}，气血灵力已然充盈。`, 'gain');
    if (poisonBlocked) Log.add('只是丹毒积累将满，不宜再多服——再服恐有反噬之危。', 'warn');
    Game.afterAction();
  },
  async equip(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    if (!def || def.type !== 'artifact' || !this.count(itemId)) return;
    const slot = def.slot;
    // v19 装备对比：槽位已有装备时，先看属性差再决定
    const cur = p.equipped[slot];
    const curId = cur ? Utils.eqId(cur) : null;
    if (curId) {
      const curDef = GameData.ITEMS[curId];
      const fmt = b => Object.entries(b || {}).map(([k, v]) => `${({ atk: '攻击', def: '防御', hp: '气血', mp: '灵力', spd: '身法', atkPct: '攻击%', defPct: '防御%', hpPct: '气血%', mpPct: '灵力%', spdPct: '身法%', crit: '暴击', dodge: '闪避', block: '格挡', cult: '修炼%' }[k] || k)  }+${v}`).join('，') || '无';
      const enh = cur && typeof cur === 'object' ? (cur.enhance || 0) : ((p.enhanced || {})[curId] || 0);
      const ok = await UI.popup({
        title: '装备对比',
        html: `<div class="stat-line"><span>当前</span><b>${curDef.name}${enh ? ' +' + enh : ''}</b></div>
          <div class="tip-line">· ${fmt(curDef.bonus)}</div>
          <div class="stat-line" style="margin-top:4px"><span>换上</span><b>${def.name}</b></div>
          <div class="tip-line">· ${fmt(def.bonus)}</div>`,
        options: [{ text: '换 上', value: true, primary: true }, { text: '作罢', value: false }],
      });
      if (!ok) return;
    }
    this.removeItem(itemId, 1);
    // v18：装备槽存 {id, enhance} 对象，强化等级随实例走
    const oldEnhance = p.equipped[slot] ? (p.equipped[slot].enhance || 0) : 0;
    if (p.equipped[slot]) Bag.addItem(p.equipped[slot].id, 1); // 旧装备回包
    const newEnhance = p.enhanced && p.enhanced[itemId] ? p.enhanced[itemId] : oldEnhance;
    p.equipped[slot] = { id: itemId, enhance: newEnhance };
    // 从 p.enhanced 中清除（现由槽位实例持有）
    if (p.enhanced && p.enhanced[itemId]) delete p.enhanced[itemId];
    Log.add(`你装备了 <b>${def.name}</b>。`, 'gain');
    Game.afterAction();
  },
  unequip(slot) {
    const p = Game.player;
    if (!p.equipped[slot]) return;
    const eq = p.equipped[slot];
    // v18：卸下时保留强化等级到 p.enhanced（回包后仍可追溯）
    if (eq.enhance) {
      if (!p.enhanced) p.enhanced = {};
      p.enhanced[eq.id] = Math.min(eq.enhance, ForgeSys.MAX_LV);
    }
    Bag.addItem(eq.id, 1);
    Log.add(`你卸下了 ${GameData.ITEMS[eq.id].name}。`, 'info');
    p.equipped[slot] = null;
    Game.afterAction();
  },
  async drop(itemId) {
    const def = GameData.ITEMS[itemId];
    const ok = await UI.popup({
      title: '丢弃物品',
      html: `确定丢弃一件 <b>${def.name}</b> 吗？`,
      options: [{ text: '丢弃', value: true }, { text: '取消', value: false }],
    });
    if (!ok) return;
    this.removeItem(itemId, 1);
    Log.add(`你丢弃了一件 ${def.name}。`, 'loss');
    Game.afterAction();
  },
  /** v13 批量丢弃：清空当前分类页签下的全部物品（已穿戴装备不在背包，不受影响） */
  async dropCategory(type) {
    const p = Game.player;
    const ids = Object.keys(p.bag).filter(id => type !== 'all' ? GameData.ITEMS[id].type === type : true);
    if (!ids.length) { UI.toast('此类物品已空'); return; }
    const total = ids.reduce((s, id) => s + p.bag[id], 0);
    const names = ids.slice(0, 6).map(id => `${GameData.ITEMS[id].name} ×${p.bag[id]}`).join('、');
    const ok = await UI.popup({
      title: '批量丢弃',
      html: `将丢弃以下物品（共 ${total} 件）：<br>· ${names}${ids.length > 6 ? ` 等 ${ids.length} 种` : ''}<br><br><span class="neg">丢弃之物无法找回，确定吗？</span>`,
      options: [{ text: '全部丢弃', value: true }, { text: '取消', value: false }],
    });
    if (!ok) return;
    for (const id of ids) delete p.bag[id];
    Log.add(`你挥手间清空了一类杂物（${total} 件），乾坤袋清爽了许多。`, 'loss');
    Game.afterAction();
  },
};

/** 丹药效果结算（战斗内外共用） */
const Pill = {
  apply(p, def, inBattle = false) {
    p.counters.pills = (p.counters.pills || 0) + 1;   // v11 剧情计数
    if (p.dao === 'pill') DaoSys.gain(p, 3);   // v16 丹火
    const st = Stat.compute(p);
    const effect = { ...def.use };
    // 丹霞谷 / 丹道：丹药效果增强（作用于数值部分）；金丹境再 +30%
    const pillBoost = (st.pillPct || 0) + (p.dao === 'pill' ? 30 : 0) + (p.dao === 'pill' && DaoSys.tierLevel(p) >= 5 ? 30 : 0);
    if (pillBoost) {
      for (const k of ['exp', 'hpPct', 'mpPct']) if (effect[k]) effect[k] = Math.round(effect[k] * (1 + pillBoost / 100));
    }
    let effectText = [];
    if (effect.exp) { Cultivate.addExp(p, effect.exp, inBattle); effectText.push(`修为 +${Utils.fmtNum(effect.exp)}`); }
    if (effect.hpPct) { p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * effect.hpPct / 100)); effectText.push(`气血 +${effect.hpPct}%`); }
    if (effect.mpPct) { p.mp = Math.min(st.maxMp, p.mp + Math.round(st.maxMp * effect.mpPct / 100)); effectText.push(`灵力 +${effect.mpPct}%`); }
    if (effect.curePoison) { p.poison = Math.max(0, p.poison - effect.curePoison); effectText.push(`丹毒 -${effect.curePoison}`); }
    if (effect.insight) { p.insight = Math.min(100, p.insight + effect.insight); effectText.push(`突破感悟 +${effect.insight}`); }
    if (effect.stat) {
      const keys = Object.keys(p.attrs).filter(k => p.attrs[k] < 10);
      if (keys.length) {
        const k = Utils.pick(keys);
        p.attrs[k]++;
        effectText.push(`${GameData.ATTR_NAMES[k]} +1`);
      } else {
        const gain = Math.round(120 * GameData.eco(p.realmIdx));
        Cultivate.addExp(p, gain, inBattle);
        effectText.push(`洗筋伐髓，修为 +${Utils.fmtNum(gain)}`);
      }
    }
    // 丹毒结算
    let poisonGain = (def.poison || 0) * (1 - st.poisonReduce / 100);
    if (p.dao === 'pill' && DaoSys.tierLevel(p) >= 3) poisonGain *= 0.7;   // v10 丹道六境·丹火境
    const cap = 60 + p.attrs.body * 8 + (p.realmIdx >= 5 ? 20 : 0);
    if (p.poison + poisonGain > cap) {
      const lost = Math.round(p.exp * 0.1);
      p.exp = Math.max(0, p.exp - lost);
      p.poison = Math.round(cap * 0.5);
      if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 6, '丹毒反噬');
      Log.add(`你服下 <b>${def.name}</b>（${effectText.join('，')}），然而丹毒冲破上限，药力反噬，根基受损！`, 'warn');
      Log.add(`气血翻涌，当前层修为 -${Utils.fmtNum(lost)}。切记丹毒将满时莫要强行服丹！`, 'loss');
    } else {
      p.poison += poisonGain;
      Log.add(`你服下 <b>${def.name}</b>（${effectText.join('，')}${def.poison ? `，丹毒 +${poisonGain.toFixed(0)}` : ''}）。`, 'gain');
    }
    if (!inBattle) Time.add(1);
  },
};
