
const Explore = {
  async go(mapId) {
    const p = Game.player;
    if (Battle.active || p.dead) return;
    const map = GameData.MAPS.find(m => m.id === mapId);
    if (!map) return;
    p.counters.explores++;
    const mapExp = p.counters.mapExplores = (p.counters.mapExplores || {});
    mapExp[map.id] = (mapExp[map.id] || 0) + 1;
    Time.add(2);
    if (p.dead) return;
    const under = p.realmIdx < map.recRealm;
    // 气运：好事事件（宝箱/机缘/贵人）权重提升；红尘劫（道德抉择）常驻各图
    const weights = { ...map.weights, dilemma: 12 };
    const gm = KarmaSys.goodEventMult(p);
    for (const k of ['treasure', 'fortune', 'npc']) if (weights[k]) weights[k] *= gm;
    // §23 上古秘境现世：宝箱与机缘权重提升
    if (WorldSys.ruinsActive(p)) for (const k of ['treasure', 'fortune']) if (weights[k]) weights[k] *= 1.5;
    // v20 天时与深耕：雾日机缘↑、隆冬遇敌↓、兽潮妖患↑、深耕宝箱↑
    const wx0 = Art.weatherOf(p, map.id);
    if (wx0.sky === 'fog' && weights.fortune) weights.fortune *= 1.5;
    if (Art.seasonOf(p) === 3 && weights.battle) weights.battle *= 0.9;
    if (WorldSys.beastWaveActive(p, map.id) && weights.battle) weights.battle *= 1.3;
    const deepN = (p.counters.mapExplores || {})[map.id] || 0;
    const deepTier = deepN >= 100 ? 3 : deepN >= 50 ? 2 : deepN >= 20 ? 1 : 0;
    if (deepTier > 0 && weights.treasure) weights.treasure += deepTier * 3;
    const type = Utils.pickWeighted(weights);
    switch (type) {
      case 'battle': {
        const eliteChance = (under ? 14 : 8) + deepTier * 4;   // v20 深耕：精英率 +
        let monsterId = Utils.chance(eliteChance) && map.elite
          ? map.elite
          : Utils.pickWeighted(map.pool);
        // v20 夜行妖兽：夜半（及中元）出没，境界相近者主动寻人
        const isNight = wx0.night || (typeof FestivalSys !== 'undefined' && FestivalSys.is(p, 'zhongyuan'));
        if (isNight) {
          const rp = p.realmIdx * 4 + p.layer;
          const nightIds = Object.keys(GameData.MONSTERS).filter(id => GameData.MONSTERS[id].night && Math.abs(GameData.MONSTERS[id].power - rp) <= 6);
          if (nightIds.length && Utils.chance(30)) monsterId = Utils.pick(nightIds);
        }
        Log.add(`你在 ${map.name} 探索时，惊动了什么……`, 'event');
        // v10 境界特性 · 神识（化神起）：五成先手；低打依旧保留原有先手机会
        const firstStrike = (under && Utils.chance(25)) || (p.realmIdx >= 4 && Utils.chance(50));
        // 阵道：抢先布阵（布阵境五成，困阵境压制四成）
        const arrayTier = p.dao === 'array' ? DaoSys.tierLevel(p) : 0;
        const arraySetup = arrayTier >= 1 && Utils.chance(50);
        if (arraySetup) DaoSys.gain(p, 20);   // v16 阵道
        const bctx = { mapName: map.name, mapId: map.id, firstStrike, arraySetup, arrayPotent: arrayTier >= 3, arrayGrand: arrayTier >= 6 };
        // v20 深耕掉落与兽潮掉落
        if (deepTier > 0) {
          bctx.dropMul = (bctx.dropMul || 1) * (1 + deepTier * 0.15);
          Log.add(`此地你已走过 ${deepN} 遍，路径烂熟于心——深耕${['一', '二', '三'][deepTier - 1]}重：精英率与所获俱增。`, 'system');
        }
        if (WorldSys.beastWaveActive(p, map.id)) {
          bctx.dropMul = (bctx.dropMul || 1) * 1.3;
          Log.add('兽潮未退——四野妖兽环伺，猎杀所获亦厚。', 'warn');
        }
        bctx.wx = wx0;
        // §23 魔域：妖魔狂化，凶险与收获并增
        if (WorldSys.isMagic(p, map.id)) {
          bctx.worldMul = 1.3; bctx.dropMul = 1.4;
          Log.add('魔气森然——此间妖魔已被魔域之气狂化！', 'warn');
        }
        // v20 多波妖群（一成几率）与天时上下文（夜战/雨雾，阶段三继续扩展）
        if (Utils.chance(10)) {
          const waveIds = [monsterId];
          const n = Utils.rand(2, 3);
          for (let w = 1; w < n; w++) waveIds.push(Utils.pickWeighted(map.pool));
          bctx.waveIds = waveIds;
        }
        // v20 新手保底：首场战斗敌方削弱两成（counters.battles===0 视为首战）
        const firstFightMercy = (p.counters.battles || 0) === 0;
        if (firstFightMercy) bctx.mercy = 0.8;   // v20 首战保底
        Battle.start(monsterId, bctx);
        return; // 战斗结束后自行结算
      }
      case 'treasure': EventSys.treasure(map); break;
      case 'fortune': EventSys.fortune(map); break;
      case 'npc': await EventSys.npc(map); break;
      case 'dilemma': await EventSys.dilemma(); break;
      case 'trap': EventSys.trap(); break;
      default: {
        Log.add(Utils.pick(GameData.FLAVOR.nothing), 'info');
        // v8：空手而归的小安慰——归途偶有拾获，不再两手空空
        if (Utils.chance(50)) {
          const stones = Math.round(Utils.rand(3, 8) * GameData.stoneEco(p.realmIdx));
          Bag.addStones(stones);
          Log.add(`归途中你顺手采了些灵草杂物，卖给坊市换得灵石 ${stones} 枚，不算空手而归。`, 'gain');
        }
      }
    }
    // v19 氛围见闻：探索途中偶见的山水人情（三成概率）
    if (!Battle.active && Utils.chance(30)) {
      const ambPool = GameData.FLAVOR.ambience[map.id];
      if (ambPool && ambPool.length) Log.add(Utils.pick(ambPool), 'info');
    }
    // v19 仙界轶闻：飞升之后，人间偶有传闻上达仙听
    if (!Battle.active && p.flags.ascended && Utils.chance(12)) {
      const today = Math.floor(p.day || 0);
      if (p._anecDay !== today) {
        p._anecDay = today;
        Log.add('【仙界轶闻】' + Utils.pick([
          '下界传来消息：某小宗门开山收徒，千里排队——听说掌门曾与你有一面之缘。',
          '有凡人在你当年渡劫的雷台旧址立了庙，香火竟意外鼎盛。',
          '血河故道上空的云，今年是百年难得一见的澄澈——故道成了游历圣地。',
          '一位散修无名无姓，却把你当年随手留下的半张符纸供在家中，说是救过全村。',
          '天外的星图又变了一分——守星人说，那是你飞升那日踏出的痕迹。',
        ]), 'event');
      }
    }
    // 孽障：仇家循迹寻仇 / §24 恩怨：宿敌趁你历练偷袭
    if (!Battle.active) {
      const ambId = NpcSys.pickAmbusher(p);
      if (ambId && Utils.chance(NpcSys.ambushChance(p))) {
        Log.add(`一道熟悉的杀意骤然锁定你——与 <b>${NpcSys.def(ambId).name}</b> 的恩怨，终究追到了这里！`, 'warn');
        await Utils.sleep(500);
        Game.afterAction(); // 先持久化本次历练收益，再入战斗
        Battle.start(null, { enemy: NpcSys.buildEnemy(p, ambId), npcId: ambId, mode: 'hunt', ambush: true, mapName: '恩怨了结之地' });
        return;
      }
      if (Utils.chance(KarmaSys.ambushChance(p))) {
        const idx = GameData.MAPS.findIndex(m => m.id === map.id);
        const nextMap = GameData.MAPS[Math.min(idx + 1, GameData.MAPS.length - 1)];
        Log.add('忽然一道凌厉杀意锁定了你——孽债累累，终有仇家循迹而至！', 'warn');
        await Utils.sleep(500);
        Game.afterAction(); // 先持久化本次历练收益，再入战斗
        Battle.start(nextMap.elite || nextMap.pool[0].id, { mapName: '仇家埋伏之地', mapId: map.id, ambush: true });
        return;
      }
    }
    Game.afterAction();
  },
};

