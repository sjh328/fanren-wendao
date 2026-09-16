# 工作约定（对本仓库的所有代理会话生效）

## Git 提交 / 推送纪律

- **必须等一个任务的全部计划工作完成、且全量回归（`npm run test:all`）通过之后，才执行一次 commit 提交。**
- 本仓库装有 `post-commit` 钩子：commit 后会自动推送 GitHub + Gitee 双仓库。
  因此「中途不 commit」就等于「中途不推送」——开发过程中（哪怕阶段收尾、文档落档）也**不要提前 commit**，
  统一在整体完成验收后一次性提交。
- 以后每个任务都遵循此流程：先计划 → 执行 → 回归全绿 → 最后 commit（自动推送）。

## 版本发布硬性规范（每次游戏版本更新必须执行，无例外）

- **原项目不动，更新后的版本复制一份**：每个版本的全部计划工作完成、`npm run test:all` 全绿之后、commit 之前，
  必须执行 `npm run release -- v<N>`（N 为本次版本号），它做两件事：
  1. 把 `docs/update-notes/UPDATE_NOTES_V<N>.md` 镜像到根目录 `UPDATE_NOTES.md`——
     **根目录只展示最新一份更新说明**，历史版本日志一律归档在 `docs/update-notes/`，不得散落在根目录；
  2. 把可玩本体（index.html / game.js / style.css / sw.js / manifest.webmanifest / icons / README）快照到 `releases/v<N>/`。
- **`releases/` 下的历史版本快照一经发布永不改动、永不删除**：根目录继续开发下一版，发布只新增 `releases/v<N+1>/`，
  绝不覆写旧目录（release 脚本遇已存在目录会拒绝执行，这是护栏不是故障）。
- 版本更新日志必须写入 `docs/update-notes/UPDATE_NOTES_V<N>.md`（不直接写根目录 `UPDATE_NOTES.md`，它是镜像）。
- **目录纪律**：根目录保持干净——E2E 测试一律放 `tests/`，版本计划/手册放 `docs/`，一次性脚本放 `scripts/`；
  不要在根目录新增散落的 verify-*.mjs、UPDATE_NOTES_V*.md 之类文件。
