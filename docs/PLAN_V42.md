# PLAN_V42 · v42「鼎新」全方位大升级计划（定稿 v5 · 终审：动作键就近落表）

> 状态：**计划定稿**（待实施）。七路只读探查（战斗 / 经济 / 节奏 / 玩法系统 / UI / 沉浸 / 缺陷狩猎）结论直接回填，关键断言经本会话 `sed`/`grep` 实读核验（引注均为实读所得，逐条标注）。
> **终审修订摘要**（终审一条结构性矛盾，采纳方案 A「就近落键 + 白名单微例外」，本会话实读确证）：check-actions.mjs:2-7「全工程 data-action 字面量与 js/game.js 的 Game.actions 表互相求差……双向漂移一律拒绝通过」、:33-36 表键仅认 `'key':(` 形态（实读确证），本版 9 个新动作（ui-tip/tut-task-done/med-route/pouch-set/pouch-use/sweep5/subworld-open/subworld-invest/relic-pick）处理器键必须登记进 game.js 唯一 actions 表——而 game.js 仅在 W2A/W2C 文件集：W1B（E487/E489）严格守白名单则 wave1 后 check-actions 恒红（NO-HANDLER 非零退出），推迟 W3 统一落键则 E506「本批 28 步全量绿」自相矛盾。**定案**：①契约十一「跨批依赖时序与交接项」把 **js/game.js 的 Game.actions 表显式列为跨波复动点**——动作处理器函数落所属包文件（UI.tip 落 ui.js 等），**每个新动作的键登记行随所属 E 就近写入 game.js（一行一动作，白名单微例外）**，W3/E528 只做汇总核对；②W1B 文件集加注「js/game.js（仅限 E487/E489 动作键登记两行）」；③E506 验收保持「本批实施时链仍 28 步全量绿」——方案 A 下键随批登记、check-actions 不红，矛盾消除；④E487/E489 修法补就近登记句；⑤E528 措辞改「汇总核对（键已随批就近登记）」。
> **v4 修订摘要**（第三轮评审与 v2/v3 两轮**再次逐字同文**——同一批 JSON、where 行号仍为 v1 旧值，系同批意见第三次重放）。经本会话再次 `grep` 复检：八条必落实**全部在档且旧口径零残留**（命中计数：①E522/explore.js 入 W2C=6 处；②INSIGHT_EVENTS 落 cultivate.js=4、CONSIGN_TIERS_V2 落 auction.js=3；③E523 引注 npc.js:1100-1130=3；④E485 ≈1.06=5；⑤E508 ∈[1.2,1.5]=4；⑥field-audit.mjs 入 W2A=2；⑦E488 LOCKS 翻转=4；⑧E499 concat 扩 TITLES=3；旧口径「explore.js（仅 W2B）/INSIGHT_EVENTS 落 game-data/CONSIGN_TIERS_V2 落 game-data/t3 档（道祖）晋入」=0 残留；E 总数 54 不变），九条参考建议同前两轮已落实（行号证据见 v3 摘要所记，仍有效）。**文档实质内容相对 v3 零变化**，仅本摘要与版本号更新——若评审方认为仍有未落实处，请指出具体条目的 v4 文本位置，本会话将按新意见修订。
> **v3 修订摘要**（第二轮评审八条与 v2 轮**逐字同文**——同一批 JSON、where 行号仍为 v1 旧行号，系同批意见重放；经本会话逐条 `grep` 复检确认 **v2 已全部落实，无新增改动**，如实记录不伪造修订）。逐条复检证据（行号）：①E522/explore.js 已入 W2C 文件集、契约串行清单、批次计划（三处）；②数据表归属已重写（ELITE_AFFIXES_T2→W1A 落 game-data、INSIGHT_EVENTS→cultivate.js 同址、CONSIGN_TIERS_V2→auction.js 同址）；③E523 引注已改 npc.js:1100-1130（reincarnation.js 全文 595 行 `wc -l` 实测）、npc.js 已入 W2C；④E485 算术已更正 r5→r6 ≈1.06；⑤E508 验收已反转 ∈[1.2,1.5]；⑥scripts/field-audit.mjs 已入 W2A 文件集；⑦E488 已改 tutorial.js/ui.js 检测 LOCKS 翻转+unlockedTips 记忆（不动 guide.js）；⑧E499 称号已定 flavor-v42.js concat 扩 TITLES。九条参考建议同批同文，v2 已择收全数落实（取证计数：服务 E500=1、Narrative.attack、映射表 E483、自然命中=3、黑市全池=3、EXEMPT_PVE_CTX=3、bt-item=3、COMBO 构造=2、证道祖=5、最终全量 29 步=2、交接项=3）。**文档实质内容相对 v2 零变化**，仅本摘要与版本号更新。
> **v2 修订摘要**（评审八条全部落实，关键断言经本会话二次实读确证）：①E522 扫荡落点缺口——explore.js 加入 W2C 白名单并补契约串行复动清单（W2B→W2C）；②数据表归属三重矛盾重写——ELITE_AFFIXES_T2+minRp 归 W1A（落 game-data.js）、INSIGHT_EVENTS 改落 cultivate.js 消费方同址、CONSIGN_TIERS_V2 改落 auction.js 与旧表同址（仓内先例：auction.js:254-260 CONSIGN_TIERS、sect.js TOURNEY_EVERY 均系统自有表，本会话实读确证），W2A/W2B 白名单**不**扩 game-data.js；③E523 引注错位——reincarnation.js 全文仅 595 行（`wc -l` 实测），闪回→遗物→相认管线实为 npc.js:1101-1108（实读确证），引注改 npc.js:1100-1130，npc.js 入 W2C 白名单并补串行清单；④E485 算术勘误——EXP_BASE[5] 降为 490000 后 r5→r6 相对比值=0.91×(570/490)≈**1.06**（变长非变短，原「0.79 仍加速」系误把 ×0.86 当除），仍在 [0.8,1.35] 带内；⑤E508 验收区间勘误——0 价 grade5 兜底改 GF×0.1 后坊市 1800 vs 速售 EV 2432，比值 0.74 ∉[0.9,1.1] 永红，验收反转为「速售 EV/坊市卖价 ∈[1.2,1.5]（溢价=佣金+等待成本）」；⑥scripts/field-audit.mjs 入 W2A 文件集（挂 E507，CONTRACT 内置清单 :47-49 实读确证须编辑）；⑦E488 改「tutorial.js/ui.js 内检测 LOCKS 翻转触发 toast（不动 guide.js）」，W1B 不越 W2A 文件（guide.js:10/:30 定义实读确证）；⑧E499 里程碑称号改由 flavor-v42.js 载入时 concat 扩 GameData.TITLES（与 E495 同法，W1C 自有；ui.js:334/:866 只读 TITLES 实读确证，game-data.js 归 W1A wave1 并行不可复动）。参考建议择收九条：E486⑤ 预留对象笔误 E494→E500、E495 attack 取池落点写明 Narrative.attack()（narrative.js:17 实证）、第二节映射表补 E483、E528 补 RB1 注入断言改自然命中、E529 补黑市基准全池削弱明示、E522/E524 引注更正（EXEMPT_PVE_CTX=battle.js:13/:241-242、bt-item→Battle.act('item')=battle.js:2662/game.js:971 实证）、E483 验收注明 stub 直设 B.combo 且 COMBO_MAX:5 不动（game-data.js:152 实证）、E520 称谓统一「大罗圆满→证道祖，t0~t3 晋层零变化」（XIAN_TIERS id1-4 与 isDaozu=xian.js:22 实读确证）、E506 验收改「最终全量 29 步」、E501 超带旋钮 cave.js 归 W2B 写为交接项。
> **编号勘误（如实记录）**：任务预期全仓最大 E 号为 E472，本会话 `grep -rhoE "E[0-9]{3}" js/` 实测最大 **E472**、但 v41 的门禁收尾三条 **E473~E475 已实际占用**（`tests/verify-v27.mjs` 头注释自证「本包（WP9 回归套件扩编 E473…）」、`docs/update-notes/UPDATE_NOTES_V41.md` 含 E473/E474 条目、v41 commit 明言 62 条 E414~E475）。为免撞号，**本版从 E476 起连续编号至 E529，共 54 条**。
> 前置基线（本会话实跑 `find js -name "*.js" | xargs wc -l` / `wc -l style.css index.html sw.js`）：js/ **26732 行 / 53 模块**、style.css **3508 行**、index.html 317 行、sw.js VERSION `fanren-wd-v16`、缓存号 `?v=57`；`package.json` test:all 实数 **28 步**（build + check-actions + verify-game + verify-v3~v27）；`scripts/run-e2e.mjs` 未跟踪未登记（git status 实测）。行数红线 = 26732 × 1.15 ≈ **30700**。
> 按 AGENTS.md 纪律：全部批次完成、`npm run test:all` 连续两轮全绿后才一次性 commit（post-commit 自动双推，中途绝不 commit）；绝不运行 `npm run release`（主流程终局执行）；绝不改动 `releases/` 旧目录。
> 实施前置动作：`git checkout -- scripts/run-e2e.mjs` 不可用（未跟踪文件），改为**实施开始前确认该文件由 E525 正式收编**，不删除不裸放。

---

## 〇、主题与目标

七路探查的结论收敛为四句话：**会坏的地方坏在"锁与死代码"**（战斗三处 busy 死锁、对拼意图永不产出致整套克制解不可达、新手引导读完即弃）；**不好玩的地方坏在"后期没有谜题只有数值墙"**（词缀全境同池、狂战零分支、战意钉满成常驻 buff、寄售速售单档最优、拍卖三档差价 ≤2%）；**走不快的地方坏在"中段最拖、终局真空"**（炼虚 242 日全程峰值、手动修炼是死按钮、智能挂机静默折损日常、仙阶 40 轮登大罗后无事可做）；**显得旧的地方坏在"三感欠费"**（六张高境图回落新手村配色、六道语料每类 2 句高频复读、BGM 是裸振荡器、机制说明只挂在触屏读不到的 title 上）。

v42 名为**鼎新**：取「革故鼎新」之意——**不另起炉灶，把 v41 铺开的每一件器物磨到锋利**。革故：软锁清零、死代码复活或删除、口径双标统一、说明书对齐实装；鼎新：战意从常驻 buff 变回需要管理的过山车、词缀与二阶段给后期精英重新出谜题、炼虚削峰、开辟小世界把「飞升→转世」闭合成真正的周目循环、秘境装上塔验证过的 roguelike 轮子。鼎新者，去其旧所以新其心。

八条总纲：
1. **锁**（软锁清零）：战斗三处 revive-aware 收尾单源、探索单发 go 补重入守卫、st-delete 箭头函数 this 陷阱修正——「只能刷新页面」级体验事故归零；
2. **弈**（博弈复活）：对拼解修活 + 胜负判定、战意沸点改造、词缀境界升档、狂战补分支、精英二阶段、敌方精准反制轴——「看意图定打法」从中期延伸到终局；
3. **衡**（数值纠偏）：炼虚削峰、敌方闪避帽 50%、必杀二式差异化、v19 说明书与实装逐条对齐——锚与实现一个声音；
4. **通**（经济收口）：0 价物出货口径统一、r7+ 循环 sink（问道石壁归 P5 洞府侧 / 小世界归 E520）、寄售五档重做、出价三档个性、纳财卦象化、price-audit 清零——钱有去处、档有取舍；
5. **枢**（节奏复权）：智能挂机逐日补跑、行功路线复活手动修炼、离线归乡包、挂机续跑、境内顿悟——挂机省心、手动有得、离线不亏；
6. **演**（沉浸升档）：六图配色补全、六道语料扩容 + 稀有句、BGM 意境引擎、打字机呼吸感、性情观察语、成就梯度——字、画、声三感从「有」到「优」；
7. **骨**（UI 换骨二期）：样式还债五区重组、引导改「跟我做」、机制说明触屏点亮、冲关仪式合一、修炼页随境界生长、本季将临表；
8. **账**（防臃肿）：全新系统 = 2（小世界、秘境遗物）、新页签 0、新货币 0、顶层新存档键 1（p.combat）、行数红线内（预估 ≈30300 / 30700）。

