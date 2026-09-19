# PLAN_V36「正本」

> 主题释义：正本清源——六路深审复核后定稿。
> 两枚 P0 实锤是本版主锋：**论道**是全游戏修为第一效率行动（7.0~11.2× 修炼、无日限无成本），
> v34 以 ×5.4 精校的境界曲线被整条旁路；**问道录重读**对抉择/细察场景无守卫，每读一遍重发一次
> pick() 奖励并改写抉择史（v33 A2 抉择因果网被污染）。批修 E200~E217 收拢 E143 同族最后两处竞态、
> onEnemyHit 三被动路径、掉落系数死参数与一批状态/口径暗伤；升级包 U1~U4 深化既有系统——
> 聚灵窗口语义正名、悟道入日常卡、塔绩封口与去向、档位单调门禁（price-audit 第七路）、
> 派系站队真权衡、天骄榜活性化、传承树死层折算、宗门大比周期救活。
> **不新增大块内容：全部改动要么堵旁路、要么救活已死内容、要么把隐性规则写上明面。**

## 审计结论摘要（定性）

1. **节奏**：论道（npc.js:742-766）无日限、无次数上限、零灵石成本，友好档 56×eco/日 = 修炼的 7.0 倍、生死档 11.2 倍，对约 24 位在城 NPC 无限轮刷，且 rel+1 自增强升档；切磋 E131 只限了单 NPC 频次，24 位同日各一场的总量通道依旧零时间成本（约闭关日均 12.7 倍）；聚灵 ×1.5 只惠及「点燃当日开始的那一轮行动」（cultivate.js:15），高境挂机流每天白烧约一天全部灵石收入而文案暗示全程受益；离线折算锚定普通修炼（game.js:280），闭关流玩家实得约为宣称「六成」的六成再六折。
2. **竞态**：E143「先 start 后 afterAction」十处修复之外仍有漏网——登天塔胜利后自动续层/塔内弹窗与节庆 fire 相撞（除夕年兽可被 Battle.active 占位静默蒸发，同族第 11 处），onVictory 与 end() 的 afterAction 双跑；渡劫失利偷袭段同构（pendingDao 提前消费、叩问弹窗与偷袭叠开，第 12 处）。
3. **经济**：塔绩「塔灵纳财」15 绩兑 120×eco 无日限无加价——v30 专门设置的层奖 300×eco 日额度在兑换侧被原样绕开；丹药表两处档位倒挂（pojing 单价 2.3 倍劣势于同配方 posha、tianyuan 被 zaohua 三维压制成死品）；灵田 grade3 双种日均塌陷 55%；price-audit 赌袋模型 midRate 恒 0.35 与实盘 `roll<60` 分支不符、满气运端两采样点被 `loseRate<0 continue` 静默跳过——v35 自称的扩容只有一个半采样点在岗；画符仲夏 +2 未入 drawCost，夏季转卖期望 +9.1% 在门禁外。
4. **状态**：一键行权聚灵弹窗「今日跳过」与 ESC/点遮罩取消同落 else 写成**永久**偏好且无恢复入口——v35 U3「聚灵扣款明示」一次误触即当世自毁；Daily.resetIfNew 保留 E175 同族第 0 日 coercion 陷阱（单源地基自身带病）；多波续波重置漏连击层与连携势（「续波喘息」防的跨波滚存换了两套增益原样发生）。
5. **战斗**：onEnemyHit 统一钩子仍有三条被动路径漏网（敌方 DOT 击杀、防御反击、词缀反伤——「不灭」不复活、「魔棘」不反弹）；rollDrops 主掉落漏乘 rate（E169「半额掉落」修复不完整）；dropMul 自 v20 起是死参数（深耕/兽潮/魔域/夺宝的差异化掉落承诺全部空转，explore.js:63 还是覆写非乘算）；自动战斗六步决策链永不用人兽合击（免费首用+最高常规倍率闲置）；法诀会心不结算塔祝福「聚气归元」；跳层赌约 riskAtk 覆盖赋值不叠加、run.risk 只写不读。
6. **内容活性**：问道录重读对 choice/investigate 无 readonly 守卫（high）；重读含战斗场景的 9 段剧情卡死战卡页——「当年胜负自见下文」的下文不可达；宗门大比 5 年一届 vs 实玩约 3 年至飞升——凡间主线节奏下结构性不可达；传承树四维层被 min(10) 封顶，多周目后期强制零收益且不可跳过；天骄榜排序纯境界而展示战力（战力零参与排序）且 NPC 成长慢两个数量级（登顶后榜面永冻）；派系站队是纯收益无权衡（专属秘藏实为公开品 7~7.5 折、唯一「代价」高危任务实为赏格翻倍的收益）。
7. **口径**：手册离线「四成效率/上限 30 日」实为六成/120 日、悬赏「两日一换」实为三日一轮、万宝阁「四折回收」实为 0.45——v34 A4、v35 E168、v32 E16 三轮「改参数忘改文案」三连，同类比值文案散落无单源。

> 编号说明：E197 起。PLAN_V35 G 段有一行以「E197」标注的条目，实为 E136「脏 id」的同项别名（原文标注「E136 同项」），该号位自此正式启用为本版首号；查阅历史时以本文档为准。

---

## A P0 实锤（两枚）

### A1 社交修为旁路封口：论道定价重校 + 切磋每日总限（E197、E198）

**病灶（E197 论道）**：`discuss()`（js/systems/npc.js:742-766）全文仅有 met/isAway/rel<0/tier known 四道拦截（:747-755），无任何日限或次数计数；收益 :757 `(40 + insight*30) * eco(p.realmIdx) * (0.8 + d.talent*0.08)` 直入 Cultivate.addExp，唯一代价 `Time.add(2)`（:763）。友好档 112×eco/2 日 = 56×eco/日 = 普通修炼（8×eco/日）的 **7.0 倍**，生死档 89.6×eco/日 = **11.2 倍**、闭关日均（12.8×eco/日）的 4.4~7 倍；:761 `rel+1` 使「论道越多→档位越高→越要论道」自增强。每境总需求论道流约 523 游戏日（1.4 年）vs 纯修炼 2896 日——v34 以 ×5.4 校准的 EXP_BASE（game-data.js:57）被整条旁路。

**病灶（E198 切磋）**：npc.js:437-439 的 E131 日限是 per-NPC `s.sparDay === today`，NPCS 全表 24 人同日各可一场；切磋胜利结算（battle.js:1767-1776）仅 `addExp(expGain*0.3)` 无 Time.add（对照普通战败 :1938 `Time.add(3)`）——r3 全扫 24 场日入 21025 修为，零灵石零游戏时间，约为闭关日均 12.7 倍；好感端胜 +5/场同为最高效社交。

