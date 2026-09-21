# PLAN_V37 · v37「清源」全方位大升级计划

> 状态：计划先行。按 AGENTS.md 纪律：全部批次完成、`npm run test:all` 连续两轮全绿后才一次性 commit（post-commit 自动双推，中途绝不 commit）。
> 前置基线：v36「正本」已发布（commit 2df77db，`index.html:227` 缓存号 ?v=52，`sw.js:10` fanren-wd-v11）。
> bug 编号：六路深审已用 E263~E277；实施中若新发现，自 **E278** 接续登记。
> 实施纪律：**每批完成后运行 `node scripts/build.mjs` 自检**；全量回归统一在 B9 跑；`docs/balance-v19.md` 与 `docs/price-audit.md` 是脚本再生之物，终稿由脚本生成，不手编辑。

---

## 〇、主题与目标

v36「正本」封了论道/切磋/问道录三枚 P0，但六路深审证明**修为与灵石的主粮通道仍有多条在门禁带外**（塔深爬 ×121.6、购买悟道链 ×7.08、宗门兑丹卖店 ×16.7）。v37 名为**清源**：不是加内容，而是**把污染源头的经济环清干净、把挂着空头承诺的长线系统夯实、把从未接线的反馈通道接上**。

三个目标：
1. **清源**：封堵 E263/E264/E265/E266/E273 五条套利/主粮通道，balance-sim E220 门禁与 price-audit 扩容后全路可测；
2. **正名**：长线系统的心债清偿——结交回归仪式感、连签对闭关流可达、心魔上限如实、仙元有终局去向、世界时代随 5~6 年周目重校；
3. **补全**：五处死音效、坐化/本命两大演出、虫害红点、批量操作、工程护栏（快照/留档/门禁防静默）全部补齐。

---

## 一、六路深审处置总表

| 编号 | 镜头 | 严重度 | 一句话 | 处置 | 批次 |
|---|---|---|---|---|---|
| E263 | balance | high | 宗门贡献无限兑渡劫丹/太初丹卖店（卖值/贡献 21~24，同表离散 4 倍） | 修 | B1 |
| E264 | balance | high | 筑基丹囤感悟→每日悟道 ×7.08 修炼日均（E220 门禁对购买感悟供给失明） | 修 | B1 |
| E265 | balance | medium | 听讲→悟道链 ×3.54/×2.21 越 E220 带，balance-sim 豁免理由不成立 | 修 | B1 |
| E266 | balance | low | 收集悬赏 floor 2×卖价×连锁至 6×卖价，购料环正期望 | 修 | B1 |
| E273 | pacing | high | 塔层奖修为无额度且整场登塔零日耗（峰值 ×121.6 修炼日均） | 修 | B1 |
| E240 | design | high | 结交无日限可买穿社交阶梯 | 修 | B2 |
| E241 | design | high | 七日连签容差救不了闭关 +30 日（最优循环与满签互斥） | 修 | B2 |
| E245 | design | medium | 心魔 20% 凝练上限为本世不可达装饰 | 修 | B2 |
| E248 | design | medium | 雷台了断需刻意叠怨至 rel≤-60，复仇线近乎不可达 | 修 | B2 |
| E242 | design | medium | 宗门差事与悬赏板两套同构委托系统 | 修（轻方案：池互斥） | B2 |
| E243 | pacing | medium | 世界时代 10/20/30 年按旧周目定，现首场即本世永久 buff | 修 | B3 |
| E244 | design | medium | 天骄榜纯展示，无争夺手段 | 修（问剑夺位） | B3 |
| E246 | design | medium | 仙元在道祖后成死货币 | 修（携往生遗产线） | B3 |
| E247 | design | medium | 闭关跨日把互动节庆全部降级为从简版 | 修（挂起补办） | B3 |
| E252 | design | low | 大事 pending 无守卫被无声覆写 | 修（覆写留痕） | B3 |
| E249 | design | medium | 装备五层旋钮全挤一条数值轴，机制解锁为零 | 修（套装技+词条位） | B4 |
| E269 | logic | low | 跳层作废战斗对邪修仍全额结算杀业 | 修 | B4 |
| E267 | bug | medium | 词缀星卸下即蒸发（affixKept 只存词缀不存星） | 修 | B5 |
| E268 | engineering | medium | bak2 十分钟滚动快照从未接线（唯一调用点 enterGame） | 修 | B5 |
| E272 | logic | low | 章末演出中断→下章开篇永久丢失 | 修（读档补播） | B5 |
| E271 | logic | low | Game.actions 重复定义 'act-wudao' 键两次 | 修（删键 B5 / 防复发检测 B8） | B5+B8 |
| E232 | ux | medium | coin/plant/bell/intent/inherit 五音效零调用 | 修 | B6 |
| E239 | ux | medium | 本命法宝合成只有一行日志，死音效 inherit 正为此而生 | 修 | B6 |
| E238 | ux | low | 坐化/兵解全程无声光，演出规格倒挂 | 修 | B6 |
| E234 | ux | medium | 虫害不亮任何红点，损失走静默通道 | 修 | B6 |
| E277 | pacing | low | 离线折算无条件剥 rushDay，已付费聚灵窗口被离线日烧光 | 修（窗口补乘） | B6 |
| E235 | ux | low | 喂内丹无 ×5（升满 36 连击） | 修 | B7 |
| E236 | ux | low | 面额兑换无批量（中后期十几次连点） | 修 | B7 |
| E237 | ux | low | 散修路线宗门红点永久常亮 | 修 | B7 |
| E255 | ux | medium | 聚灵按钮显隐仍是旧「当日」口径（E218 收尾遗漏） | 修 | B7 |
| E233 | ux | low | v19/E8/套利/印钞机等内部黑话四处漏进玩家 UI | 修 | B7 |
| E251 | design | low | 灯谜正解恒为乙、低悟性故意答错更优 | 修（正解轮换） | B7 |
| E260 | eng | low | ui.js:1626 注释仍「每五年一届」 | 修 | B7 |
| E261 | eng | low | 黑市「初三开市」文案与实现第 1~3 日漂移 | 修 | B7 |
| E254 | eng | medium | 品阶兜底价数组 4 处双写 | 修（单源化） | B8 |
| E256 | eng | medium | check-actions 三锚点「失败静默跳过」 | 修（失败即红） | B8 |
| E253 | eng | medium | FACTS.offlineEff 游离在对账外 + 离线小结手写绕单源 | **unconfirmed→已证实，修** | B8 |
| E257 | eng | medium | release 把滞后 README（v31）烧进永久快照且无守卫 | 修（守卫+刷新根 README） | B8 |
| E259 | eng | low | build 无「磁盘→modules.json」反向校验 | 修 | B8 |
| E262 | eng | low | scripts/ 一次性死重 16 文件 1752 行 | 修（删/合并） | B8 |
| E258 | eng | low | verify-v10 X5 断言空转（no-op 行+死变量+旧口径标题） | 修（收缩） | B8 |

**E253 处置说明（ask 要求 unconfirmed 必须给出说法）**：本会话已亲读证实为真——`js/ui/ui.js:8` 确有 `FACTS.offlineEff: '普通修炼六成'`，而 `scripts/check-actions.mjs:62-84` 只对账 offlineCap/bountyDays/sellRate 三点（:88 自述「三点对齐」），实现真值 `js/game.js:282` 的 `* 0.6 *` 与 `:305` 的手写文案「按普通修炼六成效率折算」均游离在门禁外。**纳入 B8 修复**。

