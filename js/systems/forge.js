
/* ======================================================================
 * §11.5 v13 炼器坊 ForgeSys（装备强化 / 材料炼器 / 套装）
 * 强化：对已穿戴装备祭炼 +1~+10，全游戏同 id 装备共享强化心得；
 *       每级 +10% 数值属性（atk/def/hp/mp/spd），成功率逐级递减，
 *       +7 起失败降一级（护器符可保、强化石必成）。
 * 炼器：FORGE_RECIPES 材料锻造，天级神兵与套装件的唯一产出途径。
 * ====================================================================== */
const ForgeSys = {
  MAX_LV: (GameData.BALANCE.ENHANCE || {}).MAX_LV || 15,   // v32 修瑕（E24）：强化上限接线集中配置（原与 BALANCE.ENHANCE 双源硬编码）
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
  /** 强化成功率（%）：1~2 必成，+3→+4 起 90% 逐级递减（v30 扩至 +15）
   *  v27 修瑕：原 lv<=3 恒 100 使表中 3:90 成为死档（+3→+4 白送必成） */
  rate(lv) {
    if (lv < 3) return 100;
    return { 3: 90, 4: 82, 5: 72, 6: 60, 7: 50, 8: 40, 9: 30, 10: 22, 11: 18, 12: 14, 13: 11, 14: 8 }[lv] || 50;
  },
  /** v30 祝福值：+8 起失败 +20，满百下次必成——替代「强化石必成」的钞能力抹平风险设计 */
  blessOf(p, itemId) { return (p.enhBless || {})[itemId] || 0; },
  addBless(p, itemId, n) {
    p.enhBless = p.enhBless || {};
    p.enhBless[itemId] = Utils.clamp((p.enhBless[itemId] || 0) + n, 0, 100);
    return p.enhBless[itemId];
  },
  /** 强化费用：灵石随境界与等级递增，玄铁矿 = 等级+1（v32 修瑕 E24：费率接线 BALANCE.ENHANCE 集中配置） */
  stonesCost(p, itemId, lv) {
    const def = GameData.ITEMS[itemId];
    const E = GameData.BALANCE.ENHANCE;
    return Math.round((E.BASE_COST + lv * E.COST_PER_LV) * (1 + (def.grade || 0) * E.COST_GRADE_FACTOR) * GameData.sinkCurve(p.realmIdx) / E.COST_REALM_FACTOR);   // v30：消费端曲线族统一（r9 相对收入提升约 13 倍）
  },
  /** 执行强化 */
  async enhance(slot) {
    const p = Game.player;
    const itemId = p.equipped[slot] ? Utils.eqId(p.equipped[slot]) : null;
    if (!itemId) { UI.toast('该槽位尚未装备法宝'); return; }
    const def = GameData.ITEMS[itemId];
    const lv = this.lvOf(p, itemId);
    if (lv >= this.MAX_LV) { UI.toast('此宝已至强化极境（+15）'); return; }
    const stones = this.stonesCost(p, itemId, lv);
    const oreNeed = lv + 1;
    const hasOre = Bag.count('m_xuantie') >= oreNeed;
    const hasGuard = Bag.count('m_qianghua') > 0;
    const rate = this.rate(lv);
    const bless = this.blessOf(p, itemId);
    const autoSuccess = bless >= 100;
    const ok = await UI.popup({
      title: `祭炼强化 · ${def.name} +${lv} → +${lv + 1}`,
      html: `以灵火温养法宝，可再提升一层。<br>
        · 成功率 <b class="hl">${rate}%</b>（平铺+10%/级 · 百分比+2%/级 · 功能+1%/级）<br>
        · 需灵石 <span class="hl">${Utils.fmtNum(stones)}</span>、玄铁矿 ×${oreNeed}（持有 ${Bag.count('m_xuantie')}）<br>
        ${lv >= 7 ? `<span class="neg">· +7 起失败将跌落一级！</span>` : ''}
        ${lv >= 8 ? `<div class="tip-line">· 祝福值 <b class="hl">${bless}/100</b>——失败 +20，满百下次必定成功${autoSuccess ? '（<b>本次必成！</b>）' : ''}</div>` : ''}
        ${hasGuard ? `<label class="opt-line"><input type="checkbox" id="enh-guard" checked> 消耗【强化石】×1——成功率 +40%</label>` : ''}
        ${hasOre ? '' : '<span class="neg">玄铁矿不足，无法祭炼。</span>'}`,
      options: hasOre
        ? [{ text: '祭 炼', value: true, primary: true }, { text: '再想想', value: false }]
        : [{ text: '知道 了', value: false }],
    });
    if (!ok || !hasOre) return;
    const useGuard = hasGuard && document.getElementById('enh-guard') && document.getElementById('enh-guard').checked;
    if (!Bag.spendStones(stones)) { UI.toast('灵石不足'); return; }
    Bag.removeItem('m_xuantie', oreNeed);
    p.counters.enhances = (p.counters.enhances || 0) + 1;   // v30 修瑕：确认并付费后才计数（原弹窗前自增，取消也计）
    let success;
    if (autoSuccess) {
      success = true;
      if (p.enhBless) delete p.enhBless[itemId];
    } else if (useGuard) {
      Bag.removeItem('m_qianghua', 1);
      this.addBless(p, itemId, 40);   // v30：强化石改充盈祝福（原必成）
      success = Utils.chance(Math.min(100, rate + 40));
    } else {
      success = Utils.chance(rate);
    }
    if (success) {
      // v26 修瑕：强化直接写已穿戴装备实例（lvOf/Stat 均以实例为准）——
      // 此前只写 p.enhanced 共享档，实例已有强化时属性永不提升、灵石白花
      const eq = p.equipped[slot];
      if (eq && typeof eq === 'object') eq.enhance = Math.min(this.MAX_LV, lv + 1);
      else { p.enhanced = p.enhanced || {}; p.enhanced[itemId] = lv + 1; }
      if (p.enhBless) delete p.enhBless[itemId];   // v30：祭炼功成，祝福值清零
      Ambience.sfx('forge');
      Log.add(`炉火纯青——<b class="grade-${def.grade}">${def.name}</b> 祭炼功成，升至 <b>+${lv + 1}</b>！法宝灵光更胜往昔。`, 'gain');
      if (lv + 1 >= 7) UI.announce(`✦ ${def.name} +${lv + 1}`, 'gold');
    } else if (lv >= 7) {
      const eq2 = p.equipped[slot];
      if (eq2 && typeof eq2 === 'object') eq2.enhance = Math.max(0, lv - 1);
      else { p.enhanced = p.enhanced || {}; p.enhanced[itemId] = lv - 1; }
      let blessNote = '';
      if (lv >= 8) { const b = this.addBless(p, itemId, 20); blessNote = `（祝福值 ${b}/100${b >= 100 ? '——下次必定成功！' : ''}）`; }
      Log.add(`炉火骤然失控！<b class="grade-${def.grade}">${def.name}</b> 祭炼失利，灵纹黯淡——强化跌至 <b>+${lv - 1}</b>${blessNote}。`, 'loss');
      UI.toast('祭炼失败，强化跌落一级', true);
    } else {
      Log.add(`此番祭炼火候未至，<b class="grade-${def.grade}">${def.name}</b> 未能精进（强化仍为 +${lv}）。`, 'warn');
      UI.toast('祭炼未成，等级保留');
    }
    Game.afterAction();
  },
  /** v31（D7）：连祭炼——自动强化至多 N 轮（+8 起自动掺强化石；+7 起失败即停、材料不足自动停）。
   *  复用 enhance 的判定内核口径（rate+强化石+祝福值），只去掉逐轮弹窗。 */
  async enhanceMulti(slot, times = 5) {
    const p = Game.player;
    let done = 0;
    for (let i = 0; i < times; i++) {
      const itemId = p.equipped[slot] ? Utils.eqId(p.equipped[slot]) : null;
      if (!itemId) { UI.toast('该槽位尚未装备法宝'); return; }
      const def = GameData.ITEMS[itemId];
      const lv = this.lvOf(p, itemId);
      if (lv >= this.MAX_LV) { UI.toast('此宝已至强化极境（+' + this.MAX_LV + '）'); return; }
      const stones = this.stonesCost(p, itemId, lv);
      const oreNeed = lv + 1;
      if (Bag.count('m_xuantie') < oreNeed) { UI.toast('玄铁矿不足——连祭炼中止'); return; }
      if (!Bag.spendStones(stones)) { UI.toast('灵石不足——连祭炼中止'); return; }
      Bag.removeItem('m_xuantie', oreNeed);
      const bless0 = this.blessOf(p, itemId);
      const useGuard = Bag.count('m_qianghua') > 0 && lv >= 8 && bless0 < 100;   // v32 修瑕（E18）：祝福满百轮原照扣强化石（必成轮白烧）
      if (useGuard) Bag.removeItem('m_qianghua', 1);
      const bless = this.blessOf(p, itemId);
      const autoSuccess = bless >= 100;
      let success;
      if (autoSuccess) {
        success = true;
        if (p.enhBless) delete p.enhBless[itemId];
      } else {
        const rate = Math.min(100, this.rate(lv) + (useGuard ? 40 : 0));
        if (useGuard) this.addBless(p, itemId, 40);   // v32 修瑕（E17）：与单祭炼同口径——强化石 +40 于尝试时入账
        success = Utils.chance(rate);
        if (!success && lv >= 8) this.addBless(p, itemId, 20);   // v32 修瑕（E17）：失败 +20 只此一处（原与石 +40 同回合双计、再叠失败分支 +20＝80，单祭炼仅 60）
      }
      done++;
      if (success) {
        const eq = p.equipped[slot];
        if (eq && typeof eq === 'object') eq.enhance = Math.min(this.MAX_LV, lv + 1);
        else { p.enhanced = p.enhanced || {}; p.enhanced[itemId] = lv + 1; }
        if (p.enhBless) delete p.enhBless[itemId];
        Log.add(`【连祭炼 ${done}】炉火纯青——<b class="grade-${def.grade}">${def.name}</b> 升至 <b>+${lv + 1}</b>！`, 'gain');
      } else if (lv >= 7) {
        const eq2 = p.equipped[slot];
        if (eq2 && typeof eq2 === 'object') eq2.enhance = Math.max(0, lv - 1);
        else { p.enhanced = p.enhanced || {}; p.enhanced[itemId] = lv - 1; }
        let blessNote = '';
        if (lv >= 8) { const b = this.addBless(p, itemId, 20); blessNote = `（祝福值 ${b}/100）`; }
        Log.add(`【连祭炼 ${done}】炉火骤然失控——强化跌至 <b>+${lv - 1}</b>${blessNote}，连祭炼中止。`, 'loss');
        UI.toast('祭炼失败，强化跌落一级', true);
        Game.afterAction();
        return;
      } else {
        Log.add(`【连祭炼 ${done}】火候未至，等级保留。`, 'warn');
      }
      await Utils.sleep(80);
    }
    Log.add(`连祭炼收炉——本轮共祭炼 ${done} 次。`, 'system');
    Game.afterAction();
  },
  /** v33（E74）：炼器工费——低阶成品「买料→炼器→卖坊市」曾是正期望循环（f1: 300 料 EV 607、
   *  f4: 700 料 EV 1890，5 日/炉收益仍数倍于同期探索，低境印钞）。工费按成品估值阶梯比例收取：
   *  grade≤2 收 25%、3~4 收 15%、5+/套装收 10%——低阶断套利，高阶添 sink。
   *  估值基价：成品价；套装件 price:0 时按品阶 Fallback（与古匣估值同族）。 */
  FEE_FALLBACK: [300, 800, 2000, 6000, 16000, 40000],
  feeOf(r) {
    const out = GameData.ITEMS[r.out];
    if (!out) return 0;
    const base = out.price || this.FEE_FALLBACK[Utils.clamp(out.grade || 0, 0, 5)] || 1000;
    const pct = (out.grade || 0) <= 2 ? 0.25 : (out.grade || 0) <= 4 ? 0.15 : 0.10;
    return Math.max(1, Math.round(base * pct));
  },
  /** 执行炼器（v31 D7：炸炉产器胚残片；持 6 片材料折半——大额炼器赌博补上保底）
   *  v32（E6）：残片入炉——耗 6 片不减材料：成器率 +10%，且成功品自带「保底一条后缀」旗标 */
  forge(recipeId, fragBoost = false) {
    const p = Game.player;
    const r = GameData.FORGE_RECIPES.find(x => x.id === recipeId);
    if (!r) return;
    if (fragBoost && Bag.count('m_qipei') < 6) { UI.toast('器胚残片不足（需 6 片入炉）'); return; }
    // v31（D7）：器胚残片折抵——集 6 片自动折半材料（残片入炉模式不减材料）
    const useFrag = !fragBoost && Bag.count('m_qipei') >= 6;
    const needEff = {};
    for (const [id, n] of Object.entries(r.need)) needEff[id] = useFrag ? Math.max(1, Math.ceil(n / 2)) : n;
    const okMats = Object.entries(needEff).every(([id, n]) => Bag.count(id) >= n);
    if (!okMats) { UI.toast('材料不足'); return; }
    const fee = this.feeOf(r);   // v33（E74）：工费先行（不足不开炉）
    if (!Bag.spendStones(fee)) { UI.toast(`开炉需工费 ${Utils.fmtNum(fee)} 灵石，灵石不足`); return; }
    for (const [id, n] of Object.entries(needEff)) Bag.removeItem(id, n);
    if (useFrag) { Bag.removeItem('m_qipei', 6); Log.add('六片器胚残片入炉垫底——材料折半。', 'info'); }
    if (fragBoost) { Bag.removeItem('m_qipei', 6); Log.add('六片器胚残片重入炉膛，火候再进一重——成器率 +10%，成器必带后缀。', 'info'); }
    p.counters.forges = (p.counters.forges || 0) + 1;
    Time.add(5);
    if (p.dead) return;
    // v20 炼器室：成器率 +4%/阶（上限 95%）；v32（E6）：残片入炉再 +10%
    const rate = Math.min(95, r.rate + ((p.cave && p.cave.builds && p.cave.builds.forge) || 0) * 4 + (fragBoost ? 10 : 0));
    const out = GameData.ITEMS[r.out];
    if (Utils.chance(rate)) {
      Bag.addItem(r.out, 1);
      if (fragBoost) p._embryoSuffixFor = r.out;   // v32（E6）：残片入炉成功品——首次落缀时保底一条后缀；v33（E76）：旗标挂物品 id（原挂玩家本体，可错付给后穿的无关装备）
      Ambience.sfx('forge');
      Log.add(`锤起锤落，火星四溅——<b class="grade-${out.grade}">${out.name}</b> 铸成出世！（工费 ${Utils.fmtNum(fee)} 灵石）${fragBoost ? '（器胚余韵未散——装备落缀时必带一条后缀）' : ''}`, 'gain');
      if ((out.grade || 0) >= 4 || out.set) UI.announce(`✦ 炼器大成 · ${out.name}`, 'gold');
    } else {
      const frag = Utils.rand(1, 2);
      Bag.addItem('m_qipei', frag);
      Log.add(`炉温骤变，器坯炸裂——材料尽毁，未得 ${out.name}。炉底拾得【器胚残片】×${frag}（集六片折半材料）。（成器率 ${rate}%）`, 'loss');
      UI.toast('炼器失败，材料尽毁', true);
    }
    Game.afterAction();
  },
  /** 已穿戴装备触发的套装加成（Stat.compute 调用） */
  /* ---------- v19 词缀系统（v18 数据首次实装：实例词缀 + 洗练 + 战斗特效） ---------- */
  /** 为装备掷词缀（前缀/后缀各至多一条，品阶越高概率越高）
   *  v32（E6）：opts.forceSuffix——器胚入炉成器保底一条后缀（残片入炉的成功品兑现） */
  rollAffixes(def, opts = {}) {
    const out = {};
    if (!def || !def.bonus) return out;
    const pool = GameData.BALANCE.AFFIXES;
    const grade = def.grade || 0;
    if (Utils.chance(Utils.clamp(40 + grade * 10, 0, 85))) {
      const cands = pool.prefix.filter(a => a.slot === 'any' || a.slot === def.slot);
      if (cands.length) out.prefix = this.pickAffix(cands, grade).id;
    }
    if (Utils.chance(Utils.clamp(25 + grade * 10, 0, 70)) || opts.forceSuffix) {
      const cands = pool.suffix.filter(a => a.slot === 'any' || a.slot === def.slot);
      if (cands.length && !out.suffix) out.suffix = this.pickAffix(cands, grade).id;
    }
    return out;
  },
  affixDef(part, id) { return ((GameData.BALANCE.AFFIXES || {})[part] || []).find(a => a.id === id) || null; },
  /** v31（D7）：词缀加权掷取——高端词缀权重低、有品阶门槛（原全池等权，煞威与磐石同权重） */
  pickAffix(cands, grade) {
    const usable = cands.filter(a => (a.minGrade || 0) <= (grade || 0));
    const pool = usable.length ? usable : cands;
    const wOf = a => a.w || 100;
    const total = pool.reduce((s2, a) => s2 + wOf(a), 0);
    let r = Math.random() * total;
    for (const a of pool) { r -= wOf(a); if (r <= 0) return a; }
    return pool[pool.length - 1];
  },
  /** 装备实例的词缀（旧档首次读取时补掷并写回，即首次装备后落定） */
  affixesOf(p, inst) {
    if (!inst || typeof inst === 'string') return {};
    const id = Utils.eqId(inst);
    const def = GameData.ITEMS[id];
    if (!def) return {};
    if (!inst.affixes) {
      // v32（E6）：器胚入炉保底——首次落缀时若带器胚旗标则必出一条后缀（随即消耗）
      // v33（E76）修瑕：旗标原挂玩家本体布尔（p._embryoSuffix），入炉成功品未及穿戴而先穿出
      // 另一件新装时会被错付。改挂物品 id（p._embryoSuffixFor），只对同 id 成器兑现；旧布尔档兼容读取。
      const guaranteed = !!(p && (p._embryoSuffixFor === id || (!p._embryoSuffixFor && p._embryoSuffix)));
      inst.affixes = this.rollAffixes(def, { forceSuffix: guaranteed });
      if (guaranteed && inst.affixes.suffix && p) {
        if (p._embryoSuffixFor === id) p._embryoSuffixFor = null;
        else p._embryoSuffix = false;
      }
    }
    return inst.affixes;
  },
  /** 词缀显示（◆前缀 ◈后缀）；v31：两段式词缀在 title 中标注本件实值（原 grade5 破军实为 +165 攻，玩家无从知晓）
   *  v32（E3）：词缀星（0~3）随显示露出，每星实值 +4% */
  affixText(inst) {
    const A = (inst && inst.affixes) || {};
    const ST = (inst && inst.stars) || {};
    const parts = [];
    const g = ((GameData.ITEMS[Utils.eqId(inst)] || {}).grade) || 0;
    const pre = A.prefix && this.affixDef('prefix', A.prefix);
    const suf = A.suffix && this.affixDef('suffix', A.suffix);
    const starTxt = n => n ? ` <span title="词缀星：实值 +${n * 4}%">${'★'.repeat(n)}</span>` : '';
    if (pre) {
      const tip = pre.per ? `${pre.desc} · 本件实值 ${this.affixActual(pre, g, ST.prefix || 0)}` : pre.desc;
      parts.push(`<span class="affix-p" title="${Utils.esc(tip)}">◆${pre.name}${starTxt(ST.prefix || 0)}</span>`);
    }
    if (suf) {
      const tip = suf.per ? `${suf.desc} · 本件实值 ${this.affixActual(suf, g, ST.suffix || 0)}` : suf.desc;
      parts.push(`<span class="affix-s" title="${Utils.esc(tip)}">◈${suf.name}${starTxt(ST.suffix || 0)}</span>`);
    }
    return parts.join(' ');
  },
  /** v31：两段式词缀在本件品阶下的实值文本（如「攻 +165」「吸血 17.5%」）；v32（E3）：计入词缀星加成 */
  affixActual(d, grade, star = 0) {
    const N = { atk: '攻', atkPct: '攻', def: '防', defPct: '防', hp: '血', hpPct: '血', mp: '灵力', mpPct: '灵力', spd: '身法', spdPct: '身法', crit: '暴击', dodge: '闪避', block: '格挡', cult: '修炼', luck: '福缘', stonePct: '灵石', leech: '吸血', execute: '斩杀', thorns: '反伤', shield: '护体', mpRegen: '回灵', comboUp: '连击' };
    const src = d.bonus || d.onHit || d.onHurt || d.onStart || d.onTurn || {};
    const per = d.per || {};
    const mul = 1 + (star || 0) * 0.04;
    return Object.entries(src).map(([k, v]) => {
      const val = (v + (per[k] || 0) * (grade || 0)) * mul;
      const pct = k.endsWith('Pct') || ['leech', 'execute', 'thorns', 'shield', 'mpRegen'].includes(k);
      return `${N[k] || k} ${pct ? '+' + (Math.round(val * 1000) / 10) + '%' : '+' + Math.round(val)}`;
    }).join('、');
  },
  /** 词缀前缀加成（equipBonus 并入） */
  affixBonus(p) {
    const total = {};
    if (!p || !p.equipped) return total;
    for (const inst of Object.values(p.equipped)) {
      const A = this.affixesOf(p, inst);
      if (!A.prefix) continue;
      const d = this.affixDef('prefix', A.prefix);
      if (d && d.bonus) {
        const g = ((GameData.ITEMS[Utils.eqId(inst)] || {}).grade) || 0;
        const per = d.per || {};
        const starMul = 1 + (((inst.stars || {}).prefix) || 0) * 0.04;   // v32（E3）：词缀星每星 +4%
        for (const [k, v] of Object.entries(d.bonus)) total[k] = (total[k] || 0) + (v + (per[k] || 0) * g) * starMul;   // v30：两段式随品阶缩放
      }
    }
    return total;
  },
  /** 词缀价值估分（洗练/重铸保底与对比用）
   *  v31 根修：后缀补 score 标量估值——原后缀无 bonus 恒 0 分，「保底不降」对后缀整体失效（可洗成严格降级）、
   *  器魂重铸的后缀半边永远不变；per×grade 两段式一并计入；ctx（玩家属性）用于把百分比词缀折算为期望
   *  平铺值再比较——高境下百分比与平铺孰优随面板变化，保底不再锁死低配词缀。 */
  affixScore(part, id, grade = 0, ctx = null, star = 0) {
    const d = this.affixDef(part, id);
    if (!d) return 0;
    const starMul = 1 + (star || 0) * 0.04;   // v32（E3）：词缀星计入估值
    if (d.score != null) return d.score * starMul;   // 后缀：数据侧标量估值
    if (!d.bonus) return 0;
    const W = { atk: 2, atkPct: 2, def: 1.5, defPct: 1.5, hp: 0.3, hpPct: 0.3, mp: 0.2, mpPct: 0.2, spd: 1, spdPct: 1, crit: 1, dodge: 1, block: 0.5, cult: 1, luck: 2, stonePct: 1 };
    const per = d.per || {};
    return Object.entries(d.bonus).reduce((acc, [k, v]) => {
      let val = v + (per[k] || 0) * (grade || 0);
      if (ctx) {
        if (k === 'atkPct') val = val * (ctx.atk || 0) / 100;
        else if (k === 'defPct') val = val * (ctx.def || 0) / 100;
        else if (k === 'hpPct') val = val * (ctx.maxHp || 0) / 100;
        else if (k === 'mpPct') val = val * (ctx.maxMp || 0) / 100;
        else if (k === 'spdPct') val = val * (ctx.speed || 0) / 100;
      }
      return acc + (W[k] ?? 1) * val;
    }, 0) * starMul;
  },
  /** 词缀后缀战斗特效聚合（Battle 消费）
   *  v30 修瑕：统一走 affixesOf（原直读 inst.affixes，依赖 Stat.compute 先行落缀的时序）
   *  v31：后缀 per 两段式随品阶成长（与 affixBonus 前缀同款） */
  suffixFx(p) {
    const fx = { leech: 0, execute: 0, comboUp: 0, thorns: 0, shield: 0, mpRegen: 0 };
    if (!p || !p.equipped) return fx;
    for (const inst of Object.values(p.equipped)) {
      const A = this.affixesOf(p, inst);
      if (!A.suffix) continue;
      const d = this.affixDef('suffix', A.suffix);
      if (!d) continue;
      const o = d.onHit || d.onHurt || d.onStart || d.onTurn || {};
      const g = ((GameData.ITEMS[Utils.eqId(inst)] || {}).grade) || 0;
      const per = d.per || {};
      const starMul = 1 + (((inst.stars || {}).suffix) || 0) * 0.04;   // v32（E3）：词缀星每星 +4%
      for (const [k, v] of Object.entries(o)) if (k in fx) fx[k] += (v + (per[k] || 0) * g) * starMul;
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
    const cost = Math.round(300 * GameData.sinkCurve(p.realmIdx) / 2.2);   // v30：曲线族统一
    const needOre = 2;
    const part = await UI.popup({
      title: `词缀洗练 · ${def.name}`,
      html: `当前词缀：${this.affixText(inst) || '<span style="color:var(--text-faint)">无</span>'}<br>
        洗练将重掷词缀（前缀/后缀择其一），结果随机，不问因果。<br>
        需灵石 <span class="hl">${Utils.fmtNum(cost)}</span> 与【玄铁矿】×${needOre}。`,
      options: [
        { text: '洗练前缀 ◆', value: 'prefix', primary: true },
        { text: '洗练后缀 ◈', value: 'suffix' },
        ...(inst.affixes && inst.affixes.prefix && inst.affixes.suffix ? [
          { text: '锁◈洗◆（双倍价）', value: 'lockP' },
          { text: '锁◆洗◈（双倍价）', value: 'lockS' },
        ] : []),
        { text: '作罢', value: null },
      ],
    });
    if (!part) return;
    const keepSide = part === 'lockP' ? 'suffix' : part === 'lockS' ? 'prefix' : null;
    if (keepSide) part = part === 'lockP' ? 'prefix' : 'suffix';
    const realCost = keepSide ? cost * 2 : cost;
    if (Bag.count('m_xuantie') < needOre) { UI.toast('玄铁矿不足'); return; }
    if (!Bag.spendStones(realCost)) { UI.toast('灵石不足'); return; }
    Bag.removeItem('m_xuantie', needOre);
    const pool = GameData.BALANCE.AFFIXES[part].filter(a => a.slot === 'any' || a.slot === def.slot);
    if (!pool.length) { UI.toast('此槽位无可用词缀'); Game.afterAction(); return; }
    inst.affixes = inst.affixes || {};
    inst.stars = inst.stars || {};
    const g = def.grade || 0;
    const ctx = Stat.compute(p);
    const oldId = inst.affixes[part];
    const oldScore = this.affixScore(part, oldId, g, ctx, inst.stars[part] || 0);
    const cand = this.pickAffix(pool, def.grade || 0);
    const candId = cand.id || cand;
    const sameId = candId === oldId;
    // v30：洗练保底不降——新词缀估值更低时保留原词缀（灵石玄铁照付，求变不亏底）；v31：纳入品阶与面板折算
    // v34（E116）：保底比较只对「换词缀」生效——oldScore 含星乘数，★≥1 时同 id 候补在 0 星口径下
    // 恒判低、恒走保底 return，v32 升星分支自此不可达（★1 以上永难升星，双倍锁洗等于白烧钱）。
    // 同 id 候补改为跳过保底、直进升星掷骰（未升则原词缀原星保留，稳赚不亏）。
    if (!sameId && oldScore > 0 && this.affixScore(part, candId, g, ctx, 0) < oldScore) {
      const d0 = this.affixDef(part, oldId);
      Log.add(`你以玄铁重淬【${def.name}】——新火候不如旧纹，【<b>${d0.name}</b>】${inst.stars[part] ? `（★${inst.stars[part]}）` : ''}保留不动。`, 'warn');
      Ambience.sfx('forge');
      Game.afterAction();
      return;
    }
    inst.affixes[part] = candId;
    // v32（E3）词缀升星：洗出同词缀时 15% 概率升一星（0~3 星，每星实值 +4%）——
    // 「保底不降」自此保星不保条：确定性付费升级找回了方差，保底仍在
    if (sameId) {
      if ((inst.stars[part] || 0) < 3 && Utils.chance(15)) {
        inst.stars[part] = (inst.stars[part] || 0) + 1;
        Log.add(`星辉一闪——【${def.name}】的【${(this.affixDef(part, oldId) || {}).name}】淬出第 ${inst.stars[part]} 星！（词缀实值 +4%/星）`, 'gain');
      }
    } else inst.stars[part] = 0;
    const d = this.affixDef(part, inst.affixes[part]);
    Log.add(`你以玄铁重淬【${def.name}】——${part === 'prefix' ? '前缀' : '后缀'}词缀化为【<b>${d.name}</b>】${inst.stars[part] ? `★${inst.stars[part]}` : ''}：${d.desc}${keepSide ? `（已锁${keepSide === 'prefix' ? '前缀' : '后缀'}）` : ''}${d.per ? `（本件实值：${this.affixActual(d, g, inst.stars[part] || 0)}）` : ''}`, part === 'prefix' ? 'gain' : 'system');
    Ambience.sfx('forge');
    Game.afterAction();
  },
  /** v30 器魂重铸：双缀同洗、保底不降——分解旧器所得「器魂」于此回炉
   *  v32（E1/E2）：阶梯价（同件连铸 8→14→20 枚，换装回落）+ 单侧淬洗（4 器魂锁一侧洗另一侧） */
  async recast(slot) {
    const p = Game.player;
    const inst = p.equipped[slot];
    const id = Utils.eqId(inst);
    if (!inst || typeof inst === 'string' || !id) { UI.toast('该槽位未穿戴法宝'); return; }
    const def = GameData.ITEMS[id];
    p._recastN = p._recastN || {};
    const ladder = [8, 14, 20][Math.min(2, p._recastN[id] || 0)];
    const costS = Math.round(150 * GameData.sinkCurve(p.realmIdx) / 2.2);   // v30：曲线族统一
    const mode = await UI.popup({
      title: `器魂重铸 · ${def.name}`,
      html: `以旧器之魂为引重铸词缀——每侧保底不降（新不如旧则保留旧纹）。<br>
        · 双缀同洗：器魂 ×${ladder}（同件连铸阶梯价 8→14→20，卸下重铸回落）＋灵石 ${Utils.fmtNum(costS)}<br>
        · 单侧淬洗：器魂 ×4（锁另一侧）＋灵石 ${Utils.fmtNum(Math.round(costS / 2))}<br>
        器魂 ${p.qihun || 0} 枚。`,
      options: [
        { text: '双缀同洗', value: 'both', primary: true },
        { text: '仅淬前缀（锁后缀）', value: 'prefix' },
        { text: '仅淬后缀（锁前缀）', value: 'suffix' },
        { text: '作罢', value: null },
      ],
    });
    if (!mode) return;
    const costQ = mode === 'both' ? ladder : 4;
    if ((p.qihun || 0) < costQ) { UI.toast('器魂不足——分解闲置法宝可得'); return; }
    if (!Bag.spendStones(mode === 'both' ? costS : Math.round(costS / 2))) { UI.toast('灵石不足'); return; }
    p.qihun -= costQ;
    if (mode === 'both') p._recastN[id] = (p._recastN[id] || 0) + 1;
    inst.affixes = inst.affixes || {};
    inst.stars = inst.stars || {};
    const oldA = { ...inst.affixes };
    const oldStars = { ...inst.stars };
    const g = def.grade || 0;
    const ctx = Stat.compute(p);
    const pool = GameData.BALANCE.AFFIXES;
    if (mode === 'both') inst.affixes = this.rollAffixes(def);   // 双侧重掷
    // v31 修瑕（E39）：重铸空手保底——低品双空概率曾近半，8 器魂花出去可能空手而归：前缀必出一条
    if (!inst.affixes.prefix) {
      const cands = pool.prefix.filter(a => a.slot === 'any' || a.slot === def.slot);
      if (cands.length) inst.affixes.prefix = this.pickAffix(cands, def.grade || 0).id;
    }
    // 保底：任一侧新不如旧则回滚该侧（在 6 次候补里择优，再不济保旧纹）；v31：后缀有估值后本函数对后缀真正生效
    const rollBetter = (part, oldId, oldStar) => {
      const oldScore = this.affixScore(part, oldId, g, ctx, oldStar || 0);
      let best = oldId, bestScore = oldScore;
      for (let i = 0; i < 6; i++) {
        const cands = pool[part].filter(a => a.slot === 'any' || a.slot === def.slot);
        const c = this.pickAffix(cands, g);
        const cScore = this.affixScore(part, c.id, g, ctx, 0);
        if (cScore > bestScore) { best = c.id; bestScore = cScore; }
      }
      return best;
    };
    const parts = mode === 'both' ? ['prefix', 'suffix'] : [mode];
    for (const part of parts) {
      const nu = rollBetter(part, oldA[part], oldStars[part]);
      if (nu !== oldA[part]) inst.stars[part] = 0;   // v32（E3）：词缀换血则星归零
      inst.affixes[part] = nu;
    }
    if (mode !== 'both') inst.affixes[mode === 'prefix' ? 'suffix' : 'prefix'] = oldA[mode === 'prefix' ? 'suffix' : 'prefix'];   // 锁侧原样保留
    const pre = inst.affixes.prefix && this.affixDef('prefix', inst.affixes.prefix);
    const suf = inst.affixes.suffix && this.affixDef('suffix', inst.affixes.suffix);
    Log.add(`旧器之魂入炉，【<b>${def.name}</b>】词缀重铸（${mode === 'both' ? '双缀同洗' : `仅淬${mode === 'prefix' ? '前缀' : '后缀'}，器魂 -4`}）：${pre ? `◆${pre.name}${inst.stars.prefix ? `★${inst.stars.prefix}` : ''}` : '无前缀'} / ${suf ? `◈${suf.name}${inst.stars.suffix ? `★${inst.stars.suffix}` : ''}` : '无后缀'}——保底不降，器魂 -${costQ}。`, 'gain');
    Ambience.sfx('forge');
    Game.afterAction();
  },
  /** v32（E4）套装炼化：成套后以玄铁与灵石升套阶（每阶套效 +2%，至三阶） */
  async refineSet(sid) {
    const p = Game.player;
    const sdef = (GameData.SETS || {})[sid];
    if (!sdef) return;
    p.setForge = p.setForge || {};
    const lv = p.setForge[sid] || 0;
    if (lv >= 3) { UI.toast('此套已炼化至三阶圆满'); return; }
    const worn = Object.values(p.equipped).filter(Boolean).map(e => (typeof e === 'string' ? e : e.id));
    const n = sdef.pieces.filter(x => worn.includes(x)).length;
    if (n < 2) { UI.toast('须先集齐该套至少两件'); return; }
    const ore = 10 * (lv + 1);
    const stones = Math.round(2000 * (lv + 1) * GameData.sinkCurve(p.realmIdx) / 2.2);
    const ok = await UI.popup({
      title: `套装炼化 · ${sdef.name}`,
      html: `以同源灵韵淬炼套装（${n}/${sdef.pieces.length} 件在身）——每阶套装效果 <b>+2%</b>（当前 ${lv} 阶）。<br>需灵石 <span class="hl">${Utils.fmtNum(stones)}</span> 与【玄铁矿】×${ore}。`,
      options: [{ text: '炼 化', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (Bag.count('m_xuantie') < ore) { UI.toast('玄铁矿不足'); return; }
    if (!Bag.spendStones(stones)) { UI.toast('灵石不足'); return; }
    Bag.removeItem('m_xuantie', ore);
    p.setForge[sid] = lv + 1;
    Log.add(`套装灵韵共震——【${sdef.name}】炼化至 <b>${lv + 1} 阶</b>！套装效果 +${(lv + 1) * 2}%。`, 'gain');
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
    const cost = Math.round(3000 * (lv + 1) * GameData.sinkCurve(p.realmIdx) / 2.2);   // v30：曲线族统一   // v29：封顶 6→8
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
    const donePieces = new Set();
    let twoPieceSets = 0;   // v32（E4）：2+2 跨套小共鸣计数
    for (const [sid, sdef] of Object.entries(GameData.SETS || {})) {
      const n = sdef.pieces.filter(id => worn.includes(id)).length;
      const forgeLv = ((p.setForge || {})[sid]) || 0;   // v32（E4）：套装炼化阶
      if (n >= sdef.pieces.length) {
        for (const [k, v] of Object.entries(sdef.bonus)) total[k] = (total[k] || 0) + Math.round(v * (1 + forgeLv * 0.02));
        sdef.pieces.forEach(id => donePieces.add(id));   // v30：成套件不重复吃共鸣
      } else if (n === 2) {
        // v30 套装阶梯：两件即有六成加成——集套装从「全有或全无」变渐进
        for (const [k, v] of Object.entries(sdef.bonus)) total[k] = (total[k] || 0) + Math.ceil(v * 0.6 * (1 + forgeLv * 0.02));
        twoPieceSets++;
      }
    }
    // v32（E4）：2+2 跨套混搭小共鸣——两套各凑两件，攻防 +3%
    if (twoPieceSets >= 2) { total.atkPct = (total.atkPct || 0) + 3; total.defPct = (total.defPct || 0) + 3; }
    // v30 仙器共鸣：grade5 法宝不成套也各有小词条（攻防血 +1%/件）
    for (const id of worn) {
      const d = GameData.ITEMS[id];
      if (d && (d.grade || 0) === 5 && !donePieces.has(id)) { total.atkPct = (total.atkPct || 0) + 1; total.defPct = (total.defPct || 0) + 1; total.hpPct = (total.hpPct || 0) + 1; }
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
  enhText(p, id, asNote = false) {
    const lv = this.lvOf(p, id);
    if (lv <= 0) return '';
    // v30 修瑕：背包副本显示的是「同 id 共享祭炼心得」而非该件自身强化——加注防误读
    return asNote ? ` <span class="enh-lv" title="同 id 装备的共享祭炼心得，装备后自动承袭">心得 +${lv}</span>` : ` <span class="enh-lv">+${lv}</span>`;
  },
};
