/* ======================================================================
 * verify-v16 —— V30「大器」专项回归
 * 覆盖：A P0七连 / B 批修抽样 / C 战斗点睛 / D 装备铸魂 / E 经济归流 /
 *       G 内容社交 / H 轮回镜 / F 节奏重校 / I 工程地基
 * 断言风格：源码静态检查（读 js/ 模块，build 前即可测）+ 运行时数据/行为检查。
 * ====================================================================== */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(dirname(fileURLToPath(import.meta.url))); // 脚本居于 tests/，指向项目根
const R = f => readFileSync(join(__dirname, 'js', f), 'utf8');

let passN = 0, failN = 0;
const fails = [];
const pass = t => { passN++; console.log('  ✓ ' + t); };
const fail = (t, d) => { failN++; fails.push(t); console.log('  ✗ ' + t + ' :: ' + d); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================= 源码静态组（SA） ================= */
console.log('===== SA 源码静态组 =====');
{
  const cult = R('systems/cultivate.js');
  cult.includes('Tribulation.state') ? pass('SA1 闭关守护查天劫态（A1）') : fail('SA1 闭关劫态', '缺 Tribulation.state');
  const trib = R('systems/tribulation.js');
  trib.includes('if (this.state) return;') ? pass('SA2 天劫重入保护（A1）') : fail('SA2 重入保护', '');
  trib.includes("borrow()") && trib.includes('trib-borrow') ? pass('SA3 借天运入口（E-气运消费）') : fail('SA3 借天运', '');
  const auction = R('systems/auction.js');
  (auction.match(/this\.mysteryPool\(p\)/g) || []).length >= 2 ? pass('SA4 古匣开奖与定价同池分层（A2）') : fail('SA4 古匣开奖', '开奖未走 mysteryPool');
  const battle = R('battle/battle.js');
  battle.includes("AUG_MINE: ['defdown'") || battle.includes('tick(B.myFx') ? pass('SA5 状态引擎统一衰减（A3/C1）') : fail('SA5 状态引擎', '');
  battle.includes("tick(B.myFx, 'mineEnd')") && battle.includes("tick(e.fx, 'enemyEnd')") ? pass('SA6 敌我回合末走 tick（A3/C1）') : fail('SA6 tick 接线', '');
  // v39（E348）战报一屏新形态：卡片挂载先于 end() 且 end() 已无死实参（原 this.end(false) ×14 清理）
  const btSum = battle.indexOf('bt-summary');
  const btEnd = battle.indexOf('this.end();', btSum - 400 > 0 ? btSum - 400 : 0);
  btSum > 0 && btEnd > btSum && !battle.includes('this.end(false)') ? pass('SA7 结算卡先于 end() 且 end() 无参（A4；v39（E348/E364）新形态）') : fail('SA7 结算卡顺序', `sum@${btSum} end@${btEnd}`);
  battle.includes("pctOf(e.fx, 'weaken')") ? pass('SA8 敌方虚弱生效（E1）') : fail('SA8 虚弱', '');
  battle.includes("kind: 'cursed'") || battle.includes('cursed: () =>') ? pass('SA9 咒雷处理器（E2）') : fail('SA9 cursed', '');
  battle.includes("fk === 'vuln'") && battle.includes("fk === 'ward'") ? pass('SA10 破阵/真罡符（C1 新状态）') : fail('SA10 新符', '');
  battle.includes("lastSkillTag") && battle.includes('连携') ? pass('SA11 连招体系（C2）') : fail('SA11 连招', '');
  battle.includes("deckCursor") ? pass('SA12 技能盘循势（C2 构筑位）') : fail('SA12 盘位', '');
  battle.includes("case 'combo'") && battle.includes('人兽合击') ? pass('SA13 人兽合击（C3）') : fail('SA13 合击', '');
  battle.includes('久战力竭') && battle.includes('_exhausted') ? pass('SA14 久战力竭（C5）') : fail('SA14 力竭', '');
  battle.includes('PREF_SKILL_W') && battle.includes('sameTwice') ? pass('SA15 AI 权重绑定+反制读招（C6）') : fail('SA15 AI2.0', '');
  battle.includes('_prevLog') && battle.includes('replaceWith(_prevLog)') ? pass('SA16 战斗日志增量化（I1）') : fail('SA16 日志复用', '');
  battle.includes('spendStonesMax') ? pass('SA17 战败罚款总资产口径（E33）') : fail('SA17 罚款', '');
  const beast = R('systems/beast.js');
  beast.includes("'drain'") && beast.includes("'mpburn'") && beast.includes('comboReady') ? pass('SA18 协战语义化+合击判定（E3/C3）') : fail('SA18 灵兽', '');
  beast.includes('B.won = true') && beast.includes('BountySys.onKill') ? pass('SA19 驯服胜场+悬赏计进度（E4）') : fail('SA19 驯服', '');
  beast.includes('arena.n >= 3') || beast.includes('p.counters.arena.n >= 3') ? pass('SA20 斗兽日限三场（E34）') : fail('SA20 斗兽', '');
  const bag = R('systems/bag.js');
  bag.includes('keepAffix') && bag.includes('restoreAffix') && bag.includes('affixKept') ? pass('SA21 词缀留档/还原（E14/D2）') : fail('SA21 词缀留档', '');
  bag.includes('qihun') ? pass('SA22 分解产器魂（D3）') : fail('SA22 器魂', '');
  const forge = R('systems/forge.js');
  forge.includes('MAX_LV: (GameData.BALANCE.ENHANCE || {}).MAX_LV || 15') && forge.includes('addBless') ? pass('SA23 强化+15（费率接线集中配置 v32 E24）与祝福值（D5）') : fail('SA23 强化', '');
  forge.includes('recast(slot)') ? pass('SA24 器魂重铸（D3）') : fail('SA24 重铸', '');
  forge.includes('per[k] || 0) * g') || forge.includes('(per[k] || 0) * g') ? pass('SA25 词缀两段式（D1）') : fail('SA25 两段式', '');
  forge.includes('n === 2') && forge.includes('0.6') ? pass('SA26 套装两件阶梯（D4）') : fail('SA26 阶梯', '');
  forge.includes('affixScore') ? pass('SA27 词缀估分保底（D1）') : fail('SA27 估分', '');
  const stat = R('core/stat.js');
  stat.includes('1 + enhLv * 0.02') && stat.includes('1 + enhLv * 0.01') ? pass('SA28 强化全键生效（D5）') : fail('SA28 全键', '');
  stat.includes('pl.cultPct') ? pass('SA29 个人线 cultPct 消费（E42）') : fail('SA29 cultPct', '');
  const reinc = R('systems/reincarnation.js');
  reinc.includes('grantMarks') && reinc.includes('mirror()') && reinc.includes('pastLives') ? pass('SA30 轮回镜/印记多元化/编年（H）') : fail('SA30 轮回镜', '');
  const tower = R('systems/tower.js');
  tower.includes('REDEEMS') && tower.includes('eventStep') && tower.includes('塔守') ? pass('SA31 塔绩兑换/奇遇层/机制Boss（C4）') : fail('SA31 塔', '');
  tower.includes("grantMarks(1, 'tower_30')") ? pass('SA32 塔三十层印记（H）') : fail('SA32 塔印记', '');
  const cave = R('systems/cave.js');
  cave.includes('upgradeDongtian') && cave.includes('sinkCurve') ? pass('SA33 洞天营造+曲线统一（E）') : fail('SA33 洞天', '');
  const gdata = R('data/game-data.js');
  gdata.includes('fr <= 5 ? Math.pow(3, fr) : 243 * Math.pow(3.8, fr - 5)') ? pass('SA34 sinkCurve 单源（E；v39（E351）分段：r≤5 逐字节不变、r≥6 挂 3.8^(r-5)）') : fail('SA34 sinkCurve', '');
  gdata.includes("id: 'f19'") && gdata.includes("id: 'f22'") ? pass('SA35 毕业装炼器配方（D6）') : fail('SA35 配方', '');
  gdata.includes('codex_tier_') ? pass('SA36 图鉴分档奖励（G6）') : fail('SA36 图鉴分档', '');
  gdata.includes('SECT_QUEST_FLAVOR') ? pass('SA37 宗门特色差事（G4）') : fail('SA37 差事', '');
  gdata.includes("id: 'zhongbao'") && gdata.includes("id: 'lingyi'") ? pass('SA38 世界大事扩池（G5）') : fail('SA38 大事', '');
  gdata.includes("id: 'duanwu'") && gdata.includes("id: 'chongyang'") ? pass('SA39 节庆扩充（G5）') : fail('SA39 节庆', '');
  gdata.includes('tal_pozhen') && gdata.includes('tal_zhengang') ? pass('SA40 新符箓上架（C1）') : fail('SA40 新符', '');
  gdata.includes('xianyuan') || gdata.includes('仙元') ? pass('SA41 仙元续航（F6）') : fail('SA41 仙元', '');
  const quest = R('ui/quest.js');
  quest.includes('rebattleGateShadow') ? pass('SA42 门前影重战（A6）') : fail('SA42 重战', '');
  quest.includes('_personalDone') && quest.includes('_achvCount') ? pass('SA43 内容完成度总览（G7）') : fail('SA43 总览', '');
  const story = R('ui/story.js');
  story.includes("sc.t === 'investigate'") ? pass('SA44 跳过补细察自停（E44）') : fail('SA44 跳过', '');
  const npc = R('systems/npc.js');
  npc.includes('companionOuting') ? pass('SA45 道侣出游（G3）') : fail('SA45 出游', '');
  npc.includes('aidRot') ? pass('SA46 结义轮换相助（E49）') : fail('SA46 轮换', '');
  const world = R('systems/world.js');
  world.includes('2 + Utils.rand(0, 2)') ? pass('SA47 世界大事首现 2~4 年（F2；v34 与实玩节奏同校）') : fail('SA47 节奏', '');
  const autocult = R('core/autocult.js');
  autocult.includes("catch (err)") && autocult.includes('异常自愈') ? pass('SA48 自动修炼异常自愈（I4）') : fail('SA48 自愈', '');
  const savejs = R('core/save.js');
  savejs.includes('snapshotAuto') && savejs.includes("removeItem(verifyKey)") ? pass('SA49 滚动快照+_v清理（I2）') : fail('SA49 存档', '');
  const gamejs = readFileSync(join(__dirname, 'js', 'game.js'), 'utf8');
  gamejs.includes("Save.KEY + 'lasterror'") ? pass('SA50 全局错误兜底（I4）') : fail('SA50 兜底', '');
  gamejs.includes('Tutorial.finish') ? pass('SA51 ESC 补引导（I5）') : fail('SA51 ESC', '');
  const idxhtml = readFileSync(join(__dirname, 'index.html'), 'utf8');
  idxhtml.includes('sw-update-tip') ? pass('SA52 PWA 更新提示链（I3）') : fail('SA52 PWA', '');
  const swjs = readFileSync(join(__dirname, 'sw.js'), 'utf8');
  swjs.includes('apple-touch-icon.png') ? pass('SA53 SW 预缓存补齐（I3）') : fail('SA53 SW', '');
  const gd2 = R('data/game-data.js');
  gd2.includes("fx: { cultPct: 3 }") ? pass('SA54 苏白线键名修正（E42）') : fail('SA54 键名', '');
  const sfx = R('systems/status-fx.js');
  R('systems/explore.js').includes('elitePlus') && R('systems/dungeon.js').includes('elitePlus') ? pass('SA55 手工精英统一口径（E6；v39（E364）buildMonster 迁往 explore.js）') : fail('SA55 精英', '');
  const trib2 = R('systems/tribulation.js');
  trib2.includes('道侣安慰') && trib2.includes('共渡天劫') ? pass('SA56 道侣共渡天劫安慰（补遗）') : fail('SA56 道侣劫', '');
  const gamejs2 = readFileSync(join(__dirname, 'js', 'game.js'), 'utf8');
  gamejs2.includes('pendingDao = true') && gamejs2.includes('discipleDaily') ? pass('SA57 dao-modal ESC 自愈+弟子历练接线（补遗）') : fail('SA57 补遗接线', '');
}

/* ================= 浏览器运行时组（RB） ================= */
console.log('===== RB 运行时组 =====');
const CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe' : null,
].filter(Boolean);
let browser = null;
for (const p of CHROME_PATHS) {
  try { browser = await puppeteer.launch({ headless: 'new', executablePath: p, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); break; } catch (e) { /* next */ }
}
if (!browser) { console.error('✗ 未找到 Chrome，运行时组跳过'); }

if (browser) {
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  await page.setViewport({ width: 1380, height: 860 });
  try {
    await page.goto('http://localhost:8341/index.html', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(600);
    // 装载一个测试存档（运行时行为组需要 Game.player）
    await page.evaluate(() => {
      const pl = PlayerFactory.create('测道人', { gen: 5, comp: 5, luck: 5, body: 5 });
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
      UI._popupResolve = null;
    });

    /* ---- 数据表组 ---- */
    const d1 = await page.evaluate(() => {
      const g = GameData;
      const ratio = g.EXP_BASE[1] / g.EXP_BASE[0];
      const leiyu = g.MAPS.find(m => m.id === 'leiyu');
      const tower = TowerSys.BUFFS.length;
      return {
        ratio, expBase: g.EXP_BASE.slice(),
        xianzunInLeiyu: leiyu.pool.some(x => x.id === 'm_xianzun'),
        towerBuffs: tower, cursed: TowerSys.BUFFS.filter(b => b.curse).length,
        newTal: !!(g.ITEMS.tal_pozhen && g.ITEMS.tal_zhengang),
        mpRegen: g.BALANCE.AFFIXES.suffix.filter(a => a.onTurn && a.onTurn.mpRegen).length,
        perAffix: g.BALANCE.AFFIXES.prefix.filter(a => a.per).length,
        dujieShop: g.SHOP.some(r => r.item === 'pill_dujie'),
        dujieSect: g.SECT_EXCHANGE.some(r => r.item === 'pill_dujie'),
        personalN: Object.keys(g.PERSONAL).length,
        worldN: g.WORLD_EVENTS.length,
        festN: g.FESTIVALS.length,
        sink6: g.sinkCurve(6), sink0: g.sinkCurve(0), sink8: g.sinkCurve(9), sink5: g.sinkCurve(5), sink3: g.sinkCurve(3),
        lifespan: g.LIFESPAN.slice(),
      };
    });
    d1.ratio > 5.2 && d1.ratio < 5.6 ? pass(`RB1 EXP 曲线每境 ×${d1.ratio.toFixed(2)}（F1；v34 ×5.4）`) : fail('RB1 EXP 曲线', String(d1.ratio));
    d1.xianzunInLeiyu ? pass('RB2 仙尊残念入雷狱妖池（A5）') : fail('RB2 仙尊', '');
    d1.towerBuffs >= 22 && d1.cursed >= 4 ? pass(`RB3 塔祝福池 ${d1.towerBuffs}（诅咒 ×${d1.cursed}）（C4；v39（E364）三档词条并入 tiers 后 28→22）`) : fail('RB3 塔祝福', JSON.stringify({ n: d1.towerBuffs, c: d1.cursed }));
    d1.newTal ? pass('RB4 新符箓入库（C1）') : fail('RB4 新符', '');
    d1.mpRegen >= 2 ? pass('RB5 回灵/凝气 mpRegen 键（A7）') : fail('RB5 mpRegen', String(d1.mpRegen));
    d1.perAffix >= 3 ? pass('RB6 两段式词缀 ×' + d1.perAffix + '（D1）') : fail('RB6 两段式', String(d1.perAffix));
    d1.dujieShop && d1.dujieSect ? pass('RB7 渡劫丹双渠道上架（F4）') : fail('RB7 渡劫丹', '');
    d1.personalN === 24 ? pass('RB8 个人线 24 位（G1）') : fail('RB8 个人线', String(d1.personalN));
    d1.worldN >= 12 ? pass('RB9 世界大事 ' + d1.worldN + ' 种（G5）') : fail('RB9 大事', String(d1.worldN));
    d1.festN >= 7 ? pass('RB10 节庆 ' + d1.festN + ' 个（G5）') : fail('RB10 节庆', String(d1.festN));
    Math.round(d1.sink6) === 923 && d1.sink0 === 1 && Math.round(d1.sink8) === 50669 && d1.sink5 === 243 && d1.sink3 === 27 ? pass('RB11 sinkCurve 数值（E；v39（E351）分段曲线：r6=243×3.8≈923、r9=243×3.8^4≈50669，r3/r5 与 v38 一致）') : fail('RB11 sinkCurve', JSON.stringify([d1.sink6, d1.sink0, d1.sink8]));

    /* ---- 行为组：状态引擎 / 连招 / 套装 / 词缀 ---- */
    const b1 = await page.evaluate(() => {
      const out = {};
      // A3：金光盾回合衰减
      const fx = [{ kind: 'shield', pct: 40, rounds: 2 }];
      const r1 = StatusFx.tick(fx, 'mineEnd');
      out.shieldDecay = r1.length === 1 && r1[0].rounds === 1;
      const r2 = StatusFx.tick(fx, 'mineEnd');
      out.shieldGone = r2.length === 0;
      // 新状态
      out.vulnDef = !!StatusFx.DEFS.vuln && !!StatusFx.DEFS.ward;
      // 真罡减 DOT：ward 状态下 DOT 减半由 tickDots 消费——检查 DEFS 与 purge
      out.purgeKeepWard = StatusFx.purge([{ kind: 'ward', pct: 50, rounds: 2 }]).length === 1;
      // 套装阶梯：两件玄天
      const p = Game.player;
      p.equipped = { weapon: { id: 's_xt_jian', enhance: 0 }, armor: { id: 's_xt_jia', enhance: 0 }, accessory: null };
      const half = ForgeSys.setBonus(p);
      out.ladder2 = half.defPct === 9 && half.hpPct === 6;
      p.equipped.accessory = { id: 's_xt_pei', enhance: 0 };
      const full = ForgeSys.setBonus(p);
      out.full3 = full.defPct === 15 && full.hpPct === 10;
      // 仙器共鸣：单件 grade5
      p.equipped = { weapon: { id: 'w_lingjie', enhance: 0 }, armor: null, accessory: null };
      const solo = ForgeSys.setBonus(p);
      out.xianqi = solo.atkPct === 1 && solo.defPct === 1 && solo.hpPct === 1;
      // 词缀两段式：破军 grade5
      const perDef = GameData.BALANCE.AFFIXES.prefix.find(a => a.id === 'pojun');
      const inst = { id: 'w_tiejian', enhance: 0, affixes: { prefix: 'pojun' } };
      const pFake = { equipped: { weapon: inst } };
      pFake.equipped.weapon.id = 'w_lingjie';
      const bonusG5 = ForgeSys.affixBonus(pFake).atk;
      out.perScale = bonusG5 === 40 + 25 * 5;
      // 强化全键：纯饰品（stonePct）强化 +10（基于真实玩家深拷贝，避免 Stat 依赖缺字段）
      const pF2 = JSON.parse(JSON.stringify(p));
      const acc = { id: 'z_qiankun', enhance: 10, affixes: {} };
      pF2.equipped = { weapon: null, armor: null, accessory: acc };
      pF2.cave = { lv: 1, builds: {}, plots: [] };
      const eqB10 = Stat.compute(pF2).stonePct;
      pF2.equipped.accessory.enhance = 0;
      const eqB0 = Stat.compute(pF2).stonePct;
      out.accEnh = eqB10 - eqB0 >= 2;   // 20×10×0.01 = +2
      p.equipped = { weapon: null, armor: null, accessory: null };
      // 洗练保底不降：affixScore 单调
      out.scoreFn = ForgeSys.affixScore('prefix', 'sharp') > 0 && ForgeSys.affixScore('suffix', '') === 0;
      Game.player.equipped = { weapon: null, armor: null, accessory: null };
      return out;
    });
    b1.shieldDecay && b1.shieldGone ? pass('RB12 金光盾回合衰减（A3）') : fail('RB12 金光盾', JSON.stringify(b1));
    b1.vulnDef && b1.purgeKeepWard ? pass('RB13 破绽/真罡状态语义（C1）') : fail('RB13 新状态', '');
    b1.ladder2 && b1.full3 ? pass('RB14 套装 2/3 件阶梯（D4）') : fail('RB14 阶梯', '');
    b1.xianqi ? pass('RB15 仙器散件共鸣（D4）') : fail('RB15 共鸣', '');
    b1.perScale ? pass('RB16 破军随品阶缩放（D1）') : fail('RB16 两段式', String(b1.perScale));
    b1.accEnh ? pass('RB17 纯功能饰品强化有收益（D5）') : fail('RB17 饰品强化', String(b1.accEnh));
    b1.scoreFn ? pass('RB18 词缀估分函数（D1）') : fail('RB18 估分', '');

    /* ---- 行为组：经济 ---- */
    const e1 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      // 古匣 r0 定价与开奖同池（EV 差显著收敛）
      p.realmIdx = 0;
      const base = AuctionSys.mysteryBase(p);
      const pool = AuctionSys.mysteryPool(p);
      const wsum = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2, 0);
      const ev = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2 * ((GameData.ITEMS[x.id] || {}).price || 500), 0) / wsum;
      out.mysteryEV = base >= ev * 0.8 && base <= ev;
      // 战败罚款：spendStonesMax 吃总资产
      p.stones = { low: 50, mid: 2, high: 1 };
      const took = Bag.spendStonesMax(Math.round((50 + 200 + 10000) * 0.2));
      out.fine = took === 2050 && (p.stones.low + p.stones.mid * 100 + p.stones.high * 10000) === 10000 + 250 - 2050;
      // 器魂：分解产出
      p.qihun = 0;
      p.bag.w_tiejian = 1;
      p.bag['m_xuantie'] = 0;
      // 洞天定价随境界
      p.realmIdx = 6; p.cave = { lv: 5, dongtian: 0, builds: {} };
      out.dongCost = CaveSys.dongtianCost(p).stones >= 4000 * 729 * 0.9;
      // 借天运：气运扣减与成算提升
      p.realmIdx = 2; p.layer = 0; p.fortune = 30;
      Game.player = p;
      Tribulation.state = { base: 50, power: 1, artifact: null, busy: false, logs: [] };
      const before = Tribulation.chances ? Tribulation.chances().endure : null;
      Tribulation.borrow();
      out.borrow = p.fortune === 10 && Tribulation.state.base === 55 && Tribulation.state._borrowed === true;
      Tribulation.state = null;
      // 洞府 cultBonus 含洞天
      p.cave.dongtian = 2;
      out.caveCult = CaveSys.cultBonus(p) === 5 * 4 + 2 * 3;
      p.cave.dongtian = 0;
      // 灵田/悬赏维持 v29 断言（防回归）
      out.dujieInShop = GameData.SHOP.some(r => r.item === 'pill_dujie' && r.minRealm === 3);
      p.realmIdx = 0;
      return out;
    });
    e1.mysteryEV ? pass('RB19 古匣定价=开奖池期望×0.85（A2）') : fail('RB19 古匣', '');
    e1.fine ? pass('RB20 战败罚款总资产口径（E33）') : fail('RB20 罚款', '');
    e1.dongCost ? pass('RB21 洞天营造全幅定价（E）') : fail('RB21 洞天', '');
    e1.borrow ? pass('RB22 借天运扣气运提成算（E）') : fail('RB22 借天运', '');
    e1.caveCult ? pass('RB23 洞天修炼加成入总线（E）') : fail('RB23 洞天加成', '');
    e1.dujieInShop ? pass('RB24 渡劫丹元婴起上架（F4）') : fail('RB24 渡劫丹', '');

    /* ---- 行为组：轮回镜 / 印记 / 编年 ---- */
    const h1 = await page.evaluate(() => {
      const out = {};
      // 印记发放（跨世去重）
      const legacy0 = ReincarnationSys.readLegacy();
      const marks0 = legacy0.marks || 0;
      const ok1 = ReincarnationSys.grantMarks(1, 'v16_test_mark');
      const legacy1 = ReincarnationSys.readLegacy();
      out.grant = ok1 && legacy1.marks === marks0 + 1;
      out.dedup = ReincarnationSys.grantMarks(1, 'v16_test_mark') === false && ReincarnationSys.readLegacy().marks === marks0 + 1;
      // 清理测试印记
      legacy1.marks = marks0;
      ReincarnationSys.writeLegacy(legacy1);
      if (typeof Meta !== 'undefined' && Meta.data.marksGiven) { delete Meta.data.marksGiven['v16_test_mark']; Meta.save(); }
      // 十层树名
      out.tree = ReincarnationSys.TREE_NAMES.length === 15;   // v32（D2）：传承树扩至 15 层
      // 门前影重战入口存在且境界拦截
      out.rebattle = typeof QuestSys.rebattleGateShadow === 'function';
      return out;
    });
    h1.grant && h1.dedup ? pass('RB25 印记发放+跨世去重（H）') : fail('RB25 印记', JSON.stringify(h1));
    h1.tree ? pass('RB26 传承树可视化数据（H/v32 扩十五层）') : fail('RB26 树', '');
    h1.rebattle ? pass('RB27 门前影重战入口（A6）') : fail('RB27 重战', '');

    /* ---- 行为组：存档 / 兜底 / 杂修 ---- */
    const i1 = await page.evaluate(() => {
      const out = {};
      // 版本门
      const raw = JSON.stringify({ v: 2, player: { name: 'x' }, meta: {} });
      localStorage.setItem('fanren_wd_2', raw);
      out.gate = Game.loadFrom('2') === false;
      localStorage.removeItem('fanren_wd_2');
      // 快照
      out.snap = typeof Save.snapshotAuto === 'function';
      // dots 记忆化：渲染 pass 内同源（引用相等）；渲染外调用现算（值相等，杜绝陈旧缓存）
      UI.renderAll();
      const a = UI.dots();   // renderAll 尾部已结束——此为渲染外调用，现算
      const b = UI.dots();
      out.dotsFresh = JSON.stringify(a) === JSON.stringify(b);
      out.dotsMemo = (() => { UI._inRender = true; UI._dotsCache = null; const x = UI.dots(); const y = UI.dots(); UI._inRender = false; UI._dotsCache = null; return x === y; })();
      // 图鉴分档：四档合计 1.0
      const tiers = [[0.25, 0.15], [0.5, 0.2], [0.75, 0.25], [1, 0.4]];
      out.tierSum = tiers.reduce((s, t) => s + t[1], 0) === 1;
      // 仙元分支：真仙圆满溢出
      const p = Game.player;
      p.realmIdx = 9; p.layer = 3; p.exp = GameData.layerNeed(9, 3);
      const dao0 = DaoSys.gain ? null : null;
      const xy0 = p.counters.xianyuan || 0;
      Cultivate.addExp(p, Math.round(GameData.eco(9) * 0.5));
      out.xianyuan = (p.counters.xianyuan || 0) > xy0;
      p.realmIdx = 0; p.layer = 0; p.exp = 0;
      return out;
    });
    i1.gate ? pass('RB28 存档版本门（I2）') : fail('RB28 版本门', '');
    i1.snap ? pass('RB29 滚动快照入口（I2）') : fail('RB29 快照', '');
    i1.dotsMemo && i1.dotsFresh ? pass('RB30 红点源记忆化（渲染内同源 / 渲染外现算）（I1）') : fail('RB30 红点', JSON.stringify({ m: i1.dotsMemo, f: i1.dotsFresh }));
    i1.tierSum ? pass('RB31 图鉴四档合计 1.0（G6）') : fail('RB31 分档', '');
    i1.xianyuan ? pass('RB32 真仙溢出炼仙元（F6）') : fail('RB32 仙元', '');

    /* ---- 行为组：内容 ---- */
    const g1 = await page.evaluate(() => {
      const out = {};
      out.mid2c10 = !!GameData.STORIES.c10_mid2 && GameData.STORIES.c10_mid2.scenes.length >= 3;
      const six = ['n8', 'n16', 'n18', 'n19', 'n20', 'n21'];
      out.sixPl = six.every(id => GameData.PERSONAL[id] && GameData.PERSONAL[id].acts.length === 3 && GameData.STORIES[`pl_${id}_a1`] && GameData.STORIES[`pl_${id}_a2`] && GameData.STORIES[`pl_${id}_a3`]);
      out.flavor = !!GameData.SECT_QUEST_FLAVOR.qingyun;
      out.sideSum = typeof QuestSys._personalDone === 'function' && typeof QuestSys._codexCount === 'function';
      // 苏白加成实际生效
      const p = Game.player;
      p.personal = p.personal || {};
      p.personal.n3 = 3;
      const cult = Stat.compute(p).cultPct;
      p.personal.n3 = 0;
      out.subai = cult >= 3;
      return out;
    });
    g1.mid2c10 ? pass('RB33 终章暗线 c10_mid2（G2）') : fail('RB33 暗线', '');
    g1.sixPl ? pass('RB34 六位 NPC 个人线三幕齐备（G1）') : fail('RB34 六线', '');
    g1.flavor ? pass('RB35 宗门差事名目表（G4）') : fail('RB35 差事', '');
    g1.sideSum ? pass('RB36 内容总览计数器（G7）') : fail('RB36 总览', '');
    g1.subai ? pass('RB37 苏白终章加成实际生效（E42）') : fail('RB37 苏白', String(g1.subai));

    /* ---- 补遗组：宗门五式差事 / 弟子历练 / 道侣共渡天劫 ---- */
    const g2 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      // 差事五式：钩子在位
      out.hooks = typeof SectSys.onExplore === 'function' && typeof SectSys.onSign === 'function';
      // v37（E242）：池互斥后宗门只余三门（cult/explore/sign），kill/collect 归悬赏板不再自宗门生成
      p.sect = { id: 'qingyun', contrib: 100, tasks: [], faction: null };
      const seen = new Set();
      for (let i = 0; i < 40; i++) { const t = SectSys.genTask(p); seen.add(t.type); }
      out.threeTypes = ['cult', 'explore', 'sign'].every(t => seen.has(t)) && !seen.has('kill') && !seen.has('collect');
      out.flavor3 = Object.keys(GameData.SECT_QUEST_FLAVOR.qingyun).length === 3;
      // explore/sign 钩子推进
      p.sect.tasks = [{ type: 'explore', target: null, need: 2, progress: 0, name: 'x', desc: 'x' }];
      SectSys.onExplore(); SectSys.onExplore();
      out.exploreHook = p.sect.tasks[0].progress === 2;
      p.sect.tasks = [{ type: 'sign', target: null, need: 1, progress: 0, name: 'x', desc: 'x' }];
      SectSys.onSign();
      out.signHook = p.sect.tasks[0].progress === 1;
      // 亲传弟子历练：亲传有产出、外门无
      p.realmIdx = 3; p.sect.contrib = 2500;
      p.sect._discipleDay = -1;
      const st0 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
      SectSys.discipleDaily(p, true);
      const st1 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
      out.disciple = st1 > st0;
      p.sect.contrib = 100; p.sect.peakContrib = 0;   // 降回外门（v34 E115：职位按峰值——显式清峰值才回落）
      p.sect._discipleDay = -1;
      const st2 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
      SectSys.discipleDaily(p, true);
      out.discipleGate = (p.stones.low + p.stones.mid * 100 + p.stones.high * 10000) === st2;
      p.sect = null;
      return out;
    });
    g2.hooks && g2.threeTypes && g2.flavor3 ? pass('RB39 宗门差事三门生成与名目表（补遗；v37（E242）池互斥——kill/collect 归悬赏板不再生成）') : fail('RB39 差事', JSON.stringify({ h: g2.hooks, f: g2.threeTypes, n: g2.flavor3 }));
    g2.exploreHook && g2.signHook ? pass('RB40 历练/问签钩子推进（补遗）') : fail('RB40 钩子', JSON.stringify({ e: g2.exploreHook, s: g2.signHook }));
    g2.disciple && g2.discipleGate ? pass('RB41 亲传弟子历练产出+职位门（补遗）') : fail('RB41 弟子历练', JSON.stringify({ d: g2.disciple, g: g2.discipleGate }));
    consoleErrors.length === 0 ? pass('RB38 运行时 0 控制台错误') : fail('RB38 控制台', consoleErrors.slice(0, 3).join(' | '));
  } catch (e) {
    fail('RB 流程', (e && e.stack || String(e)).slice(0, 600));
  }
  await browser.close().catch(() => {});
}

console.log('\n===== verify-v16 汇总 =====');
console.log(`共 ${passN + failN} 项，失败 ${failN} 项`);
if (fails.length) console.log('失败项：\n  - ' + fails.join('\n  - '));
console.log('控制台错误已随 RB38 计');
process.exit(failN ? 1 : 0);