**本会话亲自核验过的锚点**（其余引用均出自任务提供的六路深审材料）：
- 第一轮：`package.json:18`（test:all 现链）、`js/ui/ui.js:8`、`js/game.js:282/305/569/732`、`scripts/check-actions.mjs:62-88`、`js/systems/bag.js:222-270`、`js/core/save.js:66-87`、`scripts/build.mjs:31-36`、`js/ui/ui.js:719/1626`、`tests/verify-v10.mjs:673-692`、`scripts/` 目录清单（16 个死重文件在列）、`js/data/game-data.js:227/551-552/586/590`。
- 第二轮（评审修订核实）：`js/battle/battle.js:1930-1990`——全文件**仅 `:1983` 一处 `Time.add(3)` 且位于普通战败尾段**（塔 `:1938-1944`/切磋/大比/秘境/剧情战均提前 return 不经过；**不存在**「胜局 :1983」）；`js/systems/tower.js:195-274`——enter/resume/leave/nextFloor/onVictory 全文**零 Time.add**；`js/core/save.js:95-106`——autoSave 每次行动实时落盘（AutoCult 节流下每 2.5s 一写），故写前快照恒被 `save.js:79` 的 60 秒新鲜度检查拦截；`js/data/game-data.js:529-535`（SECT_QUEST_FLAVOR 五宗 kill/collect 键）与 `:538-579`（SECT_EXCHANGE 全表：丹药行 7 行、装备 s_xt_*/s_cx_* 20000/22000、功法 gf_*、杂件 z_hunpo 15000 等）；`js/systems/sect.js:70-114`（SECT_W 五宗与 `:79` 兜底权重均含 kill/collect、`:91-96` collect 生成支）与 `:143`（submit 的 collect 提交流）；`js/systems/daily-sign.js:46-63`（现行 `:55` 为 `gap >= 1 && gap <= 3`，`gap >= 1` 前置在案）；`scripts/balance-sim.mjs:18`（?v=33 实际行号，非 :29）；`js/systems/xian.js:34/41-42`（阶满指引 toast 实际位置）；insight 增发点全集 grep（丹药 `use.insight`：game-data.js:202/215/219/222；事件 `reward.insight`：game-data.js:1460 起；代码侧调息/听讲/灵潮等散布 16 文件）；根目录 `nul` 文件实存（0 字节，git 未跟踪）。
- 第三轮（终审修订核实）：`js/systems/sect.js:116-130`——`newTask = wrapDanger(genTask)`、`:121` 以 `t.type !== 'kill'` 为生死状入选条件、`:126` 改写 `t.type='kill'`（kill 生成支一删生死状即断线）；`js/data/game-data.js:206`——`pill_xisui price: 0`（卖值经 shop.js:33 退化为 1，1/200=0.005 无判别力）；insight 直写形态 `\.insight = Math\.min\(` 全仓计数（`grep -rc` 实测）：game-data.js **227 行**、cultivate.js 7、festival.js 6、world.js 4、explore.js 2、tribulation.js 2、cave.js 1（`+=` 形态全仓零存在——第一版断言写法属假门禁，已废）。

---

## 二、不做清单（宁缺毋滥，显式在案）

1. **不新增大型玩法模块**——没有新地图、新职业、新战斗模式、新养成第六树。本版是还债版：五树的深度欠账（装备机制面、长线系统可信度）优先于内容增量。
2. **不做宗门+悬赏的 UI 级合并重构**（E242 只取轻方案：目标池互斥 + 分工文案明示；「委托中枢双分栏」属界面大改，风险收益比不划算，留待有真实反馈再说）。
3. **不做第二战斗属性轴**——闪避/命中/元素克制一律不加。E249 的机制面走套装技与词条位（规则祝福式），不扩属性轴，防止战斗复杂度失控。
4. **不动满气运端赌袋 EV 校准**——price-audit 在案「处方预期 ≤0 待数据侧后续校准」（v36 已声明不采纳），本版无新数据来源，不翻案。
5. **不动 E214 天级彩头池未盘点资产**——维持 v36 处置：池空回落 gMin−1，不引入未验证资产。
6. **不扩节庆与题库**——E251 只做正解年哈希轮换 + 成算改作用于奖励品质，不加新节庆、不加新题目。
7. **不做存档云同步/导出加密等联网特性**——纯前端零依赖定位不变。
8. **不重构 UI 渲染框架**——renderAll 脏分区与 setHTML 缓存够用，judge 双视口已验收，不推倒。
9. **离线效率 0.6/120 日不再上调**——v34 定档、v36 E217 已声明「折算基数维持普通修炼」不采纳；本版 E277 只修聚灵窗口被烧问题，不重开效率谈判。

---

## 三、数值与节奏依据（对照 balance-sim / price-audit 口径）

### 3.1 E264/E265 悟道「感悟纯度」机制（推导）

**问题本质**：悟道日限一发、收益自随 baseGain，单发收益 ≈ 2.5×baseGain ≈ 4.2× 修炼日均——**纯供给限制**（自然链 10 日一发）才把它压在带内。感悟价格只控购买力、控不住发射率，故**单纯涨价封不住**（成本 20+2r 时 r5 购买链仍 ≈×6.5）。

**处方——按感悟来源折算收益**：悟道消耗的感悟中「再生感悟」（调息 +2/日）占比 ρ，收益 = `baseGain × 2.5 × (0.3 + 0.7 × ρ)`：
- 自然链（ρ=1）：2.5× 全额不变，现状玩法不动；
- 纯购买链（ρ=0，1 丹/日喂发）：0.75×baseGain ≈ **1.25× 修炼日均**（现状 ×7.08）——带内（≤2.2×）；
- 听讲链（r3：8 贡献感悟+2 调息，ρ=0.2）：≈1.1×baseGain ≈ **1.83× 修炼日均 / 1.15× 闭关日均**（现状 ×3.54/×2.21）——双带内（≤2.2×/≤1.4×）。
- 辅以成本微调 20→20+2×realmIdx（r8=36），拉长纯购买链回本周期，双保险。
- **验收即真理**：balance-sim 新增两条 gated 行实测入带；若实测越带，优先调 0.3 底折系数（0.3→0.25），不动自然链。

**状态载体与迁移（评审修订：ρ 必须有可落盘的来源追踪，不能只算在纸面上）**——现行 `p.insight` 是单一池（`js/core/player-factory.js:40` 初始化 `insight: 0`），来源散布多处（grep 实证：调息 +2/日 cultivate.js、听讲 +8 game.js:613、灵潮 +8 world.js:203、丹药 `use.insight` game-data.js:202/215/219/222、事件 `reward.insight` game-data.js:1460 起）。定案为**来源 FIFO 双池**：
- 新状态 `p.insightSrc: [{v, regen}]` 队列（段数上限 50，超限合并相邻段防膨胀）；`p.insight` 保留为总量缓存（消费端读数不变）；
- 新增单源 `Cultivate.addInsight(p, n, regen)` / `Cultivate.spendInsight(p, n) → ρ`：增发走 addInsight（**仅调息 regen=true；听讲/灵潮/丹药/事件等一律 regen=false**），所有现存增发点改走单源——真实直写形态为 `p.insight = Math.min(100, (p.insight||0)+N)`（全仓约 250 处，`grep -rc` 实测分布见「核验锚点」第三轮），机械替换、N 原样保留；wuDao 消费走 spendInsight 按 FIFO 扣减并得 ρ；
- 迁移（3.6 表新增行）：存量 `p.insight > 0` 折为 `[{v: p.insight, regen: true}]`——存量一律按再生记（不追溯惩罚、宽松过渡），迁移后新入账按真实来源归池。

