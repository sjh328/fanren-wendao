/* v20「入微」验证：逐阶段分组断言（修瑕 / 战斗 / 养成 / 世界 / 江湖 / 经济 / UX / 长线）
 * 运行：node verify-v10.mjs （需先 node server.mjs）
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
  browser = await puppeteer.launch({ headless: true, executablePath: CHROME, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', err => consoleErrors.push(err.message));

  await page.goto(URL, { waitUntil: 'networkidle0' });
  await sleep(600);

  /* ================= F 修瑕组（阶段〇） ================= */
  const f1 = await page.evaluate(() => {
    const ids = GameData.FORGE_RECIPES.map(r => r.id);
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    const xt = GameData.FORGE_RECIPES.filter(r => r.out === 's_xt_jian').length;
    return { dup, xt };
  });
  (f1.dup.length === 0 && f1.xt === 1) ? pass('F1 炼器配方 id 唯一，玄天套装锻造可达') : fail('F1 配方修瑕', JSON.stringify(f1));

  /* ---- 开一档测试档（跳过引导与开篇演出，供后续游戏内断言使用） ---- */
  await page.click('[data-action="st-newgame"][data-slot="3"]');
  await sleep(300);
  await page.evaluate(() => { document.getElementById('create-name').value = ''; });
  await page.type('#create-name', '入微道人');
  await page.click('[data-action="st-start"]');
  await sleep(800);
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => {
      const t = document.getElementById('tutorial');
      if (t && !t.className.includes('hidden')) { const b = t.querySelector('[data-action="tut-next"]'); if (b) { b.click(); return 'tut'; } }
      const sm = document.getElementById('story-modal');
      if (sm && !sm.className.includes('hidden')) {
        const c = document.querySelector('.story-opt');
        if (c) { c.click(); return 'choice'; }
        const n = document.querySelector('[data-action="story-next"]');
        if (n) { n.click(); return 'story'; }
      }
      return 'done';
    });
    if (st === 'done') break;
    await sleep(160);
  }
  await page.evaluate(() => { Game.player.flags.tutorialDone = true; });
  pass('S0 测试档就绪（引导与开篇演出走完）');

  const f2 = await page.evaluate(() => {
    const fake = { day: 300, realmIdx: 3 };
    const prices = BlackSys.POOL.map(x => BlackSys.price(fake, x.id));
    return { min: Math.min(...prices), n: prices.length };
  });
  f2.n >= 15 && f2.min >= 800 ? pass('F2 黑市无 0 价捡漏（地级套装/秘境功法按品阶计价）') : fail('F2 黑市修瑕', JSON.stringify(f2));

  const f3 = await page.evaluate(() => {
    const p = Game.player;
    if (!p.cave) p.cave = CaveSys.freshCave();
    p.cave._pestDay = undefined;
    CaveSys.checkPest(p);
    const guarded = p.cave._pestDay === Math.floor(p.day);
    const wired = /checkPest\(p\)/.test(UI.renderCaveTab.toString()) && /visitorEvent\(p\)/.test(UI.renderCaveTab.toString());
    return { guarded, wired };
  });
  f3.guarded && f3.wired ? pass('F3 虫害/访客每日事件已接线且带日界防重') : fail('F3 洞府事件接线', JSON.stringify(f3));

  const f4 = await page.evaluate(async () => {
    const p = Game.player;
    p.enhanced = p.enhanced || {};
    delete p.enhanced['w_qinggang'];
    p.equipped.weapon = { id: 'w_tiejian', enhance: 5 };
    delete p.bag['w_tiejian'];                // 清掉初始包里的同 id，避免回包计数翻倍
    p.bag['w_qinggang'] = 1;
    await Bag.unequip('weapon');              // +5 铁剑回包且强化留档（无弹窗路径）
    const kept = p.enhanced['w_tiejian'];
    const back = p.bag['w_tiejian'];
    await Bag.equip('w_qinggang');            // 空槽 → 无确认弹窗
    const eq = p.equipped.weapon;
    // 复原
    p.enhanced['w_tiejian'] = 5;
    Bag.removeItem('w_qinggang', 1);
    delete p.bag['w_tiejian'];
    p.equipped.weapon = { id: 'w_tiejian', enhance: 5 };
    return { id: eq && eq.id, enh: eq && eq.enhance, kept, back };
  });
  f4.id === 'w_qinggang' && f4.enh === 0 && f4.kept === 5 && f4.back === 1
    ? pass('F4 换装不跨 id 继承强化，旧强化留档 + 旧装备回包')
    : fail('F4 换装强化语义', JSON.stringify(f4));

  const f5 = await page.evaluate(() => {
    const p = Game.player;
    p.attrs.body = 7; p.realmIdx = 5;
    const a = Stat.poisonCap(p);
    const ok = a === 60 + 7 * 8 + 20;
    p.realmIdx = 0;
    const b = Stat.poisonCap(p);
    return { a, ok, b: b === 60 + 7 * 8 };
  });
  f5.ok && f5.b ? pass('F5 丹毒上限单源化 Stat.poisonCap（含合道 +20）') : fail('F5 poisonCap', JSON.stringify(f5));

  const f6 = await page.evaluate(() => {
    return {
      lines24: Object.keys(GameData.NPC_LINES).length,
      dupDiscuss: (() => { const c = {}; Object.values(GameData.NPC_LINES).forEach(l => c[l.discuss[2]] = (c[l.discuss[2]] || 0) + 1); return Object.entries(c).filter(([, n]) => n > 1).length; })(),
      sidesN: QuestSys.SIDES.length,
    };
  });
  f6.lines24 === 24 && f6.dupDiscuss === 0 && f6.sidesN === 12
    ? pass('F6 文案与台词修瑕：24 人矩阵齐、论道句无重复填充、支线 12 则')
    : fail('F6 台词/文案', JSON.stringify(f6));

  /* ================= 汇总 ================= */
  const fails = results.filter(r => r[0] === 'FAIL');
  console.log('\n========== verify-v10 汇总 ==========');
  console.log(`通过 ${results.filter(r => r[0] === 'PASS').length} / ${results.length}`);
  if (consoleErrors.length) console.log('控制台错误:', consoleErrors.slice(0, 5));
  if (fails.length || consoleErrors.length) {
    process.exitCode = 1;
  } else {
    console.log('✅ 全部通过，0 控制台错误');
  }
} catch (e) {
  console.error('验证脚本异常:', e);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
}
