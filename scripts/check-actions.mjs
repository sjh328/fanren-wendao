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
// v35（E166）：SKIP 补 scripts/——shoot-*/repro-* 等一次性脚本里的 page.click 选择器字符串
// 被计入 used，虚高静态入口数、弱化 NO-ENTRY 死代码检测
const SKIP = /[\\/](node_modules|dist|releases|attic|tests|docs|scripts|\.git|\.zcode|\.wrangler|gui-test-screenshots|drafts)([\\/]|$)/;
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
  // v35（E166）：三元形态 `act: cond ? '' : 'act-xxx'`（如今日修行卡按完成度灰显的行内按钮）
  // 纳入对账——原正则不匹配，动作值静态逃逸（当前仅「误报方向」安全，但属门禁强度缺口）
  for (const m of src.matchAll(/\bact:\s*[a-zA-Z$][\w$.]*\s*\?\s*''\s*:\s*'([a-z0-9-]+)'/g)) used.add(m[1]);
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

/* ======================================================================
 * v36（E231）「文案-常量」定点对账——「改参数忘改文案」三连（v34 A4/v32 E16/v35 E168）
 * 的防复发门禁：UI.FACTS 的每个数值与实现侧真值常量静态抽取比对，漂移即红。
 *   FACTS.offlineCap  ↔ js/game.js  离线上限 Math.min(120,
 *   FACTS.bountyDays  ↔ bounty.js   轮换阈值 `today - p.bounties.day > 2`（+1 即天数）
 *   FACTS.sellRate    ↔ shop.js     回收折价 base * 0.45（45 → 「四成五」）
 * ====================================================================== */
{
  const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
  const uiSrc = read('js/ui/ui.js');
  const fact = (k, re) => { const m = uiSrc.match(re); if (!m) { console.error(`✗ FACTS.${k} 缺失或形态漂移（UI.FACTS 应为文案单源）`); bad = true; return null; } return m[1]; };
  const cap = fact('offlineCap', /offlineCap:\s*(\d+)/);
  const bdays = fact('bountyDays', /bountyDays:\s*(\d+)/);
  const sellTxt = fact('sellRate', /sellRate:\s*'([^']+)'/);
  const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const cnRate = pct => (pct < 10 ? `${CN[pct]}成` : (pct % 10 === 0 ? `${CN[pct / 10]}成` : `${CN[Math.floor(pct / 10)]}成五`));
  if (cap != null) {
    const capImpl = (read('js/game.js').match(/Math\.min\((\d+),/) || [])[1];
    if (capImpl != null && Number(cap) !== Number(capImpl)) {
      console.error(`✗ 文案漂移: FACTS.offlineCap=${cap} ≠ 离线上限实现 ${capImpl}（js/game.js）`); bad = true;
    }
  }
  if (bdays != null) {
    const bountyImpl = (read('js/systems/bounty.js').match(/today\s*-\s*p\.bounties\.day\s*>\s*(\d+)/) || [])[1];
    if (bountyImpl != null && Number(bdays) !== Number(bountyImpl) + 1) {
      console.error(`✗ 文案漂移: FACTS.bountyDays=${bdays} ≠ 悬赏轮换阈值 ${bountyImpl}+1（bounty.js）`); bad = true;
    }
  }
  if (sellTxt != null) {
    const sellImpl = (read('js/systems/shop.js').match(/base\s*\*\s*0\.(\d+)/) || [])[1];
    if (sellImpl != null && sellTxt !== cnRate(Number(sellImpl))) {
      console.error(`✗ 文案漂移: FACTS.sellRate='${sellTxt}' ≠ 回收折价 0.${sellImpl}（shop.js，应作「${cnRate(Number(sellImpl))}」）`); bad = true;
    }
  }
}

if (bad) process.exit(1);
console.log(`✅ 动作路由对账通过：静态入口 ${used.size} 个 · 处理器 ${defined.size} 个 · 零漂移 · FACTS 文案-常量三点对齐`);
