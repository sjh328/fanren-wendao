
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
    this.markEverTop(p);   // v41（E419）：登顶落旗（首次入年表）
    const today = Math.floor(p.day);
    if ((p.topTitle || {}).day === today) return false;
    p.topTitle = { day: today };
    KarmaSys.addFortune(2);
    if (typeof Game !== 'undefined' && Game.milestone) Game.milestone('msTop', '天 骄 第 一', '#e8d9a0');   // v38（E328）里程碑
    Log.add('【天骄榜】你名压群雄，独占鳌头——气运 +2。（每日登顶皆有小赏）', 'gain');
    return true;
  },
  /** v37（E244）：问剑夺位——对身前一位递问剑帖（强化切磋、点到为止），胜负按双方综合战力
   *  三档成算预估；胜则榜序对调（rankHonor 折算恰好越位的小层差）。日限 1 次（Daily.resetIfNew 单源）
   *  v41（E420）：递帖弹窗加风险自选档（RISK_BANDS 同段单源，雷台 E445 同源消费）——
   *  稳 ×1.0 无罚 / 险 ×1.4 败北功勋折半 / 搏命 ×1.8 败北功勋倒扣全差；
   *  v41（E419③）：日常问剑不再入年表（仅首次夺位/登顶入册，见 onWenjianWin / markEverTop）；
   *  v41（E421）：宿敌回帖——结怨之敌在问剑帖上回一句场面话（lineFor hostile 台词池，纯渲染） */
  async challengeAhead() {
    const p = Game.player;
    if (Battle.active) return;
    // v38（E306）：止戈之誓——不发问剑
    if (typeof OathSys !== 'undefined' && OathSys.active(p, 'still')) { UI.toast('止戈之誓在手——问剑之约，皆非此道'); return; }
    if (!Daily.resetIfNew(p, '_wenjianDay')) { UI.toast('今日已问过剑——剑意养锐，明日再约'); return; }
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    if (myIdx <= 0) { UI.toast('你已身居榜首——天上地下，再无问剑之靶'); return; }
    // v38（E340）：称号「天骄第一」——可越一位递帖（隔位问剑，声名所至）；v41（E419）：称号改「曾登顶」可佩戴，skip 随 ctx 落到胜局结算
    const skip = Game.titleOn(p, 'wenjian2') && myIdx >= 2 ? 2 : 1;
    const ahead = rows[myIdx - skip];
    const st = p.npcs[ahead.id];
    if (!st || !st.alive) { UI.toast('身前一位无从问剑'); return; }
    if (NpcSys.isAway(p, ahead.id)) { UI.toast(`${ahead.name} 行游在外，旬末方归`); return; }
    // v40（E374）：三档带——npcCombatPower（已并入 parity 乘区）vs Stat.power 定带，
    // 对手属性按带生成（旗鼓相当 ≈1.00 / 劲敌 ≈0.90 / 鏖战 ≈0.78），估算与实战同口径
    const band = NpcSys.rivalBand(p, ahead.id);
    // v41（E420）：带比语义 = 对手战力/我方战力——劲敌即敌弱我一筹，胜算文案随带走（带名强度语）
    const odds = band.name === '旗鼓相当' ? '胜算五五 · 势均力敌' : band.name === '劲敌' ? '胜算偏高 · 敌弱我一筹' : '胜算在握 · 可堪一战';
    // v41（E420）：风险自选档三选一
    const risks = (GameData.BALANCE.COMBAT.RISK_BANDS || []).slice();
    const riskOf = i => risks[i] || { name: '旗鼓相当', risk: '稳', mult: 1.0, lossPenalty: 0, lossTxt: '' };
    // v41（E421）：宿敌回帖（lineFor hostile 仅在结怨 rel ≤ -15 时命中，无恩怨不显）
    const grudgeLine = NpcSys.lineFor(p, ahead.id, 'hostile');
    const ok = await UI.popup({
      title: `问剑 · ${ahead.name}`,
      html: `你修书一封问剑帖，递与身前一位——点到为止的强化切磋，<b>胜则榜序对调</b>。<br>· 对手：<b>${Utils.esc(ahead.name)}</b>（${GameData.REALM_NAMES[Math.min(9, Math.floor(ahead.power / 4))]}${GameData.LAYER_NAMES[Utils.clamp(ahead.power % 4, 0, 3)]}）<br>· 成算：<b>${odds}</b><br>· 险档 <select id="wj-risk">${risks.map((r, i) => `<option value="${i}" ${i === 0 ? 'selected' : ''}>${r.risk}（${r.name} · 赏格功勋 ×${r.mult}${r.lossTxt ? `，${r.lossTxt}` : '，败北无罚'}）</option>`).join('')}</select><br>${grudgeLine ? `<div class="tip-line">· ${Utils.esc(ahead.name)} 在帖尾回了一句：<b>${grudgeLine}</b></div>` : ''}<span class="tip-line">· 每日一问；当前功勋 ${this.honorOf(p)} 层。</span>`,
      options: [{ text: '递帖问剑', value: true, primary: true }, { text: '再等等', value: false }],
    });
    if (!ok) return;
    const ri = riskOf(Number((typeof document !== 'undefined' && document.getElementById('wj-risk')) ? document.getElementById('wj-risk').value : 0));
    Log.add(`你向 <b>${ahead.name}</b> 递上问剑帖——一战定榜！（险档「${ri.risk}」· ${ri.name}）`, 'event');
    Battle.start(null, { enemy: NpcSys.buildEnemy(p, ahead.id, 0, { ratio: band.ratio, bandName: band.name }), npcId: ahead.id, spar: true, wenjian: true, mapName: '问剑台', wenjianSkip: skip, risk: ri });
    Game.afterAction();   // v35（E143）：先 start 后 afterAction——防节庆在开战前触发后被静默丢弃
  },
  /** v37（E244）：问剑胜局——榜序对调：功勋补足「恰越身前一位」的小层差
   *  v41（E419）：接受隔位问剑（tIdx === myIdx - skip，skip=2 胜局原零功勋零换榜的死锁），
   *  功勋按 diff + skip 发；v41（E419③）：仅首次夺位入年表，日常问剑不再入册；
   *  v41（E420）：功勋随险档乘区发（RISK_BANDS.mult，稳档 ×1.0 逐字不变） */
  onWenjianWin(p, id, skip = 1, risk = null) {
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    const tIdx = rows.findIndex(r => r.id === id);
    if (myIdx < 0 || tIdx !== myIdx - skip) return;
    const diff = rows[tIdx].score - rows[myIdx].score;
    const gain = Math.ceil((diff + skip) * ((risk && risk.mult) || 1));
    p.rankHonor = this.honorOf(p) + gain;
    Log.add('<b>问剑得胜</b>——榜上名次，自此对调！（功勋 +' + gain + (risk && risk.mult > 1 ? `，险档「${risk.risk}」×${risk.mult}` : '') + '）', 'gain');
    p.flags = p.flags || {};
    if (!p.flags.wenjianFirst) {   // v41（E419③）：首次夺位入册
      p.flags.wenjianFirst = true;
      if (typeof Story !== 'undefined' && Story.chron) Story.chron(`初问剑夺位·胜${(rows[tIdx] || {}).name || ''}`);
    }
    this.markEverTop(p);
  },
  /** v41（E420）：问剑败北罚——险档功勋折半差、搏命倒扣全差（稳档无罚）；功勋为零时不倒扣 */
  onWenjianLoss(p, id, risk = null) {
    const pen = (risk && risk.lossPenalty) || 0;
    if (pen <= 0 || !this.honorOf(p)) return;
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    const tIdx = rows.findIndex(r => r.id === id);
    if (myIdx < 0 || tIdx < 0) return;
    const diff = Math.max(0, rows[tIdx].score - rows[myIdx].score);
    const lose = Math.ceil(diff * pen);
    if (lose <= 0) return;
    p.rankHonor = Math.max(0, this.honorOf(p) - lose);
    Log.add(`<b>问剑败北</b>——${risk.risk === '搏命' ? '搏命之约，功勋倒扣全差' : '险档之约，功勋折半差'} -${lose}。`, 'loss');
  },
  /** v41（E445）⑥ 修偏：雷台败北罚——险档功勋折半差、搏命倒扣全差（稳档无罚）；功勋为零时不倒扣。
   *  与 onWenjianLoss 同式（diff × lossPenalty，E445⑥「与问剑同源」验收口径），battle.js defeat()
   *  的 showdown 分支消费——补上此前「选项公示败罚、败局从不兑现」的半截接线 */
  onConfrontLoss(p, id, risk = null) {
    const pen = (risk && risk.lossPenalty) || 0;
    if (pen <= 0 || !this.honorOf(p)) return;
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    const tIdx = rows.findIndex(r => r.id === id);
    if (myIdx < 0 || tIdx < 0) return;
    const diff = Math.max(0, rows[tIdx].score - rows[myIdx].score);
    const lose = Math.ceil(diff * pen);
    if (lose <= 0) return;
    p.rankHonor = Math.max(0, this.honorOf(p) - lose);
    Log.add(`<b>雷台败北</b>——${risk.risk === '搏命' ? '搏命之约，功勋倒扣全差' : '险档之约，功勋折半差'} -${lose}。`, 'loss');
  },
  /** v41（E419）：登顶落旗（p.flags.everTop 子字段，零新顶层）——榜面渲染/登顶日赏/问剑换榜
   *  三口皆查；首次登顶入年表一句（E419③「登顶入册」），称号 t_top 自此按「曾登顶」可佩戴 */
  markEverTop(p) {
    if (!this.isTop(p)) return;
    p.flags = p.flags || {};
    if (!p.flags.everTop) {
      p.flags.everTop = true;
      if (typeof Story !== 'undefined' && Story.chron) Story.chron('名压天骄，登临榜首');
    }
  },
  render(p) {
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    const top = this.isTop(p);
    // v41（E419/E421 复核取舍注记）：下两处为渲染路径一次性落旗（幂等、消费端纯展示、无经济后果），
    // 随下次行动 afterAction 落盘；裸渲染场景由 visibilitychange/beforeunload autoSave 兜底。
    // 迁 afterAction/dailySettle 覆盖不了「境界/功勋自然登顶不经任何 rank 钩子」的兜底语义，
    // 工程量与收益不成比例——就地留档取舍（E429② 同版「渲染纯只读」原则的已记录例外）
    this.markEverTop(p);   // v41（E419）：榜面亦落 everTop 旗（大比魁首/雷台功勋自然推上榜首的路径同此入册）
    const myPower = p.realmIdx * 4 + p.layer;
    const topPower = Math.max(1, rows[0].power);
    // v41（E421）：蝉联榜首小记——在位 N 日本世连庄自首次登顶日起算；跌落榜首即清，再登顶重新起算
    //（取舍同上：渲染期一次性落旗，随下次行动落盘）
    p.flags = p.flags || {};
    if (top) { if (p.flags.everTopDay == null) p.flags.everTopDay = Math.floor(p.day || 0); }
    else if (p.flags.everTopDay != null) delete p.flags.everTopDay;
    const topTenure = top && p.flags.everTopDay != null ? Math.max(1, Math.floor(p.day || 0) - p.flags.everTopDay + 1) : 0;
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
      // v41（E420）：带名改强度语（旗鼓相当/劲敌/鏖战，RIVAL_BANDS 单源同语）
      let vsTxt = '';
      if (st && st.alive) {
        const ratio = NpcSys.npcCombatPower(p, r.id) / Math.max(1, Stat.power(p));
        vsTxt = (ratio >= 0.9 && ratio <= 1.1) ? '旗鼓相当' : (ratio >= 0.7 && ratio <= 1.3) ? '劲敌' : '鏖战';
      }
      // v41（E421）：恩怨小标——结怨之敌在榜上一眼可辨（NpcSys.grudge 单源，无恩怨不显）
      const grudgeTxt = st && st.grudge && st.alive ? ' <i class="rank-rel" style="color:#d05b5b">与你有隙</i>' : '';
      const w = Math.round(Utils.clamp(r.power / topPower * 100, 5, 100));
      return `
      <div class="rank-row ${r.id === 'me' ? 'me' : ''}">
        <span class="rank-no ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span>
        <span class="rank-name">${Utils.esc(r.name)}${arrowOf(r, i)}${relTxt ? ` <i class="rank-rel">${relTxt}</i>` : ''}${vsTxt ? ` <i class="rank-rel">${vsTxt}</i>` : ''}${grudgeTxt}</span>
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
      <div class="card-title">✦ 天骄榜 ${top ? `<span class="tag warn">天下第一 · 全属性 +2%</span>${topTenure > 0 ? `<span class="tag" title="本世连庄——自你首次登临榜首之日起算">在位 ${topTenure} 日</span>` : ''}` : `<span class="tag">你的排名 · 第 ${myIdx + 1} 位</span>`}<button class="btn btn-sm" data-action="act-wenjian" style="margin-left:auto" title="向身前一位递问剑帖——点到为止的强化切磋，胜则榜序对调（每日一次；险档可自选，赏格功勋随之浮动）">⚔ 问剑</button></div>
      <div class="card-desc">修行界在世风云修士与你的排名（境界小层 + 功勋排序；殒身者自榜上除名）。问剑夺位、大比魁首、雷台了断皆折算功勋——当前 <b>${this.honorOf(p)}</b> 层。登顶者名动天下：全属性 +2%，每日另有气运小赏。</div>
      <div class="tip-line">· 你的综合战力 ⚔ <b>${Utils.fmtNum(Stat.power(p))}</b>（装备/功法/灵兽一应计入）——境界是名次，战力是底气。</div>
      ${chaseTip}
      <div class="tip-line">· 登天塔本档最佳 <b>第 ${p.counters.towerBest || 0} 层</b>${(typeof Meta !== 'undefined' && Meta.data.towerBest) ? `｜跨世最佳 第 ${Meta.data.towerBest} 层` : ''}——塔中十层，亦是真仙终章的敲门砖。</div>
      <div class="rank-list">${rowsHtml}</div>
    </div>`;
  },
};