**处方**：
- **E197**（npc.js discuss）：
  1. 拦截区（:755 之后、:756 之前）补**每 NPC 每日一场**：`const today = Math.floor(p.day || 0); if (s._discussDay === today) { UI.toast(\`今日已与${d.name}论道过——大道贵悟不贵频，明日再叙\`); return; } s._discussDay = today;`（形态与切磋 :437-439 对齐）。
  2. :757 收益改**自随乘数**：`const gain = Math.round(Cultivate.baseGain(p) * (1.0 + d.talent * 0.08));`——talent 1~5 → 1.08~1.4× baseGain ≈ 3.2~4.2 天修炼量/次，替换现定值公式。按 U1-E220 门禁带（任一主动作 ≤ 修炼日均 ×2.2）反推：论道日均 = 1.4×baseGain/2 日 = 0.7×baseGain/日 = 修炼日均（0.333×baseGain/日）的 2.1 倍，落带内。
  3. `rel+1`（:761）、感悟 +2~4（:756/:759）、`DaoSys.gain(p,4)`（:760）、`Time.add(2)`（:763）全部**维持**——收益与 rel 解耦后自增强环消解，「关系愈深倾囊相授」的叙事由感悟与好感承接。
- **E198**（npc.js spar）：:438-439 per-NPC 日限之后补**每日 3 场跨 NPC 总限**（形态对齐 SectSys.claimLeft，sect.js:155-160）：`if (p._sparCountDay !== today) { p._sparCountDay = today; p._sparCount = 0; } if ((p._sparCount || 0) >= 3) { UI.toast('今日已三度以武会友——筋骨酸软，明日再战'); return; } p._sparCount = (p._sparCount || 0) + 1;`。r3 全扫日修为 21025 → 2628（3 场），与闭关日均比值 12.7 → 1.6。

**验收**：论道日均 ÷ 修炼日均 ≤ 2.2 且 ÷ 闭关日均 ≤ 1.4（E220 balance-sim 横向表门禁全绿：改后论道 1.4×baseGain/2 日 = 0.7×baseGain/日 ≈ 修炼日均 0.333×baseGain/日的 2.1×；切磋 3 场 × 0.3×30×eco = 9×eco/日，r3 时约闭关日均 1.6×）；第 4 场切磋被拦且计数跨日重置；行游/结怨拦截不回退。~~per-action 榜不再离群~~ 作废：该榜 v35 实施时被静默丢弃（UPDATE_NOTES_V35.md:76 自证只交付四路扩容，price-audit.mjs 现存 149 行六路检测无此榜），论道/切磋为零灵石动作本就不进现金流榜——离群判定锚定 E220 横向表，榜本体由 E225 第八路补建。

### A2 问道录「温书模式」收口（E199）

**病灶**：重读入口 quest.js:1003-1008 `Story.play(story, null, true)` 置 readonly，但 story.js:121-146 `choose()` 全程无 `c.readonly` 判定——investigate 分支 :133 `KarmaSys.addFortune(2)` 每读一遍重发、choice 分支 :135 `await sc.pick(opt.value)` 重复结算（实锚 game-data.js:1773 c2_end `copy→感悟+5+上古碎片`、:1874 c4_end、:1923 c5_end、:2026 c7_end 及 2205 行起 24+ 段个人线），碎片×9 合本命无上限；:137/:141 `recordChoice/setFlag` 把问道录抉择树与回响分支改写成重读时点的选项——v33 A2 旗舰机制被污染。渲染层 :300-312 在 readonly 下照常渲染可点按钮。E135 只给 startBattle 补了守卫（story.js:154），这是同族第 4 处漏网。**伴生缺陷（并入本项）**：story.js:354 foot 模板对 battle 场景整体隐藏——重读含战剧情（c1_end/c2_open/c3_end/c4_open/c6_open/c6_end/c8_end/c9_end×2/c10_end 共 9 段）卡死战卡页，:336 文案承诺「当年胜负自见下文」而下文不可达（Enter 被 game.js:99 拦、skip/auto 双停、唯一出口 ✕ 整卷退出）。

**处方**（story.js + game.js）：
1. `choose()` 首行（:123 之前）补 `if (c.readonly) return;`——与 startBattle :154 守卫对齐。
2. `render()` :300-312：readonly 时 choice/investigate 卡改**纯文本展示**——选项保留列表排版但移除 `data-action="story-choice"` 按钮、「前尘所选」标记改为一行说明（数据现成：`this.choiceOf(c.id)`，:303 已取）；细察卡直接展示当年线索文本。
3. :354 foot 模板：foot 的隐藏条件从「choice/battle 恒隐藏」改为「**仅非 readonly 的互动场景隐藏**」（`!c.readonly && (sc.t === 'choice' || sc.t === 'battle')` 才隐藏）——readonly 温书态的 choice/investigate/battle 三类场景一律渲染「继 续」foot。只给 battle 补钮不够：choice 场景纯文本化后点击正文不翻页（story.js:42-45 modal click 仅 stopPropagation 补全打字机、不调 next()），鼠标端将只剩 ✕ 与 Enter——温书态抉择页同型卡死。**foot 可见性以上述条件式为唯一规范**：非 readonly 的 choice/battle 保持无 foot（必须点选项）；investigate 非 readonly **现状即有 foot**（story.js:354 隐藏名单只有 choice/battle），维持不变——勿按「互动场景一律无 foot」的口径误删。`next()`（:110-119）对 readonly 互动场景放行（现有实现无阻碍，仅入口缺失）。
4. game.js:99 Enter 守卫改：choice/battle/investigate 仅在**非 readonly** 时拦截（`readonly` 温书态恒可 next——互动场景已纯文本化，翻页无因果）。
5. 「整章串播」**不做**（✕+连点已够，宁缺毋滥）。

**验收**：重读任意已看章节前后 `p.counters/choices/flags` 深比对零状态变更（verify 断言）；9 段含战剧情在**纯鼠标操作**下可读到底（温书态抉择页有可见「继 续」钮）；温书态抉择卡不可点击、无气运/感悟/灵石入账。

## B P1 缺陷批修（E200~E217）

### B1 状态与收尾链竞态（E200~E205）

