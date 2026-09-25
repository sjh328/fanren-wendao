# PLAN_V39 · v39「贯通」全方位大升级计划（定稿 · 主链接活 + 口径归一 + 经济收敛）

> 状态：**定稿**。六路审计由 v39 主计划会话完成并经评审/终审两轮复核，结论直接回填（B0 免重复）。
> 按 AGENTS.md 纪律：全部批次完成、`npm run test:all` 连续两轮全绿后才一次性 commit（post-commit 自动双推，中途绝不 commit）。
> 前置基线：v38「大衍」已发布（缓存号 ?v=54，SW fanren-wd-v13，js/ 基线 23733 行，模块 53 个，最大 E 号 E345）。
> 编号：**E346~E365** 共 20 条（E346~E348 主链修复与构筑生效 / E349~E350 战斗深化 / E351~E352 经济收敛 / E353~E356 经营修炼 / E357~E361 社交沉浸 / E362~E364 效率与 trim）。
> 实施纪律：每批完成即 `node scripts/build.mjs` 自检 + verify-v25 增量断言 + 受影响旧套件单跑；全量回归终局两轮。

---

## 〇、主题与目标

v38「大衍」铺开了十大系统与特点化贴片，六路深审的结论高度一致：**骨架扎实，但「最后一公里」大面积断裂**——三处 `!Story.active` 死链让夜袭在线结算/破誓清算/行权以武会友收尾三个 v38 功能整段永不执行；出战技能盘对 autoPilot 完全无效，盘构筑在放置主玩法里悬空；战斗结算卡自 v19 起从未真正显示；聚灵窗口 E314 的 3→4 日改版五处硬编码未收口；化身神识成本恒超感悟硬上限、九重永不可达；E314/E331 等 v38 更新说明宣称的机制实为死代码。经济侧则有一处结构性剪刀差：大额 sink 挂 3^r 而收入挂 3.8^r，后期装备线消费相对收入贬值 8.4×（node 复核 (3/3.8)^9=0.119），滑向死钱包。

v39 名为**贯通**：**不加任何新系统、新货币、新页签，把已铺开的贴片全部接活**——断链复活、构筑生效、口径归一、经济收敛；同时用两笔 trim（战斗账目单源/全仓收口）对冲深化增量。

七条总纲：
1. **活**（断链复活）：!Story.active 三处、探索掷点前置、 KarmaSys.add 死调用、convert 死旗标——「公示与实现脱节」清零；
2. **通**（构筑→放置主链）：技能盘接入 autoPilot、连击上限单源激活剑阵·纵横、盘序周天——auto 与手动同口径；
3. **实**（战报可信）：结算卡修活升格战报一屏、邪修播报单源、关键战入年表；
4. **衡**（经济收敛）：sinkCurve r≥6 段与收入同速、塔纳财折半分流、化身收益锚校准、balance-sim/price-audit 双门禁扩容；
5. **深**（既有系统再深化）：天劫四象对策、阵眼三连阵图、读招表扩容、道侣心事线、NPC 活性——全部在 E300~E345 机制上叠深化，不开新面；
6. **顺**（摩擦去除）：兵解九连弹窗并单屏、行权真一键、秘境连推、凝神双钮；
7. **紧**（防臃肿）：零新顶层页签、零新货币、零新顶层存档字段、代码增速 ≤15%（预估 ≈+5%）。

---

## 一、不做清单（防臃肿）

1. 不加新顶层页签；不加第七职业；不加新主线章；不动离线 0.6/120 日、悟道纯度 ρ、塔层奖额度、EXP 轴（全程 ≈3 游戏年至飞升不动）。
2. 新顶层存档字段 = 0（mercy/rerollSeq/rerolledDay/heartPool/from 等全部落既有对象子字段或会话内存，migrate 补默认）；新货币 = 0。
3. 修炼/闭关不合并不改名（只做成本翻倍 + 日均如实披露 + AutoCult 择优，见 E352）；挂起事项不做统一「待决栈」（E346 修复后各自可达）。
4. 声望机制阈值数值一律不动（priceMul 30/80、bountyBonus 30/80/150、firstMeetBoost 120、stat.js:174 rep≥60 九五折、explore.js:25 rep≥90 奇遇+5% 全维持）——E358 只统一显示口径；若实施中改任何机制阈值，属权益变动必须入「削弱/增益明示」并修 verify 断言。
5. 不做联网/云档；不重构渲染与存档框架；不做 tests/_runner 共享浏览器提速。
6. 塔深层不叠 E307 异变变奏（塔祝福池本版刚合并精简，先观测体感）。

