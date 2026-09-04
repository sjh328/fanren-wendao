
/* ======================================================================
 * §15.4 v15 剧情演出引擎 StorySys（卷轴旁白 / 人物对话 / 抉择 / 结算）
 * play(script, onEnd)：script = { id, scenes: [...] }，逐场推进的全屏卷轴演出。
 * 场景格式：
 *   { t:'narr',  text }                          旁白卷轴（\n 分段）
 *   { t:'dialog', who, title, color, text }      人物对话（名牌 + 台词）
 *   { t:'choice', text, options:[{text, value}], pick(value) }  抉择 → pick 返回结算文本数组
 *   { t:'reward', lines:[...] }                  章末结算
 * 已看过的剧情记入 p.story.seen，「问道录」可回顾重读。
 * ====================================================================== */
const Story = {
  q: [],            // 播放队列：章末剧情 → 下一章开篇可无缝衔接
  cur: null,        // { id, title, scenes, idx, onEnd, readonly }
  active() { return !!this.cur; },
  /** 播放一段剧情（同一 id 常规只播一次；force=回顾重读）。播放中收到新脚本则入队。 */
  play(script, onEnd, force = false) {
    if (!script || !script.scenes || !script.scenes.length) { if (onEnd) onEnd(); return; }
    if (!force && this.isSeen(script.id)) { if (onEnd) onEnd(); return; }
    if (this.cur) { this.q.push({ script, onEnd, force }); return; }
    this._start(script, onEnd, force);
  },
  _start(script, onEnd, force) {
    if (!force) this.markSeen(script.id);
    this.cur = { id: script.id, title: script.title || '', scenes: script.scenes, idx: 0, onEnd: onEnd || null, readonly: !!force };
    let modal = document.getElementById('story-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'story-modal';
      modal.className = 'modal';
      modal.innerHTML = '<div class="story-box" id="story-box"></div>';
      document.getElementById('app').appendChild(modal);
    }
    modal.classList.remove('hidden');
    if (typeof Ambience !== 'undefined' && Ambience.setMood) Ambience.setMood('story');   // v19 剧情情境配乐
    this.render();
  },
  isSeen(id) {
    const p = Game.player;
    return !!(p && p.story && p.story.seen[id]);
  },
  markSeen(id) {
    const p = Game.player;
    if (!p) return;
    if (!p.story) p.story = { seen: {}, mid: {}, choices: {} };
    p.story.seen[id] = Math.floor(p.day || 0) + 1;
  },
  /** 抉择记录（每章末记录所选 value） */
  recordChoice(key, value) {
    const p = Game.player;
    if (!p) return;
    if (!p.story) p.story = { seen: {}, mid: {}, choices: {} };
    p.story.choices[key] = value;
  },
  choiceOf(key) {
    const p = Game.player;
    return (p && p.story && p.story.choices[key]) || null;
  },
  /* ---------- v19：剧情旗标（抉择后果的跨章回收） ---------- */
  flags() {
    const p = Game.player;
    if (!p.story) p.story = { seen: {}, mid: {}, choices: {} };
    if (!p.story.flags) p.story.flags = {};
    return p.story.flags;
  },
  setFlag(k, v = true) { this.flags()[k] = v; },
  hasFlag(k) { return !!this.flags()[k]; },
  /** v19：大事年表（问道录 · 年表用） */
  chron(txt) {
    const p = Game.player;
    if (!p) return;
    if (!p.chronicle) p.chronicle = [];
    p.chronicle.push({ d: Math.floor(p.day || 0), txt });
    if (p.chronicle.length > 80) p.chronicle.splice(0, p.chronicle.length - 80);
  },
  /** v19：场景可见性（req：需持有旗标；noFlag：需未持有。可为字符串或数组） */
  _vis(sc) {
    if (!sc) return false;
    const F = this.flags();
    if (sc.req) {
      const need = Array.isArray(sc.req) ? sc.req : [sc.req];
      if (!need.every(f => F[f])) return false;
    }
    if (sc.noFlag) {
      const ban = Array.isArray(sc.noFlag) ? sc.noFlag : [sc.noFlag];
      if (ban.some(f => F[f])) return false;
    }
    if (sc.reqChoice) {   // v19：按当年抉择值分支（尾声用）
      const v = this.choiceOf(sc.reqChoice.key);
      const ok = Array.isArray(sc.reqChoice.oneOf) ? sc.reqChoice.oneOf.includes(v) : v === sc.reqChoice.val;
      if (!ok) return false;
    }
    return true;
  },
  next() {
    const c = this.cur;
    if (!c) return;
    const prev = c.scenes[c.idx];
    if (prev && prev.t === 'montage' && prev.days) Time.add(prev.days);   // 岁月流逝过场
    c.idx++;
    if (c.idx >= c.scenes.length) return this.finish();
    while (c.idx < c.scenes.length && !this._vis(c.scenes[c.idx])) c.idx++;   // 旗标条件跳过
    if (c.idx >= c.scenes.length) return this.finish();
    this.render();
  },
  async choose(i) {
    const c = this.cur;
    if (!c) return;
    const sc = c.scenes[c.idx];
    const opt = sc.options[i];
    if (!opt) return;
    let lines = null;
    if (sc.t === 'investigate') {
      // v19 线索推理：选对得线索旗标与奖励，选错亦有下文
      lines = opt.ok ? (sc.win || ['你从蛛丝马迹中，拼出了关键的一环。'])
                     : (sc.lose || ['线索并不在此——但你并非一无所获。']);
      if (opt.ok && sc.flag) this.setFlag(sc.flag);
      if (opt.ok) KarmaSys.addFortune(2);
    } else {
      lines = sc.pick ? await sc.pick(opt.value) : null;
    }
    this.recordChoice(c.id, opt.value);
    if (opt.flag) this.setFlag(opt.flag);
    // 抉择后插入结果旁白
    c.scenes.splice(c.idx + 1, 0, { t: 'narr', text: (lines || ['冥冥之中，因果已种。']).join('\n') });
    this.next();
  },
  /* ---------- v19：剧情战（胜负皆入戏） ---------- */
  async startBattle() {
    const c = this.cur;
    if (!c || this._battling) return;
    const sc = c.scenes[c.idx];
    if (!sc || sc.t !== 'battle') return;
    const p = Game.player;
    let enemy = null;
    if (sc.foe && sc.foe.npc) {
      enemy = NpcSys.buildEnemy(p, sc.foe.npc);
    } else if (sc.foe && sc.foe.m) {
      enemy = buildMonster(sc.foe.m);
    } else {
      const f = sc.foe || {};
      const pw = Utils.clamp(f.power != null ? f.power : p.realmIdx * 4 + 2, 0, 60);
      const rIdx = Utils.clamp(Math.floor(pw / 4), 0, 9);
      const scale = f.scale || 1;
      enemy = {
        id: null, name: f.name || '神秘敌人', elite: !!f.elite, power: pw,
        bossArt: f.bossArt || null,   // v20 Boss 专属立绘
        realmLabel: GameData.REALM_NAMES[rIdx] + GameData.LAYER_NAMES[Utils.clamp(pw % 4, 0, 3)],
        hpMax: Math.round((55 + Math.pow(pw, 1.6) * 5) * (f.elite ? 1.7 : 1) * scale),
        atk: Math.round((6 + pw * 2.6) * (f.elite ? 1.35 : 1) * scale),
        def: Math.round((4 + pw * 2.2) * scale), spd: Math.round(7 + pw * 0.9),
        dodge: 5, crit: 8, skills: f.skills || [],
        expGain: Math.round(30 * GameData.eco(rIdx)), stoneGain: 0, dropTier: 2, rareDrop: null, hp: 0,
      };
    }
    if (sc.bark) enemy._storyBark = sc.bark;
    this._battling = true;
    Battle.start(null, { enemy, mapName: sc.label || '剧情之地', story: {
      onEnd: (win) => {
        this._battling = false;
        const cc = this.cur;
        if (!cc) return;
        const lines = win ? (sc.win || ['尘埃落定，你立于不败之地。'])
                          : (sc.lose || ['你力竭倒地——但故事，还未到终章。']);
        cc.scenes.splice(cc.idx + 1, 0, { t: 'narr', text: lines.join('\n') });
        if (win && sc.flagWin) this.setFlag(sc.flagWin);
        if (!win && sc.flagLose) this.setFlag(sc.flagLose);
        this.next();
      },
    } });
  },
  finish() {
    const c = this.cur;
    this.cur = null;
    if (typeof Ambience !== 'undefined' && Ambience.setMood) Ambience.setMood('calm');   // v19 剧情毕归平静
    const modal = document.getElementById('story-modal');
    if (modal) modal.classList.add('hidden');
    if (c && c.onEnd) { const fn = c.onEnd; c.onEnd = null; fn(); }
    // 队列中的下一段剧情自动衔接
    const next = this.q.shift();
    if (next) {
      setTimeout(() => this._start(next.script, next.onEnd, next.force), 250);
    }
  },
  /** 回顾模式的 ✕：关闭并清空队列（不再衔接后续段落） */
  close() { this.q = []; this.finish(); },
  render() {
    const c = this.cur;
    if (!c) return;
    const box = document.getElementById('story-box');
    if (!box) return;
    const sc = c.scenes[c.idx];
    let body = '';
    if (sc.t === 'dialog') {
      const chr = GameData.char(sc.who);
      const who = chr ? chr.name : (sc.who || '？');
      const color = chr ? chr.color : (sc.color || '#6a5a3e');
      const title = chr ? (sc.title || chr.title) : sc.title;
      const fig = chr ? Art.portrait(chr.look) : Utils.esc((sc.who || '？')[0]);
      body = `
      <div class="story-dialog">
        <div class="story-figure" style="--fig-c:${color}">${fig}</div>
        <div class="story-dialog-main">
          <div class="story-who" style="color:${color}">${Utils.esc(who)}<span class="story-who-title">${Utils.esc(title || '')}</span></div>
          <div class="story-text">${sc.text}</div>
        </div>
      </div>`;
    } else if (sc.t === 'choice' || sc.t === 'investigate') {
      body = `
      <div class="story-text story-choice-lead">${sc.t === 'investigate' ? '「细察」' : ''}${sc.text}</div>
      <div class="story-choices">${sc.options.map((o, i) =>
        `<button class="story-opt" data-action="story-choice" data-story-choice="${i}">${o.text}</button>`).join('')}</div>`;
    } else if (sc.t === 'figure') {
      // v19 剧情大图：关键章人物横幅（chr: '@c_xxx'，art: 底衬题词）
      const chr = GameData.char(sc.chr || '');
      const nm = chr ? chr.name : (sc.chr || '');
      const color = chr ? chr.color : '#6a5a3e';
      const look = (chr && chr.look) || {};
      body = `
      <div class="story-figure-big" style="--fig-c:${color}">
        <div class="sfb-portrait">${chr ? Art.portrait(chr.look) : Utils.esc(nm[0] || '？')}</div>
        <div class="sfb-text">
          <div class="sfb-name">${Utils.esc(nm)}</div>
          <div class="sfb-art">${sc.art || ''}</div>
        </div>
      </div>`;
    } else if (sc.t === 'battle') {
      const foeName = sc.foe && sc.foe.npc ? ((NpcSys.def(sc.foe.npc) || {}).name)
        : sc.foe && sc.foe.m ? ((GameData.MONSTERS[sc.foe.m] || {}).name)
        : (sc.foe && sc.foe.name);
      body = `
      <div class="story-battle-card">
        <div class="story-battle-name">⚔ ${Utils.esc(sc.label || '剧情战')}${foeName ? ' · ' + Utils.esc(foeName) : ''}</div>
        <div class="story-text">${sc.text || ''}</div>
        <button class="btn btn-primary" data-action="story-battle">迎 战 ▸</button>
      </div>`;
    } else if (sc.t === 'montage') {
      body = `<div class="story-montage">${(sc.text || '').split('\n').map(t => `<p class="story-p">${t}</p>`).join('')}</div>`;
    } else if (sc.t === 'reward') {
      body = `
      <div class="story-reward">
        <div class="story-reward-title">✦ 章 末 · 结 算</div>
        ${sc.lines.map(l => `<div class="story-reward-line">${l}</div>`).join('')}
      </div>`;
    } else {
      body = sc.text.split('\n').map(t => `<p class="story-p">${t}</p>`).join('');
    }
    const last = c.idx >= c.scenes.length - 1;
    box.innerHTML = `
      ${c.title ? `<div class="story-chapter">${Utils.esc(c.title)}</div>` : ''}
      <div class="story-body">${body}</div>
      ${sc.t === 'choice' || sc.t === 'battle' ? '' : `<div class="story-foot">
        <span class="story-page">${c.idx + 1} / ${c.scenes.length}</span>
        <button class="btn btn-primary" data-action="story-next">${c.readonly ? '合 上' : (last ? '终 ✦' : '继 续 ▸')}</button>
      </div>`}
      ${c.readonly ? '<button class="story-close-x" data-action="story-close" title="关闭">✕</button>' : ''}`;
    // 旁白渐显
    box.querySelectorAll('.story-p').forEach((el, i) => { el.style.animationDelay = (i * 0.18) + 's'; });
  },
};

window.Story = Story;   // v19：暴露全局以便调试与自动化测试
