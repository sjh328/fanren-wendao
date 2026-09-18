#!/usr/bin/env node
/* ======================================================================
 * check-actions.mjs —— v32（G1）动作路由静态校验
 * 全工程 data-action 字面量与 js/game.js 的 Game.actions 表互相求差：
 *   · NO-HANDLER：按钮/入口带了 data-action 但没有处理器（死按钮——A9/A10 同类病灶）
 *   · NO-ENTRY  ：处理器存在但无任何静态入口（死代码）
 * 接入 npm run test:all（build 之后），双向漂移一律拒绝通过。
 * ====================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = /[\\/](node_modules|dist|releases|attic|tests|docs|\.git|\.zcode|\.wrangler|gui-test-screenshots|drafts)([\\/]|$)/;
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (SKIP.test(p)) continue;
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(js|html)$/.test(f)) files.push(p);
  }
})(ROOT);

const used = new Set();
const defined = new Set();
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/data-action="([a-z0-9-]+)"/g)) used.add(m[1]);
  // v33（E93）：动态拼接入口 `act: 'act-xxx'`（模板字面量 data-action="${r.act}" 逃逸静态对账——
  // A10 类死按钮的盲区）。引用值必须是 actions 表中的键。
  for (const m of src.matchAll(/\bact:\s*'([a-z0-9-]+)'/g)) used.add(m[1]);
  // actions 表键：仅认「'key': (…)」形态（js/game.js 与构建产物 game.js 各扫一遍无妨，Set 去重）
  const at = src.indexOf('actions: {');
  if (at >= 0) {
    for (const m of src.slice(at).matchAll(/'([a-z0-9-]+)':\s*(?:async\s*)?\(/g)) defined.add(m[1]);
  }
}

const missing = [...used].filter(a => !defined.has(a)).sort();
const dead = [...defined].filter(a => !used.has(a)).sort();
let bad = false;
for (const a of missing) { console.error(`✗ NO-HANDLER: data-action="${a}" 无处理器（死按钮）`); bad = true; }
for (const a of dead) { console.error(`✗ NO-ENTRY: '${a}' 处理器无任何静态入口（死代码）`); bad = true; }
if (bad) process.exit(1);
console.log(`✅ 动作路由对账通过：静态入口 ${used.size} 个 · 处理器 ${defined.size} 个 · 零漂移`);