---

## 二、主链修复与构筑生效（E346~E348，WP1）

### E346 · 动作收尾挂起链复活与聚灵窗口收口 【bugfix · P0】

- **死链×3**（已实读核实，js/game.js:92 为正确写法）：`js/game.js:504`（夜袭）、`js/game.js:510`（誓言清算）、`js/core/guide.js:267`（行权以武会友收尾）的 `!Story.active` 全改 `!Story.active()`（Story.active 是函数，js/ui/story.js:15）。
- **夜袭洞府守卫**：cave.js nightRaidCheck（约 :244）首行加 `if (!p.cave) return;`——堵死「cave=null 玩家被 :249 `p.cave = p.cave || {}` 建成仅含 _raidDay 退化对象 → cultBonus 读 p.cave.lv 得 NaN → 污染 stat.js 全线并落盘」链路（create 模板 cave:null 见 player-factory.js:71）。
- **聚灵窗口单源**（唯一正确实现在 cave.js:168 RUSH_WINDOW()=洞天一重时 4）：guide.js:168、game.js:291、ui.js:744-745 三处判定改消费 RUSH_WINDOW()；文案硬编码「3 日内」四处（guide.js:175/189、cave.js:191、ui.js:2283）改 `${WIN} 日内` 模板；guide.js:188 直写 p.rushDay 绕守卫 → CaveSys.spiritRush 增 `opts={ask:true}`，auto 模式跳弹窗但复用同一守卫与扣款代码，guide 改调 `spiritRush({ask:false})` 删直写。

### E364 · trim·战斗账目单源与死码清理 【trim】

1. `dealToEnemy(B, st, dmg, {src})` / `healMe(B, amt)` 两 helper：统一「扣血 + B.stats.src 记账 + bestHit 记账」与「治疗钳制」；收口现有 13 处伤害落账、8 处治疗钳制。
2. `end()` 签名清理：`this.end(false)` 死实参删除——实测 14 处（grep -c 核实，最后一批 :2320），以 grep 实测清单为准。
3. TowerSys.BUFFS 同键三档合并：twb_stone/stone2/stone3 与 twb_exp/exp2/exp3 六条并为两条带 `tiers:[{pct,weight}]`（-4）、twb_heal 三档并为一条（-2）——现池实测 28 条（grep `id: 'twb_'`=28），合并后 22 条；blessStep（tower.js:445）roll 词条再 roll tier，modsOf 乘算不变。
4. status-fx.js 头注释「§13 探索」错位：buildMonster（status-fx.js:2-43）迁往 explore.js 头部，status-fx 头注释改「§13.5 战斗状态效果」，纯搬家。
5. 闭关双结算链合并：seclude() 单轮入口改跑一轮 secludeLoop()（cultivate.js:291-341 vs :365-426 收敛为一份）。

### E347 · 技能盘构筑生效 【deepen】

1. **盘驱动 autoPilot**（battle.js:1618 现用全集择优）：`deck = p.battleDeck 过滤已修技能`；非空时候选限盘内、按 B.deckCursor 取盘序下一招（灵力不足顺延）、出招后游标前进——与手动循势（battle.js:1176-1181）同款；盘空回落全集（无盘玩家逐字节不变）。E315 双预设本体即 p.battleDeck（ui.js:1887 act-deck-swap 已核实），auto 天然尊重。
2. **连击上限单源**：`Battle.comboCap(p) = COMBO_MAX + suffixFx.comboUp + (hasPath(p,3,'comboCap2')?2:0)`（键名 game-data.js:977 已核实）；:254 comboMul、:1074 累积 cap、:1377 合击 comboFeed（现硬编码 min(5)）三处统一改调。剑阵·纵横上限 5→7（+28%），连山词缀对合击生效。
3. **盘序周天**：盘内 ≥4 招依盘序完整流转一圈（deckCursor 回绕）触发「周天流转」——下一手全伤 ×1.15（dealToEnemy 内读 `B._zhoutian>0`，回合末递减）+ 回 2 真元，每场至多 2 次；零新字段。

