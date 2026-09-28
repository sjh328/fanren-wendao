
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
  /* ---------- v41（E463）：岁月残影面板——bak/bak2/auto_pre_bak2/lasterror 旧档安全网一览。
   *  原三份快照「只写不读」（auto_pre_bak2 弹窗承诺「原档暂存」却无任何入口可达），残影卡自此可见、
   *  可回捞（复用 bak2 回捞流程：原档先落 auto_pre_bak2 二级保险 → 快照写入 auto → 读档）、可清除。
   *  快照元信息走 Save.peekRaw 只读窥档，不触发任何写路径。 */
  SHADOW_KEYS: [
    { key: 'bak',            label: '劫前余影', desc: '引动天劫前的自动备份' },
    { key: 'bak2',           label: '会前残影', desc: '上次会话开始前的自动档快照' },
    { key: 'auto_pre_bak2',  label: '回捞前旧档', desc: '上次回捞动作暂存的原档' },
    { key: 'lasterror',      label: '异常残痕', desc: '上次异常退出的记录' },
  ],
  shadowRows() {
    return this.SHADOW_KEYS.map(({ key, label, desc }) => {
      const snap = Save.peekRaw(key);
      if (key === 'lasterror') {
        if (!snap || !snap.ts) return '';
        return `<div class="slot-card"><div class="slot-info"><div class="slot-name">${label}<span style="color:var(--text-faint);font-weight:normal;font-size:0.86em"> · ${desc}</span></div>
          <div class="slot-meta">${new Date(snap.ts).toLocaleString('zh-CN', { hour12: false })} · ${Utils.esc(String(snap.msg || '').split('\n')[0].slice(0, 46))}</div></div>
          <div class="slot-btns"><button class="btn btn-sm btn-danger" data-action="st-shadow-clear" data-key="${key}">拂 去</button></div></div>`;
      }
      if (!snap || !snap.player || !snap.meta) return '';
      const m = snap.meta;
      return `<div class="slot-card"><div class="slot-info"><div class="slot-name">${label}<span style="color:var(--text-faint);font-weight:normal;font-size:0.86em"> · ${desc}</span></div>
        <div class="slot-meta">${Utils.esc(m.name || '?')} · ${Utils.esc(m.realmText || '?')} · 历 ${m.day || 0} 日<br>${new Date(m.ts || Date.now()).toLocaleString('zh-CN', { hour12: false })}${m.dead ? ' · <span class="dead-mark">已坐化</span>' : ''}</div></div>
        <div class="slot-btns">
          <button class="btn btn-sm btn-primary" data-action="st-shadow-restore" data-key="${key}" ${m.dead ? 'disabled title="该残影来自已坐化的修士"' : ''}>回 捞</button>
          <button class="btn btn-sm btn-danger" data-action="st-shadow-clear" data-key="${key}">拂 去</button>
        </div></div>`;
    }).filter(Boolean).join('');
  },
  /** 残影卡渲染：宿主在开始界面 .start-inner 尾部（无残影时整卡隐藏）；由 game.js 各 renderStart 调用点随动 */
  renderShadow() {
    const host = document.querySelector('#start-screen .start-inner');
    if (!host) return;
    let card = document.getElementById('shadow-card');
    if (!card) {
      card = document.createElement('div');
      card.id = 'shadow-card';
      host.appendChild(card);
    }
    const rows = this.shadowRows();
    card.innerHTML = rows ? `<div class="shop-section-title" style="margin-top:10px">◈ 岁月残影 · 旧档安全网</div>${rows}` : '';
    card.style.display = rows ? '' : 'none';
  },
};
