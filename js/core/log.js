/* ======================================================================
 * §3 日志系统
 * ====================================================================== */
const Log = {
  el: null,
  entries: [],
  paused: false,
  pinTimer: null,
  init() {
    this.el = document.getElementById('log');
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
  add(text, type = 'info') {
    if (!this.el) return;
    const p = Game.player;
    const year = p ? Math.floor(p.day / 365) + 1 : 1;
    const div = document.createElement('div');
    div.className = `log-entry log-${type}`;
    div.innerHTML = `<span class="t-time">第${year}年</span>${text}`;
    this.el.appendChild(div);
    this.entries.push(text);
    if (this.entries.length > 200) this.entries.splice(0, this.entries.length - 200);
    if (this.el.children.length > 160) this.el.removeChild(this.el.firstChild);
    if (!this.paused) this.el.scrollTop = this.el.scrollHeight;
    if (type === 'realm' || type === 'system') this.showPin(text);
    this.pokeBadge();
  },
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
    void pin.offsetWidth;
    pin.classList.add('flash');
    clearTimeout(this.pinTimer);
    this.pinTimer = setTimeout(() => pin.classList.add('out'), 3000);
  },
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
  pokeBadge() {
    const wrap = document.getElementById('log-wrap');
    if (!wrap || !wrap.classList.contains('collapsed')) return;
    const badge = wrap.querySelector('.log-badge');
    if (badge) badge.style.display = 'inline-block';
  },
};
window.Log = Log;