### E348 · 战报一屏 【deepen】

1. **结算卡修活**（battle.js:2219-2241 挂卡后 :2349-2350 被同 tick 清空+隐藏 modal，已核实）：victory() 改「先挂卡、延迟收场」——挂载后 await 玩家点击或 3.5s（极速 1.5s）再走 end()；**豁免旗标 `B._quick`**：秒胜路径（battle.js:157-170）与 autoPilot/静修挂机态的自动战斗一律置位跳过等待（否则挂机非秒胜场每场多等 1.5s），仅手动战斗保留展示。
2. 卡片升格两行：最佳一手 = st.bestHit（E364 helper 记账）；关键转折 = critN/破招N/读中N 三计数取最大者。
3. **邪修播报单源**：victory 尾日志（:2240）改引用 :2167 已算好的 extra 变量（修漏 shiHun 0.4 档）。
4. **关键战沉淀**：跨会话一律 Story.chron 年表（问剑/雷台了断/秘境守关/剧情战/夜袭守御五类）；会话内 Battle.history 条目（battle.js:2334-2337，**会话内存、注释明言不进存档**，全仓无 battleLog 字段）增 `from` 字段，回顾弹窗（game.js:648-656）渲染来由——不持久化、零新存档字段。

---

## 三、战斗深化（E349~E350，WP2）

### E349 · 读招洞察扩容与中性原则 + 爆发会伤 【deepen】

1. intentCounter（battle.js:891-898 现仅四类）扩容+`lenient` 语义：新增 `strike`（重击/直伤技）→ 解=【防御】或【破阵符】（fkind==='vuln'）；charge → acts=[defend,attack,skill-damage,ult]（破招泛化后抢断合法）+shield，lenient=false；finisher → [defend]+shield，lenient=false；敌疗/敌强化 → lenient=true；attack 意图维持无解不奖不罚。
2. evalInsight（:912-935）扣层收窄：仅 `!c.lenient` 时 miss 才 -1；读中 `B.morale=min(100, morale+5)`（强化读招→爆发链）。
3. **爆发会伤修正**：actBurst `if(crit) dmg*=1.7`（:951-953）改 `*= 1.7 * this.critDmgBonus(p)`，与普攻/法诀/必杀（:638/:1051/:1215）同口径。
4. 锚不变：E308 熟练期望 ≤+12%；普通 2~5 回合战可积 1~2 层、3~5 回合可满层。

### E350 · 战斗手感微修 【bugfix】

1. **破招泛化**：法诀/必杀首段会心同断蓄力（共用 counters.breaks + 0.5× 追加，现仅普攻会心可断 battle.js:1062-1072）；蓄力教学 toast（:1734-1740）改「【防御】卸其力，或抢在蓄满前以会心一击打断！」。
2. **凝神双钮**：actNingshen（:764-800 三步弹窗）拆 ningshenZY()/ningshenPurge() 两入口，主按钮行「凝 神」位换「换 气」「净 化」双钮（act-ning-zy / act-ning-purge，check-actions 登记），条件不满足置灰（真元满/战意不足/已用/被控），语义与原 popup 选项一致；移动端 mini 行同步。
3. **仙兵被控禁用**：xianbing（:983-997）加 stun/freeze 拦截（对齐 actNingshen :765 与必杀/本命按钮 :2441），`_xianbingUsed=true` 移到守卫后（被控不烧次数）。

---

## 四、经济数值收敛（E351~E352，WP3）

