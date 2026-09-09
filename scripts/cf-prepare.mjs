// Cloudflare Pages/Workers 构建准备：把游戏本体拷进干净的 dist/（Build command 用）
// dist/ 在 .gitignore 中；wrangler.jsonc 的 assets.directory 指向 ./dist
import { cpSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
for (const f of ['index.html', 'game.js', 'style.css', 'manifest.webmanifest', 'sw.js']) {
  cpSync(join(ROOT, f), join(DIST, f));
}
cpSync(join(ROOT, 'icons'), join(DIST, 'icons'), { recursive: true });

const n = readdirSync(DIST).length;
console.log(`✅ dist/ 就绪（${n} 项）：index.html / game.js / style.css / manifest / sw.js / icons/`);
