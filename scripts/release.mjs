/* ======================================================================
 * release.mjs —— 版本发布硬性规范配套脚本（npm run release -- v<N>）
 * 每个版本的全部工作完成、`npm run test:all` 全绿之后执行一次，做两件事：
 *   1) 把 docs/update-notes/UPDATE_NOTES_V<N>.md 镜像到根目录 UPDATE_NOTES.md
 *      ——根目录永远只展示最新一份更新说明，历史版本归档于 docs/update-notes/
 *   2) 把可玩本体快照到 releases/v<N>/ ——原项目（根目录）不动，
 *      旧版本快照一经发布永不改动，新版本只新增 releases/v<N+1>/
 * 版本日志缺失或目标快照目录已存在时直接失败退出（exit 1），绝不半吊子发布。
 * ====================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (process.argv[2] || '').trim();
const ver = arg.replace(/^v/i, '');
if (!/^\d+$/.test(ver)) {
  console.error('✗ 用法：npm run release -- v<N>   （例：npm run release -- v32）');
  process.exit(1);
}

const notesSrc = path.join(ROOT, 'docs', 'update-notes', `UPDATE_NOTES_V${ver}.md`);
if (!fs.existsSync(notesSrc)) {
  console.error(`✗ 找不到版本日志 docs/update-notes/UPDATE_NOTES_V${ver}.md ——先写好更新说明再发布`);
  process.exit(1);
}
const relDir = path.join(ROOT, 'releases', `v${ver}`);
if (fs.existsSync(relDir)) {
  console.error(`✗ releases/v${ver}/ 已存在——历史版本快照不可改动，新版本请用新的版本号`);
  process.exit(1);
}

/* 1) 可玩本体快照 */
const FILES = ['index.html', 'game.js', 'style.css', 'sw.js', 'manifest.webmanifest', 'README.md'];
fs.mkdirSync(relDir, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(relDir, f));
fs.cpSync(path.join(ROOT, 'icons'), path.join(relDir, 'icons'), { recursive: true });

/* 2) 根目录更新说明镜像为最新版 */
fs.copyFileSync(notesSrc, path.join(ROOT, 'UPDATE_NOTES.md'));

console.log(`✓ releases/v${ver}/ 快照完成（index.html + game.js + style.css + sw.js + manifest + icons + README）`);
console.log(`✓ 根目录 UPDATE_NOTES.md 已镜像为 V${ver} 更新说明`);
console.log('  收尾：确认 git add 后一次性 commit（post-commit 钩子自动推送双仓库）。');
