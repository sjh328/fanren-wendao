const fs = require('fs');
const src = fs.readFileSync('game.js.bak', 'utf-8');
const lines = src.split('\n');

let storiesStart = -1, storiesEnd = -1;
let daoTiersStart = -1, daoTiersEnd = -1;
let c4Start = -1;

for (let i = 0; i < lines.length; i++) {
  const ln = lines[i].trim();
  if (lines[i].includes('STORIES: {')) storiesStart = i;
  if (lines[i].includes('DAO_TIERS: {')) daoTiersStart = i;
  if (daoTiersStart > 0 && daoTiersEnd < 0 && ln === '},' && i > daoTiersStart + 30) {
    // DAO_TIERS closes at line 1643 (original), next non-empty is REALM_FAIL_TEXT or DAO_FLAVOR
    let next = i + 1;
    while (next < lines.length && lines[next].trim() === '') next++;
    if (next < lines.length && (lines[next].includes('REALM_FAIL_TEXT') || lines[next].includes('DAO_FLAVOR') || lines[next].includes('/*'))) {
      // Check if we're past the c4 section - the real DAO_TIERS closing is after c4
      // If c4 has been found, then this is the correct closing
      if (c4Start > 0 && i > c4Start) {
        daoTiersEnd = i;
      }
    }
  }
  if (storiesStart > 0 && storiesEnd < 0 && ln === '},' && i > storiesStart + 30) {
    let next = i + 1;
    while (next < lines.length && lines[next].trim() === '') next++;
    if (next < lines.length && (lines[next].includes('v5 沉浸感扩展') || lines[next].includes('=============='))) {
      storiesEnd = i;
    }
  }
  if (daoTiersStart > 0 && c4Start < 0 && lines[i].includes('/* ============ 第四章')) {
    c4Start = i;
  }
}

console.log('storiesStart:', storiesStart, 'storiesEnd:', storiesEnd);
console.log('daoTiersStart:', daoTiersStart, 'daoTiersEnd:', daoTiersEnd);
console.log('c4Start:', c4Start);

if (storiesEnd < 0 || daoTiersEnd < 0 || c4Start < 0) {
  console.error('Could not find all boundaries!');
  process.exit(1);
}

const c4to9Content = lines.slice(c4Start, daoTiersEnd).join('\n');
const part1 = lines.slice(0, storiesEnd).join('\n');
const part3 = lines[storiesEnd];
const part4 = lines.slice(storiesEnd + 1, daoTiersStart).join('\n');
const part5 = lines.slice(daoTiersStart, c4Start).join('\n');
const part6 = '  },';
const part7 = lines.slice(daoTiersEnd + 1, lines.length).join('\n');

const corrected = [part1, c4to9Content, part3, part4, part5, part6, part7].join('\n');

const hasStoriesC4 = corrected.substring(0, corrected.indexOf('DAO_TIERS:')).includes('c4_open');
const hasDaoTiersC4 = corrected.substring(corrected.indexOf('DAO_TIERS:')).includes('c4_open');
console.log('STORIES has c4_open:', hasStoriesC4);
console.log('DAO_TIERS has c4_open:', hasDaoTiersC4);

if (hasStoriesC4 && !hasDaoTiersC4) {
  fs.writeFileSync('js/data/game-data.js', corrected, 'utf-8');
  console.log('Fix applied successfully!');
} else {
  console.error('Fix verification failed!');
}