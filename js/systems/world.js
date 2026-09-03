
/* ======================================================================
 * §23 世界大事件 WorldSys（每 100 游戏年一次全图大事，永久改变格局）
 * ====================================================================== */
const WorldSys = {
  freshWorld() {
    return { nextEventYear: 100, pending: null, history: [], magicMaps: [], preachUntil: 0, ruinsUntil: 0, warUntil: 0, priceMul: 1, market: null };
  },
  year(p) { return Math.floor((p.day || 0) / 365) + 1; },
  isMagic(p, mapId) { const w = p.world; return !!(w && w.magicMaps && w.magicMaps.includes(mapId)); },
  preachActive(p) { const w = p.world; return !!(w && w.preachUntil && this.year(p) <= w.preachUntil); },
  ruinsActive(p) { const w = p.world; return !!(w && w.ruinsUntil && this.year(p) <= w.ruinsUntil); },
  warActive(p) { const w = p.world; return !!(w && w.warUntil && this.year(p) <= w.warUntil); },
  priceMul(p) { return this.warActive(p) ? 1.15 : 1; },
  /* ---------- v5：坊市行情 ---------- */
  /** 每 30 游戏日换一茬市况种子；种子持久化，读档后行情不变 */
  marketState(p) {
    const w = p.world;
    if (!w) return { seed: 0, next: 0 };
    const day = Math.floor(p.day || 0);
    if (!w.market || day >= w.market.next) {
      w.market = { seed: Utils.hashStr('mkt' + day + ':' + Math.floor(Math.random() * 1e9)), next: day + 30 };
    }
    return w.market;
  },
  /** 单件商品的行情系数：0.8 ~ 1.2，同 30 日内稳定（确定性哈希） */
  marketMul(p, itemId) {
    const m = this.marketState(p);
    const h = Utils.hashStr(itemId + '@' + m.seed);
    return 0.8 + (h % 1001) / 1000 * 0.4;
  },
  marketDaysLeft(p) {
    const m = this.marketState(p);
    return Math.max(0, m.next - Math.floor(p.day || 0));
  },
  /** 每逢年份推进调用（displayYear = floor(day/365)+1） */
  onYear(p, y) {
    const w = p.world;
    if (!w) return;
    NpcSys.yearTick(p, y);
    if (w.preachUntil && y > w.preachUntil) { w.preachUntil = 0; Log.add('圣地讲道落幕，道音散入天地之间。', 'system'); }
    if (w.ruinsUntil && y > w.ruinsUntil) { w.ruinsUntil = 0; Log.add('上古秘境重归虚妄，机缘之门缓缓关闭。', 'system'); }
    if (w.warUntil && y > w.warUntil) { w.warUntil = 0; w.priceMul = 1; Log.add('宗门大战落幕，各方罢兵言和，物价渐归平常。', 'system'); }
    if (y >= w.nextEventYear) { w.nextEventYear = y + 100; this.fireEvent(p, y); }
  },
  fireEvent(p, y) {
    const w = p.world;
    const type = Utils.pickWeighted({ demon: 30, preach: 25, ruins: 25, war: 20 });
    const ev = { type, year: y };
    let text = '';
    if (type === 'demon') {
      const candidates = GameData.MAPS.filter(m => m.id !== 'village' && !w.magicMaps.includes(m.id));
      const map = candidates.length ? Utils.pick(candidates) : Utils.pick(GameData.MAPS);
      w.magicMaps.push(map.id);
      ev.mapId = map.id;
      text = `<b>魔界入侵</b>——魔气吞没 ${map.name}！此后其地化为<b>魔域</b>：妖魔狂化暴增，凶险倍之，然魔物所获亦丰。`;
    } else if (type === 'preach') {
      w.preachUntil = y + 10;
      text = `<b>圣地讲道</b>——道音涤荡神魂，此后十年天下修士<b>悟性倍增</b>。`;
    } else if (type === 'ruins') {
      w.ruinsUntil = y + 20;
      text = `<b>上古秘境现世</b>——此后二十年秘宝频现，历练中的<b>宝箱与机缘遍地</b>。`;
    } else {
      w.warUntil = y + 30;
      w.priceMul = 1.15;
      text = `<b>宗门大战</b>——此后三十年宗门悬赏暴涨，坊市<b>物价腾贵</b>。`;
    }
    w.history.push({ year: y, type });
    if (w.history.length > 8) w.history.shift();
    w.pending = ev;
    const def = GameData.WORLD_EVENTS.find(e => e.id === type);
    Log.add(`【天下大事 · 第${y}年】${text}`, 'system');
    Log.add(`${def ? def.name : ''}之卡已现于「游历」页——参与或观望，一念自决。`, 'event');
  },
  /** 参与大事件：各得其赏 */
  async joinEvent() {
    const p = Game.player;
    const w = p.world;
    if (!w.pending) return;
    const ev = w.pending;
    w.pending = null;
    if (ev.type === 'demon') {
      const map = GameData.MAPS.find(m => m.id === ev.mapId) || GameData.MAPS[1];
      Log.add('你奔赴魔域前线，与狂化的魔物战作一团！', 'event');
      const mid = Utils.pickWeighted(map.pool); // 地图池为加权对象 [{id, weight}]
      const en = buildMonster(mid, Math.max(0, p.realmIdx * 4 + 2 - GameData.MONSTERS[mid].power));
      en.elite = true;
      en.hpMax = Math.round(en.hpMax * 1.4); en.atk = Math.round(en.atk * 1.25);
      en.expGain = Math.round(en.expGain * 1.6); en.stoneGain = Math.round(en.stoneGain * 1.8);
      en.hp = en.hpMax;
      Game.afterAction();
      Battle.start(null, { enemy: en, weType: 'demon', mapName: '魔域前线' });
      return;
    }
    if (ev.type === 'preach') {
      const gain = Math.round(260 * GameData.eco(p.realmIdx));
      Cultivate.addExp(p, gain);
      p.insight = Math.min(100, p.insight + 15);
      Time.add(10);
      Log.add(`你在圣地一坐十日，听道音如饮甘露——修为 +${Utils.fmtNum(gain)}，突破感悟 +15。`, 'gain');
    } else if (ev.type === 'ruins') {
      Bag.addItem('m_gupian', 2);
      const stones = Math.round(60 * GameData.stoneEco(p.realmIdx));
      Bag.addStones(stones);
      Time.add(10);
      Log.add(`你于现世秘境中寻得上古法宝碎片 ×2、灵石 ${Utils.fmtNum(stones)}。`, 'gain');
    } else if (ev.type === 'war') {
      const ids = Object.keys(p.npcs).filter(id => p.npcs[id].alive && p.partner !== id && !(p.sworn || []).includes(id));
      const nid = ids.length ? Utils.pick(ids) : null;
      if (nid) {
        Log.add('你投入宗门战团，与敌对修士战作一团！', 'event');
        Game.afterAction();
        Battle.start(null, { enemy: NpcSys.buildEnemy(p, nid), npcId: nid, mode: 'war', mapName: '宗门战场' });
        return;
      }
      const stones = Math.round(50 * GameData.stoneEco(p.realmIdx));
      Bag.addStones(stones);
      Time.add(10);
      Log.add(`你在战乱中辗转护送商旅，得灵石 ${Utils.fmtNum(stones)}。`, 'gain');
    }
    Game.afterAction();
  },
  /** 观望：不参与 */
  async skipEvent() {
    const w = Game.player.world;
    if (!w.pending) return;
    w.pending = null;
    Log.add('你选择静观其变——天下大势，终究与局中人无碍。', 'info');
    Game.afterAction();
  },
};
