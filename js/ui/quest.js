
/* ======================================================================
 * §15.5 v11 剧情 · 问道九章 QuestSys（主线 + 奇遇录支线）
 * 主线：九章剧情随修为推进，每章开篇叙事 + 阶段目标 + 章末奖励；
 * 支线：奇遇录五则，达到境界解锁，达成后结案领赏。
 * 全部目标挂靠既有玩法行为，不新增玩法负担。
 * ====================================================================== */
const QuestSys = {
  checking: false,
  CN9: ['一', '二', '三', '四', '五', '六', '七', '八', '九'],
  /** 主线九章（supR：境界领先到该大境界时，本章目标自动追认完成——中期入坑亦可补剧情） */
  CHAPTERS: [
    {
      id: 'c1', title: '尘缘', supR: 2,
      story: '你上山采药归来，村中纸钱飞扬——相熟的采药老人殁了。\n临终前老人攥着你的手，往你掌心塞了半枚温润古玉：「孩子……老朽本非凡人……这残玉，是血河宗的信物……替我……查清当年的灭门血案……」\n言未尽，人已逝。你葬了老人，将残玉贴身收好——修行之路，自此多了一个执念。',
      goal: '采药老人临终托付半枚血河宗残玉，嘱你查明灭门血案。先打好根基，再入江湖。',
      steps: [
        { desc: '根基初固（修为至练气中期）', done: p => p.realmIdx >= 1 || p.layer >= 1, prog: p => `${Math.min(1, p.realmIdx >= 1 ? 1 : p.layer)}/1` },
        { desc: '尘世历练（新手村·后山探索五次）', done: p => ((p.counters.mapExplores || {}).village || 0) >= 5, prog: p => `${Math.min(5, (p.counters.mapExplores || {}).village || 0)}/5` },
        { desc: '除魔自保（累计击败妖兽三头）', done: p => (p.counters.wins || 0) >= 3, prog: p => `${Math.min(3, p.counters.wins || 0)}/3` },
      ],
      ending: '三月苦修，你根基渐固。残玉在你气海中隐隐发烫——老人所说的血案，或许就藏在前方的山水之间。',
      reward: { stones: 300, fortune: 2, items: { pill_juqi: 2 } },
    },
    {
      id: 'c2', title: '青峰疑云', supR: 2,
      story: '残玉入夜生温。你循着感应来到青峰山——山坳深处，黑风寨的人马竟在夜里挖掘一座上古遗迹，为首之人一袭黑袍，手腕上赫然刺着与残玉同源的赤色河纹。\n你屏息记下一切，悄然而退。回到村中，你彻夜难眠：血河宗三百年前不是被灭门了么？这些人在挖什么？',
      goal: '残玉引你至青峰山，黑风寨背后的黑袍人腕刺河纹——偷袭遗迹之事，须从长计议。',
      steps: [
        { desc: '探查青峰山（青峰山探索三次）', done: p => ((p.counters.mapExplores || {}).qingfeng || 0) >= 3, prog: p => `${Math.min(3, (p.counters.mapExplores || {}).qingfeng || 0)}/3` },
        { desc: '剿灭贼党（累计获胜八场）', done: p => (p.counters.wins || 0) >= 8, prog: p => `${Math.min(8, p.counters.wins || 0)}/8` },
        { desc: '修至练气圆满', done: p => p.realmIdx >= 1 || p.layer >= 3, prog: p => p.realmIdx >= 1 ? '1/1' : `${p.layer}/3` },
      ],
      ending: '练气圆满之夜，残玉微鸣。你听见了遗迹深处传来的低语——那不是妖物，是人。血案的门，开了一道缝。',
      reward: { stones: 800, items: { pill_ningqi: 2 } },
    },
    {
      id: 'c3', title: '筑基风云', supR: 3,
      story: '你突破筑基那夜，残玉裂开一道细纹，露出内里一行小字：「血河不灭，此玉不宁。」\n坊市酒肆间，你终于听到一个完整的名字——血河宗，三百年前被正道围灭的魔宗。而当年主持围杀的，竟是如今某位德高望重的太上长老。\n欲查血案，须入宗门。你决定择一宗门栖身，借其藏书与耳目。',
      goal: '筑基之夜残玉显字。入宗门、修功法，借宗门之势追查血河宗旧案。',
      steps: [
        { desc: '突破至筑基期', done: p => p.realmIdx >= 1, prog: p => `${p.realmIdx >= 1 ? 1 : 0}/1` },
        { desc: '拜入一座宗门', done: p => !!p.sect, prog: p => `${p.sect ? 1 : 0}/1` },
        { desc: '修习第一部功法', done: p => (p.counters.learns || 0) >= 1, prog: p => `${Math.min(1, p.counters.learns || 0)}/1` },
      ],
      ending: '宗门典籍浩如烟海。你在故纸堆中翻到一页残卷：「血河宗主练万魂丹，以生魂饲之……」字迹至此被血渍浸透。你握紧残玉——路还很长。',
      reward: { stones: 2000, items: { pill_zhuji: 1 } },
    },
    {
      id: 'c4', title: '红尘炼心', supR: 3,
      story: '宗门长老见你勤勉，私下透露：当年围杀血河宗的密令，出自一封无落款的黑玉令。而黑玉令的主人，如今仍在暗处。\n长老劝你：此事牵扯甚广，先炼心，后问案。你走入红尘——恩怨、善恶、抉择，皆是修行。',
      goal: '黑玉令主仍在暗处。长老劝你先炼心后问案——红尘劫、江湖义，皆是道途。',
      steps: [
        { desc: '广结善缘（结交一位江湖修士）', done: p => (p.counters.befriends || 0) >= 1, prog: p => `${Math.min(1, p.counters.befriends || 0)}/1` },
        { desc: '红尘一念（经历一次红尘劫抉择）', done: p => (p.counters.dilemmas || 0) >= 1, prog: p => `${Math.min(1, p.counters.dilemmas || 0)}/1` },
        { desc: '百战炼心（累计获胜二十场）', done: p => (p.counters.wins || 0) >= 20, prog: p => `${Math.min(20, p.counters.wins || 0)}/20` },
      ],
      ending: '红尘一遭，你见过跪地求饶的劫匪，也见过袖手旁观的仙师。善恶从来不在门派，而在人心。你摸了摸残玉——血河宗之事，你更想查明白了。',
      reward: { stones: 5000, fortune: 10 },
    },
    {
      id: 'c5', title: '金丹之秘', supR: 4,
      story: '金丹天劫的雷光中，残玉骤然炸响！一段不属于自己的记忆涌入识海——\n你看见你的前世：一袭黑袍，腕刺河纹，正是血河宗首席。你不忍万魂丹以千魂炼就，背叛宗门；宗主一掌将你打下诛仙台，临死前你以秘法将一缕真灵封入残玉……\n如今，它找回了你。',
      goal: '金丹劫中前世记忆苏醒——你竟是血河宗叛徒转世。丹道试炼，重拾旧我。',
      steps: [
        { desc: '成功突破金丹期', done: p => p.realmIdx >= 2, prog: p => `${p.realmIdx >= 2 ? 1 : 0}/1` },
        { desc: '丹道初窥（炼丹成丹或服丹，累计三次）', done: p => ((p.counters.craftsOk || 0) + (p.counters.pills || 0)) >= 3, prog: p => `${Math.min(3, (p.counters.craftsOk || 0) + (p.counters.pills || 0))}/3` },
        { desc: '挫敌扬威（累计击败精英妖兽两头）', done: p => (p.counters.killsElite || 0) >= 2, prog: p => `${Math.min(2, p.counters.killsElite || 0)}/2` },
      ],
      ending: '记忆归位，你对宗主的恨意有了温度——那是前世未尽的执念。残玉中除了记忆，还藏着一卷《血河真解》的目录：其本体，就在宗主手中。',
      reward: { stones: 10000, items: { pill_pojing: 1 } },
    },
    {
      id: 'c6', title: '元婴杀局', supR: 5,
      story: '元婴初成，神识大涨的当夜，你感应到三道杀意掠过天际——血河宗主的分身，循着残玉的气息来了。\n正面相抗必死无疑。你想起典籍记载：上古法宝，克魔魂。集齐碎片，或有一线生机。',
      goal: '宗主分身循残玉之气追杀而至。深入秘境、汇聚上古碎片，铸克制之力。',
      steps: [
        { desc: '成功突破元婴期', done: p => p.realmIdx >= 3, prog: p => `${p.realmIdx >= 3 ? 1 : 0}/1` },
        { desc: '秘境探幽（秘境抵达第三层）', done: p => (p.counters.maxDepth || 0) >= 3, prog: p => `${Math.min(3, p.counters.maxDepth || 0)}/3` },
        { desc: '碎片聚势（累计收取上古法宝碎片五枚）', done: p => (p.counters.gupianGot || 0) >= 5, prog: p => `${Math.min(5, p.counters.gupianGot || 0)}/5` },
      ],
      ending: '五枚碎片在你掌心嗡鸣，与体内残玉遥相呼应。分身的杀意暂时退去——它在等，等宗主本尊出关。你也在等，等自己足够强。',
      reward: { stones: 20000, items: { m_gupian: 2 } },
    },
    {
      id: 'c7', title: '血河旧账', supR: 6,
      story: '化神之后，你的名字开始在各宗长老间流传。这日，一位白须掌门亲自到访，开门见山：「三百年前灭血河宗那一战，老夫也被黑玉令牵着走。老朽时日无多——你若要查，老夫把当年的名字给你。」\n他留下一个名单。第一个名字，正是当世一位德高望重的太上长老。',
      goal: '化神成名，白须掌门递来当年围杀血河宗的名单——第一个名字位高权重。',
      steps: [
        { desc: '成功突破化神期', done: p => p.realmIdx >= 4, prog: p => `${p.realmIdx >= 4 ? 1 : 0}/1` },
        { desc: '精英授首（累计击败精英妖兽八头）', done: p => (p.counters.killsElite || 0) >= 8, prog: p => `${Math.min(8, p.counters.killsElite || 0)}/8` },
        { desc: '家底殷实（灵石积蓄十万）', done: p => (p.stones.low + p.stones.mid * 100 + p.stones.high * 10000) >= 100000, prog: p => `${Utils.fmtNum(Math.min(100000, p.stones.low + p.stones.mid * 100 + p.stones.high * 10000))}/10万` },
      ],
      ending: '名单在手，你反而冷静下来。棋盘比你想的大——但你已不是当年那个采药少年。金丹已固，化神已稳，接下来，该让某些人睡不着了。',
      reward: { stones: 50000, fortune: 5 },
    },
    {
      id: 'c8', title: '大乘问道', supR: 8,
      story: '大乘雷劫落定，你的道已近圆满。黑袍人的杀意越来越近，残玉彻夜长鸣。\n你深知：决战之前，当有亲友相依、大道相佐——孤身一人，挡不住三百年布局的仇家。',
      goal: '决战将临。觅相依之人、参大道之理，方有与宗主同台的资格。',
      steps: [
        { desc: '成功突破大乘期', done: p => p.realmIdx >= 7, prog: p => `${p.realmIdx >= 7 ? 1 : 0}/1` },
        { desc: '觅得相依之人（结为道侣或义结金兰）', done: p => !!p.partner || (p.sworn || []).length > 0, prog: p => `${(p.partner ? 1 : 0) + Math.min(1, (p.sworn || []).length)}/1` },
        { desc: '参悟小成（任意功法修至第三层）', done: p => Object.values(p.gongfa || {}).some(g => g.level >= 3), prog: p => { let mx = 0; for (const g of Object.values(p.gongfa || {})) mx = Math.max(mx, g.level); return `${Math.min(3, mx)}/3`; } },
      ],
      ending: '道友在侧，真意在胸。残玉忽然安静下来——它感应到了什么。决战之地，已被选定：你的飞升雷台。',
      reward: { stones: 100000, fortune: 10, items: { pill_taichu: 1 } },
    },
    {
      id: 'c9', title: '天劫决战', supR: 999,
      story: '渡劫雷云压顶之际，一道黑影踏雷而来——三百年前将你打下诛仙台的血河宗主，竟也踏入了这一方天地！\n他要在天劫中夺舍转世的你，炼成万魂丹最后的主魂。\n雷海之上，新旧两世，终须一战。',
      goal: '飞升雷台，即决战之地。渡劫、斩敌、飞升——三百年恩怨，雷海了结。',
      steps: [
        { desc: '成功突破渡劫期', done: p => p.realmIdx >= 8, prog: p => `${p.realmIdx >= 8 ? 1 : 0}/1` },
        { desc: '精英十授首（累计击败精英妖兽十五头）', done: p => (p.counters.killsElite || 0) >= 15, prog: p => `${Math.min(15, p.counters.killsElite || 0)}/15` },
        { desc: '白日飞升（于天劫中了断三百年因果）', done: p => !!(p.flags || {}).ascended, prog: p => `${(p.flags || {}).ascended ? 1 : 0}/1` },
      ],
      ending: '第九道天雷落下时，你引动残玉中前世的全部血煞，与宗主的魔身同缚雷心。雷光吞没一切的刹那，你听见宗主的咆哮化作一声长叹：「三百年……原来输的是我心魔。」\n雷散，云开。残玉化入你的眉心，化作一点朱砂。你回首人间，白衣胜雪——仙门之后，另有一番天地。',
      reward: { stones: 200000, fortune: 20 },
    },
  ],
  /** 奇遇录 · 支线十二则（minRealm 解锁境界；v19 起含 NPC 绑定与任务链） */
  SIDES: [
    {
      id: 's1', title: '义庄尸变', minRealm: 0,
      story: '新手村义庄近来夜半有声，更夫不敢值夜。你自告奋勇守夜——子时刚过，棺木果然自己动了。',
      steps: [
        { desc: '村中历练（新手村·后山探索八次）', done: p => ((p.counters.mapExplores || {}).village || 0) >= 8 },
        { desc: '除祟安民（累计获胜六场）', done: p => (p.counters.wins || 0) >= 6 },
      ],
      ending: '尸变之源是一缕误入棺中的游魂。你以灵力超度，义庄重归安宁。村老千恩万谢，塞给你一包谢礼。',
      reward: { stones: 500, items: { pill_liaoshang: 3 } },
    },
    {
      id: 's2', title: '药翁遗方', minRealm: 1,
      story: '坊市后巷的药翁守着一座冷炉。他祖传的丹方在战乱中失了后半卷，他赌上余生想复刻出来，却屡炉屡败。他想借你的手，替他把这炉丹试完。',
      steps: [
        { desc: '妙手试炉（炼丹成功三次）', done: p => (p.counters.craftsOk || 0) >= 3 },
        { desc: '亲验药力（服丹两次）', done: p => (p.counters.pills || 0) >= 2 },
      ],
      ending: '第三炉开炉，丹香清正——丹方成了！药翁老泪纵横，将祖传的一枚洗髓丹赠你：「丹成之日，方知当年执念误我一生。小友，莫学老朽。」',
      reward: { items: { pill_xisui: 1 } },
    },
    {
      id: 's3', title: '剑冢遗鸣', minRealm: 2,
      story: '城外古剑冢夜夜剑鸣，樵夫说那是一位剑仙埋骨之地，剑意不散。你入冢探看，一柄断剑在你靠近时铮然出鞘半寸——它在等一个配得上它的人。',
      steps: [
        { desc: '力挫精英（累计击败精英妖兽四头）', done: p => (p.counters.killsElite || 0) >= 4 },
        { desc: '剑心可鉴（修习任意功法）', done: p => (p.counters.learns || 0) >= 1 },
      ],
      ending: '断剑认主，却又自行崩碎——原来它只借剑鸣传讯。冢中石壁留有一句刻字：「剑非杀人器，护道方为锋。」你恍然有所悟，一缕剑意入体。',
      reward: { stones: 8000, fortune: 5 },
    },
    {
      id: 's4', title: '万商护标', minRealm: 3,
      story: '万宝商会贴出悬赏：一队送往北域的宝镖，需要一位足以服众的高手押标。管事上下打量你：「行。但商会只认实力与信誉——家底与人心，你得让大伙服气。」',
      steps: [
        { desc: '家资巨万（灵石积蓄五万）', done: p => (p.stones.low + p.stones.mid * 100 + p.stones.high * 10000) >= 50000 },
        { desc: '江湖人脉（结交两位修士）', done: p => (p.counters.befriends || 0) >= 2 },
      ],
      ending: '宝镖一路平安。结算之日，管事奉上厚酬，并递给你一枚商会金纹：「北域之外还有南疆——来日商会开到南疆，还需道友这般人物。」',
      reward: { stones: 20000, fortune: 8 },
    },
    {
      id: 's5', title: '飞升遗诏', minRealm: 8,
      story: '集齐碎片的夜里，你梦见一位白衣仙人，他指着渡劫期的雷云对你说了四个字：「劫上有劫。」醒来时枕边多了一卷泛黄遗诏——落款处，竟是三百年前飞升的血河宗开派祖师。',
      steps: [
        { desc: '碎片归一（累计收取上古法宝碎片九枚）', done: p => (p.counters.gupianGot || 0) >= 9 },
        { desc: '突破渡劫期', done: p => p.realmIdx >= 8 },
      ],
      ending: '遗诏结尾写着：「吾宗堕魔，非吾本意。持此诏者，代吾清门户。」你将遗诏折好收入怀中——原来三百年前的因，早为今日的果埋好了线。',
      reward: { fortune: 15, items: { pill_xisui: 2 } },
    },
    /* ---- v19 支线扩充（NPC 绑定 + 任务链；npc：结案时关系 +8 并写入记忆） ---- */
    {
      id: 's6', title: '顽石之托', minRealm: 1, npc: 'n20',
      story: '磐岩谷长老石破天在坊市拦住你，一双铁掌捧着半块碎裂的阵盘：「谷中演武场地脉塌了，这是从底下挖出来的老物件——认得这纹路的人，方圆千里只有你一个。」',
      steps: [
        { desc: '力证实力（累计击败精英妖兽两头）', done: p => (p.counters.killsElite || 0) >= 2 },
        { desc: '踏勘地脉（妖兽森林探索三次）', done: p => ((p.counters.mapExplores || {}).forest || 0) >= 3 },
      ],
      ending: '你认出阵盘纹路出自上古困杀大阵的一角——与秘境碎片同源。石破天瞪大眼睛，半晌憋出一句：「俺就说没找错人！」',
      reward: { stones: 3000, items: { pill_tiegu: 2 } },
    },
    {
      id: 's7', title: '裂山失约', minRealm: 2, npc: 'n16', prev: 's6',
      story: '磐岩谷大弟子楚天阔失约了——约好同去勘矿的日子，他在矿洞口留下血书：谷中暗河之下，有「活物」咬断了锁链。石破天请你入谷一探。',
      steps: [
        { desc: '以武会友（与江湖修士切磋两次）', done: p => (p.counters.spars || 0) >= 2 },
        { desc: '备下盘缠（灵石积蓄两万）', done: p => QuestSys.stonesTotal(p) >= 20000 },
      ],
      ending: '暗河底的「活物」是一头失控的岩甲兽——当年困杀大阵崩了一角，镇在谷下的东西醒了。你与楚天阔联手将其重新镇回。他抱拳：「这条命，算你一半。」',
      reward: { stones: 8000, fortune: 4 },
    },
    {
      id: 's8', title: '磐岩之心', minRealm: 3, npc: 'n20', prev: 's7',
      story: '石破天破天荒地设了一桌酒席，请你坐上首：「谷中长老会决议——磐岩谷欠你一份大因果。谷库里有件老祖宗传下的东西，掌谷说，给能镇得住它的人。」',
      steps: [
        { desc: '深入秘境（秘境推进至第三层）', done: p => (p.counters.maxDepth || 0) >= 3 },
        { desc: '百战之资（累计获胜四十场）', done: p => (p.counters.wins || 0) >= 40 },
      ],
      ending: '谷库深处，一块温润的磐石在灵光中沉浮——「磐岩之心」，谷派开山时镇谷之物。石破天亲手为你系上：「往后磐岩谷的山门，永远为你开。」',
      reward: { stones: 15000, items: { m_gupian: 1 } },
    },
    {
      id: 's9', title: '烟雨追账', minRealm: 2, npc: 'n5',
      story: '烟雨楼主柳含烟隔着珠帘打量你：「黑风寨背后那本账，你也想知道吧？巧了——我也是。各出一半力，账查清了，五五分。」',
      steps: [
        { desc: '广布眼线（结交三位修士）', done: p => (p.counters.befriends || 0) >= 3 },
        { desc: '夜探匪巢（黑风寨探索五次）', done: p => ((p.counters.mapExplores || {}).heifeng || 0) >= 5 },
      ],
      ending: '账册合拢——黑风寨历年掘获，三成流向同一个匿名暗桩。柳含烟指尖敲着账册：「这条线，你捏着一半，我捏着一半。往后江湖上，你我算一伙的。」',
      reward: { stones: 12000, insight: 5 },
    },
    {
      id: 's10', title: '血罗刹的委托', minRealm: 3, npc: 'n22',
      story: '月下，红绡的身影从檐角落下来，红衣胜血：「听说你在查血河。巧了——我也有笔账要算。帮我把这批货截下来，你查你的，我拿我的。」',
      steps: [
        { desc: '斩草除根（累计击败精英妖兽六头）', done: p => (p.counters.killsElite || 0) >= 6 },
        { desc: '截获暗货（妖兽森林探索五次）', done: p => ((p.counters.mapExplores || {}).forest || 0) >= 5 },
      ],
      ending: '货箱开启——里面不是灵材，是一箱引魂玉的仿品。红绡眸光冷了下来：「有人在做假玉。做假玉的人……知道真玉的炼法。」她把仿品收进袖中，「这份情，红绡记下了。」',
      reward: { fortune: 6, items: { m_gupian: 1 } },
    },
    {
      id: 's11', title: '醉后真言', minRealm: 4, npc: 'n23',
      story: '老酒鬼堵在坊市酒肆门口，葫芦晃荡：「小娃娃，陪老头子喝一场。酒钱你出——好酒，最烈的那种。老头子有句话，酒到了才能说。」',
      steps: [
        { desc: '以酒会友（与江湖修士切磋三次）', done: p => (p.counters.spars || 0) >= 3 },
        { desc: '酒资不菲（灵石积蓄八万）', done: p => QuestSys.stonesTotal(p) >= 80000 },
      ],
      ending: '三坛烈酒下肚，老酒鬼伏在桌上，声音忽然清醒得可怕：「水底下那位……的三百年，老头子一天一天看着。你想下水，先学会——别信水面上的倒影。」',
      reward: { fortune: 8, insight: 6 },
    },
    {
      id: 's12', title: '星轨残图', minRealm: 5, npc: 'n17',
      story: '周天阁首席姬冰颜的传讯玉符落在你案头，只有一行清冷小字：「观星塔藏图残了三分之一。补全它，需要一枚你手里的东西——碎片拓影。」',
      steps: [
        { desc: '力破守关（击败秘境守关者一位）', done: p => (p.counters.bossKills || 0) >= 1 },
        { desc: '参悟至理（修习三部功法）', done: p => (p.counters.learns || 0) >= 3 },
      ],
      ending: '拓影合入残图，星轨亮起一线——血河故道上空，那颗三百年未曾移动的星，微微颤了一下。姬冰颜难得地侧过头：「多谢。这一颤，我等了十年。」',
      reward: { insight: 8, items: { m_gupian: 1 } },
    },
  ],
  stonesTotal(p) { return p.stones.low + p.stones.mid * 100 + p.stones.high * 10000; },
  /** v12 每章各目标对应的功能页签（供焦点条「前往」直达） */
  GO: {
    c1: ['cultivate', 'map', 'map'],
    c2: ['map', 'map', 'cultivate'],
    c3: ['cultivate', 'sect', 'gongfa'],
    c4: ['jianghu', 'map', 'map'],
    c5: ['cultivate', 'shop', 'map'],
    c6: ['cultivate', 'map', 'map'],
    c7: ['cultivate', 'map', 'shop'],
    c8: ['cultivate', 'jianghu', 'gongfa'],
    c9: ['cultivate', 'map', 'cultivate'],
  },
  /** v12 有效章节序号：跳过「境界已领先、目标全部自动追认」的章节（正式结算仍在 check 中逐章进行） */
  currentChapterIdx(p) {
    const q = p.quest || { ch: 0 };
    let ch = Math.min(q.ch, this.CHAPTERS.length - 1);
    while (ch < this.CHAPTERS.length - 1) {
      const def = this.CHAPTERS[ch];
      if (!def.steps.every(st => this.stepDone(st, p, def.supR))) break;
      ch++;
    }
    return ch;
  },
  /** v12 当前主线焦点：{ title, text, go 页签 }，全部完成时返回 null */
  focus() {
    const p = Game.player;
    if (!p) return null;
    const ch = this.currentChapterIdx(p);
    const def = this.CHAPTERS[ch];
    const idx = def.steps.findIndex(st => !this.stepDone(st, p, def.supR));
    if (idx < 0) return null;
    return { ch, title: def.title, text: def.steps[idx].desc, go: (this.GO[def.id] || [])[idx] || 'cultivate' };
  },
  stepDone(step, p, supR) {
    if (p.realmIdx >= (supR || 999)) return true;   // 境界领先：旧章目标自动追认
    try { return !!step.done(p); } catch (e) { return false; }
  },
  rewardText(reward) {
    const parts = [];
    if (reward.stones) parts.push(`灵石 ${Utils.fmtNum(reward.stones)}`);
    if (reward.fortune) parts.push(`气运 +${reward.fortune}`);
    for (const [id, n] of Object.entries(reward.items || {})) parts.push(`${GameData.ITEMS[id].name} ×${n}`);
    return parts.join('、') || '无';
  },
  storyHtml(text) { return text.split('\n').map(t => `<p class="story-p">${t}</p>`).join(''); },
  /** v11 叙事入卷：剧情以「羊皮卷」样式写入游历记载（不弹窗，不阻断操作） */
  storyLog(head, text) {
    Log.add(head, 'system');
    text.split('\n').forEach(line => Log.add(line, 'story'));
  },
  /** v15 开篇演出：全屏卷轴播放章节开篇（取代日志投放） */
  showStory(idx) {
    const def = this.CHAPTERS[idx];
    if (!def) return;
    const key = `c${idx + 1}_open`;
    Story.play(GameData.STORIES[key], () => {
      Log.add(`【本章目标】${def.goal}`, 'story');
      UI.announce(`主线 · ${def.title}`, 'gold');
      UI.renderAll();
      Save.autoSave(true);
    });
  },
  /** v15 中段插章：本章第一个目标完成时触发一次 */
  checkMid(p, def, chIdx) {
    if (!p.story || p.story.mid[def.id]) return;
    if (!def.steps[0] || !this.stepDone(def.steps[0], p, def.supR)) return;
    p.story = p.story || { seen: {}, mid: {}, choices: {} };
    // 境界领先追认场景：静默标记，不播
    if (p.realmIdx >= (def.supR || 999)) { p.story.mid[def.id] = 1; return; }
    p.story.mid[def.id] = Math.floor(p.day);
    Story.play(GameData.STORIES[`c${chIdx + 1}_mid`]);
  },
  /** v19 反派暗线插章：本章第二个目标完成时触发一次（mid 播毕后） */
  checkMid2(p, def, chIdx) {
    if (!p.story || !p.story.mid[def.id] || p.story.mid[def.id + '_2']) return;
    if (!def.steps[1] || !this.stepDone(def.steps[1], p, def.supR)) return;
    const script = GameData.STORIES[`c${chIdx + 1}_mid2`];
    if (!script) return;   // 暂无此段则不打标，后续章节补齐后自动生效
    p.story.mid[def.id + '_2'] = Math.floor(p.day);
    if (p.realmIdx >= (def.supR || 999)) return;   // 境界领先追认：静默跳过
    Story.play(script);
  },
  /** 每次行动后检查：当前章节目标齐备则完结 → 播章末演出 → 发奖 → 衔接下一章开篇 */
  async check() {
    if (this.checking) return;
    const p = Game.player;
    if (!p || p.dead) return;
    if (Story.active()) return;   // v15 剧情播放中不推进（播毕后下次行动再查）
    const q = p.quest = p.quest || { ch: 0, side: {} };
    const def = this.CHAPTERS[q.ch];
    if (!def) return;
    this.checkMid(p, def, q.ch);
    this.checkMid2(p, def, q.ch);
    if (Story.active()) return;
    if (!def.steps.every(st => this.stepDone(st, p, def.supR))) return;
    this.checking = true;
    try {
      q.ch += 1;
      Story.chron(`主线 · 第${this.CN9[q.ch - 1]}章「${def.title}」完结`);   // v19 年表
      UI.announce(`主线 · ${def.title} · 完结`, 'gold');
      Log.add(`✦ 主线推进 · 第${this.CN9[q.ch - 1]}章「${def.title}」完成！`, 'realm');
      DaoxinSys.attune(p, q.ch);   // v18 残玉共鸣 +1 重
      this.grant(def.reward);
      const rewardLine = `【章末奖励】${this.rewardText(def.reward)}`;
      const next = this.CHAPTERS[q.ch];
      const supSkipped = next && p.realmIdx >= (next.supR || 999);
      // v15 章末演出（结算场注入奖励行）
      const endScript = GameData.STORIES[`c${q.ch}_end`];
      if (endScript) {
        const scenes = endScript.scenes.slice();
        scenes.push({ t: 'reward', lines: [rewardLine] });
        Story.play({ id: endScript.id, title: endScript.title, scenes });
      } else {
        Log.add(rewardLine, 'gain');
      }
      if (next) {
        const after = () => {
          Log.add(`【本章目标】${next.goal}`, 'story');
          UI.renderAll();
          Save.autoSave(true);
        };
        if (supSkipped) {
          // 境界领先追认：不发开篇演出，只记日志（避免中期入坑连播）
          this.storyLog(`【主线 · 第${this.CN9[q.ch]}章 · ${next.title}】`, next.story);
          Log.add(`【本章目标】${next.goal}`, 'story');
          UI.announce(`主线 · ${next.title}`, 'gold');
          after();
        } else {
          // v18 角色注脚：开篇卷轴末尾追加残玉低语 / 道侣客串，让剧情看见"你是谁"
          const openScript = GameData.STORIES[`c${q.ch + 1}_open`];
          if (openScript) {
            const scenes = openScript.scenes.slice();
            scenes.push(...DaoxinSys.openEcho(p, q.ch + 1));
            Story.play({ id: openScript.id, title: openScript.title, scenes }, after);
          } else { after(); }
        }
      } else {
        Log.add('✦ 问道九章 · 全部完结！残玉化砂，仙路已成。', 'realm');
        UI.renderAll();
        Save.autoSave(true);
      }
    } finally { this.checking = false; }
  },
  grant(reward) {
    if (reward.stones) Bag.addStones(reward.stones);
    if (reward.fortune) KarmaSys.addFortune(reward.fortune, true);
    for (const [id, n] of Object.entries(reward.items || {})) Bag.addItem(id, n);
  },
  /** 支线结案 */
  async claimSide(id) {
    const p = Game.player;
    if (!p) return;
    const q = p.quest = p.quest || { ch: 0, side: {} };
    const sd = this.SIDES.find(x => x.id === id);
    if (!sd || q.side[id]) return;
    if (p.realmIdx < sd.minRealm) { UI.toast(`需 ${GameData.REALM_NAMES[sd.minRealm]}期方可了结此事`); return; }
    // v19 任务链：前置支线须先结案
    if (sd.prev && !q.side[sd.prev]) { UI.toast('前置事件尚未了结'); return; }
    if (!sd.steps.every(st => this.stepDone(st, p))) { UI.toast('结案条件尚未达成'); return; }
    q.side[id] = true;
    UI.announce(`支线 · ${sd.title} · 了结`, 'gold');
    this.storyLog(`【支线结案 · ${sd.title}】`, sd.ending);
    this.grant(sd.reward);
    Log.add(`【酬谢】${this.rewardText(sd.reward)}`, 'gain');
    // v19 NPC 绑定：结案增进交情、写入记忆与年表
    if (sd.npc) {
      const s = NpcSys.state(p, sd.npc);
      if (s) {
        s.met = true;
        s.rel = Utils.clamp(s.rel + 8, -100, 100);
        NpcSys.mem(p, sd.npc, 'story', `支线·${sd.title}`);
      }
      const nd = NpcSys.def(sd.npc);
      if (nd) Log.add(`${nd.name} 对你刮目相看——此事之后，你们的关系更进了一步。（交情 +8）`, 'gain');
    }
    Story.chron(`支线「${sd.title}」结案`);
    UI.renderAll();
    Save.autoSave(true);
  },
  /** 问道页渲染（v15：章节进度轨 + 目标进度 + 问道录回顾） */
  renderTab() {
    const p = Game.player;
    const q = p.quest = p.quest || { ch: 0, side: {} };
    const ch = Math.min(q.ch, this.CHAPTERS.length);
    // 九章进度轨
    const rail = this.CHAPTERS.map((def, i) => {
      const state = i < ch ? 'done' : i === ch ? 'cur' : 'lock';
      return `<div class="rail-node ${state}" title="第${this.CN9[i]}章 · ${def.title}${state === 'done' ? '（已完结）' : state === 'cur' ? '（进行中）' : ''}">
        <span class="rail-dot">${state === 'done' ? '✓' : i + 1}</span>
        <span class="rail-name">${def.title}</span>
      </div>`;
    }).join('<span class="rail-link"></span>');
    const railHtml = `
    <div class="card quest-card card-main">
      <div class="card-title">✦ 主线 · 问道九章 <span class="tag">${ch}/${this.CHAPTERS.length} 章</span>
        <button class="btn btn-sm" data-action="quest-review" style="margin-left:auto">📜 问道录 · 剧情回顾</button></div>
      <div class="quest-rail">${rail}</div>
    </div>`;
    let mainHtml;
    if (ch >= this.CHAPTERS.length) {
      mainHtml = `
      <div class="card quest-card">
        <div class="card-title">主线 · 问道九章（已圆满）</div>
        <div class="card-desc">残玉化砂，仙路已成。三百年血案昭雪，你的故事却仍在继续——轮回转世，另有一番天地机缘。</div>
      </div>`;
    } else {
      const def = this.CHAPTERS[ch];
      const goTabs = this.GO[def.id] || [];
      const steps = def.steps.map((st, si) => {
        const ok = this.stepDone(st, p, def.supR);
        const prog = (!ok && st.prog) ? `<span class="q-prog">${st.prog(p)}</span>` : '';
        const go = (!ok && goTabs[si]) ? `<button class="btn btn-sm q-go" data-action="quest-goto" data-tab="${goTabs[si]}">前往</button>` : '';
        return `<div class="q-step ${ok ? 'done' : ''}"><span class="q-mark">${ok ? '✓' : '○'}</span><span class="q-desc">${st.desc}</span>${prog}${go}</div>`;
      }).join('');
      mainHtml = `
      <div class="card quest-card card-main">
        <div class="card-title">主线 · 第${this.CN9[ch]}章 · ${def.title} <span class="tag warn">进行中</span></div>
        <div class="card-desc">${def.goal}</div>
        <div class="q-steps">${steps}</div>
        <div class="tip-line">章末奖励：${this.rewardText(def.reward)}</div>
      </div>`;
    }
    const sideRows = this.SIDES.map(sd => {
      const done = !!q.side[sd.id];
      const prevDone = !sd.prev || !!q.side[sd.prev];
      const npcName = sd.npc ? ((NpcSys.def(sd.npc) || {}).name || '') : '';
      const npcTag = npcName ? ` <span class="tag magic" title="${npcName}：结案增进交情，写入共同记忆">◈ ${npcName}</span>` : '';
      const locked = p.realmIdx < sd.minRealm || !prevDone;
      const allDone = sd.steps.every(st => this.stepDone(st, p));
      let state = '<span class="tag">进行中</span>';
      let action = '';
      if (done) state = '<span class="tag safe">已了结</span>';
      else if (!prevDone) { const prevSd = this.SIDES.find(x => x.id === sd.prev); state = `<span class="tag">前置 · ${prevSd ? prevSd.title : sd.prev}</span>`; }
      else if (locked) state = `<span class="tag">${GameData.REALM_NAMES[sd.minRealm]}期解锁</span>`;
      else if (allDone) { state = '<span class="tag warn">可结案</span>'; action = `<button class="btn btn-sm btn-primary" data-action="quest-side" data-side="${sd.id}">结 案</button>`; }
      const stepTxt = sd.steps.map(st => {
        const ok = this.stepDone(st, p);
        const prog = (!ok && st.prog) ? ` <span class="q-prog">${st.prog(p)}</span>` : '';
        return `<span class="q-step ${ok ? 'done' : ''}" style="display:inline-block;margin-right:14px">${ok ? '✓' : '○'} ${st.desc}${prog}</span>`;
      }).join('');
      return `
      <div class="card side-card ${done ? 'side-done' : ''}">
        <div class="card-title">支线 · ${sd.title} ${state}${npcTag}</div>
        <div class="card-desc">${done ? sd.ending : sd.story}</div>
        ${done ? '' : `<div class="q-steps">${stepTxt}</div><div class="tip-line">酬谢：${this.rewardText(sd.reward)}</div>${action ? `<div class="action-row">${action}</div>` : ''}`}
      </div>`;
    }).join('');
    return `${railHtml}${mainHtml}<div class="shop-section-title">◈ 奇遇录 · 支线</div>${sideRows}`;
  },

  /** v15 问道录：章节剧情回顾（已看过的开篇/中段/章末可重读） */
  CHOICE_LABELS: {
    c1_end: { vengeance: '带着遗志入世，此仇必报', caution: '带着告诫入世，只信亲眼所见', clarity: '带着牵挂入世，不为恨所吞' },
    c2_end: { copy: '拓印血图，原壁不动', take: '凿壁带走血图', memorize: '牢记于心，掩回原样' },
    c3_end: { defy: '顶回威胁：「想要玉，自己来拿」', feign: '虚与委蛇，暗谋后手', silent: '沉默不语，铭记于心' },
    c4_end: { blade: '以杀止杀', justice: '以直报怨，公之于众', mercy: '先问因由，不杀无辜' },
    c5_end: { accept: '认下前世因果', sever: '斩断前世，只走己路', leverage: '不认身份，以执念为刃' },
    c6_end: { slay: '阵中斩杀分身', interrogate: '逼问血河故道入口', spare: '放其溃散，直取本尊' },
    c7_end: { open: '应帖赴会，明查当面对质', dark: '绕行暗访黑玉令', blade: '借政敌之刀，坐观虎斗' },
    c8_end: { together: '立誓同生共死', entrust: '托付后事于至交', alone: '独自承担因果' },
    c9_end: { redeem: '渡宗主残魂往生', execute: '一剑斩尽，恩怨两清', walk: '转身不问，随劫火而灭' },
  },
  /** v19 问道录 2.0：剧情回顾 / 人物志 / 大事年表 / 抉择树（四页签） */
  openArchive(tab = 'story') {
    const p = Game.player;
    const tabs = [['story', '📜 剧情回顾'], ['figures', '👤 人物志'], ['chron', '🗓 大事年表'], ['choices', '⚖ 抉择树']];
    const tabHtml = `<div class="action-row" style="margin:0 0 8px">${tabs.map(([k, label]) =>
      `<button class="btn btn-sm ${k === tab ? 'btn-primary' : ''}" data-action="quest-archive-tab" data-tab="${k}">${label}</button>`).join('')}</div>`;
    let body = '';
    if (tab === 'figures') body = this.archiveFigures(p);
    else if (tab === 'chron') body = this.archiveChron(p);
    else if (tab === 'choices') body = this.archiveChoices(p);
    else body = this.archiveStory(p);
    UI.popup({ title: '📜 问道录', html: tabHtml + body, options: [{ text: '合 上', value: true, primary: true }] });
  },
  /** 页签：剧情回顾 */
  archiveStory(p) {
    const seen = (p.story && p.story.seen) || {};
    let body = '';
    for (let i = 0; i < this.CHAPTERS.length; i++) {
      const def = this.CHAPTERS[i];
      const cn = this.CN9[i];
      const rows = [];
      for (const [suffix, label] of [['open', '开篇'], ['mid', '中段'], ['mid2', '暗线'], ['end', '章末']]) {
        const sid = `c${i + 1}_${suffix}`;
        if (!seen[sid]) continue;
        const story = GameData.STORIES[sid];
        if (!story) continue;
        rows.push(`<button class="btn btn-sm" data-action="quest-reread" data-sid="${sid}">${label} · ${story.title.replace(/^第.+章 · /, '').replace(/^终章 · /, '') || label}</button>`);
      }
      if (!rows.length) continue;
      let choiceLine = '';
      const choiceVal = p.story && p.story.choices[`c${i + 1}_end`];
      if (choiceVal && this.CHOICE_LABELS[`c${i + 1}_end`] && this.CHOICE_LABELS[`c${i + 1}_end`][choiceVal]) {
        choiceLine = `<div class="tip-line">· 你当年的抉择：${this.CHOICE_LABELS[`c${i + 1}_end`][choiceVal]}</div>`;
      }
      body += `<div class="shop-section-title">◈ 第${cn}章 · ${def.title}</div><div class="action-row" style="margin:0 0 4px">${rows.join('')}</div>${choiceLine}`;
    }
    // 个人线回顾
    const plRows = Object.entries(GameData.PERSONAL).map(([nid, def]) => {
      const done = (p.personal || {})[nid] || 0;
      if (!done) return '';
      const acts = def.acts.slice(0, done).map(a => `<button class="btn btn-sm" data-action="quest-reread" data-sid="${a.key}">${a.title}</button>`).join('');
      return `<div class="tip-line">◈ ${def.arc}（${done}/${def.acts.length}）</div><div class="action-row" style="margin:0 0 4px">${acts}</div>`;
    }).filter(Boolean).join('');
    if (plRows) body += `<div class="shop-section-title">◈ 个人线</div>${plRows}`;
    if (!body) body = '<div class="tip-line">问道录尚是白卷——随着主线推进，你看过的每一段剧情都会收录在此，可随时重读。</div>';
    return body;
  },
  /** 页签：人物志（主线角色 + 江湖修士的相逢与记忆） */
  archiveFigures(p) {
    const seen = (p.story && p.story.seen) || {};
    const APPEAR = { c_laoren: null, c_ling: 'c1_mid', c_xuanying: 'c2_open', c_zongzhu: 'c5_open', c_zhenling: 'c5_open', c_shanggu: 'c6_mid', c_zhangmen: 'c7_open', c_xuanji: 'c7_mid' };
    const rows = [];
    for (const [id, c] of Object.entries(GameData.CHARACTERS)) {
      const appearKey = APPEAR[id];
      if (appearKey && !seen[appearKey]) continue;
      let sub = `${c.title} · 立场：${c.stance}`;
      let memHtml = '';
      if (c.npc) {
        const s = NpcSys.state(p, c.npc);
        const srole = (GameData.STORY_ROLES || {})[c.npc];
        if (s && s.met) {
          sub = `${c.title} · 关系：<b>${NpcSys.tierOf(Math.max(0, s.rel)).name}</b>（${s.rel > 0 ? '+' : ''}${s.rel}）`;
          const pl = GameData.PERSONAL[c.npc];
          if (pl) sub += ` · 个人线【${pl.arc}】 ${(p.personal || {})[c.npc] || 0}/${pl.acts.length}`;
          const mems = (s.mem || []).map(m => `${NpcSys.MEM_TYPE[m.t] || '旧事'}：${m.x}`).slice(-4);
          if (mems.length) memHtml = `<div class="figure-mem">共同回忆 —— ${mems.join('；')}</div>`;
        } else if (srole) {
          sub += ` · 尚未相逢`;
        } else {
          continue;
        }
        if (srole) sub += `<br><span style="color:var(--text-faint)">主线定位：${srole.role}</span>`;
      }
      rows.push(`
      <div class="figure-card">
        <div class="figure-portrait">${Art.portrait(c.look)}</div>
        <div class="figure-info">
          <div class="figure-name">${c.name} <span class="tag ${c.stance === '敌' ? 'danger' : c.stance === '友' ? 'safe' : ''}">${c.role}</span></div>
          <div class="figure-sub">${sub}</div>
          <div class="figure-mem">${c.desc}</div>
          ${memHtml}
        </div>
      </div>`);
    }
    if (!rows.length) rows.push('<div class="tip-line">尚未与任何人物结缘。</div>');
    return rows.join('');
  },
  /** 页签：大事年表 */
  archiveChron(p) {
    const list = (p.chronicle || []).slice();
    if (!list.length) return '<div class="tip-line">年表尚无着墨——主线推进、境界突破、支线结案与个人线落幕，都会记入此册。</div>';
    return list.map(e => `<div class="chron-line"><span class="chron-day">第${Math.floor(e.d / 365) + 1}年</span><span>${e.txt}</span></div>`).join('');
  },
  /** 页签：抉择树 */
  archiveChoices(p) {
    const choices = (p.story && p.story.choices) || {};
    let body = '';
    for (let i = 0; i < this.CHAPTERS.length; i++) {
      const key = `c${i + 1}_end`;
      const val = choices[key];
      const label = val && this.CHOICE_LABELS[key] && this.CHOICE_LABELS[key][val];
      body += `<div class="chron-line"><span class="chron-day">第${this.CN9[i]}章</span><span>${label ? `⚖ ${label}` : '<span style="color:var(--text-faint)">尚未抉择</span>'}</span></div>`;
    }
    body += '<div class="tip-line" style="margin-top:6px">· 每一次章末抉择都已化作道心烙印，并悄然改写着此后的因果。</div>';
    return body;
  },
  /** 重读某段剧情（只读模式，✕ 可关闭） */
  reread(sid) {
    UI.closePopup();
    const story = GameData.STORIES[sid];
    if (!story) return;
    Story.play(story, null, true);
  },
};
