# V32「点睛」计划 —— 战斗可读化三阶 · 印记分账 · 装备经济纵深 · 工程地基三批

> 用户诉求（2026-09-16）：全方位检查游戏、优化游戏逻辑、修复 bug、对功能深度大升级、改善不合理与薄弱处，做一次全方位大升级；先出完整详细计划，**只做计划，不要执行**。
> 方法论：沿用 v30/v31 六路并行深审（战斗灵兽塔 / 装备炼器坊市 / 修炼轮回仙界 / 社交内容剧情 / UI 工程基建 / 洞府日常探索），全部指控在 v31 权威源码（master@2244093，js/ 模块源）上逐条复核；**十一枚 P0 已由主审二次实锤确认**（含两处 ReferenceError 级软锁、一处主线可被驯服卡死）。
> 版本代号「点睛」：本轮十一枚 P0 几乎全是「龙已画好、未点睛」的功能面——属性构成明细七个死按钮、聚灵加速零入口、清心丹空壳、六位新角色未注册名牌、四类世界大事公告张冠李戴、两枚成就因 `this` 指向永不解锁……本轮逐一「点睛复明」；头号升级则让战斗从体感变可算（意图数字预估/连携链可视化），亦是点睛之笔。
> 完整计划见 `docs/PLAN_V32.md`，执行落档将写入 `UPDATE_NOTES_V32.md`。

---

## 〇、审计基线与执行护栏

- 基线：master@2244093（v31 收尾，工作区干净）；`npm run test:all` 16 套件全绿（v31 验收口径）。
- 工程护栏沿用：改 `js/` 源码 → `node scripts/build.mjs`（自带 check-sync 分叉防呆）→ 快速回归 `node tests/verify-game.mjs`。
- 每批次完成即 build + verify-game 快速回归；全部完成后全量两轮 + judge 视觉验收 + `npm run release -- v32` + 一次性 commit（post-commit 自动双推，遵循 AGENTS.md：中途不 commit）。
- 目录纪律：新测试入 `tests/`、一次性脚本入 `scripts/`、文档入 `docs/`，根目录不新增散落文件。

## 一、审计总结（六路深审结论）

- **战斗灵兽塔**：v31 新增的塔规则祝福「蚀骨双煞」触发即 ReferenceError——`tickDots` 敌方分支引用了只在 `who==='me'` 块内声明的 `p/st`（battle.js:580），且必杀/本命路径无 try/catch 兜底，**战斗界面可 busy 永锁**（P0）。清心丹 `use.purge` 是死键（买来无效）；灵兽第三天生技嵌在 `if(up)` 内——先满十阶后亲昵才到 80 的存档**永久不可习得**；`setActive` 不清 `active2`，同一灵兽可占双槽白拿 ×1.5 被动。P2 一批：敌方 DOT 不入总伤统计、协战施控绕过控制递减、塔心不灭不救 DOT 致死、塔宝箱三处口径错位、`BALANCE.COMBAT` 十二键死配置等。
- **装备炼器坊市**：`Bag.drop()` 引用未定义变量 `p`——乾坤袋每件物品的丢弃按钮 **100% 抛未捕获异常**，且 removeItem 已执行、三行清理跳过：v31 E37「丢弃清留档」修复整体失效（P0）。坊市「买→立即卖」在成型存档实测 **+9.7%/循环正收益**（卖价吃丹道 ×1.4375，`addStones` 再叠道心/个人线/stonePct 获取链，买价只有折扣链——两侧不对称）；连祭炼失败祝福值双计（实测 80 vs 单祭炼 60）、祝福满百轮白烧强化石；仙缘套装两件是拍卖独占断头路。price-audit 实跑 0 告警（脚本只测单物品两侧同源，测不出跨链不对称——本轮顺带扩审计口径）。
- **修炼轮回仙界**：仙界四阶主链路自洽，但**飞升庆功弹窗里顺手点一次「兵解转世」，仙阶卡（v31 头号内容的唯一入口）当世永久隐藏**（ui.js:505 `&& !p.canReincarnate`，无反悔口）（P0）；**「来世预约」扣的是三位一体的印记本金——树层数回退、新世永久属性倒扣**（reincarnation.js:124 与 :193/:204 同源消费）（P0）。感悟溢出在 r9 固定 1 点=1600 仙元，事件型感悟（仙界访客/心魔降伏）使仙元日入翻倍以上；在线每行动 1 次 dailySettle vs 离线逐日回放——日更收益 30 倍剪刀差（挂机优于在线，放置激励倒挂）；AutoCult 飞升后即停，仙元无挂机路径。
- **社交内容剧情**：v30 六位新个人线 NPC（秦重楼/楚天阔/顾青书/花千树/石破天/洛神秋）**未注册 CHARACTERS——18 幕对话名牌直接显示原始引用串「@c_n8」，六人进不了人物志**（P0）；世界大事 12 类中 4 类（重宝/内乱/奇人/灵疫，权重合计 26%）公告文案落入「陨星坠落」else 分支、重宝现世战场地恒为黑风寨（P0）。15 面章末抉择旗标全库无任何消费（「抉择改写因果」承诺大面积空转）；悬赏板预览仍是旧连锁公式（预览 ×2.8 实发 ×3，v31 只修了实发半边）。
- **UI 工程基建**：**属性构成明细是七个死按钮**（只有 class 没有 `data-action`，委托只认 `[data-action]`——v20 的功能从未上线过）；**「聚灵加速」handler 与功能函数双双不可达**（全工程零渲染入口，与 v30 宗门死按钮同病灶）；**成就 e1/e2 因顶层箭头函数 `this=window` 永不解锁**（异常被 try/catch 静默吞掉）。SW 预缓存缺 game.js/style.css（首访离线壳破）、localStorage 禁用时静默降级内存档零提示、坐化弹窗 ESC 默认选了毁灭项、战斗日志超 120 条后 DOM 不随数组裁剪（v30 增量优化失效回退 O(回合²)）。动作路由总对账：169 个静态 data-action vs 172 键，除上述 3 处漂移外全对齐。
- **洞府日常探索**：**驯服结算绕过全部 ctx 分发——主线第一章剧情战（野猪）可被驯服直接卡死章节**（victoryTame 不调 story.onEnd/秘境 onVictory/宗门 onDangerWin，canTame 只排除了塔）（P0）；**秘境节点先清 choices 再开战**——战斗中刷新/除夕年兽抢 Battle.start，节点凭空消失只剩撤离（P0）。秘境全程不耗游戏日（探索 2 日/修炼 3 日，秘境九层连刷零耗时）；离线回放弟子历练逐日刷 30 条日志；节庆弹窗未 await 可顶替玩家正在看的弹窗。

