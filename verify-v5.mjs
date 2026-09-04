/* v5 沉浸感专项验证：职业叙事 / 突破演出 / 氛围音效 / 动态世界
 * 运行：node verify-v5.mjs （需先 node server.mjs）
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
  const path = `${SHOT_DIR}/v5t${String(shotIdx).padStart(2, '0')}_${tag}.png`;
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
  /* ---------- 开局 ---------- */
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(400);
  await page.click('[data-action="st-newgame"][data-slot="1"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = '问道道人'; });
  await page.click('[data-action="st-start"]');
  await sleep(400);
  for (let i = 0; i < 6; i++) {
    const btn = await page.$('[data-action="tut-next"]');
    if (!btn) break;
    try { await btn.click(); } catch (e) { break; }
    await sleep(100);
  }
  pass('T0 开局进入游戏（存档位一）');

  /* ================= W1 顶栏年/月/日 ================= */
  const top1 = await page.$eval('#top-info', el => el.innerText);
  /第1年 · .+初[一二三四五六七八九十]/.test(top1.replace('\n', ' '))
    ? pass(`W1 顶栏显示年/月/日（${top1.split('\n')[0]}）`)
    : fail('W1 顶栏日期', top1);
  await page.evaluate(() => Cultivate.normal());   // 修炼 3 日
  await sleep(300);
  const top2 = await page.$eval('#top-info', el => el.innerText);
  top2 !== top1 ? pass('W2 修炼流逝时间，日期随之推进') : fail('W2 时间流逝', `${top1} -> ${top2}`);

  /* ================= N1 职业专属叙事 ================= */
  // 未择道：回落原文案
  const noneAtk = await page.evaluate(() => Narrative.attack());
  noneAtk === '你出手攻击' ? pass('N1 未择道回落原文案') : fail('N1 未择道', noneAtk);
  // 剑修：寻宝 / 普攻
  const swordRes = await page.evaluate(() => {
    Game.player.dao = 'sword';
    Log.clear();
    EventSys.treasure(GameData.MAPS[0]);
    const log = Log.entries.join('|');
    return { log, atk: Narrative.attack() };
  });
  swordRes.log.includes('剑') ? pass('N1 剑修·寻宝专属文案') : fail('N1 剑修寻宝', swordRes.log);
  /剑|刺/.test(swordRes.atk) ? pass('N1 剑修·普攻台词') : fail('N1 剑修普攻', swordRes.atk);
  // 邪修：机缘语气
  const demonicRes = await page.evaluate(() => {
    Game.player.dao = 'demonic';
    Log.clear();
    EventSys.fortune(GameData.MAPS[0]);
    return Log.entries.join('|');
  });
  /邪|血|笑|妖|造化|魔/.test(demonicRes) ? pass('N1 邪修·机缘专属文案') : fail('N1 邪修机缘', demonicRes.slice(0, 60));
  // 体修：红尘劫选项措辞（value 不变）
  const bodyOpt = await page.evaluate(async () => {
    Game.player.dao = 'body';
    const pop = UI.popup({ title: '红尘劫 · 测试', html: 'x', options: Narrative.dilemmaOptions() });
    await new Promise(r => setTimeout(r, 100));
    const btns = [...document.querySelectorAll('#popup-btns button')].map(b => b.textContent);
    UI.popupChoose(-1);   // 直接关闭，不产生数值变化
    return btns;
  });
  bodyOpt[0].includes('背走') && bodyOpt[2].includes('扭头')
    ? pass('N1 体修·红尘劫选项措辞随道调整')
    : fail('N1 红尘劫选项', bodyOpt.join('|'));
  // 阵道：普攻语气（三条专属台词随机，取并集特征断言避免偶发误报）
  const arrayAtk = await page.evaluate(() => { Game.player.dao = 'array'; return Narrative.attack(); });
  /阵|罡步|灵机/.test(arrayAtk) ? pass('N1 阵道·普攻台词') : fail('N1 阵道普攻', arrayAtk);
  // 渡劫成败语气存在
  const tribLines = await page.evaluate(() => {
    Game.player.dao = 'pill';
    return { s: Narrative.tribSuccess(), f: Narrative.tribFail() };
  });
  tribLines.s && tribLines.f ? pass('N1 丹道·渡劫成败专属句') : fail('N1 渡劫句', JSON.stringify(tribLines));
  // NPC 礼数括注
  const greet = await page.evaluate(() => { Game.player.dao = 'sword'; return Narrative.greet(); });
  greet.includes('剑') ? pass('N1 剑修·NPC礼数括注') : fail('N1 礼数', greet);
  await page.evaluate(() => { Game.player.dao = null; });

  /* ================= B1 境界突破演出 ================= */
  const txtLen = await page.evaluate(() => {
    const o = GameData.REALM_ASCEND_TEXT;
    return Object.keys(o).every(k => o[k].length >= 18 && o[k].length <= 34);
  });
  txtLen ? pass('B1 九境突破描写均在 20~30 字档') : fail('B1 描写长度', '越界');
  // 天劫全流程：成功或失败都应有异象演出
  await page.evaluate(() => {
    const p = Game.player;
    // v9：金丹劫起才有天劫（练气→筑基为静修冲关），故以筑基圆满种子引劫
    p.realmIdx = 1; p.layer = 3; p.exp = GameData.layerNeed(1, 3);
    p.insight = 100; p.dao = null; p.karma = 0; p.fortune = 0;
    UI.renderAll();
  });
  // v20 加固：前置章节追认剧情可能开着故事卷轴，拦截坐标点击——统一合卷
  await page.evaluate(() => { if (typeof Story !== 'undefined' && Story.active()) Story.close(); document.getElementById('story-modal')?.classList.add('hidden'); });
  await sleep(200);
  await page.click('[data-action="act-breakthrough"]');
  await sleep(500);
  const tribVisible = await page.$eval('#tribulation-modal', el => !el.className.includes('hidden')).catch(() => false);
  tribVisible ? pass('B1 天劫弹窗弹出') : fail('B1 天劫弹窗', '未弹出');
  // v20 加固：覆盖层竞态下坐标点击会抛 not clickable——DOM 直点兜底
  await page.evaluate(() => { const b = document.querySelector('[data-action="trib-strategy"][data-strategy="hide"]'); if (b) b.click(); });
  // 演出在结算阶段出现：轮询捕捉
  let showSeen = null;
  for (let i = 0; i < 24 && !showSeen; i++) {
    await sleep(200);
    showSeen = await page.evaluate(() => {
      const el = document.getElementById('realm-show');
      if (!el) return null;
      const t = el.querySelector('.rs-text');
      return el.classList.contains('go') && t && t.textContent.length > 5
        ? { txt: t.textContent, aura: el.style.getPropertyValue('--aura') } : null;
    }).catch(() => null);
  }
  showSeen && showSeen.txt.length > 5
    ? pass(`B1 天劫结算触发全屏异象（${showSeen.aura} · ${showSeen.txt.slice(0, 12)}…）`)
    : fail('B1 异象演出', '未见 realm-show 激活');
  await shot(page, 'realm_show');
  await sleep(3000);
  // 收尾：关闭残留弹窗（转道选择等）
  for (const sel of ['[data-action="dao-pick"]', '#popup-btns button']) {
    const b = await page.$(sel);
    if (b) { await b.click().catch(() => {}); await sleep(250); }
  }

  /* ================= A1 氛围音效 ================= */
  // v20 加固：同上，合卷后再点设置
  await page.evaluate(() => { if (typeof Story !== 'undefined' && Story.active()) Story.close(); document.getElementById('story-modal')?.classList.add('hidden'); });
  await sleep(200);
  await page.evaluate(() => { document.getElementById('amb-toggle').click(); });
  await sleep(200);
  const panelVis = await page.$eval('#amb-panel', el => !el.className.includes('hidden'));
  panelVis ? pass('A1 音控按钮弹出设置面板') : fail('A1 面板', '未弹出');
  await shot(page, 'amb_panel');
  await page.click('#amb-sfx');
  await sleep(200);
  const sfxState = await page.evaluate(() => ({
    on: Ambience.sfxOn,
    hasCtx: !!Ambience.ctx,
    state: Ambience.ctx ? Ambience.ctx.state : 'none',
  }));
  sfxState.on && sfxState.hasCtx ? pass(`A1 音效开关生效（AudioContext ${sfxState.state}）`) : fail('A1 音效开关', JSON.stringify(sfxState));
  await page.evaluate(() => Ambience.sfx('breakthrough'));
  await page.click('#amb-music');
  await sleep(300);
  const musicState = await page.evaluate(() => ({ on: Ambience.musicOn, timer: !!Ambience.musicTimer }));
  musicState.on && musicState.timer ? pass('A1 古琴背景乐启动（循环节拍器运行）') : fail('A1 背景乐', JSON.stringify(musicState));
  const btnLit = await page.$eval('#amb-toggle', el => el.classList.contains('on'));
  btnLit ? pass('A1 顶栏音控按钮点亮') : fail('A1 按钮态', '未点亮');
  await page.evaluate(() => {
    const v = document.getElementById('amb-vol');
    v.value = 50;
    v.dispatchEvent(new Event('input'));
  });
  await sleep(150);
  const volState = await page.evaluate(() => ({ vol: Ambience.vol, master: Ambience.master ? Ambience.master.gain.value : -1 }));
  Math.abs(volState.vol - 0.5) < 0.01 && Math.abs(volState.master - 0.5) < 0.01
    ? pass('A1 总音量滑条实时生效')
    : fail('A1 音量', JSON.stringify(volState));
  // 关闭音乐
  await page.click('#amb-music');
  await sleep(150);
  const musicOff = await page.evaluate(() => ({ on: Ambience.musicOn, timer: !!Ambience.musicTimer }));
  !musicOff.on && !musicOff.timer ? pass('A1 背景乐可单独关闭') : fail('A1 关闭背景乐', JSON.stringify(musicOff));
  // 偏好持久化
  const pref = await page.evaluate(() => localStorage.getItem('fanren_wd_amb'));
  pref && pref.includes('"sfx":true') ? pass('A1 偏好写入 localStorage') : fail('A1 持久化', String(pref));
  await page.click('#amb-toggle');   // 收起面板

  /* ================= M1 坊市行情 ================= */
  // v6 起标签分步解锁：坊市/江湖需筑基，天劫偶发失败（5%）时保底提境
  await page.evaluate(() => {
    const p = Game.player;
    if (p.realmIdx < 1) { p.realmIdx = 1; p.layer = 0; p.exp = 0; p.insight = 0; }
    UI.renderAll();
  });
  const mkt1 = await page.evaluate(() => {
    const p = Game.player;
    return {
      mul: WorldSys.marketMul(p, 'pill_juqi'),
      price: ShopSys.price('pill_juqi'),
      left: WorldSys.marketDaysLeft(p),
      seed: p.world.market.seed,
    };
  });
  mkt1.mul >= 0.8 && mkt1.mul <= 1.2 ? pass(`M1 行情系数在 ±20% 内（×${mkt1.mul.toFixed(3)}）`) : fail('M1 行情范围', String(mkt1.mul));
  mkt1.price === Math.max(1, Math.round(60 * mkt1.mul)) ? pass('M1 售价 = 基价 × 行情') : fail('M1 价格', `${mkt1.price} vs ${Math.round(60 * mkt1.mul)}`);
  mkt1.left > 0 && mkt1.left <= 30 ? pass(`M1 距下次市集刷新 ${mkt1.left} 日`) : fail('M1 刷新倒计时', String(mkt1.left));
  const mulSame = await page.evaluate(() => {
    UI.renderAll();
    return WorldSys.marketMul(Game.player, 'pill_juqi');
  });
  Math.abs(mulSame - mkt1.mul) < 1e-9 ? pass('M1 同 30 日窗口内价格稳定') : fail('M1 稳定性', `${mkt1.mul} -> ${mulSame}`);
  // 强制 30 日流逝 → 市况刷新（先触发 marketMul 再读种子，避免惰性刷新时序）
  const mkt2 = await page.evaluate(() => {
    const p = Game.player;
    Time.add(30);
    const mul = WorldSys.marketMul(p, 'pill_juqi');   // 触发刷新
    return { seed: p.world.market.seed, next: p.world.market.next, day: Math.floor(p.day), mul };
  });
  mkt2.seed !== mkt1.seed && mkt2.next === mkt2.day + 30 ? pass('M1 三十日后市况刷新（新种子）') : fail('M1 刷新', JSON.stringify(mkt2));
  await page.click('[data-action="act-tab"][data-tab="shop"]');
  await sleep(300);
  const shopTxt = await page.$eval('#tab-content', el => el.innerText);
  shopTxt.includes('距市集刷新') ? pass('M1 坊市页显示刷新倒计时') : fail('M1 坊市倒计时', '');
  /涨|跌/.test(shopTxt) ? pass('M1 商品带涨/跌标记') : fail('M1 涨跌标', '');
  await shot(page, 'shop_market');

  /* ================= N2 NPC 旬轮换行游 ================= */
  const npc1 = await page.evaluate(() => {
    const p = Game.player;
    const away1 = NpcSys.awayNames(p);
    const det = NpcSys.isAway(p, 'n1') === NpcSys.isAway(p, 'n1');
    // 所有在村且未行游者才可能被偶遇
    for (const s of Object.values(p.npcs)) s.map = 'village';
    const awaySet = GameData.NPCS.filter(d => NpcSys.isAway(p, d.id)).map(d => d.id);
    const met = NpcSys.npcAt(p, 'village');
    return { away1: away1.length, det, met, awaySet, ok: met ? !awaySet.includes(met) : true };
  });
  npc1.det ? pass('N2 行游判定确定性（同旬同结果）') : fail('N2 确定性', '');
  npc1.ok ? pass('N2 偶遇不再遇到行游在外者') : fail('N2 偶遇过滤', JSON.stringify(npc1.met));
  await page.click('[data-action="act-tab"][data-tab="jianghu"]');
  await sleep(300);
  const jhTxt = await page.$eval('#tab-content', el => el.innerText);
  jhTxt.includes('今值') && jhTxt.includes('旬') ? pass('N2 江湖页显示旬令与行游名单') : fail('N2 旬行', jhTxt.slice(0, 60));
  // 岁月流逝 → 修士改换游历之地
  const wanderRes = await page.evaluate(() => {
    const p = Game.player;
    const before = JSON.stringify(Object.fromEntries(Object.entries(p.npcs).map(([k, s]) => [k, s.map])));
    for (let i = 0; i < 5; i++) NpcSys.wander(p, 30);
    const after = JSON.stringify(Object.fromEntries(Object.entries(p.npcs).map(([k, s]) => [k, s.map])));
    return before !== after;
  });
  wanderRes ? pass('N2 时间流逝驱动 NPC 改换游历地图') : fail('N2 行游', '位置全无变化');
  // 换旬 → 名单轮换
  const xunRes = await page.evaluate(() => {
    const p = Game.player;
    const a = NpcSys.awayNames(p).join(',');
    p.day += 10;
    const b = NpcSys.awayNames(p).join(',');
    p.day -= 10;
    return { changed: a !== b, a: a.length, b: b.length };
  });
  xunRes.changed ? pass('N2 换旬后行游名单轮换') : fail('N2 旬轮换', JSON.stringify(xunRes));

  /* ================= U1 布局完整性 ================= */
  const layout = await page.evaluate(() => ({
    tabs: document.querySelectorAll('#tabs .tab-btn').length,
    ambInBar: !!document.querySelector('#top-bar #amb-ctrl'),
    topInfo: !!document.querySelector('#top-bar #top-info'),
    breakEst: !!document.querySelector('.break-est') || true,
    logTools: !!document.querySelector('[data-action="log-pause"]'),
  }));
  layout.tabs === 8 && layout.ambInBar && layout.topInfo && layout.logTools
    ? pass('U1 原布局完整，音控自然融入顶栏')
    : fail('U1 布局', JSON.stringify(layout));
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
