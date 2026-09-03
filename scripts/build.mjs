// 构建脚本：将 js/ 模块按序拼接为 game.js（零依赖分发形态）
// 安全策略（v19 阶段十）：
//   1. 模块清单来自 scripts/modules.json，任何文件缺失立即 exit 1（绝不静默跳过）
//   2. 拼接产物先过 node --check 语法校验，通过才允许写盘
//   3. 覆盖前自动备份到 attic/game.js.pre-build
// 开发流程：编辑 js/ 下模块 → node scripts/build.mjs → 刷新页面（index.html 引用不变）
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'game.js');

const ORDER = JSON.parse(readFileSync(join(__dirname, 'modules.json'), 'utf8'));

// ---- 1) 存在性校验：缺失即失败 ----
const missing = ORDER.filter(f => !existsSync(join(ROOT, f)));
if (missing.length) {
  console.error('✗ 构建中止：以下模块缺失（绝不静默跳过）：\n  ' + missing.join('\n  '));
  process.exit(1);
}

// ---- 2) 按序拼接 ----
let output = '';
for (const f of ORDER) output += readFileSync(join(ROOT, f), 'utf8');

// ---- 3) 语法校验：先写临时文件过 node --check，通过才许覆盖正式产物 ----
const tmp = join(ROOT, '.build-tmp.js');
writeFileSync(tmp, output, 'utf8');
try {
  execSync(`node --check "${tmp}"`, { stdio: 'pipe' });
} catch (e) {
  console.error('✗ 构建中止：拼接产物语法校验未通过！\n' + String(e.stderr || e));
  process.exit(1);
}

// ---- 4) 备份 + 覆盖 ----
if (existsSync(OUT)) {
  mkdirSync(join(ROOT, 'attic'), { recursive: true });
  copyFileSync(OUT, join(ROOT, 'attic', 'game.js.pre-build'));
}
writeFileSync(OUT, output, 'utf8');
execSync(`del /q "${tmp}"`, { stdio: 'ignore', shell: 'cmd.exe' });
console.log(`✅ 构建完成：${OUT}（${(output.length / 1024).toFixed(0)} KB，${ORDER.length} 个模块）`);
