
/* ======================================================================
 * §1.8 增量扩展（v5）：氛围音效 Ambience（Web Audio 合成，零外部资源）
 * 事件音效默认关；古琴背景乐单独开关、基础音量 20%；总音量滑条统一调节。
 * ====================================================================== */
const Ambience = {
  mood: 'calm',   // v19 情境配乐
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
        try { if (Save.storage.setItem) Save.storage.setItem(this.KEY, JSON.stringify(pref)); else Save.mem[this.KEY] = JSON.stringify(pref); } catch (err) {}
        UI.toast(`界面字号：${{ 100: '标准', 110: '大', 122: '特大' }[v] || v + '%'}`);
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
  /** v19 字号档位 */
  applyFontScale(v) {
    document.documentElement.style.fontSize = (v === 110 ? 17 : v === 122 ? 19 : 15.5) + 'px';
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
    }
  },
  /** 生成式古琴背景乐：五声音阶随机游走 + 弦底长音，疏落淡远 */
  startMusic() {
    if (!this.ensureCtx() || this.musicTimer) return;
    this.musicStep = 0;
    const mood = this.mood || 'calm';
    const tick = () => {
      const t = this.ctx.currentTime + 0.02;
      this.musicStep++;
      const P = this.PENTA;
      if (this.musicStep % 8 === 1) this.tone(P[0] / (mood === 'battle' ? 2 : 2), t, mood === 'battle' ? 2.2 : 3.2, { type: 'sine', gain: 0.20, dest: this.musicBus });
      if (Utils.chance(mood === 'battle' ? 78 : 62)) {
        const f = P[Math.floor(Math.random() * P.length)] * (mood === 'battle' && Utils.chance(40) ? 2 : 1);
        this.tone(f, t, mood === 'battle' ? 1.1 : 1.6, { type: 'triangle', gain: 0.30, dest: this.musicBus });
        if (Utils.chance(30)) this.tone(f * 2, t + 0.03, 0.8, { type: 'sine', gain: 0.10, dest: this.musicBus });
      }
    };
    tick();
    this.musicTimer = setInterval(tick, this.mood === 'battle' ? 460 : 640);
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
};