---

## 一、不做清单（防臃肿）

1. 不加新顶层页签；不加第八职业；不加新主线章；不加新货币；全新系统 **= 2**（E520 仙阶开辟小世界、E521 秘境秘藏遗物——后者复用塔祝福轮子，从严计入；E522 扫荡 / E523 情缘 / E524 锦囊均为既有系统深化）。
2. 顶层新存档键 **≤5，预算 1 个**：`p.combat = { pouch: [null,null,null] }`（战斗锦囊容器，E524）。其余全部落既有对象子字段：`p.xianjie.worlds`（E520）、`p.dungeon.relics`（E521，player-factory.js:58 实证 `dungeon: null` 顶层键已存在）、`p.flags.homecoming / p.flags.insight / p.flags.sweepDay`（E503/E505/E522）——`p.bag` 实证为物品 id→数量映射（player-factory.js:37），**严禁**把锦囊塞进 bag。
3. 不动：天劫三策×三段框架、E374 parity 乘区、E376 afterDef 分母 140×(1+rp/6)、E383 灵泉 15 系数与 r6 锚 9383、E391 EXP_BASE ×4.2 梯（r6~r9 段）、E397 地仙 17500、E414 对拼总承伤 0.9× 口径、E423 智能档框架与 settleReport 静默规格、E439 寄售骨架（只重做档位，不推翻）、OFFLINE_EFF 0.85/240、dailySettle 单源总线与离线逐日回放、E444 官市加价方向、声望阈值 30/60/80/90/120/150。
4. 经济四大基石不拆：买卖双侧乘数同源、addStones/addStonesRaw 双通道、GRADE_FALLBACK 单源、spendStones 先验总额。
5. 不做联网/云档；不重构渲染与存档框架；战斗 dealToEnemy/healMe/onEnemyHit/onPlayerHit 四漏斗账目单源不动——本版战斗改动只走意图产出、乘区参数与状态机收尾。
6. **裁撤记账**（探查 upgradeIdeas 中明确不做，留档防返工）：坊市今市标签（v41 E468 行情志已覆盖，实读 world.js:57-62 通商波幅已实装）、黄历签运当日化、心魔象日常侵蚀、道境合道终局、人物志关系图谱、生涯曲线时间线、问道录全屏卷轴层（E492 只做折叠）、字体 woff2 子集化（违反零依赖纪律，Google Fonts 外链保留）、黑市暗巷人情系统、季议→宗门工程链、丹符接单行、缩地符（Time.add 是全游戏日推进唯一收口，动它牵一发动全身，留专项）、人兽合击技树、心魔镜像周常（E448 v41 刚做镜像不叠加）、季冬 35 日日名重演（实读 time.js:60-65 确证存在，但年长常量牵动全时间线锚，如实记录**本版不修**）。
7. E521 遗物**不出秘境、不入背包、不可交易**（本局消散），防与背包经济互通破价格体系。
8. P3 语料**只增不改**：存量 DAO_FLAVOR 句不删不 rewrite，防温书考据 / 碑文评传 / 剧情引用断裂。

---

## 二、分路结论回填（七路 → E 映射）

| 探查路 | 高危/核心发现（severity=high 全收） | 回填 E |
|---|---|---|
| 战斗 | 战斗软锁三处 return（high）· 对拼死代码 enemyDecide 零 attack（high）· 战意通胀钉满 · 敌闪避 70% 无反制 · 词缀全境同池 · 狂战零分支 · 必杀二式弱 · 双符文案 · 连击纯被动 · v19 说明书失真 | E476/477/478/479/480/481/482/482/483/484 |
| 经济 | 0 价物出货 16.9 倍双标（high）· r7+ 循环 sink 断供（high）· 寄售五档单档最优 · 出价三档同质 · 纳财纯点击 Top1 · 洗髓丹卖 1 灵石 · 黑市窗口窄 · m_huolin 压线 · 还价文案失真 · 面额塌陷 | E508/520+509/509/510/511/508/512/518/512/518 |
| 节奏 | 炼虚 242 日全程峰值（high）· 手动修炼死按钮（high）· 智能挂机 30 日轮静默折损 · 离线倒挂 · 仙阶终局真空 · 悟道断粮 · 季冬重演（不修，记账）· 小层零机制 | E485/502/501/503/520/501/—/505 |
| 玩法 | 孽障伏击抽下一张图 · 大比败者零实发 · 赠礼满好感空转 · 收徒大会 ESC 发程仪 · 结拜成本漏改 · dan/poor 誓无试炼 · 夜袭死项 · 灯谜纯抽签 | E513/514/515/516/515/517/517/516 |
| UI | 备战单与冲关卡重复渲染 · 111 处 title 触屏不可达 · 引导 5 页说明书 · 教程毕灌全手册 · 修炼页不随境界 · z-index 11+ 档散落 · 已了结不折叠 · 字体外链（不修记账）· SW 内联 | E490/489/487/488/491/486/492/—/E526 |
| 沉浸 | 6 张高境图回落 village 配色（high）· 六道语料每类 2~3 句（high）· BGM 裸振荡器 · 打字机 180 字/秒 · observe 仅 2 句/道 · 成就奖励两形态 · crit 音无节流 · 挂机占建议区 · art 死行 · 头注释过时 | E494/495/496/497/498/499/497/501/494/499 |
| 缺陷 | _oldFriend 空头支票 · st-delete this 陷阱 · go 无守卫 · run-e2e 裸放 · 溢阶 3.8 三处复制 | E523/525/513/525/519 |

升级机会对应（high impact 全收）：对拼胜负判定→E477；战意沸点→E478；词缀共鸣（留池不实施）→E480 只做升档；精英二阶段→E481；连击势点→E483；问道石壁（洞府日用 sink）→并入 E509 批次说明（E520 小世界为旗舰大额 sink，洞府石壁因 P5 文件集容量裁至下版，**如实记录**）；寄售柜台→E509；行功路线→E502；逐日补跑→E501；神识分身（炼虚保守替代案）→裁，采 EXP_BASE 削峰；开辟小世界→E520；归乡包→E503；挂机续跑→E504；境内顿悟→E505；秘境遗物→E521；前世情缘→E523；扫荡→E522；锦囊→E524；引导任务化→E487；ui-tip→E489；冲关合一→E490；修炼页生长→E491；本季将临→E493；六图配色→E494；语料扩容→E495；BGM→E496；成就积分→E499；渲染增量→E506；SW 收编→E526。

---

## 三、W1A · 战斗与数值数据（E476~E485）【bugfix/balance · wave1 · 白名单强制】

**文件集（白名单强制）**：`js/battle/battle.js`、`js/data/game-data.js`、`scripts/balance-sim.mjs`、`docs/balance-v19.md`

### E476 · 战斗软锁清零：revive-aware 收尾单源 【bugfix · high】
- 实读确证：battle.js:1093（actBurst 尾）、:1151（act 内）、:1546（actSkill 族）三处均为 `if (p.hp <= 0) { await this.afterEnemyPhase(st); return; }`——魔棘反伤（assist→onEnemyHit 链）致死时，若元婴代死/玉灵护体/塔心不灭复活，afterEnemyPhase 返回 false 但行动函数无条件 return，`B.busy` 恒 true、全部行动钮禁用（battle.js:2687-2691 探查引注）、bt-auto 被 game.js:1024 `!B.busy` 挡死。**同文件 :1097-1099 已有正确范式** `if (await this.afterEnemyPhase(st)) return; B.busy = false;`（本会话实读）。
- 修法：抽 `async finishEnemyPhase(st)` 单源（= 上式正确范式），三处旧写法换调；复活后复位 busy 并继续回合。
- 验收：stub 构造「反伤致死→复活」场景 100 场 busy 复位率 100%；三处旧形态 `afterEnemyPhase(st); return;`（无 if 包裹）grep 零残留；verify-v28 源码断言 + RB 各一。

### E477 · 对拼修活 + 胜负判定 【bugfix/deepen · high】
- 实读确证：enemyDecide 全分支只产出 finisher/skill/charge/strike（battle.js:588-633 实读逐分支），永不产出 `kind:'attack'`——intentCounter 的 pin 解（:995）、对拼兑现 0.6×（:1155-1158）、敌回合 0.3× 余波、`_clashed` 清理全部不可达死代码；verify-v27 RB1 是手工注入意图才测过。敌人亮「⚔ 普攻」时玩家主动进攻反吃「读破」扣洞察（:1031 非 lenient）。
- 修法：①enemyDecide 的 strike 分支拆出普通平A：`heavy=false 且非蓄力链` 时落 `kind:'attack'`（intentCounter strike&&!heavy→attack 同义映射亦可，二选一实施，以「敌方读招面」扩大为准）；②对拼加胜负判定：双方各受 0.6× 后，比较本次玩家伤害与敌方伤害——高者 +1 洞察 +5 战意、落败方断连击（连势清零），战报一句「力压一筹 / 棋差一着」；③E414 的 0.9× 总承伤锚不动（0.6+0.3 结构保持）。
- 验收：8 场固定种子对拼承伤比 ∈[0.8,1.05]（E414 锚保持）；敌普攻意图下玩家选进攻必触发对拼（100%）而非读破；胜负判定双方结算各一次（stub 断言）；verify-v27 RB1 手工注入路径随新产出自然命中（断言改为不注入）。

### E478 · 战意沸点：从常驻 buff 回到过山车 【balance · 核心】
- 动机（探查引注）：出手 +12/会心 +18（battle.js:1211）、防御 +6、受击仅 −8（:2116），典型互殴每回合净漂移约 +9，长战中段钉满 100（×1.4 近常驻）；爆发耗 60 约 5 回合回满，每场两次 2.4× 无真实机会成本——v8 定位「攻防博弈资源」（battle.js:112）被通胀掏空。
- 修法：①战意 ≥100 进入**沸腾态**：保留 ×1.4 伤害，但每回合结算流失 15、受击额外 −15；②爆发改为**消耗全部战意、按余量放大**：60 战意 ≈2.4×、100（沸腾）≈3.2×（线性插值，系数进 game-data BALANCE.COMBAT 单源）；③会心 +18→+14、读中 +5→+4（微降收益端）；④凝神换气 20 战意=1 真元维持（战意稀缺后自然成为抉择）。
- 验收：30 回合长战战意均值 ∈[40,70]（node 蒙特卡洛，不再恒 100）；爆发 60/100 战意实伤比 ≈2.4/3.2（±0.1）；每场爆发期望次数 ≤1.5；balance-sim parity 三行仍落 [42,58]（若出带，调流失率重锚）。

### E479 · 敌方闪避帽 50% + 精准反制词缀 【balance】
- 动机（探查引注）：enemyStrike 闪避=3+(速差)×1.1+st.dodge(≤35)+buff+雾（battle.js:2050），低速敌可被堆到 50~70%，叠加减伤 85% 封顶后物理近免疫，敌方零命中机制；玩家侧失手却被钳 25（E377）。
- 修法：①敌方闪避总上限 70→**50%**（game-data BALANCE.COMBAT 单源常量）；②E480 高境词缀新增「精准」：命中 = 基础 + rp×0.8%（软成长），直接吃敌方闪避池；③game-data.js:237 说明书「闪避钳 35%」随 E484 一并对齐。
- 验收：同配闪避流 vs 低速精英（带精准）：敌命中率 ≥30%（引擎 stub）；无精准词缀时闪避 cap=50%（断言）；玩家闪避 25 钳不动。

