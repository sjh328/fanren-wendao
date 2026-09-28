
/* ======================================================================
 * §30 天道誓言 OathSys（v38 E306）
 * 立誓换力、破誓担劫——一次至多持两道；破誓心魔 +15、气运 -20、九十日禁立。
 * 检测钩子全部挂在行动单源（bag 服丹 / battle 普胜 / npc 社交 / rank 问剑 / afterAction 贫誓清算）。
 * ====================================================================== */
const OathSys = {
  MAX: 2,
  BAN_DAYS: 90,
  POOR_CAP: 200,   // 贫誓上限基数 × stoneEco(当前境)

  DEFS: [
    { id: 'kill',  name: '不杀之誓', desc: '不击杀寻常妖物（精英/剧情/恩怨/秘境除外）', reward: '杀孽冻结（孽障不再增长）、每年气运 +1' },
    { id: 'dan',   name: '辟谷丹誓', desc: '不服任何丹药', reward: '丹毒尽消、丹药效果 +10%' },
    { id: 'solo',  name: '独行之道', desc: '不结新交（结交/结拜/道侣皆不可）', reward: '既有情谊增长 +30%' },
    { id: 'poor',  name: '清贫之誓', desc: '灵石积蓄不逾 200×当前境系数（超出须散财）', reward: '坊市九折、声望增速 +50%' },
    { id: 'still', name: '止戈之誓', desc: '不切磋、不上雷台、不发问剑', reward: '修炼效率 +8%' },
  ],
  NAMES: { kill: '不杀之誓', dan: '辟谷丹誓', solo: '独行之道', poor: '清贫之誓', still: '止戈之誓' },

  active(p, id) { return !!(p.oaths && p.oaths[id]); },
  count(p) { return this.DEFS.filter(d => this.active(p, d.id)).length; },
  banned(p) { return (p.oathBanDay || 0) > Math.floor(p.day || 0); },
  banLeft(p) { return Math.max(0, (p.oathBanDay || 0) - Math.floor(p.day || 0)); },
  poorCap(p) { return Math.round(this.POOR_CAP * GameData.stoneEco(p ? p.realmIdx : 0)); },
  stonesTotal(p) { return Bag.stonesTotal(p); },   // v39（E365）：转调 Bag 单源

  /* ---- 属性面回报（stat.js 消费） ---- */
  cultBonus(p) { return this.active(p, 'still') ? 8 : 0; },
  pillBonus(p) { return this.active(p, 'dan') ? 10 : 0; },
  shopBonus(p) { return this.active(p, 'poor') ? 10 : 0; },
  relMul(p) { return this.active(p, 'solo') ? 1.3 : 1; },   // 既有情谊增长 +30%
  repMul(p) { return this.active(p, 'poor') ? 1.5 : 1; },   // 声望增速 +50%

  async open() {
    const p = Game.player;
    const rows = this.DEFS.map(d => {
      const on = this.active(p, d.id);
      return `<div class="shop-row"><div class="gf-info"><div class="gf-name">${on ? '✦' : '·'} <b>${d.name}</b>${on ? ' <span class="tag warn">持守中</span>' : ''}</div>
        <div class="gf-desc">${d.desc}。<br><span style="color:var(--gold)">誓成之报：${d.reward}。</span></div></div>
        <div class="gf-actions">${on
          ? `<button class="btn btn-sm btn-danger" data-action="act-oath-break" data-oath="${d.id}">破 誓</button>`
          : `<button class="btn btn-sm" data-action="act-oath-take" data-oath="${d.id}" ${this.banned(p) || this.count(p) >= this.MAX ? 'disabled' : ''}>立 誓</button>`}</div></div>`;
    }).join('');
    UI.popup({
      title: '天道誓言',
      html: `天道无情，然誓约可借力——立誓者以自由换精进，破誓者以劫数偿之。<br>
        <span class="tip-line">· 至多同时持守 ${this.MAX} 道；破誓：心魔 +15、气运 -20、${this.BAN_DAYS} 日禁立新誓。<br>
        ${this.banned(p) ? `· <span class="neg">破誓反噬未消——禁立还余 ${this.banLeft(p)} 日。</span>` : `· 现持 ${this.count(p)}/${this.MAX} 道。`}</span>${rows}`,
      options: [{ text: '合 上', value: true, primary: true }],
    });
  },
  take(id) {
    const p = Game.player;
    const d = this.DEFS.find(x => x.id === id);
    if (!d || this.active(p, id)) return;
    if (this.banned(p)) { UI.toast(`破誓反噬未消——禁立还余 ${this.banLeft(p)} 日`); return; }
    if (this.count(p) >= this.MAX) { UI.toast(`至多同时持守 ${this.MAX} 道`); return; }
    p.oaths = p.oaths || {};
    p.oaths[id] = true;
    if (id === 'dan') p.poison = 0;   // 辟谷丹誓立时涤净丹毒
    Log.add(`【立誓】你指天道立下<b>${d.name}</b>——${d.desc}。${d.reward}。`, 'system');
    this.partnerComment(p, `听闻你立下${d.name}——道心既定，愿君守之如初。`, '谈及誓言');
    Story.chron(`立下${d.name}`);
    Game.afterAction();
  },
  /** v38（E329）：挚友评语——道侣/结拜对立誓与破誓的专属态度（纯文案零数值） */
  partnerComment(p, text, memTxt) {
    const who = p.partner || (p.sworn || [])[0] || null;
    if (!who) return;
    const d = (typeof NpcSys !== 'undefined' && NpcSys.def) ? NpcSys.def(who) : null;
    if (!d) return;
    Log.add(`<b>${d.name}</b>：「${text}」，挚友之言，记在心里。`, 'event');
    if (typeof NpcSys !== 'undefined' && NpcSys.mem) NpcSys.mem(p, who, 'story', memTxt || '谈及誓言');
  },
  async breakOath(id, reason) {
    const p = Game.player;
    if (!this.active(p, id)) return;
    // v39（E358）：宽恕限次——每道誓一世宽恕限 2 次（p.oaths.mercy[id]），每次气运 −5；
    // 第 3 次再犯时弹窗只剩「破誓担劫」——堵死「边杀野怪边点守住」零代价白嫖誓约 buff 的循环。
    // 清贫誓的散财履约（poorCheck donate）属践诺而非宽恕，不计数。
    const mercyN = (p.oaths.mercy && p.oaths.mercy[id]) || 0;
    const canMercy = mercyN < 2;
    const pick = await UI.popup({
      title: `破誓 · ${this.NAMES[id]}`,
      html: `${reason || '你亲口立下的誓言，此刻就要亲手打破。'}<br><span class="neg">破誓担劫：心魔 +15、气运 -20、${this.BAN_DAYS} 日禁立新誓。</span>${canMercy ? `<br><span class="tip-line">· 宽恕限次：此誓本世已宽恕 ${mercyN}/2 次——再宽一次气运 −5；第 3 次再犯唯余破誓。</span>` : '<br><span class="neg">此誓已宽恕两次，天道不再容情——唯余破誓担劫。</span>'}`,
      options: [
        ...(canMercy ? [{ text: `罢了，守住誓言（宽恕：气运 −5）`, value: 'mercy' }] : []),
        { text: '破誓担劫', value: 'break' },
      ],
    });
    if (pick === 'mercy') {
      p.oaths.mercy = p.oaths.mercy || {};
      p.oaths.mercy[id] = mercyN + 1;
      p.fortune = Math.max(0, (p.fortune || 0) - 5);
      Log.add(`【守誓】你向天道请罪，愿以气运偿此一失（气运 −5，此誓本世宽恕 ${mercyN + 1}/2 次）——誓约仍在，然天道记账，再犯必偿。`, 'warn');
      this.partnerComment(p, `此番天道看在你的份上网开一面——下不为例。`, '谈及誓言宽恕');
      Game.afterAction();
      return;
    }
    if (pick !== 'break') { p.pendingOathBreak = id; return; }   // ESC/遮罩不结算——罪证回挂，下次收尾再审（堵「弹窗待决即无罪」的漏洞）
    p.oaths[id] = false;
    p.oathBanDay = Math.floor(p.day || 0) + this.BAN_DAYS;
    if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 15, '破誓反噬');
    p.fortune = Math.max(0, (p.fortune || 0) - 20);
    Log.add(`【破誓】${this.NAMES[id]}就此而破——心魔滋生，气运溃散，天道默记此账。`, 'loss');
    this.partnerComment(p, `誓约既碎……望君他日以行践诺。`, '谈及破誓');
    Story.chron(`破了${this.NAMES[id]}`);
    Game.afterAction();
  },
  /** 贫誓清算（afterAction 尾）：积蓄超限 → 散财止盈 or 破誓 */
  async poorCheck(p) {
    if (!this.active(p, 'poor') || p.dead) return;
    const cap = this.poorCap(p);
    const total = this.stonesTotal(p);
    if (total <= cap) return;
    const excess = total - cap;
    const pick = await UI.popup({
      title: '清贫之誓 · 积蓄超限',
      html: `你立过清贫之誓——灵石积蓄不得逾 <b>${Utils.fmtNum(cap)}</b>，如今已有 <b>${Utils.fmtNum(total)}</b>。<br>何去何从？`,
      options: [
        { text: `散财止盈（超出 ${Utils.fmtNum(excess)} 散予路人，声望 +1）`, value: 'donate', primary: true },
        { text: '破誓担劫', value: 'break' },
      ],
    });
    if (pick === 'donate') {
      // 从高档往低档散，恰好回到上限
      let left = excess;
      const units = [['high', 10000], ['mid', 100], ['low', 1]];
      for (const [k, u] of units) {
        const take = Math.min(p.stones[k] || 0, Math.floor(left / u));
        p.stones[k] -= take; left -= take * u;
      }
      if (left > 0 && (p.stones.low || 0) > 0) p.stones.low -= Math.min(p.stones.low, left);
      // v39（E358）：KarmaSys.add 本不存在（调用即 TypeError 静默吞）——改 RepSys.add 实发声望，
      // 自带清贫誓 ×1.5：按 1 计入实得 1~2，文案如实括注
      if (typeof RepSys !== 'undefined' && RepSys.add) RepSys.add(p, 1, '散财行善（誓约加成后 +1~2）');
      Log.add(`【守誓】你将超出的 ${Utils.fmtNum(excess)} 灵石尽数散予道旁修士与贫苦凡人——身无长物，心怀坦荡。`, 'gain');
    } else if (pick === 'break') {
      p.oaths.poor = false;
      p.oathBanDay = Math.floor(p.day || 0) + this.BAN_DAYS;
      if (typeof XinmoSys !== 'undefined') XinmoSys.add(p, 15, '破誓反噬');
      p.fortune = Math.max(0, (p.fortune || 0) - 20);
      Log.add('【破誓】清贫之誓就此而破——积蓄既丰，道心蒙尘。', 'loss');
      Story.chron('破了清贫之誓');
    }
    Game.afterAction();
  },
  /** 不杀之誓破戒登记（Battle.victory 普通尾段调用）——afterAction 尾结算 */
  killViolation(p) {
    if (!this.active(p, 'kill')) return;
    p.pendingOathBreak = 'kill';
  },
  /** afterAction 尾统一清算：破戒待决 / 贫誓超限 */
  async pendingResolve(p) {
    if (p.pendingOathBreak) {
      const id = p.pendingOathBreak;
      p.pendingOathBreak = null;
      if (this.active(p, id)) {
        await this.breakOath(id, id === 'kill' ? '誓言犹在耳畔，而你已对寻常妖物挥下了杀手。' : null);
      }
    }
    await this.poorCheck(p);
  },

  /* ========== v41（E451）：誓约试炼事件线（季度一试，festival check 心跳调用） ========== */
  /** 季度键（年-季，与 SectSys.councilKey 同口径：seasonOf 0~3，一季 ≈91 日） */
  trialKey(p) {
    const y = Math.floor((p.day || 0) / 365);
    const season = (typeof Art !== 'undefined' && Art.seasonOf) ? Art.seasonOf(p) : 0;
    return `${y}-${season}`;
  },
  TRIALS: {
    kill: {
      title: '血亲复仇局', oath: '不杀之誓',
      text: '山道转角，一名与你有血债的旧仇拦路——眼里烧着现成的杀意。<br>杀了，旧恨得雪，然不杀之誓碎在当场；放了，到手的赏格就此作罢，然天道记你一善。',
      breakTxt: '血亲的债当前，你终究举起了剑——誓言碎在血里。',
      keepTxt: '你垂下手，侧身让开了路——那人的刀风擦着你耳边过去，你只当听了一阵风。（失了赏格，气运 +2）',
      keep: (p) => { KarmaSys.addFortune(2, true); },
    },
    still: {
      title: '当众挑衅', oath: '止戈之誓',
      text: '市集中央，一名修士当众讥你怯战，指名道姓要你接招——四下看客越聚越多。<br>应战，止戈之誓当场而碎；忍下，这一口气咽下去，反倒品出几分剑理。',
      breakTxt: '当众的火油泼到脸上，你终究应了这一战。',
      keepTxt: '你拂了拂袖，自人群中穿了过去——身后喧声渐远，心里那点剑理反倒清亮起来。（悟性 +1）',
      keep: (p) => { Cultivate.addInsight(p, 1); },
    },
    solo: {
      title: '结交良机', oath: '独行之道',
      text: '驿亭避雨，一位落魄修士与你拼了半张桌——言谈投契，对方郑重递来名帖，想与你结个道友。<br>伸手接了，独行之道就此而破；婉拒了，这份萍水之缘也就散在雨里。',
      breakTxt: '你接过名帖的那一刻，独行的道就走到了岔口。',
      keepTxt: '你双手拢袖：「心意领了，只是我行路惯了独身。」——雨停，各自上路。（气运 +1）',
      keep: (p) => { KarmaSys.addFortune(1, true); },
    },
  },
  /** 誓约试炼节拍：三誓（不杀/止戈/独行）各配季度试炼，每季每誓 ≤1 次；auto 静默默认守誓 */
  trialCheck(p, auto = false) {
    if (!p || p.dead || !p.oaths) return;
    if (!auto && (Battle.active || Story.active() || UI._popupResolve)) return;
    const key = this.trialKey(p);
    p.oaths.trial = p.oaths.trial || {};
    for (const id of ['kill', 'still', 'solo']) {
      if (!this.active(p, id) || p.oaths.trial[id + '#' + key]) continue;
      p.oaths.trial[id + '#' + key] = true;   // 置位在前防重入；守/破皆自此走一次性通道
      if (auto) {
        // auto 静默默认守誓：守誓大赏一次性入账，聚合入日报不弹窗
        this.TRIALS[id].keep(p);
        const agg = Game._offlineAgg = Game._offlineAgg || {};
        agg.oathTrial = (agg.oathTrial || 0) + 1;
        return;
      }
      this.trialPopup(p, id);
      return;   // 一次心跳至多开一场试炼
    }
  },
  async trialPopup(p, id) {
    const t = this.TRIALS[id];
    if (!t) return;
    Log.add(`【誓约试炼】${t.title}——${this.NAMES[id]}在身，天道正看着你怎么落子。`, 'event');
    const pick = await UI.popup({
      title: `誓约试炼 · ${t.title}`,
      html: `${t.text}<br><span class="tip-line">· 持守 <b>${this.NAMES[id]}</b> 中——守誓大赏一次性入账；破誓代价走天道旧例（心魔 +15、气运 -20、${this.BAN_DAYS} 日禁立）。</span>`,
      options: [
        { text: `守住誓言（${id === 'kill' ? '放行失赏，气运 +2' : id === 'still' ? '忍下，悟性 +1' : '婉拒，气运 +1'}）`, value: 'keep', primary: true },
        { text: '破誓', value: 'break' },
      ],
    });
    if (pick === 'break') {
      await this.breakOath(id, t.breakTxt);   // 破誓代价走既有 oathBanDay 通道（宽恕限次弹窗随行）
      return;
    }
    if (pick !== 'keep') return;   // ESC/遮罩——罪证不落，试炼本季不再开（天道不逼人）
    t.keep(p);
    Log.add(`【守誓】${t.keepTxt}`, 'gain');
    this.partnerComment(p, `方才那一幕我都看见了——你守住了自己的话。`, '誓约试炼守誓');
    if (typeof Story !== 'undefined' && Story.chron) Story.chron(`誓约试炼 · ${t.title}守誓`);
    Game.afterAction();
  },
};