---

## 二、A P0 十一连速修（全部主审实锤，合计约 1 天）

| # | 病灶（证据） | 处方 |
|---|---|---|
| A1 | **蚀骨双煞触发即 ReferenceError + busy 永锁**：`tickDots('enemy')` 分支引用 `st.maxHp/p.hp`（battle.js:580-581），而 `const p/st` 只声明在 `who==='me'` 块内（:546-547）——持该祝福的塔内战斗只要敌方带任意 DOT，敌方回合整体作废（被 act 的 try/catch 吞成「气机紊乱」）、DOT 永不衰减=敌方永久不动；必杀/本命路径（actUlt/actBenming）无 try/catch，`B.busy` 永不复位只能刷新 | `p/st` 提升至 tickDots 顶部两分支共用；actUlt/actBenming 补与 act() 同款 try/catch 兜底 |
| A2 | **驯服结算绕过 ctx 分发，第一章可被驯服卡死**：`victoryTame`（beast.js:77-93）只 `Battle.end()`，不调 story.onEnd/秘境 onVictory/宗门 onDangerWin/魔域奖励；`canTame`（battle.js:1862）只排除塔——剧情战 foe m_yezju（beast 种非精英）完全可驯：驯服后 `Story._battling` 永真、story-modal 已隐藏，**章节永久卡死**；秘境/生死状/魔域驯服同样吞结算 | 双保险：`victoryTame` 末尾按 `B.ctx` 分发（story/dungeon/sectDanger/weType 全量补齐）；`canTame` 增加 `!B.ctx.story && !B.ctx.dungeon && B.ctx.sectDanger==null && !B.ctx.weType`（剧情/节点妖魔非无主野兽，设定自洽） |
| A3 | **秘境节点「先清 choices 再开战」竞态**：`resolve` 于 `Battle.start` 之前 `D.choices=[]`（dungeon.js:108-113），而 `Battle.start` 遇 active 静默丢弃——战斗中刷新读档后本层节点凭空消失（进度与门票沉没）；除夕年兽（dailySettle 未 await 的 FestivalSys.check）可与秘境开战互斥，后到者被吞 | `D.choices=[]` 移到 start 成功之后（失败回滚 genChoices）；读档自愈：enterGame/loadFrom 发现 `choices 空且 !stuck` 重掷本层；节庆开战类检查延迟到 `!Battle.active` 再 fire（与 E61 队列化同根） |
| A4 | **Bag.drop() 引用未定义 `p`——丢弃按钮 100% 炸裂**：bag.js:310-312 用 `p.enhanced/affixKept/enhBless`，但 drop() 全函数无 `const p = Game.player`（同文件 salvage/dropCategory 均有）；removeItem（:307）先执行——物品已消失、三行清理全跳过、日志与自动存档全跳过，v31 E37 修复整体失效、被丢装备留档原样「复活」 | drop() 函数头补 `const p = Game.player;`；verify 锁「丢弃后重购不复活强化」 |
| A5 | **来世预约=倒扣传承树与永久属性**：预约 `legacy.marks -= cost`（reincarnation.js:124），而树层 `floor(marks/3)`（:204）、新世 `p2.reinc.marks = legacy.marks`（:193）、stat.js:101 每印记 +1% 全属性——三位一体同源：12 印记玩家预约 6 枚后树掉 2 层、新世属性 -6% | **印记分账根修**（见 D1）：`legacy.marksEarned`（累计获得，只增）决定树层与属性基数；`legacy.marks`（余额）只做消费端；预约只扣余额 |
| A6 | **飞升后误点「兵解」当世锁死仙阶入口**：仙阶卡渲染条件 `XianSys.unlocked(p) && !p.canReincarnate`（ui.js:505），而飞升弹窗选 'reinc' 即 `p.canReincarnate = true`（cultivate.js:407-410）且全库无复位口——v31 头号内容被庆功弹窗里的非主选项一键锁死 | 仙阶卡去掉 `&& !p.canReincarnate`（与兵解卡并存）；兵解卡补「收起此念」复位按钮 |
| A7 | **六位新角色未注册 CHARACTERS**：c_n 段只有 18 人（game-data.js:1179-1233），缺 c_n8/c_n16/c_n18/c_n19/c_n20/c_n21；而 v30 新增六线 35 处 `who:'@c_n8'` 引用（:2835 起）——对话名牌显示原始串「@c_n8」、立绘退化为「@」首字符、人物志（只遍历 CHARACTERS）永远缺六人 | 补六条 CHARACTERS 注册（照 c_n1 格式）；story.render 加兜底（`@c_nX` 查不到回落 NPCS 名单） |
| A8 | **四类世界大事公告张冠李戴**：权重表含 zhongbao/neiluan/qiren/lingyi（world.js:60，合计 32/124），if 链只写到 xianmen，四类全走 else「陨星坠落」（:91-92）——约 1/4 的天下大事自相矛盾；重宝现世用 `ev.mapId`（fireEvent 只在 demon/beastwave 写）恒兜底黑风寨（:169） | fireEvent 补四类专属 text（从 WORLD_EVENTS desc 改写）；zhongbao 随机写 ev.mapId |
| A9 | **属性构成明细七个死按钮**：`<b class="stat-detail" data-stat=…>` 只有 class 无 `data-action`（ui.js:182-188），全局委托只匹配 `[data-action]`（game.js:27）——`'stat-detail'` handler（game.js:440）永不可达，v20 功能从未上线 | 七个 `<b>` 补 `data-action="stat-detail"`；check-actions 静态校验防复发（G1） |
| A10 | **聚灵加速零入口**：`'act-spirit-rush'` handler（game.js:624）与 `CaveSys.spiritRush()`（cave.js:141，含成本确认弹窗）全工程零渲染入口；今日修行卡只给 `go:'cave:home'` 的「前往」，洞府主楼卡无点燃按钮——唯一点燃路径是 guide 一键行权的静默内联 | 洞府主楼卡（未点燃时）补 `<button data-action="act-spirit-rush">`；今日修行卡该行改行内按钮直达 |
| A11 | **成就 e1/e2 永不解锁**：`test: p => this.stonesTotal(p) >= 1000/100000`（achieve.js:42-43）——DEFS 是顶层对象字面量，箭头函数 `this`=window，调用必抛 TypeError，被 check() 的 try/catch 吞掉恒 false：「第一桶金/富甲一方」两枚成就连同气运奖励永久蒸发 | 改 `p => Achieve.stonesTotal(p)`（全表仅此两处该模式）；check() 的 catch 补 console.warn 留痕 |

