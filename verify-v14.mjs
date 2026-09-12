/* v28「重光」验证：逐组断言（P0 层叠陷阱回归 / 界面重塑 / 更多面板 / 联动织网 / 功能升级）
 * 运行：node verify-v14.mjs （需先 node server.mjs）
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

  /* ================= TA 静态资源组（style.css / index.html / game.js 源） ================= */
  const css = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const js = fs.readFileSync('game.js', 'utf8');

  css.includes('--radius-card: 12px') && css.includes('--card-pad') && css.includes('body.density-compact')
    ? pass('TA1 设计令牌：卡片圆角/内边距/密度档变量齐备') : fail('TA1 设计令牌', '缺 --radius-card / --card-pad / density-compact');
  css.includes('#more-sheet { display: none; }') && /\.sheet-mains \{ display: grid; grid-template-columns: repeat\(4, 1fr\)/.test(css)
    ? pass('TA2 「更多」面板样式（桌面隐藏 + 移动端四列格）') : fail('TA2 更多面板样式', '缺 #more-sheet 或 .sheet-mains 规则');
  css.includes('.m-id-chip') && css.includes('.m-hide') && css.includes('.m-mini-bars {\n    position: absolute')
    ? pass('TA3 单行顶栏样式：身份徽章 / 收拢类 / 迷你条贴底') : fail('TA3 单行顶栏样式', '缺 .m-id-chip / .m-hide / 迷你条绝对定位');
  /\.tab-btn\.m-sheet \{ display: none; \}/.test(css) && /\.tab-btn\.m-more \{ display: block; \}/.test(css)
    ? pass('TA4 底栏五键：收拢页签隐藏、「更多」显形') : fail('TA4 底栏五键', '缺 .m-sheet 隐藏或 .m-more 显形规则');
  css.includes('.bag-wealth') && /@media \(min-width: 861px\) \{\n  \.bag-list \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/.test(css)
    ? pass('TA5 乾坤袋：家资行 + 桌面双列物品网格') : fail('TA5 乾坤袋', '缺 .bag-wealth 或 .bag-list 网格');
  css.includes('.quick-go-btn') && css.includes('.id-line2') && css.includes('.sheet-cell')
    ? pass('TA6 诸处速达 / 身份历程行 / 面板直达格样式齐备') : fail('TA6 样式件', '');
  html.includes('id="more-sheet"') && /<\/main>[\s\S]*?id="drawer-backdrop"/.test(html) && html.indexOf('id="drawer-backdrop"') < html.indexOf('<div id="battle-modal"')
    ? pass('TA7 遮罩已移入 #game-screen（P0 修根）+ more-sheet 元素在位') : fail('TA7 index.html 结构', '遮罩位置或 more-sheet 缺失');
  html.includes('<i class="mdb-i" aria-hidden="true">☰</i><span class="mdb-t">道途</span>') && html.includes('id="amb-density"')
    ? pass('TA8 抽屉钮图标化 + 界面密度设置项在位') : fail('TA8 index.html 控件', '');
  html.includes('style.css?v=45') && html.includes('game.js?v=45')
    ? pass('TA9 缓存号升级 v=45') : fail('TA9 缓存号', 'index.html 未升到 v=45');
  js.includes('M_SHEET_TABS') && js.includes('renderMoreSheet()') && js.includes("'act-more'")
    ? pass('TA10 更多面板 JS：收拢表 / 渲染器 / 动作齐备') : fail('TA10 更多面板 JS', '');
  js.includes('closeDrawers(opts = {})') && js.includes("if (!sheet.classList.contains('on')) sheet.classList.add('hidden');")
    ? pass('TA11 closeDrawers 统一收口（抽屉+面板+遮罩，防闪烁）') : fail('TA11 closeDrawers', '');
  js.includes("legacy.towerBest = Math.max(legacy.towerBest || 0") && js.includes('act-sect-listen') && js.includes('厚礼登门')
    ? pass('TA12 联动源码在位：塔绩传承 / 宗门听讲 / 莫逆厚礼') : fail('TA12 联动源码', '');

  /* ================= TB 移动端 P0 层叠回归组（390×844） ================= */
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(600);
  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = ''; });
  await page.type('#create-name', '重光道人');
  await page.click('[data-action="st-start"]');
  await sleep(800);
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => {
      const t = document.getElementById('tutorial');
      if (t && !t.className.includes('hidden')) { t.querySelector('[data-action="tut-skip"]')?.click(); return 1; }
      const sm = document.getElementById('story-modal');
      if (sm && !sm.className.includes('hidden')) { (document.querySelector('.story-opt') || document.querySelector('[data-action="story-next"]'))?.click(); return 1; }
      const pm = document.getElementById('popup-modal');
      if (pm && !pm.className.includes('hidden')) { [...pm.querySelectorAll('.popup-btns .btn')].find(x => /踏上仙途|确定|继续|收下/.test(x.textContent))?.click(); return 1; }
      return 0;
    });
    if (!st) break;
    await sleep(200);
  }
  await sleep(300);

  // 注入一段进度：金丹 · 宗门 · 洞府 · 交情（联动与导航断言的前置）
  await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 2; p.layer = 1; p.exp = 200; p.age = 22; p.day = 40;
    p.attrs = { gen: 7, comp: 8, luck: 6, body: 6 };
    p.stones = { low: 3600, mid: 42, high: 2 };
    p.dao = 'sword';
    p.sect = { id: 'qingyun', contrib: 1860, faction: null, tasks: [
      { type: 'cult', target: null, need: 400, progress: 400, name: '修行 · 精进不休', desc: '累计获得修为 400' },
    ] };
    p.cave = { lv: 3, plots: [null, null, null, null], builds: { beast: 1, train: 1, lib: 0, forge: 0, spring: 1, treasury: 0 } };
    p.bounties = { day: Math.floor(p.day), list: [] };
    p.npcs = p.npcs || {};
    const nd = GameData.NPCS[0];
    if (nd) p.npcs[nd.id] = { alive: true, met: true, rel: 62, realmIdx: 2, layer: 2, map: 'qingfeng', sparWins: 0, sparLoses: 0 };
    p.reputation = 40;
    p.equipped = { weapon: null, armor: null, accessory: null };
    Stat.compute(p); UI.markDirty('all'); UI.renderAll();
  });
  await sleep(400);

  // 核心回归：开抽屉 → 面板中心命中面板本体（v27 及之前命中遮罩 → 全屏变暗卡死）
  const tb1 = await page.evaluate(async () => {
    UI.toggleDrawer('left');
    await new Promise(r => setTimeout(r, 450));
    const pl = document.getElementById('panel-left');
    const r = pl.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, Math.min(r.y + 200, window.innerHeight - 10));
    const hit2 = document.elementFromPoint(r.x + r.width / 2, r.y + r.height - 60);
    return { inPanelTop: hit ? pl.contains(hit) : false, inPanelBottom: hit2 ? pl.contains(hit2) : false, open: pl.classList.contains('drawer-open'), scrimOn: document.getElementById('drawer-backdrop').classList.contains('on'), inGameScreen: document.getElementById('game-screen').contains(pl) };
  });
  (tb1.inPanelTop && tb1.inPanelBottom && tb1.open && tb1.scrimOn && tb1.inGameScreen)
    ? pass('TB1 P0 回归：抽屉打开后命中测试落在面板本体（不再被遮罩盖死）') : fail('TB1 P0 层叠', JSON.stringify(tb1));

  const tb2 = await page.evaluate(() => {
    // 点遮罩关闭（遮罩点击行为在 #game-screen 内仍被委托监听捕获）
    document.getElementById('drawer-backdrop').click();
    return document.getElementById('panel-left').classList.contains('drawer-open');
  });
  await sleep(400);
  !tb2 ? pass('TB2 遮罩点击可关抽屉（事件委托不受挪位影响）') : fail('TB2 遮罩点击', '抽屉未关闭');

  // 大字号 110%（根级 zoom）下抽屉依旧可用
  const tb3 = await page.evaluate(async () => {
    Ambience.applyFontScale(110);
    await new Promise(r => setTimeout(r, 120));
    UI.toggleDrawer('right');
    await new Promise(r => setTimeout(r, 450));
    const pr = document.getElementById('panel-right');
    const r = pr.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, Math.min(r.y + 200, window.innerHeight - 10));
    const ok = hit ? pr.contains(hit) : false;
    UI.closeDrawers();
    Ambience.applyFontScale(100);
    return ok;
  });
  tb3 ? pass('TB3 110% 大字号（根 zoom）下乾坤抽屉命中面板本体') : fail('TB3 大字号抽屉', '命中遮罩');

  /* ================= TC 底栏五键与「更多」面板组 ================= */
  const tc1 = await page.evaluate(() => {
    const bar = [...document.querySelectorAll('#tabs .tab-btn')];
    const vis = bar.filter(b => getComputedStyle(b).display !== 'none').map(b => b.dataset.tab || 'more');
    const sheetHidden = document.getElementById('more-sheet').classList.contains('hidden');
    return { vis, count: vis.length, sheetHidden };
  });
  (tc1.count === 5 && tc1.vis[0] === 'cultivate' && tc1.vis[4] === 'more' && tc1.sheetHidden)
    ? pass('TC1 底栏恰五键：修炼/问道/游历/坊市 + 更多（收拢键不可见）') : fail('TC1 底栏五键', JSON.stringify(tc1));

  const tc2 = await page.evaluate(async () => {
    UI.toggleMore();
    await new Promise(r => setTimeout(r, 420));
    const sheet = document.getElementById('more-sheet');
    const mains = [...sheet.querySelectorAll('.sheet-main')].map(b => b.dataset.tab);
    const cells = [...sheet.querySelectorAll('.sheet-cell')].map(b => b.dataset.tab);
    return { shown: !sheet.classList.contains('hidden'), mains, cells, scrimOn: document.getElementById('drawer-backdrop').classList.contains('on') };
  });
  (tc2.shown && tc2.mains.join(',') === 'cave,jianghu,sect,gongfa' && tc2.cells.length === 10 && tc2.scrimOn)
    ? pass('TC2 更多面板：四页签 + 十处直达 + 遮罩点亮') : fail('TC2 更多面板', JSON.stringify(tc2));

  const tc3 = await page.evaluate(async () => {
    [...document.querySelectorAll('#more-sheet .sheet-cell')].find(b => b.dataset.tab === 'shop:bounty')?.click();
    await new Promise(r => setTimeout(r, 450));
    return { tab: Game.activeTab, sub: Game.subTab.shop, closed: document.getElementById('more-sheet').classList.contains('hidden') };
  });
  (tc3.tab === 'shop' && tc3.sub === 'bounty' && tc3.closed)
    ? pass('TC3 直达格深链：悬赏板直达且面板自动收起') : fail('TC3 直达格', JSON.stringify(tc3));

  const tc4 = await page.evaluate(async () => {
    UI.toggleMore();
    await new Promise(r => setTimeout(r, 380));
    document.getElementById('drawer-backdrop').click();
    await new Promise(r => setTimeout(r, 420));
    const closed = document.getElementById('more-sheet').classList.contains('hidden') || !document.getElementById('more-sheet').classList.contains('on');
    // ESC 关面板
    UI.toggleMore();
    await new Promise(r => setTimeout(r, 380));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await new Promise(r => setTimeout(r, 420));
    const closedByEsc = document.getElementById('more-sheet').classList.contains('hidden') || !document.getElementById('more-sheet').classList.contains('on');
    return { closed, closedByEsc };
  });
  (tc4.closed && tc4.closedByEsc) ? pass('TC4 面板可由遮罩与 ESC 双路关闭') : fail('TC4 面板关闭', JSON.stringify(tc4));

  const tc5 = await page.evaluate(() => {
    // 红点聚合：宗门任务已达成 → m-more 亮红点
    UI.markDirty('tabs'); UI.renderTabs();
    const more = document.querySelector('#tabs .tab-btn.m-more');
    return { dot: !!more.querySelector('.dot') };
  });
  tc5.dot ? pass('TC5 红点聚合：收拢页签有事 → 「更多」亮红点') : fail('TC5 红点聚合', 'm-more 无红点');

  /* ================= TD 单行顶栏 / 抽屉信息组 ================= */
  const td1 = await page.evaluate(async () => {
    UI.closeDrawers();
    await new Promise(r => setTimeout(r, 300));
    const chip = document.querySelector('#top-info .m-id-chip');
    const hidden = [...document.querySelectorAll('#top-info .m-hide')];
    const chipHidden = hidden.length && hidden.every(el => getComputedStyle(el).display === 'none');
    const titleHidden = getComputedStyle(document.querySelector('#top-bar .top-title')).display === 'none';
    const mini = document.querySelector('.m-mini-bars');
    const miniAbs = mini ? getComputedStyle(mini).position === 'absolute' : false;
    const powerTxt = document.querySelector('#top-info .res-power')?.textContent || '';
    return { hasChip: !!chip, chipTxt: chip ? chip.textContent : '', chipHidden, titleHidden, miniAbs, powerTxt };
  });
  (td1.hasChip && td1.chipTxt.includes('重光道人') && td1.chipTxt.includes('金丹') && td1.chipHidden && td1.titleHidden && td1.miniAbs && td1.powerTxt.includes('武'))
    ? pass('TD1 单行顶栏：身份徽章（名+境）/ 卷誉岁月收拢 / 标题隐 / 迷你条贴底 / 战力「武」字') : fail('TD1 单行顶栏', JSON.stringify(td1));

  const td2 = await page.evaluate(async () => {
    document.querySelector('#top-info .m-id-chip').click();
    await new Promise(r => setTimeout(r, 450));
    const opened = document.getElementById('panel-left').classList.contains('drawer-open');
    const line2 = document.querySelector('#panel-left .id-line2')?.textContent || '';
    UI.closeDrawers();
    await new Promise(r => setTimeout(r, 300));
    return { opened, line2 };
  });
  (td2.opened && td2.line2.includes('卷') && td2.line2.includes('历时') && td2.line2.includes('誉'))
    ? pass('TD2 点身份徽章开道途抽屉；身份卡历程行（卷/历时/誉）就位') : fail('TD2 身份徽章', JSON.stringify(td2));

  const td3 = await page.evaluate(() => {
    UI.toggleDrawer('right');
    const w = document.querySelector('#bag-panel .bag-wealth')?.textContent || '';
    UI.closeDrawers();
    return w;
  });
  (td3.includes('下品') && td3.includes('誉') && td3.includes('贡献'))
    ? pass('TD3 乾坤袋家资行：灵石三档 / 声望 / 贡献') : fail('TD3 家资行', td3);

  /* ================= TE 修炼页速达 / 一键行权扩容 / 密度档 ================= */
  const te1 = await page.evaluate(() => {
    Game.actions['act-tab']({ tab: 'cultivate' });
    const card = document.querySelector('#tab-content .quick-go-card');
    const cells = [...document.querySelectorAll('#tab-content .quick-go-btn')].map(b => b.dataset.tab);
    return { has: !!card, n: cells.length, hasBounty: cells.includes('shop:bounty'), hasTower: cells.includes('map:tower') };
  });
  (te1.has && te1.n === 12 && te1.hasBounty && te1.hasTower)
    ? pass('TE1 修炼页「诸处速达」：12 处直达含红点透传') : fail('TE1 速达行', JSON.stringify(te1));

  const te2 = await page.evaluate(async () => {
    // 宗门任务已达成 → 一键行权应领取（弹窗小账含「宗门任务领赏」）
    const p = Game.player;
    const before = p.sect.contrib;
    Guide.dailyAll();
    await new Promise(r => setTimeout(r, 600));
    const pm = document.getElementById('popup-modal');
    const txt = pm && !pm.className.includes('hidden') ? document.getElementById('popup-body').textContent : '';
    const claimed = txt.includes('宗门任务领赏');
    [...pm.querySelectorAll('.popup-btns .btn')].find(x => /收 下|确定/.test(x.textContent))?.click();
    await new Promise(r => setTimeout(r, 200));
    return { claimed, grew: p.sect.contrib > before };
  });
  (te2.claimed && te2.grew) ? pass('TE2 一键行权扩容：宗门任务可交付自动领取') : fail('TE2 行权扩容', JSON.stringify(te2));

  const te3 = await page.evaluate(async () => {
    const card = document.querySelector('#tab-content .card');
    const before = getComputedStyle(card).padding;
    Ambience.applyDensity('compact');
    const compactOn = document.body.classList.contains('density-compact');
    await new Promise(r => setTimeout(r, 60));
    const after = getComputedStyle(card).padding;
    Ambience.applyDensity('cozy');
    const off = !document.body.classList.contains('density-compact');
    return { changed: before !== after, before, after, compactOn, off };
  });
  (te3.changed && te3.compactOn && te3.off)
    ? pass('TE3 界面密度档：紧凑档切换 body 类并真实改变卡片内边距') : fail('TE3 密度档', JSON.stringify(te3));

  /* ================= TF 联动织网数值组（纯函数断言） ================= */
  const tf = await page.evaluate(() => {
    const p = Game.player;
    const out = {};
    // G4 心魔蚀道：心魔 50 → 成算 -5（剑修 ×0.77 等大道乘区在减项之后，故取无道者量基准）
    const daoKeep = p.dao;
    p.dao = null;
    p.xinmo = 0; const c0 = Cultivate.breakthroughChance(p, 0);
    p.xinmo = 50; const c50 = Cultivate.breakthroughChance(p, 0);
    out.g4 = Math.abs((c0 - c50) - 5) < 0.01;
    p.xinmo = 0; p.dao = daoKeep;
    // G7 感悟溢出折算修为
    p.layer = 1; p.exp = 0; p.insight = 100;
    const expBefore = p.exp;
    Cultivate.addInsight(p, 10);
    out.g7 = (p.insight === 100) && (p.exp > expBefore);
    p.insight = 0;
    // G8 丹毒过半 → 成丹率 -5
    p.cave = p.cave || { lv: 1, builds: {} };
    const fake = { rate: 50 };
    p.poison = 0; const r0 = CraftSys.rate(p, fake, null);
    p.poison = Stat.poisonCap(p) * 0.6; const r60 = CraftSys.rate(p, fake, null);
    out.g8 = Math.abs((r0 - r60) - 5) < 0.01;
    p.poison = 0;
    // G2 声望及于黑市价
    p.reputation = 100; const hi = BlackSys.price(p, 'm_xuantie');
    p.reputation = -50; const lo = BlackSys.price(p, 'm_xuantie');
    out.g2 = hi < lo;
    p.reputation = 40;
    // G1 气运乘数与求签烟测
    out.g1 = Math.abs(KarmaSys.goodEventMult({ fortune: 100 }) - 1.5) < 0.001;
    p.signDay = -1;
    DailySign.draw();
    out.g1smoke = p.signDay === Math.floor(p.day);
    // G11 亲昵近 sixty 的灵兽出行多带材料
    p.beasts = { list: [
      { uid: 1, id: 'm_yezhu', name: '甲', species: 'beast', power: 24, level: 2, exp: 0, bond: 70, skills: [], trip: { until: Math.floor(p.day), days: 3 } },
      { uid: 2, id: 'm_yezhu', name: '乙', species: 'beast', power: 24, level: 2, exp: 0, bond: 0, skills: [], trip: { until: Math.floor(p.day), days: 3 } },
    ], active: 1, active2: null, nextId: 3 };
    for (const k of Object.keys(p.bag)) if (GameData.ITEMS[k] && GameData.ITEMS[k].type === 'material') delete p.bag[k];
    BeastSys.claimTrip(1);
    const qtyBond = Object.entries(p.bag).filter(([k]) => GameData.ITEMS[k].type === 'material').reduce((s, [, v]) => s + v, 0);
    BeastSys.claimTrip(2);
    const qtyPlain = Object.entries(p.bag).filter(([k]) => GameData.ITEMS[k].type === 'material').reduce((s, [, v]) => s + v, 0) - qtyBond;
    out.g11 = qtyBond === 2 && qtyPlain === 1;
    return out;
  });
  tf.g4 ? pass('TF1 心魔蚀道：未降伏心魔每 10 点 -1% 突破成算') : fail('TF1 心魔成算', JSON.stringify(tf));
  tf.g7 ? pass('TF2 感悟满百溢出自动折算修为（不再蒸发）') : fail('TF2 感悟溢出', JSON.stringify(tf));
  tf.g8 ? pass('TF3 丹毒过半成丹率 -5（手有浮毒，丹火不稳）') : fail('TF3 丹毒丹率', JSON.stringify(tf));
  tf.g2 ? pass('TF4 声望及于暗巷：名望高者黑市价更低') : fail('TF4 黑市声望', JSON.stringify(tf));
  (tf.g1 && tf.g1smoke) ? pass('TF5 气运压低凶签：goodEventMult(100)=1.5 + 求签烟测') : fail('TF5 气运求签', JSON.stringify(tf));
  tf.g11 ? pass('TF6 亲昵≥60 灵兽出行多带一份材料') : fail('TF6 灵兽出行', JSON.stringify(tf));

  /* ================= TG 宗门听讲（贡献新去处） ================= */
  const tg = await page.evaluate(async () => {
    const p = Game.player;
    Game.actions['act-tab']({ tab: 'sect' });
    await new Promise(r => setTimeout(r, 350));
    const btn = document.querySelector('#tab-content [data-action="act-sect-listen"]');
    const rowTxt = document.querySelector('#tab-content')?.textContent || '';
    if (!btn) return { has: false };
    const before = p.sect.contrib;
    btn.click();
    await new Promise(r => setTimeout(r, 450));
    const after = p.sect.contrib;
    const btnAfter = document.querySelector('#tab-content [data-action="act-sect-listen"]');
    return { has: true, rowTxt: rowTxt.includes('听讲一日'), spent: after === before - 300, disabled: btnAfter ? btnAfter.disabled : null };
  });
  (tg.has && tg.rowTxt && tg.spent && tg.disabled)
    ? pass('TG1 宗门「听讲一日」：300 贡献兑感悟，日限一次（按钮转灰）') : fail('TG1 听讲', JSON.stringify(tg));

  /* ================= 收尾 ================= */
  await sleep(400);
  const failed = results.filter(r => r[0] === 'FAIL');
  const total = results.length;
  console.log(`\n共 ${total} 项，失败 ${failed.length} 项`);
  console.log(`控制台错误 ${consoleErrors.length} 条:`);
  consoleErrors.slice(0, 12).forEach(e => console.log('  ' + e));
  if (failed.length) { failed.forEach(([t, n]) => console.log('  ✗ ' + n)); process.exit(1); }
  if (consoleErrors.length) process.exit(1);
} catch (err) {
  console.error('套件执行异常:', err);
  process.exit(1);
} finally {
  if (browser) await browser.close();
}