| # | 位置 | 问题→修法 |
|---|---|---|
| E200 | tower.js:261/:270-308 + battle.js:1750-1753/:1972-1973 | 塔内续层×节庆竞态（E143 同族第 11 处）：塔分支 battle.js:1750-1753 先 `end(false)`（:1972 active=null、:1973 afterAction→dailySettle→FestivalSys.check）——此刻 festival.js:24 挂起判定两条件皆空，节庆**立即 fire 且 :25 旗标前置**（不再重试）；随后 onVictory 里 chestStep/eventStep/blessStep 的 UI.popup（ui.js:1893-1896 单例槽 `popupChoose(-1)` 按取消强释）把未决节庆弹窗静默吞掉（除夕年兽按「安分守岁」结算），:288 跳层赌约弹窗（无 await 直开）同样会吞。修法**四处时机全覆盖**：①删 onVictory :261 重复 afterAction（end() 已跑，E62 同族冗余）；②增 `TowerSys.waitIdle(timeoutMs=10000)`：轮询 `!UI._popupResolve && !Battle.active`（50ms 步进，超时放行并 Log 提示）；③waitIdle 接入——无 steps 自动续层前（:270 改 `await Battle.wait(900); await this.waitIdle(); this.nextFloor();`）、**steps 循环前**（:272 之前，护住宝箱/奇遇/祝福三步弹窗）、**跳层赌约弹窗构造前**（:285 区，防赌约弹窗开启本身吞节庆）、赌约 then 回调内（改 async，先 `await this.waitIdle()` 再走 :296 既有校验与续层）——年兽「迎战」可正常开打（active 空位）、塔续层与塔内弹窗挂起至节庆了结 |
| E201 | tribulation.js:368-375 | 渡劫失利偷袭段（E143 同族第 12 处）：:370 `p.pendingDao=true` + :371 `Game.afterAction()` 先行，:372-375 才 400ms 后偷袭 Battle.start——节庆弹窗与偷袭相撞、pendingDao 被 game.js:418-421 提前消费（注释 :370 自述「若遇偷袭则战后开启」零实现）。改对齐 dungeon E59 模式：`if (ambushNpc) { p.pendingDao = true; await Utils.sleep(400); Battle.start(偷袭); Game.afterAction(); } else { p.pendingDao = true; Game.afterAction(); }`——偷袭战 end() 收尾链自然承接节庆与叩问 |
| E202 | cave.js:187/:192/:387-389 | 成熟田虫害死角：careCore 的 :187 `if (remaining<=0) continue` 把 :192 顺手除虫一并挡在成熟田外，而 checkPest（:244-257）照样给熟田上虫、harvest :349 照罚——只有惩罚没有出口。除虫块提到 remaining 判定**之前**（E154「成熟田不计浇水业绩」语义不变，watered 只在 remaining>0 时 ++）；renderPlots :387-389 除虫按钮移出非 ripe 三元、ripe&&pested 两钮并存 |
| E203 | utils.js:100-105 | Daily.resetIfNew 的 `(p[key] || -1) === t`（:102）在第 0 日恒失配——E175 同族陷阱残留在 v32 G3 声明「新代码一律走此口」的单源地基。改严格比较：`if (p[key] === t) return false; p[key] = t; return true;`（未定义键自然判新一日）。消费方核验：auction.js:162 盖戳路径第 0 日多盖一次无副作用、xian.js:137 真闸门在飞升后（day 巨大）——行为均不变 |
| E204 | battle.js:1728-1737 | 续波重置漏连击层与连携势：上一波攒的五层连击（:807 置位、comboMul +20%）与法诀「势」（:885 lastSkillTag、势尽 +15%）跨波全额带入续波首击——恰是 :1735 morale-30 注释要防的滚存。重置清单抽成 `Battle.waveReset()` 单源：现七字段（comboUsed/bmUsed/infantSaved/jadeSaved/enemyCtrlN/turn/morale-30）**并入** `B.combo=0; B.lastSkillTag=null; B.skillChain=0; B.skillSeq=0`；续波分支调用单源，此后新增跨波字段只改一处 |
| E205 | guide.js:166/:179-181 + ambience.js 设置中心 | 聚灵偏好三态单源化：「今日跳过」（:181 else）与 ESC/遮罩取消（popupChoose(-1)→undefined）同落 else 写成**永久** `_autoRush='skip'` 且无恢复入口。①:181 改 `else if (c === 'skip') { p._autoRushSkipDay = today; }`——undefined 不落盘、下一行权自然重问；②守卫 :166 补 `&& p._autoRushSkipDay !== today`（该守卫随 E218 再并入 `!inWindow` 前置——两批同文件，实施按 U1 终态一次落位）；③ambience.js 设置中心（:29 起字号、:45 起开关区同层）增「一键行权 · 聚灵偏好」三态选择（每次询问 `undefined` / 总是聚 `'always'` / 从不聚 `'skip'`）——'skip' 永久语义自此只能显式设置、随时可改回，存量脏档既有 skip 经设置页可见可改；④弹窗 tip（:172）补「偏好可在设置中心修改」 |

### B2 战斗收口（E206~E212）

| # | 位置 | 问题→修法 |
|---|---|---|
| E206 | battle.js:727/:1609/:1618 | onEnemyHit 三被动路径漏网：①tickDots('enemy') :727 扣血后补 `this.onEnemyHit(B, st, dotDmg)`（传伤值——魔棘对毒火一视同仁反弹；onEnemyHit 内反伤不再回调自身、无递归；enemyTurn :1360 的 hp<=0 判定在复活后自然放行）；②防御反击 :1609 扣血后、③词缀反伤 :1618 扣血后各补 `this.onEnemyHit(B, st, 0)`（传 0 仅复查「不灭」，不触发魔棘——防「反伤套反伤」双计）。「不灭」精英被三路径打死时不复活、「魔棘」不反弹自此归一 |
| E207 | battle.js:1635 | rollDrops 主掉落漏乘 rate：`if (Utils.chance(45))` → `Utils.chance(45 * rate)`——中间波材料期望 0.540→0.270 件/波，E169「补半额掉落」声明归真 |
| E208 | battle.js:1626-1680 + explore.js:63 | 掉落系数单源化：rollDrops 开头 `const coef = rate * (ctx.dropMul || 1);`，主掉落（:1635，即 E207）、夜获（:1630）、守财（:1642）、丹方残页（:1649）、rareDrop（:1665）、rareDrop2（:1675）统一 `*coef`；魔域/深耕/兽潮「额外一撮」块（:1654-1664）保留原状（本身即 dropMul 的呈现）——1.15~1.5 的倍率数值首次真实生效。explore.js:63 `bctx.dropMul = 1.4` 覆写 → `(bctx.dropMul || 1) * 1.4`（兽潮 1.3 与魔域 1.4 叠乘，「凶险与收获并增」）；explore.js:53/:57 已是乘算不动 |
| E209 | battle.js:924 前 | 法诀会心不回真元：塔祝福「聚气归元」（tower.js:40，无普攻限定）只接了普攻 :812 与必杀 :512——法诀 damage 分支 :915 会心判定后、:924 onEnemyHit 同位补 `this.gainZyOnCrit(p, crit)`，主输出手段纳入单源 |
| E210 | battle.js:1239-1309 | autoPilot 永不用合击：六步决策链无 combo 分支（act('combo') 全工程唯一触发点 game.js:664 按钮）。必杀步（:1256-1270）之后、祭符步（:1272）之前插入合击步：`BeastSys.comboReady(p)` 且（首用免费 `comboN===0` 或 战意≥3 且真元≥2——对齐 act('combo') :1052-1053 消耗口径）时 `this.act('combo'); return;`；付费合击加浪费护栏 `B.enemy.hp > this.myAtk(st)`（敌方血量高于普攻期望伤才值当），免费首用不受护栏 |
| E211 | tower.js:301-302/:290 | 跳层赌约风险不叠加：:302 `run.riskAtk = 1.25` 覆盖赋值（多次赌约仍恒 +25%）→ `(run.riskAtk || 1) * 1.25` 累乘；:301 `run.risk` 死字段（全工程唯一读写点）删除；:290 弹窗文案「此后守影攻击 +25%（本次登塔内）」→「此后守影攻击渐凶——每次赌约 +25%，可叠加（本次登塔内）」 |
| E212 | battle.js:402 | 敌方 AI 控制守卫只查 stun 不查 freeze——**现行活 bug，非防御性收口**：敌方 freeze 的现役入口是 npc.js:299 清冷 temper 技「冰弦裂魂」（w35；n7 洛雪衣、n17 姬冰颜即清冷，game-data.js:945/:956），经 battle.js:1514-1525 freeze 分支冰封玩家——玩家被冰封时敌方仍会投控，StatusFx.add 双控并存、下一 act 被 controlledConsume（:458-462 removeKinds(['stun','freeze'])）一次性全清，AI 整手浪费。补 `&& !StatusFx.has(B.myFx, 'freeze')`（MONSTERS 表确无 freeze 技——敌方侧唯一来源即清冷 temper，本条数据谱系以本次 grep 实证为准）。verify 断言按活路径写：清冷 NPC 对已冰封玩家不再投控 |

