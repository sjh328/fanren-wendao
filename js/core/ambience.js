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
      this.tone(110, t, 0.5, { type: 'sawtooth', gain: 0.16 });
      this.tone(82.4, t + 0.12, 0.6, { type: 'sawtooth', gain: 0.13 });
    } else if (kind === 'poison') {
      this.tone(520, t, 0.3, { type: 'sawtooth', gain: 0.08 });
      this.tone(360, t + 0.1, 0.35, { type: 'sawtooth', gain: 0.07 });
    } else if (kind === 'forge') {
      this.tone(1244, t, 0.16, { type: 'square', gain: 0.10 });
      this.tone(830, t + 0.16, 0.22, { type: 'square', gain: 0.08 });
      this.tone(1244, t + 0.4, 0.16, { type: 'square', gain: 0.10 });
    } else if (kind === 'tame') {
      this.tone(587.33, t, 0.2, { type: 'sine', gain: 0.22 });
      this.tone(740, t + 0.13, 0.2, { type: 'sine', gain: 0.22 });
      this.tone(880, t + 0.26, 0.5, { type: 'sine', gain: 0.26 });
    } else if (kind === 'bounty') {
      this.tone(659.25, t, 0.22, { type: 'triangle', gain: 0.22 });
      this.tone(987.77, t + 0.15, 0.5, { type: 'triangle', gain: 0.26 });
    }
  },
  /** 生成式古琴背景乐 */
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
  render() {
    const btn = document.getElementById('amb-toggle');
    if (btn) btn.classList.toggle('on', this.sfxOn || this.musicOn);
  },
};
window.Ambience = Ambience;