### E480 · 精英词缀境界升档 e-tier 【deepen · 核心】
- 实读确证：ELITE_AFFIXES 12 条全境同池同值零 minRp（game-data.js:843-857 实读），r0 山贼头目与 r9 雷狱主宰掷同一池；70% 单条/30% 双条（battle.js:532 探查引注）。
- 修法：①每条词缀加 `minRp`（旧 12 条按强度分 0/3/5 三档）；②新增高境专属 4 条：**噬灵**（命中摄真元）、**镜甲**（反弹会心一击）、**影分**（首回合闪避翻倍）、**精准**（E479）——`ELITE_AFFIXES_T2` 表，minRp 6/7/8/8；③掷缀规则：r5+ 必双缀、r8+ 可三缀（30%）；④互斥对表（game-data「v20 精英词缀互斥对」既有结构）同步扩充（镜甲×不灭、影分×迅影）。
- 验收：r0 精英词缀数=1、r5+=2、r8+ 出现三缀样本（构造 200 次掷缀统计）；minRp 以下词缀零出现；互斥对零同现；balance-sim 承伤带 r5+/r8+ 行复核不破带宽。

### E481 · 狂战补分支 + 精英二阶段模板化 【deepen】
- 实读确证：`if (pref === 'berserk') return { kind: 'strike', heavy: … }`（battle.js:603 实读）——狂战完全跳过技能池/蓄力/治疗，五模板唯一只会平A；Boss `_phase2` 现只加攻 25%（battle.js:1840-1844 探查引注）。
- 修法：①狂战保留高 strike 权重但补两支：血量 <50% 时 25% 「受击反嗜」（nextHit 附吸血 20%）、灵力充足时 15% 「蓄力重击」（进 charge 链）；②`_phase2` 扩成**习性分化表**（game-data 单源）：狂战→蓄力连击（连续两轮 charge 概率翻倍）、铁壁→铁壁+汲血（防御轮回复 8% 最大血）、狡诈→每回合偷一增益、坚韧→首次濒死自愈解控；③精英 30% 几率携带二阶段（入场日志公示「其二段气机未明」）。
- 验收：狂战 stub 千回合产出含 charge/heal 类意图（非纯 strike）；四习性二阶段各触发一次且效果与表一致；精英二阶段触发率 30%±5（统计）；入场日志含公示行。

### E482 · 必杀二式差异化 + 双符文案 【balance/bugfix】
- 动机（探查引注）：剑修 us2（1.5×+破防 30%）期望明显弱于 us1（3.0×+会心 15%）（game-data.js:875-876），autoPilot 策略表只认 us1/ua2/ud1/up2/ub1（battle.js:1721-1728）——二三式长期无人问津；双符齐发 desc「1.8××2」排版错字（game-data.js:886）。
- 修法：①各系 us2 重做为**持续型**定位：剑修 us2 改「剑域：3 回合每回合 0.8× 穿防伤害、敌方不可遁走」（总期望 2.4×+战术价值）；其余系二三式按「控制/续航/爆发」各补一句差异化 desc 与数值微调（逐系数 game-data 单源）；②autoPilot 策略表为 us2 增补「敌残血遁走意图时优先」分支；③双符 desc 改「两段连击（0.9× ×2）」。
- 验收：us2 三回合总期望 ≥us1 单发 85%（node 复算）；autoPilot 遁走场景选 us2（stub）；grep「××」零残留。

### E483 · 连击势点 【deepen】
- 动机（探查 upgradeIdeas）：连击现是纯被动倍率；E381 受击 50% 保连击已立「攒势」骨架，缺主动兑现口。
- 修法：连击每存满 3 层凝一枚**势点**（B.comboPt，会话态不落盘），战斗面板显示 ● 数；主动花 1 势点：下一记法诀**必中 + 穿防 20%**（接 enemyStrike 减伤连乘段之前）。**COMBO_MAX:5 不动**（game-data.js:152 基础上限实读确证，上限单源 battle.js:337-341 含词缀/道脉加成）——零隐性平衡改动。
- 验收：连击 6 层=2 势点（**stub 直设 B.combo 构造**——基础 cap 5 下 6 层仅词缀/道脉加成可达，断言以构造直设为准）；花点后下一击无视闪避且减伤段吃穿防 20%；出秘境/战斗结束清零。

### E484 · 数值说明书重写（v19 口径对齐）【docs · 数据侧】
- 实读确证：game-data.js:237 说明书仍写「afterDef 分母 140」「闪避钳 35%」——E376 实装为 140×(1+rp/6)、E377 钳 25（本会话实读该段），两口径并存误导调参。
- 修法：game-data.js 头部数值说明段逐条与现行实装对表重写（CAP 2.4、闪避帽 50%、afterDef 分母式、爆发新式 E478、词缀 e-tier），每条注明对应 E 号；**作为 v42 调参的锚文档**，balance-sim 注释同步。
- 验收：说明书每条数值在 game-data/实装处 grep 得唯一来源（抽查 6 条）；verify-v28 源码断言说明书段含「E478/E479」标记。

### E485 · 炼虚削峰：EXP_BASE[5] 复锚 【balance · 核心】
- 实读确证：EXP_BASE[5]=570000（game-data.js:61 实读），r4→r5 仍 ×6.2 而 r5 起才切 ×4.2——探查折算 r5 纯修炼 242 日为全程峰值（r4→r5 跳变 1.35×、r5→r6 反而 0.91×），E391 削尾把墙挪到了中段。
- 修法：EXP_BASE[5] 570000→**490000**（r4→r5 纯天数比 1.35→≈1.17 对齐全曲线中位；**v2 算术勘误**：r5→r6 相对比值=0.91×(570/490)≈**1.06**——EXP_BASE[5] 下降使 r5 一程变短，r5→r6 相对变长，仍在 [0.8,1.35] 带内，非「0.79 仍加速」）；r0~r4 与 r6~r9 逐字节不动（E391 锚保护）；balance-sim 修为行与 docs/balance-v19.md 节奏表随动。
- 验收：node 复算相邻境纯天数比全曲线 ∈[0.8,1.35]（r4→r5 ≈1.17、r5→r6 ≈1.06 两点断言）；r5 节点 242→≈205 日（±8）；balance-sim 两连跑逐字节一致。

---

## 四、W1B · UI 与布局（E486~E493）【ui · wave1 · 白名单强制】

**文件集（白名单强制）**：`js/ui/ui.js`、`js/ui/tutorial.js`、`js/ui/quest.js`、`style.css`、`js/game.js`（**仅限 E487/E489 新动作键登记行，终审定案的白名单微例外——见十一节契约**）

### E486 · 样式还债：令牌收口五区重组 【ui · 地基】
- 动机（探查引注）：z-index 十余档硬编码散落 11+ 处（746/990/1262/1435-1438/1540/1668/1706/2135/2360/2650/3007/3335）；11.5~13.5px 字号遍布旧规则；860px 断点拆 20+ 处分散媒体查询。
- 修法：①z-index 收 `--z-nav/--z-drawer/--z-modal/--z-story/--z-fx` 五档变量，存量硬编码全迁；②字号全迁 --fs 阶；③全文件按「基础/布局/组件/弹层/移动端」五区重排注释分节；④860px 媒体查询合并为单一区块；⑤为 **E500**（季节渐变，W1C）预留 `.scene-anim-*` 关键帧段（合同见十一）。**纯重构零视觉变化**（逐屏截图比对不要求，以 verify 无横向溢出断言兜底）。
- 验收：grep `z-index:` 变量外零残留（!important 例外白名单 ≤3 处）；六主页签 8341 本地服无横向溢出（既有断言保持）；行数 ≤4200。

### E487 · 新手引导任务化：跟我做 【ux · 核心】
- 实读确证（探查引注）：tutorial.js:8-12 五步全是整栏 target（#panel-left 等），教程弹层 z-index 140 遮罩盖住高亮（style.css:1438），移动端高亮指向收起的抽屉；全程零真实操作。
- 修法：改 5 个真任务链：「点一次修炼」→「完成一次游历探索」→「打开乾坤袋装备一件兵器」→「看一眼问道页目标」→「领取首次悬赏」；每步 target 降到 `.btn` 级、完成动作（Game.actions 既有入口挂钩）即自动进下一步；可跳过；高亮用 E486 的 --z 层级置于遮罩之上。新动作 `tut-task-done` 的**键登记行随本条就近写入 js/game.js 的 Game.actions 表**（一行一动作，终审定案的白名单微例外，处理器函数落本包 tutorial.js）。
- 验收：新档引导 5 步全为动作完成驱动（stub 计次）；check-actions wave1 末零 NO-HANDLER（键已随批登记）；ESC/跳过链保持；移动端 860px 下高亮目标在视口内（puppeteer 断言）。

### E488 · 手册分节解锁 【ux】
- 实读确证（探查引注）：tutorial.js:57 finish() 立即弹全量玩法手册（7 折叠区约 40 条 tip），认知过载；手册入口藏菜单二级。
- 修法：教程毕只弹「三分钟上手」一节；其余六章改为**系统首次解锁时**弹 toast 附「玩法说明 · 新章节」一键直达该节（复用 helpModal 锚点）。**落点收口（v2）**：解锁判定为 tutorial.js/ui.js 内检测 `Guide.LOCKS` 翻转（guide.js:10/:30 定义与消费实读确证，**不动 guide.js**——该文件归 W2A，wave1 并行不可复动）；已提示状态记忆落 `p.flags.unlockedTips = {}`（flags 子字段，零新顶层，E507 迁移默认 `{}`）。
- 验收：新档完成引导后弹窗数=1；解锁宗门触发一次对应章节 toast（stub）；重复读档不重发（unlockedTips 防重）；手册全量入口仍在菜单可达。

### E489 · ui-tip：机制说明触屏点亮 【ux · 核心】
- 实读确证（探查引注）：ui.js 内 title= 共 111 处（:187/:158/:193-201/:806 等），丹毒/心魔/金兰/聚灵/演武 chips 与装备、阵眼说明全是 hover-only，触屏不可达；chips 是无 data-action 的纯 span。
- 修法：新增 `data-action="ui-tip"`（data-tip 存文本，点击复用 UI.popup 单例弹轻量说明浮层，桌面 hover title 保留；处理器 UI.tip 落本包 ui.js）；本条迁移**高频三类**：道行状态 chips / 装备行 / 阵眼（约 60 处），其余 title 随后续版本渐进（本版验收只点这三类）；**动作键登记行随本条就近写入 js/game.js 的 Game.actions 表**（同 E487 微例外）。
- 验收：触屏 UA 点击丹毒 chip 弹说明（puppeteer）；三类全量 data-action 覆盖（源码断言计数 ≥60）；check-actions wave1 末零漂移；桌面 hover 不回归。

### E490 · 冲关仪式卡合一 【ux】
- 实读确证：ui.js:519（冲关卡）与 :733（E469 备战单）同屏各渲染一份完全相同的 Cultivate.breakdown 拆解表（本会话实读两处 `.break-est` 同构）。
- 修法：两卡合一为「冲关」大卡（#break-card）：breakdown 拆解**只画一份**；备战清单（渡劫丹/护法/劫象感悟/残玉）作同卡清单列；「引动天劫」压轴放大居中；劫威预估与三策提示保留在卡头。
- 验收：圆满态页面源码中 break-est 仅出现 1 次（断言）；备战清单项直达按钮锚点有效；非圆满态不渲染。

