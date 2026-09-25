// 构建脚本：将 js/ 模块按序拼接为 game.js（零依赖分发形态）
// 安全策略（v19 阶段十）：
//   1. 模块清单来自 scripts/modules.json，任何文件缺失立即 exit 1（绝不静默跳过）
//   2. 拼接产物先过 node --check 语法校验，通过才允许写盘
//   3. 覆盖前自动备份到 attic/game.js.pre-build
// 开发流程：编辑 js/ 下模块 → node scripts/build.mjs → 刷新页面（index.html 引用不变）
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'game.js');

const ORDER = JSON.parse(readFileSync(join(__dirname, 'modules.json'), 'utf8'));

// ---- 0) v30 护栏：源码↔产物分叉三态检测（仅当产物被手改时拒绝静默覆盖） ----
const { syncStatus, divergeSample, writeReceipt } = await import('./check-sync.mjs');
const FORCE = process.argv.includes('--force');
if (!FORCE) {
  const st = syncStatus();
  if (st === 'ARTIFACT_DIRTY') {
    const d = divergeSample();
    console.error(`✗ 构建中止：game.js 被直接改动（与源码拼接、上次构建回执均不一致）——首个差异在第 ${d.line} 行附近。`);
    console.error('  把改动落回 js/ 源码，或 node scripts/split.mjs 以产物重切，或 --force 强行覆盖。');
    process.exit(1);
  }
}

// ---- 1) 存在性校验：缺失即失败 ----
const missing = ORDER.filter(f => !existsSync(join(ROOT, f)));
if (missing.length) {
  console.error('✗ 构建中止：以下模块缺失（绝不静默跳过）：\n  ' + missing.join('\n  '));
  process.exit(1);
}

// ---- 1.5) v37（E259）反向校验：js/** 下存在而 modules.json 未登记的孤儿模块 → 拒建 ----
// （正向「缺失即失败」之外的另一半：新增模块忘登记 = 拼接静默缺章，页面行为凭空少一块）
const seen = new Set(ORDER);
const orphans = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.js')) {
      const rel = p.slice(ROOT.length + 1).replace(/\\/g, '/');
      if (!seen.has(rel)) orphans.push(rel);
    }
  }
})(join(ROOT, 'js'));
if (orphans.length) {
  console.error('✗ 构建中止：以下 js 模块未登记进 scripts/modules.json（拼接会静默缺章）：\n  ' + orphans.join('\n  '));
  process.exit(1);
}

// ---- 2) 按序拼接 ----
let output = '';
for (const f of ORDER) output += readFileSync(join(ROOT, f), 'utf8');

// ---- 3) 语法校验：先写临时文件过 node --check，通过才许覆盖正式产物 ----
// v35（E194）：校验段 try/finally 包裹——原语法/CSS 校验失败直接 exit(1)，
// 1.5MB 的 .build-tmp.js 残留根目录（违反根目录干净纪律，check-actions 的 walk 也会扫进它）
const tmp = join(ROOT, '.build-tmp.js');
writeFileSync(tmp, output, 'utf8');
try {
  try {
    execSync(`node --check "${tmp}"`, { stdio: 'pipe' });
  } catch (e) {
    console.error('✗ 构建中止：拼接产物语法校验未通过！\n' + String(e.stderr || e));
    process.exit(1);
  }

  // ---- 3.5) v23 CSS 体检：花括号平衡 + 注释闭合（防 v19 式"截断坏块吞规则"复发） ----
  function checkCss() {
    const cssPath = join(ROOT, 'style.css');
    if (!existsSync(cssPath)) return;
    const css = readFileSync(cssPath, 'utf8');
    const openers = (css.match(/\/\*/g) || []).length;
    const closers = (css.match(/\*\//g) || []).length;
    if (openers !== closers) {
      console.error(`✗ CSS 体检失败：注释不闭合（/* ×${openers} / */ ×${closers}）——拒绝构建`);
      process.exit(1);
    }
    const noComment = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/url\([^)]*\)/g, 'url()');
    const ob = (noComment.match(/{/g) || []).length;
    const cb = (noComment.match(/}/g) || []).length;
    if (ob !== cb) {
      console.error(`✗ CSS 体检失败：花括号不平衡（{ ×${ob} / } ×${cb}）——拒绝构建`);
      process.exit(1);
    }
    console.log(`✅ CSS 体检通过（注释闭合 · 花括号 { ×${ob} } 平衡）`);
  }
  checkCss();

  // ---- 4) 备份 + 覆盖 ----
  if (existsSync(OUT)) {
    mkdirSync(join(ROOT, 'attic'), { recursive: true });
    copyFileSync(OUT, join(ROOT, 'attic', 'game.js.pre-build'));
  }
  writeFileSync(OUT, output, 'utf8');
  writeReceipt();   // v30：记录本次产物哈希，供分叉三态判定
} finally {
  rmSync(tmp, { force: true });   // v30：跨平台清理（原 del /q 仅 Windows 可用）；v35（E194）：失败路径亦清理
}
console.log(`✅ 构建完成：${OUT}（${(output.length / 1024).toFixed(0)} KB，${ORDER.length} 个模块）`);
// v39（E365）：根目录 nul 防复发清理（bash 误写报错串历史问题）
try { fs.rmSync('nul', { force: true }); } catch { /* ignore */ }
