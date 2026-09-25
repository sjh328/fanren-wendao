
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
        befriended: false, // v37（E240）：结交一次性——礼数只行一回，此后情谊走赠礼/论道温养
        pastLife: false,   // 前世恩怨（转世专属剧情）
        mem: [],           // v19 记忆条目 [{d,t,x}]
      };
    }
    return o;
  },
  def(id) { return GameData.NPCS.find(n => n.id === id) || null; },
  state(p, id) { return (p.npcs && p.npcs[id]) || null; },
  /** v19 专属台词矩阵：优先取 NPC_LINES（greet 按关系档三档取句，hostile 仅在结怨时命中），回落 null */
  lineFor(p, id, kind) {
    const L = (GameData.NPC_LINES || {})[id];
    if (!L || !L[kind] || !L[kind].length) return null;
    if (kind === 'greet') {
      const rel = (this.state(p, id) || {}).rel || 0;
      const tier = rel >= 70 ? 2 : rel >= 30 ? 1 : 0;   // v30：档位阈值对齐 relLabel（8/30/70/90）
      return L.greet[Math.min(tier, L.greet.length - 1)];
    }
    if (kind === 'hostile') {
      const st = this.state(p, id);
      if (!st || st.rel > -15) return null;
    }
    return Utils.pick(L[kind]);
  },
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
    // v29：档名与 TIERS 机制档对齐——原先两套口径并存（此处 60 称莫逆，机制档 70 才是知己）
    if (s.rel >= 90) return '生死之交';
    if (s.rel >= 70) return '莫逆';
    if (s.rel >= 30) return '友善';
    if (s.rel >= 8) return '相熟';
    if (s.rel > -15) return '萍水';
    if (s.rel > -40) return '冷漠';
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
  MEM_TYPE: { story: '剧情', spar: '切磋', gift: '赠礼', chat: '论道', save: '相救', betray: '背刺', kill: '杀戮', peace: '化解', line: '个人线', war: '战阵' },   // v33（E89）：补 war——v32 宗门大战结怨原未注册，人物志退化为「旧事」
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
      war: '「战阵之上刀剑无眼——今日相逢，倒要看看你还有几分锐气。」',
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
      line: this.lineFor(p, id, 'realm') || '「恭喜道友更上层楼。他日你登高之处，莫忘了今日同辈之人。」' };
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
      // v20 宿敌养成：与你结怨者追着你成长——落后越多，修得越凶
      // v36（E227）温和追赶：所有落后 NPC ×1.05~2.5（落后 1~30 小层）；与宿敌增益取 max 不叠乘，
      // 防「宿敌×2.5 再叠追赶×2.5」双乘失控——grudge 者维持现 ×1.5+ 强度只取高者
      {
        const myRp = p.realmIdx * 4 + p.layer;
        const hisRp = s.realmIdx * 4 + s.layer;
        const chaseMul = 1 + Utils.clamp(myRp - hisRp, 0, 30) * 0.05;
        if (s.grudge) {
          const grudgeMul = 1.5 + Utils.clamp((myRp - hisRp) * 0.1, 0, 1);
          gain *= Math.max(grudgeMul, chaseMul);
        } else if (chaseMul > 1) {
          gain *= chaseMul;
        }
      }
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
  /** v20 宿敌截胡：结怨者有几率抢走你历练中的好事（宝箱/机缘） */
  rivalSnatch(p) {
    const ids = Object.keys(p.npcs || {}).filter(id => p.npcs[id].grudge && p.npcs[id].alive);
    if (!ids.length) return false;
    if (!Utils.chance(Utils.clamp(ids.length * 5, 0, 20))) return false;
    const id = Utils.pick(ids);
    const d = this.def(id);
    this.mem(p, id, 'betray', '半路截胡');
    Log.add(`一道熟悉的身影快你一步——<b>${d.name}</b> 早候在此，将机缘掠了个干净，还朝你晃了晃手中之物！`, 'warn');
    return true;
  },
  /** v20 雷台了断：有宿怨且境界相当时，可约战雷台做个了断。
   *  v37（E248）：删 rel≤-60 硬门改 rel≤-20——原门槛近乎不可达（rel 只能靠连环大恶砸穿），
   *  复仇线形同虚设；狠度（rel 低于 -20 的部分）折算对方约战战力加成，「狠度进赔率不进门槛」 */
  canShowdown(p, id) {
    const s = this.state(p, id);
    if (!s || !s.grudge || !s.alive) return false;
    if (s.rel > -20) return false;
    const myRp = p.realmIdx * 4 + p.layer;
    const hisRp = s.realmIdx * 4 + s.layer;
    return Math.abs(hisRp - myRp) <= 2;
  },
  async showdown(id) {
    const p = Game.player;
    const d = this.def(id);
    // v38（E306）：止戈之誓——不上雷台
    if (typeof OathSys !== 'undefined' && OathSys.active(p, 'still')) { UI.toast('止戈之誓在手——雷台生死之约，皆非此道'); return; }
    if (!this.canShowdown(p, id) || Battle.active) return;
    const s = this.state(p, id);
    // v37（E248）：狠度进赔率——rel 低于 -20 的部分每 10 点折算对方战力 +4%（封顶 +32%）
    const fury = this.showdownFury(s);
    const ok = await UI.popup({
      title: `雷台了断 · ${d.name}`,
      html: `你们之间的仇怨已深。<br>约战雷台，做个了断——<b>胜者可夺对方一件随身法宝</b>，恩怨就此两清。<br>${fury > 0 ? `<span class="neg">仇怨愈狠，对方出手愈重（本战其战力 +${fury}%）。</span><br>` : ''}<span class="neg">若败，恩怨依旧，且伤势难免。</span>`,
      options: [{ text: '雷台相见', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    Log.add(`你向 <b>${d.name}</b> 递上雷台战书——恩怨纠葛，今日做个了断！`, 'warn');
    Story.chron(`与 ${d.name} 约战雷台`);
    Battle.start(null, { enemy: this.buildEnemy(p, id, fury), npcId: id, mode: 'confront', showdown: true, mapName: '雷台' });
    Game.afterAction();   // v35（E143）：先 start 后 afterAction——对齐 dungeon 模式，防节庆在开战前触发后被 Battle.start 静默丢弃
  },
  /** v37（E248）：雷台了断赔率——rel≤-20 起可约，低于 -20 的部分每 10 点对方战力 +4%，封顶 +32% */
  showdownFury(s) {
    return Utils.clamp(Math.floor(Math.max(0, -20 - (s.rel || 0)) / 10) * 4, 0, 32);
  },
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
  /** 危机相助：道侣 > 结拜（轮换） > 莫逆之交（v30：多人结拜原只认 sworn[0]，后结拜者永不出场） */
  tryAid(p, scene) {
    const swornAlive = (p.sworn || []).filter(id => (p.npcs[id] || {}).alive);
    const cand = p.partner
      || (swornAlive.length ? swornAlive[(p.counters.aidRot || 0) % swornAlive.length] : null)
      || Object.keys(p.npcs || {}).find(id => p.npcs[id].alive && p.npcs[id].rel >= 50);
    if (!cand) return null;
    if (p.partner || swornAlive.length) p.counters.aidRot = (p.counters.aidRot || 0) + 1;
    const s = this.state(p, cand);
    if (!s || !s.alive) return null;
    if (!Utils.chance(Utils.clamp(25 + Math.max(0, s.rel) * 0.3, 0, 70))) return null;
    s.rel = Utils.clamp(s.rel + 4, -100, 100);
    this.mem(p, cand, 'save', '危难相救');   // v19 记忆
    return { id: cand, name: this.def(cand).name };
  },
  /** v38（E312）：名动一方（声望 ≥120）——初见自带三分敬意（一次性，五点交情随初见入账）
   *  v39（E358）：120 门槛与 RepSys.LEVELS 新「名动一方」显示档对齐（机制数值不动，仅档名归位） */
  firstMeetBoost(p, id) {
    const s = this.state(p, id);
    if (!s || s.met) return 0;
    if ((p.reputation || 0) >= 120) { s.rel = Utils.clamp((s.rel || 0) + 5, -100, 100); return 5; }
    return 0;
  },
  afterSpar(p, id, won) {
    const s = this.state(p, id);
    if (!s) return;
    this.firstMeetBoost(p, id);   // v38（E312）
    s.met = true;
    // v35（E131）：落败不再加好感——原败也 +2，配合无限切磋构成零成本好感印钞机；
    // 胜 +5 不变（且受每日一场限制）
    if (won) s.rel = Utils.clamp(s.rel + Math.round(5 * (typeof OathSys !== 'undefined' ? OathSys.relMul(p) : 1)), -100, 100);   // v38（E306）：独行之道 ×1.3
    this.mem(p, id, 'spar', won ? '切磋获胜' : '切磋落败');   // v19 记忆
    if (won) s.sparWins = (s.sparWins || 0) + 1; else s.sparLoses = (s.sparLoses || 0) + 1;   // v20 切磋段位
  },
  /** v39（E360）：共历大事折好感——「一起打过的仗」补 70→90 磨段的被动来源。
   *  在场相熟（rel≥30 且 <90）随机 1~2 名 rel+2 并记共历条目（mem 单源）。 */
  comradesRelBonus(p, memTxt) {
    const cands = Object.keys(p.npcs || {}).filter(id => {
      const s = p.npcs[id];
      return s && s.alive && s.met && (s.rel || 0) >= 30 && (s.rel || 0) < 90;
    });
    if (!cands.length) return;
    const n = Math.min(cands.length, Utils.rand(1, 2));
    for (let i = 0; i < n; i++) {
      const id = cands.splice(Utils.rand(0, cands.length - 1), 1)[0];
      const s = p.npcs[id];
      s.rel = Utils.clamp((s.rel || 0) + 2, -100, 100);
      this.mem(p, id, 'war', memTxt || '共历大事');
      Log.add(`共历之事传到 ${this.def(id).name} 耳中——TA 与你的交情又深了一分（交情 +2）。`, 'info');
    }
  },
  /** NPC 之敌（战斗用） */
  /** v36（E227）：NPC 综合战力估算——从 buildEnemy 属性基式（hp=(55+rp^1.6×5)×mod、atk=(6+rp×2.6)×mod、
   *  def=(4+rp×2.2)×mod、spd=7+rp×0.9，mod=0.92+talent×0.04）反推，再按 Stat.power 同权重式折算，
   *  与玩家 Stat.power(p) 同量纲可比（榜行「可敌/略逊/远逊」三档由此判定；境界排序口径不受影响） */
  npcCombatPower(p, id) {
    const s = p.npcs[id];
    if (!s) return 0;
    const rp = Utils.clamp(s.realmIdx * 4 + s.layer, 0, 60);
    // v38（E282）修瑕：基式对齐 buildEnemy（hp=(65+rp^1.6×5.2)、atk=(7+rp×2.7)、def=(4+rp×1.7)、
    // spd=(7+rp×0.9)×mod，mod 同含 fury 语义外的 talent 项）——原用旧基式（55+5rp^1.6 / 6+2.6rp /
    // 4+2.2rp、spd 不乘 mod）且漏乘 mod，问剑/榜行三档成算系统性失真
    const mod = 0.92 + (this.def(id) || { talent: 3 }).talent * 0.04;
    const atk = Math.round((7 + rp * 2.7) * mod);
    const def = Math.round((4 + rp * 1.7) * mod);
    const hp = Math.round((65 + Math.pow(rp, 1.6) * 5.2) * mod);
    const spd = Math.round((7 + rp * 0.9) * mod);
    return Math.round(atk * 2 + def * 1.5 + hp * 0.3 + spd * 1 + 8 * 2 + 5 * 1.5 + 8 * 0.5);
  },
  buildEnemy(p, id, fury = 0) {
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s) return buildMonster('m_zeiren');
    const rp = Utils.clamp(s.realmIdx * 4 + s.layer, 0, 60);
    const mod = (0.92 + d.talent * 0.04) * (1 + (fury || 0) / 100);   // v37（E248）：fury=雷台了断狠度加成（默认 0，其余调用不受影响）
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
    // v38（E318）：转世劫难「群邪环伺」——NPC 之敌同样 hp/atk ×1.10
    const foeMul = (p.reinc && Array.isArray(p.reinc.trials) && p.reinc.trials.includes('foe')) ? 1.1 : 1;
    return {
      id: null, npcId: id, name: d.name, elite: false, power: rp,
      realmLabel: GameData.REALM_NAMES[realmIdx] + GameData.LAYER_NAMES[Utils.clamp(rp % 4, 0, 3)],
      hpMax: Math.round((65 + Math.pow(rp, 1.6) * 5.2) * mod * foeMul),
      atk: Math.round((7 + rp * 2.7) * mod * foeMul),
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
      // v32 修瑕（E45）：道侣/结拜殒命原无叙事收尾——p.partner 永挂、江湖页仍显「道侣」、共修静默失效
      if (p.partner === id) {
        p.partner = null;
        Log.add(`曾与你结为道侣的 ${d.name} 殒命于你手——情分尽付尘土，自此江湖独行。（道侣之位已空）`, 'loss');
        Story.chron(`道侣 ${d.name} 殒命于你手`);
      }
      if ((p.sworn || []).includes(id)) {
        p.sworn = p.sworn.filter(x => x !== id);
        Log.add(`义结金兰的 ${d.name} 就此长辞——结义之情，唯余一炷心香。`, 'loss');
      }
    } else {
      const hostileLine = this.lineFor(p, id, 'hostile');
    Log.add(`${d.name} 重伤遁走，临行前留下一句${hostileLine ? hostileLine : '「此事没完」'}——恩怨愈结愈深。（孽障 +10）`, 'warn');
    }
  },
  /** v32 修瑕（E41）：宗门大战阵斩——此前胜后 rel/grudge/记忆全不变（「NPC 牵连」打完即忘） */
  onWarKill(p, id) {
    const s = this.state(p, id);
    const d = this.def(id);
    if (!s || !d || !s.alive) return;
    s.rel = Utils.clamp(s.rel - 20, -100, 100);
    s.grudge = true;
    this.mem(p, id, 'war', '宗门战阵前兵刃相见');
    KarmaSys.addKarma(3, true);
    Log.add(`阵前被你击败的 ${d.name} 满身血污地退走——同坛论道之谊就此断绝，此仇他记下了。（孽障 +3）`, 'warn');
  },
  /** 一战了断：胜则恩怨两清（v20 雷台了断：另夺法宝彩头） */
  onConfrontWin(p, id, showdown = false) {
    const s = this.state(p, id);
    if (!s) return;
    s.grudge = false;
    s.pastLife = false;
    s.rel = Utils.clamp(s.rel + 15, -100, 100);
    this.mem(p, id, 'peace', showdown ? '雷台了断' : '一战了断');   // v19 记忆
    KarmaSys.addKarma(2, true);   // v30：正当决斗只记微业——原 +8 与「散财化解零孽障」倒挂，玩家系统性规避了断
    Log.add(`一战之后，恩怨两清。${(this.def(id) || {}).name || ''} 收起敌意，与你相顾无言。（孽障 +2）`, 'system');
    if (showdown) {
      p.rankHonor = (p.rankHonor || 0) + 1;   // v37（E244）：雷台了断胜局折算天骄榜功勋 +1
      // v36（E214）：彩头随境下限——grade 1~3 恒定成中高境分解货；r0~1 → 灵级起步、r2~3 → 玄级、
      // r4+ → 地级起步（与 betray 的 tier 换算 :474 同族口径）；grade 池上限维持 3——天级及以上
      // artifact 存量未盘点，不为彩头引入未验证资产；池空回落 gMin−1
      const gMin = Utils.clamp(Math.floor(s.realmIdx / 2) + 1, 1, 3);
      const inPool = g => Object.keys(GameData.ITEMS).filter(k => GameData.ITEMS[k].type === 'artifact' && (GameData.ITEMS[k].grade || 0) >= g && (GameData.ITEMS[k].grade || 0) <= 3);
      let pool = inPool(gMin);
      if (!pool.length && gMin > 1) pool = inPool(gMin - 1);
      const art = Utils.pick(pool);
      Bag.addItem(art, 1);
      Log.add(`雷台之约如约兑现——你收下 ${(GameData.ITEMS[art] || {}).name || '一件法宝'} 作为彩头。胜负已分，恩怨两讫。`, 'gain');
      Story.chron(`雷台了断胜${(this.def(id) || {}).name || ''}`);
      UI.announce('✦ 雷台了断 ✦', 'gold');
    }
  },
  /* ---------- 社交动作 ---------- */
  /** v35（U1）：礼数成本锚定双方境界较低一方——原按 NPC 境界指数膨胀（对方自行涨到 r8 后
   *  一份寻常礼 130 万灵石换 +1~3 好感），偏好系统对高境修士事实失效 */
  socialEco(p, s) { return GameData.stoneEco(Math.min(p.realmIdx || 0, s.realmIdx || 0)); },
  befriendCost(p, id) {
    const s = this.state(p, id);
    return s ? Math.round(20 * this.socialEco(p, s)) : 20;
  },
  async befriend(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    if (this.isAway(p, id)) { UI.toast(`${d.name} 行游在外，旬末方归`); return; }
    // v37（E240）：结交一次性——原无日限无上限，+8~14/次可把社交阶梯整条买穿（24 人全扫
    // 即可囤满好感轴）；礼数只行一回，此后情谊归赠礼/论道/切磋等温养互动
    if (s.befriended) { UI.toast('尔等早已结识——情谊当以赠礼与论道温养'); return; }
    // v38（E306）：独行之道——不结新交
    if (typeof OathSys !== 'undefined' && OathSys.active(p, 'solo')) { UI.toast('独行之道在身——新朋之礼，皆非此道'); return; }
    const cost = this.befriendCost(p, id);
    const ok = await UI.popup({
      title: `结交 · ${d.name}`,
      html: `${d.desc}<br>对方乃 <b>${GameData.REALM_NAMES[s.realmIdx]}${GameData.LAYER_NAMES[s.layer]}</b> 修士，备一份寻常修士不舍得用的见面礼，可搏个善缘。<br>需灵石 <span class="hl">${Utils.fmtNum(cost)}</span>。`,
      options: [{ text: '备礼相赠', value: true, primary: true }, { text: '作罢', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    this.firstMeetBoost(p, id);   // v38（E312）：名动一方初见敬意
    s.met = true;
    Meta.see('npc', id);   // v6 图鉴；v34（E120）：挪到确认成交后——原弹确认框前即解锁，「作罢」/灵石不足也录了图鉴（萍水未谋面却已入册，图鉴完成度虚增）
    s.befriended = true;   // v37（E240）：结交印记——一次性通道就此关闭（v38（E285）：重复的 s.met 赋值删除）
    // v28 联动：声望先于人先——名望高者结交更受欢迎，恶名远扬者见面先减三分
    const rep = p.reputation || 0;
    const repAdj = rep >= 80 ? 5 : rep >= 30 ? 3 : rep < -30 ? -5 : rep < 0 ? -2 : 0;
    // v39（E360）：同门之谊——NPCS.sect 字段首次接线（青云 4/丹霞 3/万宝 4/磐岩 2/周天 2）
    const sameSect = !!(d.sect && p.sect && d.sect === p.sect.id);
    const relBefore = s.rel;   // v30：日志改报本次增量（原打印累计总量，「交情 +37」实为 +8~14）
    s.rel = Utils.clamp(s.rel + Utils.rand(8, 14) + repAdj + (sameSect ? 5 : 0), -100, 100);
    p.counters.befriends = (p.counters.befriends || 0) + 1;   // v11 剧情计数
    this.mem(p, id, 'chat', sameSect ? '同门之谊' : '结交之谊');   // v19 记忆
    const relDelta = s.rel - relBefore;
    Log.add(`你以礼相待，与 ${d.name} 相谈甚欢。${sameSect ? '同门相见，倍觉亲切（<b>同门之谊</b>，交情 +5）。' : ''}${repAdj ? `（${repAdj > 0 ? '你的名望令对方高看一眼，' : '你的恶名令对方心存戒备，'}交情 ${repAdj > 0 ? '+' : ''}${repAdj}）` : ''}（交情 ${relDelta > 0 ? '+' : ''}${relDelta}${s.rel ? `，现 ${s.rel}` : ''}）`, 'gain');
    Game.afterAction();
  },
  async spar(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive || Battle.active) return;
    // v35（U1）：行游在外者不在山中——江湖页互动一并拦下（原只挡偶遇，机制纯装饰）
    if (this.isAway(p, id)) { UI.toast(`${d.name} 行游在外，旬末方归`); return; }
    // v38（E306）：止戈之誓——不切磋
    if (typeof OathSys !== 'undefined' && OathSys.active(p, 'still')) { UI.toast('止戈之誓在手——刀兵切磋，皆非此道'); return; }
    // v35（E131）修瑕：切磋原零成本无限刷好感（胜 +5、败 +2，连输 45 场可把任意渡劫修士刷到
    // 莫逆）——赠礼/论道/结交三套社交被免费切磋完全支配。现每 NPC 每日限一场；落败不加好感
    // （以武会友，胜负皆不损交情），胜 +5 不变，「三胜指点」回归阶段性目标
    const today = Math.floor(p.day || 0);
    if (s.sparDay === today) { UI.toast(`今日已与${d.name}切磋过——武道贵精不贵多，明日再来讨教`); return; }
    // v36（E198）：每日 3 场跨 NPC 总限——E131 只限单 NPC 频次，24 人同日各一场的总量通道依旧
    // 零时间零灵石成本（r3 全扫日修为 21025 ≈ 闭关日均 12.7 倍）；形态对齐 SectSys.claimLeft
    // v38（E279）修瑕：总限判定移到单 NPC 落章之前——原 s.sparDay 先写、总限后拦，被拦的那场
    // 也烧掉该 NPC 当日切磋配额（先点满 3 场再切此人 → 此人当日永不可切）
    if (p._sparCountDay !== today) { p._sparCountDay = today; p._sparCount = 0; }
    if ((p._sparCount || 0) >= 3) { UI.toast('今日已三度以武会友——筋骨酸软，明日再战'); return; }
    s.sparDay = today;
    p._sparCount = (p._sparCount || 0) + 1;
    // v39（E360）：同门切磋——首回合战意 +1（同门印证，气机相熟）
    if (d.sect && p.sect && d.sect === p.sect.id) p._sameSectSpar = today;
    this.firstMeetBoost(p, id);   // v38（E312）：名动一方初见敬意
    s.met = true;
    Meta.see('npc', id);   // v6 图鉴
    const sparLine = this.lineFor(p, id, 'spar');
    Log.add(`你向 ${d.name} 递出战书，只较技，不拼命。${sparLine ? `<span style="color:var(--text-faint)">${d.name}：${sparLine}</span>` : ''}`, 'event');
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
      Battle.start(null, { enemy: this.buildEnemy(p, id), npcId: id, mode: 'hunt', ambush: true, mapName: '背刺之地' });
      Game.afterAction();   // v35（E143）：先 start 后 afterAction——对齐 dungeon 模式，防节庆在开战前触发后被 Battle.start 静默丢弃
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
    if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 5, '背刺得手，午夜梦回');   // v37（E245）：背刺得手 +5——心魔新行为来源
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
    // v38（E306）：独行之道——不结新交
    if (typeof OathSys !== 'undefined' && OathSys.active(p, 'solo')) { UI.toast('独行之道在身——结义之盟，皆非此道'); return; }
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
    // v34（E3）：义结金兰是人生峰值事件，配得上一次全屏仪式（复用 realmShow/announce/sfx 现成轮子）
    UI.realmShow('义结金兰 · 祸福与共 · 此生共进退', '#e8c56a');
    UI.announce(`✦ 义 结 金 兰 · ${d.name} ✦`, 'gold');
    Ambience.sfx('rare');
    Log.add(`你与 <b>${d.name}</b> 撮土为香，结为异姓道侣兄妹！此生共进退。`, 'system');
    if (typeof Story !== 'undefined') Story.chron(`与 ${d.name} 义结金兰`);   // v33（E92）：人生大事入年表
    Game.afterAction();
  },
  async becomeDao(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    // v38（E306）：独行之道——不结新交
    if (typeof OathSys !== 'undefined' && OathSys.active(p, 'solo')) { UI.toast('独行之道在身——道侣之约，皆非此道'); return; }
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
    // v34（E3）：结发大典——全屏异象 + 公告 + 音效，情感线的峰值时刻不再只是一行日志
    UI.realmShow('红烛映照 · 道音为证 · 愿以此心共证长生', '#e88aa0');
    UI.announce(`✦ 结 发 道 侣 · ${d.name} ✦`, 'gold');
    Ambience.sfx('rare');
    Log.add(`红烛映照，道音为证——你与 <b>${d.name}</b> 正式结为道侣！仙途多一知己，死劫多一臂之助。`, 'system');
    if (typeof Story !== 'undefined') Story.chron(`与 ${d.name} 结为道侣`);   // v33（E92）：人生大事入年表
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
        Battle.start(null, { enemy: this.buildEnemy(p, id), npcId: id, mode: 'confront', mapName: '前世恩怨了断之地' });
        Game.afterAction();   // v35（E143）：先 start 后 afterAction——对齐 dungeon 模式，防节庆在开战前触发后被 Battle.start 静默丢弃
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
  /** v20 送礼偏好（类别：pill 丹药 / material 灵材 / artifact 法宝 / talisman 符箓） */
  NPC_LIKES: {
    n1: 'artifact', n2: 'pill', n3: 'material', n4: 'artifact', n5: 'artifact', n6: 'material',
    n7: 'talisman', n8: 'artifact', n9: 'talisman', n10: 'material', n11: 'pill', n12: 'artifact',
    n13: 'pill', n14: 'artifact', n15: 'material', n16: 'material', n17: 'talisman', n18: 'material',
    n19: 'artifact', n20: 'material', n21: 'talisman', n22: 'pill', n23: 'pill', n24: 'artifact',
  },
  LIKE_NAMES: { pill: '丹药', material: '灵材', artifact: '法宝', talisman: '符箓' },
  async gift(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    if (!s.met) { UI.toast('素未谋面，何谈赠礼'); return; }
    if (Battle.active) return;
    if (this.isAway(p, id)) { UI.toast(`${d.name} 行游在外，旬末方归`); return; }
    // v35（U1）：成本锚定双方境界较低一方（原按 NPC 境界指数膨胀，高境修士一份礼 130 万起）
    const cost = Math.round(30 * this.socialEco(p, s));
    const like = this.NPC_LIKES[id];
    const catName = this.LIKE_NAMES[like] || '';
    // v35（U1）：偏好消耗改为取该类别中「价最低」的一件——原取 Object.keys 首个命中（包里最早的），
    // 可能无声烧掉毕业法宝/保命金光符
    const likeItemId = like ? Object.keys(p.bag)
      .filter(k => GameData.ITEMS[k] && GameData.ITEMS[k].type === like)
      .sort((a2, b2) => (GameData.ITEMS[a2].price || 0) - (GameData.ITEMS[b2].price || 0))[0] || null : null;
    const likeCost = cost * 2;
    const tier = this.tierOf(Math.max(0, s.rel));
    const midautumn = typeof FestivalSys !== 'undefined' && FestivalSys.is(p, 'zhongqiu');
    const gain0 = { known: Utils.rand(3, 6), friend: Utils.rand(2, 4), bosom: Utils.rand(1, 3), sworn: 2 }[tier.id] || 2;   // v32 修瑕（E46）：sworn 档 +1→+2——终章需 rel≥90，原每礼 +1 使全通需数百次赠礼（与「续谈」即时性落差过大）
    const choice = await UI.popup({
      title: `赠礼 · ${d.name}`,
      html: `${this.dialogText(d.temper, 'greeting')}<br><span class="tip-line">TA 平素喜好：${catName || '随缘'}——投其所好，事半功倍。</span><br><span class="tip-line">关系愈深，礼愈难打动人——相交贵在知心。${midautumn ? '<b>今日中秋：情谊加倍！</b>' : ''}</span>`,
      options: [
        { text: `寻常贺礼（${Utils.fmtNum(cost)}灵石）`, value: 'normal', primary: true },
        { text: `投其所好${likeItemId ? `·${GameData.ITEMS[likeItemId].name}` : `·${catName}（未备）`}（${Utils.fmtNum(likeCost)}灵石）`, value: 'like' },   // v29：明示将送出哪件，防顶阶法宝被盲送
        { text: '作罢', value: false },
      ],
    });
    if (!choice) return;
    let gain = gain0;
    let likeNote = '';
    if (choice === 'like') {
      if (!likeItemId) { UI.toast(`需先备一份${catName}在包中`); return; }
      if (!Bag.spendStones(likeCost)) { UI.toast('灵石不足'); return; }
      const itemName = GameData.ITEMS[likeItemId].name;
      Bag.removeItem(likeItemId, 1);
      gain = Math.round(gain * 1.5);
      // v35（E158）：中秋「情谊加倍」统一乘算口径——原 like 路径走 +gain0 加法（实为 ×2.5），
      // 与寻常礼 ×2 两套实发并存；现两条路径统一「各自基数 ×2」
      if (midautumn) gain *= 2;
      likeNote = `——${itemName} 送到了心坎上`;
    } else {
      if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
      if (midautumn) gain *= 2;
    }
    const before = this.tierOf(Math.max(0, s.rel)).name;
    const relBefore2 = s.rel;
    gain = Math.round(gain * (typeof OathSys !== 'undefined' ? OathSys.relMul(p) : 1));   // v38（E306）：独行之道——既有情谊增长 +30%
    s.rel = Utils.clamp(s.rel + gain, -100, 100);
    this.mem(p, id, 'gift', '赠礼之谊');
    const after = this.tierOf(Math.max(0, s.rel)).name;
    Log.add(`你向 ${d.name} 奉上礼物${likeNote}。${this.lineFor(p, id, 'gift') || this.dialogText(d.temper, 'gift')}（交情 ${s.rel - relBefore2 > 0 ? '+' : ''}${s.rel - relBefore2}${after !== before ? `，关系升为【<b>${after}</b>】` : ''}）`, 'gain');
    if (after !== before) Ambience.sfx('rare');
    Game.afterAction();
  },
  /** v39（E361）：道侣心事线——结发（rel=100）后的情谊溢出改记 heartPool，每累计 10 点推进一段
   *  心事（共三段：旧物→攻击 +3% / 心结→双修感悟 +1/次 / 同修之约→双修修为 +5%，均 ≤5% 档）；
   *  三段毕后溢出照旧 clamp 不再累积。返回 { rel: 实际交情增量, heart: 入池心事点 } */
  heartGain(p, id, delta) {
    const s = this.state(p, id);
    if (!s) return { rel: 0, heart: 0 };
    const before = s.rel;
    s.rel = Utils.clamp(before + delta, -100, 100);
    const relDelta = s.rel - before;
    let heart = 0;
    if (delta > 0 && relDelta < delta && p.partner === id && (s.heart || 0) < 3) {
      heart = delta - relDelta;
      s.heartPool = (s.heartPool || 0) + heart;
      while ((s.heartPool || 0) >= 10 && (s.heart || 0) < 3) {
        s.heartPool -= 10;
        s.heart = (s.heart || 0) + 1;
        this.heartEvent(p, id, s.heart);
      }
    }
    return { rel: relDelta, heart };
  },
  /** v39（E361）：心事段事件——popup 二选 + mem + 年表（人物志单源 mem） */
  async heartEvent(p, id, stage) {
    const d = this.def(id);
    const EVENTS = [
      { name: '旧物', text: `${d.name} 从匣底取出一枚旧物，托在你掌心——那是TA踏入修行前最珍视的东西。「如今用不上了……予你。」`, opts: ['郑重收下，贴身佩戴', '为它系上一条新穗'] },
      { name: '心结', text: `${d.name} 说起一桩积年的心结，说到一半又摇头：「罢了，都过去了。」你握住TA的手，没有追问。`, opts: ['静静听完', '陪TA走一段夜路'] },
      { name: '同修之约', text: `${d.name} 望向云海尽头：「来日你我皆登高处，再回头看看今日。」——这是一场无声的约定。`, opts: ['击掌为誓', '「一言为定」'] },
    ];
    const ev = EVENTS[stage - 1] || EVENTS[0];
    const FX = { 1: '旧物随身——道侣心意所系，攻击 +3%', 2: '心结既解——此后每次双修感悟 +1', 3: '同修之约既立——此后双修修为 +5%' };
    const pick = await UI.popup({
      title: `道侣心事 · ${ev.name}（${stage}/3）`,
      html: `${ev.text}<br><span class="tip-line">· ${FX[stage]}</span>`,
      options: [...ev.opts.map((t, i) => ({ text: t, value: i, primary: i === 0 })), { text: '藏在心里', value: -1 }],
    });
    this.mem(p, id, 'story', `道侣心事 · ${ev.name}`);
    if (typeof Story !== 'undefined' && Story.chron) Story.chron(`道侣心事 · ${ev.name}`);
    Log.add(`【心事 · ${ev.name}】你与 ${d.name} 之间又近了一层——${FX[stage]}。${pick >= 0 ? `（你选择了「${ev.opts[pick]}」）` : ''}`, 'event');
    Game.afterAction();
  },
  /** v20 道侣共修：每三十日一次双修机缘；偶发心愿 */
  async companionCheck(p) {
    if (!p || !p.partner || Battle.active) return;
    const s = this.state(p, p.partner);
    if (!s || !s.alive) return;
    const today = Math.floor(p.day || 0);
    const last = p._daoCultDay == null ? -999 : p._daoCultDay;
    if (today - last < 30) return;
    p._daoCultDay = today;
    const d = this.def(p.partner);
    const gain = Math.round(70 * GameData.eco(p.realmIdx) * (0.8 + d.talent * 0.08) * 2);
    // v39（E361）：心事段奖励——段3 双修修为 +5%、段2 双修感悟 +1/次
    const hg = this.heartGain(p, p.partner, 2);
    const bonusGain = Math.round(gain * ((s.heart || 0) >= 3 ? 0.05 : 0));
    const realGain = gain + bonusGain;
    Cultivate.addExp(p, realGain);
    if ((s.heart || 0) >= 2) Cultivate.addInsight(p, 1, false);
    this.mem(p, p.partner, 'chat', '双修机缘');
    // v39（E361）：结发后交情已满——溢出走心事线，不再播报虚假「交情 +N」
    const relTxt = hg.rel > 0 ? `交情 +${hg.rel}` : (hg.heart > 0 ? `情意愈笃（心事 +${hg.heart}）` : '情意愈笃');
    Log.add(`【双修】你与 ${d.name} 席地对坐，两道真气交缠共进——修为 +${Utils.fmtNum(realGain)}。（${relTxt}${(s.heart || 0) >= 2 ? '、感悟 +1' : ''}）`, 'gain');
    if (Utils.chance(20)) await this.companionOuting(p, d, s);   // v30：道侣出游
    if (Utils.chance(30)) await this.companionWish(p, d, s);
  },
  /** v30 道侣出游：双修之外的同行机缘——三处去处各有各的收益（与心愿共用 30 日节拍） */
  async companionOuting(p, d, s) {
    const spots = [
      { name: '夜市灯河', act: '提灯逛一圈夜市', ok: () => { KarmaSys.addFortune(2); return '人间的灯火映在TA眼底——你忽然觉得，修行路上最难得的不是机缘，是有人陪你看灯火。（气运 +2）'; } },
      { name: '秘泉野浴', act: '寻一处无人的灵泉', ok: () => { p.hp = Stat.compute(p).maxHp; p.mp = Stat.compute(p).maxMp; return '灵泉洗去一路风尘，气血灵力尽复，连经脉都暖了几分。（状态尽复）'; } },
      { name: '断崖论剑', act: '与TA印证一场', ok: () => { Cultivate.addInsight(p, 4, false); this.heartGain(p, p.partner, 3); return '胜负不重要——重要的是TA接住了你每一剑。印证归来，彼此又懂了几分。（感悟 +4，交情/心事 +3）'; } },
    ];
    const spot = Utils.pick(spots);
    const ok = await UI.popup({
      title: `道侣出游 · ${d.name}`,
      html: `TA 提议：去${spot.name}——${spot.act}。<br><span class="tip-line">· 同行一日，各有造化。</span>`,
      options: [{ text: '同 去', value: true, primary: true }, { text: '改日再说', value: false }],
    });
    if (!ok) return;
    Time.add(1);
    const line = spot.ok();
    this.mem(p, p.partner, 'chat', '同行之谊');
    Log.add(`【出游 · ${spot.name}】${line}`, 'gain');
    Game.afterAction();
  },
  async companionWish(p, d, s) {
    const wishes = [
      { text: '寻一味灵药', need: { m_lingcao: 2 }, rel: 8, ok: () => KarmaSys.addFortune(1) },
      { text: '听你说说外头的见闻', need: null, rel: 5, ok: () => { Cultivate.addInsight(p, 3, false); } },
      { text: '陪TA饮一壶好茶', cost: Math.round(50 * this.socialEco(p, s)), rel: 6, ok: null },
    ];
    const w = Utils.pick(wishes);
    const needTxt = w.need ? Object.entries(w.need).map(([k, n]) => `${(GameData.ITEMS[k] || {}).name}×${n}`).join('、')
      : (w.cost ? `${Utils.fmtNum(w.cost)} 灵石` : '只需陪伴');
    const ok = await UI.popup({
      title: `道侣心愿 · ${d.name}`,
      html: `${this.dialogText(d.temper, 'greeting')}<br>TA 今年的心愿：<b>${w.text}</b>（需 ${needTxt}）`,
      options: [{ text: '了却心愿', value: true, primary: true }, { text: '来日再补', value: false }],
    });
    if (!ok) {
      s.rel = Utils.clamp(s.rel - 2, -100, 100);
      Log.add(`${d.name} 念了念今年的心愿，看了你一眼，没说什么。（交情 -2）`, 'warn');
      Game.afterAction();
      return;
    }
    if (w.need) {
      for (const [k, n] of Object.entries(w.need)) if (Bag.count(k) < n) { UI.toast('物件不齐，心愿暂且记下'); return; }
      for (const [k, n] of Object.entries(w.need)) Bag.removeItem(k, n);
    } else if (w.cost) {
      if (!Bag.spendStones(w.cost)) { UI.toast('灵石不足，心愿暂且记下'); return; }
    }
    const hgW = this.heartGain(p, p.partner, w.rel);
    this.mem(p, p.partner, 'story', `了却心愿：${w.text}`);
    if (w.ok) w.ok();
    KarmaSys.addFortune(1);
    const wishRelTxt = hgW.rel > 0 ? `交情 +${w.rel}` : (hgW.heart > 0 ? `情意愈笃（心事 +${hgW.heart}）` : '情意愈笃');
    Log.add(`你了却了 ${d.name} 的心愿——TA 笑得像捡到了整个春天。（${wishRelTxt}，气运 +1）`, 'gain');
    Story.chron(`道侣心愿：${w.text}`);
    Game.afterAction();
  },
  /** v20 切磋段位：三胜之后可请其指点 */
  canLearnFrom(p, id) {
    const s = this.state(p, id);
    return s && s.alive && (s.sparWins || 0) >= 3 && !s.tutored;
  },
  learnFrom(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!this.canLearnFrom(p, id)) return;
    const insight = 12 + s.realmIdx * 3;
    s.tutored = true;
    Cultivate.addInsight(p, insight, false);   // v37（E264）：感悟增发收口单源（三胜倾囊=外源感悟）
    this.mem(p, id, 'chat', '三胜倾囊相授');
    Time.add(3);
    Log.add(`${d.name} 与你三度交手，终认你可堪造就——将压箱底的体悟倾囊相授！（突破感悟 +${insight}）`, 'gain');
    UI.toast(`感悟 +${insight}`);
    Game.afterAction();
  },
  /** v19 论道：以时间为束，换修为与感悟（v36 E197：收益改自随乘数、与档位解耦——「关系愈深倾囊相授」由感悟与好感承接） */
  async discuss(id) {
    const p = Game.player;
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    if (!s.met) { UI.toast('素未谋面，何谈论道'); return; }
    if (Battle.active) return;
    if (this.isAway(p, id)) { UI.toast(`${d.name} 行游在外，旬末方归`); return; }   // v35（U1）
    const tier = this.tierOf(Math.max(0, s.rel));
    if (s.rel < 0) { UI.toast('对方对你心怀芥蒂，无意与你论道'); return; }   // v32 修瑕（E44）：原 tierOf(Math.max(0,s.rel)) 恒 ≥known——cold/foe 分支永不触发（结怨者仍可论道）
    if (tier.id === 'known') {
      UI.toast('交情尚浅，对方只肯泛泛而谈');
      return;
    }
    // v36（E197）：每 NPC 每日一场——原无日限无成本，24 人轮刷日均 56~89.6×eco（修炼的 7~11.2 倍），
    // v34 以 ×5.4 校准的境界曲线被整条旁路；形态对齐切磋 E131 日限
    const today = Math.floor(p.day || 0);
    if (s._discussDay === today) { UI.toast(`今日已与${d.name}论道过——大道贵悟不贵频，明日再叙`); return; }
    s._discussDay = today;
    const insight = (tier.id === 'sworn' ? 4 : tier.id === 'bosom' ? 3 : 2) + (d.sect && p.sect && d.sect === p.sect.id ? 1 : 0);   // v39（E360）：同门论道 +1 感悟
    const gain = Math.round(Cultivate.baseGain(p) * (1.0 + d.talent * 0.08));   // v36（E197）：自随乘数——talent 1~5 → 1.08~1.4× baseGain，收益与 rel 解耦断「越论道越要论道」自增强环
    Cultivate.addExp(p, gain);
    Cultivate.addInsight(p, insight, false);   // v37（E264）：感悟增发收口单源（论道=外源感悟）
    if (typeof DaoSys !== 'undefined') DaoSys.gain(p, 4);
    s.rel = Utils.clamp(s.rel + Math.round(1 * (typeof OathSys !== 'undefined' ? OathSys.relMul(p) : 1)), -100, 100);   // v38（E306）：独行之道 ×1.3
    this.mem(p, id, 'chat', '席地论道');
    Time.add(2);
    const disLine = this.lineFor(p, id, 'discuss');
    Log.add(`你与 ${d.name} 席地论道，一言一语皆有进益。${disLine ? `<span style="color:var(--text-faint)">${disLine}</span>` : ''}（修为 +${Utils.fmtNum(gain)}，感悟 +${insight}）`, 'gain');
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
    // v19 前世事件·第二幕：遗物托付（闪回后的再次相逢）
    if (s.pastLife && s._flashback && !s._relicGiven && Utils.chance(60)) {
      s._relicGiven = true;
      const gainExp = Math.round(120 * GameData.eco(p.realmIdx));
      const choice = await UI.popup({
        title: `前世遗物 · ${d.name}`,
        html: `（${d.name} 从袖中取出一件旧物——那纹路，你的前世再熟悉不过。）<br>「这是……你前世的遗物。当年你倒下时，它滚到我脚边。<br>三百年了，物归原主。」<br><br>收下，还是婉拒？`,
        options: [
          { text: '收下遗物', value: 'take', primary: true },
          { text: '婉拒', value: 'refuse' },
        ],
      });
      this.mem(p, id, 'story', '前世遗物托付');
      if (choice === 'take') {
        Cultivate.addExp(p, gainExp);
        Cultivate.addInsight(p, 6, false);
        s.rel = Utils.clamp(s.rel + 5, -100, 100);
        Log.add(`你接过前世遗物，一段封存的功法感悟涌入识海——${d.name} 默然颔首。（修为 +${Utils.fmtNum(gainExp)}，感悟 +6，交情 +5）`, 'gain');
      } else {
        KarmaSys.addFortune(3);
        s.rel = Utils.clamp(s.rel + 8, -100, 100);
        Log.add(`你婉拒了遗物：「物随故人，你替我收着，便是最好的归宿。」${d.name} 怔了片刻，眼底恨意淡了三分。（气运 +3，交情 +8）`, 'gain');
      }
      Story.chron(`前世事件：${d.name} 归还前世遗物`);
      Game.afterAction();
      return;
    }
    const greet = Narrative.greet();   // v5：道途礼数
    const recall = this.recallLine(p, id);   // v19 回忆杀
    Log.add(`途中遇上了 ${GameData.SECTS.find(x => x.id === d.sect) ? GameData.SECTS.find(x => x.id === d.sect).name + '的' : ''}<b>${d.name}</b>（${d.title}）。${greet ? `<span style="color:var(--text-faint)">（${greet}）</span>` : ''}`, 'event');
    if (s.grudge) { await this.peacemake(id); return; }
    const tier = this.tierOf(Math.max(0, s.rel));
    const choice = await UI.popup({
      title: `偶遇 · ${d.name}`,
      html: `${d.desc}<br>你们在 ${Utils.esc((GameData.MAPS.find(m => m.id === s.map) || {}).name || '山野')} 间打了个照面。<br><span class="tip-line">${d.name}：${this.lineFor(p, id, 'greet') || this.dialogText(d.temper, 'greeting')}</span>${s.rel >= 8 ? `<br><span class="tip-line">关系：<b>${tier.name}</b>${recall ? '　' + d.name + '先开了口：' + recall : ''}</span>` : ''}`,
      options: [
        { text: '叙话论道', value: 'chat', primary: true },
        { text: '请教一二', value: 'ask' },
        { text: '转身离去', value: 'leave' },
      ],
    });
    if (choice === 'chat') {
      const relBefore3 = s.rel;
      s.rel = Utils.clamp(s.rel + Utils.rand(2, 5), -100, 100);
      this.mem(p, id, 'chat', '途中叙话');   // v19 记忆
      Log.add(`你们席地论道，相谈甚欢。（交情 +${s.rel - relBefore3}）`, 'gain');
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
    // v29 修瑕：档位改序号比较——原先精确匹配，好感越档（如提前结拜）后低档幕永久无法触发（个人线死锁）
    const TI = NpcSys.TIERS;
    const curIdx = TI.findIndex(t => t.id === NpcSys.tierOf(Math.max(0, s.rel)).id);
    const needIdx = TI.findIndex(t => t.id === act.need.tier);
    if (curIdx < needIdx) return null;
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
      if (r.insight) Cultivate.addInsight(p, r.insight);   // v28：满百溢出折算修为
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
      if (typeof ReincarnationSys !== 'undefined' && ReincarnationSys.grantMarks) ReincarnationSys.grantMarks(1, 'personal_' + id);   // v30：个人线全通 +1 印记
        UI.announce(`✦ 个人线 · ${def.arc} · 终 ✦`, 'gold');
        Ambience.sfx('rare');
      }
      Game.afterAction();
    });
  },
  fxText(fx) {
    const N = { atkPct: '攻击', defPct: '防御', hpPct: '气血', crit: '暴击', dodge: '闪避', pillPct: '丹效', cultPct: '修炼效率' };
    return Object.entries(fx || {}).map(([k, v]) =>
      k === 'stoneMult' ? `灵石获取 +${Math.round(v * 100)}%`
        : `${N[k] || k}${k.endsWith('Pct') ? ' +' + v + '%' : ' +' + v}`).join('，');
  },
  /** 已完成个人线的永久加成（Stat.compute 调用；stoneMult 由 Bag.addStones 消费） */
  bonusOf(p) {
    const agg = { atkPct: 0, defPct: 0, hpPct: 0, crit: 0, dodge: 0, pillPct: 0, cultPct: 0, stoneMult: 1 };   // v30：补 cultPct（苏白线终章加成原为死键）
    if (!p || !p.personal) return agg;
    for (const [id, def] of Object.entries(GameData.PERSONAL)) {
      if ((p.personal[id] || 0) < def.acts.length) continue;
      for (const [k, v] of Object.entries(def.fx || {})) {
        if (k in agg) agg[k] += v;   // v30：恒等三元清理
      }
    }
    return agg;
  },
};
window.PersonalSys = PersonalSys;
