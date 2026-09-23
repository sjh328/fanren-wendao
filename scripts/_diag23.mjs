import fs from 'node:fs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(dirname(fileURLToPath(import.meta.url)));
const R = f => readFileSync(join(__dirname, 'js', f), 'utf8').replace(/\r\n/g, '\n');
const ui = R('ui/ui.js');
const festivaljs = R('systems/festival.js');
const worldjs = R('systems/world.js');
const v23 = fs.readFileSync('tests/verify-v23.mjs','utf8');
const i = v23.indexOf("SA40 口径");
const block = v23.slice(v23.lastIndexOf('? pass', i), i+50);
// 抓 SA40 判定行集合
const startLine = v23.lastIndexOf('\n', v23.indexOf('&& ui.includes(\'今日赏格余量')>0?v23.indexOf('今日赏格余量'):0);
const seg = v23.slice(v23.indexOf('ui.includes(\'今日赏格余量')-400, i+80);
const conds = seg.match(/(ui|festivaljs|worldjs)\.includes\('(?:[^'\]|\.)*'\)|!(?:ui|festivaljs|worldjs)\.includes\('(?:[^'\]|\.)*'\)/g) || [];
let bad = 0;
for (const c of conds) {
  let expr = c.replace(/^(?:!)?(ui|festivaljs|worldjs)\.includes\(/, '').replace(/\)$/, '');
  const neg = c.startsWith('!');
  const srcMap = { ui, festivaljs, worldjs };
  const srcName = c.replace('!.', '').split('.')[0];
  const src = srcMap[srcName];
  // 把 JS 字符串字面量转为可 eval
  let lit; try { lit = eval('(' + expr + ')'); } catch(e) { console.log('UNPARSEABLE:', c); continue; }
  const ok = src.includes(lit);
  if (neg ? ok : !ok) { console.log('COND FAIL:', c); bad++; }
}
console.log('checked', conds.length, 'bad', bad);
