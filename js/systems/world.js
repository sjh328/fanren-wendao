
/* ======================================================================
 * §23 世界大事件 WorldSys（v34：首现 2~4 年、此后 1~3 年一遇——与实玩节奏同校）
 *  v30 曾按「12~20 年周目」钉首现 10~14 年，但实算漏计闭关 1.6×与多源入账，实玩一周目仅 5~6 年
 *  → 十二类大事对正常玩家整周目零触发，世界活性整根支柱事实死亡。v34 随 ×5.4 曲线重定时。
 * ====================================================================== */
const WorldSys = {
  freshWorld() {
    // v34（A3）：首次大事 2~4 年（r3~r5 段），此后 1~3 年一遇——一周目 2~4 场，多周目/仙界长岁持续供应
    // v33（E91）：补 lingyiUntil（灵疫当年药价腾贵）；priceMul 死字段删除（priceMul() 由 warActive/rebuildUntil 实时重算，字段从未被读）
    return { nextEventYear: 2 + Utils.rand(0, 2), _evResched34: true, pending: null, history: [], magicMaps: [], preachUntil: 0, ruinsUntil: 0, warUntil: 0, lingchaoUntil: 0, beastMaps: [], market: null, rebuildUntil: 0, turmoilUntil: 0, lingyiUntil: 0 };
  },
  year(p) { return Math.floor((p.day || 0) / 365) + 1; },
  isMagic(p, mapId) { const w = p.world; return !!(w && w.magicMaps && w.magicMaps.includes(mapId)); },
  preachActive(p) { const w = p.world; return !!(w && w.preachUntil && this.year(p) <= w.preachUntil); },
  ruinsActive(p) { const w = p.world; return !!(w && w.ruinsUntil && this.year(p) <= w.ruinsUntil); },
  warActive(p) { const w = p.world; return !!(w && w.warUntil && this.year(p) <= w.warUntil); },
  /** v20 灵潮 / 兽潮判定 */
  lingchaoActive(p) { const w = p.world; return !!(w && w.lingchaoUntil && this.year(p) <= w.lingchaoUntil); },
  beastWaveActive(p, mapId) { const w = p.world; return !!(w && w.beastMaps && w.beastMaps.some(b => b.map === mapId && this.year(p) <= b.until)); },
  /** v33（E91）：灵疫当年「药价腾贵」落地——事件原只写文案，当年药价纹丝不动。
   *  丹药与灵药材市价 ×1.15，买卖两侧同乘（ratio 不变，无倒卖套利口；次年转瘟后重建折价不变） */
  HERBS: ['m_lingcao', 'm_lingzhi', 'm_xuelian', 'm_xuecan'],
  isHerb(id) { return this.HERBS.includes(id); },
  herbMul(p) {
    const w = p.world;
    if (!w || !w.lingyiUntil) return 1;
    if (this.year(p) > w.lingyiUntil) { w.lingyiUntil = 0; return 1; }   // 过期自清
    return 1.15;
  },
  priceMul(p) {
    let mul = this.warActive(p) ? 1.15 : 1;
    // v32（F3）灵疫次年回响：瘟后重建，物料折价（市况 -10%）
    const w = p.world;
    if (w && w.rebuildUntil) {
      const y2 = Math.floor((p.day || 0) / 365) + 1;
      if (y2 <= w.rebuildUntil) mul *= 0.9;
      else w.rebuildUntil = 0;
    }
    return mul;
  },
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
    // v29/v30/v34：旧档一次性迁移——大事周期改短后，从未触发过大事的旧档重掷首次年份（_evResched34 防重复执行）
    if (!w._evResched34 && !(w.history && w.history.length)) { w.nextEventYear = 2 + Utils.rand(0, 2); w._evResched34 = true; }   // v34：重掷至 2~4 年新窗
    NpcSys.yearTick(p, y);
    if (w.preachUntil && y > w.preachUntil) { w.preachUntil = 0; Log.add('圣地讲道落幕，道音散入天地之间。', 'system'); }
    if (w.ruinsUntil && y > w.ruinsUntil) { w.ruinsUntil = 0; Log.add('上古秘境重归虚妄，机缘之门缓缓关闭。', 'system'); }
    if (w.warUntil && y > w.warUntil) { w.warUntil = 0; Log.add('宗门大战落幕，各方罢兵言和，物价渐归平常。', 'system'); }   // v33：priceMul 死字段写入删除（E91 同批——priceMul() 实时重算）
    if (w.lingchaoUntil && y > w.lingchaoUntil) { w.lingchaoUntil = 0; Log.add('灵潮渐渐退去，天地灵气复归平常。', 'system'); }
    if (w.beastMaps && w.beastMaps.length) {
      const rest = w.beastMaps.filter(b => y <= b.until);
      if (rest.length !== w.beastMaps.length) { w.beastMaps = rest; if (!rest.length) Log.add('兽潮退去，出山的群兽重归深山。', 'system'); }
    }
    if (y >= w.nextEventYear) { w.nextEventYear = y + 1 + Utils.rand(0, 2); this.fireEvent(p, y); }   // v34（A3）：此后 1~3 年一遇（v30 的 18~30 对实玩周目仍是从不可及）
  },
  fireEvent(p, y) {
    const w = p.world;
    // v30 扩池：新增 NPC 牵连型四事件
    const type = Utils.pickWeighted({ demon: 20, preach: 16, ruins: 16, war: 14, lingchao: 11, beastwave: 8, xianmen: 4, meteor: 3, zhongbao: 9, neiluan: 8, qiren: 8, lingyi: 7 });
    const ev = { type, year: y };
    let text = '';
    if (type === 'demon') {
      const candidates = GameData.MAPS.filter(m => m.id !== 'village' && !w.magicMaps.includes(m.id));
      // v35（E156）修瑕：候选耗尽时原兜底 pick(GameData.MAPS) 可把「新手村」推成魔域（重复 push
      // 还会产生脏数据）——现改为「魔气复炽」卷土重袭一处既有魔域（不再新增、永不波及新手村）
      const map = candidates.length ? Utils.pick(candidates) : Utils.pick(GameData.MAPS.filter(m => w.magicMaps.includes(m.id)));
      if (map) {
        if (!w.magicMaps.includes(map.id)) w.magicMaps.push(map.id);
        ev.mapId = map.id;
        text = candidates.length
          ? `<b>魔界入侵</b>——魔气吞没 ${map.name}！此后其地化为<b>魔域</b>：妖魔狂化暴增，凶险倍之，然魔物所获亦丰。`
          : `<b>魔气复炽</b>——天下再无可蚀之地，魔气回卷 ${map.name}！旧魔域愈发狂化深重，然魔物所获亦更丰。`;
      } else {
        // 极端兜底（理论上不可达）：无任何可侵之地时降级为灵气潮汐
        ev.type = 'lingchao';
        w.lingchaoUntil = y + 6;
        text = `<b>灵气潮汐</b>——天地灵机自行涨落，此后数年修炼事半功倍。`;
      }
    } else if (type === 'preach') {
      // v37（E243）：时代时长重校——讲道 10→3 年（v34 实玩周目 5~6 年，半周目内应见 2~3 个时代轮换）
      w.preachUntil = y + 3;
      text = `<b>圣地讲道</b>——道音涤荡神魂，此后三年天下修士<b>悟性倍增</b>。`;
    } else if (type === 'ruins') {
      w.ruinsUntil = y + 5;   // v37（E243）：秘境 20→5 年
      text = `<b>上古秘境现世</b>——此后五年秘宝频现，历练中的<b>宝箱与机缘遍地</b>。`;
    } else if (type === 'war') {
      w.warUntil = y + 6;   // v37（E243）：大战 30→6 年（与灵疫同物价扰动却 30 年 vs 1 年，失衡归位）
      text = `<b>宗门大战</b>——此后六年宗门悬赏暴涨，坊市<b>物价腾贵</b>。`;   // v33：priceMul 死字段写入删除（由 warActive/rebuildUntil 实时重算）
    } else if (type === 'lingchao') {
      w.lingchaoUntil = y + 3;   // v37（E243）：灵潮 10→3 年
      text = `<b>灵潮涌动</b>——地脉灵潮奔涌，此后三年<b>修炼效率 +20%</b>。`;
    } else if (type === 'beastwave') {
      const candidates = GameData.MAPS.filter(m => m.id !== 'village');
      const map = Utils.pick(candidates);
      w.beastMaps = w.beastMaps || [];
      w.beastMaps.push({ map: map.id, until: y + 5 });   // v37（E243）：兽潮 15→5 年
      ev.mapId = map.id;
      text = `<b>兽潮</b>——妖王振臂，群兽出山！${map.name} 一带五年<b>妖兽横行</b>：遇敌频密，猎杀所获亦厚。`;
    } else if (type === 'xianmen') {
      text = `<b>仙门收徒大会</b>——诸宗联席考较英才，通过者可获<b>宗门秘传</b>。`;
    } else if (type === 'zhongbao') {
      // v32 修瑕（A8）：v30 四类新事件原全走「陨星坠落」else——约 1/4 的天下大事公告自相矛盾；
      // 重宝现世还因 fireEvent 从不写 mapId，夺宝战场恒兜底黑风寨
      const candidates = GameData.MAPS.filter(m => m.id !== 'village');
      const map = Utils.pick(candidates.length ? candidates : GameData.MAPS);
      ev.mapId = map.id;
      text = `<b>重宝现世</b>——一位散修偶得上古重宝，风声走漏，${map.name} 一带<b>修士云集争夺</b>！凶险与机缘并存。`;
    } else if (type === 'neiluan') {
      w.turmoilUntil = y + 1;   // v32（F3）次年回响：乱局佣兵生意好做——来年悬赏赏格 ×1.1
      text = `<b>宗门内乱</b>——某宗因继承之争刀兵相向，门人四散。乱局之中，<b>可出手相助，亦可趁乱取利</b>。`;
    } else if (type === 'qiren') {
      text = `<b>奇人访世</b>——一位云游奇修路过此地，或指点迷津，或索一战之资，<b>缘法各安天命</b>。`;
    } else if (type === 'lingyi') {
      w.rebuildUntil = y + 1;   // v32（F3）次年回响：瘟后重建——来年坊市折价
      w.lingyiUntil = y;   // v33（E91）：当年药价腾贵落地（herbMul ×1.15）——原只有文案没有机制
      text = `<b>灵疫蔓延</b>——一处坊市起了灵疫，<b>药价腾贵</b>。施药济人者积誉，囤药居奇者获利。`;
    } else {
      text = `<b>陨星坠落</b>——天外陨星坠入人间，星陨之处<b>天材地宝俯拾即是</b>。`;
    }
    w.history.push({ year: y, type });
    if (w.history.length > 8) w.history.shift();
    // v37（E252）：覆写留痕——上一件大事尚未决断时，先按「观望未决」归档再覆写，不再无声蒸发
    if (w.pending) {
      const oldDef = GameData.WORLD_EVENTS.find(e => e.id === w.pending.type);
      const oldName = oldDef ? oldDef.name : (w.pending.type || '旧事');
      if (typeof Story !== 'undefined' && Story.chron) Story.chron(`第${w.pending.year}年大事「${oldName}」观望未决`);
      Log.add(`第${w.pending.year}年的「${oldName}」不了了之——新的风云已起。`, 'info');
    }
    w.pending = ev;
    const def = GameData.WORLD_EVENTS.find(e => e.id === type);
    Log.add(`【天下大事 · 第${y}年】${text}`, 'system');
    Log.add(`${def ? def.name : ''}之卡已现于「游历」页——参与或观望，一念自决。`, 'event');
    if (typeof Story !== 'undefined' && Story.chron) Story.chron(`第${y}年 · 天下大事「${def ? def.name : type}」`);   // v33（E92）：天下大事入年表（原只入 8 条轮换的 history 且 UI 无展示入口）
  },
  /** 参与大事件：各得其赏 */
  async joinEvent() {
    const p = Game.player;
    const w = p.world;
    if (!w.pending) return;
    const ev = w.pending;
    w.pending = null;
    p.counters.eventJoins = (p.counters.eventJoins || 0) + 1;   // v24 章助缘计数
    if (ev.type === 'demon') {
      const map = GameData.MAPS.find(m => m.id === ev.mapId) || GameData.MAPS[1];
      Log.add('你奔赴魔域前线，与狂化的魔物战作一团！', 'event');
      const mid = Utils.pickWeighted(map.pool); // 地图池为加权对象 [{id, weight}]
      // v30 修瑕：精英基线改由 buildMonster 统一（原事后置 en.elite=true，吃词缀不吃 crit 基线）
      const en = buildMonster(mid, Math.max(0, p.realmIdx * 4 + 2 - GameData.MONSTERS[mid].power), { elitePlus: true });
      en.hpMax = Math.round(en.hpMax * 1.4); en.atk = Math.round(en.atk * 1.25);
      en.expGain = Math.round(en.expGain * 1.6); en.stoneGain = Math.round(en.stoneGain * 1.8);
      en.hp = en.hpMax;
      Battle.start(null, { enemy: en, weType: 'demon', mapName: '魔域前线' });
      Game.afterAction();   // v35（E143）：先 start 后 afterAction——对齐 dungeon 模式，防节庆在开战前触发后被 Battle.start 静默丢弃
      return;
    }
    if (ev.type === 'preach') {
      const gain = Math.round(260 * GameData.eco(p.realmIdx));
      Cultivate.addExp(p, gain);
      Cultivate.addInsight(p, 15);   // v28：满百溢出折算修为
      Time.add(10);
      Log.add(`你在圣地一坐十日，听道音如饮甘露——修为 +${Utils.fmtNum(gain)}，突破感悟 +15。`, 'gain');
    } else if (ev.type === 'ruins') {
      Bag.addItem('m_gupian', 2);
      const stones = Math.round(60 * GameData.stoneEco(p.realmIdx));
      Bag.addStones(stones);
      Time.add(10);
      Log.add(`你于现世秘境中寻得上古法宝碎片 ×2、灵石 ${Utils.fmtNum(stones)}。`, 'gain');
    } else if (ev.type === 'war') {
      // v34（E119）：不绑挚友——原从全部存活 NPC 随机抽敌（仅避道侣/结拜），rel≥70 的莫逆之交
      // 也可能被拖入死战、胜即结怨，社交资产遭无预警惩罚。现只从中立/敌对（rel<30）中抽。
      const ids = Object.keys(p.npcs).filter(id => p.npcs[id].alive && p.partner !== id && !(p.sworn || []).includes(id) && (p.npcs[id].rel || 0) < 30);
      const nid = ids.length ? Utils.pick(ids) : null;
      if (nid) {
        Log.add('你投入宗门战团，与敌对修士战作一团！', 'event');
        Battle.start(null, { enemy: NpcSys.buildEnemy(p, nid), npcId: nid, mode: 'war', mapName: '宗门战场' });
        Game.afterAction();   // v35（E143）：先 start 后 afterAction——对齐 dungeon 模式，防节庆在开战前触发后被 Battle.start 静默丢弃
        return;
      }
      const stones = Math.round(50 * GameData.stoneEco(p.realmIdx));
      Bag.addStones(stones);
      Time.add(10);
      Log.add(`你在战乱中辗转护送商旅，得灵石 ${Utils.fmtNum(stones)}。`, 'gain');
    } else if (ev.type === 'lingchao') {
      // v20 灵潮涌动：静坐采灵（时段加成已在修炼中生效）
      const gain = Math.round(200 * GameData.eco(p.realmIdx));
      Cultivate.addExp(p, gain);
      Cultivate.addInsight(p, 8, false);
      Time.add(10);
      Log.add(`你在灵潮最盛处吐纳十日，经脉尽润——修为 +${Utils.fmtNum(gain)}，突破感悟 +8。`, 'gain');
    } else if (ev.type === 'beastwave') {
      // v20 兽潮：猎杀头兽
      const map = GameData.MAPS.find(m => m.id === ev.mapId) || GameData.MAPS[2];
      Log.add(`你奔赴${map.name}兽潮前线，与出山的群兽战作一团！`, 'event');
      const mid = Utils.pickWeighted(map.pool);
      const en = buildMonster(mid, Math.max(0, p.realmIdx * 4 + 2 - GameData.MONSTERS[mid].power));
      en.hpMax = Math.round(en.hpMax * 1.3); en.atk = Math.round(en.atk * 1.2);
      en.expGain = Math.round(en.expGain * 1.8); en.stoneGain = Math.round(en.stoneGain * 2);
      en.hp = en.hpMax;
      Battle.start(null, { enemy: en, weType: 'beastwave', mapName: '兽潮前线' });
      Game.afterAction();   // v35（E143）：先 start 后 afterAction——对齐 dungeon 模式，防节庆在开战前触发后被 Battle.start 静默丢弃
      return;
    } else if (ev.type === 'zhongbao') {
      // v30 重宝现世：争夺战——胜者得宝
      Log.add('重宝现世之地，修士云集。你循着灵光追至谷底，宝光之侧，已有人虎视眈眈。', 'event');
      const map = GameData.MAPS.find(m => m.id === ev.mapId) || GameData.MAPS[2];
      const mid = Utils.pickWeighted(map.pool);
      const en = buildMonster(mid, Math.max(0, p.realmIdx * 4 + 1 - GameData.MONSTERS[mid].power), { elitePlus: true });
      en.hpMax = Math.round(en.hpMax * 1.3); en.hp = en.hpMax;
      en.expGain = Math.round(en.expGain * 1.5); en.stoneGain = Math.round(en.stoneGain * 1.5);
      Battle.start(null, { enemy: en, weType: 'zhongbao', mapName: '夺宝之地', dropMul: 1.5 });
      Game.afterAction();   // v35（E143）：先 start 后 afterAction——对齐 dungeon 模式，防节庆在开战前触发后被 Battle.start 静默丢弃
      return;
    } else if (ev.type === 'neiluan') {
      // v30 宗门内乱：三选一
      Log.add('邻宗内乱的烽烟隔着山都能望见。有门人跪在山道边求援，也有人趁夜背着库房细软出逃。', 'event');
      const c1 = await UI.popup({
        title: '天下大事 · 宗门内乱',
        html: '乱局当前，你如何自处？',
        options: [
          { text: '出手相助（平乱有功）', value: 'help', primary: true },
          { text: '趁乱取利（搜检逃户遗落之物）', value: 'loot' },
          { text: '冷眼旁观', value: 'watch' },
        ],
      });
      if (c1 === 'help') {
        if (p.sect) p.sect.contrib += 150;
        if (typeof RepSys !== 'undefined' && RepSys.add) RepSys.add(p, 3, '平乱有功');
        Time.add(10);
        Log.add(`你仗义出手，助乱局中的守序一派稳住了山门——宗门同袍无不相敬。${p.sect ? '贡献 +150、' : ''}声望 +3。`, 'gain');
      } else if (c1 === 'loot') {
        const stones = Math.round(70 * GameData.stoneEco(p.realmIdx));
        Bag.addStones(stones);
        KarmaSys.addKarma(8, true);
        Time.add(10);
        Log.add(`你趁夜捡拾了逃散门人遗落的细软——灵石 ${Utils.fmtNum(stones)}。夜风里仿佛有人哭。（孽障 +8）`, 'loss');
      } else {
        Cultivate.addInsight(p, 4, false);
        Time.add(10);
        Log.add('你在高处看了三日火光，忽然明白：庙堂之倾，从来不在外敌。（感悟 +4）', 'info');
      }
    } else if (ev.type === 'qiren') {
      // v30 奇人访世：论道/切磋/赠礼
      Log.add('一位青袍奇修在山口支了张棋枰，见人不语，只抬手指了指对面的空位。', 'event');
      const c2 = await UI.popup({
        title: '天下大事 · 奇人访世',
        html: '青袍人指了指棋枰，又指了指你腰间的剑，最后摊开一只空掌。',
        options: [
          { text: '坐而论道（求指点）', value: 'talk', primary: true },
          { text: '以剑会友（切磋一场）', value: 'spar' },
          { text: '奉上茶资（赠礼结缘）', value: 'gift' },
        ],
      });
      if (c2 === 'talk') {
        Cultivate.addInsight(p, 8, false);
        const gain = Math.round(80 * GameData.eco(p.realmIdx));
        Cultivate.addExp(p, gain);
        Time.add(5);
        Log.add(`青袍人只说了一句话，你却参了五日——修为 +${Utils.fmtNum(gain)}，感悟 +8。`, 'gain');
      } else if (c2 === 'spar') {
        const gain2 = Math.round(120 * GameData.eco(p.realmIdx));
        Cultivate.addExp(p, gain2);
        Time.add(3);
        Log.add(`三招过后青袍人收手——你遍体生寒，却也遍体通明。修为 +${Utils.fmtNum(gain2)}。`, 'gain');
      } else {
        KarmaSys.addFortune(2);
        Time.add(1);
        Log.add('青袍人收了茶资，落下一子，忽然笑道：「好缘。」——你只觉此后诸事，顺遂了几分。（气运 +2）', 'gain');
      }
    } else if (ev.type === 'lingyi') {
      // v30 灵疫蔓延：施药/囤药/自保
      Log.add('坊市贴出告示：灵疫蔓延，药材紧缺——各家药铺门前排起了长队。', 'event');
      const c3 = await UI.popup({
        title: '天下大事 · 灵疫蔓延',
        html: '药价一日三涨。你有储药，也有手艺——如何自处？',
        options: [
          { text: '开棚施药（破财积誉）', value: 'give', primary: true },
          { text: '高价售药（趁势取利）', value: 'sell' },
          { text: '闭门自保', value: 'safe' },
        ],
      });
      if (c3 === 'give') {
        const cost = Math.round(30 * GameData.stoneEco(p.realmIdx));
        if (typeof RepSys !== 'undefined' && RepSys.add) RepSys.add(p, 4, '施药济人');
        KarmaSys.addFortune(4);
        if (Bag.spendStones(cost)) Log.add(`你开棚施药半月，散尽灵石 ${Utils.fmtNum(cost)}——满城父老焚香相送。（声望 +4，气运 +4）`, 'gain');
        else Log.add('你把囊中存的药材尽数送了出去——药不够，就搭上手亲自照看病患。（声望 +4，气运 +4）', 'gain');
        Time.add(15);
      } else if (c3 === 'sell') {
        const stones = Math.round(90 * GameData.stoneEco(p.realmIdx));
        Bag.addStones(stones);
        KarmaSys.addKarma(6, true);
        if (typeof RepSys !== 'undefined' && RepSys.add) RepSys.add(p, -3, '囤药居奇');
        Time.add(10);
        Log.add(`你把存药翻着倍价卖了出去——灵石 ${Utils.fmtNum(stones)}。药铺门口的队伍更长了。（孽障 +6，声望 -3）`, 'loss');
      } else {
        Time.add(10);
        Log.add('你闭门谢客，自炼辟疫丹护住一门老小——乱世自保，不为过。（无事发生）', 'info');
      }
    } else if (ev.type === 'xianmen') {
      // v20 仙门收徒大会：三题取一，答对得秘传
      // v37（E251）：正解按年哈希轮换，成算（悟性）改作用于答对后的奖励品质第二层；primary 随正解走
      Time.add(5);
      const year = WorldSys.year(p);
      const correct = ['a', 'b', 'c'][Utils.hashStr('xianmen' + year) % 3];
      const right = Utils.chance(Math.min(85, 40 + Stat.compOf(p) * 2));
      const ans = await UI.popup({
        title: '仙门收徒大会 · 大道之问',
        html: '考官居高声问：「修行路上，何为根本？」<br><br>甲：「戒律清规，守法不失。」<br>乙：「明悟本心，道法自然。」<br>丙：「广结善缘，借力而行。」',
        options: [
          { text: '选 甲', value: 'a', primary: correct === 'a' },
          { text: '选 乙', value: 'b', primary: correct === 'b' },
          { text: '选 丙', value: 'c', primary: correct === 'c' },
        ],
      });
      if (ans === correct) {
        if (!right) {
          // v37（E251）：品质第二层——答对而成算不足，赏格折中（不再有「故意答错更优」的逆选择）
          Cultivate.addInsight(p, 5, false);
          Log.add('你的答语虽合题旨，阐述却未尽其妙——考官颔首，记名待来年。（突破感悟 +5）', 'gain');
        } else {
        const pool = ['gf_lieyang', 'gf_xuantian', 'gf_jifeng', 'gf_tiangang', 'gf_hansha', 'gf_yulin', 'gf_feixian'].filter(id => !p.gongfa[id] && !p.bag[id]);
        if (pool.length) {
          const gf = Utils.pick(pool);
          Bag.addItem(gf, 1);
          Cultivate.addInsight(p, 10, false);
          Log.add(`你以「明悟本心」作答，满堂喝彩——考官亲授【<b>${GameData.ITEMS[gf].name}</b>】一册！（突破感悟 +10）`, 'gain');
          UI.announce('✦ 收徒大会 · 技惊四座 ✦', 'gold');
        } else {
          const stones2 = Math.round(80 * GameData.stoneEco(p.realmIdx));
          Bag.addStones(stones2);
          Log.add(`你以「明悟本心」作答，考官抚须而笑——然所授之法你皆已修习，遂折为程仪灵石 ${Utils.fmtNum(stones2)}。`, 'gain');
        }
        }
      } else {
        const stones3 = Math.round(30 * GameData.stoneEco(p.realmIdx));
        Bag.addStones(stones3);
        Log.add(ans === 'a' ? '「守法不失，倒也稳妥。」考官淡淡颔首，赠程仪灵石打发。' : '「借力而行……终究是求诸于人。」考官摇头，赠灵石若干打发。', 'info');
      }
    } else if (ev.type === 'meteor') {
      // v20 陨星坠落：拾取星陨异宝
      const tier = Utils.clamp(Math.floor(p.realmIdx / 2) + 2, 2, 4);
      const mat = Utils.pick(GameData.matsByTier(tier));
      Bag.addItem(mat, 2);
      Bag.addItem('m_gupian', 1);
      const stones4 = Math.round(60 * GameData.stoneEco(p.realmIdx));
      Bag.addStones(stones4);
      Time.add(10);
      Log.add(`你在星陨坑中翻捡十日——得【${GameData.ITEMS[mat].name}】×2、上古法宝碎片 ×1、灵石 ${Utils.fmtNum(stones4)}。`, 'gain');
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
