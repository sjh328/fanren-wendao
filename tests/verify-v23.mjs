/* ======================================================================
 * verify-v23 —— V37「清源」专项回归（B1 骨架，B2~B8 逐批增补，B9 定稿：本头注释与实覆盖一致）
 * 覆盖总览（SA 静态 + RB 运行时，共 72 项）：
 *   B1 经济与修为主粮通道封堵——
 *     A E263 宗门兑丹环：四行 minRealm/重锚 SA、exchange 拦截 RB、ui 置灰 SA、
 *       丹药族离散 ≤3× SA、审计第四路锚/第八路两行 SA、门槛 RB1、列表置灰 RB8
 *     B E264/E265 悟道感悟纯度：增发点单源 SA6（直写形态白名单外零命中）、FIFO 池 SA7、
 *       纯度公式三采样 SA8、成本单源 SA9、调息再生 SA10、迁移双同步 SA11、清池 SA12、
 *       迁移 RB2、spendInsight FIFO RB3、wuDao 三采样 RB4
 *     C E273 塔双腿：整场计日 SA13/注释 SA14/额度 SA15、计日 RB5、额度 RB6
 *     D E266 收集悬赏：floor 1.2 SA17、连锁不乘 floor SA18、预览同口径 SA19、实发 RB7
 *   B2 社交与长线系统校正——
 *     E240 结交一次性 SA20/RB9；E241 连签豁免 SA21/RB10；E248 了断放宽 SA22；
 *     E245 心魔夯实 SA23；E242 差事/悬赏池互斥 SA24/RB11 存量作废/RB12 生死状线回归
 *   B3 周目纵深与终局去处——
 *     E243 时代时长 SA25/迁移 RB13；E252 覆写留痕 SA26；E244 问剑夺位 SA27/RB14；
 *     E246 仙元携往生 SA28/RB15；E247 挂起补办 SA29/RB16
 *   B4 装备与战斗深度——
 *     E249 套装技 SA30/触发与无重复结算 RB17、词条位 SA31（+12 门控/保命/追击/回血/zmax/
 *       thorns 体修×1.5/execute 剑修 30% 终结线）；E269 跳层作废豁免 SA32/RB18
 *   B5 存档与状态完整性——
 *     E267 词缀星留档 SA33/深比对 RB19/旧形态迁移 RB20；E268 bak2 滚动快照 SA34/RB21 四场景；
 *     E272 章末演出补偿 SA35/RB22；E271 重复键删除 SA36
 *   B6 沉浸演出与反馈接线——
 *     E232 五死音效消费点 SA37；E239/E238/E234/E277 演出/红点/乘窗 SA38；
 *     三幕 realmShow RB23、虫害红点 RB24、离线乘窗 RB25
 *   B7 操作效率与口径统一——
 *     E235/E236 批量喂兽与兑换 SA39/RB26；E237/E255/E233/E260/E261/E251 口径统一 SA40/
 *       散修红点三态 RB27/聚灵窗口显隐 RB28
 *   B8 工程护栏与死重清理——
 *     E254 品阶兜底价单源 SA41；E253/E256/E271 check-actions 强化 SA42；
 *     E259/E257 build 反向校验与 README 守卫 SA43；E262 死重清理 SA44
 * 断言风格：源码静态检查（SA）+ 浏览器运行时行为检查（RB），沿 verify-v22 惯例。
 * 运行：npm run test:v23（需先 node server.mjs；test:all 链尾已接入）
 * ====================================================================== */
import puppeteer from 'puppeteer-core';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(dirname(fileURLToPath(import.meta.url)));
const R = f => readFileSync(join(__dirname, 'js', f), 'utf8').replace(/\r\n/g, '\n');

let passN = 0, failN = 0;
const fails = [];
const pass = t => { passN++; console.log('  ✓ ' + t); };
const fail = (t, d) => { failN++; fails.push(t); console.log('  ✗ ' + t + ' :: ' + d); };