### E351 · sink 曲线收敛 + 第九路门禁 【balance】

1. **分段曲线**：`sinkCurve(r) = r<=5 ? 3^r : 243×3.8^(r-5)`（保留 floor(r) 整数化语义；原 `Math.min(10,…)` 封顶在 r≤9 境界轴下无实际影响，代码注释注明「封顶语义随境界轴弃留，后续增境须给 3.8^(r-5) 设界」）。node 复核：r9 强化+5(grade3) 从 0.77 日建模收入升至 ≈2.0 日，r10 稳定 ≈2.0 日；r≤5 逐字节不变。
2. **接缝口径（防误读）**：r5→r6 曲线值 243→923 为 **×3.80/境**（与收入 3.8^r 同速，即设计目标）；新曲线 r6 值 923 相对旧曲线 r6 值 729 的**同境增幅**为 ×1.27（923/729=1.266）。两个数字勿混——verify SA 断言只锁 `sinkCurve(3)===27` 与 `sinkCurve(9)===Math.round(243*Math.pow(3.8,4))`，不锁接缝比。
3. **随动面全清单（grep `sinkCurve(` 实测 12 处，削弱明示逐项列名）**：forge.js:44（强化）/：397（洗练）/：476（重铸）/：546（器魂匣）/：582（本命）、beast.js:346（灵兽蜕变 8000×sinkCurve/2.2）、beast.js:569（结契 5000×/2.2）、cave.js:26（聚灵升级）/：59（洞天升级）/：416（灵田营造）、auction.js:189（布施 priceOf）、gongfa.js:147（自创功法灵石段 2000×sinkCurve 全额无折减）。
4. **第九路「大额 sink 日数比带」**：逐境界样本（强化+5 grade3、洗练 grade3、本命升一阶、洞府升级三处、布施 large 档、灵兽蜕变、自创功法灵石段）÷ 日均收入（125×stoneEco）——r6~r10 每样本须在 **[0.3, 2.5] 日带**内、相邻境界比值变化 ≤1.3×，出带报警；先注坏样例（临时改回 3^r）证红再还原。**两处已知出带项的处置**（node 复算）：灵兽蜕变 r9 由 ≈3.5 日涨至 ≈8.9 日、自创功法灵石段 r9 由 ≈1.9 日涨至 ≈4.9 日——纳入采样清单并**在 price-audit 报告显式列名**：蜕变属十阶终局大项（一名额一锤子买卖）、自创属一世 3 部名额制，两处按「终局大额一次性消费」豁免出带并在报告中写明豁免理由，不许静默放行；若实施时改为调低这两处独立系数收敛入带，同步入削弱明示。
5. UPDATE_NOTES_V39「削弱明示」节逐项列名：强化/洗练/重铸/器魂匣/本命/结契/蜕变/自创功法/洞府升级三处/布施（r≥6 全部随动上调；r9 端约 ×1.85~2.6）。

### E352 · 日收益口径收敛 【balance】

1. **塔纳财折半**：tower.js 纳财档（:90-94，120×stoneEco/次×日限 2）改 60×stoneEco + 玄铁矿×4/次——塔日灵石吞吐 ≈340×eco→≈220×eco（≈1.76× 建模日均 125×eco）。
2. **闭关成本翻倍**：cultivate.js:290 30×stoneEco→60×stoneEco（0.24→0.48 日建模收入）；修炼/闭关两钮各加一行如实日均披露（修炼「日均 ≈1×，灵机机缘仅此出现」/闭关「日均 ≈1.6×，无机缘、越 30 日」）；AutoCult 择优不动。
3. **balance-sim 修正**（scripts/balance-sim.mjs）：:162 悟道自然链分母 `raw*2.5/10`→`raw*2.5/(10+r)`（回本周期=成本 20+2r ÷ 再生 2/日）；闭关行 sinkSeclude 30×eco→60×eco；**新增「塔纳财」独立行**（现状 :169 塔深爬行 stones=100×se 仅层奖摊销、纳财从未入模——新行 stones=120×se/日，层奖摊销列不动）。