### E491 · 修炼页随境界生长 【ux】
- 动机（探查引注）：ui.js:641-696 固定卡片顺序，高境界滚动 10+ 卡才见关键动作；861~1279px 区间 grid2 不生效（style.css:715 仅 ≥1280）；未解锁道途双脉/化身卡渲染空占位折叠卡。
- 修法：①渲染前按玩家阶段动态排序：未定道→叩问卡置顶；layer3 圆满→冲关大卡第二位；飞升后→仙阶卡置顶；②未解锁卡（双脉/化身/身份）不输出 DOM；③861px 起开 grid2（断点放宽）。
- 验收：三阶段（r0 未定道/r5 圆满/飞升）各截首屏两卡含当前最优先动作（断言渲染序）；861~1279 区间 grid2 生效（puppeteer 视口断言）；未解锁卡 DOM 计数=0。

### E492 · 问道录折叠 + 页签记忆 【ux】
- 实读确证：quest.js:872-877 `groupBlock` 四组全部平铺（本会话实读），「已了结（N）」组每张带完整结案文案无限拉长。
- 修法：已了结组套 `details.fold`（复用 Game.foldState 折叠记忆机制，同「今日修行」先例），默认收起只留摘要行；问道录五页签记忆当前页（p.ui 子键复用，不加新顶层）。
- 验收：已了结默认收起渲染 ≤1 行；展开可见全量；页签切换往返记忆（stub）。

### E493 · 本季将临表 【ux · 日程感聚合】
- 动机（探查 upgradeIdeas）：季度试炼/季议/大比/节庆/仙门季事全在跑，玩家只能靠日志事后知道。
- 修法：问道（黄历）页增「本季将临」卡（#season-queue）：未来 91 日内可预期事件表（誓约试炼、季议、大比 TOURNEY_EVERY 推算、节庆日、黑市开市窗口）+ 已错过的标红章；纯读算零新字段（各系统的日节拍常量已有）。
- 验收：构造已知 p.day 断言表内事件与日次推算一致（±0）；错过事件红章；黑市窗口行与 black.js isOpen 同源。

---

## 五、W1C · 沉浸与内容（E494~E500）【immersion · wave1 · 白名单强制】

**文件集（白名单强制）**：`js/core/art.js`、`js/core/ambience.js`、`js/core/narrative.js`、`js/core/achieve.js`、`js/ui/story.js`、`js/data/flavor-v42.js`（**新增**）、`scripts/modules.json`

### E494 · 六图配色补全 + 地标 + 死行清理 【immersion · high】
- 实读确证：Art.SCENES 恰 9 套（art.js:8-19 实读），scene() 回落 `|| this.SCENES.village`（:23）——MAPS 15 张图中宗门征讨/雷池旧地/灵墟仙泽/九霄雷狱/仙阙云海/仙阙深处 6 张高境图全部显示新手村暖黄田舍；art.js:96 三元两分支同为空串的死行（本会话实读）。
- 修法：补 6 套 SCENES（雷狱=紫电焦土、仙海=云涛玉阙、灵墟=玉光沼泽、征讨=旌旗辕门、雷池=焦雷裂地、深处=星垂道宫）+ landmark else-if 链扩展 6 枝；删除 :96 死行；季节薄色数组同步 6 图。
- 验收：15 图 scene() 全部命中专属配色（断言 SCENES 键覆盖 MAPS id 集）；grep 死行模板零残留；九霄雷狱卡无暖黄田舍色（色值断言）。

### E495 · 六道语料扩容 + 稀有句（新文件 flavor-v42.js）【immersion · high · 核心】
- 实读确证：DAO_FLAVOR 每道每类仅 2 条、attack 3 条（game-data.js:3765 起实读 sword 段），而历练见闻与战斗普攻是最高频文案，同句日复读十几次。
- 修法：新增 `js/data/flavor-v42.js`（build 拼接于 game-data.js 之后，`Object.assign` 深并入 GameData.DAO_FLAVOR——modules.json 登记紧随 game-data）：每道每类扩至 6~8 条；attack 按敌方种族分池（attack_ghost/attack_construct/attack_human 各 2~3 句）；每类 1~2 条 5% 概率「稀有句」（如剑修 trap 稀有句「你剑未出鞘，禁制竟自行退散——剑意之威，草木亦知」）；**只增不改**（不做清单第 8 条）。总投入约 300 句。**attack 取池落点（v2）**：`Narrative.attack()`（narrative.js:17 实证 `Utils.pick(f.attack)`，W1C 自有文件）改为读 Battle 会话敌 `species`（MONSTERS species 字段 game-data.js:454-457 实证）选池——battle.js:1217 是唯一消费点，**W1C 无需动 battle.js**（wave1 并行所有权在 W1A）。
- 验收：每道每类池长 ≥6（脚本统计）；稀有句触发率 5%±2（千次抽样）；Narrative.attack() 按 species 分池断言（构造 ghost/construct/human 三敌各取句）；flavor-v42.js 不含对既有句的覆写键（diff 断言）。

### E496 · BGM 意境引擎 【immersion】
- 实读确证：生成式古琴是裸振荡器随机五声音阶短音（ambience.js:315-334 实读 tone 直调），六情境只调密度/八度/音色三参。
- 修法：tone() 加 lowpass 滤波 + frequency.exponentialRamp 滑音（模拟古琴揉弦）；程序化 ConvolverNode 混响（脉冲用噪声衰减生成，零外部资源）；每情境写一段 4~8 音**动机句**循环变奏替代纯随机（六情境各成可辨识主题：secret 加低音 drone+水滴、market 加木鱼节奏、boss 加 noise 战鼓）。
- 验收：六情境动机句互异（参数表断言）；开/关音乐零控制台错误；AudioContext 挂起恢复链不回归（既有测试保持）。

### E497 · 音效节流 + 打字机呼吸感 【immersion/ux】
- 实读确证：story.js:421 `CH_PER_TICK = 3`（本会话实读）≈180 字/秒，逐字演出形同虚设；battle 多处 crit 音无节流，极速档同秒叠 5+ 振荡器（探查引注 battle.js:1210 等）。
- 修法：①Ambience.sfx 加 per-kind 最小间隔 90ms（同刻合流，签名不变，节流在 ambience 内部——不动 battle）；②CH_PER_TICK 3→1 并加标点停顿（逗号 80ms/句号 240ms），按 amb-tw 开关保持可跳过。
- 验收：极速档 1 秒内同 kind sfx 实发 ≤12 次（stub 计数）；40 字台词耗时 ≥6s（打字机开）；自动播放补偿时长与实耗匹配（±20%）。

### E498 · 性情观察语交叉取词 【immersion】
- 动机（探查引注）：24 位常驻修士初遇 observe 仅 2 句/道共 12 句（narrative.js:23-30），而性情有 22 种（art.js:146-156 TEMPER_LOOK）——性情只落在立绘不落在文字。
- 修法：narrative observe 加**性情公共池**（温婉/冷厉/豪迈/癫狂/阴鸷五类各 2~3 句），初遇观察语按「道池 × 性情池」交叉取词（孤傲者冷语、癫狂者醉话）；语料落 flavor-v42.js（P3 自有文件）。
- 验收：冷厉修士初遇句含冷厉池词（构造断言）；同 NPC 初遇只触发一次（既有 mem 去重保持）；池长断言五类 ≥2。

### E499 · 成就梯度：积分 + 隐藏成就 【deepen】
- 实读确证：achieve.js:3 头注释「v25 起共 56 项」过时（本会话实读，DEFS 实为 62）；奖励仅气运/灵石两形态（:8-9 rewardText 实读），灵石奖随境界缩水。
- 修法：①DEFS 加 `rare` 分（1~3），成就积分 = Σrare 存 Meta.codex（既有容器）；②埋 10 个隐藏成就 desc 显示「??？」（达成后显真容）；③积分里程碑 50/100/150 给限定称号 + 气运小赏——**落点（v2）**：三条 TITLES 条目由 flavor-v42.js 载入时 `concat` 扩充 `GameData.TITLES`（与 E495 同法，W1C 自有文件；ui.js:334/:866-875 只读 TITLES 实读确证，game-data.js 归 W1A、wave1 并行不可复动）；④头注释改「62 项（随版本追加）」。UI 环形进度**不做**（W1B 文件集已满，如实记录留后版）。
- 验收：积分=Σrare 精确（构造断言）；隐藏成就未达成 desc=「??？」；里程碑称号经 concat 后 TITLES 可检出且 cond 生效（stub）；一次性不重发；头注释 grep 无「56 项」。

### E500 · 季节渐变过渡 【immersion · 伸缩项，超支首裁】
- 修法：Art.scene 的 season 薄色由硬切改 CSS transition（scene-anim 类 + 过渡时长 600ms），换季/换图时山水色平滑过渡；纯 art 侧打类 + E486 预留关键帧，零资源。
- 验收：换季 scene 类切换含过渡类名（断言）；reduced-motion 降级为直切（既有机制保持）。

---

## 六、W2A · 节奏与挂机复权（E501~E507）【pacing · wave2 · 串行①】

**文件集**：`js/core/autocult.js`、`js/core/guide.js`、`js/systems/cultivate.js`、`js/game.js`、`js/core/player-factory.js`、`scripts/field-audit.mjs`（E507⑥ 白名单扩充）

### E501 · 智能挂机逐日补跑 【bugfix · 核心】
- 实读确证：autocult.js:166-170 `if (this._dailyDay !== Math.floor(p.day))`——**每轮只补跑一次** dailyAll（本会话实读）：30 日闭关轮内 10 日熟灵草收获时恒过熟 20 日折半（cave.js:548-571 探查引注）、求签/听讲/悬赏领赏/调息全降 1/30 频率、悟道再生断粮。
- 修法：抽 `AutoCult.runDailySilent(p)` 静默逐日行权单源；secludeLoop 按跨日**逐日**补跑（照抄 game.js:317-325 离线回放结构）；灵草过熟折半系数保留（收入抬高由 balance-sim 验收把关，见锚）；guide.js:69 挂机占位句移出建议区（修炼页仙途条已有同信息），3 个建议位全留内容型提醒。
- 验收：智能档模拟 30 游戏日 daily 动作 ≥28 次（stub 计次）；灵草零「恒过熟」（收获成熟度断言）；挂机 10 轮结算弹窗=0（E423 静默规格保持）；balance-sim 灵石行增幅 ≤8%（超带调 over 折半档）。

### E502 · 行功路线：复活手动修炼 【deepen · 核心】
- 实读确证：智能挂机闭关 1.6× 可叠聚灵 ≈2.4×，手动 normal() 1× 仅加 8% 灵机期望 ≈+3.1%（cultivate.js:201 normal 实读 + autocult.js:178 探查引注）——除开局外任何时刻点它都是严格劣化，主按钮成死按钮。
- 修法：normal() 加三选一「行功路线」（修炼页弹窗，复用劫象对策 UI 骨架）：**周天**（修为 ×1.2，挂机/离线固定走此路）、**存想**（感悟 +3~6 纯再生池，喂悟道经济）、**龟息**（丹毒 −15）；AutoCult/离线/一键行权不弹选默认周天。
- 验收：周天收益=旧 normal×1.2（node 复算）；存想感悟入 FIFO 双池且不触发悟道弹窗（silent 链）；挂机整夜零弹窗；手动三路线 stub 各结算一次正确。