### 3.2 E273 塔层奖额度化

层奖修为 = 0.5×22×eco(层境界)，层深 +8 层 eco ×4.6 无收敛——任何固定单价都封不住深爬，必须**额度制 + 时间成本双腿**：

**时间腿（评审修订：耗日收口在塔侧，battle 侧不补）**——本会话 grep 实证：`battle.js` 全文件仅 `:1983` 一处 `Time.add(3)` 且在**普通战败尾段**（:1962-1989 疗伤折损流程；塔 `:1938-1944`、切磋、大比、秘境、剧情战均提前 return 不经过），`tower.js` 全文件零 Time.add——即现状**胜局深爬与收手离塔均零耗日**，原稿「与 :1983 胜局同口径」系误标（:1983 是普通战败的 3 日疗伤，不是塔胜局口径）。处方改为**入塔一次计整场**：
- `tower.js enter()`（:197-201，置 `t.run` 后）`Time.add(3)`——整场登塔（含连胜、败北、收手离塔、通关）统一耗 3 游戏日，一次计讫；`resume()` 跨会话续登（run 仍在）不再重复计；`nextFloor()/onVictory/onDefeat/leave()` 一律不另计（连胜 87 层不叠加）；
- `battle.js:1938-1944` 塔败北提前 return **保留不动**（塔侧已计日，此处再走 :1983 会叠加），分支注释补一句「耗日由 TowerSys.enter 统一计，勿在此叠加」——把「绕过 :1983」从隐性 bug 变成显性语义。

**额度腿**：
- 每日层奖修为额度 = **同境 2× 修炼日均等效值**（实现按 baseGain 折算，系数以 balance-sim 实测「修炼日均/baseGain」比值定标，写成命名常量 + 注释推导）；
- 超出部分「修为归于明日」（模式与 tower.js:263-270 层奖灵石 allowance 完全同构——`today.stones` 旁并 `today.exp`）；
- 目标：新「塔深爬」行（免费 1 次 + 额度上限 + 整场 3 日建模）≤ ×2.2 修炼 / ×1.4 闭关（现状峰值 ×121.6）。

### 3.3 E263 宗门兑换重锚（锚范围钉死，防门禁被 gaming）

**入锚范围（评审修订：不钉死范围则「全表离散 ≤3×」不可达，或诱导收窄锚自证清白）**——本会话亲读 `game-data.js:538-579` 全表：41 行中丹药行恰 7 行（pill_xisui 200 / pill_jiuzhuan 1200 / pill_dujie 8000 / pill_taichu 5000 / pill_zaohua 20000 / pill_dahuan 900 / pill_yuanshen 6000），其余为功法 gf_*、装备 s_xt_*/s_cx_*（20000/22000）、杂件 z_hunpo 15000、材料 m_* 与 special 行。**锚只取 `GameData.ITEMS[item].type === 'pill'` 且 `price > 0` 的兑换行**——`pill_xisui` price=0（game-data.js:206 亲读实证），经 shop.js:33 `max(1, floor(price×0.45))` 卖值退化为 1，卖值/贡献=1/200=0.005 无判别力，**排除出锚并在实现注释写明**；装备/功法/杂件行不入锚——贡献价含「学习资格/器魂」等非卖店价值，0.45 折卖后天然低，全表离散无判别力。此范围写死在 price-audit 实现注释中。

**目标族与基线口径**：静态实算卖值/贡献（0.45 回收系数，shop.js:33）——pill_dujie 22.5（400000×0.45/8000）、pill_taichu 18.9、pill_yuanshen 8.6（115000×0.45/6000）、pill_zaohua 7.9（350000×0.45/20000）四行越线待重锚；族内低位参照 pill_dahuan 5.5、pill_jiuzhuan 9。注：price-audit 实测口径（21.2/12.4）含境界折价卖、略低于静态值，**越线方向一致，验收基线以 price-audit 实跑输出为准**。排除 price-0 行后族内可达：四行重锚落 6~9 带 → 族内 max/min ≈9/5.5≈1.64 ≤3 ✓。处方：
- 门槛：四行 SECT_EXCHANGE 补 `minRealm` 对齐坊市上架境（game-data.js:586/:590 实证：dujie=3、taichu=4、yuanshen=5、zaohua=6）——套利窗口本就集中在筑基~金丹初（实测 r1 达 16.7×、r5+ 仅 0.2×），门槛即斩断主窗口；
- 价格：四行 cost 重锚，目标 **丹药族内「卖值/贡献」max/min ≤3×**；方向以 cost 上调为主（四行均高于族内低位），实现取 `cost = f(stoneEco)` 或提档固定价，以 price-audit 实测跑绿为准；
- 防复发：price-audit 第四路增设「卖值/贡献」丹药族横向锚（族内离散 >3× 报警）、第八路补宗门兑换行——八路对此结构性失明的盲区补上。

### 3.4 E266 收集悬赏 floor 重锚

- `collectFloor` 系数 2→1.2（仍比 v29 前的直卖 0.45 系数显著优待收集者）；
- **连锁乘数只作用于 60×stoneEco 基准赏格、不作用于 floor 部分**（若乘 floor，1.6×1.2=1.92×2sell 仍 > 购价 2.22×sell 的环破不掉）；
- 目标：「购料→交悬赏」全链条期望 ≤0（第八路新增检测行验证）；若实测仍正，floor 再降至 1.0（检测行跑绿为准）。

### 3.5 其余数值目标

| 项 | 现状 | 目标 | 依据 |
|---|---|---|---|
| E243 时代时长 | 讲道10/秘境20/大战30/灵潮10/兽潮15 年 | 3 / 5 / 6 / 3 / 5 年 | v34 实玩周目 5~6 年，半周目（≈3 年）内应见 2~3 个时代轮换；大战与灵疫同物价扰动却 30 年 vs 1 年，失衡归位 |
| E245 心魔 | 凝练上限 +20%（不可达） | 上限 `min(6, cleared)%`（3~6 次降伏本世可达） | 新增行为来源后每世 3~6 次降伏可期；20% 空头承诺改如实 |
| E245 阈值 | 心魔满 100 即劫 | realmIdx≥6 时 70 即劫 | 高境决策密度更高，心魔该是「选择的代价」而非纯惩罚尾巴 |
| E246 仙元折算 | 死货币 | 1000 仙元=来世气运+1（cap+3）、2000=悟性+1（cap+2） | 气运+3 ≈ 七日满签上上签量级；悟性+2 ≈ 一轮洗髓量级，遗产感真实但不破新档平衡 |
| E248 了断门槛 | grudge+rel≤-60+境差≤2 | grudge 即可约（rel≤-20 起），rel 越狠对方战力加成越高 | 单次杀 NPC -45 已可达；狠度进赔率不进门槛 |
| E249 套装技/词条 | 全数值轴 | 磐岩套受击回真元 5%、血河套击杀叠攻 3%×5 层；+12 词条位 4 枚 | 对照登天塔 28 祝福中 3 种「规则祝福」的成功先例（tower.js:39-41） |
| 节奏总目标 | v34 定档 ≈3 游戏年至飞升 | 不回退 | B3/B6 每处节奏改动后 balance-sim 节奏体检复跑确认 |