### B3 世界节律与口径（E213~E217）

| # | 位置 | 问题→修法 |
|---|---|---|
| E213 | sect.js:351 | 宗门大比 5 年一届 vs 实玩约 3 年至飞升（game-data.js:57 EXP_BASE 注释）——凡间主线节奏下首届大比要到飞升之后，v22 三轮车轮战/魁首气运/tourneyChamp 整链成准死内容。`TOURNEY_EVERY: 5` → **3**（:358 引用不动；:351 注释补口径：3 年一届保证凡间一世至少一届、首届落在金丹前后 day≈730~1095；仙界长岁照常供应；30 日过期规则 :360-363 保留）。docs/playbook.md 宗门段同步 |
| E214 | npc.js:383 | 雷台了断彩头池 grade 1~3 恒定——中高境玩家眼中是分解货，与「✦ 雷台了断 ✦」全屏仪式脱节。pool 过滤加随境下限：`const gMin = Utils.clamp(Math.floor(s.realmIdx / 2) + 1, 1, 3); grade >= gMin`（r0~1 → 灵级起步、r4+ → 地级起步；与 betray 的 tier 换算 :474 同族口径；grade 池上限维持 3——天级及以上 artifact 存量未盘点，实施时若池空回落 gMin−1，不为彩头引入未验证资产）。仅 :386 日志与 :388 announce 不动 |
| E215 | ui.js:2101/:2087 | 手册两处数值错档：:2101 「修为按修炼四成效率自行精进（上限 30 日）」→「修为按普通修炼六成效率自行精进（上限 120 日；闭关加成不计入）」（对齐 game.js:265/:280/:303 实发）；:2087 「悬赏板两日一换」→「三日一换」（对齐 bounty.js:32 `> 2` 与站内 :1426/:1431 既有三日口径） |
| E216 | ui.js:1173 | 万宝阁「四折回收」与实发 shop.js:33 `base * 0.45`（v32 E16 改参忘改文案）不符，显示口径低估 12.5%：改「四成五回收」；顺带巡检 helpModal（:2085-2091 营生与经济段）同类比值文案 |
| E217 | game.js:303 | 离线小结口径如实：小结行补「按普通修炼折算，不计闭关加成」——闭关流玩家实得约 37% 的落差从「暗亏」变「明示」。**提案「折算基数改闭关口径 + 离线结算洞府开销」明确不采纳**：①改基数使全员离线收益 ×1.6，与 v34 A4 刚校准的 0.6/120 叠加有节奏回潮风险，离线是防刷敏感区；②离线倒扣洞府开销属新体验面（挂夜归来见灵石变少）且与灵泉离线入账两线复杂化——宁缺毋滥。E216 同族文案巡检一并覆盖此行 |

## C~E 玩法升级包（采纳的六路提案落此——本版升级主体）

### U1 节奏与效率正名（E218~E220）

**E218 聚灵窗口语义收敛**（送审 F12：×1.5 只惠及点燃当日开始的那一轮，cave.js:151 文案「每轮修炼约 ×1.5」「自动修炼同样受益」对 3 日轮转口径失真）
- cultivate.js:15 `if (p.rushDay === Math.floor(p.day||0)) g *= 1.5;` → **3 游戏日窗口口径**：`if (p.rushDay != null && Math.floor(p.day || 0) - p.rushDay < 3) g *= 1.5;`——点燃后 3 日内所有修炼 ×1.5：普通修炼/挂机恰覆盖点燃后一轮（Time.add(3)，cultivate.js:189；autocult.js:99 每轮 3 日）、闭关覆盖首轮全段（:245 开局一次结算）。
- **点燃入口随窗口收口（两处守卫同步，防窗口内重复扣款）**：cave.js:147 与 guide.js:166 的单日守卫 `p.rushDay === today` 改「窗口未激活才可再点/才再询问」——`const inWindow = p.rushDay != null && Math.floor(p.day || 0) - p.rushDay < 3;`；inWindow 时 spiritRush toast「聚灵阵灵机未散（余 N 日），无需再燃」直接返回、一键行权跳过聚灵步。**否则——（以下为现状病灶的描述，应被上句守卫收口，绝非放行规定）**——窗口第 2、3 日两处入口照常询问并扣款 120×eco 重新点燃（rushDay 被覆写、窗口仅顺延），与同批改报「已点燃 · 3 日内修炼 ×1.5」的卡面（ui.js:647）自相矛盾（与验收「窗口第 2 日点燃被拦且不扣款」同指一处）。guide.js:166 守卫终态（E205 与本条合并）：`!inWindow && p._autoRush !== 'skip' && p._autoRushSkipDay !== today`。
- 文案三处同步按场景明示净收益：cave.js:151 弹窗改「点燃后 3 日内修炼效率 ×1.5（下一轮修炼约 +X 修为；若即将闭关，整轮闭关约 +Y 修为）」——X/Y 按当前状态实算（修炼增量 0.5×baseGain、闭关增量 8×baseGain）；guide.js:172 一键行权聚灵弹窗同步补窗口口径；ui.js:647 今日修行卡聚灵行 stat 改「已点燃 · 3 日内修炼 ×1.5」。
- 老档兼容：rushDay 本就存点燃日，窗口判定向后兼容（昨日点燃今日仍享，无害）。诚实标注：挂机流聚灵仍近亏（净赚 0.5×baseGain 对 120×eco）——明示后由玩家决策，聚灵的正确定位是**闭关前点燃**，不再伪装成挂机日常。
- 验收：挂机/闭关两场景断言（点燃后首轮 ×1.5、次轮恢复常态）；窗口第 2 日点燃烧被拦且不扣款、卡面与行权口径一致；文案预估与实发逐项一致。

**E219 悟道入今日修行卡**（送审 F14：悟道是感悟主出口（baseGain×2.5 ≈ 7.5 天修炼量，cultivate.js:97-120）却不进日常卡与一键行权，且每次须过确认弹窗——U3 归一最后一格）
- ui.js renderDailyCard（:643 后）增「悟道」行：今日已悟 → ok；insight≥20 未悟 → todo + 行内按钮（act-wudao，走 Cultivate.wuDao 原确认弹窗——**不做免确认直悟**：20 感悟是资源决策，行内直达但保留确认）；insight<20 → ok 态但 stat 显示 `感悟 N/20` 进度（避免低感悟期卡面永远差一件事）。
- stat 文案分境界：r9 圆满报「炼作仙元 1000」、否则「炼作修为」（与 :106 弹窗口径一致）。
- 一键行权**不**自动补悟（替玩家花资源不妥）；按钮 title :671 不变。
- 验收：insight=20 时卡面可见 todo 行；行内直达确认弹窗；日限 `_wuDaoDay` 计数正确；r9 报仙元。