### E503 · 离线归乡包 【deepen】
- 动机（探查引注）：离线 0.85×240 封顶敌不过在线 ≈75 游戏日/秒，离线沦为仪式（game.js:296 探查）。
- 修法：修为折算**维持不动**；另按离线真实时长分档（≥1h/4h/8h/24h）确定性发放「归乡包」（材料包 = stoneEco(r)×档位倍数 + 感悟 +2/5/8/12 + 一封 NPC 来信——来信用现成 mem/忠诚数据生成，≥4h 必发）；E464 云归见闻 30% 随机改**必发**；`p.flags.homecoming` 记档防重领。
- 验收：离线 8h 归乡包价值 ≈stoneEco(r)×20+感悟 8（锚）；同次离线不重复发放；auto 静默入日报零弹窗。

### E504 · 挂机续跑 【ux】
- 修法：圆满停机弹窗（autocult.js:214-230 探查引注）加「冲关后自动继续当前目标」勾选（会话态不落盘）；渡劫/仙劫结算完毕自动 resume 原 target；`p.ui` 无需新键（会话级）。
- 验收：勾选后渡劫成功自动续挂（stub）；不勾行为与现状一致；仙劫败北不误续（血线检查）。

### E505 · 境内顿悟节点 【deepen】
- 动机（探查引注）：LAYER_MULT 1/1.5/2/2.5 纯数值步进，进层只有回满血+日志（cultivate.js:30-45 实读），金丹前零机制增量——前期「拖沓感」实为内容真空。
- 修法：进层处（:39 leveled 置位后）挂三选一「境内顿悟」轻事件（**INSIGHT_EVENTS 表落 cultivate.js 消费方同址（v2，仓内先例：CONSIGN_TIERS 在 auction.js:254、TOURNEY_EVERY 在 sect.js 均系统自有表）**，本境有效小增益三档：凌厉=攻 +6%/圆融=防 +6%/凝神=修为 +6%），复用劫象对策 UI；挂机/离线自动取修为档；`p.flags.insight = {realm, pick}` 改境失效。
- 验收：进层弹三选一（手动）/自动取凝神（挂机）；增益仅本境内生效（改境失效断言）；练气~筑基 8 小层各触发一次。

### E506 · 渲染增量保守版（挂机热路径）【perf】
- 动机（探查引注）：afterAction 恒 markDirty('all')（game.js:623），挂机热路径每轮全区 innerHTML 重建。
- 修法：**保守版**：AutoCult.active 且无弹窗时，top/focus 区改 textContent 级补丁（数字/资源条），长列表不重建；其余场景全量渲染不变。失败回滚=还原 markDirty 单点。
- 验收：挂机 100 轮 #tab-content innerHTML 重建次数较基线下降 ≥80%（puppeteer 计数）；顶栏数字刷新实时性不回归（stub 断言值变化可见）；本批实施时链仍 28 步（**全量绿含 check-actions——动作键随批就近登记（终审定案），W2A 时点 wave1 两键已在，无挂起例外**），最终全量 29 步绿（E527 挂链后）。

### E507 · 存档契约扩容：迁移步 + 模板 + 白名单 【架构 · 核心】
- 修法：player-factory 迁移链 append **v42 新步**（链头「步序↔版本」注释表随迁）：①`p.combat = { pouch: [null,null,null] }` 建默认（E524 消费）；②`p.xianjie` 存在时补 `worlds: []`（E520）；③`p.dungeon` 为对象时补 `relics: []`（E521）；④`p.flags` 补 `homecoming: 0, insight: null, sweepDay: 0, unlockedTips: {}`（E503/E505/E522/E488）；⑤create() 模板同步全部新键（新档即带）；⑥field-audit 白名单扩充显式列名（combat/worlds/relics/homecoming/insight/sweepDay/unlockedTips）——**scripts/field-audit.mjs 已入本包文件集（v2，CONTRACT 内置清单 field-audit.mjs:47-49 实读确证须编辑，否则六键首跑即红）**；⑦`p.flags._oldFriend` 保留（E523 消费后 delete，见该条）。
- 验收：v41 旧档读档后四组容器键（p.combat / p.xianjie.worlds / p.dungeon.relics / p.flags 四子键+unlockedTips）就位且原值无损；create() 顶层键含 combat；field-audit 注入未知键证红→还原绿；迁移幂等（二次读档不变）。

---

## 七、W2B · 经济与玩法修缝（E508~E519）【balance/deepen · wave2 · 串行②】

**文件集**：`js/systems/auction.js`、`js/systems/shop.js`、`js/systems/bag.js`、`js/systems/black.js`、`js/systems/tower.js`、`js/systems/explore.js`、`js/systems/sect.js`、`js/systems/npc.js`、`js/systems/world.js`、`js/systems/festival.js`、`js/systems/oath.js`、`js/systems/cave.js`、`scripts/price-audit.mjs`、`docs/price-audit.md`

### E508 · 0 价物出货口径统一 【bugfix · high】
- 实读确证：auction.js:266-268 consignValue 对 0 价物按 GRADE_FALLBACK **全值**兜底（本会话实读），坊市卖价却按 GRADE_FALLBACK×0.1 再 ×0.45（shop.js:36-38 探查引注）——grade5 物两渠道差 16.9 倍，约 47 种 0 价物卖坊市亏 94%；pill_xisui price:0 且 type:'pill' 不在卖店兜底三类内，宗门 200 贡献兑出之物卖 1 灵石（game-data.js:273 探查引注）。
- 修法：①consignValue 0 价兜底改 `GRADE_FALLBACK×0.1`（与坊市同基数，寄售 EV 高于坊市的部分=佣金/等待成本，带宽可解释）；②shop sellPrice 兜底三类扩为 `artifact/gongfa/set/pill`（0 价丹同式折算）；③price-audit 0 价物路与「双标检测路」（新）随之判零。
- 验收：**0 价 grade5（GF[5]=40000 实读 game-data.js:770）：寄售速售 EV / 坊市卖价 ∈[1.2,1.5]**（=4000×0.608/1800≈1.35；**v2 区间反转勘误**——修法统一口径后坊市 1800、速售 EV 2432，原「坊市/寄售 ∈[0.9,1.1]」按 0.74 永红，反向比值 1.35 落带：溢价=佣金+60 日等待成本，带宽可解释）（新门禁路）；pill_xisui 卖店 ≥GRADE_FALLBACK×0.1×0.45；price-audit 问题清单对应项清零。

### E509 · 寄售五档重做 + 三格柜台 【deepen · 核心】
- 实读确证（探查引注）：速售档 EV=0.8×80%×0.95≈0.608 严格最优，其余四档 0.427→0.076 单调劣化，高价档纯陷阱（auction.js:253；price-audit.md:66 自证）。
- 修法：①五档重做（**CONSIGN_TIERS_V2 落 auction.js 与旧表同址（v2，auction.js:254-260 CONSIGN_TIERS 系统自有表实读确证，price-audit 寄售路/verify 现金 EV 锚同源消费，不动 game-data.js——W2B 白名单不含该文件）**）：高价档加**成交溢价**（成交额 ×1.3~1.5，模拟多人抬价，随档位递增）+ **流拍自动降一档续拍**（60 日不另收费）——高底价从纯降 EV 变「低概率高单价 + 免费续拍」的真权衡；②寄售格 1→3：第 2/3 格花灵石永久开启（格价挂 sinkCurve）；③E439 骨架（佣金 5%/流拍退 2%/滚茬透传）不动。
- 验收：五档现金 EV 极差 ≤0.15 且高价档 EV ≥0.50（含溢价、续拍期望折算，node 复算式入 verify）；速售不再严格最优（期望差 ≤5%）；三格开启存档往返无损；在途旧档 consign 按 tierV=1 旧档结算（迁移兼容断言）。

### E510 · 出价三档个性 【balance】
- 实读确证：BID_MODES steady 1.3/85、bold 0.9/60、dump 1.6/100（auction.js:31-36 本会话实读）——三档每成功件期望成本 1.53/1.50/1.60 差 ≤2%。
- 修法：激进档 rate 60→**45%**（每成功件 ≈2.0×base，与稳健 1.53× 拉开 30%+），补「激进落标必触发截胡公示」文案；price-audit 第十路 EV 注释式随动（现用 ×1.15 旧式，探查引注 docs/price-audit.md:121 口径漂移）。
- 验收：三档每成功件成本差 ≥15%（复算断言）；price-audit 第十路与 BID_MODES 单源对表一致；出价成功各档结算不回归。

### E511 · 塔灵纳财卦象化 【deepen】
- 实读确证：纳财 60×eco×2 次/日纯点击 + 层奖 300×eco/日（tower.js:65/:327 实读）是现金流 Top1，纯点击无取舍。
- 修法：纳财弹窗改**掷三卦任选**（灵石 / 玄铁矿×6 / 符材随机）+「贪卦」选项：灵石 ×2 但 25% 概率被塔灵扣押（当日纳财次数 −1）；强化石/器胚残片入符材池。零新货币。
- 验收：三卦期望表 node 复算入 verify（灵石卦 ≈60×eco、贪卦 EV ≈90×eco×0.75+…，具体以实施实算为准并留档）；扣押分支可触发（stub）；日限两次不变。

### E512 · 黑市窗口放宽 + 独家货文案 【ux/balance】
- 实读确证：isOpen `%30 < 3` 每月仅开 3 日（black.js:9 本会话实读）；还价弹窗固定「坊市价高六成」对独家货失真（:95 实读——醒神丹等坊市无售）。
- 修法：①开市 3→**5 日**（isOpen/daysLeft 同步）；②还价文案分支：独家货（shop 无同款）示「暗巷独有，别无分号」，在售货才示「坊市价高六成」（实算比价）。
- 验收：30 日周期开市 5 日（断言）；独家货 popup 无「高六成」字样（stub）；E387 独家货补料不再 27 日等窗（窗口覆盖率 1/6）。

### E513 · 孽障伏击同带缩放 + go 重入守卫 【bugfix】
- 实读确证：explore.js:217-219 伏击抽 `MAPS[min(idx+1, …)]` 精英、先手、不经 rpCap 钳制（本会话实读）——村口被高一档图精英伏击；`go(mapId)` 无 _going 守卫而 goMulti 有（:48-50 实读）。
- 修法：①伏击怪改按玩家 rp 同带缩放（buildMonster 同阶 ±1，吃 mercy）；②go 入口补同一 `Explore._going` 守卫（与 goMulti 单源）。
- 验收：r0 玩家（孽障 150）伏击敌 power ≈当前图 elite ±1（stub）；连续快速双击探索只触发一次（重入断言）；mercy 前二图豁免对伏击生效。

### E514 · 大比败者安慰彩头 【bugfix】
- 实读确证：sect.js:611-614 败北分支只打「彩头尽入囊中」零实发，胜局分支 :583-588 才发（本会话实读）——文案与实发不符。
- 修法：败北按 `T.wins×60×eco` 实发灵石 +1 天骄功勋，日志改「止步于此——已胜诸场的彩头折半入囊」。
- 验收：1 胜止步实得 60×eco+1 功勋（stub）；3 连胜魁首路径不回归；chron 行保持。

### E515 · 赠礼 heartGain 单源 + 结拜成本对齐 【bugfix】
- 实读确证：npc.js:915 gift 对 rel 直接 clamp（本会话实读）——结发道侣恒 100，满好感送礼花钱耗物收益恒 0、日志「交情 +0」；结拜（:762，100×eco）与化解仇怨（:817，80×eco）按 stoneEco 指数膨胀，v35 U1 结交/赠礼已改 socialEco 而此两处漏改（探查引注）。
- 修法：①gift 增量改走 heartGain 单源（溢出转心事点——E361 心事线既有通道）；②两处成本改 `this.socialEco(p, s)` 对齐 U1 口径。
- 验收：道侣满好感送礼得心事点 ≥1（stub）；高境 NPC 结拜成本=旧式/socialEco 比值断言（≈降 1~2 个数量级）；心事线触发不回归。