### 3.6 存档迁移方案汇总（PlayerFactory 双同步纪律）

> 历史教训：v34 E127（新档首刷全量迁移链清空进度）、v33 传承树分账清零。**所有新字段 `create()` 与 `migrate()`（追加 MIGRATE_STEPS）双同步；新档显式标记生于一切迁移之后；`_migratedVersion` 钳入 [0, 链长]（E190）。**

| 批次 | 新状态 | 迁移方案 |
|---|---|---|
| B1 E264 | `p.insightSrc = []`（感悟来源 FIFO 队列，见 3.1） | migrate 一步：存量 `p.insight > 0` 折为 `[{v: p.insight, regen: true}]`（存量一律按再生记，宽松过渡）；create() 补 `insightSrc: []`；`p.insight` 保留为总量缓存不动 |
| B2 E240 | `npc.befriended` | migrate 一步：存量 `rel > 0` 的 NPC 置 `befriended: true`（防旧档对高好感 NPC 重吃廉价通道）；create() NPC 模板补 `befriended: false` |
| B3 E243 | `world._eraRecal37` + 时代 until 字段收缩 | migrate 一步：存量档 `preachUntil/ruinsUntil/warUntil` 等逐字段 `min(原值, 当前年+新时长)`，置 `_eraRecal37 = true` 防重入 |
| B3 E244 | `p.rankHonor = 0` | create() + MIGRATE_STEPS 各追加（默认 0，缺字段防御读） |
| B7 E237 | `p.flags.sectDeclined = false` | migrate 一步：存量 `!p.sect && p.realmIdx >= 2` 置 true（已过筑基仍未拜宗 = 事实拒宗，存量散修红点一并熄灭）；create() 补 `sectDeclined: false`；写入点见 B7 |
| B3 E246 | `p.pastXianyuan = 0` | create() + MIGRATE_STEPS 各追加（默认 0） |
| B3 E247 | `p.pendingFestival = null` | create() + MIGRATE_STEPS 各追加（默认 null；读侧 `p.pendingFestival &&` 防御） |
| B5 E267 | `p.affixKept[id]` 形态 `{affixes, stars}` | migrate 一步：旧形态（纯 affixes 对象）包一层 `{affixes: 原值, stars: {}}`；restoreAffix **同时**兼容两形态（双保险，孤儿留档不崩） |
| B5 E273 | `p.towerExpAllow = { day, left }` | 日键自复位结构（Daily 同款），缺字段=新一天满额度，无需迁移步；create() 补默认值 |
| B4 E249 | 装备实例 optional `mech` 字段 | 全 optional，undefined 即无该机制，防御式读取，**零迁移** |

---

## 四、批次计划 B1~B9

> 每批完成即跑 `node scripts/build.mjs` 自检 + 本批新增断言（tests/verify-v23.mjs 增量建套，B1 骨架、逐批增补）+ 受影响旧套件单跑；全量回归 B9 统一两轮。

---

### B1 · 经济与修为主粮通道封堵（P0，最高风险先行）

**目标**：五条套利/主粮通道全部落入门禁可测、实测带内。

**改动点**：
1. **E263 宗门兑丹环（锚范围见 3.3）**：
   - `js/data/game-data.js:551-552/558/571`：SECT_EXCHANGE 四行补 `minRealm`（`pill_dujie: 3`、`pill_taichu: 4`、`pill_yuanshen: 5`、`pill_zaohua: 6`，对齐坊市上架境）；
   - `js/systems/sect.js:210-236` exchange()：读取 minRealm 拦截，toast 世界观文案（「此丹非小境界可承」）；
   - `js/ui/ui.js:1555-1584`：兑换列表按境界置灰并显示门槛；
   - 贡献价重锚：`pill_dujie/pill_taichu/pill_yuanshen/pill_zaohua` 四行 cost 按 3.3 节目标重定价（丹药族内卖值/贡献 max/min ≤3×）；
   - `scripts/price-audit.mjs`：第四路增设「卖值/贡献」**丹药族**横向锚（只取 `type==='pill' && price>0` 的兑换行——pill_xisui price=0 卖值退化 1/200=0.005 无判别力，排除出锚并注释写明；族内离散 >3× 报警）；第八路补宗门兑换行。
2. **E264/E265 悟道纯度（状态载体见 3.1）**：
   - 新增 `Cultivate.addInsight(p, n, regen)` / `Cultivate.spendInsight(p, n) → ρ` 单源，`p.insightSrc` FIFO 双池；**全仓 insight 直写收口（评审修订：真实旁路是 `p.insight = Math.min(100, (p.insight||0)+N)` 形态，全仓不存在 `+=` 形态——本会话 `grep -c "\.insight = Math\.min"` 实测：game-data.js 227 行（剧情抉择奖励）、cultivate.js 7、festival.js 6、world.js 4、explore.js 2、tribulation.js 2、cave.js 1，合计约 250 处）**——机械替换为 `Cultivate.addInsight(p, N, false)`（N 原样保留；剧情函数运行时调用，拼接作用域下 data→systems 顺序无碍）；调息入账处改 `regen=true`；白名单仅 addInsight 定义体（game-data.js:40 的 `insight: 0` 为初始化非直写）；
   - `js/systems/cultivate.js:97-120` wuDao：感悟纯度 ρ 折算（3.1 节公式）+ 成本 20→20+2×realmIdx；ui 悟道入口 tooltip 同步新口径；
   - `scripts/balance-sim.mjs:125-158`：新增 gated 行「悟道·购买感悟供给」（1 丹/日=50 感悟建模）与「听讲→悟道链」（感悟折算修为入 exp 列）；删除 :151-153「论道门禁间接约束」豁免注释——E265 已证其不成立；两行入 E220 门禁（>2.2× 修炼 / >1.4× 闭关即非零退出）。
3. **E273 塔额度+整场计日（时间腿收口见 3.2）**：
   - `js/systems/tower.js` enter()（:197-201）置 `t.run` 后 `Time.add(3)`——整场登塔（连胜/败北/离塔/通关）一次计讫；resume()/nextFloor()/onVictory()/onDefeat()/leave() 不另计；
   - `js/battle/battle.js:1938-1944` 塔败北提前 return 保留，分支注释补「耗日由 TowerSys.enter 统一计，勿在此叠加」（:1983 为普通战败疗伤段，语义边界写明）；
   - `js/systems/tower.js:260-271`：层奖修为并入每日额度 `t.today.exp`（与 :263-270 灵石 allowance `today.stones` 同构，超限「归于明日」），额度常量 = 2×修炼日均等效（balance-sim 定标）；
   - `scripts/balance-sim.mjs`：E220 横向表补「塔深爬」行（免费 1 次+额度上限+整场 3 日建模）入门禁。
4. **E266 收集悬赏**：
   - `js/systems/bounty.js:65-67`：collectFloor 系数 2→1.2；`:89-103` 连锁乘数只乘基准赏格不乘 floor；若第八路实测购料环仍正，floor 降至 1.0；
   - `scripts/price-audit.mjs`：第八路悬赏行补「购料→交悬赏」collect 面期望检测（>0 报警）。
