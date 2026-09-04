/* v4 体验优化专项验证脚本：headless Chrome 黑盒 + 场景注入
 * 运行：node verify-v4.mjs （需先 node server.mjs）
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
  const path = `${SHOT_DIR}/v4t${String(shotIdx).padStart(2, '0')}_${tag}.png`;
  await Promise.race([
    page.screenshot({ path }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('shot-timeout')), 15000)),
  ]).catch(() => { /* v21: 渲染失速时跳过截图，避免挂死回归链 */ });
  return path;
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clickPopupBtn = async (idx) => {
  const open = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
  if (!open) return;
  const btns = await page.$$('#popup-btns button');
  if (btns.length > idx) await btns[idx].click();
  await sleep(350);
};
const text = (page, sel) => page.$eval(sel, el => el.innerText).catch(() => '');

const browser = await puppeteer.launch({ executablePath: EDGE, headless: true, args: ['--no-sandbox', '--window-size=1280,760'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
page.on('console', m => { if (m.type() === 'error' && !/net::ERR_/.test(m.text())) consoleErrors.push(m.text().slice(0, 200)); });   // v21: 网络层资源抖动不计入
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
  /* ---------- 开局（用存档位三，避免污染其他脚本） ---------- */
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(400);
  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = '体验道人'; });
  await page.click('[data-action="st-start"]');
  await sleep(400);
  for (let i = 0; i < 6; i++) {
    const btn = await page.$('[data-action="tut-next"]');
    if (!btn) break;
    try { await btn.click(); } catch (e) { break; }   // 引导关闭后按钮不可点，正常退出
    await sleep(120);
  }
  pass('T0 开局进入游戏（存档位三）');

  // v20 加固：引导结束后会弹「三分钟上手清单」——直接关掉，避免遮罩拦截后续坐标点击
  await page.evaluate(() => { if (UI._popupResolve) UI.popupChoose(-1); document.getElementById('popup-modal')?.classList.add('hidden'); });
  await sleep(200);

  /* ---------- U1 按钮按压/悬浮样式规则存在 ---------- */
  const ruleText = await page.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      try { for (const r of sheet.cssRules) out.push(r.cssText); } catch (e) { /* cross-origin */ }
    }
    return out.join('\n');
  });
  ruleText.includes('.btn:active:not(:disabled)') && ruleText.includes('.btn:hover:not(:disabled)')
    ? pass('U1 按钮悬浮/按压样式规则已注入')
    : fail('U1 按钮样式', '缺少 :active/:hover 规则');

  /* ---------- U2 日志四级染色 ---------- */
  await page.evaluate(() => {
    Log.add('普通事件测试', 'info');
    Log.add('获得资源测试', 'gain');
    Log.add('战斗危险测试', 'battle');
    Log.add('突破奇遇测试', 'realm');
  });
  await sleep(150);
  const colorOf = sel => page.$eval(sel, el => getComputedStyle(el).color);
  const cInfo = await colorOf('#log .log-info');
  const cGain = await colorOf('#log .log-gain');
  const cBattle = await colorOf('#log .log-battle');
  const cRealm = await colorOf('#log .log-realm');
  // v8 宣纸亮色主题的日志墨色契约
  (cInfo === 'rgb(125, 118, 99)' ? pass('U2 普通事件日志墨色') : fail('U2 普通事件日志', cInfo))
    ; (cGain === 'rgb(77, 139, 63)' ? pass('U2 资源日志绿色') : fail('U2 资源日志', cGain))
    ; (cBattle === 'rgb(182, 64, 56)' ? pass('U2 战斗危险日志朱色') : fail('U2 战斗危险日志', cBattle))
    ; (cRealm === 'rgb(150, 89, 30)' ? pass('U2 突破奇遇日志赭色') : fail('U2 突破奇遇日志', cRealm));

  /* ---------- U3 日志工具：暂停滚动 / 一键清空 ---------- */
  (await page.$('[data-action="log-pause"]')) && (await page.$('[data-action="log-clear"]'))
    ? pass('U3 日志区右上角两枚小按钮存在')
    : fail('U3 日志工具按钮', '按钮缺失');
  await page.evaluate(() => {
    // v14 起日志默认折叠——先展开再验证滚动行为
    const wrap = document.getElementById('log-wrap');
    if (wrap && wrap.className.includes('collapsed')) {
      const t = document.querySelector('[data-action="log-toggle"]');
      if (t) t.click();
    }
    for (let i = 0; i < 25; i++) Log.add(`填充日志 ${i}`, 'info');
  });
  await sleep(200);
  const st1 = await page.$eval('#log', el => ({ top: el.scrollTop, h: el.scrollHeight, ch: el.clientHeight }));
  st1.top >= st1.h - st1.ch - 4 ? pass('U3 默认自动滚动吸底') : fail('U3 自动吸底', JSON.stringify(st1));
  await page.click('[data-action="log-pause"]');
  await sleep(150);
  const pauseLabel = await page.$eval('#log-pause-btn', el => el.textContent);
  pauseLabel.includes('恢复') ? pass('U3 暂停后按钮变为「恢复滚动」') : fail('U3 暂停按钮态', pauseLabel);
  await page.evaluate(() => Log.add('暂停期间的新日志', 'info'));
  await sleep(150);
  const st2 = await page.$eval('#log', el => ({ top: el.scrollTop, h: el.scrollHeight, ch: el.clientHeight }));
  st2.top < st2.h - st2.ch - 20 ? pass('U3 暂停期间不再强制吸底') : fail('U3 暂停吸底', JSON.stringify(st2));
  await page.click('[data-action="log-pause"]');
  await sleep(150);
  const st3 = await page.$eval('#log', el => ({ top: el.scrollTop, h: el.scrollHeight, ch: el.clientHeight }));
  st3.top >= st3.h - st3.ch - 4 ? pass('U3 恢复滚动后重新吸底') : fail('U3 恢复吸底', JSON.stringify(st3));
  await page.click('[data-action="log-clear"]');
  await sleep(120);
  const logCount = await page.$eval('#log', el => el.children.length);
  logCount === 0 ? pass('U3 一键清空日志') : fail('U3 一键清空', `剩余 ${logCount} 条`);

  /* ---------- U4 金色日志置顶高亮 3 秒 ---------- */
  await page.evaluate(() => Log.add('【置顶测试】金色重要日志', 'system'));
  await sleep(200);
  const pin = await page.$eval('#log-pin', el => ({ text: el.innerText, cls: el.className }));
  pin && pin.text.includes('置顶测试') ? pass('U4 金色日志出现置顶高亮条') : fail('U4 置顶条', JSON.stringify(pin));
  await sleep(3300);
  const pinOut = await page.$eval('#log-pin', el => el.className);
  pinOut.includes('out') ? pass('U4 置顶条 3 秒后自动淡出') : fail('U4 置顶淡出', pinOut);

  /* ---------- U5 居中淡入公告 ---------- */
  await page.evaluate(() => UI.announce('测试公告', 'gold'));
  await sleep(150);
  const ann = await page.$eval('#announce', el => ({ n: el.children.length, txt: el.innerText }));
  ann.n >= 1 && ann.txt.includes('测试公告') ? pass('U5 公告居中弹出（金色）') : fail('U5 公告', JSON.stringify(ann));
  await shot(page, 'announce');
  await sleep(2200);
  const annAfter = await page.$eval('#announce', el => el.children.length).catch(() => 0);
  annAfter === 0 ? pass('U5 公告约 2 秒后自动消散') : fail('U5 公告消散', `剩 ${annAfter} 条`);
  await page.evaluate(() => Bag.addItem('w_zhuxian', 1));   // 地级法宝 → 稀有公告
  await sleep(150);
  const rareAnn = await page.$eval('#announce', el => el.innerText).catch(() => '');
  rareAnn.includes('诛仙剑影') ? pass('U5 获得稀有物品触发公告') : fail('U5 稀有公告', rareAnn);
  await sleep(2300);

  /* ---------- U6 数字滚动动画 ---------- */
  await page.evaluate(() => {
    Game.player.exp = 175;          // 给一个非零目标值
    Anim.cache['exp'] = 0;          // 记忆归零，强制从头滚动
    UI.renderAll();
  });
  await sleep(80);
  const mid = await page.$eval('#panel-left [data-nk="exp"]', el => ({ txt: el.textContent, target: el.dataset.nv }));
  Number(mid.txt.replace(/[^0-9.]/g, '')) < Number(mid.target) && mid.txt !== '0'
    ? pass('U6 修为数字处于滚动中间态')
    : fail('U6 修为滚动', JSON.stringify(mid));
  await sleep(700);
  const fin = await page.$eval('#panel-left [data-nk="exp"]', el => el.textContent);
  fin === mid.target ? pass('U6 修为数字滚动至目标值') : fail('U6 修为终点', `${fin} != ${mid.target}`);
  const hasHpAnim = await page.$eval('#panel-left [data-nk="hp"]', el => el.className.includes('num-anim'));
  hasHpAnim ? pass('U6 气血/灵力/灵石均已接入滚动动画') : fail('U6 气血动画', 'missing');

  /* ---------- U7 突破预估成功率分解 ---------- */
  await page.evaluate(() => {
    const p = Game.player;
    p.layer = 3; p.exp = GameData.layerNeed(p.realmIdx, 3);
    UI.renderAll();
  });
  await sleep(150);
  const est = await page.evaluate(() => {
    const box = document.querySelector('.break-est');
    // v9：筑基为静修冲关（+15%），口径与修炼页预估面板一致
    const quiet = Game.player.realmIdx + 1 < GameData.TRIB_START;
    return box ? { txt: box.innerText, chance: Cultivate.breakthroughChance(Game.player, quiet ? 15 : 0) } : null;
  });
  est && est.txt.includes('预估最终成算') && est.txt.includes('气运') && est.txt.includes('孽障') && est.txt.includes('大道')
    ? pass(`U7 预估成功率分解面板（最终 ${est.chance.toFixed(0)}%）`)
    : fail('U7 预估成功率', JSON.stringify(est && est.txt.slice(0, 80)));
  await page.evaluate(() => { Game.player.insight = 50; UI.renderAll(); });
  await sleep(120);
  const est2 = await page.evaluate(() => document.querySelector('.break-est .est-final b').innerText);
  const est2v = parseFloat(est2);
  const chanceNow = await page.evaluate(() => { const quiet = Game.player.realmIdx + 1 < GameData.TRIB_START; return Cultivate.breakthroughChance(Game.player, quiet ? 15 : 0); });
  Math.abs(est2v - chanceNow) < 1 ? pass('U7 丹药感悟实时计入成算') : fail('U7 实时性', `${est2} vs ${chanceNow}`);
  await page.evaluate(() => { Game.player.insight = 0; });
  await shot(page, 'break_est');

  /* ---------- U8 背包品质排序 + 边框色 ---------- */
  await page.evaluate(() => {
    const p = Game.player;
    p.bag = { pill_juqi: 3, m_xuantie: 2, w_qinggang: 1, z_taiji: 1, w_zhuxian: 1 };
    Game.bagTab = 'all';
    UI.renderBag();
  });
  await sleep(150);
  const bagOrder = await page.evaluate(() => {
    const names = [...document.querySelectorAll('.bag-item .bag-item-name')].map(e => e.innerText);
    const cls = [...document.querySelectorAll('.bag-item')].map(e => e.className);
    return { names, cls };
  });
  bagOrder.names[0].includes('太极玉') && bagOrder.names[1].includes('诛仙剑影')
    ? pass('U8 背包按品质降序排列')
    : fail('U8 品质排序', bagOrder.names.join(' | '));
  bagOrder.cls[0].includes('gq-3') ? pass('U8 品质边框类（gq-0~5）已挂载') : fail('U8 边框类', bagOrder.cls[0]);
  const gqColor = await page.$eval('.bag-item.gq-3', el => getComputedStyle(el).boxShadow);
  gqColor.includes('rgb(199, 127, 46)') ? pass('U8 玄/地级边框取色生效') : fail('U8 边框取色', gqColor);

  /* ---------- U9 一键出售凡品 ---------- */
  await page.evaluate(() => {
    const p = Game.player;
    p.bag = { pill_juqi: 3, w_tiejian: 1, a_buyi: 1, z_taiji: 1 };
    p.stones.low = 150; p.stones.mid = 0; p.stones.high = 0;
    UI.renderAll();
  });
  await sleep(150);
  const sellBtn = await page.$('[data-action="act-sell-common"]');
  sellBtn ? pass('U9 背包出现「一键出售凡品」按钮') : fail('U9 出售按钮', 'missing');
  await page.click('[data-action="act-sell-common"]');
  await sleep(300);
  const confirmTxt = await text(page, '#popup-body');
  confirmTxt.includes('铁剑') && confirmTxt.includes('粗布衣') && !confirmTxt.includes('太极玉')
    ? pass('U9 确认弹窗仅列凡品（不动高品）')
    : fail('U9 确认弹窗内容', confirmTxt.slice(0, 100));
  await shot(page, 'sell_confirm');
  await clickPopupBtn(0);
  await sleep(300);
  const afterSell = await page.evaluate(() => ({
    // 灵石有自动归并（100下品→1中品），按总价值核对
    total: Game.player.stones.low + Game.player.stones.mid * 100 + Game.player.stones.high * 10000,
    bag: Object.keys(Game.player.bag),
  }));
  afterSell.total === 290 && !afterSell.bag.includes('w_tiejian') && !afterSell.bag.includes('a_buyi') && afterSell.bag.includes('z_taiji')
    ? pass(`U9 凡品已打包出售（灵石 150 → 总计 ${afterSell.total}，高品保留）`)
    : fail('U9 出售结果', JSON.stringify(afterSell));

  /* ---------- U10 一键服用低阶丹药 ---------- */
  await page.evaluate(() => {
    const p = Game.player;
    Bag.addItem('pill_liaoshang', 2);
    Bag.addItem('pill_huiling', 2);
    p.hp = 1; p.mp = 1;
    UI.renderAll();
  });
  await sleep(150);
  const pillBtn = await page.$('[data-action="act-use-low-pills"]');
  pillBtn ? pass('U10 修炼页出现「一键服丹（补满状态）」') : fail('U10 服丹按钮', 'missing');
  await page.click('[data-action="act-use-low-pills"]');
  await sleep(500);
  const pillRes = await page.evaluate(() => {
    const st = Stat.compute(Game.player);
    return { hp: Game.player.hp, maxHp: st.maxHp, mp: Game.player.mp, maxMp: st.maxMp, liao: Bag.count('pill_liaoshang'), hui: Bag.count('pill_huiling') };
  });
  pillRes.hp >= pillRes.maxHp * 0.99 && pillRes.mp >= pillRes.maxMp * 0.99 && pillRes.liao === 0 && pillRes.hui === 0
    ? pass('U10 低阶丹药自动服满状态（气血/灵力补满，丹药用尽）')
    : fail('U10 服丹结果', JSON.stringify(pillRes));
  // 丹毒保护：丹毒将满时一键服丹应拒绝再服
  await page.evaluate(() => {
    const p = Game.player;
    p.poison = 60 + p.attrs.body * 8 - 1;
    Bag.addItem('pill_liaoshang', 2);
    p.hp = 1;
    UI.renderAll();
  });
  await page.click('[data-action="act-use-low-pills"]').catch(() => {});
  await sleep(400);
  const poisonSafe = await page.evaluate(() => ({ hp: Game.player.hp, liao: Bag.count('pill_liaoshang') }));
  poisonSafe.liao === 2 && poisonSafe.hp < 10
    ? pass('U10 丹毒将满时自动拒绝服药（防反噬）')
    : fail('U10 丹毒保护', JSON.stringify(poisonSafe));

  /* ---------- U11 闭关「到下一小境界自动停止」 ---------- */
  await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 0; p.layer = 0; p.exp = 0; p.poison = 0;   // 回到练气初期，避免遗留圆满状态触发天劫
    UI.renderAll();
  });
  await page.click('[data-action="act-tab"][data-tab="cultivate"]');
  await sleep(200);
  await page.click('[data-action="act-seclude"]');
  await sleep(350);
  const hasCheckbox = await page.$('#seclude-until-level');
  hasCheckbox ? pass('U11 闭关弹窗出现自动停止勾选项') : fail('U11 勾选项', 'missing');
  await page.evaluate(() => { document.getElementById('seclude-until-level').checked = true; });
  await shot(page, 'seclude_opt');
  await clickPopupBtn(0);   // 确认闭关
  await sleep(3000);
  const seclRes = await page.evaluate(() => ({
    layer: Game.player.layer, realm: Game.player.realmIdx,
    day: Math.floor(Game.player.day),
  }));
  // v9：闭关若恰逢圆满，会静修冲关径直晋入筑基——两种进阶皆视为「自动出关」
  seclRes.layer >= 1 || seclRes.realm >= 1
    ? pass(`U11 连续闭关至进阶自动出关（${seclRes.realm >= 1 ? '晋入筑基' : `进至第${seclRes.layer + 1}层`}，历时${seclRes.day}日）`)
    : fail('U11 闭关自动停止', JSON.stringify(seclRes));
  const seclLog = await page.evaluate(() => Log.entries.join('|'));
  seclLog.includes('功成') || seclLog.includes('非至进境') ? pass('U11 出关日志播报') : fail('U11 出关日志', '');

  /* ---------- U12 原有布局未被破坏（三栏结构仍在） ---------- */
  const layout = await page.evaluate(() => ({
    left: !!document.querySelector('#panel-left .panel-title'),
    tabs: document.querySelectorAll('#tabs .tab-btn').length,
    bag: !!document.querySelector('#bag-panel .panel-title'),
    logWrap: !!document.querySelector('#log-wrap #log'),
  }));
  layout.left && layout.tabs === 8 && layout.bag && layout.logWrap
    ? pass('U12 原有三栏布局 / 八标签页完整保留（v13 增洞府页）')
    : fail('U12 布局完整性', JSON.stringify(layout));
  await shot(page, 'final_ui');

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