### E516 · 节庆 ESC 早退 + 灯谜可解析线索 【bugfix/deepen】
- 实读确证（探查引注）：world.js:449-452 收徒大会 ESC（ans=null）落 else 分支照发程仪 30×eco 且 Time.add(5) 已先扣；festival.js:110-113 上元灯谜 ESC 发 +2 感悟并吞全年节庆；谜底=年份哈希 %3（festival.js:91）纯 33% 抽签。
- 修法：①两处 popup 返回空值早退不发奖（节庆旗标已置的保持节庆状态但不给收益）；②灯谜谜面埋可解析线索：谜底与本季宗门倾向联动（trade 季谜底偏「商」、cult 季偏「修」），谜面文案给对应暗示，悟性 ≥60 额外显示一条线索行。
- 验收：ESC 后零收益零灵石（stub）；灯谜答对率悟性 80 档 ≥55%（线索有效，千次抽样）；倾向切换谜底分布随动。

### E517 · dan/poor 誓试炼补全 + 夜袭死项 【deepen/trim】
- 实读确证（探查引注）：oath.js:196-203 季度试炼只覆盖 kill/still/solo；cave.js:335 夜袭胜算公式 `(guardOn ? 8 : 0)` 恒 0（:325 已早退）死项。
- 修法：①补 dan 誓试炼：「重伤垂危之际唯有丹药可续」守/破抉择（守=抗过失血 buff、破=服丹破誓走 oathBanDay）；poor 誓试炼豁免（已有 poorCheck 清算，注释注明）；②删除 :335 死项并注释「驻守走挡袭不复入胜算」。
- 验收：五誓季度试炼覆盖 4/5（poor 显式豁免注释）；dan 守/破两支各走对通道（stub）；夜袭胜算值删除前后一致（回归断言）。

### E518 · price-audit 清零 + 钱包回兑 【gate/ux】
- 实读确证（探查引注）：m_huolin 黑市 11200 < 回收 3735×3 差 5 灵石压线报警（docs/price-audit.md:9，v20 挂至 v41）；bag.js:78-84 spendStonesMax 全打散到下品再扣、余钱只回兑中品（本会话实读）——大额支出后面额塌陷。
- 修法：①黑市价基准 1.6→**1.65**（m_huolin 一项达标即清零，全池微调与 price-audit 带宽复算同步）；②扣款后余钱向上回兑到最高可行面额（mid≥100→high）；③大额消费确认弹窗加「≈N 上品灵石」折合行（消费侧 bag/UI 既有确认链）。
- 验收：price-audit 问题清单=**0**（全绿首版，报告头注明）；50 万灵石支出后钱包含 high 面额（stub）；折合行数值=stonesTotal/10000（±1）。

### E519 · 溢阶定价单源 overflowMul 【trim】
- 实读确证：`Math.pow(3.8, clamp(...))` 三处内联复制（auction.js:78/:106/:148，本会话实读 grep 命中三处）。
- 修法：抽 `AuctionSys.overflowMul(p, gate)` 私有单源，三处同调；注释口径随迁。
- 验收：grep `Math.pow(3.8` 零残留；三调用点产出与旧式逐值一致（回归断言）；price-audit 第十二路保持绿。

---

## 八、W2C · 旗舰新玩法（E520~E524）【deepen · wave2 · 串行③ · 全新系统 2】

**文件集**：`js/systems/xian.js`、`js/systems/reincarnation.js`、`js/systems/npc.js`（E523 三幕，v2 补）、`js/systems/explore.js`（E522 扫荡，v2 补）、`js/systems/dungeon.js`、`js/battle/battle.js`、`js/ui/ui.js`、`js/game.js`、`js/data/game-data.js`（本批与 W2A/W2B 串行先后复动 game.js/battle.js/game-data.js/npc.js/explore.js，接缝以十一节契约为准）

### E520 · 开辟小世界·周目传承 【deepen · 全新系统① · 旗舰】
- 动机（探查引注）：仙阶晋层只耗仙元（xian.js:40-46），圆满溢流 ≈1.14 万/轮，全仙阶 45.45 万 ≈40 轮 ≈十几秒挂机登大罗——终局数值真空；readLegacy/writeLegacy 通道已备（xian.js:113-117 实读）。
- 修法：①大罗圆满后开「开辟小世界」：仙元+材料投入，程序生成小世界（**地貌/灵脉/生灵三轴**，WORLD_BIOMES 表落 game-data，轴组合决定产出偏向）；每 30 游戏日一「纪」，产出感悟/材料/仙元随等级成长，投入挂 sinkCurve；②**晋层门槛（v2 称谓精确化）**：大罗圆满**证道祖**（XIAN_TIERS id1-4=地仙/天仙/金仙/大罗，game-data.js:539-543 实读；道祖是境界态非表中档位，xian.js:22 `isDaozu = cur≥4 && layer≥3` 实读）需至少一座小世界达 3 纪——仙元降为加速货币，非仙元门槛接住终局节奏；**t0~t3 晋层本身零变化**；③小世界产出写入 `ReincarnationSys.legacy.subworlds`，下一周目开局继承「一方小天地」词条（转世继承通道既有）；④`p.xianjie.worlds` 存档（E507 迁移默认 []）。
- 验收：开辟→三纪→证道祖门槛判定 stub 全链通；产出价值 ≈2~4 日主动收入/纪（sinkCurve 复算入 verify）；周目继承词条在下一世开局日志出现（stub 两世）；不开辟者 t0~t3 晋层体验零变化（回归断言）。

### E521 · 秘境秘藏遗物 【deepen · 全新系统②】
- 动机（探查引注）：塔的祝福池（tower.js:11-39，20+ 条）是全游戏最好玩的循环，而秘境异变全是负面/中性，8 层跑图没有 build 感。
- 修法：每层 Boss/奇遇掉一枚「秘境遗种」**三选一**（复用 TowerSys.grant 乘区挂点与 popup 骨架），本局有效、出秘境即消（DUNGEON_RELICS 12~16 条，如「噬灵古镜：首回合敌攻 −15%」「地肺残息：陷阱伤害转修为」）；遗物乘区接 makeEnemy/敌我结算既有 mods 通道；`p.dungeon.relics` 存本局集（出秘境清空）；与 v41 斥候三问（scoutedMuts）零冲突（不同子系统）。
- 验收：8 层秘境稳定得 2~4 枚遗物（stub）；遗物效果乘区与描述一致（逐条断言抽 4 条）；出秘境 relics 清空；遗物不入背包不可交易（断言）。

### E522 · 同带扫荡×5 【deepen · 游玩速度】
- 动机（探查 upgradeIdeas）：后期重复探索等待归零，操作留给真博弈。
- 修法：同一图「一念定胜负」（≥2.8×）连胜 3 场后，该图探索页出「扫荡 ×5」按钮：按场次直结掉落/修为/日推进（逐日结算复用离线回放式），只播总结；`p.flags.sweepDay` 防跨日滥用（每日每图一次）；秒胜零等待豁免语义对齐（**battle.js:13 `EXEMPT_PVE_CTX` 单源名单与 ：241-242 消费点，v2 引注更正**）。**落点（v2）：explore.js 入 W2C 白名单**（结算引擎 go:49/goMulti:232 实证在 explore.js，探索页扫荡入口与直结必动该文件）。
- 验收：扫荡×5 与手动 5 场收益差 ≤±1%（复算）；不足 3 连胜不显示按钮；日限一次；扫荡不触发剧情/奇遇类一次性事件（防刷断言——奇遇类照旧需手动）。

### E523 · 前世情缘线 + 旧识相迎兑现 【deepen · 情感闭环】
- 实读确证：reincarnation.js:62-64 「名门之后」承诺「开局有旧识相迎」，实装只写 `p.flags._oldFriend` 零读取端（本会话实读 desc 与 apply）——空头支票；兵解只带 grudges（:471 探查引注）不带情缘。
- 修法：①execute 时把 rel≥70 的道侣/结拜/莫逆存 `legacy.bonds`（NPC id+关系）；新世该 NPC 带 pastBond 旗标，初逢触发「似曾相识」三幕——**复用 npc.js:1100-1130 闪回→遗物→相认既有管线（v2 引注更正：reincarnation.js 全文仅 595 行（`wc -l` 实测），该管线实为 npc.js:1101-1108「v19 前世闪回/第二幕遗物托付」，本会话实读确证；npc.js 入 W2C 白名单）**，相认后 rel 起步 +30 开独占对话池；②`_oldFriend` 消费兑现：开局叙事用该 NPC 拼一句「旧识相迎」开场白入日志，用后 delete 该键（field-audit 死键清场）。
- 验收：前世道侣新世初逢触发三幕（stub 两世链路）；rel +30 一次性不重发；`grep _oldFriend` 消费后零残留；无前世 bonds 的档零变化（回归）。

### E524 · 战斗锦囊三槽 【deepen · 操作提速】
- 动机（探查 upgradeIdeas）：高境丹符十余种藏在两层子菜单，战斗中点选繁琐。
- 修法：`p.combat.pouch` 三槽预设（丹/符各一+自由一格，乾坤袋内拖配/点击装配）；战斗主面板锦囊区一键祭出（**复用既有 `bt-item`→`Battle.act('item')` 结算通道（v2 引注更正：battle.js:2662 / game.js:971 实读确证）**）；autoPilot 决策链读锦囊优先级（残血优先丹槽——与既有自动服药语义合并，不双吃）；战斗结束不消耗槽位配置（消耗的是物品本体）。
- 验收：锦囊一键使用结算=手动同物同效（断言）；autoPilot 触发锦囊不与自动服药双吃（stub 计次）；空槽置灰；check-actions 登记 act-pouch-set/act-pouch-use。

---

## 九、W3 · 接缝整合与门禁收口（E525~E529）【gate/docs · wave3 · 单包】

**文件集**：`js/game.js`、`js/core/save.js`（如 E526 需 peekRaw 复用则零改动，实读 v41 已有）、`js/core/sw-reg.js`（**新增**）、`scripts/modules.json`、`index.html`、`sw.js`、`tests/verify-v28.mjs`（**新增**）、`tests/` 受影响旧套件、`package.json`、`README.md`、`docs/update-notes/UPDATE_NOTES_V42.md`

### E525 · 缺陷清场四件 【bugfix/trim】
- 实读确证：①game.js:789 `'st-delete'` 箭头函数内 `this._snapTimer`——actions 内箭头捕获顶层 this≠Game（index.html 经典脚本无 module），clearInterval 恒不执行（本会话实读；exitToStart 先清定时器遮蔽故无实害，属死守卫）；②scripts/run-e2e.mjs 未跟踪裸放（git status 实测），文件头自述「v42 起供 test:all 同款链使用」与现状漂移。
- 修法：①改 `Game._snapTimer` 对齐全 actions 写法；②run-e2e 正式登记 `package.json` script `"test:e2e": "node scripts/run-e2e.mjs"`（test:all 链保持不动——新运行器与既有链并行试用一版，不替换，如实记录）；③E513 已含 explore go 守卫、E523 已含 _oldFriend 清场（同文件同批，不重复列）。
- 验收：grep `_snapTimer` 写点全为 Game./self 形态；`npm run test:e2e` 可独立运行并输出 RUNE2E_SUMMARY；package.json 无未登记散落脚本。

