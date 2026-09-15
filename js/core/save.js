
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
          this.storage.removeItem(verifyKey);   // v30 修瑕：校验失败分支曾残留 _v 临时键
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
  /** v30 滚动快照：进入游戏前把 auto 存档复制到 bak2（损坏/误删可回捞；每会话至多一次） */
  snapshotAuto() {
    if (Game._snapDone) return;
    Game._snapDone = true;
    try {
      const cur = this.read('auto');
      if (!cur || !cur.player || !cur.meta || !cur.meta.ts) return;
      if (Date.now() - cur.meta.ts < 60000) return;   // 刚写过的不算「上次会话」
      const prev = this.read('bak2');
      if (!prev || !prev.meta || (prev.meta.ts || 0) < cur.meta.ts) {
        const raw = JSON.stringify(cur);
        if (this.storage.setItem) this.storage.setItem(this.KEY + 'bak2', raw);
        else this.mem['bak2'] = raw;
      }
    } catch (e) { /* ignore */ }
  },
  remove(key) {
    try { this.storage.removeItem ? this.storage.removeItem(this.KEY + key) : delete this.mem[key]; } catch (e) { /* ignore */ }
    // v31 修瑕（E26）：联动清掉该档的成就图鉴 meta 键——此前删档后 fanren_wd_meta_<slot> 永久残留
    try { this.storage.removeItem ? this.storage.removeItem(this.KEY + 'meta_' + key) : delete this.mem['meta_' + key]; } catch (e) { /* ignore */ }
  },
  /** 每次行动实时落盘（保持外部读取 localStorage 所见即所得）；
   *  force 参数保留兼容（关页 / 切后台等关键时机调用），当前策略下与常规写入一致。 */
  _lastAuto: 0,
  /** v26：节流开关——仅挂机热路径（AutoCult）启用：每轮 ~0.3s 全量 JSON 双写曾达上万次/小时 */
  setThrottle(on) { this._thr = !!on; if (!on) this._lastAuto = 0; },
  autoSave(force = false) {
    if (!Game.player || Game.player.dead) return;
    const now = Date.now();
    if (!force && this._thr && now - (this._lastAuto || 0) < 2500) return;
    this._lastAuto = now;
    this.write('auto', Game.player);
  },
};