---

## 五、经营与修炼深化（E353~E356，WP4）

### E353 · 经营摩擦减负 【pacing】

1. 拍卖 usable（auction.js:71-77）增估价上限过滤：`base×3.8^clamp(min(8,r)−gate,0,3)` > 25×日均收入（125×stoneEco）不掷（m_danfang r3 约 22 万 > 17.1 万被滤出，node 已复核）；池空回落原行为。
2. 换品：拍卖页「换 一 批」每期一次花 20×stoneEco——复用 seq 种子（:63 `hashStr('auction@'+day+'#'+seq)`），`p.auction.seq++` 重掷；子字段 p.auction.rerollSeq（migrate 补默认）。
3. 古匣 mysteryBase 0.85→0.95（:41-56）：稳健出价 EV≈−0.088×EV 转负，套利封死；price-audit 第十路「mystery 稳健 EV<0」检测。
4. 黑市 buyAsync（black.js:54-95）：首弹主按钮改「买 下（直购）」，还价成功直接成交（收据走 Log），删二次确认弹窗；赌袋不动。
5. shop.js:93-103 convert：`converted` 死旗标删除，tryOp 成功即 sfx('coin')，末尾补 Game.afterAction()（对齐 convertMulti/convertAll）。
6. 悬赏换一批：bounty.js 增 `reroll()`——每 3 日窗口一次免费重掷（子字段 p.bounties.rerolledDay，窗口 day 不变仅换 list），板加钮、已换置灰。

### E354 · 化身可达与锚校准 【bugfix】

1. 神识晋升成本：avatar.js:53 `cost=30*lv`（lv 为升级前等级）→ `Math.min(100, 20+lv*10)`（lv1→2 花 30 … lv8→9 花 100 封顶）——感悟硬上限 100（cultivate.js:79），旧式 lv4 需 120 永不可达；lv1→lv9 共 8 次晋升累计 **520 感悟 ≈260 日调息**，在化神→飞升 ≈540 日窗口内可达。
2. 收益锚：avatar.js:72 代主闭关日产改 `baseGain×(1+cultPct)×(16/30)×eff`——具名 AVATAR_CULT_DAY_RATE=16/30（主身闭关日均口径，cultivate.js:318）；满级 eff=0.75 恰 0.75× 硬锚。
3. **削弱如实披露**：收入侧实削——低神识等级日产约减半（eff=0.5 由 0.5×baseGain/日 降至 ≈0.267），「削弱明示」节列名。
4. **balance-sim「化身·闭关」行借校准一并对齐**：现状行公式（base/3×av 口径）与 avatar.js daily 实码（baseGain×(1+cultPct)×eff）本就存在口径分歧，改为 AVATAR_CULT_DAY_RATE×eff 同式；verify-v24:88 断言的是 eff 正则 `/Math\.min\(0\.75, 0\.5\+/`，E354 不改 eff 公式，**该断言保持绿、无需修订**。

### E355 · 天劫劫象对策 【deepen】

1. TRIB_OMENS 四象各加 `best`：雷→yu（御）、心→bi（避）、火/风→ying（应）。
2. 段结算匹配：对策===best → S.perfectN++ + 小惠（应=免当段气血、避=必成且免劫势、御=法宝磨损减半）；错配最差策 → 劫势+1；避成功成算补偿 +1%（S.biGood）。
3. 成算式（:260）计入 `yingN×2 + perfectN×1 + biGood×1 − stress×1.5`，**保持双层钳制语义**——内层偏差 ±8、外层 clamp(3,97) 原样；根基三档：perfectN≥3→【根骨如渊】、biN≥2 且 perfectN===0→【道基虚浮】；期望成算 ±3% 锚不变。
4. 挡劫明示：artifact 策先弹确认（列出将消耗的防具名+品阶，:20-29 取首件行为保留但可见）。

### E356 · 阵眼成阵 【deepen】