### E526 · SW 注册收编 + 缓存升档 【refactor/release-prep】
- 实读确证：index.html:256-315 60 行 SW 注册+版本提示链内联（本会话实读）。
- 修法：收进 `js/core/sw-reg.js`（新模块，modules.json 登记于 ui 组之后；其逻辑本在 DOM ready 后执行，与拼接序兼容——实施时确认 Game 加载时机后置于链尾）；index.html 只留一行 `<script src>` 引入随 build 产物；缓存号 ?v=57→**?v=58**（style/game 两处）；sw.js VERSION `fanren-wd-v16`→**fanren-wd-v17**。
- 验收：SW 注册/更新提示/离线提示三链行为不回归（puppeteer start-screen 提示断言）；index.html 内联块删除后 grep `serviceWorker` 唯一命中 sw-reg.js；check-sync 绿。

### E527 · verify-v28 新套件 + 挂链 【gate · 核心】
- 新写 `tests/verify-v28.mjs`（**≥90 断言**）接入链尾（28→**29 步**），package.json 增 `test:v28`、test:all 追加。SA 源码形态必含：battle 三处 finishEnemyPhase 单源（旧形态零残留）/ enemyDecide attack 产出分支 / 战意沸点常数与爆发插值式 / 闪避帽 50 / ELITE_AFFIXES minRp 字段与 T2 表 / 狂战分支 / _phase2 习性表 / EXP_BASE[5]===490000 / 说明书段含 E478/E479 标记 / flavor-v42 登记 modules.json 且只增键 / story CH_PER_TICK===1 / ambience 90ms 节流 / art SCENES 覆盖 15 图 / achieve 头注释 / tutorial 任务链动作驱动 / ui-tip data-action 计数 / #break-card 唯一 / fold 已了结 / season-queue 挂点 / autocult runDailySilent 逐日 / meditate 三路线 / 归乡包分档表 / player-factory v42 步四组容器七键 / consignValue 0.1× 兜底 / auction.js CONSIGN_TIERS_V2 同址 / cultivate.js INSIGHT_EVENTS 同址 / BID bold rate 45 / 纳财三卦 / 黑市 %30<5 / overflowMul 单源（3.8 零残留）/ price-audit 清零断言 / xian worlds 表 / dungeon relics 清空 / sweep 门 / legacy.bonds 读写 / pouch 槽 / sw-reg 收编 / test:e2e 登记。
- RB 行为断言必含：软锁复活 100 场 busy 复位 / 对拼 8 场 [0.8,1.05] + 胜负判定 / 战意 30 回合均值带 / 爆发 60/100 两锚 / 词缀档位统计 / 狂战非纯 strike / 二阶段触发率 / 炼虚天数比带 / 逐日补跑计次 / 行功三路线 / 归乡 8h 锚 / 顿悟三选 / 寄售五档 EV 带 / 三档成本差 ≥15% / 纳财期望表 / 伏击同带 / 败者彩头 / heartGain 心事点 / 灯谜线索答对率 / 誓试炼 4/5 / price-audit 清零 / 小世界全链 + t3 门槛 + 周目继承 / 遗物乘区与清空 / 扫荡收益差 ≤±1% / 前世三幕 rel+30 / 锦囊不双吃 / 渲染增量计数下降 / v41 旧档迁移往返幂等。
- 证红证绿：门禁类断言全部先注坏样例实测命中→还原→终稿跑绿（记录留档）。

### E528 · 旧套件修订点名 【gate】
- 全量复跑受影响套件，grep 点名修订（行号实施时复核）：verify-v27（战意常数/爆发式/EXP_BASE[5]/consignValue/BID rate/黑市窗口/纳财——随 E478/485/508/510/511/512 语义；**含 RB1 对拼断言随 E477 由「手工注入 attack 意图」改为「enemyDecide 自然产出命中」**）、verify-v24（战斗断言随战意/对拼/词缀）、verify-v19 及含 EXP_BASE 570000 字面量者、verify-v16 节奏比（若含 r5 节点）、verify-v25/v26 sink 与经济锚（随 E508/509/510/518）、verify-v23（UI 若断言备战单/冲关卡双卡形态）、**不动**：verify-v20:55 EXP_BASE 梯（r6~r9 段）、E383/E441 灵泉锚、E376 分母、E397 地仙锚——确认仍绿。check-actions **汇总核对（终审定案：九新动作键已随批就近登记入 game.js，本条只对账不补键）**（ui-tip/pouch-set/pouch-use/sweep5/med-route/subworld-open/subworld-invest/relic-pick/tut-task-done）；README 动作数随 check-actions 输出。
- 验收：受影响套件全绿（点名清单留档）；RB1 自然命中断言绿（注入路径删除）；不动锚逐条确认；check-actions 零漂移。

### E529 · 文档与缓存收尾 【docs/release-prep】
- `docs/update-notes/UPDATE_NOTES_V42.md`（参照 V41 格式）：E476~E528 逐条 + **削弱/增益明示逐项列名**：战意沸点（爆发涨价、沸腾流失——削弱明示）、敌方闪避帽 50（闪避流削弱）、狂战/精英二阶段/精准词缀（敌变硬）、寄售 0 价兜底降为坊市同基（高位寄售收益降，明示）、激进档成功率 60→45（明示）、**黑市价基准 1.6→1.65（E518① 全池售价约 +3%，玩家侧买价削弱，v2 补明示——非仅 m_huolin 一项）**、EXP_BASE[5] −14%（炼虚提速，增益）、0 价丹卖店回升（增益）、道侣满好感赠礼得心事点（增益回归）、结拜/赔罪成本对齐 socialEco（大幅降价，增益）、败者彩头（增益）、归乡包（增益）、灯谜线索（增益）、黑市 5 日窗口（增益）、扫荡/锦囊/遗物/小世界（新玩法）；大罗圆满证道祖门槛（终局节奏改变，如实）。
- README 同步：版本行 v42「鼎新」、模块数 53→**55**（flavor-v42/sw-reg）、verify 26→**27 套**、test:all 28→**29 步**、玩法简介补：小世界/秘境遗物/扫荡/锦囊/归乡包/行功路线/本季将临/ui-tip；PLAN_V42 归档。
- 全量回归 `npm run test:all`（29 步）连续两轮 EXIT=0、0 控制台错误 → `npm run release -- v42`（主流程执行）→ 最后一次性 commit。

---

## 十、数值与门禁依据（balanceTargets）

| 项 | 硬锚 |
|---|---|
| E476 软锁 | 反伤致死→复活场景 100 场 busy 复位率 100%；三处旧形态 grep 零残留 |
| E477 对拼 | 8 场固定种子承伤比 ∈[0.8,1.05]（E414 锚保持）；普攻意图→对拼触发 100% |
| E478 战意 | 30 回合长战均值 ∈[40,70]；爆发 60 战意 ≈2.4× / 100 ≈3.2×（±0.1）；每场爆发期望 ≤1.5；parity 仍 [42,58] |
| E479 闪避 | 敌方闪避 cap=50%；带精准精英对闪避流命中率 ≥30% |
| E480 词缀 | r0=1 缀 / r5+=2 缀 / r8+ 三缀样本；minRp 以下零出现；互斥对零同现 |
| E485 炼虚 | EXP_BASE[5]=490000；r4→r5 天数比 ≈1.17（±0.05）、r5→r6 ≈1.06（±0.05，v2 勘误）；全曲线相邻比 ∈[0.8,1.35]；r5 节点 ≈205 日（±8） |
| E501 逐日 | 30 游戏日 daily ≥28 次；灵草零恒过熟；balance-sim 灵石行增幅 ≤8% |
| E502/505 | 周天=旧 normal×1.2；顿悟增益仅本境有效 |
| E503 归乡 | 8h 档 = stoneEco(r)×20 + 感悟 8；修为折算 0.85/240 不动 |
| E508 0 价 | **寄售速售 EV / 坊市卖价 ∈[1.2,1.5]**（0 价 grade5≈1.35，v2 反转勘误）；pill_xisui ≥GRADE_FALLBACK×0.1×0.45 |
| E509/510 | 五档 EV 极差 ≤0.15、高价档 ≥0.50；三档每成功件成本差 ≥15% |
| E518 audit | price-audit 问题清单=0（首版全绿）；steady esc / 行号源码断言保持 |
| E520 小世界 | 一纪产出 ≈2~4 日主动收入（sinkCurve）；大罗圆满证道祖需小世界 3 纪；t0~t3 晋层零变化 |
| E521/522 | 遗物 2~4 枚/局、出秘境清空；扫荡×5 与手动差 ≤±1% |
| E523 情缘 | pastBond rel+30 一次性；_oldFriend 消费后零残留 |
| 全局 | js ≤30700（基线 26732，预估 ≈30300）；style.css ≤4200（基线 3508，预估 ≈3700）；顶层新键 **1**（p.combat）；新货币 0；新页签 0；全新系统 2 |

---

## 十一、接口契约（跨包对接 · 三波不打架的关键）

**新状态键（含旧档迁移，E507 统一建默认）**：`p.combat = { pouch: [null,null,null] }`（**唯一新顶层**）；`p.xianjie.worlds = []`（子字段）；`p.dungeon.relics = []`（子字段，出秘境清空）；`p.flags.homecoming: 0 / insight: null / sweepDay: 0 / unlockedTips: {}`；`p.flags._oldFriend` 由 E523 消费后 delete。v41 旧档经 v42 迁移步补齐，create() 同步，field-audit 白名单显式列名七键（combat/worlds/relics/homecoming/insight/sweepDay/unlockedTips）。

**新数据表（v2 归属重写：表落消费方/所属包自有文件，W2A/W2B 白名单不扩 game-data.js）**：`GameData.ELITE_AFFIXES_T2`（4 条高境词缀+旧 12 条 minRp——**W1A 落 game-data.js**）；`Cultivate.INSIGHT_EVENTS`（顿悟三档，**W2A 落 cultivate.js 消费方同址**）；`AuctionSys.CONSIGN_TIERS_V2`（五档，**W2B 落 auction.js 与旧表同址**——仓内先例 auction.js:254-260 / sect.js TOURNEY_EVERY 均系统自有表）；`GameData.WORLD_BIOMES`（小世界三轴）、`GameData.DUNGEON_RELICS`（12~16 条）——**W2C 落 game-data.js**；`DAO_FLAVOR_V42` 扩充与三条 `TITLES` 里程碑称号条目——**W1C 经 flavor-v42.js 载入时 assign/concat 扩充**（game-data.js 本体不动）。消费方一律经宿主单源读取，**不得**在 systems 内复制表。

**新函数签名**：`Battle.finishEnemyPhase(st) → boolean`（W1A 建）；`Cultivate.meditate(p, route)`（W2A，route ∈ zhoutian/cunxiang/guixi）；`AutoCult.runDailySilent(p)`（W2A）；`Game.offlineHomecoming(p, realHours)`（W2A）；`XianSys.openSubworld(p, invest)` / `XianSys.subworldTick(p)`（W2C，后者挂 dailySettle 总线）；`DungeonSys.grantRelic(D)`（W2C）；`AuctionSys.overflowMul(p, gate)`（W2B）；`UI.tip(title, html)`（W1B，复用 popup 单例）；`Narrative.attack()` 按 species 选池改写（W1C 自有，narrative.js:17）；`Ambience.sfx(kind)` 签名不变（节流内部化）。