## 三、B 真 bug 批修总表（P1/P2，按线分组，约六十条）

### B1 战斗·灵兽·天塔

| # | 修复 | 位置 |
|---|---|---|
| E1 | **清心丹实装**：`use.purge` 死键（game-data.js:217 定义、bag.js Pill.apply 无处理、StatusFx.purge 零调用）——500 灵石买的战斗解控丹是安慰剂 | Pill.apply 补 `if (effect.purge && Battle.active) Battle.active.myFx = StatusFx.purge(...)`；服用日志补实义 |
| E2 | **灵兽第三天生技永久不可习得（先满阶后亲昵的存档）**：补发判定嵌在 `if(up)` 内（beast.js:222），十阶后喂丹/派遣 up 恒 false | 「十阶且亲昵≥80 且技能<3」判定移出 if(up)，feed/claimTrip/抚摸到 80 时独立检查补发 |
| E3 | **setActive 不清 active2——单兽双槽**：同一灵兽可同时占出战+副战（被动 ×1.5 白赚+副战开局加成叠加） | setActive 补 `if (p.beasts.active2 === uid) p.beasts.active2 = null`（与 setActive2 对称） |
| E4 | 敌方 DOT 不入 `B.stats.out`——结算卡「共造成」小于构成之和 | tickDots 敌方分支补 `B.stats.out += dotDmg`（battle.js:587 前） |
| E5 | 驯服按钮无 busy 态 + 分发器无守卫，与在途回合竞态双流程操作同一 B.enemy | tameBtn 补 disabled；tame() 开头补 `if (B.busy) return` |
| E6 | 多波续波不重掷阵道开场压制（arraySetup/杀阵先手只作用首波，后两波敌攻防凭空回升三成） | 续波按同款概率重掷，或情报卡明示「阵困首波」 |
| E7 | 塔心不灭只在 enemyStrike 直伤结算触发（battle.js:1391），DOT/蚀骨反噬致死不救——与「每场首次致死伤害」描述不符 | undying 判定挪到 afterEnemyPhase 的 `p.hp<=0` 收口统一拦截 |
| E8 | 聚气归元只在普攻会心回真元（:680），必杀多段/合击会心不回 | 抽 `gainZyOnCrit()` 供各伤害入口调用 |
| E9 | 灵兽协战 stun/freeze 绕过控制递减（beast.js:160 直施不进 `e._ctrlN`）——高亲昵灵兽可链式永控，恰是 v31 控制递减要终结的玩法 | assist 施控也走递减计数 |
| E10 | 塔登塔低血被拒仍扣次数（used++ 在 hp 检查前） | hp 检查提到扣次之前 |
| E11 | 必杀文案口径（ut1「三成冻结」实为 25）与种族克制口径（只乘普攻，情报卡宣称 ±15% 不分来源） | 文案改 25%；情报卡限定「普攻克制」或克制入全伤害口径（执行时定一） |
| E12 | autoPilot 残血吃丹顺序最贵先吃（dahuan→guben→liaoshang）、治疗法诀恒取首个 | 改性价比序；healSkills 按回复量择优 |
| E13 | claimTrip 十阶满级兽仍提示「可喂内丹升阶」——永久误导 toast | 按 b.level===10 分档文案 |
| E14 | 死代码/死簿记清理：`StatusFx.decayKinds` 零调用、`e._mirror` 只增不读、enemyDecide 控制避让只查 stun 不查 freeze、续波新敌进场自带力竭（B.turn 跨波 vs _exhausted 挂敌——口径与「久战」文案不符） | 逐条清理/补齐；力竭改按本波回合数或文案标注 |
| E15 | 战斗日志数组 >120 shift 但 DOM 只 append 不删首子（battle.js:163-174）——第 121 条起搬回条件恒不相等，v30 增量优化失效回退整段重建 | shift 时同步 removeChild 首子；搬回比较改「上次搬回后新增条数」 |

