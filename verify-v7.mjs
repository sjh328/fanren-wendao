/* v13「万象更新」大升级专项验证：战斗深化 / 强化炼器套装 / 洞府 / 灵兽 / 悬赏黑市天骄榜 / 新内容 / 迁移
 * 运行：node verify-v7.mjs （需先 node server.mjs）
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:8341/index.html';
const SHOT_DIR = 'D:/code/javacode/game/gui-test-screenshots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
const consoleErrors = [];
let shotIdx = 0;
const pass = (name) => { results.push(['PASS', name]); console.log('  ✓ ' + name); };
const fail = (name, detail) => { results.push(['FAIL', name + ' :: ' + detail]); console.log('  ✗ ' + name + ' :: ' + detail); };
const shot = async (page, tag) => {
  shotIdx++;
  const path = `${SHOT_DIR}/v7t${String(shotIdx).padStart(2, '0')}_${tag}.png`;
  await page.screenshot({ path });
  return path;
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const text = (page, sel) => page.$eval(sel, el => el.innerText).catch(() => '');
const clickPopupBtn = async (idx) => {
  const open = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
  if (!open) return;
  const btns = await page.$$('#popup-btns button');
  if (btns.length > idx) await btns[idx].click();
  await sleep(350);
};

const finishStory = async (max = 40) => {
  for (let i = 0; i < max; i++) {
    const open = await page.$eval('#story-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (!open) return true;
    // v19 剧情战场次：迎战并直接判胜，故事继续
    const isBattle = await page.evaluate(() => Story.cur && Story.cur.scenes[Story.cur.idx] && Story.cur.scenes[Story.cur.idx].t === 'battle').catch(() => false);
    if (isBattle) {
      await page.evaluate(() => { const b = document.querySelector('[data-action="story-battle"]'); if (b) b.click(); });
      await sleep(500);
      await page.evaluate(async () => {
        const B = Battle.active;
        if (B) { B.busy = false; B.over = false; B.enemy.hp = 0; await Battle.victory(); }
      });
      await sleep(600);
      continue;
    }
    const choice = await page.$('[data-story-choice]');
    if (choice) { await choice.click(); await sleep(450); continue; }
    await page.click('[data-action="story-next"]').catch(() => {});
    await sleep(320);
  }
  return !(await page.$eval('#story-modal', el => !el.className.includes('hidden')).catch(() => false));
};

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--window-size=1280,760'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 200)));

try {
  /* ---------- 开局 ---------- */
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(400);
  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = '万象道人'; });
  await page.click('[data-action="st-start"]');
  await sleep(400);
  for (let i = 0; i < 6; i++) {
    const btn = await page.$('[data-action="tut-next"]');
    if (!btn) break;
    try { await btn.click(); } catch (e) { break; }
    await sleep(100);
  }
  pass('T0 开局进入游戏（v13 存档位三）');
  // v15：主线预完结 + 中段预标记，防止造档触发剧情演出遮挡后续测试
  await page.evaluate(() => {
    const p = Game.player;
    p.quest = { ch: 9, side: { s1: true, s2: true, s3: true, s4: true, s5: true } };
    p.story = { seen: {}, mid: {}, choices: {} };
    for (const d of QuestSys.CHAPTERS) p.story.mid[d.id] = 1;
    Story.close();
  });
  await sleep(300);

  /* ================= W1 内容注册表完整性 ================= */
  const w1 = await page.evaluate(() => ({
    maps: GameData.MAPS.length,
    monsters: Object.keys(GameData.MONSTERS).length,
    monsterSkills: Object.values(GameData.MONSTERS).filter(m => Array.isArray(m.skills) && m.skills.length).length,
    monsterSpecies: Object.values(GameData.MONSTERS).filter(m => m.species).length,
    gongfa: Object.values(GameData.ITEMS).filter(d => d.type === 'gongfa').length,
    daoLimitGf: Object.values(GameData.ITEMS).filter(d => d.type === 'gongfa' && d.daoLimit).length,
    pills: Object.values(GameData.ITEMS).filter(d => d.type === 'pill').length,
    buffs: Object.values(GameData.ITEMS).filter(d => d.type === 'pill' && d.buff).length,
    talismans: Object.values(GameData.ITEMS).filter(d => d.type === 'talisman').length,
    artifacts: Object.values(GameData.ITEMS).filter(d => d.type === 'artifact').length,
    sets: Object.keys(GameData.SETS).length,
    sects: GameData.SECTS.length,
    npcs: GameData.NPCS.length,
    seeds: Object.values(GameData.ITEMS).filter(d => d.type === 'seed').length,
    alchemy: GameData.ALCHEMY_RECIPES.length,
    forge: GameData.FORGE_RECIPES.length,
    codexIntro: Object.keys(GameData.CODEX_INTRO).length,
  }));
  (w1.maps >= 9 ? pass : fail)('W1 地图 5→9', JSON.stringify(w1.maps));
  (w1.monsters >= 45 ? pass : fail)('W1 怪物 23→47', JSON.stringify(w1.monsters));
  (w1.monsterSkills === w1.monsters ? pass : fail)('W1 全怪物配技能', `${w1.monsterSkills}/${w1.monsters}`);
  (w1.monsterSpecies === w1.monsters ? pass : fail)('W1 全怪物配种族立绘', `${w1.monsterSpecies}/${w1.monsters}`);
  (w1.gongfa >= 28 ? pass : fail)('W1 功法 17→28', JSON.stringify(w1.gongfa));
  (w1.daoLimitGf >= 6 ? pass : fail)('W1 职业专属功法 6 门', JSON.stringify(w1.daoLimitGf));
  (w1.pills >= 24 ? pass : fail)('W1 丹药 13→24', JSON.stringify(w1.pills));
  (w1.buffs >= 4 ? pass : fail)('W1 战斗增益丹 4 种', JSON.stringify(w1.buffs));
  (w1.talismans >= 8 ? pass : fail)('W1 符箓 2→8', JSON.stringify(w1.talismans));
  (w1.artifacts >= 30 ? pass : fail)('W1 装备扩至 35 件', JSON.stringify(w1.artifacts));
  (w1.sets >= 2 ? pass : fail)('W1 套装 2 套', JSON.stringify(w1.sets));
  (w1.sects >= 5 ? pass : fail)('W1 宗门 3→5', JSON.stringify(w1.sects));
  (w1.npcs >= 24 ? pass : fail)('W1 常驻修士 15→24', JSON.stringify(w1.npcs));
  (w1.seeds >= 5 ? pass : fail)('W1 灵田种子', JSON.stringify(w1.seeds));
  (w1.alchemy >= 12 ? pass : fail)('W1 炼丹配方 6→14', JSON.stringify(w1.alchemy));
  (w1.forge >= 8 ? pass : fail)('W1 炼器配方 14 条', JSON.stringify(w1.forge));
  const w2 = await page.evaluate(() => {
    // 图鉴目录完整性：图录文案覆盖所有怪物
    const missing = Object.keys(GameData.MONSTERS).filter(id => !GameData.CODEX_INTRO[id]);
    // 新地图怪物池引用合法性
    const badRef = [];
    for (const m of GameData.MAPS) {
      for (const e of m.pool) if (!GameData.MONSTERS[e.id]) badRef.push(m.id + ':' + e.id);
      if (m.elite && !GameData.MONSTERS[m.elite]) badRef.push(m.id + ':elite');
    }
    for (const r of GameData.SECRET_REALMS) for (const id of r.pool) if (!GameData.MONSTERS[id]) badRef.push(r.id + ':' + id);
    // 掉落引用合法性
    const badDrop = Object.entries(GameData.MONSTERS).filter(([, m]) => m.rareDrop && !GameData.ITEMS[m.rareDrop]).map(([id]) => id);
    return { missing: missing.length, badRef, badDrop };
  });
  (w2.missing === 0 ? pass : fail)('W1 妖兽图录文案全覆盖', JSON.stringify(w2.missing));
  (w2.badRef.length === 0 ? pass : fail)('W1 地图/秘境怪物引用合法', JSON.stringify(w2.badRef));
  (w2.badDrop.length === 0 ? pass : fail)('W1 稀有掉落引用合法', JSON.stringify(w2.badDrop));

  /* ================= B1 状态效果系统 ================= */
  const b1 = await page.evaluate(() => {
    const list = [];
    StatusFx.add(list, { kind: 'poison', pct: 3, rounds: 3 });
    StatusFx.add(list, { kind: 'poison', pct: 5, rounds: 1 });   // 叠加取最大
    const has = StatusFx.has(list, 'poison');
    const pct = StatusFx.pctOf(list, 'poison');
    const decayed = StatusFx.decayDots(list);
    const purged = StatusFx.purge([{ kind: 'poison', rounds: 2 }, { kind: 'atkup', pct: 30, rounds: 3 }]);
    // 控制状态不受 DOT 衰减影响（冰封正常消耗一轮）
    const fx = [{ kind: 'freeze', rounds: 1 }, { kind: 'poison', rounds: 2 }];
    const decayed2 = StatusFx.decayDots(fx);
    return { has, pct, roundsAfter: decayed[0].rounds, lenAfter: decayed.length, purged: purged.map(x => x.kind), tags: StatusFx.tagsHtml([{ kind: 'poison', pct: 3, rounds: 2 }]).includes('fx-poison'), freezeKept: decayed2.some(x => x.kind === 'freeze'), dotDecayed: !decayed2.some(x => x.kind === 'poison') };
  });
  b1.has && b1.pct === 5 && b1.roundsAfter === 2 && b1.lenAfter === 1 && b1.freezeKept
    ? pass('B1 状态叠加取最大值 / DOT 衰减不误伤控制')
    : fail('B1 状态效果', JSON.stringify(b1));
  b1.purged.length === 1 && b1.purged[0] === 'atkup'
    ? pass('B1 清心丹清负面留增益')
    : fail('B1 purge', JSON.stringify(b1.purged));
  b1.tags ? pass('B1 状态标签 HTML 渲染') : fail('B1 标签', 'no tag');
  // 战斗内毒伤结算
  const b1b = await page.evaluate(async () => {
    const p = Game.player;
    p.hp = Stat.compute(p).maxHp;
    await Battle.start('m_yezhu', { mapName: '测试' });
    const B = Battle.active;
    B.busy = false; B.over = false;
    StatusFx.add(B.myFx, { kind: 'poison', pct: 10, rounds: 2 });
    const before = p.hp;
    const txt = Battle.tickDots('me');
    return { txt, dmg: before - p.hp, rounds: B.myFx.length };
  });
  b1b.dmg > 0 && b1b.txt.includes('气血') ? pass(`B1 DOT 毒伤结算（- ${b1b.dmg}）`) : fail('B1 DOT', JSON.stringify(b1b));
  await page.evaluate(() => { Battle.end(); });

  /* ================= B2 敌人技能池 ================= */
  const b2 = await page.evaluate(() => {
    const e = buildMonster('m_dushe');
    return { hasSkills: e.skills.length > 0, skillKind: e.skills[0].kind, species: e.species };
  });
  b2.hasSkills && b2.skillKind === 'poison' && b2.species === 'snake'
    ? pass('B2 怪物实例携带技能与种族（毒蛇·淬毒牙）')
    : fail('B2 技能池', JSON.stringify(b2));
  // 强制敌人出技能（破防类 100% 生效，避免随机性）
  const b2b = await page.evaluate(async () => {
    const p = Game.player;
    p.hp = Stat.compute(p).maxHp;
    await Battle.start('m_shuyao', { mapName: '测试' });
    const B = Battle.active;
    B.busy = false; B.over = false;
    const sk = { name: '黑水侵蚀', kind: 'defdown', pct: 30, rounds: 2 };
    Battle.enemySkill(Stat.compute(p), sk);
    const applied = StatusFx.has(B.myFx, 'defdown') && StatusFx.pctOf(B.myFx, 'defdown') === 30;
    Battle.end();
    return applied;
  });
  b2b ? pass('B2 敌方技能【破防】正确施加') : fail('B2 敌技', JSON.stringify(b2b));

  /* ================= B3 狂暴 ================= */
  const b3 = await page.evaluate(async () => {
    const p = Game.player;
    await Battle.start('m_moxiu', { mapName: '测试' });   // 精英
    const B = Battle.active;
    B.busy = false; B.over = false;
    B.enemy.hp = Math.round(B.enemy.hpMax * 0.3);
    const effBefore = Battle.enAtk(B.enemy);
    await Battle.enemyTurn();
    const raged = !!B.enemy.raged;
    const effUp = Battle.enAtk(B.enemy) > effBefore;
    Battle.render();
    const ragedClass = document.querySelector('#battle-box .side-enemy').className.includes('raged');
    Battle.end();
    return { raged, effUp, ragedClass };
  });
  b3.raged && b3.effUp && b3.ragedClass ? pass('B3 精英低血狂暴（攻 +30%、界面警示）') : fail('B3 狂暴', JSON.stringify(b3));
  await page.evaluate(() => { if (Battle.active) Battle.end(); });

  /* ================= B4 连击 ================= */
  const b4 = await page.evaluate(() => {
    const B = { combo: 0 };
    const old = Battle.active;
    Battle.active = { enemy: buildMonster('m_yezhu'), myFx: [], combo: 0, morale: 0 };
    const m0 = Battle.comboMul();
    Battle.active.combo = 3;
    const m3 = Battle.comboMul();
    Battle.active = old;
    return { m0, m3 };
  });
  b4.m0 === 1 && Math.abs(b4.m3 - 1.12) < 1e-9
    ? pass('B4 连击倍率（3 层 +12%）')
    : fail('B4 连击', JSON.stringify(b4));

  /* ================= B6 战斗速度 ================= */
  const b6 = await page.evaluate(() => {
    const saved = Battle.speed;
    Battle.speed = 3;
    const t0 = Date.now();
    return Battle.wait(1000).then(() => {
      const fast = Date.now() - t0;
      Battle.speed = saved;
      return { fast, scaled: fast < 400 };
    });
  });
  const b6r = await b6;
  b6r.scaled ? pass(`B6 极速模式等待缩放（1000ms→${b6r.fast}ms）`) : fail('B6 速度', JSON.stringify(b6r));

  /* ================= B5 自动战斗 ================= */
  const b5 = await page.evaluate(async () => {
    const p = Game.player;
    p.hp = Stat.compute(p).maxHp;
    await Battle.start('m_yezhu', { mapName: '测试' });
    const B = Battle.active;
    B.busy = false; B.over = false;
    Battle.setSpeed(3);
    B.auto = true;
    Battle.autoPilot();
    return { busy: B.busy, auto: B.auto };
  });
  b5.busy ? pass('B5 自动战斗开启后自动出招') : fail('B5 自动', JSON.stringify(b5));
  await sleep(1200);
  await page.evaluate(() => { if (Battle.active) { Battle.active.auto = false; Battle.end(); } });

  /* ================= B7 驯服 ================= */
  const b7 = await page.evaluate(async () => {
    const p = Game.player;
    await Battle.start('m_linghou', { mapName: '测试' });   // beast 可驯
    const B = Battle.active;
    B.busy = false; B.over = false;
    B.enemy.hp = Math.round(B.enemy.hpMax * 0.1);
    Battle.render();
    const btn = !!document.querySelector('[data-action="bt-tame"]');
    // 直接测试可驯物种判定
    const ok1 = BeastSys.TAMEABLE.includes('beast') && BeastSys.TAMEABLE.includes('snake');
    const ok2 = !BeastSys.TAMEABLE.includes('human') && !BeastSys.TAMEABLE.includes('construct') && !BeastSys.TAMEABLE.includes('ghost');
    Battle.end();
    return { btn, ok1, ok2 };
  });
  b7.btn && b7.ok1 && b7.ok2
    ? pass('B7 残血妖兽显示驯服按钮 / 物种判定正确')
    : fail('B7 驯服', JSON.stringify(b7));

  /* ================= E1 强化 ================= */
  const e1 = await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 1; p.stones.low = 100000; p.day = 400; p.age = 30;
    p.bag.m_xuantie = 50;
    Bag.equip('w_tiejian');
    const atkBefore = Stat.compute(p).atk;
    p.enhanced = { w_tiejian: 2 };
    const atkAfter = Stat.compute(p).atk;
    UI.renderAll();
    return { lv: ForgeSys.lvOf(p, 'w_tiejian'), up: atkAfter > atkBefore, atkBefore, atkAfter };
  });
  e1.lv === 2 && e1.up
    ? pass(`E1 强化等级计入攻击（${e1.atkBefore} → ${e1.atkAfter}）`)
    : fail('E1 强化', JSON.stringify(e1));
  const e1b = await (async () => {
    // 走完整 UI 流程：+2 → +3（100% 成功）
    await page.evaluate(() => {
      const p = Game.player;
      if (!p.bag.w_qinggang) Bag.addItem('w_qinggang', 1);
      p.equipped.weapon = null;   // v19：先卸下旧兵器，避开装备对比弹窗
      Bag.equip('w_qinggang');
      p.enhanced = { w_qinggang: 2 };
      ForgeSys.enhance('weapon');
    });
    await sleep(400);
    await clickPopupBtn(0);   // 祭 炼
    await sleep(300);
    return page.evaluate(() => ({ lv: ForgeSys.lvOf(Game.player, 'w_qinggang') }));
  })();
  e1b.lv === 3 ? pass('E1 祭炼流程强化 +3 功成') : fail('E1 祭炼', JSON.stringify(e1b));

  /* ================= E2 炼器 ================= */
  const e2 = await page.evaluate(() => {
    const p = Game.player;
    p.bag.m_xuantie = 10;
    const before = Bag.count('w_tulong');
    ForgeSys.forge('f1');   // 屠龙刀 75%
    // 循环至成功（材料给足）
    let guard = 0;
    while (Bag.count('w_tulong') === before && guard++ < 40) { p.bag.m_xuantie = 10; ForgeSys.forge('f1'); }
    return { made: Bag.count('w_tulong') > before, tries: guard + 1 };
  });
  e2.made ? pass(`E2 炼器产出屠龙刀（${e2.tries} 炉）`) : fail('E2 炼器', JSON.stringify(e2));

  /* ================= E3 套装 ================= */
  const e3 = await page.evaluate(() => {
    const p = Game.player;
    // 清空原装备，穿齐玄天套装
    p.equipped = { weapon: 's_xt_jian', armor: 's_xt_jia', accessory: 's_xt_pei' };
    p.bag.w_qinggang = 1; p.bag.w_tiejian = 1;
    const bonus = ForgeSys.setBonus(p);
    const active = ForgeSys.activeSets(p).map(s => s.name);
    const defPct = Stat.compute(p);
    p.equipped = { weapon: 'w_tiejian', armor: null, accessory: null };
    return { bonus, active };
  });
  e3.bonus.defPct === 15 && e3.bonus.hpPct === 10 && e3.active.includes('玄天套装')
    ? pass('E3 玄天三件成套：防御 +15% / 气血 +10%')
    : fail('E3 套装', JSON.stringify(e3));

  /* ================= C1 洞府 ================= */
  const c1 = await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 1; p.day = 100;
    p.cave = CaveSys.freshCave();
    const cult = CaveSys.cultBonus(p);   // 4%
    p.cave.lv = 5;
    const cult5 = CaveSys.cultBonus(p);   // 20%
    const plots = CaveSys.plotCount(p);   // 8
    p.cave.lv = 1;
    // 播种
    p.bag.seed_lingcao = 2;
    CaveSys.plotsOf(p);
    const sd = GameData.ITEMS['seed_lingcao'];
    p.cave.plots[0] = { seed: 'seed_lingcao', crop: sd.crop, days: sd.days, plantedDay: 100 };
    p.day = 110;   // 10 日后成熟
    return { cult, cult5, plots, ripe: true, day: 110 };
  });
  c1.cult === 4 && c1.cult5 === 20 && c1.plots === 8
    ? pass('C1 聚灵阵 +4%/级（5 级 +20%）、洞府 8 块田')
    : fail('C1 洞府数值', JSON.stringify(c1));
  // 收获（UI 流程）
  await page.evaluate(() => { Game.player.day = 110; });
  await page.evaluate(() => CaveSys.harvest(0));
  const c1b = await page.evaluate(() => ({ got: Bag.count('m_lingcao'), empty: Game.player.cave.plots[0] === null }));
  c1b.got >= 2 && c1b.empty ? pass('C1 灵田播种 10 日成熟收获 ×2') : fail('C1 收获', JSON.stringify(c1b));
  // 过熟减半
  const c1c = await page.evaluate(() => {
    const p = Game.player;
    p.bag.seed_lingzhi = 1;
    const sd = GameData.ITEMS['seed_lingzhi'];
    p.cave.plots[1] = { seed: 'seed_lingzhi', crop: sd.crop, days: sd.days, plantedDay: 110 };
    p.day = 110 + sd.days + 25;   // 过熟 25 日
    const before = Bag.count('m_lingzhi');
    CaveSys.harvest(1);
    return { got: Bag.count('m_lingzhi') - before, halved: Bag.count('m_lingzhi') - before === 1 };
  });
  c1c.halved ? pass('C1 过熟廿日收成折半') : fail('C1 过熟', JSON.stringify(c1c));

  /* ================= C2 灵兽 ================= */
  const c2 = await page.evaluate(() => {
    const p = Game.player;
    p.beasts = { active: null, list: [], nextId: 1 };
    p.beasts.list.push({ uid: 1, id: 'm_linghou', name: '灵猴', species: 'beast', power: 4, level: 1, exp: 0, skills: [] });
    p.beasts.active = 1;
    const passive = BeastSys.passive(p);   // beast → atkPct = 4*0.6+1*0.8 = 3
    const st1 = Stat.compute(p).atk;
    p.beasts.list[0].level = 10;
    const st2 = Stat.compute(p).atk;
    p.beasts.active = null;
    const st3 = Stat.compute(p).atk;
    return { passive, up: st2 > st1, off: st3 < st2 && st3 < st1 };
  });
  c2.passive.atkPct > 0 && c2.up && c2.off
    ? pass('C2 灵兽出战被动（攻随阶涨 / 收栏失效）')
    : fail('C2 灵兽被动', JSON.stringify(c2));
  const c2b = await page.evaluate(() => {
    const p = Game.player;
    p.beasts.active = 1;
    p.beasts.list[0].level = 1;
    p.beasts.list[0].exp = 0;
    p.bag.m_neidan = 3;
    BeastSys.feed(1);
    const lvAfter = p.beasts.list[0].level;   // 500 exp ≥ 400 → 2 阶
    BeastSys.setActive(1);   // 切换为收栏
    return { lvAfter, off: p.beasts.active === null };
  });
  c2b.lvAfter === 2 && c2b.off ? pass('C2 内丹喂养升阶 / 出战切换') : fail('C2 喂养', JSON.stringify(c2b));

  /* ================= Q1 悬赏 ================= */
  const q1 = await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 2; p.layer = 2; p.day = 500;
    p.bounties = null;
    const B = BountySys.stateOf(p);
    return { count: B.list.length, types: B.list.map(t => t.type).sort().join(','), day: B.day };
  });
  q1.count === 3 && q1.types === 'collect,kill,spar'
    ? pass('Q1 悬赏板每日三张（猎杀/收购/较技）')
    : fail('Q1 悬赏生成', JSON.stringify(q1));
  const q1b = await page.evaluate(() => {
    const p = Game.player;
    p.day = 500;
    p.bounties = null;
    const B = BountySys.stateOf(p);
    const idx = B.list.findIndex(t => t.type === 'kill');
    const kill = B.list[idx];
    kill.progress = 0;
    BountySys.onKill(kill.target);
    const progressed = kill.progress >= 1;
    // spy：直接断言 claim 的发放金额（隔离全局经济活动的干扰）
    let paid = 0;
    const orig = Bag.addStones;
    Bag.addStones = function (n) { paid += n; return orig.call(Bag, n); };
    kill.progress = kill.need;
    // v20 加固：屏蔽 25% 连锁悬赏随机，保证领后置空可确定性断言
    const origChance = Utils.chance;
    Utils.chance = () => false;
    BountySys.claim(idx);
    Utils.chance = origChance;
    Bag.addStones = orig;
    return { idx, progressed, paid, cleared: B.list[idx] === null };
  });
  q1b.idx >= 0 && q1b.progressed && q1b.paid > 0 && q1b.cleared
    ? pass('Q1 猎杀计入进度 / 领赏发放 / 领后置空')
    : fail('Q1 悬赏结算', JSON.stringify(q1b));

  /* ================= Q2 黑市 ================= */
  const q2 = await page.evaluate(() => {
    const p = Game.player;
    p.day = 30;      // 30 % 30 == 0 < 3 → 开市
    const open = BlackSys.isOpen(p);
    const g1 = BlackSys.goods(p).join(',');
    const g2 = BlackSys.goods(p).join(',');   // 确定性
    p.day = 33;      // 闭市
    const closed = !BlackSys.isOpen(p);
    p.day = 30;
    const price = BlackSys.price(p, 'm_neidan');
    return { open, deterministic: g1 === g2 && g1.split(',').length === 4, closed, price };
  });
  q2.open && q2.deterministic && q2.closed && q2.price > 0
    ? pass('Q2 黑市每月初三开市三日 / 货物确定性 / 售价生成')
    : fail('Q2 黑市', JSON.stringify(q2));

  /* ================= Q3 天骄榜 ================= */
  const q3 = await page.evaluate(() => {
    const p = Game.player;
    p.day = 800; p.topTitle = null;
    p.realmIdx = 9; p.layer = 2;
    const board = RankSys.board(p);
    const top = RankSys.isTop(p);
    const stTop = Stat.compute(p).atk;
    // 临时压一名 NPC 至玩家之上，验证榜首加成差异
    const savedN21 = JSON.parse(JSON.stringify(p.npcs.n21));
    p.npcs.n21.realmIdx = 9; p.npcs.n21.layer = 3; p.npcs.n21.alive = true;
    const notTop = !RankSys.isTop(p);
    const stNo = Stat.compute(p).atk;
    p.npcs.n21 = savedN21;
    p.layer = 3;
    const rewarded = RankSys.dailyReward(p);
    const again = RankSys.dailyReward(p);
    return { top, first: board[0].id, notTop, boosted: stTop > stNo, rewarded, again };
  });
  q3.top && q3.first === 'me' && q3.notTop && q3.boosted && q3.rewarded && !q3.again
    ? pass('Q3 登顶天下第一：+2% 全属性 / 每日气运 / 当日不重复')
    : fail('Q3 天骄榜', JSON.stringify(q3));
  await page.evaluate(() => { Game.player.realmIdx = 1; UI.renderAll(); });

  /* ================= M2 增益丹 + M3 符箓 ================= */
  const m2 = await page.evaluate(() => {
    const p = Game.player;
    p.bag.pill_kuangbao = 2;
    p.bag.tal_bingpo = 2;
    p.bag.tal_fuling = 2;
    return { kb: Bag.count('pill_kuangbao'), bp: Bag.count('tal_bingpo'), fl: Bag.count('tal_fuling') };
  });
  const m2b = await page.evaluate(async () => {
    const p = Game.player;
    await Battle.start('m_shikui', { mapName: '测试' });   // 高防石傀：测试期间不会被打死
    const B = Battle.active;
    B.busy = false; B.over = false;
    Battle.setSpeed(3);
    const zzz = (ms) => new Promise(r => setTimeout(r, ms));
    Battle.act('item', 'pill_kuangbao');
    await zzz(600);
    const atkup = StatusFx.pctOf(B.myFx, 'atkup');
    B.busy = false;
    Battle.act('item', 'tal_fuling');
    await zzz(600);
    const slow = StatusFx.pctOf(B.enemy.fx, 'slow');
    // 冰封（立即消耗型状态）的生效与消耗另由 m2c 机制验证
    Battle.end();
    return { atkup, slow };
  });
  m2b.atkup >= 30 && m2b.slow >= 30
    ? pass('M2/M3 狂暴丹增益 / 缚灵符迟滞（战斗内全生效）')
    : fail('M2/M3 战斗道具', JSON.stringify(m2b));
  // 冰封机制补充验证：冻结状态下敌方回合被跳过
  const m2c = await page.evaluate(async () => {
    const p = Game.player;
    await Battle.start('m_shikui', { mapName: '测试' });
    const B = Battle.active;
    B.busy = false; B.over = false;
    Battle.setSpeed(3);
    StatusFx.add(B.enemy.fx, { kind: 'freeze', rounds: 1 });
    const logBefore = B.logs.length;
    await Battle.enemyTurn();
    const skipped = B.logs.slice(logBefore).some(l => l.html.includes('动弹不得'));
    const consumed = !StatusFx.has(B.enemy.fx, 'freeze');   // 回合结束状态消耗
    Battle.end();
    return { skipped, consumed };
  });
  m2c.skipped && m2c.consumed
    ? pass('M3 冰封使敌方跳过回合 / 状态按回合消耗')
    : fail('M3 冰封机制', JSON.stringify(m2c));

  /* ================= M1 存档迁移 ================= */
  const m1 = await page.evaluate(() => {
    // 模拟 v11 老档（无 v13 字段）
    const old = {
      name: '老档道人', attrs: { gen: 6, comp: 6, luck: 6, body: 6 },
      realmIdx: 2, layer: 1, exp: 100, hp: 300, mp: 100,
      stones: { low: 500, mid: 2, high: 0 },
      bag: { pill_juqi: 3, w_qinggang: 1 },
      gongfa: { gf_tuna: { level: 2, exp: 10 } },
      equipped: { weapon: 'w_qinggang', armor: null, accessory: null },
      counters: { battles: 5 }, flags: { tutorialDone: true },
    };
    const p = PlayerFactory.migrate(old);
    return {
      enhanced: p.enhanced,
      caveField: 'cave' in p && p.cave === null,
      caveLazy: CaveSys.plotsOf(p).length === 4,   // cave=null 惰性初始化兜底（在 caveField 之后求值）
      beasts: p.beasts && Array.isArray(p.beasts.list) && p.beasts.list.length === 0,
      bounties: 'bounties' in p && p.bounties === null,
      topTitle: 'topTitle' in p && p.topTitle === null,
      keptExp: p.exp === 100,
      keptRealm: p.realmIdx === 2,
    };
  });
  m1.enhanced && m1.caveField && m1.caveLazy && m1.beasts && m1.bounties && m1.topTitle && m1.keptExp && m1.keptRealm
    ? pass('M1 v11 老档迁移：v13 字段全补齐，进度无损')
    : fail('M1 迁移', JSON.stringify(m1));

  /* ================= V1 视觉：场景插画 / 立绘 / 页签 ================= */
  await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 1; p.layer = 0; p.exp = 0;
    UI.renderAll();
  });
  await page.click('[data-action="act-tab"][data-tab="map"]');
  await sleep(300);
  const v1 = await page.evaluate(() => ({
    scenes: document.querySelectorAll('.map-scene svg').length,
    mapCards: document.querySelectorAll('.map-card').length,
  }));
  v1.scenes === 11 && v1.mapCards === 11 ? pass('V1 十一张地图皆渲染山水插画') : fail('V1 场景插画', JSON.stringify(v1));
  const v1b = await page.evaluate(async () => {
    await Battle.start('m_dushe', { mapName: '测试' });
    return { fig: !!document.querySelector('#battle-box .enemy-fig svg') };
  });
  v1b.fig ? pass('V1 战斗敌方剪影立绘渲染') : fail('V1 立绘', JSON.stringify(v1b));
  await page.evaluate(() => { Battle.end(); });
  await sleep(200);
  await page.click('[data-action="act-tab"][data-tab="cave"]');
  await sleep(200);
  const v2 = await page.evaluate(() => document.getElementById('tab-content').innerText.slice(0, 60));
  v2.includes('洞府') ? pass('V2 洞府页签渲染（聚灵阵/灵田/兽栏）') : fail('V2 洞府页', v2);
  await page.click('[data-action="act-tab"][data-tab="jianghu"]');
  await sleep(200);
  const v3 = await page.evaluate(() => document.getElementById('tab-content').innerText);
  v3.includes('天骄榜') ? pass('V2 江湖页含天骄榜排名') : fail('V2 天骄榜', v3.slice(0, 50));
  await page.click('[data-action="act-tab"][data-tab="shop"]');
  await sleep(200);
  const v4 = await page.evaluate(() => document.getElementById('tab-content').innerText);
  v4.includes('悬赏任务板') && v4.includes('祭炼强化') && v4.includes('炼器坊')
    ? pass('V2 坊市页含悬赏板 / 祭炼强化 / 炼器坊')
    : fail('V2 坊市区块', v4.slice(0, 80));
  await page.evaluate(() => { const s = document.getElementById('amb-speed'); if (s) { s.value = '2'; s.dispatchEvent(new Event('change')); } });
  const v5 = await page.evaluate(() => Battle.speed);
  v5 === 2 ? pass('V3 设置中心切换战斗速度') : fail('V3 设置', String(v5));
  await shot(page, 'final_ui');

  /* ================= ST1-ST6 v15 剧情演出（新开一档验证） ================= */
  // 新档（存档位一，避免污染前面的进度）
  await page.evaluate(() => Game.exitToStart());
  await sleep(400);
  await page.click('[data-action="st-newgame"][data-slot="1"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = '剧情道人'; });
  await page.click('[data-action="st-start"]');
  await sleep(600);
  const st1 = await page.evaluate(() => ({
    open: !!document.getElementById('story-modal') && !document.getElementById('story-modal').className.includes('hidden'),
    text: (document.getElementById('story-box') || {}).innerText || '',
    seen: !!(Game.player.story && Game.player.story.seen.c1_open),
  }));
  st1.open && st1.text.includes('第一章') && st1.text.includes('采药老人') && st1.seen
    ? pass('ST1 新档开局播放第一章开篇卷轴（含对话）')
    : fail('ST1 开篇演出', JSON.stringify(st1).slice(0, 120));
  // 点完开篇（旁白+对话共 5 场）
  const st1b = await finishStory();
  st1b ? pass('ST1 开篇逐场推进至终场关闭') : fail('ST1 推进', 'story still active');

  /* ST2 中段插章：完成第一目标（修为至练气中期）后行动触发 */
  await page.evaluate(() => { const p = Game.player; p.layer = 1; UI.renderAll(); });
  await page.evaluate(() => Cultivate.normal());
  await sleep(700);
  const st2 = await page.evaluate(() => ({
    open: !!document.getElementById('story-modal') && !document.getElementById('story-modal').className.includes('hidden'),
    text: (document.getElementById('story-box') || {}).innerText || '',
    marked: !!(Game.player.story && Game.player.story.mid.c1),
  }));
  st2.open && st2.text.includes('残玉初热') && st2.marked
    ? pass('ST2 第一章中段插章自动触发（残玉初热）')
    : fail('ST2 中段', JSON.stringify(st2).slice(0, 120));
  await finishStory();

  /* ST3 完章：章末演出（抉择）→ 结算 → 衔接第二章开篇 */
  await page.evaluate(() => {
    const p = Game.player;
    p.counters.mapExplores = p.counters.mapExplores || {};
    p.counters.mapExplores.village = 5;
    p.counters.wins = 3;
  });
  await page.evaluate(() => Cultivate.normal());
  await sleep(900);
  // 推进到抉择场（跳过开篇旁白）
  let choiceSeen = false;
  for (let round = 0; round < 5 && !choiceSeen; round++) {
    // v19：暗线插章（mid2）会先于章末弹出——每次行动后再查，直至抵达抉择场
    for (let i = 0; i < 8; i++) {
      const sc = await page.evaluate(() => {
        const open = !document.getElementById('story-modal').className.includes('hidden');
        if (!open) return { open: false, text: '' };
        return { open: true, text: (document.getElementById('story-box') || {}).innerText || '', isChoice: !!document.querySelector('[data-story-choice]') };
      });
      if (!sc.open) break;
      if (sc.isChoice) { choiceSeen = sc.text.includes('带着什么入世'); break; }
      const isBattle = await page.evaluate(() => Story.cur && Story.cur.scenes[Story.cur.idx] && Story.cur.scenes[Story.cur.idx].t === 'battle').catch(() => false);
      if (isBattle) {
        // v19：战斗场就地判胜，继续走场（好让循环亲眼见到抉择场）
        await page.evaluate(() => { const b = document.querySelector('[data-action="story-battle"]'); if (b) b.click(); });
        await sleep(500);
        await page.evaluate(async () => { const B = Battle.active; if (B) { B.busy = false; B.over = false; B.enemy.hp = 0; await Battle.victory(); } });
        await sleep(600);
        continue;
      }
      await page.click('[data-action="story-next"]').catch(() => {});
      await sleep(320);
    }
    if (!choiceSeen) {
      await page.evaluate(() => Cultivate.normal()).catch(() => {});
      await sleep(700);
    }
  }
  choiceSeen ? pass('ST3 完章播放章末演出（含抉择）') : fail('ST3 章末', 'choice scene not reached');
  // 选择第一个抉择并推进至结算 + 衔接
  const choiceBtn = await page.$('[data-story-choice]');
  if (choiceBtn) { await choiceBtn.click(); await sleep(450); }
  await finishStory();
  await sleep(400);
  const st3b = await page.evaluate(() => ({
    open: !document.getElementById('story-modal').className.includes('hidden'),
    text: (document.getElementById('story-box') || {}).innerText || '',
    ch: Game.player.quest.ch,
    choice: Game.player.story.choices.c1_end,
  }));
  st3b.ch === 1 && st3b.choice === 'vengeance'
    ? pass('ST3 章末抉择记录 + 章节推进至第二章')
    : fail('ST3 推进', JSON.stringify(st3b));
  const st3c = await finishStory();
  st3c && st3b.ch === 1
    ? pass('ST3 章末结算后自动衔接第二章开篇（队列）')
    : fail('ST3 衔接', JSON.stringify({ closed: st3c, ch: st3b.ch }));

  /* ST4 问道页：进度轨 + 目标进度 + 前往按钮 */
  await page.click('[data-action="act-tab"][data-tab="quest"]').catch(() => {});
  await sleep(400);
  const st4 = await page.evaluate(() => ({
    rail: document.querySelectorAll('.quest-rail .rail-node').length,
    cur: !!document.querySelector('.rail-node.cur'),
    prog: (document.getElementById('tab-content').innerText.match(/\d+\/\d+/g) || []).length,
    go: !!document.querySelector('.q-go'),
    done: document.querySelectorAll('.rail-node.done').length,
  }));
  st4.rail === 9 && st4.cur && st4.prog >= 2 && st4.go && st4.done === 1
    ? pass('ST4 问道页：九章进度轨 / 目标进度 / 单目标前往按钮')
    : fail('ST4 问道页', JSON.stringify(st4));
  await shot(page, 'quest_v15');

  /* ST5 问道录回顾 */
  await page.click('[data-action="quest-review"]').catch(() => {});
  await sleep(400);
  const st5a = await page.evaluate(() => ({
    open: !document.getElementById('popup-modal').className.includes('hidden'),
    text: document.getElementById('popup-body').innerText,
  }));
  st5a.open && st5a.text.includes('第一章') && st5a.text.includes('开篇') && st5a.text.includes('中段')
    ? pass('ST5 问道录列出已看剧情（含抉择行）')
    : fail('ST5 问道录', st5a.text.slice(0, 100));
  // 重读 c1_mid（只读模式）
  const rereadBtn = await page.$('[data-action="quest-reread"][data-sid="c1_mid"]');
  if (rereadBtn) await rereadBtn.click();
  await sleep(500);
  const st5b = await page.evaluate(() => ({
    open: !document.getElementById('story-modal').className.includes('hidden'),
    closeX: !!document.querySelector('.story-close-x'),
    text: (document.getElementById('story-box') || {}).innerText || '',
  }));
  st5b.open && st5b.closeX && st5b.text.includes('残玉初热')
    ? pass('ST5 问道录重读剧情（只读 ✕ 模式）')
    : fail('ST5 重读', JSON.stringify(st5b).slice(0, 80));
  await page.click('[data-action="story-close"]').catch(() => {});
  await sleep(300);
  await page.evaluate(() => UI.popupChoose(-1)).catch(() => {});
  await sleep(200);

  /* ST6 老档迁移（v14 档无 story 字段） */
  const st6 = await page.evaluate(() => {
    const old = {
      name: '旧档道人', attrs: { gen: 5, comp: 5, luck: 5, body: 5 },
      realmIdx: 3, layer: 0, exp: 10, hp: 500, mp: 200,
      stones: { low: 100, mid: 0, high: 0 }, bag: {}, gongfa: {},
      equipped: { weapon: null, armor: null, accessory: null },
      counters: {}, flags: {},
    };
    const p = PlayerFactory.migrate(old);
    return { story: p.story && !!p.story.seen && !!p.story.mid && !!p.story.choices };
  });
  st6.story ? pass('ST6 老档迁移补齐 story 字段（seen/mid/choices）') : fail('ST6 迁移', JSON.stringify(st6));

  /* ================= DAO1-DAO6 v16 道境独立晋升 ================= */
  // DAO1 经验制晋升 + 不绑定修为境界
  const dao1 = await page.evaluate(() => {
    const p = Game.player;
    p.dao = 'sword';
    p.realmIdx = 0; p.layer = 0;   // 练气初期
    p.daoExp = { sword: 0 };
    const t0 = DaoSys.tierLevel(p);
    DaoSys.gain(p, 100, true);
    const t1 = DaoSys.tierLevel(p);
    DaoSys.gain(p, 200, true);
    const t2 = DaoSys.tierLevel(p);
    return { t0, t1, t2, exp: p.daoExp.sword };
  });
  dao1.t0 === 0 && dao1.t1 === 1 && dao1.t2 === 2 && dao1.exp === 300
    ? pass('DAO1 道境按经验晋升（100→一重 / 300→二重），练气期亦可修行')
    : fail('DAO1 经验晋升', JSON.stringify(dao1));

  // DAO2 战斗获得剑意（真实战斗普攻）
  const dao2 = await page.evaluate(async () => {
    const p = Game.player;
    p.dao = 'sword';
    p.daoExp = { sword: 0 };
    p.hp = Stat.compute(p).maxHp;
    await Battle.start('m_yezhu', { mapName: '测试' });
    const B = Battle.active;
    B.busy = false; B.over = false;
    Battle.setSpeed(3);
    // 直接结算一次普攻路径（命中分支由 attack case 驱动，用 act 触发）
    B.combo = 0;
    const oc = Utils.chance;
    Utils.chance = v => v >= 90;   // v20 加固：屏蔽闪避/暴击等随机分支，保证普攻必中
    Battle.act('attack');
    await new Promise(r => setTimeout(r, 700));
    Utils.chance = oc;
    const expGot = p.daoExp.sword;
    Battle.end();
    return { expGot, gained: expGot > 0 };
  });
  dao2.gained ? pass(`DAO2 剑修普攻命中获得剑意（+${dao2.expGot}）`) : fail('DAO2 剑意', JSON.stringify(dao2));

  // DAO3 炼丹/画符获得道境经验
  const dao3 = await page.evaluate(() => {
    const p = Game.player;
    // 丹道：炼丹
    p.dao = 'pill';
    p.daoExp = { pill: 0 };
    p.bag.m_lingcao = 10;
    p.stones.low = 100000;   // v19 修复：炼丹需药钱，先备足
    CraftSys.alchemy('r1');
    const pillExp = p.daoExp.pill || 0;
    // 符修：画符
    p.dao = 'talisman';
    p.daoExp = { talisman: 0 };
    p.stones.low = 100000;
    p.realmIdx = 2;
    CraftSys.drawTalisman();
    const talExp = p.daoExp.talisman || 0;
    return { pillExp, talExp };
  });
  dao3.pillExp > 0 && dao3.talExp > 0
    ? pass(`DAO3 炼丹得丹火(+${dao3.pillExp}) / 画符得符道(+${dao3.talExp})`)
    : fail('DAO3 职业经验', JSON.stringify(dao3));

  // DAO4 状态栏经验条 UI
  const dao4 = await page.evaluate(() => {
    const p = Game.player;
    p.dao = 'sword';
    p.daoExp = { sword: 500 };
    const html = DaoSys.statusHtml(p);
    return { hasExp: html.includes('剑意'), hasBar: html.includes('bar-fill exp'), hasNext: html.includes('剑心通明境'), hasDesc: html.includes('出剑、会心') };
  });
  dao4.hasExp && dao4.hasBar && dao4.hasNext && dao4.hasDesc
    ? pass('DAO4 道境面板：经验条 / 下一重需求 / 获取方式说明')
    : fail('DAO4 面板', JSON.stringify(dao4));

  // DAO5 迁移折算：老档按旧 realm 规则折算 daoExp（不丢道境）
  const dao5 = await page.evaluate(() => {
    const old = {
      name: '老剑修', attrs: { gen: 6, comp: 6, luck: 6, body: 6 },
      realmIdx: 4, layer: 0, exp: 10, hp: 500, mp: 200,
      stones: { low: 100, mid: 0, high: 0 }, bag: {}, gongfa: {},
      equipped: { weapon: null, armor: null, accessory: null },
      counters: {}, flags: {}, dao: 'sword',
    };
    const p = PlayerFactory.migrate(old);
    return { exp: p.daoExp.sword, tier: DaoSys.tierLevel(p) };
  });
  // 旧规则：realmIdx=4 → 剑气境/剑芒境/剑心通明境 = 3 重 → 折算 800 经验
  dao5.exp === 800 && dao5.tier === 3
    ? pass('DAO5 老档迁移按旧规则折算道境经验（元婴剑修 = 3 重 800 剑意）')
    : fail('DAO5 折算', JSON.stringify(dao5));

  // DAO6 道境加成随经验实时生效（阵道迷踪境闪避 +8）
  const dao6 = await page.evaluate(() => {
    const p = Game.player;
    p.dao = 'array';
    p.realmIdx = 0;
    p.daoExp = { array: 0 };
    const d0 = Stat.compute(p).dodge;
    p.daoExp.array = 2000;   // 迷踪境
    const d1 = Stat.compute(p).dodge;
    return { d0, d1, boosted: d1 >= d0 + 8 };
  });
  dao6.boosted ? pass('DAO6 道境效果随经验实时生效（阵道迷踪境闪避 +8）') : fail('DAO6 效果', JSON.stringify(dao6));

} catch (err) {
  fail('脚本异常', String(err && err.stack || err).slice(0, 300));
} finally {
  await browser.close();
}

console.log('\n===== 结果汇总 =====');
for (const [s, n] of results) console.log(`${s === 'PASS' ? '✓' : '✗'} ${n}`);
const failCount = results.filter(r => r[0] === 'FAIL').length;
console.log(`共 ${results.length} 项，失败 ${failCount} 项`);
console.log(`控制台错误 ${consoleErrors.length} 条: ` + consoleErrors.slice(0, 5).join(' || '));
process.exit(failCount > 0 || consoleErrors.length > 0 ? 1 : 0);
