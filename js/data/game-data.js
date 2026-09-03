
/* ======================================================================
 * §2 静态数据
 * ====================================================================== */
const GameData = {

  /* ---------- 境界体系 ---------- */
  REALM_NAMES: ['练气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫', '真仙'],
  LAYER_NAMES: ['初期', '中期', '后期', '圆满'],
  /** v9 阶梯突破：冲关此境界（含）起方引动天劫；练气→筑基为静修冲关（无天劫）。
   *  目标境界越高，劫威与成算折损越高——天劫难度随修为水涨船高。 */
  TRIB_START: 2,
  /** 每个大境界第 1 层所需修为（后续层数乘以 LAYER_MULT） */
  EXP_BASE: [70, 320, 1500, 7000, 32000, 150000, 700000, 3200000, 15000000, 70000000],
  LAYER_MULT: [1, 1.5, 2, 2.5],
  /** 各境界寿元上限（岁） */
  LIFESPAN: [120, 240, 500, 1000, 2000, 4000, 8000, 16000, 32000, 99999],
  GRADE_NAMES: ['凡级', '灵级', '玄级', '地级', '天级', '仙级'],
  ATTR_NAMES: { gen: '根骨', comp: '悟性', luck: '福缘', body: '体魄' },
  ATTR_DESC: {
    gen: '影响攻击与出手身法',
    comp: '影响修炼效率与突破机缘',
    luck: '影响暴击、掉宝与奇遇',
    body: '影响气血、防御与丹毒上限',
  },
  /** 修为经济系数：各系统的修为产出按此随境界同步放大，保证节奏一致 */
  eco(r) { return Math.pow(4.6, r); },
  /** 灵石经济系数 */
  stoneEco(r) { return Math.pow(3.8, r); },
  layerNeed(realmIdx, layer) {
    return Math.round(this.EXP_BASE[realmIdx] * this.LAYER_MULT[layer]);
  },

  /** v18：种族克制系数（1=克制，0=被克，-1=中立） */
  speciesRelation(attackerSpecies, defenderSpecies) {
    const order = this.BALANCE.SPECIES_COUNTER.order;
    const idx = order.indexOf(attackerSpecies);
    const defIdx = order.indexOf(defenderSpecies);
    if (idx < 0 || defIdx < 0) return 0;
    // 克制：攻击方克制防御方（idx 的下一个是 defIdx）
    const next = (idx + 1) % order.length;
    if (next === defIdx) return 1;
    // 被克：防御方克制攻击方（defIdx 的下一个是 idx）
    const nextDef = (defIdx + 1) % order.length;
    if (nextDef === idx) return -1;
    return 0;
  },

  /* ---------- v18 数值常量集中配置 ---------- */
  BALANCE: {
    // 战斗
    COMBAT: {
      AFTER_DEF_DENOM: 140,       // 防御减伤常数：atk * (1 - def/(def + 140))
      DMG_RAND_MIN: 0.85,         // 伤害随机下限
      DMG_RAND_MAX: 1.15,         // 伤害随机上限
      CRIT_MULT: 1.7,             // 暴击倍率
      ENEMY_CRIT_MULT: 1.6,       // 敌方暴击倍率
      HIT_CHANCE_CLAMP: [2, 35],  // 命中率钳制
      PLAYER_MISS_MAX: 35,        // 玩家失手上限
      ENEMY_DODGE_MAX: 65,        // 敌方闪避上限
      BLOCK_REDUCTION: 0.45,      // 格挡后伤害系数
      DEFEND_REDUCTION: 0.4,      // 防御姿态伤害系数
      MORALE_PER_POINT: 0.004,    // 每点战意伤害加成
      MORALE_MAX: 100,            // 战意上限
      COMBO_PER_LAYER: 0.04,      // 每层连击伤害加成
      COMBO_MAX: 5,               // 连击上限
      GUARD_DEF_BASE: 40,         // 铁壁基础防御加成%
      FLEE_BASE: 45,              // 遁走基础成功率
    },
    // 突破
    BREAKTHROUGH: {
      BASE_CHANCE: 40,            // 基准成算
      COMP_FACTOR: 2,             // 悟性系数
      FORTUNE_FACTOR: 0.2,        // 气运系数
      KARMA_FACTOR: 0.2,          // 孽障系数
      BODY_MULT: 1.4,             // 体修渡劫加成
      SWORD_MULT: 0.77,           // 剑修渡劫惩罚
      STREAK_BONUS_MAX: 15,       // 连败保底上限
      QUIET_CULT_BONUS: 15,       // 静修冲关加成
      REALM_PENALTY_PER: 0.035,   // 每境界劫难折损
      REALM_PENALTY_MIN: 0.5,     // 劫难折损下限
      REALM_PENALTY_MAX: 1.0,     // 劫难折损上限
      FAIL_HP_RETAIN: 0.1,        // 失败保留气血比例
      FAIL_EXP_RETAIN: 0.6,       // 失败保留修为比例
      FAIL_INSIGHT_GAIN: 15,      // 失败获得感悟
      HARD_MULT: 0.82,            // 硬抗系数
      ARTIFACT_MULT: 1.3,         // 法宝系数
      HIDE_MULT: 1.0,             // 借地系数
    },
    // 属性上限
    STATS: {
      ATTR_MAX: 10,               // 先天属性上限
      CRIT_MAX: 75,               // 暴击率上限
      DODGE_MAX: 35,              // 闪避率上限
      BLOCK_MAX: 60,              // 格挡率上限
      POISON_BASE: 60,            // 丹毒基础上限
      POISON_BODY_FACTOR: 8,      // 体魄丹毒系数
      POISON_REALM_BONUS: 20,     // 合道丹毒上限加成
    },
    // 驯服
    TAME: {
      BASE_RATE: 45,              // 驯服基准成功率
      LUCK_FACTOR: 2,             // 福缘系数
      RATE_MIN: 8,                // 成功率下限
      RATE_MAX: 90,               // 成功率上限
      SKILL_FACTOR: 10,           // 驯熟练度每多少点+1%
      HP_THRESHOLD: 0.2,          // 可驯服血量阈值
      TAMEABLE: ['beast', 'snake', 'swarm', 'plant', 'element'],
    },
    // 修炼
    CULTIVATE: {
      BASE_GAIN_FACTOR: 12,       // 基础修为：12 + 悟性*2
      COMP_FACTOR: 2,
      REALM_GROWTH: 4.6,          // 每境界修为放大系数
      LAYER_GROWTH: 0.15,         // 每小层修为加成
      SECLUDE_MULT: 1.6,          // 闭关倍率
      SECLUDE_MAX_ROUNDS: 120,    // 最大闭关轮数
      AUTO_CULT_SPEED: 280,       // 自动修炼间隔 ms
      EVENT_CHANCE: 8,            // 灵机事件触发概率%
      EVENT_SURGE_MULT: 2.5,      // 灵气潮涌倍率
      EVENT_EPIPHANY_MULT: 1.5,   // 醍醐灌顶倍率
      EVENT_HEART_MULT: 0.55,     // 心魔滋扰倍率
    },
    // 经济
    ECONOMY: {
      ECO_BASE: 4.6,              // 修为经济基数
      STONE_ECO_BASE: 3.8,        // 灵石经济基数
      SELL_RATIO: 0.4,            // 出售价比例
      SHOP_FLUCTUATION: 0.2,      // 坊市行情波动±
      BOUNTY_DAYS: 2,             // 悬赏保留天数
      BLACK_MARKET_INTERVAL: 30,  // 黑市间隔
      BLACK_MARKET_DURATION: 3,   // 黑市持续天数
      BLACK_MARKET_PRICE: 1.6,    // 黑市价格倍率
    },
    // v18 种族克制：七族循环克制，克制时 +15%伤害
    SPECIES_COUNTER: {
      order: ['beast', 'plant', 'element', 'ghost', 'human', 'construct', 'swarm', 'snake'],
      bonus: 0.15,
    },
    // v18 装备词缀（前缀数值 + 后缀特效）
    AFFIXES: {
      prefix: [
        { id: 'sharp', name: '锋锐', slot: 'weapon', bonus: { atkPct: 8 }, desc: '攻击+8%' },
        { id: 'keen', name: '凝神', slot: 'weapon', bonus: { crit: 5 }, desc: '暴击+5%' },
        { id: 'sturdy', name: '坚韧', slot: 'armor', bonus: { defPct: 8 }, desc: '防御+8%' },
        { id: 'vital', name: '生机', slot: 'armor', bonus: { hpPct: 8 }, desc: '气血+8%' },
        { id: 'swift', name: '迅捷', slot: 'accessory', bonus: { spdPct: 8 }, desc: '身法+8%' },
        { id: 'lucky', name: '灵韵', slot: 'accessory', bonus: { dodge: 5 }, desc: '闪避+5%' },
        { id: 'fort', name: '磐石', slot: 'any', bonus: { block: 5 }, desc: '格挡+5%' },
        /* ---- v19 词缀扩池 ---- */
        { id: 'pojun', name: '破军', slot: 'weapon', bonus: { atk: 40 }, desc: '攻击+40' },
        { id: 'yugu', name: '玉骨', slot: 'armor', bonus: { def: 30 }, desc: '防御+30' },
        { id: 'guixi', name: '龟息', slot: 'armor', bonus: { hp: 300 }, desc: '气血+300' },
        { id: 'tongming', name: '通明', slot: 'accessory', bonus: { crit: 3, dodge: 3 }, desc: '暴击+3%，闪避+3%' },
        { id: 'juling', name: '聚灵', slot: 'any', bonus: { cult: 4 }, desc: '修炼效率+4%' },
      ],
      suffix: [
        { id: 'leech', name: '吸血', slot: 'weapon', desc: '攻击时回复10%伤害的气血', onHit: { leech: 0.1 } },
        { id: 'execute', name: '斩杀', slot: 'weapon', desc: '对血量低于20%的敌人伤害+25%', onHit: { execute: 0.25 } },
        { id: 'thorns', name: '反伤', slot: 'armor', desc: '受击时反弹15%伤害', onHurt: { thorns: 0.15 } },
        { id: 'shield', name: '护盾', slot: 'armor', desc: '战斗开场获得金光护体（减伤10%，两回合）', onStart: { shield: 0.1 } },
        { id: 'regen', name: '回灵', slot: 'accessory', desc: '每回合回复5%灵力', onTurn: { mpPct: 5 } },
        { id: 'combo', name: '连击', slot: 'accessory', desc: '连击上限+2', onHit: { comboUp: 2 } },
        /* ---- v19 词缀扩池 ---- */
        { id: 'duopo', name: '夺魄', slot: 'weapon', desc: '攻击时回复18%伤害的气血', onHit: { leech: 0.18 } },
        { id: 'jingji', name: '荆棘', slot: 'armor', desc: '受击时反弹22%伤害', onHurt: { thorns: 0.22 } },
        { id: 'ningqi', name: '凝气', slot: 'accessory', desc: '每回合回复8%灵力', onTurn: { mpPct: 8 } },
        { id: 'lianshan', name: '连山', slot: 'weapon', desc: '连击上限+3', onHit: { comboUp: 3 } },
      ],
    },
    /* ---------- v19 数值说明书（平衡设计意图） ----------
     * · 修为曲线：EXP_BASE 每境 ×4.6 左右，产出端 eco=4.6^r 同步放大——单位时间进度与境界无关，
     *   实际节奏由行动频率决定；溢出修为折半带入新境，杜绝刷层浪费。
     * · 灵石曲线：stoneEco=3.8^r 略慢于修为——后期灵石相对紧俏，消费端（拍卖/布施/喂养/营造）
     *   按 2.2^r 定价吸收通胀。
     * · 战斗：afterDef 分母 140 使防御收益在 def≈atk 时约五成减伤；闪避钳 35%、暴击钳 75%
     *   防极端构筑；精英词缀与 Boss 二阶段补偿后期数值碾压。
     * · 渡劫：基准 40+悟×2，气运/孽障 ±0.2/点，静修+15%；三策期望拉平（硬抗低方差/法宝高成本/
     *   借地孽障代价），劫威随境界 ×0.965^r 软化，连败保底 +5%/次（上限 15%）。
     * · 剧情/养成联动：残玉共鸣 +1.5%全属性/章、心魔凝练 +1%/次、本命喂养 +1%/阶、个人线 2~5%——
     *   合计上限约 +25%，与装备强化（+10%/级×三件）并行不重叠。 */
    // 强化
    ENHANCE: {
      MAX_LV: 10,                 // 强化上限
      PER_LV_BONUS: 0.1,          // 每级属性加成
      DROP_LV_THRESHOLD: 7,       // +7起失败掉级
      DROP_LV: 1,                 // 失败掉级数
      BASE_COST: 120,             // 强化基础灵石
      COST_PER_LV: 90,            // 每级灵石增量
      COST_GRADE_FACTOR: 0.8,     // 品质系数
      COST_REALM_FACTOR: 2.4,     // 境界系数
    },
  },

  /* ---------- 物品注册表（丹药 / 功法 / 法宝 / 材料） ----------
   * use: 丹药效果；bonus: 功法加成 [基础值, 每级增量]；
   * slot: 法宝槽位 weapon/armor/accessory；tier: 材料档次
   */
  ITEMS: {
    /* ---- 丹药 ---- */
    pill_juqi:     { name: '聚气丹',   type: 'pill', grade: 0, price: 60,     desc: '凝聚散逸灵气，服之可得六十点修为。', use: { exp: 60 }, poison: 6 },
    pill_ningqi:   { name: '凝气丹',   type: 'pill', grade: 1, price: 220,    desc: '筑基修士常备丹药，服之可得二百四十点修为。', use: { exp: 240 }, poison: 14 },
    pill_peiyuan:  { name: '培元丹',   type: 'pill', grade: 1, price: 550,    desc: '温养元气，服之可得六百点修为。', use: { exp: 600 }, poison: 25 },
    pill_pojing:   { name: '破境丹',   type: 'pill', grade: 2, price: 1800,   desc: '药力霸道，服之可得两千点修为，丹毒颇深。', use: { exp: 2000 }, poison: 45 },
    pill_jiuzhuan: { name: '九转金丹', type: 'pill', grade: 3, price: 13000,  desc: '丹中极品，服之得一万五千点修为。', use: { exp: 15000 }, poison: 60 },
    pill_taichu:   { name: '太初神丹', type: 'pill', grade: 4, price: 70000,  desc: '蕴含太初之气，服之得八万点修为。', use: { exp: 80000 }, poison: 75 },
    pill_zaohua:   { name: '造化仙丹', type: 'pill', grade: 5, price: 350000, desc: '夺天地造化，服之得四十万点修为。', use: { exp: 400000 }, poison: 90 },
    pill_zhuji:    { name: '筑基丹',   type: 'pill', grade: 2, price: 5000,   desc: '冲击瓶颈至宝，服之顿悟，突破感悟 +50。', use: { insight: 50 }, poison: 10 },
    pill_liaoshang:{ name: '疗伤丹',   type: 'pill', grade: 0, price: 80,     desc: '止血生肌，恢复六成气血。', use: { hpPct: 60 }, poison: 2, battle: true },
    pill_huiling:  { name: '回灵丹',   type: 'pill', grade: 0, price: 60,     desc: '凝神静气，恢复八成灵力。', use: { mpPct: 80 }, poison: 2, battle: true },
    pill_jiedu:    { name: '解毒丹',   type: 'pill', grade: 0, price: 120,    desc: '化解丹毒四十点。', use: { curePoison: 40 }, poison: 0, battle: true },
    pill_xisui:    { name: '洗髓丹',   type: 'pill', grade: 2, price: 0,      desc: '洗涤经脉，随机先天属性 +1（上限十点）。', use: { stat: 1 }, poison: 20, battle: false },
    /* ---- v13 新增：战斗增益丹（战斗中使用，临时增益）与高阶丹药 ---- */
    pill_kuangbao: { name: '狂暴丹',   type: 'pill', grade: 2, price: 1200,   desc: '药力霸道，战斗服之气血贲张——攻击 +30%，持续三回合（战斗中可用）。', buff: { atkPct: 30, rounds: 3 }, poison: 12, battle: true },
    pill_tiegu:    { name: '铁骨丹',   type: 'pill', grade: 2, price: 1000,   desc: '服之筋骨如铁——防御 +40%，持续三回合（战斗中可用）。', buff: { defPct: 40, rounds: 3 }, poison: 10, battle: true },
    pill_qingshen: { name: '轻身丹',   type: 'pill', grade: 1, price: 800,    desc: '服之身轻如燕——身法 +30%、闪避 +10%，持续三回合（战斗中可用）。', buff: { spdPct: 30, dodge: 10, rounds: 3 }, poison: 6, battle: true },
    pill_mingmu:   { name: '明目丹',   type: 'pill', grade: 1, price: 800,    desc: '服之目若朗星——暴击 +12%，持续三回合（战斗中可用）。', buff: { crit: 12, rounds: 3 }, poison: 6, battle: true },
    pill_dahuan:   { name: '大还丹',   type: 'pill', grade: 3, price: 6000,   desc: '续命奇丹，气血尽复，兼化二十点丹毒。', use: { hpPct: 100, curePoison: 20 }, poison: 15, battle: true },
    /* ---- v19 丹方残页系（参悟失传丹方后可炼） ---- */
    pill_huiyuan:  { name: '回元丹',   type: 'pill', grade: 4, price: 26000,  desc: '气血灵力一夜尽复——断续之伤亦能弥合。', use: { hpPct: 100, mpPct: 100 }, poison: 22, battle: true },
    pill_potian:   { name: '破天丹',   type: 'pill', grade: 4, price: 30000,  desc: '以命火淬道心，突破感悟 +80。', use: { insight: 80 }, poison: 25 },
    pill_poxu:     { name: '破虚丹',   type: 'pill', grade: 4, price: 36000,  desc: '凿窍开脉，四维属性随机 +1。', use: { stat: 1 }, poison: 28 },
    pill_qingxin:  { name: '清心丹',   type: 'pill', grade: 1, price: 500,    desc: '宁神定魄，服之可解束缚、缓滞诸般禁制（战斗中可用，解除自身负面状态）。', use: { purge: 1 }, poison: 0, battle: true },
    pill_posha:    { name: '破煞丹',   type: 'pill', grade: 2, price: 2400,   desc: '药力如破军煞气，服之可得五千点修为。', use: { exp: 5000 }, poison: 50 },
    pill_xuanling: { name: '玄灵丹',   type: 'pill', grade: 3, price: 9000,   desc: '玄灵蕴道，服之突破感悟 +25。', use: { insight: 25 }, poison: 18 },
    pill_guben:    { name: '固本培元丹', type: 'pill', grade: 2, price: 2000,  desc: '固本培元，气血灵力各复五成。', use: { hpPct: 50, mpPct: 50 }, poison: 10, battle: true },
    pill_yulu:     { name: '九花玉露丸', type: 'pill', grade: 2, price: 1600,  desc: '玉露酿就，灵力尽复，兼得八百修为。', use: { mpPct: 100, exp: 800 }, poison: 12, battle: true },
    pill_yuanshen: { name: '元神丹',   type: 'pill', grade: 4, price: 45000,  desc: '温养元神，服之得四万点修为、突破感悟 +10。', use: { exp: 40000, insight: 10 }, poison: 70 },
    pill_tianyuan: { name: '天元造化丹', type: 'pill', grade: 5, price: 220000, desc: '丹道至高造化，服之得廿五万点修为。', use: { exp: 250000 }, poison: 85 },
    /* ---- 符箓（符修可画可售，战斗中人人可祭出）---- */
    tal_huoshe: { name: '火蛇符', type: 'talisman', grade: 1, price: 25, ecoPrice: true, power: 2.2, desc: '朱砂勾火蛇之形，掷出化焰伤敌（战斗中造成约2.2倍攻击伤害，符光必中）。', fkind: 'damage' },
    tal_zilei:  { name: '紫雷符', type: 'talisman', grade: 2, price: 90, ecoPrice: true, power: 3.5, desc: '紫霄雷符，一击之威如雷劫临身（战斗中造成约3.5倍攻击伤害，符光必中）。', fkind: 'damage' },
    /* ---- v13 新增符箓：护身 / 限制 / 增益全谱 ---- */
    tal_jinguang: { name: '金光符', type: 'talisman', grade: 1, price: 45, ecoPrice: true, desc: '金光护体——两回合内所受伤害减轻四成（战斗中可用）。', fkind: 'shield', power: 40, rounds: 2 },
    tal_jifengfu: { name: '疾风符', type: 'talisman', grade: 1, price: 40, ecoPrice: true, desc: '身化疾风——两回合内闪避大增（+25%）（战斗中可用）。', fkind: 'dodge', power: 25, rounds: 2 },
    tal_fuling:   { name: '缚灵符', type: 'talisman', grade: 2, price: 70, ecoPrice: true, desc: '符光化索缚敌身——敌方身法迟滞三成，持续两回合（战斗中可用，必中）。', fkind: 'slow', power: 30, rounds: 2 },
    tal_shigu:    { name: '蚀骨符', type: 'talisman', grade: 2, price: 75, ecoPrice: true, desc: '蚀骨腐甲——敌方防御剧降三成五，持续两回合（战斗中可用，必中）。', fkind: 'defdown', power: 35, rounds: 2 },
    tal_bingpo:   { name: '冰魄符', type: 'talisman', grade: 3, price: 160, ecoPrice: true, desc: '冰魄封形——寒气封敌周身，使其下一回合无法动弹（战斗中可用，必中；强敌抵抗几率略高）。', fkind: 'freeze', rounds: 1 },
    tal_posha:    { name: '破煞符', type: 'talisman', grade: 3, price: 180, ecoPrice: true, power: 4.6, desc: '破军煞符，一符破万法（战斗中造成约4.6倍攻击伤害，符光必中，并使敌方破防两成）。', fkind: 'damage', debuff: { defdown: 20, rounds: 2 } },
    /* ---- 功法 ---- */
    gf_tuna:    { name: '吐纳诀',       type: 'gongfa', gtype: 'support', grade: 0, price: 200,   desc: '最基础的吐纳法门，可提升修炼效率。', bonus: { cult: [6, 3] } },
    gf_canghai: { name: '沧海剑诀',     type: 'gongfa', gtype: 'attack',  grade: 0, price: 300,   desc: '普通剑修入门剑诀。', bonus: { atkPct: [4, 2] }, skill: { name: '沧浪一剑', kind: 'damage', power: 1.55, mp: 10, desc: '凝聚剑气奋力一斩' } },
    gf_tiebu:   { name: '铁布衫',       type: 'gongfa', gtype: 'defense', grade: 0, price: 260,   desc: '外门横练功法，皮糙肉厚。', bonus: { defPct: [5, 2], hpPct: [4, 2] }, skill: { name: '罡气护体', kind: 'buffDef', power: 70, mp: 12, rounds: 2, desc: '两回合内防御大增' } },
    gf_lieyang: { name: '烈阳掌',       type: 'gongfa', gtype: 'attack',  grade: 1, price: 2500,  desc: '掌出如烈阳，灼热逼人。', bonus: { atkPct: [6, 3], crit: [1, 0.5] }, skill: { name: '烈阳焚空', kind: 'damage', power: 1.85, mp: 14, desc: '灼热掌力轰击敌人' } },
    gf_xuantian:{ name: '玄天护体功',   type: 'gongfa', gtype: 'defense', grade: 1, price: 2200,  desc: '玄门护体神功，固若金汤。', bonus: { defPct: [8, 3], hpPct: [6, 3], block: [3, 1.5] } },
    gf_jifeng:  { name: '疾风步',       type: 'gongfa', gtype: 'support', grade: 1, price: 2000,  desc: '身法轻灵，来去如风。', bonus: { spdPct: [8, 4], dodge: [2, 1] }, skill: { name: '残影步', kind: 'buffDodge', power: 25, mp: 8, rounds: 2, desc: '两回合内闪避大增' } },
    gf_tiangang:{ name: '天罡炼体诀',   type: 'gongfa', gtype: 'support', grade: 2, price: 9000,  desc: '淬炼肉身如天罡，气血绵长。', bonus: { hpPct: [8, 4], defPct: [6, 3], cult: [5, 2] } },
    gf_wanjian: { name: '万剑诀',       type: 'gongfa', gtype: 'attack',  grade: 2, price: 0,     desc: '御剑之术大成者，万剑齐发。', bonus: { atkPct: [9, 4] }, skill: { name: '万剑归宗', kind: 'damage', power: 2.3, mp: 20, desc: '万千剑气倾泻而下' } },
    gf_jianqich:{ name: '剑气长城',     type: 'gongfa', gtype: 'defense', grade: 2, price: 0,     desc: '剑气如城墙般护住周身。', bonus: { defPct: [11, 5], block: [5, 2] }, skill: { name: '剑气壁垒', kind: 'buffDef', power: 110, mp: 16, rounds: 2, desc: '剑气成壁，防御剧增' } },
    gf_tumo:    { name: '屠魔剑典',     type: 'gongfa', gtype: 'attack',  grade: 3, price: 0,     desc: '上古剑修斩魔所留剑典，杀伐凌厉。', bonus: { atkPct: [13, 6], crit: [2, 1] }, skill: { name: '魔渊斩', kind: 'damage', power: 2.8, mp: 25, desc: '一剑斩落，魔气皆消' } },
    gf_dayan:   { name: '大衍神诀',     type: 'gongfa', gtype: 'support', grade: 3, price: 0,     desc: '推演天机之法，修行事半功倍。', bonus: { cult: [12, 5], mpPct: [10, 5], crit: [1, 0.5] } },
    gf_bumie:   { name: '不灭金身',     type: 'gongfa', gtype: 'defense', grade: 3, price: 0,     desc: '炼就金刚不坏之身。', bonus: { hpPct: [15, 7], defPct: [14, 6] }, skill: { name: '金身不灭', kind: 'heal', power: 40, mp: 22, desc: '恢复四成气血' } },
    gf_zixiao:  { name: '紫霄仙雷',     type: 'gongfa', gtype: 'attack',  grade: 4, price: 0,     desc: '引九天仙雷入体，一击惊天。', bonus: { atkPct: [14, 6], mpPct: [10, 4] }, skill: { name: '紫霄神雷', kind: 'damage', power: 3.1, mp: 26, desc: '九天神雷轰然而落' } },
    gf_jianxin: { name: '剑心通明',     type: 'gongfa', gtype: 'attack',  grade: 5, price: 0,     desc: '仙家剑道至高典籍，剑心通明，万法不侵。', bonus: { atkPct: [20, 9], crit: [3, 1.5] }, skill: { name: '剑心一瞬', kind: 'damage', power: 3.6, mp: 30, desc: '剑光一闪，天地失色' } },
    gf_hongmeng:{ name: '鸿蒙道经',     type: 'gongfa', gtype: 'support', grade: 5, price: 0,     desc: '记载鸿蒙大道的无上经文，修之百脉皆通。', bonus: { cult: [20, 8], hpPct: [10, 5], mpPct: [10, 5], atkPct: [8, 4] } },
    /* ---- v13 新增功法 ---- */
    gf_hansha:  { name: '寒沙掌',       type: 'gongfa', gtype: 'attack',  grade: 1, price: 2400,  desc: '掌含寒沙，中者气血滞涩。', bonus: { atkPct: [7, 3] }, skill: { name: '寒沙漫天', kind: 'damage', power: 2.0, mp: 15, desc: '寒沙蔽日，冻人筋骨' } },
    gf_yulin:   { name: '御林诀',       type: 'gongfa', gtype: 'defense', grade: 2, price: 8500,  desc: '御木成林为屏，守御一脉的上乘法门。', bonus: { defPct: [9, 4], hpPct: [7, 3] }, skill: { name: '木灵守心', kind: 'heal', power: 32, mp: 18, desc: '木灵生机，疗愈伤势' } },
    gf_feixian: { name: '飞仙步',       type: 'gongfa', gtype: 'support', grade: 3, price: 0,     desc: '举步生风，恍若飞仙。', bonus: { spdPct: [12, 5], dodge: [4, 2] }, skill: { name: '踏虚九步', kind: 'buffDodge', power: 40, mp: 12, rounds: 2, desc: '身形虚幻，两回合内难以捉摸' } },
    gf_lidu:    { name: '离火神雷',     type: 'gongfa', gtype: 'attack',  grade: 4, price: 0,     desc: '离火淬雷，焚天煮海。', bonus: { atkPct: [15, 7], crit: [2, 1] }, skill: { name: '离火天雷', kind: 'damage', power: 3.2, mp: 28, desc: '雷火交加，轰然炸裂' } },
    gf_taiyin:  { name: '太阴炼形',     type: 'gongfa', gtype: 'support', grade: 4, price: 0,     desc: '采太阴之精华炼形养魄，源远流长。', bonus: { cult: [14, 6], hpPct: [12, 5], mpPct: [12, 5] } },
    /* ---- v13 职业专属功法（daoLimit：仅该大道可修习） ---- */
    gf_zhuixian:{ name: '追星逐月剑',   type: 'gongfa', gtype: 'attack',  grade: 3, price: 0, daoLimit: 'sword', desc: '剑修秘传，剑出如星坠月落，唯剑心不悔者可修。', bonus: { atkPct: [16, 7], spdPct: [6, 3] }, skill: { name: '星坠之剑', kind: 'damage', power: 3.0, mp: 26, desc: '一剑既出，如星坠长空' } },
    gf_danjing: { name: '九转丹经',     type: 'gongfa', gtype: 'support', grade: 3, price: 0, daoLimit: 'pill', desc: '丹道圣典，九转炉火皆在其中，唯丹道传人可修。', bonus: { cult: [14, 6], hpPct: [8, 4] } },
    gf_tianfu:  { name: '天符宝箓',     type: 'gongfa', gtype: 'support', grade: 3, price: 0, daoLimit: 'talisman', desc: '符门至宝，笔下符箓如有天助，唯符修可修。', bonus: { crit: [3, 1.5], mpPct: [10, 4] } },
    gf_banti:   { name: '般若炼体术',   type: 'gongfa', gtype: 'defense', grade: 1, price: 0, daoLimit: 'body', desc: '体修不二法门，以肉身参悟般若，唯体修可修。', bonus: { hpPct: [10, 5], defPct: [8, 4], block: [4, 2] } },
    gf_zhoutian:{ name: '周天星斗阵图', type: 'gongfa', gtype: 'support', grade: 3, price: 0, daoLimit: 'array', desc: '阵道无上典籍，周天星辰皆可为阵，唯阵道传人可修。', bonus: { cult: [10, 4], defPct: [8, 4] } },
    gf_xuesha:  { name: '血煞魔功',     type: 'gongfa', gtype: 'attack',  grade: 3, price: 0, daoLimit: 'demonic', desc: '魔道禁术，以血养煞，越战越强，唯邪修可修。', bonus: { atkPct: [15, 7], hpPct: [6, 3] }, skill: { name: '血煞夺魄', kind: 'damage', power: 2.9, mp: 24, desc: '血煞滔天，夺人心魄' } },
    /* ---- 法宝（装备） ---- */
    w_tiejian:  { name: '铁剑',       type: 'artifact', slot: 'weapon',    grade: 0, price: 200,    desc: '凡铁所铸，聊胜于无。', bonus: { atk: 6 } },
    w_qinggang: { name: '青钢剑',     type: 'artifact', slot: 'weapon',    grade: 1, price: 1500,   desc: '掺入精钢淬炼，锋芒初显。', bonus: { atk: 18, crit: 2 } },
    w_sanqing:  { name: '三尺青锋',   type: 'artifact', slot: 'weapon',    grade: 2, price: 12000,  desc: '剑出三尺，青光凛冽。', bonus: { atk: 55, atkPct: 5 } },
    w_zhuxian:  { name: '诛仙剑影',   type: 'artifact', slot: 'weapon',    grade: 3, price: 100000, desc: '上古诛仙剑阵遗落的一缕剑影。', bonus: { atk: 160, atkPct: 12 } },
    a_buyi:     { name: '粗布衣',     type: 'artifact', slot: 'armor',     grade: 0, price: 150,    desc: '粗布麻衣，御寒尚可。', bonus: { def: 4, hp: 30 } },
    a_huxin:    { name: '护心镜',     type: 'artifact', slot: 'armor',     grade: 1, price: 1200,   desc: '镜护心脉，可挡致命一击。', bonus: { def: 14, hp: 120 } },
    a_xuangui:  { name: '玄龟甲',     type: 'artifact', slot: 'armor',     grade: 2, price: 10000,  desc: '千年玄龟蜕下之甲，坚不可摧。', bonus: { def: 40, hpPct: 8 } },
    a_longlin:  { name: '龙鳞宝甲',   type: 'artifact', slot: 'armor',     grade: 3, price: 90000,  desc: '蛟龙鳞片缀成，水火不侵。', bonus: { def: 110, hpPct: 15 } },
    z_juling:   { name: '聚灵珠',     type: 'artifact', slot: 'accessory', grade: 0, price: 300,    desc: '缓慢聚敛灵气，扩充灵力。', bonus: { mp: 40 } },
    z_pingan:   { name: '平安符',     type: 'artifact', slot: 'accessory', grade: 0, price: 500,    desc: '高人手书符箓，可保平安添福缘。', bonus: { luck: 1 } },
    z_jifengxue:{ name: '疾风靴',     type: 'artifact', slot: 'accessory', grade: 1, price: 1600,   desc: '踏风而行，身形飘忽。', bonus: { spd: 25, dodge: 3 } },
    z_qiankun:  { name: '乾坤戒',     type: 'artifact', slot: 'accessory', grade: 2, price: 8000,   desc: '内藏乾坤，聚财纳宝，灵石所得 +20%。', bonus: { stonePct: 20 } },
    z_taiji:    { name: '太极玉',     type: 'artifact', slot: 'accessory', grade: 3, price: 80000,  desc: '道蕴天成，诸般属性皆有所增。', bonus: { atkPct: 6, defPct: 6, hpPct: 6 } },
    /* ---- v13 新增装备（补齐各槽位品级） ---- */
    w_tulong:   { name: '屠龙刀',     type: 'artifact', slot: 'weapon',    grade: 1, price: 1800,   desc: '刀沉势猛，隐有龙吟。', bonus: { atk: 20, crit: 1 } },
    w_hanshuang:{ name: '寒霜剑',     type: 'artifact', slot: 'weapon',    grade: 2, price: 11000,  desc: '剑覆寒霜，触之气血凝滞。', bonus: { atk: 60, crit: 3 } },
    a_xingyi:   { name: '星羽法衣',   type: 'artifact', slot: 'armor',     grade: 2, price: 9500,   desc: '以星禽之羽织就，轻若无物。', bonus: { def: 36, spd: 18, hp: 100 } },
    z_xingpan:  { name: '周天星盘',   type: 'artifact', slot: 'accessory', grade: 2, price: 7000,   desc: '星盘自转，指引周天灵机。', bonus: { crit: 4, spd: 20, cult: 4 } },
    /* ---- v13 玄天套装（防御线，3 件成套） ---- */
    s_xt_jian:  { name: '玄天古剑',   type: 'artifact', slot: 'weapon',    grade: 3, price: 0, set: 'xuantian', desc: '玄天套装之一：古朴玄剑，守御之意自生。', bonus: { atk: 130, def: 30 } },
    s_xt_jia:   { name: '玄天宝甲',   type: 'artifact', slot: 'armor',     grade: 3, price: 0, set: 'xuantian', desc: '玄天套装之二：玄光内蕴，刀枪不入。', bonus: { def: 100, hp: 400 } },
    s_xt_pei:   { name: '玄天玉佩',   type: 'artifact', slot: 'accessory', grade: 3, price: 0, set: 'xuantian', desc: '玄天套装之三：玉佩温润，护持心脉。', bonus: { def: 40, hp: 250, block: 5 } },
    /* ---- v13 赤霄套装（攻击线，3 件成套） ---- */
    s_cx_jian:  { name: '赤霄神剑',   type: 'artifact', slot: 'weapon',    grade: 3, price: 0, set: 'chixiao', desc: '赤霄套装之一：赤霄贯日，锋芒毕露。', bonus: { atk: 170, crit: 4 } },
    s_cx_pao:   { name: '赤霄战袍',   type: 'artifact', slot: 'armor',     grade: 3, price: 0, set: 'chixiao', desc: '赤霄套装之二：战袍如焰，杀气腾腾。', bonus: { def: 70, atk: 40, hp: 260 } },
    s_cx_gou:   { name: '赤霄战勾',   type: 'artifact', slot: 'accessory', grade: 3, price: 0, set: 'chixiao', desc: '赤霄套装之三：战意灌注，出手狠辣。', bonus: { atk: 60, crit: 5 } },
    /* ---- v19 血河套装（攻击线·血河旧部遗物，炼器可得） ---- */
    s_hj_sha:   { name: '血河杀戟',   type: 'artifact', slot: 'weapon',    grade: 4, price: 0, set: 'xuehe', desc: '血河套装之一：戟锋饮血，杀气化河。', bonus: { atk: 220, crit: 5 } },
    s_hj_pao:   { name: '血河魔袍',   type: 'artifact', slot: 'armor',     grade: 4, price: 0, set: 'xuehe', desc: '血河套装之二：袍染旧血，煞气护身。', bonus: { def: 90, atk: 60, hp: 400 } },
    s_hj_ling:  { name: '血河魂铃',   type: 'artifact', slot: 'accessory', grade: 4, price: 0, set: 'xuehe', desc: '血河套装之三：铃声所至，魂魄俱寒。', bonus: { atk: 70, crit: 6 } },
    /* ---- v19 仙缘套装（均衡线·仙阶三件，灵界秘境掉落） ---- */
    s_xy_jian:  { name: '仙缘灵剑',   type: 'artifact', slot: 'weapon',    grade: 5, price: 0, set: 'xianyuan', desc: '仙缘套装之一：剑心和光，不染尘俗。', bonus: { atk: 340, cult: 5 } },
    s_xy_ling:  { name: '仙缘羽衣',   type: 'artifact', slot: 'armor',     grade: 5, price: 0, set: 'xianyuan', desc: '仙缘套装之二：羽化而衣，风雷不侵。', bonus: { def: 140, hp: 700 } },
    s_xy_huan:  { name: '仙缘玉环',   type: 'artifact', slot: 'accessory', grade: 5, price: 0, set: 'xianyuan', desc: '仙缘套装之三：环佩相鸣，仙缘自至。', bonus: { atk: 80, def: 60, block: 6 } },
    /* ---- v13 炼器专属（天级装备，只能炼器获得） ---- */
    w_tianwen:  { name: '天问剑',     type: 'artifact', slot: 'weapon',    grade: 4, price: 0, desc: '以问天之姿铸就的绝世神剑，剑鸣可裂云层。', bonus: { atk: 260, atkPct: 14, crit: 5 } },
    a_taiyi:    { name: '太乙道袍',   type: 'artifact', slot: 'armor',     grade: 4, price: 0, desc: '太乙真人亲织道袍，万法不侵。', bonus: { def: 180, hp: 800, hpPct: 10 } },
    z_longyu:   { name: '龙魂玉',     type: 'artifact', slot: 'accessory', grade: 4, price: 0, desc: '以真龙残魂炼制的玉佩，龙威护主。', bonus: { atkPct: 10, defPct: 10, hpPct: 10, luck: 2 } },
    z_hunpo:    { name: '魂珀',       type: 'artifact', slot: 'accessory', grade: 3, price: 0, desc: '万年魂珀，温养神魂，修行事半功倍。', bonus: { cult: 10, mp: 200, crit: 3 } },
    /* ---- 材料 ---- */
    m_lingcao:  { name: '百年灵草',   type: 'material', tier: 1, price: 80,    desc: '蕴含百年灵气的药草，炼丹辅药。' },
    m_yaopi:    { name: '妖兽皮革',   type: 'material', tier: 1, price: 60,    desc: '一阶妖兽的皮，坚韧异常。' },
    m_xuantie:  { name: '玄铁矿',     type: 'material', tier: 1, price: 100,   desc: '含灵气的黑铁矿石，炼器良材。' },
    m_lingzhi:  { name: '千年灵芝',   type: 'material', tier: 2, price: 600,   desc: '药香扑鼻，乃疗伤圣药之引。' },
    m_neidan:   { name: '妖兽内丹',   type: 'material', tier: 2, price: 800,   desc: '二阶妖兽体内凝结的丹核。' },
    m_xuecan:   { name: '雪蚕丝',     type: 'material', tier: 2, price: 700,   desc: '雪山灵蚕所吐，轻若无物。' },
    m_xuelian:  { name: '万年雪莲',   type: 'material', tier: 3, price: 5000,  desc: '生于极寒之巅，可遇不可求。' },
    m_lianhun:  { name: '炼魂石',     type: 'material', tier: 3, price: 6000,  desc: '可温养神魂的奇石。' },
    m_longxue:  { name: '龙血琥珀',   type: 'material', tier: 3, price: 8000,  desc: '凝固了真龙之血的琥珀。' },
    m_xianjing: { name: '仙晶',       type: 'material', tier: 4, price: 50000, desc: '灵气凝结成晶，仙家之物。' },
    m_shentie:  { name: '太古神铁',   type: 'material', tier: 4, price: 65000, desc: '太古陨铁，炼制仙剑之材。' },
    /* ---- v13 新增材料 ---- */
    m_huolin:   { name: '火灵晶',     type: 'material', tier: 3, price: 7000,  desc: '地火千年凝结的晶石，炼器炼丹皆可助燃。' },
    m_bingpo:   { name: '冰魄石',     type: 'material', tier: 3, price: 7500,  desc: '寒潭深处所产的奇石，触之生寒。' },
    m_xingchen: { name: '星辰砂',     type: 'material', tier: 4, price: 42000, desc: '天外飞舟残骸中剥落的星辉之砂。' },
    m_jiaojin:  { name: '蛟筋',       type: 'material', tier: 4, price: 55000, desc: '蛟龙的筋络，坚韧异常，炼器上品。' },
    m_haixin:   { name: '沧海之心',   type: 'material', tier: 4, price: 85000, desc: '龙渊海眼深处凝结的蓝晶，内蕴沧海。' },
    m_shenmu:   { name: '建木神枝',   type: 'material', tier: 4, price: 95000, desc: '通天建木的一截神枝，生机不灭。' },
    /* ---- v13 灵田种子（洞府种植用） ---- */
    m_qianghua: { name: '强化石',     type: 'material', tier: 3, price: 3000,  desc: '蕴含精纯灵性的晶石，祭炼强化法宝时掺入一枚，+7 以上强化必定成功。' },
    m_danfang:  { name: '丹方残页',   type: 'material', tier: 3, price: 2600,  desc: '前辈丹师遗稿的残页。集齐数页，可在炼丹炉前参悟失传的丹方。' },
    seed_lingcao:  { name: '灵草种',   type: 'seed', grade: 1, price: 40,    crop: 'm_lingcao',  days: 10, desc: '播入灵田，十日可收【百年灵草】。' },
    seed_lingzhi:  { name: '灵芝种',   type: 'seed', grade: 2, price: 500,   crop: 'm_lingzhi',  days: 25, desc: '播入灵田，廿五日可收【千年灵芝】。' },
    seed_bingpo:   { name: '冰魄花种', type: 'seed', grade: 2, price: 900,   crop: 'm_bingpo',   days: 30, desc: '播入灵田，三十日可收【冰魄石】。' },
    seed_xuelian:  { name: '雪莲种',   type: 'seed', grade: 3, price: 4500,  crop: 'm_xuelian',  days: 45, desc: '播入灵田，四十五日可收【万年雪莲】。' },
    seed_lianhun:  { name: '炼魂花种', type: 'seed', grade: 3, price: 5200,  crop: 'm_lianhun',  days: 50, desc: '播入灵田，五十日可收【炼魂石】。' },
    seed_xingchen: { name: '星辉草种', type: 'seed', grade: 4, price: 30000, crop: 'm_xingchen', days: 60, desc: '播入灵田，六十日可收【星辰砂】。' },
    /* ---- v3 秘境专属：失传功法 / 上古法宝碎片 / 本命法宝 / 派系信物 ---- */
    gf_wangchen:{ name: '忘尘剑意',   type: 'gongfa', gtype: 'attack',  grade: 4, price: 0, desc: '秘境失传剑意，一剑忘尘，物我两断。', bonus: { atkPct: [16, 7], crit: [3, 1.5] }, skill: { name: '忘尘一剑', kind: 'damage', power: 3.3, mp: 28, desc: '忘却尘俗的一剑，快过天雷' } },
    gf_hunyuan: { name: '混元真解',   type: 'gongfa', gtype: 'support', grade: 4, price: 0, desc: '秘境失传心法，混元一气，百脉皆通。', bonus: { cult: [15, 6], hpPct: [12, 5], mpPct: [12, 5] } },
    gf_niepan:  { name: '涅槃圣法',   type: 'gongfa', gtype: 'defense', grade: 5, price: 0, desc: '凤凰涅槃之秘法，置之死地而后生。', bonus: { hpPct: [18, 8], defPct: [15, 7] }, skill: { name: '涅槃重生', kind: 'heal', power: 55, mp: 30, desc: '沐浴火光，重续生机' } },
    m_gupian:   { name: '上古法宝碎片', type: 'material', tier: 4, price: 6000, desc: '上古法宝崩碎后的残片，隐有器灵低鸣。集齐九枚可炼化合成本命法宝。' },
    z_benming:  { name: '本命法宝',   type: 'artifact', slot: 'accessory', grade: 5, price: 0, desc: '以九枚上古碎片炼化而成，与本命神魂相合，攻防气感皆得其益。', bonus: { atkPct: 12, defPct: 12, hpPct: 12, crit: 3, cult: 8, luck: 2 } },
    z_tianshu:  { name: '天枢战纹',   type: 'artifact', slot: 'accessory', grade: 2, price: 0, desc: '天枢殿长老亲手炼制的战纹玉符，勇猛精进。', bonus: { atkPct: 8, crit: 3 } },
    z_danxin:   { name: '丹心玉佩',   type: 'artifact', slot: 'accessory', grade: 2, price: 0, desc: '丹鼎阁信物，温养气脉，绵长持久。', bonus: { hpPct: 10, mpPct: 10 } },
    z_cangjing: { name: '藏经阁印',   type: 'artifact', slot: 'accessory', grade: 2, price: 0, desc: '藏经楼信物，执此印者阅典有先，修行事半功倍。', bonus: { cult: 6, luck: 1 } },
    /* ---- v18 灵界篇：仙阶装备（grade 6） ---- */
    w_lingjie:  { name: '灵墟仙剑',   type: 'artifact', slot: 'weapon',    grade: 5, price: 0, desc: '灵墟仙泽深处出土的仙剑，剑光如霜，可斩虚无。', bonus: { atk: 400, atkPct: 18, crit: 6 } },
    a_xianpao:  { name: '九天仙袍',   type: 'artifact', slot: 'armor',     grade: 5, price: 0, desc: '以九天霓虹织就的仙袍，万法不沾。', bonus: { def: 280, hp: 1200, hpPct: 12 } },
    z_xianyao:  { name: '仙曜石',     type: 'artifact', slot: 'accessory', grade: 5, price: 0, desc: '仙王陨落后留下的本命灵石，蕴含一缕仙道真意。', bonus: { atkPct: 12, defPct: 12, hpPct: 12, cult: 12, luck: 3 } },
    gf_leishen: { name: '九天雷神经', type: 'gongfa', gtype: 'attack',  grade: 5, price: 0, desc: '雷狱主宰所修的上古雷法，一雷出而万法寂。', bonus: { atkPct: 22, crit: 4, mpPct: 12 }, skill: { name: '九天雷罚', kind: 'damage', power: 4.2, mp: 35, desc: '引九天雷罚轰落，万钧之势' } },
    m_xiancui:  { name: '仙灵翠',     type: 'material', tier: 4, price: 120000, desc: '灵墟仙泽灵气凝结的翡翠，内蕴仙道法则。' },
    m_leijing:  { name: '雷晶核',     type: 'material', tier: 4, price: 150000, desc: '九霄雷狱中雷兽体内凝结的雷晶，雷法至宝。' },
    seed_xianling: { name: '仙灵种',   type: 'seed', grade: 5, price: 80000, crop: 'm_xiancui', days: 80, desc: '播入灵田，八十日可收【仙灵翠】。' },
  },

  /** 按档次取材料列表 */
  matsByTier(tier) {
    return Object.entries(this.ITEMS)
      .filter(([, d]) => d.type === 'material' && d.tier === tier)
      .map(([id]) => id);
  },

  /* ---------- 怪物注册表（power = 境界强度 0~39，即大境界*4+层次） ----------
   * v13 技能池：skills = [{ name, w 权重, kind, ... }]，战斗中按权重出招；
   *   kind：poison中毒 / burn灼烧 / bleed流血 / defdown破防 / slow迟滞 / weaken虚弱 /
   *         stun束缚 / drain吸血重击 / mpburn摄魂 / guard铁壁 / roar咆哮 / heal自愈
   * v13 立绘：species 形象类型（beast兽/snake蛇/swarm虫群/human人形/plant草木/ghost阴魂/construct傀儡/element灵体） */
  MONSTERS: {
    m_yezhu:     { name: '野猪',         power: 0,  hp: 1.1,  atk: 0.9, species: 'beast', skills: [{ name: '獠牙冲撞', w: 25, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_dushe:     { name: '毒蛇',         power: 1,  hp: 0.8,  atk: 1.15, spd: 1.3, species: 'snake', skills: [{ name: '淬毒牙', w: 40, kind: 'poison', pct: 3, rounds: 3 }] },
    m_shanlang:  { name: '山狼',         power: 2,  hp: 1.0,  atk: 1.05, species: 'beast', skills: [{ name: '撕咬', w: 30, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_zeiren:    { name: '采药贼人',     power: 3,  hp: 1.0,  atk: 1.1, def: 1.1, stoneMul: 1.4, species: 'human', skills: [{ name: '撒石灰', w: 25, kind: 'slow', pct: 20, rounds: 2 }] },
    m_toumu:     { name: '山贼头目',     power: 4,  hp: 1.15, atk: 1.1, elite: true, rareDrop: 'w_qinggang', species: 'human', skills: [{ name: '开山刀势', w: 30, kind: 'weaken', pct: 15, rounds: 2 }] },
    m_qingbei:   { name: '青背狼',       power: 3,  hp: 1.0,  atk: 1.05, species: 'beast', skills: [{ name: '狼爪连环', w: 30, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_linghou:   { name: '灵猴',         power: 4,  hp: 0.9,  spd: 1.35, dodge: 8, stoneMul: 1.2, species: 'beast', skills: [{ name: '挠心爪', w: 25, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_tiexia:    { name: '铁甲犀',       power: 5,  hp: 1.35, def: 1.45, spd: 0.7, species: 'beast', skills: [{ name: '铁甲铿锵', w: 35, kind: 'guard', def: 35, rounds: 2 }] },
    m_luopo:     { name: '落魄散修',     power: 6,  hp: 1.0,  atk: 1.1, stoneMul: 1.5, species: 'human', skills: [{ name: '破绽指', w: 25, kind: 'defdown', pct: 20, rounds: 2 }] },
    m_qingluan:  { name: '青鸾',         power: 8,  hp: 1.1,  atk: 1.2, elite: true, rareDrop: 'gf_jifeng', species: 'beast', skills: [{ name: '清唳慑魂', w: 30, kind: 'weaken', pct: 20, rounds: 2 }] },
    m_loulou:    { name: '黑风喽啰',     power: 6,  hp: 1.0,  atk: 1.0, stoneMul: 1.1, species: 'human', skills: [{ name: '泼风刀', w: 25, kind: 'bleed', pct: 2, rounds: 2 }] },
    m_erdangjia: { name: '黑风寨二当家', power: 8,  hp: 1.1,  atk: 1.15, stoneMul: 1.5, species: 'human', skills: [{ name: '浑铁枪势', w: 30, kind: 'defdown', pct: 20, rounds: 2 }] },
    m_guimian:   { name: '鬼面修士',     power: 9,  hp: 1.0,  atk: 1.2, stoneMul: 1.4, species: 'human', skills: [{ name: '鬼面摄心', w: 30, kind: 'slow', pct: 25, rounds: 2 }] },
    m_dadangjia: { name: '黑风大当家',   power: 11, hp: 1.15, atk: 1.2, elite: true, rareDrop: 'a_xuangui', species: 'human', skills: [{ name: '山寨王气', w: 30, kind: 'roar', atk: 25, rounds: 2 }] },
    m_chilin:    { name: '赤鳞蟒',       power: 10, hp: 1.1,  atk: 1.05, species: 'snake', skills: [{ name: '蟒尾扫击', w: 25, kind: 'stun', rounds: 1 }] },
    m_fuqun:     { name: '嗜血蝠群',     power: 11, hp: 0.85, atk: 1.2, spd: 1.2, species: 'swarm', skills: [{ name: '嗜血狂叮', w: 40, kind: 'drain', mult: 1.15, leech: 0.5 }] },
    m_liedi:     { name: '裂地虎',       power: 13, hp: 1.2,  atk: 1.1, species: 'beast', skills: [{ name: '裂地一击', w: 30, kind: 'bleed', pct: 3, rounds: 2 }] },
    m_shuyao:    { name: '千年树妖',     power: 15, hp: 1.3,  atk: 1.1, elite: true, rareDrop: 'z_qiankun', species: 'plant', skills: [{ name: '根须缠绕', w: 35, kind: 'stun', rounds: 1 }, { name: '汲取地气', w: 25, kind: 'heal', pct: 15 }] },
    m_shikui:    { name: '遗迹石傀',     power: 14, hp: 1.3,  def: 1.4, spd: 0.7, species: 'construct', skills: [{ name: '石肤凝聚', w: 35, kind: 'guard', def: 40, rounds: 2 }] },
    m_yinling:   { name: '噬魂阴灵',     power: 16, hp: 0.95, spd: 1.3, species: 'ghost', skills: [{ name: '摄魂夺魄', w: 35, kind: 'mpburn', pct: 30 }] },
    m_jianling:  { name: '上古剑灵',     power: 18, hp: 1.0,  atk: 1.15, species: 'ghost', skills: [{ name: '剑意余锋', w: 30, kind: 'bleed', pct: 3, rounds: 2 }] },
    m_moxiu:     { name: '魔修残魂',     power: 21, hp: 1.15, atk: 1.2, elite: true, rareDrop: 'w_zhuxian', species: 'ghost', skills: [{ name: '血魔噬心', w: 30, kind: 'drain', mult: 1.2, leech: 0.5 }, { name: '魔气蚀体', w: 25, kind: 'weaken', pct: 25, rounds: 2 }] },
    /* ---- v13 新增：毒蛛 / 岩蝎 / 火狼等（补齐金丹前空档） ---- */
    m_duzhu:     { name: '花斑毒蛛',     power: 12, hp: 0.9,  atk: 1.1, species: 'swarm', skills: [{ name: '毒牙穿刺', w: 45, kind: 'poison', pct: 3, rounds: 3 }] },
    m_xiezi:     { name: '铁背岩蝎',     power: 13, hp: 1.15, def: 1.3, species: 'beast', skills: [{ name: '蝎尾钩毒', w: 40, kind: 'poison', pct: 2.5, rounds: 3 }] },
    m_chiyan:    { name: '赤炎狼',       power: 15, hp: 1.0,  atk: 1.2, species: 'beast', skills: [{ name: '炎牙撕咬', w: 40, kind: 'burn', pct: 3.5, rounds: 2 }] },
    m_hanshi:    { name: '寒潭冰蟾',     power: 16, hp: 1.2,  def: 1.2, species: 'element', skills: [{ name: '寒气吐息', w: 40, kind: 'slow', pct: 30, rounds: 2 }] },
    /* ---- v13 新增：万妖山脉（金丹后期~元婴） ---- */
    m_fengbao:   { name: '风影豹',       power: 17, hp: 0.95, atk: 1.1, spd: 1.4, species: 'beast', skills: [{ name: '影爪掠影', w: 35, kind: 'bleed', pct: 3, rounds: 2 }] },
    m_xiongyuan: { name: '赤目凶猿',     power: 17, hp: 1.25, atk: 1.15, species: 'beast', skills: [{ name: '擂胸咆哮', w: 30, kind: 'roar', atk: 30, rounds: 2 }, { name: '巨掌拍击', w: 30, kind: 'stun', rounds: 1 }] },
    m_tengyao:   { name: '千年藤妖',     power: 18, hp: 1.3,  def: 1.15, species: 'plant', skills: [{ name: '藤蔓绞缚', w: 35, kind: 'stun', rounds: 1 }, { name: '光合自愈', w: 25, kind: 'heal', pct: 12 }] },
    m_yaohu:     { name: '九尾妖狐',     power: 18, hp: 1.0,  atk: 1.15, spd: 1.2, stoneMul: 1.4, species: 'beast', skills: [{ name: '魅惑之瞳', w: 35, kind: 'weaken', pct: 30, rounds: 2 }, { name: '狐火燎原', w: 30, kind: 'burn', pct: 4, rounds: 2 }] },
    m_heijiao:   { name: '黑蛟',         power: 19, hp: 1.2,  atk: 1.25, elite: true, rareDrop: 'gf_hansha', species: 'snake', skills: [{ name: '蛟尾横扫', w: 30, kind: 'stun', rounds: 1 }, { name: '黑水侵蚀', w: 30, kind: 'defdown', pct: 30, rounds: 2 }] },
    m_shiren:    { name: '石人武士',     power: 20, hp: 1.35, def: 1.35, spd: 0.7, species: 'construct', skills: [{ name: '磐石壁', w: 35, kind: 'guard', def: 45, rounds: 2 }, { name: '巨岩锤', w: 25, kind: 'stun', rounds: 1 }] },
    /* ---- v13 新增：幽冥鬼泽（元婴~化神） ---- */
    m_guizu:     { name: '黄泉鬼卒',     power: 20, hp: 1.05, atk: 1.15, species: 'ghost', skills: [{ name: '幽冥爪', w: 30, kind: 'bleed', pct: 3, rounds: 2 }, { name: '阴风蚀骨', w: 25, kind: 'mpburn', pct: 25 }] },
    m_yuangu:    { name: '千年怨鬼',     power: 21, hp: 1.0,  atk: 1.2, spd: 1.2, species: 'ghost', skills: [{ name: '怨念侵神', w: 35, kind: 'weaken', pct: 25, rounds: 2 }, { name: '摄魂低语', w: 30, kind: 'mpburn', pct: 30 }] },
    m_shigui:    { name: '白骨尸鬼',     power: 22, hp: 1.3,  def: 1.2, species: 'ghost', skills: [{ name: '尸毒抓挠', w: 40, kind: 'poison', pct: 4, rounds: 3 }] },
    m_yinjiao:   { name: '阴煞蛟',       power: 23, hp: 1.15, atk: 1.2, species: 'snake', skills: [{ name: '阴煞缠身', w: 30, kind: 'slow', pct: 35, rounds: 2 }, { name: '噬阴一击', w: 30, kind: 'drain', mult: 1.2, leech: 0.4 }] },
    m_xueshe:    { name: '雪域冰蟒',     power: 23, hp: 1.2,  atk: 1.15, species: 'snake', skills: [{ name: '冰蟒吐信', w: 35, kind: 'slow', pct: 30, rounds: 2 }, { name: '绞缠', w: 25, kind: 'stun', rounds: 1 }] },
    m_yinshou:   { name: '泽底阴兽',     power: 24, hp: 1.3,  atk: 1.25, elite: true, rareDrop: 'z_xingpan', species: 'beast', skills: [{ name: '幽泽咆哮', w: 30, kind: 'roar', atk: 30, rounds: 2 }, { name: '裂魂爪', w: 30, kind: 'bleed', pct: 4, rounds: 2 }] },
    /* ---- v13 新增：天外飞舟残骸（化神~炼虚） ---- */
    m_xinggui:   { name: '星陨石傀',     power: 25, hp: 1.4,  def: 1.4, spd: 0.7, species: 'construct', skills: [{ name: '星辉装甲', w: 35, kind: 'guard', def: 50, rounds: 2 }, { name: '陨星重锤', w: 25, kind: 'stun', rounds: 1 }] },
    m_tianchong: { name: '天外异虫',     power: 26, hp: 0.95, atk: 1.25, spd: 1.25, species: 'swarm', skills: [{ name: '蚀髓吸髓', w: 40, kind: 'drain', mult: 1.2, leech: 0.5 }] },
    m_xuling:    { name: '虚空幻灵',     power: 27, hp: 1.0,  atk: 1.25, spd: 1.3, species: 'ghost', skills: [{ name: '虚空禁锢', w: 30, kind: 'stun', rounds: 1 }, { name: '虚实幻刃', w: 30, kind: 'defdown', pct: 35, rounds: 2 }] },
    m_zhouling:  { name: '飞舟器灵',     power: 29, hp: 1.25, atk: 1.3, elite: true, rareDrop: 'gf_feixian', species: 'construct', skills: [{ name: '舟炮齐鸣', w: 35, kind: 'burn', pct: 4, rounds: 2 }, { name: '灵能护盾', w: 25, kind: 'guard', def: 50, rounds: 2 }] },
    /* ---- v13 新增：龙渊海眼（炼虚及以上） ---- */
    m_shuiling:  { name: '沧海水灵',     power: 27, hp: 1.15, atk: 1.1, species: 'element', skills: [{ name: '潮汐自愈', w: 35, kind: 'heal', pct: 18 }, { name: '深渊之压', w: 30, kind: 'weaken', pct: 30, rounds: 2 }] },
    m_haiyi:     { name: '深渊海兽',     power: 29, hp: 1.3,  atk: 1.25, species: 'beast', skills: [{ name: '撕裂巨口', w: 40, kind: 'bleed', pct: 4.5, rounds: 3 }] },
    m_jiaojiao:  { name: '怒海蛟龙',     power: 31, hp: 1.25, atk: 1.3, species: 'snake', skills: [{ name: '龙尾断浪', w: 30, kind: 'stun', rounds: 1 }, { name: '怒涛覆压', w: 30, kind: 'defdown', pct: 35, rounds: 2 }] },
    m_longgui:   { name: '玄武龙龟',     power: 32, hp: 1.45, def: 1.5, spd: 0.6, species: 'beast', skills: [{ name: '龟甲震波', w: 35, kind: 'guard', def: 55, rounds: 2 }, { name: '吞吐灵潮', w: 25, kind: 'heal', pct: 15 }] },
    m_yuanmo:    { name: '渊底魔影',     power: 34, hp: 1.25, atk: 1.35, elite: true, rareDrop: 'gf_taiyin', species: 'ghost', skills: [{ name: '万渊噬心', w: 30, kind: 'drain', mult: 1.3, leech: 0.5 }, { name: '魔渊低语', w: 30, kind: 'weaken', pct: 30, rounds: 2 }] },
    /* ---- v18 灵界篇：灵墟仙泽（飞升~真仙） ---- */
    m_linglu:    { name: '灵墟仙鹭',     power: 35, hp: 1.05, atk: 1.2, spd: 1.35, species: 'element', skills: [{ name: '仙翎斩', w: 30, kind: 'bleed', pct: 4, rounds: 2 }, { name: '羽化灵光', w: 25, kind: 'heal', pct: 18 }] },
    m_xianmo:    { name: '仙泽水魅',     power: 36, hp: 1.1,  atk: 1.25, spd: 1.3, species: 'ghost', skills: [{ name: '幻雾困身', w: 30, kind: 'slow', pct: 40, rounds: 2 }, { name: '魅影夺魄', w: 25, kind: 'drain', mult: 1.3, leech: 0.5 }] },
    m_lingjiang: { name: '灵墟守将',     power: 37, hp: 1.4,  def: 1.4,  spd: 0.7, species: 'construct', skills: [{ name: '仙光壁垒', w: 30, kind: 'guard', def: 60, rounds: 2 }, { name: '镇墟锤', w: 25, kind: 'stun', rounds: 1 }] },
    m_leixiao:   { name: '雷霄独角兽',   power: 38, hp: 1.2,  atk: 1.3,  species: 'beast', skills: [{ name: '雷角冲撞', w: 30, kind: 'burn', pct: 5, rounds: 2 }, { name: '雷网缠身', w: 25, kind: 'stun', rounds: 1 }] },
    m_leimen:    { name: '九霄雷灵',     power: 40, hp: 1.15, atk: 1.35, spd: 1.35, species: 'element', skills: [{ name: '紫霄雷落', w: 35, kind: 'burn', pct: 6, rounds: 3 }, { name: '雷劫临身', w: 25, kind: 'weaken', pct: 35, rounds: 2 }] },
    m_tianlong:  { name: '应龙残魄',     power: 42, hp: 1.35, atk: 1.4,  elite: true, rareDrop: 'w_lingjie', species: 'snake', skills: [{ name: '龙息焚天', w: 30, kind: 'burn', pct: 6, rounds: 3 }, { name: '龙威震荡', w: 25, kind: 'stun', rounds: 1 }, { name: '逆鳞反噬', w: 20, kind: 'defdown', pct: 40, rounds: 2 }] },
    m_lingxue:   { name: '灵墟雪猿',     power: 39, hp: 1.3,  atk: 1.2,  species: 'beast', skills: [{ name: '寒冰拳', w: 30, kind: 'slow', pct: 35, rounds: 2 }, { name: '咆哮', w: 25, kind: 'roar', atk: 35, rounds: 2 }] },
    m_tianle:    { name: '九霄雷兽',     power: 41, hp: 1.25, atk: 1.35, species: 'beast', skills: [{ name: '雷牙撕裂', w: 30, kind: 'bleed', pct: 5, rounds: 2 }, { name: '雷暴', w: 25, kind: 'burn', pct: 5, rounds: 2 }] },
    m_xianzun:   { name: '仙尊残念',     power: 44, hp: 1.3,  atk: 1.45, elite: true, rareDrop: 'z_xianyao', species: 'ghost', skills: [{ name: '一念断生', w: 30, kind: 'weaken', pct: 40, rounds: 2 }, { name: '夺魄', w: 25, kind: 'drain', mult: 1.4, leech: 0.6 }] },
    m_leishen:   { name: '雷狱主宰',     power: 46, hp: 1.5,  atk: 1.5,  elite: true, rareDrop: 'gf_leishen', species: 'construct', skills: [{ name: '灭世雷罚', w: 30, kind: 'cursed', pct: 8, rounds: 3 }, { name: '雷狱封锁', w: 25, kind: 'stun', rounds: 1 }] },
  },

  /* ---------- 地图区域 ---------- */
  MAPS: [
    { id: 'village',  name: '新手村 · 后山', recRealm: 0, recText: '练气期', desc: '青山脚下的小村落，村后山林间偶有野兽出没，是初入道途者磨砺身心之处。',
      pool: [{ id: 'm_yezhu', weight: 40 }, { id: 'm_dushe', weight: 25 }, { id: 'm_shanlang', weight: 20 }, { id: 'm_zeiren', weight: 15 }],
      elite: 'm_toumu', weights: { battle: 46, treasure: 14, fortune: 12, npc: 12, trap: 6, nothing: 10 } },
    { id: 'qingfeng', name: '青峰山', recRealm: 1, recText: '练气后期 ~ 筑基期', desc: '青峰山势连绵百里，山间灵气氤氲，多有灵兽与采药修士出没。',
      pool: [{ id: 'm_qingbei', weight: 30 }, { id: 'm_linghou', weight: 25 }, { id: 'm_tiexia', weight: 25 }, { id: 'm_luopo', weight: 20 }],
      elite: 'm_qingluan', weights: { battle: 50, treasure: 12, fortune: 10, npc: 10, trap: 8, nothing: 10 } },
    { id: 'heifeng',  name: '黑风寨', recRealm: 1, recText: '筑基期', desc: '盘踞着凶悍修士的山寨，行事狠辣，寨中却颇有积蓄。',
      pool: [{ id: 'm_loulou', weight: 40 }, { id: 'm_erdangjia', weight: 30 }, { id: 'm_guimian', weight: 30 }],
      elite: 'm_dadangjia', weights: { battle: 54, treasure: 12, fortune: 8, npc: 8, trap: 10, nothing: 8 } },
    { id: 'forest',   name: '妖兽森林', recRealm: 2, recText: '金丹期', desc: '古木参天的无垠林海，深处妖兽横行，亦藏无数天材地宝。',
      pool: [{ id: 'm_chilin', weight: 35 }, { id: 'm_fuqun', weight: 30 }, { id: 'm_liedi', weight: 35 }],
      elite: 'm_shuyao', weights: { battle: 54, treasure: 13, fortune: 9, npc: 8, trap: 9, nothing: 7 } },
    { id: 'ruins',    name: '秘境遗迹', recRealm: 3, recText: '元婴期及以上', desc: '上古修士洞府崩塌所化的秘境，机缘遍地，凶险亦遍地。',
      pool: [{ id: 'm_shikui', weight: 35 }, { id: 'm_yinling', weight: 30 }, { id: 'm_jianling', weight: 35 }],
      elite: 'm_moxiu', weights: { battle: 52, treasure: 15, fortune: 11, npc: 8, trap: 9, nothing: 5 } },
    /* ---- v13 新增四张高阶地图 ---- */
    { id: 'wanyao',   name: '万妖山脉', recRealm: 3, recText: '金丹后期 ~ 元婴期', desc: '千里妖山连绵不绝，山中大妖自成疆域，山巅终年妖云翻卷。传闻山脉深处藏有上古妖庭遗迹。',
      pool: [{ id: 'm_fengbao', weight: 25 }, { id: 'm_xiongyuan', weight: 25 }, { id: 'm_tengyao', weight: 25 }, { id: 'm_yaohu', weight: 25 }],
      elite: 'm_heijiao', weights: { battle: 54, treasure: 13, fortune: 10, npc: 8, trap: 8, nothing: 7 } },
    { id: 'youming',  name: '幽冥鬼泽', recRealm: 4, recText: '元婴后期 ~ 化神期', desc: '水黑如墨的千里泽国，终年阴雾不散，怨气凝而不化。鬼火点点处，白骨为路，阴煞蚀骨。',
      pool: [{ id: 'm_guizu', weight: 30 }, { id: 'm_yuangu', weight: 25 }, { id: 'm_shigui', weight: 25 }, { id: 'm_yinjiao', weight: 20 }],
      elite: 'm_yinshou', weights: { battle: 54, treasure: 13, fortune: 10, npc: 7, trap: 10, nothing: 6 } },
    { id: 'feizhou',  name: '天外飞舟残骸', recRealm: 5, recText: '化神后期 ~ 炼虚期', desc: '半截天外飞舟坠于荒漠，舟身流转着尚未熄灭的星辉禁制。残骸之中，星傀游弋，异虫滋生于灵脉之间。',
      pool: [{ id: 'm_xinggui', weight: 30 }, { id: 'm_tianchong', weight: 30 }, { id: 'm_xuling', weight: 25 }, { id: 'm_shuiling', weight: 15 }],
      elite: 'm_zhouling', weights: { battle: 52, treasure: 16, fortune: 12, npc: 7, trap: 9, nothing: 4 } },
    { id: 'longyuan', name: '龙渊海眼', recRealm: 6, recText: '炼虚期及以上', desc: '大海中央的万丈漩涡，渊底隐约可见沉睡的巨大轮廓。龙裔盘踞、海兽横行，渊底魔影幢幢——此为化外绝地。',
      pool: [{ id: 'm_haiyi', weight: 30 }, { id: 'm_jiaojiao', weight: 25 }, { id: 'm_longgui', weight: 25 }, { id: 'm_shuiling', weight: 20 }],
      elite: 'm_yuanmo', weights: { battle: 55, treasure: 14, fortune: 11, npc: 6, trap: 9, nothing: 5 } },
    /* ---- v18 灵界篇：飞升后新地图 ---- */
    { id: 'lingxu', name: '灵墟仙泽', recRealm: 9, recText: '真仙期', desc: '飞升之后的第一站——灵墟仙泽，灵气成雾、仙禽翔集。泽水深处，有上古仙门遗留下的禁制与守卫。',
      pool: [{ id: 'm_linglu', weight: 30 }, { id: 'm_xianmo', weight: 25 }, { id: 'm_lingjiang', weight: 25 }, { id: 'm_lingxue', weight: 20 }],
      elite: 'm_tianlong', weights: { battle: 52, treasure: 16, fortune: 14, npc: 6, trap: 8, nothing: 4 } },
    { id: 'leiyu', name: '九霄雷狱', recRealm: 9, recText: '真仙后期', desc: '九天之上的雷霆炼狱，终年雷云不散。传说中藏有仙王陨落前的传承，然雷威之盛，足以灭仙。',
      pool: [{ id: 'm_leixiao', weight: 30 }, { id: 'm_leimen', weight: 25 }, { id: 'm_tianle', weight: 25 }, { id: 'm_lingxue', weight: 20 }],
      elite: 'm_leishen', weights: { battle: 55, treasure: 14, fortune: 12, npc: 4, trap: 10, nothing: 5 } },
  ],

  /* ---------- 宗门 ---------- */
  SECTS: [
    { id: 'qingyun', name: '青云剑宗', desc: '以剑入道，门下弟子杀伐凌厉，剑气冲霄。',
      bonusText: '宗门加成：攻击 +8%', bonus: { atkPct: 8 } },
    { id: 'danxia',  name: '丹霞谷',   desc: '丹道圣地，谷中丹香百年不散，妙手回春。',
      bonusText: '宗门加成：丹药效果 +30%，丹毒 -30%', bonus: { pillPct: 30, poisonReduce: 30 } },
    { id: 'wanbao',  name: '万宝商会', desc: '富可敌国的修士商会，消息灵通，财源滚滚。',
      bonusText: '宗门加成：灵石获取 +20%，坊市九二折', bonus: { stonePct: 20, shopDiscount: 8 } },
    /* ---- v13 新增宗门 ---- */
    { id: 'panyan',  name: '磐岩谷',   desc: '体修圣地，谷中弟子以山为炉、炼体如岩，一拳可碎巨石。',
      bonusText: '宗门加成：防御 +8%，气血 +8%', bonus: { defPct: 8, hpPct: 8 } },
    { id: 'zhoutian',name: '周天阁',   desc: '阵道魁首，阁中周天大阵终年运转，星辰为子、天地为盘。',
      bonusText: '宗门加成：修炼效率 +8%，闪避 +3%', bonus: { cult: 8, dodge: 3 } },
  ],

  /** 宗门贡献兑换列表 */
  SECT_EXCHANGE: [
    { item: 'gf_wanjian',     cost: 600 },
    { item: 'gf_jianqich',    cost: 600 },
    { item: 'pill_xisui',     cost: 200 },
    { item: 'm_lingzhi',      cost: 150, qty: 2 },
    { item: 'gf_tumo',        cost: 2500 },
    { item: 'gf_dayan',       cost: 2500 },
    { item: 'gf_bumie',       cost: 2500 },
    { item: 'pill_jiuzhuan',  cost: 1200 },
    { item: 'gf_zixiao',      cost: 9000 },
    { item: 'pill_taichu',    cost: 5000 },
    { item: 'm_xianjing',     cost: 800,  qty: 2 },
    { item: 'gf_jianxin',     cost: 30000 },
    { item: 'gf_hongmeng',    cost: 30000 },
    { item: 'pill_zaohua',    cost: 20000 },
    /* ---- v13 新增兑换 ---- */
    { item: 'gf_hansha',      cost: 900 },
    { item: 'gf_yulin',       cost: 900 },
    { item: 'gf_feixian',     cost: 2800 },
    { item: 'gf_lidu',        cost: 9500 },
    { item: 'gf_zhuixian',    cost: 3200 },
    { item: 'gf_danjing',     cost: 3200 },
    { item: 'gf_tianfu',      cost: 3200 },
    { item: 'gf_banti',       cost: 500 },
    { item: 'gf_zhoutian',    cost: 3200 },
    { item: 'gf_xuesha',      cost: 3200 },
    { item: 'pill_dahuan',    cost: 900 },
    { item: 'pill_yuanshen',  cost: 6000 },
    { item: 's_xt_jian',      cost: 20000 },
    { item: 's_xt_jia',       cost: 20000 },
    { item: 's_xt_pei',       cost: 20000 },
    { item: 's_cx_jian',      cost: 22000 },
    { item: 's_cx_pao',       cost: 22000 },
    { item: 's_cx_gou',       cost: 22000 },
    { item: 'z_hunpo',        cost: 15000 },
  ],

  /* ---------- 坊市货架（minRealm：达到该境界才会上架） ---------- */
  SHOP: [
    { item: 'pill_juqi', minRealm: 0 }, { item: 'pill_liaoshang', minRealm: 0 }, { item: 'pill_huiling', minRealm: 0 },
    { item: 'pill_jiedu', minRealm: 0 }, { item: 'pill_ningqi', minRealm: 1 }, { item: 'pill_peiyuan', minRealm: 1 },
    { item: 'pill_zhuji', minRealm: 0 }, { item: 'pill_pojing', minRealm: 2 }, { item: 'pill_jiuzhuan', minRealm: 3 },
    { item: 'pill_taichu', minRealm: 4 }, { item: 'pill_zaohua', minRealm: 6 },
    { item: 'pill_qingxin', minRealm: 1 }, { item: 'pill_mingmu', minRealm: 1 }, { item: 'pill_qingshen', minRealm: 1 },
    { item: 'pill_tiegu', minRealm: 2 }, { item: 'pill_kuangbao', minRealm: 2 }, { item: 'pill_guben', minRealm: 2 },
    { item: 'pill_dahuan', minRealm: 3 }, { item: 'pill_posha', minRealm: 2 }, { item: 'pill_xuanling', minRealm: 3 },
    { item: 'pill_yuanshen', minRealm: 5 }, { item: 'pill_tianyuan', minRealm: 7 },
    { item: 'tal_huoshe', minRealm: 0 }, { item: 'tal_zilei', minRealm: 2 },
    { item: 'tal_jinguang', minRealm: 1 }, { item: 'tal_jifengfu', minRealm: 1 },
    { item: 'tal_fuling', minRealm: 2 }, { item: 'tal_shigu', minRealm: 2 }, { item: 'tal_bingpo', minRealm: 3 }, { item: 'tal_posha', minRealm: 4 },
    { item: 'w_tiejian', minRealm: 0 }, { item: 'w_qinggang', minRealm: 1 }, { item: 'w_sanqing', minRealm: 2 }, { item: 'w_zhuxian', minRealm: 3 },
    { item: 'w_tulong', minRealm: 1 }, { item: 'w_hanshuang', minRealm: 2 },
    { item: 'a_buyi', minRealm: 0 }, { item: 'a_huxin', minRealm: 1 }, { item: 'a_xuangui', minRealm: 2 }, { item: 'a_longlin', minRealm: 3 },
    { item: 'a_xingyi', minRealm: 2 },
    { item: 'z_juling', minRealm: 0 }, { item: 'z_pingan', minRealm: 0 }, { item: 'z_jifengxue', minRealm: 1 }, { item: 'z_qiankun', minRealm: 2 }, { item: 'z_taiji', minRealm: 3 },
    { item: 'z_xingpan', minRealm: 2 },
    { item: 'gf_tuna', minRealm: 0 }, { item: 'gf_canghai', minRealm: 0 }, { item: 'gf_tiebu', minRealm: 0 },
    { item: 'gf_lieyang', minRealm: 1 }, { item: 'gf_xuantian', minRealm: 1 }, { item: 'gf_jifeng', minRealm: 1 }, { item: 'gf_tiangang', minRealm: 2 },
    { item: 'm_lingcao', minRealm: 0 }, { item: 'm_xuantie', minRealm: 0 },
    { item: 'seed_lingcao', minRealm: 1 }, { item: 'seed_lingzhi', minRealm: 1 }, { item: 'seed_bingpo', minRealm: 2 },
    { item: 'seed_xuelian', minRealm: 3 }, { item: 'seed_lianhun', minRealm: 3 },
  ],

  /* ---------- v13 套装（集齐 pieces 中全部装备于身时触发 bonus） ---------- */
  SETS: {
    xuantian: { name: '玄天套装', pieces: ['s_xt_jian', 's_xt_jia', 's_xt_pei'], bonus: { defPct: 15, hpPct: 10 }, text: '守御之道：防御 +15%，气血 +10%' },
    chixiao:  { name: '赤霄套装', pieces: ['s_cx_jian', 's_cx_pao', 's_cx_gou'], bonus: { atkPct: 15, crit: 5 }, text: '杀伐之道：攻击 +15%，暴击 +5%' },
    /* ---- v19 新增套装 ---- */
    xuehe:    { name: '血河套装', pieces: ['s_hj_sha', 's_hj_pao', 's_hj_ling'], bonus: { atkPct: 12, crit: 4 }, text: '血河遗锋：攻击 +12%，暴击 +4%' },
    xianyuan: { name: '仙缘套装', pieces: ['s_xy_jian', 's_xy_ling', 's_xy_huan'], bonus: { atkPct: 10, defPct: 10, hpPct: 10 }, text: '仙缘天成：攻击、防御、气血俱 +10%' },
  },

  /* ---------- v19 道韵协同：功法双双修至三层以上，共鸣生韵 ---------- */
  DAO_YUN: [
    { id: 'dy_jian',  name: '万剑归心', need: ['gf_jianxin', 'gf_wanjian'], fx: { atkPct: 4 },  desc: '剑心通明与万剑归宗相合：攻击 +4%' },
    { id: 'dy_dan',   name: '丹鼎鸿蒙', need: ['gf_danjing', 'gf_hongmeng'], fx: { cult: 4 },   desc: '丹经与鸿蒙相合：修炼效率 +4%' },
    { id: 'dy_fu',    name: '雷符双绝', need: ['gf_leishen', 'gf_zixiao'], fx: { crit: 4 },    desc: '雷神与紫霄相合：暴击 +4%' },
    { id: 'dy_ti',    name: '金刚不坏', need: ['gf_tiangang', 'gf_banti'], fx: { hpPct: 4 },   desc: '天罡与般若体相合：气血 +4%' },
    { id: 'dy_zhen',  name: '周天大衍', need: ['gf_dayan', 'gf_zhoutian'], fx: { dodge: 4 },   desc: '大衍与周天相合：闪避 +4%' },
    { id: 'dy_mo',    name: '血煞同源', need: ['gf_xuesha', 'gf_hansha'], fx: { atkPct: 3, crit: 2 }, desc: '血煞与寒煞相合：攻击 +3%，暴击 +2%' },
    { id: 'dy_hunyuan', name: '混元涅槃', need: ['gf_hunyuan', 'gf_niepan'], fx: { hpPct: 3, defPct: 3 }, desc: '混元与涅槃相合：气血、防御 +3%' },
    { id: 'dy_wangchen', name: '绝尘飞仙', need: ['gf_wangchen', 'gf_feixian'], fx: { dodge: 3 }, desc: '问尘与飞仙相合：身法轻灵，闪避 +3%' },
  ],

  /* ---------- v19→v20 精英词缀（精英怪随机 1~2 条，战斗前可见；mutex 互斥对不同时出现） ---------- */
  ELITE_AFFIXES: [
    { id: 'e_leech',  name: '汲血', desc: '攻击回复自身三成伤害的气血' },
    { id: 'e_thorns', name: '魔棘', desc: '受击反弹一成五伤害' },
    { id: 'e_swift',  name: '迅影', desc: '身法 +20%' },
    { id: 'e_wall',   name: '坚甲', desc: '防御 +25%' },
    { id: 'e_rage2',  name: '血性', desc: '狂暴后可再度狂暴一次' },
    { id: 'e_reborn', name: '不灭', desc: '濒死时以三成气血复活一次' },
    /* ---- v20 词缀扩池 ---- */
    { id: 'e_plague', name: '瘟疫', desc: '攻击时两成五几率附带随机蚀毒/灼烧/流血' },
    { id: 'e_soul',   name: '裂魂', desc: '命中后摄走你两成灵力' },
    { id: 'e_mirror', name: '镜像', desc: '你每获得一项增益，其攻击便涨 8%' },
    { id: 'e_tstorm', name: '雷皮', desc: '受法诀与符箓伤害 +30%，但自身攻击 -30%' },
    { id: 'e_gold',   name: '守财', desc: '攻防气血 +20%，死后掉落翻倍' },
    { id: 'e_wolf',   name: '群狼', desc: '每回合一成五几率唤来一头幼兽撕咬' },
  ],
  /** v20 精英词缀互斥对（同义/失衡组合不同时出现） */
  ELITE_AFFIX_MUTEX: [['e_swift', 'e_wall'], ['e_leech', 'e_gold'], ['e_rage2', 'e_reborn'], ['e_plague', 'e_soul']],

  /* ---------- v20 怪物习性模板（buildMonster 随机附加，战斗情报卡可见） ---------- */
  MONSTER_TEMPLATES: [
    { id: 'swift',   name: '速攻', hp: 0.85, atk: 1.0,  def: 1.0,  spd: 1.25, crit: 0,  desc: '身法极快，先手难防' },
    { id: 'iron',    name: '铁壁', hp: 1.15, atk: 0.85, def: 1.4,  spd: 0.85, crit: 0,  desc: '甲坚皮厚，硬碰吃亏' },
    { id: 'berserk', name: '狂战', hp: 1.0,  atk: 1.2,  def: 0.9,  spd: 1.0,  crit: 0,  desc: '攻势狂暴，宜速战速决' },
    { id: 'cunning', name: '狡诈', hp: 0.95, atk: 1.05, def: 1.0,  spd: 1.1,  crit: 6,  desc: '出手刁钻，暴击频仍' },
    { id: 'tough',   name: '坚韧', hp: 1.3,  atk: 0.95, def: 1.05, spd: 0.9,  crit: 0,  desc: '气血绵长，持久难缠' },
  ],
  /** 模板掷取权重（none 为无模板普通个体） */
  MONSTER_TEMPLATE_WEIGHTS: { none: 55, swift: 9, iron: 9, berserk: 9, cunning: 9, tough: 9 },

  /* ---------- v19 职业必杀技盘（真元 0~6：普攻命中+1，会心+2，防御+1） ---------- */
  BATTLE_SKILLS: {
    sword: [
      { id: 'us1', name: '剑斩·千山', cost: 3, mult: 3.0, crit: 15, desc: '剑气纵贯，如千山崩裂（3.0×，会心+15%）' },
      { id: 'us2', name: '剑域·囚杀', cost: 4, mult: 1.5, defdown: 30, rounds: 3, desc: '剑域困锁，敌防 -30% 三回合，再补一剑（1.5×）' },
      { id: 'us3', name: '万剑朝宗', cost: 6, mult: 4.5, desc: '万剑齐鸣，宗门唯我（4.5×）' },
    ],
    pill: [
      { id: 'up1', name: '丹火·燎原', cost: 3, mult: 2.0, burn: { pct: 6, rounds: 3 }, desc: '丹火泼洒，灼烧三回合（2.0×）' },
      { id: 'up2', name: '丹心·续命', cost: 4, heal: 0.4, desc: '九转还元，回复四成气血上限' },
      { id: 'up3', name: '洪炉·炼狱', cost: 6, mult: 3.0, burn: { pct: 9, rounds: 3 }, desc: '身化洪炉，焚尽八荒（3.0×+重灼烧）' },
    ],
    talisman: [
      { id: 'ut1', name: '符阵·雷狱', cost: 3, mult: 2.8, freeze: 25, desc: '雷符成狱，三成冻结（2.8×）' },
      { id: 'ut2', name: '双符·齐发', cost: 4, mult: 1.8, hits: 2, desc: '双符并出，两段连击（1.8××2）' },
      { id: 'ut3', name: '天笔·紫雷', cost: 6, mult: 4.2, desc: '一笔开天门，紫雷落九霄（4.2×）' },
    ],
    body: [
      { id: 'ub1', name: '崩山·震', cost: 3, mult: 2.5, stun: 25, desc: '一崩山河震，三成震缚（2.5×）' },
      { id: 'ub2', name: '金身·不坏', cost: 4, guard: 40, rounds: 3, desc: '金身罩体，减伤四成三回合' },
      { id: 'ub3', name: '般若·狮吼', cost: 6, mult: 3.5, stun: 40, desc: '狮吼破胆，四成震缚（3.5×）' },
    ],
    array: [
      { id: 'ua1', name: '困阵·锁龙', cost: 3, mult: 1.6, slow: 35, rounds: 3, desc: '困龙锁天，敌速 -35% 三回合（1.6×）' },
      { id: 'ua2', name: '杀阵·八方', cost: 4, mult: 2.2, hits: 2, desc: '八方杀气，两段绞杀（2.2××2）' },
      { id: 'ua3', name: '天罗·地网', cost: 6, mult: 3.0, stun: 30, desc: '天罗地网，插翅难逃（3.0×）' },
    ],
    demonic: [
      { id: 'ud1', name: '血遁·噬', cost: 3, mult: 2.6, leech: 0.5, desc: '血光噬敌，五成化为己用（2.6×）' },
      { id: 'ud2', name: '魔煞·蚀魂', cost: 4, mult: 1.6, weaken: 30, rounds: 3, desc: '魔煞蚀体，敌攻 -30% 三回合（1.6×）' },
      { id: 'ud3', name: '天魔·解体', cost: 6, mult: 5.0, selfHp: 0.1, desc: '燃血十成中取一，换五倍灭杀（5.0×）' },
    ],
  },

  /* ---------- 文案池 ---------- */
  NAMES: ['沈青山', '顾长风', '苏云澈', '叶凌天', '陆沉舟', '柳如烟', '洛清寒', '秦无衣', '姜怀远', '白亦尘', '林疏影', '谢惊鸿'],
  FLAVOR: {
    cultivate: [
      '你盘膝而坐，吐纳天地灵气，丹田处渐生暖意。',
      '夜深人静，你依功法行功一个周天，只觉神识清明了几分。',
      '晨曦初露，你迎着朝霞采气入体，浑身舒泰。',
      '你凝神静气，灵气如百川归海般汇入丹田。',
      '山风过隙，你在风中参悟功法，若有所得。',
      '你闭目内视，引导灵气冲刷经脉，隐有脆响。',
    ],
    /** v19 氛围见闻：探索途中偶见的山水人情（每图五则以上，纯叙事） */
    ambience: {
      village: [
        '村口的老槐树又落了一层叶。孩童们围着碾药的石臼追逐，笑声惊起一树麻雀。',
        '田埂上，农人直起腰擦汗，朝你憨憨一笑：「仙长又进山啦？」',
        '溪水绕村而过，捣衣声与炊烟一同升起来——这里安静得不像话，安静得让人想守着。',
        '村塾里传来稚嫩的读书声。你驻足片刻，想起许多年前，也有人这样念书给你听。',
        '夜里有犬吠。更夫的梆子敲了三下，声音传得很远，像替谁数着更漏。',
      ],
      qingfeng: [
        '青峰山的雾总是散得很慢。雾里有鸟鸣，一声近，一声远。',
        '半山腰的道观香火不旺，老道人扫着石阶，扫帚划过青石，沙沙如雨。',
        '崖畔一株歪脖子松探出云海。有胆大的修士在松下打坐，衣袂纹丝不动。',
        '山涧里卵石青白。你蹲下掬水，水凉得让人清醒——传说此山通着上古地脉，不知真假。',
        '暮色四合时，山影层层叠叠，最远的那一重，像一道凝固的墨痕。',
      ],
      heifeng: [
        '黑风寨的旗子歪在寨门上，风一吹，哗啦啦地响，像在数着什么旧账。',
        '寨墙根下有半截断箭，锈得发黑。不知是哪一任寨主，没能等到收尸的人。',
        '聚义厅的地砖有火烧的痕迹，一幅残破的舆图钉在墙上，被风撕去了一角。',
        '寨后山道狰狞。据说夜里有黑袍人从此经过，从不停留，也从不回头。',
        '一只乌鸦落在旗杆顶上，居高临下地看你。你忽然觉得，它像是替谁在盯梢。',
      ],
      forest: [
        '林深不知处。腐叶下有萤火明灭，像大地未阖上的眼睛。',
        '一株老藤缠着一具白骨，骨上苔痕斑斑——森林从不为谁收殓。',
        '头顶枝叶忽然一静。你按住剑柄，等了十息，鸟鸣才重新响起。',
        '兽径分岔处插着半截木牌，字迹被啃噬得只剩一个「危」字。',
        '夜行至此，林子深处有绿莹莹的光尾随。它不靠近，也不离开。',
      ],
      ruins: [
        '断柱倾颓如折剑。基石上的刻痕早已风化，只有纹路深处还蓄着微光。',
        '一尊无头石像跪在尘埃里，双手捧着一柄早已朽烂的剑。',
        '风穿过残垣，呜呜作响，像极远的年代里有人在诵读经文。',
        '荒草没膝处有一块平整的祭台。台面干干净净——有人比你先到，且不止一次。',
        '你拾起一枚碎瓦，釉色温润。三百年前的匠人不会想到，它此刻正握在一个寻仇人手里。',
      ],
      wanyao: [
        '万妖山脉的月色泛着紫。远处山脊上，有巨兽的剪影缓缓移过，像一座会走的山。',
        '妖市开在背风的谷地。妖修们讨价还价的声音，混着鳞片摩擦的沙沙声。',
        '一株千年树妖的枝干上挂着风铃——是哪个胆大的散修挂上去祈福的？',
        '山风里有腥气。老猎妖人说，闻到这股味，要么绕路，要么拔刀。',
        '岩壁上有巨大的爪痕，五指深嵌石中，爪痕里积着雨水，映着天上两只月亮似的眼。',
      ],
      youming: [
        '鬼泽的水是墨色的。水面上浮着白雾，雾下偶尔翻起一串气泡，无声地破掉。',
        '枯树上挂着引魂灯，灯焰是绿的，照见灯下歇脚的旅人——已不知歇了多久。',
        '泽心传来隐约的橹声。你循声望去，只有雾。老人们说，那是渡船人还在找没等到的人。',
        '白骨在浅滩上排成一列，头颅齐齐朝着泽心，像在朝拜什么。',
        '阴气入骨的寒。你点燃一张暖阳符，火光外三尺，黑暗纹丝不动。',
      ],
      feizhou: [
        '天外飞舟的残骸斜插在山脊，舟身符文明灭，像一颗不肯熄灭的心脏。',
        '舟骸投下的影子凉而硬。你在影子里捡到一枚星屑，指尖传来极轻的嗡鸣。',
        '残舱的舷窗内壁有抓痕，深深浅浅——坠落那一刻，舟里的人经历了什么？',
        '星辉从破口漏进来，在地上淌成一小片银泊。你忽然觉得，人间很小。',
        '舟首的雕像断了一只手臂，剩下的那只，仍指着天的方向。',
      ],
      longyuan: [
        '海眼的风带着咸腥。漩涡声昼夜不歇，像一头巨兽在均匀地呼吸。',
        '龙渊的水面下有鳞光一闪。渔人说那是老蛟在换鳞，鳞落之处，生三年海市。',
        '礁石上系着一截锈缆，缆头断口平整——不是磨断的，是斩断的。',
        '潮退时，滩涂上露出一座半淹的石碑。碑文被藻类啃噬，只剩「河」字可辨。',
        '夜里的龙渊会发光。海底深处，一点幽蓝，不增不减，像谁留下的一盏灯。',
      ],
      lingxu: [
        '灵墟仙泽的雾是甜的。仙鹤掠过水面，翅尖点碎一片云影。',
        '泽畔仙草结着露，一颗露珠里，倒映着一整片流云。',
        '远山有仙宫的檐角隐现，飞铃在风里响，声音干净得没有一丝杂念。',
        '此地的流水会唱歌。你侧耳听了半晌，竟听出一丝旧曲的味道——像是很久以前，有人哼过。',
        '仙泽的夜太亮，亮得看不见凡间的星。你忽然想念起青溪村那盏昏黄的灯。',
      ],
      leiyu: [
        '九霄雷狱的云层压得极低。雷光在云腹里游走，像巨龙睁眼前的痒。',
        '雷柱烧焦的地面呈蛛网状，焦痕里嵌着未化的兵刃残片——历代渡劫者的遗物。',
        '风里有铁锈味。雷狱的空气是涩的，吸一口，肺腑里像擦过火镰。',
        '你踩过一段焦土，鞋底还沾着前人的道韵残温。他没能走完这段路。',
        '雷云最深处，偶尔传下极轻的一声笑。守狱人说，那是雷在学人笑——学了很多年。',
      ],
    },
    seclude: [
      '石室之中，你屏绝外缘，物我两忘。',
      '洞府之内灵氤氤氲，你沉入定境，不知岁月。',
      '你于静室枯坐，心湖澄澈，道心愈坚。',
    ],
    nothing: [
      '你四处游历，除却山风拂面，一无所获。',
      '你搜寻良久，只捡到几块顽石，怅然而返。',
      '林间寂静，唯有鸟鸣，你漫步半日，空手而归。',
      '你追寻一丝异动而来，却发现只是风吹草动。',
    ],
    breakSuccess: [
      '轰——丹田深处一声轻鸣，桎梏应声而碎！',
      '天地灵气疯狂涌来，你的气息节节攀升！',
      '如拨云见日，你只觉浑身上下焕然一新！',
    ],
    breakFail: [
      '你奋力冲击瓶颈，却如以卵击石，气血翻涌。',
      '关隘岿然不动，你只觉经脉刺痛，只得暂时收功。',
      '差之毫厘！灵气在关隘前溃散，你闷哼一声。',
    ],
  },

  /* ---------- §19 大道职业（六选一，筑基解锁）----------
   * 属性加成在 Stat.compute / DaoSys.bonus 中折算；
   * 战斗与玩法特效散接于 Battle / CraftSys / Tribulation 各处。
   */
  DAO_CLASSES: [
    { id: 'sword',    name: '剑修', motto: '以剑证道，一往无前',
      desc: '剑锋所指，万法皆断。攻击 +50%，防御 -20%；剑心桀骜难驯，大境界渡劫难度 +30%；普攻有两成几率触发【剑心通明】伤害翻倍（剑心通明境后提至三成）。' },
    { id: 'pill',     name: '丹道', motto: '丹炉一转，造化乾坤',
      desc: '炼丹成功率 +60%，丹药效果 +30%；常年守着丹炉，疏于斗法——攻击 -15%；坊市出售丹药价格提升五成。' },
    { id: 'talisman', name: '符修', motto: '一符在手，天地借法',
      desc: '战斗中可祭出符箓，轰出高额爆发；可在坊市挥毫画符售卖营生；法诀灵力消耗 +20%。' },
    { id: 'body',     name: '体修', motto: '肉身成圣，金刚不坏',
      desc: '气血上限 +100%，防御 +50%；肉身蔽塞灵窍，难悟玄级及以上法诀；金刚之躯，渡劫成算 +40%。' },
    { id: 'array',    name: '阵道', motto: '一念成阵，困杀万物',
      desc: '历练遇敌有五成几率抢先布阵，压制敌方攻防（困阵境四成、杀阵境开场两成直接困杀）；于秘境遗迹探索时收益 +20%。' },
    { id: 'demonic',  name: '邪修', motto: '逆天而行，唯我独邪',
      desc: '修炼速度 +80%，杀敌可吞噬精元（额外两成修为）；每场战斗孽障 +1；一身邪气，为正道修士所不容。' },
  ],

  /* ---------- §20 炼丹配方（坊市炼丹炉，人人可用，丹道大成率大涨）---------- */
  ALCHEMY_RECIPES: [
    { id: 'r1', out: 'pill_juqi',     need: { m_lingcao: 2 },                  rate: 65 },
    { id: 'r2', out: 'pill_liaoshang', need: { m_yaopi: 1, m_lingcao: 1 },     rate: 65 },
    { id: 'r3', out: 'pill_peiyuan',  need: { m_lingzhi: 2 },                  rate: 55 },
    { id: 'r4', out: 'pill_pojing',   need: { m_neidan: 2 },                   rate: 50 },
    { id: 'r5', out: 'pill_jiuzhuan', need: { m_xuelian: 1, m_longxue: 1 },    rate: 45 },
    { id: 'r6', out: 'pill_taichu',   need: { m_xianjing: 1, m_shentie: 1 },   rate: 40 },
    /* ---- v13 新增配方 ---- */
    { id: 'r7', out: 'pill_kuangbao', need: { m_yaopi: 2 },                    rate: 60 },
    { id: 'r8', out: 'pill_tiegu',    need: { m_xuantie: 2 },                  rate: 60 },
    { id: 'r9', out: 'pill_guben',    need: { m_lingzhi: 1, m_neidan: 1 },     rate: 55 },
    { id: 'r10', out: 'pill_dahuan',  need: { m_xuelian: 2 },                  rate: 45 },
    { id: 'r11', out: 'pill_posha',   need: { m_neidan: 2, m_xuantie: 1 },     rate: 50 },
    { id: 'r12', out: 'pill_xuanling', need: { m_lianhun: 2 },                 rate: 45 },
    { id: 'r13', out: 'pill_yuanshen', need: { m_xianjing: 2 },                rate: 40 },
    { id: 'r14', out: 'pill_tianyuan', need: { m_shentie: 1, m_haixin: 1 },    rate: 35 },
    /* ---- v19 失传丹方（需丹方残页参悟解锁：flags.recipeOk） ---- */
    { id: 'a1', out: 'pill_huiyuan', need: { m_lingzhi: 2, m_haixin: 1 },   rate: 45, needPages: 2 },
    { id: 'a2', out: 'pill_potian',  need: { m_neidan: 3, m_shentie: 1 },   rate: 40, needPages: 4 },
    { id: 'a3', out: 'pill_poxu',    need: { m_shenmu: 2, m_xiancui: 2 },   rate: 35, needPages: 6 },
  ],

  /* ---------- v13 炼器配方（坊市炼器坊，消耗材料锻造装备；产出天级神兵的唯一途径） ---------- */
  FORGE_RECIPES: [
    { id: 'f1', out: 'w_tulong',    need: { m_xuantie: 3 },                          rate: 75 },
    { id: 'f2', out: 'w_hanshuang', need: { m_xuantie: 2, m_bingpo: 1 },             rate: 65 },
    { id: 'f3', out: 'a_xingyi',    need: { m_yaopi: 2, m_xuecan: 1 },               rate: 65 },
    { id: 'f4', out: 'z_xingpan',   need: { m_xuantie: 1, m_lingzhi: 1 },            rate: 60 },
    { id: 'f5', out: 'z_hunpo',     need: { m_lianhun: 2, m_bingpo: 1 },             rate: 55 },
    { id: 'f6', out: 'w_tianwen',   need: { m_shentie: 1, m_xingchen: 2, m_jiaojin: 1 }, rate: 50 },
    /* ---- v19 血河套装（炼器唯一产出） ---- */
    { id: 'f9', out: 's_hj_sha',   need: { m_shentie: 2, m_jiaojin: 2, m_haixin: 1 },  rate: 45 },
    { id: 'f10', out: 's_hj_pao',  need: { m_shentie: 1, m_haixin: 2, m_shenmu: 1 },   rate: 45 },
    { id: 'f11', out: 's_hj_ling', need: { m_lianhun: 2, m_jiaojin: 2 },                rate: 45 },
    { id: 'f7', out: 'a_taiyi',     need: { m_xuecan: 2, m_shenmu: 1, m_xianjing: 1 },   rate: 45 },
    { id: 'f8', out: 'z_longyu',    need: { m_longxue: 1, m_jiaojin: 1, m_haixin: 1 },   rate: 45 },
    { id: 'f15', out: 's_xt_jian',   need: { m_xuantie: 4, m_bingpo: 2 },             rate: 55 },
    { id: 'f16', out: 's_xt_jia',   need: { m_xuantie: 4, m_xuecan: 2 },             rate: 55 },
    { id: 'f17', out: 's_xt_pei',   need: { m_lianhun: 1, m_bingpo: 2 },             rate: 55 },
    { id: 'f12', out: 's_cx_jian',  need: { m_huolin: 2, m_jiaojin: 1 },             rate: 50 },
    { id: 'f13', out: 's_cx_pao',   need: { m_huolin: 2, m_yaopi: 3 },               rate: 50 },
    { id: 'f14', out: 's_cx_gou',   need: { m_huolin: 1, m_neidan: 2 },              rate: 50 },
  ],

  /* ---------- §20 红尘劫剧本（历练道德三选一）---------- */
  DILEMMAS: [
    { id: 'traveler', title: '重伤旅人', text: '一名旅人倒在道旁，气息奄奄，储物袋就悬在腰间——袋中之物，够寻常人家嚼用十年。' },
    { id: 'caravan',  title: '遭劫商队', text: '前方商队正被散修围攻，货物散落一地，妇孺哭喊之声顺风传来。' },
    { id: 'beast',    title: '落难幼妖', text: '一只幼妖被猎户的铁夹困住，眼中噙泪。妖丹虽小，亦是炼丹的好材料。' },
    { id: 'temple',   title: '破观道人', text: '山间破观的道人拦路化缘：「观中收留的孤儿，已三日未见米粮了。」' },
    { id: 'rival',    title: '灵药之争', text: '一株灵药现世，一名散修也看见了它。他修为不弱于你，正朝你冷笑。' },
    { id: 'oldwoman', title: '风雪老妪', text: '风雪中一名老妪蜷缩乞食，你若施舍盘缠，只怕自己下一程要徒步挨饿。' },
  ],

  /* ---------- §24 二十四位常驻修士（随游戏时间自行修炼游历）----------
   * realm: 初始大境界；talent: 资质（成长速度）；kin: 血亲（恩怨连坐）；
   * sect: 所属宗门（影响称呼与派系）；temper: 性情。
   */
  NPCS: [
    { id: 'n1',  name: '沈青崖', title: '青锋剑痴',   sect: 'qingyun', talent: 5, realm: 2, kin: ['n14'], temper: '孤傲', desc: '青云剑宗首席，剑不离身，终身不履红尘。' },
    { id: 'n2',  name: '顾轻语', title: '丹谷仙子',   sect: 'danxia',  talent: 4, realm: 2, kin: [],      temper: '温婉', desc: '丹霞谷少谷主，一手回春丹术名动一方。' },
    { id: 'n3',  name: '苏白',   title: '落魄书生',   sect: null,      talent: 3, realm: 0, kin: [],      temper: '温润', desc: '屡试不第的书生，转而问道，家贫志不短。' },
    { id: 'n4',  name: '叶孤鸿', title: '孤刀客',     sect: null,      talent: 4, realm: 1, kin: [],      temper: '冷厉', desc: '独来独往的刀客，刀下不留活口，仇家遍地。' },
    { id: 'n5',  name: '柳含烟', title: '烟雨楼主',   sect: 'wanbao',  talent: 3, realm: 2, kin: [],      temper: '玲珑', desc: '烟雨楼楼主，消息灵通，手眼通天。' },
    { id: 'n6',  name: '陆吾',   title: '铁塔汉子',   sect: null,      talent: 2, realm: 1, kin: [],      temper: '豪爽', desc: '行脚体修，一身横练功夫，最重义气。' },
    { id: 'n7',  name: '洛雪衣', title: '琴心剑影',   sect: 'qingyun', talent: 4, realm: 3, kin: [],      temper: '清冷', desc: '以琴入道的剑修，一曲《雪衣》可退千军。' },
    { id: 'n8',  name: '秦重楼', title: '重楼商君',   sect: 'wanbao',  talent: 3, realm: 3, kin: [],      temper: '精明', desc: '万宝商会大掌柜，灵石堆里修出来的金丹。' },
    { id: 'n9',  name: '姜暮寒', title: '符门老叟',   sect: null,      talent: 3, realm: 2, kin: [],      temper: '古怪', desc: '隐市符师，笔下符箓千金难求。' },
    { id: 'n10', name: '白玉京', title: '阵道大家',   sect: 'danxia',  talent: 4, realm: 4, kin: [],      temper: '淡泊', desc: '闭门百年摆一座阵，出山一日惊天下。' },
    { id: 'n11', name: '林晚照', title: '圣手医仙',   sect: 'danxia',  talent: 3, realm: 2, kin: [],      temper: '慈悲', desc: '救人无数的游方医修，人脉遍布修行界。' },
    { id: 'n12', name: '谢惊鸿', title: '妙手空空',   sect: null,      talent: 4, realm: 1, kin: [],      temper: '狡黠', desc: '盗修出身的散人，来无影去无踪。' },
    { id: 'n13', name: '云无月', title: '月下魔姝',   sect: null,      talent: 5, realm: 3, kin: [],      temper: '危险', desc: '行事莫测的魔道修士，亦正亦邪。' },
    { id: 'n14', name: '沈疏影', title: '剑宗小师妹', sect: 'qingyun', talent: 4, realm: 1, kin: ['n1'],  temper: '娇憨', desc: '沈青崖幼妹，天资出众，最受门中宠爱。' },
    { id: 'n15', name: '唐三思', title: '万事通',     sect: 'wanbao',  talent: 2, realm: 0, kin: [],      temper: '市侩', desc: '坊市包打听，三枚灵石能买你一条消息。' },
    /* ---- v13 新增九位常驻修士 ---- */
    { id: 'n16', name: '楚天阔', title: '裂山力士',   sect: 'panyan',  talent: 4, realm: 2, kin: ['n20'], temper: '豪迈', desc: '磐岩谷大弟子，双臂之力可裂山岩，最恨阴诡之徒。' },
    { id: 'n17', name: '姬冰颜', title: '星阵仙子',   sect: 'zhoutian', talent: 5, realm: 3, kin: [],      temper: '清冷', desc: '周天阁首席，布阵时漫天星辰皆为其子，性情清冷不假辞色。' },
    { id: 'n18', name: '顾青书', title: '青衿剑生',   sect: 'qingyun', talent: 3, realm: 1, kin: [],      temper: '儒雅', desc: '剑宗里的读书人，一手青萍剑法如行云流水。' },
    { id: 'n19', name: '花千树', title: '金算盘',     sect: 'wanbao',  talent: 3, realm: 2, kin: [],      temper: '圆滑', desc: '商会里最会做买卖的管事，一双眼睛能看穿货物十成成色。' },
    { id: 'n20', name: '石破天', title: '顽石真人',   sect: 'panyan',  talent: 3, realm: 3, kin: ['n16'], temper: '憨直', desc: '磐岩谷长老，天生神力，认死理，认准的道九头牛拉不回。' },
    { id: 'n21', name: '洛神秋', title: '观星老人',   sect: 'zhoutian', talent: 4, realm: 4, kin: [],      temper: '飘逸', desc: '周天阁阁主，夜夜观星，据说能从星轨中算出人间气数。' },
    { id: 'n22', name: '红绡',   title: '血罗刹',     sect: null,      talent: 4, realm: 2, kin: [],      temper: '危险', desc: '行走黑暗中的女修，美艳危险，亦正亦邪，恩怨分明。' },
    { id: 'n23', name: '老酒鬼', title: '醉道人',     sect: null,      talent: 5, realm: 3, kin: [],      temper: '癫狂', desc: '抱着酒葫芦云游四方的疯道人，偶有惊世之言，深藏不露。' },
    { id: 'n24', name: '燕回时', title: '归雁剑侠',   sect: null,      talent: 4, realm: 1, kin: [],      temper: '侠气', desc: '路见不平必拔刀的游侠剑客，宁折不弯。' },
  ],

  /* ---------- §24 宗门长老派系（站队得专属资源，敌对派系派高危任务） ---------- */
  SECT_FACTIONS: [
    { id: 'tianshu',  name: '天枢殿', motto: '征伐之道，以战养战', desc: '主战长老一脉，崇尚以杀止杀。',
      giftText: '入门赐灵石三百与【天枢战纹】信物', gift: { stones: 300, item: 'z_tianshu' }, exclusive: [{ item: 'gf_tumo', cost: 1800 }] },
    { id: 'danding',  name: '丹鼎阁', motto: '丹火不熄，道火不灭', desc: '执掌丹房的长老一脉，丹药管够。',
      giftText: '入门赐【破境丹】×2 与【丹心玉佩】信物', gift: { stones: 100, item: 'z_danxin', extra: { pill_pojing: 2 } }, exclusive: [{ item: 'pill_jiuzhuan', cost: 900 }] },
    { id: 'cangjing', name: '藏经楼', motto: '典藏万法，开卷有益', desc: '看守藏经楼的长老一脉，典籍为尊。',
      giftText: '入门赐一部攻防典籍与【藏经阁印】信物', gift: { stones: 100, item: 'z_cangjing', gongfa: ['gf_lieyang', 'gf_xuantian'] }, exclusive: [{ item: 'gf_dayan', cost: 1800 }] },
  ],

  /* ---------- §25 秘境（每个大境界一座，肉鸽式节点探索） ---------- */
  DUNGEON_TOTAL_LAYERS: 9,
  DUNGEON_NODE_NAMES: { battle: '战斗', treasure: '宝箱', fortune: '奇遇', trap: '陷阱', npc: '遭遇', boss: '守关者' },
  SECRET_REALMS: [
    { id: 'sr0', name: '落霞洞天', recRealm: 0, desc: '练气修士便可涉足的小型洞天，霞光深处别有洞天。', pool: ['m_yezhu', 'm_dushe', 'm_shanlang', 'm_zeiren'], weights: { battle: 40, treasure: 22, fortune: 16, trap: 10, npc: 12 } },
    { id: 'sr1', name: '碧水寒潭', recRealm: 1, desc: '寒潭之下封着一座前朝水府，机关重重。', pool: ['m_qingbei', 'm_linghou', 'm_tiexia', 'm_luopo'], weights: { battle: 42, treasure: 20, fortune: 14, trap: 12, npc: 12 } },
    { id: 'sr2', name: '万蛊密林', recRealm: 2, desc: '蛊虫遮天的密林，危机与造化同在。', pool: ['m_chilin', 'm_fuqun', 'm_duzhu', 'm_chiyan'], weights: { battle: 46, treasure: 18, fortune: 12, trap: 12, npc: 12 } },
    { id: 'sr3', name: '上古剑冢', recRealm: 3, desc: '万剑朝冢，剑气冲霄，上古剑修埋骨之地。', pool: ['m_shikui', 'm_jianling', 'm_yinling', 'm_fengbao'], weights: { battle: 48, treasure: 18, fortune: 12, trap: 12, npc: 10 } },
    { id: 'sr4', name: '星坠之地', recRealm: 4, desc: '一颗星辰坠落形成的深谷，陨铁遍地，异兽横行。', pool: ['m_xiongyuan', 'm_yaohu', 'm_yinling', 'm_jianling'], weights: { battle: 48, treasure: 18, fortune: 12, trap: 12, npc: 10 } },
    { id: 'sr5', name: '太阴废城', recRealm: 5, desc: '太阴之气笼罩的死城，白骨为兵，阴灵为将。', pool: ['m_shigui', 'm_yuangu', 'm_yinjiao', 'm_moxiu'], weights: { battle: 50, treasure: 16, fortune: 12, trap: 12, npc: 10 } },
    { id: 'sr6', name: '九幽冥河', recRealm: 6, desc: '冥河水黑，渡船人无名，河底沉睡着上古战魂。', pool: ['m_guizu', 'm_yuangu', 'm_xueshe', 'm_moxiu'], weights: { battle: 50, treasure: 16, fortune: 12, trap: 12, npc: 10 } },
    { id: 'sr7', name: '混沌裂隙', recRealm: 7, desc: '天地初开时遗留的裂隙，混沌之气足以撕裂神魂。', pool: ['m_moxiu', 'm_xuling', 'm_tianchong'], weights: { battle: 52, treasure: 16, fortune: 12, trap: 12, npc: 8 } },
    { id: 'sr8', name: '仙府遗墟', recRealm: 8, desc: '一位仙人陨落前的洞府残墟，仙机将现。', pool: ['m_moxiu', 'm_xinggui', 'm_jianling'], weights: { battle: 50, treasure: 18, fortune: 14, trap: 10, npc: 8 } },
    { id: 'sr9', name: '登仙天梯', recRealm: 9, desc: '直上九霄的登天云梯，一步一重天，仙缘尽头是仙门。', pool: ['m_jianling', 'm_moxiu'], weights: { battle: 52, treasure: 16, fortune: 14, trap: 10, npc: 8 } },
  ],

  /* ---------- §26 转世出身（兵解转世时重择） ---------- */
  ORIGINS: [
    { id: 'hunter',  name: '山村猎户', desc: '自幼打猎熬筋骨，根骨体魄过人，悟性稍逊。', mods: { gen: 2, body: 2, comp: -1, luck: -1 }, start: { stones: 220, bag: { w_tiejian: 1, pill_liaoshang: 3 } } },
    { id: 'noble',   name: '世家子弟', desc: '家学渊源，悟性福缘俱佳，根骨体魄平平。', mods: { comp: 2, luck: 1, gen: -1, body: -1 }, start: { stones: 1200, bag: { gf_tuna: 1, pill_juqi: 5 } } },
    { id: 'scholar', name: '书院书生', desc: '读书养气，触类旁通，唯体魄孱弱。', mods: { comp: 2, luck: 2, body: -2, gen: -1 }, start: { stones: 400, bag: { pill_zhuji: 1, pill_juqi: 2 } } },
    /* ---- v19 出身扩充 ---- */
    { id: 'heritor', name: '血河遗孤', desc: '血脉里刻着三百年前的血债——孽障缠身，残玉先鸣。', mods: { gen: 1, luck: -1 }, start: { stones: 100, bag: { pill_juqi: 2 }, karma: 30, jade: 1 } },
    { id: 'herbal', name: '荒野药农', desc: '识百草知药性，起步便有满囊灵材。', mods: { luck: 2, comp: 1, gen: -1 }, start: { stones: 300, bag: { m_lingcao: 8, m_lingzhi: 2, seed_lingcao: 2 } } },
    { id: 'escort', name: '镖局护院', desc: '刀口舔血练出的硬功夫，家底殷实。', mods: { body: 2, gen: 1, comp: -1 }, start: { stones: 1500, bag: { w_qinggang: 1, pill_liaoshang: 4 } } },
    { id: 'tamer', name: '妖谷驯手', desc: '自幼与妖兽为伴，深谙驯服之道。', mods: { luck: 2, body: 1, comp: -1 }, start: { stones: 600, bag: { m_neidan: 2 } }, tameSkill: 30 },
    { id: 'merchant', name: '商会学徒', desc: '算盘打得比剑快——财路通仙路。', mods: { comp: 1, luck: 1, gen: -1 }, start: { stones: 3000, bag: {} } },
  ],

  /* ---------- §23 世界大事件（每 100 游戏年一次，永久改变格局） ---------- */
  WORLD_EVENTS: [
    { id: 'demon',  name: '魔界入侵',     desc: '魔气自天外涌入，一方之地化为魔域——域内妖魔狂化暴增，凶险倍之，然所获亦丰。' },
    { id: 'preach', name: '圣地讲道',     desc: '上古圣地开启讲道大会，道音涤荡神魂。十年之内，天下修士悟性倍增。' },
    { id: 'ruins',  name: '上古秘境现世', desc: '一座上古秘境重现人间，二十年间秘宝频现，机缘遍地。' },
    { id: 'war',    name: '宗门大战',     desc: '正道宗门因理念的裂痕兵戎相见，三十年战火——宗门悬赏暴涨，坊市物价腾贵。' },
  ],

  /* ---------- v6 图鉴：妖兽背景介绍（其余图鉴条目沿用各 def.desc） ---------- */
  CODEX_INTRO: {
    m_yezhu: '山间常见之野彘，獠牙初长，性憨而凶，是练气修士最好的磨刀石。',
    m_dushe: '栖于草莽的青环毒蛇，一寸信子一寸针，轻敌者多栽在它的偷袭上。',
    m_shanlang: '成群出没的灰毛山狼，惯于包抄围猎，落单的修士最合它们胃口。',
    m_zeiren: '不事生产、专劫道财的泼皮散修，手底有几分三脚猫功夫。',
    m_toumu: '盘踞后山的山贼头目，一把开山刀使得虎虎生风，腰间缠着抢来的储物袋。',
    m_qingbei: '青峰山特产的巨狼，脊背青毛如鬃，嚎声可传十里。',
    m_linghou: '通体雪白的灵猴，身轻如燕，最擅窃取修士腰间之物。',
    m_tiexia: '皮如铁铸的独角巨犀，横冲直撞，寻常剑刃难伤分毫。',
    m_luopo: '沦落到劫道糊口的落魄修士，招式里还残留着几分宗门底子。',
    m_qingluan: '青峰山灵禽之王，青羽如翠，一声清唳可慑百兽。',
    m_loulou: '黑风寨的喽啰修士，凭寨势横行乡里，本事平平。',
    m_erdangjia: '黑风寨二当家，心狠手辣，一杆浑铁枪专为拦道而生。',
    m_guimian: '戴着鬼面的神秘修士，来去无踪，行事狠辣不留活口。',
    m_dadangjia: '黑风寨大当家，筑基修为，寨中藏得有历年劫掠来的浮财。',
    m_chilin: '赤鳞蟒，妖兽森林的霸主之一，蜕下的蟒皮是上好炼材。',
    m_fuqun: '嗜血蝠群，闻血而动，铺天盖地令人防不胜防。',
    m_liedi: '裂地虎，一掌可碎石裂地，森林深处横行无忌。',
    m_shuyao: '千年古树成精所化的树妖，枝蔓如臂，绞杀生灵不断根。',
    m_shikui: '上古遗迹中护卫洞府的石傀，刀枪不入，力大无穷。',
    m_yinling: '噬魂阴灵，无形无质，专食修士神魂。',
    m_jianling: '上古剑修兵解后所化的剑灵，一缕剑意犹自锋锐。',
    m_moxiu: '修魔入邪的残魂，怨气凝身，遇之莫非大凶。',
    /* ---- v13 新增妖兽图录 ---- */
    m_duzhu: '花斑毒蛛，结网于花木之间，其毒虽缓，却蚀骨入髓。',
    m_xiezi: '铁背岩蝎，背负铁色硬壳，双螯一尾，皆淬山岩剧毒。',
    m_chiyan: '赤炎狼，毛色如火，性情暴烈，奔行时带起一路焦烟。',
    m_hanshi: '寒潭冰蟾，蟾鸣一声，寒气千里，冬日亦不敢近其潭。',
    m_fengbao: '风影豹，疾驰如风，只见其影不见其形，见形时爪已至。',
    m_xiongyuan: '赤目凶猿，双目赤红如血，力大无穷，最喜捶胸示威。',
    m_tengyao: '千年藤妖，藤蔓如臂如网，缚人绞杀，汲取血肉为养。',
    m_yaohu: '九尾妖狐，媚眼如丝，狐火焚心，多少修士折在其一顾之间。',
    m_heijiao: '黑蛟，蛟属凶种，黑鳞如墨，一尾可断江流，山中王者。',
    m_shiren: '石人武士，上古阵法孕生的石傀，持锤而立，千年不倦。',
    m_guizu: '黄泉鬼卒，阴司游兵，勾魂索魄，见之者如坠黄泉。',
    m_yuangu: '千年怨鬼，怨气千年不散，其语如耳畔低喃，闻之神魂俱颤。',
    m_shigui: '白骨尸鬼，尸毒蚀骨，爪过处血肉腐坏，最是难缠。',
    m_yinjiao: '阴煞蛟，生于幽泽的蛟类异种，通体阴煞，所游之处生机断绝。',
    m_xueshe: '雪域冰蟒，蟒身覆霜，吐信成冰，绞缠之力可碎金玉。',
    m_yinshou: '泽底阴兽，幽泽最深处的凶物，无人见过其全貌——见过的人都沉在了泽底。',
    m_xinggui: '星陨石傀，天外飞舟的护卫傀儡，星辉装甲千年未损。',
    m_tianchong: '天外异虫，随飞舟坠落的域外虫群，蚀髓吸髓，繁衍极快。',
    m_xuling: '虚空幻灵，虚实难辨的域外之物，触之即被虚空禁锢。',
    m_zhouling: '飞舟器灵，飞舟核心孕育出的器灵，视闯入者为窃贼，格杀勿论。',
    m_shuiling: '沧海水灵，龙渊灵气所化的精灵，潮汐起落间可愈可杀。',
    m_haiyi: '深渊海兽，万丈渊底的巨兽，一张巨口可吞舟楫。',
    m_jiaojiao: '怒海蛟龙，蛟中年长者，已具龙形，怒涛覆海，威震龙渊。',
    m_longgui: '玄武龙龟，龙裔异种，甲如玄武，寿逾万年，近乎不死。',
    m_yuanmo: '渊底魔影，龙渊最深处的魔物，无人知晓其来历——只知连蛟龙都绕着它游。',
    /* ---- v18 灵界妖兽图录 ---- */
    m_linglu: '灵墟仙鹭，泽上仙禽，翼展丈余，振翅间带起灵雨。性傲，不喜凡俗近泽。',
    m_xianmo: '仙泽水魅，居于灵雾深处的魅灵，歌声可引人入水。泽上渔歌，十有九是它。',
    m_lingjiang: '灵墟守将，上古镇守仙泽的兵魂，甲胄犹在，唯令是从——闯泽者，皆敌。',
    m_leixiao: '雷霄独角兽，雷狱灵兽，独角蓄雷，奔行时蹄下生电。驯之可为坐骑，怒之则为天罚。',
    m_leimen: '九霄雷灵，雷劫余气所化的精怪，无形无定，触之如遭雷殛。',
    m_tianlong: '应龙残魄，上古应龙陨落后的残魂，犹存龙威。一声龙吟，山河变色。',
    m_lingxue: '灵墟雪猿，栖于仙泽雪岭的白猿，臂力千钧，喜掷冰锥戏耍来客。',
    m_tianle: '九霄雷兽，雷狱深处的凶兽，皮糙如雷砧，吼声滚滚如雷过境。',
    m_xianzun: '仙尊残念，一位仙尊陨落前的不灭执念，仙威犹存。近之者，神魂如坠冰渊。',
    m_leishen: '雷狱主宰，九霄雷狱的最深处的主人，雷罚加身而不伤——渡劫者若有幸一见，多半已无幸。',
  },

  /* ======================================================================
   * v19 世界观圣经 LORE（单一事实源：所有剧情文本取材于此，杜绝设定漂移）
   * ====================================================================== */
  LORE: {
    intro: '三百年前，以魔入道的血河宗立于血河故道之上，宗中三百七十一口。一夜之间，九宗联手围杀，满门覆灭——世人皆以为血案已了，唯有半枚残玉知道真相。',
    bloodRiver: {
      name: '血河宗',
      fall: '三百年前九宗联手围杀，焚功法一十七部、丹炉九座。然缴获名录载：万魂丹炉下不见尸骨，唯余锁魂链九十九条——炼丹之魂，尽随炉主遁走。',
      truth: '血河宗主帝渊为破化神瓶颈炼「万魂丹」，需九千九百九十九道生魂，再以一味「主魂」引之。首席（前世的我）不忍婴啼入炉，打翻丹炉，被打碎金身、真灵封入半枚引魂玉。帝渊随即伪造黑玉令挑动九宗围杀自家宗门——一石二鸟：借正道之刀清洗知情者，又以「血河覆灭」的假象遁入故道水底，沉潜三百年温养魔身。万魂丹炉连同炉中未散的三千魂魄，皆随他遁走。',
    },
    jade: {
      origin: '残玉本为一对「引魂玉」，帝渊亲手所炼。叛徒真灵的一半由药堂执事陈拾带出；另一半，帝渊自留——这正是他能追踪残玉、感知携带者修为的原因。',
      whisper: '玉中不止真灵。当年炉中渗入的一缕缕亡魂低语，三百年未曾散去。',
      abilities: { 3: '玉灵护体', 6: '血河噬敌', 9: '两世归一' },
    },
    xuanying: '玄影客，无面无名，腕刺河纹——是帝渊以自身影魂裁出的「影身」。三百年间代主行走人间：掘龙脉以寻上古炼魂石的封印方位，盯梢每一代残玉携带者。所谓「宗主分身」，即此身。',
    tally: '黑玉令：无落款的围杀密令，九宗各执一词——实为帝渊伪造。当年九位执行人之一、太衍宗太上长老玄玑真人隐约察觉不对，私留一份名单，朱笔圈出「最先起疑之人」。',
    gupian: '上古炼魂石：克魔魂的古宝，陨落古修拼死封存九枚于十大秘境。九碎片合成本命法宝，以本命精血认主——它认的是「护」字，持之害人，必遭反噬。',
    ferryman: '血河故道入水三千丈，唯渡船人知水路。当年血河宗的渡船人装疯三百年，抱着一坛酒守着入口，也守着愧疚——江湖人称「醉道人」。',
    timeline: [
      { y: '三百年前 · 春', t: '血河宗主开炉炼万魂丹，九千九百九十八道生魂入炉。' },
      { y: '三百年前 · 夏', t: '首席打翻丹炉，金身碎，真灵封入半枚引魂玉。' },
      { y: '三百年前 · 秋', t: '黑玉令出，九宗围杀血河故道。满门三百七十一口，药堂执事陈拾携玉突围。' },
      { y: '三百年前 · 冬', t: '帝渊携万魂丹炉遁入故道水底；玄影客 begin 代主追缉。上古残魂封九枚炼魂石于诸秘境。' },
      { y: '此后 · 每一代', t: '残玉择主而栖。历代携带者皆在飞升雷台前夜「暴毙」——无人知道那是收魂。' },
      { y: '本代 · 序', t: '青溪村药翁陈拾油尽灯枯，半枚残玉传入你手。问道九章，自此始。' },
    ],
    factions: [
      { name: '青云剑宗', stance: '愧', desc: '当年围杀主力之一。掌门一脉讳莫如深，唯白鹤真人欲补此过。' },
      { name: '丹霞谷', stance: '污', desc: '当年曾为血河供过一半丹材——这段黑料，是垂死散修临终的笑语，也是谷中永远的把柄。' },
      { name: '万宝商会', stance: '利', desc: '乱世发财，两头下注。商会的旧账房里，或许还押着血河的质押物。' },
      { name: '磐岩谷', stance: '直', desc: '当年拒签黑玉令的正直小宗，因此被正道疏远三百年。' },
      { name: '周天阁', stance: '知', desc: '观星者。三百年前夜观血河故道星轨未灭者，正是阁中先辈——档案锁在观星塔顶层。' },
      { name: '血河余孽', stance: '敌', desc: '玄影客与散落暗处的旧部。他们不藏在宗门里，藏在人心的缝里。' },
    ],
    places: {
      village: '青溪村 · 后山——陈拾隐居终老之地，坟头朝东。',
      qingfeng: '青峰山——山坳藏着上古遗迹，石壁血图标注炼魂石的方位之一。',
      heifeng: '黑风寨——明为劫道泼皮，实为玄影客雇来的掘脉苦力。',
      forest: '妖兽森林——万蛊密林深处有血河旧部的销赃暗市。',
      ruins: '秘境遗迹——上古剑冢与残魂封石之地。',
      wanyao: '万妖山脉——妖族大酋的领地，与血河有着以物易物的旧约。',
      youming: '幽冥鬼泽——阴气直通地底血河，泽底隐有渡船的缆痕。',
      feizhou: '天外飞舟残骸——星图残页记载着「雷台收魂」的旧例。',
      longyuan: '龙渊海眼——海眼之下水脉暗通血河故道。',
      lingxu: '灵墟仙泽——真仙之境，血河余孽最后的藏身处。',
      leiyu: '九霄雷狱——历代残玉携带者「暴毙」之地，雷台的真相。',
    },
  },

  /* ======================================================================
   * v19 角色注册表 CHARACTERS（主线人物单一事实源）
   * 剧情引擎以 who:'@id' 引用，人物志按此渲染。look 为程序化肖像参数。
   * ====================================================================== */
  CHARACTERS: {
    c_laoren:   { name: '采药老人', title: '青溪村药翁 · 血河遗民', color: '#7a6a4a', stance: '善', role: '引路人',
      desc: '本名陈拾，血河宗药堂执事。围杀之夜携半枚残玉突围，隐姓埋名三百年，把仇埋进了一畦畦药田。',
      look: { robe: '#8a7a5a', hair: '#d8d2c2', item: 'herb', aura: '#a8862a' } },
    c_xuanying: { name: '玄影客', title: '血河影身', color: '#4a3a52', stance: '敌', role: '主要反派',
      desc: '帝渊以自身影魂裁出的无面影卫。掘龙脉、觅钥匙、盯梢历代残玉携带者——他从不亲自动怒，因为他没有心。',
      look: { robe: '#3a3040', hair: '#1e1a24', item: 'shadow', aura: '#7c5cb0' } },
    c_zongzhu:  { name: '血河宗主', title: '帝渊 · 万魂丹炉之主', color: '#7c2a22', stance: '敌', role: '最终反派',
      desc: '三百年前毁宗灭门的执棋人。算尽了天时地利人心，只没算到两世之人同想他死。',
      look: { robe: '#5a1f1a', hair: '#2a1210', item: 'furnace', aura: '#a03a2a' } },
    c_zhenling: { name: '前世真灵', title: '血河首席 · 叛炉者', color: '#8a742e', stance: '友', role: '双世之魂',
      desc: '三百年前打翻万魂丹炉的人。不求你认下血河宗，只求你认下这笔执念——借刀是为了止杀。',
      look: { robe: '#b0a060', hair: '#e8e2d0', item: 'sword', aura: '#c9b660' } },
    c_zhangmen: { name: '白须掌门', title: '太衍宗掌门 · 白鹤真人', color: '#5a6a6a', stance: '友', role: '补过者',
      desc: '当年围杀时师尊被黑玉令牵着走。时日无多，有些账再烂在土里就没人记得了。',
      look: { robe: '#e8e4d8', hair: '#f0ede4', item: 'scroll', aura: '#8fa8a8' } },
    c_xuanji:   { name: '玄玑真人', title: '太衍宗太上长老', color: '#6a5a8a', stance: '灰', role: '当年的刀',
      desc: '当年九位执行人之一。朱笔圈名单的人，丹会设鸿门的人——也是唯一活着知道黑玉令味道不对的人。',
      look: { robe: '#8a7ab0', hair: '#c8c2d8', item: 'seal', aura: '#7c5cb0' } },
    c_shanggu:  { name: '上古残魂', title: '炼魂石封印者', color: '#2a6a7a', stance: '友', role: '授法者',
      desc: '陨落已久的古修残影。拼死封存九枚炼魂石，等一个持玉者——等了三百年。',
      look: { robe: '#4a8a9a', hair: '#a8d8e0', item: 'orb', aura: '#22808a' } },
    c_ling:     { name: '玉灵', title: '残玉内里 · 亡魂低语', color: '#a04a5a', stance: '灰', role: '随身之秘',
      desc: '玉中万千低语的集合意志。它记得每一盏河灯，也记得每一个戴着玉死去的活人。',
      look: { robe: '#a04a5a', hair: '#e8c8cc', item: 'jade', aura: '#c05a6a' } },
    /* ---- v19 江湖角色（有个人线者，与 NPCS.nX 一一对应；人物志肖像共用） ---- */
    c_n1:  { npc: 'n1',  name: '沈青崖', title: '青锋剑痴', color: '#3e6b8a', stance: '友', role: '同门师兄',
      desc: '青云剑宗首席，剑不离身，终身不履红尘。剑是他的言语，也是他的牢。',
      look: { robe: '#5a7a9a', hair: '#3a4a5a', item: 'sword', aura: '#3e6b8a' } },
    c_n2:  { npc: 'n2',  name: '顾轻语', title: '丹谷仙子', color: '#4a7a5a', stance: '友', role: '药脉传人',
      desc: '丹霞谷少谷主，一手回春丹术名动一方。炉火再旺，也焐不热一桩旧案。',
      look: { robe: '#6a9a7a', hair: '#8a6a4a', item: 'herb', aura: '#4a7a5a' } },
    c_n5:  { npc: 'n5',  name: '柳含烟', title: '烟雨楼主', color: '#8a5a7a', stance: '灰', role: '消息贩子',
      desc: '烟雨楼楼主，消息灵通，手眼通天。她的账簿里没有善恶，只有价码。',
      look: { robe: '#9a6a8a', hair: '#4a3a42', item: 'fan', aura: '#8a5a7a' } },
    c_n6:  { npc: 'n6',  name: '陆吾', title: '铁塔汉子', color: '#8a6a3a', stance: '友', role: '江湖兄弟',
      desc: '行脚体修，一身横练功夫，最重义气。他不懂大道理，只懂「朋友」两个字怎么写。',
      look: { robe: '#9a7a4a', hair: '#3a2e22', item: 'none', aura: '#8a6a3a' } },
    c_n9:  { npc: 'n9',  name: '姜暮寒', title: '符门老叟', color: '#5a5a6a', stance: '灰', role: '焚符之悔',
      desc: '隐市符师，笔下符箓千金难求。没人知道他一生烧掉的第一张符，画的是什么。',
      look: { robe: '#7a7a8a', hair: '#d8d2c2', item: 'talisman', aura: '#5a5a6a' } },
    c_n13: { npc: 'n13', name: '云无月', title: '月下魔姝', color: '#6a3a6a', stance: '灰', role: '魔道暗线',
      desc: '行事莫测的魔道修士，亦正亦邪。她比谁都清楚血河余孽的销赃路——因为她走过。',
      look: { robe: '#4a2a4a', hair: '#1e1a24', item: 'shadow', aura: '#7c5cb0' } },
    c_n17: { npc: 'n17', name: '姬冰颜', title: '星阵仙子', color: '#3a5a7a', stance: '友', role: '雷台护阵',
      desc: '周天阁首席，布阵时漫天星辰皆为其子。她的阵图里，藏着一场三百年前的星轨。',
      look: { robe: '#5a7a9a', hair: '#e8eef4', item: 'orb', aura: '#3a5a7a' } },
    c_n22: { npc: 'n22', name: '红绡', title: '血罗刹', color: '#8a2a3a', stance: '灰', role: '双面间谍',
      desc: '行走黑暗中的女修，美艳危险，恩怨分明。她袖中藏着两份名单——一份卖钱，一份赎罪。',
      look: { robe: '#8a2a3a', hair: '#2a1216', item: 'blade', aura: '#a03a4a' } },
    c_n23: { npc: 'n23', name: '老酒鬼', title: '醉道人', color: '#7a5a2a', stance: '灰', role: '渡船人',
      desc: '抱着酒葫芦云游四方的疯道人。他不是不醒，是不敢醒——醒着的人得记得水路。',
      look: { robe: '#8a7a5a', hair: '#c8c2b2', item: 'wine', aura: '#7a5a2a' } },
    c_n24: { npc: 'n24', name: '燕回时', title: '归雁剑侠', color: '#4a6a4a', stance: '友', role: '游侠',
      desc: '路见不平必拔刀的游侠剑客，宁折不弯。年年雁归，他年年不归。',
      look: { robe: '#5a7a5a', hair: '#3a3226', item: 'blade', aura: '#4a6a4a' } },
    c_n3:  { npc: 'n3',  name: '苏白', title: '落魄书生', color: '#6a6a5a', stance: '友', role: '故纸研究者',
      desc: '屡试不第的书生，转而问道，家贫志不短。故纸堆里，藏着别人不要的真相。',
      look: { robe: '#8a8a7a', hair: '#4a4038', item: 'scroll', aura: '#6a6a5a' } },
    c_n11: { npc: 'n11', name: '林晚照', title: '圣手医仙', color: '#5a7a6a', stance: '友', role: '医者仁心',
      desc: '救人无数的游方医修，人脉遍布修行界。她说人心是病，得慢慢治。',
      look: { robe: '#7a9a8a', hair: '#6a5a44', item: 'herb', aura: '#5a7a6a' } },
  },
  /* ---------- v19 NPC 专属台词矩阵（六类语境；greet 按关系档三档递进，未命中回落性情模板） ---------- */
  NPC_LINES: {
    n1:  { greet: ['「何事？」', '「你来得不巧——剑刚开锋。」', '「……坐。茶将就，剑别碰。」'],
      gift: ['「不必。」（还是收下了）', '「这礼太重。下不为例。」', '「……剑穗旧了。多谢。」'],
      spar: ['「接我一招再说。」', '「你比上月快了三分。」'],
      discuss: ['「剑非杀人器。记住这句。」', '「师父死在一场被安排的比剑上——此事，只告诉过你。」', '「剑修的孤独，你若懂——便不算白交你这朋友。」'],
      realm: ['「又进一境。别停在半路。」', '「高处风大，站稳。」'],
      hostile: ['「拔剑。」', '「此仇，剑上见。」'] },
    n2:  { greet: ['「道友来访，有失远迎。」', '「炉上刚好煎着新茶。」', '「你来了——药已煎好，趁热喝。」'],
      gift: ['「这如何使得……多谢道友。」', '「礼我收下，心意我记下了。」', '「这药材成色极好，我先收下了。」'],
      spar: ['「点到为止哦。」', '「你旧伤没好利索，我让着三分。」'],
      discuss: ['「药有药性，人有人心——都急不得。」', '「谷中那本账簿，我已交给了长老会。」', '「丹道一途，救人易，救心难。」'],
      realm: ['「恭喜。记得来配副固本的药。」', '「境界高了，丹毒更凶——慎服丹。」'],
      hostile: ['「……何必呢。」', '「药能医病，医不了贪嗔。」'] },
    n3:  { greet: ['「有朋自远方来。」', '「正翻到你说过的那卷书。」', '「坐，我沏了新墨……不对，新茶。」'],
      gift: ['「却之不恭。」', '「书生无以为报，抄书一卷相赠。」', '「礼尚往来，来日方长。」'],
      spar: ['「笔阵，勉强算兵器么？」', '「败得心服口服。」'],
      discuss: ['「史书写的是胜者——但注脚里藏着真相。」', '「藏经阁残卷的抄本，你何时来取？」', '「读书人的三件事：明理、知耻、不忘本。」'],
      realm: ['「可喜可贺，当浮一大白……以茶代酒。」', '「他日史书里，会有你的名字。」'],
      hostile: ['「君子动口……罢了，动手吧。」', '「士可杀，不可辱。」'] },
    n4:  { greet: ['「说。」', '「又是你。」', '「……坐。别碰我的刀。」'],
      gift: ['「拿回去。」（还是收了）', '「……欠你一次。」', '「放这儿吧。」'],
      spar: ['「三招之内见真章。」', '「你的刀，慢了。」'],
      discuss: ['「刀出鞘就要见血——不然别拔。」', '「我仇家遍地，你别沾边。」', '「仇家越多，刀越快——这是刀客的道理。」'],
      realm: ['「境界是拿来杀人的，不是拿来庆贺的。」', '「……快了。快追上我了。」'],
      hostile: ['「刀下不留活口。」', '「你很勇。可惜。」'] },
    n5:  { greet: ['「稀客稀客，快请坐。」', '「我就知道你今日会来。」', '「老规矩，二楼雅间。」'],
      gift: ['「哟，会做人。」', '「这礼……我记在账上了。」', '「识货！这份礼拿得出手。」'],
      spar: ['「赔我袖子！这可是蜀锦！」', '「算你赢——这一局的茶钱你出。」'],
      discuss: ['「你查黑玉令？巧了，我也在查。」', '「资金链的最后一环，在太衍宗的库房里。」', '「消息这行，七分真三分留——你算那七分。」'],
      realm: ['「大喜事！烟雨楼今日酒水半价。」', '「将来你的传记我来写——包挣钱。」'],
      hostile: ['「你砸我招牌？」', '「江湖再见——最好别再见。」'] },
    n6:  { greet: ['「哈哈哈，来的正好！」', '「兄弟！饿不饿？锅里还有！」', '「啥也别说了，先干一碗！」'],
      gift: ['「哈哈，那我就不客气了！」', '「下回我请你吃烤全羊！」', '「哈哈，兄弟客气！」'],
      spar: ['「来来来，让你三招——好吧不让了！」', '「痛快！再来！」'],
      discuss: ['「俺不懂大道理，就懂『朋友』俩字。」', '「你说往东，俺绝不往西。」', '「练拳先练胆，交人先交心。」'],
      realm: ['「好小子！晚上加个菜！」', '「以后谁敢欺负你，报俺名字！」'],
      hostile: ['「你动俺兄弟？」', '「打完这场，恩断义绝！」'] },
    n7:  { greet: ['「你来了。」', '「一曲未终，恕不远迎。」', '「为我抚一曲？……罢了，我自己来。」'],
      gift: ['「有心了。」', '「此物与琴相配，多谢。」', '「琴弦正缺一段红绦……有心。」'],
      spar: ['「琴音为号，剑光为拍。」', '「你的剑，合我曲中第三拍。」'],
      discuss: ['「《雪衣》那支曲子，弹的是雪葬故人。」', '「曲终意未尽——你听懂了几分？」', '「曲高者和寡，幸有你听。」'],
      realm: ['「琴剑同源，恭喜。」', '「他日雪落时，为你再抚一曲。」'],
      hostile: ['「搅了雅兴。」', '「琴声可以杀人，信么？」'] },
    n8:  { greet: ['「道友可是带了什么好买卖？」', '「早——今日行情看涨。」', '「自己人，柜台后头请。」'],
      gift: ['「好东西，值这个价。」', '「这份人情，抵五百灵石。」', '「这礼，合我掌柜的账。」'],
      spar: ['「打赢了，打八折。」', '「唉，血亏。算了算了。」'],
      discuss: ['「万宝商会的账，能洗白也能洗黑。」', '「你要查的那笔旧账——本钱不小啊。」', '「生意经第一条：和气；第二条：记账。」'],
      realm: ['「大喜！商会奉上一份贺仪。」', '「境界就是本钱——记得来我这投资。」'],
      hostile: ['「砸场子？先赔钱。」', '「商道无情，你也别怪我。」'] },
    n9:  { greet: ['「唔……你身上有件有趣的东西。」', '「别踩我符阵！」', '「来得正好，帮我按住这张纸。」'],
      gift: ['「有意思，有意思。」', '「此物可入符……谢了。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「先声明，我符里掺了痒粉。」', '「咳，手滑。算你赢。」'],
      discuss: ['「三百年前我卖过一张符——买主，是血河的人。」', '「烧掉的每一张符，我都记得。」', '「画符如做人：一笔错，满盘输。」'],
      realm: ['「境界涨了，笔也该换换了。」', '「替我瞧瞧：这道纹，直也不直？」'],
      hostile: ['「来，尝尝痒粉。」', '「老夫的符，可不认旧情。」'] },
    n10: { greet: ['「请坐，茶在壶里。」', '「阵成了一角，你来得巧。」', '「不必多礼——看棋？」'],
      gift: ['「心意领了。」', '「此物可作阵眼，收下了。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「棋盘即战场。」', '「你赢了半子——只半子。」'],
      discuss: ['「困杀大阵的残图，我补出了三笔。」', '「阵理即天理，强求不得。」', '「阵成之日，天地无言——大巧若拙，方是布阵的至境。」'],
      realm: ['「境界如布阵，步步为营。」', '「待你困龙锁天之日，我为你掌灯。」'],
      hostile: ['「入阵者，不问来意。」', '「困你三息，够了。」'] },
    n11: { greet: ['「施主安好。」', '「气色好了些——药按时吃了么？」', '「来得正好，后山又送来伤员。」'],
      gift: ['「功德无量。」', '「此物转赠伤员，替他们谢过。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「医者也讲武德——点到即止。」', '「你的旧伤没好透，我让你双手。」'],
      discuss: ['「人心也是病，得慢慢治。」', '「红尘炼心——你炼到哪一重了？」', '「救人一命，胜修十年——这不是虚言，是一笔实账。」'],
      realm: ['「善哉。境界高者，更当慈悲。」', '「往后跌打损伤，都找我。」'],
      hostile: ['「冤冤相报……唉。」', '「我不还手，但也不让开。」'] },
    n12: { greet: ['「哟，还记得我呢？」', '「嘘——我刚从太衍宗『借』东西回来。」', '「想要什么消息？先说好，不赊账。」'],
      gift: ['「懂规矩！」', '「下次偷……借东西时，想着你。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「抓得到我再说。」', '「哎呀，脚滑。算你赢。」'],
      discuss: ['「玄玑真人的密室，我进去了——三炷香的时间。」', '「他密室里挂着的，是黑玉令的拓片。」', '「天下的锁，锁得住笨贼，锁不住有心人。」'],
      realm: ['「又高一层？那我偷东西得更小心了。」', '「恭喜欢迎——礼我顺手替你拿来了。」'],
      hostile: ['「你坏我好事。」', '「追我？先练十年轻功。」'] },
    n13: { greet: ['「你胆子不小。」', '「月光正好——说吧，什么事。」', '「又是你。看来我们命里有纠缠。」'],
      gift: ['「你这是在讨好我？」', '「收下了。别指望我还礼。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「伤到你，可不包治。」', '「……你进步了。有点意思。」'],
      discuss: ['「血河余孽的销赃路，我带你走一遭。」', '「魔道也讲信誉——至少我讲。」', '「月圆看人最准——你眼底的光，比三年前亮了。」'],
      realm: ['「魔随道长，恭喜。」', '「月圆之夜，我请你喝酒。」'],
      hostile: ['「犯我者，虽远必诛。」', '「给你三息，逃命的机会。」'] },
    n14: { greet: ['「师兄师姐！」', '「你什么时候再教我剑呀？」', '「哥哥又凶我了，你评评理！」'],
      gift: ['「哇！给我的？」', '「我要告诉哥哥去……不对，谢谢你！」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「看招！燕子三抄水！」', '「呜，又输了。再来一次！」'],
      discuss: ['「哥哥其实很关心你，他就是嘴硬。」', '「藏经阁后巷有只猫，我带你去摸！」', '「等我练成万剑诀，第一个演给你看！」'],
      realm: ['「哇——好厉害！回头教教我嘛。」', '「以后我也能这么厉害吗？」'],
      hostile: ['「你、你欺负人！」', '「我哥不会放过你的！」'] },
    n15: { greet: ['「三枚灵石，包你满意。」', '「打探消息？老价钱。」', '「哎哟贵客——今日打折，九十九枚。」'],
      gift: ['「够意思！」', '「这礼……按市价可抵十条消息。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「君子动口不动手……好吧，接招！」', '「认输认输！本钱都输光了。」'],
      discuss: ['「血河的旧闻？三枚灵石。……看你诚心，两枚。」', '「黑风寨的账，坊市人人都有一份。」', '「消息这行有句话：知道得越多，睡得越少。」'],
      realm: ['「大吉大利！今日消息免费。」', '「您这样的人物，将来用得着小弟。」'],
      hostile: ['「断人财路，如杀人父母！」', '「这架，我记账上了！」'] },
    n16: { greet: ['「好！痛快！」', '「来，掰个腕子！」', '「谷里新酿的酒，走一坛？」'],
      gift: ['「够爽快！」', '「回谷给你捎两块好矿石！」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「接俺一拳试试！」', '「好硬！俺服了！」'],
      discuss: ['「矿洞底下那东西，又动了。」', '「磐岩谷的门，永远为你开着。」', '「山就摆在那儿——你怕它，它压你；你扛它，它服你。」'],
      realm: ['「好汉子！这坛酒敬你！」', '「以后矿塌了，找俺！」'],
      hostile: ['「俺最恨阴诡之徒！」', '「拳头底下见真章！」'] },
    n17: { greet: ['「你来了。」', '「星图刚推到一半，稍候。」', '「……坐。别踩到阵基。」'],
      gift: ['「多谢。」', '「此物合星阵之理，收下。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「星辰为子，请。」', '「你快了半拍——下次再来。」'],
      discuss: ['「血河故道的星轨，三百年没动过。」', '「塔顶的手记，只给你一个人看过。」', '「星轨无言，可错一分，人间便是百年。」'],
      realm: ['「星随道转，恭喜。」', '「雷台护阵之约，我记着。」'],
      hostile: ['「星罚将至。」', '「布阵——你走不出三步。」'] },
    n18: { greet: ['「幸会幸会。」', '「正读《剑经》第三卷，请指教。」', '「青萍剑谱抄本，道友可要一观？」'],
      gift: ['「却之不恭。」', '「回赠小作一篇，聊表谢意。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「以剑会友，请。」', '「好剑法——输得心悦诚服。」'],
      discuss: ['「剑理通文理，都讲一个『势』字。」', '「我想把青萍剑法写成话本……你出资么？」', '「起承转合——收势最难，收心更难。」'],
      realm: ['「可喜可贺，改日登门道贺。」', '「他日话本开篇，必写道友。」'],
      hostile: ['「斯文扫地……那就请了。」', '「青萍三叠——得罪了。」'] },
    n19: { greet: ['「哎呀，什么风把您吹来了？」', '「您眼力真好，就剩最后一件了。」', '「老熟人了——内部价，内部价。」'],
      gift: ['「您太客气了！」', '「这礼重的……账我给您抹了。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「和气生财，和气生财！——接招！」', '「服了服了，本钱还您。」'],
      discuss: ['「商会的眼线遍布坊市——您想听谁的？」', '「那批黑货过秤时，我多看了两眼。」', '「买卖做的是长久——今天让三分利，明天他替你守门。」'],
      realm: ['「大喜大喜！小店全场八折！」', '「您高升了，可别忘了我。」'],
      hostile: ['「这是砸我饭碗啊！」', '「和气……和气没了！」'] },
    n20: { greet: ['「俺嘴笨，不会说话……」', '「坐！垫子是俺新编的。」', '「你来了，俺就放心了。」'],
      gift: ['「俺、俺收了啊！」', '「回头俺给你捶背！」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「俺出手重，你挡着点。」', '「俺输了，输得不冤。」'],
      discuss: ['「谷里那件老物件，就认你这个明白人。」', '「俺认死的理，九牛拉不回——你对俺，没使过牛。」', '「俺不识几个字，可俺认死理：理直了，就大胆往前走。」'],
      realm: ['「好样的！俺说给大伙儿听去！」', '「你越来越有长老样了！」'],
      hostile: ['「你、你阴俺？」', '「俺认死理：这种人不教训不行！」'] },
    n21: { greet: ['「你来了，我算到了。」', '「昨夜星轨有变——原来应在你身上。」', '「请。棋枰已备。」'],
      gift: ['「顺天意，收下了。」', '「此物应星象，妙。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「以棋道入剑，请指教。」', '「这一局，我算漏了你。」'],
      discuss: ['「雷台之日，星示大凶——但也示了一条生路。」', '「气数如棋，落子无悔。」', '「棋手落子，终究是人，不是天。」'],
      realm: ['「天数又添一子，恭喜。」', '「你的星，越来越亮了。」'],
      hostile: ['「天数有变——不能留你。」', '「星落之地，即是你的坟。」'] },
    n22: { greet: ['「哟，想死还是想活？」', '「这么晚来——带酒了吗？」', '「省着点命，我还有事找你。」'],
      gift: ['「讨好我？」', '「……收下。算你识趣。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「打坏了脸，你赔？」', '「手底下，有点真章。」'],
      discuss: ['「第二份名单烧了——我自由了。」', '「血河的人认得我的脸，你也快了。」', '「这行当的规矩：留三分余地下注，留七分狠活保命。」'],
      realm: ['「境界越高，命越硬——好事。」', '「改日我请你喝最烈的酒。」'],
      hostile: ['「弄脏我的衣裳了。」', '「你的死相，我替你想好了。」'] },
    n23: { greet: ['「酒！酒呢！」', '「打了个酒嗝——你、你说。」', '「陪我喝一碗，有话跟你说。」'],
      gift: ['「好酒！好酒！」', '「这、这瓶留着过年！」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「醉、醉拳——哈！」', '「你、你赢了……再来！」'],
      discuss: ['「水、水底下那位……三百年了。」', '「别、别信水面上的倒影。」', '「醉、醉里看水最真——水底下，才是真身。」'],
      realm: ['「喝、喝大了？你飞那么高！」', '「好！这碗敬你！」'],
      hostile: ['「酒、酒钱还没给呢！」', '「别、别逼俺醒酒！」'] },
    n24: { greet: ['「路见不平，拔刀相助。」', '「又见面了——可有不平事？」', '「今年雁，比去年早归了七日。」'],
      gift: ['「大恩不言谢。」', '「此物赠侠士，物得其所。」', '「唔，此物上有股灵气——收了。」'],
      spar: ['「请——雁翎刀，三招。」', '「好功夫！雁都为你盘旋了。」'],
      discuss: ['「我故乡的雁，年年还回血河故道。」', '「今年秋天，我带你回去看看。」', '「侠字怎么写？人肩上担着的事——放下容易，担着难。」'],
      realm: ['「侠之大者，恭喜。」', '「改日并肩，再战三百回合！」'],
      hostile: ['「为此不义，拔刀！」', '「今日留你——天理难容，但我留。」'] },
  },

  /** 剧情引擎 who 解析：'@id' → CHARACTERS */
  char(who) {
    if (typeof who === 'string' && who[0] === '@') return this.CHARACTERS[who.slice(1)] || null;
    return null;
  },
  /** 江湖二十四修士的主线定位（人物志 + 剧情调度用） */
  STORY_ROLES: {
    n1:  { arc: '同行者', chapter: '三~九', role: '剑宗首席，第三章入宗后的同门师兄；第八章借剑，决战盟友。' },
    n5:  { arc: '情报线', chapter: '七', role: '烟雨楼楼主，暗访黑玉令时唯一的耳目。' },
    n9:  { arc: '鉴纹人', chapter: '二', role: '隐市符师，唯一认出玄影令牌河纹出处的人。' },
    n13: { arc: '魔道暗线', chapter: '四~七', role: '月下魔姝，知晓血河余孽的销赃路与避祸规矩。' },
    n22: { arc: '双面间谍', chapter: '七~九', role: '血罗刹，血河旧部出身——借刀之局中通往敌营的门。' },
    n23: { arc: '渡船人', chapter: '六~九', role: '醉道人，血河故道唯二的知路者之一，决战引路人。' },
    n2:  { arc: '药脉渊源', chapter: '五', role: '丹谷仙子，陈拾遗方的传人，认得残玉渗透的血渍药性。' },
    n11: { arc: '医者仁心', chapter: '四', role: '游方医仙，红尘炼心一章的见证者。' },
    n10: { arc: '阵法助力', chapter: '六~九', role: '阵道大家，六璃困杀大阵残图的补全者。' },
    n17: { arc: '星阵仙子', chapter: '九', role: '周天阁首席，雷台护阵的布防人。' },
    n12: { arc: '暗线妙手', chapter: '七', role: '盗修散人，玄玑真人密室信物的「借阅者」。' },
    n3:  { arc: '故纸研究者', chapter: '三', role: '落魄书生，藏经阁无名残卷最初的主人。' },
    n21: { arc: '观星示警', chapter: '八', role: '周天阁阁主，从星轨推演出决战之日。' },
    n14: { arc: '同门之谊', chapter: '三~八', role: '沈青崖幼妹，同门线里的暖色。' },
    n6:  { arc: '江湖义气', chapter: '四', role: '行脚体修，红尘路上背你走过最难的一段路。' },
    n24: { arc: '游侠', chapter: '二', role: '归雁剑侠，青峰山剿贼时的并肩者。' },
  },

  /* ======================================================================
   * v19 个人线 PERSONAL（十位主要 NPC · 三幕角色弧光）
   * acts[].need: { tier 关系档, realm 大境界下限 }；key 为 STORIES 脚本键。
   * fx: 三幕全部完成后的永久加成（Stat.compute 聚合）。
   * ====================================================================== */
  PERSONAL: {
    n1:  { arc: '剑冢心猿', title: '沈青崖 · 断剑重鸣', fx: { atkPct: 2 }, doneText: '剑心既通，其锋愈利',
      acts: [
        { key: 'pl_n1_a1', title: '第一幕 · 断剑', need: { tier: 'friend', realm: 2 }, brief: '沈青崖的佩剑「青锋」在一场切磋中崩了口——剑痴的剑，从来不只是一件兵器。',
          reward: { insight: 4 } },
        { key: 'pl_n1_a2', title: '第二幕 · 剑心之问', need: { tier: 'bosom', realm: 4 }, brief: '他把师门的一段旧案说与你听。剑道之问，问的是剑，答的是心。',
          reward: { insight: 6 } },
        { key: 'pl_n1_a3', title: '第三幕 · 万剑归一', need: { tier: 'sworn', realm: 6 }, brief: '上古剑冢深处，断剑与万剑共鸣。他终于明白自己修的不是剑，是「不放」。',
          reward: { insight: 8, items: { m_gupian: 1 } } },
      ] },
    n2:  { arc: '药炉心事', title: '顾轻语 · 遗方归人', fx: { pillPct: 5 }, doneText: '得药脉真传，丹效更长',
      acts: [
        { key: 'pl_n2_a1', title: '第一幕 · 半张药方', need: { tier: 'friend', realm: 2 }, brief: '她认出你随身伤药的配伍来自一位失传的老药师——那正是陈拾的手笔。',
          reward: { insight: 3 } },
        { key: 'pl_n2_a2', title: '第二幕 · 谷中旧例', need: { tier: 'bosom', realm: 4 }, brief: '丹霞谷当年为血河供过丹材的黑料，在她师门账簿的夹层里压了三百年。',
          reward: { insight: 5, fortune: 3 } },
        { key: 'pl_n2_a3', title: '第三幕 · 回春之约', need: { tier: 'sworn', realm: 6 }, brief: '她以陈拾遗方重配「回春续断散」，从此你的丹炉里多了一味人情的火候。',
          reward: { insight: 6, items: { pill_dahuan: 2 } } },
      ] },
    n5:  { arc: '烟雨账簿', title: '柳含烟 · 无价之数', fx: { stoneMult: 0.05 }, doneText: '通晓商事行情，财路自宽',
      acts: [
        { key: 'pl_n5_a1', title: '第一幕 · 一条消息', need: { tier: 'friend', realm: 3 }, brief: '她想查一笔三百年前的老账——查账，得先找到那个记账的人。',
          reward: { insight: 3 } },
        { key: 'pl_n5_a2', title: '第二幕 · 黑玉流向', need: { tier: 'bosom', realm: 5 }, brief: '黑玉令出现前后，有九笔灵石从同一暗账流出。烟雨楼的账簿，拼出了半张网。',
          reward: { insight: 5, stones: 2000 } },
        { key: 'pl_n5_a3', title: '第三幕 · 烟雨收网', need: { tier: 'sworn', realm: 7 }, brief: '她把整条资金链交到你手上——「这条命的价钱，我替你付过了。」',
          reward: { insight: 6, stones: 5000 } },
      ] },
    n6:  { arc: '扛山之义', title: '陆吾 · 一诺扛山', fx: { hpPct: 3 }, doneText: '得一兄弟同心，气血愈壮',
      acts: [
        { key: 'pl_n6_a1', title: '第一幕 · 半路兄弟', need: { tier: 'friend', realm: 2 }, brief: '他在红尘路上替你挡了一刀，咧嘴一笑：「兄弟，客气啥。」',
          reward: { insight: 3 } },
        { key: 'pl_n6_a2', title: '第二幕 · 笨人的道', need: { tier: 'bosom', realm: 4 }, brief: '他问你：不聪明的人，配不配求长生？你第一次认真想这个问题。',
          reward: { insight: 5, fortune: 2 } },
        { key: 'pl_n6_a3', title: '第三幕 · 扛山之人', need: { tier: 'sworn', realm: 6 }, brief: '他背你走出鬼泽绝地，一步一个血脚印。「说好了，要死一起死。」',
          reward: { insight: 6, items: { pill_tiegu: 2 } } },
      ] },
    n9:  { arc: '焚符之悔', title: '姜暮寒 · 焚符老叟', fx: { dodge: 2 }, doneText: '符道感悟精进，身法愈敏',
      acts: [
        { key: 'pl_n9_a1', title: '第一幕 · 烧掉的符', need: { tier: 'friend', realm: 3 }, brief: '他一生画符无数，却年年烧掉一张——那是一张三百年前的封魂符。',
          reward: { insight: 4 } },
        { key: 'pl_n9_a2', title: '第二幕 · 符出谁手', need: { tier: 'bosom', realm: 5 }, brief: '他认出玄影令牌上的河纹，也认出了当年重金买符的买主——血河的人。',
          reward: { insight: 5 } },
        { key: 'pl_n9_a3', title: '第三幕 · 最后一笔', need: { tier: 'sworn', realm: 7 }, brief: '他为你重画一张「止杀符」——这一笔，还的是三百年前那一笔的债。',
          reward: { insight: 6, items: { tal_posha: 2 } } },
      ] },
    n13: { arc: '月下旧盟', title: '云无月 · 销赃暗网', fx: { crit: 2 }, doneText: '通晓魔道门径，出手愈准',
      acts: [
        { key: 'pl_n13_a1', title: '第一幕 · 月下逢', need: { tier: 'friend', realm: 3 }, brief: '她验出你怀中残玉的气息，第一次收起了玩笑神色：「你惹上大麻烦了。」',
          reward: { insight: 4 } },
        { key: 'pl_n13_a2', title: '第二幕 · 暗市带路', need: { tier: 'bosom', realm: 5 }, brief: '她带你走过血河余孽的销赃暗市——货架上有一件你绝想不到的东西。',
          reward: { insight: 5, items: { m_gupian: 1 } } },
        { key: 'pl_n13_a3', title: '第三幕 · 旧盟清算', need: { tier: 'sworn', realm: 7 }, brief: '她与旧日盟约做了断。「我不入正道，但今日与你同路一程。」',
          reward: { insight: 7, fortune: 3 } },
      ] },
    n17: { arc: '星轨之约', title: '姬冰颜 · 观星档案', fx: { defPct: 2 }, doneText: '得星阵护持，防御愈坚',
      acts: [
        { key: 'pl_n17_a1', title: '第一幕 · 星轨异常', need: { tier: 'friend', realm: 4 }, brief: '她发现血河故道的星轨三百年未曾移动——有东西在那里「停」着。',
          reward: { insight: 4 } },
        { key: 'pl_n17_a2', title: '第二幕 · 塔顶档案', need: { tier: 'bosom', realm: 6 }, brief: '观星塔顶层的先辈手记写着：血河覆灭当夜，星轨曾「倒走一瞬」。',
          reward: { insight: 6 } },
        { key: 'pl_n17_a3', title: '第三幕 · 护阵之约', need: { tier: 'sworn', realm: 8 }, brief: '她以周天星图为你的飞升雷台布下护阵——「雷落之时，星与君同在。」',
          reward: { insight: 7, items: { m_gupian: 1 } } },
      ] },
    n22: { arc: '罗刹洗名', title: '红绡 · 两份名单', fx: { dodge: 1, crit: 1 }, doneText: '知己知彼，身形愈难捉摸',
      acts: [
        { key: 'pl_n22_a1', title: '第一幕 · 试探', need: { tier: 'friend', realm: 4 }, brief: '她盯着你袖中的河纹拓片看了很久，忽然笑了：「这东西，害过很多人。」',
          reward: { insight: 4 } },
        { key: 'pl_n22_a2', title: '第二幕 · 第一份名单', need: { tier: 'bosom', realm: 6 }, brief: '她交给你一份血河余孽的暗桩名单——那是她「卖钱」的那一份。',
          reward: { insight: 6, stones: 3000 } },
        { key: 'pl_n22_a3', title: '第三幕 · 赎罪之名', need: { tier: 'sworn', realm: 8 }, brief: '她烧掉第二份名单——那是她自己的。「从今日起，血罗刹欠你一条命。」',
          reward: { insight: 7, fortune: 4 } },
      ] },
    n23: { arc: '渡船归人', title: '老酒鬼 · 三百年水路', fx: { hpPct: 2, defPct: 2 }, doneText: '得渡船人相授，根基愈稳',
      acts: [
        { key: 'pl_n23_a1', title: '第一幕 · 酒里有人', need: { tier: 'friend', realm: 4 }, brief: '他醉后吐真言：「血河故道的水，喝一口，能听见三百个声音喊渡。」',
          reward: { insight: 4 } },
        { key: 'pl_n23_a2', title: '第二幕 · 疯话与真话', need: { tier: 'bosom', realm: 6 }, brief: '他画出故道水路的草图——疯癫是壳，壳里是一个守了三百年渡口的罪人。',
          reward: { insight: 6, fortune: 3 } },
        { key: 'pl_n23_a3', title: '第三幕 · 渡人渡己', need: { tier: 'sworn', realm: 8 }, brief: '他答应决战之日为你掌船。「这一趟渡你，也是渡我自己。」',
          reward: { insight: 7, items: { pill_pojing: 1 } } },
      ] },
    n24: { arc: '归雁不归', title: '燕回时 · 故乡之雁', fx: { atkPct: 1, dodge: 1 }, doneText: '侠气淬剑，攻守相济',
      acts: [
        { key: 'pl_n24_a1', title: '第一幕 · 路见不平', need: { tier: 'friend', realm: 2 }, brief: '你们并肩救下一队被劫的药商。他拔刀的样子，像一只不肯落地的雁。',
          reward: { insight: 3 } },
        { key: 'pl_n24_a2', title: '第二幕 · 归乡之忌', need: { tier: 'bosom', realm: 4 }, brief: '他的故乡在血河故道旁——全村人死在那一夜，他是唯一的活口。',
          reward: { insight: 5, fortune: 2 } },
        { key: 'pl_n24_a3', title: '第三幕 · 雁回之时', need: { tier: 'sworn', realm: 6 }, brief: '他决定与你同赴血河故道。「年年雁归，今年——我也该回去了。」',
          reward: { insight: 6, items: { m_gupian: 1 } } },
      ] },
  },

  /* ======================================================================
   * v15 剧情脚本库 STORIES（问道九章 · 每章三段：开篇卷轴 / 中段插章 / 章末演出）
   * 场景格式见 Story 引擎注释。pick(value) 返回结算旁白行数组。
   * ====================================================================== */
  STORIES: {
  /* ============ 第一章 · 尘缘 ============ */
c1_open: { id: 'c1_open', title: '第一章 · 尘缘', scenes: [
  { t: 'narr', text: '你上山采药归来，远远便望见村口纸钱飞扬。\n采药老人的茅屋前围满了人——那位总在你摔破膝盖时替你敷药、把最后半块干粮塞进你手里的老人，殁了。' },
  { t: 'dialog', who: '@c_laoren', title: '临终 · 三日前', text: '孩子……坐近些，让老朽再看看你。\n老朽本不姓陈，也不该死在这山村裏……这残玉，你收好。血河宗的信物……当年满门三百七十一口，只逃出老朽一人……' },
  { t: 'dialog', who: '@c_laoren', title: '灵前 · 忆旧', text: '「七叶一枝花，要等露水收了再采——性急的人，配不上这行饭。」「摔了？自己揉的药才记得牢，揉完把碗洗了。」\n灵前灯火摇了摇。那些当时只道寻常的话，如今一句一句，都烫在耳朵里。' },
  { t: 'dialog', who: '@c_laoren', title: '气若游丝', text: '替我……查清当年的灭门血案……查清了，老朽做鬼……也谢你……\n记住，莫信正道衣冠，莫信魔道獠牙……人心，最是靠不住……' },
  { t: 'narr', text: '言未尽，人已逝。\n你葬了老人，坟头朝东——那是他从未说过的故乡的方向。半枚温润的古玉贴身收好，触手生温，仿佛还带着老人的体温。' },
  { t: 'dialog', who: '@c_ling', title: '灵前 · 玉语初闻', text: '……灯……还亮着……三百七十一盏……\n……你，听得见么……' },
  { t: 'montage', text: '你留下来守灵。白日里吊唁的乡邻换了一拨又一拨，夜里陪你的，只有长明灯、纸灰，和怀里忽凉忽温的古玉。\n七日灵满，落葬那日你把药锄挂上门楣，又花了几日打点行囊——山外的路，该走了。', days: 12 },
  { t: 'narr', text: '自此，修行之路多了一个执念。\n血河宗——三百年前被正道围灭的魔宗——这四个字，成了你道途的第一粒种子。' },
] },

c1_mid: { id: 'c1_mid', title: '第一章 · 残玉初热', scenes: [
  { t: 'narr', text: '根基初固的这夜，你照例吐纳入定。\n忽觉怀中一烫——残玉竟自行发热，温热顺着心口蔓延四肢百骸。' },
  { t: 'narr', text: '恍惚间你坠入一片血色的河。河面上浮着三百七十一盏河灯，每一盏，都是一条性命。\n河底有低语声，千万重，听不清，却又句句扎心。' },
  { t: 'narr', text: '你壮着胆子俯下身去，离得最近的那盏河灯里，蜷着一团模糊的影子，正朝你伸手。\n你伸手去接——指尖穿过灯焰，满河灯火忽地齐齐转向你，像三百七十一双眼睛。' },
  { t: 'dialog', who: '@c_ling', title: '血色深处', text: '……又一个，戴着它的活人……\n三百年了……玉在，宗门就在……你，会是那个报仇的人吗……' },
  { t: 'narr', text: '你猛然惊醒，冷汗透衣。\n窗外月色如霜，残玉安安静静躺在掌心，凉得像一块普通的石头——方才的一切，是梦，还是玉中亡魂的低语？' },
] },

c1_mid2: { id: 'c1_mid2', title: '第一章 · 夜巡者', scenes: [
  { t: 'narr', text: '行囊早已打点，只等一个出门的日子。这夜三更，你被一阵极轻的脚步声惊醒。\n窗外无人。院墙外官道上，一道黑影正踏月而过——袍角不动，落步无声，仿佛月光都绕着他走。' },
  { t: 'narr', text: '你吹熄油灯，猫着腰躲进院角的柴垛，从缝隙里屏息外望。\n那黑影在村口老槐下停住，隔空朝着老人灵堂的方向微微偏头，像在听什么，又像在闻什么。' },
  { t: 'dialog', who: '@c_xuanying', title: '柴垛外 · 月下独白', text: '青溪村，青溪村……玉换了七个主人，还是躲不开这样的穷乡僻壤。\n气息很弱，根骨也平平——急什么。让它自己长大，长得越壮，收割时越甜。' },
  { t: 'narr', text: '黑影抬步，一步跨出已在十丈之外，再一步，整个人融进月色里。\n你从柴垛后滑坐下来，后背湿透——从今夜起，这片天地里多了一双暗处的眼睛。而你不知道，它何时会眨。' },
] },

c1_end: { id: 'c1_end', title: '第一章 · 终 · 入世', scenes: [
  { t: 'narr', text: '村后山的野兽被你清剿一空，寻常山匪闻风远遁。\n你在老人坟前坐了一夜，把一年的历练从头到尾想了一遍。' },
  { t: 'narr', text: '后半夜，风里忽然多了一股腥气。\n坟头的供米引来了野物——灌木丛哗啦一响，一头獠牙初长的野猪红着眼，直直朝坟茔撞来。' },
  { t: 'battle', foe: { m: 'm_yezhu' }, label: '坟前野猪', text: '畜生也敢冲撞亡者安眠。\n你横刀而起，把它的冲撞引向坟茔之外的荒地。', win: ['獠牙擦着坟前石碑钉进泥土，你反手一刀了结了它。\n你以刀尖挑土掩了血迹，重新跪坐回坟前——守坟这一夜，不容血光冲撞。'], lose: ['你被獠牙掀翻在坟前，肋下见了血，野猪拱翻供品，扬长而去。\n你挣扎着爬起来，把踢翻的供米一碗碗摆正，又坐回坟前。天，快亮了。'] },
  { t: 'narr', text: '东方泛起蟹壳青，山雀在坟头的树上跳。\n你拭净刀，把冷酒洒了一圈，重新跪坐端正——有话，要对老人说。' },
  { t: 'dialog', who: '你', title: '坟前自语', text: '老人家，你的仇家在庙堂之高，在名门正派，也可能在魔窟深渊。\n我如今的修为，出了这山村，怕是连给他提鞋都不配。' },
  { t: 'choice', text: '天将亮时，你朝坟茔磕了三个头。起身时，你想带着什么入世？', options: [
    { text: '带着他的遗志——此仇必报，虽九死其犹未悔', value: 'vengeance', flag: 'k1_promise' },
    { text: '带着他的告诫——莫信人心，凡事只信自己亲眼所见', value: 'caution', flag: 'k1_promise' },
    { text: '带着他的牵挂——查清真相，但不让仇恨吞掉自己', value: 'clarity', flag: 'k1_promise' },
  ], pick: (v) => {
    const p = Game.player;
    if (v === 'vengeance') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['你在坟前立誓：血债血偿。\n一股戾气沉入丹田，化作道途第一缕凶悍的真意。（突破感悟 +6）']; }
    if (v === 'caution') { p.attrs.luck = Math.min(10, p.attrs.luck + 1); return ['你记住了老人的告诫：人心最靠不住。\n从此你的眼睛多了几分审慎——这种审慎，就是福缘。（福缘 +1）']; }
    KarmaSys.addFortune(3); return ['你不想让仇恨吃掉自己——查清真相，然后好好活着。\n这份澄明，让天地都轻快了几分。（气运 +3）'];
  } },
] },

/* ============ 第二章 · 青峰疑云 ============ */
c2_open: { id: 'c2_open', title: '第二章 · 青峰疑云', scenes: [
  { t: 'narr', text: '残玉入夜生温，热度竟随方位变化。\n你循着感应来到青峰山——山坳深处，火把如龙：黑风寨的人马竟在夜里挖掘一座上古遗迹，为首之人一袭黑袍立在崖边，从不亲手碰土，只负手看月。' },
  { t: 'dialog', who: '@c_n24', title: '草窠里 · 悄声', text: '「别动。」身侧草窠里忽然压着嗓子开口，「梆子已响，三个哨探正朝这边来——阁下分一个，我分两个。\n在下燕回时，路见不平的『路』，今日恰好路过此地。」' },
  { t: 'battle', foe: { m: 'm_loulou' }, label: '黑风寨前哨', text: '刀剑同时出鞘，前哨的火把一支支熄灭。\n喊杀声在夜山里荡开，惊起满林宿鸟。', win: ['最后一名喽啰瘫倒在火堆边，燕回时收剑入鞘，掸了掸袖口的灰。\n前哨已清，崖上那群人还蒙在鼓里——你们借着岩影，摸到了离黑袍人三十步的乱石之后。'], lose: ['你挨了一记泼风刀，肩头见血，燕回时一把将你拽进岩缝，两人伏到喽啰散尽。\n前哨虽被惊动，崖上黑袍人却纹丝未动——掘土的还在掘土，看月的还在看月。'] },
  { t: 'narr', text: '你潜伏在岩后，借着月光看清了一件事——\n那黑袍人抬手拂开额发时，手腕内侧，赫然刺着一行赤色纹路：蜿蜒如河，正是残玉上河纹的同源。' },
  { t: 'dialog', who: '@c_n24', title: '耳语 · 皱眉', text: '那纹路，我在北地荒原见过一回——刻在一座塌了半边的古碑上，碑下埋着什么，没人敢挖。\n江湖人都管它叫「河纹」，见者不祥。你脸色不太好——认得这东西？' },
  { t: 'dialog', who: '？？？', title: '黑袍人 · 崖上低语', text: '差一件……还差一件钥匙……\n急什么。三百年都等了……血河不灭，此玉不宁——它自己会送上门来。' },
  { t: 'narr', text: '你屏息记下一切，悄然而退。\n回到村中，你彻夜难眠：血河宗三百年前不是被灭门了么？这些人在挖什么？「钥匙」又是什么？' },
] },

c2_mid: { id: 'c2_mid', title: '第二章 · 河纹令牌', scenes: [
  { t: 'narr', text: '燕回时押着几名活口，抄小路追寨主的退路去了，临行抱拳：「河纹之事，你我心里有数——后会有期。」\n山寨折了前哨，余众缩回主寨，你回头打扫战场。' },
  { t: 'narr', text: '连番厮杀，黑风寨的喽啰在你刀下节节败退。\n清理战场时，一具尸体滑出个物件，当啷落地。' },
  { t: 'narr', text: '是一面黑铁令牌，正面刻着「玄影」二字，背面一行小字：\n「掘龙脉者赏，窥河纹者死。」' },
  { t: 'dialog', who: '你', title: '摩挲令牌', text: '玄影……\n黑风寨不过是群劫道的泼皮，怎么会有制式令牌？这位「玄影」——是那黑袍人的名号，还是他背后的势力？' },
  { t: 'narr', text: '你把令牌收进储物袋。\n线索断了一头，又续上一头——黑风寨的背后，远不止一座山寨那么简单。' },
] },

c2_mid2: { id: 'c2_mid2', title: '第二章 · 符师之眼', scenes: [
  { t: 'narr', text: '山下的隐市藏在雨巷尽头，卖的都是见不得光的杂货。\n巷底一个符摊，摊主是位闭目的老叟，摊前无幌无价，只压着一张字条：「问符先焚香，问事先掏钱。」' },
  { t: 'narr', text: '你以三块灵石起卦，顺势把那面黑铁令牌搁上摊案。\n老叟眼皮未抬，两指拈起令牌，指腹在「玄影」二字上拂过——指尖过处，铁面竟洇出一缕极淡的暗红。' },
  { t: 'dialog', who: '@c_n9', title: '符摊前 · 掷令还你', text: '河纹。三百年前就该绝迹的东西。\n这不是刺上去的印记，是封纹——「引魂玉」的封纹。老夫年轻时拓过一枚，拓完那夜，拓纸自己烧成了灰。' },
  { t: 'dialog', who: '@c_n9', title: '收摊 · 赶人', text: '玉会认人，也会害人。它认你，未必是幸；它害你，一定挑你不备之时。\n拿着你的令牌走吧——今日之言，出了这条巷子，老夫概不认账。' },
] },

c2_end: { id: 'c2_end', title: '第二章 · 终 · 血绘残图', scenes: [
  { t: 'narr', text: '练气圆满的那一夜，残玉忽然轻鸣，声如蚊蚋，却直往你的识海里钻。\n你循着感应摸回青峰山，在黑风寨挖掘的遗迹深处，发现了一条被塌方掩住大半的暗缝。' },
  { t: 'narr', text: '缝隙尽头的石壁上，用暗红色的颜料绘着半张地图——颜料早已干涸发黑，但那色泽，你认得。\n和残玉内里渗出的一模一样。是血。三百年前的血。' },
  { t: 'narr', text: '血图之外，石壁上还有别的。\n你举起火折子逐寸照过去——断折的探针、未燃尽的符灰、一处被新土半掩的凹痕，全在血图边缘三尺之内。' },
  { t: 'investigate', text: '三处痕迹，哪一处才是前人留下的关键？', flag: 'k2_relic_seen', win: ['火折子凑近那半枚掌印——五指没入石缝，指痕全部朝内，探向封印深处。\n掘龙脉的人要找的从来不是龙脉，是封印物。而封缝之内，多半还空着一半。'], lose: ['痕迹在此，答案未必在此。\n但你把每一处细节都记进了心里，又将浮土拂回原样——今日看走眼的东西，来日还会再遇见。'], options: [
    { text: '断折的探针——针头新断，断口还泛着灵光', value: 'probe', ok: false },
    { text: '未燃尽的符灰——灰烬里掺着朱砂与骨粉', value: 'ash', ok: false },
    { text: '半枚掌印——有人的手探进过封缝', value: 'print', ok: true },
  ] },
  { t: 'choice', text: '石壁坚硬，整图无法取下。你如何处置这半张血图？', options: [
    { text: '以灵墨拓印之法复制下来，原壁不动', value: 'copy', flag: 'k2_map_method' },
    { text: '凿下整块石壁带走——宁可得罪全山寨', value: 'take', flag: 'k2_map_method' },
    { text: '牢记于心，再以巨石掩回原样，不惊动任何人', value: 'memorize', flag: 'k2_map_method' },
  ], pick: (v) => {
    const p = Game.player;
    if (v === 'copy') { p.insight = Math.min(100, (p.insight || 0) + 5); Bag.addItem('m_gupian', 1); return ['你以灵墨拓下血图，指尖抚过河纹时，残玉微微一颤，似在应和。（突破感悟 +5，上古法宝碎片 ×1）']; }
    if (v === 'take') { Bag.addStones(Math.round(120 * GameData.stoneEco(p.realmIdx))); Bag.addItem('m_gupian', 1); return ['你凿下石壁，以破布裹好背走。乱世之中，实物在手，胜过千般记忆。（灵石若干，上古法宝碎片 ×1）']; }
    KarmaSys.addFortune(4); return ['你把整幅图刻进记忆，又搬来巨石掩住石壁——让它继续沉睡。\n多一分谨慎，多一分气运。（气运 +4）'];
  } },
  { t: 'narr', text: '半张血图与半枚残玉，都在你手上了。\n下一章，该去拜入一个宗门了——想查三百年前的灭门案，散修的眼睛，看不见庙堂的角落。' },
] },

/* ============ 第三章 · 筑基风云 ============ */
c3_open: { id: 'c3_open', title: '第三章 · 筑基风云', scenes: [
  { t: 'narr', text: '筑基那夜，灵气如百川灌顶。\n你于气海之中铸就道基的刹那，怀中残玉骤然裂开一道细纹，露出内里一行小字——' },
  { t: 'dialog', who: '@c_ling', title: '古字显形', text: '「血河不灭，此玉不宁。」' },
  { t: 'narr', text: '血河宗三个字像一根倒刺，你把它带进了坊市。\n酒肆里说书人正讲前朝轶事，讲到「三百年前」便语焉不详，满堂哄笑里，只有墙角一个青衫落拓的书生，把酒碗轻轻搁下了。' },
  { t: 'dialog', who: '@c_n3', title: '邻桌 · 冷笑', text: '客官也在打听血河宗？说书人不敢讲的，我讲。\n血河宗，以魔入道，炼万魂丹，以生魂饲之——三百年前，九宗联手，围灭于血河故道。九宗都说灭得好、灭得干净。可我翻遍故纸，只寻到一句当年批语：围杀之夜，火光烛天，三百里外可见。' },
  { t: 'dialog', who: '@c_n3', title: '压低声音', text: '更有意思的在后头。当年主持围杀的九人，名字全教朱笔圈了去——其中一位，如今还端坐在某宗祖师堂里，人称太上长老，德高望重。\n这一页抄本你拿去，抵方才那壶酒。字是我抄的，档是死人档——信几成，你自己掂量。' },
  { t: 'narr', text: '欲查血案，须入宗门。你收拾行囊，望向修仙界最大的三座山门——\n无论拜入哪一座，从此你便不再是山野散修。' },
] },

c3_mid: { id: 'c3_mid', title: '第三章 · 藏经阁夜话', scenes: [
  { t: 'narr', text: '修习功法之余，你常泡在藏经阁。\n这一夜你在故纸堆最底层翻到一册无名残卷，纸页焦脆，像是被人刻意塞进了不会有人翻看的地方。' },
  { t: 'narr', text: '残卷记的是三百年前血河宗围灭战的缴获名录：\n「焚功法一十七部、丹炉九座、万魂丹炉……炉下不见尸骨，唯余锁魂链九十九条——炼丹之魂，尽随炉主遁走。」' },
  { t: 'narr', text: '残卷末页有一行小字批注，墨色比正文新：「九个名字，九个圈——抄书人手抖，墨透了纸背。」\n那笔锋清瘦拘谨，与酒肆书生塞你的抄页出自同一只手——这册残卷，怕就是打他手里流进藏经阁的。' },
  { t: 'dialog', who: '你', title: '指尖发凉', text: '不见尸骨……随炉主遁走……\n也就是说，当年血河宗主没有死？不——更可怕的是：九宗是知道的。他们瞒了三百年。' },
  { t: 'narr', text: '你把残卷原样放回，指尖冰凉。\n这潭水，比你想的深得多。' },
] },

c3_end: { id: 'c3_end', title: '第三章 · 终 · 玄影夜访', scenes: [
  { t: 'narr', text: '你在宗门站定了脚跟。这一夜你刚行功完毕，窗纸上忽然多了一道人影——\n人影负手而立，声音像是从很远的地方传来，又像贴着你的耳根。' },
  { t: 'dialog', who: '@c_xuanying', title: '窗外 · 隔空传音', text: '别找了。你翻遍藏经阁也找不到真相——真相在血河故道的水底。\n小家伙，玉在你身上，是它的运气，也是你的丧钟。' },
  { t: 'dialog', who: '@c_xuanying', title: '冷笑', text: '把残玉送到青峰山北崖，我留你全尸。\n否则——下一次见面，就是在你宗门上下的葬礼上。' },
  { t: 'battle', foe: { name: '黑袍探子', power: 8, species: 'human' }, label: '宗门夜巡', text: '话音散时，檐外巡夜的梆子忽然乱了半拍。\n你自窗缝瞥见，巡夜灯影里混着一道黑袍身影，贴着墙根往山门方向遁去——有人从头到尾，听完了这场对话。', win: ['你抢先半步堵在山门侧门，一刀磕飞他袖中的传讯符，三合之内把人按在地上。\n你搜走符纸，把人捆给了执事房——今夜的话，一个字也没能传出去。'], lose: ['黑袍人身法滑不留手，拼着挨了你一掌，还是裹进夜色遁了。\n他没拿到玉，但他记下了你的脸——来日，必有一场麻烦。'], flagWin: 'k3_purged_watch' },
  { t: 'choice', text: '窗外人影一晃即逝。你握紧残玉，如何回应这份威胁？', options: [
    { text: '「想要玉？自己来拿。」——把威胁原样顶回去', value: 'defy', flag: 'k3_defy_response' },
    { text: '虚与委蛇，假意应下，暗中东窗事发前先布后手', value: 'feign', flag: 'k3_defy_response' },
    { text: '沉默不语，只把今夜每一个字记进心里', value: 'silent', flag: 'k3_defy_response' },
  ], pick: (v) => {
    const p = Game.player;
    if (v === 'defy') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['你对窗外冷冷吐出八个字：「想要玉，自己来拿。」\n那瞬息的死寂之后，一声极轻的笑散在夜里。道心愈厉。（突破感悟 +6）']; }
    if (v === 'feign') { KarmaSys.addFortune(3); Bag.addStones(Math.round(80 * GameData.stoneEco(p.realmIdx))); return ['你隔窗应了一声「容我想想」——先稳住他，再谋后手。\n与虎谋皮者，须比虎更有耐心。（气运 +3，灵石若干）']; }
    p.insight = Math.min(100, (p.insight || 0) + 3); return ['你一言不发，只把今夜的每一个字刻进识海。\n沉默不是怯懦，是把刀藏进鞘里。（突破感悟 +3）'];
  } },
  { t: 'narr', text: '玄影客。掘龙脉。血河故道。\n线索一环扣一环——而你知道，真正的博弈，才刚刚开场。' },
] },

/* ============ 第四章 · 红尘炼心 ============ */
c4_open: { id: 'c4_open', title: '第四章 · 红尘炼心', scenes: [
  { t: 'narr', text: '宗门长老见你勤勉，私下透露了一桩秘辛：\n当年围杀血河宗的密令，出自一封无落款的黑玉令。九宗各执一词，而黑玉令的主人，至今仍在暗处。' },
  { t: 'dialog', who: '白发长老', title: '密室 · 压低声音', text: '此事牵扯太广。你如今人微言轻，查案是找死。\n听老朽一句劝——先炼心，后问案。心不坚者，知道了真相也撑不住真相。' },
  { t: 'narr', text: '于是你走入红尘。\n红尘劫、江湖义、陌路的善与恶——三百年前的血案是一面镜子，照见的却是今人的心。' },
  { t: 'battle', foe: { m: 'm_zeiren' }, label: '红尘路匪', text: '官道暮色，林子深处转出一名蒙面贼人，横刀索要买路财。\n刀光一起，你忽然想起长老的话——先炼心，后问案。\n那就拿这场架，练一练这颗心。', win: ['三合，贼人的刀飞出丈外，人跪在地上抖成一团。\n你刀尖抵着他咽喉，半晌，终究收了刀：「滚。再劫道，下次落下的就不是刀背了。」\n杀心起时收得住——这一课，值。'], lose: ['你着了一记闷棍栽进路沟，贼人抢了行囊扬长而去。\n爬起身时，一队运药的行商把你拽上牛车，分了你半囊伤药。\n善恶擦肩而过——炼心不在胜负，在你记住什么。'] },
  { t: 'dialog', who: '@c_n11', title: '路边 · 施针接骨', text: '前头围了一圈人：脚夫被惊马踩断了腿，血染黄尘。围观的人里不乏佩剑的仙师，掐着诀算时辰，没一个肯落针。\n人群外走来个背药箱的青衫女子，蹲下便接骨正位，手上稳得没有一丝颤。有人认出她，惊呼「丹霞谷圣手医仙」，她头也不抬：「骨头断了，接上就是。仙字留给牌坊听。」\n临行你问她，救人为何不留名。她掸了掸袖口的血：「善不为名——为名的善，是买卖，不是医。」' },
  { t: 'dialog', who: '@c_n6', title: '官道 · 同行一程', text: '出镇的官道上，陆吾与你同行一程，肩上扛着半扇猪肉——镇东王婆赊他的，他给她挑了三天水。\n「兄弟，俺问你个事。」他忽然道，「俺分不清啥大善大恶，俺就认一条：谁把最后一口饭分给你，谁就是好人。这理，笨不笨？」\n不等你答，他自己先咧嘴笑了：「笨就笨吧。笨理，摔不碎。」\n你忽然觉得，万卷道藏，抵不住他这一句。' },
  { t: 'dialog', who: '你', title: '自省', text: '善恶从来不在门派，而在人心。\n当年九宗围杀血河，杀的是万魂丹的罪，还是灭口的怯？这个问题，我必须先给自己一个答案。' },
] },

c4_mid: { id: 'c4_mid', title: '第四章 · 临终之言', scenes: [
  { t: 'narr', text: '百战之中，你截住了一名劫道的散修。\n刀锋落下之前，他却笑了——笑得你心头发毛。' },
  { t: 'dialog', who: '垂死散修', title: '血泊中的笑', text: '杀吧，杀吧……你们这些名门走狗……\n你以为当年九宗就干净吗？万魂丹的炉子……呵呵……一半材料，是从他们自己人手里买的……' },
  { t: 'narr', text: '他咽了气，笑容还挂在脸上。\n你握刀的手，第一次微微发抖——如果他说的是真的，那你查的就不再是一桩血案，而是一张铺了三百年的网。' },
  { t: 'investigate', text: '尸身渐冷。你本想替他收殓，翻检遗物时，指尖在衣襟内衬触到一个硬结。\n动，还是不动？', flag: 'k4_ledger', win: ['内衬里缝着半页丹材账目——买主画押是个河纹。\n赤芍、鬼臼、锁魂藤，数目大得吓人；落款年份，正是围杀前三年。这一页，多半是他从哪座「名门」库房里偷出来的保命符。\n名门卖料，魔道炼丹——这张网，果然铺了三百年。'], lose: ['你把他葬在向阳的坡上，立了块无字碑，烧了纸，敬了酒。\n仁厚是仁厚——可有些真相，随尸身一同入了土。'], options: [
    { text: '解开内衬细看——死者已矣，真相要紧', value: 'search', ok: true },
    { text: '不动遗物——葬了他，立一块无字碑', value: 'bury', ok: false },
    { text: '只取腰间钱袋充作葬资，余物随棺焚尽', value: 'burn', ok: false },
  ] },
  { t: 'narr', text: '当夜你取出残玉，就着灯火比照账上那枚河纹画押。\n玉中血纹与画押暗红同源，隔着三百年，遥遥一烫。\n散修的笑、黑玉令、半页账——三条线，在你掌心慢慢拧成了一股。' },
] },

c4_end: { id: 'c4_end', title: '第四章 · 终 · 道心之答', scenes: [
  { t: 'montage', text: '你背刀下山，把行囊混进贩夫走卒的队伍里。\n十五日红尘：你替寡妇修过漏雨的屋顶，也把当街抢馒头的泼皮按进过泥里；在赌坊门口输过最后半吊钱，也在义庄陪着守了一夜尸。\n刀背磨亮了，鞋底磨穿了——心，反倒一天天静下来。', days: 15 },
  { t: 'narr', text: '红尘一遭归来，你见过跪地求饶的劫匪，也见过袖手旁观的仙师。\n这一夜你独坐崖头，把心底那个问题翻出来，逼自己作答。' },
  { t: 'narr', text: '崖下灯火万里，崖上孤月一轮。\n垂死散修那张笑脸总在你眼前晃，半页账目压在枕下，那枚河纹像一条蜷起的水蛇。\n你终于承认：这道题，绕不过去，也不必再绕。' },
  { t: 'choice', text: '若他日真凶就在眼前——刀，该不该落下？', options: [
    { text: '该。以杀止杀，是乱世里最诚实的公道', value: 'blade', flag: 'k4_dilemma_answer' },
    { text: '以直报怨——罪证公之于众，让天下人审他', value: 'justice', flag: 'k4_dilemma_answer' },
    { text: '先问清因由。冤有头债有主，不杀无辜之人', value: 'mercy', flag: 'k4_dilemma_answer' },
  ], pick: (v) => {
    const p = Game.player;
    if (v === 'blade') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['你选了最锋利的那条路。\n刀意自道心出，从此你的每一剑都带着答案。（突破感悟 +6）']; }
    if (v === 'justice') { KarmaSys.addFortune(5); return ['你要的不是他的命，是他的罪孽暴露在天日之下。\n这份坦荡，天必佑之。（气运 +5）']; }
    p.insight = Math.min(100, (p.insight || 0) + 3); KarmaSys.addFortune(2); return ['刀起刀落之前，先给他一个把话说完的机会。\n谨慎即是慈悲，亦是自保。（突破感悟 +3，气运 +2）'];
  } },
  { t: 'narr', text: '道心之问已有了答案。你摸了摸怀中残玉——\n血河宗之事，你想查明白了。为了老人，也为了自己。' },
] },

/* ============ 第五章 · 金丹之秘 ============ */
c5_open: { id: 'c5_open', title: '第五章 · 金丹之秘', scenes: [
  { t: 'narr', text: '金丹天劫的雷光中，残玉骤然炸响！\n一段不属于自己的记忆，如决堤洪水涌入识海——' },
  { t: 'dialog', who: '@c_zhenling', title: '记忆 · 赐名', text: '（记忆的最深处，画面泛黄如旧纸）\n那年我十岁，是饥荒里快饿死的流童，倒在血河山门外。一袭黑袍的男人把我从死人堆里拎出来，掌心竟带着炉火的余温。\n「别怕。入我血河，便是我亲生骨肉。」他亲手替我束发赐名，那日血河万丈，为之让路。\n——三百年后我才明白：他说「骨肉」二字时，看我的眼神，和看一株上品丹材的眼神，并无分别。' },
  { t: 'dialog', who: '@c_zhenling', title: '记忆 · 三百年前', text: '（一袭黑袍，腕刺河纹，站在万魂丹炉前）\n炉中是九千九百九十九条生魂……宗主说，丹成之日，血河万世不灭。可这丹炉里，有刚满月的婴啼。' },
  { t: 'dialog', who: '@c_zhenling', title: '诛仙台上', text: '我不忍了。这一炉，我不炼了。\n——宗主，你打碎我的金身可以，但血河宗的账，我做鬼也要记着。' },
  { t: 'narr', text: '（记忆里，金身碎裂之声如冰河夜裂）\n诛仙台下，三万弟子俯首，无人敢抬头看一眼那道跪着碎了金身的身影。\n那一年血河两岸的桃花开得极艳——如今你才明白，那不是花，是丹炉里飘出来的灰。' },
  { t: 'figure', chr: '@c_zongzhu', art: '万魂丹炉映着他的侧脸——三百年前，那双眼睛看你的方式，与师父无异。' },
  { t: 'dialog', who: '@c_zongzhu', title: '记忆尽头 · 冰冷', text: '叛徒。\n我把你当亲生骨肉，你却把刀递给外人。……好，很好。你的真灵，我收进残玉里——让你亲眼看着，我炼成这万年血河。' },
  { t: 'narr', text: '记忆归位，浑身冰冷。\n你——是血河宗首席的转世。那个背叛宗门、被封真灵于残玉、又转世重修的人。\n你对宗主的恨意有了温度：那是前世未尽的执念。' },
] },

c5_mid: { id: 'c5_mid', title: '第五章 · 万魂幻象', scenes: [
  { t: 'narr', text: '丹道初窥，你第一次以自炼之丹入定行气。\n药力行至心脉，残玉轰然共鸣——一段幻象强行拉你入内。' },
  { t: 'narr', text: '幻象里，万魂丹炉熊熊燃烧。炉壁上锁魂链根根绷紧，链条尽头……拴着的都是熟悉的轮廓：采药老人、村口的孩童、甚至昨日在坊市与你擦肩的货郎。\n三百年了，这些魂魄还没有散。' },
  { t: 'dialog', who: '@c_ling', title: '幻象 · 玉语', text: '幻象深处，忽然响起玉灵的呜咽，细若游丝：\n「……链子……每一环……都拴着一盏灯……三百七十一盏之外……还有这么多……」\n原来残玉认得锁魂链上的每一缕魂。原来他们三百年夜夜都在呼救——只是从前，无人听见。' },
  { t: 'dialog', who: '@c_zhenling', title: '幻象中', text: '看见了吗。这就是我拼死阻止的东西。\n如今炉在你手，玉在你身——这一世的你，敢不敢接着烧完这炉火？' },
  { t: 'narr', text: '幻象散去，你攥紧了拳。\n散魂未灭，就有救回来的可能——这是仇，也是债。两笔，你一起还。' },
] },

c5_end: { id: 'c5_end', title: '第五章 · 终 · 认与不认', scenes: [
  { t: 'narr', text: '金丹已成，前尘尽现。\n你坐在洞府深处，与识海中那缕前世的真灵，做了三百年来的第一次正式对谈。' },
  { t: 'dialog', who: '@c_zhenling', title: '识海深处', text: '我不求你认下血河宗——那个宗门该死。\n我只求你认下我这笔执念。宗主的万魂丹还差最后一味主魂，就是你。他找了我三百年，也会找你三百年。' },
  { t: 'investigate', text: '对谈之际，识海深处浮起几片断裂的记忆残章，明明灭灭，如沉船碎片。\n真灵闭目不语，似在等你自己伸手。', flag: 'k5_jade_truth', win: ['残章归位，画面豁然贯通：残玉本是一整块古玉。\n当年真灵被封入玉中时，古玉被劈作两半——\n另一半残玉在宗主手里——所以他才找得到你。\n同气相求，同源相引。三百年来的每一次「巧合」，都是他在千里之外收线。'], lose: ['残章如碎镜割手，识海一阵刺痛，画面尽碎。\n真灵轻叹：「记不得也好——有些画面，我替你记着。」'], options: [
    { text: '拾起那枚泛着玉色的残章', value: 'jade', ok: true },
    { text: '拾起那片烧着大火的残章', value: 'fire', ok: false },
    { text: '闭目不取——恐旧忆伤神，堕入心魔', value: 'none', ok: false },
  ] },
  { t: 'dialog', who: '@c_zhenling', title: '识海 · 铃与猎手', text: '「现在明白了？」真灵的声音很轻，「他握着另一半残玉，就像猎户腰上挂着的铃。\n你我每强一分，铃就响一分。躲，是躲不掉的。\n从今夜起，修行不是赶路——是赴约。」' },
  { t: 'choice', text: '面对前世的身份与仇怨，你的道心如何落子？', options: [
    { text: '认下这段因果——前世之债，今生来偿', value: 'accept', flag: 'k5_past_accept' },
    { text: '道不同——我是我，他是他，我只走我自己的路', value: 'sever', flag: 'k5_past_accept' },
    { text: '不认身份，只认利害——以他的执念为刃，反制于他', value: 'leverage', flag: 'k5_past_accept' },
  ], pick: (v) => {
    const p = Game.player;
    if (v === 'accept') { p.insight = Math.min(100, (p.insight || 0) + 8); return ['你在识海朝那缕真灵伸出手：「债我认，怨我接。\n但从今往后，这笔账由我来讨。」识海金光大涨。（突破感悟 +8）']; }
    if (v === 'sever') { KarmaSys.addFortune(6); return ['「前世是前世，我是我。」你斩断记忆的丝线，只取其警醒。\n道心澄明，天地开阔。（气运 +6）']; }
    p.insight = Math.min(100, (p.insight || 0) + 4); return ['身份可以不认，用处不能不要。\n前世真灵的记忆，就是宗主的命门地图。（突破感悟 +4）'];
  } },
  { t: 'narr', text: '残玉在你掌心微微发烫。《血河真解》的目录在识海里缓缓展开——其本体，就在宗主手中。下一战的沙盘，已然铺开。' },
] },

/* ============ 第六章 · 元婴杀局 ============ */
c6_open: { id: 'c6_open', title: '第六章 · 元婴杀局', scenes: [
  { t: 'narr', text: '元婴初成，神识大涨的当夜，你感应到三道杀意掠过天际——\n血河宗主的分身，循着残玉的气息来了。' },
  { t: 'dialog', who: '宗主分身', title: '天际 · 遥遥压制', text: '小辈，把真灵交出来，我留你元婴自废，做一介凡人。\n三百年前他选了一次，选错了。你——不必急着选，先活过今晚再说。' },
  { t: 'battle', foe: { name: '宗主分身·影', power: 22, species: 'human', elite: true }, label: '影身压境', text: '杀意凝成实质，一道影身自月色里步出，一步一重天。\n它不与你论道，也不给你布阵的工夫——抬手，便是一掌。', win: ['你竟撑过了十招——分身眸光微动：「有点意思。」拂袖而去。'], lose: ['你被一掌拍落尘埃——是残玉替你挡了致命一击。它认得同源之气，虚与委蛇间分身暂退。'], flagWin: 'k6_first_survive' },
  { t: 'dialog', who: '@c_ling', title: '掌心 · 玉颤', text: '你摊开掌心，残玉烫得几乎握不住。玉灵的声音抖得不成调：\n「……同源……它在唤玉……也在唤我……别让它……把我们拆开……」\n你把残玉贴着心口收好：「有我在。」\n玉的颤动，慢慢停了。' },
  { t: 'narr', text: '正面相抗，必死无疑。\n你想起典籍里的记载：上古法宝，克魔魂。集齐碎片铸成本命法宝，或有一线生机。' },
  { t: 'dialog', who: '你', title: '攥紧残玉', text: '想拿走他们，先过我这一关。\n——在我凑齐九枚碎片之前，这枚残玉，你一枚也拿不走。' },
] },

c6_mid: { id: 'c6_mid', title: '第六章 · 残魂授法', scenes: [
  { t: 'narr', text: '秘境深处，九枚碎片在你怀中嗡鸣不止，忽然齐齐飞起，悬成一周。\n碎片光幕之中，一位古修残影缓缓睁眼。' },
  { t: 'dialog', who: '上古残魂', title: '碎片光幕', text: '持玉者……老夫等你三百年。\n当年血河以万魂炼丹，老夫拼死封存九枚炼魂石于诸秘境——碎片聚，本命成，魔魂可克。' },
  { t: 'dialog', who: '上古残魂', title: '传授 · 消散前', text: '记住：此宝炼成之日，需以本命精血认主。\n它认的是「护」字——若有一日你拿它去害人，它会第一个反噬你。' },
  { t: 'narr', text: '残影散作点点星光，没入九枚碎片。\n你朝着光幕深深一拜——这一拜，是谢，也是誓。' },
  { t: 'narr', text: '光幕散尽前，你把那套心法一字一字刻进识海：九石祭炼之序、温养认主之法，还有那个缺一不可的「护」字诀。\n碎片尚未聚齐，法却已入手。\n从今往后，每一枚到手的碎片，都不再是死物——而是未来那件本命法宝的一块骨血。' },
] },

c6_end: { id: 'c6_end', title: '第六章 · 终 · 五碎片退敌', scenes: [
  { t: 'narr', text: '五枚碎片在你掌心嗡鸣，与体内残玉遥相呼应。\n分身的第三波杀意压顶而至的刹那，五道光柱冲天而起，结成一座上古困杀大阵！' },
  { t: 'battle', foe: { name: '宗主分身', power: 24, species: 'human', elite: true }, label: '五碎片困杀之阵', text: '分身自黑雾中凝出真形，袖中血河虚影翻卷如潮。\n大阵落定的刹那，五道光柱化作绞龙当空缠落——这一战，避无可避。', win: ['大阵绞落，分身影身寸寸崩裂。', '但一缕魂烟仍被光柱死死绞在阵心——困阵只余三息，它还有最后的话要说。'], lose: ['阵纹碎裂，分身冷笑而退——但它记住了你。', '五枚碎片却不肯罢休，余威自发追缠，生生把它的影身拖回阵心——困阵只余三息。'] },
  { t: 'dialog', who: '宗主分身', title: '阵中被困', text: '上古炼魂石的封印……好，好得很。\n小辈，你以为集齐碎片就赢了吗？本尊的真身，已在血河故道沉潜三百年——他，比你更有耐心。' },
  { t: 'choice', text: '困阵只撑得三息。分身将溃之际，你如何了断？', options: [
    { text: '阵中斩杀，不留后患——哪怕被他临死反噬', value: 'slay', flag: 'k6_clone_fate' },
    { text: '逼问血河故道的入口，再放他溃散', value: 'interrogate', flag: 'k6_clone_fate' },
    { text: '不为已甚——溃散即可，我要的是本尊', value: 'spare', flag: 'k6_clone_fate' },
  ], pick: (v) => {
    const p = Game.player;
    if (v === 'slay') { p.insight = Math.min(100, (p.insight || 0) + 6); Bag.addItem('m_gupian', 1); return ['光柱绞落，分身溃作齑粉——一缕晶粹的魂晶落入你掌心。\n杀伐果断，道心愈厉。（突破感悟 +6，上古法宝碎片 ×1）']; }
    if (v === 'interrogate') { KarmaSys.addFortune(4); return ['你以阵压魂，逼出一句真言：「血河故道，入水三千丈，问渡船人。」\n分身溃散。（气运 +4）']; }
    p.insight = Math.min(100, (p.insight || 0) + 3); return ['你收了光柱，任分身溃散——「回去告诉你的真身，我在血河故道等他。」\n不逞一时之勇，直取要害。（突破感悟 +3）'];
  } },
  { t: 'narr', text: '杀意暂时退去。\n你知道，分身只是开胃菜——本尊出关之日，才是真正的死局。而你要在那天之前，变得比死局更强。' },
  { t: 'narr', text: '夜色褪尽，东方既白。\n血河故道——本尊沉潜三百年之地。你把这个地名一笔一划，刻进了心里。\n想破那盘三百年前的死局，先得变强，还得找到能带你入水的人。\n路还长——但方向，已经有了。' },
] },

/* ============ 第七章 · 血河旧账 ============ */
c7_open: { id: 'c7_open', title: '第七章 · 血河旧账', scenes: [
  { t: 'narr', text: '化神之后，你的名字开始在诸宗长老之间流传。\n这一日，一位素未谋面的白须掌门亲自登门，屏退左右，只带了一样东西——一份泛黄的名单。' },
  { t: 'dialog', who: '@c_zhangmen', title: '开门见山', text: '三百年前灭血河宗那一战，老夫的师尊也被黑玉令牵着走。\n老夫时日无多，有些账，再烂在土里，就真的没人记得了。你若要查——名单给你。' },
  { t: 'dialog', who: '@c_zhangmen', title: '交名单 · 忏悔', text: '老夫的师尊，就是当年九个执行人里走得最早的一个。\n他临终前疯了似的烧自己的手札，烧到最后只留一句胡话：「令是假的，银子是真的……可火，是我们亲手放的。」\n老夫替他瞒了六十年，瞒得祖宗堂里的香火都烫手。今日把名单交到你手上，也算替他，把这句胡话说完。' },
  { t: 'narr', text: '名单上九个名字，六人已化尘土。\n第三个名字被朱笔圈过：当世某大宗的太上长老，如今依旧端坐在护山大阵之后，受万人敬仰。' },
  { t: 'dialog', who: '你', title: '摩挲名单', text: '朱笔圈过的……是第一个死的，还是第一个该死的？\n老前辈，这一笔，是您圈的，还是……' },
  { t: 'dialog', who: '@c_n5', title: '当夜 · 烟雨楼传讯', text: '白须掌门走后当夜，一枚烟雨楼的传讯玉简落在案头，柳含烟的声音懒洋洋的——\n「先前卖你的那笔『黑玉令』的账，记起来了么？九笔灵石，笔笔脏。今日白送一句：买名单抄本的那位买主，近来在筹一场丹会。他早知道你要查——真去赴宴的话，菜可以吃，茶别喝。」' },
] },

c7_mid: { id: 'c7_mid', title: '第七章 · 一纸请帖', scenes: [
  { t: 'narr', text: '你连败精英、声名鹊起的第七日，一只白玉飞帖落在你洞府案头。\n帖上字迹圆润和煦，内容却字字如刀。' },
  { t: 'dialog', who: '太上长老的请帖', title: '玉帖 · 原文', text: '「闻小友追查旧案，甚勇。\n三日后，敝宗丹会，备好茶。令祖当年之事，老夫知之甚详——来，或不来，悉听尊便。」' },
  { t: 'dialog', who: '@c_ling', title: '玉灵 · 案头低语', text: '……这块玉……是太衍祖堂的玉髓……三百年前，围山那面大阵的阵眼，也是这个颜色……\n……写帖的手……和当年递令的手……是同一双……' },
  { t: 'narr', text: '没有落款，没有威胁。\n可你翻遍整张玉帖，越看越冷——对方知道你在查，知道你查到哪一步，甚至……知道你会上钩。' },
  { t: 'narr', text: '明知是鸿门宴。\n但有些话，只有坐在那个位置上的人才能说给你听。' },
] },

c7_end: { id: 'c7_end', title: '第七章 · 终 · 落子之选', scenes: [
  { t: 'narr', text: '丹会之期将至，你把家底盘点了一遍：灵石、碎片、本命法宝、以及那份名单。\n棋盘铺开，你执黑先行——这一手，决定的是之后所有的棋路。' },
  { t: 'investigate', text: '落子之前，你把柳含烟的暗账与白须掌门的口供摊了满桌——玄玑真人当年圈名，究竟图什么？', flag: 'k7_purge_check', win: ['玄玑真人圈名是为自保——他早疑黑玉令有诈。\n九笔灵石里，有一笔在围杀前三日被退回原处，退银的手续上压着他的私印。他不是主谋，是唯一想抽身的人——抽不出去，才把名字圈住，等一个能替他翻案的后人。'], lose: ['三份旧档对到窗纸发白，答案没有浮上来。\n但「对不出」本身也是线索——能把三百年前的自己摘得这么干净的，从来只有当事人。'], options: [
    { text: '圈名是为灭口——案发之前，他要先除掉知情人', value: 'silence', ok: false },
    { text: '圈名是为分赃——他是九笔灵石的经手人之一', value: 'split', ok: false },
    { text: '圈名是为自保——他早疑黑玉令有诈', value: 'selfsave', ok: true },
  ] },
  { t: 'choice', text: '面对位高权重的太上长老，你如何落子？', options: [
    { text: '明查——应帖赴会，当面锣对面鼓', value: 'open', flag: 'k7_route' },
    { text: '暗访——绕开他，先查黑玉令的来历', value: 'dark', flag: 'k7_route' },
    { text: '借刀——把名单递给他的政敌，坐山观虎斗', value: 'blade', flag: 'k7_route' },
  ], pick: (v) => {
    const p = Game.player;
    if (v === 'open') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['你决定赴会。\n既然躲不过，就堂堂正正走进那座大阵——正气在胸，何惧鸿门。（突破感悟 +6）']; }
    if (v === 'dark') { KarmaSys.addFortune(5); return ['你按下玉帖，转身去查黑玉令。\n高手的对决从不在明面上——先断其爪，再扼其喉。（气运 +5）']; }
    p.insight = Math.min(100, (p.insight || 0) + 4); KarmaSys.addFortune(2); return ['你把名单誊抄三份，送进三家门派。\n让巨人们先互相咬起来，你在收网。（突破感悟 +4，气运 +2）'];
  } },
  { t: 'narr', reqChoice: { key: 'c7_end', oneOf: ['open'] }, text: '丹会当日，茶烟袅袅。玄玑真人隔着一张案，把三百七十一口说成「大势」，把黑玉令说成「上头的意思」，说得滴水不漏。\n你一句不驳，只在终席时把名单轻轻推了过去。老人捧着名单的手抖了一下——「小友，这盏茶老夫换了三百年的茶叶，今日才算烫嘴。」' },
  { t: 'narr', reqChoice: { key: 'c7_end', oneOf: ['dark'] }, text: '你按下玉帖，转身去查黑玉令。烟雨楼七日不熄灯——柳含烟把最后一页暗账推到你面前：九笔灵石，笔笔绕经太衍宗的库房。\n令是假的，可买令的银子是真的。你走出雨巷的那一夜，山门深处，一封自请彻查旧案的折子，连夜递进了祖师堂。' },
  { t: 'narr', reqChoice: { key: 'c7_end', oneOf: ['blade'] }, text: '名单誊抄三份，送进三家门派。七日之内，太衍宗祖师堂收到三封「故人书」，几位巨头的眼神变了。\n没人动刀——刀在每个人自己心里。玄玑真人自请闭宫思过，你在山上坐观虎斗，顺手收网。' },
  { t: 'narr', text: '落子无悔。\n而无论哪条路，终点都写着同一行字：血河故道，宗主本尊。' },
] },

/* ============ 第八章 · 大乘问道 ============ */
c8_open: { id: 'c8_open', title: '第八章 · 大乘问道', scenes: [
  { t: 'narr', text: '大乘雷劫落定，天地为你让路。\n可这夜残玉彻夜长鸣，鸣声里再无秘密可言——玄影客的杀意，已经近到你可以用肉眼看见。' },
  { t: 'narr', text: '你深知：决战之前，当有亲友相依、大道相佐。\n孤身一人，挡不住三百年布局的仇家——更挡不住他背后那张网。' },
  { t: 'dialog', who: '@c_n22', title: '血罗刹 · 夜献图', text: '血河故道外围三十六处暗桩，全是旧部的人——宗主沉潜三百年，拿他们当狗养着，也当柴烧着。\n布防图给你。别谢我，我做事向来看两边下注——这一回押你，是因为你出的价，他给不起。' },
  { t: 'dialog', who: '@c_n17', title: '星阵仙子 · 推演', text: '你的飞升雷台会落在何处，星图上已有先兆——血河故道上游，龙脊第三峰。\n天雷落处，星轨有七瞬倒卷，那是有人想借你的劫数搭桥。我把周天星阵铺在雷台四角——阵不替你挡雷，只替你定神。星与君同在。' },
  { t: 'dialog', who: '@c_n1', title: '剑宗 · 夜访', text: '听闻有人在集你的人头。\n我不管你查什么旧案——剑宗欠你一个恩情，这一战，青锋剑痴的剑，借你。' },
  { t: 'dialog', who: '你', title: '还礼', text: '沈兄，此战之后，我请你喝最好的酒。\n……若我回不来，就当我赊的。' },
] },

c8_mid: { id: 'c8_mid', title: '第八章 · 真灵授剑', scenes: [
  { t: 'narr', text: '功法参悟至极处，识海金光如昼。\n前世真灵自残玉中走出，这一回，他没有说话，只是抬手——' },
  { t: 'narr', text: '一式剑意自他指尖流出。不快，不烈，却让整个识海都安静下来。\n那是他当年名动血河的成名式：不为杀戮，只为「止战」。' },
  { t: 'dialog', who: '@c_ling', title: '玉灵 · 识海深处', text: '……这一式……我见过……那年围山的大火烧到河边，他就是用这一式断后的……一式落，追兵跪了一片，却没有一颗头颅落地……\n……三百年了……这一式，还记得回家的路……' },
  { t: 'dialog', who: '@c_zhenling', title: '临别', text: '这一式，三百年前我没能用它救下那九千九百九十九人。\n今日传你——别再像我一样，学会得太迟。' },
  { t: 'narr', text: '真灵散入你的金丹，从此不分彼此。\n你睁开眼，眸底有过一瞬的血色，随即澄明如洗。' },
] },

c8_end: { id: 'c8_end', title: '第八章 · 终 · 决战前夜', scenes: [
  { t: 'narr', text: '钦天台的星图上，属于你的那一格亮到了极处——飞升雷劫，定在十日之后。\n修士管这十日叫「最后的人间」：把未了的愿了了，把未谢的人谢了，再干干净净地上台。' },
  { t: 'montage', text: '这十日你没有虚度。\n沈青崖替你淬剑，红绡替你标图，姬冰颜替你布阵；你把两世的功法从头推演一遍，把残玉里借来的每一分力都演练到收放由心。\n整军，备武——磨的其实是自己这把刀。', days: 10 },
  { t: 'narr', text: '决战前夜，你没有修炼。\n你把想见的人都见了一遍，把想说的话都说了一遍——修士的道途太长，长到很多话一放就是几百年。' },
  { t: 'narr', text: '三更，烛火无风自灭。\n院子里落进一道人影，玄衣如墨，眉眼与传闻中的玄影客一般无二——「三百年的差事，今夜交割。主人等着收账，你这颗主魂，得先验验成色。」' },
  { t: 'battle', foe: { name: '玄影客', power: 30, species: 'human', elite: true }, label: '决战前夜 · 影身截杀', text: '墨色刀光先至，雷声后动。\n它每一步都踩在你旧年破绽上——三百年的眼睛，不是白长的。', win: ['影身寸寸崩解——三百年的人间眼睛，今夜闭上了。'], lose: ['影身退入夜色：「雷台见。」——它把最后一战留给了它的主人。'], flagWin: 'k8_shadow_slain' },
  { t: 'choice', text: '最后一杯酒敬给这场决战。你如何托付身后事？', options: [
    { text: '立誓同去——「要死一起死，要活一起活」', value: 'together', flag: 'k8_together' },
    { text: '托付后事——若我不归，请替我看一眼血河故道的春天', value: 'entrust' },
    { text: '独自承受——恩怨我一人结的，雷海我一人去趟', value: 'alone' },
  ], pick: (v) => {
    const p = Game.player;
    if (v === 'together') { KarmaSys.addFortune(6); return ['亲友把盏，齐声应诺。\n这一夜无人在意胜负——道途最贵，是有人与你同担。（气运 +6）']; }
    if (v === 'entrust') { p.insight = Math.min(100, (p.insight || 0) + 5); return ['你把残玉的一半放在至交掌心：「若我不归，替我把它带到血河故道。」\n道心因托付而愈定。（突破感悟 +5）']; }
    p.insight = Math.min(100, (p.insight || 0) + 8); return ['你婉拒了所有同行者——有些因果，只能一个人去结。\n独行者，道心至坚。（突破感悟 +8）'];
  } },
  { t: 'narr', text: '残玉忽然安静下来。\n它感应到了什么。决战之地，已被选定——你的飞升雷台。' },
] },

/* ============ 第九章 · 天劫决战 ============ */
c9_open: { id: 'c9_open', title: '第九章 · 天劫决战', scenes: [
  { t: 'narr', text: '渡劫之期，天未亮。\n血河故道的水面浮着一叶破船，老酒鬼披蓑戴笠立在船头，酒葫芦往船板上一磕：「上船。这条河三百年没载过活人——今日破个例。」' },
  { t: 'dialog', who: '@c_n23', title: '渡口 · 天未亮', text: '老朽在这条河上摆了三百年渡，捞上来的人，没有一个像你这样，是自己走进水里来的。\n这一趟渡你，也是渡我自己。船钱不收——你若赢了，替老朽往河里倒一壶好酒；你若输了，老朽就把船划到雷台底下，陪你最后一程。' },
  { t: 'narr', text: '渡劫雷云压顶之际，一道黑影踏雷而来。\n三百年前把你打下诛仙台的人，竟也踏入了这一方天地——血河宗主，来收他等了三百年的「主魂」。' },
  { t: 'figure', chr: '@c_zongzhu', art: '雷光在他身后炸开又熄灭——三百年了，这个人终于亲自来了。' },
  { t: 'dialog', who: '@c_zongzhu', title: '踏雷而至', text: '小家伙，你借残玉修行每一步，都是在替我温养真灵。\n如今你渡劫飞升，天地门开——把你炼成万魂丹最后的主魂，我这万年血河，就圆满了。' },
  { t: 'dialog', who: '你', title: '雷海中央 · 长啸', text: '三百年前你打碎他的金身，三百年后你打我的算盘。\n宗主——你算计了一辈子，就没算到，我们两个，都想你死。' },
  { t: 'narr', text: '雷海之上，新旧两世，终须一战。' },
] },

c9_mid: { id: 'c9_mid', title: '第九章 · 血煞渐醒', scenes: [
  { t: 'narr', text: '决战前的每一战，都让残玉更烫一分。\n前世真灵的血煞在你经脉里醒来——那是三百年前腥风血雨里淬出的凶性，也是最深的一道伤。' },
  { t: 'narr', text: '你清楚地感觉到两股力量在识海对峙：\n一股是前世燃烧的恨，一股是今生澄明的道。' },
  { t: 'narr', text: '你梦见三百年前的血河。火光里有人提刀而立，见人就斩，斩尽了一支追兵，回头时满脸是血——那张脸，是你现在的脸。\n你在梦里喊不出声，只听见那人低低笑了一声，笑声里的痛快，比哭还冷。惊醒时指缝里全是血腥味，残玉烫得几乎握不住。' },
  { t: 'dialog', who: '@c_zhenling', title: '识海 · 最后的叮嘱', text: '决战之时，我会把我所有的血煞借给你。\n但你要记住——借刀是为了止杀，不是为了痛快。这是我这三百年，唯一想通的事。' },
  { t: 'narr', text: '你点了点头。\n两世合一，只此一战。' },
] },

c9_end: { id: 'c9_end', title: '终章 · 雷海了断', scenes: [
  { t: 'narr', text: '第九道天雷落下时，你引动残玉中前世全部的血煞，与宗主的魔身同缚雷心。\n雷光吞没一切的刹那，你听见三百年来的执念，在雷心里烧成了灰。' },
  { t: 'narr', text: '雷心深处，魔身裂开一道缝——缝里走出另一个「宗主」。\n它由万魂怨念拧成，眉眼空无一物，袖口却垂着九十九条锁魂链的残环。真身未出，先遣万魂——这是帝渊三百年前围猎时的老规矩。' },
  { t: 'battle', foe: { name: '宗主分身·万魂影', power: 32, species: 'human', elite: true }, label: '雷海·第一阵', text: '万魂影不与你拆招。它张开手臂，把九千九百九十九道怨念当箭雨泼下来。\n雷海为幕，天地为局——你退无可退，唯有一往。', win: ['万魂影散作漫天萤火，萤火里传出九千九百九十九声叹息。\n它们不是你的敌人——它们只是被困得太久的魂，散尽之前，替你让开了通往雷心的最后一步。'], lose: ['你被万魂怨念掀下雷云，肋骨断了两根。\n残玉在你怀里烫得像一颗心脏，替你撑住了追击落下前的半息——第一阵未能全胜，但路，已经趟出来了。'], flagWin: 'k9_p1' },
  { t: 'narr', text: '第一阵过，雷海忽然静了。\n静得能听见血河故道的水声倒卷——三百年了，那口炉子终于浮出水面，与魔身合为一体。真正的帝渊，踏着自己养了三百年的河，来了。' },
  { t: 'battle', foe: { name: '血河宗主·帝渊', power: 36, species: 'human', elite: true, scale: 1.15 }, label: '雷心·第二阵', text: '「小家伙，你经脉里一半的修为，本座都认得——那是我看着长起来的。」\n帝渊抬手，血河故道之水应声成龙，缠绕上他的臂膀。', win: ['魔身寸寸崩解——万魂丹炉的锁魂链应声尽断。'], lose: ['你力竭跪雷——关键时刻残玉中两世之力合流，替你挡下最后一击。'], flagWin: 'k9_p2' },
  { t: 'dialog', who: '@c_zongzhu', title: '雷心 · 魔身崩解', text: '……为什么。\n我算尽了天时地利人心……唯独没算到，恨意烧到最后，剩下的会是……释然……' },
  { t: 'narr', text: '宗主长叹一声，魔身寸寸崩解。\n万魂丹炉的锁魂链应声尽断——九千九百九十九道流光自血河故道冲天而起，如逆流的星河，散入人间。' },
  { t: 'choice', text: '雷光将熄，宗主最后一缕残魂飘到你面前。你如何了断这三百年因果？', options: [
    { text: '渡他——「去吧，来世投个好人家」', value: 'redeem', flag: 'k9_final' },
    { text: '斩尽——「这一剑，替三百七十一口」', value: 'execute', flag: 'k9_final' },
    { text: '转身不问——雷散云开，恩怨自随劫火而灭', value: 'walk', flag: 'k9_final' },
  ], pick: (v) => {
    const p = Game.player;
    if (v === 'redeem') { KarmaSys.addFortune(10); return ['你收了剑，目送那缕残魂消散在天光里。\n雷散，云开。杀伐止于慈悲——这是比飞升更大的道行。（气运 +10）']; }
    if (v === 'execute') { p.insight = Math.min(100, (p.insight || 0) + 6); return ['剑光如练，斩落残魂。\n「这一剑，替采药老人，替三百七十一口，也替前世的我。」——恩怨两清。（突破感悟 +6）']; }
    KarmaSys.addFortune(4); p.insight = Math.min(100, (p.insight || 0) + 4); return ['你转身踏上雷台，不再回头。\n劫火焚尽万物，也焚尽了因果。（气运 +4，突破感悟 +4）'];
  } },
  { t: 'narr', req: ['k8_together'], reqChoice: { key: 'c9_end', oneOf: ['redeem'] }, text: '雷散，云开。你踏着最后一级雷光走下雷台——台下的人海里，不多不少，全是你要见的人。\n你的道侣第一个跑上来，一巴掌拍在你肩上，手却在抖：「酒呢？说好的最好喝的酒——两世的账，今日一并还。」' },
  { t: 'dialog', who: '@c_n23', req: ['k8_together'], reqChoice: { key: 'c9_end', oneOf: ['redeem'] }, title: '雷台之下 · 人海', text: '老酒鬼不知何时也混在人堆里，把酒葫芦抛给你：「河里那壶，老朽替你倒了——往后想喝，自己来。\n这条渡船，从今往后，只渡活人。」' },
  { t: 'dialog', who: '@c_n1', req: ['k8_together'], reqChoice: { key: 'c9_end', oneOf: ['redeem'] }, title: '物归原主', text: '沈青崖抱着剑站在人群外，等你走近，才把青锋抛还：「剑，物归原主。」\n「酒呢？」他问。\n「现在就去。」你说。——雷台之下，人间烟火，莫过于此。' },
  { t: 'narr', reqChoice: { key: 'c9_end', oneOf: ['execute'] }, text: '雪不知何时落了下来，落在雷台上，落在剑刃上，不化。\n你提剑立在原地，血色从眸底一寸一寸退干净——这一剑之后，两世的债都清了。清了的人，不需要表情。' },
  { t: 'dialog', who: '@c_n1', reqChoice: { key: 'c9_end', oneOf: ['execute'] }, title: '踏雪 · 不问', text: '沈青崖踏雪而来，看了一眼你的剑，又看了一眼雪地里那道焦痕，什么也没问。\n「剑收得干净。」他说，「走，喝酒——今日这顿，不赊。」' },
  { t: 'narr', reqChoice: { key: 'c9_end', oneOf: ['execute'] }, text: '你收剑入鞘，跟他走进雪里。\n身后的雷台渐渐白了，像一场迟到了三百年的葬礼，终于落了幕。' },
  { t: 'narr', req: ['k8_shadow_slain'], reqChoice: { key: 'c9_end', oneOf: ['walk'] }, text: '你没有回头。\n身后雷光散尽，天光落满人间——从这一夜起，巡夜的更夫再没见过踏月无声的黑影，说书人的段子里，多了一个「再没有暗影的人间」。' },
  { t: 'dialog', who: '@c_ling', req: ['k8_shadow_slain'], reqChoice: { key: 'c9_end', oneOf: ['walk'] }, title: '玉灵 · 灯河', text: '……三百七十一盏灯……都灭了……不对……是都「到家」了……\n……玉也困了……往后夜里，你睡你的，我睡我的……偶尔在梦里遇见，不算打扰……' },
  { t: 'narr', req: ['k8_shadow_slain'], reqChoice: { key: 'c9_end', oneOf: ['walk'] }, text: '残玉在你怀里轻轻一颤，像一声道别，又像一声晚安。\n人间再无暗影——这句话，往后要由活着的人，一年一年讲下去。' },
  { t: 'narr', noFlag: 'k8_together', reqChoice: { key: 'c9_end', oneOf: ['redeem', 'walk'] }, text: '雷散，云开。你独自走下雷台，长阶九百级，没有一个人迎你。\n也好——修士的道途本就是一个人走。你在心里这样说了两遍，走到第七十三级的时候忽然想起：这句话，你已经骗了自己两世。' },
  { t: 'dialog', who: '@c_zhenling', noFlag: 'k8_together', reqChoice: { key: 'c9_end', oneOf: ['redeem', 'walk'] }, title: '识海 · 烟散', text: '识海深处，前世真灵的声音淡得像一缕烟：「别学我。我独行了一世，把道走成了刀。\n我随劫火去了——往后的路你自己走。走慢些，替我把两世的风景，都看全。」' },
  { t: 'narr', noFlag: 'k8_together', reqChoice: { key: 'c9_end', oneOf: ['redeem', 'walk'] }, text: '你在长阶尽头站定，回身望了一眼雷台。\n天光落在空无一人的台上，像落在一张刚收完子的棋枰上——这局棋，两世为人，你终于下完了。' },
  { t: 'narr', text: '残玉化入你的眉心，化作一点朱砂。\n你回首人间，白衣胜雪——仙门之后，另有一番天地。\n\n【问道九章 · 终】' },
] },

  /* ============ v19 个人线 · 三幕角色弧光 ============ */
  /* ============ 个人线 · 沈青崖（剑冢心猿） ============ */
pl_n1_a1: { id: 'pl_n1_a1', title: '剑冢心猿 · 第一幕 · 断剑', scenes: [
    { t: 'narr', text: '霜降，青云剑宗后山演武场。\n你与沈青崖印证剑法。第九剑上，铮的一声脆响——他的佩剑「青锋」崩开一线细口，像月亮缺了一角。\n满场寂静。剑痴的剑崩了口，比剑痴受了伤更叫人心里发凉。' },
    { t: 'dialog', who: '@c_n1', title: '青锋剑痴', text: '不必看了。缺口在内刃三分处，续不上。\n这柄剑随我二十年。三岁开蒙，七岁佩剑，我此生说过的话，一半是对它说的。' },
    { t: 'dialog', who: '@c_n1', title: '青锋剑痴', text: '方才那一剑，你不必挂怀——错不在你。\n错在我。落剑时我动了一个念头：「要赢」。剑一动念，锋就散了。它替我受了这个念头，崩的是口，疼的是我。' },
    { t: 'choice', text: '失剑如失魂。你如何接住这位剑痴的沉默？', options: [
      { text: '陪他下山寻访铸剑古法——能续则续', value: 'a' },
      { text: '劝他直面缺口——「剑不必完美，人也不必」', value: 'b' },
      { text: '默默递上伤药——江湖人懂的江湖话', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['你们连夜下山，寻访一位封炉多年的铸剑师。\n炉火重开那一夜，铁屑纷飞如雪。你在飞溅的火星里看见一件事：修剑，先得肯低头求人。（感悟 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 2); KarmaSys.addFortune(1); return ['他捏着剑身沉默半晌，忽然道：「你说得轻巧。」\n可他终究把剑横在膝上看了一夜。肯看，就肯认。（感悟 +2，气运 +1）']; }
      p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['他接过药瓶，愣了愣，收进袖中。\n有些安慰不必说出口。他后来在剑鞘内壁刻了两个小字：谢药。（气运 +2，感悟 +1）'];
    } },
    { t: 'narr', text: '当夜你路过崖边，见他把断剑横在膝上，坐了整整一夜。\n天亮时崩口还在，他看它的眼神却变了——不再像看一道伤口，像看一个债主。\n他知道该还什么了。' },
  ] },
pl_n1_a2: { id: 'pl_n1_a2', title: '剑冢心猿 · 第二幕 · 剑心之问', scenes: [
    { t: 'narr', text: '一月后，沈青崖破例备了酒，请你上后山。\n山腰有座无字剑碑，是青云剑宗历代首席的衣冠冢。他师父那座，碑上连名字都没有。' },
    { t: 'dialog', who: '@c_n1', title: '青锋剑痴', text: '我师父，前代首席，死于一场论剑。三招落败，伤重不治。\n对手是位客卿，来历干净，出手合规。宗门查了三年，结论四个字：技不如人。' },
    { t: 'dialog', who: '@c_n1', title: '青锋剑痴', text: '可我十年后查到一份旧礼单。那位客卿赛前收过一份厚礼——里面是我师父毕生剑谱的手抄。\n每一式、每一变，连同未练成的残招。那不是比剑，是宰。操盘的人不为杀人，为的是让青云输一场。手抄的笔迹查到南边，就断了线。尾款笔笔出自同一处暗账。' },
    { t: 'choice', text: '他把剑横在碑前，问你：若查明操盘者，这一剑，该不该出？', options: [
      { text: '该出。剑锋所指，即是答案', value: 'a' },
      { text: '不该出。你修剑为守，不为恨', value: 'b' },
      { text: '先查明，再落剑。冤有头，债有主', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['他盯着剑锋看了很久：「好。那就先把这个『该』字磨利。\n从今日起，我的每一剑都比今天更直。」（感悟 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['他沉默良久，把剑归鞘：「守住的人，才配问那一剑。\n这句收进我的剑心里了。」（气运 +2，感悟 +1）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['他点头，一字一顿：「先查明，再落剑。剑不能被人当刀使——第二次不能。\n这一问，问剑，答的是心。」（感悟 +4）'];
    } },
    { t: 'narr', text: '下山的路上他没有回头。\n你只看见他的背影站得极直，像一柄插在鞘里三十年的剑，终于听见了自己的名字。' },
  ] },
pl_n1_a3: { id: 'pl_n1_a3', title: '剑冢心猿 · 第三幕 · 万剑归一', scenes: [
    { t: 'narr', text: '上古剑冢。\n万剑插地如林，剑身锈成暗红，一眼望不到边。风穿林而过，呜呜作响，像万剑齐哭。' },
    { t: 'dialog', who: '@c_n1', title: '青锋剑痴', text: '剑冢收葬无主之剑。主人死了，剑不肯锈透，就立在这里等。\n我背着断剑走了三日。它一路都在发烫——像认得路。' },
    { t: 'narr', text: '话音未落，他背后的断剑嗡然震颤。\n鸣声一圈圈荡出去，林中锈剑次第应和，锈色之下透出微光，一息一亮，此起彼伏，如群山应答。' },
    { t: 'dialog', who: '@c_n1', title: '青锋剑痴', text: '我懂了。我从前以为，剑是「舍」——舍情，舍怯，舍牵挂，一往无前。\n可你看这满山万剑，立着的全是「不放」。不肯放下该守的人，不肯放歪该行的道。主人不在了，剑还在替他「不放」。\n修剑，修的原来不是舍，是放不下。' },
    { t: 'choice', text: '万剑共鸣，断剑重鸣。他按剑问你：此刻，你要什么？', options: [
      { text: '请他以此剑为誓——同赴血河故道', value: 'a' },
      { text: '愿他守住今日之悟，别再磨去剑心', value: 'b' },
      { text: '什么都不求——这一鸣，你也听见了自己的剑心', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { KarmaSys.addFortune(3); return ['他以断剑指天为誓。鸣声骤然拔高，万剑齐震，如受敕令。\n有此一诺同行，前路风雨都轻了几分。（气运 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['他摇头笑了，二十年来第一次：「剑心不是守住的东西，是拿来用的。\n不过——谢了。」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['你没有开口。可断剑的鸣声穿过你胸口的那一刻，你听见了你自己的剑心——\n它在替你回答：放不下，就去扛。（感悟 +4）'];
    } },
    { t: 'narr', text: '出剑冢时天光大亮。\n断剑归鞘，鞘中鸣声不止，像一颗终于肯跳的心脏。他在崖头留下半句话：「青锋有缺口——\n道，无。」' },
  ] },

/* ============ 个人线 · 顾轻语（药炉心事） ============ */
pl_n2_a1: { id: 'pl_n2_a1', title: '药炉心事 · 第一幕 · 半张药方', scenes: [
    { t: 'narr', text: '丹霞谷药庐，药香浓得化不开。\n她借你的随身伤药看了一眼，就再没还回来。指尖捻着蜡丸，捻了很久。' },
    { t: 'dialog', who: '@c_n2', title: '丹谷仙子', text: '这方子不对。三钱白及、一撮血竭、引子用陈年灶心土——市面上的回春散不这样配。\n灶心土做引，是药堂古法，早断了传承。你从哪里得来的？' },
    { t: 'dialog', who: '@c_n2', title: '丹谷仙子', text: '陈拾……原来是他。我师父临终提过这个名字，说丹霞谷欠他一副药，欠了三百年。\n我这半张方子是师父口传，缺一半。他那有半张。凑起来，才是一副完整的药——和一笔完整的账。' },
    { t: 'choice', text: '半张药方，牵出两个门派三百年的旧线。你如何处置？', options: [
      { text: '把那半张方子赠她——药方救人是本分', value: 'a' },
      { text: '与她约定合力补全——你的来历，也算一半', value: 'b' },
      { text: '先请她讲清「欠一副药」的旧账', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她双手接过方子，郑重得像接一道法旨。\n施恩不图报的账，往往报得最迟，也最重。（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['你们以方换方，各抄一份，约定拼全为止。\n她说：「账要两家人一起认，药才能配齐。」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['她讲了一个时辰。三百年前药堂与丹谷的往来、那场大火、失散的师承——全对上了你怀中残玉的来历。\n方子没拼全，账先拼全了一半。（感悟 +4）'];
    } },
    { t: 'narr', text: '她把那半张方子收进袖中最贴身的一层。\n炉上的药沸了，她没有回头，但那炉火比平日旺了三分——像是替谁争了一口气。' },
  ] },
pl_n2_a2: { id: 'pl_n2_a2', title: '药炉心事 · 第二幕 · 谷中旧例', scenes: [
    { t: 'narr', text: '丹霞谷藏账阁，樟木柜被虫蛀了半壁。\n她从最深一格取出一册三百年前的老账，掀开夹层，抽出一张泛黄发脆的单子。' },
    { t: 'dialog', who: '@c_n2', title: '丹谷仙子', text: '你自己看。「血河药堂定金——赤芍、鬼臼各三百斤，岁供不辍。」\n丹霞谷替血河宗供过丹材，一供十几年。祖师爷怕担罪责，把这页压进夹层，立了条谷中旧例：历代谷主交接，只口传，不外泄。' },
    { t: 'dialog', who: '@c_n2', title: '丹谷仙子', text: '口传到我这一代。我原想就这么烂在肚子里。\n可我每次配药都在想：血河拿这些丹材炼什么？炼出来的东西，又害了多少人？药能救人，也能养刀。瞒着账配药，火再旺，也是脏的。我决定公开它。' },
    { t: 'choice', text: '三百年的旧例，她要亲手撕开。你如何进言？', options: [
      { text: '当众公开——丹霞谷自己背自己的锅', value: 'a' },
      { text: '呈交九宗联席——走正门，不走谣传', value: 'b' },
      { text: '等血河旧案水落石出，一并昭告', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她说：「好，家丑自己揭，总好过被人揭。」\n三日后山门外贴出抄本，骂声与敬声齐飞。敢自己揭锅的门派，反而没人敢踩。（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['她连夜封册，走了九宗联席的正门。\n「账要放在光底下对，谣言才没处钻。」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['她把单子重新压回夹层，指尖发白：「好。等真相齐了，一次说清。\n——但你得答应我，齐的那一天，别太久。」（感悟 +4）'];
    } },
    { t: 'narr', text: '藏账阁的灯亮到三更。\n她给历代谷主的名讳前各添了一炷香，轻声说：「不是要你们认罪，是要你们的后人——\n从今往后，配药配得干净。」' },
  ] },
pl_n2_a3: { id: 'pl_n2_a3', title: '药炉心事 · 第三幕 · 回春之约', scenes: [
    { t: 'narr', text: '药庐深夜，两炉火一前一后。\n她按陈拾遗方重配「回春续断散」，最后一味灶心土的火候迟迟定不下来，额上见了汗。' },
    { t: 'dialog', who: '@c_n2', title: '丹谷仙子', text: '不对，还差一口火……有了！古法取「陈年灶心土」做引，取的不是土，是「故土」二字。\n旧伤要医，先认旧账。难怪陈拾老先生的方子要这样配——他是把「认账」两个字，熬进药里了。' },
    { t: 'dialog', who: '@c_n2', title: '丹谷仙子', text: '成了。你看这药，成色温润，像不像一块玉？\n按谷例，头一粒该由配药人试服。可这副药还的是他老人家的债——我想，头一粒，该由你来开。' },
    { t: 'choice', text: '第一粒「回春续断散」在烛光下泛着温润的光。你如何开这第一封？', options: [
      { text: '以身试药，全她之诚', value: 'a' },
      { text: '封存一粒于药庐，与那半张方子放在一起', value: 'b' },
      { text: '带一粒去陈拾坟前——告知方子传下去了', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['药入喉，一线暖意断处重续。她盯着你的气色看了半炷香，长出一口气：「成了。\n三百年的方子，活了。」（感悟 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她把蜡丸供在药庐最高一格，与半张方子并排。\n「留个证。往后再有药堂的传人进门，让TA看看——账清了。」（气运 +2，感悟 +1）']; }
      KarmaSys.addFortune(3); return ['你在坟前把蜡丸埋进土里，坟头那株野药草开了一朵小花。\n她对着坟拜了三拜：「陈老先生，丹霞谷还药来了。」（气运 +3）'];
    } },
    { t: 'narr', text: '封口时她提笔写了一张小签：「回春续断散 · 陈拾方 · 丹霞谷谨制」。\n从此丹霞谷的药单上，多了一个失传三百年的名字。\n药香满谷，像有人终于睡了个好觉。' },
  ] },

/* ============ 个人线 · 柳含烟（烟雨账簿） ============ */
pl_n5_a1: { id: 'pl_n5_a1', title: '烟雨账簿 · 第一幕 · 一条消息', scenes: [
    { t: 'narr', text: '烟雨楼，灯影如豆，账房里纸页翻动的声音密得像春蚕食叶。\n柳含烟摇着扇子听你说明来意，扇子忽然停了。' },
    { t: 'dialog', who: '@c_n5', title: '烟雨楼主', text: '稀客。你打听三百年前的旧事？巧了——我也想查一笔三百年前的老账。\n先把丑话说在前头：烟雨楼的消息明码标价，人情另算，概不赊欠。' },
    { t: 'dialog', who: '@c_n5', title: '烟雨楼主', text: '查账，得先找到记账的人。三百年前的暗账，笔笔都用「鬼名」入册——记账先生必须死过一回，世上再无此人，账才压得住。\n这种人，生死簿上找不着，九幽册上倒有名。你要的账，和我要的账，说不定是同一本。要不要合伙？' },
    { t: 'choice', text: '她扇子一收，指印按在两指宽的合契上，等你落笔。', options: [
      { text: '应下合伙——她的价码，你付得起', value: 'a' },
      { text: '只互换线索，不涉金钱——各留退路', value: 'b' },
      { text: '先要她交底：烟雨楼三百年前替谁记的账', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['你按下指印。她把合契吹干，笑意不达眼底：「成交。\n放心，我的规矩比正道的良心可靠——我从不卖合伙人。」（感悟 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她挑眉：「行啊，防我一手也好。」\n两清的买卖最长久——这份清醒，日后救过你们两人的命。（气运 +2，感悟 +1）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['她收起扇子，第一次正眼看你：「问得好。三百年前，烟雨楼替一家烧掉的宗门记过善后账。\n记完了，账房先生就『死』了。想知道他死在哪一页——合伙。」（感悟 +4）'];
    } },
    { t: 'narr', text: '她送你到楼梯口，忽然又摇起扇子：「丑话说完了，说句体己的——\n这一单查出什么，都不许烧账。烟雨楼三百年的规矩：账可以烂，不能断。」' },
  ] },
pl_n5_a2: { id: 'pl_n5_a2', title: '烟雨账簿 · 第二幕 · 黑玉流向', scenes: [
    { t: 'narr', text: '深夜账房，烛火如豆。\n她把九张残页在桌上摆开，指尖点过九个墨点，摆成一个环。' },
    { t: 'dialog', who: '@c_n5', title: '烟雨楼主', text: '黑玉令现世前后那三年，有一处暗账往外走了九笔灵石。数目不大，路径极脏。\n九笔的收款人，分别是当时九宗里「说得上话」的九个人。九笔，九宗——你品品。' },
    { t: 'dialog', who: '@c_n5', title: '烟雨楼主', text: '有人想买九宗开门。或者更毒——买九宗闭眼。当年围杀血河宗，联军兵临山下，可那道山门始终没开过，里头发生了什么，没有任何一宗的战报提过。\n这半张网我拼出来了。另外半张，得你去撕。' },
    { t: 'choice', text: '九个墨点在烛光下连成一个环，环的缺口正对着血河故道。下一步怎么走？', options: [
      { text: '复制账页，分头去查九个收款人的下落', value: 'a' },
      { text: '请她顺藤摸瓜，直挖暗账源头', value: 'b' },
      { text: '原件封存——这半张网，现在掀不得', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['你们抄本分执，各查一半。她说：「九个人里总有一个还活着，或者还有后人。\n查到谁，先别惊动——网收不收得拢，就看第一针扎在哪。」（感悟 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她盘了三夜账，脸色一次比一次白：「源头摸到了边。\n那本暗账的封皮上，盖着半枚河纹。剩下的边，你比我近。」（气运 +2，感悟 +1）']; }
      KarmaSys.addFortune(3); return ['她依言把残页分藏三处：「懂行。查账查到一半死人，最常见。\n留网不收，留的是命。」（气运 +3）'];
    } },
    { t: 'narr', text: '收拾残页时，她忽然说了一句不像她风格的话：「干我们这行，账比人活得长。\n等真收网那天——记得叫上我。我倒要看看，那支笔最后落在谁手里。」' },
  ] },
pl_n5_a3: { id: 'pl_n5_a3', title: '烟雨账簿 · 第三幕 · 烟雨收网', scenes: [
    { t: 'narr', text: '烟雨楼顶层，烟雨旗在雨里发黑。\n她端来一只木匣，没有上锁，就搁在你面前的棋盘上。' },
    { t: 'dialog', who: '@c_n5', title: '烟雨楼主', text: '九笔灵石的来路、去向、经手人，加上这三百年我陆续补齐的七笔——一共十六笔，从黑玉令的仿制工钱，到九宗内应的安家费，全在这匣子里。\n整条资金链，一环不缺。棋盘上这一局，我替你摆了十年。' },
    { t: 'dialog', who: '@c_n5', title: '烟雨楼主', text: '你问我图什么？我图利，从来不讳言。可这一单，我分文未取。\n因为查到最后我发现，烟雨楼三百年前那笔「死账」的账房先生，临终把最后的证据折成了合契的里子——这笔账，他早就替我收过一次了。这条命的价钱，我替你付过了。剩下的，你自己去收。' },
    { t: 'choice', text: '木匣入手极沉。你如何接下这条三百年的资金链？', options: [
      { text: '收下匣子，许她收网之日同去', value: 'a' },
      { text: '把你查到的另一半网拼进去——两网合一', value: 'b' },
      { text: '先问她：那位账房先生，如今在哪儿', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她把你的手按在匣盖上：「一言为定。收网那日，我要亲手拨最后一颗算盘珠。」（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['两份账页在棋盘上严丝合缝。她盯着那个完整的环看了很久，忽然笑出声：「原来如此。\n这局棋，从头到尾只有一颗子——你。」（感悟 +4）']; }
      p.insight = Math.min(100, (p.insight || 0) + 3); return ['她望着窗外的雨：「坟头朝东，烟雨楼后山。他『死』后守了这座楼三十年，教出了我师父。\n你要谢，就去给他烧一页写完的账。」（感悟 +3）'];
    } },
    { t: 'narr', text: '你抱着匣子下楼，雨停了。\n她倚着栏杆自言自语：「等收了网，烟雨楼就不记这一册了。\n记了三百年——也该散了。」' },
  ] },

/* ============ 个人线 · 陆吾（扛山之义） ============ */
pl_n6_a1: { id: 'pl_n6_a1', title: '扛山之义 · 第一幕 · 半路兄弟', scenes: [
    { t: 'narr', text: '荒道，黑风口，劫刀比风还快。\n你看清刀势的时候，一道人影已经先你一步撞了上去——硬生生用背脊接了那一刀。' },
    { t: 'dialog', who: '@c_n6', title: '铁塔汉子', text: '哎哟——这刀有点意思！\n大汉拍了拍胸口，震下两片碎叶，咧嘴一笑，「兄弟，客气啥！俺皮糙，扛得住。你这身法太飘，落地没根。刀不认人，地可认人。」' },
    { t: 'dialog', who: '@c_n6', title: '铁塔汉子', text: '劫匪跑远了，他蹲下来拍你肩膀，力道大得你一歪。\n「俺叫陆吾，行脚的体修，哪黑哪歇，哪有饭哪吃。兄弟你这人俺看着顺眼——顺眼就是缘分。走！前头镇上有酒！」' },
    { t: 'choice', text: '他背上那道口子还在渗血，人却已经把你往镇子方向拽。', options: [
      { text: '请他喝酒——义气从酒起', value: 'a' },
      { text: '先替他上药——那道口子深可见骨', value: 'b' },
      { text: '与他拆招互搏，把「落地没根」补上', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['那夜他喝了三坛，说了十遍「兄弟」。\n酒肉穿肠过，交情心底留。（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['他咬着布条让你缝了七针，一声没吭，末了咧嘴：「手艺不赖。\n兄弟，你这药敷得比俺师父的拳头温柔多了。」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['他当你是自己人，体功诀倾囊相授——笨法子，死功夫，桩桩见效。\n你学的是招，懂的是理：所谓根基，就是肯往地下扎的那股劲。（感悟 +4）'];
    } },
    { t: 'narr', text: '镇口的酒旗在风里晃。\n江湖上认识一天就敢替人挡刀的人不多。\n你运气不坏——遇上了一个。' },
  ] },
pl_n6_a2: { id: 'pl_n6_a2', title: '扛山之义 · 第二幕 · 笨人的道', scenes: [
    { t: 'narr', text: '山道夜宿，篝火噼啪。\n他擦完那块磨得发亮的体功牌，忽然问了一句谁也没想到他会问的话。' },
    { t: 'dialog', who: '@c_n6', title: '铁塔汉子', text: '兄弟，俺问你个事，你别笑。\n俺入门晚，脑子笨，功法背三遍忘两遍，师父说俺这辈子练气都悬。俺就想问问——不聪明的人，配不配求长生？' },
    { t: 'dialog', who: '@c_n6', title: '铁塔汉子', text: '俺见过的聪明人多了。算得快，跑得更快，道侣换得比鞋还勤。\n俺笨。可俺认的路，走十年不拐弯；俺认的人，挡刀不眨眼。俺就是想知道——笨，算不算道？' },
    { t: 'choice', text: '火光把他一张憨脸照得通红，眼睛却亮得吓人。你怎么答？', options: [
      { text: '「配。道不问出身，只问走不走。」', value: 'a' },
      { text: '「你这条路叫『扛』——山就服你这样的人。」', value: 'b' },
      { text: '「长生另说。你这十年，活得比谁都真。」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['他「嗷」了一嗓子，把体功牌拍在胸口：「成！这话俺刻牌上！」\n道心这东西，有时就是别人一句话，自己走了十年。（感悟 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['他愣了半天，忽然咧嘴傻笑，指天指地又指自己。\n那晚他睡得打雷一样响。第二天，他背东西抢着走在下坡的那一侧。（气运 +2，感悟 +1）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['他半天没说话，火光照着一张通红的脸。\n末了把体功牌揣回怀里，声音闷闷的：「……兄弟，这话俺得想三年。\n三年后俺给你答案。」（感悟 +4）'];
    } },
    { t: 'narr', text: '天亮各自赶路，他站在岔口冲你挥手，嗓门传出去二里地：\n「往后谁问你修的什么道，就说——修的『不拐弯』！」\n你说不出为什么，眼眶竟有点热。' },
  ] },
pl_n6_a3: { id: 'pl_n6_a3', title: '扛山之义 · 第三幕 · 扛山之人', scenes: [
    { t: 'narr', text: '鬼泽。瘴气如墨，鬼火引路。\n你中了泽毒，双腿灌铅，天旋地转。这里是绝地——飞不走，爬不动，喊出去的声音连自己都听不见。' },
    { t: 'dialog', who: '@c_n6', title: '铁塔汉子', text: '趴稳了！\n他背转身蹲下，一把将你拽上背，勒紧了草绳，「说好了，要死一起死！俺的腿笨，可俺的腿认路——你在上头数数，数到三百，咱就出去了！」' },
    { t: 'dialog', who: '@c_n6', title: '铁塔汉子', text: '泥沼没过小腿，他一步一步往上拔，每一步一个血脚印。\n「俺师父说过——体修练到最后，练的不是筋骨。」他喘着粗气，一字一顿，「练的是背得动、几个人。」' },
    { t: 'choice', text: '他的呼吸越来越沉，脚步却没乱过一拍。你在他背上做什么？', options: [
      { text: '数数。一步不落，数到三百', value: 'a' },
      { text: '运功压毒，替他分一分背上的重', value: 'b' },
      { text: '把残玉贴上他的后颈——玉微微发热，毒瘴让路', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['你从他背后数到三百零七。他每答一声「到了」，脚下的血印就深一分。\n后来你说，那三百零七声，比任何功法都养气。（感悟 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['真气顺着草绳渡过去，他闷哼一声：「邪门！腿不沉了！」\n两个人分一副担子，山都要让路。（气运 +2，感悟 +1）']; }
      KarmaSys.addFortune(3); return ['玉温透过衣领，周围的瘴气竟真的退开一线，像水让开石头。\n他扭头看了一眼，只说了三个字：「好宝贝。」（气运 +3）'];
    } },
    { t: 'narr', text: '出泽那刻，天光刺眼。\n他把你放在干地上，自己一屁股坐进泥里直喘，忽然放声大笑：\n「三百零七步！兄弟——往后你的路，俺搭一脚！」' },
  ] },

/* ============ 个人线 · 姜暮寒（焚符之悔） ============ */
pl_n9_a1: { id: 'pl_n9_a1', title: '焚符之悔 · 第一幕 · 烧掉的符', scenes: [
    { t: 'narr', text: '隐市深处，符摊。朱砂、黄纸、老叟，一切如常。\n唯独每年冬至这一天，他的摊子都提前收——你留了心，今年悄悄跟了过去。' },
    { t: 'dialog', who: '@c_n9', title: '符门老叟', text: '看什么？老头子烧张符，也值得看？\n他往火盆里丢了一张黄纸。纸没烧到之前，你瞥见了符文的一角——封魂纹，三百年前的老笔法。' },
    { t: 'dialog', who: '@c_n9', title: '符门老叟', text: '三百年前欠下的符，年年重画一张，年年烧一张。烧的不是符，是笔画。\n小娃娃，你不懂。画符的人最怕的不是画错——是画「对」的东西，卖给了错的人。' },
    { t: 'choice', text: '火盆里纸灰打着旋往上飞。这个话头，你怎么接？', options: [
      { text: '替他拨旺火盆——有些话，火暖了才说得出口', value: 'a' },
      { text: '直问：「那符，当年卖给了谁？」', value: 'b' },
      { text: '什么也不问，陪他坐到火尽', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['火旺起来，烤得人脸疼。他抽了抽鼻子，忽然说：「三百年了，头一回有人陪老头子烤火。」\n悔这个东西，一个人捂着会捂成毒。（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['他握火钳的手停了停：「你迟早会拿着一样东西来问我这个问题。\n到那天，老头子一并答你。」（感悟 +4）']; }
      p.insight = Math.min(100, (p.insight || 0) + 3); return ['你们坐到火尽，一言未发。\n起身时他往你手里塞了个暖手的炭囊：「冬至寒。明年这时候，你再来。」（感悟 +3）'];
    } },
    { t: 'narr', text: '火光把他脸上的皱纹照成沟壑。\n灰烬飞起来，他喃喃道：「今年这张，烧完了。明年的，是最后一张。\n老头子的账——快还完了。」' },
  ] },
pl_n9_a2: { id: 'pl_n9_a2', title: '焚符之悔 · 第二幕 · 符出谁手', scenes: [
    { t: 'narr', text: '你把玄影令牌的河纹拓片摊在他案上。\n他只看了一眼，手里的朱砂笔「啪」地断了。' },
    { t: 'dialog', who: '@c_n9', title: '符门老叟', text: '河纹……起笔的漩，收锋的钩，错不了。这一路「锁魂十四笔」，是我姜家的底子。\n画这令牌的人，学的是我的符——或者是，照着我的符描的。' },
    { t: 'dialog', who: '@c_n9', title: '符门老叟', text: '三百年前，有人到隐市买封魂符，出手一箱灵石，只说四个字：「多多益善」。\n我贪那笔钱，画了七张，交了六张。第七张还没出手，血河宗就没了——买主死了，符烂在我手里。后来才知道，那六张符，封的是什么……老头子不敢往下想。' },
    { t: 'choice', text: '他把断笔扔进火盆，背影塌了下去。这一刻，你说什么？', options: [
      { text: '「七张符的债，不该你一个人背。」', value: 'a' },
      { text: '「告诉我买主的长相口音，一个字都别漏。」', value: 'b' },
      { text: '「把第七张画完。我带你去认账。」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['他背对着你摇头，肩膀却在抖：「背了三百年，背出习惯来了。\n不过——今晚这句话，老头子收下了。」（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['他闭上眼，三百年前的隐市在皱纹里活了过来。斗笠、水腥味、袖口的河纹……\n你一条条记下——这条线，通向水底。（感悟 +4）']; }
      p.insight = Math.min(100, (p.insight || 0) + 3); return ['他猛地回头，浑浊的眼睛亮了一下：「画完它……对，画完它。\n用姜家的笔，画一张干净的——把那六张脏的，一笔一笔抵回来。」（感悟 +3）'];
    } },
    { t: 'narr', text: '夜里他从枕函底下摸出一本符册，封皮烧去了半边。\n「当年七张的底稿，我一直留着。留着，就是等今天。\n小娃娃——你的玉，别再让我看第二回这样的东西。」' },
  ] },
pl_n9_a3: { id: 'pl_n9_a3', title: '焚符之悔 · 第三幕 · 最后一笔', scenes: [
    { t: 'narr', text: '符摊收了，改成一场小小的法事。\n净手，研砂，铺纸。他要为你画一张失传的「止杀符」——三百年里，这是他画的第八张封魂一路的符，也是最后一张。' },
    { t: 'dialog', who: '@c_n9', title: '符门老叟', text: '止杀符，不是封别人的杀心——是封自己人的。\n大战一起，杀红了眼，神仙也收不住手。这符贴在你心口，你的刀落不落得下去，符替你问一遍。落笔了。' },
    { t: 'narr', text: '第一笔落下时，他的手抖了——三百年了，起笔还是歪的。\n他把那张揉了，重新铺纸。第二张，一气呵成，朱砂红得像新血，也像旧账两讫。' },
    { t: 'dialog', who: '@c_n9', title: '符门老叟', text: '成了。六张封魂符，一张止杀符——笔数不抵，心意抵。\n从今往后，姜家的笔，干净了。这笔债，还到这儿，老头子轻省了。' },
    { t: 'choice', text: '止杀符在他指尖微微发烫。你如何接下这笔三百年后的墨？', options: [
      { text: '郑重收符，向他行一个晚辈礼', value: 'a' },
      { text: '请他在符角落款——「姜」字该留名，不该留憾', value: 'b' },
      { text: '烧掉那本底稿，灰入河——债清了，稿不必留', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['他还礼还到一半就别开了脸：「折煞老头子了……\n可这礼，受得起。」（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['他悬腕良久，落下一个极小的「姜」字，笔锋竟比符文还稳。\n「留名了。往后再有人提姜暮寒，就说他画的最后一张符，是干净的。」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['符册入火，火头青碧。灰烬随河水漂远，他站在河边看了很久，忽然笑出声。\n压了三百年的背，直了。（感悟 +4）'];
    } },
    { t: 'narr', text: '离开隐市时，身后传来久违的吆喝：\n「符箓——新到的符箓——」\n老叟的嗓门亮得不像个还完债的人。那年冬至，他的火盆，第一次没有点。' },
  ] },

/* ============ 个人线 · 云无月（月下旧盟） ============ */
pl_n13_a1: { id: 'pl_n13_a1', title: '月下旧盟 · 第一幕 · 月下逢', scenes: [
    { t: 'narr', text: '月夜，废亭。\n云无月倒挂在亭檐上晃着腿，笑得像只偷腥的猫。可当残玉从你怀里透出一线温光时——她落地了。笑，没了。' },
    { t: 'dialog', who: '@c_n13', title: '月下魔姝', text: '别动，让我看看。\n她两指虚拈，一缕黑气探向残玉，指尖「咔」地结了一层薄霜。她盯着自己的指尖看了很久。……血河的东西。三百年了，气口还这么冲。你惹上大麻烦了，小家伙。' },
    { t: 'dialog', who: '@c_n13', title: '月下魔姝', text: '追这枚玉的东西，不在人间名册上。影子做的身子，月亮照不出脚印。\n我说笑了三百年。今夜这句不是笑话——那玉，要么交给藏得住的人，要么，就找个不怕死的护着它。' },
    { t: 'choice', text: '她收起指尖的黑气，看着你。月亮在她背后，像一枚圆章。', options: [
      { text: '「你不就是那个不怕死的？」', value: 'a' },
      { text: '收起玉，只问她这一眼开价几何', value: 'b' },
      { text: '「麻烦多大？」——先掂量，再谈价钱', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她怔了怔，随即笑出声，笑得比哪次都真：「胆子不小。\n好——这单我接了。价钱月圆再谈。」（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['她挑眉：「跟魔道谈价，居然不脸红。行，就冲这份镇定——\n第一眼，免费。」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['她竖起三根手指：「多大？大到整个暗市听见『血河』两个字都要闭门。\n但再大的麻烦，也大不过三百年——我陪你去看看它到底有多大。」（感悟 +4）'];
    } },
    { t: 'narr', text: '她重新笑起来，可眼睛没笑。\n「月圆之后，跟我走一趟。去个地方，认认门——\n」她飘上檐角，「认完那扇门，你就知道你的玉有多烫了。」' },
  ] },
pl_n13_a2: { id: 'pl_n13_a2', title: '月下旧盟 · 第二幕 · 暗市带路', scenes: [
    { t: 'narr', text: '地底暗河，舟行无灯，她以指为烛。\n石壁尽头人声嘈杂——血河余孽的销赃暗市，三百年没断过香火。' },
    { t: 'dialog', who: '@c_n13', title: '月下魔姝', text: '规矩记好：不问货从哪儿来，不问钱往哪儿去，还价不过三句。\n这条街上，死的规矩比活人多。踩错一条，你就成了下一件货。' },
    { t: 'narr', text: '货架深处，她忽然停步。\n一盏没点过的河灯，灯面落款四个褪色的小字——「药堂陈记」。' },
    { t: 'dialog', who: '@c_n13', title: '月下魔姝', text: '看见没。血河宗药堂的河灯，如今论斤卖。\n当年满城放灯送宗门南下，一夜之间，灯全灭了——人也是。这条街烧了三百年血河的旧货，烧来烧去，连良心都成了赝品。' },
    { t: 'choice', text: '那盏河灯落满灰尘，摊主正吆喝着下一件货。你怎么办？', options: [
      { text: '买下河灯——陈拾的灯，不该摆在这儿', value: 'a' },
      { text: '记下摊主容貌来历，不动声色', value: 'b' },
      { text: '低声问她——为何对药堂的东西如此熟稔', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她替你压价三句，分文不多。出暗市后她瞥了那灯一眼：「买盏破灯。\n——账记得倒干净。」（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['你把摊主的口音、疤位、收货的手势一一记下。她似笑非笑地扫你一眼：「学会不掏钱了？\n开窍。这条街上，眼睛比手好使。」（感悟 +4）']; }
      p.insight = Math.min(100, (p.insight || 0) + 3); return ['她沉默了一瞬：「三百年前，药堂的老执事替我娘看过病，没收钱。\n这条街上我记得的干净东西，就这一件。」（感悟 +3）'];
    } },
    { t: 'narr', text: '出暗市时，她把一枚骨哨丢进你手里。\n「哨响三声，我到。\n这条街上认识你的人越少，你活得越久。」' },
  ] },
pl_n13_a3: { id: 'pl_n13_a3', title: '月下旧盟 · 第三幕 · 旧盟清算', scenes: [
    { t: 'narr', text: '月圆，断桥。\n桥那头立着一个影子似的人——她旧日的盟主，血河余孽里管着暗市账目的「灯主」。她把一张旧盟书摊在栏杆上。' },
    { t: 'dialog', who: '@c_n13', title: '月下魔姝', text: '当年我入魔道，是灯主收的留。盟约上写：血河之物过手，留一成，报一信。\n我守了它一百年。直到我看见你袖子里的玉——盟约和良心，总得死一个。今晚，死盟约。' },
    { t: 'narr', text: '她指尖挑破盟书，黑焰自焚，火星映着桥下暗河。\n灯主的影子动了动，终是退回了黑暗里——魔道的规矩，焚约即清算，债不追死人。' },
    { t: 'dialog', who: '@c_n13', title: '月下魔姝', text: '清算完毕。从今夜起，暗市的一成归你，信也归你。\n——我不入正道，我嫌它脏得含蓄。但今日起，与你同路一程。' },
    { t: 'choice', text: '半张盟书在她指尖烧成了灰。这一程，怎么个同路法？', options: [
      { text: '与她重立一契——不写血，写名', value: 'a' },
      { text: '只收她的「信」，不收那一成', value: 'b' },
      { text: '「同路不必立契。走到哪，算哪。」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['新契只有两行名字。她看了半天：「比旧的短多了。\n短的账，好记。」（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['她挑眉：「嫌魔道的钱脏？」\n顿了顿，又笑，「……不，你是嫌它重。行，这份情我记下了——情比钱贵。」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['她愣了很久，忽然把烧剩的半角盟书抛进河里：「三百年了，头一回有人不要我立字据。\n你胆子真大。」（感悟 +4）'];
    } },
    { t: 'narr', text: '断桥下暗河水声不歇。\n她抱臂靠着栏杆，月光第一次没被她的影子挡住：\n「旧账烧完，新账开始记。第一笔——云无月，欠月色一场。\n欠你多少，看你往后怎么记。」' },
  ] },

/* ============ 个人线 · 姬冰颜（星轨之约） ============ */
pl_n17_a1: { id: 'pl_n17_a1', title: '星轨之约 · 第一幕 · 星轨异常', scenes: [
    { t: 'narr', text: '周天阁观星台，铜壶滴漏。\n她把一张星图铺在你面前，指尖压住其中一枚亮点——周天星轨岁岁西移，唯独血河故道上空那一颗，三百年未动。' },
    { t: 'dialog', who: '@c_n17', title: '星阵仙子', text: '星轨是天地的呼吸。呼吸会停么？会——除非有什么东西，把这一片天按住了。\n故道水底沉着的，恐怕不是一座废宗。是一口「没咽下去的气」。' },
    { t: 'dialog', who: '@c_n17', title: '星阵仙子', text: '我算过那颗星的滞数。它不是不动，是每夜被什么东西拉回去一次——像心跳，像呼吸，像一只不肯闭上的眼睛。\n你怀里的玉，和它同一个气口。别装听不懂。' },
    { t: 'choice', text: '星图上那枚亮点被她画了一圈朱砂。这一圈，如何落下？', options: [
      { text: '坦言残玉来历，请她共查', value: 'a' },
      { text: '只问「按住天的东西」，不提玉', value: 'b' },
      { text: '请她推演故道星轨的「醒日」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['你把陈拾、残玉、玄影客一一道来。她听完，在星图背面添了一行小字：「星轨不欺，人自欺。\n自今日起，此星与你同录。」（感悟 +4）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她也不点破，只把星图折好递给你一半：「各守各的底。\n天上的事，急不来。」（气运 +2，感悟 +1）']; }
      p.insight = Math.min(100, (p.insight || 0) + 3); return ['她推演一夜，晨光里吐出四个字：「醒日未定。\n但它每夜都在挣——你怕不怕？它挣开那日，就是你必须到场的日子。」（感悟 +3）'];
    } },
    { t: 'narr', text: '她收起星图，指尖在「故道」二字上停了很久。\n「星轨不骗人，骗人的是人。\n这句话你记住——比记住我的星图有用。」' },
  ] },
pl_n17_a2: { id: 'pl_n17_a2', title: '星轨之约 · 第二幕 · 塔顶档案', scenes: [
    { t: 'narr', text: '观星塔顶层，积灰的档案匣。锁芯三百年没人转动，锈屑簌簌落下，像一声迟到的咳嗽。' },
    { t: 'dialog', who: '@c_n17', title: '星阵仙子', text: '先辈手记，末页。她逐字念出声，声音在塔里荡出回音——\n「血河覆灭当夜，吾辈登台夜测，见故道上空星轨倒走一瞬。倒走者非星，乃天机倒卷。录之，以俟后人。」' },
    { t: 'dialog', who: '@c_n17', title: '星阵仙子', text: '倒走一瞬，天机倒卷。血河覆灭当夜，故道上空的时间倒行了一瞬。\n一瞬能做什么？足够把一个人从围杀里捞出去；或者——把一件东西送回水底，藏进「昨夜」。先辈看见了，却只敢写半页。' },
    { t: 'choice', text: '半页手记，一句天机。你如何解这一瞬？', options: [
      { text: '「是捞人。帝渊没死在水底——是被人送回去的。」', value: 'a' },
      { text: '「是藏物。丹炉或令牌，藏进了『倒走』里。」', value: 'b' },
      { text: '手记只存半页——请她追索缺失的后半', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['她笔尖一顿，在星图故道的位置重重一点：「星轨每夜被拉回去一次——拉的不是一个死人。\n死人不需要呼吸。你这一解，解到了骨头上。」（感悟 +4）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['她沉吟：「藏物……倒走的一瞬里，一件东西从『明夜』回到了『昨夜』。\n那么它此刻就在水底，比我们所有人都『早』三百年。」（感悟 +3）']; }
      if (v === 'c') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['塔底翻出三箱旧档，烧毁的边角与你袖中残玉的断口形状相合。\n「先辈烧掉后半页——是不想让它落在错的人手里。现在，它落对了。」（气运 +2，感悟 +1）']; }
    } },
    { t: 'narr', text: '合上手记时，塔外夜风穿廊，星图猎猎作响。\n她把先辈的名讳擦净，轻声道：「三百年前我们的先辈看见了，不敢写全。\n我们这一代——把它写全。」' },
  ] },
pl_n17_a3: { id: 'pl_n17_a3', title: '星轨之约 · 第三幕 · 护阵之约', scenes: [
    { t: 'narr', text: '飞升雷台，荒草齐膝。\n她展开周天星图，三百六十五枚阵旗在暮色里次第亮起，像有人把星空铺在了地上。' },
    { t: 'dialog', who: '@c_n17', title: '星阵仙子', text: '周天星图，护的不是雷，是人心。天劫落到第七道，人会怕；人一怕，手就歪。\n我的阵不替你挡雷——只替你定神。雷落之时，星与君同在。' },
    { t: 'dialog', who: '@c_n17', title: '星阵仙子', text: '最后一面旗落位，满台星光明灭如潮。她收手，指尖冻得发白，脸色比星光还淡——\n阵成了。阵眼留了一个位置，在你心口。玉在，阵在。别问为什么——星图上那颗三百年不动的星，今夜，替你亮了。' },
    { t: 'choice', text: '三百六十五面旗在风里轻响，像一场提前到场的雷。你如何回她？', options: [
      { text: '拜她为「护阵人」——此诺共守', value: 'a' },
      { text: '问她怕不怕——布阵的人，也站在雷台下', value: 'b' },
      { text: '什么也不说，与她一起收最后一面旗', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她受了半礼，还了半礼：「阵在人在。\n——记住了，这四个字周天阁说出口，就没有收回的道理。」（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['她怔了一下，随即别开脸：「问阵的事，别问阵师。\n……怕。所以才来。」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['你们一人一半，把最后一面旗稳稳夯进土里。她拍去手上的泥，难得地笑了一下：\n「旗是我们一起插的。那么雷——也落不到不该落的地方。」（感悟 +4）'];
    } },
    { t: 'narr', text: '下山时回望，雷台之星高悬，与故道上空那颗「钉死」的星遥遥相对。\n她的话随夜风散上来：\n「一颗在等你，一颗在陪你。\n去——把这两颗星，摘成一颗。」' },
  ] },

/* ============ 个人线 · 红绡（罗刹洗名） ============ */
pl_n22_a1: { id: 'pl_n22_a1', title: '罗刹洗名 · 第一幕 · 试探', scenes: [
    { t: 'narr', text: '茶棚，雨。\n她坐在你对面，笑意盈盈，袖中一缕寒气却贴着你持杯的手背——你袖中那卷河纹拓片，不知何时已被她拈在指间。' },
    { t: 'dialog', who: '@c_n22', title: '血罗刹', text: '别动。让我看看……嗯，起笔的漩，收锋的钩，好东西。\n她把拓片还你，笑得更艳了。这东西，害过很多人。捡到它的人，一般活不过当夜——你猜猜，你为什么还活着？' },
    { t: 'dialog', who: '@c_n22', title: '血罗刹', text: '因为我认得它。三百年前，画这纹的人，教过我认字。\n血罗刹也是血河的「罗刹」——这名号不是白叫的。怎么，茶不敢喝了？' },
    { t: 'choice', text: '茶汤映着她的红衣，也映着你的脸。这盏茶，怎么喝？', options: [
      { text: '端起茶一饮而尽——「那你现在，教谁？」', value: 'a' },
      { text: '「教过你认字的人，欠这天下三百七十一条命。」', value: 'b' },
      { text: '「河纹认你。你打算拿它换什么价？」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['她盯了你三息，忽然抚掌大笑：「三百年来，第一批不跑的人。」\n敢在血罗刹面前喝茶的胆子，本身就是一种通行证。（感悟 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['满棚骤静。她脸上的笑一点点淡下去，指尖的寒气却散了：「……你查到哪儿了。」\n这一问，把你们从试探，推成了同谋。（感悟 +4）']; }
      if (v === 'c') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她笑吟吟地支起下巴：「跟魔道女修谈价？胆色可嘉。\n这一眼免费。下一眼——看你值多少。」（气运 +2，感悟 +1）']; }
    } },
    { t: 'narr', text: '雨停时她起身，红衣竟没沾一个雨点。\n走到棚口她回头，眉眼弯弯：\n「别去查我。\n先去查——你袖子里那个东西。」' },
  ] },
pl_n22_a2: { id: 'pl_n22_a2', title: '罗刹洗名 · 第二幕 · 第一份名单', scenes: [
    { t: 'narr', text: '夜，义庄。\n她从一具空棺的底板下抽出一卷油布，油布里是一份名单——血河余孽安插在九宗市井的暗桩，四十七个名字。' },
    { t: 'dialog', who: '@c_n22', title: '血罗刹', text: '这就是我「卖钱」的那份。江湖上都知道，血罗刹的名单，一个名字一千灵石，童叟无欺。\n四十七个名字，我卖出去十一个。剩下的，我捂了三年。' },
    { t: 'dialog', who: '@c_n22', title: '血罗刹', text: '捂着不卖，不是慈悲，是筹码。\n如今筹码给你——别谢我，我从不做亏本买卖，这叫等价交换。你要拿它做什么？收网，还是放长线？想清楚再开口。名单过了今夜，就不姓红了。' },
    { t: 'choice', text: '四十七个名字在烛光下密密匝匝，像一片没拔干净的刺。', options: [
      { text: '「一个不杀，先盯死。网收全了再收。」', value: 'a' },
      { text: '「呈九宗联席——明刀明枪。」', value: 'b' },
      { text: '「卖出去的十一个名字，钱你都退了？」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['她眼中第一次露出一点近乎赞许的东西：「放长线……你比九宗那些官老爷聪明。\n盯死他们。名单上有三个会武功的，我替你盯。」（感悟 +4）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['她把油布推过来：「明刀明枪好啊。就是记住——联席开印之前，一个都不能惊动。\n这四十七个人里，有三个的保举状，还压在九宗某位大人物的匣子里。」（感悟 +3）']; }
      if (v === 'c') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['她数着指尖笑：「退了七个。有四个的买主，是我惹不起的。\n你看，赎罪也有行情——我把行情里能做的都做了。」（气运 +2，感悟 +1）']; }
    } },
    { t: 'narr', text: '她把油布放进你手里，指尖冰凉。\n「记住。这份名单上没有好人，我更不是。\n但今晚之后，它在你手里——就不只是一批杀人的货了。」' },
  ] },
pl_n22_a3: { id: 'pl_n22_a3', title: '罗刹洗名 · 第三幕 · 赎罪之名', scenes: [
    { t: 'narr', text: '河滩，篝火。\n她取出第二卷名单——更薄，只有一张纸。火光里她看了很久，忽然笑了：\n「猜猜上头几个名字？一个。血罗刹。行不更名，坐不改姓——今天改。」' },
    { t: 'dialog', who: '@c_n22', title: '血罗刹', text: '三百年前血河围杀，我这一脉是刀。后来宗门亡了，刀没了鞘，就成了江湖上最贵的凶器。\n第一份名单卖的是别人。这一份，压在我枕头底下三十年，夜夜数一遍名字，才睡得着。' },
    { t: 'narr', text: '纸入火，焰头青碧。\n她盯着那点火，一动不动，像在给谁守灵。' },
    { t: 'dialog', who: '@c_n22', title: '血罗刹', text: '从今日起，血罗刹欠你一条命——不是你救了我，是你让我敢烧这张纸。\n债主在，刀才肯入鞘。这话我只说一遍，你听见了，就是我的人证。' },
    { t: 'choice', text: '火苗在风里伏了又起。这个夜晚，你递过去什么？', options: [
      { text: '替她往火里添一把河沙——让灰有处可落', value: 'a' },
      { text: '「名字烧了，人还在。往后你姓什么？」', value: 'b' },
      { text: '什么也不说，陪她看到火尽', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['沙压火头，灰烬缓缓沉进河滩。她低声道：「三百年，这张纸头一回有了落脚的地方。\n……多谢。」（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['她望着河水，半晌，轻轻吐出两个字：「随你。\n——这答案，够胆吧？」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['火尽，天边泛白。她站起身，像卸下了三百斤的东西。\n「你一句话没说。比说什么都好。」（感悟 +4）'];
    } },
    { t: 'narr', text: '灰烬被河水带走，一点不剩。\n她撕下红衣的一角，系在河滩老树的枝上，像一面极小的旗。\n「旧名葬这儿了。\n新名字——等血河的水清了再取。」' },
  ] },

/* ============ 个人线 · 老酒鬼（渡船归人） ============ */
pl_n23_a1: { id: 'pl_n23_a1', title: '渡船归人 · 第一幕 · 酒里有人', scenes: [
    { t: 'narr', text: '渡口，暮色。老酒鬼横在船头，酒葫芦倒过来也倒不出一滴。\n你讨船，他不醒。你付钱，他不醒。' },
    { t: 'dialog', who: '@c_n23', title: '醉道人', text: '直到你在船板坐下，怀中残玉微微一热——他忽然睁眼，眼亮得不像醉汉。\n喝一口。就一口。不喝？那咱俩今夜谁也过不了这条河。' },
    { t: 'dialog', who: '@c_n23', title: '醉道人', text: '酒入喉，辣，随后是说不出的凉。他敲了敲船底，侧耳听——\n听见没？故道的水，喝一口，能听见三百个声音喊渡。喊了三百年，一个也没渡过去。不是船不肯走，是他们不肯上船。' },
    { t: 'choice', text: '船底传来极轻的水响，一声，又一声，像有人在敲门。', options: [
      { text: '「为什么不肯上船？」', value: 'a' },
      { text: '把葫芦抢过来喝干——「那今晚，先渡我一个。」', value: 'b' },
      { text: '屈指敲船底回他三下——船家暗语，问的是「渡谁」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['他翻了个身，把脸埋进臂弯里，声音闷得像从水底冒上来：\n「渡船要有岸。他们的岸——沉了。」（感悟 +4）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['他乐了，一骨碌坐起来跟你抢葫芦：「有胆！\n后半夜你做个梦，梦见有人朝你作揖——别躲，受了它。」（气运 +2，感悟 +1）']; }
      p.insight = Math.min(100, (p.insight || 0) + 3); return ['三声回敲，他猛地坐直，醉意褪了一半：「行家。\n渡谁？渡……跟你怀里那块玉，认识的那些人。」（感悟 +3）'];
    } },
    { t: 'narr', text: '那夜的河面无风。\n水声却像有人贴着船板，一声一声，数你的心跳。\n鼾声里，他含混吐出两个字：「……等着。」' },
  ] },
pl_n23_a2: { id: 'pl_n23_a2', title: '渡船归人 · 第二幕 · 疯话与真话', scenes: [
    { t: 'narr', text: '渡口草棚。\n他画图：先在泥地上画，画错了抹；再用炭在船板上画——水道、暗礁、旋眼，一笔不乱，像刻在骨头里。' },
    { t: 'dialog', who: '@c_n23', title: '醉道人', text: '人都说老酒鬼疯。疯好啊，疯人不记账。\n三百年前，我是这条河上的船夫。官家的、私家的、血河宗的——给钱就渡。那一夜，我渡了最后一船人。载的不是人，是刀。' },
    { t: 'dialog', who: '@c_n23', title: '醉道人', text: '刀上岸，下游的村子就没再亮过灯。后来封河的封河，倒宗的倒宗，我才明白我渡的那船刀是去做什么。\n从那天起我就没醒过——醒着的人得记得水路。你猜我怎么会记得？我夜夜听水底三百个人，一遍一遍背给我听。' },
    { t: 'choice', text: '炭笔在他指间转了三圈，停住。三百年的船家，等一个问对问题的人。', options: [
      { text: '「那一船刀，是你亲眼看见的，还是你猜的？」', value: 'a' },
      { text: '「把水路图给我。它该见天日了。」', value: 'b' },
      { text: '「水底那三百个声音——他们要渡去哪儿？」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['他闭上眼：「我猜的。所以我疯了——猜错和做错之间，隔着我整条命。\n你要替我去看一眼。看清了，回来告诉我。」（感悟 +4）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['他把船板上的图重新誊在一张桑皮纸上，折成船形递给你：「图给你，船留着。\n哪天你要下水，记得回来找我——舵我熟，风，我说了不算。」（感悟 +3）']; }
      if (v === 'c') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['他往河心指了指：「渡去该去的地方。可河水浑，他们认不得路。\n得有人举灯。灯……你怀里就有。」（气运 +2，感悟 +1）']; }
    } },
    { t: 'narr', text: '他把炭笔别回耳后，忽然清醒得吓人：\n「小娃娃，疯是老头子自己挑的壳。\n壳里有个人，守了三百年渡口——他不是不想赎罪，他是不知道，赎给谁看。」' },
  ] },
pl_n23_a3: { id: 'pl_n23_a3', title: '渡船归人 · 第三幕 · 渡人渡己', scenes: [
    { t: 'narr', text: '决战前夜，渡口。\n他把船底的旧漆刮掉，露出底下一行褪色的字：「血河渡口，夜渡亡魂」。然后他往船头摆碗——一只，两只……摆到第三百七十一只，天快亮了。' },
    { t: 'dialog', who: '@c_n23', title: '醉道人', text: '三百七十一只碗，三百七十一口人。名字早被水冲走了，碗替他们记数。\n酒满上。水底的听着，岸上的也听着——这一趟，谁也不落下。' },
    { t: 'dialog', who: '@c_n23', title: '醉道人', text: '决战那日，我掌船。你只管往前看，水底下的事交给我——我知道哪儿该慢，哪儿该闭眼。\n这一趟渡你，也是渡我自己。三百年了，船钱我早收够了，就差一个敢上船的活人。' },
    { t: 'choice', text: '三百七十一只空碗在船头列成雁阵。这一夜的酒，怎么倒？', options: [
      { text: '与他碰碗，把三碗酒倒进河里敬渡', value: 'a' },
      { text: '问那三百多个无名者，他是否还记得他们的模样', value: 'b' },
      { text: '撒一抔陈拾坟头的土进渡口——「故人也到。」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { KarmaSys.addFortune(3); return ['酒入河，水面荡开三圈涟漪，一圈追着一圈。他眯眼听了半晌，咧嘴一笑：\n「都应了。开船有底了。」（气运 +3）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['他一个名字一个名字地讲：扎红头巾的伙夫、爱唱曲的二师兄、总赊账的渔家女……讲到天亮，一个没落。\n「你看，我哪是疯。我是怕忘了。」（感悟 +3）']; }
      if (v === 'c') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['土入水中，他愣了愣，忽然朝上游方向端起碗：「药堂的老伙计？\n好啊——三百年了，可算凑齐一船人。」（气运 +2，感悟 +1）']; }
    } },
    { t: 'narr', text: '天将亮，他躺在船头，酒葫芦抱在怀里，像抱着一个孩子。\n「等着」变成了「来了」。\n河水拍岸，一声一声，像谁在答「到」。' },
  ] },

/* ============ 个人线 · 燕回时（归雁不归） ============ */
pl_n24_a1: { id: 'pl_n24_a1', title: '归雁不归 · 第一幕 · 路见不平', scenes: [
    { t: 'narr', text: '官道，尘起。\n七八个蒙面贼围住一支药商车队，为首的刀已架上老车夫的脖子。一道剑光先声而至，落点利落，正像一只收不住翅的雁。' },
    { t: 'dialog', who: '@c_n24', title: '归雁剑侠', text: '刀放下。药是救命的东西，刀是杀人的东西——两样搁一块儿，脏。\n燕回时剑尖挑着贼首的刀背，声音不高，字字钉地。贼散。' },
    { t: 'dialog', who: '@c_n24', title: '归雁剑侠', text: '药商跪谢，他摆手摆得极快：「起来，别跪——跪惯了，腰就直不起来了。」\n他转头看你，眼睛很亮，「这位道友拔剑的时机比我准。搭伙走一段？路还长，贼更多。」' },
    { t: 'choice', text: '药商捧着谢礼不敢起身。这一段路，怎么个搭伙法？', options: [
      { text: '收下谢礼，并辔同行，顺路护商', value: 'a' },
      { text: '与他印证剑法——他的剑「不肯落地」，有破绽', value: 'b' },
      { text: '劝药商把谢礼换成伤药，分给沿途村落', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 2); Bag.addStones(100); return ['药商千恩万谢地留下谢礼。他掂了掂，分你一半：「该拿的拿，别矫情。\n侠不是穷字写出来的。」（感悟 +2，灵石 +100）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['三招过后他收剑，认真拱手：「雁不能总飞——总有一落。这一落，我欠你。\n你这一指，比我师父教得直。」（感悟 +4）']; }
      if (v === 'c') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['伤药一路发下去，他看着村子里的娃分药，忽然道：「这法子好。\n刀救得了一时，药救得了一路。」（感悟 +3）']; }
    } },
    { t: 'narr', text: '暮色里赶路，雁阵过顶。\n他仰头看了很久，忽然没头没尾地说了一句：\n「年年雁归。」\n你没接话。有些话，接了就断了。' },
  ] },
pl_n24_a2: { id: 'pl_n24_a2', title: '归雁不归 · 第二幕 · 归乡之忌', scenes: [
    { t: 'narr', text: '篝火，夜。\n他磨剑磨得比平时慢。火星溅在手背上也不躲。火光里他忽然开口，声音像从很远的地方过来。' },
    { t: 'dialog', who: '@c_n24', title: '归雁剑侠', text: '我的故乡在血河故道边上，一个打鱼的小村。三百年前那一夜，河上来了船，村里人提着灯去看热闹。\n一夜之间，全村七十四口，灯灭了个干净。我是唯一活下来的——因为那天我发高烧，被我娘塞进了地窖。' },
    { t: 'dialog', who: '@c_n24', title: '归雁剑侠', text: '后来我入江湖，学剑，行侠。行侠这三百年，我哪儿都去，就是不回村。\n你问忌什么？忌那晚的灯。我怕我提着灯回去，跟当年一样——招来的，又是船。' },
    { t: 'choice', text: '火堆塌了一角，溅起几点红。这个忌，怎么破？', options: [
      { text: '「灯不会招船。会招船的，是船上的东西没死透。」', value: 'a' },
      { text: '「七十四个名字，你记得几个？都替他们记着吧。」', value: 'b' },
      { text: '把陈拾的故事讲给他听——两个活口，一场夜', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 4); return ['他霍然抬头：「……对。船是死的，船上的东西才是活的。\n我躲的从来不是村，是它。那就更该回去——把它的根看清楚。」（感悟 +4）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['他沉默了很久，一个名字一个名字往外报，报得极慢，一个没错。\n「七十四个。都在。」他合上手，「好——都还在。」（感悟 +3）']; }
      if (v === 'c') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['陈拾守了三百年的玉，他听了整整一夜。天亮时他说：「两个活口，两盏灯。\n你替你的守了三百年——我也该提灯回去了。」（气运 +2，感悟 +1）']; }
    } },
    { t: 'narr', text: '火快熄时，他从怀里摸出一枚磨得发亮的旧铜钱——村口老桥的桥心钱。\n「村没了，钱还在。\n带它走了三百年江湖——就当，替全村看的世道。」' },
  ] },
pl_n24_a3: { id: 'pl_n24_a3', title: '归雁不归 · 第三幕 · 雁回之时', scenes: [
    { t: 'narr', text: '秋深，雁阵北去。\n他在崖头站了一炷香，回身把剑重新绑上背——这一次，剑尖朝前。' },
    { t: 'dialog', who: '@c_n24', title: '归雁剑侠', text: '你去血河故道，我同去。\n不是为你——是为那一夜。三百年了，雁年年归，我年年不归。今年再不回，村里那七十四盏灯，就真的没人点了。' },
    { t: 'dialog', who: '@c_n24', title: '归雁剑侠', text: '到了村口，别拦我。我要亲手把桥心钱放回桥洞，再一盏一盏，替他们把灯点完。\n点完灯，再跟你下水。雁回之时，正好是决战那天——你信不信，雁都算好了。' },
    { t: 'choice', text: '雁阵掠过头顶，一声追着一声。你如何应他这趟归途？', options: [
      { text: '「我信。雁比人守时。」', value: 'a' },
      { text: '「点灯我帮你。七十四盏，一人一半。」', value: 'b' },
      { text: '「灯点完，河也就该清了。」', value: 'c' },
    ], pick: (v) => {
      const p = Game.player;
      if (v === 'a') { p.insight = Math.min(100, (p.insight || 0) + 1); KarmaSys.addFortune(2); return ['他大笑出声，笑声惊起满崖宿鸟：「好一句雁比人守时！\n——兄弟，就冲这句，这条命我记你账上了。」（气运 +2，感悟 +1）']; }
      if (v === 'b') { p.insight = Math.min(100, (p.insight || 0) + 3); return ['他别过脸去，好一会儿才瓮声瓮气地说：「……行。你点双数。\n三百年了，头一回有人肯跟我分这活。」（感悟 +3）']; }
      p.insight = Math.min(100, (p.insight || 0) + 4); return ['他望向故道的方向，重重点头：「灯点完，河清了，船也就白了。\n白船渡人，不渡刀。」（感悟 +4）'];
    } },
    { t: 'narr', text: '起风了，雁鸣掠过头顶，一声追着一声。\n他仰头笑骂：「催什么，这就走！」\n这一次，雁阵往南，他也往南。\n归雁——归人。' },
  ] },
  },

  /* ======================================================================
   * v5 沉浸感扩展：职业专属叙事 / 境界突破演出 / 坊市行情
   * ====================================================================== */

  /* ---------- 各大境界突破专属描写（破入该境时渐显，20~30字） ---------- */
  REALM_ASCEND_TEXT: {
    1: '凡胎浊气尽数褪去，灵台如洗，月白风清——自此，方算踏入道门。',
    2: '丹田中一声轻鸣，金丹初成，光华内蕴。从此我命由我，不问天时。',
    3: '金丹碎而元婴生，识海之中另有一个小小的你，睁眼坐起。',
    4: '元婴化神，神游万里不过一念。旧日天地，如今只是一方庭院。',
    5: '神魂炼入虚空，与天地灵机同呼吸。风起于青萍之末，你先知。',
    6: '神与身合，道与法合。一念既动，山河变色，草木俯首。',
    7: '大道三千，你已阅尽大半。回望来路，仙门只剩最后一线。',
    8: '劫云压城城欲摧。此关一过，人间再无可拦你之人。',
    9: '霞光贯体，仙音绕梁。凡人之躯，终成不朽——恭喜道友。',
  },
  /** 破入各境的异象光色（宣纸亮色主题：采用可在浅底上清晰呈现的深色调）
   *  练气灰 / 筑基翠 / 金丹金 / 元婴紫 / 化神蓝 / 炼虚青 / 合体霓 / 大乘橙 / 渡劫靛 / 真仙赤金 */
  REALM_AURA: ['#5a6472', '#2f9e77', '#a8862a', '#7c5cb0', '#2f6fce', '#22808a', '#a04ab0', '#c26a2e', '#5a6ac7', '#9a742e'],
  /** v10 境界特性：每个大境界的独有机制优势（按境界累积生效，效果散接于各系统钩子） */
  REALM_TRAITS: [
    { name: '胎息', desc: '打坐调息时气机自转，额外化解五点丹毒。' },
    { name: '灵压', desc: '金丹未成气先凝——战斗开场，灵压压制敌方一成攻防。' },
    { name: '金丹护体', desc: '金丹悬于气海：单次所受伤害超过三成气血上限时，减免两成。' },
    { name: '元婴代死', desc: '元婴藏于识海：每场战斗首次致命伤由元婴代受，保留两成五气血。' },
    { name: '神识', desc: '神游万里先知先觉：历练遇敌五成先手，陷阱伤害减半。' },
    { name: '合道', desc: '炼虚合道，百垢自消：丹毒消退加倍，丹毒上限 +20。' },
    { name: '法相', desc: '法相天地随行：普攻时两成几率引动法相，追加五成攻击的一击。' },
    { name: '万法归宗', desc: '大道阅尽，触类旁通：功法参悟所得感悟翻倍。' },
    { name: '劫体', desc: '半身已在雷海：天劫成算 +8%，渡劫失利保留九成修为。' },
    { name: '仙眷', desc: '仙人抚顶结发受长生：每日一签必得上签及以上。' },
  ],
  /** v10 职业道境：六道各自的六重境界（筑基/金丹/化神/合体/渡劫/真仙解锁），特性与职业完全匹配 */
  /* ---------- v16 职业道境（独立晋升体系） ----------
   * 道境不再随修为境界自动解锁——每重有专属【道境经验】阈值（need），
   * 由职业专属行为积累（战斗/炼丹/画符/受击/布阵/吞噬……），经验满即晋一重。
   * realm 字段仅作老档迁移折算参考，晋升判定不再使用。 */
  DAO_TIERS: {
    sword: { name: '剑心六境', expName: '剑意', expDesc: '出剑、会心、斩将皆可淬炼剑意。', tiers: [
      { realm: 1, need: 100,   name: '剑气境', desc: '出剑已含剑气：普攻一成五几率引剑气余韵，追加三成伤害。' },
      { realm: 2, need: 300,   name: '剑芒境', desc: '剑锋淬芒：普攻暴击伤害 +20%。' },
      { realm: 4, need: 800,   name: '剑心通明境', desc: '心镜无尘：【剑心通明】触发率提升至三成。' },
      { realm: 6, need: 2000,  name: '剑域境', desc: '剑气成域：战斗开场，剑域再削敌方一成攻防。' },
      { realm: 8, need: 5000,  name: '万剑归宗境', desc: '万剑随心动：法诀伤害 +25%。' },
      { realm: 9, need: 12000, name: '剑仙境', desc: '剑随心动，无迹可寻：普攻必中。' },
    ] },
    pill: { name: '丹道六境', expName: '丹火', expDesc: '开炉炼丹、服丹悟道皆可积攒丹火。', tiers: [
      { realm: 1, need: 100,   name: '闻香境', desc: '一嗅便知火候：炼丹成丹率 +10%。' },
      { realm: 2, need: 300,   name: '药理境', desc: '深谙药性：丹药出售价再加两成五。' },
      { realm: 4, need: 800,   name: '丹火境', desc: '丹火纯青：服丹所得丹毒减轻三成。' },
      { realm: 6, need: 2000,  name: '炉火纯青境', desc: '炉候通神：炼丹暴击率提升至一成五。' },
      { realm: 8, need: 5000,  name: '金丹境', desc: '掌中自有乾坤：丹药效果额外 +30%。' },
      { realm: 9, need: 12000, name: '太上境', desc: '太上丹诀：成丹率保底四成。' },
    ] },
    talisman: { name: '符道六境', expName: '符道', expDesc: '挥毫画符、祭符伤敌皆可积攒符道。', tiers: [
      { realm: 1, need: 100,   name: '描符境', desc: '笔下生熟：画符产量 +1。' },
      { realm: 2, need: 300,   name: '朱砂境', desc: '朱砂通灵：笔下生花（产量翻倍）几率提至两成。' },
      { realm: 4, need: 800,   name: '雷笔境', desc: '雷笔如龙：符箓伤害 +30%。' },
      { realm: 6, need: 2000,  name: '追雷境', desc: '符落雷随：祭符后三成几率引动追雷（两成攻击伤害）。' },
      { realm: 8, need: 5000,  name: '言出法随境', desc: '符由心生：战斗祭符三成五几率不消耗。' },
      { realm: 9, need: 12000, name: '符仙境', desc: '一笔开雷门：画符产量再 +2，紫雷符几率提至五成。' },
    ] },
    body: { name: '般若六境', expName: '体魄', expDesc: '受击、格挡、硬抗皆可淬炼体魄。', tiers: [
      { realm: 1, need: 100,   name: '铜皮境', desc: '皮糙肉厚：所受伤害 -8%。' },
      { realm: 2, need: 300,   name: '炼脏境', desc: '五脏如炉：气血上限 +10%。' },
      { realm: 4, need: 800,   name: '铁骨境', desc: '骨如琉璃：格挡率 +10%。' },
      { realm: 6, need: 2000,  name: '易筋境', desc: '筋长力沉：普攻伤害 +10%。' },
      { realm: 8, need: 5000,  name: '金刚境', desc: '金刚不坏：普攻附带两成吸血。' },
      { realm: 9, need: 12000, name: '不灭境', desc: '生生不息：战斗中每次行动回复 3% 气血。' },
    ] },
    array: { name: '阵道六境', expName: '阵道', expDesc: '布阵、探秘、修炼皆可积攒阵道。', tiers: [
      { realm: 1, need: 100,   name: '布阵境', desc: '阵旗在手：抢先布阵几率提至五成。' },
      { realm: 2, need: 300,   name: '聚灵境', desc: '阵中聚灵：修炼效率 +10%。' },
      { realm: 4, need: 800,   name: '困阵境', desc: '困龙锁天：布阵压制提至四成攻防。' },
      { realm: 6, need: 2000,  name: '迷踪境', desc: '阵影迷踪：战斗闪避 +8%。' },
      { realm: 8, need: 5000,  name: '杀阵境', desc: '杀阵先成：战斗开场两成几率直接困杀（压制四成攻防）。' },
      { realm: 9, need: 12000, name: '天罗境', desc: '天罗地网：杀阵几率提至三成五，布阵压制提至五成。' },
    ] },
    demonic: { name: '魔道六境', expName: '魔性', expDesc: '吞噬精元、杀戮、孽障缠身皆可积攒魔性。', tiers: [
      { realm: 1, need: 100,   name: '血煞境', desc: '吞噬更炽：击杀汲取修为提至三成。' },
      { realm: 2, need: 300,   name: '炼髓境', desc: '髓中藏煞：普攻附带一成吸血。' },
      { realm: 4, need: 800,   name: '化功境', desc: '化功大法：修炼速度额外 +20%。' },
      { realm: 6, need: 2000,  name: '慑魂境', desc: '魂为之慑：战斗开场，敌方暴击率减半。' },
      { realm: 8, need: 5000,  name: '魔君境', desc: '魔君之威：战斗胜利劫掠灵石 +50%。' },
      { realm: 9, need: 12000, name: '魔尊境', desc: '予取予求：战斗胜利两成几率夺其天材地宝。' },
    ] },

  },
  /** 渡劫失败异象文案 */
  REALM_FAIL_TEXT: [
    '劫雷轰顶，道基震裂。你呕血跌坐尘埃——仙门，又远了一步。',
    '九霄雷光尽数落在你身，你咬牙撑住，终究没能踏过那道门。',
    '天劫未过，道心受挫。雷云散尽时，你久久望着天空，不语。',
  ],

  /* ---------- 六道专属叙事（历练 / 战斗 / 突破 / 待人，皆随性情而异） ---------- */
  DAO_FLAVOR: {
    sword: {
      treasure: ['你懒得细看，一剑挑开箱盖，剑气不沾纤尘。', '你按剑环顾四野，确认无伏，才俯身开箱。'],
      fortune: ['你眸光一凝——此地灵机异动，藏不得拙。', '你一剑劈开雾障，机缘深处别有洞天。'],
      trap: ['禁制乍起，你拔剑后撤，剑光如水护住周身。', '你冷哼一声，一剑劈碎灵光，仍被余波扫中。'],
      attack: ['你一剑递出，简洁而致命', '你手腕一抖，剑尖直取要害', '你踏前半步，一剑刺出'],
      victory: ['剑归鞘，血未冷。你收势而立，如常事一桩。', '一剑了结。你拭去剑上血痕，转身便走。'],
      defeat: ['你被一脚踏翻，泥血满襟——此辱，剑替你记下了。', '剑折人伤。你咬牙撑地，眸中戾意更甚。'],
      tribSuccess: ['你负手立于劫风中央，一剑破开雷海，衣袂无伤。', '万雷加身，你以剑意硬撼，眉睫未动分毫。'],
      tribFail: ['雷光洞穿肩甲，你单膝砸地，剑拄尘土——未过。', '你吐血仰天，剑鸣如泣。仙门又远了一步。'],
      greet: '你按剑一礼，只字不多言',
      observe: ['你目光一扫，已将此人根底看了三分。', '你抱剑立于道旁，静观其变。'],
      dilemma: { help: '仗剑相助（气运↑，有所损耗）', rob: '剑抵其喉，夺其财货（孽障↑，有所进账）', ignore: '冷眼旁观（一身轻）' },
    },
    pill: {
      treasure: ['你先嗅了嗅箱缝里透出的药气，才不紧不慢地开箱。', '你拂去箱上尘土，口中喃喃估量着里头物件的价值。'],
      fortune: ['你驻足细感，此地灵机如丹火温养，正合打坐。', '你不急不缓，先辨清灵机脉络，再图造化。'],
      trap: ['禁制轰然而起，你旋即封住周身大穴，仍中了一着。', '你暗叫不妙，护体真元仓促凝聚，终究慢了半分。'],
      attack: ['你袖袍一拂，一缕掌力按出', '你不慌不忙，一掌拍出', '你屈指一弹，药劲激射'],
      victory: ['你收了余劲，自袖中摸出一枚丹药服下，平复气血。', '胜而不骄。你掸掸衣袖，只当炼了一味活药。'],
      defeat: ['你踉跄跌坐，先摸出的却是伤药——命要紧，脸面次之。', '你咳出一口血沫，苦笑：这一炉，火候终究差了。'],
      tribSuccess: ['你于雷火中安坐如炉，以身为鼎，将天劫炼作一味药引。', '丹火不熄，道心不乱。你迎着雷光，缓缓吐出一口浊气。'],
      tribFail: ['雷火入体如药力反冲，你盘膝压了三次，才将翻腾气血镇住。', '你默然调息良久，袖中双手仍在微颤——差之毫厘。'],
      greet: '你拱手温言，礼数周全',
      observe: ['你垂目养神，暗自揣度对方来意。', '你捻着袖中一粒丹丸，静静打量。'],
      dilemma: { help: '施药救人（气运↑，有所损耗）', rob: '取其钱袋抵药钱（孽障↑，有所进账）', ignore: '默默绕行（一身轻）' },
    },
    talisman: {
      treasure: ['你指尖符光微亮——箱上并无禁制封条，这才安心开启。', '你以朱砂在手心画了个探物诀，才伸手入箱。'],
      fortune: ['你掐指一算，此地机缘方位竟与卦象相合。', '你眉心微动，识海里符箓轻颤——有造化。'],
      trap: ['禁制暴起，你急掷一张护身符，符光碎而余威仍至。', '你暗骂一声拙笔——早该看出这禁制纹路的破绽。'],
      attack: ['你并指如笔，灵力成线激射', '你掷出一张符光，轰然炸开', '你指尖勾画，一道符罡破空'],
      victory: ['你俯身拾起符灰，吹了吹，收势自若。', '符光散尽。你捻碎残符，转身离去。'],
      defeat: ['符纸散落一地，如雪纷飞——你被逼到了绝地。', '背后符箓尽数燃尽，你狼狈滚出丈外。'],
      tribSuccess: ['你以周身为纸、雷光为墨，生生平掉了一场天劫。', '符罡层层亮起，你于雷海中央稳如泰山。'],
      tribFail: ['护身符尽数炸成飞灰，你口噙血沫，眼底朱砂犹亮。', '雷符燃到第三十七张，终于没能续上。'],
      greet: '你袖手一礼，指尖符光微闪',
      observe: ['你眼睫低垂，指尖已在袖中勾好符纹。', '你细细端详对方气机流转，如读一篇符文。'],
      dilemma: { help: '画符换钱相赠（气运↑，有所损耗）', rob: '符封其穴，取其财物（孽障↑，有所进账）', ignore: '袖手而去（一身轻）' },
    },
    body: {
      treasure: ['你一拳砸开箱盖，锁扣四溅——痛快。', '你蹲下身子，一把将储物箱整个掀翻。'],
      fortune: ['你鼻翼一动，嗅到极浓的灵气——好东西！', '你咧嘴一笑，加快脚步撞进雾里。'],
      trap: ['禁制炸开，你硬挨了一记，只当挠痒——仍见了血。', '你双臂护头硬冲过去，肩背火辣辣一片。'],
      attack: ['你一拳轰出，拳风猎猎', '你抡起蒲扇大掌拍落', '你身形前撞，肩如攻锤'],
      victory: ['你甩了甩拳上的血，只觉筋骨又畅快三分。', '打赢了，比什么都滋补。你咧嘴大笑。'],
      defeat: ['你仰面砸在地上，砸出个坑——半晌，骂骂咧咧爬起来。', '这一拳把你打醒了：光皮糙，还不够。'],
      tribSuccess: ['你张开双臂迎着天劫硬撼，雷火在皮膜上炸出金纹——痛快！', '万钧雷威当头砸落，你如山岳不动，硬生生扛了过去。'],
      tribFail: ['你被砸进地里三尺，爬出来时浑身是血，咬着牙不肯躺下。', '雷劲透体，你双膝深陷——骨头在响，道心没响。'],
      greet: '你抱拳如锤，声若洪钟',
      observe: ['你上下打量对方，鼻孔微微一哼。', '你活动了下手腕，斜眼瞧他。'],
      dilemma: { help: '一把背走伤者（气运↑，有所损耗）', rob: '一拳撂倒，抢了就跑（孽障↑，有所进账）', ignore: '扭头就走（一身轻）' },
    },
    array: {
      treasure: ['你踏罡步斗，绕箱三匝破了暗障，方才坦然取物。', '你指尖在虚空画了个探字阵，箱中之物纤毫毕现。'],
      fortune: ['此地灵机自成阵势——你眼里哪是机缘，分明是一座活阵。', '你以足尖在地上勾画片刻，笑意渐深：阵眼在此。'],
      trap: ['禁制是个残阵，你将错就错改了两笔阵纹，仍被反噬一缕。', '你布下三面小旗阻住杀机，衣角还是被燎去一片。'],
      attack: ['你袖中飞出阵纹，绞向对方', '你足踏罡步，引动地气冲撞', '你并指引阵，灵机如索缠至'],
      victory: ['你收起四面小旗，拂去袍上尘土，若无事发生。', '阵收人倒。你环顾四周，顺手把痕迹也抹了。'],
      defeat: ['阵脚被人硬生生踏碎，你气血翻涌，倒退七步。', '你苦笑——算尽天机，没算到自己挨这一下。'],
      tribSuccess: ['你以天地为盘、雷光为子，落下一枚活子——满盘皆活。', '九重劫阵尽数推演，你于生门之中缓步而出。'],
      tribFail: ['劫阵变化超出推演，你咳血按住紊乱气机——差一子。', '棋差一着。你望着劫云散处，眸光幽深。'],
      greet: '你掐指一礼，不语先笑',
      observe: ['你心中默推对方来路，七八分已了然。', '你蹲身在地上画了半刻阵图，才起身。'],
      dilemma: { help: '布阵护其周全（气运↑，有所损耗）', rob: '以困阵锁人取财（孽障↑，有所进账）', ignore: '转身离阵（一身轻）' },
    },
    demonic: {
      treasure: ['你一脚踹开箱子，笑声刺耳——天予不取，反受其咎！', '你掀开箱盖，指尖发烫：都是好东西。'],
      fortune: ['你嗅到灵机深处的血腥气——有人在这儿栽过跟头。妙。', '你舔了舔嘴唇，一头扎进这片造化里。'],
      trap: ['禁制咬住你半边身子，你非但不退，反而笑出了声。', '剧痛入骨，你眼底的戾气反倒烧得更旺。'],
      attack: ['你五指成爪，黑气缠绕抓落', '你怪笑着欺身而上', '你周身血气翻涌，一爪撕出'],
      victory: ['你舔去指尖的血，笑意乖张——还不够。', '你踏着对方的影子离开，哼着不成调的曲子。'],
      defeat: ['你趴在血泊里笑出了声——疼，才记得住。', '你抹了把脸上的血，眼底凶光更炽：这笔账，记下了。'],
      tribSuccess: ['你张开双臂拥抱雷劫，放声大笑——天道，也不过如此！', '雷霆淬邪躯，你于雷火中仰天长啸，声震四野。'],
      tribFail: ['你被雷光钉在地上，仍梗着脖子笑：来日，再来。', '邪躯焦黑，你以血补气，怨毒几乎凝成实质。'],
      greet: '你懒懒抬眼，笑意不达眼底',
      observe: ['你歪着头打量对方，像在打量一件货物。', '你指尖绕着一缕黑气，似笑非笑。'],
      dilemma: { help: '假意施恩，图个后报（气运↑，有所损耗）', rob: '乘乱夺宝，正合我意（孽障↑，有所进账）', ignore: '懒得理会（一身轻）' },
    },
  },
};