### B2 装备·炼器·坊市

| # | 修复 | 位置 |
|---|---|---|
| E16 | **坊市买→卖套利**（成型档实测 +9.7%/循环零耗时无限次）：卖价吃丹道 ×1.4375（shop.js:31-37），`addStones` 再叠道心/个人线/stonePct 获取链（bag.js:26-33）≈0.856×base，买价仅折扣链 ≈0.78×base | 坊市出售走 `addStonesRaw`（与 v27 拍卖退款同口径）；「灵石获取加成」语义收窄为战斗/事件掉落并在来源明细标注；卖价基数 0.4→0.45 微补偿玩家感知 |
| E17 | 连祭炼失败祝福值双计（forge.js:140 加 20+40 与 :154 再加 20——实测 80 vs 单祭炼 60） | 失败分支只留一处加成（统一 60/40 档与单祭炼对齐） |
| E18 | 连祭炼祝福满百轮白烧强化石（useGuard 判定不查 `bless>=100`，:129-131 先扣石） | useGuard 加 `&& bless < 100` |
| E19 | 炼器坊按钮门槛无视器胚残片折半（ui 按全量 disable，forge 实按折半）；面板成器率不含炼器室 +4%/阶 | ui 门槛与费率显示与 forge 同源 |
| E20 | 神秘古匣 EV 两处失真（ecoPrice 符箓记 base 不记时价、0 价仙功法按 500 记）+ 中奖当日可连环开匣——r6 稳健档净期望约 +17% 的温和灵石龙头 | EV 估值按当前时价；开匣日限一枚（与塔雷晶核同款） |
| E21 | 熔铸回收面板不显示「器魂×N/件」（弹窗有面板无）——玩家无法比价分解收益 | 面板行补器魂产出 |
| E22 | 分解文案「祭炼心得、词缀将一并化去」对在穿实例过强（同 id 在穿时实例完好保留） | 文案区分「同 id 留档」与「在穿实例」 |
| E23 | 脏档防崩：bag 内残留已下架 id 时 `GameData.ITEMS[id].type` 直接解引用（ui.js:1700、bag.js:319）——乾坤袋整页崩/分类丢弃崩 | 判空跳过+读档清洗残留 id |
| E24 | `BALANCE.COMBAT/ENHANCE` 两块死配置（battle.js/forge.js 全硬编码同值）——「数值常量集中配置」名存实亡 | 接线读表（MAX_LV 等双源并一），verify 锁两处同值 |
| E25 | balance-sim 聚灵列封顶 min(4,r) 显示恒价，游戏实为全幅 3.8^r——报表低估高境 sink | 报表口径对齐 cave.js |

### B3 修炼·轮回·仙界

| # | 修复 | 位置 |
|---|---|---|
| E26 | **感悟溢出 r9 固定 1 点=1600 仙元**（cultivate.js:68 `×80×eco(9)` 除 :48 `eco(9)×0.05` 恰好约净）——访客论道 +6 ≈9600 仙元（纯修炼约 490/日），心魔降伏 +10 更甚且可服毒丹反噬刷 | r≥9 溢出改仙元定值（如 spill×50）；访客/心魔感悟量与溢出速率经 balance-sim 校准后定稿 |
| E27 | **在线/离线日更 30 倍剪刀差**：afterAction 每行动 1 次 dailySettle（game.js:326），离线逐日回放（:255-258）——挂机关页远优于在线闭关 | afterAction 按 `floor(day)` 增量补结（上限 30），与离线同口径 |
| E28 | xian.def(p) idx=0 返回地仙定义——advanceLayer 的 `if(!d) enterFirst()` 是死分支（未来直调将以 5000 仙元换无籍 layer++） | def 对 idx=0 返回 null；advance 入口校验 unlocked |
| E29 | 大罗圆满仍提示「引动仙劫方可晋入下一阶」——无下一阶 | 按层态分流文案（与证道按钮一致） |
| E30 | 仙劫在 Tribulation.state 已占用时静默 return（确认弹窗后无反馈） | 补 toast「天劫未息」 |
| E31 | 仙劫成功分支缺 `tribFullHp` 无伤成就判定与 `UI.realmShow` 全屏异象（opts.xian 未复用全部副作用） | 补齐两项 |
| E32 | TREE_NAMES 与 TREE_EFFECTS 双源命名（E22 单源化不彻底） | 并一（EFFECTS 附 name 即唯一源） |
| E33 | 轮回镜「印记来路」文案失真：个人线实为每条 +1（15 条）、图鉴每类 +1（5 类）、漏列道祖 +1 | 文案对齐实发 |
| E34 | 当世 grantMarks 只写 legacy 不回写 `p.reinc.marks`——当世属性与 s5/v10 成就不更新，镜像却宣称「全属性永久 +X%」 | grantMarks 同步回写当世镜像（分账后按 earned 口径） |
| E35 | stat.breakdown 明细漏列：仙阶 ×1.5%/层、洞天四重 +3%、心魔未按 +20% 封顶折算、codexBonus、洞府行漏洞天——各属性加总 ≠ final（stat.js:189-191） | 明细补全五行，verify 锁加总=final（与 A9 复活的明细弹窗配套） |
| E36 | migrate 残口：counters（含 xianyuan）/lifeCut/lifeGain 无 NaN 清洗；`xianjie.idx>0` 但 `flags.ascended=false` 时 layersTotal 照加属性 | 数值清洗函数统一过一遍；仙阶属性加成加 unlocked 校验 |
| E37 | secludeLoop 真仙圆满无「无可再进」退出（顶满 120 轮 ≈280 万仙元=全线需求 7 倍）+ 弹窗「圆满自会冲关」误导 | 圆满后闭关给仙元日获上限护栏+文案改「满溢炼仙元」 |
| E38 | gongfa 参悟用原始 comp 而非 compOf 有效悟性，口径不一 | 统一 compOf |

