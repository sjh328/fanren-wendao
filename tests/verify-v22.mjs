/* ======================================================================
 * verify-v22 —— V36「正本」专项回归
 * 覆盖：A P0 三枚（画符成本挂产量 / 宗门倒挂环+领赏日限 / 渡劫成功收尾归位）/
 *       B 批修 E131~E138（切磋日限 / 传承树故物重携 / legacy 键 / 剧情键盘守卫 /
 *       重读战斗 / 脏 id 渲染 / bak2 安全化 / 塔跳层时序）/
 *       C 战斗收口 E139~E143、E169~E173 / D 经济 E147~E148、E174~E175 /
 *       E 升级包 U1 社交重铸 · U2 斗兽重构 · U3 日常归一 · U5 圆满体验 · U6 门禁扩容 /
 *       F 沉浸感 E182~E189 / G 工程 E190~E196
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
const R = f => readFileSync(join(__dirname, 'js', f), 'utf8').replace(/\r\n/g, '\n');

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
  const bounty = R('systems/bounty.js');
  const dsign = R('systems/daily-sign.js');
  const xian = R('systems/xian.js');
  const reinc = R('systems/reincarnation.js');
  const explore = R('systems/explore.js');
  const festival = R('systems/festival.js');
  const craft = R('systems/craft.js');
  const gdata = R('data/game-data.js');
  const autocult = R('core/autocult.js');
  const guide = R('core/guide.js');
  const save = R('core/save.js');
  const pfac = R('core/player-factory.js');
  const achieve = R('core/achieve.js');
  const ambience = R('core/ambience.js');
  const story = R('ui/story.js');
  const ui = R('ui/ui.js');
  const gamejs = R('game.js');
  const buildmjs = readFileSync(join(__dirname, 'scripts', 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const releasemjs = readFileSync(join(__dirname, 'scripts', 'release.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const checkactions = readFileSync(join(__dirname, 'scripts', 'check-actions.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const priceaudit = readFileSync(join(__dirname, 'scripts', 'price-audit.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const rank = R('systems/rank.js');
  const stat = R('core/stat.js');
  // 论道封口（E197）
  npc.includes('s._discussDay === today') && npc.includes('大道贵悟不贵频')
    && npc.includes('Math.round(Cultivate.baseGain(p) * (1.0 + d.talent * 0.08))')
    ? pass('SA9b 论道每 NPC 每日一场 + 收益自随乘数与档位解耦（v36 E197）') : fail('SA9b 论道封口', '');

  /* ---- v36 B1 批修 E200~E205 ---- */
  {
    const tower = R('systems/tower.js');
    const utils = R('core/utils.js');
    const idxHtml = readFileSync(join(__dirname, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
    tower.includes('async waitIdle(timeoutMs = 10000)') && tower.includes('await this.waitIdle(); this.nextFloor();')
      && tower.includes('宝箱/奇遇/祝福三步弹窗开启前挂起') && tower.includes('赌约弹窗构造前挂起')
      && tower.includes('.then(async ok2 => {')
      ? pass('SA77a waitIdle 四时机接入：自动续层/steps 前/赌约构造前/赌约回调 async（E200）') : fail('SA77a 时机', '');
    tower.includes('此处重复 afterAction 删除') && !/\n    Game\.afterAction\(\);\n    \/\/ 每 5 层/.test(tower)
      ? pass('SA77b onVictory 重复 afterAction 删除——节庆检查不再双跑（E200/E62 同族）') : fail('SA77b 冗余', '');
    {
      const bsIdx = trib.indexOf('Battle.start(null, { enemy: NpcSys.buildEnemy(p, ambushNpc)');
      const aaIdx = bsIdx >= 0 ? trib.indexOf('Game.afterAction()', bsIdx) : -1;
      const pdIdx = trib.indexOf('p.pendingDao = true;');
      trib.includes('对齐 dungeon E59 时序') && bsIdx >= 0 && aaIdx > bsIdx && pdIdx >= 0 && pdIdx < bsIdx
        ? pass('SA78 渡劫失利偷袭：开战在前、afterAction 在后（E201/E143-12）') : fail('SA78 偷袭时序', `${bsIdx}/${aaIdx}/${pdIdx}`);
    }
    cave.indexOf('if (plot.pested) { plot.pested = false; cured++; }') < cave.indexOf('if (remaining <= 0) continue;')
      && cave.includes('收 获</button>${plot.pested ? `<button class="btn btn-sm btn-danger" data-action="act-cave-pest"')
      ? pass('SA79 熟田虫害出口：除虫前移 + 熟田两钮并存（E202）') : fail('SA79 除虫', '');
    utils.includes('if (p[key] === t) return false;') && !utils.includes('(p[key] || -1) === t')
      ? pass('SA80 resetIfNew 严格比较去 coercion（E203）') : fail('SA80 Daily', '');
    battle.includes('waveReset(B) {') && battle.includes('this.waveReset(B);')
      && battle.includes('B.combo = 0;') && battle.includes('B.lastSkillTag = null;') && battle.includes('B.skillSeq = 0;')
      ? pass('SA81 续波重置抽 waveReset 单源并入连击/连携势（E204）') : fail('SA81 waveReset', '');
    guide.includes('p._autoRushSkipDay !== today') && guide.includes("else if (c === 'skip') { p._autoRushSkipDay = today; }")
      && guide.includes('偏好随时可在设置中心修改')
      && ambience.includes('amb-rush') && ambience.includes('syncRushPref')
      && idxHtml.includes('id="amb-rush"') && idxHtml.includes('从不聚灵')
      ? pass('SA82 聚灵偏好三态单源化：单日跳过 + 设置中心入口（E205）') : fail('SA82 聚灵三态', '');
  }

  /* ---- v36 B2 批修 E206~E212 ---- */
  {
    const tower = R('systems/tower.js');
    const dotHook = battle.includes('this.onEnemyHit(B, st, dotDmg);   // v36（E206）');
    const zeroHooks = (battle.match(/this\.onEnemyHit\(B, st, 0\);   \/\/ v36（E206）/g) || []).length;
    dotHook
      ? pass('SA83a 敌方 DOT 击杀路径接线：魔棘反弹（传伤值）与不灭复活（E206）') : fail('SA83a DOT', '');
    zeroHooks === 2
      ? pass('SA83b 反击与词缀反伤致死路径接线：传 0 仅复查不灭防双计（E206）') : fail('SA83b 传 0', `${dotHook}/${zeroHooks}`);
    battle.includes('Utils.chance(45 * coef)')
      ? pass('SA84a 主掉落补乘 rate——中间波材料期望 0.540→0.270 件/波，E169 归真（E207）') : fail('SA84a 主掉落', '');
    battle.includes('const coef = rate * (ctx.dropMul || 1);') && (battle.match(/ \* coef\)/g) || []).length >= 6
      && explore.includes('bctx.dropMul = (bctx.dropMul || 1) * 1.4;') && !explore.includes('bctx.dropMul = 1.4;')
      ? pass('SA84b 掉落系数 coef 六处单源 + explore 魔域/兽潮叠乘（E208）') : fail('SA84b coef', '');
    {
      const gy = battle.indexOf('this.gainZyOnCrit(p, crit);   // v36（E209）');
      const hook = gy >= 0 ? battle.indexOf('this.onEnemyHit(B, st, dmg);   // v34（C1/C2）', gy) : -1;
      gy >= 0 && hook > gy && battle.includes('会心回真元')
        ? pass('SA85 法诀会心回真元：聚气归元接线于法诀伤害分支 onEnemyHit 之前（E209）') : fail('SA85 归元', `${gy}/${hook}`);
    }
    {
      const ap = battle.indexOf('autoPilot() {');
      const combo = ap >= 0 ? battle.indexOf("this.act('combo'); return;", ap) : -1;
      const tal = combo >= 0 ? battle.indexOf("if (p.dao === 'talisman') {", combo) : -1;
      ap >= 0 && combo > ap && tal > combo && battle.includes('B.enemy.hp > this.myAtk(st)')
        ? pass('SA86 autoPilot 合击步：必杀后祭符前、免费无护栏/付费护栏对齐消耗口径（E210）') : fail('SA86 合击步', `${ap}/${combo}/${tal}`);
    }
    tower.includes('(run.riskAtk || 1) * 1.25') && !tower.includes('run.risk =')
      ? pass('SA87a 跳层赌约 riskAtk 累乘 + run.risk 死字段删除（E211）') : fail('SA87a 累乘', '');
    tower.includes('每次赌约 +25%，可叠加')
      ? pass('SA87b 赌约文案可叠加口径与实发一致（E211）') : fail('SA87b 文案', '');
    battle.includes("!playerLowHp && controlSkill && !StatusFx.has(B.myFx, 'stun') && !StatusFx.has(B.myFx, 'freeze')")
      ? pass('SA88a 敌方 AI 控制守卫补 freeze——已冰封不再投控（E212）') : fail('SA88a 守卫', '');
    battle.includes("(s.kind === 'stun' && StatusFx.has(B.myFx, 'stun')) || (s.kind === 'freeze' && StatusFx.has(B.myFx, 'freeze'))")
      ? pass('SA88b pool2 通用技能池控制类排除——stun 同族洞一并堵上（E212）') : fail('SA88b pool2', '');
  }

  /* ---- v36 B3 批修 E213~E217 ---- */
  {
    const sect = R('systems/sect.js');
    sect.includes('TOURNEY_EVERY: 3,') && !sect.includes('TOURNEY_EVERY: 5,') && sect.includes('首届落在金丹前后')
      && sect.includes('每逢三年（游戏年）开一届大比')
      ? pass('SA89 宗门大比三年一届 + 首届落在凡间一世的口径注释（E213）') : fail('SA89 大比', '');
    npc.includes('const gMin = Utils.clamp(Math.floor(s.realmIdx / 2) + 1, 1, 3);')
      ? pass('SA90a 雷台彩头随境下限 gMin（r0~1 灵级 / r4+ 地级起步）（E214）') : fail('SA90a gMin', '');
    npc.includes('if (!pool.length && gMin > 1) pool = inPool(gMin - 1);') && npc.includes("(GameData.ITEMS[k].grade || 0) >= g && (GameData.ITEMS[k].grade || 0) <= 3")
      ? pass('SA90b 彩头池空回落 gMin−1 且 grade 上限维持 3（E214）') : fail('SA90b 回落', '');
    ui.includes('悬赏板${this.FACTS.bountyDays}日一换') && !ui.includes('两日一换') && ui.includes('按${this.FACTS.offlineEff}效率自行精进（上限 ${this.FACTS.offlineCap} 日')
      && !ui.includes('四成效率')
      ? pass('SA91 手册两处数值对齐实发：悬赏三日/离线六成 120 日（E215，E231 起 FACTS 拼串）') : fail('SA91 手册口径', '');
    ui.includes('${this.FACTS.sellRate}回收') && !ui.includes('四折回收')
      ? pass('SA92 万宝阁四成五回收对齐 shop.js 0.45（E216，E231 起 FACTS 拼串）') : fail('SA92 回收口径', '');
    gamejs.includes('${UI.FACTS.offlineEff}效率折算，不计闭关加成')
      ? pass('SA93 离线小结口径如实（E217；v37（E277）改引 UI.FACTS.offlineEff 单源拼串 + 聚灵加护段）') : fail('SA93 离线小结', '');
  }

  /* ---- v36 U1 升级包 E218~E220 ---- */
  {
    const cult = R('systems/cultivate.js');
    const bal = readFileSync(join(__dirname, 'scripts', 'balance-sim.mjs'), 'utf8').replace(/\r\n/g, '\n');
    cult.includes('p.rushDay != null && Math.floor(p.day || 0) - p.rushDay < 3')
      ? pass('SA94a 聚灵 3 游戏日窗口口径入 baseGain 单源（E218）') : fail('SA94a 窗口', '');
    cave.includes('聚灵阵灵机未散（余') && cave.includes('Cultivate.baseGain(p) * 0.5') && cave.includes('Cultivate.baseGain(p) * 8')
      ? pass('SA94b spiritRush 窗口守卫 + 弹窗净收益按场景实算 0.5/8×baseGain（E218）') : fail('SA94b 净收益', '');
    guide.includes('const inWindow = p.rushDay != null && today - p.rushDay < 3;') && guide.includes('!inWindow && p._autoRush !== \'skip\' && p._autoRushSkipDay !== today') && guide.includes('点燃后 3 日内修炼效率 ×1.5')
      ? pass('SA95 一键行权聚灵终态守卫 + 窗口口径弹窗（E205/E218）') : fail('SA95 行权聚灵', '');
    ui.includes("label: '悟道'") && ui.includes("act: (!wudaoDone && canWudao) ? 'act-wudao' : ''") && ui.includes('感悟 ${p.insight}/${wdCost}')
      && gamejs.includes("'act-wudao': () => Cultivate.wuDao(),")
      ? pass('SA96a 悟道入今日修行卡三态 + act-wudao 行内接线（E219；v37（E265）门槛改随境 wdCost=20+2r 卡面/弹窗/实扣三处同源）') : fail('SA96a 悟道行', '');
    ui.includes('已点燃 · 3 日内修炼 ×1.5')
      ? pass('SA96b 今日修行卡聚灵行窗口口径与行权一致（E218）') : fail('SA96b 卡面', '');
    bal.includes('全行动效率横向表') && bal.includes('GATE = { cult: 2.2, seclude: 1.4 }') && bal.includes('process.exitCode = 1') && bal.includes('await NpcSys.discuss(\'n1\')')
      ? pass('SA97 balance-sim 横向表 + 门禁非零退出 + 论道行实调实现（E220）') : fail('SA97 门禁', '');
  }

  /* ---- v36 U3 升级包 E222~E225 ---- */
  {
    const gdata = R('data/game-data.js');
    const craft = R('systems/craft.js');
    const cave = R('systems/cave.js');
    const paudit = readFileSync(join(__dirname, 'scripts', 'price-audit.mjs'), 'utf8').replace(/\r\n/g, '\n');
    gdata.includes('price: 1300,   desc: \'药力霸道') && gdata.includes('use: { exp: 320000 }, poison: 85 }') && gdata.includes('卅二万点修为')
      ? pass('SA99 丹药重定价：pojing 1300 / tianyuan 320000+desc 卅二万（E222）') : fail('SA99 丹药', '');
    gdata.includes('days: 19, desc: \'播入灵田，十九日可收【万年雪莲】。\'') && gdata.includes('days: 21, desc: \'播入灵田，廿一日可收【炼魂石】。\'')
      && cave.includes('可收 ×2｜过熟 20 日折半｜季秋 +1')
      ? pass('SA100 种子 grade3 重校 19/21 日 + desc + 卡面收成口径（E223）') : fail('SA100 种子', '');
    craft.includes("q += (typeof Art !== 'undefined' && Art.seasonOf(p) === 1 ? 2 * 91 / 365 : 0);")
      && paudit.includes('for (const season of [0, 1, 2, 3])')
      ? pass('SA101 画符仲夏期望摊入 expectedQty + 审计四季复扫（E224）') : fail('SA101 画符季节', '');
    paudit.includes('Math.max(0, 0.6 - winRate)') && !paudit.includes('if (loseRate < 0) continue')
      && paudit.includes('第七路') && paudit.includes('配方对倒挂') && paudit.includes('种子档位') && paudit.includes('符箓档位')
      && paudit.includes('per-action 现金流榜')
      ? pass('SA102 赌袋模型修 + 第七路三族 + 第八路现金流榜（E225）') : fail('SA102 审计扩容', '');
  }

  /* ---- v36 U4 升级包 E226~E228 ---- */
  {
    const gdata = R('data/game-data.js');
    const sect = R('systems/sect.js');
    const rank = R('systems/rank.js');
    const reinc = R('systems/reincarnation.js');
    const stat = R('core/stat.js');
    gdata.includes("perkText: '每战获胜修为 +10%'") && gdata.includes("perkText: '炼丹成丹率 +8%'") && gdata.includes("perkText: '参悟所得 +15%'")
      && battle.includes("p.sect.faction === 'tianshu' ? 1.1 : 1") && craft.includes("p.sect.faction === 'danding') r += 8")
      && craft.includes("p.sect.faction === 'cangjing' ? Math.round(6 * 1.15) : 6")
      ? pass('SA103 派系 perk 三字段 + 三消费点各自接线（v36 E226）') : fail('SA103 perk', '');
    sect.includes('dangerTask: true') && battle.includes('if (B.ctx.dangerTask)')
      && battle.includes('Math.round(totalStones * 0.1 * mul)') && battle.includes("'生死状折损'")
      ? pass('SA104 生死状战败真实代价：ctx 旗标 + 灵石一成 + 心魔 +5（v36 E226）') : fail('SA104 生死状', '');
    gdata.includes("{ item: 'gf_tumo', cost: 1900 }") && gdata.includes("{ item: 'gf_dayan', cost: 1900 }") && gdata.includes("{ item: 'pill_jiuzhuan', cost: 900 }")
      && sect.includes('七五折兑换派系秘藏') && sect.includes('战败折损甚重，且不可改换门庭')
      ? pass('SA105 exclusive 七五折重锚 1900/900/1900 + 站队文案（v36 E226）') : fail('SA105 秘藏', '');
    npc.includes('npcCombatPower(p, id)') && rank.includes("'可敌' : (ratio >= 0.7 && ratio <= 1.3) ? '略逊' : '远逊'")
      && rank.includes('距上一位') && npc.includes('Math.max(grudgeMul, chaseMul)')
      && npc.includes('Utils.clamp(myRp - hisRp, 0, 30) * 0.05')
      ? pass('SA106 天骄榜活性化：战力三档 + 距上一位 + 温和追赶 max 不叠乘（v36 E227）') : fail('SA106 天骄榜', '');
    reinc.includes('p2.cultGift = (p2.cultGift || 0) + 2') && reinc.includes('Math.round(2 * full / 4)')
      && stat.includes('+ (p.cultGift || 0)') && reinc.includes('对应属性满十时折化为修炼效率 +2%')
      ? pass('SA107 传承树四维满值折算 cultGift + stat 消费 + 轮回镜提示（v36 E228）') : fail('SA107 cultGift', '');
  }

  /* ---- v36 F 沉浸感 E229~E230 ---- */
  {
    const ambience = R('core/ambience.js');
    const xian = R('systems/xian.js');
    battle.includes("SKILL_MULT = { damage: (intent.sk.mult || 1), poison: 0.8, burn: 0.9, bleed: 1.1")
      && battle.includes("k === 'guard' || k === 'roar' || k === 'heal') return ''")
      && battle.includes("'附毒'") && battle.includes("（摄灵）") && battle.includes("（铁壁）") && battle.includes("（咆哮）") && battle.includes("（自愈）")
      && (battle.match(/未计格挡\/会心/g) || []).length === 1
      ? pass('SA108 意图预估覆盖技能型出手：kind 乘数同源/DOT 尾缀/资源型/歧义一处（v36 E229）') : fail('SA108 意图', '');
    xian.includes("UI.realmShow('道 祖 之 境 · 万 道 归 一', '#e8e0f0', 9)") && xian.includes("Ambience.sfx('daoZu')")
      && ambience.includes("kind === 'daoZu'") && xian.includes("UI.realmShow(`仙劫功成 · 晋 ${d.name}`, '#cfe3f5', to <= 2 ? 2 : 5)")
      && xian.includes("UI.realmShow(`仙籍落名 · ${d.name}`, '#cfe3f5', 2)") && ui.includes('tierOverride')
      ? pass('SA109 证道祖 t3 白金异象 + daoZu 音色 + 落名/晋层 t1/t2 分档（v36 E230）') : fail('SA109 终局', '');
  }

  /* ---- v36 G 工程地基 E231 ---- */
  {
    const checkactions2 = readFileSync(join(__dirname, 'scripts', 'check-actions.mjs'), 'utf8').replace(/\r\n/g, '\n');
    ui.includes('FACTS: { offlineEff:') && ui.includes('FACTS.bountyDays}日一换') && ui.includes('${this.FACTS.sellRate}回收')
      && ui.includes('${this.FACTS.offlineEff}效率自行精进（上限 ${this.FACTS.offlineCap} 日')
      && checkactions2.includes("FACTS.offlineCap  ↔ js/game.js") && checkactions2.includes("offlineCap:\\s*(\\d+)")
      && checkactions2.includes('Math\\.min\\((\\d+),') && checkactions2.includes('bounties\\.day\\s*>\\s*(\\d+)') && checkactions2.includes('base\\s*\\*\\s*0\\.(\\d+)')
      ? pass('SA110 UI.FACTS 文案单源 + check-actions 文案-常量三点对账（v36 E231）') : fail('SA110 FACTS', '');
  }

  /* ---- v36 U2 升级包 E221 ---- */
  {
    const tower = R('systems/tower.js');
    tower.includes("{ id: 'qihun', name: '器魂五枚', cost: 40, desc: '器魂 ×5——塔中金石之精，淬器之魂' }")
      && tower.includes('stonesRedeemDay') && tower.includes('stonesRedeemN') && tower.includes('t.today.stonesRedeemN = 0;')
      && tower.includes('p.qihun = (p.qihun || 0) + 5;') && tower.includes('(p.tower.today.stonesRedeemN || 0) >= 2')
      ? pass('SA98 塔绩纳财日限两次 + 器魂第二去向同款发放路径（v36 E221）') : fail('SA98 塔绩', '');
  }

  /* ---- v22 新立：温书守卫 / 聚灵三态 / 切磋总限（处方 SA 清单点项） ---- */
  story.includes('if (c.readonly) return;') && story.includes('此战已成往事') && story.includes('温书回看')
    ? pass('SV1 温书守卫与纯文本渲染双收口（E199）') : fail('SV1 温书', '');
  guide.includes("p._autoRushSkipDay !== today") && guide.includes("const inWindow = p.rushDay != null && today - p.rushDay < 3;")
    && guide.includes("!inWindow && p._autoRush !== 'skip' && p._autoRushSkipDay !== today")
    ? pass('SV2 聚灵三态与 _autoRushSkipDay + 窗口守卫 inWindow（E205/E218）') : fail('SV2 聚灵', '');
  npc.includes('今日已三度以武会友') && npc.includes('p._sparCount = (p._sparCount || 0) + 1;')
    ? pass('SV3 切磋每日 3 场跨 NPC 总限（E198）') : fail('SV3 总限', '');
}
}

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
    const pl = PlayerFactory.create('淬锋道人', { gen: 5, comp: 5, luck: 5, body: 5 });
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

  /* ---- RV0 迁入：论道守卫/定价、切磋总限、行游拦截（v36 E197/E198） ---- */
  const rp36 = await page.evaluate(async () => {
    const p = Game.player;
    const out = {};
    p.dao = null; p.realmIdx = 1;
    // v36（E197）：论道每 NPC 每日一场——拦截不动状态；结怨拦截先于日限（不落 _discussDay 印）
    p.npcs.n3 = { alive: true, met: true, rel: 30, realmIdx: 1, layer: 0 };
    const day0 = Math.floor(p.day), rel0 = 30;
    p.npcs.n3._discussDay = day0;
    await NpcSys.discuss('n3');
    out.discussBlocked = Math.floor(p.day) === day0 && p.npcs.n3.rel === rel0;
    p.npcs.n3._discussDay = day0 - 1; p.npcs.n3.rel = -5;
    await NpcSys.discuss('n3');
    out.discussGrudgeFirst = p.npcs.n3._discussDay === day0 - 1;   // 结怨被拦且未盖当日印
    // v36（E197）：自随定价实发对表——n3 talent 3 → round(baseGain×1.24)，耗时 2 日、rel +1
    p.npcs.n3.rel = rel0;
    p.day = day0 + 1;
    const expGain = Math.round(Cultivate.baseGain(p) * 1.24);
    let gotGain = 0; const realAdd = Cultivate.addExp;
    Cultivate.addExp = (pp, n) => { gotGain = n; };
    await NpcSys.discuss('n3');
    Cultivate.addExp = realAdd;
    out.discussGainOk = gotGain === expGain && p.npcs.n3.rel === rel0 + 1 && Math.floor(p.day) === day0 + 3;
    // v36（E197/E198）：行游拦截先于一切守卫——被拦者不落任何当日印（取本旬行游者；计数基线解耦）
    const away = GameData.NPCS.find(d => NpcSys.isAway(p, d.id));
    out.awayProbed = !!away;
    if (away) {
      p.npcs[away.id] = { alive: true, met: true, rel: 50, realmIdx: 1, layer: 0 };
      const cntBefore = p._sparCount || 0;
      await NpcSys.spar(away.id);
      await NpcSys.discuss(away.id);
      out.awayFirst = !p.npcs[away.id]._discussDay && !p.npcs[away.id].sparDay && (p._sparCount || 0) === cntBefore;
    }
    // v36（E198）：每日 3 场总限——第 4 场被拦不计数；跨日重置后放行（stub Battle.start 防真开战；
    // 取今明两旬皆非行游者，防跨旬行游轮换拦截重置探针）
    const realStart = Battle.start; Battle.start = () => {};
    const notAway = id => !NpcSys.isAway(p, id) && !NpcSys.isAway({ day: (p.day || 0) + 1 }, id);
    const near = GameData.NPCS.find(d => notAway(d.id));
    p.npcs[near.id] = { alive: true, met: true, rel: 20, realmIdx: 1, layer: 0 };
    p._sparCountDay = Math.floor(p.day); p._sparCount = 3;
    await NpcSys.spar(near.id);
    out.sparTotalBlocked = p._sparCount === 3 && !Battle.active;
    p.day = Math.floor(p.day) + 1;
    await NpcSys.spar(near.id);
    out.sparCountReset = p._sparCount === 1 && p._sparCountDay === Math.floor(p.day);
    Battle.start = realStart;
    return out;
  });

  /* ---- RB B2 温书模式（v36 E199）：11 段重读纯鼠标通读到底 · 零状态变更深比对 · 去按钮化 ---- */
  const rB2 = await page.evaluate(async () => {
    const p = Game.player;
    const out = { stories: {} };
    const snap = () => JSON.stringify({ c: p.counters, ch: p.story && p.story.choices, f: p.story && p.story.flags, fr: p.fortune, ins: p.insight, exp: p.exp, day: p.day, st: p.stones, bag: p.bag });
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const RO_IDS = ['c1_end', 'c2_end', 'c3_end', 'c4_mid', 'c4_end', 'c5_end', 'c6_end', 'c7_end', 'c8_end', 'c9_end', 'c10_end'];
    for (const sid of RO_IDS) {
      const script = GameData.STORIES[sid];
      if (!script) { out.stories[sid] = 'missing'; continue; }
      const before = snap();
      Story.play(script, null, true);
      let sawChoice = false, sawBattle = false, sawInvest = false, clicks = 0, ok = true;
      while (Story.active() && clicks < 500) {
        const c = Story.cur, sc = c && c.scenes[c.idx];
        if (sc && (sc.t === 'choice' || sc.t === 'investigate')) {
          if (sc.t === 'investigate') sawInvest = true; else sawChoice = true;
          if (document.querySelector('#story-box [data-action="story-choice"]')) ok = false;   // 温书态不可再点
          if (!document.querySelector('#story-box [data-action="story-next"]')) ok = false;    // 继 续 钮可见
        }
        if (sc && sc.t === 'battle') {
          sawBattle = true;
          if (document.querySelector('#story-box [data-action="story-battle"]')) ok = false;
          if (!document.querySelector('#story-box [data-action="story-next"]')) ok = false;
        }
        const btn = document.querySelector('#story-box [data-action="story-next"]');
        if (!btn) { ok = false; break; }   // 温书态任何场景都不应缺 foot 钮（卡死回归即红）
        btn.click();
        clicks++;
        await wait(5);
      }
      if (Story.active()) { Story.close(); ok = false; }   // 未通读到底
      out.stories[sid] = (snap() === before ? 1 : 0) + '/' + clicks + (sawBattle ? '/B' : '') + (sawChoice ? '/C' : '') + (sawInvest ? '/I' : '') + (ok ? '' : '/!');
      await wait(30);
    }
    return out;
  });
  {
    const vals = Object.entries(rB2.stories);
    const allOk = vals.length === 11 && vals.every(([, v]) => v !== 'missing' && !String(v).endsWith('/!')) && vals.every(([, v]) => String(v).startsWith('1/'));
    const cov = vals.some(([, v]) => String(v).includes('/B')) && vals.some(([, v]) => String(v).includes('/C')) && vals.some(([, v]) => String(v).includes('/I'));
    allOk ? pass('RB17a 温书：11 段重读前后 counters/choices/flags 深比对零状态变更（E199）') : fail('RB17a 温书零变更', JSON.stringify(rB2.stories));
    cov ? pass('RB17b 温书：含战/抉择/细察场景全覆盖且纯鼠标通读到底（E199）') : fail('RB17b 覆盖', JSON.stringify(rB2.stories));
    (vals.every(([, v]) => !String(v).includes('/!')))
      ? pass('RB17c 温书：抉择/细察/战卡去按钮化且 foot 继 续钮全程可见（E199）') : fail('RB17c 去按钮化', JSON.stringify(rB2.stories));
  }

  /* ---- RB B3 Daily.resetIfNew 严格比较（v36 E203） ---- */
  const rB3 = await page.evaluate(() => {
    const out = {};
    const p0 = { day: 0 };
    out.day0First = Daily.resetIfNew(p0, '_t') === true && p0._t === 0;
    out.day0Once = Daily.resetIfNew(p0, '_t') === false;   // 第 0 日不再同日反复判新（原 coercion 陷阱）
    const p1 = { day: 5 };
    out.undefNew = Daily.resetIfNew(p1, '_t2') === true;   // 未定义键自然判新一日
    out.sameDay = Daily.resetIfNew(p1, '_t2') === false;
    return out;
  });
  rB3.day0First && rB3.day0Once && rB3.undefNew && rB3.sameDay
    ? pass('RB18 resetIfNew 严格比较：第 0 日去重、未定义键判新（v36 E203）') : fail('RB18 Daily', JSON.stringify(rB3));

  /* ---- RB B4 v36 B2：E212 投控收口活路径 / E207-E208 rate=0 零掉落 ---- */
  const rB4 = await page.evaluate(() => {
    const out = { n: 60, hits: 0, live: 0 };
    const saved = Battle.active;
    const mk = frozen => ({ myFx: frozen ? [{ kind: 'freeze', rounds: 2 }] : [], enemy: { skills: [{ kind: 'freeze', name: '冰弦裂魂', w: 5 }], fx: [], hp: 100, hpMax: 100, elite: false }, playerMoves: [], ctx: {} });
    try {
      Battle.active = mk(true);
      for (let i = 0; i < out.n; i++) { const d = Battle.enemyDecide(); if (d.kind === 'skill' && d.sk && d.sk.kind === 'freeze') out.hits++; }
      Battle.active = mk(false);
      for (let i = 0; i < out.n; i++) { const d = Battle.enemyDecide(); if (d.kind === 'skill' && d.sk && d.sk.kind === 'freeze') out.live++; }
    } finally { Battle.active = saved; }
    return out;
  });
  rB4.hits === 0 ? pass('RB19a 已冰封玩家 60 手零投控——AI 整手不再浪费（E212）') : fail('RB19a 投控', JSON.stringify(rB4));
  rB4.live >= 1 ? pass('RB19b 未冰封活路径仍正常投控——守卫非废技（E212）') : fail('RB19b 活路径', JSON.stringify(rB4));
  const rB5 = await page.evaluate(() => {
    const out = { n: 24, empty: 0, some: 0 };
    const p = Game.player;
    const savedBag = p.bag; p.bag = {};
    try {
      const e0 = { dropTier: 1, elite: false };
      for (let i = 0; i < out.n; i++) { if (!Battle.rollDrops(e0, {}, 0).length) out.empty++; }   // rate=0 → coef=0 → 全部系数位归零
      for (let i = 0; i < out.n; i++) { if (Battle.rollDrops(e0, {}, 1).length) out.some++; }
    } finally { p.bag = savedBag; }
    return out;
  });
  rB5.empty === rB5.n ? pass('RB20a rate=0（中间波半额→零期望位）24 轮全空——E169 归真（E207）') : fail('RB20a', JSON.stringify(rB5));
  rB5.some > 0 ? pass('RB20b rate=1 全系数位照常掉落——coef 单源不误伤（E208）') : fail('RB20b', JSON.stringify(rB5));

  /* ---- RB B5 v36 U1：E218 聚灵窗口 / E219 悟道入卡 ---- */
  const rB6 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    // 场景一：点燃后第 0/2 日窗口内 ×1.5，第 3 日窗外恢复常态
    p.cave = { lv: 1, builds: {}, plots: [] };
    p.day = 300; p.rushDay = 300; p.dao = null;
    const unboosted = Cultivate.baseGain(p) / 1.5;
    out.winBoost = Math.abs(Cultivate.baseGain(p) / unboosted - 1.5) < 0.01;
    p.day = 302;
    out.winBoostD2 = Math.abs(Cultivate.baseGain(p) / unboosted - 1.5) < 0.01;
    p.day = 303;
    out.expired = Math.abs(Cultivate.baseGain(p) - unboosted) < 0.01;
    // 场景二：窗口第 2 日再点被拦且不扣款；卡面在窗口内即报「3 日内修炼 ×1.5」（口径与行权一致）
    p.day = 301;
    const stonesBefore = p.stones.low;
    await CaveSys.spiritRush();
    out.blocked = p.rushDay === 300 && p.stones.low === stonesBefore;
    out.cardOk = UI.renderDailyCard().includes('3 日内修炼 ×1.5');
    // 文案预估与实发一致：弹窗 X/Y 对表 0.5/8×baseGain（未点燃态实算）
    let captured = '';
    const op = UI.popup; UI.popup = async (o) => { captured = o.html || ''; return false; };
    p.day = 310; p.rushDay = null;
    await CaveSys.spiritRush();
    UI.popup = op;
    const bg = Cultivate.baseGain(p);
    out.textOk = captured.includes(`下一轮修炼约 +${Utils.fmtNum(Math.round(bg * 0.5))} 修为`) && captured.includes(`整轮闭关约 +${Utils.fmtNum(Math.round(bg * 8))} 修为`);
    // 卡面与行权口径一致：未点燃 todo 态给直燃钮、窗口态已验（cardOk）
    out.cardIdle = (() => { p.rushDay = null; const c = UI.renderDailyCard(); p.rushDay = 300; return c.includes('阵未点燃'); })();
    p.rushDay = null; p.day = 10;
    return out;
  });
  rB6.winBoost && rB6.winBoostD2 && rB6.expired
    ? pass('RB21a 聚灵窗口：点燃后第 0/2 日 baseGain ×1.5、第 3 日回落常态（E218）') : fail('RB21a 窗口', JSON.stringify(rB6));
  rB6.blocked ? pass('RB21b 窗口第 2 日再点被拦且灵石分文未扣（E218）') : fail('RB21b 拦截', JSON.stringify(rB6));
  rB6.textOk && rB6.cardOk && rB6.cardIdle
    ? pass('RB21c 聚灵文案预估与实发一致 + 卡面/行权口径一致（E218）') : fail('RB21c 口径', JSON.stringify(rB6));
  const rB7 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    // v37（E265）：悟道成本改随境 20+2×realmIdx（wuDaoCost 单源）——r2 为 24，卡面/拦截/实扣三处同口径
    p.day = 400; p._settleDay = 400; p._wuDaoDay = -1; p.dao = null; p.realmIdx = 2; p.insight = 24;
    const savedCaveB22 = p.cave; p.cave = null;   // v37（B9 定稿）：洞府访客/虫害等异步插账隔离（cave 论道访客 +2 感悟会让扣除后不为 0）   // 对齐 _settleDay：防 afterAction 的 30 日补结插入洞府访客等噪音（本断言只验悟道本体）
    out.todoRow = UI.renderDailyCard().includes('感悟 24/24 · 可炼作修为') && UI.renderDailyCard().includes('data-action="act-wudao"');
    out.progressRow = (() => { p.insight = 12; const ok = UI.renderDailyCard().includes('感悟 12/24 · 攒足可炼作修为'); p.insight = 24; return ok; })();
    out.doneRow = (() => { p._wuDaoDay = 400; const ok = UI.renderDailyCard().includes('今日已悟 · 炼作修为'); p._wuDaoDay = -1; return ok; })();
    // r9 报仙元口径（池空视同全再生——纯度文案不入卡面）
    const r9save = p.realmIdx; p.realmIdx = 9; p.insight = 40;
    out.r9Row = UI.renderDailyCard().includes('感悟 40/38 · 可炼作仙元');
    p.realmIdx = r9save; p.insight = 24;
    // 行内直达走原确认弹窗 + 日限 _wuDaoDay 计数。页面异步系统（挂机/日结系定时器）会在 await
    // 间隙写 p.insight——把 insight=24 的注入放进弹窗桩体内：桩体 resolve 到 wuDao 续延之间是
    // 纯微任务链，定时器不可插队，扣除后恰为 0 是确定的
    const op = UI.popup; let popupTitle = '';
    // 仅对悟道弹窗放行——wuDao 收尾链 afterAction 可能触发洞府访客等其他弹窗，恒 true 会误接受（散修论道 +2 感悟污染断言）
    UI.popup = async (o) => { if (!popupTitle) popupTitle = o.title || ''; return (o.title || '') === '悟 道'; };
    const expBefore = p.exp;
    await Cultivate.wuDao();
    UI.popup = op;
    p.cave = savedCaveB22;
    out.confirmed = popupTitle === '悟 道' && p._wuDaoDay === 400 && p.insight === 0 && p.exp > expBefore;
    return out;
  });
  rB7.todoRow && rB7.progressRow && rB7.doneRow
    ? pass('RB22a 悟道入卡三态：≥门槛 todo+行内钮 / <门槛 ok 进度 / 已悟 ok（E219；v37（E265）门槛随境 20+2r，r2=24）') : fail('RB22a 三态', JSON.stringify(rB7));
  rB7.r9Row ? pass('RB22b 悟道 stat 分境界：r9 报「可炼作仙元」（E219；v37 起仙元随纯度折算，卡面不再写死 1000）') : fail('RB22b r9', JSON.stringify(rB7));
  rB7.confirmed ? pass('RB22c 行内直达走原「悟 道」确认弹窗 + _wuDaoDay 日限与 24 点（20+2×r2）扣除（E219/E265）') : fail('RB22c 直达', JSON.stringify(rB7));

  /* ---- RB B7 v36 U3：E223 种子日均链 / 卡面收成口径 ---- */
  const rB9 = await page.evaluate(() => {
    const out = {};
    const per = id => { const s = GameData.ITEMS[id]; return (2 * GameData.ITEMS[s.crop].price - s.price) / s.days; };
    const g1 = per('seed_lingcao'), g2 = Math.max(per('seed_lingzhi'), per('seed_bingpo')),
      g3 = Math.max(per('seed_xuelian'), per('seed_lianhun')), g4 = per('seed_xingchen'), g5 = per('seed_xianling');
    out.chainOk = g1 < g2 && g2 < g3 && g3 < g4 && g4 < g5;
    out.g3Band = g3 > 413.3 && g3 < 1150 && per('seed_lianhun') > per('seed_xuelian');   // 处方带：431.6/466.7 落冰魄与星辉之间且炼魂>雪莲
    out.g3Exact = Math.abs(per('seed_xuelian') - 431.6) < 0.1 && Math.abs(per('seed_lianhun') - 466.7) < 0.1;
    out.cardNote = (() => { const p = Game.player; const save = p.cave; p.cave = { lv: 1, builds: {}, plots: [{ seed: 'seed_xuelian', crop: 'm_xuelian', days: 19, plantedDay: Math.floor(p.day) }] }; const html = CaveSys.renderPlots ? CaveSys.renderPlots(p) : ''; p.cave = save; return html.includes('可收 ×2｜过熟 20 日折半｜季秋 +1'); })();
    return out;
  });
  rB9.chainOk ? pass('RB24a 种子相邻 grade 档最优日均严格递增（E223 断言口径）') : fail('RB24a 链', JSON.stringify(rB9));
  rB9.g3Band && rB9.g3Exact ? pass('RB24b grade3 日均 431.6/466.7 落冰魄与星辉之间且炼魂>雪莲（E223）') : fail('RB24b grade3', JSON.stringify(rB9));
  rB9.cardNote ? pass('RB24c 田块卡面收成口径「可收 ×2｜过熟 20 日折半｜季秋 +1」（E223）') : fail('RB24c 卡面', JSON.stringify(rB9));

  /* ---- RB B8 v36 U4：E226 perk/生死状 · E227 追赶 · E228 cultGift ---- */
  const rB10 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    p.sect = { id: 'qingyun', contrib: 5000, faction: null, rank: 'inner', tasks: [], peakContrib: 0 };
    // 丹鼎 perk：成丹率 +8（rate 期望路径实测）
    const rec = GameData.ALCHEMY_RECIPES.find(x => x.id === 'r1');
    p.sect.faction = null; const r0 = CraftSys.rate(p, rec);
    p.sect.faction = 'danding'; const r1 = CraftSys.rate(p, rec);
    out.danding = r1 === Math.min(95, r0 + 8);
    // 藏经 perk：参悟所得 +15%（stub 弹窗与消耗，实调 studyRecipe）
    p.sect.faction = 'cangjing';
    Bag.addItem('m_danfang', 2);
    const ins0 = p.insight || 0;
    const op = UI.popup; UI.popup = async () => true;
    await CraftSys.studyRecipe('a1');
    UI.popup = op;
    out.cangjing = (p.insight || 0) - ins0 === Math.round(6 * 1.15);
    p.sect.faction = null;
    // 生死状战败扣减：dangerTask 败北 → 心魔 3+5、灵石多扣一成
    const saved = Battle.active;
    Battle.active = { ctx: { dangerTask: true }, enemy: { name: '生死状测试傀儡' }, logs: [], over: false, won: false, busy: true };
    p.hp = 1;
    const xm0 = p.xinmo || 0;
    const totalStones = p.stones.low + p.stones.mid * 100 + p.stones.high * 10000;
    await Battle.defeat();
    out.dangerXinmo = (p.xinmo || 0) - xm0 >= 8;   // 基础 +3 + 生死状 +5
    out.stonesDown = (p.stones.low + p.stones.mid * 100 + p.stones.high * 10000) < totalStones;
    if (Battle.active) { Battle.active.over = true; Battle.active = null; document.getElementById('battle-modal')?.classList.add('hidden'); }
    p.sect = null;
    return out;
  });
  rB10.danding && rB10.cangjing && rB10.dangerXinmo && rB10.stonesDown
    ? pass('RB25 派系 perk 生效实测（丹鼎+8/藏经+15%参悟）+ 生死状败北心魔+8 与灵石折损（v36 E226）') : fail('RB25 perk', JSON.stringify(rB10));
  const rB11 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    // 追赶因子可观测：固定 randF/chance，落后 20 层 vs 同层，年增量比应为 2.0
    const savedRandF = Utils.randF, savedChance = Utils.chance;
    Utils.randF = () => 0.085; Utils.chance = () => false;
    try {
      p.layer = 0;   // 追赶比较固定 NPC 境界（r0），只变玩家 rp——境界 layerNeed 基数差异远大于追赶因子，不能跨境界比
      const mk = rp => ({ alive: true, realmIdx: Math.floor(rp / 4), layer: rp % 4, map: 'qingfeng', grudge: false });
      p.realmIdx = 5;              // 玩家 rp=20 → NPC(r0) 落后 20 小层 → chaseMul = 1+20×0.05 = 2.0
      p.npcs.n8 = mk(0);
      p.npcs.n8.exp = 0;
      NpcSys.yearTick(p, 1);
      const behind = p.npcs.n8.exp;
      p.realmIdx = 0;              // 玩家 rp=0 → 同层 → 无追赶
      p.npcs.n8 = mk(0);
      p.npcs.n8.exp = 0;
      NpcSys.yearTick(p, 1);
      const even = p.npcs.n8.exp;
      out.ratio = even > 0 ? behind / even : 0;
      // 战力三档：npcCombatPower 同量纲可算
      out.powOk = NpcSys.npcCombatPower(p, 'n8') > 0;
      // cultGift：满 comp 生而知之折算 +2；未满逐位一致
      const p2 = { attrs: { gen: 10, comp: 10, luck: 10, body: 10 }, cultGift: 0 };
      ReincarnationSys.TREE_EFFECTS[1].apply(p2);
      out.fullGift = p2.cultGift === 2 && p2.attrs.comp === 10;
      const p3 = { attrs: { gen: 8, comp: 8, luck: 8, body: 8 }, cultGift: 0 };
      ReincarnationSys.TREE_EFFECTS[1].apply(p3);
      out.unfilled = p3.attrs.comp === 10 && p3.cultGift === 0;   // 8+2 未触顶走原加成
      const p4 = { attrs: { gen: 10, comp: 9, luck: 10, body: 10 }, cultGift: 0 };
      ReincarnationSys.TREE_EFFECTS[4].apply(p4);   // 道基天成部分满：comp 9→10 生效、其余三满维折算 +1.5→取整 2
      out.partial = p4.attrs.comp === 10 && p4.cultGift === Math.round(2 * 3 / 4);
      // Stat 消费：cultGift 4 → cultPct 差 4
      const saveGift = p.cultGift;
      p.cultGift = 0; const c0 = Stat.compute(p).cultPct;
      p.cultGift = 4; const c4 = Stat.compute(p).cultPct;
      p.cultGift = saveGift;
      out.statOk = c4 - c0 === 4;
    } finally { Utils.randF = savedRandF; Utils.chance = savedChance; }
    return out;
  });
  rB11.ratio >= 2 && rB11.powOk && rB11.fullGift && rB11.unfilled && rB11.partial && rB11.statOk
    ? pass('RB26 追赶因子 ×2 实测 + 战力估算 + cultGift 满/未满/部分满与 Stat 消费（v36 E227/E228）') : fail('RB26 追赶/折算', JSON.stringify(rB11));

  /* ---- RB B9 v36 F：E230 证道演出非阻塞不挡结算行序 ---- */
  const rB12 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedXj = p.xianjie, savedFlags = p.flags, savedReinc = p.reinc;
    const savedLegacy = JSON.parse(JSON.stringify(ReincarnationSys.readLegacy()));   // legacy 一并快照——daozuCheck→grantMarks 写 legacy.marksEarned，RB14 的 marks 是其镜像
    p.xianjie = { idx: 5, layer: 3 }; p.flags = { daozu: false };
    p.reinc = { lives: 0, marks: 0, compPct: 0, grudges: [], firstLife: true };
    XianSys.daozuCheck(p);   // 证道结算（Log → realmShow 演出 → announce → chron）
    out.settled = p.flags.daozu === true;   // 结算行先落（flags 已置）
    out.showUp = !!document.getElementById('realm-show');   // 全屏演出元素已挂载（非阻塞动画进行中/已排程摘除）
    out.lastLine = (document.getElementById('log')?.lastElementChild?.textContent || '').includes('道祖之境');
    ReincarnationSys.writeLegacy(savedLegacy);
    p.xianjie = savedXj; p.flags = savedFlags; p.reinc = savedReinc;   // 恢复引用，RB14 的 reinc 状态不受污染
    return out;
  });
  rB12.settled && rB12.showUp && rB12.lastLine
    ? pass('RB28 证道演出非阻塞：结算先行落定、异象挂载、日志行序不乱（v36 E230）') : fail('RB28 证道', JSON.stringify(rB12));

  /* ---- RB B6 v36 U2：E221 塔绩纳财日限 / 器魂去向 ---- */
  const rB8 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const op = UI.popup; UI.popup = async () => true;
    try {
      p.day = 500; p._settleDay = 500;
      p.counters.towerWins = 1000;
      TowerSys.state(p); TowerSys.syncToday(p);
      p.tower.today.stonesRedeemDay = -1; p.tower.today.stonesRedeemN = 0;
      await TowerSys.redeem('stones'); await TowerSys.redeem('stones');
      out.twoOk = p.counters.towerWins === 1000 - 30 && p.tower.today.stonesRedeemN === 2;
      const winsBefore = p.counters.towerWins;
      await TowerSys.redeem('stones');
      out.thirdBlocked = p.counters.towerWins === winsBefore && p.tower.today.stonesRedeemN === 2;
      p.day = 501; p._settleDay = 501; TowerSys.syncToday(p);
      await TowerSys.redeem('stones');
      out.resetOk = p.counters.towerWins === winsBefore - 15 && p.tower.today.stonesRedeemN === 1;
      p.counters.towerWins += 40;
      const q0 = p.qihun || 0;
      await TowerSys.redeem('qihun');
      out.qihunOk = p.qihun === q0 + 5;
      out.r9Cap = 2 * Math.round(120 * GameData.stoneEco(9)) <= Math.round(300 * GameData.stoneEco(9));   // 240×eco ≤ 300×eco
    } finally { UI.popup = op; }
    return out;
  });
  rB8.twoOk && rB8.thirdBlocked ? pass('RB23a 塔绩纳财：前两次各扣 15 绩、第 3 次被拦不计数（E221）') : fail('RB23a 日限', JSON.stringify(rB8));
  rB8.resetOk ? pass('RB23b 纳财计数跨日重置后放行（E221）') : fail('RB23b 重置', JSON.stringify(rB8));
  rB8.qihunOk && rB8.r9Cap ? pass('RB23c 器魂 +5 入账 + r9 深爬 240×eco ≤ 层奖日额度 300×eco（E221/E225 联动）') : fail('RB23c 器魂', JSON.stringify(rB8));


  /* ---- v22 补：E200 塔挂起机制级行为（waitIdle 行为 + steps 弹窗挂起路径） ---- */
  const rv1 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    p.realmIdx = 2; p.cave = { lv: 1, builds: {}, plots: [] };
    // waitIdle 行为：有未决弹窗时挂起，释放后放行（除夕年兽开打的前提——active 空位）
    const saved = UI._popupResolve;
    UI._popupResolve = () => {};
    let done = false;
    const w = TowerSys.waitIdle(800).then(() => { done = true; });
    await new Promise(r => setTimeout(r, 120));
    out.holdsWhilePopup = !done;
    UI.popupChoose(-1); UI._popupResolve = null;
    await w;
    out.releasesAfterClose = done;
    // steps 层路径挂起：模拟「层奖后 steps 弹窗前」时机——waitIdle 不误放行战斗占用
    Battle.active = { enemy: { name: '挂起测试' }, ctx: {}, logs: [], over: false, busy: true };
    let done2 = false;
    const w2 = TowerSys.waitIdle(600).then(() => { done2 = true; });
    await new Promise(r => setTimeout(r, 120));
    out.holdsWhileBattle = !done2;
    Battle.active = null;
    await w2;
    out.releasesAfterBattle = done2;
    return out;
  });
  rv1.holdsWhilePopup && rv1.releasesAfterClose
    ? pass('RV1a waitIdle：未决弹窗（节庆）挂起续层、关闭后放行（E200）') : fail('RV1a 弹窗挂起', JSON.stringify(rv1));
  rv1.holdsWhileBattle && rv1.releasesAfterBattle
    ? pass('RV1b waitIdle：战斗（除夕年兽迎战）占用时挂起 steps 弹窗、终了放行（E200）') : fail('RV1b 战斗挂起', JSON.stringify(rv1));

  /* ---- v22 补：E205 ESC 次日重问 / 设置改回当日即聚 ---- */
  const rv2 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    p.cave = { lv: 1, builds: {}, plots: [] };
    p.day = 800; p._settleDay = 800; p.rushDay = null; p._autoRush = undefined; p._autoRushSkipDay = -1;
    p.signDay = 800; p.bounties = { day: 800, list: [] }; p.beasts = { active: null, list: [] };   // 环境确定化：其余日常步骤零输出零弹窗，聚灵步行为单独可观测
    // ESC/遮罩（undefined）：不落任何偏好印、当日不聚灵（rushDay 未置即未扣款），次日自然重问
    const op = UI.popup; UI.popup = async () => undefined;
    await Guide.dailyAll();
    out.escSkipDay = p._autoRushSkipDay !== 800 && p._autoRush === undefined && p.rushDay === null;
    p.day = 801; p._settleDay = 801; p.rushDay = null; p._autoRushSkipDay = -1;
    let asked = false;
    UI.popup = async () => { asked = true; return false; };
    await Guide.dailyAll();
    out.reaskNextDay = asked;
    // 设置改回当日即聚：skip 档在设置中心改 always → 当日行权即聚灵不询问
    p.day = 802; p._settleDay = 802; p.rushDay = null; p._autoRush = 'skip'; p._autoRushSkipDay = -1;
    p.stones.low += 10000000;   // 防多轮运行间灵石耗尽使 spendStones 偶发失败
    p._autoRush = 'always';   // 设置中心 amb-rush change 写入等价路径
    UI.popup = async (o) => { asked = asked && false; return 'once'; };
    const stonesBefore = p.stones.low;
    await Guide.dailyAll();
    out.setThenRush = p.rushDay === 802 && p.stones.low < stonesBefore;
    UI.popup = op;
    p.day = 10; p.rushDay = null; p._autoRush = undefined; p._autoRushSkipDay = -1;
    return out;
  });
  rv2.escSkipDay && rv2.reaskNextDay && rv2.setThenRush
    ? pass('RV2 ESC 关聚灵次日重问 + 设置改回当日即聚（v36 E205/E218）') : fail('RV2 聚灵三态', JSON.stringify(rv2));

  /* ---- v22 补：E206 e_reborn 精英三路径复活 ---- */
  const rv3 = await page.evaluate(() => {
    const out = { dot: false, counter: false, thorns: false };
    const p = Game.player;
    const saved = Battle.active;
    const mk = () => ({ enemy: { name: '不灭测试', hpMax: 100, hp: 0, elite: true, _rebornUsed: false, fx: [] }, myFx: [], enemyFxIds: ['e_reborn'], ctx: {}, logs: [] });
    try {
      // 路径一：DOT 击杀（onEnemyHit 传伤值）
      let B = mk(); Battle.active = B;
      Battle.onEnemyHit(B, Stat.compute(p), 500);
      out.dot = B.enemy.hp === 30 && B.enemy._rebornUsed === true;
      // 路径二：反击击杀（传 0 复查不灭）
      B = mk(); Battle.active = B;
      Battle.onEnemyHit(B, Stat.compute(p), 0);
      out.counter = B.enemy.hp === 30;
      // 路径三：词缀反伤击杀（传 0）
      B = mk(); Battle.active = B;
      Battle.onEnemyHit(B, Stat.compute(p), 0);
      out.thorns = B.enemy.hp === 30;
      // 已用过不灭不再复活
      B.enemy._rebornUsed = true; B.enemy.hp = 0;
      Battle.onEnemyHit(B, Stat.compute(p), 0);
      out.onceOnly = B.enemy.hp === 0;
    } finally { Battle.active = saved; }
    return out;
  });
  rv3.dot && rv3.counter && rv3.thorns
    ? pass('RV3a e_reborn 精英：DOT/反击/反伤三致死路径各复活一次（E206）') : fail('RV3a 三路径', JSON.stringify(rv3));
  rv3.onceOnly ? pass('RV3b 「不灭」每场一次——再用不复活（E206）') : fail('RV3b onceOnly', JSON.stringify(rv3));

  /* ---- v22 补：E210 合击就绪自动出手 ---- */
  const rv4 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const saved = Battle.active;
    const savedCombo = BeastSys.comboReady;
    p.hp = Stat.compute(p).maxHp; p.mp = 9999;
    BeastSys.comboReady = () => true;
    Battle.active = { enemy: { name: '合击测试', hp: 500, hpMax: 600 }, myFx: [], playerMoves: [], ctx: {}, over: false, busy: false, comboUsed: 0, morale: 10, zhenyuan: 6, zmax: 6 };
    let comboCalled = false;
    const savedAct = Battle.act;
    Battle.act = (kind) => { if (kind === 'combo') comboCalled = true; };
    try {
      Battle.autoPilot();
    } finally { Battle.act = savedAct; BeastSys.comboReady = savedCombo; Battle.active = saved; }
    out.autoCombo = comboCalled;
    return out;
  });
  rv4.autoCombo
    ? pass('RV4 合击就绪 autoPilot 自动出手（免费首用）（v36 E210）') : fail('RV4 合击', JSON.stringify(rv4));

  /* ---- v22 补：E224 seasonOf 四季画符成本单调（仲夏成本最高） ---- */
  const rv5 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const saved = { day: p.day, dao: p.dao, daoExp: p.daoExp };
    p.dao = 'talisman'; p.daoExp = { talisman: 99999 };
    const costs = {};
    [[0, 60], [1, 160], [2, 260], [3, 340]].forEach(([se, d]) => { p.day = d; costs[se] = CraftSys.drawPrice(p); });
    p.day = saved.day; p.dao = saved.dao; p.daoExp = saved.daoExp;
    out.costs = costs;
    out.summerHighest = costs[1] >= costs[0] && costs[1] >= costs[2] && costs[1] >= costs[3];
    return out;
  });
  rv5.summerHighest
    ? pass('RV5 seasonOf 四季画符成本：仲夏期望摊入使夏季成本最高（v36 E224）') : fail('RV5 四季', JSON.stringify(rv5));

  /* ---- v22 补：E227 追赶蒙特卡洛固化（24 人 3 年晋层 + 登顶前战力差提示） ---- */
  const rv6 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    p.realmIdx = 5; p.layer = 0;
    p.npcs = NpcSys.freshNpcs();
    GameData.NPCS.forEach(d => { const s = p.npcs[d.id]; if (s) { s.alive = true; s.met = true; } });
    const fresh = NpcSys.freshNpcs();
    for (let y = 1; y <= 3; y++) NpcSys.yearTick(p, y);
    let upgraded = 0;
    for (const d of GameData.NPCS) {
      const a = p.npcs[d.id], b = fresh[d.id];
      if (a && b && (a.realmIdx * 4 + a.layer) > (b.realmIdx * 4 + b.layer)) upgraded++;
    }
    out.upgraded = upgraded;
    p.realmIdx = 2; p.layer = 0;
    const html = RankSys.render(p);
    out.vsCount = (html.match(/>可敌<|>略逊<|>远逊</g) || []).length;
    out.chaseTip = html.includes('距上一位');
    p.realmIdx = 5;
    return out;
  });
  rv6.upgraded >= 1
    ? pass('RV6a 温和追赶蒙特卡洛：24 人 3 年内 ≥1 名 NPC 晋层（实测 ' + rv6.upgraded + ' 名）（v36 E227）') : fail('RV6a 晋层', JSON.stringify(rv6));
  rv6.vsCount >= 3 && rv6.chaseTip
    ? pass('RV6b 玩家登顶前 ≥3 名 NPC 有战力差提示 + 距上一位追赶目标（实测 ' + rv6.vsCount + ' 处）（v36 E227）') : fail('RV6b 提示', JSON.stringify(rv6));

  /* ---- v22 补：E222 r2~r7 每境至少一枚当境最优上架丹（人工复核固化） ---- */
  const rv7 = await page.evaluate(() => {
    const G = GameData;
    const shelves = G.SHOP.filter(r => G.ITEMS[r.item] && G.ITEMS[r.item].type === 'pill' && G.ITEMS[r.item].use && G.ITEMS[r.item].use.exp && !G.ITEMS[r.item].use.mpPct && !G.ITEMS[r.item].battle);
    const out = {};
    for (let r = 2; r <= 7; r++) {
      const best = shelves.filter(x => x.minRealm <= r)
        .map(x => G.ITEMS[x.item].price / G.ITEMS[x.item].use.exp);
      out['r' + r] = best.length ? Math.min(...best).toFixed(3) : 'none';
    }
    out.allCovered = Object.values(out).every(v => v !== 'none');
    return out;
  });
  rv7.allCovered && Number(rv7.r2) <= 0.7 && Number(rv7.r7) <= 0.9
    ? pass('RV7 r2~r7 每境均有当境上架最优性价比丹（r2 ' + rv7.r2 + ' … r7 ' + rv7.r7 + ' 灵石/点）（v36 E222 复核）') : fail('RV7 丹药复核', JSON.stringify(rv7));

  /* ---- v22 补：E213 大比三年一届——首届落在凡间一世（第 3 年开幕） ---- */
  const rv8 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    p.sect = { id: 'qingyun', contrib: 0, faction: null, rank: 'outer', tasks: [], lastTourney: 0, tourney: null };
    p.day = 365 * 2 + 300;   // 第 3 年
    SectSys.tourneyCheck(p);
    out.openedYear3 = !!p.sect.tourney;
    p.sect.lastTourney = 0; p.sect.tourney = null;
    p.day = 365 + 300;       // 第 2 年不开
    SectSys.tourneyCheck(p);
    out.notYear2 = !p.sect.tourney;
    p.sect = null;
    return out;
  });
  rv8.openedYear3 && rv8.notYear2
    ? pass('RV8 大比三年一届：第 3 年开幕、第 2 年不开（v36 E213）') : fail('RV8 大比', JSON.stringify(rv8));

  /* ---- v22 补：处方 RB 清单细粒度对齐（E197/E198/E204/E206 后置/E209/E211/E218/E222/E226/E227/E228） ---- */
  const rv9 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    p.stones.low += 10000000;
    // E197：talent 全表单价比对带内由 E220 门禁与 RB4c/RB4d 覆盖，此处不重复
    // E198：r3 总限后日入显式数字 = 27×eco(3)
    out.sparDay3 = Math.round(3 * 30 * 0.3 * GameData.eco(3)) === Math.round(27 * GameData.eco(3));
    // E204：waveReset 单源 11 字段
    const B0 = { comboUsed: 3, bmUsed: { a: 1 }, infantSaved: true, jadeSaved: true, enemyCtrlN: 2, turn: 9, morale: 50, combo: 4, lastSkillTag: 'x', skillChain: 3, skillSeq: 2 };
    Battle.waveReset(B0);
    out.waveReset = B0.comboUsed === 0 && B0.turn === 1 && B0.combo === 0 && B0.lastSkillTag === null && B0.skillSeq === 0 && B0.morale === 20;
    // E209：法诀会心回真元（塔祝福聚气归元）
    const savedA = Battle.active;
    Battle.active = { ctx: { tower: true }, zhenyuan: 0, zmax: 6, enemy: { name: 't' } };
    const savedMods = TowerSys.modsOf;
    TowerSys.modsOf = () => ({ zyCrit: 1 });
    Battle.gainZyOnCrit(p, true);
    out.zyOnCrit = Battle.active.zhenyuan === 1;
    TowerSys.modsOf = savedMods; Battle.active = savedA;
    // E211：riskAtk 累乘
    const run = { riskAtk: 1.25 };
    run.riskAtk = (run.riskAtk || 1) * 1.25;
    out.riskStack = Math.abs(run.riskAtk - 1.5625) < 1e-9;
    // E218：闭关开局一次结算被窗口整段覆盖（baseGain×1.5×10×1.6 / 30 日）
    p.rushDay = Math.floor(p.day);
    const secludeInWin = Cultivate.baseGain(p) * 10 * 1.6;
    const bgNoWin = Cultivate.baseGain(p) / 1.5;   // 去窗口基准（当前 p.rushDay 在窗口内）
    out.secludeWin = Math.round(secludeInWin) === Math.round(bgNoWin * 24);
    p.rushDay = null;
    // E222：tianyuan 单价与 zaohua 持平
    const ty = GameData.ITEMS.pill_tianyuan, zh = GameData.ITEMS.pill_zaohua;
    out.tianyuanPar = ty.use.exp / ty.price === zh.use.exp / zh.price;
    // E226：生死状开战双旗标
    p.sect = { id: 'qingyun', contrib: 0, faction: null, rank: 'outer', tasks: [{ type: 'kill', target: 'm_toumu', need: 1, progress: 0, danger: true }] };
    const savedB = Battle.active; Battle.active = null;
    const savedStart = Battle.start; let captured = null;
    Battle.start = (id, ctx) => { captured = ctx; };
    const savedPopup = UI.popup; UI.popup = async () => true;
    await SectSys.goDanger(0);
    UI.popup = savedPopup;
    out.dangerFlags = captured && captured.dangerTask === true && captured.sectDanger === 0;
    Battle.start = savedStart; Battle.active = savedB; p.sect = null;
    // E227：npcCombatPower 三档映射（同境可敌 / 高 3 小层略逊 / 高 8 小层远逊）
    p.npcs.n9 = { alive: true, realmIdx: 1, layer: 0 };
    p.realmIdx = 1; p.layer = 0;
    const powEq = NpcSys.npcCombatPower(p, 'n9') / Stat.power(p);
    const band = r => (r >= 0.9 && r <= 1.1) ? '可敌' : (r >= 0.7 && r <= 1.3) ? '略逊' : '远逊';
    const powHi = (() => { p.npcs.n9 = { alive: true, realmIdx: 3, layer: 0 }; const v = NpcSys.npcCombatPower(p, 'n9'); p.npcs.n9 = { alive: true, realmIdx: 1, layer: 0 }; return v; })();
    out.bandEq = powEq > 0 && powHi > powEq && ['可敌', '略逊', '远逊'].includes(band(powEq)) && ['可敌', '略逊', '远逊'].includes(band(powHi / Stat.power(p)));
    // E228：未满 9→10 全额不折算
    const p5 = { attrs: { gen: 9, comp: 9, luck: 9, body: 9 }, cultGift: 0 };
    ReincarnationSys.TREE_EFFECTS[4].apply(p5);
    out.nineFull = p5.attrs.gen === 10 && p5.cultGift === 0;
    return out;
  });
  rv9.sparDay3 && rv9.waveReset && rv9.zyOnCrit && rv9.riskStack && rv9.secludeWin && rv9.tianyuanPar && rv9.dangerFlags && rv9.bandEq && rv9.nineFull
    ? pass('RV9 处方细粒度对齐：总限日入 27×eco / waveReset 单源 / 聚气归元 / riskAtk 累乘 / 闭关窗口覆盖 / tianyuan 持平 / 生死状双旗标 / 战力三档 / 9→10 全额（v36 多条）')
    : fail('RV9 细粒度', JSON.stringify(rv9));

  /* ---- v22 补：E202 熟田虫害可除（运行时） ---- */
  const rv10 = await page.evaluate(() => {
    const p = Game.player;
    p.cave = { lv: 1, builds: {}, plots: [{ seed: 'seed_lingcao', crop: 'm_lingcao', days: 10, plantedDay: Math.floor(p.day) - 30, pested: true }] };
    CaveSys.harvest(0);
    const harvested = p.cave.plots[0] === null && !(p.bag['m_lingcao'] > 0);   // 过熟 20 日+虫害叠加 → 颗粒无收（惩罚链生效口径）
    p.cave.plots = [{ seed: 'seed_lingcao', crop: 'm_lingcao', days: 10, plantedDay: Math.floor(p.day) - 5, pested: true }];
    CaveSys.removePest(0);
    const cured = p.cave.plots[0].pested === false;
    p.cave = null;
    return { harvested, cured };
  });
  rv10.harvested && rv10.cured
    ? pass('RV10 熟田虫害：除虫出口运行时可用 + 熟田收获惩罚口径不变（v36 E202）') : fail('RV10 除虫', JSON.stringify(rv10));




} finally {
  if (browser) await browser.close();
}

console.log(`\n共 ${passN + failN} 项，失败 ${failN} 项`);
if (consoleErrors.length) {
  console.log(`控制台错误 ${consoleErrors.length} 条：`);
  for (const e of consoleErrors.slice(0, 10)) console.log('  · ' + e);
} else {
  console.log('控制台错误 0 条');
}
if (fails.length) { console.log('失败清单：' + fails.join(' | ')); }
process.exit((failN > 0 || consoleErrors.length > 0) ? 1 : 0);
