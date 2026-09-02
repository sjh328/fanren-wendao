# 凡人问道 · 文字修仙

网页版文字修仙放置游戏。零依赖、纯前端：HTML + CSS + 原生 JavaScript，美术为程序化 SVG，音效为 Web Audio 合成。

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
npm run test:all    # 七套脚本全量回归（约 260+ 断言）
npm run test:v8     # 单独运行某一版本专项
```

## 代码结构（v19 起）

```
game.js      ★ 唯一现役代码（单体）。顶层按系统分区：Utils/Art/Ambience/…
               → GameData（静态数据+剧情脚本）→ 各系统 → Battle → Story/QuestSys
               → UI → Game（动作分发/初始化）。直接编辑本文件。
style.css    宣纸水墨主题（按版本增量分区块）
index.html   唯一入口（引用 game.js?v=N，改版时递增 N 清缓存）
server.mjs   本地静态服务器（:8341，no-cache）
verify-*.mjs puppeteer E2E 回归脚本（npm test:xxx）
scripts/     辅助脚本
attic/       归档区（gitignore）：v18 半成品模块化 + 旧构建脚本，见 attic/README.md
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
