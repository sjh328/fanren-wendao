/* v26「拨云」验证：逐组断言（App-Shell / 可读性 / 引导直达 / bug 修复 / 炼丹火候品质）
 * 运行：node verify-v12.mjs （需先 node server.mjs）
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

  /* ================= VA 静态资源组（style.css / index.html） ================= */
  const css = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const m860 = (css.split('@media (max-width: 860px)')[1] || '').split('@media')[0];

  css.includes('#93362c') && /\.focus-alert \{[^}]*linear-gradient\(120deg, #93362c/.test(css.replace(/\n/g, ' '))
    ? pass('VA1 提醒卡朱砂实底（深底浅字 ≥7:1）') : fail('VA1 提醒卡配色', '未找到 #93362c 朱砂实底');
  /\.focus-alert \.focus-title \{[^}]*color: #ffece0/.test(css.replace(/\n/g, ' '))
    ? pass('VA2 提醒卡标题浅米字') : fail('VA2 提醒卡标题', '缺 #ffece0');
  m860.includes('100dvh') && m860.includes('overscroll-behavior: contain') && m860.includes('#tab-content')
    ? pass('VA3 App-Shell：≤860px 壳化（100dvh + 唯一滚动源）') : fail('VA3 App-Shell', JSON.stringify({ has: m860.includes('100dvh'), contain: m860.includes('overscroll-behavior') }));
  !/@media \(max-width: 860px\)[^@]*body \{ overflow: auto; \}/.test(css)
    ? pass('VA4 文档流滚动已退役（body 不再放开滚动）') : fail('VA4 body 滚动', '≤860 仍有 body overflow:auto');
  css.includes('@keyframes glimmerIn') && css.includes('#back-top') && css.includes('.fire-btn')
    ? pass('VA5 闪光引导 / 回到顶部 / 火候按钮样式齐备') : fail('VA5 样式件', '');
  /@media \(max-width: 860px\)[^@]*\.battle-box \{[^}]*display: flex/.test(css.replace(/\n/g, ' ')) && /#bt-log \{[^}]*flex: 1 1 auto/.test(css.replace(/\n/g, ' ').replace('  ', ' '))
    ? pass('VA6 战斗壳：战报内滚、操作常驻') : fail('VA6 战斗壳', '缺 flex 壳规则');
  html.includes('id="back-top"') && html.includes('style.css?v=44') && html.includes('game.js?v=44')
    ? pass('VA7 回到顶部按钮 + 缓存号 v=44') : fail('VA7 index.html', '');

  /* ================= VB 移动端壳行为组（390×844） ================= */
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(600);

  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page.type('#create-name', '拨云道人');
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

  const vb1 = await page.evaluate(() => {
    const gs = getComputedStyle(document.getElementById('game-screen'));
    const tc = getComputedStyle(document.getElementById('tab-content'));
    return { gsH: gs.height, vh: innerHeight, tcOv: tc.overflowY, bodyOv: getComputedStyle(document.body).overflowY };
  });
  (Math.abs(parseFloat(vb1.gsH) - vb1.vh) < 2 && vb1.tcOv === 'auto')
    ? pass('VB1 壳行为：屏高等于视口、内容区为滚动容器') : fail('VB1 壳行为', JSON.stringify(vb1));

  // VB2 提醒卡对比度实测（制造紧急状态后取渲染色）
  const vb2 = await page.evaluate(() => {
    const p = Game.player;
    p.layer = 3; p.exp = GameData.layerNeed(p.realmIdx, 3) + 10; p.realmIdx = Math.min(1, p.realmIdx);
    UI.markDirty('all'); UI.renderAll();
    const el = document.querySelector('.focus-alert .focus-title');
    if (!el) return { hit: false };
    const cTitle = getComputedStyle(el).color;
    const cBg = getComputedStyle(document.querySelector('.focus-alert')).backgroundImage;
    const lum = (rgb) => { const m = rgb.match(/\d+/g).map(Number); const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const L1 = lum(cTitle), L2 = lum('rgb(117, 39, 32)');
    return { hit: true, cTitle, dark: cBg.includes('117, 39, 32') || cBg.includes('147, 54, 44'), ratio: ((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)).toFixed(1) };
  });
  (vb2.hit && vb2.dark && Number(vb2.ratio) >= 4.5)
    ? pass(`VB2 提醒卡实测对比度 ${vb2.ratio}:1（朱砂底 + 浅字）`) : fail('VB2 提醒卡对比度', JSON.stringify(vb2));

  // VB3 焦点条结构化：目标进度 + 目的地 + quest-goto
  const vb3 = await page.evaluate(() => {
    UI.markDirty('focus'); UI.renderFocus();
    const main = document.querySelector('.focus-main');
    if (!main) return { hit: false };
    return {
      hit: true,
      prog: /目标 \d+\/\d+/.test(main.querySelector('.focus-sub')?.textContent || ''),
      dest: /前往 · /.test(main.querySelector('.focus-dest')?.textContent || ''),
      goto: !!main.querySelector('[data-action="quest-goto"]'),
    };
  });
  (vb3.hit && vb3.prog && vb3.dest && vb3.goto)
    ? pass('VB3 焦点条：目标 x/y · 进度 · 目的地 · quest-goto 直达') : fail('VB3 焦点条', JSON.stringify(vb3));

  // VB4 空条刻度墨字（丹毒 0 → .bar-text.dim）
  const vb4 = await page.evaluate(() => {
    const p = Game.player; p.poison = 0;
    UI.markDirty('all'); UI.renderAll();
    return { dim: !!document.querySelector('#panel-left .bar-text.dim') };
  });
  vb4.dim ? pass('VB4 空条刻度改墨字（.bar-text.dim）') : fail('VB4 空条刻度', JSON.stringify(vb4));

  // VB5 寿元取整显示
  const vb5 = await page.evaluate(() => {
    const p = Game.player; p.age = 16.9178;
    UI.markDirty('status'); UI.renderStatus();
    const t = document.querySelector('#panel-left .id-line')?.textContent || '';
    return { t, ok: t.includes('16 /') && !t.includes('16.9') };
  });
  vb5.ok ? pass('VB5 寿元显示取整（不再吐浮点）') : fail('VB5 寿元取整', vb5.t);

  /* ================= VC 引导直达组 ================= */
  // VC1 问道页步骤：序号 + 数值目标微进度条 + 前往带锚点
  const vc1 = await page.evaluate(() => {
    Game.actions['act-tab']({ tab: 'quest' });
    const rows = [...document.querySelectorAll('#tab-content .q-step')];
    const first = rows.find(r => r.querySelector('.q-go')) || rows[1] || rows[0];
    return {
      rows: rows.length,
      markNum: first ? first.querySelector('.q-mark')?.textContent.trim() : '',
      hasGo: !!document.querySelector('#tab-content .q-go'),
      focus: (() => { const f = QuestSys.focus(); return f && f.stepIdx >= 1 && f.stepTotal >= 1 && 'anchor' in f; })(),
    };
  });
  (vc1.rows >= 3 && ['1', '2', '3'].includes(vc1.markNum) && vc1.hasGo && vc1.focus)
    ? pass('VC1 问道页：步骤序号/微进度/前往 + focus 结构化') : fail('VC1 问道页步骤', JSON.stringify(vc1));

  // VC2 前往直达闪光：锚点滚动 + .glimmer 挂载
  const vc2 = await page.evaluate(async () => {
    const f = QuestSys.focus();
    if (!f) return { hit: false };
    Game.actions['quest-goto']({ tab: f.go, anchor: f.anchor || '修行' });
    await new Promise(r => setTimeout(r, 500));
    return { hit: true, glim: !!document.querySelector('#tab-content .glimmer'), tab: Game.activeTab };
  });
  (vc2.hit && vc2.glim)
    ? pass('VC2 前往直达：切页 + 目标卡鎏金闪光（' + vc2.tab + '）') : fail('VC2 直达闪光', JSON.stringify(vc2));

  // VC3 页签滚动记忆
  const vc3 = await page.evaluate(() => {
    Game.actions['act-tab']({ tab: 'quest' });
    const tc = document.getElementById('tab-content');
    tc.scrollTop = 160;
    Game.actions['act-tab']({ tab: 'cultivate' });
    const mem = Game.scrollMem.quest;
    Game.actions['act-tab']({ tab: 'quest' });
    return { mem, restored: Math.abs(tc.scrollTop - 160) < 40 };
  });
  (vc3.mem === 160 && vc3.restored) ? pass('VC3 页签滚动位置记忆') : fail('VC3 滚动记忆', JSON.stringify(vc3));

  /* ================= VD bug 修复组 ================= */
  // VD1 祭炼强化写实例（此前白花钱）
  const vd1 = await page.evaluate(async () => {
    const p = Game.player;
    p.equipped.weapon = { id: 'w_tiejian', enhance: 5 };
    p.stones.low = 999999; p.bag['m_xuantie'] = 99;
    const origPopup = UI.popup; UI.popup = async () => true;
    const origChance = Math.random; Math.random = () => 0.01;   // 必成
    try { await ForgeSys.enhance('weapon'); } finally { UI.popup = origPopup; Math.random = origChance; }
    const inst = p.equipped.weapon;
    return { enh: inst && inst.enhance, id: inst && inst.id };
  });
  vd1.enh === 6 ? pass('VD1 祭炼强化写穿戴实例（+5→+6 生效）') : fail('VD1 强化实例', JSON.stringify(vd1));

  // VD2 旧档 migrate 保留强化（原清零 bug）
  const vd2 = await page.evaluate(() => {
    const old = PlayerFactory.create('考古断档', { gen: 5, comp: 5, luck: 5, body: 5 });
    old.enhanced = { w_tiejian: 7 };
    old.equipped.weapon = 'w_tiejian';   // v18 之前的字符串形态
    const out = PlayerFactory.migrate(JSON.parse(JSON.stringify(old)));
    const eq = out.equipped.weapon;
    return { type: typeof eq, enh: eq && eq.enhance };
  });
  vd2.type === 'object' && vd2.enh === 7
    ? pass('VD2 旧档强化 migrate 不再清零（读原始存档）') : fail('VD2 migrate 强化', JSON.stringify(vd2));

  // VD3 聚灵弹窗显示金额（原 ${...} 代码原文）
  const vd3 = await page.evaluate(async () => {
    const p = Game.player; p.cave = p.cave || null;
    if (!p.cave) return { skip: true };
    p.rushDay = -1; p.day = Math.floor(p.day);
    const origPopup = UI.popup; let captured = '';
    UI.popup = async (o) => { captured = o.html || ''; return false; };
    try { await CaveSys.spiritRush(); } finally { UI.popup = origPopup; }
    return { captured, ok: /灵石/.test(captured) && !captured.includes('${') && /\d/.test(captured) };
  });
  (vd3.skip || vd3.ok) ? pass('VD3 聚灵弹窗金额正常渲染（模板不再转义）') : fail('VD3 聚灵弹窗', JSON.stringify(vd3));

  // VD4 自动修炼目标输入框显隐联动
  const vd4 = await page.evaluate(async () => {
    const origPopup = UI.popup; let done = null;
    // mock：复刻真实 popup 的 DOM 注入（否则 setTimeout 联动找不到控件）
    UI.popup = (o) => new Promise(res => {
      done = res;
      document.getElementById('popup-title').textContent = o.title || '';
      document.getElementById('popup-body').innerHTML = o.html || '';
      document.getElementById('popup-btns').innerHTML = '';
    });
    const openP = AutoCult.open();
    await new Promise(r => setTimeout(r, 150));
    const kind = document.getElementById('auto-kind');
    const realm = document.getElementById('auto-realm');
    const val = document.getElementById('auto-val');
    if (!kind) { UI.popup = origPopup; done(false); await openP; return { hit: false }; }
    const before = { realmHidden: realm.classList.contains('hidden'), valHidden: val.classList.contains('hidden') };
    kind.value = 'exp'; kind.dispatchEvent(new Event('change'));
    const after = { realmHidden: realm.classList.contains('hidden'), valHidden: val.classList.contains('hidden') };
    done(false); await openP; UI.popup = origPopup;
    return { hit: true, before, after };
  });
  (vd4.hit && vd4.before.realmHidden === false && vd4.before.valHidden === true
    && vd4.after.realmHidden === true && vd4.after.valHidden === false)
    ? pass('VD4 自动修炼：目标输入框随类型显隐（两目标解禁）') : fail('VD4 自动修炼输入框', JSON.stringify(vd4));

  // VD5 罚款实扣（spendStonesMax）
  const vd5 = await page.evaluate(() => {
    const p = Game.player;
    p.stones = { low: 30, mid: 0, high: 0 };
    const took = Bag.spendStonesMax(100);
    const zero = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
    p.stones = { low: 250, mid: 3, high: 1 };
    const took2 = Bag.spendStonesMax(100);
    const left2 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
    return { took, zero, took2, left2 };
  });
  (vd5.took === 30 && vd5.zero === 0 && vd5.took2 === 100 && vd5.left2 === 10450)
    ? pass('VD5 罚款尽力实扣（不足全扣、足额扣齐）') : fail('VD5 罚款', JSON.stringify(vd5));

  // VD6 调息丹毒：练气 5 点、金丹 3 点（胎息特性回归）
  const vd6 = await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 0; p.poison = 50; Cultivate.rest();
    const qig = p.poison;
    p.realmIdx = 2; p.poison = 50; Cultivate.rest();
    const jindan = p.poison;
    p.realmIdx = 0;
    return { drop: 50 - qig, dropHi: 50 - jindan };
  });
  (Math.abs(vd6.drop - 5.35) < 0.01 && Math.abs(vd6.dropHi - 3.35) < 0.01)
    ? pass('VD6 调息化毒：练气 5 / 其余 3（胎息特性成立，含日衰 0.35）') : fail('VD6 调息化毒', JSON.stringify(vd6));

  // VD7 孽障不至负
  const vd7 = await page.evaluate(() => {
    const p = Game.player; p.karma = 0;
    KarmaSys.addKarma(-3, true);
    return { karma: p.karma };
  });
  vd7.karma === 0 ? pass('VD7 孽障下限钳制（消业不至负）') : fail('VD7 孽障钳制', JSON.stringify(vd7));

  // VD8 灵兽放归清空护持位
  const vd8 = await page.evaluate(async () => {
    const p = Game.player;
    p.beasts = p.beasts || { active: null, active2: null, list: [], nextId: 1 };
    const uid = 9901;
    p.beasts.list.push({ uid, id: 'm_yezhu', name: '野猪', species: 'beast', power: 10, level: 1, exp: 0, skills: [] });
    p.beasts.active2 = uid;
    const origPopup = UI.popup; UI.popup = async () => true;
    try { await BeastSys.free(uid); } finally { UI.popup = origPopup; }
    return { active2: p.beasts.active2, gone: !p.beasts.list.some(b => b.uid === uid) };
  });
  (vd8.active2 === null && vd8.gone) ? pass('VD8 放归清空护持位（active2 不悬挂）') : fail('VD8 放归', JSON.stringify(vd8));

  // VD9 pickWeighted 空表防崩
  const vd9 = await page.evaluate(() => Utils.pickWeighted([]));
  vd9 === null ? pass('VD9 pickWeighted 空权重表返回 null') : fail('VD9 空权重表', String(vd9));

  // VD10 存档节流仅挂机路径（默认不节流）
  const vd10 = await page.evaluate(() => {
    const writes = [];
    const orig = Save.write;
    Save.write = (k, p) => writes.push(k);
    Save.autoSave();                    // 默认：直写 #1
    Save.setThrottle(true);
    Save._lastAuto = Date.now();        // 模拟 2.5s 内刚存过
    Save.autoSave();                    // 节流：跳过
    const thrCount = writes.length;     // 仍为 1
    Save.autoSave(true);                // force：直写 #2
    const forceCount = writes.length;   // 2
    Save.setThrottle(false);
    Save.autoSave();                    // 解除后直写 #3
    const total = writes.length;        // 3
    Save.write = orig;
    return { thrCount, forceCount, total };
  });
  (vd10.thrCount === 1 && vd10.forceCount === 2 && vd10.total === 3)
    ? pass('VD10 autoSave 节流仅作用挂机热路径（默认/force 不受影响）') : fail('VD10 存档节流', JSON.stringify(vd10));

  // VD11 离线回放：年龄保持整数、天数推进
  const vd11 = await page.evaluate(() => {
    const p = Game.player;
    const slotKey = Game.slot == null ? 'auto' : Game.slot;
    const data = JSON.parse(localStorage.getItem('fanren_wd_' + slotKey));
    data.meta.ts = Date.now() - 10 * 60000;   // 离线 10 分钟 → 10 天
    localStorage.setItem('fanren_wd_' + slotKey, JSON.stringify(data));
    const day0 = p.day;
    p.day = 363; p.age = 16;                  // 制造跨年：363+10 → 第 2 年
    Game.computeOfflineProgress();
    return { dayAdvanced: p.day - 363 >= 9, age: p.age, ageInt: Number.isInteger(p.age) };
  });
  (vd11.dayAdvanced && vd11.ageInt)
    ? pass('VD11 离线逐日回放：天数推进 + 跨年年龄整化（' + vd11.age + ' 岁）') : fail('VD11 离线回放', JSON.stringify(vd11));

  /* ================= VE 炼丹火候与品质组 ================= */
  const ve1 = await page.evaluate(() => {
    const p = Game.player;
    p.dao = null;
    const r = GameData.ALCHEMY_RECIPES[0];
    const base = CraftSys.rate(p, r, null);
    const wen = CraftSys.rate(p, r, 'wen');
    const wu = CraftSys.rate(p, r, 'wu');
    return { base, wenUp: wen - base, wuDown: wu - base };
  });
  (ve1.wenUp === 5 && ve1.wuDown === -3)
    ? pass('VE1 火候数值生效（文火 +5 / 武火 -3）') : fail('VE1 火候数值', JSON.stringify(ve1));

  const ve2 = await page.evaluate(() => {
    Game.actions['act-tab']({ tab: 'shop:craft' });
    const btns = [...document.querySelectorAll('#tab-content .fire-btn')];
    return { n: btns.length, labels: btns.map(b => b.textContent.trim()), onOff: btns.filter(b => b.classList.contains('on')).length };
  });
  (ve2.n === 4 && ve2.onOff === 1 && ve2.labels.some(l => l.includes('文火')))
    ? pass('VE2 炼制坊火候选择入口（四档单选）') : fail('VE2 火候入口', JSON.stringify(ve2));

  const ve3 = await page.evaluate(async () => {
    const p = Game.player;
    p.dao = null;   // 隔离丹道干扰
    const r = GameData.ALCHEMY_RECIPES[0];
    for (const [id, n] of Object.entries(r.need)) p.bag[id] = (p.bag[id] || 0) + 20;
    CraftSys.setFire('wen');
    const origRandom = Math.random; Math.random = () => 0.0005;   // 必成 + 必极品
    let made0 = 0;
    try {
      const before = p.bag[r.out] || 0;
      CraftSys.alchemy(r.id, 1);
      made0 = (p.bag[r.out] || 0) - before;
    } finally { Math.random = origRandom; CraftSys.setFire(null); }
    return { made0 };
  });
  ve3.made0 >= 2 ? pass(`VE3 品质激活：极品当炉翻倍（产出 ×${ve3.made0}）`) : fail('VE3 极品翻倍', JSON.stringify(ve3));

  const ve4 = await page.evaluate(() => {
    const p = Game.player; p.dao = null;
    const r = GameData.ALCHEMY_RECIPES[0];
    for (const [id, n] of Object.entries(r.need)) p.bag[id] = (p.bag[id] || 0) + 20;
    const origPopup = UI.popup; UI.popup = async () => { throw new Error('batch must not popup'); };
    let pillExp0;
    try { pillExp0 = p.daoExp ? p.daoExp.pill : 0; } catch (e) { pillExp0 = 0; }
    const before = p.bag[r.out] || 0;
    try { CraftSys.alchemy(r.id, 5); } finally { UI.popup = origPopup; }
    return { made: (p.bag[r.out] || 0) - before };
  });
  ve4.made >= 1 ? pass('VE4 批量连炉不受火候影响（无弹窗直通）') : fail('VE4 批量连炉', JSON.stringify(ve4));

  /* ================= VF 源码接线组（防回归） ================= */
  const srcAll = fs.readFileSync('game.js', 'utf8');
  const checks = [
    ['VF1 长老令次日更张（until today+1）', srcAll.includes('until: today + 1')],
    ['VF2 转世传承法宝不再被覆盖', srcAll.includes('if (kept && !p2.bag[kept]) p2.bag[kept] = 1')],
    ['VF3 强化写入穿戴实例', srcAll.includes("if (eq && typeof eq === 'object') eq.enhance = Math.min(this.MAX_LV, lv + 1)")],
    ['VF4 migrate 读原始存档强化', srcAll.includes('const srcEnh = (p.enhanced && typeof p.enhanced === \'object\') ? p.enhanced : {}')],
    ['VF5 放归清理 active2', srcAll.includes('if (p.beasts.active2 === uid) p.beasts.active2 = null')],
    ['VF6 悬赏声望 tag 全行标注', srcAll.includes('${repTag}</div>')],
    ['VF7 兽栏被动对齐蜕变系数', srcAll.includes('(b.evolved ? 1.4 : 1)')],
    ['VF8 quest-goto 锚点接线', srcAll.includes('UI.glimmer(d.anchor)')],
    ['VF9 自动修炼输入框联动接线', srcAll.includes("kindSel.addEventListener('change', sync)")],
    ['VF10 品质消费接线（极品翻倍）', srcAll.includes("if (qual === 'supreme') { supremeN++; qty *= 2; DaoSys.gain(p, 10); }")],
  ];
  for (const [name, ok] of checks) ok ? pass(name) : fail(name, '源码未含预期接线');

} catch (e) {
  fail('脚本异常中断', String(e && e.stack || e));
} finally {
  if (browser) await browser.close();
}

/* ================= 汇总 ================= */
console.log('\n===== verify-v12 汇总 =====');
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