**E220 balance-sim 全行动效率横向表门禁**（节奏曲线分析师提案：本轮四条节奏发现中三条属「行动效率不在拟合视野内」——把旁路行动拉进自动门禁，旁路上线即现形）
- scripts/balance-sim.mjs 增横向表：每境（r0~r9）枚举 修炼/闭关/调息（感悟口径折算）/悟道（日限摊薄）/论道/听讲/悬赏/探索（含战斗期望）/秘境一轮 的修为-每游戏日与灵石-每游戏日，落表 docs/balance-v19.md。
- **感悟→修为折算显式公式**（表值不随实现者漂移）：汇率锚定悟道——20 感悟 → 2.5×baseGain（cultivate.js:103，无 Time.add、日限一次），即 **1 感悟 = 0.125×baseGain**；调息 +2 感悟/日（cultivate.js:209-214，恰耗一日）→ 调息行 = **0.25×baseGain/日**；悟道行按同汇率摊薄 = 2.5×baseGain ÷ 10 日（20 感悟 ÷ 调息 2/日）= **0.25×baseGain/日**——两行均为修炼日均（baseGain/3 ≈ 0.333×baseGain/日）的 0.75×，门禁带内。**分母只计调息再生**：论道/听讲/秘境的感悟产出视作各主动作行的行内附赠（其修为主收益已在本行计量），不进入悟道分母——否则论道感悟会循环摊薄论道自己的门禁值；玩家以论道感悟喂养悟道使实际分母缩短时，行为上限由 E197 论道门禁间接约束，表中加脚注注明。
- 门禁：任一主动作修为效率 > 修炼日均 ×2.2 或 > 闭关日均 ×1.4 → 报警非零退出（现基准带：战斗 1.38×、闭关 1.6×按日摊、调息/悟道按感悟再生摊薄 0.75×；E197/E198 修复后论道 ≈2.1×、切磋 ≤1.6× 须入带）。
- 验收：E197/E198 落地后门禁全绿；实施中故意回滚论道公式验证门禁命中一次后还原。

### U2 塔绩封口与去向（E221）

**送审 F8**：塔绩「塔灵纳财」15 绩兑 120×stoneEco 无日限、无境界加价、无额度（tower.js:49/:56-79，对照雷晶核独享 redeemCost 境界加价 :55 与日限 :61-65）——深爬每胜层 +1 绩线性变现 8×eco/层且不占游戏日（grep Time.add 于 tower.js 零命中），v30 层奖日额度（:234-243，注释自述「塔成了后期最粗的可重复收入管」）在兑换侧原样绕开。
**处方**：
1. **纳财日限 2 次/日**：redeem 的 stones 分支补 `p.tower.today.stonesRedeemDay/stonesRedeemN`（syncToday :90-96 换日清零、state 自愈结构 :85-89 补默认字段）——r9 深爬 30 层×2 次日灵石进账回落至 240×eco ≤ 层奖额度 300×eco 同量级。
2. **去向扩容**：REDEEMS（:48-53）增一项 `{ id: 'qihun', name: '器魂五枚', cost: 40, desc: '器魂 ×5——塔中金石之精，淬器之魂' }`；发放走 SECT_EXCHANGE `_qihun_pill` special:'qihun'（game-data.js:549）同款路径（与 sect.js 兑换消费处对齐/抽 helper）。器魂是 v34 现成稀缺资源（淬洗/升星消耗），终局玩家塔绩有了第二去向；「指定词缀星 +1」「驯服心得」两项**不做**（前者牵涉 forge 内部星级状态、后者字段未验证——宁缺毋滥）。
3. redeemCost 不另加境界加价（雷晶核口径保留独享；纳财已有日限封口）。
**验收**：第 3 次纳财被拦且跨日重置；器魂入账；显式数字验收——r9 深爬 30 层×2 次纳财 = 240×eco ≤ 层奖日额度 300×eco（加层奖自身不越额度）；并作为 E225 第八路 per-action 现金流榜的首个联动用例（塔绩兑换行不登顶）；verify 断言。

### U3 档位单调门禁与数值重定价（E222~E225）

**E222 丹药重定价**（送审 F7：pojing 2600/2000=1.30 完爆同配方同上架境的 posha 2800/5000=0.56——2.3 倍差；grade5 tianyuan 1.12 被 zaohua 0.875 在价格/单价/上架境三维压制，两品成死品）
- game-data.js:198 `pill_pojing` price 2600 → **1300**（单价 0.65，落 posha 0.56 的 ±20% 带内且保留「破煞更优」梯度——r2 档入门大丹定位；desc 不变）；丹毒 45/修为 2000=0.0225 高于 posha 的 0.010 是其「药力霸道」风味（desc 已自述丹毒颇深），毒高价低构成取舍而非死品，**不做第二轴强单调**（避免重写整张丹毒表）。
- :229 `pill_tianyuan` use.exp 250000 → **320000**（单价 0.875 与 zaohua 持平；毒 85<zaohua 90、上架晚一境（:590 minRealm 7），定位「圆满期收官大丹」）；desc 同步「卅二万点修为」。
- 宗门/派系涉及丹药行对账：pill_jiuzhuan 宗门公开兑换 **1200** 贡献（game-data.js:546，24000/1200 = 20）、丹鼎派系 exclusive **900**（:971，26.7），均 <60，均不动。
- 验收：price-audit 丹药路 0 报警；r2~r7 每境至少一枚当境最优性价比丹药（人工复核留档）。

**E223 灵田 grade3 重校**（送审 F9：雪莲/炼魂花日均 182.2/196.0 仅为 grade2 冰魄 413.3 的 44~47%，且解锁境更高——升档种田反亏过半效率）
- game-data.js:338-339：雪莲种 days 45 → **19**（日均 (2×5000−1800)/19 = **431.6**）、炼魂花种 days 50 → **21**（日均 (2×6000−2200)/21 = **466.7**）——两者落 grade2 冰魄 413.3 与 grade4 星辉 1150.0 之间，且炼魂 > 雪莲（与其种子价 2200 > 1800 同序）；两条 desc「四十五日可收」→「十九日可收」、「五十日可收」→「廿一日可收」。
- **只压天数、不动作物价**（m_xuelian 5000 / m_lianhun 6000 维持）：作物价是 r5 九转/r10 大还/a1 回元/a4 培元延寿/r12 玄灵/f5 魂玉/f11 血河绫/f17 玄天佩八张配方的材料成本（game-data.js:874/:880/:886/:890/:882/:901/:906/:911），提价波及炼丹炼器全线与掉落卖价；days 只被灵田生长消费，零外溢。送审原建议数字（30/35 日 + 作物价 6500/7800）经实表复算过不了自家断言（373/383 均 < 413），作废。
- 收成口径上卡面（cave.js:347-350 的 ×2/过熟 20 日折半/季秋 +1/虫害 −1 全部隐性）：renderPlots 田块 gf-desc（:383-385 区）或种子 desc 补一行「可收 ×2｜过熟 20 日折半｜季秋 +1」。
- 验收（目标区间升格为断言口径）：实算日均严格满足 grade1 灵草 13.0 < grade2（灵芝 39.2／冰魄 413.3）< grade3（431.6／466.7）< grade4 星辉 1150.0 < grade5 仙灵种——**档内不强制互序，verify 按「相邻 minRealm 档最优日均」比较**（与 E225 种子检测同口径，避免同档小值误报）；卡面含收成口径断言。

