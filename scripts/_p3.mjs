import fs from 'node:fs';
let s = fs.readFileSync('tests/verify-v3.mjs', 'utf8');
const marker = `      await clickPopupBtn(0); // 择出身：山村猎户
      await sleep(700);`;
const rep = `      await clickPopupBtn(0); // 择出身：山村猎户
      await sleep(350);
      // v38（E318）：转世劫难三连弹——各选「不请此劫」（末项）
      for (let i = 0; i < 3; i++) { await clickPopupBtn(1); await sleep(300); }
      await sleep(400);`;
if (!s.includes(marker)) { console.error('miss2'); process.exit(1); }
s = s.replace(marker, rep);
fs.writeFileSync('tests/verify-v3.mjs', s);
console.log('patched v3 trials');
