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

/* 0) 版本号单源注入（v32 G7/E58）：缓存号 ?v=N、SW 版本与预缓存、manifest 描述一次到位——
 *    此前三处双轨（?v= / SW VERSION / manifest），发布只 bump 其一即半新半旧。
 *    口径：缓存号 v<N> = 15 + N（v32 → 48）；SW fanren-wd-v<M> = N - 26（v32 → 6+1=7）。 */
const cacheV = 16 + Number(ver);   // v31=47 → vN = N+16（v32 → 48，发布必须递增）
const swV = Number(ver) - 26 + 1;
const bump = (file, pairs) => {
  const p = path.join(ROOT, file);
  let s = fs.readFileSync(p, 'utf8');
  for (const [re, to] of pairs) s = s.replace(re, to);
  fs.writeFileSync(p, s);
};
bump('index.html', [
  [/game\.js\?v=\d+/g, `game.js?v=${cacheV}`],
  [/style\.css\?v=\d+/g, `style.css?v=${cacheV}`],
]);
bump('sw.js', [
  [/const VERSION = 'fanren-wd-v\d+';/, `const VERSION = 'fanren-wd-v${swV}';`],
  [/'\.\/game\.js\?v=\d+'/g, `'./game.js?v=${cacheV}'`],
  [/'\.\/style\.css\?v=\d+'/g, `'./style.css?v=${cacheV}'`],
]);
bump('manifest.webmanifest', [
  [/"description": "[^"]*"/, `"description": "网页版文字修仙放置游戏——凡人之躯，问道十章，白日飞升（v${ver}）。"`],
]);
console.log(`✓ 版本号单源注入：?v=${cacheV} · SW fanren-wd-v${swV} · manifest 描述`);

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