5. **tests/verify-v23.mjs 骨架建立**（SA+RB 两类断言框架，参照 verify-v22 结构），接入 `package.json:18` test:all 链尾（verify-v22 之后追加 `&& node tests/verify-v23.mjs`），并新增 `test:v23` script。本批落断言：SECT_EXCHANGE minRealm 拦截 RB（四行）、wuDao 纯度公式 SA（ρ=0/0.2/1 三采样）、insight 双池迁移 RB（存量折 regen 池）与**增发点单源 SA（评审修订：锚定真实直写形态 `\.insight\s*=\s*Math\.min\(`——全仓命中必须全部落在 cultivate.js addInsight 定义体内、白名单外零命中；不得用 `p.insight +=` 作锚，该形态全仓不存在、断言恒绿属假门禁）**、塔 enter 计日 RB（入塔 day+3、续层/败北/离塔不叠加）、塔额度 RB（超限归明日）、bounty floor 乘数 SA。
6. 受影响旧断言修订：grep 全 tests/ 中 悟道/感悟/wuDao/层奖/登天塔/悬赏赏格/宗门兑换 关键词，逐条随新语义修订（重点 verify-v19/v20/v21/v22）。

**验收**：
- `node scripts/build.mjs` 通过；
- `node scripts/price-audit.mjs`：**先以现状（cost 8000/5000 等坏态即当前值）实跑第四路新丹药族锚，证实对现状报警**（这是门禁生效的证明）→ 实施四行 minRealm+cost 重锚 → **终稿复跑零报警**；第八路含宗门兑换行与悬赏 collect 行且购料环期望 ≤0；
- `node scripts/balance-sim.mjs` EXIT=0：三新行（购买悟道链/听讲链/塔行）全带内；回滚验证：纯度底折系数临时注 1.0 实测门禁非零退出后还原（沿 v36 E220 惯例）；
- `npm run test:v23` 绿；受影响旧套件单跑绿。

---

### B2 · 社交与长线系统校正

**目标**：好感产出位回归有深度的系统；连签对闭关流可达；心魔/了断两轴从装饰变可达。

**改动点**：
1. **E240 结交一次性化**（npc.js:427-454）：`befriend()` 头部守卫 `s.befriended` → 已结交再点 toast「尔等早已结识——情谊当以赠礼与论道温养」；首次结交照旧 +8~14 并置 `s.befriended = true`；迁移见 3.6 表。
2. **E241 连签闭关豁免**（daily-sign.js:46-63，本会话亲读：现行 `:55` 为 `p.signStreak = (gap >= 1 && gap <= 3) ? +1 : 1`，`:50` gap 计算，`:52-54` 断签日志同判）：容差改 **`gap >= 1 && (gap <= 3 || gap % 30 === 0)`** 视为延续——**必须保留 `gap >= 1` 前置**，否则 gap=0（同日重复触发）命中 `0 % 30 === 0` 被误判延续而空涨连签；`:52` 日志条件同步改为 `!(gap >= 1 && (gap <= 3 || gap % 30 === 0))`；断签归 1 的可见标红（E145/E188）保留给真断（gap 落在 4~29 且非 30 倍数）；:48-49 注释同步改写「闭关 +30 日随手断签」段。
3. **E248 了断窗口放宽**（npc.js:229-236 canShowdown）：删 `rel <= -60` 硬门，改 `s.grudge && s.rel <= -20`；rel 低于 -20 的部分折算对方约战战力加成（狠度进赔率不进门槛）；ui 人物志恩怨行补「可约战了断」提示。
4. **E245 心魔夯实**（xinmo.js）：新增行为来源——邪修吞噬灵气 +3/次、丹毒超限仍服丹 +4、窥探符使用 +2、赌局失利 +3、背刺得手 +5（各挂对应系统调用点）；`:26` 凝练上限改 `1 + Math.min(6, cleared) * 0.01`；realmIdx≥6 心魔劫阈值 100→70；手册/心魔页文案同步如实。
5. **E242 差事/悬赏池互斥（轻方案；生死状线必须先补处方再动手——评审修订）**——本会话亲读 `sect.js:116-130`：`newTask = wrapDanger(genTask)`，`:121` 以 `t.type !== 'kill'` 为入选条件、`:126` 改写 `t.type='kill'`、进度靠 onKill 推进——**生死状本就是 kill 形态，普通 kill 支一删它即断线**（派系玩家除入派当日 force 一次外永远接不到，force 产物也无法推进/渲染）。处方：
   - **生死状升格为宗门独占生成支**：genTask 新增「生死状支」（派系成员才可掷，`Utils.chance(WorldSys.warActive(p) ? 55 : 26)`——原 `:121` 掷点前置到生成时），产出 `type:'kill' + danger:true` + elites 目标（:123-124 选取逻辑原样搬入）；sect.js:83-90 **普通** kill 生成支（taskMonsters 随机讨伐）删除，collect 支（:91-96）删除；wrapDanger（:119-130）保留——普通任务永非 kill 自然短路，仅 force 路径（入派当日立威）继续生效；
   - `js/systems/sect.js:278-288` **onKill 钩子保留**（生死状 need=1 推进依赖它）——原计划「删除」作废；kill 提交流保留；仅 collect 侧收口（`:143` collect 提交流删除）；
   - `:72-78` SECT_W 五宗权重表与 `:79` 兜底权重删 kill/collect 键（生死状不走 pickWeighted、有独立支，普通类型不再被抽中；不留死配置）；
   - `js/data/game-data.js:529-535` SECT_QUEST_FLAVOR 五宗删 kill/collect 两键（生死状 name 固定「高危 · 生死状」不走 flavor，死配置一并清）；
   - 讨伐类（普通）为 bounty.js 独有出口；ui 宗门任务卡**保留 kill 渲染分支**（生死状卡用），删 collect 渲染分支；两块任务板文案明示分工：宗门=门中供养（贡献向）+派系生死状（危险特派），悬赏=江湖赏格（灵石向+连锁）；
   - 存量档在途的 collect 旧任务：读档时作废重掷一次（日志「门中差事已改制」）；在途普通 kill（非 danger）任务同样作废重掷，**在途 danger 任务保留**（type 不变可推进）。
6. verify-v23 增补：结交一次性 RB、连签 30 豁免 RB（含 gap=0 不空涨、gap=30 续签、真断标红仍走原路）、了断门槛 SA、心魔来源各 +N SA、genTask 白名单+SECT_W/FLAVOR 无 kill/collect 死配置 SA、存量 collect/普通 kill 任务作废 RB、**生死状线回归 RB（派系成员可接 danger 任务、elites 击杀可推进、提交双倍赏格；非派系成员永不接；入派当日 force 仍生效）**。旧套件中 结交/befriend/心魔/连签/差事/生死状 相关断言逐条修订。

**验收**：build 通过；`npm run test:v23` 与受影响旧套件绿；手测路径：闭关 30 日出关→签数为 7 的档位能续上七日满签。

---

### B3 · 周目纵深与终局去处

**目标**：世界时代随 5~6 年周目真正轮换；天骄榜可争夺；仙元有终局去向；闭关流不缺年味。

**改动点**：
1. **E243 时代时长重校**（world.js:103-121）：讲道 10→3、秘境 20→5、大战 30→6、灵潮 10→3、兽潮 15→5（3.5 节依据）；迁移 `_eraRecal37` 一步（3.6 表）。
2. **E244 天骄榜问剑**（rank.js + ui.js:1097）：
   - 新动作「问剑」：对身前一位发起强化切磋（胜负按 `NpcSys.npcCombatPower` 三档成算），日限 1 次（Daily.resetIfNew 单源），胜则榜序对调；
   - 新状态 `p.rankHonor`（3.6 表）；board() 排序键 = `realmIdx*4+layer + rankHonor 修正`；
   - 宗门大比魁首（sect.js:413-419）与雷台了断胜局折算榜上加成分，排名成为可运营资产；
   - ui 榜单渲染补问剑按钮、榜位变动标注（↑↓）。
