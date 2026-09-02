/* ======================================================================
 * §5 玩家模型
 * ====================================================================== */
const PlayerFactory = {
  rollAttrs() {
    const roll = () => Math.min(10, Utils.rand(2, 9) + (Utils.chance(18) ? Utils.rand(1, 2) : 0));
    return { gen: roll(), comp: roll(), luck: roll(), body: roll() };
  },
  rating(sum) {
    if (sum >= 32) return '天纵奇才，万中无一';
    if (sum >= 28) return '上佳之姿，可堪造就';
    if (sum >= 24) return '中上之资，勤能补拙';
    if (sum >= 20) return '中人之姿，道心为重';
    return '资质平平，唯勤唯恒';
  },
  create(name, attrs) {
    const p = {
      version: 1, name,
      attrs: { ...attrs },
      realmIdx: 0, layer: 0, exp: 0,
      hp: 0, mp: 0,
      stones: { low: 150, mid: 0, high: 0 },
      bag: { pill_juqi: 3, pill_liaoshang: 2, w_tiejian: 1, a_buyi: 1 },
      gongfa: { gf_tuna: { level: 1, exp: 0 } },
      equipped: { weapon: null, armor: null, accessory: null },
      poison: 0, insight: 0,
      dao: null, fortune: 0, karma: 0,
      rootDeep: false, rootWeak: false, statLossPct: 0,
      day: 0, age: 16,
      sect: null,
      counters: { battles: 0, wins: 0, explores: 0, killsElite: 0, defeats: 0, spars: 0, bossKills: 0,
        mapExplores: {}, dilemmas: 0, befriends: 0, crafts: 0, craftsOk: 0, pills: 0, learns: 0, gupianGot: 0, maxDepth: 0 },
      flags: { tutorialDone: false, ascended: false },
      dead: false,
      world: WorldSys.freshWorld(),
      npcs: NpcSys.freshNpcs(),
      dungeon: null,
      canReincarnate: false, reinc: null, origin: null,
      partner: null, sworn: [],
      pendingDao: false,
      signDay: null, signText: '', signDesc: '',
      breakStreak: 0,
      quest: { ch: 0, side: {} },
      enhanced: {},
      cave: null,
      beasts: { active: null, list: [], nextId: 1 },
      bounties: null,
      topTitle: null,
      story: { seen: {}, mid: {}, choices: {} },
      daoExp: {},
    };
    const st = Stat.compute(p);
    p.hp = st.maxHp; p.mp = st.maxMp;
    return p;
  },
  migrate(p) {
    const fresh = this.create(p.name || '无名散修', p.attrs || { gen: 5, comp: 5, luck: 5, body: 5 });
    const out = { ...fresh, ...p };
    out.attrs = { ...fresh.attrs, ...(p.attrs || {}) };
    for (const k of Object.keys(out.attrs)) {
      const v = Math.round(Number(out.attrs[k]));
      out.attrs[k] = isFinite(v) ? Utils.clamp(v, 0, 10) : fresh.attrs[k];
    }
    out.stones = { ...fresh.stones, ...(p.stones || {}) };
    for (const k of Object.keys(out.stones)) {
      const v = Math.floor(Number(out.stones[k]));
      out.stones[k] = isFinite(v) && v > 0 ? Math.min(v, 1e12) : 0;
    }
    const bag = {};
    const srcBag = (p.bag && typeof p.bag === 'object') ? p.bag : {};
    for (const [id, n] of Object.entries(srcBag)) {
      const def = GameData.ITEMS[id];
      const qty = Math.floor(Number(n));
      if (def && isFinite(qty) && qty > 0) bag[id] = Math.min(qty, 9999);
    }
    out.bag = bag;
    const gf = {};
    const srcGf = (p.gongfa && typeof p.gongfa === 'object') ? p.gongfa : {};
    for (const [id, g] of Object.entries(srcGf)) {
      const def = GameData.ITEMS[id];
      if (!def || def.type !== 'gongfa') continue;
      const lvl = Math.floor(Number(g && g.level));
      const exp = Math.floor(Number(g && g.exp));
      gf[id] = {
        level: isFinite(lvl) ? Utils.clamp(lvl, 1, GongfaSys.maxLevel(def)) : 1,
        exp: isFinite(exp) && exp > 0 ? exp : 0,
      };
    }
    out.gongfa = gf;
    out.equipped = { ...fresh.equipped, ...(p.equipped || {}) };
    for (const slot of Object.keys(out.equipped)) {
      const def = out.equipped[slot] ? GameData.ITEMS[out.equipped[slot]] : null;
      if (!def || def.type !== 'artifact' || def.slot !== slot) out.equipped[slot] = null;
    }
    out.counters = { ...fresh.counters, ...(p.counters || {}) };
    out.flags = { ...fresh.flags, ...(p.flags || {}) };
    out.world = Object.assign(WorldSys.freshWorld(), p.world || {});
    out.world.magicMaps = Array.isArray(out.world.magicMaps) ? out.world.magicMaps : [];
    out.world.history = Array.isArray(out.world.history) ? out.world.history : [];
    out.npcs = Object.assign(NpcSys.freshNpcs(), p.npcs || {});
    out.dungeon = p.dungeon || null;
    out.canReincarnate = !!p.canReincarnate;
    out.reinc = p.reinc || null;
    out.origin = p.origin || null;
    out.partner = p.partner || null;
    out.sworn = Array.isArray(p.sworn) ? p.sworn : [];
    out.pendingDao = !!p.pendingDao;
    out.quest = { ch: Math.max(0, Math.floor(Number((p.quest || {}).ch)) || 0), side: Object.assign({}, (p.quest || {}).side) };
    out.enhanced = {};
    const srcEnh = (p.enhanced && typeof p.enhanced === 'object') ? p.enhanced : {};
    for (const [id, lv] of Object.entries(srcEnh)) {
      if (!GameData.ITEMS[id] || GameData.ITEMS[id].type !== 'artifact') continue;
      const n = Math.floor(Number(lv));
      if (isFinite(n) && n > 0) out.enhanced[id] = Utils.clamp(n, 1, ForgeSys.MAX_LV);
    }
    if (p.cave && typeof p.cave === 'object') {
      const plots = Array.isArray(p.cave.plots) ? p.cave.plots.slice(0, 8).map(x => x && typeof x === 'object' ? x : null) : null;
      out.cave = { ...fresh.cave, ...p.cave, plots: plots || fresh.cave.plots };
    } else out.cave = fresh.cave;
    if (p.beasts && typeof p.beasts === 'object') {
      const list = Array.isArray(p.beasts.list) ? p.beasts.list.filter(x => x && x.id).slice(0, 20) : [];
      out.beasts = { active: null, list, nextId: Math.max(p.beasts.nextId || 1, list.length + 1) };
      const activeId = p.beasts.active;
      if (activeId && list.some(b => b.id === activeId)) out.beasts.active = activeId;
    } else out.beasts = fresh.beasts;
    if (p.bounties && typeof p.bounties === 'object') {
      let bDay = p.bounties.day != null;
      out.bounties = { day: (p.bounties.day != null) ? Math.floor(p.bounties.day) : null, list: Array.isArray(p.bounties.list) ? p.bounties.list.slice(0, 3) : [] };
    } else out.bounties = fresh.bounties;
    out.topTitle = p.topTitle || null;
    out.story = { seen: Object.assign({}, (p.story || {}).seen), mid: Object.assign({}, (p.story || {}).mid), choices: Object.assign({}, (p.story || {}).choices) };
    out.daoExp = {};
    const srcDao = (p.daoExp && typeof p.daoExp === 'object') ? p.daoExp : {};
    for (const [k, v] of Object.entries(srcDao)) {
      if (GameData.DAO_TIERS[k] && isFinite(v)) out.daoExp[k] = Math.max(0, Math.floor(Number(v)));
    }
    if (!Object.keys(out.daoExp).length && p.dao && GameData.DAO_TIERS[p.dao]) {
      const oldTier = Math.min(p.realmIdx != null && p.realmIdx >= 1 ? Math.floor(p.realmIdx / 2) + 1 : 0, 6);
      const tiers = GameData.DAO_TIERS[p.dao].tiers;
      if (oldTier > 0 && oldTier <= tiers.length) out.daoExp[p.dao] = tiers[oldTier - 1].need;
    }
    if (out.realmIdx < 0) out.realmIdx = 0;
    if (out.layer < 0) out.layer = 0;
    while (out.layer <= 3 && out.exp >= GameData.layerNeed(out.realmIdx, out.layer)) {
      if (out.layer === 3) { out.realmIdx++; out.layer = 0; }
      else out.layer++;
    }
    out.hp = isFinite(out.hp) ? Math.max(1, out.hp) : 1;
    out.mp = isFinite(out.mp) ? Math.max(1, out.mp) : 1;
    const st2 = Stat.compute(out);
    out.hp = Math.min(out.hp, st2.maxHp);
    out.mp = Math.min(out.mp, st2.maxMp);
    return out;
  },
};
window.PlayerFactory = PlayerFactory;