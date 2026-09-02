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
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
  now() { return new Date().toLocaleString('zh-CN', { hour12: false }); },
  /** 稳定字符串哈希 */
  hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; },
};
window.Utils = Utils;