### B4 社交·内容·世界

| # | 修复 | 位置 |
|---|---|---|
| E39 | 悬赏板预览旧公式 `1+chain*0.6`（ui.js:1329）vs 实发 CHAIN_MUL [1.6,2.2,3]——预览 ×2.8 实发 ×3；长老令 ×1.5 不入预览 | 预览走表+宗门加成入预览 |
| E40 | 15 面章末抉择旗标全库无消费（k1_promise/k5_past_accept/k7_route/k9_final 等）——「抉择改写因果」承诺空转 | F1 回收网络接 5 面以上；其余死旗标清理或标注（防再误写） |
| E41 | 宗门大战击杀 NPC 零后果（mode==='war' 只 +200 贡献；world.js 随机挑活 NPC 当敌，胜后 rel/grudge/alive 全不变）——「NPC 牵连」打完即忘 | 击杀写 alive=false/grudge/记忆，NPC 死亡网络（E46）联动 |
| E42 | 悬赏刷新周期文案：实为 3 日一刷，头注「每日刷新」与空槽「明日将有」不符 | 三处文案统一「三日」 |
| E43 | DaoSys.canLearnGongfa 死分支（未择道者先命中「道途不合」，友好提示永不可达） | 分支序修正 |
| E44 | NpcSys.discuss 死判定（`tier.id==='cold'||'foe'` 恒假——入参恒 ≥0 档；结怨者仍可论道） | 按 rel<0 判敌意档 |
| E45 | 道侣/结拜 NPC 死亡无叙事收尾：p.partner 永挂、江湖页仍显「道侣」、共修静默失效 | 丧偶旗标+江湖页口径+一次性悼亡事件（轻文案） |
| E46 | 个人线终章 rel≥90（sworn 档赠礼每次仅 +1）——24 线全通需数百次赠礼，节奏落差 | sworn 档赠礼 +1→+2 或论道亦可推进终章条件（执行时择一） |

### B5 UI·工程·存档

| # | 修复 | 位置 |
|---|---|---|
| E47 | SW 预缓存 CORE 缺 `./game.js?v=N`、`./style.css?v=N`——首访离线打开 HTML 404 白屏 | CORE 增补两项，release 脚本同步 bump（E58 单源） |
| E48 | localStorage 被禁时静默降级内存档，关页全失零提示 | 开始界面置顶红条「浏览器存储不可用，进度不会保存」+storageKb 标注 |
| E49 | 坐化弹窗 ESC/点遮罩=默认选了「就此终了」（毁灭项）——寿满 +1 印记的转世机缘一次误触即没 | dismiss 回落主选项（转世）或二次确认 |
| E50 | 成就发奖后乾坤袋家资行陈旧（只 markDirty top/status） | 补 markDirty('bag') |
| E51 | 开始界面 auto 档仍渲染删除钮（v31 只删了存档弹窗里的） | 同步隐藏或改「清空进度」二次确认 |
| E52 | 导入还原丢 marksGiven——文本码跨设备迁移后印记类奖励可重刷 | importTo 透传 `marksGiven` |
| E53 | QWERTASD 切页快捷键未被弹层门控（dao/tribulation/tutorial 开着照样遮罩下切页） | 与 ESC 链共享「有 modal 未 hidden 则不切」 |
| E54 | act-more-close 死代码 + more-sheet 无显式关闭钮 | sheet 标题行补 ✕（用上现成 handler） |
| E55 | 按钮级 _busy 防重入随重渲染失效——连探两轮可交错执行 | 连探/连炼类长任务加模块级 in-flight 标志 |
| E56 | 背包分类缺「种子」档（type='seed' 只能去全部翻找） | 补 `{id:'seed',name:'种子'}` |
| E57 | 跨槽位离线基准恒取 auto.ts——切档瞬间手动档几乎拿不到离线收益 | 手动档回退读 `Save.read(slot).meta.ts` |
| E58 | 版本号三处双轨（?v=47 / SW v6 / manifest 描述「九章」实为十章）——发布只 bump 其一即半新半旧 | release.mjs 统一注入三处 |

### B6 洞府·日常·探索

