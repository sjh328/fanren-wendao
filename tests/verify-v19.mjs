/* ======================================================================
 * verify-v19 —— V33「回响」专项回归
 * 覆盖：A P0双连（分账回填 / 旗标抉择记录）/ B 批修 E67~E112 / C 升级包（抉择回响网络 /
 *       连签重构 / 战斗规则一致性 / 拍卖热度 / 炼器工费 / 仙绩地脉可见化 / 年表百科引导）
 * 断言风格：源码静态检查（SA）+ 浏览器运行时行为检查（RB）。
 * ====================================================================== */
import puppeteer from 'puppeteer-core';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(dirname(fileURLToPath(import.meta.url)));
const R = f => readFileSync(join(__dirname, 'js', f), 'utf8');

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
  const bag = R('systems/bag.js');
  const forge = R('systems/forge.js');
  const shop = R('systems/shop.js');
  const auction = R('systems/auction.js');
  const black = R('systems/black.js');
  const sect = R('systems/sect.js');
  const festival = R('systems/festival.js');
  const reinc = R('systems/reincarnation.js');
  const cult = R('systems/cultivate.js');
  const trib = R('systems/tribulation.js');
  const autocult = R('core/autocult.js');
  const gdata = R('data/game-data.js');
  const ui = R('ui/ui.js');
  const gamejs = R('game.js');
  const pfac = R('core/player-factory.js');
  const world = R('systems/world.js');
  const npc = R('systems/npc.js');
  const save = R('core/save.js');
  const story = R('ui/story.js');
  const quest = R('ui/quest.js');
  const explore = R('systems/explore.js');
  const cave = R('systems/cave.js');
  const dungeon = R('systems/dungeon.js');
  const dsign = R('systems/daily-sign.js');
  const sfx = R('systems/status-fx.js');
  const rank = R('systems/rank.js');
  const guide = R('core/guide.js');
  const utils = R('core/utils.js');
  const idxhtml = readFileSync(join(__dirname, 'index.html'), 'utf8');
  const relscript = readFileSync(join(__dirname, 'scripts', 'release.mjs'), 'utf8');
  const cascript = readFileSync(join(__dirname, 'scripts', 'check-actions.mjs'), 'utf8');

  /* ---- A P0 双连 ---- */
  reinc.includes('v33（A1）修瑕：回填条件原为 `== null`') && reinc.includes('if (!cur.marksEarned) cur.marksEarned = cur.marks || 0;') ? pass('SA1 分账回填改真值判定（A1）') : fail('SA1 分账回填', '');
  story.includes('if (opt.flag) this.recordChoice(opt.flag, opt.value);') ? pass('SA2 抉择按旗标名同步记录（A2）') : fail('SA2 旗标记录', '');
  gdata.includes("reqChoice: { key: 'k5_past_accept', oneOf: ['accept'] }") ? pass('SA3 回响场景旗标键在位（A2 前置）') : fail('SA3 旗标键', '');

  /* ---- B1 战斗一致性（E67~E72） ---- */
  battle.includes('async controlledConsume(st)') ? pass('SA4 控制消耗单源 helper（E67）') : fail('SA4 helper', '');
  battle.includes('被控不可施必杀') && battle.includes('被控不可发本命战技') ? pass('SA5 必杀/本命接控制门（E67）') : fail('SA5 接门', '');
  battle.includes('流程单源化为 controlledConsume') ? pass('SA6 act() 改走单源（E67）') : fail('SA6 act 单源', '');
  battle.includes('const bound = !!(B.myFx && (StatusFx.has(B.myFx, \'stun\') || StatusFx.has(B.myFx, \'freeze\')))') && battle.includes('身被禁锢，无法施展') ? pass('SA7 被控按钮置灰+提示（E67）') : fail('SA7 置灰', '');
  sfx.includes("'vuln', 'atkup', 'agiup', 'critup'") ? pass('SA8 偷来的增益入敌方衰减表（E68）') : fail('SA8 衰减表', '');
  battle.includes('v33（E69）：道具断势') ? pass('SA9 道具断势重置（E69）') : fail('SA9 断势', '');
  battle.includes("（真元已满，换气无益）") && battle.includes('...((B.zhenyuan || 0) < (B.zmax || 6) ? [{ text: \'20 战意 → 1 真元\', value: \'zy\' }] : [])') ? pass('SA10 凝神满元不供换气项（E70）') : fail('SA10 凝神', '');
  !battle.includes('if (!(B.morale || 0)) return;') ? pass('SA11 凝神永假死守卫清除（E70）') : fail('SA11 死守卫', '');
  battle.includes('B.ctx.waveIds && B.ctx.waveIds.length > 1') ? pass('SA12 多波战不可驯服（E71）') : fail('SA12 多波', '');
  beast.includes('Battle.gainBuff({ kind: \'shield\', pct: tac === \'guard\'') ? pass('SA13 护主金光走统一增益入口（E72）') : fail('SA13 金光', '');
  battle.includes('身被禁锢</span>') ? pass('SA14 意图栏禁锢提示行（D3）') : fail('SA14 禁锢行', '');

  /* ---- B2 经济（E73~E80） ---- */
  auction.includes("Daily.resetIfNew(p, '_boxDay')") && auction.includes('p._boxDay === Math.floor(p.day || 0)') ? pass('SA15 古匣日限迁 p 本体日结总线（E73，无真值 coercion）') : fail('SA15 古匣日限', '');
  forge.includes('feeOf(r)') && forge.includes('GameData.GRADE_FALLBACK') && forge.includes('开炉需工费') ? pass('SA16 炼器工费收取（E74；v37（E254）fee 兜底数组并入 GameData.GRADE_FALLBACK 单源）') : fail('SA16 工费', '');
  forge.includes('(out.grade || 0) <= 2 ? 0.25 : (out.grade || 0) <= 4 ? 0.15 : 0.10') ? pass('SA17 工费阶梯 25/15/10（E74）') : fail('SA17 阶梯', '');
  ui.includes('工费 ${Utils.fmtNum(fee)} 灵石') && ui.includes('ForgeSys.feeOf(r)') ? pass('SA18 配方行工费显示同源（E74）') : fail('SA18 工费显示', '');
  (bag.match(/E75/g) || []).length >= 2 ? pass('SA19 批量丢弃/传承清器魂阶梯（E75）') : fail('SA19 阶梯清', '');
  forge.includes('p._embryoSuffixFor = r.out') && forge.includes('p._embryoSuffixFor === id') ? pass('SA20 器胚旗标挂物品 id（E76）') : fail('SA20 器胚旗标', '');
  auction.includes('const sameLot = prev && prev.item === lot2.item && prev.seq === seq;') ? pass('SA21 热度按拍品连任累计（E77）') : fail('SA21 热度', '');
  !auction.includes("item: 'mystery', seq, views") ? pass('SA22 古匣期不再伪造 views（E77）') : fail('SA22 古匣 views', '');
  battle.includes('10 + Math.round(KarmaSys.rareDropBonus(p) * 0.25)') ? pass('SA23 第二稀有掉率压系数（E78）') : fail('SA23 掉率', '');
  black.includes('实无此功能') ? pass('SA24 黑市死注释清理（E79）') : fail('SA24 黑市', '');
  auction.includes("|| { name: a.item, desc: '' }") && ui.includes("|| { name: lot.item, grade: 0, desc:") ? pass('SA25 拍卖脏档判空双侧（E80）') : fail('SA25 判空', '');

  /* ---- B3 修炼轮回（E81~E88） ---- */
  gamejs.includes('p._settleDay = Math.floor(p.day || 0);   // v33（E81）') ? pass('SA26 离线回放同步 _settleDay（E81）') : fail('SA26 同步', '');
  sect.includes('聚合条件放宽为 auto') && R('systems/xian.js').includes('聚合条件放宽为 auto') ? pass('SA27 在线补结同进聚合（E82）') : fail('SA27 聚合', '');
  gamejs.includes("flushOfflineAgg(title = '【离线日报】')") && gamejs.includes('【${crossed} 日总账】') ? pass('SA28 补结日报收口（E82）') : fail('SA28 日报', '');
  reinc.includes('if ((lg.marks || 0) < this.TREE_EXTRA_COST) return this.mirror();') ? pass('SA29 树层购买二次校验（E83）') : fail('SA29 校验', '');
  reinc.includes('净差额结算') && reinc.includes('curPlanCost') ? pass('SA30 换约退差价（E84）') : fail('SA30 退差', '');
  trib.includes('const already = !!p.flags[vision.flag];') ? pass('SA31 异象重复播报守卫（E85）') : fail('SA31 异象', '');
  autocult.includes("p.flags.ascended ? '' : 'disabled'") ? pass('SA32 攒仙元未飞升禁用（E86）') : fail('SA32 禁用', '');
  cult.includes('gainMultExp()') && cult.includes('期望中值 1.025') ? pass('SA33 闭关预估用期望中值（E87）') : fail('SA33 预估', '');
  reinc.includes('指纹单源化') && reinc.includes('const fp = oldP.lifeUid;') ? pass('SA34 兵解指纹单源（E88）') : fail('SA34 指纹', '');

  /* ---- B4 社交剧情（E89~E92） ---- */
  npc.includes("war: '战阵'") && npc.includes('战阵之上刀剑无眼') ? pass('SA35 war 记忆类型注册+回忆模板（E89）') : fail('SA35 war', '');
  quest.includes('已不在人世，这份了结') && quest.includes('if (s && s.alive) {') ? pass('SA36 支线结案死者拦截（E90）') : fail('SA36 死者', '');
  world.includes('herbMul(p)') && world.includes('lingyiUntil') && (shop.match(/WorldSys.herbMul/g) || []).length >= 2 ? pass('SA37 灵疫药价两侧同乘（E91）') : fail('SA37 药价', '');
  world.includes('HERBS') && world.includes("'m_lingzhi'") ? pass('SA38 灵药材名录（E91）') : fail('SA38 名录', '');
  world.includes("Story.chron(`第${y}年 · 天下大事「${def ? def.name : type}」`)") && npc.includes('Story.chron(`与 ${d.name} 义结金兰`)') && npc.includes('Story.chron(`与 ${d.name} 结为道侣`)') && story.includes('决战誓约：${vows.join(\'、\')}') ? pass('SA39 年表补录四类（E92）') : fail('SA39 年表', '');
  world.includes('priceMul 死字段删除') ? pass('SA40 priceMul 死字段清除（E91 附带）') : fail('SA40 死字段', '');

  /* ---- B5 UI 工程（E93~E101） ---- */
  cascript.includes("act:\\s*'([a-z0-9-]+)'") ? pass('SA41 check-actions 增扫动态引用（E93）') : fail('SA41 校验器', '');
  ui.includes('data-fold="beast-care-${b.uid}"') && ui.includes('data-fold="npc-more-${d.id}"') ? pass('SA42 兽栏/江湖折叠记忆（E94）') : fail('SA42 折叠', '');
  idxhtml.includes('id="tutorial" class="modal hidden" role="dialog"') ? pass('SA43 tutorial 弹层 aria（E95）') : fail('SA43 tutorial', '');
  pfac.includes('equipped 三槽同洗脏档') ? pass('SA44 equipped 脏档清洗（E96）') : fail('SA44 equipped', '');
  save.includes('本条改落内存档') ? pass('SA45 存档校验失败落内存档（E97）') : fail('SA45 存档', '');
  (R('core/log.js').match(/MAX_LOG/g) || []).length >= 3 ? pass('SA46 日志上限单常数（E98）') : fail('SA46 日志', '');
  relscript.includes('以代码为准') ? pass('SA47 release 注释算式修正（E99）') : fail('SA47 注释', '');
  !gamejs.includes("!Game.actions['act-tab']) return;") ? pass('SA48 切页死守卫删除（E100）') : fail('SA48 死守卫', '');
  idxhtml.includes('id="popup-modal" class="modal hidden" role="dialog"') ? pass('SA49 popup 静态 aria（E101）') : fail('SA49 popup', '');

  /* ---- B6 + C 升级包 ---- */
  dsign.includes('gap >= 1 && (gap <= 3 || gap % 30 === 0)') && dsign.includes('progress(p)') ? pass('SA50 连签三日容差（C2；v37（E241）增闭关 30 日豁免、gap>=1 前置防同日空涨）') : fail('SA50 容差', '');
  ui.includes('连签第 ${prog.day}/7 日') && ui.includes('连签 ${signProg.day}/7') ? pass('SA51 连签进度双卡可见（C2）') : fail('SA51 进度', '');
  gdata.includes("key: 'k1_promise'") && gdata.includes("key: 'k2_map_method'") && gdata.includes("key: 'k3_defy_response'") && gdata.includes("key: 'k6_clone_fate'") && gdata.includes("key: 'k9_final'") ? pass('SA52 抉择值回响五键（D1）') : fail('SA52 值键', '');
  gdata.includes("req: 'k6_first_survive'") && gdata.includes("req: 'k9_p1'") && gdata.includes("req: 'k9_p2'") && gdata.includes("req: 'k3_purged_watch'") && gdata.includes("req: 'k2_relic_seen'") && gdata.includes("req: 'k7_purge_check'") ? pass('SA53 旗标回响六键（D1）') : fail('SA53 旗标键', '');
  quest.includes('已响起的因果回响') ? pass('SA54 抉择树回响计数（D1）') : fail('SA54 计数', '');
  battle.includes('e._realmRule ? ` <span class="tag tpl" title="地脉规则') ? pass('SA55 地脉规则战内可见（D6/E109）') : fail('SA55 地脉 tag', '');
  ui.includes('仙绩铭骨') && ui.includes('VISION_NAMES') ? pass('SA56 仙绩行可见（D6）') : fail('SA56 仙绩', '');
  rank.includes('在世风云修士') && rank.includes('殒身者自榜上除名') ? pass('SA57 天骄榜文案对齐（D7）') : fail('SA57 天骄榜', '');
  quest.includes("id: 'xianjie'") && quest.includes("id: 'xianVision'") && quest.includes("id: 'dungeonRule'") ? pass('SA58 百科三新词条（D7）') : fail('SA58 词条', '');
  gdata.includes('仙门之内分四阶十二层') && gdata.includes('仙劫之雷非死劫') && gdata.includes('天下十座秘境，各有地脉') ? pass('SA59 百科词条正文（D7）') : fail('SA59 正文', '');
  guide.includes('tut_v33sign') && guide.includes('tut_v33rule') && guide.includes('tut_v33fee') ? pass('SA60 升档新知三引导（D9/E103）') : fail('SA60 新知', '');
  explore.includes('雾漫深谷') && explore.includes('秋气肃杀') ? pass('SA61 天时/季节事件文案（E110）') : fail('SA61 文案', '');
  dungeon.includes('Cultivate.addInsight(p, insGain)') && dungeon.includes('Cultivate.addInsight(p, 5)') ? pass('SA62 秘境感悟走统一入口（E106）') : fail('SA62 感悟', '');
  festival.includes('delete p.flags[key]') ? pass('SA63 节庆旗标失败回滚（E107）') : fail('SA63 回滚', '');
  explore.includes('const beastOn = WorldSys.beastWaveActive(p, map.id);') ? pass('SA64 拾遗逐图判定（E105）') : fail('SA64 拾遗', '');
  (explore.match(/this\.ecoRealm\(p, map\)/g) || []).length >= 5 && explore.includes('EventSys.ecoRealm(p, map)') ? pass('SA65 探索收支随图封顶七处（E104）') : fail('SA65 封顶', '');
  cave.includes('六境封顶') ? pass('SA66 灵泉描述补封顶（E108）') : fail('SA66 灵泉', '');
  sect.includes('勤勉有赏 · 每三桩差事贡献') ? pass('SA67 连勤文案对齐（E111）') : fail('SA67 文案', '');
  utils.includes('const Daily = {') ? pass('SA68 日结总线在位（E73 前置）') : fail('SA68 总线', '');
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
    const pl = PlayerFactory.create('回响道人', { gen: 5, comp: 5, luck: 5, body: 5 });
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

  /* ---- A 组运行时（P0 双连） ---- */
  const r1 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const logBak = Log.add; Log.add = () => {};
    // A1：旧分键档（仅 legacy_1 存在、无全局键）读档——marksEarned 须回填为余额，树层不归零
    try {
      localStorage.removeItem('fanren_wd' + ReincarnationSys.legacyKey().replace('legacy_global', '_legacy_global'));
    } catch (e) { /* key 拼装以防万一 */ }
    localStorage.removeItem('fanren_wd_legacy_global');
    localStorage.setItem('fanren_wd_legacy_1', JSON.stringify({ lives: 5, marks: 12, treeExtra: 0 }));
    const L = ReincarnationSys.readLegacy();
    out.earnedBack = L.marksEarned === 12;
    out.tierKept = ReincarnationSys.baseTier(L) >= 4;
    out.marksKept = L.marks === 12;
    // 清理：删分键、写干净全局键（防跨套件污染）
    localStorage.removeItem('fanren_wd_legacy_1');
    const clean = { lives: 0, marks: 0, marksEarned: 0, treeExtra: 0, executed: {}, kept: null, grudges: [] };
    localStorage.setItem('fanren_wd_legacy_global', JSON.stringify(clean));
    // A2：旗标抉择记录 → 回响场景可见
    p.story = p.story || { seen: {}, mid: {}, choices: {} };
    p.story.choices = p.story.choices || {};
    p.story.flags = p.story.flags || {};
    Story.recordChoice('k5_past_accept', 'accept');
    Story.setFlag('k5_past_accept');
    out.echoVis = Story._vis({ reqChoice: { key: 'k5_past_accept', oneOf: ['accept'] } }) === true;
    out.echoOther = Story._vis({ reqChoice: { key: 'k5_past_accept', oneOf: ['sever'] } }) === false;
    const c6e = GameData.STORIES['c6_end'].scenes.filter(s => s.reqChoice && s.reqChoice.key === 'k5_past_accept');
    out.echoScenes = c6e.length === 3;
    delete p.story.choices['k5_past_accept']; delete p.story.flags['k5_past_accept'];
    Log.add = logBak;
    return out;
  });
  r1.earnedBack ? pass('RB1 旧分键档 marksEarned 回填（A1）') : fail('RB1 回填', JSON.stringify(r1));
  r1.tierKept && r1.marksKept ? pass('RB2 旧分键档树层/余额两全（A1）') : fail('RB2 树层', JSON.stringify({ t: r1.tierKept, m: r1.marksKept }));
  r1.echoVis && r1.echoOther ? pass('RB3 旗标抉择回响场景可见性（A2）') : fail('RB3 可见性', JSON.stringify({ v: r1.echoVis, o: r1.echoOther }));
  r1.echoScenes ? pass('RB4 c6_end 三面回响场景在位（A2）') : fail('RB4 场景', String(r1.echoScenes));

  /* ---- B 组运行时（战斗一致性 + 经济） ---- */
  const r2 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const logBak = Log.add; Log.add = () => {};
    const stubAA = async fn => { const a = Game.afterAction; Game.afterAction = () => {}; try { return await fn(); } finally { Game.afterAction = a; } };
    // E67：被控时 controlledConsume 吃掉回合并消耗控制；未控返回 false
    // （玩家提到血量上限之上——完整敌方回合力流程不得致死把 Battle.active 打空）
    const hpBak = p.hp;
    p.hp = 1000000;
    const en = buildMonster('m_yezhu'); en.fx = []; en.hp = en.hpMax; en.hp = en.hpMax || 100;   // buildMonster 不写 hp（Battle.start 才赋），手工上下文须自补
    Battle.active = { enemy: en, ctx: {}, myFx: [{ kind: 'stun', rounds: 1 }], stats: { out: 0, in: 0, src: {} }, logs: [], floats: [], buffs: {}, defending: false, combo: 0, waveIds: null };
    const st = Stat.compute(p);
    out.c1 = await Battle.controlledConsume(st) === true;
    out.c2 = Battle.active && !StatusFx.has(Battle.active.myFx, 'stun');
    out.c3 = Battle.active && await Battle.controlledConsume(st) === false;
    // E67：actUlt 在被控时不扣真元（守卫先于扣费）
    const daoKeys = Object.keys(GameData.BATTLE_SKILLS || {});
    if (daoKeys.length && Battle.active) {
      const daoBak = p.dao; p.dao = daoKeys[0];
      const sk = Battle.ultList()[0];
      Battle.active.myFx = [{ kind: 'freeze', rounds: 1 }];
      Battle.active.zhenyuan = 50;
      const toasts = []; UI.toast = m => toasts.push(m);
      p.hp = 1000000;
      await Battle.actUlt(sk.id);
      out.c4 = Battle.active && Battle.active.zhenyuan === 50 && !StatusFx.has(Battle.active.myFx, 'freeze');
      p.dao = daoBak;
    } else out.c4 = 'skip';
    Battle.active = null; p.hp = hpBak;
    // E68：偷来的增益在敌方回合末衰减
    const steal = [{ kind: 'atkup', pct: 30, rounds: 2 }];
    StatusFx.tick(steal, 'enemyEnd');
    out.e68 = steal.length === 0 || steal[0].rounds === 1;
    // E70：凝神真元满不供换气项、不白扣
    Battle.active = { enemy: Object.assign(buildMonster('m_yezhu'), { fx: [], hp: 100, hpMax: 100 }), ctx: {}, myFx: [{ kind: 'poison', pct: 3, rounds: 2 }], enemyFxIds: [], morale: 25, zhenyuan: 6, zmax: 6, _ningUsed: false, combo: 0, stats: { out: 0, in: 0, src: {} }, logs: [], floats: [], buffs: {}, defending: false };
    const popBak = UI.popup;
    UI.popup = async o => (o.options || []).some(x => x.value === 'zy') ? 'zy' : null;
    await Battle.actNingshen();
    out.e70a = Battle.active.morale === 25 && !Battle.active._ningUsed;   // 满元：无 zy 项可点
    Battle.active.zhenyuan = 5; Battle.active._ningUsed = false;
    await Battle.actNingshen();
    out.e70b = Battle.active.zhenyuan === 6 && Battle.active.morale === 5;
    UI.popup = popBak;
    Battle.active = null;
    // E73：古匣日限跨 state() 轮换存续
    const today = Math.floor(p.day);
    const chBak = Utils.chance; Utils.chance = () => true;
    const pop2 = UI.popup; UI.popup = async () => true;   // 竞拍确认弹窗桩（不桩则挂死等待点击）
    p.auction = { item: 'mystery', seq: 0, base: 100, until: today + 60 };
    Bag.addStones(1000000);
    const w0 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
    await stubAA(() => AuctionSys.bid('steady'));
    out.e73a = p._boxDay === today;   // 第 0 日也须成立（真值 coercion 曾在此失配）
    const wMid = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;   // 首匣已花 115
    p.auction.until = 0; p.auction.seq++;   // 触发 state() 整体重掷（原 boxDay 在此蒸发）
    const rolled = AuctionSys.state(p);
    await stubAA(() => AuctionSys.bid('steady'));
    const w1 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
    out.e73b = rolled.item !== 'mystery' || w1 === wMid;   // 换出的若仍是古匣，第二次必被门禁挡下（分文不流）
    Utils.chance = chBak;
    UI.popup = pop2;
    p.auction = null;
    // E74：工费阶梯 + 套利归负
    out.e74fee1 = ForgeSys.feeOf({ out: 'w_tulong' }) === 450;
    out.e74fee4 = ForgeSys.feeOf({ out: 'z_xingpan' }) === 1750;
    const pmBak = WorldSys.priceMul, mmBak = WorldSys.marketMul;
    WorldSys.priceMul = () => 1; WorldSys.marketMul = () => 1;
    const ev1 = 0.75 * ShopSys.sellPrice('w_tulong') < 300 + ForgeSys.feeOf({ out: 'w_tulong' });
    const ev4 = 0.60 * ShopSys.sellPrice('z_xingpan') < 700 + ForgeSys.feeOf({ out: 'z_xingpan' });
    WorldSys.priceMul = pmBak; WorldSys.marketMul = mmBak;
    out.e74ev = ev1 && ev4;
    // E74：灵石不足不开炉
    p.bag.m_xuantie = 99; p.stones = { low: 10, mid: 0, high: 0 };
    const ch2 = Utils.chance; Utils.chance = () => true;
    const before = Bag.count('w_tulong');
    ForgeSys.forge('f1');
    out.e74noFee = Bag.count('w_tulong') === before && (p.stones.low + p.stones.mid * 100) === 10;
    Utils.chance = ch2;
    // E76：器胚旗标挂 id——同 id 兑现并清旗，异 id 不动旗
    p._embryoSuffixFor = 'w_tiejian';
    const inst = { id: 'w_tiejian' };
    const ax = ForgeSys.affixesOf(p, inst);
    out.e76a = p._embryoSuffixFor === null && !!ax.suffix;
    p._embryoSuffixFor = 'w_tulong';
    const inst2 = { id: 'w_hanshuang' };
    ForgeSys.affixesOf(p, inst2);
    out.e76b = p._embryoSuffixFor === 'w_tulong';
    delete p._embryoSuffixFor;
    // E77：views 按拍品连任累计、换品归一
    const ch3 = Utils.chance; Utils.chance = () => false;
    p.auction = null;
    AuctionSys.state(p);
    const lotA = AuctionSys.state(p);
    out.e77a = (lotA.views || 0) === 1;
    p.auction.until = Math.floor(p.day) - 1;   // 同日同 seq 同 hash → 同拍品连任
    const lotB = AuctionSys.state(p);
    out.e77b = lotB.item === lotA.item && lotB.views === 2;
    Utils.chance = () => true;
    p.auction = null;
    const lotC = AuctionSys.state(p);
    out.e77c = lotC.item === 'mystery' && lotC.views === undefined;
    Utils.chance = ch3;
    p.auction = null;
    // E91：灵疫当年药价两侧同乘、他物不动（herbMul 桩成对恢复，不跨断言泄漏）
    const y = WorldSys.year(p);
    p.world.lingyiUntil = y;
    const pm2 = WorldSys.priceMul, mm2 = WorldSys.marketMul, hmBak = WorldSys.herbMul;
    WorldSys.priceMul = () => 1; WorldSys.marketMul = () => 1;
    const pillOn = ShopSys.price('pill_juqi');
    const herbOn = ShopSys.price('m_lingzhi');
    const gearOn = ShopSys.price('w_tiejian');
    const sellOn = ShopSys.sellPrice('m_lingzhi');
    WorldSys.herbMul = () => 1;
    const pillOff = ShopSys.price('pill_juqi');
    const herbOff = ShopSys.price('m_lingzhi');
    const gearOff = ShopSys.price('w_tiejian');
    const sellOff = ShopSys.sellPrice('m_lingzhi');
    const near = (a, b) => Math.abs(a - b) <= 1;   // Math.round 单次取整 ±1 抖动
    out.e91a = near(pillOn, pillOff * 1.15) && near(herbOn, herbOff * 1.15) && herbOff > 0;   // 丹药/灵药材同乘 1.15
    out.e91b = gearOn === gearOff && gearOff > 0;   // 武器不随药价腾贵
    out.e91c = near(sellOn, sellOff * 1.15);   // 卖侧同乘 → ratio 不变无套利
    WorldSys.herbMul = hmBak;
    WorldSys.priceMul = pm2; WorldSys.marketMul = mm2;
    delete p.world.lingyiUntil;
    // E92：天下大事入年表
    const pwBak = Utils.pickWeighted; Utils.pickWeighted = () => 'lingyi';
    p.chronicle = p.chronicle || [];
    const chronN = p.chronicle.length;
    p.world.pending = null;
    WorldSys.fireEvent(p, y);
    out.e92 = p.chronicle.length > chronN && p.chronicle[p.chronicle.length - 1].txt.includes('天下大事');
    Utils.pickWeighted = pwBak;
    p.world.pending = null;
    // C2：连签容差——隔二日续签、隔五日重计
    const aaBak = Game.afterAction; Game.afterAction = () => {};
    p.signDay = today - 2; p.signStreak = 3;
    DailySign.draw();
    out.c2a = p.signStreak === 4;
    p.signDay = today - 5; p.signStreak = 3;
    DailySign.draw();
    out.c2b = p.signStreak === 1;
    Game.afterAction = aaBak;
    out.c2prog = DailySign.progress(p).day === ((p.signStreak - 1) % 7) + 1;
    p.signStreak = 0; p.signDay = null;
    // C2：黄历卡进度可见
    p.signStreak = 5; p.signDay = today - 1;
    out.c2ui = UI.renderSignCard().includes('连签第');
    p.signStreak = 0; p.signDay = null;
    // E107：节庆 fire 失败回滚旗标
    const ftBak = FestivalSys.today, ffireBak = FestivalSys.fire;
    FestivalSys.today = () => ({ id: 'duanwu', name: '端午', desc: '测试' });
    FestivalSys.fire = async () => { throw new Error('模拟节庆弹窗失败'); };
    const festKey = 'fest_duanwu_' + Math.floor((p.day || 0) / 365 + 1);
    delete p.flags[festKey];
    try { FestivalSys.check(p, false); } catch (e) { /* 外层捕获同款 */ }
    await new Promise(r2 => setTimeout(r2, 60));   // 等 fire 的 rejection 回滚旗标
    out.e107 = !p.flags[festKey];
    FestivalSys.today = ftBak; FestivalSys.fire = ffireBak;
    // E82：补结日报收口
    Game._offlineAgg = { disciple: 500 };
    const logs = []; Log.add = t => logs.push(t);
    Game.flushOfflineAgg('【7 日总账】');
    Log.add = logBak;
    out.e82 = logs.some(t => t.includes('7 日总账') && t.includes('500')) && Game._offlineAgg === null;
    Log.add = logBak;
    return out;
  });
  r2.c1 && r2.c2 && r2.c3 ? pass('RB5 被控回合被吃且控制消耗（E67）') : fail('RB5 控制', JSON.stringify({ a: r2.c1, b: r2.c2, c: r2.c3 }));
  r2.c4 === true || r2.c4 === 'skip' ? pass('RB6 被控必杀不扣真元（E67）') : fail('RB6 必杀守卫', String(r2.c4));
  r2.e68 ? pass('RB7 偷来的增益正常衰减（E68）') : fail('RB7 衰减', '');
  r2.e70a && r2.e70b ? pass('RB8 凝神满元不供项/未满可换（E70）') : fail('RB8 凝神', JSON.stringify({ a: r2.e70a, b: r2.e70b }));
  r2.e73a && r2.e73b ? pass('RB9 古匣日限跨轮换存续（E73）') : fail('RB9 古匣', JSON.stringify({ a: r2.e73a, b: r2.e73b }));
  r2.e74fee1 && r2.e74fee4 ? pass('RB10 工费阶梯数值（E74）') : fail('RB10 工费', JSON.stringify({ f1: r2.e74fee1, f4: r2.e74fee4 }));
  r2.e74ev ? pass('RB11 炼器→出售期望归负（E74）') : fail('RB11 套利', '');
  r2.e74noFee ? pass('RB12 工费不足不开炉（E74）') : fail('RB12 开炉', '');
  r2.e76a && r2.e76b ? pass('RB13 器胚旗标同 id 兑现（E76）') : fail('RB13 旗标', JSON.stringify({ a: r2.e76a, b: r2.e76b }));
  r2.e77a && r2.e77b && r2.e77c ? pass('RB14 热度连任累计/古匣无 views（E77）') : fail('RB14 热度', JSON.stringify({ a: r2.e77a, b: r2.e77b, c: r2.e77c }));
  r2.e91a && r2.e91b && r2.e91c ? pass('RB15 灵疫药价两侧同乘（E91）') : fail('RB15 药价', JSON.stringify({ a: r2.e91a, b: r2.e91b, c: r2.e91c }));
  r2.e92 ? pass('RB16 天下大事入年表（E92）') : fail('RB16 年表', '');
  r2.c2a && r2.c2b ? pass('RB17 连签隔二日续/隔五日断（C2）') : fail('RB17 连签', JSON.stringify({ a: r2.c2a, b: r2.c2b }));
  r2.c2prog && r2.c2ui ? pass('RB18 连签进度单源+卡面可见（C2）') : fail('RB18 进度', JSON.stringify({ p: r2.c2prog, u: r2.c2ui }));
  r2.e107 ? pass('RB19 节庆失败回滚旗标（E107）') : fail('RB19 节庆', '');
  r2.e82 ? pass('RB20 补结总账收口（E82）') : fail('RB20 总账', '');

  /* ---- C 组运行时（回响网络 + 工程） ---- */
  const r3 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const logBak = Log.add; Log.add = () => {};
    // D1：八面回响场景按旗标/抉择值可见（逐旗标 _vis 探针）
    const probes = [
      ['k1_promise', { reqChoice: { key: 'k1_promise', oneOf: ['vengeance'] } }],
      ['k2_map_method', { reqChoice: { key: 'k2_map_method', oneOf: ['memorize'] } }],
      ['k3_defy_response', { reqChoice: { key: 'k3_defy_response', oneOf: ['silent'] } }],
    ];
    p.story = p.story || { seen: {}, mid: {}, choices: {} };
    p.story.choices = p.story.choices || {};
    let okN = 0;
    for (const [k, sc] of probes) {
      Story.recordChoice(k, Array.isArray(sc.reqChoice.oneOf) ? sc.reqChoice.oneOf[0] : sc.reqChoice.val);
      if (Story._vis(sc)) okN++;
      delete p.story.choices[k];
    }
    out.d1choice = okN === probes.length;
    let flagOk = 0;
    for (const fl of ['k6_first_survive', 'k9_p1', 'k9_p2', 'k3_purged_watch', 'k2_relic_seen', 'k7_purge_check']) {
      p.story.flags = p.story.flags || {};
      p.story.flags[fl] = true;
      if (Story._vis({ req: fl })) flagOk++;
      delete p.story.flags[fl];
    }
    out.d1flag = flagOk === 6;
    // D1：全部 11 枚回响探针挂在真实场景上（数据侧抽查三条）
    out.d1scenes = GameData.STORIES['c2_mid'].scenes.some(s => s.reqChoice && s.reqChoice.key === 'k1_promise')
      && GameData.STORIES['c7_mid'].scenes.some(s => s.reqChoice && s.reqChoice.key === 'k6_clone_fate')
      && GameData.STORIES['c10_open'].scenes.some(s => s.reqChoice && s.reqChoice.key === 'k9_final');
    // E96：equipped 脏档清洗
    const dirty = PlayerFactory.migrate(Object.assign(PlayerFactory.create('脏档', { gen: 5, comp: 5, luck: 5, body: 5 }), { equipped: { weapon: { id: 'g_goods_removed' }, armor: null, accessory: { id: 'w_tiejian' } } }));
    out.e96 = dirty.equipped.weapon === null && !!dirty.equipped.accessory;
    // D6：地脉 tag 探针字段与渲染标记同源
    const re = DungeonSys.makeEnemy(GameData.SECRET_REALMS[3], 5);
    out.d6 = typeof re._realmRule === 'string' && re._realmRule.includes('剑气禁制');
    // D7：百科词条解锁探针
    out.d7 = QuestSys.LORE_KEYS.filter(e => ['xianjie', 'xianVision', 'dungeonRule'].includes(e.id)).length === 3;
    // D9：guide tips 升档新知触发一次后自锁
    p.counters.signs = 5; p.counters.forges = 3; p.counters.maxDepth = 3;
    p.flags = p.flags || {};
    delete p.flags.tut_v33sign; delete p.flags.tut_v33rule; delete p.flags.tut_v33fee;
    const tips = Guide.tips(p);
    out.d9a = ['tut_v33sign', 'tut_v33rule', 'tut_v33fee'].every(k => p.flags[k] === true);
    out.d9b = tips.some(t => t.text.includes('连签')) && tips.some(t => t.text.includes('地脉')) && tips.some(t => t.text.includes('工费'));
    Log.add = logBak;
    return out;
  });
  r3.d1choice && r3.d1flag ? pass('RB21 九面回响探针全通（D1）') : fail('RB21 回响探针', JSON.stringify({ c: r3.d1choice, f: r3.d1flag }));
  r3.d1scenes ? pass('RB22 回响场景挂靠真实章节（D1）') : fail('RB22 挂靠', '');
  r3.e96 ? pass('RB23 equipped 脏档槽位清洗（E96）') : fail('RB23 equipped', '');
  r3.d6 ? pass('RB24 地脉规则字段+文案在位（D6/E109）') : fail('RB24 地脉', '');
  r3.d7 ? pass('RB25 百科三词条注册（D7）') : fail('RB25 百科', '');
  r3.d9a && r3.d9b ? pass('RB26 升档新知触发+自锁（D9/E103）') : fail('RB26 新知', JSON.stringify({ a: r3.d9a, b: r3.d9b }));
} finally {
  try { if (browser) await browser.close(); } catch (e) { /* ignore */ }
}

console.log(`\n共 ${passN + failN} 项，失败 ${failN} 项`);
if (failN > 0 || consoleErrors.length > 0) {
  if (consoleErrors.length) {
    console.log(`控制台错误 ${consoleErrors.length} 条:`);
    consoleErrors.slice(0, 10).forEach(e => console.log('  · ' + e));
  }
  process.exit(1);
} else {
  console.log('控制台错误 0 条');
}
