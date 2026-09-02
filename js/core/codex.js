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
window.Codex = Codex;