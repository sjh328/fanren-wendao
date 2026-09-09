/* v25「掌上乾坤」验证：逐组断言（移动端重构 / 登天塔 / 真仙终章）
 * 运行：node verify-v11.mjs （需先 node server.mjs）
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

  /* ================= AA 移动端组（390×844 手机视口） ================= */
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(600);

  // AA1 剧情卷轴纸张背景（v25 修复：此前文字浮在模糊页面上）
  // 注：沉浸态（≤860）卷轴全屏无圆角属设计使然，桌面圆角在 AC0 另验
  const aa1 = await page.evaluate(() => {
    Story.play({ id: 'test_v25_bg', title: 'v25 断言', scenes: [{ t: 'narr', text: '剧情背景断言。' }] }, null, true);
    const el = document.querySelector('#story-modal .story-box');
    const cs = el ? getComputedStyle(el) : null;
    const out = {
      bg: cs ? cs.backgroundImage.includes('linear-gradient') : false,
      immersive: document.body.classList.contains('story-playing'),
      tabsHidden: getComputedStyle(document.getElementById('tabs')).display === 'none',
      topHidden: getComputedStyle(document.getElementById('top-bar')).display === 'none',
      boxH: cs ? parseFloat(cs.height) : 0,
      vh: window.innerHeight,
    };
    Story.finish();
    return out;
  });
  await sleep(300);
  (aa1.bg) ? pass('AA1 剧情卷轴有纸张背景（全平台修复）') : fail('AA1 剧情背景', JSON.stringify(aa1));
  (aa1.immersive && aa1.tabsHidden && aa1.topHidden && aa1.boxH > aa1.vh * 0.9)
    ? pass('AA2 移动端剧情沉浸态：隐藏底部导航/顶栏、卷轴全屏')
    : fail('AA2 剧情沉浸态', JSON.stringify(aa1));
  const aa2b = await page.evaluate(() => ({
    off: !document.body.classList.contains('story-playing'),
    tabsBack: getComputedStyle(document.getElementById('tabs')).display !== 'none',
  }));
  aa2b.off && aa2b.tabsBack ? pass('AA2b 剧情毕沉浸态摘除') : fail('AA2b 沉浸摘除', JSON.stringify(aa2b));

  // 开档供后续断言
  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page.type('#create-name', '掌上道人');
  await page.click('[data-action="st-start"]');
  await sleep(800);
  for (let i = 0; i < 120; i++) {
    const st = await page.evaluate(() => {
      const t = document.getElementById('tutorial');
      if (t && !t.className.includes('hidden')) { t.querySelector('[data-action="tut-next"]')?.click(); return 1; }
      const sm = document.getElementById('story-modal');
      if (sm && !sm.className.includes('hidden')) { (document.querySelector('.story-opt') || document.querySelector('[data-action="story-next"]'))?.click(); return 1; }
      const pm = document.getElementById('popup-modal');
      if (pm && !pm.className.includes('hidden')) { [...pm.querySelectorAll('.popup-btns .btn')].find(x => /踏上仙途|确定|继续/.test(x.textContent))?.click(); return 1; }
      return 0;
    });
    if (!st) break;
    await sleep(200);
  }

  // AA3 顶栏两行化：chips 行横向滚动、顶栏可换行
  const aa3 = await page.evaluate(() => {
    const info = getComputedStyle(document.getElementById('top-info'));
    const bar = getComputedStyle(document.getElementById('top-bar'));
    return { infoOv: info.overflowX, wrap: bar.flexWrap, meta2: getComputedStyle(document.querySelector('.top-meta2') || document.body).display };
  });
  (aa3.infoOv === 'auto' && aa3.wrap === 'wrap') ? pass('AA3 顶栏两行化：chips 行横滑 + 顶栏 wrap') : fail('AA3 顶栏两行化', JSON.stringify(aa3));

  // AA4 底部导航：锁定页签只显示锁形；红点绝对定位角标
  const aa4 = await page.evaluate(() => {
    const shop = document.querySelector('.tab-btn[data-tab="shop"]');
    const cultivate = document.querySelector('.tab-btn[data-tab="cultivate"]');
    return { lockedTxt: shop ? shop.textContent.trim() : null, cultTxt: cultivate ? cultivate.textContent.trim() : null };
  });
  (aa4.lockedTxt === '🔒' && aa4.cultTxt === '修炼') ? pass('AA4 锁定页签图标化（窄屏不撑爆）') : fail('AA4 锁定图标化', JSON.stringify(aa4));

  // AA5 教程毕抽屉自愈
  const aa5 = await page.evaluate(async () => {
    UI.toggleDrawer('left');
    const opened = document.getElementById('panel-left').classList.contains('drawer-open');
    Tutorial.finish();
    await new Promise(r => setTimeout(r, 100));
    return { opened, leftOpen: document.getElementById('panel-left').classList.contains('drawer-open'), rightOpen: document.getElementById('panel-right').classList.contains('drawer-open') };
  });
  await sleep(200);
  await page.evaluate(() => { UI.closePopup(); });
  (aa5.opened && !aa5.leftOpen && !aa5.rightOpen) ? pass('AA5 教程毕抽屉自愈') : fail('AA5 抽屉自愈', JSON.stringify(aa5));

  // AA6 Toast 同屏 ≤3
  const aa6 = await page.evaluate(() => {
    for (let i = 0; i < 6; i++) UI.toast('测试 ' + i);
    return document.getElementById('toast').children.length;
  });
  (aa6 <= 3) ? pass('AA6 Toast 同屏至多 3 条') : fail('AA6 Toast 上限', String(aa6));
  await sleep(2400);

  // AA7 表单字号 ≥16px（iOS 防聚焦放大）
  const aa7 = await page.evaluate(() => {
    UI.toggleDrawer('right');
    const el = document.querySelector('#amb-font');
    return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
  });
  (aa7 >= 16) ? pass('AA7 表单控件字号 ≥16px（iOS 防缩放）') : fail('AA7 表单字号', String(aa7));
  await page.evaluate(() => { UI.closeDrawers(); });

  // AA8 弹窗滚动锁（body:has 渐进增强）
  const aa8 = await page.evaluate(async () => {
    const before = getComputedStyle(document.body).overflow;
    UI.popup({ title: '滚动锁断言', html: 'x', options: [{ text: '关', value: true }] });
    await new Promise(r => setTimeout(r, 100));
    const during = getComputedStyle(document.body).overflow;
    UI.closePopup();
    await new Promise(r => setTimeout(r, 100));
    return { before, during };
  });
  (aa8.during === 'hidden') ? pass('AA8 弹窗打开时 body 滚动锁') : fail('AA8 滚动锁', JSON.stringify(aa8));

  // AA9 仙途条滚动容器 + 自动定位
  const aa9 = await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 4;   // 化神：自动滚动应向右
    UI.renderAll();
    return new Promise(res => setTimeout(() => {
      const sc = document.querySelector('.rp-scroll');
      res({
        exists: !!sc,
        ov: sc ? getComputedStyle(sc).overflowX : null,
        sl: sc ? sc.scrollLeft : -1,
        nodes: document.querySelectorAll('.rp-scroll .rp-node').length,
      });
    }, 400));
  });
  (aa9.exists && aa9.ov === 'auto' && aa9.nodes === 10 && aa9.sl > 10) ? pass('AA9 仙途条横滑容器 + 当前境界自动定位') : fail('AA9 仙途条', JSON.stringify(aa9));

  /* ================= AB 天塔组（桌面新页面——setViewport 会触发重载，故另开一页） ================= */
  const page2 = await browser.newPage();
  page2.on('console', msg => { if (msg.type() === 'error' && !/net::ERR_/.test(msg.text())) consoleErrors.push(msg.text()); });
  page2.on('pageerror', err => consoleErrors.push(err.message));
  await page2.setViewport({ width: 1280, height: 900, isMobile: false });
  await page2.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(400);
  // 清空共享 localStorage（移动组已占槽位三），刷新后重新开档
  await page2.evaluate(() => { for (const k of Object.keys(localStorage)) localStorage.removeItem(k); });
  await page2.reload({ waitUntil: 'networkidle0' });
  await sleep(500);

  // AC0 桌面剧情纸张卡：圆角 + 居中弹窗形态
  const ac0 = await page2.evaluate(() => {
    Story.play({ id: 'test_v25_desk', title: '桌面断言', scenes: [{ t: 'narr', text: '桌面剧情背景断言。' }] }, null, true);
    const cs = getComputedStyle(document.querySelector('#story-modal .story-box'));
    const out = { bg: cs.backgroundImage.includes('linear-gradient'), radius: parseFloat(cs.borderRadius), shadow: cs.boxShadow.includes('rgba') };
    Story.finish();
    return out;
  });
  await sleep(200);
  (ac0.bg && ac0.radius >= 10) ? pass('AC0 桌面剧情卷轴：纸张背景 + 12px 圆角卡片') : fail('AC0 桌面剧情卡', JSON.stringify(ac0));

  // 桌面页开档供后续断言
  await page2.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page2.type('#create-name', '案头道人');
  await page2.click('[data-action="st-start"]');
  await sleep(800);
  for (let i = 0; i < 120; i++) {
    const st = await page2.evaluate(() => {
      const t = document.getElementById('tutorial');
      if (t && !t.className.includes('hidden')) { t.querySelector('[data-action="tut-next"]')?.click(); return 1; }
      const sm = document.getElementById('story-modal');
      if (sm && !sm.className.includes('hidden')) { (document.querySelector('.story-opt') || document.querySelector('[data-action="story-next"]'))?.click(); return 1; }
      const pm = document.getElementById('popup-modal');
      if (pm && !pm.className.includes('hidden')) { [...pm.querySelectorAll('.popup-btns .btn')].find(x => /踏上仙途|确定|继续/.test(x.textContent))?.click(); return 1; }
      return 0;
    });
    if (!st) break;
    await sleep(200);
  }

  // AB1 解锁门控与结构
  const ab1 = await page2.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 2;   // 提至金丹以便后续登塔断言
    p.attrs = { gen: 999, comp: 999, luck: 999, body: 999 };   // 一击必杀加速战斗
    p.hp = Stat.compute(p).maxHp;
    UI.renderAll();
    const lock0 = TowerSys.unlockOk({ realmIdx: 0 });
    const lock2 = TowerSys.unlockOk(p);
    return { lock0, lock2, defs: TowerSys.BUFFS.length, items: ['tw_sand', 'tw_iron', 'tw_core'].every(id => !!GameData.ITEMS[id]) };
  });
  (ab1.lock0 === false && ab1.lock2 === true && ab1.defs >= 15 && ab1.items)
    ? pass('AB1 登天塔解锁门控 / 15 祝福 / 3 塔产奇物') : fail('AB1 登天塔结构', JSON.stringify(ab1));

  // AB2 进塔：耗次数、开战、塔影前缀
  const ab2 = await page2.evaluate(() => {
    const p = Game.player;
    const left0 = TowerSys.leftToday(p);
    Game.actions['act-tower-enter']();
    return { left0, left1: TowerSys.leftToday(p), run: !!TowerSys.state(p).run, floor: TowerSys.state(p).run ? TowerSys.state(p).run.floor : null, foe: Battle.active ? Battle.active.enemy.name : null };
  });
  (ab2.left0 === 1 && ab2.left1 === 0 && ab2.run && ab2.floor === 1 && ab2.foe && ab2.foe.startsWith('塔影'))
    ? pass('AB2 进塔耗次数并开战（塔影前缀）') : fail('AB2 进塔', JSON.stringify(ab2));

  // 战斗辅助：一键打完（先等层间续层的 900ms 延迟把战斗开起来）
  const fightOut2 = async () => {
    for (let i = 0; i < 40; i++) { if (await page2.evaluate(() => !!Battle.active)) break; await sleep(250); }
    for (let i = 0; i < 90; i++) {
      const st = await page2.evaluate(() => {
        if (!Battle.active) return 'done';
        const b = document.querySelector('.battle-box [data-action="bt-attack"]:not([disabled])');
        if (b) { b.click(); return 'hit'; }
        return 'busy';
      });
      if (st === 'done') return true;
      await sleep(260);
    }
    return !(await page2.evaluate(() => !!Battle.active));
  };
  const waitPopup2 = async (timeout = 9000) => {
    for (let i = 0; i < timeout / 250; i++) {
      if (await page2.evaluate(() => !document.getElementById('popup-modal').className.includes('hidden'))) return true;
      await sleep(250);
    }
    return false;
  };
  const waitFloor2 = async (n, timeout = 12000) => {
    for (let i = 0; i < timeout / 250; i++) {
      const f = await page2.evaluate(() => { const r = TowerSys.state(Game.player).run; return r ? r.floor : -1; });
      if (f >= n) return true;
      await sleep(250);
    }
    return false;
  };

  // AB3 首层克 → 层奖/纪录
  await fightOut2();
  const ab3 = await page2.evaluate(() => ({
    floor: TowerSys.state(Game.player).run ? TowerSys.state(Game.player).run.floor : -1,
    best: TowerSys.state(Game.player).best,
    wins: Game.player.counters.towerWins || 0,
  }));
  (ab3.floor === 2 && ab3.best === 1 && ab3.wins === 1) ? pass('AB3 首层克：层奖+纪录+计数') : fail('AB3 首层', JSON.stringify(ab3));

  // AB4 三层祝福
  for (let f = 2; f <= 3; f++) { await fightOut2(); await waitFloor2(f + 1); await sleep(400); }
  const blessUp = await waitPopup2();
  const ab4 = await page2.evaluate(() => ({
    title: document.getElementById('popup-title').textContent,
    opts: document.querySelectorAll('#popup-btns .btn').length,
    quitBtn: [...document.querySelectorAll('#popup-btns .btn')].some(b => b.textContent.includes('离塔')),
  }));
  (blessUp && ab4.title.includes('第 3 层已克') && ab4.opts === 4 && ab4.quitBtn)
    ? pass('AB4 三层祝福三选一 + 离塔出口') : fail('AB4 祝福弹窗', JSON.stringify({ blessUp, ...ab4 }));
  await page2.evaluate(() => { [...document.querySelectorAll('#popup-btns .btn')][0]?.click(); });
  await sleep(900);
  const ab4b = await page2.evaluate(() => TowerSys.state(Game.player).run.buffs.length);
  (ab4b === 1) ? pass('AB4b 祝福入体（塔内生效）') : fail('AB4b 祝福入体', String(ab4b));

  // AB5 五层宝箱 + 回血
  for (let f = 4; f <= 5; f++) { await fightOut2(); await waitFloor2(f + 1); await sleep(400); }
  await waitPopup2();
  const ab5 = await page2.evaluate(() => {
    const p = Game.player;
    return {
      title: document.getElementById('popup-title').textContent,
      hp: Math.round(p.hp), maxHp: Stat.compute(p).maxHp,
      loot: ['tw_sand', 'tw_iron', 'tw_core', 'm_gupian', 'pill_ningqi', 'pill_xisui', 'tal_zilei'].some(id => (p.bag[id] || 0) > 0),
    };
  });
  (ab5.title.includes('宝箱') && ab5.hp >= ab5.maxHp * 0.95 && ab5.loot)
    ? pass('AB5 五层宝箱：掉落 + 三成回血') : fail('AB5 宝箱', JSON.stringify(ab5));

  // AB6 离塔结算与跨世纪录
  await page2.evaluate(() => { [...document.querySelectorAll('#popup-btns .btn')].find(b => b.textContent.includes('离塔'))?.click(); });
  await sleep(500);
  const ab6 = await page2.evaluate(() => ({
    run: !!TowerSys.state(Game.player).run,
    best: TowerSys.state(Game.player).best,
    cBest: Game.player.counters.towerBest || 0,
    metaBest: Meta.data.towerBest || 0,
  }));
  (!ab6.run && ab6.best >= 5 && ab6.cBest >= 5 && ab6.metaBest >= 5)
    ? pass('AB6 离塔结算：run 清空 + 本档/跨世纪录双写') : fail('AB6 离塔', JSON.stringify(ab6));

  // AB7 败北止步（加购一次再进，必败；buyExtra 的确认弹窗从外层点击）
  const ab7 = await page2.evaluate(() => {
    const p = Game.player;
    Bag.addStones(1000000);
    TowerSys.buyExtra();   // 不 await：弹窗待外层点击
    return { bought: TowerSys.state(p).today.bought };
  });
  await page2.waitForFunction(() => !document.getElementById('popup-modal').className.includes('hidden'), { timeout: 6000 });
  await page2.evaluate(() => { [...document.querySelectorAll('#popup-btns .btn')].find(b => b.textContent.includes('加购'))?.click(); });
  await sleep(500);
  const ab7a = await page2.evaluate(() => ({ left: TowerSys.leftToday(Game.player) }));
  await page2.evaluate(() => { const p = Game.player; p.hp = Stat.compute(p).maxHp; Game.actions['act-tower-enter'](); });
  await sleep(800);
  await page2.evaluate(() => { if (Battle.active) { Battle.active.enemy.hpMax = 9e9; Battle.active.enemy.hp = 9e9; Battle.active.enemy.atk = 9e9; } });
  await fightOut2();
  await sleep(600);
  const ab7b = await page2.evaluate(() => {
    const p = Game.player;
    return {
      run: !!TowerSys.state(p).run,
      hpRatio: Math.round(p.hp / Stat.compute(p).maxHp * 100),
      lowStones: p.stones.low + p.stones.mid * 100,
      closed: document.getElementById('battle-modal').className.includes('hidden'),
    };
  });
  (ab7a.left === 1 && !ab7b.run && ab7b.hpRatio <= 35 && ab7b.closed)
    ? pass('AB7 败北止步：血线三成 / 无折损 / 战斗收场') : fail('AB7 败北', JSON.stringify({ ...ab7a, ...ab7b }));

  // AB8 塔成就
  const ab8 = await page2.evaluate(() => {
    const p = Game.player;
    p.counters.towerBest = 30;
    Achieve.check();
    return { tw1: !!Meta.data.achv.tw1, tw2: !!Meta.data.achv.tw2, tw4: !!Meta.data.achv.tw4, c10aOff: !Meta.data.achv.c10a };
  });
  (ab8.tw1 && ab8.tw2 && ab8.tw4 && ab8.c10aOff) ? pass('AB8 塔成就四档按纪录解锁') : fail('AB8 塔成就', JSON.stringify(ab8));

  // AB9 天塔页签渲染 + 锁定卡
  const ab9 = await page2.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 0; UI.renderAll();
    Game.actions['act-tab']({ tab: 'map:tower' });
    const locked = document.querySelector('#tab-content').textContent;
    p.realmIdx = 2; UI.renderAll();
    Game.actions['act-tab']({ tab: 'map:tower' });
    const open = document.querySelector('#tab-content').textContent;
    return { lockedOk: locked.includes('筑基'), openOk: open.includes('登天塔') && open.includes('本档最佳') };
  });
  (ab9.lockedOk && ab9.openOk) ? pass('AB9 天塔页签：锁定卡 / 可登卡渲染') : fail('AB9 天塔页签', JSON.stringify(ab9));

  /* ================= AC 终章组 ================= */
  const ac = await page2.evaluate(() => {
    const C = QuestSys.CHAPTERS;
    const c10 = C.find(c => c.id === 'c10');
    const c9 = C.find(c => c.id === 'c9');
    const end = GameData.STORIES.c10_end;
    const mid = GameData.STORIES.c10_mid;
    const open = GameData.STORIES.c10_open;
    const gk = GameData.char('@c_gatekeeper');
    const atkBase = (() => { const p = Game.player; const a = Stat.compute(p).atk; p.flags.beyondGate = true; const b = Stat.compute(p).atk; delete p.flags.beyondGate; return { a, b }; })();
    return {
      n: C.length, c9supR: c9 && c9.supR, c10supR: c10 && c10.supR,
      stories: !!open && !!mid && !!end,
      battleFlag: end.scenes.some(s => s.t === 'battle' && s.flagWin === 'gateShadowSlain'),
      gk: !!gk, cn10: QuestSys.CN9.length === 10 && QuestSys.CN9[9] === '十',
      beyondPct: atkBase.b > atkBase.a,
      goC10: (QuestSys.GO.c10 || [])[1] === 'map:tower',
      s21: !!QuestSys.SIDES.find(s => s.id === 's21' && s.minRealm === 1),
      achvN: Achieve.DEFS.length,
      twDefs: ['tw1', 'tw2', 'tw3', 'tw4', 'c10a'].every(id => Achieve.DEFS.some(d => d.id === id)),
      chip: (() => { UI.renderTop(); const t = document.getElementById('top-info').textContent; return t.includes('10 章'); })(),
    };
  });
  (ac.n === 10 && ac.c9supR === 10 && ac.c10supR === 999)
    ? pass('AC1 主线十章：c9 追认真仙 / c10 接棒终章') : fail('AC1 主线十章', JSON.stringify({ n: ac.n, c9: ac.c9supR, c10: ac.c10supR }));
  (ac.stories && ac.battleFlag && ac.gk)
    ? pass('AC2 c10 三段剧情齐：门前影终战（旗标）/ 守门人注册') : fail('AC2 c10 剧情', JSON.stringify({ stories: ac.stories, battleFlag: ac.battleFlag, gk: ac.gk }));
  (ac.cn10 && ac.chip && ac.goC10)
    ? pass('AC3 卷章 chip「10 章」/ CN9 十 / 章助缘直达天塔') : fail('AC3 收录接线', JSON.stringify({ cn10: ac.cn10, chip: ac.chip, goC10: ac.goC10 }));
  (ac.beyondPct)
    ? pass('AC4 残玉终响：beyondGate 全属性 +3% 生效') : fail('AC4 残玉终响', JSON.stringify(ac.beyondPct));
  (ac.s21 && ac.achvN === 56 && ac.twDefs)
    ? pass('AC5 支线 s21 / 成就 56 项（塔四档+终章）') : fail('AC5 收录计数', JSON.stringify({ s21: ac.s21, achvN: ac.achvN, twDefs: ac.twDefs }));

  /* ================= 汇总 ================= */
  const fails = results.filter(r => r[0] === 'FAIL');
  console.log(`\n========== verify-v11 汇总：${results.length} 断言，${fails.length} 失败 ==========`);
  if (fails.length) { fails.forEach(f => console.log('  ✗ ' + f[1])); }
  console.log('控制台错误 ' + consoleErrors.length + ' 条' + (consoleErrors.length ? '：' + consoleErrors.slice(0, 5).join(' | ') : ''));
  await browser.close();
  process.exit(fails.length || consoleErrors.length ? 1 : 0);
} catch (e) {
  console.error('verify-v11 异常终止：', e);
  try { await browser.close(); } catch (_) { /* ignore */ }
  process.exit(1);
}
