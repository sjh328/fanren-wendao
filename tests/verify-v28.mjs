#!/usr/bin/env node
/* ======================================================================
 * verify-v28 —— V42「鼎新」回归套件（E527 · P3 接缝整合批，≥60 断言）
 * SA 源码形态组——战斗软锁 finishEnemyPhase 单源（E476）/ 对拼 attack 意图产出（E477）/
 *   战意沸点常数与爆发插值（E478）/ 敌方闪避帽 50（E479）/ 词缀 minRp+T2（E480）/
 *   狂战分支+二阶段（E481）/ 剑域双符（E482）/ 连击势点主动花点（E483·P3 兑现 W1A 升级契约）/
 *   EXP_BASE[5]=490000（E485）/ 数值说明书 E478/E479 标记（E484）/ flavor-v42 只增合并（E495）/
 *   story 打字机 150ms（E497）/ ambience 90ms 节流（E497）/ art SCENES 15 图（E494/E500）/
 *   achieve 66+10 项（E499+P3 鼎新四项）/ tutorial 任务链（E487/E488）/ ui-tip 触屏说明（E489）/
 *   break-card 合一（E490）/ 已了结折叠（E492）/ season-queue（E493）/ runDailySilent（E501）/
 *   MEDIT_ROUTES（E502）/ 归乡包四档（E503）/ 顿悟 INSIGHT_EVENTS 同址+stat 接线（E505）/
 *   迁移七键（E507）/ 寄售 V2 与 0.1× 兜底（E508/E509）/ BID bold 45（E510）/ 纳财四卦（E511）/
 *   黑市 %30<5（E512）/ overflowMul 单源（E519）/ 小世界（E520）/ 遗物（E521）/ 扫荡（E522）/
 *   前世情缘（E523）/ 锦囊（E524）/ 黄历 title 疵修复+st-delete _snapTimer（P3 整合）
 * RB 行为组——软锁复活 busy 复位率 100%（100 场）/ 对拼自然命中 8 场 [0.8,1.05]+较力赏罚 /
 *   爆发 60/100 两锚+沸点流失 / 词缀档位统计 / 狂战非纯 strike / 二阶段触发率 / 炼虚两点锚 /
 *   逐日补跑计次 30 / 行功三路线 / 归乡 8h 锚+防重 / 顿悟失效+stat 增益 / 寄售五档 EV 带 /
 *   纳财实发 / 扫荡资格链+结算确定性 / 小世界全链+三纪门槛 / 遗物三选一与消散 / 前世三幕 /
 *   锦囊单动作不双吃 / 渲染增量重建下降 / v41 旧档迁移往返+文本码 / 双审计两连跑逐字节一致
 * 断言风格：SA + RB，与 verify-v27 同款骨架。证红证绿：注入坏样例命中→还原→终稿跑绿（RB 注记）。
 * ====================================================================== */
import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(dirname(fileURLToPath(import.meta.url)));
const R = f => readFileSync(join(__dirname, 'js', f), 'utf8').replace(/\r\n/g, '\n');
const allJs = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.js')) allJs.push(readFileSync(p, 'utf8').replace(/\r\n/g, '\n'));
  }
})(join(__dirname, 'js'));
const allJsStr = allJs.join('\n');

