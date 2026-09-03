
/* ======================================================================
 * §11.10 v13 天骄榜 RankSys（江湖页：二十四修士与你的境界排名）
 * 登顶者得「天下第一」称号：全属性 +2%，每日首次查看再领气运。
 * ====================================================================== */
const RankSys = {
  /** 全榜：[{id:'me'|npcId, name, power, alive}] 按战力降序 */
  board(p) {
    const rows = GameData.NPCS.filter(d => p.npcs[d.id] && p.npcs[d.id].alive)
      .map(d => ({ id: d.id, name: d.name, power: p.npcs[d.id].realmIdx * 4 + p.npcs[d.id].layer }));
    rows.push({ id: 'me', name: p.name + '（你）', power: p.realmIdx * 4 + p.layer });
    rows.sort((a, b) => b.power - a.power);
    return rows;
  },
  isTop(p) {
    const myPow = p.realmIdx * 4 + p.layer;
    return GameData.NPCS.every(d => !p.npcs[d.id] || !p.npcs[d.id].alive || p.npcs[d.id].realmIdx * 4 + p.npcs[d.id].layer <= myPow);
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
  render(p) {
    const rows = this.board(p);
    const myIdx = rows.findIndex(r => r.id === 'me');
    const top = this.isTop(p);
    const rowsHtml = rows.slice(0, 10).map((r, i) => `
      <div class="rank-row ${r.id === 'me' ? 'me' : ''}">
        <span class="rank-no ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span>
        <span class="rank-name">${Utils.esc(r.name)}</span>
        <span class="rank-pow">${GameData.REALM_NAMES[Math.min(9, Math.floor(r.power / 4))]}${GameData.LAYER_NAMES[Utils.clamp(r.power % 4, 0, 3)]}</span>
      </div>`).join('');
    return `
    <div class="card">
      <div class="card-title">✦ 天骄榜 ${top ? '<span class="tag warn">天下第一 · 全属性 +2%</span>' : `<span class="tag">你的排名 · 第 ${myIdx + 1} 位</span>`}</div>
      <div class="card-desc">修行界二十四位风云人物与你的境界排名。登顶者名动天下：全属性 +2%，每日另有气运小赏。</div>
      <div class="rank-list">${rowsHtml}</div>
    </div>`;
  },
};