1. cave.js 新增 `formationPatterns(p)` 单源：3×3 行/列/对角同旗三连——聚灵三连=修炼+5%、御敌三连=夜袭胜算+10%、藏锋三连=减免下限 0.5→0.35 且额外−10%、敛息三连=虫害免疫；与 flagPower 叠乘，≤5% 档；布阵卡渲染阵图状态行。
2. 藏锋归乘区（修 E337 偏差）：cave.js:247 夜袭减免与 ui.js:651 洞府卡从 flagCount 改 flagPower（:214-219 带地载×1.3/周天×1.25），减免式 `3×(1−0.15×min(3, flagPower(p,'b_cangfeng')))`。

---

## 六、社交沉浸（E357~E361，WP5）

### E357 · 兵解筹备单屏 + 印记基线 【bugfix】

1. ui.js 新增 `UI.form({title,html,fields,confirm})` 多选弹窗组件（~60 行，走 _popupResolve 单例、ESC 兼容）。
2. reincarnation.js 兵解 8 处 await popup（:118/:186/:216/:237/:266/:273/:286/:299-307）并一张「轮回筹备」面板：预约（radio）/出身（radio）/劫难（check 0~3）/携仙元（check）一次确认，结算函数依次执行不动；交互 10+ 击→≤3 步。
3. create 后补设 `np.counters.marksStart = ReincarnationSys.readLegacy().marksEarned`（:363，在兵解奖励入账之后）——修一世报告恒 0。

### E358 · 誓约威慑闭环 + 声望档位显示统一 【bugfix】

1. 宽恕限次：oath.js「守住誓言」分支加 `p.oaths.mercy`，每誓一世限 2 次、每次气运−5；第 3 次再犯只剩「破誓担劫」（清贫散财履约不算宽恕）。
2. 散财声望实发：oath.js:118 `KarmaSys.add`→`RepSys.add(p,1,'散财行善')`（RepSys.add 自带清贫 ×1.5，文案括注「誓约加成后 +1~2」）。
3. **声望档位显示统一**（机制数值一律不动）：RepSys.LEVELS（karma.js:59-66，现 -100/-30/0/30/80/150 六档、**无 120 档**）——80 档 name 改「声名鹊起」+ **新增** `{min:120, name:'名动一方', color:'gold'}`（150 威震天下顺延末档）；顶栏 repChip（ui.js:114）与义声卡（ui.js:1237）改读 LEVELS 单源渲染。**声望机制消费点实为六处**（实读核实，对账勿误改）：LEVELS 显示表、priceMul 30/80（karma.js:83-88）、bountyBonus 30/80/150（:89-95）、firstMeetBoost 120（npc.js:294-299）、stat.js:174 rep≥60→shopDiscount+5（E312 九五折实装点）、explore.js:25 rep≥90→奇遇+5%——义声卡真正错的只有两处：40（应对齐 bountyBonus 的 30）与「120 名动一方」档名冲突（现 80 档占用该名）；60/90 两行与机制一致**保持不动**。npc.js:294-299 的 120 加注释指向 LEVELS 120 档（值不改）。

### E359 · 探索天时复活 + 仙界氛围 【bugfix】

1. explore.js：pickWeighted（:32）移到天时/深耕修正（:37-42 雾日×1.5/隆冬×0.9/兽潮×1.3/深耕+deepTier×3）之后——四条死机制复活，E331 公示兑现。
2. FLAVOR.ambience 补 xianhai/xianhai2 两池各 4 条（现 11 池止于 leiyu，新图取 undefined 跳过，explore.js:108-111 消费点已核实）。
3. WORLD_REACTIONS.preach 首条双 {name} 改单占位（game-data.js:546）。
4. balance-sim 探索行备注期望微升（<5%）。

### E360 · NPC 活性包 【deepen】

