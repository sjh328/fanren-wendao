
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
  /** 每次行动后检查：节庆日首次触发（按 年+节庆 记旗标，一年只过一次） */
  check(p) {
    const f = this.today(p);
    if (!f || !p || p.dead) return;
    const year = Math.floor((p.day || 0) / 365) + 1;
    p.flags = p.flags || {};
    const key = 'fest_' + f.id + '_' + year;
    if (p.flags[key]) return;
    p.flags[key] = true;
    this.fire(p, f);
  },
  /** 当日是否某节庆（供玩法钩子查询，如中秋赠礼加倍） */
  is(p, id) { const f = this.today(p); return !!(f && f.id === id); },
  async fire(p, f) {
    Log.add(`【节庆 · ${f.name}】${f.desc}`, 'event');
    UI.announce(`✦ ${f.name} ✦`, 'gold');
    if (f.id === 'shangyuan') {
      const right = Utils.chance(50);
      const ans = await UI.popup({
        title: '上元灯会 · 灯谜',
        html: '一盏走马灯下悬着谜面：「白日隐形，夜里提灯，照尽人间不平。——打一修行之物。」',
        options: [{ text: '火符', value: 'a' }, { text: '明镜', value: 'b', primary: true }, { text: '灯芯', value: 'c' }],
      });
      if ((right && ans === 'b') || (!right && ans !== 'b')) {
        p.insight = Math.min(100, (p.insight || 0) + 5);
        KarmaSys.addFortune(1);
        Log.add('你揭下谜底——满堂彩声，灯楼主人赠你一页前辈手札。（突破感悟 +5，气运 +1）', 'gain');
      } else {
        p.insight = Math.min(100, (p.insight || 0) + 2);
        Log.add('谜底揭错，众人善意的哄笑里，你也悟得几分。（突破感悟 +2）', 'info');
      }
    } else if (f.id === 'huazhao') {
      let n = 0;
      for (const plot of (p.cave && p.cave.plots) || []) {
        if (plot && plot.seed) { plot.days = Math.max(1, plot.days - 2); n++; }
      }
      Log.add(n ? `花神过境——灵田里 ${n} 块作物的生长骤然加快（每块 -2 日）！` : '花神过境——可惜你灵田里空空如也，只讨了个好彩头。', n ? 'gain' : 'info');
    } else if (f.id === 'zhongyuan') {
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
    } else if (f.id === 'zhongqiu') {
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      KarmaSys.addFortune(1);
      Log.add('你分得一块月饼，与同门席地分食，月色正好。（气血灵力尽复，气运 +1；今日赠礼情谊加倍）', 'gain');
    } else if (f.id === 'chuxi') {
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
            Story.chron('除夕年兽来袭，闭门自守');
          }
          Game.afterAction();
        },
      } });
      return;
    }
    Game.afterAction();
  },
};
window.FestivalSys = FestivalSys;
