
/* ======================================================================
 * §1.9 增量扩展（v6）：跨世存档层 Meta
 * 成就与图鉴按存档位存放（meta_<slot>），跟随存档、兵解转世不重置；
 * 存档导出文本码时随行携带（ext 字段），导入时一并还原。
 * ====================================================================== */
const Meta = {
  data: { achv: {}, codex: { gongfa: {}, artifact: {}, monster: {}, npc: {}, realm: {} } },
  key(slot) { return 'meta_' + (slot != null ? slot : (Game.slot == null ? 'auto' : Game.slot)); },
  /** 进入游戏（新档/读档/换档）时装载当前存档位的成就与图鉴 */
  load() {
    const d = Save.read(this.key());
    this.data = {
      achv: (d && d.achv) || {},
      codex: Object.assign({ gongfa: {}, artifact: {}, monster: {}, npc: {}, realm: {} }, (d && d.codex) || {}),
    };
  },
  save() {
    const raw = JSON.stringify(this.data);
    try { if (Save.storage.setItem) Save.storage.setItem(Save.KEY + this.key(), raw); else Save.mem[Save.KEY + this.key()] = raw; } catch (e) { /* ignore */ }
  },
  /** 图鉴收录：首次遇见某条目时登记并提示 */
  see(cat, id) {
    if (!id || !this.data.codex[cat] || this.data.codex[cat][id]) return;
    this.data.codex[cat][id] = 1;
    this.save();
    const name = Codex.nameOf(cat, id);
    if (name) UI.toast(`✦ 图鉴收录：${name}`);
  },
  /** 导入外部文本码时还原某存档位的成就图鉴 */
  importTo(slot, ext) {
    if (!ext || typeof ext !== 'object') return;
    const raw = JSON.stringify({ achv: ext.achv || {}, codex: Object.assign({ gongfa: {}, artifact: {}, monster: {}, npc: {}, realm: {} }, ext.codex || {}) });
    try { if (Save.storage.setItem) Save.storage.setItem(Save.KEY + this.key(slot), raw); else Save.mem[Save.KEY + this.key(slot)] = raw; } catch (e) { /* ignore */ }
    if (slot == null || slot === Game.slot) this.load();
  },
};