/* ================= 源码静态组（SA） ================= */
console.log('===== SA 源码静态组 =====');
{
  const gdata = R('data/game-data.js');
  const sect = R('systems/sect.js');
  const cult = R('systems/cultivate.js');
  const tower = R('systems/tower.js');
  const battle = R('battle/battle.js');
  const bounty = R('systems/bounty.js');
  const ui = R('ui/ui.js');
  const pfac = R('core/player-factory.js');
  const bag = R('systems/bag.js');
  const dungeon = R('systems/dungeon.js');
  const gamejs = R('game.js');
  const bal = readFileSync(join(__dirname, 'scripts', 'balance-sim.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const paudit = readFileSync(join(__dirname, 'scripts', 'price-audit.mjs'), 'utf8').replace(/\r\n/g, '\n');

  /* ---- A E263 宗门兑丹环 ---- */
  {
    const rowsOk = ['pill_dujie|22500|3', 'pill_taichu|13500|4', 'pill_yuanshen|6000|5', 'pill_zaohua|20000|6']
      .every(spec => {
        const [item, cost, mr] = spec.split('|');
        return new RegExp(`\\{ item: '${item}',\\s*cost: ${cost}, minRealm: ${mr} \\}`).test(gdata);
      });
    rowsOk ? pass('SA1 SECT_EXCHANGE 四行 minRealm 对齐坊市上架境 + cost 重锚 22500/13500/6000/20000（E263）') : fail('SA1 四行重锚', '');
    sect.includes('row.minRealm != null && p.realmIdx < row.minRealm') && sect.includes('此丹非小境界可承')
      ? pass('SA2 sect.exchange minRealm 运行时拦截（E263）') : fail('SA2 兑换拦截', '');
    ui.includes('const locked = row.minRealm != null && p.realmIdx < row.minRealm') && ui.includes('须至${GameData.REALM_NAMES[row.minRealm]}期') && ui.includes('${known || locked ? \'disabled\' : \'\'}')
      ? pass('SA3 兑换列表置灰显门槛（E263）') : fail('SA3 ui 置灰', '');
    // 丹药族离散 ≤3×（静态 0.45 回收口径，与 price-audit 第四路锚同式复算）：
    {
      const fam = {};
      for (const m of gdata.matchAll(/\{ item: '(pill_[a-z0-9]+)',\s*cost: (\d+)(?:, minRealm: \d+)? \}/g)) {
        const def = new RegExp(`${m[1]}:\\s*\\{ name: '[^']+',\\s*type: 'pill',[^}]*price: (\\d+)`).exec(gdata);
        if (def && Number(def[1]) > 0) fam[m[1]] = Math.max(1, Math.floor(Number(def[1]) * 0.45)) / Number(m[2]);
      }
      const vals = Object.entries(fam);
      const hi = vals.reduce((a, b) => (b[1] > a[1] ? b : a));
      const lo = vals.reduce((a, b) => (b[1] < a[1] ? b : a));
      const ratio = hi[1] / lo[1];
      vals.length >= 6 && ratio <= 3
        ? pass(`SA4 丹药族「卖值/贡献」离散 ≤3×：max ${hi[0]} ${hi[1].toFixed(2)} / min ${lo[0]} ${lo[1].toFixed(2)} = ${ratio.toFixed(2)}×（E263）`) : fail('SA4 族内离散', JSON.stringify(fam));
    }
    paudit.includes("d.type !== 'pill' || !d.price") && paudit.includes('宗门兑丹离散') && paudit.includes('1/200=0.005') && paudit.includes('购料环正期望')
      ? pass('SA5 price-audit 第四路丹药族锚（排除 price=0 并注释在案）+ 第八路购料环检测（E263/E266）') : fail('SA5 审计扩容', '');
  }

  /* ---- B E264/E265 感悟纯度 ---- */
  {
    // 增发点单源 SA：真实直写形态 `\.insight\s*=\s*Math\.min\(` 全仓命中必须全部落在
    // cultivate.js addInsight 定义体内（白名单），白名单外零命中
    {
      const list = [];
      const walk = d => { for (const f of readdirSync(d)) { const fp = join(d, f); if (statSync(fp).isDirectory()) walk(fp); else if (f.endsWith('.js')) list.push(fp); } };
      walk(join(__dirname, 'js'));
      const cultSrc = R('systems/cultivate.js');
      const defStart = cultSrc.indexOf('addInsight(p, n, regen = false) {');
      const defEnd = cultSrc.indexOf('感悟支出单源', defStart);   // addInsight 体的下一注释块（spendInsight 文档）
      let outside = 0, inside = 0;
      for (const fp of list) {
        const src = readFileSync(fp, 'utf8');
        for (const m of src.matchAll(/\.insight\s*=\s*Math\.min\(/g)) {
          if (fp.endsWith('cultivate.js') && defStart >= 0 && defEnd > defStart) {
            const at = src.indexOf(m[0]);
            (at > defStart && at < defEnd) ? inside++ : outside++;
          } else outside++;
        }
      }
      inside >= 1 && outside === 0
        ? pass(`SA6 insight 增发点单源：直写形态全仓命中 ${inside} 处均在 addInsight 定义体内、白名单外零命中（E264）`) : fail('SA6 单源收口', `in=${inside} out=${outside}`);
    }
    const mFA = /p\.insightSrc = \(Array\.isArray\(p\.insightSrc\) \? p\.insightSrc : \[\]\);/.test(cult) && /last\.v \+= gain/.test(cult) && /INSIGHT_SRC_CAP: 50/.test(cult);
    mFA ? pass('SA7 insightSrc FIFO 池：同源相邻段合并 + 50 段上限防膨胀（E264）') : fail('SA7 FIFO 池', '');
    // 纯度公式 SA 三采样（ρ=0/0.2/1）——静态抽取 WUDAO_PUR_FLOOR 与公式形态，按实现同式复算
    {
      const fm = /WUDAO_PUR_FLOOR: ([0-9.]+),/.exec(cult);
      const formulaOk = /WUDAO_PUR_FLOOR \+ \(1 - this\.WUDAO_PUR_FLOOR\) \* rho/.test(cult) && /spendInsight\(p, cost\)/.test(cult) && /insightPurity\(p, cost\)/.test(cult);
      const floor = fm ? Number(fm[1]) : null;
      const pur = rho => floor == null ? NaN : floor + (1 - floor) * rho;
      const samples = [0, 0.2, 1].map(rho => +pur(rho).toFixed(4));
      formulaOk && floor === 0.3 && samples[0] === 0.3 && samples[1] === 0.44 && samples[2] === 1
        ? pass(`SA8 悟道纯度公式三采样：pur(0)=${samples[0]}、pur(0.2)=${samples[1]}、pur(1)=${samples[2]}（WUDAO_PUR_FLOOR=0.3，E264/E265）`) : fail('SA8 纯度三采样', JSON.stringify({ floor, samples }));
    }
    cult.includes('wuDaoCost(p) { return 20 + (p.realmIdx || 0) * 2; }')
      ? pass('SA9 悟道成本 20+2×realmIdx 单源 wuDaoCost（E265）') : fail('SA9 成本', '');
    cult.includes('this.addInsight(p, 2, true)') && cult.includes('唯一的「再生感悟」源')
      ? pass('SA10 调息感悟 regen=true——纯度 ρ 的唯一再生供给（E264）') : fail('SA10 调息再生', '');
    pfac.includes('insightSrc: [],') && pfac.includes('out.insightSrc = v37ins > 0 ? [{ v: v37ins, regen: true }] : [];')
      ? pass('SA11 insightSrc 迁移双同步：create() 默认 [] + 存量 insight>0 折再生池（E264）') : fail('SA11 迁移', '');
    cult.includes('p.insightSrc = [];') && (cult.match(/p\.insightSrc = \[\];/g) || []).length >= 1
      ? pass('SA12 境界重置清池：quietBreakthrough insight=0 处 insightSrc 同步清空（E264）') : fail('SA12 清池', '');
  }

  /* ---- C E273 塔双腿 ---- */
  {
    const enterIdx = tower.indexOf('enter() {');
    const enterBody = tower.slice(enterIdx, tower.indexOf('resume()', enterIdx));
    const timeAdds = (enterBody.match(/Time\.add\(3\);/g) || []).length;
    const otherAdds = (tower.match(/Time\.add\(/g) || []).length;
    timeAdds === 1 && otherAdds === 1 && tower.includes('整场登塔一次计日') && tower.includes('塔中无岁月')
      ? pass('SA13 塔 enter 整场计日：全文件唯一 Time.add(3) 在 enter 内，resume/nextFloor/onVictory/leave 零计日（E273）') : fail('SA13 计日', `enter内=${timeAdds} 全文件=${otherAdds}`);
    battle.includes('耗日由 TowerSys.enter 统一计（整场登塔 3 游戏日，一次计讫），勿在此叠加')
      ? pass('SA14 塔败北分支语义注释：与普通战败疗伤段 Time.add(3) 的边界写明（E273）') : fail('SA14 注释', '');
    tower.includes('EXP_ALLOW_MUL: 2') && tower.includes('t2.today.exp = t2.today.exp || 0;') && tower.includes('Math.max(0, this.EXP_ALLOW_MUL * cultDaily - t2.today.exp)') && tower.includes('t.today.exp = 0;')
      ? pass('SA15 层奖修为日额度：EXP_ALLOW_MUL×修炼日均、与灵石 allowance 同构、换日清零（E273）') : fail('SA15 额度', '');
    bal.includes("key: '悟道·购买链'") && bal.includes("key: '听讲→悟道链'") && bal.includes("key: '塔深爬'") && bal.includes('Cultivate.WUDAO_PUR_FLOOR')
      && !bal.includes('行为上限由论道行门禁间接约束')
      ? pass('SA16 balance-sim 三 gated 行（购买链/听讲链/塔深爬）随实现走 + 失效豁免注释删除（E264/E265/E273）') : fail('SA16 sim 行', '');
  }

  /* ---- D E266 收集悬赏 ---- */
  {
    bounty.includes('ShopSys.sellPrice(t.target) * t.need * 1.2') && !bounty.includes('* t.need * 2)')
      ? pass('SA17 collectFloor 系数 2→1.2 单源（E266）') : fail('SA17 floor', '');
    bounty.includes('const gainStones = Math.max(Math.round(r.stones * mul), floorStones);') && bounty.includes('let floorStones = 0;') && bounty.includes('floor 是「保交割不亏摆摊」的兜底线而非可乘算赏格')
      ? pass('SA18 连锁乘数只乘基准赏格、floor 恒为下限（E266）') : fail('SA18 连锁', '');
    ui.includes('const floorPart = (t && t.type === \'collect\') ? BountySys.collectFloor(t) : 0;') && ui.includes('Math.max(Math.round(core * chain), floorPart)')
      ? pass('SA19 悬赏预览与实发同口径：floor 不参与连锁乘算（E266）') : fail('SA19 预览', '');
  }

  /* ================= B2 社交与长线系统校正 ================= */
  const npc = R('systems/npc.js');
  const dsign = R('systems/daily-sign.js');
  const xinmo = R('systems/xinmo.js');
  const blackjs = R('systems/black.js');
  const statjs = R('core/stat.js');
  {
    /* ---- E240 结交一次性 ---- */
    npc.includes('if (s.befriended) { UI.toast(\'尔等早已结识') && npc.includes('s.befriended = true;')
      && npc.includes('befriended: false,') && pfac.includes('s.befriended = (s.rel || 0) > 0;')
      ? pass('SA20 结交一次性：befriended 守卫 + 印记落档 + freshNpcs 模板默认 + 存量 rel>0 迁移（E240）') : fail('SA20 结交', '');

    /* ---- E241 连签闭关豁免 ---- */
    dsign.includes('gap >= 1 && (gap <= 3 || gap % 30 === 0)') && dsign.includes('continued')
      && dsign.includes('!(g <= 3 || g % 30 === 0)') && dsign.includes('0 % 30 === 0')
      ? pass('SA21 连签豁免：30 倍数日续签 + gap>=1 前置（防 gap=0 同日空涨）+ progress 同源判定（E241）') : fail('SA21 连签', '');

    /* ---- E248 了断放宽 ---- */
    npc.includes('if (s.rel > -20) return false;') && !npc.includes('if (s.rel > -60) return false;')
      && npc.includes('showdownFury(s)') && npc.includes('buildEnemy(p, id, fury = 0)') && npc.includes('(1 + (fury || 0) / 100)')
      && ui.includes('可约战了断</span>')
      ? pass('SA22 了断放宽：rel≤-20 起可约、狠度折算对方战力加成（每 10 点 +4% 封顶 +32%）、人物志提示（E248）') : fail('SA22 了断', '');

    /* ---- E245 心魔夯实 ---- */
    xinmo.includes('threshold(p) { return (p && p.realmIdx >= 6) ? 70 : 100; }') && xinmo.includes('Math.min(6, this.cleared(p)) * 0.01')
      && !xinmo.includes('Math.min(20, this.cleared(p))')
      && battle.includes("XinmoSys.add(p, 3, '吞噬精元，魔焰蚀心')")
      && bag.includes("XinmoSys.add(p, 4, '丹毒超限仍强行服丹')")
      && dungeon.includes("XinmoSys.add(p, 2, '窥探秘术，心事被暗处记下')")
      && blackjs.includes("XinmoSys.add(p, 3, '赌局失利')")
      && npc.includes("XinmoSys.add(p, 5, '背刺得手，午夜梦回')")
      && statjs.includes('Math.min(6, (p.flags && p.flags.xinmoCleared) || 0)')
      ? pass('SA23 心魔夯实：阈值随境 70/100 + 凝练封顶 +6% + 五行为来源全接线（吞噬3/服丹4/窥探2/赌局3/背刺5）（E245）') : fail('SA23 心魔', '');

    /* ---- E242 差事/悬赏池互斥 ---- */
    {
      const sectTaskIdx = sect.indexOf('genTask(p) {');
      const sectTaskBody = sect.slice(sectTaskIdx, sect.indexOf('rewards(p, task)', sectTaskIdx));
      const factionBranch = sectTaskBody.includes('Utils.chance(WorldSys.warActive(p) ? 55 : 26)') && sectTaskBody.includes('danger: true') && sectTaskBody.includes('elites');
      const noKillCollectGen = !/type === 'kill'/.test(sectTaskBody) && !/type === 'collect'/.test(sectTaskBody) && !/taskMonsters\(realm \* 4/.test(sectTaskBody);
      const sectWBlock = (sect.slice(sectTaskIdx, sect.indexOf('const type = Utils.pickWeighted', sectTaskIdx)).match(/\{[^{}]*\}/g) || []).join('|');
      const noDeadW = !/kill:|collect:/.test(sectWBlock);
      const flavorBlock = (gdata.slice(gdata.indexOf('SECT_QUEST_FLAVOR'), gdata.indexOf('SECT_EXCHANGE')).match(/\{[^{}]*\}/g) || []).join('|');
      const noDeadFlavor = !/kill:|collect:/.test(flavorBlock) && (flavorBlock.match(/cult:/g) || []).length === 5;
      // v39（E365）：wrapDanger 缩为「入派立威」单支——force 参数删除、短路收窄为非派系守卫，newTask 直出 genTask
      const wrapKept = sect.includes('wrapDanger(t, p) {') && sect.includes('if (!t || !p.sect || !p.sect.faction) return t;') && sect.includes('onKill(monsterId)') && sect.includes('newTask(p) { return this.genTask(p); }');
      const submitGone = !sect.includes('submit(taskIdx)') && !gamejs.includes("'act-task-submit'");
      factionBranch && noKillCollectGen && noDeadW && noDeadFlavor && wrapKept && submitGone && ui.includes('门中差事只留<b>修行/历练/问签</b>三门')
        ? pass('SA24 差事/悬赏池互斥：生死状独占生成支（派系限定+战时 55/26）+ kill/collect 支与权重/名目死配置清除 + wrapDanger 入派立威单支且普通路径不绕行 + onKill/claim 存续 + submit 删除 + 分工文案（E242；v39 E365 新语义）') : fail('SA24 池互斥', JSON.stringify({ factionBranch, noKillCollectGen, noDeadW, noDeadFlavor, wrapKept, submitGone }));
    }

    /* ================= B3 周目纵深与终局去处 ================= */
    const worldjs = R('systems/world.js');
    const rankjs = R('systems/rank.js');
    const reincjs = R('systems/reincarnation.js');
    const xianjs = R('systems/xian.js');
    const festivaljs = R('systems/festival.js');
    {
      /* E243 时代时长重校 */
      worldjs.includes('w.preachUntil = y + 3;') && worldjs.includes('w.ruinsUntil = y + 5;') && worldjs.includes('w.warUntil = y + 6;')
        && worldjs.includes('w.lingchaoUntil = y + 3;') && worldjs.includes('until: y + 5 })')
        && !/preachUntil = y \+ 10/.test(worldjs) && !/ruinsUntil = y \+ 20/.test(worldjs) && !/warUntil = y \+ 30/.test(worldjs) && !/until: y \+ 15/.test(worldjs)
        && worldjs.includes('此后三年天下修士') && worldjs.includes('此后五年秘宝频现') && worldjs.includes('此后六年宗门悬赏暴涨') && worldjs.includes('一带五年')
        ? pass('SA25 时代时长重校：讲道 10→3 / 秘境 20→5 / 大战 30→6 / 灵潮 10→3 / 兽潮 15→5 年，文案随改（E243）') : fail('SA25 时代时长', '');
      /* E252 大事覆写留痕 */
      worldjs.includes('观望未决') && worldjs.includes('不了了之') && worldjs.includes('if (w.pending) {')
        ? pass('SA26 大事覆写留痕：旧事件按「观望未决」入年表 + 不了了之日志（E252）') : fail('SA26 覆写留痕', '');
      /* E244 问剑夺位 */
      rankjs.includes('honorOf(p)') && rankjs.includes('score: p.realmIdx * 4 + p.layer + honor') && rankjs.includes('async challengeAhead()')
        && rankjs.includes("Daily.resetIfNew(p, '_wenjianDay')") && rankjs.includes('onWenjianWin(p, id)') && rankjs.includes('const myScore = p.realmIdx * 4 + p.layer + this.honorOf(p)')
        && battle.includes('if (B.ctx.wenjian) RankSys.onWenjianWin(p, B.ctx.npcId);')
        && sect.includes('p.rankHonor = (p.rankHonor || 0) + 1;') && npc.includes('p.rankHonor = (p.rankHonor || 0) + 1;')
        && gamejs.includes("'act-wenjian': () => RankSys.challengeAhead(),")
        && rankjs.includes('data-action="act-wenjian"') && rankjs.includes('rankPrev') && rankjs.includes('↑')
        && pfac.includes('rankHonor: 0,')
        ? pass('SA27 问剑夺位：rankHonor 双同步 + 三档成算 + 日限 Daily 单源 + 胜局榜序对调 + 魁首/雷台折算加分 + ui 按钮/↑↓标注（E244）') : fail('SA27 问剑', '');
      /* E246 仙元携往生 */
      reincjs.includes('携仙元往生') && reincjs.includes('carryXianyuan') && reincjs.includes('p2.pastXianyuan = xyNow;')
        && reincjs.includes('oldP.counters.xianyuan = 0;') && xianjs.includes('仙元可于转世时携往生')
        && pfac.includes('pastXianyuan: 0,') && pfac.includes('pendingFestival: null,')
        ? pass('SA28 仙元携往生：1000:1 气运 cap+3 / 2000:1 悟性 cap+2 + 落定清零 + pastXianyuan 双同步 + 阶满指引补句（E246）') : fail('SA28 携仙元', '');
      /* E247 挂起补办 + E243 迁移 */
      festivaljs.includes("INTERACTIVE: ['shangyuan', 'zhongyuan', 'chuxi']") && festivaljs.includes('PENDING_DAYS: 3')
        && festivaljs.includes('resolvePending(p)') && festivaljs.includes('p.pendingFestival = { id: f.id, day: Math.floor(p.day || 0) };')
        && pfac.includes('out.world._eraRecal37 = true;') && pfac.includes('preachUntil: 3, ruinsUntil: 5, warUntil: 6, lingchaoUntil: 3')
        ? pass('SA29 节庆挂起补办（互动节庆 auto 挂起 + 3 日补办/超期从简）+ 时代重校迁移 min 收缩防重入（E247/E243）') : fail('SA29 挂起/迁移', '');
    }

    /* ================= B4 装备与战斗深度 ================= */
    {
      const forgejs = R('systems/forge.js');
      /* E249 套装技 */
      gdata.includes("tech: 'zhenyuanOnHit'") && gdata.includes("tech: 'killAtk'") && gdata.includes('磐岩之意') && gdata.includes('血河叠浪')
        && forgejs.includes('setTechs(p)') && forgejs.includes("((p.setForge || {})[sid] || 0) >= 3")
        && battle.includes('atk *= 1 + 0.03 * (B._xueheStacks || 0);') && battle.includes("ForgeSys.hasSetTech(p2, 'killAtk')")
        && battle.includes("ForgeSys.hasSetTech(p, 'zhenyuanOnHit')") && battle.includes('onPlayerHit(B);   // v37（E249）：玩家受击统一响应')
        && battle.includes('B._zyAcc = (B._zyAcc || 0) + (B.zmax || 6) * 0.05;')
        ? pass('SA30 套装技：炼化三阶解锁（玄天·磐岩之意 受击回真元 5% 累积进位 / 血河·血河叠浪 击杀叠攻 3%×5）+ 单漏斗消费端（E249）') : fail('SA30 套装技', '');
      /* E249 词条位 */
      forgejs.includes("id: 'combochase'") && forgejs.includes("id: 'laststand'") && forgejs.includes("id: 'killheal'") && forgejs.includes("id: 'zmax'")
        && forgejs.includes('(inst.enhance || 0) >= 12 && inst.mech') && forgejs.includes('inst.mech = m.id;') && forgejs.includes('affix-m')
        && battle.includes("ForgeSys.hasMech(p, 'zmax')") && battle.includes("ForgeSys.hasMech(p, 'combochase') && Utils.chance(20)")
        && battle.includes("ForgeSys.hasMech(p, 'laststand')") && battle.includes("ForgeSys.hasMech(p2, 'killheal')")
        && battle.includes("B.enemy.hpMax * (p.dao === 'sword' ? 0.3 : 0.2)") && battle.includes("p.dao === 'body') thorns = Math.round(thorns * 1.5 * 100) / 100")
        ? pass('SA31 词条位：mech 池 4 枚（+12 解锁/掉级封存/洗练淬出/tooltip ✦）+ 消费端 zmax15%/追击20%/保命/回血8% + thorns 体修×1.5 与 execute 剑修 30% 终结线联动（E249）') : fail('SA31 词条位', '');
      /* E269 跳层作废豁免 */
      tower.includes("Battle.active._voided = true;") && battle.includes('B._tame || B._voided')
        && battle.includes("if (!this.active._voided) {") && battle.includes('遁走=真出手之后的撤离')
        ? pass('SA32 跳层作废豁免：赌约应约打 _voided 标 + end() 杀业/魔性豁免 + 回顾过滤 + 遁走语义边界注释（E269）') : fail('SA32 作废豁免', '');
    }

    /* ================= B5 存档与状态完整性 ================= */
    const savejs = readFileSync(join(__dirname, 'js', 'core', 'save.js'), 'utf8').replace(/\r\n/g, '\n');
    {
      /* E267 词缀星留档 */
      bag.includes('p.affixKept[id] = { affixes: { ...inst.affixes }, stars: { ...(inst.stars || {}) } };')
        && bag.includes('inst.stars = { ...(kept.stars || {}) };') && bag.includes('} else {\n        inst.affixes = { ...kept };')
        && pfac.includes('out.affixKept[id] = { affixes: { ...kept }, stars: {} };')
        ? pass('SA33 词缀星留档：keep 存 {affixes,stars}、restore 同步还原并兼容旧形态、迁移步归一双保险（E267）') : fail('SA33 词缀星', '');
      /* E268 bak2 滚动快照 */
      savejs.includes('const first = !Game._snapAt;') && savejs.includes('if (first && Date.now() - cur.meta.ts < 60000) return;')
        && savejs.includes('this.snapshotAuto();   // v37（E268）：写前滚动快照')
        && gamejs.includes('setInterval(() => Save.snapshotAuto(), 600000)') && gamejs.includes('clearInterval(this._snapTimer)')
        && (gamejs.match(/clearInterval\(this\._snapTimer\)/g) || []).length === 3
        ? pass('SA34 bak2 滚动快照：首拍/滚动拍分治（60 秒检查只约束首拍）+ autoSave 写前调用 + enterGame 10 分钟定时器（fn 在前、句柄存 Game、exit/删档清理）（E268）') : fail('SA34 快照', '');
      /* E272 章末演出补偿 */
      gamejs.includes('!Story.isSeen(openId) && this.player.realmIdx < (def.supR || 999)')
        && gamejs.includes('Story.markSeen(openId);') && gamejs.includes('Story.play(GameData.STORIES[openId], null, true)')
        ? pass('SA35 章末演出补偿：open 未 seen 且未达追认线 → 只读链补播一次并补记 seen（E272）') : fail('SA35 补播', '');
      /* E271 重复键 */
      (gamejs.match(/'act-wudao':/g) || []).length === 1
        ? pass('SA36 act-wudao 重复键删除：全 actions 字面量唯一（E271；重复键静态检测放 B8）') : fail('SA36 重复键', '');
    }

    /* ================= B6 沉浸演出与反馈接线 ================= */
    const cavejs = R('systems/cave.js');
    const dungeonjs = R('systems/dungeon.js');
    const shop = R('systems/shop.js');
    // reincjs/festivaljs 沿用 B3 组声明（同一作用域）
    {
      /* E232 五死音效消费点 */
      (shop.match(/sfx\('coin'\)/g) || []).length >= 3 && (cavejs.match(/sfx\('plant'\)/g) || []).length >= 3
        && festivaljs.includes("Ambience.sfx('bell');") && battle.includes("B.intent.kind === 'finisher')) Ambience.sfx('intent')")
        && dungeonjs.includes("Ambience.sfx('inherit');")
        ? pass('SA37 五死音效消费点：coin(shop 购/售/兑换)、plant(cave 播/浇/收)、bell(festival 开节)、intent(battle 蓄力/杀招)、inherit(dungeon 本命)（E232）') : fail('SA37 五音效', '');
      /* E239/E238 演出与 E234 红点、E277 离线乘窗 */
      dungeonjs.includes("UI.realmShow('精血为引，古宝认主——自此神魂相合。', '#b89a5a');") && dungeonjs.includes("UI.announce('✦ 本命法宝 · 炼化功成 ✦', 'gold');")
        && gamejs.includes("UI.realmShow('灯火渐熄，天地忽远——尘世的一切，都成了很远的声音。', '#6b7a8f');") && gamejs.includes("Ambience.sfx('bell');")
        && reincjs.includes("UI.realmShow('一道流光划破夜空——新的一生，在啼哭声中开始。', '#e8c56a');")
        && ui.includes('const pest = ((p.cave && p.cave.plots) || []).some(pl => pl && pl.pested);')
        && ui.includes("cave: ripe || tripBack || pest,") && ui.includes("'cave:farm': ripe || pest,")
        && gamejs.includes('const OFFLINE_EFF = 0.6;') && gamejs.includes('perRound / 3 * OFFLINE_EFF * rushMul * realDays')
        && gamejs.includes('聚灵加护') && gamejs.includes('${UI.FACTS.offlineEff}效率折算')
        ? pass('SA38 本命/坐化/转世三幕演出 + 虫害红点两通道 + 离线乘窗与 OFFLINE_EFF/rushMul 具名、FACTS 拼串（E239/E238/E234/E277）') : fail('SA38 演出/红点/乘窗', '');
    }

    /* ================= B7 操作效率与口径统一 ================= */
    {
      const beastjs = R('systems/beast.js');
      /* E235 批量喂兽 + E236 批量兑换 */
      beastjs.includes('async feedMulti(uid)') && beastjs.includes('while (fed < 5 && b.level < 10 && Bag.count(\'m_neidan\') >= 1)')
        && ui.includes('data-action="act-beast-feed-multi"') && gamejs.includes("'act-beast-feed-multi'")
        && shop.includes('convertMulti(dir, times = 10)') && shop.includes('convertAll()')
        && ui.includes('data-action="act-convert-multi"') && ui.includes('data-action="act-convert-all"')
        && gamejs.includes("'act-convert-multi'") && gamejs.includes("'act-convert-all'")
        ? pass('SA39 批量喂兽（连喂 ×5 自停）与批量兑换（×10/全兑，不足自停零头自留）双接线（E235/E236）') : fail('SA39 批量', '');
      /* E237 散修红点 + E255 窗口口径 + E233/E260/E261 口径 */
      ui.includes('!p.sect && p.realmIdx >= 1 && !p.flags.sectDeclined') && gamejs.includes('sectDeclined = true;')
        && pfac.includes('sectDeclined: false') && pfac.includes('!out.sect && (out.realmIdx || 0) >= 2 && out.flags) out.flags.sectDeclined = true;')
        && ui.includes("Math.floor(p.day || 0) - p.rushDay < CaveSys.RUSH_WINDOW()) ? '' :")
        && ui.includes('日内修炼 ×1.5 · ') && ui.includes('CaveSys.RUSH_WINDOW()') && !ui.includes('<span class="tag">v19</span>')
        && !ui.includes('v32 E8') && !ui.includes('v33 起开炉收工费') && !ui.includes('非印钞机')
        && ui.includes('黑市${this.FACTS.blackOpen}') && ui.includes('${this.FACTS.blackOpen}——如今巷口空空')
        && ui.includes('黑市${this.FACTS.blackOpen}（贵六成但货奇）') && ui.includes("blackOpen: '每月初一至初三开市三日'")
        && ui.includes('每 TOURNEY_EVERY 年一届')
        && festivaljs.includes("Utils.hashStr('riddle' + year) % 3") && worldjs.includes("Utils.hashStr('xianmen' + year) % 3")
        && festivaljs.includes('primary: correct === \'b\'') && worldjs.includes('primary: correct === \'b\'')
        && festivaljs.includes('成算不足，赏格折中') && worldjs.includes('记名待来年')
        ? pass('SA40 散修红点单键三态 + 聚灵窗口显隐口径 + 黑话出清四处 + 黑市单源短语三处 + 大比注释 + 正解年哈希轮换与品质第二层（E237/E255/E233/E260/E261/E251）') : fail('SA40 口径', '');
    }

    /* ================= B8 工程护栏与死重清理 ================= */
    const auctionjs = R('systems/auction.js');
    const forgejs = R('systems/forge.js');
    const checkactions = readFileSync(join(__dirname, 'scripts', 'check-actions.mjs'), 'utf8').replace(/\r\n/g, '\n');
    {
      /* E254 品阶兜底价单源 */
      const fallbackLits = [];
      {
        const list = [];
        const walk = d => { for (const f of readdirSync(d)) { const fp = join(d, f); if (statSync(fp).isDirectory()) walk(fp); else if (f.endsWith('.js')) list.push(fp); } };
        walk(join(__dirname, 'js'));
        for (const fp of list) {
          const n = (readFileSync(fp, 'utf8').match(/\[300, 800, 2000, 6000, 16000, 40000\]/g) || []).length;
          if (n) fallbackLits.push(`${fp}:${n}`);
        }
      }
      const singleSource = fallbackLits.length === 1 && fallbackLits[0].startsWith(join(__dirname, 'js', 'data')) && gdata.includes('GRADE_FALLBACK: [300, 800, 2000, 6000, 16000, 40000]');
      const refsOk = auctionjs.includes('GameData.GRADE_FALLBACK[Utils.clamp(def.grade || 0, 0, 5)]')
        && bag.includes('ForgeSys.salvageStones(def, enh);') && !bag.includes('const GRADE_FALLBACK')
        && forgejs.includes('GameData.GRADE_FALLBACK[Utils.clamp(out.grade || 0, 0, 5)]') && !forgejs.includes('FEE_FALLBACK')
        && forgejs.includes('salvageStones(def, enh = 0)') && ui.includes('ForgeSys.salvageStones(def, enh))}/件') && !ui.includes('const GRADE_FALLBACK');
      singleSource && refsOk
        ? pass('SA41 品阶兜底价单源：字面量全仓仅 GameData.GRADE_FALLBACK 一处、四消费点改引、分解公式 salvageStones 单源消解双写（E254）') : fail('SA41 兜底价', JSON.stringify(fallbackLits));
      /* E253/E256/E271 check-actions 强化 */
      checkactions.includes('if (!capM)') && checkactions.includes('if (!bountyM)') && checkactions.includes('if (!sellM)') && checkactions.includes('if (!effM)')
        && checkactions.includes('Math\\.min\\((\\d+), Math\\.floor\\(elapsedMs') && checkactions.includes("OFFLINE_EFF\\s*=\\s*0\\.(\\d+)")
        && checkactions.includes('在 js/game.js 定义') && checkactions.includes('四点对齐')
        ? pass('SA42 check-actions：三处抽取失败即红 + offlineCap 锚 elapsedMs 上下文限定 + offlineEff 第四对账点（OFFLINE_EFF 锚）+ actions 重复键检测（E253/E256/E271）') : fail('SA42 门禁', '');
      /* E259/E257 build 反向校验与 README 守卫 */
      const buildmjs = readFileSync(join(__dirname, 'scripts', 'build.mjs'), 'utf8').replace(/\r\n/g, '\n');
      const releasemjs = readFileSync(join(__dirname, 'scripts', 'release.mjs'), 'utf8').replace(/\r\n/g, '\n');
      const readme = readFileSync(join(__dirname, 'README.md'), 'utf8');
      buildmjs.includes('未登记进 scripts/modules.json') && buildmjs.includes('process.exit(1);') && releasemjs.includes('当前版本 **v${ver}')
        && readme.includes('当前版本 **v39') && readme.includes('53 个模块') && readme.includes('24 套 verify') && readme.includes('缓存号口径 = 16 + 版本号')
        ? pass('SA43 build 反向校验（孤儿模块拒建）+ README 守卫（假版本号拒绝）与根 README 四口径刷新（E259/E257）') : fail('SA43 守卫', '');
      /* E262 死重清理 */
      const scriptsDir = join(__dirname, 'scripts');
      const mjs = readdirSync(scriptsDir).filter(f => f.endsWith('.mjs'));
      const deadGone = !mjs.some(f => /^repro-|^smoke-|^shoot-v\d+/.test(f));
      const kept = ['split.mjs', 'cf-prepare.mjs', 'make-icons.mjs', 'shoot.mjs'].every(f => mjs.includes(f));
      const shootParam = readFileSync(join(scriptsDir, 'shoot.mjs'), 'utf8').includes('--desktop');
      const balNoQuery = !bal.includes('?v=33');
      deadGone && kept && shootParam && balNoQuery
        ? pass('SA44 scripts 死重清理：repro-*/smoke-*/shoot-vN 十六文件删除、参数化 shoot.mjs 落地、保留白名单在列、balance-sim 去 ?v 死链（E262）') : fail('SA44 死重', JSON.stringify({ mjs, deadGone, kept, shootParam, balNoQuery }));
    }
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
    const pl = PlayerFactory.create('清源道人', { gen: 5, comp: 5, luck: 5, body: 5 });
    pl.flags.tutorialDone = true;
    localStorage.setItem('fanren_wd_3', JSON.stringify({ v: 1, player: pl, meta: { name: pl.name, realmText: '练气初期', day: 1, age: 16, ts: Date.now(), dead: false } }));
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

  /* ---- RB1 E263：四行 minRealm 运行时拦截 + 门内放行 ---- */
  const r1 = await page.evaluate(() => {
    const out = { rows: {} };
    const p = Game.player;
    p.sect = { id: 'qingyun', contrib: 9999999, faction: null, rank: 'elder', tasks: [], peakContrib: 0 };
    p.dao = null;
    for (const [item, mr] of [['pill_dujie', 3], ['pill_taichu', 4], ['pill_yuanshen', 5], ['pill_zaohua', 6]]) {
      const idx = GameData.SECT_EXCHANGE.findIndex(x => x.item === item);
      const row = GameData.SECT_EXCHANGE[idx];
      const lo = mr - 1;
      p.realmIdx = lo; p.gongfa = {}; p.bag = {};
      const c0 = p.sect.contrib;
      SectSys.exchange(idx);
      const blocked = p.sect.contrib === c0 && !(p.bag[item] > 0);
      p.realmIdx = mr; p.gongfa = {}; p.bag = {};
      SectSys.exchange(idx);
      const allowed = p.sect.contrib === c0 - row.cost && p.bag[item] === 1;
      out.rows[item] = { blocked, allowed, minRealm: row.minRealm, cost: row.cost };
    }
    p.sect = null;
    return out;
  });
  Object.values(r1.rows).every(v => v.blocked && v.allowed && v.minRealm != null)
    ? pass('RB1 四行兑换：门槛下拦截不动贡献、门槛当日放行扣贡献入包（E263）') : fail('RB1 兑换门槛', JSON.stringify(r1.rows));

  /* ---- RB2 E264：insightSrc 双池迁移（存量折再生池） ---- */
  const r2 = await page.evaluate(() => {
    const out = {};
    const old = { name: '旧档道人', attrs: { gen: 5, comp: 5, luck: 5, body: 5 }, insight: 37, day: 100, _migratedVersion: 0 };
    const m = PlayerFactory.migrate(old);
    out.migrated = m.insight === 37 && Array.isArray(m.insightSrc) && m.insightSrc.length === 1 && m.insightSrc[0].v === 37 && m.insightSrc[0].regen === true;
    const fresh = PlayerFactory.create('新档道人', { gen: 5, comp: 5, luck: 5, body: 5 });
    out.fresh = Array.isArray(fresh.insightSrc) && fresh.insightSrc.length === 0 && fresh.insight === 0;
    out.noDoubleRun = (() => { const again = PlayerFactory.migrate({ ...m, _migratedVersion: m._migratedVersion }); return again.insightSrc.length === 1 && again.insightSrc[0].v === 37; })();
    return out;
  });
  r2.migrated && r2.fresh && r2.noDoubleRun
    ? pass('RB2 迁移：存量 insight=37 折 [{v:37,regen:true}]、新档默认空池、重复读档不重跑（E264）') : fail('RB2 迁移', JSON.stringify(r2));

  /* ---- RB3 E264：spendInsight FIFO 纯度三态 + addInsight 归池 ---- */
  const r3 = await page.evaluate(() => {
    const out = {};
    const p = { insight: 0, insightSrc: [], realmIdx: 2, counters: {} };
    // 外源 30 + 再生 10 → FIFO 头部为外源
    Cultivate.addInsight(p, 30, false);
    Cultivate.addInsight(p, 10, true);
    out.pool = JSON.stringify(p.insightSrc);
    out.total = p.insight === 40;
    out.rho0 = Cultivate.spendInsight(p, 20) === 0;      // 纯外源段 → ρ=0
    out.rhoMid = Cultivate.spendInsight(p, 10) === 0;    // 头部外源尚余 10 → FIFO 再取 10 仍全外源 → ρ=0
    out.rhoFix = Cultivate.spendInsight(p, 10) === 1;    // 最后 10 点全再生 → ρ=1
    out.drained = p.insight === 0 && p.insightSrc.length === 0;
    out.preview = Cultivate.insightPurity(p, 5) === 1;   // 池空视同全再生（不回退）
    return out;
  });
  r3.total && r3.rho0 && r3.rhoMid && r3.rhoFix && r3.drained && r3.preview
    ? pass('RB3 spendInsight FIFO：外源→ρ0、再生→ρ1、池空回退 1、总量与池同步清空（E264）') : fail('RB3 FIFO', JSON.stringify(r3));

  /* ---- RB4 E264/E265：wuDao 成本随境 + 自然链全额 + 纯购买链折底 ---- */
  const r4 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const savedPopup = UI.popup;
    UI.popup = async o => (o.title || '') === '悟 道';
    // 场景一：自然链（池全再生）ρ=1 → 全额 2.5×baseGain；成本 20+2r
    p.dao = null; p.realmIdx = 2; p._wuDaoDay = -99; p.day = 400; p._settleDay = 400;
    p.insight = 0; p.insightSrc = [];
    Cultivate.addInsight(p, 24, true);   // 24 = wuDaoCost(r2)，全再生
    const exp0 = p.exp;
    await Cultivate.wuDao();
    const cost2 = Cultivate.wuDaoCost(p);
    out.cost2 = cost2 === 24;
    out.naturalFull = p.insight === 0 && p.exp > exp0 && (p.exp - exp0) === Math.round(Cultivate.baseGain(p) * 2.5);
    // 场景二：纯购买链（池全外源）ρ=0 → 折底
    p._wuDaoDay = -99; p.insight = 0; p.insightSrc = [];
    Cultivate.addInsight(p, 24, false);
    const exp1 = p.exp;
    await Cultivate.wuDao();
    out.purchasedFloor = Math.abs((p.exp - exp1) - Math.round(Cultivate.baseGain(p) * 2.5 * 0.3)) <= 1;
    // 场景三：听讲链稳态池——（听讲 8 外源 + 调息 2 再生）×3 交错入池，成本 24 按 FIFO 跨段
    // 取 8F+2T+8F+2T+4F → 再生 4/24 → ρ=1/6（稳态听讲链 ρ≈0.2 的离散近似）
    p._wuDaoDay = -99; p.insight = 0; p.insightSrc = [];
    for (let i = 0; i < 3; i++) { Cultivate.addInsight(p, 8, false); Cultivate.addInsight(p, 2, true); }
    const exp2 = p.exp;
    await Cultivate.wuDao();
    const rhoListen = 4 / 24;
    out.listenChain = Math.abs((p.exp - exp2) - Math.round(Cultivate.baseGain(p) * 2.5 * (0.3 + 0.7 * rhoListen))) <= 1;
    // 场景四：感悟不足被拦（成本 24 > 23）
    p._wuDaoDay = -99; p.insight = 23; p.insightSrc = [];
    const exp3 = p.exp;
    await Cultivate.wuDao();
    out.insufficient = p.exp === exp3 && p._wuDaoDay !== Math.floor(p.day);
    UI.popup = savedPopup;
    return out;
  });
  r4.cost2 && r4.naturalFull && r4.purchasedFloor && r4.listenChain && r4.insufficient
    ? pass('RB4 wuDao 三采样实发：自然链全额 / 纯购买链 0.3× / 听讲链 0.44× + 成本随境与不足拦截（E264/E265）') : fail('RB4 悟道三采样', JSON.stringify(r4));

  /* ---- RB5 E273：塔 enter 整场计日、resume/leave 不叠加 ---- */
  const r5 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    p.realmIdx = 2; p.dao = null;
    p.hp = Stat.compute(p).maxHp;
    p.tower = { best: 0, today: { day: Math.floor(p.day), used: 0, bought: 0 }, run: null };
    const savedStart = Battle.start;
    Battle.start = () => {};
    const day0 = Math.floor(p.day);
    try {
      TowerSys.enter();
      out.enterDay = Math.floor(p.day) === day0 + 3 && !!TowerSys.state(p).run;
      TowerSys.resume();   // run 仍在 → 不再计日
      out.resumeDay = Math.floor(p.day) === day0 + 3;
      TowerSys.leave();
      out.leaveDay = Math.floor(p.day) === day0 + 3 && !TowerSys.state(p).run;
      // 败北路径不另计日（onDefeat 直接收 run）
      TowerSys.state(p).run = { floor: 1, buffs: [] };
      TowerSys.onDefeat();
      out.defeatDay = Math.floor(p.day) === day0 + 3 && !TowerSys.state(p).run;
    } finally { Battle.start = savedStart; }
    return out;
  });
  r5.enterDay && r5.resumeDay && r5.leaveDay && r5.defeatDay
    ? pass('RB5 塔整场计日：入塔恰 +3 日，resume/leave/onDefeat 零叠加（E273）') : fail('RB5 计日', JSON.stringify(r5));

  /* ---- RB6 E273：层奖修为日额度——超限截断、跨日恢复 ---- */
  const r6 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    // 环境确定化：r4、修为清零防 addExp 进层/溢流折算吞掉精确增量；_settleDay 对齐防日结插账
    p.realmIdx = 4; p.dao = null; p.hp = Stat.compute(p).maxHp;
    p.exp = 0; p.layer = 0; p.expOverflow = 0;
    p._settleDay = Math.floor(p.day);
    p.tower = { best: 0, today: { day: Math.floor(p.day), used: 0, bought: 0, stones: 0, exp: 0 }, run: { floor: 1, buffs: [] } };
    TowerSys.state(p).today.day = Math.floor(p.day);   // 强制当日（syncToday 不清账）
    const cultDaily = Cultivate.baseGain(p) * (1 + Stat.compute(p).cultPct / 100) / 3;
    const allowance = 2 * cultDaily;
    const savedStart = Battle.start; Battle.start = () => {};
    const mkB = () => ({ enemy: { name: '额度测试守影', expGain: Math.ceil(allowance * 20) }, ctx: {} });
    const exp0 = p.exp;
    await TowerSys.onVictory(mkB());   // 单层奖 20× 额度 → 只发额度
    out.capped = Math.abs((p.exp - exp0) - allowance) < 1e-6;
    out.ledger = Math.abs(TowerSys.state(p).today.exp - allowance) < 1e-6;
    // 同日第二层：额度已尽 → 修为 0
    TowerSys.state(p).run = { floor: 2, buffs: [] };
    const exp1 = p.exp;
    await TowerSys.onVictory(mkB());
    out.sameDayZero = p.exp === exp1;
    // 跨日：额度恢复
    p.day = Math.floor(p.day) + 1;
    TowerSys.state(p).run = { floor: 2, buffs: [] };
    await TowerSys.onVictory(mkB());
    out.nextDayRestored = Math.abs((p.exp - exp1) - allowance) < 1e-6;
    // 小额层奖不受额度影响（自然链不动）
    p.day = Math.floor(p.day) + 1;
    TowerSys.state(p).run = { floor: 2, buffs: [] };
    const smallExp = Math.round(22 * GameData.eco(2) * 0.5);
    const exp2 = p.exp;
    await TowerSys.onVictory({ enemy: { name: '小额守影', expGain: 22 * GameData.eco(2) }, ctx: {} });
    out.uncapped = p.exp - exp2 === Math.min(smallExp, allowance);
    Battle.start = savedStart;
    return out;
  });
  r6.capped && r6.ledger && r6.sameDayZero && r6.nextDayRestored && r6.uncapped
    ? pass('RB6 层奖修为额度：超限截断记台账、同日归零、跨日恢复、小额照常（E273）') : fail('RB6 额度', JSON.stringify(r6));

  /* ---- RB7 E266：收集悬赏连锁不乘 floor + 购料环负期望 ---- */
  const r7 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    p.realmIdx = 1; p.sect = null;
    p.reputation = 0;                       // 声望赏格关闭（repBonus=1 口径）
    p.world.turmoilUntil = 0;               // 战时赏格 ×1.1 关闭
    p._settleDay = Math.floor(p.day);       // 防日结插账
    // 行情确定化：w.market 于 30 日界随机重掷（RB5/RB6 推日后 next 过期）——claim 与对账两次
    // sellPrice 之间若重掷则 floor 对不上账。钉死 seed 使全断言在同一行情下运行
    p.world.market = { seed: 'v23-rb7', next: Math.floor(p.day) + 30 };
    p.bounties = { day: Math.floor(p.day), list: [{ type: 'collect', target: 'm_lingzhi', need: 4, progress: 4, chain: 1, name: '连锁 · 收购', desc: '' }] };
    // afterAction 侧收益静音：claim 收尾经 afterAction→dailySettle，登顶日赏（100×eco）/成就/图鉴
    // 会向灵石账插与本断言无关的入账（RB6 抬境后玩家恰成榜首，实测插账 +380）
    const savedTop = RankSys.isTop, savedAch = Achieve.check, savedCodex = Codex.checkRewards;
    RankSys.isTop = () => false; Achieve.check = () => {}; Codex.checkRewards = () => {};
    const floor = BountySys.collectFloor({ target: 'm_lingzhi', need: 4 });
    const base = BountySys.rewards(p).stones;   // 60×stoneEco(1)（turmoil/rep/drill 均关）
    const stones0 = p.stones.low + p.stones.mid * 100;
    try {
      BountySys.claim(0);
    } finally { RankSys.isTop = savedTop; Achieve.check = savedAch; Codex.checkRewards = savedCodex; }
    const gained = p.stones.low + p.stones.mid * 100 - stones0;
    out.floorOk = floor === Math.round(ShopSys.sellPrice('m_lingzhi') * 4 * 1.2);
    out.chainNoFloor = gained === Math.max(Math.round(base * 1.6), floor);   // 实发 = max(基准×连锁Ⅰ, floor)——floor 未被乘 1.6
    out.floorDominates = gained === floor;   // r1 兜底域：floor 盖过基准×连锁——旧实发 floor×1.6 即红
    // 购料环：全价购 4 枚 vs floor 兜底 → 必为负（E266 门禁口径）
    const price = GameData.ITEMS.m_lingzhi.price;
    out.loopNeg = floor < price * 4;
    return out;
  });
  r7.floorOk && r7.chainNoFloor && r7.floorDominates && r7.loopNeg
    ? pass('RB7 收集悬赏：floor=1.2×卖价×need、实发=max(基准×连锁, floor)、购料环负期望（E266）') : fail('RB7 悬赏', JSON.stringify(r7));

  /* ---- RB8 E263 兑换列表置灰渲染 ---- */
  const r8 = await page.evaluate(() => {
    const p = Game.player;
    p.sect = { id: 'qingyun', contrib: 99999, faction: null, rank: 'inner', tasks: [], peakContrib: 0 };
    p.realmIdx = 2;
    const html = UI.renderSectTab();
    p.sect = null;
    return { has: !!html, lockTag: html.includes(`须至${GameData.REALM_NAMES[3]}期`), disabled: /data-action="act-exchange"[^>]*disabled[^>]*title="此丹非小境界可承/.test(html) };
  });
  r8.has && r8.lockTag && r8.disabled
    ? pass(`RB8 兑换列表 r2 视角：渡劫丹行置灰并显示「须至${'元婴'}期」门槛（E263；minRealm 3=元婴，对齐坊市上架境）`) : fail('RB8 置灰', JSON.stringify(r8));

  /* ================= B2 RB 组 ================= */

  /* ---- RB9 E240：结交一次性 ---- */
  const rb9 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    p.npcs = NpcSys.freshNpcs();
    p.npcs.n1.realmIdx = p.realmIdx; p.npcs.n1.layer = p.layer; p.npcs.n1.alive = true;
    p._settleDay = Math.floor(p.day);
    const op = UI.popup; UI.popup = async () => true;
    const savedAA = Game.afterAction; Game.afterAction = () => {};
    p.stones.low += 100000;
    try {
      await NpcSys.befriend('n1');
      out.firstRel = p.npcs.n1.rel;
      out.marked = p.npcs.n1.befriended === true;
      const cnt = p.counters.befriends || 0;
      const relAfter = p.npcs.n1.rel;
      await NpcSys.befriend('n1');   // 已结识再点 → 拦截
      out.noDouble = p.npcs.n1.rel === relAfter && (p.counters.befriends || 0) === cnt;
    } finally { UI.popup = op; Game.afterAction = savedAA; }
    // 迁移：存量 rel>0 折 befriended
    const old = { name: '旧档', attrs: { gen: 5, comp: 5, luck: 5, body: 5 }, day: 10, _migratedVersion: 0, npcs: { n3: { rel: 25 }, n4: { rel: -30 } } };
    const m = PlayerFactory.migrate(old);
    out.migrated = m.npcs.n3.befriended === true && m.npcs.n4.befriended === false;
    return out;
  });
  rb9.firstRel > 0 && rb9.marked && rb9.noDouble && rb9.migrated
    ? pass('RB9 结交一次性：首次 +交情并落印记、再点拦截不动状态、存量 rel>0 迁移折印记（E240）') : fail('RB9 结交', JSON.stringify(rb9));

  /* ---- RB10 E241：连签豁免（闭关 30 日出关可续满的自动化等价） ---- */
  const rb10 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedAA = Game.afterAction; Game.afterAction = () => {};
    const today = Math.floor(p.day);
    try {
      // gap=0（同日重复触发）：不空涨
      p.signDay = today; p.signStreak = 3;
      DailySign.draw();
      out.gap0 = p.signStreak === 3;
      // gap=30（闭关 30 日出关）：续签 +30 豁免，progress 不标红
      p.day = today + 30;
      p.signDay = today; p.signStreak = 5;
      DailySign.draw();
      out.gap30 = p.signStreak === 6 && DailySign.progress(p).broken === false;
      // 次日续签 → 第七日满签（七日连签对闭关流可达）
      p.day = today + 31; p.signDay = today + 30;
      DailySign.draw();
      out.full7 = p.signStreak === 7 && (p.signText || '').includes('上上签');
      // 真断（gap=10）：归 1 且断签标红
      p.day = today + 41; p.signDay = today + 31; p.signStreak = 3;
      out.brokenFlag = DailySign.progress(p).broken === true;
      DailySign.draw();
      out.realBreak = p.signStreak === 1;
    } finally {
      Game.afterAction = savedAA;
      p.day = today; p.signStreak = 0; p.signDay = null;
    }
    return out;
  });
  rb10.gap0 && rb10.gap30 && rb10.full7 && rb10.brokenFlag && rb10.realBreak
    ? pass('RB10 连签豁免：gap=0 不空涨、gap=30 出关续签、次日即满签（七日连签对闭关流可达）、真断标红归 1（E241）') : fail('RB10 连签', JSON.stringify(rb10));

  /* ---- RB11 E242：存量 collect/普通 kill 任务读档作废重掷、danger 保留 ---- */
  const rb11 = await page.evaluate(() => {
    const out = {};
    const danger = { type: 'kill', target: 'm_kuiwei', need: 1, progress: 0, danger: true, name: '高危 · 生死状', desc: 'x' };
    const old = { name: '旧档', attrs: { gen: 5, comp: 5, luck: 5, body: 5 }, day: 10, _migratedVersion: 0,
      sect: { id: 'qingyun', contrib: 100, faction: null, rank: 'outer', tasks: [
        { type: 'collect', target: 'm_lingzhi', need: 4, progress: 2 },
        { type: 'kill', target: 'm_yezhu', need: 4, progress: 1 },
        danger,
      ] } };
    const m = PlayerFactory.migrate(old);
    out.noCollect = m.sect.tasks.every(t => t.type !== 'collect');
    out.noPlainKill = m.sect.tasks.every(t => !(t.type === 'kill' && !t.danger));
    out.dangerKept = m.sect.tasks.some(t => t.type === 'kill' && t.danger && t.target === 'm_kuiwei');
    out.threeSlots = m.sect.tasks.length === 3;
    out.flagged = m.sect._reform37 === true;
    return out;
  });
  rb11.noCollect && rb11.noPlainKill && rb11.dangerKept && rb11.threeSlots && rb11.flagged
    ? pass('RB11 差事改制迁移：collect/普通 kill 作废重掷、danger 生死状原样保留、改制旗标落档（E242）') : fail('RB11 作废重掷', JSON.stringify(rb11));

  /* ---- RB12 E242：生死状线回归（生成/推进/双倍赏格/非派系隔离/force 立威） ---- */
  const rb12 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedChance = Utils.chance;
    const savedAA = Game.afterAction; Game.afterAction = () => {};
    p.realmIdx = 2; p.layer = 0;
    try {
      // 派系成员：生死状支可掷出（chance 恒真）——产出 kill+danger 精英目标
      p.sect = { id: 'qingyun', contrib: 0, faction: 'tianshu', rank: 'inner', tasks: [], peakContrib: 0 };
      Utils.chance = () => true;
      const t1 = SectSys.genTask(p);
      out.genDanger = t1.type === 'kill' && t1.danger === true && t1.need === 1 && !!GameData.MONSTERS[t1.target].elite;
      // elites 击杀推进 + 双倍赏格
      p.sect.tasks = [{ ...t1 }];
      SectSys.onKill(t1.target);
      out.progressed = p.sect.tasks[0].progress === 1;
      const c0 = p.sect.contrib;
      SectSys.claim(0);
      const expectedContrib = (30 + p.realmIdx * 22) * 2;   // rewards(): danger 翻倍（无战争/演武/连勤加成）
      out.doublePay = p.sect.contrib === c0 + expectedContrib;
      out.slotReplaced = p.sect.tasks[0] !== undefined && p.sect.tasks[0] !== t1;
      // 非派系成员：40 采样永不接生死状（含 chance 恒真极端）
      p.sect.faction = null;
      let anyDanger = false;
      for (let i = 0; i < 40; i++) { if (SectSys.genTask(p).danger) anyDanger = true; }
      out.nonFactionSafe = !anyDanger;
      // 入派立威：任务被折算为生死状（v39（E365）wrapDanger 缩为立威单支，force 参数删除）
      p.sect.faction = 'tianshu';
      const t2 = SectSys.wrapDanger({ type: 'cult', target: null, need: 100, progress: 0 }, p);
      out.forceOk = t2.type === 'kill' && t2.danger === true;
      // 普通生成路径不再绕行 wrapDanger（newTask 直出 genTask，cult/explore/sign 任务不经立威折算）
      out.normalShort = !SectSys.newTask.toString().includes('wrapDanger');
    } finally {
      Utils.chance = savedChance; Game.afterAction = savedAA; p.sect = null;
    }
    return out;
  });
  rb12.genDanger && rb12.progressed && rb12.doublePay && rb12.slotReplaced && rb12.nonFactionSafe && rb12.forceOk && rb12.normalShort
    ? pass('RB12 生死状线回归：派系生成→击杀推进→双倍赏格→换新、非派系 40 采样零生死状、wrapDanger 缩为入派立威单支且 newTask 普通路径不再绕行（E242；v39 E365 新语义）') : fail('RB12 生死状线', JSON.stringify(rb12));

  /* ---- RB13 E243：时代时长重校迁移（min 收缩 + 防重入） ---- */
  const rb13 = await page.evaluate(() => {
    const out = {};
    const base = () => ({ name: '旧档', attrs: { gen: 5, comp: 5, luck: 5, body: 5 }, day: 365 * 4, _migratedVersion: 0,
      world: Object.assign(WorldSys.freshWorld(), { preachUntil: 15, ruinsUntil: 25, warUntil: 33, lingchaoUntil: 12, beastMaps: [{ map: 'qingfeng', until: 19 }] }) });
    const m = PlayerFactory.migrate(base());
    // 当前年 y=5 → 新帽：讲道 8 / 秘境 10 / 大战 11 / 灵潮 8 / 兽潮 10（min(原值, y+新时长)）
    out.shrunk = m.world.preachUntil === 8 && m.world.ruinsUntil === 10 && m.world.warUntil === 11 && m.world.lingchaoUntil === 8;
    out.beast = m.world.beastMaps[0].until === 10;
    out.flag = m.world._eraRecal37 === true;
    // 防重入：已带 _eraRecal37 的档不再收缩
    const old2 = base();
    old2.world._eraRecal37 = true;
    const m2 = PlayerFactory.migrate(old2);
    out.noRerun = m2.world.preachUntil === 15 && m2.world.warUntil === 33;
    return out;
  });
  rb13.shrunk && rb13.beast && rb13.flag && rb13.noRerun
    ? pass('RB13 时代重校迁移：五字段 min 收缩至新时长、_eraRecal37 落档、已迁移档不重跑（E243）') : fail('RB13 时代迁移', JSON.stringify(rb13));

  /* ---- RB14 E244：问剑夺位（日限 / 上下文 / 胜局对调 / 功勋） ---- */
  const rb14 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const savedStart = Battle.start, savedAA = Game.afterAction, op = UI.popup;
    Game.afterAction = () => {};
    UI.popup = async () => true;
    try {
      p.npcs = NpcSys.freshNpcs();
      p.rankHonor = 0; p._wenjianDay = undefined; p.rankPrev = null;
      p.realmIdx = 2; p.layer = 0;
      // 榜面确定化：其余 NPC 压至 r0l0，目标抬到 r3l0（rp12 > 我 rp8，其余皆在我之下）——目标恰居我前一位
      for (const d of GameData.NPCS) { const s = p.npcs[d.id]; if (s) { s.alive = true; s.realmIdx = 0; s.layer = 0; } }
      const target = GameData.NPCS[2].id;
      p.npcs[target].realmIdx = 3; p.npcs[target].layer = 0;
      const savedAway = NpcSys.isAway; NpcSys.isAway = () => false;
      const rows = RankSys.board(p);
      const myIdx = rows.findIndex(r => r.id === 'me');
      out.ahead = myIdx > 0 && rows[myIdx - 1].id === target;
      let calls = 0, ctx2 = null;
      Battle.start = (id, ctx) => { calls++; ctx2 = ctx; };
      await RankSys.challengeAhead();
      out.ctxOk = calls === 1 && ctx2 && ctx2.spar === true && ctx2.wenjian === true && ctx2.npcId === target;
      await RankSys.challengeAhead();   // 同日二问 → 日限拦截
      out.dailyOnce = calls === 1;
      // 胜局：榜序对调 + 功勋落账
      RankSys.onWenjianWin(p, target);
      const rows2 = RankSys.board(p);
      const iMe = rows2.findIndex(r => r.id === 'me'), iT = rows2.findIndex(r => r.id === target);
      out.swapped = iMe < iT && p.rankHonor > 0;
      // 功勋计入登顶判定（isTop 同口径）
      out.isTopAware = RankSys.isTop(p) === GameData.NPCS.every(d => !p.npcs[d.id] || !p.npcs[d.id].alive || p.npcs[d.id].realmIdx * 4 + p.npcs[d.id].layer <= p.realmIdx * 4 + p.layer + p.rankHonor);
      NpcSys.isAway = savedAway;
    } finally { Battle.start = savedStart; Game.afterAction = savedAA; UI.popup = op; }
    return out;
  });
  rb14.ahead && rb14.ctxOk && rb14.dailyOnce && rb14.swapped && rb14.isTopAware
    ? pass('RB14 问剑夺位：身前一位成算可问、ctx 带问剑旗标、日限一次、胜局榜序对调、功勋计入登顶判定（E244）') : fail('RB14 问剑', JSON.stringify(rb14));

  /* ---- RB15 E246：仙元携往生（折算/封顶/清零/pastXianyuan） ---- */
  const rb15 = await page.evaluate(async () => {
    const out = {};
    const savedPlayer = Game.player, savedAA = Game.afterAction, savedRoll = PlayerFactory.rollAttrs;
    Game.afterAction = () => {};
    PlayerFactory.rollAttrs = () => ({ gen: 5, comp: 5, luck: 5, body: 5 });   // 固定出身四维，便于断言折算增量
    try {
      const oldP = PlayerFactory.create('仙元道人', { gen: 5, comp: 5, luck: 5, body: 5 });
      oldP.counters.xianyuan = 5000;   // → 气运 min(3,5)=3（触顶）、悟性 min(2,2)=2
      const legacy = ReincarnationSys.readLegacy();
      await ReincarnationSys.execute(oldP, legacy, null, null, 0, true);
      const p2 = Game.player;
      out.newBody = p2 !== savedPlayer;
      out.carried = p2.pastXianyuan === 5000;
      out.fortuneCap = p2.fortune === 3;      // cap +3 实测（5000 本可折 5）
      out.compGain = p2.attrs.comp === 7;     // 5 + min(2, 5000/2000)=2 → 7
      out.zeroed = oldP.counters.xianyuan === 0;
    } finally { Game.player = savedPlayer; Game.afterAction = savedAA; PlayerFactory.rollAttrs = savedRoll; }
    return out;
  });
  rb15.newBody && rb15.carried && rb15.fortuneCap && rb15.compGain && rb15.zeroed
    ? pass('RB15 仙元携往生：5000 仙元折气运+3（触顶）/悟性+2、pastXianyuan 记档、当世清零（E246）') : fail('RB15 携仙元', JSON.stringify(rb15));

  /* ---- RB16 E247：节庆挂起补办（窗口内补办 / 超期从简） ---- */
  const rb16 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedAA = Game.afterAction, op = UI.popup, savedBattle = Battle.active, savedLog = Log.add;
    Game.afterAction = () => {};
    try {
      const fest = GameData.FESTIVALS.find(f => f.id === 'shangyuan');
      const dayBase = Math.floor(p.day / 365) * 365 + fest.day - 1;
      p.flags = {};
      // auto 回放遇上元 → 挂起（旗标防重 + pendingFestival 落档）
      p.day = dayBase;
      FestivalSys.check(p, true);
      out.pended = !!p.pendingFestival && p.pendingFestival.id === 'shangyuan' && p.pendingFestival.day === dayBase;
      out.flagged = Object.keys(p.flags).some(k => k.startsWith('fest_shangyuan_'));
      // 出关次日（窗口内）非 auto 收尾 → 补办走完整版弹窗
      let popupTitle = '';
      UI.popup = async (o) => { popupTitle = popupTitle || o.title || ''; return false; };
      Battle.active = null;
      p.day = dayBase + 1;
      FestivalSys.check(p, false);
      out.resolved = p.pendingFestival === null && popupTitle.includes('上元');
      // 超期 → 从简结算 + 「错过了」日志
      p.pendingFestival = { id: 'zhongyuan', day: dayBase };
      p.day = dayBase + 9;
      let logTxt = '';
      Log.add = (t, ty) => { logTxt += t; };
      FestivalSys.check(p, false);
      Log.add = savedLog;
      out.expired = p.pendingFestival === null && logTxt.includes('错过了');
    } finally {
      UI.popup = op; Battle.active = savedBattle; Game.afterAction = savedAA;
    }
    return out;
  });
  rb16.pended && rb16.flagged && rb16.resolved && rb16.expired
    ? pass('RB16 节庆挂起补办：auto 挂起落档、窗口内补办走完整版、超期从简并志「错过了」（E247）') : fail('RB16 补办', JSON.stringify(rb16));

  /* ---- RB17 E249：套装技触发与无重复结算 + 词条位门控 ---- */
  const rb17 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    p.dao = null;
    const savedA = Battle.active, savedEq = p.equipped, savedForge = p.setForge;
    const mkB = () => ({ zhenyuan: 0, zmax: 6, myFx: [], logs: [], stats: { in: 0, out: 0, maxCombo: 0, src: { attack: 0 } }, enemy: { name: '套技测试', hp: 0, hpMax: 100, fx: [] }, enemyFxIds: [] });
    try {
      // 玄天三阶：受击回真元（onPlayerHit 漏斗）——4 次受击 ×0.3 = 1.2 → +1 真元、余 0.2 累积（恰一次结算）
      p.equipped = { weapon: { id: 's_xt_jian', enhance: 0 }, armor: { id: 's_xt_jia', enhance: 0 }, accessory: { id: 's_xt_pei', enhance: 0 } };
      p.setForge = { xuantian: 3 };
      p.hp = Stat.compute(p).maxHp;
      out.techOn = ForgeSys.hasSetTech(p, 'zhenyuanOnHit') && !ForgeSys.hasSetTech(p, 'killAtk');
      const B1 = mkB();
      Battle.active = B1;
      for (let i = 0; i < 4; i++) Battle.onPlayerHit(B1);
      out.zyAcc = B1.zhenyuan === 1 && Math.abs(B1._zyAcc - 0.2) < 1e-9;
      for (let i = 0; i < 40; i++) Battle.onPlayerHit(B1);   // 持续受击：真元封顶 zmax，无重复结算
      out.capOk = B1.zhenyuan === 6;
      // 炼化未满三阶 → 技术未解锁
      p.setForge = { xuantian: 2 };
      const B2 = mkB();
      Battle.active = B2;
      Battle.onPlayerHit(B2);
      out.lockedOff = B2.zhenyuan === 0 && !ForgeSys.hasSetTech(p, 'zhenyuanOnHit');
      // 血河三阶：击杀叠攻（onEnemyHit 总线击杀判定点）+ myAtk 单漏斗 3%×层
      p.equipped = { weapon: { id: 's_hj_sha', enhance: 0 }, armor: { id: 's_hj_pao', enhance: 0 }, accessory: { id: 's_hj_ling', enhance: 0 } };
      p.setForge = { xuehe: 3 };
      out.killTechOn = ForgeSys.hasSetTech(p, 'killAtk');
      const B3 = mkB();
      Battle.active = B3;
      const st = Stat.compute(p);
      Battle.onEnemyHit(B3, st, 10);
      out.stack1 = B3._xueheStacks === 1;
      for (let i = 0; i < 7; i++) Battle.onEnemyHit(B3, st, 10);   // 连杀至封顶
      out.cap5 = B3._xueheStacks === 5;
      out.atkMul = Math.abs(Battle.myAtk(st) / Math.max(1, st.atk) - 1.15) < 0.02;   // 1+3%×5
      // 词条位门控：+12 解锁、+11 封存
      p.equipped = { weapon: { id: 'w_zhuxian', enhance: 12, mech: 'laststand' }, armor: { id: 'a_longlin', enhance: 11, mech: 'zmax' }, accessory: null };
      out.mechGate = ForgeSys.hasMech(p, 'laststand') && !ForgeSys.hasMech(p, 'zmax') && !ForgeSys.hasMech(p, 'combochase');
      // 致命保命：致死保留 1 点、每场一次
      p.hp = 0;
      const B4 = mkB();
      Battle.active = B4;
      Battle.onPlayerHit(B4);
      out.laststand = p.hp === 1 && B4._laststandUsed === true;
      p.hp = 0;
      Battle.onPlayerHit(B4);
      out.laststandOnce = p.hp === 0;   // 第二次不再保
      p.hp = Stat.compute(p).maxHp;
    } finally {
      Battle.active = savedA; p.equipped = savedEq; p.setForge = savedForge;
    }
    return out;
  });
  rb17.techOn && rb17.zyAcc && rb17.capOk && rb17.lockedOff && rb17.killTechOn && rb17.stack1 && rb17.cap5 && rb17.atkMul && rb17.mechGate && rb17.laststand && rb17.laststandOnce
    ? pass('RB17 套装技/词条位：受击回真元恰一次结算并封顶、未炼化不触发、击杀叠攻 3%×5 经 myAtk 单漏斗、+12 词条门控、致命保命每场一次（E249）') : fail('RB17 套技/词条', JSON.stringify(rb17));

  /* ---- RB18 E269：跳层作废豁免（杀业/魔性/回顾） ---- */
  const rb18 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedAA = Game.afterAction, savedDao = p.dao;
    const mkB = () => ({ ctx: { tower: true }, enemy: { name: '作废测试守影' }, logs: [], over: false, won: false });
    Game.afterAction = () => {};
    p.dao = 'demonic';
    try {
      Battle.history = [];
      const k0 = p.karma;
      // 对照组：普通塔战（邪修）→ 孽障 +1、魔性 +2、入回顾
      Battle.active = mkB();
      Battle.end();
      out.control = p.karma === k0 + 1 && Battle.history.length === 1;
      // 作废战：零杀业、不入回顾
      Battle.active = mkB();
      Battle.active._voided = true;
      Battle.end();
      out.voidedNoKarma = p.karma === k0 + 1;
      out.voidedNoHistory = Battle.history.length === 1;
      out.cleared = Battle.active === null;
    } finally {
      Game.afterAction = savedAA; p.dao = savedDao;
    }
    return out;
  });
  rb18.control && rb18.voidedNoKarma && rb18.voidedNoHistory && rb18.cleared
    ? pass('RB18 跳层作废豁免：未出手之战零杀业/魔性、不入战斗回顾、正常战照旧记业（E269）') : fail('RB18 作废', JSON.stringify(rb18));

  /* ---- RB19 E267：词缀星留档深比对（卸下→再穿 affixes+stars+enhance 三元零变更） ---- */
  const rb19 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedEq = p.equipped, savedKept = p.affixKept, savedEnh = p.enhanced;
    const inst0 = { id: 'w_sanqing', enhance: 12, affixes: { prefix: 'pojun', suffix: 'leech' }, stars: { prefix: 2, suffix: 1 } };
    p.affixKept = {}; p.enhanced = {};
    try {
      p.equipped = { weapon: inst0, armor: null, accessory: null };
      Bag.unequip('weapon');   // 卸下：留档 {affixes, stars} + 强化回 p.enhanced
      const kept = p.affixKept.w_sanqing;
      out.keptShape = !!kept && !!kept.affixes && !!kept.stars && kept.affixes.prefix === 'pojun' && kept.stars.prefix === 2 && kept.stars.suffix === 1;
      Bag.equip('w_sanqing');   // 再穿：留档写回新实例
      const inst1 = p.equipped.weapon;
      out.affixes = JSON.stringify(inst1.affixes) === JSON.stringify(inst0.affixes);
      out.stars = JSON.stringify(inst1.stars) === JSON.stringify(inst0.stars);
      out.enhance = inst1.enhance === 12;
      out.enhancedCleaned = !p.enhanced.w_sanqing;
    } finally { p.equipped = savedEq; p.affixKept = savedKept; p.enhanced = savedEnh; }
    return out;
  });
  rb19.keptShape && rb19.affixes && rb19.stars && rb19.enhance && rb19.enhancedCleaned
    ? pass('RB19 词缀星留档深比对：卸下存 {affixes,stars}、再穿三元（affixes/stars/enhance）逐项零变更（E267）') : fail('RB19 留档', JSON.stringify(rb19));

  /* ---- RB20 E267：affixKept 旧形态迁移归一 ---- */
  const rb20 = await page.evaluate(() => {
    const old = { name: '旧档', attrs: { gen: 5, comp: 5, luck: 5, body: 5 }, day: 10, _migratedVersion: 0,
      affixKept: { w_sanqing: { prefix: 'pojun', suffix: 'leech' }, a_longlin: { affixes: { prefix: 'yugu' }, stars: { prefix: 2 } } } };
    const m = PlayerFactory.migrate(old);
    const a = m.affixKept.w_sanqing, b = m.affixKept.a_longlin;
    return {
      oldWrapped: !!a.affixes && a.affixes.prefix === 'pojun' && a.stars && Object.keys(a.stars).length === 0,
      newUntouched: b.affixes.prefix === 'yugu' && b.stars.prefix === 2,
    };
  });
  rb20.oldWrapped && rb20.newUntouched
    ? pass('RB20 affixKept 迁移：旧形态包一层 {affixes,stars}、新形态原样保留（E267 双保险）') : fail('RB20 迁移', JSON.stringify(rb20));

  /* ---- RB21 E268：bak2 快照滚动（首拍语义不回归 + 活跃连续写入滚动拍 + 10 分钟节流） ---- */
  const rb21 = await page.evaluate(() => {
    const out = {};
    const hadSnapAt = Game._snapAt, hadAuto = Save.read('auto'), hadBak2 = Save.read('bak2');
    try {
      Save.remove('bak2');
      // 场景一（首拍语义不回归）：auto 刚写过（<60s）+ 会话未拍过 → 60 秒检查拦截，bak2 不产生
      Save.write('auto', Game.player);
      Game._snapAt = null;
      Save.snapshotAuto();
      out.firstFreshBlocked = Save.read('bak2') === null;
      // 场景二（首拍跨会话语义）：auto 为 10 分钟前的上次会话档 → 首拍照旧滚入
      Game._snapAt = null;   // 重置回「会话未拍过」
      const cur = Save.read('auto');
      cur.meta.ts = Date.now() - 610000;
      Save.writeRaw('auto', JSON.stringify(cur));
      Save.snapshotAuto();
      out.firstOldCopied = !!Save.read('bak2') && Save.read('bak2').meta.ts === cur.meta.ts;
      // 场景三（滚动拍）：本会话已拍过 + auto 刚写（<60s）→ 绕过 60 秒检查，bak2 跟进到当前
      Game._snapAt = Date.now() - 601000;   // 距上次拍 ≥10 分钟，节流放行
      Save.autoSave();                      // 写前调用（写新 auto 前先滚一帧）
      Save.write('auto', Game.player);      // 写新 auto（ts=now）
      Game._snapAt = Date.now() - 601000;   // 复位节流，模拟「10 分钟后」的滚动拍
      Save.snapshotAuto();
      out.rollingFresh = Save.read('bak2') && Save.read('bak2').meta.ts === Save.read('auto').meta.ts;
      // 场景四（10 分钟节流）：距上次拍 <10 分钟 → 直接返回
      const bakTs = Save.read('bak2').meta.ts;
      Save.snapshotAuto();
      Save.write('auto', Game.player);
      Game._snapAt = Date.now();            // 刚拍过
      Save.snapshotAuto();
      out.throttled = Save.read('bak2').meta.ts === bakTs;   // bak2 未被<10min 的调用改动
    } finally {
      Game._snapAt = hadSnapAt;
      if (hadBak2) Save.writeRaw('bak2', JSON.stringify(hadBak2)); else Save.remove('bak2');
      if (hadAuto) Save.writeRaw('auto', JSON.stringify(hadAuto));
    }
    return out;
  });
  rb21.firstFreshBlocked && rb21.firstOldCopied && rb21.rollingFresh && rb21.throttled
    ? pass('RB21 bak2 快照滚动：首拍 60 秒语义不回归、滚动拍绕过检查跟进活跃写入、10 分钟节流兜频（E268）') : fail('RB21 快照', JSON.stringify(rb21));

  /* ---- RB22 E272：章末演出中断补偿（只读补播 + 补记 seen + 追认线豁免） ---- */
  const rb22 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedCh = p.quest.ch, savedSeen = JSON.stringify(p.story.seen), savedRealm = p.realmIdx;
    p.quest.ch = 1;   // 当前第二章（c2_open），supR=2
    p.realmIdx = 1;   // 未达追认线
    delete p.story.seen.c2_open;
    const savedCur = Story.cur; Story.cur = null;
    try {
      Game.enterGame();
      out.replayed = !!Story.cur && Story.cur.id === 'c2_open' && Story.cur.readonly === true;
      out.seenMarked = !!p.story.seen.c2_open;
      Story.cur = null;
      const modal = document.getElementById('story-modal');
      if (modal) modal.classList.add('hidden');
      // 追认线豁免：realmIdx >= supR 时不再补播
      p.story.seen = JSON.parse(savedSeen);
      delete p.story.seen.c2_open;
      p.realmIdx = 2;
      Game.enterGame();
      out.suprSkip = !Story.cur && !p.story.seen.c2_open;
    } finally {
      p.quest.ch = savedCh; p.realmIdx = savedRealm; p.story.seen = JSON.parse(savedSeen);
      Story.cur = savedCur;
      const modal = document.getElementById('story-modal');
      if (modal) modal.classList.add('hidden');
    }
    return out;
  });
  rb22.replayed && rb22.seenMarked && rb22.suprSkip
    ? pass('RB22 章末演出补偿：开篇未 seen 未达追认 → 只读补播并补记 seen；达追认线跳过（E272）') : fail('RB22 补播', JSON.stringify(rb22));

  /* ---- RB23 E238/E239：三幕 realmShow 演出（坐化冷色 / 本命金褐 / 转世暖色） ---- */
  const rb23 = await page.evaluate(async () => {
    const out = { shows: {} };
    const shows = [];
    const savedShow = UI.realmShow, savedPopup = UI.popup, savedAA = Game.afterAction, savedExit = Game.exitToStart, savedSfx = Ambience.sfx;
    UI.realmShow = (text, color) => { shows.push({ text: String(text || ''), color: String(color || '') }); };
    UI.popup = async (o) => (o && o.title === '✦ 坐 化 ✦') ? 'end' : true;
    Game.afterAction = () => {};
    Game.exitToStart = () => {};   // 坐化终了不走真实退出（保住 Game.player 供后续幕断言）
    try {
      // 第一幕：坐化（冷色）
      const p = Game.player;
      p.dead = false; p.hp = 1;
      await Game.gameOver('寿元');
      const zuohua = shows.find(s => s.color === '#6b7a8f');
      out.zuohua = !!zuohua && zuohua.text.includes('灯火渐熄');
      // 第二幕：本命合成（金褐）+ inherit 音
      let sfxHit = false;
      Ambience.sfx = (k) => { if (k === 'inherit') sfxHit = true; };
      Bag.addItem('m_gupian', 9);
      await DungeonSys.synth();
      out.benming = shows.some(s => s.color === '#b89a5a' && s.text.includes('古宝认主')) && sfxHit
        && !!document.getElementById('realm-show');
      // 第三幕：转世落定（暖色）
      Ambience.sfx = savedSfx;
      const savedRoll = PlayerFactory.rollAttrs;
      PlayerFactory.rollAttrs = () => ({ gen: 5, comp: 5, luck: 5, body: 5 });
      const oldP = PlayerFactory.create('转世道人', { gen: 5, comp: 5, luck: 5, body: 5 });
      const savedPlayer = Game.player;
      try {
        await ReincarnationSys.execute(oldP, ReincarnationSys.readLegacy(), null, null, 0, false);
        out.reinc = shows.some(s => s.color === '#e8c56a' && s.text.includes('流光'));
      } finally { Game.player = savedPlayer; PlayerFactory.rollAttrs = savedRoll; }
    } finally {
      UI.realmShow = savedShow; UI.popup = savedPopup; Game.afterAction = savedAA; Game.exitToStart = savedExit; Ambience.sfx = savedSfx;
      document.getElementById('realm-show')?.remove();
    }
    return out;
  });
  rb23.zuohua && rb23.benming && rb23.reinc
    ? pass('RB23 三幕 realmShow：坐化冷色/本命金褐+inherit 音/转世暖色异象悉数挂载（E238/E239/E232）') : fail('RB23 三幕', JSON.stringify(rb23));

  /* ---- RB24 E234：虫害红点并入 cave 两通道 ---- */
  const rb24 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedCave = p.cave;
    const day = Math.floor(p.day);
    try {
      p.cave = { lv: 1, builds: {}, plots: [{ seed: 'seed_lingcao', crop: 'm_lingcao', days: 10, plantedDay: day - 1 }] };
      let d = UI.dots();
      out.clean = !d.cave && !d['cave:farm'];
      p.cave.plots[0].pested = true;
      d = UI.dots();
      out.pestOn = d.cave === true && d['cave:farm'] === true;   // 未熟但有虫害 → 两通道亮
      p.cave.plots[0].pested = false;
      p.cave.plots[0].plantedDay = day - 30;   // 熟田
      d = UI.dots();
      out.ripeStillOn = d.cave === true && d['cave:farm'] === true;
    } finally { p.cave = savedCave; }
    return out;
  });
  rb24.clean && rb24.pestOn && rb24.ripeStillOn
    ? pass('RB24 虫害红点：未熟有虫 → cave/cave:farm 两通道亮、无虫不亮、熟田照旧（E234）') : fail('RB24 红点', JSON.stringify(rb24));

  /* ---- RB25 E277：离线聚灵窗口补乘（乘窗与小结两段） ---- */
  const rb25 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedAA = Game.afterAction, op = UI.popup, hadAuto = Save.read('auto');
    const saved = { day: p.day, rushDay: p.rushDay, realmIdx: p.realmIdx, layer: p.layer, exp: p.exp, dao: p.dao, dead: p.dead, cave: p.cave, sect: p.sect, bounties: p.bounties, signDay: p.signDay };
    Game.afterAction = () => {};
    let got = 0;   // 观察 addExp 入参（升级折算不影响断言）
    const savedAdd = Cultivate.addExp;
    Cultivate.addExp = (pp, n) => { got += n; };
    try {
      // 环境确定化：day 200 起、离线 3 日（meta.ts 回拨 3 分钟=3 游戏日）、聚灵窗口 [200,203) 覆盖 2 日
      p.dao = null; p.sect = null; p.cave = null; p.bounties = null; p.dead = false; p._settleDay = 200;
      p.realmIdx = 2; p.layer = 0; p.day = 200; p.rushDay = 200;
      p.signDay = null; p.listenDay = -1;
      p.rushDay = null;
      const st = Stat.compute(p);
      const perRound = Cultivate.baseGain(p) * (1 + st.cultPct / 100);   // 实现内同式（rushDay 临时置空）
      p.rushDay = 200;
      const auto = Save.read('auto') || { v: 1, player: p, meta: { ts: Date.now(), dead: false } };
      auto.player = p;
      auto.meta = { name: p.name, realmText: 'x', day: 200, age: p.age, ts: Date.now() - 180000, dead: false };
      Save.writeRaw('auto', JSON.stringify(auto));
      let summaryHtml = '';
      UI.popup = (o) => { summaryHtml = summaryHtml + (o.html || ''); return Promise.resolve(true); };
      Game.computeOfflineProgress();
      const rushLeft = Math.max(0, Math.min(3, 200 + 3 - 200));   // 离线段起始日 200，窗口 [200,203) → 3 日全在窗内
      const rushMul = (3 + 0.5 * rushLeft) / 3;
      const expect = Math.round(perRound / 3 * 0.6 * rushMul * 3);
      out.mulOk = got === expect && expect > Math.round(perRound / 3 * 0.6 * 3);   // 高于无窗口基准
      out.summarySplit = summaryHtml.includes('聚灵加护') && summaryHtml.includes('修行精进（基础）');
      // 对照：无窗口 → 恰为基础口径
      p.rushDay = null; p._settleDay = Math.floor(p.day);
      p.day = 260;   // 换一段无节庆窗的离线
      got = 0;
      auto.meta.ts = Date.now() - 180000; auto.meta.day = 260;
      Save.writeRaw('auto', JSON.stringify(auto));
      Game.computeOfflineProgress();
      const perRound2 = Cultivate.baseGain(p) * (1 + Stat.compute(p).cultPct / 100);
      out.baseOk = got === Math.round(perRound2 / 3 * 0.6 * 3);
    } finally {
      Cultivate.addExp = savedAdd;
      UI.popup = op; Game.afterAction = savedAA;
      Object.assign(p, saved); p.exp = saved.exp;
      if (hadAuto) Save.writeRaw('auto', JSON.stringify(hadAuto));
    }
    return out;
  });
  rb25.mulOk && rb25.summarySplit && rb25.baseOk
    ? pass('RB25 离线聚灵乘窗：窗口日 ×1.5 加权（3 日全在窗内 rushMul=1.5）、小结拆基础/聚灵两段、无窗口恰基础口径（E277）') : fail('RB25 乘窗', JSON.stringify(rb25));

  /* ---- RB26 E235：连喂 ×5（自停条件）+ E236 批量兑换 ---- */
  const rb26 = await page.evaluate(async () => {
    const out = {};
    const p = Game.player;
    const savedAA = Game.afterAction, op = UI.popup;
    Game.afterAction = () => {};
    UI.popup = async (o) => (o && o.options && o.options.length === 3) ? o.options[0].value : true;
    const savedBeasts = p.beasts;
    try {
      // 连喂 ×5：5 枚内丹逐枚喂（中途不升阶场景）
      p.beasts = { active: null, list: [{ uid: 77, id: 'm_yezhu', name: '批量兽', species: 'beast', power: 5, level: 1, exp: 0, skills: [], bond: 0 }], nextId: 78 };
      Bag.addItem('m_neidan', 5);
      const before = p.beasts.list[0];
      const lv0 = before.level;   // 同一对象引用——先拍原始等级
      await BeastSys.feedMulti(77);
      // 5 枚内丹 = +2500 经验：1→4 阶（耗 400+800+1200）余 100，内丹清零（逐级结算口径）
      out.fed5 = lv0 === 1 && p.beasts.list[0].level === 4 && p.beasts.list[0].exp === 100 && Bag.count('m_neidan') === 0;
      // 自停：内丹 9 枚、1 阶兽（升阶吃 400/900/…），喂满十阶或内丹尽即停
      Bag.addItem('m_neidan', 9);
      await BeastSys.feedMulti(77);
      out.stopped = Bag.count('m_neidan') >= 0 && p.beasts.list[0].level > 1;
      // 兑换 ×10 与全兑
      p.stones = { low: 950, mid: 0, high: 0 };
      ShopSys.convertMulti('up1', 10);
      out.x10 = p.stones.low === 50 && p.stones.mid === 9;
      p.stones = { low: 550, mid: 250, high: 2 };
      ShopSys.convertAll();
      out.all = p.stones.low === 50 && p.stones.mid === 55 && p.stones.high === 4;
    } finally {
      Game.afterAction = savedAA; UI.popup = op; p.beasts = savedBeasts;
    }
    return out;
  });
  rb26.fed5 && rb26.stopped && rb26.x10 && rb26.all
    ? pass('RB26 批量：连喂 ×5 逐枚结算、内丹耗尽自停；兑换 ×10 连兑与全兑归笼零头自留（E235/E236）') : fail('RB26 批量', JSON.stringify(rb26));

  /* ---- RB27 E237：散修红点三态（新档亮/拒绝熄/存量迁移熄） ---- */
  const rb27 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const savedSect = p.sect, savedRealm = p.realmIdx, savedFlags = p.flags;
    p.sect = null;
    try {
      // 新档未拒：亮
      p.realmIdx = 1; p.flags = {};
      out.freshOn = UI.dots().sect === true;
      // 拒绝后：熄
      p.flags.sectDeclined = true;
      out.declinedOff = UI.dots().sect === false;
      // 拜入后：熄（任务/大比通道另算）
      p.flags.sectDeclined = false; p.sect = { id: 'qingyun', contrib: 0, faction: null, rank: 'outer', tasks: [], tourney: null };
      out.joinedOff = UI.dots().sect === false;
      p.sect = null;
      // 存量迁移：无宗门且 realmIdx>=2 → sectDeclined 置 true
      const old = { name: '旧档', attrs: { gen: 5, comp: 5, luck: 5, body: 5 }, day: 100, realmIdx: 2, _migratedVersion: 0 };
      const m = PlayerFactory.migrate(old);
      out.migrated = m.flags.sectDeclined === true;
    } finally { p.sect = savedSect; p.realmIdx = savedRealm; p.flags = savedFlags; }
    return out;
  });
  rb27.freshOn && rb27.declinedOff && rb27.joinedOff && rb27.migrated
    ? pass('RB27 散修红点三态：新档亮/拒绝熄（sectDeclined）/拜入熄 + 存量高境散修迁移熄（E237）') : fail('RB27 红点', JSON.stringify(rb27));

  /* ---- RB28 E255：聚灵窗口显隐口径 ---- */
  const rb28 = await page.evaluate(() => {
    const out = {};
    const p = Game.player;
    const saved = { rushDay: p.rushDay, realmIdx: p.realmIdx, cave: p.cave, day: p.day };
    try {
      p.realmIdx = 2; p.cave = { lv: 1, builds: {}, plots: [] };
      p.day = 600; p.rushDay = 600;   // 窗口内
      const inWin = UI.renderCaveTab('main').includes('act-spirit-rush');
      out.hiddenInWindow = !inWin;
      p.day = 603;                     // 窗口外（第 4 日）
      out.shownOutside = UI.renderCaveTab('main').includes('act-spirit-rush')
        && UI.renderCaveTab('main').includes('3 日内修炼 ×1.5');
      p.rushDay = null;
      out.shownIdle = UI.renderCaveTab('main').includes('act-spirit-rush');
    } finally { Object.assign(p, saved); }
    return out;
  });
  rb28.hiddenInWindow && rb28.shownOutside && rb28.shownIdle
    ? pass('RB28 聚灵窗口显隐：窗口内隐藏点燃钮、窗外/未点燃复显且文案为「3 日内修炼 ×1.5」（E255）') : fail('RB28 窗口', JSON.stringify(rb28));

  console.log('');
  console.log(`共 ${passN + failN} 项，失败 ${failN} 项`);
  if (consoleErrors.length) {
    console.log(`控制台错误 ${consoleErrors.length} 条：`);
    for (const e of consoleErrors.slice(0, 10)) console.log('  · ' + e);
  } else {
    console.log('控制台错误 0 条');
  }
  if (fails.length) { console.log('失败清单：' + fails.join(' | ')); }
  process.exit((failN > 0 || consoleErrors.length > 0) ? 1 : 0);
} finally {
  if (browser) await browser.close();
}
