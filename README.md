# 凡人问道 · 文字修仙

网页版文字修仙放置游戏。零依赖、纯前端：HTML + CSS + 原生 JavaScript，美术为程序化 SVG，音效为 Web Audio 合成。
当前版本 **v30「大器」**（六路深审后的全方位大升级：P0 七连——闭关×天劫竞态·古匣开奖全池·金光盾不衰减·结算卡死代码·图鉴永锁·门前影永锁·回灵凝气死属性 /
真 bug 批修 55 处——卸装丢词缀·战败罚款虚设·转道弃道不弃利·苏白线加成无效等 /
战斗点睛——状态引擎统一·连招与技能盘构筑·人兽合击·AI 反制读招·久战力竭·天塔 roguelike 化 /
装备铸魂——词缀两段式+留档+器魂重铸·套装两件阶梯·强化 +15 全键生效·毕业装三线 /
经济归流——sinkCurve 消费曲线族单源·洞天营造·借天运·贡献兑声望器魂·战败罚款总资产·斗兽/秘境/塔印钞口全封 /
内容补全——24 位修士全员个人线·终章暗线·道侣出游·宗门特色差事·世界大事 12 种·节庆 7 个·悬赏三级连锁·图鉴分档 /
轮回镜——传承树面板·印记多元化·前世编年 /
节奏重校——EXP 曲线 ×6.2 超线性·世界大事首现 10~14 年·感悟降权·渡劫丹上架·飞升真判定·仙元续航 /
工程地基——构建分叉防呆·战斗日志增量化·滚动快照 bak2·PWA 更新链·全局错误兜底——详见 `UPDATE_NOTES_V30.md`；
v29「天年」经济收敛与寿元做实见 `UPDATE_NOTES_V29.md`）。

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

## 测试

测试为 puppeteer-core 驱动真实 Chrome 的 E2E 回归（需先启动 `node server.mjs`，并保证本机装有 Chrome）：

```bash
npm run serve       # 先起本地服务器 :8341（套件靠它加载页面，不起必连接拒绝）
npm run test:all    # 十四套脚本全量回归（先自动 build，879+ 断言，随版本增长）
npm run test:v15    # 单独运行某一版本专项
npm run check-sync  # 手动校验 js/ 源码与 game.js 产物无分叉（build 前自动跑）
```

## 代码结构（v19 阶段十起：模块化源码 + 单体产物）

```
js/          ★ 开发源码（50 个模块，按 scripts/modules.json 顺序拼接）
  core/      基建：utils/anim/art/narrative/ambience/meta/achieve/guide/autocult/codex
             /log/save/player-factory/stat/time
  data/      game-data.js（静态数据 + 剧情脚本库）
  systems/   玩法系统 30+：cultivate/gongfa/bag/forge/cave/beast/shop/sect/explore
             /dao/karma/daoxin/auction/xinmo/craft/tribulation/world/bounty/black
             /rank/npc/dungeon/tower/reincarnation/status-fx/festival…
  battle/    battle.js（战斗：意图预演/破招反击/必杀成长/多波）
  ui/        tutorial/story/quest/ui/start-screen
  game.js    Game 主控（动作分发/初始化）
game.js      ★ 构建产物（由 js/ 拼接生成，逐字节可复现；index.html 引用不变）
style.css    宣纸水墨主题（按版本增量分区块）
index.html   唯一入口（引用 game.js?v=45，改版时递增 N 清缓存）
server.mjs   本地静态服务器（:8341，no-cache）
verify-*.mjs puppeteer E2E 回归脚本（npm test:xxx）
icons/      PWA 图标（scripts/make-icons.mjs 生成：宣纸水墨 + 朱砂道印）
manifest.webmanifest + sw.js   PWA：可安装到主屏幕、离线可玩（sw.js 改动时递增 VERSION 清旧缓存）
scripts/     build.mjs（安全构建+CSS 体检）· make-icons.mjs（PWA 图标）· balance-sim.mjs · price-audit.mjs
scripts/     build.mjs（安全构建）· balance-sim.mjs（数值拟合）· price-audit.mjs（经济审计）
             · split.mjs（切分工具）
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
