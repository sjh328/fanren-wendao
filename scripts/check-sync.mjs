// v30 护栏：源码↔产物分叉检测（防 v28 式「改动直写 game.js、源码停在旧版」事故复发）
// 三态判定：
//   game.js == js/ 拼接结果            → IN_SYNC（一致）
//   game.js == 上次构建回执            → SOURCE_AHEAD（源码领先，正常开发态，可安全构建）
//   两者皆非                            → ARTIFACT_DIRTY（产物被手改，构建会静默覆盖丢失 → 拒绝）
// 回执文件 scripts/.build-receipt 由 build.mjs 在每次成功构建后写入（随库提交，跨机有效）。
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'game.js');
const RECEIPT = join(__dirname, '.build-receipt');
const ORDER = JSON.parse(readFileSync(join(__dirname, 'modules.json'), 'utf8'));

function sha(text) { return createHash('sha256').update(text).digest('hex'); }

/** @returns {'IN_SYNC'|'SOURCE_AHEAD'|'ARTIFACT_DIRTY'} */
export function syncStatus() {
  const expected = ORDER.map(f => readFileSync(join(ROOT, f), 'utf8')).join('');
  if (!existsSync(OUT)) return 'IN_SYNC';   // 尚无产物，首次构建放行
  const actual = readFileSync(OUT, 'utf8');
  if (actual === expected) return 'IN_SYNC';
  const receipt = existsSync(RECEIPT) ? readFileSync(RECEIPT, 'utf8').trim() : '';
  if (receipt && sha(actual) === receipt) return 'SOURCE_AHEAD';
  return 'ARTIFACT_DIRTY';
}

export function divergeSample() {
  const expected = ORDER.map(f => readFileSync(join(ROOT, f), 'utf8')).join('');
  const actual = readFileSync(OUT, 'utf8');
  let at = 0;
  while (at < Math.min(actual.length, expected.length) && actual[at] === expected[at]) at++;
  return { line: actual.slice(0, at).split('\n').length, sizeDelta: actual.length - expected.length,
    sample: actual.slice(Math.max(0, at - 60), at + 60).replace(/\n/g, '\\n') };
}

export function writeReceipt() {
  if (!existsSync(OUT)) return;
  writeFileSync(RECEIPT, sha(readFileSync(OUT, 'utf8')) + '\n', 'utf8');
}

/* ---------- 命令行入口（node scripts/check-sync.mjs） ---------- */
const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  const st = syncStatus();
  if (st === 'IN_SYNC') { console.log('✅ 源码与产物一致（check-sync 通过）'); process.exit(0); }
  if (st === 'SOURCE_AHEAD') { console.log('ℹ 源码领先于产物（正常开发态，构建即可同步）'); process.exit(2); }
  const d = divergeSample();
  console.error(`✗ 检测到 game.js 被直接改动（与源码拼接、上次构建回执均不一致）——首个差异在第 ${d.line} 行附近，长度差 ${d.sizeDelta} 字节。`);
  console.error('  直接构建会静默覆盖产物上的独有改动（v28 事故）。');
  console.error('  处置：把改动落回 js/ 源码；或 node scripts/split.mjs 以产物为准重切；或 --force 强行覆盖。');
  console.error('  差异现场采样：…' + d.sample + '…');
  process.exit(process.argv.includes('--force') ? 0 : 1);
}
