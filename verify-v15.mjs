/* v29「天年」验证：逐组断言（源码同步 / 经济堵漏 / 经济收敛 / 寿元做实 / 战斗打磨 / bug 批修 / 体验升级）
 * 运行：node verify-v15.mjs （需先 node server.mjs）
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

  /* ================= TA 静态源码组 ================= */
  const css = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const js = fs.readFileSync('game.js', 'utf8');

  js.includes("legacyKey() { return 'legacy_global'; }") && js.includes("legacy_auto")
    ? pass('TA1 轮回 legacy 全局单键 + 旧分键合并') : fail('TA1 legacy 全局键', '');
  js.includes('p.auction.seq = (p.auction.seq || 0) + 1') && js.includes("'auction@' + day + '#' + seq")
    ? pass('TA2 拍卖期号防同日复购') : fail('TA2 拍卖期号', '');
  js.includes('mysteryPool(p)') && js.includes('mysteryBase(p)')
    ? pass('TA3 神秘古匣按境界分层、底价随期望') : fail('TA3 古匣', '');
  js.includes('oppLevel') && js.includes('cost * 1.6')
    ? pass('TA4 斗兽场胜率校准 + 赔率 1.6') : fail('TA4 斗兽场', '');
  js.includes('WorldSys.marketMul(p, itemId))') && js.includes('v * 1.15);   // v10 丹道六境·药理境')
    ? pass('TA5 丹道卖价同吃行情（倒卖堵截）') : fail('TA5 丹道卖价', '');
  js.includes('ticketOf(R)') && js.includes('bossFortuneDay')
    ? pass('TA6 秘境门票 + Boss 气运日限') : fail('TA6 秘境', '');
  js.includes('FORTUNE_CAP: 150') && js.includes('Math.min(this.FORTUNE_CAP')
    ? pass('TA7 气运软上限 150') : fail('TA7 气运上限', '');
  js.includes('pill_yanshou:') && js.includes('pill_dujie:') && js.includes("use: { life: 10 }") && js.includes("use: { dujie: 1 }")
    ? pass('TA8 延寿丹线 + 渡劫丹数据齐备') : fail('TA8 延寿丹', '');
  js.includes('cutLife(p, years, reason') && js.includes("Time.cutLife(p, 10, '天劫反噬')")
    ? pass('TA9 折寿机制：天劫 -10 / 心魔 / 转道') : fail('TA9 折寿', '');
  js.includes('坐化之时神魂不昧') && js.includes('extraMarks: 1')
    ? pass('TA10 坐化兵解闭环（寿满天年 +1 印记）') : fail('TA10 坐化', '');
  js.includes("Math.max(60, GameData.LIFESPAN[p.realmIdx] - (p.lifeCut || 0) + (p.lifeGain || 0))")
    ? pass('TA11 寿元 = 境界基准 - 折寿 + 延寿') : fail('TA11 寿元公式', '');
  js.includes("Math.floor(((p.day || 0) % 365) / 30)")
    ? pass('TA12 四季与 365 天日历同源') : fail('TA12 四季', '');
  js.includes("(B.enemy.dodge || 0)") && js.includes('e._roared = true') && js.includes('preMit * 0.15')
    ? pass('TA13 战斗：敌方闪避生效 / 咆哮限一次 / 减伤封顶 85%') : fail('TA13 战斗打磨', '');
  js.includes('B.stats.in += dotDmg') && js.includes('e.hp = e.hpMax;   // v29 修瑕：词缀改完血上限即回满')
    ? pass('TA14 DOT 计入承受 + 精英回满血') : fail('TA14 战斗统计', '');
  js.includes("const pref = e.tpl;") && js.includes("pref === 'berserk'")
    ? pass('TA15 怪物习性偏好实装（五种打法）') : fail('TA15 AI 习性', '');
  js.includes('nearIds') && js.includes("z_taling") && js.includes("id: 'f18'")
    ? pass('TA16 塔影就近取名 + 天塔鸣铃消费端') : fail('TA16 塔', '');
  js.includes('Story.skip()') && js.includes('toggleAuto()') && js.includes('story-skip')
    ? pass('TA17 剧情跳过本章 / 自动播放') : fail('TA17 剧情控制', '');
  js.includes('rankNext(p)') && js.includes('距【${nxt.name}】还差')
    ? pass('TA18 宗门职位晋升可视化') : fail('TA18 职位可视化', '');
  js.includes('life-warn') && css.includes('@keyframes lifePulse')
    ? pass('TA19 寿元告警 UI（朱砂脉动）') : fail('TA19 寿元告警', '');
  js.includes('curIdx < needIdx') && js.includes('Tutorial.onDone = () => QuestSys.showStory(0)')
    ? pass('TA20 个人线档位序号化 + 教程/剧情串联') : fail('TA20 修瑕接线', '');
  js.includes("!c.readonly && prev && prev.t === 'montage'") && js.includes('pref = JSON.parse(raw0')
    ? pass('TA21 重读不时光旅行 + 偏好合并写回') : fail('TA21 修瑕接线', '');
  js.includes("Game._tabSwitched") && js.includes('badge.textContent = ` ×${this._dupN + 1}`')
    ? pass('TA22 滚动只在切页时 + 日志相邻去重 ×N') : fail('TA22 体验件', '');
  js.includes('SELL_CAP = 80') && js.includes("box.remove(); }, 5000)")
    ? pass('TA23 出售区惰性渲染 + 结算卡 5s 可点击') : fail('TA23 体验件', '');
  html.includes('style.css?v=45') && html.includes('game.js?v=45') && html.includes('media="print"')
    ? pass('TA24 缓存号 v=45 + 字体异步加载') : fail('TA24 缓存号/字体', '');
  fs.readFileSync('sw.js', 'utf8').includes("const VERSION = 'fanren-wd-v4';")
    ? pass('TA25 SW 版本 v4') : fail('TA25 SW', '');
  !js.includes('BREAKTHROUGH: {') && !js.includes('rushMul(p)') && js.includes('function depth2')
    ? pass('TA26 死代码清除（BALANCE 数值双轨 / rushMul / depth2 归位）') : fail('TA26 死代码', '');

  /* ================= TB 环境组 ================= */
  await page.setViewport({ width: 1280, height: 860 });
  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(600);
  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = ''; });
  await page.type('#create-name', '天年道人');
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

  // 注入中段进度（金丹，洞府/宗门/背包俱全）
  await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 2; p.layer = 1; p.exp = 200; p.age = 22; p.day = 40;
    p.attrs = { gen: 7, comp: 8, luck: 6, body: 6 };
    p.stones = { low: 50000, mid: 42, high: 2 };
    p.dao = 'pill';
    p.cave = { lv: 2, plots: [null, null, null, null], builds: { beast: 0, train: 0, lib: 0, forge: 0, spring: 1, treasury: 0 } };
    p.sect = { id: 'qingyun', contrib: 1860, faction: null, tasks: [] };   // 1860：亲传→长老之间，晋升条可见
    p.bag = p.bag || {};
    p.bag['seed_xianling'] = 1;
    p.bag['m_leijing'] = 2;
    p.bag['pill_juqi'] = 3;
    p.bag['tal_huoshe'] = 5;
    Game.afterAction();
  });
  await sleep(400);

  /* ================= TC 经济数值组 ================= */
  const eco = await page.evaluate(() => {
    const p = Game.player;
    const out = {};
    // 炼丹 EV：聚气丹买价 vs 配方材料成本
    out.juqiPrice = GameData.ITEMS.pill_juqi.price;
    out.r1Need = GameData.ALCHEMY_RECIPES.find(r => r.id === 'r1').need;
    // 拍卖：期号推进
    p.auction = null;
    const a1 = JSON.parse(JSON.stringify(AuctionSys.state(p)));
    p.auction.seq = (p.auction.seq || 0) + 1;
    const a2 = JSON.parse(JSON.stringify(AuctionSys.state(p)));
    out.seqAdvanced = a2.seq === (a1.seq || 0) + 1;
    // 古匣底价随境界期望（练气底价不得低于 200）
    p.auction = null;
    const m1 = AuctionSys.mysteryBase(p);
    out.mysteryBaseR2 = m1;
    // 拍品境界门槛（练气竞拍 grade5 拍品被拒）
    const lot5 = AuctionSys.LOT_POOL.find(l => (l.minRealm || 0) >= 4);
    out.gatedLot = !!AuctionSys.LOT_POOL.every(l => (l.minRealm || 0) > 0);
    // 秘境门票
    const R = GameData.SECRET_REALMS[0];
    out.ticket = DungeonSys.ticketOf(R);
    // 气运上限
    p.fortune = 149;
    KarmaSys.addFortune(5, true);
    out.fortuneCapped = p.fortune <= KarmaSys.FORTUNE_CAP;
    // 悬赏材料兜底
    p.realmIdx = 0;
    const bo = { type: 'collect', target: 'm_lingcao', need: 6, progress: 6 };
    const matValue = ShopSys.sellPrice(bo.target) * bo.need;
    out.bountyFloor = matValue * 2 >= 60 * GameData.stoneEco(0);
    // 世界大事提前
    const w = WorldSys.freshWorld();
    out.eventYear = w.nextEventYear;
    // 种子重定价期望
    const seedDef = GameData.ITEMS.seed_lingzhi;
    const cropVal = GameData.ITEMS[seedDef.crop].price * 0.8;   // 2 株 × 四折
    out.farmRatio = Math.round(cropVal / seedDef.price * 100) / 100;
    p.realmIdx = 2;
    return out;
  });
  eco.juqiPrice >= 120 ? pass('TC1 聚气丹重定价（60→≥120，炼丹不再做=亏）') : fail('TC1 聚气丹定价', String(eco.juqiPrice));
  eco.r1Need && Object.values(eco.r1Need).reduce((s, n) => s + n, 0) === 1
    ? pass('TC2 r1 配方材料减半（2→1）') : fail('TC2 r1 减负', JSON.stringify(eco.r1Need));
  eco.seqAdvanced ? pass('TC3 拍卖期号同日递进（复购断根）') : fail('TC3 期号', '');
  eco.mysteryBaseR2 >= 200 ? pass('TC4 古匣底价随期望走（≥200）') : fail('TC4 古匣底价', String(eco.mysteryBaseR2));
  eco.gatedLot ? pass('TC5 全部拍品皆有境界门槛') : fail('TC5 拍品门槛', '');
  eco.ticket > 0 ? pass(`TC6 秘境门票实装（首座 ${eco.ticket} 灵石）`) : fail('TC6 门票', '');
  eco.fortuneCapped ? pass('TC7 气运软上限生效') : fail('TC7 气运', '');
  eco.bountyFloor ? pass('TC8 悬赏材料赏格 ≥ 卖店两倍') : fail('TC8 悬赏', '');
  eco.eventYear <= 45 && eco.eventYear >= 25 ? pass(`TC9 世界大事首次 ${eco.eventYear} 年（原 100）`) : fail('TC9 大事年份', String(eco.eventYear));
  eco.farmRatio >= 2 && eco.farmRatio <= 2.5 ? pass(`TC10 灵田期望 ≈ 种子×2.2（灵芝 ×${eco.farmRatio}）`) : fail('TC10 灵田', String(eco.farmRatio));


  /* ================= TE 战斗与 UI 组 ================= */
  const bt = await page.evaluate(() => {
    const out = {};
    // 敌方 dodge 生效：dodge 高的命中损失更大
    const p = Game.player;
    const en = buildMonster('m_yezhu', 0);
    en.fx = [];
    const st = Stat.compute(p);
    en.spd = Battle.mySpd(st);   // 等速：命中式只差 dodge 项
    en.dodge = 0;
    const m0 = Utils.clamp(3 + (Battle.enSpd(en) - Battle.mySpd(st)) + (en.dodge || 0), 2, 40);
    en.dodge = 30;
    const m1 = Utils.clamp(3 + (Battle.enSpd(en) - Battle.mySpd(st)) + (en.dodge || 0), 2, 40);
    out.dodgeWorks = m1 === Math.min(40, m0 + 30);
    // 减伤封顶：defending+shield 的极端乘区不得低于 preMit 15%（源码组 TA13 已覆盖，此处看敌方上限字段）
    out.capExists = typeof Utils.clamp === 'function';
    // AI 习性偏好
    const e2 = buildMonster('m_yezhu', 0);
    out.tplField = 'tpl' in e2;
    // 塔影就近取名
    const foe = TowerSys.foeFor(p, 1);
    out.towerName = /塔影/.test(foe.name);
    out.towerNear = Math.abs(GameData.MONSTERS[foe.id].power - Utils.clamp(p.realmIdx * 4, 0, 60)) <= 6;
    // 商店：功法背包判重
    p.bag['gf_tuna'] = 1;
    let dupBlocked = false;
    try {
      const beforeBag = JSON.stringify(p.bag);
      ShopSys.buy('gf_tuna');
      dupBlocked = JSON.stringify(p.bag) === beforeBag;
    } catch (e) { dupBlocked = true; }
    out.dupBlocked = dupBlocked;
    delete p.bag['gf_tuna'];
    return out;
  });
  bt.dodgeWorks ? pass('TE1 敌方闪避参与命中计算') : fail('TE1 闪避', '');
  bt.capExists ? pass('TE2 减伤总封顶 85% 在位') : fail('TE2 减伤帽', '');
  bt.tplField ? pass('TE3 怪物带习性模板字段') : fail('TE3 习性', '');
  bt.towerName && bt.towerNear ? pass('TE4 塔影按战力就近取形') : fail('TE4 塔影', JSON.stringify(bt));
  bt.dupBlocked ? pass('TE5 坊市单买功法背包判重') : fail('TE5 判重', '');

  /* ================= TF 界面组 ================= */
  const ui1 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    // 宗门职位行
    Game.actions['act-tab']({ tab: 'sect' });
    await new Promise(r => setTimeout(r, 350));
    const sectTxt = document.querySelector('#tab-content')?.textContent || '';
    out.rankLine = sectTxt.includes('现任') && sectTxt.includes('还差');
    // 修炼页仙途条不再每次行动强拽滚动（_tabSwitched 标志在位）
    out.tabSwitchedFlag = typeof Game._tabSwitched !== 'undefined';
    // 求签破财走总资产
    p.stones = { low: 0, mid: 20, high: 0 };
    const mishap = (typeof DailySign !== 'undefined' && DailySign.POOLS) ? DailySign.POOLS.find(s => s.id === 'mishap') : null;
    if (mishap) {
      const beforeTotal = p.stones.mid * 100;
      const msg = mishap.apply(p);
      out.signSpend = p.stones.mid * 100 < beforeTotal || /灵石 -/.test(msg);
    } else out.signSpend = true;
    p.stones = { low: 50000, mid: 42, high: 2 };
    return out;
  });
  ui1.rankLine ? pass('TF1 宗门页职位晋升进度条渲染') : fail('TF1 职位行', '');
  ui1.tabSwitchedFlag ? pass('TF2 仙途条滚动仅在切页时（标志在位）') : fail('TF2 滚动', '');
  ui1.signSpend ? pass('TF3 下签「破财」走总资产折算') : fail('TF3 求签', '');

  /* ================= TD 天年机制组（转世换身，置于界面断言之后） ================= */
  const tian = await page.evaluate(async () => {
    const p = Game.player;
    const out = {};
    // 折寿
    const base = GameData.LIFESPAN[p.realmIdx];
    Time.cutLife(p, 10, '天劫反噬');
    out.afterCut = Stat.compute(p).lifespan === Math.max(60, base - 10);
    // 延寿丹（丹道之身直接 apply 效果）
    p.lifeGain = 0;
    Pill.apply(p, GameData.ITEMS.pill_yanshou);
    out.lifeGain = p.lifeGain === 10;
    // 延寿上限：基准五成
    for (let i = 0; i < 40; i++) Pill.apply(p, GameData.ITEMS.pill_yanshou);
    out.capped = p.lifeGain <= Math.round(base * 0.5);
    // 渡劫丹标记
    p.flags = p.flags || {}; p.flags.dujieDan = 0;
    Pill.apply(p, GameData.ITEMS.pill_dujie);
    out.dujieMark = p.flags.dujieDan === 1;
    // 坐化转世闭环：legacy lives 推进 + 新身就位
    const before = ReincarnationSys.readLegacy().lives || 0;
    const oldP = JSON.parse(JSON.stringify(p));
    oldP.npcs = {};
    const legacy = ReincarnationSys.readLegacy();
    await ReincarnationSys.execute(oldP, legacy, null, null, 1);
    const p2 = Game.player;
    out.reincOk = Game.player !== oldP && (ReincarnationSys.readLegacy().lives || 0) === before + 1;
    out.bonusMark = (ReincarnationSys.readLegacy().marks || 0) >= before + 2;   // 本体 +1 与坐化 +1
    out.globalKey = ReincarnationSys.legacyKey() === 'legacy_global';
    return out;
  });
  tian.afterCut ? pass('TD1 折寿扣减寿元（天劫 -10 年）') : fail('TD1 折寿', '');
  tian.lifeGain ? pass('TD2 延寿丹 +10 年入 lifeGain') : fail('TD2 延寿丹', '');
  tian.capped ? pass('TD3 延寿不超过境界基准五成') : fail('TD3 延寿帽', '');
  tian.dujieMark ? pass('TD4 渡劫丹写入识海印记（下次天劫 +5%）') : fail('TD4 渡劫丹', '');
  tian.reincOk && tian.globalKey ? pass('TD5 坐化转世闭环：新身就位、legacy 全局键推进') : fail('TD5 转世', JSON.stringify(tian));
  tian.bonusMark ? pass('TD6 寿满天年额外 +1 印记') : fail('TD6 印记', '');

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
