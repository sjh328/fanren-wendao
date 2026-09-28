
/* ======================================================================
 * §4 存档系统（localStorage，3 存档位 + 1 自动存档）
 * ====================================================================== */
const Save = {
  KEY: 'fanren_wd_',
  storage: (() => { try { localStorage.setItem('_t', '1'); localStorage.removeItem('_t'); return localStorage; } catch (e) { return {}; } })(),
  mem: {},
  read(key) {
    try {
      // v41（E466）：写失败键回落 mem 镜像——E124 配额镜像原「只写不读」（read 恒优先 storage），
      // 本会话内对失败键先读 mem 镜像，进度不丢；下一次成功覆写后回落自动解除（write 成功侧清账）
      if (this._quotaFailDay && this._quotaFailDay[key] && this.mem[key] != null) {
        try { return JSON.parse(this.mem[key]); } catch (e2) { /* 镜像损坏则落回常规读 */ }
      }
      const raw = this.storage.getItem ? this.storage.getItem(this.KEY + key) : this.mem[key];
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  /** v41（E463）：只读窥档——岁月残影面板读快照元信息（时间点·名号·境界·日）用；
   *  storage 先读、缺失回落 mem 镜像（writeRaw 配额镜像的快照亦可见），不走 E466 写失败回落
   *  语义、不触发任何写路径 */
  peekRaw(key) {
    try {
      const raw = this.storage.getItem ? this.storage.getItem(this.KEY + key) : null;
      if (raw != null) return JSON.parse(raw);
    } catch (e) { /* storage 读损坏则试 mem */ }
    try { return this.mem[key] != null ? JSON.parse(this.mem[key]) : null; } catch (e) { return null; }
  },
  /** v41（E466）：写失败记账（会话内存，不落档）——键级回落 mem 镜像的依据 */
  markQuotaFail(key) { this._quotaFailDay = this._quotaFailDay || {}; this._quotaFailDay[key] = Math.floor(Date.now() / 86400000); },
  clearQuotaFail(key) { if (this._quotaFailDay) delete this._quotaFailDay[key]; },
  /** v41（E466）：写失败 toast 的「立即导出文本码」入口——给刚弹出的 toast 挂一枚按钮
   *  （data-action 走全局委托，复用 save-export/exportSave）；toast 本身短命，另入日志一条长效入口 */
  exportEntry() {
    try {
      const wrap = (typeof UI !== 'undefined' && UI.el && UI.el.toast) || null;
      const tip = wrap && wrap.lastElementChild;
      if (tip) {
        const b = document.createElement('button');
        b.className = 'btn btn-sm';
        b.style.marginLeft = '8px';
        b.dataset.action = 'save-export';
        b.textContent = '立即导出文本码';
        tip.appendChild(b);
      }
    } catch (e) { /* ignore */ }
    try { if (typeof Log !== 'undefined' && Log.add) Log.add('⚠ 存档写入异常，本次进度已暂存内存镜像（本会话内读取不丢）——<button class="btn btn-sm" data-action="save-export">立即导出文本码</button>', 'warn'); } catch (e2) { /* ignore */ }
  },
  /** v34（E123）：原始串单源写入——storage 可用走 localStorage，否则落内存档（键名与 read 严格对称）。
   *  Meta 此前自拼 `Save.KEY + key` 直写 mem（mem['fanren_wd_meta_1']），而 read('meta_1') 读的是
   *  mem['meta_1']——隐私模式/禁存储下成就图鉴每会话清零。 */
  writeRaw(key, raw) {
    try {
      if (this.storage.setItem) this.storage.setItem(this.KEY + key, raw);
      else this.mem[key] = raw;
      this.clearQuotaFail(key);   // v41（E466）：写成功解除该键回落
    } catch (e) {
      this.mem[key] = raw; this.markQuotaFail(key);   // v34（E124）镜像 + v41（E466）回落记账
    }
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
          this.clearQuotaFail(key); delete this.mem[key];   // v41（E466）：成功覆写解除回落、清陈旧镜像
        } else {
          // v33（E97）修瑕：校验失败原「重试」只是原样重写同一 raw——若存储层坏读，第二次大概率
          // 同样不符且无二次校验（自欺）。失败改落内存档并明示，本会话进度至少不丢。
          console.warn('存档校验失败，本条改落内存档');
          this.mem[key] = raw;
          this.markQuotaFail(key);   // v41（E466）：坏读键记账——本会话 read() 回落 mem 镜像
          try { this.storage.removeItem(verifyKey); } catch (e2) { /* ignore */ }
          UI.toast('浏览器存储读写异常——本次进度暂存内存，可能不会保留', true);
          this.exportEntry();   // v41（E466）：「立即导出文本码」入口
        }
      } else {
        this.mem[key] = raw;
      }
    } catch (e) {
      console.warn('存档失败', e);
      this.mem[key] = raw;   // v34（E124）：QuotaExceeded 等写入异常也镜像内存档——原只 toast，本条进度直接丢弃
      this.markQuotaFail(key);   // v41（E466）：写失败键记账——本会话 read() 对该键回落 mem 镜像
      try { if (this.storage.removeItem) this.storage.removeItem(this.KEY + key + '_v'); } catch (e2) { /* ignore */ }   // v35（E191）：回收孤儿校验键（配额本已紧张，孤儿键自加剧）
      UI.toast('存档写入异常，请检查存储空间', true);
      this.exportEntry();   // v41（E466）：「立即导出文本码」入口
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
    delete this.mem[key];   // v41（E463/E466）：清 mem 镜像与回落账（peekRaw/写失败回落不再窥见已删档）
    this.clearQuotaFail(key);
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
