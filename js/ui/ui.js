
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

  /* ---------- 顶部信息（v27：三组式布局——身份资历｜家资｜战力岁月，层次一眼可读） ---------- */
  renderTop() {
    const p = Game.player;
    const st = Stat.compute(p);
    // v21：顶栏资源条——灵石三档 + 战力 + 主线章程，全局常驻一眼可读
    const stone = (nk, v) => `<span class="num-anim" data-nk="${nk}" data-fmt="fmt" data-nv="${v}">${Utils.fmtNum(v)}</span>`;
    const stoneChip = `<span class="res-chip res-stone" title="灵石 · 下品 / 中品 / 上品"><i class="rc-ico">◈</i>${stone('stones.low', p.stones.low)}`
      + (p.stones.mid ? ` <i>·</i> ${stone('stones.mid', p.stones.mid)}` : '')
      + (p.stones.high ? ` <i>·</i> ${stone('stones.high', p.stones.high)}` : '') + `</span>`;
    const chIdx = QuestSys.currentChapterIdx(p);
    const chapter = `<span class="res-chip res-chapter" title="主线进度 · 问道十章"><i class="rc-ico">卷</i>${chIdx + 1} / ${QuestSys.CHAPTERS.length} 章</span>`;
    const needTop = GameData.layerNeed(p.realmIdx, p.layer);
    // v23 移动端迷你条：抽屉收起也能一眼看血线/修为（桌面隐藏）
    const miniBars = `<span class="m-mini-bars" title="气血 / 修为">
      <span class="mini-bar hp"><i style="width:${Utils.clamp(p.hp / st.maxHp * 100, 0, 100)}%"></i></span>
      <span class="mini-bar exp"><i style="width:${Utils.clamp(p.exp / needTop * 100, 0, 100)}%"></i></span></span>`;
    // v27：声望徽记——声望自此真实参与悬赏赏格与买价，值得常驻一栏
    const repLv = (typeof RepSys !== 'undefined' && RepSys.level) ? RepSys.level(p) : null;
    const repChip = `<span class="res-chip res-rep" title="江湖声望：影响悬赏赏格与坊市买价">誉 ${p.reputation || 0}<i class="rc-sub">${repLv ? repLv.name : ''}</i></span>`;
    this.setHTML(this.el['top-info'], `
      <span class="top-group top-id">${chapter}</span>
      <span class="top-group top-res">${stoneChip}${repChip}</span>
      ${miniBars}
      <span class="top-group top-vit"><span class="res-chip res-power" title="综合战力：攻防血速暴闪格加权">⚔ ${Utils.fmtNum(Stat.power(p))}</span><span class="top-meta">${Time.labelLong(p)}</span><span class="top-meta2">${Math.floor(p.age)}岁 / 寿元${st.lifespan}</span></span>
      <span class="top-meta2"><span class="save-dot"></span>已自动存档</span>`);
  },

  /* ---------- 左侧状态面板（v14：身份卡 → 核心条 → 属性网格 → 道行状态 → 建议） ---------- */
  renderStatus() {
    const p = Game.player;
    const st = Stat.compute(p);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const poisonCap = Stat.poisonCap(p);   // v20：上限单源化
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
        <div class="id-line"><span>大道 <b class="hl">${DaoSys.name(p)}</b></span><span>寿元 <b>${Math.floor(p.age)} / ${st.lifespan}</b></span></div>
      </div>`;
    // v14 核心条：色点标题 + 大数值，进度一眼可读
    const coreBar = (label, cls, nk, val, max, maxText, fmt) => `
      <div class="core-stat-head">
        <span class="cs-name ${cls}">${label}</span>
        <span class="cs-val">${fmt ? `<span class="num-anim" data-nk="${nk}" data-fmt="fmt" data-nv="${val}">${Utils.fmtNum(val)}</span>` : `<span class="num-anim" data-nk="${nk}" data-nv="${val}">${Math.round(val)}</span>`} <span class="cs-max">/ ${maxText}</span></span>
      </div>
      <div class="bar" title="${label} ${Math.round(val)} / ${max}"><div class="bar-fill ${cls}${cls === 'hp' && val / max <= 0.3 ? ' low' : ''}" style="width:${Utils.clamp(val / max * 100, 0, 100)}%"></div><span class="bar-text${val <= 0 ? ' dim' : ''}">${Math.round(val / max * 100)}%</span></div>`;
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
      <div class="bar" title="丹毒 ${Math.round(p.poison)} / ${poisonCap}"><div class="bar-fill poison" style="width:${Utils.clamp(p.poison / poisonCap * 100, 0, 100)}%"></div><span class="bar-text${p.poison <= 0 ? ' dim' : ''}">${Math.round(p.poison / poisonCap * 100)}%</span></div>`;
    this.setHTML(this.el['panel-left'], `
      <div class="panel-title">✦ 道途</div>
      ${idCard}
      ${p.sect ? `<div class="stat-line"><span>宗门</span><b class="hl">${(GameData.SECTS.find(s => s.id === p.sect.id) || {}).name || '——'}${p.sect.faction && GameData.SECT_FACTIONS.find(f => f.id === p.sect.faction) ? ' · ' + GameData.SECT_FACTIONS.find(f => f.id === p.sect.faction).name : ''}</b></div>
        <div class="stat-line"><span>贡献</span><b><span class="num-anim" data-nk="contrib" data-nv="${p.sect.contrib}">${p.sect.contrib}</span></b></div>` : ''}
      <div class="sec-title">核心属性</div>
      ${coreBar('气血', 'hp', 'hp', p.hp, st.maxHp, st.maxHp, false)}
      ${coreBar('灵力', 'mp', 'mp', p.mp, st.maxMp, st.maxMp, false)}
      ${coreBar('修为', 'exp', 'exp', p.exp, need, Utils.fmtNum(need), true)}
      <div class="attr-mini">
        <span>根骨 <b>${p.attrs.gen}</b></span><span>悟性 <b>${p.attrs.comp}</b></span><span>福缘 <b>${p.attrs.luck}</b></span><span>体魄 <b>${p.attrs.body}</b></span>
      </div>
      <div class="stat-grid">
        <div class="stat-line"><span>攻击</span><b class="stat-detail" data-stat="atk" title="点击查看构成" style="cursor:pointer">${st.atk} 🔍</b></div>
        <div class="stat-line"><span>防御</span><b class="stat-detail" data-stat="def" title="点击查看构成" style="cursor:pointer">${st.def} 🔍</b></div>
        <div class="stat-line"><span>身法</span><b class="stat-detail" data-stat="speed" title="点击查看构成" style="cursor:pointer">${st.speed} 🔍</b></div>
        <div class="stat-line"><span>暴击</span><b class="stat-detail" data-stat="crit" title="点击查看构成" style="cursor:pointer">${st.crit.toFixed(0)}% 🔍</b></div>
        <div class="stat-line"><span>闪避</span><b class="stat-detail" data-stat="dodge" title="点击查看构成" style="cursor:pointer">${st.dodge.toFixed(0)}% 🔍</b></div>
        <div class="stat-line"><span>格挡</span><b class="stat-detail" data-stat="block" title="点击查看构成" style="cursor:pointer">${st.block.toFixed(0)}% 🔍</b></div>
        <div class="stat-line"><span>气血构成</span><b class="stat-detail" data-stat="maxHp" title="点击查看构成" style="cursor:pointer">🔍 明细</b></div>
        <div class="stat-line"><span>战力</span><b class="hl" title="综合战力：攻防血速暴闪格加权">⚔ ${Utils.fmtNum(Stat.power(p))}</b></div>
      </div>
      <div class="sec-title">道行状态</div>
      ${chipsHtml}
      ${DaoxinSys.statusHtml(p)}
      <div class="guide-box">
        <div class="guide-title">✦ 当前建议</div>
        ${Guide.tips(p).map(t => `<div class="guide-tip"><span class="guide-tip-text">· ${t.text}</span>${t.go ? `<button class="btn btn-sm guide-go" data-action="act-tab" data-tab="${t.go}">前往 ›</button>` : ''}</div>`).join('')}
      </div>
      <details class="fold" open><summary>装备法宝</summary>${eqHtml}${setHtml}</details>
      ${GameData.REALM_TRAITS[p.realmIdx] ? `<details class="fold"><summary>境界特性 · ${GameData.REALM_TRAITS[p.realmIdx].name}</summary>
      <div class="tip-line" style="margin:0 0 4px">· ${GameData.REALM_TRAITS[p.realmIdx].desc}</div></details>` : ''}
      ${p.dao ? DaoSys.statusHtml(p) : ''}
      ${p.reinc ? `<div class="stat-line"><span>前世</span><b class="hl">第${p.reinc.lives}世 · 印记${p.reinc.marks || 0}（全属性+${p.reinc.marks || 0}%）</b></div>` : ''}
    `);
  },

  /* ---------- v14 行动横幅：进游戏第一眼看到"现在该做什么" ----------
   * 主卡（墨底金字）：主线目标优先；无主线时"里程碑行动"（冲关/飞升/择道/斩三尸/合成）顶上。
   * 副卡（朱砂实底）：紧急提醒（气血/丹毒/可结案等）。
   * v26：主线卡带「目标 x/y · 进度」与目的地副行——点「前往」之前就知道去哪、差多少。 */
  renderFocus() {
    const p = Game.player;
    if (!p) return;
    const st = Stat.compute(p);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const cap = Stat.poisonCap(p);   // v20：上限单源化
    // 紧急提醒（major：够格顶替主行动的里程碑）
    let alert = null;
    if (p.layer === 3 && p.exp >= need && p.realmIdx < 9) alert = { text: '修为圆满，可冲击瓶颈', go: 'cultivate', major: true };
    else if (p.realmIdx === 9 && p.layer === 3 && p.exp >= need && !p.flags.ascended) alert = { text: '真仙圆满，可白日飞升', go: 'cultivate', major: true };
    else if (p.realmIdx >= 1 && !p.dao) alert = { text: '大道未定，宜叩问大道', go: 'cultivate', major: true };
    else if ((p.counters.gupianGot || 0) >= 9 && !p.bag.z_benming && !Object.values(p.equipped).some(e => e && Utils.eqId(e) === 'z_benming')) alert = { text: '九枚碎片集齐，可合成本命法宝', go: 'map:realm', major: true };
    else if ((p.karma || 0) >= 100) alert = { text: '孽障缠身，可斩三尸', go: 'cultivate', major: true };
    else if (QuestSys.SIDES.some(sd => !(p.quest || {}).side[sd.id] && p.realmIdx >= sd.minRealm && sd.steps.every(x => QuestSys.stepDone(x, p)))) alert = { text: '有支线奇遇可结案领赏', go: 'quest' };
    else if (p.poison > cap * 0.75) alert = { text: '丹毒将满，宜服解毒丹', go: 'cultivate' };
    else if (p.hp < st.maxHp * 0.3) alert = { text: '气血衰微，宜调息服丹', go: 'cultivate' };

    const mf = QuestSys.focus();
    const destOf = go => QuestSys.destLabel(String(go));
    const parts = [];
    const main = mf ? {
      label: '主 线', title: mf.title,
      sub: `目标 ${mf.stepIdx}/${mf.stepTotal} · ${mf.text}${mf.prog ? `（${mf.prog}）` : ''}`,
      dest: destOf(mf.go), go: mf.go, anchor: mf.anchor || '',
    } : (alert && alert.major ? { label: '当前要务', title: alert.text, sub: '道途紧要关头，一念定进退', dest: destOf(alert.go), go: alert.go, anchor: '' } : null);
    if (main) {
      parts.push(`<div class="focus-main">
        <span class="focus-label">${main.label}</span>
        <div class="focus-body">
          <div class="focus-title">${Utils.esc(main.title)}</div>
          <div class="focus-sub">${Utils.esc(main.sub)}</div>
          ${main.dest ? `<div class="focus-dest">前往 · ${Utils.esc(main.dest)}</div>` : ''}
        </div>
        <button class="focus-go" data-action="quest-goto" data-tab="${main.go}" ${main.anchor ? `data-anchor="${Utils.esc(main.anchor)}"` : ''} title="直达 · ${Utils.esc(main.dest || '')}">前 往</button>
      </div>`);
    }
    // 副提醒：与主卡不同源才显示（主线在挂时提醒事项照常展示）
    const alertAsMain = !mf && alert && alert.major;
    if (alert && !alertAsMain) {
      const aDest = destOf(alert.go);
      parts.push(`<div class="focus-alert">
        <span class="focus-label">提醒</span>
        <span class="focus-title">${Utils.esc(alert.text)}${aDest ? `<span class="focus-dest">前往 · ${Utils.esc(aDest)}</span>` : ''}</span>
        <button class="focus-go" data-action="act-tab" data-tab="${alert.go}" title="直达 · ${Utils.esc(aDest)}">前往</button>
      </div>`);
    }
    this.setHTML(this.el['focus-strip'], parts.join(''));
    this.el['focus-strip'].classList.toggle('hidden', !parts.length);
  },

  /* ---------- v24 红点统一源：页签/子页签红点全部收敛到单一计算，各处只读不各算各的 ---------- */
  dots() {
    const p = Game.player;
    if (!p) return {};
    const today = Math.floor(p.day || 0);
    const need = GameData.layerNeed(p.realmIdx, p.layer);
    const ripe = ((p.cave && p.cave.plots) || []).some(pl => pl && pl.seed && (today - (pl.plantedDay || 0)) >= (pl.days || 0));
    const tripBack = (p.beasts && p.beasts.list || []).some(b => b.trip && today >= b.trip.until);
    const bountyOk = (p.bounties && p.bounties.list || []).some(bt => bt && bt.progress >= bt.need);
    const gupianOk = (p.counters.gupianGot || 0) >= 9 || (p.bag['m_gupian'] || 0) >= 9;
    const oddHot = (typeof BlackSys !== 'undefined' && BlackSys.isOpen(p))
      || (typeof AuctionSys !== 'undefined' && (() => { const lot = AuctionSys.state(p); return lot.until - today > 0 && lot.until - today <= 10; })());
    const sectTasksOk = !!p.sect && (p.sect.tasks || []).some(t => t && t.progress >= t.need);
    const tourneyOn = !!(p.sect && p.sect.tourney);   // 大比进行中（tourneyCheck 开赛才写入）
    return {
      cultivate: (p.layer === 3 && p.exp >= need && p.realmIdx < 9)
        || (p.realmIdx === 9 && p.layer === 3 && p.exp >= need && !p.flags.ascended)
        || !!p.canReincarnate,
      quest: (typeof QuestSys !== 'undefined') ? QuestSys.sideClaimable(p) : false,
      cave: ripe || tripBack,
      'cave:farm': ripe,
      'cave:beast': tripBack,
      map: !!(p.world && p.world.pending) || gupianOk,
      'map:realm': gupianOk,
      'map:tower': !!(p.tower && p.tower.run),   // v25：登塔中途离开，红点提示可续
      jianghu: NpcSys.grudgeCount(p) > 0 || (typeof PersonalSys !== 'undefined' && PersonalSys.anyAvailable(p)),
      shop: bountyOk || oddHot,
      'shop:bounty': bountyOk,
      'shop:odd': oddHot,
      sect: (!p.sect && p.realmIdx >= 1) || sectTasksOk || tourneyOn,
      gongfa: false,
    };
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
    const dots = this.dots();   // v24 红点统一源
    const htmls = tabs.map(t => {
      const dot = !!dots[t.id];
      const lock = Guide.tabLocked(t.id);   // v6：分步解锁
      // v25 移动端：锁定页签只渲染锁形不渲染文字——底部导航 320px 也不再被撑爆
      return `<button class="tab-btn ${Game.activeTab === t.id ? 'active' : ''} ${lock ? 'locked' : ''}" data-action="act-tab" data-tab="${t.id}" ${lock ? `title="${lock}"` : ''}>${lock ? '🔒' : `<i class="tab-name">${t.name}</i>`}${dot ? '<span class="dot"></span>' : ''}</button>`;
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

  /* ---------- v22 页签内子页签（信息架构归一：大页签拆分栏，深链写法 tab:sub） ---------- */
  SUBTABS: {
    shop: [
      { id: 'market', name: '万宝阁' }, { id: 'craft', name: '炼制坊' }, { id: 'forge', name: '祭炼堂' },
      { id: 'bounty', name: '悬赏板' }, { id: 'odd', name: '奇 市' },
    ],
    cave: [
      { id: 'home', name: '洞府' }, { id: 'farm', name: '灵田' }, { id: 'beast', name: '灵兽' },
    ],
    map: [
      { id: 'atlas', name: '舆 图' }, { id: 'realm', name: '秘 境' }, { id: 'world', name: '天 下' },
      { id: 'tower', name: '天 塔' },
    ],
  },
  /** 当前页签生效的子页签（无记忆或记忆已失效时回落到首栏） */
  subOf(tab) {
    const list = this.SUBTABS[tab];
    if (!list) return null;
    const cur = Game.subTab[tab];
    return list.some(s => s.id === cur) ? cur : list[0].id;
  },
  renderSubTabs(tab, cur) {
    const list = this.SUBTABS[tab];
    if (!list) return '';
    const dots = this.dots();   // v24 子页签同样吃统一红点源
    return `<nav class="subtabs">${list.map(s =>
      `<button class="subtab-btn ${s.id === cur ? 'active' : ''}" data-action="act-tab" data-tab="${tab}:${s.id}">${s.name}${dots[`${tab}:${s.id}`] ? '<span class="dot"></span>' : ''}</button>`).join('')}</nav>`;
  },

  renderTabContent() {
    const sub = this.subOf(Game.activeTab);
    const fn = {
      cultivate: () => this.renderCultivateTab(),
      quest: () => QuestSys.renderTab(),
      cave: () => this.renderCaveTab(sub),
      map: () => this.renderMapTab(sub),
      jianghu: () => this.renderNpcTab(),
      shop: () => this.renderShopTab(sub),
      sect: () => this.renderSectTab(),
      gongfa: () => this.renderGongfaTab(),
    }[Game.activeTab];
    // v21：宽屏双列栅格——独立卡片构成的页签并排铺满，消灭大片留白
    // （问道页自带主线+详情双栏结构，不适用外层栅格；v22 洞府改子页签后不再栅格）
    this.el['tab-content'].classList.toggle('grid2', Game.activeTab === 'cultivate');
    this.setHTML(this.el['tab-content'], this.renderSubTabs(Game.activeTab, sub) + (fn ? fn() : ''));
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
    // v21：仙途十境一览——来路与前程一图可读
    const rpNode = (r) => {
      const state = p.realmIdx > r ? 'done' : (p.realmIdx === r ? 'cur' : '');
      const layer = p.realmIdx > r ? '圆满' : (p.realmIdx === r ? GameData.LAYER_NAMES[p.layer] : '');
      return `<div class="rp-node ${state}" title="${GameData.REALM_NAMES[r]}${layer ? ' · ' + layer : ''}">
        <span class="rp-dot" style="${p.realmIdx === r ? `--rp-c:${GameData.REALM_AURA[r] || '#c9a86a'}` : ''}"></span>
        <span class="rp-name">${GameData.REALM_NAMES[r]}</span>
        <span class="rp-layer">${layer}</span>
      </div>`;
    };
    const rpTrack = Array.from({ length: 10 }, (_, r) => rpNode(r))
      .join('<span class="rp-line"></span>');
    // v25：仙途条横向滚动容器——渲染后自动把当前境界滚进视野（窄屏十境不再溢出裁切）
    setTimeout(() => {
      const cur = document.querySelector('#tab-content .rp-node.cur');
      cur?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }, 60);
    return `
      <div class="card span2 realm-path-card">
        <div class="card-title">✦ 仙途 <span style="font-size:12px;color:var(--text-dim)">十境三十六层 · 步步登天</span></div>
        <div class="rp-scroll"><div class="rp-track">${rpTrack}</div></div>
      </div>
      <div class="card card-main">
        <div class="card-title">✦ 修行 <span style="font-size:12px;color:var(--text-dim)">当前层尚需修为 ${Utils.fmtNum(Math.max(0, need - p.exp))}${est > 0 && need > p.exp ? ` · 约需 ${Math.max(1, Math.ceil((need - p.exp) / est * 3))} 日` : ''}</span></div>
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
      </div>${this.renderDailyCard()}${extra}`;
  },

  /* ---------- v21 今日修行聚合卡：日常仪式一卡总览，一键直达 ---------- */
  renderDailyCard() {
    const p = Game.player;
    const today = Math.floor(p.day || 0);
    const rows = [];
    const signed = p.signDay === today;
    // v24 求签行内直签——无需再绕道游历·天下
    rows.push({ state: signed ? 'ok' : 'todo', label: '黄历求签', stat: signed ? `已签 · ${p.signText || ''}` : '今日未求签', act: signed ? '' : 'act-sign', actText: '摇 签' });
    const rush = p.rushDay === today;
    rows.push({ state: rush ? 'ok' : 'todo', label: '聚灵加速', stat: rush ? '已点燃 · 修炼 ×1.5' : '阵未点燃', go: p.cave ? 'cave:home' : '' });
    const plots = (p.cave && p.cave.plots) || [];
    const ripe = plots.filter(pl => pl && pl.seed && (today - (pl.plantedDay || 0)) >= (pl.days || 0)).length;
    const growing = plots.filter(pl => pl && pl.seed).length;
    rows.push({ state: ripe > 0 ? 'warn' : (growing > 0 ? 'ok' : 'todo'), label: '灵田', stat: plots.length ? (ripe > 0 ? `${ripe} 块已熟宜采收` : `${growing} 块生长中`) : '今日未播种', go: p.cave ? 'cave:farm' : '' });
    const bl = (p.bounties && p.bounties.list) || [];
    const claimable = bl.filter(bt => bt && bt.progress >= bt.need).length;   // v21: 领后置空条目判空
    rows.push({ state: claimable > 0 ? 'warn' : (bl.length ? 'ok' : 'todo'), label: '悬赏板', stat: claimable > 0 ? `${claimable} 张可领赏` : (bl.length ? '进行中' : '未接悬赏'), go: 'shop:bounty' });
    const fest = FestivalSys.today(p);
    if (fest) rows.push({ state: 'warn', label: '节庆', stat: `${fest.name} · 只此一日`, go: 'map:world' });
    const done = rows.filter(r => r.state === 'ok').length;
    return `
      <div class="card daily-card">
        <div class="card-title">✦ 今日修行 <span class="daily-count">${done} / ${rows.length} 事</span>
          <button class="btn btn-sm" data-action="act-daily-all" style="margin-left:auto" title="求签、聚灵、采收、领赏一次办完">⚡ 一键行权</button></div>
        ${rows.map(r => `
          <div class="daily-row ${r.state}">
            <span class="daily-dot"></span>
            <span class="daily-label">${r.label}</span>
            <span class="daily-stat">${r.stat}</span>
            ${r.act ? `<button class="btn btn-sm btn-primary guide-go" data-action="${r.act}">${r.actText}</button>` : ''}
            ${!r.act && r.go ? `<button class="btn btn-sm guide-go" data-action="act-tab" data-tab="${r.go}">前往 ›</button>` : ''}
          </div>`).join('')}
        <div class="tip-line">· 日常诸事不强制——但积少成多，皆是道途资粮。</div>
      </div>`;
  },

  /* ---------- v13 洞府页签（v22 拆三：洞府主楼 / 灵田 / 灵兽） ---------- */
  renderCaveTab(sub) {
    const p = Game.player;
    if (!CaveSys.unlocked(p)) {
      return `<div class="card"><div class="card-title">✦ 洞府</div>
        <div class="card-desc">洞府乃修士安身立命之所——聚灵阵助修行、灵田可种药、兽栏能养灵兽。<br>然开辟洞府耗费甚巨，须至<b>筑基期</b>方可为之。</div></div>`;
    }
    if (!p.cave) p.cave = CaveSys.freshCave();
    // v24：访客/虫害/灵泉三项每日结算已迁往 Game.afterAction——渲染恢复纯函数
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
    const today = Math.floor(p.day || 0);
    const beastRows = beasts.map(b => {
      const isOn = p.beasts.active === b.uid;
      const isOn2 = p.beasts.active2 === b.uid;
      const pk = BeastSys.PASSIVE[b.species] || 'atkPct';
      // v26 修瑕：展示值与 BeastSys.passive 口径对齐（蜕变 ×1.4 此前漏算，面板低于实际）
      const pv = Math.round((b.power * 0.6 + b.level * 0.8) * (b.evolved ? 1.4 : 1));
      const needExp = b.level * 400;
      const bTag = isOn ? '<span class="tag safe">出战中</span>' : isOn2 ? '<span class="tag warn">护持中</span>' : b.trip ? '<span class="tag magic">寻宝途中</span>' : '<span class="tag">栏中</span>';
      const tripTxt = b.trip
        ? (today >= b.trip.until
          ? `<div class="gf-actions"><button class="btn btn-sm btn-primary" data-action="act-beast-trip-claim" data-uid="${b.uid}">归来（已带回灵材）</button></div>`
          : ` ｜ <span class="tag">寻宝归期：${b.trip.until - today} 日后</span>`)
        : '';
      const skillsTxt = (b.skills && b.skills.length) ? b.skills.map(s => s.name).join('、') : '五阶习得天生技（十阶开第二栏）';
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name"><b class="${isOn || isOn2 ? 'hl' : ''}">${b.evolved ? '✦ ' : ''}${b.name}</b> ${bTag} <span class="tag">${b.level} 阶</span>${b.evolved ? '<span class="tag warn">已蜕变</span>' : ''}${b.bond ? `<span class="tag">亲昵 ${b.bond}/100</span>` : ''}</div>
          <div class="gf-desc">${b.species === 'beast' ? '凶兽' : b.species === 'snake' ? '灵蛇' : b.species === 'swarm' ? '虫群' : b.species === 'plant' ? '草木精' : '灵体'} · 协战与被动随阶成长<br>
          被动：${passiveName[pk]} +${pv}${isOn2 ? '（护持中以五成效力生效）' : ''} ｜ 经验 ${Math.floor(b.exp)}/${needExp} ｜ 技能：${skillsTxt}${tripTxt}</div>
        </div>
        <div class="gf-actions">
          <button class="btn btn-sm" data-action="act-beast-active" data-uid="${b.uid}">${isOn ? '歇 息' : '出 战'}</button>
          <button class="btn btn-sm" data-action="act-beast-active2" data-uid="${b.uid}">${isOn2 ? '归 栏' : '护 持'}</button>
          <button class="btn btn-sm" data-action="act-beast-feed" data-uid="${b.uid}" ${Bag.count('m_neidan') ? '' : 'disabled'}>喂内丹（${Bag.count('m_neidan')}）</button>
          ${!b.evolved && b.level >= 10 ? `<button class="btn btn-sm btn-primary" data-action="act-beast-evolve" data-uid="${b.uid}">蜕 变</button>` : ''}
          <details class="fold npc-more"><summary>照管 ▾</summary><div class="gf-actions" style="margin-top:6px">
            <button class="btn btn-sm" data-action="act-beast-pat" data-uid="${b.uid}">抚 摸</button>
            ${!b.trip ? `<button class="btn btn-sm" data-action="act-beast-dispatch" data-uid="${b.uid}" title="外出寻宝，数日后带回灵材">派 遣</button>` : ''}
            <button class="btn btn-sm btn-danger" data-action="act-beast-free" data-uid="${b.uid}">放归</button>
          </div></details>
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
      <div class="card-title">✦ 兽栏 <span class="tag">${beasts.length}/${BeastSys.maxSlots(p)} 位</span>
        <button class="btn btn-sm" data-action="act-arena" style="margin-left:auto" title="押注观战，胜得 1.8 倍彩头">⚔ 斗兽场</button></div>
      <div class="card-desc">战斗中将可驯妖兽打至<b>两成血以下</b>，可尝试驯服。出战灵兽每回合四成几率协助攻击，并给主人一项被动加成。喂食【妖兽内丹】可升阶；派遣外出可寻回灵材。</div>
      ${beastRows || '<div class="tip-line">兽栏空空——去荒野驯一头灵兽回来罢。</div>'}
    </div>`;
    // v22 子页签分发：洞府主楼（聚灵阵+营造）/ 灵田 / 灵兽（兽栏+斗兽场）
    const R = {
      home: () => caveCard + buildsCard,
      farm: () => plotsCard,
      beast: () => beastCard,
    };
    return (R[sub] || R.home)();
  },

  /* ---------- v22 游历拆三：舆图 / 秘境 / 天下 ---------- */
  renderMapTab(sub) {
    const p = Game.player;
    const R = {
      atlas: () => GameData.MAPS.map(m => {
        const diff = p.realmIdx < m.recRealm
          ? { cls: 'danger', text: `推荐${m.recText} · 境界不足，九死一生！` }
          : p.realmIdx === m.recRealm
            ? { cls: 'warn', text: `推荐${m.recText} · 势均力敌` }
            : { cls: 'safe', text: `推荐${m.recText} · 游刃有余` };
        const magic = WorldSys.isMagic(p, m.id) ? '<span class="tag magic">魔域</span>' : '';
        // v20 天时 / 深耕 / 兽潮标签
        const wx = Art.weatherOf(p, m.id);
        const deepN = (p.counters.mapExplores || {})[m.id] || 0;
        const deepTier = deepN >= 100 ? 3 : deepN >= 50 ? 2 : deepN >= 20 ? 1 : 0;
        const wxBits = [];
        if (wx.night) wxBits.push('夜战：敌攻+15% · 夜获');
        if (wx.sky === 'rain') wxBits.push('雨：雷系+20% · 灼烧-20%');
        if (wx.sky === 'fog') wxBits.push('雾：机缘↑ · 命中↓');
        if (WorldSys.beastWaveActive(p, m.id)) wxBits.push('兽潮：遇敌频密 · 猎获+30%');
        const wxLine = wxBits.length || deepTier > 0
          ? `<div class="tip-line">${deepTier > 0 ? `· 深耕${['一', '二', '三'][deepTier - 1]}重（探索 ${deepN} 次）　` : ''}${wxBits.length ? '· ' + wxBits.join('　·　') : ''}</div>`
          : '';
        return `
      <div class="card map-card">
        <div class="map-scene" title="天气：${{ rain: '雨', fog: '雾', clear: '晴' }[wx.sky] || '晴'}${wx.night ? ' · 夜' : ''}">${Art.scene(m.id, Art.seasonOf(p), wx)}</div>
        <div class="card-title">${m.name}${magic}<span class="tag ${diff.cls}">${diff.text}</span></div>
        <div class="card-desc">${m.desc}${magic ? '<br><span class="neg">魔气狂化：妖魔更强，所获亦丰。</span>' : ''}</div>
        ${wxLine}
        <div class="action-row">
          <button class="btn" data-action="act-explore" data-map="${m.id}">探索此地（2日）</button>
          <button class="btn" data-action="act-explore-multi" data-map="${m.id}" title="至多五次历练，遇战斗/剧情自动暂停">连续探索 ×5</button>
        </div>
      </div>`;
      }).join(''),
      realm: () => this.renderDungeonSection(),
      world: () => this.renderWorldCard() + this.renderSignCard(),
      tower: () => this.renderTowerSection(),
    };
    return (R[sub] || R.atlas)();
  },

  /* ---------- v25 登天塔 ---------- */
  renderTowerSection() {
    const p = Game.player;
    const t = TowerSys.state(p);
    const bestAll = (typeof Meta !== 'undefined' && Meta.data.towerBest) || 0;
    if (!TowerSys.unlockOk(p)) {
      return `<div class="card tower-card">
        <div class="card-title">✦ 登天塔</div>
        <div class="card-desc">城西那座通天石塔直插云霄，塔门紧闭——塔灵的声音隐隐传来：<b>「筑基之上，方可登临。」</b><br><span class="tip-line">· 突破至筑基期后，此塔每日可免费登临一次。</span></div>
      </div>`;
    }
    const run = t.run;
    const left = TowerSys.leftToday(p);
    const buffs = TowerSys.buffNames(p);
    const head = `
      <div class="card-title">✦ 登天塔
        <span class="tag">本档最佳 第 ${t.best} 层</span>
        ${bestAll > 0 ? `<span class="tag">跨世最佳 第 ${bestAll} 层</span>` : ''}
      </div>
      <div class="card-desc">塔影通天，每层踞一头「守影」。气血跨层延续，<b>每逢三层</b>塔心赠祝福（三选一），<b>每逢五层</b>开宝箱并回复三成气血。败北止步，性命无虞——已得层奖尽数入囊。</div>
      <div class="tip-line">· 今日剩余次数：<b>${left}</b>（免费 1 次/日${t.today.bought ? '，已加购 1 次' : ''}）</div>`;
    if (run) {
      return `<div class="card tower-card">
        ${head}
        <div class="tip-line">· 当前登至<b class="hl">第 ${run.floor} 层</b>${buffs.length ? `｜祝福 ${run.buffs.length} 道：${buffs.join('、')}` : ''}</div>
        <div class="action-row">
          <button class="btn btn-primary" data-action="act-tower-resume">继续登层</button>
          <button class="btn" data-action="act-tower-quit">收手离塔</button>
        </div>
      </div>`;
    }
    return `<div class="card tower-card">
      ${head}
      <div class="action-row">
        <button class="btn btn-primary btn-glow" data-action="act-tower-enter">挑战登天塔</button>
        ${left <= 0 ? `<button class="btn" data-action="act-tower-buy">灵石加购一次（${Utils.fmtNum(TowerSys.extraCost(p))}）</button>` : ''}
      </div>
    </div>`;
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
    if (WorldSys.lingchaoActive(p)) tags.push(`<span class="tag safe">灵潮涌动 · 修炼+20%（余 ${w.lingchaoUntil - y} 年）</span>`);   // v20
    for (const b of (w.beastMaps || [])) {   // v20
      if (y <= b.until) tags.push(`<span class="tag danger">兽潮：${(GameData.MAPS.find(m => m.id === b.map) || {}).name || '某地'}（余 ${b.until - y} 年）</span>`);
    }
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
    const fest = (typeof FestivalSys !== 'undefined') ? FestivalSys.today(p) : null;
    return `
    <div class="card sign-card">
      <div class="card-title">✦ 黄历 · 每日一签 <span class="tag">${Time.labelLong(p)}</span>${fest ? ` <span class="tag warn" title="${Utils.esc(fest.desc)}">✦ 今日 ${fest.name}</span>` : ''}</div>
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
      ${(() => {
        // v22 路径预览：灵觉所及，前方两层的岔口类型（预生成路线）
        const peek = (D.route || []).slice(D.depth + 1, D.depth + 3)
          .map((pair, i) => `第 ${D.depth + 2 + i} 层 ${pair.map(t => DungeonSys.nodeIcon(t)).join('/')}`);
        return peek.length ? `<div class="tip-line">· 灵觉所及：${peek.join('　·　')}${D.depth + 3 >= D.total ? '（更深处便是守关者）' : ''}</div>` : '';
      })()}
      ${D.gains && D.gains.length ? `<div class="tip-line">已掠得：${D.gains.slice(-5).join('；')}</div>` : ''}
      <div class="action-row"><button class="btn btn-danger" data-action="act-realm-retreat">携收获 · 撤离秘境</button></div>
      <div class="tip-line">当前气血 ${Math.round(p.hp)} / ${Stat.compute(p).maxHp} —— 陨落于秘境者，背包三成之物将永远留在其中。</div>
    </div>`;
  },

  /* ---------- §24 江湖人脉（v24：行内按钮主次分级 + 义声卡入驻；登顶日赏迁至 afterAction 结算） ---------- */
  renderNpcTab() {
    const p = Game.player;
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
      const sparTag = (s.sparWins || s.sparLoses) ? `<span class="tag">切磋 ${s.sparWins || 0}胜${s.sparLoses || 0}负</span>` : '';
      // v27：交情量表——-100~100 一条横杆，恩怨亲疏一眼可读
      const relPct = Utils.clamp((s.rel + 100) / 2, 0, 100);
      const relBar = `<span class="npc-rel" title="交情 ${s.rel > 0 ? '+' : ''}${s.rel}（-100 宿敌 ↔ +100 莫逆）"><i style="width:${relPct}%"></i></span>`;
      // v24 主次分级：主行只留高频四钮（结交/赠礼/论道/续谈），切磋结缘与恩怨抉择收进折叠
      let btns = '';
      let moreBtns = [];
      if (s.alive) {
        const main = [
          `<button class="btn btn-sm" data-action="npc-befriend" data-npc="${d.id}">结交（${Utils.fmtNum(NpcSys.befriendCost(p, d.id))}灵石）</button>`,
          s.met ? `<button class="btn btn-sm" data-action="npc-gift" data-npc="${d.id}">赠礼（${Utils.fmtNum(Math.round(30 * GameData.stoneEco(s.realmIdx)))}灵石）</button>` : '',
          s.met && s.rel >= 30 ? `<button class="btn btn-sm" data-action="npc-discuss" data-npc="${d.id}">论道</button>` : '',
          PersonalSys.next(p, d.id) ? `<button class="btn btn-sm btn-primary" data-action="npc-line" data-npc="${d.id}" title="${Utils.esc((GameData.PERSONAL[d.id].acts[(p.personal[d.id] || 0)] || {}).brief || '')}">续谈 · ${Utils.esc(GameData.PERSONAL[d.id].arc)}</button>` : '',
        ].filter(Boolean);
        moreBtns = [
          `<button class="btn btn-sm" data-action="npc-spar" data-npc="${d.id}">切磋</button>`,
          s.rel >= 70 && !(p.sworn || []).includes(d.id) ? `<button class="btn btn-sm" data-action="npc-swear" data-npc="${d.id}">结拜</button>` : '',
          s.rel >= 90 && !p.partner ? `<button class="btn btn-sm btn-primary" data-action="npc-dao" data-npc="${d.id}">结为道侣</button>` : '',
          NpcSys.canLearnFrom(p, d.id) ? `<button class="btn btn-sm btn-primary" data-action="npc-learnfrom" data-npc="${d.id}" title="三胜之后，请其倾囊相授">请其指点</button>` : '',
          s.grudge ? `<button class="btn btn-sm" data-action="npc-peace" data-npc="${d.id}">${s.pastLife ? '化解前世恩怨' : '化解仇怨'}</button>` : '',
          s.rel >= 15 && p.partner !== d.id ? `<button class="btn btn-sm btn-danger" data-action="npc-betray" data-npc="${d.id}">背刺夺宝</button>` : '',
          NpcSys.canShowdown(p, d.id) ? `<button class="btn btn-sm btn-danger" data-action="npc-showdown" data-npc="${d.id}" title="约战雷台，胜者夺其法宝，恩怨两清">⚡ 雷台了断</button>` : '',
        ].filter(Boolean);
        btns = main.join('')
          + (moreBtns.length ? ` <details class="fold npc-more"><summary>恩怨与机缘 ▾</summary><div class="gf-actions" style="margin-top:6px">${moreBtns.join('')}</div></details>` : '');
      } else {
        btns = '<span class="tag danger">已身故</span>';
      }
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name"><span style="display:inline-block;vertical-align:middle;width:34px;height:34px;border-radius:6px;overflow:hidden;margin-right:6px">${Art.portrait(Art.npcLook(d))}</span>${d.name} <span style="color:var(--text-faint);font-size:12px">${d.title} · ${d.temper}</span> <span class="tag ${relCls}">${lbl} ${s.rel > 0 ? '+' : ''}${s.rel}</span> ${sparTag} ${tags.join('')}</div>
          ${relBar}
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
      <div class="card-desc">修行界有二十四位常驻修士，随岁月自行修炼、游历地图、争夺机缘，境界与你所见的时光同步成长。<br>
      结交可成好友、结拜、道侣——你于战斗、渡劫的虚弱危急关头，他们有概率舍命相助；背刺夺宝收益翻倍，但气运暴跌、恩怨永结——宿敌会趁你历练、突破、渡劫时偷袭。</div>
      ${rel.length ? `<div class="card-tags"><span class="tag safe">${rel.join(' · ')}</span></div>` : ''}
      ${awayLine}
    </div>${RankSys.render(p)}${this.renderRepCard(p)}${rows}`;
  },

  /* ---------- v24 义声卡：布施行善自「奇市」迁入江湖——行善消业与江湖声望同卡归位 ---------- */
  renderRepCard(p) {
    const rep = (typeof RepSys !== 'undefined' && RepSys.level) ? RepSys.level(p) : null;
    const mul = (typeof RepSys !== 'undefined' && RepSys.priceMul) ? RepSys.priceMul(p) : 1;
    const bon = (typeof RepSys !== 'undefined' && RepSys.bountyBonus) ? RepSys.bountyBonus(p) : 1;
    const donateRows = (typeof DonateSys !== 'undefined' ? DonateSys.TIERS : []).map(t => {
      const stones = Math.round(t.stones * Math.max(1, Math.pow(2.2, Math.min(5, p.realmIdx) - 1) / 1));
      return `
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">${t.name}</div>
        <div class="gf-desc">声望 +${t.rep}，气运 +${t.fortune}，孽障 ${t.karma}。需灵石 ${Utils.fmtNum(stones)}。</div></div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-donate" data-d="${t.id}">行 善</button></div>
      </div>`;
    }).join('');
    return `
    <div class="card rep-card">
      <div class="card-title">✦ 义声 · 布施 <span class="tag ${rep && rep.color === 'neg' ? 'danger' : 'safe'}">${rep ? rep.name : '初露头角'} · 声望 ${p.reputation || 0}</span></div>
      <div class="card-desc">散财于世间疾苦，善名自远——声望高者，坊市买价有面子（当前买价 ×${mul}），悬赏赏格真实加成（×${bon}），门派差事与红尘善举亦能积誉；劣迹昭彰者处处吃闭门羹。</div>
      ${donateRows}
    </div>`;
  },

  /* ---------- v22 坊市拆五：万宝阁 / 炼制坊 / 祭炼堂 / 悬赏板 / 奇市（信息架构归一） ---------- */
  renderShopTab(sub) {
    const R = {
      market: () => this.shopMarket(),
      craft: () => this.shopCraft(),
      forge: () => this.shopForge(),
      bounty: () => this.shopBounty(),
      odd: () => this.shopOdd(),
    };
    return (R[sub] || R.market)();
  },

  shopMarket() {
    const p = Game.player;
    const st = Stat.compute(p);
    const stock = GameData.SHOP.filter(row => p.realmIdx >= row.minRealm);
    const group = (type, title, open = false) => {
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
            ${['pill', 'material', 'seed'].includes(def.type) ? `<button class="btn btn-sm" data-action="act-buy-multi" data-item="${r.item}" title="连买五件，灵石不足自动停">×5</button>` : ''}
          </div>
        </div>`;
      }).join('');
      const fk = 'shop-g-' + type;   // v24 开合记忆：行动重渲染后保持用户展开状态
      const isOpen = Game.foldState[fk] !== undefined ? Game.foldState[fk] : open;
      return `<details class="fold shop-group" data-fold="${fk}" ${isOpen ? 'open' : ''}><summary>◈ ${title}（${items.length} 种 ▾）</summary><div style="margin-top:6px">${rows}</div></details>`;
    };
    // v24 出售区折叠 + 按价值降序：买与卖不再 40+ 行平铺一页
    const sellable = Object.keys(p.bag)
      .filter(id => (GameData.ITEMS[id].price || 0) > 0)
      .sort((a, b) => ShopSys.sellPrice(b) * (p.bag[b] || 0) - ShopSys.sellPrice(a) * (p.bag[a] || 0));
    const sellTotal = sellable.reduce((sum, id) => sum + ShopSys.sellPrice(id) * (p.bag[id] || 0), 0);
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
    const sellFold = sellable.length ? `
      <details class="fold shop-sell-fold" data-fold="shop-sell" ${Game.foldState['shop-sell'] ? 'open' : ''}>
        <summary>◈ 出售物品（${sellable.length} 种 · 可售总值 <b class="hl">${Utils.fmtNum(sellTotal)}</b> 灵石 ▾）</summary>
        <div class="tip-line" style="margin:6px 0">· 四折回收${p.dao === 'pill' ? '，丹药另有五成加成' : ''}；全售需二次确认。凡品杂物可在乾坤袋「一键卖凡品」。</div>
        ${sellRows}
      </details>` : '<div class="tip-line">背包中暂无可售之物。</div>';
    return `
      <div class="card">
        <div class="card-title">✦ 万宝坊市 <span style="font-size:12px;color:var(--text-dim)">${st.shopDiscount ? '万宝商会 · 九二折 · ' : ''}${(typeof RepSys !== 'undefined' && RepSys.priceMul && RepSys.priceMul(p) !== 1) ? `声望买价 ×${RepSys.priceMul(p)} · ` : ''}距市集刷新 ${WorldSys.marketDaysLeft(p)} 日 · 当前灵石：${Bag.stonesText()}</span></div>
        <div class="tip-line" style="margin:0 0 6px">· 坊市每三十日换一茬新货，市价随手气起伏（±两成）。<span style="color:var(--danger)">涨</span>者宜缓买，<span style="color:var(--ok)">跌</span>者可趁低。</div>
        <div class="card-tags">
          <button class="btn btn-sm" data-action="act-convert" data-dir="up1">100下品 → 1中品</button>
          <button class="btn btn-sm" data-action="act-convert" data-dir="down1">1中品 → 100下品</button>
          <button class="btn btn-sm" data-action="act-convert" data-dir="up2">100中品 → 1上品</button>
          <button class="btn btn-sm" data-action="act-convert" data-dir="down2">1上品 → 100中品</button>
        </div>
        ${group('pill', '丹药', true)}
        ${group('artifact', '法器')}
        ${group('gongfa', '功法典籍')}
        ${group('material', '杂货材料')}
        ${group('seed', '灵田种子')}
        ${sellFold}
      </div>`;
  },

  /** v26 炼丹火候选择（v18 现成机制实装入口）：内联于炼制坊丹炉区，单炉生效、连炉平火 */
  fireSelectorHtml(p) {
    const fireT = (p.dao === 'pill' && DaoSys.tierLevel && DaoSys.tierLevel(p) >= 3) ? 30 : 0;
    const btn = (key, label) => `<button class="fire-btn ${(CraftSys._fire || '') === key ? 'on' : ''}" data-action="craft-fire" data-fire="${key}">${label}</button>`;
    return `<div class="fire-row"><span class="fire-note" style="margin:0 4px 0 0">火候</span>
      ${btn('', '平火 · 随心')}
      ${btn('wen', '文火 · 成丹+5%')}
      ${btn('wu', '武火 · 上品+10%')}
      ${btn('both', '文武交替 · 契合+12%')}</div>
    <div class="fire-note">· 火候只影响单炉炼制（×5 连炉为平火）；文武交替有 ${35 + fireT}% 几率契合大涨${fireT ? '（丹火境·已提升）' : ''}；上品出丹凝感悟，极品当炉翻倍。</div>`;
  },

  shopCraft() {
    const p = Game.player;
    // 炼丹炉（人人可用，丹道成丹率大涨）；v26：火候选择入口（v18 现成机制实装）
    const alchemySection = `
      <div class="shop-section-title">◈ 炼丹炉${p.dao === 'pill' ? '（丹道加持，成丹率大增）' : ''}${p.cave ? `<span class="tag safe" title="洞府聚灵阵护持炉火">洞府 +${p.cave.lv * 5}%</span>` : ''}</div>
      ${this.fireSelectorHtml(p)}
      ${GameData.ALCHEMY_RECIPES.map(r => {
        const out = GameData.ITEMS[r.out];
        const locked = r.needPages && !(p.flags.recipeOk || {})[r.id];
        const mats = Object.entries(r.need).map(([id, n]) => `${GameData.ITEMS[id].name} ${Bag.count(id)}/${n}`).join('、');
        const can = CraftSys.haveMats(p, r) && !locked;
        const lockTxt = locked ? `<span class="tag danger" title="集齐丹方残页后可参悟解锁">失传 · 残页 ${Bag.count('m_danfang')}/${r.needPages}</span> ` : '';
        const drawBtn = locked
          ? `<button class="btn btn-sm" data-action="act-study-recipe" data-recipe="${r.id}" ${Bag.count('m_danfang') >= r.needPages ? '' : 'disabled'}>参悟</button>`
          : `<button class="btn btn-sm" data-action="act-alchemy" data-recipe="${r.id}" ${can ? '' : 'disabled'} title="以当前火候单开一炉">炼制</button>
            <button class="btn btn-sm" data-action="act-alchemy-multi" data-recipe="${r.id}" data-times="5" ${can ? '' : 'disabled'} title="连开五炉（平火），药材不足自动停炉">×5</button>`;
        return `
        <div class="shop-row">
          <div class="gf-info">
            <div class="gf-name">${this.gradeSpan(out.name, out.grade)}（成丹率 ${CraftSys.rate(p, r, CraftSys._fire).toFixed(0)}%）${lockTxt}</div>
            <div class="gf-desc">需 ${mats}</div>
          </div>
          <div class="gf-actions">
            ${drawBtn}
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
    return `
      <div class="card">
        <div class="card-title">✦ 炼制坊 <span style="font-size:12px;color:var(--text-dim)">丹炉 · 符坊 · 器坊——百艺皆出于此</span></div>
        ${alchemySection}
        ${talismanSection}
        ${forgeSection}
      </div>`;
  },

  shopForge() {
    const p = Game.player;
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
      <div class="shop-section-title">◈ 词缀洗练（洗练重掷，不问因果）</div>
      ${affixSlots || '<div class="tip-line">先装备法宝，方能洗练词缀。</div>'}`;
    // v19 本命法宝喂养
    const benmingSection = ForgeSys.benmingOwn(p) ? `
      <div class="shop-section-title">◈ 本命法宝 · 喂养（每阶全属性 +1%，至十阶）</div>
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">本命法宝 <span class="tag warn">${(p.benming && p.benming.lv) || 0} / ${ForgeSys.BENMING_MAX} 阶</span></div>
        <div class="gf-desc">以本命精血温养，吞玄铁与灵石而长。${(p.benming && p.benming.lv) >= ForgeSys.BENMING_MAX ? '已至圆满之境。' : ''}</div></div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-benming-feed" ${((p.benming && p.benming.lv) || 0) >= ForgeSys.BENMING_MAX ? 'disabled' : ''}>喂 养</button></div>
      </div>` : '';
    // v24 熔铸回收：囊中闲置法器就地分解（0 价稀有物按品阶兜底计价，不再沦为背包垃圾）
    const salvageRows = Object.keys(p.bag).filter(id => {
      const def = GameData.ITEMS[id];
      return def && def.type === 'artifact' && (p.bag[id] || 0) > 0;
    }).map(id => {
      const def = GameData.ITEMS[id];
      const n = p.bag[id];
      const oreBack = (def.grade || 0) + 1;
      const GRADE_FALLBACK = [300, 800, 2000, 6000, 16000, 40000];
      const baseVal = (def.price || 0) > 0 ? def.price : (GRADE_FALLBACK[Utils.clamp(def.grade || 0, 0, 5)] || 500);
      return `
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">${this.gradeSpan(def.name, def.grade)} <span style="color:var(--text-faint)">×${n}</span></div>
        <div class="gf-desc">可回炉得玄铁矿 ×${oreBack}/件、灵石 ${Utils.fmtNum(Math.max(10, Math.round(baseVal * 0.15)))}/件${(def.price || 0) <= 0 ? '（稀有物按品阶兜底计价）' : ''}。</div></div>
        <div class="gf-actions"><button class="btn btn-sm" data-action="act-salvage" data-item="${id}">分 解</button></div>
      </div>`;
    }).join('');
    const salvageSection = `
      <div class="shop-section-title">◈ 熔铸回收（闲置法器回炉：得玄铁矿与灵石）</div>
      ${salvageRows || '<div class="tip-line">囊中暂无可回炉的法器。</div>'}`;
    const enhanceSection = `
      <div class="shop-section-title">◈ 祭炼强化（+1~+10，每级 +10% 数值属性）</div>
      ${enhSlots || '<div class="tip-line">先在乾坤袋中装备法宝，方可祭炼强化。</div>'}
      ${affixSection}
      ${benmingSection}
      ${salvageSection}`;
    return `
      <div class="card">
        <div class="card-title">✦ 祭炼堂 <span style="font-size:12px;color:var(--text-dim)">强化 · 洗练 · 本命温养 · 回收——法宝之道</span></div>
        ${enhanceSection}
      </div>`;
  },

  shopBounty() {
    const p = Game.player;
    // v13 悬赏任务板
    const B = BountySys.stateOf(p);
    const r = BountySys.rewards(p);
    const repBonus = (typeof RepSys !== 'undefined' && RepSys.bountyBonus) ? RepSys.bountyBonus(p) : 1;
    // v27 联动：声望赏格已真实入账——展示值同步按 ×声望 ×连锁 预览
    const repTag = repBonus > 1 ? ` <span class="tag safe" title="声望加成：${Math.round((repBonus - 1) * 100)}%">声望赏格 ×${repBonus}</span>` : '';
    const show = t => {
      const chain = t && t.chain ? 1 + t.chain * 0.6 : 1;
      return { stones: Math.round(Math.round(r.stones * repBonus) * chain), contrib: Math.round(Math.round(r.contrib * repBonus) * chain) };
    };
    const bountyRows = B.list.map((t, i) => {
      if (!t) return `
      <div class="shop-row">
        <div class="gf-info"><div class="gf-name">（此悬赏已交付）</div><div class="gf-desc">明日将有新悬赏贴出。</div></div>
      </div>`;
      const done = t.progress >= t.need;
      const rv = show(t);
      const btn = done
        ? `<button class="btn btn-sm btn-primary" data-action="act-bounty-claim" data-i="${i}">领赏（${Utils.fmtNum(rv.stones)}灵石${p.sect ? `+${rv.contrib}贡献` : ''}）</button>`
        : t.type === 'collect'
          ? `<button class="btn btn-sm" data-action="act-bounty-submit" data-i="${i}">上交（持有${Bag.count(t.target)}）</button>`
          : t.type === 'spar'
            ? '<span class="tip-line" style="margin:0">去江湖页切磋获胜</span>'
            : '<span class="tip-line" style="margin:0">游历猎杀自动计入</span>';
      return `
      <div class="shop-row">
        <div class="gf-info">
          <div class="gf-name">${t.name} ${done ? '<span class="tag safe">已达成</span>' : `<span class="tag">进度 ${t.progress}/${t.need}</span>`}${repTag}</div>
          <div class="gf-desc">${t.desc} · 赏格：灵石 ${Utils.fmtNum(rv.stones)}${p.sect ? `、贡献 ${rv.contrib}` : ''}</div>
        </div>
        <div class="gf-actions">${btn}</div>
      </div>`;
    }).join('');
    const bountySection = `
      <div class="shop-section-title">◈ 悬赏任务板 <span class="tag">第 ${B.day + 1} 日贴出 · 存续两日</span></div>
      ${bountyRows}`;
    return `
      <div class="card">
        <div class="card-title">✦ 悬赏使命 <span style="font-size:12px;color:var(--text-dim)">接榜 · 践诺 · 领赏</span></div>
        <div class="tip-line" style="margin:0 0 6px">· 悬赏两日一换，达成后记得及时领赏；猎杀类目标游历时自动计入。</div>
        ${bountySection}
      </div>`;
  },

  shopOdd() {
    const p = Game.player;
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
    // v19 拍卖行
    const lot = AuctionSys.state(p);
    const isMystery = lot.item === 'mystery';
    const lotDef = isMystery ? { name: '未鉴定·蒙尘古匣', grade: 2, desc: '匣上封皮剥落，看不出内里乾坤——可能是废纸，也可能是仙家至宝（一成几率出现，鉴定期待）。' } : GameData.ITEMS[lot.item];
    const auctionSection = `
      <div class="shop-section-title">◈ 拍卖行（每六十日一件稀有拍品${isMystery ? ' · 本期为<span class="neg">神秘古匣</span>' : ''}）<span class="tag warn">拍期余 ${lot.until - Math.floor(p.day)} 日</span></div>
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
    // v24 布施迁往「江湖 · 义声」——行善消业与销赃暗巷分而治之
    return `
      <div class="card">
        <div class="card-title">✦ 奇 市 <span style="font-size:12px;color:var(--text-dim)">黑市 · 拍卖——非常之法，非常之时</span></div>
        ${blackSection}
        ${auctionSection}
      </div>`;
  },

  renderSectTab() {
    const p = Game.player;
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
    const sect = GameData.SECTS.find(s => s.id === p.sect.id) || { name: '——', bonusText: '' };
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
    // v22 宗门大比：每五年一届，三轮车轮战
    const T = p.sect.tourney;
    const tourneyCard = T ? `
      <div class="card card-trib">
        <div class="card-title">✦ 宗门大比 <span class="tag warn">${SectSys.TOURNEY_ROUNDS[Math.min(2, T.round)]} · 已胜 ${T.wins} 场</span></div>
        <div class="card-desc">擂台已筑，钟鼓齐鸣。同门比试点到为止——胜场越多彩头越厚，三连胜者<b>魁首扬名</b>（气运大赠，生涯留名）。</div>
        <div class="action-row"><button class="btn btn-primary btn-glow" data-action="act-tourney-fight">登 台 比 武</button></div>
      </div>` : '';
    // v24 卡序归位：宗门任务置顶（进门第一屏就是可做的事），派系→大比→兑换随后
    const elderBtn = (typeof SectSys !== 'undefined' && SectSys.isElder && SectSys.isElder(p))
      ? '<button class="btn btn-sm btn-primary" data-action="act-sect-command" style="margin-left:auto">⚡ 长老令</button>' : '';
    return `
      <div class="card">
        <div class="card-title">✦ ${sect.name} <span class="tag safe">${sect.bonusText}</span>${elderBtn}</div>
        <div class="card-desc">当前贡献：<b class="hl">${Utils.fmtNum(p.sect.contrib)}</b> 点。完成宗门任务可获得贡献与灵石。</div>
        ${taskRows}
      </div>
      ${facSection}
      ${tourneyCard}
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
          <div class="gf-desc">${def.desc}${bonusText ? `<br>当前加成：${bonusText}` : ''}${def.skill ? `<br>神通：<span class="grade-2">${def.skill.name}</span> —— ${def.skill.desc}` : ''}${(() => {
            const mst = GameData.GF_MASTERY[id];
            if (!mst) return '';
            return maxed
              ? `<br><b class="hl">大成奥义【${mst.name}】</b>：${mst.desc}`
              : `<br><span style="color:var(--text-faint)">大成奥义（修至大成解锁）：${mst.name} —— ${mst.desc}</span>`;
          })()}</div>
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
    // v20 出战技能盘：战斗中法诀菜单只出盘内招式（至多四招；空盘=全部）
    const deck = Array.isArray(p.battleDeck) ? p.battleDeck : [];
    const deckRows = Object.entries(p.gongfa).filter(([id]) => (GameData.ITEMS[id] || {}).skill).map(([id, g]) => {
      const def = GameData.ITEMS[id];
      const inDeck = deck.includes(id);
      return `
      <div class="gf-row">
        <div class="gf-info">
          <div class="gf-name">${this.gradeSpan(def.name, def.grade)} <span class="gf-lv">第${g.level}层 · 神通【${def.skill.name}】</span></div>
        </div>
        <div class="gf-actions"><button class="btn btn-sm ${inDeck ? 'btn-primary' : ''}" data-action="act-deck-toggle" data-gf="${id}">${inDeck ? '✓ 已入盘' : '入 盘'}</button></div>
      </div>`;
    }).join('');
    const deckCard = `
      <div class="card"><div class="card-title">✦ 出战技能盘 <span class="tag">${deck.length}/4</span></div>
      <div class="card-desc">战斗中的「法诀」菜单只出手盘内招式——择四招随身，临阵不乱。空盘时全部法诀皆可用。</div>
      ${deckRows || '<div class="tip-line">尚未修习带神通的法诀。</div>'}</div>`;
    // v24 道韵协同 2.0：主池+扩池合并、逐条层数进度、差临门一脚时明示缺口
    const dyList = (GameData.DAO_YUN || []).concat(GameData.DAO_YUN_EXTRA || []);
    const activeDyN = (typeof Stat !== 'undefined' && Stat.activeDaoYun) ? Stat.activeDaoYun(p).length : 0;
    const dyRows = dyList.map(dy => {
      const parts = dy.need.map(gid => ({ gid, nm: (GameData.ITEMS[gid] || {}).name || gid, g: p.gongfa[gid] }));
      const on = parts.every(x => x.g && x.g.level >= 3);
      let hint = '';
      if (!on && parts.some(x => x.g)) {
        const miss = parts.filter(x => !x.g || x.g.level < 3);
        hint = `<span style="color:var(--text-faint)">　→ 尚缺：${miss.map(x => `${x.nm}${!x.g ? '（未学）' : ` 第${x.g.level}层`}`).join('、')}</span>`;
      }
      return `<div class="tip-line" style="${on ? '' : 'opacity:.7'}">${on ? '✦' : '·'} <b>${dy.name}</b>（${parts.map(x => `${x.nm} ${x.g ? x.g.level : 0}/3层`).join(' · ')}）——${dy.desc}${hint}</div>`;
    }).join('');
    return `
      <div class="card"><div class="card-title">✦ 已修功法</div>${learned || '<div class="tip-line">尚未修习任何功法。</div>'}</div>
      ${deckCard}
      ${learnRows ? `<div class="card"><div class="card-title">✦ 待学典籍（背包中）</div>${learnRows}</div>` : ''}
      <div class="card"><div class="card-title">✦ 道韵协同（双功法修至三层以上，共鸣生韵） <span class="tag ${activeDyN ? 'warn' : ''}">已激活 ${activeDyN}/${dyList.length}</span></div>
      <div class="tip-line">· 成韵即永久生效；缺口已为你标出——典籍可于坊市、宗门与秘境深处求取。</div>
      ${dyRows}</div>`;
  },

  /** v20 属性构成明细弹窗（.stat-detail 点击触发，Game 全局委托捕获） */
  statDetail(statKey) {
    const p = Game.player;
    if (!p) return;
    const NAMES = { atk: '攻击', def: '防御', maxHp: '气血上限', maxMp: '灵力上限', speed: '身法', crit: '暴击', dodge: '闪避', block: '格挡', cultPct: '修炼效率', stonePct: '灵石获取' };
    const bd = Stat.breakdown(p, statKey);
    const rows = bd.src.map(x => `<div class="stat-line"><span>${x.name}</span><b>${x.v > 0 && !['atk', 'def', 'maxHp', 'maxMp', 'speed'].includes(statKey) ? '+' : ''}${Math.round(x.v * 10) / 10}</b></div>`).join('');
    UI.popup({
      title: `构成 · ${NAMES[statKey] || statKey}`,
      html: `${rows || '<div class="tip-line">暂无加成来源。</div>'}
        <div class="stat-line est-final" style="margin-top:6px"><span>当前合计</span><b class="hl">${['crit', 'dodge', 'block'].includes(statKey) ? bd.final.toFixed(1) + '%' : Utils.fmtNum(bd.final)}</b></div>
        <div class="tip-line">· 综合战力：⚔ ${Utils.fmtNum(Stat.power(p))}（攻防血速暴闪格加权）</div>`,
      options: [{ text: '收 起', value: true, primary: true }],
    });
  },

  /* ---------- v20 生涯统计 ---------- */
  careerBody() {
    const p = Game.player;
    const c = p.counters || {};
    const stones = c.stonesEarned || 0;
    const days = Math.floor(p.day || 0);
    const wins = c.wins || 0, battles = c.battles || 0;
    const winRate = battles ? Math.round(wins / battles * 100) : 0;
    const rows = [
      ['道途历时', `${days} 日（第${Math.floor(days / 365) + 1}年）`],
      ['战斗', `${battles} 战 ${wins} 胜（胜率 ${winRate}%）· 精英 ${c.killsElite || 0} · 秘境守关 ${c.bossKills || 0}`],
      ['历练', `探索 ${c.explores || 0} 次 · 最深秘境第 ${c.maxDepth || 0} 层`],
      ['百艺', `炼丹 ${c.craftsOk || 0}/${c.crafts || 0} 成 · 服丹 ${c.pills || 0} · 学艺 ${c.learns || 0}`],
      ['红尘', `抉择 ${c.dilemmas || 0} 次 · 结交 ${c.befriends || 0} 人 · 切磋 ${c.spars || 0} 场`],
      ['斗兽', `${c.arenaWins || 0} 场胜`],
      ['碎片', `累计收取上古法宝碎片 ${c.gupianGot || 0} 枚`],
    ];
    return rows.map(([k, v]) => `<div class="stat-line"><span>${k}</span><b>${v}</b></div>`).join('');
  },
  careerModal() {
    UI.popup({ title: '📜 生涯统计', html: this.careerBody(), options: [{ text: '合 上', value: true, primary: true }] });
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
    // v4：按品质降序；v20：排序选项（品质/类型/名字）
    const dI = id => GameData.ITEMS[id];
    if (Game.bagSort === 'type') items.sort((a, b) => dI(a).type.localeCompare(dI(b).type) || (dI(b).grade ?? dI(b).tier ?? 0) - (dI(a).grade ?? dI(a).tier ?? 0) || dI(a).name.localeCompare(dI(b).name));
    else if (Game.bagSort === 'name') items.sort((a, b) => dI(a).name.localeCompare(dI(b).name));
    else items.sort((a, b) => {
      const qa = dI(a).grade ?? dI(a).tier ?? 0, qb = dI(b).grade ?? dI(b).tier ?? 0;
      return (qb - qa) || dI(a).type.localeCompare(dI(b).type) || dI(a).name.localeCompare(dI(b).name);
    });
    const rows = items.map(id => {
      const def = GameData.ITEMS[id];
      const gq = def.grade ?? def.tier ?? 0;   // v4：品质档（材料按 tier 折算）
      let btns = '';
      if (def.type === 'pill') btns = `<button class="btn btn-sm" data-action="act-use" data-item="${id}">服用</button>${p.bag[id] > 1 && (def.use || {}).exp ? `<button class="btn btn-sm" data-action="act-use-multi" data-item="${id}" title="连服五枚（丹毒将满自动停）">×5</button>` : ''}`;
      if (def.type === 'gongfa') btns = `<button class="btn btn-sm" data-action="act-learn" data-item="${id}">学习</button>`;
      if (def.type === 'artifact') {
        const isOn = Object.values(p.equipped).some(e => e && Utils.eqId(e) === id);
        btns = isOn ? '' : `<button class="btn btn-sm" data-action="act-equip" data-item="${id}">装备</button><button class="btn btn-sm" data-action="act-salvage" data-item="${id}" title="回炉分解，返玄铁矿与灵石">分解</button>`;
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
    const sortBtns = [['quality', '品质'], ['type', '类型'], ['name', '名字']].map(([k, label]) =>
      `<button class="btn btn-sm ${Game.bagSort === k ? 'btn-primary' : ''}" data-action="bag-sort" data-sort="${k}">${label}</button>`).join('');
    const quick = `<div class="bag-quick">
      <div class="bag-sort-row" style="margin-bottom:4px">${sortBtns}</div>
      ${ShopSys.commonSaleList().length ? `<button class="btn btn-sm" data-action="act-sell-common">一键出售凡品</button>` : ''}
      ${items.length ? `<button class="btn btn-sm btn-danger" data-action="act-drop-cat" data-cat="${Game.bagTab}">清空「${catName}」</button>` : ''}
    </div>`;
    const bagHtml = `
      <div class="panel-title">✦ 乾坤袋</div>
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

  /* ---------- v22 移动端抽屉：道途 / 乾坤袋 面板 ≤860px 收进侧滑抽屉 ---------- */
  toggleDrawer(panel) {
    const id = panel === 'left' ? 'panel-left' : panel === 'right' ? 'panel-right' : null;
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    const willOpen = !el.classList.contains('drawer-open');
    this.closeDrawers();
    if (willOpen) {
      el.classList.add('drawer-open');
      document.getElementById('drawer-backdrop')?.classList.add('on');
    }
  },
  closeDrawers() {
    for (const id of ['panel-left', 'panel-right']) document.getElementById(id)?.classList.remove('drawer-open');
    document.getElementById('drawer-backdrop')?.classList.remove('on');
  },

  /* ---------- v25 剧情沉浸态：移动端播放剧情时隐藏底部导航与顶栏（桌面样式不分叉，无感） ---------- */
  storyImmersive(on) {
    document.body.classList.toggle('story-playing', !!on);
  },

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
      if (this.syncAnnouncePos) this.syncAnnouncePos();   // v21 公告让位
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
    if (this.syncAnnouncePos) this.syncAnnouncePos();   // v21 公告归位
    r(val);
  },
  /** 无选择地关闭当前弹窗 */
  closePopup() { if (this._popupResolve) this.popupChoose(-1); },
  /** 状态同步兜底：读档 / 返回开始界面时关闭全部覆盖层（战斗 / 通用弹窗 / 大道 / 天劫 / 引导 / 氛围面板），
   *  未决弹窗按取消结算，杜绝「遮罩卡死」与挂起的 Promise */
  closeOverlays() {
    this.closePopup();
    this.closeDrawers();   // v22：抽屉随覆盖层一并收起
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
        // v23：未完成（带进度）在前、已完成在后
        const defs = Achieve.DEFS.filter(d => d.cat === cat).sort((a, b) => (got[a.id] ? 1 : 0) - (got[b.id] ? 1 : 0));
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
        const full = gotN >= ids.length && ids.length > 0;
        const bonusTag = full ? '<span class="tag safe">已大成 · 全属性 +1%</span>' : '<span class="tag">收满全属性 +1%</span>';
        body += `<div class="shop-section-title">◈ ${label} · ${gotN}/${ids.length} ${bonusTag}</div>${rows}`;
      }
    }
    return `${tabs}<div class="codex-list">${body}</div>
      <div class="tip-line" style="margin-top:6px">· 每类图鉴收录齐全，道行自有精进——全属性永久 +1%（可叠加，跨转世保留）。</div>`;
  },

  /* ---------- v24 玩法手册：分章折叠的帮助页（原「三分钟上手清单」为首节） ---------- */
  helpModal() {
    const folds = `
      <details class="fold" open><summary>✦ 三分钟上手</summary>
        <div class="tip-line">· <b>修炼</b>攒修为，圆满后冲关；练气→筑基无天劫，金丹起有硬抗/法宝/借地三策博弈。</div>
        <div class="tip-line">· <b>游历</b>探地图搏机缘，遇敌注意敌方「下一手」意图——<b>蓄力时防御可破招反击</b>。</div>
        <div class="tip-line">· <b>坊市</b>买丹药法宝；丹毒是服丹的代价——丹毒上限见左栏，超过七成五会提示停口，解毒丹可压。</div>
        <div class="tip-line">· 灵石分<b>下品/中品/上品</b>三档，1 中品=100 下品、1 上品=100 中品；万宝阁可互相兑换。</div>
        <div class="tip-line">· 筑基后解锁 <b>洞府/宗门/江湖</b>：种田炼药、领任务、结交修士（可结拜、结为道侣）。</div>
        <div class="tip-line">· 每章主线完结送残玉共鸣（全属性 +1.5%）——跟主线走不吃亏；卡住就看左栏「当前建议」。</div>
      </details>
      <details class="fold"><summary>✦ 修行与境界</summary>
        <div class="tip-line">· 十境三十六层：练气→筑基→金丹→元婴→化神→炼虚→合体→大乘→渡劫→真仙，每境四层。</div>
        <div class="tip-line">· 每层修为攒满即「圆满」，可冲关下一境；金丹起冲关引天劫，成败皆有道果（劫前记得存档）。</div>
        <div class="tip-line">· 闭关 30 日 = 一轮大修炼（耗灵石、清丹毒）；「聚灵加速」日限一次，当日修炼 ×1.5。</div>
        <div class="tip-line">· 大道六择一（剑/丹/符/体/阵/魔）：剑修渡劫 ×0.77、体修 ×1.4，各道有专属行为加成，终身可转（跌一大境界）。</div>
        <div class="tip-line">· 心魔满百必劫（丹毒反噬/渡劫失利所积）；孽障满百可斩三尸（清孽障，散修为）。</div>
        <div class="tip-line">· 渡劫失利不死——可兵解转世重开一世：印记全属性 +1%/枚，传承树逐层解锁。</div>
      </details>
      <details class="fold"><summary>✦ 战斗要诀</summary>
        <div class="tip-line">· 敌方「下一手」意图明示：攻击/蓄力/防御。敌<b>蓄力</b>时用「防御」可破招，反伤其身并攒气。</div>
        <div class="tip-line">· 必杀技随战斗积「气」施放；出战技能盘（功法页）至多带四招，空盘则全部可用。</div>
        <div class="tip-line">· 战斗中可服丹/掷符/饮灵力药；残血开「自动战斗」会自动服药与防御。</div>
        <div class="tip-line">· 可驯妖兽打至两成血以下出现「驯服」——灵兽出战可协战，喂妖兽内丹可升阶。</div>
        <div class="tip-line">· 打不过可「遁走」（有伤）——精英词缀（汲血/魔棘/不灭等）开局可见，量力而行。</div>
      </details>
      <details class="fold"><summary>✦ 江湖与恩怨</summary>
        <div class="tip-line">· 二十四位常驻修士随岁月成长：结交→赠礼→论道→结拜/结侣；道侣会在你渡劫时舍命相助。</div>
        <div class="tip-line">· 关系深厚触发「续谈」——个人线三幕剧情，全通给永久加成；错过档位会暂隐，不必急。</div>
        <div class="tip-line">· 宿敌会截胡机缘、趁虚偷袭；「化解仇怨」或雷台了断可消患。孽障越高，仇家越多。</div>
        <div class="tip-line">· 声望由布施行善、悬赏践诺、门派差事与红尘善举积累：买价打折、悬赏赏格真实加成；声名狼藉则处处吃闭门羹。</div>
      </details>
      <details class="fold"><summary>✦ 营生与经济</summary>
        <div class="tip-line">· 洞府灵田自种自收（离线亦生长）；种子在坊市「灵田种子」区；一键行权可代收代种。</div>
        <div class="tip-line">· 悬赏板两日一换，猎杀目标游历自动计入；宗门任务同源——贡献换功法秘宝。</div>
        <div class="tip-line">· 奇市：黑市每月初三开市三日（贵六成但货奇）；拍卖行每六十日一件稀有拍品。</div>
        <div class="tip-line">· 闲置法器可在祭炼堂「熔铸回收」分解成玄铁矿与灵石——天级神兵也按品阶兜底计价。</div>
        <div class="tip-line">· 灵田灵兽寻宝有「归来」红点提醒；奇市开市、拍期将止也会在页签上亮灯。</div>
      </details>
      <details class="fold"><summary>✦ 登天塔（v25）</summary>
        <div class="tip-line">· 筑基期解锁，游历·天塔进入。每层一头「守影」，强度随<b>层数与你的境界</b>爬坡；气血跨层延续，量力而登。</div>
        <div class="tip-line">· 每逢<b>三层</b>塔心赠祝福（三选一，塔内有效、出塔即散）；每逢<b>五层</b>开宝箱并回复三成气血。</div>
        <div class="tip-line">· 层间可选「收手离塔」带走全部层奖；败北亦无性命之虞（无灵石修为折损），只是止步。</div>
        <div class="tip-line">· 每日免费一次，灵石可加购一次；最高层纪录跨世留存——转世重开亦可冲榜。</div>
        <div class="tip-line">· 塔中宝箱藏<b>塔产奇物</b>（天塔灵砂/云阶铁/镇塔符核），可收藏可出售；真仙终章亦须塔中十层证道。</div>
      </details>
      <details class="fold"><summary>✦ 杂录</summary>
        <div class="tip-line">· 快捷键：剧情中 Enter/空格 翻页；战斗中 1~5 普攻/法诀/防御/道具/遁走；QWERTASD 切页签；ESC 关层。</div>
        <div class="tip-line">· 离线时灵田照常生长、修为按修炼四成效率自行精进（上限 30 日）；灵泉、访客、节庆等日常亦按日补结（互动节庆自动从简）。</div>
        <div class="tip-line">· 图鉴五类收满各得全属性 +1%（永久）；成就页未完成的排在前头。</div>
        <div class="tip-line">· 问道录（问道页右上）收录你看过的全部剧情、人物志、年表、抉择树与百科。</div>
      </details>`;
    this.popup({
      title: '📖 玩法手册',
      html: folds,
      options: [{ text: '合 上', value: true, primary: true }],
    });
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
    const wrap = this.el['toast'];
    // v25 移动端补课：同屏至多 3 条，超出移除最旧——成就/主线/百科同帧连发不再叠罗汉遮顶栏
    while (wrap.children.length >= 3) wrap.firstElementChild?.remove();
    const div = document.createElement('div');
    div.className = 'toast-item' + (err ? ' err' : '');
    div.textContent = text;
    wrap.appendChild(div);
    setTimeout(() => { div.style.opacity = '0'; div.style.transition = 'opacity .4s'; }, 1600);
    setTimeout(() => { div.remove(); }, 2100);
  },
  /** v21：行动浮字——所得在触发按钮上方飘起渐散（数字动效关闭时不显示） */
  float(text, color = 'var(--exp)', anchor) {
    if (!Anim.enabled) return;
    const host = anchor || document.querySelector('[data-action="act-cultivate"]') || this.el['tab-content'];
    if (!host || !host.getBoundingClientRect) return;
    const r = host.getBoundingClientRect();
    const div = document.createElement('div');
    div.className = 'float-text';
    div.style.left = Math.round(r.left + r.width / 2) + 'px';
    div.style.top = Math.round(r.top + 4) + 'px';
    div.style.color = color;
    div.textContent = text;
    document.getElementById('app').appendChild(div);
    setTimeout(() => div.remove(), 1500);
  },
  /** v26 引导直达：页签切换后滚动定位到含指定文字的卡片并鎏金闪光——「去了但不知道干嘛」消失 */
  glimmer(anchorText) {
    if (!anchorText) return;
    setTimeout(() => {
      const box = this.el['tab-content'];
      if (!box) return;
      const targets = box.querySelectorAll('.card, .shop-row, .gf-row');
      let hit = null;
      for (const el of targets) { if (el.textContent.includes(anchorText)) { hit = el; break; } }
      if (!hit) return;
      hit.scrollIntoView({ block: 'center', behavior: 'smooth' });
      hit.classList.remove('glimmer'); void hit.offsetWidth; hit.classList.add('glimmer');
      setTimeout(() => hit.classList.remove('glimmer'), 2300);
    }, 90);
  },
  /** v21：剧情 / 战斗 / 弹窗进行中，公告移至顶栏下方播放，不再遮住中央演出文字 */
  syncAnnouncePos() {    const wrap = document.getElementById('announce');
    if (!wrap) return;
    const anyModal = [...document.querySelectorAll('.modal')].some(m => !m.classList.contains('hidden'));
    wrap.classList.toggle('at-top', anyModal);
  },
  /** v4：关键事件居中淡入公告（境界突破 / 稀有物品 / 战斗胜负），2 秒后自动消散 */
  announce(text, kind = 'gold') {
    let wrap = document.getElementById('announce');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'announce';
      document.getElementById('app').appendChild(wrap);
    }
    // v21：先按当前弹窗状态定位（剧情打开前一瞬发出的公告也会随开层即时上移）
    this.syncAnnouncePos();
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
    // v19 突破演出分档：境界越高，异象越盛（低境轻光 → 中境光环 + 粒子 → 高境全屏潮涌）
    const tier = (Game.player && Game.player.realmIdx) || 0;
    const tierCls = tier >= 7 ? 'rs-t3' : tier >= 4 ? 'rs-t2' : tier >= 2 ? 'rs-t1' : '';
    flash.classList.remove('go', 'rs-t1', 'rs-t2', 'rs-t3');
    show.classList.remove('go', 'rs-t1', 'rs-t2', 'rs-t3');
    void flash.offsetWidth;   // 重启动画
    flash.classList.add('go');
    show.classList.add('go');
    if (tierCls) { flash.classList.add(tierCls); show.classList.add(tierCls); }
    if (tier >= 4) Ambience.sfx('breakthrough');
    clearTimeout(this._realmTimer);
    const dur = tier >= 7 ? 4600 : tier >= 4 ? 4000 : 3500;
    this._realmTimer = setTimeout(() => { flash.classList.remove('go', 'rs-t1', 'rs-t2', 'rs-t3'); show.classList.remove('go', 'rs-t1', 'rs-t2', 'rs-t3'); }, dur);
  },
  saveFlash() {
    const dot = document.querySelector('.save-dot');
    if (!dot) return;
    dot.style.background = '#fff';
    setTimeout(() => { dot.style.background = ''; }, 180);
  },
};
