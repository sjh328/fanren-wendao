'use strict';

/* ======================================================================
 * 《凡人问道》—— 网页版文字修仙游戏
 * 技术栈：HTML + CSS + 原生 JavaScript（零依赖，纯前端）
 *
 * 模块索引（按出现顺序）：
 *   §1   工具函数      Utils
 *   §2   静态数据      GameData（境界 / 物品 / 功法 / 怪物 / 地图 / 宗门 / 商店 / 文案）
 *   §3   日志系统      Log
 *   §4   存档系统      Save
 *   §5   玩家模型      PlayerFactory
 *   §6   属性计算      Stat
 *   §7   时间系统      Time
 *   §8   修炼系统      Cultivate
 *   §9   功法系统      GongfaSys
 *   §10  背包系统      Bag
 *   §11  商店系统      ShopSys
 *   §12  宗门系统      SectSys
 *   §13  探索/随机事件  Explore / EventSys
 *   §14  战斗系统      Battle
 *   §15  新手引导      Tutorial
 *   §16  界面渲染      UI
 *   §17  游戏主控      Game（动作分发 / 初始化）
 * 增量扩展（v2）：
 *   §19  大道职业体系  DaoSys（六道择一 / 转道重修）
 *   §20  气运因果      KarmaSys（气运 / 孽障 / 斩三尸 / 仇家偷袭 / 红尘劫）
 *   §21  百艺坊        CraftSys（炼丹 / 画符）
 *   §22  天劫渡劫      Tribulation（大境界突破三策博弈）
 * 增量扩展（v3）：
 *   §23  世界大事件    WorldSys（百年大事 / 魔域 / 讲道 / 宗门大战）
 *   §24  动态NPC恩怨   NpcSys（十五常驻修士 / 恩怨偷袭 / 结交道侣 / 背刺）
 *   §25  肉鸽秘境      DungeonSys（随机节点路线 / 撤离 / 失传功法 / 本命法宝）
 *   §26  兵解转生      ReincarnationSys（多周目 / 轮回印记 / 前世恩怨）
 * 增量扩展（v4 体验优化）：
 *   §1.5 数字滚动动画  Anim（修为 / 灵石 / 血量缓动滚动，不直接跳字）
 *   交互反馈：按钮按压/悬浮增强；突破、稀有、胜负居中淡入公告（UI.announce）
 *   日志升级：四级染色 / 暂停滚动 / 一键清空 / 金色日志置顶高亮 3 秒
 *   进度可视：突破预估成功率分解；背包按品质排序并按品级描边
 *   一键减负：出售凡品（ShopSys.sellCommon）/ 低阶丹药补满（Bag.autoUseLowPills）
 *             / 闭关至下一小境界自动出关（Cultivate.secludeLoop）
 * 增量扩展（v5 沉浸感）：
 *   §1.7 职业专属叙事  Narrative（历练/战斗/渡劫/待人 文案随六道而变，数值不变）
 *   §1.8 氛围音效      Ambience（WebAudio 合成：突破/稀有/胜利音效 + 古琴背景乐，默认关）
 *   境界突破演出       UI.realmShow（全屏境界色微光 + 20~30字描写渐显，失败红光）
 *   动态世界细节       顶栏年/月/日（Time.labelLong）；坊市每30日刷新行情±20%
 *                      （WorldSys.marketMul）；NPC 旬轮换行游（NpcSys.isAway/wander）
 * ====================================================================== */

/* ======================================================================
 * §1 工具函数
 * ====================================================================== */
const Utils = {
  rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
  randF(min, max) { return Math.random() * (max - min) + min; },
  chance(p) { return Math.random() * 100 < p; },
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
  /** 从 [{..., weight}] 或 {key: weight} 中按权重随机取一项 */
  pickWeighted(list) {
    const entries = Array.isArray(list)
      ? list.map(x => [x.id ?? x, x.weight ?? 1])
      : Object.entries(list);
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [v, w] of entries) { r -= w; if (r <= 0) return v; }
    return entries[entries.length - 1][0];
  },
  clamp(v, min, max) { return Math.max(min, Math.min(max, v)); },
  /** 大数简写：12345 -> 1.2万 */
  fmtNum(n) {
    n = Math.round(n);
    if (Math.abs(n) < 10000) return String(n);
    if (Math.abs(n) < 100000000) {
      const v = (n / 10000).toFixed(1).replace(/\.0$/, '');
      return v + '万';
    }
    return (n / 100000000).toFixed(2).replace(/\.?0+$/, '') + '亿';
  },
  esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  /** 获取装备槽中的物品ID（兼容旧版 string 与新版 {id, enhance}） */
  eqId(eq) { return eq ? (typeof eq === 'string' ? eq : eq.id) : null; },
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
  now() { return new Date().toLocaleString('zh-CN', { hour12: false }); },
  /** 稳定字符串哈希（v5：坊市行情 / NPC 行游轮换用，同输入同输出） */
  hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; },
};
