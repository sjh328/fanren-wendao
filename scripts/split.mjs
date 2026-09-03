// 模块化切分脚本：将 game.js 单体按顶层语句切分为 js/ 模块（一次性工具）
// 策略：模块内容 = 相邻块之间的全部原文切片 → 按序拼接可逐字节还原 game.js（零行为风险）
// 运行：node scripts/split.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const lines = readFileSync(join(ROOT, 'game.js'), 'utf8').split('\n');

// ---- 1) 解析顶层语句块 ----
const stmts = [];
let i = 0;
while (i < lines.length) {
  const ln = lines[i];
  const constM = ln.match(/^const ([A-Za-z_$]+)/);
  const winM = ln.match(/^window\.([A-Za-z_$]+) = /);
  const domM = /^document\.addEventListener/.test(ln);
  if (constM || winM || domM) {
    let end = i;
    if (ln.includes('{') || (constM && !ln.includes(';'))) {
      let depth = 0;
      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]) { if (ch === '{') depth++; else if (ch === '}') depth--; }
        if (depth <= 0 && j > i || (depth === 0 && j === i && !ln.includes('{'))) { end = j; break; }
      }
    }
    stmts.push({ name: constM ? constM[1] : winM ? 'window.' + winM[1] : 'DOMContentLoaded', start: i, end });
    i = end + 1;
  } else i++;
}
console.log('解析到顶层语句:', stmts.length);

// ---- 2) 块 → 模块映射（顺序即文件顺序，拼接顺序必须与原文一致） ----
const MAP = [
  ['js/core/utils.js', ['Utils']],
  ['js/core/anim.js', ['Anim']],
  ['js/core/art.js', ['Art']],
  ['js/core/narrative.js', ['Narrative']],
  ['js/core/ambience.js', ['Ambience']],
  ['js/core/meta.js', ['Meta']],
  ['js/core/achieve.js', ['Achieve']],
  ['js/core/guide.js', ['Guide']],
  ['js/core/autocult.js', ['AutoCult']],
  ['js/core/codex.js', ['Codex']],
  ['js/data/game-data.js', ['GameData']],
  ['js/core/log.js', ['Log']],
  ['js/core/save.js', ['Save']],
  ['js/core/player-factory.js', ['PlayerFactory']],
  ['js/core/stat.js', ['Stat']],
  ['js/core/time.js', ['Time']],
  ['js/systems/cultivate.js', ['Cultivate']],
  ['js/systems/gongfa.js', ['GongfaSys']],
  ['js/systems/bag.js', ['Bag', 'Pill']],
  ['js/systems/forge.js', ['ForgeSys']],
  ['js/systems/cave.js', ['CaveSys']],
  ['js/systems/beast.js', ['BeastSys']],
  ['js/systems/shop.js', ['ShopSys']],
  ['js/systems/sect.js', ['SectSys']],
  ['js/systems/status-fx.js', ['buildMonster', 'StatusFx']],
  ['js/systems/explore.js', ['Explore', 'EventSys']],
  ['js/systems/dao.js', ['DaoSys']],
  ['js/systems/karma.js', ['KarmaSys', 'RepSys', 'window.RepSys']],
  ['js/systems/daoxin.js', ['DaoxinSys', 'window.DaoxinSys']],
  ['js/systems/auction.js', ['AuctionSys', 'DonateSys']],
  ['js/systems/xinmo.js', ['XinmoSys', 'window.XinmoSys']],
  ['js/systems/daily-sign.js', ['DailySign']],
  ['js/systems/craft.js', ['CraftSys']],
  ['js/systems/tribulation.js', ['Tribulation']],
  ['js/systems/world.js', ['WorldSys']],
  ['js/systems/bounty.js', ['BountySys']],
  ['js/systems/black.js', ['BlackSys']],
  ['js/systems/rank.js', ['RankSys']],
  ['js/systems/npc.js', ['NpcSys', 'PersonalSys', 'window.PersonalSys']],
  ['js/systems/dungeon.js', ['DungeonSys']],
  ['js/systems/reincarnation.js', ['ReincarnationSys']],
  ['js/battle/battle.js', ['Battle']],
  ['js/ui/tutorial.js', ['Tutorial']],
  ['js/ui/story.js', ['Story', 'window.Story']],
  ['js/ui/quest.js', ['QuestSys']],
  ['js/ui/ui.js', ['UI']],
  ['js/ui/start-screen.js', ['StartScreen']],
  ['js/game.js', ['Game', 'DOMContentLoaded']],
];

// 校验映射覆盖全部语句且顺序一致
const flat = MAP.flatMap(([, names]) => names);
const actual = stmts.map(s => s.name);
if (JSON.stringify(flat) !== JSON.stringify(actual)) {
  console.error('映射与实际语句不一致！');
  for (let k = 0; k < Math.max(flat.length, actual.length); k++) {
    if (flat[k] !== actual[k]) console.error(`  #${k}: 映射=${flat[k] ?? '∅'} 实际=${actual[k] ?? '∅'}`);
  }
  process.exit(1);
}

// ---- 3) 切片写入模块（模块内容 = 上一块结束的下一行 .. 本块末行，含中间注释空行） ----
for (const [file] of MAP) mkdirSync(join(ROOT, dirname(file)), { recursive: true });
let prevEnd = -1;
const order = [];
for (const [file, names] of MAP) {
  const last = names[names.length - 1];
  const end = stmts.find(s => s.name === last).end;
  const content = lines.slice(prevEnd + 1, end + 1).join('\n') + '\n';
  writeFileSync(join(ROOT, file), content, 'utf8');
  order.push(file);
  prevEnd = end;
}
// 尾部残留（应为空）
const tail = lines.slice(prevEnd + 1).join('\n').trim();
if (tail) { console.error('警告：尾部有残留内容！'); process.exit(1); }

writeFileSync(join(__dirname, 'modules.json'), JSON.stringify(order, null, 2), 'utf8');
console.log('切分完成：', order.length, '个模块 → js/');
console.log('回切验证：node scripts/build.mjs 后 diff game.js');
