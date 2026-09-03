# 凡人问道 · 文字修仙

网页版文字修仙放置游戏。零依赖、纯前端：HTML + CSS + 原生 JavaScript，美术为程序化 SVG，音效为 Web Audio 合成。

## 仓库与同步

- **GitHub**: https://github.com/sjh328/fanren-wendao （origin，推送走本地代理 127.0.0.1:7897）
- **Gitee**: https://gitee.com/sunjihao0328/fanren-wendao （gitee，令牌内嵌免认证）
- 本仓库装有 `post-commit` 钩子：**每次 commit 后自动推送双仓库**（推送失败只告警不阻断，下次 commit 自动重试）。
  GitHub 直连易被重置——手动推送时请使用：`git -c http.proxy=http://127.0.0.1:7897 push`

## 快速开始

```bash
# 方式一：一键启动（自动起服并打开浏览器）
启动游戏.bat        # Windows
./start.sh          # macOS / Linux

# 方式二：手动
node server.mjs     # http://localhost:8341/index.html
```

## 测试

测试为 puppeteer-core 驱动真实 Chrome 的 E2E 回归（需先启动 `node server.mjs`，并保证本机装有 Chrome）：

```bash
npm run test:all    # 九套脚本全量回归（330+ 断言，随版本增长）
npm run test:v8     # 单独运行某一版本专项
```

## 代码结构（v19 阶段十起：模块化源码 + 单体产物）

```
js/          ★ 开发源码（48 个模块，按 scripts/modules.json 顺序拼接）
  core/      基建：utils/anim/art/narrative/ambience/meta/achieve/guide/autocult/codex
             /log/save/player-factory/stat/time
  data/      game-data.js（静态数据 + 剧情脚本库）
  systems/   玩法系统 25+：cultivate/gongfa/bag/forge/cave/beast/shop/sect/explore
             /dao/karma/daoxin/auction/xinmo/craft/tribulation/world/bounty/black
             /rank/npc/dungeon/reincarnation/status-fx…
  battle/    battle.js（战斗）
  ui/        tutorial/story/quest/ui/start-screen
  game.js    Game 主控（动作分发/初始化）
game.js      ★ 构建产物（由 js/ 拼接生成，逐字节可复现；index.html 引用不变）
style.css    宣纸水墨主题（按版本增量分区块）
index.html   唯一入口（引用 game.js?v=N，改版时递增 N 清缓存）
server.mjs   本地静态服务器（:8341，no-cache）
verify-*.mjs puppeteer E2E 回归脚本（npm test:xxx）
scripts/     build.mjs（安全构建：缺失即失败→语法校验→备份→写盘）
attic/       归档区（gitignore）：v18 半成品模块化遗留，见 attic/README.md
```

### 开发流程

```bash
# 1. 编辑 js/ 下的模块（不要直接改 game.js——它是产物）
# 2. 重建产物（缺失模块会拒绝构建；产物先过 node --check 再覆盖，覆盖前自动备份）
node scripts/build.mjs
# 3. 跑回归
npm run test:all
```

## 架构速览

- **事件分发**：全部按钮带 `data-action`，`Game.actions` 表统一路由（约 90+ 动作）。
- **渲染**：`UI.renderAll` 按 `_dirty` 脏标记分区渲染，`setHTML` 内容比对去重。
- **时间**：无全局 tick，动作内 `Time.add(N)` 推进游戏日；跨年触发世界事件与 NPC 成长。
- **存档**：localStorage（3 手动槽 + auto + 突破前 bak 回溯槽），双写校验；
  `PlayerFactory.migrate` 按版本链迁移，老档无损。
- **剧情**：`Story` 演出引擎 + `GameData.STORIES` 九章主线（open/mid/end 三段式）+
  支线奇遇录；v19 起支持 battle/investigate/montage 场景与抉择后果旗标。

## 开发约定

1. 改动 `game.js` / `style.css` 后递增 `index.html` 的 `?v=` 缓存号。
2. 新增玩家字段必须同步 `PlayerFactory.create()` 与 `migrate()`（追加 MIGRATE_STEPS）。
3. 每个版本阶段收尾跑 `npm run test:all`，保持 0 控制台错误。
4. 版本更新日志写入 `UPDATE_NOTES_V<N>.md`。
