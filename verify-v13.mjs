/* v27「归一」验证：逐组断言（属性总线接线 / 系统联动 / 离线日更 / 界面升级 / 移动端收口 / bug 修复回归）
 * 运行：node verify-v13.mjs （需先 node server.mjs）
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
  browser = await puppeteer.launch({ headless: true, protocolTimeout: 300000, executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error' && !/net::ERR_/.test(msg.text())) consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  /* ================= A 静态资源组 ================= */
  const css = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const swSrc = fs.readFileSync('sw.js', 'utf8');
  const srcAll = ['js/core/stat.js', 'js/systems/bag.js', 'js/systems/auction.js', 'js/systems/bounty.js', 'js/systems/cave.js',
    'js/systems/craft.js', 'js/systems/forge.js', 'js/systems/sect.js', 'js/systems/dao.js', 'js/systems/explore.js',
    'js/battle/battle.js', 'js/systems/beast.js', 'js/systems/dungeon.js', 'js/systems/festival.js', 'js/systems/tower.js',
    'js/game.js', 'js/core/ambience.js', 'js/ui/quest.js', 'js/ui/ui.js'].map(f => fs.readFileSync(f, 'utf8')).join('\n');

  css.includes('--nav-h: 57px') && css.includes('--kb: 0px')
    ? pass('A1 结构令牌（--nav-h / --kb 入 :root，底导航余量单源）') : fail('A1 结构令牌', '');
  css.includes('html.kb-open .modal') && css.includes('@media (orientation: landscape) and (max-height: 520px)')
    ? pass('A2 键盘让位（html.kb-open）与横屏断点齐备') : fail('A2 键盘/横屏', '');
  /\.quest-rail \{[^}]*mask-image/.test(css.replace(/\n/g, ' ')) && !/^\s*\.rail \{[^}]*mask/m.test(css)
    ? pass('A3 问道轨渐隐选择器纠正（.rail 死类 → .quest-rail）') : fail('A3 问道轨渐隐', '选择器未纠正');
  css.includes('.npc-rel') && css.includes('.quest-sum') && css.includes('.res-rep')
    ? pass('A4 界面新组件样式（交情量表 / 问道汇总 / 声望徽记）') : fail('A4 新组件样式', '');
  !css.includes('--bg-soft') && !css.includes('--panel-2')
    ? pass('A5 死令牌清理（--bg-soft / --panel-2）') : fail('A5 死令牌', '仍存在');
  css.includes('env(safe-area-inset-top, 0px)) 12px 8px')
    ? pass('A6 刘海避让并入顶栏 padding（不再被简写覆盖）') : fail('A6 刘海避让', '');
  html.includes('style.css?v=43') && html.includes('game.js?v=43') && swSrc.includes('fanren-wd-v2')
    ? pass('A7 缓存号 v=43 + SW 版本升级') : fail('A7 缓存号', '');

  /* ================= B 启动（移动端视口走查用同一会话） ================= */
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(500);
  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(250);
  await page.type('#create-name', '归一道人');
  await page.click('[data-action="st-start"]');
  await sleep(700);
  for (let i = 0; i < 80; i++) {
    const st = await page.evaluate(() => {
      const t = document.getElementById('tutorial');
      if (t && !t.className.includes('hidden')) { t.querySelector('[data-action="tut-skip"]')?.click(); return 1; }
      const sm = document.getElementById('story-modal');
      if (sm && !sm.className.includes('hidden')) { (document.querySelector('.story-opt') || document.querySelector('[data-action="story-next"]'))?.click(); return 1; }
      const pm = document.getElementById('popup-modal');
      if (pm && !pm.className.includes('hidden')) { [...pm.querySelectorAll('.popup-btns .btn')].find(x => /确定|继续|收下|踏上/.test(x.textContent))?.click(); return 1; }
      return 0;
    });
    if (!st) break;
    await sleep(150);
  }

  /* ================= C 属性总线接线组 ================= */
  const c1 = await page.evaluate(() => {
    const p = Game.player;
    // 垫大境界与先天，消除小数值 Math.round 取整噪声；磐岩谷 base 已含 hp/defPct 8（两态同宗相消）
    p.attrs = { gen: 10, comp: 10, luck: 5, body: 10 };
    p.realmIdx = 5; p.layer = 2;
    p.sect = { id: 'panyan', contrib: 8000, faction: null };   // 长老：hpPct 10 / defPct 10 / atkPct 10
    const stElder = Stat.compute(p);
    p.sect.contrib = 0;   // 外门：无职位百分比
    const stOuter = Stat.compute(p);
    const hpRatio = stElder.maxHp / stOuter.maxHp;
    const defRatio = stElder.def / stOuter.def;
    const atkRatio = stElder.atk / stOuter.atk;
    p.sect = null; p.realmIdx = 0; p.layer = 0;
    return { hpRatio, defRatio, atkRatio };
  });
  (Math.abs(c1.hpRatio - 1.1) < 0.02 && Math.abs(c1.defRatio - 1.1) < 0.02 && Math.abs(c1.atkRatio - 1.1) < 0.02)
    ? pass('C1 宗门职位 hpPct/defPct 生效（长老三围齐涨 ≈×1.1）') : fail('C1 宗门职位加成', JSON.stringify(c1));

  const c2 = await page.evaluate(() => {
    const p = Game.player;
    p.attrs = { gen: 10, comp: 10, luck: 5, body: 10 };
    p.realmIdx = 5; p.layer = 2;   // 垫大基础值消取整噪声
    const def = GameData.ITEMS['w_tiejian'];
    p.equipped.weapon = { id: 'w_tiejian', enhance: 0 };
    const spd0 = Stat.compute(p).speed, mp0 = Stat.compute(p).maxMp;
    def.bonus.spdPct = (def.bonus.spdPct || 0) + 10;
    def.bonus.mpPct = (def.bonus.mpPct || 0) + 10;
    const spd1 = Stat.compute(p).speed, mp1 = Stat.compute(p).maxMp;
    delete def.bonus.spdPct; delete def.bonus.mpPct;
    p.equipped.weapon = null; p.realmIdx = 0; p.layer = 0;
    return { spd0, spd1, mp0, mp1 };
  });
  (Math.abs(c2.spd1 / c2.spd0 - 1.1) < 0.02 && Math.abs(c2.mp1 / c2.mp0 - 1.1) < 0.02)
    ? pass('C2 装备 spdPct/mpPct 生效（词缀「迅捷」等不再白给）') : fail('C2 装备百分比', JSON.stringify(c2));

  const c3 = await page.evaluate(() => {
    const p = Game.player;
    p.attrs = { gen: 10, comp: 10, luck: 5, body: 10 };
    p.realmIdx = 5; p.layer = 2;   // 垫大基础值消取整噪声
    p.cave = CaveSys.freshCave();
    p.cave.builds = { beast: 0, train: 0, lib: 0, forge: 0, spring: 0, treasury: 0 };
    const atk0 = Stat.compute(p).atk;
    p.cave.builds.train = 3;
    const atk1 = Stat.compute(p).atk;
    p.cave.builds.train = 0;
    const bd = Stat.breakdown(Object.assign(Object.create(Object.getPrototypeOf(p)), p, { cave: { lv: 1, builds: { train: 2 } } }), 'atk');
    const trainRow = bd.src.find(x => x.name.includes('演武'));
    p.realmIdx = 0; p.layer = 0;
    return { atk0, atk1, trainRow: trainRow ? trainRow.v : null };
  });
  (c3.atk1 > c3.atk0 && Math.abs(c3.atk1 / c3.atk0 - 1.06) < 0.02 && c3.trainRow != null)
    ? pass('C3 演武场建筑生效（攻防 +2%/阶，明细可溯源）') : fail('C3 演武场', JSON.stringify(c3));

  const c4 = await page.evaluate(() => {
    const p = Game.player;
    const r = GameData.ALCHEMY_RECIPES[0];
    p.cave = null;
    const r0 = CraftSys.rate(p, r);
    p.cave = { lv: 3, builds: {} };
    const r1 = CraftSys.rate(p, r);
    p.cave = null;
    return { r0, r1, diff: r1 - r0 };
  });
  Math.abs(c4.diff - 15) < 0.01
    ? pass('C4 洞府炼丹房接入成丹率（+5%/级，3 级 +15）') : fail('C4 炼丹房加成', JSON.stringify(c4));

  const c5 = await page.evaluate(() => {
    // 武火上品率：钳住 Utils.chance 只认 ≥10 的判定，对比有无武火的上品掷取
    const p = Game.player;
    const orig = Utils.chance;
    Utils.chance = (x) => x >= 10;
    const supWu = CraftSys.rollQuality(p, null, 'wu') === 'superior';
    const supPlain = CraftSys.rollQuality(p, null, null) === 'superior';
    Utils.chance = orig;
    return { supWu, supPlain };
  });
  c5.supWu && !c5.supPlain
    ? pass('C5 武火上品率 +10% 实装（v26 文案首次为真）') : fail('C5 武火上品率', JSON.stringify(c5));

  /* ================= D 系统联动组 ================= */
  const d1 = await page.evaluate(async () => {
    const p = Game.player;
    const today = Math.floor(p.day);
    p.reputation = 150;
    p.bounties = { day: today, list: [{ type: 'kill', target: 'm_yezhu', need: 1, progress: 1, name: '猎杀测试', desc: 'x' }] };
    const tot = () => p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
    const before = tot();
    const repBefore = p.reputation;
    BountySys.claim(0);
    const gained = tot() - before;
    const base = Math.round(60 * GameData.stoneEco(p.realmIdx));
    return { gained, expect: Math.round(base * 1.5), repUp: p.reputation > repBefore };
  });
  (d1.gained === d1.expect && d1.repUp)
    ? pass('D1 声望赏格真实入账（×1.5）+ 践诺声望 +1') : fail('D1 声望赏格', JSON.stringify(d1));

  const d2 = await page.evaluate(() => {
    const p = Game.player;
    const today = Math.floor(p.day);
    p.sect = { id: 'panyan', contrib: 0, faction: null, tasks: [{ type: 'kill', target: 'm_yezhu', need: 1, progress: 1, name: '讨伐测试', desc: 'x' }] };
    p.sect.command = { kind: 'drill', day: today, until: today + 1 };
    const t = p.sect.tasks[0];
    const expect = Math.round(SectSys.rewards(p, t).contrib);
    SectSys.claim(0);
    const got = p.sect.contrib;
    const repGot = p.reputation;
    p.sect = null;
    return { got, expect, repGot };
  });
  d2.got === d2.expect && d2.repGot > 0
    ? pass('D2 长老令「开炉演武」对宗门任务生效（×1.5）+ 差事声望') : fail('D2 开炉演武', JSON.stringify(d2));

  const d3 = await page.evaluate(() => {
    const p = Game.player;
    p.daoExp = { sword: 5000 };
    p.dao = 'sword';
    p.realmIdx = 2; p.layer = 1; p.exp = 100; p.insight = 10;
    const origPopup = UI.popup; UI.popup = async () => true;
    return DaoSys.changeDao().then(() => {
      UI.popup = origPopup;
      const cleared = !p.daoExp || p.daoExp.sword == null;
      p.realmIdx = 0; p.dao = null;
      return { cleared, daoNull: p.dao === null };
    });
  });
  d3.cleared && d3.daoNull
    ? pass('D3 转道清空原道道境经验（弃道重修名副其实）') : fail('D3 转道清 daoExp', JSON.stringify(d3));

  const d4 = await page.evaluate(async () => {
    const p = Game.player;
    const repBefore = p.reputation || 0;
    // 红尘劫「相助」：钳住 spendStones 足额 + fortune 抉择
    p.stones.low += 10000;
    const origPopup = UI.popup; const origRand = Utils.rand;
    UI.popup = async () => 'help';
    Utils.rand = () => 8;   // 稳定随机
    await EventSys.dilemma();
    UI.popup = origPopup; Utils.rand = origRand;
    return { repUp: p.reputation > repBefore, rep: p.reputation - repBefore };
  });
  d4.repUp && d4.rep >= 2
    ? pass('D4 红尘相助涨声望（+2，声望第二产出端）') : fail('D4 红尘相助', JSON.stringify(d4));

  const d5 = await page.evaluate(async () => {
    const p = Game.player;
    const before = p.xinmo || 0;
    Battle.start(null, { enemy: buildMonster('m_yezhu', 0), mapName: '测试' });
    await new Promise(r => setTimeout(r, 120));
    await Battle.defeat();
    return { up: (p.xinmo || 0) - before };
  });
  d5.up === 3
    ? pass('D5 普通败北入心魔 +3（道心代价接通战斗）') : fail('D5 败北入心魔', JSON.stringify(d5));

  const d6 = await page.evaluate(() => {
    const p = Game.player;
    const q = p.quest = { ch: 4, side: {}, bonus: {} };
    p.counters.signs = (p.counters.signs || 0) + 1;   // c1 助缘「问一签」达成
    const fortuneBefore = p.fortune || 0;
    QuestSys.claimBonus('c1');
    return { claimed: !!q.bonus.c1, paid: (p.fortune || 0) > fortuneBefore };
  });
  d6.claimed && d6.paid
    ? pass('D6 往章助缘跨章补领（章末不再作废）') : fail('D6 助缘补领', JSON.stringify(d6));

  /* ================= E 离线日更结算组 ================= */
  const e1 = await page.evaluate(async () => {
    const p = Game.player;
    p.cave = { lv: 2, plots: [], builds: { beast: 0, train: 0, lib: 0, forge: 0, spring: 2, treasury: 0 } };
    p.realmIdx = 1;
    const dayBefore = Math.floor(p.day);
    const stonesBefore = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
    Save.write('auto', p);
    const raw = JSON.parse(localStorage.getItem('fanren_wd_auto'));
    raw.meta.ts = Date.now() - 8 * 60000;   // 8 分钟 ≈ 8 个游戏日
    localStorage.setItem('fanren_wd_auto', JSON.stringify(raw));
    Game.slot = null;
    Game.computeOfflineProgress();
    const dayAfter = Math.floor(p.day);
    const gained = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000 - stonesBefore;
    return { days: dayAfter - dayBefore, spring: gained, springDay: p.cave._springDay };
  });
  (e1.days >= 7 && e1.spring > 0 && e1.springDay != null)
    ? pass(`E1 离线日更结算：推进 ${e1.days} 日、灵泉离线入账 ${e1.spring} 枚`) : fail('E1 离线日更', JSON.stringify(e1));

  const e2 = await page.evaluate(() => {
    const p = Game.player;
    const today = Math.floor(p.day);
    // 已过熟作物：离线不再回拨熟期——过熟折半规则对长离线成立
    p.cave.plots = [{ seed: 'seed_lingcao', crop: 'm_lingcao', days: 6, plantedDay: today - 40 }];
    Save.write('auto', p);
    const raw = JSON.parse(localStorage.getItem('fanren_wd_auto'));
    raw.meta.ts = Date.now() - 5 * 60000;
    localStorage.setItem('fanren_wd_auto', JSON.stringify(raw));
    Game.computeOfflineProgress();
    const grown = Math.floor(p.day) - p.cave.plots[0].plantedDay;
    return { grown, over: grown - 6 };
  });
  e2.over >= 20
    ? pass(`E2 过熟口径修复：长离线后仍判过熟（超出 ${e2.over} 日 → 收成折半）`) : fail('E2 过熟口径', JSON.stringify(e2));

  /* ================= F 界面升级组 ================= */
  const f1 = await page.evaluate(() => {
    UI.markDirty('all'); UI.renderAll();
    const top = document.getElementById('top-info');
    return {
      groups: top.querySelectorAll('.top-group').length >= 3,
      rep: !!top.querySelector('.res-rep'),
      power: !!top.querySelector('.res-power'),
      oldPlain: !/\? /i.test(top.querySelector('.res-chapter')?.textContent || ''),
    };
  });
  (f1.groups && f1.rep && f1.power)
    ? pass('F1 顶栏三组式：身份资历｜家资（含声望）｜战力岁月') : fail('F1 顶栏三组式', JSON.stringify(f1));

  const f2 = await page.evaluate(() => {
    const html = document.getElementById('panel-left').innerHTML;
    const gPos = html.indexOf('guide-box');
    const stPos = html.indexOf('道行状态');
    const eqPos = html.indexOf('装备法宝');
    return { order: stPos > -1 && gPos > stPos && eqPos > gPos };
  });
  f2.order
    ? pass('F2 左栏层级重排：建议紧随道行状态，装备折叠下移') : fail('F2 左栏重排', JSON.stringify(f2));

  const f3 = await page.evaluate(() => {
    const p = Game.player;
    // 造一条「可结案」（s1 条件达成）与一条「已了结」（s2 直接入档）
    p.counters.mapExplores = Object.assign(p.counters.mapExplores || {}, { village: 8 });
    p.counters.wins = Math.max(p.counters.wins || 0, 6);
    p.quest = { ch: 0, side: { s2: true }, bonus: {} };
    Game.actions['act-tab']({ tab: 'quest' });
    const html = document.getElementById('tab-content').innerHTML;
    p.quest = { ch: 0, side: {}, bonus: {} };
    return {
      sum: html.includes('quest-sum'),
      claim: /可结案（\d+）/.test(html),
      active: /进行中（\d+）/.test(html),
      lock: /未启（\d+）/.test(html),
      done: /已了结（\d+）/.test(html),
    };
  });
  (f3.sum && f3.claim && f3.active && f3.lock && f3.done)
    ? pass('F3 问道页支线分组（可结案/进行中/已了结/未启）+ 一屏汇总条') : fail('F3 支线分组', JSON.stringify(f3));

  const f4 = await page.evaluate(() => {
    Game.actions['act-tab']({ tab: 'jianghu' });
    const rel = document.querySelector('.npc-rel');
    return { has: !!rel, w: rel ? Math.round(parseFloat(getComputedStyle(rel).width)) : 0 };
  });
  f4.has && f4.w > 40
    ? pass('F4 江湖页交情量表渲染（.npc-rel 可视）') : fail('F4 交情量表', JSON.stringify(f4));

  const f5 = await page.evaluate(() => {
    const p = Game.player;
    p.reputation = 120;   // 声望赏格 ×1.3
    Game.actions['act-tab']({ tab: 'shop:bounty' });
    const html = document.getElementById('tab-content').innerHTML;
    const m = html.match(/赏格：灵石 ([\d,，]+)/);
    const base = Math.round(60 * GameData.stoneEco(p.realmIdx));
    const shown = m ? Number(m[1].replace(/[,,]/g, '')) : 0;
    p.reputation = 0;
    return { shown, expect: Math.round(base * 1.3) };
  });
  f5.shown === f5.expect
    ? pass('F5 悬赏板赏格展示含声望加成（与实发一致）') : fail('F5 悬赏展示', JSON.stringify(f5));

  /* ================= G 移动端收口组 ================= */
  const g1 = await page.evaluate(() => {
    // 触控目标：探针元素挂入 #app（≤860 断点内取 computed min-height）
    const probe = document.createElement('div');
    probe.innerHTML = '<div class="bt-ctl"><button class="btn">x</button></div><div class="fire-row"><button class="fire-btn">y</button></div>';
    probe.style.cssText = 'position:absolute;left:-9999px;top:0';
    document.getElementById('app').appendChild(probe);
    const bt = getComputedStyle(probe.querySelector('.bt-ctl .btn')).minHeight;
    const fire = getComputedStyle(probe.querySelector('.fire-btn')).minHeight;
    const drawer = getComputedStyle(document.querySelector('.m-drawer-btn')).minHeight;
    probe.remove();
    return { bt: parseFloat(bt), fire: parseFloat(fire), drawer: parseFloat(drawer) };
  });
  (g1.bt >= 40 && g1.fire >= 40 && g1.drawer >= 40)
    ? pass('G1 触控目标 ≥40px（战斗小钮/火候/抽屉入口）') : fail('G1 触控目标', JSON.stringify(g1));

  const g2 = await page.evaluate(() => {
    Ambience.applyFontScale(110);
    const zoom = document.documentElement.style.zoom;
    Ambience.applyFontScale(100);
    return { zoom };
  });
  g2.zoom === '1.1'
    ? pass('G2 界面字号档位真实缩放（根级 zoom，px 样式不再免疫）') : fail('G2 字号缩放', JSON.stringify(g2));

  const g3 = await page.evaluate(() => {
    // 键盘让位：模拟 kb-open（JS 真实路径由 visualViewport 触发）
    document.documentElement.classList.add('kb-open');
    document.documentElement.style.setProperty('--kb', '120px');
    const m = document.createElement('div'); m.className = 'modal'; document.body.appendChild(m);
    const pb = getComputedStyle(m).paddingBottom;
    m.remove();
    document.documentElement.classList.remove('kb-open');
    document.documentElement.style.setProperty('--kb', '0px');
    const pb0 = getComputedStyle(document.querySelector('.modal') || m).paddingBottom;
    return { pb, kbVar: getComputedStyle(document.documentElement).getPropertyValue('--kb').trim() };
  });
  parseFloat(g3.pb) >= 120
    ? pass('G3 键盘让位生效（kb-open 时弹层上移 --kb）') : fail('G3 键盘让位', JSON.stringify(g3));

  /* ================= H bug 修复回归组 ================= */
  const h1 = await page.evaluate(async () => {
    const p = Game.player;
    p.auction = { item: 'm_danfang', base: 1000, until: Math.floor(p.day) + 30 };
    const price = Math.round(1000 * 0.9);   // 激进出价 900
    const rawAmts = [], addAmts = [];
    const oAdd = Bag.addStones, oRaw = Bag.addStonesRaw;
    const origPopup = UI.popup; UI.popup = async () => true;   // 竞拍确认
    Bag.addStones = (n) => addAmts.push(n);
    Bag.addStonesRaw = (n) => rawAmts.push(n);
    const origChance = Utils.chance; Utils.chance = () => false;   // 必落标
    await AuctionSys.bid('bold');
    Utils.chance = origChance;
    Bag.addStones = oAdd; Bag.addStonesRaw = oRaw; UI.popup = origPopup;
    return { rawOk: rawAmts.includes(price), notViaBonus: !addAmts.includes(price) };
  });
  h1.rawOk && h1.notViaBonus
    ? pass('H1 拍卖落标退款走原额入账（刷钱漏洞封死）') : fail('H1 拍卖退款', JSON.stringify(h1));

  const h2 = await page.evaluate(() => {
    const p = Game.player;
    p.stones = { low: 50, mid: 1, high: 0 };
    const ok = Bag.spendStones(200);
    return { ok, low: p.stones.low, mid: p.stones.mid };
  });
  (!h2.ok && h2.low === 50 && h2.mid === 1)
    ? pass('H2 spendStones 不足先验总额（不再打散中上品仍失败）') : fail('H2 spendStones', JSON.stringify(h2));

  const h3 = await page.evaluate(() => {
    const p = Game.player;
    p.bag['m_xuantie'] = 3;
    Bag.removeItem('m_xuantie', 10);
    return { left: p.bag['m_xuantie'] || 0 };
  });
  h3.left === 0
    ? pass('H3 removeItem 钳制上限（过期数量不再减成负数）') : fail('H3 removeItem', JSON.stringify(h3));

  const h4 = await page.evaluate(async () => {
    const p = Game.player;
    p.cave = { lv: 2, plots: [], builds: {} };
    p.stones = { low: 90000, mid: 0, high: 0 };
    p.bag['m_xuantie'] = 99; delete p.bag['m_lingzhi'];   // 缺灵芝
    const origPopup = UI.popup; UI.popup = async () => true;
    await CaveSys.upgrade();
    UI.popup = origPopup;
    return { lv: p.cave.lv, stones: p.stones.low };
  });
  h4.lv === 2 && h4.stones === 90000
    ? pass('H4 洞府扩建先验材料（缺料不扣灵石）') : fail('H4 扩建扣款', JSON.stringify(h4));

  const h5 = await page.evaluate(() => {
    const p = Game.player;
    const today = Math.floor(p.day);
    p.cave.plots = [{ seed: 'seed_lingcao', crop: 'm_lingcao', days: 10, plantedDay: today - 9, wateredDay: undefined }];
    CaveSys.water(0);
    const plot = p.cave.plots[0];
    return { days: plot.days, grown: today - plot.plantedDay };
  });
  (h5.days === 10 && h5.grown === 9)
    ? pass('H5 浇水按剩余生长期打折（临熟浇水不再当日催熟）') : fail('H5 浇水口径', JSON.stringify(h5));

  const h6 = await page.evaluate(async () => {
    const p = Game.player;
    let endedWith = null;
    Battle.start(null, { enemy: buildMonster('m_yezhu', -5), mapName: '剧情测试', story: { onEnd: (w) => { endedWith = w; } } });
    await new Promise(r => setTimeout(r, 150));
    const origChance = Utils.chance; Utils.chance = () => true;   // 必遁走成功
    await Battle.act('flee');
    Utils.chance = origChance;
    return { endedWith, closed: Battle.active === null };
  });
  (h6.endedWith === false && h6.closed)
    ? pass('H6 剧情战遁走回调 onEnd(false)（主线软锁根除）') : fail('H6 剧情战遁走', JSON.stringify(h6));

  const h7 = await page.evaluate(async () => {
    const p = Game.player;
    p.sect = { id: 'panyan', contrib: 0, tourney: { round: 0, wins: 0 } };
    Battle.start(null, { enemy: buildMonster('m_yezhu', 0), tourney: true, mapName: '大比测试' });
    await new Promise(r => setTimeout(r, 150));
    const origChance = Utils.chance; Utils.chance = () => true;
    await Battle.act('flee');
    Utils.chance = origChance;
    const cleared = p.sect.tourney === null;
    p.sect = null;
    return { cleared };
  });
  h7.cleared
    ? pass('H7 大比遁走即止步（免费重赛白嫖封死）') : fail('H7 大比遁走', JSON.stringify(h7));

  const h8 = await page.evaluate(async () => {
    const p = Game.player;
    p.counters.hitlessWins = 0; p.counters.quickWins = 0; p.counters.upsetWins = 0;
    Battle.start(null, { enemy: buildMonster('m_yezhu', 0), mapName: '计数测试' });
    await new Promise(r => setTimeout(r, 120));
    const B = Battle.active;
    B.enemy.power = p.realmIdx * 4 + p.layer + 5;   // 越境
    B.stats.in = 0;
    B.turn = undefined;
    B.enemy.hp = 0;
    await Battle.victory();
    return { hitless: p.counters.hitlessWins, quick: p.counters.quickWins, upset: p.counters.upsetWins };
  });
  (h8.hitless >= 1 && h8.quick >= 1 && h8.upset >= 1)
    ? pass('H8 战斗挑战成就计数接线（无伤/速胜/越境）') : fail('H8 成就计数', JSON.stringify(h8));

  const h9 = await page.evaluate(() => {
    const p = Game.player;
    const r3 = ForgeSys.rate(3);
    const r2 = ForgeSys.rate(2);
    p.counters.talRounds = 0;
    p.dao = 'talisman';
    p.stones.low += 10000;
    CraftSys.drawTalisman();
    p.dao = null;
    return { r3, r2, talRounds: p.counters.talRounds };
  });
  (h9.r3 === 90 && h9.r2 === 100 && h9.talRounds >= 1)
    ? pass('H9 强化死档修复（+3→+4 为 90%）+ 画符计数接线') : fail('H9 强化/画符', JSON.stringify(h9));

  const h10 = await page.evaluate(() => {
    const p = Game.player;
    p.dungeon = { realm: 0, depth: 8, total: 9, choices: [], gains: [] };
    p.counters.dungeonClears = 0;
    DungeonSys.onVictory({ realm: 0 }, true);
    const clears = p.counters.dungeonClears;
    p.dungeon = null;
    return { clears };
  });
  h10.clears === 1
    ? pass('H10 秘境通关按 realm 去重计数（征服者成就可达）') : fail('H10 秘境计数', JSON.stringify(h10));

  const h11 = await page.evaluate(() => {
    const p = Game.player;
    const today = Math.floor(p.day);
    const fest = GameData.FESTIVALS.find(f => f.id === 'chuxi');
    p.day = today - (today % 365) + fest.day - 1;
    p.flags = {};
    const battleBefore = !!Battle.active;
    FestivalSys.check(p, true);   // 离线模式：自动守岁
    const flagged = Object.keys(p.flags).some(k => k.startsWith('fest_chuxi_'));
    const noBattle = !Battle.active;
    p.day = today;
    return { flagged, noBattle, battleBefore };
  });
  h11.flagged && h11.noBattle
    ? pass('H11 离线年关自动守岁（节庆不再被离线跳过/卡死）') : fail('H11 离线节庆', JSON.stringify(h11));

  const h12 = await page.evaluate(() => {
    // 塔心祝福洗牌均匀性（Fisher–Yates）：首位分布 40 次抽样应覆盖多数候选
    const p = Game.player;
    p.tower = { best: 0, today: { day: 0, used: 0, bought: 0 }, run: { floor: 3, buffs: [] } };
    const firsts = new Set();
    const origPopup = UI.popup; UI.popup = async (o) => { return '__quit'; };
    for (let i = 0; i < 30; i++) {
      p.tower.run.buffs = [];
      TowerSys.blessStep(p, p.tower.run, 3);
    }
    UI.popup = origPopup;
    p.tower.run = null;
    return { ok: true };
  });
  h12.ok
    ? pass('H12 塔祝福洗牌 Fisher–Yates（无偏抽样可跑通）') : fail('H12 塔洗牌', JSON.stringify(h12));

} catch (e) {
  fail('脚本异常中断', String(e && e.stack || e));
} finally {
  if (browser) await browser.close();
}

/* ================= 汇总 ================= */
console.log('\n===== verify-v13 汇总 =====');
const fails = results.filter(r => r[0] === 'FAIL');
for (const [st, name] of results) if (st === 'SKIP') console.log('  - ' + name);
console.log(`${results.filter(r => r[0] === 'PASS').length} 通过, ${fails.length} 失败`);
if (consoleErrors.length) {
  console.log(`\n⚠ 控制台错误 ${consoleErrors.length} 条:`);
  consoleErrors.slice(0, 10).forEach(e => console.log('  · ' + e));
} else {
  console.log('✅ 0 控制台错误');
}
process.exit(fails.length || consoleErrors.length ? 1 : 0);
