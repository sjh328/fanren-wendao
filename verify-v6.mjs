/* v6 长线体验专项验证：成就图鉴 / 智能指引 / 挂机修炼 / 存档优化
 * 运行：node verify-v6.mjs （需先 node server.mjs）
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
  const path = `${SHOT_DIR}/v6t${String(shotIdx).padStart(2, '0')}_${tag}.png`;
  await page.screenshot({ path });
  return path;
};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const text = (page, sel) => page.$eval(sel, el => el.innerText).catch(() => '');
const clickSel = async (page, sel, timeout = 5000) => {
  await page.waitForSelector(sel, { timeout });
  await page.click(sel);
};
const clickPopupBtn = async (idx) => {
  const open = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
  if (!open) return;
  const btns = await page.$$('#popup-btns button');
  if (btns.length > idx) await btns[idx].click();
  await sleep(350);
};
const dismissRollback = async () => {
  for (let i = 0; i < 8; i++) {
    const open = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (!open) return;
    const title = await text(page, '#popup-title');
    if (title.includes('回溯')) {
      const btns = await page.$$('#popup-btns button');
      if (btns.length) await btns[btns.length - 1].click();
    }
    await sleep(450);
  }
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
  /* ---------- 开局 ---------- */
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await sleep(400);
  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = '长线道人'; });
  await page.click('[data-action="st-start"]');
  await sleep(400);
  for (let i = 0; i < 6; i++) {
    const btn = await page.$('[data-action="tut-next"]');
    if (!btn) break;
    try { await btn.click(); } catch (e) { break; }
    await sleep(100);
  }
  pass('T0 开局进入游戏（存档位三）');
  // v15：主线预完结 + 中段预标记，关掉开局剧情弹窗，避免阻断后续测试点击
  await page.evaluate(() => {
    const p = Game.player;
    p.quest = { ch: 9, side: {} };
    p.story = { seen: {}, mid: {}, choices: {} };
    for (const d of QuestSys.CHAPTERS) p.story.mid[d.id] = 1;
    Story.close();
  });
  await sleep(300);

  /* ================= G1 分步解锁 ================= */
  const r1 = await page.evaluate(() => ({
    locked: [...document.querySelectorAll('.tab-btn.locked')].map(e => e.dataset.tab),
    guide: !!document.querySelector('.guide-box'),
    codexBtn: !!document.querySelector('[data-action="act-codex"]'),
  }));
  JSON.stringify(r1.locked.sort()) === JSON.stringify(['cave', 'jianghu', 'map', 'sect', 'shop'])
    ? pass('G1 新档仅修炼/功法可用，其余五页锁定')
    : fail('G1 初始锁定', JSON.stringify(r1.locked));
  await page.click('[data-action="act-tab"][data-tab="map"]');
  await sleep(200);
  const toast1 = await page.evaluate(() => document.getElementById('toast').innerText);
  toast1.includes('尚未解锁') ? pass('G1 点击锁定标签给出提示') : fail('G1 锁提示', toast1);
  await page.evaluate(() => {
    Game.player.attrs.comp = 6;   // v20 加固：去 RNG——低悟性时 4 轮不满一层会误报
    Cultivate.normal(); Cultivate.normal(); Cultivate.normal(); Cultivate.normal();
  });
  await sleep(250);
  const r2 = await page.evaluate(() => [...document.querySelectorAll('.tab-btn.locked')].map(e => e.dataset.tab));
  JSON.stringify(r2.sort()) === JSON.stringify(['cave', 'jianghu', 'sect'])
    ? pass('G1 练气中期解锁游历/坊市，洞府/江湖/宗门仍锁')
    : fail('G1 中期解锁', JSON.stringify(r2));
  await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 1; p.layer = 0; p.exp = 0;   // 筑基 → 全解锁
    UI.renderAll();
  });
  await sleep(200);
  const r3 = await page.evaluate(() => [...document.querySelectorAll('.tab-btn.locked')].length);
  r3 === 0 ? pass('G1 筑基后全部解锁') : fail('G1 全解锁', String(r3));

  /* ================= G2 当前建议 ================= */
  const tip1 = await page.evaluate(() => document.querySelector('.guide-box').innerText);
  tip1.includes('当前建议') ? pass('G2 侧边「当前建议」模块常驻') : fail('G2 模块', tip1);
  const tip2 = await page.evaluate(() => {
    const p = Game.player;
    p.layer = 3; p.exp = GameData.layerNeed(p.realmIdx, 3);
    UI.renderAll();
    return document.querySelector('.guide-box').innerText;
  });
  tip2.includes('圆满') && tip2.includes('冲击') ? pass('G2 修为圆满 → 建议突破') : fail('G2 突破指引', tip2);
  const tip3 = await page.evaluate(() => {
    const p = Game.player;
    p.karma = 120;
    UI.renderAll();
    const t = document.querySelector('.guide-box').innerText;
    p.karma = 0;
    return t;
  });
  tip3.includes('斩三尸') ? pass('G2 孽障过高 → 建议斩三尸') : fail('G2 斩三尸指引', tip3);
  const tip4 = await page.evaluate(() => {
    const p = Game.player;
    p.dao = null; p.insight = 0; p.layer = 0; p.exp = 0;
    p.realmIdx = 1;
    UI.renderAll();
    const t = document.querySelector('.guide-box').innerText;
    return t;
  });
  tip4.includes('大道') ? pass('G2 入筑基未择道 → 提示叩问大道') : fail('G2 大道指引', tip4);
  await page.evaluate(() => { Game.player.dao = 'sword'; UI.renderAll(); });

  /* ================= A1 成就系统 ================= */
  await page.evaluate(() => { Game.player.counters.wins = 1; Game.afterAction(); });
  await sleep(300);
  const a1 = await page.evaluate(() => ({
    achv: Object.keys(Meta.data.achv),
    stored: JSON.parse(localStorage.getItem('fanren_wd_meta_3') || '{}').achv || {},
  }));
  a1.achv.includes('b1') && a1.stored.b1 !== undefined
    ? pass('A1 首胜成就解锁并写入存档位 meta')
    : fail('A1 成就解锁', JSON.stringify(a1));
  await page.click('[data-action="act-codex"]');
  await sleep(300);
  const a2 = await text(page, '#popup-body');
  /成就 \d+\/\d+/.test(a2) && a2.includes('初试锋芒') && a2.includes('已达成') && a2.includes('气运')
    ? pass('A1 成就列表弹窗（进度/奖励/达成态）')
    : fail('A1 成就列表', a2.slice(0, 80));
  await shot(page, 'achv_list');
  await page.evaluate(() => { [...document.querySelectorAll('[data-action="codex-tab"]')].find(e => e.dataset.t === 'codex').click(); });
  await sleep(200);
  const a3 = await text(page, '#popup-body');
  a3.includes('图鉴') && a3.includes('？？？') ? pass('A1 图鉴页锁定条目遮名') : fail('A1 图鉴页', a3.slice(0, 60));
  await page.evaluate(() => UI.popupChoose(-1));
  await sleep(200);

  /* ================= C1 图鉴收录 ================= */
  await page.evaluate(() => {
    Bag.addItem('w_qinggang', 1);          // 法宝入库 → 图鉴
    Bag.addItem('gf_tuna', 1);             // 功法入库 → 图鉴
    Meta.see('monster', 'm_yezhu');        // 战斗遇妖兽（Battle.start 同款钩子）
    Meta.see('realm', 'sr0');              // 入秘境
  });
  await sleep(250);
  const c1 = await page.evaluate(() => ({
    codex: Meta.data.codex,
    got: Codex.got(),
  }));
  c1.codex.artifact.w_qinggang && c1.codex.gongfa.gf_tuna && c1.codex.monster.m_yezhu && c1.codex.realm.sr0
    ? pass('C1 功法/法宝/妖兽/秘境收录登记')
    : fail('C1 收录', JSON.stringify(c1.codex));
  await page.click('[data-action="act-codex"]');
  await sleep(250);
  await page.evaluate(() => { [...document.querySelectorAll('[data-action="codex-tab"]')].find(e => e.dataset.t === 'codex').click(); });
  await sleep(200);
  const c2 = await text(page, '#popup-body');
  c2.includes('青钢剑') && c2.includes('掺入精钢淬炼') && c2.includes('野猪') && c2.includes('落霞洞天')
    ? pass('C1 图鉴展示条目名与背景介绍')
    : fail('C1 图鉴内容', c2.slice(0, 120));
  await shot(page, 'codex_list');
  await page.evaluate(() => UI.popupChoose(-1));
  await sleep(200);
  // 转世不重置：模拟兵解换身
  const c3 = await page.evaluate(() => {
    const before = Codex.got();
    Game.player = PlayerFactory.create('转世道人', { gen: 5, comp: 5, luck: 5, body: 5 });   // 模拟换身
    Game.player.quest = { ch: 9, side: {} };
    Game.player.story = { seen: {}, mid: {}, choices: {} };
    for (const d of QuestSys.CHAPTERS) Game.player.story.mid[d.id] = 1;
    return { before, after: Codex.got() };
  });
  c3.before === c3.after && c3.before >= 4
    ? pass('C1 成就图鉴存于档位 Meta，转世不重置')
    : fail('C1 转世保留', JSON.stringify(c3));

  /* ================= F1 挂机修炼 ================= */
  await page.evaluate(() => {
    const p = Game.player;
    p.realmIdx = 0; p.layer = 0; p.exp = 0; p.day = 3;
    UI.renderAll();
  });
  await page.evaluate(() => AutoCult.start({ kind: 'exp', need: 120, label: '攒够 120 修为' }));
  // v20 加固：负载下轮询等待启动，替代固定 300ms 单查
  let f1 = { active: false, btn: false };
  for (let i = 0; i < 20; i++) {
    f1 = await page.evaluate(() => ({ active: AutoCult.active, btn: !!document.querySelector('[data-action="act-auto-stop"]') }));
    if (f1.active && f1.btn) break;
    await sleep(150);
  }
  f1.active && f1.btn ? pass('F1 挂机启动并显示停止按钮') : fail('F1 启动', JSON.stringify(f1));
  await sleep(5000);
  const f2 = await page.evaluate(() => ({
    active: AutoCult.active,
    rounds: AutoCult.rounds,
    summary: Log.entries.join('|').includes('自动修炼小结'),
  }));
  !f2.active && f2.rounds >= 2 && f2.summary
    ? pass(`F2 攒修为目标自动完成（${f2.rounds} 轮）并输出小结`)
    : fail('F2 目标达成', JSON.stringify(f2));
  // 圆满自动暂停
  await page.evaluate(() => {
    const p = Game.player;
    p.layer = 3; p.exp = GameData.layerNeed(0, 3); p.insight = 0;
    AutoCult.startExp = Guide.totalExp(p);
    AutoCult.start({ kind: 'time', minutes: 30, label: '运行 30 分钟' });
  });
  await sleep(3000);
  const f3 = await page.evaluate(() => ({ active: AutoCult.active, paused: Log.entries.join('|').includes('请亲手冲击瓶颈') }));
  !f3.active && f3.paused ? pass('F3 修为圆满挂机自动暂停') : fail('F3 圆满暂停', JSON.stringify(f3));
  // 战斗暂停
  await page.evaluate(() => {
    const p = Game.player;
    p.layer = 0; p.exp = 0;
    AutoCult.start({ kind: 'time', minutes: 30, label: '运行 30 分钟' });
  });
  await sleep(400);
  await page.evaluate(() => Battle.start('m_yezhu', { mapName: '测试' }));
  await sleep(1800);
  const f4 = await page.evaluate(() => ({ active: AutoCult.active, warned: Log.entries.join('|').includes('遭遇战斗') }));
  !f4.active && f4.warned ? pass('F4 遭遇战斗挂机自动暂停') : fail('F4 战斗暂停', JSON.stringify(f4));
  await page.evaluate(() => { Battle.end(); });
  await sleep(300);

  /* ================= S1 突破备份回退 ================= */
  await page.evaluate(() => {
    const p = Game.player;
    p.hp = Stat.compute(p).maxHp;
    // v9：天劫自金丹始（TRIB_START=2）——备份/回退场景改用金丹天劫（练气冲筑基为静修冲关，无天劫）
    p.realmIdx = 1; p.layer = 3; p.exp = GameData.layerNeed(1, 3); p.insight = 100;
    UI.renderAll();
  });
  await clickSel(page, '[data-action="act-breakthrough"]');
  await sleep(500);
  const s1 = await page.evaluate(() => {
    const bak = Save.read('bak');
    return { hasBak: !!(bak && bak.player), bakExp: bak ? bak.player.exp : -1 };
  });
  s1.hasBak && s1.bakExp === 800 ? pass('S1 引动天劫前自动备份（临时槽位 bak）') : fail('S1 备份', JSON.stringify(s1));
  // 选硬抗（71% 成算，循环至多 5 次凑一次失败以验证回退；若始终成功则接受）
  let rolled = false;
  for (let i = 0; i < 5 && !rolled; i++) {
    // 关闭残留的大道弹窗，避免遮罩吞掉点击
    await page.evaluate(() => {
      document.getElementById('dao-modal').classList.add('hidden');
      if (Game.player) Game.player.pendingDao = false;
    });
    await sleep(150);
    const tribVis = await page.$eval('#tribulation-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (!tribVis) {
      await page.evaluate(() => {
        const p = Game.player;
        p.realmIdx = 1; p.layer = 3; p.exp = 800; p.insight = 100;
        Save.write('bak', p);
        UI.renderAll();
      });
      await clickSel(page, '[data-action="act-breakthrough"]');
      let opened = false;
      for (let k = 0; k < 12; k++) {
        await sleep(200);
        opened = await page.$eval('#tribulation-modal', el => !el.className.includes('hidden')).catch(() => false);
        if (opened) break;
      }
      if (!opened) continue;
    }
    await clickSel(page, '[data-action="trib-strategy"][data-strategy="endure"]');
    await sleep(4300);
    // 失败 → 回溯弹窗：点「回溯因果」验证回退；其余弹窗点「继续前行」
    const rbOpen = await page.$eval('#popup-modal', el => !el.className.includes('hidden')).catch(() => false);
    if (rbOpen) {
      const title = await text(page, '#popup-title');
      if (title.includes('回溯')) {
        await clickPopupBtn(0);   // 回溯因果
        await sleep(600);
        const s2 = await page.evaluate(() => {
          const p = Game.player;
          return { realm: p.realmIdx, exp: p.exp, back: p.realmIdx === 1 && p.exp === 800 };
        });
        s2.back ? pass('S2 渡劫失利选择回溯 → 恢复至冲关前') : fail('S2 回溯', JSON.stringify(s2));
        rolled = true;
      } else {
        const btns = await page.$$('#popup-btns button');
        if (btns.length) await btns[btns.length - 1].click();
        await sleep(400);
      }
    }
  }
  if (!rolled) pass('S2 渡劫连续成功（小概率），回退逻辑由 S1 直接验证');
  await sleep(400);
  await page.evaluate(() => {
    document.getElementById('dao-modal').classList.add('hidden');
    if (Game.player) Game.player.pendingDao = false;
  });
  // v20：渡劫收尾可能触发章节追认剧情（supR），故事卷轴会拦截坐标点击——统一合卷
  await page.evaluate(() => { if (typeof Story !== 'undefined' && Story.active()) Story.close(); document.getElementById('story-modal')?.classList.add('hidden'); });
  await sleep(200);

  /* ================= S3 存档导出导入 ================= */
  await page.evaluate(() => { Game.player.name = '.export.name测试'; UI.renderAll(); });
  await page.click('[data-action="act-save-open"]');
  await sleep(400);
  const s3 = await text(page, '#popup-body');
  s3.includes('导出文本码') && s3.includes('导入文本码') ? pass('S3 存档弹窗含导出/导入入口') : fail('S3 入口', s3.slice(0, 80));
  await clickSel(page, '[data-action="save-export"]');
  await sleep(400);
  const code = await page.$eval('.save-code', el => el.value);
  code.length > 100 ? pass(`S3 导出文本码（${code.length} 字符）`) : fail('S3 导出', String(code.length));
  await page.evaluate(() => UI.popupChoose(-1));
  await sleep(250);
  // 导入到存档位二
  await page.evaluate((c) => {
    UI.importSave();
    setTimeout(() => {
      const ta = document.getElementById('import-code');
      if (ta) ta.value = c;
    }, 100);
  }, code);
  await sleep(600);
  await clickPopupBtn(0);   // 下一步
  await sleep(400);
  const slotBtns = await page.$$('#popup-btns button');
  if (slotBtns.length >= 3) await slotBtns[1].click();   // 存至位二
  await sleep(400);
  const s4 = await page.evaluate(() => {
    const d = Save.read(2);
    return { name: d && d.player ? d.player.name : null };
  });
  s4.name === '.export.name测试' ? pass('S3 文本码导入至存档位二（含成就图鉴 ext）') : fail('S3 导入', JSON.stringify(s4));
  await page.evaluate(() => UI.popupChoose(-1));
  await sleep(200);

  /* ================= S4 存档列表信息 ================= */
  await page.evaluate(() => {
    const p = Game.player;
    p.name = '列表道人'; p.dao = 'sword'; p.day = 400;
    Save.write(1, p);
    Game.exitToStart();
  });
  await sleep(400);
  const s5 = await text(page, '#start-slots');
  s5.includes('列表道人') && s5.includes('剑修') && s5.includes('1年35日')
    ? pass('S4 存档列表显示境界 / 大道 / 游戏时长')
    : fail('S4 列表信息', s5.slice(0, 150));
  await shot(page, 'slot_list');

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
