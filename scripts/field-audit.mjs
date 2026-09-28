/* v41（E461）：玩家字段契约审计门禁——create() 模板键 + 全仓 p.<key>/out.<key> 写点正则扫描，
 * 与本脚本内置契约清单对账：未知键=红、写而不读死键=红。零依赖，node scripts/field-audit.mjs。
 * 白名单为显式列名（防门禁自相残杀）：新增任何顶层 p._ 键必须先入清单否则红——
 * E437 严禁复活顶层 _haggleMul、E422 已删 _autoRushSkipDay，均由此把关。
 * 首跑实扫校准留档（v5 计划口径）：下方 CONTRACT 各分组注记即首跑红名单的归类结论
 * （迁移目标/白名单/死键删除三途；首跑零死键——v4 后 _autoRush/_pref 已在 B1/E428 迁净）。 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODULES = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/modules.json'), 'utf8'));
const strip = s => s
  .replace(/\\[\s\S]/g, '0')
  .replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""')
  .replace(/`(?:[^`\\]|\\.)*`/g, '``')
  .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
const SRC = {};
for (const f of MODULES) SRC[f] = strip(fs.readFileSync(path.join(ROOT, f), 'utf8'));

/* ① create() 模板键：brace 匹配取 create(name, attrs) 内 `const p = {…}` 字面量，深度 0 收键 */
function templateKeys() {
  const raw = fs.readFileSync(path.join(ROOT, 'js/core/player-factory.js'), 'utf8');
  const bi = raw.indexOf('{', raw.indexOf('const p =', raw.indexOf('create(name, attrs)')));
  let d = 0, end = -1;
  for (let j = bi; j < raw.length; j++) { const c = raw[j]; if (c === '{') d++; else if (c === '}') { d--; if (d === 0) { end = j; break; } } }
  const body = strip(raw.slice(bi + 1, end));
  const out = new Set();
  let depth = 0, tok = '', prev = '';
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === '{') { depth++; tok = ''; continue; }
    if (c === '}') { depth--; tok = ''; continue; }
    if (depth === 0) {
      if (/[A-Za-z0-9_$]/.test(c)) { if (!tok) prev = body[i - 1]; tok += c; }
      else {
        if (tok && prev !== '.' && /^[A-Za-z_$][\w$]*$/.test(tok) && !/^(null|true|false|undefined)$/.test(tok) && /^\s*[:=,}\n]/.test(body.slice(i))) out.add(tok);
        tok = '';
      }
    } else tok = '';
  }
  return [...out];
}

/* ② 契约清单（显式列名）——模板外散落运行期顶层键，v5 计划 E461 点名 24+ 键经首跑实扫全中，
 *    另 19 键为首跑实扫输出校准（逐键归类注记在案，非静默放行） */
const CONTRACT = {
  // v5 计划点名（E461 白名单原文 24+ 键，评审抽核 10 键全中）
  _sparBuffDay: 'E445 义聚共斗战意（会话级，battle.js 读侧 E416）', _drillBuffDay: '切磋演武战意', _wenjianDay: '问剑日', _wuDaoDay: '悟道日', _boxDay: '黑市赌袋日（历史）', _settleDay: '结算日', _restDay: '歇息日', _xianVisitDay: '仙界来客日', _daoCultDay: '道途修炼日', rushDay: '聚灵窗口日', mysteryDay: '古匣日', expOverflow: '溢流修为（E426/E428 数值清洗）', lifeCut: '折寿', lifeGain: '延寿', benming: '本命法宝', auction: '拍卖期次（consign 子字段随容器）', pendingDaoPath: '叩问挂起', pendingNightRaid: '夜袭挂起', pendingOathBreak: '破誓挂起', beastArena: '斗兽擂台', shadowDay: '玄影日', setForge: '化身锻造', rankPrev: '天骄榜上届排名', signStreak: '黄历连签', listenDay: '听讲日',
  // 首跑实扫校准（首跑红名单逐键归类——皆为既有运行期键或启发式误报，注记在案）
  _anecDay: '仙界轶闻日（explore）', _claimCount: '悬赏领取计次', _claimDay: '悬赏领取日', _danxiaFreeMonth: '丹霞免费月', _drillN: '演武计数', _embryoSuffix: '器胚保底旗（旧布尔档兼容）', _embryoSuffixFor: '器胚保底旗（按物品 id）', _expDay: '阅历日', _forgeBias: '炼器配比旗（forge）', _panyanEnhMonth: '磐言强化月', _recastN: '重铸计数', _sameSectSpar: '同门切磋标记', _sparCount: '切磋计数', _sparCountDay: '切磋计次日', _trainDay: '演武场日', _wanbaoHaggleDay: '万宝还价日', tower: '塔运行期对象（tower.js 惰性建）', codexBonus: '图鉴大成加成（game-data 惰性建）', prefix: 'rollAffixes 局部词缀对象（接收者启发式误报，非玩家键）', suffix: '同上（forge.js:249 局部对象）',
};

/* ③ 写点扫描与对账 */
const writeRe = /\b(?:p|pp|pl|fp|out|prev|me|nu)\.([A-Za-z_][\w]*)\s*=(?!=)/g;
const writes = {};   // key -> [file:line]
for (const f of MODULES) {
  let m; const src = SRC[f];
  while ((m = writeRe.exec(src))) (writes[m[1]] = writes[m[1]] || []).push(`${f}:${src.slice(0, m.index).split('\n').length}`);
}
const tpl = templateKeys();
const unknown = Object.keys(writes).filter(k => !tpl.includes(k) && !CONTRACT[k]).sort();
// 死键：已知键全集中「出现即写」者（读侧零证据）
const dead = [];
for (const k of new Set([...tpl, ...Object.keys(CONTRACT)])) {
  let total = 0, w = 0;
  const tre = new RegExp('\\.' + k + '\\b', 'g'), wre = new RegExp('\\.' + k + '\\s*=(?!=)', 'g');
  for (const src of Object.values(SRC)) { total += (src.match(tre) || []).length; w += (src.match(wre) || []).length; }
  if (total > 0 && total === w) dead.push(k);
  else if (total === 0 && writes[k]) dead.push(k + '（写点存在但全仓零读点）');
}
const deadReal = [...new Set(dead)];

/* ④ 报告与门禁 */
console.log(`field-audit：模板键 ${tpl.length} · 契约清单 ${Object.keys(CONTRACT).length} · 写点键 ${Object.keys(writes).length}`);
let red = 0;
if (unknown.length) { red++; console.error(`⚠ 未知顶层写点键（先入 CONTRACT 清单或改子字段容器）：\n  ${unknown.map(k => `${k} ← ${writes[k].slice(0, 3).join(', ')}${writes[k].length > 3 ? ` 等 ${writes[k].length} 处` : ''}`).join('\n  ')}`); }
if (deadReal.length) { red++; console.error(`⚠ 死键（写而不读=红，E428 口径）：\n  ${deadReal.join('\n  ')}`); }
if (!red) console.log('✓ 字段契约全绿——模板外散落键全部在契约清单列名，零未知键、零死键');
process.exitCode = red ? 1 : 0;
