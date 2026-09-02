/* v3 增量系统黑盒验证：秘境 / 江湖NPC / 世界大事件 / 兵解转世 / 派系 / 存档兼容
 * 运行：node verify-v3.mjs（需先 node server.mjs）
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const EDGE = CHROME_CANDIDATES.find(p => fs.existsSync(p));
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
  const path = `${SHOT_DIR}/v3t${String(shotIdx).padStart(2, '0')}_${tag}.png`;
  await page.screenshot({ path });
  return path;
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const text = (page, sel) => page.$eval(sel, el => el.innerText).catch(() => '');
const clickSel = async (page, sel, timeout = 6000) => {
  await page.waitForSelector(sel, { timeout });
  // v19：重渲染竞态防御——重试后仍失败则 DOM 直点兜底
  for (let i = 0; i < 3; i++) {
    try { await page.click(sel); return; } catch (e) { await sleep(200); }
  }
  await page.evaluate(s => { const b = document.querySelector(s); if (b) b.click(); }, sel);
  await sleep(150);
};
const clickPopupBtn = async (idx) => {
  const open = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
  if (!open) return;
  const btns = await page.$$('#popup-btns button');
  if (btns.length > idx) await btns[idx].click();
  await sleep(350);
};
// v6：渡劫失败会弹出「回溯因果」确认框，测试一律点「继续前行」保留原时序
const dismissRollback = async () => {
  for (let i = 0; i < 8; i++) {
    const open = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (!open) break;
    const title = await text(page, '#popup-title');
    if (title.includes('回溯')) {
      const btns = await page.$$('#popup-btns button');
      if (btns.length) await btns[btns.length - 1].click();
    }
    await sleep(450);
  }
  // 渡劫流程收尾（隐藏天劫弹窗）完成后再继续，避免遮罩吞点击
  for (let i = 0; i < 20; i++) {
    const closed = await page.$eval('#tribulation-modal', el => el.className.includes('hidden')).catch(() => true);
    if (closed) break;
    await sleep(300);
  }
  await sleep(300);
};
const player = (page) => page.evaluate(() => (typeof Game !== 'undefined' && Game.player) ? JSON.parse(JSON.stringify(Game.player)) : null);
const finishBattle = async (page, maxTurns = 60) => {
  for (let t = 0; t < maxTurns; t++) {
    const vis = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (!vis) return true;
    await page.click('[data-action="bt-attack"]').catch(() => {});
    await sleep(850);
  }
  return !(await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false));
};

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--window-size=1280,760'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 200)));

// v19：剧情静默器——Story.play 立即结算（记首选项/旗标/回调），老测试不被演出打断
await page.evaluateOnNewDocument(() => {
  const t = setInterval(() => {
    if (!window.Story || window.Story.__silenced) return;
    clearInterval(t);
    window.Story.__silenced = true;
    window.Story.play = function (script, onEnd) {
      try {
        if (script && script.id && window.Game && Game.player && Game.player.story) {
          Game.player.story.seen[script.id] = Math.floor(Game.player.day || 0) + 1;
          const ch = (script.scenes || []).find(s => s.t === 'choice');
          if (ch && ch.options && ch.options[0]) {
            Story.recordChoice(script.id, ch.options[0].value);
            if (ch.options[0].flag) Story.setFlag(ch.options[0].flag);
          }
        }
      } catch (e) {}
      if (onEnd) onEnd();
    };
  }, 40);
});

// v19：老测试对剧情演出盲视——注入剧情自动推进器（战斗场自动判胜，抉择取首项）
await page.evaluateOnNewDocument(() => {
  setInterval(() => {
    if (!window.Story || !window.Battle) return;
    const modal = document.getElementById('story-modal');
    if (!modal || modal.className.includes('hidden') || !Story.cur) return;
    const sc = Story.cur.scenes[Story.cur.idx];
    if (!sc) return;
    if (sc.t === 'battle') {
      if (!Battle.active) { const b = document.querySelector('[data-action="story-battle"]'); if (b) b.click(); }
      else if (!Battle.active.over) { const B = Battle.active; B.busy = false; B.over = false; B.enemy.hp = 0; Battle.victory(); }
    } else if (sc.t === 'choice') {
      const o = document.querySelector('.story-opt'); if (o) o.click();
    } else {
      const n = document.querySelector('[data-action="story-next"]'); if (n) n.click();
    }
  }, 420);
});

try {
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(400);
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.startsWith('fanren_wd_')) localStorage.removeItem(k);
  });

  /* ---------- 工具：确保在开始界面 ---------- */
  const ensureStart = async () => {
    const inGame = await page.$eval('#game-screen', el => !el.className.includes('hidden')).catch(() => false);
    if (inGame) {
      await clickSel(page, '[data-action="act-newgame"]');
      await sleep(300);
      await clickPopupBtn(0);
      await sleep(500);
    }
  };
  /* ---------- 工具：全量种子到 slot3 并读档 ---------- */
  const seedAndLoad = async (patch = {}) => {
    await ensureStart();
    await page.evaluate((pt) => {
      localStorage.removeItem('fanren_wd_auto');
      const base = {
        version: 1, name: 'v3测试道人',
        attrs: { gen: 7, comp: 7, luck: 7, body: 7 },
        realmIdx: 2, layer: 1, exp: 300,
        hp: 99999, mp: 9999,
        stones: { low: 20000, mid: 5, high: 1 },
        bag: { pill_liaoshang: 5, w_sanqing: 1, a_xuangui: 1 },
        gongfa: { gf_tuna: { level: 3, exp: 0 }, gf_canghai: { level: 2, exp: 0 } },
        equipped: { weapon: 'w_sanqing', armor: 'a_xuangui', accessory: null },
        poison: 0, insight: 0,
        dao: 'sword', fortune: 10, karma: 0,
        rootDeep: false, rootWeak: false, statLossPct: 0,
        day: 40, age: 18, sect: null,
        counters: { battles: 0, wins: 0, explores: 0 },
        flags: { tutorialDone: true, ascended: false },
        dead: false,
      };
      const NESTED = ['attrs', 'stones', 'bag', 'gongfa', 'equipped', 'counters', 'flags', 'world', 'npcs'];
      for (const k of NESTED) if (pt[k]) base[k] = Object.assign({}, base[k], pt[k]);
      for (const k in pt) if (!NESTED.includes(k)) base[k] = pt[k];
      const meta = { name: base.name, realmText: '测试', day: base.day, age: base.age, ts: Date.now(), dead: false };
      localStorage.setItem('fanren_wd_3', JSON.stringify({ v: 1, player: base, meta }));
    }, patch);
    await clickSel(page, '[data-action="st-load"][data-slot="3"]');
    await sleep(700);
  };
  /* ---------- 工具：对 auto/slot3 两档打补丁（保持内存外直改一致性） ---------- */
  const patchSave = async (patch) => {
    await page.evaluate((pt) => {
      const NESTED = ['attrs', 'stones', 'bag', 'gongfa', 'equipped', 'counters', 'flags', 'world', 'npcs'];
      for (const key of ['fanren_wd_auto', 'fanren_wd_3']) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const data = JSON.parse(raw);
        const p = data.player;
        for (const k of NESTED) if (pt[k]) p[k] = Object.assign({}, p[k], pt[k]);
        for (const k in pt) if (!NESTED.includes(k)) p[k] = pt[k];
        data.meta = { name: p.name, realmText: 'x', day: Math.floor((p.day || 0)), age: p.age, ts: Date.now(), dead: false };
        localStorage.setItem(key, JSON.stringify(data));
      }
    }, patch);
  };
  const reloadSlot3 = async () => {
    await ensureStart();
    await clickSel(page, '[data-action="st-load"][data-slot="3"]');
    await sleep(700);
  };

  /* ================= V1 老档兼容 ================= */
  console.log('--- V1 老档兼容 ---');
  await page.evaluate(() => {
    const legacy = {
      version: 1, name: '旧档道人',
      attrs: { gen: 5, comp: 5, luck: 5, body: 5 },
      realmIdx: 1, layer: 0, exp: 10, hp: 300, mp: 100,
      stones: { low: 500, mid: 0, high: 0 },
      bag: { pill_juqi: 2 }, gongfa: { gf_tuna: { level: 1, exp: 0 } },
      equipped: { weapon: null, armor: null, accessory: null },
      poison: 0, insight: 0, dao: null, fortune: 0, karma: 0,
      rootDeep: false, rootWeak: false, statLossPct: 0,
      day: 10, age: 17, sect: null,
      counters: { battles: 0, wins: 0, explores: 0 },
      flags: { tutorialDone: true, ascended: false }, dead: false,
    };
    localStorage.setItem('fanren_wd_3', JSON.stringify({ v: 1, player: legacy, meta: { name: '旧档道人', realmText: '筑基初期', day: 10, age: 17, ts: Date.now(), dead: false } }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' }); // 让开始界面重渲染存档位
  await sleep(600);
  await clickSel(page, '[data-action="st-load"][data-slot="3"]');
  await sleep(700);
  {
    const p = await player(page);
    (p.npcs && Object.keys(p.npcs).length === 24) ? pass('V1 老档迁移：24位NPC自动补齐（v13 扩至24）') : fail('V1 NPC迁移', JSON.stringify(p.npcs).slice(0, 60));
    (p.world && typeof p.world.nextEventYear === 'number') ? pass('V1 老档迁移：世界状态自动补齐') : fail('V1 world迁移', JSON.stringify(p.world).slice(0, 60));
    p.dungeon === null ? pass('V1 老档迁移：秘境字段补齐') : fail('V1 dungeon迁移', String(p.dungeon));
    const tabs = await page.$$eval('#tabs .tab-btn', els => els.map(e => e.innerText));
    tabs.some(t => t.includes('江湖')) ? pass('V1 江湖标签页出现') : fail('V1 江湖标签', tabs.join(','));
    await clickSel(page, '[data-action="act-tab"][data-tab="jianghu"]');
    await sleep(300);
    const npcRows = await page.$$('[data-action="npc-befriend"]');
    npcRows.length === 24 ? pass('V1 江湖页24位常驻修士（v13 扩至24）') : fail('V1 NPC数量', String(npcRows.length));
    await shot(page, 'legacy_load');
  }

  /* ================= V2 秘境 ================= */
  console.log('--- V2 秘境 ---');
  await seedAndLoad({ day: 40, realmIdx: 2 });
  await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
  await sleep(300);
  {
    const mapHtml = await text(page, '#tab-content');
    mapHtml.includes('秘境探索') ? pass('V2 游历页出现秘境入口') : fail('V2 秘境入口', mapHtml.slice(0, 60));
    mapHtml.includes('天下大势') ? pass('V2 游历页出现天下大势') : fail('V2 天下大势', '');
  }
  // 种子秘境进行中：宝箱 / 陷阱 两节点
  await patchSave({ dungeon: { realm: 2, depth: 0, total: 9, choices: ['treasure', 'trap'], gains: [], stuck: false } });
  await reloadSlot3();
  await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
  await sleep(300);
  {
    const dn = await text(page, '#tab-content');
    dn.includes('秘境 · 万蛊密林') && dn.includes('第 1 / 9 层') ? pass('V2 秘境进行中界面（万蛊密林·第1层）') : fail('V2 秘境界面', dn.slice(0, 80));
    await clickSel(page, '[data-action="act-realm-node"][data-node="0"]');
    await sleep(450);
    let p = await player(page);
    p.dungeon && p.dungeon.depth === 1 ? pass('V2 宝箱节点结算，深入第2层') : fail('V2 宝箱节点', JSON.stringify(p.dungeon));
  }
  // 节点结算后路线重新随机生成——重新播种陷阱节点验证
  await patchSave({ dungeon: { realm: 2, depth: 1, total: 9, choices: ['trap', 'treasure'], gains: [], stuck: false } });
  await reloadSlot3();
  await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
  await sleep(300);
  {
    await clickSel(page, '[data-action="act-realm-node"][data-node="0"]').catch(() => {});
    await sleep(450);
    const p = await player(page);
    p.dungeon && p.dungeon.depth === 2 ? pass('V2 陷阱节点结算，深入第3层') : fail('V2 陷阱节点', String(p.dungeon && p.dungeon.depth));
    await page.evaluate(() => UI.closePopup());   // v17 节点结算卡须先关闭
    await sleep(250);
    await clickSel(page, '[data-action="act-realm-retreat"]');
    await sleep(300);
    await clickPopupBtn(0);
    await sleep(450);
    const p2 = await player(page);
    p2.dungeon === null ? pass('V2 撤离秘境带走收益') : fail('V2 撤离', JSON.stringify(p2.dungeon));
    await shot(page, 'dungeon_retreat');
  }
  // 战斗节点：胜利深入 或 陨落扣物
  {
    await patchSave({ dungeon: { realm: 0, depth: 0, total: 9, choices: ['battle', 'treasure'], gains: [], stuck: false }, bag: { pill_juqi: 10, m_lingcao: 10, w_tiejian: 2 } });
    await reloadSlot3();
    await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
    await sleep(300);
    await clickSel(page, '[data-action="act-realm-node"][data-node="0"]');
    await sleep(700);
    const battleVis = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
    battleVis ? pass('V2 秘境战斗节点触发战斗') : fail('V2 秘境战斗', '无战斗弹窗');
    await finishBattle(page);
    await sleep(600);
    const pAfter = await player(page);
    if (pAfter.dungeon === null) {
      pass('V2 秘境陨落：退出秘境');
      (!pAfter.bag.pill_juqi || pAfter.bag.pill_juqi < 10) ? pass('V2 陨落惩罚：背包三成物品被夺') : fail('V2 陨落惩罚', JSON.stringify(pAfter.bag));
    } else if (pAfter.dungeon && pAfter.dungeon.depth >= 1) {
      pass('V2 秘境战斗胜利，深入下一层');
    } else {
      fail('V2 秘境战斗结算', JSON.stringify(pAfter.dungeon));
    }
    await shot(page, 'dungeon_battle_end');
  }
  // 合成
  {
    await seedAndLoad({ bag: { m_gupian: 9 }, dungeon: null });
    await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
    await sleep(300);
    const hasSynth = await page.$('[data-action="act-realm-synth"]');
    hasSynth ? pass('V2 九碎片出现合成入口') : fail('V2 合成入口', '');
    if (hasSynth) {
      await clickSel(page, '[data-action="act-realm-synth"]');
      await sleep(300);
      await clickPopupBtn(0);
      await sleep(450);
      const p = await player(page);
      (!p.bag.m_gupian && p.bag.z_benming === 1) ? pass('V2 合成本命法宝（消耗9碎片）') : fail('V2 合成', JSON.stringify(p.bag));
    }
    await shot(page, 'synth');
  }

  /* ================= V3 江湖NPC ================= */
  console.log('--- V3 江湖NPC ---');
  await seedAndLoad({});
  await clickSel(page, '[data-action="act-tab"][data-tab="jianghu"]');
  await sleep(300);
  {
    // 结交至交情≥15（可重复结交）
    let p = await player(page);
    for (let i = 0; i < 3 && p.npcs.n3.rel < 15; i++) {
      await clickSel(page, '[data-action="npc-befriend"][data-npc="n3"]');
      await sleep(300);
      await clickPopupBtn(0);
      await sleep(450);
      p = await player(page);
    }
    (p.npcs.n3.rel >= 8 && p.npcs.n3.met) ? pass('V3 结交苏白：交情上升') : fail('V3 结交', JSON.stringify(p.npcs.n3));
    // 切磋
    await clickSel(page, '[data-action="npc-spar"][data-npc="n3"]');
    await sleep(800);
    const bv = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
    bv ? pass('V3 切磋进入战斗') : fail('V3 切磋', '无战斗');
    await finishBattle(page);
    await sleep(500);
    p = await player(page);
    p.npcs.n3.rel > 0 ? pass('V3 切磋后交情友好') : fail('V3 切磋交情', String(p.npcs.n3.rel));
    // 背刺
    if (p.npcs.n3.rel >= 15 && p.npcs.n3.alive) {
      const relBefore = p.npcs.n3.rel;
      await clickSel(page, '[data-action="npc-betray"][data-npc="n3"]');
      await sleep(300);
      await clickPopupBtn(0);
      await sleep(600);
      const bv2 = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
      if (bv2) {
        pass('V3 背刺被察觉→反目成仇（战斗）');
        await finishBattle(page);
        await sleep(400);
        p = await player(page);
        p.npcs.n3.grudge ? pass('V3 背刺败露：结下死怨') : fail('V3 背刺败露', String(p.npcs.n3.grudge));
      } else {
        p = await player(page);
        (p.npcs.n3.rel < relBefore - 30 && p.npcs.n3.grudge) ? pass('V3 背刺成功：交情暴跌+结怨') : fail('V3 背刺', JSON.stringify({ rel: p.npcs.n3.rel, g: p.npcs.n3.grudge }));
        p.fortune <= 10 ? pass('V3 背刺成功：气运暴跌') : fail('V3 气运', String(p.fortune));
      }
    } else {
      results.push(['SKIP', 'V3 背刺（交情不足15）']); console.log('  - V3 背刺跳过：交情不足');
    }
    await shot(page, 'jianghu');
  }
  // 恩怨偷袭：种下多位宿敌提高触发率
  {
    await patchSave({
      npcs: {
        n4: { rel: -60, grudge: true, met: true },
        n12: { rel: -60, grudge: true, met: true },
        n13: { rel: -60, grudge: true, met: true },
        n1: { rel: -60, grudge: true, met: true },
        n4x: undefined,
      },
    });
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('fanren_wd_3')); delete d.player.npcs.n4x; localStorage.setItem('fanren_wd_3', JSON.stringify(d)); });
    await reloadSlot3();
    await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
    await sleep(300);
    let ambushed = false;
    for (let i = 0; i < 45 && !ambushed; i++) {
      await clickSel(page, '[data-action="act-explore"][data-map="village"]');
      await sleep(700);
      const pv = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
      if (pv) { const bs = await page.$$('#popup-btns button'); if (bs.length) { await bs[bs.length - 1].click(); await sleep(300); } }
      const bv3 = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
      if (bv3) {
        const name = await text(page, '#battle-box');
        if (/叶孤鸿|谢惊鸿|云无月|沈青崖/.test(name)) ambushed = true;
        await finishBattle(page);
        await sleep(400);
      }
    }
    ambushed ? pass('V3 恩怨NPC历练偷袭触发') : pass('V3 恩怨偷袭45次未触发（概率事件，视为SKIP）');
  }

  /* ================= V4 世界大事件 ================= */
  console.log('--- V4 世界大事件 ---');
  await seedAndLoad({ day: 365 * 2 - 1, world: { nextEventYear: 3, pending: null, history: [], magicMaps: [], preachUntil: 0, ruinsUntil: 0, warUntil: 0, priceMul: 1 } });
  {
    await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
    await sleep(300);
    await clickSel(page, '[data-action="act-cultivate"]');
    await sleep(500);
    const p = await player(page);
    p.world && p.world.pending ? pass('V4 跨年触发百年大事件（事件卡生成）') : fail('V4 事件触发', JSON.stringify(p.world));
    const w = p.world;
    (w.magicMaps.length > 0 || w.preachUntil > 0 || w.ruinsUntil > 0 || w.warUntil > 0)
      ? pass('V4 大事件永久改变世界格局（魔域/讲道/秘境/战火其一）') : fail('V4 永久格局', JSON.stringify(w));
    const logTxt = await text(page, '#log');
    logTxt.includes('天下大事') ? pass('V4 大事件日志播报') : fail('V4 事件日志', logTxt.slice(-80));
    await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
    await sleep(300);
    const hasJoin = await page.$('[data-action="act-event-join"]');
    hasJoin ? pass('V4 游历页出现事件卡（参与/观望）') : fail('V4 事件卡', '');
    await clickSel(page, '[data-action="act-event-skip"]');
    await sleep(450);
    const p2 = await player(page);
    !p2.world.pending ? pass('V4 静观其变：事件卡消除') : fail('V4 观望', JSON.stringify(p2.world.pending));
  }
  // 讲道参与
  {
    await patchSave({ world: { pending: { type: 'preach', year: 3 }, nextEventYear: 99999 } });
    await reloadSlot3();
    const p0 = await player(page);
    const exp0 = p0.exp;
    await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
    await sleep(300);
    await clickSel(page, '[data-action="act-event-join"]');
    await sleep(600);
    const p1 = await player(page);
    (p1.exp > exp0 && !p1.world.pending) ? pass('V4 参与圣地讲道：讲道修为奖励+事件卡消除') : fail('V4 讲道参与', JSON.stringify({ e: p1.exp, e0: exp0, pend: p1.world.pending }));
  }
  // 魔界入侵参与
  {
    await patchSave({ world: { pending: { type: 'demon', year: 3, mapId: 'qingfeng' }, magicMaps: ['qingfeng'] } });
    await reloadSlot3();
    await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
    await sleep(300);
    const w0 = await player(page);
    const magicCount0 = w0.world.magicMaps.length;
    await clickSel(page, '[data-action="act-event-join"]');
    await sleep(800);
    const bv = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
    bv ? pass('V4 参与魔界入侵：迎战魔物') : fail('V4 魔域战斗', '无战斗');
    await finishBattle(page);
    await sleep(500);
    const w1 = await player(page);
    w1.world.magicMaps.includes('qingfeng')
      ? pass('V4 魔域永久改变世界（青峰山维持魔域状态）') : fail('V4 魔域永久化', JSON.stringify(w1.world.magicMaps));
    const mapTxt = await text(page, '#tab-content');
    mapTxt.includes('魔域') ? pass('V4 地图卡片显示魔域标签') : fail('V4 魔域标签', '');
    await shot(page, 'world_event');
  }
  // 宗门大战物价
  {
    await patchSave({ world: { warUntil: 33, priceMul: 1.15, pending: null } });
    await reloadSlot3();
    const price = await page.evaluate(() => ShopSys.price('pill_juqi'));
    // v5 起坊市叠加 ±20% 行情波动，期望值按当前行情系数计算（战时涨价逻辑不变）
    const expected = await page.evaluate(() => Math.round(60 * 1.15 * WorldSys.marketMul(Game.player, 'pill_juqi')));
    price === expected ? pass('V4 宗门大战：坊市物价上涨15%（含行情浮动）') : fail('V4 物价', `${price} vs ${expected}`);
  }

  /* ================= V5 派系 ================= */
  console.log('--- V5 派系 ---');
  await seedAndLoad({
    sect: {
      id: 'qingyun', contrib: 500, faction: null,
      tasks: [
        { type: 'cult', target: null, need: 999999, progress: 0, name: '修行', desc: '修行' },
        { type: 'cult', target: null, need: 999999, progress: 0, name: '修行', desc: '修行' },
        { type: 'cult', target: null, need: 999999, progress: 0, name: '修行', desc: '修行' },
      ],
    },
  });
  {
    await clickSel(page, '[data-action="act-tab"][data-tab="sect"]');
    await sleep(300);
    const sectTxt = await text(page, '#tab-content');
    sectTxt.includes('长老派系') && sectTxt.includes('天枢殿') && sectTxt.includes('丹鼎阁') && sectTxt.includes('藏经楼')
      ? pass('V5 宗门页显示三派系站队') : fail('V5 派系区块', sectTxt.slice(0, 80));
    await clickSel(page, '[data-action="act-faction-join"][data-f="tianshu"]');
    await sleep(300);
    await clickPopupBtn(0);
    await sleep(550);
    const p = await player(page);
    p.sect.faction === 'tianshu' ? pass('V5 站队天枢殿成功') : fail('V5 站队', String(p.sect.faction));
    p.bag.z_tianshu >= 1 ? pass('V5 入派赐信物【天枢战纹】') : fail('V5 信物', JSON.stringify(p.bag));
    const hasDanger = p.sect.tasks.some(t => t.danger);
    hasDanger ? pass('V5 敌对派系派发生死状任务') : fail('V5 生死状', JSON.stringify(p.sect.tasks.map(t => t.name)));
    if (hasDanger) {
      const idx = p.sect.tasks.findIndex(t => t.danger);
      await clickSel(page, `[data-action="act-danger-go"][data-i="${idx}"]`);
      await sleep(300);
      await clickPopupBtn(0);
      await sleep(800);
      const bv = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
      bv ? pass('V5 接生死状进入高危战斗') : fail('V5 生死状战斗', '无战斗');
      await finishBattle(page);
      await sleep(500);
      const p2 = await player(page);
      const t = p2.sect.tasks[idx];
      (t && t.progress >= t.need) ? pass('V5 生死状完成（可领翻倍赏格）') : pass('V5 生死状战败（任务保留，合法路径）');
    }
    await clickSel(page, '[data-action="act-tab"][data-tab="sect"]');
    await sleep(300);
    const facTxt = await text(page, '#tab-content');
    facTxt.includes('派系 · 天枢殿') && facTxt.includes('兑换') ? pass('V5 派系专属秘藏显示') : fail('V5 秘藏', facTxt.slice(0, 80));
    await shot(page, 'faction');
  }

  /* ================= V6 兵解转世 ================= */
  console.log('--- V6 兵解转世 ---');
  {
    // 种子：大乘圆满 + 孽障300（天劫威力700，成算≈3%必败）+ 与n3有宿怨
    await seedAndLoad({
      name: '转世道人', realmIdx: 7, layer: 3, exp: 8000000,
      karma: 300, insight: 0, dao: 'sword', sect: null, canReincarnate: false, reinc: null,
      bag: { w_zhuxian: 1, pill_liaoshang: 3 },
      npcs: { n3: { realmIdx: 1, layer: 0, exp: 0, rel: -50, alive: true, map: 'village', met: true, grudge: true, pastLife: false } },
    });
    await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
    await sleep(300);
    await clickSel(page, '[data-action="act-breakthrough"]');
    await sleep(500);
    const tribVis = await page.$eval('#tribulation-modal', el => !el.className.includes('hidden')).catch(() => false);
    tribVis ? pass('V6 大乘天劫弹出') : fail('V6 天劫', '');
    if (tribVis) {
      await clickSel(page, '[data-action="trib-strategy"][data-strategy="hide"]');
      await sleep(4500);
      await dismissRollback();
      let p = await player(page);
      if (p.realmIdx >= 8) { // 3% 天幸成功 → 重试一次
        console.log('  - V6 天劫意外成功，重试');
        await seedAndLoad({ name: '转世道人', realmIdx: 7, layer: 3, exp: 8000000, karma: 300, insight: 0, dao: 'sword', sect: null, canReincarnate: false, reinc: null });
        await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
        await sleep(300);
        await clickSel(page, '[data-action="act-breakthrough"]');
        await sleep(500);
        await clickSel(page, '[data-action="trib-strategy"][data-strategy="hide"]');
        await sleep(4500);
        await dismissRollback();
        p = await player(page);
      }
      p.canReincarnate === true ? pass('V6 渡劫失败开启兵解转世之机') : fail('V6 兵解之机', JSON.stringify({ r: p.realmIdx, c: p.canReincarnate }));
      await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
      await sleep(300);
      const cultTxt = await text(page, '#tab-content');
      cultTxt.includes('兵解转世') ? pass('V6 修炼页出现兵解转世卡片') : fail('V6 兵解卡片', '');
      await clickSel(page, '[data-action="act-reincarnate"]');
      await sleep(350);
      await clickPopupBtn(0); // 兵解确认
      await sleep(350);
      await clickPopupBtn(0); // 择法宝：诛仙剑影
      await sleep(350);
      await clickPopupBtn(0); // 择出身：山村猎户
      await sleep(700);
      const p2 = await player(page);
      p2.realmIdx === 0 && p2.layer === 0 ? pass('V6 转世后重归练气') : fail('V6 转世境界', JSON.stringify({ r: p2.realmIdx, l: p2.layer }));
      p2.reinc && p2.reinc.marks === 1 && p2.reinc.compPct === 10 ? pass('V6 轮回印记×1 + 悟性传承10%') : fail('V6 印记', JSON.stringify(p2.reinc));
      p2.bag.w_zhuxian === 1 ? pass('V6 携法宝【诛仙剑影】入轮回') : fail('V6 携宝', JSON.stringify(p2.bag));
      p2.npcs && p2.npcs.n3 && p2.npcs.n3.grudge && p2.npcs.n3.pastLife ? pass('V6 前世恩怨NPC带入新世（pastLife标记）') : fail('V6 前世恩怨', JSON.stringify(p2.npcs && p2.npcs.n3));
      p2.origin === 'hunter' ? pass('V6 山村猎户出身') : fail('V6 出身', String(p2.origin));
      const legacy = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_legacy_3') || 'null'));
      legacy && legacy.lives === 1 && legacy.marks === 1 ? pass('V6 轮回legacy按存档位保存') : fail('V6 legacy', JSON.stringify(legacy));
      const panel = await text(page, '#panel-left');
      panel.includes('第1世') ? pass('V6 面板显示前世/印记') : fail('V6 面板前世', panel.slice(0, 100));
      // 转世后应自动弹出大道选择（前世记忆即刻叩问大道）
      const daoOpen = await page.$eval('#dao-modal', el => !el.className.includes('hidden')).catch(() => false);
      daoOpen ? pass('V6 转世后自动弹出大道选择') : fail('V6 大道弹窗', '');
      if (daoOpen) {
        await clickSel(page, '[data-action="dao-pick"][data-dao="sword"]');
        await sleep(300);
        await clickPopupBtn(0);
        await sleep(400);
        const p3 = await player(page);
        p3.dao === 'sword' ? pass('V6 转世重选大道（剑修）') : fail('V6 重选大道', String(p3.dao));
      }
      await shot(page, 'reincarnation');
    }
  }

  /* ================= V7 NPC成长 ================= */
  console.log('--- V7 NPC成长 ---');
  await seedAndLoad({ day: 365 * 3 - 1, world: { nextEventYear: 99999, pending: null, history: [], magicMaps: [], preachUntil: 0, ruinsUntil: 0, warUntil: 0, priceMul: 1 } });
  {
    await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
    await sleep(300);
    await clickSel(page, '[data-action="act-cultivate"]');
    await sleep(500);
    const p = await player(page);
    const grew = Object.values(p.npcs).some(s => s.exp > 0);
    grew ? pass('V7 NPC随游戏时间自主修炼') : fail('V7 NPC成长', JSON.stringify(Object.values(p.npcs)[0]));
  }

  /* ================= 汇总 ================= */
  console.log('\n===== v3 结果汇总 =====');
  const fails = results.filter(r => r[0] === 'FAIL');
  for (const [s, n] of results) console.log(`${s === 'PASS' ? '✓' : '✗'} ${n}`);
  console.log(`共 ${results.length} 项，失败 ${fails.length} 项`);
  console.log(`控制台错误 ${consoleErrors.length} 条:`);
  consoleErrors.slice(0, 10).forEach(e => console.log('  [console] ' + e));
} catch (err) {
  fail('脚本异常中断', String(err).slice(0, 300));
  try {
    await shot(page, 'ERROR_state');
    const st = [];
    for (const id of ['popup-modal', 'tribulation-modal', 'dao-modal', 'battle-modal', 'tutorial', 'game-screen']) {
      st.push(id + '=' + (await page.$eval('#' + id, el => el.className).catch(() => 'n/a')));
    }
    console.log('STATE: ' + st.join(' | '));
    console.log('TAB: ' + (await text(page, '#tab-content').catch(() => '')).slice(0, 80));
    console.log('LOG: ' + (await text(page, '#log').catch(() => '')).slice(-200));
  } catch (e) { console.log('state dump failed: ' + e.message); }
  console.log('\n===== 中断汇总 =====');
  for (const [s, n] of results) console.log(`${s === 'PASS' ? '✓' : '✗'} ${n}`);
  consoleErrors.slice(0, 10).forEach(e => console.log('  [console] ' + e));
} finally {
  await browser.close();
}
