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
window.Anim = Anim;