| # | 修复 | 位置 |
|---|---|---|
| E59 | **秘境全程不耗游戏日**（dungeon.js 零 Time.add；探索 2 日/修炼 3 日）——九层连刷一日内无限重复且不推进日结算/寿元/日限，宝箱节点灵石无日限 | 每节点 `Time.add(1)`（或通关按层数计日）；先 balance-sim 模拟日均收益变化再定稿 |
| E60 | 离线回放弟子历练逐日刷 30 条日志（sect.js:296 无 auto 分支；对照 cave/xian 已静默）；洞府访客/仙界访客子模块日志同样不受控 | auto 模式聚合成一条「离线日报」（与 G3 日结总线联动） |
| E61 | FestivalSys.check 未 await（game.js:272）——弹窗单例强制顶替（把玩家正在看的弹窗自动按取消结算）+ 年兽开战与秘境互斥（A3 同根） | 节庆开战/弹窗类事件队列入列，`Battle.active/UI._popupResolve` 空时再 fire |
| E62 | visitorEvent 非结尾再入 Game.afterAction——收尾链双跑（幂等无害但递归隐患+白耗） | 回环拆解（dailySettle 内直接结算不回环） |
| E63 | 斗兽彩头文案 1.8 倍 vs 实发 1.6 倍 | 文案对齐 |
| E64 | 虫害/过熟收获 qty=0 仍 harvests+1 并播「收获 ×0」 | 0 收成不计数、文案改「颗粒无收」 |
| E65 | 探索事件收益挂玩家境界而非地图（真仙扫新手村零风险满额宝箱/机缘 ≈3M 灵石/箱）——与「愈深愈险愈丰」梯度相悖 | 事件经济改 `max(map.recRealm, p.realmIdx-2)` 类口径 |
| E66 | Codex.checkRewards 多类同跳只播最后一类；Utils.pick([]) 返回 undefined 防御缺口；scout 空提示边角 | 逐类齐播；pick 空数组返回 null；边角修补 |

## 四、C 战斗纵深三阶「知彼」（版本主题·头号升级）

战斗系统数值深度已足（v30 连招/AI 2.0、v31 控制递减/规则祝福），缺的是**可读性与取舍面**——玩家看不见构筑，读不懂博弈。本轮把「体感」变「可算」：

1. **意图数字预估**：意图栏附 dry-run 伤害区间（调 enemyStrike 公式算 90%~110% 区间，如「重击 ≈180~220」）；敌方蓄力时普攻按钮实时显示「破招 XX%」——防御还是抢破招从体感变成可计算决策。纯函数+两处 render，不动判定。
2. **连携链可视化**：战斗面板加「势」指示条——当前势 tag 与层数（如「雷·势涨2」）、技能盘下一张高亮（deckCursor）、法诀按钮按 tag 着色、势尽可用时普攻按钮浮「+15%」角标。v30 连招构筑从暗知识变玩法。
3. **对招组合表（v31 留档项 D1 落地）**：盘内特定二连（起手+终结位）触发专属追击「连珠」+12%；同盘 3 连以上锁链递增 +4%/连（上限 +12%）。先出组合表设计稿（与 deckCursor 时序解耦）评审后落地，连招状态在战斗头部显示当前「势」。
4. **灵兽协战策略**：兽栏加三选策略并持久化（`b.tactic: focus/control/guard`）——集火残血（斩杀线内追击率 +30%）/控场（优先施控、吃 E9 递减）/护主（低血时技能位让给 guard/heal）。让 v31 第三天生技真正成为「一路打法」。
5. **敌方自状态管理**：tough/iron 型回合初 20~35% 概率「运功逼毒」（清自身最早一个 DOT/一条减益、耗该回合技能位）；cunning 优先偷玩家增益转己用——长战不再单边倒计时。
6. **天塔风险自选**：过关后偶发「跳层赌约」（弃本层奖励直上 2 层、守影攻 +25%）与奇遇池「血祭塔灵」（扣 30% 现血换一道罕见祝福）；run 记 risk 计数，出塔按 risk 给塔绩加成（+5%/次）——roguelike 从「只拿祝福」变「每层贪稳抉择」。
7. **凝神（资源通道）**：新增零资源按钮——20 战意换 1 真元，或 15 战意净化一个负面状态（每回合一次）。纯 B 局部状态零存档改动，给防御/控制抗压局主动解法。
8. （顺带）E24 接线 `BALANCE.COMBAT` 后统一调参一次，balance-sim 出对照。

## 五、D 轮回印记分账与仙途长线（升级二）

1. **印记分账（A5 根修）**：`legacy.marksEarned`（累计获得，只增不减）决定传承树层数与永久属性基数（`min(30, earned)` 枚 ×1%）；`legacy.marks`（余额）专供消费端（来世预约/树高层解锁）。迁移：老档 `marksEarned` 初始 = 当前 marks（不追溯历史铸造，保守无争端）。「血脉只增不减」自此成立。
2. **传承树 11~15 层**（余额解锁）：11「道胎」出生即练气二层 / 12「灵兽通心」初始亲昵 +20 / 13「旧识遍江湖」初始声望 +50 / 14「道骨」全属性再 +1 / 15「轮回行者」每次兵解额外 +1 印记（加速后世满树）。
3. **来世预约扩档**（余额计价）：新增 5 印记=来世灵田三块良种、8 印记=来世孵化一阶灵兽蛋——预约从 3 档到 5 档，消费端不再单薄。
4. **AutoCult 仙元目标**：target 表增 `'xian'`（攒够 N 仙元/至仙阶第 N 层自动停）；飞升后圆满不再即停（溢流继续）——v31 放置闭环补全。
5. **悟道入口**：感悟满百可主动「悟道」（20 感悟 → 道韵进度/小额仙元，每日一次）——感悟在飞升前后都有主动用途（与 E26 定值化配套）。
6. **仙劫差异化**：仙劫专属异象池（雷池淬体/仙官观礼/仙障心魔——成功按 xianTo 发不同永久小词缀）；「借天运」对仙劫改燃仙元。〔可选后置项：大罗期「仙寿劫」每千年小劫——终局寿元轴复活，工作量约 1 天，视进度裁剪〕
7. **兵解防重护栏**：legacy 记玩家出生指纹（id+day），同指纹 execute 不再发基础 +1 印记——堵手动槽旧档反复兵解刷世数/印记的漏网（审计待复核项，随分账一并落地）。

