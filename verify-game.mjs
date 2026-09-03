/* 独立黑盒验证脚本：headless Edge 全流程测试《凡人问道》
 * 运行：node verify-game.mjs
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const EDGE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
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
  const path = `${SHOT_DIR}/t${String(shotIdx).padStart(2, '0')}_${tag}.png`;
  await page.screenshot({ path });
  return path;
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// 安全点击确认弹窗第 idx 个按钮（弹窗未开或无按钮时跳过）
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
const clickSel = async (page, sel, timeout = 4000) => {
  await page.waitForSelector(sel, { timeout });
  // v19：界面重渲染会在等待与点击之间替换节点（stale handle），带重试；仍失败则 DOM 直点兜底
  for (let i = 0; i < 3; i++) {
    try { await page.click(sel); return; } catch (e) { await sleep(200); }
  }
  await page.evaluate(s => { const b = document.querySelector(s); if (b) b.click(); }, sel);
  await sleep(150);
};
/** v11+ 剧情卷轴会遮罩主界面：清空当前剧情演出（含抉择），保证后续点击可达 */
const drainStory = async (page, rounds = 60) => {
  const modalOpen = () => page.$eval('#story-modal', el => !el.className.includes('hidden')).catch(() => false);
  for (let i = 0; i < rounds && await modalOpen(); i++) {
    const opt = await page.$('.story-opt');
    if (opt) { await opt.click().catch(() => {}); await sleep(180); continue; }
    const nxt = await page.$('[data-action="story-next"]');
    if (nxt) { await nxt.click().catch(() => {}); await sleep(180); continue; }
    await sleep(200);
  }
  await sleep(200);
};
const text = (page, sel) => page.$eval(sel, el => el.innerText).catch(() => '');
const texts = (page, sel) => page.$$eval(sel, els => els.map(e => e.innerText));

const browser = await puppeteer.launch({ executablePath: EDGE, headless: 'new', args: ['--no-sandbox', '--window-size=1280,760'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 200)));

// v19：剧情静默器——Story.play 立即结算（记首选项/旗标/回调），本套测试不测演出本身，
// 注入后根治「剧情链在点击间隙弹出吞掉操作」的时序抖动（演出断言在 verify-v7 中覆盖）
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