1. 同门之谊：NPCS sect 字段（青云 4/丹霞 3/万宝 4/磐岩 2/周天 2，现零消费）接线——初见同门 rel+5、论道/切磋 +1 感悟/战意、江湖行「同门」tag。
2. 共历折好感：joinEvent 结算尾与夜袭胜利尾，rel≥30 且 <90 随机 1~2 名 rel+2 + mem 共御条目。
3. 大比 NPC 化：sect.js 大比对手（:421-436 一线）从本宗 NPC 取材，敌式复用 npc.js:315 npcCombatPower（E282 对齐基式）；魁首 lineFor 贺语+mem。
4. 复制句清退（trim）：NPC_LINES n10~n24 gift 第三档同句 16 行删除（grep 实测），回落 temper 池（npc.js:722→:55-58）。
5. 血亲拦截：beast.js:558-559 追加同父母判断（lineage 共享亲代 id 即拦截）。

### E361 · 道侣心事线 【deepen】

结发（npc.js:605 rel=100）后 rel 溢出 delta 改记 `p.npcs[id].heartPool`；每 10 点推进一段心事（三段：旧物→协战攻击+3% / 心结→双修感悟+1 / 同修之约→双修修为+5%，≤5% 档，popup 二选+mem+chron）；三段毕后不再播报虚假「交情 +N」（:740/:794 改「情意愈笃」）。

---

## 七、效率收尾与门禁（E362~E365，WP6）

### E362 · 行权真一键 + 秘境连推 【pacing】

1. 三态偏好推广（E205 范式）：行权小账（guide.js:259-265）挂 fanren_wd_damode；悟道步骤（guide.js:253→cultivate.js:172-176）挂 fanren_wd_wudao（always=纯度 ≥30% 自动执行）；skip/不足时小账记「悟道：今日未行」——行权 0 强制弹窗。
2. 秘境连推（E324 骨架）：dungeon.js treasure/fortune/trap 自动结算（trap 前血量<35% 停），battle/boss/npc 必停；开关在秘境卡默认关。

### E363 · 机制可见化 【immersion】

1. chips（ui.js:167）增六枚：寻宝灵机/聚灵窗口余日/演武待发/万宝必成/誓言在身/化身差事中——全读既有状态。
2. dots()（ui.js:269-303）增三键：oath/title/avatar。
3. 身份卡合一：renderOathCard+renderTitleCard（ui.js:683-686/:704-712）并一张折叠卡，修炼页 9→8 卡。
4. 奇市红点：ui.js:281 `<=10`→`<=3`。

### E364（见第二节）/ E365 · trim·全仓单源收口 【trim】

1. Bag.stonesTotal(p) 单源收口内联 `low+mid*100+high*10000`（审计列 9+ 处，实施 grep `mid \* 100` 全量清点），QuestSys/OathSys 版转调。
2. 速达卡（ui.js:715-732）与 M_QUICK_CELLS（ui.js:341-347）单源。
3. 三分钟上手（tutorial.js:57-65）与手册首节（ui.js:2271-2279）同源。
4. 秘境 76 字规则上提页头（ui.js:1095）。
5. craft.js 三修：:101 恒真子句删；:227 试方 luck 改 `Stat.compute(p).luck+fortune/20`；:173-178 drawMult 死阶梯删（成本恒 1×）。
6. cultivate.js:418 熔断 layerNeed→layerNeedT。
7. wrapDanger（sect.js:120-132）缩为 force 直掷单支（genTask 已内置生死状支）。
8. tower.js redeem 双重余额校验：**删 popup 前那次（:79）、保留 popup 后复查（:86）**——后者是防 popup 等待期间余额变化的防御（对齐 C4 双开防护语义）。
9. exitToStart（game.js:448）清 `Game._snapAt`（bak2 首拍重臂）。
10. 根目录 nul 删除 + build.mjs 收尾 `try{fs.rmSync('nul',{force:true})}catch{}` 防复发。

---

## 八、数值与门禁依据

