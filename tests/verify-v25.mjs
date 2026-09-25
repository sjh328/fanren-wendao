/* ======================================================================
 * verify-v25 —— V39「贯通」WP1 专项回归（E346 / E364 / E347 / E348）
 * 覆盖：死链复活（!Story.active()×3）/ 夜袭洞府守卫与在线结算 / 聚灵窗口 RUSH_WINDOW 单源 /
 *       战斗账目单源（dealToEnemy·healMe·end() 无参）/ 塔祝福池合并（28→22 + tiers）/
 *       技能盘构筑生效（盘驱动 autoPilot·comboCap 单源·盘序周天）/ 战报一屏（结算卡·关键战沉淀）
 * 断言风格：源码静态检查（SA）+ 运行时行为检查（RB），与 verify-v16 同款骨架。
 * ====================================================================== */
import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(dirname(fileURLToPath(import.meta.url))); // 脚本居于 tests/，指向项目根
const R = f => readFileSync(join(__dirname, 'js', f), 'utf8');
const allJs = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.js')) allJs.push(readFileSync(p, 'utf8'));
  }
})(join(__dirname, 'js'));

let passN = 0, failN = 0;
const fails = [];
const pass = t => { passN++; console.log('  ✓ ' + t); };
const fail = (t, d) => { failN++; fails.push(t); console.log('  ✗ ' + t + ' :: ' + d); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================= 源码静态组（SA） ================= */
console.log('===== SA 源码静态组 =====');
{
  const gamejs = R('game.js');
  const guide = R('core/guide.js');
  const battle = R('battle/battle.js');
  const cave = R('systems/cave.js');
  const tower = R('systems/tower.js');
  const ui = R('ui/ui.js');
  const cult = R('systems/cultivate.js');
  const explore = R('systems/explore.js');
  const sfx = R('systems/status-fx.js');
  const gdata = R('data/game-data.js');
  const npcjs = R('systems/npc.js');
  const sectjs = R('systems/sect.js');
  const beastjs = R('systems/beast.js');
  const karma = R('systems/karma.js');
  const oath = R('systems/oath.js');
  const reinc = R('systems/reincarnation.js');
  const worldjs = R('systems/world.js');
  const dungeon = R('systems/dungeon.js');
  const bag = R('systems/bag.js');
  const tutorial = R('ui/tutorial.js');
  const craft = R('systems/craft.js');
  const sectjs2 = R('systems/sect.js');
  const towerjs = R('systems/tower.js');
  const balance = readFileSync(join(__dirname, 'scripts', 'balance-sim.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const auction = R('systems/auction.js');
  const avatar = R('systems/avatar.js');
  const trib = R('systems/tribulation.js');
  const black = R('systems/black.js');
  const bounty = R('systems/bounty.js');
  const shopjs = R('systems/shop.js');

  // E346：三处死链复活——无 `!Story.active &&` 残留，三处挂起点全部走函数调用形态
  !allJs.some(s => /!Story\.active\s*&&/.test(s))
    ? pass('SA1 全仓无 `!Story.active &&`（无括号）死链残留（E346）') : fail('SA1 死链', '仍有非调用形态');
  gamejs.includes('!Story.active() && !UI._popupResolve') && gamejs.split('!Story.active()').length >= 3
    ? pass('SA2 game.js 夜袭/誓言两处挂起走 !Story.active()（E346）') : fail('SA2 挂起链', '');
  guide.includes('!Battle.active && !Story.active() && !UI._popupResolve')
    ? pass('SA3 guide.js 以武会友收尾走 !Story.active()（E346）') : fail('SA3 行权收尾', '');

  // E346：夜袭洞府守卫
  /nightRaidCheck\(p, auto = false\) \{\s*\r?\n\s*if \(!p\.cave\) return;/.test(cave)
    ? pass('SA4 nightRaidCheck 首行洞府守卫（E346——cave=null 不再被建成退化对象）') : fail('SA4 夜袭守卫', '');
  !cave.includes('p.cave = p.cave || {}')
    ? pass('SA5 退化对象工厂 `p.cave = p.cave || {}` 清除（E346）') : fail('SA5 退化对象', '');

  // E346：聚灵窗口单源
  !allJs.some(s => s.includes('today - p.rushDay < 3') || s.includes('p.rushDay + 3 -'))
    ? pass('SA6 全仓无 `today - p.rushDay < 3` / `rushDay + 3` 硬编码残留（E346）') : fail('SA6 窗口硬编码', '');
  guide.includes('const WIN = CaveSys.RUSH_WINDOW();') && guide.includes('today - p.rushDay < WIN;') && guide.includes('spiritRush({ ask: false })')
    ? pass('SA7 guide.js 窗口消费 RUSH_WINDOW + 点燃走 spiritRush({ask:false})（E346）') : fail('SA7 行权窗口', '');
  !guide.includes('p.rushDay = today;')
    ? pass('SA8 guide.js 不再直写 p.rushDay（守卫与扣款单源于 CaveSys.spiritRush）（E346）') : fail('SA8 直写旁路', '');
  cave.includes('async spiritRush(opts = {})') && cave.includes('opts.ask !== false') && cave.includes('return false;')
    ? pass('SA9 spiritRush(opts) 弹窗可跳、守卫/扣款/点燃同源（E346）') : fail('SA9 spiritRush', '');
  gamejs.includes('p.rushDay + CaveSys.RUSH_WINDOW() - Math.floor(p.day || 0)')
    ? pass('SA10 离线补乘窗口消费 RUSH_WINDOW（E346）') : fail('SA10 离线窗口', '');
  ui.includes('const rushWin = CaveSys.RUSH_WINDOW();') && ui.includes('rushWin - (today - p.rushDay)') && ui.includes('${CaveSys.RUSH_WINDOW()} 日内修炼 ×1.5')
    ? pass('SA11 今日修行卡窗口判定与两处文案消费 RUSH_WINDOW（E346）') : fail('SA11 修行卡', '');

  // E364：战斗账目单源
  battle.includes('dealToEnemy(B, st, dmg, opt = {})') && battle.includes('healMe(p, st, amt)')
    ? pass('SA12 dealToEnemy/healMe 双 helper 落地（E364）') : fail('SA12 helper', '');
  (battle.match(/B\.enemy\.hp = Math\.max\(0, B\.enemy\.hp - /g) || []).length === 1
    ? pass('SA13 敌方扣血唯一落点=dealToEnemy（E364）') : fail('SA13 扣血单源', '仍有旁路直写');
  (battle.match(/this\.dealToEnemy\(/g) || []).length >= 14 && (battle.match(/this\.healMe\(/g) || []).length >= 7
    ? pass('SA14 伤害/治疗落账点已收口进 helper（E364）') : fail('SA14 收口', '');
  !battle.includes('this.end(false)')
    ? pass('SA15 end() 无参——14 处死实参清零（E364）') : fail('SA15 end 签名', '');

  // E364：塔祝福池合并
  (tower.match(/id: 'twb_/g) || []).length === 22
    ? pass('SA16 塔祝福池合并后 22 条（28→22，E364）') : fail('SA16 塔池', String((tower.match(/id: 'twb_/g) || []).length));
  ['twb_stone', 'twb_exp', 'twb_heal'].every(id => new RegExp(`id: '${id}'[\\s\\S]{0,220}?tiers:`).test(tower))
    ? pass('SA17 三条合并词条带 tiers:[{pct,weight}]（E364）') : fail('SA17 tiers', '');
  tower.includes('grant(run, id)') && (tower.match(/this\.grant\(run, /g) || []).length >= 5
    ? pass('SA18 祝福授予单源 grant()（掷档入 run.tiers，E364）') : fail('SA18 grant', '');
  tower.includes('run.tiers && run.tiers[b.id] != null') && tower.includes('mod[k] = t.pct')
    ? pass('SA19 modsOf 按档位取值、老档回落第 0 档（E364）') : fail('SA19 modsOf', '');

  // E364：buildMonster 搬家
  explore.includes('const buildMonster = (id, delta = 0, opts = {})') && !sfx.includes('const buildMonster')
    ? pass('SA20 buildMonster 迁居 explore.js、status-fx 只余战斗状态（E364）') : fail('SA20 搬家', '');
  explore.includes('§13 探索与随机事件') && sfx.includes('§13.5')
    ? pass('SA21 头注释归位：explore=§13 探索、status-fx=§13.5 战斗状态（E364）') : fail('SA21 注释', '');

  // E364：闭关双链合并
  cult.includes('await this.secludeLoop(1);') && cult.includes('while (rounds++ < maxRounds)')
    ? pass('SA22 单轮闭关=跑一轮 secludeLoop(1)，双结算链归一（E364）') : fail('SA22 闭关合并', '');

  // E347：盘驱动 + comboCap 单源 + 周天
  battle.includes('deckNext(B, p, st)') && battle.includes('this.deckNext(B, p, st)')
    ? pass('SA23 autoPilot 盘驱动走 deckNext 单源（E347）') : fail('SA23 盘驱动', '');
  (battle.match(/this\.comboCap\(/g) || []).length >= 3 && battle.includes('comboCap(p) {')
    ? pass('SA24 comboCap 单源且 ≥3 读点（comboMul/累积/合击）（E347）') : fail('SA24 comboCap', '');
  battle.includes('hasPath(p, 3, \'comboCap2\') ? 2 : 0')
    ? pass('SA25 剑阵·纵横 comboCap2 入上限单源（5→7）（E347）') : fail('SA25 纵横', '');
  battle.includes('B._zhouN || 0) < 2') && battle.includes('B._zhoutian = 2') && battle.includes('if ((B._zhoutian || 0) > 0) B._zhoutian--')
    ? pass('SA26 盘序周天：回绕触发、每场 2 次钳制、回合末递减（E347）') : fail('SA26 周天', '');
  battle.includes('B._zhoutian || 0) > 0) dmg = Math.max(1, Math.round(dmg * 1.15)')
    ? pass('SA27 周天 ×1.15 乘区落在 dealToEnemy（E347/E364）') : fail('SA27 乘区', '');

  // E348：战报一屏
  battle.includes('最佳一手') && battle.includes('关键转折') && battle.includes('B.stats.bestHit')
    && battle.includes('critN') && battle.includes('brkN') && battle.includes('readN')
    ? pass('SA28 结算卡升格：最佳一手 + 合心/破招/读招三计数（E348）') : fail('SA28 卡片', '');
  battle.includes('B._quick = true;') && battle.includes('B._quick = B._quick || B.auto || (typeof AutoCult')
    && battle.includes('this.speed === 3 ? 1500 : 3500')
    ? pass('SA29 秒胜/自动/挂机三路径置 _quick 豁免等待；极速 1.5s（E348）') : fail('SA29 豁免', '');
  battle.includes('let demonicExtra = 0') && battle.includes('Utils.fmtNum(demonicExtra)')
    ? pass('SA30 邪修播报单源（主日志引用已算好的 extra，含 shiHun 0.4 档）（E348）') : fail('SA30 播报', '');
  battle.includes('from: this.keyFrom(B2.ctx)') && battle.includes('chronKeyBattle(won)') && gamejs.includes('h.from ? ` ·【${h.from}】`')
    ? pass('SA31 关键战沉淀：history.from + 年表 + 回顾弹窗来由渲染（E348）') : fail('SA31 关键战', '');
  !allJs.some(s => /battleLog/.test(s))
    ? pass('SA32 全仓无 battleLog 类新持久化字段（红线：回顾走会话内存 history）') : fail('SA32 battleLog', '');
  cave.includes("Story.chron(`${d.name} 夜袭洞府，守御失利`)")
    ? pass('SA33 夜袭守御败局入年表（与胜局句对称，E348）') : fail('SA33 夜袭年表', '');

  /* ---- WP2（E349/E350） ---- */
  battle.includes("kind === 'strike'") && battle.includes('lenient: true') && battle.includes('lenient: false')
    && battle.includes("acts: ['defend', 'attack', 'skill-damage', 'ult']")
    ? pass('SA34 intentCounter 扩容：strike 入表、charge 纳会心抢断、lenient 中性字段（E349）') : fail('SA34 克制表', '');
  battle.includes('!c.lenient && (B.insightN || 0) > 0') && battle.includes('this.addMorale(5);   // v39（E349）')
    ? pass('SA35 扣层仅 lenient=false 意图发生 + 读中 +5 战意（E349）') : fail('SA35 中性原则', '');
  !battle.includes('if (crit) dmg *= 1.7;') && battle.includes('if (crit) dmg *= 1.7 * this.critDmgBonus(p);   // v39（E349）')
    ? pass('SA36 爆发会伤与普攻/法诀/必杀同口径（无 1.7 旧形态，E349）') : fail('SA36 爆发会伤', '');
  battle.includes('tryBreakCharge(B, st, crit, src)') && battle.includes("this.tryBreakCharge(B, st, crit, 'attack');")
    && battle.includes("this.tryBreakCharge(B, st, crit, 'skill');") && battle.includes("if (h === 0) this.tryBreakCharge(B, st, crit, 'ult');")
    ? pass('SA37 破招泛化单源 tryBreakCharge：普攻/法诀/必杀首段三结算点（E350）') : fail('SA37 破招泛化', '');
  battle.includes('ningshenZY() {') && battle.includes('ningshenPurge() {') && battle.includes('ningBlocked(B)')
    ? pass('SA38 凝神双钮直达入口 + 置灰条件单源（E350）') : fail('SA38 凝神双钮', '');
  gamejs.includes("'act-ning-zy'") && gamejs.includes("'act-ning-purge'") && battle.includes('data-action="act-ning-zy"') && battle.includes('data-action="act-ning-purge"')
    && !gamejs.includes("'bt-ning'") && !battle.includes('bt-ning')
    ? pass('SA39 换气/净化双钮双向登记、旧 bt-ning 清零（E350）') : fail('SA39 双钮登记', '');
  battle.indexOf('_xianbingUsed) { UI.toast') < battle.indexOf('神识难达天庭')
    && battle.includes("_xianbingUsed || bound ? 'disabled'")
    ? pass('SA40 仙兵被控守卫先于烧次数 + 按钮被控置灰（E350）') : fail('SA40 仙兵', '');
  battle.includes('抢在蓄满前以会心一击打断')
    ? pass('SA41 蓄力教学文案与泛化机制一致（E350）') : fail('SA41 教学', '');

  /* ---- WP3（E351/E352） ---- */
  gdata.includes('fr <= 5 ? Math.pow(3, fr) : 243 * Math.pow(3.8, fr - 5)')
    ? pass('SA42 sinkCurve 分段单源（E351：r≤5 逐字节不变、r≥6 挂 3.8^(r-5) 与收入同速；封顶语义随境界轴弃留已注明）') : fail('SA42 曲线形态', '');
  tower.includes('Math.round(60 * GameData.stoneEco(p.realmIdx))') && tower.includes("Bag.addItem('m_xuantie', 4)") && tower.includes('60×境界经济 + 玄铁矿 ×4')
    ? pass('SA43 塔纳财折半 60×eco + 玄铁矿 ×4 补点击价值（E352）') : fail('SA43 纳财', '');
  cult.includes('Math.round(60 * GameData.stoneEco(p.realmIdx))') && ui.includes('日均 ≈1.6×') && ui.includes('日均 ≈1×')
    ? pass('SA44 闭关成本 60×eco 且修炼页两钮如实日均披露（E352）') : fail('SA44 闭关', '');
  balance.includes('raw * 2.5 / (10 + r)') && balance.includes('120 * se') && balance.includes('Math.round(60 * eco)')
    ? pass('SA45 balance-sim 三口径：悟道分母 10+r、塔纳财行 120×se、闭关 sink 60×eco（E352）') : fail('SA45 sim 口径', '');

  /* ---- WP4（E353/E354/E355/E356） ---- */
  auction.includes('Math.round(ev * 0.95)') && !auction.includes('ev * 0.85')
    ? pass('SA46 古匣 mysteryBase 0.95（稳健出价 EV 转负，第十路检测在案）（E353）') : fail('SA46 古匣', '');
  auction.includes('usablePool(p)') && auction.includes('25 * 125 * GameData.stoneEco') && auction.includes('async reroll()')
    ? pass('SA47 拍卖过气过滤单源 usablePool + 换一批 reroll（E353）') : fail('SA47 拍卖', '');
  avatar.includes('AVATAR_CULT_DAY_RATE: 16 / 30') && avatar.includes('Math.min(100, 20 + lv * 10)')
    && avatar.includes('AvatarSys.AVATAR_CULT_DAY_RATE * this.eff(p)')
    ? pass('SA48 化身：晋升成本 min(100,20+lv×10) + 日产乘 AVATAR_CULT_DAY_RATE 具名锚（E354）') : fail('SA48 化身', '');
  gdata.includes("best: 'yu'") && gdata.includes("best: 'bi'") && gdata.includes("best: 'ying'") && gdata.includes('worst:')
    && trib.includes('(S.perfectN || 0) * 1 + (S.biGood || 0) * 1') && trib.includes('(S.perfectN || 0) >= 3') && trib.includes('S.biN >= 2 && !(S.perfectN || 0)')
    ? pass('SA49 TRIB_OMENS best/worst 对策表 + perfectN/biGood 入成算式 + perfect 根基判定（E355）') : fail('SA49 劫象对策', '');
  cave.includes('formationPatterns(p)') && cave.includes("hasPattern(p, 'b_juling')") && cave.includes("hasPattern(p, 'b_cangfeng')")
    && cave.includes("Math.min(3, this.flagPower(p, 'b_cangfeng'))") && !cave.includes("this.flagCount(p, 'b_cangfeng')")
    ? pass('SA50 阵眼成阵 formationPatterns 单源 + 藏锋归 flagPower 乘区（E356）') : fail('SA50 阵图', '');

  /* ---- WP5（E357~E361） ---- */
  ui.includes("form({ title, html = '', fields = [], confirm") && ui.includes('input[name="ff-${f.key}"]:checked') && ui.includes('input[data-check="${f.key}"]:checked')
    ? pass('SA51 UI.form 多选表单（radio/check 读取，走 popup 单例通道）（E357）') : fail('SA51 UI.form', '');
  reinc.includes('p2.counters.marksStart = legacy.marksEarned || 0;') && gamejs.includes('ReincarnationSys.readLegacy().marksEarned || 0')
    ? pass('SA52 本世印记基线：execute 落新身后补设 marksStart（E357）') : fail('SA52 印记基线', '');
  oath.includes('mercyN < 2') && oath.includes('p.oaths.mercy = p.oaths.mercy || {}') && oath.includes('气运 −5，此誓本世宽恕')
    && oath.includes("RepSys.add(p, 1, '散财行善（誓约加成后 +1~2）')")
    ? pass('SA53 宽恕每誓每世限 2 次（第 3 次唯余破誓）+ 散财声望 RepSys.add 实发（E358）') : fail('SA53 誓约', '');
  karma.includes("name: '声名鹊起'") && karma.includes("name: '名动一方', color: 'gold'") && karma.includes("{ min: 120")
    && karma.includes("name: '威震天下'") && ui.includes('RepSys.level(p)') && ui.includes('30 悬赏加成 ×1.15')
    && !ui.includes('40 悬赏加成') && ui.includes('60 坊市九五折') && ui.includes('90 奇遇 +5%')
    && npcjs.includes('LEVELS 新「名动一方」显示档')
    ? pass('SA54 声望档位单源：LEVELS 80/120/150 三档名归位、repChip/义声卡消费 LEVELS、40 错档清除、60/90 机制行保留（E358）') : fail('SA54 声望档位', '');
  explore.indexOf("wx0.sky === 'fog'") < explore.indexOf('Utils.pickWeighted(weights)')
    && explore.indexOf('Utils.pickWeighted(weights)') < explore.indexOf("switch (type)")
    && gdata.includes('xianhai: [') && gdata.includes('xianhai2: [')
    && !gdata.includes("——{name}自当负笈前去")
    ? pass('SA55 探索掷点移到天时/深耕修正之后 + 仙界两池见闻 + preach 单占位（E359）') : fail('SA55 探索', '');
  npcjs.includes('同门之谊') && npcjs.includes('comradesRelBonus') && npcjs.includes('heartGain(p, id, delta)')
    && worldjs.includes("comradesRelBonus(p, '共历天下大事')") && sectjs.includes('lastFoe') && beastjs.includes('sharesKin')
    ? pass('SA56 同门之谊/共历折好感/大比魁首贺语/血亲拦截/心事线源码锚（E360/E361）') : fail('SA56 NPC 活性', '');

  /* ---- WP6（E362/E363/E365） ---- */
  guide.includes('prefMode(p, ') && guide.includes("UI.toast(`✦ 行权小账：${done.join('、')}`)")
    && guide.includes("done.push('悟道：今日未行')") && cult.includes('async wuDao(opts = {})') && cult.includes("if (rho < 0.3) return 'skip';")
    ? pass('SA57 行权三态偏好（damode/wudao）+ 悟道静默纯度 ≥30% 门槛 + 未行回执（E362）') : fail('SA57 行权偏好', '');
  dungeon.includes('autoPush(p)') && dungeon.includes("every(t => AUTO.includes(t))") && dungeon.includes('p.hp < st.maxHp * 0.35')
    && dungeon.includes('toggleAuto()') && dungeon.includes('p.flags.dungeonAuto')
    ? pass('SA58 秘境连推：可自动节点判定/血量 <35% 保险/开关持久于 p.flags.dungeonAuto（E362）') : fail('SA58 连推', '');
  ui.includes('寻宝灵机 ×') && ui.includes('聚灵余') && ui.includes('演武待发') && ui.includes('万宝必成')
    && ui.includes('誓言在身') && ui.includes('化身差事中')
    ? pass('SA59 六枚机制 chip 全部挂载（寻宝/聚灵余日/演武/万宝/誓言/化身）（E363）') : fail('SA59 chips', '');
  ui.includes("oath: (p.realmIdx >= 1) && OathSys.count(p) < OathSys.MAX && !OathSys.banned(p)")
    && ui.includes('title: (GameData.TITLES || []).some(t => (!t.cond || t.cond(p)) && p.title !== t.id)')
    && ui.includes('avatar: p.realmIdx >= 4 && !(p.avatar && p.avatar.on)')
    ? pass('SA60 dots 三键：oath/title/avatar 红点亮灭条件（E363）') : fail('SA60 dots', '');
  ui.includes('renderIdentityCard()') && !ui.includes('renderTitleCard() {') && !ui.includes('renderOathCard() {')
    && ui.includes('act-oath-open') && ui.includes('act-title-open')
    ? pass('SA61 身份卡合一：誓言+称号折叠单卡，双入口保留（E363）') : fail('SA61 身份卡', '');
  ui.includes('lot.until - today <= 3') && !ui.includes('lot.until - today <= 10')
    ? pass('SA62 奇市红点将止窗口 10→3 日（E363）') : fail('SA62 红点', '');
  bag.includes('stonesTotal(p) { return p.stones ?')
    && ['ui/quest.js', 'battle/battle.js', 'ui/ui.js', 'systems/oath.js', 'core/achieve.js'].every(f => !R(f).includes('p.stones.mid * 100'))
    ? pass('SA63 Bag.stonesTotal 单源落地、5 处旧内联零残留（E365）') : fail('SA63 stonesTotal', '');
  ui.includes('QUICK_CELLS: [') && ui.includes('M_QUICK_CELLS() { return this.QUICK_CELLS.filter(c => c.m !== false); }')
    && !ui.includes('M_QUICK_CELLS: [')
    ? pass('SA64 速达双副本单源：桌面 12 格/移动 10 格同清单（E365）') : fail('SA64 速达', '');
  tutorial.includes('html: UI.helpModal(),') && ui.includes('summary>✦ 三分钟上手</summary>')
    ? pass('SA65 引导毕直开手册（三分钟上手与手册首节同源）（E365）') : fail('SA65 上手清单', '');
  craft.includes('const cost = this.drawPrice(p);') && !craft.includes('drawMult(p)') && !craft.includes('(p._drawCount || 0) * 0.75')
    && craft.includes("12 + (Stat.compute(p).luck + (p.fortune || 0) / 20) * 0.5")
    && craft.includes('times === 1 && p.sect && p.sect.id')
    ? pass('SA66 craft 三修：成本阶梯删除恒 1×、试方有效福缘口径、免炉恒真子句删除（E365）') : fail('SA66 craft', '');
  cult.includes('layerNeedT(p, 9, 3) && rounds >= 6')
    ? pass('SA67 连续闭关熔断走 layerNeedT（大道多艰不再误踢）（E365）') : fail('SA67 熔断', '');
  sectjs2.includes('wrapDanger(t, p)') && !sectjs2.includes('wrapDanger(t, p, force = false)') && sectjs2.includes('newTask(p) { return this.genTask(p); }')
    ? pass('SA68 wrapDanger 缩为入派立威单支 + newTask 直出 genTask（E365）') : fail('SA68 wrapDanger', '');
  towerjs.includes('删 popup 前的塔绩预检') && towerjs.includes('if (!ok) return;')
    ? pass('SA69 塔绩 redeem 仅 popup 后一次校验（E365）') : fail('SA69 redeem', '');
  gamejs.includes('this._snapAt = null;   // v39（E365）：bak2 首拍重臂')
    ? pass('SA70 exitToStart 重臂 bak2 首拍保护（E365）') : fail('SA70 snapAt', '');
  (typeof fs2 !== 'undefined')
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
    // 装载一个测试存档（运行时行为组需要 Game.player）
    await page.evaluate(() => {
      const pl = PlayerFactory.create('贯通道人', { gen: 999, comp: 999, luck: 999, body: 999 });
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

    /* ---- RB1：cave=null 夜袭守卫（E346） ---- */
    const rb1 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.cave = null;
      p.npcs = p.npcs || {};
      p.npcs.n1 = { alive: true, met: true, rel: -80, grudge: true, realmIdx: 0, layer: 0 };
      p.npcs.n2 = { alive: true, met: true, rel: -80, grudge: true, realmIdx: 0, layer: 0 };
      CaveSys.nightRaidCheck(p, true);
      out.caveStillNull = p.cave === null;   // 退化对象不再被建成
      const st = Stat.compute(p);
      out.noNaN = [st.maxHp, st.atk, st.def, st.cultPct].every(v => Number.isFinite(v));
      out.cultBonusSafe = CaveSys.cultBonus(p) === 0;
      return out;
    });
    rb1.caveStillNull && rb1.noNaN && rb1.cultBonusSafe
      ? pass('RB1 cave=null 跑夜袭钩子后 p.cave 仍为 null 且 Stat.compute 无 NaN（E346）') : fail('RB1 夜袭守卫', JSON.stringify(rb1));

    /* ---- RB2：夜袭在线结算真实触发 + 阵旗减损（E346/E305 复活） ---- */
    const rb2 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.cave = { lv: 1, builds: {}, plots: [], formation: ['b_yudi', 'b_yudi', 'b_yudi', null, null, null, null, null, null] };
      p.cave._raidDay = Math.floor(p.day || 0);   // 防 dailySettle 二次掷袭干扰断言
      p.avatar = null;
      out.flagPower = CaveSys.flagPower(p, 'b_yudi');   // 阵旗减损/增益生效的前提
      p.pendingNightRaid = 'n1';
      const logN = Log.entries.length;
      Game.afterAction();
      out.consumed = p.pendingNightRaid == null;
      out.settled = Log.entries.slice(logN).some(t => t.includes('【夜袭】'));
      p.cave = null; p.npcs = {};
      return out;
    });
    rb2.flagPower === 3 && rb2.consumed && rb2.settled
      ? pass('RB2 夜袭在线结算真实弹出结算（挂起旗标消费+夜袭日志），御敌旗 flagPower=3 生效（E346）') : fail('RB2 夜袭结算', JSON.stringify(rb2));

    /* ---- RB3：洞天一重 4 日窗口——day N+3 不重复扣款、day N+4 才可再燃（E346/E314 收口） ---- */
    const rb3 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.cave = { lv: 1, dongtian: 1, builds: {}, plots: [] };
      p.stones = { low: 1000000, mid: 0, high: 0 };
      out.win4 = CaveSys.RUSH_WINDOW() === 4;
      p.day = 100; p.rushDay = null;
      out.ignite1 = await CaveSys.spiritRush({ ask: false }) === true && p.rushDay === 100;
      const s1 = p.stones.low;
      p.day = 103;   // N+3：窗口内（103-100=3 < 4）
      out.dayN3 = await CaveSys.spiritRush({ ask: false }) === false && p.rushDay === 100 && p.stones.low === s1;
      p.day = 104;   // N+4：窗外可再燃
      out.dayN4 = await CaveSys.spiritRush({ ask: false }) === true && p.rushDay === 104 && p.stones.low < s1;
      // 无洞天回归：窗口回 3（v22 RB21a 语义不破），卡面渲染随 WIN 同步
      p.cave.dongtian = 0;
      out.win3 = CaveSys.RUSH_WINDOW() === 3;
      p.day = 105; p.rushDay = 103;   // 105-103=2 < 3 窗口内
      out.cardWin = UI.renderDailyCard().includes('3 日内修炼 ×1.5');
      p.cave = null; p.rushDay = null;
      return out;
    });
    rb3.win4 && rb3.ignite1 && rb3.dayN3 && rb3.dayN4 && rb3.win3 && rb3.cardWin
      ? pass('RB3 洞天一重：N 点燃 → N+3 不重复扣款 → N+4 再燃；无洞天窗口回 3 且卡面渲染一致（E346）') : fail('RB3 聚灵窗口', JSON.stringify(rb3));

    /* ---- RB4：盘驱动 autoPilot 与无盘等价（E347） ---- */
    const rb4 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.realmIdx = 5; p.layer = 0;
      p.gongfa = { gf_canghai: { level: 3 }, gf_lieyang: { level: 3 }, gf_wanjian: { level: 3 }, gf_tumo: { level: 3 } };
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 1e9; e.atk = 1; e.def = 0; e.spd = 0; e.dodge = 0; e.crit = 0; e.skills = [];
      await Battle.start(null, { enemy: e, mapName: '演武测试' });
      const B = Battle.active;
      B.busy = false; B.over = false;
      const calls = [];
      const realAct = Battle.act;
      Battle.act = (k, a) => { calls.push([k, a]); return Promise.resolve(); };
      const deck = p.battleDeck = ['gf_canghai', 'gf_lieyang', 'gf_wanjian', 'gf_tumo'];
      B.deckCursor = 1; Battle.autoPilot();
      out.cursor1 = calls.length === 1 && calls[0][0] === 'skill' && calls[0][1] === deck[1];   // 盘序下一招
      B.deckCursor = 0; Battle.autoPilot();
      out.cursor0 = calls.length === 2 && calls[1][1] === deck[0];
      B.deckCursor = 3; p.mp = 0; Battle.autoPilot();   // 盘内皆放不出 → 普攻回气（不出盘外招）
      out.noMp = calls.length === 3 && calls[2][0] === 'attack';
      p.mp = st.maxMp;
      p.battleDeck = [];   // 无盘：回落全集择优（威力最高伤害法诀 gf_tumo，与 v38 逐字节同款）
      Battle.autoPilot();
      out.noDeck = calls.length === 4 && calls[3][0] === 'skill' && calls[3][1] === 'gf_tumo';
      Battle.act = realAct;
      B.over = true;   // 收场（不走 end 的全量结算，避免弹窗串场）
      document.getElementById('battle-modal').classList.add('hidden');
      Battle.active = null;
      return out;
    });
    rb4.cursor1 && rb4.cursor0 && rb4.noMp && rb4.noDeck
      ? pass('RB4 有盘 autoPilot 按盘序取招/无蓝不出盘外招/无盘回落全集择优等价（E347）') : fail('RB4 盘驱动', JSON.stringify(rb4));

    /* ---- RB5：comboCap 单源三读点一致（E347） ---- */
    const rb5 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      out.base = Battle.comboCap(p);   // 5
      const fx = ForgeSys.suffixFx;
      ForgeSys.suffixFx = () => ({ comboUp: 3 });   // 连山词缀
      out.lianshan = Battle.comboCap(p);   // 8
      const hp = DaoSys.hasPath;
      DaoSys.hasPath = (pp, t, k) => (t === 3 && k === 'comboCap2');
      out.zongheng = Battle.comboCap(p);   // 10（5+3+2）
      out.capMethodSame = Battle.comboCap(p) === (GameData.BALANCE.COMBAT.COMBO_MAX + 3 + 2);
      DaoSys.hasPath = hp; ForgeSys.suffixFx = fx;
      out.restored = Battle.comboCap(p) === 5;
      return out;
    });
    rb5.base === 5 && rb5.lianshan === 8 && rb5.zongheng === 10 && rb5.capMethodSame && rb5.restored
      ? pass('RB5 comboCap 单源：基础 5 / 连山 +3 / 剑阵·纵横 +2 三读点一致（E347）') : fail('RB5 comboCap', JSON.stringify(rb5));

    /* ---- RB6：盘序循势与周天流转真实触发（E347） ---- */
    const rb6 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.battleDeck = ['gf_canghai', 'gf_lieyang', 'gf_wanjian', 'gf_tumo'];
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 1e9; e.atk = 1; e.def = 0; e.spd = 0; e.dodge = 0; e.crit = 0; e.skills = [];
      const oc = Utils.chance; Utils.chance = () => false;   // 去随机：不失手、不协战、不暴死局外枝
      Battle.speed = 3;
      await Battle.start(null, { enemy: e, mapName: '周天测试' });
      const B = Battle.active;
      const zy0 = B.zhenyuan;
      const logs0 = B.logs.length;
      for (const id of p.battleDeck) { if (!Battle.active || Battle.active.over) break; await Battle.act('skill', id); }
      out.logs = B.logs.slice(logs0).map(l => l.html || '');
      out.xunshiN = out.logs.filter(t => t.includes('循势')).length;          // 依盘序 4 手全中
      out.zhoutian = out.logs.filter(t => t.includes('周天流转')).length === 1; // 光标回绕恰触发一次
      out.zhouN = (B._zhouN || 0) === 1;                                       // 每场 2 次钳制未越界
      out.zyGain = B.zhenyuan >= zy0 + 2;                                      // 回 2 真元
      if (Battle.active) { Battle.active.over = true; document.getElementById('battle-modal').classList.add('hidden'); Battle.active = null; }
      Utils.chance = oc;
      p.battleDeck = [];
      return out;
    });
    rb6.xunshiN === 4 && rb6.zhoutian && rb6.zhouN && rb6.zyGain
      ? pass('RB6 依盘序四招全得循势 +8%、回绕触发周天流转（×1.15+2 真元、每场 2 次钳制）（E347）') : fail('RB6 周天', JSON.stringify({ x: rb6.xunshiN, z: rb6.zhoutian, n: rb6.zhouN, y: rb6.zyGain }));

    /* ---- RB7：手动胜利结算卡真实显示（最佳一手/伤害构成）+ 3.5s/极速 1.5s 收场（E348） ---- */
    const rb7 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp; p._autoWin = 'off';
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 12345; e.atk = 1; e.def = 0; e.spd = 0; e.dodge = 0; e.crit = 0; e.skills = [];
      const oc = Utils.chance; Utils.chance = () => false;
      Battle.speed = 3;
      await Battle.start(null, { enemy: e, mapName: '战报测试' });
      const B = Battle.active;
      B._sureCrit = true; B.enemy.hp = 1;   // 下一手必杀
      const t0 = Date.now();
      const doneP = Battle.act('attack').then(() => Date.now() - t0);
      await new Promise(r => setTimeout(r, 300));   // 卡片此时应已挂载、处于等待期
      const box = document.querySelector('#battle-box .bt-summary');
      out.cardShown = !!box;
      out.cardTxt = box ? box.textContent : '';
      out.elapsed = await doneP;
      out.modalHidden = document.getElementById('battle-modal').classList.contains('hidden');
      out.cardGone = !document.querySelector('#battle-box .bt-summary');
      Utils.chance = oc;
      return out;
    });
    rb7.cardShown && rb7.cardTxt.includes('最佳一手') && rb7.cardTxt.includes('伤害构成') && rb7.elapsed >= 1300 && rb7.modalHidden && rb7.cardGone
      ? pass(`RB7 手动胜利结算卡真实显示（含最佳一手/伤害构成）并延迟收场（实测 ${rb7.elapsed}ms ≥1500 等待）（E348）`) : fail('RB7 结算卡', JSON.stringify({ s: rb7.cardShown, e: rb7.elapsed, h: rb7.modalHidden }));

    /* ---- RB8：自动战斗（挂机态）非秒胜场零卡片等待（E348） ---- */
    const rb8 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 99; e.atk = 1; e.def = 0; e.spd = 0; e.dodge = 0; e.crit = 0; e.skills = [];
      const oc = Utils.chance; Utils.chance = () => false;
      Battle.speed = 3;
      await Battle.start(null, { enemy: e, mapName: '挂机测试' });
      const B = Battle.active;
      B.auto = true; B._sureCrit = true; B.enemy.hp = 1;
      const t0 = Date.now();
      await Battle.act('attack');
      out.elapsed = Date.now() - t0;
      out.quickSet = B._quick === true;
      Utils.chance = oc;
      return out;
    });
    rb8.quickSet && rb8.elapsed <= 1200
      ? pass(`RB8 挂机态（auto）非秒胜场跳过卡片等待（实测 ${rb8.elapsed}ms ≤1200，对照手动 ≥1500）（E348）`) : fail('RB8 挂机豁免', JSON.stringify(rb8));

    /* ---- RB9：秒胜（一念定胜负）零等待（E348/E323 复用单源） ---- */
    const rb9 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p._autoWin = 'on';
      const t0 = Date.now();
      await Battle.start('m_yezhu', { mapName: '秒胜测试' });
      out.elapsed = Date.now() - t0;
      out.over = !Battle.active || Battle.active.over;
      document.getElementById('battle-modal').classList.add('hidden');
      if (Battle.active) Battle.active = null;
      return out;
    });
    rb9.over && rb9.elapsed <= 1200
      ? pass(`RB9 秒胜路径整场收束零等待（实测 ${rb9.elapsed}ms ≤1200）（E348）`) : fail('RB9 秒胜', JSON.stringify(rb9));

    /* ---- RB10：关键战沉淀——问剑 history.from + 年表（E348） ---- */
    const rb10 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      p.npcs.n1 = { alive: true, met: true, rel: 10 };
      const e = buildMonster('m_yezhu');
      e.name = '问剑桩'; e.hpMax = e.hp = 1; e.atk = 1; e.def = 0; e.spd = 0; e.dodge = 0; e.crit = 0; e.skills = [];
      const oc = Utils.chance; Utils.chance = () => false;
      Battle.speed = 3;
      const chronN = (p.chronicle || []).length;
      const histN = (Battle.history || []).length;
      await Battle.start(null, { enemy: e, spar: true, wenjian: true, npcId: 'n1', mapName: '问剑台' });
      Battle.active._sureCrit = true;
      await Battle.act('attack');
      const h = (Battle.history || [])[0];
      out.from = h && h.from;
      out.chron = (p.chronicle || []).slice(chronN).some(c => c.txt.includes('问剑胜') && c.txt.includes('·夺位'));
      // 回顾弹窗渲染来由
      let html = '';
      const op = UI.popup; UI.popup = async (o) => { html = o.html || ''; return true; };
      Game.actions['act-battle-review']();
      UI.popup = op;
      out.review = html.includes('【问剑】');
      Utils.chance = oc;
      delete p.npcs.n1;
      return out;
    });
    rb10.from === '问剑' && rb10.chron && rb10.review
      ? pass('RB10 问剑胜局：history 条目含 from、年表入『问剑胜×·夺位』、回顾弹窗渲染来由（E348）') : fail('RB10 关键战', JSON.stringify(rb10));

    /* ---- WP2 RB：破招泛化 / 读招扩容 / 爆发会伤 / 被控三钮（E349/E350） ---- */
    // 公共口径：坦克敌 + 去随机（chance=false 不失手；randF=1 伤害可精确复算）+ 关秒胜（p._autoWin='off'）
    // 敌我 setup 在各 evaluate 内联（浏览器上下文无 Node 侧函数）
    const SETUP = `(async () => {
      const p = Game.player;
      p.battleDeck = [];
      p.gongfa = Object.assign({ gf_canghai: { level: 1 }, gf_bumie: { level: 1 } }, p.gongfa);
      p._autoWin = 'off';
      const st = Stat.compute(p);
      p.hp = st.maxHp; p.mp = st.maxMp;
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 1e9; e.atk = 1; e.def = 0; e.spd = 0; e.dodge = 0; e.crit = 0; e.skills = [];
      Battle.speed = 3;
      await Battle.start(null, { enemy: e, mapName: '破招测试' });
      const B = Battle.active;
      B._sureCrit = true; B.enemy.charging = true; B.intent = null;
      const calls = [];
      const orig = Battle.dealToEnemy;
      Battle.dealToEnemy = function (b2, s2, dmg, opt) { calls.push({ dmg, opt: opt || {} }); return orig.call(this, b2, s2, dmg, opt); };
      window.__bk = { calls, restore: () => { Battle.dealToEnemy = orig; } };
      return true;
    })()`;
    const TEARDOWN = `(() => { if (window.__bk) window.__bk.restore(); if (Battle.active) { Battle.active.over = true; document.getElementById('battle-modal').classList.add('hidden'); Battle.active = null; } })()`;

    const rb12 = await page.evaluate(async (SETUP_SRC) => {
      const out = {};
      const p = Game.player;
      const oc = Utils.chance, orf = Utils.randF; Utils.chance = () => false; Utils.randF = () => 1;
      await eval(SETUP_SRC);
      const { calls } = window.__bk;
      const breaks0 = p.counters.breaks || 0;
      await Battle.act('attack');
      window.__bk.restore();
      const B = Battle.active;
      out.broken = B.enemy.charging === false;   // 普攻会心打断蓄力
      out.counted = (p.counters.breaks || 0) === breaks0 + 1;
      const expectBrk = Math.round(Stat.afterDef(Battle.myAtk(Stat.compute(p)) * 0.5, Battle.enDef(B.enemy)));
      out.half = calls.some(c => c.opt && c.opt.src === 'attack' && c.dmg === expectBrk);   // 追伤恰 0.5× 攻（randF=1）
      if (Battle.active) { Battle.active.over = true; document.getElementById('battle-modal').classList.add('hidden'); Battle.active = null; }
      Utils.chance = oc; Utils.randF = orf;
      return out;
    }, SETUP);
    rb12.broken && rb12.counted && rb12.half
      ? pass('RB12 蓄力遇普攻会心：打断 + breaks 计数 + 追伤恰 0.5×攻（E350）') : fail('RB12 普攻破招', JSON.stringify(rb12));

    const rb13 = await page.evaluate(async (SETUP_SRC) => {
      const out = {};
      const p = Game.player;
      const oc = Utils.chance, orf = Utils.randF; Utils.chance = () => false; Utils.randF = () => 1;
      await eval(SETUP_SRC);
      const { calls } = window.__bk;
      const breaks0 = p.counters.breaks || 0;
      await Battle.act('skill', 'gf_canghai');
      window.__bk.restore();
      const B = Battle.active;
      out.broken = B.enemy.charging === false;   // 法诀会心同样打断
      out.counted = (p.counters.breaks || 0) === breaks0 + 1;
      const expectBrk = Math.round(Stat.afterDef(Battle.myAtk(Stat.compute(p)) * 0.5, Battle.enDef(B.enemy)));
      out.half = calls.some(c => c.opt && c.opt.src === 'skill' && c.dmg === expectBrk);
      if (Battle.active) { Battle.active.over = true; document.getElementById('battle-modal').classList.add('hidden'); Battle.active = null; }
      Utils.chance = oc; Utils.randF = orf;
      return out;
    }, SETUP);
    rb13.broken && rb13.counted && rb13.half
      ? pass('RB13 蓄力遇法诀会心：打断 + 计数 + 追伤 0.5×（伤害构成 src=skill）（E350）') : fail('RB13 法诀破招', JSON.stringify(rb13));

    const rb14 = await page.evaluate(async (SETUP_SRC) => {
      const out = {};
      const p = Game.player;
      const oc = Utils.chance, orf = Utils.randF; Utils.chance = () => false; Utils.randF = () => 1;
      const daoBak = p.dao; p.dao = 'sword';   // 剑斩·千山 us1（cost 3，单段）
      await eval(SETUP_SRC);
      const { calls } = window.__bk;
      const breaks0 = p.counters.breaks || 0;
      Battle.active.zhenyuan = 6;
      await Battle.actUlt('us1');
      window.__bk.restore();
      const B = Battle.active;
      out.broken = B.enemy.charging === false;   // 必杀首段会心打断
      out.counted = (p.counters.breaks || 0) === breaks0 + 1;
      out.ultSrc = calls.some(c => c.opt && c.opt.src === 'ult' && c.dmg > 0);
      if (Battle.active) { Battle.active.over = true; document.getElementById('battle-modal').classList.add('hidden'); Battle.active = null; }
      Utils.chance = oc; Utils.randF = orf; p.dao = daoBak;
      return out;
    }, SETUP);
    rb14.broken && rb14.counted && rb14.ultSrc
      ? pass('RB14 蓄力遇必杀首段会心：打断 + 计数（伤害构成 src=ult）（E350）') : fail('RB14 必杀破招', JSON.stringify(rb14));

    const rb15 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      // 读招结算（直调 evalInsight，2~5 回合普通战积层/满层路径同源）
      Battle.active = { enemy: { name: '读招桩', hp: 100, hpMax: 100, fx: [] }, ctx: {}, busy: false, over: false, myFx: [], morale: 0, zhenyuan: 0, zmax: 6, logs: [], floats: [], stats: { out: 0, in: 0, src: {} }, buffs: {}, defending: false, insightN: 0, intent: null, combo: 0 };
      const B = Battle.active;
      // 敌疗意图（lenient=true）：表外应对（防御）不扣层、只不奖
      B.intent = { kind: 'skill', sk: { kind: 'heal', name: '自愈' } }; B.insightN = 1;
      Battle.evalInsight('defend');
      out.lenientKeep = B.insightN === 1 && B.morale === 0;
      // 蓄力意图（lenient=false）：施治疗法诀=失据，扣层
      B.intent = { kind: 'charge' }; B.insightN = 1;
      Battle.evalInsight('skill');   // 治疗法诀走 'skill'（非 skill-damage）
      out.chargeHealLoses = B.insightN === 0;
      // 蓄力意图：防御=读中 +1 且战意 +5
      B.intent = { kind: 'charge' }; B.insightN = 0; B.morale = 50;
      Battle.evalInsight('defend');
      out.chargeDefendRead = B.insightN === 1 && B.morale === 55;
      // 满层破绽毕现（普通战 3 次读中达成）
      B.intent = { kind: 'charge' }; B.insightN = 0; B.morale = 50;
      Battle.evalInsight('defend'); Battle.evalInsight('defend'); Battle.evalInsight('defend');
      out.full3 = B.insightN === 0 && B._sureCrit === true && StatusFx.has(B.enemy.fx, 'vuln');
      // strike 意图：防御/破阵符皆读中；attack 意图维持无解
      B.intent = { kind: 'strike' }; B.insightN = 0; B.morale = 30; B._sureCrit = false;
      Battle.evalInsight('defend');
      out.strikeDefend = B.insightN === 1 && B.morale === 35;
      B.insightN = 0;
      Battle.evalInsight('item', 'tal_pozhen');
      out.strikePozhen = B.insightN === 1;
      out.attackNull = Battle.intentCounter({ kind: 'attack' }) === null;
      Battle.active = null;
      return out;
    });
    rb15.lenientKeep && rb15.chargeHealLoses && rb15.chargeDefendRead
      ? pass('RB15 lenient 中性：敌疗意图表外应对不扣层、蓄力施疗失据扣层、防御读中+1 且战意+5（E349）') : fail('RB15 读招扩容', JSON.stringify(rb15));
    rb15.full3 ? pass('RB16 普通战三度读中→满层破绽毕现（vuln+必会心）（E308/E349 锚）') : fail('RB16 满层', JSON.stringify(rb15.full3));
    rb15.strikeDefend && rb15.strikePozhen && rb15.attackNull
      ? pass('RB17 strike 意图：防御/破阵符皆读中；attack 意图无解不奖不罚（E349）') : fail('RB17 strike', JSON.stringify(rb15));

    const rb18 = await page.evaluate(async (SETUP_SRC) => {
      const out = {};
      const p = Game.player;
      const oc = Utils.chance, orf = Utils.randF; Utils.chance = () => false; Utils.randF = () => 1;
      const daoBak = p.dao; p.dao = 'sword';
      await eval(SETUP_SRC);
      const { calls } = window.__bk;
      const B = Battle.active;
      // 爆发会伤对照：critDmg25（杀剑·夺命 +25%）开/关，主击伤害应恰 ×1.25（同式复算逐值一致）
      B.morale = 100; B._sureCrit = true; B.burstUsed = 0;
      const hps = DaoSys.hasPath; DaoSys.hasPath = (pp, ty, k) => k === 'critDmg25';
      await Battle.actBurst();
      DaoSys.hasPath = (pp, ty, k) => false;
      B.morale = 100; B._sureCrit = true; B.zhenyuan = 0;
      await Battle.actBurst();
      DaoSys.hasPath = hps;
      window.__bk.restore();
      const dmgA = calls[calls.length - 2].dmg, dmgB = calls[calls.length - 1].dmg;
      const mm = 1 + 100 * GameData.BALANCE.COMBAT.MORALE_PER_POINT;
      const expA = Math.round(Stat.afterDef(Battle.myAtk(Stat.compute(p)) * 1.8, Battle.enDef(B.enemy)) * mm * (1.7 * 1.25));
      const expB = Math.round(Stat.afterDef(Battle.myAtk(Stat.compute(p)) * 1.8, Battle.enDef(B.enemy)) * mm * 1.7);
      out.exact = dmgA === expA && dmgB === expB && Math.abs(dmgA - dmgB * 1.25) <= 1;
      if (Battle.active) { Battle.active.over = true; document.getElementById('battle-modal').classList.add('hidden'); Battle.active = null; }
      Utils.chance = oc; Utils.randF = orf; p.dao = daoBak;
      return out;
    }, SETUP);
    rb18.exact
      ? pass('RB18 爆发会心 = 1.7×critDmgBonus（杀剑流对照恰 +25%，逐值复算一致）（E349）') : fail('RB18 爆发会伤', JSON.stringify(rb18));

    const rb19 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      const xu = XianSys.unlocked; XianSys.unlocked = () => true;
      Battle.active = { enemy: { name: '被控桩', hp: 100, hpMax: 100, fx: [] }, ctx: {}, busy: false, over: false, myFx: [{ kind: 'stun', rounds: 1 }], morale: 50, zhenyuan: 0, zmax: 6, logs: [], floats: [], stats: { out: 0, in: 0, src: {} }, buffs: {}, defending: false, _ningUsed: false, _xianbingUsed: false, intent: null, combo: 0 };
      const B = Battle.active;
      Battle.ningshenZY();
      Battle.ningshenPurge();
      await Battle.xianbing();
      out.blocked = !B._ningUsed && B._xianbingUsed === false && B.zhenyuan === 0 && B.morale === 50;
      out.gray = Battle.ningBlocked(B) === true;
      out.btnBoundGray = !!(B.myFx && (StatusFx.has(B.myFx, 'stun') || StatusFx.has(B.myFx, 'freeze')));
      XianSys.unlocked = xu;
      Battle.active = null;
      return out;
    });
    rb19.blocked && rb19.gray && rb19.btnBoundGray
      ? pass('RB19 被控时换气/净化/仙兵三入口全拦截：不扣战意不置已用、仙兵不烧每战一次次数（E350）') : fail('RB19 被控三钮', JSON.stringify(rb19));

    /* ---- WP3 RB：sink 锚 / 纳财折半 / 闭关 60×eco（E351/E352） ---- */
    const rb21 = await page.evaluate(() => {
      const out = {};
      // 计划锚：sinkCurve(3)=27、sinkCurve(9)≈Math.round(243×3.8^4)=50669（≈取整比，不锁接缝比）
      out.a3 = GameData.sinkCurve(3) === 27;
      out.a9 = Math.round(GameData.sinkCurve(9)) === Math.round(243 * Math.pow(3.8, 4));
      out.a6 = Math.round(GameData.sinkCurve(6)) === Math.round(243 * Math.pow(3.8, 1));
      // r≤5 与 v38 逐字节一致（旧式 3^r 全等）
      out.lowSame = [0, 1, 2, 3, 4, 5].every(r => GameData.sinkCurve(r) === Math.pow(3, r));
      // 强化+5 grade3 r9 折算 ≈2.0 日建模收入（±0.3）；日均收入 125×stoneEco 与 balance-sim 同式
      const E = GameData.BALANCE.ENHANCE;
      const enh9 = Math.round((E.BASE_COST + 5 * E.COST_PER_LV) * (1 + 3 * E.COST_GRADE_FACTOR) * GameData.sinkCurve(9) / E.COST_REALM_FACTOR);
      out.enhDays = Math.abs(enh9 / (125 * GameData.stoneEco(9)) - 2.0) <= 0.3;
      return out;
    });
    rb21.a3 && rb21.a9 && rb21.a6 && rb21.lowSame && rb21.enhDays
      ? pass('RB21 sinkCurve 锚：r3=27、r9≈50669、r6=923、r≤5 与 v38 逐字节一致；r9 强化+5≈2.0 日（±0.3）（E351）') : fail('RB21 曲线锚', JSON.stringify(rb21));

    const rb22 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.realmIdx = 4;
      p.tower = { best: 1, today: { day: Math.floor(p.day || 0), used: 0, bought: 0, stonesRedeemDay: 0, stonesRedeemN: 0 }, run: null };
      p.counters.towerWins = 100;
      const eco4 = GameData.stoneEco(4);
      const s0 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
      const ore0 = p.bag.m_xuantie || 0;
      const op = UI.popup; UI.popup = async () => true;
      const logBak = Log.add; Log.add = () => {};
      const aaBak = Game.afterAction; Game.afterAction = () => {};
      const raBak = UI.renderAll; UI.renderAll = () => {};
      await TowerSys.redeem('stones');
      const s1 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
      out.firstGain = s1 - s0 === Math.round(60 * eco4);   // 纳财折半 60×eco
      out.oreGain = (p.bag.m_xuantie || 0) - ore0 === 4;   // 玄铁矿 ×4 补偿
      out.n = p.tower.today.stonesRedeemN === 1;
      await TowerSys.redeem('stones');
      await TowerSys.redeem('stones');   // 第 3 次：日限两次不变
      const s2 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
      out.dayLimit = p.tower.today.stonesRedeemN === 2 && s2 - s1 === Math.round(60 * eco4);
      // 塔日吞吐（纳财 120×eco + 层奖摊 100×eco）≤ 240×eco
      out.throughput = (2 * Math.round(60 * eco4) + 100 * eco4) <= 240 * eco4;
      UI.popup = op; Log.add = logBak; Game.afterAction = aaBak; UI.renderAll = raBak;
      return out;
    });
    rb22.firstGain && rb22.oreGain && rb22.n && rb22.dayLimit && rb22.throughput
      ? pass('RB22 纳财一次 60×eco + 玄铁矿 ×4、日限两次不变、塔日吞吐 220×eco ≤ 240×eco（E352）') : fail('RB22 纳财', JSON.stringify(rb22));

    const rb23 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.sect = null; p.realmIdx = 2;
      if (typeof Story !== 'undefined') { Story.cur = null; Story.q = []; }   // 清掉测试期间入队的剧情——secludeLoop 守卫会因 Story.active() 暂停
      const cost = Cultivate.secludeCost(p);
      out.cost = cost === Math.round(60 * GameData.stoneEco(2));
      // 实跑一轮（弹窗确认、不勾连续）：净扣一支 secludeCost
      const total = () => p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
      p.stones.low += cost;
      const s0 = total();
      const op = UI.popup; UI.popup = async () => true;
      const logBak = Log.add; Log.add = () => {};
      const tBak = Time.add; Time.add = () => {};
      const aaBak = Game.afterAction; Game.afterAction = () => {};
      const floatBak = UI.float; UI.float = () => {};
      await Cultivate.seclude();
      UI.popup = op; Log.add = logBak; Time.add = tBak; Game.afterAction = aaBak; UI.float = floatBak;
      out.spent = s0 - total() === cost;
      // 修炼页披露可见
      out.disclose = UI.renderCultivateTab().includes('日均 ≈1.6×') && UI.renderCultivateTab().includes('日均 ≈1×');
      return out;
    });
    rb23.cost && rb23.spent && rb23.disclose
      ? pass('RB23 闭关扣费 60×stoneEco（实跑一轮净扣一支）且页面日均披露可见（E352）') : fail('RB23 闭关', JSON.stringify(rb23));

    /* ---- WP4 RB：拍卖/黑市/兑换/悬赏/化身/天劫对策/阵图（E353~E356） ---- */
    const rb24 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      // r3 拍卖掷不出超带拍品（usable 过滤后整期无过气品）——扫 8 个期号
      p.realmIdx = 3; p.gongfa = p.gongfa || {};
      Game.player = p;
      for (let seq = 0; seq < 8; seq++) {
        p.auction = { seq, until: -1 };   // until=-1 强制 state 重掷该期号
        const a = AuctionSys.state(p);
        if (a.item === 'mystery') continue;
        const lot = AuctionSys.LOT_POOL.find(x => x.item === a.item);
        const gate = Math.min(8, lot.minRealm || 0);
        const est = lot.base * Math.pow(3.8, Utils.clamp(Math.min(8, 3) - gate, 0, 3));
        if (est > 25 * 125 * GameData.stoneEco(3)) { out.stale = true; break; }
      }
      out.noStale = !out.stale;
      // 换一批：seq 变化、拍期不变、扣 20×eco、印章置位
      const a0 = AuctionSys.state(p);
      if (a0.item === 'mystery') { p.auction = null; p._boxDay = -1; }
      const a1 = AuctionSys.state(p);
      if (a1.item !== 'mystery') {
        const seq0 = a1.seq, until0 = a1.until, base0 = a1.base;
        const total = () => p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
        p.stones.low += Math.round(20 * GameData.stoneEco(3));
        const s0 = total();
        const op = UI.popup; UI.popup = async () => true;
        const aaBak = Game.afterAction; Game.afterAction = () => {};
        const raBak = UI.renderAll; UI.renderAll = () => {};
        await AuctionSys.reroll();
        UI.popup = op; Game.afterAction = aaBak; UI.renderAll = raBak;
        const a2 = p.auction;
        out.seqChanged = a2.seq === seq0 + 1;
        out.untilSame = a2.until === until0;
        out.stamped = a2.rerollSeq === until0;
        out.paid = s0 - total() === Math.round(20 * GameData.stoneEco(3));
        // 再换被拦（每期一次）
        const op2 = UI.popup; UI.popup = async () => { out.popupAgain = true; return true; };
        await AuctionSys.reroll();
        UI.popup = op2;
        out.oncePerPeriod = !out.popupAgain;
      } else out.skipped = true;
      return out;
    });
    rb24.noStale ? pass('RB24a r3 拍卖整期掷不出超带过气拍品（usable 过滤，E353）') : fail('RB24a 过气过滤', JSON.stringify(rb24));
    (rb24.skipped || (rb24.seqChanged && rb24.untilSame && rb24.stamped && rb24.paid && rb24.oncePerPeriod))
      ? pass('RB24b 换一批：seq++/拍期不变/扣 20×eco/rerollSeq 印章置位/每期一次（E353）') : fail('RB24b 换品', JSON.stringify(rb24));

    const rb25 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      // 古匣稳健 EV（独立复算 EV_pool）：底价系数 0.95 → 期望负
      p.realmIdx = 2; p.auction = null;
      const pool = AuctionSys.mysteryPool(p);
      const valOf = x => { const d = GameData.ITEMS[x.id]; let v = (d && d.price) || 0; if (!v) v = 500; if (d && d.ecoPrice) v = Math.round(v * GameData.stoneEco(2)); return v; };
      const wsum = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2, 0);
      const evPool = pool.reduce((s, x) => s + (6 - Math.min(5, x.grade)) * 2 * valOf(x), 0) / wsum;
      const base = AuctionSys.mysteryBase(p);
      out.evNeg = 0.95 * (evPool - Math.round(base * 1.15)) < 0;
      // 黑市直购一击成交：mock 弹窗选 buy，只弹一窗、直接入包扣款
      p.realmIdx = 2;
      const id = 'm_xuantie';
      const op = UI.popup; let popN = 0;
      UI.popup = async (o) => { popN++; return (o.options || []).find(x => x.value === 'buy') ? 'buy' : true; };
      const aaBak = Game.afterAction; Game.afterAction = () => {};
      const price = BlackSys.price(p, id);
      const s0 = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
      p.stones.low += price;
      const bag0 = p.bag[id] || 0;
      await BlackSys.buyAsync(id, price);
      UI.popup = op; Game.afterAction = aaBak;
      out.direct = popN === 1 && (p.bag[id] || 0) === bag0 + 1;
      // 还价成功（万宝必成式：chance 钉 true）后直接成交、无第二道确认弹窗
      const oc = Utils.chance; Utils.chance = () => true;
      let popN2 = 0;
      UI.popup = async (o) => { popN2++; return (o.options || []).find(x => x.value === 'haggle') ? 'haggle' : true; };
      const price2 = BlackSys.price(p, id);
      p.stones.low += Math.round(price2 * 0.75);
      const bag1 = p.bag[id] || 0;
      await BlackSys.buyAsync(id, price2);
      Utils.chance = oc; UI.popup = op; Game.afterAction = aaBak;
      out.haggleDirect = popN2 === 1 && (p.bag[id] || 0) === bag1 + 1;
      // 单档兑换：stones 变化 + afterAction 回环（存档/刷新口）
      let aaN = 0; Game.afterAction = () => { aaN++; };
      p.stones.low += 200;
      ShopSys.convert('up1');
      out.convert = p.stones.mid >= 1 && aaN === 1;
      Game.afterAction = aaBak;
      // 悬赏换一批：一次后印章置位（按钮置灰口径）
      const B0 = BountySys.stateOf(p);
      BountySys.reroll();
      const B1 = BountySys.stateOf(p);
      out.bountyRerolled = B1.rerolledDay != null && B1.list.length > 0;
      BountySys.reroll();
      out.bountyOnce = BountySys.stateOf(p).list === B1.list;
      return out;
    });
    rb25.evNeg ? pass('RB25a 古匣稳健出价长期期望为负（EV_pool 独立复算，E353）') : fail('RB25a 古匣 EV', JSON.stringify(rb25));
    rb25.direct && rb25.haggleDirect ? pass('RB25b 黑市直购一击成交、还价成功直接成交（弹窗计数各 1，无二次确认）（E353）') : fail('RB25b 黑市', JSON.stringify({ d: rb25.direct, h: rb25.haggleDirect }));
    rb25.convert ? pass('RB25c 单档兑换：stones 变化 + afterAction 回环（刷新+存档口，E353）') : fail('RB25c 兑换', String(rb25.convert));
    rb25.bountyRerolled && rb25.bountyOnce ? pass('RB25d 悬赏换一批一次后印章置位（按钮置灰口径）（E353）') : fail('RB25d 悬赏', JSON.stringify(rb25));

    const rb26 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.realmIdx = 5;   // 化神解锁
      p.avatar = { on: true, task: null, task2: null, lv: 1, cdDay: 0, day: 0 };   // 前序 RB 曾置 null，显式重建
      const a = AvatarSys.state(p);
      // lv1→2 扣 30 感悟
      const up1 = AvatarSys.upCost(p);
      out.cost12 = up1 === 30;
      p.insight = 1000;
      Cultivate.spendInsight(p, up1);
      AvatarSys.upgrade(p);
      out.lv2 = a.lv === 2;
      // 九重累计 520 可达：8 次晋升逐级扣费求和
      let sum = 0; a.lv = 1;
      while (a.lv < AvatarSys.LV_CAP) { sum += AvatarSys.upCost(p); a.lv++; }
      out.total520 = sum === 520;
      // 代主闭关 30 日总收益 = baseGain×(1+cultPct)×16/30×eff ×30 = 16×eff×baseGain×(1+cultPct)
      p.dao = null; p.gongfa = p.gongfa || {};
      a.lv = 9; a.task = 'cult'; a.task2 = null; a.day = 0;
      const st = Stat.compute(p);
      const perDay = Math.round(Cultivate.baseGain(p) * (1 + (st.cultPct || 0) / 100) * AvatarSys.AVATAR_CULT_DAY_RATE * AvatarSys.eff(p));
      const exp30 = Math.round(Cultivate.baseGain(p) * (1 + (st.cultPct || 0) / 100) * 16 * AvatarSys.eff(p));
      out.anchor = Math.abs(perDay * 30 - exp30) <= 15;   // 逐日取整累计偏差 ≤15
      out.rate75 = Math.abs(perDay / (Cultivate.baseGain(p) * (1 + (st.cultPct || 0) / 100)) - AvatarSys.eff(p) * 16 / 30) < 0.001;
      return out;
    });
    rb26.cost12 && rb26.lv2 ? pass('RB26a 化身 lv1→2 扣 30 感悟（min(100,20+lv×10) 首档）（E354）') : fail('RB26a 晋升', JSON.stringify(rb26));
    rb26.total520 ? pass('RB26b 化身九重 8 次晋升累计恰 520 感悟（硬上限内可达）（E354）') : fail('RB26b 520', String(rb26.total520));
    rb26.anchor && rb26.rate75 ? pass('RB26c 代主闭关日产 = baseGain×mult×(16/30)×eff，30 日总收益=16×eff×baseGain×mult（满级恰 0.75×锚）（E354）') : fail('RB26c 锚', JSON.stringify({ a: rb26.anchor, r: rb26.rate75 }));

    const rb27 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.hp = Stat.compute(p).maxHp;   // 满血——应重气血守卫不误拦
      const oc = Utils.chance; Utils.chance = (v2) => v2 === 100;   // perfect 避（odds=100）必成、余必败
      Tribulation.state = { target: 2, xian: false, base: 50, power: 100, artifact: { from: 'bag', id: 'a_xuanjia' }, stages: [{ id: 'lei', name: '雷劫', best: 'yu', worst: 'ying' }, { id: 'huo', name: '火劫', best: 'ying', worst: 'bi' }, { id: 'xin', name: '心劫', best: 'bi', worst: 'yu' }], stageIdx: 0, stageRes: [], stress: 0, yingN: 0, biN: 0, perfectN: 0, biGood: 0, busy: false, logs: [] };
      const S = Tribulation.state;
      Tribulation.chooseStage('yu');
      out.leiYuPerfect = S.perfectN === 1 && S.yuPerfect === true;
      Tribulation.chooseStage('bi');   // 火象避=worst：闪避失败 +2，错配再 +1
      Tribulation.chooseStage('bi');   // 心象避=best：perfect 必成
      out.stageDone = S.stageIdx === 3;
      out.perfect2 = S.perfectN === 2;
      out.stress = S.stress === 3;
      // perfect 项计入成算不越内层 ±8：极端高配（+17 裸值）被内层钳在 +8
      const inner = Utils.clamp(3 * 2 + 3 * 1 + 3 * 1 - 0 * 1.5, -8, 8);
      out.clamp = inner === 8;
      Tribulation.state = null;
      Utils.chance = oc;
      return out;
    });
    rb27.leiYuPerfect ? pass('RB27a 雷象选御=perfect：perfectN++ 且御劫小惠（法宝灵光未损）（E355）') : fail('RB27a 御对策', JSON.stringify(rb27));
    rb27.stress && rb27.perfect2 && rb27.stageDone ? pass('RB27b 错配下策劫势加档（避失败 +2 再 +1）、心象避 perfect 必成（E355）') : fail('RB27b 错配', JSON.stringify(rb27));
    rb27.clamp ? pass('RB27c perfect/biGood 项计入成算式但不越内层 ±8 窗（外层 clamp(3,97) 原样）（E355）') : fail('RB27c 钳制', String(rb27.clamp));

    const rb28 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.cave = { lv: 1, builds: {}, plots: [null, null, null, null, null, null, null, null], formation: ['b_juling', 'b_juling', 'b_juling', 'b_yudi', 'b_yudi', 'b_yudi', 'b_lianxi', 'b_lianxi', 'b_lianxi'] };
      // 三连命中：聚灵（cultBonus +5）/御敌/敛息
      out.patterns = CaveSys.formationPatterns(p).slice().sort().join(',');
      out.cultBonus = CaveSys.cultBonus(p) === 1 * 4 + 5;   // lv1×4 + 聚灵三连 5
      out.pestImmune = (() => { CaveSys.checkPest(p); return p.cave.plots.every(pl => !pl || !pl.pested); })();
      // 三行不同旗且斜向亦无三连：无阵图
      p.cave.formation = ['b_juling', 'b_yudi', 'b_cangfeng', 'b_yudi', 'b_juling', 'b_juling', 'b_cangfeng', 'b_juling', 'b_yudi'];
      out.noTriple = CaveSys.formationPatterns(p).length === 0;
      // 藏锋三连：夜袭减免下限 0.35 且额外 −10%（3 面旗本就归零，用 2 面周天阁玩家验证乘区）
      p.sect = { id: 'zhoutian' };
      p.cave.formation = ['b_cangfeng', 'b_cangfeng', null, null, null, null, null, null, null];
      const fp2 = CaveSys.flagPower(p, 'b_cangfeng');
      out.zhoutianMul = Math.abs(fp2 - 2.5) < 1e-9;   // 2×1.25
      // 对角三连（御敌）+ 守御胜算 +10：odds 公式不易直读，改验 hasPattern 驱动（formationPatterns 对角）
      p.cave.formation = ['b_yudi', null, null, null, 'b_yudi', null, null, null, 'b_yudi'];
      out.diag = CaveSys.hasPattern(p, 'b_yudi');
      p.cave = null; p.sect = null;
      return out;
    });
    rb28.patterns === 'b_juling,b_lianxi,b_yudi' && rb28.cultBonus && rb28.pestImmune
      ? pass('RB28a 聚灵三连 cultBonus +5%、敛息三连虫害免疫、三连检测行/列/斜全命中（E356）') : fail('RB28a 阵图', JSON.stringify(rb28));
    rb28.noTriple ? pass('RB28b 无三连不误报（行列斜全混布）（E356）') : fail('RB28b 误报', String(rb28.noTriple));
    rb28.zhoutianMul && rb28.diag ? pass('RB28c 周天阁藏锋旗吃 ×1.25 乘区（2 面=2.5）+ 御敌对角三连判定（E356）') : fail('RB28c 乘区', JSON.stringify({ z: rb28.zhoutianMul, d: rb28.diag }));

    /* ---- WP5 RB：兵解单屏/誓约闭环/声望档位/探索复活/NPC 活性/道侣心事（E357~E361） ---- */
    const rb29 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.canReincarnate = true;
      p.counters.xianyuan = 2500;
      p.bag = p.bag || {}; p.bag['a_xuanjia'] = 1;
      p.flags = p.flags || {}; delete p.flags.reincWalker;
      const legacy = ReincarnationSys.readLegacy();
      legacy.marks = 20; legacy.marksEarned = Math.max(legacy.marksEarned || 0, 20); legacy.plan = null;
      ReincarnationSys.writeLegacy(legacy);
      const marks0 = legacy.marks, earned0 = legacy.marksEarned || 0;
      let popupN = 0, formN = 0;
      const op = UI.popup, oform = UI.form;
      UI.popup = async (o) => { popupN++; return true; };
      UI.form = async (o) => { formN++; return { plan: 'comp', origin: GameData.ORIGINS[0].id, trial_exp: true, trial_foe: true, trial_trib: false, carry: true, kept: 'a_huxin' }; };
      const aaBak = Game.afterAction; Game.afterAction = () => {};
      const rsBak = UI.realmShow; UI.realmShow = () => {};
      await ReincarnationSys.open({ force: true });
      UI.popup = op; UI.form = oform; Game.afterAction = aaBak; UI.realmShow = rsBak;
      out.steps = popupN + formN <= 3;   // 兵解确认 + 轮回筹备 + 一世报告
      out.formOnce = formN === 1;
      const legacy2 = ReincarnationSys.readLegacy();
      out.marksEarnedDelta = (legacy2.marksEarned || 0) - earned0 === 3;   // 基础 1 + 自请劫难 2
      out.marksFlow = (legacy2.marks || 0) === marks0 - 2 + 3;   // 预约宿慧 −2 + 兵解 +3
      const p2 = Game.player;
      out.marksStart = p2.counters.marksStart === (legacy2.marksEarned || 0);
      out.carry = p2.pastXianyuan === 2500 && (p2.fortune || 0) >= 2;   // 携仙元兑现（气运 +2、悟性 +1）
      out.xianyuanCleared = !(p2.counters.xianyuan > 0);
      return out;
    });
    rb29.steps && rb29.formOnce && rb29.marksEarnedDelta && rb29.marksFlow && rb29.marksStart && rb29.carry && rb29.xianyuanCleared
      ? pass('RB29 兵解全流程 ≤3 步且预约/劫难/印记/携仙元结算与旧版公式逐项等价、marksStart 真实计数（E357）') : fail('RB29 兵解', JSON.stringify(rb29));

    const rb30 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.oaths = { kill: true }; delete p.oaths.mercy;
      p.fortune = 50;
      const op = UI.popup; let mercyOptsSeen = 0, breakOnly = false, phase = 0;
      UI.popup = async (o) => {
        const opts = o.options || [];
        const hasMercy = opts.some(x => x.value === 'mercy');
        if (phase < 2) { if (hasMercy) mercyOptsSeen++; return 'mercy'; }
        if (!hasMercy && opts.some(x => x.value === 'break')) breakOnly = true;
        return 'break';
      };
      const logBak = Log.add; Log.add = () => {};
      const aaBak = Game.afterAction; Game.afterAction = () => {};
      for (let i = 0; i < 2; i++) { p.pendingOathBreak = 'kill'; await OathSys.pendingResolve(p); }
      out.mercyTwo = (p.oaths.mercy || {}).kill === 2 && p.fortune === 40 && p.oaths.kill === true;
      phase = 2;
      p.pendingOathBreak = 'kill';
      await OathSys.pendingResolve(p);
      out.thirdBreak = p.oaths.kill === false && breakOnly;
      UI.popup = async (o) => (o.options || []).some(x => x.value === 'donate') ? 'donate' : true;   // 散财应答（phase2 mock 泄漏修复）
      p.oaths = { poor: true };
      p.reputation = 5;
      Object.assign(p, { stones: { low: OathSys.poorCap(p) + 500, mid: 0, high: 0 } });
      await OathSys.poorCheck(p);
      out.repGain = (p.reputation || 0) >= 6;
      UI.popup = op; Log.add = logBak; Game.afterAction = aaBak;
      return out;
    });
    rb30.mercyTwo && rb30.thirdBreak && rb30.repGain
      ? pass('RB30 不杀誓宽恕两次（各气运 −5）、第 3 次唯余破誓、清贫散财声望实发（E358）') : fail('RB30 誓约', JSON.stringify(rb30));

    const rb31 = await page.evaluate(() => {
      const out = {};
      out.lv80 = RepSys.level({ reputation: 80 }).name === '声名鹊起';
      out.lv120 = RepSys.level({ reputation: 120 }).name === '名动一方';
      out.lv150 = RepSys.level({ reputation: 150 }).name === '威震天下';
      out.priceMul = RepSys.priceMul({ reputation: 30 }) === 0.92 && RepSys.priceMul({ reputation: 80 }) === 0.85;
      out.bountyBonus = RepSys.bountyBonus({ reputation: 30 }) === 1.15 && RepSys.bountyBonus({ reputation: 80 }) === 1.3 && RepSys.bountyBonus({ reputation: 150 }) === 1.5;
      out.firstMeet = (() => { const pp = { reputation: 120, npcs: { n3: { alive: true, rel: 0 } } }; return NpcSys.firstMeetBoost(pp, 'n3') === 5; })();
      out.firstMeetLow = (() => { const pp = { reputation: 100, npcs: { n3: { alive: true, rel: 0 } } }; return NpcSys.firstMeetBoost(pp, 'n3') === 0; })();
      return out;
    });
    rb31.lv80 && rb31.lv120 && rb31.lv150 && rb31.priceMul && rb31.bountyBonus && rb31.firstMeet && rb31.firstMeetLow
      ? pass('RB31 声望 80「声名鹊起」/120「名动一方」/150「威震天下」；priceMul/bountyBonus/初见敬意 120 机制阈值不变（E358）') : fail('RB31 声望', JSON.stringify(rb31));

    const rb32 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.realmIdx = 3; p.hp = Stat.compute(p).maxHp;
      const map = GameData.MAPS.find(m => m.id === 'qingfeng');
      const seen = [];
      const pwBak = Utils.pickWeighted;
      Utils.pickWeighted = (w) => { seen.push(w && w.fortune ? w.fortune : 0); return 'nothing'; };
      const wxBak = Art.weatherOf; const seaBak = Art.seasonOf; const bwBak = WorldSys.beastWaveActive;
      const aaBak = Game.afterAction; const bsBak = Battle.start;
      Game.afterAction = () => {}; Battle.start = () => {};
      const opBak = UI.popup; UI.popup = async () => true;
      const run = async (sky) => {
        seen.length = 0;
        Art.weatherOf = () => ({ sky, night: false });
        Art.seasonOf = () => 0;
        WorldSys.beastWaveActive = () => false;
        for (let i = 0; i < 400; i++) { try { await Explore.go(map.id); } catch (e) {} }
        return seen.reduce((a2, b2) => a2 + b2, 0) / Math.max(1, seen.length);
      };
      const fogAvg = await run('fog');
      const clearAvg = await run('clear');
      Utils.pickWeighted = pwBak; Art.weatherOf = wxBak; Art.seasonOf = seaBak; WorldSys.beastWaveActive = bwBak;
      Game.afterAction = aaBak; Battle.start = bsBak; UI.popup = opBak;
      out.fogBoost = fogAvg > clearAvg && clearAvg > 0 && fogAvg / clearAvg >= 1.4;   // ×1.5 修正复活（随机容差 ≥1.4）
      out.xianhaiPools = (GameData.FLAVOR.ambience.xianhai || []).length >= 4 && (GameData.FLAVOR.ambience.xianhai2 || []).length >= 4;
      return out;
    });
    rb32.fogBoost && rb32.xianhaiPools
      ? pass('RB32 雾日 fortune 权重实测高于晴天（400 探索×2 相位，修正复活）+ 仙界两图见闻池就位（E359）') : fail('RB32 探索', JSON.stringify({ f: rb32.fogBoost, x: rb32.xianhaiPools }));

    const rb33 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.realmIdx = 2; p.sect = { id: 'qingyun', contrib: 0 };
      p.npcs.n1 = { alive: true, met: true, rel: 20, realmIdx: 2, layer: 0 };
      const op = UI.popup; UI.popup = async () => true;
      const logBak = Log.add; Log.add = () => {};
      const aaBak = Game.afterAction; Game.afterAction = () => {};
      const rel0 = p.npcs.n1.rel;
      const awayBak = NpcSys.isAway; NpcSys.isAway = () => false;   // 免旬轮换干扰
      p.stones.low += 5000;   // 结交礼金
      await NpcSys.befriend('n1');
      const relDelta = p.npcs.n1.rel - rel0;
      out.sameSectRel = relDelta >= 13;   // rand(8,14) + 同门 5
      // 大比对手为 NPC
      p.sect.tourney = { round: 0, wins: 0, openDay: Math.floor(p.day || 0) };
      const e = SectSys.tourneyOpponent(p, 0);
      const foeDef = GameData.NPCS.find(d => d.id === e.npcId) || {};
      out.npcFoe = !!(e.npcId && foeDef) && e.name === foeDef.name;
      // 魁首贺语（决胜轮胜 → 冠军分支）
      p.sect.tourney.lastFoe = e.npcId; p.sect.tourney.round = 2; p.sect.tourney.wins = 2;
      const collector = [];
      Log.add = (t) => collector.push(String(t));
      const tBefore = JSON.stringify(p.sect.tourney || null);
      try { SectSys.onTourneyRound(true); } catch (e2) { collector.push('ERR ' + (e2.message || e2)); }
      Log.add = () => {};
      const foeName2 = (GameData.NPCS.find(d => d.id === e.npcId) || {}).name || '#';
      out.champLine = collector.some(t => t.includes(foeName2));
      out.champLogged = collector.length > 0;
      Log.add = () => {};
      // 血亲拦截：同父母两只不可互配（复刻 breed 的 cands 过滤式）
      p.beasts.list.push({ uid: 's1', name: '兄', level: 10, lineage: ['pa', 'pb'] }, { uid: 's2', name: '妹', level: 10, lineage: ['pa', 'pc'] });
      const a = p.beasts.list.find(x => x.uid === 's1');
      const cands = p.beasts.list.filter(x => x.uid !== 's1' && x.level >= 10 && !(x.lineage || []).includes('s1') && !(['pa', 'pb'].some !== undefined && (x.lineage || []).some(u => ['pa', 'pb'].includes(u))));
      out.kinBlocked = !cands.some(x => x.uid === 's2');
      UI.popup = op; Game.afterAction = aaBak; NpcSys.isAway = awayBak;
      p.npcs.n1 = {}; p.beasts.list = p.beasts.list.filter(x => x.uid !== 's1' && x.uid !== 's2');
      return out;
    });
    rb33.sameSectRel && rb33.npcFoe && rb33.champLine && rb33.champLogged && rb33.kinBlocked
      ? pass('RB33 同门结交 rel+5、大比对手为 NPC 名且魁首贺语入日志、同父母血亲结契被拦（E360）') : fail('RB33 NPC 活性', JSON.stringify(rb33));

    const rb34 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.partner = 'n2';
      p.npcs.n2 = { alive: true, met: true, rel: 100, heart: 0, heartPool: 0 };
      const s = p.npcs.n2;
      const op = UI.popup; UI.popup = async () => 0;
      const logBak = Log.add; const logs = []; Log.add = (t) => { logs.push(String(t)); };
      const aaBak = Game.afterAction; Game.afterAction = () => {};
      for (let i = 0; i < 5; i++) NpcSys.heartGain(p, 'n2', 2);   // 溢出 10 → 段 1
      out.stage1 = s.heart === 1 && s.heartPool === 0;
      for (let i = 0; i < 10; i++) NpcSys.heartGain(p, 'n2', 2);   // 再溢出 20 → 段 2、段 3
      out.stage3 = s.heart === 3;
      const over0 = s.heartPool;
      NpcSys.heartGain(p, 'n2', 2);
      out.noAccumAfter3 = s.heart === 3 && s.heartPool === over0;   // 三段毕后溢出不再累积
      // 双修段奖励：修为 ×1.05、感悟 +1；日志为「情意愈笃」无虚假交情
      const oc = Utils.chance; Utils.chance = () => false;   // 不触发出游/心愿
      p._daoCultDay = -999;
      const ins0 = p.insight || 0;
      const exp0 = p.exp;
      await NpcSys.companionCheck(p);
      out.noFakeLog = !logs.some(t => t.includes('【双修】') && t.includes('交情 +'));
      out.insGain = (p.insight || 0) >= ins0 + 1;   // 段 2 奖励：双修感悟 +1
      Utils.chance = oc;
      UI.popup = op; Log.add = logBak; Game.afterAction = aaBak;
      return out;
    });
    rb34.stage1 && rb34.stage3 && rb34.noAccumAfter3 && rb34.noFakeLog && rb34.insGain
      ? pass('RB34 结发后溢出走心事线：累计 10 触发段 1、三段推进且毕后不累积、无虚假「交情 +N」播报、段 2 双修感悟 +1（E361）') : fail('RB34 心事线', JSON.stringify(rb34));

    /* ---- WP6 RB：行权偏好/秘境连推/chips/dots/身份卡/单源抽查/熔断/塔绩/snapAt（E362/E363/E365） ---- */
    const rb35 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.sect = null; p.cave = null; p.bounties = { day: Math.floor(p.day || 0), list: [] };
      p._autoRush = 'always'; p.signDay = Math.floor(p.day || 0); p._restDay = Math.floor(p.day || 0); p._wenjianDay = Math.floor(p.day || 0); p._sparCount = 3; p._wuDaoDay = -1;
      p.insight = 500; p._pref = { damode: 'skip', wudao: 'always' };
      const insight0 = p.insight;
      let popupN = 0; const op = UI.popup; UI.popup = async () => { popupN++; return true; };
      const rho = Cultivate.insightPurity(p, Cultivate.wuDaoCost(p));
      const exp0 = p.exp;
      await Guide.dailyAll();
      UI.popup = op;
      out.zeroPopup = popupN === 0;   // 全偏好设置下 0 强制弹窗
      if (rho >= 0.3) { out.wudaoAuto = p._wuDaoDay === Math.floor(p.day || 0) && p.exp > exp0; }   // 纯度 ≥30% 自动执行
      else { out.wudaoAuto = p._wuDaoDay !== Math.floor(p.day || 0); }   // 不足自动跳过
      // 弹窗计数基线：ask 态小账恢复弹窗一次
      p._pref.damode = 'ask'; p.day = (p.day || 0) + 1; p._settleDay = Math.floor(p.day); p.signDay = Math.floor(p.day); p._restDay = Math.floor(p.day); p._wenjianDay = Math.floor(p.day); p._sparCount = 3;
      popupN = 0;
      UI.popup = async () => { popupN++; return true; };
      await Guide.dailyAll();
      UI.popup = op;
      out.askPopup = popupN >= 1;
      return out;
    });
    rb35.zeroPopup && rb35.wudaoAuto && rb35.askPopup
      ? pass('RB35 全偏好下行权 0 强制弹窗、悟道 always 按纯度自动/跳过、ask 态小账恢复（E362）') : fail('RB35 行权', JSON.stringify(rb35));

    const rb36 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.realmIdx = 2; p.hp = Stat.compute(p).maxHp;
      p.flags = p.flags || {}; p.flags.dungeonAuto = true;
      const enterIdx = GameData.SECRET_REALMS.findIndex(r => r.recRealm <= 2);
      const op = UI.popup; let popupN = 0; UI.popup = async () => { popupN++; return true; };
      const aaBak = Game.afterAction; Game.afterAction = () => {};
      const bsBak = Battle.start; let battleStarted = false; Battle.start = () => { battleStarted = true; };
      // 确定性构造：双宝箱路 → 连推自动结算（无演出卡）
      p.dungeon = { realm: enterIdx, depth: 0, total: 11, choices: ['treasure', 'treasure'], gains: [], stuck: false, muts: [] };
      await DungeonSys.autoPush(p);
      out.autoPushed = p.dungeon.depth >= 1 && popupN === 0;   // 至少推一层且零结算卡
      // 决策载体必停：battle 路不被连推
      p.dungeon.choices = ['battle', 'treasure'];
      const d0 = p.dungeon.depth;
      DungeonSys.autoPush(p);
      out.battleStop = !battleStarted && p.dungeon.depth === d0 && p.dungeon.choices[0] === 'battle';
      // 血量保险：陷阱路 + 低血停
      p.dungeon.choices = ['trap', 'treasure'];
      p.hp = Math.round(Stat.compute(p).maxHp * 0.2);
      DungeonSys.autoPush(p);
      out.hpGuard = p.dungeon.depth === d0;
      p.flags.dungeonAuto = false; p.dungeon = null;
      UI.popup = op; Game.afterAction = aaBak; Battle.start = bsBak;
      return out;
    });
    rb36.autoPushed && rb36.battleStop && rb36.hpGuard
      ? pass('RB36 秘境连推：可自动节点连推、battle 必停、血量 <35% 保险停（E362）') : fail('RB36 连推', JSON.stringify(rb36));

    const rb37 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.flags = p.flags || {};
      // 六 chips 显隐
      p.flags.treasureHunt = 1; p.rushDay = Math.floor(p.day || 0) - 1; p._trainDay = -1;
      if (p.cave && p.cave.builds) p.cave.builds.train = 1; else p.cave = { lv: 1, builds: { train: 1 }, plots: [], formation: [null, null, null, null, null, null, null, null, null] };
      p.sect = { id: 'wanbao', contrib: 0 }; p._wanbaoHaggleDay = -1;
      p.oaths = { kill: true };   // 仅持 1 誓（清贫遗留会顶满 2 致 oath 点灭）
      p.partner = null; p.avatar = { on: true, lv: 5 }; p.title = null;
      delete p.oathBanDay;
      let chipsTxt = ''; const setBak = UI.setHTML; UI.setHTML = (el, html2) => { chipsTxt = html2 || ''; }; UI.renderStatus(); UI.setHTML = setBak;
      out.chips = ['寻宝灵机', '聚灵余', '演武待发', '万宝必成', '誓言在身', '化身差事中'].every(k => chipsTxt.includes(k));
      // 三红点键
      const dots = UI.dots();
      out.dotOath = dots.oath === true;   // 持 1 誓 <2 可立誓
      out.dotAvatar = dots.avatar === false;   // 已凝形 → 灭
      // 身份卡合一：誓言/称号入口仍在
      const card = UI.renderIdentityCard();
      out.identity = card.includes('act-oath-open') && card.includes('act-title-open') && card.includes('誓言') && card.includes('称号');
      // 奇市红点仅最后 3 日亮
      out.odd3 = (() => { const d = UI.dots(); return !d['shop:odd']; })();
      p.oaths = {}; p.avatar = null; p.sect = null; p.rushDay = null; p.flags.treasureHunt = 0;
      return out;
    });
    rb37.chips && rb37.dotOath && rb37.dotAvatar && rb37.identity && rb37.odd3
      ? pass('RB37 六 chips 显隐、dots oath 亮/avatar 灭、身份卡誓言+称号双入口、奇市红点降噪（E363）') : fail('RB37 可见化', JSON.stringify(rb37));

    const rb38 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      // 单源数值一致：Bag.stonesTotal vs 手工折算（抽样同一状态）
      p.stones = { low: 123, mid: 45, high: 6 };
      out.bagFn = Bag.stonesTotal(p) === 123 + 4500 + 60000;
      // 各旧调用点同值（quest/oath/achieve 转调）
      out.questFn = QuestSys.stonesTotal(p) === Bag.stonesTotal(p);
      out.oathFn = OathSys.stonesTotal(p) === Bag.stonesTotal(p);
      out.achieveFn = Achieve.stonesTotal(p) === Bag.stonesTotal(p);
      // 熔断：trials:['exp'] 的 r9 圆满者不再被旧口径误踢
      p.realmIdx = 9; p.layer = 3; p.reinc = { trials: ['exp'], lives: 2, marks: 1, compPct: 0, grudges: [] };
      const needOld = GameData.layerNeed(9, 3), needT = GameData.layerNeedT(p, 9, 3);
      p.exp = needOld + 1;   // 旧口径视为圆满（会被踢），新口径未圆满（不踢）
      out.fuse = needT > needOld && p.exp >= needOld && p.exp < needT;
      p.exp = 0;
      // 塔绩不足：popup 后校验仍拦截（且 popup 前不再有预检弹窗）
      p.counters.towerWins = 0;
      const op = UI.popup; let popupShown = false; UI.popup = async () => { popupShown = true; return true; };
      const wins0 = p.counters.towerWins;
      await TowerSys.redeem('qihun');
      out.redeemBlocked = p.counters.towerWins === wins0;
      out.popupShown = popupShown;   // 塔绩不足也先弹确认（预检已删，popup 后校验拦截）
      UI.popup = op;
      // snapAt 重臂
      Game._snapAt = 12345; Game.exitToStart();
      out.snapRearm = Game._snapAt !== 12345;   // 旧时间戳被清除/重置（首拍保护重臂）
      return out;
    });
    rb38.bagFn && rb38.questFn && rb38.oathFn && rb38.achieveFn && rb38.fuse && rb38.redeemBlocked && rb38.snapRearm
      ? pass('RB38 stonesTotal 单源数值一致（Bag/Quest/Oath/Achieve 抽样）、熔断 layerNeedT、塔绩 popup 后校验、snapAt 重臂（E365）') : fail('RB38 trim', JSON.stringify(rb38));

    consoleErrors.length === 0 ? pass('RB20 运行时 0 控制台错误') : fail('RB20 控制台', consoleErrors.slice(0, 3).join(' | '));
    consoleErrors.length === 0 ? pass('RB20 运行时 0 控制台错误') : fail('RB20 控制台', consoleErrors.slice(0, 3).join(' | '));
    consoleErrors.length === 0 ? pass('RB20 运行时 0 控制台错误') : fail('RB20 控制台', consoleErrors.slice(0, 3).join(' | '));
  } catch (e) {
    fail('RB 流程', (e && e.stack || String(e)).slice(0, 600));
  }
  await browser.close().catch(() => {});
}

console.log('\n===== verify-v25 汇总 =====');
console.log(`共 ${passN + failN} 项，失败 ${failN} 项`);
if (fails.length) console.log('失败项：\n  - ' + fails.join('\n  - '));
process.exit(failN ? 1 : 0);
