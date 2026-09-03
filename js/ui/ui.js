
/* ======================================================================
 * §16 界面渲染
 * ====================================================================== */
const UI = {
  el: {},
  cache() {
    for (const id of ['start-screen', 'create-screen', 'game-screen', 'start-slots', 'create-attrs', 'create-rating',
      'top-info', 'panel-left', 'tabs', 'tab-content', 'bag-panel', 'popup-modal', 'popup-title', 'popup-body', 'popup-btns', 'toast', 'focus-strip']) {
      this.el[id] = document.getElementById(id);
    }
  },
  gradeSpan(name, grade) { return `<span class="grade-${grade}">${name}</span>`; },
  /** 性能优化：内容未变化时跳过 innerHTML 重建，避免挂机/高频操作下的重复解析与回流 */
  setHTML(el, html) {
    if (!el) return;
    if (el._lastHtml === html) return;
    el._lastHtml = html;
    el.innerHTML = html;
  },

  /* ---------- 开始界面 ---------- */
  renderStart() {
    // v18：开始界面背景装饰
    const bgScene = document.getElementById('start-screen');
    if (bgScene && !bgScene.querySelector('.start-bg')) {
      const bg = document.createElement('div');
      bg.className = 'start-bg';
      bg.innerHTML = `<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0.08;pointer-events:none">
        <defs>
          <linearGradient id="bgSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4c9a8"/><stop offset="1" stop-color="#f6f0df"/></linearGradient>
          <linearGradient id="bgMtn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fa878"/><stop offset="1" stop-color="#4d6b44"/></linearGradient>
        </defs>
        <rect width="800" height="600" fill="url(#bgSky)"/>
        <circle cx="650" cy="80" r="50" fill="#fdf8ea" opacity="0.6"/>
        <polygon points="0,450 100,300 200,420 300,260 400,380 500,220 600,350 700,200 800,320 800,600 0,600" fill="url(#bgMtn)" opacity="0.3"/>
        <polygon points="0,500 150,380 300,470 450,350 550,430 700,320 800,420 800,600 0,600" fill="#5e8a54" opacity="0.2"/>
        <path d="M200 520 q50 -60 120 -20 q80 40 180 -30 q60 -40 120 10 q80 50 180 -20 v50 z" fill="#cfe6ee" opacity="0.15"/>
        <g opacity="0.08" transform="translate(60,100)"><circle cx="0" cy="0" r="2"/><circle cx="100" cy="20" r="1.5"/><circle cx="200" cy="-10" r="1.8"/><circle cx="50" cy="-30" r="1.2"/><circle cx="150" cy="15" r="1"/></g>
      </svg>`;
      bgScene.insertBefore(bg, bgScene.firstChild);
    }
    const slots = ['auto', 1, 2, 3].map(key => {
      const data = Save.read(key);
      const label = key === 'auto' ? '自动存档' : `存档位 · ${['一', '二', '三'][key - 1]}`;
      let meta, btns;
      if (data && data.player) {
        const m = data.meta;
        meta = `<div class="slot-meta">${Utils.esc(m.name)} · ${m.realmText}${this.daoLabel(m)}${m.ascended ? ' · <span style="color:var(--grade-5)">已飞升</span>' : ''}<br>
          历时${this.durText(m.day)} · ${m.age}岁 · ${new Date(m.ts).toLocaleString('zh-CN', { hour12: false })}${m.dead ? ' · <span class="dead-mark">已坐化</span>' : ''}</div>`;
        const canLoad = !m.dead;
        btns = `
          ${key === 'auto' ? `<button class="btn btn-sm btn-primary" data-action="st-load" data-slot="auto" ${canLoad ? '' : 'disabled'}>继 续</button>`
                           : `<button class="btn btn-sm" data-action="st-load" data-slot="${key}" ${canLoad ? '' : 'disabled'}>读 取</button>`}
          ${key !== 'auto' ? `<button class="btn btn-sm" data-action="st-newgame" data-slot="${key}">重 开</button>` : ''}
          <button class="btn btn-sm btn-danger" data-action="st-delete" data-slot="${key}">删 除</button>`;
      } else {
        meta = `<div class="slot-meta">尘缘未启，此地尚无一缕道痕。</div>`;
        btns = key === 'auto' ? '' : `<button class="btn btn-sm btn-primary" data-action="st-newgame" data-slot="${key}">开辟仙途</button>`;
      }
      return `<div class="slot-card"><div class="slot-info"><div class="slot-name">${label}</div>${meta}</div><div class="slot-btns">${btns}</div></div>`;
    }).join('');
    this.setHTML(this.el['start-slots'], slots);
  },
  renderCreate() {
    const a = StartScreen.attrs;
    const sum = a.gen + a.comp + a.luck + a.body;
    this.setHTML(this.el['create-attrs'], Object.keys(GameData.ATTR_NAMES).map(k => `
      <div class="attr-cell">
        <div class="attr-head"><span class="attr-name">${GameData.ATTR_NAMES[k]}</span><span class="attr-val">${a[k]}</span></div>
        <div class="attr-bar"><div style="width:${a[k] * 10}%"></div></div>
        <div class="attr-desc">${GameData.ATTR_DESC[k]}</div>
      </div>`).join(''));
    this.setHTML(this.el['create-rating'], `天资合计 <b>${sum}</b> 点 —— ${PlayerFactory.rating(sum)}`);
  },

  /* ---------- 顶部信息 ---------- */
  renderTop() {
    const p = Game.player;
    this.setHTML(this.el['top-info'], `
      <span>${Time.labelLong(p)}</span><span>${p.age}岁 / 寿元${Stat.compute(p).lifespan}</span>
      <span><span class="save-dot"></span>已自动存档</span>`);
  },

  /* ---------- 左侧状态面板（v14：身份卡 → 核心条 → 属性网格 → 道行状态 → 建议） ---------- */
  renderStatus() {
    const p = Game.player;
    const st = Stat.compute(p);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const poisonCap = 60 + p.attrs.body * 8 + (p.realmIdx >= 5 ? 20 : 0);
    const eqNames = { weapon: '兵器', armor: '护甲', accessory: '饰品' };
    const eqHtml = Object.keys(eqNames).map(slot => {
      const it = p.equipped[slot];
      const def = it ? GameData.ITEMS[Utils.eqId(it)] : null;
      return `<div class="equip-slot"><span>${eqNames[slot]}</span>
        <span>${def ? `${this.gradeSpan(def.name, def.grade)}${ForgeSys.enhText(p, it)} ${ForgeSys.affixText(typeof it === 'object' ? it : null)} <button class="btn btn-sm" data-action="act-unequip" data-slot="${slot}">卸下</button>` : '<span style="color:var(--text-faint)">无</span>'}</span></div>`;
    }).join('');
    // v13 已触发套装提示
    const activeSets = ForgeSys.activeSets(p);
    const setHtml = activeSets.length
      ? activeSets.map(s => `<div class="tip-line set-line" title="${s.text}">· <b class="hl">${s.name}</b> 已成套——${s.text}</div>`).join('')
      : '';
    const realmColor = GameData.REALM_AURA[p.realmIdx] || '#c9a86a';
    // v14 身份卡：名字居中 + 境界徽章 + 大道寿元
    const idCard = `
      <div class="id-card">
        <div class="id-name">${Utils.esc(p.name)}</div>
        <div class="id-row"><span class="realm-badge" style="--realm-c:${realmColor}">${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}</span></div>
        <div class="id-line"><span>大道 <b class="hl">${DaoSys.name(p)}</b></span><span>寿元 <b>${p.age} / ${st.lifespan}</b></span></div>
      </div>`;
    // v14 核心条：色点标题 + 大数值，进度一眼可读
    const coreBar = (label, cls, nk, val, max, maxText, fmt) => `
      <div class="core-stat-head">
        <span class="cs-name ${cls}">${label}</span>
        <span class="cs-val">${fmt ? `<span class="num-anim" data-nk="${nk}" data-fmt="fmt" data-nv="${val}">${Utils.fmtNum(val)}</span>` : `<span class="num-anim" data-nk="${nk}" data-nv="${val}">${Math.round(val)}</span>`} <span class="cs-max">/ ${maxText}</span></span>
      </div>
      <div class="bar" title="${label} ${Math.round(val)} / ${max}"><div class="bar-fill ${cls}${cls === 'hp' && val / max <= 0.3 ? ' low' : ''}" style="width:${Utils.clamp(val / max * 100, 0, 100)}%"></div><span class="bar-text">${Math.round(val / max * 100)}%</span></div>`;
    // v14 道行状态芯片
    const chips = [];
    if (p.insight > 0) chips.push(`<span class="chip" title="突破感悟：冲关时的额外成算">感悟 <b>${p.insight}</b></span>`);
    chips.push(`<span class="chip hot${p.poison > poisonCap * 0.75 ? ' risk' : ''}" title="丹毒 ${Math.round(p.poison)}/${poisonCap}：超过上限将反噬损毁修为">丹毒 <b>${Math.round(p.poison)}</b>/${poisonCap}</span>`);
    chips.push(`<span class="chip lucky" title="气运：机缘与好事的眷顾">气运 <b>${p.fortune || 0}</b></span>`);
    chips.push(`<span class="chip sin${(p.karma || 0) >= 60 ? ' risk' : ''}" title="孽障：招致仇家偷袭，达百可斩三尸">孽障 <b>${p.karma || 0}</b>${(p.karma || 0) >= 100 ? '·可斩' : ''}</span>`);
    if ((p.xinmo || 0) >= 40) chips.push(`<span class="chip hot${(p.xinmo || 0) >= 100 ? ' risk' : ''}" title="心魔：丹毒反噬/渡劫失利/玄影窥伺所积。满百须于识海降伏（胜则全属性+1%/次，永久）">心魔 <b>${Math.round(p.xinmo || 0)}</b>${(p.xinmo || 0) >= 100 ? '·劫至' : ''}</span>`);   // v19
    if ((p.flags && p.flags.xinmoCleared)) chips.push(`<span class="chip lucky" title="心魔凝练：每降伏心魔一次，全属性永久 +1%">凝练 <b>+${p.flags.xinmoCleared}%</b></span>`);   // v19
    const chipsHtml = `
      <div class="chip-row">${chips.join('')}</div>
      <div class="bar" title="丹毒 ${Math.round(p.poison)} / ${poisonCap}"><div class="bar-fill poison" style="width:${Utils.clamp(p.poison / poisonCap * 100, 0, 100)}%"></div><span class="bar-text">${Math.round(p.poison / poisonCap * 100)}%</span></div>`;
    this.setHTML(this.el['panel-left'], `
      <div class="panel-title">✦ 道途</div>
      ${idCard}
      ${p.sect ? `<div class="stat-line"><span>宗门</span><b class="hl">${GameData.SECTS.find(s => s.id === p.sect.id).name}${p.sect.faction && GameData.SECT_FACTIONS.find(f => f.id === p.sect.faction) ? ' · ' + GameData.SECT_FACTIONS.find(f => f.id === p.sect.faction).name : ''}</b></div>
        <div class="stat-line"><span>贡献</span><b><span class="num-anim" data-nk="contrib" data-nv="${p.sect.contrib}">${p.sect.contrib}</span></b></div>` : ''}
      ${eqHtml}
      ${setHtml}
      <div class="sec-title">核心属性</div>
      ${coreBar('气血', 'hp', 'hp', p.hp, st.maxHp, st.maxHp, false)}
      ${coreBar('灵力', 'mp', 'mp', p.mp, st.maxMp, st.maxMp, false)}
      ${coreBar('修为', 'exp', 'exp', p.exp, need, Utils.fmtNum(need), true)}
      <div class="attr-mini">
        <span>根骨 <b>${p.attrs.gen}</b></span><span>悟性 <b>${p.attrs.comp}</b></span><span>福缘 <b>${p.attrs.luck}</b></span><span>体魄 <b>${p.attrs.body}</b></span>
      </div>
      <div class="stat-grid">
        <div class="stat-line"><span>攻击</span><b>${st.atk}</b></div>
        <div class="stat-line"><span>防御</span><b>${st.def}</b></div>
        <div class="stat-line"><span>身法</span><b>${st.speed}</b></div>
        <div class="stat-line"><span>暴击</span><b>${st.crit.toFixed(0)}%</b></div>
        <div class="stat-line"><span>闪避</span><b>${st.dodge.toFixed(0)}%</b></div>
        <div class="stat-line"><span>格挡</span><b>${st.block.toFixed(0)}%</b></div>
      </div>
      <div class="stone-row"><span>下品灵石</span><b><span class="num-anim" data-nk="stones.low" data-fmt="fmt" data-nv="${p.stones.low}">${Utils.fmtNum(p.stones.low)}</span></b></div>
      ${p.stones.mid ? `<div class="stone-row"><span>中品灵石</span><b><span class="num-anim" data-nk="stones.mid" data-fmt="fmt" data-nv="${p.stones.mid}">${Utils.fmtNum(p.stones.mid)}</span></b></div>` : ''}
      ${p.stones.high ? `<div class="stone-row"><span>上品灵石</span><b><span class="num-anim" data-nk="stones.high" data-fmt="fmt" data-nv="${p.stones.high}">${Utils.fmtNum(p.stones.high)}</span></b></div>` : ''}
      <div class="sec-title">道行状态</div>
      ${chipsHtml}
      ${DaoxinSys.statusHtml(p)}
      ${GameData.REALM_TRAITS[p.realmIdx] ? `<div class="stat-line"><span>境界特性</span><b class="hl" title="${GameData.REALM_TRAITS[p.realmIdx].desc}">${GameData.REALM_TRAITS[p.realmIdx].name}</b></div>
      <div class="tip-line" style="margin:0 0 4px">· ${GameData.REALM_TRAITS[p.realmIdx].desc}</div>` : ''}
      ${p.dao ? DaoSys.statusHtml(p) : ''}
      ${p.reinc ? `<div class="stat-line"><span>前世</span><b class="hl">第${p.reinc.lives}世 · 印记${p.reinc.marks || 0}（全属性+${p.reinc.marks || 0}%）</b></div>` : ''}
      <div class="guide-box">
        <div class="guide-title">✦ 当前建议</div>
        ${Guide.tips(p).map(t => `<div class="guide-tip">· ${t}</div>`).join('')}
      </div>
    `);
  },

  /* ---------- v14 行动横幅：进游戏第一眼看到"现在该做什么" ----------
   * 主卡（墨底金字）：主线目标优先；无主线时"里程碑行动"（冲关/飞升/择道/斩三尸/合成）顶上。
   * 副卡（朱砂）：紧急提醒（气血/丹毒/可结案等）。 */
  renderFocus() {
    const p = Game.player;
    if (!p) return;
    const st = Stat.compute(p);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const cap = 60 + p.attrs.body * 8 + (p.realmIdx >= 5 ? 20 : 0);
    // 紧急提醒（major：够格顶替主行动的里程碑）
    let alert = null;
    if (p.layer === 3 && p.exp >= need && p.realmIdx < 9) alert = { text: '修为圆满，可冲击瓶颈', go: 'cultivate', major: true };
    else if (p.realmIdx === 9 && p.layer === 3 && p.exp >= need && !p.flags.ascended) alert = { text: '真仙圆满，可白日飞升', go: 'cultivate', major: true };
    else if (p.realmIdx >= 1 && !p.dao) alert = { text: '大道未定，宜叩问大道', go: 'cultivate', major: true };
    else if ((p.counters.gupianGot || 0) >= 9 && !p.bag.z_benming && !Object.values(p.equipped).some(e => e && Utils.eqId(e) === 'z_benming')) alert = { text: '九枚碎片集齐，可合成本命法宝', go: 'map', major: true };
    else if ((p.karma || 0) >= 100) alert = { text: '孽障缠身，可斩三尸', go: 'cultivate', major: true };
    else if (QuestSys.SIDES.some(sd => !(p.quest || {}).side[sd.id] && p.realmIdx >= sd.minRealm && sd.steps.every(x => QuestSys.stepDone(x, p)))) alert = { text: '有支线奇遇可结案领赏', go: 'quest' };
    else if (p.poison > cap * 0.75) alert = { text: '丹毒将满，宜服解毒丹', go: 'cultivate' };
    else if (p.hp < st.maxHp * 0.3) alert = { text: '气血衰微，宜调息服丹', go: 'cultivate' };

    const mf = QuestSys.focus();
    const parts = [];
    const main = mf ? { label: '主 线', title: mf.title, sub: mf.text, go: mf.go }
      : (alert && alert.major ? { label: '当前要务', title: alert.text, sub: '道途紧要关头，一念定进退', go: alert.go } : null);
    if (main) {
      parts.push(`<div class="focus-main">
        <span class="focus-label">${main.label}</span>
        <div class="focus-body">
          <div class="focus-title">${Utils.esc(main.title)}</div>
          <div class="focus-sub">${Utils.esc(main.sub)}</div>
        </div>
        <button class="focus-go" data-action="act-tab" data-tab="${main.go}">前 往</button>
      </div>`);
    }
    // 副提醒：与主卡不同源才显示（主线在挂时提醒事项照常展示）
    const alertAsMain = !mf && alert && alert.major;
    if (alert && !alertAsMain) {
      parts.push(`<div class="focus-alert">
        <span class="focus-label">提醒</span>
        <span class="focus-title">${Utils.esc(alert.text)}</span>
        <button class="focus-go" data-action="act-tab" data-tab="${alert.go}">前往</button>
      </div>`);
    }
    this.setHTML(this.el['focus-strip'], parts.join(''));
    this.el['focus-strip'].classList.toggle('hidden', !parts.length);
  },

  /* ---------- 中央标签页 ---------- */
  renderTabs() {
    const tabs = [
      { id: 'cultivate', name: '修炼' },
      { id: 'quest', name: '问道' },
      { id: 'cave', name: '洞府' },
      { id: 'map', name: '游历' },
      { id: 'jianghu', name: '江湖' },
      { id: 'shop', name: '坊市' },
      { id: 'sect', name: '宗门' },
      { id: 'gongfa', name: '功法' },
    ];
    const p = Game.player;
    const showSectDot = !p.sect && p.realmIdx >= 1;
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const showCultDot = (p.layer === 3 && p.exp >= need && p.realmIdx < 9)
      || (p.realmIdx === 9 && p.layer === 3 && p.exp >= need && !p.flags.ascended)
      || !!p.canReincarnate;
    const showMapDot = !!(p.world && p.world.pending);
    const showJianghuDot = NpcSys.grudgeCount(p) > 0 || (typeof PersonalSys !== 'undefined' && PersonalSys.anyAvailable(p));   // v19 个人线待续谈
    const htmls = tabs.map(t => {
      const dot = (t.id === 'sect' && showSectDot) || (t.id === 'cultivate' && showCultDot)
        || (t.id === 'map' && showMapDot) || (t.id === 'jianghu' && showJianghuDot);
      const lock = Guide.tabLocked(t.id);   // v6：分步解锁
      return `<button class="tab-btn ${Game.activeTab === t.id ? 'active' : ''} ${lock ? 'locked' : ''}" data-action="act-tab" data-tab="${t.id}" ${lock ? `title="${lock}"` : ''}>${lock ? '🔒' : ''}${t.name}${dot ? '<span class="dot"></span>' : ''}</button>`;
    });
    // v12 页签分组：修炼·问道｜游历·江湖｜坊市·宗门｜功法
    const SEPS = new Set([1, 3, 5]);
    let tabsHtml = '';
    htmls.forEach((h, i) => {
      tabsHtml += h;
      if (SEPS.has(i) && i < htmls.length - 1) tabsHtml += '<span class="tab-sep"></span>';
    });
    this.setHTML(this.el['tabs'], tabsHtml);
  },

  renderTabContent() {
    const fn = {
      cultivate: () => this.renderCultivateTab(),
      quest: () => QuestSys.renderTab(),
      cave: () => this.renderCaveTab(),
      map: () => this.renderMapTab(),
      jianghu: () => this.renderNpcTab(),
      shop: () => this.renderShopTab(),
      sect: () => this.renderSectTab(),
      gongfa: () => this.renderGongfaTab(),
    }[Game.activeTab];
    this.setHTML(this.el['tab-content'], fn ? fn() : '');
  },

  renderCultivateTab() {
    const p = Game.player;
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const st = Stat.compute(p);
    const est = Math.round(Cultivate.baseGain(p) * (1 + st.cultPct / 100));
    const canBreak = p.layer === 3 && p.exp >= need && p.realmIdx < 9;
    const canAscend = p.realmIdx === 9 && p.layer === 3 && p.exp >= need && !p.flags.ascended;
    const secludeCost = Cultivate.secludeCost(p);
    let extra = '';
    // 大道未定（筑基及以上未择道）
    if (p.realmIdx >= 1 && !p.dao) {
      extra += `
      <div class="card">
        <div class="card-title">✦ 大道未定</div>
        <div class="card-desc">你已筑基有成，然大道未定，如无舵之舟。<br>六条大道，各有玄妙——择一而行，方能登高望远。</div>
        <div class="action-row"><button class="btn btn-primary btn-glow" data-action="act-dao-open">叩问大道</button></div>
      </div>`;
    }
    // v19 心魔劫
    const xinmoVal = p.xinmo || 0;
    if (xinmoVal >= 40) {
      const ready = typeof XinmoSys !== 'undefined' && XinmoSys.ready(p);
      extra += `
      <div class="card ${ready ? 'card-trib' : ''}">
        <div class="card-title">✦ 心魔劫 ${ready ? '<span class="tag danger">心魔值已满</span>' : `<span class="tag warn">心魔值 ${Math.round(xinmoVal)}</span>`}</div>
        <div class="card-desc">丹毒反噬、渡劫失利、暗处窥伺，皆令心魔滋长。心魔满百必劫——于识海中直面它，胜则道心凝练（全属性永久 +1%/次）。${(p.flags && p.flags.xinmoCleared) ? `<br>· 你已降伏心魔 <b>${p.flags.xinmoCleared}</b> 次。` : ''}</div>
        ${ready ? '<div class="action-row"><button class="btn btn-danger" data-action="act-xinmo">降伏心魔</button></div>' : ''}
      </div>`;
    }
    if (canBreak) {
      // v4：预估成功率实时分解——悟性 / 丹药感悟 / 气运 / 孽障 / 大道 / 根基 皆计入
      const target = p.realmIdx + 1;
      const quiet = target < GameData.TRIB_START;   // v9 筑基静修冲关
      const compEff = Stat.compOf(p);
      const basePart = 40 + compEff * 2 + (p.insight || 0);
      const fortPart = (p.fortune || 0) * 0.2;
      const karmaPart = (p.karma || 0) * 0.2;
      let daoMul = 1, daoText = '无';
      if (p.dao === 'sword') { daoMul *= 0.77; daoText = '剑修 ×0.77'; }
      if (p.dao === 'body') { daoMul *= 1.4; daoText = '体修 ×1.40'; }
      let rootMul = 1, rootText = '寻常';
      if (p.rootDeep) { rootMul *= 1.1; rootText = '深厚 ×1.10'; }
      if (p.rootWeak) { rootMul *= 0.85; rootText = '虚浮 ×0.85'; }
      const chance = Cultivate.breakthroughChance(p, quiet ? 15 : 0);
      const streak = p.breakStreak || 0;
      const tribPower = Tribulation.power(p, target);
      const realmPenalty = Tribulation.realmPenalty(target);
      const tribMult = Utils.clamp(1 - (tribPower - 100) / 500, 0.35, 1.1) * realmPenalty;
      extra += `
      <div class="card">
        <div class="card-title">✦ 冲击瓶颈</div>
        ${quiet
          ? `<div class="card-desc">修为已至<b>练气圆满</b>。筑基乃登堂入室之门，只需静室冲关、水到渠成——<b>无需历劫</b>，一念可破。</div>`
          : `<div class="card-desc">修为已至${GameData.REALM_NAMES[p.realmIdx]}圆满，冲击 <b>${GameData.REALM_NAMES[target]}</b> 期将引来<b>天劫</b>（劫威预估 ${tribPower.toFixed(0)}，境界愈高劫难愈重）！届时可在三策中择一而行，成败皆有道果。</div>`}
        <div class="break-est">
          <div class="stat-line"><span>基础（悟性 ${compEff.toFixed(1)} + 丹药感悟 ${p.insight || 0}）</span><b>${basePart.toFixed(0)}%</b></div>
          <div class="stat-line"><span>气运 ${p.fortune || 0}</span><b style="color:var(--ok)">+${fortPart.toFixed(0)}%</b></div>
          <div class="stat-line"><span>孽障 ${p.karma || 0}</span><b style="color:var(--danger)">-${karmaPart.toFixed(0)}%</b></div>
          <div class="stat-line"><span>大道加成（${daoText}）</span><b>×${daoMul.toFixed(2)}</b></div>
          <div class="stat-line"><span>根基（${rootText}）</span><b>×${rootMul.toFixed(2)}</b></div>
          ${quiet
            ? `<div class="stat-line"><span>静修冲关（筑基易关）</span><b style="color:var(--ok)">+15%</b></div>`
            : `<div class="stat-line"><span>境界劫难（目标${GameData.REALM_NAMES[target]}期）</span><b style="color:var(--danger)">×${realmPenalty.toFixed(2)}</b></div>`}
          ${streak > 0 ? `<div class="stat-line"><span>挫而愈坚（连败 ${streak} 次）</span><b style="color:var(--ok)">+${Math.min(15, streak * 5)}%</b></div>` : ''}
          <div class="stat-line est-final"><span>预估最终成算（基准策）</span><b class="hl">${chance.toFixed(0)}%</b></div>
        </div>
        ${quiet
          ? `<div class="tip-line">· 筑基冲关失利亦无大碍：保留六成修为与突破感悟，愈挫愈坚。</div>
             <div class="action-row"><button class="btn btn-hero" data-action="act-breakthrough">静 修 冲 关</button></div>`
          : `<div class="tip-line">· 天劫三策另乘系数：硬抗 ×0.82 / 借地躲劫 ×1.00 / 法宝挡劫 ×1.30，并随劫威（现约 ×${tribMult.toFixed(2)}）增减。</div>
             <div class="action-row"><button class="btn btn-hero" data-action="act-breakthrough">引 动 天 劫</button></div>`}
      </div>`;
    }
    if (canAscend) {
      extra += `
      <div class="card">
        <div class="card-title">✦ 渡劫飞升</div>
        <div class="card-desc">你已至真仙圆满，人界再无敌手。九霄之上，仙门已开。</div>
        <div class="action-row"><button class="btn btn-primary btn-glow" data-action="act-ascend">引动天劫 · 白日飞升</button></div>
      </div>`;
    }
    if (p.canReincarnate) {
      const marks = p.reinc ? p.reinc.marks || 0 : 0;
      extra += `
      <div class="card">
        <div class="card-title">✦ 兵解转世</div>
        <div class="card-desc">渡劫失利，大道蒙尘。与其困守残躯，不如兵解转世——<br>
        · 转世继承 <b>10% 悟性加成</b>与<b>前世记忆</b>（解锁隐藏机缘）<br>
        · 可保留<b>一件法宝</b>随身入轮回<br>
        · 得 1 枚<b>轮回印记</b>：永久 +1% 全属性上限，可叠加${marks ? `（已累计 ${marks} 枚）` : ''}<br>
        · 来世重择<b>出身与大道</b>；前世恩怨NPC将触发专属剧情</div>
        <div class="action-row"><button class="btn btn-danger btn-glow" data-action="act-reincarnate">兵 解 转 世</button></div>
      </div>`;
    }
    return `
      <div class="card card-main">
        <div class="card-title">✦ 修行 <span style="font-size:12px;color:var(--text-dim)">当前层尚需修为 ${Utils.fmtNum(Math.max(0, need - p.exp))}</span></div>
        <div class="card-desc">当前每轮修炼约得修为 <b class="hl">${Utils.fmtNum(est)}</b>（悟性 ${p.attrs.comp}，功法加成 ${st.cultPct}%）。</div>
        <div class="act-groups">
          <div class="act-main-row">
            <button class="btn btn-hero" data-action="act-cultivate">修 炼<span class="hero-sub">3 日 · 约得 ${Utils.fmtNum(est)} 修为</span></button>
          </div>
          <div class="act-sub-row">
            <button class="btn" data-action="act-rest">打坐调息（1日）</button>
            <button class="btn" data-action="act-seclude">闭关（30日 · ${Utils.fmtNum(secludeCost)}灵石）</button>
            ${(Bag.count('pill_liaoshang') || Bag.count('pill_huiling')) ? `<button class="btn" data-action="act-use-low-pills">一键服丹</button>` : ''}
            ${AutoCult.active
              ? `<button class="btn btn-danger" data-action="act-auto-stop">停止自动修炼（${AutoCult.rounds}轮）</button>`
              : `<button class="btn" data-action="act-auto-open">自动修炼</button>`}
            ${p.karma >= 100 ? `<button class="btn btn-danger btn-glow" data-action="act-slay">斩三尸</button>` : ''}
            ${p.dao ? `<button class="btn" data-action="act-dao-change">转修他道</button>` : ''}
          </div>
        </div>
        ${AutoCult.active ? `<div class="tip-line" style="color:#e8c56a">· 自动修炼中：目标${AutoCult.target.label}，已获修为 +${Utils.fmtNum(Math.max(0, Guide.totalExp(p) - AutoCult.startExp))}。</div>` : ''}
        <div class="tip-line">· 修炼与闭关是修为的主要来源；丹药见效快，但丹毒超标会损伤根基。<br>· 每逢圆满（第4层）修为攒满，即可冲击下一个大境界。</div>
      </div>${extra}`;
  },

  /* ---------- v13 洞府页签（聚灵阵 / 灵田 / 兽栏） ---------- */
  renderCaveTab() {
    const p = Game.player;
    if (!CaveSys.unlocked(p)) {
      return `<div class="card"><div class="card-title">✦ 洞府</div>
        <div class="card-desc">洞府乃修士安身立命之所——聚灵阵助修行、灵田可种药、兽栏能养灵兽。<br>然开辟洞府耗费甚巨，须至<b>筑基期</b>方可为之。</div></div>`;
    }
    if (!p.cave) p.cave = CaveSys.freshCave();
    const lv = p.cave.lv;
    const maxed = lv >= CaveSys.MAX_LV;
    const c = CaveSys.upCost(p);
    const matsTxt = c.mats ? Object.entries(c.mats).map(([id, n]) => `${GameData.ITEMS[id].name} ${Bag.count(id)}/${n}`).join('、') : '';
    const caveCard = `
    <div class="card">
      <div class="card-title">✦ 洞府 · ${lv} 层 ${maxed ? '<span class="tag safe">聚灵之极</span>' : ''}</div>
      <div class="card-desc">聚灵阵运转不息：修炼效率 <b class="hl">+${lv * 4}%</b> · 灵田 ${CaveSys.plotCount(p)}/8 块 · 兽栏 ${BeastSys.maxSlots(p)} 位。</div>
      ${maxed ? '' : `<div class="action-row"><button class="btn btn-primary" data-action="act-cave-up">扩建洞府（${Utils.fmtNum(c.stones)}灵石${matsTxt ? ' · ' + matsTxt : ''}）</button></div>`}
    </div>`;
    const plotsCard = `
    <div class="card">
      <div class="card-title">✦ 灵田 <span class="tag">${CaveSys.plotCount(p)} 块</span></div>
      <div class="card-desc">播下种子，按游戏日生长（离线亦生长）；成熟后采收，过熟廿日收成折半。种子在坊市「灵田种子」区有售。</div>
      ${CaveSys.renderPlots(p)}
    </div>`;
    // 兽栏
    const beasts = p.beasts.list || [];
    const passiveName = BeastSys.NAME;
    const beastRows = beasts.map(b => {
      const isOn = p.beasts.active === b.uid;
      const isOn2 = p.beasts.active2 === b.uid;
      const pk = BeastSys.PASSIVE[b.species] || 'atkPct';
      const pv = Math.round(b.power * 0.6 + b.level * 0.8);
      const needExp = b.level * 400;
      const bTag = isOn ? '<span class="tag safe">出战中</span>' : isOn2 ? '<span class="tag warn">护持中</span>' : '<span class="tag">栏中</span>';
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name"><b class="${isOn || isOn2 ? 'hl' : ''}">${b.name}</b> ${bTag} <span class="tag">${b.level} 阶</span>${b.bond ? `<span class="tag">亲昵 ${b.bond}/100</span>` : ''}</div>
          <div class="gf-desc">${b.species === 'beast' ? '凶兽' : b.species === 'snake' ? '灵蛇' : b.species === 'swarm' ? '虫群' : b.species === 'plant' ? '草木精' : '灵体'} · 协战与被动随阶成长<br>
          被动：${passiveName[pk]} +${pv}${isOn2 ? '（护持中以五成效力生效）' : ''} ｜ 经验 ${Math.floor(b.exp)}/${needExp}${b.skills.length ? ` ｜ 技能：${b.skills[0].name}` : ` ｜ 五阶习得天生技`}</div>
        </div>
        <div class="gf-actions">
          <button class="btn btn-sm" data-action="act-beast-active" data-uid="${b.uid}">${isOn ? '歇 息' : '出 战'}</button>
          <button class="btn btn-sm" data-action="act-beast-active2" data-uid="${b.uid}">${isOn2 ? '归 栏' : '护 持'}</button>
          <button class="btn btn-sm" data-action="act-beast-pat" data-uid="${b.uid}">抚 摸</button>
          <button class="btn btn-sm" data-action="act-beast-feed" data-uid="${b.uid}" ${Bag.count('m_neidan') ? '' : 'disabled'}>喂内丹（${Bag.count('m_neidan')}）</button>
          <button class="btn btn-sm btn-danger" data-action="act-beast-free" data-uid="${b.uid}">放归</button>
        </div>
      </div>`;
    }).join('');
    // v19 洞府建筑
    const buildRows = CaveSys.BUILDS.map(bd => {
      const lv = CaveSys.buildLv(p, bd.id);
      const c = CaveSys.buildCost(p, bd.id);
      const lvTag = lv >= 3 ? '<span class="tag safe">三阶圆满</span>' : `<span class="tag">${lv ? lv + ' 阶' : '未建'}</span>`;
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${bd.icon} <b>${bd.name}</b> ${lvTag}</div>
          <div class="gf-desc">${bd.desc}<br>${lv >= 3 ? '已至圆满。' : `需灵石 ${Utils.fmtNum(c.stones)}、玄铁矿 ×${c.ore}（持有 ${Bag.count('m_xuantie')}）`}</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-cave-build" data-b="${bd.id}" ${lv >= 3 ? 'disabled' : ''}>${lv ? '扩建' : '兴建'}</button></div>
      </div>`;
    }).join('');
    const buildsCard = `
    <div class="card">
      <div class="card-title">✦ 洞府营造 <span class="tag">v19</span></div>
      <div class="card-desc">聚灵阵之外，洞府亦可大兴土木——灵兽窝、演武场、藏经室，各至三阶。</div>
      ${buildRows}
    </div>`;
    const beastCard = `
    <div class="card">
      <div class="card-title">✦ 兽栏 <span class="tag">${beasts.length}/${BeastSys.maxSlots(p)} 位</span></div>
      <div class="card-desc">战斗中将可驯妖兽打至<b>两成血以下</b>，可尝试驯服。出战灵兽每回合四成几率协助攻击，并给主人一项被动加成。喂食【妖兽内丹】可升阶。</div>
      ${beastRows || '<div class="tip-line">兽栏空空——去荒野驯一头灵兽回来罢。</div>'}
    </div>`;
    return caveCard + plotsCard + buildsCard + beastCard;
  },

  renderMapTab() {
    const p = Game.player;
    return this.renderWorldCard() + this.renderSignCard() + this.renderDungeonSection()
      + GameData.MAPS.map(m => {
        const diff = p.realmIdx < m.recRealm
          ? { cls: 'danger', text: `推荐${m.recText} · 境界不足，九死一生！` }
          : p.realmIdx === m.recRealm
            ? { cls: 'warn', text: `推荐${m.recText} · 势均力敌` }
            : { cls: 'safe', text: `推荐${m.recText} · 游刃有余` };
        const magic = WorldSys.isMagic(p, m.id) ? '<span class="tag magic">魔域</span>' : '';
        return `
      <div class="card map-card">
        <div class="map-scene">${Art.scene(m.id, Art.seasonOf(Game.player))}</div>
        <div class="card-title">${m.name}${magic}<span class="tag ${diff.cls}">${diff.text}</span></div>
        <div class="card-desc">${m.desc}${magic ? '<br><span class="neg">魔气狂化：妖魔更强，所获亦丰。</span>' : ''}</div>
        <div class="action-row"><button class="btn" data-action="act-explore" data-map="${m.id}">探索此地（2日）</button></div>
      </div>`;
      }).join('');
  },

  /* ---------- §23 天下大势 ---------- */
  renderWorldCard() {
    const p = Game.player;
    const w = p.world;
    if (!w) return '';
    const y = WorldSys.year(p);
    const tags = [];
    if ((w.magicMaps || []).length) tags.push(`<span class="tag danger">魔域：${w.magicMaps.map(id => (GameData.MAPS.find(m => m.id === id) || {}).name).join('、')}</span>`);
    if (w.preachUntil && y <= w.preachUntil) tags.push(`<span class="tag safe">圣地讲道 · 悟性翻倍（余 ${w.preachUntil - y} 年）</span>`);
    if (w.ruinsUntil && y <= w.ruinsUntil) tags.push(`<span class="tag warn">秘境现世 · 机缘遍地（余 ${w.ruinsUntil - y} 年）</span>`);
    if (w.warUntil && y <= w.warUntil) tags.push(`<span class="tag magic">宗门大战 · 物价腾贵（余 ${w.warUntil - y} 年）</span>`);
    let pend = '';
    if (w.pending) {
      const def = GameData.WORLD_EVENTS.find(e => e.id === w.pending.type) || { name: '天下大事', desc: '' };
      const extra = w.pending.type === 'demon' && w.pending.mapId
        ? `事发之地：${(GameData.MAPS.find(m => m.id === w.pending.mapId) || {}).name || '某地'}。`
        : '';
      pend = `
      <div class="section-gap"></div>
      <div class="card-title" style="font-size:14px">◈ ${def.name} <span class="tag danger">进行中</span></div>
      <div class="card-desc">${def.desc} ${extra}</div>
      <div class="action-row">
        <button class="btn btn-primary btn-glow" data-action="act-event-join">参与大事</button>
        <button class="btn" data-action="act-event-skip">静观其变</button>
      </div>`;
    }
    const hist = w.history.length
      ? `<div class="tip-line">史载：${w.history.slice(-2).reverse().map(h => `第${h.year}年·${(GameData.WORLD_EVENTS.find(e => e.id === h.type) || {}).name || ''}`).join('；')}</div>`
      : '';
    return `
    <div class="card world-card">
      <div class="card-title">✦ 天下大势 <span class="tag">第 ${y} 年 · 距下次大事件约 ${Math.max(0, w.nextEventYear - y)} 年</span></div>
      ${tags.length ? `<div class="card-tags">${tags.join('')}</div>` : '<div class="card-desc">四海升平，天下无大事。</div>'}
      ${pend}
      ${hist}
    </div>`;
  },

  /* ---------- v8 黄历 · 每日一签 ---------- */
  renderSignCard() {
    const p = Game.player;
    const today = Math.floor(p.day);
    const drawn = p.signDay === today;
    return `
    <div class="card sign-card">
      <div class="card-title">✦ 黄历 · 每日一签 <span class="tag">${Time.labelLong(p)}</span></div>
      <div class="card-desc">${drawn
        ? `今日签文：<b class="hl">${p.signText}</b>——${p.signDesc}`
        : '一炷清香，诚心摇签。每日一支，问今日道途吉凶。'}</div>
      <div class="action-row">${drawn ? '<span class="tip-line" style="margin:0">· 已求签，明日请早。</span>' : '<button class="btn btn-primary" data-action="act-sign">摇 签</button>'}</div>
    </div>`;
  },

  /* ---------- §25 秘境 ---------- */
  renderDungeonSection() {
    const p = Game.player;
    const synthCard = Bag.count('m_gupian') >= 9
      ? `<div class="card"><div class="card-title">✦ 上古碎片已集齐</div><div class="card-desc">九枚上古法宝碎片在你掌心嗡鸣不止，隐隐欲聚成器。</div>
        <div class="action-row"><button class="btn btn-primary btn-glow" data-action="act-realm-synth">滴血炼化 · 合成本命法宝</button></div></div>`
      : '';
    if (p.dungeon) return this.renderDungeonActive() + synthCard;
    const rows = GameData.SECRET_REALMS.map((r, i) => {
      const unlocked = p.realmIdx >= r.recRealm;
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${r.name} <span class="tag ${unlocked ? 'safe' : 'warn'}">${GameData.REALM_NAMES[r.recRealm]}期秘境</span></div>
          <div class="card-desc">${r.desc}<br><span style="color:var(--text-faint)">随机九层节点：战斗 / 宝箱 / 奇遇 / 陷阱 / 遭遇，可随时撤离；陨落则损失背包三成之物。深处出失传功法与上古法宝碎片，集齐九枚可合成本命法宝。</span></div>
        </div>
        <div class="gf-actions">${unlocked
          ? `<button class="btn btn-sm btn-primary" data-action="act-realm-enter" data-realm="${i}">入 秘 境</button>`
          : `<span class="price lack">需 ${GameData.REALM_NAMES[r.recRealm]}期</span>`}</div>
      </div>`;
    }).join('');
    return `
    <div class="card">
      <div class="card-title">✦ 秘境探索 <span class="tag">肉鸽式</span></div>
      <div class="card-desc">每个大境界各有一座专属秘境。入内即随机生成节点路线，步步抉择——深入愈深，造化愈大，凶险愈甚。</div>
    </div>${rows}${synthCard}`;
  },

  renderDungeonActive() {
    const p = Game.player;
    const D = p.dungeon;
    const R = GameData.SECRET_REALMS[D.realm];
    const nodeBtns = D.stuck
      ? '<div class="tip-line"><span class="neg">一战不利，你退至安全处藏身——此地不宜久留，趁早撤离为上。</span></div>'
      : (D.choices || []).map((t, i) =>
        `<button class="btn ${t === 'boss' ? 'btn-primary btn-glow' : ''}" data-action="act-realm-node" data-node="${i}">${DungeonSys.nodeIcon(t)}${t === 'boss' ? '决战 · 守关者（最深处）' : `${GameData.DUNGEON_NODE_NAMES[t] || t} · 第 ${D.depth + 1} 层`}</button>`).join('');
    return `
    <div class="card dungeon-card">
      <div class="card-title">✦ 秘境 · ${R.name} <span class="tag warn">第 ${Math.min(D.depth + 1, D.total)} / ${D.total} 层</span></div>
      <div class="card-desc">${R.desc}</div>
      <div class="route-choices">${nodeBtns}</div>
      ${D.gains && D.gains.length ? `<div class="tip-line">已掠得：${D.gains.slice(-5).join('；')}</div>` : ''}
      <div class="action-row"><button class="btn btn-danger" data-action="act-realm-retreat">携收获 · 撤离秘境</button></div>
      <div class="tip-line">当前气血 ${Math.round(p.hp)} / ${Stat.compute(p).maxHp} —— 陨落于秘境者，背包三成之物将永远留在其中。</div>
    </div>`;
  },

  /* ---------- §24 江湖人脉 ---------- */
  renderNpcTab() {
    const p = Game.player;
    RankSys.dailyReward(p);   // v13：登顶每日气运（渲染时领取，随后由收尾落盘）
    const mapName = id => (GameData.MAPS.find(m => m.id === id) || {}).name || '四方云游';
    const myPow = p.realmIdx * 4 + p.layer;
    const rows = GameData.NPCS.map(d => {
      const s = p.npcs[d.id];
      if (!s) return '';
      const lbl = NpcSys.relLabel(p, d.id);
      const relCls = p.partner === d.id || (p.sworn || []).includes(d.id) || s.rel >= 30 ? 'safe'
        : s.rel <= -15 ? 'danger' : 'warn';
      const tags = [];
      if (s.grudge) tags.push('<span class="tag danger">宿怨</span>');
      if (s.pastLife) tags.push('<span class="tag magic">前世恩怨</span>');
      const srole = (GameData.STORY_ROLES || {})[d.id];
      if (srole) tags.push(`<span class="tag magic" title="${Utils.esc(srole.role)}">主线 · ${Utils.esc(srole.arc)}</span>`);
      if (d.kin && d.kin.length) tags.push(`<span class="tag">血亲：${d.kin.map(k => (NpcSys.def(k) || {}).name).filter(Boolean).join('、')}</span>`);
      const his = s.realmIdx * 4 + s.layer;
      const powerText = !s.alive ? '已殒身'
        : his > myPow + 3 ? '远胜于你' : his > myPow ? '略胜于你' : his === myPow ? '与你相当' : '不及你';
      const btns = !s.alive ? '<span class="tag danger">已身故</span>' : [
        `<button class="btn btn-sm" data-action="npc-befriend" data-npc="${d.id}">结交（${Utils.fmtNum(NpcSys.befriendCost(p, d.id))}灵石）</button>`,
        `<button class="btn btn-sm" data-action="npc-spar" data-npc="${d.id}">切磋</button>`,
        s.met ? `<button class="btn btn-sm" data-action="npc-gift" data-npc="${d.id}">赠礼（${Utils.fmtNum(Math.round(30 * GameData.stoneEco(s.realmIdx)))}灵石）</button>` : '',
        s.met && s.rel >= 30 ? `<button class="btn btn-sm" data-action="npc-discuss" data-npc="${d.id}">论道</button>` : '',
        PersonalSys.next(p, d.id) ? `<button class="btn btn-sm btn-primary" data-action="npc-line" data-npc="${d.id}" title="${Utils.esc((GameData.PERSONAL[d.id].acts[(p.personal[d.id] || 0)] || {}).brief || '')}">续谈 · ${Utils.esc(GameData.PERSONAL[d.id].arc)}</button>` : '',
        s.rel >= 15 && p.partner !== d.id ? `<button class="btn btn-sm btn-danger" data-action="npc-betray" data-npc="${d.id}">背刺夺宝</button>` : '',
        s.rel >= 70 && !(p.sworn || []).includes(d.id) ? `<button class="btn btn-sm" data-action="npc-swear" data-npc="${d.id}">结拜</button>` : '',
        s.rel >= 90 && !p.partner ? `<button class="btn btn-sm btn-primary" data-action="npc-dao" data-npc="${d.id}">结为道侣</button>` : '',
        s.grudge ? `<button class="btn btn-sm" data-action="npc-peace" data-npc="${d.id}">${s.pastLife ? '前世恩怨' : '化解仇怨'}</button>` : '',
      ].filter(Boolean).join('');
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name"><span style="display:inline-block;vertical-align:middle;width:34px;height:34px;border-radius:6px;overflow:hidden;margin-right:6px">${Art.portrait(Art.npcLook(d))}</span>${d.name} <span style="color:var(--text-faint);font-size:12px">${d.title} · ${d.temper}</span> <span class="tag ${relCls}">${lbl} ${s.rel > 0 ? '+' : ''}${s.rel}</span> ${tags.join('')}</div>
          <div class="gf-desc">${d.desc}<br><span style="color:var(--text-faint)">${GameData.REALM_NAMES[s.realmIdx]}${GameData.LAYER_NAMES[s.layer]} · 现于${s.alive ? mapName(s.map) : '殒身之地'} · 战力${powerText}</span></div>
        </div>
        <div class="gf-actions">${btns}</div>
      </div>`;
    }).join('');
    const rel = [];
    if (p.partner) rel.push(`道侣：${(NpcSys.def(p.partner) || {}).name || ''}`);
    if ((p.sworn || []).length) rel.push(`结拜：${p.sworn.map(id => (NpcSys.def(id) || {}).name).filter(Boolean).join('、')}`);
    // v5：旬轮换——部分修士行游在外，历练途中偶遇不着
    const away = NpcSys.awayNames(p);
    const awayLine = `<div class="tip-line">今值 <b class="hl">${Time.xunLabel(p)}</b>——${away.length ? `行游在外：${away.join('、')}，途中偶遇不着。` : '诸修士皆在各地活动，正遇得上。'}</div>`;
    return `
    <div class="card">
      <div class="card-title">✦ 江湖人脉</div>
      <div class="card-desc">修行界有十五位常驻修士，随岁月自行修炼、游历地图、争夺机缘，境界与你所见的时光同步成长。<br>
      结交可成好友、结拜、道侣——你于战斗、渡劫的虚弱危急关头，他们有概率舍命相助；背刺夺宝收益翻倍，但气运暴跌、恩怨永结——宿敌会趁你历练、突破、渡劫时偷袭。</div>
      ${rel.length ? `<div class="card-tags"><span class="tag safe">${rel.join(' · ')}</span></div>` : ''}
      ${awayLine}
    </div>${RankSys.render(p)}${rows}`;
  },

  renderShopTab() {
    const p = Game.player;
    const st = Stat.compute(p);
    const stock = GameData.SHOP.filter(row => p.realmIdx >= row.minRealm);
    const group = (type, title) => {
      const items = stock.filter(r => GameData.ITEMS[r.item].type === type);
      if (!items.length) return '';
      const rows = items.map(r => {
        const def = GameData.ITEMS[r.item];
        const price = ShopSys.price(r.item);
        const mul = WorldSys.marketMul(p, r.item);   // v5：行情
        const mkt = mul >= 1.08 ? '<span class="mkt up">涨</span>' : mul <= 0.92 ? '<span class="mkt down">跌</span>' : '';
        const known = def.type === 'gongfa' && p.gongfa[r.item];
        const afford = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000 >= price;
        return `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${this.gradeSpan(def.name, def.grade)}${known ? ' <span style="color:var(--text-faint);font-size:12px">（已修习）</span>' : ''}</div>
            <div class="gf-desc">${def.desc}</div>
          </div>
          <div class="gf-actions">
            <span class="price ${afford ? '' : 'lack'}">${Utils.fmtNum(price)}灵石${mkt}</span>
            <button class="btn btn-sm" data-action="act-buy" data-item="${r.item}" ${known ? 'disabled' : ''}>购买</button>
          </div>
        </div>`;
      }).join('');
      return `<div class="shop-section-title">◈ ${title}</div>${rows}`;
    };
    const sellable = Object.keys(p.bag).filter(id => (GameData.ITEMS[id].price || 0) > 0);
    const sellRows = sellable.map(id => {
      const def = GameData.ITEMS[id];
      const sp = ShopSys.sellPrice(id);
      return `
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">${this.gradeSpan(def.name, def.grade)} <span style="color:var(--text-faint)">×${p.bag[id]}</span></div></div>
        <div class="gf-actions">
          <span class="price">${sp}灵石/件</span>
          <button class="btn btn-sm" data-action="act-sell" data-item="${id}" data-qty="1">售一</button>
          <button class="btn btn-sm" data-action="act-sell" data-item="${id}" data-qty="all">全售</button>
        </div>
      </div>`;
    }).join('');
    // 炼丹炉（人人可用，丹道成丹率大涨）
    const alchemySection = `
      <div class="shop-section-title">◈ 炼丹炉${p.dao === 'pill' ? '（丹道加持，成丹率大增）' : ''}</div>
      ${GameData.ALCHEMY_RECIPES.map(r => {
        const out = GameData.ITEMS[r.out];
        const mats = Object.entries(r.need).map(([id, n]) => `${GameData.ITEMS[id].name} ${Bag.count(id)}/${n}`).join('、');
        const can = CraftSys.haveMats(p, r);
        return `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${this.gradeSpan(out.name, out.grade)}（成丹率 ${CraftSys.rate(p, r).toFixed(0)}%）</div>
            <div class="gf-desc">需 ${mats}</div>
          </div>
          <div class="gf-actions">
            <button class="btn btn-sm" data-action="act-alchemy" data-recipe="${r.id}" ${can ? '' : 'disabled'}>炼制</button>
            <button class="btn btn-sm" data-action="act-alchemy-multi" data-recipe="${r.id}" data-times="5" ${can ? '' : 'disabled'} title="连开五炉，药材不足自动停炉">×5</button>
          </div>
        </div>`;
      }).join('')}`;
    // 符坊（符修专属）
    const talismanSection = p.dao === 'talisman' ? `
      <div class="shop-section-title">◈ 符坊（符修专属）</div>
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">挥毫画符</div>
          <div class="gf-desc">焚香沐手，朱砂灵纸——成符可于战斗中祭出轰敌，亦可售予坊市换取灵石。</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm btn-primary" data-action="act-draw">画符（${Utils.fmtNum(CraftSys.drawCost(p))}灵石）</button></div>
      </div>` : '';
    // v13 悬赏任务板
    const B = BountySys.stateOf(p);
    const r = BountySys.rewards(p);
    const bountyRows = B.list.map((t, i) => {
      if (!t) return `
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">（此悬赏已交付）</div><div class="gf-desc">明日将有新悬赏贴出。</div></div>
      </div>`;
      const done = t.progress >= t.need;
      const btn = done
        ? `<button class="btn btn-sm btn-primary" data-action="act-bounty-claim" data-i="${i}">领赏（${Utils.fmtNum(r.stones)}灵石${p.sect ? `+${r.contrib}贡献` : ''}）</button>`
        : t.type === 'collect'
          ? `<button class="btn btn-sm" data-action="act-bounty-submit" data-i="${i}">上交（持有${Bag.count(t.target)}）</button>`
          : t.type === 'spar'
            ? '<span class="tip-line" style="margin:0">去江湖页切磋获胜</span>'
            : '<span class="tip-line" style="margin:0">游历猎杀自动计入</span>';
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${t.name} ${done ? '<span class="tag safe">已达成</span>' : `<span class="tag">进度 ${t.progress}/${t.need}</span>`}</div>
          <div class="gf-desc">${t.desc} · 赏格：灵石 ${Utils.fmtNum(r.stones)}${p.sect ? `、贡献 ${r.contrib}` : ''}</div>
        </div>
        <div class="gf-actions">${btn}</div>
      </div>`;
    }).join('');
    const bountySection = `
      <div class="shop-section-title">◈ 悬赏任务板 <span class="tag">第 ${B.day + 1} 日贴出 · 存续两日</span></div>
      ${bountyRows}`;
    // v13 黑市（每月前三日开市）
    const blackSection = BlackSys.isOpen(p) ? `
      <div class="shop-section-title">◈ 暗巷黑市 <span class="tag warn">开市中 · 余 ${BlackSys.daysLeft(p)} 日</span></div>
      <div class="tip-line" style="margin:0 0 6px">· 黑市奇货稀罕，价钱却贵六成；每月初三开市三日。<br>· 巷角的「来路不明之物」，福缘高者捡漏，福缘低者破财。</div>
      ${BlackSys.goods(p).map(id => {
        const def = GameData.ITEMS[id];
        const price = BlackSys.price(p, id);
        const afford = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000 >= price;
        return `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${this.gradeSpan(def.name, def.grade ?? def.tier ?? 0)}</div>
            <div class="gf-desc">${def.desc}</div>
          </div>
          <div class="gf-actions">
            <span class="price ${afford ? '' : 'lack'}">${Utils.fmtNum(price)}灵石</span>
            <button class="btn btn-sm" data-action="act-black-buy" data-item="${id}">买 下</button>
          </div>
        </div>`;
      }).join('')}
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">？？？ <span class="tag danger">来路不明</span></div>
        <div class="gf-desc">巷角那只血渍未干的储物袋……要赌一手吗？</div></div>
        <div class="gf-actions"><button class="btn btn-sm btn-danger" data-action="act-black-mystery">赌一手</button></div>
      </div>` : `
      <div class="shop-section-title">◈ 暗巷黑市 <span class="tag">闭市</span></div>
      <div class="tip-line" style="margin:0 0 6px">· 每月初三开市三日——如今巷口空空，唯有野猫。</div>`;
    // v13 祭炼强化（对已穿戴装备）
    const enhSlots = ['weapon', 'armor', 'accessory'].map(slot => {
      const id = p.equipped[slot] ? Utils.eqId(p.equipped[slot]) : null;
      if (!id) return '';
      const def = GameData.ITEMS[id];
      const lv = ForgeSys.lvOf(p, id);
      if (lv >= ForgeSys.MAX_LV) return `
        <div class="shop-row">
          <div class="gf-info"><div class="gf-name">${this.gradeSpan(def.name, def.grade)} <span class="enh-lv">+${lv}</span></div>
          <div class="gf-desc">已至强化极境。</div></div>
          <div class="gf-actions"><span class="tag safe">圆满</span></div>
        </div>`;
      const stones = ForgeSys.stonesCost(p, id, lv);
      const rate = ForgeSys.rate(lv);
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)}${ForgeSys.enhText(p, id)} ${ForgeSys.affixText(typeof p.equipped[slot] === 'object' ? p.equipped[slot] : null)} <span style="color:var(--text-faint);font-size:12px">→ +${lv + 1}（成功率 ${rate}%）</span></div>
          <div class="gf-desc">需灵石 ${Utils.fmtNum(stones)}、玄铁矿 ×${lv + 1}（持有 ${Bag.count('m_xuantie')}）${lv >= 7 ? '；<span class="neg">+7 起失败跌一级</span>' : ''}。强化石可保必成。</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-enhance" data-slot="${slot}">祭 炼</button></div>
      </div>`;
    }).join('');
    // v19 词缀洗练（对已穿戴装备）
    const affixSlots = ['weapon', 'armor', 'accessory'].map(slot => {
      const inst = p.equipped[slot];
      const id = inst ? Utils.eqId(inst) : null;
      if (!id || typeof inst !== 'object') return '';
      const def = GameData.ITEMS[id];
      const cur = ForgeSys.affixText(inst) || '<span style="color:var(--text-faint)">尚无词缀</span>';
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)} ${cur}</div>
          <div class="gf-desc">洗练重掷词缀（◆前缀 / ◈后缀 择一），需玄铁矿 ×2。</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-reroll" data-slot="${slot}">洗 练</button></div>
      </div>`;
    }).join('');
    const affixSection = `
      <div class="shop-section-title">◈ 词缀洗练（v19：洗练重掷，不问因果）</div>
      ${affixSlots || '<div class="tip-line">先装备法宝，方能洗练词缀。</div>'}`;
    // v19 本命法宝喂养
    const benmingSection = ForgeSys.benmingOwn(p) ? `
      <div class="shop-section-title">◈ 本命法宝 · 喂养（每阶全属性 +1%，至十阶）</div>
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">本命法宝 <span class="tag warn">${(p.benming && p.benming.lv) || 0} / ${ForgeSys.BENMING_MAX} 阶</span></div>
        <div class="gf-desc">以本命精血温养，吞玄铁与灵石而长。${(p.benming && p.benming.lv) >= ForgeSys.BENMING_MAX ? '已至圆满之境。' : ''}</div></div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-benming-feed" ${((p.benming && p.benming.lv) || 0) >= ForgeSys.BENMING_MAX ? 'disabled' : ''}>喂 养</button></div>
      </div>` : '';
    const enhanceSection = `
      <div class="shop-section-title">◈ 祭炼强化（+1~+10，每级 +10% 数值属性）</div>
      ${enhSlots || '<div class="tip-line">先在乾坤袋中装备法宝，方可祭炼强化。</div>'}
      ${affixSection}
      ${benmingSection}`;
    // v13 炼器坊
    const forgeRows = GameData.FORGE_RECIPES.map(r => {
      const out = GameData.ITEMS[r.out];
      const mats = Object.entries(r.need).map(([id, n]) => `${GameData.ITEMS[id].name} ${Bag.count(id)}/${n}`).join('、');
      const can = Object.entries(r.need).every(([id, n]) => Bag.count(id) >= n);
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(out.name, out.grade)}${out.set ? ' <span class="tag warn">套装件</span>' : ''}（成器率 ${r.rate}%）</div>
          <div class="gf-desc">${out.desc}<br>需 ${mats}</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-forge" data-recipe="${r.id}" ${can ? '' : 'disabled'}>锻 造</button></div>
      </div>`;
    }).join('');
    const forgeSection = `
      <div class="shop-section-title">◈ 炼器坊（消耗材料锻造神兵；天级神兵与套装件唯此处可出）</div>
      ${forgeRows}`;
    // v19 拍卖行
    const lot = AuctionSys.state(p);
    const lotDef = GameData.ITEMS[lot.item];
    const auctionSection = `
      <div class="shop-section-title">◈ 拍卖行（每六十日一件稀有拍品）<span class="tag warn">拍期余 ${lot.until - Math.floor(p.day)} 日</span></div>
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(lotDef.name, lotDef.grade)} <span class="tag">底价 ${Utils.fmtNum(lot.base)} 灵石</span></div>
          <div class="gf-desc">${lotDef.desc}</div>
        </div>
        <div class="gf-actions">
          <button class="btn btn-sm" data-action="act-bid" data-mode="steady">稳健 ×1.15</button>
          <button class="btn btn-sm" data-action="act-bid" data-mode="bold">激进 ×0.9</button>
          <button class="btn btn-sm btn-primary" data-action="act-bid" data-mode="dump">天价 ×1.6</button>
        </div>
      </div>`;
    // v19 布施
    const donateRows = DonateSys.TIERS.map(t => {
      const stones = Math.round(t.stones * Math.max(1, Math.pow(2.2, Math.min(5, p.realmIdx) - 1) / 1));
      return `
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">${t.name}</div>
        <div class="gf-desc">声望 +${t.rep}，气运 +${t.fortune}，孽障 ${t.karma}。需灵石 ${Utils.fmtNum(stones)}。</div></div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-donate" data-d="${t.id}">行 善</button></div>
      </div>`;
    }).join('');
    const donateSection = `
      <div class="shop-section-title">◈ 布施（散财消业，声望与气运双收）</div>
      ${donateRows}`;
    return `
      <div class="card">
        <div class="card-title">✦ 万宝坊市 <span style="font-size:12px;color:var(--text-dim)">${st.shopDiscount ? '万宝商会 · 九二折 · ' : ''}距市集刷新 ${WorldSys.marketDaysLeft(p)} 日 · 当前灵石：${Bag.stonesText()}</span></div>
        <div class="tip-line" style="margin:0 0 6px">· 坊市每三十日换一茬新货，市价随手气起伏（±两成）。<span style="color:var(--danger)">涨</span>者宜缓买，<span style="color:var(--ok)">跌</span>者可趁低。</div>
        <div class="card-tags">
          <button class="btn btn-sm" data-action="act-convert" data-dir="up1">100下品 → 1中品</button>
          <button class="btn btn-sm" data-action="act-convert" data-dir="down1">1中品 → 100下品</button>
          <button class="btn btn-sm" data-action="act-convert" data-dir="up2">100中品 → 1上品</button>
          <button class="btn btn-sm" data-action="act-convert" data-dir="down2">1上品 → 100中品</button>
        </div>
        ${group('pill', '丹药')}
        ${group('artifact', '法器')}
        ${group('gongfa', '功法典籍')}
        ${group('material', '杂货材料')}
        ${group('seed', '灵田种子')}
        <div class="shop-section-title">◈ 出售物品（四折回收${p.dao === 'pill' ? '，丹药另有五成加成' : ''}）</div>
        ${sellRows || '<div class="tip-line">背包中空空如也。</div>'}
        ${bountySection}
        ${blackSection}
        ${alchemySection}
        ${talismanSection}
        ${enhanceSection}
        ${forgeSection}
        ${auctionSection}
        ${donateSection}
      </div>`;
  },

  renderSectTab() {
    const p = Game.player;
    const cmdBtn = typeof SectSys !== 'undefined' && SectSys.isElder && SectSys.isElder(p)
      ? `<button class="btn btn-sm btn-primary" data-action="act-sect-command">⚡ 长老令</button>` : '';
    void cmdBtn;
    if (p.realmIdx < 1 && !p.sect) {
      return `<div class="card"><div class="card-title">✦ 宗门</div>
        <div class="card-desc">修仙界宗门林立，然非筑基不得其门而入。<br>你如今尚在练气，还请先专心修行。</div></div>`;
    }
    if (!p.sect) {
      const cards = GameData.SECTS.map(s => `
        <div class="card">
          <div class="card-title">${s.name}<span class="tag safe">${s.bonusText}</span></div>
          <div class="card-desc">${s.desc}<br><span class="neg">拜入宗门后不可改投他门，请慎重。</span></div>
          <div class="action-row"><button class="btn btn-primary" data-action="act-join" data-sect="${s.id}">拜入门下</button></div>
        </div>`).join('');
      return `<div class="card"><div class="card-title">✦ 宗门</div><div class="card-desc">你已至筑基，可择一宗门拜入，领取宗门任务换取贡献，兑换高阶功法与稀有资源。</div></div>${cards}`;
    }
    const sect = GameData.SECTS.find(s => s.id === p.sect.id);
    const taskRows = p.sect.tasks.map((t, i) => {
      const done = t.progress >= t.need;
      let btn = '';
      if (done) btn = `<button class="btn btn-sm btn-primary" data-action="act-task-claim" data-i="${i}">领取奖励</button>`;
      else if (t.type === 'collect') btn = `<button class="btn btn-sm" data-action="act-task-submit" data-i="${i}">上交（持有${Bag.count(t.target)}）</button>`;
      else if (t.danger) btn = `<button class="btn btn-sm btn-danger" data-action="act-danger-go" data-i="${i}">接生死状</button>`;
      const dangerTag = t.danger ? ' <span class="tag danger">高危</span>' : '';
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${t.name}${dangerTag}</div>
          <div class="gf-desc">${t.desc} —— 进度 ${Math.floor(t.progress)}/${t.need}</div>
        </div>
        <div class="gf-actions">${btn}</div>
      </div>`;
    }).join('');
    const exRows = GameData.SECT_EXCHANGE.map((row, i) => {
      const def = GameData.ITEMS[row.item];
      const known = def.type === 'gongfa' && p.gongfa[row.item];
      const afford = p.sect.contrib >= row.cost;
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)}${row.qty > 1 ? ` ×${row.qty}` : ''}${known ? ' <span style="color:var(--text-faint);font-size:12px">（已修习）</span>' : ''}</div>
          <div class="gf-desc">${def.desc}</div>
        </div>
        <div class="gf-actions">
          <span class="price ${afford ? '' : 'lack'}">${row.cost}贡献</span>
          <button class="btn btn-sm" data-action="act-exchange" data-i="${i}" ${known ? 'disabled' : ''}>兑换</button>
        </div>
      </div>`;
    }).join('');
    // §24 长老派系
    let facSection = '';
    if (!p.sect.faction) {
      facSection = `
      <div class="card">
        <div class="card-title">✦ 长老派系 · 站队 ${typeof SectSys !== 'undefined' && SectSys.isElder && SectSys.isElder(p) ? '<button class="btn btn-sm btn-primary" data-action="act-sect-command" style="margin-left:auto">⚡ 长老令</button>' : ''}</div>
        <div class="card-desc">宗门之内，三位长老各成一派。站队可领专属资源与功法，但会被敌对派系派发高危任务。</div>
        ${GameData.SECT_FACTIONS.map(f => `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${f.name} <span style="color:var(--text-faint);font-size:12px">${f.motto}</span></div>
            <div class="gf-desc">${f.desc}<br>${f.giftText}</div>
          </div>
          <div class="gf-actions"><button class="btn btn-sm btn-primary" data-action="act-faction-join" data-f="${f.id}">站 队</button></div>
        </div>`).join('')}
      </div>`;
    } else {
      const f = GameData.SECT_FACTIONS.find(x => x.id === p.sect.faction);
      const facRows = (f ? f.exclusive : []).map((row, i) => {
        const def = GameData.ITEMS[row.item];
        const known = def.type === 'gongfa' && p.gongfa[row.item];
        const afford = p.sect.contrib >= row.cost;
        return `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${this.gradeSpan(def.name, def.grade)}${known ? ' <span style="color:var(--text-faint);font-size:12px">（已修习）</span>' : ''}</div>
            <div class="gf-desc">${def.desc}</div>
          </div>
          <div class="gf-actions">
            <span class="price ${afford ? '' : 'lack'}">${row.cost}贡献</span>
            <button class="btn btn-sm" data-action="act-faction-exchange" data-i="${i}" ${known ? 'disabled' : ''}>兑换</button>
          </div>
        </div>`;
      }).join('');
      facSection = `
      <div class="card">
        <div class="card-title">✦ 派系 · ${f.name} <span class="tag safe">${f.motto}</span></div>
        <div class="card-desc">你已依附 ${f.name}，可凭贡献兑换派系秘藏。敌对派系对你颇有微词——宗门任务中偶有生死状。</div>
        ${facRows}
      </div>`;
    }
    return `
      ${facSection}
      <div class="card">
        <div class="card-title">✦ ${sect.name} <span class="tag safe">${sect.bonusText}</span></div>
        <div class="card-desc">当前贡献：<b class="hl">${p.sect.contrib}</b> 点。完成宗门任务可获得贡献与灵石。</div>
        ${taskRows}
      </div>
      <div class="card">
        <div class="card-title">✦ 贡献兑换</div>
        ${exRows}
      </div>`;
  },

  renderGongfaTab() {
    /* v19 道韵行（渲染时拼入 gongfa 区块末尾，见下方 daoYunHtml） */
    const p = Game.player;
    const learned = Object.entries(p.gongfa).map(([id, g]) => {
      const def = GameData.ITEMS[id];
      const maxLv = GongfaSys.maxLevel(def);
      const maxed = g.level >= maxLv;
      const need = GongfaSys.needExp(def, g.level);
      const bonusText = Object.entries(def.bonus || {}).map(([k, [base, per]]) => {
        const label = { atkPct: '攻击', defPct: '防御', hpPct: '气血', mpPct: '灵力', spdPct: '身法', crit: '暴击%', dodge: '闪避%', block: '格挡%', cult: '修炼效率%' }[k] || k;
        const val = (base + per * (g.level - 1)).toFixed(1).replace(/\.0$/, '');
        return `${label}+${val}`;
      }).join('，');
      return `
      <div class="gf-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)}（${{ attack: '攻', defense: '防', support: '辅' }[def.gtype]}）
            <span class="gf-lv">第${g.level}层${maxed ? ' · 大成' : ` · 感悟${Math.floor(g.exp)}/${need}`}</span></div>
          <div class="gf-desc">${def.desc}${bonusText ? `<br>当前加成：${bonusText}` : ''}${def.skill ? `<br>神通：<span class="grade-2">${def.skill.name}</span> —— ${def.skill.desc}` : ''}</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-study" data-gf="${id}" ${maxed ? 'disabled' : ''}>${maxed ? '已大成' : '参悟（5日）'}</button></div>
      </div>`;
    }).join('');
    const learnable = Object.keys(p.bag).filter(id => GameData.ITEMS[id].type === 'gongfa');
    const learnRows = learnable.map(id => {
      const def = GameData.ITEMS[id];
      return `
      <div class="gf-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)}（${{ attack: '攻', defense: '防', support: '辅' }[def.gtype]}）</div>
          <div class="gf-desc">${def.desc}</div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm btn-primary" data-action="act-learn" data-item="${id}">学 习</button></div>
      </div>`;
    }).join('');
    // v19 道韵协同
    const dyRows = (GameData.DAO_YUN || []).map(dy => {
      const on = dy.need.every(gid => p.gongfa[gid] && p.gongfa[gid].level >= 3);
      const names = dy.need.map(gid => `${(GameData.ITEMS[gid] || {}).name || gid} ${p.gongfa[gid] ? p.gongfa[gid].level : 0}/3层`).join(' · ');
      return `<div class="tip-line" style="${on ? '' : 'opacity:.65'}">${on ? '✦' : '·'} <b>${dy.name}</b>（${names}）——${dy.desc}</div>`;
    }).join('');
    return `
      <div class="card"><div class="card-title">✦ 已修功法</div>${learned || '<div class="tip-line">尚未修习任何功法。</div>'}</div>
      ${learnRows ? `<div class="card"><div class="card-title">✦ 待学典籍（背包中）</div>${learnRows}</div>` : ''}
      <div class="card"><div class="card-title">✦ 道韵协同（双功法修至三层以上，共鸣生韵）</div>${dyRows}</div>`;
  },

  /* ---------- 右侧背包 ---------- */
  renderBag() {
    const p = Game.player;
    const types = [
      { id: 'pill', name: '丹药' }, { id: 'gongfa', name: '功法' },
      { id: 'artifact', name: '法宝' }, { id: 'material', name: '材料' },
      { id: 'talisman', name: '符箓' }, { id: 'all', name: '全部' },
    ];
    const items = Object.keys(p.bag).filter(id => Game.bagTab === 'all' || GameData.ITEMS[id].type === Game.bagTab);
    // v4：按品质（凡/灵/玄/地/天/仙）优先降序，同品质再按类别归类
    items.sort((a, b) => {
      const da = GameData.ITEMS[a], db = GameData.ITEMS[b];
      const qa = da.grade ?? da.tier ?? 0, qb = db.grade ?? db.tier ?? 0;
      return (qb - qa) || da.type.localeCompare(db.type) || da.name.localeCompare(db.name);
    });
    const rows = items.map(id => {
      const def = GameData.ITEMS[id];
      const gq = def.grade ?? def.tier ?? 0;   // v4：品质档（材料按 tier 折算）
      let btns = '';
      if (def.type === 'pill') btns = `<button class="btn btn-sm" data-action="act-use" data-item="${id}">服用</button>`;
      if (def.type === 'gongfa') btns = `<button class="btn btn-sm" data-action="act-learn" data-item="${id}">学习</button>`;
      if (def.type === 'artifact') {
        const isOn = Object.values(p.equipped).some(e => e && Utils.eqId(e) === id);
        btns = isOn ? '' : `<button class="btn btn-sm" data-action="act-equip" data-item="${id}">装备</button>`;
      }
      btns += `<button class="btn btn-sm btn-danger" data-action="act-drop" data-item="${id}">丢弃</button>`;
      return `
      <div class="bag-item gq-${gq}">
        <div class="bag-item-head"><span class="bag-item-name">${this.gradeSpan(def.name, gq)}${def.type === 'artifact' ? ForgeSys.enhText(p, id) : ''}${def.type === 'gongfa' ? `（${{ attack: '攻', defense: '防', support: '辅' }[def.gtype]}）` : ''}${def.daoLimit ? ` <span class="tag magic">${(GameData.DAO_CLASSES.find(x => x.id === def.daoLimit) || {}).name || ''}专属</span>` : ''}</span><span class="bag-item-qty">×${p.bag[id]}</span></div>
        <div class="bag-item-desc">${def.desc}</div>
        <div class="bag-item-btns">${btns}</div>
      </div>`;
    }).join('');
    // v4：一键减负——凡品快捷出售；v13：当前分类批量丢弃
    const catName = (types.find(t => t.id === Game.bagTab) || { name: '全部' }).name;
    const quick = `<div class="bag-quick">
      ${ShopSys.commonSaleList().length ? `<button class="btn btn-sm" data-action="act-sell-common">一键出售凡品</button>` : ''}
      ${items.length ? `<button class="btn btn-sm btn-danger" data-action="act-drop-cat" data-cat="${Game.bagTab}">清空「${catName}」</button>` : ''}
    </div>`;
    const bagHtml = `
      <div class="panel-title">✦ 乾坤袋</div>
      <div class="stone-row"><span>下品灵石</span><b><span class="num-anim" data-nk="stones.low" data-fmt="fmt" data-nv="${p.stones.low}">${Utils.fmtNum(p.stones.low)}</span></b></div>
      ${p.stones.mid ? `<div class="stone-row"><span>中品灵石</span><b><span class="num-anim" data-nk="stones.mid" data-fmt="fmt" data-nv="${p.stones.mid}">${Utils.fmtNum(p.stones.mid)}</span></b></div>` : ''}
      ${p.stones.high ? `<div class="stone-row"><span>上品灵石</span><b><span class="num-anim" data-nk="stones.high" data-fmt="fmt" data-nv="${p.stones.high}">${Utils.fmtNum(p.stones.high)}</span></b></div>` : ''}
      <div class="bag-tabs">${types.map(t => `<button class="bag-tab ${Game.bagTab === t.id ? 'active' : ''}" data-action="bag-tab" data-bagtab="${t.id}">${t.name}</button>`).join('')}</div>
      ${quick}
      <div class="bag-list">${rows || '<div class="bag-empty">—— 空空如也 ——</div>'}</div>`;
    this.setHTML(this.el['bag-panel'], bagHtml);
    Anim.scan(this.el['bag-panel']);   // v4：灵石滚动动画
  },

  renderAll() {
    if (!Game.player) return;
    // v18：脏标记渲染——只重建变化区域
    const dirty = this._dirty || {};
    const all = Object.keys(dirty).length === 0;
    if (all || dirty.all || dirty.top) this.renderTop();
    if (all || dirty.all || dirty.focus) this.renderFocus();
    if (all || dirty.all || dirty.status) this.renderStatus();
    if (all || dirty.all || dirty.tabs) this.renderTabs();
    if (all || dirty.all || dirty.content) this.renderTabContent();
    if (all || dirty.all || dirty.bag) this.renderBag();
    this._dirty = {};
    Anim.scan(document.getElementById('game-screen'));
  },
  /** v18：标记某区域需要重渲染 */
  markDirty(area) { this._dirty = this._dirty || {}; this._dirty[area] = true; },

  /* ---------- 通用弹窗（Promise 风格，resolve 选项的 value） ---------- */
  _popupResolve: null,
  _popupOptions: [],
  popup({ title, html, options }) {
    return new Promise(resolve => {
      // 已有未决弹窗则先释放（按取消处理），杜绝弹窗叠加与 Promise 泄漏
      if (this._popupResolve) this.popupChoose(-1);
      this._popupResolve = resolve;
      this._popupOptions = (options && options.length) ? options : [{ text: '确定', value: true, primary: true }];
      this.el['popup-title'].textContent = title || '提示';
      this.el['popup-body'].innerHTML = html || '';
      this.el['popup-btns'].innerHTML = this._popupOptions.map((o, i) =>
        `<button class="btn ${o.primary ? 'btn-primary' : ''}" data-action="pop-choice" data-i="${i}">${o.text}</button>`).join('');
      this.el['popup-modal'].classList.remove('hidden');
      this.el['popup-modal'].setAttribute('role', 'dialog');
      this.el['popup-modal'].setAttribute('aria-modal', 'true');
      this.el['popup-modal'].setAttribute('aria-label', title || '提示');
    });
  },
  popupChoose(i) {
    if (!this._popupResolve) return;
    const r = this._popupResolve;
    const val = this._popupOptions[i] ? this._popupOptions[i].value : undefined;
    this._popupResolve = null;
    this.el['popup-modal'].classList.add('hidden');
    r(val);
  },
  /** 无选择地关闭当前弹窗 */
  closePopup() { if (this._popupResolve) this.popupChoose(-1); },
  /** 状态同步兜底：读档 / 返回开始界面时关闭全部覆盖层（战斗 / 通用弹窗 / 大道 / 天劫 / 引导 / 氛围面板），
   *  未决弹窗按取消结算，杜绝「遮罩卡死」与挂起的 Promise */
  closeOverlays() {
    this.closePopup();
    for (const id of ['battle-modal', 'dao-modal', 'tribulation-modal', 'tutorial', 'amb-panel']) {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    }
    Battle.active = null;
    Tribulation.state = null;
    document.getElementById('log-pin')?.classList.add('out');
  },

  /* ---------- 存档弹窗（操作后原地刷新） ---------- */
  /** v6：游戏内时长文案（X年X日） */
  durText(days) {
    const y = Math.floor(days / 365);
    return y > 0 ? `${y}年${days % 365}日` : `${days}日`;
  },
  daoLabel(m) {
    if (!m || !m.dao) return '';
    const d = GameData.DAO_CLASSES.find(x => x.id === m.dao);
    return d ? ` · <span style="color:var(--grade-2)">${d.name}</span>` : '';
  },
  saveBody() {
    const cards = ['auto', 1, 2, 3].map(key => {
      const data = Save.read(key);
      const label = key === 'auto' ? '自动存档' : `存档位 ${['一', '二', '三'][key - 1]}`;
      let meta = '空';
      if (data && data.player) {
        const m = data.meta;
        meta = `${Utils.esc(m.name)} · ${m.realmText}${this.daoLabel(m)} · ${this.durText(m.day)} · ${m.age}岁`;
      }
      const isCurrent = key !== 'auto' && Game.slot === key;
      return `<div class="slot-card">
        <div class="slot-info"><div class="slot-name">${label}${isCurrent ? ' <span class="tag safe">当前</span>' : ''}</div><div class="slot-meta">${meta}</div></div>
        <div class="slot-btns">
          ${key !== 'auto' ? `<button class="btn btn-sm" data-action="act-save" data-slot="${key}">保存</button>` : ''}
          <button class="btn btn-sm" data-action="act-load" data-slot="${key}" ${data && data.player && !data.meta.dead ? '' : 'disabled'}>读取</button>
          ${data && data.player ? `<button class="btn btn-sm btn-danger" data-action="act-delete-save" data-slot="${key}">删除</button>` : ''}
        </div></div>`;
    }).join('');
    return `<div class="start-slots">${cards}</div>
      <div class="save-io">
        <button class="btn btn-sm" data-action="save-export">导出文本码</button>
        <button class="btn btn-sm" data-action="save-import">导入文本码</button>
      </div>
      <div class="tip-line" style="margin-top:6px">· 自动存档随每次行动实时更新；手动保存可覆盖三个存档位。<br>· 文本码含成就与图鉴，复制给其他设备即可续缘（导出为当前进度）。<br>· 冲击大境界前会自动备份至隐秘槽位，渡劫失利可回溯因果。</div>`;
  },
  async saveModal() {
    await this.popup({
      title: '存档 / 读档',
      html: this.saveBody(),
      options: [{ text: '关 闭', value: true, primary: true }],
    });
  },
  refreshSaveBody() {
    if (!this.el['popup-modal'].classList.contains('hidden')) this.el['popup-body'].innerHTML = this.saveBody();
  },

  /* ---------- v6：成就 · 图鉴弹窗 ---------- */
  _achvTab: 'achv',
  achvModal() {
    this._achvTab = 'achv';
    this.popup({ title: '成就 · 图鉴', html: this.achvBody(), options: [{ text: '关 闭', value: true, primary: true }] });
  },
  achvBody() {
    const got = Meta.data.achv;
    const tabs = `<div class="codex-tabs">
      <button class="bag-tab ${this._achvTab === 'achv' ? 'active' : ''}" data-action="codex-tab" data-t="achv">✦ 成就 ${Object.keys(got).length}/${Achieve.DEFS.length}</button>
      <button class="bag-tab ${this._achvTab === 'codex' ? 'active' : ''}" data-action="codex-tab" data-t="codex">✦ 图鉴 ${Codex.got()}/${Codex.total()}</button>
    </div>`;
    let body = '';
    if (this._achvTab === 'achv') {
      for (const [cat, label] of Object.entries(Achieve.CATS)) {
        const defs = Achieve.DEFS.filter(d => d.cat === cat);
        const rows = defs.map(d => {
          const on = !!got[d.id];
          const prog = (!on && d.prog) ? ` <span style="color:var(--text-faint)">${d.prog(Game.player)}</span>` : '';
          return `<div class="achv-row ${on ? 'on' : 'off'}">
            <div class="achv-main"><span class="achv-name">${on ? '✦' : '◇'} ${d.name}</span>${prog}
              <div class="achv-desc">${d.desc}</div></div>
            <div class="achv-reward">${on ? '<span style="color:var(--ok)">已达成</span>' : Achieve.rewardText(d.reward)}</div>
          </div>`;
        }).join('');
        const gotN = defs.filter(d => got[d.id]).length;
        body += `<div class="shop-section-title">◈ ${label} · ${gotN}/${defs.length}</div>${rows}`;
      }
    } else {
      const cats = [['gongfa', '功法典籍'], ['artifact', '法宝神兵'], ['monster', '妖兽图录'], ['npc', '江湖奇人'], ['realm', '秘境洞天']];
      for (const [cat, label] of cats) {
        const ids = Codex.catalog(cat);
        const rows = ids.map(id => {
          const on = !!Meta.data.codex[cat][id];
          const it = GameData.ITEMS[id];
          const rawName = on ? Codex.nameOf(cat, id) : '？？？';
          const grade = it ? (it.grade ?? it.tier ?? null) : null;
          const nameHtml = on && grade != null ? this.gradeSpan(rawName, grade) : rawName;
          return `<div class="achv-row ${on ? 'on' : 'off'}">
            <div class="achv-main"><span class="achv-name">${nameHtml}</span>
              <div class="achv-desc">${on ? Codex.introOf(cat, id) : '尚未遇见'}</div></div>
          </div>`;
        }).join('');
        const gotN = ids.filter(id => Meta.data.codex[cat][id]).length;
        body += `<div class="shop-section-title">◈ ${label} · ${gotN}/${ids.length}</div>${rows}`;
      }
    }
    return `${tabs}<div class="codex-list">${body}</div>`;
  },

  /* ---------- v6：存档导出 / 导入（文本码） ---------- */
  async exportSave() {
    if (!Game.player) { UI.toast('当前没有进行中的存档'); return; }
    const payload = { v: 1, player: Game.player, ext: Meta.data };
    let code = '';
    try { code = btoa(unescape(encodeURIComponent(JSON.stringify(payload)))); } catch (e) { UI.toast('导出失败', true); return; }
    await this.popup({
      title: '导出存档',
      html: `整段复制以下文本码，到其他设备「导入文本码」即可续缘。<br><textarea class="save-code" readonly onclick="this.select()">${code}</textarea>`,
      options: [{ text: '关 闭', value: true, primary: true }],
    });
  },
  async importSave() {
    const ok = await this.popup({
      title: '导入存档',
      html: `粘贴存档文本码：<br><textarea class="save-code" id="import-code" placeholder="在此粘贴……"></textarea>
        <div class="tip-line">导入只会写入所选存档位，不影响当前进行中的进度。</div>`,
      options: [{ text: '下一步', value: true, primary: true }, { text: '取消', value: false }],
    });
    if (!ok) return;
    let data = null;
    try {
      const raw = document.getElementById('import-code').value.trim();
      data = JSON.parse(decodeURIComponent(escape(atob(raw))));
    } catch (e) { data = null; }
    if (!data || data.v !== 1 || !data.player || !data.player.name) { UI.toast('文本码无法识别', true); return; }
    const p = PlayerFactory.migrate(data.player);
    const slots = [1, 2, 3].map(k => {
      const d = Save.read(k);
      return `· 存档位${['一', '二', '三'][k - 1]}：${d && d.player ? `${Utils.esc(d.meta.name)}（将覆盖）` : '空'}`;
    }).join('<br>');
    const slot = await this.popup({
      title: '导入至哪个存档位？',
      html: `将导入 <b>${Utils.esc(p.name)}</b>（${GameData.REALM_NAMES[p.realmIdx]}期）：<br>${slots}`,
      options: [{ text: '存至位一', value: 1 }, { text: '存至位二', value: 2 }, { text: '存至位三', value: 3 }, { text: '取消', value: false }],
    });
    if (!slot) return;
    Save.write(slot, p);
    Meta.importTo(slot, data.ext);
    UI.toast(`已导入至存档位${['一', '二', '三'][slot - 1]}`);
    UI.refreshSaveBody();
  },

  /* ---------- Toast / 存档指示 ---------- */
  toast(text, err = false) {
    const div = document.createElement('div');
    div.className = 'toast-item' + (err ? ' err' : '');
    div.textContent = text;
    this.el['toast'].appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity .4s'; }, 1600);
    setTimeout(() => div.remove(), 2100);
  },
  /** v4：关键事件居中淡入公告（境界突破 / 稀有物品 / 战斗胜负），2 秒后自动消散 */
  announce(text, kind = 'gold') {
    let wrap = document.getElementById('announce');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'announce';
      document.getElementById('app').appendChild(wrap);
    }
    const div = document.createElement('div');
    div.className = 'announce-item' + (kind === 'gold' ? '' : ' ' + kind);
    div.textContent = text;
    wrap.appendChild(div);
    // 同时最多 3 条，旧的立即让位
    while (wrap.children.length > 3) wrap.removeChild(wrap.firstChild);
    setTimeout(() => div.classList.add('out'), 1500);
    setTimeout(() => div.remove(), 2050);
  },
  /** v5：hex → rgba（异象光晕用） */
  aura(color, a) {
    const n = parseInt(String(color).replace('#', ''), 16) || 0xffffff;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  },
  /** v5：境界突破演出——全屏对应色系微光闪过 + 古风描写渐显（约 3 秒，不挡操作） */
  realmShow(text, color) {
    const app = document.getElementById('app');
    let flash = document.getElementById('realm-flash');
    let show = document.getElementById('realm-show');
    if (!flash) { flash = document.createElement('div'); flash.id = 'realm-flash'; app.appendChild(flash); }
    if (!show) {
      show = document.createElement('div');
      show.id = 'realm-show';
      show.innerHTML = '<div class="rs-text"></div>';
      app.appendChild(show);
    }
    flash.style.setProperty('--aura-soft', this.aura(color, 0.5));
    show.style.setProperty('--aura', color);
    show.style.setProperty('--aura-soft', this.aura(color, 0.55));
    show.querySelector('.rs-text').textContent = text;
    flash.classList.remove('go');
    show.classList.remove('go');
    void flash.offsetWidth;   // 重启动画
    flash.classList.add('go');
    show.classList.add('go');
    clearTimeout(this._realmTimer);
    this._realmTimer = setTimeout(() => { flash.classList.remove('go'); show.classList.remove('go'); }, 3500);
  },
  saveFlash() {
    const dot = document.querySelector('.save-dot');
    if (!dot) return;
    dot.style.background = '#fff';
    setTimeout(() => { dot.style.background = ''; }, 180);
  },
};