**E224 画符季节期望并入**（送审 F10：craft.js:180 仲夏 qty+2 未入 expectedQty/drawCost（:147-157），夏季转卖期望 +9.1% 转正且 price-audit 画符路（:111）无季节分支——E128「成本与实发同源」不变量的季节缺口）
- craft.js expectedQty（:147-152）尾补 `q += (Art.seasonOf(p) === 1 ? 2 * 91 / 365 : 0);`——仲夏窗口 91/365 摊入期望，避免 drawCost 逐日跳变；drawTalisman :180 实发仲夏 +2 **不动**（v20 天时风味保留，定价把权重算进去）。
- price-audit 画符现金流路（:97-117）按 seasonOf ∈ {0,1,2,3} 四季复扫，阈值 resale > cost×1.05 不变。
- 验收：仲夏 r0 变现/成本回落 ≤1.05；四季×r0~r9×tierLv 全零报警。

**E225 赌袋模型修复 + price-audit 第七路「档位单调性」**（送审 F6 + 经济审计师提案）
- 赌袋模型（price-audit.mjs:75-76）：`midRate = 0.35` 恒定 → `Math.max(0, 0.6 - winRate)`（与实盘 black.js:121 `else if (roll < 60)` 分支同源——winRate≥60% 时 mid 恒 0）；**删除** :76 `if (loseRate < 0) continue`（胜率钳顶 75% 后 loseRate = 1−0.75−mid ≥ 0.25 恒正，该分支只会吃掉合法采样——luck=17.5/23 两点自 v35 起从未真正执行，满气运端是门禁盲区）。
- 新增第七路「同表档位单调性」三族检测（v35 E147 拍卖功法倒挂、本轮丹药/种子两条 medium 同族——现有六路全是跨渠道检测，对表内档位塌陷零覆盖）：
  ①丹药族：ALCHEMY_RECIPES 中 need 深度相等且 rate 相等的**配方对**（r4/r11 同 {m_neidan:1,m_lingzhi:1}×50）单价（price/use.exp）倒挂 >30% 报警；同 grade 纯修为丹（type==='pill' 且 use.exp 且无 insight）对低 grade 同类最优值的塌陷 >30% 报警。
  ②种子族：**相邻 minRealm 档最优日均**比较（(2×作物价−种子价)/days 取档内最大），高档最优 < 低档最优或塌陷 >25% 报警——档内不互查（灵芝 39.2/冰魄 413.3 同为 grade2 属设计内小值，不误报）。
  ③符箓池：tal_* price 随 grade 非单调报警。
- **新增第八路「per-action 现金流榜」**（PLAN_V35 U6⑤ 承诺、v35 实施时被静默丢弃——UPDATE_NOTES_V35.md:76 自证只交付四路扩容；price-audit.mjs 现存 149 行、输出节 :141-146 实读仅六路检测无此榜）：枚举可循环动作按**净灵石/游戏日**排序 Top10 写入报告——画符变卖、炼丹（材料成本→售出）、灵田种植净收益、塔绩四项兑换（按「每胜层 +1 绩」折算日均可得）、悬赏/差事领赏、黑市买卖价差、拍卖倒卖、宗门兑换卖店等；报警规则：Top1 净灵石/日 > 300×eco（层奖日额度同量级线）或 Top1/中位数 > 8× 即报警。论道/切磋为零灵石动作只进 E220 横向表、不进本榜（A1 验收锚定横向表，U2 验收锚定本榜塔绩行）。
- 验收：E222/E223 数据落地后第七路 0 报警；人工注入 pojing 2600 旧值样例命中报警（验证后还原）；luck 四采样点全部真实执行且满气运端 EV ≤ 0；第八路榜单生成且报警规则生效（塔绩兑换行不登顶，E221 联动用例）。

### U4 江湖纵深（E226~E228）

**E226 派系差异化 + 生死状代价化**（送审 F31：专属秘藏实为公开品 7~7.5 折、唯一「代价」高危任务实为赏格翻倍的自愿收益——站队是纯收益无权衡，「终身不可改换门庭」锁死零成本项）
- game-data.js SECT_FACTIONS（:967-974）各加 `perk` 与文案：天枢「每战获胜修为 +10%」、丹鼎「炼丹成丹率 +8%」、藏经「参悟所得 +15%」——复用现有聚合点：天枢在 battle.js victory 修为段按 `p.sect.faction==='tianshu'` ×1.1（对齐 commandActive 形态）；丹鼎在 craft.js 成丹率聚合（:27-28 pillBonus 处）+8；藏经在丹方残页参悟所得处 ×1.15（实施时定位 recipeOk 参悟函数）。不建新系统。
- 生死状战败补真实代价：高危目标开战时 ctx.dangerTask=true（explore.js battle 分支查 p.sect.tasks 中 danger 且 target 匹配者置位）；battle.js 败北分支（:1928-1944）按 flag 追加灵石 −10%（:1932 罚款减半口径）+ 心魔 +5（:1937 同款 XinmoSys.add）。
- exclusive 定价重锚「派系内部七五折」统一口径：gf_tumo/jiuzhuan/gf_dayan（:969/:971/:973）→ 1900/900/1900（公开价 2500/1200/2500 的 0.76/0.75/0.76，整百）；sect.js:246 站队文案改「依附派系可在长老处七五折兑换秘藏、得派系传承之利；敌对派系将给你派发高危生死状——战败折损甚重，且不可改换门庭」。
- 验收：verify 断言三派 perk 各自生效路径 + 生死状战败扣减；playbook 宗门段更新；「站哪队」首次成为有取舍的决策。

**E227 天骄榜活性化**（送审 F28：排序纯境界 realmIdx×4+layer（rank.js:10-17）而 :55 展示 Stat.power 并称「战力是底气」——战力零参与；NPC 年增修为仅当前层需 ×0.05~0.12（npc.js:141-142），升 1 层 10.3 年 vs 玩家单轮闭关 36~70 个 NPC 年——登顶后榜面永冻）
- rank.js render（:36-50 榜行）增**战力对比档位**：npc.js 抽 helper `npcCombatPower(p, s)`（从 buildEnemy :284-331 口径反推简化因子，实施时定式），榜行按其 vs Stat.power(p) 显示「可敌（±10%）/略逊（±30%）/远逊」。
- yearTick（npc.js:141-148）增**温和追赶**：`gain *= 1 + Utils.clamp((p.realmIdx*4+p.layer) - (s.realmIdx*4+s.layer), 0, 30) * 0.05;`（落后 1~30 小层 → ×1.05~**2.5**）；**与宿敌增益取 max 不叠乘**（grudge 者维持现 ×1.5+ 强度，防双乘失控）。
- 量级重估（对登顶节奏的扰动同步给数）：talent5 落后 30 小层封顶 → 年增 ≈ layerNeed × randF(0.05,0.12)均值0.085 × (0.6+5×0.18=1.5) × 2.5 ≈ **0.32 层需/年 ≈ 3 年一层**；玩家单轮闭关仍 ≈36~70 个 NPC 年修为——登顶节奏与登顶奖励链不受威胁，雷台/大比按境界对位不受影响。
- 排序口径（:10-11）与 isTop（:16-17）**不动**——境界排名的叙事一致性保留（雷台/大比均按境界对位），RankSys 断言不受冲击；:55 战力行保留、榜面新增实义对比；榜面补「距上一位还差 X 小层」给追赶目标感。
- 验收（按可达成口径）：①同种子下落后 NPC 的年修为增量 ≥ 无追赶 ×2（追赶因子可观测生效断言）；②24 人蒙特卡洛 **3 年内 ≥1 名 NPC 晋层**（talent4~5、落后段样本；talent5 封顶情形期望约 3 年一层，多人样本下达成为大概率事件）；③玩家登顶前至少 3 名 NPC 有战力差提示。原「3 年内榜位变动 ≥2 次」不可达（榜位变动需整层跨越、旧倍率至多 ×1.5≈0.15 层/年），作废。

