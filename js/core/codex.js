
/* ======================================================================
 * §1.13 增量扩展（v6）：图鉴 Codex（功法 / 法宝 / 妖兽 / 奇人 / 秘境）
 * 数据存于 Meta（随档、转世不重置）；条目介绍沿用 def.desc 或 CODEX_INTRO。
 * ====================================================================== */
const Codex = {
  nameOf(cat, id) {
    if (cat === 'monster') return (GameData.MONSTERS[id] || {}).name || null;
    if (cat === 'npc') return (NpcSys.def(id) || {}).name || null;
    if (cat === 'realm') return (GameData.SECRET_REALMS.find(r => r.id === id) || {}).name || null;
    const d = GameData.ITEMS[id];
    return d ? d.name : null;
  },
  introOf(cat, id) {
    if (cat === 'monster') return GameData.CODEX_INTRO[id] || '此妖兽的来历，尚待仙人补录。';
    if (cat === 'npc') {
      const d = NpcSys.def(id);
      return d ? `${d.title} · 性情${d.temper}。${d.desc}` : '';
    }
    if (cat === 'realm') return (GameData.SECRET_REALMS.find(r => r.id === id) || {}).desc || '';
    return (GameData.ITEMS[id] || {}).desc || '';
  },
  /** 各类图鉴的目录（id 列表）与总数 */
  catalog(cat) {
    if (cat === 'monster') return Object.keys(GameData.MONSTERS);
    if (cat === 'npc') return GameData.NPCS.map(n => n.id);
    if (cat === 'realm') return GameData.SECRET_REALMS.map(r => r.id);
    return Object.keys(GameData.ITEMS).filter(id => GameData.ITEMS[id].type === cat);
  },
  total() {
    return this.catalog('gongfa').length + this.catalog('artifact').length
      + this.catalog('monster').length + this.catalog('npc').length + this.catalog('realm').length;
  },
  got() {
    const c = Meta.data.codex;
    return Object.keys(c.gongfa).length + Object.keys(c.artifact).length
      + Object.keys(c.monster).length + Object.keys(c.npc).length + Object.keys(c.realm).length;
  },
};

/* ======================================================================
 * v24 图鉴收集闭环：五类图鉴每类收满 → 全属性永久 +1%（一次性，flags 记档）
 * Achieve.check 之后由 Game.afterAction 调用，Meta 随档不重置，flags 自愈无需迁移。
 * ====================================================================== */
Codex.CAT_NAMES = { gongfa: '功法', artifact: '法宝', monster: '妖兽', npc: '奇人', realm: '秘境' };
Codex.catGot = function (cat) { return Object.keys(Meta.data.codex[cat] || {}).length; };
Codex.checkRewards = function () {
  const p = Game.player;
  if (!p || p.dead) return;
  p.flags = p.flags || {};
  let hit = '';
  for (const cat of Object.keys(this.CAT_NAMES)) {
    const total = this.catalog(cat).length;
    if (!total || this.catGot(cat) < total || p.flags['codex_' + cat]) continue;
    p.flags['codex_' + cat] = true;
    p.codexBonus = (p.codexBonus || 0) + 1;
    hit = this.CAT_NAMES[cat];
    UI.announce(`✦ 图鉴大成 · ${hit} ✦`, 'gold');
    Log.add(`✦ <b>${hit}图鉴</b>业已收录齐全——见多识广，道行精进（全属性永久 +1%，已累计 ${p.codexBonus} 类）。`, 'system');
  }
  if (hit) { Save.autoSave(); UI.renderAll(); }
};