3. **E246 仙元携往生**（reincarnation.js + xian.js）：
   - 转世确认页新增「携仙元往生」选项：本世仙元按 1000:1 折来世气运（cap +3）、2000:1 折悟性（cap +2），与轮回印记并行第二条遗产线（3.5 节依据）；转世落定即清零当世仙元（死货币闭环）；
   - 新状态 `p.pastXianyuan`（3.6 表），转世时读入新身；
   - xian.js:41-42 阶满指引 toast 处补「可于转世时携往生」一句（本会话亲读核实实际行号；:34 为已证道后的 `isDaozu` 拦截分支）；autocult.js:140 挂机目标口径复核不受影响。
4. **E247 节庆挂起补办**（game.js:405-414 afterAction 跨日补结 + festival.js）：
   - auto 分支遇互动节庆（上元/中元/除夕）不再就地从简结算，改挂 `p.pendingFestival = { id, day }`；
   - 出关后（非 auto dailySettle 或 enterGame）3 游戏日内弹「补办入口」走完整版（含除夕年兽战）；超期自动从简结算 + 日志「错过了」；
   - 与 E200 TowerSys.waitIdle 的四时机挂起语义互不冲突（塔内挂起优先，出塔再补办）。
5. **E252 大事覆写留痕**（world.js:145）：覆写 pending 前，旧事件按「观望未决」入年表 + 日志「第X年大事不了了之」。
6. verify-v23 增补：时代时长 SA、`_eraRecal37` 迁移 RB（旧档 until 收缩且只跑一次）、问剑夺位 RB、携仙元转世 RB（折算+清零+来世读入）、pendingFestival 补办 RB、覆写留痕 SA。旧套件 世界大事/转世/节庆 相关断言修订。

**验收**：build 通过；`node scripts/balance-sim.mjs` 复跑 EXIT=0（节奏体检确认 ≈3 年至飞升不回退）；`npm run test:v23` 与受影响旧套件绿。

---

### B4 · 装备与战斗深度（机制面扩容）

**目标**：装备「再升一级」偶尔改变打法，而非只涨数字；跳层赌约语义自洽。

**改动点**：
1. **E249 装备机制面**（forge.js + battle.js + status-fx.js）：
   - **套装技**（套装炼化三阶解锁，机制而非数值）：磐岩套「受击回真元 5%」、血河套「击杀叠攻 3%，战斗内至多 5 层」——battle.js 受击/击杀路径各一处钩子（复用 onEnemyHit 事件总线，v36 已归一的路径勿新增分叉）；
   - **词条位**（强化 +12 解锁一格）：forge.js 洗练侧新增机制词条池 4 枚——连击追击 20%、致命保命（每场一次保留 1 点气血）、击杀回血 8%、真元上限 +15%；入 Stat.compute 与 battle 消费端；
   - 后缀 fx 池（forge.js:346 六键）不扩结构，仅加两个道途联动词条（thorns→体修加成、execute→剑修终结联动）；
   - 装备实例新字段全 optional（3.6 表，零迁移）；ui 装备面板展示套装技/词条位（tooltip 级，不加新页签）。
2. **E269 跳层作废战斗豁免**（battle.js:2006-2012 end() + tower.js:331-336）：
   - 赌约应约路径给未打战斗打标 `B._voided = true`；end() 杀业豁免名单纳入 `_voided`，history 存档过滤之——未出手之战不再 +1 孽障/+2 魔性、战斗回顾不再显示「负/遁」；
   - 遁走路径（battle.js:1132）维持现状（真出手后的遁，记业合理）；注释写明语义边界。
3. verify-v23 增补：磐岩/血河套装技触发 RB、+12 词条位 SA、`_voided` 豁免 RB（孽障计数与回顾双检）。verify-v21/v22 战斗相关断言回归。

**验收**：build 通过；`npm run test:v23` 与受影响旧套件绿；战斗内手动验证套装技触发不产生重复结算（onEnemyHit 归一路径）。

---

### B5 · 存档与状态完整性（工程 P0）

**目标**：玩家付费投入不再蒸发；安全网真正滚动；剧情不因关页丢失。

**改动点**：
1. **E267 词缀星留档**（bag.js:239-253）：
   - keepAffix：`p.affixKept[id] = { affixes: { ...inst.affixes }, stars: { ...(inst.stars || {}) } }`；
   - restoreAffix：同步还原 `inst.stars`；**兼容两形态**（旧形态纯 affixes 对象照常识别）；
   - 迁移步把旧形态包一层（3.6 表，双保险）；
   - 回归断言：卸下→再穿，全属性深比对（affixes+stars+enhance 三元）零变更。
2. **E268 bak2 滚动快照接线（评审修订：须同步处置 60 秒新鲜度检查，否则接线等于没接）**——本会话亲读 `save.js:95-106`：autoSave 每次行动实时落盘（AutoCult 节流下每 2.5s 一写），「写前调用」读到的 auto.meta.ts 几乎恒 <60s，`save.js:79` 的 `if (Date.now() - cur.meta.ts < 60000) return;` 会把活跃/挂机会话的滚动拍**恒数拦截**。处方三件套：
   - `snapshotAuto()` 内部改造：区分**首拍/滚动拍**（`const first = !Game._snapAt;`）——60 秒新鲜度检查只约束首拍（保留 v30「跨会话快照上次会话」的原始语义），滚动拍绕过之。理由：滚动安全网的定义就是 bak2 与 auto 相差 ≤10 分钟，「刚写过」不是滚动拍的排除条件而是其常态；`Game._snapAt` 的 10 分钟节流（:71）与 E137 死档过滤（:78）保持不变；
   - 调用点一：`Save.autoSave()` 开头（写新 auto 前）调 `this.snapshotAuto()`——每动作触发，内部 10 分钟节流兜住频率；
   - 调用点二：game.js:358 enterGame 调用点保留，另起轻量 `setInterval(() => Save.snapshotAuto(), 600000)`（**参数顺序 fn 在前**）兜底纯挂机长会话（句柄存 Game，exit/清档时 clearInterval，防多开泄漏）。
3. **E272 章末演出中断补偿**（game.js enterGame）：读档后若 `q.ch` 对应 CHAPTERS 的 open 故事未 seen 且无境界追认在途（`realmIdx >= supR`），补播一次开篇（走 Story.play 只读链，E199 readonly 守卫天然防重入副作用）。
4. **E271 删重复键**：删除 game.js:732 的 `'act-wudao'`（保留 :569 首个定义）；check-actions 重复键静态检测防复发放 B8（与门禁强化同批）。
5. verify-v23 增补：stars 留档 RB（深比对）、**快照滚动 RB（覆盖活跃连续写入场景：连续 autoSave 间隔 <10 分钟只拍一次；距上次拍 ≥10 分钟时滚动拍成功且不被 60 秒新鲜度检查拦截；首拍跨会话语义不回归）**、开篇补播 RB、`affixKept` 旧形态迁移 RB。verify-v12/v14 词缀留档旧断言修订。

**验收**：build 通过；`npm run test:v23` 与受影响旧套件绿；手测：洗出 ★ 的装备卸下再穿，面板属性逐项不变。

---

### B6 · 沉浸演出与反馈接线

**目标**：五处死音效出声；两大终章仪式立住；静默损失通道点亮。

