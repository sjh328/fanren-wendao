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
// v37（E257）README 守卫：根 README 版本行未刷至本版本即拒绝发布——
// v35/v36 曾把滞后 README（v31）烧进永久快照（releases/ 一经发布永不改动，无法补救）
const readmePath = path.join(ROOT, 'README.md');
const readmeSrc = fs.readFileSync(readmePath, 'utf8');
if (!readmeSrc.includes(`当前版本 **v${ver}`)) {
  console.error(`✗ README.md 版本行不含「当前版本 **v${ver}」——根 README 滞后。先刷新版本行/测试链/模块数/缓存号口径，再发布（E257 守卫）`);
  process.exit(1);
}

/* 0) 版本号单源注入（v32 G7/E58）：缓存号 ?v=N、SW 版本与预缓存、manifest 描述一次到位——
 *    此前三处双轨（?v= / SW VERSION / manifest），发布只 bump 其一即半新半旧。
 *    口径（v33（E99）修瑕：注释算式与代码漂移，照旧注释推版会错一档——以代码为准）：
 *    缓存号 v<N> = 16 + N（v32 → 48）；SW fanren-wd-v<M> = N - 26 + 1（v32 → 7）。 */
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
// v37 收口（E257 补遗）：README 的缓存引用一并单源注入——否则守卫只管版本行、
// 缓存引用永远滞后一版（v37 实测：README 写 ?v=52，index.html 已被注入为 53）
bump('README.md', [
  [/game\.js\?v=\d+/g, `game.js?v=${cacheV}`],
  [/style\.css\?v=\d+/g, `style.css?v=${cacheV}`],
]);
bump('manifest.webmanifest', [
  [/"description": "[^"]*"/, `"description": "网页版文字修仙放置游戏——凡人之躯，问道十章，白日飞升（v${ver}）。"`],
]);
console.log(`✓ 版本号单源注入：?v=${cacheV} · SW fanren-wd-v${swV} · manifest 描述`);

/* 1) 可玩本体快照（v35（E195）：先落 staging 再原子 rename——原 mkdir+逐个 copy 非原子，
 *    中途失败会留下半成品目录且被「已存在」护栏挡死重跑，须人工删目录才能继续） */
const FILES = ['index.html', 'game.js', 'style.css', 'sw.js', 'manifest.webmanifest', 'README.md'];
const staging = path.join(ROOT, 'releases', `.staging-v${ver}`);
fs.rmSync(staging, { recursive: true, force: true });
fs.mkdirSync(staging, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(ROOT, f), path.join(staging, f));
fs.cpSync(path.join(ROOT, 'icons'), path.join(staging, 'icons'), { recursive: true });
fs.renameSync(staging, relDir);

/* 2) 根目录更新说明镜像为最新版 */
fs.copyFileSync(notesSrc, path.join(ROOT, 'UPDATE_NOTES.md'));

console.log(`✓ releases/v${ver}/ 快照完成（index.html + game.js + style.css + sw.js + manifest + icons + README）`);
console.log(`✓ 根目录 UPDATE_NOTES.md 已镜像为 V${ver} 更新说明`);
console.log('  收尾：确认 git add 后一次性 commit（post-commit 钩子自动推送双仓库）。');
