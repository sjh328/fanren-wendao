
/* ======================================================================
 * §13.7 v20 节庆系统 FestivalSys（按年内日序，一年一遍）
 * 上元灯会 / 花朝节 / 中元鬼节 / 中秋月圆 / 除夕年关——给世界一份日历感。
 * ====================================================================== */
const FestivalSys = {
  /** 今日节庆（年内第几日对表） */
  today(p) {
    const doy = Math.floor((p.day || 0) % 365) + 1;
    return GameData.FESTIVALS.find(f => f.day === doy) || null;
  },
  /** v37（E247）：互动节庆名录——auto 回放（闭关/离线跨日补结）遇之改挂起补办而非就地从简 */
  INTERACTIVE: ['shangyuan', 'zhongyuan', 'chuxi'],
  PENDING_DAYS: 3,   // 补办窗口：出关后 3 游戏日内
  /** 每次行动后检查：节庆日首次触发（按 年+节庆 记旗标，一年只过一次）
   *  v27 auto=离线回放模式：互动型节庆自动从简（不弹窗、不开战），资源型节庆照常入账
   *  v37（E247）：非 auto 收尾先查挂起补办；auto 遇互动节庆改挂 p.pendingFestival（双同步迁移） */
  check(p, auto = false) {
    if (!auto) this.resolvePending(p);
    const f = this.today(p);
    if (!f || !p || p.dead) return;
    const year = Math.floor((p.day || 0) / 365) + 1;
    p.flags = p.flags || {};
    const key = 'fest_' + f.id + '_' + year;
    if (p.flags[key]) return;
    // v32 修瑕（E61/A3）：战斗或弹窗进行中挂起（不置旗标，收尾链下次 afterAction 再试）——
    // 原 fire 可在任意行动后异步插入：节庆弹窗单例会强制释放玩家正在看的弹窗（按取消结算）、
    // 年兽开战与秘境/世界事件开战互斥（Battle.start 对 active 静默丢弃，后到者连旗标带机缘一并蒸发）
    if (!auto && (Battle.active || UI._popupResolve)) return;
    p.flags[key] = true;
    // v37（E247）：auto 回放遇互动节庆——挂起待补办（完整版含除夕年兽战），不再就地从简
    if (auto && this.INTERACTIVE.includes(f.id)) {
      p.pendingFestival = { id: f.id, day: Math.floor(p.day || 0) };
      Log.add(`【节庆 · ${f.name}】你在闭关中错过了今日的热闹——三日内出关，还来得及补办。`, 'info');
      return;
    }
    // v33（E107）修瑕：fire 中途抛错（异步 rejection 不入 dailySettle 的 try/catch）时旗标已落、
    // 整年节庆静默蒸发——现失败回滚旗标，收尾链下次 afterAction 重试（置位保持在前，防重入环）。
    try {
      const r = this.fire(p, f, auto);
      if (r && typeof r.catch === 'function') r.catch(() => { delete p.flags[key]; });
    } catch (err) {
      delete p.flags[key];
      throw err;
    }
  },
  /** v37（E247）：补办入口——非 auto 收尾链（出关后的 afterAction / enterGame 后首次行动）调用。
   *  3 游戏日内弹完整版（含除夕年兽战）；超期自动从简结算 + 日志「错过了」。
   *  与 E200 TowerSys.waitIdle 四时机挂起语义不冲突：战斗/弹窗在场时不催办，出塔再补办 */
  resolvePending(p) {
    const pf = p.pendingFestival;
    if (!pf || !pf.id) return;
    if (Battle.active || UI._popupResolve) return;
    const fdef = GameData.FESTIVALS.find(x => x.id === pf.id);
    p.pendingFestival = null;
    if (!fdef) return;
    const days = Math.floor(p.day || 0) - Math.floor(pf.day || 0);
    if (days > this.PENDING_DAYS) {
      Log.add(`（${fdef.name}的补办时机已过——那场热闹，终究是错过了。）`, 'info');
      this.fire(p, fdef, true);   // 超期自动从简结算
      return;
    }
    Log.add(`你想起${days > 0 ? ` ${days} 日前` : ''}错过的【${fdef.name}】——如今补办，热闹还赶得上！`, 'event');
    try {
      const r = this.fire(p, fdef, false);
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (err) { console.error('节庆补办异常:', err); }
  },
  /** 当日是否某节庆（供玩法钩子查询，如中秋赠礼加倍） */
  is(p, id) { const f = this.today(p); return !!(f && f.id === id); },
  async fire(p, f, auto = false) {
    if (typeof Ambience !== 'undefined') Ambience.sfx('bell');   // v37（E232）：开节钟磬（死音效 bell 接线）
    Log.add(`【节庆 · ${f.name}】${f.desc}`, 'event');
    if (!auto) UI.announce(`✦ ${f.name} ✦`, 'gold');
    if (f.id === 'shangyuan') {
      if (auto) {   // v27：离线错过灯会，随手揭一签
        Cultivate.addInsight(p, 2, false);
        Log.add('（离线错过灯会——你隔日对着记忆里的谜面想了想，也算略有所得。突破感悟 +2）', 'info');
        return;
      }
      // v28 联动：灯谜正误率吃有效悟性（40 + 悟性×2，封顶 85）——读得多，猜得准
      const right = Utils.chance(Math.min(85, 40 + Stat.compOf(p) * 2));
      // v37（E251）：正解按年哈希轮换（复用黑市 day-hash 轮子），成算不再决定「答对与否」，
      // 改作用于答对后的奖励品质第二层——消除「低悟性故意答错更优」的逆选择；primary 标记随正解走
      const year = Math.floor((p.day || 0) / 365) + 1;
      const correct = ['a', 'b', 'c'][Utils.hashStr('riddle' + year) % 3];
      const ans = await UI.popup({
        title: '上元灯会 · 灯谜',
        html: '一盏走马灯下悬着谜面：「白日隐形，夜里提灯，照尽人间不平。——打一修行之物。」',
        options: [
          { text: '火符', value: 'a', primary: correct === 'a' },
          { text: '明镜', value: 'b', primary: correct === 'b' },
          { text: '灯芯', value: 'c', primary: correct === 'c' },
        ],
      });
      if (ans === correct) {
        if (right) {
          Cultivate.addInsight(p, 5, false);
          KarmaSys.addFortune(1);
          Log.add('你揭下谜底——满堂彩声，灯楼主人赠你一页前辈手札。（突破感悟 +5，气运 +1）', 'gain');
        } else {
          Cultivate.addInsight(p, 3, false);   // 品质第二层：成算不足，赏格折中
          Log.add('谜底虽对，玄机只解了三分——灯楼主人笑着递上半页手札。（突破感悟 +3）', 'gain');
        }
      } else {
        Cultivate.addInsight(p, 2, false);
        Log.add('谜底揭错，众人善意的哄笑里，你也悟得几分。（突破感悟 +2）', 'info');
      }
    } else if (f.id === 'huazhao') {
      let n = 0;
      for (const plot of (p.cave && p.cave.plots) || []) {
        if (plot && plot.seed) {
          // v27 修瑕：花朝催熟按「剩余生长期」-2 日——此前对总生长期直减，临近成熟等于当日即收
          const grown = Math.max(0, Math.floor(p.day) - (plot.plantedDay || 0));
          const remaining = Math.max(0, (plot.days || 0) - grown);
          plot.days = grown + (remaining > 0 ? Math.max(1, remaining - 2) : 0);
          n++;
        }
      }
      Log.add(n ? `花神过境——灵田里 ${n} 块作物的生长骤然加快（每块 -2 日）！` : '花神过境——可惜你灵田里空空如也，只讨了个好彩头。', n ? 'gain' : 'info');
    } else if (f.id === 'zhongyuan') {
      if (auto) {   // v27：离线错过河灯，静观其变
        Log.add('（离线错过中元——河灯顺水漂远，你只在心里默祷了一声。）', 'info');
        return;
      }
      const choice = await UI.popup({
        title: '中元鬼节 · 河灯',
        html: '河面上漂满引魂灯。你手边正有一盏——<br><span class="tip-line">· 点灯超度：孽障 -3，气运 +2<br>· 静观其变：一身轻</span>',
        options: [{ text: '点灯超度', value: 'light', primary: true }, { text: '静观其变', value: 'skip' }],
      });
      if (choice === 'light') {
        KarmaSys.addKarma(-3, true);
        KarmaSys.addFortune(2);
        Log.add('你俯身点亮河灯，看它摇摇晃晃漂向黑暗深处——愿各安来处。（孽障 -3，气运 +2）', 'gain');
      } else {
        Log.add('你抱臂看了一夜河灯，天明方归。', 'info');
      }
    } else if (f.id === 'duanwu') {
      // v30 端午：食粽驱邪 / 观舟得彩
      if (auto) {
        p.poison = Math.max(0, p.poison - 10);
        Cultivate.addInsight(p, 2, false);
        Log.add('（离线端午——邻里送来的粽子还温着。食粽驱邪，丹毒 -10，感悟 +2。）', 'info');
        return;
      }
      const c = await UI.popup({
        title: '✦ 端午龙舟 ✦',
        html: '江面龙舟竞渡，鼓声震天。邻里提来一篮新粽，药铺挂起艾草菖蒲。',
        options: [
          { text: '食粽驱邪（丹毒 -15，感悟 +3）', value: 'zong', primary: true },
          { text: '下注观舟（赌一手彩头）', value: 'boat' },
        ],
      });
      if (c === 'zong') {
        p.poison = Math.max(0, p.poison - 15);
        Cultivate.addInsight(p, 3, false);
        Log.add('糯米裹着枣香下肚，一股暖流涤荡百脉——丹毒 -15，感悟 +3。', 'gain');
      } else {
        const win = Utils.chance(50);
        const stake = Math.round(20 * GameData.stoneEco(p.realmIdx));
        if (win) { Bag.addStones(stake * 2); Log.add(`你押的龙舟一马当先——彩头翻倍，灵石 +${Utils.fmtNum(stake * 2)}！`, 'gain'); }
        else { Bag.spendStonesMax(stake); Log.add(`你押的龙舟半道散了队形——彩头落空，灵石 -${Utils.fmtNum(stake)}。`, 'loss'); }
      }
    } else if (f.id === 'chongyang') {
      // v30 重阳：登高 / 插茱萸
      if (auto) {
        KarmaSys.addFortune(1);
        Log.add('（离线重阳——你在洞府前远眺了一炷香，算登过了高。气运 +1。）', 'info');
        return;
      }
      const c2 = await UI.popup({
        title: '✦ 重阳登高 ✦',
        html: '秋高气爽，正是登高时节。山径旁茱萸红得正好。',
        options: [
          { text: '登高望远（气运 +2，感悟 +2）', value: 'climb', primary: true },
          { text: '遍插茱萸（气血灵力尽复，丹毒尽去）', value: 'zhuyu' },
        ],
      });
      if (c2 === 'climb') {
        KarmaSys.addFortune(2);
        Cultivate.addInsight(p, 2, false);
        Log.add('你一路登上最高处，天地忽然开阔——襟怀一畅，气运 +2，感悟 +2。', 'gain');
      } else {
        const st = Stat.compute(p);
        p.hp = st.maxHp; p.mp = st.maxMp; p.poison = 0;
        Log.add('茱萸别在襟前，草木清气入体——气血灵力尽复，丹毒尽去。', 'gain');
      }
    } else if (f.id === 'zhongqiu') {
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      KarmaSys.addFortune(1);
      Log.add('你分得一块月饼，与同门席地分食，月色正好。（气血灵力尽复，气运 +1；今日赠礼情谊加倍）', 'gain');
    } else if (f.id === 'chuxi') {
      if (auto) {   // v27：离线年关，安分守岁
        Log.add('（离线年关——你闭门守岁，听了一夜爆竹与风吼。天明雪地上满是巨大爪印。）', 'info');
        return;
      }
      const choice = await UI.popup({
        title: '除夕年关 · 年兽',
        html: '爆竹声里，山中隐隐传来低吼——年兽循着人间烟火气来了。<br><span class="tip-line">· 迎战年兽：胜则压岁厚重<br>· 安分守岁：闭门不出</span>',
        options: [{ text: '迎战年兽', value: 'fight', primary: true }, { text: '安分守岁', value: 'safe' }],
      });
      if (choice !== 'fight') { Log.add('你紧闭门户，听了一夜风吼——天亮时，雪地上满是巨大的爪印。', 'info'); return; }
      const rp = Utils.clamp(p.realmIdx * 4 + p.layer + 1, 1, 60);
      const rIdx = Utils.clamp(Math.floor(rp / 4), 0, 9);
      const enemy = {
        id: null, name: '年兽', elite: true, power: rp, species: 'beast',
        realmLabel: GameData.REALM_NAMES[rIdx] + GameData.LAYER_NAMES[Utils.clamp(rp % 4, 0, 3)],
        hpMax: Math.round((55 + Math.pow(rp, 1.6) * 5) * 1.7 * 1.2),
        atk: Math.round((6 + rp * 2.6) * 1.35),
        def: Math.round((4 + rp * 2.2) * 0.9), spd: Math.round(7 + rp * 0.9),
        dodge: 5, crit: 10,
        skills: [
          { name: '吞火吐雷', w: 30, kind: 'burn', pct: 4, rounds: 2 },
          { name: '岁末狂啸', w: 30, kind: 'roar', atk: 25, rounds: 2 },
          { name: '噬岁', w: 25, kind: 'drain', mult: 1.2, leech: 0.4 },
        ],
        expGain: Math.round(40 * GameData.eco(rIdx)), stoneGain: 0, dropTier: 3, rareDrop: null, hp: 0,
        _storyBark: '年兽浑身的毛尖上都燃着火星——它饿了整整一年。',
      };
      Battle.start(null, { enemy, mapName: '除夕 · 年关', story: {
        onEnd: (win) => {
          const pp = Game.player;
          if (win) {
            const lucky = Math.round(200 * GameData.stoneEco(Math.min(5, pp.realmIdx)));
            Bag.addStones(lucky);
            KarmaSys.addFortune(3);
            Log.add(`年兽哀鸣着伏倒——满地红绸与碎银！压岁灵石 ${Utils.fmtNum(lucky)}，气运 +3。来年百邪不侵。`, 'gain');
            UI.announce('✦ 年关大吉 ✦', 'gold');
            Story.chron('除夕迎战年兽得胜');
          } else {
            Story.chron('除夕迎战年兽失利，闭门疗伤');   // v35（E157）：原与「安分守岁」共用一句，迎战落败回顾时自相矛盾
          }
          Game.afterAction();
        },
      } });
      return;
    }
    if (!auto) Game.afterAction();
  },
};
window.FestivalSys = FestivalSys;