**新 UI 挂点（check-actions 双向对账）**：`ui-tip`（W1B）；`tut-task-done`（W1B）；`med-route`（W2A）；`pouch-set / pouch-use / sweep5 / subworld-open / subworld-invest / relic-pick`（W2C）。**登记规则（终审定案）**：动作处理器函数落所属包文件（UI.tip 落 ui.js、任务完成钩子落 tutorial.js 等）；**每个新动作的键登记行随所属 E 就近写入 js/game.js 的 Game.actions 表（一行一动作，白名单微例外——check-actions.mjs:2-7 双向求差拒通、:33-36 表键认 `'key':(` 形态，键不随批登记则该批末 test:all 第二步恒红）**；W3/E528 只做汇总核对不再补键。容器挂点：`#break-card`（E490，旧 #break-prep 并入删除）；`#season-queue`（E493，quest 黄历页）；`.scene-anim-*` 关键帧段（E486 在 style.css 预留，**E500** 在 art.js 打类——**跨包合同**：类名 scene-anim-on/scene-anim-season，过渡 600ms）。

**跨批依赖时序与交接项**：**js/game.js 的 Game.actions 表是全工程唯一 actions 表（check-actions 唯一对账宿主），显式列为跨波复动点（终审）——wave1 期 W1B 写入 ui-tip/tut-task-done 两行（微例外），W2A 写入 med-route，W2C 写入 pouch-set/pouch-use/sweep5/subworld-open/subworld-invest/relic-pick 六行，每批末 check-actions 恒绿**；W1A 的战斗状态机收尾/意图产出先落 → W2C 锦囊与遗物乘区消费；W2A 的迁移步先行建默认 → W2B/W2C 的键读写就位；W1B 的 --z 五档与 .scene-anim 段先落 → W1C/E500 消费；W2B 的 CONSIGN_TIERS_V2 → W3 price-audit 新路终稿；**E501 灵石收入超带的折半旋钮在 cave.js:549-551（harvest 过熟折半，W2B 文件）——调档属 W2A→W2B 交接项（v2），W2A 提出数值、W2B 落地复核**。**同波次文件互斥（白名单强制，Game.actions 键登记行为唯一微例外）；跨波次串行复动文件（game.js：W1B(键登记)→W2A→W2C；battle.js：W1A→W2C；game-data.js：W1A→W2C；ui.js：W1B→W2C；explore.js：W2B→W2C；npc.js：W2B→W2C）以本节契约为唯一接缝。**

---

## 十二、批次计划（wave）

- **wave1（三包并行，文件集两两不相交，白名单强制）**：W1A{battle.js, game-data.js, balance-sim.mjs, balance-v19.md} E476~485 ｜ W1B{ui/ui.js, ui/tutorial.js, ui/quest.js, style.css, **game.js(仅限 ui-tip/tut-task-done 两行动作键登记，终审微例外)**} E486~493 ｜ W1C{art.js, ambience.js, narrative.js, achieve.js, ui/story.js, **data/flavor-v42.js(新)**, modules.json} E494~500。
  - wave1 内协同：W1B E486 预留 .scene-anim 段（服务 E500）→ W1C E500 消费；W1C E495/E499 语料与称号条目经 flavor-v42.js 载入扩充（W1A 的 game-data.js 本体不动）；W1B E488 检测 Guide.LOCKS 翻转只读不写（guide.js 归 W2A）。
- **wave2（主实施者串行：W2A → W2B → W2C）**：W2A{autocult.js, guide.js, cultivate.js, game.js, player-factory.js, **scripts/field-audit.mjs**} E501~507 ｜ W2B{auction.js, shop.js, bag.js, black.js, tower.js, explore.js, sect.js, npc.js, world.js, festival.js, oath.js, cave.js, price-audit.mjs, price-audit.md} E508~519 ｜ W2C{xian.js, reincarnation.js, **npc.js**, **explore.js**, dungeon.js, battle.js, ui/ui.js, game.js, game-data.js} E520~524。
  - 串行复动文件：game.js（W1B 动作键登记→W2A→W2C）、battle.js（W1A→W2C）、game-data.js（W1A→W2C）、ui.js（W1B→W2C）、explore.js（W2B→W2C）、npc.js（W2B→W2C）——每包动前先读契约节，动后跑 check-sync；**新动作键登记行随所属 E 就近写入 game.js（终审定案），每批末 check-actions 恒绿**。
- **wave3（接缝整合，单包）**：W3 E525~529（文件集见九节）：缺陷清场 → SW 收编+缓存 → verify-v28 ≥90 断言挂链（28→29 步）→ 旧套件修订 → 文档缓存收尾 → 全量两轮 → （主流程）release → 一次性 commit。

---

## 十三、测试计划

- verify-v28 ≥90 断言在链（清单见 E527）；受影响旧套件全修订绿（点名见 E528）；不动锚逐条确认仍绿。
- 门禁自证：balance-sim（parity 硬带 / 炼虚比带 / 逐日收入增幅带）与 price-audit（0 价双标路 / 寄售 EV 带 / 三档成本差 / 问题清单=0）全部新路先证红→还原→跑绿；两审计两连跑逐字节一致；field-audit 六新键注入证红。
- 战斗复算（战意均值、爆发插值、对拼比、词缀档位统计、二阶段触发率）以 node 内联进 verify-v28；经济复算（五档 EV、三卦期望、扫荡收益差）同。
- 终局：`npm run test:all`（29 步）连续两轮 EXIT=0、0 控制台错误；`npm run test:e2e`（run-e2e 链）独立绿。

## 十四、验收清单（Definition of Done）

1. `node scripts/build.mjs` + `node scripts/check-actions.mjs` 绿；
2. `npm run test:all`（29 步）连续两轮全绿、0 控制台错误；
3. balance-sim / price-audit / field-audit 三门禁 EXIT=0，price-audit 问题清单=0，证红记录留档；
4. verify-v28 ≥90 断言在链；受影响旧套件全绿；
5. 防臃肿账：js ≤30700、style.css ≤4200、顶层新键 1、新货币 0、新页签 0、全新系统 2；
6. UPDATE_NOTES_V42（削弱/增益逐项列名）/ PLAN_V42 / README 四口径（模块 55/套件 27/29 步/玩法简介）/?v=58 / SW fanren-wd-v17 落档；release 由主流程执行；
7. 软锁/死代码/双标三类「公示与实现脱节」清零（E476/E477/E477/E484/E508 验收全过）；
8. 一次性 commit（post-commit 自动双推）。

## 十五、预算账与超支预案

| 维度 | 上限 | 预算占用 | 说明 |
|---|---|---|---|
| 全新系统 | ≤2 | **2** | E520 小世界、E521 秘境遗物（从严计入）；E522/523/524 为既有系统深化 |
| 新顶层页签 | ≤1 | **0** | 本季将临/锦囊/小世界全部为既有页签内卡片 |
| 新货币 | 0 | **0** | 小世界投入产出、纳财卦象、柜台格价全以灵石/仙元计 |
| 顶层新存档键 | ≤5（预算 2） | **1**（p.combat） | 其余全走 xianjie/dungeon/flags 子字段 |
| js/ 总行数 | ≤30700 | 基线 26732，预估 **≈30300**（+13.4%） | **超支预案依次裁**：E500 季节渐变 → E483 连击势点 → E495 语料减半（每道每类 4 条）→ E524 砍 autoPilot 接线 |
| style.css | ≤4200 | 基线 3508，预估 ≈3700 | E486 还债（合并断点/删硬编码）对冲新增；超 4000 冻结装饰性样式 |

---

## 十六、风险与回滚

1. **战意沸点牵动全部战斗断言**（verify-v24/v27 + balance-sim parity）：E478 落地先跑 balance-sim，parity 出带即调流失率而非削锚；旧套件修订点名在 E528 前置清单，逐条 grep 不靠记忆。
2. **渲染增量（E506）波及全 UI 刷新**：保守版只限「AutoCult.active 且无弹窗」的 top/focus textContent 补丁；任何异常回滚=还原 markDirty('all') 单点。
3. **寄售五档重做改 E439 现金 EV 锚（0.61/0.08）**：verify-v27 相关断言随 E509 修订并在 UPDATE_NOTES 明示；在途旧档 consign 以 tierV=1 按旧档结算（E509 迁移兼容），杜绝「改表杀在途单」。
4. **小世界（E520）超支/失衡**：结构最小版（三轴数值化+legacy 词条 3 条）先行，装饰文案可裁半；t3 门槛只挂道祖档，t0~t2 仙阶体验零变化（回归断言兜底）。
5. **语料 merge 键冲突**：flavor-v42.js 只增不改，build 后脚本比对键集（存量键零覆写）；P3 白名单与 P1/P2 文件零交集，冲突面为零。
6. **逐日补跑抬高挂机收入**（E501）：灵草/求签收入上升由 balance-sim 灵石行把关（增幅 ≤8% 带），超带调过熟折半档而非砍补跑——**折半旋钮在 cave.js:549-551（harvest，W2B 文件），调档属 W2A→W2B 交接项（v2），W2A 出数、W2B 落地复核**。
7. **软锁修复三处语义**（E476）：每处独立 RB 断言，单点可还原；finishEnemyPhase 为纯收口重构不动结算账目。
8. **verify 链 29 步时长**：预算增幅 <20%，`--only` 子集可跑；run-e2e 新链并行试用不替换 test:all（E525 如实记录）。
9. **文件复动接缝**（game.js/battle.js/game-data.js/ui.js 五文件跨波复动）：每包动前读契约节、动后 check-sync + check-actions；契约节是唯一接缝凭据。

---

*本计划由总策划会话定稿（v5 · 终审）：七路探查结论 100% 回填（high 6/6 全收，中危全收或明确归并/裁撤记账），历轮评审全部落实（v2 实改八条+参考九条、v3/v4 同文重放复检确认、v5 终审一条实改——check-actions 动作键就近落表定案，摘要见文件头，关键断言经多轮 sed/grep 实读核验）。v1 实读 30+ 处（battle.js:1093/:1151/:1546 与 ：1097 正确范式、enemyDecide 全分支零 attack、game-data.js:843-857/:61/:152/:539-543/:454-457、auction.js:78/:106/:148/:254-260/:266、autocult.js:166-170、cultivate.js:201/:30-45、art.js:8-19/:96、ui.js:519/:733/:334/:866-875、quest.js:872-877、npc.js:915/:1101-1108、sect.js:611-614、explore.js:48-50/:217-219/:232、game.js:789/:971、reincarnation.js:62-64（全文 595 行 `wc -l` 实测）、black.js:9/:95、tower.js:65/:83-96、bag.js:78-84、story.js:421、achieve.js:3、guide.js:10/:30、time.js:60-65、player-factory.js:37/:58、scripts/field-audit.mjs:47-49、battle.js:13/:337-341/:241-242/:2662、narrative.js:17、xian.js:22、cave.js:549-551、package.json 28 步、modules.json、sw.js v16）。v2 复核实读：reincarnation.js 行数、npc.js:1098-1108 闪回管线、auction.js:251-259 CONSIGN_TIERS、field-audit CONTRACT、guide.js REALM_TIPS/LOCKS、TITLES 只读点、COMBO_MAX、XIAN_TIERS/isDaozu、EXEMPT_PVE_CTX、bt-item 通道、cave 过熟折半、narrative attack、MONSTERS species。本会话实跑命令：`grep -rhoE "E[0-9]{3}"`（js 最大 E472、docs 含 E475——编号勘误见文件头）、`find js | xargs wc -l`（26732）、`wc -l style.css index.html sw.js`（3508/317/95）、`wc -l js/systems/reincarnation.js`（595）、`grep -n VERSION sw.js`（fanren-wd-v16）及上列 sed/grep。未运行 build / test:all / balance-sim / price-audit（build 重写产物、两审计覆写 docs 锚文档，均属实施批次动作）；未运行 npm run test:e2e（run-e2e 尚未登记，属 E525 实施项）。探查 upgradeIdeas 裁撤 14 项已记账于不做清单第 6 条；洞府问道石壁（日用 sink）因 W2B 文件集容量裁至下版，如实记录。*