**E228 传承树死层折算**（送审 F30：四维层 min(10) 封顶（reincarnation.js:53/55/56/68）且 1~10 层按累计印记强制点亮（:108）——多周目后期四维满值后「生而知之/福缘深厚/道基天成/道骨」固定零收益、不可跳过，轮回镜仍按真实奖励展示）
- TREE_EFFECTS 四维层 apply 改**满值折算**：属性未满走原加成；已满（`p2.attrs[k] >= 10`）改授 `p2.cultGift = (p2.cultGift || 0) + 2`（修炼效率 +2%/层，四层合计 +8% 封顶 ≈ 两层洞天量级，不破坏节奏）；道基天成/道骨按各维分别判定（部分满则满的维折算）。
- stat.js Stat.compute 消费 cultGift：落在 **stat.js:144 的 cultPct 聚合处**追加 `+ (p.cultGift || 0)`（cultGift 以百分点计，经 gainMult 的 `(1 + cultPct/100)` 生效）；形态与 cultivate.js:9 的 teach 长老令同族（基础增益乘算族）——注意 teach 本体在 Cultivate.baseGain（cultivate.js:9）不在 stat.js，勿按「同位」二字到 stat.js 找。
- 一世之家（:52）**不动**（origin.start.stones ≤3000 基数小、翻倍绝对值影响微小）；轮回镜各层 desc 补「（四维满十时折化为修炼效率 +2%）」提示，不再伪装普通未解锁态。
- 验收：verify 断言满 comp 转世者生而知之层 apply 后 cultGift=2 且 Stat 生效；未满档行为与旧版逐位一致。

## F 沉浸感与体验（E229~E230）

- **E229 意图预估覆盖技能型出手**（战斗系统评审员提案：v32 C1 伤害预估只覆盖 strike/finisher，狡诈/坚韧模板过半回合在放 0.8×~1.2× 直伤技能——意图栏有字无价，读招博弈名存实亡）：battle.js intentEstimate 扩展——skill 类按 enemySkill kind 乘数（poison 0.8/bleed 1.1/drain 等）走同式 afterDef 估 lo~hi 直伤区间；DOT 类不加区间、intentLabel 尾缀「附毒/焰/血 N 回合」；mpburn/guard/roar/heal 标注资源型（摄灵/铁壁/咆哮/自愈）；「未计格挡/会心」歧义说明收敛为一处。
- **E230 终局仪式异象补全**（体验沉浸评审员提案：全游戏最高里程碑「证道祖之境」演出密度反而低于普通突破——xian.js:129-133 仅 announce+日志，无 realmShow 无专属音效；结拜/道侣尚有全屏异象）：xian.js 证道祖之境补白金色 t3 档 realmShow 全屏演出（≥4.6s 上行长尾）+ ambience 新「daoZu」音色（复用 v19 突破三档 realmShow 与 v34 E3 全屏仪式轮子；演出非阻塞、announce aria-live 已具备读屏可达）；仙籍落名/晋层按 XianSys.cur 分档补 t1/t2 档 realmShow（同 v19 突破分档法）。验收：证道演出不挡结算行序、读屏可感知；verify 断言调用形态。
- （温书模式收口在 A2；文案口径三则在 B3 E215~E217。）

## G 工程地基（E231）

- **E231 数值文案单源 + check-actions 对账**（体验沉浸评审员提案收敛版——「改参数忘改文案」已三连：v34 A4/v32 E16/v35 E168）：
  1. ui.js 顶置 `UI.FACTS = { offlineEff: '普通修炼六成', offlineCap: 120, bountyDays: 3, sellRate: '四成五' }`；helpModal :2101/:2087 与 shop 出售区 :1173 文案由 FACTS 拼串，手册与面板零手写比值。
  2. check-actions.mjs 增「文案-常量」定点对账断言（静态正则抽取比对，漂移即红）：FACTS.offlineCap ↔ game.js `Math.min(120,`；FACTS.bountyDays ↔ bounty.js:32 `> 2`（+1）；sellRate ↔ shop.js:33 `0.45`。
  3. 验收：故意把 shop.js 0.45 改回 0.4 时 check-actions 报警（验证后还原）；E215/E216 的修订自此有防复发门禁。

## 附一：32 条确认发现着落对照

| # | 送审位置（severity） | 着落 |
|---|---|---|
| 1 | guide.js:181 聚灵跳过永久化（medium） | E205（B1） |
| 2 | tower.js:270 塔续层×节庆（medium） | E200（B1） |
| 3 | tribulation.js:370 渡劫失利偷袭（medium） | E201（B1） |
| 4 | cave.js:187 成熟田虫害死角（low） | E202（B1） |
| 5 | utils.js:102 resetIfNew coercion（low） | E203（B1） |
| 6 | price-audit.mjs:75-76 赌袋模型失效（medium） | E225（U3） |
| 7 | game-data.js 丹药档位倒挂（medium） | E222（U3） |
| 8 | tower.js 塔绩纳财无界（medium） | E221（U2） |
| 9 | game-data.js 种子 grade3 塌陷（low） | E223（U3） |
| 10 | craft.js:180 仲夏未入定价（low） | E224（U3） |
| 11 | npc.js:757 论道 7~11.2×（**high**） | E197（A1） |
| 12 | cultivate.js:15/cave.js:151 聚灵窗口失真（medium） | E218（U1） |
| 13 | game.js:280 离线折算基数（low） | E217（B3）——口径如实标注；改基数方案**明确不采纳**（理由见 E217） |
| 14 | ui.js:636-682 悟道不进日常卡（low） | E219（U1） |
| 15 | battle.js:727 三被动路径漏 onEnemyHit（medium） | E206（B2） |
| 16 | battle.js:1635 主掉落漏乘 rate（medium） | E207（B2） |
| 17 | battle.js:1654 dropMul 死参数（medium） | E208（B2） |
| 18 | battle.js:915 法诀会心不回真元（low） | E209（B2） |
| 19 | battle.js:1239 autoPilot 无合击（low） | E210（B2） |
| 20 | tower.js:302 赌约风险不叠加（low） | E211（B2） |
| 21 | battle.js:402 freeze 守卫缺失（low） | E212（B2） |
| 22 | battle.js:1729 续波重置漏连击/连携势（low） | E204（B1） |
| 23 | story.js:121 重读 choose 无守卫（**high**） | E199（A2） |
| 24 | story.js:354 重读战卡卡死（medium） | E199（A2）——同根并入温书模式 |
| 25 | ui.js:2101 手册离线/悬赏错档（low） | E215（B3） |
| 26 | ui.js:1173 四折回收（low） | E216（B3） |
| 27 | sect.js:351 大比 5 年不可达（medium） | E213（B3） |
| 28 | rank.js:10-17 天骄榜双重薄弱（medium） | E227（U4） |
| 29 | npc.js:437-439 切磋 24 场/日（medium） | E198（A1）——与论道同根同批 |
| 30 | reincarnation.js:53-68 树四维死层（medium） | E228（U4） |
| 31 | game-data.js:969-973 派系无权衡（low） | E226（U4） |
| 32 | npc.js:382-389 雷台彩头分解货（low） | E214（B3） |

