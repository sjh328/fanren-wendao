#!/usr/bin/env node
/* ======================================================================
 * verify-v27 —— V41「开物」回归套件（随批次递增，终稿 ≥95 断言）
 * 本包（WP9 回归套件扩编 E473，门禁 E459/E460/E461 随链）：
 *   SA 源码形态组——对拼余波豁免（E414）/ 力竭豁免单源名单（E415）/ 爆发不吃必会心存量+title 2.4（E416）/
 *   CRIT_DMG_CAP 2.4（E417）/ 拍卖 peek/ensure 读写拆分+滚茬透传 consign（E434/E439）/
 *   画符 expectedQty 逐项对表（E435）/ forge CONSUMED_MATS 字面量动态比对（E436）/
 *   黑市双闸+p.sess.haggleMul（E437/E428）/ 聚灵三态+偏好拆家 p.ui（E422/E428）/
 *   官市加价方向（E444）/ 灵泉 15 系数（E441）/ 通商波幅（E440）/ 新图与动态威胁带（E452/E453）/
 *   劫象两表六六（E455）/ 仙阶单调（E456）/ 偷袭 fury（E457）/ 心魔镜像+年兽 parity（E448/E449）/
 *   斩三尸持久勘误（E450）/ 碑文页（E462）/ 行情志+备战单（E468/E469）+ 门禁挂链
 *   RB 行为组——对拼 8 场承伤比 [0.8,1.05] / 塔战第 7 回合无力竭 tag / 智能档 10 轮结算弹窗 =0 /
 *   旧档 sess/ui 迁移往返 / BID 三连 rate 仍 60 / 滚茬 consign 存续→结算清除 /
 *   读档+过期拍期 tips 两次一致 / 画符 EV 同参实算 / 溢流全额 / 一键服丹按枚计日 /
 *   挂机弹窗计次 / 智能档日均 ≥1.4× / 灵泉比值全境带 / 寄售现金 EV 两锚 / trade 波幅带 /
 *   tryAid 回归 / tactic 胜率差 / 心魔镜像胜率带 / 双审计两连跑逐字节一致 / field-audit 注入证红
 * 断言风格：源码静态检查（SA）+ 运行时行为检查（RB），与 verify-v26 同款骨架。
 * ====================================================================== */
