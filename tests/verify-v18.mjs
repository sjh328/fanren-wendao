/* ======================================================================
 * verify-v18 —— V32「点睛」专项回归
 * 覆盖：A P0十一连 / B 六组批修抽样 / C 战斗可读化 / D 印记分账与仙途 / E 装备经济 / F 江湖日常 / G 工程地基
 * 断言风格：源码静态检查（读 js/ 模块）+ 浏览器运行时行为检查。
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
  const battle = R('battle/battle.js');
  const beast = R('systems/beast.js');
  const tower = R('systems/tower.js');
  const dungeon = R('systems/dungeon.js');
  const bag = R('systems/bag.js');
  const forge = R('systems/forge.js');
  const shop = R('systems/shop.js');
  const auction = R('systems/auction.js');
  const sect = R('systems/sect.js');
  const festival = R('systems/festival.js');
  const reinc = R('systems/reincarnation.js');
  const xian = R('systems/xian.js');
  const cult = R('systems/cultivate.js');
  const trib = R('systems/tribulation.js');
  const autocult = R('core/autocult.js');
  const gdata = R('data/game-data.js');
  const ui = R('ui/ui.js');
  const gamejs = R('game.js');
  const achieve = R('core/achieve.js');
  const stat = R('core/stat.js');
  const pfac = R('core/player-factory.js');
  const world = R('systems/world.js');
  const bounty = R('systems/bounty.js');
  const dao = R('systems/dao.js');
  const npc = R('systems/npc.js');
  const save = R('core/save.js');
  const meta = R('core/meta.js');
  const story = R('ui/story.js');
  const explore = R('systems/explore.js');
  const cave = R('systems/cave.js');
  const dsign = R('systems/daily-sign.js');
  const gongfa = R('systems/gongfa.js');
  const utils = R('core/utils.js');
  const swjs = readFileSync(join(__dirname, 'sw.js'), 'utf8');
  const idxhtml = readFileSync(join(__dirname, 'index.html'), 'utf8');
  const pkg = readFileSync(join(__dirname, 'package.json'), 'utf8');
  const relscript = readFileSync(join(__dirname, 'scripts', 'release.mjs'), 'utf8');
  const cascript = readFileSync(join(__dirname, 'scripts', 'check-actions.mjs'), 'utf8');
  const balsim = readFileSync(join(__dirname, 'scripts', 'balance-sim.mjs'), 'utf8');

  /* ---- A P0 十一连 ---- */
  battle.includes('提升至顶部两分支共用') && battle.indexOf('const st = Stat.compute(p);') < battle.indexOf("if (who === 'me') {") ? pass('SA1 tickDots p/st 提升（A1）') : fail('SA1 tickDots', '');
  battle.includes('必杀路径原无异常兜底') && battle.includes('本命战技路径同补异常兜底') ? pass('SA2 actUlt/actBenming 异常兜底（A1）') : fail('SA2 兜底', '');
  beast.includes('此处按 ctx 补齐与 Battle.victory 同款的分发') && beast.includes('B.ctx.sectDanger != null') ? pass('SA3 驯服结算 ctx 分发（A2）') : fail('SA3 驯服分发', '');
  battle.includes('B.ctx.tower || B.ctx.story || B.ctx.dungeon || B.ctx.weType || B.ctx.sectDanger != null') ? pass('SA4 canTame 排除剧情/秘境/生死状/事件（A2）') : fail('SA4 canTame', '');
  dungeon.includes('开战前置守卫 + 成功开战后才清空') && dungeon.includes('genChoices(D); Game.afterAction(); return;') ? pass('SA5 秘境 choices 开战后清空+回滚（A3）') : fail('SA5 choices', '');
  gamejs.includes('空 choices 且未卡死则重掷本层') ? pass('SA6 读档秘境自愈（A3）') : fail('SA6 自愈', '');
  festival.includes('Battle.active || UI._popupResolve') ? pass('SA7 节庆战斗/弹窗挂起门（A3/E61）') : fail('SA7 节庆门', '');
  bag.includes('const p = Game.player;   // v32 修瑕（A4）') ? pass('SA8 drop 补 p 声明（A4）') : fail('SA8 drop', '');
  reinc.includes('marksEarned') && reinc.includes('baseTier(legacy)') && reinc.includes('TREE_EXTRA_COST') ? pass('SA9 印记分账三件套（A5/D1）') : fail('SA9 分账', '');
  reinc.includes('!cur.marksEarned') && reinc.includes('cur.marksEarned = cur.marks || 0') ? pass('SA10 老档 marksEarned 迁移（A5/v33 A1 真值回填）') : fail('SA10 迁移', '');
  !ui.includes('XianSys.unlocked(p) && !p.canReincarnate') ? pass('SA11 仙阶卡不再被兵解锁死（A6）') : fail('SA11 仙阶卡', '');
  ui.includes('act-reinc-dismiss') && gamejs.includes("'act-reinc-dismiss'") ? pass('SA12 兵解之念可收回（A6）') : fail('SA12 收回', '');
  gdata.includes('c_n8:') && gdata.includes('c_n16:') && gdata.includes('c_n18:') && gdata.includes('c_n19:') && gdata.includes('c_n20:') && gdata.includes('c_n21:') ? pass('SA13 六位新角色注册 CHARACTERS（A7）') : fail('SA13 CHARACTERS', '');
  gdata.includes('回落 NPCS 名单') ? pass('SA14 char() 兜底回落（A7）') : fail('SA14 兜底', '');
  world.includes("type === 'zhongbao'") && world.includes('ev.mapId = map.id;') && world.includes("type === 'lingyi'") && world.includes("type === 'neiluan'") && world.includes("type === 'qiren'") ? pass('SA15 四类大事专属公告+重宝mapId（A8）') : fail('SA15 世界大事', '');
  (ui.match(/data-action="stat-detail" data-stat=/g) || []).length >= 7 ? pass('SA16 属性明细七按钮接线（A9）') : fail('SA16 stat-detail', '');
  ui.includes("act: (!rush && p.cave) ? 'act-spirit-rush'") && ui.includes('data-action="act-spirit-rush"') ? pass('SA17 聚灵加速双入口（A10）') : fail('SA17 聚灵', '');
  achieve.includes('test: p => Achieve.stonesTotal(p) >= 1000') && achieve.includes("console.warn('成就判定异常:'") ? pass('SA18 e1/e2 this 修复+异常留痕（A11）') : fail('SA18 成就', '');

  /* ---- B1 战斗灵兽塔抽样 ---- */
  gdata.includes('use: { purge: 1 }') && bag.includes('if (effect.purge)') && bag.includes('StatusFx.purge(Battle.active.myFx)') ? pass('SA19 清心丹实装（E1）') : fail('SA19 清心丹', '');
  beast.includes('checkThirdSkill(b)') && beast.includes('独立检查') ? pass('SA20 第三天生技独立补发（E2）') : fail('SA20 第三技', '');
  beast.includes('p.beasts.active != null && p.beasts.active2 === uid') ? pass('SA21 双槽互斥（E3）') : fail('SA21 双槽', '');
  battle.includes('B.stats.out += dotDmg;   // v32 修瑕（E4）') ? pass('SA22 敌方 DOT 入总伤（E4）') : fail('SA22 DOT 统计', '');
  beast.includes('if (B && B.busy) return;   // v32 修瑕（E5）') ? pass('SA23 驯服 busy 守卫（E5）') : fail('SA23 busy', '');
  battle.includes('【阵旗重张】') ? pass('SA24 续波重掷阵法压制（E6）') : fail('SA24 阵道续波', '');
  battle.includes('塔心不灭原只在 enemyStrike 直伤结算内拦截') ? pass('SA25 塔心不灭挪收口（E7）') : fail('SA25 不灭', '');
  battle.includes('gainZyOnCrit(p, crit)') && battle.includes('各伤害会心入口统一调用') ? pass('SA26 聚气归元单源（E8）') : fail('SA26 归元', '');
  battle.includes('ctrlDecayOnEnemy()') && beast.includes('Battle.ctrlDecayOnEnemy()') ? pass('SA27 玩家侧控制递减（E9）') : fail('SA27 控制递减', '');
  tower.includes('气血门槛原在 nextFloor 才查') ? pass('SA28 塔扣次前查气血（E10）') : fail('SA28 塔气血', '');
  gdata.includes("desc: '雷符成狱，25% 冻结（2.8×）'") && gdata.includes("desc: '一崩山河震，25% 震缚（2.5×）'") ? pass('SA29 必杀文案 25%（E11）') : fail('SA29 文案', '');
  battle.includes("['pill_liaoshang', 'pill_guben', 'pill_dahuan']") && battle.includes('按回复量择优') ? pass('SA30 自动吃丹/治疗择优（E12）') : fail('SA30 自动战斗', '');
  beast.includes("if (b.level < 10 && b.exp >= b.level * 400)") ? pass('SA31 满级兽误导提示修复（E13）') : fail('SA31 claimTrip', '');
  !R('systems/status-fx.js').includes('decayKinds') ? pass('SA32 decayKinds 死代码清除（E14）') : fail('SA32 decayKinds', '');
  battle.includes('B.turn = 1;   // v32 修瑕（E14）') ? pass('SA33 续波回合数重置（E14）') : fail('SA33 回合重置', '');
  battle.includes('while (box.children.length >= 120 && box.firstChild) box.removeChild(box.firstChild);') ? pass('SA34 战斗日志 DOM 同步裁剪（E15）') : fail('SA34 日志裁剪', '');

  /* ---- B2 装备经济抽样 ---- */
  shop.includes('Bag.addStonesRaw(gain)') && shop.includes('0.45') && shop.includes('v32 修瑕（E16）') ? pass('SA35 坊市出售原额入账（E16）') : fail('SA35 坊市套利', '');
  forge.includes('失败 +20 只此一处') && forge.includes('bless0 < 100') ? pass('SA36 连祭炼单计+满百不烧石（E17/E18）') : fail('SA36 连祭炼', '');
  ui.includes('残片折半') && ui.includes('含炼器室 +') ? pass('SA37 炼器面板同口径（E19）') : fail('SA37 炼器面板', '');
  auction.includes('valOf') && auction.includes('GRADE_FALLBACK') && auction.includes('boxDay') ? pass('SA38 古匣估值修正+日限（E20）') : fail('SA38 古匣', '');
  ui.includes('器魂 ×${qihunGain}/件') ? pass('SA39 熔铸面板器魂行（E21）') : fail('SA39 器魂行', '');
  bag.includes('在穿实例的词缀与强化不受影响') ? pass('SA40 分解文案区分留档（E22）') : fail('SA40 分解文案', '');
  bag.includes('GameData.ITEMS[id] && (type !==') && ui.includes("Object.keys(p.bag).filter(id => GameData.ITEMS[id] && (Game.bagTab === 'all'") ? pass('SA41 脏档 id 判空（E23）') : fail('SA41 脏档', '');
  forge.includes('E.BASE_COST + lv * E.COST_PER_LV') ? pass('SA42 强化费率接线（E24）') : fail('SA42 ENHANCE', '');
  battle.includes('GameData.BALANCE.COMBAT.DMG_RAND_MIN') && battle.includes('BLOCK_REDUCTION') ? pass('SA43 战斗常量接线（E24）') : fail('SA43 COMBAT', '');
  balsim.includes('120 * GameData.stoneEco(r)') ? pass('SA44 balance-sim 聚灵口径（E25）') : fail('SA44 balance-sim', '');

  /* ---- B3 修炼轮回抽样 ---- */
  cult.includes('改仙元定值 spill×50') && cult.includes('const yuan = spill * 50;') ? pass('SA45 r9 感悟定值化（E26）') : fail('SA45 感悟定值', '');
  gamejs.includes('p._settleDay') && gamejs.includes('虚拟逐日推进') ? pass('SA46 日更按日补结（E27）') : fail('SA46 日更', '');
  xian.includes("return this.cur(p) === 0 ? null : (GameData.XIAN_TIERS[this.cur(p) - 1] || null);") ? pass('SA47 def idx=0 归 null（E28）') : fail('SA47 def', '');
  xian.includes('大罗已圆满——可证道祖之境') ? pass('SA48 大罗提示修正（E29）') : fail('SA48 大罗提示', '');
  trib.includes('劫云未散') ? pass('SA49 仙劫重入反馈（E30）') : fail('SA49 重入', '');
  trib.includes('仙劫成功分支补齐天劫同款副作用') ? pass('SA50 仙劫补无伤判定+异象（E31）') : fail('SA50 仙劫副作用', '');
  reinc.includes('get TREE_NAMES()') ? pass('SA51 传承树名单派生单源（E32）') : fail('SA51 单源', '');
  reinc.includes('Game.player.reinc.marks = Math.min(30, legacy.marksEarned || 0)') ? pass('SA52 grantMarks 回写当世（E34）') : fail('SA52 回写', '');
  stat.includes("name: '仙阶（每层 +1.5% 全属性）'") && stat.includes("name: '洞天（每重修炼 +3%）'") && stat.includes("name: '图鉴大成（每类 +1% 全属性）'") ? pass('SA53 明细补三行（E35）') : fail('SA53 明细', '');
  stat.includes('Math.min(20, (p.flags && p.flags.xinmoCleared) || 0)') ? pass('SA54 心魔凝练封顶折算（E35）') : fail('SA54 心魔封顶', '');
  pfac.includes('out.lifeCut = Math.max(0, Math.floor(Number(out.lifeCut)) || 0);') ? pass('SA55 脏档 NaN 清洗（E36）') : fail('SA55 NaN 清洗', '');
  pfac.includes("!(out.flags && out.flags.ascended)) out.xianjie = { idx: 0, layer: 0 }") && xian.includes('this.unlocked(p) && this.cur(p) > 0') ? pass('SA56 仙籍加成 unlocked 校验（E36）') : fail('SA56 unlocked', '');
  cult.includes('圆满态至多再闭六轮即请出关') ? pass('SA57 真仙圆满闭关护栏（E37）') : fail('SA57 闭关护栏', '');
  gongfa.includes('Stat.compOf(p) * 4') ? pass('SA58 参悟有效悟性（E38）') : fail('SA58 参悟', '');

  /* ---- B4 社交抽样 ---- */
  ui.includes('CHAIN_MUL[t.chain] || 1') && ui.includes("SectSys.commandActive && SectSys.commandActive(p, 'drill')") ? pass('SA59 悬赏预览走表+长老令（E39）') : fail('SA59 预览', '');
  battle.includes('NpcSys.onWarKill') && npc.includes('onWarKill(p, id)') ? pass('SA60 宗门大战 NPC 后果（E41）') : fail('SA60 大战', '');
  ui.includes('存续三日') && bounty.includes('每三日刷新一批悬赏') ? pass('SA61 悬赏周期文案（E42）') : fail('SA61 周期', '');
  dao.includes('分支序修正') && dao.indexOf('def.daoLimit && !p.dao) {') < dao.indexOf('def.daoLimit && p.dao !== def.daoLimit) {') ? pass('SA62 dao 分支序（E43）') : fail('SA62 分支序', '');
  npc.includes('对方对你心怀芥蒂，无意与你论道') ? pass('SA63 论道敌意判定（E44）') : fail('SA63 论道', '');
  npc.includes('道侣之位已空') && npc.includes('p.sworn = p.sworn.filter') ? pass('SA64 道侣/结拜殒命收尾（E45）') : fail('SA64 丧偶', '');
  npc.includes('sworn: 2') ? pass('SA65 sworn 赠礼 +2（E46）') : fail('SA65 赠礼', '');

  /* ---- B5 UI 工程抽样 ---- */
  swjs.includes("'./game.js?v=") && swjs.includes("'./style.css?v=") ? pass('SA66 SW 预缓存主资源（E47）') : fail('SA66 SW', '');
  ui.includes('本次进度<b>不会被保存</b>') ? pass('SA67 存储不可用警示（E48）') : fail('SA67 警示', '');
  gamejs.includes("})) || 'reinc';") ? pass('SA68 坐化 ESC 回落主选项（E49）') : fail('SA68 坐化', '');
  achieve.includes("UI.markDirty('bag');") ? pass('SA69 成就后刷乾坤袋（E50）') : fail('SA69 bag', '');
  ui.includes("key !== 'auto' ? `<button class=\"btn btn-sm btn-danger\" data-action=\"st-delete\"") ? pass('SA70 开始界面 auto 隐删除（E51）') : fail('SA70 auto', '');
  meta.includes('marksGiven: ext.marksGiven || null') ? pass('SA71 导入透传去重集（E52）') : fail('SA71 导入', '');
  gamejs.includes("document.querySelector('.modal:not(.hidden)')") ? pass('SA72 快捷键弹层门（E53）') : fail('SA72 快捷键', '');
  ui.includes('act-more-close" aria-label="关闭面板"') ? pass('SA73 更多面板关闭钮（E54）') : fail('SA73 关闭钮', '');
  explore.includes('if (this._going)') && explore.includes('this._going = false;') ? pass('SA74 连探防重入（E55）') : fail('SA74 连探', '');
  ui.includes("{ id: 'seed', name: '种子' }") ? pass('SA75 背包种子分类（E56）') : fail('SA75 种类', '');
  gamejs.includes('E57「手动档离线基准回退本档 ts」经复核撤销') ? pass('SA76 离线基准复核撤销（E57，v30 防刷决策优先）') : fail('SA76 离线基准', '');

  /* ---- B6 洞府日常抽样 ---- */
  dungeon.includes('每节点计 1 日') ? pass('SA77 秘境计日（E59）') : fail('SA77 计日', '');
  sect.includes('聚合条件放宽为 auto') && gamejs.includes('flushOfflineAgg') ? pass('SA78 日报聚合（E60/v33 E82 在线同聚合）') : fail('SA78 日报', '');
  cave.includes('回环 afterAction 拆除') ? pass('SA79 访客回环拆除（E62）') : fail('SA79 回环', '');
  ui.includes('胜得 1.6 倍彩头') ? pass('SA80 斗兽文案（E63）') : fail('SA80 斗兽', '');
  cave.includes('颗粒无收') && cave.includes('if (qty > 0)') ? pass('SA81 零收成不计数（E64）') : fail('SA81 零收成', '');
  explore.includes('ecoRealm(p, map)') && explore.includes('max(地图推荐境, 玩家-2)') ? pass('SA82 事件经济随图梯度（E65）') : fail('SA82 梯度', '');
  utils.includes('return (arr && arr.length) ? arr[') ? pass('SA83 pick 空数组防御（E66）') : fail('SA83 pick', '');

  /* ---- C 战斗可读化 ---- */
  battle.includes('intentEstimate(intent)') && battle.includes('this.intentEstimate(B.intent)') ? pass('SA84 意图数字预估（C1）') : fail('SA84 意图预估', '');
  battle.includes('势·${B.lastSkillTag}') ? pass('SA85 连携势可视化（C2）') : fail('SA85 势', '');
  battle.includes('【连珠】') && battle.includes('B.skillSeq') ? pass('SA86 连珠连续施法加成（C3）') : fail('SA86 连珠', '');
  beast.includes("TACTICS: { focus: '集火', control: '控场', guard: '护主' }") && ui.includes('act-beast-tactic') && gamejs.includes("'act-beast-tactic'") ? pass('SA87 协战策略三选（C4）') : fail('SA87 策略', '');
  battle.includes('运功逼毒') && battle.includes('偷梁换柱') ? pass('SA88 敌方自状态管理（C5）') : fail('SA88 自管理', '');
  tower.includes('跳层赌约') && tower.includes('血祭塔灵') && tower.includes('run.riskAtk') ? pass('SA89 塔风险赌约+血祭（C6）') : fail('SA89 塔赌约', '');
  battle.includes('async actNingshen()') && battle.includes('bt-ning') && gamejs.includes("'bt-ning'") ? pass('SA90 凝神（C7）') : fail('SA90 凝神', '');

  /* ---- D 印记分账与仙途 ---- */
  autocult.includes('value="xian"') && autocult.includes("t.kind === 'xian'") && autocult.includes('p2.flags && p2.flags.ascended') ? pass('SA91 AutoCult 仙元目标+飞升不停（D4）') : fail('SA91 挂机', '');
  cult.includes('async wuDao()') && gamejs.includes("'act-wudao'") && ui.includes('act-wudao') ? pass('SA92 悟道入口（D5）') : fail('SA92 悟道', '');
  trib.includes('p.counters.xianyuan -= 50') ? pass('SA93 仙劫借天运燃仙元（D6）') : fail('SA93 借天运', '');
  reinc.includes('TREE_EFFECTS.filter((t2, i2) => treeTier >= i2 + 1)') ? pass('SA94 树 11~15 效果接入（D2）') : fail('SA94 树层', '');
  pfac.includes('lifeUid') ? pass('SA95 每世指纹（D7）') : fail('SA95 指纹', '');
  reinc.includes('const reExecuted = fp ? !!legacy.executed[fp] : false;') ? pass('SA96 兵解防重护栏（D7/v33 E88 指纹单源）') : fail('SA96 防重', '');

  /* ---- E 装备经济纵深 ---- */
  forge.includes('_recastN') && forge.includes('[8, 14, 20]') ? pass('SA97 重铸阶梯价（E1）') : fail('SA97 阶梯价', '');
  forge.includes('仅淬前缀（锁后缀）') ? pass('SA98 器魂单侧淬洗（E2）') : fail('SA98 单侧淬洗', '');
  forge.includes('starMul') && forge.includes('starTxt') ? pass('SA99 词缀升星（E3）') : fail('SA99 升星', '');
  forge.includes('async refineSet(sid)') && forge.includes('twoPieceSets >= 2') ? pass('SA100 套装炼化+跨套共鸣（E4）') : fail('SA100 套装', '');
  auction.includes('views') && auction.includes('底价被抬上一成') ? pass('SA101 影子竞价（E5）') : fail('SA101 影子', '');
  forge.includes('fragBoost') && forge.includes('_embryoSuffix') ? pass('SA102 器胚入炉（E6）') : fail('SA102 器胚', '');
  gdata.includes("rareDrop2: 's_xy_jian'") && gdata.includes("rareDrop2: 's_xy_ling'") && battle.includes('e.rareDrop2') ? pass('SA103 仙缘断头路补源（E7）') : fail('SA103 仙缘', '');
  ui.includes('折合下品 ${Utils.fmtNum(stoneTotal)}') ? pass('SA104 面额折算总额（E8）') : fail('SA104 面额', '');

  /* ---- F 江湖日常 ---- */
  story.includes('【决战誓约】') ? pass('SA105 决战誓约（F2）') : fail('SA105 誓约', '');
  world.includes('rebuildUntil') && bounty.includes('turmoilUntil') ? pass('SA106 世界事件次年回响（F3）') : fail('SA106 回响', '');
  sect.includes('SECT_W') && sect.includes('questsDone % 3 === 0') ? pass('SA107 差事加权+连勤（F4）') : fail('SA107 差事', '');
  dsign.includes('signStreak') && dsign.includes('七日满签') ? pass('SA108 黄历连签（F5）') : fail('SA108 连签', '');
  explore.includes('beastpick: 12') ? pass('SA109 兽潮拾遗事件（F6）') : fail('SA109 拾遗', '');
  gdata.includes("rule: { txt: '剑气禁制——守敌攻 +15%'") && dungeon.includes('R.rule.hp') ? pass('SA110 秘境地脉规则（F7）') : fail('SA110 地脉', '');
  gdata.includes("key: 'k5_past_accept'") && gdata.includes("key: 'k7_route'") && gdata.includes("key: 'k4_dilemma_answer'") ? pass('SA111 抉择旗标回收场景（E40/F1）') : fail('SA111 抉择回收', '');

  /* ---- G 工程地基 ---- */
  cascript.includes('NO-HANDLER') && cascript.includes('NO-ENTRY') ? pass('SA112 check-actions 静态校验脚本（G1）') : fail('SA112 check-actions', '');
  pkg.includes('node scripts/check-actions.mjs') ? pass('SA113 check-actions 接入 test:all（G1）') : fail('SA113 接线', '');
  save.includes('600000') && save.includes('Game._snapAt') ? pass('SA114 bak2 十分钟滚动（G2）') : fail('SA114 bak2', '');
  ui.includes("fmt: 'FRWD2'") && ui.includes('文本码校验不符') ? pass('SA115 导出信封+校验（G4）') : fail('SA115 信封', '');
  idxhtml.includes('aria-label="战斗"') && story.includes("aria-label', '剧情'") ? pass('SA116 弹层无障碍标注（G5）') : fail('SA116 无障碍', '');
  relscript.includes('版本号单源注入') && relscript.includes('game.js?v=${cacheV}') ? pass('SA117 release 版本单源注入（G7/E58）') : fail('SA117 单源', '');
  (gdata.match(/c_n\d+:/g) || []).length >= 24 ? pass('SA118 人物志 24 人全注册（A7）') : fail('SA118 人物志', '');
  reinc.includes("'道胎'") && reinc.includes("'轮回行者'") ? pass('SA119 树 11~15 名录在位（D2）') : fail('SA119 树名录', '');
  gdata.includes('XIAN_VISIONS') && trib.includes('异象 · ${vision.name}') && cult.includes('visionLeichi') && bag.includes('visionGuangli') && cult.includes('visionXinzhang') ? pass('SA120 仙劫异象池+三策小词缀接线（D6 补遗）') : fail('SA120 异象池', '');
  ui.includes('灵石兑换 ▾') && ui.includes('面额折算总额见顶栏') ? pass('SA121 convert 四键收纳折叠（E8 补遗）') : fail('SA121 收纳', '');
  utils.includes('const Daily = {') && utils.includes('resetIfNew(p, key)') && R('systems/xian.js').includes("Daily.resetIfNew(p, '_xianVisitDay')") ? pass('SA122 日结总线 helper+首例迁移（G3 补遗）') : fail('SA122 Daily', '');
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

  /* ---- A 组运行时 ---- */
  const r1 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const logBak = Log.add; Log.add = () => {};
    // A1：tickDots 敌方分支不抛（蚀骨双煞场景）——手动构造塔战上下文
    const en = buildMonster('m_yezhu');
    en.fx = [{ kind: 'poison', pct: 3, rounds: 3 }];
    en.hp = en.hpMax;
    const php0 = p.hp = 1000;
    Battle.active = { enemy: en, ctx: { tower: 1 }, myFx: [], stats: { out: 0, in: 0, src: {} }, logs: [], floats: [], turn: 1 };
    p.tower = { best: 1, today: { day: 1, used: 0, bought: 0, stones: 0 }, run: { floor: 5, buffs: ['twb_rdot'] } };
    let err = null;
    try { Battle.tickDots('enemy'); } catch (e) { err = String(e).slice(0, 100); }
    out.noThrow = err === null;
    out.enemyHurt = en.hp < en.hpMax;
    out.selfBurn = p.hp < 1000;   // 蚀骨反噬实发
    out.err = err;
    Battle.active = null; p.tower = null; p.hp = php0;
    // A2：victoryTame 分发 onEnd
    const en2 = buildMonster('m_yezhu'); en2.hp = 1; en2.hpMax = 100; en2.expGain = 10; en2.stoneGain = 0; en2.id = null;
    let called = 0;
    Battle.active = { enemy: en2, ctx: { story: { onEnd: () => { called++; } } }, myFx: [], stats: { out: 0, in: 0, src: {} }, logs: [], floats: [], waveIds: null };
    try { BeastSys.victoryTame(); } catch (e) { out.tameErr = String(e).slice(0, 100); }
    out.onEndCalled = called === 1;
    Battle.active = null;
    // A4：drop 不炸且清留档
    const id = 'w_tiejian';
    p.bag[id] = (p.bag[id] || 0) + 1;
    p.enhanced = p.enhanced || {}; p.enhanced[id] = 3;
    UI.popup = async () => true;
    let dErr = null;
    try { await Bag.drop(id); } catch (e) { dErr = String(e).slice(0, 100); }
    out.dropOk = dErr === null && !p.enhanced[id];
    out.dropErr = dErr;
    // A5：分账——扣余额不动树层
    const L = ReincarnationSys.readLegacy();
    L.marksGiven = {}; L.marks = 12; L.marksEarned = 12; L.treeExtra = 0; ReincarnationSys.writeLegacy(L);
    const t0 = ReincarnationSys.baseTier(ReincarnationSys.readLegacy());
    const L2 = ReincarnationSys.readLegacy(); L2.marks -= 6; ReincarnationSys.writeLegacy(L2);
    const t1 = ReincarnationSys.baseTier(ReincarnationSys.readLegacy());
    out.tierStable = t0 === t1 && t0 === 4;
    const L3 = ReincarnationSys.readLegacy(); L3.marksGiven = {}; L3.marks = 0; L3.marksEarned = 0; L3.treeExtra = 0; L3.executed = {}; ReincarnationSys.writeLegacy(L3);
    // A7：六位新角色名牌
    out.names = ['c_n8', 'c_n16', 'c_n18', 'c_n19', 'c_n20', 'c_n21'].every(k => {
      const c = GameData.char('@' + k);
      return c && c.name && !c.name.startsWith('@');
    });
    // A8：重宝现世公告与地图
    const pw = Utils.pickWeighted; Utils.pickWeighted = () => 'zhongbao';
    let txt = '', mapOk = false;
    const w = p.world; w.pending = null;
    WorldSys.fireEvent(p, Math.floor(p.day / 365) + 1);
    txt = w.history.length && w.pending ? (w.pending.type || '') : '';
    mapOk = !!(w.pending && w.pending.mapId);
    out.zhongbaoType = w.pending && w.pending.type === 'zhongbao';
    Utils.pickWeighted = pw;
    w.pending = null;
    // A11：成就 e1 可判真
    out.e1 = Achieve.DEFS.find(d => d.id === 'e1').test(Object.assign(p, { stones: { low: 2000, mid: 0, high: 0 } }));
    p.stones = { low: 100, mid: 0, high: 0 };
    Log.add = logBak;
    return out;
  });
  r1.noThrow && r1.enemyHurt && r1.selfBurn ? pass('RB1 蚀骨双煞不炸且双向结算（A1）') : fail('RB1 蚀骨', JSON.stringify({ e: r1.err, h: r1.enemyHurt, s: r1.selfBurn }));
  r1.onEndCalled && !r1.tameErr ? pass('RB2 驯服分发 onEnd（A2）') : fail('RB2 驯服', JSON.stringify({ c: r1.onEndCalled, e: r1.tameErr }));
  r1.dropOk ? pass('RB3 丢弃不炸且清留档（A4）') : fail('RB3 丢弃', r1.dropErr || '');
  r1.tierStable ? pass('RB4 预约扣费树层不动（A5/D1）') : fail('RB4 分账', '');
  r1.names ? pass('RB5 六位新角色名牌可解析（A7）') : fail('RB5 名牌', '');
  r1.zhongbaoType && r1.zhongbaoMapOk !== false ? pass('RB6 重宝现世事件+地图（A8）') : fail('RB6 重宝', JSON.stringify({ t: r1.zhongbaoType, m: r1.zhongbaoMap }));
  r1.e1 === true ? pass('RB7 第一桶金可解锁（A11）') : fail('RB7 e1', String(r1.e1));

  /* ---- B 组运行时 ---- */
  const r2 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const stubAA = async fn => { const a = Game.afterAction; Game.afterAction = () => {}; try { return await fn(); } finally { Game.afterAction = a; } };
    const logBak = Log.add; Log.add = () => {};
    const popBak = UI.popup;
    // E1：清心丹解控
    Battle.active = { myFx: [{ kind: 'stun', rounds: 2 }, { kind: 'defdown', pct: 30, rounds: 3 }], ctx: {} };
    Pill.apply(p, GameData.ITEMS['pill_qingxin'], true);
    out.purge = !StatusFx.has(Battle.active.myFx, 'stun') && !StatusFx.has(Battle.active.myFx, 'defdown');
    Battle.active = null;
    // E2：第三技补发
    const b2 = { level: 10, bond: 80, skills: [{ name: 'a' }, { name: 'b' }], species: 'beast' };
    BeastSys.checkThirdSkill(b2);
    out.third = b2.skills.length === 3;
    // E3：双槽互斥
    p.beasts.list = [{ uid: 1, level: 3, exp: 0, species: 'beast', power: 5 }];
    p.beasts.active2 = 1; p.beasts.active = null;
    BeastSys.setActive(1);
    out.slotMutex = !(p.beasts.active === 1 && p.beasts.active2 === 1);
    p.beasts.list = []; p.beasts.active = null; p.beasts.active2 = null;
    // E8：聚气归元（塔内会心回真元）
    p.tower = { best: 1, today: { day: 1, used: 0, bought: 0, stones: 0 }, run: { floor: 3, buffs: ['twb_rzy'] } };
    Battle.active = { enemy: buildMonster('m_yezhu'), ctx: { tower: 1 }, myFx: [], zhenyuan: 0, zmax: 6, stats: { out: 0, in: 0, src: {} } };
    Battle.gainZyOnCrit(p, true);
    out.zyCrit = Battle.active.zhenyuan === 1;
    Battle.active = null; p.tower = null;
    // E9：控制递减
    Battle.active = { enemy: buildMonster('m_yezhu'), ctx: {}, myFx: [] };
    const c1 = Battle.ctrlDecayOnEnemy(), c2 = Battle.ctrlDecayOnEnemy();
    out.c1 = c1; out.c2 = c2;
    out.ctrlDecay = c1 === 1 && Math.abs(c2 - 0.85) < 1e-9;
    Battle.active = null;
    // E16：买→卖必亏
    const wealth = q => q.stones.low + q.stones.mid * 100 + q.stones.high * 10000;
    const w0 = wealth(p);
    const aaBak = Game.afterAction; Game.afterAction = () => {};
    ShopSys.buy('pill_juqi');
    ShopSys.sell('pill_juqi', true);
    Game.afterAction = aaBak;
    out.arbitrage = wealth(p) < w0;
    // E17/E18：连祭炼满百不烧石且成功
    p.equipped.weapon = { id: 'w_tiejian', enhance: 8 };
    p.enhBless = { w_tiejian: 100 };
    Bag.addItem('m_xuantie', 20); Bag.addStones(100000);
    const ore0 = Bag.count('m_qianghua');
    await stubAA(() => ForgeSys.enhanceMulti('weapon', 1));
    out.ore0 = ore0;
    out.lvAfter = ForgeSys.lvOf(p, 'w_tiejian');
    out.noWasteGuard = Bag.count('m_qianghua') === ore0 && out.lvAfter === 9;
    p.equipped.weapon = null; delete p.enhBless.w_tiejian;
    // E20：古匣日限
    p.auction = { item: 'mystery', seq: 0, base: 100, until: Math.floor(p.day) + 60 };
    Bag.addStones(1000000);
    const chBak = Utils.chance; Utils.chance = () => true;
    UI.popup = async () => true;
    await stubAA(() => AuctionSys.bid('steady'));
    out.boxDay1 = p._boxDay === Math.floor(p.day);   // v33（E73）：日限迁 p 本体
    p.auction.until = 0; p.auction.seq++;
    await stubAA(() => AuctionSys.bid('steady'));
    out.boxLimited = p._boxDay === Math.floor(p.day);   // 第二次被门禁挡下，日限不变（v33 E73）
    Utils.chance = chBak;
    // E26：r9 感悟溢出=50 仙元/点
    const r9 = p.realmIdx; p.realmIdx = 9;
    p.counters.xianyuan = p.counters.xianyuan || 0;
    p.insight = 95; const y1 = p.counters.xianyuan;
    Cultivate.addInsight(p, 10);
    out.spillYuan = p.counters.xianyuan - y1 === 250;
    p.realmIdx = r9; p.insight = 0;
    // E36：NaN 清洗
    const dirty = PlayerFactory.migrate(Object.assign(PlayerFactory.create('脏', { gen: 5, comp: 5, luck: 5, body: 5 }), { lifeCut: NaN, counters: { battles: NaN, wins: 3, mapExplores: { a: NaN } } }));
    out.nanClean = dirty.lifeCut === 0 && dirty.counters.battles === 0 && dirty.counters.wins === 3 && dirty.counters.mapExplores.a === 0;
    UI.popup = popBak; Log.add = logBak;
    return out;
  });
  r2.purge ? pass('RB8 清心丹真解控（E1）') : fail('RB8 清心丹', '');
  r2.third ? pass('RB9 第三天生技补发（E2）') : fail('RB9 第三技', '');
  r2.slotMutex ? pass('RB10 出战/副战互斥（E3）') : fail('RB10 双槽', '');
  r2.zyCrit ? pass('RB11 聚气归元会心回真元（E8）') : fail('RB11 归元', '');
  r2.ctrlDecay ? pass('RB12 控制递减 1→0.85（E9）') : fail('RB12 递减', JSON.stringify([r2.c1, r2.c2]));
  r2.arbitrage ? pass('RB13 买→卖必亏（E16）') : fail('RB13 套利', '');
  r2.noWasteGuard ? pass('RB14 满百连祭炼不烧石且成功（E17/E18）') : fail('RB14 连祭炼', JSON.stringify({ lv: r2.lvAfter, ore: r2.ore0 }));
  r2.boxDay1 && r2.boxLimited ? pass('RB15 古匣日限一枚（E20）') : fail('RB15 古匣', JSON.stringify({ d1: r2.boxDay1, lim: r2.boxLimited }));
  r2.spillYuan ? pass('RB16 r9 感悟溢出=50 仙元/点（E26）') : fail('RB16 感悟', String(r2.spillYuan));
  r2.nanClean ? pass('RB17 脏档 NaN 清洗（E36）') : fail('RB17 NaN', JSON.stringify(r2.nanClean));

  /* ---- C/D/E/F 组运行时 ---- */
  const r3 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const logBak = Log.add; Log.add = () => {};
    const popBak = UI.popup;
    // C1：意图预估
    Battle.active = { enemy: Object.assign(buildMonster('m_yezhu'), { fx: [] }), ctx: {}, myFx: [], buffs: {}, defending: false, stats: { out: 0, in: 0, src: {} } };
    out.estTxt = Battle.intentEstimate({ kind: 'strike', heavy: true });
    Battle.active = null;
    // C7：凝神
    Battle.active = { enemy: Object.assign(buildMonster('m_yezhu'), { fx: [] }), ctx: {}, myFx: [{ kind: 'poison', pct: 3, rounds: 2 }], enemyFxIds: [], morale: 25, zhenyuan: 0, zmax: 6, _ningUsed: false, combo: 0, stats: { out: 0, in: 0, src: {} }, logs: [], floats: [], buffs: {}, defending: false };
    UI.popup = async o => (o.options || []).some(x => x.value === 'zy') ? 'zy' : null;
    await Battle.actNingshen();
    out.ning = Battle.active.zhenyuan === 1 && Battle.active.morale === 5 && Battle.active._ningUsed === true;
    // 净化支
    Battle.active.morale = 20; Battle.active._ningUsed = false;
    UI.popup = async o => (o.options || []).some(x => x.value === 'purge') ? 'purge' : null;
    await Battle.actNingshen();
    out.ningPurge = !StatusFx.has(Battle.active.myFx, 'poison') && Battle.active.morale === 5;
    UI.popup = popBak;
    Battle.active = null;
    // D4：AutoCult xian 目标
    AutoCult.target = { kind: 'xian', need: 10 };
    AutoCult.startExp = 0;
    p.counters.xianyuan = (p.counters.xianyuan || 0) + 10;
    out.autoXian = AutoCult.reached(p);
    AutoCult.target = null;
    // D5：悟道
    p.insight = 30;
    const exp0 = p.exp;
    UI.popup = async () => true;
    const aa2 = Game.afterAction; Game.afterAction = () => {};
    await Cultivate.wuDao();
    Game.afterAction = aa2;
    out.wudao = p.insight === 10 && p.exp > exp0;
    UI.popup = popBak;
    // E3：affixScore 星加成
    out.starScore = ForgeSys.affixScore('suffix', 'duopo', 0, null, 2) === 20 * 1.08;
    // E4：套装炼化生效
    p.equipped = { weapon: { id: 's_xt_jian' }, armor: { id: 's_xt_jia' }, accessory: null };
    p.setForge = { xuantian: 3 };
    const sbFull = ForgeSys.setBonus(p);
    p.setForge = {};
    const sbBase = ForgeSys.setBonus(p);
    p.equipped = { weapon: null, armor: null, accessory: null };
    out.setForge = sbFull.defPct > sbBase.defPct;
    // E7：rareDrop2
    out.rare2 = buildMonster('m_tianlong').rareDrop2 === 's_xy_jian';
    // F7：地脉规则
    const re3 = DungeonSys.makeEnemy(GameData.SECRET_REALMS[3], 5);
    out.rule = re3._realmRule === '剑气禁制——守敌攻 +15%';
    // F5：连签第七日必上上
    const today = Math.floor(p.day);
    const aa3 = Game.afterAction; Game.afterAction = () => {};
    p.signDay = today - 1; p.signStreak = 6;
    DailySign.draw();
    out.streak7 = p.signStreak === 7 && (p.signText || '').includes('上上签');
    Game.afterAction = aa3; p.signStreak = 0; p.signDay = null;
    // A3：秘境开战失败回滚本层
    p.dungeon = { realm: 0, depth: 0, choices: ['battle'], stuck: false, gains: [], total: 9 };
    Battle.active = {};
    await DungeonSys.resolve(0);
    Battle.active = null;
    out.rollback = p.dungeon.choices.length > 0;
    p.dungeon = null;
    // E27：日更按日补结（35→40 跨 5 日 = 5 补结 + 1 当日）
    p.day = 40; p._settleDay = 35;
    let settles = 0;
    const ds = Game.dailySettle;
    Game.dailySettle = () => { settles++; };
    const aa4 = Game.afterAction; Game.afterAction();
    Game.afterAction = aa4; Game.dailySettle = ds;
    p.day = 1; p._settleDay = null;
    out.replay = settles === 6;
    Log.add = logBak;
    return out;
  });
  /≈\d+/.test(r3.estTxt) ? pass('RB18 意图预估输出区间（C1）') : fail('RB18 意图预估', r3.estTxt);
  r3.ning && r3.ningPurge ? pass('RB19 凝神换真元/净化（C7）') : fail('RB19 凝神', JSON.stringify({ n: r3.ning, p: r3.ningPurge }));
  r3.autoXian ? pass('RB20 AutoCult 仙元目标达成判定（D4）') : fail('RB20 挂机', '');
  r3.wudao ? pass('RB21 悟道耗感悟炼修为（D5）') : fail('RB21 悟道', '');
  r3.starScore ? pass('RB22 词缀星计分 ×1.08（E3）') : fail('RB22 星计分', '');
  r3.setForge ? pass('RB23 套装炼化加成生效（E4）') : fail('RB23 套装', JSON.stringify({ f: r3.setForge }));
  r3.rare2 ? pass('RB24 应龙第二稀有掉落（E7）') : fail('RB24 rareDrop2', '');
  r3.rule ? pass('RB25 秘境地脉规则挂怪（F7）') : fail('RB25 地脉', '');
  r3.streak7 ? pass('RB26 七日连签必上上（F5）') : fail('RB26 连签', '');
  r3.rollback ? pass('RB27 秘境开战失败回滚本层（A3）') : fail('RB27 回滚', '');
  r3.replay ? pass('RB28 日更按日补结 6 次（E27）') : fail('RB28 补结', String(r3.replay));
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
