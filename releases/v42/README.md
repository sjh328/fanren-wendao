# 凡人问道 · 文字修仙

网页版文字修仙放置游戏。零依赖、纯前端：HTML + CSS + 原生 JavaScript，美术为程序化 SVG，音效为 Web Audio 合成。
当前版本 **v42「鼎新」**（大版本——54 条 E（E476~E529）：战斗革故软锁清零+对拼修活胜负判定+战意沸点过山车+词缀境界升档+精英二阶段+连击势点，节奏复权智能挂机逐日补跑+行功路线三选+离线归乡包+挂机续跑+境内顿悟，经济收口 0 价双标统一+寄售五档三格柜台+出价三档个性+纳财卦象化+黑市五日窗+price-audit 清零，旗舰新玩法开辟小世界周目传承+秘境遗物 roguelike+扫荡×5+前世情缘+战斗锦囊三槽，沉浸升档六图专属配色+六道语料 378 句+BGM 意境引擎+打字机呼吸感+成就积分与隐藏成就，UI 换骨二期引导任务化+ui-tip 触屏点亮+冲关卡合一+修炼页随境界生长+本季将临表，详见 `UPDATE_NOTES.md`；
v41「开物」史诗大版本见 `docs/update-notes/UPDATE_NOTES_V41.md`，v40「淬炼」接缝修复与数值校准见 `docs/update-notes/UPDATE_NOTES_V40.md`，v39「贯通」主链接活见 `docs/update-notes/UPDATE_NOTES_V39.md`，更早版本归档在同目录。

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

## 在线版 · Cloudflare Pages 部署（免费）

纯静态站，零构建——Cloudflare Pages 连上仓库即得公开网址，任何设备浏览器可玩：