| 项 | 硬锚 |
|---|---|
| E347 连击 | 上限 5→7（剑阵·纵横），三处读点单源 |
| E349/E350 | E308 ≤+12% 锚不破；爆发 = 1.7×critDmgBonus |
| E351 sink | r≤5 逐字节不变（SA）；r6~r10 日数比带 [0.3,2.5]、相邻 ≤1.3×；蜕变/自创两处显式列名豁免；接缝比勿入断言 |
| E352 | 塔日吞吐 ≤240×eco；闭关 60×eco；悟道分母 10+r |
| E354 | 九重累计 520 感悟可达；满级恰 0.75×；中低级实削披露 |
| E355 | 期望成算 ±3% 锚不变；内层 ±8/外层 clamp(3,97) 双层钳制保持 |
| E356/E361 | 新特点单条 ≤5% 档 |
| 全局 | 行数 ≤27293（+15%）；顶层新字段 0；新货币 0；新页签 0 |

## 九、存档迁移（PlayerFactory 双同步）

| 项 | 新状态 | 迁移 |
|---|---|---|
| E353 | p.auction.rerollSeq | migrate 补默认 0 |
| E353 | p.bounties.rerolledDay | migrate 补默认 |
| E357 | counters.marksStart（create 补设） | create 逻辑，零迁移 |
| E358 | p.oaths.mercy | migrate 补默认 {} |
| E361 | p.npcs[].heartPool/heart | migrate 补默认 |
| E348 | Battle.history.from | 会话内存，零迁移 |
| E362 | amb 偏好键 ×4 | 设置键，零迁移 |

顶层新字段合计 **0 个**。

## 十、批次计划

- **B0**（已完成）：六路审计 + 评审 + 终审，结论回填本稿。
- **B1 = WP1**：E346→E364→E347→E348（地基与主链）。
- **B2 = WP2**：E349、E350（战斗深化）。
- **B3 = WP3**：E351、E352（经济收敛，含 balance-sim/price-audit 扩容先行证红）。
- **B4 = WP4**：E353→E354→E355→E356（经营修炼）。
- **B5 = WP5**：E357~E361（社交沉浸）。
- **B6 = WP6**：E362、E363、E365 + verify-v25 定稿 + 门禁汇总 + 文档落档 + release。

## 十一、测试计划

- **verify-v25**（新套件，≥70 断言，接入 test:all 链尾，链长 25→26 步）：各包断言清单见对应 WP detail；SA 必含——无 `!Story.active ` 残留、无 `today - p.rushDay < 3` 残留、end() 无参、全仓无 battleLog 新字段、sinkCurve(3)=27 与 sinkCurve(9)=Math.round(243×3.8^4)（**不锁接缝比**）、mysteryBase 0.95、AVATAR_CULT_DAY_RATE 具名、义声卡/repChip 无 LEVELS 外散写档名。
- **旧套件修订**：verify-v16:34-37 SA7（结算卡新形态）、v16 塔池断言（合并后 22 条）、v22 SA94a/RV10（窗口 4 日）、v3/v6（闭关 60×eco）、v10/v21（纳财折半）、v24:88 **保持绿不动**（eff 正则未改）、v24:122-124（E308 新表）、verify-game T12（根基三档）、v14/v15（誓约/兵解面板/引导弹窗）。
- **门禁自证**：第九路/第十路注入坏样例实测命中→还原→终稿跑绿；balance-sim 新行（悟道 10+r 分母/闭关 60×eco/塔纳财新增行/化身行对齐）全 EXIT=0。

## 十二、验收清单（Definition of Done）

1. `node scripts/build.mjs` + `node scripts/check-actions.mjs` 绿；
2. `npm run test:all`（26 步）连续两轮 EXIT=0、0 控制台错误；
3. price-audit 十路全零（含两处出带项显式列名豁免理由）；balance-sim EXIT=0；
4. verify-v25 ≥70 断言在链；受影响旧套件全修订绿；
5. 防臃肿账：行数 ≤27293、顶层新字段 0、新货币 0、无新页签；
6. UPDATE_NOTES_V39（含削弱明示逐项列名：sink 随动 12 处、纳财折半、闭关翻倍、化身中低级实削、宽恕限次）/ PLAN_V39 / playbook v39 / README 四口径 / ?v=55 / SW fanren-wd-v14 / releases/v39 落档；
7. 一次性 commit（自动双推 + Cloudflare 部署）。