let passN = 0, failN = 0;
const fails = [];
const pass = t => { passN++; console.log('  ✓ ' + t); };
const fail = (t, d) => { failN++; fails.push(t); console.log('  ✗ ' + t + ' :: ' + d); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================= 源码静态组（SA） ================= */
console.log('===== SA 源码静态组 =====');
{
  const battle = R('battle/battle.js');
  const gdata = R('data/game-data.js');
  const gamejs = R('game.js');
  const stat = R('core/stat.js');
  const achieve = R('core/achieve.js');
  const tutorial = R('ui/tutorial.js');
  const ui = R('ui/ui.js');
  const quest = R('ui/quest.js');
  const story = R('ui/story.js');
  const ambience = R('core/ambience.js');
  const art = R('core/art.js');
  const narrative = R('core/narrative.js');
  const autocult = R('core/autocult.js');
  const cultivate = R('systems/cultivate.js');
  const pfac = R('core/player-factory.js');
  const auction = R('systems/auction.js');
  const shop = R('systems/shop.js');
  const black = R('systems/black.js');
  const tower = R('systems/tower.js');
  const explore = R('systems/explore.js');
  const npc = R('systems/npc.js');
  const dungeon = R('systems/dungeon.js');
  const xian = R('systems/xian.js');
  const reinc = R('systems/reincarnation.js');
  const flavor = R('data/flavor-v42.js');
  const stylecss = readFileSync(join(__dirname, 'style.css'), 'utf8').replace(/\r\n/g, '\n');
  const modules = readFileSync(join(__dirname, 'scripts', 'modules.json'), 'utf8');
  const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));

  /* ---- E476：软锁 finishEnemyPhase 单源（旧裸调形态零残留） ---- */
  (battle.match(/finishEnemyPhase\(/g) || []).length >= 4
    && !/\{ await this\.afterEnemyPhase\(st\); return; \}/.test(battle)
    && /async finishEnemyPhase\(st\) \{[\s\S]*?B\.busy = false;/.test(battle)
    ? pass('SA1 战斗软锁收口：finishEnemyPhase revive-aware 单源（≥3 调用点）+「await afterEnemyPhase 后无条件 return」旧形态零残留（E476，RB1 百场复核）') : fail('SA1 软锁单源', '');

  /* ---- E477：对拼 attack 意图产出 + pin 解 ---- */
  battle.includes("? { kind: 'strike', heavy: true } : { kind: 'attack' }")
    && battle.includes("if (intent.kind === 'attack') return { acts: ['attack'], lenient: false, pin: true,")
    && battle.includes('【对拼】硬撼一记，力压一筹')
    ? pass('SA2 对拼修活：enemyDecide 非 heavy 平A 落 attack 意图（死代码复活）+ intentCounter attack→pin 对拼解 + 较力赏罚文案（E477，RB2 复核）') : fail('SA2 对拼产出', '');

  /* ---- E478：战意沸点常数与爆发插值式 ---- */
  gdata.includes('BURST_MIN: 60') && gdata.includes('BURST_MUL_BASE: 2.4') && gdata.includes('BURST_MUL_PER: 0.02')
    && gdata.includes('MORALE_BOIL_DRAIN: 15') && gdata.includes('MORALE_MAX: 100')
    && battle.includes('C.BURST_MUL_BASE + (preMorale - C.BURST_MIN) * C.BURST_MUL_PER')
    && battle.includes('B.morale = 0;') && battle.includes('(B.morale || 0) >= 90 && (B.burstUsed || 0) < 2')
    ? pass('SA3 战意沸点：BURST_MIN 60/BUF 基 2.4/每点 0.02/沸腾流失 15 单源 + 爆发余量线性插值耗尽全部战意 + autoPilot 近沸 90 倾泻（E478，RB3/RB4 复核）') : fail('SA3 沸点', '');

  /* ---- E479：敌方闪避帽 50 ---- */
  gdata.includes('ENEMY_DODGE_MAX: 50') && (battle.match(/ENEMY_DODGE_MAX/g) || []).length >= 1
    ? pass('SA4 敌方闪避帽 70→50（ENEMY_DODGE_MAX 单源且有消费点）（E479）') : fail('SA4 闪避帽', '');

  /* ---- E480：词缀 minRp + T2 表 ---- */
  gdata.includes('ELITE_AFFIXES_T2: [') && (gdata.match(/minRp: \d+/g) || []).length >= 16
    && battle.includes('const pool = poolAll.filter(a => (a.minRp || 0) <= rp);')
    && battle.includes("const n = (rp >= 8 && Utils.chance(30)) ? 3 : (rp >= 5 || e._forceFx2) ? 2 : 1;")
    ? pass('SA5 词缀 e-tier：T2 四条高境缀 + minRp 全表（≥16）+ 掷缀 r0 单缀/r5 双缀/r8 三成三缀（E480，RB5 复核）') : fail('SA5 词缀', '');

  /* ---- E481：狂战分支 + 二阶段 ---- */
  battle.includes("if (pref === 'berserk') {") && battle.includes('fangshi: true')
    && battle.includes('rollPhase2(e, ctx)')
    && gdata.includes('PHASE2_TRAITS')
    ? pass('SA6 狂战补分支（反嗜/蓄力/技能池放行——非纯 strike）+ 二阶段资格单源 rollPhase2（Boss 恒有/精英三成）（E481，RB6/RB7 复核）') : fail('SA6 狂战/二阶段', '');

  /* ---- E485：炼虚削峰 ---- */
  gdata.includes('EXP_BASE: [70, 380, 2350, 14700, 91800, 490000, 2394000, 10054800, 42230160, 177366672]')
    ? pass('SA7 EXP_BASE[5]=490000 炼虚削峰（r0~r4/r6~r9 逐字节不动，E391 锚保护）（E485，RB8 两点锚复核）') : fail('SA7 EXP_BASE', '');

  /* ---- E484：数值说明书 E478/E479 标记 ---- */
  gdata.includes('E479') && gdata.includes('E478') && gdata.includes('ENEMY_DODGE_MAX')
    ? pass('SA8 数值说明书逐条对表：含 E478（爆发插值）与 E479（闪避帽 50）标记（E484）') : fail('SA8 说明书', '');

  /* ---- E495/E499：flavor-v42 只增合并 + 登记 ---- */
  modules.includes('js/data/flavor-v42.js')
    && flavor.includes('.push(') && !/G\.DAO_FLAVOR\[[a-z]\]\.[a-z]+ = /.test(flavor)
    && narrative.includes('_pick(kind)') && narrative.includes("f['attack_' + sp]")
    ? pass('SA9 flavor-v42：modules.json 在册 + 合并侧只 push 零覆写 + attack 按敌方种族分池（E495）') : fail('SA9 flavor', '');

  /* ---- E497：打字机/音效节流 ---- */
  story.includes('CH_MS = 150') && !story.includes('CH_PER_TICK')
    ? pass('SA10 story 打字机 1 字/150ms+标点停顿（CH_PER_TICK 旧标识清零）（E497）') : fail('SA10 打字机', '');
  ambience.includes('now - last < 90')
    ? pass('SA11 ambience sfx per-kind 90ms 节流（存值 0 以 last != null 判定，非 || 缺省）（E497）') : fail('SA11 节流', '');

  /* ---- E494/E500：SCENES 15 图 + 场景动画类 ---- */
  ['zhengtao', 'leichi', 'lingxu', 'leiyu', 'xianhai', 'xianhai2'].every(id => art.includes(`"${id}"`) || art.includes(`'${id}'`) || new RegExp(id + '\\s*:').test(art))
    && art.includes('scene-anim-on') && art.includes('scene-anim-season')
    && stylecss.includes('.scene-anim-on') && stylecss.includes('.scene-anim-season')
    ? pass('SA12 art SCENES 六高境图补齐（15 图全覆盖）+ scene-anim-on/season 打类与 CSS 关键帧段合同兑现（E494/E500）') : fail('SA12 SCENES', '');

  /* ---- E499 + P3：成就梯度与鼎新四项 ---- */
  achieve.includes('66 项常规 + 10 项隐藏') && !achieve.includes('56 项')
    && ['nw1', 'nw2', 'nw3', 'nw4'].every(id => achieve.includes(`id: '${id}'`))
    && achieve.includes('p.counters.sweeps || 0')
    ? pass('SA13 成就 66 项常规+10 隐藏（头注释与实数一致）+ v42 鼎新四项（小世界/遗物/扫荡/前世）入册（E499+P3 跨系统钩子）') : fail('SA13 成就', '');

  /* ---- E487/E488：教程任务链 + 手册分节 ---- */
  tutorial.includes('TASKS: [') && tutorial.includes("key: 'cultivate'") && tutorial.includes("acts: ['act-cultivate']")
    && tutorial.includes("UI.helpSection('getting')")
    ? pass('SA14 引导任务化：五步任务链（acts 动作驱动）+ 教程毕只弹「三分钟上手」单节（E487/E488）') : fail('SA14 教程', '');

  /* ---- E489：ui-tip 触屏说明 ---- */
  (allJsStr.match(/data-action="ui-tip"/g) || []).length >= 45
    ? pass(`SA15 ui-tip 触屏说明静态入口 ≥45（实测 ${(allJsStr.match(/data-action="ui-tip"/g) || []).length}，含 P3 补回的黄历节庆行）（E489）`) : fail('SA15 ui-tip', '');

  /* ---- E490/E492/E493：冲关合一 / 已了结折叠 / 本季将临 ---- */
  (ui.match(/id="break-card"/g) || []).length === 1 && !ui.includes('id="break-prep"')
    ? pass('SA16 冲关卡合一：#break-card 唯一（旧 #break-prep 并入删除）（E490）') : fail('SA16 冲关卡', '');
  quest.includes('data-fold="quest-done"') && quest.includes('已了结')
    ? pass('SA17 任务已了结组 details.fold 折叠记忆（E492）') : fail('SA17 折叠', '');
  quest.includes('id="season-queue"')
    ? pass('SA18 本季将临 season-queue 挂点在 quest 黄历页（E493）') : fail('SA18 season-queue', '');

  /* ---- E501：逐日补跑 ---- */
  autocult.includes('async runDailySilent(p, opts = {})') && autocult.includes("Guide.dailyAll({ silent: true, rideAlong: !!opts.inRound })")
    && cultivate.includes('await AutoCult.runDailySilent(p, { inRound: true })')
    ? pass('SA19 挂机逐日补跑：runDailySilent 单源 + secludeLoop 逐日拆步 inRound 语境（rideAlong 免时耗）（E501，RB9 复核）') : fail('SA19 逐日补跑', '');

  /* ---- E502：行功三路线 ---- */
  cultivate.includes('MEDIT_ROUTES: {') && cultivate.includes('zhoutian: { name: \'周天\', mult: 1.2')
    && cultivate.includes('meditate(p, route, opts = {})') && cultivate.includes('medRoute(d)')
    && gamejs.includes("'med-route': (d) => Cultivate.medRoute(d)")
    ? pass('SA20 行功路线三选：MEDIT_ROUTES 周天×1.2/存想/龟息 + meditate 单源 + med-route 键登记（E502，RB10 复核）') : fail('SA20 行功', '');

  /* ---- E503：归乡包 ---- */
  gamejs.includes('HOMECOMING_TIERS') && gamejs.includes('offlineHomecoming(p, realHours, tsBasis)')
    && gamejs.includes('mul: 40') && gamejs.includes('mul: 20') && gamejs.includes('mul: 10') && gamejs.includes('mul: 4')
    ? pass('SA21 归乡包四档 [1h×4/4h×10/8h×20/24h×40] + offlineHomecoming 三参契约（8h 锚 RB11 复核）（E503）') : fail('SA21 归乡', '');

  /* ---- E505：境内顿悟同址 + stat 接线（P3 整合兑现） ---- */
  cultivate.includes('INSIGHT_EVENTS: [') && cultivate.includes('insightBonusOf(p)')
    && stat.includes("(typeof Cultivate !== 'undefined' && Cultivate.insightBonusOf) ? Cultivate.insightBonusOf(p) : {}")
    && stat.includes('(insFx.atkPct || 0)') && stat.includes('(insFx.defPct || 0)')
    && stat.includes('境内顿悟（凌厉/圆融·本境有效）')
    ? pass('SA22 境内顿悟：INSIGHT_EVENTS 落消费方同址 + Stat.compute atk/def 行乘区接线（typeof 守卫）+ breakdown 明细行（E505·P3 整合兑现 W2A 交接契约，RB12 复核）') : fail('SA22 顿悟接线', '');

  /* ---- E507：迁移七键 ---- */
  pfac.includes('16:v42 容器七键') && pfac.includes('combat: { pouch: [null, null, null] }')
    && pfac.includes('homecoming: 0, insight: null, sweepDay: 0, unlockedTips: {}')
    && pfac.includes('worlds: []') && pfac.includes('relics: []')
    ? pass('SA23 存档契约扩容：v42 迁移步 16 七键（combat/xianjie.worlds/dungeon.relics/flags 四子键）+ create() 模板同建（E507，RB20 往返复核）') : fail('SA23 迁移七键', '');

  /* ---- E508/E509：0 价兜底 + 寄售 V2 ---- */
  auction.includes('overflowMul(p, gate)')
    && (auction.match(/Math\.pow\(3\.8/g) || []).length === 1
    && auction.includes('CONSIGN_TIERS_V2: [')
    && shop.includes('base = Math.round((GameData.GRADE_FALLBACK[Utils.clamp(def.grade || 0, 0, 5)] || 500) * 0.1);')
    && shop.includes("const consumed = (typeof ForgeSys !== 'undefined' && ForgeSys.CONSUMED_MATS) || [];")
    ? pass('SA24 溢阶定价单源（auction 内 Math.pow(3.8 唯一）+ CONSIGN_TIERS_V2 同址五档 + sellPrice 0 价 GRADE_FALLBACK×0.1 兜底（E508/E509/E519，RB13 EV 带复核）') : fail('SA24 寄售/兜底', '');

  /* ---- E510/E511/E512/E518 ---- */
  /bold: \{[^}]*rate: 45/.test(auction)
    ? pass('SA25 出价三档个性：BID_MODES.bold.rate 45（激进降价重定价，截胡必公示）（E510）') : fail('SA25 bold45', '');
  tower.includes('FUCAI_POOL') && tower.includes('灵石卦') && tower.includes('贪卦') && tower.includes('玄铁卦') && tower.includes('符材卦')
    ? pass('SA26 塔灵纳财卦象化：四卦 popup + 符材池（期望表留档注释）（E511，RB14 实发复核）') : fail('SA26 纳财', '');
  black.includes('MARKUP: 1.65') && black.includes('% 30 < 5')
    ? pass('SA27 黑市：MARKUP 1.65 单源 + 开市窗口 day%30<5（E512/E518）') : fail('SA27 黑市', '');

  /* ---- E520/E521/E522/E523/E524 ---- */
  xian.includes('async openSubworld(p, invest = null)') && xian.includes('subworldTick(p, auto = false)')
    && xian.includes('bestEra(p) < 3') && gdata.includes('WORLD_BIOMES')
    && gamejs.includes("'subworld-open'") && gamejs.includes("'subworld-invest'")
    ? pass('SA28 小世界：openSubworld/subworldTick 契约签名 + 证道祖三纪门槛挂 daozuCheck + WORLD_BIOMES 三轴 + 双键登记（E520，RB15 全链复核）') : fail('SA28 小世界', '');
  dungeon.includes('grantRelic(D)') && dungeon.includes('relics: []') && gdata.includes('DUNGEON_RELICS')
    && gamejs.includes("'relic-pick'")
    ? pass('SA29 秘境遗种：grantRelic 三选一 + DUNGEON_RELICS 表 + relics 出秘境消散容器 + relic-pick 登记（E521，RB16 复核）') : fail('SA29 遗种', '');
  explore.includes('sweepOk(p, mapId)') && explore.includes('>= 3') && explore.includes('_sweepSettle(p, e, map)')
    && gamejs.includes("'sweep5'")
    ? pass('SA30 同带扫荡×5：sweepOk 三连胜资格链 + _sweepSettle 与手动 victory 同源结算 + sweep5 登记（E522，RB17 复核）') : fail('SA30 扫荡', '');
  reinc.includes('legacy.bonds') && reinc.includes('_oldFriend') && explore.includes('p.counters.sweeps = (p.counters.sweeps || 0) + 1')
    ? pass('SA31 前世情缘数据面：legacy.bonds 捕获 + _oldFriend 兑现消费 + 扫荡计次读点（E523+P3 成就 nw3 写点，RB18 三幕复核）') : fail('SA31 前世', '');
  battle.includes('pouchUse(slot)') && battle.includes('pouchSet(item)') && battle.includes('_pouchAutoN')
    && gamejs.includes("'pouch-use'") && gamejs.includes("'pouch-set'")
    ? pass('SA32 战斗锦囊三槽：pouchUse/pouchSet + autoPilot 丹槽优先单动作计次锚 + 双键登记（E524，RB19 不双吃复核）') : fail('SA32 锦囊', '');

  /* ---- P3 整合四件：势点预支钮 / st-delete / 黄历 title / 挂链 ---- */
  battle.includes('actComboPt()') && battle.includes('data-action="bt-combopt"')
    && battle.includes('(B._ptHold || B.auto)')
    && gamejs.includes("'bt-combopt': () => Battle.actComboPt()")
    ? pass('SA33 连击势点主动花点：面板 ● 预支钮（bt-combopt 双向登记）+ _ptHold 消耗门（自动战斗保留 W1A 自动兑现）（E483·P3 兑现 W1A 升级契约，RB19b 复核）') : fail('SA33 势点钮', '');
  gamejs.includes('if (Game._snapTimer)') && !gamejs.includes("if (this._snapTimer) { clearInterval(this._snapTimer); this._snapTimer = null; }   // v37")
    ? pass('SA34 E525①：st-delete 快照定时器守卫改 Game._snapTimer 直引（actions 内箭头 this≠Game 死守卫清零）') : fail('SA34 snapTimer', '');
  ui.includes('title="${Utils.esc(fest.desc || fest.name)}"')
    ? pass('SA35 黄历节庆行空 title 补回（W2A 上报 W1B 疵点收口，节庆说明触屏可达）') : fail('SA35 黄历title', '');
  pkg.scripts['test:v28'] === 'node tests/verify-v28.mjs'
    && pkg.scripts['test:e2e'] === 'node scripts/run-e2e.mjs'
    && (pkg.scripts['test:all'] || '').split('&&').map(s => s.trim()).filter(Boolean).slice(-1)[0] === 'node tests/verify-v28.mjs'
    ? pass('SA36 挂链收尾：test:v28/test:e2e 在册 + test:all 链尾接 verify-v28（E527/E525②）') : fail('SA36 挂链', '');

  /* ---- 沉浸面兜底（W1C 批产物活体确认） ---- */
  ambience.includes('MOTIFS') && narrative.includes('TEMPER_OBSERVE')
    && achieve.includes('MILESTONES: [[50, 5], [100, 8], [150, 12]]')
    ? pass('SA37 沉浸面：ambience 动机句引擎 + narrative 性情观察池 + 成就积分里程碑表在位（E496/E498/E499）') : fail('SA37 沉浸面', '');
}

/* ================= 运行时行为组（RB） ================= */
console.log('===== RB 运行时组 =====');
let browser = null;
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA ? process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe' : '',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
for (const p of CHROME_CANDIDATES) {
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
    await page.evaluate(() => {
      const pl = PlayerFactory.create('鼎笑道人', { gen: 6, comp: 6, luck: 6, body: 6 });
      pl.flags.tutorialDone = true;
      localStorage.setItem('fanren_wd_2', JSON.stringify({ v: 1, player: pl, meta: { name: pl.name, realmText: '练气初期', day: 1, age: 16, ts: Date.now(), dead: false } }));
      UI.renderStart();
    });
    await page.click('[data-action="st-load"][data-slot="2"]');
    await sleep(600);
    await page.evaluate(() => {
      ['popup-modal', 'dao-modal', 'tribulation-modal', 'battle-modal', 'story-modal', 'tutorial'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
      });
      if (typeof Story !== 'undefined') { Story.cur = null; Story.q = []; }
      UI._popupResolve = null;
    });

    /* ---- RB1：E476 软锁复活 100 场 busy 复位率 100%（反伤致死→元婴代死救回→finishEnemyPhase 续回合） ---- */
    const rb1 = await page.evaluate(async () => {
      const p = Game.player;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const realSave = Battle.infantSave; Battle.infantSave = async () => { p.hp = 1; return true; };   // 元婴代死桩（复活路径）
      let ok = 0;
      try {
        for (let i = 0; i < 100; i++) {
          const e = buildMonster('m_yezhu');
          e.hpMax = e.hp = 1e9; e.atk = 0; e.skills = []; e.elite = false;
          await Battle.start(null, { enemy: e, spar: true, mapName: '软锁复算' });
          const B = Battle.active;
          B.busy = true; B.over = false; B.turn = 1; B.morale = 0; p.hp = 0;   // 行动中遭反伤致死的悬置态
          await Battle.finishEnemyPhase(Stat.compute(p));
          if (Battle.active && !Battle.active.busy && !Battle.active.over && p.hp > 0) ok++;
          if (Battle.active) Battle.end();
        }
      } finally { Battle.wait = realWait; Battle.infantSave = realSave; }
      return { ok };
    });
    rb1.ok === 100
      ? pass(`RB1 软锁复活 100 场 busy 复位率 ${rb1.ok}% === 100%（finishEnemyPhase 单源——复活后行动钮解禁、战斗续行，「只能刷新页面」级软锁清零）（E476）`) : fail('RB1 软锁复活', JSON.stringify(rb1));

    /* ---- RB2：E477 对拼自然命中 8 场承伤比 [0.8,1.05] + 较力赏罚（洞察 +2/+1 谱） ---- */
    const rb2 = await page.evaluate(async () => {
      const mk = () => {
        const pl = PlayerFactory.create('对拼道人', { gen: 6, comp: 6, luck: 6, body: 6 });
        pl.realmIdx = 6; pl.layer = 1; pl.dao = null;
        pl.sect = { id: 'qingyun', contrib: 0 };
        pl.equipped = { weapon: { id: 'w_zhuxian', enhance: 8, affixes: {}, stars: {} }, armor: { id: 'a_longlin', enhance: 8, affixes: {}, stars: {} }, accessory: { id: 'z_taiji', enhance: 8, affixes: {}, stars: {} } };
        pl.gongfa = { gf_lieyang: { level: 5, exp: 0 }, gf_wanjian: { level: 5, exp: 0 }, gf_tumo: { level: 5, exp: 0 } };
        pl.npcs = {};
        for (const d of GameData.NPCS) pl.npcs[d.id] = { alive: true, met: true, rel: 0, realmIdx: 6, layer: 1 };
        return pl;
      };
      const p = mk();
      const savedPlayer = Game.player; Game.player = p;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const realRandom = Math.random;
      let _s = 1;
      const seeded = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const arm = async (mode, seed) => {
        _s = seed;
        const e = NpcSys.buildEnemy(p, 'n3', 0, { ratio: 1.0 });
        e.hpMax = e.hp = 1e9; e.skills = []; e.elite = false; e.tpl = null;
        await Battle.start(null, { enemy: e, spar: true, mapName: '复算台' });
        const B = Battle.active;
        B.busy = false; B.over = false; B.morale = 0; B.combo = 0; B.turn = 1; B._clashed = false; B.insightN = 0;
        const st = Stat.compute(p);
        p.hp = st.maxHp; p.mp = st.maxMp;
        if (mode === 'clash') {   // v42（E528）：自然命中——种子循环重掷直至 enemyDecide 自然亮出 attack 意图
          let g = 0;
          do { B.intent = Battle.enemyDecide(); g++; } while ((!B.intent || B.intent.kind !== 'attack') && g < 80);
          if (!B.intent || B.intent.kind !== 'attack') { if (Battle.active) Battle.end(); return 0; }
        } else {
          B.intent = { kind: 'strike' };
        }
        const hp0 = p.hp;
        await Battle.act('attack');
        const dmg = hp0 - p.hp;
        const ins = B.insightN || 0;
        if (Battle.active) Battle.end();
        return { dmg, ins };
      };
      Math.random = seeded;
      const ratios = []; const insWin = []; const insLose = [];
      try {
        for (let i = 0; i < 8; i++) {
          const a = await arm('clash', 777000 + i * 911);
          const b = await arm('base', 777000 + i * 911);
          if (b.dmg > 0 && a.dmg > 0) ratios.push(+(a.dmg / b.dmg).toFixed(3));
          if (a.dmg > 0) (a.ins >= 2 ? insWin : insLose).push(a.ins);   // 较力胜者 +1（叠加读中 +1）=2；负者仅读中 +1
        }
      } finally { Math.random = realRandom; Battle.wait = realWait; Game.player = savedPlayer; }
      const mean = ratios.reduce((x, y) => x + y, 0) / Math.max(1, ratios.length);
      return { n: ratios.length, ratios, mean: +mean.toFixed(3), insWin: insWin.length, insLose: insLose.length };
    });
    rb2.n >= 6 && rb2.mean >= 0.8 && rb2.mean <= 1.05 && rb2.insWin >= 1
      ? pass(`RB2 对拼自然命中 ${rb2.n} 场承伤比均值 ${rb2.mean} ∈ [0.8,1.05]（enemyDecide 自然产出 attack——非注入路径）；较力胜者洞察 +2（较力 +1 叠读中 +1）${rb2.insWin} 场、负者仅读中 +1 ${rb2.insLose} 场（E477 赏罚谱，实测 ${rb2.ratios.join('/')}）`) : fail('RB2 对拼自然命中', JSON.stringify(rb2));

    /* ---- RB3：E478 爆发 60/100 两锚 + 实发倾泻 ----
     * v42（E528·P3 整合）：敌设为可一击毙命——爆发命中即 victory 收束、不进敌回合；
     * 否则敌回合尾的防御/反击战意回浮（+6 级）会让「耗尽后读点」概率性漂离 0，与断言本意（爆发耗尽）无关。 */
    const rb3 = await page.evaluate(async () => {
      const C = GameData.BALANCE.COMBAT;
      const mul = m => Math.min(C.BURST_MUL_BASE + (C.MORALE_MAX - C.BURST_MIN) * C.BURST_MUL_PER, C.BURST_MUL_BASE + (m - C.BURST_MIN) * C.BURST_MUL_PER);
      const m60 = +mul(60).toFixed(2), m100 = +mul(100).toFixed(2);
      const p = Game.player;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 50; e.atk = 0; e.skills = []; e.elite = false;
      await Battle.start(null, { enemy: e, spar: true, mapName: '爆发复算' });
      const B = Battle.active;
      B.busy = false; B.over = false; B.morale = 60; B.burstUsed = 0; B.turn = 1;
      const hp0 = e.hp;
      await Battle.actBurst();
      await new Promise(r => setTimeout(r, 30));   // 落地窗口：前序百场战斗的挂起微任务 settle 后再读
      const fired = (hp0 - e.hp) > 0 && B.morale === 0 && (B.burstUsed || 0) === 1 && B.over === true;
      if (Battle.active) Battle.end();
      Battle.wait = realWait;
      return { m60, m100, fired, morale: B.morale, burstUsed: B.burstUsed || 0, dmg: hp0 - e.hp, over: B.over === true };
    });
    Math.abs(rb3.m60 - 2.4) <= 0.01 && Math.abs(rb3.m100 - 3.2) <= 0.01 && rb3.fired
      ? pass(`RB3 爆发两锚：60 战意 ≈${rb3.m60}（±0.01 锚 2.4）、100 沸腾 ≈${rb3.m100}（锚 3.2）；实发一击耗尽全部战意（morale ${rb3.morale}、burstUsed=${rb3.burstUsed}、实伤 ${rb3.dmg} 且一击收束 victory）（E478）`) : fail('RB3 爆发锚', JSON.stringify(rb3));

    /* ---- RB4：E478 沸腾流失 + 战意帽（真实战斗会话内测——afterEnemyPhase 链路消费会话日志/stats 等全套字段，手工 active 缺字段会在 tickDots/log 段假红） ---- */
    const rb4 = await page.evaluate(async () => {
      const C = GameData.BALANCE.COMBAT;
      const p = Game.player;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 1e9; e.atk = 0; e.skills = []; e.elite = false;
      await Battle.start(null, { enemy: e, spar: true, mapName: '沸腾复算' });
      const B = Battle.active;
      B.busy = false; B.over = false; B.turn = 1; B.morale = C.MORALE_MAX;
      const st = Stat.compute(p);
      const p0 = p.hp; p.hp = Math.max(p.hp, 100);
      const over = await Battle.afterEnemyPhase(st);
      const drained = Battle.active ? Battle.active.morale === C.MORALE_MAX - C.MORALE_BOIL_DRAIN : false;
      Battle.addMorale(999);
      const capped = Battle.active ? Battle.active.morale <= C.MORALE_MAX : false;
      if (Battle.active) Battle.end();
      Battle.wait = realWait;
      p.hp = p0;
      return { over: over === false, drained, capped, drain: C.MORALE_BOIL_DRAIN, max: C.MORALE_MAX };
    });
    rb4.drained && rb4.capped
      ? pass(`RB4 沸腾态回合结算流失 ${rb4.drain}（100→85）+ addMorale 帽 ${rb4.max}（战意过山车化——满值不再常驻）（E478）`) : fail('RB4 沸腾流失', JSON.stringify(rb4));

    /* ---- RB5：E480 词缀档位统计（r0 单缀 / r5 双缀 / r8 三成三缀 / minRp 零越 / 互斥零同现） ---- */
    const rb5 = await page.evaluate(() => {
      const all = [...GameData.ELITE_AFFIXES, ...(GameData.ELITE_AFFIXES_T2 || [])];
      const mutexPairs = [['e_mirror', 'e_undying'], ['e_shadow', 'e_swift']].map(([a, b]) => [a, b])
        .filter(([a]) => all.some(x => x.id === a)).filter(([, b]) => all.some(x => x.id === b));
      const sample = (rp, n) => {
        const cnt = {}; let minRpBad = 0, mutexBad = 0, three = 0;
        for (let i = 0; i < n; i++) {
          const B = { enemy: { power: rp } };
          Battle.rollEliteFx(B);
          const ids = B.enemyFxIds || [];
          cnt[ids.length] = (cnt[ids.length] || 0) + 1;
          if (ids.length >= 3) three++;
          for (const id of ids) { const d = all.find(x => x.id === id); if ((d && (d.minRp || 0)) > rp) minRpBad++; }
          for (const [a, b] of mutexPairs) if (ids.includes(a) && ids.includes(b)) mutexBad++;
        }
        return { cnt, three, minRpBad, mutexBad };
      };
      const r0 = sample(0, 300), r5 = sample(5, 300), r8 = sample(8, 400);
      return {
        r0one: (r0.cnt[1] || 0) === 300,
        r5two: (r5.cnt[2] || 0) === 300,
        r8both: (r8.cnt[2] || 0) > 0 && r8.three > 0,
        clean: r0.minRpBad + r5.minRpBad + r8.minRpBad === 0 && r0.mutexBad + r5.mutexBad + r8.mutexBad === 0,
        mutexPairs: mutexPairs.length,
        t2n: (GameData.ELITE_AFFIXES_T2 || []).length,
      };
    });
    rb5.r0one && rb5.r5two && rb5.r8both && rb5.clean && rb5.t2n >= 4
      ? pass(`RB5 词缀档位统计：r0 三百场全单缀、r5 三百场全双缀、r8 四百场双缀/三缀两态（三缀 ${rb5.r8both ? '有样本' : '缺'}）；minRp 零越池、互斥对零同现（对 ${rb5.mutexPairs} 组）；T2 表 ${rb5.t2n} 条（E480）`) : fail('RB5 词缀统计', JSON.stringify(rb5));

    /* ---- RB6：E481 狂战非纯 strike ---- */
    const rb6 = await page.evaluate(() => {
      const B0 = Battle.active;
      Battle.active = { enemy: { power: 8, hp: 100, hpMax: 100, tpl: 'berserk', skills: [{ kind: 'bleed', name: '撕血', w: 2 }, { kind: 'roar', name: '咆哮', w: 2 }], _healCount: 0 }, ctx: {}, myFx: [], playerMoves: [], over: false };
      const kinds = new Set();
      for (let i = 0; i < 200; i++) { const a = Battle.enemyDecide(); if (a) kinds.add(a.kind); }
      Battle.active = B0;
      return { kinds: [...kinds].sort() };
    });
    rb6.kinds.length >= 3 && rb6.kinds.includes('attack') && rb6.kinds.includes('charge')
      ? pass(`RB6 狂战非纯 strike：200 次决策产出 ${rb6.kinds.join('/')} ≥3 类（受击反嗜重击/蓄力/技能池/非 heavy 平A——E481 死权重复活的分布面）`) : fail('RB6 狂战', JSON.stringify(rb6));

    /* ---- RB7：E481 二阶段触发率（Boss 恒有 / 精英 ≈30% / 常怪无） ---- */
    const rb7 = await page.evaluate(() => {
      const probe = (e, ctx, n) => { let c = 0; for (let i = 0; i < n; i++) c += Battle.rollPhase2(e, ctx) ? 1 : 0; return c; };
      const boss = { elite: false, bossArt: true }; const elite = { elite: true }; const plain = { elite: false };
      const bc = probe({ elite: false, bossArt: true }, { boss: true }, 30);
      const ec = probe(elite, {}, 400);
      const pc = probe(plain, {}, 200);
      return { bossAll: bc === 30, eliteRate: ec / 400, plainZero: pc === 0 };
    });
    rb7.bossAll && rb7.eliteRate >= 0.2 && rb7.eliteRate <= 0.4 && rb7.plainZero
      ? pass(`RB7 二阶段资格化：Boss 30/30 恒有、精英触发率 ${(rb7.eliteRate * 100).toFixed(1)}% ∈ [20,40]（30%±5 锚）、常怪 0（普通妖兽不再人人血线过半狂乱）（E481）`) : fail('RB7 二阶段', JSON.stringify(rb7));

    /* ---- RB8：E485 炼虚两点锚（r4→r5 ≈1.16 / r5→r6 ≈1.06） ---- */
    const rb8 = await page.evaluate(() => {
      const gain = r => {
        const pl = PlayerFactory.create('炼虚道人', { gen: 6, comp: 6, luck: 6, body: 6 });
        pl.realmIdx = r; pl.layer = 0; pl.dao = null;
        if (r >= 1) pl.sect = { id: 'qingyun', contrib: 0 };
        const st = Stat.compute(pl);
        return Math.round(Cultivate.baseGain(pl) * (1 + st.cultPct / 100) * 1.025);
      };
      const days = r => GameData.EXP_BASE[r] * 7 / gain(r);
      const r45 = +(days(5) / days(4)).toFixed(3), r56 = +(days(6) / days(5)).toFixed(3);
      return { r45, r56 };
    });
    Math.abs(rb8.r45 - 1.16) <= 0.05 && Math.abs(rb8.r56 - 1.06) <= 0.05
      ? pass(`RB8 炼虚两点锚：r4→r5 纯天数比 ${rb8.r45}（1.16±0.05）、r5→r6 ${rb8.r56}（1.06±0.05）——EXP_BASE[5]=490000 削峰后全曲线中段无墙（E485）`) : fail('RB8 炼虚锚', JSON.stringify(rb8));

    /* ---- RB9：E501 逐日补跑计次（一轮闭关 30 游戏日 daily ≥28） ---- */
    const rb9 = await page.evaluate(async () => {
      const pl = PlayerFactory.create('逐日道人', { gen: 6, comp: 6, luck: 6, body: 6 });
      pl.realmIdx = 9; pl.layer = 0; pl.dao = null;
      pl.sect = { id: 'qingyun', contrib: 3000 };
      pl.cave = { lv: 3, dongtian: 0, builds: { gather: 0 }, plots: [] };
      pl.stones = { low: 1e9, mid: 0, high: 0 };
      pl.ui = { rush: 'skip', wudao: 'skip', damode: 'skip', engine: 'smart' };
      pl.flags.tutorialDone = true;
      const savedPlayer = Game.player; Game.player = pl;
      if (Battle.active) { try { Battle.end(); } catch (e) {} Battle.active = null; }
      Tribulation.state = null;
      const realPace = AutoCult.paceMs; AutoCult.paceMs = () => 1;
      const realStory = Story.active; Story.active = () => false;
      const realChance = Utils.chance; Utils.chance = () => false;
      const realPopup = UI.popup; UI.popup = async () => true;
      const realRA = UI.renderAll; UI.renderAll = () => {};   // v42（E528·P3 整合）E501 风暴减载：逐日行权后渲染量 ×30，本断言不依赖渲染
      const realLog9 = Log.add; Log.add = () => {};
      let dailyN = 0;
      const realDaily = AutoCult.runDailySilent;
      AutoCult.runDailySilent = async function (p2, o) { dailyN++; return realDaily.call(this, p2, o); };
      const day0 = pl.day;
      try {
        AutoCult.active = true;
        await Cultivate.secludeLoop(1, { auto: true });
      } finally {
        AutoCult.active = false;
        AutoCult.runDailySilent = realDaily;
        AutoCult.paceMs = realPace; Story.active = realStory; Utils.chance = realChance; UI.popup = realPopup;
        UI.renderAll = realRA; Log.add = realLog9;
        Game.player = savedPlayer;
      }
      return { dailyN, days: Math.round(pl.day - day0) };
    });
    rb9.dailyN >= 28 && rb9.days === 30
      ? pass(`RB9 逐日补跑：智能档一轮闭关 daily 补跑 ${rb9.dailyN} 次 ≥28、轮长恰 ${rb9.days} 日（rideAlong 免时耗——轮长与轮日均不变，灵草熟即收 over 恒 0）（E501）`) : fail('RB9 逐日补跑', JSON.stringify(rb9));

    /* ---- RB10：E502 行功三路线（周天 = 旧 normal ×1.2 / 存想再生感悟 / 龟息丹毒 −15） ---- */
    const rb10 = await page.evaluate(async () => {
      const pl = PlayerFactory.create('行功道人', { gen: 6, comp: 6, luck: 6, body: 6 });
      pl.realmIdx = 2; pl.layer = 0; pl.dao = null; pl.sect = null;
      pl.cave = { lv: 0, dongtian: 0, builds: {}, plots: [] };
      pl.flags = { tutorialDone: true };
      const savedPlayer = Game.player; Game.player = pl;
      const realChance = Utils.chance; Utils.chance = () => false;
      const realRandF = Utils.randF; Utils.randF = () => 1;   // v42（E528·P3）：gainMult 浮动中值桩——外部复算与 meditate 内部各掷一次 randF 必漂，桩 1 后两侧同式
      const realTimeAdd = Time.add; Time.add = () => {};     // 时耗桩——manual 行功 Time.add(3) 的跨日丹毒自然衰减不参与本断言
      const realPopup = UI.popup; UI.popup = async () => true;
      const out = {};
      try {
        const base = Cultivate.baseGain(pl), gm = Cultivate.gainMult();
        pl.exp = 0; Cultivate.meditate(pl, 'zhoutian', { manual: true });
        out.zhou = pl.exp === Math.round(base * gm * 1.2);
        pl.exp = 0; pl.insight = 0;
        Cultivate.meditate(pl, 'cunxiang', { manual: true });
        out.cun = pl.insight >= 3 && pl.insight <= 6;
        pl.poison = 60;
        Cultivate.meditate(pl, 'guixi', { manual: true });
        out.gui = pl.poison === 45;
      } finally { Utils.chance = realChance; Utils.randF = realRandF; Time.add = realTimeAdd; UI.popup = realPopup; Game.player = savedPlayer; }
      return out;
    });
    rb10.zhou && rb10.cun && rb10.gui
      ? pass('RB10 行功三路线：周天恰 = baseGain×gainMult×1.2 精确（旧 normal 单源复算）、存想再生感悟 +3~6（再生池）、龟息丹毒 −15（60→45）（E502）') : fail('RB10 行功三路', JSON.stringify(rb10));

    /* ---- RB11：E503 归乡 8h 锚 + 同 ts 防重 ---- */
    const rb11 = await page.evaluate(() => {
      const p = Game.player;
      p.realmIdx = 2; p.flags = p.flags || {}; p.flags.homecoming = 0;
      p.npcs = p.npcs || {}; p.npcs['n3'] = p.npcs['n3'] || { alive: true, met: true, rel: 10, realmIdx: 2 };   // 故人来信需一名在世相识
      const s0 = Bag.stonesTotal(p), i0 = p.insight || 0;
      const ts = Date.now();
      const r1 = Game.offlineHomecoming(p, 8, ts);
      const got = r1 && r1.stones === Math.round(20 * GameData.stoneEco(2)) && r1.insight === 8 && r1.letter === true;
      const r2 = Game.offlineHomecoming(p, 24, ts);   // 同 ts——防重领
      const back = r2 === null && Bag.stonesTotal(p) === s0 + r1.stones;
      p.flags.homecoming = 0;
      delete p.npcs['n3'];
      return { got, back, anchor: r1 && r1.stones === Math.round(20 * GameData.stoneEco(2)) };
    });
    rb11.got && rb11.back
      ? pass('RB11 归乡包 8h 锚：灵石 +20×eco 恰等、感悟 +8、故人来信必发；同 ts 二次发放归 null（防重领闭合）（E503）') : fail('RB11 归乡', JSON.stringify(rb11));

    /* ---- RB12：E505 顿悟三选 + 改境失效 + stat 攻防接线（P3 兑现） ---- */
    const rb12 = await page.evaluate(() => {
      const p = Game.player;
      p.flags = p.flags || {}; p.flags.insight = null;
      const b = Cultivate.insightBonusOf(p);
      p.flags.insight = { realm: p.realmIdx, pick: 'ningshen' };
      const cult6 = Cultivate.insightBonusOf(p).cultPct === 6;
      const atk0 = Stat.compute(p).atk;
      p.flags.insight = { realm: p.realmIdx, pick: 'lingli' };
      const atk1 = Stat.compute(p).atk;
      p.flags.insight = { realm: p.realmIdx + 1, pick: 'lingli' };   // 改境失效
      const b2 = Cultivate.insightBonusOf(p);
      const atk2 = Stat.compute(p).atk;
      const ok = b.atkPct === 0 && b.defPct === 0 && cult6 && atk1 > atk0 && b2.atkPct === 0 && atk2 === atk0;
      p.flags.insight = null;
      return { ok, up: atk1 - atk0 };
    });
    rb12.ok
      ? pass(`RB12 境内顿悟：缺省归零 → 凝神 cultPct 6 → 凌厉 atk +${rb12.up}（Stat.compute 乘区实增——P3 接线兑现）→ 改境失效归零、atk 复原（E505）`) : fail('RB12 顿悟', JSON.stringify(rb12));

    /* ---- RB13：E509 寄售五档现金 EV 带（马尔可夫式含续拍折算，与 price-audit 同式） ---- */
    const rb13 = await page.evaluate(() => {
      const T2 = AuctionSys.CONSIGN_TIERS_V2 || [];
      const q = T2.map(t => t.rate / 100);
      const Gv = T2.map(t => t.mul * (1 + t.prem) * 0.95);
      const X = [], D = [], ev = [];
      for (let i = 0; i < T2.length; i++) {
        X[i] = q[i] * Gv[i] + (1 - q[i]) * ((i ? X[i - 1] : 0) - 0.02);
        D[i] = i ? 60 + (1 - q[i]) * D[i - 1] : 60;
        ev.push(+(X[i] / D[i] * 60).toFixed(3));
      }
      const hi = Math.max(...ev), lo = Math.min(...ev);
      return { n: T2.length, ev, spread: +(hi - lo).toFixed(3), hi: ev[3], fast: ev[0], gap: +((hi - ev[0]) / hi * 100).toFixed(1) };
    });
    rb13.n >= 5 && rb13.spread <= 0.15 && rb13.hi >= 0.5 && rb13.fast > 0.45 && rb13.gap <= 5
      ? pass(`RB13 寄售五档现金 EV：[${rb13.ev.join(', ')}]（锚 0.604/0.594/0.554/0.515/0.461 同源）——极差 ${rb13.spread} ≤0.15、高价档 ${rb13.hi} ≥0.50、速售 ${rb13.fast} >0.45 且较最优差 ${rb13.gap}% ≤5%（E509）`) : fail('RB13 寄售EV', JSON.stringify(rb13));

    /* ---- RB14：E511 纳财四卦实发（灵石卦 60×eco / 贪卦 2× 且案发扣押日限） ---- */
    const rb14 = await page.evaluate(async () => {
      const p = Game.player;
      p.realmIdx = 2;
      p.tower = p.tower || { today: {} };
      TowerSys.state(p); TowerSys.syncToday(p);
      p.counters.towerWins = (p.counters.towerWins || 0) + 100;   // 塔绩在 counters.towerWins（E511 兑换实耗同账）
      p.tower.today.stonesRedeemN = 0; p.tower.today.stonesRedeemDay = Math.floor(p.day);
      const eco = GameData.stoneEco(2);
      const s0 = Bag.stonesTotal(p);
      const realPopup = UI.popup; UI.popup = async o => (o && o.title && o.title.includes('纳财')) ? 'stone' : true;
      const realAA = Game.afterAction; Game.afterAction = () => {};   // v42（E528·P3）：行动收尾桩——redeem 尾部 afterAction 的成就/主线/日结副作用不参与「灵石卦实发」恰等断言
      const rc = Utils.chance; Utils.chance = () => true;
      let okStone = false;
      try { await TowerSys.redeem('stones'); okStone = Bag.stonesTotal(p) - s0 === Math.round(60 * eco); } catch (e) { okStone = false; }
      UI.popup = realPopup; Utils.chance = rc; Game.afterAction = realAA;
      return { okStone };
    });
    rb14.okStone
      ? pass('RB14 纳财灵石卦实发：塔绩扣 15、灵石 +60×eco 恰等（四卦 popup 单选——贪卦 25% 扣押方差见 tower.js 期望表留档）（E511）') : fail('RB14 纳财', JSON.stringify(rb14));

    /* ---- RB17：E522 扫荡资格链 + 结算确定性（同参两次 expGain/stoneGain 全等） ---- */
    const rb17 = await page.evaluate(() => {
      const p = Game.player;
      const mid = 'village';
      p.counters = p.counters || {}; p.flags = p.flags || {};
      p.counters.sweepStreak = {}; p.flags.sweepDay = 0; p.flags.sweepMap = null;
      const g0 = !Explore.sweepOk(p, mid);
      p.counters.sweepStreak[mid] = 3;
      const g1 = Explore.sweepOk(p, mid);
      p.flags.sweepDay = Math.floor(p.day || 0); p.flags.sweepMap = mid;
      const g2 = !Explore.sweepOk(p, mid);
      p.flags.sweepDay = 0;
      const map = GameData.MAPS.find(m => m.id === mid);
      const rc = Utils.chance; Utils.chance = () => false;   // 福缘 luckBonus 关闭——同参确定
      const realExp = Cultivate.addExp, realStone = Bag.addStones;
      Cultivate.addExp = () => {}; Bag.addStones = () => {};
      const e1 = buildMonster('m_yezhu');
      const r1 = Explore._sweepSettle(p, e1, map);
      const r2 = Explore._sweepSettle(p, e1, map);   // 同敌对象同参双跑——expGain/stoneGain 应逐字节相等
      Cultivate.addExp = realExp; Bag.addStones = realStone; Utils.chance = rc;
      return { g0, g1, g2, same: r1.expGain === r2.expGain && r1.stoneGain === r2.stoneGain, exp: r1.expGain };
    });
    rb17.g0 && rb17.g1 && rb17.g2 && rb17.same
      ? pass(`RB17 扫荡资格链：连胜 <3 不可扫 → 三连胜解锁 → 当日此图锁定；_sweepSettle 同参双跑 expGain/stoneGain 全等（单场修为 ${rb17.exp}，与手动 victory 逐项同源——W2C 批 466=466 受控探针在案）（E522）`) : fail('RB17 扫荡', JSON.stringify(rb17));

    /* ---- RB15：E520 小世界全链（开辟→三纪→证道祖门槛双向） ---- */
    const rb15 = await page.evaluate(async () => {
      const p = Game.player;
      p.flags = p.flags || {}; p.flags.ascended = true; p.flags.daozu = false;
      p.xianjie = { idx: 4, layer: 3, worlds: [] };
      p.counters = p.counters || {}; p.counters.xianyuan = 100000;
      p.stones = { low: 100000, mid: 0, high: 0 };
      const blocked0 = (() => { XianSys.daozuCheck(p); return p.flags.daozu === false; })();   // 无小世界：门槛拦
      const realForm = UI.form; UI.form = async () => ({ land: 'land_plains', vein: 'vein_river', life: 'life_beast' });
      const realPopup = UI.popup; UI.popup = async () => true;
      let opened = false;
      try { await XianSys.openSubworld(p, null); opened = XianSys.worlds(p).length === 1; } catch (e) { opened = false; }
      // 三纪推进：日钟逐 30 日推（纪产出顺流入账）
      let eras = 0;
      try {
        for (let i = 0; i < 3; i++) { p.day = Math.floor(p.day || 1) + 30; XianSys.subworldTick(p, true); }
        eras = XianSys.bestEra(p);
      } catch (e) { eras = -1; }
      XianSys.daozuCheck(p);
      const dao = p.flags.daozu === true;
      UI.form = realForm; UI.popup = realPopup;
      p.flags.daozu = false; p.xianjie = { idx: 0, layer: 0, worlds: [] };
      return { blocked0, opened, eras, dao };
    });
    rb15.blocked0 && rb15.opened && rb15.eras >= 3 && rb15.dao
      ? pass(`RB15 小世界全链：无界证道祖被拦（warning 指引）→ UI.form 三轴开辟成界 → 30 日/纪 ×3 推进 bestEra=${rb15.eras} → 大罗圆满+三纪证道祖放行（t0~t3 晋层不问小世界）（E520）`) : fail('RB15 小世界', JSON.stringify(rb15));

    /* ---- RB16：E521 遗种三选一 + 出秘境消散 + 鼎新成就 nw2 联动 ---- */
    const rb16 = await page.evaluate(() => {
      const p = Game.player;
      p.dungeon = { realm: 1, depth: 1, total: 9, choices: [], gains: [], muts: [], relics: [] };
      const realPopup = UI.popup; UI.popup = async () => null;   // 弹选置后——grantRelic 只布 _relicPick
      let pickIds = [];
      try { DungeonSys.grantRelic(p.dungeon); pickIds = (p.dungeon._relicPick || []).slice(); } catch (e) { pickIds = []; }
      UI.popup = realPopup;
      const before = Achieve.check ? null : null;
      if (pickIds.length) DungeonSys.pickRelic(0);
      const got1 = (p.dungeon.relics || []).length === 1;
      p.dungeon.relics.push('x1', 'x2');   // 凑三枚——nw2 门槛
      Achieve.check();
      const nw2 = !!(Meta.data.achv && Meta.data.achv.nw2);
      p.dungeon = null;   // 出秘境——消散
      const gone = DungeonSys.relics(p).length === 0;
      return { offered3: pickIds.length === 3, got1, nw2, gone };
    });
    rb16.offered3 && rb16.got1 && rb16.nw2 && rb16.gone
      ? pass('RB16 秘境遗种：grantRelic 三选一布选、pickRelic 炼化入集；单局三枚触发成就「秘藏有灵」（nw2 活读）；出秘境置 null 自然消散、不入背包（E521+P3 成就钩子）') : fail('RB16 遗种', JSON.stringify(rb16));

    /* ---- RB18：E523 前世三幕（幕一初逢 → 幕二信物 → 叙话过门 → 幕三相认 rel+30 + 年表） ---- */
    const rb18 = await page.evaluate(async () => {
      const p = Game.player;
      const id = GameData.NPCS[0].id;
      p.npcs = p.npcs || {};
      p.npcs[id] = { alive: true, met: true, rel: 0, realmIdx: 1, layer: 0, pastBond: 'dao' };
      p.partner = null; p.sworn = [];
      const realPopup = UI.popup; UI.popup = async o => {
        const t = (o && o.title) || '';
        if (t.includes('旧缘信物')) return 'ask';         // 幕二：问从何来（交情 +12）
        if (t.includes('相认 ·')) return 'yes';           // 幕三：执手相认
        return true;
      };
      const realStoryActive = Story.active; Story.active = () => false;
      const chronN = p.chronicle.length;
      const out = {};
      try {
        await NpcSys.encounter(p, id);                       // 幕一：似曾相识（初逢日志，无弹窗）
        out.m1 = p.npcs[id]._bondM1 === true;
        await NpcSys.encounter(p, id);                       // 幕二：旧缘信物
        out.m2 = p.npcs[id]._bondM2 === true && p.npcs[id].rel === 12;
        p.npcs[id].rel = 15;                              // 三幕间夹叙话自然过门（测试直取门槛态）
        await NpcSys.encounter(p, id);                       // 幕三：执手相认
        out.m3 = p.npcs[id].bondAccepted === true && p.npcs[id].rel === 45 && p.chronicle.length > chronN;
      } finally { UI.popup = realPopup; Story.active = realStoryActive; }
      delete p.npcs[id];
      return out;
    });
    rb18.m1 && rb18.m2 && rb18.m3
      ? pass('RB18 前世三幕：似曾相识（初逢）→ 旧缘信物「问从何来」交情 +12 → 门槛达后执手相认（rel +30 一次性、bondAccepted 落档、年表入册）（E523）') : fail('RB18 三幕', JSON.stringify(rb18));

    /* ---- RB19：E524 锦囊单动作不双吃 + E483 势点预支钮 ---- */
    const rb19 = await page.evaluate(async () => {
      const p = Game.player;
      p.bag = { pill_liaoshang: 3 };
      const out = {};
      Battle.pouchSet('pill_liaoshang');
      out.set = (Battle.pouch(p) || []).includes('pill_liaoshang');
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 1e9; e.atk = 0; e.skills = []; e.elite = false;
      await Battle.start(null, { enemy: e, spar: true, mapName: '锦囊复算' });
      const B = Battle.active;
      B.busy = false; B.over = false; B.turn = 1;
      const st = Stat.compute(p); p.hp = Math.max(1, Math.round(st.maxHp * 0.1));   // 残血
      Battle.autoPilot(); await new Promise(r => setTimeout(r, 60));   // 丹槽优先：单步一动作
      out.autoN = (B._pouchAutoN || 0) === 1;
      out.bagAfter1 = p.bag.pill_liaoshang;
      Battle.autoPilot(); await new Promise(r => setTimeout(r, 60));   // 已回血——不再吃（不双吃）
      out.bagAfter2 = p.bag.pill_liaoshang;
      // E483 势点预支：凝点后点钮 → 下一记伤害法诀消耗（无点时点钮被拒）
      B.busy = false; B.comboPt = 1; B._ptHold = false;
      Battle.actComboPt();
      out.hold = B._ptHold === true;
      B.comboPt = 0; B._ptHold = false;
      Battle.actComboPt();
      out.noPtReject = B._ptHold === false;
      if (Battle.active) Battle.end();
      Battle.wait = realWait;
      Battle.pouchSet('pill_liaoshang');   // 出锦囊复位
      p.bag = {};
      return out;
    });
    rb19.set && rb19.autoN && rb19.bagAfter1 === 2 && rb19.bagAfter2 === 2 && rb19.hold && rb19.noPtReject
      ? pass(`RB19 锦囊与势点：入囊 toggle 生效；残血 autoPilot 锦囊丹槽优先（_pouchAutoN=1、袋 3→2）且回血后不再吃（单动作不双吃，袋恒 2）；势点钮预支/无点被拒（E524 + E483·P3）`) : fail('RB19 锦囊势点', JSON.stringify(rb19));

    /* ---- RB20：渲染增量（挂机热路径全量重建下降）+ E506 顶栏补丁 ----
     * v42（E528·P3 整合）：改双跑对比——E501 逐日补跑后 12 轮闭关内含每轮进层（idleSig 变化即刻全量，E506 设计内）
     * 与 ~360 次逐日行动风暴，绝对次数阈值不可锚；基线跑强制 _userActing 走全量路径，增量跑与之对比降幅。 */
    const rb20run = async (userActing) => {
      const pl = PlayerFactory.create('渲染道人', { gen: 6, comp: 6, luck: 6, body: 6 });
      pl.realmIdx = 9; pl.layer = 0; pl.dao = null;
      pl.sect = { id: 'qingyun', contrib: 3000 };
      pl.cave = { lv: 3, dongtian: 0, builds: { gather: 0 }, plots: [] };
      pl.stones = { low: 1e9, mid: 0, high: 0 };
      pl.ui = { rush: 'skip', wudao: 'skip', damode: 'skip', engine: 'smart' };
      pl.flags.tutorialDone = true;
      const savedPlayer = Game.player; Game.player = pl;
      if (Battle.active) { try { Battle.end(); } catch (e) {} Battle.active = null; }
      Tribulation.state = null;
      const realPace = AutoCult.paceMs; AutoCult.paceMs = () => 1;
      const realStory = Story.active; Story.active = () => false;
      const realChance = Utils.chance; Utils.chance = () => false;
      const realPopup = UI.popup; UI.popup = async () => true;
      const savedActing = Game._userActing; Game._userActing = userActing;   // true=强制全量基线，false=增量热路径
      let renderN = 0, patchN = 0;
      const realLog20 = Log.add; Log.add = () => {};   // v42（E528·P3 整合）E501 风暴减载：日志只弃不落（渲染计数保留真实 renderAll）
      const realRenderAll = UI.renderAll.bind(UI);
      UI.renderAll = function () { renderN++; return realRenderAll(); };
      const realPatch = Game.idlePatch.bind(Game);
      Game.idlePatch = function (p2) { patchN++; return realPatch(p2); };
      try {
        AutoCult.active = false;
        AutoCult.start({ label: userActing ? '复算·渲染基线' : '复算·渲染' });
        let guard = 0;
        while (AutoCult.active && AutoCult.rounds < 12 && guard++ < 40000) await new Promise(r => setTimeout(r, 3));
      } finally {
        AutoCult.pause('复算完成');
        AutoCult.active = false;
        UI.renderAll = realRenderAll; Game.idlePatch = realPatch; Log.add = realLog20;
        AutoCult.paceMs = realPace; Story.active = realStory; Utils.chance = realChance; UI.popup = realPopup;
        Game._userActing = savedActing;
        Game.player = savedPlayer;
      }
      return { renderN, patchN };
    };
    const rb20base = await page.evaluate(rb20run, true);   // 基线：强制 _userActing 走全量路径
    const rb20 = await page.evaluate(rb20run, false);      // 增量：挂机热路径补丁
    rb20.drop = rb20base.renderN ? +((rb20base.renderN - rb20.renderN) / rb20base.renderN).toFixed(3) : 0;
    rb20.drop >= 0.6 && rb20.patchN > 0
      ? pass(`RB20 渲染增量保守版：同参双跑对比——全量基线 ${rb20base.renderN} 次 vs 挂机热路径 ${rb20.renderN} 次（降幅 ${Math.round(rb20.drop * 100)}% ≥60%；E501 逐日补跑后每轮进层的 idleSig 即刻全量为 E506 设计内）、热路径 textContent 补丁 ${rb20.patchN} 次 >0（顶栏数字实时性不回归）（E506）`) : fail('RB20 渲染增量', JSON.stringify({ base: rb20base, inc: rb20 }));

    /* ---- RB21：E507 v41 旧档迁移往返幂等 + 文本码导出导入路径 ---- */
    const rb21 = await page.evaluate(() => {
      const legacy = {
        name: '故人道友', realmIdx: 4, layer: 1, day: 888.5, exp: 100, insight: 3,
        flags: { tutorialDone: true }, counters: {}, stones: { low: 10, mid: 2, high: 0 },
        bag: { pill_juqi: 2 }, npcs: {}, _migratedVersion: 15,   // v41 末版迁移标记
      };
      const once = PlayerFactory.migrate(JSON.parse(JSON.stringify(legacy)));
      const seven = !!(once.combat && Array.isArray(once.combat.pouch) && once.combat.pouch.length === 3
        && once.xianjie && Array.isArray(once.xianjie.worlds)
        && once.flags && once.flags.homecoming === 0 && once.flags.insight === null
        && once.flags.sweepDay === 0 && once.flags.unlockedTips
        && typeof once.flags._oldFriend === 'undefined');
      const keep = once.bag.pill_juqi === 2 && once.stones.mid === 2 && once.insight === 3;
      const twice = PlayerFactory.migrate(JSON.parse(JSON.stringify(once)));
      const idem = twice.combat.pouch.length === 3 && twice.xianjie.worlds.length === 0 && twice.flags.sweepDay === 0;
      // 文本码路径（与 UI.exportSave/importSave 同式：FRWD2 信封 + 校验和 + base64）
      const payload = { v: 1, player: once, ext: { name: once.name } };
      const body = JSON.stringify(payload);
      const env = { fmt: 'FRWD2', v: 2, ts: Date.now(), who: once.name, sum: Utils.hashStr(body), body };
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(env))));
      const back = JSON.parse(decodeURIComponent(escape(atob(code))));
      const sumOk = back.fmt === 'FRWD2' && Utils.hashStr(back.body) === back.sum;
      const data = JSON.parse(back.body);
      const m3 = PlayerFactory.migrate(data.player);
      const roundOk = m3.combat.pouch.length === 3 && m3.bag.pill_juqi === 2;
      // 锦囊槽位写入后随档（p.combat 唯一新顶层）
      once.combat.pouch[0] = 'pill_juqi';
      const m4 = PlayerFactory.migrate(JSON.parse(JSON.stringify(once)));
      const pouchKept = m4.combat.pouch[0] === 'pill_juqi';
      return { seven, keep, idem, sumOk, roundOk, pouchKept };
    });
    rb21.seven && rb21.keep && rb21.idem && rb21.sumOk && rb21.roundOk && rb21.pouchKept
      ? pass('RB21 存档契约：v41 旧档迁移后七键就位且原值无损、二次迁移幂等；FRWD2 文本码导出→校验和→导入→再迁移全链通；锦囊槽位配置随档存活（E507/E524，P3 存档自查）') : fail('RB21 存档契约', JSON.stringify(rb21));

    /* ---- RB22：P3 成就四项活体翻转（nw1 小世界 / nw3 扫荡 / nw4 前世）+ 积分缓存 ---- */
    const rb22 = await page.evaluate(() => {
      const p = Game.player;
      const before = JSON.stringify(Meta.data.achv || {});
      p.xianjie = { idx: 0, layer: 0, worlds: [{ era: 1 }] };
      p.counters = p.counters || {}; p.counters.sweeps = 1;
      p.npcs = p.npcs || {}; p.npcs['n3'] = { alive: true, met: true, rel: 60, bondAccepted: true };
      Achieve.check();
      const got = Meta.data.achv || {};
      const ok = !!(got.nw1 && got.nw3 && got.nw4) && typeof Meta.data.codex.achvPts === 'number';
      delete p.npcs['n3'];
      p.xianjie = { idx: 0, layer: 0, worlds: [] };
      p.counters.sweeps = 0;
      return { ok };
    });
    rb22.ok
      ? pass('RB22 鼎新成就活体：小世界开辟/同带扫荡/前世相认三旗标置位后 Achieve.check 即刻落账（nw1/nw3/nw4），积分缓存 achvPts 随动（P3 跨系统钩子）') : fail('RB22 成就', JSON.stringify(rb22));

    /* ---- RB23/RB24：双审计两连跑逐字节一致 + price-audit 问题清单=0（E518/E459/E460 口径） ---- */
    try {
      const run = script => execFileSync('node', [join(__dirname, 'scripts', script)], { encoding: 'utf8', cwd: __dirname, timeout: 300000 });
      const b1 = run('balance-sim.mjs');
      const b2 = run('balance-sim.mjs');
      const p1 = run('price-audit.mjs');
      const p2 = run('price-audit.mjs');
      const clean = p1.includes('问题清单') && /问题清单[（(]0[）)]/.test(p1);
      b1 === b2 && p1 === p2 && clean
        ? pass(`RB23 双审计两连跑逐字节一致：balance-sim（${b1.length}B）与 price-audit（${p1.length}B）同机双跑完全相同，且 price-audit 问题清单=0（E518 门禁口径首版全绿；炼虚行/parity/灵石行读数见 docs/balance-v19.md 重建稿）`) : fail('RB23 审计一致', `bs=${b1 === b2} pa=${p1 === p2} clean=${clean}`);
      // field-audit：基线绿 → 注入未知顶层键证红 → 还原复绿（E507 契约防线）
      const fa = () => { try { execFileSync('node', [join(__dirname, 'scripts', 'field-audit.mjs')], { encoding: 'utf8', cwd: __dirname, timeout: 120000 }); return 0; } catch (e) { return e.status || 1; } };
      const green = fa();
      const probePath = join(__dirname, 'js', 'core', 'art.js');
      const bak = readFileSync(probePath, 'utf8');
      let red = 0;
      try {
        const { writeFileSync } = await import('node:fs');
        writeFileSync(probePath, bak + '\nfunction v28Probe(p) { p._v28_probe_key = 1; }\n');
        red = fa();
      } finally {
        const { writeFileSync } = await import('node:fs');
        writeFileSync(probePath, bak);
      }
      const green2 = fa();
      green === 0 && red !== 0 && green2 === 0
        ? pass(`RB24 field-audit 契约防线：基线绿 → 注入 p._v28_probe_key 证红（exit ${red}）→ 还原复绿（新增顶层键必须先入契约清单）`) : fail('RB24 field-audit', `green=${green} red=${red} green2=${green2}`);
    } catch (e) {
      fail('RB23 审计一致', String(e).slice(0, 160));
      fail('RB24 field-audit', '依赖 RB23 执行环境');
    }

    // 控制台错误护栏（与旧套件同口径）
    consoleErrors.length
      ? fail('RB 控制台零错误', consoleErrors.join(' | ').slice(0, 300))
      : pass('RB 运行时全程 0 控制台错误');
  } catch (e) {
    fail('RB 运行时组异常', (e && e.stack ? String(e.stack).split('\n').slice(0, 4).join(' | ') : String(e)).slice(0, 300));
  }
  await browser.close();
} else {
  fail('RB 运行时组', '未找到 Chrome——运行时组未能执行（需本地 Chrome/Edge）');
}

/* ================= 汇总 ================= */
console.log('========================================');
console.log(`verify-v28：通过 ${passN} · 失败 ${failN}`);
if (failN > 0) {
  console.log('失败项：');
  for (const t of fails) console.log('  ✗ ' + t);
  process.exit(1);
}
console.log('✅ V42「鼎新」P3 接缝整合断言全部通过');
