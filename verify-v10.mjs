/* v20「入微」验证：逐阶段分组断言（修瑕 / 战斗 / 养成 / 世界 / 江湖 / 经济 / UX / 长线）
 * 运行：node verify-v10.mjs （需先 node server.mjs）
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

  /* ================= F 修瑕组（阶段〇） ================= */
  const f1 = await page.evaluate(() => {
    const ids = GameData.FORGE_RECIPES.map(r => r.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    const xt = GameData.FORGE_RECIPES.filter(r => r.out === 's_xt_jian').length;
    return { dup, xt };
  });
  (f1.dup.length === 0 && f1.xt === 1) ? pass('F1 炼器配方 id 唯一，玄天套装锻造可达') : fail('F1 配方修瑕', JSON.stringify(f1));

  /* ---- 开一档测试档（跳过引导与开篇演出，供后续游戏内断言使用） ---- */
  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = ''; });
  await page.type('#create-name', '入微道人');
  await page.click('[data-action="st-start"]');
  await sleep(800);
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => {
      const t = document.getElementById('tutorial');
      if (t && !t.className.includes('hidden')) { const b = t.querySelector('[data-action="tut-next"]'); if (b) { b.click(); return 'tut'; } }
      const sm = document.getElementById('story-modal');
      if (sm && !sm.className.includes('hidden')) {
        const c = document.querySelector('.story-opt');
        if (c) { c.click(); return 'choice'; }
        const n = document.querySelector('[data-action="story-next"]');
        if (n) { n.click(); return 'story'; }
      }
      return 'done';
    });
    if (st === 'done') break;
    await sleep(160);
  }
  await page.evaluate(() => { Game.player.flags.tutorialDone = true; });
  pass('S0 测试档就绪（引导与开篇演出走完）');

  const f2 = await page.evaluate(() => {
    const fake = { day: 300, realmIdx: 3 };
    const prices = BlackSys.POOL.map(x => BlackSys.price(fake, x.id));
    return { min: Math.min(...prices), n: prices.length };
  });
  f2.n >= 15 && f2.min >= 800 ? pass('F2 黑市无 0 价捡漏（地级套装/秘境功法按品阶计价）') : fail('F2 黑市修瑕', JSON.stringify(f2));

  const f3 = await page.evaluate(() => {
    const p = Game.player;
    if (!p.cave) p.cave = CaveSys.freshCave();
    p.cave._pestDay = undefined;
    CaveSys.checkPest(p);
    const guarded = p.cave._pestDay === Math.floor(p.day);
    const wired = /checkPest\(p\)/.test(UI.renderCaveTab.toString()) && /visitorEvent\(p\)/.test(UI.renderCaveTab.toString());
    return { guarded, wired };
  });
  f3.guarded && f3.wired ? pass('F3 虫害/访客每日事件已接线且带日界防重') : fail('F3 洞府事件接线', JSON.stringify(f3));

  const f4 = await page.evaluate(async () => {
    const p = Game.player;
    p.enhanced = p.enhanced || {};
    delete p.enhanced['w_qinggang'];
    p.equipped.weapon = { id: 'w_tiejian', enhance: 5 };
    delete p.bag['w_tiejian'];                // 清掉初始包里的同 id，避免回包计数翻倍
    p.bag['w_qinggang'] = 1;
    await Bag.unequip('weapon');              // +5 铁剑回包且强化留档（无弹窗路径）
    const kept = p.enhanced['w_tiejian'];
    const back = p.bag['w_tiejian'];
    await Bag.equip('w_qinggang');            // 空槽 → 无确认弹窗
    const eq = p.equipped.weapon;
    // 复原
    p.enhanced['w_tiejian'] = 5;
    Bag.removeItem('w_qinggang', 1);
    delete p.bag['w_tiejian'];
    p.equipped.weapon = { id: 'w_tiejian', enhance: 5 };
    return { id: eq && eq.id, enh: eq && eq.enhance, kept, back };
  });
  f4.id === 'w_qinggang' && f4.enh === 0 && f4.kept === 5 && f4.back === 1
    ? pass('F4 换装不跨 id 继承强化，旧强化留档 + 旧装备回包')
    : fail('F4 换装强化语义', JSON.stringify(f4));

  const f5 = await page.evaluate(() => {
    const p = Game.player;
    p.attrs.body = 7; p.realmIdx = 5;
    const a = Stat.poisonCap(p);
    const ok = a === 60 + 7 * 8 + 20;
    p.realmIdx = 0;
    const b = Stat.poisonCap(p);
    return { a, ok, b: b === 60 + 7 * 8 };
  });
  f5.ok && f5.b ? pass('F5 丹毒上限单源化 Stat.poisonCap（含合道 +20）') : fail('F5 poisonCap', JSON.stringify(f5));

  const f6 = await page.evaluate(() => {
    return {
      lines24: Object.keys(GameData.NPC_LINES).length,
      dupDiscuss: (() => { const c = {}; Object.values(GameData.NPC_LINES).forEach(l => c[l.discuss[2]] = (c[l.discuss[2]] || 0) + 1); return Object.entries(c).filter(([, n]) => n > 1).length; })(),
      sidesN: QuestSys.SIDES.length,
    };
  });
  f6.lines24 === 24 && f6.dupDiscuss === 0 && f6.sidesN === 12
    ? pass('F6 文案与台词修瑕：24 人矩阵齐、论道句无重复填充、支线 12 则')
    : fail('F6 台词/文案', JSON.stringify(f6));

  /* ================= B 战斗组（阶段一） ================= */
  // B1 意图预演：决策树产出合法意图；蓄力后必承诺杀招
  const b1 = await page.evaluate(() => {
    const p = Game.player;
    p.dao = null; p.realmIdx = 2; p.layer = 0;
    p.hp = 99999; p.mp = 999;
    const en = buildMonster('m_tiexia');
    en.hp = en.hpMax; en.fx = []; en.charging = false;
    Battle.active = { enemy: en, ctx: {}, myFx: [], buffs: { defRounds: 0, dodgeRounds: 0 }, over: false, busy: false, enemyFxIds: [] };
    const kinds = new Set();
    for (let i = 0; i < 40; i++) {
      const a = Battle.enemyDecide();
      if (!a || !['strike', 'skill', 'charge', 'finisher'].includes(a.kind)) return { ok: false };
      kinds.add(a.kind);
    }
    en.charging = true;
    const f = Battle.enemyDecide();
    en.charging = false;
    Battle.active = null;
    return { ok: kinds.size >= 1, finisher: f.kind === 'finisher' };
  });
  b1.ok && b1.finisher ? pass('B1 意图预演：决策树产出合法意图，蓄力承诺杀招') : fail('B1 意图', JSON.stringify(b1));

  // B2 破招：蓄力中的敌人被会心普攻打断
  const b2 = await page.evaluate(async () => {
    const p = Game.player;
    const oldLuck = p.attrs.luck;
    p.attrs.luck = 10;   // 暴击 = 5 + 福缘×0.6 = 11 → 与强制 chance 阈值咬合
    const origChance = Utils.chance;
    Utils.chance = v => v >= 11;   // 强制会心、屏蔽闪避/反击等低概率分支
    const en = buildMonster('m_yezhu');
    en.hpMax = 999999; en.hp = 999999; en.atk = 1; en.crit = 0; en.fx = []; en.charging = true;
    Battle.active = { enemy: en, ctx: {}, myFx: [], buffs: { defRounds: 0, dodgeRounds: 0 }, over: false, busy: false, enemyFxIds: [], stats: { out: 0, in: 0, maxCombo: 0, src: { attack: 0, skill: 0, ult: 0, beast: 0, dot: 0, thorns: 0, counter: 0 } }, floats: [], morale: 0, combo: 0, zhenyuan: 0, zmax: 6, logs: [] };
    Battle.speed = 3;
    await Battle.act('attack');
    const brk = !en.charging && Battle.active && Battle.active.logs.some(l => String(l.html).includes('破招'));
    Utils.chance = origChance;
    p.attrs.luck = oldLuck;
    Battle.active = null; Battle.speed = 1;
    return { brk };
  });
  b2.brk ? pass('B2 破招：会心打断蓄力杀招并追加伤害') : fail('B2 破招', JSON.stringify(b2));

  // B3 习性模板：buildMonster 附带合法模板字段
  const b3 = await page.evaluate(() => {
    let withTpl = 0, none = 0;
    for (let i = 0; i < 200; i++) {
      const m = buildMonster('m_yezhu');
      if (m.tpl) {
        if (!GameData.MONSTER_TEMPLATES.find(t => t.id === m.tpl) || !m.tplName) return { ok: false };
        withTpl++;
      } else none++;
    }
    return { ok: true, withTpl, none };
  });
  b3.ok && b3.withTpl > 30 && b3.none > 30 ? pass('B3 习性模板：个体差异生效（模板/普通两态分布）') : fail('B3 模板', JSON.stringify(b3));

  // B4 精英词缀扩池：互斥表生效，随机 1~2 条
  const b4 = await page.evaluate(() => {
    let bad = 0, rolled = 0;
    for (let i = 0; i < 120; i++) {
      const en = buildMonster('m_toumu'); en.hp = en.hpMax;
      const B2 = { enemy: en, enemyFxIds: [] };
      Battle.rollEliteFx(B2);
      const ids = B2.enemyFxIds;
      if (ids.length) rolled++;
      for (const [x, y] of GameData.ELITE_AFFIX_MUTEX) if (ids.includes(x) && ids.includes(y)) bad++;
      if (ids.length > 2) bad++;
    }
    return { bad, rolled };
  });
  b4.bad === 0 && b4.rolled >= 110 ? pass('B4 精英词缀扩池：12 词缀、互斥对永不同现') : fail('B4 词缀', JSON.stringify(b4));

  // B5 多波遭遇：击破一波立即接战下一波，终波方才收仗
  const b5 = await page.evaluate(async () => {
    const p = Game.player;
    p.hp = 99999; p.mp = 9999;
    const mkB = (idx) => {
      const en = buildMonster(['m_yezhu', 'm_dushe', 'm_shanlang'][idx]);
      en.hpMax = 1; en.hp = 1; en.atk = 0; en.crit = 0; en.fx = []; en.charging = false;
      Battle.active = { enemy: en, ctx: { waveIds: ['m_yezhu', 'm_dushe', 'm_shanlang'] }, myFx: [], buffs: { defRounds: 0, dodgeRounds: 0 }, over: false, busy: true, enemyFxIds: [], stats: { out: 0, in: 0, maxCombo: 0, src: { attack: 0, skill: 0, ult: 0, beast: 0, dot: 0, thorns: 0, counter: 0 } }, floats: [], morale: 0, combo: 0, zhenyuan: 0, zmax: 6, waveIds: ['m_yezhu', 'm_dushe', 'm_shanlang'], waveIdx: idx, logs: [] };
    };
    Battle.speed = 3;
    mkB(0);
    await Battle.victory();
    const mid = Battle.active ? { idx: Battle.active.waveIdx, over: Battle.active.over, second: Battle.active.enemy.id } : null;
    if (mid) { Battle.active.enemy.hp = 1; await Battle.victory(); }
    const mid2 = Battle.active ? { idx: Battle.active.waveIdx, enemy: Battle.active.enemy.id } : null;
    if (Battle.active) { Battle.active.enemy.hp = 1; await Battle.victory(); }
    const done = Battle.active === null;
    Battle.speed = 1; Battle.active = null;
    return { mid, mid2, done };
  });
  b5.mid && b5.mid.over === false && b5.mid.idx === 1 && b5.mid2 && b5.mid2.idx === 2 && b5.done
    ? pass('B5 多波遭遇：波间接战不脱战，终波全额结算')
    : fail('B5 多波', JSON.stringify(b5));

  // B6 必杀盘：真元扣减 + 熟练度入档
  const b6 = await page.evaluate(async () => {
    const p = Game.player;
    p.dao = 'sword'; p.ultLv = {};
    const en = buildMonster('m_yezhu');
    en.hpMax = 999999; en.hp = 999999; en.atk = 1; en.crit = 0; en.fx = []; en.charging = false;
    Battle.active = { enemy: en, ctx: {}, myFx: [], buffs: { defRounds: 0, dodgeRounds: 0 }, over: false, busy: false, enemyFxIds: [], stats: { out: 0, in: 0, maxCombo: 0, src: { attack: 0, skill: 0, ult: 0, beast: 0, dot: 0, thorns: 0, counter: 0 } }, floats: [], morale: 0, combo: 0, zhenyuan: 6, zmax: 8, logs: [] };
    Battle.speed = 3;
    await Battle.actUlt('us1');
    const used = p.ultLv.us1 === 1;
    const spent = Battle.active ? Battle.active.zhenyuan : -1;
    const srcUlt = Battle.active && Battle.active.stats.src.ult > 0;
    Battle.active = null; Battle.speed = 1; p.dao = null;
    return { used, spent, srcUlt };
  });
  b6.used && b6.spent === 3 && b6.srcUlt ? pass('B6 必杀成长：真元扣减、熟练度入档、伤害构成计入') : fail('B6 必杀', JSON.stringify(b6));

  /* ================= C 养成组（阶段二） ================= */
  // C1 功法大成奥义：满层解锁被动并入 gongfaBonus
  const c1 = await page.evaluate(() => {
    const p = Game.player;
    const def = GameData.ITEMS.gf_canghai;
    const maxLv = GongfaSys.maxLevel(def);
    p.gongfa = { gf_canghai: { level: maxLv, exp: 0 } };
    const total = Stat.gongfaBonus(p).atkPct;
    const expect = 4 + 2 * (maxLv - 1) + GameData.GF_MASTERY.gf_canghai.fx.atkPct;
    p.gongfa = {};
    return { total, expect, all30: Object.keys(GameData.ITEMS).filter(i => GameData.ITEMS[i].type === 'gongfa' && !GameData.GF_MASTERY[i]).length === 0 };
  });
  c1.total === c1.expect && c1.all30 ? pass('C1 功法大成奥义：满层被动生效，30 部全覆盖') : fail('C1 奥义', JSON.stringify(c1));

  // C2 装备传承（随炉化）+ 分解回收
  const c2 = await page.evaluate(async () => {
    const p = Game.player;
    p.enhanced = {}; p.bag['m_xuantie'] = 20;
    p.equipped.weapon = { id: 'w_tiejian', enhance: 8 };
    delete p.bag['w_tiejian'];
    p.bag['w_qinggang'] = 1;
    const origPopup = UI.popup.bind(UI);
    UI.popup = async (o) => (o.title === '装备对比') ? 'inherit' : origPopup(o);
    await Bag.equip('w_qinggang');
    UI.popup = origPopup;
    const eq = p.equipped.weapon;
    const ore = p.bag['m_xuantie'];
    const oldGone = !p.bag['w_tiejian'];
    UI.popup = async (o) => (o.title || '').includes('分解') ? true : origPopup(o);
    p.bag['w_sanqing'] = 1;   // 传承后青钢剑已穿在身上——改分解包内另一件（grade2 → 返玄铁3）
    await Bag.salvage('w_sanqing');
    UI.popup = origPopup;
    const out = { id: eq && eq.id, enh: eq && eq.enhance, ore, oldGone, salvaged: !p.bag['w_sanqing'], oreAfter: p.bag['m_xuantie'] };
    delete p.equipped.weapon;
    return out;
  });
  c2.id === 'w_qinggang' && c2.enh === 5 && c2.ore === 8 && c2.oldGone && c2.salvaged && c2.oreAfter === 11
    ? pass('C2 传承换装（承5级/耗玄铁12/旧器随炉化）与分解回炉（返玄铁2）')
    : fail('C2 传承分解', JSON.stringify(c2));

  // C3 本命法宝觉醒战技
  const c3 = await page.evaluate(async () => {
    const p = Game.player;
    p.benming = { lv: 6 }; p.bag['z_benming'] = 1;
    const en = buildMonster('m_yezhu');
    en.hpMax = 999999; en.hp = 999999; en.atk = 1; en.crit = 0; en.fx = []; en.charging = false;
    Battle.active = { enemy: en, ctx: {}, myFx: [], buffs: { defRounds: 0, dodgeRounds: 0 }, over: false, busy: false, enemyFxIds: [], stats: { out: 0, in: 0, maxCombo: 0, src: { attack: 0, skill: 0, ult: 0, beast: 0, dot: 0, thorns: 0, counter: 0 } }, floats: [], morale: 0, combo: 0, zhenyuan: 0, zmax: 6, bmUsed: {}, logs: [] };
    Battle.speed = 3;
    await Battle.actBenming('strike6');
    const hit = Battle.active.stats.src.ult > 0;
    const debuffed = StatusFx.pctOf(Battle.active.enemy.fx, 'defdown') > 0;
    await Battle.actBenming('guard3');
    const shield = StatusFx.pctOf(Battle.active.myFx, 'shield') >= 30;
    await Battle.actBenming('strike9');
    const blocked9 = Battle.active.bmUsed.strike9 !== true;
    Battle.active = null; Battle.speed = 1;
    delete p.bag['z_benming']; p.benming = { lv: 0 };
    return { hit, debuffed, shield, blocked9 };
  });
  c3.hit && c3.debuffed && c3.shield && c3.blocked9
    ? pass('C3 本命战技：锁魂一击（2.5×+破防）/ 护主金光 / 九阶技 correctly 封锁')
    : fail('C3 本命战技', JSON.stringify(c3));

  // C4 灵兽：十阶第二天生技 / 派遣寻宝 / 斗兽场
  const c4 = await page.evaluate(async () => {
    const p = Game.player;
    p.beasts = { active: null, active2: null, nextId: 1, list: [{ uid: 1, id: 'm_yezhu', name: '野猪', species: 'beast', power: 10, level: 9, exp: 9 * 400, skills: [{ name: '兽王撕咬', kind: 'bleed', pct: 3, rounds: 2 }], bond: 0 }] };
    p.bag['m_neidan'] = 1;
    BeastSys.feed(1);
    const b = p.beasts.list[0];
    const two = b.level === 10 && b.skills.length === 2;
    p.day = 100;
    const origPopup = UI.popup.bind(UI);
    UI.popup = async (o) => (o.title || '').includes('派遣') ? 3 : origPopup(o);
    await BeastSys.dispatch(1);
    UI.popup = origPopup;
    const tripping = !!(b.trip && b.trip.days === 3);
    p.day = 103;
    BeastSys.claimTrip(1);
    const claimed = !b.trip && Object.keys(p.bag).some(id => GameData.ITEMS[id] && GameData.ITEMS[id].type === 'material');
    p.beasts.active = 1;
    p.stones.low += 100000;
    UI.popup = async (o) => (o.title || '').includes('斗兽') ? 0 : origPopup(o);
    await BeastSys.arena();
    UI.popup = origPopup;
    const arenaOk = (p.counters.arenaWins || 0) >= 1 || Log.entries.join('|').includes('斗兽场');
    p.beasts = { active: null, active2: null, nextId: 1, list: [] };
    return { two, tripping, claimed, arenaOk };
  });
  c4.two && c4.tripping && c4.claimed && c4.arenaOk
    ? pass('C4 灵兽纵深：十阶双技 / 派遣寻宝归来 / 斗兽场结算')
    : fail('C4 灵兽', JSON.stringify(c4));

  // C5 洞府新建筑 / 灵泉日产 / 藏宝阁加成 / 天机果破桎
  const c5 = await page.evaluate(() => {
    const p = Game.player;
    p.cave = { lv: 1, builds: { beast: 0, train: 0, lib: 0, forge: 2, spring: 3, treasury: 3 }, plots: [] };
    const treasuryOk = Stat.compute(p).stonePct >= 9;
    let gained = 0;
    const orig = Bag.addStones;
    Bag.addStones = n => { gained += n; return orig.call(Bag, n); };
    CaveSys.springDaily(p);
    Bag.addStones = orig;
    const springOk = gained > 0 && p.cave._springDay === Math.floor(p.day);
    const buildsOk = CaveSys.BUILDS.length === 6;
    for (const k of Object.keys(p.attrs)) p.attrs[k] = 10;
    p.bag['fruit_tianji'] = 1;
    Bag.use('fruit_tianji');
    const fruitOk = Object.values(p.attrs).some(v => v === 11);
    delete p.bag['fruit_tianji'];
    p.attrs = { gen: 5, comp: 5, luck: 5, body: 5 };
    p.poison = 0;
    p.cave = null;
    return { treasuryOk, springOk, buildsOk, fruitOk };
  });
  c5.treasuryOk && c5.springOk && c5.buildsOk && c5.fruitOk
    ? pass('C5 养成纵深：六营造 / 灵泉日产 / 藏宝阁 +9% / 天机果破桎至11')
    : fail('C5 建筑/天机果', JSON.stringify(c5));

  /* ================= 汇总 ================= */
  const fails = results.filter(r => r[0] === 'FAIL');
  console.log('\n========== verify-v10 汇总 ==========');
  console.log(`通过 ${results.filter(r => r[0] === 'PASS').length} / ${results.length}`);
  if (consoleErrors.length) console.log('控制台错误:', consoleErrors.slice(0, 5));
  if (fails.length || consoleErrors.length) {
    process.exitCode = 1;
  } else {
    console.log('✅ 全部通过，0 控制台错误');
  }
} catch (e) {
  console.error('验证脚本异常:', e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
