
/* ======================================================================
 * §11.5 v13 炼器坊 ForgeSys（装备强化 / 材料炼器 / 套装）
 * 强化：对已穿戴装备祭炼 +1~+10，全游戏同 id 装备共享强化心得；
 *       每级 +10% 数值属性（atk/def/hp/mp/spd），成功率逐级递减，
 *       +7 起失败降一级（护器符可保、强化石必成）。
 * 炼器：FORGE_RECIPES 材料锻造，天级神兵与套装件的唯一产出途径。
 * ====================================================================== */
const ForgeSys = {
  MAX_LV: 10,
  /** 强化某 id 的当前等级 */
  lvOf(p, id) {
    // v19 修复：id 可为字符串或装备实例（v18 实例化后 equipBonus 传入实例对象）
    if (id && typeof id === 'object') {
      const v = Math.floor(Number(id.enhance)) || 0;
      return v > 0 ? v : ((p.enhanced || {})[id.id] || 0);
    }
    // v18：先检查装备槽位（新格式 {id, enhance}），再检查 p.enhanced（旧格式）
    if (p && p.equipped) {
      for (const slot of ['weapon', 'armor', 'accessory']) {
        const eq = p.equipped[slot];
        if (eq && typeof eq === 'object' && eq.id === id && eq.enhance) return eq.enhance;
      }
    }
    return (p.enhanced || {})[id] || 0;
  },
  /** 强化成功率（%）：1~3 必成，之后逐级递减 */
  rate(lv) {
    if (lv <= 3) return 100;
    return { 3: 90, 4: 82, 5: 72, 6: 60, 7: 50, 8: 40, 9: 30, 10: 22 }[lv] || 50;
  },
  /** 强化费用：灵石随境界与等级递增，玄铁矿 = 等级+1 */
  stonesCost(p, itemId, lv) {
    const def = GameData.ITEMS[itemId];
    return Math.round((120 + lv * 90) * (1 + (def.grade || 0) * 0.8) * Math.pow(2.4, p.realmIdx));
  },
  /** 执行强化 */
  async enhance(slot) {
    const p = Game.player;
    const itemId = p.equipped[slot] ? Utils.eqId(p.equipped[slot]) : null;
    if (!itemId) { UI.toast('该槽位尚未装备法宝'); return; }
    const def = GameData.ITEMS[itemId];
    const lv = this.lvOf(p, itemId);
    if (lv >= this.MAX_LV) { UI.toast('此宝已至强化极境（+10）'); return; }
    const stones = this.stonesCost(p, itemId, lv);
    const oreNeed = lv + 1;
    const hasOre = Bag.count('m_xuantie') >= oreNeed;
    const hasGuard = Bag.count('m_qianghua') > 0;
    const rate = this.rate(lv);
    const ok = await UI.popup({
      title: `祭炼强化 · ${def.name} +${lv} → +${lv + 1}`,
      html: `以灵火温养法宝，可再提升一层。<br>
        · 成功率 <b class="hl">${rate}%</b>（+10% 数值属性）<br>
        · 需灵石 <span class="hl">${Utils.fmtNum(stones)}</span>、玄铁矿 ×${oreNeed}（持有 ${Bag.count('m_xuantie')}）<br>
        ${lv >= 7 ? `<span class="neg">· +7 起失败将跌落一级！</span>` : ''}
        ${hasGuard ? `<label class="opt-line"><input type="checkbox" id="enh-guard" checked> 消耗【强化石】×1——本次必定成功</label>` : ''}
        ${hasOre ? '' : '<span class="neg">玄铁矿不足，无法祭炼。</span>'}`,
      options: hasOre
        ? [{ text: '祭 炼', value: true, primary: true }, { text: '再想想', value: false }]
        : [{ text: '知道 了', value: false }],
    });
    if (!ok || !hasOre) return;
    const useGuard = hasGuard && document.getElementById('enh-guard') && document.getElementById('enh-guard').checked;
    if (!Bag.spendStones(stones)) { UI.toast('灵石不足'); return; }
    Bag.removeItem('m_xuantie', oreNeed);
    let success;
    if (useGuard) {
      Bag.removeItem('m_qianghua', 1);
      success = true;
    } else {
      success = Utils.chance(rate);
    }
    if (success) {
      p.enhanced = p.enhanced || {};
      p.enhanced[itemId] = lv + 1;
      Ambience.sfx('forge');
      Log.add(`炉火纯青——<b class="grade-${def.grade}">${def.name}</b> 祭炼功成，升至 <b>+${lv + 1}</b>！法宝灵光更胜往昔。`, 'gain');
      if (lv + 1 >= 7) UI.announce(`✦ ${def.name} +${lv + 1}`, 'gold');
    } else if (lv >= 7) {
      p.enhanced = p.enhanced || {};
      p.enhanced[itemId] = lv - 1;
      Log.add(`炉火骤然失控！<b class="grade-${def.grade}">${def.name}</b> 祭炼失利，灵纹黯淡——强化跌至 <b>+${lv - 1}</b>。`, 'loss');
      UI.toast('祭炼失败，强化跌落一级', true);
    } else {
      Log.add(`此番祭炼火候未至，<b class="grade-${def.grade}">${def.name}</b> 未能精进（强化仍为 +${lv}）。`, 'warn');
      UI.toast('祭炼未成，等级保留');
    }
    Game.afterAction();
  },
  /** 执行炼器 */
  forge(recipeId) {
    const p = Game.player;
    const r = GameData.FORGE_RECIPES.find(x => x.id === recipeId);
    if (!r) return;
    const okMats = Object.entries(r.need).every(([id, n]) => Bag.count(id) >= n);
    if (!okMats) { UI.toast('材料不足'); return; }
    for (const [id, n] of Object.entries(r.need)) Bag.removeItem(id, n);
    p.counters.forges = (p.counters.forges || 0) + 1;
    Time.add(5);
    if (p.dead) return;
    const out = GameData.ITEMS[r.out];
    if (Utils.chance(r.rate)) {
      Bag.addItem(r.out, 1);
      Ambience.sfx('forge');
      Log.add(`锤起锤落，火星四溅——<b class="grade-${out.grade}">${out.name}</b> 铸成出世！`, 'gain');
      if ((out.grade || 0) >= 4 || out.set) UI.announce(`✦ 炼器大成 · ${out.name}`, 'gold');
    } else {
      Log.add(`炉温骤变，器坯炸裂——材料尽毁，未得 ${out.name}。（成器率 ${r.rate}%）`, 'loss');
      UI.toast('炼器失败，材料尽毁', true);
    }
    Game.afterAction();
  },
  /** 已穿戴装备触发的套装加成（Stat.compute 调用） */
  /* ---------- v19 词缀系统（v18 数据首次实装：实例词缀 + 洗练 + 战斗特效） ---------- */
  /** 为装备掷词缀（前缀/后缀各至多一条，品阶越高概率越高） */
  rollAffixes(def) {
    const out = {};
    if (!def || !def.bonus) return out;
    const pool = GameData.BALANCE.AFFIXES;
    const grade = def.grade || 0;
    if (Utils.chance(Utils.clamp(40 + grade * 10, 0, 85))) {
      const cands = pool.prefix.filter(a => a.slot === 'any' || a.slot === def.slot);
      if (cands.length) out.prefix = Utils.pick(cands).id;
    }
    if (Utils.chance(Utils.clamp(25 + grade * 10, 0, 70))) {
      const cands = pool.suffix.filter(a => a.slot === 'any' || a.slot === def.slot);
      if (cands.length) out.suffix = Utils.pick(cands).id;
    }
    return out;
  },
  affixDef(part, id) { return ((GameData.BALANCE.AFFIXES || {})[part] || []).find(a => a.id === id) || null; },
  /** 装备实例的词缀（旧档首次读取时补掷并写回，即首次装备后落定） */
  affixesOf(p, inst) {
    if (!inst || typeof inst === 'string') return {};
    const id = Utils.eqId(inst);
    const def = GameData.ITEMS[id];
    if (!def) return {};
    if (!inst.affixes) inst.affixes = this.rollAffixes(def);
    return inst.affixes;
  },
  /** 词缀显示（◆前缀 ◈后缀） */
  affixText(inst) {
    const A = (inst && inst.affixes) || {};
    const parts = [];
    const pre = A.prefix && this.affixDef('prefix', A.prefix);
    const suf = A.suffix && this.affixDef('suffix', A.suffix);
    if (pre) parts.push(`<span class="affix-p" title="${Utils.esc(pre.desc)}">◆${pre.name}</span>`);
    if (suf) parts.push(`<span class="affix-s" title="${Utils.esc(suf.desc)}">◈${suf.name}</span>`);
    return parts.join(' ');
  },
  /** 词缀前缀加成（equipBonus 并入） */
  affixBonus(p) {
    const total = {};
    if (!p || !p.equipped) return total;
    for (const inst of Object.values(p.equipped)) {
      const A = this.affixesOf(p, inst);
      if (!A.prefix) continue;
      const d = this.affixDef('prefix', A.prefix);
      if (d && d.bonus) for (const [k, v] of Object.entries(d.bonus)) total[k] = (total[k] || 0) + v;
    }
    return total;
  },
  /** 词缀后缀战斗特效聚合（Battle 消费） */
  suffixFx(p) {
    const fx = { leech: 0, execute: 0, comboUp: 0, thorns: 0, shield: 0, mpRegen: 0 };
    if (!p || !p.equipped) return fx;
    for (const inst of Object.values(p.equipped)) {
      const A = (inst && inst.affixes) || {};
      if (!A.suffix) continue;
      const d = this.affixDef('suffix', A.suffix);
      if (!d) continue;
      const o = d.onHit || d.onHurt || d.onStart || d.onTurn || {};
      for (const [k, v] of Object.entries(o)) if (k in fx) fx[k] += v;
    }
    return fx;
  },
  /** v19 洗练：消耗灵石与玄铁矿，重掷指定槽位的词缀（前缀/后缀择一） */
  async reroll(slot) {
    const p = Game.player;
    const inst = p.equipped[slot];
    const id = Utils.eqId(inst);
    if (!inst || typeof inst === 'string' || !id) { UI.toast('该槽位未穿戴法宝'); return; }
    const def = GameData.ITEMS[id];
    const cost = Math.round(300 * Math.pow(2.2, p.realmIdx));
    const needOre = 2;
    const part = await UI.popup({
      title: `词缀洗练 · ${def.name}`,
      html: `当前词缀：${this.affixText(inst) || '<span style="color:var(--text-faint)">无</span>'}<br>
        洗练将重掷词缀（前缀/后缀择其一），结果随机，不问因果。<br>
        需灵石 <span class="hl">${Utils.fmtNum(cost)}</span> 与【玄铁矿】×${needOre}。`,
      options: [
        { text: '洗练前缀 ◆', value: 'prefix', primary: true },
        { text: '洗练后缀 ◈', value: 'suffix' },
        { text: '作罢', value: null },
      ],
    });
    if (!part) return;
    if (Bag.count('m_xuantie') < needOre) { UI.toast('玄铁矿不足'); return; }
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    Bag.removeItem('m_xuantie', needOre);
    const pool = GameData.BALANCE.AFFIXES[part].filter(a => a.slot === 'any' || a.slot === def.slot);
    if (!pool.length) { UI.toast('此槽位无可用词缀'); Game.afterAction(); return; }
    inst.affixes = inst.affixes || {};
    inst.affixes[part] = Utils.pick(pool).id;
    const d = this.affixDef(part, inst.affixes[part]);
    Log.add(`你以玄铁重淬【${def.name}】——${part === 'prefix' ? '前缀' : '后缀'}词缀化为【<b>${d.name}</b>】：${d.desc}`, part === 'prefix' ? 'gain' : 'system');
    Ambience.sfx('forge');
    Game.afterAction();
  },
  /* ---------- v19 本命法宝喂养：吞灵材升阶，每阶全属性 +1%（上限十阶） ---------- */
  BENMING_MAX: 10,
  benmingOwn(p) {
    if (p.benming && p.benming.lv > 0) return true;
    for (const inst of Object.values(p.equipped || {})) {
      if (Utils.eqId(inst) === 'z_benming') return true;
    }
    return !!p.bag['z_benming'];
  },
  async feedBenming() {
    const p = Game.player;
    if (!p.benming) p.benming = { lv: 0 };
    if (p.benming.lv >= this.BENMING_MAX) { UI.toast('本命法宝已达十阶圆满'); return; }
    const lv = p.benming.lv;
    const cost = Math.round(3000 * (lv + 1) * Math.pow(2.2, Math.min(6, p.realmIdx)));
    const ore = 5 + lv * 2;
    const ok = await UI.popup({
      title: `本命法宝喂养 · 第${lv + 1}阶`,
      html: `以本命精血温养法宝，吞灵材而长。每阶全属性 +1%（当前 ${lv} 阶）。<br>需灵石 <span class="hl">${Utils.fmtNum(cost)}</span> 与【玄铁矿】×${ore}。`,
      options: [{ text: '喂养', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (Bag.count('m_xuantie') < ore) { UI.toast('玄铁矿不足'); return; }
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    Bag.removeItem('m_xuantie', ore);
    p.benming.lv++;
    Log.add(`本命法宝嗡鸣长吟，吞灵而长——升至 <b>第${p.benming.lv}阶</b>！道韵滋养，全属性 +1%。`, 'realm');
    Ambience.sfx('forge');
    Game.afterAction();
  },
  setBonus(p) {
    const total = {};
    if (!p.equipped) return total;
    const worn = Object.values(p.equipped).filter(Boolean).map(e => (typeof e === 'string' ? e : e.id));
    for (const [sid, sdef] of Object.entries(GameData.SETS || {})) {
      const n = sdef.pieces.filter(id => worn.includes(id)).length;
      if (n >= sdef.pieces.length) {
        for (const [k, v] of Object.entries(sdef.bonus)) total[k] = (total[k] || 0) + v;
      }
    }
    return total;
  },
  /** 已穿戴的套装名（UI 显示） */
  activeSets(p) {
    if (!p.equipped) return [];
    const worn = Object.values(p.equipped).filter(Boolean).map(e => (typeof e === 'string' ? e : e.id));
    return Object.entries(GameData.SETS || {})
      .filter(([, sdef]) => sdef.pieces.every(id => worn.includes(id)))
      .map(([sid, sdef]) => sdef);
  },
  /** 强化等级显示后缀 */
  enhText(p, id) { const lv = this.lvOf(p, id); return lv > 0 ? ` <span class="enh-lv">+${lv}</span>` : ''; },
};
