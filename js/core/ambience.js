
/* ======================================================================
 * §1.8 增量扩展（v5）：氛围音效 Ambience（Web Audio 合成，零外部资源）
 * v34（E2）：事件音效默认开——原默认关且开关藏在顶栏齿轮里，多数玩家从未听到过任何声音，
 * 整个氛围系统事实不存在；首次点击（开屏任意交互）即可 resume AudioContext，无自动播放阻碍。
 * 古琴背景乐仍默认关；总音量滑条统一调节。
 * ====================================================================== */
const Ambience = {
  mood: 'calm',   // v19 情境配乐
  ctx: null, master: null, musicBus: null,
  sfxOn: true, musicOn: false, vol: 0.8,   // v34（E2）：默认开
  MUSIC_BASE: 0.2,
  musicTimer: null, musicStep: 0,
  PENTA: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25],  // 五声音阶（宫商角徵羽，两个八度）
  KEY: 'fanren_wd_amb',

  init() {
    const pref = Save.read('amb') || {};
    // v34（E2）：默认值翻转为开——显式存过偏好（含明确关闭）则尊重；无记录的档默认有声
    this.sfxOn = pref.sfx !== undefined ? !!pref.sfx : true;
    if (pref.music) this.musicOn = true;
    if (typeof pref.vol === 'number') this.vol = Utils.clamp(pref.vol, 0, 1);
    const sfx = document.getElementById('amb-sfx');
    const music = document.getElementById('amb-music');
    const vol = document.getElementById('amb-vol');
    if (sfx) { sfx.checked = this.sfxOn; sfx.addEventListener('click', e => Ambience.setSfx(e.target.checked)); }
    if (music) { music.checked = this.musicOn; music.addEventListener('click', e => Ambience.setMusic(e.target.checked)); }
    if (vol) { vol.value = Math.round(this.vol * 100); vol.addEventListener('input', e => Ambience.setVolume(Number(e.target.value) / 100)); }
    // v19 设置中心：界面字号
    const font = document.getElementById('amb-font');
    if (font) {
      const saved = Save.read('amb') || {};
      const fs = saved.fontScale || 100;
      this.applyFontScale(fs);
      font.value = String(fs);
      font.addEventListener('change', e => {
        const v = Number(e.target.value) || 100;
        this.applyFontScale(v);
        const pref = Save.read('amb') || {};
        pref.fontScale = v;
        Save.writeRaw('amb', JSON.stringify(pref));   // v35（E193）：读写统一走 Save 单源入口（原 mem 路径键名错位，隐私模式下设置互相清零）
        UI.toast(`界面字号：${{ 100: '标准', 110: '大', 122: '特大' }[v] || v + '%'}`);
      });
    }
    // v20 设置中心：数字滚动/浮动数字开关 + 日志密度
    const anim = document.getElementById('amb-anim');
    if (anim) {
      anim.checked = (Save.read('amb') || {}).anim !== false;   // 默认开
      this.applyAnimPref(anim.checked);
      anim.addEventListener('click', e => {
        this.applyAnimPref(e.target.checked);
        const pref = Save.read('amb') || {};
        pref.anim = e.target.checked;
        Save.writeRaw('amb', JSON.stringify(pref));   // v35（E193）：读写统一走 Save 单源入口（原 mem 路径键名错位，隐私模式下设置互相清零）
        UI.toast(e.target.checked ? '数字动效：开' : '数字动效：关（性能模式）');
      });
    }
    // v21 设置中心：剧情逐字演出（默认开）
    const tw = document.getElementById('amb-tw');
    if (tw) {
      tw.checked = (Save.read('amb') || {}).typewriter !== false;
      tw.addEventListener('click', e => {
        const pref = Save.read('amb') || {};
        pref.typewriter = e.target.checked;
        Save.writeRaw('amb', JSON.stringify(pref));   // v35（E193）：读写统一走 Save 单源入口（原 mem 路径键名错位，隐私模式下设置互相清零）
        UI.toast(e.target.checked ? '剧情逐字演出：开' : '剧情逐字演出：关（即刻全显）');
      });
    }
    const dens = document.getElementById('amb-logdens');
    if (dens) {
      dens.value = (Save.read('amb') || {}).logDens || 'all';
      dens.addEventListener('change', e => {
        const pref = Save.read('amb') || {};
        pref.logDens = e.target.value;
        Save.writeRaw('amb', JSON.stringify(pref));   // v35（E193）：读写统一走 Save 单源入口（原 mem 路径键名错位，隐私模式下设置互相清零）
        if (typeof Log !== 'undefined') Log.density = e.target.value;
        UI.toast(e.target.value === 'lite' ? '日志密度：精简' : '日志密度：全量');
      });
    }
    // v36（E205）：一键行权 · 聚灵偏好三态——'skip' 的永久语义自此只能在此显式设置、随时可改回
    // （存量档经 ESC/遮罩误触写入的 skip 经设置页可见可改；「每次询问」= 不落盘）
    // v41（E422/E428）：偏好收进玩家档 p.ui 容器（挂机/行权/回显三侧同源，旧散键已删）
    const rush = document.getElementById('amb-rush');
    if (rush) {
      this.syncRushPref();
      rush.addEventListener('change', e => {
        const p = Game.player;
        if (!p) return;
        p.ui = p.ui || {};
        if (e.target.value === 'ask') delete p.ui.rush; else p.ui.rush = e.target.value;
        UI.toast(e.target.value === 'always' ? '聚灵偏好：总是聚灵' : e.target.value === 'skip' ? '聚灵偏好：从不聚灵' : '聚灵偏好：每次询问');
      });
    }
    // v39（E362）：行权小账/悟道三态偏好——v41（E428）起同 p.ui 子字段（默认 ask），面板可见可改
    const damode = document.getElementById('amb-damode');
    if (damode) {
      this.syncDailyPrefs();
      damode.addEventListener('change', e => {
        const p = Game.player;
        if (!p) return;
        p.ui = p.ui || {};
        if (e.target.value === 'ask') delete p.ui.damode; else p.ui.damode = e.target.value;
        UI.toast(e.target.value === 'always' ? '行权小账：toast 汇总不弹窗' : e.target.value === 'skip' ? '行权小账：静默' : '行权小账：每次弹出');
      });
    }
    const wudao = document.getElementById('amb-wudao');
    if (wudao) {
      this.syncDailyPrefs();
      wudao.addEventListener('change', e => {
        const p = Game.player;
        if (!p) return;
        p.ui = p.ui || {};
        if (e.target.value === 'ask') delete p.ui.wudao; else p.ui.wudao = e.target.value;
        UI.toast(e.target.value === 'always' ? '行权悟道：纯度 ≥30% 自动' : e.target.value === 'skip' ? '行权悟道：跳过' : '行权悟道：每次询问');
      });
    }
    // v41（E423 修偏）：挂机方式（智能/普通）——p.ui.engine 单源（autocult 每轮判定读），
    // 面板可见可改；此前 'normal' 档无任何设置入口不可达（只能靠灵石跌破滞回被动回落）
    const eng = document.getElementById('amb-engine');
    if (eng) {
      this.syncEnginePref();
      eng.addEventListener('change', e => {
        const p = Game.player;
        if (!p) return;
        p.ui = p.ui || {};
        p.ui.engine = e.target.value === 'normal' ? 'normal' : 'smart';
        UI.toast(p.ui.engine === 'smart' ? '挂机方式：智能（灵石充裕自动闭关）' : '挂机方式：普通（不自动闭关）');
      });
    }
    // v40（E394）：设置中心「挂机节奏」三档——纯体验零数值变动
    const apace = document.getElementById('amb-apace');
    if (apace) {
      apace.value = typeof AutoCult !== 'undefined' ? (AutoCult.loadPace()) : 'normal';
      apace.addEventListener('change', e => {
        if (typeof AutoCult !== 'undefined' && AutoCult.setPace) AutoCult.setPace(e.target.value);
      });
    }
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
    // v28 设置中心：界面密度（紧凑档缩卡片内边距，小屏多显示约 15% 内容）
    const den2 = document.getElementById('amb-density');
    if (den2) {
      const saved = (Save.read('amb') || {}).density || 'cozy';
      this.applyDensity(saved);
      den2.value = saved;
      den2.addEventListener('change', e => {
        this.applyDensity(e.target.value);
        const pref = Save.read('amb') || {};
        pref.density = e.target.value;
        Save.writeRaw('amb', JSON.stringify(pref));   // v35（E193）：读写统一走 Save 单源入口（原 mem 路径键名错位，隐私模式下设置互相清零）
        UI.toast(e.target.value === 'compact' ? '界面密度：紧凑' : '界面密度：舒适');
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
  /** v20 数字动效开关：关闭时 Anim.scan 直接定格、战斗浮动数字不入队 */
  applyAnimPref(on) {
    this.animOn = !!on;
    if (typeof Anim !== 'undefined') Anim.enabled = this.animOn;
    try { document.body.classList.toggle('anim-off', !this.animOn); } catch (e) {}   // v21 入场/过渡动画同受性能开关门控
  },
  /** v28 界面密度：紧凑档挂 body.density-compact（卡片内边距/间距由 CSS 变量统收） */
  applyDensity(v) {
    try { document.body.classList.toggle('density-compact', v === 'compact'); } catch (e) {}
  },
  /** v19 字号档位；v27 修瑕：样式表全为 px、根字号档位形同虚设——改用根级 zoom 真实缩放整个界面 */
  applyFontScale(v) {
    document.documentElement.style.fontSize = (v === 110 ? 17 : v === 122 ? 19 : 15.5) + 'px';
    const scale = v === 110 ? 1.1 : v === 122 ? 1.22 : 1;
    try { document.documentElement.style.zoom = scale === 1 ? '' : String(scale); } catch (e) { /* 老内核不支持则退化为字号档 */ }
  },
  persist() {
    // v29 修瑕：读回旧偏好合并后再写——此前只写音效三项，切一次音效会把字号/性能/逐字/日志密度全部静默重置
    let pref = {};
    try { pref = Save.read('amb') || {}; } catch (e) {}   // v35（E193）：读也走单源（原 mem 路径读无前缀键、写有前缀键）
    pref.sfx = this.sfxOn; pref.music = this.musicOn; pref.vol = this.vol;
    Save.writeRaw('amb', JSON.stringify(pref));
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
    const { type = 'sine', gain = 0.4, dest = null, filter = 0, glide = 0 } = opts;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    // v42（E496）：滑音收尾——frequency.exponentialRamp 模拟古琴揉弦按滑（glide 为末频/初频比）
    if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * glide), t0 + Math.min(dur, 0.35));
    let node = o;
    // v42（E496）：lowpass 滤波——削振荡器「电子感」毛刺，近丝弦木声
    if (filter) {
      try {
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = filter; f.Q.value = 0.8;
        o.connect(f); node = f;
      } catch (e) { node = o; }
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g); g.connect(dest || this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  /** v42（E496）：程序化混响——脉冲响应以噪声衰减生成（零外部资源），音乐总线干/湿两路并联 */
  reverb: null,
  _ensureReverb() {
    if (this.reverb || !this.ctx || !this.musicBus || !this.master) return;
    try {
      const sr = this.ctx.sampleRate;
      const len = Math.max(1, Math.floor(sr * 1.8));
      const buf = this.ctx.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
      const conv = this.ctx.createConvolver();
      conv.buffer = buf;
      const wet = this.ctx.createGain();
      wet.gain.value = 0.22;
      conv.connect(wet); wet.connect(this.master);
      this.musicBus.connect(conv);
      this.reverb = conv;
    } catch (e) { this.reverb = null; }   // 老内核无 ConvolverNode 则退回干声
  },
  /** v42（E496）：噪声战鼓（boss 情境）——缓冲噪声低通成形，短促轰鸣 */
  _drum(t, gain = 0.2) {
    if (!this.ctx || !this.musicBus) return;
    try {
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * 0.22));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const src = this.ctx.createBufferSource(); src.buffer = buf;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
      const g = this.ctx.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(this.musicBus);
      src.start(t);
    } catch (e) {}
  },
  /** v42（E497）：轻量音效节流表（per-kind 90ms 最小间隔，sfx 内部化——调用方 battle 等零改动） */
  _sfxLast: {},
  /** 轻量音效：breakthrough 破境 / rare 稀有 / victory 胜利（签名不变；v42（E497）加 per-kind 90ms 节流） */
  sfx(kind) {
    if (!this.sfxOn || !this.ensureCtx()) return;
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const last = this._sfxLast[kind];
    if (last != null && now - last < 90) return;   // 极速档同秒叠音合流：同 kind ≥90ms 一发（≈11 次/秒）
    this._sfxLast[kind] = now;
    const t = this.ctx.currentTime + 0.01;
    if (kind === 'breakthrough') {
      [329.63, 392.0, 440.0, 523.25, 659.25].forEach((f, i) => this.tone(f, t + i * 0.13, 0.9, { type: 'triangle', gain: 0.28 }));
      this.tone(130.81, t, 1.8, { type: 'sine', gain: 0.20 });
    } else if (kind === 'daoZu') {   // v36（E230）：证道祖之境——白金色长尾上行，终局专属音色（盛于破境）
      [261.63, 392.0, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, t + i * 0.16, 1.2, { type: 'triangle', gain: 0.30 }));
      this.tone(130.81, t, 3.2, { type: 'sine', gain: 0.24 });
      this.tone(1046.5, t + 1.0, 2.2, { type: 'sine', gain: 0.12 });
    } else if (kind === 'auction') {
      this.tone(196, t, 0.18, { type: 'square', gain: 0.30 });
      this.tone(131, t + 0.22, 0.3, { type: 'square', gain: 0.34 });
      this.tone(659, t + 0.5, 0.5, { type: 'sine', gain: 0.16 });
    } else if (kind === 'evolve') {
      [261, 329, 392, 523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.09, 0.5, { type: 'triangle', gain: 0.22 }));
      this.tone(1046, t + 0.6, 0.8, { type: 'sine', gain: 0.14 });
    } else if (kind === 'xinmo') {
      this.tone(220, t, 0.9, { type: 'sawtooth', gain: 0.16 });
      this.tone(311, t + 0.1, 0.9, { type: 'sawtooth', gain: 0.12 });
      this.tone(110, t + 0.2, 1.2, { type: 'sine', gain: 0.20 });
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
    } else if (kind === 'hit') {
      // v18：打击命中——短促冲击
      this.tone(440, t, 0.08, { type: 'square', gain: 0.12 });
      this.tone(220, t + 0.02, 0.1, { type: 'sawtooth', gain: 0.06 });
    } else if (kind === 'miss') {
      // v18：落空——气流声
      this.tone(300, t, 0.12, { type: 'triangle', gain: 0.04 });
    } else if (kind === 'crit') {
      // v18：暴击——清脆金属音
      this.tone(880, t, 0.15, { type: 'square', gain: 0.10 });
      this.tone(1320, t + 0.05, 0.12, { type: 'sine', gain: 0.08 });
    } else if (kind === 'block') {
      // v18：格挡——沉闷撞击
      this.tone(160, t, 0.15, { type: 'square', gain: 0.10 });
      this.tone(80, t + 0.03, 0.2, { type: 'sawtooth', gain: 0.06 });
    } else if (kind === 'tab') {
      // v20：页签切换轻嗒
      this.tone(660, t, 0.05, { type: 'sine', gain: 0.06 });
    } else if (kind === 'coin') {
      // v20：买卖成交
      this.tone(988, t, 0.08, { type: 'triangle', gain: 0.10 });
      this.tone(1319, t + 0.06, 0.14, { type: 'triangle', gain: 0.08 });
    } else if (kind === 'plant') {
      // v20：播种/浇水/收获三连音
      this.tone(392, t, 0.1, { type: 'sine', gain: 0.10 });
      this.tone(523, t + 0.08, 0.12, { type: 'sine', gain: 0.10 });
      this.tone(659, t + 0.18, 0.3, { type: 'sine', gain: 0.12 });
    } else if (kind === 'bell') {
      // v20：节庆钟声
      [523, 659, 784].forEach((f, i) => this.tone(f, t + i * 0.35, 1.6, { type: 'sine', gain: 0.14, dest: this.musicBus }));
      this.tone(262, t, 2.2, { type: 'sine', gain: 0.10 });
    } else if (kind === 'intent') {
      // v20：意图预警短促音
      this.tone(220, t, 0.12, { type: 'square', gain: 0.09 });
      this.tone(330, t + 0.1, 0.1, { type: 'square', gain: 0.07 });
    } else if (kind === 'inherit') {
      // v20：传承/炼化融合音
      this.tone(262, t, 0.8, { type: 'sawtooth', gain: 0.06 });
      this.tone(392, t + 0.25, 0.8, { type: 'triangle', gain: 0.10 });
      this.tone(523, t + 0.5, 1.2, { type: 'sine', gain: 0.14 });
    }
  },
  /* v42（E496）：六情境动机句表——每情境一段 4~8 音动机循环变奏（互异可辨识，验证以本表断言）：
   * notes 为 PENTA 五声音阶级度索引；tempo 拍距 ms；dur 音长；lift/damp 高低八度倾向 %；
   * fx 特性层：secret=低音 drone+水滴滑音、market=木鱼节拍、boss=噪声战鼓（_drum），零外部资源 */
  MOTIFS: {
    calm:   { notes: [0, 2, 1, 4, 3, 2, 1, 0], tempo: 640, dur: 1.6, lift: 25, damp: 30, fx: 'none' },
    battle: { notes: [0, 3, 4, 6, 4, 3, 6, 7], tempo: 460, dur: 1.1, lift: 40, damp: 0,  fx: 'none' },
    boss:   { notes: [0, 1, 0, 3, 0, 1, 5, 4], tempo: 400, dur: 1.1, lift: 50, damp: 0,  fx: 'drum' },
    story:  { notes: [4, 2, 3, 1, 2, 0, 1, 2], tempo: 760, dur: 1.6, lift: 0,  damp: 55, fx: 'none' },
    secret: { notes: [0, 4, 2, 5, 3, 6, 4, 2], tempo: 700, dur: 1.9, lift: 0,  damp: 60, fx: 'drone' },
    market: { notes: [2, 4, 0, 4, 2, 5, 4, 0], tempo: 520, dur: 1.2, lift: 30, damp: 0,  fx: 'wood' },
  },
  _motifWork: null,   // 当前循环中的变奏副本（相邻音偶有互换，动机仍可辨识）
  /** 情境特性层：drone（秘境水汽）/wood（市集木鱼）/drum（雷狱战鼓）——按拍位触发 */
  _moodFx(t, mood) {
    const step = this.musicStep;
    if (mood === 'secret') {
      if (step % 8 === 1) this.tone(65.41, t, 6.5, { type: 'sine', gain: 0.07, dest: this.musicBus, filter: 320 });          // 低音氤氲
      if (Utils.chance(22)) this.tone(1174.7, t + 0.1, 0.35, { type: 'sine', gain: 0.06, dest: this.musicBus, glide: 0.5, filter: 3000 });   // 水滴（滑音下坠）
    } else if (mood === 'market') {
      if (step % 2 === 1) this.tone(920, t, 0.06, { type: 'square', gain: 0.05, dest: this.musicBus, filter: 2000 });        // 木鱼正拍
      if (step % 8 === 5) this.tone(920, t + 0.14, 0.06, { type: 'square', gain: 0.04, dest: this.musicBus, filter: 2000 }); // 弱拍补点
    } else if (mood === 'boss') {
      if (step % 4 === 1) this._drum(t, 0.20);
      if (step % 8 === 7 && Utils.chance(60)) this._drum(t + 0.18, 0.13);
    }
  },
  /** 生成式古琴背景乐（v42（E496）意境引擎重写）：动机句循环变奏取代纯随机游走——
   *  六情境各成可辨识主题；弦底长音保留；tone 侧 lowpass+滑音、总线侧程序化混响 */
  startMusic() {
    if (!this.ensureCtx() || this.musicTimer) return;
    this.musicStep = 0;
    this._ensureReverb();
    const M = this.MOTIFS[this.mood || 'calm'] || this.MOTIFS.calm;
    this._motifWork = M.notes.slice();
    const tick = () => {
      const t = this.ctx.currentTime + 0.02;
      this.musicStep++;
      const mood = this.mood || 'calm';
      const mm = this.MOTIFS[mood] || this.MOTIFS.calm;
      const W = this._motifWork || mm.notes;
      const P = this.PENTA;
      // 弦底长音（每 8 拍，v20 范式保留）
      if (this.musicStep % 8 === 1) this.tone(P[0] / 2, t, mood === 'battle' || mood === 'boss' ? 2.2 : 3.2, { type: 'sine', gain: 0.20, dest: this.musicBus });
      // 动机句主音：按级度走句，偶发高低八度倾向（lift/damp，旧随机味保留为「变奏」而非主轴）
      const deg = W[(this.musicStep - 1) % W.length];
      const lift = mm.lift && Utils.chance(mm.lift);
      const damp = mm.damp && Utils.chance(mm.damp);
      const f = P[deg % P.length] * (lift ? 2 : damp ? 0.5 : 1);
      const filt = mood === 'secret' ? 1400 : mood === 'story' ? 1800 : 2600;
      this.tone(f, t, mm.dur, { type: mood === 'secret' ? 'sine' : 'triangle', gain: 0.30, dest: this.musicBus, filter: filt, glide: (mood === 'story' || mood === 'secret') ? 0.94 : 0 });
      if (Utils.chance(30)) this.tone(f * 2, t + 0.03, 0.8, { type: 'sine', gain: 0.10, dest: this.musicBus });
      if (mood === 'boss' && Utils.chance(35)) this.tone(f * 1.5, t + 0.06, 0.5, { type: 'square', gain: 0.08, dest: this.musicBus });   // 小二度摩擦，杀气
      // 情境特性层
      this._moodFx(t, mood);
      // 一轮奏毕：变奏（随机互换相邻两音，主题轮廓不变）
      if (W.length > 2 && (this.musicStep % W.length) === 0 && Utils.chance(70)) {
        const i = Math.floor(Math.random() * W.length);
        const j = (i + 1 + Math.floor(Math.random() * (W.length - 1))) % W.length;
        const tmp = W[i]; W[i] = W[j]; W[j] = tmp;
      }
    };
    tick();
    const tempo = this.MOTIFS[this.mood || 'calm'] ? this.MOTIFS[this.mood || 'calm'].tempo : 640;
    this.musicTimer = setInterval(tick, tempo);
  },
  /** v19 情境配乐：战斗急促（短音阶+高八度倾向），平静舒缓 */
  setMood(m) {
    if (this.mood === m) return;
    this.mood = m;
    if (this.musicOn && this.musicTimer) { this.stopMusic(); this.startMusic(); }
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
  /** v36（E205）：设置面板打开时同步聚灵偏好显示值——v41（E428）起偏好存于玩家档 p.ui 容器
   *  而非 amb 偏好文件，面板为静态 DOM，init 时玩家多半尚未读档，须于每次打开时回读 */
  syncRushPref() {
    const rush = document.getElementById('amb-rush');
    if (!rush) return;
    const p = Game.player;
    rush.value = (p && p.ui && p.ui.rush) || 'ask';
    this.syncDailyPrefs();
    this.syncEnginePref();
  },
  /** v39（E362）：行权小账/悟道三态偏好回显（v41（E428）起 p.ui 子字段，默认 ask） */
  syncDailyPrefs() {
    const p = Game.player;
    const da = document.getElementById('amb-damode');
    if (da) da.value = (p && p.ui && p.ui.damode) || 'ask';
    const wd = document.getElementById('amb-wudao');
    if (wd) wd.value = (p && p.ui && p.ui.wudao) || 'ask';
  },
  /** v41（E423）：挂机方式回显（p.ui.engine，默认 smart）——随面板打开回读（syncRushPref 同范式） */
  syncEnginePref() {
    const eng = document.getElementById('amb-engine');
    if (eng) eng.value = (Game.player && Game.player.ui && Game.player.ui.engine) || 'smart';
  },
};
