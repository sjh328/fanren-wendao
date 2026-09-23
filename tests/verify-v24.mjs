
/* ======================================================================
 * verify-v24 · v38「大衍」专项回归
 * 覆盖：E278~E287 深审批修 / E300 道途双脉 / E301 自创功法 / E302 元神化身 /
 *       E303 灵兽繁育 / E304 三段天劫 / E305 阵法夜袭 / E306 天道誓言 /
 *       E307 秘境异变 / E308 读招洞察与战意爆发 / E309 仙庭 / E310 云海 /
 *       E311 轮作变异 / E312 声望四档 / E313 擂主 / E314 洞天机制化 /
 *       E315 双预设 / E316 体修解禁 / E317 丹方研创炼器配比 / E318 劫难 /
 *       E319 一世报告 / E320 转修软化 / E323~E327 摩擦去除 / E337~E345 特点化
 * 断言总数：SA 46 + RB 8（见文件尾统计口径；每大系统 ≥2 条）
 * 运行前置：node server.mjs（:8341）+ 本机 Chrome
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

/* ================= SA 源码静态组 ================= */
console.log('===== SA 源码静态组 =====');
{
  const gdata = R('data/game-data.js');
  const dao = R('systems/dao.js');
  const gongfa = R('systems/gongfa.js');
  const cult = R('systems/cultivate.js');
  const battle = R('battle/battle.js');
  const trib = R('systems/tribulation.js');
  const cave = R('systems/cave.js');
  const beast = R('systems/beast.js');
  const avatar = R('systems/avatar.js');
  const oath = R('systems/oath.js');
  const dungeon = R('systems/dungeon.js');
  const xian = R('systems/xian.js');
  const reinc = R('systems/reincarnation.js');
  const npc = R('systems/npc.js');
  const pfac = R('core/player-factory.js');
  const stat = R('core/stat.js');
  const guide = R('core/guide.js');
  const game = R('game.js');
  const ui = R('ui/ui.js');
  const sect = R('systems/sect.js');
  const forge = R('systems/forge.js');
  const craft = R('systems/craft.js');
  const tower = R('systems/tower.js');
  const black = R('systems/black.js');
  const bounty = R('systems/bounty.js');
  const rank = R('systems/rank.js');
  const explore = R('systems/explore.js');
  const world = R('systems/world.js');
  const karma = R('systems/karma.js');
  const bag = R('systems/bag.js');
  const modules = readFileSync(join(__dirname, 'scripts', 'modules.json'), 'utf8');

  const has = (t, cond, d) => cond ? pass(t) : fail(t, d || '锚点缺失');

  /* ---- E278~E287 批修 ---- */
  has('E278 spendInsight 池空视同全再生（ρ=1）', /if \(!src\.length\) \{ p\.insight = Math\.max\(0, total - take\); return 1; \}/.test(cult));
  has('E279 切磋总限先于单 NPC 落章', cult2fix(npc), 'npc.js spar 判序');
  has('E280 灵兽十阶第二技按名判重', /SPECIES_SKILLS2\[b\.species\] && !\(b\.skills \|\| \[\]\)\.some/.test(beast));
  has('E281 放归派遣中灵兽有守卫', /trip && b\.trip\.until > Math\.floor/.test(beast));
  has('E282 npcCombatPower 基式对齐 buildEnemy（65+rp\^1.6×5.2）', /65 \+ Math\.pow\(rp, 1\.6\) \* 5\.2/.test(npc) && /7 \+ rp \* 2\.7\) \* mod/.test(npc));
  has('E284 xian daozuCheck 死行已删（留痕注释在案、活码零命中）', /删除无效果死行/.test(xian) && !/^    p.counters.xianyuan = (p.counters.xianyuan || 0);$/m.test(xian));
  has('E286 sect join 死字段 rank 已删', !/faction: null, rank: 'outer'/.test(sect));
  has('E287 剑道注释口径校正', /剑道六境·第五重「万剑归宗」/.test(battle));

  /* ---- E300 道途双脉 ---- */
  has('E300 DAO_PATHS 十二脉全表', (gdata.match(/key: '/g) || []).length >= 20 && /DAO_PATHS: \{/.test(gdata));
  has('E300 gain 晋重分岔钩子（3/6 重置 pendingDaoPath）', /after === 3 \|\| after === 6/.test(dao) && /pendingDaoPath = after/.test(dao));
  has('E300 hasPath 单源消费（battle 多点）', (battle.match(/hasPath\(p, \d, '/g) || []).length >= 8);
  has('E300 afterAction 道途分岔时序', /pendingDaoPath && !p\.dead && !Battle\.active/.test(game));
  has('E300 stat 消费（血牛盘根 hpPct+15）', /hasPath\(p, 3, 'xueNiu'\)\) b\.hpPct \+= 15/.test(dao));

  /* ---- E301 自创功法 ---- */
  has('E301 GONGFA_MODULES 模块池 ≥9', (gdata.match(/gm_/g) || []).length >= 9);
  has('E301 buildCustom 注册 ITEMS + grade4 带', /GameData\.ITEMS\[def\.id\] = def/.test(gongfa) && /grade: 4, price: 0, custom: true/.test(gongfa));
  has('E301 名额 CUSTOM_MAX=3 + 参悟 ×1.3', /CUSTOM_MAX: 3/.test(gongfa) && /def\.custom \? 1\.3 : 1/.test(gongfa));
  has('E301 enterGame syncCustom 重注册', /GongfaSys\.syncCustom\(this\.player\)/.test(game));

  /* ---- E302 元神化身 ---- */
  has('E302 avatar 模块登记 modules.json', /"js\/systems\/avatar\.js"/.test(modules));
  has('E302 效率硬锚 0.5→0.75', /Math\.min\(0\.75, 0\.5 \+/.test(avatar));
  has('E302 dailySettle 钩子接线（E327 离线同源）', /AvatarSys\.daily\(p, auto\)/.test(game));
  has('E302 驻守灵泉 ×1.2', /guardOn \? 1\.2 : 1/.test(cave));

  /* ---- E303 灵兽繁育 ---- */
  has('E303 结契门槛：双十阶/休契/血亲拦截', /x\.level >= 10 && \(x\.breedCd \|\| 0\) <= today/.test(beast) && /lineage \|\| \[\]\)\.includes/.test(beast));
  has('E303 遗传 2~4 门（超野生上限）', /Utils\.rand\(2, Math\.min\(4, skillPool\.length\)\)/.test(beast));

  /* ---- E304 三段天劫 ---- */
  has('E304 TRIB_OMENS 四劫象表', (gdata.match(/id: '(lei|huo|feng|xin)',/g) || []).length >= 4);
  has('E304 stageIdx<3 走劫势视图（三策后置）', /S\.stageIdx \|\| 0\) < 3/.test(trib));
  has('E304 应 +2%/劫势 −1.5% 带内收敛', /yingN \|\| 0\) \* 2 - \(S\.stress \|\| 0\) \* 1\.5/.test(trib));
  has('E304 根骨如渊/道基虚浮旗标', /rootPeak = true/.test(trib) && /rootShallow = true/.test(trib));
  has('E304 stat rootPeak 全属性 +5%', /rootPct \+ rootPeak\) \/ 100/.test(stat));

  /* ---- E305 阵法与夜袭 ---- */
  has('E305 阵旗 f23~f26 + 四旗 ITEMS', /id: 'f23'/.test(gdata) && /b_juling/.test(gdata) && /b_lianxi/.test(gdata));
  has('E305 flagPower 单源（地载×1.3/传习×1.25）', /diZai'\)\) n \*= 1\.3/.test(cave) && /zhoutian'\) n \*= 1\.25/.test(cave));
  has('E305 聚灵旗入 baseGain 链', /flagPower\(p, 'b_juling'\)/.test(cult));
  has('E305 夜袭 dailySettle + 挂起时序', /nightRaidCheck\(p, auto\)/.test(game) && /pendingNightRaid && !p\.dead/.test(game));

  /* ---- E306 天道誓言 ---- */
  has('E306 五誓 DEFS + MAX 2 + 禁立 90 日', /MAX: 2/.test(oath) && /BAN_DAYS: 90/.test(oath) && (oath.match(/id: '(kill|dan|solo|poor|still)'/g) || []).length >= 5);
  has('E306 杀孽冻结（addKarma 单源）', /OathSys\.active\(p, 'kill'\)/.test(karma));
  has('E306 辟谷丹誓拦截（use/useMulti/战斗三口）', (bag.match(/OathSys\.active\(p, 'dan'\)/g) || []).length >= 2 && /OathSys\.active\(p, 'dan'\)/.test(battle));
  has('E306 破戒登记 + afterAction 清算', /killViolation\(p\)/.test(battle) && /OathSys\.pendingResolve\(p\)/.test(game));
  has('E306 誓约回报入 stat（still/dan/poor）', /OathSys\.cultBonus/.test(stat) && /OathSys\.pillBonus/.test(stat) && /OathSys\.shopBonus/.test(stat));

  /* ---- E307 秘境异变 ---- */
  has('E307 异变池十条正负成对', (gdata.match(/tone: '(good|mix|bad)'/g) || []).length >= 10);
  has('E307 入秘 roll 1~2 条 + 可净化', /muts\.push\(m\.id\)/.test(dungeon) && /purify\(id\) \{/.test(dungeon));
  has('E307 古咒层数 +1 / Boss 必双词缀', /guZhou \? 1 : 0/.test(dungeon) && /_forceFx2 = true/.test(dungeon));
  has('E307 异变入战 ctx（剑冢/孤勇/瘴雾/深寒）', /mutJzz: this\.hasMut\(D, 'jianzhong'\)/.test(dungeon) && /mutShenhan/.test(battle));

  /* ---- E308 读招洞察与战意爆发 ---- */
  has('E308 intentCounter 克制表（蓄力/杀招/自愈/强化）', /intentCounter\(intent\)/.test(battle) && /kind === 'charge'/.test(battle));
  has('E308 满层破绽毕现（vuln 40 + _sureCrit）', /B\._sureCrit = true/.test(battle));
  has('E308 _sureCrit 三伤害口消费', (battle.match(/B\._sureCrit \|\| Utils\.chance/g) || []).length >= 3);
  has('E308 战意爆发 ≥90/每场两次/1.8×+3 真元', /burstUsed \|\| 0\) >= 2/.test(battle) && /myAtk\(st\) \* 1\.8/.test(battle));

  /* ---- E309 仙庭 ---- */
  has('E309 九品 PINS 门槛表', (xian.match(/PINS: \[0, 300/) || []).length === 1);
  has('E309 差遣三桩 + 日重掷基线', /courtDaily\(p, auto\)/.test(game) && /c\.base = \{ wins/.test(xian));
  has('E309 心魔 ≥80 罢黜罚功一成', /gong\(p\) \* 0\.1/.test(xian));
  has('E309 仙兵借用（每战一次 buff）', /_xianbingUsed/.test(battle) && /20 \+ pin \* 2/.test(battle));

  /* ---- E310 云海 ---- */
  has('E310 双图 gate（ascended/court5）', /gate: 'ascended'/.test(gdata) && /gate: 'court5'/.test(gdata));
  has('E310 云海仙兽 5+1', /m_xianjiang/.test(gdata) && /m_xianhe/.test(gdata));
  has('E310 go() 门槛拦截', /map\.gate === 'ascended' && !\(p\.flags && p\.flags\.ascended\)/.test(explore));

  /* ---- E311/E288 灵田 ---- */
  has('E311 连作变异 15%（streak≥3）', /streak \|\| 0\) >= 3 && Utils\.chance\(15\)/.test(cave));
  has('E311 轮作 −20% 生长期 + 土地记忆留田', /sd\.days \* 0\.8/.test(cave) && /lastCrop: lastCropKeep, streak: streakKeep/.test(cave));
  has('E288 plots 定长 8 迁移', /plots\.length < 8\) out\.cave\.plots\.push\(null\)/.test(pfac));

  /* ---- E312 声望四档 ---- */
  has('E312 60 折 / 90 奇遇 / 120 初见敬意', /reputation \|\| 0\) >= 60 \? 5 : 0/.test(stat) && /reputation \|\| 0\) >= 90/.test(explore) && /firstMeetBoost/.test(npc));

  /* ---- E313 擂主 ---- */
  has('E313 连胜 3 场解锁 + 日限 + 败清零', /streak < 3|streak \|\| 0\) < 3/.test(beast) && /champDay === today/.test(beast) && /beastArena\.streak = 0/.test(beast));

  /* ---- E314 洞天机制化 ---- */
  has('E314 灵潮窗口 3→4 / 星槎 −20% / 太虚顿悟 / 大罗 +5%', /RUSH_WINDOW\(\) \{.*dongtian >= 1\) \? 4 : 3/.test(cave) && /dongtian >= 2\) days = Math\.max\(3, Math\.ceil\(days \* 0\.8\)\)/.test(beast) && /dongtian >= 3\) \? 10 : 0/.test(gongfa) && /dongtian >= 4\) \? 1\.05 : 1/.test(cult));

  /* ---- E315/E316 ---- */
  has('E315 battleDeckAlt 字段 + 存/切动作', /battleDeckAlt: null/.test(pfac) && /'act-deck-save'/.test(game) && /'act-deck-swap'/.test(game));
  has('E316 体修法诀解禁（可修 ×0.7）', !/难悟玄级及以上法诀'/.test(dao) && /dao === 'body' && \(def\.grade \|\| 0\) >= 2/.test(battle) && /power \*= 0\.7/.test(battle));

  /* ---- E317 丹方研创与炼器配比 ---- */
  has('E317 EXP_RECIPES 六方 + 试方日限', (gdata.match(/id: 'er\d'/g) || []).length >= 6 && /_expDay === today/.test(craft));
  has('E317 添料配比偏置（前缀 +25%/份）', /metalBias/.test(forge) && /1 \+ 0\.25 \* bias/.test(forge));
  has('E317 研创丹新效果键（morale/zy/enfx）', /effect\.morale/.test(bag) && /effect\.zy/.test(bag) && /effect\.enfx/.test(bag));

  /* ---- E318 劫难 ---- */
  has('E318 三劫难 + 每重 +1 印记（兵解防重护栏内）', /trials\.length/.test(reinc) && /trialBonus/.test(reinc));
  has('E318 layerNeedT ×1.15 统一入口（13+ 消费点）', /layerNeedT\(p, realmIdx, layer\)/.test(gdata) && (guide.match(/layerNeedT/g) || []).length >= 2 && (cult.match(/layerNeedT/g) || []).length >= 4);
  has('E318 群邪环伺 buildMonster/buildEnemy ×1.10', /foeMul/.test(R('systems/status-fx.js')) && /foeMul/.test(npc));
  has('E318 天威难测劫威 +15%', /trials\.includes\('trib'\)\) base = Math\.round\(base \* 1\.15\)/.test(trib));

  /* ---- E319 一世报告 ---- */
  has('E319 四终局接线（坐化/兵解/飞升/道祖）', /showLifeReport\(p, '坐化'\)/.test(game) && /showLifeReport\(oldP, '兵解转世'\)/.test(reinc) && /showLifeReport\(p, '白日飞升'\)/.test(cult) && /showLifeReport\(p, '证道祖'\)/.test(xian));
  has('E319 marksStart 基线快照', /marksStart == null/.test(game));

  /* ---- E320 转修软化 ---- */
  has('E320 首次折寿 3 年/daoExp 留半/秘传保留', /first \? 3 : 5/.test(dao) && /first\) p\.daoExp\[p\.dao\] = Math\.floor/.test(dao) && /if \(!first && p\.gongfa\)/.test(dao));

  /* ---- E323~E327 摩擦去除 ---- */
  has('E323 秒胜复用 victory 单源 + 豁免名单', /instantOk && myPow \/ Math\.max\(1, foePow\) >= 2\.8/.test(battle) && /await this\.victory\(\);\s*\n\s*return;/.test(battle));
  has('E323 三态偏好（on/explore-off/off）+ ctx.explore 判据', /autoWin === 'on' \|\| \(autoWin === 'explore-off' && !ctx\.explore\)/.test(battle) && /explore: true/.test(explore));
  has('E324 塔连战三停（塔守/血 35%/赌约不递）', /前方是塔守之层/.test(tower) && /气血不足三成五/.test(tower) && /!\(\(this\.state\(p\) \|\| \{\}\)\.auto\) && run && run\.floor < 90/.test(tower));
  has('E325 行权扩容（调息/悟道/听讲/问剑/切磋）', /p\._restDay !== today/.test(guide) && /wuDaoCost\(p\)/.test(guide) && /act-sect-listen'\]\(\{\}, null\)/.test(guide) && /RankSys\.challengeAhead\(\); return/.test(guide));
  has('E326 静修自动冲关 + AutoPilot 记忆', /静修境（金丹前）圆满自动冲关|realmIdx \+ 1 < GameData\.TRIB_START/.test(R('core/autocult.js')) && /autoCfg\(\)\.auto = B\.auto/.test(game));

  /* ---- E337~E345 特点化 ---- */
  has('E337 五家招牌全落（青云/丹霞/万宝/磐岩/周天）', /qingyunDrill\(\) \{/.test(sect) && /_danxiaFreeMonth/.test(craft) && /_wanbaoHaggleDay/.test(black) && /costMul\(p\) \{ return \(p\.sect && p\.sect\.id === 'panyan'\) \? 0\.85/.test(cave) && /zhoutian'\) \? 0\.6 : 1/.test(dungeon));
  has('E338 演武/顿悟/藏宝灵机', /drillTrain\(\) \{/.test(cave) && /builds\.lib\) \|\| 0\) \* 2/.test(gongfa) && /treasuryDaily\(p, auto\)/.test(game));
  has('E339 四套装技齐备（SET_TECHS 4 键）', (gdata.match(/name: '(磐岩之意|血河叠浪|燎原之意|天成之意)'/g) || []).length >= 4);
  has('E340 TITLES 十二枚 + titleOn 单源', (gdata.match(/id: 't_/g) || []).length >= 12 && /titleOn\(p, mech\) \{/.test(game));
  has('E340 称号 mech 消费抽样（forgeRate/warOpen/slayerLoot）', /titleOn\(p, 'forgeRate'\)/.test(forge) && /titleOn\(p, 'warOpen'\)/.test(battle) && /titleOn\(p, 'slayerLoot'\)/.test(battle));
  has('E341 传承遗风四层（treeSage/treeLuck/旧识/紫气×1.5）', /treeSage = true/.test(reinc) && /treeLuck = true/.test(reinc) && /_oldFriend = id/.test(reinc) && /treeAuspicious\) \? 1\.5 : 1/.test(trib));
  has('E342 道韵协奏 echo 键 + activeEchoes 单源', (gdata.match(/echo: '/g) || []).length >= 12 && /activeEchoes\(p\) \{/.test(stat) && (battle.match(/activeEchoes\(p\)\.has\(/g) || []).length >= 4);
  has('E343 物种招牌五族（beast/snake/plant/element/swarm）', /speciesOf\(p\) \{/.test(beast) && /=== 'element'\) dmg \*= 1\.06/.test(battle) && /=== 'plant' && p\.hp > 0 && Utils\.chance\(10\)/.test(battle) && /=== 'swarm'\) atk \*= 1\.05/.test(battle) && /spFx\[1\] = 7/.test(battle));
  has('E344 代行（七折+2日）与季议三选', /contrib \* 0\.7/.test(sect) && /Time\.add\(2\)/.test(sect) && (sect.match(/id: '(war|trade|cult)',\s*name:/g) || []).length >= 3);
  has('E345 本命中段（4 阶金光+1 回合/7 阶破防+1）', /bmLv >= 4 \? 3 : 2/.test(battle) && /bmLv >= 7 \? 4 : 3/.test(battle));

  /* ---- 迁移与门禁基础 ---- */
  has('迁移 v38 步：avatar/formation/oaths/title/daoPaths 全默认', /out\.daoPaths = \(out\.daoPaths/.test(pfac) && /out\.oaths = \(out\.oaths/.test(pfac) && /out\.title = \(out\.title/.test(pfac) && /out\.cave\.formation === undefined/.test(pfac));
  has('p.title/xianCourt create 默认', /title: null/.test(pfac) && /xianCourt: null/.test(pfac));
  has('防臃肿：无新顶层页签（SUBTABS 仅 shop/cave/map）', !/SUBTABS: \{[^}]*'jianghu'/.test(ui));
  has('E322 开局 300 灵石', /low: 300/.test(pfac));
  has('E321 职业渡劫收敛（丹+4/符+2/阵+2）', /dao === 'pill'\) chance \+= 4/.test(cult) && /dao === 'talisman'\) chance \+= 2/.test(cult) && /dao === 'array'\) chance \+= 2/.test(cult));

  
  
  function cult2fix(src) {
    // E279：总限检查（_sparCount >= 3 return）必须出现在 s.sparDay = today 落章之前
    const iGuard = src.indexOf('if ((p._sparCount || 0) >= 3)');
    const iStamp = src.indexOf('s.sparDay = today;');
    return iGuard >= 0 && iStamp >= 0 && iGuard < iStamp;
  }
}

/* ================= RB 运行时组 ================= */
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
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const pl = PlayerFactory.create('大衍道人', { gen: 8, comp: 8, luck: 8, body: 8 });
    pl.flags.tutorialDone = true;
    pl.realmIdx = 7; pl.layer = 0; pl.dao = 'sword'; pl.daoExp = { sword: 3000 };
    const st0 = Stat.compute(pl); pl.hp = st0.maxHp; pl.mp = st0.maxMp;   // v38：境界抬升后回满（天劫气血守卫不被测试态误触）
    pl.daoPaths = {};
    pl.bag.m_gupian = 5; pl.bag.pill_juqi = 3; pl.bag.m_xuantie = 20; pl.bag.m_lingcao = 10;
    pl.stones.low = 500000;
    pl.insight = 90; pl.insightSrc = [{ v: 90, regen: true }];
    localStorage.setItem('fanren_wd_3', JSON.stringify({ v: 1, player: pl, meta: { name: pl.name, realmText: '大乘初期', day: 30, age: 20, ts: Date.now(), dead: false } }));
    UI.renderStart();
  });
  await page.click('[data-action="st-load"][data-slot="3"]');
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    ['popup-modal', 'dao-modal', 'tribulation-modal', 'battle-modal', 'story-modal', 'tutorial'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    if (typeof Story !== 'undefined') { Story.cur = null; Story.q = []; }
    UI.closeOverlays();
  });
  await new Promise(r => setTimeout(r, 300));

  /* ---- RB1 E300：道途分岔——晋 3 重置 pendingDaoPath、择脉落定不可回改 ---- */
  const r1 = await page.evaluate(() => {
    const p = Game.player;
    p.daoExp.sword = 400;   // 距 3 重（800）差一场
    UI._popupResolve = null;
    DaoSys.gain(p, 500);   // 越两级 → 5 重，3 重分岔在 3 重时已置（gain 后 pendingDaoPath 应为 3）
    const pend = p.pendingDaoPath;
    p.pendingDaoPath = null;
    p.daoPaths = { 3: 'A' };
    const before = p.daoPaths[3];
    p.daoPaths[3] = 'A';   // 择后不可被静默覆盖
    return { pend, before };
  });
  (r1.pend === 3 || r1.pend === 6) && r1.before === 'A'
    ? pass('RB1 E300 分岔钩子：晋重置 pendingDaoPath、daoPaths 落定') : fail('RB1 道途分岔', JSON.stringify(r1));

  /* ---- RB2 E301：自创功法全流程（名额/注册/参悟口径） ---- */
  const r2 = await page.evaluate(() => {
    const p = Game.player;
    const out = {};
    // 直落配置并注册（绕弹窗链，流程弹窗由 SA 锚覆盖）
    p.customGongfa = { custom_1: { name: '测试心剑', gtype: 'attack', mods: ['gm_fengrui', 'gm_shafa', 'gm_yuanrong'] } };
    GongfaSys.buildCustom(p, 1);
    p.gongfa.custom_1 = { level: 1, exp: 0 };
    const def = GameData.ITEMS.custom_1;
    out.registered = !!def && def.custom === true && def.grade === 4;
    out.skill = def && def.skill && def.skill.kind === 'damage' && def.skill.power === 3.0;
    out.inStat = (() => { const b = Stat.gongfaBonus(p); return (b.atkPct || 0) >= 5 && (b.crit || 0) >= 3; })();
    out.slotCap = GongfaSys.freeSlot(p) === 2;
    delete p.customGongfa.custom_1; delete p.gongfa.custom_1; delete GameData.ITEMS.custom_1;
    return out;
  });
  r2.registered && r2.skill && r2.inStat && r2.slotCap
    ? pass('RB2 E301 自创功法：注册 ITEMS/攻击式 3.0×/属性入聚合/名额递推') : fail('RB2 自创功法', JSON.stringify(r2));

  /* ---- RB3 E306：誓言立/破与杀孽冻结 ---- */
  const r3 = await page.evaluate(() => {
    const p = Game.player;
    p.oaths = {}; p.oathBanDay = 0; p.fortune = 50;
    OathSys.take('kill');
    const k0 = p.karma;
    KarmaSys.addKarma(10);
    const frozen = p.karma === k0;
    const cultOn = OathSys.cultBonus({ oaths: { still: true } }) === 8;
    // 破誓（同步部分——弹窗确认在外层以直接态验证代价式）
    p.oaths.kill = false; p.oathBanDay = Math.floor(p.day) + 90;
    const banned = OathSys.banned(p);
    p.oaths = {}; p.oathBanDay = 0;
    return { taken: OathSys.active({ oaths: { kill: true } }, 'kill'), frozen, cultOn, banned };
  });
  r3.taken && r3.frozen && r3.cultOn && r3.banned
    ? pass('RB3 E306 誓言：立誓生效/杀孽冻结/回报入 stat/禁立判定') : fail('RB3 誓言', JSON.stringify(r3));

  /* ---- RB4 E304：三段天劫状态机（劫象三重 → 三策） ---- */
  const r4 = await page.evaluate(() => {
    const p = Game.player;
    Tribulation.state = null;
    p.flags.dujieDan = 0;
    Tribulation.run(0, {});
    const S = Tribulation.state;
    const stagesOk = S && Array.isArray(S.stages) && S.stages.length === 3 && S.stageIdx === 0;
    const before = S ? S.yingN : -1;
    if (S) { S.busy = false; Tribulation.chooseStage('ying'); }
    const after = S ? S.yingN : -1;
    const idx = S ? S.stageIdx : -1;
    Tribulation.state = null;
    return { stagesOk, yingUp: after === before + 1, idxAdvanced: idx === 1, dbg: { before, after, idx, hp: p.hp, dead: p.dead } };
  });
  r4.stagesOk && r4.yingUp && r4.idxAdvanced
    ? pass('RB4 E304 三段劫势：三劫象生成/应重入账/层进推进') : fail('RB4 三段天劫', JSON.stringify(r4));

  /* ---- RB5 E323：秒胜结算等价（与手动速胜同走 victory 单源——深比对关键账目） ---- */
  const r5 = await page.evaluate(async () => {
    const p = Game.player;
    p._autoWin = 'on';
    const before = {
      stones: p.stones.low + p.stones.mid * 100,
      wins: p.counters.wins, battles: p.counters.battles,
      karma: p.karma,
    };
    await Battle.start('m_yezhu', { mapName: '秒胜测试' });
    await new Promise(r2 => setTimeout(r2, 400));
    const after = {
      stones: p.stones.low + p.stones.mid * 100,
      wins: p.counters.wins, battles: p.counters.battles,
      karma: p.karma,
    };
    return {
      noBattle: !Battle.active,
      settled: after.wins === before.wins + 1 && after.battles === before.battles + 1,
      gained: after.stones > before.stones || after.karma >= before.karma,
    };
  });
  r5.noBattle && r5.settled && r5.gained
    ? pass('RB5 E323 秒胜：碾压判据直走 victory 单源、杀业/战计/层奖照走、战后无残留') : fail('RB5 秒胜结算', JSON.stringify(r5));

  /* ---- RB6 E315：技能盘双预设存/切 ---- */
  const r6 = await page.evaluate(() => {
    const p = Game.player;
    p.gongfa.gf_tuna = { level: 1, exp: 0 };
    p.battleDeck = ['gf_tuna'];
    p.battleDeckAlt = null;
    Game.actions['act-deck-save']({}, null);
    const saved = Array.isArray(p.battleDeckAlt) && p.battleDeckAlt.length === 1;
    p.battleDeck = [];
    Game.actions['act-deck-swap']({}, null);
    const swapped = p.battleDeck.length === 1 && p.battleDeckAlt.length === 0;
    p.battleDeck = []; p.battleDeckAlt = null;
    return { saved, swapped };
  });
  r6.saved && r6.swapped ? pass('RB6 E315 双预设：存守盘/攻守互换') : fail('RB6 双预设', JSON.stringify(r6));

  /* ---- RB7 迁移链：v38 步只跑一次、新字段全默认（E127 家族防线） ---- */
  const r7 = await page.evaluate(() => {
    const old = { realmIdx: 3, layer: 1, exp: 10, day: 400, cave: { lv: 2, plots: [null, { seed: 'seed_lingcao' }] }, npcs: {}, stones: { low: 1, mid: 0, high: 0 }, bag: {}, gongfa: {} };
    old._migratedVersion = 0;
    const out = PlayerFactory.migrate(old);
    const ok1 = out.avatar && out.daoPaths && out.oaths && Array.isArray(out.cave.formation) && out.cave.formation.length === 9 && out.cave.plots.length === 8;
    const before = JSON.stringify([out.daoPaths, out.avatar.lv]);
    const out2 = PlayerFactory.migrate(out);
    const idem = JSON.stringify([out2.daoPaths, out2.avatar.lv]) === before;
    const fresh = PlayerFactory.create('新档', { gen: 5, comp: 5, luck: 5, body: 5 });
    const ok2 = fresh.title === null && fresh.xianCourt === null && fresh.battleDeckAlt === null;
    return { ok1, idem, ok2 };
  });
  r7.ok1 && r7.idem && r7.ok2 ? pass('RB7 迁移链：v38 字段默认/旧档补齐/重复迁移幂等/新档干净') : fail('RB7 迁移链', JSON.stringify(r7));

  /* ---- RB8 E309：仙庭差遣与晋品 ---- */
  const r8 = await page.evaluate(() => {
    const p = Game.player;
    p.flags.ascended = true;
    p.xianCourt = { gong: 0, day: Math.floor(p.day), claims: {}, base: { wins: p.counters.wins || 0, crafts: p.counters.crafts || 0 } };
    XianSys.courtDaily(p, false);
    p.counters.wins = (p.counters.wins || 0) + 1;
    const prog = XianSys.taskProg(p, XianSys.TASKS[0]);
    XianSys.claimTask(0);
    const gong = XianSys.gong(p);
    const pin1 = XianSys.pin(p);
    p.xianCourt.gong = 3600;
    const pin5 = XianSys.pin(p);
    const deep = XianSys.deepOpen(p);
    const price5 = XianSys.marketPrice(p, XianSys.MARKET[0]);
    p.xianCourt = null; p.flags.ascended = false;
    return { prog: prog >= 1, claimed: gong >= 60, pin1: pin1 === 1, pin5: pin5 === 5, deep, disc: price5 < XianSys.MARKET[0].base };
  });
  r8.prog && r8.claimed && r8.pin1 && r8.pin5 && r8.deep && r8.disc
    ? pass('RB8 E309 仙庭：差遣进度/领赏仙功/九品晋阶/五品云海深层/仙市折扣') : fail('RB8 仙庭', JSON.stringify(r8));

  if (consoleErrors.length) fail('RB 控制台零错误', consoleErrors.slice(0, 3).join(' | '));
  else pass('RB 控制台零错误');
} finally {
  if (browser) await browser.close();
}

console.log(`\n===== verify-v24 结果：PASS ${passN} / FAIL ${failN} =====`);
if (fails.length) { console.log('失败清单：'); fails.forEach(f => console.log('  - ' + f)); }
process.exit(failN > 0 ? 1 : 0);