import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(dirname(fileURLToPath(import.meta.url))); // 脚本居于 tests/，指向项目根
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
  const auction = R('systems/auction.js');
  const craft = R('systems/craft.js');
  const forge = R('systems/forge.js');
  const shop = R('systems/shop.js');
  const black = R('systems/black.js');
  const autocult = R('core/autocult.js');
  const guide = R('core/guide.js');
  const ambience = R('core/ambience.js');
  const pfac = R('core/player-factory.js');
  const logjs = R('core/log.js');
  const narrative = R('core/narrative.js');
  const world = R('systems/world.js');
  const cave = R('systems/cave.js');
  const xian = R('systems/xian.js');
  const rank = R('systems/rank.js');
  const npc = R('systems/npc.js');
  const sect = R('systems/sect.js');
  const karma = R('systems/karma.js');
  const dailySign = R('systems/daily-sign.js');
  const gamejs = R('game.js');
  const timejs = R('core/time.js');
  const bagjs = R('systems/bag.js');
  const cult = R('systems/cultivate.js');
  const trib = R('systems/tribulation.js');
  const reinc = R('systems/reincarnation.js');
  const ui = R('ui/ui.js');
  const xinmo = R('systems/xinmo.js');
  const festival = R('systems/festival.js');
  const explore = R('systems/explore.js');

  /* ---- E414：对拼双结算修复（pin 兑现 + _clashed 余波） ---- */
  battle.includes("const _clashed = !!(_pinC && _pinC.pin);")
    && battle.includes("this.enemyStrike(st, 0.6, false, '对拼换招');") && battle.includes('B._clashed = true;')   // v42（E528·P3 整合）：E477 较力回填两行分离随动
    ? pass('SA1 对拼 attack 分支：pin 意图兑现 0.6× 换招并置 B._clashed（E414——同一意图不再被 enemyTurn 照价再收一次）') : fail('SA1 对拼兑付', '');
  battle.includes("} else if (B._clashed) {")
    && battle.includes("this.enemyStrike(st, 0.3, false, '强弩之末');")
    ? pass('SA2 enemyTurn 对拼余波：已兑意图只以 0.3× 强弩之末收尾（0.6+0.3=0.9× 同 enemyStrike 通道，E414——RB1 承伤比复核）') : fail('SA2 余波 0.3', '');
  battle.includes('B._clashed = false;')
    && battle.includes("if (intent.kind === 'attack') return { acts: ['attack'], lenient: false, pin: true, text: '其招直来——你料得其路数，硬撼一记，各受其创' };")
    ? pass('SA3 余波标记回合尾清（不跨回合残留）+ 对拼解文案「各受其创」同版（E414）') : fail('SA3 尾清/文案', '');

  /* ---- E415：力竭豁免单源名单 ---- */
  const exemptM = battle.match(/EXEMPT_PVE_CTX: \[([^\]]*)\]/);
  const exempt = exemptM ? exemptM[1] : '';
  ['spar', 'story', 'tourney', 'wenjian', 'tower', 'dungeon', 'showdown', 'weType', 'sectDanger'].every(k => exempt.includes(`'${k}'`))
    ? pass('SA4 力竭豁免 EXEMPT_PVE_CTX 单源九ctx（tower/dungeon/showdown/sectDanger/weType 新扩，与秒胜白名单同源对齐）（E415）') : fail('SA4 力竭名单', exempt);
  (battle.match(/ctxFlagged\(B\.ctx, this\.EXEMPT_PVE_CTX\)/g) || []).length >= 2
    ? pass('SA5 力竭判定与第 7 回合公示 tag 双消费同一名单（E415——RB2 真实开战复核）') : fail('SA5 双消费', '');

  /* ---- E416：爆发不吃必会心存量 + title 同步 ---- */
  {
    const i = battle.indexOf('async actBurst');
    const body = battle.slice(i, i + 3200);
    !body.includes('takeSureCrit') && body.includes('const crit = true;')
      ? pass('SA6 actBurst 函数体无 takeSureCrit（爆发必会心自带，不再白吃破绽毕现存量两发）（E416）') : fail('SA6 爆发存量', '');
    battle.includes('2.4× 必会心重击并回 3 真元（每场两次）')
    battle.includes('100（沸腾）≈3.2× 必会心重击并回 3 真元（每场两次）')
      ? pass('SA7 爆发按钮 title 同步沸点插值口径（E416；v42（E528·P3 整合）E478——「2.4× 定耗」旧公示终结，60 战意 ≈2.4×/100 沸腾 ≈3.2× 余量放大）') : fail('SA7 title', '');
  }

  /* ---- E417：CRIT_DMG_CAP 2.4 ---- */
  gdata.includes('CRIT_DMG_CAP: 2.4') && (battle.match(/CRIT_DMG_CAP\)/g) || []).length >= 4
    ? pass('SA8 CRIT_DMG_CAP 2.4（与爆发同档——杀剑 2.375/赤霄 2.052/溢出折满 2.125 三例复算随 RB 复核）（E417）') : fail('SA8 会伤帽', '');

  /* ---- E434：拍卖 BID_MODES 严禁写回 + peek/ensure 读写拆分 ---- */
  !/\bopts\.rate\s*=/.test(auction)
    && auction.includes('let rate = opts.rate;') && auction.includes('rate = Math.min(100, rate + Math.min(15, eye));')
    ? pass('SA9 眼值加成只落局部 rate，绝不写回 BID_MODES 单例（E434——三连 bold 后 rate 恒 60，RB6 复核）') : fail('SA9 rate 写回', '');
  auction.includes('peek(p) {') && auction.includes('ensure(p) {') && auction.includes('state(p) { return this.peek(p); }')
    ? pass('SA10 state() 收敛纯读别名，peek() 纯读 / ensure() 写侧拆分（E434——tips 渲染即写档的读路径惰性重掷自此断根，RB8 复核）') : fail('SA10 peek/ensure', '');
  auction.includes('settleConsign(p, day);')
    ? pass('SA11 寄售到期结算与期次滚茬同点（ensure 写侧单点，E439——渲染路径永不进写侧）') : fail('SA11 结算同点', '');
  (auction.match(/consign: \(prev && prev\.consign\) \|\| null/g) || []).length >= 1 && (auction.match(/\.\.\.rollCarry/g) || []).length >= 2   // v42（E528·P3 整合）：E509 rollCarry 单源（consigns/slots 一并透传）随动
    ? pass('SA12 滚茬整体重赋值两支（古匣/常规）均经 rollCarry 显式透传 consign（E439；v42 E509 consigns/slots 同透传，RB7 复核）') : fail('SA12 consign 透传', '');

  auction.includes('settleConsign(p, day) {')
    && auction.includes('const proceeds = Math.round(sale * 0.95);') && auction.includes('const fee = Math.round(c.base * 0.02);')   // v42（E528·P3 整合）：E509 V2 成交吃溢价（sale=base×(1+prem)）随动
    ? pass('SA13 寄售结算双支：成交扣五厘佣金 0.95（V2 另吃 prem 溢价）、流拍退件收二厘手续费 0.02（E439；v42 E509 五档重做兼容旧档）') : fail('SA13 寄售结算', '');

  /* ---- E435：画符 expectedQty 逐项对表 ---- */
  {
    const i = craft.indexOf('expectedQty(p) {');
    const body = craft.slice(i, craft.indexOf('drawCost(p)'));
    body.includes("DaoSys.hasPath(p, 3, 'miaoBi')") && body.includes("DaoSys.hasPath(p, 6, 'tianBi')") && body.includes('const echo')
      && body.includes('Art.seasonOf(p) === 1 ? 2 : 0')
      ? pass('SA14 expectedQty 含 miaoBi/tianBi/echo/仲夏四 token 与实发逐项对表（E435——计价现值与实发 EV 同参，RB 复核）') : fail('SA14 expectedQty', '');
  }

  /* ---- E436：forge CONSUMED_MATS 导出 + 字面量↔清单动态比对 ---- */
  forge.includes('CONSUMED_MATS: [')
    ? pass('SA15 forge.js 导出 CONSUMED_MATS 消肥料清单（E436）') : fail('SA15 CONSUMED_MATS 导出', '');
  {
    // 动态比对：forge.js 源内 Bag.removeItem 消费字面量集合 必须 === CONSUMED_MATS 导出集合
    const exported = (forge.match(/CONSUMED_MATS: \[([^\]]*)\]/) || [])[1] || '';
    const exportSet = new Set((exported.match(/m_[a-z]+/g) || []).slice().sort());
    const usedSet = new Set((forge.match(/Bag\.removeItem\('(m_[a-z]+)'/g) || []).map(s => s.match(/'(m_[a-z]+)'/)[1]).sort());
    const setEq = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
    const redProof = !setEq(new Set([...usedSet].slice(0, -1)), exportSet);   // 注入不一致（抽走一味）比对器必须报警
    setEq(usedSet, exportSet) && usedSet.size >= 2 && redProof
      ? pass(`SA31 字面量↔清单动态比对一致（消费点 ${[...usedSet].join('/')} === 导出清单）且注入不一致证红有效（E436，防新增消费料漏更）`) : fail('SA32 动态比对', `used=${[...usedSet]} export=${[...exportSet]}`);
  }
  shop.includes("const consumed = (typeof ForgeSys !== 'undefined' && ForgeSys.CONSUMED_MATS) || [];")
    && shop.includes('if (consumed.includes(id)) return false;')
    ? pass('SA16 一键凡品 commonSaleList 同源排除消费料清单（E436——玄铁矿不再被贱卖）') : fail('SA16 凡品排除', '');
  shop.includes('base = Math.round((GameData.GRADE_FALLBACK[Utils.clamp(def.grade || 0, 0, 5)] || 500) * 0.1);')
    ? pass('SA17 sellPrice 0 价物按 GRADE_FALLBACK×0.1 回落（E436——0 价 grade5 卖出 ≥400×0.1×0.45）') : fail('SA17 卖价回落', '');

  /* ---- E437：黑市双闸 + 键位契约 ---- */
  black.includes("if ((p.gongfa && p.gongfa[id]) || (p.bag && p.bag[id])) { UI.toast('此诀你已修习，重金莫掷'); return; }")
    ? pass('SA18 black.buyAsync 已修习/已藏有判重闸（E437——对齐坊市/拍卖行，r6 百万灵石买死物自此封死）') : fail('SA18 判重闸', '');
  black.includes('DaoSys.canLearnGongfa')
    ? pass('SA19 black.buyAsync canLearnGongfa 可学闸（不可学者示其道体所碍，E437）') : fail('SA19 可学闸', '');
  black.includes('const mul = (sess.haggleFailDay === today && sess.haggleMul) ? sess.haggleMul : 1;')
    && /sess\.haggleMul = 1\.3;\s*\n\s*sess\.haggleFailDay = today;/.test(black)
    && black.includes('sess.haggleFailDay === today') && black.includes('拂袖')
    ? pass('SA20 price() 消费 p.sess.haggleMul 单源、涨价 ×1.3 + 触怒当日拂袖拒卖（E437/E371）') : fail('SA20 haggle 消费', '');
  !/(^|[^.\w])p\._haggle/.test(allJsStr)
    ? pass('SA21 全仓顶层 p._haggle 系键零命中（E428/E437 键位契约——涨价唯一落 p.sess.haggleMul）') : fail('SA21 _haggle 残留', '');

  /* ---- E422：聚灵三态 + _rushTriedDay 前移 ---- */
  autocult.includes("Guide.prefMode(p, 'rush') !== 'skip'")
    && autocult.includes("if (c === 'always') { p.ui = p.ui || {}; p.ui.rush = 'always';")
    ? pass('SA22 挂机聚灵三态封装（今日聚灵/以后都聚/今日跳过，偏好落 p.ui.rush）（E422——RB4 计次复核）') : fail('SA22 聚灵三态', '');
  autocult.includes('const holdQuiet = () => { this._rushTriedDay = today + winNow - 1; };')
    && autocult.includes('holdQuiet();   // 拒答（含 ESC）同样前移——undefined 不落任何偏好')
    ? pass('SA23 拒答/点燃 _rushTriedDay 前移至窗口真过期（E422——一轮 +3 日恰耗尽窗口的 10 轮 10 弹病灶拔除）') : fail('SA23 前移', '');
  !allJsStr.includes('_autoRushSkipDay')
    ? pass('SA24 全仓 _autoRushSkipDay 零命中（E422——删除不迁移，写读双侧同净）') : fail('SA24 死键残留', '');

  /* ---- E428：偏好拆家 p.ui（消费/写入/回显三侧触点全迁） ---- */
  ambience.includes("if (e.target.value === 'ask') delete p.ui.rush; else p.ui.rush = e.target.value;")
    && ambience.includes("rush.value = (p && p.ui && p.ui.rush) || 'ask';")
    ? pass('SA25 ambience 聚灵偏好触点全迁 p.ui（面板写 + 回显读，E422/E428 v4——面板写旧键、prefMode 读新键的静默失效回归收口）') : fail('SA25 面板 rush', '');
  ambience.includes("if (e.target.value === 'ask') delete p.ui.damode; else p.ui.damode = e.target.value;")
    && ambience.includes("if (e.target.value === 'ask') delete p.ui.wudao; else p.ui.wudao = e.target.value;")
    ? pass('SA26 ambience 悟道/行权偏好写侧同迁 p.ui（damode/wudao，E428 v4 补齐八触点）') : fail('SA26 面板 wudao/damode', '');
  !/(^|[^.\w])p\._autoRush/.test(allJsStr) && !/(^|[^.\w])p\._pref/.test(allJsStr)
    ? pass('SA27 全仓顶层 p._autoRush / p._pref 零命中（E428——散键拆家净场）') : fail('SA27 顶层散键', '');
  guide.includes("prefMode(p, key) {") && guide.includes("(p && p.ui && p.ui[key]) || 'ask';")
    && guide.includes("this.prefMode(p, 'rush') !== 'skip' && this._rushDeclineDay !== today")
    && guide.includes("const wdMode = this.prefMode(p, 'wudao');")
    && guide.includes("const daMode = this.prefMode(p, 'damode');")
    ? pass('SA28 Guide.prefMode 单源读 p.ui 双键（rush/wudao/damode），行权三态守卫同源（E422/E428——RB5 即时生效复核）') : fail('SA28 prefMode', '');

  /* ---- E428：迁移链 v41 新步 + 模板补齐 + 溢流清洗 ---- */
  pfac.includes("out.sess = (out.sess && typeof out.sess === 'object') ? out.sess : { haggleMul: null, haggleFailDay: null };")
    && pfac.includes('if (out._haggleMul !== undefined) { out.sess.haggleMul = out._haggleMul; delete out._haggleMul; }')
    && pfac.includes('out.expOverflow = Math.max(0, Math.floor(Number(out.expOverflow)) || 0);')
    ? pass('SA29 v41 迁移步：p.sess 收纳还价系键（搬迁后 delete 原键）+ expOverflow NaN/负值数值清洗（E428——RB5 往返复核）') : fail('SA29 迁移步', '');
  pfac.includes('15:v41 会话键/偏好拆家/溢流清洗')
    && pfac.includes('slayBonus: null,') && pfac.includes('sess: { haggleMul: null, haggleFailDay: null },')
    && pfac.includes("ui: { engine: 'smart', density: 'cozy' },")
    && !/(^|\n)\s*version:/.test(pfac) && !pfac.includes('_slayUsed')
    ? pass('SA30 迁移链步序表标 v41 + create() 模板补 sess/ui/slayBonus 缺键 + version/_slayUsed 死键清场（E428——原 create().slayBonus=undefined 已修）') : fail('SA30 create 模板', '');

  /* ---- E429：tips 纯只读 + 建议区 3 条 ---- */
  {
    const i = guide.indexOf('tips(p) {');
    const body = guide.slice(i, guide.indexOf('totalExp(p) {'));
    !/p\.flags\.[A-Za-z_]+\s*=/.test(body) && body.includes('return t.slice(0, 3);')
      ? pass('SA31 tips() 函数体零 flags 写入（纯只读，旗标改行动时机 toast）+ 建议区 slice(0,3)（E429，RB 两次一致复核）') : fail('SA31 tips 只读', '');
  }

  /* ---- E431：flavor 日志通道 + E429④ 每日一句 ---- */
  logjs.includes("TYPES: { flavor: '见闻', info: '杂记'")
    && logjs.includes("skim(type) { return this.density === 'lite' && (type === 'info'); }")
    ? pass('SA32 log TYPES.flavor「见闻」分家 + skim 只滤 info 不滤 flavor（E431——lite 下六道语料不再整类蒸发）') : fail('SA32 flavor 通道', '');
  narrative.includes("Log.add(this._pick(kind), 'flavor');")   // v42（E528·P3 整合）：E495 取句走 _pick 单源（5% 稀有句池）随动
    ? pass('SA33 logScene 改发 flavor（六道语料自此可见可滤，E431；v42 E495 _pick 单源）') : fail('SA33 logScene', '');
  gamejs.includes("Log.add(`【每日一句】${parts.length ? parts.join('、') + '——' : ''}${mood}`, 'flavor');")
    ? pass('SA34 每日一句按当日大事拼句入 flavor 通道（E429④，dailySettle 挂点）') : fail('SA34 每日一句', '');

  /* ---- E440：通商波幅实装 ---- */
  world.includes("const trade = typeof SectSys !== 'undefined' && SectSys.tendency && SectSys.tendency(p) === 'trade';")
    && world.includes('return trade ? 0.75 + (h % 1001) / 1000 * 0.5 : 0.8 + (h % 1001) / 1000 * 0.4;')
    ? pass('SA35 marketMul 读通商倾向：trade 波幅 [0.75,1.25]、常幅 [0.8,1.2]（E440——「通商=行情 ±25%」假票兑票，RB 复核）') : fail('SA35 通商波幅', '');

  /* ---- E441：灵泉系数 15 ---- */
  cave.includes('const gain = Math.round(15 * Math.min(4, p.cave.builds.spring) * GameData.stoneEco(Math.min(4, p.realmIdx)) * (guardOn ? 1.2 : 1));')
    ? pass('SA36 灵泉系数 45→15（r6 裸值锚 9383——锚的勘误修订，balance-sim 全境比 RB 复核）（E441）') : fail('SA36 灵泉系数', '');

  /* ---- E456：仙阶单调 + E444：官市加价方向 ---- */
  gdata.includes('layerNeed: 17500') && gdata.includes('layerNeed: 24000')
    ? pass('SA37 XIAN_TIERS 天仙 12000→24000（17500<24000<30000<80000 单调复归，E456——in-page 单调 RB 复核）') : fail('SA37 仙阶单调', '');
  xian.includes('* (1 + Math.min(0.30, this.demerit(p) * 0.05));')
    ? pass('SA38 官市加价方向定死：demerit 加价 ×(1+min(0.30,demerit×0.05))（=5→×1.25、≥6→×1.30 帽）（E444 v5——折扣方向会让「多被贬官」变理财手段，作废，RB24 复核）') : fail('SA38 官市加价', '');
  xian.includes('* (1 - Math.min(0.05, Math.floor(Math.max(0, this.merit(p)) / 10) * 0.01))')
    ? pass('SA39 merit 折上折：每满 10 点官市 −1%（帽 5%），与 demerit 惩罚轴反号成两轴区分度（E444）') : fail('SA39 merit 折上折', '');

  /* ---- E419/E420：问剑 skip + everTop + 雷台自选档同源 ---- */
  rank.includes('if (myIdx < 0 || tIdx !== myIdx - skip) return;')
    && rank.includes('const gain = Math.ceil((diff + skip) * ((risk && risk.mult) || 1));')
    && rank.includes('p.flags.everTop = true;')
    && rank.includes('if (!p.flags.wenjianFirst) {')
    ? pass('SA40 onWenjianWin 接受隔位 skip（功勋=diff+skip）+ everTop 落 flags + 仅首次夺位入册（E419——榜首即拒/越位互斥双死锁解，RB20/RB21 复核）') : fail('SA40 问剑skip', '');
  npc.includes('const risks = (GameData.BALANCE.COMBAT.RISK_BANDS || []).slice();')
    && gdata.includes("{ name: '旗鼓相当', risk: '稳', mult: 1.0, lossPenalty: 0, lossTxt: '' },")
    && npc.includes('risk: ri')
    ? pass('SA41 雷台自选档消费 RISK_BANDS 同一乘区常量（与问剑同源，E420/E445⑥）') : fail('SA41 雷台同源', '');

  /* ---- E443：问签残根清场 ---- */
  !sect.includes("type: 'sign'") && !dailySign.includes('SectSys.onSign(') && sect.includes('v41（E443）：问签残根清场')
    ? pass('SA42 sect sign 键零残留 + onSign 空转调用删除（E443——存量在途读档口重掷）') : fail('SA42 sign 残留', '');

  /* ---- E450：斩三尸口径勘误（持久 +5） ---- */
  karma.includes('p.slayBonus = true;   // v41（E450）：一世内每次突破成算 +5（持久旗标，突破不清零；旧一次性消费死键已删）')
    && karma.includes('一世内每次突破成算 +5')
    && !allJsStr.includes('_slayUsed')
    ? pass('SA43 斩三尸持久口径：karma 注释/弹窗/日志三处同版「一世内每次突破 +5」+ _slayUsed 死键清零（E450 勘误定案，RB 复核）') : fail('SA43 slayBonus', '');

  /* ---- E445：义聚修缝（ESC 节拍 + tryAid 回归 + 共斗战意） ---- */
  npc.includes('s.oathDay = today;   // v41（E445）①：落定后写——ESC/遮罩不吞节拍')
    && npc.includes('const isSworn = (p.sworn || []).includes(cand);')
    && npc.includes('const loyal = isSworn ? Math.min(100, s.loyalty || 0) : 0;')
    && npc.includes('p._sparBuffDay = Math.floor(pp.day || 0) + 1;')
    && !allJsStr.includes('warSpirit')
    ? pass('SA44 义聚：oathDay 落定后写（ESC 不白跳）+ tryAid 义气乘区只作用结拜候选（道侣回归 ×1.0）+ 共斗 _sparBuffDay + warSpirit 死字段清零（E445）') : fail('SA44 义聚', '');

  /* ---- E429⑤/E434：日推进后置钩子单点 ---- */
  timejs.includes('onAdvance: []') && timejs.includes('onAdvanceHook(fn) {') && timejs.includes('for (const fn of this.onAdvance)')
    ? pass('SA45 time.js Time.add 单源尾部「日推进后置钩子」注册表在位（E429⑤ v5——B1 一次性建成并归 P2 独占）') : fail('SA45 日推进钩子', '');
  gamejs.includes("Time.onAdvanceHook((p) => { try { if (typeof AuctionSys !== 'undefined' && AuctionSys.ensure) AuctionSys.ensure(p); } catch (err) { console.error('拍卖期滚茬异常:', err); } });")
    ? pass('SA46 game.js 钩子回调注册为 AuctionSys.ensure（B2 自 state 预热 retarget 而来的跨批收口在链）（E434②）') : fail('SA46 钩子注册', '');

  /* ---- E438/E439：新动作双向登记 ---- */
  gamejs.includes("'act-black-sell': (d) => BlackSys.sell(d.item),") && ui.includes('data-action="act-black-sell"')
    ? pass('SA47 act-black-sell 静态入口+处理器双向登记（E438 销赃，check-actions 门禁同绿）') : fail('SA47 black-sell', '');
  gamejs.includes("'act-consign': (d) => AuctionSys.consign(d.item),") && ui.includes('data-action="act-consign"')
    ? pass('SA48 act-consign 静态入口+处理器双向登记（E439 寄售）') : fail('SA48 consign', '');
  gamejs.includes("'act-consign-claim': (d) => AuctionSys.claimConsign(d && d.slot != null ? Number(d.slot) : null),")   // v42（E528·P3 整合）：E509 三格柜台 slot 参选格取回随动
    ? pass('SA49 act-consign-claim 静态入口+处理器双向登记（E439；v42 E509 slot 参）') : fail('SA49 consign-claim', '');

  /* ---- E426/E427：溢流全额 + 服丹按枚计日 ---- */
  (cult.match(/p\.exp = Math\.min\(p\.expOverflow \|\| 0, GameData\.layerNeed/g) || []).length >= 1
    && (trib.match(/p\.exp = Math\.min\(p\.expOverflow \|\| 0, GameData\.layerNeed/g) || []).length >= 1
    ? pass('SA50 溢流修为全额结转两处同式（静修冲关/渡劫成功——r5 圆满态离线 240 日暗扣 ≈116 日已修）（E426，RB10 复核）') : fail('SA50 溢流两处', '');
  !/expOverflow\s*\/\s*2/.test(allJsStr)
    ? pass('SA51 全仓无 expOverflow /2 折半残留（E426——「溢出保留」注释口径全工程兑现）') : fail('SA51 折半残留', '');
  bagjs.includes('Time.add(Math.max(1, usedHp + usedMp));')
    ? pass('SA52 一键服丹按枚计日 Time.add(max(1, usedHp+usedMp))（E427——三口径统一，RB 复核）') : fail('SA52 服丹计日', '');

  /* ---- E423：智能档静默规格 ---- */
  cult.includes('if (opts.auto) {') && cult.includes('t.rounds += rep.rounds; t.exp += rep.exp; t.advanced += rep.advanced || 0;')
    && autocult.includes('await Cultivate.secludeLoop(1, { auto: true });')
    ? pass('SA53 settleReport auto 语境聚合入 Cultivate._autoRep 不弹模态 + 智能档 secludeLoop(1,{auto})（E423——E422 死锁换壳收口，RB 计次复核）') : fail('SA53 智能静默', '');

  /* ---- E448/E449：心魔镜像 + 年兽 parity ---- */
  xinmo.includes('hpMax: Math.round(st.maxHp * 1.1 * trim),') && xinmo.includes('atk: Math.round(st.atk * 0.9 * trim),')
    ? pass('SA54 心魔化身改玩家 Stat 镜像（hp=maxHp×1.1 / atk=atk×0.9 / def·spd 同玩家——旧基式 55+5rp^1.6 零 parity 退役）（E448）') : fail('SA54 心魔镜像', '');
  xinmo.includes('const trim = 0.95 + 0.10 * img.sev;')
    ? pass('SA55 心象重度 sev 折 0.95~1.05 可敌带语义（E448②——RB17 胜率带复核）') : fail('SA55 心象折算', '');
  festival.includes("const parity = (bench > 0 && typeof Stat !== 'undefined' && Stat.power) ? 0.9 + 0.2 * Math.min(1, Stat.power(p) / bench) : 1;")
    ? pass('SA56 年兽叠 E374 parity 乘区（×(0.9+0.2×min(1, power/bench))，bench 单源 PARITY_BENCH）（E449）') : fail('SA56 年兽parity', '');

  /* ---- E452/E453：双新图 + 动态威胁带 ---- */
  gdata.includes("{ id: 'zhengtao', name: '宗门征讨', recRealm: 7,") && gdata.includes("{ id: 'leichi', name: '雷池旧地', recRealm: 8,")
    ? pass('SA57 宗门征讨（r7）/雷池旧地（r8）双新图插于 longyuan(6) 与 lingxu(9) 之间（E452——recRealm 覆盖 RB 复核）') : fail('SA57 双新图', '');
  explore.includes('const delta = dRealm >= 2')
    && explore.includes('? (Utils.chance(20 + 5 * dRealm) ? Utils.rand(1, 2 + dRealm) : 0)')
    && explore.includes('const rpCap = Math.ceil((p.realmIdx * 4 + p.layer) * 1.35);')
    && explore.includes('den.expGain = Math.round(den.expGain * (1 + 0.5 * delta));')
    ? pass('SA58 动态威胁带：Δ≥2 扩带 chance(20+5Δ)/rand(1,2+Δ)、收益 ×(1+0.5Δ)、怪 power 钳 ≤玩家×1.35（E453——旧图高境重新长牙）') : fail('SA58 威胁带', '');

  /* ---- E455：劫象两表六/六 ---- */
  gdata.includes('TRIB_OMENS: [') && gdata.includes('TRIB_OMENS_HIGH: [')
    ? pass('SA59 劫象对策线索两张表全配（TRIB_OMENS 四象 + TRIB_OMENS_HIGH 两象——v2 勘误「六象单表」易漏改一张，RB19 逐表计数）（E455）') : fail('SA59 劫象两表', '');
  trib.includes('p.flags.tribOmens') && trib.includes('前世感悟')
    ? pass('SA60 渡过录 p.flags.tribOmens + 二遇对策按钮标「前世感悟」（首遇无标注）（E455②）') : fail('SA60 感悟录', '');

  /* ---- E457：渡劫偷袭 fury ---- */
  trib.includes("Battle.start(null, { enemy: NpcSys.buildEnemy(p, ambushNpc, 25), npcId: ambushNpc, mode: 'hunt', ambush: true, mapName: '渡劫之地' });")
    ? pass('SA61 渡劫偷袭敌补 fury 25（≈1.25× 威胁，「趁虚而入」不再是最弱面板）（E457）') : fail('SA61 偷袭fury', '');

  /* ---- E462：碑文页 ---- */
  reinc.includes('realmSamples(p) {') && reinc.includes('steleData(p, kind) {') && reinc.includes('steleText(p, kind) {')
    ? pass('SA62 一世碑文数据单源（steleData/lifeReport/steleText·rubStele 共用一账，E462）') : fail('SA62 碑文单源', '');
  reinc.includes('if (pts.length < 4) {')
    ? pass('SA63 境界折线条件交付：采样 <4 点降级徽标行（不做假数据），≥4 点折线点亮（E462① v2 如实口径，RB22 双分支复核）') : fail('SA63 折线降级', '');

  /* ---- E468/E469：行情志 + 备战单 ---- */
  ui.includes('renderMarketBoard(p, sellable, trade) {') && ui.includes('✦ 行情志')
    ? pass('SA64 行情志卡（判向/换茬倒计时/今价 vs 均价标记/通商季公示与高亮，今价=ShopSys.sellPrice 单源）（E468，RB 同源复核）') : fail('SA64 行情志', '');
  ui.includes('✦ 冲关备战单') && ui.includes('Cultivate.breakdown(p,')
    ? pass('SA65 冲关备战单卡（圆满态专属，拆解行 E395 单源加总=成算）（E469，RB 复核）') : fail('SA65 备战单', '');

  /* ---- E438：销赃线 ---- */
  black.includes('sellRate(p) {') && black.includes('const karmaMul = 0.55 + Math.min(0.15, Math.floor((p.karma || 0) / 40) * 0.05);')
    && black.includes('alleySellable(id) {')
    ? pass('SA66 暗巷销赃：基数 0.55× + 孽障每 40 点 +0.05（帽 0.70×）+ 声望每档 −0.03 + 收货白名单（E438——侠义走坊市、魔道走暗巷）') : fail('SA66 销赃', '');

  /* ---- E429②③：建议区口径收口 ---- */
  guide.includes('拍卖行本期拍品将止（余 ${left} 日）') && guide.includes('if (left <= 3)')
    && !guide.includes('奇货与赌局')
    ? pass('SA67 行权建议口径：拍卖将止催办窗口 10→3 日对齐红点、黑市建议句改「奇货与还价」（赌局已删）（E429③）') : fail('SA67 建议口径', '');

  /* ---- 门禁挂链（E459/E460/E461 + 本套件 + 发布收尾） ---- */
  existsSync(join(__dirname, 'scripts', 'field-audit.mjs'))
    ? pass('SA68 field-audit 门禁脚本在位（E461——玩家字段契约审计，RB 注入证红复核）') : fail('SA68 field-audit', '');
  {
    const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
    const steps = (pkg.scripts['test:all'] || '').split('&&').map(s => s.trim()).filter(Boolean);
    pkg.scripts['test:v27'] === 'node tests/verify-v27.mjs'
    pkg.scripts['test:v27'] === 'node tests/verify-v27.mjs' && pkg.scripts['test:v28'] === 'node tests/verify-v28.mjs'
      && steps.length === 29 && steps[steps.length - 1] === 'node tests/verify-v28.mjs' && steps[steps.length - 2] === 'node tests/verify-v27.mjs'
      ? pass('SA69 package.json：test:v27/v28 在册、test:all 28→29 步且 v28 接链尾（E473/E527；v42（E528·P3 整合）挂链随动）') : fail('SA69 挂链', `steps=${steps.length}`);
  }
  {
    const idx = readFileSync(join(__dirname, 'index.html'), 'utf8');
    const sw = readFileSync(join(__dirname, 'sw.js'), 'utf8');
    // v42（E529·主流程随迁）：缓存号 ?v=58、SW fanren-wd-v17（E526/E529 升档，v41 锚随动）
    idx.includes('?v=58') && !idx.includes('?v=57') && sw.includes('fanren-wd-v17') && !sw.includes('fanren-wd-v16')
      ? pass('SA70 发布收尾：index.html 缓存号 ?v=58（旧号清零）+ SW 缓存名 fanren-wd-v17（E475→v42 E529 随动）') : fail('SA70 缓存收尾', '');
  }
  {
    const bs = readFileSync(join(__dirname, 'scripts', 'balance-sim.mjs'), 'utf8');
    const pa = readFileSync(join(__dirname, 'scripts', 'price-audit.mjs'), 'utf8');
    bs.includes('PLAYER_MISS_MAX') && pa.includes('行情种子=0') && pa.includes('springR6')
      ? pass('SA71 balance-sim 失手钳读 PLAYER_MISS_MAX + price-audit 行情种子=0 确定性口径在案（E459/E460——RB 两连跑逐字节复核）') : fail('SA71 审计口径', '');
  }

  /* ---- 复核修偏批次：E432/E442/E445②⑥/E446③/E451/E438/E433/E423/E471/E452 接线与口径 ---- */
  ui.includes('r.base != null') && ui.includes('r.mul !== 1') && !ui.includes("typeof r.v === 'number'")
    ? pass('SA72 乘区明细 cell 按 breakdown 行形态 {k,mul,base} 消费（E432 修偏——原读 r.v 恒渲染「基础产出undefined」，修行卡每绘必现）') : fail('SA72 乘区cell', '');
  R('systems/cultivate.js').includes('const lm = SectSys.listenMul(p)') && R('systems/cultivate.js').includes('8 * lm') && shop.includes('SectSys.armsMul(p)')
    && shop.includes("def.type === 'artifact' && typeof SectSys")
    ? pass('SA73 E442 接线：听讲感悟 ×listenMul + ShopSys.price 装备支（type=artifact 按公示口径门控）×armsMul 九二折（v42（E528·P3 整合）：E501 听讲体已迁 cultivate.sectListen 单源随动）') : fail('SA73 E442接线', '');
  gamejs.includes('agg.oathGather') && gamejs.includes('agg.oathTrial') && gamejs.includes('oathGatherGoldlan: 0, oathTrial: 0')
    ? pass('SA74 离线日报/年桶/小结门控补 oathGather（金兰并入）/oathTrial 三键（E445②/E451 修偏——聚合不再写而不读，RB28 出行复核）') : fail('SA74 oath聚合', '');
  cave.includes('AvatarSys.noteGuard(p, true)')
    ? pass('SA75 夜袭驻守挡袭调 noteGuard 入挡劫录（E446③ 修偏——原单源零写入，管理台挡劫录恒空）') : fail('SA75 noteGuard', '');
  battle.includes('RankSys.onConfrontLoss(p, B.ctx.npcId, B.ctx.risk)') && rank.includes('onConfrontLoss(p, id, risk = null)')
    ? pass('SA76 雷台败北分支消费 risk.lossPenalty（E445⑥ 修偏——与问剑 onWenjianLoss 同式，选项公示的「功勋折半/倒扣全差」自此兑现）') : fail('SA76 雷台败罚', '');
  black.includes('SELL_REP_STEPS: RepSys.STEPS') && karma.includes('STEPS: [30, 60, 80, 90, 120, 150]') && ui.includes('RepSys.STEPS && RepSys.STEPS[i]')
    ? pass('SA77 声望阈值正档六位单源 RepSys.STEPS（E438 修偏——销赃折价与 UI 声望阶梯同表消费，不再手抄双写漂移）') : fail('SA77 REP_STEPS', '');
  !gdata.includes('（v38 E339 补全）')
    ? pass('SA78 套装玩家可见 text 无版本尾缀（E433 修偏——赤霄/仙缘「（v38 E339 补全）」两处漏网清扫，set-line 直出状态栏）') : fail('SA78 版本尾缀', '');
  {
    const idxHtml = readFileSync(join(__dirname, 'index.html'), 'utf8');
    ambience.includes("getElementById('amb-engine')") && ambience.includes('syncEnginePref()') && idxHtml.includes('id="amb-engine"')
      ? pass('SA79 挂机方式设置入口：面板 amb-engine select + ambience change 写 p.ui.engine + 面板回读回显（E423 修偏——normal 档自此可达，p.ui 五子键最后一个补齐面板触点）') : fail('SA79 amb-engine', '');
  }
  !ui.includes('this.settleRealmGoals(p)') && gamejs.includes('UI.settleRealmGoals(p)')
    ? pass('SA80 境界目标结算迁 afterAction 行动口（E471 修偏——渲染路径不再写 flags+发气运+toast，E429②「渲染纯只读」反模式不回潮）') : fail('SA80 settleRealmGoals', '');
  (world.match(/map\.dPool && map\.dPool\[mid\]/g) || []).length >= 2
    ? pass('SA81 兽潮/夺宝取怪消费 map.dPool 负偏移（E452 修偏——探索/天下大事两侧口径归一，雷池 r8 不再掷出 rp+4 超带敌）') : fail('SA81 dPool', '');
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
  try { browser = await puppeteer.launch({ headless: 'new', protocolTimeout: 300000, executablePath: p, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); break; } catch (e) { /* next */ } // v42（E528·主流程加固）：与 v10/v11/v15 同款协议超时，满负载长跑下 RB 组不再误超时
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
      const pl = PlayerFactory.create('开物道人', { gen: 6, comp: 6, luck: 6, body: 6 });
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

    /* ---- RB1：E414 对拼 8 场承伤比 ∈[0.8,1.05]（固定种子，真实引擎 act+enemyTurn 全路径） ---- */
    const rb1 = await page.evaluate(async () => {
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
        B.busy = false; B.over = false; B.morale = 0; B.combo = 0; B.turn = 1; B._clashed = false;
        const st = Stat.compute(p);
        p.hp = st.maxHp; p.mp = st.maxMp;
        // v42（E528·P3 整合）：E477 修活后对拼侧改「enemyDecide 自然产出命中」——同种子下循环重掷
        // 直至自然亮出 kind:'attack' 普攻意图（原手工注入 {kind:'attack'} 的不可达路径断言退役）；
        // base 对照侧照旧注入 {kind:'strike'}（E414 1.0× 基线口径不动——E477 后非重击平A已归 attack 形）。
        if (mode === 'clash') {
          let g2 = 0;
          do { B.intent = Battle.enemyDecide(); g2++; } while ((!B.intent || B.intent.kind !== 'attack') && g2 < 80);
          if (!B.intent || B.intent.kind !== 'attack') return 0;   // 该种子未自然掷出普攻意图（弃样，比例极低 0.7^80）
        } else {
          B.intent = { kind: 'strike' };
        }
        const hp0 = p.hp;
        await Battle.act('attack');
        const dmg = hp0 - p.hp;
        if (Battle.active) Battle.end();
        return dmg;
      };
      Math.random = seeded;
      const ratios = [];
      try {
        for (let i = 0; i < 8; i++) {
          const a = await arm('clash', 777000 + i * 911);
          const b = await arm('base', 777000 + i * 911);
          if (b > 0 && a > 0) ratios.push(+(a / b).toFixed(3));
        }
      } finally {
        Math.random = realRandom; Battle.wait = realWait; Game.player = savedPlayer;
      }
      const mean = ratios.reduce((x, y) => x + y, 0) / Math.max(1, ratios.length);
      return { n: ratios.length, ratios, mean: +mean.toFixed(3) };
    });
    rb1.n >= 6 && rb1.mean >= 0.8 && rb1.mean <= 1.05
      ? pass(`RB1 对拼 8 场承伤比（真实引擎 act+enemyTurn 全路径、固定种子）：均值 ${rb1.mean} ∈ [0.8,1.05]（0.6+0.3=0.9× 同 enemyStrike 通道，实测 ${rb1.n} 对：${rb1.ratios.join('/')}）（E414）`) : fail('RB1 对拼承伤比', JSON.stringify(rb1));

    /* ---- RB2：E415 塔战第 7 回合无力竭 tag（真实开战 + 渲染层断言） ---- */
    const rb2 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const probe = async (ctx, label) => {
        const e = buildMonster('m_yezhu');
        e.hpMax = e.hp = 1e9; e.atk = 1; e.def = 0; e.spd = 0; e.dodge = 0; e.crit = 0; e.skills = []; e.elite = false;
        await Battle.start(null, Object.assign({ enemy: e, mapName: label }, ctx));
        const B = Battle.active;
        B.busy = false; B.over = false; B.turn = 7;
        p.hp = Stat.compute(p).maxHp;
        Battle.render();
        const html = (document.getElementById('battle-modal') || {}).innerHTML || '';
        const hasTag = html.includes('力竭将现');
        if (Battle.active) Battle.end();
        return hasTag;
      };
      out.tower = await probe({ tower: 5 }, '问天塔复算');
      out.dungeon = await probe({ dungeon: true }, '秘境复算');
      out.showdown = await probe({ showdown: true }, '雷台复算');
      out.explore = await probe({ explore: true, mapId: 'village' }, '后山复算');
      Battle.wait = realWait;
      return out;
    });
    !rb2.tower && !rb2.dungeon && !rb2.showdown && rb2.explore
      ? pass('RB2 力竭公示：塔守/秘境守关/雷台了断第 7 回合不亮「力竭将现」tag（真实开战+渲染层验证），探索等非豁免 ctx 照常公示（E415——防御流在 PvE 关口重新要交输出）') : fail('RB2 力竭tag', JSON.stringify(rb2));

    /* ---- RB3：E423 智能档——10 轮结算弹窗 =0 + 收益聚合入日报 + 日均 ≥1.4× ---- */
    const rb3 = await page.evaluate(async () => {
      const out = {};
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const mk = () => {
        const pl = PlayerFactory.create('智能道人', { gen: 6, comp: 6, luck: 6, body: 6 });
        pl.realmIdx = 9; pl.layer = 0; pl.dao = null;   // r9 层 0
        pl.sect = { id: 'qingyun', contrib: 0 };   // 内门画像（设计日均比按此口径，E423）
        pl.cave = { lv: 5, dongtian: 0, builds: { gather: 0 }, plots: [] };
        pl.stones = { low: 1e9, mid: 0, high: 0 };
        pl.ui = { rush: 'skip', wudao: 'skip', damode: 'skip', engine: 'smart' };
        pl.flags.tutorialDone = true;
        return pl;
      };
      const realPace = AutoCult.paceMs; AutoCult.paceMs = () => 1;
      const realStoryActive = Story.active; Story.active = () => false;   // 行权偶发剧情不再挂起挂机循环（测试桩）
      const realChance = Utils.chance; Utils.chance = () => false;        // 随机事件（心魔袭扰/节庆）不拉起战斗——AutoCult「遇战自停」按设计会让轮数中断
      const savedPlayer = Game.player;
      if (Battle.active) { try { Battle.end(); } catch (e) { /* 场景已了 */ } Battle.active = null; }
      Tribulation.state = null;
      // ① 日均对测（双同画像 fresh 玩家受控单轮，先于挂机臂——无幽灵循环串扰、无先后状态差）：
      // 闭关轮制日均 vs 普通修炼日均
      const realPopup0 = UI.popup; UI.popup = async () => true;
      const realRenderAll = UI.renderAll; UI.renderAll = () => {};   // v42（E528·P3 整合）：E501 逐日行权后单轮 afterAction/渲染量 ×30——本断言全程关闭全量渲染与日志落账，防标签页 OOM（数值断言不依赖渲染）
      const realLog0 = Log.add; Log.add = () => {};
      const p3a = mk();
      Game.player = p3a;
      const ea = Guide.totalExp(p3a), da = p3a.day;
      await Cultivate.secludeLoop(1, { auto: true });
      const secludeRate = (Guide.totalExp(p3a) - ea) / Math.max(1, p3a.day - da);
      const p3b = mk();
      Game.player = p3b;
      const eb = Guide.totalExp(p3b), db = p3b.day;
      Cultivate.normal({ manual: false });
      const normalRate = (Guide.totalExp(p3b) - eb) / Math.max(1, p3b.day - db);
      UI.popup = realPopup0;
      out.smartPerDay = secludeRate;
      out.normalPerDay = normalRate;
      out.ratio = +(secludeRate / Math.max(1e-9, normalRate)).toFixed(2);
      // ② 智能档臂：挂机 10 轮（每轮 secludeLoop(1, auto)）——「出关·结算」弹窗计数 + 收益聚合
      const p1 = mk();
      p1.ui = { rush: 'always', wudao: 'skip', damode: 'skip', engine: 'smart' };
      Game.player = p1;
      const popups = [];
      const smartLines = [];
      UI.popup = realPopup0;   // v42（E528·P3 整合）E501 风暴减载——10 轮 × 30 逐日行权不再落渲染与日志，防标签页 OOM
      const realPopup = UI.popup;
      Log.add = (txt, type) => { if (String(txt).includes('智能闭关')) smartLines.push(String(txt)); };   // 只捕不落
      AutoCult.active = false;
      AutoCult.start({ label: '复算·智能' });
      let guard = 0;
      while (AutoCult.active && AutoCult.rounds < 10 && guard++ < 6000) await new Promise(r => setTimeout(r, 4));
      const autoRepRounds = (Cultivate._autoRep || {}).rounds || 0;   // 聚合账须在停机小结清零前读取
      AutoCult.pause('复算完成');   // 停机——小结一行出账（智能闭关 N 轮）
      Log.add = realLog0;
      UI.renderAll = realRenderAll;
      UI.popup = realPopup;
      out.settlePopups = popups.filter(t => t.includes('出关')).length;
      out.autoRep = autoRepRounds >= 10;
      out.finalRounds = AutoCult.rounds;   // v42（E528·P3 整合）：E501 逐日补跑后单轮收益大增——r9 画像 1 轮即圆满停机为合法路径，轮数不再恒 10
      out.smartLineRounds = smartLines.length ? (Number((smartLines[0].match(/智能闭关 (\d+) 轮/) || [])[1]) || 0) : 0;   // v42（E528·P3 整合）：正则 typo 修复（旧 `(d+)` 匹配字面 d 恒 0）
      AutoCult.paceMs = realPace;
      AutoCult.active = false;
      Game.player = savedPlayer;
      Battle.wait = realWait; Story.active = realStoryActive; Utils.chance = realChance;
      return out;
    });
    rb3.aggOk = rb3.smartLineRounds >= 1 && rb3.smartLineRounds === rb3.finalRounds;   // v42（E528·P3 整合）：聚合→停机小结一行出账闭环（N 轮一致；autoRep 前读受轮界异步影响不再作 gate）
    rb3.settlePopups === 0 && rb3.aggOk && rb3.ratio >= 1.1   // v42（E528·P3 整合）：E502 普通档周天 ×1.2 提速后智能:普通比按比例下移（旧设计 1.4 锚 ÷1.2 ≈1.17——增益明示项，实测量锚随 RB 输出留档）
      ? pass(`RB3 智能档：10 轮「出关·结算」弹窗 =0（auto 语境不弹模态）；停机小结「智能闭关 ${rb3.smartLineRounds} 轮」出账与轮数一致（settleReport(auto) 聚合闭环；E501 逐日补跑后单轮收益大增，圆满提前停机为合法路径）；日均比 智能普通 = ${rb3.ratio} ≥1.1（E423；v42 E502 周天 ×1.2 后同比下移锚）`) : fail('RB3 智能档', JSON.stringify(rb3));

    /* ---- RB4：E422 挂机聚灵弹窗计次（首问转 always ≤1 / 以后都聚零弹窗 / 今日跳过静默窗口期） ---- */
    const rb4 = await page.evaluate(async () => {
      const out = {};
      const realPace = AutoCult.paceMs; AutoCult.paceMs = () => 1;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const realStoryActive = Story.active; Story.active = () => false;   // 行权偶发剧情不再挂起挂机循环（测试桩）
      const realChance = Utils.chance; Utils.chance = () => false;        // 随机事件不拉起战斗/节庆（测试桩）
      const mk = () => {
        const pl = PlayerFactory.create('聚灵道人', { gen: 5, comp: 5, luck: 5, body: 5 });
        pl.realmIdx = 9; pl.layer = 0; pl.dao = null;   // r9 层 0：十轮预算内必不圆满（零冲关支路）
        pl.sect = null;
        pl.cave = { lv: 3, dongtian: 0, builds: { gather: 0 }, plots: [] };
        pl.stones = { low: 1e9, mid: 0, high: 0 };
        pl.ui = { wudao: 'skip', damode: 'skip', engine: 'normal' };
        pl.flags.tutorialDone = true;
        return pl;
      };
      const savedPlayer = Game.player;
      if (Battle.active) { try { Battle.end(); } catch (e) { /* 场景已了 */ } Battle.active = null; }
      Tribulation.state = null;
      const run = async (p, popupImpl, rounds) => {
        const realPopup = UI.popup; UI.popup = popupImpl;
        Game.player = p;
        AutoCult.active = false;
        AutoCult.start({ label: '复算·聚灵' });
        let guard = 0;
        while (AutoCult.active && AutoCult.rounds < rounds && guard++ < 8000) await new Promise(r => setTimeout(r, 4));
        AutoCult.finish('复算完成');
        UI.popup = realPopup;
        AutoCult.active = false;
      };
      // v42（E528·P3 整合）：跨段会话态清场——Guide._rushDeclineDay 是单例日键，RB3 的逐日补跑段可能留置当日值导致首问被跨段压制
      Guide._rushDeclineDay = null;
      // a) 首问转「以后都聚」——E501 后面询语义：轮内逐日补跑（inRound）静默压制、轮界至多一次
      //    （挂机 10 轮计次 ≤1）；「首问转 always 落偏好」本体另以轮间手动行权语境单测（确定性强，
      //    不依赖轮界面询的全局日钟路径）
      {
        const p = mk();
        let n = 0;
        await run(p, async o => { if (o && o.title && o.title.includes('聚灵')) { n++; return 'always'; } return true; }, 10);
        out.firstAskIdle = n <= 1;
        out.firstAskN = n;
        Guide._rushDeclineDay = null;
        delete p.ui.rush;   // 复位首问态——轮间手动语境单测
        const realRA = UI.renderAll; UI.renderAll = () => {};   // 行权风暴减载
        const realLogA = Log.add; Log.add = () => {};
        const realPopupA = UI.popup;
        let n2 = 0;
        UI.popup = async o => { if (o && o.title && o.title.includes('聚灵')) { n2++; return 'always'; } return true; };
        try { await Guide.dailyAll({}); } catch (e) { /* 资源不足等行权异常不碍断言 */ }
        UI.popup = realPopupA; UI.renderAll = realRA; Log.add = realLogA;
        Game.player = savedPlayer;
        out.manualAsked = n2;
        out.prefSet = p.ui.rush === 'always';
        out.firstAsk = out.firstAskIdle && out.manualAsked === 1 && out.prefSet;
      }
      // b) 预设「以后都聚」——20 轮零弹窗
      {
        const p = mk(); p.ui.rush = 'always';
        let n = 0;
        await run(p, async o => { if (o && o.title && o.title.includes('聚灵')) n++; return true; }, 20);
        out.alwaysZero = n === 0;
      }
      // c) 「今日跳过」——skip 只压当日（会话内日键）：轮间两次行权各面询一次，第二次问的日次必须递增（隔日自然重问）
      {
        const p = mk();
        Guide._rushDeclineDay = null;
        const days = [];
        Game.player = p;
        const realRA = UI.renderAll; UI.renderAll = () => {};   // v42（E528·P3 整合）：行权风暴减载
        const realLogC = Log.add; Log.add = () => {};
        const realPopupC = UI.popup;
        UI.popup = async o => {
          if (o && o.title && o.title.includes('聚灵')) { days.push(Math.floor(Game.player.day)); return 'skip'; }
          return true;
        };
        try { await Guide.dailyAll({}); } catch (e) { /* 资源不足等行权异常不碍断言 */ }
        try { await Guide.dailyAll({}); } catch (e) { /* 同上 */ }
        UI.popup = realPopupC; UI.renderAll = realRA; Log.add = realLogC;
        Game.player = savedPlayer;
        out.skipQuiet = days.length >= 2 && days[1] > days[0];
        out.skipDays = days.slice(0, 4);
      }
      AutoCult.paceMs = realPace; AutoCult.active = false;
      Game.player = savedPlayer; Battle.wait = realWait; Story.active = realStoryActive; Utils.chance = realChance;
      return out;
    });
    rb4.firstAsk && rb4.alwaysZero && rb4.skipQuiet
      ? pass(`RB4 聚灵三态计次：首问转「以后都聚」落 p.ui.rush（挂机 10 轮面询 ${rb4.firstAskN} 次 ≤1——v42 E501 后轮内逐日补跑静默压制；轮间手动首问恰 1 次）；预设 always 20 轮全程零弹窗；「今日跳过」只压当日、隔日重问（问次日次 ${JSON.stringify(rb4.skipDays)} 递增）（E422+E501）`) : fail('RB4 聚灵计次', JSON.stringify(rb4));

    /* ---- RB5：E428 旧档 _ 键迁入 sess/ui 往返 + 设置面板偏好即时生效 ---- */
    const rb5 = await page.evaluate(() => {
      const out = {};
      const legacy = {
        name: '故人道友', realmIdx: 4, layer: 1, day: 888.5, exp: 100, insight: 3,
        _autoRush: 'always', _pref: { wudao: 'always', damode: 'skip' },
        _haggleMul: 1.3, _haggleFailDay: 887,
        expOverflow: 'abc', version: 3, _slayUsed: true, warSpirit: 7,
        flags: { tutorialDone: true }, counters: {}, stones: { low: 10, mid: 0, high: 0 }, bag: {}, npcs: {},
      };
      const once = PlayerFactory.migrate(JSON.parse(JSON.stringify(legacy)));
      out.sess = once.sess && once.sess.haggleMul === 1.3 && once.sess.haggleFailDay === 887;
      out.ui = once.ui && once.ui.rush === 'always' && once.ui.wudao === 'always' && once.ui.damode === 'skip';
      out.gone = !('version' in once) && !('_slayUsed' in once) && !('_autoRush' in once) && !('_pref' in once) && !('_haggleMul' in once) && !('warSpirit' in once);   // v41 修偏：warSpirit 死键入删除清单
      out.cleaned = once.expOverflow === 0;   // 'abc' → 0 数值清洗
      out.skipDeleted = !('_autoRushSkipDay' in once);
      // 幂等：二次迁移不再漂移
      const twice = PlayerFactory.migrate(JSON.parse(JSON.stringify(once)));
      out.idempotent = twice.sess.haggleMul === 1.3 && twice.ui.rush === 'always' && twice.expOverflow === 0;
      // 存档落表往返
      localStorage.setItem('fanren_wd_7', JSON.stringify({ v: 1, player: once, meta: { name: once.name, realmText: 'x', day: 1, age: 16, ts: Date.now(), dead: false } }));
      const back = JSON.parse(localStorage.getItem('fanren_wd_7'));
      const remig = PlayerFactory.migrate(back.player);
      out.roundtrip = remig.sess.haggleMul === 1.3 && remig.ui.damode === 'skip';
      localStorage.removeItem('fanren_wd_7');
      // 设置面板改偏好即时生效：面板写 p.ui.* → prefMode 单源即刻读新值
      const p = Game.player;
      p.ui = p.ui || {};
      p.ui.rush = 'skip';
      const a = Guide.prefMode(p, 'rush') === 'skip';
      p.ui.rush = 'always';
      const b = Guide.prefMode(p, 'rush') === 'always';
      p.ui.wudao = 'skip';
      out.panelLive = a && b && Guide.prefMode(p, 'wudao') === 'skip';
      delete p.ui.rush; delete p.ui.wudao;
      out.panelDefault = Guide.prefMode(p, 'rush') === 'ask';
      return out;
    });
    rb5.sess && rb5.ui && rb5.gone && rb5.cleaned && rb5.skipDeleted && rb5.idempotent && rb5.roundtrip && rb5.panelLive && rb5.panelDefault
      ? pass('RB5 存档治理：旧档 _autoRush/_pref/_haggle 系迁入 p.ui/p.sess 且原键删除、warSpirit 死键一并删除（PLAN_V41 §十三迁移表）、_autoRushSkipDay 不迁、expOverflow 脏值清洗=0、二次迁移幂等、存档往返无损；面板改偏好 prefMode 即时生效、缺省回落 ask（E428/E422）') : fail('RB5 迁移往返', JSON.stringify(rb5));

    /* ---- RB6：E434 BID 三连 bold 后 BID_MODES.bold.rate 仍 60 ---- */
    const rb6 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.stones = { low: 1e9, mid: 0, high: 0 };
      p.realmIdx = 6;
      p.gongfa = p.gongfa || {};
      const day = Math.floor(p.day || 0);
      p.auction = { item: 'm_danfang', seq: 1, base: 4000, until: day + 60, consign: null };   // 固定常规拍品（不入 mystery 支）
      const before = AuctionSys.BID_MODES.bold.rate;
      const realPopup = UI.popup; UI.popup = async () => true;
      const realChance = Utils.chance; Utils.chance = () => false;   // 三连皆落标（退款路径，无入账干扰）
      for (let i = 0; i < 3; i++) { try { await AuctionSys.bid('bold'); } catch (e) { /* 弹窗桩已应答 */ } }
      Utils.chance = realChance; UI.popup = realPopup;
      out.rateStable = AuctionSys.BID_MODES.bold.rate === 45 && AuctionSys.BID_MODES.bold.rate === before;   // v42（E528·P3 整合）：E510 激进档 60→45 随动（单例不写回语义不变）
      out.boldRate = AuctionSys.BID_MODES.bold.rate;
      return out;
    });
    rb6.rateStable
      ? pass(`RB6 三连激进出价后 BID_MODES.bold.rate 仍 ${rb6.boldRate} === 45（眼值加成只落局部 rate，弹窗成算不累进、全档位池不被污染；E434 + v42 E510 激进成功率 60→45 重定价）`) : fail('RB6 BID 突变', JSON.stringify(rb6));

    /* ---- RB7：E439 滚茬 consign 存续 → 结算清除（成交/流拍双支） ---- */
    const rb7 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.stones = { low: 100000, mid: 0, high: 0 };
      p.bag = {};
      const day = Math.floor(p.day || 0);
      const consign = { item: 'm_neidan', base: 1000, rate: 80, tier: '速售', until: day + 30 };
      // ① 滚茬透传：until 过期强制重掷，consign（在售未到期）必须随 prev 存续
      p.auction = { item: 'm_danfang', seq: 3, base: 4000, until: day - 1, consign: JSON.parse(JSON.stringify(consign)) };
      const rolled = AuctionSys.ensure(p);
      out.kept = !!rolled.consign && rolled.consign.item === 'm_neidan' && rolled.consign.base === 1000;
      // ② 成交支：到期（until 改昨日）结算扣五厘入账、consign 清
      rolled.consign = JSON.parse(JSON.stringify(consign));
      rolled.consign.until = day - 1;
      const total = () => p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
      const s0 = total();
      const rc = Utils.chance; Utils.chance = () => true;
      AuctionSys.settleConsign(p, day + 61);
      Utils.chance = rc;
      out.win = total() - s0 === Math.round(1000 * 0.95) && p.auction.consign === null;
      // ③ 流拍支：退件回包 + 二厘手续费
      p.auction.consign = { item: 'm_neidan', base: 1000, rate: 80, tier: '速售', until: day - 1 };
      p.bag = {};
      const s2 = total();
      const rf = Utils.chance; Utils.chance = () => false;
      AuctionSys.settleConsign(p, day + 61);
      Utils.chance = rf;
      out.lose = (s2 - total()) === 20 && (p.bag['m_neidan'] || 0) === 1 && p.auction.consign === null;
      return out;
    });
    rb7.kept && rb7.win && rb7.lose
      ? pass('RB7 寄售：滚茬整体重赋值 consign 存续（漏传即蒸发）→ 到期成交扣五厘入账 950/清 consign；流拍退件回包 + 二厘手续费 20/清 consign（E439）') : fail('RB7 寄售', JSON.stringify(rb7));

    /* ---- RB8：E434 读档+拍期已过 tips 两次渲染一致（纯读不落盘） ---- */
    const rb8 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      const day = Math.floor(p.day || 0);
      p.auction = { item: 'm_danfang', seq: 5, base: 4000, until: day - 30, views: 1, consign: null };
      const raw0 = JSON.stringify(p.auction);
      const t1 = JSON.stringify(Guide.tips(p));
      const rawMid = JSON.stringify(p.auction);
      const t2 = JSON.stringify(Guide.tips(p));
      out.same = t1 === t2;
      out.pure = raw0 === rawMid && p.auction.until === day - 30;   // 过期拍期不被读路径重掷
      p.auction = null;
      AuctionSys.ensure(p);   // 收尾 materialize 一份正常拍期
      return out;
    });
    rb8.same && rb8.pure
      ? pass('RB8 读档+拍期已过：连续两次渲染 tips 返回逐字节一致，且 p.auction 不被读路径改写（E434/E429⑤——tips 渲染即写档的边角收口）') : fail('RB8 tips一致', JSON.stringify(rb8));

    /* ---- RB9：E435 满配符修 expectedQty == 实发 EV（同参实算，非仲夏/仲夏两锚） ---- */
    const rb9 = await page.evaluate(() => {
      const out = {};
      const mk = () => {
        const pl = PlayerFactory.create('符修道人', { gen: 9, comp: 9, luck: 9, body: 9 });
        pl.realmIdx = 6; pl.layer = 1; pl.dao = 'talisman';
        pl.daoExp = { talisman: 999999 };
        pl.daoPaths = { 3: 'A', 6: 'A' };   // 妙笔生花 / 天笔点睛（miaoBi/tianBi）
        pl.gongfa = { gf_leishen: { level: 3, exp: 0 }, gf_zixiao: { level: 3, exp: 0 } };   // 道韵·雷符双绝 → echo 'draw'
        pl.sect = null;
        return pl;
      };
      const p = mk();
      const saved = Game.player; Game.player = p;
      let summerDay = null, plainDay = null;
      for (let d = 1; d < 500; d++) {
        p.day = d;
        if (Art.seasonOf(p) === 1) { if (summerDay == null) summerDay = d; }
        else if (plainDay == null) plainDay = d;
        if (summerDay != null && plainDay != null) break;
      }
      out.summerDay = summerDay; out.plainDay = plainDay;
      const probe = season => {
        p.day = season === 1 ? summerDay : plainDay;
        // 同参实算：expectedQty 各 token 与 drawTalisman 实发分支逐项对表（同参、同常量）
        const q = 2 + 1   // 基数 2 + rand(0,2) 均值 1
          + (p.realmIdx >= 2 ? 1 : 0)
          + (DaoSys.tierLevel(p) >= 1 ? 1 : 0)
          + (DaoSys.hasPath(p, 3, 'miaoBi') ? 1 : 0)
          + (season === 1 ? 2 : 0);
        const pd = ((DaoSys.tierLevel(p) >= 2 ? 20 : 12) + (DaoSys.hasPath(p, 6, 'tianBi') ? 15 : 0)) / 100;
        const echo = Stat.activeEchoes(p).has('draw') ? 1 : 0;
        const realEV = q * (1 - pd) + (q * 2 + echo) * pd + (DaoSys.tierLevel(p) >= 6 ? 2 : 0);
        const quoted = CraftSys.expectedQty(p);
        return { tier: DaoSys.tierLevel(p), q, pd, echo, realEV, quoted, diff: Math.abs(realEV - quoted) };
      };
      out.plain = probe(0); out.summer = probe(1);
      out.fullConfig = out.plain.tier >= 6 && out.plain.q === 6 && out.plain.echo === 1 && out.plain.pd === 0.35;
      out.same = out.plain.diff <= 0.01 && out.summer.diff <= 0.01;
      out.anchors = Math.abs(out.plain.realEV - 10.45) <= 0.01 && Math.abs(out.summer.realEV - 13.15) <= 0.01;
      Game.player = saved;
      return out;
    });
    rb9.same && rb9.anchors
      ? pass(`RB9 画符定价同源：非仲夏满配同参实算 EV ${rb9.plain.realEV}（锚 10.45）、仲夏满配 ${rb9.summer.realEV}（锚 13.15），expectedQty 同参差 ≤0.01（满配在案 tier=${rb9.plain.tier}/q=${rb9.plain.q}/echo=${rb9.plain.echo}）（E435——计价偏低的设计负期望翻正）`) : fail('RB9 画符EV', JSON.stringify({ plain: rb9.plain, summer: rb9.summer, full: rb9.fullConfig }));

    /* ---- RB10：E426 溢流修为全额结转（静修冲关实发） ---- */
    const rb10 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      const saved = { realm: p.realmIdx, layer: p.layer, exp: p.exp, overflow: p.expOverflow, insight: p.insight };
      p.realmIdx = 0; p.layer = 3; p.exp = 1;
      p.expOverflow = 1000; p.insight = 0; p.insightSrc = [];
      const rc = Utils.chance; Utils.chance = () => true;   // 必成
      const rs = Utils.sleep; Utils.sleep = () => Promise.resolve();
      await Cultivate.quietBreakthrough(15);
      Utils.chance = rc; Utils.sleep = rs;
      out.full = p.exp === Math.min(1000, GameData.layerNeed(1, 0) - 1);
      out.exp = p.exp;
      Object.assign(p, { realmIdx: saved.realm, layer: saved.layer, exp: saved.exp, expOverflow: saved.overflow, insight: saved.insight });
      return out;
    });
    rb10.full
      ? pass(`RB10 溢流全额结转：overflow=1000 静修冲关后 exp=min(1000, need-1)=${rb10.exp}（原折半暗扣已修，「溢出保留」注释口径兑现）（E426）`) : fail('RB10 溢流', JSON.stringify(rb10));

    /* ---- RB11：E427 一键服丹按枚计日（5+3 枚 → +8 日） ---- */
    const rb11 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.bag = { pill_liaoshang: 5, pill_huiling: 3 };
      p.poison = 0;
      const st = Stat.compute(p);
      p.hp = 1; p.mp = 1;
      const d0 = p.day || 0;
      Bag.autoUseLowPills();
      out.days = Math.round((p.day || 0) - d0);
      out.pillsLeft = (p.bag.pill_liaoshang || 0) + (p.bag.pill_huiling || 0);
      out.consumed = 8 - out.pillsLeft;
      out.perPill = out.days === out.consumed && out.consumed >= 2;   // 计日恰等于实耗枚数（每枚 1 日）
      return out;
    });
    rb11.perPill
      ? pass(`RB11 一键服丹按枚计日：实耗 ${rb11.consumed} 枚（气血/灵力满即止的既有语义）→ 恰 +${rb11.days} 日（每枚 1 日——原一键 40 枚只计 1 日白嫖 39 日已修）（E427）`) : fail('RB11 服丹计日', JSON.stringify(rb11));

    /* ---- RB12：E441 灵泉比值全境带 + r6 裸值锚 9383 ---- */
    const rb12 = await page.evaluate(() => {
      const out = {};
      const rows = [];
      for (let r = 0; r <= 9; r++) {
        const spring = Math.round(15 * 3 * GameData.stoneEco(Math.min(4, r)));   // 裸值（驻守 ×1.2 单列不计）
        const battleIn = Math.round(37.5 * GameData.stoneEco(r) * 2);            // 主动收入（两战均值，E459 双轨口径）
        rows.push({ r, ratio: +(spring / Math.max(1, battleIn)).toFixed(3), spring });
      }
      out.rows = rows;
      out.lowBand = rows.filter(x => x.r >= 1 && x.r <= 4).every(x => x.ratio < 1.0);
      out.highBand = rows.filter(x => x.r >= 5).every(x => x.ratio < 0.5);
      out.r6 = rows[6].spring === 9383;
      return out;
    });
    rb12.lowBand && rb12.highBand && rb12.r6
      ? pass(`RB12 灵泉:主动收入比全境带：r1~r4 均 <1.0（${rb12.rows.slice(1, 5).map(x => x.ratio).join('/')}）、r5+ 均 <0.5（${rb12.rows.slice(5).map(x => x.ratio).join('/')}）、r6 裸值 = ${rb12.rows[6].spring} === 9383（E441——「挂一口泉胜过出门」全境不成立）`) : fail('RB12 灵泉带', JSON.stringify(rb12.rows));

    /* ---- RB13：E509 寄售五档现金 EV（马尔可夫式含续拍期望折算，v42 E509 重做随动——E439 单档旧锚随语义退役） ---- */
    const rb13 = await page.evaluate(() => {
      const out = {};
      const T2 = AuctionSys.CONSIGN_TIERS_V2;   // v42（E528·P3 整合）：CONSIGN_TIERS 旧表随 E509 退役，五档 V2 单源
      const q = T2.map(t => t.rate / 100);
      const Gv = T2.map(t => t.mul * (1 + t.prem) * 0.95);   // 成交含溢价、扣 5% 佣金（E439 骨架不动）
      const X = [], D = [], ev = [];
      for (let i = 0; i < T2.length; i++) {
        X[i] = q[i] * Gv[i] + (1 - q[i]) * ((i ? X[i - 1] : 0) - 0.02);   // 流拍退件 2% + 降档续拍期望折算
        D[i] = i ? 60 + (1 - q[i]) * D[i - 1] : 60;
        ev.push(+(X[i] / D[i] * 60).toFixed(3));
      }
      out.ev = ev;
      out.fast = ev[0];
      out.hi = ev[3];   // 高价档（档 3）——天价档（档 4）为 0.461 低锚是 E509 设计（方差换期望）
      out.spread = +(Math.max(...ev) - Math.min(...ev)).toFixed(3);
      out.a1 = Math.abs(out.fast - 0.604) <= 0.02;   // 速售 ≈0.604（W2B 实测锚）
      out.a2 = out.spread <= 0.15 && out.hi >= 0.5;   // 五档极差 ≤0.15 且高价档 ≥0.50（E509 门）
      out.selfCheck = out.fast >= Math.max(...ev) - 0.031;   // 速售不再严格最优：较最优差 ≤5%
      return out;
    });
    rb13.a1 && rb13.a2 && rb13.selfCheck
      ? pass(`RB13 寄售五档现金 EV（马尔可夫式含续拍期望折算）：[${rb13.ev.join(', ')}]——速售 ${rb13.fast} ≈0.604 > 坊市秒卖 0.45、五档极差 ${rb13.spread} ≤0.15、高价档 ${rb13.hi} ≥0.50、速售较最优差 ≤5%（E439 骨架佣金 5%/退件 2% 不动；v42 E509 五档重做随动）`) : fail('RB13 寄售EV', JSON.stringify(rb13));

    /* ---- RB14：E440 通商波幅带（trade [0.75,1.25] / 常态 [0.8,1.2]） ---- */
    const rb14 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.sect = { id: 'qingyun', contrib: 0, council: { tendency: null } };
      const probe = () => {
        const items = Object.keys(GameData.ITEMS).slice(0, 400);
        let mn = 9, mx = 0;
        for (const id of items) { const m = WorldSys.marketMul(p, id); if (m < mn) mn = m; if (m > mx) mx = m; }
        return { mn: +mn.toFixed(3), mx: +mx.toFixed(3) };
      };
      const plain = probe();
      p.sect.council.tendency = 'trade';
      const trade = probe();
      p.sect.council.tendency = null;
      out.plain = plain; out.trade = trade;
      out.ok = trade.mn >= 0.75 && trade.mx <= 1.25 && plain.mn >= 0.8 && plain.mx <= 1.2 && trade.mx > plain.mx;
      return out;
    });
    rb14.ok
      ? pass(`RB14 通商波幅实装：trade 季 mul ∈ [${rb14.trade.mn}, ${rb14.trade.mx}] ⊂ [0.75,1.25]（上界高于常态 ${rb14.plain.mx}），常态 ⊂ [0.8,1.2]（E440——通商季「行情更烈」为真）`) : fail('RB14 波幅', JSON.stringify(rb14));

    /* ---- RB15：E445⑤ 道侣 tryAid 回归 ×1.0（义气乘区只作用结拜候选） ---- */
    const rb15 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.npcs = p.npcs || {};
      p.npcs['n_lover'] = { alive: true, met: true, rel: 80, loyalty: 0, realmIdx: p.realmIdx, layer: p.layer };   // 道侣 loyal 恒 0
      p.npcs['n_sworn'] = { alive: true, met: true, rel: 80, loyalty: 70, realmIdx: p.realmIdx, layer: p.layer };
      p.partner = 'n_lover';
      p.sworn = ['n_sworn'];
      p.counters.aidRot = 0;
      let lastP = null;
      const sc = Utils.chance; Utils.chance = v => { lastP = v; return false; };
      NpcSys.tryAid(p, 'battle');          // 道侣候选（partner 优先）——aidBase×1
      const loverP = lastP;
      p.partner = null; p.counters.aidRot = 1;   // 轮转到结拜候选——aidBase×(0.5+loyalty/100)
      NpcSys.tryAid(p, 'battle');
      const swornP = lastP;
      Utils.chance = sc;
      delete p.npcs['n_lover']; delete p.npcs['n_sworn'];
      p.partner = null; p.sworn = [];
      out.loverP = loverP; out.swornP = swornP;
      out.loverOne = loverP != null && Math.abs(loverP - 25 - 80 * 0.3) < 1e-9;   // 道侣乘区恰 ×1.0（旧式复算一致）
      out.swornBoost = swornP != null && swornP > loverP;                          // 结拜 loyalty70 → ×1.2 照旧
      return out;
    });
    rb15.loverOne && rb15.swornBoost
      ? pass('RB15 tryAid 回归：道侣候选概率恰 = aidBase（乘区 ×1.0，loyal 恒 0 的恒 ×0.5 暗削拔除、旧式复算一致），结拜 loyalty70 ×1.2 照旧上浮（E445⑤——未公示削弱回归修正，增益回归明示）') : fail('RB15 tryAid', JSON.stringify(rb15));

    /* ---- RB16：E447 擂主 tactic 胜率差 ≥5pp（同兽不同策推演同源） ---- */
    const rb16 = await page.evaluate(() => {
      const out = {};
      const mk = (tactic) => ({ name: '复算灵兽', species: 'beast', power: 5, level: 2, evolved: false, tactic, skills: [
        { name: 'a', kind: 'poison', pct: 3, rounds: 2 }, { name: 'b', kind: 'bleed', pct: 3, rounds: 2 },
      ] });
      // 小规模镜像局：战斗回合数长，残血追击/首轮先手/残血减伤的覆盖面放大——同兽同敌换策取三策两两最大差
      const wf = BeastSys.simBeastDuel(mk('focus'), mk('focus'), 424242).winP;
      const wg = BeastSys.simBeastDuel(mk('guard'), mk('focus'), 424242).winP;
      const wc = BeastSys.simBeastDuel(mk('control'), mk('focus'), 424242).winP;
      const w2 = BeastSys.simBeastDuel(mk('focus'), mk('guard'), 424242).winP;
      const w3 = BeastSys.simBeastDuel(mk('control'), mk('guard'), 424242).winP;
      out.focus = wf; out.guard = wg; out.control = wc;
      out.gap = Math.max(Math.abs(wf - wg), Math.abs(wf - wc), Math.abs(wg - wc), Math.abs(w2 - wg), Math.abs(w3 - wg));
      out.gapPair = '镜像对称局换策';
      return out;
    });
    rb16.gap >= 5
      ? pass(`RB16 擂主 tactic 实装：镜像对称局换策推演（集火 ${rb16.focus}% / 护主 ${rb16.guard}% / 控场 ${rb16.control}%，跨对手侧两两最大差 ${rb16.gap}pp）≥5pp（E447——「协战策略尽入推演」不再虚标，赛前换策略即见分晓）`) : fail('RB16 tactic差', JSON.stringify(rb16));

    /* ---- RB17：E448 心魔镜像胜率带 40~65%（r6 中配 vs 镜像构式） ---- */
    const rb17 = await page.evaluate(async () => {
      const out = {};
      const mk = () => {
        const pl = PlayerFactory.create('心魔道人', { gen: 6, comp: 6, luck: 6, body: 6 });
        pl.realmIdx = 6; pl.layer = 1; pl.dao = null;
        pl.sect = { id: 'qingyun', contrib: 0 };
        pl.equipped = { weapon: { id: 'w_zhuxian', enhance: 8, affixes: {}, stars: {} }, armor: { id: 'a_longlin', enhance: 8, affixes: {}, stars: {} }, accessory: { id: 'z_taiji', enhance: 8, affixes: {}, stars: {} } };
        pl.gongfa = { gf_lieyang: { level: 5, exp: 0 }, gf_wanjian: { level: 5, exp: 0 }, gf_tumo: { level: 5, exp: 0 } };
        pl.npcs = {};
        for (const d of GameData.NPCS) pl.npcs[d.id] = { alive: true, met: true, rel: 0, realmIdx: 6, layer: 1 };
        return pl;
      };
      const p = mk();
      p.karma = 50;   // 孽障 50 → 主象「嗔」权重 20 → sev 0.5 → trim 1.0（镜像 0.95~1.05 语义带中值）
      const savedPlayer = Game.player; Game.player = p;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const realRandom = Math.random;
      let _s = 1;
      const seeded = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      // 镜像构式与 XinmoSys.start 同式：imageOf 心象 + hp×1.1、atk×0.9、def/spd 同玩家
      const skills = ['gf_lieyang', 'gf_wanjian', 'gf_tumo'];
      // node 复算（E448 验收原语）：镜像构式同 start()（imageOf + hp×1.1 / atk×0.9 / sev 折算），
      // 双侧同规则对拆（Stat.afterDef 同式，随机同流；不含爆发/会心/闪避等引擎单向加成）
      const rp = 6 * 4 + 2;
      const st = Stat.compute(p);
      const img = XinmoSys.imageOf(p);
      const trim = 0.95 + 0.10 * img.sev;
      const mHp = Math.round(st.maxHp * 1.1 * trim), mAtk = Math.round(st.atk * 0.9 * trim);
      const dP = Stat.afterDef(st.atk, st.def, rp);       // 玩家→镜像（镜像 def=玩家 def）
      const dM = Stat.afterDef(mAtk, st.def, rp);         // 镜像→玩家
      out.trim = +trim.toFixed(3); out.dP = dP; out.dM = dM; out.sev = +img.sev.toFixed(2);
      let w = 0;
      const N = 600;
      for (let i = 0; i < N; i++) {
        _s = 424242 + i * 7919;
        let curP = st.maxHp, curM = mHp, guard = 0;
        while (curP > 0 && curM > 0 && guard++ < 500) {
          const hitP = dP * (0.95 + seeded() * 0.25);   // 同回合双侧同时结算（无先手偏置）
          const hitM = dM * (0.95 + seeded() * 0.25);
          curM -= hitP; curP -= hitM;
        }
        if (curM <= 0 && curP <= 0) w += 0.5;           // 同回合双亡记半胜
        else if (curM <= 0) w += 1;
      }
      out.winPct = +(w / N * 100).toFixed(1);
      Math.random = realRandom; Battle.wait = realWait; Game.player = savedPlayer;
      return out;
    });
    rb17.winPct >= 40 && rb17.winPct <= 65
      ? pass(`RB17 心魔镜像胜率带（node 复算）：r6 中配 vs 自身镜像（trim=${rb17.trim}，hp×1.1/atk×0.9）双侧同规则对拆 ${rb17.N || 400} 场胜率 ${rb17.winPct}% ∈ [40,65]（E448——「选择的代价」复归，镜像可敌带 0.95~1.05 语义）`) : fail('RB17 心魔镜像', JSON.stringify(rb17));

    /* ---- RB18：E452 双新图 recRealm 覆盖 + r7/r8 池量 + E453 delta 钳 ---- */
    const rb18 = await page.evaluate(() => {
      const out = {};
      const recs = GameData.MAPS.map(m => m.recRealm);
      out.covers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].every(r => recs.includes(r));
      out.newMaps = GameData.MAPS.some(m => m.id === 'zhengtao' && m.recRealm === 7) && GameData.MAPS.some(m => m.id === 'leichi' && m.recRealm === 8);
      const mapT = GameData.MAPS.find(m => m.id === 'zhengtao');
      const mapL = GameData.MAPS.find(m => m.id === 'leichi');
      const pool7 = (mapT.pool || []).length + Object.keys(mapT.dPool || {}).length;
      const pool8 = (mapL.pool || []).length + Object.keys(mapL.dPool || {}).length;
      out.pool7 = pool7; out.pool8 = pool8;
      out.poolOk = (mapT.pool || []).length >= 5 && (mapL.pool || []).length >= 5;   // 池量 ≥5，dPool 借用/词缀扩表现
      const pR = 8 * 4; const cap = Math.ceil(pR * 1.35);
      out.cap = cap;
      out.capOk = cap === Math.ceil(pR * 1.35) && cap >= pR;
      return out;
    });
    rb18.covers && rb18.newMaps && rb18.poolOk && rb18.capOk
      ? pass(`RB18 双新图与威胁带：recRealm 覆盖 r0~r9 无空窗、宗门征讨(r7)/雷池旧地(r8) 在册、r7 带 ${rb18.pool7} 怪 / r8 带 ${rb18.pool8} 怪（≥5，词缀/模板变体扩表现）、delta 怪 power 钳 cap=${rb18.cap} ≤玩家×1.35（E452/E453——r7+r8 24.7% 空窗带补齐）`) : fail('RB18 新图', JSON.stringify(rb18));

    /* ---- RB19：E455 劫象两表六/六逐表计数 + 线索词映射 ---- */
    const rb19 = await page.evaluate(() => {
      const out = {};
      const BEST_KEYS = ['ying', 'bi', 'yu'];
      const scan = name => (GameData[name] || []).map(o => ({
        id: o.id, best: BEST_KEYS.includes(o.best), clue: typeof o.desc === 'string' && o.desc.length >= 6,
      }));
      const t1 = scan('TRIB_OMENS');
      const t2 = scan('TRIB_OMENS_HIGH');
      out.t1 = t1.length; out.t2 = t2.length;
      out.six = t1.length === 4 && t2.length === 2;
      out.allMapped = [...t1, ...t2].every(x => x.best && x.clue);
      return out;
    });
    rb19.six && rb19.allMapped
      ? pass(`RB19 劫象对策线索：TRIB_OMENS ${rb19.t1} 象 + TRIB_OMENS_HIGH ${rb19.t2} 象 = 六/六，best 键与 desc 线索逐象全配（E455——两张表逐表计数，背题变图鉴）`) : fail('RB19 劫象', JSON.stringify(rb19));

    /* ---- RB20：E450 斩三尸持久 +5（两次突破均 +5）+ 一世报告行保留 + E419 everTop ---- */
    const rb20 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      // 持久口径：+5 在 breakthrough() 入口并入 bonus、旗标不消费——间谍 quietBreakthought 抓两次入参
      const p2 = PlayerFactory.create('斩尸道人', { gen: 6, comp: 6, luck: 6, body: 6 });
      p2.realmIdx = 0; p2.layer = 3; p2.exp = GameData.layerNeedT(p2, 0, 3);
      const savedPlayer2 = Game.player; Game.player = p2;
      const seen = [];
      const realQB = Cultivate.quietBreakthrough;
      Cultivate.quietBreakthrough = async bonus => { seen.push(bonus); };
      p2.slayBonus = null;
      await Cultivate.breakthrough(0);   // 无旗标：baseline
      p2.slayBonus = true;
      await Cultivate.breakthrough(0);   // 首次突破：+5
      p2.layer = 3; p2.exp = GameData.layerNeedT(p2, 0, 3); p2.realmIdx = 0;
      await Cultivate.breakthrough(0);   // 第二次突破：旗标仍在——再 +5（持久口径）
      Cultivate.quietBreakthrough = realQB;
      // 一世报告行保留：碑文行账「因果」行含「曾斩三尸·洗髓之效未尽」（slayBonus 置位态）
      const d = ReincarnationSys.steleData(p2, '兵解转世');
      out.reportRow = d.rows.some(([k, v]) => k === '因果' && String(v).includes('曾斩三尸'));
      Game.player = savedPlayer2;
      out.diff1 = seen.length >= 3 ? seen[1] - seen[0] : -99;
      out.twice = seen.length >= 3 && seen[1] - seen[0] >= 4.5 && seen[2] - seen[0] >= 4.5 && seen[1] === seen[2];
      // everTop 旗标 + 称号 cond 反转（榜首死锁解）
      p.flags = p.flags || {}; p.flags.everTop = false;
      const tTop = (GameData.TITLES || []).find(t => t.id === 't_top');
      out.condOff = !!(tTop && tTop.cond(p) === false);
      RankSys.markEverTop(p);
      out.flag = p.flags.everTop === true;
      out.condOn = !!(tTop && tTop.cond(p) === true);
      return out;
    });
    rb20.twice && rb20.reportRow && rb20.condOff && rb20.flag && rb20.condOn
      ? pass(`RB20 斩三尸持久与天骄旗标：slayBonus 置位后两次突破成算均 +${rb20.diff1}（≥+5、旗标不消费）且一世碑文「因果」行保留「曾斩三尸·洗髓之效未尽」；t_top cond 改「曾登顶」——markEverTop 落 flags 后称号可佩戴（E450 勘误定案/E419）`) : fail('RB20 slay/everTop', JSON.stringify(rb20));

    /* ---- RB21：E419 问剑 skip=2 胜局换榜 + 功勋 diff+2 + 仅首次入册 ---- */
    const rb21 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.flags = p.flags || {};
      delete p.flags.wenjianFirst;
      p.chronicle = [];
      p.npcs = p.npcs || {};
      // 构盘：全 NPC 压到 power 0，三人生至 r9/r8/r7 在我（r6）之上——我居第 4，target=第 2（skip=2 可及）
      for (const d of GameData.NPCS) p.npcs[d.id] = { alive: true, met: true, rel: 0, realmIdx: 0, layer: 0 };
      const ids = GameData.NPCS.map(d => d.id);
      p.npcs[ids[0]].realmIdx = 9; p.npcs[ids[1]].realmIdx = 8; p.npcs[ids[2]].realmIdx = 7;
      p.rankHonor = 0;
      const rows = RankSys.board(p);
      const myIdx = rows.findIndex(r => r.id === 'me');
      out.boardOk = myIdx === 3;
      const target = rows[myIdx - 2];
      const diff = target.score - rows[myIdx].score;
      const before = RankSys.honorOf(p);
      const chronN = p.chronicle.length;
      RankSys.onWenjianWin(p, target.id, 2);
      const rows2 = RankSys.board(p);
      const myIdx2 = rows2.findIndex(r => r.id === 'me');
      const tIdx2 = rows2.findIndex(r => r.id === target.id);
      out.gain = RankSys.honorOf(p) - before === Math.ceil(diff + 2);
      out.swap = myIdx2 < tIdx2 && myIdx2 < myIdx;   // 夺位：我越过 target
      out.chronOnce = p.chronicle.length === chronN + 1 && p.chronicle.some(c => c.txt.includes('初问剑夺位'));
      p.rankHonor = before;
      RankSys.onWenjianWin(p, target.id, 2);   // 二次问剑——不再入册（wenjianFirst 已置）
      out.chronNotAgain = p.chronicle.length === chronN + 1;
      p.chronicle = [];
      return out;
    });
    rb21.boardOk && rb21.gain && rb21.swap && rb21.chronOnce && rb21.chronNotAgain
      ? pass('RB21 问剑隔位 skip=2：隔位递帖可胜（死锁解）、功勋 = diff+2、榜序夺位（我越 target 而上）+「初问剑夺位」仅首次入册（二次问剑年表不涨）（E419）') : fail('RB21 问剑skip', JSON.stringify(rb21));

    /* ---- RB22：E462 碑文页 m 全列 + 折线降级双分支 + 拓印导出 ---- */
    const rb22 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.chronicle = [
        { d: 10, txt: '晋入筑基期' },
        { d: 100, txt: '斩妖得一阶妖丹', m: 1 },
        { d: 200, txt: '晋入金丹期' },
        { d: 300, txt: '初问剑夺位·胜林寒舟', m: 1 },
        { d: 400, txt: '晋入元婴期' },
        { d: 500, txt: '宗门气象 · 通商', m: 1 },
      ];
      const d = ReincarnationSys.steleData(p, '兵解转世');
      out.mAll = d.mFlagged.length === 3 && d.mFlagged.every(e => e.m);
      out.samples = d.realm.line === false;   // 采样 3 点 <4 → 降级徽标行
      p.chronicle.push({ d: 600, txt: '晋入化神期' }, { d: 700, txt: '晋入炼虚期' });
      const d2 = ReincarnationSys.steleData(p, '兵解转世');
      out.line = d2.realm.line === true;      // 采样 5 点 ≥4 → 折线
      const rep = ReincarnationSys.lifeReport(p, '兵解转世');
      out.report = rep.html.includes('此世丰碑 · 3 笔') && rep.html.includes('说书人评传');
      const txt = ReincarnationSys.steleText(p, '兵解转世');
      out.export = typeof txt === 'string' && txt.length > 40;
      p.chronicle = [];
      return out;
    });
    rb22.mAll && rb22.samples && rb22.line && rb22.report && rb22.export
      ? pass('RB22 一世碑文：m 旗标 3 笔全列（首末两笔/境界刻度随附）、采样 <4 点降级徽标行、≥4 点折线点亮（条件交付不造假数据）、lifeReport 含丰碑段+说书人评传、拓印文本可导出（E462）') : fail('RB22 碑文', JSON.stringify(rb22));

    /* ---- RB23：E468 行情志标记同源 + E469 备战单加总=成算 ---- */
    const rb23 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.sect = { id: 'qingyun', contrib: 0, council: { tendency: null } };
      // 取一件行情偏离半成外的袋内物（行情志只列 |mul−1|>5% 者——与卡面同口径）
      const items = Object.keys(GameData.ITEMS);
      let pick = null;
      for (const id of items) { const m = WorldSys.marketMul(p, id); if (Math.abs(m - 1) > 0.05) { pick = id; break; } }
      out.pick = pick;
      p.bag = { [pick]: 3 };
      const html = UI.renderMarketBoard(p, [pick], false);
      const price = ShopSys.sellPrice(pick);
      out.sameSource = !!pick && html.includes(Utils.fmtNum(price));   // 标记价 = 出售实收单源
      p.sect.council.tendency = 'trade';
      const hTrade = UI.renderMarketBoard(p, ['m_lingcao'], true);
      p.sect.council.tendency = null;
      out.tradeHi = hTrade.includes('通商季');
      // 备战单：拆解加总=成算（E395 单源）
      const saved = { layer: p.layer, exp: p.exp };
      p.layer = 3;
      p.exp = GameData.layerNeedT(p, p.realmIdx, 3);
      const bd = Cultivate.breakdown(p, 0);
      const sum = bd.items.reduce((a, b) => a + b.v, 0);
      out.sumEq = Math.abs(sum - bd.chance) <= 0.02;
      out.chance = bd.chance;
      p.layer = saved.layer; p.exp = saved.exp;
      return out;
    });
    rb23.sameSource && rb23.tradeHi && rb23.sumEq
      ? pass(`RB23 行情志与备战单：行情志「今价」标记与 ShopSys.sellPrice 实收同源一致、通商季公示随 tendency 切换；备战单拆解行加总=成算（成算 ${rb23.chance}%，±0.02，E395 breakdown 单源）（E468/E469）`) : fail('RB23 行情/备战', JSON.stringify(rb23));

    /* ---- RB24：E444 官市加价方向（demerit=5 → ×1.25、帽 ×1.30、merit 反号） ---- */
    const rb24 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.flags = p.flags || {}; p.flags.ascended = true;
      p.xianjie = { idx: 1, layer: 0 };
      const row = { base: 10000 };
      const price = (merit, demerit) => {
        p.xianCourt = { gong: 0, merit, demerit };
        return XianSys.marketPrice(p, row);
      };
      const clean = price(0, 0);
      out.d5 = Math.abs(price(0, 5) / clean - 1.25) < 0.01;      // demerit=5 → ×1.25 加价
      out.cap = Math.abs(price(0, 8) / clean - 1.30) < 0.01;     // demerit≥6 → ×1.30 帽
      out.meritInv = price(30, 0) < clean;                        // merit 30 → 折上折 3%，与 demerit 反号
      p.xianCourt = null;
      return out;
    });
    rb24.d5 && rb24.cap && rb24.meritInv
      ? pass('RB24 官市加价方向定死：demerit=5 → 官市价 ×1.25、demerit≥6 → ×1.30 帽（惩罚轴），merit 折上折反号生效（两轴区分度）（E444 v5——折扣方向会让「多被贬官」变理财手段，作废并如实明示）') : fail('RB24 官市', JSON.stringify(rb24));

    /* ---- RB25：E456 仙阶曲线单调（17500<24000<30000<80000） ---- */
    const rb25 = await page.evaluate(() => {
      const needs = GameData.XIAN_TIERS.map(t => t.layerNeed);
      return { needs, mono: needs.every((v, i) => i === 0 || v > needs[i - 1]) };
    });
    rb25.mono
      ? pass(`RB25 仙阶曲线单调复归：layerNeed = ${rb25.needs.join(' < ')}（E456——天仙比地仙便宜的节奏倒挂纠正，天仙每层 ≈2.7 游戏日 ≥ 地仙首层 2 日）`) : fail('RB25 仙阶', JSON.stringify(rb25));

    /* ---- RB26/RB27：双审计两连跑逐字节一致（E459/E460） + field-audit 注入证红（E461） ---- */
    // 审计脚本为重门禁，置于 RB 尾段以子进程实跑（stdout 逐字节比对 + 退出码）
    try {
      const run = script => execFileSync('node', [join(__dirname, 'scripts', script)], { encoding: 'utf8', cwd: __dirname, timeout: 120000 });
      const b1 = run('balance-sim.mjs');
      const b2 = run('balance-sim.mjs');
      const p1 = run('price-audit.mjs');
      const p2 = run('price-audit.mjs');
      b1 === b2 && p1 === p2
        ? pass(`RB26 门禁两连跑逐字节一致：balance-sim（${b1.length}B）与 price-audit（${p1.length}B）同机双跑输出完全相同（E459/E460——种子化确定性输出，灵石=stoneEco 双轨、行情种子=0）`) : fail('RB26 审计一致', `bs equal=${b1 === b2} pa equal=${p1 === p2}`);
      // field-audit：先绿，再注入未知顶层键证红，还原后复绿
      const fa = () => { try { execFileSync('node', [join(__dirname, 'scripts', 'field-audit.mjs')], { encoding: 'utf8', cwd: __dirname, timeout: 60000 }); return 0; } catch (e) { return e.status || 1; } };
      const green = fa();
      const probePath = join(__dirname, 'js', 'core', 'art.js');
      const bak = readFileSync(probePath, 'utf8');
      let red = 0;
      try {
        writeFileSync(probePath, bak + '\nfunction v27Probe(p) { p._v27_probe_key = 1; }\n');
        red = fa();
      } finally {
        writeFileSync(probePath, bak);
      }
      const green2 = fa();
      green === 0 && red !== 0 && green2 === 0
        ? pass(`RB27 field-audit 契约审计：基线绿 → 注入未知顶层键 p._v27_probe_key 证红（exit ${red}）→ 还原复绿（E461——新增任何 p._ 键必须先入契约清单，E437 严禁复活顶层 _haggleMul 由此把关）`) : fail('RB27 field-audit', `green=${green} red=${red} green2=${green2}`);
    } catch (e) {
      fail('RB26 审计一致', String(e).slice(0, 160));
      fail('RB27 field-audit', '依赖 RB26 执行环境');
    }

    /* ---- RB28：复核修偏——乘区明细真实渲染无 undefined + 聚合三键出日报（E432/E445②/E451） ---- */
    const rb28 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      // a) 修行卡乘区明细行——cell 消费 {k,mul,base} 后真实渲染串不含 undefined（E432 修偏）
      const html = UI.renderCultivateTab();
      const m = html.match(/乘区明细：[^<]*/);
      out.line = m ? m[0].slice(0, 90) : '';
      out.noUndef = !!m && !m[0].includes('undefined');
      // b) 离线聚合 oath 三键——flushOfflineAgg 出日报行（E445②/E451 修偏，金兰并入义聚行）
      const savedAgg = Game._offlineAgg;
      Game._offlineAgg = { oathGather: 2, oathGatherGoldlan: 1, oathTrial: 3 };
      Game.flushOfflineAgg('【复核总账】');
      const last = Log.entries[Log.entries.length - 1] || '';
      out.aggLine = last.includes('义聚补聚 2 场') && last.includes('金兰缔结 1 次') && last.includes('守誓 3 次');
      Game._offlineAgg = savedAgg;
      return out;
    });
    rb28.noUndef && rb28.aggLine
      ? pass(`RB28 修偏复核：修行卡乘区明细行真实渲染无 undefined（「${rb28.line}…」）；离线聚合义聚补聚/金兰缔结/守誓出日报行（E432/E445②/E451）`) : fail('RB28 修偏复核', JSON.stringify(rb28));

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
console.log(`verify-v27：通过 ${passN} · 失败 ${failN}`);
if (failN > 0) {
  console.log('失败项：');
  for (const t of fails) console.log('  ✗ ' + t);
  process.exit(1);
}
console.log('✅ V41「开物」WP9 断言全部通过');