1. 登录 [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages → 创建 → Pages → 连接到 Git**
2. 授权 GitHub，选中本仓库 `fanren-wendao`
3. 部署配置（新版 Workers 流程）：Project name `fanren-wendao` · **Build command 填
   `node scripts/cf-prepare.mjs`** · Deploy command 保持默认 `npx wrangler deploy`（配置在
   `wrangler.jsonc`，资产目录锁定到 `dist/`，只上传游戏本体）
4. 约 1 分钟后得到 `https://<项目名>.workers.dev`——手机「添加到主屏幕」即可以 App 形态离线游玩（PWA）

之后**每次 commit（post-commit 钩子自动推送）都会触发自动部署**，无需任何手动操作。
跨设备搬存档用游戏内置：菜单 → 存档/读档 → 导出/导入文本码。

## 可选 · 腾讯 EdgeOne Pages（国内直连线，需备案）

> ⚠️ 政策前提（2026 实测）：EdgeOne Pages 的**默认域名仅 3 小时限时预览**（超时 401），
> 长期访问**必须绑定自定义域名**；且只要选了含中国大陆的加速区域，
> **自定义域名必须完成工信部 ICP 备案**（选「不含中国大陆」则免备案，但大陆访问仍受限）。
> 也就是说：**不想备案就留在 Cloudflare 单线，EdgeOne 反而没有优势。**
> 仅当你已有/愿意办**已备案域名**时，下面这条路才值得走。

1. 注册并实名认证腾讯云 → [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)
2. **创建项目 → 从 Git 仓库导入** → 授权 GitHub → 选中 `sjh328/fanren-wendao`
3. 构建配置（本项目已验证可用）：项目名 `fanren-wendao` · 生产分支 `master` · 框架预设「Other」
   · **构建命令 `node scripts/cf-prepare.mjs`** · **输出目录 `dist`** · 安装命令留空 · 环境变量留空
4. 构建产物可用（会给出 3 小时预览链接）；要长期访问，再到**域名管理 → 添加自定义域名**
   绑定已备案域名（CNAME 解析，免费 SSL 自动签发）
5. 绑定后，每次推 GitHub 会与 Cloudflare 线**同步自动更新**，双线互为备份

## 在线地址

- **正式入口（Cloudflare Workers，永久免费、免备案）**：
  https://fanren-wendao.sunjihao0328.workers.dev
- 手机可直接打开并「添加到主屏幕」当 App 用（PWA，断网可玩）；
  电脑若打不开多为 DNS 层干扰——开代理，或浏览器设置里开启「安全 DNS（DoH）」选 Cloudflare/Google 即可。
- 推送即上线：本地 commit → 钩子推 GitHub → Cloudflare 自动重新部署（无需任何手动操作）。

## 玩法简介

文字修仙放置：修炼突破（练气→真仙九境，天劫三策博弈）、宗门差事与季议、秘境/塔/悬赏/灵兽/道侣结拜、
黑市拍卖坊市三市。v42 新开：

- **开辟小世界**：大罗圆满后耗仙元灵石开辟地貌/灵脉/生灵三轴小世界，每 30 日一纪产出感悟仙元灵石，
  跨周目继承词条——「飞升→转世」闭合成真正的周目循环
- **秘境遗物**：每层掉「秘境遗种」三选一，14 条遗物本局 build、出秘境消散不入背包——塔验证过的
  roguelike 轮子装进秘境
- **扫荡 ×5 与战斗锦囊**：同图 ≥2.8× 三连胜解锁每日五连直结；丹符三槽预设一键祭出，autoPilot 不双吃
- **行功路线与境内顿悟**：手动修炼三选一（周天 ×1.2/存想感悟/龟息排毒）复活主按钮；进层三选顿悟本境增益
- **智能挂机逐日补跑 + 离线归乡包**：30 日闭关轮 daily 逐日行权零折损；离线 ≥1h 四档归乡包+故人来信
- **战斗鼎新**：战意沸点过山车（沸腾流失/爆发按余量放大 60≈2.4×·100≈3.2×）、对拼胜负判定、
  词缀境界升档（r8+ 三缀）、精英二阶段习性分化、连击势点必中穿防
- **沉浸与 UI**：六图专属配色、六道语料 378 句+稀有句、BGM 意境引擎、打字机呼吸感、成就积分+隐藏成就、
  引导任务化「跟我做」、ui-tip 触屏点亮、本季将临表、修炼页随境界生长

## 测试

测试为 puppeteer-core 驱动真实 Chrome 的 E2E 回归（需先启动 `node server.mjs`，并保证本机装有 Chrome）：

```bash
npm run serve       # 先起本地服务器 :8341（套件靠它加载页面，不起必连接拒绝）
npm run test:all    # 全量回归：build + check-actions 门禁 + 27 套 verify 专项（断言随版本增长）
npm run test:e2e    # run-e2e 一键全链（自动起服 + build + 静态门禁 + 套件 + 数值脚本，末行 RUNE2E_SUMMARY）
npm run test:v15    # 单独运行某一版本专项
npm run check-sync  # 手动校验 js/ 源码与 game.js 产物无分叉（build 前自动跑）
```

## 代码结构（v19 阶段十起：模块化源码 + 单体产物）

```
js/          ★ 开发源码（55 个模块 / 实测 29248 行，按 scripts/modules.json 顺序拼接）
  core/      基建：utils/anim/art/narrative/ambience/meta/achieve/guide/autocult/codex
             /log/save/player-factory/stat/time
  data/      game-data.js（静态数据 + 剧情脚本库）+ flavor-v42.js（v42 六道语料扩容/稀有句/称号）
  systems/   玩法系统 30+：cultivate/gongfa/bag/forge/cave/beast/shop/sect/explore
             /dao/karma/daoxin/auction/xinmo/craft/tribulation/world/bounty/black
             /rank/npc/dungeon/tower/reincarnation/status-fx/festival…
  battle/    battle.js（战斗：意图预演/破招反击/必杀成长/多波）
  ui/        tutorial/story/quest/ui/start-screen
  game.js    Game 主控（动作分发/初始化）
game.js      ★ 构建产物（由 js/ 拼接生成，逐字节可复现；index.html 引用不变）
style.css    宣纸水墨主题（按版本增量分区块）
index.html   唯一入口（引用 game.js?v=58；缓存号口径 = 16 + 版本号，v42 已递增至 58 清缓存）
server.mjs   本地静态服务器（:8341，no-cache）
tests/       puppeteer E2E 回归脚本（verify-*.mjs，npm test:xxx）
UPDATE_NOTES.md  最新一版更新说明（release 时自动镜像）；历史版本在 docs/update-notes/
docs/        各版本计划 PLAN_V*.md · playbook.md（玩法速查）· update-notes/（历史更新日志）
releases/    历史版本可玩快照（npm run release -- v<N> 生成，发布后永不改动）
icons/      PWA 图标（scripts/make-icons.mjs 生成：宣纸水墨 + 朱砂道印）
manifest.webmanifest + sw.js   PWA：可安装到主屏幕、离线可玩（sw.js 改动时递增 VERSION 清旧缓存，当前 fanren-wd-v17）
scripts/     build.mjs（安全构建+CSS 体检）· split.mjs（切分工具）· release.mjs（版本发布快照）
             · make-icons.mjs（PWA 图标）· balance-sim.mjs（数值拟合）· price-audit.mjs（经济审计）
             · field-audit.mjs（玩家字段契约审计）
attic/       归档区（gitignore）：v18 半成品模块化遗留，见 attic/README.md
```

### 开发流程

```bash
# 1. 编辑 js/ 下的模块（不要直接改 game.js——它是产物）
# 2. 重建产物（缺失模块会拒绝构建；产物先过 node --check 再覆盖，覆盖前自动备份）
node scripts/build.mjs
# 3. 跑回归
npm run test:all
# 4. 版本发布（test:all 全绿后、commit 前）：镜像更新说明 + 快照可玩本体到 releases/v<N>/
npm run release -- v<N>
```

## 架构速览

- **事件分发**：全部按钮带 `data-action`，`Game.actions` 表统一路由（231 动作，check-actions 门禁双向对账）。
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
4. 版本更新日志写入 `docs/update-notes/UPDATE_NOTES_V<N>.md`，随后 `npm run release -- v<N>`
   自动镜像到根目录 `UPDATE_NOTES.md`（根目录只展示最新一份）并把可玩本体快照到 `releases/v<N>/`
   （历史快照永不改动）。
