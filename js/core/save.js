
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
  /** v34（E123）：原始串单源写入——storage 可用走 localStorage，否则落内存档（键名与 read 严格对称）。
   *  Meta 此前自拼 `Save.KEY + key` 直写 mem（mem['fanren_wd_meta_1']），而 read('meta_1') 读的是
   *  mem['meta_1']——隐私模式/禁存储下成就图鉴每会话清零。 */
  writeRaw(key, raw) {
    try {
      if (this.storage.setItem) this.storage.setItem(this.KEY + key, raw);
      else this.mem[key] = raw;
    } catch (e) { this.mem[key] = raw; }   // v34（E124）：配额满/写入异常同样镜像内存档，进度不丢
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
          // v33（E97）修瑕：校验失败原「重试」只是原样重写同一 raw——若存储层坏读，第二次大概率
          // 同样不符且无二次校验（自欺）。失败改落内存档并明示，本会话进度至少不丢。
          console.warn('存档校验失败，本条改落内存档');
          this.mem[key] = raw;
          try { this.storage.removeItem(verifyKey); } catch (e2) { /* ignore */ }
          UI.toast('浏览器存储读写异常——本次进度暂存内存，可能不会保留', true);
        }
      } else {
        this.mem[key] = raw;
      }
    } catch (e) {
      console.warn('存档失败', e);
      this.mem[key] = raw;   // v34（E124）：QuotaExceeded 等写入异常也镜像内存档——原只 toast，本条进度直接丢弃
      try { if (this.storage.removeItem) this.storage.removeItem(this.KEY + key + '_v'); } catch (e2) { /* ignore */ }   // v35（E191）：回收孤儿校验键（配额本已紧张，孤儿键自加剧）
      UI.toast('存档写入异常，请检查存储空间', true);
    }
    UI.saveFlash();
  },
  /** v30 滚动快照：进入游戏前把 auto 存档复制到 bak2（损坏/误删可回捞；每会话至多一次） */
  snapshotAuto() {
    // v32 修瑕（G2）：滚动快照——原「每会话一次」使 bak2 恒停在会话开头，6 小时长会话崩溃
    // 只能回捞 6 小时前。改为每 10 分钟滚动一次（会话首次照旧），安全网贴身跟上。
    // v37（E268）：首拍/滚动拍分治——实证 autoSave 每行动实时写盘，「写前调用」读到的 auto.meta.ts
    // 几乎恒 <60s，原 60 秒新鲜度检查把滚动拍恒数拦截（接线等于没接）。现 60 秒检查只约束会话
    // 首拍（first，保留 v30「跨会话快照上次会话」原始语义），滚动拍绕过；10 分钟节流与 E137
    // 死档过滤保持不变
    const first = !Game._snapAt;
    const now = Date.now();
    if (!first && now - Game._snapAt < 600000) return;
    Game._snapAt = now;
    try {
      const cur = this.read('auto');
      if (!cur || !cur.player || !cur.meta || !cur.meta.ts) return;
      // v35（E137）修瑕：坐化收场的死档不再滚入 bak2——原无 dead 过滤，死档回捞时会把当前
      // 活档 auto 整体覆盖成死档（安全网自身成了销毁通道）
      if (cur.meta.dead) return;
      if (first && Date.now() - cur.meta.ts < 60000) return;   // 首拍：刚写过的不算「上次会话」
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
    // v35（E191）：删档一并回收 _v 校验键（孤儿校验键与正式键等大，配额紧张场景自加剧）
    try { this.storage.removeItem ? this.storage.removeItem(this.KEY + key + '_v') : delete this.mem[key + '_v']; } catch (e) { /* ignore */ }
  },
  /** 每次行动实时落盘（保持外部读取 localStorage 所见即所得）；
   *  force 参数保留兼容（关页 / 切后台等关键时机调用），当前策略下与常规写入一致。 */
  _lastAuto: 0,
  /** v26：节流开关——仅挂机热路径（AutoCult）启用：每轮 ~0.3s 全量 JSON 双写曾达上万次/小时 */
  setThrottle(on) { this._thr = !!on; if (!on) this._lastAuto = 0; },
  autoSave(force = false) {
    if (!Game.player || Game.player.dead) return;
    this.snapshotAuto();   // v37（E268）：写前滚动快照——10 分钟节流兜频率；60 秒检查只约束首拍
    const now = Date.now();
    if (!force && this._thr && now - (this._lastAuto || 0) < 2500) return;
    this._lastAuto = now;
    this.write('auto', Game.player);
  },
};
