
/* ======================================================================
 * §5 玩家模型
 * ====================================================================== */
const PlayerFactory = {
  rollAttrs() {
    const roll = () => Math.min(10, Utils.rand(2, 9) + (Utils.chance(18) ? Utils.rand(1, 2) : 0));
    const a = { gen: roll(), comp: roll(), luck: roll(), body: roll() };
    // v20 传承树十层「逆天改命」：转世重掷三次取四维总和最优
    if (Game.player && Game.player.rerollBest) {
      let best = a, bestSum = a.gen + a.comp + a.luck + a.body;
      for (let i = 0; i < 2; i++) {
        const c = { gen: roll(), comp: roll(), luck: roll(), body: roll() };
        const s = c.gen + c.comp + c.luck + c.body;
        if (s > bestSum) { best = c; bestSum = s; }
      }
      return best;
    }
    return a;
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
      version: 1,
      name,
      attrs: { ...attrs },
      realmIdx: 0, layer: 0, exp: 0,
      hp: 0, mp: 0,
      stones: { low: 150, mid: 0, high: 0 },
      bag: { pill_juqi: 3, pill_liaoshang: 2, w_tiejian: 1, a_buyi: 1 },
      gongfa: { gf_tuna: { level: 1, exp: 0 } },
      equipped: { weapon: null, armor: null, accessory: null },
      poison: 0, insight: 0,
      /* —— 增量扩展字段（§19-22）：大道 / 气运 / 孽障 / 根基 / 斩三尸折损 —— */
      dao: null, fortune: 0, karma: 0,
      rootDeep: false, rootWeak: false, statLossPct: 0,
      day: 0, age: 16,
      sect: null,
      counters: { battles: 0, wins: 0, explores: 0, killsElite: 0, defeats: 0, spars: 0, bossKills: 0,
        mapExplores: {}, dilemmas: 0, befriends: 0, crafts: 0, craftsOk: 0, pills: 0, learns: 0, gupianGot: 0, maxDepth: 0 },
      flags: { tutorialDone: false, ascended: false },
      dead: false,
      /* —— 增量扩展字段（v3 §23-26）：世界 / NPC / 秘境 / 转世 —— */
      world: WorldSys.freshWorld(),
      npcs: NpcSys.freshNpcs(),
      dungeon: null,
      canReincarnate: false, reinc: null, origin: null,
      partner: null, sworn: [],
      pendingDao: false,
      /* —— v8 新增：黄历签文 / 挫而愈坚（老档经 migrate 自动补默认值）—— */
      signDay: null, signText: '', signDesc: '',
      breakStreak: 0,
      quest: { ch: 0, side: {} },   // v11 主线章节进度 / 支线了结记录
      /* —— v13 新增：强化心得 / 洞府 / 灵兽 / 悬赏 / 天骄榜 —— */
      enhanced: {},
      cave: null,
      beasts: { active: null, list: [], nextId: 1 },
      bounties: null,
      topTitle: null,
      story: { seen: {}, mid: {}, choices: {}, flags: {} },   // v15 剧情记录 / 中段标记 / 抉择 / v19 后果旗标
      chronicle: [],  // v19 大事年表 [{d,txt}]
      personal: {},   // v19 个人线进度 {npcId: 已完成幕数}
      daoExp: {},   // v16 职业道境经验（六大职业独立积累，不随修为境界绑定）
      jade: 0,      // v18 残玉共鸣（0-9 重，主线每完结一章 +1）
      reputation: 0, // v18 江湖声望（RepSys 六档；v20 显式入模板，老档经 fresh 合并自动补齐）
      tameSkill: 0, // v13 驯熟练度（0-100，驯服成功率 +1%/10点；v20 显式入模板）
      xinmo: 0,     // v19 心魔值（v20 显式入模板，杜绝 undefined 参与钳制前的运算）
      battleDeck: [], // v20 出战技能盘（最多四招；空盘=全部法诀可用）
      ultLv: {},    // v20 必杀熟练度 { 式id: 使用次数 }，每 8 次升一重（至三重）
    };
    const st = Stat.compute(p);
    p.hp = st.maxHp; p.mp = st.maxMp;
    return p;
  },
  /** 读档兼容：补齐新增字段；并清洗旧档/损坏档——剔除未知物品、钳制数值边界，避免异常档导致渲染或结算崩溃 */
  migrate(p) {
    // v18 版本链：逐级迁移，每步只处理新增/变更的字段
    const MIGRATE_STEPS = [
      // v3: 世界 / NPC / 秘境 / 转世
      (out) => {
        out.world = Object.assign(WorldSys.freshWorld(), out.world || {});
        out.world.magicMaps = Array.isArray(out.world.magicMaps) ? out.world.magicMaps : [];
        out.world.history = Array.isArray(out.world.history) ? out.world.history : [];
        out.npcs = Object.assign(NpcSys.freshNpcs(), out.npcs || {});
        out.dungeon = out.dungeon || null;
        out.canReincarnate = !!out.canReincarnate;
        out.reinc = out.reinc || null;
        out.origin = out.origin || null;
        out.partner = out.partner || null;
        out.sworn = Array.isArray(out.sworn) ? out.sworn : [];
        out.pendingDao = !!out.pendingDao;
      },
      // v11: 剧情进度
      (out) => {
        out.quest = { ch: Math.max(0, Math.floor(Number((out.quest || {}).ch)) || 0), side: Object.assign({}, (out.quest || {}).side) };
      },
      // v13: 强化/洞府/灵兽/悬赏/天骄榜
      (out) => {
        out.enhanced = {};
        const srcEnh = (out.enhanced && typeof out.enhanced === 'object') ? out.enhanced : {};
        for (const [id, lv] of Object.entries(srcEnh)) {
          if (!GameData.ITEMS[id] || GameData.ITEMS[id].type !== 'artifact') continue;
          const n = Math.floor(Number(lv));
          if (isFinite(n) && n > 0) out.enhanced[id] = Utils.clamp(n, 1, ForgeSys.MAX_LV);
        }
        if (out.cave && typeof out.cave === 'object') {
          const plots = Array.isArray(out.cave.plots) ? out.cave.plots.slice(0, 8).map(x => x && typeof x === 'object' ? x : null) : null;
          out.cave = { lv: Utils.clamp(Math.floor(Number(out.cave.lv)) || 1, 1, CaveSys.MAX_LV), plots: plots || CaveSys.freshCave().plots };
        } else out.cave = null;
        const srcBeasts = (out.beasts && typeof out.beasts === 'object') ? out.beasts : {};
        out.beasts = {
          active: isFinite(Number(srcBeasts.active)) ? Number(srcBeasts.active) : null,
          list: Array.isArray(srcBeasts.list) ? srcBeasts.list.filter(b => b && GameData.MONSTERS[b.id]).map((b, i) => ({
            uid: Math.floor(Number(b.uid)) || i + 1,
            id: b.id, name: GameData.MONSTERS[b.id].name, species: GameData.MONSTERS[b.id].species || 'beast',
            power: Utils.clamp(Math.floor(Number(b.power)) || 0, 0, 60),
            level: Utils.clamp(Math.floor(Number(b.level)) || 1, 1, 10),
            exp: Math.max(0, Math.floor(Number(b.exp)) || 0),
            skills: Array.isArray(b.skills) ? b.skills.slice(0, 1) : [],
          })) : [],
          nextId: Math.max(1, Math.floor(Number(srcBeasts.nextId)) || 1),
        };
        if (out.beasts.active != null && !out.beasts.list.some(b => b.uid === out.beasts.active)) out.beasts.active = null;
        if (out.bounties && typeof out.bounties === 'object' && Array.isArray(out.bounties.list)) {
          out.bounties = { day: Math.max(0, Math.floor(Number(out.bounties.day)) || 0), list: out.bounties.list };
        } else out.bounties = null;
        out.topTitle = (out.topTitle && typeof out.topTitle === 'object') ? { day: Math.max(0, Math.floor(Number(out.topTitle.day)) || 0) } : null;
        out.mysteryDay = isFinite(Number(out.mysteryDay)) ? Number(out.mysteryDay) : -1;
      },
      // v15: 剧情记录
      (out) => {
        const srcStory = (out.story && typeof out.story === 'object') ? out.story : {};
        out.story = {
          seen: (srcStory.seen && typeof srcStory.seen === 'object') ? srcStory.seen : {},
          mid: (srcStory.mid && typeof srcStory.mid === 'object') ? srcStory.mid : {},
          choices: (srcStory.choices && typeof srcStory.choices === 'object') ? srcStory.choices : {},
        };
      },
      // v16: 道境经验
      (out) => {
        // v19 修复：须读【原始存档】的 daoExp（out 上的 daoExp 已被 fresh 模板的零值覆盖，fold 分支此前永不可达）
        const srcDaoExp = (p.daoExp && typeof p.daoExp === 'object') ? p.daoExp : null;
        out.daoExp = { sword: 0, pill: 0, talisman: 0, body: 0, array: 0, demonic: 0 };
        if (srcDaoExp) {
          for (const k of Object.keys(out.daoExp)) {
            const v = Math.floor(Number(srcDaoExp[k]));
            if (isFinite(v) && v > 0) out.daoExp[k] = Math.min(v, 2000000);
          }
        } else if (out.dao && GameData.DAO_TIERS[out.dao]) {
          const def = GameData.DAO_TIERS[out.dao];
          let lv = 0;
          for (const t of def.tiers) if ((out.realmIdx || 0) >= t.realm) lv++;
          if (lv > 0 && def.tiers[lv - 1]) out.daoExp[out.dao] = def.tiers[lv - 1].need;
        }
      },
      // v18: 装备实例化（string→{id, enhance}）
      (out) => {
        for (const slot of ['weapon', 'armor', 'accessory']) {
          const eq = out.equipped[slot];
          if (typeof eq === 'string') {
            out.equipped[slot] = { id: eq, enhance: (out.enhanced && out.enhanced[eq]) || 0 };
          }
        }
      },
      // v18.1: 残玉共鸣追认（老档按已完成章数补共鸣重数）
      (out) => {
        const done = (out.quest && out.quest.ch) || 0;
        if (done > 0) out.jade = Math.max(out.jade || 0, Math.min(DaoxinSys.MAX_ATTUNE, done));
      },
      // v19: 剧情旗标 / 大事年表 / 个人线 / NPC 记忆
      (out) => {
        out.chronicle = Array.isArray(out.chronicle) ? out.chronicle.slice(-80) : [];
        out.personal = (out.personal && typeof out.personal === 'object') ? out.personal : {};
        if (!out.story || typeof out.story !== 'object') out.story = { seen: {}, mid: {}, choices: {} };
        if (!out.story.flags || typeof out.story.flags !== 'object') out.story.flags = {};
        if (out.npcs && typeof out.npcs === 'object') {
          for (const s of Object.values(out.npcs)) {
            if (!s || typeof s !== 'object') continue;
            if (!Array.isArray(s.mem)) s.mem = [];
          }
        }
      },
      // v19-3: 拍卖行 / 宗门令
      (out) => {
        if (out.auction && typeof out.auction !== 'object') out.auction = null;
        if (out.sect && typeof out.sect === 'object') {
          const c = out.sect.command;
          if (c && typeof c === 'object' && ['drill', 'market', 'teach'].includes(c.kind) && isFinite(Number(c.until))) {
            out.sect.command = { kind: c.kind, day: Math.max(0, Math.floor(Number(c.day)) || 0), until: Math.floor(Number(c.until)) };
          } else out.sect.command = null;
        }
      },
      // v19-2: 心魔 / 本命法宝 / 洞府建筑 / 灵兽亲昵与副战
      (out) => {
        out.xinmo = Math.max(0, Math.min(160, Math.floor(Number(out.xinmo)) || 0));
        out.benming = (out.benming && typeof out.benming === 'object') ? { lv: Utils.clamp(Math.floor(Number(out.benming.lv)) || 0, 0, ForgeSys.BENMING_MAX) } : { lv: 0 };
        if (out.cave && typeof out.cave === 'object') {
          const b = out.cave.builds && typeof out.cave.builds === 'object' ? out.cave.builds : {};
          out.cave.builds = { beast: Utils.clamp(Math.floor(Number(b.beast)) || 0, 0, 3), train: Utils.clamp(Math.floor(Number(b.train)) || 0, 0, 3), lib: Utils.clamp(Math.floor(Number(b.lib)) || 0, 0, 3) };
        }
        if (out.beasts && typeof out.beasts === 'object') {
          out.beasts.active2 = isFinite(Number(out.beasts.active2)) ? Number(out.beasts.active2) : null;
          if (out.beasts.active2 != null && !((out.beasts.list || []).some(x => x.uid === out.beasts.active2))) out.beasts.active2 = null;
          for (const bst of (out.beasts.list || [])) {
            if (!bst || typeof bst !== 'object') continue;
            bst.bond = Utils.clamp(Math.floor(Number(bst.bond)) || 0, 0, 100);
          }
        }
      },
      // v20: 养成纵深——洞府新建筑补齐 / 出战技能盘 / 必杀熟练度 / 灵兽派遣与斗兽 / 先天上限 12
      (out) => {
        if (out.cave && typeof out.cave === 'object') {
          const b = out.cave.builds && typeof out.cave.builds === 'object' ? out.cave.builds : {};
          const six = {};
          for (const key of CaveSys.BUILD_KEYS) six[key] = Utils.clamp(Math.floor(Number(b[key])) || 0, 0, 3);
          out.cave.builds = six;
        }
        if (!Array.isArray(out.battleDeck)) out.battleDeck = [];
        if (!out.ultLv || typeof out.ultLv !== 'object') out.ultLv = {};
        for (const bst of (out.beasts && out.beasts.list) || []) {
          if (!bst || typeof bst !== 'object') continue;
          if (!Array.isArray(bst.skills)) bst.skills = [];
          if (bst.trip && !isFinite(Number(bst.trip.until))) bst.trip = null;
        }
        for (const k of Object.keys(out.attrs)) out.attrs[k] = Utils.clamp(out.attrs[k], 0, 12);
      },
    ];
    // 基础：fresh 模板 + 展开合并
    const fresh = this.create(p.name || '无名散修', p.attrs || { gen: 5, comp: 5, luck: 5, body: 5 });
    const out = { ...fresh, ...p };
    out.attrs = { ...fresh.attrs, ...(p.attrs || {}) };
    for (const k of Object.keys(out.attrs)) {
      const v = Math.round(Number(out.attrs[k]));
      out.attrs[k] = isFinite(v) ? Utils.clamp(v, 0, 12) : fresh.attrs[k];   // v20：天机果可破至十二点
    }
    out.stones = { ...fresh.stones, ...(p.stones || {}) };
    for (const k of Object.keys(out.stones)) {
      const v = Math.floor(Number(out.stones[k]));
      out.stones[k] = isFinite(v) && v > 0 ? Math.min(v, 1e12) : 0;
    }
    // 背包清洗
    const bag = {};
    const srcBag = (p.bag && typeof p.bag === 'object') ? p.bag : {};
    for (const [id, n] of Object.entries(srcBag)) {
      const def = GameData.ITEMS[id];
      const qty = Math.floor(Number(n));
      if (def && isFinite(qty) && qty > 0) bag[id] = Math.min(qty, 9999);
    }
    out.bag = bag;
    // 功法清洗
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
    out.counters = { ...fresh.counters, ...(p.counters || {}) };
    out.flags = { ...fresh.flags, ...(p.flags || {}) };
    // 逐级运行迁移步骤
    const startStep = out._migratedVersion || 0;
    for (let i = startStep; i < MIGRATE_STEPS.length; i++) {
      MIGRATE_STEPS[i](out);
    }
    out._migratedVersion = MIGRATE_STEPS.length;
    // 最终钳制
    out.realmIdx = Utils.clamp(Math.floor(Number(out.realmIdx)) || 0, 0, 9);
    out.layer = Utils.clamp(Math.floor(Number(out.layer)) || 0, 0, 3);
    const expN = Number(out.exp);
    out.exp = isFinite(expN) && expN > 0 ? Math.min(expN, GameData.layerNeed(out.realmIdx, 3)) : 0;
    while (out.layer < 3) {
      const need0 = GameData.layerNeed(out.realmIdx, out.layer);
      if (out.exp < need0) break;
      out.exp -= need0;
      out.layer++;
    }
    if (out.layer === 3) out.exp = Math.min(out.exp, GameData.layerNeed(out.realmIdx, 3));
    out.fortune = Math.max(0, Math.floor(Number(out.fortune)) || 0);
    out.karma = Math.max(0, Math.floor(Number(out.karma)) || 0);
    out.poison = Math.max(0, Number(out.poison) || 0);
    out.insight = Utils.clamp(Math.floor(Number(out.insight)) || 0, 0, 100);
    const dayN = Number(out.day);
    out.day = isFinite(dayN) && dayN > 0 ? dayN : 0;
    const ageN = Math.floor(Number(out.age));
    out.age = isFinite(ageN) ? Utils.clamp(ageN, 16, 99999) : 16;
    const st = Stat.compute(out);
    out.hp = Utils.clamp(Math.round(Number(out.hp)) || 0, 0, st.maxHp);
    out.mp = Utils.clamp(Math.round(Number(out.mp)) || 0, 0, st.maxMp);
    return out;
  },
};
