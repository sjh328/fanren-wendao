
/* ======================================================================
 * §11.10 v13 天骄榜 RankSys（江湖页：二十四修士与你的境界排名）
 * 登顶者得「天下第一」称号：全属性 +2%，每日首次查看再领气运。
 * ====================================================================== */
const RankSys = {
  /** v37（E244）：榜上功勋——问剑夺位/大比魁首/雷台了断胜局折算的榜序加分（小层等效）。
   *  排名自境界单轴变为可运营资产；缺字段防御读（老档经 migrate 补 0） */
  honorOf(p) { return (p && p.rankHonor) || 0; },
  /** 全榜：[{id:'me'|npcId, name, power, score}] 按 score 降序（score = 境界小层 + 我方功勋） */
  board(p) {
    const honor = this.honorOf(p);
    const rows = GameData.NPCS.filter(d => p.npcs[d.id] && p.npcs[d.id].alive)
      .map(d => ({ id: d.id, name: d.name, power: p.npcs[d.id].realmIdx * 4 + p.npcs[d.id].layer }));
    rows.push({ id: 'me', name: p.name + '（你）', power: p.realmIdx * 4 + p.layer, score: p.realmIdx * 4 + p.layer + honor });
    for (const r of rows) if (r.score == null) r.score = r.power;
    rows.sort((a, b) => b.score - a.score);
    return rows;
  },
  isTop(p) {
    // v37（E244）：功勋计入「天下第一」判定——榜序资产与登顶特权同口径
    const myScore = p.realmIdx * 4 + p.layer + this.honorOf(p);
    return GameData.NPCS.every(d => !p.npcs[d.id] || !p.npcs[d.id].alive || p.npcs[d.id].realmIdx * 4 + p.npcs[d.id].layer <= myScore);
  },
  /** 登顶每日气运：每天首次查看天骄榜且在榜首时领取 */
  dailyReward(p) {
    if (!this.isTop(p)) return false;
    const today = Math.floor(p.day);
    if ((p.topTitle || {}).day === today) return false;
    p.topTitle = { day: today };
    KarmaSys.addFortune(2);
    Log.add('【天骄榜】你名压群雄，独占鳌头——气运 +2。（每日登顶皆有小赏）', 'gain');
    return true;
  },
  /** v37（E244）：问剑夺位——对身前一位递问剑帖（强化切磋、点到为止），胜负按双方综合战力
   *  三档成算预估；胜则榜序对调（rankHonor 折算恰好越位的小层差）。日限 1 次（Daily.resetIfNew 单源） */
  async challengeAhead() {
    const p = Game.player;
    if (Battle.active) return;
    if (!Daily.resetIfNew(p, '_wenjianDay')) { UI.toast('今日已问过剑——剑意养锐，明日再约'); return; }
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    if (myIdx <= 0) { UI.toast('你已身居榜首——天上地下，再无问剑之靶'); return; }
    const ahead = rows[myIdx - 1];
    const st = p.npcs[ahead.id];
    if (!st || !st.alive) { UI.toast('身前一位无从问剑'); return; }
    if (NpcSys.isAway(p, ahead.id)) { UI.toast(`${ahead.name} 行游在外，旬末方归`); return; }
    // 三档成算：npcCombatPower（buildEnemy 口径反推）vs Stat.power（E227 同档位口径）
    const ratio = NpcSys.npcCombatPower(p, ahead.id) / Math.max(1, Stat.power(p));
    const odds = ratio >= 0.9 ? '胜算五五 · 势均力敌' : ratio >= 0.7 ? '胜算偏低 · 略处下风' : '胜算在握 · 可堪一战';
    const ok = await UI.popup({
      title: `问剑 · ${ahead.name}`,
      html: `你修书一封问剑帖，递与身前一位——点到为止的强化切磋，<b>胜则榜序对调</b>。<br>· 对手：<b>${Utils.esc(ahead.name)}</b>（${GameData.REALM_NAMES[Math.min(9, Math.floor(ahead.power / 4))]}${GameData.LAYER_NAMES[Utils.clamp(ahead.power % 4, 0, 3)]}）<br>· 成算：<b>${odds}</b><br><span class="tip-line">· 每日一问；落败无折损，唯榜上留名未改。当前功勋 ${this.honorOf(p)} 层。</span>`,
      options: [{ text: '递帖问剑', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    Log.add(`你向 <b>${ahead.name}</b> 递上问剑帖——一战定榜！`, 'event');
    if (typeof Story !== 'undefined' && Story.chron) Story.chron(`向 ${ahead.name} 问剑`);
    Battle.start(null, { enemy: NpcSys.buildEnemy(p, ahead.id), npcId: ahead.id, spar: true, wenjian: true, mapName: '问剑台' });
    Game.afterAction();   // v35（E143）：先 start 后 afterAction——防节庆在开战前触发后被静默丢弃
  },
  /** v37（E244）：问剑胜局——榜序对调：功勋补足「恰越身前一位」的小层差 */
  onWenjianWin(p, id) {
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    const tIdx = rows.findIndex(r => r.id === id);
    if (myIdx < 0 || tIdx !== myIdx - 1) return;
    const diff = rows[tIdx].score - rows[myIdx].score;
    p.rankHonor = this.honorOf(p) + diff + 1;
    Log.add('<b>问剑得胜</b>——榜上名次，自此对调！（功勋 +' + (diff + 1) + '）', 'gain');
  },
  render(p) {
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    const top = this.isTop(p);
    const myPower = p.realmIdx * 4 + p.layer;
    const topPower = Math.max(1, rows[0].power);
    // v37（E244）：榜位变动标注——与上次渲染快照对比，↑升 / ↓降（首见不标）
    const prev = (p.rankPrev && typeof p.rankPrev === 'object') ? p.rankPrev : null;
    const arrowOf = (r, i) => {
      if (!prev || typeof prev[r.id] !== 'number' || prev[r.id] === i) return '';
      return prev[r.id] > i ? ' <i class="rank-rel" style="color:var(--ok,#7fb069)">↑</i>' : ' <i class="rank-rel" style="color:#d05b5b">↓</i>';
    };
    // v21：榜行补血——关系标签 + 战力对比条 + 层差，扫一眼即知对手含金量
    const rowsHtml = rows.slice(0, 10).map((r, i) => {
      const st = r.id === 'me' ? null : p.npcs[r.id];
      const relTxt = st ? NpcSys.relLabel(p, r.id) : '';
      const gap = r.power - myPower;
      const gapTxt = r.id === 'me' ? '此即是你'
        : !st || !st.alive ? '' : (gap > 0 ? `高 ${gap} 小层` : gap < 0 ? `低 ${-gap} 小层` : '与你并肩');
      // v36（E227）：战力对比档位——npcCombatPower（buildEnemy 口径反推）vs Stat.power 同量纲三档
      let vsTxt = '';
      if (st && st.alive) {
        const ratio = NpcSys.npcCombatPower(p, r.id) / Math.max(1, Stat.power(p));
        vsTxt = (ratio >= 0.9 && ratio <= 1.1) ? '可敌' : (ratio >= 0.7 && ratio <= 1.3) ? '略逊' : '远逊';
      }
      const w = Math.round(Utils.clamp(r.power / topPower * 100, 5, 100));
      return `
      <div class="rank-row ${r.id === 'me' ? 'me' : ''}">
        <span class="rank-no ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span>
        <span class="rank-name">${Utils.esc(r.name)}${arrowOf(r, i)}${relTxt ? ` <i class="rank-rel">${relTxt}</i>` : ''}${vsTxt ? ` <i class="rank-rel">${vsTxt}</i>` : ''}</span>
        <span class="rank-bar"><span style="width:${w}%"></span></span>
        <span class="rank-pow">${GameData.REALM_NAMES[Math.min(9, Math.floor(r.power / 4))]}${GameData.LAYER_NAMES[Utils.clamp(r.power % 4, 0, 3)]}<i class="rank-gap">${gapTxt}</i></span>
      </div>`;
    }).join('');
    p.rankPrev = rows.reduce((m, r, i) => (m[r.id] = i, m), {});
    // v36（E227）：距上一位还差 X 小层——登顶前的追赶目标感（境界排序口径不变）
    const ahead = myIdx > 0 ? rows[myIdx - 1] : null;
    const chaseTip = ahead ? `<div class="tip-line">· 距上一位 <b>${Utils.esc(ahead.name)}</b> 还差 <b class="hl">${ahead.power - myPower}</b> 小层——境界精进，名次自至。</div>` : '';
    return `
    <div class="card">
      <div class="card-title">✦ 天骄榜 ${top ? '<span class="tag warn">天下第一 · 全属性 +2%</span>' : `<span class="tag">你的排名 · 第 ${myIdx + 1} 位</span>`}<button class="btn btn-sm" data-action="act-wenjian" style="margin-left:auto" title="向身前一位递问剑帖——点到为止的强化切磋，胜则榜序对调（每日一次）">⚔ 问剑</button></div>
      <div class="card-desc">修行界在世风云修士与你的排名（境界小层 + 功勋排序；殒身者自榜上除名）。问剑夺位、大比魁首、雷台了断皆折算功勋——当前 <b>${this.honorOf(p)}</b> 层。登顶者名动天下：全属性 +2%，每日另有气运小赏。</div>
      <div class="tip-line">· 你的综合战力 ⚔ <b>${Utils.fmtNum(Stat.power(p))}</b>（装备/功法/灵兽一应计入）——境界是名次，战力是底气。</div>
      ${chaseTip}
      <div class="tip-line">· 登天塔本档最佳 <b>第 ${p.counters.towerBest || 0} 层</b>${(typeof Meta !== 'undefined' && Meta.data.towerBest) ? `｜跨世最佳 第 ${Meta.data.towerBest} 层` : ''}——塔中十层，亦是真仙终章的敲门砖。</div>
      <div class="rank-list">${rowsHtml}</div>
    </div>`;
  },
};
