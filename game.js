'use strict';

/* ======================================================================
 * 《凡人问道》—— 网页版文字修仙游戏
 * 技术栈：HTML + CSS + 原生 JavaScript（零依赖，纯前端）
 *
 * 模块索引（按出现顺序）：
 *   §1   工具函数      Utils
 *   §2   静态数据      GameData（境界 / 物品 / 功法 / 怪物 / 地图 / 宗门 / 商店 / 文案）
 *   §3   日志系统      Log
 *   §4   存档系统      Save
 *   §5   玩家模型      PlayerFactory
 *   §6   属性计算      Stat
 *   §7   时间系统      Time
 *   §8   修炼系统      Cultivate
 *   §9   功法系统      GongfaSys
 *   §10  背包系统      Bag
 *   §11  商店系统      ShopSys
 *   §12  宗门系统      SectSys
 *   §13  探索/随机事件  Explore / EventSys
 *   §14  战斗系统      Battle
 *   §15  新手引导      Tutorial
 *   §16  界面渲染      UI
 *   §17  游戏主控      Game（动作分发 / 初始化）
 * 增量扩展（v2）：
 *   §19  大道职业体系  DaoSys（六道择一 / 转道重修）
 *   §20  气运因果      KarmaSys（气运 / 孽障 / 斩三尸 / 仇家偷袭 / 红尘劫）
 *   §21  百艺坊        CraftSys（炼丹 / 画符）
 *   §22  天劫渡劫      Tribulation（大境界突破三策博弈）
 * 增量扩展（v3）：
 *   §23  世界大事件    WorldSys（百年大事 / 魔域 / 讲道 / 宗门大战）
 *   §24  动态NPC恩怨   NpcSys（十五常驻修士 / 恩怨偷袭 / 结交道侣 / 背刺）
 *   §25  肉鸽秘境      DungeonSys（随机节点路线 / 撤离 / 失传功法 / 本命法宝）
 *   §26  兵解转生      ReincarnationSys（多周目 / 轮回印记 / 前世恩怨）
 * 增量扩展（v4 体验优化）：
 *   §1.5 数字滚动动画  Anim（修为 / 灵石 / 血量缓动滚动，不直接跳字）
 *   交互反馈：按钮按压/悬浮增强；突破、稀有、胜负居中淡入公告（UI.announce）
 *   日志升级：四级染色 / 暂停滚动 / 一键清空 / 金色日志置顶高亮 3 秒
 *   进度可视：突破预估成功率分解；背包按品质排序并按品级描边
 *   一键减负：出售凡品（ShopSys.sellCommon）/ 低阶丹药补满（Bag.autoUseLowPills）
 *             / 闭关至下一小境界自动出关（Cultivate.secludeLoop）
 * 增量扩展（v5 沉浸感）：
 *   §1.7 职业专属叙事  Narrative（历练/战斗/渡劫/待人 文案随六道而变，数值不变）
 *   §1.8 氛围音效      Ambience（WebAudio 合成：突破/稀有/胜利音效 + 古琴背景乐，默认关）
 *   境界突破演出       UI.realmShow（全屏境界色微光 + 20~30字描写渐显，失败红光）
 *   动态世界细节       顶栏年/月/日（Time.labelLong）；坊市每30日刷新行情±20%
 *                      （WorldSys.marketMul）；NPC 旬轮换行游（NpcSys.isAway/wander）
 * ====================================================================== */

/* ======================================================================
 * §1 工具函数
 * ====================================================================== */
const Utils = {
  rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  randF(min, max) { return Math.random() * (max - min) + min; },
  chance(p) { return Math.random() * 100 < p; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  /** 从 [{..., weight}] 或 {key: weight} 中按权重随机取一项 */
  pickWeighted(list) {
    const entries = Array.isArray(list)
      ? list.map(x => [x.id ?? x, x.weight ?? 1])
      : Object.entries(list);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
    return entries[entries.length - 1][0];
  },
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
  /** 大数简写：12345 -> 1.2万 */
  fmtNum(n) {
    n = Math.round(n);
    if (Math.abs(n) < 10000) return String(n);
    if (Math.abs(n) < 100000000) {
      const v = (n / 10000).toFixed(1).replace(/\.0$/, '');
      return v + '万';
    }
    return (n / 100000000).toFixed(2).replace(/\.?0+$/, '') + '亿';
  },
  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  /** 获取装备槽中的物品ID（兼容旧版 string 与新版 {id, enhance}） */
  eqId(eq) { return eq ? (typeof eq === 'string' ? eq : eq.id) : null; },
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
  now() { return new Date().toLocaleString('zh-CN', { hour12: false }); },
  /** 稳定字符串哈希（v5：坊市行情 / NPC 行游轮换用，同输入同输出） */
  hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; },
};

/* ======================================================================
 * §1.5 增量扩展（v4）：数字滚动动画 Anim
 * 数值变化（修为 / 灵石 / 血量等）不直接跳字，而是缓动滚到目标值。
 * 用法：渲染时输出 <span class="num-anim" data-nk="键" data-nv="目标值"
 *       data-fmt="fmt|raw"></span>，渲染完成后调用 Anim.scan(容器)。
 * ====================================================================== */
const Anim = {
  cache: {},   // nk -> 当前已显示的值（跨渲染保持滚动连续性）
  raf: {},     // nk -> 动画帧句柄
  fmtOf(el) { return el.dataset.fmt === 'fmt' ? (v => Utils.fmtNum(Math.round(v))) : (v => String(Math.round(v))); },
  /** 扫描容器内所有 .num-anim，启动/续接滚动动画 */
  scan(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('.num-anim').forEach(el => {
      const key = el.dataset.nk;
      const target = parseFloat(el.dataset.nv);
      if (!key || !isFinite(target)) return;
      const from = (key in this.cache) ? this.cache[key] : target;
      const fmt = this.fmtOf(el);
      if (Math.abs(target - from) < 0.5) {   // 值未变：直接定格，避免抖动
        this.cache[key] = target;
        el.textContent = fmt(target);
        return;
      }
      if (this.raf[key]) cancelAnimationFrame(this.raf[key]);
      const start = performance.now(), dur = 560;
      const step = (now) => {
        if (!el.isConnected) { delete this.raf[key]; return; }  // 被重渲染替换：交出新动画接管
        const t = Utils.clamp((now - start) / dur, 0, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        const v = from + (target - from) * ease;
        this.cache[key] = v;
        el.textContent = fmt(v);
        if (t < 1) { this.raf[key] = requestAnimationFrame(step); }
        else { this.cache[key] = target; el.textContent = fmt(target); delete this.raf[key]; }
      };
      this.raf[key] = requestAnimationFrame(step);
    });
  },
  /** 丢弃某些键的记忆（如新一场战斗的敌方血量），使下次渲染直接定格 */
  drop(...keys) { for (const k of keys) delete this.cache[k]; },
  /** 全量重置（读档 / 新开局时调用） */
  reset() {
    this.cache = {};
    for (const k of Object.keys(this.raf)) { cancelAnimationFrame(this.raf[k]); delete this.raf[k]; }
  },
};

/* ======================================================================
 * §1.6 v13 程序化美术 Art（零外部资源）
 * Art.scene(mapId)：地图山水插画（内联 SVG：渐变天色 + 层叠山峦 + 地标元素）；
 * Art.monster(species, elite)：战斗敌方剪影立绘（蛇/兽/虫群/草木/阴魂/灵体/人形/傀儡）。
 * ====================================================================== */
const Art = {
  /** 各地图场景配色与地标 */
  SCENES: {
    village:  { sky: ['#f3ecd6', '#e5d9b8'], hills: ['#8fa878', '#6d8a5b', '#4d6b44'], landmark: 'house', mist: '#f6f0dd' },
    qingfeng: { sky: ['#e9efdd', '#d5e2c3'], hills: ['#7fa2a0', '#5b8484', '#3e6567'], landmark: 'peak', mist: '#eef3e2' },
    heifeng:  { sky: ['#e3ddcc', '#c9c0a6'], hills: ['#6e6a5c', '#525046', '#383630'], landmark: 'fort', mist: '#ddd6c2' },
    forest:   { sky: ['#e7ecd4', '#d0dcbc'], hills: ['#5e8a54', '#456e3f', '#2e5230'], landmark: 'trees', mist: '#e9efdb' },
    ruins:    { sky: ['#ece4cf', '#d8ccb0'], hills: ['#a89a78', '#8a7c5e', '#6a5e46'], landmark: 'pillar', mist: '#efe7d2' },
    wanyao:   { sky: ['#e4dcea', '#c9bdd6'], hills: ['#7a5f94', '#5c4576', '#40305a'], landmark: 'horn', mist: '#e6def0' },
    youming:  { sky: ['#d9ddd2', '#b8c2b4'], hills: ['#4a6258', '#354c44', '#22352f'], landmark: 'flame', mist: '#cfd8cc' },
    feizhou:  { sky: ['#dfe3ee', '#c3cbdd'], hills: ['#6a7898', '#4d5b7c', '#344064'], landmark: 'ship', mist: '#e2e7f2' },
    longyuan: { sky: ['#d6e2e6', '#b2c8cf'], hills: ['#3e6e80', '#2a5264', '#1a3a4a'], landmark: 'whirl', mist: '#cfdfe4' },
  },
  /** 生成地图场景插画 SVG（viewBox 600x150） */
  scene(mapId) {
    const S = this.SCENES[mapId] || this.SCENES.village;
    const gid = 'sg' + mapId;
    // 三层山峦（折线剪影）
    const hill = (y, amp, color, op) => {
      let pts = `0,${150 - y}`;
      for (let x = 0; x <= 600; x += 50) {
        const h = 18 + Math.abs(Math.sin((x + y * 7 + mapId.charCodeAt(0)) * 0.031)) * amp;
        pts += ` ${x},${150 - y - h}`;
      }
      pts += ` 600,${150 - y} 600,150 0,150`;
      return `<polygon points="${pts}" fill="${color}" opacity="${op}"/>`;
    };
    let landmark = '';
    const c = S.hills;
    if (S.landmark === 'house') landmark = `<g opacity="0.85"><rect x="70" y="96" width="26" height="18" fill="#5a4a38"/><polygon points="66,96 96,96 81,84" fill="#3e332a"/><rect x="78" y="106" width="7" height="8" fill="#2e2620"/></g>`;
    else if (S.landmark === 'peak') landmark = `<polygon points="430,20 470,110 390,110" fill="${c[2]}" opacity="0.9"/><polygon points="445,38 455,38 470,110 430,110" fill="#eef3f8" opacity="0.55"/>`;
    else if (S.landmark === 'fort') landmark = `<g opacity="0.9"><rect x="440" y="62" width="52" height="48" fill="#2e2c26"/><polygon points="436,62 496,62 466,44" fill="#26241f"/><rect x="460" y="88" width="12" height="22" fill="#191713"/></g>`;
    else if (S.landmark === 'trees') landmark = `<g opacity="0.9"><rect x="500" y="86" width="5" height="26" fill="#3a3226"/><circle cx="502" cy="80" r="14" fill="#2e5230"/><rect x="530" y="94" width="4" height="18" fill="#3a3226"/><circle cx="532" cy="88" r="10" fill="#355c33"/></g>`;
    else if (S.landmark === 'pillar') landmark = `<g opacity="0.9"><rect x="120" y="52" width="12" height="60" fill="#7a6c50"/><rect x="140" y="66" width="10" height="46" fill="#6d6048"/><rect x="112" y="46" width="28" height="8" fill="#857760"/></g>`;
    else if (S.landmark === 'horn') landmark = `<polygon points="420,18 448,84 396,84" fill="${c[2]}"/><path d="M410 60 q10 -22 20 0 q-10 -8 -20 0" fill="#c9b6e0" opacity="0.5"/>`;
    else if (S.landmark === 'flame') landmark = `<g opacity="0.95"><path d="M470 100 q-6 -18 6 -30 q-2 14 8 20 q10 6 2 22 q-8 10 -16 0 q-6 -6 0 -12" fill="#8fd0a8" opacity="0.75"/><path d="M510 106 q-4 -12 5 -22 q-1 10 6 15 q7 5 1 16 q-6 7 -11 0 q-4 -4 -1 -9" fill="#8fd0a8" opacity="0.5"/></g>`;
    else if (S.landmark === 'ship') landmark = `<g opacity="0.95"><ellipse cx="440" cy="66" rx="52" ry="10" fill="#8c94b4"/><ellipse cx="440" cy="56" rx="34" ry="8" fill="#a6aec8"/><polygon points="430,40 466,40 448,18" fill="#b8c0d6" opacity="0.8"/><circle cx="448" cy="30" r="4" fill="#eef2ff" opacity="0.9"/></g>`;
    else if (S.landmark === 'whirl') landmark = `<g opacity="0.9"><path d="M430 66 q30 -26 60 0 q-30 26 -60 0" fill="none" stroke="#a8ccd8" stroke-width="4"/><path d="M440 66 q20 -14 40 0 q-20 14 -40 0" fill="none" stroke="#cfe6ee" stroke-width="3"/><circle cx="460" cy="66" r="7" fill="#123240"/></g>`;
    return `<svg class="scene-svg" viewBox="0 0 600 150" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${S.sky[0]}"/><stop offset="1" stop-color="${S.sky[1]}"/>
      </linearGradient></defs>
      <rect width="600" height="150" fill="url(#${gid})"/>
      <circle cx="500" cy="34" r="20" fill="#fdf8ea" opacity="0.85"/>
      ${hill(36, 46, S.hills[0], 0.85)}
      ${hill(22, 40, S.hills[1], 0.9)}
      ${landmark}
      ${hill(8, 34, S.hills[2], 0.95)}
      <ellipse cx="180" cy="132" rx="200" ry="26" fill="${S.mist}" opacity="0.65"/>
      <ellipse cx="470" cy="140" rx="220" ry="24" fill="${S.mist}" opacity="0.5"/>
    </svg>`;
  },
  /** 战斗敌方剪影立绘（species 形象；elite 加妖光角标） */
  monster(species, elite = false) {
    const P = {
      beast: '<path d="M18 62 L22 40 Q20 30 28 26 L34 18 L38 27 Q44 24 50 26 L56 17 L60 26 Q68 30 66 40 L70 62 Z" /><circle cx="36" cy="31" r="1.8" fill="#ffe9b0"/><circle cx="52" cy="31" r="1.8" fill="#ffe9b0"/>',
      snake: '<path d="M20 62 Q14 50 22 44 Q34 36 30 26 Q38 12 50 20 Q58 26 52 34 Q64 40 58 50 Q70 54 78 62 Z" /><circle cx="47" cy="23" r="1.8" fill="#ffd28a"/>',
      swarm: '<g><ellipse cx="34" cy="46" rx="9" ry="6"/><ellipse cx="52" cy="38" rx="7" ry="5"/><ellipse cx="48" cy="54" rx="8" ry="5"/><ellipse cx="62" cy="50" rx="6" ry="4"/><path d="M30 42 q-6 -8 2 -10" fill="none" stroke-width="2" stroke="inherit"/></g>',
      plant: '<path d="M40 62 Q36 44 44 34 Q40 22 52 16 Q64 22 60 34 Q68 44 64 62 Z" /><path d="M46 40 q-14 -4 -18 -14 q12 0 20 8" /><path d="M58 44 q14 -6 16 -16 q-12 2 -18 10" />',
      ghost: '<path d="M22 62 Q20 30 44 26 Q68 30 66 62 L58 56 L50 62 L42 56 L32 62 Z" opacity="0.85"/><circle cx="38" cy="40" r="2.4" fill="#e8f4ff"/><circle cx="52" cy="40" r="2.4" fill="#e8f4ff"/>',
      element: '<path d="M42 18 Q60 30 54 44 Q66 48 60 62 L32 62 Q26 46 38 40 Q30 30 42 18 Z" opacity="0.9"/>',
      human: '<g><circle cx="44" cy="24" r="8"/><path d="M30 62 L32 38 Q44 30 56 38 L58 62 Z"/><path d="M56 36 L74 22" stroke-width="4" stroke="inherit" fill="none"/></g>',
      construct: '<g><rect x="30" y="14" width="28" height="18" rx="3"/><rect x="24" y="36" width="40" height="26" rx="3"/><rect x="12" y="40" width="10" height="14" rx="2"/><rect x="66" y="40" width="10" height="14" rx="2"/><circle cx="39" cy="23" r="2.5" fill="#ffe9b0"/><circle cx="49" cy="23" r="2.5" fill="#ffe9b0"/></g>',
    };
    const color = elite ? '#5f3a44' : '#3f4a52';
    const glow = elite ? '<circle cx="44" cy="40" r="34" fill="none" stroke="#a04ab0" stroke-width="1.4" opacity="0.4" stroke-dasharray="5 4"/>' : '';
    return `<svg viewBox="0 0 88 66" class="fig-svg" aria-hidden="true"><g fill="${color}" stroke="${color}">${P[species] || P.beast}</g>${glow}</svg>`;
  },
};

/* ======================================================================
 * §1.7 增量扩展（v5）：职业专属叙事 Narrative
 * 只改文案，不改数值——所有取词函数均从 GameData.DAO_FLAVOR 取当前大道
 * 的专属语料；未择道者一律回落原文案。
 * ====================================================================== */
const Narrative = {
  flavor() { const p = Game.player; return (p && p.dao && GameData.DAO_FLAVOR[p.dao]) || null; },
  /** 历练场景句（treasure / fortune / trap），有专属语料才追加 */
  logScene(kind) {
    const f = this.flavor();
    if (!f || !f[kind] || !f[kind].length) return;
    Log.add(Utils.pick(f[kind]), 'info');
  },
  /** 普攻动词短语（未择道保持原文案「你出手攻击」） */
  attack() { const f = this.flavor(); return f ? Utils.pick(f.attack) : '你出手攻击'; },
  victory() { const f = this.flavor(); return f ? Utils.pick(f.victory) : null; },
  defeat() { const f = this.flavor(); return f ? Utils.pick(f.defeat) : null; },
  tribSuccess() { const f = this.flavor(); return f ? Utils.pick(f.tribSuccess) : null; },
  tribFail() { const f = this.flavor(); return f ? Utils.pick(f.tribFail) : null; },
  /** 遇常驻修士时的礼数括注 */
  greet() { const f = this.flavor(); return f ? f.greet : null; },
  /** 陌生修士观察句 */
  observe() { const f = this.flavor(); return (f && f.observe) ? Utils.pick(f.observe) : null; },
  /** 红尘劫三选文案：随道途而变，value 与顺序与原版完全一致（数值逻辑不变） */
  dilemmaOptions() {
    const f = this.flavor();
    const d = f && f.dilemma;
    return [
      { text: (d && d.help) || '出手相助（气运↑，有所损耗）', value: 'help', primary: true },
      { text: (d && d.rob) || '趁火打劫（孽障↑，有所进账）', value: 'rob' },
      { text: (d && d.ignore) || '视而不见（一身轻）', value: 'ignore' },
    ];
  },
};

/* ======================================================================
 * §1.8 增量扩展（v5）：氛围音效 Ambience（Web Audio 合成，零外部资源）
 * 事件音效默认关；古琴背景乐单独开关、基础音量 20%；总音量滑条统一调节。
 * ====================================================================== */
const Ambience = {
  ctx: null, master: null, musicBus: null,
  sfxOn: false, musicOn: false, vol: 0.8,
  MUSIC_BASE: 0.2,
  musicTimer: null, musicStep: 0,
  PENTA: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25],  // 五声音阶（宫商角徵羽，两个八度）
  KEY: 'fanren_wd_amb',

  init() {
    const pref = Save.read('amb') || {};
    if (pref.sfx) this.sfxOn = true;
    if (pref.music) this.musicOn = true;
    if (typeof pref.vol === 'number') this.vol = Utils.clamp(pref.vol, 0, 1);
    const sfx = document.getElementById('amb-sfx');
    const music = document.getElementById('amb-music');
    const vol = document.getElementById('amb-vol');
    if (sfx) { sfx.checked = this.sfxOn; sfx.addEventListener('click', e => Ambience.setSfx(e.target.checked)); }
    if (music) { music.checked = this.musicOn; music.addEventListener('click', e => Ambience.setMusic(e.target.checked)); }
    if (vol) { vol.value = Math.round(this.vol * 100); vol.addEventListener('input', e => Ambience.setVolume(Number(e.target.value) / 100)); }
    // v13 设置中心：战斗速度
    const spd = document.getElementById('amb-speed');
    if (spd) {
      if (!Battle.speed) Battle.speed = Battle.loadSpeed();
      spd.value = String(Battle.speed);
      spd.addEventListener('change', e => {
        Battle.setSpeed(Number(e.target.value) || 1);
        UI.toast(`战斗速度：${{ 1: '×1 原速', 2: '×2 两倍', 3: '极速' }[Battle.speed] || '×1'}`);
      });
    }
    this.render();
    // 浏览器自动播放限制：若上次开着声音，待首次手势再无声启动
    if (this.musicOn) {
      const kick = () => {
        if (this.musicOn) this.startMusic();
        document.removeEventListener('pointerdown', kick);
      };
      document.addEventListener('pointerdown', kick);
    }
  },
  persist() {
    const raw = JSON.stringify({ sfx: this.sfxOn, music: this.musicOn, vol: this.vol });
    try { if (Save.storage.setItem) Save.storage.setItem(this.KEY, raw); else Save.mem[this.KEY] = raw; } catch (e) { /* ignore */ }
  },
  ensureCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    if (!this.ctx) {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.vol;
      this.master.connect(this.ctx.destination);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = this.MUSIC_BASE;
      this.musicBus.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  },
  tone(freq, t0, dur, opts = {}) {
    const { type = 'sine', gain = 0.4, dest = null } = opts;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  /** 轻量音效：breakthrough 破境 / rare 稀有 / victory 胜利 */
  sfx(kind) {
    if (!this.sfxOn || !this.ensureCtx()) return;
    const t = this.ctx.currentTime + 0.01;
    if (kind === 'breakthrough') {
      [329.63, 392.0, 440.0, 523.25, 659.25].forEach((f, i) => this.tone(f, t + i * 0.13, 0.9, { type: 'triangle', gain: 0.28 }));
      this.tone(130.81, t, 1.8, { type: 'sine', gain: 0.20 });
    } else if (kind === 'rare') {
      this.tone(880, t, 1.2, { type: 'sine', gain: 0.24 });
      this.tone(1318.5, t + 0.06, 1.0, { type: 'sine', gain: 0.14 });
      this.tone(1760, t + 0.12, 0.7, { type: 'sine', gain: 0.07 });
    } else if (kind === 'victory') {
      this.tone(523.25, t, 0.28, { type: 'triangle', gain: 0.28 });
      this.tone(659.25, t + 0.14, 0.28, { type: 'triangle', gain: 0.28 });
      this.tone(784.0, t + 0.28, 0.6, { type: 'triangle', gain: 0.32 });
    } else if (kind === 'rage') {
      // v13：狂暴/咆哮——低频震音
      this.tone(110, t, 0.5, { type: 'sawtooth', gain: 0.16 });
      this.tone(82.4, t + 0.12, 0.6, { type: 'sawtooth', gain: 0.13 });
    } else if (kind === 'poison') {
      // v13：中毒——下行嘶鸣
      this.tone(520, t, 0.3, { type: 'sawtooth', gain: 0.08 });
      this.tone(360, t + 0.1, 0.35, { type: 'sawtooth', gain: 0.07 });
    } else if (kind === 'forge') {
      // v13：锻打——金属敲击双音
      this.tone(1244, t, 0.16, { type: 'square', gain: 0.10 });
      this.tone(830, t + 0.16, 0.22, { type: 'square', gain: 0.08 });
      this.tone(1244, t + 0.4, 0.16, { type: 'square', gain: 0.10 });
    } else if (kind === 'tame') {
      // v13：驯服成功——上行三音
      this.tone(587.33, t, 0.2, { type: 'sine', gain: 0.22 });
      this.tone(740, t + 0.13, 0.2, { type: 'sine', gain: 0.22 });
      this.tone(880, t + 0.26, 0.5, { type: 'sine', gain: 0.26 });
    } else if (kind === 'bounty') {
      // v13：悬赏完成——双清音
      this.tone(659.25, t, 0.22, { type: 'triangle', gain: 0.22 });
      this.tone(987.77, t + 0.15, 0.5, { type: 'triangle', gain: 0.26 });
    }
  },
  /** 生成式古琴背景乐：五声音阶随机游走 + 弦底长音，疏落淡远 */
  startMusic() {
    if (!this.ensureCtx() || this.musicTimer) return;
    this.musicStep = 0;
    const tick = () => {
      const t = this.ctx.currentTime + 0.02;
      this.musicStep++;
      const P = this.PENTA;
      if (this.musicStep % 8 === 1) this.tone(P[0] / 2, t, 3.2, { type: 'sine', gain: 0.20, dest: this.musicBus });
      if (Utils.chance(62)) {
        const f = P[Math.floor(Math.random() * P.length)];
        this.tone(f, t, 1.6, { type: 'triangle', gain: 0.30, dest: this.musicBus });
        if (Utils.chance(30)) this.tone(f * 2, t + 0.03, 0.8, { type: 'sine', gain: 0.10, dest: this.musicBus });
      }
    };
    tick();
    this.musicTimer = setInterval(tick, 640);
  },
  stopMusic() { if (this.musicTimer) { clearInterval(this.musicTimer); this.musicTimer = null; } },
  setSfx(on) { this.sfxOn = !!on; if (on && this.ctx === null) this.ensureCtx(); if (on) this.sfx('rare'); this.persist(); this.render(); },
  setMusic(on) {
    this.musicOn = !!on;
    if (on) this.startMusic(); else this.stopMusic();
    this.persist(); this.render();
  },
  setVolume(v) {
    this.vol = Utils.clamp(v, 0, 1);
    if (this.master) this.master.gain.value = this.vol;
    this.persist(); this.render();
  },
  /** 顶栏按钮状态：任一开启则点亮 */
  render() {
    const btn = document.getElementById('amb-toggle');
    if (btn) btn.classList.toggle('on', this.sfxOn || this.musicOn);
  },
};

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

/* ======================================================================
 * §1.10 增量扩展（v6）：成就系统 Achieve（五类三十项）
 * 完成奖励少量气运或灵石；进度存于 Meta，随档、转世不重置。
 * ====================================================================== */
const Achieve = {
  CATS: { realm: '境界', dao: '职业', battle: '战斗', exp: '奇遇', reinc: '转世' },
  stonesTotal(p) { return p.stones.low + p.stones.mid * 100 + p.stones.high * 10000; },
  rewardText(r) { return r.fortune ? `气运 +${r.fortune}` : `灵石 +${Utils.fmtNum(r.stones)}`; },
  DEFS: [
    /* ---- 境界 ---- */
    { id: 'r1', cat: 'realm', name: '初入道途', desc: '突破至筑基期', reward: { fortune: 3 }, test: p => p.realmIdx >= 1 },
    { id: 'r2', cat: 'realm', name: '金丹大道', desc: '突破至金丹期', reward: { fortune: 5 }, test: p => p.realmIdx >= 2 },
    { id: 'r3', cat: 'realm', name: '元婴出窍', desc: '突破至元婴期', reward: { fortune: 8 }, test: p => p.realmIdx >= 3 },
    { id: 'r4', cat: 'realm', name: '化神通玄', desc: '突破至化神期', reward: { fortune: 10 }, test: p => p.realmIdx >= 4 },
    { id: 'r5', cat: 'realm', name: '合体无为', desc: '突破至合体期', reward: { fortune: 12 }, test: p => p.realmIdx >= 6 },
    { id: 'r6', cat: 'realm', name: '白日飞升', desc: '修至真仙期', reward: { fortune: 20 }, test: p => p.realmIdx >= 9 },
    /* ---- 职业 ---- */
    { id: 'd0', cat: 'dao', name: '道途初定', desc: '择定第一条大道', reward: { stones: 200 }, test: p => !!p.dao },
    { id: 'd1', cat: 'dao', name: '剑心桀骜', desc: '剑修之身赢下十五场战斗', reward: { stones: 800 }, prog: p => `${Math.min(15, p.counters.wins || 0)}/15`, test: p => p.dao === 'sword' && (p.counters.wins || 0) >= 15 },
    { id: 'd2', cat: 'dao', name: '丹道藏珍', desc: '丹道之身同时藏有三种丹药', reward: { stones: 600 }, test: p => p.dao === 'pill' && Object.keys(p.bag).filter(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'pill').length >= 3 },
    { id: 'd3', cat: 'dao', name: '笔落惊雷', desc: '符修之身藏符十张', reward: { stones: 600 }, prog: p => `${Math.min(10, Object.entries(p.bag).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman').reduce((s, [, n]) => s + n, 0))}/10`, test: p => p.dao === 'talisman' && Object.entries(p.bag).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman').reduce((s, [, n]) => s + n, 0) >= 10 },
    { id: 'd4', cat: 'dao', name: '金刚不坏', desc: '体修之身气血上限逾五百', reward: { stones: 800 }, test: p => p.dao === 'body' && Stat.compute(p).maxHp >= 500 },
    { id: 'd5', cat: 'dao', name: '先手布阵', desc: '阵道之身历练二十五次', reward: { stones: 600 }, prog: p => `${Math.min(25, p.counters.explores || 0)}/25`, test: p => p.dao === 'array' && (p.counters.explores || 0) >= 25 },
    /* ---- 战斗 ---- */
    { id: 'b1', cat: 'battle', name: '初试锋芒', desc: '赢下第一场战斗', reward: { stones: 100 }, test: p => (p.counters.wins || 0) >= 1 },
    { id: 'b2', cat: 'battle', name: '十战十稳', desc: '赢下十场战斗', reward: { stones: 300 }, prog: p => `${Math.min(10, p.counters.wins || 0)}/10`, test: p => (p.counters.wins || 0) >= 10 },
    { id: 'b3', cat: 'battle', name: '百战老修', desc: '历经五十场战斗', reward: { fortune: 5 }, prog: p => `${Math.min(50, p.counters.battles || 0)}/50`, test: p => (p.counters.battles || 0) >= 50 },
    { id: 'b4', cat: 'battle', name: '精英克星', desc: '斩杀五尊精英妖魔', reward: { stones: 1000 }, prog: p => `${Math.min(5, p.counters.killsElite || 0)}/5`, test: p => (p.counters.killsElite || 0) >= 5 },
    { id: 'b5', cat: 'battle', name: '以武会友', desc: '与同道切磋一场', reward: { fortune: 2 }, test: p => (p.counters.spars || 0) >= 1 },
    { id: 'b6', cat: 'battle', name: '败而不馁', desc: '尝过败绩之后重夺三胜', reward: { fortune: 3 }, test: p => (p.counters.defeats || 0) >= 1 && (p.counters.wins || 0) >= 3 },
    /* ---- 奇遇 ---- */
    { id: 'e1', cat: 'exp', name: '第一桶金', desc: '灵石积蓄逾千', reward: { fortune: 3 }, test: p => this.stonesTotal(p) >= 1000 },
    { id: 'e2', cat: 'exp', name: '富甲一方', desc: '灵石积蓄逾十万', reward: { fortune: 8 }, test: p => this.stonesTotal(p) >= 100000 },
    { id: 'e3', cat: 'exp', name: '因果随身', desc: '孽障五十，因果如影随形', reward: { stones: 800 }, prog: p => `${Math.min(50, p.karma || 0)}/50`, test: p => (p.karma || 0) >= 50 },
    { id: 'e4', cat: 'exp', name: '福缘深厚', desc: '气运五十，天眷其身', reward: { stones: 1000 }, prog: p => `${Math.min(50, p.fortune || 0)}/50`, test: p => (p.fortune || 0) >= 50 },
    { id: 'e5', cat: 'exp', name: '秘境凯旋', desc: '击败秘境最深处的守关者', reward: { fortune: 10 }, test: p => (p.counters.bossKills || 0) >= 1 },
    { id: 'e6', cat: 'exp', name: '仙侣同途', desc: '与心悦之人结为道侣', reward: { fortune: 10 }, test: p => !!p.partner },
    /* ---- 转世 ---- */
    { id: 's1', cat: 'reinc', name: '窥见轮回', desc: '窥得兵解转世之机', reward: { stones: 500 }, test: p => !!p.canReincarnate },
    { id: 's2', cat: 'reinc', name: '轮回初醒', desc: '完成第一次兵解转世', reward: { fortune: 8 }, test: p => !!p.reinc },
    { id: 's3', cat: 'reinc', name: '宿命重逢', desc: '身负前世恩怨，与故人重逢', reward: { stones: 600 }, test: p => Object.values(p.npcs || {}).some(s => s.pastLife) },
    { id: 's4', cat: 'reinc', name: '三生三世', desc: '历经三世轮回', reward: { fortune: 15 }, test: p => p.reinc && (p.reinc.lives || 0) >= 3 },
    { id: 's5', cat: 'reinc', name: '印记斑驳', desc: '累计三枚轮回印记', reward: { fortune: 12 }, prog: p => `${Math.min(3, p.reinc ? (p.reinc.marks || 0) : 0)}/3`, test: p => p.reinc && (p.reinc.marks || 0) >= 3 },
    { id: 's6', cat: 'reinc', name: '宿慧渐开', desc: '转世之身历练十次', reward: { stones: 800 }, prog: p => `${Math.min(10, p.counters.explores || 0)}/10`, test: p => p.reinc && (p.counters.explores || 0) >= 10 },
  ],
  /** 每次行动收尾时检查：解锁则发奖并播报 */
  check() {
    const p = Game.player;
    if (!p || p.dead) return;
    const got = Meta.data.achv;
    const unlocked = [];
    for (const d of this.DEFS) {
      if (got[d.id]) continue;
      let ok = false;
      try { ok = d.test(p); } catch (e) { ok = false; }
      if (ok) unlocked.push(d);
    }
    if (!unlocked.length) return;
    for (const d of unlocked) {
      got[d.id] = Math.floor(p.day);
      if (d.reward.stones) Bag.addStones(d.reward.stones);
      if (d.reward.fortune) KarmaSys.addFortune(d.reward.fortune, true);
      Log.add(`✦ 成就达成 <b>【${d.name}】</b>——${d.desc}。（${this.rewardText(d.reward)}）`, 'system');
      UI.toast(`成就达成：${d.name}`);
    }
    Meta.save();
    UI.renderAll();
    Save.autoSave();
  },
};

/* ======================================================================
 * §1.11 增量扩展（v6）：智能目标指引 Guide
 * 按玩家实时状态给出下一步建议；并负责标签页的分步解锁。
 * ====================================================================== */
const Guide = {
  /** 功能解锁阶段：0 = 初入练气；1 = 练气中期；2 = 筑基 */
  stage(p) { return p.realmIdx >= 1 ? 2 : (p.layer >= 1 ? 1 : 0); },
  LOCKS: {
    map: { stage: 1, hint: '游历 · 练气中期解锁' },
    shop: { stage: 1, hint: '坊市 · 练气中期解锁' },
    jianghu: { stage: 2, hint: '江湖 · 筑基期解锁' },
    sect: { stage: 2, hint: '宗门 · 筑基期解锁' },
    cave: { stage: 2, hint: '洞府 · 筑基期解锁' },
  },
  tabLocked(tab) {
    const p = Game.player;
    const L = this.LOCKS[tab];
    if (!p || !L) return null;
    return this.stage(p) >= L.stage ? null : L.hint;
  },
  /** 当前建议：按优先级取前三条 */
  tips(p) {
    const t = [];
    const st = Stat.compute(p);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const full = p.layer === 3 && p.exp >= need;
    if (full && p.realmIdx < 9) t.push(`修为已至圆满，可冲击 <b>${GameData.REALM_NAMES[p.realmIdx + 1]}</b> 期瓶颈（预估成算 ${Cultivate.breakthroughChance(p, p.realmIdx + 1 < GameData.TRIB_START ? 15 : 0).toFixed(0)}%）`);
    else if (full && p.realmIdx === 9 && !p.flags.ascended) t.push('真仙圆满，仙门已开——可白日飞升');
    if (p.realmIdx >= 1 && !p.dao) t.push('大道未定，如无舵之舟——宜叩问大道');
    // v11 主线目标提示（置顶）
    const qc = QuestSys.CHAPTERS[QuestSys.currentChapterIdx(p)];
    if (qc) {
      const undone = qc.steps.find(st => !QuestSys.stepDone(st, p, qc.supR));
      if (undone) t.splice(Math.min(1, t.length), 0, `<b>主线·${qc.title}</b>：${undone.desc}`);
    }
    if (AutoCult.active) t.push(`自动修炼中（${AutoCult.rounds} 轮，修为 +${Utils.fmtNum(Math.max(0, this.totalExp(p) - AutoCult.startExp))}），可随时停止`);
    if ((p.karma || 0) >= 100) t.push('孽障缠身，可于修炼页<b>斩三尸</b>');
    else if ((p.karma || 0) >= 60) t.push('孽障渐高，仇家窥伺于后——宜谨言慎行');
    const cap = 60 + p.attrs.body * 8 + (p.realmIdx >= 5 ? 20 : 0);
    if (p.poison > cap * 0.75) t.push('丹毒将满，宜服解毒丹或停药休养');
    if (p.hp < st.maxHp * 0.3) t.push('气血衰微，宜打坐调息或服丹补满');
    if (p.canReincarnate) t.push('兵解转世之机已现——或可重开一世');
    if (p.world && p.world.pending) t.push('天下大势正待抉择，可于游历页参与');
    if (NpcSys.grudgeCount(p) > 0) t.push('有宿敌伺机报复——宜化解仇怨或早做备战');
    if (!t.length) {
      if (p.exp >= need * 0.8 && !full) t.push(`修为将满（${Math.round(p.exp / need * 100)}%），再积攒片刻便可冲关`);
      else t.push('修炼积攒修为，或外出历练搏杀机缘');
    }
    return t.slice(0, 4);   // v11：容纳主线目标提示
  },
  totalExp(p) {
    let sum = 0;
    for (let l = 0; l < p.layer; l++) sum += GameData.layerNeed(p.realmIdx, l);
    return sum + p.exp;
  },
};

/* ======================================================================
 * §1.12 增量扩展（v6）：挂机修炼 AutoCult
 * 目标：指定境界 / 攒够修为 / 运行时长；期间自动普通修炼，
 * 修为圆满或遭遇战斗自动暂停，结束后汇总本轮收益。
 * ====================================================================== */
const AutoCult = {
  active: false, target: null,
  rounds: 0, startExp: 0, startDay: 0, startReal: 0,
  async open() {
    const p = Game.player;
    if (this.active) { UI.toast('自动修炼已在进行中'); return; }
    const realmOpts = GameData.REALM_NAMES.map((n, i) => `<option value="${i}">${n}期</option>`).join('');
    const ok = await UI.popup({
      title: '自动修炼',
      html: `心无旁骛，自行吐纳——期间将自动进行普通修炼，收益尽数入账。<br>
        <div class="auto-row">
          <select id="auto-kind">
            <option value="realm">修至指定境界</option>
            <option value="exp">攒够指定修为</option>
            <option value="time">运行指定时长（分钟）</option>
          </select>
          <select id="auto-realm">${realmOpts}</select>
          <input id="auto-val" type="number" min="1" placeholder="数值" class="hidden">
        </div>
        <div class="tip-line">· 修为圆满或遭遇战斗时将<b>自动停下</b>，等待你亲手冲关／应对。</div>`,
      options: [{ text: '开 始', value: true, primary: true }, { text: '取 消', value: false }],
    });
    if (!ok) return;
    const kind = document.getElementById('auto-kind').value;
    let target = null;
    if (kind === 'realm') {
      const realm = Number(document.getElementById('auto-realm').value);
      if (realm <= p.realmIdx) { UI.toast('你已不弱于此境'); return; }
      target = { kind, realm, label: `修至${GameData.REALM_NAMES[realm]}期` };
    } else {
      const val = Number(document.getElementById('auto-val').value);
      if (!isFinite(val) || val <= 0) { UI.toast('请填写目标数值'); return; }
      target = kind === 'exp'
        ? { kind, need: Math.round(val), label: `攒够 ${Utils.fmtNum(Math.round(val))} 修为` }
        : { kind, minutes: Utils.clamp(val, 1, 720), label: `运行 ${Utils.clamp(val, 1, 720)} 分钟` };
    }
    this.start(target);
  },
  start(target) {
    const p = Game.player;
    if (!p || this.active) return;
    this.target = target;
    this.active = true;
    this.rounds = 0;
    this.startExp = Guide.totalExp(p);
    this.startDay = p.day;
    this.startReal = Date.now();
    Log.add(`你入定自行吐纳——<b>自动修炼</b>开启，目标：${target.label}。`, 'system');
    UI.renderAll();
    this.run();
  },
  async run() {
    while (this.active) {
      const p = Game.player;
      if (!p || p.dead) { this.finish('道途中断'); return; }
      if (Battle.active || Tribulation.state) { this.pause('遭遇战斗，自动修炼暂停'); return; }
      // v7：有弹窗待决（叩问大道 / 红尘劫等）时挂起等待，不穿透、不中断
      // v15：剧情演出中同样挂起
      if (Story.active() || UI._popupResolve || (document.getElementById('dao-modal') && !document.getElementById('dao-modal').classList.contains('hidden'))) {
        await Utils.sleep(300);
        continue;
      }
      Cultivate.normal();   // 一轮普通修炼（自带日志 / 时间 / 收尾渲染）
      const p2 = Game.player;
      if (!p2 || p2.dead) { this.finish('寿元将尽，自动修炼停止'); return; }
      this.rounds++;
      const need = GameData.layerNeed(p2.realmIdx, p2.layer);
      if (p2.layer === 3 && p2.exp >= need) {
        this.pause(p2.realmIdx < 9 ? '修为已至圆满——请亲手冲击瓶颈' : '真仙圆满——仙门已开，请亲手飞升');
        return;
      }
      if (this.reached(p2)) { this.finish('目标达成'); return; }
      await Utils.sleep(280);
    }
  },
  reached(p) {
    const t = this.target;
    if (!t) return true;
    if (t.kind === 'realm') return p.realmIdx >= t.realm;
    if (t.kind === 'exp') return Guide.totalExp(p) - this.startExp >= t.need;
    return Date.now() - this.startReal >= t.minutes * 60000;
  },
  pause(reason) {
    this.active = false;
    Log.add(`【自动修炼 · 暂停】${reason}`, 'warn');
    this.summary();
  },
  finish(reason) {
    this.active = false;
    Log.add(`【自动修炼 · 完成】${reason}`, 'system');
    this.summary();
  },
  /** 读档 / 返回开始界面时静默中止 */
  abort() { this.active = false; },
  summary() {
    const p = Game.player;
    if (!p) { UI.renderAll(); return; }
    const gained = Guide.totalExp(p) - this.startExp;
    const days = Math.max(0, Math.floor(p.day - this.startDay));
    Log.add(`本次自动修炼小结：${this.rounds} 轮吐纳，游戏内历时 ${days} 日，累计修为 <b>+${Utils.fmtNum(Math.max(0, gained))}</b>。`, 'gain');
    UI.renderAll();
  },
};

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
 * §2 静态数据
 * ====================================================================== */
const GameData = {

  /* ---------- 境界体系 ---------- */
  REALM_NAMES: ['练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫', '真仙'],
  LAYER_NAMES: ['初期', '中期', '后期', '圆满'],
  /** v9 阶梯突破：冲关此境界（含）起方引动天劫；练气→筑基为静修冲关（无天劫）。
   *  目标境界越高，劫威与成算折损越高——天劫难度随修为水涨船高。 */
  TRIB_START: 2,
  /** 每个大境界第 1 层所需修为（后续层数乘以 LAYER_MULT） */
  EXP_BASE: [70, 320, 1500, 7000, 32000, 150000, 700000, 3200000, 15000000, 70000000],
  LAYER_MULT: [1, 1.5, 2, 2.5],
  /** 各境界寿元上限（岁） */
  LIFESPAN: [120, 240, 500, 1000, 2000, 4000, 8000, 16000, 32000, 99999],
  GRADE_NAMES: ['凡级', '灵级', '玄级', '地级', '天级', '仙级'],
  ATTR_NAMES: { gen: '根骨', comp: '悟性', luck: '福缘', body: '体魄' },
  ATTR_DESC: {
    gen: '影响攻击与出手身法',
    comp: '影响修炼效率与突破机缘',
    luck: '影响暴击、掉宝与奇遇',
    body: '影响气血、防御与丹毒上限',
  },
  /** 修为经济系数：各系统的修为产出按此随境界同步放大，保证节奏一致 */
  eco(r) { return Math.pow(4.6, r); },
  /** 灵石经济系数 */
  stoneEco(r) { return Math.pow(3.8, r); },
  layerNeed(realmIdx, layer) {
    return Math.round(this.EXP_BASE[realmIdx] * this.LAYER_MULT[layer]);
  },

  /** v18：种族克制系数（1=克制，0=被克，-1=中立） */
  speciesRelation(attackerSpecies, defenderSpecies) {
    const order = this.BALANCE.SPECIES_COUNTER.order;
    const idx = order.indexOf(attackerSpecies);
    const defIdx = order.indexOf(defenderSpecies);
    if (idx < 0 || defIdx < 0) return 0;
    // 克制：攻击方克制防御方（idx 的下一个是 defIdx）
    const next = (idx + 1) % order.length;
    if (next === defIdx) return 1;
    // 被克：防御方克制攻击方（defIdx 的下一个是 idx）
    const nextDef = (defIdx + 1) % order.length;
    if (nextDef === idx) return -1;
    return 0;
  },

  /* ---------- v18 数值常量集中配置 ---------- */
  BALANCE: {
    // 战斗
    COMBAT: {
      AFTER_DEF_DENOM: 140,       // 防御减伤常数：atk * (1 - def/(def + 140))
      DMG_RAND_MIN: 0.85,         // 伤害随机下限
      DMG_RAND_MAX: 1.15,         // 伤害随机上限
      CRIT_MULT: 1.7,             // 暴击倍率
      ENEMY_CRIT_MULT: 1.6,       // 敌方暴击倍率
      HIT_CHANCE_CLAMP: [2, 35],  // 命中率钳制
      PLAYER_MISS_MAX: 35,        // 玩家失手上限
      ENEMY_DODGE_MAX: 65,        // 敌方闪避上限
      BLOCK_REDUCTION: 0.45,      // 格挡后伤害系数
      DEFEND_REDUCTION: 0.4,      // 防御姿态伤害系数
      MORALE_PER_POINT: 0.004,    // 每点战意伤害加成
      MORALE_MAX: 100,            // 战意上限
      COMBO_PER_LAYER: 0.04,      // 每层连击伤害加成
      COMBO_MAX: 5,               // 连击上限
      GUARD_DEF_BASE: 40,         // 铁壁基础防御加成%
      FLEE_BASE: 45,              // 遁走基础成功率
    },
    // 突破
    BREAKTHROUGH: {
      BASE_CHANCE: 40,            // 基准成算
      COMP_FACTOR: 2,             // 悟性系数
      FORTUNE_FACTOR: 0.2,        // 气运系数
      KARMA_FACTOR: 0.2,          // 孽障系数
      BODY_MULT: 1.4,             // 体修渡劫加成
      SWORD_MULT: 0.77,           // 剑修渡劫惩罚
      STREAK_BONUS_MAX: 15,       // 连败保底上限
      QUIET_CULT_BONUS: 15,       // 静修冲关加成
      REALM_PENALTY_PER: 0.035,   // 每境界劫难折损
      REALM_PENALTY_MIN: 0.5,     // 劫难折损下限
      REALM_PENALTY_MAX: 1.0,     // 劫难折损上限
      FAIL_HP_RETAIN: 0.1,        // 失败保留气血比例
      FAIL_EXP_RETAIN: 0.6,       // 失败保留修为比例
      FAIL_INSIGHT_GAIN: 15,      // 失败获得感悟
      HARD_MULT: 0.82,            // 硬抗系数
      ARTIFACT_MULT: 1.3,         // 法宝系数
      HIDE_MULT: 1.0,             // 借地系数
    },
    // 属性上限
    STATS: {
      ATTR_MAX: 10,               // 先天属性上限
      CRIT_MAX: 75,               // 暴击率上限
      DODGE_MAX: 35,              // 闪避率上限
      BLOCK_MAX: 60,              // 格挡率上限
      POISON_BASE: 60,            // 丹毒基础上限
      POISON_BODY_FACTOR: 8,      // 体魄丹毒系数
      POISON_REALM_BONUS: 20,     // 合道丹毒上限加成
    },
    // 驯服
    TAME: {
      BASE_RATE: 45,              // 驯服基准成功率
      LUCK_FACTOR: 2,             // 福缘系数
      RATE_MIN: 8,                // 成功率下限
      RATE_MAX: 90,               // 成功率上限
      SKILL_FACTOR: 10,           // 驯熟练度每多少点+1%
      HP_THRESHOLD: 0.2,          // 可驯服血量阈值
      TAMEABLE: ['beast', 'snake', 'swarm', 'plant', 'element'],
    },
    // 修炼
    CULTIVATE: {
      BASE_GAIN_FACTOR: 12,       // 基础修为：12 + 悟性*2
      COMP_FACTOR: 2,
      REALM_GROWTH: 4.6,          // 每境界修为放大系数
      LAYER_GROWTH: 0.15,         // 每小层修为加成
      SECLUDE_MULT: 1.6,          // 闭关倍率
      SECLUDE_MAX_ROUNDS: 120,    // 最大闭关轮数
      AUTO_CULT_SPEED: 280,       // 自动修炼间隔 ms
      EVENT_CHANCE: 8,            // 灵机事件触发概率%
      EVENT_SURGE_MULT: 2.5,      // 灵气潮涌倍率
      EVENT_EPIPHANY_MULT: 1.5,   // 醍醐灌顶倍率
      EVENT_HEART_MULT: 0.55,     // 心魔滋扰倍率
    },
    // 经济
    ECONOMY: {
      ECO_BASE: 4.6,              // 修为经济基数
      STONE_ECO_BASE: 3.8,        // 灵石经济基数
      SELL_RATIO: 0.4,            // 出售价比例
      SHOP_FLUCTUATION: 0.2,      // 坊市行情波动±
      BOUNTY_DAYS: 2,             // 悬赏保留天数
      BLACK_MARKET_INTERVAL: 30,  // 黑市间隔
      BLACK_MARKET_DURATION: 3,   // 黑市持续天数
      BLACK_MARKET_PRICE: 1.6,    // 黑市价格倍率
    },
    // v18 种族克制：七族循环克制，克制时 +15%伤害
    SPECIES_COUNTER: {
      order: ['beast', 'plant', 'element', 'ghost', 'human', 'construct', 'swarm', 'snake'],
      bonus: 0.15,  // 克制时伤害加成
    },
    // 强化
    ENHANCE: {
      MAX_LV: 10,                 // 强化上限
      PER_LV_BONUS: 0.1,          // 每级属性加成
      DROP_LV_THRESHOLD: 7,       // +7起失败掉级
      DROP_LV: 1,                 // 失败掉级数
      BASE_COST: 120,             // 强化基础灵石
      COST_PER_LV: 90,            // 每级灵石增量
      COST_GRADE_FACTOR: 0.8,     // 品质系数
      COST_REALM_FACTOR: 2.4,     // 境界系数
    },
  },

  /* ---------- 物品注册表（丹药 / 功法 / 法宝 / 材料） ----------
   * use: 丹药效果；bonus: 功法加成 [基础值, 每级增量]；
   * slot: 法宝槽位 weapon/armor/accessory；tier: 材料档次
   */
  ITEMS: {
    /* ---- 丹药 ---- */
    pill_juqi:     { name: '聚气丹',   type: 'pill', grade: 0, price: 60,     desc: '凝聚散逸灵气，服之可得六十点修为。', use: { exp: 60 }, poison: 6 },
    pill_ningqi:   { name: '凝气丹',   type: 'pill', grade: 1, price: 220,    desc: '筑基修士常备丹药，服之可得二百四十点修为。', use: { exp: 240 }, poison: 14 },
    pill_peiyuan:  { name: '培元丹',   type: 'pill', grade: 1, price: 550,    desc: '温养元气，服之可得六百点修为。', use: { exp: 600 }, poison: 25 },
    pill_pojing:   { name: '破境丹',   type: 'pill', grade: 2, price: 1800,   desc: '药力霸道，服之可得两千点修为，丹毒颇深。', use: { exp: 2000 }, poison: 45 },
    pill_jiuzhuan: { name: '九转金丹', type: 'pill', grade: 3, price: 13000,  desc: '丹中极品，服之得一万五千点修为。', use: { exp: 15000 }, poison: 60 },
    pill_taichu:   { name: '太初神丹', type: 'pill', grade: 4, price: 70000,  desc: '蕴含太初之气，服之得八万点修为。', use: { exp: 80000 }, poison: 75 },
    pill_zaohua:   { name: '造化仙丹', type: 'pill', grade: 5, price: 350000, desc: '夺天地造化，服之得四十万点修为。', use: { exp: 400000 }, poison: 90 },
    pill_zhuji:    { name: '筑基丹',   type: 'pill', grade: 2, price: 5000,   desc: '冲击瓶颈至宝，服之顿悟，突破感悟 +50。', use: { insight: 50 }, poison: 10 },
    pill_liaoshang:{ name: '疗伤丹',   type: 'pill', grade: 0, price: 80,     desc: '止血生肌，恢复六成气血。', use: { hpPct: 60 }, poison: 2, battle: true },
    pill_huiling:  { name: '回灵丹',   type: 'pill', grade: 0, price: 60,     desc: '凝神静气，恢复八成灵力。', use: { mpPct: 80 }, poison: 2, battle: true },
    pill_jiedu:    { name: '解毒丹',   type: 'pill', grade: 0, price: 120,    desc: '化解丹毒四十点。', use: { curePoison: 40 }, poison: 0, battle: true },
    pill_xisui:    { name: '洗髓丹',   type: 'pill', grade: 2, price: 0,      desc: '洗涤经脉，随机先天属性 +1（上限十点）。', use: { stat: 1 }, poison: 20, battle: false },
    /* ---- v13 新增：战斗增益丹（战斗中使用，临时增益）与高阶丹药 ---- */
    pill_kuangbao: { name: '狂暴丹',   type: 'pill', grade: 2, price: 1200,   desc: '药力霸道，战斗服之气血贲张——攻击 +30%，持续三回合（战斗中可用）。', buff: { atkPct: 30, rounds: 3 }, poison: 12, battle: true },
    pill_tiegu:    { name: '铁骨丹',   type: 'pill', grade: 2, price: 1000,   desc: '服之筋骨如铁——防御 +40%，持续三回合（战斗中可用）。', buff: { defPct: 40, rounds: 3 }, poison: 10, battle: true },
    pill_qingshen: { name: '轻身丹',   type: 'pill', grade: 1, price: 800,    desc: '服之身轻如燕——身法 +30%、闪避 +10%，持续三回合（战斗中可用）。', buff: { spdPct: 30, dodge: 10, rounds: 3 }, poison: 6, battle: true },
    pill_mingmu:   { name: '明目丹',   type: 'pill', grade: 1, price: 800,    desc: '服之目若朗星——暴击 +12%，持续三回合（战斗中可用）。', buff: { crit: 12, rounds: 3 }, poison: 6, battle: true },
    pill_dahuan:   { name: '大还丹',   type: 'pill', grade: 3, price: 6000,   desc: '续命奇丹，气血尽复，兼化二十点丹毒。', use: { hpPct: 100, curePoison: 20 }, poison: 15, battle: true },
    pill_qingxin:  { name: '清心丹',   type: 'pill', grade: 1, price: 500,    desc: '宁神定魄，服之可解束缚、缓滞诸般禁制（战斗中可用，解除自身负面状态）。', use: { purge: 1 }, poison: 0, battle: true },
    pill_posha:    { name: '破煞丹',   type: 'pill', grade: 2, price: 2400,   desc: '药力如破军煞气，服之可得五千点修为。', use: { exp: 5000 }, poison: 50 },
    pill_xuanling: { name: '玄灵丹',   type: 'pill', grade: 3, price: 9000,   desc: '玄灵蕴道，服之突破感悟 +25。', use: { insight: 25 }, poison: 18 },
    pill_guben:    { name: '固本培元丹', type: 'pill', grade: 2, price: 2000,  desc: '固本培元，气血灵力各复五成。', use: { hpPct: 50, mpPct: 50 }, poison: 10, battle: true },
    pill_yulu:     { name: '九花玉露丸', type: 'pill', grade: 2, price: 1600,  desc: '玉露酿就，灵力尽复，兼得八百修为。', use: { mpPct: 100, exp: 800 }, poison: 12, battle: true },
    pill_yuanshen: { name: '元神丹',   type: 'pill', grade: 4, price: 45000,  desc: '温养元神，服之得四万点修为、突破感悟 +10。', use: { exp: 40000, insight: 10 }, poison: 70 },
    pill_tianyuan: { name: '天元造化丹', type: 'pill', grade: 5, price: 220000, desc: '丹道至高造化，服之得廿五万点修为。', use: { exp: 250000 }, poison: 85 },
    /* ---- 符箓（符修可画可售，战斗中人人可祭出）---- */
    tal_huoshe: { name: '火蛇符', type: 'talisman', grade: 1, price: 25, ecoPrice: true, power: 2.2, desc: '朱砂勾火蛇之形，掷出化焰伤敌（战斗中造成约2.2倍攻击伤害，符光必中）。', fkind: 'damage' },
    tal_zilei:  { name: '紫雷符', type: 'talisman', grade: 2, price: 90, ecoPrice: true, power: 3.5, desc: '紫霄雷符，一击之威如雷劫临身（战斗中造成约3.5倍攻击伤害，符光必中）。', fkind: 'damage' },
    /* ---- v13 新增符箓：护身 / 限制 / 增益全谱 ---- */
    tal_jinguang: { name: '金光符', type: 'talisman', grade: 1, price: 45, ecoPrice: true, desc: '金光护体——两回合内所受伤害减轻四成（战斗中可用）。', fkind: 'shield', power: 40, rounds: 2 },
    tal_jifengfu: { name: '疾风符', type: 'talisman', grade: 1, price: 40, ecoPrice: true, desc: '身化疾风——两回合内闪避大增（+25%）（战斗中可用）。', fkind: 'dodge', power: 25, rounds: 2 },
    tal_fuling:   { name: '缚灵符', type: 'talisman', grade: 2, price: 70, ecoPrice: true, desc: '符光化索缚敌身——敌方身法迟滞三成，持续两回合（战斗中可用，必中）。', fkind: 'slow', power: 30, rounds: 2 },
    tal_shigu:    { name: '蚀骨符', type: 'talisman', grade: 2, price: 75, ecoPrice: true, desc: '蚀骨腐甲——敌方防御剧降三成五，持续两回合（战斗中可用，必中）。', fkind: 'defdown', power: 35, rounds: 2 },
    tal_bingpo:   { name: '冰魄符', type: 'talisman', grade: 3, price: 160, ecoPrice: true, desc: '冰魄封形——寒气封敌周身，使其下一回合无法动弹（战斗中可用，必中；强敌抵抗几率略高）。', fkind: 'freeze', rounds: 1 },
    tal_posha:    { name: '破煞符', type: 'talisman', grade: 3, price: 180, ecoPrice: true, power: 4.6, desc: '破军煞符，一符破万法（战斗中造成约4.6倍攻击伤害，符光必中，并使敌方破防两成）。', fkind: 'damage', debuff: { defdown: 20, rounds: 2 } },
    /* ---- 功法 ---- */
    gf_tuna:    { name: '吐纳诀',       type: 'gongfa', gtype: 'support', grade: 0, price: 200,   desc: '最基础的吐纳法门，可提升修炼效率。', bonus: { cult: [6, 3] } },
    gf_canghai: { name: '沧海剑诀',     type: 'gongfa', gtype: 'attack',  grade: 0, price: 300,   desc: '普通剑修入门剑诀。', bonus: { atkPct: [4, 2] }, skill: { name: '沧浪一剑', kind: 'damage', power: 1.55, mp: 10, desc: '凝聚剑气奋力一斩' } },
    gf_tiebu:   { name: '铁布衫',       type: 'gongfa', gtype: 'defense', grade: 0, price: 260,   desc: '外门横练功法，皮糙肉厚。', bonus: { defPct: [5, 2], hpPct: [4, 2] }, skill: { name: '罡气护体', kind: 'buffDef', power: 70, mp: 12, rounds: 2, desc: '两回合内防御大增' } },
    gf_lieyang: { name: '烈阳掌',       type: 'gongfa', gtype: 'attack',  grade: 1, price: 2500,  desc: '掌出如烈阳，灼热逼人。', bonus: { atkPct: [6, 3], crit: [1, 0.5] }, skill: { name: '烈阳焚空', kind: 'damage', power: 1.85, mp: 14, desc: '灼热掌力轰击敌人' } },
    gf_xuantian:{ name: '玄天护体功',   type: 'gongfa', gtype: 'defense', grade: 1, price: 2200,  desc: '玄门护体神功，固若金汤。', bonus: { defPct: [8, 3], hpPct: [6, 3], block: [3, 1.5] } },
    gf_jifeng:  { name: '疾风步',       type: 'gongfa', gtype: 'support', grade: 1, price: 2000,  desc: '身法轻灵，来去如风。', bonus: { spdPct: [8, 4], dodge: [2, 1] }, skill: { name: '残影步', kind: 'buffDodge', power: 25, mp: 8, rounds: 2, desc: '两回合内闪避大增' } },
    gf_tiangang:{ name: '天罡炼体诀',   type: 'gongfa', gtype: 'support', grade: 2, price: 9000,  desc: '淬炼肉身如天罡，气血绵长。', bonus: { hpPct: [8, 4], defPct: [6, 3], cult: [5, 2] } },
    gf_wanjian: { name: '万剑诀',       type: 'gongfa', gtype: 'attack',  grade: 2, price: 0,     desc: '御剑之术大成者，万剑齐发。', bonus: { atkPct: [9, 4] }, skill: { name: '万剑归宗', kind: 'damage', power: 2.3, mp: 20, desc: '万千剑气倾泻而下' } },
    gf_jianqich:{ name: '剑气长城',     type: 'gongfa', gtype: 'defense', grade: 2, price: 0,     desc: '剑气如城墙般护住周身。', bonus: { defPct: [11, 5], block: [5, 2] }, skill: { name: '剑气壁垒', kind: 'buffDef', power: 110, mp: 16, rounds: 2, desc: '剑气成壁，防御剧增' } },
    gf_tumo:    { name: '屠魔剑典',     type: 'gongfa', gtype: 'attack',  grade: 3, price: 0,     desc: '上古剑修斩魔所留剑典，杀伐凌厉。', bonus: { atkPct: [13, 6], crit: [2, 1] }, skill: { name: '魔渊斩', kind: 'damage', power: 2.8, mp: 25, desc: '一剑斩落，魔气皆消' } },
    gf_dayan:   { name: '大衍神诀',     type: 'gongfa', gtype: 'support', grade: 3, price: 0,     desc: '推演天机之法，修行事半功倍。', bonus: { cult: [12, 5], mpPct: [10, 5], crit: [1, 0.5] } },
    gf_bumie:   { name: '不灭金身',     type: 'gongfa', gtype: 'defense', grade: 3, price: 0,     desc: '炼就金刚不坏之身。', bonus: { hpPct: [15, 7], defPct: [14, 6] }, skill: { name: '金身不灭', kind: 'heal', power: 40, mp: 22, desc: '恢复四成气血' } },
    gf_zixiao:  { name: '紫霄仙雷',     type: 'gongfa', gtype: 'attack',  grade: 4, price: 0,     desc: '引九天仙雷入体，一击惊天。', bonus: { atkPct: [14, 6], mpPct: [10, 4] }, skill: { name: '紫霄神雷', kind: 'damage', power: 3.1, mp: 26, desc: '九天神雷轰然而落' } },
    gf_jianxin: { name: '剑心通明',     type: 'gongfa', gtype: 'attack',  grade: 5, price: 0,     desc: '仙家剑道至高典籍，剑心通明，万法不侵。', bonus: { atkPct: [20, 9], crit: [3, 1.5] }, skill: { name: '剑心一瞬', kind: 'damage', power: 3.6, mp: 30, desc: '剑光一闪，天地失色' } },
    gf_hongmeng:{ name: '鸿蒙道经',     type: 'gongfa', gtype: 'support', grade: 5, price: 0,     desc: '记载鸿蒙大道的无上经文，修之百脉皆通。', bonus: { cult: [20, 8], hpPct: [10, 5], mpPct: [10, 5], atkPct: [8, 4] } },
    /* ---- v13 新增功法 ---- */
    gf_hansha:  { name: '寒沙掌',       type: 'gongfa', gtype: 'attack',  grade: 1, price: 2400,  desc: '掌含寒沙，中者气血滞涩。', bonus: { atkPct: [7, 3] }, skill: { name: '寒沙漫天', kind: 'damage', power: 2.0, mp: 15, desc: '寒沙蔽日，冻人筋骨' } },
    gf_yulin:   { name: '御林诀',       type: 'gongfa', gtype: 'defense', grade: 2, price: 8500,  desc: '御木成林为屏，守御一脉的上乘法门。', bonus: { defPct: [9, 4], hpPct: [7, 3] }, skill: { name: '木灵守心', kind: 'heal', power: 32, mp: 18, desc: '木灵生机，疗愈伤势' } },
    gf_feixian: { name: '飞仙步',       type: 'gongfa', gtype: 'support', grade: 3, price: 0,     desc: '举步生风，恍若飞仙。', bonus: { spdPct: [12, 5], dodge: [4, 2] }, skill: { name: '踏虚九步', kind: 'buffDodge', power: 40, mp: 12, rounds: 2, desc: '身形虚幻，两回合内难以捉摸' } },
    gf_lidu:    { name: '离火神雷',     type: 'gongfa', gtype: 'attack',  grade: 4, price: 0,     desc: '离火淬雷，焚天煮海。', bonus: { atkPct: [15, 7], crit: [2, 1] }, skill: { name: '离火天雷', kind: 'damage', power: 3.2, mp: 28, desc: '雷火交加，轰然炸裂' } },
    gf_taiyin:  { name: '太阴炼形',     type: 'gongfa', gtype: 'support', grade: 4, price: 0,     desc: '采太阴之精华炼形养魄，源远流长。', bonus: { cult: [14, 6], hpPct: [12, 5], mpPct: [12, 5] } },
    /* ---- v13 职业专属功法（daoLimit：仅该大道可修习） ---- */
    gf_zhuixian:{ name: '追星逐月剑',   type: 'gongfa', gtype: 'attack',  grade: 3, price: 0, daoLimit: 'sword', desc: '剑修秘传，剑出如星坠月落，唯剑心不悔者可修。', bonus: { atkPct: [16, 7], spdPct: [6, 3] }, skill: { name: '星坠之剑', kind: 'damage', power: 3.0, mp: 26, desc: '一剑既出，如星坠长空' } },
    gf_danjing: { name: '九转丹经',     type: 'gongfa', gtype: 'support', grade: 3, price: 0, daoLimit: 'pill', desc: '丹道圣典，九转炉火皆在其中，唯丹道传人可修。', bonus: { cult: [14, 6], hpPct: [8, 4] } },
    gf_tianfu:  { name: '天符宝箓',     type: 'gongfa', gtype: 'support', grade: 3, price: 0, daoLimit: 'talisman', desc: '符门至宝，笔下符箓如有天助，唯符修可修。', bonus: { crit: [3, 1.5], mpPct: [10, 4] } },
    gf_banti:   { name: '般若炼体术',   type: 'gongfa', gtype: 'defense', grade: 1, price: 0, daoLimit: 'body', desc: '体修不二法门，以肉身参悟般若，唯体修可修。', bonus: { hpPct: [10, 5], defPct: [8, 4], block: [4, 2] } },
    gf_zhoutian:{ name: '周天星斗阵图', type: 'gongfa', gtype: 'support', grade: 3, price: 0, daoLimit: 'array', desc: '阵道无上典籍，周天星辰皆可为阵，唯阵道传人可修。', bonus: { cult: [10, 4], defPct: [8, 4] } },
    gf_xuesha:  { name: '血煞魔功',     type: 'gongfa', gtype: 'attack',  grade: 3, price: 0, daoLimit: 'demonic', desc: '魔道禁术，以血养煞，越战越强，唯邪修可修。', bonus: { atkPct: [15, 7], hpPct: [6, 3] }, skill: { name: '血煞夺魄', kind: 'damage', power: 2.9, mp: 24, desc: '血煞滔天，夺人心魄' } },
    /* ---- 法宝（装备） ---- */
    w_tiejian:  { name: '铁剑',       type: 'artifact', slot: 'weapon',    grade: 0, price: 200,    desc: '凡铁所铸，聊胜于无。', bonus: { atk: 6 } },
    w_qinggang: { name: '青钢剑',     type: 'artifact', slot: 'weapon',    grade: 1, price: 1500,   desc: '掺入精钢淬炼，锋芒初显。', bonus: { atk: 18, crit: 2 } },
    w_sanqing:  { name: '三尺青锋',   type: 'artifact', slot: 'weapon',    grade: 2, price: 12000,  desc: '剑出三尺，青光凛冽。', bonus: { atk: 55, atkPct: 5 } },
    w_zhuxian:  { name: '诛仙剑影',   type: 'artifact', slot: 'weapon',    grade: 3, price: 100000, desc: '上古诛仙剑阵遗落的一缕剑影。', bonus: { atk: 160, atkPct: 12 } },
    a_buyi:     { name: '粗布衣',     type: 'artifact', slot: 'armor',     grade: 0, price: 150,    desc: '粗布麻衣，御寒尚可。', bonus: { def: 4, hp: 30 } },
    a_huxin:    { name: '护心镜',     type: 'artifact', slot: 'armor',     grade: 1, price: 1200,   desc: '镜护心脉，可挡致命一击。', bonus: { def: 14, hp: 120 } },
    a_xuangui:  { name: '玄龟甲',     type: 'artifact', slot: 'armor',     grade: 2, price: 10000,  desc: '千年玄龟蜕下之甲，坚不可摧。', bonus: { def: 40, hpPct: 8 } },
    a_longlin:  { name: '龙鳞宝甲',   type: 'artifact', slot: 'armor',     grade: 3, price: 90000,  desc: '蛟龙鳞片缀成，水火不侵。', bonus: { def: 110, hpPct: 15 } },
    z_juling:   { name: '聚灵珠',     type: 'artifact', slot: 'accessory', grade: 0, price: 300,    desc: '缓慢聚敛灵气，扩充灵力。', bonus: { mp: 40 } },
    z_pingan:   { name: '平安符',     type: 'artifact', slot: 'accessory', grade: 0, price: 500,    desc: '高人手书符箓，可保平安添福缘。', bonus: { luck: 1 } },
    z_jifengxue:{ name: '疾风靴',     type: 'artifact', slot: 'accessory', grade: 1, price: 1600,   desc: '踏风而行，身形飘忽。', bonus: { spd: 25, dodge: 3 } },
    z_qiankun:  { name: '乾坤戒',     type: 'artifact', slot: 'accessory', grade: 2, price: 8000,   desc: '内藏乾坤，聚财纳宝，灵石所得 +20%。', bonus: { stonePct: 20 } },
    z_taiji:    { name: '太极玉',     type: 'artifact', slot: 'accessory', grade: 3, price: 80000,  desc: '道蕴天成，诸般属性皆有所增。', bonus: { atkPct: 6, defPct: 6, hpPct: 6 } },
    /* ---- v13 新增装备（补齐各槽位品级） ---- */
    w_tulong:   { name: '屠龙刀',     type: 'artifact', slot: 'weapon',    grade: 1, price: 1800,   desc: '刀沉势猛，隐有龙吟。', bonus: { atk: 20, crit: 1 } },
    w_hanshuang:{ name: '寒霜剑',     type: 'artifact', slot: 'weapon',    grade: 2, price: 11000,  desc: '剑覆寒霜，触之气血凝滞。', bonus: { atk: 60, crit: 3 } },
    a_xingyi:   { name: '星羽法衣',   type: 'artifact', slot: 'armor',     grade: 2, price: 9500,   desc: '以星禽之羽织就，轻若无物。', bonus: { def: 36, spd: 18, hp: 100 } },
    z_xingpan:  { name: '周天星盘',   type: 'artifact', slot: 'accessory', grade: 2, price: 7000,   desc: '星盘自转，指引周天灵机。', bonus: { crit: 4, spd: 20, cult: 4 } },
    /* ---- v13 玄天套装（防御线，3 件成套） ---- */
    s_xt_jian:  { name: '玄天古剑',   type: 'artifact', slot: 'weapon',    grade: 3, price: 0, set: 'xuantian', desc: '玄天套装之一：古朴玄剑，守御之意自生。', bonus: { atk: 130, def: 30 } },
    s_xt_jia:   { name: '玄天宝甲',   type: 'artifact', slot: 'armor',     grade: 3, price: 0, set: 'xuantian', desc: '玄天套装之二：玄光内蕴，刀枪不入。', bonus: { def: 100, hp: 400 } },
    s_xt_pei:   { name: '玄天玉佩',   type: 'artifact', slot: 'accessory', grade: 3, price: 0, set: 'xuantian', desc: '玄天套装之三：玉佩温润，护持心脉。', bonus: { def: 40, hp: 250, block: 5 } },
    /* ---- v13 赤霄套装（攻击线，3 件成套） ---- */
    s_cx_jian:  { name: '赤霄神剑',   type: 'artifact', slot: 'weapon',    grade: 3, price: 0, set: 'chixiao', desc: '赤霄套装之一：赤霄贯日，锋芒毕露。', bonus: { atk: 170, crit: 4 } },
    s_cx_pao:   { name: '赤霄战袍',   type: 'artifact', slot: 'armor',     grade: 3, price: 0, set: 'chixiao', desc: '赤霄套装之二：战袍如焰，杀气腾腾。', bonus: { def: 70, atk: 40, hp: 260 } },
    s_cx_gou:   { name: '赤霄战勾',   type: 'artifact', slot: 'accessory', grade: 3, price: 0, set: 'chixiao', desc: '赤霄套装之三：战意灌注，出手狠辣。', bonus: { atk: 60, crit: 5 } },
    /* ---- v13 炼器专属（天级装备，只能炼器获得） ---- */
    w_tianwen:  { name: '天问剑',     type: 'artifact', slot: 'weapon',    grade: 4, price: 0, desc: '以问天之姿铸就的绝世神剑，剑鸣可裂云层。', bonus: { atk: 260, atkPct: 14, crit: 5 } },
    a_taiyi:    { name: '太乙道袍',   type: 'artifact', slot: 'armor',     grade: 4, price: 0, desc: '太乙真人亲织道袍，万法不侵。', bonus: { def: 180, hp: 800, hpPct: 10 } },
    z_longyu:   { name: '龙魂玉',     type: 'artifact', slot: 'accessory', grade: 4, price: 0, desc: '以真龙残魂炼制的玉佩，龙威护主。', bonus: { atkPct: 10, defPct: 10, hpPct: 10, luck: 2 } },
    z_hunpo:    { name: '魂珀',       type: 'artifact', slot: 'accessory', grade: 3, price: 0, desc: '万年魂珀，温养神魂，修行事半功倍。', bonus: { cult: 10, mp: 200, crit: 3 } },
    /* ---- 材料 ---- */
    m_lingcao:  { name: '百年灵草',   type: 'material', tier: 1, price: 80,    desc: '蕴含百年灵气的药草，炼丹辅药。' },
    m_yaopi:    { name: '妖兽皮革',   type: 'material', tier: 1, price: 60,    desc: '一阶妖兽的皮，坚韧异常。' },
    m_xuantie:  { name: '玄铁矿',     type: 'material', tier: 1, price: 100,   desc: '含灵气的黑铁矿石，炼器良材。' },
    m_lingzhi:  { name: '千年灵芝',   type: 'material', tier: 2, price: 600,   desc: '药香扑鼻，乃疗伤圣药之引。' },
    m_neidan:   { name: '妖兽内丹',   type: 'material', tier: 2, price: 800,   desc: '二阶妖兽体内凝结的丹核。' },
    m_xuecan:   { name: '雪蚕丝',     type: 'material', tier: 2, price: 700,   desc: '雪山灵蚕所吐，轻若无物。' },
    m_xuelian:  { name: '万年雪莲',   type: 'material', tier: 3, price: 5000,  desc: '生于极寒之巅，可遇不可求。' },
    m_lianhun:  { name: '炼魂石',     type: 'material', tier: 3, price: 6000,  desc: '可温养神魂的奇石。' },
    m_longxue:  { name: '龙血琥珀',   type: 'material', tier: 3, price: 8000,  desc: '凝固了真龙之血的琥珀。' },
    m_xianjing: { name: '仙晶',       type: 'material', tier: 4, price: 50000, desc: '灵气凝结成晶，仙家之物。' },
    m_shentie:  { name: '太古神铁',   type: 'material', tier: 4, price: 65000, desc: '太古陨铁，炼制仙剑之材。' },
    /* ---- v13 新增材料 ---- */
    m_huolin:   { name: '火灵晶',     type: 'material', tier: 3, price: 7000,  desc: '地火千年凝结的晶石，炼器炼丹皆可助燃。' },
    m_bingpo:   { name: '冰魄石',     type: 'material', tier: 3, price: 7500,  desc: '寒潭深处所产的奇石，触之生寒。' },
    m_xingchen: { name: '星辰砂',     type: 'material', tier: 4, price: 42000, desc: '天外飞舟残骸中剥落的星辉之砂。' },
    m_jiaojin:  { name: '蛟筋',       type: 'material', tier: 4, price: 55000, desc: '蛟龙的筋络，坚韧异常，炼器上品。' },
    m_haixin:   { name: '沧海之心',   type: 'material', tier: 4, price: 85000, desc: '龙渊海眼深处凝结的蓝晶，内蕴沧海。' },
    m_shenmu:   { name: '建木神枝',   type: 'material', tier: 4, price: 95000, desc: '通天建木的一截神枝，生机不灭。' },
    /* ---- v13 灵田种子（洞府种植用） ---- */
    m_qianghua: { name: '强化石',     type: 'material', tier: 3, price: 3000,  desc: '蕴含精纯灵性的晶石，祭炼强化法宝时掺入一枚，+7 以上强化必定成功。' },
    seed_lingcao:  { name: '灵草种',   type: 'seed', grade: 1, price: 40,    crop: 'm_lingcao',  days: 10, desc: '播入灵田，十日可收【百年灵草】。' },
    seed_lingzhi:  { name: '灵芝种',   type: 'seed', grade: 2, price: 500,   crop: 'm_lingzhi',  days: 25, desc: '播入灵田，廿五日可收【千年灵芝】。' },
    seed_bingpo:   { name: '冰魄花种', type: 'seed', grade: 2, price: 900,   crop: 'm_bingpo',   days: 30, desc: '播入灵田，三十日可收【冰魄石】。' },
    seed_xuelian:  { name: '雪莲种',   type: 'seed', grade: 3, price: 4500,  crop: 'm_xuelian',  days: 45, desc: '播入灵田，四十五日可收【万年雪莲】。' },
    seed_lianhun:  { name: '炼魂花种', type: 'seed', grade: 3, price: 5200,  crop: 'm_lianhun',  days: 50, desc: '播入灵田，五十日可收【炼魂石】。' },
    seed_xingchen: { name: '星辉草种', type: 'seed', grade: 4, price: 30000, crop: 'm_xingchen', days: 60, desc: '播入灵田，六十日可收【星辰砂】。' },
    /* ---- v3 秘境专属：失传功法 / 上古法宝碎片 / 本命法宝 / 派系信物 ---- */
    gf_wangchen:{ name: '忘尘剑意',   type: 'gongfa', gtype: 'attack',  grade: 4, price: 0, desc: '秘境失传剑意，一剑忘尘，物我两断。', bonus: { atkPct: [16, 7], crit: [3, 1.5] }, skill: { name: '忘尘一剑', kind: 'damage', power: 3.3, mp: 28, desc: '忘却尘俗的一剑，快过天雷' } },
    gf_hunyuan: { name: '混元真解',   type: 'gongfa', gtype: 'support', grade: 4, price: 0, desc: '秘境失传心法，混元一气，百脉皆通。', bonus: { cult: [15, 6], hpPct: [12, 5], mpPct: [12, 5] } },
    gf_niepan:  { name: '涅槃圣法',   type: 'gongfa', gtype: 'defense', grade: 5, price: 0, desc: '凤凰涅槃之秘法，置之死地而后生。', bonus: { hpPct: [18, 8], defPct: [15, 7] }, skill: { name: '涅槃重生', kind: 'heal', power: 55, mp: 30, desc: '沐浴火光，重续生机' } },
    m_gupian:   { name: '上古法宝碎片', type: 'material', tier: 4, price: 6000, desc: '上古法宝崩碎后的残片，隐有器灵低鸣。集齐九枚可炼化合成本命法宝。' },
    z_benming:  { name: '本命法宝',   type: 'artifact', slot: 'accessory', grade: 5, price: 0, desc: '以九枚上古碎片炼化而成，与本命神魂相合，攻防气感皆得其益。', bonus: { atkPct: 12, defPct: 12, hpPct: 12, crit: 3, cult: 8, luck: 2 } },
    z_tianshu:  { name: '天枢战纹',   type: 'artifact', slot: 'accessory', grade: 2, price: 0, desc: '天枢殿长老亲手炼制的战纹玉符，勇猛精进。', bonus: { atkPct: 8, crit: 3 } },
    z_danxin:   { name: '丹心玉佩',   type: 'artifact', slot: 'accessory', grade: 2, price: 0, desc: '丹鼎阁信物，温养气脉，绵长持久。', bonus: { hpPct: 10, mpPct: 10 } },
    z_cangjing: { name: '藏经阁印',   type: 'artifact', slot: 'accessory', grade: 2, price: 0, desc: '藏经楼信物，执此印者阅典有先，修行事半功倍。', bonus: { cult: 6, luck: 1 } },
  },

  /** 按档次取材料列表 */
  matsByTier(tier) {
    return Object.entries(this.ITEMS)
      .filter(([, d]) => d.type === 'material' && d.tier === tier)
      .map(([id]) => id);
  },

  /* ---------- 怪物注册表（power = 境界强度 0~39，即大境界*4+层次） ----------
   * v13 技能池：skills = [{ name, w 权重, kind, ... }]，战斗中按权重出招；
   *   kind：poison中毒 / burn灼烧 / bleed流血 / defdown破防 / slow迟滞 / weaken虚弱 /
   *         stun束缚 / drain吸血重击 / mpburn摄魂 / guard铁壁 / roar咆哮 / heal自愈
   * v13 立绘：species 形象类型（beast兽/snake蛇/swarm虫群/human人形/plant草木/ghost阴魂/construct傀儡/element灵体） */
  MONSTERS: {
    m_yezhu:     { name: '野猪',         power: 0,  hp: 1.1,  atk: 0.9, species: 'beast', skills: [{ name: '獠牙冲撞', w: 25, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_dushe:     { name: '毒蛇',         power: 1,  hp: 0.8,  atk: 1.15, spd: 1.3, species: 'snake', skills: [{ name: '淬毒牙', w: 40, kind: 'poison', pct: 3, rounds: 3 }] },
    m_shanlang:  { name: '山狼',         power: 2,  hp: 1.0,  atk: 1.05, species: 'beast', skills: [{ name: '撕咬', w: 30, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_zeiren:    { name: '采药贼人',     power: 3,  hp: 1.0,  atk: 1.1, def: 1.1, stoneMul: 1.4, species: 'human', skills: [{ name: '撒石灰', w: 25, kind: 'slow', pct: 20, rounds: 2 }] },
    m_toumu:     { name: '山贼头目',     power: 4,  hp: 1.15, atk: 1.1, elite: true, rareDrop: 'w_qinggang', species: 'human', skills: [{ name: '开山刀势', w: 30, kind: 'weaken', pct: 15, rounds: 2 }] },
    m_qingbei:   { name: '青背狼',       power: 3,  hp: 1.0,  atk: 1.05, species: 'beast', skills: [{ name: '狼爪连环', w: 30, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_linghou:   { name: '灵猴',         power: 4,  hp: 0.9,  spd: 1.35, dodge: 8, stoneMul: 1.2, species: 'beast', skills: [{ name: '挠心爪', w: 25, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_tiexia:    { name: '铁甲犀',       power: 5,  hp: 1.35, def: 1.45, spd: 0.7, species: 'beast', skills: [{ name: '铁甲铿锵', w: 35, kind: 'guard', def: 35, rounds: 2 }] },
    m_luopo:     { name: '落魄散修',     power: 6,  hp: 1.0,  atk: 1.1, stoneMul: 1.5, species: 'human', skills: [{ name: '破绽指', w: 25, kind: 'defdown', pct: 20, rounds: 2 }] },
    m_qingluan:  { name: '青鸾',         power: 8,  hp: 1.1,  atk: 1.2, elite: true, rareDrop: 'gf_jifeng', species: 'beast', skills: [{ name: '清唳慑魂', w: 30, kind: 'weaken', pct: 20, rounds: 2 }] },
    m_loulou:    { name: '黑风喽啰',     power: 6,  hp: 1.0,  atk: 1.0, stoneMul: 1.1, species: 'human', skills: [{ name: '泼风刀', w: 25, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_erdangjia: { name: '黑风寨二当家', power: 8,  hp: 1.1,  atk: 1.15, stoneMul: 1.5, species: 'human', skills: [{ name: '浑铁枪势', w: 30, kind: 'defdown', pct: 20, rounds: 2 }] },
    m_guimian:   { name: '鬼面修士',     power: 9,  hp: 1.0,  atk: 1.2, stoneMul: 1.4, species: 'human', skills: [{ name: '鬼面摄心', w: 30, kind: 'slow', pct: 25, rounds: 2 }] },
    m_dadangjia: { name: '黑风大当家',   power: 11, hp: 1.15, atk: 1.2, elite: true, rareDrop: 'a_xuangui', species: 'human', skills: [{ name: '山寨王气', w: 30, kind: 'roar', atk: 25, rounds: 2 }] },
    m_chilin:    { name: '赤鳞蟒',       power: 10, hp: 1.1,  atk: 1.05, species: 'snake', skills: [{ name: '蟒尾扫击', w: 25, kind: 'stun', rounds: 1 }] },
    m_fuqun:     { name: '嗜血蝠群',     power: 11, hp: 0.85, atk: 1.2, spd: 1.2, species: 'swarm', skills: [{ name: '嗜血狂叮', w: 40, kind: 'drain', mult: 1.15, leech: 0.5 }] },
    m_liedi:     { name: '裂地虎',       power: 13, hp: 1.2,  atk: 1.1, species: 'beast', skills: [{ name: '裂地一击', w: 30, kind: 'bleed', pct: 3, rounds: 2 }] },
    m_shuyao:    { name: '千年树妖',     power: 15, hp: 1.3,  atk: 1.1, elite: true, rareDrop: 'z_qiankun', species: 'plant', skills: [{ name: '根须缠绕', w: 35, kind: 'stun', rounds: 1 }, { name: '汲取地气', w: 25, kind: 'heal', pct: 15 }] },
    m_shikui:    { name: '遗迹石傀',     power: 14, hp: 1.3,  def: 1.4, spd: 0.7, species: 'construct', skills: [{ name: '石肤凝聚', w: 35, kind: 'guard', def: 40, rounds: 2 }] },
    m_yinling:   { name: '噬魂阴灵',     power: 16, hp: 0.95, spd: 1.3, species: 'ghost', skills: [{ name: '摄魂夺魄', w: 35, kind: 'mpburn', pct: 30 }] },
    m_jianling:  { name: '上古剑灵',     power: 18, hp: 1.0,  atk: 1.15, species: 'ghost', skills: [{ name: '剑意余锋', w: 30, kind: 'bleed', pct: 3, rounds: 2 }] },
    m_moxiu:     { name: '魔修残魂',     power: 21, hp: 1.15, atk: 1.2, elite: true, rareDrop: 'w_zhuxian', species: 'ghost', skills: [{ name: '血魔噬心', w: 30, kind: 'drain', mult: 1.2, leech: 0.5 }, { name: '魔气蚀体', w: 25, kind: 'weaken', pct: 25, rounds: 2 }] },
    /* ---- v13 新增：毒蛛 / 岩蝎 / 火狼等（补齐金丹前空档） ---- */
    m_duzhu:     { name: '花斑毒蛛',     power: 12, hp: 0.9,  atk: 1.1, species: 'swarm', skills: [{ name: '毒牙穿刺', w: 45, kind: 'poison', pct: 3, rounds: 3 }] },
    m_xiezi:     { name: '铁背岩蝎',     power: 13, hp: 1.15, def: 1.3, species: 'beast', skills: [{ name: '蝎尾钩毒', w: 40, kind: 'poison', pct: 2.5, rounds: 3 }] },
    m_chiyan:    { name: '赤炎狼',       power: 15, hp: 1.0,  atk: 1.2, species: 'beast', skills: [{ name: '炎牙撕咬', w: 40, kind: 'burn', pct: 3.5, rounds: 2 }] },
    m_hanshi:    { name: '寒潭冰蟾',     power: 16, hp: 1.2,  def: 1.2, species: 'element', skills: [{ name: '寒气吐息', w: 40, kind: 'slow', pct: 30, rounds: 2 }] },
    /* ---- v13 新增：万妖山脉（金丹后期~元婴） ---- */
    m_fengbao:   { name: '风影豹',       power: 17, hp: 0.95, atk: 1.1, spd: 1.4, species: 'beast', skills: [{ name: '影爪掠影', w: 35, kind: 'bleed', pct: 3, rounds: 2 }] },
    m_xiongyuan: { name: '赤目凶猿',     power: 17, hp: 1.25, atk: 1.15, species: 'beast', skills: [{ name: '擂胸咆哮', w: 30, kind: 'roar', atk: 30, rounds: 2 }, { name: '巨掌拍击', w: 30, kind: 'stun', rounds: 1 }] },
    m_tengyao:   { name: '千年藤妖',     power: 18, hp: 1.3,  def: 1.15, species: 'plant', skills: [{ name: '藤蔓绞缚', w: 35, kind: 'stun', rounds: 1 }, { name: '光合自愈', w: 25, kind: 'heal', pct: 12 }] },
    m_yaohu:     { name: '九尾妖狐',     power: 18, hp: 1.0,  atk: 1.15, spd: 1.2, stoneMul: 1.4, species: 'beast', skills: [{ name: '魅惑之瞳', w: 35, kind: 'weaken', pct: 30, rounds: 2 }, { name: '狐火燎原', w: 30, kind: 'burn', pct: 4, rounds: 2 }] },
    m_heijiao:   { name: '黑蛟',         power: 19, hp: 1.2,  atk: 1.25, elite: true, rareDrop: 'gf_hansha', species: 'snake', skills: [{ name: '蛟尾横扫', w: 30, kind: 'stun', rounds: 1 }, { name: '黑水侵蚀', w: 30, kind: 'defdown', pct: 30, rounds: 2 }] },
    m_shiren:    { name: '石人武士',     power: 20, hp: 1.35, def: 1.35, spd: 0.7, species: 'construct', skills: [{ name: '磐石壁', w: 35, kind: 'guard', def: 45, rounds: 2 }, { name: '巨岩锤', w: 25, kind: 'stun', rounds: 1 }] },
    /* ---- v13 新增：幽冥鬼泽（元婴~化神） ---- */
    m_guizu:     { name: '黄泉鬼卒',     power: 20, hp: 1.05, atk: 1.15, species: 'ghost', skills: [{ name: '幽冥爪', w: 30, kind: 'bleed', pct: 3, rounds: 2 }, { name: '阴风蚀骨', w: 25, kind: 'mpburn', pct: 25 }] },
    m_yuangu:    { name: '千年怨鬼',     power: 21, hp: 1.0,  atk: 1.2, spd: 1.2, species: 'ghost', skills: [{ name: '怨念侵神', w: 35, kind: 'weaken', pct: 25, rounds: 2 }, { name: '摄魂低语', w: 30, kind: 'mpburn', pct: 30 }] },
    m_shigui:    { name: '白骨尸鬼',     power: 22, hp: 1.3,  def: 1.2, species: 'ghost', skills: [{ name: '尸毒抓挠', w: 40, kind: 'poison', pct: 4, rounds: 3 }] },
    m_yinjiao:   { name: '阴煞蛟',       power: 23, hp: 1.15, atk: 1.2, species: 'snake', skills: [{ name: '阴煞缠身', w: 30, kind: 'slow', pct: 35, rounds: 2 }, { name: '噬阴一击', w: 30, kind: 'drain', mult: 1.2, leech: 0.4 }] },
    m_xueshe:    { name: '雪域冰蟒',     power: 23, hp: 1.2,  atk: 1.15, species: 'snake', skills: [{ name: '冰蟒吐信', w: 35, kind: 'slow', pct: 30, rounds: 2 }, { name: '绞缠', w: 25, kind: 'stun', rounds: 1 }] },
    m_yinshou:   { name: '泽底阴兽',     power: 24, hp: 1.3,  atk: 1.25, elite: true, rareDrop: 'z_xingpan', species: 'beast', skills: [{ name: '幽泽咆哮', w: 30, kind: 'roar', atk: 30, rounds: 2 }, { name: '裂魂爪', w: 30, kind: 'bleed', pct: 4, rounds: 2 }] },
    /* ---- v13 新增：天外飞舟残骸（化神~炼虚） ---- */
    m_xinggui:   { name: '星陨石傀',     power: 25, hp: 1.4,  def: 1.4, spd: 0.7, species: 'construct', skills: [{ name: '星辉装甲', w: 35, kind: 'guard', def: 50, rounds: 2 }, { name: '陨星重锤', w: 25, kind: 'stun', rounds: 1 }] },
    m_tianchong: { name: '天外异虫',     power: 26, hp: 0.95, atk: 1.25, spd: 1.25, species: 'swarm', skills: [{ name: '蚀髓吸髓', w: 40, kind: 'drain', mult: 1.2, leech: 0.5 }] },
    m_xuling:    { name: '虚空幻灵',     power: 27, hp: 1.0,  atk: 1.25, spd: 1.3, species: 'ghost', skills: [{ name: '虚空禁锢', w: 30, kind: 'stun', rounds: 1 }, { name: '虚实幻刃', w: 30, kind: 'defdown', pct: 35, rounds: 2 }] },
    m_zhouling:  { name: '飞舟器灵',     power: 29, hp: 1.25, atk: 1.3, elite: true, rareDrop: 'gf_feixian', species: 'construct', skills: [{ name: '舟炮齐鸣', w: 35, kind: 'burn', pct: 4, rounds: 2 }, { name: '灵能护盾', w: 25, kind: 'guard', def: 50, rounds: 2 }] },
    /* ---- v13 新增：龙渊海眼（炼虚及以上） ---- */
    m_shuiling:  { name: '沧海水灵',     power: 27, hp: 1.15, atk: 1.1, species: 'element', skills: [{ name: '潮汐自愈', w: 35, kind: 'heal', pct: 18 }, { name: '深渊之压', w: 30, kind: 'weaken', pct: 30, rounds: 2 }] },
    m_haiyi:     { name: '深渊海兽',     power: 29, hp: 1.3,  atk: 1.25, species: 'beast', skills: [{ name: '撕裂巨口', w: 40, kind: 'bleed', pct: 4.5, rounds: 3 }] },
    m_jiaojiao:  { name: '怒海蛟龙',     power: 31, hp: 1.25, atk: 1.3, species: 'snake', skills: [{ name: '龙尾断浪', w: 30, kind: 'stun', rounds: 1 }, { name: '怒涛覆压', w: 30, kind: 'defdown', pct: 35, rounds: 2 }] },
    m_longgui:   { name: '玄武龙龟',     power: 32, hp: 1.45, def: 1.5, spd: 0.6, species: 'beast', skills: [{ name: '龟甲震波', w: 35, kind: 'guard', def: 55, rounds: 2 }, { name: '吞吐灵潮', w: 25, kind: 'heal', pct: 15 }] },
    m_yuanmo:    { name: '渊底魔影',     power: 34, hp: 1.25, atk: 1.35, elite: true, rareDrop: 'gf_taiyin', species: 'ghost', skills: [{ name: '万渊噬心', w: 30, kind: 'drain', mult: 1.3, leech: 0.5 }, { name: '魔渊低语', w: 30, kind: 'weaken', pct: 30, rounds: 2 }] },
  },

  /* ---------- 地图区域 ---------- */
  MAPS: [
    { id: 'village',  name: '新手村 · 后山', recRealm: 0, recText: '练气期', desc: '青山脚下的小村落，村后山林间偶有野兽出没，是初入道途者磨砺身心之处。',
      pool: [{ id: 'm_yezhu', weight: 40 }, { id: 'm_dushe', weight: 25 }, { id: 'm_shanlang', weight: 20 }, { id: 'm_zeiren', weight: 15 }],
      elite: 'm_toumu', weights: { battle: 46, treasure: 14, fortune: 12, npc: 12, trap: 6, nothing: 10 } },
    { id: 'qingfeng', name: '青峰山', recRealm: 1, recText: '练气后期 ~ 筑基期', desc: '青峰山势连绵百里，山间灵气氤氲，多有灵兽与采药修士出没。',
      pool: [{ id: 'm_qingbei', weight: 30 }, { id: 'm_linghou', weight: 25 }, { id: 'm_tiexia', weight: 25 }, { id: 'm_luopo', weight: 20 }],
      elite: 'm_qingluan', weights: { battle: 50, treasure: 12, fortune: 10, npc: 10, trap: 8, nothing: 10 } },
    { id: 'heifeng',  name: '黑风寨', recRealm: 1, recText: '筑基期', desc: '盘踞着凶悍修士的山寨，行事狠辣，寨中却颇有积蓄。',
      pool: [{ id: 'm_loulou', weight: 40 }, { id: 'm_erdangjia', weight: 30 }, { id: 'm_guimian', weight: 30 }],
      elite: 'm_dadangjia', weights: { battle: 54, treasure: 12, fortune: 8, npc: 8, trap: 10, nothing: 8 } },
    { id: 'forest',   name: '妖兽森林', recRealm: 2, recText: '金丹期', desc: '古木参天的无垠林海，深处妖兽横行，亦藏无数天材地宝。',
      pool: [{ id: 'm_chilin', weight: 35 }, { id: 'm_fuqun', weight: 30 }, { id: 'm_liedi', weight: 35 }],
      elite: 'm_shuyao', weights: { battle: 54, treasure: 13, fortune: 9, npc: 8, trap: 9, nothing: 7 } },
    { id: 'ruins',    name: '秘境遗迹', recRealm: 3, recText: '元婴期及以上', desc: '上古修士洞府崩塌所化的秘境，机缘遍地，凶险亦遍地。',
      pool: [{ id: 'm_shikui', weight: 35 }, { id: 'm_yinling', weight: 30 }, { id: 'm_jianling', weight: 35 }],
      elite: 'm_moxiu', weights: { battle: 52, treasure: 15, fortune: 11, npc: 8, trap: 9, nothing: 5 } },
    /* ---- v13 新增四张高阶地图 ---- */
    { id: 'wanyao',   name: '万妖山脉', recRealm: 3, recText: '金丹后期 ~ 元婴期', desc: '千里妖山连绵不绝，山中大妖自成疆域，山巅终年妖云翻卷。传闻山脉深处藏有上古妖庭遗迹。',
      pool: [{ id: 'm_fengbao', weight: 25 }, { id: 'm_xiongyuan', weight: 25 }, { id: 'm_tengyao', weight: 25 }, { id: 'm_yaohu', weight: 25 }],
      elite: 'm_heijiao', weights: { battle: 54, treasure: 13, fortune: 10, npc: 8, trap: 8, nothing: 7 } },
    { id: 'youming',  name: '幽冥鬼泽', recRealm: 4, recText: '元婴后期 ~ 化神期', desc: '水黑如墨的千里泽国，终年阴雾不散，怨气凝而不化。鬼火点点处，白骨为路，阴煞蚀骨。',
      pool: [{ id: 'm_guizu', weight: 30 }, { id: 'm_yuangu', weight: 25 }, { id: 'm_shigui', weight: 25 }, { id: 'm_yinjiao', weight: 20 }],
      elite: 'm_yinshou', weights: { battle: 54, treasure: 13, fortune: 10, npc: 7, trap: 10, nothing: 6 } },
    { id: 'feizhou',  name: '天外飞舟残骸', recRealm: 5, recText: '化神后期 ~ 炼虚期', desc: '半截天外飞舟坠于荒漠，舟身流转着尚未熄灭的星辉禁制。残骸之中，星傀游弋，异虫滋生于灵脉之间。',
      pool: [{ id: 'm_xinggui', weight: 30 }, { id: 'm_tianchong', weight: 30 }, { id: 'm_xuling', weight: 25 }, { id: 'm_shuiling', weight: 15 }],
      elite: 'm_zhouling', weights: { battle: 52, treasure: 16, fortune: 12, npc: 7, trap: 9, nothing: 4 } },
    { id: 'longyuan', name: '龙渊海眼', recRealm: 6, recText: '炼虚期及以上', desc: '大海中央的万丈漩涡，渊底隐约可见沉睡的巨大轮廓。龙裔盘踞、海兽横行，渊底魔影幢幢——此为化外绝地。',
      pool: [{ id: 'm_haiyi', weight: 30 }, { id: 'm_jiaojiao', weight: 25 }, { id: 'm_longgui', weight: 25 }, { id: 'm_shuiling', weight: 20 }],
      elite: 'm_yuanmo', weights: { battle: 55, treasure: 14, fortune: 11, npc: 6, trap: 9, nothing: 5 } },
  ],

  /* ---------- 宗门 ---------- */
  SECTS: [
    { id: 'qingyun', name: '青云剑宗', desc: '以剑入道，门下弟子杀伐凌厉，剑气冲霄。',
      bonusText: '宗门加成：攻击 +8%', bonus: { atkPct: 8 } },
    { id: 'danxia',  name: '丹霞谷',   desc: '丹道圣地，谷中丹香百年不散，妙手回春。',
      bonusText: '宗门加成：丹药效果 +30%，丹毒 -30%', bonus: { pillPct: 30, poisonReduce: 30 } },
    { id: 'wanbao',  name: '万宝商会', desc: '富可敌国的修士商会，消息灵通，财源滚滚。',
      bonusText: '宗门加成：灵石获取 +20%，坊市九二折', bonus: { stonePct: 20, shopDiscount: 8 } },
    /* ---- v13 新增宗门 ---- */
    { id: 'panyan',  name: '磐岩谷',   desc: '体修圣地，谷中弟子以山为炉、炼体如岩，一拳可碎巨石。',
      bonusText: '宗门加成：防御 +8%，气血 +8%', bonus: { defPct: 8, hpPct: 8 } },
    { id: 'zhoutian',name: '周天阁',   desc: '阵道魁首，阁中周天大阵终年运转，星辰为子、天地为盘。',
      bonusText: '宗门加成：修炼效率 +8%，闪避 +3%', bonus: { cult: 8, dodge: 3 } },
  ],

  /** 宗门贡献兑换列表 */
  SECT_EXCHANGE: [
    { item: 'gf_wanjian',     cost: 600 },
    { item: 'gf_jianqich',    cost: 600 },
    { item: 'pill_xisui',     cost: 200 },
    { item: 'm_lingzhi',      cost: 150, qty: 2 },
    { item: 'gf_tumo',        cost: 2500 },
    { item: 'gf_dayan',       cost: 2500 },
    { item: 'gf_bumie',       cost: 2500 },
    { item: 'pill_jiuzhuan',  cost: 1200 },
    { item: 'gf_zixiao',      cost: 9000 },
    { item: 'pill_taichu',    cost: 5000 },
    { item: 'm_xianjing',     cost: 800,  qty: 2 },
    { item: 'gf_jianxin',     cost: 30000 },
    { item: 'gf_hongmeng',    cost: 30000 },
    { item: 'pill_zaohua',    cost: 20000 },
    /* ---- v13 新增兑换 ---- */
    { item: 'gf_hansha',      cost: 900 },
    { item: 'gf_yulin',       cost: 900 },
    { item: 'gf_feixian',     cost: 2800 },
    { item: 'gf_lidu',        cost: 9500 },
    { item: 'gf_zhuixian',    cost: 3200 },
    { item: 'gf_danjing',     cost: 3200 },
    { item: 'gf_tianfu',      cost: 3200 },
    { item: 'gf_banti',       cost: 500 },
    { item: 'gf_zhoutian',    cost: 3200 },
    { item: 'gf_xuesha',      cost: 3200 },
    { item: 'pill_dahuan',    cost: 900 },
    { item: 'pill_yuanshen',  cost: 6000 },
    { item: 's_xt_jian',      cost: 20000 },
    { item: 's_xt_jia',       cost: 20000 },
    { item: 's_xt_pei',       cost: 20000 },
    { item: 's_cx_jian',      cost: 22000 },
    { item: 's_cx_pao',       cost: 22000 },
    { item: 's_cx_gou',       cost: 22000 },
    { item: 'z_hunpo',        cost: 15000 },
  ],

  /* ---------- 坊市货架（minRealm：达到该境界才会上架） ---------- */
  SHOP: [
    { item: 'pill_juqi', minRealm: 0 }, { item: 'pill_liaoshang', minRealm: 0 }, { item: 'pill_huiling', minRealm: 0 },
    { item: 'pill_jiedu', minRealm: 0 }, { item: 'pill_ningqi', minRealm: 1 }, { item: 'pill_peiyuan', minRealm: 1 },
    { item: 'pill_zhuji', minRealm: 0 }, { item: 'pill_pojing', minRealm: 2 }, { item: 'pill_jiuzhuan', minRealm: 3 },
    { item: 'pill_taichu', minRealm: 4 }, { item: 'pill_zaohua', minRealm: 6 },
    { item: 'pill_qingxin', minRealm: 1 }, { item: 'pill_mingmu', minRealm: 1 }, { item: 'pill_qingshen', minRealm: 1 },
    { item: 'pill_tiegu', minRealm: 2 }, { item: 'pill_kuangbao', minRealm: 2 }, { item: 'pill_guben', minRealm: 2 },
    { item: 'pill_dahuan', minRealm: 3 }, { item: 'pill_posha', minRealm: 2 }, { item: 'pill_xuanling', minRealm: 3 },
    { item: 'pill_yuanshen', minRealm: 5 }, { item: 'pill_tianyuan', minRealm: 7 },
    { item: 'tal_huoshe', minRealm: 0 }, { item: 'tal_zilei', minRealm: 2 },
    { item: 'tal_jinguang', minRealm: 1 }, { item: 'tal_jifengfu', minRealm: 1 },
    { item: 'tal_fuling', minRealm: 2 }, { item: 'tal_shigu', minRealm: 2 }, { item: 'tal_bingpo', minRealm: 3 }, { item: 'tal_posha', minRealm: 4 },
    { item: 'w_tiejian', minRealm: 0 }, { item: 'w_qinggang', minRealm: 1 }, { item: 'w_sanqing', minRealm: 2 }, { item: 'w_zhuxian', minRealm: 3 },
    { item: 'w_tulong', minRealm: 1 }, { item: 'w_hanshuang', minRealm: 2 },
    { item: 'a_buyi', minRealm: 0 }, { item: 'a_huxin', minRealm: 1 }, { item: 'a_xuangui', minRealm: 2 }, { item: 'a_longlin', minRealm: 3 },
    { item: 'a_xingyi', minRealm: 2 },
    { item: 'z_juling', minRealm: 0 }, { item: 'z_pingan', minRealm: 0 }, { item: 'z_jifengxue', minRealm: 1 }, { item: 'z_qiankun', minRealm: 2 }, { item: 'z_taiji', minRealm: 3 },
    { item: 'z_xingpan', minRealm: 2 },
    { item: 'gf_tuna', minRealm: 0 }, { item: 'gf_canghai', minRealm: 0 }, { item: 'gf_tiebu', minRealm: 0 },
    { item: 'gf_lieyang', minRealm: 1 }, { item: 'gf_xuantian', minRealm: 1 }, { item: 'gf_jifeng', minRealm: 1 }, { item: 'gf_tiangang', minRealm: 2 },
    { item: 'm_lingcao', minRealm: 0 }, { item: 'm_xuantie', minRealm: 0 },
    { item: 'seed_lingcao', minRealm: 1 }, { item: 'seed_lingzhi', minRealm: 1 }, { item: 'seed_bingpo', minRealm: 2 },
    { item: 'seed_xuelian', minRealm: 3 }, { item: 'seed_lianhun', minRealm: 3 },
  ],

  /* ---------- v13 套装（集齐 pieces 中全部装备于身时触发 bonus） ---------- */
  SETS: {
    xuantian: { name: '玄天套装', pieces: ['s_xt_jian', 's_xt_jia', 's_xt_pei'], bonus: { defPct: 15, hpPct: 10 }, text: '守御之道：防御 +15%，气血 +10%' },
    chixiao:  { name: '赤霄套装', pieces: ['s_cx_jian', 's_cx_pao', 's_cx_gou'], bonus: { atkPct: 15, crit: 5 }, text: '杀伐之道：攻击 +15%，暴击 +5%' },
  },

  /* ---------- 文案池 ---------- */
  NAMES: ['沈青山', '顾长风', '苏云澈', '叶凌天', '陆沉舟', '柳如烟', '洛清寒', '秦无衣', '姜怀远', '白亦尘', '林疏影', '谢惊鸿'],
  FLAVOR: {
    cultivate: [
      '你盘膝而坐，吐纳天地灵气，丹田处渐生暖意。',
      '夜深人静，你依功法行功一个周天，只觉神识清明了几分。',
      '晨曦初露，你迎着朝霞采气入体，浑身舒泰。',
      '你凝神静气，灵气如百川归海般汇入丹田。',
      '山风过隙，你在风中参悟功法，若有所得。',
      '你闭目内视，引导灵气冲刷经脉，隐有脆响。',
    ],
    seclude: [
      '石室之中，你屏绝外缘，物我两忘。',
      '洞府之内灵氤氤氲，你沉入定境，不知岁月。',
      '你于静室枯坐，心湖澄澈，道心愈坚。',
    ],
    nothing: [
      '你四处游历，除却山风拂面，一无所获。',
      '你搜寻良久，只捡到几块顽石，怅然而返。',
      '林间寂静，唯有鸟鸣，你漫步半日，空手而归。',
      '你追寻一丝异动而来，却发现只是风吹草动。',
    ],
    breakSuccess: [
      '轰——丹田深处一声轻鸣，桎梏应声而碎！',
      '天地灵气疯狂涌来，你的气息节节攀升！',
      '如拨云见日，你只觉浑身上下焕然一新！',
    ],
    breakFail: [
      '你奋力冲击瓶颈，却如以卵击石，气血翻涌。',
      '关隘岿然不动，你只觉经脉刺痛，只得暂时收功。',
      '差之毫厘！灵气在关隘前溃散，你闷哼一声。',
    ],
  },

  /* ---------- §19 大道职业（六选一，筑基解锁）----------
   * 属性加成在 Stat.compute / DaoSys.bonus 中折算；
   * 战斗与玩法特效散接于 Battle / CraftSys / Tribulation 各处。
   */
  DAO_CLASSES: [
    { id: 'sword',    name: '剑修', motto: '以剑证道，一往无前',
      desc: '剑锋所指，万法皆断。攻击 +50%，防御 -20%；剑心桀骜难驯，大境界渡劫难度 +30%；普攻有两成几率触发【剑心通明】伤害翻倍（剑心通明境后提至三成）。' },
    { id: 'pill',     name: '丹道', motto: '丹炉一转，造化乾坤',
      desc: '炼丹成功率 +60%，丹药效果 +30%；常年守着丹炉，疏于斗法——攻击 -15%；坊市出售丹药价格提升五成。' },
    { id: 'talisman', name: '符修', motto: '一符在手，天地借法',
      desc: '战斗中可祭出符箓，轰出高额爆发；可在坊市挥毫画符售卖营生；法诀灵力消耗 +20%。' },
    { id: 'body',     name: '体修', motto: '肉身成圣，金刚不坏',
      desc: '气血上限 +100%，防御 +50%；肉身蔽塞灵窍，难悟玄级及以上法诀；金刚之躯，渡劫成算 +40%。' },
    { id: 'array',    name: '阵道', motto: '一念成阵，困杀万物',
      desc: '历练遇敌有五成几率抢先布阵，压制敌方攻防（困阵境四成、杀阵境开场两成直接困杀）；于秘境遗迹探索时收益 +20%。' },
    { id: 'demonic',  name: '邪修', motto: '逆天而行，唯我独邪',
      desc: '修炼速度 +80%，杀敌可吞噬精元（额外两成修为）；每场战斗孽障 +1；一身邪气，为正道修士所不容。' },
  ],

  /* ---------- §20 炼丹配方（坊市炼丹炉，人人可用，丹道大成率大涨）---------- */
  ALCHEMY_RECIPES: [
    { id: 'r1', out: 'pill_juqi',     need: { m_lingcao: 2 },                  rate: 65 },
    { id: 'r2', out: 'pill_liaoshang', need: { m_yaopi: 1, m_lingcao: 1 },     rate: 65 },
    { id: 'r3', out: 'pill_peiyuan',  need: { m_lingzhi: 2 },                  rate: 55 },
    { id: 'r4', out: 'pill_pojing',   need: { m_neidan: 2 },                   rate: 50 },
    { id: 'r5', out: 'pill_jiuzhuan', need: { m_xuelian: 1, m_longxue: 1 },    rate: 45 },
    { id: 'r6', out: 'pill_taichu',   need: { m_xianjing: 1, m_shentie: 1 },   rate: 40 },
    /* ---- v13 新增配方 ---- */
    { id: 'r7', out: 'pill_kuangbao', need: { m_yaopi: 2 },                    rate: 60 },
    { id: 'r8', out: 'pill_tiegu',    need: { m_xuantie: 2 },                  rate: 60 },
    { id: 'r9', out: 'pill_guben',    need: { m_lingzhi: 1, m_neidan: 1 },     rate: 55 },
    { id: 'r10', out: 'pill_dahuan',  need: { m_xuelian: 2 },                  rate: 45 },
    { id: 'r11', out: 'pill_posha',   need: { m_neidan: 2, m_xuantie: 1 },     rate: 50 },
    { id: 'r12', out: 'pill_xuanling', need: { m_lianhun: 2 },                 rate: 45 },
    { id: 'r13', out: 'pill_yuanshen', need: { m_xianjing: 2 },                rate: 40 },
    { id: 'r14', out: 'pill_tianyuan', need: { m_shentie: 1, m_haixin: 1 },    rate: 35 },
  ],

  /* ---------- v13 炼器配方（坊市炼器坊，消耗材料锻造装备；产出天级神兵的唯一途径） ---------- */
  FORGE_RECIPES: [
    { id: 'f1', out: 'w_tulong',    need: { m_xuantie: 3 },                          rate: 75 },
    { id: 'f2', out: 'w_hanshuang', need: { m_xuantie: 2, m_bingpo: 1 },             rate: 65 },
    { id: 'f3', out: 'a_xingyi',    need: { m_yaopi: 2, m_xuecan: 1 },               rate: 65 },
    { id: 'f4', out: 'z_xingpan',   need: { m_xuantie: 1, m_lingzhi: 1 },            rate: 60 },
    { id: 'f5', out: 'z_hunpo',     need: { m_lianhun: 2, m_bingpo: 1 },             rate: 55 },
    { id: 'f6', out: 'w_tianwen',   need: { m_shentie: 1, m_xingchen: 2, m_jiaojin: 1 }, rate: 50 },
    { id: 'f7', out: 'a_taiyi',     need: { m_xuecan: 2, m_shenmu: 1, m_xianjing: 1 },   rate: 45 },
    { id: 'f8', out: 'z_longyu',    need: { m_longxue: 1, m_jiaojin: 1, m_haixin: 1 },   rate: 45 },
    { id: 'f9', out: 's_xt_jian',   need: { m_xuantie: 4, m_bingpo: 2 },             rate: 55 },
    { id: 'f10', out: 's_xt_jia',   need: { m_xuantie: 4, m_xuecan: 2 },             rate: 55 },
    { id: 'f11', out: 's_xt_pei',   need: { m_lianhun: 1, m_bingpo: 2 },             rate: 55 },
    { id: 'f12', out: 's_cx_jian',  need: { m_huolin: 2, m_jiaojin: 1 },             rate: 50 },
    { id: 'f13', out: 's_cx_pao',   need: { m_huolin: 2, m_yaopi: 3 },               rate: 50 },
    { id: 'f14', out: 's_cx_gou',   need: { m_huolin: 1, m_neidan: 2 },              rate: 50 },
  ],

  /* ---------- §20 红尘劫剧本（历练道德三选一）---------- */
  DILEMMAS: [
    { id: 'traveler', title: '重伤旅人', text: '一名旅人倒在道旁，气息奄奄，储物袋就悬在腰间——袋中之物，够寻常人家嚼用十年。' },
    { id: 'caravan',  title: '遭劫商队', text: '前方商队正被散修围攻，货物散落一地，妇孺哭喊之声顺风传来。' },
    { id: 'beast',    title: '落难幼妖', text: '一只幼妖被猎户的铁夹困住，眼中噙泪。妖丹虽小，亦是炼丹的好材料。' },
    { id: 'temple',   title: '破观道人', text: '山间破观的道人拦路化缘：「观中收留的孤儿，已三日未见米粮了。」' },
    { id: 'rival',    title: '灵药之争', text: '一株灵药现世，一名散修也看见了它。他修为不弱于你，正朝你冷笑。' },
    { id: 'oldwoman', title: '风雪老妪', text: '风雪中一名老妪蜷缩乞食，你若施舍盘缠，只怕自己下一程要徒步挨饿。' },
  ],

  /* ---------- §24 十五位常驻修士（随游戏时间自行修炼游历）----------
   * realm: 初始大境界；talent: 资质（成长速度）；kin: 血亲（恩怨连坐）；
   * sect: 所属宗门（影响称呼与派系）；temper: 性情。
   */
  NPCS: [
    { id: 'n1',  name: '沈青崖', title: '青锋剑痴',   sect: 'qingyun', talent: 5, realm: 2, kin: ['n14'], temper: '孤傲', desc: '青云剑宗首席，剑不离身，终身不履红尘。' },
    { id: 'n2',  name: '顾轻语', title: '丹谷仙子',   sect: 'danxia',  talent: 4, realm: 2, kin: [],      temper: '温婉', desc: '丹霞谷少谷主，一手回春丹术名动一方。' },
    { id: 'n3',  name: '苏白',   title: '落魄书生',   sect: null,      talent: 3, realm: 0, kin: [],      temper: '温润', desc: '屡试不第的书生，转而问道，家贫志不短。' },
    { id: 'n4',  name: '叶孤鸿', title: '孤刀客',     sect: null,      talent: 4, realm: 1, kin: [],      temper: '冷厉', desc: '独来独往的刀客，刀下不留活口，仇家遍地。' },
    { id: 'n5',  name: '柳含烟', title: '烟雨楼主',   sect: 'wanbao',  talent: 3, realm: 2, kin: [],      temper: '玲珑', desc: '烟雨楼楼主，消息灵通，手眼通天。' },
    { id: 'n6',  name: '陆吾',   title: '铁塔汉子',   sect: null,      talent: 2, realm: 1, kin: [],      temper: '豪爽', desc: '行脚体修，一身横练功夫，最重义气。' },
    { id: 'n7',  name: '洛雪衣', title: '琴心剑影',   sect: 'qingyun', talent: 4, realm: 3, kin: [],      temper: '清冷', desc: '以琴入道的剑修，一曲《雪衣》可退千军。' },
    { id: 'n8',  name: '秦重楼', title: '重楼商君',   sect: 'wanbao',  talent: 3, realm: 3, kin: [],      temper: '精明', desc: '万宝商会大掌柜，灵石堆里修出来的金丹。' },
    { id: 'n9',  name: '姜暮寒', title: '符门老叟',   sect: null,      talent: 3, realm: 2, kin: [],      temper: '古怪', desc: '隐市符师，笔下符箓千金难求。' },
    { id: 'n10', name: '白玉京', title: '阵道大家',   sect: 'danxia',  talent: 4, realm: 4, kin: [],      temper: '淡泊', desc: '闭门百年摆一座阵，出山一日惊天下。' },
    { id: 'n11', name: '林晚照', title: '圣手医仙',   sect: 'danxia',  talent: 3, realm: 2, kin: [],      temper: '慈悲', desc: '救人无数的游方医修，人脉遍布修行界。' },
    { id: 'n12', name: '谢惊鸿', title: '妙手空空',   sect: null,      talent: 4, realm: 1, kin: [],      temper: '狡黠', desc: '盗修出身的散人，来无影去无踪。' },
    { id: 'n13', name: '云无月', title: '月下魔姝',   sect: null,      talent: 5, realm: 3, kin: [],      temper: '危险', desc: '行事莫测的魔道修士，亦正亦邪。' },
    { id: 'n14', name: '沈疏影', title: '剑宗小师妹', sect: 'qingyun', talent: 4, realm: 1, kin: ['n1'],  temper: '娇憨', desc: '沈青崖幼妹，天资出众，最受门中宠爱。' },
    { id: 'n15', name: '唐三思', title: '万事通',     sect: 'wanbao',  talent: 2, realm: 0, kin: [],      temper: '市侩', desc: '坊市包打听，三枚灵石能买你一条消息。' },
    /* ---- v13 新增九位常驻修士 ---- */
    { id: 'n16', name: '楚天阔', title: '裂山力士',   sect: 'panyan',  talent: 4, realm: 2, kin: ['n20'], temper: '豪迈', desc: '磐岩谷大弟子，双臂之力可裂山岩，最恨阴诡之徒。' },
    { id: 'n17', name: '姬冰颜', title: '星阵仙子',   sect: 'zhoutian', talent: 5, realm: 3, kin: [],      temper: '清冷', desc: '周天阁首席，布阵时漫天星辰皆为其子，性情清冷不假辞色。' },
    { id: 'n18', name: '顾青书', title: '青衿剑生',   sect: 'qingyun', talent: 3, realm: 1, kin: [],      temper: '儒雅', desc: '剑宗里的读书人，一手青萍剑法如行云流水。' },
    { id: 'n19', name: '花千树', title: '金算盘',     sect: 'wanbao',  talent: 3, realm: 2, kin: [],      temper: '圆滑', desc: '商会里最会做买卖的管事，一双眼睛能看穿货物十成成色。' },
    { id: 'n20', name: '石破天', title: '顽石真人',   sect: 'panyan',  talent: 3, realm: 3, kin: ['n16'], temper: '憨直', desc: '磐岩谷长老，天生神力，认死理，认准的道九头牛拉不回。' },
    { id: 'n21', name: '洛神秋', title: '观星老人',   sect: 'zhoutian', talent: 4, realm: 4, kin: [],      temper: '飘逸', desc: '周天阁阁主，夜夜观星，据说能从星轨中算出人间气数。' },
    { id: 'n22', name: '红绡',   title: '血罗刹',     sect: null,      talent: 4, realm: 2, kin: [],      temper: '危险', desc: '行走黑暗中的女修，美艳危险，亦正亦邪，恩怨分明。' },
    { id: 'n23', name: '老酒鬼', title: '醉道人',     sect: null,      talent: 5, realm: 3, kin: [],      temper: '癫狂', desc: '抱着酒葫芦云游四方的疯道人，偶有惊世之言，深藏不露。' },
    { id: 'n24', name: '燕回时', title: '归雁剑侠',   sect: null,      talent: 4, realm: 1, kin: [],      temper: '侠气', desc: '路见不平必拔刀的游侠剑客，宁折不弯。' },
  ],

  /* ---------- §24 宗门长老派系（站队得专属资源，敌对派系派高危任务） ---------- */
  SECT_FACTIONS: [
    { id: 'tianshu',  name: '天枢殿', motto: '征伐之道，以战养战', desc: '主战长老一脉，崇尚以杀止杀。',
      giftText: '入门赐灵石三百与【天枢战纹】信物', gift: { stones: 300, item: 'z_tianshu' }, exclusive: [{ item: 'gf_tumo', cost: 1800 }] },
    { id: 'danding',  name: '丹鼎阁', motto: '丹火不熄，道火不灭', desc: '执掌丹房的长老一脉，丹药管够。',
      giftText: '入门赐【破境丹】×2 与【丹心玉佩】信物', gift: { stones: 100, item: 'z_danxin', extra: { pill_pojing: 2 } }, exclusive: [{ item: 'pill_jiuzhuan', cost: 900 }] },
    { id: 'cangjing', name: '藏经楼', motto: '典藏万法，开卷有益', desc: '看守藏经楼的长老一脉，典籍为尊。',
      giftText: '入门赐一部攻防典籍与【藏经阁印】信物', gift: { stones: 100, item: 'z_cangjing', gongfa: ['gf_lieyang', 'gf_xuantian'] }, exclusive: [{ item: 'gf_dayan', cost: 1800 }] },
  ],

  /* ---------- §25 秘境（每个大境界一座，肉鸽式节点探索） ---------- */
  DUNGEON_TOTAL_LAYERS: 9,
  DUNGEON_NODE_NAMES: { battle: '战斗', treasure: '宝箱', fortune: '奇遇', trap: '陷阱', npc: '遭遇', boss: '守关者' },
  SECRET_REALMS: [
    { id: 'sr0', name: '落霞洞天', recRealm: 0, desc: '练气修士便可涉足的小型洞天，霞光深处别有洞天。', pool: ['m_yezhu', 'm_dushe', 'm_shanlang', 'm_zeiren'], weights: { battle: 40, treasure: 22, fortune: 16, trap: 10, npc: 12 } },
    { id: 'sr1', name: '碧水寒潭', recRealm: 1, desc: '寒潭之下封着一座前朝水府，机关重重。', pool: ['m_qingbei', 'm_linghou', 'm_tiexia', 'm_luopo'], weights: { battle: 42, treasure: 20, fortune: 14, trap: 12, npc: 12 } },
    { id: 'sr2', name: '万蛊密林', recRealm: 2, desc: '蛊虫遮天的密林，危机与造化同在。', pool: ['m_chilin', 'm_fuqun', 'm_duzhu', 'm_chiyan'], weights: { battle: 46, treasure: 18, fortune: 12, trap: 12, npc: 12 } },
    { id: 'sr3', name: '上古剑冢', recRealm: 3, desc: '万剑朝冢，剑气冲霄，上古剑修埋骨之地。', pool: ['m_shikui', 'm_jianling', 'm_yinling', 'm_fengbao'], weights: { battle: 48, treasure: 18, fortune: 12, trap: 12, npc: 10 } },
    { id: 'sr4', name: '星坠之地', recRealm: 4, desc: '一颗星辰坠落形成的深谷，陨铁遍地，异兽横行。', pool: ['m_xiongyuan', 'm_yaohu', 'm_yinling', 'm_jianling'], weights: { battle: 48, treasure: 18, fortune: 12, trap: 12, npc: 10 } },
    { id: 'sr5', name: '太阴废城', recRealm: 5, desc: '太阴之气笼罩的死城，白骨为兵，阴灵为将。', pool: ['m_shigui', 'm_yuangu', 'm_yinjiao', 'm_moxiu'], weights: { battle: 50, treasure: 16, fortune: 12, trap: 12, npc: 10 } },
    { id: 'sr6', name: '九幽冥河', recRealm: 6, desc: '冥河水黑，渡船人无名，河底沉睡着上古战魂。', pool: ['m_guizu', 'm_yuangu', 'm_xueshe', 'm_moxiu'], weights: { battle: 50, treasure: 16, fortune: 12, trap: 12, npc: 10 } },
    { id: 'sr7', name: '混沌裂隙', recRealm: 7, desc: '天地初开时遗留的裂隙，混沌之气足以撕裂神魂。', pool: ['m_moxiu', 'm_xuling', 'm_tianchong'], weights: { battle: 52, treasure: 16, fortune: 12, trap: 12, npc: 8 } },
    { id: 'sr8', name: '仙府遗墟', recRealm: 8, desc: '一位仙人陨落前的洞府残墟，仙机将现。', pool: ['m_moxiu', 'm_xinggui', 'm_jianling'], weights: { battle: 50, treasure: 18, fortune: 14, trap: 10, npc: 8 } },
    { id: 'sr9', name: '登仙天梯', recRealm: 9, desc: '直上九霄的登天云梯，一步一重天，仙缘尽头是仙门。', pool: ['m_jianling', 'm_moxiu'], weights: { battle: 52, treasure: 16, fortune: 14, trap: 10, npc: 8 } },
  ],

  /* ---------- §26 转世出身（兵解转世时重择） ---------- */
  ORIGINS: [
    { id: 'hunter',  name: '山村猎户', desc: '自幼打猎熬筋骨，根骨体魄过人，悟性稍逊。', mods: { gen: 2, body: 2, comp: -1, luck: -1 }, start: { stones: 220, bag: { w_tiejian: 1, pill_liaoshang: 3 } } },
    { id: 'noble',   name: '世家子弟', desc: '家学渊源，悟性福缘俱佳，根骨体魄平平。', mods: { comp: 2, luck: 1, gen: -1, body: -1 }, start: { stones: 1200, bag: { gf_tuna: 1, pill_juqi: 5 } } },
    { id: 'scholar', name: '书院书生', desc: '读书养气，触类旁通，唯体魄孱弱。', mods: { comp: 2, luck: 2, body: -2, gen: -1 }, start: { stones: 400, bag: { pill_zhuji: 1, pill_juqi: 2 } } },
  ],

  /* ---------- §23 世界大事件（每 100 游戏年一次，永久改变格局） ---------- */
  WORLD_EVENTS: [
    { id: 'demon',  name: '魔界入侵',     desc: '魔气自天外涌入，一方之地化为魔域——域内妖魔狂化暴增，凶险倍之，然所获亦丰。' },
    { id: 'preach', name: '圣地讲道',     desc: '上古圣地开启讲道大会，道音涤荡神魂。十年之内，天下修士悟性倍增。' },
    { id: 'ruins',  name: '上古秘境现世', desc: '一座上古秘境重现人间，二十年间秘宝频现，机缘遍地。' },
    { id: 'war',    name: '宗门大战',     desc: '正道宗门因理念的裂痕兵戎相见，三十年战火——宗门悬赏暴涨，坊市物价腾贵。' },
  ],

  /* ---------- v6 图鉴：妖兽背景介绍（其余图鉴条目沿用各 def.desc） ---------- */
  CODEX_INTRO: {
    m_yezhu: '山间常见之野彘，獠牙初长，性憨而凶，是练气修士最好的磨刀石。',
    m_dushe: '栖于草莽的青环毒蛇，一寸信子一寸针，轻敌者多栽在它的偷袭上。',
    m_shanlang: '成群出没的灰毛山狼，惯于包抄围猎，落单的修士最合它们胃口。',
    m_zeiren: '不事生产、专劫道财的泼皮散修，手底有几分三脚猫功夫。',
    m_toumu: '盘踞后山的山贼头目，一把开山刀使得虎虎生风，腰间缠着抢来的储物袋。',
    m_qingbei: '青峰山特产的巨狼，脊背青毛如鬃，嚎声可传十里。',
    m_linghou: '通体雪白的灵猴，身轻如燕，最擅窃取修士腰间之物。',
    m_tiexia: '皮如铁铸的独角巨犀，横冲直撞，寻常剑刃难伤分毫。',
    m_luopo: '沦落到劫道糊口的落魄修士，招式里还残留着几分宗门底子。',
    m_qingluan: '青峰山灵禽之王，青羽如翠，一声清唳可慑百兽。',
    m_loulou: '黑风寨的喽啰修士，凭寨势横行乡里，本事平平。',
    m_erdangjia: '黑风寨二当家，心狠手辣，一杆浑铁枪专为拦道而生。',
    m_guimian: '戴着鬼面的神秘修士，来去无踪，行事狠辣不留活口。',
    m_dadangjia: '黑风寨大当家，筑基修为，寨中藏得有历年劫掠来的浮财。',
    m_chilin: '赤鳞蟒，妖兽森林的霸主之一，蜕下的蟒皮是上好炼材。',
    m_fuqun: '嗜血蝠群，闻血而动，铺天盖地令人防不胜防。',
    m_liedi: '裂地虎，一掌可碎石裂地，森林深处横行无忌。',
    m_shuyao: '千年古树成精所化的树妖，枝蔓如臂，绞杀生灵不断根。',
    m_shikui: '上古遗迹中护卫洞府的石傀，刀枪不入，力大无穷。',
    m_yinling: '噬魂阴灵，无形无质，专食修士神魂。',
    m_jianling: '上古剑修兵解后所化的剑灵，一缕剑意犹自锋锐。',
    m_moxiu: '修魔入邪的残魂，怨气凝身，遇之莫非大凶。',
    /* ---- v13 新增妖兽图录 ---- */
    m_duzhu: '花斑毒蛛，结网于花木之间，其毒虽缓，却蚀骨入髓。',
    m_xiezi: '铁背岩蝎，背负铁色硬壳，双螯一尾，皆淬山岩剧毒。',
    m_chiyan: '赤炎狼，毛色如火，性情暴烈，奔行时带起一路焦烟。',
    m_hanshi: '寒潭冰蟾，蟾鸣一声，寒气千里，冬日亦不敢近其潭。',
    m_fengbao: '风影豹，疾驰如风，只见其影不见其形，见形时爪已至。',
    m_xiongyuan: '赤目凶猿，双目赤红如血，力大无穷，最喜捶胸示威。',
    m_tengyao: '千年藤妖，藤蔓如臂如网，缚人绞杀，汲取血肉为养。',
    m_yaohu: '九尾妖狐，媚眼如丝，狐火焚心，多少修士折在其一顾之间。',
    m_heijiao: '黑蛟，蛟属凶种，黑鳞如墨，一尾可断江流，山中王者。',
    m_shiren: '石人武士，上古阵法孕生的石傀，持锤而立，千年不倦。',
    m_guizu: '黄泉鬼卒，阴司游兵，勾魂索魄，见之者如坠黄泉。',
    m_yuangu: '千年怨鬼，怨气千年不散，其语如耳畔低喃，闻之神魂俱颤。',
    m_shigui: '白骨尸鬼，尸毒蚀骨，爪过处血肉腐坏，最是难缠。',
    m_yinjiao: '阴煞蛟，生于幽泽的蛟类异种，通体阴煞，所游之处生机断绝。',
    m_xueshe: '雪域冰蟒，蟒身覆霜，吐信成冰，绞缠之力可碎金玉。',
    m_yinshou: '泽底阴兽，幽泽最深处的凶物，无人见过其全貌——见过的人都沉在了泽底。',
    m_xinggui: '星陨石傀，天外飞舟的护卫傀儡，星辉装甲千年未损。',
    m_tianchong: '天外异虫，随飞舟坠落的域外虫群，蚀髓吸髓，繁衍极快。',
    m_xuling: '虚空幻灵，虚实难辨的域外之物，触之即被虚空禁锢。',
    m_zhouling: '飞舟器灵，飞舟核心孕育出的器灵，视闯入者为窃贼，格杀勿论。',
    m_shuiling: '沧海水灵，龙渊灵气所化的精灵，潮汐起落间可愈可杀。',
    m_haiyi: '深渊海兽，万丈渊底的巨兽，一张巨口可吞舟楫。',
    m_jiaojiao: '怒海蛟龙，蛟中年长者，已具龙形，怒涛覆海，威震龙渊。',
    m_longgui: '玄武龙龟，龙裔异种，甲如玄武，寿逾万年，近乎不死。',
    m_yuanmo: '渊底魔影，龙渊最深处的魔物，无人知晓其来历——只知连蛟龙都绕着它游。',
  },

  /* ======================================================================
   * v15 剧情脚本库 STORIES（问道九章 · 每章三段：开篇卷轴 / 中段插章 / 章末演出）
   * 场景格式见 Story 引擎注释。pick(value) 返回结算旁白行数组。
   * ====================================================================== */
  STORIES: {
    /* ============ 第一章 · 尘缘 ============ */
    c1_open: { id: 'c1_open', title: '第一章 · 尘缘', scenes: [
      { t: 'narr', text: '你上山采药归来，远远便望见村口纸钱飞扬。\n采药老人的茅屋前围满了人——那位总在你摔破膝盖时替你敷药、把最后半块干粮塞进你手里的老人，殁了。' },
      { t: 'dialog', who: '采药老人', title: '临终 · 三日前', text: '孩子……坐近些，让老朽再看看你。\n老朽本不姓陈，也不该死在这山村裏……这残玉，你收好。血河宗的信物……当年满门三百七十一口，只逃出老朽一人……' },
      { t: 'dialog', who: '采药老人', title: '气若游丝', text: '替我……查清当年的灭门血案……查清了，老朽做鬼……也谢你……\n记住，莫信正道衣冠，莫信魔道獠牙……人心，最是靠不住……' },
      { t: 'narr', text: '言未尽，人已逝。\n你葬了老人，坟头朝东——那是他从未说过的故乡的方向。半枚温润的古玉贴身收好，触手生温，仿佛还带着老人的体温。' },
      { t: 'narr', text: '自此，修行之路多了一个执念。\n血河宗——三百年前被正道围灭的魔宗——这四个字，成了你道途的第一粒种子。' },
    ] },
    c1_mid: { id: 'c1_mid', title: '第一章 · 残玉初热', scenes: [
      { t: 'narr', text: '根基初固的这夜，你照例吐纳入定。\n忽觉怀中一烫——残玉竟自行发热，温热顺着心口蔓延四肢百骸。' },
      { t: 'narr', text: '恍惚间你坠入一片血色的河。河面上浮着三百七十一盏河灯，每一盏，都是一条性命。\n河底有低语声，千万重，听不清，却又句句扎心。' },
      { t: 'dialog', who: '？？？', title: '血色深处', text: '……又一个，戴着它的活人……\n三百年了……玉在，宗门就在……你，会是那个报仇的人吗……' },
      { t: 'narr', text: '你猛然惊醒，冷汗透衣。\n窗外月色如霜，残玉安安静静躺在掌心，凉得像一块普通的石头——方才的一切，是梦，还是玉中亡魂的低语？' },
    ] },
    c1_end: { id: 'c1_end', title: '第一章 · 终 · 入世', scenes: [
      { t: 'narr', text: '村后山的野兽被你清剿一空，寻常山匪闻风远遁。\n你在老人坟前坐了一夜，把一年的历练从头到尾想了一遍。' },
      { t: 'dialog', who: '你', title: '坟前自语', text: '老人家，你的仇家在庙堂之高，在名门正派，也可能在魔窟深渊。\n我如今的修为，出了这山村，怕是连给他提鞋都不配。' },
      { t: 'choice', text: '天将亮时，你朝坟茔磕了三个头。起身时，你想带着什么入世？', options: [
        { text: '带着他的遗志——此仇必报，虽九死其犹未悔', value: 'vengeance' },
        { text: '带着他的告诫——莫信人心，凡事只信自己亲眼所见', value: 'caution' },
        { text: '带着他的牵挂——查清真相，但不让仇恨吞掉自己', value: 'clarity' },
      ], pick: (v) => {
        const p = Game.player;
        if (v === 'vengeance') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['你在坟前立誓：血债血偿。\n一股戾气沉入丹田，化作道途第一缕凶悍的真意。（突破感悟 +6）']; }
        if (v === 'caution') { p.attrs.luck = Math.min(10, p.attrs.luck + 1); return ['你记住了老人的告诫：人心最靠不住。\n从此你的眼睛多了几分审慎——这种审慎，就是福缘。（福缘 +1）']; }
        KarmaSys.addFortune(3); return ['你不想让仇恨吃掉自己——查清真相，然后好好活着。\n这份澄明，让天地都轻快了几分。（气运 +3）'];
      } },
    ] },

    /* ============ 第二章 · 青峰疑云 ============ */
    c2_open: { id: 'c2_open', title: '第二章 · 青峰疑云', scenes: [
      { t: 'narr', text: '残玉入夜生温，热度竟随方位变化。\n你循着感应来到青峰山——山坳深处，火把如龙。' },
      { t: 'narr', text: '黑风寨的人马竟在夜里挖掘一座上古遗迹。\n为首之人一袭黑袍立在崖边，从不亲手碰土，只负手看月。' },
      { t: 'narr', text: '你潜伏在岩后，借着月光看清了一件事——\n那黑袍人抬手拂开额发时，手腕内侧，赫然刺着一行赤色纹路：蜿蜒如河，正是残玉上河纹的同源。' },
      { t: 'dialog', who: '？？？', title: '黑袍人 · 崖上低语', text: '差一件……还差一件钥匙……\n急什么。三百年都等了……血河不灭，此玉不宁——它自己会送上门来。' },
      { t: 'narr', text: '你屏息记下一切，悄然而退。\n回到村中，你彻夜难眠：血河宗三百年前不是被灭门了么？这些人在挖什么？「钥匙」又是什么？' },
    ] },
    c2_mid: { id: 'c2_mid', title: '第二章 · 河纹令牌', scenes: [
      { t: 'narr', text: '连番厮杀，黑风寨的喽啰在你刀下节节败退。\n清理战场时，一具尸体滑出个物件，当啷落地。' },
      { t: 'narr', text: '是一面黑铁令牌，正面刻着「玄影」二字，背面一行小字：\n「掘龙脉者赏，窥河纹者死。」' },
      { t: 'dialog', who: '你', title: '摩挲令牌', text: '玄影……\n黑风寨不过是群劫道的泼皮，怎么会有制式令牌？这位「玄影」——是那黑袍人的名号，还是他背后的势力？' },
      { t: 'narr', text: '你把令牌收进储物袋。\n线索断了一头，又续上一头——黑风寨的背后，远不止一座山寨那么简单。' },
    ] },
    c2_end: { id: 'c2_end', title: '第二章 · 终 · 血绘残图', scenes: [
      { t: 'narr', text: '练气圆满的那一夜，残玉忽然轻鸣，声如蚊蚋，却直往你的识海里钻。\n你循着感应摸回青峰山，在黑风寨挖掘的遗迹深处，发现了一条被塌方掩住大半的暗缝。' },
      { t: 'narr', text: '缝隙尽头的石壁上，用暗红色的颜料绘着半张地图——颜料早已干涸发黑，但那色泽，你认得。\n和残玉内里渗出的一模一样。是血。三百年前的血。' },
      { t: 'choice', text: '石壁坚硬，整图无法取下。你如何处置这半张血图？', options: [
        { text: '以灵墨拓印之法复制下来，原壁不动', value: 'copy' },
        { text: '凿下整块石壁带走——宁可得罪全山寨', value: 'take' },
        { text: '牢记于心，再以巨石掩回原样，不惊动任何人', value: 'memorize' },
      ], pick: (v) => {
        const p = Game.player;
        if (v === 'copy') { p.insight = Math.min(100, (p.insight || 0) + 5); Bag.addItem('m_gupian', 1); return ['你以灵墨拓下血图，指尖抚过河纹时，残玉微微一颤，似在应和。（突破感悟 +5，上古法宝碎片 ×1）']; }
        if (v === 'take') { Bag.addStones(Math.round(120 * GameData.stoneEco(p.realmIdx))); Bag.addItem('m_gupian', 1); return ['你凿下石壁，以破布裹好背走。乱世之中，实物在手，胜过千般记忆。（灵石若干，上古法宝碎片 ×1）']; }
        KarmaSys.addFortune(4); return ['你把整幅图刻进记忆，又搬来巨石掩住石壁——让它继续沉睡。\n多一分谨慎，多一分气运。（气运 +4）'];
      } },
      { t: 'narr', text: '半张血图与半枚残玉，都在你手上了。\n下一章，该去拜入一个宗门了——想查三百年前的灭门案，散修的眼睛，看不见庙堂的角落。' },
    ] },

    /* ============ 第三章 · 筑基风云 ============ */
    c3_open: { id: 'c3_open', title: '第三章 · 筑基风云', scenes: [
      { t: 'narr', text: '筑基那夜，灵气如百川灌顶。\n你于气海之中铸就道基的刹那，怀中残玉骤然裂开一道细纹，露出内里一行小字——' },
      { t: 'dialog', who: '残玉内里', title: '古字显形', text: '「血河不灭，此玉不宁。」' },
      { t: 'narr', text: '坊市酒肆间，你终于听到一个完整的名字：血河宗，三百年前以魔入道、炼万魂丹以生魂饲之，被九宗联手围灭于血河故道。\n而当年主持围杀的九人之中，竟有一位，至今仍是一宗德高望重的太上长老。' },
      { t: 'narr', text: '欲查血案，须入宗门。你收拾行囊，望向修仙界最大的三座山门——\n无论拜入哪一座，从此你便不再是山野散修。' },
    ] },
    c3_mid: { id: 'c3_mid', title: '第三章 · 藏经阁夜话', scenes: [
      { t: 'narr', text: '修习功法之余，你常泡在藏经阁。\n这一夜你在故纸堆最底层翻到一册无名残卷，纸页焦脆，像是被人刻意塞进了不会有人翻看的地方。' },
      { t: 'narr', text: '残卷记的是三百年前血河宗围灭战的缴获名录：\n「焚功法一十七部、丹炉九座、万魂丹炉……炉下不见尸骨，唯余锁魂链九十九条——炼丹之魂，尽随炉主遁走。」' },
      { t: 'dialog', who: '你', title: '指尖发凉', text: '不见尸骨……随炉主遁走……\n也就是说，当年血河宗主没有死？不——更可怕的是：九宗是知道的。他们瞒了三百年。' },
      { t: 'narr', text: '你把残卷原样放回，指尖冰凉。\n这潭水，比你想的深得多。' },
    ] },
    c3_end: { id: 'c3_end', title: '第三章 · 终 · 玄影夜访', scenes: [
      { t: 'narr', text: '你在宗门站定了脚跟。这一夜你刚行功完毕，窗纸上忽然多了一道人影——\n人影负手而立，声音像是从很远的地方传来，又像贴着你的耳根。' },
      { t: 'dialog', who: '玄影客', title: '窗外 · 隔空传音', text: '别找了。你翻遍藏经阁也找不到真相——真相在血河故道的水底。\n小家伙，玉在你身上，是它的运气，也是你的丧钟。' },
      { t: 'dialog', who: '玄影客', title: '冷笑', text: '把残玉送到青峰山北崖，我留你全尸。\n否则——下一次见面，就是在你宗门上下的葬礼上。' },
      { t: 'choice', text: '窗外人影一晃即逝。你握紧残玉，如何回应这份威胁？', options: [
        { text: '「想要玉？自己来拿。」——把威胁原样顶回去', value: 'defy' },
        { text: '虚与委蛇，假意应下，暗中东窗事发前先布后手', value: 'feign' },
        { text: '沉默不语，只把今夜每一个字记进心里', value: 'silent' },
      ], pick: (v) => {
        const p = Game.player;
        if (v === 'defy') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['你对窗外冷冷吐出八个字：「想要玉，自己来拿。」\n那瞬息的死寂之后，一声极轻的笑散在夜里。道心愈厉。（突破感悟 +6）']; }
        if (v === 'feign') { KarmaSys.addFortune(3); Bag.addStones(Math.round(80 * GameData.stoneEco(p.realmIdx))); return ['你隔窗应了一声「容我想想」——先稳住他，再谋后手。\n与虎谋皮者，须比虎更有耐心。（气运 +3，灵石若干）']; }
        p.insight = Math.min(100, (p.insight || 0) + 3); return ['你一言不发，只把今夜的每一个字刻进识海。\n沉默不是怯懦，是把刀藏进鞘里。（突破感悟 +3）'];
      } },
      { t: 'narr', text: '玄影客。掘龙脉。血河故道。\n线索一环扣一环——而你知道，真正的博弈，才刚刚开场。' },
    ] },

    /* ============ 第四章 · 红尘炼心 ============ */
    c4_open: { id: 'c4_open', title: '第四章 · 红尘炼心', scenes: [
      { t: 'narr', text: '宗门长老见你勤勉，私下透露了一桩秘辛：\n当年围杀血河宗的密令，出自一封无落款的黑玉令。九宗各执一词，而黑玉令的主人，至今仍在暗处。' },
      { t: 'dialog', who: '白发长老', title: '密室 · 压低声音', text: '此事牵扯太广。你如今人微言轻，查案是找死。\n听老朽一句劝——先炼心，后问案。心不坚者，知道了真相也撑不住真相。' },
      { t: 'narr', text: '于是你走入红尘。\n红尘劫、江湖义、陌路的善与恶——三百年前的血案是一面镜子，照见的却是今人的心。' },
      { t: 'dialog', who: '你', title: '自省', text: '善恶从来不在门派，而在人心。\n当年九宗围杀血河，杀的是万魂丹的罪，还是灭口的怯？这个问题，我必须先给自己一个答案。' },
    ] },
    c4_mid: { id: 'c4_mid', title: '第四章 · 临终之言', scenes: [
      { t: 'narr', text: '百战之中，你截住了一名劫道的散修。\n刀锋落下之前，他却笑了——笑得你心头发毛。' },
      { t: 'dialog', who: '垂死散修', title: '血泊中的笑', text: '杀吧，杀吧……你们这些名门走狗……\n你以为当年九宗就干净吗？万魂丹的炉子……呵呵……一半材料，是从他们自己人手里买的……' },
      { t: 'narr', text: '他咽了气，笑容还挂在脸上。\n你握刀的手，第一次微微发抖——如果他说的是真的，那你查的就不再是一桩血案，而是一张铺了三百年的网。' },
    ] },
    c4_end: { id: 'c4_end', title: '第四章 · 终 · 道心之答', scenes: [
      { t: 'narr', text: '红尘一遭归来，你见过跪地求饶的劫匪，也见过袖手旁观的仙师。\n这一夜你独坐崖头，把心底那个问题翻出来，逼自己作答。' },
      { t: 'choice', text: '若他日真凶就在眼前——刀，该不该落下？', options: [
        { text: '该。以杀止杀，是乱世里最诚实的公道', value: 'blade' },
        { text: '以直报怨——罪证公之于众，让天下人审他', value: 'justice' },
        { text: '先问清因由。冤有头债有主，不杀无辜之人', value: 'mercy' },
      ], pick: (v) => {
        const p = Game.player;
        if (v === 'blade') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['你选了最锋利的那条路。\n刀意自道心出，从此你的每一剑都带着答案。（突破感悟 +6）']; }
        if (v === 'justice') { KarmaSys.addFortune(5); return ['你要的不是他的命，是他的罪孽暴露在天日之下。\n这份坦荡，天必佑之。（气运 +5）']; }
        p.insight = Math.min(100, (p.insight || 0) + 3); KarmaSys.addFortune(2); return ['刀起刀落之前，先给他一个把话说完的机会。\n谨慎即是慈悲，亦是自保。（突破感悟 +3，气运 +2）'];
      } },
      { t: 'narr', text: '道心之问已有了答案。你摸了摸怀中残玉——\n血河宗之事，你想查明白了。为了老人，也为了自己。' },
    ] },

    /* ============ 第五章 · 金丹之秘 ============ */
    c5_open: { id: 'c5_open', title: '第五章 · 金丹之秘', scenes: [
      { t: 'narr', text: '金丹天劫的雷光中，残玉骤然炸响！\n一段不属于自己的记忆，如决堤洪水涌入识海——' },
      { t: 'dialog', who: '前世的你', title: '记忆 · 三百年前', text: '（一袭黑袍，腕刺河纹，站在万魂丹炉前）\n炉中是九千九百九十九条生魂……宗主说，丹成之日，血河万世不灭。可这丹炉里，有刚满月的婴啼。' },
      { t: 'dialog', who: '前世的你', title: '诛仙台上', text: '我不忍了。这一炉，我不炼了。\n——宗主，你打碎我的金身可以，但血河宗的账，我做鬼也要记着。' },
      { t: 'dialog', who: '血河宗主', title: '记忆尽头 · 冰冷', text: '叛徒。\n我把你当亲生骨肉，你却把刀递给外人。……好，很好。你的真灵，我收进残玉里——让你亲眼看着，我炼成这万年血河。' },
      { t: 'narr', text: '记忆归位，浑身冰冷。\n你——是血河宗首席的转世。那个背叛宗门、被封真灵于残玉、又转世重修的人。\n你对宗主的恨意有了温度：那是前世未尽的执念。' },
    ] },
    c5_mid: { id: 'c5_mid', title: '第五章 · 万魂幻象', scenes: [
      { t: 'narr', text: '丹道初窥，你第一次以自炼之丹入定行气。\n药力行至心脉，残玉轰然共鸣——一段幻象强行拉你入内。' },
      { t: 'narr', text: '幻象里，万魂丹炉熊熊燃烧。炉壁上锁魂链根根绷紧，链条尽头……拴着的都是熟悉的轮廓：采药老人、村口的孩童、甚至昨日在坊市与你擦肩的货郎。\n三百年了，这些魂魄还没有散。' },
      { t: 'dialog', who: '前世的你', title: '幻象中', text: '看见了吗。这就是我拼死阻止的东西。\n如今炉在你手，玉在你身——这一世的你，敢不敢接着烧完这炉火？' },
      { t: 'narr', text: '幻象散去，你攥紧了拳。\n散魂未灭，就有救回来的可能——这是仇，也是债。两笔，你一起还。' },
    ] },
    c5_end: { id: 'c5_end', title: '第五章 · 终 · 认与不认', scenes: [
      { t: 'narr', text: '金丹已成，前尘尽现。\n你坐在洞府深处，与识海中那缕前世的真灵，做了三百年来的第一次正式对谈。' },
      { t: 'dialog', who: '前世真灵', title: '识海深处', text: '我不求你认下血河宗——那个宗门该死。\n我只求你认下我这笔执念。宗主的万魂丹还差最后一味主魂，就是你。他找了我三百年，也会找你三百年。' },
      { t: 'choice', text: '面对前世的身份与仇怨，你的道心如何落子？', options: [
        { text: '认下这段因果——前世之债，今生来偿', value: 'accept' },
        { text: '道不同——我是我，他是他，我只走我自己的路', value: 'sever' },
        { text: '不认身份，只认利害——以他的执念为刃，反制于他', value: 'leverage' },
      ], pick: (v) => {
        const p = Game.player;
        if (v === 'accept') { p.insight = Math.min(100, (p.insight || 0) + 8); return ['你在识海朝那缕真灵伸出手：「债我认，怨我接。\n但从今往后，这笔账由我来讨。」识海金光大涨。（突破感悟 +8）']; }
        if (v === 'sever') { KarmaSys.addFortune(6); return ['「前世是前世，我是我。」你斩断记忆的丝线，只取其警醒。\n道心澄明，天地开阔。（气运 +6）']; }
        p.insight = Math.min(100, (p.insight || 0) + 4); return ['身份可以不认，用处不能不要。\n前世真灵的记忆，就是宗主的命门地图。（突破感悟 +4）'];
      } },
      { t: 'narr', text: '残玉在你掌心微微发烫。《血河真解》的目录在识海里缓缓展开——其本体，就在宗主手中。下一战的沙盘，已然铺开。' },
    ] },

    /* ============ 第六章 · 元婴杀局 ============ */
    c6_open: { id: 'c6_open', title: '第六章 · 元婴杀局', scenes: [
      { t: 'narr', text: '元婴初成，神识大涨的当夜，你感应到三道杀意掠过天际——\n血河宗主的分身，循着残玉的气息来了。' },
      { t: 'dialog', who: '宗主分身', title: '天际 · 遥遥压制', text: '小辈，把真灵交出来，我留你元婴自废，做一介凡人。\n三百年前他选了一次，选错了。你——不必急着选，先活过今晚再说。' },
      { t: 'narr', text: '正面相抗，必死无疑。\n你想起典籍里的记载：上古法宝，克魔魂。集齐碎片铸成本命法宝，或有一线生机。' },
      { t: 'dialog', who: '你', title: '攥紧残玉', text: '想拿走他们，先过我这一关。\n——在我凑齐九枚碎片之前，这枚残玉，你一枚也拿不走。' },
    ] },
    c6_mid: { id: 'c6_mid', title: '第六章 · 残魂授法', scenes: [
      { t: 'narr', text: '秘境深处，九枚碎片在你怀中嗡鸣不止，忽然齐齐飞起，悬成一周。\n碎片光幕之中，一位古修残影缓缓睁眼。' },
      { t: 'dialog', who: '上古残魂', title: '碎片光幕', text: '持玉者……老夫等你三百年。\n当年血河以万魂炼丹，老夫拼死封存九枚炼魂石于诸秘境——碎片聚，本命成，魔魂可克。' },
      { t: 'dialog', who: '上古残魂', title: '传授 · 消散前', text: '记住：此宝炼成之日，需以本命精血认主。\n它认的是「护」字——若有一日你拿它去害人，它会第一个反噬你。' },
      { t: 'narr', text: '残影散作点点星光，没入九枚碎片。\n你朝着光幕深深一拜——这一拜，是谢，也是誓。' },
    ] },
    c6_end: { id: 'c6_end', title: '第六章 · 终 · 五碎片退敌', scenes: [
      { t: 'narr', text: '五枚碎片在你掌心嗡鸣，与体内残玉遥相呼应。\n分身的第三波杀意压顶而至的刹那，五道光柱冲天而起，结成一座上古困杀大阵！' },
      { t: 'dialog', who: '宗主分身', title: '阵中被困', text: '上古炼魂石的封印……好，好得很。\n小辈，你以为集齐碎片就赢了吗？本尊的真身，已在血河故道沉潜三百年——他，比你更有耐心。' },
      { t: 'choice', text: '困阵只撑得三息。分身将溃之际，你如何了断？', options: [
        { text: '阵中斩杀，不留后患——哪怕被他临死反噬', value: 'slay' },
        { text: '逼问血河故道的入口，再放他溃散', value: 'interrogate' },
        { text: '不为已甚——溃散即可，我要的是本尊', value: 'spare' },
      ], pick: (v) => {
        const p = Game.player;
        if (v === 'slay') { p.insight = Math.min(100, (p.insight || 0) + 6); Bag.addItem('m_gupian', 1); return ['光柱绞落，分身溃作齑粉——一缕晶粹的魂晶落入你掌心。\n杀伐果断，道心愈厉。（突破感悟 +6，上古法宝碎片 ×1）']; }
        if (v === 'interrogate') { KarmaSys.addFortune(4); return ['你以阵压魂，逼出一句真言：「血河故道，入水三千丈，问渡船人。」\n分身溃散。（气运 +4）']; }
        p.insight = Math.min(100, (p.insight || 0) + 3); return ['你收了光柱，任分身溃散——「回去告诉你的真身，我在血河故道等他。」\n不逞一时之勇，直取要害。（突破感悟 +3）'];
      } },
      { t: 'narr', text: '杀意暂时退去。\n你知道，分身只是开胃菜——本尊出关之日，才是真正的死局。而你要在那天之前，变得比死局更强。' },
    ] },

    /* ============ 第七章 · 血河旧账 ============ */
    c7_open: { id: 'c7_open', title: '第七章 · 血河旧账', scenes: [
      { t: 'narr', text: '化神之后，你的名字开始在诸宗长老之间流传。\n这一日，一位素未谋面的白须掌门亲自登门，屏退左右，只带了一样东西——一份泛黄的名单。' },
      { t: 'dialog', who: '白须掌门', title: '开门见山', text: '三百年前灭血河宗那一战，老夫的师尊也被黑玉令牵着走。\n老夫时日无多，有些账，再烂在土里，就真的没人记得了。你若要查——名单给你。' },
      { t: 'narr', text: '名单上九个名字，六人已化尘土。\n第三个名字被朱笔圈过：当世某大宗的太上长老，如今依旧端坐在护山大阵之后，受万人敬仰。' },
      { t: 'dialog', who: '你', title: '摩挲名单', text: '朱笔圈过的……是第一个死的，还是第一个该死的？\n老前辈，这一笔，是您圈的，还是……' },
    ] },
    c7_mid: { id: 'c7_mid', title: '第七章 · 一纸请帖', scenes: [
      { t: 'narr', text: '你连败精英、声名鹊起的第七日，一只白玉飞帖落在你洞府案头。\n帖上字迹圆润和煦，内容却字字如刀。' },
      { t: 'dialog', who: '太上长老的请帖', title: '玉帖 · 原文', text: '「闻小友追查旧案，甚勇。\n三日后，敝宗丹会，备好茶。令祖当年之事，老夫知之甚详——来，或不来，悉听尊便。」' },
      { t: 'narr', text: '没有落款，没有威胁。\n可你翻遍整张玉帖，越看越冷——对方知道你在查，知道你查到哪一步，甚至……知道你会上钩。' },
      { t: 'narr', text: '明知是鸿门宴。\n但有些话，只有坐在那个位置上的人才能说给你听。' },
    ] },
    c7_end: { id: 'c7_end', title: '第七章 · 终 · 落子之选', scenes: [
      { t: 'narr', text: '丹会之期将至，你把家底盘点了一遍：灵石、碎片、本命法宝、以及那份名单。\n棋盘铺开，你执黑先行——这一手，决定的是之后所有的棋路。' },
      { t: 'choice', text: '面对位高权重的太上长老，你如何落子？', options: [
        { text: '明查——应帖赴会，当面锣对面鼓', value: 'open' },
        { text: '暗访——绕开他，先查黑玉令的来历', value: 'dark' },
        { text: '借刀——把名单递给他的政敌，坐山观虎斗', value: 'blade' },
      ], pick: (v) => {
        const p = Game.player;
        if (v === 'open') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['你决定赴会。\n既然躲不过，就堂堂正正走进那座大阵——正气在胸，何惧鸿门。（突破感悟 +6）']; }
        if (v === 'dark') { KarmaSys.addFortune(5); return ['你按下玉帖，转身去查黑玉令。\n高手的对决从不在明面上——先断其爪，再扼其喉。（气运 +5）']; }
        p.insight = Math.min(100, (p.insight || 0) + 4); KarmaSys.addFortune(2); return ['你把名单誊抄三份，送进三家门派。\n让巨人们先互相咬起来，你在收网。（突破感悟 +4，气运 +2）'];
      } },
      { t: 'narr', text: '落子无悔。\n而无论哪条路，终点都写着同一行字：血河故道，宗主本尊。' },
    ] },

    /* ============ 第八章 · 大乘问道 ============ */
    c8_open: { id: 'c8_open', title: '第八章 · 大乘问道', scenes: [
      { t: 'narr', text: '大乘雷劫落定，天地为你让路。\n可这夜残玉彻夜长鸣，鸣声里再无秘密可言——玄影客的杀意，已经近到你可以用肉眼看见。' },
      { t: 'narr', text: '你深知：决战之前，当有亲友相依、大道相佐。\n孤身一人，挡不住三百年布局的仇家——更挡不住他背后那张网。' },
      { t: 'dialog', who: '沈青崖', title: '剑宗 · 夜访', text: '听闻有人在集你的人头。\n我不管你查什么旧案——剑宗欠你一个恩情，这一战，青锋剑痴的剑，借你。' },
      { t: 'dialog', who: '你', title: '还礼', text: '沈兄，此战之后，我请你喝最好的酒。\n……若我回不来，就当我赊的。' },
    ] },
    c8_mid: { id: 'c8_mid', title: '第八章 · 真灵授剑', scenes: [
      { t: 'narr', text: '功法参悟至极处，识海金光如昼。\n前世真灵自残玉中走出，这一回，他没有说话，只是抬手——' },
      { t: 'narr', text: '一式剑意自他指尖流出。不快，不烈，却让整个识海都安静下来。\n那是他当年名动血河的成名式：不为杀戮，只为「止战」。' },
      { t: 'dialog', who: '前世真灵', title: '临别', text: '这一式，三百年前我没能用它救下那九千九百九十九人。\n今日传你——别再像我一样，学会得太迟。' },
      { t: 'narr', text: '真灵散入你的金丹，从此不分彼此。\n你睁开眼，眸底有过一瞬的血色，随即澄明如洗。' },
    ] },
    c8_end: { id: 'c8_end', title: '第八章 · 终 · 决战前夜', scenes: [
      { t: 'narr', text: '决战前夜，你没有修炼。\n你把想见的人都见了一遍，把想说的话都说了一遍——修士的道途太长，长到很多话一放就是几百年。' },
      { t: 'choice', text: '最后一杯酒敬给这场决战。你如何托付身后事？', options: [
        { text: '立誓同去——「要死一起死，要活一起活」', value: 'together' },
        { text: '托付后事——若我不归，请替我看一眼血河故道的春天', value: 'entrust' },
        { text: '独自承受——恩怨我一人结的，雷海我一人去趟', value: 'alone' },
      ], pick: (v) => {
        const p = Game.player;
        if (v === 'together') { KarmaSys.addFortune(6); return ['亲友把盏，齐声应诺。\n这一夜无人在意胜负——道途最贵，是有人与你同担。（气运 +6）']; }
        if (v === 'entrust') { p.insight = Math.min(100, (p.insight || 0) + 5); return ['你把残玉的一半放在至交掌心：「若我不归，替我把它带到血河故道。」\n道心因托付而愈定。（突破感悟 +5）']; }
        p.insight = Math.min(100, (p.insight || 0) + 8); return ['你婉拒了所有同行者——有些因果，只能一个人去结。\n独行者，道心至坚。（突破感悟 +8）'];
      } },
      { t: 'narr', text: '残玉忽然安静下来。\n它感应到了什么。决战之地，已被选定——你的飞升雷台。' },
    ] },

    /* ============ 第九章 · 天劫决战 ============ */
    c9_open: { id: 'c9_open', title: '第九章 · 天劫决战', scenes: [
      { t: 'narr', text: '渡劫雷云压顶之际，一道黑影踏雷而来。\n三百年前把你打下诛仙台的人，竟也踏入了这一方天地——血河宗主，来收他等了三百年的「主魂」。' },
      { t: 'dialog', who: '血河宗主', title: '踏雷而至', text: '小家伙，你借残玉修行每一步，都是在替我温养真灵。\n如今你渡劫飞升，天地门开——把你炼成万魂丹最后的主魂，我这万年血河，就圆满了。' },
      { t: 'dialog', who: '你', title: '雷海中央 · 长啸', text: '三百年前你打碎他的金身，三百年后你打我的算盘。\n宗主——你算计了一辈子，就没算到，我们两个，都想你死。' },
      { t: 'narr', text: '雷海之上，新旧两世，终须一战。' },
    ] },
    c9_mid: { id: 'c9_mid', title: '第九章 · 血煞渐醒', scenes: [
      { t: 'narr', text: '决战前的每一战，都让残玉更烫一分。\n前世真灵的血煞在你经脉里醒来——那是三百年前腥风血雨里淬出的凶性，也是最深的一道伤。' },
      { t: 'narr', text: '你清楚地感觉到两股力量在识海对峙：\n一股是前世燃烧的恨，一股是今生澄明的道。' },
      { t: 'dialog', who: '前世真灵', title: '识海 · 最后的叮嘱', text: '决战之时，我会把我所有的血煞借给你。\n但你要记住——借刀是为了止杀，不是为了痛快。这是我这三百年，唯一想通的事。' },
      { t: 'narr', text: '你点了点头。\n两世合一，只此一战。' },
    ] },
    c9_end: { id: 'c9_end', title: '终章 · 雷海了断', scenes: [
      { t: 'narr', text: '第九道天雷落下时，你引动残玉中前世全部的血煞，与宗主的魔身同缚雷心。\n雷光吞没一切的刹那，你听见三百年来的执念，在雷心里烧成了灰。' },
      { t: 'dialog', who: '血河宗主', title: '雷心 · 魔身崩解', text: '……为什么。\n我算尽了天时地利人心……唯独没算到，恨意烧到最后，剩下的会是……释然……' },
      { t: 'narr', text: '宗主长叹一声，魔身寸寸崩解。\n万魂丹炉的锁魂链应声尽断——九千九百九十九道流光自血河故道冲天而起，如逆流的星河，散入人间。' },
      { t: 'choice', text: '雷光将熄，宗主最后一缕残魂飘到你面前。你如何了断这三百年因果？', options: [
        { text: '渡他——「去吧，来世投个好人家」', value: 'redeem' },
        { text: '斩尽——「这一剑，替三百七十一口」', value: 'execute' },
        { text: '转身不问——雷散云开，恩怨自随劫火而灭', value: 'walk' },
      ], pick: (v) => {
        const p = Game.player;
        if (v === 'redeem') { KarmaSys.addFortune(10); return ['你收了剑，目送那缕残魂消散在天光里。\n雷散，云开。杀伐止于慈悲——这是比飞升更大的道行。（气运 +10）']; }
        if (v === 'execute') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['剑光如练，斩落残魂。\n「这一剑，替采药老人，替三百七十一口，也替前世的我。」——恩怨两清。（突破感悟 +6）']; }
        KarmaSys.addFortune(4); p.insight = Math.min(100, (p.insight || 0) + 4); return ['你转身踏上雷台，不再回头。\n劫火焚尽万物，也焚尽了因果。（气运 +4，突破感悟 +4）'];
      } },
      { t: 'narr', text: '残玉化入你的眉心，化作一点朱砂。\n你回首人间，白衣胜雪——仙门之后，另有一番天地。\n\n【问道九章 · 终】' },
    ] },
  },

  /* ======================================================================
   * v5 沉浸感扩展：职业专属叙事 / 境界突破演出 / 坊市行情
   * ====================================================================== */

  /* ---------- 各大境界突破专属描写（破入该境时渐显，20~30字） ---------- */
  REALM_ASCEND_TEXT: {
    1: '凡胎浊气尽数褪去，灵台如洗，月白风清——自此，方算踏入道门。',
    2: '丹田中一声轻鸣，金丹初成，光华内蕴。从此我命由我，不问天时。',
    3: '金丹碎而元婴生，识海之中另有一个小小的你，睁眼坐起。',
    4: '元婴化神，神游万里不过一念。旧日天地，如今只是一方庭院。',
    5: '神魂炼入虚空，与天地灵机同呼吸。风起于青萍之末，你先知。',
    6: '神与身合，道与法合。一念既动，山河变色，草木俯首。',
    7: '大道三千，你已阅尽大半。回望来路，仙门只剩最后一线。',
    8: '劫云压城城欲摧。此关一过，人间再无可拦你之人。',
    9: '霞光贯体，仙音绕梁。凡人之躯，终成不朽——恭喜道友。',
  },
  /** 破入各境的异象光色（宣纸亮色主题：采用可在浅底上清晰呈现的深色调）
   *  练气灰 / 筑基翠 / 金丹金 / 元婴紫 / 化神蓝 / 炼虚青 / 合体霓 / 大乘橙 / 渡劫靛 / 真仙赤金 */
  REALM_AURA: ['#5a6472', '#2f9e77', '#a8862a', '#7c5cb0', '#2f6fce', '#22808a', '#a04ab0', '#c26a2e', '#5a6ac7', '#9a742e'],
  /** v10 境界特性：每个大境界的独有机制优势（按境界累积生效，效果散接于各系统钩子） */
  REALM_TRAITS: [
    { name: '胎息', desc: '打坐调息时气机自转，额外化解五点丹毒。' },
    { name: '灵压', desc: '金丹未成气先凝——战斗开场，灵压压制敌方一成攻防。' },
    { name: '金丹护体', desc: '金丹悬于气海：单次所受伤害超过三成气血上限时，减免两成。' },
    { name: '元婴代死', desc: '元婴藏于识海：每场战斗首次致命伤由元婴代受，保留两成五气血。' },
    { name: '神识', desc: '神游万里先知先觉：历练遇敌五成先手，陷阱伤害减半。' },
    { name: '合道', desc: '炼虚合道，百垢自消：丹毒消退加倍，丹毒上限 +20。' },
    { name: '法相', desc: '法相天地随行：普攻时两成几率引动法相，追加五成攻击的一击。' },
    { name: '万法归宗', desc: '大道阅尽，触类旁通：功法参悟所得感悟翻倍。' },
    { name: '劫体', desc: '半身已在雷海：天劫成算 +8%，渡劫失利保留九成修为。' },
    { name: '仙眷', desc: '仙人抚顶结发受长生：每日一签必得上签及以上。' },
  ],
  /** v10 职业道境：六道各自的六重境界（筑基/金丹/化神/合体/渡劫/真仙解锁），特性与职业完全匹配 */
  /* ---------- v16 职业道境（独立晋升体系） ----------
   * 道境不再随修为境界自动解锁——每重有专属【道境经验】阈值（need），
   * 由职业专属行为积累（战斗/炼丹/画符/受击/布阵/吞噬……），经验满即晋一重。
   * realm 字段仅作老档迁移折算参考，晋升判定不再使用。 */
  DAO_TIERS: {
    sword: { name: '剑心六境', expName: '剑意', expDesc: '出剑、会心、斩将皆可淬炼剑意。', tiers: [
      { realm: 1, need: 100,   name: '剑气境', desc: '出剑已含剑气：普攻一成五几率引剑气余韵，追加三成伤害。' },
      { realm: 2, need: 300,   name: '剑芒境', desc: '剑锋淬芒：普攻暴击伤害 +20%。' },
      { realm: 4, need: 800,   name: '剑心通明境', desc: '心镜无尘：【剑心通明】触发率提升至三成。' },
      { realm: 6, need: 2000,  name: '剑域境', desc: '剑气成域：战斗开场，剑域再削敌方一成攻防。' },
      { realm: 8, need: 5000,  name: '万剑归宗境', desc: '万剑随心动：法诀伤害 +25%。' },
      { realm: 9, need: 12000, name: '剑仙境', desc: '剑随心动，无迹可寻：普攻必中。' },
    ] },
    pill: { name: '丹道六境', expName: '丹火', expDesc: '开炉炼丹、服丹悟道皆可积攒丹火。', tiers: [
      { realm: 1, need: 100,   name: '闻香境', desc: '一嗅便知火候：炼丹成丹率 +10%。' },
      { realm: 2, need: 300,   name: '药理境', desc: '深谙药性：丹药出售价再加两成五。' },
      { realm: 4, need: 800,   name: '丹火境', desc: '丹火纯青：服丹所得丹毒减轻三成。' },
      { realm: 6, need: 2000,  name: '炉火纯青境', desc: '炉候通神：炼丹暴击率提升至一成五。' },
      { realm: 8, need: 5000,  name: '金丹境', desc: '掌中自有乾坤：丹药效果额外 +30%。' },
      { realm: 9, need: 12000, name: '太上境', desc: '太上丹诀：成丹率保底四成。' },
    ] },
    talisman: { name: '符道六境', expName: '符道', expDesc: '挥毫画符、祭符伤敌皆可积攒符道。', tiers: [
      { realm: 1, need: 100,   name: '描符境', desc: '笔下生熟：画符产量 +1。' },
      { realm: 2, need: 300,   name: '朱砂境', desc: '朱砂通灵：笔下生花（产量翻倍）几率提至两成。' },
      { realm: 4, need: 800,   name: '雷笔境', desc: '雷笔如龙：符箓伤害 +30%。' },
      { realm: 6, need: 2000,  name: '追雷境', desc: '符落雷随：祭符后三成几率引动追雷（两成攻击伤害）。' },
      { realm: 8, need: 5000,  name: '言出法随境', desc: '符由心生：战斗祭符三成五几率不消耗。' },
      { realm: 9, need: 12000, name: '符仙境', desc: '一笔开雷门：画符产量再 +2，紫雷符几率提至五成。' },
    ] },
    body: { name: '般若六境', expName: '体魄', expDesc: '受击、格挡、硬抗皆可淬炼体魄。', tiers: [
      { realm: 1, need: 100,   name: '铜皮境', desc: '皮糙肉厚：所受伤害 -8%。' },
      { realm: 2, need: 300,   name: '炼脏境', desc: '五脏如炉：气血上限 +10%。' },
      { realm: 4, need: 800,   name: '铁骨境', desc: '骨如琉璃：格挡率 +10%。' },
      { realm: 6, need: 2000,  name: '易筋境', desc: '筋长力沉：普攻伤害 +10%。' },
      { realm: 8, need: 5000,  name: '金刚境', desc: '金刚不坏：普攻附带两成吸血。' },
      { realm: 9, need: 12000, name: '不灭境', desc: '生生不息：战斗中每次行动回复 3% 气血。' },
    ] },
    array: { name: '阵道六境', expName: '阵道', expDesc: '布阵、探秘、修炼皆可积攒阵道。', tiers: [
      { realm: 1, need: 100,   name: '布阵境', desc: '阵旗在手：抢先布阵几率提至五成。' },
      { realm: 2, need: 300,   name: '聚灵境', desc: '阵中聚灵：修炼效率 +10%。' },
      { realm: 4, need: 800,   name: '困阵境', desc: '困龙锁天：布阵压制提至四成攻防。' },
      { realm: 6, need: 2000,  name: '迷踪境', desc: '阵影迷踪：战斗闪避 +8%。' },
      { realm: 8, need: 5000,  name: '杀阵境', desc: '杀阵先成：战斗开场两成几率直接困杀（压制四成攻防）。' },
      { realm: 9, need: 12000, name: '天罗境', desc: '天罗地网：杀阵几率提至三成五，布阵压制提至五成。' },
    ] },
    demonic: { name: '魔道六境', expName: '魔性', expDesc: '吞噬精元、杀戮、孽障缠身皆可积攒魔性。', tiers: [
      { realm: 1, need: 100,   name: '血煞境', desc: '吞噬更炽：击杀汲取修为提至三成。' },
      { realm: 2, need: 300,   name: '炼髓境', desc: '髓中藏煞：普攻附带一成吸血。' },
      { realm: 4, need: 800,   name: '化功境', desc: '化功大法：修炼速度额外 +20%。' },
      { realm: 6, need: 2000,  name: '慑魂境', desc: '魂为之慑：战斗开场，敌方暴击率减半。' },
      { realm: 8, need: 5000,  name: '魔君境', desc: '魔君之威：战斗胜利劫掠灵石 +50%。' },
      { realm: 9, need: 12000, name: '魔尊境', desc: '予取予求：战斗胜利两成几率夺其天材地宝。' },
    ] },

  },
  /** 渡劫失败异象文案 */
  REALM_FAIL_TEXT: [
    '劫雷轰顶，道基震裂。你呕血跌坐尘埃——仙门，又远了一步。',
    '九霄雷光尽数落在你身，你咬牙撑住，终究没能踏过那道门。',
    '天劫未过，道心受挫。雷云散尽时，你久久望着天空，不语。',
  ],

  /* ---------- 六道专属叙事（历练 / 战斗 / 突破 / 待人，皆随性情而异） ---------- */
  DAO_FLAVOR: {
    sword: {
      treasure: ['你懒得细看，一剑挑开箱盖，剑气不沾纤尘。', '你按剑环顾四野，确认无伏，才俯身开箱。'],
      fortune: ['你眸光一凝——此地灵机异动，藏不得拙。', '你一剑劈开雾障，机缘深处别有洞天。'],
      trap: ['禁制乍起，你拔剑后撤，剑光如水护住周身。', '你冷哼一声，一剑劈碎灵光，仍被余波扫中。'],
      attack: ['你一剑递出，简洁而致命', '你手腕一抖，剑尖直取要害', '你踏前半步，一剑刺出'],
      victory: ['剑归鞘，血未冷。你收势而立，如常事一桩。', '一剑了结。你拭去剑上血痕，转身便走。'],
      defeat: ['你被一脚踏翻，泥血满襟——此辱，剑替你记下了。', '剑折人伤。你咬牙撑地，眸中戾意更甚。'],
      tribSuccess: ['你负手立于劫风中央，一剑破开雷海，衣袂无伤。', '万雷加身，你以剑意硬撼，眉睫未动分毫。'],
      tribFail: ['雷光洞穿肩甲，你单膝砸地，剑拄尘土——未过。', '你吐血仰天，剑鸣如泣。仙门又远了一步。'],
      greet: '你按剑一礼，只字不多言',
      observe: ['你目光一扫，已将此人根底看了三分。', '你抱剑立于道旁，静观其变。'],
      dilemma: { help: '仗剑相助（气运↑，有所损耗）', rob: '剑抵其喉，夺其财货（孽障↑，有所进账）', ignore: '冷眼旁观（一身轻）' },
    },
    pill: {
      treasure: ['你先嗅了嗅箱缝里透出的药气，才不紧不慢地开箱。', '你拂去箱上尘土，口中喃喃估量着里头物件的价值。'],
      fortune: ['你驻足细感，此地灵机如丹火温养，正合打坐。', '你不急不缓，先辨清灵机脉络，再图造化。'],
      trap: ['禁制轰然而起，你旋即封住周身大穴，仍中了一着。', '你暗叫不妙，护体真元仓促凝聚，终究慢了半分。'],
      attack: ['你袖袍一拂，一缕掌力按出', '你不慌不忙，一掌拍出', '你屈指一弹，药劲激射'],
      victory: ['你收了余劲，自袖中摸出一枚丹药服下，平复气血。', '胜而不骄。你掸掸衣袖，只当炼了一味活药。'],
      defeat: ['你踉跄跌坐，先摸出的却是伤药——命要紧，脸面次之。', '你咳出一口血沫，苦笑：这一炉，火候终究差了。'],
      tribSuccess: ['你于雷火中安坐如炉，以身为鼎，将天劫炼作一味药引。', '丹火不熄，道心不乱。你迎着雷光，缓缓吐出一口浊气。'],
      tribFail: ['雷火入体如药力反冲，你盘膝压了三次，才将翻腾气血镇住。', '你默然调息良久，袖中双手仍在微颤——差之毫厘。'],
      greet: '你拱手温言，礼数周全',
      observe: ['你垂目养神，暗自揣度对方来意。', '你捻着袖中一粒丹丸，静静打量。'],
      dilemma: { help: '施药救人（气运↑，有所损耗）', rob: '取其钱袋抵药钱（孽障↑，有所进账）', ignore: '默默绕行（一身轻）' },
    },
    talisman: {
      treasure: ['你指尖符光微亮——箱上并无禁制封条，这才安心开启。', '你以朱砂在手心画了个探物诀，才伸手入箱。'],
      fortune: ['你掐指一算，此地机缘方位竟与卦象相合。', '你眉心微动，识海里符箓轻颤——有造化。'],
      trap: ['禁制暴起，你急掷一张护身符，符光碎而余威仍至。', '你暗骂一声拙笔——早该看出这禁制纹路的破绽。'],
      attack: ['你并指如笔，灵力成线激射', '你掷出一张符光，轰然炸开', '你指尖勾画，一道符罡破空'],
      victory: ['你俯身拾起符灰，吹了吹，收势自若。', '符光散尽。你捻碎残符，转身离去。'],
      defeat: ['符纸散落一地，如雪纷飞——你被逼到了绝地。', '背后符箓尽数燃尽，你狼狈滚出丈外。'],
      tribSuccess: ['你以周身为纸、雷光为墨，生生平掉了一场天劫。', '符罡层层亮起，你于雷海中央稳如泰山。'],
      tribFail: ['护身符尽数炸成飞灰，你口噙血沫，眼底朱砂犹亮。', '雷符燃到第三十七张，终于没能续上。'],
      greet: '你袖手一礼，指尖符光微闪',
      observe: ['你眼睫低垂，指尖已在袖中勾好符纹。', '你细细端详对方气机流转，如读一篇符文。'],
      dilemma: { help: '画符换钱相赠（气运↑，有所损耗）', rob: '符封其穴，取其财物（孽障↑，有所进账）', ignore: '袖手而去（一身轻）' },
    },
    body: {
      treasure: ['你一拳砸开箱盖，锁扣四溅——痛快。', '你蹲下身子，一把将储物箱整个掀翻。'],
      fortune: ['你鼻翼一动，嗅到极浓的灵气——好东西！', '你咧嘴一笑，加快脚步撞进雾里。'],
      trap: ['禁制炸开，你硬挨了一记，只当挠痒——仍见了血。', '你双臂护头硬冲过去，肩背火辣辣一片。'],
      attack: ['你一拳轰出，拳风猎猎', '你抡起蒲扇大掌拍落', '你身形前撞，肩如攻锤'],
      victory: ['你甩了甩拳上的血，只觉筋骨又畅快三分。', '打赢了，比什么都滋补。你咧嘴大笑。'],
      defeat: ['你仰面砸在地上，砸出个坑——半晌，骂骂咧咧爬起来。', '这一拳把你打醒了：光皮糙，还不够。'],
      tribSuccess: ['你张开双臂迎着天劫硬撼，雷火在皮膜上炸出金纹——痛快！', '万钧雷威当头砸落，你如山岳不动，硬生生扛了过去。'],
      tribFail: ['你被砸进地里三尺，爬出来时浑身是血，咬着牙不肯躺下。', '雷劲透体，你双膝深陷——骨头在响，道心没响。'],
      greet: '你抱拳如锤，声若洪钟',
      observe: ['你上下打量对方，鼻孔微微一哼。', '你活动了下手腕，斜眼瞧他。'],
      dilemma: { help: '一把背走伤者（气运↑，有所损耗）', rob: '一拳撂倒，抢了就跑（孽障↑，有所进账）', ignore: '扭头就走（一身轻）' },
    },
    array: {
      treasure: ['你踏罡步斗，绕箱三匝破了暗障，方才坦然取物。', '你指尖在虚空画了个探字阵，箱中之物纤毫毕现。'],
      fortune: ['此地灵机自成阵势——你眼里哪是机缘，分明是一座活阵。', '你以足尖在地上勾画片刻，笑意渐深：阵眼在此。'],
      trap: ['禁制是个残阵，你将错就错改了两笔阵纹，仍被反噬一缕。', '你布下三面小旗阻住杀机，衣角还是被燎去一片。'],
      attack: ['你袖中飞出阵纹，绞向对方', '你足踏罡步，引动地气冲撞', '你并指引阵，灵机如索缠至'],
      victory: ['你收起四面小旗，拂去袍上尘土，若无事发生。', '阵收人倒。你环顾四周，顺手把痕迹也抹了。'],
      defeat: ['阵脚被人硬生生踏碎，你气血翻涌，倒退七步。', '你苦笑——算尽天机，没算到自己挨这一下。'],
      tribSuccess: ['你以天地为盘、雷光为子，落下一枚活子——满盘皆活。', '九重劫阵尽数推演，你于生门之中缓步而出。'],
      tribFail: ['劫阵变化超出推演，你咳血按住紊乱气机——差一子。', '棋差一着。你望着劫云散处，眸光幽深。'],
      greet: '你掐指一礼，不语先笑',
      observe: ['你心中默推对方来路，七八分已了然。', '你蹲身在地上画了半刻阵图，才起身。'],
      dilemma: { help: '布阵护其周全（气运↑，有所损耗）', rob: '以困阵锁人取财（孽障↑，有所进账）', ignore: '转身离阵（一身轻）' },
    },
    demonic: {
      treasure: ['你一脚踹开箱子，笑声刺耳——天予不取，反受其咎！', '你掀开箱盖，指尖发烫：都是好东西。'],
      fortune: ['你嗅到灵机深处的血腥气——有人在这儿栽过跟头。妙。', '你舔了舔嘴唇，一头扎进这片造化里。'],
      trap: ['禁制咬住你半边身子，你非但不退，反而笑出了声。', '剧痛入骨，你眼底的戾气反倒烧得更旺。'],
      attack: ['你五指成爪，黑气缠绕抓落', '你怪笑着欺身而上', '你周身血气翻涌，一爪撕出'],
      victory: ['你舔去指尖的血，笑意乖张——还不够。', '你踏着对方的影子离开，哼着不成调的曲子。'],
      defeat: ['你趴在血泊里笑出了声——疼，才记得住。', '你抹了把脸上的血，眼底凶光更炽：这笔账，记下了。'],
      tribSuccess: ['你张开双臂拥抱雷劫，放声大笑——天道，也不过如此！', '雷霆淬邪躯，你于雷火中仰天长啸，声震四野。'],
      tribFail: ['你被雷光钉在地上，仍梗着脖子笑：来日，再来。', '邪躯焦黑，你以血补气，怨毒几乎凝成实质。'],
      greet: '你懒懒抬眼，笑意不达眼底',
      observe: ['你歪着头打量对方，像在打量一件货物。', '你指尖绕着一缕黑气，似笑非笑。'],
      dilemma: { help: '假意施恩，图个后报（气运↑，有所损耗）', rob: '乘乱夺宝，正合我意（孽障↑，有所进账）', ignore: '懒得理会（一身轻）' },
    },
  },
};

/* ======================================================================
 * §3 日志系统
 * ====================================================================== */
const Log = {
  el: null,
  entries: [],
  paused: false,     // v4：暂停自动滚动
  pinTimer: null,    // v4：金色置顶条计时器
  init() {
    this.el = document.getElementById('log');
    // v14：恢复上次折叠偏好（默认折叠，内容区主导）
    try {
      const open = Save.storage.getItem ? Save.storage.getItem('fanren_wd_logopen') : Save.mem['fanren_wd_logopen'];
      const wrap = document.getElementById('log-wrap');
      if (open === '1' && wrap) {
        wrap.classList.remove('collapsed');
        const btn = wrap.querySelector('.log-toggle');
        if (btn) btn.textContent = '收起';
      }
    } catch (e) { /* ignore */ }
  },
  /** text 支持 HTML；type: info/gain/loss/battle/system/realm/event/warn/crit */
  add(text, type = 'info') {
    if (!this.el) return;
    const p = Game.player;
    const year = p ? Math.floor(p.day / 365) + 1 : 1;
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    div.innerHTML = `<span class="t-time">第${year}年</span>${text}`;
    this.el.appendChild(div);
    this.entries.push(text);
    if (this.entries.length > 200) this.entries.splice(0, this.entries.length - 200);   // 限长：防长时游玩内存缓慢膨胀
    if (this.el.children.length > 160) this.el.removeChild(this.el.firstChild);
    if (!this.paused) this.el.scrollTop = this.el.scrollHeight;   // v4：暂停时不再强制吸底
    // v4：金色重要日志（突破/系统大事）置顶高亮 3 秒再混入普通日志
    if (type === 'realm' || type === 'system') this.showPin(text);
    // v14：折叠态提示新日志
    this.pokeBadge();
  },
  /** v4：金色日志置顶高亮 3 秒（悬浮于日志区顶部，不挤占布局） */
  showPin(html) {
    const wrap = document.getElementById('log-wrap');
    if (!wrap) return;
    let pin = document.getElementById('log-pin');
    if (!pin) {
      pin = document.createElement('div');
      pin.id = 'log-pin';
      wrap.appendChild(pin);
    }
    pin.innerHTML = `✦ ${html}`;
    pin.classList.remove('flash', 'out');
    void pin.offsetWidth;   // 重启动画
    pin.classList.add('flash');
    clearTimeout(this.pinTimer);
    this.pinTimer = setTimeout(() => pin.classList.add('out'), 3000);
  },
  /** v4：暂停/恢复自动滚动 */
  togglePause() {
    this.paused = !this.paused;
    const btn = document.getElementById('log-pause-btn');
    if (btn) {
      btn.textContent = this.paused ? '恢复滚动' : '暂停滚动';
      btn.classList.toggle('on', this.paused);
    }
    if (!this.paused && this.el) this.el.scrollTop = this.el.scrollHeight;
  },
  clear() { if (this.el) this.el.innerHTML = ''; this.entries = []; },
  /** v14：折叠 / 展开日志（折叠后内容区获得主导空间；有新日志时标题旁亮红点） */
  toggleCollapse() {
    const wrap = document.getElementById('log-wrap');
    if (!wrap) return;
    wrap.classList.toggle('collapsed');
    const collapsed = wrap.classList.contains('collapsed');
    const btn = wrap.querySelector('.log-toggle');
    if (btn) btn.textContent = collapsed ? '展开' : '收起';
    const badge = wrap.querySelector('.log-badge');
    if (badge) badge.style.display = 'none';
    if (!collapsed && this.el) this.el.scrollTop = this.el.scrollHeight;
    try {
      if (Save.storage.setItem) Save.storage.setItem('fanren_wd_logopen', collapsed ? '0' : '1');
      else Save.mem['fanren_wd_logopen'] = collapsed ? '0' : '1';
    } catch (e) { /* ignore */ }
  },
  /** v14：折叠态下有新日志 → 标题旁小红点提示 */
  pokeBadge() {
    const wrap = document.getElementById('log-wrap');
    if (!wrap || !wrap.classList.contains('collapsed')) return;
    const badge = wrap.querySelector('.log-badge');
    if (badge) badge.style.display = 'inline-block';
  },
};

/* ======================================================================
 * §4 存档系统（localStorage，3 存档位 + 1 自动存档）
 * ====================================================================== */
const Save = {
  KEY: 'fanren_wd_',
  storage: (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; } catch (e) { return {}; } })(),
  mem: {},
  read(key) {
    try {
      const raw = this.storage.getItem ? this.storage.getItem(this.KEY + key) : this.mem[key];
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
write(key, player) {
    const realmText = GameData.REALM_NAMES[player.realmIdx] + GameData.LAYER_NAMES[player.layer];
    const dao = player.dao ? GameData.DAO_CLASSES.find(d => d.id === player.dao) : null;
    const data = {
      v: 1,
      player,
      meta: {
        name: player.name, realmText, day: Math.floor(player.day),
        age: player.age, ts: Date.now(),
        dead: !!player.dead, ascended: !!player.flags.ascended,
        dao: dao ? dao.id : null,
      },
    };
    const raw = JSON.stringify(data);
    // v18：双写校验——先写临时键，验证可读回再写正式键
    try {
      const verifyKey = this.KEY + key + '_v';
      if (this.storage.setItem) {
        this.storage.setItem(verifyKey, raw);
        const verify = this.storage.getItem(verifyKey);
        if (verify === raw) {
          this.storage.setItem(this.KEY + key, raw);
          this.storage.removeItem(verifyKey);
        } else {
          console.warn('存档校验失败，重试写入');
          this.storage.setItem(this.KEY + key, raw);
        }
      } else {
        this.mem[key] = raw;
      }
    } catch (e) {
      console.warn('存档失败', e);
      UI.toast('存档写入异常，请检查存储空间', true);
    }
    UI.saveFlash();
  },
  remove(key) {
    try { this.storage.removeItem ? this.storage.removeItem(this.KEY + key) : delete this.mem[key]; } catch (e) { /* ignore */ }
  },
  /** 每次行动实时落盘（保持外部读取 localStorage 所见即所得）；
   *  force 参数保留兼容（关页 / 切后台等关键时机调用），当前策略下与常规写入一致。 */
  _lastAuto: 0,
  autoSave(force = false) {
    if (!Game.player || Game.player.dead) return;
    this._lastAuto = Date.now();
    this.write('auto', Game.player);
  },
};

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
      story: { seen: {}, mid: {}, choices: {} },   // v15 剧情播放记录 / 中段标记 / 抉择
      daoExp: {},   // v16 职业道境经验（六大职业独立积累，不随修为境界绑定）
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
        out.daoExp = { sword: 0, pill: 0, talisman: 0, body: 0, array: 0, demonic: 0 };
        const srcDaoExp = (out.daoExp && typeof out.daoExp === 'object') ? out.daoExp : null;
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
    ];
    // 基础：fresh 模板 + 展开合并
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

/* ======================================================================
 * §6 属性计算（功法 / 法宝 / 宗门 加成汇总）
 * ====================================================================== */
const Stat = {
  /** 汇总已学功法的加成 */
  gongfaBonus(p) {
    const total = {};
    for (const [id, g] of Object.entries(p.gongfa)) {
      const def = GameData.ITEMS[id];
      if (!def || !def.bonus) continue;
      for (const [k, [base, per]] of Object.entries(def.bonus)) {
        total[k] = (total[k] || 0) + base + per * (g.level - 1);
      }
    }
    return total;
  },
  /** 汇总已穿戴法宝的加成（v13：数值属性受强化等级 +10%/级 加成；套装加成并入） */
  equipBonus(p) {
    const total = {};
    // v18: 装备槽位存 {id, enhance}，使用 Utils.eqId 兼容
    for (const slotId of Object.values(p.equipped)) {
      const id = Utils.eqId(slotId);
      if (!id) continue;
      const def = GameData.ITEMS[id];
      if (!def || !def.bonus) continue;
      const enhLv = (typeof ForgeSys !== 'undefined' && ForgeSys.lvOf) ? ForgeSys.lvOf(p, slotId) : 0;
      const enhMul = 1 + enhLv * 0.1;
      for (const [k, v] of Object.entries(def.bonus)) {
        const flat = k === 'atk' || k === 'def' || k === 'hp' || k === 'mp' || k === 'spd';
        total[k] = (total[k] || 0) + (flat ? v * enhMul : v);
      }
    }
    // v13 套装加成
    if (typeof ForgeSys !== 'undefined' && ForgeSys.setBonus) {
      for (const [k, v] of Object.entries(ForgeSys.setBonus(p))) total[k] = (total[k] || 0) + v;
    }
    return total;
  },
  sectBonus(p) {
    if (!p.sect) return {};
    const sect = GameData.SECTS.find(s => s.id === p.sect.id);
    return sect ? sect.bonus : {};
  },
  /** 有效悟性：转世传承 +10%／层，圣地讲道限时翻倍（§26 / §23） */
  compOf(p) {
    let c = (p.attrs && p.attrs.comp) || 5;
    if (p.reinc && p.reinc.compPct) c *= 1 + p.reinc.compPct / 100;
    const w = p.world;
    if (w && w.preachUntil) {
      const y = Math.floor((p.day || 0) / 365) + 1;
      if (y <= w.preachUntil) c *= 2;
    }
    return c;
  },
  compute(p) {
    const rp = p.realmIdx * 4 + p.layer;
    const gf = this.gongfaBonus(p);
    const eq = this.equipBonus(p);
    const sb = this.sectBonus(p);
    const dao = DaoSys.bonus(p);            // §19 大道职业加成
    // v13 灵兽被动 / 洞府聚灵阵加成
    const beastPass = (typeof BeastSys !== 'undefined' && BeastSys.passive) ? BeastSys.passive(p) : {};
    const caveCult = (typeof CaveSys !== 'undefined' && CaveSys.cultBonus) ? CaveSys.cultBonus(p) : 0;
    const rootPct = p.rootDeep ? 20 : 0;    // §22 根基深厚：全属性 +20%
    const lossPct = Math.min(50, p.statLossPct || 0); // §20 斩三尸：全属性永久折损（上限50%）
    const marks = p.reinc ? (p.reinc.marks || 0) : 0; // §26 轮回印记：每枚 +1% 全属性
    const A = p.attrs;
    const compEff = this.compOf(p);
    const finalScale = (1 + rootPct / 100) * (1 - lossPct / 100) * (1 + marks * 0.01)
      * ((typeof RankSys !== 'undefined' && RankSys.isTop && RankSys.isTop(p)) ? 1.02 : 1);   // v13 天下第一：全属性 +2%

    const maxHp = Math.round((90 + A.body * 15 + Math.pow(rp, 1.6) * 6 + (eq.hp || 0))
      * (1 + ((gf.hpPct || 0) + (eq.hpPct || 0) + (dao.hpPct || 0) + (beastPass.hpPct || 0)) / 100) * finalScale);
    const maxMp = Math.round((40 + compEff * 8 + rp * 4 + (eq.mp || 0))
      * (1 + ((gf.mpPct || 0) + (dao.mpPct || 0)) / 100) * finalScale);
    const atk = Math.round((8 + A.gen * 2 + rp * 3 + (eq.atk || 0))
      * (1 + ((gf.atkPct || 0) + (eq.atkPct || 0) + (sb.atkPct || 0) + (dao.atkPct || 0) + (beastPass.atkPct || 0)) / 100) * finalScale);
    const def = Math.round((4 + A.body * 1.2 + rp * 1.8 + (eq.def || 0))
      * (1 + ((gf.defPct || 0) + (eq.defPct || 0) + (dao.defPct || 0)) / 100) * finalScale);
    const speed = Math.round((8 + (A.gen + A.body) / 2 + rp * 0.8 + (eq.spd || 0))
      * (1 + (gf.spdPct || 0) / 100) * finalScale);
    return {
      maxHp, maxMp, atk, def, speed,
      crit: Utils.clamp(5 + (A.luck + (eq.luck || 0)) * 0.6 + (gf.crit || 0) + (eq.crit || 0) + (beastPass.crit || 0), 0, 75),
      dodge: Utils.clamp((gf.dodge || 0) + (eq.dodge || 0) + (sb.dodge || 0) + (beastPass.dodge || 0) + (p.dao === 'array' && DaoSys.tierLevel(p) >= 4 ? 8 : 0), 0, 35),   // v10 阵道六境·迷踪境 · v13 宗门/灵兽
      block: Utils.clamp(8 + (gf.block || 0) + (p.dao === 'body' && DaoSys.tierLevel(p) >= 3 ? 10 : 0), 0, 60),   // v10 般若六境·铁骨境
      cultPct: (gf.cult || 0) + (eq.cult || 0) + (sb.cult || 0) + caveCult + (beastPass.cult || 0),
      stonePct: (sb.stonePct || 0) + (eq.stonePct || 0),
      luck: A.luck + (eq.luck || 0),
      pillPct: sb.pillPct || 0,
      poisonReduce: sb.poisonReduce || 0,
      shopDiscount: sb.shopDiscount || 0,
      lifespan: GameData.LIFESPAN[p.realmIdx],
    };
  },
  /** 防御减伤后的伤害期望值 */
  /** 防御减伤后的伤害期望值 */
  afterDef(atk, def) { return atk * (1 - def / (def + (GameData.BALANCE.COMBAT.AFTER_DEF_DENOM || 140))); },
};

/* ======================================================================
 * §7 时间系统
 * ====================================================================== */
const Time = {
  MONTHS: ['孟春', '仲春', '季春', '孟夏', '仲夏', '季夏', '孟秋', '仲秋', '季秋', '孟冬', '仲冬', '季冬'],
  add(days) {
    const p = Game.player;
    if (!p || p.dead) return;
    const prevYear = Math.floor(p.day / 365);
    p.day += days;
    NpcSys.wander(p, days);   // v5：岁月流逝，常驻修士偶改游历之地
    // v10 境界特性 · 合道（炼虚起）：丹毒消退加倍
    p.poison = Math.max(0, p.poison - (p.realmIdx >= 5 ? 0.7 : 0.35) * days);
    const newYear = Math.floor(p.day / 365);
    if (newYear > prevYear) {
      p.age = 16 + newYear;
      // §23/§24 世界随年推进：NPC 修炼成长 + 百年大事件
      for (let y0 = prevYear + 1; y0 <= newYear; y0++) WorldSys.onYear(p, y0 + 1);
      const st = Stat.compute(p);
      Log.add(`又是一年春秋，你如今 <b>${p.age}</b> 岁。`, 'system');
      if (p.age > st.lifespan * 0.9) Log.add('你隐隐感到体内生机流逝，寿元无多了……', 'warn');
      if (p.age > st.lifespan) { Game.gameOver('寿元'); return; }
    }
  },
  label(p) {
    const year = Math.floor(p.day / 365) + 1;
    const month = this.MONTHS[Math.min(11, Math.floor((p.day % 365) / 30))];
    return `第${year}年 · ${month}`;
  },
  /* ---------- v5：更细的游戏内时间 ---------- */
  /** 每月第几日的古风称谓（初一~三十） */
  dayName(n) {
    const N = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    if (n <= 10) return '初' + N[n - 1];
    if (n < 20) return '十' + N[n - 11];
    if (n === 20) return '二十';
    if (n < 30) return '廿' + N[n - 21];
    return '三十';
  },
  /** 年 / 月 / 日全显（顶栏用） */
  labelLong(p) {
    const year = Math.floor(p.day / 365) + 1;
    const doy = Math.floor(p.day % 365);
    const month = this.MONTHS[Math.min(11, Math.floor(doy / 30))];
    return `第${year}年 · ${month}${this.dayName(Math.floor(doy % 30) + 1)}`;
  },
  /** 旬（上/中/下旬）：NPC 行游轮换与坊市市况的时间刻度 */
  xunLabel(p) {
    const doy = Math.floor(p.day % 365);
    const month = this.MONTHS[Math.min(11, Math.floor(doy / 30))];
    const xun = ['上旬', '中旬', '下旬'][Math.min(2, Math.floor((doy % 30) / 10))];
    return `${month}·${xun}`;
  },
};

/* ======================================================================
 * §8 修炼系统（普通修炼 / 调息 / 闭关 / 突破 / 飞升）
 * ====================================================================== */
const Cultivate = {
  /** 一次普通修炼的基础修为（3 日）；邪修吞噬灵气，效率+80%；悟性取有效值（转世/讲道加成） */
  baseGain(p) {
    let g = (12 + Stat.compOf(p) * 2) * GameData.eco(p.realmIdx) * (1 + p.layer * 0.15);
    if (p.dao === 'demonic') g *= 1.8;
    if (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 3) g *= 1.2;   // v10 魔道六境·化功境
    if (p.dao === 'array' && DaoSys.tierLevel(p) >= 2) g *= 1.1;   // v10 阵道六境·聚灵境
    return g;
  },
  gainMult() {
    return (1 + Stat.compute(Game.player).cultPct / 100) * Utils.randF(0.9, 1.15);
  },
  /** 增加修为并处理境界内进层；返回是否发生过进层 */
  addExp(p, amount, silent = false) {
    let leveled = false;
    p.exp += amount;
    SectSys.onCultivate(amount);
    while (p.layer < 3) {
      const need = GameData.layerNeed(p.realmIdx, p.layer);
      if (p.exp < need) break;
      p.exp -= need;
      p.layer++;
      leveled = true;
      if (!silent) {
        Log.add(`水到渠成！你的修为迈入 <b>${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}</b>！`, 'realm');
        UI.announce(`突 境 · ${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}`, 'gold');   // v4
      }
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
    }
    if (p.layer === 3) {
      const need = GameData.layerNeed(p.realmIdx, 3);
      // v18：溢出修为保留，突破后自动计入
      if (p.exp > need) {
        p.expOverflow = (p.expOverflow || 0) + (p.exp - need);
        p.exp = need;
      }
    }
    return leveled;
  },
  normal() {
    const p = Game.player;
    let gain = Math.round(this.baseGain(p) * this.gainMult());
    let evNote = '';
    // v8 灵机事件：修炼偶发机缘/心魔，打破千篇一律（8% 触发）
    if (Utils.chance(8)) {
      const kind = Utils.pickWeighted({ surge: 35, epiphany: 25, heartDemon: 25, glean: 15 });
      if (kind === 'surge') {
        gain = Math.round(gain * 2.5);
        Log.add('【灵机】行功之际，灵气忽如潮涌而来，天地之力尽数灌入丹田！', 'realm');
        evNote = '（灵气潮涌 · 修为 ×2.5）';
      } else if (kind === 'epiphany') {
        gain = Math.round(gain * 1.5);
        p.insight = Math.min(100, p.insight + 3);
        Log.add('【灵机】吐纳之间忽有所悟，此番修行事半功倍。（突破感悟 +3）', 'gain');
        evNote = '（醍醐灌顶 · 修为 ×1.5）';
      } else if (kind === 'heartDemon') {
        gain = Math.max(1, Math.round(gain * 0.55));
        p.insight = Math.min(100, p.insight + 6);
        Log.add('【心魔】识海中魔音滋扰，你苦守灵台方寸——虽折了些修为，道心却愈发澄明。（突破感悟 +6）', 'warn');
        evNote = '（心魔滋扰 · 修为折损）';
      } else {
        const stones = Math.round(Utils.rand(12, 24) * GameData.stoneEco(p.realmIdx));
        Bag.addStones(stones);
        Log.add(`【拾遗】收功之时袖中沙沙作响——竟是行功震落的灵石碎屑。灵石 +${Utils.fmtNum(stones)}。`, 'gain');
      }
    }
    this.addExp(p, gain);
    Time.add(3);
    if (p.dead) return;
    if (p.dao === 'array') DaoSys.gain(p, 1);   // v16 阵道：聚灵
    if (p.dao === 'demonic') DaoSys.gain(p, 2);   // v16 魔性：化功
    p.hp = Math.min(Stat.compute(p).maxHp, Math.round(p.hp + Stat.compute(p).maxHp * 0.08));
    Log.add(`${Utils.pick(GameData.FLAVOR.cultivate)}（修为 <b>+${Utils.fmtNum(gain)}</b>）${evNote}`, 'info');
    Game.afterAction();
  },
  rest() {
    const p = Game.player;
    const st = Stat.compute(p);
    p.hp = Math.min(st.maxHp, p.hp + Math.round(st.maxHp * 0.5));
    p.mp = Math.min(st.maxMp, p.mp + Math.round(st.maxMp * 0.5));
    // v10 境界特性 · 胎息（练气）：调息时气机自转，额外化解丹毒
    const detox = p.realmIdx >= 0 ? 5 : 0;
    if (detox) p.poison = Math.max(0, p.poison - detox);
    Time.add(1);
    if (p.dead) return;
    if (p.dao === 'body') DaoSys.gain(p, 10);   // v16 体魄：吐纳炼体
    Log.add(`你寻一处灵气充裕之地打坐调息，气血灵力恢复大半${detox ? `，气机流转间化解了 ${detox} 点丹毒` : ''}。`, 'gain');
    Game.afterAction();
  },
  secludeCost(p) { return Math.round(30 * GameData.stoneEco(p.realmIdx)); },
  async seclude() {
    const p = Game.player;
    const cost = this.secludeCost(p);
    const ok = await UI.popup({
      title: '闭关修炼',
      html: `闭关三十日，心无旁骛，修行效率远胜平日。<br>
        预计可得修为 <span class="hl">≈${Utils.fmtNum(Math.round(this.baseGain(p) * 10 * 1.6))}</span>（视悟性略有浮动）。<br>
        需支付洞府灵石开销 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石／轮。<br>
        <span class="neg">若修为已至圆满，闭关中会自行冲关。</span>
        <label class="opt-line"><input type="checkbox" id="seclude-until-level">
          连续闭关 · 至下一小境界自动出关</label>`,
      options: [
        { text: '闭 关', value: true, primary: true },
        { text: '再想想', value: false },
      ],
    });
    if (!ok) return;
    // v4：勾选后进入连续闭关，进阶即止；未勾选保持原有单轮闭关
    const cb = document.getElementById('seclude-until-level');
    if (cb && cb.checked) { await this.secludeLoop(); return; }
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足，付不起洞府开销'); return; }
    const gain = Math.round(this.baseGain(p) * 10 * 1.6 * this.gainMult());
    if (p.dao === 'array') DaoSys.gain(p, 10);   // v16 阵道：聚灵
    if (p.dao === 'demonic') DaoSys.gain(p, 20);   // v16 魔性：化功
    Log.add(`${Utils.pick(GameData.FLAVOR.seclude)}（修为 <b>+${Utils.fmtNum(gain)}</b>，丹毒稍减）`, 'info');
    this.addExp(p, gain);
    p.poison = Math.max(0, p.poison - 12);
    Time.add(30);
    if (p.dead) return;
    if (p.layer === 3 && p.exp >= GameData.layerNeed(p.realmIdx, 3)) {
      await Utils.sleep(400);
      await this.breakthrough(10);
    }
    Game.afterAction();
  },
  /** v4：连续闭关——每轮三十日，修为迈进新的小境界（进层或大境界突破成功）即自动出关；
   *  灵石不济、寿元将尽或达成上限轮数时亦会中止。 */
  async secludeLoop() {
    let p = Game.player;
    Log.add('你拂尘入室，立誓非至进境，不出此关。', 'system');
    let rounds = 0;
    while (rounds++ < 120) {
      if (!p || p.dead || Game.player !== p) return;   // 兵解/回溯等更换玩家对象时，旧循环立即作废
      const beforeLayer = p.layer, beforeRealm = p.realmIdx;
      const cost = this.secludeCost(p);
      if (!Bag.spendStones(cost)) {
        UI.toast('灵石不济，闭关被迫中止');
        Log.add('洞府灵石开销难以为继，你只得提前出关。', 'warn');
        break;
      }
      const gain = Math.round(this.baseGain(p) * 10 * 1.6 * this.gainMult());
      if (p.dao === 'array') DaoSys.gain(p, 10);   // v16 阵道：聚灵
      if (p.dao === 'demonic') DaoSys.gain(p, 20);   // v16 魔性：化功
      Log.add(`${Utils.pick(GameData.FLAVOR.seclude)}（第${rounds}轮 · 修为 <b>+${Utils.fmtNum(gain)}</b>，丹毒稍减）`, 'info');
      this.addExp(p, gain);
      p.poison = Math.max(0, p.poison - 12);
      Time.add(30);
      if (p.dead || Game.player !== p) return;
      Game.afterAction();
      // 圆满冲关（与单轮闭关同款逻辑）：天劫博弈中胜出即境界跃升
      if (p.layer === 3 && p.exp >= GameData.layerNeed(p.realmIdx, 3)) {
        await Utils.sleep(400);
        await this.breakthrough(10);
        if (!p || p.dead || Game.player !== p) return;
      }
      // 已至下一小境界 → 自动出关
      if (p.layer !== beforeLayer || p.realmIdx !== beforeRealm) {
        Log.add('修为已然进阶，你推门而出，只觉天地一新——此番闭关，功成。', 'system');
        UI.toast('闭关有成 · 已至新的小境界');
        break;
      }
      await Utils.sleep(120);   // 留出渲染与日志滚动的时间
    }
    Game.afterAction();
  },
  /** 突破成算（大境界渡劫基准）：感悟/悟性/气运/孽障/大道/根基/挫而愈坚 皆计入 */
  breakthroughChance(p, bonus = 0) {
    let chance = 40 + Stat.compOf(p) * 2 + p.insight + bonus;
    chance += (p.fortune || 0) * 0.2;   // 气运：每10点 +2%
    chance -= (p.karma || 0) * 0.2;     // 孽障：每10点 -2%
    chance += Math.min(15, (p.breakStreak || 0) * 5);   // v8 挫而愈坚：连败保底，每次失利 +5%（上限 +15%）
    if (p.realmIdx >= 8) chance += 8;   // v10 境界特性 · 劫体（渡劫）：半身已在雷海
    if (p.dao === 'sword') chance *= 0.77;  // 剑心桀骜：渡劫难度+30%
    if (p.dao === 'body') chance *= 1.4;    // 金刚不坏：渡劫成算+40%
    if (p.rootDeep) chance *= 1.1;          // 根基深厚：历劫难度-10%
    if (p.rootWeak) chance *= 0.85;         // 根基虚浮：历劫难度+15%
    return Utils.clamp(chance, 5, 95);
  },
  /** 大境界突破：练气→筑基为静修冲关（无天劫）；金丹劫起进入天劫三策博弈（小境界进层仍在 addExp 中自动结算） */
  async breakthrough(bonus = 0) {
    const p = Game.player;
    if (p.layer !== 3 || p.exp < GameData.layerNeed(p.realmIdx, 3)) return;
    if (p.realmIdx >= 9) return;
    if (p.realmIdx + 1 < GameData.TRIB_START) {
      await this.quietBreakthrough(bonus);
      return;
    }
    await Tribulation.run(bonus);
  },

  /** v9 筑基瓶颈：练气圆满冲筑基，水到渠成的静修冲关——无天劫，成算另 +15%，
   *  失利同样保留修为与感悟，并计入挫而愈坚。 */
  async quietBreakthrough(bonus = 0) {
    const p = Game.player;
    const chance = Utils.clamp(this.breakthroughChance(p, bonus + 15), 5, 95);
    Log.add('你收敛心神，向 <b>筑基</b> 瓶颈发起最后的冲击——气海翻涌，道基将成！', 'system');
    await Utils.sleep(700);
    if (Utils.chance(chance)) {
      p.realmIdx = 1; p.layer = 0; p.exp = Math.min(Math.floor((p.expOverflow || 0) / 2), GameData.layerNeed(1, 0) - 1); p.insight = 0; p.expOverflow = 0;
      p.breakStreak = 0;
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      NpcSys.onPlayerRealmUp(p);
      const tsLine = Narrative.tribSuccess();
      if (tsLine) Log.add(tsLine, 'realm');
      UI.realmShow(GameData.REALM_ASCEND_TEXT[1] || '道基初成，气象一新。', GameData.REALM_AURA[1]);
      Ambience.sfx('breakthrough');
      Log.add(`${Utils.pick(GameData.FLAVOR.breakSuccess)}`, 'realm');
      Log.add(`恭喜！你静修冲关功成，晋入 <b>筑基</b> 期——从此踏入修士之列！寿元上限提升至 ${st.lifespan} 岁。`, 'realm');
      UI.announce('筑基功成 · 步入修士之列', 'gold');
      UI.toast('筑基成功！');
    } else {
      const aid = NpcSys.tryAid(p, 'trib');
      let insGain;
      if (aid) {
        p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * 0.8);
        insGain = 10;
        p.insight = Math.min(100, p.insight + insGain);
        Log.add(`危难之际，<b>${aid.name}</b> 从旁点拨，你稳住气机——冲击虽败，根基无损！`, 'gain');
      } else {
        p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * 0.6);
        insGain = 15;
        p.insight = Math.min(100, p.insight + insGain);
      }
      p.breakStreak = (p.breakStreak || 0) + 1;
      const streakBonus = Math.min(15, p.breakStreak * 5);
      UI.realmShow(Utils.pick(GameData.REALM_FAIL_TEXT), '#d05b5b');
      Log.add(`${Utils.pick(GameData.FLAVOR.breakFail)}（突破感悟 +${insGain}，修为有所损耗）`, 'loss');
      UI.announce('冲 关 未 破', 'bad');
      if (p.breakStreak >= 2) Log.add(`【挫而愈坚】你已连败 ${p.breakStreak} 次——下次冲关成算 +${streakBonus}%！`, 'gain');
    }
    p.pendingDao = true;   // 初入筑基叩问大道（失败则待来日功成再启）
    Game.afterAction();
  },
  /** 真仙圆满 → 渡劫飞升（通关仪式） */
  async ascend() {
    const p = Game.player;
    if (p.realmIdx !== 9 || p.layer !== 3 || p.flags.ascended) return;
    const ok = await UI.popup({
      title: '渡劫飞升',
      html: '九霄雷云汇聚，仙门已现。<br>你修为已至真仙圆满，只差最后一步——<br><span class="hl">引动天劫，白日飞升，位列仙班！</span><br><br>此去灵界，人界之事再与你无碍。',
      options: [
        { text: '引动天劫！', value: true, primary: true },
        { text: '再等等', value: false },
      ],
    });
    if (!ok) return;
    Log.add('你一步踏空，直上九霄！九重雷劫轰然而落，你于雷海之中放声长啸——', 'realm');
    await Utils.sleep(700);
    Log.add('雷劫散尽，霞光万道。你身披仙光，回望人界一眼，翩然登仙。', 'realm');
    await Utils.sleep(500);
    p.flags.ascended = true;
    UI.realmShow('霞举飞升，肉身成圣——凡人之躯，终成不朽。', GameData.REALM_AURA[9]);   // v5
    UI.announce('✦ 白日飞升 · 位列仙班 ✦', 'gold');   // v4
    Ambience.sfx('breakthrough');
    Bag.addItem('z_taiji', 1);
    Bag.addStones(Math.round(5000 * GameData.stoneEco(9)));
    Log.add('天道降下仙缘：获赠【太极玉】与巨额灵石！你已飞升证道，仍可留在人界继续游历。', 'gain');
    await UI.popup({
      title: '✦ 位列仙班 ✦',
      html: `恭喜道友 <span class="hl">${Utils.esc(p.name)}</span> 白日飞升，证道成仙！<br><br>凡人之躯，逆天而行，此为大道之始。`,
      options: [{ text: '继续游历', value: true, primary: true }],
    });
    Game.afterAction();
  },
};

/* ======================================================================
 * §9 功法系统（学习 / 参悟升级）
 * ====================================================================== */
const GongfaSys = {
  maxLevel(def) { return 5 + def.grade; },
  /** 升到下一级所需功法感悟 */
  needExp(def, level) { return Math.round(60 * Math.pow(1.9, level) * (def.grade + 1)); },
  learn(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    if (!def || def.type !== 'gongfa' || p.gongfa[itemId]) return;
    if (!DaoSys.canLearnGongfa(p, def)) return; // 体修难悟高阶法诀
    Bag.removeItem(itemId, 1);
    p.gongfa[itemId] = { level: 1, exp: 0 };
    p.counters.learns = (p.counters.learns || 0) + 1;   // v11 剧情计数
    Log.add(`你翻开典籍，依法修行，成功入门 <b class="grade-${def.grade}">${def.name}</b>！`, 'gain');
    Game.afterAction();
  },
  study(gfId) {
    const p = Game.player;
    const g = p.gongfa[gfId];
    const def = GameData.ITEMS[gfId];
    if (!g || !def) return;
    if (g.level >= this.maxLevel(def)) { UI.toast('此功法已修至大成'); return; }
    let gain = 18 + p.attrs.comp * 4 + Utils.rand(0, 12);
    if (p.realmIdx >= 7) gain *= 2;   // v10 境界特性 · 万法归宗（大乘）：参悟所得翻倍
    g.exp += gain;
    if (p.dao) DaoSys.gain(p, def.daoLimit === p.dao ? 20 : 8);   // v16 道境经验：参悟
    Time.add(5);
    if (p.dead) return;
    let up = false;
    while (g.level < this.maxLevel(def) && g.exp >= this.needExp(def, g.level)) {
      g.exp -= this.needExp(def, g.level);
      g.level++;
      up = true;
    }
    if (up) {
      Log.add(`你反复参悟，<b class="grade-${def.grade}">${def.name}</b> 修至 <b>第${g.level}层</b>！`, 'gain');
    } else {
      Log.add(`你潜心参悟 ${def.name}，略有所得。（功法感悟 +${gain}）`, 'info');
    }
    Game.afterAction();
  },
};

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
  equip(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    if (!def || def.type !== 'artifact' || !this.count(itemId)) return;
    this.removeItem(itemId, 1);
    const slot = def.slot;
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
      Log.add(`你服下 <b>${def.name}</b>（${effectText.join('，')}），然而丹毒冲破上限，药力反噬，根基受损！`, 'warn');
      Log.add(`气血翻涌，当前层修为 -${Utils.fmtNum(lost)}。切记丹毒将满时莫要强行服丹！`, 'loss');
    } else {
      p.poison += poisonGain;
      Log.add(`你服下 <b>${def.name}</b>（${effectText.join('，')}${def.poison ? `，丹毒 +${poisonGain.toFixed(0)}` : ''}）。`, 'gain');
    }
    if (!inBattle) Time.add(1);
  },
};

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

/* ======================================================================
 * §11.6 v13 洞府经营 CaveSys（聚灵阵 / 灵田种植 / 兽栏）
 * 筑基解锁「洞府」页签：洞府每升一级，修炼效率 +4%、灵田 +1 块（上限 8）、兽栏 +1 位。
 * 灵田：播种（种子=type:'seed'）→ 按游戏日生长 → 成熟收获；过熟 20 日后收获减半。
 * ====================================================================== */
const CaveSys = {
  MAX_LV: 5,
  freshCave() { return { lv: 1, plots: [null, null, null, null] }; },
  unlockText: '洞府 · 筑基期解锁',
  unlocked(p) { return p.realmIdx >= 1; },
  plotsOf(p) {
    if (!p.cave) p.cave = this.freshCave();
    return p.cave.plots;
  },
  plotCount(p) { return Math.min(8, 4 + (p.cave ? p.cave.lv - 1 : 0)); },
  /** 洞府加成（Stat.compute 调用）：修炼效率 +4%/级 */
  cultBonus(p) { return p.cave ? p.cave.lv * 4 : 0; },
  upCost(p) {
    const lv = p.cave ? p.cave.lv : 1;
    return {
      stones: Math.round(2000 * Math.pow(3, lv - 1) * Math.pow(2.2, Math.max(0, p.realmIdx - 1))),
      mats: lv === 1 ? null : { m_xuantie: 2 + lv, m_lingzhi: lv >= 3 ? 2 : 1 },
    };
  },
  async upgrade() {
    const p = Game.player;
    if (!this.unlocked(p)) { UI.toast('须至筑基期方可开辟洞府'); return; }
    if (!p.cave) p.cave = this.freshCave();
    if (p.cave.lv >= this.MAX_LV) { UI.toast('洞府已至五层，聚灵之极'); return; }
    const c = this.upCost(p);
    const matsTxt = c.mats ? Object.entries(c.mats).map(([id, n]) => `${GameData.ITEMS[id].name} ×${n}`).join('、') : '';
    const ok = await UI.popup({
      title: `扩 建 洞 府（${p.cave.lv} → ${p.cave.lv + 1} 层）`,
      html: `扩建洞府，聚灵阵随之精进：<br>
        · 修炼效率 <b class="hl">+4%</b>（现 +${p.cave.lv * 4}%）<br>
        · 灵田扩至 <b class="hl">${Math.min(8, 4 + p.cave.lv)} 块</b><br>
        · 兽栏扩至 <b class="hl">${4 + p.cave.lv + 1} 位</b><br>
        需灵石 <span class="hl">${Utils.fmtNum(c.stones)}</span>${matsTxt ? `、${matsTxt}` : ''}。`,
      options: [{ text: '扩 建', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(c.stones)) { UI.toast('灵石不足'); return; }
    if (c.mats) {
      for (const [id, n] of Object.entries(c.mats)) {
        if (Bag.count(id) < n) { UI.toast(`${GameData.ITEMS[id].name}不足`); return; }
      }
      for (const [id, n] of Object.entries(c.mats)) Bag.removeItem(id, n);
    }
    p.cave.lv++;
    Log.add(`你斥重金扩建洞府——聚灵阵嗡鸣不止，灵气如今浓缩如雾：修炼效率 +${p.cave.lv * 4}%，灵田 ${this.plotCount(p)} 块。`, 'system');
    UI.announce(`✦ 洞府扩建 · ${p.cave.lv} 层`, 'gold');
    Game.afterAction();
  },
  /** 播种 */
  async plant(idx) {
    const p = Game.player;
    const plots = this.plotsOf(p);
    if (idx >= this.plotCount(p)) { UI.toast('此田尚未开垦（扩建洞府可增田）'); return; }
    if (plots[idx]) { UI.toast('此田已有作物'); return; }
    const seeds = Object.keys(p.bag).filter(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'seed');
    if (!seeds.length) { UI.toast('囊中没有种子——坊市杂货区有售'); return; }
    const opts = seeds.map(id => ({ text: `${GameData.ITEMS[id].name}（${GameData.ITEMS[id].days}日熟）`, value: id }));
    opts.push({ text: '取消', value: null });
    const seedId = await UI.popup({
      title: `播种 · 第 ${idx + 1} 田`,
      html: '择一种子播入灵田。作物按游戏日生长，离线亦在生长；成熟后请及时采收，过熟廿日则减半收成。',
      options: opts,
    });
    if (!seedId) return;
    Bag.removeItem(seedId, 1);
    const sd = GameData.ITEMS[seedId];
    plots[idx] = { seed: seedId, crop: sd.crop, days: sd.days, plantedDay: Math.floor(p.day) };
    Log.add(`你在第 ${idx + 1} 田播下了【${sd.name}】，${sd.days} 日后可收。`, 'info');
    Game.afterAction();
  },
  /** 收获：进度按当前游戏日结算；过熟 20+ 日减半 */
  harvest(idx) {
    const p = Game.player;
    const plots = this.plotsOf(p);
    const plot = plots[idx];
    if (!plot) return;
    const grown = Math.floor(p.day) - plot.plantedDay;
    if (grown < plot.days) { UI.toast(`尚未成熟（还差 ${plot.days - grown} 日）`); return; }
    const over = grown - plot.days;
    let qty = 2;
    if (over >= 20) qty = 1;
    Bag.addItem(plot.crop, qty);
    Log.add(`第 ${idx + 1} 田的【${GameData.ITEMS[plot.crop].name}】熟了——收获 ×${qty}${over >= 20 ? '（过熟日久，收成折半）' : ''}。`, 'gain');
    plots[idx] = null;
    Game.afterAction();
  },
  renderPlots(p) {
    const plots = this.plotsOf(p);
    const n = this.plotCount(p);
    const rows = [];
    for (let i = 0; i < n; i++) {
      const plot = plots[i];
      if (!plot) {
        rows.push(`
        <div class="shop-row plot-row">
          <div class="gf-info"><div class="gf-name">第 ${i + 1} 田 <span class="tag">空田</span></div>
          <div class="gf-desc">沃土待垦，可播下种子。</div></div>
          <div class="gf-actions"><button class="btn btn-sm" data-action="act-cave-plant" data-i="${i}">播 种</button></div>
        </div>`);
      } else {
        const grown = Math.max(0, Math.floor(p.day) - plot.plantedDay);
        const pct = Utils.clamp(grown / plot.days * 100, 0, 100);
        const ripe = grown >= plot.days;
        const over = grown - plot.days;
        rows.push(`
        <div class="shop-row plot-row">
          <div class="gf-info">
            <div class="gf-name">第 ${i + 1} 田 · ${GameData.ITEMS[plot.crop].name} ${ripe ? '<span class="tag safe">已成熟</span>' : `<span class="tag">生长中 ${grown}/${plot.days}日</span>`}</div>
            <div class="bar" style="height:12px"><div class="bar-fill exp" style="width:${pct}%"></div><span class="bar-text">${Math.floor(pct)}%</span></div>
            ${ripe && over >= 20 ? '<div class="gf-desc"><span class="neg">过熟日久，收获将折半，请尽快采收。</span></div>' : ''}
          </div>
          <div class="gf-actions">${ripe
            ? `<button class="btn btn-sm btn-primary" data-action="act-cave-harvest" data-i="${i}">收 获</button>`
            : '<span class="tip-line" style="margin:0">静待成熟</span>'}</div>
        </div>`);
      }
    }
    return rows.join('');
  },
};

/* ======================================================================
 * §11.7 v13 灵兽系统 BeastSys（驯服 / 养成 / 助战）
 * 战斗中将可驯妖兽打至两成血以下，出现「驯服」：成功率受福缘与境界差影响。
 * 灵兽出战：每回合四成几率协助攻击，并给主人一项被动加成（随品阶成长）。
 * 洞府兽栏：出战 1 只 + 仓储（4 + 洞府等级）只。
 * ====================================================================== */
const BeastSys = {
  TAMEABLE: ['beast', 'snake', 'swarm', 'plant', 'element'],   // 可驯物种（人形/傀儡/阴魂不可驯）
  /** 被动加成映射：物种 → 属性键 */
  PASSIVE: { beast: 'atkPct', snake: 'crit', plant: 'hpPct', swarm: 'dodge', element: 'cult' },
  NAME: { atkPct: '攻击', crit: '暴击', hpPct: '气血', dodge: '闪避', cult: '修炼效率' },
  maxSlots(p) { return 4 + (p.cave ? p.cave.lv : 1); },
  activeBeast(p) { return p.beasts ? p.beasts.list.find(b => b.uid === p.beasts.active) || null : null; },
  /** 战斗面板驯服入口 */
  async tame() {
    const B = Battle.active;
    const p = Game.player;
    if (!B || B.over || !B.enemy) return;
    const e = B.enemy;
    if (!this.TAMEABLE.includes(e.species)) { UI.toast('此物灵智已开或非血肉之躯，无法驯服'); return; }
    if (e.hp > e.hpMax * 0.2) { UI.toast('需先将其打至两成血以下，方能驯服'); return; }
    const slotFull = p.beasts.list.length >= this.maxSlots(p);
    const diff = (e.power - (p.realmIdx * 4 + p.layer)) * 5;
    const tameSkill = p.tameSkill || 0;
    const rate = Utils.clamp(45 + p.attrs.luck * 2 - diff + Math.floor(tameSkill / 10), 8, 90);
    const ok = await UI.popup({
      title: `驯服 · ${e.name}`,
      html: `${e.name} 已力竭，野性渐敛。你缓缓探出神识，以灵力温沟通其灵智……<br>
        · 成功率 <b class="hl">${rate.toFixed(0)}%</b>（福缘 ${p.attrs.luck}${diff > 0 ? `，境界压制 -${diff}` : ''}）<br>
        ${slotFull ? `<span class="neg">兽栏已满（${this.maxSlots(p)} 位）——驯服将放归野外。</span>` : `兽栏余位：${this.maxSlots(p) - p.beasts.list.length}。`}`,
      options: [{ text: '尝试驯服', value: true, primary: true }, { text: '罢了，斩之', value: false }],
    });
    if (!ok) return;
    B.busy = true;
    await Battle.wait(700);
    if (Utils.chance(rate)) {
      const beast = {
        uid: p.beasts.nextId || 1,
        id: e.id, name: e.name, species: e.species, power: e.power,
        level: 1, exp: 0,
        skills: (e.skills || []).slice(0, 1).map(s => ({ ...s })),
      };
      p.beasts.nextId = (p.beasts.nextId || 1) + 1;
      if (slotFull) {
        p.tameSkill = Math.min(100, (p.tameSkill || 0) + 8);
        Log.add(`你以神识温言相抚，${e.name} 俯首帖耳……可惜兽栏已满，你只能为其解开封印，目送它遁入山林。（驯服心得 +8/100）`, 'info');
      } else {
        p.beasts.list.push(beast);
        if (!p.beasts.active) p.beasts.active = beast.uid;
        Ambience.sfx('tame');
        Log.add(`神识相融，心意相通——<b>${e.name}</b> 竟俯首认主！灵兽图谱又添一员，出战可协力攻敌。`, 'gain');
        UI.announce(`✦ 灵兽认主 · ${e.name}`, 'gold');
        Meta.see('monster', e.id);
      }
      B.enemy.hp = 0;
      B.log(`${e.name} 驯服功成！`, 'log-gain');
      await Battle.wait(500);
      Battle.victoryTame();
      return;
    }
    Log.add(`${e.name} 灵智倔强，猛然挣脱你的神识，带着一身伤痕遁走了——此战算你胜，却少了战利品。`, 'warn');
    B.enemy.hp = 0;
    await Battle.wait(400);
    Battle.victoryTame(true);
  },
  /** 驯服结算的轻量胜利（战利品减半/无） */
  victoryTame(fled = false) {
    const B = Battle.active;
    const p = Game.player;
    if (!B) return;
    B.over = true;
    p.counters.wins++;
    const gain = Math.round(B.enemy.expGain * 0.5);
    Cultivate.addExp(p, gain);
    if (fled) Bag.addStones(Math.round(B.enemy.stoneGain * 0.3));
    Log.add(fled
      ? `兽虽走脱，你仍获修为 +${Utils.fmtNum(gain)}，并捡到些许灵石。`
      : `${B.enemy.name} 认主之后，自动为你衔来修为造化：修为 +${Utils.fmtNum(gain)}。`, 'gain');
    Battle.end();
    UI.announce(fled ? '灵 兽 走 脱' : '驯 服 功 成', fled ? 'bad' : 'ok');
  },
  /** 出战灵兽的被动加成（Stat.compute 调用） */
  passive(p) {
    const b = this.activeBeast(p);
    if (!b) return {};
    const key = this.PASSIVE[b.species] || 'atkPct';
    const val = Math.round(b.power * 0.6 + b.level * 0.8);
    return { [key]: val };
  },
  /** 战斗中灵兽协助攻击（Battle.act 开头调用）：40% 几率出手 */
  async assist(st) {
    const B = Battle.active;
    const p = Game.player;
    const b = this.activeBeast(p);
    if (!B || !b || B.over || !Utils.chance(40)) return false;
    const dmg = Math.max(1, Math.round(st.atk * (0.22 + b.level * 0.03) * (1 + b.power * 0.02) * Utils.randF(0.8, 1.2)));
    B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
    B.hitShake = true;
    B.pushFloat('enemy', `-${dmg}`, 'dmg');
    const skName = b.skills.length ? `【${b.skills[0].name}】` : '';
    B.log(`${skName || ''}你的灵兽 <b>${b.name}</b> 亦张牙舞爪扑上助战——造成 <b>${dmg}</b> 点伤害！`, 'log-gain');
    Battle.render();
    await Battle.wait(360);
    return B.enemy.hp <= 0;
  },
  /** 喂食内丹：+500 灵兽经验 */
  feed(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    if (Bag.count('m_neidan') < 1) { UI.toast('需【妖兽内丹】一枚'); return; }
    Bag.removeItem('m_neidan', 1);
    b.exp += 500;
    let up = false;
    while (b.level < 10 && b.exp >= b.level * 400) { b.exp -= b.level * 400; b.level++; up = true; }
    if (up) {
      Log.add(`【${b.name}】吞下内丹，周身妖气一涨——灵兽升至 <b>${b.level} 阶</b>！协助作战愈发骁勇。`, 'gain');
      UI.toast(`${b.name} 升至 ${b.level} 阶`);
    } else {
      Log.add(`【${b.name}】吞下内丹，妖气渐长（灵兽经验 +500）。`, 'info');
    }
    Game.afterAction();
  },
  setActive(uid) {
    const p = Game.player;
    p.beasts.active = p.beasts.active === uid ? null : uid;
    const b = this.activeBeast(p);
    Log.add(b ? `你放出 <b>${b.name}</b> 随行出战。` : '灵兽归栏歇息。', 'info');
    Game.afterAction();
  },
  async free(uid) {
    const p = Game.player;
    const b = p.beasts.list.find(x => x.uid === uid);
    if (!b) return;
    const ok = await UI.popup({
      title: `放归 · ${b.name}`,
      html: `确定将 <b>${b.name}</b> 放归山林吗？此后它将重回天地，不再随你修行。`,
      options: [{ text: '放 归', value: true }, { text: '算了', value: false }],
    });
    if (!ok) return;
    p.beasts.list = p.beasts.list.filter(x => x.uid !== uid);
    if (p.beasts.active === uid) p.beasts.active = null;
    Log.add(`你解开灵契，${b.name} 绕你三匝，长啸一声遁入山林。`, 'info');
    Game.afterAction();
  },
};

/* ======================================================================
 * §11 商店系统
 * ====================================================================== */
const ShopSys = {
  price(itemId) {
    const def = GameData.ITEMS[itemId];
    const p = Game.player;
    const disc = Stat.compute(p).shopDiscount;
    // v5：叠加坊市行情（每 30 日一茬，±20% 内波动），宗门折扣与战时涨价照旧
    return Math.max(1, Math.round((def.price || 0) * (1 - disc / 100) * WorldSys.priceMul(p) * WorldSys.marketMul(p, itemId)));
  },
  sellPrice(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    let base = def.price || 0;
    // 符箓为时价之物：随境界经济浮动
    if (def.ecoPrice) base = Math.round(base * GameData.stoneEco(p.realmIdx));
    let v = Math.max(1, Math.floor(base * 0.4));
    // 丹道：出售丹药价格提升五成
    if (p.dao === 'pill' && def.type === 'pill') v = Math.round(v * 1.5);
    if (p.dao === 'pill' && def.type === 'pill' && DaoSys.tierLevel(p) >= 2) v = Math.round(v * 1.25);   // v10 丹道六境·药理境
    return Math.max(1, Math.round(v * WorldSys.priceMul(p)));
  },
  buy(itemId) {
    const p = Game.player;
    const def = GameData.ITEMS[itemId];
    const cost = this.price(itemId);
    if (def.type === 'gongfa' && p.gongfa[itemId]) { UI.toast('你已修习此功法'); return; }
    if (def.type === 'gongfa' && !DaoSys.canLearnGongfa(p, def)) return; // 体修难悟高阶法诀
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    Bag.addItem(itemId, 1);
    Log.add(`你购得 <b>${def.name}</b>，花费 ${Utils.fmtNum(cost)} 下品灵石。`, 'info');
    Game.afterAction();
  },
  sell(itemId, all = false) {
    const qty = all ? Bag.count(itemId) : 1;
    if (qty <= 0) return;
    const def = GameData.ITEMS[itemId];
    const gain = this.sellPrice(itemId) * qty;
    Bag.removeItem(itemId, qty);
    Bag.addStones(gain);
    Log.add(`你售出 ${def.name} ×${qty}，得 ${Utils.fmtNum(gain)} 下品灵石。`, 'gain');
    Game.afterAction();
  },
  convert(dir) {
    const s = Game.player.stones;
    const tryOp = (cond, fn, msg) => {
      if (cond) { fn(); Log.add(msg, 'info'); }
      else UI.toast('灵石不足，无法兑换');
    };
    if (dir === 'up1') tryOp(s.low >= 100, () => { s.low -= 100; s.mid++; }, '你将一百下品灵石兑换为一枚中品灵石。');
    if (dir === 'down1') tryOp(s.mid >= 1, () => { s.mid--; s.low += 100; }, '你将一枚中品灵石兑换为一百下品灵石。');
    if (dir === 'up2') tryOp(s.mid >= 100, () => { s.mid -= 100; s.high++; }, '你将一百中品灵石兑换为一枚上品灵石。');
    if (dir === 'down2') tryOp(s.high >= 1, () => { s.high--; s.mid += 100; }, '你将一枚上品灵石兑换为一百中品灵石。');
    Game.afterAction();
  },
  /* ---------- v4 一键减负：凡品清理 ---------- */
  /** 背包中可按「凡品」打包出售的物品：凡级（grade 0）装备 + 一阶（tier 1）材料 */
  commonSaleList() {
    const p = Game.player;
    if (!p) return [];
    return Object.keys(p.bag).filter(id => {
      const d = GameData.ITEMS[id];
      if (!d) return false;
      if (d.type === 'artifact') return (d.grade || 0) === 0;
      if (d.type === 'material') return (d.tier || 0) <= 1;
      return false;
    }).map(id => {
      const qty = p.bag[id];
      const each = this.sellPrice(id);
      return { id, name: GameData.ITEMS[id].name, qty, each, sum: each * qty };
    });
  },
  /** 一键出售凡品：确认后打包售予坊市 */
  async sellCommon() {
    const rows = this.commonSaleList();
    if (!rows.length) { UI.toast('背包中没有可出售的凡品杂物'); return; }
    const total = rows.reduce((s, r) => s + r.sum, 0);
    const count = rows.reduce((s, r) => s + r.qty, 0);
    const ok = await UI.popup({
      title: '一键出售凡品',
      html: `将把以下凡级装备与一阶材料打包售予坊市：<br>
        ${rows.map(r => `· ${r.name} ×${r.qty}（${Utils.fmtNum(r.sum)} 灵石）`).join('<br>')}<br><br>
        共 ${count} 件，合计可得 <b class="hl">${Utils.fmtNum(total)}</b> 下品灵石。`,
      options: [{ text: '打包出售', value: true, primary: true }, { text: '再想想', value: false }],
    });
    if (!ok) return;
    let gain = 0;
    for (const r of rows) { Bag.removeItem(r.id, r.qty); gain += r.sum; }
    Bag.addStones(gain);
    Log.add(`你将凡品杂物打包售予坊市（${count} 件），得 <b>${Utils.fmtNum(gain)}</b> 下品灵石。`, 'gain');
    Game.afterAction();
  },
};

/* ======================================================================
 * §12 宗门系统（加入 / 任务 / 兑换）
 * ====================================================================== */
const SectSys = {
  taskMonsters(rp) {
    return Object.entries(GameData.MONSTERS)
      .filter(([, m]) => m && !m.elite && m.power >= rp - 4 && m.power <= rp + 2)
      .map(([id]) => id);
  },
  genTask(p) {
    const realm = p.realmIdx;
    const type = Utils.pick(['kill', 'collect', 'cult']);
    if (type === 'kill') {
      const pool = this.taskMonsters(realm * 4 + p.layer);
      if (pool.length) {
        const target = Utils.pick(pool);
        const need = Utils.rand(3, 5);
        return { type, target, need, progress: 0, name: `讨伐 · ${GameData.MONSTERS[target].name}`, desc: `击杀 ${GameData.MONSTERS[target].name} ×${need}` };
      }
    }
    if (type === 'collect') {
      const tier = Math.min(4, Math.floor(realm / 2) + 1);
      const target = Utils.pick(GameData.matsByTier(tier));
      const need = Utils.rand(3, 6);
      return { type, target, need, progress: 0, name: `采集 · ${GameData.ITEMS[target].name}`, desc: `上交 ${GameData.ITEMS[target].name} ×${need}` };
    }
    const need = Math.round(120 * GameData.eco(realm));
    return { type: 'cult', target: null, need, progress: 0, name: '修行 · 精进不休', desc: `累计获得修为 ${Utils.fmtNum(need)}` };
  },
  rewards(p, task) {
    const realm = p.realmIdx;
    let contrib = 30 + realm * 22, stones = Math.round(45 * GameData.stoneEco(realm));
    if (task && task.danger) { contrib *= 2; stones *= 2; }        // 高危生死状：赏格翻倍
    if (WorldSys.warActive(p)) { contrib = Math.round(contrib * 1.5); stones = Math.round(stones * 1.5); } // 宗门大战：悬赏暴涨
    return { contrib, stones };
  },
  /** 生成任务并按派系立场折算高危生死状 */
  newTask(p) { return this.wrapDanger(this.genTask(p), p); },
  /** 敌对派系借刀杀人：派系成员偶接高危任务（战时概率大涨）；force 用于入派当日立威（无视原任务类型） */
  wrapDanger(t, p, force = false) {
    if (!t || !p.sect || !p.sect.faction) return t;
    if (!force && (t.type !== 'kill' || !Utils.chance(WorldSys.warActive(p) ? 55 : 26))) return t;
    const rp = p.realmIdx * 4 + p.layer;
    const elites = Object.entries(GameData.MONSTERS)
      .filter(([, m]) => m.elite && m.power >= rp - 1 && m.power <= rp + 4).map(([id]) => id);
    if (!elites.length) return t;
    t.type = 'kill'; t.target = Utils.pick(elites); t.need = 1; t.progress = 0; t.danger = true;
    t.name = '高危 · 生死状';
    t.desc = `讨伐 ${GameData.MONSTERS[t.target].name}（敌对派系借刀杀人，赏格翻倍）`;
    return t;
  },
  join(sectId) {
    const p = Game.player;
    if (p.sect) { UI.toast('你已拜入宗门，不可再改投他门'); return; }
    if (p.realmIdx < 1) { UI.toast('须至筑基期方可拜入宗门'); return; }
    const sect = GameData.SECTS.find(s => s.id === sectId);
    p.sect = { id: sectId, contrib: 0, faction: null, tasks: [this.newTask(p), this.newTask(p), this.newTask(p)] };
    Log.add(`你焚香沐浴，正式拜入 <b>${sect.name}</b>！${sect.bonusText}。`, 'system');
    Game.afterAction();
  },
  submit(taskIdx) {
    const p = Game.player;
    const t = p.sect.tasks[taskIdx];
    if (!t || t.type !== 'collect' || t.progress >= t.need) return;
    const have = Bag.count(t.target);
    if (have <= 0) { UI.toast('背包中没有所需材料'); return; }
    const take = Math.min(have, t.need - t.progress);
    Bag.removeItem(t.target, take);
    t.progress += take;
    Log.add(`你向宗门上交 ${GameData.ITEMS[t.target].name} ×${take}。`, 'info');
    if (t.progress >= t.need) Log.add('任务已可领取奖励！', 'gain');
    Game.afterAction();
  },
  claim(taskIdx) {
    const p = Game.player;
    const t = p.sect.tasks[taskIdx];
    if (!t || t.progress < t.need) return;
    const r = this.rewards(p, t);
    p.sect.contrib += r.contrib;
    Bag.addStones(r.stones);
    Log.add(`任务完成！获得 <b>贡献 ${r.contrib}</b> 点、灵石 ${Utils.fmtNum(r.stones)}。`, 'gain');
    p.sect.tasks[taskIdx] = this.newTask(p);
    Game.afterAction();
  },
  /** 高危生死状：接状即战，敌对派系借刀杀人 */
  async goDanger(taskIdx) {
    const p = Game.player;
    if (!p.sect) return;
    const t = p.sect.tasks[taskIdx];
    if (!t || !t.danger || t.progress >= t.need) return;
    const ok = await UI.popup({
      title: '高危 · 生死状',
      html: `${t.desc}<br><br><span class="neg">敌对派系借刀杀意，此行九死一生；然赏格翻倍。</span><br>若退缩，将换发一桩寻常任务。`,
      options: [{ text: '接下生死状', value: true, primary: true }, { text: '退缩换任务', value: false }],
    });
    if (!ok) {
      p.sect.tasks[taskIdx] = this.newTask(p);
      Log.add('你婉拒了高危差事，换了桩寻常任务。', 'info');
      Game.afterAction();
      return;
    }
    Game.afterAction();
    Battle.start(t.target, { mapName: '宗门生死状', sectDanger: taskIdx });
  },
  onDangerWin(taskIdx) {
    const p = Game.player;
    if (!p.sect) return;
    const t = p.sect.tasks[taskIdx];
    if (!t || !t.danger) return;
    t.progress = t.need;
    Log.add('生死状任务已然达成，可回宗门领取翻倍赏格！', 'gain');
  },
  exchange(idx) {
    const p = Game.player;
    const row = GameData.SECT_EXCHANGE[idx];
    if (!row) return;
    const def = GameData.ITEMS[row.item];
    if (def.type === 'gongfa' && p.gongfa[row.item]) { UI.toast('你已修习此功法'); return; }
    if (def.type === 'gongfa' && !DaoSys.canLearnGongfa(p, def)) return; // 体修难悟高阶法诀
    if (p.sect.contrib < row.cost) { UI.toast('贡献点不足'); return; }
    p.sect.contrib -= row.cost;
    Bag.addItem(row.item, row.qty || 1);
    Log.add(`你以 ${row.cost} 贡献兑换了 <b>${def.name}</b>${row.qty > 1 ? ` ×${row.qty}` : ''}。`, 'gain');
    Game.afterAction();
  },
  /** 长老派系 · 站队（终身有效），入门有礼 */
  async joinFaction(fid) {
    const p = Game.player;
    if (!p.sect) return;
    if (p.sect.faction) { UI.toast('你已站过队，不可再改换门庭'); return; }
    const f = GameData.SECT_FACTIONS.find(x => x.id === fid);
    if (!f) return;
    const ok = await UI.popup({
      title: '长老派系 · 站队',
      html: `确定依附 <b>${f.name}</b> 吗？<br>${f.desc}<br>${f.giftText}。<br><span class="neg">站队之后，敌对派系将给你派发高危任务，且不可改换门庭。</span>`,
      options: [{ text: '执弟子礼', value: true, primary: true }, { text: '再观望观望', value: false }],
    });
    if (!ok) return;
    p.sect.faction = fid;
    if (f.gift.stones) Bag.addStones(f.gift.stones);
    if (f.gift.item) Bag.addItem(f.gift.item, 1);
    if (f.gift.extra) for (const [id, n] of Object.entries(f.gift.extra)) Bag.addItem(id, n);
    if (f.gift.gongfa) { const g = Utils.pick(f.gift.gongfa); if (!p.gongfa[g]) Bag.addItem(g, 1); }
    Log.add(`你正式依附 <b>${f.name}</b>——${f.motto}。${f.giftText}。`, 'system');
    // 敌对派系当日便递来一份"见面礼"——生死状
    const i = Utils.rand(0, p.sect.tasks.length - 1);
    p.sect.tasks[i] = this.wrapDanger(this.genTask(p), p, true);
    Game.afterAction();
  },
  /** 派系专属秘藏兑换 */
  factionExchange(idx) {
    const p = Game.player;
    if (!p.sect || !p.sect.faction) return;
    const f = GameData.SECT_FACTIONS.find(x => x.id === p.sect.faction);
    const row = f.exclusive[idx];
    if (!row) return;
    const def = GameData.ITEMS[row.item];
    if (def.type === 'gongfa' && p.gongfa[row.item]) { UI.toast('你已修习此功法'); return; }
    if (def.type === 'gongfa' && !DaoSys.canLearnGongfa(p, def)) return;
    if (p.sect.contrib < row.cost) { UI.toast('贡献点不足'); return; }
    p.sect.contrib -= row.cost;
    Bag.addItem(row.item, 1);
    Log.add(`你以 ${row.cost} 贡献换取了派系秘藏 <b>${def.name}</b>。`, 'gain');
    Game.afterAction();
  },
  /** 击杀钩子：推进讨伐任务 */
  onKill(monsterId) {
    const p = Game.player;
    if (!p.sect) return;
    for (const t of p.sect.tasks) {
      if (t.type === 'kill' && t.target === monsterId && t.progress < t.need) {
        t.progress++;
        if (t.progress >= t.need) Log.add('宗门讨伐任务已完成，可回去领取奖励！', 'gain');
        else Log.add(`讨伐任务进度：${t.progress}/${t.need}。`, 'info');
      }
    }
  },
  /** 修炼钩子：推进修行任务 */
  onCultivate(amount) {
    const p = Game.player;
    if (!p.sect) return;
    for (const t of p.sect.tasks) {
      if (t.type === 'cult' && t.progress < t.need) {
        t.progress = Math.min(t.need, t.progress + amount);
        if (t.progress >= t.need) Log.add('宗门修行任务已完成，可回去领取奖励！', 'gain');
      }
    }
  },
};

/* ======================================================================
 * §13 探索与随机事件
 * ====================================================================== */
const buildMonster = (id, delta = 0) => {
  const d = GameData.MONSTERS[id];
  const rp = Utils.clamp(d.power + delta, 0, 60);
  const realmIdx = Utils.clamp(Math.floor(rp / 4), 0, 9);
  const e = !!d.elite;
  return {
    id,
    name: d.name,
    elite: e,
    power: rp,
    species: d.species || 'beast',
    skills: (d.skills || []).map(s => ({ ...s })),
    realmLabel: GameData.REALM_NAMES[realmIdx] + GameData.LAYER_NAMES[Utils.clamp(rp % 4, 0, 3)],
    hpMax: Math.round((55 + Math.pow(rp, 1.6) * 5) * (d.hp || 1) * (e ? 1.7 : 1)),
    atk: Math.round((6 + rp * 2.6) * (d.atk || 1) * (e ? 1.35 : 1)),
    def: Math.round((3 + rp * 1.6) * (d.def || 1)),
    spd: Math.round((6 + rp * 0.9) * (d.spd || 1)),
    dodge: d.dodge || 0,
    crit: e ? 10 : 4,
    expGain: Math.round(22 * GameData.eco(realmIdx) * (e ? 2.2 : 1)),
    stoneGain: Math.round(Utils.rand(10, 20) * GameData.stoneEco(realmIdx) * (d.stoneMul || 1) * (e ? 2.5 : 1)),
    dropTier: Math.min(4, Math.floor(realmIdx / 2) + 1),
    rareDrop: d.rareDrop || null,
    hp: 0,
  };
};

/* ======================================================================
 * §13.5 v13 战斗状态效果 StatusFx（中毒/灼烧/流血/破防/迟滞/虚弱/束缚/冰封 + 增益）
 * 敌我双向：敌方技能给玩家挂负面（B.myFx），玩家符箓/法诀给敌方挂减益（B.enemy.fx）。
 * ====================================================================== */
const StatusFx = {
  DEFS: {
    poison:  { name: '中毒', tag: '毒', cls: 'fx-poison', dot: true },
    burn:    { name: '灼烧', tag: '焰', cls: 'fx-burn', dot: true },
    bleed:   { name: '流血', tag: '血', cls: 'fx-bleed', dot: true },
    defdown: { name: '破防', tag: '破', cls: 'fx-defdown' },
    slow:    { name: '迟滞', tag: '滞', cls: 'fx-slow' },
    weaken:  { name: '虚弱', tag: '弱', cls: 'fx-weaken' },
    stun:    { name: '束缚', tag: '缚', cls: 'fx-stun', skip: true },
    freeze:  { name: '冰封', tag: '冰', cls: 'fx-stun', skip: true },
    shield:  { name: '金光', tag: '盾', cls: 'fx-shield' },
    atkup:   { name: '狂暴', tag: '狂', cls: 'fx-atk' },
    defup:   { name: '铁骨', tag: '骨', cls: 'fx-def' },
    agiup:   { name: '轻身', tag: '风', cls: 'fx-agi' },
    critup:  { name: '明目', tag: '目', cls: 'fx-agi' },
  },
  add(list, st) {
    const old = list.find(x => x.kind === st.kind);
    if (old) { old.rounds = Math.max(old.rounds, st.rounds); old.pct = Math.max(old.pct || 0, st.pct || 0); }
    else list.push({ ...st });
  },
  has(list, kind) { return list.some(x => x.kind === kind && x.rounds > 0); },
  pctOf(list, kind) { const x = list.find(y => y.kind === kind && y.rounds > 0); return x ? (x.pct || 0) : 0; },
  /** 回合衰减：DOT 状态结算后衰减；其余状态（控制/增减益）由各自时机处理，此处不动 */
  decayDots(list) {
    const dots = ['poison', 'burn', 'bleed'];
    for (const x of list) if (dots.includes(x.kind)) x.rounds--;
    return list.filter(x => x.rounds > 0);
  },
  /** 衰减指定类别状态（回合末的增减益） */
  decayKinds(list, kinds) {
    for (const x of list) if (kinds.includes(x.kind)) x.rounds--;
    return list.filter(x => x.rounds > 0);
  },
  /** 移除指定类别状态（控制状态在其拥有者回合被消耗） */
  removeKinds(list, kinds) { return list.filter(x => !kinds.includes(x.kind)); },
  /** 清除全部负面（清心丹）：负面（DOT/减益/控制）尽去，增益保留 */
  purge(list) {
    const neg = ['poison', 'burn', 'bleed', 'defdown', 'slow', 'weaken', 'stun', 'freeze'];
    return list.filter(x => !neg.includes(x.kind));
  },
  tagsHtml(list) {
    return (list || []).map(x => {
      const d = this.DEFS[x.kind];
      if (!d) return '';
      const pct = x.pct ? ` ${Math.round(x.pct)}%` : '';
      return `<span class="fx-tag ${d.cls}" title="${d.name}${pct} · 余 ${x.rounds} 回合">${d.tag}${x.rounds}</span>`;
    }).join('');
  },
};

const Explore = {
  async go(mapId) {
    const p = Game.player;
    if (Battle.active || p.dead) return;
    const map = GameData.MAPS.find(m => m.id === mapId);
    if (!map) return;
    p.counters.explores++;
    const mapExp = p.counters.mapExplores = (p.counters.mapExplores || {});
    mapExp[map.id] = (mapExp[map.id] || 0) + 1;
    Time.add(2);
    if (p.dead) return;
    const under = p.realmIdx < map.recRealm;
    // 气运：好事事件（宝箱/机缘/贵人）权重提升；红尘劫（道德抉择）常驻各图
    const weights = { ...map.weights, dilemma: 12 };
    const gm = KarmaSys.goodEventMult(p);
    for (const k of ['treasure', 'fortune', 'npc']) if (weights[k]) weights[k] *= gm;
    // §23 上古秘境现世：宝箱与机缘权重提升
    if (WorldSys.ruinsActive(p)) for (const k of ['treasure', 'fortune']) if (weights[k]) weights[k] *= 1.5;
    const type = Utils.pickWeighted(weights);
    switch (type) {
      case 'battle': {
        const eliteChance = under ? 14 : 8;
        const monsterId = Utils.chance(eliteChance) && map.elite
          ? map.elite
          : Utils.pickWeighted(map.pool);
        Log.add(`你在 ${map.name} 探索时，惊动了什么……`, 'event');
        // v10 境界特性 · 神识（化神起）：五成先手；低打依旧保留原有先手机会
        const firstStrike = (under && Utils.chance(25)) || (p.realmIdx >= 4 && Utils.chance(50));
        // 阵道：抢先布阵（布阵境五成，困阵境压制四成）
        const arrayTier = p.dao === 'array' ? DaoSys.tierLevel(p) : 0;
        const arraySetup = arrayTier >= 1 && Utils.chance(50);
        if (arraySetup) DaoSys.gain(p, 20);   // v16 阵道
        const bctx = { mapName: map.name, mapId: map.id, firstStrike, arraySetup, arrayPotent: arrayTier >= 3, arrayGrand: arrayTier >= 6 };
        // §23 魔域：妖魔狂化，凶险与收获并增
        if (WorldSys.isMagic(p, map.id)) {
          bctx.worldMul = 1.3; bctx.dropMul = 1.4;
          Log.add('魔气森然——此间妖魔已被魔域之气狂化！', 'warn');
        }
        Battle.start(monsterId, bctx);
        return; // 战斗结束后自行结算
      }
      case 'treasure': EventSys.treasure(map); break;
      case 'fortune': EventSys.fortune(map); break;
      case 'npc': await EventSys.npc(map); break;
      case 'dilemma': await EventSys.dilemma(); break;
      case 'trap': EventSys.trap(); break;
      default: {
        Log.add(Utils.pick(GameData.FLAVOR.nothing), 'info');
        // v8：空手而归的小安慰——归途偶有拾获，不再两手空空
        if (Utils.chance(50)) {
          const stones = Math.round(Utils.rand(3, 8) * GameData.stoneEco(p.realmIdx));
          Bag.addStones(stones);
          Log.add(`归途中你顺手采了些灵草杂物，卖给坊市换得灵石 ${stones} 枚，不算空手而归。`, 'gain');
        }
      }
    }
    // 孽障：仇家循迹寻仇 / §24 恩怨：宿敌趁你历练偷袭
    if (!Battle.active) {
      const ambId = NpcSys.pickAmbusher(p);
      if (ambId && Utils.chance(NpcSys.ambushChance(p))) {
        Log.add(`一道熟悉的杀意骤然锁定你——与 <b>${NpcSys.def(ambId).name}</b> 的恩怨，终究追到了这里！`, 'warn');
        await Utils.sleep(500);
        Game.afterAction(); // 先持久化本次历练收益，再入战斗
        Battle.start(null, { enemy: NpcSys.buildEnemy(p, ambId), npcId: ambId, mode: 'hunt', ambush: true, mapName: '恩怨了结之地' });
        return;
      }
      if (Utils.chance(KarmaSys.ambushChance(p))) {
        const idx = GameData.MAPS.findIndex(m => m.id === map.id);
        const nextMap = GameData.MAPS[Math.min(idx + 1, GameData.MAPS.length - 1)];
        Log.add('忽然一道凌厉杀意锁定了你——孽债累累，终有仇家循迹而至！', 'warn');
        await Utils.sleep(500);
        Game.afterAction(); // 先持久化本次历练收益，再入战斗
        Battle.start(nextMap.elite || nextMap.pool[0].id, { mapName: '仇家埋伏之地', mapId: map.id, ambush: true });
        return;
      }
    }
    Game.afterAction();
  },
};

const EventSys = {
  /** 阵道在秘境遗迹的收益倍率 */
  arrMult(map) {
    const p = Game.player;
    return map && map.id === 'ruins' && p.dao === 'array' ? 1.2 : 1;
  },
  treasure(map) {
    const p = Game.player;
    const st = Stat.compute(p);
    Log.add('你拨开蔓草，发现了一只落满尘土的储物箱！', 'event');
    Narrative.logScene('treasure');   // v5：道途语气
    if (Utils.chance(22)) {
      const dmg = Math.round(st.maxHp * Utils.rand(8, 15) / 100);
      p.hp = Math.max(1, p.hp - dmg);
      Log.add(`箱底暗藏毒针！你躲避不及，气血 -${dmg}。`, 'loss');
      return;
    }
    const stones = Math.round(Utils.rand(12, 22) * GameData.stoneEco(p.realmIdx) * (1 + st.luck * 0.02) * this.arrMult(map));
    if (this.arrMult(map) > 1) Log.add('阵道造诣令你于遗迹中如鱼得水，所获更丰！', 'gain');
    Bag.addStones(stones);
    let text = `箱中有灵石 ${Utils.fmtNum(stones)} 枚`;
    if (Utils.chance(45 + st.luck * 2)) {
      const qty = Utils.chance(20) ? 2 : 1;
      const mat = Utils.pick(GameData.matsByTier(Math.min(4, Math.floor(p.realmIdx / 2) + 1)));
      Bag.addItem(mat, qty);
      text += `、${GameData.ITEMS[mat].name} ×${qty}`;
    }
    Log.add(`${text}。`, 'gain');
  },
  fortune(map) {
    const p = Game.player;
    Narrative.logScene('fortune');   // v5：道途语气
    // §26 前世记忆：兵解转世者偶得前世洞府机缘
    if (p.reinc && Utils.chance(15)) {
      const gain = Math.round(200 * GameData.eco(p.realmIdx));
      Cultivate.addExp(p, gain);
      Bag.addItem('m_gupian', 1);
      p.insight = Math.min(100, p.insight + 8);
      Log.add(`冥冥牵引之下，你寻到一处依稀熟悉的洞府——那是<b>前世</b>你埋藏机缘之地！修为 +${Utils.fmtNum(gain)}、上古法宝碎片 ×1、突破感悟 +8。`, 'gain');
      return;
    }
    const eco = GameData.eco(p.realmIdx);
    const arr = this.arrMult(map);
    const kind = Utils.pickWeighted({ lingmai: 30, wudao: 20, yifu: 20, lingru: 15, shenquan: 8, tiancai: 7 });
    switch (kind) {
      case 'lingmai': {
        const gain = Math.round(90 * eco);
        Cultivate.addExp(p, gain);
        Log.add(`你误入一处灵脉福地，灵气浓得化不开！修为 +${Utils.fmtNum(gain)}。`, 'gain');
        break;
      }
      case 'wudao': {
        const gain = Math.round(60 * eco);
        Cultivate.addExp(p, gain);
        p.insight = Math.min(100, p.insight + 5);
        Log.add(`你在一座悟道古碑前静立半日，若有所悟。修为 +${Utils.fmtNum(gain)}，突破感悟 +5。`, 'gain');
        break;
      }
      case 'yifu': {
        const stones = Math.round(25 * GameData.stoneEco(p.realmIdx) * arr);
        Bag.addStones(stones);
        const mat = Utils.pick(GameData.matsByTier(Math.min(4, Math.floor(p.realmIdx / 2) + 1)));
        Bag.addItem(mat, 1);
        Log.add(`你寻得一处无名遗府，残存的储物袋中有灵石 ${Utils.fmtNum(stones)}、${GameData.ITEMS[mat].name} ×1。`, 'gain');
        break;
      }
      case 'lingru': {
        const st = Stat.compute(p);
        p.hp = st.maxHp; p.mp = st.maxMp;
        p.poison = Math.max(0, p.poison - 35);
        Log.add('你饮下一汪灵乳玉髓，气血充盈，丹毒尽去大半。', 'gain');
        break;
      }
      case 'shenquan': {
        const keys = Object.keys(p.attrs).filter(k => p.attrs[k] < 10);
        if (keys.length) {
          const k = Utils.pick(keys);
          p.attrs[k]++;
          Log.add(`你于淬体神泉中沐浴三日，${GameData.ATTR_NAMES[k]} +1！此乃天大机缘！`, 'gain');
        } else {
          const gain = Math.round(120 * eco);
          Cultivate.addExp(p, gain);
          Log.add(`你体质已臻圆满，神泉化为修为。修为 +${Utils.fmtNum(gain)}。`, 'gain');
        }
        break;
      }
      default: {
        const tier = Math.min(4, Math.floor(p.realmIdx / 2) + 2);
        const mat = Utils.pick(GameData.matsByTier(tier));
        Bag.addItem(mat, 2);
        Log.add(`你发现了一株罕见的天材地宝——${GameData.ITEMS[mat].name} ×2！`, 'gain');
      }
    }
  },
  trap() {
    const p = Game.player;
    Narrative.logScene('trap');   // v5：道途语气
    const st = Stat.compute(p);
    let dmg = Math.round(st.maxHp * Utils.rand(8, 16) / 100);
    // v10 境界特性 · 神识（化神起）：先知先觉，陷阱伤害减半
    if (p.realmIdx >= 4) dmg = Math.max(1, Math.round(dmg / 2));
    p.hp = Math.max(1, p.hp - dmg);
    Log.add(`你误触了修士布下的禁制！一道灵光炸开，气血 -${dmg}${p.realmIdx >= 4 ? '（神识预警，堪堪避开要害）' : ''}。`, 'loss');
  },
  /** 红尘劫：历练途中的道德三选一（相助得气运 / 打劫得孽障 / 袖手无事） */
  async dilemma() {
    const p = Game.player;
    p.counters.dilemmas = (p.counters.dilemmas || 0) + 1;   // v11 剧情计数
    const eco = GameData.stoneEco(p.realmIdx);
    const sc = Utils.pick(GameData.DILEMMAS);
    Log.add(`【红尘劫】${sc.text}`, 'event');
    const choice = await UI.popup({
      title: `红尘劫 · ${sc.title}`,
      html: `${sc.text}<br><br><span class="hl">一念善恶，因果自负。</span>`,
      options: Narrative.dilemmaOptions(),   // v5：选项措辞随道途而变，数值逻辑不变
    });
    if (choice === 'help') {
      const cost = Math.round(8 * eco);
      if (Bag.spendStones(cost)) {
        Log.add(`你解囊相助，散去灵石 ${Utils.fmtNum(cost)}。那人千恩万谢，连连称颂。`, 'info');
      } else {
        p.hp = Math.max(1, p.hp - Math.round(Stat.compute(p).maxHp * 0.08));
        Log.add('你囊中羞涩，便以真元渡了对方一程，自身气血小损。', 'info');
      }
      KarmaSys.addFortune(Utils.rand(8, 12));
    } else if (choice === 'rob') {
      const gain = Math.round(Utils.rand(12, 20) * eco);
      Bag.addStones(gain);
      let extra = '';
      if (Utils.chance(30)) {
        const mat = Utils.pick(GameData.matsByTier(Utils.clamp(Math.floor(p.realmIdx / 2) + 1, 1, 4)));
        Bag.addItem(mat, 1);
        extra = `、${GameData.ITEMS[mat].name} ×1`;
      }
      Log.add(`你趁乱下手，掠得灵石 ${Utils.fmtNum(gain)}${extra}。四下无人——可头上三尺，真的无人么？`, 'gain');
      KarmaSys.addKarma(Utils.rand(8, 12));
    } else {
      Log.add('你垂下眼帘，袖手而过。乱世修行，自渡尚且不暇。', 'info');
    }
  },
  async npc(map) {
    const p = Game.player;
    const st = Stat.compute(p);
    // §24 常驻修士：四成几率遇到已录入江湖的 NPC
    if (map && Utils.chance(40)) {
      const rid = NpcSys.npcAt(p, map.id);
      if (rid) { await NpcSys.encounter(p, rid); return; }
    }
    const kind = Utils.pickWeighted({ merchant: 30, hermit: 25, wounded: 25, doctor: 20 });
    // 邪修：正道修士避之如蛇蝎
    if (p.dao === 'demonic' && kind !== 'wounded') {
      const hostile = {
        merchant: '那云游商人一眼认出你周身萦绕的邪气，脸色骤变，仓皇收摊遁走。',
        hermit: '白发老者盯你半晌，冷哼一声：「邪修，也配问大道？」拂袖而去。',
        doctor: '妙手郎中冷冷扫你一眼：「医者仁心，不救魔头。」背起药篓便走。',
      }[kind];
      Log.add(hostile, 'warn');
      return;
    }
    Narrative.logScene('observe');   // v5：道途视角的打量
    if (kind === 'merchant') {
      const pool = ['w_qinggang', 'a_huxin', 'z_jifengxue', 'w_sanqing', 'a_xuangui', 'z_qiankun', 'w_zhuxian', 'a_longlin', 'z_taiji'];
      const affordable = pool.slice(Math.max(0, p.realmIdx - 1), Math.max(1, p.realmIdx + 3));
      const item = Utils.pick(affordable.length ? affordable : ['w_qinggang']);
      const def = GameData.ITEMS[item];
      const cost = Math.round(def.price * 0.7);
      Log.add('你遇到一位云游商人，他神秘兮兮地展示了一件货物。', 'event');
      const buy = await UI.popup({
        title: '云游商人',
        html: `「道友，可识得此宝？」<br><br><b>${def.name}</b> —— ${def.desc}<br>原价 ${Utils.fmtNum(def.price)}，今只收 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石。`,
        options: [{ text: '买下', value: true, primary: true }, { text: '不买', value: false }],
      });
      if (buy) {
        if (Bag.spendStones(cost)) {
          Bag.addItem(item, 1);
          Log.add(`你买下了 ${def.name}。`, 'gain');
        } else {
          Log.add('你摸了摸干瘪的储物袋，只能拱手告辞。', 'info');
        }
      } else {
        Log.add('你摇了摇头，商人也不恼，飘然而去。', 'info');
      }
    } else if (kind === 'hermit') {
      Log.add('一位白发老者拦住去路，目光如电：「小友，可愿听老朽一言？」', 'event');
      const choice = await UI.popup({
        title: '白发老者',
        html: '「老朽观你根骨尚可。这里有一篇入门感悟，也有一道考题，你选一样。」',
        options: [{ text: '聆听传功', value: 'teach' }, { text: '接受考较', value: 'test' }, { text: '婉言告辞', value: 'leave' }],
      });
      if (choice === 'teach') {
        const gain = Math.round(150 * GameData.eco(p.realmIdx));
        Cultivate.addExp(p, gain);
        Log.add(`老者一缕真传入体，你如醍醐灌顶！修为 +${Utils.fmtNum(gain)}。`, 'gain');
      } else if (choice === 'test') {
        const right = Utils.chance(55);
        const ans = await UI.popup({
          title: '大道之问',
          html: '「修行之本，为何？」<br><br>甲：「逆天改命，我命由我。」<br>乙：「顺其自然，道法自然。」',
          options: [{ text: '选 甲', value: 'a' }, { text: '选 乙', value: 'b' }],
        });
        const correct = (right && ans === 'a') || (!right && ans === 'b');
        if (correct) {
          const gain = Math.round(120 * GameData.eco(p.realmIdx));
          Cultivate.addExp(p, gain);
          p.insight = Math.min(100, p.insight + 5);
          Log.add(`「善。」老者抚须而笑。修为 +${Utils.fmtNum(gain)}，突破感悟 +5。`, 'gain');
        } else {
          const gain = Math.round(40 * GameData.eco(p.realmIdx));
          Cultivate.addExp(p, gain);
          Log.add(`「差强人意。」老者摇头离去，你略有感触。修为 +${Utils.fmtNum(gain)}。`, 'info');
        }
      } else {
        Log.add('你躬身一礼，自行赶路。', 'info');
      }
    } else if (kind === 'wounded') {
      Log.add('路旁倒着一名受伤的散修，气息奄奄，似在向你求救。', 'event');
      const hasPill = Bag.count('pill_liaoshang') > 0;
      const choice = await UI.popup({
        title: '受伤的散修',
        html: hasPill
          ? '「道友……救我……」他伤势极重，你身上正好有【疗伤丹】。'
          : '「道友……救我……」你身无丹药，但可以损耗自身真元为他续命（损失一成气血）。',
        options: hasPill
          ? [{ text: '赠予疗伤丹', value: 'pill' }, { text: '袖手旁观', value: 'leave' }]
          : [{ text: '以真元相救', value: 'qi' }, { text: '袖手旁观', value: 'leave' }],
      });
      if (choice === 'pill') {
        Bag.removeItem('pill_liaoshang', 1);
        const stones = Math.round(40 * GameData.stoneEco(p.realmIdx));
        Bag.addStones(stones);
        Log.add(`你递上疗伤丹，散修服下后面色好转，掏出一袋灵石相赠：灵石 ${Utils.fmtNum(stones)}。`, 'gain');
      } else if (choice === 'qi') {
        p.hp = Math.max(1, p.hp - Math.round(Stat.compute(p).maxHp * 0.1));
        const gain = Math.round(70 * GameData.eco(p.realmIdx));
        Cultivate.addExp(p, gain);
        Log.add(`你度入一缕真元，救他一命。他无以为报，将毕生感悟倾囊相授：修为 +${Utils.fmtNum(gain)}。`, 'gain');
      } else {
        Log.add('你终究没有停下脚步。修仙之路，本就是独行之路。', 'info');
      }
    } else {
      const cost = Math.round(8 * GameData.stoneEco(p.realmIdx));
      const free = p.attrs.luck >= 7 && Utils.chance(30);
      Log.add('一位背药篓的妙手郎中坐在道旁，正在整理草药。', 'event');
      if (free) {
        p.hp = Stat.compute(p).maxHp; p.mp = Stat.compute(p).maxMp;
        p.poison = Math.max(0, p.poison - 50);
        Log.add(`郎中见你面有风霜，笑道「结个善缘罢」，为你细细调理。气血灵力尽复，丹毒 -50。`, 'gain');
      } else {
        const ok = await UI.popup({
          title: '妙手郎中',
          html: `「看你气色，可要老夫调理一番？气血灵力尽复，丹毒 -50，只收 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石。」`,
          options: [{ text: '调理', value: true, primary: true }, { text: '不必', value: false }],
        });
        if (ok && Bag.spendStones(cost)) {
          p.hp = Stat.compute(p).maxHp; p.mp = Stat.compute(p).maxMp;
          p.poison = Math.max(0, p.poison - 50);
          Log.add('郎中手法如神，你只觉百脉通畅，伤势尽去。', 'gain');
        } else if (ok) {
          Log.add('你摸了摸储物袋，灵石不够，只得作罢。', 'info');
        }
      }
    }
  },
};

/* ======================================================================
 * §19 大道职业体系 DaoSys（六选一，筑基解锁，可弃道重修）
 * ====================================================================== */
const DaoSys = {
  get(p) { return p.dao ? GameData.DAO_CLASSES.find(d => d.id === p.dao) : null; },
  name(p) { const d = this.get(p); return d ? d.name : (p.realmIdx >= 1 ? '未定' : '——'); },
  /** v16 道境经验（daoExp[daoId]），由职业专属行为积累——不随修为境界绑定 */
  exp(p) { return (p.daoExp || {})[p.dao] || 0; },
  /** v16 道境层数：由道境经验推导（每重有独立经验阈值） */
  tierLevel(p) {
    if (!p || !p.dao) return 0;
    let lv = 0;
    for (const t of (GameData.DAO_TIERS[p.dao] || {}).tiers || []) {
      if (this.exp(p) >= t.need) lv++;
    }
    return lv;
  },
  /** v16 增加道境经验（各系统钩子调用）；经验跨过阈值即晋一重 */
  gain(p, amount, silent = false) {
    if (!p || !p.dao || !amount) return;
    const def = GameData.DAO_TIERS[p.dao];
    if (!def) return;
    if (!p.daoExp) p.daoExp = {};
    const before = this.tierLevel(p);
    p.daoExp[p.dao] = Math.min(2000000, (p.daoExp[p.dao] || 0) + amount);
    const after = this.tierLevel(p);
    if (after > before && !silent) {
      const t = def.tiers[after - 1];
      const CN = ['一', '二', '三', '四', '五', '六'];
      UI.announce(`✦ 道境晋升 · ${t.name}`, 'gold');
      Ambience.sfx('breakthrough');
      Log.add(`你于道途中再进一步——${def.name}晋入 <b>第${CN[after - 1]}重 · ${t.name}</b>！${t.desc}`, 'realm');
    }
  },
  /** v16 道境信息：{ def, lv 已入重数, exp 当前经验, cur 当前重, next 下一重, nextNeed 还需经验 } */
  tierInfo(p) {
    const def = p && p.dao ? GameData.DAO_TIERS[p.dao] : null;
    if (!def) return null;
    const lv = this.tierLevel(p);
    const exp = this.exp(p);
    const next = lv < def.tiers.length ? def.tiers[lv] : null;
    return {
      def, lv, exp,
      cur: lv > 0 ? def.tiers[lv - 1] : null,
      next,
      nextNeed: next ? Math.max(0, next.need - exp) : 0,
      curNeed: lv > 0 ? def.tiers[lv - 1].need : 0,
    };
  },
  /** v16 状态栏道境区块 HTML：当前重 + 经验条 + 下一重需求 + 获取方式 */
  statusHtml(p) {
    const t = this.tierInfo(p);
    if (!t) return '';
    const CN = ['一', '二', '三', '四', '五', '六'];
    const pct = t.next ? Utils.clamp((t.exp - t.curNeed) / (t.next.need - t.curNeed) * 100, 0, 100) : 100;
    return `<div class="stat-line"><span>${t.def.name}</span><b class="hl">${t.lv > 0 ? `第${CN[t.lv - 1]}重 · ${t.cur.name}` : '未入重'}</b></div>`
      + (t.cur ? `<div class="tip-line" style="margin:0 0 4px">· ${t.cur.desc}</div>` : '')
      + (t.next
        ? `<div class="dao-exp">
            <div class="bar" title="${t.def.expName} ${Math.floor(t.exp)} → ${t.next.need}"><div class="bar-fill exp" style="width:${pct}%"></div><span class="bar-text">${t.def.expName} ${Math.floor(t.exp)}/${t.next.need}</span></div>
            <div class="tip-line" style="margin:0 0 4px">· 下一重「${t.next.name}」：${t.def.expName}攒至 ${t.next.need} 可成</div>
          </div>`
        : `<div class="tip-line" style="margin:0 0 4px">· 六重已圆满，道境极境！</div>`)
      + `<div class="tip-line" style="margin:0 0 4px;color:var(--text-faint)">· ${t.def.expDesc}</div>`;
  },
  /** 大道对属性的直接影响（在 Stat.compute 中折算） */
  bonus(p) {
    const b = { atkPct: 0, defPct: 0, hpPct: 0, mpPct: 0 };
    if (p.dao === 'sword') { b.atkPct += 50; b.defPct -= 20; }
    if (p.dao === 'pill') { b.atkPct -= 15; }
    if (p.dao === 'body') { b.hpPct += 100; b.defPct += 50; }
    if (p.dao === 'body' && DaoSys.tierLevel(p) >= 2) b.hpPct += 10;   // v10 般若六境·炼脏境
    return b;
  },
  /** 大道选择弹窗 */
  openModal() {
    document.getElementById('dao-box').innerHTML = GameData.DAO_CLASSES.map(d => `
      <button class="dao-card" data-action="dao-pick" data-dao="${d.id}">
        <span class="dao-name">${d.name}</span>
        <span class="dao-motto">${d.motto}</span>
        <span class="dao-desc">${d.desc}</span>
      </button>`).join('');
    document.getElementById('dao-modal').classList.remove('hidden');
  },
  async pick(id) {
    const p = Game.player;
    if (!p || p.dao) { document.getElementById('dao-modal').classList.add('hidden'); return; }
    const d = GameData.DAO_CLASSES.find(x => x.id === id);
    if (!d) return;
    const ok = await UI.popup({
      title: '叩问大道',
      html: `自此一念，终身不悔。<br>确定以 <b>${d.name}</b> 为毕生大道吗？<br><span class="neg">大道一经选定，中途转道需跌落一个大境界。</span>`,
      options: [{ text: '此生不悔', value: true, primary: true }, { text: '再想想', value: false }],
    });
    if (!ok) return;
    p.dao = id;
    document.getElementById('dao-modal').classList.add('hidden');
    Log.add(`道途既定，此心不悔——你自此踏上 <b>${d.name}</b> 之路（${d.motto}）。`, 'system');
    UI.toast(`大道既定：${d.name}`);
    Game.afterAction();
  },
  /** 转修他道：跌落一个大境界、清空当前境界修为、清除原大道 */
  async changeDao() {
    const p = Game.player;
    if (!p || !p.dao) return;
    if (p.realmIdx < 1) { UI.toast('你尚未筑基，大道未成'); return; }
    const ok = await UI.popup({
      title: '转修他道',
      html: `转道逆天，代价惨重：<br>· <span class="neg">跌落一个大境界</span>（${GameData.REALM_NAMES[p.realmIdx]} → ${GameData.REALM_NAMES[p.realmIdx - 1]}）<br>· <span class="neg">当前境界修为尽失</span><br>· 原有大道加成尽数消散，须重新叩问大道<br><br>确定弃道重修吗？`,
      options: [{ text: '弃道重修', value: true }, { text: '罢了', value: false }],
    });
    if (!ok) return;
    p.realmIdx -= 1; p.layer = 0; p.exp = 0; p.insight = 0; p.dao = null;
    const st = Stat.compute(p);
    p.hp = Math.min(p.hp, st.maxHp); p.mp = Math.min(p.mp, st.maxMp);
    Log.add('你自废道基，逆天转道！一声长啸中境界跌落、修为尽散——自此之后，前路重新来过。', 'warn');
    UI.toast('大道已弃，前尘尽消');
    Game.afterAction();
    // 转道后重新叩问大道
    await Utils.sleep(400);
    this.openModal();
  },
  /** 体修不可修习玄级及以上法诀；v13 大道专属功法道途不合者不可修 */
  canLearnGongfa(p, def) {
    if (p.dao === 'body' && def.grade >= 2) {
      UI.toast('体修之躯，难悟玄级及以上法诀');
      Log.add('你运转体修功法，只觉神识滞涩——高阶法诀与肉身之道相悖，无从修习。', 'warn');
      return false;
    }
    if (def.daoLimit && p.dao !== def.daoLimit) {
      const dname = (GameData.DAO_CLASSES.find(x => x.id === def.daoLimit) || {}).name || '特定大道';
      UI.toast(`此乃${dname}秘传，道途不合，无从修习`);
      return false;
    }
    if (def.daoLimit && !p.dao) {
      const dname = (GameData.DAO_CLASSES.find(x => x.id === def.daoLimit) || {}).name || '特定大道';
      UI.toast(`此乃${dname}秘传——须先择定大道`);
      return false;
    }
    return true;
  },
};

/* ======================================================================
 * §20 气运因果 KarmaSys（气运 / 孽障 / 斩三尸 / 仇家偷袭）
 * ====================================================================== */
const KarmaSys = {
  addFortune(n, silent = false) {
    const p = Game.player;
    p.fortune = (p.fortune || 0) + n;
    if (!silent) Log.add(`冥冥之中似有天意垂青——气运 +${n}。`, 'gain');
  },
  addKarma(n, silent = false) {
    const p = Game.player;
    p.karma = (p.karma || 0) + n;
    if (!silent) Log.add(`因果簿上又添一笔血墨——孽障 +${n}。`, 'loss');
  },
  /** 气运：好事事件（宝箱/机缘/贵人）权重倍率，每10点+5% */
  goodEventMult(p) { return 1 + (p.fortune || 0) * 0.005; },
  /** 气运：稀有掉落加成（百分点），每10点+3% */
  rareDropBonus(p) { return Utils.clamp((p.fortune || 0) * 0.3, 0, 45); },
  /** 孽障：仇家偷袭概率（百分点），每10点+4% */
  ambushChance(p) { return Utils.clamp((p.karma || 0) * 0.4, 0, 60); },
  /** 斩三尸：孽障≥100 方可施展 */
  async slayCorpses() {
    const p = Game.player;
    if ((p.karma || 0) < 100) return;
    const ok = await UI.popup({
      title: '斩三尸',
      html: `孽障缠身（当前 ${p.karma}），已碍道途。<br>斩三尸者，斩善念、斩恶念、斩执念——<br>· 孽障清零<br><span class="neg">· 当前小境界修为尽数散去</span><br><span class="neg">· 永久损失 5% 全属性上限（已累计折损 ${(p.statLossPct || 0)}%）</span><br><br>此举凶险，道友三思。`,
      options: [{ text: '执剑，斩！', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    p.karma = 0;
    p.exp = 0;
    p.statLossPct = (p.statLossPct || 0) + 5;
    Log.add('你闭目内视，于识海深处斩出三剑——善尸、恶尸、执念尸应声而碎！孽障尽消。然大道五十、天衍四九，那缺失的一分，再也回不来了。', 'system');
    UI.toast('三尸已斩，因果暂清');
    Game.afterAction();
  },
};

/* ======================================================================
 * §21.5 v8 黄历 · 每日一签 DailySign（每日仪式：游戏内每日一支签，立即生效）
 * ====================================================================== */
const DailySign = {
  POOLS: [
    { id: 'luck',    w: 22, text: '上上签 · 灵气充盈', desc: '天地灵机今向你倾斜。',
      apply(p) { const g = Math.round(Cultivate.baseGain(p) * 5); Cultivate.addExp(p, g); return `修为 +${Utils.fmtNum(g)}`; } },
    { id: 'wealth',  w: 22, text: '上签 · 财源广进', desc: '袖里乾坤，今日偏财入账。',
      apply(p) { const s = Math.round(60 * GameData.stoneEco(p.realmIdx)); Bag.addStones(s); return `灵石 +${Utils.fmtNum(s)}`; } },
    { id: 'insight', w: 22, text: '中签 · 醍醐味', desc: '心头忽过一线清明。',
      apply(p) { p.insight = Math.min(100, p.insight + 8); return '突破感悟 +8'; } },
    { id: 'vigour',  w: 17, text: '中上签 · 气血调达', desc: '百脉舒畅，旧伤尽去。',
      apply(p) { const st = Stat.compute(p); p.hp = st.maxHp; p.mp = st.maxMp; return '气血灵力尽复'; } },
    { id: 'mishap',  w: 17, text: '下签 · 小有蹉跎', desc: '行路崴了脚，还破点小财。',
      apply(p) {
        const hpLoss = Math.max(1, Math.round(Stat.compute(p).maxHp * 0.12));
        p.hp = Math.max(1, p.hp - hpLoss);
        const sLoss = Math.min(p.stones.low, Math.round(15 * GameData.stoneEco(p.realmIdx)));
        p.stones.low -= sLoss;
        return `气血 -${Math.round(hpLoss)}、灵石 -${Utils.fmtNum(sLoss)}`;
      } },
  ],
  draw() {
    const p = Game.player;
    if (!p || p.dead) return;
    const today = Math.floor(p.day);
    if (p.signDay === today) { UI.toast('今日已求过签，明日再来'); return; }
    // v10 境界特性 · 仙眷（真仙）：必得上签及以上（滤去下签）
    const pools = p.realmIdx >= 9 ? this.POOLS.filter(x => x.id !== 'mishap') : this.POOLS;
    const total = pools.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total, item = pools[pools.length - 1];
    for (const x of pools) { r -= x.w; if (r <= 0) { item = x; break; } }
    const effect = item.apply(p);
    p.signDay = today;
    p.signText = item.text;
    p.signDesc = item.desc;
    Log.add(`【黄历】你诚心摇签，得一支<b>${item.text}</b>——${item.desc}（${effect}）`, item.id === 'mishap' ? 'warn' : 'gain');
    Game.afterAction();
  },
};

/* ======================================================================
 * §21 百艺坊 CraftSys（炼丹 / 画符）
 * ====================================================================== */
const CraftSys = {
  /** 成丹率：基础 × 丹道1.6 + 气运微助 */
  rate(p, recipe) {
    let r = recipe.rate;
    if (p.dao === 'pill') r *= 1.6;
    if (p.dao === 'pill' && DaoSys.tierLevel(p) >= 1) r += 10;   // v10 丹道三境·闻香境
    r += Utils.clamp((p.fortune || 0) * 0.1, 0, 15);
    if (p.dao === 'pill' && DaoSys.tierLevel(p) >= 6) return Utils.clamp(r, 40, 95);   // v10 丹道六境·太上境
    return Utils.clamp(r, 5, 95);
  },
  haveMats(p, recipe) {
    return Object.entries(recipe.need).every(([id, n]) => Bag.count(id) >= n);
  },
  /** 炼丹：耗药材，赌成丹；times>1 为批量连炉（药材不足自动停炉，汇总一行结算） */
  alchemy(recipeId, times = 1) {
    const p = Game.player;
    const r = GameData.ALCHEMY_RECIPES.find(x => x.id === recipeId);
    if (!r) return;
    times = Utils.clamp(Math.floor(Number(times)) || 1, 1, 99);
    const rate = this.rate(p, r);
    const out = GameData.ITEMS[r.out];
    let tried = 0, made = 0, critN = 0;
    const gainMap = {};
    while (tried < times) {
      if (!this.haveMats(p, r)) break;
      for (const [id, n] of Object.entries(r.need)) Bag.removeItem(id, n);
      p.counters.crafts = (p.counters.crafts || 0) + 1;   // v11 剧情计数
      Time.add(2);
      tried++;
      if (p.dead) break;
      if (Utils.chance(rate)) {
        DaoSys.gain(p, 25);   // v16 丹火
        const isCrit = Utils.chance(p.dao === 'pill' && DaoSys.tierLevel(p) >= 4 ? 15 : 10);   // v10 丹道六境·炉火纯青境
        const qty = isCrit ? 2 : 1;
        Bag.addItem(r.out, qty);
        p.counters.craftsOk = (p.counters.craftsOk || 0) + 1;   // v11 剧情计数
        DaoSys.gain(p, 8);   // v16 丹火：败炉亦有心得
        made += qty;
        if (isCrit) critN++;
        gainMap[r.out] = (gainMap[r.out] || 0) + qty;
      }
    }
    if (!tried) { UI.toast('药材不足'); return; }
    if (times === 1 && tried === 1) {
      // 单炉：保持原有文案
      if (made) {
        Log.add(`丹炉青烟直上，一缕丹香盈野——<b>${out.name}</b> ×${made} 出炉！${critN ? '（丹成上品，一炉双丹！）' : `（成丹率 ${rate.toFixed(0)}%）`}`, 'gain');
      } else {
        Log.add(`丹炉一声闷响，药力尽数散作飞灰……（药材已耗，成丹率 ${rate.toFixed(0)}%）`, 'loss');
      }
    } else {
      const parts = Object.entries(gainMap).map(([id, n]) => `${GameData.ITEMS[id].name} ×${n}`);
      Log.add(`你连开 ${tried} 炉：${made ? `成丹 ${parts.join('、')}${critN ? `（含上品双丹 ×${critN}）` : ''}` : '药材尽毁，未得丹药'}。（成丹率 ${rate.toFixed(0)}%）`, made ? 'gain' : 'loss');
    }
    Game.afterAction();
  },
  drawCost(p) { return Math.round(40 * GameData.stoneEco(p.realmIdx)); },
  /** 画符（符修专属）：耗灵石出符，可自用可售卖 */
  /** 画符（符修专属）：耗灵石出符，可自用可售卖；v13 起随境界逐步解锁新符箓
   *  v18：每日画符成本递增（首次 1×，每轮 +50%，最多 5 倍），防止印钞 */
  drawTalisman() {
    const p = Game.player;
    if (p.dao !== 'talisman') return;
    // v18：当日画符次数累加（每日重置）
    const today = Math.floor(p.day);
    if (p._drawDay !== today) { p._drawDay = today; p._drawCount = 0; }
    p._drawCount = (p._drawCount || 0) + 1;
    const costMult = 1 + Math.min(4, (p._drawCount - 1) * 0.5);
    const cost = Math.round(this.drawCost(p) * costMult);
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足，置不起朱砂灵纸'); return; }
    Time.add(1);
    let qty = 2 + Utils.rand(0, 2) + (p.realmIdx >= 2 ? 1 : 0) + (DaoSys.tierLevel(p) >= 1 ? 1 : 0);   // v10 符道三境·描符境
    if (Utils.chance(p.dao === 'talisman' && DaoSys.tierLevel(p) >= 2 ? 20 : 12)) qty *= 2;   // v10 符道六境·朱砂境
    if (DaoSys.tierLevel(p) >= 6) qty += 2;   // v10 符道六境·符仙境
    // v13 符池：随境界解锁高阶符箓
    const pool = ['tal_huoshe', 'tal_zilei'];
    if (p.realmIdx >= 1) pool.push('tal_jinguang', 'tal_jifengfu');
    if (p.realmIdx >= 2) pool.push('tal_fuling', 'tal_shigu');
    if (p.realmIdx >= 3) pool.push('tal_bingpo');
    if (p.realmIdx >= 4) pool.push('tal_posha');
    const out = {};
    for (let i = 0; i < qty; i++) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      out[pick] = (out[pick] || 0) + 1;
    }
    for (const [id, n] of Object.entries(out)) if (n) Bag.addItem(id, n);
    if (p.dao === 'talisman') DaoSys.gain(p, qty * 4);   // v16 符道：画符
    const parts = Object.entries(out).map(([id, n]) => `${GameData.ITEMS[id].name} ×${n}`);
    Log.add(`你焚香沐手，朱砂勾雷文、灵纸蕴符罡——成符 ${parts.join('、')}！`, 'gain');
    Game.afterAction();
  },
};

/* ======================================================================
 * §22 天劫渡劫 Tribulation（大境界突破三策博弈，替换原概率判定）
 * ====================================================================== */
const Tribulation = {
  state: null,
  /** 天劫威力：100 为基准，随目标境界每阶 +10，孽障推高、气运削减 */
  power(p, target = 2) { return Math.max(50, 100 + (target || 2) * 10 + (p.karma || 0) * 2.5 - (p.fortune || 0) * 2); },
  /** 境界劫难系数：目标境界越高，成算折损越重（金丹劫 −7% …… 真仙劫 −31.5%，下限 −50%） */
  realmPenalty(target) { return Utils.clamp(1 - (target || 2) * 0.035, 0.5, 1); },
  /** 护身法宝所需品级 ≈ 目标境界（筑基用灵级护心镜、金丹用玄级玄龟甲、元婴起用地级龙鳞宝甲） */
  artifactGrade(targetRealm) { return Utils.clamp(targetRealm, 1, 3); },
  findArtifact(p, grade) {
    for (const id of Object.keys(p.bag)) {
      const d = GameData.ITEMS[id];
      if (d && d.type === 'artifact' && d.slot === 'armor' && d.grade === grade) return { from: 'bag', id };
    }
    const eq = p.equipped.armor;
    const eqId = eq ? Utils.eqId(eq) : null;
    if (eqId && GameData.ITEMS[eqId].grade === grade) return { from: 'equipped', id: eqId };
    return null;
  },
  chances() {
    const S = this.state;
    const realmPenalty = this.realmPenalty(S.target);                 // 境界愈高，天劫愈凶
    const mult = Utils.clamp(1 - (S.power - 100) / 500, 0.35, 1.1) * realmPenalty;
    return {
      endure: Utils.clamp(S.base * 0.82 * mult, 3, 97),    // 硬抗：最低，成则根基深厚厚赐
      artifact: Utils.clamp(S.base * 1.3 * mult, 3, 97),   // 法宝挡劫：最高
      hide: Utils.clamp(S.base * 1.0 * mult, 3, 97),       // 借地躲劫：居中
    };
  },
  async run(bonus = 0) {
    const p = Game.player;
    const target = p.realmIdx + 1;
    Save.write('bak', Game.player);   // v6：冲关之前，自动备份至临时槽位，失利可回溯
    this.state = {
      target,
      base: Cultivate.breakthroughChance(p, bonus),
      power: this.power(p, target),
      artifact: this.findArtifact(p, this.artifactGrade(target)),
      busy: false, logs: [],
    };
    Log.add(`你收敛心神，向 <b>${GameData.REALM_NAMES[target]}</b> 境发起最后的冲击——刹那间天地变色，九霄雷云翻涌，<b>天劫</b>降临了！`, 'system');
    document.getElementById('tribulation-modal').classList.remove('hidden');
    this.render();
  },
  log(html, cls = 'log-warn') {
    if (this.state) this.state.logs.push({ html, cls });
    const box = document.getElementById('trib-log');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'log-entry ' + cls;
    div.innerHTML = html;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },
  render() {
    const S = this.state;
    if (!S) return;
    const p = Game.player;
    const c = this.chances();
    const art = S.artifact ? GameData.ITEMS[S.artifact.id] : null;
    const gradeName = GameData.GRADE_NAMES[this.artifactGrade(S.target)];
    document.getElementById('trib-box').innerHTML = `
      <div class="battle-head" style="color:var(--gold)">— 天 劫 将 至 —</div>
      <div class="card-desc" style="margin-bottom:8px">雷云压顶，劫威如狱。当前天劫威力 <b class="hl">${S.power.toFixed(0)}</b>
      （气运 ${p.fortune || 0} 削之，孽障 ${p.karma || 0} 长之）。<br>三策在手，生死自择——</div>
      <div class="trib-opts">
        <button class="btn trib-opt" data-action="trib-strategy" data-strategy="endure" ${S.busy ? 'disabled' : ''}>
          <span class="trib-name">硬抗天劫</span>
          <span class="trib-chance">成算 ${c.endure.toFixed(0)}%</span>
          <span class="trib-note">成功率最低 · 成则雷火淬体，得永久厚赐【根基深厚】：全属性 +20%，此后历劫难度皆降一成</span>
        </button>
        <button class="btn trib-opt" data-action="trib-strategy" data-strategy="artifact" ${S.busy || !art ? 'disabled' : ''}>
          <span class="trib-name">法宝挡劫</span>
          <span class="trib-chance">成算 ${c.artifact.toFixed(0)}%</span>
          <span class="trib-note">${art ? `耗去一件【${art.name}】` : `需一件${gradeName}护身法宝（防具）`} · 成则身负【根基虚浮】：此后历劫难度皆增一成五</span>
        </button>
        <button class="btn trib-opt" data-action="trib-strategy" data-strategy="hide" ${S.busy ? 'disabled' : ''}>
          <span class="trib-name">借地躲劫</span>
          <span class="trib-chance">成算 ${c.hide.toFixed(0)}%</span>
          <span class="trib-note">成功率居中 · 成亦无得，欺天而过，孽障 +10</span>
        </button>
      </div>
      <div id="trib-log" class="trib-log"></div>`;
    const logBox = document.getElementById('trib-log');
    if (logBox) {
      for (const { html, cls } of S.logs) {
        const div = document.createElement('div');
        div.className = 'log-entry ' + cls;
        div.innerHTML = html;
        logBox.appendChild(div);
      }
      logBox.scrollTop = logBox.scrollHeight;
    }
  },
  async choose(strategy) {
    const S = this.state;
    const p = Game.player;
    if (!S || S.busy || p.dead) return;
    S.busy = true;
    const c = this.chances();
    const chance = c[strategy];
    this.render();
    // 法宝挡劫：先耗去护身法宝
    if (strategy === 'artifact') {
      if (!S.artifact) { S.busy = false; this.render(); return; }
      const art = GameData.ITEMS[S.artifact.id];
      if (S.artifact.from === 'bag') Bag.removeItem(S.artifact.id, 1);
      else p.equipped.armor = null;
      Log.add(`你祭出 <b>${art.name}</b>，宝光冲霄，替你硬撼天雷！`, 'info');
    }
    const names = { endure: '以肉身硬抗天劫', artifact: '以法宝抵挡天劫', hide: '遁入地脉借地躲劫' };
    this.log(`你横下心来——${names[strategy]}！`, 'log-system');
    await Utils.sleep(700);
    // 天劫异象（心魔之权重随孽障增长）
    const phen = Utils.pickWeighted({
      ziqi: 25,
      xinmo: 15 + (p.karma || 0) * 0.5,
      xiangrui: 15,
      fanjie: 15 + ((p.karma || 0) >= 50 ? 10 : 0),
    });
    if (phen === 'ziqi') {
      p.fortune = (p.fortune || 0) + 20;
      this.log('东方紫气三万里，浩浩荡荡贯体而入——【紫气东来】！气运 +20。', 'log-gain');
    } else if (phen === 'xinmo') {
      p.karma = (p.karma || 0) + 15;
      this.log('心湖之中魔影森然，呢喃如潮——【心魔入侵】！孽障 +15。', 'log-loss');
    } else if (phen === 'xiangrui') {
      const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 2, 1, 4);
      const mat = Utils.pick(GameData.matsByTier(tier));
      Bag.addItem(mat, 1);
      this.log(`劫云缝隙间霞光垂落——【天降祥瑞】！得 ${GameData.ITEMS[mat].name} ×1。`, 'log-gain');
    } else {
      const lost = Math.round(p.exp * 0.1);
      p.exp = Math.max(0, p.exp - lost);
      this.log(`一道逆雷没入丹田——【天道反噬】！修为 -${Utils.fmtNum(lost)}。`, 'log-loss');
    }
    await Utils.sleep(800);
    // 渡劫结果
    if (Utils.chance(chance)) {
      p.realmIdx++; p.layer = 0; p.exp = Math.min(Math.floor((p.expOverflow || 0) / 2), GameData.layerNeed(p.realmIdx, 0) - 1); p.insight = 0; p.expOverflow = 0;
      p.breakStreak = 0;   // v8 挫而愈坚：成功即清零
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      NpcSys.onPlayerRealmUp(p); // §24 灵气潮汐：大境界突破，常驻修士亦随之一进
      const tsLine = Narrative.tribSuccess();   // v5：道途突破句
      if (tsLine) this.log(tsLine, 'log-realm');
      this.log('雷劫散尽，你于焦土之上缓缓睁眼——成了！', 'log-realm');
      UI.realmShow(GameData.REALM_ASCEND_TEXT[p.realmIdx] || '道基蜕变，气象一新。', GameData.REALM_AURA[p.realmIdx] || '#e8e8e8');   // v5：全屏异象 + 境界描写渐显
      Ambience.sfx('breakthrough');
      Log.add(`${Utils.pick(GameData.FLAVOR.breakSuccess)}`, 'realm');
      Log.add(`恭喜！你渡劫功成，晋入 <b>${GameData.REALM_NAMES[p.realmIdx]}</b> 期！寿元上限提升至 ${st.lifespan} 岁。`, 'realm');
      if (strategy === 'endure') {
        p.rootDeep = true; p.rootWeak = false;
        Log.add('雷火淬体，道基如金——得永久厚赐【根基深厚】：全属性 +20%，此后历劫难度皆降一成。', 'gain');
      } else if (strategy === 'artifact') {
        p.rootWeak = true; p.rootDeep = false;
        Log.add('借宝渡劫，终究隔了一层——身负【根基虚浮】：此后历劫难度皆增一成五。', 'warn');
      } else {
        p.karma = (p.karma || 0) + 10;
        Log.add('你遁地避雷，欺天而过——因果自负，孽障 +10。', 'warn');
      }
      UI.announce(`渡劫功成 · 晋入${GameData.REALM_NAMES[p.realmIdx]}期`, 'gold');   // v4
      UI.toast(`渡劫成功！${GameData.REALM_NAMES[p.realmIdx]}期`);
    } else {
      // §24 渡劫虚弱期：道侣/结拜概率护法
      const aid = NpcSys.tryAid(p, 'trib');
      // v10 境界特性 · 劫体（渡劫起）：失利保留九成修为
      const keepPct = p.realmIdx >= 8 ? 0.9 : (aid ? 0.8 : 0.6);
      let insGain;
      if (aid) {
        p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * keepPct);
        insGain = 10;
        p.insight = Math.min(100, p.insight + insGain);
        this.log(`危难之际，<b>${aid.name}</b> 护法相助，为你护住道基！`, 'log-gain');
      } else {
        p.exp = Math.round(GameData.layerNeed(p.realmIdx, 3) * keepPct);
        insGain = 15;
        p.insight = Math.min(100, p.insight + insGain);
      }
      // v8 挫而愈坚：连败保底，越挫越勇
      p.breakStreak = (p.breakStreak || 0) + 1;
      const streakBonus = Math.min(15, p.breakStreak * 5);
      if (p.breakStreak >= 2) this.log(`【挫而愈坚】你已连败 ${p.breakStreak} 次——道心反而愈发坚韧，下次成算 +${streakBonus}%！`, 'log-gain');
      // §26 大乘渡劫失败：窥得兵解转世之机
      if (S.target === 8 && !p.dead) {
        p.canReincarnate = true;
        this.log('大道崩殂，仙路断绝……然冥冥中你窥见一线生机：<b>兵解转世</b>之机（修炼页可用）。', 'log-warn');
      }
      this.log('雷光贯体，你喷血倒飞，勉强保住道基……', 'log-loss');
      const tfLine = Narrative.tribFail();   // v5：道途挫败句
      if (tfLine) this.log(tfLine, 'log-loss');
      UI.realmShow(Utils.pick(GameData.REALM_FAIL_TEXT), '#d05b5b');   // v5：失败亦有异象
      Log.add(`${Utils.pick(GameData.FLAVOR.breakFail)}（突破感悟 +${insGain}，修为有所损耗）`, 'loss');
      UI.announce('渡 劫 失 利 · 天 劫 未 过', 'bad');   // v4
      // v6：渡劫失利，可选择回溯到引动天劫之前
      const rollback = await UI.popup({
        title: '渡劫失利 · 回溯因果',
        html: `天劫未过，折损已定。<br>是否回溯因果，回到<b>引动天劫之前</b>的那一刻？<br><span class="neg">回溯后：本次渡劫的机缘与损耗尽数抹去，天劫重新酝酿。</span>`,
        options: [{ text: '回溯因果', value: true, primary: true }, { text: '继续前行', value: false }],
      });
      if (rollback && Game.rollbackBackup()) {
        // v18：回溯因果须付出代价——孽障+8，防止无限SL
        const p = Game.player;
        if (p) { p.karma = Math.min(100, (p.karma || 0) + 8); Log.add('因果逆转，孽障缠身（孽障 +8）。', 'loss'); }
        document.getElementById('tribulation-modal').classList.add('hidden');
        this.state = null;
        return;
      }
    }
    // §24 渡劫虚弱期：宿敌趁火打劫
    let ambushNpc = null;
    if (!p.dead) {
      const ambId = NpcSys.tribAmbush(p);
      if (ambId) {
        const saved = p.partner && Utils.chance(55) ? p.partner
          : ((p.sworn || []).length && Utils.chance(40) ? p.sworn[0] : null);
        if (saved) {
          p.npcs[saved].rel = Utils.clamp(p.npcs[saved].rel + 5, -100, 100);
          this.log(`千钧一发之际，<b>${NpcSys.def(saved).name}</b> 自天外赶来，一剑逼退偷袭者！`, 'log-gain');
        } else {
          ambushNpc = ambId;
          this.log(`劫云未散，杀机已至——<b>${NpcSys.def(ambId).name}</b> 趁你渡劫虚弱，悍然出手偷袭！`, 'log-loss');
        }
        await Utils.sleep(700);
      }
    }
    await Utils.sleep(900);
    document.getElementById('tribulation-modal').classList.add('hidden');
    this.state = null;
    p.pendingDao = true; // 初入筑基（或转世重修）叩问大道；若遇偷袭则战后开启
    Game.afterAction();
    if (ambushNpc) {
      await Utils.sleep(400);
      Battle.start(null, { enemy: NpcSys.buildEnemy(p, ambushNpc), npcId: ambushNpc, mode: 'hunt', ambush: true, mapName: '渡劫之地' });
    }
  },
};

/* ======================================================================
 * §23 世界大事件 WorldSys（每 100 游戏年一次全图大事，永久改变格局）
 * ====================================================================== */
const WorldSys = {
  freshWorld() {
    return { nextEventYear: 100, pending: null, history: [], magicMaps: [], preachUntil: 0, ruinsUntil: 0, warUntil: 0, priceMul: 1, market: null };
  },
  year(p) { return Math.floor((p.day || 0) / 365) + 1; },
  isMagic(p, mapId) { const w = p.world; return !!(w && w.magicMaps && w.magicMaps.includes(mapId)); },
  preachActive(p) { const w = p.world; return !!(w && w.preachUntil && this.year(p) <= w.preachUntil); },
  ruinsActive(p) { const w = p.world; return !!(w && w.ruinsUntil && this.year(p) <= w.ruinsUntil); },
  warActive(p) { const w = p.world; return !!(w && w.warUntil && this.year(p) <= w.warUntil); },
  priceMul(p) { return this.warActive(p) ? 1.15 : 1; },
  /* ---------- v5：坊市行情 ---------- */
  /** 每 30 游戏日换一茬市况种子；种子持久化，读档后行情不变 */
  marketState(p) {
    const w = p.world;
    if (!w) return { seed: 0, next: 0 };
    const day = Math.floor(p.day || 0);
    if (!w.market || day >= w.market.next) {
      w.market = { seed: Utils.hashStr('mkt' + day + ':' + Math.floor(Math.random() * 1e9)), next: day + 30 };
    }
    return w.market;
  },
  /** 单件商品的行情系数：0.8 ~ 1.2，同 30 日内稳定（确定性哈希） */
  marketMul(p, itemId) {
    const m = this.marketState(p);
    const h = Utils.hashStr(itemId + '@' + m.seed);
    return 0.8 + (h % 1001) / 1000 * 0.4;
  },
  marketDaysLeft(p) {
    const m = this.marketState(p);
    return Math.max(0, m.next - Math.floor(p.day || 0));
  },
  /** 每逢年份推进调用（displayYear = floor(day/365)+1） */
  onYear(p, y) {
    const w = p.world;
    if (!w) return;
    NpcSys.yearTick(p, y);
    if (w.preachUntil && y > w.preachUntil) { w.preachUntil = 0; Log.add('圣地讲道落幕，道音散入天地之间。', 'system'); }
    if (w.ruinsUntil && y > w.ruinsUntil) { w.ruinsUntil = 0; Log.add('上古秘境重归虚妄，机缘之门缓缓关闭。', 'system'); }
    if (w.warUntil && y > w.warUntil) { w.warUntil = 0; w.priceMul = 1; Log.add('宗门大战落幕，各方罢兵言和，物价渐归平常。', 'system'); }
    if (y >= w.nextEventYear) { w.nextEventYear = y + 100; this.fireEvent(p, y); }
  },
  fireEvent(p, y) {
    const w = p.world;
    const type = Utils.pickWeighted({ demon: 30, preach: 25, ruins: 25, war: 20 });
    const ev = { type, year: y };
    let text = '';
    if (type === 'demon') {
      const candidates = GameData.MAPS.filter(m => m.id !== 'village' && !w.magicMaps.includes(m.id));
      const map = candidates.length ? Utils.pick(candidates) : Utils.pick(GameData.MAPS);
      w.magicMaps.push(map.id);
      ev.mapId = map.id;
      text = `<b>魔界入侵</b>——魔气吞没 ${map.name}！此后其地化为<b>魔域</b>：妖魔狂化暴增，凶险倍之，然魔物所获亦丰。`;
    } else if (type === 'preach') {
      w.preachUntil = y + 10;
      text = `<b>圣地讲道</b>——道音涤荡神魂，此后十年天下修士<b>悟性倍增</b>。`;
    } else if (type === 'ruins') {
      w.ruinsUntil = y + 20;
      text = `<b>上古秘境现世</b>——此后二十年秘宝频现，历练中的<b>宝箱与机缘遍地</b>。`;
    } else {
      w.warUntil = y + 30;
      w.priceMul = 1.15;
      text = `<b>宗门大战</b>——此后三十年宗门悬赏暴涨，坊市<b>物价腾贵</b>。`;
    }
    w.history.push({ year: y, type });
    if (w.history.length > 8) w.history.shift();
    w.pending = ev;
    const def = GameData.WORLD_EVENTS.find(e => e.id === type);
    Log.add(`【天下大事 · 第${y}年】${text}`, 'system');
    Log.add(`${def ? def.name : ''}之卡已现于「游历」页——参与或观望，一念自决。`, 'event');
  },
  /** 参与大事件：各得其赏 */
  async joinEvent() {
    const p = Game.player;
    const w = p.world;
    if (!w.pending) return;
    const ev = w.pending;
    w.pending = null;
    if (ev.type === 'demon') {
      const map = GameData.MAPS.find(m => m.id === ev.mapId) || GameData.MAPS[1];
      Log.add('你奔赴魔域前线，与狂化的魔物战作一团！', 'event');
      const mid = Utils.pickWeighted(map.pool); // 地图池为加权对象 [{id, weight}]
      const en = buildMonster(mid, Math.max(0, p.realmIdx * 4 + 2 - GameData.MONSTERS[mid].power));
      en.elite = true;
      en.hpMax = Math.round(en.hpMax * 1.4); en.atk = Math.round(en.atk * 1.25);
      en.expGain = Math.round(en.expGain * 1.6); en.stoneGain = Math.round(en.stoneGain * 1.8);
      en.hp = en.hpMax;
      Game.afterAction();
      Battle.start(null, { enemy: en, weType: 'demon', mapName: '魔域前线' });
      return;
    }
    if (ev.type === 'preach') {
      const gain = Math.round(260 * GameData.eco(p.realmIdx));
      Cultivate.addExp(p, gain);
      p.insight = Math.min(100, p.insight + 15);
      Time.add(10);
      Log.add(`你在圣地一坐十日，听道音如饮甘露——修为 +${Utils.fmtNum(gain)}，突破感悟 +15。`, 'gain');
    } else if (ev.type === 'ruins') {
      Bag.addItem('m_gupian', 2);
      const stones = Math.round(60 * GameData.stoneEco(p.realmIdx));
      Bag.addStones(stones);
      Time.add(10);
      Log.add(`你于现世秘境中寻得上古法宝碎片 ×2、灵石 ${Utils.fmtNum(stones)}。`, 'gain');
    } else if (ev.type === 'war') {
      const ids = Object.keys(p.npcs).filter(id => p.npcs[id].alive && p.partner !== id && !(p.sworn || []).includes(id));
      const nid = ids.length ? Utils.pick(ids) : null;
      if (nid) {
        Log.add('你投入宗门战团，与敌对修士战作一团！', 'event');
        Game.afterAction();
        Battle.start(null, { enemy: NpcSys.buildEnemy(p, nid), npcId: nid, mode: 'war', mapName: '宗门战场' });
        return;
      }
      const stones = Math.round(50 * GameData.stoneEco(p.realmIdx));
      Bag.addStones(stones);
      Time.add(10);
      Log.add(`你在战乱中辗转护送商旅，得灵石 ${Utils.fmtNum(stones)}。`, 'gain');
    }
    Game.afterAction();
  },
  /** 观望：不参与 */
  async skipEvent() {
    const w = Game.player.world;
    if (!w.pending) return;
    w.pending = null;
    Log.add('你选择静观其变——天下大势，终究与局中人无碍。', 'info');
    Game.afterAction();
  },
};

/* ======================================================================
 * §11.8 v13 悬赏任务板 BountySys（坊市每日刷新三张悬赏）
 * 类型：猎杀妖兽 / 上交材料 / 切磋获胜；未领的悬赏可存续两日。
 * ====================================================================== */
const BountySys = {
  freshBounties(p) {
    const rp = p.realmIdx * 4 + p.layer;
    const list = [];
    // 猎杀
    const pool = SectSys.taskMonsters(rp);
    if (pool.length) {
      const mid = Utils.pick(pool);
      const need = Utils.rand(3, 6);
      list.push({ type: 'kill', target: mid, need, progress: 0, name: `猎杀 · ${GameData.MONSTERS[mid].name}`, desc: `击杀 ${GameData.MONSTERS[mid].name} ×${need}` });
    }
    // 收集
    const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 1, 1, 4);
    const mats = GameData.matsByTier(tier);
    if (mats.length) {
      const mid = Utils.pick(mats);
      const need = Utils.rand(3, 6);
      list.push({ type: 'collect', target: mid, need, progress: 0, name: `收购 · ${GameData.ITEMS[mid].name}`, desc: `上交 ${GameData.ITEMS[mid].name} ×${need}` });
    }
    // 切磋
    list.push({ type: 'spar', target: null, need: 1, progress: 0, name: '较技 · 以武会友', desc: '赢得一场切磋（江湖页发起）' });
    return list;
  },
  stateOf(p) {
    if (!p.bounties) p.bounties = { day: Math.floor(p.day), list: [] };
    const today = Math.floor(p.day);
    if (!p.bounties.list.length || today - p.bounties.day > 2) {
      p.bounties = { day: today, list: this.freshBounties(p) };
    }
    return p.bounties;
  },
  rewards(p) {
    const realm = p.realmIdx;
    return { stones: Math.round(60 * GameData.stoneEco(realm)), contrib: 25 + realm * 15 };
  },
  submit(idx) {
    const p = Game.player;
    const B = this.stateOf(p);
    const t = B.list[idx];
    if (!t || t.type !== 'collect' || t.progress >= t.need) return;
    const have = Bag.count(t.target);
    if (have <= 0) { UI.toast('背包中没有所需材料'); return; }
    const take = Math.min(have, t.need - t.progress);
    Bag.removeItem(t.target, take);
    t.progress += take;
    Log.add(`你把 ${GameData.ITEMS[t.target].name} ×${take} 交予悬赏行商。`, 'info');
    if (t.progress >= t.need) Log.add('悬赏已然达成，可领取赏格！', 'gain');
    Game.afterAction();
  },
  claim(idx) {
    const p = Game.player;
    const B = this.stateOf(p);
    const t = B.list[idx];
    if (!t || t.progress < t.need) return;
    const r = this.rewards(p);
    Bag.addStones(r.stones);
    if (p.sect) p.sect.contrib += r.contrib;
    if (Utils.chance(25)) KarmaSys.addFortune(2);
    Ambience.sfx('bounty');
    Log.add(`悬赏【${t.name}】交付！赏得灵石 ${Utils.fmtNum(r.stones)}${p.sect ? `、宗门贡献 +${r.contrib}` : ''}。`, 'gain');
    B.list[idx] = null;
    Game.afterAction();
  },
  /** 战斗胜利钩子（Battle.victory 调用） */
  onKill(monsterId) {
    const p = Game.player;
    if (!p.bounties) return;
    for (const t of p.bounties.list) {
      if (t && t.type === 'kill' && t.target === monsterId && t.progress < t.need) {
        t.progress++;
        if (t.progress >= t.need) Log.add('悬赏猎杀已然达成，可去坊市领取赏格！', 'gain');
        else Log.add(`悬赏进度：${t.progress}/${t.need}。`, 'info');
      }
    }
  },
  /** 切磋胜利钩子 */
  onSpar() {
    const p = Game.player;
    if (!p.bounties) return;
    for (const t of p.bounties.list) {
      if (t && t.type === 'spar' && t.progress < t.need) {
        t.progress++;
        Log.add('悬赏【以武会友】已然达成，可去坊市领取赏格！', 'gain');
      }
    }
  },
};

/* ======================================================================
 * §11.9 v13 黑市 BlackSys（每月开市三日：暗巷奇货 / 高价收购 / 福缘陷阱）
 * 开市规则：游戏日内 day % 30 < 3；货物按日哈希确定性生成。
 * 陷阱货：来路不明的超低价——福缘高者捡漏，福缘低者破财。
 * ====================================================================== */
const BlackSys = {
  isOpen(p) { return Math.floor(p.day || 0) % 30 < 3; },
  daysLeft(p) { return 3 - Math.floor(p.day % 30); },
  POOL: [
    { id: 'm_qianghua', w: 16 }, { id: 'm_neidan', w: 14 }, { id: 'seed_xuelian', w: 10 },
    { id: 'seed_lianhun', w: 10 }, { id: 'm_xingchen', w: 8 }, { id: 'm_huolin', w: 12 },
    { id: 'tal_bingpo', w: 10 }, { id: 'tal_posha', w: 8 }, { id: 'pill_xuanling', w: 10 },
    { id: 's_cx_gou', w: 5 }, { id: 's_xt_pei', w: 5 }, { id: 'gf_feixian', w: 5 },
    { id: 'm_bingpo', w: 12 }, { id: 'seed_xingchen', w: 4 }, { id: 'm_xuecan', w: 10 },
  ],
  /** 暗巷货（确定性哈希）：今日四件货物 */
  goods(p) {
    const day = Math.floor(p.day);
    const seed = Utils.hashStr('black' + day);
    const out = [];
    const used = new Set();
    for (let i = 0; i < 4; i++) {
      let h = Utils.hashStr('b' + seed + ':' + i) % this.POOL.length;
      let guard = 0;
      while (used.has(this.POOL[h].id) && guard++ < 20) h = (h + 1) % this.POOL.length;
      const g = this.POOL[h];
      used.add(g.id);
      out.push(g.id);
    }
    return out;
  },
  /** 黑市售价：基准 × 1.6 × 境界经济（材料类随行情） */
  price(p, id) {
    const def = GameData.ITEMS[id];
    let base = def.price || 500;
    if (def.ecoPrice) base = Math.round(base * GameData.stoneEco(p.realmIdx));
    return Math.max(1, Math.round(base * 1.6));
  },
  buy(id) {
    const p = Game.player;
    this.buyAsync(id, this.price(p, id));
  },
  async buyAsync(id, cost) {
    const p = Game.player;
    const def = GameData.ITEMS[id];
    const ok = await UI.popup({
      title: '黑市 · 暗巷交易',
      html: `「识货的道友——」蒙面商贾掀开布角：<br><b>${def.name}</b><br>${def.desc}<br>索价 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石（坊市价高六成）。`,
      options: [{ text: '买 下', value: true, primary: true }, { text: '摇头离去', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    Bag.addItem(id, 1);
    Log.add(`你在暗巷购得 <b>${def.name}</b>，花费 ${Utils.fmtNum(cost)} 灵石。蒙面人转身没入黑暗。`, 'info');
    Game.afterAction();
  },
  /** 陷阱货：超低价的「来路不明」之物 */
  async buyMystery() {
    const p = Game.player;
    const day = Math.floor(p.day);
    if ((p.mysteryDay || -1) === day) { UI.toast('今日的便宜货你已看过，无利可图'); return; }
    const cost = Math.round(200 * GameData.stoneEco(p.realmIdx));
    const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 1, 1, 4);
    const mat = Utils.pick(GameData.matsByTier(tier));
    const ok = await UI.popup({
      title: '来路不明的储物袋',
      html: `巷角有一个血渍未干的储物袋，摊主开价 <span class="hl">${Utils.fmtNum(cost)}</span> 灵石——袋里似有<b>${GameData.ITEMS[mat].name}</b>的光泽。<br><span class="neg">福缘高者或可捡漏，福缘低者……恐怕要破财免灾。</span>`,
      options: [{ text: '赌一手', value: true }, { text: '不碰晦气', value: false }],
    });
    if (!ok) return;
    if (!Bag.spendStones(cost)) { UI.toast('灵石不足'); return; }
    p.mysteryDay = day;
    const luck = p.attrs.luck + Math.floor((p.fortune || 0) / 20);
    const roll = Math.random() * 100;
    if (roll < 25 + luck * 4) {
      Bag.addItem(mat, 2);
      Bag.addItem('m_gupian', 1);
      Log.add(`你赌对了！袋中竟是${GameData.ITEMS[mat].name} ×2，夹层里还藏着一枚上古法宝碎片——今日的运气，值了。`, 'gain');
      Ambience.sfx('rare');
    } else if (roll < 60) {
      Bag.addItem(mat, 1);
      Log.add(`袋中确有${GameData.ITEMS[mat].name} ×1，不算亏，也不算赚。`, 'info');
    } else {
      KarmaSys.addKarma(4, true);
      const fine = Math.round(100 * GameData.stoneEco(p.realmIdx));
      if (p.stones.low >= fine) p.stones.low -= fine;
      Log.add(`袋中只有几块破布——这是一桩栽赃的买卖！失主寻来，你只得赔钱了事：灵石 -${Utils.fmtNum(fine)}，还沾了一身晦气（孽障 +4）。`, 'loss');
      UI.toast('破财免灾……', true);
    }
    Game.afterAction();
  },
};

/* ======================================================================
 * §11.10 v13 天骄榜 RankSys（江湖页：二十四修士与你的境界排名）
 * 登顶者得「天下第一」称号：全属性 +2%，每日首次查看再领气运。
 * ====================================================================== */
const RankSys = {
  /** 全榜：[{id:'me'|npcId, name, power, alive}] 按战力降序 */
  board(p) {
    const rows = GameData.NPCS.filter(d => p.npcs[d.id] && p.npcs[d.id].alive)
      .map(d => ({ id: d.id, name: d.name, power: p.npcs[d.id].realmIdx * 4 + p.npcs[d.id].layer }));
    rows.push({ id: 'me', name: p.name + '（你）', power: p.realmIdx * 4 + p.layer });
    rows.sort((a, b) => b.power - a.power);
    return rows;
  },
  isTop(p) {
    const myPow = p.realmIdx * 4 + p.layer;
    return GameData.NPCS.every(d => !p.npcs[d.id] || !p.npcs[d.id].alive || p.npcs[d.id].realmIdx * 4 + p.npcs[d.id].layer <= myPow);
  },
  /** 登顶每日气运：每天首次查看天骄榜且在榜首时领取 */
  dailyReward(p) {
    if (!this.isTop(p)) return false;
    const today = Math.floor(p.day);
    if ((p.topTitle || {}).day === today) return false;
    p.topTitle = { day: today };
    KarmaSys.addFortune(2);
    Log.add('【天骄榜】你名压群雄，独占鳌头——气运 +2。（每日登顶皆有小赏）', 'gain');
    return true;
  },
  render(p) {
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    const top = this.isTop(p);
    const rowsHtml = rows.slice(0, 10).map((r, i) => `
      <div class="rank-row ${r.id === 'me' ? 'me' : ''}">
        <span class="rank-no ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span>
        <span class="rank-name">${Utils.esc(r.name)}</span>
        <span class="rank-pow">${GameData.REALM_NAMES[Math.min(9, Math.floor(r.power / 4))]}${GameData.LAYER_NAMES[Utils.clamp(r.power % 4, 0, 3)]}</span>
      </div>`).join('');
    return `
    <div class="card">
      <div class="card-title">✦ 天骄榜 ${top ? '<span class="tag warn">天下第一 · 全属性 +2%</span>' : `<span class="tag">你的排名 · 第 ${myIdx + 1} 位</span>`}</div>
      <div class="card-desc">修行界二十四位风云人物与你的境界排名。登顶者名动天下：全属性 +2%，每日另有气运小赏。</div>
      <div class="rank-list">${rowsHtml}</div>
    </div>`;
  },
};

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
      };
    }
    return o;
  },
  def(id) { return GameData.NPCS.find(n => n.id === id) || null; },
  state(p, id) { return (p.npcs && p.npcs[id]) || null; },
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
    return { id: cand, name: this.def(cand).name };
  },
  afterSpar(p, id, won) {
    const s = this.state(p, id);
    if (!s) return;
    s.met = true;
    s.rel = Utils.clamp(s.rel + (won ? 5 : 2), -100, 100);
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
  /** 游历途中的常驻 NPC 遭遇 */
  async encounter(p, id) {
    const d = this.def(id);
    const s = this.state(p, id);
    if (!d || !s || !s.alive) return;
    s.met = true;
    Meta.see('npc', id);   // v6 图鉴
    const greet = Narrative.greet();   // v5：道途礼数
    Log.add(`途中遇上了 ${GameData.SECTS.find(x => x.id === d.sect) ? GameData.SECTS.find(x => x.id === d.sect).name + '的' : ''}<b>${d.name}</b>（${d.title}）。${greet ? `<span style="color:var(--text-faint)">（${greet}）</span>` : ''}`, 'event');
    if (s.grudge) { await this.peacemake(id); return; }
    const choice = await UI.popup({
      title: `偶遇 · ${d.name}`,
      html: `${d.desc}<br>你们在 ${Utils.esc((GameData.MAPS.find(m => m.id === s.map) || {}).name || '山野')} 间打了个照面。`,
      options: [
        { text: '叙话论道', value: 'chat', primary: true },
        { text: '请教一二', value: 'ask' },
        { text: '转身离去', value: 'leave' },
      ],
    });
    if (choice === 'chat') {
      s.rel = Utils.clamp(s.rel + Utils.rand(2, 5), -100, 100);
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
 * §25 肉鸽式秘境 DungeonSys（随机节点路线 / 撤离 / 陨落惩罚 / 本命法宝）
 * ====================================================================== */
const DungeonSys = {
  /** 深度收益倍率 */
  dm(depth) { return 1 + depth * 0.25; },
  enter(idx) {
    const p = Game.player;
    if (Battle.active || p.dead) return;
    const R = GameData.SECRET_REALMS[idx];
    if (!R) return;
    if (p.realmIdx < R.recRealm) { UI.toast(`需 ${GameData.REALM_NAMES[R.recRealm]}期方可入内`); return; }
    Meta.see('realm', R.id);   // v6 图鉴
    p.dungeon = { realm: idx, depth: 0, total: GameData.DUNGEON_TOTAL_LAYERS, choices: [], gains: [], stuck: false };
    this.genChoices(p.dungeon);
    Log.add(`你寻得入口，踏入 <b>${R.name}</b>——雾气在身后合拢，退路只剩来时那条。`, 'system');
    Game.activeTab = 'map';
    Game.afterAction();
  },
  /** 随机节点路线：每层二选一，最深处为守关者 */
  genChoices(D) {
    const R = GameData.SECRET_REALMS[D.realm];
    if (D.depth >= D.total - 1) { D.choices = ['boss']; D.stuck = false; return; }
    const w = { ...R.weights };
    const bias = D.depth * 2;
    w.battle += bias;                                  // 愈深愈多战
    w.trap += Math.floor(bias / 2);                    // 愈深愈多陷阱
    w.treasure = Math.max(6, w.treasure - Math.floor(bias / 3));
    const types = [];
    let guard = 0;
    while (types.length < 2 && guard++ < 30) {
      const t = Utils.pickWeighted(w);
      if (!types.includes(t)) types.push(t);
    }
    D.choices = types.length ? types : ['battle', 'treasure'];
    D.stuck = false;
  },
  makeEnemy(R, depth, forceElite = false) {
    const mid = Utils.pick(R.pool);
    const target = R.recRealm * 4 + Math.floor(depth * 0.8);
    const e = buildMonster(mid, Math.max(0, target - GameData.MONSTERS[mid].power));
    if (forceElite || Utils.chance(12 + depth * 3)) {
      e.elite = true;
      e.hpMax = Math.round(e.hpMax * 1.6);
      e.atk = Math.round(e.atk * 1.3);
      e.expGain = Math.round(e.expGain * 2);
      e.stoneGain = Math.round(e.stoneGain * 2);
    }
    return e;
  },
  gain(D, text) { D.gains.push(text); if (D.gains.length > 12) D.gains.shift(); },
  /** 失传功法产出（已学已藏则折算碎片） */
  grantLostGongfa(p) {
    const pool = ['gf_wangchen', 'gf_hunyuan', 'gf_niepan'].filter(id => !p.gongfa[id] && !p.bag[id]);
    if (!pool.length) {
      Bag.addItem('m_gupian', 2);
      return null;
    }
    const id = Utils.pick(pool);
    Bag.addItem(id, 1);
    return GameData.ITEMS[id].name;
  },
  async resolve(i) {
    const p = Game.player;
    const D = p.dungeon;
    if (!D || D.stuck || Battle.active) return;
    const type = D.choices[i];
    if (!type) return;
    const R = GameData.SECRET_REALMS[D.realm];
    const dm = this.dm(D.depth);
    D.choices = [];
    if (type === 'battle') {
      const e = this.makeEnemy(R, D.depth);
      Log.add(`你循着灵光拐过一道石廊——<b>${e.name}</b> 自阴影中扑来！`, 'event');
      Game.afterAction();
      Battle.start(null, { enemy: e, dungeon: { realm: D.realm, depth: D.depth }, mapName: R.name });
      return;
    }
    if (type === 'boss') {
      const e = this.makeEnemy(R, D.depth + 2, true);
      Log.add('雾气骤然退散——守关者自沉眠中睁开了眼睛！<b>此乃秘境最深处，胜则满载而归！</b>', 'system');
      Game.afterAction();
      Battle.start(null, { enemy: e, dungeon: { realm: D.realm, depth: D.depth }, boss: true, mapName: R.name + ' · 最深处' });
      return;
    }
    // v17 非战斗节点：处理 → 结算演出卡（图标 + 结果摘要 + 继续深入）
    let result = null;
    if (type === 'treasure') {
      if (Utils.chance(15)) {
        const dmg = Math.round(Stat.compute(p).maxHp * Utils.rand(8, 14) / 100);
        p.hp = Math.max(1, p.hp - dmg);
        Log.add(`秘境宝箱竟然是活的——一口宝箱妖咬了你一口！气血 -${dmg}。`, 'loss');
        this.gain(D, '宝箱妖反噬');
        result = { icon: '🎁', title: '宝 箱 · 箱中藏妖', cls: 'loss', lines: [`你掀开古匣，匣内竟藏着一口<b>宝箱妖</b>！它狠狠咬了你一口——气血 <span class="neg">-${dmg}</span>。`, '大意了……下次开箱前，先听三息动静。'] };
      } else {
        const stones = Math.round(Utils.rand(14, 24) * GameData.stoneEco(R.recRealm) * dm);
        Bag.addStones(stones);
        const parts = [`灵石 ${Utils.fmtNum(stones)}`];
        if (Utils.chance(40 + depth2(D.depth))) {
          const mat = Utils.pick(GameData.matsByTier(Math.min(4, Math.floor(R.recRealm / 2) + 2)));
          Bag.addItem(mat, 1);
          parts.push(`${GameData.ITEMS[mat].name} ×1`);
        }
        if (Utils.chance(20 + D.depth * 3)) {
          Bag.addItem('m_gupian', 1);
          parts.push('上古法宝碎片 ×1');
        }
        Log.add(`你于 ${R.name} 第 ${D.depth + 1} 层寻得一只古匣——${parts.join('、')}。（深入第 ${D.depth + 1} 层，收益倍率 ×${dm.toFixed(2)}）`, 'gain');
        this.gain(D, `宝箱（第${D.depth + 1}层）`);
        result = { icon: '🎁', title: '宝 箱 · 古匣开启', cls: 'gain', lines: [`你于第 ${D.depth + 1} 层寻得一只落满尘土的<b>古匣</b>，撬开铜锁——`, `获得 <b class="hl">${parts.join('、')}</b>。`, `（本层收益倍率 ×${dm.toFixed(2)}）`] };
      }
    } else if (type === 'fortune') {
      const gain = Math.round(Utils.rand(70, 120) * GameData.eco(R.recRealm) * dm);
      Cultivate.addExp(p, gain);
      const insGain = Utils.rand(3, 7);
      p.insight = Math.min(100, p.insight + insGain);
      const parts = [`修为 +${Utils.fmtNum(gain)}`, `突破感悟 +${insGain}`];
      let extra = '';
      if (D.depth >= 4 && Utils.chance(14)) {
        const gf = this.grantLostGongfa(p);
        if (gf) { extra = `蒲团之下竟压着一册<b>失传功法【${gf}】</b>！`; this.gain(D, `失传功法·${gf}`); }
        else { parts.push('上古法宝碎片 ×2'); Bag.addItem('m_gupian', 2); extra = '另得上古法宝碎片 ×2。'; }
      } else if (Utils.chance(18)) {
        parts.push('上古法宝碎片 ×1');
        Bag.addItem('m_gupian', 1);
        extra = '另得上古法宝碎片 ×1。';
      }
      Log.add(`你误入一处天然道场，残存的道韵仍自流转。${parts.join('、')}。${extra}`, 'gain');
      this.gain(D, `奇遇（第${D.depth + 1}层）`);
      result = { icon: '✨', title: '奇 遇 · 道场遗韵', cls: 'gain', lines: [`你误入一处天然<b>道场</b>，残存的道韵仍自流转。`, `获得 <b class="hl">${parts.join('、')}</b>。${extra}`] };
    } else if (type === 'trap') {
      const dmg = Math.round(Stat.compute(p).maxHp * Math.min(35, 9 + D.depth * 2) / 100);
      p.hp = Math.max(1, p.hp - dmg);
      Log.add(`你误触上古禁制！一道灵光炸开，气血 -${dmg}。此地凶险，步步惊心。`, 'loss');
      this.gain(D, `禁制（第${D.depth + 1}层）`);
      result = { icon: '⚠', title: '陷 阱 · 上古禁制', cls: 'loss', lines: [`你一脚踩上石纹，<b>上古禁制</b>骤然亮起！灵光炸开——`, `气血 <span class="neg">-${dmg}</span>。`, '此地凶险，步步惊心。'] };
    } else if (type === 'npc') {
      result = await this.npcNode(R, D, dm);
    }
    D.depth++;
    p.counters.maxDepth = Math.max(p.counters.maxDepth || 0, D.depth);   // v11 剧情计数
    this.genChoices(D);
    if (result) await this.nodeResult(result, D, R);
    Game.afterAction();
  },
  /** v17 节点类型图标 */
  nodeIcon(t) {
    return { battle: '⚔ ', treasure: '🎁 ', fortune: '✨ ', trap: '⚠ ', npc: '🗣 ', boss: '☠ ' }[t] || '';
  },
  /** v17 秘境节点结算演出卡：统一展示节点结果与当前进度 */
  async nodeResult(r, D, R) {
    const p = Game.player;
    const D2 = p.dungeon || D;
    await UI.popup({
      title: `${r.icon} ${r.title}`,
      html: `
        <div class="dungeon-result ${r.cls}">
          ${r.lines.map(l => `<div class="dungeon-result-line">${l}</div>`).join('')}
          <div class="tip-line" style="margin-top:10px">· 已深入 <b>第 ${Math.min(D2.depth, D2.total)} 层</b> / ${D2.total} 层
            ${D2.gains && D2.gains.length ? ` · 已掠得：${D2.gains.slice(-4).join('；')}` : ''}</div>
        </div>`,
      options: [{ text: '继 续 深 入 ▸', value: true, primary: true }],
    });
  },
  /** 秘境遭遇：散商 / 残修 / 前辈 */
  /** 秘境遭遇：散商 / 残修 / 前辈（v17：返回结算卡 lines） */
  async npcNode(R, D, dm) {
    const p = Game.player;
    const kind = Utils.pickWeighted({ merchant: 35, senior: 35, wounded: 30 });
    if (kind === 'merchant') {
      const pool = ['w_sanqing', 'a_xuangui', 'z_qiankun', 'w_zhuxian', 'a_longlin', 'z_taiji', 'gf_lieyang', 'gf_xuantian', 'gf_tiangang'];
      const item = Utils.pick(pool);
      const def = GameData.ITEMS[item];
      const cost = Math.round((def.price || 8000) * 0.65);
      const buy = await UI.popup({
        title: '秘境散商',
        html: `石室内竟有一位摆摊的散修，货架上只有一件东西：<br><b>${def.name}</b> —— ${def.desc}<br>索价 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石。`,
        options: [{ text: '买下', value: true, primary: true }, { text: '不买', value: false }],
      });
      if (buy) {
        if (Bag.spendStones(cost)) {
          Bag.addItem(item, 1);
          Log.add(`你买下了 ${def.name}。散商收了灵石，人便消失在雾中。`, 'gain');
          this.gain(D, `购得${def.name}`);
          return { icon: '🗣', title: '遭 遇 · 秘境散商', cls: 'gain', lines: [`你以 <b class="hl">${Utils.fmtNum(cost)}</b> 灵石购得 <b>${def.name}</b>。`, '散商收了灵石，人便消失在雾中。'] };
        }
        Log.add('你摸了摸储物袋，只能拱手告辞。', 'info');
        return { icon: '🗣', title: '遭 遇 · 秘境散商', cls: 'warn', lines: ['你摸了摸储物袋——灵石不济，只得拱手告辞。', '散商也不恼，收拾货担，遁入雾中。'] };
      }
      Log.add('你摇了摇头，散商也不恼，化作一道遁光去了。', 'info');
      return { icon: '🗣', title: '遭 遇 · 秘境散商', cls: 'info', lines: ['你摇了摇头——此物虽好，与你无缘。', '散商也不恼，化作一道遁光去了。'] };
    } else if (kind === 'senior') {
      const gain = Math.round(Utils.rand(60, 100) * GameData.eco(R.recRealm) * dm);
      Cultivate.addExp(p, gain);
      p.insight = Math.min(100, p.insight + 5);
      const parts = [`修为 +${Utils.fmtNum(gain)}`, '突破感悟 +5'];
      let extra = '';
      if (D.depth >= 3 && Utils.chance(10)) {
        const gf = this.grantLostGongfa(p);
        if (gf) { extra = `临散前，残影将一册<b>失传功法【${gf}】</b>推到你面前。`; this.gain(D, `失传功法·${gf}`); }
      }
      Log.add(`一位枯坐的前辈残影向你传了一缕真意。${parts.join('、')}。${extra}`, 'gain');
      this.gain(D, `前辈传法（第${D.depth + 1}层）`);
      return { icon: '🗣', title: '遭 遇 · 前辈残影', cls: 'gain', lines: [`一位枯坐的<b>前辈残影</b>缓缓睁眼，向你传了一缕真意。`, `获得 <b class="hl">${parts.join('、')}</b>。${extra}`] };
    } else {
      const hasPill = Bag.count('pill_liaoshang') > 0;
      const choice = await UI.popup({
        title: '重伤散修',
        html: `一名散修倒在秘境禁制下，气若游丝。「道友……救我……我的储物袋里，有上古碎片……」<br>${hasPill ? '你身上正好有【疗伤丹】。' : '你身无丹药，只能以真元续他一命（损一成气血）。'}`,
        options: hasPill
          ? [{ text: '赠丹相救', value: 'pill', primary: true }, { text: '趁机动手', value: 'rob' }, { text: '绕行', value: 'leave' }]
          : [{ text: '以真元相救', value: 'qi', primary: true }, { text: '趁机动手', value: 'rob' }, { text: '绕行', value: 'leave' }],
      });
      if (choice === 'pill' || choice === 'qi') {
        if (choice === 'pill') Bag.removeItem('pill_liaoshang', 1);
        else p.hp = Math.max(1, p.hp - Math.round(Stat.compute(p).maxHp * 0.1));
        if (Utils.chance(65)) {
          Bag.addItem('m_gupian', 1);
          Log.add('散修以秘法支撑到出口，临别将一块上古法宝碎片塞进你手中。', 'gain');
          this.gain(D, '碎片（救人所赠）');
          return { icon: '🗣', title: '遭 遇 · 重伤散修', cls: 'gain', lines: ['你以真元/灵药助其续命，散修缓过一口气。', '临别时，他将一块<b class="hl">上古法宝碎片</b>塞进你手中：「此恩……来世再报。」'] };
        }
        Log.add('散修养好伤势，千恩万谢地遁走了。', 'info');
        return { icon: '🗣', title: '遭 遇 · 重伤散修', cls: 'gain', lines: ['你出手相救，散修缓过气来，千恩万谢地遁走了。', '善因已种，未必即报。'] };
      } else if (choice === 'rob') {
        const stones = Math.round(Utils.rand(20, 40) * GameData.stoneEco(R.recRealm) * dm);
        Bag.addStones(stones);
        Bag.addItem('m_gupian', 1);
        KarmaSys.addKarma(Utils.rand(6, 10), true);
        Log.add(`你面无表情地搜走了他的储物袋：灵石 ${Utils.fmtNum(stones)}、上古法宝碎片 ×1。他绝望的眼神，你权当没看见。（孽障增加）`, 'gain');
        this.gain(D, '夺宝（重伤散修）');
        return { icon: '🗣', title: '遭 遇 · 见财起意', cls: 'loss', lines: [`你面无表情地搜走了他的储物袋：<b>灵石 ${Utils.fmtNum(stones)}、上古法宝碎片 ×1</b>。`, '他绝望的眼神，你权当没看见。（孽障增加）'] };
      }
      Log.add('你绕开了他。秘境之中，各安天命。', 'info');
      return { icon: '🗣', title: '遭 遇 · 重伤散修', cls: 'info', lines: ['你绕开了他。', '秘境之中，各安天命。'] };
    }
  },
  /** 战胜节点：深入一层 */
  onVictory(dctx, boss = false) {
    const p = Game.player;
    const D = p.dungeon;
    if (!D) return;
    D.depth++;
    if (boss) p.counters.bossKills = (p.counters.bossKills || 0) + 1;   // v6 成就计数
    p.counters.maxDepth = Math.max(p.counters.maxDepth || 0, D.depth);   // v11 剧情计数
    const R = GameData.SECRET_REALMS[D.realm];
    if (boss) {
      const gf = this.grantLostGongfa(p);
      Bag.addItem('m_gupian', 3);
      const stones = Math.round(Utils.rand(60, 100) * GameData.stoneEco(R.recRealm) * 2);
      Bag.addStones(stones);
      KarmaSys.addFortune(10);
      Log.add(`<b>${R.name}</b> 最深处的宝库向你敞开！${gf ? `失传功法【${gf}】、` : '上古法宝碎片 ×2、'}上古法宝碎片 ×3、灵石 ${Utils.fmtNum(stones)}——你满载而归！（气运 +10）`, 'gain');
      p.dungeon = null;
      Log.add('你退出秘境，回望雾中洞口，只觉造化玄奇。', 'system');
      return;
    }
    this.gain(D, `战斗得利（第${D.depth}层）`);
    if (p.dao === 'array') DaoSys.gain(p, 15);   // v16 阵道：探秘
    if (D.depth >= D.total) { p.dungeon = null; return; }
    this.genChoices(D);
  },
  /** 秘境中战败：损失背包 30% 物品 */
  async onDefeat() {
    const p = Game.player;
    if (!p.dungeon) return;
    const lost = [];
    for (const [id, qty] of Object.entries(p.bag)) {
      const lose = Math.floor(qty * 0.3);
      if (lose > 0) { Bag.removeItem(id, lose); lost.push(`${GameData.ITEMS[id].name}×${lose}`); }
    }
    p.dungeon = null;
    p.hp = Math.max(1, Math.round(Stat.compute(p).maxHp * 0.2));
    Log.add(`你陨落于秘境之中……魂归之时，秘境禁制吞去了你储物袋三成之物：${lost.join('、') || '些许杂物'}。`, 'loss');
    await UI.popup({
      title: '陨落 · 秘境',
      html: '秘境禁制轰然而落，你被硬生生震出界外。<br><span class="neg">背包内三成之物，永远留在了秘境深处。</span>',
      options: [{ text: '挣扎爬起', value: true, primary: true }],
    });
    Log.add('再睁眼时，你已躺在山门外。秘境无情，来日再战。', 'warn');
  },
  /** 战斗中遁走：困在原地，只能撤离 */
  onFlee() {
    const p = Game.player;
    if (!p.dungeon) return;
    p.dungeon.stuck = true;
    p.dungeon.choices = [];
    Log.add('你退出争斗，藏进石隙——此地不宜久留，趁早撤离为上。', 'warn');
  },
  /** 撤离：带走当前收益 */
  async retreat() {
    const p = Game.player;
    const D = p.dungeon;
    if (!D) return;
    const R = GameData.SECRET_REALMS[D.realm];
    const ok = await UI.popup({
      title: '撤离秘境',
      html: `你已深入 <b>第 ${D.depth} 层</b>（共 ${D.total} 层）。<br>所掠已尽入囊中，然愈深愈险——确定循来路撤离吗？`,
      options: [{ text: '撤离', value: true }, { text: '继续深入', value: false }],
    });
    if (!ok) return;
    p.dungeon = null;
    Log.add(`你循着来路退出 ${R.name}，身后雾气合拢。深入 ${D.depth} 层，全身而退。`, 'system');
    Game.afterAction();
  },
  /** 九枚碎片 → 本命法宝 */
  async synth() {
    const p = Game.player;
    if (Bag.count('m_gupian') < 9) { UI.toast('碎片不足九枚'); return; }
    const ok = await UI.popup({
      title: '炼化 · 本命法宝',
      html: '九枚上古法宝碎片悬浮周身，隐隐排成一件古宝的形状。<br>以心头精血炼之，可成<b>本命法宝</b>——与神魂相合，攻防气感皆得其益。',
      options: [{ text: '滴血炼化', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    Bag.removeItem('m_gupian', 9);
    Bag.addItem('z_benming', 1);
    Log.add('精血没入碎片，轰鸣声中，一件古朴法宝环绕周身——<b>本命法宝</b>炼化成了！（可在乾坤袋中装备）', 'gain');
    Game.afterAction();
  },
};
/** 秘境深度对宝箱附加掉率的辅助 */
function depth2(depth) { return depth * 2; }

/* ======================================================================
 * §26 兵解转生 ReincarnationSys（多周目 / 轮回印记 / 前世恩怨）
 * ====================================================================== */
const ReincarnationSys = {
  /** 轮回 legacy 按存档位独立存放，不污染玩家存档结构 */
  legacyKey() { return 'legacy_' + (Game.slot == null ? 'auto' : Game.slot); },
  readLegacy() {
    const d = Save.read(this.legacyKey());
    return d && typeof d === 'object' ? d : { lives: 0, marks: 0, kept: null, grudges: [] };
  },
  writeLegacy(l) {
    const raw = JSON.stringify(l);
    try {
      if (Save.storage.setItem) Save.storage.setItem(Save.KEY + this.legacyKey(), raw);
      else Save.mem[Save.KEY + this.legacyKey()] = raw;
    } catch (e) { /* ignore */ }
  },
  async open() {
    const p = Game.player;
    if (!p.canReincarnate) { UI.toast('尚无兵解转世之机'); return; }
    const legacy = this.readLegacy();
    const ok = await UI.popup({
      title: '兵解转世',
      html: `渡劫失利，大道蒙尘。兵解者，散去肉身、以神魂投胎再修——<br>
        · 转世继承 <b>10% 悟性加成</b>与<b>前世记忆</b>（游历中偶得前世洞府机缘）<br>
        · 可携<b>一件法宝</b>入轮回<br>
        · 得 1 枚<b>轮回印记</b>：永久 +1% 全属性上限，可叠加（现累计 ${legacy.marks || 0} 枚）<br>
        · 来世重择<b>出身与大道</b>；前世仇怨，亦会随记忆寻来<br>
        <span class="neg">此世修为、境界、灵石、宗门尽付东流。</span>`,
      options: [{ text: '兵 解', value: true, primary: true }, { text: '再苟一时', value: false }],
    });
    if (!ok) return;
    // 择法宝入轮回
    const arts = Object.keys(p.bag)
      .filter(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'artifact')
      .sort((a, b) => (GameData.ITEMS[b].grade || 0) - (GameData.ITEMS[a].grade || 0))
      .slice(0, 6);
    let kept = null;
    if (arts.length) {
      kept = await UI.popup({
        title: '携带入轮回',
        html: '择一件法宝，以本命精血温养护持，随身入轮回：',
        options: [...arts.map(id => ({ text: GameData.ITEMS[id].name, value: id })), { text: '不带法宝', value: null }],
      });
    }
    // 择出身
    const originId = await UI.popup({
      title: '转世 · 投胎出身',
      html: '神魂坠入轮回，可择来世出身：',
      options: [...GameData.ORIGINS.map(o => ({ text: `${o.name} · ${o.desc}`, value: o.id })), { text: '随遇而安（不择出身）', value: null }],
    });
    if (originId === undefined) return;
    const origin = GameData.ORIGINS.find(o => o.id === originId) || null;
    await this.execute(p, legacy, kept, origin);
  },
  async execute(oldP, legacy, kept, origin) {
    // 前世仇怨：只带走此生尚存的心结（已化解者不入轮回）
    const grudges = Object.keys(oldP.npcs || {}).filter(id => oldP.npcs[id].grudge && oldP.npcs[id].alive);
    legacy.lives = (legacy.lives || 0) + 1;
    legacy.marks = (legacy.marks || 0) + 1;
    legacy.kept = kept || null;
    legacy.grudges = grudges;
    this.writeLegacy(legacy);
    // 新身
    const attrs = PlayerFactory.rollAttrs();
    if (origin) for (const [k, v] of Object.entries(origin.mods)) attrs[k] = Utils.clamp(attrs[k] + v, 1, 10);
    const p2 = PlayerFactory.create(oldP.name, attrs);
    p2.origin = origin ? origin.id : null;
    if (origin) {
      p2.stones.low += origin.start.stones || 0;
      for (const [id, n] of Object.entries(origin.start.bag || {})) p2.bag[id] = (p2.bag[id] || 0) + n;
    }
    p2.reinc = { lives: legacy.lives, marks: legacy.marks, compPct: 10, grudges: grudges };
    if (kept) p2.bag[kept] = 1;
    for (const gid of grudges) {
      const s = p2.npcs[gid];
      if (s) { s.rel = -35; s.grudge = true; s.pastLife = true; }
    }
    Game.player = p2;
    p2.pendingDao = true; // 前世记忆：可即刻叩问大道
    Log.clear();
    Log.add('<b>兵解转世</b>——一道流光划破夜空，落入凡间某处。啼哭声中，你重开一世。', 'system');
    Log.add(`此为第 <b>${legacy.lives}</b> 世：轮回印记 ×${legacy.marks}（全属性 +${legacy.marks}%）、前世悟性传承 +10%${kept ? `、携【${GameData.ITEMS[kept].name}】转世` : ''}。`, 'gain');
    if (grudges.length) Log.add(`前世仇怨如附骨之疽：${grudges.map(id => (NpcSys.def(id) || {}).name).filter(Boolean).join('、')} 与你再结梁子。`, 'warn');
    Log.add('前世记忆未消——你可即刻叩问大道，游历中偶有前世洞府机缘。', 'info');
    Game.afterAction();
    UI.toast(`转世成功 · 第${legacy.lives}世`);
  },
};

/* ======================================================================
 * §14 战斗系统（回合制）
 * ====================================================================== */
const Battle = {
  active: null,

  async start(monsterId, ctx = {}) {
    if (this.active) return;
    const p = Game.player;
    const st = Stat.compute(p);
    if (p.hp <= 0) p.hp = 1;
    const enemy = ctx.enemy || buildMonster(monsterId);
    // §23 魔域狂化：气血/攻击/收益同步放大
    if (ctx.worldMul) {
      enemy.hpMax = Math.round(enemy.hpMax * ctx.worldMul);
      enemy.atk = Math.round(enemy.atk * ctx.worldMul);
      enemy.expGain = Math.round(enemy.expGain * ctx.worldMul);
      enemy.stoneGain = Math.round(enemy.stoneGain * ctx.worldMul);
    }
    enemy.hp = enemy.hpMax;
    // v13：敌方状态容器（玩家施加的减益）与铁壁/狂暴字段
    enemy.fx = [];
    enemy.guardRounds = 0; enemy.guardPower = 0;
    enemy.raged = false;
    enemy.charging = false;
    Anim.drop('bt-ehp', 'bt-hp', 'bt-mp');   // v4：新一场战斗，血量记忆清零
    // v6：图鉴收录（妖兽 / 常驻修士）
    if (enemy.id) Meta.see('monster', enemy.id);
    if (enemy.npcId) Meta.see('npc', enemy.npcId);
    this.active = {
      enemy, ctx,
      busy: false, over: false,
      defending: false,
      buffs: { defPower: 0, defRounds: 0, dodgeBonus: 0, dodgeRounds: 0 },
      menu: null,
      logs: [],
      floats: [],      // v7：浮动伤害/治疗数字队列（render 时飘出）
      hitShake: false, // v7：敌方受击震动标记
      morale: 0,       // v8：战意（0~100，攻防博弈资源，最高 +40% 伤害）
      infantSaved: false, // v10：元婴代死每场一次
      myFx: [],        // v13：玩家身上状态（增益 + 敌方施加的负面）
      combo: 0,        // v13：连击层数（普攻命中累积，受击中断）
      auto: false,     // v13：自动战斗开关
    };
    // v13：战斗速度偏好（1 / 2 / 极速），存偏好
    this.speed = this.speed || this.loadSpeed();
    p.counters.battles++;
    document.getElementById('battle-modal').classList.remove('hidden');
    this.log(`⚔ 于${ctx.mapName || '荒野'}遭遇 <b class="grade-0">${enemy.name}</b>（${enemy.realmLabel}${enemy.elite ? ' · 精英' : ''}）！`, 'warn');
    if (ctx.spar) this.log('此为切磋较技，点到为止，不伤性命。', 'log-system');
    else if (ctx.mode === 'hunt') this.log('来者与你恩怨纠葛，今番不死不休！', 'log-warn');
    // v10 境界特性 · 灵压（筑基起）：先声夺人，敌方攻防被压制一成
    if (p.realmIdx >= 1) {
      enemy.atk = Math.round(enemy.atk * 0.9);
      enemy.def = Math.round(enemy.def * 0.9);
      this.log('【灵压】你气机一振，无形威压笼罩四野——敌方攻防被压制一成！', 'log-gain');
    }
    // v10 魔道六境·慑魂境：邪气慑魂，敌方暴击率减半
    if (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 4) {
      enemy.crit = Math.round((enemy.crit || 0) / 2);
      this.log('【慑魂】你眼底魔光一闪——敌方被慑得心神不定，暴击率减半！', 'log-gain');
    }
    // 阵道：抢先布阵，压制敌方三成攻防（困阵境压制四成）
    if (ctx.arraySetup) {
      const pot = ctx.arrayGrand ? 0.5 : (ctx.arrayPotent ? 0.6 : 0.7);
      enemy.atk = Math.round(enemy.atk * pot);
      enemy.def = Math.round(enemy.def * pot);
      this.log(ctx.arrayGrand
        ? '【天罗阵网】天地皆阵，敌方攻守被压制五成！'
        : ctx.arrayPotent
        ? '【困龙阵】阵旗早埋，阵光骤起——敌方攻守皆被压制四成！'
        : '你早已抢先布下两仪微尘阵！阵光流转间，敌方攻势守势皆被压制三成。', 'log-gain');
    } else if (p.dao === 'array' && DaoSys.tierLevel(p) >= 5 && Utils.chance(DaoSys.tierLevel(p) >= 6 ? 35 : 20)) {
      // v10 阵道三重 · 杀阵境：战斗开场两成几率直接布下杀阵
      enemy.atk = Math.round(enemy.atk * 0.6);
      enemy.def = Math.round(enemy.def * 0.6);
      this.log('【杀阵】你袖袍一振，杀阵先成——四方阵光封锁天地，敌方攻守尽堕四成！', 'log-crit');
    }
    this.render();
    if (ctx.firstStrike || ctx.ambush) {
      this.log(ctx.ambush ? '仇家蓄谋已久，抢先出手！' : '对方修为高深，抢先出手！', 'warn');
      await this.wait(600);
      await this.enemyTurn();
      if (!this.active) return;
      if (Game.player.hp <= 0 && !(await this.infantSave())) { await this.defeat(); return; }
      this.active.busy = false;
      this.render();
    }
  },

  /** v10 境界特性 · 元婴代死（元婴起）：每场战斗首次致命伤由元婴代受，保留两成五气血 */
  infantSave() {
    const B = this.active;
    const p = Game.player;
    if (!B || !p || p.realmIdx < 3 || B.infantSaved) return false;
    B.infantSaved = true;
    const st = Stat.compute(p);
    p.hp = Math.max(1, Math.round(st.maxHp * 0.25));
    this.log('【元婴代死】千钧一发，元婴破窍而出替你受下这一击！你喷出一口精血，强行稳住道基。', 'log-crit');
    this.pushFloat('me', '元婴代死', 'heal');
    return true;
  },

  log(html, cls = 'log-battle') {
    // 同时写入战斗记录数组（render 重建 DOM 后可回放）与页面
    if (this.active) {
      this.active.logs.push({ html, cls });
      // 限长：超长战斗时避免回放成本随回合数无界增长
      if (this.active.logs.length > 120) this.active.logs.shift();
    }
    const box = document.getElementById('bt-log');
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'log-entry ' + cls;
    div.innerHTML = html;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  },

  /** v7：浮动数字（伤害/治疗/闪避），render 时在对应一侧飘出 */
  pushFloat(side, text, kind = 'dmg') {
    if (this.active) this.active.floats.push({ side, text, kind });
  },
  /** v8：战意增减（0~100）与伤害倍率（每点战意 +0.4%，满值 +40%） */
  addMorale(n) {
    const B = this.active;
    if (B) B.morale = Utils.clamp((B.morale || 0) + n, 0, 100);
  },
  moraleMul() {
    const B = this.active;
    return 1 + (B && B.morale ? B.morale * 0.004 : 0);
  },
  /** v13：连击倍率（每层 +4%，上限五层 +20%）；受击中断 */
  comboMul() {
    const B = this.active;
    return 1 + (B ? Math.min(5, B.combo || 0) * 0.04 : 0);
  },
  /** v13：战斗速度（1=原速 2=两倍 3=极速），偏好持久化 */
  SPEED_KEY: 'fanren_wd_bspeed',
  loadSpeed() {
    try {
      const v = Number(Save.storage.getItem ? Save.storage.getItem(this.SPEED_KEY) : Save.mem[this.SPEED_KEY]);
      return [1, 2, 3].includes(v) ? v : 1;
    } catch (e) { return 1; }
  },
  setSpeed(v) {
    this.speed = v;
    try { if (Save.storage.setItem) Save.storage.setItem(this.SPEED_KEY, String(v)); else Save.mem[this.SPEED_KEY] = String(v); } catch (e) { /* ignore */ }
    if (this.active) this.render();
  },
  /** 统一等待（受战斗速度缩放：2=两倍速 3=极速） */
  wait(ms) {
    const mul = this.speed === 3 ? 0.15 : this.speed === 2 ? 0.5 : 1;
    return Utils.sleep(Math.max(30, Math.round(ms * mul)));
  },
  /** v13：玩家有效攻防（计入增益/减益状态与敌方铁壁等） */
  myAtk(st) {
    const B = this.active;
    let atk = st.atk;
    if (B) {
      atk *= 1 + StatusFx.pctOf(B.myFx, 'atkup') / 100;
      atk *= 1 - StatusFx.pctOf(B.myFx, 'weaken') / 100;
    }
    return Math.round(atk);
  },
  myDef(st) {
    const B = this.active;
    let def = st.def;
    if (B) {
      def *= 1 + StatusFx.pctOf(B.myFx, 'defup') / 100;
      def *= 1 - StatusFx.pctOf(B.myFx, 'defdown') / 100;
      def *= B.buffs.defRounds > 0 ? 1 + B.buffs.defPower / 100 : 1;
    }
    return Math.round(def);
  },
  mySpd(st) {
    const B = this.active;
    let spd = st.speed;
    if (B) {
      spd *= 1 + StatusFx.pctOf(B.myFx, 'agiup') / 100;
      spd *= 1 - StatusFx.pctOf(B.myFx, 'slow') / 100;
    }
    return Math.round(spd);
  },
  myCrit(st) {
    const B = this.active;
    return st.crit + (B ? StatusFx.pctOf(B.myFx, 'critup') : 0);
  },
  /** v13：敌方有效攻防（计入狂暴/铁壁/玩家施加的破防迟滞） */
  enAtk(e) {
    let atk = e.atk * (e.raged ? 1.3 : 1);
    return Math.round(atk);
  },
  enDef(e) {
    let def = e.def * (1 - StatusFx.pctOf(e.fx, 'defdown') / 100);
    if (e.guardRounds > 0) def *= 1 + (e.guardPower || 0) / 100;
    return Math.round(def);
  },
  enSpd(e) {
    return Math.max(1, Math.round(e.spd * (1 - StatusFx.pctOf(e.fx, 'slow') / 100)));
  },
  /** v13：给敌方施加状态（符箓/破煞法诀） */
  applyEnemyFx(e, st, logFmt) {
    StatusFx.add(e.fx, st);
    const d = StatusFx.DEFS[st.kind];
    if (d) this.log(logFmt || `${e.name} 陷入【${d.name}】${st.pct ? `（${Math.round(st.pct)}%）` : ''}，持续 ${st.rounds} 回合！`, 'log-gain');
  },
  /** v13：结算一方的 DOT（dot 状态按最大生命百分比损血），返回文案 */
  tickDots(who) {
    const B = this.active;
    if (!B) return '';
    const parts = [];
    if (who === 'me') {
      const p = Game.player;
      const st = Stat.compute(p);
      let dotDmg = 0;
      for (const x of B.myFx) {
        if (!(StatusFx.DEFS[x.kind] || {}).dot) continue;
        dotDmg += Math.max(1, Math.round(st.maxHp * (x.pct || 3) / 100));
      }
      if (dotDmg > 0) {
        p.hp = Math.max(0, p.hp - dotDmg);
        this.pushFloat('me', `-${dotDmg}`, 'dmg');
        parts.push(`（毒火蚀体，气血 -${dotDmg}）`);
      }
      B.myFx = StatusFx.decayDots(B.myFx);
    } else {
      const e = B.enemy;
      let dotDmg = 0;
      for (const x of e.fx) {
        if (!(StatusFx.DEFS[x.kind] || {}).dot) continue;
        dotDmg += Math.max(1, Math.round(e.hpMax * (x.pct || 3) / 100));
      }
      if (dotDmg > 0) {
        e.hp = Math.max(0, e.hp - dotDmg);
        this.pushFloat('enemy', `-${dotDmg}`, 'dmg');
        parts.push(`${e.name} 在毒火中哀嚎（气血 -${dotDmg}）`);
      }
      e.fx = StatusFx.decayDots(e.fx);
    }
    return parts.join('');
  },

  async act(kind, arg) {
    const B = this.active;
    if (!B || B.busy || B.over) return;
    const p = Game.player;
    const st = Stat.compute(p);
    B.busy = true;
    B.menu = null;
    this.render();
    try {
    // v13 束缚/冰封：本次行动被跳过，控制状态随即消耗
    if (StatusFx.has(B.myFx, 'stun') || StatusFx.has(B.myFx, 'freeze')) {
      const frozen = StatusFx.has(B.myFx, 'freeze');
      this.log(`你身形被【${frozen ? '冰封' : '束缚'}】禁锢，这一回合无法动弹！`, 'log-warn');
      B.myFx = StatusFx.removeKinds(B.myFx, ['stun', 'freeze']);
      this.render();
      await this.wait(500);
      await this.enemyTurn();
      if (!this.active) return;
      if (await this.afterEnemyPhase(st)) return;
      B.busy = false;
      this.render();
      this.autoNext();
      return;
    }
    // v13 灵兽协助：出战灵兽有四成几率抢先扑击
    if (typeof BeastSys !== 'undefined' && await BeastSys.assist(st)) { await this.victory(); return; }
    switch (kind) {
      case 'attack': {
        const daoTier = DaoSys.tierLevel(p);
        const enSpd = this.enSpd(B.enemy);
        // v10 剑心六境·剑仙境：普攻必中
        const miss = (p.dao === 'sword' && daoTier >= 6) ? 0 : Utils.clamp(3 + (enSpd - this.mySpd(st)), 2, 35);
        if (Utils.chance(miss)) {
          this.log(`你奋力一击，却被 ${B.enemy.name} 敏捷地避开了！`);
          this.pushFloat('enemy', '闪避', 'miss');
          this.addMorale(-4);
          B.combo = 0;
        } else {
          let dmg = Stat.afterDef(this.myAtk(st), this.enDef(B.enemy)) * Utils.randF(0.85, 1.15) * this.moraleMul() * this.comboMul();
          // v18 种族克制
          const speciesRel = GameData.speciesRelation(p.dao ? 'human' : 'human', B.enemy.species);
          if (speciesRel > 0) dmg *= 1.15;
          else if (speciesRel < 0) dmg *= 0.85;
          const crit = Utils.chance(this.myCrit(st));
          // v10 剑心六境·剑芒境：暴击伤害 +20%
          if (crit) dmg *= (p.dao === 'sword' && daoTier >= 2 ? 1.9 : 1.7);
          // 剑修：剑心通明伤害翻倍（剑心通明境触发率提至三成）
          const jianxin = p.dao === 'sword' && Utils.chance(daoTier >= 3 ? 30 : 20);
          if (jianxin) dmg *= 2;
          // v10 般若六境·易筋境：普攻伤害 +10%
          if (p.dao === 'body' && daoTier >= 4) dmg *= 1.1;
          dmg = Math.max(1, Math.round(dmg));
          B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
          B.combo = Math.min(5, (B.combo || 0) + 1);   // v13 连击累积
          if (p.dao === 'sword') DaoSys.gain(p, (crit || jianxin) ? 20 : 12);   // v16 剑意
          this.pushFloat('enemy', `-${dmg}`, (crit || jianxin) ? 'crit' : 'dmg');
          B.hitShake = true;
          this.addMorale((crit || jianxin) ? 18 : 12);
          const comboTxt = B.combo >= 2 ? `<span style="color:var(--gold)">连击×${B.combo}</span>` : '';
          const tags = [crit ? '会心一击！' : '', jianxin ? '【剑心通明】！' : '', comboTxt].filter(Boolean).join('');
          this.log(`${tags}${Narrative.attack()}，对 ${B.enemy.name} 造成 <b>${dmg}</b> 点伤害。`, (crit || jianxin) ? 'log-crit' : 'log-battle');   // v5：招式语气随道途
          // v10 剑心六境·剑气境「剑意初鸣」：一成五几率剑气余韵，追加三成伤害
          if (p.dao === 'sword' && daoTier >= 1 && B.enemy.hp > 0 && Utils.chance(15)) {
            const echo = Math.max(1, Math.round(dmg * 0.3));
            B.enemy.hp = Math.max(0, B.enemy.hp - echo);
            this.log(`剑气余韵追至！再对 ${B.enemy.name} 造成 <b>${echo}</b> 点伤害。`, 'log-crit');
          }
          // v10 境界特性 · 法相（合体起）：两成几率引动法相，追加五成攻击的一击
          if (p.realmIdx >= 6 && B.enemy.hp > 0 && Utils.chance(20)) {
            const extra = Math.max(1, Math.round(st.atk * 0.5));
            B.enemy.hp = Math.max(0, B.enemy.hp - extra);
            this.log(`【法相】天地法相随行，一掌拍落！追加 <b>${extra}</b> 点伤害！`, 'log-crit');
          }
          // v10 般若六境·金刚境：普攻附带两成吸血
          if (p.dao === 'body' && daoTier >= 5 && p.hp < st.maxHp) {
            const heal = Math.max(1, Math.round(dmg * 0.2));
            p.hp = Math.min(st.maxHp, p.hp + heal);
            this.log(`金刚不坏，血气反哺——回复 <b>${heal}</b> 点气血。`, 'log-gain');
          }
          // v10 魔道六境·炼髓境：普攻附带一成吸血
          if (p.dao === 'demonic' && daoTier >= 2 && p.hp < st.maxHp) {
            const heal2 = Math.max(1, Math.round(dmg * 0.1));
            p.hp = Math.min(st.maxHp, p.hp + heal2);
            this.log(`炼髓噬血——回复 <b>${heal2}</b> 点气血。`, 'log-gain');
          }
        }
        break;
      }
      case 'skill': {
        const g = p.gongfa[arg];
        const def = GameData.ITEMS[arg];
        if (!g || !def || !def.skill) break;
        const sk = def.skill;
        const cost = Math.ceil(st.maxMp * sk.mp / 100 * (p.dao === 'talisman' ? 1.2 : 1)); // 符修：法诀灵力消耗+20%
        if (p.mp < cost) { this.log('灵力不足，法诀难以催动！', 'log-warn'); B.busy = false; this.render(); return; }
        p.mp -= cost;
        let power = sk.power * (1 + (g.level - 1) * 0.06);
        // v10 剑心三境·第三重「万剑归宗」：法诀伤害 +25%
        if (p.dao === 'sword' && DaoSys.tierLevel(p) >= 5) power *= 1.25;
        if (sk.kind === 'damage') {
          const miss = Utils.clamp(3 + (this.enSpd(B.enemy) - this.mySpd(st)), 2, 35);
          if (Utils.chance(miss)) {
            this.log(`你施展【${sk.name}】，却被对方堪堪避过！`);
            this.pushFloat('enemy', '闪避', 'miss');
          } else {
            let dmg = Stat.afterDef(this.myAtk(st) * power, this.enDef(B.enemy)) * Utils.randF(0.9, 1.15) * this.moraleMul() * this.comboMul();
            const crit = Utils.chance(this.myCrit(st));
            if (crit) dmg *= 1.7;
            dmg = Math.max(1, Math.round(dmg));
            B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
            this.pushFloat('enemy', `-${dmg}`, crit ? 'crit' : 'dmg');
            B.hitShake = true;
            this.addMorale(10);
            Battle.fxShow('sword');
            this.log(`你施展 <b>${sk.name}</b>！${crit ? '会心一击！' : ''}造成 <b>${dmg}</b> 点伤害！`, 'log-crit');
          }
        } else if (sk.kind === 'heal') {
          const heal = Math.round(st.maxHp * power / 100);
          p.hp = Math.min(st.maxHp, p.hp + heal);
          this.pushFloat('me', `+${heal}`, 'heal');
          this.log(`你施展 <b>${sk.name}</b>，气血恢复 ${heal} 点。`, 'log-gain');
        } else if (sk.kind === 'buffDef') {
          B.buffs.defPower = power; B.buffs.defRounds = sk.rounds;
          this.log(`你施展 <b>${sk.name}</b>，周身罡气激荡，防御大增！`, 'log-gain');
        } else if (sk.kind === 'buffDodge') {
          B.buffs.dodgeBonus = power; B.buffs.dodgeRounds = sk.rounds;
          this.log(`你施展 <b>${sk.name}</b>，身形化作残影！`, 'log-gain');
        }
        break;
      }
      case 'item': {
        if (!Bag.count(arg)) break;
        const def = GameData.ITEMS[arg];
        // v10 符道三境·第三重「言出法随」：符修祭符两成几率不消耗
        const freeCast = def.type === 'talisman' && p.dao === 'talisman' && DaoSys.tierLevel(p) >= 5 && Utils.chance(35);
        if (!freeCast) Bag.removeItem(arg, 1);
        if (def.type === 'talisman') {
          DaoSys.gain(p, 12);   // v16 符道：祭符
          const fk = def.fkind || 'damage';
          if (fk === 'damage') {
            // 伤害符：符光必中，高额爆发（雷笔境 +30%）
            let dmg = Stat.afterDef(st.atk * (def.power || 2.2), this.enDef(B.enemy)) * Utils.randF(0.95, 1.1) * this.moraleMul() * this.comboMul();
            if (p.dao === 'talisman' && DaoSys.tierLevel(p) >= 3) dmg *= 1.3;   // v10 符道六境·雷笔境
            dmg = Math.max(1, Math.round(dmg));
            B.enemy.hp = Math.max(0, B.enemy.hp - dmg);
            this.pushFloat('enemy', `-${dmg}`, 'crit');
            B.hitShake = true;
            this.addMorale(8);
            Battle.fxShow(fk === 'damage' && (def.power || 0) >= 3 ? 'lightning' : 'fire');
            this.log(`${freeCast ? '【言出法随】指尖符光自生，此符未耗！' : `你祭出 <b>${def.name}</b>！`}符光如电，轰然炸裂——对 ${B.enemy.name} 造成 <b>${dmg}</b> 点伤害！`, 'log-crit');
            if (def.debuff) {
              for (const [kind, pct] of Object.entries(def.debuff)) {
                if (kind === 'rounds') continue;
                this.applyEnemyFx(B.enemy, { kind, pct, rounds: def.debuff.rounds || 2 });
              }
            }
            // v10 符道六境·追雷境：三成几率引动追雷
            if (p.dao === 'talisman' && DaoSys.tierLevel(p) >= 4 && B.enemy.hp > 0 && Utils.chance(30)) {
              const thunder = Math.max(1, Math.round(st.atk * 0.2));
              B.enemy.hp = Math.max(0, B.enemy.hp - thunder);
              this.log(`一道追雷随符而落！再对 ${B.enemy.name} 造成 <b>${thunder}</b> 点伤害！`, 'log-crit');
            }
          } else if (fk === 'shield') {
            StatusFx.add(B.myFx, { kind: 'shield', pct: def.power || 40, rounds: def.rounds || 2 });
            this.pushFloat('me', '金光护体', 'heal');
            this.log(`你祭出 <b>${def.name}</b>——金光罩体，${def.rounds || 2} 回合内所受伤害减轻${def.power || 40}%！`, 'log-gain');
          } else if (fk === 'dodge') {
            StatusFx.add(B.myFx, { kind: 'agiup', pct: 30, rounds: def.rounds || 2 });
            B.buffs.dodgeBonus = def.power || 25; B.buffs.dodgeRounds = def.rounds || 2;
            this.log(`你祭出 <b>${def.name}</b>——身化疾风，来去无踪！`, 'log-gain');
          } else if (fk === 'slow') {
            Battle.fxShow('ice');
            this.applyEnemyFx(B.enemy, { kind: 'slow', pct: def.power || 30, rounds: def.rounds || 2 }, `【${def.name}】符光化索缚住 ${B.enemy.name}——其身法迟滞${def.power || 30}%，持续 ${def.rounds || 2} 回合！`);
          } else if (fk === 'defdown') {
            Battle.fxShow('fire');
            this.applyEnemyFx(B.enemy, { kind: 'defdown', pct: def.power || 35, rounds: def.rounds || 2 }, `【${def.name}】腐甲蚀骨——${B.enemy.name} 防御剧降${def.power || 35}%，持续 ${def.rounds || 2} 回合！`);
          } else if (fk === 'freeze') {
            Battle.fxShow('ice');
            const resist = B.enemy.elite ? 30 : 12;
            if (Utils.chance(resist)) {
              this.log(`【${def.name}】寒气罩落，却被 ${B.enemy.name} 以妖力震碎——未能封住其身形！`, 'log-warn');
            } else {
              this.applyEnemyFx(B.enemy, { kind: 'freeze', rounds: def.rounds || 1 }, `【${def.name}】寒气封形——${B.enemy.name} 被冰封，下一回合无法动弹！`);
            }
          }
        } else if (def.buff) {
          // v13 战斗增益丹：狂暴 / 铁骨 / 轻身 / 明目
          const b = def.buff;
          if (b.atkPct) StatusFx.add(B.myFx, { kind: 'atkup', pct: b.atkPct, rounds: b.rounds || 3 });
          if (b.defPct) StatusFx.add(B.myFx, { kind: 'defup', pct: b.defPct, rounds: b.rounds || 3 });
          if (b.spdPct || b.dodge) StatusFx.add(B.myFx, { kind: 'agiup', pct: Math.max(b.spdPct || 0, b.dodge || 0), rounds: b.rounds || 3 });
          if (b.crit) StatusFx.add(B.myFx, { kind: 'critup', pct: b.crit, rounds: b.rounds || 3 });
          this.pushFloat('me', def.name, 'heal');
          this.log(`你服下 <b>${def.name}</b>——${def.desc.split('——')[1] || '气力涌动'}！`, 'log-gain');
        } else {
          Pill.apply(p, def, true);
          this.log(`你服下 <b>${def.name}</b>！`, 'log-gain');
        }
        break;
      }
      case 'defend': {
        B.defending = true;
        if (p.dao === 'body') DaoSys.gain(p, 6);   // v16 体魄
        this.addMorale(6);
        p.mp = Math.min(st.maxMp, p.mp + Math.round(st.maxMp * 0.15));
        this.log('你凝神戒备，摆出防御姿态，灵力缓缓回复，战意亦在蓄积。', 'log-gain');
        break;
      }
      case 'flee': {
        const chance = Utils.clamp(45 + (st.speed - B.enemy.spd) * 2, 10, 90);
        if (Utils.chance(chance)) {
          this.log('你虚晃一招，遁走而去，好汉不吃眼前亏！', 'log-warn');
          await this.wait(700);
          if (B.ctx.spar) NpcSys.afterSpar(p, B.ctx.npcId, false);
          if (B.ctx.dungeon) DungeonSys.onFlee();
          this.end(false);
          return;
        }
        this.log('你转身欲逃，却被对方拦住去路！', 'log-warn');
        break;
      }
    }
    this.render();
    if (B.enemy.hp <= 0) { await this.victory(); return; }
    await this.wait(560);
    await this.enemyTurn();
    if (!this.active) return;
    if (await this.afterEnemyPhase(st)) return;
    B.busy = false;
    this.render();
    this.autoNext();
    } catch (err) {
      // 兜底：任何异常都不能让战斗永久卡死（busy 不复位会禁用所有按钮）
      console.error('战斗异常:', err);
      B.busy = false;
      if (!B.over) { this.log('（气机一时紊乱，此回合作废）', 'log-warn'); this.render(); }
    }
  },

  /** v13：敌方回合后的统一收尾（玩家 DOT 结算 / 死亡判定 / 增益衰减 / 不灭回血 / 回合推进） */
  async afterEnemyPhase(st) {
    const B = this.active;
    const p = Game.player;
    if (!B) return true;
    // 玩家身上 DOT 结算（毒/焰/血）
    const dotTxt = this.tickDots('me');
    if (dotTxt) { this.log(dotTxt, 'log-loss'); this.render(); }
    if (p.hp <= 0 && !(await this.infantSave())) { await this.defeat(); return true; }
    if (!this.active) return true;   // 回溯/转世等导致战斗被清空的兜底
    // v10 般若六境·不灭境：行动一次，气血自续
    if (p.dao === 'body' && DaoSys.tierLevel(p) >= 6 && Game.player.hp > 0 && Game.player.hp < st.maxHp) {
      const regen = Math.max(1, Math.round(st.maxHp * 0.03));
      Game.player.hp = Math.min(st.maxHp, Game.player.hp + regen);
      this.log(`不灭金身生生不息——气血自续 ${regen} 点。`, 'log-gain');
    }
    B.turn = (B.turn || 1) + 1;
    return false;
  },

  /** v13 自动战斗：回合收尾后若开启自动，择机自动出招（策略：残血吃丹 → 敌蓄力则防御 → 有蓝放最强法诀 → 普攻） */
  autoNext() {
    const B = this.active;
    if (!B || B.over || !B.auto || B.busy) return;
    setTimeout(() => {
      const b2 = this.active;
      if (!b2 || b2.over || !b2.auto || b2.busy) return;
      this.autoPilot();
    }, Math.max(120, Math.round(420 * (this.speed === 3 ? 0.15 : this.speed === 2 ? 0.5 : 1))));
  },
  autoPilot() {
    const B = this.active;
    const p = Game.player;
    const st = Stat.compute(p);
    if (!B || B.busy || B.over) return;
    // 1) 残血：优先疗伤丹，其次大还丹/固本丹
    if (p.hp < st.maxHp * 0.4) {
      const healPill = ['pill_dahuan', 'pill_guben', 'pill_liaoshang'].find(id => Bag.count(id) > 0);
      if (healPill) { this.act('item', healPill); return; }
    }
    // 2) 敌方蓄力杀招在即：防御化解
    if (B.enemy.charging) { this.act('defend'); return; }
    // 3) 被束缚/冰封：行动会被跳过，直接点防御等待
    if (StatusFx.has(B.myFx, 'stun') || StatusFx.has(B.myFx, 'freeze')) { this.act('defend'); return; }
    // v18 4) 自动祭符：符修优先，伤害符/控制符
    if (p.dao === 'talisman') {
      const talList = Object.entries(p.bag).filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'talisman');
      if (talList.length) {
        // 优先伤害符，其次控制符
        const dmgTal = talList.find(([id]) => GameData.ITEMS[id].fkind === 'damage');
        const controlTal = talList.find(([id]) => ['slow', 'defdown', 'freeze'].includes(GameData.ITEMS[id].fkind || ''));
        if (dmgTal) { this.act('item', dmgTal[0]); return; }
        if (controlTal && !StatusFx.has(B.enemy.fx, 'slow') && !StatusFx.has(B.enemy.fx, 'defdown')) {
          this.act('item', controlTal[0]); return;
        }
      }
    }
    // 5) 蓝够：放威力最高的伤害法诀（血量低时优先治疗法诀）
    const skills = Object.entries(p.gongfa)
      .filter(([id]) => {
        const d = GameData.ITEMS[id];
        if (!d || !d.skill) return false;
        const cost = Math.ceil(st.maxMp * d.skill.mp / 100 * (p.dao === 'talisman' ? 1.2 : 1));
        return p.mp >= cost;
      });
    if (skills.length) {
      const healSkills = skills.filter(([id]) => (GameData.ITEMS[id].skill || {}).kind === 'heal');
      const dmgSkills = skills.filter(([id]) => (GameData.ITEMS[id].skill || {}).kind === 'damage');
      if (p.hp < st.maxHp * 0.35 && healSkills.length) { this.act('skill', healSkills[0][0]); return; }
      if (dmgSkills.length) {
        dmgSkills.sort((a, b) => (GameData.ITEMS[b[0]].skill.power) - (GameData.ITEMS[a[0]].skill.power));
        this.act('skill', dmgSkills[0][0]);
        return;
      }
    }
    // 6) 默认普攻
    this.act('attack');
  },

  async enemyTurn() {
    const B = this.active;
    if (!B || B.over) return;
    const p = Game.player;
    const st = Stat.compute(p);
    const e = B.enemy;
    await this.wait(420);
    // v13 敌方 DOT 结算（毒/焰/血）与控制判定（被缚/冰封则跳过本回合）
    const dotTxt = this.tickDots('enemy');
    if (dotTxt) this.log(dotTxt, 'log-gain');
    if (e.hp <= 0) return;
    if (StatusFx.has(e.fx, 'stun') || StatusFx.has(e.fx, 'freeze')) {
      const frozen = StatusFx.has(e.fx, 'freeze');
      this.log(`${e.name} 被【${frozen ? '冰封' : '束缚'}】困住，这一回合动弹不得！`, 'log-gain');
      e.fx = StatusFx.removeKinds(e.fx, ['stun', 'freeze']);
      await this.wait(400);
      return;
    }
    // v13 精英狂暴：血量低于四成触发一次
    if (e.elite && !e.raged && e.hp <= e.hpMax * 0.4) {
      e.raged = true;
      this.log(`<b>【狂暴】</b>${e.name} 目眦欲裂，妖气暴涨如潮——它已入狂暴之态，攻势凌厉了三分！`, 'log-crit');
      this.pushFloat('enemy', '狂暴', 'crit');
      Ambience.sfx('rage');
      await this.wait(500);
    }
    // v18 敌方 AI 状态机：根据血量/状态/技能池做决策
    const rageBonus = e.raged ? 8 : 0;
    const hpPct = e.hp / e.hpMax;
    const hasSkill = e.skills && e.skills.length > 0;
    // 玩家状态检测
    const playerHasDebuff = StatusFx.has(B.myFx, 'defdown') || StatusFx.has(B.myFx, 'weaken') || StatusFx.has(B.myFx, 'slow');
    const playerLowHp = p.hp < st.maxHp * 0.4;
    const playerBuffed = StatusFx.has(B.myFx, 'atkup') || StatusFx.has(B.myFx, 'defup') || StatusFx.has(B.myFx, 'agiup');
    // 收集可用技能类型
    const healSkill = hasSkill ? e.skills.find(s => s.kind === 'heal') : null;
    const guardSkill = hasSkill ? e.skills.find(s => s.kind === 'guard') : null;
    const debuffSkill = hasSkill ? e.skills.find(s => ['defdown', 'slow', 'weaken', 'poison', 'burn', 'bleed'].includes(s.kind)) : null;
    const controlSkill = hasSkill ? e.skills.find(s => ['stun', 'freeze'].includes(s.kind)) : null;
    const drainSkill = hasSkill ? e.skills.find(s => s.kind === 'drain') : null;
    const roarSkill = hasSkill ? e.skills.find(s => s.kind === 'roar') : null;
    // 决策树
    if (e.charging) {
      // 蓄力完成：杀招
      e.charging = false;
      this.log(`${e.name} 蓄势已满，<b>杀招</b>轰然落下！`, 'log-crit');
      this.enemyStrike(st, 2.1, true);
    } else if (hpPct < 0.25 && healSkill && Utils.chance(70)) {
      // 濒死：优先治疗
      this.enemySkill(st, healSkill);
    } else if (hpPct < 0.35 && guardSkill && !e.guardRounds && Utils.chance(60)) {
      // 残血：开防御
      this.enemySkill(st, guardSkill);
    } else if (playerBuffed && debuffSkill && Utils.chance(50 + rageBonus)) {
      // 玩家有增益：驱散/削弱
      this.enemySkill(st, debuffSkill);
    } else if (playerLowHp && drainSkill && Utils.chance(50 + rageBonus)) {
      // 玩家残血：吸血斩杀
      this.enemySkill(st, drainSkill);
    } else if (!playerLowHp && controlSkill && !StatusFx.has(B.myFx, 'stun') && Utils.chance(35 + rageBonus)) {
      // 控制技能
      this.enemySkill(st, controlSkill);
    } else if (hpPct < 0.5 && !e.raged && roarSkill && Utils.chance(45 + rageBonus)) {
      // 半血增伤
      this.enemySkill(st, roarSkill);
    } else if (hasSkill && Utils.chance(50 + rageBonus)) {
      // 技能池随机
      const total = e.skills.reduce((s, x) => s + (x.w || 1), 0);
      let r = Math.random() * total, sk = e.skills[e.skills.length - 1];
      for (const s of e.skills) { r -= (s.w || 1); if (r <= 0) { sk = s; break; } }
      this.enemySkill(st, sk);
    } else if (Utils.chance((e.elite ? 30 : 20) + rageBonus) && !e.charging) {
      // 蓄力
      e.charging = true;
      this.log(`${e.name} 妖气翻涌、筋肉隆起——它正在<b>蓄力</b>，下回合将施展杀招！`, 'log-warn');
      this.pushFloat('enemy', '蓄力', 'miss');
    } else {
      // 普攻
      const heavy = Utils.chance((e.elite ? 35 : 25) + Math.floor(rageBonus / 2));
      this.enemyStrike(st, heavy ? 1.55 : 1, heavy);
    }
    // 回合数递减
    if (B.buffs.defRounds > 0) { B.buffs.defRounds--; if (B.buffs.defRounds === 0) B.buffs.defPower = 0; }
    if (B.buffs.dodgeRounds > 0) { B.buffs.dodgeRounds--; if (B.buffs.dodgeRounds === 0) B.buffs.dodgeBonus = 0; }
    if (e.guardRounds > 0) { e.guardRounds--; if (e.guardRounds === 0) e.guardPower = 0; }
    B.myFx = StatusFx.decayKinds(B.myFx, ['defdown', 'slow', 'weaken', 'atkup', 'defup', 'agiup', 'critup']);
    e.fx = StatusFx.decayKinds(e.fx, ['defdown', 'slow']);
    B.defending = false;
  },

  /** v13：敌方专属技能结算（毒/焰/血/破防/迟滞/虚弱/束缚/吸血/摄魂/铁壁/咆哮/自愈） */
  enemySkill(st, sk) {
    const B = this.active;
    const p = Game.player;
    const e = B.enemy;
    const kindMap = {
      poison: () => {
        this.enemyStrike(st, 0.8, false, `${sk.name}命中`);
        StatusFx.add(B.myFx, { kind: 'poison', pct: sk.pct || 3, rounds: sk.rounds || 3 });
        this.log(`【${sk.name}】毒液入体——你中毒了！每回合将损血，持续 ${sk.rounds || 3} 回合。`, 'log-loss');
        Ambience.sfx('poison');
      },
      burn: () => {
        this.enemyStrike(st, 0.9, false);
        StatusFx.add(B.myFx, { kind: 'burn', pct: sk.pct || 3.5, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】烈焰缠身——你被灼烧了！每回合将损血，持续 ${sk.rounds || 2} 回合。`, 'log-loss');
      },
      bleed: () => {
        this.enemyStrike(st, 1.1, false);
        StatusFx.add(B.myFx, { kind: 'bleed', pct: sk.pct || 2.5, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】伤口深可见骨——你流血不止！每回合将损血，持续 ${sk.rounds || 2} 回合。`, 'log-loss');
      },
      defdown: () => {
        this.enemyStrike(st, 0.9, false);
        StatusFx.add(B.myFx, { kind: 'defdown', pct: sk.pct || 25, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】你的护体罡气被破——防御下降${sk.pct || 25}%，持续 ${sk.rounds || 2} 回合！`, 'log-loss');
      },
      slow: () => {
        this.enemyStrike(st, 0.85, false);
        StatusFx.add(B.myFx, { kind: 'slow', pct: sk.pct || 25, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】气血滞涩，身法迟缓——身法下降${sk.pct || 25}%，持续 ${sk.rounds || 2} 回合！`, 'log-loss');
      },
      weaken: () => {
        this.enemyStrike(st, 0.9, false);
        StatusFx.add(B.myFx, { kind: 'weaken', pct: sk.pct || 20, rounds: sk.rounds || 2 });
        this.log(`【${sk.name}】劲力被卸——攻击下降${sk.pct || 20}%，持续 ${sk.rounds || 2} 回合！`, 'log-loss');
      },
      stun: () => {
        if (Utils.chance(e.elite ? 75 : 55)) {
          StatusFx.add(B.myFx, { kind: 'stun', rounds: sk.rounds || 1 });
          this.log(`【${sk.name}】你被震得气血翻腾，僵在原地——下回合无法行动！`, 'log-loss');
        } else {
          this.log(`【${sk.name}】你强提真气稳住身形，堪堪没有被震住！`, 'log-warn');
          this.enemyStrike(st, 0.8, false);
        }
      },
      drain: () => {
        const before = p.hp;
        this.enemyStrike(st, sk.mult || 1.2, true);
        const dealt = Math.max(0, before - p.hp);
        if (dealt > 0) {
          const healed = Math.max(1, Math.round(dealt * (sk.leech || 0.5)));
          e.hp = Math.min(e.hpMax, e.hp + healed);
          this.pushFloat('enemy', `+${healed}`, 'heal');
          this.log(`【${sk.name}】${e.name} 汲取你的精血，回复 ${healed} 点气血！`, 'log-loss');
        }
      },
      mpburn: () => {
        const burn = Math.max(1, Math.round(st.maxMp * (sk.pct || 25) / 100));
        p.mp = Math.max(0, p.mp - burn);
        this.pushFloat('me', `-${burn}灵力`, 'miss');
        this.log(`【${sk.name}】阴冷之力摄走你的灵力 ${burn} 点！`, 'log-loss');
        this.enemyStrike(st, 0.6, false);
      },
      guard: () => {
        e.guardPower = sk.def || 40;
        e.guardRounds = sk.rounds || 2;
        this.pushFloat('enemy', '铁壁', 'heal');
        this.log(`【${sk.name}】${e.name} 硬甲铿锵——防御大增（+${sk.def || 40}%），持续 ${sk.rounds || 2} 回合！`, 'log-warn');
      },
      roar: () => {
        e.atk = Math.round(e.atk * (1 + (sk.atk || 25) / 100));
        this.pushFloat('enemy', '咆哮', 'crit');
        this.log(`【${sk.name}】${e.name} 发出震天咆哮——攻击提升${sk.atk || 25}%！`, 'log-warn');
        Ambience.sfx('rage');
      },
      heal: () => {
        const healed = Math.max(1, Math.round(e.hpMax * (sk.pct || 15) / 100));
        e.hp = Math.min(e.hpMax, e.hp + healed);
        this.pushFloat('enemy', `+${healed}`, 'heal');
        this.log(`【${sk.name}】${e.name} 汲取天地生机，回复 ${healed} 点气血！`, 'log-warn');
      },
    };
    (kindMap[sk.kind] || (() => this.enemyStrike(st, 1, false)))();
  },

  /** v8：敌方一次攻击结算（mult 威力倍率；杀招同样可被闪避/格挡/防御化解；v13 计入状态修正） */
  enemyStrike(st, mult, heavy, tagText) {
    const B = this.active;
    const p = Game.player;
    const e = B.enemy;
    const dodgeChance = Utils.clamp(3 + (this.mySpd(st) - this.enSpd(e)) * 1.1 + st.dodge + (B.buffs.dodgeRounds > 0 ? B.buffs.dodgeBonus : 0), 0, 65);
    if (Utils.chance(dodgeChance)) {
      this.log(`${e.name} ${tagText || (heavy ? '杀招当头' : '扑击而来')}，却被你身形一晃，堪堪避过！`);
      this.pushFloat('me', '闪避', 'miss');
      this.addMorale(6);
      return;
    }
    let dmg = Stat.afterDef(this.enAtk(e) * mult, this.myDef(st)) * Utils.randF(0.85, 1.15);
    // v18 种族克制：敌方攻击时计算种族关系
    const speciesRel = GameData.speciesRelation(e.species, 'human');
    if (speciesRel > 0) dmg *= 1.15;
    else if (speciesRel < 0) dmg *= 0.85;
    const crit = Utils.chance(e.crit);
    if (crit) dmg *= 1.6;
    const blocked = Utils.chance(st.block);
    if (blocked) dmg *= 0.45;
    if (B.defending) dmg *= 0.4;
    // v13 金光护体（金光符）：减伤
    const shieldPct = StatusFx.pctOf(B.myFx, 'shield');
    if (shieldPct > 0) dmg *= 1 - shieldPct / 100;
    // v10 职业道境 · 般若一重「铜皮境」：所受伤害 -8%
    if (p.dao === 'body' && DaoSys.tierLevel(p) >= 1) dmg *= 0.92;
    // v10 境界特性 · 金丹护体：单次伤害超过三成气血上限时减免两成
    let guarded = false;
    if (p.realmIdx >= 2 && dmg > st.maxHp * 0.3) { dmg *= 0.8; guarded = true; }
    dmg = Math.max(1, Math.round(dmg));
    p.hp = Math.max(0, p.hp - dmg);
    B.combo = 0;   // v13 受击中断连击
    B.playerHit = true; // v18：玩家受击标记，渲染时触发震动反馈
    if (p.dao === 'body') DaoSys.gain(p, blocked ? 8 : 4);   // v16 体魄
    this.pushFloat('me', `-${dmg}`, crit || heavy ? 'crit' : 'dmg');
    this.addMorale(blocked ? 4 : -8);
    let text = crit ? `${e.name} 会心一击！你受到 <b>${dmg}</b> 点伤害！`
      : `${e.name} ${tagText || (heavy ? '施展杀招' : '攻击你')}，你受到 ${dmg} 点伤害。`;
    if (blocked) text += '（你举功格挡，卸去大半力道）';
    if (shieldPct > 0) text += '（金光卸力）';
    if (guarded) text += '（金丹护体，震开两成巨力）';
    this.log(text, crit ? 'log-crit' : 'log-battle');
  },

  rollDrops(e, ctx = {}) {
    const p = Game.player;
    const drops = [];
    if (Utils.chance(45)) {
      const qty = Utils.chance(20) ? 2 : 1;
      const mat = Utils.pick(GameData.matsByTier(e.dropTier));
      Bag.addItem(mat, qty);
      drops.push(`${GameData.ITEMS[mat].name} ×${qty}`);
    }
    // §23 魔域掉落提升：额外一撮战利品，偶得上古碎片
    if (ctx.dropMul) {
      if (Utils.chance(30)) {
        const mat = Utils.pick(GameData.matsByTier(e.dropTier));
        Bag.addItem(mat, 1);
        drops.push(`${GameData.ITEMS[mat].name} ×1`);
      }
      if (Utils.chance(10)) {
        Bag.addItem('m_gupian', 1);
        drops.push('【上古法宝碎片】');
      }
    }
    if (e.rareDrop && Utils.chance(30 + KarmaSys.rareDropBonus(p))) {
      const rd = GameData.ITEMS[e.rareDrop];
      if (!(rd.type === 'gongfa' && p.gongfa[e.rareDrop])) {
        Bag.addItem(e.rareDrop, 1);
        drops.push(`【${rd.name}】`);
      }
    }
    return drops;
  },

  async victory() {
    const B = this.active;
    const p = Game.player;
    B.over = true;
    const st = Stat.compute(p);
    // §24 切磋：点到为止，不取性命不掠财物
    if (B.ctx.spar) {
      this.log('二人收势而立，抱拳一礼——点到为止。', 'log-system');
      NpcSys.afterSpar(p, B.ctx.npcId, true);
      p.counters.spars = (p.counters.spars || 0) + 1;   // v6 成就计数
      BountySys.onSpar();   // v13 悬赏切磋进度
      Cultivate.addExp(p, Math.round(B.enemy.expGain * 0.3));
      await this.wait(700);
      this.end(false);
      Log.add(`你与 ${B.enemy.name} 切磋一场，略胜半招，颇有精进。`, 'gain');
      return;
    }
    this.log(`${B.enemy.name} 轰然倒地！你获得了胜利！`, 'log-system');
    p.counters.wins++;
    if (B.enemy.elite) p.counters.killsElite = (p.counters.killsElite || 0) + 1;   // v6 成就计数
    if (p.dao === 'demonic') DaoSys.gain(p, 6);   // v16 魔性：杀戮
    await this.wait(650);
    // 阵道：秘境遗迹收益+20%；邪修：吞噬精元，额外汲取两成修为
    const arrBonus = (B.ctx.mapId === 'ruins' && p.dao === 'array') ? 1.2 : 1;
    const expGain = Math.round(B.enemy.expGain * arrBonus);
    const stoneGain = Math.round(B.enemy.stoneGain * arrBonus * (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 5 ? 1.5 : 1));   // v10 魔君境
    Cultivate.addExp(p, expGain);
    Bag.addStones(stoneGain);
    this.log(`战利品：修为 +${Utils.fmtNum(expGain)}，灵石 +${Utils.fmtNum(stoneGain)}${arrBonus > 1 ? '（阵道造诣，于遗迹所获更丰）' : ''}${st.luck >= 8 && Utils.chance(15) ? '（福缘深厚，额外掉落灵石一袋）' : ''}`, 'log-gain');
    if (p.dao === 'demonic') {
      const extra = Math.round(expGain * (DaoSys.tierLevel(p) >= 1 ? 0.3 : 0.2));   // v10 血煞境：汲取提至三成
      Cultivate.addExp(p, extra);
      DaoSys.gain(p, 20);   // v16 魔性
      this.log(`你吞噬了对手残存的精元，额外汲取修为 ${Utils.fmtNum(extra)}。`, 'log-gain');
    }
    const drops = this.rollDrops(B.enemy, B.ctx);
    // v10 魔道六境·魔尊境：两成几率夺其天材地宝
    if (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 6 && Utils.chance(20)) {
      const tier = Math.min(4, Math.floor(p.realmIdx / 2) + 1);
      const mat = Utils.pick(GameData.matsByTier(tier));
      Bag.addItem(mat, 1);
      drops.push(`【${GameData.ITEMS[mat].name}】（魔尊摄宝）`);
    }
    if (drops.length) this.log(`捡获：${drops.join('、')}。`, 'log-gain');
    const vLine = Narrative.victory();   // v5：胜后收势句
    if (vLine) this.log(vLine, 'log-gain');
    if (B.enemy.id) SectSys.onKill(B.enemy.id);
    BountySys.onKill(B.enemy.id);   // v13 悬赏猎杀进度
    // §24 恩怨 / 了断 / 立场结算
    if (B.ctx.npcId && B.ctx.mode === 'hunt') NpcSys.onPlayerKillsNpc(p, B.ctx.npcId);
    if (B.ctx.npcId && B.ctx.mode === 'confront') NpcSys.onConfrontWin(p, B.ctx.npcId);
    if (B.ctx.mode === 'war' && p.sect) {
      p.sect.contrib += 200;
      this.log('战功赫赫！宗门贡献 +200。', 'log-gain');
    }
    if (B.ctx.sectDanger != null) SectSys.onDangerWin(B.ctx.sectDanger);
    // §23 魔界入侵：参与奖励
    if (B.ctx.weType === 'demon') {
      KarmaSys.addFortune(15);
      Bag.addItem('m_gupian', 1);
      this.log('你斩落狂化魔物，摘下一枚魔核与一块上古碎片！气运 +15。', 'log-gain');
    }
    // §25 秘境推进
    if (B.ctx.dungeon) DungeonSys.onVictory(B.ctx.dungeon, B.ctx.boss);
    await this.wait(900);
    this.end(false);
    UI.announce('战 斗 胜 利', 'ok');   // v4
    Ambience.sfx('victory');   // v5
    Log.add(`你击败了 <b>${B.enemy.name}</b>，获得修为 ${Utils.fmtNum(expGain)}、灵石 ${Utils.fmtNum(stoneGain)}${drops.length ? `、${drops.join('、')}` : ''}${p.dao === 'demonic' ? `，并吞噬其精元（修为额外 +${Utils.fmtNum(Math.round(expGain * (p.dao === 'demonic' && DaoSys.tierLevel(p) >= 1 ? 0.3 : 0.2)))}）` : ''}。`, 'gain');
  },

  async defeat() {
    const B = this.active;
    const p = Game.player;
    B.over = true;
    this.log('你眼前一黑，重重倒了下去……', 'log-loss');
    await this.wait(900);
    // §24 切磋落败：点到为止，不伤根本
    if (B.ctx.spar) {
      NpcSys.afterSpar(p, B.ctx.npcId, false);
      p.counters.spars = (p.counters.spars || 0) + 1;   // v6 成就计数
      p.hp = Math.max(1, Math.round(Stat.compute(p).maxHp * 0.2));
      this.end(false);
      Log.add(`你与 ${B.enemy.name} 切磋落败，技不如人，虽无大碍亦有所悟。`, 'info');
      return;
    }
    // §25 秘境陨落：背包三成之物永远留在其中
    if (B.ctx.dungeon) {
      await DungeonSys.onDefeat();
      this.end(false);
      return;
    }
    const st = Stat.compute(p);
    // §24 危机相助：好友/结拜/道侣概率出手
    const aid = NpcSys.tryAid(p, 'battle');
    const mul = aid ? 0.4 : 1;
    if (aid) Log.add(`危急关头，<b>${aid.name}</b> 仗剑而至，拼死将你救出！折损因此大减。`, 'gain');
    const lostExp = Math.round(p.exp * 0.1 * mul);
    p.exp = Math.max(0, p.exp - lostExp);
    const lostLow = Math.round(p.stones.low * 0.2 * mul);
    p.stones.low -= lostLow;
    p.hp = Math.max(1, Math.round(st.maxHp * 0.3));
    p.mp = Math.round(st.maxMp * 0.2);
    p.counters.defeats = (p.counters.defeats || 0) + 1;   // v6 成就计数
    Time.add(3);
    Log.add(`不知过了多久，你被人救回了村中。此战折损修为 ${Utils.fmtNum(lostExp)}、灵石 ${Utils.fmtNum(lostLow)}，捡回一条性命。`, 'loss');
    Log.add('伤敌不足，修身有余。且调理伤势，再图精进。', 'warn');
    const dLine = Narrative.defeat();   // v5：败后道心句
    if (dLine) this.log(dLine, 'log-loss');
    this.end(false);
    UI.announce('战 斗 落 败', 'bad');   // v4
  },

  /** 结束战斗（统一收尾） */
  end() {
    const B = this.active;
    const p = Game.player;
    // 邪修：杀伐之气萦绕，每场战斗孽障 +1
    if (B && p && p.dao === 'demonic') {
      p.karma = (p.karma || 0) + 1;
      DaoSys.gain(p, 2);   // v16 魔性
      Log.add('杀伐之气萦绕不去——孽障 +1。', 'loss');
    }
    const box = document.getElementById('battle-box');
    if (box) box.innerHTML = '';
    document.getElementById('battle-modal').classList.add('hidden');
    this.active = null;
    Game.afterAction();
  },

  /** v13：全屏技能特效（剑光/雷落/火焰/冰霜）。
   *  render 会整体重建战斗 DOM，故特效先挂起，render 完成后重播，避免被 innerHTML 重建清除。 */
  fxShow(kind) {
    this._pendingFx = kind;
    const modal = document.getElementById('battle-modal');
    if (modal && !modal.classList.contains('hidden') && document.getElementById('bt-log')) this._playFx(kind);
  },
  _playFx(kind) {
    const modal = document.getElementById('battle-modal');
    if (!modal || modal.classList.contains('hidden')) return;
    let layer = document.getElementById('bt-fx-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'bt-fx-layer';
      modal.querySelector('.battle-box').appendChild(layer);
    }
    const fx = document.createElement('div');
    fx.className = `bt-fx fx-${kind || 'sword'}`;
    layer.appendChild(fx);
    setTimeout(() => fx.remove(), 900);
  },

  /** 战斗界面渲染 */
  render() {
    const B = this.active;
    if (!B) return;
    const p = Game.player;
    const st = Stat.compute(p);
    const e = B.enemy;
    const hpPct = Utils.clamp(p.hp / st.maxHp * 100, 0, 100);
    const mpPct = Utils.clamp(p.mp / st.maxMp * 100, 0, 100);
    const ePct = Utils.clamp(e.hp / e.hpMax * 100, 0, 100);

    let sub = '';
    if (B.menu === 'skill') {
      const skills = Object.entries(p.gongfa)
        .filter(([id]) => GameData.ITEMS[id] && GameData.ITEMS[id].skill)
        .map(([id, g]) => {
          const def = GameData.ITEMS[id];
          const sk = def.skill;
          const cost = Math.ceil(st.maxMp * sk.mp / 100 * (p.dao === 'talisman' ? 1.2 : 1));   // 与实际扣费一致（符修 +20%）
          const dis = B.busy || p.mp < cost;
          return `<button class="btn btn-sm" data-action="bt-skill" data-gf="${id}" ${dis ? 'disabled' : ''}>
            <span class="grade-${def.grade}">${sk.name}</span>
            <span style="color:var(--mp)">（灵力${cost}）</span></button>`;
        });
      sub = skills.length
        ? `<div class="bt-sub">${skills.join('')}<button class="btn btn-sm" data-action="bt-back">返回</button></div>`
        : `<div class="bt-sub"><button class="btn btn-sm" data-action="bt-back">你尚未修习带神通的法诀，返回</button></div>`;
    } else if (B.menu === 'item') {
      const pills = Object.keys(p.bag)
        .filter(id => {
          const d = GameData.ITEMS[id];
          return d && (d.type === 'pill' || d.type === 'talisman');
        })
        .map(id => `<button class="btn btn-sm" data-action="bt-item" data-item="${id}" ${B.busy ? 'disabled' : ''}>
          ${GameData.ITEMS[id].name} ×${p.bag[id]}</button>`);
      sub = pills.length
        ? `<div class="bt-sub">${pills.join('')}<button class="btn btn-sm" data-action="bt-back">返回</button></div>`
        : `<div class="bt-sub"><button class="btn btn-sm" data-action="bt-back">囊中空空如也，返回</button></div>`;
    }

    const speedLabels = { 1: '×1', 2: '×2', 3: '极速' };
    const btns = [
      `<button class="btn" data-action="bt-attack" ${B.busy ? 'disabled' : ''}>普 攻</button>`,
      `<button class="btn" data-action="bt-menu" data-menu="skill" ${B.busy ? 'disabled' : ''}>法 诀</button>`,
      `<button class="btn" data-action="bt-defend" ${B.busy ? 'disabled' : ''}>防 御</button>`,
      `<button class="btn" data-action="bt-menu" data-menu="item" ${B.busy ? 'disabled' : ''}>道 具</button>`,
      `<button class="btn" data-action="bt-flee" ${B.busy ? 'disabled' : ''}>遁 走</button>`,
    ].join('');
    // v13 自动战斗 / 速度 / 驯服（妖兽残血可驯）
    const ctlBtns = [
      `<button class="btn btn-sm ${B.auto ? 'btn-primary' : ''}" data-action="bt-auto" ${B.over ? 'disabled' : ''}>${B.auto ? '◼ 停止自动' : '▶ 自动战斗'}</button>`,
      `<button class="btn btn-sm" data-action="bt-speed" title="战斗速度">速度 ${speedLabels[this.speed] || '×1'}</button>`,
    ].join('');
    const canTame = !!(B.enemy.id && !B.enemy.elite && B.enemy.species !== 'human' && B.enemy.species !== 'construct'
      && B.enemy.hp > 0 && B.enemy.hp <= B.enemy.hpMax * 0.2 && !B.over);
    const tameBtn = canTame
      ? `<button class="btn btn-sm btn-primary btn-glow" data-action="bt-tame">✦ 驯 服（灵兽残血）</button>`
      : '';

    document.getElementById('battle-box').innerHTML = `
      <div class="battle-head">— 修 罗 场 —</div>
      <div class="bt-side side-enemy ${e.raged ? 'raged' : ''}" data-species="${e.species || 'beast'}">
        <div class="bt-name-row"><span class="bt-name enemy">${e.name}${e.elite ? ' <span class="tag danger">精英</span>' : ''}${e.raged ? ' <span class="tag danger">狂暴</span>' : ''}${e.charging ? ' <span class="tag danger">蓄力杀招</span>' : ''}${StatusFx.has(e.fx, 'stun') || StatusFx.has(e.fx, 'freeze') ? ' <span class="tag">被缚</span>' : ''}</span><span class="bt-realm">${e.realmLabel} · 攻${this.enAtk(e)} 防${this.enDef(e)}</span></div>
        <div class="bt-figure enemy-fig" aria-hidden="true"></div>
        <div class="fx-tags">${StatusFx.tagsHtml(e.fx)}</div>
        <div class="bar"><div class="bar-fill hp${e.raged ? ' rage' : ''}" style="width:${ePct}%"></div><span class="bar-text"><span class="num-anim" data-nk="bt-ehp" data-nv="${e.hp}">${e.hp}</span> / ${e.hpMax}</span></div>
      </div>
      <div class="bt-vs">—— ✦ ——</div>
      <div class="bt-side side-me">
        <div class="bt-name-row"><span class="bt-name me">${Utils.esc(p.name)}${B.combo >= 2 ? ` <span class="tag combo">连击×${B.combo}</span>` : ''}${B.auto ? ' <span class="tag safe">自动</span>' : ''}</span><span class="bt-realm">攻${this.myAtk(st)} 防${this.myDef(st)} · 暴击${this.myCrit(st).toFixed(0)}%</span></div>
        <div class="bar" title="气血 ${p.hp} / ${st.maxHp}"><div class="bar-fill hp${hpPct <= 30 ? ' low' : ''}" style="width:${hpPct}%"></div><span class="bar-text"><span class="num-anim" data-nk="bt-hp" data-nv="${p.hp}">${p.hp}</span> / ${st.maxHp}</span></div>
        <div class="bar" title="灵力 ${p.mp} / ${st.maxMp}"><div class="bar-fill mp" style="width:${mpPct}%"></div><span class="bar-text"><span class="num-anim" data-nk="bt-mp" data-nv="${p.mp}">${p.mp}</span> / ${st.maxMp}</span></div>
        <div class="bar morale-bar" title="战意：连击提升，受挫回落（每点 +0.4% 伤害）"><div class="bar-fill morale" style="width:${B.morale || 0}%"></div><span class="bar-text">战意 ${B.morale || 0}${(B.morale || 0) >= 100 ? '（伤害 +40%）' : ''}</span></div>
        <div class="fx-tags">${StatusFx.tagsHtml(B.myFx)}</div>
      </div>
      <div id="bt-log"></div>
      ${sub}
      ${tameBtn}
      <div class="bt-actions" style="margin-top:8px">${btns}</div>
      <div class="bt-ctl">${ctlBtns}</div>
    `;
    Anim.scan(document.getElementById('battle-box'));   // v4：战斗数值滚动
    // v7：浮动伤害/治疗数字 + 敌方受击震动（战斗即时反馈）
    const eside = document.querySelector('#battle-box .side-enemy');
    const mside = document.querySelector('#battle-box .side-me');
    // v13：敌方剪影立绘
    const efig = document.querySelector('#battle-box .enemy-fig');
    if (efig) efig.innerHTML = Art.monster(e.species || 'beast', !!e.elite);
    if (B.floats.length) {
      for (const f of B.floats) {
        const host = f.side === 'enemy' ? eside : mside;
        if (!host) continue;
        const d = document.createElement('div');
        d.className = 'float-num ' + f.kind;
        d.textContent = f.text;
        d.style.left = (26 + Math.random() * 44) + '%';
        host.appendChild(d);
        setTimeout(() => d.remove(), 1100);
      }
      B.floats = [];
    }
    if (B.hitShake && eside) {
      eside.classList.remove('enemy-shake');
      void eside.offsetWidth;
      eside.classList.add('enemy-shake');
      B.hitShake = false;
    }
    // render 会整体重建战斗 DOM，这里回放历史战斗日志
    const logBox = document.getElementById('bt-log');
    if (logBox) {
      for (const { html, cls } of B.logs) {
        const div = document.createElement('div');
        div.className = 'log-entry ' + cls;
        div.innerHTML = html;
        logBox.appendChild(div);
      }
      logBox.scrollTop = logBox.scrollHeight;
    }
    // v13：重播挂起的技能特效（render 重建 DOM 后特效层需重建）
    if (this._pendingFx) {
      const kind = this._pendingFx;
      this._pendingFx = null;
      this._playFx(kind);
    }
  },
};

/* ======================================================================
 * §15 新手引导
 * ====================================================================== */
const Tutorial = {
  steps: [
    { icon: '☯', title: '欢迎踏入仙途', text: '这里是弱肉强食的修真界。你将以凡人之躯，一步步修炼至飞升成仙。<br>境界面板、行动操作、背包菜单都在眼前——且听我一一道来。' },
    { icon: '📜', title: '左侧 · 道途面板', text: '随时查看你的<b>境界修为</b>、气血灵力、先天四维（根骨 / 悟性 / 福缘 / 体魄）与战斗属性。<br>每个境界都有独有的<b>境界特性</b>，择定大道后更可修炼<b>职业道境</b>——皆在此一览。修为攒满即可突破，寿元耗尽则道消身殒，切莫蹉跎岁月。' },
    { icon: '⚔', title: '中央 · 行动与游历', text: '<b>修炼</b>积攒修为，<b>探索</b>历练搏杀，<b>坊市</b>买卖丹药法器，筑基后可拜入<b>宗门</b>。<br>下方游历记载会记录你的每一步。遇敌时可选普攻、法诀、丹药或遁走。' },
    { icon: '🎒', title: '右侧 · 背包与存档', text: '丹药、功法、法宝、材料分类收纳。法宝可装备，功法可参悟升级。<br>菜单中可随时存读档（共三档 + 自动存档）。' },
    { icon: '🕳', title: '最后一句忠告', text: '丹药虽好，丹毒伤身；地图凶险，量力而行。<br>境界不足莫闯险地，否则……重伤事小，道消事大。<br>此外：「游历」页有<b>天下大势</b>与各大境界的<b>秘境</b>，「江湖」页可结交十五位常驻修士——恩怨情仇，皆是道途。<br><b>祝道友早日飞升！</b>' },
  ],
  idx: 0,
  show(force = false) {
    const seen = Save.storage.getItem ? Save.storage.getItem('fanren_wd_tutorial') : Save.mem['fanren_wd_tutorial'];
    if (seen && !force) return;
    this.idx = 0;
    document.getElementById('tutorial').classList.remove('hidden');
    this.render();
  },
  render() {
    const s = this.steps[this.idx];
    document.getElementById('tutorial-step').innerHTML = `
      <div class="t-icon">${s.icon}</div><h3>${s.title}</h3><div>${s.text}</div>`;
    document.getElementById('tutorial-dots').innerHTML =
      this.steps.map((_, i) => `<span class="${i === this.idx ? 'on' : ''}"></span>`).join('');
    const next = document.querySelector('[data-action="tut-next"]');
    if (next) next.textContent = this.idx === this.steps.length - 1 ? '踏入仙途' : '下一步';
  },
  next() {
    if (this.idx < this.steps.length - 1) { this.idx++; this.render(); }
    else this.finish();
  },
  prev() { if (this.idx > 0) { this.idx--; this.render(); } },
  finish() {
    document.getElementById('tutorial').classList.add('hidden');
    try {
      if (Save.storage.setItem) Save.storage.setItem('fanren_wd_tutorial', '1');
      else Save.mem['fanren_wd_tutorial'] = '1';
    } catch (e) { /* ignore */ }
    if (Game.player) {
      Game.player.flags.tutorialDone = true;
      Save.autoSave();
    }
  },
};

/* ======================================================================
 * §15.4 v15 剧情演出引擎 StorySys（卷轴旁白 / 人物对话 / 抉择 / 结算）
 * play(script, onEnd)：script = { id, scenes: [...] }，逐场推进的全屏卷轴演出。
 * 场景格式：
 *   { t:'narr',  text }                          旁白卷轴（\n 分段）
 *   { t:'dialog', who, title, color, text }      人物对话（名牌 + 台词）
 *   { t:'choice', text, options:[{text, value}], pick(value) }  抉择 → pick 返回结算文本数组
 *   { t:'reward', lines:[...] }                  章末结算
 * 已看过的剧情记入 p.story.seen，「问道录」可回顾重读。
 * ====================================================================== */
const Story = {
  q: [],            // 播放队列：章末剧情 → 下一章开篇可无缝衔接
  cur: null,        // { id, title, scenes, idx, onEnd, readonly }
  active() { return !!this.cur; },
  /** 播放一段剧情（同一 id 常规只播一次；force=回顾重读）。播放中收到新脚本则入队。 */
  play(script, onEnd, force = false) {
    if (!script || !script.scenes || !script.scenes.length) { if (onEnd) onEnd(); return; }
    if (!force && this.isSeen(script.id)) { if (onEnd) onEnd(); return; }
    if (this.cur) { this.q.push({ script, onEnd, force }); return; }
    this._start(script, onEnd, force);
  },
  _start(script, onEnd, force) {
    if (!force) this.markSeen(script.id);
    this.cur = { id: script.id, title: script.title || '', scenes: script.scenes, idx: 0, onEnd: onEnd || null, readonly: !!force };
    let modal = document.getElementById('story-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'story-modal';
      modal.className = 'modal';
      modal.innerHTML = '<div class="story-box" id="story-box"></div>';
      document.getElementById('app').appendChild(modal);
    }
    modal.classList.remove('hidden');
    this.render();
  },
  isSeen(id) {
    const p = Game.player;
    return !!(p && p.story && p.story.seen[id]);
  },
  markSeen(id) {
    const p = Game.player;
    if (!p) return;
    if (!p.story) p.story = { seen: {}, mid: {}, choices: {} };
    p.story.seen[id] = Math.floor(p.day || 0) + 1;
  },
  /** 抉择记录（每章末记录所选 value） */
  recordChoice(key, value) {
    const p = Game.player;
    if (!p) return;
    if (!p.story) p.story = { seen: {}, mid: {}, choices: {} };
    p.story.choices[key] = value;
  },
  choiceOf(key) {
    const p = Game.player;
    return (p && p.story && p.story.choices[key]) || null;
  },
  next() {
    const c = this.cur;
    if (!c) return;
    c.idx++;
    if (c.idx >= c.scenes.length) return this.finish();
    this.render();
  },
  async choose(i) {
    const c = this.cur;
    if (!c) return;
    const sc = c.scenes[c.idx];
    const opt = sc.options[i];
    if (!opt) return;
    const lines = sc.pick ? await sc.pick(opt.value) : null;
    this.recordChoice(c.id, opt.value);
    // 抉择后插入结果旁白
    c.scenes.splice(c.idx + 1, 0, { t: 'narr', text: (lines || ['冥冥之中，因果已种。']).join('') });
    this.next();
  },
  finish() {
    const c = this.cur;
    this.cur = null;
    const modal = document.getElementById('story-modal');
    if (modal) modal.classList.add('hidden');
    if (c && c.onEnd) { const fn = c.onEnd; c.onEnd = null; fn(); }
    // 队列中的下一段剧情自动衔接
    const next = this.q.shift();
    if (next) {
      setTimeout(() => this._start(next.script, next.onEnd, next.force), 250);
    }
  },
  /** 回顾模式的 ✕：关闭并清空队列（不再衔接后续段落） */
  close() { this.q = []; this.finish(); },
  render() {
    const c = this.cur;
    if (!c) return;
    const box = document.getElementById('story-box');
    if (!box) return;
    const sc = c.scenes[c.idx];
    let body = '';
    if (sc.t === 'dialog') {
      const color = sc.color || '#6a5a3e';
      body = `
      <div class="story-dialog">
        <div class="story-figure" style="--fig-c:${color}">${(sc.who || '？')[0]}</div>
        <div class="story-dialog-main">
          <div class="story-who" style="color:${color}">${Utils.esc(sc.who)}<span class="story-who-title">${Utils.esc(sc.title || '')}</span></div>
          <div class="story-text">${sc.text}</div>
        </div>
      </div>`;
    } else if (sc.t === 'choice') {
      body = `
      <div class="story-text story-choice-lead">${sc.text}</div>
      <div class="story-choices">${sc.options.map((o, i) =>
        `<button class="story-opt" data-action="story-choice" data-story-choice="${i}">${o.text}</button>`).join('')}</div>`;
    } else if (sc.t === 'reward') {
      body = `
      <div class="story-reward">
        <div class="story-reward-title">✦ 章 末 · 结 算</div>
        ${sc.lines.map(l => `<div class="story-reward-line">${l}</div>`).join('')}
      </div>`;
    } else {
      body = sc.text.split('\n').map(t => `<p class="story-p">${t}</p>`).join('');
    }
    const last = c.idx >= c.scenes.length - 1;
    box.innerHTML = `
      ${c.title ? `<div class="story-chapter">${Utils.esc(c.title)}</div>` : ''}
      <div class="story-body">${body}</div>
      ${sc.t === 'choice' ? '' : `<div class="story-foot">
        <span class="story-page">${c.idx + 1} / ${c.scenes.length}</span>
        <button class="btn btn-primary" data-action="story-next">${c.readonly ? '合 上' : (last ? '终 ✦' : '继 续 ▸')}</button>
      </div>`}
      ${c.readonly ? '<button class="story-close-x" data-action="story-close" title="关闭">✕</button>' : ''}`;
    // 旁白渐显
    box.querySelectorAll('.story-p').forEach((el, i) => { el.style.animationDelay = (i * 0.18) + 's'; });
  },
};

/* ======================================================================
 * §15.5 v11 剧情 · 问道九章 QuestSys（主线 + 奇遇录支线）
 * 主线：九章剧情随修为推进，每章开篇叙事 + 阶段目标 + 章末奖励；
 * 支线：奇遇录五则，达到境界解锁，达成后结案领赏。
 * 全部目标挂靠既有玩法行为，不新增玩法负担。
 * ====================================================================== */
const QuestSys = {
  checking: false,
  CN9: ['一', '二', '三', '四', '五', '六', '七', '八', '九'],
  /** 主线九章（supR：境界领先到该大境界时，本章目标自动追认完成——中期入坑亦可补剧情） */
  CHAPTERS: [
    {
      id: 'c1', title: '尘缘', supR: 2,
      story: '你上山采药归来，村中纸钱飞扬——相熟的采药老人殁了。\n临终前老人攥着你的手，往你掌心塞了半枚温润古玉：「孩子……老朽本非凡人……这残玉，是血河宗的信物……替我……查清当年的灭门血案……」\n言未尽，人已逝。你葬了老人，将残玉贴身收好——修行之路，自此多了一个执念。',
      goal: '采药老人临终托付半枚血河宗残玉，嘱你查明灭门血案。先打好根基，再入江湖。',
      steps: [
        { desc: '根基初固（修为至练气中期）', done: p => p.realmIdx >= 1 || p.layer >= 1, prog: p => `${Math.min(1, p.realmIdx >= 1 ? 1 : p.layer)}/1` },
        { desc: '尘世历练（新手村·后山探索五次）', done: p => ((p.counters.mapExplores || {}).village || 0) >= 5, prog: p => `${Math.min(5, (p.counters.mapExplores || {}).village || 0)}/5` },
        { desc: '除魔自保（累计击败妖兽三头）', done: p => (p.counters.wins || 0) >= 3, prog: p => `${Math.min(3, p.counters.wins || 0)}/3` },
      ],
      ending: '三月苦修，你根基渐固。残玉在你气海中隐隐发烫——老人所说的血案，或许就藏在前方的山水之间。',
      reward: { stones: 300, fortune: 2, items: { pill_juqi: 2 } },
    },
    {
      id: 'c2', title: '青峰疑云', supR: 2,
      story: '残玉入夜生温。你循着感应来到青峰山——山坳深处，黑风寨的人马竟在夜里挖掘一座上古遗迹，为首之人一袭黑袍，手腕上赫然刺着与残玉同源的赤色河纹。\n你屏息记下一切，悄然而退。回到村中，你彻夜难眠：血河宗三百年前不是被灭门了么？这些人在挖什么？',
      goal: '残玉引你至青峰山，黑风寨背后的黑袍人腕刺河纹——偷袭遗迹之事，须从长计议。',
      steps: [
        { desc: '探查青峰山（青峰山探索三次）', done: p => ((p.counters.mapExplores || {}).qingfeng || 0) >= 3, prog: p => `${Math.min(3, (p.counters.mapExplores || {}).qingfeng || 0)}/3` },
        { desc: '剿灭贼党（累计获胜八场）', done: p => (p.counters.wins || 0) >= 8, prog: p => `${Math.min(8, p.counters.wins || 0)}/8` },
        { desc: '修至练气圆满', done: p => p.realmIdx >= 1 || p.layer >= 3, prog: p => p.realmIdx >= 1 ? '1/1' : `${p.layer}/3` },
      ],
      ending: '练气圆满之夜，残玉微鸣。你听见了遗迹深处传来的低语——那不是妖物，是人。血案的门，开了一道缝。',
      reward: { stones: 800, items: { pill_ningqi: 2 } },
    },
    {
      id: 'c3', title: '筑基风云', supR: 3,
      story: '你突破筑基那夜，残玉裂开一道细纹，露出内里一行小字：「血河不灭，此玉不宁。」\n坊市酒肆间，你终于听到一个完整的名字——血河宗，三百年前被正道围灭的魔宗。而当年主持围杀的，竟是如今某位德高望重的太上长老。\n欲查血案，须入宗门。你决定择一宗门栖身，借其藏书与耳目。',
      goal: '筑基之夜残玉显字。入宗门、修功法，借宗门之势追查血河宗旧案。',
      steps: [
        { desc: '突破至筑基期', done: p => p.realmIdx >= 1, prog: p => `${p.realmIdx >= 1 ? 1 : 0}/1` },
        { desc: '拜入一座宗门', done: p => !!p.sect, prog: p => `${p.sect ? 1 : 0}/1` },
        { desc: '修习第一部功法', done: p => (p.counters.learns || 0) >= 1, prog: p => `${Math.min(1, p.counters.learns || 0)}/1` },
      ],
      ending: '宗门典籍浩如烟海。你在故纸堆中翻到一页残卷：「血河宗主练万魂丹，以生魂饲之……」字迹至此被血渍浸透。你握紧残玉——路还很长。',
      reward: { stones: 2000, items: { pill_zhuji: 1 } },
    },
    {
      id: 'c4', title: '红尘炼心', supR: 3,
      story: '宗门长老见你勤勉，私下透露：当年围杀血河宗的密令，出自一封无落款的黑玉令。而黑玉令的主人，如今仍在暗处。\n长老劝你：此事牵扯甚广，先炼心，后问案。你走入红尘——恩怨、善恶、抉择，皆是修行。',
      goal: '黑玉令主仍在暗处。长老劝你先炼心后问案——红尘劫、江湖义，皆是道途。',
      steps: [
        { desc: '广结善缘（结交一位江湖修士）', done: p => (p.counters.befriends || 0) >= 1, prog: p => `${Math.min(1, p.counters.befriends || 0)}/1` },
        { desc: '红尘一念（经历一次红尘劫抉择）', done: p => (p.counters.dilemmas || 0) >= 1, prog: p => `${Math.min(1, p.counters.dilemmas || 0)}/1` },
        { desc: '百战炼心（累计获胜二十场）', done: p => (p.counters.wins || 0) >= 20, prog: p => `${Math.min(20, p.counters.wins || 0)}/20` },
      ],
      ending: '红尘一遭，你见过跪地求饶的劫匪，也见过袖手旁观的仙师。善恶从来不在门派，而在人心。你摸了摸残玉——血河宗之事，你更想查明白了。',
      reward: { stones: 5000, fortune: 10 },
    },
    {
      id: 'c5', title: '金丹之秘', supR: 4,
      story: '金丹天劫的雷光中，残玉骤然炸响！一段不属于自己的记忆涌入识海——\n你看见你的前世：一袭黑袍，腕刺河纹，正是血河宗首席。你不忍万魂丹以千魂炼就，背叛宗门；宗主一掌将你打下诛仙台，临死前你以秘法将一缕真灵封入残玉……\n如今，它找回了你。',
      goal: '金丹劫中前世记忆苏醒——你竟是血河宗叛徒转世。丹道试炼，重拾旧我。',
      steps: [
        { desc: '成功突破金丹期', done: p => p.realmIdx >= 2, prog: p => `${p.realmIdx >= 2 ? 1 : 0}/1` },
        { desc: '丹道初窥（炼丹成丹或服丹，累计三次）', done: p => ((p.counters.craftsOk || 0) + (p.counters.pills || 0)) >= 3, prog: p => `${Math.min(3, (p.counters.craftsOk || 0) + (p.counters.pills || 0))}/3` },
        { desc: '挫敌扬威（累计击败精英妖兽两头）', done: p => (p.counters.killsElite || 0) >= 2, prog: p => `${Math.min(2, p.counters.killsElite || 0)}/2` },
      ],
      ending: '记忆归位，你对宗主的恨意有了温度——那是前世未尽的执念。残玉中除了记忆，还藏着一卷《血河真解》的目录：其本体，就在宗主手中。',
      reward: { stones: 10000, items: { pill_pojing: 1 } },
    },
    {
      id: 'c6', title: '元婴杀局', supR: 5,
      story: '元婴初成，神识大涨的当夜，你感应到三道杀意掠过天际——血河宗主的分身，循着残玉的气息来了。\n正面相抗必死无疑。你想起典籍记载：上古法宝，克魔魂。集齐碎片，或有一线生机。',
      goal: '宗主分身循残玉之气追杀而至。深入秘境、汇聚上古碎片，铸克制之力。',
      steps: [
        { desc: '成功突破元婴期', done: p => p.realmIdx >= 3, prog: p => `${p.realmIdx >= 3 ? 1 : 0}/1` },
        { desc: '秘境探幽（秘境抵达第三层）', done: p => (p.counters.maxDepth || 0) >= 3, prog: p => `${Math.min(3, p.counters.maxDepth || 0)}/3` },
        { desc: '碎片聚势（累计收取上古法宝碎片五枚）', done: p => (p.counters.gupianGot || 0) >= 5, prog: p => `${Math.min(5, p.counters.gupianGot || 0)}/5` },
      ],
      ending: '五枚碎片在你掌心嗡鸣，与体内残玉遥相呼应。分身的杀意暂时退去——它在等，等宗主本尊出关。你也在等，等自己足够强。',
      reward: { stones: 20000, items: { m_gupian: 2 } },
    },
    {
      id: 'c7', title: '血河旧账', supR: 6,
      story: '化神之后，你的名字开始在各宗长老间流传。这日，一位白须掌门亲自到访，开门见山：「三百年前灭血河宗那一战，老夫也被黑玉令牵着走。老朽时日无多——你若要查，老夫把当年的名字给你。」\n他留下一个名单。第一个名字，正是当世一位德高望重的太上长老。',
      goal: '化神成名，白须掌门递来当年围杀血河宗的名单——第一个名字位高权重。',
      steps: [
        { desc: '成功突破化神期', done: p => p.realmIdx >= 4, prog: p => `${p.realmIdx >= 4 ? 1 : 0}/1` },
        { desc: '精英授首（累计击败精英妖兽八头）', done: p => (p.counters.killsElite || 0) >= 8, prog: p => `${Math.min(8, p.counters.killsElite || 0)}/8` },
        { desc: '家底殷实（灵石积蓄十万）', done: p => (p.stones.low + p.stones.mid * 100 + p.stones.high * 10000) >= 100000, prog: p => `${Utils.fmtNum(Math.min(100000, p.stones.low + p.stones.mid * 100 + p.stones.high * 10000))}/10万` },
      ],
      ending: '名单在手，你反而冷静下来。棋盘比你想的大——但你已不是当年那个采药少年。金丹已固，化神已稳，接下来，该让某些人睡不着了。',
      reward: { stones: 50000, fortune: 5 },
    },
    {
      id: 'c8', title: '大乘问道', supR: 8,
      story: '大乘雷劫落定，你的道已近圆满。黑袍人的杀意越来越近，残玉彻夜长鸣。\n你深知：决战之前，当有亲友相依、大道相佐——孤身一人，挡不住三百年布局的仇家。',
      goal: '决战将临。觅相依之人、参大道之理，方有与宗主同台的资格。',
      steps: [
        { desc: '成功突破大乘期', done: p => p.realmIdx >= 7, prog: p => `${p.realmIdx >= 7 ? 1 : 0}/1` },
        { desc: '觅得相依之人（结为道侣或义结金兰）', done: p => !!p.partner || (p.sworn || []).length > 0, prog: p => `${(p.partner ? 1 : 0) + Math.min(1, (p.sworn || []).length)}/1` },
        { desc: '参悟小成（任意功法修至第三层）', done: p => Object.values(p.gongfa || {}).some(g => g.level >= 3), prog: p => { let mx = 0; for (const g of Object.values(p.gongfa || {})) mx = Math.max(mx, g.level); return `${Math.min(3, mx)}/3`; } },
      ],
      ending: '道友在侧，真意在胸。残玉忽然安静下来——它感应到了什么。决战之地，已被选定：你的飞升雷台。',
      reward: { stones: 100000, fortune: 10, items: { pill_taichu: 1 } },
    },
    {
      id: 'c9', title: '天劫决战', supR: 999,
      story: '渡劫雷云压顶之际，一道黑影踏雷而来——三百年前将你打下诛仙台的血河宗主，竟也踏入了这一方天地！\n他要在天劫中夺舍转世的你，炼成万魂丹最后的主魂。\n雷海之上，新旧两世，终须一战。',
      goal: '飞升雷台，即决战之地。渡劫、斩敌、飞升——三百年恩怨，雷海了结。',
      steps: [
        { desc: '成功突破渡劫期', done: p => p.realmIdx >= 8, prog: p => `${p.realmIdx >= 8 ? 1 : 0}/1` },
        { desc: '精英十授首（累计击败精英妖兽十五头）', done: p => (p.counters.killsElite || 0) >= 15, prog: p => `${Math.min(15, p.counters.killsElite || 0)}/15` },
        { desc: '白日飞升（于天劫中了断三百年因果）', done: p => !!(p.flags || {}).ascended, prog: p => `${(p.flags || {}).ascended ? 1 : 0}/1` },
      ],
      ending: '第九道天雷落下时，你引动残玉中前世的全部血煞，与宗主的魔身同缚雷心。雷光吞没一切的刹那，你听见宗主的咆哮化作一声长叹：「三百年……原来输的是我心魔。」\n雷散，云开。残玉化入你的眉心，化作一点朱砂。你回首人间，白衣胜雪——仙门之后，另有一番天地。',
      reward: { stones: 200000, fortune: 20 },
    },
  ],
  /** 奇遇录 · 支线五则（minRealm 解锁境界） */
  SIDES: [
    {
      id: 's1', title: '义庄尸变', minRealm: 0,
      story: '新手村义庄近来夜半有声，更夫不敢值夜。你自告奋勇守夜——子时刚过，棺木果然自己动了。',
      steps: [
        { desc: '村中历练（新手村·后山探索八次）', done: p => ((p.counters.mapExplores || {}).village || 0) >= 8 },
        { desc: '除祟安民（累计获胜六场）', done: p => (p.counters.wins || 0) >= 6 },
      ],
      ending: '尸变之源是一缕误入棺中的游魂。你以灵力超度，义庄重归安宁。村老千恩万谢，塞给你一包谢礼。',
      reward: { stones: 500, items: { pill_liaoshang: 3 } },
    },
    {
      id: 's2', title: '药翁遗方', minRealm: 1,
      story: '坊市后巷的药翁守着一座冷炉。他祖传的丹方在战乱中失了后半卷，他赌上余生想复刻出来，却屡炉屡败。他想借你的手，替他把这炉丹试完。',
      steps: [
        { desc: '妙手试炉（炼丹成功三次）', done: p => (p.counters.craftsOk || 0) >= 3 },
        { desc: '亲验药力（服丹两次）', done: p => (p.counters.pills || 0) >= 2 },
      ],
      ending: '第三炉开炉，丹香清正——丹方成了！药翁老泪纵横，将祖传的一枚洗髓丹赠你：「丹成之日，方知当年执念误我一生。小友，莫学老朽。」',
      reward: { items: { pill_xisui: 1 } },
    },
    {
      id: 's3', title: '剑冢遗鸣', minRealm: 2,
      story: '城外古剑冢夜夜剑鸣，樵夫说那是一位剑仙埋骨之地，剑意不散。你入冢探看，一柄断剑在你靠近时铮然出鞘半寸——它在等一个配得上它的人。',
      steps: [
        { desc: '力挫精英（累计击败精英妖兽四头）', done: p => (p.counters.killsElite || 0) >= 4 },
        { desc: '剑心可鉴（修习任意功法）', done: p => (p.counters.learns || 0) >= 1 },
      ],
      ending: '断剑认主，却又自行崩碎——原来它只借剑鸣传讯。冢中石壁留有一句刻字：「剑非杀人器，护道方为锋。」你恍然有所悟，一缕剑意入体。',
      reward: { stones: 8000, fortune: 5 },
    },
    {
      id: 's4', title: '万商护标', minRealm: 3,
      story: '万宝商会贴出悬赏：一队送往北域的宝镖，需要一位足以服众的高手押标。管事上下打量你：「行。但商会只认实力与信誉——家底与人心，你得让大伙服气。」',
      steps: [
        { desc: '家资巨万（灵石积蓄五万）', done: p => (p.stones.low + p.stones.mid * 100 + p.stones.high * 10000) >= 50000 },
        { desc: '江湖人脉（结交两位修士）', done: p => (p.counters.befriends || 0) >= 2 },
      ],
      ending: '宝镖一路平安。结算之日，管事奉上厚酬，并递给你一枚商会金纹：「北域之外还有南疆——来日商会开到南疆，还需道友这般人物。」',
      reward: { stones: 20000, fortune: 8 },
    },
    {
      id: 's5', title: '飞升遗诏', minRealm: 8,
      story: '集齐碎片的夜里，你梦见一位白衣仙人，他指着渡劫期的雷云对你说了四个字：「劫上有劫。」醒来时枕边多了一卷泛黄遗诏——落款处，竟是三百年前飞升的血河宗开派祖师。',
      steps: [
        { desc: '碎片归一（累计收取上古法宝碎片九枚）', done: p => (p.counters.gupianGot || 0) >= 9 },
        { desc: '突破渡劫期', done: p => p.realmIdx >= 8 },
      ],
      ending: '遗诏结尾写着：「吾宗堕魔，非吾本意。持此诏者，代吾清门户。」你将遗诏折好收入怀中——原来三百年前的因，早为今日的果埋好了线。',
      reward: { fortune: 15, items: { pill_xisui: 2 } },
    },
  ],
  stonesTotal(p) { return p.stones.low + p.stones.mid * 100 + p.stones.high * 10000; },
  /** v12 每章各目标对应的功能页签（供焦点条「前往」直达） */
  GO: {
    c1: ['cultivate', 'map', 'map'],
    c2: ['map', 'map', 'cultivate'],
    c3: ['cultivate', 'sect', 'gongfa'],
    c4: ['jianghu', 'map', 'map'],
    c5: ['cultivate', 'shop', 'map'],
    c6: ['cultivate', 'map', 'map'],
    c7: ['cultivate', 'map', 'shop'],
    c8: ['cultivate', 'jianghu', 'gongfa'],
    c9: ['cultivate', 'map', 'cultivate'],
  },
  /** v12 有效章节序号：跳过「境界已领先、目标全部自动追认」的章节（正式结算仍在 check 中逐章进行） */
  currentChapterIdx(p) {
    const q = p.quest || { ch: 0 };
    let ch = Math.min(q.ch, this.CHAPTERS.length - 1);
    while (ch < this.CHAPTERS.length - 1) {
      const def = this.CHAPTERS[ch];
      if (!def.steps.every(st => this.stepDone(st, p, def.supR))) break;
      ch++;
    }
    return ch;
  },
  /** v12 当前主线焦点：{ title, text, go 页签 }，全部完成时返回 null */
  focus() {
    const p = Game.player;
    if (!p) return null;
    const ch = this.currentChapterIdx(p);
    const def = this.CHAPTERS[ch];
    const idx = def.steps.findIndex(st => !this.stepDone(st, p, def.supR));
    if (idx < 0) return null;
    return { ch, title: def.title, text: def.steps[idx].desc, go: (this.GO[def.id] || [])[idx] || 'cultivate' };
  },
  stepDone(step, p, supR) {
    if (p.realmIdx >= (supR || 999)) return true;   // 境界领先：旧章目标自动追认
    try { return !!step.done(p); } catch (e) { return false; }
  },
  rewardText(reward) {
    const parts = [];
    if (reward.stones) parts.push(`灵石 ${Utils.fmtNum(reward.stones)}`);
    if (reward.fortune) parts.push(`气运 +${reward.fortune}`);
    for (const [id, n] of Object.entries(reward.items || {})) parts.push(`${GameData.ITEMS[id].name} ×${n}`);
    return parts.join('、') || '无';
  },
  storyHtml(text) { return text.split('\n').map(t => `<p class="story-p">${t}</p>`).join(''); },
  /** v11 叙事入卷：剧情以「羊皮卷」样式写入游历记载（不弹窗，不阻断操作） */
  storyLog(head, text) {
    Log.add(head, 'system');
    text.split('\n').forEach(line => Log.add(line, 'story'));
  },
  /** v15 开篇演出：全屏卷轴播放章节开篇（取代日志投放） */
  showStory(idx) {
    const def = this.CHAPTERS[idx];
    if (!def) return;
    const key = `c${idx + 1}_open`;
    Story.play(GameData.STORIES[key], () => {
      Log.add(`【本章目标】${def.goal}`, 'story');
      UI.announce(`主线 · ${def.title}`, 'gold');
      UI.renderAll();
      Save.autoSave(true);
    });
  },
  /** v15 中段插章：本章第一个目标完成时触发一次 */
  checkMid(p, def, chIdx) {
    if (!p.story || p.story.mid[def.id]) return;
    if (!def.steps[0] || !this.stepDone(def.steps[0], p, def.supR)) return;
    p.story = p.story || { seen: {}, mid: {}, choices: {} };
    // 境界领先追认场景：静默标记，不播
    if (p.realmIdx >= (def.supR || 999)) { p.story.mid[def.id] = 1; return; }
    p.story.mid[def.id] = Math.floor(p.day);
    Story.play(GameData.STORIES[`c${chIdx + 1}_mid`]);
  },
  /** 每次行动后检查：当前章节目标齐备则完结 → 播章末演出 → 发奖 → 衔接下一章开篇 */
  async check() {
    if (this.checking) return;
    const p = Game.player;
    if (!p || p.dead) return;
    if (Story.active()) return;   // v15 剧情播放中不推进（播毕后下次行动再查）
    const q = p.quest = p.quest || { ch: 0, side: {} };
    const def = this.CHAPTERS[q.ch];
    if (!def) return;
    this.checkMid(p, def, q.ch);
    if (Story.active()) return;
    if (!def.steps.every(st => this.stepDone(st, p, def.supR))) return;
    this.checking = true;
    try {
      q.ch += 1;
      UI.announce(`主线 · ${def.title} · 完结`, 'gold');
      Log.add(`✦ 主线推进 · 第${this.CN9[q.ch - 1]}章「${def.title}」完成！`, 'realm');
      this.grant(def.reward);
      const rewardLine = `【章末奖励】${this.rewardText(def.reward)}`;
      const next = this.CHAPTERS[q.ch];
      const supSkipped = next && p.realmIdx >= (next.supR || 999);
      // v15 章末演出（结算场注入奖励行）
      const endScript = GameData.STORIES[`c${q.ch}_end`];
      if (endScript) {
        const scenes = endScript.scenes.slice();
        scenes.push({ t: 'reward', lines: [rewardLine] });
        Story.play({ id: endScript.id, title: endScript.title, scenes });
      } else {
        Log.add(rewardLine, 'gain');
      }
      if (next) {
        const after = () => {
          Log.add(`【本章目标】${next.goal}`, 'story');
          UI.renderAll();
          Save.autoSave(true);
        };
        if (supSkipped) {
          // 境界领先追认：不发开篇演出，只记日志（避免中期入坑连播）
          this.storyLog(`【主线 · 第${this.CN9[q.ch]}章 · ${next.title}】`, next.story);
          Log.add(`【本章目标】${next.goal}`, 'story');
          UI.announce(`主线 · ${next.title}`, 'gold');
          after();
        } else {
          Story.play(GameData.STORIES[`c${q.ch + 1}_open`], after);
        }
      } else {
        Log.add('✦ 问道九章 · 全部完结！残玉化砂，仙路已成。', 'realm');
        UI.renderAll();
        Save.autoSave(true);
      }
    } finally { this.checking = false; }
  },
  grant(reward) {
    if (reward.stones) Bag.addStones(reward.stones);
    if (reward.fortune) KarmaSys.addFortune(reward.fortune, true);
    for (const [id, n] of Object.entries(reward.items || {})) Bag.addItem(id, n);
  },
  /** 支线结案 */
  async claimSide(id) {
    const p = Game.player;
    if (!p) return;
    const q = p.quest = p.quest || { ch: 0, side: {} };
    const sd = this.SIDES.find(x => x.id === id);
    if (!sd || q.side[id]) return;
    if (p.realmIdx < sd.minRealm) { UI.toast(`需 ${GameData.REALM_NAMES[sd.minRealm]}期方可了结此事`); return; }
    if (!sd.steps.every(st => this.stepDone(st, p))) { UI.toast('结案条件尚未达成'); return; }
    q.side[id] = true;
    UI.announce(`支线 · ${sd.title} · 了结`, 'gold');
    this.storyLog(`【支线结案 · ${sd.title}】`, sd.ending);
    this.grant(sd.reward);
    Log.add(`【酬谢】${this.rewardText(sd.reward)}`, 'gain');
    UI.renderAll();
    Save.autoSave(true);
  },
  /** 问道页渲染（v15：章节进度轨 + 目标进度 + 问道录回顾） */
  renderTab() {
    const p = Game.player;
    const q = p.quest = p.quest || { ch: 0, side: {} };
    const ch = Math.min(q.ch, this.CHAPTERS.length);
    // 九章进度轨
    const rail = this.CHAPTERS.map((def, i) => {
      const state = i < ch ? 'done' : i === ch ? 'cur' : 'lock';
      return `<div class="rail-node ${state}" title="第${this.CN9[i]}章 · ${def.title}${state === 'done' ? '（已完结）' : state === 'cur' ? '（进行中）' : ''}">
        <span class="rail-dot">${state === 'done' ? '✓' : i + 1}</span>
        <span class="rail-name">${def.title}</span>
      </div>`;
    }).join('<span class="rail-link"></span>');
    const railHtml = `
    <div class="card quest-card card-main">
      <div class="card-title">✦ 主线 · 问道九章 <span class="tag">${ch}/${this.CHAPTERS.length} 章</span>
        <button class="btn btn-sm" data-action="quest-review" style="margin-left:auto">📜 问道录 · 剧情回顾</button></div>
      <div class="quest-rail">${rail}</div>
    </div>`;
    let mainHtml;
    if (ch >= this.CHAPTERS.length) {
      mainHtml = `
      <div class="card quest-card">
        <div class="card-title">主线 · 问道九章（已圆满）</div>
        <div class="card-desc">残玉化砂，仙路已成。三百年血案昭雪，你的故事却仍在继续——轮回转世，另有一番天地机缘。</div>
      </div>`;
    } else {
      const def = this.CHAPTERS[ch];
      const goTabs = this.GO[def.id] || [];
      const steps = def.steps.map((st, si) => {
        const ok = this.stepDone(st, p, def.supR);
        const prog = (!ok && st.prog) ? `<span class="q-prog">${st.prog(p)}</span>` : '';
        const go = (!ok && goTabs[si]) ? `<button class="btn btn-sm q-go" data-action="quest-goto" data-tab="${goTabs[si]}">前往</button>` : '';
        return `<div class="q-step ${ok ? 'done' : ''}"><span class="q-mark">${ok ? '✓' : '○'}</span><span class="q-desc">${st.desc}</span>${prog}${go}</div>`;
      }).join('');
      mainHtml = `
      <div class="card quest-card card-main">
        <div class="card-title">主线 · 第${this.CN9[ch]}章 · ${def.title} <span class="tag warn">进行中</span></div>
        <div class="card-desc">${def.goal}</div>
        <div class="q-steps">${steps}</div>
        <div class="tip-line">章末奖励：${this.rewardText(def.reward)}</div>
      </div>`;
    }
    const sideRows = this.SIDES.map(sd => {
      const done = !!q.side[sd.id];
      const locked = p.realmIdx < sd.minRealm;
      const allDone = sd.steps.every(st => this.stepDone(st, p));
      let state = '<span class="tag">进行中</span>';
      let action = '';
      if (done) state = '<span class="tag safe">已了结</span>';
      else if (locked) state = `<span class="tag">${GameData.REALM_NAMES[sd.minRealm]}期解锁</span>`;
      else if (allDone) { state = '<span class="tag warn">可结案</span>'; action = `<button class="btn btn-sm btn-primary" data-action="quest-side" data-side="${sd.id}">结 案</button>`; }
      const stepTxt = sd.steps.map(st => {
        const ok = this.stepDone(st, p);
        const prog = (!ok && st.prog) ? ` <span class="q-prog">${st.prog(p)}</span>` : '';
        return `<span class="q-step ${ok ? 'done' : ''}" style="display:inline-block;margin-right:14px">${ok ? '✓' : '○'} ${st.desc}${prog}</span>`;
      }).join('');
      return `
      <div class="card side-card ${done ? 'side-done' : ''}">
        <div class="card-title">支线 · ${sd.title} ${state}</div>
        <div class="card-desc">${done ? sd.ending : sd.story}</div>
        ${done ? '' : `<div class="q-steps">${stepTxt}</div><div class="tip-line">酬谢：${this.rewardText(sd.reward)}</div>${action ? `<div class="action-row">${action}</div>` : ''}`}
      </div>`;
    }).join('');
    return `${railHtml}${mainHtml}<div class="shop-section-title">◈ 奇遇录 · 支线</div>${sideRows}`;
  },

  /** v15 问道录：章节剧情回顾（已看过的开篇/中段/章末可重读） */
  CHOICE_LABELS: {
    c1_end: { vengeance: '带着遗志入世，此仇必报', caution: '带着告诫入世，只信亲眼所见', clarity: '带着牵挂入世，不为恨所吞' },
    c2_end: { copy: '拓印血图，原壁不动', take: '凿壁带走血图', memorize: '牢记于心，掩回原样' },
    c3_end: { defy: '顶回威胁：「想要玉，自己来拿」', feign: '虚与委蛇，暗谋后手', silent: '沉默不语，铭记于心' },
    c4_end: { blade: '以杀止杀', justice: '以直报怨，公之于众', mercy: '先问因由，不杀无辜' },
    c5_end: { accept: '认下前世因果', sever: '斩断前世，只走己路', leverage: '不认身份，以执念为刃' },
    c6_end: { slay: '阵中斩杀分身', interrogate: '逼问血河故道入口', spare: '放其溃散，直取本尊' },
    c7_end: { open: '应帖赴会，明查当面对质', dark: '绕行暗访黑玉令', blade: '借政敌之刀，坐观虎斗' },
    c8_end: { together: '立誓同生共死', entrust: '托付后事于至交', alone: '独自承担因果' },
    c9_end: { redeem: '渡宗主残魂往生', execute: '一剑斩尽，恩怨两清', walk: '转身不问，随劫火而灭' },
  },
  openArchive() {
    const p = Game.player;
    const seen = (p.story && p.story.seen) || {};
    let body = '';
    for (let i = 0; i < this.CHAPTERS.length; i++) {
      const def = this.CHAPTERS[i];
      const cn = this.CN9[i];
      const rows = [];
      for (const [suffix, label] of [['open', '开篇'], ['mid', '中段'], ['end', '章末']]) {
        const sid = `c${i + 1}_${suffix}`;
        if (!seen[sid]) continue;
        const story = GameData.STORIES[sid];
        if (!story) continue;
        rows.push(`<button class="btn btn-sm" data-action="quest-reread" data-sid="${sid}">${label} · ${story.title.replace(/^第.+章 · /, '') || label}</button>`);
      }
      if (!rows.length) continue;
      let choiceLine = '';
      const choiceVal = p.story && p.story.choices[`c${i + 1}_end`];
      if (choiceVal && this.CHOICE_LABELS[`c${i + 1}_end`] && this.CHOICE_LABELS[`c${i + 1}_end`][choiceVal]) {
        choiceLine = `<div class="tip-line">· 你当年的抉择：${this.CHOICE_LABELS[`c${i + 1}_end`][choiceVal]}</div>`;
      }
      body += `<div class="shop-section-title">◈ 第${cn}章 · ${def.title}</div><div class="action-row" style="margin:0 0 4px">${rows.join('')}</div>${choiceLine}`;
    }
    if (!body) body = '<div class="tip-line">问道录尚是白卷——随着主线推进，你看过的每一段剧情都会收录在此，可随时重读。</div>';
    UI.popup({ title: '📜 问道录 · 剧情回顾', html: body, options: [{ text: '合 上', value: true, primary: true }] });
  },
  /** 重读某段剧情（只读模式，✕ 可关闭） */
  reread(sid) {
    UI.closePopup();
    const story = GameData.STORIES[sid];
    if (!story) return;
    Story.play(story, null, true);
  },
};

/* ======================================================================
 * §16 界面渲染
 * ====================================================================== */
const UI = {
  el: {},
  cache() {
    for (const id of ['start-screen', 'create-screen', 'game-screen', 'start-slots', 'create-attrs', 'create-rating',
      'top-info', 'panel-left', 'tabs', 'tab-content', 'bag-panel', 'popup-modal', 'popup-title', 'popup-body', 'popup-btns', 'toast', 'focus-strip']) {
      this.el[id] = document.getElementById(id);
    }
  },
  gradeSpan(name, grade) { return `<span class="grade-${grade}">${name}</span>`; },
  /** 性能优化：内容未变化时跳过 innerHTML 重建，避免挂机/高频操作下的重复解析与回流 */
  setHTML(el, html) {
    if (!el) return;
    if (el._lastHtml === html) return;
    el._lastHtml = html;
    el.innerHTML = html;
  },

  /* ---------- 开始界面 ---------- */
  renderStart() {
    const slots = ['auto', 1, 2, 3].map(key => {
      const data = Save.read(key);
      const label = key === 'auto' ? '自动存档' : `存档位 · ${['一', '二', '三'][key - 1]}`;
      let meta, btns;
      if (data && data.player) {
        const m = data.meta;
        meta = `<div class="slot-meta">${Utils.esc(m.name)} · ${m.realmText}${this.daoLabel(m)}${m.ascended ? ' · <span style="color:var(--grade-5)">已飞升</span>' : ''}<br>
          历时${this.durText(m.day)} · ${m.age}岁 · ${new Date(m.ts).toLocaleString('zh-CN', { hour12: false })}${m.dead ? ' · <span class="dead-mark">已坐化</span>' : ''}</div>`;
        const canLoad = !m.dead;
        btns = `
          ${key === 'auto' ? `<button class="btn btn-sm btn-primary" data-action="st-load" data-slot="auto" ${canLoad ? '' : 'disabled'}>继 续</button>`
                           : `<button class="btn btn-sm" data-action="st-load" data-slot="${key}" ${canLoad ? '' : 'disabled'}>读 取</button>`}
          ${key !== 'auto' ? `<button class="btn btn-sm" data-action="st-newgame" data-slot="${key}">重 开</button>` : ''}
          <button class="btn btn-sm btn-danger" data-action="st-delete" data-slot="${key}">删 除</button>`;
      } else {
        meta = `<div class="slot-meta">尘缘未启，此地尚无一缕道痕。</div>`;
        btns = key === 'auto' ? '' : `<button class="btn btn-sm btn-primary" data-action="st-newgame" data-slot="${key}">开辟仙途</button>`;
      }
      return `<div class="slot-card"><div class="slot-info"><div class="slot-name">${label}</div>${meta}</div><div class="slot-btns">${btns}</div></div>`;
    }).join('');
    this.setHTML(this.el['start-slots'], slots);
  },
  renderCreate() {
    const a = StartScreen.attrs;
    const sum = a.gen + a.comp + a.luck + a.body;
    this.setHTML(this.el['create-attrs'], Object.keys(GameData.ATTR_NAMES).map(k => `
      <div class="attr-cell">
        <div class="attr-head"><span class="attr-name">${GameData.ATTR_NAMES[k]}</span><span class="attr-val">${a[k]}</span></div>
        <div class="attr-bar"><div style="width:${a[k] * 10}%"></div></div>
        <div class="attr-desc">${GameData.ATTR_DESC[k]}</div>
      </div>`).join(''));
    this.setHTML(this.el['create-rating'], `天资合计 <b>${sum}</b> 点 —— ${PlayerFactory.rating(sum)}`);
  },

  /* ---------- 顶部信息 ---------- */
  renderTop() {
    const p = Game.player;
    this.setHTML(this.el['top-info'], `
      <span>${Time.labelLong(p)}</span><span>${p.age}岁 / 寿元${Stat.compute(p).lifespan}</span>
      <span><span class="save-dot"></span>已自动存档</span>`);
  },

  /* ---------- 左侧状态面板（v14：身份卡 → 核心条 → 属性网格 → 道行状态 → 建议） ---------- */
  renderStatus() {
    const p = Game.player;
    const st = Stat.compute(p);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const poisonCap = 60 + p.attrs.body * 8 + (p.realmIdx >= 5 ? 20 : 0);
    const eqNames = { weapon: '兵器', armor: '护甲', accessory: '饰品' };
    const eqHtml = Object.keys(eqNames).map(slot => {
      const it = p.equipped[slot];
      const def = it ? GameData.ITEMS[Utils.eqId(it)] : null;
      return `<div class="equip-slot"><span>${eqNames[slot]}</span>
        <span>${def ? `${this.gradeSpan(def.name, def.grade)}${ForgeSys.enhText(p, it)} <button class="btn btn-sm" data-action="act-unequip" data-slot="${slot}">卸下</button>` : '<span style="color:var(--text-faint)">无</span>'}</span></div>`;
    }).join('');
    // v13 已触发套装提示
    const activeSets = ForgeSys.activeSets(p);
    const setHtml = activeSets.length
      ? activeSets.map(s => `<div class="tip-line set-line" title="${s.text}">· <b class="hl">${s.name}</b> 已成套——${s.text}</div>`).join('')
      : '';
    const realmColor = GameData.REALM_AURA[p.realmIdx] || '#c9a86a';
    // v14 身份卡：名字居中 + 境界徽章 + 大道寿元
    const idCard = `
      <div class="id-card">
        <div class="id-name">${Utils.esc(p.name)}</div>
        <div class="id-row"><span class="realm-badge" style="--realm-c:${realmColor}">${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}</span></div>
        <div class="id-line"><span>大道 <b class="hl">${DaoSys.name(p)}</b></span><span>寿元 <b>${p.age} / ${st.lifespan}</b></span></div>
      </div>`;
    // v14 核心条：色点标题 + 大数值，进度一眼可读
    const coreBar = (label, cls, nk, val, max, maxText, fmt) => `
      <div class="core-stat-head">
        <span class="cs-name ${cls}">${label}</span>
        <span class="cs-val">${fmt ? `<span class="num-anim" data-nk="${nk}" data-fmt="fmt" data-nv="${val}">${Utils.fmtNum(val)}</span>` : `<span class="num-anim" data-nk="${nk}" data-nv="${val}">${Math.round(val)}</span>`} <span class="cs-max">/ ${maxText}</span></span>
      </div>
      <div class="bar" title="${label} ${Math.round(val)} / ${max}"><div class="bar-fill ${cls}${cls === 'hp' && val / max <= 0.3 ? ' low' : ''}" style="width:${Utils.clamp(val / max * 100, 0, 100)}%"></div><span class="bar-text">${Math.round(val / max * 100)}%</span></div>`;
    // v14 道行状态芯片
    const chips = [];
    if (p.insight > 0) chips.push(`<span class="chip" title="突破感悟：冲关时的额外成算">感悟 <b>${p.insight}</b></span>`);
    chips.push(`<span class="chip hot${p.poison > poisonCap * 0.75 ? ' risk' : ''}" title="丹毒 ${Math.round(p.poison)}/${poisonCap}：超过上限将反噬损毁修为">丹毒 <b>${Math.round(p.poison)}</b>/${poisonCap}</span>`);
    chips.push(`<span class="chip lucky" title="气运：机缘与好事的眷顾">气运 <b>${p.fortune || 0}</b></span>`);
    chips.push(`<span class="chip sin${(p.karma || 0) >= 60 ? ' risk' : ''}" title="孽障：招致仇家偷袭，达百可斩三尸">孽障 <b>${p.karma || 0}</b>${(p.karma || 0) >= 100 ? '·可斩' : ''}</span>`);
    const chipsHtml = `
      <div class="chip-row">${chips.join('')}</div>
      <div class="bar" title="丹毒 ${Math.round(p.poison)} / ${poisonCap}"><div class="bar-fill poison" style="width:${Utils.clamp(p.poison / poisonCap * 100, 0, 100)}%"></div><span class="bar-text">${Math.round(p.poison / poisonCap * 100)}%</span></div>`;
    this.setHTML(this.el['panel-left'], `
      <div class="panel-title">✦ 道途</div>
      ${idCard}
      ${p.sect ? `<div class="stat-line"><span>宗门</span><b class="hl">${GameData.SECTS.find(s => s.id === p.sect.id).name}${p.sect.faction && GameData.SECT_FACTIONS.find(f => f.id === p.sect.faction) ? ' · ' + GameData.SECT_FACTIONS.find(f => f.id === p.sect.faction).name : ''}</b></div>
        <div class="stat-line"><span>贡献</span><b><span class="num-anim" data-nk="contrib" data-nv="${p.sect.contrib}">${p.sect.contrib}</span></b></div>` : ''}
      ${eqHtml}
      ${setHtml}
      <div class="sec-title">核心属性</div>
      ${coreBar('气血', 'hp', 'hp', p.hp, st.maxHp, st.maxHp, false)}
      ${coreBar('灵力', 'mp', 'mp', p.mp, st.maxMp, st.maxMp, false)}
      ${coreBar('修为', 'exp', 'exp', p.exp, need, Utils.fmtNum(need), true)}
      <div class="attr-mini">
        <span>根骨 <b>${p.attrs.gen}</b></span><span>悟性 <b>${p.attrs.comp}</b></span><span>福缘 <b>${p.attrs.luck}</b></span><span>体魄 <b>${p.attrs.body}</b></span>
      </div>
      <div class="stat-grid">
        <div class="stat-line"><span>攻击</span><b>${st.atk}</b></div>
        <div class="stat-line"><span>防御</span><b>${st.def}</b></div>
        <div class="stat-line"><span>身法</span><b>${st.speed}</b></div>
        <div class="stat-line"><span>暴击</span><b>${st.crit.toFixed(0)}%</b></div>
        <div class="stat-line"><span>闪避</span><b>${st.dodge.toFixed(0)}%</b></div>
        <div class="stat-line"><span>格挡</span><b>${st.block.toFixed(0)}%</b></div>
      </div>
      <div class="stone-row"><span>下品灵石</span><b><span class="num-anim" data-nk="stones.low" data-fmt="fmt" data-nv="${p.stones.low}">${Utils.fmtNum(p.stones.low)}</span></b></div>
      ${p.stones.mid ? `<div class="stone-row"><span>中品灵石</span><b><span class="num-anim" data-nk="stones.mid" data-fmt="fmt" data-nv="${p.stones.mid}">${Utils.fmtNum(p.stones.mid)}</span></b></div>` : ''}
      ${p.stones.high ? `<div class="stone-row"><span>上品灵石</span><b><span class="num-anim" data-nk="stones.high" data-fmt="fmt" data-nv="${p.stones.high}">${Utils.fmtNum(p.stones.high)}</span></b></div>` : ''}
      <div class="sec-title">道行状态</div>
      ${chipsHtml}
      ${GameData.REALM_TRAITS[p.realmIdx] ? `<div class="stat-line"><span>境界特性</span><b class="hl" title="${GameData.REALM_TRAITS[p.realmIdx].desc}">${GameData.REALM_TRAITS[p.realmIdx].name}</b></div>
      <div class="tip-line" style="margin:0 0 4px">· ${GameData.REALM_TRAITS[p.realmIdx].desc}</div>` : ''}
      ${p.dao ? DaoSys.statusHtml(p) : ''}
      ${p.reinc ? `<div class="stat-line"><span>前世</span><b class="hl">第${p.reinc.lives}世 · 印记${p.reinc.marks || 0}（全属性+${p.reinc.marks || 0}%）</b></div>` : ''}
      <div class="guide-box">
        <div class="guide-title">✦ 当前建议</div>
        ${Guide.tips(p).map(t => `<div class="guide-tip">· ${t}</div>`).join('')}
      </div>
    `);
  },

  /* ---------- v14 行动横幅：进游戏第一眼看到"现在该做什么" ----------
   * 主卡（墨底金字）：主线目标优先；无主线时"里程碑行动"（冲关/飞升/择道/斩三尸/合成）顶上。
   * 副卡（朱砂）：紧急提醒（气血/丹毒/可结案等）。 */
  renderFocus() {
    const p = Game.player;
    if (!p) return;
    const st = Stat.compute(p);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const cap = 60 + p.attrs.body * 8 + (p.realmIdx >= 5 ? 20 : 0);
    // 紧急提醒（major：够格顶替主行动的里程碑）
    let alert = null;
    if (p.layer === 3 && p.exp >= need && p.realmIdx < 9) alert = { text: '修为圆满，可冲击瓶颈', go: 'cultivate', major: true };
    else if (p.realmIdx === 9 && p.layer === 3 && p.exp >= need && !p.flags.ascended) alert = { text: '真仙圆满，可白日飞升', go: 'cultivate', major: true };
    else if (p.realmIdx >= 1 && !p.dao) alert = { text: '大道未定，宜叩问大道', go: 'cultivate', major: true };
    else if ((p.counters.gupianGot || 0) >= 9 && !p.bag.z_benming && !Object.values(p.equipped).some(e => e && Utils.eqId(e) === 'z_benming')) alert = { text: '九枚碎片集齐，可合成本命法宝', go: 'map', major: true };
    else if ((p.karma || 0) >= 100) alert = { text: '孽障缠身，可斩三尸', go: 'cultivate', major: true };
    else if (QuestSys.SIDES.some(sd => !(p.quest || {}).side[sd.id] && p.realmIdx >= sd.minRealm && sd.steps.every(x => QuestSys.stepDone(x, p)))) alert = { text: '有支线奇遇可结案领赏', go: 'quest' };
    else if (p.poison > cap * 0.75) alert = { text: '丹毒将满，宜服解毒丹', go: 'cultivate' };
    else if (p.hp < st.maxHp * 0.3) alert = { text: '气血衰微，宜调息服丹', go: 'cultivate' };

    const mf = QuestSys.focus();
    const parts = [];
    const main = mf ? { label: '主 线', title: mf.title, sub: mf.text, go: mf.go }
      : (alert && alert.major ? { label: '当前要务', title: alert.text, sub: '道途紧要关头，一念定进退', go: alert.go } : null);
    if (main) {
      parts.push(`<div class="focus-main">
        <span class="focus-label">${main.label}</span>
        <div class="focus-body">
          <div class="focus-title">${Utils.esc(main.title)}</div>
          <div class="focus-sub">${Utils.esc(main.sub)}</div>
        </div>
        <button class="focus-go" data-action="act-tab" data-tab="${main.go}">前 往</button>
      </div>`);
    }
    // 副提醒：与主卡不同源才显示（主线在挂时提醒事项照常展示）
    const alertAsMain = !mf && alert && alert.major;
    if (alert && !alertAsMain) {
      parts.push(`<div class="focus-alert">
        <span class="focus-label">提醒</span>
        <span class="focus-title">${Utils.esc(alert.text)}</span>
        <button class="focus-go" data-action="act-tab" data-tab="${alert.go}">前往</button>
      </div>`);
    }
    this.setHTML(this.el['focus-strip'], parts.join(''));
    this.el['focus-strip'].classList.toggle('hidden', !parts.length);
  },

  /* ---------- 中央标签页 ---------- */
  renderTabs() {
    const tabs = [
      { id: 'cultivate', name: '修炼' },
      { id: 'quest', name: '问道' },
      { id: 'cave', name: '洞府' },
      { id: 'map', name: '游历' },
      { id: 'jianghu', name: '江湖' },
      { id: 'shop', name: '坊市' },
      { id: 'sect', name: '宗门' },
      { id: 'gongfa', name: '功法' },
    ];
    const p = Game.player;
    const showSectDot = !p.sect && p.realmIdx >= 1;
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const showCultDot = (p.layer === 3 && p.exp >= need && p.realmIdx < 9)
      || (p.realmIdx === 9 && p.layer === 3 && p.exp >= need && !p.flags.ascended)
      || !!p.canReincarnate;
    const showMapDot = !!(p.world && p.world.pending);
    const showJianghuDot = NpcSys.grudgeCount(p) > 0;
    const htmls = tabs.map(t => {
      const dot = (t.id === 'sect' && showSectDot) || (t.id === 'cultivate' && showCultDot)
        || (t.id === 'map' && showMapDot) || (t.id === 'jianghu' && showJianghuDot);
      const lock = Guide.tabLocked(t.id);   // v6：分步解锁
      return `<button class="tab-btn ${Game.activeTab === t.id ? 'active' : ''} ${lock ? 'locked' : ''}" data-action="act-tab" data-tab="${t.id}" ${lock ? `title="${lock}"` : ''}>${lock ? '🔒' : ''}${t.name}${dot ? '<span class="dot"></span>' : ''}</button>`;
    });
    // v12 页签分组：修炼·问道｜游历·江湖｜坊市·宗门｜功法
    const SEPS = new Set([1, 3, 5]);
    let tabsHtml = '';
    htmls.forEach((h, i) => {
      tabsHtml += h;
      if (SEPS.has(i) && i < htmls.length - 1) tabsHtml += '<span class="tab-sep"></span>';
    });
    this.setHTML(this.el['tabs'], tabsHtml);
  },

  renderTabContent() {
    const fn = {
      cultivate: () => this.renderCultivateTab(),
      quest: () => QuestSys.renderTab(),
      cave: () => this.renderCaveTab(),
      map: () => this.renderMapTab(),
      jianghu: () => this.renderNpcTab(),
      shop: () => this.renderShopTab(),
      sect: () => this.renderSectTab(),
      gongfa: () => this.renderGongfaTab(),
    }[Game.activeTab];
    this.setHTML(this.el['tab-content'], fn ? fn() : '');
  },

  renderCultivateTab() {
    const p = Game.player;
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const st = Stat.compute(p);
    const est = Math.round(Cultivate.baseGain(p) * (1 + st.cultPct / 100));
    const canBreak = p.layer === 3 && p.exp >= need && p.realmIdx < 9;
    const canAscend = p.realmIdx === 9 && p.layer === 3 && p.exp >= need && !p.flags.ascended;
    const secludeCost = Cultivate.secludeCost(p);
    let extra = '';
    // 大道未定（筑基及以上未择道）
    if (p.realmIdx >= 1 && !p.dao) {
      extra += `
      <div class="card">
        <div class="card-title">✦ 大道未定</div>
        <div class="card-desc">你已筑基有成，然大道未定，如无舵之舟。<br>六条大道，各有玄妙——择一而行，方能登高望远。</div>
        <div class="action-row"><button class="btn btn-primary btn-glow" data-action="act-dao-open">叩问大道</button></div>
      </div>`;
    }
    if (canBreak) {
      // v4：预估成功率实时分解——悟性 / 丹药感悟 / 气运 / 孽障 / 大道 / 根基 皆计入
      const target = p.realmIdx + 1;
      const quiet = target < GameData.TRIB_START;   // v9 筑基静修冲关
      const compEff = Stat.compOf(p);
      const basePart = 40 + compEff * 2 + (p.insight || 0);
      const fortPart = (p.fortune || 0) * 0.2;
      const karmaPart = (p.karma || 0) * 0.2;
      let daoMul = 1, daoText = '无';
      if (p.dao === 'sword') { daoMul *= 0.77; daoText = '剑修 ×0.77'; }
      if (p.dao === 'body') { daoMul *= 1.4; daoText = '体修 ×1.40'; }
      let rootMul = 1, rootText = '寻常';
      if (p.rootDeep) { rootMul *= 1.1; rootText = '深厚 ×1.10'; }
      if (p.rootWeak) { rootMul *= 0.85; rootText = '虚浮 ×0.85'; }
      const chance = Cultivate.breakthroughChance(p, quiet ? 15 : 0);
      const streak = p.breakStreak || 0;
      const tribPower = Tribulation.power(p, target);
      const realmPenalty = Tribulation.realmPenalty(target);
      const tribMult = Utils.clamp(1 - (tribPower - 100) / 500, 0.35, 1.1) * realmPenalty;
      extra += `
      <div class="card">
        <div class="card-title">✦ 冲击瓶颈</div>
        ${quiet
          ? `<div class="card-desc">修为已至<b>练气圆满</b>。筑基乃登堂入室之门，只需静室冲关、水到渠成——<b>无需历劫</b>，一念可破。</div>`
          : `<div class="card-desc">修为已至${GameData.REALM_NAMES[p.realmIdx]}圆满，冲击 <b>${GameData.REALM_NAMES[target]}</b> 期将引来<b>天劫</b>（劫威预估 ${tribPower.toFixed(0)}，境界愈高劫难愈重）！届时可在三策中择一而行，成败皆有道果。</div>`}
        <div class="break-est">
          <div class="stat-line"><span>基础（悟性 ${compEff.toFixed(1)} + 丹药感悟 ${p.insight || 0}）</span><b>${basePart.toFixed(0)}%</b></div>
          <div class="stat-line"><span>气运 ${p.fortune || 0}</span><b style="color:var(--ok)">+${fortPart.toFixed(0)}%</b></div>
          <div class="stat-line"><span>孽障 ${p.karma || 0}</span><b style="color:var(--danger)">-${karmaPart.toFixed(0)}%</b></div>
          <div class="stat-line"><span>大道加成（${daoText}）</span><b>×${daoMul.toFixed(2)}</b></div>
          <div class="stat-line"><span>根基（${rootText}）</span><b>×${rootMul.toFixed(2)}</b></div>
          ${quiet
            ? `<div class="stat-line"><span>静修冲关（筑基易关）</span><b style="color:var(--ok)">+15%</b></div>`
            : `<div class="stat-line"><span>境界劫难（目标${GameData.REALM_NAMES[target]}期）</span><b style="color:var(--danger)">×${realmPenalty.toFixed(2)}</b></div>`}
          ${streak > 0 ? `<div class="stat-line"><span>挫而愈坚（连败 ${streak} 次）</span><b style="color:var(--ok)">+${Math.min(15, streak * 5)}%</b></div>` : ''}
          <div class="stat-line est-final"><span>预估最终成算（基准策）</span><b class="hl">${chance.toFixed(0)}%</b></div>
        </div>
        ${quiet
          ? `<div class="tip-line">· 筑基冲关失利亦无大碍：保留六成修为与突破感悟，愈挫愈坚。</div>
             <div class="action-row"><button class="btn btn-hero" data-action="act-breakthrough">静 修 冲 关</button></div>`
          : `<div class="tip-line">· 天劫三策另乘系数：硬抗 ×0.82 / 借地躲劫 ×1.00 / 法宝挡劫 ×1.30，并随劫威（现约 ×${tribMult.toFixed(2)}）增减。</div>
             <div class="action-row"><button class="btn btn-hero" data-action="act-breakthrough">引 动 天 劫</button></div>`}
      </div>`;
    }
    if (canAscend) {
      extra += `
      <div class="card">
        <div class="card-title">✦ 渡劫飞升</div>
        <div class="card-desc">你已至真仙圆满，人界再无敌手。九霄之上，仙门已开。</div>
        <div class="action-row"><button class="btn btn-primary btn-glow" data-action="act-ascend">引动天劫 · 白日飞升</button></div>
      </div>`;
    }
    if (p.canReincarnate) {
      const marks = p.reinc ? p.reinc.marks || 0 : 0;
      extra += `
      <div class="card">
        <div class="card-title">✦ 兵解转世</div>
        <div class="card-desc">渡劫失利，大道蒙尘。与其困守残躯，不如兵解转世——<br>
        · 转世继承 <b>10% 悟性加成</b>与<b>前世记忆</b>（解锁隐藏机缘）<br>
        · 可保留<b>一件法宝</b>随身入轮回<br>
        · 得 1 枚<b>轮回印记</b>：永久 +1% 全属性上限，可叠加${marks ? `（已累计 ${marks} 枚）` : ''}<br>
        · 来世重择<b>出身与大道</b>；前世恩怨NPC将触发专属剧情</div>
        <div class="action-row"><button class="btn btn-danger btn-glow" data-action="act-reincarnate">兵 解 转 世</button></div>
      </div>`;
    }
    return `
      <div class="card card-main">
        <div class="card-title">✦ 修行 <span style="font-size:12px;color:var(--text-dim)">当前层尚需修为 ${Utils.fmtNum(Math.max(0, need - p.exp))}</span></div>
        <div class="card-desc">当前每轮修炼约得修为 <b class="hl">${Utils.fmtNum(est)}</b>（悟性 ${p.attrs.comp}，功法加成 ${st.cultPct}%）。</div>
        <div class="act-groups">
          <div class="act-main-row">
            <button class="btn btn-hero" data-action="act-cultivate">修 炼<span class="hero-sub">3 日 · 约得 ${Utils.fmtNum(est)} 修为</span></button>
          </div>
          <div class="act-sub-row">
            <button class="btn" data-action="act-rest">打坐调息（1日）</button>
            <button class="btn" data-action="act-seclude">闭关（30日 · ${Utils.fmtNum(secludeCost)}灵石）</button>
            ${(Bag.count('pill_liaoshang') || Bag.count('pill_huiling')) ? `<button class="btn" data-action="act-use-low-pills">一键服丹</button>` : ''}
            ${AutoCult.active
              ? `<button class="btn btn-danger" data-action="act-auto-stop">停止自动修炼（${AutoCult.rounds}轮）</button>`
              : `<button class="btn" data-action="act-auto-open">自动修炼</button>`}
            ${p.karma >= 100 ? `<button class="btn btn-danger btn-glow" data-action="act-slay">斩三尸</button>` : ''}
            ${p.dao ? `<button class="btn" data-action="act-dao-change">转修他道</button>` : ''}
          </div>
        </div>
        ${AutoCult.active ? `<div class="tip-line" style="color:#e8c56a">· 自动修炼中：目标${AutoCult.target.label}，已获修为 +${Utils.fmtNum(Math.max(0, Guide.totalExp(p) - AutoCult.startExp))}。</div>` : ''}
        <div class="tip-line">· 修炼与闭关是修为的主要来源；丹药见效快，但丹毒超标会损伤根基。<br>· 每逢圆满（第4层）修为攒满，即可冲击下一个大境界。</div>
      </div>${extra}`;
  },

  /* ---------- v13 洞府页签（聚灵阵 / 灵田 / 兽栏） ---------- */
  renderCaveTab() {
    const p = Game.player;
    if (!CaveSys.unlocked(p)) {
      return `<div class="card"><div class="card-title">✦ 洞府</div>
        <div class="card-desc">洞府乃修士安身立命之所——聚灵阵助修行、灵田可种药、兽栏能养灵兽。<br>然开辟洞府耗费甚巨，须至<b>筑基期</b>方可为之。</div></div>`;
    }
    if (!p.cave) p.cave = CaveSys.freshCave();
    const lv = p.cave.lv;
    const maxed = lv >= CaveSys.MAX_LV;
    const c = CaveSys.upCost(p);
    const matsTxt = c.mats ? Object.entries(c.mats).map(([id, n]) => `${GameData.ITEMS[id].name} ${Bag.count(id)}/${n}`).join('、') : '';
    const caveCard = `
    <div class="card">
      <div class="card-title">✦ 洞府 · ${lv} 层 ${maxed ? '<span class="tag safe">聚灵之极</span>' : ''}</div>
      <div class="card-desc">聚灵阵运转不息：修炼效率 <b class="hl">+${lv * 4}%</b> · 灵田 ${CaveSys.plotCount(p)}/8 块 · 兽栏 ${BeastSys.maxSlots(p)} 位。</div>
      ${maxed ? '' : `<div class="action-row"><button class="btn btn-primary" data-action="act-cave-up">扩建洞府（${Utils.fmtNum(c.stones)}灵石${matsTxt ? ' · ' + matsTxt : ''}）</button></div>`}
    </div>`;
    const plotsCard = `
    <div class="card">
      <div class="card-title">✦ 灵田 <span class="tag">${CaveSys.plotCount(p)} 块</span></div>
      <div class="card-desc">播下种子，按游戏日生长（离线亦生长）；成熟后采收，过熟廿日收成折半。种子在坊市「灵田种子」区有售。</div>
      ${CaveSys.renderPlots(p)}
    </div>`;
    // 兽栏
    const beasts = p.beasts.list || [];
    const passiveName = BeastSys.NAME;
    const beastRows = beasts.map(b => {
      const isOn = p.beasts.active === b.uid;
      const pk = BeastSys.PASSIVE[b.species] || 'atkPct';
      const pv = Math.round(b.power * 0.6 + b.level * 0.8);
      const needExp = b.level * 400;
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name"><b class="${isOn ? 'hl' : ''}">${b.name}</b> <span class="tag ${isOn ? 'safe' : ''}">${isOn ? '出战中' : '栏中'}</span> <span class="tag">${b.level} 阶</span></div>
          <div class="gf-desc">${b.species === 'beast' ? '凶兽' : b.species === 'snake' ? '灵蛇' : b.species === 'swarm' ? '虫群' : b.species === 'plant' ? '草木精' : '灵体'} · 协战与被动随阶成长<br>
          被动：${passiveName[pk]} +${pv} ｜ 经验 ${Math.floor(b.exp)}/${needExp}${b.skills.length ? ` ｜ 技能：${b.skills[0].name}` : ''}</div>
        </div>
        <div class="gf-actions">
          <button class="btn btn-sm" data-action="act-beast-active" data-uid="${b.uid}">${isOn ? '歇 息' : '出 战'}</button>
          <button class="btn btn-sm" data-action="act-beast-feed" data-uid="${b.uid}" ${Bag.count('m_neidan') ? '' : 'disabled'}>喂内丹（${Bag.count('m_neidan')}）</button>
          <button class="btn btn-sm btn-danger" data-action="act-beast-free" data-uid="${b.uid}">放归</button>
        </div>
      </div>`;
    }).join('');
    const beastCard = `
    <div class="card">
      <div class="card-title">✦ 兽栏 <span class="tag">${beasts.length}/${BeastSys.maxSlots(p)} 位</span></div>
      <div class="card-desc">战斗中将可驯妖兽打至<b>两成血以下</b>，可尝试驯服。出战灵兽每回合四成几率协助攻击，并给主人一项被动加成。喂食【妖兽内丹】可升阶。</div>
      ${beastRows || '<div class="tip-line">兽栏空空——去荒野驯一头灵兽回来罢。</div>'}
    </div>`;
    return caveCard + plotsCard + beastCard;
  },

  renderMapTab() {
    const p = Game.player;
    return this.renderWorldCard() + this.renderSignCard() + this.renderDungeonSection()
      + GameData.MAPS.map(m => {
        const diff = p.realmIdx < m.recRealm
          ? { cls: 'danger', text: `推荐${m.recText} · 境界不足，九死一生！` }
          : p.realmIdx === m.recRealm
            ? { cls: 'warn', text: `推荐${m.recText} · 势均力敌` }
            : { cls: 'safe', text: `推荐${m.recText} · 游刃有余` };
        const magic = WorldSys.isMagic(p, m.id) ? '<span class="tag magic">魔域</span>' : '';
        return `
      <div class="card map-card">
        <div class="map-scene">${Art.scene(m.id)}</div>
        <div class="card-title">${m.name}${magic}<span class="tag ${diff.cls}">${diff.text}</span></div>
        <div class="card-desc">${m.desc}${magic ? '<br><span class="neg">魔气狂化：妖魔更强，所获亦丰。</span>' : ''}</div>
        <div class="action-row"><button class="btn" data-action="act-explore" data-map="${m.id}">探索此地（2日）</button></div>
      </div>`;
      }).join('');
  },

  /* ---------- §23 天下大势 ---------- */
  renderWorldCard() {
    const p = Game.player;
    const w = p.world;
    if (!w) return '';
    const y = WorldSys.year(p);
    const tags = [];
    if ((w.magicMaps || []).length) tags.push(`<span class="tag danger">魔域：${w.magicMaps.map(id => (GameData.MAPS.find(m => m.id === id) || {}).name).join('、')}</span>`);
    if (w.preachUntil && y <= w.preachUntil) tags.push(`<span class="tag safe">圣地讲道 · 悟性翻倍（余 ${w.preachUntil - y} 年）</span>`);
    if (w.ruinsUntil && y <= w.ruinsUntil) tags.push(`<span class="tag warn">秘境现世 · 机缘遍地（余 ${w.ruinsUntil - y} 年）</span>`);
    if (w.warUntil && y <= w.warUntil) tags.push(`<span class="tag magic">宗门大战 · 物价腾贵（余 ${w.warUntil - y} 年）</span>`);
    let pend = '';
    if (w.pending) {
      const def = GameData.WORLD_EVENTS.find(e => e.id === w.pending.type) || { name: '天下大事', desc: '' };
      const extra = w.pending.type === 'demon' && w.pending.mapId
        ? `事发之地：${(GameData.MAPS.find(m => m.id === w.pending.mapId) || {}).name || '某地'}。`
        : '';
      pend = `
      <div class="section-gap"></div>
      <div class="card-title" style="font-size:14px">◈ ${def.name} <span class="tag danger">进行中</span></div>
      <div class="card-desc">${def.desc} ${extra}</div>
      <div class="action-row">
        <button class="btn btn-primary btn-glow" data-action="act-event-join">参与大事</button>
        <button class="btn" data-action="act-event-skip">静观其变</button>
      </div>`;
    }
    const hist = w.history.length
      ? `<div class="tip-line">史载：${w.history.slice(-2).reverse().map(h => `第${h.year}年·${(GameData.WORLD_EVENTS.find(e => e.id === h.type) || {}).name || ''}`).join('；')}</div>`
      : '';
    return `
    <div class="card world-card">
      <div class="card-title">✦ 天下大势 <span class="tag">第 ${y} 年 · 距下次大事件约 ${Math.max(0, w.nextEventYear - y)} 年</span></div>
      ${tags.length ? `<div class="card-tags">${tags.join('')}</div>` : '<div class="card-desc">四海升平，天下无大事。</div>'}
      ${pend}
      ${hist}
    </div>`;
  },

  /* ---------- v8 黄历 · 每日一签 ---------- */
  renderSignCard() {
    const p = Game.player;
    const today = Math.floor(p.day);
    const drawn = p.signDay === today;
    return `
    <div class="card sign-card">
      <div class="card-title">✦ 黄历 · 每日一签 <span class="tag">${Time.labelLong(p)}</span></div>
      <div class="card-desc">${drawn
        ? `今日签文：<b class="hl">${p.signText}</b>——${p.signDesc}`
        : '一炷清香，诚心摇签。每日一支，问今日道途吉凶。'}</div>
      <div class="action-row">${drawn ? '<span class="tip-line" style="margin:0">· 已求签，明日请早。</span>' : '<button class="btn btn-primary" data-action="act-sign">摇 签</button>'}</div>
    </div>`;
  },

  /* ---------- §25 秘境 ---------- */
  renderDungeonSection() {
    const p = Game.player;
    const synthCard = Bag.count('m_gupian') >= 9
      ? `<div class="card"><div class="card-title">✦ 上古碎片已集齐</div><div class="card-desc">九枚上古法宝碎片在你掌心嗡鸣不止，隐隐欲聚成器。</div>
        <div class="action-row"><button class="btn btn-primary btn-glow" data-action="act-realm-synth">滴血炼化 · 合成本命法宝</button></div></div>`
      : '';
    if (p.dungeon) return this.renderDungeonActive() + synthCard;
    const rows = GameData.SECRET_REALMS.map((r, i) => {
      const unlocked = p.realmIdx >= r.recRealm;
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${r.name} <span class="tag ${unlocked ? 'safe' : 'warn'}">${GameData.REALM_NAMES[r.recRealm]}期秘境</span></div>
          <div class="card-desc">${r.desc}<br><span style="color:var(--text-faint)">随机九层节点：战斗 / 宝箱 / 奇遇 / 陷阱 / 遭遇，可随时撤离；陨落则损失背包三成之物。深处出失传功法与上古法宝碎片，集齐九枚可合成本命法宝。</span></div>
        </div>
        <div class="gf-actions">${unlocked
          ? `<button class="btn btn-sm btn-primary" data-action="act-realm-enter" data-realm="${i}">入 秘 境</button>`
          : `<span class="price lack">需 ${GameData.REALM_NAMES[r.recRealm]}期</span>`}</div>
      </div>`;
    }).join('');
    return `
    <div class="card">
      <div class="card-title">✦ 秘境探索 <span class="tag">肉鸽式</span></div>
      <div class="card-desc">每个大境界各有一座专属秘境。入内即随机生成节点路线，步步抉择——深入愈深，造化愈大，凶险愈甚。</div>
    </div>${rows}${synthCard}`;
  },

  renderDungeonActive() {
    const p = Game.player;
    const D = p.dungeon;
    const R = GameData.SECRET_REALMS[D.realm];
    const nodeBtns = D.stuck
      ? '<div class="tip-line"><span class="neg">一战不利，你退至安全处藏身——此地不宜久留，趁早撤离为上。</span></div>'
      : (D.choices || []).map((t, i) =>
        `<button class="btn ${t === 'boss' ? 'btn-primary btn-glow' : ''}" data-action="act-realm-node" data-node="${i}">${DungeonSys.nodeIcon(t)}${t === 'boss' ? '决战 · 守关者（最深处）' : `${GameData.DUNGEON_NODE_NAMES[t] || t} · 第 ${D.depth + 1} 层`}</button>`).join('');
    return `
    <div class="card dungeon-card">
      <div class="card-title">✦ 秘境 · ${R.name} <span class="tag warn">第 ${Math.min(D.depth + 1, D.total)} / ${D.total} 层</span></div>
      <div class="card-desc">${R.desc}</div>
      <div class="route-choices">${nodeBtns}</div>
      ${D.gains && D.gains.length ? `<div class="tip-line">已掠得：${D.gains.slice(-5).join('；')}</div>` : ''}
      <div class="action-row"><button class="btn btn-danger" data-action="act-realm-retreat">携收获 · 撤离秘境</button></div>
      <div class="tip-line">当前气血 ${Math.round(p.hp)} / ${Stat.compute(p).maxHp} —— 陨落于秘境者，背包三成之物将永远留在其中。</div>
    </div>`;
  },

  /* ---------- §24 江湖人脉 ---------- */
  renderNpcTab() {
    const p = Game.player;
    RankSys.dailyReward(p);   // v13：登顶每日气运（渲染时领取，随后由收尾落盘）
    const mapName = id => (GameData.MAPS.find(m => m.id === id) || {}).name || '四方云游';
    const myPow = p.realmIdx * 4 + p.layer;
    const rows = GameData.NPCS.map(d => {
      const s = p.npcs[d.id];
      if (!s) return '';
      const lbl = NpcSys.relLabel(p, d.id);
      const relCls = p.partner === d.id || (p.sworn || []).includes(d.id) || s.rel >= 30 ? 'safe'
        : s.rel <= -15 ? 'danger' : 'warn';
      const tags = [];
      if (s.grudge) tags.push('<span class="tag danger">宿怨</span>');
      if (s.pastLife) tags.push('<span class="tag magic">前世恩怨</span>');
      if (d.kin && d.kin.length) tags.push(`<span class="tag">血亲：${d.kin.map(k => (NpcSys.def(k) || {}).name).filter(Boolean).join('、')}</span>`);
      const his = s.realmIdx * 4 + s.layer;
      const powerText = !s.alive ? '已殒身'
        : his > myPow + 3 ? '远胜于你' : his > myPow ? '略胜于你' : his === myPow ? '与你相当' : '不及你';
      const btns = !s.alive ? '<span class="tag danger">已身故</span>' : [
        `<button class="btn btn-sm" data-action="npc-befriend" data-npc="${d.id}">结交（${Utils.fmtNum(NpcSys.befriendCost(p, d.id))}灵石）</button>`,
        `<button class="btn btn-sm" data-action="npc-spar" data-npc="${d.id}">切磋</button>`,
        s.rel >= 15 && p.partner !== d.id ? `<button class="btn btn-sm btn-danger" data-action="npc-betray" data-npc="${d.id}">背刺夺宝</button>` : '',
        s.rel >= 70 && !(p.sworn || []).includes(d.id) ? `<button class="btn btn-sm" data-action="npc-swear" data-npc="${d.id}">结拜</button>` : '',
        s.rel >= 90 && !p.partner ? `<button class="btn btn-sm btn-primary" data-action="npc-dao" data-npc="${d.id}">结为道侣</button>` : '',
        s.grudge ? `<button class="btn btn-sm" data-action="npc-peace" data-npc="${d.id}">${s.pastLife ? '前世恩怨' : '化解仇怨'}</button>` : '',
      ].filter(Boolean).join('');
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${d.name} <span style="color:var(--text-faint);font-size:12px">${d.title} · ${d.temper}</span> <span class="tag ${relCls}">${lbl} ${s.rel > 0 ? '+' : ''}${s.rel}</span> ${tags.join('')}</div>
          <div class="gf-desc">${d.desc}<br><span style="color:var(--text-faint)">${GameData.REALM_NAMES[s.realmIdx]}${GameData.LAYER_NAMES[s.layer]} · 现于${s.alive ? mapName(s.map) : '殒身之地'} · 战力${powerText}</span></div>
        </div>
        <div class="gf-actions">${btns}</div>
      </div>`;
    }).join('');
    const rel = [];
    if (p.partner) rel.push(`道侣：${(NpcSys.def(p.partner) || {}).name || ''}`);
    if ((p.sworn || []).length) rel.push(`结拜：${p.sworn.map(id => (NpcSys.def(id) || {}).name).filter(Boolean).join('、')}`);
    // v5：旬轮换——部分修士行游在外，历练途中偶遇不着
    const away = NpcSys.awayNames(p);
    const awayLine = `<div class="tip-line">今值 <b class="hl">${Time.xunLabel(p)}</b>——${away.length ? `行游在外：${away.join('、')}，途中偶遇不着。` : '诸修士皆在各地活动，正遇得上。'}</div>`;
    return `
    <div class="card">
      <div class="card-title">✦ 江湖人脉</div>
      <div class="card-desc">修行界有十五位常驻修士，随岁月自行修炼、游历地图、争夺机缘，境界与你所见的时光同步成长。<br>
      结交可成好友、结拜、道侣——你于战斗、渡劫的虚弱危急关头，他们有概率舍命相助；背刺夺宝收益翻倍，但气运暴跌、恩怨永结——宿敌会趁你历练、突破、渡劫时偷袭。</div>
      ${rel.length ? `<div class="card-tags"><span class="tag safe">${rel.join(' · ')}</span></div>` : ''}
      ${awayLine}
    </div>${RankSys.render(p)}${rows}`;
  },

  renderShopTab() {
    const p = Game.player;
    const st = Stat.compute(p);
    const stock = GameData.SHOP.filter(row => p.realmIdx >= row.minRealm);
    const group = (type, title) => {
      const items = stock.filter(r => GameData.ITEMS[r.item].type === type);
      if (!items.length) return '';
      const rows = items.map(r => {
        const def = GameData.ITEMS[r.item];
        const price = ShopSys.price(r.item);
        const mul = WorldSys.marketMul(p, r.item);   // v5：行情
        const mkt = mul >= 1.08 ? '<span class="mkt up">涨</span>' : mul <= 0.92 ? '<span class="mkt down">跌</span>' : '';
        const known = def.type === 'gongfa' && p.gongfa[r.item];
        const afford = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000 >= price;
        return `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${this.gradeSpan(def.name, def.grade)}${known ? ' <span style="color:var(--text-faint);font-size:12px">（已修习）</span>' : ''}</div>
            <div class="gf-desc">${def.desc}</div>
          </div>
          <div class="gf-actions">
            <span class="price ${afford ? '' : 'lack'}">${Utils.fmtNum(price)}灵石${mkt}</span>
            <button class="btn btn-sm" data-action="act-buy" data-item="${r.item}" ${known ? 'disabled' : ''}>购买</button>
          </div>
        </div>`;
      }).join('');
      return `<div class="shop-section-title">◈ ${title}</div>${rows}`;
    };
    const sellable = Object.keys(p.bag).filter(id => (GameData.ITEMS[id].price || 0) > 0);
    const sellRows = sellable.map(id => {
      const def = GameData.ITEMS[id];
      const sp = ShopSys.sellPrice(id);
      return `
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">${this.gradeSpan(def.name, def.grade)} <span style="color:var(--text-faint)">×${p.bag[id]}</span></div></div>
        <div class="gf-actions">
          <span class="price">${sp}灵石/件</span>
          <button class="btn btn-sm" data-action="act-sell" data-item="${id}" data-qty="1">售一</button>
          <button class="btn btn-sm" data-action="act-sell" data-item="${id}" data-qty="all">全售</button>
        </div>
      </div>`;
    }).join('');
    // 炼丹炉（人人可用，丹道成丹率大涨）
    const alchemySection = `
      <div class="shop-section-title">◈ 炼丹炉${p.dao === 'pill' ? '（丹道加持，成丹率大增）' : ''}</div>
      ${GameData.ALCHEMY_RECIPES.map(r => {
        const out = GameData.ITEMS[r.out];
        const mats = Object.entries(r.need).map(([id, n]) => `${GameData.ITEMS[id].name} ${Bag.count(id)}/${n}`).join('、');
        const can = CraftSys.haveMats(p, r);
        return `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${this.gradeSpan(out.name, out.grade)}（成丹率 ${CraftSys.rate(p, r).toFixed(0)}%）</div>
            <div class="gf-desc">需 ${mats}</div>
          </div>
          <div class="gf-actions">
            <button class="btn btn-sm" data-action="act-alchemy" data-recipe="${r.id}" ${can ? '' : 'disabled'}>炼制</button>
            <button class="btn btn-sm" data-action="act-alchemy-multi" data-recipe="${r.id}" data-times="5" ${can ? '' : 'disabled'} title="连开五炉，药材不足自动停炉">×5</button>
          </div>
        </div>`;
      }).join('')}`;
    // 符坊（符修专属）
    const talismanSection = p.dao === 'talisman' ? `
      <div class="shop-section-title">◈ 符坊（符修专属）</div>
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">挥毫画符</div>
          <div class="gf-desc">焚香沐手，朱砂灵纸——成符可于战斗中祭出轰敌，亦可售予坊市换取灵石。</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm btn-primary" data-action="act-draw">画符（${Utils.fmtNum(CraftSys.drawCost(p))}灵石）</button></div>
      </div>` : '';
    // v13 悬赏任务板
    const B = BountySys.stateOf(p);
    const r = BountySys.rewards(p);
    const bountyRows = B.list.map((t, i) => {
      if (!t) return `
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">（此悬赏已交付）</div><div class="gf-desc">明日将有新悬赏贴出。</div></div>
      </div>`;
      const done = t.progress >= t.need;
      const btn = done
        ? `<button class="btn btn-sm btn-primary" data-action="act-bounty-claim" data-i="${i}">领赏（${Utils.fmtNum(r.stones)}灵石${p.sect ? `+${r.contrib}贡献` : ''}）</button>`
        : t.type === 'collect'
          ? `<button class="btn btn-sm" data-action="act-bounty-submit" data-i="${i}">上交（持有${Bag.count(t.target)}）</button>`
          : t.type === 'spar'
            ? '<span class="tip-line" style="margin:0">去江湖页切磋获胜</span>'
            : '<span class="tip-line" style="margin:0">游历猎杀自动计入</span>';
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${t.name} ${done ? '<span class="tag safe">已达成</span>' : `<span class="tag">进度 ${t.progress}/${t.need}</span>`}</div>
          <div class="gf-desc">${t.desc} · 赏格：灵石 ${Utils.fmtNum(r.stones)}${p.sect ? `、贡献 ${r.contrib}` : ''}</div>
        </div>
        <div class="gf-actions">${btn}</div>
      </div>`;
    }).join('');
    const bountySection = `
      <div class="shop-section-title">◈ 悬赏任务板 <span class="tag">第 ${B.day + 1} 日贴出 · 存续两日</span></div>
      ${bountyRows}`;
    // v13 黑市（每月前三日开市）
    const blackSection = BlackSys.isOpen(p) ? `
      <div class="shop-section-title">◈ 暗巷黑市 <span class="tag warn">开市中 · 余 ${BlackSys.daysLeft(p)} 日</span></div>
      <div class="tip-line" style="margin:0 0 6px">· 黑市奇货稀罕，价钱却贵六成；每月初三开市三日。<br>· 巷角的「来路不明之物」，福缘高者捡漏，福缘低者破财。</div>
      ${BlackSys.goods(p).map(id => {
        const def = GameData.ITEMS[id];
        const price = BlackSys.price(p, id);
        const afford = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000 >= price;
        return `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${this.gradeSpan(def.name, def.grade ?? def.tier ?? 0)}</div>
            <div class="gf-desc">${def.desc}</div>
          </div>
          <div class="gf-actions">
            <span class="price ${afford ? '' : 'lack'}">${Utils.fmtNum(price)}灵石</span>
            <button class="btn btn-sm" data-action="act-black-buy" data-item="${id}">买 下</button>
          </div>
        </div>`;
      }).join('')}
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">？？？ <span class="tag danger">来路不明</span></div>
        <div class="gf-desc">巷角那只血渍未干的储物袋……要赌一手吗？</div></div>
        <div class="gf-actions"><button class="btn btn-sm btn-danger" data-action="act-black-mystery">赌一手</button></div>
      </div>` : `
      <div class="shop-section-title">◈ 暗巷黑市 <span class="tag">闭市</span></div>
      <div class="tip-line" style="margin:0 0 6px">· 每月初三开市三日——如今巷口空空，唯有野猫。</div>`;
    // v13 祭炼强化（对已穿戴装备）
    const enhSlots = ['weapon', 'armor', 'accessory'].map(slot => {
      const id = p.equipped[slot] ? Utils.eqId(p.equipped[slot]) : null;
      if (!id) return '';
      const def = GameData.ITEMS[id];
      const lv = ForgeSys.lvOf(p, id);
      if (lv >= ForgeSys.MAX_LV) return `
        <div class="shop-row">
          <div class="gf-info"><div class="gf-name">${this.gradeSpan(def.name, def.grade)} <span class="enh-lv">+${lv}</span></div>
          <div class="gf-desc">已至强化极境。</div></div>
          <div class="gf-actions"><span class="tag safe">圆满</span></div>
        </div>`;
      const stones = ForgeSys.stonesCost(p, id, lv);
      const rate = ForgeSys.rate(lv);
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)}${ForgeSys.enhText(p, id)} <span style="color:var(--text-faint);font-size:12px">→ +${lv + 1}（成功率 ${rate}%）</span></div>
          <div class="gf-desc">需灵石 ${Utils.fmtNum(stones)}、玄铁矿 ×${lv + 1}（持有 ${Bag.count('m_xuantie')}）${lv >= 7 ? '；<span class="neg">+7 起失败跌一级</span>' : ''}。强化石可保必成。</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-enhance" data-slot="${slot}">祭 炼</button></div>
      </div>`;
    }).join('');
    const enhanceSection = `
      <div class="shop-section-title">◈ 祭炼强化（+1~+10，每级 +10% 数值属性）</div>
      ${enhSlots || '<div class="tip-line">先在乾坤袋中装备法宝，方可祭炼强化。</div>'}`;
    // v13 炼器坊
    const forgeRows = GameData.FORGE_RECIPES.map(r => {
      const out = GameData.ITEMS[r.out];
      const mats = Object.entries(r.need).map(([id, n]) => `${GameData.ITEMS[id].name} ${Bag.count(id)}/${n}`).join('、');
      const can = Object.entries(r.need).every(([id, n]) => Bag.count(id) >= n);
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(out.name, out.grade)}${out.set ? ' <span class="tag warn">套装件</span>' : ''}（成器率 ${r.rate}%）</div>
          <div class="gf-desc">${out.desc}<br>需 ${mats}</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-forge" data-recipe="${r.id}" ${can ? '' : 'disabled'}>锻 造</button></div>
      </div>`;
    }).join('');
    const forgeSection = `
      <div class="shop-section-title">◈ 炼器坊（消耗材料锻造神兵；天级神兵与套装件唯此处可出）</div>
      ${forgeRows}`;
    return `
      <div class="card">
        <div class="card-title">✦ 万宝坊市 <span style="font-size:12px;color:var(--text-dim)">${st.shopDiscount ? '万宝商会 · 九二折 · ' : ''}距市集刷新 ${WorldSys.marketDaysLeft(p)} 日 · 当前灵石：${Bag.stonesText()}</span></div>
        <div class="tip-line" style="margin:0 0 6px">· 坊市每三十日换一茬新货，市价随手气起伏（±两成）。<span style="color:var(--danger)">涨</span>者宜缓买，<span style="color:var(--ok)">跌</span>者可趁低。</div>
        <div class="card-tags">
          <button class="btn btn-sm" data-action="act-convert" data-dir="up1">100下品 → 1中品</button>
          <button class="btn btn-sm" data-action="act-convert" data-dir="down1">1中品 → 100下品</button>
          <button class="btn btn-sm" data-action="act-convert" data-dir="up2">100中品 → 1上品</button>
          <button class="btn btn-sm" data-action="act-convert" data-dir="down2">1上品 → 100中品</button>
        </div>
        ${group('pill', '丹药')}
        ${group('artifact', '法器')}
        ${group('gongfa', '功法典籍')}
        ${group('material', '杂货材料')}
        ${group('seed', '灵田种子')}
        <div class="shop-section-title">◈ 出售物品（四折回收${p.dao === 'pill' ? '，丹药另有五成加成' : ''}）</div>
        ${sellRows || '<div class="tip-line">背包中空空如也。</div>'}
        ${bountySection}
        ${blackSection}
        ${alchemySection}
        ${talismanSection}
        ${enhanceSection}
        ${forgeSection}
      </div>`;
  },

  renderSectTab() {
    const p = Game.player;
    if (p.realmIdx < 1 && !p.sect) {
      return `<div class="card"><div class="card-title">✦ 宗门</div>
        <div class="card-desc">修仙界宗门林立，然非筑基不得其门而入。<br>你如今尚在练气，还请先专心修行。</div></div>`;
    }
    if (!p.sect) {
      const cards = GameData.SECTS.map(s => `
        <div class="card">
          <div class="card-title">${s.name}<span class="tag safe">${s.bonusText}</span></div>
          <div class="card-desc">${s.desc}<br><span class="neg">拜入宗门后不可改投他门，请慎重。</span></div>
          <div class="action-row"><button class="btn btn-primary" data-action="act-join" data-sect="${s.id}">拜入门下</button></div>
        </div>`).join('');
      return `<div class="card"><div class="card-title">✦ 宗门</div><div class="card-desc">你已至筑基，可择一宗门拜入，领取宗门任务换取贡献，兑换高阶功法与稀有资源。</div></div>${cards}`;
    }
    const sect = GameData.SECTS.find(s => s.id === p.sect.id);
    const taskRows = p.sect.tasks.map((t, i) => {
      const done = t.progress >= t.need;
      let btn = '';
      if (done) btn = `<button class="btn btn-sm btn-primary" data-action="act-task-claim" data-i="${i}">领取奖励</button>`;
      else if (t.type === 'collect') btn = `<button class="btn btn-sm" data-action="act-task-submit" data-i="${i}">上交（持有${Bag.count(t.target)}）</button>`;
      else if (t.danger) btn = `<button class="btn btn-sm btn-danger" data-action="act-danger-go" data-i="${i}">接生死状</button>`;
      const dangerTag = t.danger ? ' <span class="tag danger">高危</span>' : '';
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${t.name}${dangerTag}</div>
          <div class="gf-desc">${t.desc} —— 进度 ${Math.floor(t.progress)}/${t.need}</div>
        </div>
        <div class="gf-actions">${btn}</div>
      </div>`;
    }).join('');
    const exRows = GameData.SECT_EXCHANGE.map((row, i) => {
      const def = GameData.ITEMS[row.item];
      const known = def.type === 'gongfa' && p.gongfa[row.item];
      const afford = p.sect.contrib >= row.cost;
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)}${row.qty > 1 ? ` ×${row.qty}` : ''}${known ? ' <span style="color:var(--text-faint);font-size:12px">（已修习）</span>' : ''}</div>
          <div class="gf-desc">${def.desc}</div>
        </div>
        <div class="gf-actions">
          <span class="price ${afford ? '' : 'lack'}">${row.cost}贡献</span>
          <button class="btn btn-sm" data-action="act-exchange" data-i="${i}" ${known ? 'disabled' : ''}>兑换</button>
        </div>
      </div>`;
    }).join('');
    // §24 长老派系
    let facSection = '';
    if (!p.sect.faction) {
      facSection = `
      <div class="card">
        <div class="card-title">✦ 长老派系 · 站队</div>
        <div class="card-desc">宗门之内，三位长老各成一派。站队可领专属资源与功法，但会被敌对派系派发高危任务。</div>
        ${GameData.SECT_FACTIONS.map(f => `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${f.name} <span style="color:var(--text-faint);font-size:12px">${f.motto}</span></div>
            <div class="gf-desc">${f.desc}<br>${f.giftText}</div>
          </div>
          <div class="gf-actions"><button class="btn btn-sm btn-primary" data-action="act-faction-join" data-f="${f.id}">站 队</button></div>
        </div>`).join('')}
      </div>`;
    } else {
      const f = GameData.SECT_FACTIONS.find(x => x.id === p.sect.faction);
      const facRows = (f ? f.exclusive : []).map((row, i) => {
        const def = GameData.ITEMS[row.item];
        const known = def.type === 'gongfa' && p.gongfa[row.item];
        const afford = p.sect.contrib >= row.cost;
        return `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${this.gradeSpan(def.name, def.grade)}${known ? ' <span style="color:var(--text-faint);font-size:12px">（已修习）</span>' : ''}</div>
            <div class="gf-desc">${def.desc}</div>
          </div>
          <div class="gf-actions">
            <span class="price ${afford ? '' : 'lack'}">${row.cost}贡献</span>
            <button class="btn btn-sm" data-action="act-faction-exchange" data-i="${i}" ${known ? 'disabled' : ''}>兑换</button>
          </div>
        </div>`;
      }).join('');
      facSection = `
      <div class="card">
        <div class="card-title">✦ 派系 · ${f.name} <span class="tag safe">${f.motto}</span></div>
        <div class="card-desc">你已依附 ${f.name}，可凭贡献兑换派系秘藏。敌对派系对你颇有微词——宗门任务中偶有生死状。</div>
        ${facRows}
      </div>`;
    }
    return `
      ${facSection}
      <div class="card">
        <div class="card-title">✦ ${sect.name} <span class="tag safe">${sect.bonusText}</span></div>
        <div class="card-desc">当前贡献：<b class="hl">${p.sect.contrib}</b> 点。完成宗门任务可获得贡献与灵石。</div>
        ${taskRows}
      </div>
      <div class="card">
        <div class="card-title">✦ 贡献兑换</div>
        ${exRows}
      </div>`;
  },

  renderGongfaTab() {
    const p = Game.player;
    const learned = Object.entries(p.gongfa).map(([id, g]) => {
      const def = GameData.ITEMS[id];
      const maxLv = GongfaSys.maxLevel(def);
      const maxed = g.level >= maxLv;
      const need = GongfaSys.needExp(def, g.level);
      const bonusText = Object.entries(def.bonus || {}).map(([k, [base, per]]) => {
        const label = { atkPct: '攻击', defPct: '防御', hpPct: '气血', mpPct: '灵力', spdPct: '身法', crit: '暴击%', dodge: '闪避%', block: '格挡%', cult: '修炼效率%' }[k] || k;
        const val = (base + per * (g.level - 1)).toFixed(1).replace(/\.0$/, '');
        return `${label}+${val}`;
      }).join('，');
      return `
      <div class="gf-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)}（${{ attack: '攻', defense: '防', support: '辅' }[def.gtype]}）
            <span class="gf-lv">第${g.level}层${maxed ? ' · 大成' : ` · 感悟${Math.floor(g.exp)}/${need}`}</span></div>
          <div class="gf-desc">${def.desc}${bonusText ? `<br>当前加成：${bonusText}` : ''}${def.skill ? `<br>神通：<span class="grade-2">${def.skill.name}</span> —— ${def.skill.desc}` : ''}</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-study" data-gf="${id}" ${maxed ? 'disabled' : ''}>${maxed ? '已大成' : '参悟（5日）'}</button></div>
      </div>`;
    }).join('');
    const learnable = Object.keys(p.bag).filter(id => GameData.ITEMS[id].type === 'gongfa');
    const learnRows = learnable.map(id => {
      const def = GameData.ITEMS[id];
      return `
      <div class="gf-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)}（${{ attack: '攻', defense: '防', support: '辅' }[def.gtype]}）</div>
          <div class="gf-desc">${def.desc}</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm btn-primary" data-action="act-learn" data-item="${id}">学 习</button></div>
      </div>`;
    }).join('');
    return `
      <div class="card"><div class="card-title">✦ 已修功法</div>${learned || '<div class="tip-line">尚未修习任何功法。</div>'}</div>
      ${learnRows ? `<div class="card"><div class="card-title">✦ 待学典籍（背包中）</div>${learnRows}</div>` : ''}`;
  },

  /* ---------- 右侧背包 ---------- */
  renderBag() {
    const p = Game.player;
    const types = [
      { id: 'pill', name: '丹药' }, { id: 'gongfa', name: '功法' },
      { id: 'artifact', name: '法宝' }, { id: 'material', name: '材料' },
      { id: 'talisman', name: '符箓' }, { id: 'all', name: '全部' },
    ];
    const items = Object.keys(p.bag).filter(id => Game.bagTab === 'all' || GameData.ITEMS[id].type === Game.bagTab);
    // v4：按品质（凡/灵/玄/地/天/仙）优先降序，同品质再按类别归类
    items.sort((a, b) => {
      const da = GameData.ITEMS[a], db = GameData.ITEMS[b];
      const qa = da.grade ?? da.tier ?? 0, qb = db.grade ?? db.tier ?? 0;
      return (qb - qa) || da.type.localeCompare(db.type) || da.name.localeCompare(db.name);
    });
    const rows = items.map(id => {
      const def = GameData.ITEMS[id];
      const gq = def.grade ?? def.tier ?? 0;   // v4：品质档（材料按 tier 折算）
      let btns = '';
      if (def.type === 'pill') btns = `<button class="btn btn-sm" data-action="act-use" data-item="${id}">服用</button>`;
      if (def.type === 'gongfa') btns = `<button class="btn btn-sm" data-action="act-learn" data-item="${id}">学习</button>`;
      if (def.type === 'artifact') {
        const isOn = Object.values(p.equipped).some(e => e && Utils.eqId(e) === id);
        btns = isOn ? '' : `<button class="btn btn-sm" data-action="act-equip" data-item="${id}">装备</button>`;
      }
      btns += `<button class="btn btn-sm btn-danger" data-action="act-drop" data-item="${id}">丢弃</button>`;
      return `
      <div class="bag-item gq-${gq}">
        <div class="bag-item-head"><span class="bag-item-name">${this.gradeSpan(def.name, gq)}${def.type === 'artifact' ? ForgeSys.enhText(p, id) : ''}${def.type === 'gongfa' ? `（${{ attack: '攻', defense: '防', support: '辅' }[def.gtype]}）` : ''}${def.daoLimit ? ` <span class="tag magic">${(GameData.DAO_CLASSES.find(x => x.id === def.daoLimit) || {}).name || ''}专属</span>` : ''}</span><span class="bag-item-qty">×${p.bag[id]}</span></div>
        <div class="bag-item-desc">${def.desc}</div>
        <div class="bag-item-btns">${btns}</div>
      </div>`;
    }).join('');
    // v4：一键减负——凡品快捷出售；v13：当前分类批量丢弃
    const catName = (types.find(t => t.id === Game.bagTab) || { name: '全部' }).name;
    const quick = `<div class="bag-quick">
      ${ShopSys.commonSaleList().length ? `<button class="btn btn-sm" data-action="act-sell-common">一键出售凡品</button>` : ''}
      ${items.length ? `<button class="btn btn-sm btn-danger" data-action="act-drop-cat" data-cat="${Game.bagTab}">清空「${catName}」</button>` : ''}
    </div>`;
    const bagHtml = `
      <div class="panel-title">✦ 乾坤袋</div>
      <div class="stone-row"><span>下品灵石</span><b><span class="num-anim" data-nk="stones.low" data-fmt="fmt" data-nv="${p.stones.low}">${Utils.fmtNum(p.stones.low)}</span></b></div>
      ${p.stones.mid ? `<div class="stone-row"><span>中品灵石</span><b><span class="num-anim" data-nk="stones.mid" data-fmt="fmt" data-nv="${p.stones.mid}">${Utils.fmtNum(p.stones.mid)}</span></b></div>` : ''}
      ${p.stones.high ? `<div class="stone-row"><span>上品灵石</span><b><span class="num-anim" data-nk="stones.high" data-fmt="fmt" data-nv="${p.stones.high}">${Utils.fmtNum(p.stones.high)}</span></b></div>` : ''}
      <div class="bag-tabs">${types.map(t => `<button class="bag-tab ${Game.bagTab === t.id ? 'active' : ''}" data-action="bag-tab" data-bagtab="${t.id}">${t.name}</button>`).join('')}</div>
      ${quick}
      <div class="bag-list">${rows || '<div class="bag-empty">—— 空空如也 ——</div>'}</div>`;
    this.setHTML(this.el['bag-panel'], bagHtml);
    Anim.scan(this.el['bag-panel']);   // v4：灵石滚动动画
  },

  renderAll() {
    if (!Game.player) return;
    this.renderTop();
    this.renderFocus();
    this.renderStatus();
    this.renderTabs();
    this.renderTabContent();
    this.renderBag();
    Anim.scan(document.getElementById('game-screen'));   // v4：数值滚动动画
  },

  /* ---------- 通用弹窗（Promise 风格，resolve 选项的 value） ---------- */
  _popupResolve: null,
  _popupOptions: [],
  popup({ title, html, options }) {
    return new Promise(resolve => {
      // 已有未决弹窗则先释放（按取消处理），杜绝弹窗叠加与 Promise 泄漏
      if (this._popupResolve) this.popupChoose(-1);
      this._popupResolve = resolve;
      this._popupOptions = (options && options.length) ? options : [{ text: '确定', value: true, primary: true }];
      this.el['popup-title'].textContent = title || '提示';
      this.el['popup-body'].innerHTML = html || '';
      this.el['popup-btns'].innerHTML = this._popupOptions.map((o, i) =>
        `<button class="btn ${o.primary ? 'btn-primary' : ''}" data-action="pop-choice" data-i="${i}">${o.text}</button>`).join('');
      this.el['popup-modal'].classList.remove('hidden');
    });
  },
  popupChoose(i) {
    if (!this._popupResolve) return;
    const r = this._popupResolve;
    const val = this._popupOptions[i] ? this._popupOptions[i].value : undefined;
    this._popupResolve = null;
    this.el['popup-modal'].classList.add('hidden');
    r(val);
  },
  /** 无选择地关闭当前弹窗 */
  closePopup() { if (this._popupResolve) this.popupChoose(-1); },
  /** 状态同步兜底：读档 / 返回开始界面时关闭全部覆盖层（战斗 / 通用弹窗 / 大道 / 天劫 / 引导 / 氛围面板），
   *  未决弹窗按取消结算，杜绝「遮罩卡死」与挂起的 Promise */
  closeOverlays() {
    this.closePopup();
    for (const id of ['battle-modal', 'dao-modal', 'tribulation-modal', 'tutorial', 'amb-panel']) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    }
    Battle.active = null;
    Tribulation.state = null;
    document.getElementById('log-pin')?.classList.add('out');
  },

  /* ---------- 存档弹窗（操作后原地刷新） ---------- */
  /** v6：游戏内时长文案（X年X日） */
  durText(days) {
    const y = Math.floor(days / 365);
    return y > 0 ? `${y}年${days % 365}日` : `${days}日`;
  },
  daoLabel(m) {
    if (!m || !m.dao) return '';
    const d = GameData.DAO_CLASSES.find(x => x.id === m.dao);
    return d ? ` · <span style="color:var(--grade-2)">${d.name}</span>` : '';
  },
  saveBody() {
    const cards = ['auto', 1, 2, 3].map(key => {
      const data = Save.read(key);
      const label = key === 'auto' ? '自动存档' : `存档位 ${['一', '二', '三'][key - 1]}`;
      let meta = '空';
      if (data && data.player) {
        const m = data.meta;
        meta = `${Utils.esc(m.name)} · ${m.realmText}${this.daoLabel(m)} · ${this.durText(m.day)} · ${m.age}岁`;
      }
      const isCurrent = key !== 'auto' && Game.slot === key;
      return `<div class="slot-card">
        <div class="slot-info"><div class="slot-name">${label}${isCurrent ? ' <span class="tag safe">当前</span>' : ''}</div><div class="slot-meta">${meta}</div></div>
        <div class="slot-btns">
          ${key !== 'auto' ? `<button class="btn btn-sm" data-action="act-save" data-slot="${key}">保存</button>` : ''}
          <button class="btn btn-sm" data-action="act-load" data-slot="${key}" ${data && data.player && !data.meta.dead ? '' : 'disabled'}>读取</button>
          ${data && data.player ? `<button class="btn btn-sm btn-danger" data-action="act-delete-save" data-slot="${key}">删除</button>` : ''}
        </div></div>`;
    }).join('');
    return `<div class="start-slots">${cards}</div>
      <div class="save-io">
        <button class="btn btn-sm" data-action="save-export">导出文本码</button>
        <button class="btn btn-sm" data-action="save-import">导入文本码</button>
      </div>
      <div class="tip-line" style="margin-top:6px">· 自动存档随每次行动实时更新；手动保存可覆盖三个存档位。<br>· 文本码含成就与图鉴，复制给其他设备即可续缘（导出为当前进度）。<br>· 冲击大境界前会自动备份至隐秘槽位，渡劫失利可回溯因果。</div>`;
  },
  async saveModal() {
    await this.popup({
      title: '存档 / 读档',
      html: this.saveBody(),
      options: [{ text: '关 闭', value: true, primary: true }],
    });
  },
  refreshSaveBody() {
    if (!this.el['popup-modal'].classList.contains('hidden')) this.el['popup-body'].innerHTML = this.saveBody();
  },

  /* ---------- v6：成就 · 图鉴弹窗 ---------- */
  _achvTab: 'achv',
  achvModal() {
    this._achvTab = 'achv';
    this.popup({ title: '成就 · 图鉴', html: this.achvBody(), options: [{ text: '关 闭', value: true, primary: true }] });
  },
  achvBody() {
    const got = Meta.data.achv;
    const tabs = `<div class="codex-tabs">
      <button class="bag-tab ${this._achvTab === 'achv' ? 'active' : ''}" data-action="codex-tab" data-t="achv">✦ 成就 ${Object.keys(got).length}/${Achieve.DEFS.length}</button>
      <button class="bag-tab ${this._achvTab === 'codex' ? 'active' : ''}" data-action="codex-tab" data-t="codex">✦ 图鉴 ${Codex.got()}/${Codex.total()}</button>
    </div>`;
    let body = '';
    if (this._achvTab === 'achv') {
      for (const [cat, label] of Object.entries(Achieve.CATS)) {
        const defs = Achieve.DEFS.filter(d => d.cat === cat);
        const rows = defs.map(d => {
          const on = !!got[d.id];
          const prog = (!on && d.prog) ? ` <span style="color:var(--text-faint)">${d.prog(Game.player)}</span>` : '';
          return `<div class="achv-row ${on ? 'on' : 'off'}">
            <div class="achv-main"><span class="achv-name">${on ? '✦' : '◇'} ${d.name}</span>${prog}
              <div class="achv-desc">${d.desc}</div></div>
            <div class="achv-reward">${on ? '<span style="color:var(--ok)">已达成</span>' : Achieve.rewardText(d.reward)}</div>
          </div>`;
        }).join('');
        const gotN = defs.filter(d => got[d.id]).length;
        body += `<div class="shop-section-title">◈ ${label} · ${gotN}/${defs.length}</div>${rows}`;
      }
    } else {
      const cats = [['gongfa', '功法典籍'], ['artifact', '法宝神兵'], ['monster', '妖兽图录'], ['npc', '江湖奇人'], ['realm', '秘境洞天']];
      for (const [cat, label] of cats) {
        const ids = Codex.catalog(cat);
        const rows = ids.map(id => {
          const on = !!Meta.data.codex[cat][id];
          const it = GameData.ITEMS[id];
          const rawName = on ? Codex.nameOf(cat, id) : '？？？';
          const grade = it ? (it.grade ?? it.tier ?? null) : null;
          const nameHtml = on && grade != null ? this.gradeSpan(rawName, grade) : rawName;
          return `<div class="achv-row ${on ? 'on' : 'off'}">
            <div class="achv-main"><span class="achv-name">${nameHtml}</span>
              <div class="achv-desc">${on ? Codex.introOf(cat, id) : '尚未遇见'}</div></div>
          </div>`;
        }).join('');
        const gotN = ids.filter(id => Meta.data.codex[cat][id]).length;
        body += `<div class="shop-section-title">◈ ${label} · ${gotN}/${ids.length}</div>${rows}`;
      }
    }
    return `${tabs}<div class="codex-list">${body}</div>`;
  },

  /* ---------- v6：存档导出 / 导入（文本码） ---------- */
  async exportSave() {
    if (!Game.player) { UI.toast('当前没有进行中的存档'); return; }
    const payload = { v: 1, player: Game.player, ext: Meta.data };
    let code = '';
    try { code = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); } catch (e) { UI.toast('导出失败', true); return; }
    await this.popup({
      title: '导出存档',
      html: `整段复制以下文本码，到其他设备「导入文本码」即可续缘。<br><textarea class="save-code" readonly onclick="this.select()">${code}</textarea>`,
      options: [{ text: '关 闭', value: true, primary: true }],
    });
  },
  async importSave() {
    const ok = await this.popup({
      title: '导入存档',
      html: `粘贴存档文本码：<br><textarea class="save-code" id="import-code" placeholder="在此粘贴……"></textarea>
        <div class="tip-line">导入只会写入所选存档位，不影响当前进行中的进度。</div>`,
      options: [{ text: '下一步', value: true, primary: true }, { text: '取消', value: false }],
    });
    if (!ok) return;
    let data = null;
    try {
      const raw = document.getElementById('import-code').value.trim();
      data = JSON.parse(decodeURIComponent(escape(atob(raw))));
    } catch (e) { data = null; }
    if (!data || data.v !== 1 || !data.player || !data.player.name) { UI.toast('文本码无法识别', true); return; }
    const p = PlayerFactory.migrate(data.player);
    const slots = [1, 2, 3].map(k => {
      const d = Save.read(k);
      return `· 存档位${['一', '二', '三'][k - 1]}：${d && d.player ? `${Utils.esc(d.meta.name)}（将覆盖）` : '空'}`;
    }).join('<br>');
    const slot = await this.popup({
      title: '导入至哪个存档位？',
      html: `将导入 <b>${Utils.esc(p.name)}</b>（${GameData.REALM_NAMES[p.realmIdx]}期）：<br>${slots}`,
      options: [{ text: '存至位一', value: 1 }, { text: '存至位二', value: 2 }, { text: '存至位三', value: 3 }, { text: '取消', value: false }],
    });
    if (!slot) return;
    Save.write(slot, p);
    Meta.importTo(slot, data.ext);
    UI.toast(`已导入至存档位${['一', '二', '三'][slot - 1]}`);
    UI.refreshSaveBody();
  },

  /* ---------- Toast / 存档指示 ---------- */
  toast(text, err = false) {
    const div = document.createElement('div');
    div.className = 'toast-item' + (err ? ' err' : '');
    div.textContent = text;
    this.el['toast'].appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity .4s'; }, 1600);
    setTimeout(() => div.remove(), 2100);
  },
  /** v4：关键事件居中淡入公告（境界突破 / 稀有物品 / 战斗胜负），2 秒后自动消散 */
  announce(text, kind = 'gold') {
    let wrap = document.getElementById('announce');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'announce';
      document.getElementById('app').appendChild(wrap);
    }
    const div = document.createElement('div');
    div.className = 'announce-item' + (kind === 'gold' ? '' : ' ' + kind);
    div.textContent = text;
    wrap.appendChild(div);
    // 同时最多 3 条，旧的立即让位
    while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
    setTimeout(() => div.classList.add('out'), 1500);
    setTimeout(() => div.remove(), 2050);
  },
  /** v5：hex → rgba（异象光晕用） */
  aura(color, a) {
    const n = parseInt(String(color).replace('#', ''), 16) || 0xffffff;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  },
  /** v5：境界突破演出——全屏对应色系微光闪过 + 古风描写渐显（约 3 秒，不挡操作） */
  realmShow(text, color) {
    const app = document.getElementById('app');
    let flash = document.getElementById('realm-flash');
    let show = document.getElementById('realm-show');
    if (!flash) { flash = document.createElement('div'); flash.id = 'realm-flash'; app.appendChild(flash); }
    if (!show) {
      show = document.createElement('div');
      show.id = 'realm-show';
      show.innerHTML = '<div class="rs-text"></div>';
      app.appendChild(show);
    }
    flash.style.setProperty('--aura-soft', this.aura(color, 0.5));
    show.style.setProperty('--aura', color);
    show.style.setProperty('--aura-soft', this.aura(color, 0.55));
    show.querySelector('.rs-text').textContent = text;
    flash.classList.remove('go');
    show.classList.remove('go');
    void flash.offsetWidth;   // 重启动画
    flash.classList.add('go');
    show.classList.add('go');
    clearTimeout(this._realmTimer);
    this._realmTimer = setTimeout(() => { flash.classList.remove('go'); show.classList.remove('go'); }, 3500);
  },
  saveFlash() {
    const dot = document.querySelector('.save-dot');
    if (!dot) return;
    dot.style.background = '#fff';
    setTimeout(() => { dot.style.background = ''; }, 180);
  },
};

/* ======================================================================
 * §17 游戏主控
 * ====================================================================== */
const StartScreen = {
  slot: 1,
  attrs: null,
  name: '',
  open(slot) {
    this.slot = slot;
    this.attrs = PlayerFactory.rollAttrs();
    const input = document.getElementById('create-name');
    input.value = Utils.pick(GameData.NAMES);
    document.getElementById('start-screen').querySelector('.start-inner').classList.add('hidden');
    document.getElementById('create-screen').classList.remove('hidden');
    UI.renderCreate();
  },
  back() {
    document.getElementById('create-screen').classList.add('hidden');
    document.getElementById('start-screen').querySelector('.start-inner').classList.remove('hidden');
  },
};

const Game = {
  player: null,
  slot: null,
  activeTab: 'cultivate',
  bagTab: 'all',

  init() {
    UI.cache();
    Log.init();
    Ambience.init();   // v5：氛围音效（默认关，读回上次的开关偏好）
    UI.renderStart();
    // 全局事件委托：所有 data-action 统一分发
    document.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      const fn = this.actions[el.dataset.action];
      if (fn) {
        try { await fn(el.dataset, el); }
        catch (err) { console.error('动作执行出错:', el.dataset.action, err); UI.toast('操作出了点问题，请重试', true); }
      }
    });
    // 氛围面板：点击面板以外区域自动收起
    document.addEventListener('click', (e) => {
      const ctrl = document.getElementById('amb-ctrl');
      const panel = document.getElementById('amb-panel');
      if (panel && !panel.classList.contains('hidden') && ctrl && !ctrl.contains(e.target)) panel.classList.add('hidden');
    });
    // v7：背包双击快捷操作（服用 / 装备 / 学习；丢弃按钮除外）
    document.addEventListener('dblclick', (e) => {
      const item = e.target.closest('.bag-item');
      if (!item) return;
      const btn = [...item.querySelectorAll('.bag-item-btns .btn')].find(b => !b.classList.contains('btn-danger'));
      if (btn && !btn.disabled) btn.click();
    });
    // 键盘：ESC 依次收起 弹窗（按取消）→ 氛围面板 → 大道弹窗；战斗中 1~5 快捷出手
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement && document.activeElement.tagName) || '');
      if (Story.active()) {   // v15：剧情演出中屏蔽快捷键（Enter/空格推进剧情）
        if (e.key === 'Enter' || e.key === ' ') {
          const sc = Story.cur && Story.cur.scenes[Story.cur.idx];
          if (!sc || sc.t !== 'choice') { Story.next(); e.preventDefault(); }
        }
        return;
      }
      if (Battle.active && !Battle.active.busy && !Battle.active.over && !UI._popupResolve && !typing) {
        const sel = {
          1: '[data-action="bt-attack"]',
          2: '[data-action="bt-menu"][data-menu="skill"]',
          3: '[data-action="bt-defend"]',
          4: '[data-action="bt-menu"][data-menu="item"]',
          5: '[data-action="bt-flee"]',
        }[e.key];
        if (sel) {
          const btn = document.querySelector(sel);
          if (btn && !btn.disabled) { btn.click(); e.preventDefault(); }
          return;
        }
      }
      if (e.key !== 'Escape') return;
      if (UI._popupResolve) { UI.popupChoose(-1); return; }
      const amb = document.getElementById('amb-panel');
      if (amb && !amb.classList.contains('hidden')) { amb.classList.add('hidden'); return; }
      const dao = document.getElementById('dao-modal');
      if (dao && !dao.classList.contains('hidden')) dao.classList.add('hidden');
    });
    // 关页前自动存档
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && Game.player && !Game.player.dead) Save.autoSave(true);
    });
    window.addEventListener('beforeunload', () => {
      if (Game.player && !Game.player.dead) Save.autoSave(true);
    });
    // v18：全局错误捕获
    window.addEventListener('error', (e) => {
      console.error('未捕获的异常:', e.error || e.message);
      // 只给用户一个非侵入式提示，不阻断游戏
      if (Game.player && !e.defaultPrevented) {
        UI.toast('道心微澜，一股无名之气掠过识海（不影响存档）', true);
      }
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error('未捕获的 Promise 拒绝:', e.reason);
      if (Game.player) {
        UI.toast('识海泛起一丝涟漪，随即平复（不影响存档）', true);
      }
    });
  },

  newGame(slot, name, attrs) {
    this.slot = slot;
    this.player = PlayerFactory.create(name, attrs);
    this.enterGame();
    Log.clear();
    Log.add(`天地灵气复苏之年，凡俗少年 <b>${Utils.esc(name)}</b> 得了一册残缺功法，自此踏上仙途。`, 'system');
    Log.add('（提示：先在后山「游历」磨砺，或就地「修炼」积攒修为。遇到不懂的可点菜单里的「玩法说明」。）', 'info');
    QuestSys.showStory(0);   // v11：主线第一章开篇叙事
    if (!this.player.flags.tutorialDone) Tutorial.show();
    Save.autoSave();
    if (slot !== 'auto') Save.write(slot, this.player);
  },

  loadFrom(key) {
    const data = Save.read(key);
    if (!data || !data.player) { UI.toast('此处没有存档'); return false; }
    if (data.meta && data.meta.dead) { UI.toast('此存档已坐化，无法读取', true); return false; }
    UI.closeOverlays();   // 状态同步：清掉可能残留的战斗 / 弹窗覆盖层
    AutoCult.abort();   // v6
    this.slot = key === 'auto' ? null : key;
    this.player = PlayerFactory.migrate(data.player);
    this.enterGame();
    Log.clear();
    Log.add(`光阴倒流，你回到了 <b>${Time.label(this.player)}</b> 的这一刻。（读档成功）`, 'system');
    UI.renderAll();
    return true;
  },

  /** v6：回退到突破前的自动备份（存于临时槽位 bak） */
  rollbackBackup() {
    const data = Save.read('bak');
    if (!data || !data.player) { UI.toast('没有可回退的备份'); return false; }
    AutoCult.abort();
    this.player = PlayerFactory.migrate(data.player);
    UI.renderAll();
    Save.autoSave();
    Log.add('因果倒卷，时光回流——你回到了引动天劫之前的那一刻。', 'system');
    return true;
  },

  /** v18：离线进度计算——灵田按真实时间生长 */
  computeOfflineProgress() {
    const p = this.player;
    if (!p || p.dead || p.day === 0) return;
    // 读取上次存档的 meta.ts（在 Save.write 中写入）
    const slot = this.slot == null ? 'auto' : this.slot;
    const data = Save.read(slot === 'auto' ? 'auto' : slot);
    if (!data || !data.meta || !data.meta.ts) return;
    const elapsedMs = Date.now() - data.meta.ts;
    if (elapsedMs < 60000) return; // 少于 1 分钟不算离线
    // 按真实时间推算游戏天数（现实 1 分钟 ≈ 游戏 1 天，上限 30 天）
    const realDays = Math.min(30, Math.floor(elapsedMs / 60000));
    // 灵田生长
    let offlineCrops = 0;
    if (p.cave && p.cave.plots) {
      for (const plot of p.cave.plots) {
        if (!plot || !plot.seed) continue;
        const def = GameData.ITEMS[plot.seed];
        if (!def || !def.days) continue;
        // 按离线天数推进生长
        plot.plantedDay = Math.max(plot.plantedDay, p.day - realDays);
        // 收获检查会由下次进入洞府页签时计算
        offlineCrops++;
      }
    }
    if (offlineCrops > 0) {
      Log.add(`你不在的${realDays}个时辰里，灵田中的${offlineCrops}块作物并未荒废——它们仍在生长。`, 'info');
      p.day += realDays;
      p.age += realDays / 365;
    }
  },

  enterGame() {
    Anim.reset();   // v4：换档后数字动画记忆清零
    Meta.load();    // v6：装载本存档位的成就与图鉴
    AutoCult.abort();
    this.computeOfflineProgress();  // v18：离线进度
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    UI.renderAll();
  },

  exitToStart() {
    UI.closeOverlays();   // 状态同步：清掉战斗 / 弹窗等覆盖层，避免遮罩滞留
    AutoCult.abort();   // v6
    if (this.player && !this.player.dead) Save.autoSave(true);
    this.player = null;
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('create-screen').classList.add('hidden');
    document.getElementById('start-screen').querySelector('.start-inner').classList.remove('hidden');
    UI.renderStart();
  },

  /** 每次玩家行动后统一收尾：钳制数值 → 渲染 → 自动存档 */
  afterAction() {
    const p = this.player;
    if (!p) return;
    const st = Stat.compute(p);
    p.hp = Utils.clamp(p.hp, 0, st.maxHp);
    p.mp = Utils.clamp(p.mp, 0, st.maxMp);
    if (p.hp <= 0) p.hp = Math.max(1, Math.round(st.maxHp * 0.1)); // 兜底
    try { UI.renderAll(); } catch (err) { console.error('渲染异常（不影响存档）:', err); }   // v9：渲染失败不得阻断持久化
    Save.autoSave();
    Achieve.check();   // v6：成就检查（解锁即发奖播报）
    try { QuestSys.check(); } catch (err) { console.error('剧情检查异常:', err); }   // v11：主线推进
    // 叩问大道时序：筑基之初，或兵解转世的记忆传承；战斗中则延后
    if (p.pendingDao && !p.dao && !p.dead && !Battle.active
      && (p.realmIdx >= 1 || p.reinc)) {
      p.pendingDao = false;
      DaoSys.openModal();
    }
  },

  async gameOver(reason) {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    Save.write('auto', p);   // 直接写盘：autoSave 会跳过已死亡角色，此处须落盘死亡标记
    Log.add('油尽灯枯，你的道途走到了尽头……', 'loss');
    await UI.popup({
      title: '✦ 道消身殒 ✦',
      html: `寿元耗尽，天道无情。<br><br>${Utils.esc(p.name)}，${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}修士，享年 ${p.age} 岁。<br><br>此尘缘已了，愿君来世再问大道。`,
      options: [{ text: '重返起点', value: true, primary: true }],
    });
    this.exitToStart();
  },

  /* ---------- 动作表（data-action → 处理函数） ---------- */
  actions: {
    /* --- 开始界面 --- */
    'st-newgame': async (d) => {
      const slot = Number(d.slot);
      const old = Save.read(slot);
      if (old && old.player) {
        const ok = await UI.popup({
          title: '覆盖存档',
          html: `存档位${['一', '二', '三'][slot - 1]} 已有进度（${Utils.esc(old.meta.name)} · ${old.meta.realmText}）。<br>重开将覆盖旧档，确定吗？`,
          options: [{ text: '重 开', value: true }, { text: '取消', value: false }],
        });
        if (!ok) return;
      }
      StartScreen.open(slot);
    },
    'st-back': () => StartScreen.back(),
    'st-reroll': () => { StartScreen.attrs = PlayerFactory.rollAttrs(); UI.renderCreate(); },
    'st-start': () => {
      const name = (document.getElementById('create-name').value || '').trim() || Utils.pick(GameData.NAMES);
      Game.newGame(StartScreen.slot, name, StartScreen.attrs);
    },
    'st-load': (d) => { Game.loadFrom(d.slot); },
    'st-delete': async (d) => {
      const ok = await UI.popup({ title: '删除存档', html: '此档一删，仙途尽消，确定吗？', options: [{ text: '删除', value: true }, { text: '取消', value: false }] });
      if (ok) { Save.remove(d.slot); UI.renderStart(); }
    },
    /* --- 标签页 / 背包 --- */
    'act-tab': (d) => {
      const lock = Guide.tabLocked(d.tab);   // v6：分步解锁
      if (lock) { UI.toast(`尚未解锁 —— ${lock}`); return; }
      Game.activeTab = d.tab; UI.renderTabs(); UI.renderTabContent();
      // 面板切换平滑过渡：短暂加动效类，避免生硬跳变
      const box = UI.el['tab-content'];
      if (box) {
        box.scrollTop = 0;   // v13：切换页签后回到顶部，避免残露上一页签中段内容
        box.classList.remove('tab-switch'); void box.offsetWidth; box.classList.add('tab-switch');
      }
    },
    'bag-tab': (d) => { Game.bagTab = d.bagtab; UI.renderBag(); },
    /* --- v4 日志工具 / 一键减负 --- */
    'log-pause': () => Log.togglePause(),
    'log-clear': () => Log.clear(),
    /* --- v14 日志折叠 --- */
    'log-toggle': () => Log.toggleCollapse(),
    'act-sell-common': () => ShopSys.sellCommon(),
    'act-use-low-pills': () => Bag.autoUseLowPills(),
    /* --- v5 氛围音效面板 --- */
    'amb-panel': () => { const el = document.getElementById('amb-panel'); if (el) el.classList.toggle('hidden'); },
    /* --- v6 成就图鉴 / 挂机 / 存档导出导入 --- */
    'act-codex': () => UI.achvModal(),
    'codex-tab': (d) => { UI._achvTab = d.t; if (!UI.el['popup-modal'].classList.contains('hidden')) UI.el['popup-body'].innerHTML = UI.achvBody(); },
    'act-auto-open': () => AutoCult.open(),
    'act-auto-stop': () => { if (AutoCult.active) AutoCult.finish('道友叫停'); },
    'save-export': () => UI.exportSave(),
    'save-import': () => UI.importSave(),
    /* --- 修炼 --- */
    'act-cultivate': () => Cultivate.normal(),
    'act-rest': () => Cultivate.rest(),
    'act-seclude': () => Cultivate.seclude(),
    'act-breakthrough': () => Cultivate.breakthrough(),
    'act-ascend': () => Cultivate.ascend(),
    /* --- 游历 --- */
    'act-explore': (d) => Explore.go(d.map),
    /* --- 坊市 --- */
    'act-buy': (d) => ShopSys.buy(d.item),
    'act-sell': (d) => ShopSys.sell(d.item, d.qty === 'all'),
    'act-convert': (d) => ShopSys.convert(d.dir),
    /* --- 宗门 --- */
    'act-join': async (d) => {
      const sect = GameData.SECTS.find(s => s.id === d.sect);
      const ok = await UI.popup({
        title: '拜入宗门',
        html: `确定拜入 <b>${sect.name}</b> 吗？<br>${sect.bonusText}。<br><span class="neg">一旦拜入，终身不可改投。</span>`,
        options: [{ text: '焚香拜入', value: true, primary: true }, { text: '再想想', value: false }],
      });
      if (ok) SectSys.join(d.sect);
    },
    'act-task-claim': (d) => SectSys.claim(Number(d.i)),
    'act-task-submit': (d) => SectSys.submit(Number(d.i)),
    'act-exchange': (d) => SectSys.exchange(Number(d.i)),
    /* --- 功法 --- */
    'act-study': (d) => GongfaSys.study(d.gf),
    'act-learn': (d) => GongfaSys.learn(d.item),
    /* --- 背包物品 --- */
    'act-use': (d) => Bag.use(d.item),
    'act-equip': (d) => Bag.equip(d.item),
    'act-unequip': (d) => Bag.unequip(d.slot),
    'act-drop': (d) => Bag.drop(d.item),
    'act-drop-cat': (d) => Bag.dropCategory(d.cat),
    /* --- 菜单 --- */
    'act-save-open': () => UI.saveModal(),
    'act-save': (d) => {
      if (!Game.player) return;
      const slot = Number(d.slot);
      Game.slot = slot;
      Save.write(slot, Game.player);
      UI.toast(`已保存至存档位 ${['一', '二', '三'][slot - 1]}`);
      UI.refreshSaveBody();
    },
    'act-load': async (d) => {
      if (!Game.player) { Game.loadFrom(d.slot); return; }
      UI.closePopup(); // 先关掉存档弹窗，再弹确认框
      const ok = await UI.popup({ title: '读取存档', html: '读取后当前未保存的进度将丢失，确定吗？', options: [{ text: '读取', value: true }, { text: '取消', value: false }] });
      if (ok) Game.loadFrom(d.slot);
    },
    'act-delete-save': (d) => {
      Save.remove(d.slot);
      UI.toast('已删除该存档');
      UI.refreshSaveBody();
    },
    'act-help': () => Tutorial.show(true),
    'act-newgame': async () => {
      const ok = await UI.popup({ title: '离开游戏', html: '当前进度已自动保存。确定回到开始界面吗？', options: [{ text: '离开', value: true }, { text: '取消', value: false }] });
      if (ok) Game.exitToStart();
    },
    /* --- 战斗 --- */
    'bt-attack': () => Battle.active && Battle.act('attack'),
    'bt-skill': (d) => Battle.active && Battle.act('skill', d.gf),
    'bt-item': (d) => Battle.active && Battle.act('item', d.item),
    'bt-defend': () => Battle.active && Battle.act('defend'),
    'bt-flee': () => Battle.active && Battle.act('flee'),
    'bt-menu': (d, el) => { if (Battle.active) { Battle.active.menu = d.menu; Battle.render(); } },
    'bt-back': () => { if (Battle.active) { Battle.active.menu = null; Battle.render(); } },
    /* --- v13 战斗：自动 / 速度 / 驯服 --- */
    'bt-auto': () => {
      const B = Battle.active;
      if (!B || B.over) return;
      B.auto = !B.auto;
      Log.add(B.auto ? '【自动战斗】开启——你心神沉入本能，招式自行流转。' : '【自动战斗】关闭——你重新执掌每一招。', 'system');
      Battle.render();
      if (B.auto && !B.busy) Battle.autoNext();
    },
    'bt-speed': () => { Battle.setSpeed(Battle.speed >= 3 ? 1 : Battle.speed + 1); },
    'bt-tame': () => { if (typeof BeastSys !== 'undefined' && BeastSys.tame) BeastSys.tame(); else UI.toast('此兽野性难驯'); },
    /* --- 大道 / 天劫 / 因果 / 百艺（增量扩展） --- */
    'act-dao-open': () => DaoSys.openModal(),
    'dao-pick': (d) => DaoSys.pick(d.dao),
    'act-dao-change': () => DaoSys.changeDao(),
    'trib-strategy': (d) => Tribulation.choose(d.strategy),
    'act-slay': () => KarmaSys.slayCorpses(),
    'quest-side': (d) => QuestSys.claimSide(d.side),
    'act-sign': () => DailySign.draw(),
    'act-alchemy': (d) => CraftSys.alchemy(d.recipe),
    'act-alchemy-multi': (d) => CraftSys.alchemy(d.recipe, Number(d.times) || 5),
    'act-draw': () => CraftSys.drawTalisman(),
    /* --- v13 祭炼强化 / 炼器 --- */
    'act-enhance': (d) => ForgeSys.enhance(d.slot),
    'act-forge': (d) => ForgeSys.forge(d.recipe),
    /* --- v13 洞府 / 灵兽 --- */
    'act-cave-up': () => CaveSys.upgrade(),
    'act-cave-plant': (d) => CaveSys.plant(Number(d.i)),
    'act-cave-harvest': (d) => CaveSys.harvest(Number(d.i)),
    'act-beast-active': (d) => BeastSys.setActive(Number(d.uid)),
    'act-beast-feed': (d) => BeastSys.feed(Number(d.uid)),
    'act-beast-free': (d) => BeastSys.free(Number(d.uid)),
    /* --- v13 悬赏 / 黑市 --- */
    'act-bounty-submit': (d) => BountySys.submit(Number(d.i)),
    'act-bounty-claim': (d) => BountySys.claim(Number(d.i)),
    'act-black-buy': (d) => BlackSys.buy(d.item),
    'act-black-mystery': () => BlackSys.buyMystery(),
    /* --- v3 秘境 --- */
    'act-realm-enter': (d) => DungeonSys.enter(Number(d.realm)),
    'act-realm-node': (d) => DungeonSys.resolve(Number(d.node)),
    'act-realm-retreat': () => DungeonSys.retreat(),
    'act-realm-synth': () => DungeonSys.synth(),
    /* --- v3 江湖 --- */
    'npc-befriend': (d) => NpcSys.befriend(d.npc),
    'npc-spar': (d) => NpcSys.spar(d.npc),
    'npc-betray': (d) => NpcSys.betray(d.npc),
    'npc-swear': (d) => NpcSys.swear(d.npc),
    'npc-dao': (d) => NpcSys.becomeDao(d.npc),
    'npc-peace': (d) => NpcSys.peacemake(d.npc),
    /* --- v3 派系 --- */
    'act-faction-join': (d) => SectSys.joinFaction(d.f),
    'act-faction-exchange': (d) => SectSys.factionExchange(Number(d.i)),
    'act-danger-go': (d) => SectSys.goDanger(Number(d.i)),
    /* --- v3 世界大事件 --- */
    'act-event-join': () => WorldSys.joinEvent(),
    'act-event-skip': () => WorldSys.skipEvent(),
    /* --- v3 兵解转世 --- */
    'act-reincarnate': () => ReincarnationSys.open(),
    /* --- 弹窗 / 引导 --- */
    'pop-choice': (d) => UI.popupChoose(Number(d.i)),
    'tut-next': () => Tutorial.next(),
    'tut-prev': () => Tutorial.prev(),
    'tut-skip': () => Tutorial.finish(),
    /* --- v15 剧情 --- */
    'story-next': () => Story.next(),
    'story-choice': (d) => Story.choose(Number(d.storyChoice)),
    'story-close': () => Story.close(),
    'quest-review': () => QuestSys.openArchive(),
    'quest-reread': (d) => QuestSys.reread(d.sid),
    'quest-goto': (d) => { Game.actions['act-tab']({ tab: d.tab }); },
  },
};

document.addEventListener('DOMContentLoaded', () => Game.init());
