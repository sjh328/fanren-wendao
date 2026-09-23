
const Game = {
  player: null,
  slot: null,
  activeTab: 'cultivate',
  bagTab: 'all',
  bagSort: 'quality',   // v20 背包排序：quality 品质 / type 类型 / name 名字
  subTab: {},   // v22 页签内子页签记忆（shop/cave/map 各自记住上次所在分栏）
  foldState: {},   // v24 折叠分组开合记忆（data-fold 键）——行动后重渲染不再把用户展开的分组收回去
  scrollMem: {},   // v26 页签滚动位置记忆——切走再回来，长列表回到原处

  init() {
    UI.cache();
    Log.init();
    Ambience.init();   // v5：氛围音效（默认关，读回上次的开关偏好）
    UI.renderStart();
    // v31 修瑕（E24）：PWA shortcuts 深链消费——manifest 声明的 ?tab= 此前无任何代码读取（死链）
    try {
      const qtab = new URLSearchParams(location.search).get('tab');
      if (qtab && ['cultivate', 'quest', 'cave', 'map', 'jianghu', 'shop', 'sect', 'gongfa'].includes(qtab)) {
        this._deepLinkTab = qtab;
        history.replaceState(null, '', location.pathname);
      }
    } catch (e) { /* ignore */ }
    // 全局事件委托：所有 data-action 统一分发
    document.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      const fn = this.actions[el.dataset.action];
      if (fn) {
        if (el._busy) return;   // v24 防重入：同一按钮上一笔尚未结清时忽略连点
        el._busy = true;
        try { await fn(el.dataset, el); }
        catch (err) { console.error('动作执行出错:', el.dataset.action, err && err.stack || err); UI.toast('操作出了点问题，请重试', true); }
        finally { el._busy = false; }
      }
    });
    // v24 折叠开合记忆：toggle 不冒泡，用捕获监听统一记账
    document.addEventListener('toggle', (e) => {
      const key = e.target && e.target.dataset ? e.target.dataset.fold : null;
      if (key) this.foldState[key] = e.target.open;
    }, true);
    // 氛围面板：点击面板以外区域自动收起
    document.addEventListener('click', (e) => {
      const ctrl = document.getElementById('amb-ctrl');
      const panel = document.getElementById('amb-panel');
      if (panel && !panel.classList.contains('hidden') && ctrl && !ctrl.contains(e.target)) panel.classList.add('hidden');
    });
    // v22：点击通用弹窗遮罩（弹窗盒以外区域）按取消结算，与右上 ✕ 等效
    document.getElementById('popup-modal').addEventListener('click', (e) => {
      if (e.target.id === 'popup-modal' && UI._popupResolve) UI.popupChoose(-1);
    });
    // v26 回到顶部：内容区下滑过深时浮出，一键回顶（移动端壳的单一滚动源）
    const backTop = document.getElementById('back-top');
    const tcBox = document.getElementById('tab-content');
    if (backTop && tcBox) {
      backTop.addEventListener('click', () => tcBox.scrollTo({ top: 0, behavior: 'smooth' }));
      tcBox.addEventListener('scroll', () => {
        backTop.classList.toggle('show', tcBox.scrollTop > tcBox.clientHeight * 1.2);
      }, { passive: true });
    }
    // v7：背包双击快捷操作（服用 / 装备 / 学习；丢弃按钮除外）
    document.addEventListener('dblclick', (e) => {
      const item = e.target.closest('.bag-item');
      if (!item) return;
      const btn = [...item.querySelectorAll('.bag-item-btns .btn')].find(b => !b.classList.contains('btn-danger'));
      if (btn && !btn.disabled) btn.click();
    });
    // v27 移动端键盘适配：visualViewport 缩放量写入 --kb 变量——底部弹层与输入框不再被软键盘遮住
    if (window.visualViewport && window.innerWidth <= 860) {
      const vv = window.visualViewport;
      const kbSync = () => {
        const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
        document.documentElement.style.setProperty('--kb', kb + 'px');
        document.documentElement.classList.toggle('kb-open', kb > 40);   // 仅键盘弹出时让位，平时贴底弹层不抬升
      };
      vv.addEventListener('resize', kbSync);
      vv.addEventListener('scroll', kbSync);
      kbSync();
    }
    // 键盘：ESC 依次收起 弹窗（按取消）→ 氛围面板 → 大道弹窗；战斗中 1~5 快捷出手
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement && document.activeElement.tagName) || '');
      // v35（E185）：role="button" 元素（如属性构成 🔍）的键盘桥接——Enter/Space 触发点击，
      // tabindex 补齐后键盘/读屏用户首次可达这些入口
      if (!typing && (e.key === 'Enter' || e.key === ' ') && document.activeElement instanceof HTMLElement
        && document.activeElement.getAttribute('role') === 'button') {
        document.activeElement.click();
        e.preventDefault();
        return;
      }
      if (Story.active()) {   // v15：剧情演出中屏蔽快捷键（Enter/空格推进剧情）
        if (e.key === 'Enter' || e.key === ' ') {
          // v35（E134）修瑕：原只排除了 choice——剧情战开场后 Story.cur 仍在（startBattle 只隐藏
          // modal 不清 cur），Enter 可把 idx 越过 battle 场景直接 finish，胜负旗标（k3/k6/k8/k9 等）
          // 永久丢失；investigate（细察）同样可被越过，四枚线索旗标静默蒸发。守卫与 skip() 自停集合对齐
          if (Battle.active) return;
          // v36（E199）：上守卫仅对非 readonly 生效——温书态互动场景已纯文本化（E199 ②③），
          // Enter 恒可翻页，否则重读的抉择/细察/战卡页键盘端同型卡死
          const sc = Story.cur && Story.cur.scenes[Story.cur.idx];
          if (!sc || Story.cur.readonly || (sc.t !== 'choice' && sc.t !== 'battle' && sc.t !== 'investigate')) { Story.next(); e.preventDefault(); }
        }
        return;
      }
      if (Battle.active && !Battle.active.busy && !Battle.active.over && !UI._popupResolve && !typing) {
        const sel = {
          1: '[data-action="bt-attack"]',
          2: '[data-action="bt-menu"][data-menu="skill"]',
          3: '[data-action="bt-defend"]',
          4: '[data-action="bt-menu"][data-menu="item"]',
          5: '[data-action="bt-flee"]',
        }[e.key];
        if (sel) {
          const btn = document.querySelector(sel);
          if (btn && !btn.disabled) { btn.click(); e.preventDefault(); }
          return;
        }
      }
      if (e.key !== 'Escape') return;
      if (UI._popupResolve) { UI.popupChoose(-1); return; }
      // v30：新手引导可 ESC 跳过（此前只能点按钮）
      const tut = document.getElementById('tutorial');
      if (tut && !tut.classList.contains('hidden') && typeof Tutorial !== 'undefined' && Tutorial.finish) { Tutorial.finish(); return; }
      const amb = document.getElementById('amb-panel');
      if (amb && !amb.classList.contains('hidden')) { amb.classList.add('hidden'); return; }
      const dao = document.getElementById('dao-modal');
      if (dao && !dao.classList.contains('hidden')) {
        dao.classList.add('hidden');
        // v30 补遗：ESC 合上叩问弹窗时保留叩问机缘——「大道未定」提醒可随时重新叩问
        if (Game.player && !Game.player.dao) Game.player.pendingDao = true;
      }
      // v29：只读剧情（问道录回顾）随 ESC 合上
      const storyM = document.getElementById('story-modal');
      if (storyM && !storyM.classList.contains('hidden') && typeof Story !== 'undefined' && Story.cur && Story.cur.readonly) { Story.close(); return; }
      // v28：更多面板 / 抽屉随 ESC 收起
      const sheet = document.getElementById('more-sheet');
      if (sheet && !sheet.classList.contains('hidden')) { UI.toggleMore(false); return; }
      UI.closeDrawers();
    });
    // v20 页签快捷键：Q 修炼 / W 问道 / E 洞府 / R 游历 / T 江湖 / A 坊市 / S 宗门 / D 功法
    document.addEventListener('keydown', (e) => {
      if (Story.active() || Battle.active || UI._popupResolve) return;
      // v32 修瑕（E53）：dao/tribulation/tutorial 等静态弹层开着时同样不切页（原只在遮罩下暗切）
      if (document.querySelector('.modal:not(.hidden)')) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement && document.activeElement.tagName) || '')) return;
      const map = { q: 'cultivate', w: 'quest', e: 'cave', r: 'map', t: 'jianghu', a: 'shop', s: 'sect', d: 'gongfa' };
      const tab = map[e.key.toLowerCase()];
      if (tab) { const lock = Guide.tabLocked(tab); if (!lock) { Game.actions['act-tab']({ tab }); } }   // v33（E100）：原「!Game.actions['act-tab']」恒假死守卫删除
    });
    // 关页前自动存档
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        if (Game.player && !Game.player.dead) Save.autoSave(true);
        // v28：后台页签省电——隐藏时停古琴循环，回前台续上
        if (typeof Ambience !== 'undefined' && Ambience.musicOn) Ambience.stopMusic();
      } else {
        if (typeof Ambience !== 'undefined' && Ambience.musicOn && Game.player && !document.hidden) Ambience.startMusic();
      }
    });
    window.addEventListener('beforeunload', () => {
      if (Game.player && !Game.player.dead) Save.autoSave(true);
    });
    // v34（G1）：多页签并发写提示——两页签各持独立内存态交替覆写同一 auto 键，后写者全量覆盖先写者，
    // 用户此前毫无感知。他页改动时提示一次（不做强夺锁，保留自由）。
    try {
      window.addEventListener('storage', (e) => {
        if (e.key === Save.KEY + 'auto' && e.newValue && Game.player && !Game.player.dead) {
          if (!Game._extWriteWarned) {
            Game._extWriteWarned = true;
            UI.toast('检测到本存档已在另一个窗口被打开改动——为免进度互覆，请只保留一个窗口游玩', true);
          }
        }
      });
    } catch (err) { /* ignore */ }
    // v18：全局错误捕获
    // v30 兜底升级：异常时立即强制存档一次并记录 lastError——开始界面可见「上次异常退出，已自动存档」
    window.addEventListener('error', (e) => {
      console.error('未捕获的异常:', e.error || e.message);
      if (Game.player && !Game.player.dead) { try { Save.autoSave(true); } catch (err) { /* ignore */ } }
      try {
        const msg = String((e.error && e.error.stack) || e.message || 'unknown').slice(0, 400);
        if (Save.storage.setItem) Save.storage.setItem(Save.KEY + 'lasterror', JSON.stringify({ ts: Date.now(), msg }));
        else Save.mem['lasterror'] = JSON.stringify({ ts: Date.now(), msg });
      } catch (err) { /* ignore */ }
      if (Game.player && !e.defaultPrevented) {
        UI.toast('道心微澜，一股无名之气掠过识海（已自动存档）', true);
      }
    });
    window.addEventListener('unhandledrejection', (e) => {
      console.error('未捕获的 Promise 拒绝:', e.reason);
      if (Game.player) {
        UI.toast('识海泛起一丝涟漪，随即平复（不影响存档）', true);
      }
    });
  },

  newGame(slot, name, attrs) {
    this.slot = slot;
    this.player = PlayerFactory.create(name, attrs);
    this._skipOfflineOnce = true;   // v34（G3）：新档不读旧角色残留的 auto 档做离线结算（显式守卫，不再只依赖 day===0 的隐式巧合）
    this.enterGame();
    Log.clear();
    Log.add(`天地灵气复苏之年，凡俗少年 <b>${Utils.esc(name)}</b> 得了一册残缺功法，自此踏上仙途。`, 'system');
    Log.add('（提示：先在后山「游历」磨砺，或就地「修炼」积攒修为。遇到不懂的可点菜单里的「玩法说明」。）', 'info');
    // v29 修瑕：教程(z140)曾压着第一章剧情(z135)双层叠开——改为教程完毕再开剧情；
    // v31 修瑕：show() 改返回是否真正展示——仅早退（本机已看过教程）时立即接力开剧情。
    // 此前无条件消费 onDone，而 show() 展示路径并不清回调——真首机剧情照样提前叠开，v29 修复失效
    if (!this.player.flags.tutorialDone) {
      Tutorial.onDone = () => QuestSys.showStory(0);
      const shown = Tutorial.show();
      if (!shown && typeof Tutorial.onDone === 'function') { const cb = Tutorial.onDone; Tutorial.onDone = null; cb(); }
    }
    else QuestSys.showStory(0);   // v11：主线第一章开篇叙事
    Save.autoSave();
    if (slot !== 'auto') Save.write(slot, this.player);
  },

  loadFrom(key) {
    const data = Save.read(key);
    if (!data || !data.player) { UI.toast('此处没有存档'); return false; }
    // v30：版本门——来自更新版本的存档拒绝盲读（原仅导入路径校验）
    if (Number(data.v) > 1) { UI.toast('此存档来自更新版本，请更新后再读取', true); return false; }
    if (data.meta && data.meta.dead) { UI.toast('此存档已坐化，无法读取', true); return false; }
    UI.closeOverlays();   // 状态同步：清掉可能残留的战斗 / 弹窗覆盖层
    AutoCult.abort();   // v6
    // v35（E192）：slot 归一为数字——原 dataset 传入的字符串 '1' 与导入面板的数字 1 严格相等
    // 不命中，Meta.importTo 的「同槽即时生效」分支时灵时不灵
    this.slot = key === 'auto' ? null : Number(key);
    this.player = PlayerFactory.migrate(data.player);
    this.enterGame();
    Log.clear();
    Log.add(`光阴倒流，你回到了 <b>${Time.label(this.player)}</b> 的这一刻。（读档成功）`, 'system');
    SectSys.reformNotice(this.player);   // v37（E242）：差事改制读档播报（迁移步作废重掷后的补记）
    UI.renderAll();
    return true;
  },

  /** v6：回退到突破前的自动备份（存于临时槽位 bak） */
  rollbackBackup() {
    const data = Save.read('bak');
    if (!data || !data.player) { UI.toast('没有可回退的备份'); return false; }
    AutoCult.abort();
    this.player = PlayerFactory.migrate(data.player);
    UI.renderAll();
    Save.autoSave();
    Log.add('因果倒卷，时光回流——你回到了引动天劫之前的那一刻。', 'system');
    SectSys.reformNotice(this.player);   // v37（E242）：差事改制播报（bak 回退路径同样可能带旧任务）
    return true;
  },

  /** v18：离线进度计算——灵田按真实时间生长
   *  v26 修瑕：离线天数改按日回放 Time.add(1)——跨年结算（年龄整化 / NPC 成长 / 世界大事 / 寿元判定）
   *  不再被整体跳过，年龄也不再出现 16.0821… 式小数。
   *  v27：离线逐日补结「日更」系统（灵泉 / 访客 / 虫害 / 节庆 / 登顶日赏 / 玄影窥伺 / 图鉴）——
   *  此前这些钩子只挂在行动收尾，离线 30 天分文不进。 */
  computeOfflineProgress() {
    const p = this.player;
    if (!p || p.dead || p.day === 0 || this._skipOfflineOnce) { this._skipOfflineOnce = false; return; }
    // 读取上次存档的 meta.ts（在 Save.write 中写入）
    // v30 修瑕：离线时长恒按 auto 档时间戳计——原按所读档位 ts，读陈旧手动档会把「重读旧档」
    //          误算成最长 30 日离线（语义模糊且可刷）；auto 每行动实时落盘，才是「上次游玩」的真时点
    const data = Save.read('auto') || (this.slot == null ? null : Save.read(this.slot));
    if (!data || !data.meta || !data.meta.ts) return;
    // v32 复核：E57「手动档离线基准回退本档 ts」经复核撤销——v30 已有明确决策（离线时长恒按
    // auto 档计，防「读陈旧手动档白拿 30 日离线」），手动档与 auto 的 ts 差本就是防刷语义的一部分。
    const elapsedMs = Date.now() - data.meta.ts;
    if (elapsedMs < 60000) return; // 少于 1 分钟不算离线
    // 按真实时间推算游戏天数（现实 1 分钟 ≈ 游戏 1 天，v34（A4）上限 30→120 日）
    const realDays = Math.min(120, Math.floor(elapsedMs / 60000));
    // v27 修瑕：不再回拨熟期——作物按真实日数自然生长与过熟（原 Math.max 回拨让
    // 「过熟廿日减半」的规则在长离线下永远无法成立）
    const offlineCrops = (p.cave && p.cave.plots || []).filter(pl => pl && pl.seed).length;
    // v24 离线修行：放置游戏名实相符——离线期间行功不辍，修为按折算效率入账（不冲关、不积丹毒）
    // v30 修瑕：折算剔除聚灵加速（rushDay 只是在线单日增益，曾把整段离线一并放大五成）
    // v34（A4）：效率 0.4→0.6——在线挂机每 0.28s 推 3 日，旧参数下挂夜 8 小时只得 12 有效日，
    // 「回家礼物」薄得近乎羞辱；0.6×120 日后长离线有实感，仍显著低于在线效率，无刷点
    let offlineExp = 0, offlineBase = 0, offlineRushBonus = 0;   // v37（E277）：基础/聚灵两段拆账
    if (!p.dead) {   // v35（E196）：原 `p.realmIdx >= 0 &&` 恒真死条件删除（realmIdx 已被 migrate/create 钳制 0..9）
      try {
        const st = Stat.compute(p);
        const rushDayBak = p.rushDay; p.rushDay = null;
        const perRound = Cultivate.baseGain(p) * (1 + st.cultPct / 100);
        p.rushDay = rushDayBak;
        // v37（E277）：聚灵窗口补乘——点燃后关游戏，离线日落在 3 日窗口内的部分按 ×1.5 计
        //（v30 起整段剔除 rushDay，已付费的窗口日被离线整段烧光）。窗口剩余日 = rushDay+3 − 起始日，
        // 与离线段取交集；rushMul 为全段加权乘数（窗口日 ×1.5、其余 ×1）。
        // 跨批契约（B8 E253 门禁锚）：OFFLINE_EFF/rushMul 两个具名常量与可抽取表达式形态勿改
        const OFFLINE_EFF = 0.6;   // 离线折算效率（v34 A4 定档 0.6，不随本版上调）
        let rushMul = 1;
        if (p.rushDay != null) {
          const rushLeft = Utils.clamp(p.rushDay + 3 - Math.floor(p.day || 0), 0, realDays);
          if (rushLeft > 0) rushMul = (realDays + 0.5 * rushLeft) / realDays;
        }
        offlineExp = Math.round(perRound / 3 * OFFLINE_EFF * rushMul * realDays);
        offlineBase = Math.round(perRound / 3 * OFFLINE_EFF * realDays);
        offlineRushBonus = Math.max(0, offlineExp - offlineBase);
        if (offlineExp > 0) Cultivate.addExp(p, offlineExp);
      } catch (err) { console.error('离线修行折算异常:', err); offlineExp = 0; offlineBase = 0; offlineRushBonus = 0; }
    }
    // 时间照常流逝（逐日回放，跨年/寿元/世界线照常结算；寿元尽则照常坐化）
    // v27：逐日补结日更系统（auto 模式——节庆自动从简、灵泉只入账不刷屏）
    let springOn = !!(p.cave && p.cave.builds && p.cave.builds.spring);
    // v32 修瑕（E60）：离线逐日回放标记 + 收益聚合——弟子历练/仙界访客等 auto 钩子原逐日刷屏
    //（30 日离线 30~40 条），现聚合为一条「离线日报」
    this._offlineAgg = {};
    for (let i = 0; i < realDays && !p.dead; i++) {
      Time.add(1);
      this.dailySettle(p, true);
    }
    p._settleDay = Math.floor(p.day || 0);   // v33（E81）：回放已逐日补结——原不同步 _settleDay，读档后首次行动再补结一轮（至多 30 次冗余日结，全靠各钩子日界防重兜底）
    const aggSnap = Object.assign({}, this._offlineAgg);   // v34（E1）：快照聚合（flush 会清空）
    this.flushOfflineAgg();
    // v34（E125）：文案笔误——「个时辰」实为日、「裡」为繁体混入
    if (offlineCrops > 0) {
      Log.add(`你不在的${realDays}日里，灵田中的${offlineCrops}块作物并未荒废——它们仍在生长。`, 'info');
    }
    if (springOn && !p.dead) Log.add('【灵泉】离线的日子里，洞府灵泉照常日日涌出灵石，皆已收入储物袋。', 'gain');
    if (offlineExp > 0) {
      // v37（E277）：口径引 UI.FACTS 单源拼串；聚灵加护段随补乘明示
      Log.add(`离山的日子你行功不辍——修为自行精进 <b>+${Utils.fmtNum(offlineExp)}</b>（按${UI.FACTS.offlineEff}效率折算，不计闭关加成，共 ${realDays} 日${offlineRushBonus > 0 ? `；聚灵加护 +${Utils.fmtNum(offlineRushBonus)}` : ''}）。`, 'gain');   // v36（E217）：口径如实——闭关流实得落差从暗亏变明示
    }
    // v34（E1）：离线小结——回家一份四行账的「仪式」，收益不再藏在默认折叠的日志红点后
    if (!p.dead && realDays >= 1 && (offlineExp > 0 || aggSnap.spring || aggSnap.disciple || aggSnap.xianVisit || aggSnap.avatarExp || aggSnap.avatarStones || aggSnap.nightRaid)) {
      const rows = [
        [`离线时长`, `${realDays} 日`],
        // v37（E277）：小结拆「基础/聚灵加护」两段——窗口补乘的收益明示
        ...(offlineExp > 0 ? (offlineRushBonus > 0 ? [
          [`修行精进（基础）`, `<b class="hl">+${Utils.fmtNum(offlineBase)}</b> 修为`],
          [`聚灵加护`, `<b class="hl">+${Utils.fmtNum(offlineRushBonus)}</b> 修为`],
        ] : [[`修行精进`, `<b class="hl">+${Utils.fmtNum(offlineExp)}</b> 修为`]]) : []),
        ...(aggSnap.spring ? [[`灵泉涌出`, `<b class="hl">${Utils.fmtNum(aggSnap.spring)}</b> 灵石`]] : []),
        ...(aggSnap.disciple ? [[`弟子历练`, `缴回灵石 ${Utils.fmtNum(aggSnap.disciple)}`]] : []),
        ...(aggSnap.xianVisit ? [[`仙界访客`, `到访 ${aggSnap.xianVisit} 次`]] : []),
        ...(aggSnap.avatarExp ? [[`化身闭关`, `<b class="hl">+${Utils.fmtNum(aggSnap.avatarExp)}</b> 修为`]] : []),   // v38（E302/E327）
        ...(aggSnap.avatarStones ? [[`化身游历`, `觅得灵石 ${Utils.fmtNum(aggSnap.avatarStones)}`]] : []),
        ...(aggSnap.nightRaid ? [[`洞府夜袭`, `遇袭 ${aggSnap.nightRaid} 次（日志详载）`]] : []),
      ];
      UI.popup({
        title: '云 归 · 离 线 小 结',
        html: `<div class="seclude-report">${rows.map(([k, v]) => `<div class="sr-row"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
          <div class="tip-line" style="text-align:center">· 归来尘满衣，袖中天地宽。</div>`,
        options: [{ text: '返 府', value: true, primary: true }],
      }).catch(() => {});
    }
  },

  /** v27：每日例行结算（行动收尾与离线回放共用）——所有子项内部自带日界防重，重复调用无副作用。
   *  auto=离线回放模式：节庆自动从简（不弹窗不开战）、访客/灵泉不回环 afterAction、
   *  道侣心愿需互动故跳过（来日在线再叙）。 */
  /** v38（E340）：称号机制判定单源——佩戴中、条件仍满足、且 mech 匹配 */
  titleOn(p, mech) {
    if (!p || !p.title) return false;
    const t = (GameData.TITLES || []).find(x => x.id === p.title);
    return !!t && t.mech === mech && (!t.cond || t.cond(p));
  },

  /** v38（E328）：里程碑演出——一次性旗标 + 全屏异象 + 专属音色 + 金色公告（规格对齐本命合成） */
  milestone(id, text, color) {
    const p = this.player;
    if (!p) return;
    p.flags = p.flags || {};
    if (p.flags[id]) return;
    p.flags[id] = true;
    UI.realmShow(text, color || '#e8c56a');
    if (typeof Ambience !== 'undefined' && Ambience.sfx) Ambience.sfx('rare');
    UI.announce(`✦ ${text} ✦`, 'gold');
    Log.add(`<b>${text}</b>——此身此世，又添一笔传奇。`, 'realm');
    Story.chron(text);
  },

  dailySettle(p, auto = false) {
    try { if (typeof FestivalSys !== 'undefined') FestivalSys.check(p, auto); } catch (err) { console.error('节庆检查异常:', err); }   // v20：节庆触发
    try { if (typeof SectSys !== 'undefined' && SectSys.tourneyCheck) SectSys.tourneyCheck(p); } catch (err) { console.error('大比检查异常:', err); }   // v22：宗门大比（每五年一届）
    if (!auto) { try { if (typeof NpcSys !== 'undefined' && NpcSys.companionCheck) NpcSys.companionCheck(p); } catch (err) { console.error('共修检查异常:', err); } }   // v20：道侣共修
    try { DaoxinSys.shadowNudge(p); } catch (err) { console.error('窥伺检查异常:', err); }   // v18：玄影窥伺（软约束）
    // v24：日常结算统一收口到行动后（原先藏在各页签渲染函数里，打开页面才结算）
    try { if (typeof RankSys !== 'undefined' && RankSys.dailyReward && RankSys.isTop(p)) RankSys.dailyReward(p); } catch (err) { console.error('登顶日赏异常:', err); }
    try { if (p.cave) { CaveSys.visitorEvent(p, auto); CaveSys.checkPest(p); CaveSys.springDaily(p, auto); CaveSys.treasuryDaily(p, auto); } } catch (err) { console.error('洞府日常异常:', err); }
    try { if (typeof SectSys !== 'undefined' && SectSys.discipleDaily) SectSys.discipleDaily(p, auto); } catch (err) { console.error('弟子历练异常:', err); }   // v30 补遗：亲传门中弟子历练（离线亦入账）
    try { if (typeof Codex !== 'undefined' && Codex.checkRewards) Codex.checkRewards(); } catch (err) { console.error('图鉴检查异常:', err); }
    try { if (typeof XianSys !== 'undefined' && XianSys.dailyCheck) XianSys.dailyCheck(p, auto); } catch (err) { console.error('仙界访客异常:', err); }   // v31：仙界访客（入仙籍后，离线静默入账）
    try { if (typeof XianSys !== 'undefined' && XianSys.courtDaily) XianSys.courtDaily(p, auto); } catch (err) { console.error('仙庭差遣异常:', err); }   // v38（E309）：仙庭差遣换日 + 心魔罢黜
    try { if (typeof AvatarSys !== 'undefined' && AvatarSys.daily) AvatarSys.daily(p, auto); } catch (err) { console.error('化身行功异常:', err); }   // v38（E302/E327）：化身逐日行功（离线同源同量）
    try { if (typeof CaveSys !== 'undefined' && CaveSys.nightRaidCheck) CaveSys.nightRaidCheck(p, auto); } catch (err) { console.error('夜袭检查异常:', err); }   // v38（E305）：宿敌夜袭（离线自动结算）
  },

  /** v32 修瑕（E60）：离线日报——auto 回放期间各系统聚合的收益在此收口成一条日志
   *  v33（E82）：在线按日补结（E27）的静默入账同走此口（标题区分），不再无声蒸发 */
  flushOfflineAgg(title = '【离线日报】') {
    const agg = this._offlineAgg || {};
    const parts = [];
    if (agg.disciple) parts.push(`门中弟子历练缴回灵石 ${Utils.fmtNum(agg.disciple)}${agg.discipleExtra ? '、捎回灵材若干' : ''}`);
    if (agg.xianVisit) parts.push(`仙界访客到访 ${agg.xianVisit} 次`);
    if (agg.avatarExp) parts.push(`化身代主行功，修为 +${Utils.fmtNum(agg.avatarExp)}`);   // v38（E302/E327）
    if (agg.avatarStones) parts.push(`化身游历，觅得灵石 ${Utils.fmtNum(agg.avatarStones)}`);
    if (agg.nightRaid) parts.push(`洞府遭夜袭 ${agg.nightRaid} 次（胜负已分，详情见日志）`);
    if (parts.length) Log.add(`${title}${parts.join('；')}。`, 'info');
    this._offlineAgg = null;
  },

  enterGame() {
    Anim.reset();   // v4：换档后数字动画记忆清零
    this.subTab = {};   // v22：换档后子页签记忆一并复位
    this.scrollMem = {};   // v26：滚动记忆一并复位
    Meta.load();    // v6：装载本存档位的成就与图鉴
    GongfaSys.syncCustom(this.player);   // v38（E301）：自创功法定义重新注册进 ITEMS（静态表不含运行期产物）
    // v38（E319）：本世印记基线快照（一世报告「本世印记」的分子）
    if (this.player && this.player.counters && this.player.counters.marksStart == null) {
      this.player.counters.marksStart = (typeof ReincarnationSys !== 'undefined') ? ReincarnationSys.readLegacy().marksEarned || 0 : 0;
    }
    AutoCult.abort();
    Save.snapshotAuto();   // v30：滚动快照——本次会话前的 auto 存一份 bak2
    // v37（E268）：纯挂机长会话兜底——每 10 分钟滚动一次 bak2（注意 setInterval 参数 fn 在前；
    // 句柄存 Game._snapTimer，exitToStart/删档时清理防多开泄漏）
    if (this._snapTimer) clearInterval(this._snapTimer);
    this._snapTimer = setInterval(() => Save.snapshotAuto(), 600000);
    this.computeOfflineProgress();  // v18：离线进度
    // v30 修瑕：离线逐日回放中寿元坐化时，不再闪一下游戏界面再弹回开始界面——坐化结算直接接住
    if (this.player && this.player.dead) { UI.renderStart(); return; }
    // v32 修瑕（A3）：秘境「先清 choices 再开战」竞态残留自愈——战斗中刷新/关页后读档，
    // 本层节点凭空消失只剩撤离（深入进度与门票沉没）。空 choices 且未卡死则重掷本层。
    if (this.player && this.player.dungeon && !this.player.dungeon.stuck && !(this.player.dungeon.choices || []).length) {
      DungeonSys.genChoices(this.player.dungeon);
    }
    // v37（E272）：章末演出中断补偿——「章末→下章开篇」连播间隙被中断时，下章开篇永久丢失。
    // 读档后：当前章的开篇未 seen、且未达境界追认线（realmIdx < supR，追认章可直接看回顾），
    // 则补播一次开篇（Story.play 只读链，E199 温书守卫防重入副作用；补播后补记 seen 防每次读档重播）
    if (this.player && !this.player.dead) {
      const q = this.player.quest = this.player.quest || { ch: 0, side: {} };
      const def = QuestSys.CHAPTERS[q.ch];
      const openId = def ? `c${q.ch + 1}_open` : null;
      if (def && openId && GameData.STORIES[openId] && !Story.isSeen(openId) && this.player.realmIdx < (def.supR || 999)) {
        Story.markSeen(openId);
        Story.play(GameData.STORIES[openId], null, true);
        Log.add('上一场章末演出似曾中断——开篇为你重演一遍（只读温书，不夺抉择）。', 'info');
      }
    }
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    UI.renderAll();
    // v31（E24）：深链页签跳转（PWA shortcuts 落地）
    if (this._deepLinkTab) { const t = this._deepLinkTab; this._deepLinkTab = null; this.actions['act-tab']({ tab: t }); }
  },

  exitToStart() {
    UI.closeOverlays();   // 状态同步：清掉战斗 / 弹窗等覆盖层，避免遮罩滞留
    AutoCult.abort();   // v6
    if (this._snapTimer) { clearInterval(this._snapTimer); this._snapTimer = null; }   // v37（E268）：滚动快照定时器随会话清理
    if (this.player && !this.player.dead) Save.autoSave(true);
    this.player = null;
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('create-screen').classList.add('hidden');
    document.getElementById('start-screen').querySelector('.start-inner').classList.remove('hidden');
    UI.renderStart();
  },

  /** 每次玩家行动后统一收尾：钳制数值 → 渲染 → 自动存档 */
  afterAction() {
    const p = this.player;
    if (!p) return;
    const st = Stat.compute(p);
    p.hp = Utils.clamp(p.hp, 0, st.maxHp);
    p.mp = Utils.clamp(p.mp, 0, st.maxMp);
    if (p.hp <= 0) p.hp = Math.max(1, Math.round(st.maxHp * 0.1));
    // v34（E126）：成就/剧情检查先行——原渲染+存档之后再 check，解锁时又来一轮 markDirty+renderAll
    // +autoSave（一次行动双份整树渲染、双份全量序列化）。检查只改数据不发渲染，先跑后统一渲染落盘。
    Achieve.check();   // v6：成就检查（解锁即发奖播报）
    try { QuestSys.check(); } catch (err) { console.error('剧情检查异常:', err); }   // v11：主线推进
    UI.markDirty('all');
    try { UI.renderAll(); } catch (err) { console.error('渲染异常（不影响存档）:', err); }
    Save.autoSave();
    // v32 修瑕（E27）：日更按日补结——原每行动只结一次 dailySettle：一次闭关 30 日只吃一次日更
    // 收益，而离线逐日回放 30 次（挂机关页远优于在线闭关，放置激励倒挂）。此处按跨过的游戏日
    // 虚拟逐日补结（auto 静默口径：不弹窗不刷屏，日界防重由各子项自带），与离线同源同量。
    const settleToday = Math.floor(p.day || 0);
    if (p._settleDay == null) p._settleDay = settleToday;
    const crossed = Utils.clamp(settleToday - p._settleDay, 0, 30);
    if (crossed > 0) {
      const realDay = p.day;
      this._offlineAgg = {};
      for (let i = 1; i <= crossed; i++) {
        p.day = settleToday - crossed + i;   // 虚拟逐日推进（不改真实时间轴）
        try { this.dailySettle(p, true); } catch (err) { console.error('日更补结异常:', err); }
      }
      p.day = realDay;
      p._settleDay = settleToday;
      this.flushOfflineAgg(`【${crossed} 日总账】`);   // v33（E82）：补结收益不再静默入账
    }
    this.dailySettle(p);   // 当日例行（v27：日更系统统一收口：节庆/大比/共修/窥伺/登顶/洞府/图鉴）
    // 叩问大道时序：筑基之初，或兵解转世的记忆传承；战斗中则延后
    if (p.pendingDao && !p.dao && !p.dead && !Battle.active
      && (p.realmIdx >= 1 || p.reinc)) {
      p.pendingDao = false;
      DaoSys.openModal();
    }
    // v38（E300）：道途分岔时序——道境 3/6 重晋阶后的二选一（不可回改）；战斗中延后至战后
    if (p.pendingDaoPath && !p.dead && !Battle.active) {
      const tier = p.pendingDaoPath;
      p.pendingDaoPath = null;
      DaoSys.openPathModal(tier);
    }
    // v38（E305）：夜袭时序——宿敌叩门（Story/弹窗/战斗中延后，节庆同款挂起语义）
    if (p.pendingNightRaid && !p.dead && !Battle.active && !Story.active && !UI._popupResolve) {
      const npcId = p.pendingNightRaid;
      p.pendingNightRaid = null;
      CaveSys.resolveNightRaid(p, npcId, false);
    }
    // v38（E306）：誓言清算——破戒待决 / 贫誓超限（异步弹窗，不阻塞收尾）
    if (typeof OathSys !== 'undefined' && !p.dead && !Battle.active && !Story.active && !UI._popupResolve
      && (p.pendingOathBreak || (p.oaths && p.oaths.poor))) {
      OathSys.pendingResolve(p);
    }
  },

  async gameOver(reason) {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    Save.write('auto', p);   // 直接写盘：autoSave 会跳过已死亡角色，此处须落盘死亡标记
    // v37（E238）：坐化演出——入弹窗前冷色全屏异象 + 低回钟磬（规格对齐突破/转世仪式）
    UI.realmShow('灯火渐熄，天地忽远——尘世的一切，都成了很远的声音。', '#6b7a8f');
    if (typeof Ambience !== 'undefined') Ambience.sfx('bell');
    Log.add('油尽灯枯，你的道途走到了尽头……', 'loss');
    // v29 天年：坐化不再是一堵墙——可兵解转世（寿满天年额外 +1 印记），就此终了亦可
    // v32 修瑕（E49）：ESC/点遮罩关闭弹窗原回落 undefined → 走「就此终了」毁灭项——
    //          寿满 +1 印记的转世机缘一次误触即没。关闭一律回落主选项「兵解转世」。
    // v38（E319）：一世报告先行——灯尽之际，回望来路
    await ReincarnationSys.showLifeReport(p, '坐化');
    const choice = (await UI.popup({
      title: '✦ 坐 化 ✦',
      html: `寿元耗尽，天道无情。<br><br>${Utils.esc(p.name)}，${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}修士，享年 ${p.age} 岁。<br><br>肉身虽朽，神魂尚清——是散去修为、投胎再修一世，还是就此归于天地？<br><span class="tip-line">· 兵解转世：此世尽付东流，传承却得延续，且因<b>寿满天年</b>额外多得一枚轮回印记。</span>`,
      options: [{ text: '兵解转世', value: 'reinc', primary: true }, { text: '就此终了', value: 'end' }],
    })) || 'reinc';
    if (choice === 'reinc') {
      const livesBefore = ReincarnationSys.readLegacy().lives || 0;
      p.dead = false;   // 暂解死亡封档，允许转世流程写盘
      await ReincarnationSys.open({ force: true, extraMarks: 1, deathNote: '坐化之时神魂不昧，轮回之门为你而开。' });
      const done = Game.player && !Game.player.dead && (ReincarnationSys.readLegacy().lives || 0) > livesBefore;
      if (done) return;   // 转世已成，继续新的一生
      if (Game.player) Game.player.dead = true;   // 中途作罢：重新封档，不留「寿元尽而不死」的悬置态
    }
    this.exitToStart();
  },

  /* ---------- 动作表（data-action → 处理函数） ---------- */
  actions: {
    /* --- 开始界面 --- */
    'st-newgame': async (d) => {
      const slot = Number(d.slot);
      const old = Save.read(slot);
      if (old && old.player) {
        const ok = await UI.popup({
          title: '覆盖存档',
          html: `存档位${['一', '二', '三'][slot - 1]} 已有进度（${Utils.esc(old.meta.name)} · ${old.meta.realmText}）。<br>重开将覆盖旧档，确定吗？`,
          options: [{ text: '重 开', value: true }, { text: '取消', value: false }],
        });
        if (!ok) return;
      }
      StartScreen.open(slot);
    },
    'st-back': () => StartScreen.back(),
    'st-reroll': () => { StartScreen.attrs = PlayerFactory.rollAttrs(); UI.renderCreate(); },
    'st-mirror': () => ReincarnationSys.mirror(),   // v30：轮回镜（开始界面）
    'st-bak2': async () => {
      // v30 滚动快照回捞：把 bak2 写入 auto 后读档（误删/损坏后的安全网）
      const snap = Save.read('bak2');
      if (!snap || !snap.player) { UI.toast('没有可回捞的快照'); return; }
      // v35（E137）修瑕：回捞前先验快照——dead 档（坐化收场滚入的旧快照）不再允许覆盖当前
      // 活档（原先覆写 auto 后才被 loadFrom 的死档检查拦下，当前进度已实际被销毁且无副本）；
      // 覆写前另落一份 auto_pre_bak2 作二级保险
      if (snap.meta && snap.meta.dead) { UI.toast('该快照来自一位已坐化的修士，无法回捞', true); return; }
      const ok = await UI.popup({
        title: '回捞上次快照',
        html: `快照时间：第 ${snap.meta.day} 日 · ${snap.meta.realmText} · ${snap.meta.name}。<br>将把这份快照写入自动存档并读取（当前 auto 会被覆盖，原档暂存于「回捞前自动档」）。`,
        options: [{ text: '回 捞', value: true, primary: true }, { text: '作罢', value: false }],
      });
      if (!ok) return;
      try {
        const cur = Save.read('auto');
        if (cur && cur.player) Save.writeRaw('auto_pre_bak2', JSON.stringify(cur));
        const raw = JSON.stringify(snap);
        Save.writeRaw('auto', raw);
      } catch (e) { UI.toast('回捞失败', true); return; }
      Game.loadFrom('auto');
    },
    'act-mirror': () => ReincarnationSys.mirror(),   // v30：轮回镜（游戏内）
    'st-start': () => {
      const name = (document.getElementById('create-name').value || '').trim() || Utils.pick(GameData.NAMES);
      Game.newGame(StartScreen.slot, name, StartScreen.attrs);
    },
    'st-load': (d) => { Game.loadFrom(d.slot); },
    'st-delete': async (d) => {
      const ok = await UI.popup({ title: '删除存档', html: '此档一删，仙途尽消，确定吗？', options: [{ text: '删除', value: true }, { text: '取消', value: false }] });
      if (ok) {
        if (this._snapTimer) { clearInterval(this._snapTimer); this._snapTimer = null; }   // v37（E268）：删档随会话清理快照定时器
        Save.remove(d.slot); UI.renderStart();
      }
    },
    /* --- 标签页 / 背包 --- */
    'act-tab': (d) => {
      // v22：支持 "tab:sub" 深链写法（如 shop:bounty 直达坊市·悬赏板）
      const [tab, sub] = String(d.tab || '').split(':');
      const lock = Guide.tabLocked(tab);   // v6：分步解锁
      if (lock) { UI.toast(`尚未解锁 —— ${lock}`); return; }
      if (sub) Game.subTab[tab] = sub;
      UI.closeDrawers();   // v22：移动端切页后收起抽屉，回到内容视图
      if (Game.activeTab !== tab && typeof Ambience !== 'undefined' && Ambience.sfxOn) Ambience.sfx('tab');   // v20 切页轻音
      // v26 页签滚动记忆：离开前记下滚动位置，回到该页时还原（长列表不再从头翻起）
      const tc = UI.el['tab-content'];
      if (tc) Game.scrollMem[Game.activeTab] = tc.scrollTop;
      Game._tabSwitched = true;   // v29：供修炼页仙途条判断「本次渲染是切页」
      Game.activeTab = tab; UI.renderTabs(); UI.renderTabContent();
      if (tc) tc.scrollTop = Game.scrollMem[tab] || 0;
      // v20 情境 BGM：进秘境页/坊市页切换氛围（战斗/剧情情境各自接管）
      if (typeof Ambience !== 'undefined' && Ambience.musicOn && !Battle.active && !Story.active()) {
        Ambience.setMood(tab === 'map' && Game.player && Game.player.dungeon ? 'secret' : tab === 'shop' ? 'market' : 'calm');   // v29 修瑕：箭头函数里 this≠Game，情境 BGM 曾永不切换
      }
      // 面板切换平滑过渡：短暂加动效类，避免生硬跳变
      const box = UI.el['tab-content'];
      if (box) {
        box.classList.remove('tab-switch'); void box.offsetWidth; box.classList.add('tab-switch');
      }
    },
    /** v22 移动端抽屉：道途 / 乾坤袋 面板在 ≤860px 收进侧滑抽屉 */
    'act-drawer': (d) => UI.toggleDrawer(d.panel),
    'act-drawer-close': () => UI.closeDrawers(),
    /** v28 移动端「更多」底部面板 */
    'act-more': () => UI.toggleMore(),
    'act-more-close': () => UI.toggleMore(false),
    'bag-tab': (d) => { Game.bagTab = d.bagtab; UI.renderBag(); },
    'bag-sort': (d) => { Game.bagSort = d.sort; UI.renderBag(); },   // v20 背包排序
    /* --- v4 日志工具 / 一键减负 --- */
    'log-pause': () => Log.togglePause(),
    'log-clear': () => Log.clear(),
    'log-filter': (d) => Log.setFilter(d.tf || null),   // v20 类型过滤
    'stat-detail': (d, el) => UI.statDetail(el.dataset.stat),   // v20 属性构成明细
    'act-career': () => UI.careerModal(),   // v20 生涯统计
    /* --- v14 日志折叠 --- */
    'log-toggle': () => Log.toggleCollapse(),
    'act-sell-common': () => ShopSys.sellCommon(),
    'act-use-low-pills': () => Bag.autoUseLowPills(),
    /* --- v5 氛围音效面板 --- */
    'amb-panel': () => { const el = document.getElementById('amb-panel'); if (el) el.classList.toggle('hidden'); if (typeof Ambience !== 'undefined' && Ambience.syncRushPref) Ambience.syncRushPref(); },   // v36（E205）：打开面板回读聚灵偏好显示值
    /* --- v6 成就图鉴 / 挂机 / 存档导出导入 --- */
    'act-codex': () => UI.achvModal(),
    'act-figures': () => QuestSys.openArchive('figures'),
    'act-battle-review': () => {
      const hist = Battle.history || [];
      if (!hist.length) { UI.toast('尚无战斗记录——先去打一场'); return; }
      // v23：最近三场切换查看（最新一场默认展开）
      const sec = (h, i, open) => `<details class="fold" ${open ? 'open' : ''}>
        <summary>第${['一', '二', '三'][i] || i + 1}场 · ${Utils.esc(h.foe || '?')} · ${h.won ? '胜' : '负/遁'}</summary>
        <div style="max-height:38vh;overflow:auto">${(h.logs || []).map(l => `<div class="tip-line">· ${typeof l === 'string' ? l : l.html}</div>`).join('') || '<div class="tip-line">（无记录）</div>'}</div></details>`;
      UI.popup({ title: '⚔ 战斗回顾 · 最近三场', html: hist.map((h, i) => sec(h, i, i === 0)).join(''), options: [{ text: '合 上', value: true, primary: true }] });
    },
    'codex-tab': (d) => { UI._achvTab = d.t; if (!UI.el['popup-modal'].classList.contains('hidden')) UI.el['popup-body'].innerHTML = UI.achvBody(); },
    'act-auto-open': () => AutoCult.open(),
    'act-auto-stop': () => { if (AutoCult.active) AutoCult.finish('道友叫停'); },
    'save-export': () => UI.exportSave(),
    'save-import': () => UI.importSave(),
    /* --- 修炼 --- */
    'act-cultivate': () => Cultivate.normal(),
    'act-rest': () => Cultivate.rest(),
    'act-seclude': () => Cultivate.seclude(),
    'act-wudao': () => Cultivate.wuDao(),   // v32（D5）：悟道——感悟的主动出口
    'act-breakthrough': () => Cultivate.breakthrough(),
    'act-ascend': () => Cultivate.ascend(),
    /* --- v31 仙界四阶 --- */
    'act-xian-enter': () => XianSys.enterFirst(),
    'act-xian-advance': () => XianSys.advanceLayer(),
    'act-xian-trib': () => XianSys.trib(),
    /* --- 游历 --- */
    'act-explore': (d) => Explore.go(d.map),
    'act-explore-multi': (d) => Explore.goMulti(d.map, 5),   // v23 连续探索
    'act-tower-enter': () => TowerSys.enter(),
    'act-tower-resume': () => TowerSys.resume(),
    'act-tower-quit': () => TowerSys.leave(),
    'act-tower-buy': () => TowerSys.buyExtra(),
    'act-buy-multi': (d) => ShopSys.buyMulti(d.item, 5),   // v23 批量购买
    /* --- 坊市 --- */
    'act-buy': (d) => ShopSys.buy(d.item),
    'act-sell': (d) => ShopSys.sell(d.item, d.qty === 'all'),
    'act-convert': (d) => ShopSys.convert(d.dir),
    'act-convert-multi': (d) => ShopSys.convertMulti(d.dir, 10),   // v37（E236）：×10 连兑（不足自停）
    'act-convert-all': () => ShopSys.convertAll(),   // v37（E236）：全兑（低→中→高，零头自留）
    /* --- 宗门 --- */
    'act-wenjian': () => RankSys.challengeAhead(),   // v37（E244）：天骄榜问剑夺位（日限一次，胜则榜序对调）
    'act-join': async (d) => {
      const sect = GameData.SECTS.find(s => s.id === d.sect);
      const ok = await UI.popup({
        title: '拜入宗门',
        html: `确定拜入 <b>${sect.name}</b> 吗？<br>${sect.bonusText}。<br><span class="neg">一旦拜入，终身不可改投。</span>`,
        options: [{ text: '焚香拜入', value: true, primary: true }, { text: '再想想', value: false }],
      });
      if (ok) SectSys.join(d.sect);
      else {
        // v37（E237）：拒绝拜入即熄灭散修红点（单键 sectDeclined；后续仍可从宗门页自行拜入）
        Game.player.flags = Game.player.flags || {};
        Game.player.flags.sectDeclined = true;
        UI.toast('江湖路远，散修亦自有散修的活法');
      }
    },
    'act-task-claim': (d) => SectSys.claim(Number(d.i)),
    // v37（E242）：act-task-submit 随宗门 collect 提交流一并删除（采集差事归悬赏板）
    'act-exchange': (d) => SectSys.exchange(Number(d.i)),
    /** v28 联动：宗门听讲一日——贡献 300 兑感悟 +8（日限一次；感悟满溢自动化作修为）
     *  v34（A2）：补 Time.add(1)——文案「听讲一日」此前却零时耗，白占同一天的修炼产出 */
    'act-sect-listen': () => {
      const p = Game.player;
      if (!p.sect) return;
      const today = Math.floor(p.day || 0);
      if (p.listenDay === today) { UI.toast('今日已听讲，明日再来'); return; }
      if (p.sect.contrib < 300) { UI.toast('贡献点不足'); return; }
      p.sect.contrib -= 300;
      p.listenDay = today;
      const before = p.insight || 0;
      Cultivate.addInsight(p, 8);
      Log.add(`你随长老听讲经义一日${before >= 100 ? '，感悟圆融，余韵化作修为。' : '，顿悟处不少。（突破感悟 +8）'}`, 'gain');
      Time.add(1);
      if (p.dead) return;
      Game.afterAction();
    },
    /* --- 功法 --- */
    'act-study': (d) => GongfaSys.study(d.gf),
    'act-learn': (d) => GongfaSys.learn(d.item),
    /* --- 背包物品 --- */
    'act-use': (d) => Bag.use(d.item),
    'act-use-multi': (d) => Bag.useMulti(d.item, 5),   // v20 丹药批量服用
    'act-equip': (d) => Bag.equip(d.item),
    'act-unequip': (d) => Bag.unequip(d.slot),
    'act-drop': (d) => Bag.drop(d.item),
    'act-drop-cat': (d) => Bag.dropCategory(d.cat),
    /* --- 菜单 --- */
    'act-save-open': () => UI.saveModal(),
    'act-save': (d) => {
      if (!Game.player) return;
      const slot = Number(d.slot);
      Game.slot = slot;
      Save.write(slot, Game.player);
      Meta.load();   // v31 修瑕（E28）：切槽保存后重载成就图鉴——原 Meta.data 仍是旧槽内容，其后 Meta.save 把成就写进新槽分叉
      UI.toast(`已保存至存档位 ${['一', '二', '三'][slot - 1]}`);
      UI.refreshSaveBody();
    },
    'act-load': async (d) => {
      if (!Game.player) { Game.loadFrom(d.slot); return; }
      UI.closePopup(); // 先关掉存档弹窗，再弹确认框
      const ok = await UI.popup({ title: '读取存档', html: '读取后当前未保存的进度将丢失，确定吗？', options: [{ text: '读取', value: true }, { text: '取消', value: false }] });
      if (ok) Game.loadFrom(d.slot);
    },
    'act-delete-save': async (d) => {
      // v24 确认统一：删除存档补二次确认（与开始界面 st-delete 对齐）
      const idx = Number(d.slot);
      const ok = await UI.popup({
        title: '删除存档',
        html: `将删除 <b>存档位${['一', '二', '三'][idx - 1] || idx}</b> 的存档——此档一删，仙途尽消，确定吗？`,
        options: [{ text: '删 除', value: true, primary: true }, { text: '取 消', value: false }],
      });
      if (!ok) return;
      Save.remove(d.slot);
      UI.toast('已删除该存档');
      UI.refreshSaveBody();
    },
    'act-help': () => UI.helpModal(),
    'act-tutorial-replay': () => { UI.closePopup(); Tutorial.show(true); },   // v31：重看新手引导（不影响进度）   // v24：玩法手册（三分钟清单并入首节）
    'act-newgame': async () => {
      const ok = await UI.popup({ title: '离开游戏', html: '当前进度已自动保存。确定回到开始界面吗？', options: [{ text: '离开', value: true }, { text: '取消', value: false }] });
      if (ok) Game.exitToStart();
    },
    /* --- 战斗 --- */
    'bt-attack': () => Battle.active && Battle.act('attack'),
    'bt-combo': () => Battle.active && Battle.act('combo'),   // v30：人兽合击
    'bt-ult': (d) => Battle.active && Battle.actUlt(d.ult),
    'bt-info': () => Battle.infoCard(),
    'bt-skill': (d) => Battle.active && Battle.act('skill', d.gf),
    'bt-item': (d) => Battle.active && Battle.act('item', d.item),
    'bt-defend': () => Battle.active && Battle.act('defend'),
    'bt-flee': () => Battle.active && Battle.act('flee'),
    'bt-menu': (d, el) => { if (Battle.active) { Battle.active.menu = d.menu; Battle.render(); } },
    'bt-back': () => { if (Battle.active) { Battle.active.menu = null; Battle.render(); } },
    'bt-autocfg': () => Battle.autoCfgPopup(),   // v20 自动战斗策略
    'bt-benming': (d) => Battle.active && Battle.actBenming(d.k),   // v20 本命觉醒战技
    'act-salvage': (d) => Bag.salvage(d.item),   // v20 装备分解
    'act-beast-dispatch': (d) => BeastSys.dispatch(Number(d.uid)),   // v20 灵兽派遣
    'act-beast-trip-claim': (d) => BeastSys.claimTrip(Number(d.uid)),   // v20 寻宝归来
    'act-arena': () => BeastSys.arena(),   // v20 斗兽场
    'act-arena-champ': () => BeastSys.champFight(),   // v38（E313）：斗兽擂主战
    'act-beast-breed': (d) => BeastSys.breed(Number(d.uid)),   // v38（E303）：灵兽结契繁育
    'act-beast-hatch': () => BeastSys.hatchEgg(),   // v38（E303）：灵蛋破壳
    /* --- v20 出战技能盘 --- */
    'act-deck-toggle': (d) => {
      const p = Game.player;
      if (!p.battleDeck) p.battleDeck = [];
      const i = p.battleDeck.indexOf(d.gf);
      if (i >= 0) { p.battleDeck.splice(i, 1); UI.toast('已移出战盘'); }
      else if (p.battleDeck.length >= 4) { UI.toast('战盘已满四招——先移出再入', true); return; }
      else { p.battleDeck.push(d.gf); UI.toast('已入出战战盘'); }
      Game.afterAction();
    },
    /* --- v38（E315）：技能盘双预设——「存入守盘」与「攻⇄守切换」 --- */
    'act-deck-save': () => {
      const p = Game.player;
      const cur = Array.isArray(p.battleDeck) ? p.battleDeck : [];
      if (!cur.length) { UI.toast('当前战盘为空，无从存录'); return; }
      p.battleDeckAlt = cur.slice();
      UI.toast('当前配置已存入「守」盘——「攻⇄守」一键切换随时可用');
      Game.afterAction();
    },
    'act-deck-swap': () => {
      const p = Game.player;
      const cur = Array.isArray(p.battleDeck) ? p.battleDeck.slice() : [];
      const alt = Array.isArray(p.battleDeckAlt) ? p.battleDeckAlt.slice() : null;
      if (!alt || !alt.length) { UI.toast('尚未存录「守」盘——先以「存入守盘」落定一套配置'); return; }
      p.battleDeck = alt;
      p.battleDeckAlt = cur;
      UI.toast('攻守易势——出战技能盘已切换');
      Game.afterAction();
    },
    /* --- v13 战斗：自动 / 速度 / 驯服 --- */
    'bt-auto': () => {
      const B = Battle.active;
      if (!B || B.over) return;
      B.auto = !B.auto;
      // v38（E326）：开关跨战斗记忆——偏好写入 autoCfg 同 key
      Battle.autoCfg().auto = B.auto;
      Battle.saveAutoCfg();
      Log.add(B.auto ? '【自动战斗】开启——你心神沉入本能，招式自行流转。' : '【自动战斗】关闭——你重新执掌每一招。', 'system');
      Battle.render();
      if (B.auto && !B.busy) Battle.autoNext();
    },
    'bt-speed': () => { Battle.setSpeed(Battle.speed >= 3 ? 1 : Battle.speed + 1); },
    'bt-ning': () => Battle.actNingshen(),   // v32（C7）：凝神——战意/真元互转与净化
    'bt-burst': () => Battle.actBurst(),   // v38（E308）：战意爆发——满战意主动兑现一击
    'bt-tame': () => { if (typeof BeastSys !== 'undefined' && BeastSys.tame) BeastSys.tame(); else UI.toast('此兽野性难驯'); },
    /* --- 大道 / 天劫 / 因果 / 百艺（增量扩展） --- */
    'act-dao-open': () => DaoSys.openModal(),
    'dao-pick': (d) => DaoSys.pick(d.dao),
    'act-dao-change': () => DaoSys.changeDao(),
    'act-gongfa-create': () => GongfaSys.createCustom(),   // v38（E301）：自创功法「悟法」开炉
    'act-oath-open': () => OathSys.open(),   // v38（E306）：天道誓言
    'act-oath-take': (d) => OathSys.take(d.oath),
    'act-oath-break': (d) => OathSys.breakOath(d.oath),
    'act-title-open': () => UI.titleModal(),   // v38（E340）：称号录
    'act-title-wear': (d) => {
      const p = Game.player;
      const t = (GameData.TITLES || []).find(x => x.id === d.id);
      if (!t) return;
      if (t.cond && !t.cond(p)) { UI.toast('此称号的条件尚未达成'); return; }
      p.title = p.title === t.id ? null : t.id;
      if (p.title) Game.milestone('msTitle', '初 佩 称 号', '#e8d9a0');   // v38（E328）里程碑
      Log.add(p.title ? `你将【${t.name}】之名悬于身侧——江湖相见，先见其名。` : '你摘下了称号——大隐于市，返璞归真。', 'system');
      Game.afterAction();
    },
    'act-sect-drill': () => SectSys.qingyunDrill(),   // v38（E337）：青云剑冢演武
    'act-sect-delegate': (d) => SectSys.delegate(Number(d.i)),   // v38（E344）：亲传代行差事
    'act-sect-council': (d) => SectSys.councilVote(d.c),   // v38（E344）：长老季议
    'act-yiwn': () => CaveSys.drillTrain(),   // v38（E338）：演武场每日一演
    'act-court-claim': (d) => XianSys.claimTask(Number(d.i)),   // v38（E309）：仙庭差遣领赏
    'act-court-buy': (d) => XianSys.courtBuy(Number(d.i)),   // v38（E309）：仙市易物
    'bt-xianbing': () => Battle.xianbing(),   // v38（E309）：仙兵借用（每战一次）
    'act-tower-auto': () => TowerSys.toggleAuto(),   // v38（E324）：登天塔连战
    'trib-strategy': (d) => Tribulation.choose(d.strategy),
    'trib-stage': (d) => Tribulation.chooseStage(d.stage),   // v38（E304）：三段劫势——应/避/御逐重应对
    'trib-borrow': () => Tribulation.borrow(),   // v30：借天运
    'act-cave-dongtian': () => CaveSys.upgradeDongtian(),   // v30：洞天营造
    'act-slay': () => KarmaSys.slayCorpses(),
    'quest-side': (d) => QuestSys.claimSide(d.side),
    'quest-bonus': (d) => QuestSys.claimBonus(d && d.ch),   // v24/v27 章助缘领赏（支持跨章补领，无参=当前章）
    'quest-gate-shadow': () => QuestSys.rebattleGateShadow(),   // v30：门前影重战（战败不再永锁终章）
    'act-tower-redeem': (d) => TowerSys.redeem(d.k),   // v30：塔绩兑换所
    'act-sign': () => DailySign.draw(),
    'act-alchemy': (d) => CraftSys.alchemy(d.recipe),
    'act-study-recipe': (d) => CraftSys.studyRecipe(d.recipe),
    'act-alchemy-multi': (d) => CraftSys.alchemy(d.recipe, Number(d.times) || 5),
    'craft-fire': (d) => CraftSys.setFire(d.fire || null),   // v26 火候选择
    'act-draw': () => CraftSys.drawTalisman(),
    /* --- v13 祭炼强化 / 炼器 --- */
    'act-enhance': (d) => ForgeSys.enhance(d.slot),
    'act-enhance-multi': (d) => ForgeSys.enhanceMulti(d.slot, 5),   // v31：连祭炼×5
    'act-recast': (d) => ForgeSys.recast(d.slot),   // v30：器魂重铸
    'act-reroll': (d) => ForgeSys.reroll(d.slot),
    'act-forge': (d) => ForgeSys.forge(d.recipe),
    'act-forge-frag': (d) => ForgeSys.forge(d.recipe, true),   // v32（E6）：器胚残片入炉
    'act-forge-iron': (d) => ForgeSys.forge(d.recipe, false, Number(d.extra) || 0),   // v38（E317）：添料锻造（配比倾向）
    'act-cave-flag': (d) => CaveSys.toggleFlag(Number(d.idx)),   // v38（E305）：阵眼布设/取旗
    'act-craft-experiment': () => CraftSys.experiment(),   // v38（E317）：以药试方
    'act-avatar-toggle': () => AvatarSys.toggle(Game.player),   // v38（E302）：化身凝形/归窍
    'act-avatar-up': () => AvatarSys.upgrade(Game.player),   // v38（E302）：神识晋级
    'act-avatar-task': (d) => AvatarSys.setTask(Game.player, d.task, Number(d.slot) || 1),   // v38（E302）：化身差事
    'act-set-refine': (d) => ForgeSys.refineSet(d.set),   // v32（E4）：套装炼化
    /* --- v13 洞府 / 灵兽 --- */
    'act-cave-up': () => CaveSys.upgrade(),
    'act-spirit-rush': () => CaveSys.spiritRush(),   // v20 聚灵加速
    // v37（E271）：act-wudao 重复键删除（保留修炼页首定义——同一 actions 字面量后键覆盖前键，
    // 二者实现又完全相同，属「静默自愈」式重复；check-actions 重复键静态检测放 B8 防复发）
    'act-cave-plant': (d) => CaveSys.plant(Number(d.i)),
    'act-cave-harvest': (d) => CaveSys.harvest(Number(d.i)),
    'act-cave-water': (d) => CaveSys.water(Number(d.i)),
    'act-cave-care': () => CaveSys.careAll(),   // v34（F1）：一键照料
    'act-cave-pest': (d) => CaveSys.removePest(Number(d.i)),
    'act-beast-active': (d) => BeastSys.setActive(Number(d.uid)),
    'act-beast-active2': (d) => BeastSys.setActive2(Number(d.uid)),
    'act-beast-pat': (d) => BeastSys.pat(Number(d.uid)),
    'act-beast-tactic': (d) => BeastSys.cycleTactic(Number(d.uid)),   // v32（C4）：协战策略三选
    'act-beast-evolve': (d) => BeastSys.evolve(Number(d.uid)),
    'act-cave-build': (d) => CaveSys.upgradeBuild(d.b),
    'act-benming-feed': () => ForgeSys.feedBenming(),
    'act-xinmo': () => XinmoSys.start(),
    'act-beast-feed': (d) => BeastSys.feed(Number(d.uid)),
    'act-beast-feed-multi': (d) => BeastSys.feedMulti(Number(d.uid)),   // v37（E235）：连喂五枚（不足/十阶自停）
    'act-beast-free': (d) => BeastSys.free(Number(d.uid)),
    /* --- v13 悬赏 / 黑市 --- */
    'act-bounty-submit': (d) => BountySys.submit(Number(d.i)),
    'act-bounty-claim': (d) => BountySys.claim(Number(d.i)),
    'act-black-buy': (d) => BlackSys.buy(d.item),
    'act-black-mystery': () => BlackSys.buyMystery(),
    'act-bid': (d) => AuctionSys.bid(d.mode),
    'act-donate': (d) => DonateSys.donate(d.d),
    'act-sect-command': () => SectSys.command(),
    /* --- v3 秘境 --- */
    'act-realm-enter': (d) => DungeonSys.enter(Number(d.realm)),
    'act-realm-node': (d) => DungeonSys.resolve(Number(d.node)),
    'act-realm-retreat': () => DungeonSys.retreat(),
    'act-dungeon-purify': (d) => DungeonSys.purify(d.mut),   // v38（E307）：净化一条秘境异变
    'act-realm-synth': () => DungeonSys.synth(),
    /* --- v3 江湖 --- */
    'npc-befriend': (d) => NpcSys.befriend(d.npc),
    'npc-gift': (d) => NpcSys.gift(d.npc),
    'npc-discuss': (d) => NpcSys.discuss(d.npc),
    'npc-line': (d) => PersonalSys.play(d.npc),
    'npc-spar': (d) => NpcSys.spar(d.npc),
    'npc-betray': (d) => NpcSys.betray(d.npc),
    'npc-swear': (d) => NpcSys.swear(d.npc),
    'npc-dao': (d) => NpcSys.becomeDao(d.npc),
    'npc-peace': (d) => NpcSys.peacemake(d.npc),
    'npc-showdown': (d) => NpcSys.showdown(d.npc),   // v20 雷台了断
    'npc-learnfrom': (d) => NpcSys.learnFrom(d.npc),   // v20 三胜指点
    /* --- v20 道侣共修（行动收尾自动触发） --- */
    /* --- v3 派系 --- */
    'act-faction-join': (d) => SectSys.joinFaction(d.f),
    'act-faction-exchange': (d) => SectSys.factionExchange(Number(d.i)),
    'act-danger-go': (d) => SectSys.goDanger(Number(d.i)),
    'act-tourney-fight': () => SectSys.tourneyFight(),   // v22 宗门大比登台
    'act-daily-all': () => Guide.dailyAll(),   // v22 一键日常
    /* --- v3 世界大事件 --- */
    'act-event-join': () => WorldSys.joinEvent(),
    'act-event-skip': () => WorldSys.skipEvent(),
    /* --- v3 兵解转世 --- */
    'act-reincarnate': () => ReincarnationSys.open(),
    // v32 修瑕（A6）：兵解之念可收回——原飞升弹窗误点「兵解」即无反悔口（仙阶卡被永久隐藏）
    'act-reinc-dismiss': () => {
      const p = Game.player;
      if (!p || !p.canReincarnate) return;
      p.canReincarnate = false;
      Log.add('你收起兵解之念——此世道途未尽，仙阶之路仍在脚下。', 'system');
      UI.toast('已收起兵解之念');
      Game.afterAction();
    },
    /* --- 弹窗 / 引导 --- */
    'pop-choice': (d) => UI.popupChoose(Number(d.i)),
    'tut-next': () => Tutorial.next(),
    'tut-prev': () => Tutorial.prev(),
    'tut-skip': () => Tutorial.finish(),
    /* --- v15 剧情 --- */
    'story-next': () => Story.next(),
    'story-choice': (d) => Story.choose(Number(d.storyChoice)),
    'story-battle': () => Story.startBattle(),
    'story-close': () => Story.close(),
    'story-skip': () => Story.skip(),
    'story-auto': () => Story.toggleAuto(),
    'quest-review': () => QuestSys.openArchive(),
    'quest-archive-tab': (d) => { UI.closePopup(); QuestSys.openArchive(d.tab); },
    'quest-reread': (d) => QuestSys.reread(d.sid),
    'quest-goto': (d) => {
      // v26：切页后滚动定位到目标卡片并鎏金闪光（锚点来自 data-anchor / QuestSys.GO_ANCHOR）
      Game.actions['act-tab']({ tab: d.tab });
      UI.glimmer(d.anchor);
    },
  },
};

document.addEventListener('DOMContentLoaded', () => Game.init());