## 六、E 装备与经济纵深（升级三）

1. **器魂经济深化**：重铸阶梯价（同件连续重铸 8→14→20 枚，换装回落）防「洗到最优即弃」；**器魂锁洗**（4 枚=锁一侧洗另一侧，衔接洗练双倍价）；grade≥4 分解产「天阶器魂」，集 10 枚解锁第二前缀槽（高端构筑新维度）。
2. **洗练升星**：每条词缀 0~3 星；洗练 15% 概率同词缀升星、保底「保星不保条」——修掉「保底不降=确定性付费升级、BiS 只是灵石函数」的方差归零问题，保留保底又留赌博感。
3. **套装炼化**：成套后玄铁+灵石升套阶（逐级 +2%）；2+2 跨套小共鸣（攻防混搭 +3%）；**仙缘断头路补源**——s_xy_jian/s_xy_ling 除拍卖外补秘境 rareDrop 或开 f23/f24 配方（现唯一源 17 选 1 拍卖、期望 1000+ 游戏日，远超 r4~r5 适用窗口）。
4. **拍卖影子竞拍者**：底价随拍品被关注次数上浮、激进档可能被截胡加价 10%；仙缘两件设为其专属高价池——拍卖从「对确定性概率出价」变真博弈（与 B 的当日限额 E20/E26 配套）。
5. **器胚升维**：6 残片可合成「器胚」，器胚入炉成器率 +10% 或保底一条后缀——残片从折价券变策略资源，给 f21/f22（30% 成率、百万级材料）可控对冲。
6. **灵石面额简化**：顶栏与坊市直接显示折算总额；convert 四键收纳进「更多」——上/中品从显示单位变纯背景设定（不做新玩法，减负）。

## 七、F 江湖与日常纵深（升级四）

1. **抉择回收网络（E40 根修）**：为 k5_past_accept/k7_route/k9_final/k4_dilemma_answer 各接 1~2 个下游场景（如 c6_mid2 按认/不认换玄影客台词、c9 渡他/斩尽分支按 k9_final 变可选、k4_dilemma_answer 影响 c9_end 可选项）——reqChoice 引擎已支持 oneOf，纯数据活每条约 20 行脚本；回收 5 面以上，其余死旗标清理。
2. **个人线决战誓约**：n1（借剑）/n17（布阵）/n23（掌船）终章文本承诺的助力兑现——完成对应线后 c9 帝渊战获一次性护盾/增伤/战后彩蛋台词（startBattle foe 挂 buff 即可）。
3. **世界事件次年回响**：灵疫→瘟后重建折价市况 180 日；内乱→该宗地图遇敌权重变化一年（w.history 已持久化，挂钧即可）——12 类中 5 类「打一场」同构外，三选一也有后续余波。
4. **宗门差事宗门加权+连勤 streak**：五式权重按宗门特色分（剑宗 kill 高、商会 collect 高）；连续完成 N 桩差事贡献 +20%（`p.sect.streak`，日界复用 _discipleDay 模式）。
5. **黄历连签**：七日连签阶梯奖（第 7 日必上上签）；签文与当日玩法联动（「财源广进」当日宝箱权重 +20%、「小有蹉跎」陷阱 +10%）——daily-sign 从一次性按钮变开局仪式感。
6. **探索事件池数据驱动扩池**：`EXPLORE_EVENTS` 表（条件 realm/season/flag/worldEvent+权重+收益模板），把兽潮掉肉/灵疫施药等世界事件接进事件池、雾日/季节互文——fortune 6 种、dilemma 6 本的重复感稀释。
7. **秘境个性肉鸽**：每秘境 1 个专属节点/专属规则词缀（如剑冢「剑气禁制：首回合受伤 +20% 但掉剑意」）；深度 ≥6 解锁隐藏层；失传功法按秘境分发（现仅 3 部且无分发逻辑）。

## 八、G 工程地基三批（升级五）

1. **check-actions.mjs 静态校验**（0.5 天，本轮性价比之王）：扫 js/+index.html 全部 `data-action` 字面量与 Game.actions 表互相求差，NO-HANDLER/NO-ENTRY 双向报错，接入 `npm run test:all`——本轮 3 枚死按钮（A9/A10/act-more-close）的防复发闸。
2. **存档安全网定时滚动**：bak2 从「每会话一次」升级为每 10 分钟（或每 200 次 autoSave）滚动一次；开始界面回捞入口显示快照时间——6 小时长会话崩溃不再回捞 6 小时前。
3. **日结总线**：`Daily.resetIfNew(p, key)` helper 统一 `{day, n}` 日限形态（新代码先用、旧字段渐进迁移，E60 离线日报聚合在此落地）——防未来再漏日界/再刷屏。
4. **导出信封升级**：导出从裸 base64 升级为带版本头+校验和+创建时间的 JSON 信封；支持三槽整包导出/导入（换机一次到位）；旧文本码兼容导入。
5. **无障碍一次补齐**：openLayer 帮手统一 7 个弹层（role=dialog/aria-modal/aria-label/初始焦点/焦点陷阱/还焦）；页签 role=tablist/tab/aria-selected；axe-core 清零入回归（含贡献输入无标签、图形按钮 aria-label）。
6. **渲染脏标记影响面收复**：afterAction 恒 markDirty('all') 使 v18 分区渲染名存实亡——按动作声明影响面（买货→top/bag；修炼→top/status/content）分区标脏，配合红点记忆化再砍热路径 innerHTML。
7. **版本号单源**：release.mjs 统一注入 `?v=`/SW VERSION/manifest 描述（E47/E58 落地于此）。

