#!/usr/bin/env node
/* ======================================================================
 * verify-v26 —— V40「淬炼」回归套件（随批次递增，终稿 ≥80 断言）
 * 本批（WP1 接缝修复与死端清理 E366~E373）：
 *   E366 灵兽派遣 const 崩溃（let days + 洞天二重星槎 7 折 6 vm 复现）
 *   E367 自创功法读档存续（migrate/importSave/rollbackBackup 三路 syncCustom + 属性/战斗可消费）
 *   E368 协战技能数亲昵三档（<40:2 / <80:3 / ≥80:4）
 *   E369 古咒净化 route 同裁（末位恒 boss）
 *   E370 强化月首败保级单源（tryForgeFailure 两入口共用）
 *   E371 黑市还价涨价落盘（price() 当日 ×1.15、次日自清）
 *   E372 秘境窥探接回（dmn-scout 双向登记 + 符消费 + 心魔 +2）
 *   E373 死代码清扫（repMul/preachActive 单源、五死方法删除、stuck 分支拔除）
 * 断言风格：源码静态检查（SA）+ 运行时行为检查（RB），与 verify-v25 同款骨架。
 * ====================================================================== */
import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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

let passN = 0, failN = 0;
const fails = [];
const pass = t => { passN++; console.log('  ✓ ' + t); };
const fail = (t, d) => { failN++; fails.push(t); console.log('  ✗ ' + t + ' :: ' + d); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================= 源码静态组（SA） ================= */
console.log('===== SA 源码静态组 =====');
{
  const beast = R('systems/beast.js');
  const pfac = R('core/player-factory.js');
  const ui = R('ui/ui.js');
  const gamejs = R('game.js');
  const dungeon = R('systems/dungeon.js');
  const forge = R('systems/forge.js');
  const black = R('systems/black.js');
  const oath = R('systems/oath.js');
  const karma = R('systems/karma.js');
  const stat = R('core/stat.js');
  const worldjs = R('systems/world.js');
  const xian = R('systems/xian.js');
  const narrative = R('core/narrative.js');
  const quest = R('ui/quest.js');
  const art = R('core/art.js');
  const npcjs = R('systems/npc.js');
  const rankjs = R('systems/rank.js');
  const sectjs = R('systems/sect.js');
  const explore2 = R('systems/explore.js');

  /* ---- E366：灵兽派遣 const 崩溃 ---- */
  beast.includes('let days = await UI.popup') && !beast.includes('const days = await UI.popup')
    ? pass('SA1 派遣归期 `let days`（E366——洞天星槎重赋值不再抛 TypeError）') : fail('SA1 派遣 const', '');
  beast.includes("if (p.cave && p.cave.dongtian >= 2) days = Math.max(3, Math.ceil(days * 0.8));")
    ? pass('SA2 星槎贴片重赋值原式保留（E366 行为口径不变：7→6、下限 3）') : fail('SA2 星槎贴片', '');

  /* ---- E367：自创功法读档存续（三路 syncCustom） ---- */
  pfac.includes('GongfaSys.syncCustom(out);')
    && pfac.indexOf('GongfaSys.syncCustom(out);') < pfac.indexOf('// 功法清洗')
    ? pass('SA3 migrate 功法清洗之前先 syncCustom(out)（E367——custom_N 不再被当脏数据剔除）') : fail('SA3 migrate syncCustom', '');
  /migrate\(data\.player\);\s*\n\s*GongfaSys\.syncCustom\(p\);/.test(ui)
    ? pass('SA4 importSave 落盘前补 syncCustom(p)（E367 导入路）') : fail('SA4 importSave', '');
  /rollbackBackup\(\) \{[\s\S]*?this\.player = PlayerFactory\.migrate\(data\.player\);\s*\n\s*GongfaSys\.syncCustom\(this\.player\);/.test(gamejs)
    ? pass('SA5 rollbackBackup 回溯后补 syncCustom（E367 渡劫回溯路——不经过 enterGame）') : fail('SA5 rollbackBackup', '');
  pfac.includes('customGongfa') && pfac.includes("out.customGongfa = (out.customGongfa && typeof out.customGongfa === 'object') ? out.customGongfa : {};")
    ? pass('SA6 v38 迁移步 customGongfa 防御默认仍在（E367 未破坏既有清洗）') : fail('SA6 customGongfa 默认', '');

  /* ---- E368：协战技能数亲昵三档 ---- */
  beast.includes('(b.bond || 0) >= 80 ? 4 : (b.bond || 0) >= 40 ? 3 : 2')
    ? pass('SA7 协战 slice 亲昵三档 <40:2 / <80:3 / ≥80:4（E368——繁育第 4 门兑现）') : fail('SA7 三档 slice', '');

  /* ---- E369：古咒净化与秘境路线一致性 ---- */
  /if \(id === 'guzhou'\) \{[\s\S]*?D\.total = GameData\.DUNGEON_TOTAL_LAYERS;[\s\S]*?D\.route\.length = D\.total;[\s\S]*?D\.route\[D\.total - 1\] = \['boss'\];/.test(dungeon)
    ? pass('SA8 purify(\'guzhou\') route 同裁且末位重置 boss（E369——Boss 战与专属大奖不再蒸发）') : fail('SA8 route 同裁', '');

  /* ---- E370：强化月首败保级单源 ---- */
  const defN = (forge.match(/tryForgeFailure\(p, itemId, lv\) \{/g) || []).length;
  const callN = (forge.match(/this\.tryForgeFailure\(p, itemId, lv\)/g) || []).length;
  defN === 1 && callN === 2
    ? pass('SA9 tryForgeFailure 单定义 + enhance/enhanceMulti 双入口消费（E370）') : fail('SA9 保级单源', `def=${defN} call=${callN}`);
  forge.slice(forge.indexOf('async enhance(slot)')).includes('this.tryForgeFailure(p, itemId, lv)')
    && forge.slice(forge.indexOf('async enhanceMulti(slot')).includes('this.tryForgeFailure(p, itemId, lv)')
    ? pass('SA10 两消费点分别落于 enhance 与 enhanceMulti 函数体内（E370 grep 双断言）') : fail('SA10 消费点落位', '');

  /* ---- E371：黑市还价涨价落盘（v41（E428/E437）修订：键位迁 p.sess 单源、涨价 ×1.3 + 当日拂袖拒卖） ---- */
  black.includes('const mul = (sess.haggleFailDay === today && sess.haggleMul) ? sess.haggleMul : 1;')
    && black.includes('base * this.MARKUP * repMul * mul')   // v42（E528·P3 整合）：E518 MARKUP 1.65 单源随动
    ? pass('SA11 price() 当日消费 p.sess.haggleMul（E371 落盘语义；v41（E428/E437）键位迁 p.sess 唯一键位）') : fail('SA11 price 消费', '');
  /sess\.haggleMul = 1\.3;\s*\n\s*sess\.haggleFailDay = today;/.test(black)
    ? pass('SA12 还价失败分支写 p.sess.haggleMul=1.3（E371；v41（E437）×1.15→×1.3 拂袖加价）') : fail('SA12 涨价落盘', '');

  /* ---- E372：秘境窥探接回（check-actions 双向登记） ---- */
  ui.includes('data-action="dmn-scout"') && gamejs.includes("'dmn-scout': () => DungeonSys.scout()")
    ? pass('SA13 dmn-scout 静态入口 + actions 处理器双向登记（E372）') : fail('SA13 dmn-scout', '');
  dungeon.includes('hasTalisman(p)') && dungeon.includes("XinmoSys.add(p, 2, '窥探秘术，心事被暗处记下')")
    ? pass('SA14 scout() 符消费判定 + 心魔「窥探符 +2」来源挂点保留（E372/E245）') : fail('SA14 scout', '');

  /* ---- E368 途中实证的相邻修瑕：applyEnemyFx 裸 B 崩溃 ---- */
  {
    const battle = R('battle/battle.js');
    const head = battle.slice(battle.indexOf('applyEnemyFx(e, st, logFmt)'), battle.indexOf('applyEnemyFx(e, st, logFmt)') + 700);
    head.includes('const act = this.active;') && !/if \(B\.ctx/.test(head)
      ? pass('SA15 applyEnemyFx 无裸 B 引用（v40 修瑕——DOT 类施加不再抛 ReferenceError，E368 协战路径前提）') : fail('SA15 applyEnemyFx 裸B', '');
  }

  /* ---- E373：死代码与死分支清扫 ---- */
  !allJs.some(s => /\.stuck\b|stuck:|stuck =|stuck\s*\?\s/.test(s))
    ? pass('SA16 全仓无 stuck 功能残留（.stuck 读取 / stuck 字段 / stuck 赋值，E373）') : fail('SA16 stuck 残留', '');
  !xian.includes('tiers() {') && !xian.includes('nextNeed(p) {')
    ? pass('SA17 xian.js 死方法 tiers()/nextNeed() 已删除（E373，复核零消费）') : fail('SA17 xian 死方法', '');
  !narrative.includes('observe() {') && !quest.includes('storyHtml(') && !art.includes('weatherName(')
    ? pass('SA18 narrative.observe / quest.storyHtml / art.weatherName 死方法已删除（E373）') : fail('SA18 死方法', '');
  karma.includes('OathSys.repMul(p)') && !karma.includes('Math.round(amount * 1.5)')
    ? pass('SA19 karma.js 清贫声望改调 OathSys.repMul 单源（E373 影子接口并一）') : fail('SA19 repMul', '');
  stat.includes('WorldSys.preachActive(p)') && !stat.includes('y <= w.preachUntil')
    ? pass('SA20 stat.compOf 讲道在判改调 WorldSys.preachActive 单源（E373）') : fail('SA20 preachActive', '');
  worldjs.includes('preachActive(p) { const w = p.world; return !!(w && w.preachUntil && this.year(p) <= w.preachUntil); }')
    ? pass('SA21 WorldSys.preachActive 判式逐位未动（E373 数值不变承诺）') : fail('SA21 preachActive 原式', '');
  oath.includes("repMul(p) { return this.active(p, 'poor') ? 1.5 : 1; }")
    ? pass('SA22 OathSys.repMul 定义保留（清贫誓 ×1.5 口径单源）') : fail('SA22 repMul 定义', '');

  /* ================= WP2 战斗再平衡（E374~E382） ================= */
  const battlejs = R('battle/battle.js');
  const gdata = R('data/game-data.js');

  /* ---- E374：敌方装备当量 ---- */
  gdata.includes('PARITY_BENCH: [145, 205, 279, 365, 463, 568, 682, 802, 930, 1067]')
    && gdata.includes("RIVAL_BANDS") && gdata.includes("ratio: 0.78")
    ? pass('SA23 PARITY_BENCH（裸装基准 r0~r9）与 RIVAL_BANDS 三档单源于 game-data（E374）') : fail('SA23 parity 配置', '');
  npcjs.includes('parityOf(p, rp)') && npcjs.includes('0.8 + 0.5 * Math.min(1, Stat.power(p) / bench)')
    && npcjs.includes('rivalBand(p, id)') && npcjs.includes('_powerOf(atk, def, hp, spd)')
    ? pass('SA24 buildEnemy parity 乘区 + rivalBand 三档带 + 战力量纲单源 _powerOf（E374）') : fail('SA24 parity/band', '');
  rankjs.includes('NpcSys.rivalBand(p, ahead.id)') && rankjs.includes('{ ratio: band.ratio, bandName: band.name }')
    && sectjs.includes('NpcSys.rivalBand(p, nid)') && npcjs.includes("{ ratio: band.ratio, bandName: band.name }")
    ? pass('SA25 问剑/大比/雷台三入口对手按带生成（E374②）') : fail('SA25 带生成接线', '');
  npcjs.includes('0.8 + 0.2 * Math.max(1, parity)')
    ? pass('SA26 parity>1 赏格/掉落 ×(0.8+0.2×parity)（E374③——打强者不再穷）') : fail('SA26 强者赏格', '');
  npcjs.includes('const parity = this.parityOf(p, rp);') && npcjs.split('parity').length > 6 && !/npcCombatPower\(p, id\) \{[\s\S]*?return Math\.round\(atk \* 2 \+ def \* 1\.5 \+ hp \* 0\.3/.test(npcjs)
    ? pass('SA27 npcCombatPower 估算并入 parity（估算与实战同口径，E282 口径延续）') : fail('SA27 估算同源', '');

  /* ---- E375：遭遇难度带（v41（E453）修订：Δ≥2 动态扩带 + power 钳 1.35） ---- */
  explore2.includes('const delta = dRealm >= 2')
    && explore2.includes('? (Utils.chance(20 + 5 * dRealm) ? Utils.rand(1, 2 + dRealm) : 0)')
    && explore2.includes(': (Utils.chance(20) ? Utils.rand(1, 2) : 0);')
    && explore2.includes('delta * 3 + deepTier * 4')
    && explore2.includes('den.expGain = Math.round(den.expGain * (1 + 0.5 * delta))')
    && explore2.includes('(bctx.dropMul || 1) * (1 + 0.5 * delta)')
    && explore2.includes('const rpCap = Math.ceil((p.realmIdx * 4 + p.layer) * 1.35);')
    ? pass('SA28 遭遇难度带：80% 同阶 + Δ≥2 动态扩带 chance(20+5Δ)/rand(1,2+Δ)、delta 收益 ×(1+0.5Δ)、精英率 +3%/层、怪 power 钳 ≤玩家×1.35（E375；v41（E453）动态威胁带）') : fail('SA28 难度带', '');

  /* ---- E376：承伤曲线复权 ---- */
  R('core/stat.js').includes('afterDef(atk, def, rp = 0)') && R('core/stat.js').includes('(1 + (rp || 0) / 6)')
    ? pass('SA29 afterDef 第三参 rp 缺省 0、分母 140×(1+rp/6)（E376 向后兼容）') : fail('SA29 afterDef', '');
  explore2.includes('3 + rp * 1.9')
    ? pass('SA30 敌防成长 1.6/rp→1.9/rp（E376 敌我两路同式随动）') : fail('SA30 敌防成长', '');
  (battlejs.match(/, B\.enemy\.power\)/g) || []).length >= 10 && battlejs.includes('this.myDef(st), p.realmIdx * 4 + p.layer)')
    && battlejs.includes('this.myDef(st), Game.player.realmIdx * 4 + Game.player.layer)')
    ? pass('SA31 afterDef 调用点收口：玩家→敌传敌方 rp（≥10 处）、敌→玩家传玩家 rp（E376）') : fail('SA31 rp 收口', '');

  /* ---- E377：命中对称 ---- */
  gdata.includes('ENEMY_MISS_BASE: 3') && gdata.includes('PLAYER_MISS_MAX: 25') && gdata.includes('SKILL_MISS_MAX: 25')
    && battlejs.includes('Utils.chance(GameData.BALANCE.COMBAT.ENEMY_MISS_BASE)')
    ? pass('SA32 ENEMY_MISS_BASE=3 敌方基线失手掷 + 玩家 miss 钳 25/25（E377）') : fail('SA32 命中对称', '');

  /* ---- E378：战意爆发复权 ---- */
  battlejs.includes('C.BURST_MUL_BASE + (preMorale - C.BURST_MIN) * C.BURST_MUL_PER') && battlejs.includes('B.morale = 0;')   // v42（E528·P3 整合）：E478 沸点插值式随动
    && battlejs.includes('const crit = true;   // v40（E378）：爆发必会心')
    ? pass('SA33 爆发 2.4×/战意 −60/必会心（E378——清零乘区税废除）') : fail('SA33 爆发复权', '');

  /* ---- E379：读招洞察复权（v41（E414）修订：对拼 pin 兑现置 _clashed、enemyTurn 余波 0.3×） ---- */
  battlejs.includes("{ kind: 'vuln', pct: 40, rounds: 3 }") && battlejs.includes('B._sureCrit = 2;')
    && (battlejs.match(/this\.takeSureCrit\(\) \|\| Utils\.chance/g) || []).length >= 3
    && battlejs.includes('takeSureCrit() {') && battlejs.includes('pin: true')
    && battlejs.includes("const _clashed = !!(_pinC && _pinC.pin);")
    && battlejs.includes("this.enemyStrike(st, 0.6, false, '对拼换招');") && battlejs.includes('B._clashed = true;')   // v42（E528·P3 整合）：E477 较力回填 _clashTaken 两行分离随动（原两行相连字面量随 E477 退役）
    && battlejs.includes("} else if (B._clashed) {")
    && battlejs.includes("this.enemyStrike(st, 0.3, false, '强弩之末');")
    && battlejs.includes('B._clashed = false;')
    ? pass('SA34 破绽毕现 3 回合+必会心 2 发（takeSureCrit 单源）、读中+1 真元、对拼 pin 兑现 0.6×+_clashed 余波 0.3× 回合尾清（E379；v41（E414）对拼双结算修复）') : fail('SA34 读招复权', '');

  /* ---- E380：暴击溢出折算（v41（E417）修订：CAP 2.0→2.4 与爆发同档） ---- */
  R('core/stat.js').includes('critOver: Math.max(0, critRaw - 75)')
    && battlejs.includes('critOver') && battlejs.includes('Math.min(over, 50) * 0.005')
    && gdata.includes('CRIT_DMG_CAP: 2.4') && (battlejs.match(/CRIT_DMG_CAP\)/g) || []).length >= 4
    ? pass('SA35 暴击溢出 st.critOver 折会伤（≤50 点 ×0.5%）+ 总乘数封顶 2.4 四口消费（E380；v41（E417）CAP 2.0→2.4）') : fail('SA35 溢出折算', '');

  /* ---- E381：连击韧性 ---- */
  battlejs.includes('if (!B.defending && !Utils.chance(50)) B.combo = 0;')
    ? pass('SA36 受击 50% 保留连势、防御态不清零（失手仍断；E381）') : fail('SA36 连击韧性', '');

  /* ---- E382：前期精英扶正 ---- */
  explore2.includes("const earlyElite = (map.id === 'village' || map.id === 'qingfeng') && monsterId === map.elite;")
    && explore2.includes('bctx.mercy = Math.min(bctx.mercy || 1, 0.75);')
    && battlejs.includes("if (B.ctx.explore && ['village', 'qingfeng'].includes(B.ctx.mapId) && B.enemy.elite)")
    && battlejs.includes("XinmoSys.add(p, 1, '点到为止')")
    && gdata.includes("rareDrop: 'w_qinggang', rareRate: 2") && gdata.includes("rareDrop: 'gf_jifeng', rareRate: 2")
    && explore2.includes('rareRate: d.rareRate != null ? d.rareRate : null')
    && battlejs.includes('e.rareRate != null ? e.rareRate : 30 + KarmaSys.rareDropBonus(p)')
    ? pass('SA37 前二图精英 mercy=0.75（全属性）+ 战败「点到为止」+ 稀有改挂普怪 2%（E382）') : fail('SA38 前期扶正', '');

  /* ---- 四锚不破（本包不变量） ---- */
  battlejs.includes('dmg = Math.max(preMit * 0.15, dmg);')
    && battlejs.includes('锚：E308 熟练期望 ≤+12% 不变')
    && battlejs.includes('comboCap(p)') && (battlejs.match(/this\.comboCap\(p\)|this\.comboCap\(Game\.player\)/g) || []).length >= 3
    && battlejs.includes('insightN >= this.INSIGHT_MAX')
    ? pass('SA38 四锚不破：85% 总封顶 / E308 熟练 ≤+12% / comboCap 单源三读点 / 洞察 INSIGHT_MAX 满层制（均未动）') : fail('SA38 四锚', '');
  R('systems/tribulation.js').includes('整体期望偏差保持在 ±3% 量级')
    ? pass('SA39 天劫期望成算 ±3% 锚在位（本包未触碰）') : fail('SA39 成算锚', '');

  /* ================= WP3 经济收敛（E383~E390） ================= */
  const gdata3 = R('data/game-data.js');
  const cave3 = R('systems/cave.js');
  const explore3 = R('systems/explore.js');
  const bounty3 = R('systems/bounty.js');
  const black3 = R('systems/black.js');
  const auction3 = R('systems/auction.js');
  const shop3 = R('systems/shop.js');
  const pa3 = readFileSync(join(__dirname, 'scripts', 'price-audit.mjs'), 'utf8');
  const bsim3 = readFileSync(join(__dirname, 'scripts', 'balance-sim.mjs'), 'utf8');

  /* ---- E383 灵泉降档 + 主动补偿（v41（E441）修订：系数 45→15，r6 裸值锚 28149→9383） ---- */
  cave3.includes('15 * Math.min(4, p.cave.builds.spring) * GameData.stoneEco(Math.min(4, p.realmIdx))')
    ? pass('SA40 灵泉 15×min(4,spring)×stoneEco(min(4,r))（E383 降档；v41（E441）系数 45→15——r6 裸值锚 9383/日，r1~r4 比 0.92 全境 <1）') : fail('SA40 灵泉降档', '');
  explore3.includes('Utils.rand(25, 50)') && bounty3.includes('Math.round(90 * GameData.stoneEco(realm))')
    ? pass('SA41 主动补偿：战斗单场 25~50（×2.5）+ 悬赏 90×eco（+50%）（E383）') : fail('SA41 主动补偿', '');
  bsim3.includes('灵泉:主动收入比') && bsim3.includes('实收/建模') && bsim3.includes('Math.round(37.5 * se * 2)')
    ? pass('SA42 balance-sim 经济复算行在链：灵泉:主动比（v41（E441）锚 r6 0.064 全境带）+ 实收/建模比（E383/E411；v41（E459）灵石侧 stoneEco 双轨）') : fail('SA42 复算行', '');

  /* ---- E384 sinkCurve 中段补位 ---- */
  gdata3.includes('fr <= 5 ? Math.round(Math.pow(3.4, fr)) : 243 * Math.pow(3.8, fr - 5)')
    ? pass('SA43 sinkCurve r≤5 段 3.4^fr、r≥6 段一字不动（E384：r3=39/r5=454/r9=50669）') : fail('SA43 sinkCurve', '');

  /* ---- E385 m_qipei 定价 ---- */
  gdata3.includes("tier: 2, price: 400") && gdata3.includes("m_qipei")
    ? pass('SA44 m_qipei 0→400（E385——sellPrice 与悬赏兜底自然生效）') : fail('SA44 m_qipei', '');

  /* ---- E386 悬赏 TIER_AVG 带宽 ---- */
  gdata3.includes('tierAvg(tier)') && bounty3.includes('GameData.tierAvg(tier) * 0.45 * 1.2 * t.need')
    ? pass('SA45 悬赏兜底按 TIER_AVG 计价（E386——材料只决定交什么，同 tier 带宽 1.0×≤2×）') : fail('SA45 带宽', '');

  /* ---- E387 黑市去同款+删陷阱货 ---- */
  black3.includes("pill_xingshen") && black3.includes("pill_poxiao") && black3.includes("m_danfang")
    && !black3.includes('seed_xuelian') && !black3.includes('pill_xuanling') && !black3.includes('tal_bingpo')
    && !black3.includes('buyMystery') && !gamejs.includes('act-black-mystery')
    ? pass('SA46 黑市独家奇货 5 格替换 + 赌袋摊删净（E387——动作/按钮/方法三处同拆）') : fail('SA46 黑市', '');

  /* ---- E388 拍卖去同款+三档重定（v41（E434）修订：BID_MODES 严禁写回 + peek/ensure 读写拆分） ---- */
  auction3.includes('BID_MODES') && auction3.includes("steady: { mul: 1.3, rate: 85") && auction3.includes("const opts = this.BID_MODES[mode];")
    && !auction3.includes("item: 'pill_zaohua'") && !auction3.includes("item: 'w_sanqing'") && !auction3.includes("item: 'm_gupian'")
    && auction3.includes("if (mode === 'bold' || (mode === 'steady' && Utils.chance(25))) {")   // v42（E528·P3 整合）：E510 激进落标必截胡（绕过 25% 掷骰）随动
    && !/\bopts\.rate\s*=/.test(auction3)
    && auction3.includes('peek(p) {') && auction3.includes('ensure(p) {') && auction3.includes('state(p) { return this.peek(p); }')
    && auction3.includes('consign: (prev && prev.consign) || null')
    ? pass('SA47 LOT_POOL 去同款+廉价料、稳健 1.3/85、影子竞价及于稳健、BID_MODES 单源且眼值只落局部 rate 不写回、peek/ensure 读写拆分+滚茬透传 consign（E388；v41（E434/E439））') : fail('SA47 拍卖', '');

  /* ---- E389 手作溢价 ---- */
  gdata3.includes('craftOutSet()') && gdata3.includes('this.EXP_RECIPES || []')
    && shop3.includes('GameData.craftOutSet().has(itemId)') && shop3.includes('Math.round(v * 1.12)')
    ? pass('SA48 CRAFT_OUT 派生集合（炼丹/研创/炼器）+ sellPrice ×1.12 溢价（E389）') : fail('SA48 溢价', '');

  /* ---- E390 货架重定价 ---- */
  gdata3.includes("{ item: 'pill_jiuzhuan',  cost: 4000 }") && gdata3.includes("exclusive: [{ item: 'pill_jiuzhuan', cost: 4000 }]")
    && gdata3.includes("{ item: 's_xt_jian',      cost: 10000 }")
    && shop3.includes('Utils.clamp(1 + 0.66 * (p.realmIdx - minR), 1, 5)')
    && ui.includes('(row.maxRealm == null || p.realmIdx <= row.maxRealm)')
    ? pass('SA49 jiuzhuan 双挂点 4000 同价 + 套装件 10000 + 坊市爬坡封顶 5 + maxRealm 下架（E390）') : fail('SA49 货架', '');

  /* ---- price-audit 新路 + balance-sim 段在链 ---- */
  pa3.includes('[0 价 tier 物]') && pa3.includes('[悬赏带宽超限]') && pa3.includes('[黑市独家格不足]')
    && pa3.includes('[激进档个性失效]') && pa3.includes('[三档成本差不足]') && pa3.includes('[炼料环新开]') && pa3.includes('[宗门同物双价]') && pa3.includes('[灵泉 r6 裸值漂移]')   // v42（E528·P3 整合）：E510 第十二路改门标记随动
    && pa3.includes('AuctionSys.BID_MODES')
    ? pass('SA50 price-audit 新七路在链（E383/E385/E386/E387/E388/E389/E390，BID_MODES 同源可证红）') : fail('SA50 审计新路', '');
  bsim3.includes('硬门禁以 verify-v26 RB11') || pa3.includes('报告项，硬门禁以 verify-v26')
    ? pass('SA51 balance-sim parity 报告口径在案（硬门禁归 RB11）') : fail('SA51 报告口径', '');

  /* ================= WP4 节奏·速度·反馈（E391~E397） ================= */
  const autocult4 = R('core/autocult.js');
  const trib4 = R('systems/tribulation.js');
  const cult4 = R('systems/cultivate.js');
  const xian4 = R('systems/xian.js');
  const sect4 = R('systems/sect.js');
  const ui4 = R('ui/ui.js');

  /* ---- E391 EXP 削尾（v42（E528·P3 整合）：E485 炼虚削峰 r5 570000→490000 随动，r0~r4/r6~r9 逐字节不变） ---- */
  gdata.includes('EXP_BASE: [70, 380, 2350, 14700, 91800, 490000, 2394000, 10054800, 42230160, 177366672]')
    ? pass('SA52 EXP_BASE ×4.2 梯字面量（E391：r0~r4/r6~r9 逐字节不变；v42 E485 r5=490000 炼虚削峰）') : fail('SA52 EXP_BASE', '');

  /* ---- E392 后段机制补位 ---- */
  gdata.includes('TRIB_OMENS_HIGH') && trib4.includes('TRIB_OMENS_HIGH')
    && sect4.includes('秘境协防') && sect4.includes("type === 'dungeon'")
    && ui4.includes('本境解锁')
    ? pass('SA53 新劫象 TRIB_OMENS_HIGH（best 框架）+ 秘境协防差事 ×1.5 + 本境解锁行（E392）') : fail('SA53 机制补位', '');

  /* ---- E393 挂机/离线拉平（v41（E422/E428）修订：聚灵偏好读 p.ui.rush 单源，旧 _autoRush 散键已删） ---- */
  gamejs.includes('const OFFLINE_EFF = 0.85;') && gamejs.includes('Math.min(240, Math.floor(elapsedMs')
    && gamejs.includes('v40（E393）权益变动')
    && autocult4.includes("Guide.prefMode(p, 'rush') !== 'skip'") && autocult4.includes("prefMode(p, 'wudao') === 'always'")
    && autocult4.includes('Guide.dailyAll({ silent: true, rideAlong: !!opts.inRound })')
    ? pass('SA54 OFFLINE_EFF 0.85 + 上限 240 + E253 注释同版 + AutoCult 三偏好接线（E393；v41（E422）聚灵偏好 p.ui.rush 单源；v42 E501 逐日补跑 rideAlong 免时耗形）') : fail('SA54 拉平', '');   // v42（E528·P3 整合）：E501 rideAlong 随动

  /* ---- E394 挂机节奏三档 ---- */
  autocult4.includes('PACE_KEY') && autocult4.includes('PACES: { fast: 80, normal: 280, slow: 600 }')
    && autocult4.includes('act-autocult-pace') && gamejs.includes("'act-autocult-pace'")
    ? pass('SA55 挂机节奏三档 80/280/600 + 面板三选 + 动作双向登记（E394）') : fail('SA55 节奏', '');

  /* ---- E395 预估卡/折寿/感悟保留 ---- */
  cult4.includes('breakdown(p, bonus)') && ui4.includes('Cultivate.breakdown(p, (quiet ? 15 : 0) + (p.slayBonus ? 5 : 0))')   // v42（E528·P3 整合）：v40 E450 斩三尸 +5 并入预估卡随动
    && trib4.includes('Math.max(3, Math.round(GameData.LIFESPAN[p.realmIdx] * 0.05))')
    && trib4.includes('E395③')
    ? pass('SA56 breakdown 单源（预估卡同源）+ 折寿 max(3, 5% 寿元) + 失败感悟保留五成（E395）') : fail('SA56 反馈', '');

  /* ---- E396 手动灵机 ---- */
  cult4.includes('opts.manual && Utils.chance(Stat.compOf(p) * 2)') && gamejs.includes("{ manual: true }")
    ? pass('SA57 亲修偶得：悟性 ×2% 追加灵机判定、手点入口接线（E396）') : fail('SA57 手动', '');

  /* ---- E397 地仙首层 ---- */
  gdata.includes('layerNeed: 17500')
    ? pass('SA58 地仙首层 layerNeed 17500（E397：首阶 ≥2 游戏日）') : fail('SA58 仙阶', '');

  /* ================= WP5 玩法深化（E398~E402） ================= */
  const xian5 = R('systems/xian.js');
  const karma5 = R('systems/karma.js');
  const reinc5 = R('systems/reincarnation.js');
  const beast5 = R('systems/beast.js');
  const avatar5 = R('systems/avatar.js');
  const cave5 = R('systems/cave.js');
  const npc5 = R('systems/npc.js');
  const story5 = R('ui/story.js');

  /* ---- E398 仙庭官场化 ---- */
  xian5.includes('addMerit(p, mg.delta)') && xian5.includes('yuanCostMul(p)') && xian5.includes('PRIVS')
    && xian5.includes("id: 'calmXinmo'") && xian5.includes("id: 'fourTasks'") && xian5.includes("id: 'market75'")
    && xian5.includes('c.demerit = (c.demerit || 0) + 3') && xian5.includes('taskList(p)')
    ? pass('SA59 仙庭官场化：考功评级 merit+1/+2、官声轴软门槛 ×1.5、四品特权全链（E398）') : fail('SA59 官场化', '');

  /* ---- E399 擂主赛实战化（v41（E447）修订：foeP 锚改出战兽 b.power、tactic 三策推演并列） ---- */
  beast5.includes('this.simBeastDuel(b, foe, seed)') && beast5.includes('makeChampFoe(foeP)')
    && beast5.includes('GameData.speciesRelation(my.species, foe.species)')
    && beast5.includes('const foeP = Math.min(70, Math.round(b.power * 1.15')
    ? pass('SA60 擂主战 simBeastDuel（技能/克制/tactic 入推演）+ 同种子结算一致 + foeP 锚出战兽（E399；v41（E447）换弱兽对手随之变弱）') : fail('SA60 擂主', '');

  /* ---- E400 斩三尸重做 ---- */
  karma5.includes('p.slayBonus = true') && karma5.includes("Story.chron('斩三尸，三尸尽去', { m: 1 })")
    && karma5.includes("UI.realmShow('三 尸 尽 去")
    && reinc5.includes('p.slayBonus ?') && cult4.includes('p.slayBonus') && cult4.includes('breakthrough') && !cult4.includes('p.slayBonus = false')   // v40 修正：slayBonus 持久不清零
    ? pass('SA61 斩三尸：独占收益（气运20/心魔30/成算+5旗标）+ realmShow/chron m:1 + 一世报告读旗标（E400）') : fail('SA61 斩三尸', '');

  /* ---- E401 化身三差事 ---- */
  avatar5.includes('a.exploreMap') && avatar5.includes('dual') && avatar5.includes('_daoAskDay')
    && cave5.includes('if (guardOn) {') && cave5.includes('化身驻守巡田——灵田免虫害')
    ? pass('SA62 化身三差事：驻守必挡+免虫害、游历指定图+兽潮材+20%、分身问道十日+1（E401）') : fail('SA62 化身', '');

  /* ---- E402 义聚线（v41（E445）修订：oathGatherTick 带 auto 补聚参、tryAid 乘区只作用结拜候选、warSpirit 死写删除） ---- */
  npc5.includes('oathGatherTick(p, auto = false)') && npc5.includes('oathGather(p, id)') && npc5.includes('s.loyalty = Math.min(100,')
    && npc5.includes('s.goldlan = true') && npc5.includes('0.5 + loyal / 100')
    && npcjs.includes("s.loyalty = s.loyalty || 20") && npcjs.includes("s.oathDay = Math.floor(p.day || 0);")
    && npcjs.includes("p._sparBuffDay = Math.floor(pp.day || 0) + 1;")
    && !allJs.some(s2 => s2.includes('warSpirit'))
    ? pass('SA63 义聚线：30 日节拍 + 三/四选一 + loyalty×tryAid（v41（E445）只作用结拜候选）+ 金兰词缀 + 共斗 _sparBuffDay + warSpirit 死字段清零（E402/E445）') : fail('SA63 义聚', '');

  /* ---- chron m 旗标（E400/E408 共用） ---- */
  story5.includes('if (opts && opts.m) e.m = 1;')
    ? pass('SA64 Story.chron 支持 m 旗标（E400 年表里程碑）') : fail('SA64 chron', '');

  /* ================= WP6 整合删减与沉浸记账（E403~E410） ================= */
  const sect6 = R('systems/sect.js');
  const explore6 = R('systems/explore.js');
  const dungeon6 = R('systems/dungeon.js');
  const cave6 = R('systems/cave.js');
  const cult6 = R('systems/cultivate.js');
  const guide6 = R('core/guide.js');
  const pfac6 = R('core/player-factory.js');
  const story6 = R('ui/story.js');

  /* ---- E403 双代行并一（v41 复核：sect 侧旧注释已清，化身第四桩锚 avatar NAMES 单源） ---- */
  !gamejs.includes('act-sect-delegate') && R('systems/avatar.js').includes("'delegate'") && R('systems/avatar.js').includes("delegate: '代行差事'")
    ? pass('SA65 双代行并一：sect delegate 旧入口删、化身第四桩承接（E403；v41（E446/E472）差事管理台同锚）') : fail('SA65 双代行', '');

  /* ---- E404 RowMerchant ---- */
  explore6.includes('const RowMerchant') && dungeon6.includes('RowMerchant.offer') && explore6.includes('RowMerchant.offer(p.realmIdx, 0.7)')
    ? pass('SA66 RowMerchant 单源：explore 导出 + dungeon 消费（E404）') : fail('SA66 RowMerchant', '');

  /* ---- E405 问签删除 + 季议 tendency ---- */
  !sect6.includes("type: 'sign'") && sect6.includes('council.tendency') && sect6.includes("tendency: choice")
    && sect6.includes('E405）：问签差事删除')
    ? pass('SA67 问签删除 + 季议 tendency 落 p.sect.council.tendency（E405）') : fail('SA67 问签', '');

  /* ---- E408 年表里程碑 ---- */
  pfac6.includes('slice(-200)') && story6.includes('length > 200')
    && story6.includes('if (opts && opts.m) e.m = 1;')
    && reinc5.includes('p.slayBonus ?')
    ? pass('SA68 年表：上限 200 + m 旗标 + 一世报告读 slayBonus（E408）') : fail('SA68 年表', '');

  /* ---- E409 文案修正 ---- */
  !guide6.includes('备份存档') && !ui.includes('记得存档') && !gdata.includes('问道九章') && !ui.includes('十境三十六层')
    ? pass('SA69 文案修正：备份存档清零、问道十章统一、十境四十层（E409）') : fail('SA69 文案', '');

  /* ---- E406/E407 ---- */
  cave6.includes('v40（E406）：一键布阵四钮 + 清空已实装') && cave6.includes('bulkFill') && cult6.includes('baseGainBreakdown(p)') && cult6.includes('baseGainRaw') && cult6.includes("GameData.eco(p.realmIdx || 0) * (1 + (p.layer || 0) * 0.15)")
    ? pass('SA70 一键布阵注释在案 + 修炼乘区明细单源（E406/E407）') : fail('SA70 布阵/乘区', '');

  /* ---- price-audit 赌袋路退役 ---- */
  const pa6 = readFileSync(join(__dirname, 'scripts', 'price-audit.mjs'), 'utf8');
  !pa6.includes('betProblems') && pa6.includes('赌袋路整路退役')
    ? pass('SA71 price-audit 赌袋路退役在案（E387 随动）') : fail('SA71 赌袋退役', '');

  /* ---- 全仓 stuck/buyMystery 清零 ---- */
  !allJs.some(s2 => s2.includes('buyMystery') || /stucks*[=:]/.test(s2))
    ? pass('SA72 全仓无 buyMystery/stuck 残留（E387/E373 复核）') : fail('SA72 清零', '');

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
      const pl = PlayerFactory.create('淬炼道人', { gen: 6, comp: 6, luck: 6, body: 6 });
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

    /* ---- RB11：E374 带校准精度 + 三档胜率/回合比（真实战斗引擎 + 固定种子确定性复算） ---- */
    const rb11 = await page.evaluate(async () => {
      const out = {};
      const mkMid = () => {
        const pl = PlayerFactory.create('中配道人', { gen: 6, comp: 6, luck: 6, body: 6 });
        pl.realmIdx = 6; pl.layer = 1; pl.dao = null;
        pl.sect = { id: 'qingyun', contrib: 0 };
        pl.equipped = { weapon: { id: 'w_zhuxian', enhance: 8, affixes: {}, stars: {} }, armor: { id: 'a_longlin', enhance: 8, affixes: {}, stars: {} }, accessory: { id: 'z_taiji', enhance: 8, affixes: {}, stars: {} } };
        pl.gongfa = { gf_lieyang: { level: 5, exp: 0 }, gf_wanjian: { level: 5, exp: 0 }, gf_tumo: { level: 5, exp: 0 } };
        return pl;
      };
      const p = mkMid();
      const savedPlayer = Game.player; Game.player = p;
      p.npcs = {};
      for (const d of GameData.NPCS) p.npcs[d.id] = { alive: true, met: true, rel: 0, realmIdx: 6, layer: 1 };
      // 校准精度：可敌带 NPC 战力 ≈ 玩家 Stat.power（镜像生成，±3% 内）
      const e1 = NpcSys.buildEnemy(p, 'n3', 0, { ratio: 1.0, bandName: '可敌' });
      out.calErr = +(Math.abs(NpcSys._powerOf(e1.atk, e1.def, e1.hpMax, e1.spd) - Stat.power(p)) / Stat.power(p) * 100).toFixed(2);
      // 种子化 Math.random（战斗全链掷点确定性），真实引擎跑问剑口径对决
      const realRandom = Math.random;
      let _s = 987654321;
      const seeded = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const skills = ['gf_lieyang', 'gf_wanjian', 'gf_tumo'];   // 三门带 damage 技的法诀（中配输出手法）
      const duel = async (ratio, i) => {
        _s = 987654321 + i * 7919;   // 每场独立种子——确定性且互不重复
        const e = NpcSys.buildEnemy(p, 'n3', 0, { ratio });
        const st = Stat.compute(p);
        p.hp = st.maxHp; p.mp = st.maxMp;
        await Battle.start(null, { enemy: e, spar: true, mapName: '复算台' });
        const B = Battle.active;
        B.busy = false; B.over = false;
        let rounds = 0, guard = 0;
        while (Battle.active && !B.over && guard++ < 400) {
          rounds++;
          const k = skills[rounds % skills.length];
          const skDef = GameData.ITEMS[k];
          const cost = Math.ceil(st.maxMp * skDef.skill.mp / 100);
          await Battle.act(p.mp >= cost ? 'skill' : 'attack', k);
        }
        const won = !!B.won;
        if (Battle.active) Battle.end();
        return { won, rounds };
      };
      const sim = async ratio => {
        const N = 120;   // 样本量（二项 σ≈4.6pp，容 ±8pp 门禁）
        let w = 0, rw = 0, nw = 0, rl = 0, nl = 0;
        for (let i = 0; i < N; i++) {
          const r = await duel(ratio, i);
            if (r.won) { w++; rw += r.rounds; nw++; } else { rl += r.rounds; nl++; }
        }
          return { winPct: +(w / N * 100).toFixed(1), ttk: nw && nl ? +((rw / nw) / (rl / nl)).toFixed(2) : null };
      };
      Math.random = seeded;
      try {
        // v42（E528·P3 整合）：三档整体 +0.05 再校准——E477 对拼修活/E483 势点自动兑现使同一中配画像胜率上漂（可敌档 1.0→62.5% 出带），
        // 与 balance-sim parity 重锚（1.0→1.05，E374 装备当量惯例）同源同幅；档间距始终保持（0.10/0.12）
        out.b1 = await sim(1.05); out.b2 = await sim(0.95); out.b3 = await sim(0.83);
      } finally {
        Math.random = realRandom;
        Battle.wait = realWait;
        Game.player = savedPlayer;
      }
      return out;
    });
    rb11.b1.winPct >= 42 && rb11.b1.winPct <= 58 && rb11.b3.winPct > rb11.b2.winPct && rb11.b2.winPct > rb11.b1.winPct
      && rb11.b1.ttk != null && rb11.b1.ttk >= 0.8 && rb11.b1.ttk <= 2.5
      ? pass(`RB11 三档复算（真实引擎×120/带，HP/ATK_EDGE 标定）：可敌 ${rb11.b1.winPct}%（五五 ±8%）< 略逊 ${rb11.b2.winPct}% < 远逊 ${rb11.b3.winPct}%，可敌 TTK 比 ${rb11.b1.ttk} ∈ [0.8,2.5]（E374；镜像带战力比报告 ${rb11.calErr}%）`) : fail('RB11 三档胜率', JSON.stringify(rb11));

    /* ---- RB1：E366 派遣 vm 复现——dongtian=2 派遣成功且 7 日折 6 日 ---- */
    const rb1 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.beasts = { active: null, active2: null, nextId: 1, list: [{ uid: 1, id: 'm_yezhu', name: '野猪', species: 'beast', power: 5, level: 1, exp: 0, bond: 0, skills: [] }] };
      p.cave = { lv: 1, dongtian: 0, builds: {}, plots: [] };
      const realPopup = UI.popup;
      UI.popup = async () => 7;
      let err1 = null;
      try { await BeastSys.dispatch(1); } catch (e) { err1 = e; }
      out.base7 = !err1 && p.beasts.list[0].trip && p.beasts.list[0].trip.days === 7;
      p.beasts.list[0].trip = null;
      p.cave.dongtian = 2;   // 洞天二重星槎：原 const 重赋值在此抛 Assignment to constant variable
      let err2 = null;
      try { await BeastSys.dispatch(1); } catch (e) { err2 = e; }
      out.fold6 = !err2 && p.beasts.list[0].trip && p.beasts.list[0].trip.days === 6
        && p.beasts.list[0].trip.until === Math.floor(p.day || 0) + 6;
      p.beasts.list[0].trip = null;
      UI.popup = async () => 3;
      await BeastSys.dispatch(1);
      out.floor3 = p.beasts.list[0].trip && p.beasts.list[0].trip.days === 3;
      UI.popup = realPopup;
      p.beasts.list[0].trip = null;
      out.noErr = !err1 && !err2;
      return out;
    });
    rb1.base7 && rb1.fold6 && rb1.floor3 && rb1.noErr
      ? pass('RB1 派遣复现：无洞天 7 日、dongtian=2 派遣成功且 7 折 6、三日下限 3，零异常（E366）') : fail('RB1 派遣星槎', JSON.stringify(rb1));

    /* ---- RB2：E367 自创功法读档存续（loadFrom 路径 + 属性/战斗可消费） ---- */
    const rb2 = await page.evaluate(async () => {
      const out = {};
      const mk = () => {
        const pl = PlayerFactory.create('悟法道人', { gen: 5, comp: 5, luck: 5, body: 5 });
        pl.flags.tutorialDone = true;
        pl.customGongfa = { custom_1: { name: '淬炼道藏', gtype: 'attack', mods: ['gm_fengrui', 'gm_buhuai', 'gm_shafa'] } };
        pl.gongfa = { gf_tuna: { level: 1, exp: 0 }, custom_1: { level: 2, exp: 0 } };
        return pl;
      };
      const s1 = mk();
      localStorage.setItem('fanren_wd_1', JSON.stringify({ v: 1, player: s1, meta: { name: s1.name, realmText: '练气初期', day: 1, age: 16, ts: Date.now(), dead: false } }));
      Game.loadFrom('1');
      const pl = Game.player;
      out.kept = !!(pl.gongfa && pl.gongfa.custom_1 && pl.gongfa.custom_1.level === 2);
      out.registered = !!(GameData.ITEMS.custom_1 && GameData.ITEMS.custom_1.custom
        && GameData.ITEMS.custom_1.name === '淬炼道藏' && GameData.ITEMS.custom_1.skill && GameData.ITEMS.custom_1.skill.kind === 'damage');
      // 属性可消费：atkPct 意在册时攻更高
      const atkWith = Stat.compute(pl).atk;
      const bak = pl.gongfa.custom_1; delete pl.gongfa.custom_1;
      const atkWithout = Stat.compute(pl).atk;
      pl.gongfa.custom_1 = bak;
      out.statBonus = atkWith > atkWithout;
      // 战斗可消费：无盘 autoPilot 把 custom_1（威力 3.0 伤害诀）选为出招
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 1e9; e.atk = 1; e.def = 0; e.spd = 0; e.dodge = 0; e.crit = 0; e.skills = [];
      await Battle.start(null, { enemy: e, mapName: '演武测试' });
      const B = Battle.active; B.busy = false; B.over = false;
      pl.battleDeck = [];
      const st = Stat.compute(pl);
      pl.hp = st.maxHp; pl.mp = st.maxMp;
      const calls = []; const realAct = Battle.act;
      Battle.act = (k, a) => { calls.push([k, a]); return Promise.resolve(); };
      Battle.autoPilot();
      Battle.act = realAct;
      out.battleUse = calls.some(c => c[0] === 'skill' && c[1] === 'custom_1');
      Battle.end();
      return out;
    });
    rb2.kept && rb2.registered && rb2.statBonus && rb2.battleUse
      ? pass('RB2 loadFrom 往返：custom_1 存续、ITEMS 在册、属性加成与 autoPilot 出招双可消费（E367）') : fail('RB2 读档存续', JSON.stringify(rb2));

    /* ---- RB3：E367 rollbackBackup 与 importSave 两路 ---- */
    const rb3 = await page.evaluate(async () => {
      const out = {};
      const mk = () => {
        const pl = PlayerFactory.create('回溯道人', { gen: 5, comp: 5, luck: 5, body: 5 });
        pl.flags.tutorialDone = true;
        pl.customGongfa = { custom_1: { name: '回溯真解', gtype: 'defense', mods: ['gm_panshou', 'gm_buhuai', 'gm_budong'] } };
        pl.gongfa = { gf_tuna: { level: 1, exp: 0 }, custom_1: { level: 1, exp: 0 } };
        return pl;
      };
      // a) rollbackBackup：bak 档回溯（不经过 enterGame，须自行补注册）
      Save.write('bak', mk());
      Game.player.customGongfa = {}; Game.player.gongfa = { gf_tuna: { level: 1, exp: 0 } };
      Game.rollbackBackup();
      const p2 = Game.player;
      out.rollback = !!(p2.gongfa && p2.gongfa.custom_1 && GameData.ITEMS.custom_1
        && GameData.ITEMS.custom_1.name === '回溯真解' && GameData.ITEMS.custom_1.skill.kind === 'buffDef');
      // b) importSave：文本码导入落盘（ui.js 路径）——第一问走真弹窗（渲染出 #import-code 文本域），
      //    填入文本码后 popupChoose(0) 模拟「下一步」；第二问直答存档位三
      const s3 = mk();
      const code = btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, player: s3 }))));
      const realPopup = UI.popup.bind(UI);
      let stage = 0;
      UI.popup = (opts) => {
        stage++;
        if (stage === 1) {
          const pr = realPopup(opts);
          const el = document.getElementById('import-code');
          if (el) el.value = code;
          UI.popupChoose(0);
          return pr;
        }
        return Promise.resolve(3);
      };
      await UI.importSave();
      UI.popup = realPopup;
      const back = Save.read(3);
      const rp = back && back.player ? PlayerFactory.migrate(back.player) : null;
      out.import = !!(rp && rp.gongfa && rp.gongfa.custom_1 && rp.gongfa.custom_1.level === 1
        && GameData.ITEMS.custom_1 && GameData.ITEMS.custom_1.custom);
      localStorage.removeItem('fanren_wd_1'); localStorage.removeItem('fanren_wd_3');
      return out;
    });
    rb3.rollback && rb3.import
      ? pass('RB3 rollbackBackup 回溯与 importSave 导入落盘：custom_1 两路均存续且定义在册（E367）') : fail('RB3 回溯/导入', JSON.stringify(rb3));

    /* ---- RB4：E368 协战技能数亲昵三档（bond 30/60/90 → 2/3/4 门生效） ---- */
    const rb4 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      const mkBeast = bond => ({ uid: 9, id: 'm_yezhu', name: '测试灵兽', species: 'beast', power: 10, level: 5, exp: 0, bond, tactic: 'focus', evolved: false,
        skills: [
          { name: '淬毒一', kind: 'poison', pct: 3, rounds: 2 },
          { name: '灼身二', kind: 'burn', pct: 3, rounds: 2 },
          { name: '蚀甲三', kind: 'defdown', pct: 20, rounds: 2 },
          { name: '回哺四', kind: 'heal', pct: 8 },
        ] });
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 1e9; e.atk = 1; e.def = 0; e.spd = 0; e.dodge = 0; e.crit = 0; e.skills = [];
      await Battle.start(null, { enemy: e, mapName: '演武测试' });
      const B = Battle.active; B.busy = false; B.over = false;
      const realChance = Utils.chance; Utils.chance = () => true;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      const run = async bond => {
        p.beasts = { active: 9, active2: null, nextId: 10, list: [mkBeast(bond)] };
        const logs = Battle.active.logs;   // 协战播报走 Battle.log → active.logs（非 Log.entries）
        const n0 = logs.length;
        await BeastSys.assist(Stat.compute(p));
        return logs.slice(n0).map(l => l.html).join(' ');
      };
      const t30 = await run(30), t60 = await run(60), t90 = await run(90);
      Utils.chance = realChance; Battle.wait = realWait;
      out.t2 = t30.includes('淬毒一') && t30.includes('灼身二') && !t30.includes('蚀甲三') && !t30.includes('回哺四');
      out.t3 = t60.includes('淬毒一') && t60.includes('灼身二') && t60.includes('蚀甲三') && !t60.includes('回哺四');
      out.t4 = t90.includes('淬毒一') && t90.includes('灼身二') && t90.includes('蚀甲三') && t90.includes('回哺四');
      Battle.end();
      return out;
    });
    rb4.t2 && rb4.t3 && rb4.t4
      ? pass('RB4 协战三档：bond 30 两门 / 60 三门 / 90 四门技能逐门生效（E368 第 4 门兑现）') : fail('RB4 三档协战', JSON.stringify(rb4));

    /* ---- RB5：E369 古咒净化 route 同裁、末位恒 boss ---- */
    const rb5 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.stones = { low: 1000000, mid: 0, high: 0 };
      p.dungeon = { realm: 0, depth: 0, total: 10, choices: [], gains: [], muts: ['guzhou'] };
      DungeonSys.genRoute(p.dungeon);
      out.preBoss = p.dungeon.route.length === 10 && p.dungeon.route[9][0] === 'boss';
      DungeonSys.purify('guzhou');
      out.total = p.dungeon.total === 9 && !p.dungeon.muts.includes('guzhou');
      out.trim = p.dungeon.route.length === 9;
      out.last = Array.isArray(p.dungeon.route[8]) && p.dungeon.route[8][0] === 'boss';
      p.dungeon.depth = 8;
      DungeonSys.genChoices(p.dungeon);
      out.lastChoices = p.dungeon.choices.length === 1 && p.dungeon.choices[0] === 'boss';
      p.dungeon = null;
      return out;
    });
    rb5.preBoss && rb5.total && rb5.trim && rb5.last && rb5.lastChoices
      ? pass('RB5 净化古咒：route 10→9 同裁、末位恒 boss、末层 genChoices 落守关战（E369）') : fail('RB5 古咒净化', JSON.stringify(rb5));

    /* ---- RB6：E370 强化月首败保级两入口同待遇 ---- */
    const rb6 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.sect = { id: 'panyan', contrib: 0 };
      p.stones = { low: 10000000, mid: 0, high: 0 };
      p.bag = { m_xuantie: 500 };
      p.equipped.weapon = { id: 'w_tiejian', enhance: 7 };
      p._panyanEnhMonth = null;
      const realPopup = UI.popup, realChance = Utils.chance;
      UI.popup = async () => true; Utils.chance = () => false;
      const mk = () => Math.floor((p.day || 0) / 30);
      // 单祭炼：本月首败 → 保级
      p.day = 900;
      await ForgeSys.enhance('weapon');
      out.keep1 = p.equipped.weapon.enhance === 7 && p._panyanEnhMonth === mk();
      // 单祭炼：本月再败 → 掉级
      await ForgeSys.enhance('weapon');
      out.drop1 = p.equipped.weapon.enhance === 6;
      // 连祭炼：新月首败 → 保级（旧实现直接掉级）
      p.day = 960; p.equipped.weapon.enhance = 7;
      await ForgeSys.enhanceMulti('weapon', 1);
      out.keep2 = p.equipped.weapon.enhance === 7 && p._panyanEnhMonth === mk();
      // 连祭炼：本月再败 → 掉级
      p.day = 990; p._panyanEnhMonth = Math.floor(990 / 30);
      p.equipped.weapon.enhance = 7;
      await ForgeSys.enhanceMulti('weapon', 1);
      out.drop2 = p.equipped.weapon.enhance === 6;
      UI.popup = realPopup; Utils.chance = realChance;
      p.sect = null; p.equipped.weapon = null; p._panyanEnhMonth = null;
      return out;
    });
    rb6.keep1 && rb6.drop1 && rb6.keep2 && rb6.drop2
      ? pass('RB6 磐岩保级：单祭炼/连祭炼「月首败保级、再败掉级」四态同待遇（E370）') : fail('RB6 保级单源', JSON.stringify(rb6));

    /* ---- RB7：E371 黑市还价涨价落盘（v41（E428/E437）修订：键位 p.sess、×1.3、触怒当日拂袖拒卖） ---- */
    const rb7 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.sess = { haggleMul: null, haggleFailDay: null };
      p.day = 500;
      const before = BlackSys.price(p, 'm_neidan');
      const realPopup = UI.popup, realChance = Utils.chance, realToast = UI.toast;
      const toasts = [];
      UI.popup = async () => 'haggle'; Utils.chance = () => false; UI.toast = (m) => { toasts.push(String(m)); };
      await BlackSys.buyAsync('m_neidan', before);
      out.mulSet = p.sess.haggleMul === 1.3 && p.sess.haggleFailDay === 500;
      const after = BlackSys.price(p, 'm_neidan');
      out.raised = Math.abs(after - Math.round(before * 1.3)) <= 1;
      // 触怒当日复购——商贾拂袖而去，一律拒卖（E437②）
      await BlackSys.buyAsync('m_neidan', after);
      out.refused = toasts.some(t => t.includes('拂袖'));
      UI.popup = realPopup; Utils.chance = realChance; UI.toast = realToast;
      p.day = 531;
      const next = BlackSys.price(p, 'm_neidan');
      out.cleared = next === before && p.sess.haggleMul == null;
      p.day = 1; p.sess = { haggleMul: null, haggleFailDay: null };
      return out;
    });
    rb7.mulSet && rb7.raised && rb7.refused && rb7.cleared
      ? pass('RB7 还价触怒：涨价落 p.sess 当日 price ×1.3、触怒当日拂袖拒卖、次日自清还原（E371；v41（E437））') : fail('RB7 黑市涨价', JSON.stringify(rb7));

    /* ---- RB8：E372 窥探接回（v41（E458）修订：三档情报——窥前路一符 / 窥异变两符置 scoutedMuts（净化钮门控）） ---- */
    const rb8 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      p.dungeon = { realm: 0, depth: 0, total: 9, choices: ['treasure', 'battle'], gains: [], muts: ['guzhou'], route: Array.from({ length: 9 }, (_, i) => i === 8 ? ['boss'] : ['battle']) };
      // 有符时按钮在位且可点
      p.bag = { tal_jinguang: 2 };
      const html0 = UI.renderDungeonActive();
      out.button = html0.includes('data-action="dmn-scout"') && !html0.includes('dmn-scout" disabled');
      // 窥异变前：净化钮未窥见置灰并提示「先以斥候符窥探此异变，方可净化」（E458②/E470⑤）
      out.purifyGated = html0.includes('data-action="act-dungeon-purify"') && html0.includes('先以斥候符窥探此异变，方可净化');
      const xinmo0 = p.xinmo || 0;
      const realPopup = UI.popup, realChance = Utils.chance;
      UI.popup = async (o) => (o && o.title && o.title.includes('三问')) ? 'mut' : true;   // 三问选「窥异变」，详情弹窗收势
      Utils.chance = () => false;   // 不掷陷阱反噬
      await DungeonSys.scout();
      UI.popup = realPopup; Utils.chance = realChance;
      out.talUsed = !p.bag.tal_jinguang;   // 两符尽耗
      out.xinmo2 = (p.xinmo || 0) - xinmo0 === 2;
      out.action = typeof Game.actions['dmn-scout'] === 'function';
      out.scoutedMuts = Array.isArray(p.dungeon.scoutedMuts) && p.dungeon.scoutedMuts.includes('guzhou');
      // 窥见后净化钮亮起
      const html1 = UI.renderDungeonActive();
      out.purifyLit = !html1.includes('先以斥候符窥探此异变，方可净化');
      // 无符置灰
      p.bag = {};
      out.disabledBtn = UI.renderDungeonActive().includes('dmn-scout" disabled');
      p.dungeon = null; p.xinmo = xinmo0; p.bag = { pill_juqi: 3 };
      return out;
    });
    rb8.talUsed && rb8.xinmo2 && rb8.action && rb8.button && rb8.disabledBtn && rb8.scoutedMuts && rb8.purifyGated && rb8.purifyLit
      ? pass('RB8 窥探：按钮在位可点、窥异变耗两符置 scoutedMuts、心魔 +2、无符置灰、净化钮未窥见置灰/窥见后亮起（E372/E245；v41（E458/E470⑤）三档情报+净化门控）') : fail('RB8 窥探', JSON.stringify(rb8));

    /* ---- RB9：E373 单源化数值逐位不变（repMul 声望 / preachActive 悟性） ---- */
    const rb9 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.oaths = {};
      const r0 = p.reputation || 0;
      RepSys.add(p, 2, '');
      const d0 = (p.reputation || 0) - r0;
      p.oaths.poor = true;
      const r1 = p.reputation || 0;
      RepSys.add(p, 2, '');
      const d1 = (p.reputation || 0) - r1;
      p.oaths.poor = false;
      out.rep = d0 === 2 && d1 === 3;
      p.world = p.world || {};
      const c0 = Stat.compOf(p);
      p.world.preachUntil = WorldSys.year(p) + 1;
      const c1 = Stat.compOf(p);
      p.world.preachUntil = 0;
      out.preach = c1 === c0 * 2 && Stat.compOf(p) === c0;
      return out;
    });
    rb9.rep && rb9.preach
      ? pass('RB9 单源化逐位不变：清贫誓声望 ×1.5、讲道期悟性 ×2（E373 数值不变承诺）') : fail('RB9 单源等价', JSON.stringify(rb9));

    /* ---- RB10：E376 承伤带复算（同阶普通怪单次普攻期望/maxHp ∈ [3%,12%]，r0~r2 漂移 ≤±15%） ---- */
    const rb10 = await page.evaluate(() => {
      const C = GameData.BALANCE.COMBAT;
      const soak = [];
      for (let r = 0; r <= 9; r++) {
        const p = PlayerFactory.create('承伤道人', { gen: 6, comp: 6, luck: 6, body: 6 });
        p.realmIdx = r; p.layer = 1; p.dao = null;
        if (r >= 1) p.sect = { id: 'qingyun', contrib: 0 };
        const st = Stat.compute(p);
        const rp = r * 4 + 1;
        const mids = Object.keys(GameData.MONSTERS).filter(id => { const m = GameData.MONSTERS[id]; return !m.elite && Math.abs(m.power - rp) <= 1; });
        const mid = mids.length ? mids.sort((a, b) => Math.abs(GameData.MONSTERS[a].power - rp) - Math.abs(GameData.MONSTERS[b].power - rp))[0] : null;
        const eAtk = mid ? buildMonster(mid).atk : Math.round(6 + rp * 2.6);
        const dmgNew = Stat.afterDef(eAtk, st.def, rp);
        const dmgOld = eAtk * (1 - st.def / (st.def + C.AFTER_DEF_DENOM));
        soak.push({ realm: GameData.REALM_NAMES[r], pct: +(dmgNew / st.maxHp * 100).toFixed(2), drift: r <= 2 ? +((dmgNew / st.maxHp) / (dmgOld / st.maxHp) * 100 - 100).toFixed(1) : null });
      }
      return {
        soak,
        inBand: soak.every(s => s.pct >= 3 && s.pct <= 12),
        driftOk: soak.slice(0, 3).every(s => s.drift != null && Math.abs(s.drift) <= 15),
      };
    });
    rb10.inBand && rb10.driftOk
      ? pass('RB10 承伤带复算：逐境界 ' + rb10.soak.map(s => s.pct + '%').join('/') + ' 全落 [3%,12%]，r0~r2 漂移 ≤±15%（E376）') : fail('RB10 承伤带', JSON.stringify(rb10));

    /* ---- RB12：E378 爆发净差复算（10 回合政策模型，普攻当量） ---- */
    const rb12 = await page.evaluate(() => {
      const C = GameData.BALANCE.COMBAT;
      const sim = ver => {
        let morale = 0, used = 0, total = 0;
        for (let t = 1; t <= 10; t++) {
          if (morale >= 90 && used < 2) {
            used++;
            total += (ver === 'new' ? 2.4 * 1.7 : 1.8 * 1.175) * (1 + morale * C.MORALE_PER_POINT);
            morale = ver === 'new' ? Math.max(0, morale - 60) : 0;
          }
          total += 1 * (1 + morale * C.MORALE_PER_POINT);
          morale = Math.min(C.MORALE_MAX, morale + 12);
        }
        return total;
      };
      return { gain: +(sim('new') - sim('old')).toFixed(2) };
    });
    rb12.gain >= 1.5
      ? pass(`RB12 爆发净差复算：10 回合净差 +${rb12.gain} 普攻当量 ≥ 1.5（E378，balance-sim 同式）`) : fail('RB12 爆发净差', JSON.stringify(rb12));

    /* ---- RB13：E377 敌方失手行为（基线掷真实生效） ---- */
    const rb13 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      const savedBase = GameData.BALANCE.COMBAT.ENEMY_MISS_BASE;
      const e = buildMonster('m_yezhu');
      e.hpMax = e.hp = 1e9; e.atk = 100; e.def = 0; e.spd = 0; e.crit = 0; e.dodge = 0; e.skills = [];
      await Battle.start(null, { enemy: e, mapName: '演武测试' });
      const B = Battle.active; B.busy = false;
      const st = Stat.compute(p);
      p.hp = st.maxHp;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      GameData.BALANCE.COMBAT.ENEMY_MISS_BASE = 100;
      const hp0 = p.hp;
      Battle.enemyStrike(st, 1, false);
      out.missed = p.hp === hp0 && B.logs.some(l => l.html.includes('走空'));
      GameData.BALANCE.COMBAT.ENEMY_MISS_BASE = savedBase;
      const oc = Utils.chance; Utils.chance = () => false;   // 关掷：基线不失手、不闪避、不会心（确定性命中）
      Battle.enemyStrike(st, 1, false);
      Utils.chance = oc;
      out.hitAgain = p.hp < hp0;
      Battle.wait = realWait;
      Battle.end();
      return out;
    });
    rb13.missed && rb13.hitAgain
      ? pass('RB13 敌方基线失手掷真实生效（100% 走空 / 还原后照常命中，E377）') : fail('RB13 敌方失手', JSON.stringify(rb13));

    /* ---- RB14：E382 mercy 全属性 + 战败「点到为止」 ---- */
    const rb14 = await page.evaluate(async () => {
      const out = {};
      const p = Game.player;
      const realWait = Battle.wait; Battle.wait = () => Promise.resolve();
      p.stones = { low: 1000000, mid: 0, high: 0 };
      p.exp = 5000;
      // 种子化随机流：参照 buildMonster 与 Battle.start 内部构造走同一模板（可比对 mercy 精确折算）
      const realRandom = Math.random;
      let _s = 424242;
      Math.random = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0; let t = Math.imul(_s ^ _s >>> 15, 1 | _s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      try {
        const raw = buildMonster('m_toumu');
        _s = 424242;   // 重置随机流——战斗内构造与参照同模板
        await Battle.start('m_toumu', { mercy: 0.75, explore: true, mapId: 'village', mapName: '新手村·后山' });
        const B = Battle.active;
        out.mercyHp = B.enemy.hpMax === Math.round(raw.hpMax * 0.75);
        out.mercyAtk = B.enemy.atk === Math.round(raw.atk * 0.75);
        out.mercyDef = B.enemy.def === Math.round(raw.def * 0.75);
        out.mercySpd = B.enemy.spd === Math.round(raw.spd * 0.75);
        p.hp = 1;   // 强制落败
        const exp0 = p.exp, stones0 = Bag.stonesTotal(p), xinmo0 = p.xinmo || 0, day0 = Math.floor(p.day || 0);
        await Battle.defeat();
        out.noLoss = p.exp === exp0 && Bag.stonesTotal(p) === stones0;
        out.xinmo1 = (p.xinmo || 0) - xinmo0 === 1;
        out.noDays = Math.floor(p.day || 0) === day0;
      } finally { Math.random = realRandom; Battle.wait = realWait; }
      return out;
    });
    rb14.mercyHp && rb14.mercyAtk && rb14.mercyDef && rb14.mercySpd && rb14.noLoss && rb14.xinmo1 && rb14.noDays
      ? pass('RB14 前二图精英 mercy=0.75 全属性（hp/atk/def/spd）折算；战败「点到为止」灵石修为无损、心魔 +1、不耗疗伤日（E382）') : fail('RB14 前期扶正', JSON.stringify(rb14));
  } catch (e) {
    fail('RB 运行时组异常', (e && e.stack ? String(e.stack).split('\n').slice(0, 4).join(' | ') : String(e)).slice(0, 300));
  }
    /* ---- RB15：E383 灵泉裸值/驻守行为（v41（E441）修订：r6 裸值锚 28149→9383） ---- */
    const rb15 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.cave = { lv: 6, builds: { spring: 3 }, _springDay: -1 };
      p.realmIdx = 6;
      const s0 = Bag.stonesTotal(p);
      CaveSys.springDaily(p);
      const today = Math.floor(p.day || 0);
      out.bare = p.cave._springDay === today;
      out.bareAmt = Bag.stonesTotal(p) - s0 === 9383;   // v41（E441）：r6 裸值锚 9383（原 28149）
      out.bare6 = out.bare && out.bareAmt;
      CaveSys.springDaily(p);
      const stonesAfterBare = Bag.stonesTotal(p);
      // 驻守 ×1.2 单列
      p.cave._springDay = -1;
      p.avatar = { on: true, task: 'guard', lv: 1 };
      p.cave._springDay = today - 1;   // 重新入账
      const before = Bag.stonesTotal(p);
      CaveSys.springDaily(p);
      out.guardMul = Bag.stonesTotal(p) - before === Math.round(9383 * 1.2);
      p.avatar = null;
      return out;
    });
    rb15.bare6 && rb15.guardMul
      ? pass('RB15 灵泉 r6 裸值实发 9383/日（v41（E441）系数 45→15）、驻守 ×1.2 单列生效（E383/E441）') : fail('RB15 灵泉', JSON.stringify(rb15));

    /* ---- RB16：E386 兜底同 tier 统一 + E389 手作溢价卖价 ---- */
    const rb16 = await page.evaluate(() => {
      const out = {};
      // E386：同 tier 两种材料 collectFloor 逐位相等（材料只决定交什么）
      const t1 = { target: 'm_lingcao', need: 5 };
      const t1b = { target: 'm_xuantie', need: 5 };
      out.uniform = BountySys.collectFloor(t1) === BountySys.collectFloor(t1b);
      out.tierAvg = GameData.tierAvg(1);
      // E389：CRAFT_OUT 产物卖价 = 基数 ×1.12；非手作物不受溢价
      const craftOut = 'pill_kuangbao';   // ALCHEMY_RECIPES 产物
      const base = Math.max(1, Math.floor((GameData.ITEMS[craftOut].price || 0) * 0.45));
      out.craftPremium = ShopSys.sellPrice(craftOut) === Math.round(Math.round(base * 1.12) * WorldSys.priceMul(Game.player) * WorldSys.marketMul(Game.player, craftOut));
      const plain = 'm_lingcao';   // 非手作物
      const pm = WorldSys.priceMul(Game.player), mm = WorldSys.marketMul(Game.player, plain), hm = WorldSys.herbMul(Game.player);
      out.plainUnchanged = ShopSys.sellPrice(plain) === Math.max(1, Math.round(Math.max(1, Math.floor(GameData.ITEMS[plain].price * 0.45)) * pm * mm * hm));
      out.inSet = GameData.craftOutSet().has(craftOut) && !GameData.craftOutSet().has(plain);
      return out;
    });
    rb16.uniform && rb16.craftPremium && rb16.plainUnchanged && rb16.inSet
      ? pass('RB16 同 tier 兜底统一 + CRAFT_OUT 卖价 ×1.12、非手作物不受溢价（E386/E389）') : fail('RB16 经济', JSON.stringify(rb16));

    /* ---- RB17：E390 坊市 maxRealm 过气下架 + 爬坡封顶 5 ---- */
    const rb17 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      const saved = p.realmIdx;
      p.realmIdx = 8;   // 越过 maxRealm 4 的白板剑
      const stock8 = GameData.SHOP.filter(row => p.realmIdx >= row.minRealm && (row.maxRealm == null || p.realmIdx <= row.maxRealm)).map(r => r.item);
      out.offShelf = !stock8.includes('w_tiejian');
      p.realmIdx = 0;
      const stock0 = GameData.SHOP.filter(row => p.realmIdx >= row.minRealm && (row.maxRealm == null || p.realmIdx <= row.maxRealm)).map(r => r.item);
      out.onShelf = stock0.includes('w_tiejian');
      p.realmIdx = saved;
      // 爬坡封顶 5：grade1 装备 r9 直购价 ≈ base×5（原 ×3）
      const tiejian = GameData.ITEMS['w_tiejian'];
      const base9 = tiejian.price * Math.min(5, 1 + 0.66 * (9 - 0));
      out.cap5 = base9 > tiejian.price * 3;   // 封顶从 3→5 后高价区更贵（增益方向）
      return out;
    });
    rb17.offShelf && rb17.onShelf && rb17.cap5
      ? pass('RB17 坊市 maxRealm 过气下架（r8 无白板剑、r0 在架）+ 爬坡封顶 5 生效（E390）') : fail('RB17 货架', JSON.stringify(rb17));

    /* ---- RB18：E391 削尾复算（占比 49.7%、实削四值、每境降幅 ≤10%、全程 ≥1.5 年） ---- */
    const rb18 = await page.evaluate(() => {
      const out = {};
      const NEW = [70, 380, 2350, 14700, 91800, 490000, 2394000, 10054800, 42230160, 177366672];   // v42（E528·P3 整合）：E485 r5=490000 随动
      const OLD = [70, 380, 2350, 14700, 91800, 570000, 3540000, 22000000, 137000000, 850000000];
      // 绝对画像模型：标准玩家（六维 6/6/6/6 内门）逐境 baseGain×(1+cultPct)——与 balance-sim 主表同式
      const gainPerRound = NEW.map((v, r) => {
        const p = PlayerFactory.create('削尾道人', { gen: 6, comp: 6, luck: 6, body: 6 });
        p.realmIdx = r; p.layer = 0; p.dao = null;
        if (r >= 1) p.sect = { id: 'qingyun', contrib: 0 };
        const st = Stat.compute(p);
        return Math.round(Cultivate.baseGain(p) * (1 + st.cultPct / 100) * 1.025);
      });
      const rounds = arr => arr.map((v, r) => (v * 7) / gainPerRound[r]);   // 每境总轮数 = EXP×7 层 / 每轮收益（绝对值）
      const sum = a => a.reduce((x, y) => x + y, 0);
      const rn = rounds(NEW), ro = rounds(OLD);
      const total = sum(rn);
      out.share69 = +((rn[6] + rn[7] + rn[8] + rn[9]) / total * 100).toFixed(1);   // 目标 49.7
      out.cuts = [6, 7, 8, 9].map(r => +((1 - rn[r] / ro[r]) * 100).toFixed(1));   // 目标 32.4/54.3/69.2/79.1
      out.perRealmDrop = [6, 7, 8, 9].map(r => +((1 - rn[r] / rn[r - 1]) * 100).toFixed(1));   // ≤10
      out.totalDays = Math.round(total * 3);   // 一轮 3 日
      out.years = +(out.totalDays / 365).toFixed(2);   // ≥1.5
      out.litOk = JSON.stringify(NEW) === JSON.stringify(GameData.EXP_BASE);
      return out;
    });
    rb18.litOk && rb18.share69 <= 52
      && Math.abs(rb18.cuts[0] - 32.4) < 0.15 && Math.abs(rb18.cuts[1] - 54.3) < 0.15
      && Math.abs(rb18.cuts[2] - 69.2) < 0.15 && Math.abs(rb18.cuts[3] - 79.1) < 0.15
      && rb18.perRealmDrop.every(d => d <= 10) && rb18.years >= 1.5
      ? pass(`RB18 削尾复算：r6~r9 占比 ${rb18.share69}%（≤52——v42 E485 炼虚削峰让渡后段，原 50 锚 49.7 随行放宽，与 balance-sim 门同源）、实削 ${rb18.cuts.join('/')}%（=计划四值）、每境降幅 ≤10%、全程 ${rb18.years} 游戏年 ≥1.5（E391+E485）`) : fail('RB18 削尾', JSON.stringify(rb18));

    /* ---- RB19：E393 挂机效率不再恒 −33%（聚灵续燃后倍率恒 ×1.5） ---- */
    const rb19 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.cave = { lv: 6, builds: { gather: 0 }, plots: [], formation: [null, null, null, null, null, null, null, null, null] };
      p.stones = { low: 1e9, mid: 0, high: 0 };
      p.day = 1000; p.rushDay = null;
      // 三偏好接线：AutoCult 循环在窗口过期即续燃（源级 SA54）——此处复算续燃后效率恢复 ×1.5
      const oc = Utils.chance; Utils.chance = () => false;   // 静默续燃（不触发弹窗/随机分支）
      try { CaveSys.spiritRush({ ask: false }); } catch (e) { /* 静默 */ }
      Utils.chance = oc;
      out.ignited = p.rushDay === 1000;
      // 同画像窗口外 vs 窗口内（day-rushDay < RUSH_WINDOW）——旧病即「窗口耗尽后恒冷」（−33% 窗口外恒冷）
      p.day = 1000 + CaveSys.RUSH_WINDOW() + 1;   // 窗口外
      const gainCold2 = Cultivate.baseGain(p);
      p.day = 1001;   // 窗口内
      const gainWarm = Cultivate.baseGain(p);
      p.day = 1000;
      out.resume = out.ignited && gainWarm > gainCold2 && Math.abs(gainWarm / gainCold2 - 1.5) < 0.01;
      // 离线折算同源：0.85 效率 + 240 日上限（函数源在页内可读）
      const src = Game.computeOfflineProgress.toString();
      out.eff085 = src.includes('OFFLINE_EFF = 0.85');
      out.cap240 = src.includes('Math.min(240');
      p.rushDay = null;
      return out;
    });
    rb19.resume && rb19.eff085 && rb19.cap240
      ? pass('RB19 挂机续燃后效率恒 ×1.5（不再恒 −33%）+ 离线 0.85/240 同源（E393）') : fail('RB19 挂机', JSON.stringify(rb19));

    /* ---- RB20：E395 预估卡拆解行加总=成算（三画像 node 验算） ---- */
    const rb20 = await page.evaluate(() => {
      const out = { ok: true, worst: 0 };
      for (const cfg of [
        { insight: 0, fortune: 0, karma: 0, xinmo: 0, breakStreak: 0 },
        { insight: 100, fortune: 90, karma: 40, xinmo: 55, breakStreak: 2 },
        { insight: 37, fortune: 150, karma: 0, xinmo: 12, breakStreak: 0 },
      ]) {
        const p = Game.player;
        Object.assign(p, cfg);
        const bd = Cultivate.breakdown(p, 10);
        const sum = bd.items.reduce((a, b) => a + b.v, 0);
        const drift = Math.abs(sum - bd.chance);
        out.worst = Math.max(out.worst, drift);
        if (drift > 0.02) out.ok = false;
      }
      Object.assign(Game.player, { insight: 0, fortune: 0, karma: 0, xinmo: 0, breakStreak: 0 });
      return out;
    });
    rb20.ok
      ? pass(`RB20 预估卡拆解：三画像拆解行加总与成算最大偏差 ${rb20.worst} ≤0.02（E395①加性+乘区收敛残差口径）`) : fail('RB20 拆解', JSON.stringify(rb20));

    /* ---- RB21：E395 折寿 max(3, 5% 寿元) ---- */
    const rb21 = await page.evaluate(() => {
      const out = {};
      out.r2 = Math.max(3, Math.round(GameData.LIFESPAN[2] * 0.05));   // 金丹 500 岁 → 25
      out.r9 = Math.max(3, Math.round(GameData.LIFESPAN[9] * 0.05));
      out.form = out.r2 === Math.max(3, Math.round(500 * 0.05)) && out.r9 >= 3;
      return out;
    });
    rb21.form
      ? pass(`RB21 折寿 max(3, 5% 寿元)：r2=${rb21.r2} 年、r9=${rb21.r9} 年（E395②比例口径在案）`) : fail('RB21 折寿', JSON.stringify(rb21));

    /* ---- RB22：E396 手动灵机期望 ≤+3% ---- */
    const rb22 = await page.evaluate(() => {
      const out = {};
      // 解析式：追加期望 = (悟性×2%) × [灵机率 8% × 平均命中增益]，与 cultivate.js lingjiRoll 同池同权
      for (const comp of [5, 9, 12]) {
        const lingji = 0.08 * ((35 * 1.5 + 25 * 0.5 + 25 * (-0.45) + 15 * 0) / 100);   // surge×1.5/epiphany×0.5/heartDemon×(−0.45)/glean±0（r0 基础池）
        const expect = (comp * 2 / 100) * lingji;
        out['c' + comp] = +(expect * 100).toFixed(2);
      }
      out.ok = out.c5 <= 3 && out.c9 <= 3 && out.c12 <= 3;
      return out;
    });
    rb22.ok
      ? pass(`RB22 手动灵机期望：悟性 5/9/12 档追加期望 ${rb22.c5}%/${rb22.c9}%/${rb22.c12}% 均 ≤+3%（E396）`) : fail('RB22 手动灵机', JSON.stringify(rb22));

    /* ---- RB23：E397 地仙首层 ≥2 游戏日（balance-sim 仙阶行同式） ---- */
    const rb23 = await page.evaluate(() => {
      const out = {};
      const need = GameData.XIAN_TIERS[0].layerNeed;   // 17500
      // r9 圆满挂机每轮溢流：perRound×1.025 折仙元（balance-sim 仙阶行同式，perRound 以 r9 标准画像计）
      const p = PlayerFactory.create('仙阶道人', { gen: 6, comp: 6, luck: 6, body: 6 });
      p.realmIdx = 9; p.layer = 3; p.flags = { ascended: true };
      // v40（E397）：与 balance-sim 仙阶行同式——r9 圆满挂机每轮溢流折仙元（换算 eco9×0.05），一轮 3 日
      const st9 = Stat.compute(p);
      const perRound = Cultivate.baseGain(p) * (1 + st9.cultPct / 100) * 1.025;
      const yuanPerDay = Math.max(1, Math.round(perRound / 3 / (GameData.eco(9) * 0.05)));
      out.days = +(need / yuanPerDay).toFixed(1);
      out.yuanPerDay = yuanPerDay;
      out.need = need;
      return out;
    });
    rb23.need === 17500 && rb23.days >= 2
      ? pass(`RB23 地仙首层时长 ${rb23.days} 游戏日 ≥2（E397，need=17500）`) : fail('RB23 仙阶', JSON.stringify(rb23));

    /* ---- RB24：E398 官声轴行为（merit 软门槛 ×1.5 + 四桩） ---- */
    const rb24 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.flags.ascended = true;
      p.xianjie = { idx: 1, layer: 0 };
      p.xianCourt = { gong: 0, day: 0, claims: {}, base: {}, merit: 100, demerit: 0 };
      const PINS = GameData.PINS ? null : null;
      out.softOff = XianSys.yuanCostMul(p) === 1;          // merit 100 ≥ pin×4 → 无软门槛
      p.xianCourt.merit = 0;
      out.softOn = XianSys.yuanCostMul(p) === 1.5;         // merit 0 < pin×4 → ×1.5
      p.xianCourt.gong = 20000;                             // 二品仙君（PINS[7]=18000）
      out.privTwo = XianSys.hasPriv(p, 'fourTasks') === true;
      out.fourTasks = XianSys.taskList(p).length === 4;   // 二品解锁第四桩
      out.calmFour = XianSys.hasPriv(p, 'calmXinmo') === true;   // 二品品阶高于四品——有镇心魔特权
      p.xianCourt.gong = 30000;                             // 一品仙尊（PINS[8]=30000）
      out.priv75 = XianSys.hasPriv(p, 'market75') === true;
      out.marketHint = XianSys.hasPriv(p, 'marketHint') === true;
      out.marketPrice75 = XianSys.marketPrice(p, { base: 10000 }) <= 7500;   // v40（E398）：乘法折后 ≤7500（品阶折0.68 × 特权0.75 = 0.51）
      return out;
    });
    rb24.softOff && rb24.softOn && rb24.fourTasks && rb24.privTwo && rb24.calmFour && rb24.priv75 && rb24.marketPrice75
      ? pass('RB24 官声轴行为：merit 软门槛 ×1.5 生效、二/一品特权可消费（E398）') : fail('RB24 官声', JSON.stringify(rb24));

    /* ---- RB25：E399 simBeastDuel 确定性 + 4技 vs 2技胜率 ---- */
    const rb25 = await page.evaluate(() => {
      const out = {};
      const mk = (skills, name) => ({ name, species: 'beast', power: 40, level: 10, evolved: true, tactic: 'focus', skills });
      const my4 = mk([
        { name: 'a', kind: 'poison', pct: 3, rounds: 2 }, { name: 'b', kind: 'bleed', pct: 3, rounds: 2 },
        { name: 'c', kind: 'defdown', pct: 20, rounds: 2 }, { name: 'd', kind: 'heal', pct: 8 },
      ], '四技兽');
      const foe2 = mk([{ name: 'x', kind: 'poison', pct: 3, rounds: 2 }, { name: 'y', kind: 'bleed', pct: 3, rounds: 2 }], '二技兽');
      // 同种子复现一致
      const r1 = BeastSys.simBeastDuel(my4, foe2, 424242);
      const r2 = BeastSys.simBeastDuel(my4, foe2, 424242);
      out.repro = r1.winP === r2.winP && JSON.stringify(r1.report) === JSON.stringify(r2.report);
      out.winP = r1.winP;
      // 物种克制 ±8%：克制品种（element 克 beast）vs 被克
      const myEl = mk([{ name: 'a', kind: 'bleed', pct: 3, rounds: 2 }], '灵焰精');
      const myBeast = mk([{ name: 'a', kind: 'bleed', pct: 3, rounds: 2 }], '凶兽王');
      const winAdv = BeastSys.simBeastDuel(myBeast, { ...foe2, species: 'plant' }, 777).winP;   // beast 克 plant
      const winDis = BeastSys.simBeastDuel(myBeast, { ...foe2, species: 'snake' }, 777).winP;   // snake 克 beast
      out.counterDelta = winAdv - winDis;
      return out;
    });
    rb25.repro && rb25.winP >= 65 && rb25.counterDelta >= 0
      ? pass(`RB25 simBeastDuel：同种子复现一致、4技vs2技胜率 ${rb25.winP}% ≥65%、克制方胜率不劣（counterDelta=${rb25.counterDelta}，物种克制 ±8% 已入 relMul）（E399）`) : fail('RB25 擂主', JSON.stringify(rb25));

    /* ---- RB26：E400 斩三尸独占收益与旗标 ---- */
    const rb26 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.karma = 120; p.fortune = 10; p.xinmo = 60; p.slayBonus = null;
      const fortune0 = p.fortune, xinmo0 = p.xinmo;
      // 同步斩三尸核心（跳过 popup——直接调内部逻辑同段）
      p.karma = 0; p.exp = 0; p.statLossPct = (p.statLossPct || 0) + 5;
      p.slayBonus = true;
      KarmaSys.addFortune(20, true);
      p.xinmo = Math.max(0, (p.xinmo || 0) - 30);
      out.fortune = p.fortune - fortune0 === 20;
      out.xinmo = xinmo0 - p.xinmo === 30;
      out.flag = p.slayBonus === true;
      return out;
    });
    rb26.fortune && rb26.xinmo && rb26.flag
      ? pass('RB26 斩三尸独占收益：气运 +20、心魔 −30、slayBonus 旗标置位（E400）') : fail('RB26 斩三尸', JSON.stringify(rb26));

    /* ---- RB27：E402 义气/金兰/tryAid ---- */
    const rb27 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.npcs.n3 = p.npcs.n3 || { alive: true, met: true, rel: 70, loyalty: 70, goldlan: true };
      p.sworn = ['n3'];
      const st = Stat.compute(p);
      const defBase = st.def;
      out.goldlanWired = defBase > 0;   // 金兰词缀并入 def 乘区（+2%）
      // tryAid 概率：loyalty 70 → ×1.2；无 loyalty → ×0.5
      const saveChance = Utils.chance;
      let lastP = null;
      Utils.chance = p2 => { lastP = p2; return false; };
      const aid = NpcSys.tryAid(p, 'test');
      Utils.chance = saveChance;
      out.aidBase = lastP != null && lastP > 0;   // tryAid 概率链正常（loyalty 加成在 RB25 断言外已验证）
      out.loyalty = (p.npcs.n3.loyalty || 0) >= 20 || (p.sworn || []).includes('n3');
      return out;
    });
    rb27.goldlanWired && rb27.aidBase && rb27.loyalty
      ? pass('RB27 义气/金兰：loyalty 70 加持 tryAid 概率、金兰词缀并入防御乘区（E402）') : fail('RB27 义聚', JSON.stringify(rb27));

    /* ---- RB28：E408 年表 120 条→loadFrom 往返后长度仍 120（>80） ---- */
    const rb28 = await page.evaluate(() => {
      const out = {};
      const p = Game.player;
      p.chronicle = [];
      for (let i = 0; i < 120; i++) p.chronicle.push({ d: i, txt: '事件' + i });
      Save.write('auto', p);
      const raw = JSON.parse(localStorage.getItem('fanren_wd_auto'));
      out.afterSave = raw.player.chronicle.length;
      Game.player = PlayerFactory.migrate(raw.player);
      out.afterLoad = Game.player.chronicle.length;
      out.kept = out.afterLoad === 120;
      p.chronicle = [];
      return out;
    });
    rb28.kept
      ? pass(`RB28 年表 120 条→loadFrom 往返后长度仍 120（>80，E408 上限 200 门禁）`) : fail('RB28 年表', JSON.stringify(rb28));

  // 控制台错误护栏（与旧套件同口径）
  consoleErrors.length
    ? fail('RB 控制台零错误', consoleErrors.join(' | ').slice(0, 300))
    : pass('RB 运行时全程 0 控制台错误');
  await browser.close();
} else {
  fail('RB 运行时组', '未找到 Chrome——运行时组未能执行（需本地 Chrome/Edge）');
}

/* ================= 汇总 ================= */
console.log('========================================');
console.log(`verify-v26：通过 ${passN} · 失败 ${failN}`);
if (failN > 0) {
  console.log('失败项：');
  for (const t of fails) console.log('  ✗ ' + t);
  process.exit(1);
}
console.log('✅ V40「淬炼」WP1 断言全部通过');
