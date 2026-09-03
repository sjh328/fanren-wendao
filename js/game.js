
const Game = {
  player: null,
  slot: null,
  activeTab: 'cultivate',
  bagTab: 'all',

  init() {
    UI.cache();
    Log.init();
    Ambience.init();   // v5：氛围音效（默认关，读回上次的开关偏好）
    UI.renderStart();
    // 全局事件委托：所有 data-action 统一分发
    document.addEventListener('click', async (e) => {
      const el = e.target.closest('[data-action]');
      if (!el || el.disabled) return;
      const fn = this.actions[el.dataset.action];
      if (fn) {
        try { await fn(el.dataset, el); }
        catch (err) { console.error('动作执行出错:', el.dataset.action, err); UI.toast('操作出了点问题，请重试', true); }
      }
    });
    // 氛围面板：点击面板以外区域自动收起
    document.addEventListener('click', (e) => {
      const ctrl = document.getElementById('amb-ctrl');
      const panel = document.getElementById('amb-panel');
      if (panel && !panel.classList.contains('hidden') && ctrl && !ctrl.contains(e.target)) panel.classList.add('hidden');
    });
    // v7：背包双击快捷操作（服用 / 装备 / 学习；丢弃按钮除外）
    document.addEventListener('dblclick', (e) => {
      const item = e.target.closest('.bag-item');
      if (!item) return;
      const btn = [...item.querySelectorAll('.bag-item-btns .btn')].find(b => !b.classList.contains('btn-danger'));
      if (btn && !btn.disabled) btn.click();
    });
    // 键盘：ESC 依次收起 弹窗（按取消）→ 氛围面板 → 大道弹窗；战斗中 1~5 快捷出手
    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement && document.activeElement.tagName) || '');
      if (Story.active()) {   // v15：剧情演出中屏蔽快捷键（Enter/空格推进剧情）
        if (e.key === 'Enter' || e.key === ' ') {
          const sc = Story.cur && Story.cur.scenes[Story.cur.idx];
          if (!sc || sc.t !== 'choice') { Story.next(); e.preventDefault(); }
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
      const amb = document.getElementById('amb-panel');
      if (amb && !amb.classList.contains('hidden')) { amb.classList.add('hidden'); return; }
      const dao = document.getElementById('dao-modal');
      if (dao && !dao.classList.contains('hidden')) dao.classList.add('hidden');
    });
    // 关页前自动存档
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && Game.player && !Game.player.dead) Save.autoSave(true);
    });
    window.addEventListener('beforeunload', () => {
      if (Game.player && !Game.player.dead) Save.autoSave(true);
    });
    // v18：全局错误捕获
    window.addEventListener('error', (e) => {
      console.error('未捕获的异常:', e.error || e.message);
      // 只给用户一个非侵入式提示，不阻断游戏
      if (Game.player && !e.defaultPrevented) {
        UI.toast('道心微澜，一股无名之气掠过识海（不影响存档）', true);
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
    this.enterGame();
    Log.clear();
    Log.add(`天地灵气复苏之年，凡俗少年 <b>${Utils.esc(name)}</b> 得了一册残缺功法，自此踏上仙途。`, 'system');
    Log.add('（提示：先在后山「游历」磨砺，或就地「修炼」积攒修为。遇到不懂的可点菜单里的「玩法说明」。）', 'info');
    QuestSys.showStory(0);   // v11：主线第一章开篇叙事
    if (!this.player.flags.tutorialDone) Tutorial.show();
    Save.autoSave();
    if (slot !== 'auto') Save.write(slot, this.player);
  },

  loadFrom(key) {
    const data = Save.read(key);
    if (!data || !data.player) { UI.toast('此处没有存档'); return false; }
    if (data.meta && data.meta.dead) { UI.toast('此存档已坐化，无法读取', true); return false; }
    UI.closeOverlays();   // 状态同步：清掉可能残留的战斗 / 弹窗覆盖层
    AutoCult.abort();   // v6
    this.slot = key === 'auto' ? null : key;
    this.player = PlayerFactory.migrate(data.player);
    this.enterGame();
    Log.clear();
    Log.add(`光阴倒流，你回到了 <b>${Time.label(this.player)}</b> 的这一刻。（读档成功）`, 'system');
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
    return true;
  },

  /** v18：离线进度计算——灵田按真实时间生长 */
  computeOfflineProgress() {
    const p = this.player;
    if (!p || p.dead || p.day === 0) return;
    // 读取上次存档的 meta.ts（在 Save.write 中写入）
    const slot = this.slot == null ? 'auto' : this.slot;
    const data = Save.read(slot === 'auto' ? 'auto' : slot);
    if (!data || !data.meta || !data.meta.ts) return;
    const elapsedMs = Date.now() - data.meta.ts;
    if (elapsedMs < 60000) return; // 少于 1 分钟不算离线
    // 按真实时间推算游戏天数（现实 1 分钟 ≈ 游戏 1 天，上限 30 天）
    const realDays = Math.min(30, Math.floor(elapsedMs / 60000));
    // 灵田生长
    let offlineCrops = 0;
    if (p.cave && p.cave.plots) {
      for (const plot of p.cave.plots) {
        if (!plot || !plot.seed) continue;
        const def = GameData.ITEMS[plot.seed];
        if (!def || !def.days) continue;
        // 按离线天数推进生长
        plot.plantedDay = Math.max(plot.plantedDay, p.day - realDays);
        // 收获检查会由下次进入洞府页签时计算
        offlineCrops++;
      }
    }
    if (offlineCrops > 0) {
      Log.add(`你不在的${realDays}个时辰里，灵田中的${offlineCrops}块作物并未荒废——它们仍在生长。`, 'info');
      p.day += realDays;
      p.age += realDays / 365;
    }
  },

  enterGame() {
    Anim.reset();   // v4：换档后数字动画记忆清零
    Meta.load();    // v6：装载本存档位的成就与图鉴
    AutoCult.abort();
    this.computeOfflineProgress();  // v18：离线进度
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    UI.renderAll();
  },

  exitToStart() {
    UI.closeOverlays();   // 状态同步：清掉战斗 / 弹窗等覆盖层，避免遮罩滞留
    AutoCult.abort();   // v6
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
    UI.markDirty('all');
    try { UI.renderAll(); } catch (err) { console.error('渲染异常（不影响存档）:', err); }
    Save.autoSave();
    Achieve.check();   // v6：成就检查（解锁即发奖播报）
    try { QuestSys.check(); } catch (err) { console.error('剧情检查异常:', err); }   // v11：主线推进
    try { DaoxinSys.shadowNudge(p); } catch (err) { console.error('窥伺检查异常:', err); }   // v18：玄影窥伺（软约束）
    // 叩问大道时序：筑基之初，或兵解转世的记忆传承；战斗中则延后
    if (p.pendingDao && !p.dao && !p.dead && !Battle.active
      && (p.realmIdx >= 1 || p.reinc)) {
      p.pendingDao = false;
      DaoSys.openModal();
    }
  },

  async gameOver(reason) {
    const p = this.player;
    if (p.dead) return;
    p.dead = true;
    Save.write('auto', p);   // 直接写盘：autoSave 会跳过已死亡角色，此处须落盘死亡标记
    Log.add('油尽灯枯，你的道途走到了尽头……', 'loss');
    await UI.popup({
      title: '✦ 道消身殒 ✦',
      html: `寿元耗尽，天道无情。<br><br>${Utils.esc(p.name)}，${GameData.REALM_NAMES[p.realmIdx]}${GameData.LAYER_NAMES[p.layer]}修士，享年 ${p.age} 岁。<br><br>此尘缘已了，愿君来世再问大道。`,
      options: [{ text: '重返起点', value: true, primary: true }],
    });
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
    'st-start': () => {
      const name = (document.getElementById('create-name').value || '').trim() || Utils.pick(GameData.NAMES);
      Game.newGame(StartScreen.slot, name, StartScreen.attrs);
    },
    'st-load': (d) => { Game.loadFrom(d.slot); },
    'st-delete': async (d) => {
      const ok = await UI.popup({ title: '删除存档', html: '此档一删，仙途尽消，确定吗？', options: [{ text: '删除', value: true }, { text: '取消', value: false }] });
      if (ok) { Save.remove(d.slot); UI.renderStart(); }
    },
    /* --- 标签页 / 背包 --- */
    'act-tab': (d) => {
      const lock = Guide.tabLocked(d.tab);   // v6：分步解锁
      if (lock) { UI.toast(`尚未解锁 —— ${lock}`); return; }
      Game.activeTab = d.tab; UI.renderTabs(); UI.renderTabContent();
      // 面板切换平滑过渡：短暂加动效类，避免生硬跳变
      const box = UI.el['tab-content'];
      if (box) {
        box.scrollTop = 0;   // v13：切换页签后回到顶部，避免残露上一页签中段内容
        box.classList.remove('tab-switch'); void box.offsetWidth; box.classList.add('tab-switch');
      }
    },
    'bag-tab': (d) => { Game.bagTab = d.bagtab; UI.renderBag(); },
    /* --- v4 日志工具 / 一键减负 --- */
    'log-pause': () => Log.togglePause(),
    'log-clear': () => Log.clear(),
    /* --- v14 日志折叠 --- */
    'log-toggle': () => Log.toggleCollapse(),
    'act-sell-common': () => ShopSys.sellCommon(),
    'act-use-low-pills': () => Bag.autoUseLowPills(),
    /* --- v5 氛围音效面板 --- */
    'amb-panel': () => { const el = document.getElementById('amb-panel'); if (el) el.classList.toggle('hidden'); },
    /* --- v6 成就图鉴 / 挂机 / 存档导出导入 --- */
    'act-codex': () => UI.achvModal(),
    'act-figures': () => QuestSys.openArchive('figures'),
    'act-battle-review': () => {
      const logs = Battle.lastLogs || [];
      if (!logs.length) { UI.toast('尚无战斗记录——先去打一场'); return; }
      UI.popup({ title: '⚔ 战斗回顾 · 上一场', html: `<div style="max-height:52vh;overflow:auto">${logs.map(l => `<div class="tip-line">· ${l}</div>`).join('')}</div>`, options: [{ text: '合 上', value: true, primary: true }] });
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
    'act-breakthrough': () => Cultivate.breakthrough(),
    'act-ascend': () => Cultivate.ascend(),
    /* --- 游历 --- */
    'act-explore': (d) => Explore.go(d.map),
    /* --- 坊市 --- */
    'act-buy': (d) => ShopSys.buy(d.item),
    'act-sell': (d) => ShopSys.sell(d.item, d.qty === 'all'),
    'act-convert': (d) => ShopSys.convert(d.dir),
    /* --- 宗门 --- */
    'act-join': async (d) => {
      const sect = GameData.SECTS.find(s => s.id === d.sect);
      const ok = await UI.popup({
        title: '拜入宗门',
        html: `确定拜入 <b>${sect.name}</b> 吗？<br>${sect.bonusText}。<br><span class="neg">一旦拜入，终身不可改投。</span>`,
        options: [{ text: '焚香拜入', value: true, primary: true }, { text: '再想想', value: false }],
      });
      if (ok) SectSys.join(d.sect);
    },
    'act-task-claim': (d) => SectSys.claim(Number(d.i)),
    'act-task-submit': (d) => SectSys.submit(Number(d.i)),
    'act-exchange': (d) => SectSys.exchange(Number(d.i)),
    /* --- 功法 --- */
    'act-study': (d) => GongfaSys.study(d.gf),
    'act-learn': (d) => GongfaSys.learn(d.item),
    /* --- 背包物品 --- */
    'act-use': (d) => Bag.use(d.item),
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
      UI.toast(`已保存至存档位 ${['一', '二', '三'][slot - 1]}`);
      UI.refreshSaveBody();
    },
    'act-load': async (d) => {
      if (!Game.player) { Game.loadFrom(d.slot); return; }
      UI.closePopup(); // 先关掉存档弹窗，再弹确认框
      const ok = await UI.popup({ title: '读取存档', html: '读取后当前未保存的进度将丢失，确定吗？', options: [{ text: '读取', value: true }, { text: '取消', value: false }] });
      if (ok) Game.loadFrom(d.slot);
    },
    'act-delete-save': (d) => {
      Save.remove(d.slot);
      UI.toast('已删除该存档');
      UI.refreshSaveBody();
    },
    'act-help': () => Tutorial.show(true),
    'act-newgame': async () => {
      const ok = await UI.popup({ title: '离开游戏', html: '当前进度已自动保存。确定回到开始界面吗？', options: [{ text: '离开', value: true }, { text: '取消', value: false }] });
      if (ok) Game.exitToStart();
    },
    /* --- 战斗 --- */
    'bt-attack': () => Battle.active && Battle.act('attack'),
    'bt-ult': (d) => Battle.active && Battle.actUlt(d.ult),
    'bt-info': () => Battle.infoCard(),
    'bt-skill': (d) => Battle.active && Battle.act('skill', d.gf),
    'bt-item': (d) => Battle.active && Battle.act('item', d.item),
    'bt-defend': () => Battle.active && Battle.act('defend'),
    'bt-flee': () => Battle.active && Battle.act('flee'),
    'bt-menu': (d, el) => { if (Battle.active) { Battle.active.menu = d.menu; Battle.render(); } },
    'bt-back': () => { if (Battle.active) { Battle.active.menu = null; Battle.render(); } },
    'bt-autocfg': () => Battle.autoCfgPopup(),   // v20 自动战斗策略
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
    /* --- v13 战斗：自动 / 速度 / 驯服 --- */
    'bt-auto': () => {
      const B = Battle.active;
      if (!B || B.over) return;
      B.auto = !B.auto;
      Log.add(B.auto ? '【自动战斗】开启——你心神沉入本能，招式自行流转。' : '【自动战斗】关闭——你重新执掌每一招。', 'system');
      Battle.render();
      if (B.auto && !B.busy) Battle.autoNext();
    },
    'bt-speed': () => { Battle.setSpeed(Battle.speed >= 3 ? 1 : Battle.speed + 1); },
    'bt-tame': () => { if (typeof BeastSys !== 'undefined' && BeastSys.tame) BeastSys.tame(); else UI.toast('此兽野性难驯'); },
    /* --- 大道 / 天劫 / 因果 / 百艺（增量扩展） --- */
    'act-dao-open': () => DaoSys.openModal(),
    'dao-pick': (d) => DaoSys.pick(d.dao),
    'act-dao-change': () => DaoSys.changeDao(),
    'trib-strategy': (d) => Tribulation.choose(d.strategy),
    'act-slay': () => KarmaSys.slayCorpses(),
    'quest-side': (d) => QuestSys.claimSide(d.side),
    'act-sign': () => DailySign.draw(),
    'act-alchemy': (d) => CraftSys.alchemy(d.recipe),
    'act-study-recipe': (d) => CraftSys.studyRecipe(d.recipe),
    'act-alchemy-multi': (d) => CraftSys.alchemy(d.recipe, Number(d.times) || 5),
    'act-draw': () => CraftSys.drawTalisman(),
    /* --- v13 祭炼强化 / 炼器 --- */
    'act-enhance': (d) => ForgeSys.enhance(d.slot),
    'act-reroll': (d) => ForgeSys.reroll(d.slot),
    'act-forge': (d) => ForgeSys.forge(d.recipe),
    /* --- v13 洞府 / 灵兽 --- */
    'act-cave-up': () => CaveSys.upgrade(),
    'act-cave-plant': (d) => CaveSys.plant(Number(d.i)),
    'act-cave-harvest': (d) => CaveSys.harvest(Number(d.i)),
    'act-cave-water': (d) => CaveSys.water(Number(d.i)),
    'act-cave-pest': (d) => CaveSys.removePest(Number(d.i)),
    'act-beast-active': (d) => BeastSys.setActive(Number(d.uid)),
    'act-beast-active2': (d) => BeastSys.setActive2(Number(d.uid)),
    'act-beast-pat': (d) => BeastSys.pat(Number(d.uid)),
    'act-beast-evolve': (d) => BeastSys.evolve(Number(d.uid)),
    'act-cave-build': (d) => CaveSys.upgradeBuild(d.b),
    'act-benming-feed': () => ForgeSys.feedBenming(),
    'act-xinmo': () => XinmoSys.start(),
    'act-beast-feed': (d) => BeastSys.feed(Number(d.uid)),
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
    /* --- v3 派系 --- */
    'act-faction-join': (d) => SectSys.joinFaction(d.f),
    'act-faction-exchange': (d) => SectSys.factionExchange(Number(d.i)),
    'act-danger-go': (d) => SectSys.goDanger(Number(d.i)),
    /* --- v3 世界大事件 --- */
    'act-event-join': () => WorldSys.joinEvent(),
    'act-event-skip': () => WorldSys.skipEvent(),
    /* --- v3 兵解转世 --- */
    'act-reincarnate': () => ReincarnationSys.open(),
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
    'quest-review': () => QuestSys.openArchive(),
    'quest-archive-tab': (d) => { UI.closePopup(); QuestSys.openArchive(d.tab); },
    'quest-reread': (d) => QuestSys.reread(d.sid),
    'quest-goto': (d) => { Game.actions['act-tab']({ tab: d.tab }); },
  },
};

document.addEventListener('DOMContentLoaded', () => Game.init());