**改动点**：
1. **E232 五音效接线**：
   - shop.js buy/sell/convert（:43-101）成交 → `sfx('coin')`；
   - cave.js plant/water/harvest（:323-367）→ `sfx('plant')`；
   - festival.js fire（:38-40）开节 → `sfx('bell')`；
   - battle.js 意图为蓄力/杀招时（:2153 附近）→ `sfx('intent')`；
   - dungeon.js 本命合成 → `sfx('inherit')`（与 E239 同点）。
2. **E239 本命合成演出**（dungeon.js:394-406）：补 `UI.realmShow('精血为引，古宝认主——自此神魂相合。', '#b89a5a')` + `Ambience.sfx('inherit')` + `UI.announce('✦ 本命法宝 · 炼化功成 ✦','gold')`（规格压过灵兽蜕变 beast.js:335-337）。
3. **E238 坐化/转世演出**（game.js:427-450 + reincarnation.js）：gameOver 入弹窗前冷色 `UI.realmShow`（「灯火渐熄，天地忽远」）+ 低回音色；转世落定（新身初啼）暖色异象一镜。
4. **E234 虫害红点**（ui.js:275,288-290 dots()）：`const pest = ((p.cave && p.cave.plots) || []).some(pl => pl && pl.pested)`，并入 cave 与 'cave:farm' 通道。
5. **E277 离线聚灵窗口**（game.js:279-282）：离线折算按 rushDay 窗口剩余日补乘 ×1.5（「闭关/点燃后关游戏」不再白买）；离线小结修行行文案随乘数如实（引 FACTS 拼串，口径与 B8 的 offlineEff 对账协调——补乘时小结拆「基础/聚灵加护」两段）；balance-sim 复跑确认无新离线通道。**跨批契约（评审修订）：实施时把折算系数抽成具名常量 `const OFFLINE_EFF = 0.6`（窗口补乘因子独立具名，如 `rushMul`），保持 `offlineExp = Math.round(perRound / 3 * OFFLINE_EFF * rushMul * realDays)` 的可抽取形态——B8 的 offlineEff 门禁正则锚常量定义，若本条先行改掉 `* 0.6 *` 字面量而未具名，B8 门禁即失配**。
6. verify-v23 增补：五音效调用点 SA（grep 断言五类 sfx 各有 ≥1 消费点）、realmShow RB（坐化/本命/转世三幕）、pest 红点 RB、离线乘窗 RB。

**验收**：build 通过；`npm run test:v23` 绿；本批不单独跑 judge（演出肉眼验收统一 B9 定档）。

---

### B7 · 操作效率与口径统一

**目标**：高频操作去连点；玩家可见文案零内部黑话、零口径漂移。

**改动点**：
1. **E235 喂内丹 ×5**（beast.js:248-254 + ui.js:758）：`act-beast-feed-multi`（连喂五枚、升阶或内丹耗尽自停），内丹持有 >1 时与单喂并列；每击仍走 afterAction（渲染单次批量后统一）。
2. **E236 面额兑换批量**（shop.js:96-99 + ui.js:1198-1203）：convert 增 `×10` 与「全兑」两键（余额不足自动降档）。
3. **E237 散修红点（评审修订：方案定死，不留二选一）**：取 **`p.flags.sectDeclined` 单键方案**（弃 counters.sectVisit——依赖玩家点开宗门页，拒宗玩家恰恰不点，熄不了）。ui.js:298 现条件 `(!p.sect && p.realmIdx >= 1)` 改 `(!p.sect && p.realmIdx >= 1 && !p.flags.sectDeclined)`；**写入点**：拜入确认弹窗（game.js:593「一旦拜入，终身不可改投」）被取消时置 `p.flags.sectDeclined = true` 并 toast「江湖路远，散修亦自有散修的活法」；create() 默认与存量迁移见 3.6 表（realmIdx≥2 的存量散修一次性熄灭）。
4. **E255 聚灵窗口口径**（ui.js:719 + :2085）：显隐改复用 :647 的 inRushWin 判定；按钮文案「3 日内修炼 ×1.5」；手册 tip 同步改写。
5. **E233 黑话出清**：ui.js:785 删 `v19` 标签；:1197 改「上/中品灵石仅作大宗存储之用」；:1276 改「开炉需付工费，材料愈贵工费愈高」；:1554 改「贡献乃门中俸例，每日领赏以六桩为限」。
6. **E251 正解轮换**（festival.js:47-54 + world.js:318-324）：灯谜/收徒大会正解按年哈希轮换（复用黑市 goods 的 day-hash 轮子）；成算只作用于「答案被采纳后的奖励品质」第二层——消除「故意答错更优」逆选择；选项 primary 标记随正解走。
7. **E260**：ui.js:1626 注释改「每 TOURNEY_EVERY 年一届」。
8. **E261 黑市口径单源**：抽常量/单源短语「每月初一至初三开市三日」，ui.js:1459/1482/2106 三处统一引用 black.js isOpen（:9-10）口径。
9. verify-v23 增补：批量喂兽 RB、全兑 RB、散修红点条件 RB、聚灵窗口显隐 RB、正解年哈希轮换 SA（两年不同解）、黑市文案单源 SA。verify-v10/v15 相关 UI 断言修订。

**验收**：build 通过；`node scripts/check-actions.mjs` 绿（文案对账含新单源）；`npm run test:v23` 与受影响旧套件绿。

---

### B8 · 工程护栏与死重清理

**目标**：门禁不许静默绿；单一事实源归位；发布链自守。

**改动点**：
1. **E254 品阶兜底价单源**：`GameData.GRADE_FALLBACK` 上提（js/data/game-data.js），auction.js:45 / bag.js:279 / forge.js:174 / ui.js:1374 四处改引用；分解公式 `baseVal * 0.15 * (1 + enh * 0.2)` 一并单源（bag.js:280 与 ui.js:1375 双写消解）。
2. **E256 失败即红**（check-actions.mjs:67-84）：三处实现侧抽取 match 失败 push 报警而非跳过；offlineCap 锚点加 `realDays` 同行上下文限定（`/Math\.min\((\d+),[^)]*realDays/` 或行号邻域）。
3. **E253 offlineEff 第四对账点（评审修订：正则以 B6 改完后的最终形态为准）**：check-actions 增 `fact('offlineEff')` ↔ 实现值抽取——**优先锚 B6 E277 落地的具名常量 `OFFLINE_EFF\s*=\s*0\.(\d+)`**（数字→「六成」复用 cnRate 思路）；若实施时 B6 未按跨批契约具名、表达式仍为 `* 0.6 * realDays` 字面量，则正则按最终形态调整（不得沿用第一版 `\* 0\.(\d+) \* realDays` 盲写——E277 补乘窗口因子后该形态必失配）；验收前先 `grep -n "OFFLINE_EFF\|realDays" js/game.js` 核对实际形态再落正则；game.js:305 文案改引 `UI.FACTS.offlineEff` 拼串（照搬 ui.js:2119 拼串样式）；:88 汇总语改「四点对齐」。
4. **E271 防复发**：check-actions 增 Game.actions 对象字面量重复键静态检测（同文件同键 >1 即红）。
5. **E259 build 反向校验**（build.mjs:31-36 后）：递归收集 `js/**/*.js` 与 modules.json ORDER 求差集，非空 exit 1（新增模块忘登记即拒建）。
6. **E257 README 守卫与刷新**：
   - release.mjs 快照前守卫：README.md 必含 `当前版本 **v37`（`v${ver}`），不含即拒绝执行；
   - 根 README.md 全面刷新：`:4` v31→v37、`:69` 测试链描述（build+check-actions+22 verify 套）、`:77` 模块数 51、`:89` 缓存号口径——数字以 modules.json 与 package.json:18 实数为准；
   - releases/ 历史快照照纪律**不改不删**（v36 带着 v31 是既成事实，守卫只管未来）。
