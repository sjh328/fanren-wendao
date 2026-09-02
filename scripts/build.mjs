// 构建脚本：将 js/ 模块目录按依赖顺序拼接为 game.js
// 开发在 js/ 中编辑，构建后 index.html 引用 game.js 不变
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'js');
const OUT = join(ROOT, 'game.js');

// 模块加载顺序（依赖关系：先定义的模块不依赖后定义的，后定义的可以通过 window 全局引用前序）
const ORDER = [
  // ---- core ----
  'core/utils.js',
  'core/anim.js',
  'core/art.js',
  'core/narrative.js',
  'core/ambience.js',
  'core/meta.js',
  'core/achieve.js',
  'core/guide.js',
  'core/autocult.js',
  'core/codex.js',
  'core/log.js',
  'core/save.js',
  'core/player-factory.js',
  'core/stat.js',
  'core/time.js',
  // ---- data ----
  'data/game-data.js',
  // ---- systems ----
  'systems/cultivate.js',
  'systems/gongfa.js',
  'systems/bag.js',
  'systems/pill.js',
  'systems/forge.js',
  'systems/cave.js',
  'systems/beast.js',
  'systems/shop.js',
  'systems/sect.js',
  'systems/status-fx.js',
  'systems/explore.js',
  'systems/events.js',
  'systems/dao.js',
  'systems/karma.js',
  'systems/daily-sign.js',
  'systems/craft.js',
  'systems/tribulation.js',
  'systems/world.js',
  'systems/bounty.js',
  'systems/black.js',
  'systems/rank.js',
  'systems/npc.js',
  'systems/dungeon.js',
  'systems/reincarnation.js',
  // ---- battle ----
  'battle/battle.js',
  // ---- ui ----
  'ui/tutorial.js',
  'ui/story.js',
  'ui/quest.js',
  'ui/ui.js',
  'ui/start-screen.js',
  // ---- game main ----
  'game.js',
];

let output = `'use strict';\n\n/* ================================================\n * 《凡人问道》—— 网页版文字修仙游戏\n * 构建产物：由 js/ 目录模块拼接生成\n * 编辑源文件后运行 node scripts/build.mjs 更新\n * ================================================ */\n\n`;

for (const rel of ORDER) {
  const file = join(SRC, rel);
  if (!existsSync(file)) {
    console.warn(`⚠ 跳过未找到的模块: ${rel}`);
    // 写入占位注释
    output += `\n/* ========== ${rel} ========== */\n/* 模块未创建 */\n\n`;
    continue;
  }
  const content = readFileSync(file, 'utf-8');
  output += `\n/* ========== ${rel} ========== */\n`;
  output += content;
  if (!content.endsWith('\n')) output += '\n';
}

writeFileSync(OUT, output, 'utf-8');
console.log(`✅ 构建完成: ${OUT} (${(output.length / 1024).toFixed(0)} KB)`);