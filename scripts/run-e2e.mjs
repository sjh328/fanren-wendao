#!/usr/bin/env node
/* ======================================================================
 * run-e2e.mjs —— 一体化回归运行器（v42 起供 test:all 同款链使用）
 * 自管 8341 本地服务器：未在监听则自动拉起、跑完即关；已在监听则复用不动。
 * 用法：
 *   node scripts/run-e2e.mjs                                # 全链（= npm run test:all 的 28 步）
 *   node scripts/run-e2e.mjs --only build check-actions verify-game   # 子集快跑
 *   node scripts/run-e2e.mjs --only balance-sim             # 数值模拟（同样自动配服务器）
 * 步骤名：build | check-sync | check-actions | verify-game | verify-v3..v27 |
 *         balance-sim | price-audit | field-audit
 * 每步完整输出落盘 node_modules/.run-e2e/<step>.log；失败时末尾打印该步尾部日志。
 * 退出码：全绿 0；任一步非 0 / 超时即非 0。
 * 末行固定输出 RUNE2E_SUMMARY passed=<绿步数> total=<总步数>，供上游解析。
 * ====================================================================== */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8341;
const LOG_DIR = path.join(ROOT, 'node_modules', '.run-e2e');
const STEP_TIMEOUT_MS = {
  build: 2 * 60_000,
  'check-sync': 2 * 60_000,
  'check-actions': 2 * 60_000,
  'balance-sim': 20 * 60_000,
  'price-audit': 10 * 60_000,
  'field-audit': 10 * 60_000,
  DEFAULT: 12 * 60_000,   // 单个 verify 套件上限（套件内部自带各步骤超时）
};

// verify 套件从 tests/ 动态发现（verify-game 在前，vN 按号升序）——新套件落盘即自动入链
const verifyScripts = fs
  .readdirSync(path.join(ROOT, 'tests'))
  .filter((f) => /^verify-.+\.mjs$/.test(f))
  .sort((a, b) => {
    const na = a === 'verify-game.mjs' ? -Infinity : Number(a.match(/(\d+)/)?.[1] ?? NaN);
    const nb = b === 'verify-game.mjs' ? -Infinity : Number(b.match(/(\d+)/)?.[1] ?? NaN);
    return na - nb;
  });

const STEPS = [
  ['build', 'scripts/build.mjs'],
  ['check-sync', 'scripts/check-sync.mjs'],
  ['check-actions', 'scripts/check-actions.mjs'],
  ...verifyScripts.map((f) => [f.replace(/\.mjs$/, ''), `tests/${f}`]),
  ['balance-sim', 'scripts/balance-sim.mjs'],
  ['price-audit', 'scripts/price-audit.mjs'],
  ['field-audit', 'scripts/field-audit.mjs'],
];
const STEP_MAP = new Map(STEPS);

// ---- 参数：--only a b c ----
const argv = process.argv.slice(2);
let names;
if (argv[0] === '--only') {
  names = argv.slice(1);
  const unknown = names.filter((n) => !STEP_MAP.has(n));
  if (unknown.length) {
    console.error(`未知步骤名: ${unknown.join(', ')}\n可用: ${[...STEP_MAP.keys()].join(' ')}`);
    process.exit(2);
  }
} else {
  names = STEPS.map(([n]) => n);                       // 默认全链
}

const fetchOk = (url, timeoutMs = 3000) =>
  new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });

// ---- 服务器自管：已在监听→复用；否则拉起、跑完关闭 ----
let serverChild = null;
let borrowed = false;
if (!(await fetchOk(`http://localhost:${PORT}/index.html`))) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const srvLog = fs.openSync(path.join(LOG_DIR, 'server.log'), 'a');
  serverChild = spawn(process.execPath, [path.join(ROOT, 'server.mjs')], {
    cwd: ROOT, stdio: ['ignore', srvLog, srvLog],
  });
  serverChild.on('error', (e) => console.error(`服务器启动失败: ${e.message}`));
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {                // 最多等 30s
    await new Promise((r) => setTimeout(r, 500));
    up = await fetchOk(`http://localhost:${PORT}/index.html`, 1500);
  }
  if (!up) {
    console.error('RUNE2E: 服务器 30s 内未就绪，中止。');
    process.exit(3);
  }
  console.log(`RUNE2E: 已自动拉起本地服务器 :${PORT}`);
} else {
  borrowed = true;
  console.log(`RUNE2E: 检测到 :${PORT} 已有服务器，直接复用（不关闭）`);
}

// ---- 串跑步骤 ----
const results = [];
for (const name of names) {
  const script = STEP_MAP.get(name);
  const timeoutMs = STEP_TIMEOUT_MS[name] ?? STEP_TIMEOUT_MS.DEFAULT;
  process.stdout.write(`[${name}] 运行中 ... `);
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(ROOT, script)], {
    cwd: ROOT,
    timeout: timeoutMs,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  const logPath = path.join(LOG_DIR, `${name}.log`);
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(logPath, (r.stdout || '') + (r.stderr || ''), 'utf8');

  const timedOut = r.error?.code === 'ETIMEDOUT' || r.signal === 'SIGTERM';
  const ok = r.status === 0 && !timedOut;
  results.push({ name, ok, dt, logPath });
  if (ok) {
    console.log(`PASS (${dt}s)`);
  } else {
    console.log(`FAIL (${dt}s)${timedOut ? ' [超时]' : ''}  完整日志: ${logPath}`);
    const tail = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/).slice(-40).join('\n');
    console.log(`---- ${name} 尾部日志 ----\n${tail}\n----------------------`);
  }
}

if (serverChild) {
  serverChild.kill();
  console.log(`RUNE2E: 自动拉起的服务器已关闭`);
}
const passed = results.filter((r) => r.ok).length;
console.log(`\n== 逐步结果 ==`);
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name} (${r.dt}s)`);
console.log(`RUNE2E_SUMMARY passed=${passed} total=${results.length}`);
process.exit(passed === results.length ? 0 : 1);