7. **E262 scripts 死重清理 + 根目录 `nul` 清除**（已亲读证实 16 文件在列）：删除 repro-v6/st1/st1b/drawer/zoom + smoke-v28（6 个，针对 v6~v28 早已修复的病灶）；shoot-v27~v36（10 个）合并为参数化 `scripts/shoot.mjs`（版本号+屏幕清单作参数）；`balance-sim.mjs:18`（本会话 grep 核实实际行号）写死 `?v=33` 改无 query（server.mjs:27 已 no-cache）。**根目录游离文件 `nul`**（git status `?? nul`，Windows 保留名事故产物，本会话 `ls -la nul` 实证 0 字节）一并删除——Windows 保留名需特殊语法（如 `del "\\\\?\\D:\\code\\javacode\\game\\nul"` 或 git-bash `rm nul`），删除后核对 `git status` 干净再进 UPDATE_NOTES；**保留** split.mjs（build.mjs:26 报错指引引用）、cf-prepare.mjs（package.json:28 postinstall 引用）、make-icons.mjs；删前 grep 全仓确认零引用。
8. **E258 verify-v10 X5 收缩**：删 :687 no-op 行与 :688 死变量 g2；标题「日限一次」改窗口口径；真实覆盖已在 verify-v22:452-467（RB B5）承接，v10 侧只留「×1.5 生效 + rushDay 落章」。
9. verify-v23 增补：GRADE_FALLBACK 四处引用 SA（`new Set(匹配).size===1`）、check-actions 元断言（注入漂移样例必红）、build 反向校验 RB（临时造孤儿模块实测拒建后还原）。

**验收**：
- `node scripts/build.mjs` 通过；临时造一个未登记 js 模块实测构建拒绝，还原后复跑通过；
- `node scripts/check-actions.mjs`：临时注入 `offlineExp` 0.7 漂移样例实测报警后还原（沿 v36 E231 惯例）；
- `node scripts/release.mjs` 以假版本号实测 README 守卫拒绝后还原（不真发布）；
- `grep -rn "repro-v6\|shoot-v2\|smoke-v28" package.json scripts/ tests/` 零残留引用；
- 受影响套件单跑绿。

---

### B9 · 版本收尾

**目标**：全量验收、落档、发布、提交——顺序固定，不得倒置。

**改动点**：
1. **verify-v23 定稿**：全套断言合库复核；文件头注释与实覆盖一致（v22 头注释失真教训在案）；`package.json` test:all 链确认含 verify-v23（B1 已接入）。
2. **全量回归**：`npm run serve` + `npm run test:all` **连续两轮全绿、0 控制台错误（EXIT=0×2）**。
3. **双审计终稿**：`node scripts/price-audit.mjs` 全路零报警（含本版新增：第四路卖值/贡献锚、第八路宗门兑换行+悬赏 collect 面）；`node scripts/balance-sim.mjs` EXIT=0（含新 gated 行：购买悟道链/听讲链/塔深爬）；两 docs 由脚本再生。
4. **文档落档**：`docs/update-notes/UPDATE_NOTES_V37.md`（含「已知取舍与削弱明示」节——如：听讲链仍 ≈1.8× 修炼日均贴带运行、E251 成算改奖励品质后答题收益方差变大等）；`docs/playbook.md` 同步玩法口径（问剑/套装技/感悟纯度/塔额度/结交一次性/连签豁免/携仙元）。
5. **judge 双视口六屏视觉验收 6/6**（覆盖 B6 三幕新演出 + B7 改版面板）。
6. **版本发布**：`npm run release -- v37`——脚本单源注入 `index.html` 缓存号 **?v=52→?v=53**、`sw.js` VERSION **fanren-wd-v11→fanren-wd-v12**，快照 `releases/v37/`（E257 新守卫要求根 README 版本行已先在 B8 刷至 v37）。
7. **最后一次性 commit**（post-commit 自动推 GitHub+Gitee 双仓库）。

**验收**：以上 1~6 每条各有可执行命令与预期输出，全绿方可执行第 7 条。

---

## 五、测试计划汇总

- **新增 `tests/verify-v23.mjs`**：B1 建骨架并接入 test:all，B2~B8 逐批增补，B9 定稿；断言覆盖（SA 静态/RB 浏览器行为两类，沿既有惯例）：感悟纯度三采样、insight 双池迁移（存量折 regen）与增发点单源（锚 `\.insight\s*=\s*Math\.min\(` 直写形态、白名单外零命中）、塔整场计日（入塔 +3、续层/败北/离塔不叠加）与额度归明日、SECT_EXCHANGE 四行门槛、bounty floor 口径、结交一次性与迁移、连签 30 豁免（含 gap=0 不空涨、真断仍归 1）、心魔来源与上限、genTask 白名单与 SECT_W/FLAVOR 无 kill/collect 死配置、生死状线回归（派系生成/elites 推进/双倍赏格/入派 force）、存量 collect 与普通 kill 差事作废重掷（danger 在途保留）、时代时长与 `_eraRecal37` 迁移、问剑夺位、携仙元转世、pendingFestival 补办、大事覆写留痕、套装技两枚、+12 词条位、`_voided` 杀业豁免、stars 留档深比对、快照滚动（活跃连续写入场景 + 首拍跨会话语义不回归）、开篇补播、五音效消费点、三幕 realmShow、虫害红点、离线乘窗、批量喂兽/全兑、散修红点（sectDeclined 三态：新档未拒亮/拒绝后熄/存量高境散修迁移熄）、聚灵窗口显隐、正解轮换、GRADE_FALLBACK 单源、check-actions 元断言、build 反向校验。
- **旧套件修订**：每批随改动 grep 关键词（悟道/感悟/层奖/悬赏/结交/心魔/连签/差事/世界大事/转世/节庆/词缀/聚灵/大比/黑市），受影响断言逐条随新语义修订；verify-v10 X5 按 E258 收缩。
- **门禁自证**：新增门禁（price-audit 第四路锚/第八路两行、balance-sim 三行、check-actions 第四点、release 守卫、build 反向校验）一律「注入坏样例实测命中 → 还原 → 终稿跑绿」三步走（v36 E220/E231 惯例）。

## 六、风险与回退

| 风险 | 缓解 |
|---|---|
| B1 经济重锚误伤正常玩法 | 三个新 gated 行 + 注入回滚验证；自然链（纯调息悟道）公式不动；跑偏即调底折系数 0.3→0.25 |
| 迁移链断裂清档（E127 教训） | 3.6 表逐项双同步；每批迁移步后手测「旧档读入 + 新档首刷」双路径；_migratedVersion 钳制 |
| B4 战斗钩子引发重复结算 | 只挂 v36 已归一的 onEnemyHit 事件总线，禁止新增分叉路径；套装技 RB 断言计数 |
| E243 时代收缩改变 balance-sim 世界线 | 迁移只收缩不延长；B3 验收含 balance-sim 复跑 |
| scripts 删文件误伤 | 删前 grep 零引用；split/cf-prepare/make-icons 白名单保留 |
