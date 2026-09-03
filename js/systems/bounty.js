
/* ======================================================================
 * §11.8 v13 悬赏任务板 BountySys（坊市每日刷新三张悬赏）
 * 类型：猎杀妖兽 / 上交材料 / 切磋获胜；未领的悬赏可存续两日。
 * ====================================================================== */
const BountySys = {
  freshBounties(p) {
    const rp = p.realmIdx * 4 + p.layer;
    const list = [];
    // 猎杀
    const pool = SectSys.taskMonsters(rp);
    if (pool.length) {
      const mid = Utils.pick(pool);
      const need = Utils.rand(3, 6);
      list.push({ type: 'kill', target: mid, need, progress: 0, name: `猎杀 · ${GameData.MONSTERS[mid].name}`, desc: `击杀 ${GameData.MONSTERS[mid].name} ×${need}` });
    }
    // 收集
    const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 1, 1, 4);
    const mats = GameData.matsByTier(tier);
    if (mats.length) {
      const mid = Utils.pick(mats);
      const need = Utils.rand(3, 6);
      list.push({ type: 'collect', target: mid, need, progress: 0, name: `收购 · ${GameData.ITEMS[mid].name}`, desc: `上交 ${GameData.ITEMS[mid].name} ×${need}` });
    }
    // 切磋
    list.push({ type: 'spar', target: null, need: 1, progress: 0, name: '较技 · 以武会友', desc: '赢得一场切磋（江湖页发起）' });
    return list;
  },
  stateOf(p) {
    if (!p.bounties) p.bounties = { day: Math.floor(p.day), list: [] };
    const today = Math.floor(p.day);
    if (!p.bounties.list.length || today - p.bounties.day > 2) {
      p.bounties = { day: today, list: this.freshBounties(p) };
    }
    return p.bounties;
  },
  rewards(p) {
    const realm = p.realmIdx;
    return { stones: Math.round(60 * GameData.stoneEco(realm)), contrib: 25 + realm * 15 };
  },
  submit(idx) {
    const p = Game.player;
    const B = this.stateOf(p);
    const t = B.list[idx];
    if (!t || t.type !== 'collect' || t.progress >= t.need) return;
    const have = Bag.count(t.target);
    if (have <= 0) { UI.toast('背包中没有所需材料'); return; }
    const take = Math.min(have, t.need - t.progress);
    Bag.removeItem(t.target, take);
    t.progress += take;
    Log.add(`你把 ${GameData.ITEMS[t.target].name} ×${take} 交予悬赏行商。`, 'info');
    if (t.progress >= t.need) Log.add('悬赏已然达成，可领取赏格！', 'gain');
    Game.afterAction();
  },
  claim(idx) {
    const p = Game.player;
    const B = this.stateOf(p);
    const t = B.list[idx];
    if (!t || t.progress < t.need) return;
    let r = this.rewards(p);
    if (typeof SectSys !== 'undefined' && SectSys.commandActive && SectSys.commandActive(p, 'drill')) r = { stones: Math.round(r.stones * 1.5), contrib: Math.round(r.contrib * 1.5) };   // v19 长老令·演武
    if (Utils.chance(25)) KarmaSys.addFortune(2);
    Ambience.sfx('bounty');
    let chainTxt = '';
    // v19 连锁悬赏：赏格 ×1.6、目标 +2，代代加码
    const mul = (t.chain || 0) > 0 ? 1 + t.chain * 0.6 : 1;
    const gainStones = Math.round(r.stones * mul);
    Bag.addStones(gainStones);
    if (p.sect) p.sect.contrib += Math.round(r.contrib * mul);
    Log.add(`悬赏【${t.name}】交付！赏得灵石 ${Utils.fmtNum(gainStones)}${p.sect ? `、宗门贡献 +${Math.round(r.contrib * mul)}` : ''}。`, 'gain');
    if (!t.chain && Utils.chance(25) && (t.type === 'kill' || t.type === 'collect')) {
      const nt = { ...t, need: t.need + 2, progress: 0, chain: 1, name: `连锁 · ${t.name.replace(/^连锁 · /, '')}`, desc: `${t.desc.replace(/×\d+/, `×${t.need + 2}`)}（连锁 · 赏格 ×1.6）` };
      B.list[idx] = nt;
      chainTxt = '行商追加了一张<b>连锁悬赏</b>——目标更多，赏格更厚！';
    } else {
      B.list[idx] = null;
    }
    if (chainTxt) Log.add(chainTxt, 'event');
    Game.afterAction();
  },
  /** 战斗胜利钩子（Battle.victory 调用） */
  onKill(monsterId) {
    const p = Game.player;
    if (!p.bounties) return;
    for (const t of p.bounties.list) {
      if (t && t.type === 'kill' && t.target === monsterId && t.progress < t.need) {
        t.progress++;
        if (t.progress >= t.need) Log.add('悬赏猎杀已然达成，可去坊市领取赏格！', 'gain');
        else Log.add(`悬赏进度：${t.progress}/${t.need}。`, 'info');
      }
    }
  },
  /** 切磋胜利钩子 */
  onSpar() {
    const p = Game.player;
    if (!p.bounties) return;
    for (const t of p.bounties.list) {
      if (t && t.type === 'spar' && t.progress < t.need) {
        t.progress++;
        Log.add('悬赏【以武会友】已然达成，可去坊市领取赏格！', 'gain');
      }
    }
  },
};
