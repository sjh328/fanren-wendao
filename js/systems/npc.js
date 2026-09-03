
/* ======================================================================
 * §24 动态NPC与恩怨 NpcSys（十五常驻修士 / 恩怨偷袭 / 社交 / 派系）
 * ====================================================================== */
const NpcSys = {
  freshNpcs() {
    const mapIds = GameData.MAPS.map(m => m.id);
    const o = {};
    for (const d of GameData.NPCS) {
      o[d.id] = {
        realmIdx: Utils.clamp(d.realm, 0, 9),
        layer: Utils.rand(0, 2),
        exp: 0,
        rel: 0,            // 交情 -100 ~ 100
        alive: true,
        map: Utils.pick(mapIds),
        met: false,        // 是否打过照面
        grudge: false,     // 恩怨（连坐血亲）
        pastLife: false,   // 前世恩怨（转世专属剧情）
        mem: [],           // v19 记忆条目 [{d,t,x}]
      };
    }
    return o;
  },
  def(id) { return GameData.NPCS.find(n => n.id === id) || null; },
  state(p, id) { return (p.npcs && p.npcs[id]) || null; },
  /** v18：NPC 性格对话模板 */
  dialogText(temper, kind) {
    const DIALOG = {
      greeting: {
        '孤傲': '「何事？」', '温婉': '「道友来访，有失远迎。」', '温润': '「有朋自远方来。」',
        '冷厉': '「说。」', '玲珑': '「稀客稀客，快请坐。」', '豪爽': '「哈哈哈，来的正好！」',
        '清冷': '「你来了。」', '精明': '「道友可是带了什么好买卖？」', '古怪': '「唔…你身上有件有趣的东西。」',
        '淡泊': '「请坐，茶在壶里。」', '慈悲': '「施主安好。」', '狡黠': '「哟，还记得我呢？」',
        '危险': '「你胆子不小。」', '娇憨': '「师兄/师姐！」', '市侩': '「三枚灵石，包你满意。」',
        '豪迈': '「好！痛快！」', '儒雅': '「幸会幸会。」', '圆滑': '「哎呀，什么风把您吹来了？」',
        '憨直': '「俺嘴笨，不会说话…」', '飘逸': '「你来了，我算到了。」', '癫狂': '「酒！酒呢！」', '侠气': '「路见不平，拔刀相助。」',
      },
      gift: {
        '孤傲': '「不必。」（收下了）', '温婉': '「这如何使得…多谢道友。」', '豪爽': '「哈哈哈，那我就不客气了！」',
        '精明': '「好东西，值这个价。」', '古怪': '「有意思，有意思。」', '危险': '「你这是在讨好我？」', '癫狂': '「好酒！好酒！」',
      },
    };
    const pool = DIALOG[kind] || DIALOG.greeting;
    return pool[temper] || (kind === 'greeting' ? '「道友安好。」' : '「多谢。」');
  },
  relLabel(p, id) {
    const s = this.state(p, id);
    if (!s) return '萍水';
    if (p.partner === id) return '道侣';
    if ((p.sworn || []).includes(id)) return '结拜';
    if (s.rel >= 60) return '莫逆';
    if (s.rel >= 30) return '友善';
    if (s.rel >= 8) return '相熟';
    if (s.rel > -15) return '萍水';
    if (s.rel > -40) return '敌视';
    return '宿敌';
  },
  /* ---------- v19：关系五档（机制层） ---------- */
  TIERS: [
    { min: -999, id: 'foe',    name: '宿敌' },
    { min: -40,  id: 'cold',   name: '冷漠' },
    { min: 0,    id: 'known',  name: '相识' },
    { min: 30,   id: 'friend', name: '友好' },
    { min: 70,   id: 'bosom',  name: '知己' },
    { min: 90,   id: 'sworn',  name: '生死之交' },
  ],
  tierOf(rel) {
    // v19 修复：档位按 min 升序存放，须自高向低匹配（此前永远命中最低档「宿敌」）
    for (let i = this.TIERS.length - 1; i >= 0; i--) {
      if (rel >= this.TIERS[i].min) return this.TIERS[i];
    }
    return this.TIERS[0];
  },
  MEM_TYPE: { story: '剧情', spar: '切磋', gift: '赠礼', chat: '论道', save: '相救', betray: '背刺', kill: '杀戮', peace: '化解', line: '个人线' },
  /** v19 记忆：共同经历写入记忆条目（上限 8 条，同类同文去重） */
  mem(p, id, type, txt) {
    const s = this.state(p, id);
    if (!s) return;
    if (!Array.isArray(s.mem)) s.mem = [];
    if (s.mem.some(m => m.t === type && m.x === txt)) return;
    s.mem.push({ d: Math.floor(p.day || 0), t: type, x: txt });
    if (s.mem.length > 8) s.mem.splice(0, s.mem.length - 8);
  },
  /** v19 回忆杀：依据最近一条记忆生成寒暄台词 */
  recallLine(p, id) {
    const s = this.state(p, id);
    if (!s || !s.mem || !s.mem.length) return null;
    const m = s.mem[s.mem.length - 1];
    const tpl = {
      spar: '「上次与你切磋，我回去想了三日。」',
      gift: '「你上回所赠之物，我还留着。」',
      chat: '「上回论道，你那一问，我至今还在参。」',
      save: '「当日若非你出手，我早已不在了。」',
      betray: '「……你还有脸来见我？」',
      kill: '「此仇未雪，别来无恙。」',
      peace: '「旧事已了，今日只叙旧情。」',
      story: '「那一日的光景，我至今记得。」',
      line: '「你我之间，已不必多说了。」',
    };
    return tpl[m.t] || null;
  },
  /** v19 突破贺语：交情最好的一位修士登门道贺（六成几率触发） */
  realmGreeting(p) {
    if (!p || !p.npcs) return null;
    const ids = Object.keys(p.npcs).filter(id => p.npcs[id].alive && p.npcs[id].met && p.npcs[id].rel >= 30);
    if (!ids.length || !Utils.chance(60)) return null;
    ids.sort((a, b) => p.npcs[b].rel - p.npcs[a].rel);
    const id = ids[0];
    const d = this.def(id);
    this.mem(p, id, 'story', '突破贺喜');
    return { id, name: d.name, title: d.title,
      line: '「恭喜道友更上层楼。他日你登高之处，莫忘了今日同辈之人。」' };
  },
  /** 岁月推进：NPC 自主修炼 / 游历 / 争夺机缘 */
  yearTick(p, y) {
    if (!p.npcs) return;
    for (const [id, s] of Object.entries(p.npcs)) {
      if (!s.alive) continue;
      const d = this.def(id);
      if (!d) continue;
      if (Utils.chance(18)) s.map = Utils.pick(GameData.MAPS).id; // 游历
      let gain = GameData.layerNeed(Utils.clamp(s.realmIdx, 0, 9), Math.min(3, s.layer))
        * Utils.randF(0.05, 0.12) * (0.6 + d.talent * 0.18);
      if (Utils.chance(10)) { // 争夺机缘
        gain *= 2;
        if (s.met) Log.add(`听闻 ${d.name} 于${(GameData.MAPS.find(m => m.id === s.map) || {}).name || '某地'}夺得一桩机缘，修为大进。`, 'event');
      }
      s.exp += gain;
      let guard = 0;
      while (guard++ < 8 && s.realmIdx < 9 && s.exp >= GameData.layerNeed(s.realmIdx, Math.min(3, s.layer))) {
        if (s.layer < 3) { s.exp -= GameData.layerNeed(s.realmIdx, s.layer); s.layer++; }
        else {
          s.realmIdx++; s.layer = 0; s.exp = 0;
          if (s.met || s.realmIdx >= 2) Log.add(`消息传来：<b>${d.name}</b> 已晋入 <b>${GameData.REALM_NAMES[s.realmIdx]}期</b>！`, 'event');
        }
      }
    }
  },
  /** §24 灵气潮汐：玩家大境界突破，常驻修士亦随之一进 */
  onPlayerRealmUp(p) {
    if (!p.npcs) return;
    for (const s of Object.values(p.npcs)) {
      if (!s.alive) continue;
      s.exp += GameData.layerNeed(Utils.clamp(s.realmIdx, 0, 9), Math.min(3, s.layer)) * 0.5;
    }
  },
  /* ---------- v5：动态行游 ---------- */
  /** 每旬（十日）轮换一次：约两成修士行游在外，历练途中偶遇不着 */
  isAway(p, id) {
    const period = Math.floor((p.day || 0) / 10);
    return Utils.hashStr(id + '#' + period) % 5 === 0;
  },
  /** 本旬行游在外的修士名单（江湖页展示） */
  awayNames(p) {
    if (!p.npcs) return [];
    return GameData.NPCS.filter(d => p.npcs[d.id] && p.npcs[d.id].alive && this.isAway(p, d.id)).map(d => d.name);
  },
  /** 岁月流逝：常驻修士偶尔改换游历地图（每流逝一日约 0.4% 概率/人，单次封顶六成） */
  wander(p, days) {
    if (!p.npcs) return;
    const chance = Math.min(60, days * 0.4);   // Utils.chance 用百分数
    for (const s of Object.values(p.npcs)) {
      if (!s.alive || !Utils.chance(chance)) continue;
      const nid = Utils.pick(GameData.MAPS).id;
      if (nid !== s.map) s.map = nid;
    }
  },
  npcAt(p, mapId) {
    const ids = Object.keys(p.npcs || {}).filter(id => p.npcs[id].alive && p.npcs[id].map === mapId && !this.isAway(p, id));
    return ids.length ? Utils.pick(ids) : null;
  },
  /** 恩怨登记：本人记仇，血亲连坐 */
  addGrudge(p, id) {
    const s = this.state(p, id);
    if (!s) return;
    s.grudge = true;
    const d = this.def(id);
    for (const k of (d && d.kin) || []) {
      const ks = this.state(p, k);
      if (ks && ks.alive) { ks.grudge = true; ks.rel = Utils.clamp(ks.rel - 25, -100, 100); }
    }
  },
  grudgeCount(p) { return Object.values(p.npcs || {}).filter(s => s.grudge && s.alive).length; },
  pickAmbusher(p) {
    const ids = Object.keys(p.npcs || {}).filter(id => p.npcs[id].grudge && p.npcs[id].alive);
    return ids.length ? Utils.pick(ids) : null;
  },
  ambushChance(p) {
    const n = this.grudgeCount(p);
    return n ? Utils.clamp(6 + n * 4, 6, 40) : 0;
  },
  /** 渡劫/突破虚弱期偷袭判定 */
  tribAmbush(p) {
    if (!this.grudgeCount(p)) return null;
    if (!Utils.chance(Utils.clamp(10 + this.grudgeCount(p) * 4, 10, 45))) return null;
    return this.pickAmbusher(p);
  },
  /** 危机相助：道侣 > 结拜 > 莫逆之交 */
  tryAid(p, scene) {
    const cand = p.partner
      || (p.sworn || [])[0]
      || Object.keys(p.npcs || {}).find(id => p.npcs[id].alive && p.npcs[id].rel >= 50);
    if (!cand) return null;
    const s = this.state(p, cand);
    if (!s || !s.alive) return null;
    if (!Utils.chance(Utils.clamp(25 + Math.max(0, s.rel) * 0.3, 0, 70))) return null;
    s.rel = Utils.clamp(s.rel + 4, -100, 100);
    this.mem(p, cand, 'save', '危难相救');   // v19 记忆
    return { id: cand, name: this.def(cand).name };
  },
  afterSpar(p, id, won) {
    const s = this.state(p, id);
    if (!s) return;
    s.met = true;
    s.rel = Utils.clamp(s.rel + (won ? 5 : 2), -100, 100);
    this.mem(p, id, 'spar', won ? '切磋获胜' : '切磋落败');   // v19 记忆
  },
  /** NPC 之敌（战斗用） */
  buildEnemy(p, id) {
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s) return buildMonster('m_zeiren');
    const rp = Utils.clamp(s.realmIdx * 4 + s.layer, 0, 60);
    const mod = 0.92 + d.talent * 0.04;
    const realmIdx = Utils.clamp(Math.floor(rp / 4), 0, 9);
    // v18：NPC 按性情配专属技能（切磋/恩怨不再退化为普攻对轰）
    const temperSkills = {
      '孤傲': [{ name: '傲剑诀', w: 40, kind: 'bleed', pct: 3, rounds: 2 }],
      '温婉': [{ name: '杏林春风', w: 30, kind: 'heal', pct: 18 }, { name: '银针渡穴', w: 30, kind: 'weaken', pct: 20, rounds: 2 }],
      '温润': [{ name: '水墨困阵', w: 35, kind: 'slow', pct: 25, rounds: 2 }],
      '冷厉': [{ name: '寒刃破甲', w: 40, kind: 'defdown', pct: 25, rounds: 2 }],
      '玲珑': [{ name: '穿心算盘', w: 35, kind: 'drain', mult: 1.1, leech: 0.4 }],
      '豪爽': [{ name: '铁拳撼山', w: 40, kind: 'stun', rounds: 1 }],
      '清冷': [{ name: '冰弦裂魂', w: 35, kind: 'freeze', rounds: 1 }],
      '精明': [{ name: '金蝉脱壳', w: 30, kind: 'heal', pct: 15 }, { name: '算尽机关', w: 30, kind: 'defdown', pct: 20, rounds: 2 }],
      '古怪': [{ name: '符火乱舞', w: 40, kind: 'burn', pct: 3.5, rounds: 2 }],
      '淡泊': [{ name: '太极柔劲', w: 35, kind: 'weaken', pct: 25, rounds: 2 }, { name: '抱元守一', w: 25, kind: 'guard', def: 35, rounds: 2 }],
      '慈悲': [{ name: '佛光普照', w: 35, kind: 'heal', pct: 20 }],
      '狡黠': [{ name: '暗影刺', w: 40, kind: 'poison', pct: 3, rounds: 3 }],
      '危险': [{ name: '魔煞噬魂', w: 35, kind: 'drain', mult: 1.2, leech: 0.5 }, { name: '血影咒', w: 30, kind: 'poison', pct: 4, rounds: 3 }],
      '娇憨': [{ name: '剑花缭乱', w: 35, kind: 'bleed', pct: 2, rounds: 2 }],
      '市侩': [{ name: '钱能通神', w: 30, kind: 'slow', pct: 20, rounds: 2 }],
      '豪迈': [{ name: '裂石拳', w: 40, kind: 'stun', rounds: 1 }],
      '儒雅': [{ name: '青萍剑诀', w: 35, kind: 'bleed', pct: 2.5, rounds: 2 }],
      '圆滑': [{ name: '和气生财', w: 30, kind: 'heal', pct: 12 }, { name: '袖里乾坤', w: 30, kind: 'slow', pct: 20, rounds: 2 }],
      '憨直': [{ name: '铁山靠', w: 40, kind: 'stun', rounds: 1 }],
      '飘逸': [{ name: '星罗棋布', w: 35, kind: 'defdown', pct: 25, rounds: 2 }, { name: '天罡护体', w: 25, kind: 'guard', def: 30, rounds: 2 }],
      '癫狂': [{ name: '醉仙乱舞', w: 40, kind: 'burn', pct: 4, rounds: 2 }],
      '侠气': [{ name: '侠义剑', w: 40, kind: 'bleed', pct: 3, rounds: 2 }],
    };
    const skills = temperSkills[d.temper] || [{ name: '出手一击', w: 40, kind: 'bleed', pct: 2, rounds: 2 }];
    return {
      id: null, npcId: id, name: d.name, elite: false, power: rp,
      realmLabel: GameData.REALM_NAMES[realmIdx] + GameData.LAYER_NAMES[Utils.clamp(rp % 4, 0, 3)],
      hpMax: Math.round((65 + Math.pow(rp, 1.6) * 5.2) * mod),
      atk: Math.round((7 + rp * 2.7) * mod),
      def: Math.round((4 + rp * 1.7) * mod),
      spd: Math.round((7 + rp * 0.9) * mod),
      dodge: 5, crit: 8,
      skills, // v18：NPC 专属技能
      expGain: Math.round(30 * GameData.eco(realmIdx)),
      stoneGain: Math.round(Utils.rand(30, 55) * GameData.stoneEco(realmIdx)),
      dropTier: Math.min(4, Math.floor(realmIdx / 2) + 1),
      rareDrop: null,
      hp: 0,
    };
  },
  /** 击败恩怨 NPC / 宿敌之争结算 */
  onPlayerKillsNpc(p, id) {
    const s = this.state(p, id);
    const d = this.def(id);
    if (!s || !d) return;
    s.rel = Utils.clamp(s.rel - 45, -100, 100);
    this.addGrudge(p, id);
    this.mem(p, id, 'kill', '刀兵相向');   // v19 记忆
    KarmaSys.addKarma(10, true);
    if (Utils.chance(25)) {
      s.alive = false;
      KarmaSys.addKarma(10, true);
      Log.add(`${d.name} 伤重不治，殒身当场——其血亲与你势不两立！（孽障 +20）`, 'loss');
    } else {
      Log.add(`${d.name} 重伤遁走，临行前留下一句「此事没完」——恩怨愈结愈深。（孽障 +10）`, 'warn');
    }
  },
  /** 一战了断：胜则恩怨两清 */
  onConfrontWin(p, id) {
    const s = this.state(p, id);
    if (!s) return;
    s.grudge = false;
    s.pastLife = false;
    s.rel = Utils.clamp(s.rel + 15, -100, 100);
    this.mem(p, id, 'peace', '一战了断');   // v19 记忆
    KarmaSys.addKarma(8, true);
    Log.add(`一战之后，恩怨两清。${(this.def(id) || {}).name || ''} 收起敌意，与你相顾无言。（孽障 +8）`, 'system');
  },
  /* ---------- 社交动作 ---------- */
  befriendCost(p, id) {
    const s = this.state(p, id);
    return s ? Math.round(20 * GameData.stoneEco(s.realmIdx)) : 20;
  },
  async befriend(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    Meta.see('npc', id);   // v6 图鉴
    const cost = this.befriendCost(p, id);
    const ok = await UI.popup({
      title: `结交 · ${d.name}`,
      html: `${d.desc}<br>对方乃 <b>${GameData.REALM_NAMES[s.realmIdx]}${GameData.LAYER_NAMES[s.layer]}</b> 修士，备一份寻常修士不舍得用的见面礼，可搏个善缘。<br>需灵石 <span class="hl">${Utils.fmtNum(cost)}</span>。`,
      options: [{ text: '备礼相赠', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    s.met = true;
    s.rel = Utils.clamp(s.rel + Utils.rand(8, 14), -100, 100);
    p.counters.befriends = (p.counters.befriends || 0) + 1;   // v11 剧情计数
    this.mem(p, id, 'chat', '结交之谊');   // v19 记忆
    Log.add(`你以礼相待，与 ${d.name} 相谈甚欢。（交情 ${s.rel > 0 ? '+' : ''}${s.rel}）`, 'gain');
    Game.afterAction();
  },
  async spar(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive || Battle.active) return;
    s.met = true;
    Meta.see('npc', id);   // v6 图鉴
    Log.add(`你向 ${d.name} 递出战书，只较技，不拼命。`, 'event');
    Game.afterAction();
    Battle.start(null, { enemy: this.buildEnemy(p, id), npcId: id, spar: true, mapName: '切磋台' });
  },
  async betray(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive || Battle.active) return;
    if (s.rel < 15) { UI.toast('关系太僵，无从背刺'); return; }
    const ok = await UI.popup({
      title: '背刺夺宝',
      html: `${d.name}（${GameData.REALM_NAMES[s.realmIdx]}期）对你信任有加……趁其不备痛下杀手，可夺其储物袋，<b>收益翻倍</b>。<br><span class="neg">此为大恶：气运暴跌、孽障大增，其本人与血亲将永世与你为敌。</span>`,
      options: [{ text: '动手', value: true }, { text: '罢了', value: false }],
    });
    if (!ok) return;
    const myPow = p.realmIdx * 4 + p.layer;
    const hisPow = s.realmIdx * 4 + s.layer;
    const caught = hisPow > myPow + 3 ? 55 : hisPow > myPow ? 30 : 10;
    if (Utils.chance(caught)) {
      Log.add(`${d.name} 早有防备，反手一击——你偷鸡不成蚀把米！`, 'warn');
      s.rel = Utils.clamp(s.rel - 30, -100, 100);
      this.addGrudge(p, id);
      this.mem(p, id, 'betray', '背刺未遂');   // v19 记忆
      Game.afterAction();
      Battle.start(null, { enemy: this.buildEnemy(p, id), npcId: id, mode: 'hunt', ambush: true, mapName: '背刺之地' });
      return;
    }
    const loot = Math.round(Utils.rand(40, 70) * GameData.stoneEco(s.realmIdx));
    Bag.addStones(loot);
    let extra = '';
    if (Utils.chance(50)) {
      const tier = Utils.clamp(Math.floor(s.realmIdx / 2) + 2, 1, 4);
      const mat = Utils.pick(GameData.matsByTier(tier));
      Bag.addItem(mat, 1);
      extra = `、${GameData.ITEMS[mat].name} ×1`;
    }
    s.rel = Utils.clamp(s.rel - 70, -100, 100);
    s.met = true;
    this.addGrudge(p, id);
    this.mem(p, id, 'betray', '背刺夺宝');   // v19 记忆
    KarmaSys.addKarma(15, true);
    p.fortune = Math.max(0, (p.fortune || 0) - 15);
    Log.add(`你趁 ${d.name} 不备痛下杀手，夺其储物袋——灵石 ${Utils.fmtNum(loot)}${extra}！收益翻倍，然气运 -15、孽障 +15。`, 'gain');
    Log.add('午夜梦回，那双错愕的眼睛总在你眼前浮现。', 'warn');
    Game.afterAction();
  },
  async swear(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    if ((p.sworn || []).includes(id)) { UI.toast('你们已是结拜之交'); return; }
    if (s.rel < 70) { UI.toast('交情尚浅，不足结拜'); return; }
    const cost = Math.round(100 * GameData.stoneEco(s.realmIdx));
    const ok = await UI.popup({
      title: `结拜 · ${d.name}`,
      html: `撮土为香，义结金兰，自此祸福与共，危急时或可舍命相救。<br>需备三牲酒礼，灵石 <span class="hl">${Utils.fmtNum(cost)}</span>。`,
      options: [{ text: '义结金兰', value: true, primary: true }, { text: '再处一处', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    p.sworn = p.sworn || [];
    p.sworn.push(id);
    s.rel = Utils.clamp(s.rel + 8, -100, 100);
    this.mem(p, id, 'story', '义结金兰');   // v19 记忆
    Log.add(`你与 <b>${d.name}</b> 撮土为香，结为异姓道侣兄妹！此生共进退。`, 'system');
    Game.afterAction();
  },
  async becomeDao(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    if (p.partner) { UI.toast('你已有道侣'); return; }
    if (s.rel < 90) { UI.toast('两情尚未通明，谈何结发'); return; }
    const ok = await UI.popup({
      title: `结为道侣 · ${d.name}`,
      html: `愿以此心，共证长生。与 <b>${d.name}</b> 结为道侣后，你们将同修共进，危急关头更易舍命相护。`,
      options: [{ text: '执手结发', value: true, primary: true }, { text: '容我再想想', value: false }],
    });
    if (!ok) return;
    p.partner = id;
    s.rel = 100;
    this.mem(p, id, 'story', '结为道侣');   // v19 记忆
    Log.add(`红烛映照，道音为证——你与 <b>${d.name}</b> 正式结为道侣！仙途多一知己，死劫多一臂之助。`, 'system');
    Game.afterAction();
  },
  /** 化解仇怨（前世恩怨触发专属剧情） */
  async peacemake(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.grudge) return;
    const cost = Math.round(80 * GameData.stoneEco(s.realmIdx));
    if (s.pastLife) {
      const choice = await UI.popup({
        title: '前世恩怨 · ' + d.name,
        html: `（前世记忆翻涌）你的心猛地一沉——<b>${d.name}</b>！前世你与TA有一段未了的血债。<br>TA显然也认出了你的气息，眸中恨意与恍然交织。<br><br>化解需灵石 <span class="hl">${Utils.fmtNum(cost)}</span>，或以一战做了断。`,
        options: [
          { text: '化解恩怨（散财消灾）', value: 'peace', primary: true },
          { text: '一战了断', value: 'fight' },
          { text: '暂且隐忍', value: 'leave' },
        ],
      });
      if (choice === 'peace') {
        if (!Bag.spendStones(cost)) { UI.toast('灵石不足，难以补过'); return; }
        s.grudge = false; s.pastLife = false;
        s.rel = Utils.clamp(s.rel + 45, -100, 100);
        KarmaSys.addFortune(5);
        Log.add(`你以前世记忆寻因究果，赔罪补过。${d.name} 长叹一声，前尘恩怨一笔勾销。（气运 +5）`, 'gain');
      } else if (choice === 'fight') {
        Log.add(`你与 ${d.name} 前世今生的是非，今日做个了断！`, 'warn');
        Game.afterAction();
        Battle.start(null, { enemy: this.buildEnemy(p, id), npcId: id, mode: 'confront', mapName: '前世恩怨了断之地' });
        return;
      } else {
        Log.add('你垂下眼帘，暂且隐忍。有些债，躲不掉，只能慢慢还。', 'info');
      }
    } else {
      const ok = await UI.popup({
        title: `化解仇怨 · ${d.name}`,
        html: `${d.name} 与你仇怨已深。登门赔罪、散财消灾，或可冰释——需灵石 <span class="hl">${Utils.fmtNum(cost)}</span>。`,
        options: [{ text: '赔罪消灾', value: true, primary: true }, { text: '不共戴天', value: false }],
      });
      if (!ok) return;
      if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
      s.grudge = false;
      s.rel = Utils.clamp(s.rel + 30, -100, 100);
      Log.add(`你备下重礼登门谢罪。${d.name} 沉默良久，终是收下——仇怨暂解。`, 'gain');
    }
    Game.afterAction();
  },
  /** v19 赠礼：备礼相赠增进交情（关系愈深，增益愈小——相交贵在知心） */
  async gift(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    if (!s.met) { UI.toast('素未谋面，何谈赠礼'); return; }
    if (Battle.active) return;
    const cost = Math.round(30 * GameData.stoneEco(s.realmIdx));
    const tier = this.tierOf(Math.max(0, s.rel));
    const gain = { known: Utils.rand(3, 6), friend: Utils.rand(2, 4), bosom: Utils.rand(1, 3), sworn: 1 }[tier.id] || 2;
    const ok = await UI.popup({
      title: `赠礼 · ${d.name}`,
      html: `${this.dialogText(d.temper, 'greeting')}<br>备一份投其所好的礼，可增进交情。需灵石 <span class="hl">${Utils.fmtNum(cost)}</span>。<br><span class="tip-line">关系愈深，礼愈难打动人——相交贵在知心。</span>`,
      options: [{ text: '奉上礼物', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    const before = this.tierOf(Math.max(0, s.rel)).name;
    s.rel = Utils.clamp(s.rel + gain, -100, 100);
    this.mem(p, id, 'gift', '赠礼之谊');
    const after = this.tierOf(Math.max(0, s.rel)).name;
    Log.add(`你向 ${d.name} 奉上礼物。${this.dialogText(d.temper, 'gift')}（交情 ${s.rel > 0 ? '+' : ''}${s.rel}${after !== before ? `，关系升为【<b>${after}</b>】` : ''}）`, 'gain');
    if (after !== before) Ambience.sfx('rare');
    Game.afterAction();
  },
  /** v19 论道：以时间为束，换修为与感悟（关系愈深，倾囊相授） */
  async discuss(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    if (!s.met) { UI.toast('素未谋面，何谈论道'); return; }
    if (Battle.active) return;
    const tier = this.tierOf(Math.max(0, s.rel));
    if (tier.id === 'known' || tier.id === 'cold' || tier.id === 'foe') {
      UI.toast('交情尚浅，对方只肯泛泛而谈');
      return;
    }
    const insight = tier.id === 'sworn' ? 4 : tier.id === 'bosom' ? 3 : 2;
    const gain = Math.round((40 + insight * 30) * GameData.eco(p.realmIdx) * (0.8 + d.talent * 0.08));
    Cultivate.addExp(p, gain);
    p.insight = Math.min(100, (p.insight || 0) + insight);
    if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 4);
    s.rel = Utils.clamp(s.rel + 1, -100, 100);
    this.mem(p, id, 'chat', '席地论道');
    Time.add(2);
    Log.add(`你与 ${d.name} 席地论道，一言一语皆有进益。（修为 +${Utils.fmtNum(gain)}，感悟 +${insight}）`, 'gain');
    Game.afterAction();
  },
  /** 游历途中的常驻 NPC 遭遇 */
  async encounter(p, id) {
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    s.met = true;
    Meta.see('npc', id);   // v6 图鉴
    // v19 前世闪回：转世者初逢前世恩怨者，旧忆翻涌
    if (s.pastLife && !s._flashback) {
      s._flashback = true;
      Log.add(`<b>前尘如潮——</b>你盯着 ${d.name} 的眉眼，一段不属于此生的记忆轰然翻涌：前世，你与TA之间，横着一笔血债。`, 'warn');
      Story.chron(`前世闪回：与 ${d.name} 的旧债翻涌`);
    }
    const greet = Narrative.greet();   // v5：道途礼数
    const recall = this.recallLine(p, id);   // v19 回忆杀
    Log.add(`途中遇上了 ${GameData.SECTS.find(x => x.id === d.sect) ? GameData.SECTS.find(x => x.id === d.sect).name + '的' : ''}<b>${d.name}</b>（${d.title}）。${greet ? `<span style="color:var(--text-faint)">（${greet}）</span>` : ''}`, 'event');
    if (s.grudge) { await this.peacemake(id); return; }
    const tier = this.tierOf(Math.max(0, s.rel));
    const choice = await UI.popup({
      title: `偶遇 · ${d.name}`,
      html: `${d.desc}<br>你们在 ${Utils.esc((GameData.MAPS.find(m => m.id === s.map) || {}).name || '山野')} 间打了个照面。${s.rel >= 8 ? `<br><span class="tip-line">关系：<b>${tier.name}</b>${recall ? '　' + d.name + '先开了口：' + recall : ''}</span>` : ''}`,
      options: [
        { text: '叙话论道', value: 'chat', primary: true },
        { text: '请教一二', value: 'ask' },
        { text: '转身离去', value: 'leave' },
      ],
    });
    if (choice === 'chat') {
      s.rel = Utils.clamp(s.rel + Utils.rand(2, 5), -100, 100);
      this.mem(p, id, 'chat', '途中叙话');   // v19 记忆
      Log.add(`你们席地论道，相谈甚欢。（交情 ${s.rel > 0 ? '+' : ''}${s.rel}）`, 'gain');
    } else if (choice === 'ask') {
      if (Utils.chance(45 + Math.max(0, s.rel))) {
        const gain = Math.round(60 * GameData.eco(p.realmIdx));
        Cultivate.addExp(p, gain);
        Log.add(`${d.name} 指点你几句关窍，你如醍醐灌顶。修为 +${Utils.fmtNum(gain)}。`, 'gain');
      } else {
        Log.add(`${d.name} 打了个哈哈，只说「道友自行参悟」，便没了下文。`, 'info');
      }
    } else {
      Log.add(`你与 ${d.name} 擦肩而过，各自赶路。`, 'info');
    }
    Game.afterAction();
  },
};

/* ======================================================================
 * §24.5 v19 个人线 PersonalSys（十位主要 NPC 的三幕角色弧光）
 * 关系档 + 境界达标即触发续谈；三幕全通获得永久加成（Stat.compute 聚合）。
 * ====================================================================== */
const PersonalSys = {
  /** 下一幕是否可触发；返回幕定义或 null */
  next(p, id) {
    const def = GameData.PERSONAL[id];
    if (!def || !p.personal) return null;
    const done = p.personal[id] || 0;
    if (done >= def.acts.length) return null;
    const act = def.acts[done];
    const s = NpcSys.state(p, id);
    if (!s || !s.alive || !s.met) return null;
    if (p.realmIdx < act.need.realm) return null;
    if (NpcSys.tierOf(Math.max(0, s.rel)).id !== act.need.tier) return null;
    return act;
  },
  anyAvailable(p) {
    if (!p.personal) return false;
    return Object.keys(GameData.PERSONAL).some(id => this.next(p, id));
  },
  /** 播放下一幕；结束后结算奖励并推进进度 */
  play(id) {
    const p = Game.player;
    const def = GameData.PERSONAL[id];
    const act = this.next(p, id);
    if (!def || !act) return;
    const nd = NpcSys.def(id);
    Log.add(`你赴 ${nd.name} 之约——【${act.title}】`, 'event');
    Story.play(GameData.STORIES[act.key], () => {
      p.personal[id] = (p.personal[id] || 0) + 1;
      const done = p.personal[id];
      const a = def.acts[done - 1];
      const r = a.reward || {};
      if (r.insight) p.insight = Math.min(100, (p.insight || 0) + r.insight);
      if (r.fortune) KarmaSys.addFortune(r.fortune);
      if (r.stones) Bag.addStones(r.stones);
      if (r.items) for (const [k, v] of Object.entries(r.items)) Bag.addItem(k, v);
      NpcSys.mem(p, id, 'line', a.title);
      Story.chron(`个人线【${def.arc}】${a.title} 落幕`);
      const gainTxt = [r.insight ? `感悟+${r.insight}` : '', r.fortune ? `气运+${r.fortune}` : '',
        r.stones ? `灵石+${Utils.fmtNum(r.stones)}` : '',
        r.items ? Object.entries(r.items).map(([k, v]) => `${(GameData.ITEMS[k] || {}).name || k}×${v}`).join('、') : ''].filter(Boolean).join('，');
      Log.add(`【${def.arc} · ${a.title}】落幕。${gainTxt ? `（${gainTxt}）` : ''}`, 'gain');
      if (done >= def.acts.length) {
        Log.add(`<b>【个人线终章】${def.title}</b> 全线落幕——${def.doneText}。（${this.fxText(def.fx)}）`, 'realm');
        UI.announce(`✦ 个人线 · ${def.arc} · 终 ✦`, 'gold');
        Ambience.sfx('rare');
      }
      Game.afterAction();
    });
  },
  fxText(fx) {
    const N = { atkPct: '攻击', defPct: '防御', hpPct: '气血', crit: '暴击', dodge: '闪避', pillPct: '丹效' };
    return Object.entries(fx || {}).map(([k, v]) =>
      k === 'stoneMult' ? `灵石获取 +${Math.round(v * 100)}%`
        : `${N[k] || k}${k.endsWith('Pct') ? ' +' + v + '%' : ' +' + v}`).join('，');
  },
  /** 已完成个人线的永久加成（Stat.compute 调用；stoneMult 由 Bag.addStones 消费） */
  bonusOf(p) {
    const agg = { atkPct: 0, defPct: 0, hpPct: 0, crit: 0, dodge: 0, pillPct: 0, stoneMult: 1 };
    if (!p || !p.personal) return agg;
    for (const [id, def] of Object.entries(GameData.PERSONAL)) {
      if ((p.personal[id] || 0) < def.acts.length) continue;
      for (const [k, v] of Object.entries(def.fx || {})) {
        if (k in agg) agg[k] += (k === 'stoneMult' ? v : v);
      }
    }
    return agg;
  },
};
window.PersonalSys = PersonalSys;
