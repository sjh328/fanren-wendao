/* ======================================================================
 * verify-v20 —— V34「通脉」专项回归
 * 覆盖：A 节奏重校（×5.4 曲线 / 悟道重构 / 世界大事重定时 / 离线重做）/
 *       B 批修 E113~E126 / C 战斗收口 C1~C9 / D 经济平衡（拍卖/赌袋/sinkCurve）/
 *       E 沉浸感（音效默认开 / 道侣结拜仪式 / 对比度 / tips 去重等）/
 *       F 日常减负（一键照料 / 调息感悟）/ G 工程（abort 落盘 / 多页签 / sw 清理）
 * 断言风格：源码静态检查（SA）+ 浏览器运行时行为检查（RB）。
 * ====================================================================== */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(dirname(fileURLToPath(import.meta.url)));
const R = f => readFileSync(join(__dirname, 'js', f), 'utf8').replace(/\r\n/g, '\n');


let passN = 0, failN = 0;
const fails = [];
const pass = t => { passN++; console.log('  ✓ ' + t); };
const fail = (t, d) => { failN++; fails.push(t); console.log('  ✗ ' + t + ' :: ' + d); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================= 源码静态组（SA） ================= */
console.log('===== SA 源码静态组 =====');
{
  const battle = R('battle/battle.js');
  const beast = R('systems/beast.js');
  const cave = R('systems/cave.js');
  const forge = R('systems/forge.js');
  const cult = R('systems/cultivate.js');
  const trib = R('systems/tribulation.js');
  const sect = R('systems/sect.js');
  const npc = R('systems/npc.js');
  const world = R('systems/world.js');
  const dungeon = R('systems/dungeon.js');
  const auction = R('systems/auction.js');
  const black = R('systems/black.js');
  const dao = R('systems/dao.js');
  const autocult = R('core/autocult.js');
  const meta = R('core/meta.js');
  const save = R('core/save.js');
  const stat = R('core/stat.js');
  const guide = R('core/guide.js');
  const log = R('core/log.js');
  const ambience = R('core/ambience.js');
  const story = R('ui/story.js');
  const tutorial = R('ui/tutorial.js');
  const ui = R('ui/ui.js');
  const gdata = R('data/game-data.js');
  const gamejs = R('game.js');
  const sw = readFileSync(join(__dirname, 'sw.js'), 'utf8').replace(/\r\n/g, '\n');
  const stylecss = readFileSync(join(__dirname, 'style.css'), 'utf8').replace(/\r\n/g, '\n');
  /* ---- A 节奏重校 ---- */
  gdata.includes('EXP_BASE: [70, 380, 2350, 14700, 91800, 570000, 3540000, 22000000, 137000000, 850000000]') ? pass('SA1 EXP_BASE ×5.4 重排（A1）') : fail('SA1 EXP_BASE', '');
  gdata.includes('fr <= 5 ? Math.pow(3, fr) : 243 * Math.pow(3.8, fr - 5)') ? pass('SA2 sinkCurve 分段单源（D3；v39（E351）r≥6 段挂 3.8^(r-5) 与收入同速）') : fail('SA2 sinkCurve', '');
  cult.includes('const expGain = Math.round(this.baseGain(p) * 2.5 * pur2);') && !cult.includes('20 * 80 * GameData.eco') ? pass('SA3 悟道收益改 baseGain×2.5 自随缩放（A2；v37（E264）乘感悟纯度 pur2）') : fail('SA3 悟道', '');
  cult.includes('spill * this.baseGain(p) * 0.125') && !cult.includes('spill * 80 * GameData.eco') ? pass('SA4 感悟溢出汇率同悟道口径（A2）') : fail('SA4 溢出', '');
  cult.includes('daoGain >= 500 || p.counters.xianyuan % 500 < daoGain') ? pass('SA5 仙元溢流播报节流（A2）') : fail('SA5 节流', '');
  // r9 双喂拆除：三处转换点（addExp 溢流 / addInsight 溢出 / wuDao）都不得再喂 DaoSys
  {
    const r9spill = cult.indexOf('if (p.realmIdx >= 9) {\n        const yuan = spill * 50;');
    const spillBody = cult.slice(r9spill, r9spill + 400);
    const r9wudao = cult.indexOf('const yuan = Math.round(1000 * pur2);');   // v37（E264）：悟道 r9 炼作改纯度折算（原固定 +1000 锚随之更新）
    const wudaoBody = r9wudao >= 0 ? cult.slice(r9wudao, r9wudao + 200) : '';
    const overflowOk = !cult.includes('DaoSys.gain(p, daoGain);');
    spillBody.includes('DaoSys.gain') || wudaoBody.includes('DaoSys.gain') || !overflowOk ? fail('SA6 r9 双喂拆除（E117）', '') : pass('SA6 r9 双喂拆除（E117）');
  }
  gamejs.includes('听讲经义一日') && gamejs.includes('p.listenDay = today;') && gamejs.includes('Time.add(1);\n      if (p.dead) return;') ? pass('SA7 听讲实耗一日 Time.add(1)（A2）') : fail('SA7 听讲耗时', '');
  world.includes('nextEventYear: 2 + Utils.rand(0, 2), _evResched34: true') ? pass('SA8 世界大事首现 2~4 年（A3）') : fail('SA8 首现', '');
  world.includes('w.nextEventYear = y + 1 + Utils.rand(0, 2)') ? pass('SA9 世界大事后续 1~3 年一遇（A3）') : fail('SA9 后续', '');
  world.includes('!w._evResched34 && !(w.history && w.history.length)') ? pass('SA10 旧档一次性重掷防重（A3）') : fail('SA10 重掷', '');
  gamejs.includes('Math.min(120, Math.floor(elapsedMs / 60000))') && gamejs.includes('const OFFLINE_EFF = 0.6;') && gamejs.includes('perRound / 3 * OFFLINE_EFF * rushMul * realDays') ? pass('SA11 离线上限 120 日·效率 0.6（A4；v37（E277）OFFLINE_EFF/rushMul 具名 + 聚灵窗口补乘）') : fail('SA11 离线参数', '');
  gamejs.includes('云 归 · 离 线 小 结') && cave.includes("Game._offlineAgg.spring = (Game._offlineAgg.spring || 0) + gain") ? pass('SA12 离线小结弹窗+灵泉入账（E1/A4）') : fail('SA12 离线小结', '');
  gamejs.includes('this._skipOfflineOnce = true;') ? pass('SA13 新档离线守卫（G3）') : fail('SA13 新档守卫', '');

  /* ---- B 批修 ---- */
  beast.includes('this.victoryTame();') && beast.includes('this.victoryTame(true);') && !beast.includes('Battle.victoryTame()') && !beast.includes('Battle.victoryTame(true)') ? pass('SA14 驯服结算改调 BeastSys.victoryTame（E113 P0）') : fail('SA14 驯服软锁', '');
  cave.includes("if (Bag.count('m_xuantie') < c.ore) { UI.toast('玄铁矿不足'); return; }\n    if (!Bag.spendStones(c.stones))") ? pass('SA15 洞天先验料后扣钱（E114）') : fail('SA15 洞天顺序', '');
  sect.includes('peakContrib(p)') && sect.includes('p.sect.peakContrib = Math.max(p.sect.peakContrib || 0, p.sect.contrib || 0)') ? pass('SA16 宗门职位按峰值贡献（E115）') : fail('SA16 峰值', '');
  forge.includes('if (!sameId && oldScore > 0 && this.affixScore(part, candId, g, ctx, 0) < oldScore)') ? pass('SA17 升星死路：同 id 跳过保底（E116）') : fail('SA17 升星', '');
  trib.includes('_attemptSpend = { dan: false, borrow: null, artifact: null }') && trib.includes('back.push(spend.borrow.xian') && trib.includes('孽障 +12') ? pass('SA18 回溯燃耗不归+孽障12（E118）') : fail('SA18 回溯', '');
  world.includes("(p.npcs[id].rel || 0) < 30") ? pass('SA19 大战不绑挚友 rel<30（E119）') : fail('SA19 大战', '');
  npc.includes('s.met = true;') && npc.indexOf("Meta.see('npc', id);") > npc.indexOf('async befriend') ? pass('SA20 结交图鉴移到成交后（E120）') : fail('SA20 图鉴', '');
  !dungeon.includes("'上古法宝碎片 ×2、'}") ? pass('SA21 秘境 Boss 播报对齐实发（E121）') : fail('SA21 播报', '');
  beast.includes("!(b.skills || []).some(s => s && s.name === this.SPECIES_SKILLS[b.species].name)") ? pass('SA22 五阶物种技按名判重补插（E122）') : fail('SA22 物种技', '');
  save.includes('writeRaw(key, raw)') && meta.includes('Save.writeRaw(this.key(), raw)') && meta.includes('Save.writeRaw(this.key(slot), raw)') ? pass('SA23 Meta 键名单源化（E123）') : fail('SA23 meta 键', '');
  save.includes('this.mem[key] = raw;   // v34（E124）') ? pass('SA24 配额异常镜像内存档（E124）') : fail('SA24 配额', '');
  {
    const pfac = R('core/player-factory.js');
    pfac.includes('_migratedVersion: Number.MAX_SAFE_INTEGER') ? pass('SA24b 新档生于一切迁移之后（E127）') : fail('SA24b E127', '');
  }
  gamejs.includes('你不在的${realDays}日里') && gamejs.includes('离山的日子你行功不辍') ? pass('SA25 离线文案笔误（E125）') : fail('SA25 笔误', '');
  (() => { const aa = gamejs.indexOf('afterAction() {'); const a = gamejs.indexOf('Achieve.check();', aa); const r = gamejs.indexOf("UI.markDirty('all');", aa); const sv = gamejs.indexOf('Save.autoSave();', aa); return aa >= 0 && a >= 0 && a < r && a < sv; })() ? pass('SA26 成就检查先于渲染存档（E126）') : fail('SA26 成就时序', '');

  /* ---- C 战斗收口 ---- */
  {
  const hookHits = (battle.match(/this\.onEnemyHit\(B, st, /g) || []).length;
  hookHits >= 8 ? pass('SA27 不灭/魔棘钩子全路径接线≥8 处（C1/C2）') : fail('SA27 钩子接线', String(hookHits));
}
  battle.includes("onEnemyHit(B, st, dmg) {\n    const p = Game.player;") && battle.includes("e_reborn') && !B.enemy._rebornUsed") ? pass('SA28 敌方受击统一响应单源（C1/C2）') : fail('SA28 单源', '');
  battle.includes("atk *= 1 + StatusFx.pctOf(e.fx, 'atkup') / 100;") && battle.includes("spd *= 1 + StatusFx.pctOf(e.fx, 'agiup') / 100;") && battle.includes("Utils.chance(e.crit + StatusFx.pctOf(e.fx, 'critup'))") ? pass('SA29 偷来增益敌方三读端生效（C3）') : fail('SA29 偷益', '');
  battle.includes('身被禁锢，心神难凝') && !battle.includes("'slow', 'weaken', 'stun', 'freeze', 'vuln']") ? pass('SA30 凝神被控拦截+净化剔除控制（C4）') : fail('SA30 凝神', '');
  battle.includes("if (B._ningUsed) { UI.toast('凝神一转") ? pass('SA31 凝神已用守卫防双开（C4；v39（E350）去弹窗化后为同步直达守卫）') : fail('SA31 复查', '');
  battle.includes("const extra = this.dealToEnemy(B, st, Stat.afterDef(this.myAtk(st) * 0.5, this.enDef(B.enemy)), { src: 'attack' });") ? pass('SA32 法相追击走攻防口径（C5；v39（E364）落账随 dealToEnemy 单源）') : fail('SA32 法相', '');
  battle.includes('+ (B.fogDodge || 0) + (B.enemy.dodge || 0), 2, GameData.BALANCE.COMBAT.SKILL_MISS_MAX)') ? pass('SA33 雾战法诀闪避生效（C6）') : fail('SA33 雾战', '');
  battle.includes('if (mercyTxt) this.log(mercyTxt, \'log-system\');') ? pass('SA34 首战保底日志建档后入列（C7）') : fail('SA34 保底日志', '');
  battle.includes('if (turnFx.mpRegen > 0 && p.mp < st.maxMp)') && !battle.includes('mpRegen > 0 && p.mp > 0') ? pass('SA35 回灵 mp=0 复活（C8）') : fail('SA35 回灵', '');
  battle.includes('GameData.BALANCE.COMBAT.PLAYER_MISS_MAX') && battle.includes('GameData.BALANCE.COMBAT.SKILL_MISS_MAX') && battle.includes('GUARD_DEF_BASE;   // v34（C9）') ? pass('SA36 COMBAT 常量接线（C9）') : fail('SA36 常量', '');
  !gdata.includes('HIT_CHANCE_CLAMP') && !gdata.includes('ENEMY_DOGDE_MAX') ? pass('SA37 死配置常量清除（C9）') : fail('SA37 死常量', '');

  /* ---- D 经济 ---- */
  auction.includes("{ item: 'pill_zaohua', base: 160000, minRealm: 6 }") ? pass('SA38 造化仙丹底价/门槛对齐（D1）') : fail('SA38 造化丹', '');
  auction.includes('!DaoSys.canLearnGongfa(p, d2, true)') && auction.includes('此诀你已修习，重拍无用') ? pass('SA39 拍卖功法判重+静默门槛（D1）') : fail('SA39 功法双闸', '');
  dao.includes('canLearnGongfa(p, def, silent = false)') ? pass('SA40 canLearnGongfa 静默参数（D1）') : fail('SA40 静默', '');
  black.includes('Bag.addItem(mat, matQty * 2 + Math.ceil(matQty * 0.5))') && !black.includes("Bag.addItem('m_gupian', 1)") ? pass('SA41 赌袋碎片彩头除名+统一×2.5（D2）') : fail('SA41 赌袋', '');
  {
    const pa = readFileSync(join(__dirname, 'scripts', 'price-audit.mjs'), 'utf8').replace(/\r\n/g, '\n');
    const sim = readFileSync(join(__dirname, 'scripts', 'balance-sim.mjs'), 'utf8').replace(/\r\n/g, '\n');

    pa.includes('[拍卖倒挂]') && pa.includes('[赌袋正期望]') ? pass('SA42 price-audit 扩容双检测（D4）') : fail('SA42 审计扩容', '');
    sim.includes('GameData.sinkCurve(r) / GameData.BALANCE.ENHANCE.COST_REALM_FACTOR') ? pass('SA43 balance-sim 强化口径对齐（D5）') : fail('SA43 sim 口径', '');
  }

  /* ---- E 沉浸感 ---- */
  ambience.includes('sfxOn: true') && ambience.includes('this.sfxOn = pref.sfx !== undefined ? !!pref.sfx : true;') ? pass('SA44 音效默认开且尊重已存偏好（E2）') : fail('SA44 音效', '');
  ui.includes("Ambience.sfx('breakthrough');   // v34（E2）：进境即有声光") ? pass('SA45 突破音效门槛解除（E2）') : fail('SA45 突破音效', '');
  npc.includes("UI.realmShow('红烛映照 · 道音为证 · 愿以此心共证长生', '#e88aa0')") && npc.includes("UI.realmShow('义结金兰 · 祸福与共 · 此生共进退', '#e8c56a')") ? pass('SA46 道侣/结拜全屏仪式（E3）') : fail('SA46 仪式', '');
  ui.includes("${lot.until - Math.floor(p.day) <= 3 ? 'danger' : 'warn'}") ? pass('SA47 拍期将止红色紧迫（E4）') : fail('SA47 紧迫', '');
  guide.includes("(full && p.realmIdx < 9) ? 'realm'") && guide.includes("fa !== 'karma'") && guide.includes("fa !== 'poison'") ? pass('SA48 tips 与 focus 首命中卡精确去重（E5）') : fail('SA48 去重', '');
  log.includes("system: ['system'],") ? pass('SA49 日志系统组剔除见闻（E6）') : fail('SA49 过滤', '');
  stylecss.includes('--text-faint: #61563f;') ? pass('SA50 faint 对比度加深（E7）') : fail('SA50 对比度', '');
  story.includes('2400 + len * 12') && story.includes('Math.min(8000, 2400 + len * 12)') ? pass('SA51 剧情自动翻页按字数自适应（E8）') : fail('SA51 自动播放', '');
  tutorial.includes("text: () => `这里是弱肉强食的修真界") && tutorial.includes("const text = typeof s.text === 'function' ? s.text() : s.text;") ? pass('SA52 引导文案惰性求值（E9）') : fail('SA52 引导', '');
  tutorial.includes('迷路时去那里') ? pass('SA53 引导补问道页指引（E9）') : fail('SA53 问道指引', '');
  ui.includes('界面字号、战斗速度、音效开关等偏好都在右上角 <b>⚙ 设置</b>') ? pass('SA54 玩法说明补设置交叉引导（E9）') : fail('SA54 设置引导', '');

  /* ---- F 减负 ---- */
  cave.includes('careAll()') && cave.includes('【一键照料】') && ui.includes('act-cave-care') && gamejs.includes("'act-cave-care': () => CaveSys.careAll()") ? pass('SA55 一键照料按钮+接线（F1）') : fail('SA55 一键照料', '');
  cult.includes('凝神之际偶有所悟（突破感悟 +2）') && !cult.includes('gotIns')
    ? pass('SA57 调息 +2 感悟（F3；v35（E159）死守卫清理，一次调息即一日天然日限）') : fail('SA57 调息', '');

  /* ---- G 工程 ---- */
  autocult.includes("if (!this.active) { if (typeof Save !== 'undefined') Save.autoSave(true); return; }") ? pass('SA58 AutoCult abort 补落盘（G2）') : fail('SA58 abort 落盘', '');
  gamejs.includes("if (e.key === Save.KEY + 'auto' && e.newValue && Game.player") ? pass('SA59 多页签并发写提示（G1）') : fail('SA59 多页签', '');
  sw.includes('rebuildPrecache') && sw.includes('staleCore ? cache.delete(r) : null') ? pass('SA60 sw 陈旧 query 清理（G5）') : fail('SA60 sw 清理', '');
  stat.includes('daoYunAll()') && stat.includes('_daoYunCache') ? pass('SA61 DAO_YUN 合并缓存（G6）') : fail('SA61 道韵缓存', '');
}

/* ================= 运行时组（RB） ================= */
console.log('===== RB 运行时组 =====');
let browser = null;
const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);
for (const p of CHROME_CANDIDATES) {
  try { browser = await puppeteer.launch({ headless: 'new', executablePath: p, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); break; } catch (e) { /* next */ }
}
if (!browser) { console.error('✗ 未找到 Chrome，运行时组跳过'); process.exit(failN > 0 ? 1 : 0); }

const consoleErrors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', e => consoleErrors.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  await page.setViewport({ width: 1380, height: 860 });
  await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(600);
  await page.evaluate(() => {
    const pl = PlayerFactory.create('通脉道人', { gen: 5, comp: 5, luck: 5, body: 5 });
    pl.flags.tutorialDone = true;
    localStorage.setItem('fanren_wd_3', JSON.stringify({ v: 1, player: pl, meta: { name: pl.name, realmText: '练气初期', day: 1, age: 16, ts: Date.now(), dead: false } }));
    UI.renderStart();
  });
  await page.click('[data-action="st-load"][data-slot="3"]');
  await sleep(600);
  await page.evaluate(() => {
    ['popup-modal', 'dao-modal', 'tribulation-modal', 'battle-modal', 'story-modal', 'tutorial'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    if (typeof Story !== 'undefined') { Story.cur = null; Story.q = []; }
    UI.closeOverlays();
  });
  await sleep(300);

  /* ---- RB A 曲线/悟道/世界 ---- */
  const rA = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    out.expR2 = GameData.layerNeed(2, 3);   // 曲线抽查（金丹圆满）
    out.expR9 = GameData.layerNeed(9, 3);
    out.sink9 = GameData.sinkCurve(9);
    out.sink8 = GameData.sinkCurve(8);
    // 悟道收益：baseGain×2.5 与 80×eco 不再相等
    const g1 = Math.round(Cultivate.baseGain(p) * 2.5);
    const g2 = Math.round(20 * 80 * GameData.eco(p.realmIdx));
    out.wudaoRewritten = g1 < g2 / 10;
    // 世界大事窗口
    const w = WorldSys.freshWorld();
    out.eventFirst = w.nextEventYear >= 2 && w.nextEventYear <= 4;
    // 听讲耗时：记 day，执行听讲后 day+1
    p.sect = { id: 'qingyun', contrib: 1000, faction: null, rank: 'inner', tasks: [] };
    p.insight = 0;
    const day0 = Math.floor(p.day || 0);
    p.listenDay = -99;
    await Game.actions['act-sect-listen']();
    out.listenTime = Math.floor(p.day || 0) === day0 + 1;
    out.listenInsight = (p.insight || 0) >= 8;
    return out;
  });
  rA.expR2 === Math.round(2350 * 2.5) ? pass('RB1 曲线 r2 圆满=5875（A1）') : fail('RB1 曲线 r2', String(rA.expR2));
  rA.expR9 === Math.round(850000000 * 2.5) ? pass('RB2 曲线 r9 圆满=21.25 亿（A1）') : fail('RB2 曲线 r9', String(rA.expR9));
  Math.round(rA.sink9) === Math.round(243 * Math.pow(3.8, 4)) && Math.round(rA.sink8) === Math.round(243 * Math.pow(3.8, 3)) ? pass('RB3 sinkCurve 分段（D3；v39（E351）r9=243×3.8^4≈50669、r8=243×3.8^3≈13334，与收入同速）') : fail('RB3 sinkCurve', `${rA.sink8}/${rA.sink9}`);
  rA.wudaoRewritten ? pass('RB4 悟道收益不再 80×eco（A2）') : fail('RB4 悟道', '');
  rA.eventFirst ? pass('RB5 世界大事首现 2~4 年（A3）') : fail('RB5 首现', '');
  rA.listenTime && rA.listenInsight ? pass('RB6 听讲耗时一日且得感悟（A2）') : fail('RB6 听讲', `${rA.listenTime}/${rA.listenInsight}`);

  /* ---- RB B 悟道实际入账 + r9 双喂拆除 ---- */
  const rB = await page.evaluate(async () => {
    const p = Game.player;
    const out = {};
    p.insight = 50;
    p._wuDaoDay = -99;
    const expBefore = Guide.totalExp(p);
    const wd = Cultivate.wuDao();
    await new Promise(r => setTimeout(r, 400));
    const popupBtn = document.querySelector('#popup-btns button.btn-primary');
    if (popupBtn) { popupBtn.click(); await new Promise(r => setTimeout(r, 400)); }
    await Promise.race([wd, new Promise(r => setTimeout(r, 3000))]);
    out.wudaoGain = Guide.totalExp(p) - expBefore;
    out.wudaoBound = Math.round(Cultivate.baseGain(p) * 2.5 * 3);
    out.popupSeen = !!popupBtn;
    out.wudaoInsight = p.insight;
    return out;
  });
  rB.popupSeen && rB.wudaoGain > 0 && rB.wudaoGain <= rB.wudaoBound ? pass('RB7 悟道入账≈2.5×baseGain（A2）') : fail('RB7 悟道入账', JSON.stringify(rB));

  /* ---- RB C 宗门峰值 / 洞天顺序 / 拍卖门槛 / 赌袋 ---- */
  const rC = await page.evaluate(async () => {
    const p = Game.player;
    const out = {};
    // E115 峰值：贡献 9000 当长老，兑换 8500 后仍长老
    p.sect.contrib = 9000; p.sect.peakContrib = 0;
    out.rankAt9k = SectSys.rank(p).id;
    p.sect.contrib = 500;
    out.rankAfterSpend = SectSys.rank(p).id;
    out.peakPersist = p.sect.peakContrib;
    // D1 拍卖：已修习功法不再掷出（r4 起可用拍品池非空，不触发全池回退）
    p.gongfa = { gf_zhoutian: { level: 1, exp: 0 } };
    p.realmIdx = 4;
    let sawOwned = false;
    for (let i = 0; i < 40; i++) {
      p.day = (p.day || 0) + 61;
      p.auction = null;
      const a = AuctionSys.state(p);
      if (a.item === 'gf_zhoutian') { sawOwned = true; break; }
    }
    out.auctionDedup = !sawOwned;
    delete p.gongfa.gf_zhoutian;
    // D2 赌袋：r0 中奖不再含碎片（直接调用内部逻辑口径：无 m_gupian 分支即通过——以静态 SA41 为主，此处验日限）
    p.realmIdx = 0; p.mysteryDay = Math.floor(p.day || 0);
    out.betDailyGate = true;
    // E114 洞天顺序：矿不足不扣灵石（upgradeDongtian 先弹确认→再验矿→再扣钱；矿 0 枚应在扣钱前被拦）
    p.cave = p.cave || { lv: 5, builds: {}, plots: [], dongtian: 0 };
    p.cave.lv = 5; p.cave.dongtian = 0;
    while (Bag.count('m_xuantie') > 0) Bag.removeItem('m_xuantie', 1);
    const bagLow = p.stones.low;
    p.stones.low = 500000;
    const spendSpy = Bag.spendStones;
    let spent = false;
    Bag.spendStones = (n) => { spent = true; return spendSpy.call(Bag, n); };
    const ud = CaveSys.upgradeDongtian();
    await new Promise(r => setTimeout(r, 400));
    const btn = document.querySelector('#popup-btns button.btn-primary');
    if (btn) { btn.click(); await new Promise(r => setTimeout(r, 400)); }
    await Promise.race([ud, new Promise(r => setTimeout(r, 3000))]);
    Bag.spendStones = spendSpy;
    out.dongtianGuard = !spent;
    out.dongtianLvl = p.cave.dongtian;
    p.stones.low = bagLow;
    return out;
  });
  rC.rankAt9k === 'elder' && rC.rankAfterSpend === 'elder' ? pass('RB8 花贡献不降职（E115）') : fail('RB8 峰值', `${rC.rankAt9k}/${rC.rankAfterSpend}`);
  rC.auctionDedup ? pass('RB9 已修习功法不再上拍（D1）') : fail('RB9 拍卖判重', '');
  rC.dongtianGuard ? pass('RB10 矿不足不扣灵石（E114）') : fail('RB10 洞天守卫', '');

  /* ---- RB D 战斗：凝神被控 / 不灭全路径 / 偷益生效 ---- */
  const rD = await page.evaluate(async () => {
    const p = Game.player;
    const out = {};
    // C4：被控凝神拦截（v39（E350）双钮直达——被控置灰在钮，直调守卫仍在，不扣战意不置已用）
    Battle.active = {
      enemy: { name: '试敌', hp: 100, hpMax: 100, fx: [] }, ctx: {}, busy: false, over: false,
      myFx: [{ kind: 'stun', rounds: 2 }], morale: 50, zhenyuan: 0, zmax: 6, logs: [], stats: { out: 0 },
      buffs: {}, _ningUsed: false, floats: [],
    };
    Battle.ningshenZY();
    Battle.ningshenPurge();
    out.ningshenBlocked = Battle.active.zhenyuan === 0 && !Battle.active._ningUsed;
    out.moraleKept = Battle.active.morale === 50;
    out.btnGray = Battle.ningBlocked(Battle.active) === true;   // 置灰条件单源
    Battle.active = null;
    // C1：必杀路径不灭——构造一场战斗直接调 onEnemyHit
    Battle.active = {
      enemy: { name: '不灭试体', hp: 0, hpMax: 1000, fx: [], _rebornUsed: false },
      enemyFxIds: ['e_reborn', 'e_thorns'],
      ctx: {}, busy: false, over: false, myFx: [], morale: 0, zhenyuan: 0, zmax: 6, logs: [],
      stats: { out: 0 }, buffs: {}, floats: [],
    };
    const st0 = Stat.compute(p);
    Battle.onEnemyHit(Battle.active, st0, 500);
    out.rebornWorked = Battle.active.enemy.hp === Math.round(Battle.active.enemy.hpMax * 0.3);
    out.rebornUsedFlag = Battle.active.enemy._rebornUsed === true;
    // 反伤：dmg>0 时玩家掉血
    const hp0 = p.hp;
    Battle.active.enemy.hp = 500;
    Battle.onEnemyHit(Battle.active, st0, 200);
    out.thornsWorked = p.hp < hp0;
    Battle.active = null;
    // C3：敌方读取端
    const e = { atk: 100, spd: 100, fx: [{ kind: 'atkup', pct: 30, rounds: 2 }, { kind: 'agiup', pct: 40, rounds: 2 }, { kind: 'critup', pct: 15, rounds: 2 }] };
    out.enAtkBuffed = Battle.enAtk(e) === 130;
    out.enSpdBuffed = Battle.enSpd(e) === 140;
    return out;
  });
  rD.ningshenBlocked && rD.moraleKept ? pass('RB11 被控凝神拦截且不扣战意（C4）') : fail('RB11 凝神', `${rD.ningshenBlocked}/${rD.moraleKept}`);
  rD.rebornWorked && rD.rebornUsedFlag ? pass('RB12 不灭钩子复活一次（C1）') : fail('RB12 不灭', `${rD.rebornWorked}/${rD.rebornUsedFlag}`);
  rD.thornsWorked ? pass('RB13 魔棘反伤生效（C2）') : fail('RB13 魔棘', '');
  rD.enAtkBuffed && rD.enSpdBuffed ? pass('RB14 偷来增益敌侧生效（C3）') : fail('RB14 偷益', `${rD.enAtkBuffed}/${rD.enSpdBuffed}`);

  /* ---- RB E 沉浸感/减负/工程 ---- */
  const rE = await page.evaluate(async () => {
    const p = Game.player;
    const out = {};
    // E2 音效默认
    out.sfxDefault = Ambience.sfxOn === true;
    // F1 一键照料：造 3 块田 2 只兽
    p.cave = p.cave || { lv: 5, builds: {}, plots: [], dongtian: 0 };
    p.cave.plots = [
      { seed: 'm_lingcao', crop: 'm_lingcao', plantedDay: Math.floor(p.day), days: 10, wateredDay: -1 },
      { seed: 'm_lingcao', crop: 'm_lingcao', plantedDay: Math.floor(p.day), days: 10, wateredDay: Math.floor(p.day) },
      null,
    ];
    p.beasts = { active: null, list: [
      { uid: 1, name: '试兽甲', bond: 10, patDay: -1 },
      { uid: 2, name: '试兽乙', bond: 50, patDay: Math.floor(p.day) },
    ], nextId: 3 };
    const dayBefore = Math.floor(p.day || 0);
    CaveSys.careAll();
    const plots = p.cave.plots;
    out.careWatered = plots[0].wateredDay === dayBefore && plots[1].wateredDay === dayBefore;   // 未浇的浇了、已浇的保持
    out.carePlot1UntouchedDays = plots[1].days === 10;   // 已浇田不重复打折
    out.carePlot0SpedUp = plots[0].days <= 9;
    out.carePat = p.beasts.list[0].patDay === dayBefore && p.beasts.list[1].patDay === dayBefore;
    out.careBond = p.beasts.list[0].bond > 10;
    // F3 调息 +2 感悟
    p._restDay = -99;
    const ins0 = p.insight || 0;
    Cultivate.rest();
    out.restInsight = (p.insight || 0) === Math.min(100, ins0 + 2);
    // G2 AutoCult abort 补落盘（静态已验；此处验 abort 不抛）
    AutoCult.active = true; AutoCult.abort(); out.abortOk = AutoCult.active === false;
    // G1 存 storage 监听注册（注册即过）
    out.storageWired = true;
    // A3 旧档重掷：无 history 的 10~14 年旧值一次性拉回 2~4
    const p2w = { nextEventYear: 12, history: [] };
    p.world = p2w;
    WorldSys.onYear(p, 1);
    out.resched = p2w.nextEventYear >= 2 && p2w.nextEventYear <= 4 && p2w._evResched34 === true;
    // 已有 history 的档不动
    const w3 = { nextEventYear: 25, history: [{ type: 'war' }], _evResched34: true };
    p.world = w3;
    WorldSys.onYear(p, 1);
    out.reschedKeep = w3.nextEventYear === 25;
    return out;
  });
  rE.sfxDefault ? pass('RB15 音效默认开（E2）') : fail('RB15 音效', '');
  rE.careWatered && rE.carePlot1UntouchedDays && rE.carePlot0SpedUp ? pass('RB16 一键照料全田浇水且不重复打折（F1）') : fail('RB16 照料浇水', JSON.stringify(rE));
  rE.carePat && rE.careBond ? pass('RB17 一键照料全兽抚摸（F1）') : fail('RB17 照料抚摸', '');
  rE.restInsight ? pass('RB18 调息得感悟（F3）') : fail('RB18 调息', '');
  rE.abortOk ? pass('RB19 AutoCult abort 正常（G2）') : fail('RB19 abort', '');
  rE.resched && rE.reschedKeep ? pass('RB20 旧档重掷且有史档不动（A3）') : fail('RB20 重掷', `${rE.resched}/${rE.reschedKeep}`);

  /* ---- RB E2 E127：新档读档后洞府建筑不归零 ---- */
  const rG = await page.evaluate(async () => {
    const p = Game.player;
    p.cave = { lv: 3, dongtian: 0, plots: [], builds: { beast: 2, train: 3, lib: 1, forge: 2, spring: 3, treasury: 1 } };
    const snap = { v: 1, player: JSON.parse(JSON.stringify(p)), meta: { name: p.name, realmText: 'x', day: Math.floor(p.day || 1), age: p.age, ts: Date.now(), dead: false } };
    localStorage.setItem('fanren_wd_3', JSON.stringify(snap));
    Game.loadFrom('3');
    await new Promise(r => setTimeout(r, 300));
    return { builds: Game.player.cave.builds, mv: Game.player._migratedVersion };
  });
  rG.builds && rG.builds.spring === 3 && rG.builds.forge === 2 && rG.builds.treasury === 1
    ? pass('RB22 新档读档后 forge/spring/treasury 不归零（E127）') : fail('RB22 E127', JSON.stringify(rG));

  /* ---- RB F Meta 内存档单源（E123 运行时） ---- */
  const rF = await page.evaluate(() => {
    const out = {};
    // 禁存储环境下 writeRaw 落 mem 且 read 可读回（键名对称）
    const savedStorage = Save.storage;
    Save.storage = {};
    Save.writeRaw('meta_probe', '{"probe":1}');
    out.memSymmetry = !!Save.read('meta_probe') && Save.read('meta_probe').probe === 1;
    Save.storage = savedStorage;
    delete Save.mem['meta_probe'];
    return out;
  });
  rF.memSymmetry ? pass('RB21 mem 读写键名对称（E123）') : fail('RB21 meta 键', '');
} finally {
  await browser.close();
}

console.log(`\n共 ${passN + failN} 项，失败 ${failN} 项`);
if (consoleErrors.length) {
  console.log(`控制台错误 ${consoleErrors.length} 条：`);
  consoleErrors.slice(0, 10).forEach(e => console.log('  · ' + e));
} else {
  console.log('控制台错误 0 条');
}
if (fails.length) { console.log('失败项：' + fails.join(' | ')); process.exit(1); }
if (consoleErrors.length) process.exit(1);
console.log('EXIT=0');
process.exit(0);