const EventSys = {
  /** 阵道在秘境遗迹的收益倍率 */
  arrMult(map) {
    const p = Game.player;
    return map && map.id === 'ruins' && p.dao === 'array' ? 1.2 : 1;
  },
  treasure(map) {
    const p = Game.player;
    if (NpcSys.rivalSnatch(p)) return;   // v20 宿敌截胡
    const st = Stat.compute(p);
    Log.add('你拨开蔓草，发现了一只落满尘土的储物箱！', 'event');
    Narrative.logScene('treasure');   // v5：道途语气
    if (Utils.chance(22)) {
      const dmg = Math.round(st.maxHp * Utils.rand(8, 15) / 100);
      p.hp = Math.max(1, p.hp - dmg);
      Log.add(`箱底暗藏毒针！你躲避不及，气血 -${dmg}。`, 'loss');
      return;
    }
    const stones = Math.round(Utils.rand(12, 22) * GameData.stoneEco(p.realmIdx) * (1 + st.luck * 0.02) * this.arrMult(map));
    if (this.arrMult(map) > 1) Log.add('阵道造诣令你于遗迹中如鱼得水，所获更丰！', 'gain');
    Bag.addStones(stones);
    let text = `箱中有灵石 ${Utils.fmtNum(stones)} 枚`;
    if (Utils.chance(45 + st.luck * 2)) {
      const qty = Utils.chance(20) ? 2 : 1;
      const mat = Utils.pick(GameData.matsByTier(Math.min(4, Math.floor(p.realmIdx / 2) + 1)));
      Bag.addItem(mat, qty);
      text += `、${GameData.ITEMS[mat].name} ×${qty}`;
    }
    Log.add(`${text}。`, 'gain');
  },
  fortune(map) {
    const p = Game.player;
    if (NpcSys.rivalSnatch(p)) return;   // v20 宿敌截胡
    Narrative.logScene('fortune');   // v5：道途语气
    // §26 前世记忆：兵解转世者偶得前世洞府机缘
    if (p.reinc && Utils.chance(15)) {
      const gain = Math.round(200 * GameData.eco(p.realmIdx));
      Cultivate.addExp(p, gain);
      Bag.addItem('m_gupian', 1);
      p.insight = Math.min(100, p.insight + 8);
      Log.add(`冥冥牵引之下，你寻到一处依稀熟悉的洞府——那是<b>前世</b>你埋藏机缘之地！修为 +${Utils.fmtNum(gain)}、上古法宝碎片 ×1、突破感悟 +8。`, 'gain');
      return;
    }
    const eco = GameData.eco(p.realmIdx);
    const arr = this.arrMult(map);
    const kind = Utils.pickWeighted({ lingmai: 30, wudao: 20, yifu: 20, lingru: 15, shenquan: 8, tiancai: 7 });
    switch (kind) {
      case 'lingmai': {
        const gain = Math.round(90 * eco);
        Cultivate.addExp(p, gain);
        Log.add(`你误入一处灵脉福地，灵气浓得化不开！修为 +${Utils.fmtNum(gain)}。`, 'gain');
        break;
      }
      case 'wudao': {
        const gain = Math.round(60 * eco);
        Cultivate.addExp(p, gain);
        p.insight = Math.min(100, p.insight + 5);
        Log.add(`你在一座悟道古碑前静立半日，若有所悟。修为 +${Utils.fmtNum(gain)}，突破感悟 +5。`, 'gain');
        break;
      }
      case 'yifu': {
        const stones = Math.round(25 * GameData.stoneEco(p.realmIdx) * arr);
        Bag.addStones(stones);
        const mat = Utils.pick(GameData.matsByTier(Math.min(4, Math.floor(p.realmIdx / 2) + 1)));
        Bag.addItem(mat, 1);
        Log.add(`你寻得一处无名遗府，残存的储物袋中有灵石 ${Utils.fmtNum(stones)}、${GameData.ITEMS[mat].name} ×1。`, 'gain');
        break;
      }
      case 'lingru': {
        const st = Stat.compute(p);
        p.hp = st.maxHp; p.mp = st.maxMp;
        p.poison = Math.max(0, p.poison - 35);
        Log.add('你饮下一汪灵乳玉髓，气血充盈，丹毒尽去大半。', 'gain');
        break;
      }
      case 'shenquan': {
        const keys = Object.keys(p.attrs).filter(k => p.attrs[k] < 10);
        if (keys.length) {
          const k = Utils.pick(keys);
          p.attrs[k]++;
          Log.add(`你于淬体神泉中沐浴三日，${GameData.ATTR_NAMES[k]} +1！此乃天大机缘！`, 'gain');
        } else {
          const gain = Math.round(120 * eco);
          Cultivate.addExp(p, gain);
          Log.add(`你体质已臻圆满，神泉化为修为。修为 +${Utils.fmtNum(gain)}。`, 'gain');
        }
        break;
      }
      default: {
        const tier = Math.min(4, Math.floor(p.realmIdx / 2) + 2);
        const mat = Utils.pick(GameData.matsByTier(tier));
        Bag.addItem(mat, 2);
        Log.add(`你发现了一株罕见的天材地宝——${GameData.ITEMS[mat].name} ×2！`, 'gain');
      }
    }
  },
  trap() {
    const p = Game.player;
    Narrative.logScene('trap');   // v5：道途语气
    const st = Stat.compute(p);
    let dmg = Math.round(st.maxHp * Utils.rand(8, 16) / 100);
    // v10 境界特性 · 神识（化神起）：先知先觉，陷阱伤害减半
    if (p.realmIdx >= 4) dmg = Math.max(1, Math.round(dmg / 2));
    p.hp = Math.max(1, p.hp - dmg);
    Log.add(`你误触了修士布下的禁制！一道灵光炸开，气血 -${dmg}${p.realmIdx >= 4 ? '（神识预警，堪堪避开要害）' : ''}。`, 'loss');
  },
  /** 红尘劫：历练途中的道德三选一（相助得气运 / 打劫得孽障 / 袖手无事） */
  async dilemma() {
    const p = Game.player;
    p.counters.dilemmas = (p.counters.dilemmas || 0) + 1;   // v11 剧情计数
    const eco = GameData.stoneEco(p.realmIdx);
    const sc = Utils.pick(GameData.DILEMMAS);
    Log.add(`【红尘劫】${sc.text}`, 'event');
    const choice = await UI.popup({
      title: `红尘劫 · ${sc.title}`,
      html: `${sc.text}<br><br><span class="hl">一念善恶，因果自负。</span>`,
      options: Narrative.dilemmaOptions(),   // v5：选项措辞随道途而变，数值逻辑不变
    });
    if (choice === 'help') {
      const cost = Math.round(8 * eco);
      if (Bag.spendStones(cost)) {
        Log.add(`你解囊相助，散去灵石 ${Utils.fmtNum(cost)}。那人千恩万谢，连连称颂。`, 'info');
      } else {
        p.hp = Math.max(1, p.hp - Math.round(Stat.compute(p).maxHp * 0.08));
        Log.add('你囊中羞涩，便以真元渡了对方一程，自身气血小损。', 'info');
      }
      KarmaSys.addFortune(Utils.rand(8, 12));
    } else if (choice === 'rob') {
      const gain = Math.round(Utils.rand(12, 20) * eco);
      Bag.addStones(gain);
      let extra = '';
      if (Utils.chance(30)) {
        const mat = Utils.pick(GameData.matsByTier(Utils.clamp(Math.floor(p.realmIdx / 2) + 1, 1, 4)));
        Bag.addItem(mat, 1);
        extra = `、${GameData.ITEMS[mat].name} ×1`;
      }
      Log.add(`你趁乱下手，掠得灵石 ${Utils.fmtNum(gain)}${extra}。四下无人——可头上三尺，真的无人么？`, 'gain');
      KarmaSys.addKarma(Utils.rand(8, 12));
    } else {
      Log.add('你垂下眼帘，袖手而过。乱世修行，自渡尚且不暇。', 'info');
    }
  },
  async npc(map) {
    const p = Game.player;
    const st = Stat.compute(p);
    // §24 常驻修士：四成几率遇到已录入江湖的 NPC
    if (map && Utils.chance(40)) {
      const rid = NpcSys.npcAt(p, map.id);
      if (rid) { await NpcSys.encounter(p, rid); return; }
    }
    const kind = Utils.pickWeighted({ merchant: 30, hermit: 25, wounded: 25, doctor: 20 });
    // 邪修：正道修士避之如蛇蝎
    if (p.dao === 'demonic' && kind !== 'wounded') {
      const hostile = {
        merchant: '那云游商人一眼认出你周身萦绕的邪气，脸色骤变，仓皇收摊遁走。',
        hermit: '白发老者盯你半晌，冷哼一声：「邪修，也配问大道？」拂袖而去。',
        doctor: '妙手郎中冷冷扫你一眼：「医者仁心，不救魔头。」背起药篓便走。',
      }[kind];
      Log.add(hostile, 'warn');
      return;
    }
    Narrative.logScene('observe');   // v5：道途视角的打量
    if (kind === 'merchant') {
      const pool = ['w_qinggang', 'a_huxin', 'z_jifengxue', 'w_sanqing', 'a_xuangui', 'z_qiankun', 'w_zhuxian', 'a_longlin', 'z_taiji'];
      const affordable = pool.slice(Math.max(0, p.realmIdx - 1), Math.max(1, p.realmIdx + 3));
      const item = Utils.pick(affordable.length ? affordable : ['w_qinggang']);
      const def = GameData.ITEMS[item];
      const cost = Math.round(def.price * 0.7);
      Log.add('你遇到一位云游商人，他神秘兮兮地展示了一件货物。', 'event');
      const buy = await UI.popup({
        title: '云游商人',
        html: `「道友，可识得此宝？」<br><br><b>${def.name}</b> —— ${def.desc}<br>原价 ${Utils.fmtNum(def.price)}，今只收 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石。`,
        options: [{ text: '买下', value: true, primary: true }, { text: '不买', value: false }],
      });
      if (buy) {
        if (Bag.spendStones(cost)) {
          Bag.addItem(item, 1);
          Log.add(`你买下了 ${def.name}。`, 'gain');
        } else {
          Log.add('你摸了摸干瘪的储物袋，只能拱手告辞。', 'info');
        }
      } else {
        Log.add('你摇了摇头，商人也不恼，飘然而去。', 'info');
      }
    } else if (kind === 'hermit') {
      Log.add('一位白发老者拦住去路，目光如电：「小友，可愿听老朽一言？」', 'event');
      const choice = await UI.popup({
        title: '白发老者',
        html: '「老朽观你根骨尚可。这里有一篇入门感悟，也有一道考题，你选一样。」',
        options: [{ text: '聆听传功', value: 'teach' }, { text: '接受考较', value: 'test' }, { text: '婉言告辞', value: 'leave' }],
      });
      if (choice === 'teach') {
        const gain = Math.round(150 * GameData.eco(p.realmIdx));
        Cultivate.addExp(p, gain);
        Log.add(`老者一缕真传入体，你如醍醐灌顶！修为 +${Utils.fmtNum(gain)}。`, 'gain');
      } else if (choice === 'test') {
        const right = Utils.chance(55);
        const ans = await UI.popup({
          title: '大道之问',
          html: '「修行之本，为何？」<br><br>甲：「逆天改命，我命由我。」<br>乙：「顺其自然，道法自然。」',
          options: [{ text: '选 甲', value: 'a' }, { text: '选 乙', value: 'b' }],
        });
        const correct = (right && ans === 'a') || (!right && ans === 'b');
        if (correct) {
          const gain = Math.round(120 * GameData.eco(p.realmIdx));
          Cultivate.addExp(p, gain);
          p.insight = Math.min(100, p.insight + 5);
          Log.add(`「善。」老者抚须而笑。修为 +${Utils.fmtNum(gain)}，突破感悟 +5。`, 'gain');
        } else {
          const gain = Math.round(40 * GameData.eco(p.realmIdx));
          Cultivate.addExp(p, gain);
          Log.add(`「差强人意。」老者摇头离去，你略有感触。修为 +${Utils.fmtNum(gain)}。`, 'info');
        }
      } else {
        Log.add('你躬身一礼，自行赶路。', 'info');
      }
    } else if (kind === 'wounded') {
      Log.add('路旁倒着一名受伤的散修，气息奄奄，似在向你求救。', 'event');
      const hasPill = Bag.count('pill_liaoshang') > 0;
      const choice = await UI.popup({
        title: '受伤的散修',
        html: hasPill
          ? '「道友……救我……」他伤势极重，你身上正好有【疗伤丹】。'
          : '「道友……救我……」你身无丹药，但可以损耗自身真元为他续命（损失一成气血）。',
        options: hasPill
          ? [{ text: '赠予疗伤丹', value: 'pill' }, { text: '袖手旁观', value: 'leave' }]
          : [{ text: '以真元相救', value: 'qi' }, { text: '袖手旁观', value: 'leave' }],
      });
      if (choice === 'pill') {
        Bag.removeItem('pill_liaoshang', 1);
        const stones = Math.round(40 * GameData.stoneEco(p.realmIdx));
        Bag.addStones(stones);
        Log.add(`你递上疗伤丹，散修服下后面色好转，掏出一袋灵石相赠：灵石 ${Utils.fmtNum(stones)}。`, 'gain');
      } else if (choice === 'qi') {
        p.hp = Math.max(1, p.hp - Math.round(Stat.compute(p).maxHp * 0.1));
        const gain = Math.round(70 * GameData.eco(p.realmIdx));
        Cultivate.addExp(p, gain);
        Log.add(`你度入一缕真元，救他一命。他无以为报，将毕生感悟倾囊相授：修为 +${Utils.fmtNum(gain)}。`, 'gain');
      } else {
        Log.add('你终究没有停下脚步。修仙之路，本就是独行之路。', 'info');
      }
    } else {
      const cost = Math.round(8 * GameData.stoneEco(p.realmIdx));
      const free = p.attrs.luck >= 7 && Utils.chance(30);
      Log.add('一位背药篓的妙手郎中坐在道旁，正在整理草药。', 'event');
      if (free) {
        p.hp = Stat.compute(p).maxHp; p.mp = Stat.compute(p).maxMp;
        p.poison = Math.max(0, p.poison - 50);
        Log.add(`郎中见你面有风霜，笑道「结个善缘罢」，为你细细调理。气血灵力尽复，丹毒 -50。`, 'gain');
      } else {
        const ok = await UI.popup({
          title: '妙手郎中',
          html: `「看你气色，可要老夫调理一番？气血灵力尽复，丹毒 -50，只收 <span class="hl">${Utils.fmtNum(cost)}</span> 下品灵石。」`,
          options: [{ text: '调理', value: true, primary: true }, { text: '不必', value: false }],
        });
        if (ok && Bag.spendStones(cost)) {
          p.hp = Stat.compute(p).maxHp; p.mp = Stat.compute(p).maxMp;
          p.poison = Math.max(0, p.poison - 50);
          Log.add('郎中手法如神，你只觉百脉通畅，伤势尽去。', 'gain');
        } else if (ok) {
          Log.add('你摸了摸储物袋，灵石不够，只得作罢。', 'info');
        }
      }
    }
  },
};