## 附二：存疑发现

本轮六路核查**无存疑发现**送审（0 条），无附录项。

## 测试与回归要求

- **verify-v22 新套件（目标 ~90 断言，接入 test:all）**：SA 源码静态组逐项覆盖 E197~E231（论道公式与 _discussDay 守卫、切磋总限、温书守卫与纯文本渲染、waitIdle 四处时机挂起、careCore 除虫前移、resetIfNew 严格比较、waveReset 单源、聚灵三态与 _autoRushSkipDay、窗口守卫 inWindow、三被动路径接线、45*rate、coef 单源与 explore 乘算、gainZyOnCrit 法诀位、合击步、riskAtk 累乘、freeze 守卫（清冷 temper 活路径）、TOURNEY_EVERY=3、彩头 gMin、FACTS 表、perk 三消费点、cultGift 折算、E222/E223 数据口径与种子日均相邻档单调）；RB 浏览器行为组：重读前后 counters/choices 深比对零变更、9 段含战剧情**纯鼠标**通读到底、塔内除夕年兽正常开打且续层/塔内弹窗挂起（含 steps 层路径）、ESC 关聚灵弹窗次日重问、设置改回当日即聚、窗口第 2 日点燃被拦不扣款、熟田虫害可除、第 0 日 resetIfNew 真值、e_reborn 精英被 DOT/反击/反伤各复活一次、合击就绪自动出手、清冷 NPC 对已冰封玩家不再投控、第 3 次纳财被拦+器魂入账、聚灵窗口两场景、悟道行直达、seasonOf 四季画符成本、派系 perk 生效、生死状战败扣减、门禁第七/第八路对注入样例命中。
- **受影响旧断言修订清单**（实施时以 `grep -n "sparDay\|discuss\|TOURNEY\|offline\|resetIfNew\|_autoRush\|riskAtk\|dropMul\|waveReset\|readonly" tests/*.mjs` 全量定位、逐条修订并列档）：
  - verify-v21：E131 切磋日限断言随每日 3 场总限补口径；E128 画符断言随 expectedQty 季节项复核（RB15 真实画符入账仍须成立）；E138 塔跳层断言随 riskAtk 累乘与文案修订；E135 重读守卫断言从 startBattle 扩展至 choose/investigate；聚灵弹窗相关断言随三态语义修订。
  - verify-v20：离线 0.6/120 参数断言**不动**（本版不改参数）；TOURNEY_EVERY 相关断言随 5→3 修订。
  - verify-v19/v18 及更早：resetIfNew 严格比较后 auction 盖戳路径行为不变（第 0 日多盖一次无断言影响）；price-audit/balance-sim 相关断言随七路扩容修订。
- **price-audit 终稿**：六路 + 第七路全零（含四季画符、四采样赌袋、丹药配方对/种子/符池单调）；**第八路 per-action 现金流榜（E225 补建——v35 U6⑤ 被弃项）**生成且无越 300×eco 线或 Top1/中位 >8× 的离群动作。
- **balance-sim**：无离群段；全行动效率横向表落 docs/balance-v19.md 且门禁全绿。
- **全量回归**：`npm run test:all` 22 套件连续两轮全绿 0 控制台错误（EXIT=0×2）。
- **judge 双视口六屏视觉验收**：①今日修行卡（悟道行+聚灵新口径）②问道录温书模式（抉择/战卡均有「继 续」+9 段纯鼠标通读）③登天塔塔绩兑换（器魂新项+纳财日限）④万宝阁出售区与玩法手册（四成五/离线/悬赏口径）⑤宗门大比开幕与派系面板（perk 与七五折文案）⑥战斗意图栏（技能型敌人直伤区间与 DOT 标注）。

## 文档落档范围

- **UPDATE_NOTES_V36.md**：P0 两枚（论道/切磋旁路封口含削弱前后对照数字、温书模式）；批修 E200~E217 十八则；升级包 U1~U4（聚灵窗口语义变更与文案对比、悟道入卡、balance-sim 门禁、塔绩器魂兑换、丹药/种子重定价前后表、画符四季口径、第七路门禁、派系 perk/生死状代价、天骄榜对比列与 NPC 追赶、树死层折算）；沉浸 E229~E230；工程 E231；price-audit 第七/第八路终稿（per-action 现金流榜补建）与 balance-sim 横向表结论。
- **docs/playbook.md v36 更新点**：聚灵「3 日窗口」新口径与设置中心偏好入口、切磋每日 3 场总限、宗门大比三年一届、派系 perk 与七五折秘藏、塔绩器魂兑换与纳财日限、温书模式（重读不再重演互动）、丹药/种子重定价后的当境最优推荐、离线口径明示。
- **版本发布**：全部计划完成、test:all 连续两轮全绿后 `npm run release -- v36`（缓存号 ?v=52、SW fanren-wd-v11、releases/v36 快照）→ 最后一次性 commit（post-commit 自动推送双仓库）。

## 实施顺序

0. 开工前置：还原 docs/balance-v19.md 的工作区残留（本轮 git diff 实证 10+/10-，为规划期 balance-sim 重跑的蒙特卡洛噪声漂移——练气 3.2→3.3 回合、大乘/真仙 100%→98% 等，v36 终稿会重新生成该表）；docs/price-audit.md 经评审员实跑 `node scripts/price-audit.mjs` 已再生为「问题清单（0）」现势版（本轮 git status 复核该文件已清洁），工作副本曾载的「seed_lianhun 黑市利润薄」发现对应已作废的作物价 6500/7800 实验态，勿当在案审计去追——两份文件最终均由终稿重新生成。
1. A1 → A2 两枚 P0（节奏旁路先断、温书收口）→ B1 → B2 → B3 批修 → U1~U4 升级包 → F → G
2. scripts/build → price-audit 七路复跑（含注入样例验证）→ balance-sim 横向表 → verify-v22 编写（~90 断言）→ 受影响旧套件修订
3. 全量 test:all 连续两轮全绿（EXIT=0×2）
4. judge 双视口六屏视觉验收
5. UPDATE_NOTES_V36 + playbook v36 + `npm run release -- v36`（?v=52 / fanren-wd-v11）→ commit

## 验收标准

- `npm run test:all` 22 套件全绿、0 控制台错误、连续两轮 EXIT=0。
- 论道日均 ÷ 修炼日均 ≤2.2 且 ÷ 闭关日均 ≤1.4；切磋每日 3 场总限生效；balance-sim 全行动效率门禁全绿。
- 重读零状态变更（深比对断言）、9 段含战剧情可读到底；塔内除夕年兽不再蒸发；聚灵一次误触不再当世自毁。
- price-audit 七路终稿全零 + 第八路 per-action 现金流榜生成且无离群；丹药/种子/符池档位单调；赌袋四采样点全执行、满气运端 EV ≤ 0。
- judge 6/6 通过。