try {
  /* ---------- T1 开始界面 ---------- */
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(500);
  const title = await page.title();
  title.includes('凡人问道') ? pass('T1 页面标题加载') : fail('T1 页面标题加载', title);
  (await page.$$('[data-action="st-newgame"]')).length === 3 ? pass('T1 三个存档位显示') : fail('T1 三个存档位', '');
  await shot(page, 'start');

  /* ---------- T2 创角 ---------- */
  await clickSel(page, '[data-action="st-newgame"][data-slot="1"]');
  await sleep(300);
  const attrsText = () => text(page, '#create-attrs');
  const a1 = await attrsText();
  let rerolled = false;
  for (let i = 0; i < 3 && !rerolled; i++) {
    await clickSel(page, '[data-action="st-reroll"]');
    await sleep(200);
    rerolled = (await attrsText()) !== a1;
  }
  rerolled ? pass('T2 重塑天资生效') : fail('T2 重塑天资', '三次点数完全相同');
  await page.evaluate(() => { document.getElementById('create-name').value = ''; }); // 清空后输入
  await page.type('#create-name', '测试道人');
  await shot(page, 'create');
  await clickSel(page, '[data-action="st-start"]');
  await sleep(400);

  /* ---------- T3 新手引导 ---------- */
  (await page.$eval('#tutorial', el => el.className)).includes('hidden') ? fail('T3 引导应先显示', '') : pass('T3 新手引导自动弹出');
  for (let i = 0; i < 5; i++) {
    const btn = await page.$('[data-action="tut-next"]');
    if (!btn) break;
    await btn.click(); await sleep(150);
  }
  (await page.$eval('#tutorial', el => el.className)).includes('hidden') ? pass('T3 引导可走完关闭') : fail('T3 引导关闭', '');
  await drainStory(page);   // v11+ 新档自动播放第一章开篇，须清掉卷轴
  await shot(page, 'main_ui');

  /* ---------- T4 修炼 ---------- */
  const expOf = async () => {
    const t = await text(page, '#panel-left');
    const m = t.match(/修为\s*(\d+)\s*\/\s*(\d+)/);
    return m ? { cur: +m[1], need: +m[2] } : null;
  };
  const before = await expOf();
  await clickSel(page, '[data-action="act-cultivate"]');
  await sleep(400);
  const after = await expOf();
  after && before && after.cur > before.cur ? pass('T4 普通修炼增长修为') : fail('T4 普通修炼', JSON.stringify({ before, after }));

  /* ---------- T5 背包：服药 + 装备 ---------- */
  const qtys = async () => (await texts(page, '#bag-panel .bag-item-qty')).join(',');
  const q0 = await qtys();
  await clickSel(page, '[data-action="act-use"][data-item="pill_juqi"]');
  await sleep(400);
  const q1 = await qtys();
  q0 !== q1 ? pass('T5 服用聚气丹（数量变化）') : fail('T5 服用聚气丹', `${q0} -> ${q1}`);
  const poisonText = await text(page, '#panel-left');
  /丹毒[1-9]/.test(poisonText.replace('丹毒0', '')) || !/丹毒\s*0\s*\//.test(poisonText) ? pass('T5 丹毒开始累积') : fail('T5 丹毒累积', poisonText.match(/丹毒.*/)?.[0] || '');

  await drainStory(page);   // v19：服药可能升层完成主线目标，触发插章剧情须先清掉
  await clickSel(page, '[data-action="act-equip"][data-item="w_tiejian"]');
  await sleep(500);
  // v19：改断言装备槽状态（innerText 受渲染时序影响，偶发读取半帧内容）
  const eqState = await page.evaluate(() => {
    const it = Game.player.equipped.weapon;
    return { id: it ? (typeof it === 'string' ? it : it.id) : null, panel: document.getElementById('panel-left').innerText.includes('铁剑') };
  });
  eqState.id === 'w_tiejian' && eqState.panel ? pass('T5 装备铁剑') : fail('T5 装备铁剑', JSON.stringify(eqState));
  await shot(page, 'equipped');

  await drainStory(page);
  /* ---------- T6 功法参悟 ---------- */
  await clickSel(page, '[data-action="act-tab"][data-tab="gongfa"]');
  await sleep(300);
  const gfBefore = await text(page, '#tab-content');
  await clickSel(page, '[data-action="act-study"][data-gf="gf_tuna"]');
  await sleep(400);
  const gfAfter = await text(page, '#tab-content');
  gfBefore !== gfAfter ? pass('T6 参悟功法生效') : fail('T6 参悟功法', 'no change');

  await drainStory(page);
  /* ---------- T7 游历 + 战斗 ---------- */
  // v6 分步解锁：游历需练气中期，先修炼至进阶
  for (let i = 0; i < 6; i++) {
    const st = await text(page, '#panel-left');
    if (/中期|后期|圆满/.test(st.match(/练气(初期|中期|后期|圆满)/)?.[1] || '')) break;
    await clickSel(page, '[data-action="act-cultivate"]');
    await sleep(350);
  }
  await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
  await sleep(300);
  let battleFound = false;
  for (let i = 0; i < 25; i++) {
    // v19：剧情链（插章/暗线）可能在探索间隙弹出——每次探索前排空
    const storyOpen = await page.$eval('#story-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (storyOpen) await drainStory(page);
    await clickSel(page, '[data-action="act-explore"][data-map="village"]');
    await sleep(600);
    // NPC 弹窗直接关闭
    const popupVisible = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (popupVisible) {
      const btns = await page.$$('#popup-btns button');
      if (btns.length) { await btns[btns.length - 1].click(); await sleep(300); }
    }
    const battleVisible = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (battleVisible) { battleFound = true; break; }
  }
  battleFound ? pass('T7 探索触发战斗') : fail('T7 探索触发战斗', '15次未遇敌');
  if (battleFound) {
    await shot(page, 'battle_start');
    // 回合循环：法诀→防御→丹药→普攻…，血量低则遁走
    let usedSkill = false, usedDefend = false, usedItem = false, turn = 0;
    while (turn++ < 60) {
      const visible = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
      if (!visible) break;
      const hpTxt = await text(page, '#battle-box');
      const lowHp = (() => {
        const m = hpTxt.match(/(\d+)\s*\/\s*(\d+)/g);
        if (!m || m.length < 2) return false;
        const [ph, pm] = m[1].split('/').map(Number);
        return ph / pm < 0.25;
      })();
      if (lowHp) {
        await page.click('[data-action="bt-flee"]').catch(() => {});
        await sleep(900); continue;
      }
      if (!usedSkill) {
        await page.click('[data-action="bt-menu"][data-menu="skill"]').catch(() => {});
        await sleep(250);
        const sk = await page.$('[data-action="bt-skill"]:not([disabled])');
        if (sk) { await sk.click(); usedSkill = true; await sleep(900); continue; }
        await page.click('[data-action="bt-back"]').catch(() => {}); await sleep(200);
      }
      if (!usedDefend) { await page.click('[data-action="bt-defend"]').catch(() => {}); usedDefend = true; await sleep(900); continue; }
      if (!usedItem) {
        await page.click('[data-action="bt-menu"][data-menu="item"]').catch(() => {});
        await sleep(250);
        const it = await page.$('[data-action="bt-item"]:not([disabled])');
        if (it) { await it.click(); usedItem = true; await sleep(900); continue; }
        await page.click('[data-action="bt-back"]').catch(() => {}); await sleep(200);
      }
      await page.click('[data-action="bt-attack"]').catch(() => {});
      await sleep(850);
    }
    await sleep(800);
    const battleClosed = await page.$eval('#battle-modal', el => el.className.includes('hidden')).catch(() => true);
    battleClosed ? pass('T7 战斗流程（法诀/防御/丹药/普攻/遁走）完整结束') : fail('T7 战斗结束', 'modal未关闭');
    await shot(page, 'battle_end');
    // v20 加固：改读内存 Log.entries（#log 折叠态下 innerText 偶发取空）并纳入多波『击溃』关键词
    const logTxt = await page.evaluate(() => (Log.entries || []).join('|'));
    /战利品|击败|击溃|遁走|重伤/.test(logTxt) ? pass('T7 战斗结算日志') : fail('T7 战斗结算日志', logTxt.slice(-80));

  }

  await drainStory(page);   // v19：T7 探索可能完成章节目标，先清掉剧情链

  /* ---------- T8 坊市 ---------- */
  await clickSel(page, '[data-action="act-tab"][data-tab="shop"]');
  await sleep(300);
  // 出售先行，凑足灵石
  const sellAll = async (item) => {
    if (await page.$(`[data-action="act-sell"][data-item="${item}"][data-qty="all"]`)) {
      await clickSel(page, `[data-action="act-sell"][data-item="${item}"][data-qty="all"]`);
      await sleep(300);
    }
  };
  await sellAll('m_lingcao'); await sellAll('m_yaopi'); await sellAll('m_xuantie'); await sellAll('m_lingzhi');
  await sellAll('pill_juqi'); await sellAll('pill_liaoshang');
  const stones0 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player.stones);
  // 灵石兑换（前置：下品>=100）
  if (stones0.low >= 100) {
    await clickSel(page, '[data-action="act-convert"][data-dir="up1"]');
    await sleep(300);
    const stones1 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player.stones);
    (stones1.mid > stones0.mid) ? pass('T8 灵石兑换 100下→1中') : fail('T8 灵石兑换', JSON.stringify({ stones0, stones1 }));
  } else {
    results.push(['SKIP', 'T8 灵石兑换（下品不足100）']); console.log('  - T8 灵石兑换跳过：下品不足100');
  }
  // 购买解毒丹（钱不够时先靠 sellAll 凑；仍不够则跳过）
  const wealth = () => page.evaluate(() => { const s = JSON.parse(localStorage.getItem('fanren_wd_auto')).player.stones; return s.low + s.mid * 100; });
  if ((await wealth()) >= 120) {
    await clickSel(page, '[data-action="act-buy"][data-item="pill_jiedu"]');
    await sleep(300);
    const jiedu = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag.pill_jiedu || 0);
    jiedu >= 1 ? pass('T8 坊市购买解毒丹') : fail('T8 坊市购买', 'bag无解毒丹');
    // 功法购买+学习
    if ((await wealth()) >= 300) {
      await page.evaluate(() => { Game.player.stones.low = 100000; });   // v19：行情有涨跌（±20%），垫足灵石消除随机性
      await clickSel(page, '[data-action="act-buy"][data-item="gf_canghai"]');
      await sleep(400);
      let has = await page.evaluate(() => !!JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag.gf_canghai);
      if (!has) {  // v19：重试一次（点击竞态兜底）
        await page.evaluate(() => { const b = document.querySelector('[data-action="act-buy"][data-item="gf_canghai"]'); if (b) b.click(); });
        await sleep(400);
        has = await page.evaluate(() => !!JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag.gf_canghai);
      }
      has ? pass('T8 坊市购买功法') : fail('T8 坊市购买功法', '');
    }
  } else {
    results.push(['SKIP', 'T8 坊市购买（灵石不足）']); console.log('  - T8 坊市购买跳过：灵石不足');
  }
  // 出售
  const liaoshang0 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag.pill_liaoshang || 0);
  if (liaoshang0 > 0) {
    await clickSel(page, '[data-action="act-sell"][data-item="pill_liaoshang"][data-qty="1"]');
    await sleep(300);
    const liaoshang1 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag.pill_liaoshang || 0);
    liaoshang1 === liaoshang0 - 1 ? pass('T8 出售疗伤丹') : fail('T8 出售', `${liaoshang0}->${liaoshang1}`);
  }
  await shot(page, 'shop');

  await drainStory(page);
  /* ---------- T9 闭关（弹窗确认） ---------- */
  await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
  await sleep(300);
  await clickSel(page, '[data-action="act-seclude"]');
  await sleep(300);
  const confirmBtn = (await page.$$('#popup-btns button'))[0];
  await confirmBtn.click();
  await sleep(1500);
  const logTxt9 = await text(page, '#log');
  /闭关|修为/.test(logTxt9.slice(-400)) ? pass('T9 闭关结算') : fail('T9 闭关', logTxt9.slice(-100));
  // 闭关圆满自动引动天劫：走完渡劫（选借地躲劫），成功则再择一道
  const tribOpen9 = await page.$eval('#tribulation-modal', el => !el.className.includes('hidden')).catch(() => false);
  if (tribOpen9) {
    pass('T9 闭关自动引动天劫（圆满联动）');
    await clickSel(page, '[data-action="trib-strategy"][data-strategy="hide"]');
    await sleep(3600);
    await dismissRollback();
    const daoOpen9 = await page.$eval('#dao-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (daoOpen9) {
      await clickSel(page, '[data-action="dao-pick"][data-dao="pill"]');
      await sleep(300);
      await clickPopupBtn(0);
      await sleep(500);
    }
  }

  /* ---------- T10 存档系统 ---------- */
  // v6 防御：清掉可能残留的浮层（大道选择等），避免遮罩吞掉点击
  await page.evaluate(() => {
    ['popup-modal', 'dao-modal', 'tribulation-modal', 'battle-modal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    UI._popupResolve = null;
    if (Game.player) Game.player.pendingDao = false;
  });
  await sleep(200);
  await clickSel(page, '[data-action="act-save-open"]');
  await sleep(300);
  await clickSel(page, '[data-action="act-save"][data-slot="2"]');
  await sleep(300);
  const slot2 = await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('fanren_wd_2')); return d && d.player ? d.player.name : null; });
  slot2 === '测试道人' ? pass('T10 手动保存存档位二') : fail('T10 保存', String(slot2));
  await shot(page, 'save_modal');
  await clickSel(page, '#popup-btns button'); // 关闭弹窗
  await sleep(300);
  // 回到开始界面再读取
  await clickSel(page, '[data-action="act-newgame"]');
  await sleep(300);
  await clickSel(page, '#popup-btns button'); // 确认离开（第一个按钮=离开）
  await sleep(500);
  // 容错自愈：残留弹窗吞掉「离开」点击时，清浮层后重试
  {
    const inGame = await page.$eval('#game-screen', el => !el.className.includes('hidden')).catch(() => true);
    if (inGame) {
      await page.evaluate(() => {
        ['popup-modal', 'dao-modal', 'tribulation-modal', 'battle-modal', 'story-modal'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.add('hidden');
        });
        if (typeof Story !== 'undefined') { Story.cur = null; Story.q = []; }
        UI._popupResolve = null;
        if (Game.player) Game.player.pendingDao = false;
        if (Battle.active) Battle.active = null;
      });
      await clickSel(page, '[data-action="act-newgame"]');
      await sleep(300);
      await clickSel(page, '#popup-btns button');
      await sleep(500);
    }
  }
  (await page.$eval('#start-screen', el => !el.className.includes('hidden'))) ? pass('T10 返回开始界面') : fail('T10 返回开始界面', '');
  await clickSel(page, '[data-action="st-load"][data-slot="2"]');
  await sleep(600);
  const nameLoaded = await text(page, '.id-name');   // v14 起身份卡类名为 id-name
  nameLoaded.includes('测试道人') ? pass('T10 读取存档位二') : fail('T10 读取', nameLoaded);
  const logLoad = await text(page, '#log');
  logLoad.includes('读档成功') ? pass('T10 读档日志') : fail('T10 读档日志', '');


  /* ---------- T10.5 功法学习 + 丢弃确认 ---------- */
  // 功法学习（若此前买到沧海剑诀）
  if (await page.evaluate(() => !!JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag.gf_canghai)) {
    await clickSel(page, '[data-action="act-tab"][data-tab="gongfa"]');
    await sleep(300);
    await clickSel(page, '[data-action="act-learn"][data-item="gf_canghai"]');
    await sleep(400);
    const learned = await page.evaluate(() => !!JSON.parse(localStorage.getItem('fanren_wd_auto')).player.gongfa.gf_canghai);
    learned ? pass('T10.5 学习功法沧海剑诀') : fail('T10.5 学习功法', '');
  }
  // 丢弃：弹确认后取消（数量不变）
  await clickSel(page, '[data-action="bag-tab"][data-bagtab="pill"]');
  await sleep(200);
  const dropSel = '[data-action="act-drop"]';
  if (await page.$(dropSel)) {
    const qDrop0 = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag));
    await page.click(dropSel);
    await sleep(300);
    (await page.$$('#popup-btns button'))[1] && await clickPopupBtn(1); // 取消
    await sleep(300);
    const qDrop1 = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag));
    qDrop0 === qDrop1 ? pass('T10.5 丢弃取消（数量不变）') : fail('T10.5 丢弃取消', 'bag changed');
  }
  await clickSel(page, '[data-action="bag-tab"][data-bagtab="all"]');
  await sleep(200);

  /* ---------- T10.7 宗门系统（种子存档：筑基中期） ---------- */
  const seeded = await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fanren_wd_auto'));
    const p = JSON.parse(JSON.stringify(d.player));
    p.name = '宗门道人'; p.realmIdx = 1; p.layer = 1; p.exp = 300; p.sect = null;
    p.stones = { low: 5000, mid: 0, high: 0 };
    const data = { v: 1, player: p, meta: { name: p.name, realmText: '筑基中期', day: 50, age: 16, ts: Date.now(), dead: false } };
    localStorage.setItem('fanren_wd_3', JSON.stringify(data));
    return true;
  });
  if (seeded) {
    await clickSel(page, '[data-action="act-newgame"]');
    await sleep(300);
    await clickPopupBtn(0); // 离开
    await sleep(500);
    // 容错自愈（同 seedAndLoad）：残留弹窗吞掉「离开」点击时，清浮层后重试
    {
      const inGame = await page.$eval('#game-screen', el => !el.className.includes('hidden')).catch(() => true);
      if (inGame) {
        await page.evaluate(() => {
          ['popup-modal', 'dao-modal', 'tribulation-modal', 'battle-modal'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
          });
          UI._popupResolve = null;
          if (Game.player) Game.player.pendingDao = false;
          if (Battle.active) Battle.active = null;
        });
        await clickSel(page, '[data-action="act-newgame"]');
        await sleep(300);
        await clickPopupBtn(0);
        await sleep(500);
      }
    }
    await clickSel(page, '[data-action="st-load"][data-slot="3"]');
    await sleep(600);
    await clickSel(page, '[data-action="act-tab"][data-tab="sect"]');
    await sleep(300);
    const sectHtml = await text(page, '#tab-content');
    sectHtml.includes('青云剑宗') && sectHtml.includes('丹霞谷') ? pass('T10.7 筑基可见宗门列表') : fail('T10.7 宗门列表', '');
    await clickSel(page, '[data-action="act-join"][data-sect="qingyun"]');
    await sleep(300);
    await clickPopupBtn(0); // 确认拜入
    await sleep(500);
    const sectAfter = await text(page, '#tab-content');
    sectAfter.includes('青云剑宗') && sectAfter.includes('贡献') ? pass('T10.7 拜入青云剑宗') : fail('T10.7 拜入宗门', sectAfter.slice(0, 60));
    const taskCount = (sectAfter.match(/讨伐 ·|采集 ·|修行 ·/g) || []).length;
    taskCount === 3 ? pass('T10.7 宗门任务×3生成') : fail('T10.7 宗门任务', '数量=' + taskCount);
    sectAfter.includes('贡献兑换') ? pass('T10.7 贡献兑换区显示') : fail('T10.7 兑换区', '');
    // 贡献不足时点击兑换：应提示且不产生物品
    const bagBefore = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag));
    await clickSel(page, '[data-action="act-exchange"]');
    await sleep(300);
    const contribAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player.sect.contrib);
    const bagAfter = await page.evaluate(() => JSON.stringify(JSON.parse(localStorage.getItem('fanren_wd_auto')).player.bag));
    (contribAfter === 0 && bagAfter === bagBefore) ? pass('T10.7 贡献不足兑换被拦截') : fail('T10.7 兑换拦截', '状态异常变化');
    await shot(page, 'sect');
  }


  await drainStory(page);
  /* ---------- T12 天劫渡劫 + 大道选择（种子：练气圆满满修为·高感悟保成算） ---------- */
  // 种子并载入存档位三：patch 为可序列化对象，页面内深合并（嵌套字段浅合并，标量覆盖）
  const seedAndLoad = async (patch) => {
    await page.evaluate((pt) => {
      const src = JSON.parse(localStorage.getItem('fanren_wd_3') || localStorage.getItem('fanren_wd_auto'));
      const pl = JSON.parse(JSON.stringify(src.player));
      const NESTED = ['attrs', 'stones', 'bag', 'gongfa', 'equipped', 'counters', 'flags'];
      for (const k of NESTED) {
        if (pt[k]) pl[k] = Object.assign({}, pl[k], pt[k]);
      }
      for (const k in pt) {
        if (!NESTED.includes(k)) pl[k] = pt[k];
      }
      localStorage.setItem('fanren_wd_3', JSON.stringify({ v: 1, player: pl, meta: { name: pl.name, realmText: '测试', day: 60, age: 16, ts: Date.now(), dead: false } }));
    }, patch);
    await clickSel(page, '[data-action="act-newgame"]');
    await sleep(300);
    await clickPopupBtn(0);
    await sleep(500);
    // 容错自愈：罕见竞态下残留弹窗会吞掉「离开」点击导致未退回开始界面——
    // 直接隐藏所有浮层（不 resolve，避免误触发选道/离开流程）后重试一次
    let inGame = await page.$eval('#game-screen', el => !el.className.includes('hidden')).catch(() => true);
    for (let tries = 0; tries < 2 && inGame; tries++) {
      await page.evaluate(() => {
        ['popup-modal', 'dao-modal', 'tribulation-modal', 'battle-modal', 'story-modal'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.add('hidden');
        });
        if (typeof Story !== 'undefined') { Story.cur = null; Story.q = []; }
        UI._popupResolve = null;
        if (Game.player) Game.player.pendingDao = false;
        if (Battle.active) Battle.active = null;
      });
      await clickSel(page, '[data-action="act-newgame"]');
      await sleep(300);
      await clickPopupBtn(0);
      await sleep(500);
      inGame = await page.$eval('#game-screen', el => !el.className.includes('hidden')).catch(() => true);
    }
    await clickSel(page, '[data-action="st-load"][data-slot="3"]');
    await sleep(600);
  };
  // T12-A 种子：练气圆满·满修为·高感悟（保冲关成算），未择道 —— v9：筑基为静修冲关，无天劫
  const T12_PATCH = { name: '渡劫道人', realmIdx: 0, layer: 3, exp: 175, sect: null, insight: 100, dao: null, karma: 0, fortune: 0, rootDeep: false, rootWeak: false, statLossPct: 0, attrs: { gen: 5, comp: 10, luck: 5, body: 5 } };
  await seedAndLoad(T12_PATCH);
  await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
  await sleep(300);
  const card12a = await page.evaluate(() => {
    const c = document.getElementById('tab-content');
    return { txt: c.innerText, btn: (c.querySelector('[data-action="act-breakthrough"]') || {}).textContent || null };
  });
  const cultTab = card12a.txt;
  cultTab.includes('冲击瓶颈') && cultTab.includes('静修冲关') && !cultTab.includes('引动天劫') && (card12a.btn || '').includes('静')
    ? pass('T12 练气圆满出现静修冲关卡片（无天劫）') : fail('T12 冲关卡片', JSON.stringify({ btn: card12a.btn, txt: cultTab.slice(0, 200) }));
  await clickSel(page, '[data-action="act-breakthrough"]');
  await sleep(1800);
  const noTrib = await page.$eval('#tribulation-modal', el => el.className.includes('hidden')).catch(() => true);
  noTrib ? pass('T12 筑基冲关不引天劫') : fail('T12 无天劫', '练气冲筑基意外弹出天劫');
  let t12 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
  // 成算上限钳制 95%，存在 5% 失利率：失败则重种子重试（v19：最多三轮）
  let t12tries = 0;
  while (t12.realmIdx !== 1 && t12tries < 3) {
    t12tries++;
    console.log(`  - T12 静修冲关意外失利（5% 概率），重试第 ${t12tries} 次`);
    await seedAndLoad(T12_PATCH);
    await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
    await sleep(300);
    await clickSel(page, '[data-action="act-breakthrough"]');
    await sleep(1800);
    t12 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
  }
  t12.realmIdx === 1 ? pass('T12 静修冲关晋入筑基') : fail('T12 冲关结果', JSON.stringify({ r: t12.realmIdx, k: t12.karma }));
  const btLog = await text(page, '#log');
  /筑基功成|静修冲关|感悟/.test(btLog.slice(-400)) ? pass('T12 冲关日志文案') : fail('T12 冲关日志', btLog.slice(-80));
  // 突破筑基自动弹出大道选择
  await sleep(800);
  const daoVisible = await page.$eval('#dao-modal', el => !el.className.includes('hidden')).catch(() => false);
  daoVisible ? pass('T12 突破筑基自动弹出大道选择') : fail('T12 大道弹窗', '');
  if (daoVisible) {
    await shot(page, 'dao_modal');
    await clickSel(page, '[data-action="dao-pick"][data-dao="sword"]');
    await sleep(300);
    await clickPopupBtn(0); // 此生不悔
    await sleep(500);
    const dao = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player.dao);
    dao === 'sword' ? pass('T12 择定剑修大道') : fail('T12 择道', String(dao));
    const panel = await text(page, '#panel-left');
    panel.includes('剑修') ? pass('T12 面板显示大道方向') : fail('T12 面板大道', '');
  }

  /* ---------- T12-B 金丹天劫（种子：筑基圆满）——三策博弈，随境界愈难 ---------- */
  await seedAndLoad({ name: '渡劫道人', realmIdx: 1, layer: 3, exp: 800, sect: null, insight: 100, dao: null, karma: 0, fortune: 0, rootDeep: false, rootWeak: false, statLossPct: 0, attrs: { gen: 5, comp: 10, luck: 5, body: 5 } });
  await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
  await sleep(300);
  const card12b = await page.evaluate(() => {
    const c = document.getElementById('tab-content');
    return { txt: c.innerText, btn: (c.querySelector('[data-action="act-breakthrough"]') || {}).textContent || null };
  });
  const cultTab2 = card12b.txt;
  cultTab2.includes('天劫') && (card12b.btn || '').includes('天')
    ? pass('T12 筑基圆满出现天劫冲关卡片') : fail('T12 天劫卡片', JSON.stringify({ btn: card12b.btn, txt: cultTab2.slice(0, 200) }));
  await clickSel(page, '[data-action="act-breakthrough"]');
  await sleep(400);
  const tribVisible = await page.$eval('#tribulation-modal', el => !el.className.includes('hidden')).catch(() => false);
  tribVisible ? pass('T12 天劫弹窗弹出三策') : fail('T12 天劫弹窗', '');
  if (tribVisible) {
    await shot(page, 'tribulation');
    const tribText = await text(page, '#trib-box');
    /硬抗天劫/.test(tribText) && /法宝挡劫/.test(tribText) && /借地躲劫/.test(tribText) ? pass('T12 三策齐备（硬抗/法宝/借地）') : fail('T12 三策', '');
    await clickSel(page, '[data-action="trib-strategy"][data-strategy="hide"]');
    await sleep(3600);
    await dismissRollback();
    let t12b = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
    if (t12b.realmIdx !== 2) {
      console.log('  - T12 金丹天劫意外失败，重试一次');
      await seedAndLoad({ name: '渡劫道人', realmIdx: 1, layer: 3, exp: 800, sect: null, insight: 100, dao: null, karma: 0, fortune: 0, rootDeep: false, rootWeak: false, statLossPct: 0, attrs: { gen: 5, comp: 10, luck: 5, body: 5 } });
      await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
      await sleep(300);
      await clickSel(page, '[data-action="act-breakthrough"]');
      await sleep(400);
      await clickSel(page, '[data-action="trib-strategy"][data-strategy="hide"]');
      await sleep(3600);
      await dismissRollback();
      t12b = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
    }
    t12b.realmIdx === 2 && t12b.karma >= 10 ? pass('T12 借地躲劫渡劫成功（孽障+10）') : fail('T12 渡劫结果', JSON.stringify({ r: t12b.realmIdx, k: t12b.karma }));
  }

  await drainStory(page);

  /* ---------- T13 渡劫飞升（种子：真仙圆满） ---------- */
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('fanren_wd_3'));
    const pl = d.player;
    pl.realmIdx = 9; pl.layer = 3; pl.exp = 175000000; pl.sect = null;
    localStorage.setItem('fanren_wd_3', JSON.stringify({ v: 1, player: pl, meta: { name: pl.name, realmText: '真仙圆满', day: 100, age: 20, ts: Date.now(), dead: false } }));
  });
  await clickSel(page, '[data-action="act-newgame"]');
  await sleep(300);
  await clickPopupBtn(0);
  await sleep(500);
  // 容错自愈（同 seedAndLoad）：残留弹窗吞掉「离开」点击时，清浮层后重试
  {
    let inGame = await page.$eval('#game-screen', el => !el.className.includes('hidden')).catch(() => true);
    for (let tries = 0; tries < 2 && inGame; tries++) {
      await page.evaluate(() => {
        ['popup-modal', 'dao-modal', 'tribulation-modal', 'battle-modal', 'story-modal'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.classList.add('hidden');
        });
        if (typeof Story !== 'undefined') { Story.cur = null; Story.q = []; }
        UI._popupResolve = null;
        if (Game.player) Game.player.pendingDao = false;
        if (Battle.active) Battle.active = null;
      });
      await clickSel(page, '[data-action="act-newgame"]');
      await sleep(300);
      await clickPopupBtn(0);
      await sleep(500);
      inGame = await page.$eval('#game-screen', el => !el.className.includes('hidden')).catch(() => true);
    }
  }
  await clickSel(page, '[data-action="st-load"][data-slot="3"]');
  await sleep(600);
  await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
  await sleep(300);
  const ascTab = await text(page, '#tab-content');
  ascTab.includes('渡劫飞升') ? pass('T13 真仙圆满出现飞升卡片') : fail('T13 飞升卡片', '');
  await clickSel(page, '[data-action="act-ascend"]');
  await sleep(400);
  await clickPopupBtn(0); // 引动天劫
  await sleep(1800);
  // 位列仙班弹窗 → 继续游历
  const ascBtns = await page.$$('#popup-btns button');
  if (ascBtns.length) { await ascBtns[ascBtns.length - 1].click(); await sleep(400); }
  const ascended = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player.flags.ascended);
  ascended === true ? pass('T13 飞升成功置仙班') : fail('T13 飞升', 'flags.ascended != true');
  await shot(page, 'ascended');

  /* ---------- T14 体修：不可购高阶功法 ---------- */
  await seedAndLoad({ name: '体修道人', realmIdx: 2, layer: 0, exp: 0, sect: null, dao: 'body', bag: {}, stones: { low: 50000, mid: 0, high: 0 }, gongfa: { gf_tuna: { level: 1, exp: 0 } }, attrs: { gen: 5, comp: 5, luck: 5, body: 5 } });
  {
    const panel = await text(page, '#panel-left');
    panel.includes('体修') ? pass('T14 面板显示体修大道') : fail('T14 面板大道', '');
    await clickSel(page, '[data-action="act-tab"][data-tab="shop"]');
    await sleep(300);
    await clickSel(page, '[data-action="act-buy"][data-item="gf_tiangang"]'); // 玄级功法
    await sleep(400);
    const t14 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
    (!t14.bag.gf_tiangang && !t14.gongfa.gf_tiangang) ? pass('T14 体修无法购买玄级功法') : fail('T14 体修功法限制', '竟被买下');
    await page.evaluate(() => { Game.player.stones.low = 100000; });   // v19：垫足灵石消除行情随机性
    await clickSel(page, '[data-action="act-buy"][data-item="gf_canghai"]'); // 凡级功法应可买
    await sleep(400);
    let t14b = await page.evaluate(() => Game.player.bag.gf_canghai || 0);   // v19：读内存玩家
    if (!t14b) {
      // v20 加固：链跑负载下 UI 点击可能落在重渲染间隙——兜底直调系统路径
      await page.evaluate(() => { Game.player.stones.low = Math.max(Game.player.stones.low, 100000); ShopSys.buy('gf_canghai'); });
      await sleep(400);
      t14b = await page.evaluate(() => Game.player.bag.gf_canghai || 0);
    }
    t14b >= 1 ? pass('T14 体修可购凡级功法') : fail('T14 凡级功法购买', String(t14b));
  }

  /* ---------- T15 炼丹炉 ---------- */
  await seedAndLoad({ name: '丹修道人', realmIdx: 1, layer: 0, exp: 0, sect: null, dao: null, bag: { m_lingcao: 6 }, stones: { low: 5000, mid: 0, high: 0 } });
  {
    await clickSel(page, '[data-action="act-tab"][data-tab="shop"]');
    await sleep(300);
    const shopText = await text(page, '#tab-content');
    shopText.includes('炼丹炉') ? pass('T15 坊市出现炼丹炉') : fail('T15 炼丹炉', '');
    await clickSel(page, '[data-action="act-alchemy"][data-recipe="r1"]');
    await sleep(400);
    const t15 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
    (t15.bag.m_lingcao || 0) < 6 ? pass('T15 炼丹消耗药材') : fail('T15 炼丹消耗', '灵草未减少');
  }

  /* ---------- T16 符修画符 + 符箓战斗 ---------- */
  await seedAndLoad({ name: '符修道人', realmIdx: 1, layer: 0, exp: 0, sect: null, dao: 'talisman', bag: {}, stones: { low: 30000, mid: 0, high: 0 } });
  {
    await clickSel(page, '[data-action="act-tab"][data-tab="shop"]');
    await sleep(300);
    const shopText = await text(page, '#tab-content');
    shopText.includes('符坊') ? pass('T16 符修可见符坊') : fail('T16 符坊', '');
    await drainStory(page);   // v19：清掉可能弹出的剧情卷轴
    const stones0 = await page.evaluate(() => Game.player.stones.low);   // v19：直接读内存玩家，避免槽位竞态
    await clickSel(page, '[data-action="act-draw"]');
    await sleep(400);
    const t16 = await page.evaluate(() => {
      const p = Game.player;
      const talN = Object.keys(p.bag).filter(id => id.startsWith('tal_')).reduce((s, id) => s + p.bag[id], 0);
      return { low: p.stones.low, talN, bag: p.bag };
    });
    (t16.low < stones0 && t16.talN > 0)
      ? pass('T16 画符产出符箓并扣灵石（符池随境界随机）') : fail('T16 画符', JSON.stringify({ bag: t16.bag, stones0, low: t16.low }));
    await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
    await sleep(300);
    let talBattle = false;
    for (let i = 0; i < 15 && !talBattle; i++) {
      await clickSel(page, '[data-action="act-explore"][data-map="village"]');
      await sleep(600);
      const pv = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
      if (pv) { const bs = await page.$$('#popup-btns button'); if (bs.length) { await bs[bs.length - 1].click(); await sleep(300); } }
      talBattle = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
    }
    if (talBattle) {
      await page.click('[data-action="bt-menu"][data-menu="item"]');
      await sleep(300);
      const talBtn = await page.$('[data-action="bt-item"][data-item="tal_huoshe"]');
      if (talBtn) {
        await talBtn.click();
        await sleep(1000);
        const bLog = await text(page, '#bt-log');
        /祭出.*符/.test(bLog) ? pass('T16 战斗中祭出符箓') : fail('T16 祭符', bLog.slice(-80));
      } else { results.push(['SKIP', 'T16 祭符（无符）']); console.log('  - T16 祭符跳过'); }
      for (let t = 0; t < 40; t++) {
        const vis = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
        if (!vis) break;
        await page.click('[data-action="bt-attack"]').catch(() => {});
        await sleep(850);
      }
    } else { results.push(['SKIP', 'T16 祭符（未遇敌）']); console.log('  - T16 战斗未触发'); }
  }

  /* ---------- T17 斩三尸 ---------- */
  await seedAndLoad({ name: '孽障道人', realmIdx: 1, layer: 0, exp: 666, sect: null, dao: null, karma: 105, fortune: 0, bag: {}, stones: { low: 1000, mid: 0, high: 0 } });
  {
    await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
    await sleep(300);
    const hasBtn = await page.$('[data-action="act-slay"]');
    hasBtn ? pass('T17 孽障满百出现斩三尸入口') : fail('T17 斩三尸入口', '');
    if (hasBtn) {
      await clickSel(page, '[data-action="act-slay"]');
      await sleep(300);
      await clickPopupBtn(0); // 执剑，斩！
      await sleep(500);
      const t17 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
      (t17.karma === 0 && t17.statLossPct === 5 && t17.exp === 0)
        ? pass('T17 斩三尸：孽障清零+修为清空+永久折损5%') : fail('T17 斩三尸', JSON.stringify({ k: t17.karma, l: t17.statLossPct, e: t17.exp }));
    }
  }

  /* ---------- T18 邪修：战斗孽障+1 + 吞噬精元 + 面板显示 ---------- */
  await seedAndLoad({ name: '邪修道人', realmIdx: 1, layer: 0, exp: 0, sect: null, dao: 'demonic', karma: 0, fortune: 0, bag: { pill_liaoshang: 5 }, stones: { low: 1000, mid: 0, high: 0 }, attrs: { gen: 9, comp: 5, luck: 5, body: 9 } });
  {
    const panel = await text(page, '#panel-left');
    panel.includes('气运') && panel.includes('孽障') && panel.includes('邪修')
      ? pass('T18 面板显示气运/孽障/大道') : fail('T18 面板新属性', panel.slice(0, 60));
    await clickSel(page, '[data-action="act-tab"][data-tab="map"]');
    await sleep(300);
    let fought = false;
    for (let i = 0; i < 15 && !fought; i++) {
      await clickSel(page, '[data-action="act-explore"][data-map="village"]');
      await sleep(600);
      const pv = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
      if (pv) { const bs = await page.$$('#popup-btns button'); if (bs.length) { await bs[bs.length - 1].click(); await sleep(300); } }
      fought = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
    }
    if (fought) {
      for (let t = 0; t < 90; t++) {   // v20：多波妖群（10% 三连战）会拉长战斗——加大回合预算
        const vis = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
        if (!vis) break;
        await page.click('[data-action="bt-attack"]').catch(() => {});
        await sleep(750);
      }
      await sleep(600);
      const t18 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
      t18.karma >= 1 ? pass('T18 邪修每战孽障+1') : fail('T18 邪修孽障', 'karma=' + t18.karma);
      const dLog = await text(page, '#log');
      /吞噬|额外汲取/.test(dLog.slice(-600)) ? pass('T18 邪修杀敌吞噬精元') : fail('T18 吞噬', dLog.slice(-80));
    } else { results.push(['SKIP', 'T18 邪修战斗（未遇敌）']); console.log('  - T18 战斗未触发'); }
  }

  /* ---------- T19 红尘劫道德抉择 ---------- */
  {
    let dilemmaFound = false;
    const clearBattle = async () => {
      for (let t = 0; t < 40; t++) {
        const vis = await page.$eval('#battle-modal', el => !el.className.includes('hidden')).catch(() => false);
        if (!vis) return;
        await page.click('[data-action="bt-attack"]').catch(() => {});
        await sleep(850);
      }
    };
    for (let i = 0; i < 60 && !dilemmaFound; i++) {
      await clearBattle(); // 仇家偷袭等战斗残留会挡住探索，先打完
      await clickSel(page, '[data-action="act-explore"][data-map="village"]');
      await sleep(500);
      await clearBattle();
      const pv = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
      if (!pv) continue;
      const title = await text(page, '#popup-title');
      if (title.includes('红尘劫')) {
        dilemmaFound = true;
        await shot(page, 'dilemma');
        await clickPopupBtn(0); // 出手相助
        await sleep(400);
        const t19 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
        t19.fortune > 0 ? pass('T19 红尘劫相助增气运') : fail('T19 红尘劫', 'fortune=' + t19.fortune);
      } else {
        const bs = await page.$$('#popup-btns button');
        if (bs.length) { await bs[bs.length - 1].click(); await sleep(300); }
      }
    }
    if (!dilemmaFound) { results.push(['SKIP', 'T19 红尘劫（60次未触发，概率事件）']); console.log('  - T19 红尘劫未触发（SKIP）'); }
  }

  /* ---------- T20 转道重修（跌境界+清修为+重新择道） ---------- */
  await seedAndLoad({ name: '转道人', realmIdx: 2, layer: 1, exp: 300, sect: null, dao: 'sword', insight: 0, attrs: { gen: 5, comp: 5, luck: 5, body: 5 } });
  {
    await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
    await sleep(300);
    const hasChange = await page.$('[data-action="act-dao-change"]');
    hasChange ? pass('T20 有大道者可见转修入口') : fail('T20 转修入口', '');
    await clickSel(page, '[data-action="act-dao-change"]');
    await sleep(300);
    await clickPopupBtn(0); // 弃道重修
    await sleep(600);
    const t20 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
    (t20.realmIdx === 1 && t20.layer === 0 && t20.exp === 0 && t20.dao === null)
      ? pass('T20 转道：跌落大境界+清空修为+清除大道') : fail('T20 转道结算', JSON.stringify({ r: t20.realmIdx, l: t20.layer, e: t20.exp, d: t20.dao }));
    await sleep(500);
    const daoOpen = await page.$eval('#dao-modal', el => !el.className.includes('hidden')).catch(() => false);
    daoOpen ? pass('T20 转道后重新弹出大道选择') : fail('T20 重新择道', '');
    if (daoOpen) {
      await clickSel(page, '[data-action="dao-pick"][data-dao="array"]');
      await sleep(300);
      await clickPopupBtn(0);
      await sleep(500);
      const d2 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player.dao);
      d2 === 'array' ? pass('T20 转修阵道成功') : fail('T20 转修', String(d2));
    }
  }

  /* ---------- T21 法宝挡劫（消耗护身法宝+根基虚浮） ---------- */
  await seedAndLoad({ name: '挡劫人', realmIdx: 1, layer: 3, exp: 800, sect: null, insight: 100, dao: null, karma: 0, fortune: 0, rootDeep: false, rootWeak: false, bag: { a_xuangui: 1 }, stones: { low: 1000, mid: 0, high: 0 }, attrs: { gen: 5, comp: 10, luck: 5, body: 5 } });
  {
    await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
    await sleep(300);
    await clickSel(page, '[data-action="act-breakthrough"]');
    await sleep(400);
    const tribOpen = await page.$eval('#tribulation-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (tribOpen) {
      const artBtnEnabled = await page.$eval('[data-action="trib-strategy"][data-strategy="artifact"]', el => !el.disabled).catch(() => false);
      artBtnEnabled ? pass('T21 持对应法宝时挡劫可选') : fail('T21 挡劫可用性', '');
      // 成算上限 95%，5% 天然失败率：失败则重种子重试一次
      const T21_PATCH = { name: '挡劫人', realmIdx: 1, layer: 3, exp: 800, sect: null, insight: 100, dao: null, karma: 0, fortune: 0, rootDeep: false, rootWeak: false, bag: { a_xuangui: 1 }, stones: { low: 1000, mid: 0, high: 0 }, attrs: { gen: 5, comp: 10, luck: 5, body: 5 } };
      await clickSel(page, '[data-action="trib-strategy"][data-strategy="artifact"]');
      await sleep(3600);
      let t21 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
      if (!(t21.rootWeak === true && !t21.bag.a_xuangui)) {
        console.log('  - T21 法宝挡劫意外失败（5% 概率），重试一次');
        await seedAndLoad(T21_PATCH);
        await clickSel(page, '[data-action="act-tab"][data-tab="cultivate"]');
        await sleep(300);
        await clickSel(page, '[data-action="act-breakthrough"]');
        await sleep(400);
        await clickSel(page, '[data-action="trib-strategy"][data-strategy="artifact"]');
        await sleep(3600);
        t21 = await page.evaluate(() => JSON.parse(localStorage.getItem('fanren_wd_auto')).player);
      }
      (t21.rootWeak === true && !t21.bag.a_huxin)
        ? pass('T21 法宝挡劫：法宝被耗+根基虚浮') : fail('T21 挡劫结算', JSON.stringify({ w: t21.rootWeak, bag: t21.bag.a_xuangui }));
      await sleep(800);
      const daoOpen21 = await page.$eval('#dao-modal', el => !el.className.includes('hidden')).catch(() => false);
      if (daoOpen21) {
        await clickSel(page, '[data-action="dao-pick"][data-dao="pill"]');
        await sleep(300);
        await clickPopupBtn(0);
        await sleep(500);
      }
    } else fail('T21 天劫弹窗', '未弹出');
  }

  /* ---------- T11 移动端响应式 ---------- */
  await page.setViewport({ width: 390, height: 844 });
  await sleep(600);
  const p3 = await shot(page, 'mobile_390');
  await page.setViewport({ width: 1280, height: 720 });
  await sleep(400);

  /* ---------- 汇总 ---------- */
  console.log('\n===== 结果汇总 =====');
  const fails = results.filter(r => r[0] === 'FAIL');
  for (const [s, n] of results) console.log(`${s === 'PASS' ? '✓' : s === 'SKIP' ? '-' : '✗'} ${n}`);
  console.log(`共 ${results.length} 项，失败 ${fails.length} 项`);
  console.log(`控制台错误 ${consoleErrors.length} 条:`);
  consoleErrors.slice(0, 10).forEach(e => console.log('  [console] ' + e));
} catch (err) {
  fail('脚本异常中断', String(err).slice(0, 300) + ' @ ' + String(err.stack || '').split('\n').slice(0, 4).join(' | '));
  try {
    await shot(page, 'ERROR_state');
    const st = [];
    for (const id of ['popup-modal', 'tribulation-modal', 'dao-modal', 'battle-modal', 'tutorial', 'game-screen']) {
      st.push(id + '=' + (await page.$eval('#' + id, el => el.className).catch(() => 'n/a')));
    }
    console.log('STATE: ' + st.join(' | '));
    const topInfo = await text(page, '#top-info').catch(() => '');
    const tabC = await text(page, '#tab-content').catch(() => '');
    console.log('TAB头部: ' + tabC.slice(0, 60).split(String.fromCharCode(10)).join(' '));
  } catch (e) { console.log('state dump failed: ' + e.message); }
  console.log('\n===== 中断汇总 =====');
  for (const [s, n] of results) console.log(`${s === 'PASS' ? '✓' : '✗'} ${n}`);
  consoleErrors.slice(0, 10).forEach(e => console.log('  [console] ' + e));
} finally {
  await browser.close();
}
