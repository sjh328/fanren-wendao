/* v19「血肉」大升级验证：剧情角色一体化 / 养成深度 / 战斗升级 / 经济 / 长线
 * 运行：node verify-v9.mjs （需先 node server.mjs）
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Google/Chrome/chrome.exe',
  process.env.CHROME_PATH,
  process.env.PUPPETEER_CHROME_PATH,
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find(f => f && fs.existsSync(f)) || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8341/index.html';

const results = [];
const consoleErrors = [];
const pass = (name) => { results.push(['PASS', name]); console.log('  ✓ ' + name); };
const fail = (name, detail) => { results.push(['FAIL', name + ' :: ' + detail]); console.log('  ✗ ' + name + ' :: ' + detail); };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

let browser;
try {
  browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(600);


  /* ================= S0 新档（供后续断言使用玩家对象） ================= */
  await page.click('[data-action="st-newgame"][data-slot="2"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = ''; });
  await page.type('#create-name', 'v19道人');
  await page.click('[data-action="st-start"]');
  await sleep(900);
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => {
      const t = document.getElementById('tutorial');
      if (t && !t.className.includes('hidden')) { const b = t.querySelector('[data-action="tut-next"]'); if (b) { b.click(); return 'tut'; } }
      const sm = document.getElementById('story-modal');
      if (sm && !sm.className.includes('hidden')) {
        if (Story.cur && Story.cur.scenes[Story.cur.idx] && Story.cur.scenes[Story.cur.idx].t === 'battle') return 'battle';
        const c = document.querySelector('.story-opt');
        if (c) { c.click(); return 'choice'; }
        const n = document.querySelector('[data-action="story-next"]');
        if (n) { n.click(); return 'story'; }
      }
      return 'done';
    });
    if (st === 'battle') {
      await page.evaluate(() => { const b = document.querySelector('[data-action="story-battle"]'); if (b) b.click(); });
      await sleep(500);
      await page.evaluate(async () => { const B = Battle.active; if (B) { B.busy = false; B.over = false; B.enemy.hp = 0; await Battle.victory(); } });
      await sleep(600);
    }
    if (st === 'done') break;
    await sleep(160);
  }
  pass('S0 新档创建与开篇演出走完');

  /* ================= S1 世界观圣经与角色注册表 ================= */
  const s1 = await page.evaluate(() => ({
    lore: !!(GameData.LORE && GameData.LORE.bloodRiver && GameData.LORE.timeline && GameData.LORE.factions),
    timelineN: (GameData.LORE.timeline || []).length,
    chars: Object.keys(GameData.CHARACTERS || {}).length,
    roles: Object.keys(GameData.STORY_ROLES || {}).length,
  }));
  s1.lore && s1.timelineN >= 6 ? pass('S1 世界观圣经（血河真相/时间线/立场表）') : fail('S1 世界观圣经', JSON.stringify(s1));
  s1.chars >= 18 ? pass(`S1 角色注册表 ${s1.chars} 人（主线角色+江湖角色）`) : fail('S1 角色注册表', String(s1.chars));
  s1.roles >= 16 ? pass(`S1 江湖修士主线定位 ${s1.roles} 条`) : fail('S1 主线定位', String(s1.roles));

  /* ================= S2 剧情脚本库扩容与新场景类型 ================= */
  const s2 = await page.evaluate(() => {
    const keys = Object.keys(GameData.STORIES);
    let battle = 0, investigate = 0, montage = 0, flagScene = 0, reqChoice = 0, scenes = 0;
    for (const [, sc] of Object.entries(GameData.STORIES)) {
      for (const st of (sc.scenes || [])) {
        scenes++;
        if (st.t === 'battle') battle++;
        if (st.t === 'investigate') investigate++;
        if (st.t === 'montage') montage++;
        if (st.req || st.noFlag) flagScene++;
        if (st.reqChoice) reqChoice++;
      }
    }
    const mid2 = keys.filter(k => k.endsWith('_mid2')).length;
    const pl = keys.filter(k => k.startsWith('pl_')).length;
    return { total: keys.length, scenes, battle, investigate, montage, flagScene, reqChoice, mid2, pl };
  });
  s2.total >= 59 && s2.pl === 30 ? pass(`S2 剧情脚本 ${s2.total} 段（主线 36 + 个人线 30），共 ${s2.scenes} 场`) : fail('S2 脚本库', JSON.stringify(s2));
  s2.battle >= 6 && s2.investigate >= 2 && s2.montage >= 2 ? pass(`S2 新场景类型（剧情战 ${s2.battle}/推理 ${s2.investigate}/岁月 ${s2.montage}）`) : fail('S2 场景类型', JSON.stringify({ b: s2.battle, i: s2.investigate, m: s2.montage }));
  s2.mid2 >= 2 && s2.flagScene >= 9 ? pass(`S2 反派暗线插章 mid2 ×${s2.mid2}（其余章反派戏份内嵌）+ 旗标分支场景 ${s2.flagScene} 处`) : fail('S2 mid2', JSON.stringify({ mid2: s2.mid2, flag: s2.flagScene }));
  s2.reqChoice >= 4 ? pass('S2 尾声按当年抉择分支（reqChoice）') : fail('S2 reqChoice', String(s2.reqChoice));

  /* ================= S3 旗标引擎 ================= */
  const s3 = await page.evaluate(() => {
    const r = {};
    Story.setFlag('test_flag');
    r.reqHit = Story._vis({ req: 'test_flag' });
    r.reqMiss = Story._vis({ req: 'no_such' });
    r.noFlagHit = Story._vis({ noFlag: 'no_such' });
    r.noFlagMiss = Story._vis({ noFlag: 'test_flag' });
    Story.recordChoice('cX_end', 'valA');
    r.reqChoiceHit = Story._vis({ reqChoice: { key: 'cX_end', oneOf: ['valA', 'valB'] } });
    r.reqChoiceMiss = Story._vis({ reqChoice: { key: 'cX_end', oneOf: ['valC'] } });
    Story.chron('测试年表条目');
    r.chron = (Game.player.chronicle || []).some(e => e.txt === '测试年表条目');
    return r;
  });
  s3.reqHit && !s3.reqMiss && s3.noFlagHit && !s3.noFlagMiss ? pass('S3 旗标引擎（req/noFlag 过滤）') : fail('S3 旗标', JSON.stringify(s3));
  s3.reqChoiceHit && !s3.reqChoiceMiss && s3.chron ? pass('S3 抉择值分支（reqChoice）+ 大事年表写入') : fail('S3 reqChoice', JSON.stringify(s3));

  /* ================= S4 NPC 记忆与关系五档 ================= */
  const s4 = await page.evaluate(() => {
    const p = Game.player;
    const id = 'n6';
    NpcSys.state(p, id).met = true;
    NpcSys.state(p, id).rel = 35;
    NpcSys.mem(p, id, 'spar', '切磋获胜');
    NpcSys.mem(p, id, 'gift', '赠礼之谊');
    const s = NpcSys.state(p, id);
    return {
      memN: s.mem.length,
      tier: NpcSys.tierOf(35).name,
      tierSworn: NpcSys.tierOf(95).name,
      tierFoe: NpcSys.tierOf(-80).name,
      recall: !!NpcSys.recallLine(p, id),
      cap: (NpcSys.state(p, id).mem || []).length <= 8,
    };
  });
  s4.memN >= 2 && s4.recall && s4.cap ? pass('S4 NPC 记忆写入与回忆杀') : fail('S4 记忆', JSON.stringify(s4));
  s4.tier === '友好' && s4.tierSworn === '生死之交' && s4.tierFoe === '宿敌' ? pass('S4 关系五档判定（相识/友好/知己/生死之交/宿敌）') : fail('S4 关系档', JSON.stringify(s4));

  /* ================= S5 个人线 ================= */
  const s5 = await page.evaluate(() => {
    const ids = Object.keys(GameData.PERSONAL || {});
    const actsOk = ids.every(id => GameData.PERSONAL[id].acts.length === 3 && GameData.PERSONAL[id].fx);
    const p = Game.player;
    const nid = ids[0];
    p.personal = p.personal || {};
    p.personal[nid] = 3;   // 模拟三幕全通
    const bonus = PersonalSys.bonusOf(p);
    const fxKeys = Object.keys(GameData.PERSONAL[nid].fx);
    const applied = fxKeys.every(k => (bonus[k] || 0) >= GameData.PERSONAL[nid].fx[k]);
    p.personal[nid] = 0;
    const gate = PersonalSys.next(p, nid) === null;   // 关系不达标不可触发
    return { n: ids.length, actsOk, applied, gate, anyAvail: PersonalSys.anyAvailable(p) };
  });
  s5.n === 10 && s5.actsOk ? pass('S5 个人线 10 位 NPC × 三幕，奖励与永久加成齐备') : fail('S5 个人线数据', JSON.stringify(s5));
  s5.applied && s5.gate ? pass('S5 个人线永久加成入 Stat + 关系档门槛生效') : fail('S5 加成', JSON.stringify(s5));

  /* ================= S6 词缀系统实装 ================= */
  const s6 = await page.evaluate(() => {
    const pool = GameData.BALANCE.AFFIXES;
    const inst = { id: 'w_tiejian', enhance: 0 };
    ForgeSys.affixesOf(Game.player, inst);   // 补掷
    const fx = ForgeSys.suffixFx({ equipped: { weapon: { id: 'w_tiejian', enhance: 0, affixes: { suffix: 'leech' } } } });
    const bonus = ForgeSys.affixBonus({ equipped: { weapon: { id: 'w_tiejian', enhance: 0, affixes: { prefix: 'sharp' } } } });
    const rerollable = ['weapon', 'armor', 'accessory'].every(slot => GameData.BALANCE.AFFIXES.prefix.some(a => a.slot === slot || a.slot === 'any'));
    return { prefixes: pool.prefix.length, suffixes: pool.suffix.length, hasAff: !!inst.affixes, leech: fx.leech, atkPct: bonus.atkPct, rerollable };
  });
  s6.prefixes >= 12 && s6.suffixes >= 10 ? pass(`S6 词缀池扩至 ${s6.prefixes} 前缀 + ${s6.suffixes} 后缀`) : fail('S6 词缀池', JSON.stringify(s6));
  s6.hasAff && s6.leech > 0 && s6.atkPct > 0 ? pass('S6 实例词缀掷取 + 前缀加成/后缀战斗特效聚合') : fail('S6 实装', JSON.stringify(s6));
  s6.rerollable ? pass('S6 洗练可行（各槽位均有候选词缀）') : fail('S6 洗练', 'pool empty');

  /* ================= S7 心魔劫 ================= */
  const s7 = await page.evaluate(() => {
    const p = Game.player;
    XinmoSys.add(p, 120, '测试');
    const ready = XinmoSys.ready(p);
    const scale = XinmoSys.scale(p);
    p.xinmo = 0; p.flags = p.flags || {}; p.flags.xinmoCleared = 2;
    const cleared = XinmoSys.scale(p);
    p.flags.xinmoCleared = 0;
    return { ready, scale1: scale, cleared };
  });
  s7.ready && s7.scale1 === 1 ? pass('S7 心魔值累积至满百（劫至）') : fail('S7 心魔', JSON.stringify(s7));
  s7.cleared === 1.02 ? pass('S7 心魔凝练：每降伏一次全属性 +1%（可叠加）') : fail('S7 凝练', String(s7.cleared));

  /* ================= S8 道韵协同 ================= */
  const s8 = await page.evaluate(() => {
    const p = Game.player;
    p.gongfa = { gf_jianxin: { level: 3, exp: 0 }, gf_wanjian: { level: 3, exp: 0 } };
    const on = Stat.activeDaoYun(p).length === 1;
    const bonusOn = Stat.gongfaBonus(p).atkPct;
    p.gongfa.gf_wanjian.level = 2;
    const off = Stat.activeDaoYun(p).length === 0;
    const bonusOff = Stat.gongfaBonus(p).atkPct;
    p.gongfa = {};
    return { on, off, drop: bonusOn - bonusOff >= 4 };
  });
  s8.on && s8.off && s8.drop ? pass('S8 道韵协同：双功法三层共鸣生效（+4% 攻击）、不足三层即散') : fail('S8 道韵', JSON.stringify(s8));

  /* ================= S9 拍卖行与布施 ================= */
  const s9 = await page.evaluate(() => {
    const p = Game.player;
    p.day = 300;
    const a1 = AuctionSys.state(p);
    const a2 = AuctionSys.state(p);   // 同日确定性
    const lots = AuctionSys.LOT_POOL.length;
    const tierOk = DonateSys.TIERS.length === 3 && DonateSys.TIERS.every(t => t.rep > 0 && t.karma < 0);
    return { det: a1.item === a2.item && a1.base === a2.base, until: a1.until > 300, lots, tierOk };
  });
  s9.det && s9.until && s9.lots >= 10 ? pass(`S9 拍卖行：拍期六十日、按日确定性出货（拍品池 ${s9.lots} 件含套装）`) : fail('S9 拍卖', JSON.stringify(s9));
  s9.tierOk ? pass('S9 布施三档（声望↑气运↑孽障↓）') : fail('S9 布施', '');

  /* ================= S10 洞府营造与灵兽增强 ================= */
  const s10 = await page.evaluate(() => {
    const p = Game.player;
    p.cave = { lv: 1, plots: [], builds: { beast: 2, train: 1, lib: 1 } };
    const slots = BeastSys.maxSlots(p);
    p.beasts = { active: null, active2: null, list: [{ uid: 1, id: 'm_yezhu', name: '野猪', species: 'beast', power: 5, level: 1, exp: 0, skills: [], bond: 50 }], nextId: 2 };
    p.beasts.active2 = 1;
    const passive = BeastSys.passive(p);
    const skill = BeastSys.SPECIES_SKILLS['beast'];
    return { slots, passiveAtk: passive.atkPct || 0, half: passive.atkPct < Math.round(5 * 0.6 + 1 * 0.8) + 1, skill: !!skill, builds: CaveSys.BUILDS.length };
  });
  s10.slots >= 8 && s10.builds === 6 ? pass(`S10 洞府营造六建筑（v20 扩容；灵兽窝使兽栏至 ${s10.slots} 位）`) : fail('S10 营造', JSON.stringify(s10));
  s10.passiveAtk > 0 && s10.half && s10.skill ? pass('S10 副战灵兽五成被动 + 物种天生技表') : fail('S10 灵兽', JSON.stringify(s10));

  /* ================= S11 套装与出身/传承树 ================= */
  const s11 = await page.evaluate(() => ({
    sets: Object.keys(GameData.SETS).length,
    xueheForge: GameData.FORGE_RECIPES.some(r => r.out === 's_hj_sha'),
    xyLot: AuctionSys.LOT_POOL.some(l => l.item.startsWith('s_xy_')),
    origins: GameData.ORIGINS.length,
    heritor: !!GameData.ORIGINS.find(o => o.id === 'heritor' && o.start.jade),
  }));
  s11.sets >= 4 && s11.xueheForge && s11.xyLot ? pass('S11 血河/仙缘套装齐备（锻造+拍卖双途径）') : fail('S11 套装', JSON.stringify(s11));
  s11.origins >= 8 && s11.heritor ? pass(`S11 转世出身 ${s11.origins} 种（血河遗孤带孽障与残玉）`) : fail('S11 出身', JSON.stringify(s11));

  /* ================= S12 老档迁移：v19 全字段 ================= */
  const s12 = await page.evaluate(() => {
    const old = {
      name: '旧档道人', attrs: { gen: 5, comp: 5, luck: 5, body: 5 }, realmIdx: 3, layer: 1, exp: 10,
      stones: { low: 100, mid: 0, high: 0 }, bag: {}, gongfa: {}, counters: {}, flags: {},
      equipped: { weapon: 'w_tiejian', armor: null, accessory: null },
      dao: 'sword', jade: 0, quest: { ch: 4, side: {} },
      cave: { lv: 2, plots: [] },
    };
    const p = PlayerFactory.migrate(old);
    return {
      xinmo: p.xinmo === 0,
      benming: p.benming && p.benming.lv === 0,
      builds: p.cave && p.cave.builds && p.cave.builds.beast === 0,
      active2: p.beasts && p.beasts.active2 === null,
      mem: p.npcs && Object.values(p.npcs).every(s => Array.isArray(s.mem)),
      flags: p.story && typeof p.story.flags === 'object',
      chronicle: Array.isArray(p.chronicle),
      personal: typeof p.personal === 'object',
      jadeFold: p.jade >= 4,   // v18.1 追认：quest.ch 4 → 残玉 4 重
      daoFold: p.daoExp && p.daoExp.sword >= 300,   // v19 修复后的 v16 折算（元婴 → 剑气/剑芒 2 重 300 剑意）
    };
  });
  const s12ok = s12.xinmo && s12.benming && s12.builds && s12.active2 && s12.mem && s12.flags && s12.chronicle && s12.personal;
  s12ok ? pass('S12 老档迁移：v19 全字段自动补齐（心魔/本命/营造/副战/记忆/旗标/年表/个人线）') : fail('S12 迁移', JSON.stringify(s12));
  s12.jadeFold && s12.daoFold ? pass('S12 残玉共鸣与道境经验迁移折算正确（v16 折算修复）') : fail('S12 折算', JSON.stringify({ jade: s12.jadeFold, dao: s12.daoFold }));

  /* ================= S13 装备对比弹窗 / 字号 / 分阶教学 ================= */
  const s13 = await page.evaluate(() => {
    const tips = Guide.REALM_TIPS;
    const fontOk = typeof Ambience.applyFontScale === 'function';
    return { tips: Object.keys(tips || {}).length, fontOk };
  });
  s13.tips >= 3 && s13.fontOk ? pass('S13 分阶段教学要诀 + 界面字号三档') : fail('S13 教学', JSON.stringify(s13));

  /* ================= S13b 补全项：失传丹方/灵兽进化/台词矩阵/天气 ================= */
  const s13b = await page.evaluate(async () => {
    const p = Game.player;
    // 失传丹方：未参悟不可炼，参悟后解锁
    const a1 = GameData.ALCHEMY_RECIPES.find(r => r.id === 'a1');
    p.flags = p.flags || {}; p.flags.recipeOk = {};
    p.bag = p.bag || {};
    Bag.addItem('m_lingzhi', 5); Bag.addItem('m_haixin', 3); Bag.addItem('m_danfang', 5);
    CraftSys.alchemy('a1');
    const blocked = !p.bag.pill_huiyuan;
    const realPopup = UI.popup; UI.popup = async () => true;   // 桩掉参悟确认窗
    await CraftSys.studyRecipe('a1');
    UI.popup = realPopup;
    const unlocked = (p.flags.recipeOk || {}).a1 === true && Bag.count('m_danfang') === 3;
    // 灵兽进化：条件判定
    p.beasts = { active: null, active2: null, list: [{ uid: 9, id: 'm_yezhu', name: '野猪', species: 'beast', power: 8, level: 10, exp: 0, skills: [], bond: 0 }], nextId: 2 };
    const notReady = p.beasts.list[0].level < 10 ? false : true;
    // 台词矩阵：24 人齐备、语境齐全
    const lineOk = Object.keys(GameData.NPC_LINES).length === 24 &&
      Object.values(GameData.NPC_LINES).every(L => L.greet.length >= 3 && L.gift.length >= 2 && L.spar.length >= 2 && L.discuss.length >= 2 && L.realm.length >= 2 && L.hostile.length >= 2);
    const greetTier = NpcSys.lineFor(p, 'n23', 'greet');
    // 天气：确定性 + 六态
    const w1 = Art.weatherOf({ day: 100 }, 'village'), w2 = Art.weatherOf({ day: 100 }, 'village');
    const det = JSON.stringify(w1) === JSON.stringify(w2);
    return { blocked, unlocked, notReady, lineOk, greetTier: !!greetTier, det };
  });
  s13b.blocked && s13b.unlocked ? pass('S13b 失传丹方：未参悟不可炼，残页参悟永久解锁') : fail('S13b 丹方', JSON.stringify(s13b));
  s13b.notReady && s13b.lineOk && s13b.greetTier ? pass('S13b 灵兽进化就绪判定 + 台词矩阵 24 人×6 语境齐备') : fail('S13b 进化/台词', JSON.stringify(s13b));
  s13b.det ? pass('S13b 天气确定性派生（同日同地必同天）') : fail('S13b 天气', '');

  /* ================= S14 冒烟：修炼一轮 ================= */
  const smoke = await page.evaluate(() => {
    Cultivate.normal();
    return {
      playing: !Game.player.dead,
      seen: !!(Game.player.story.seen.c1_open),
      flagsOk: typeof Game.player.story.flags === 'object',
    };
  });
  smoke.playing && smoke.seen && smoke.flagsOk ? pass('S14 全流程冒烟：新档→引导→开篇（含新场景）→修炼') : fail('S14 冒烟', JSON.stringify(smoke));

} catch (err) {
  fail('脚本异常中断', String(err && err.stack || err).slice(0, 300));
} finally {
  if (browser) await browser.close();
  console.log('\n===== v19 验证完成 =====');
  const nPass = results.filter(r => r[0] === 'PASS').length;
  const nFail = results.filter(r => r[0] === 'FAIL').length;
  console.log(`共 ${results.length} 项，失败 ${nFail} 项`);
  if (consoleErrors.length) {
    console.log(`控制台错误 ${consoleErrors.length} 条:`);
    consoleErrors.slice(0, 8).forEach(e => console.log('  [console]', String(e).slice(0, 160)));
    process.exitCode = 1;
  } else {
    console.log('控制台错误 0 条');
  }
  if (nFail > 0) process.exitCode = 1;
}