## 九、J 验收

1. **verify-v18 新套件（≥130 断言）**：A 组（P0 十一连运行时断言：蚀骨双煞不抛/驯服分发/choices 回滚/丢弃不炸/分账不回退/仙阶卡并存/六人名牌/四类公告/明细弹窗可开/聚灵入口/两成就可解锁）、B 组抽样（清心丹解控/双槽互斥/套利转负/连祭炼单计/感悟定值/离线口径/悬赏预览/秘境耗日/日志 DOM 裁剪）、C~G 组（意图预估/连携链/组合表/协战策略/塔赌约/凝神/印记分账+树11-15/AutoCult xian/悟道/器魂阶梯/锁洗/升星/套装炼化/影子竞价/抉择回收/连签/事件池/秘境个性/check-actions/信封导入/滚动 bak2）。接入 `test:all`。
2. 受影响旧套件逐套修订（预估 v3/v6/v10/v11/v16/v17：数值与文案断言随批修变动；v13 成就数若有扩容同步）。
3. **全量 `npm run test:all` 17 套件连续两轮全绿、0 控制台错误（EXIT=0 × 2）**（先 `npm run serve`）。
4. `scripts/shoot-v32.mjs` 双视口六屏 + judge 视觉验收（重点：战斗意图预估与连携链/协战策略兽栏/轮回镜分账与树 11-15/器魂锁洗与升星/拍卖影子竞价/秘境个性节点；移动端不回归）。
5. 落档链：`docs/update-notes/UPDATE_NOTES_V32.md` → playbook.md 更新至 v32 → 缓存号 `?v=48`、SW `fanren-wd-v7` → `npm run release -- v32`（镜像+快照 releases/v32/）→ **最后一次性 commit**（post-commit 自动双推）。

## 十、兼容与风险控制

- 新持久字段清单（fresh 模板 + migrate `||0/||{}` 自愈）：`legacy.marksEarned`、`legacy.birthmark`（出生指纹）、`b.tactic`（灵兽策略）、词缀星 `p.affixStars?`（随洗练档）、`p.sect.streak`、连签 `p.sign.streak`、套装阶/器胚/天阶器魂计数——全部只增不改旧键；印记分账迁移只并合不回写旧键。
- **削弱明示**（UPDATE_NOTES 需列）：E16 坊市出售不再吃获取加成（套利斩断，卖价基数 0.4→0.45 微补偿）；E26 事件型感悟溢出仙元大幅收敛；E59 秘境开始耗日；E65 高境扫低图收益下调——四项均为堵漏/梯度修复方向。
- 数值双护栏：E26/E59/E16 改动先过 `scripts/balance-sim.mjs` 模拟（秘境日均收益、坊市价差、仙元日入三张对照表）再定稿；balance-sim 自身口径先修（E25）。
- C 包每项独立可回退；对招组合表先设计评审（与 deckCursor 时序解耦）再动工；意图预估纯函数不动判定内核；不改自动战斗默认策略。
- A1/A4 两处 ReferenceError 修复后，verify-v18 需补运行时回归（蚀骨双煞塔战全流程、乾坤袋丢弃→重购全流程）防同类回归。
- G6 渲染分区标脏为全局改动——放最后一批落地，单独一轮全量回归兜底。

## 十一、执行顺序

A P0 十一连 → B 批修（B1→B6，E1~E66）→ C 战斗可读化三阶 → D 印记分账与仙途 → E 装备经济 → F 江湖日常 → G 工程地基（G6 最后）→ verify-v18 + 旧套件修订 → build 全量回归两轮 → shoot-v32 + judge 视觉验收 → UPDATE_NOTES_V32/playbook/缓存号 → `npm run release -- v32` → 一次性 commit。

---

### 附：本轮审计基线与待复核清单

- 基线：master@2244093（v31 收尾）干净；六路深审（战斗灵兽塔 / 装备炼器坊市 / 修炼轮回仙界 / 社交内容剧情 / UI 工程基建 / 洞府日常探索）+ 主审对 11 枚 P0 与十余条关键 P1 逐条二次实锤（全部亲读源码确认调用链）；price-audit 实跑 0 告警（其口径测不出跨链不对称，本轮已列扩审计项）。
- **待复核（执行时先验证再定）**：①companionOuting/Wish 缺 Story.active 守卫（吞弹窗次序风险）；②tourneyOpponent 高 rp 空池兜底可抽精英冠「同门师兄」名；③兵解只写 auto 槽的手动槽重刷（已并入 D7 护栏设计）。
- 复核为无恙、不改动项：仙寿加法叠加不覆盖天年；转世清籍彻底；legacy.xianjieBest 记录到位；bak 先于渡劫丹消耗；24 条个人线终章奖励全被消费；差事五式钩子真实接线；图鉴 unlock 调用点全集无遗漏；日志双上限与 document.hidden 保护；成就奖励随境缩放口径。
