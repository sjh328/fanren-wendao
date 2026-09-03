
/* ======================================================================
 * §1.6 v13 程序化美术 Art（零外部资源）
 * Art.scene(mapId)：地图山水插画（内联 SVG：渐变天色 + 层叠山峦 + 地标元素）；
 * Art.monster(species, elite)：战斗敌方剪影立绘（蛇/兽/虫群/草木/阴魂/灵体/人形/傀儡）。
 * ====================================================================== */
const Art = {
  /** 各地图场景配色与地标 */
  SCENES: {
    village:  { sky: ['#f3ecd6', '#e5d9b8'], hills: ['#8fa878', '#6d8a5b', '#4d6b44'], landmark: 'house', mist: '#f6f0dd' },
    qingfeng: { sky: ['#e9efdd', '#d5e2c3'], hills: ['#7fa2a0', '#5b8484', '#3e6567'], landmark: 'peak', mist: '#eef3e2' },
    heifeng:  { sky: ['#e3ddcc', '#c9c0a6'], hills: ['#6e6a5c', '#525046', '#383630'], landmark: 'fort', mist: '#ddd6c2' },
    forest:   { sky: ['#e7ecd4', '#d0dcbc'], hills: ['#5e8a54', '#456e3f', '#2e5230'], landmark: 'trees', mist: '#e9efdb' },
    ruins:    { sky: ['#ece4cf', '#d8ccb0'], hills: ['#a89a78', '#8a7c5e', '#6a5e46'], landmark: 'pillar', mist: '#efe7d2' },
    wanyao:   { sky: ['#e4dcea', '#c9bdd6'], hills: ['#7a5f94', '#5c4576', '#40305a'], landmark: 'horn', mist: '#e6def0' },
    youming:  { sky: ['#d9ddd2', '#b8c2b4'], hills: ['#4a6258', '#354c44', '#22352f'], landmark: 'flame', mist: '#cfd8cc' },
    feizhou:  { sky: ['#dfe3ee', '#c3cbdd'], hills: ['#6a7898', '#4d5b7c', '#344064'], landmark: 'ship', mist: '#e2e7f2' },
    longyuan: { sky: ['#d6e2e6', '#b2c8cf'], hills: ['#3e6e80', '#2a5264', '#1a3a4a'], landmark: 'whirl', mist: '#cfdfe4' },
  },
  /** 生成地图场景插画 SVG（viewBox 600x150）；season 0~3 叠加季节薄色 */
  scene(mapId, season = -1) {
    const S = this.SCENES[mapId] || this.SCENES.village;
    const gid = 'sg' + mapId;
    // 三层山峦（折线剪影）
    const hill = (y, amp, color, op) => {
      let pts = `0,${150 - y}`;
      for (let x = 0; x <= 600; x += 50) {
        const h = 18 + Math.abs(Math.sin((x + y * 7 + mapId.charCodeAt(0)) * 0.031)) * amp;
        pts += ` ${x},${150 - y - h}`;
      }
      pts += ` 600,${150 - y} 600,150 0,150`;
      return `<polygon points="${pts}" fill="${color}" opacity="${op}"/>`;
    };
    let landmark = '';
    const c = S.hills;
    if (S.landmark === 'house') landmark = `<g opacity="0.85"><rect x="70" y="96" width="26" height="18" fill="#5a4a38"/><polygon points="66,96 96,96 81,84" fill="#3e332a"/><rect x="78" y="106" width="7" height="8" fill="#2e2620"/></g>`;
    else if (S.landmark === 'peak') landmark = `<polygon points="430,20 470,110 390,110" fill="${c[2]}" opacity="0.9"/><polygon points="445,38 455,38 470,110 430,110" fill="#eef3f8" opacity="0.55"/>`;
    else if (S.landmark === 'fort') landmark = `<g opacity="0.9"><rect x="440" y="62" width="52" height="48" fill="#2e2c26"/><polygon points="436,62 496,62 466,44" fill="#26241f"/><rect x="460" y="88" width="12" height="22" fill="#191713"/></g>`;
    else if (S.landmark === 'trees') landmark = `<g opacity="0.9"><rect x="500" y="86" width="5" height="26" fill="#3a3226"/><circle cx="502" cy="80" r="14" fill="#2e5230"/><rect x="530" y="94" width="4" height="18" fill="#3a3226"/><circle cx="532" cy="88" r="10" fill="#355c33"/></g>`;
    else if (S.landmark === 'pillar') landmark = `<g opacity="0.9"><rect x="120" y="52" width="12" height="60" fill="#7a6c50"/><rect x="140" y="66" width="10" height="46" fill="#6d6048"/><rect x="112" y="46" width="28" height="8" fill="#857760"/></g>`;
    else if (S.landmark === 'horn') landmark = `<polygon points="420,18 448,84 396,84" fill="${c[2]}"/><path d="M410 60 q10 -22 20 0 q-10 -8 -20 0" fill="#c9b6e0" opacity="0.5"/>`;
    else if (S.landmark === 'flame') landmark = `<g opacity="0.95"><path d="M470 100 q-6 -18 6 -30 q-2 14 8 20 q10 6 2 22 q-8 10 -16 0 q-6 -6 0 -12" fill="#8fd0a8" opacity="0.75"/><path d="M510 106 q-4 -12 5 -22 q-1 10 6 15 q7 5 1 16 q-6 7 -11 0 q-4 -4 -1 -9" fill="#8fd0a8" opacity="0.5"/></g>`;
    else if (S.landmark === 'ship') landmark = `<g opacity="0.95"><ellipse cx="440" cy="66" rx="52" ry="10" fill="#8c94b4"/><ellipse cx="440" cy="56" rx="34" ry="8" fill="#a6aec8"/><polygon points="430,40 466,40 448,18" fill="#b8c0d6" opacity="0.8"/><circle cx="448" cy="30" r="4" fill="#eef2ff" opacity="0.9"/></g>`;
    else if (S.landmark === 'whirl') landmark = `<g opacity="0.9"><path d="M430 66 q30 -26 60 0 q-30 26 -60 0" fill="none" stroke="#a8ccd8" stroke-width="4"/><path d="M440 66 q20 -14 40 0 q-20 14 -40 0" fill="none" stroke="#cfe6ee" stroke-width="3"/><circle cx="460" cy="66" r="7" fill="#123240"/></g>`;
    return `<svg class="scene-svg" viewBox="0 0 600 150" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${S.sky[0]}"/><stop offset="1" stop-color="${S.sky[1]}"/>
      </linearGradient></defs>
      <rect width="600" height="150" fill="url(#${gid})"/>
      <circle cx="500" cy="34" r="20" fill="#fdf8ea" opacity="0.85"/>
      ${hill(36, 46, S.hills[0], 0.85)}
      ${hill(22, 40, S.hills[1], 0.9)}
      ${landmark}
      ${hill(8, 34, S.hills[2], 0.95)}
      <ellipse cx="180" cy="132" rx="200" ry="26" fill="${S.mist}" opacity="0.65"/>
      <ellipse cx="470" cy="140" rx="220" ry="24" fill="${S.mist}" opacity="0.5"/>
      ${season >= 0 ? `<rect width="600" height="150" fill="${this.SEASON_TINT[season] || 'none'}" opacity="0.07"/>` : ''}
    </svg>`;
  },
  /** 战斗敌方剪影立绘（species 形象；elite 加妖光角标） */
  monster(species, elite = false) {
    const P = {
      beast: '<path d="M18 62 L22 40 Q20 30 28 26 L34 18 L38 27 Q44 24 50 26 L56 17 L60 26 Q68 30 66 40 L70 62 Z" /><circle cx="36" cy="31" r="1.8" fill="#ffe9b0"/><circle cx="52" cy="31" r="1.8" fill="#ffe9b0"/>',
      snake: '<path d="M20 62 Q14 50 22 44 Q34 36 30 26 Q38 12 50 20 Q58 26 52 34 Q64 40 58 50 Q70 54 78 62 Z" /><circle cx="47" cy="23" r="1.8" fill="#ffd28a"/>',
      swarm: '<g><ellipse cx="34" cy="46" rx="9" ry="6"/><ellipse cx="52" cy="38" rx="7" ry="5"/><ellipse cx="48" cy="54" rx="8" ry="5"/><ellipse cx="62" cy="50" rx="6" ry="4"/><path d="M30 42 q-6 -8 2 -10" fill="none" stroke-width="2" stroke="inherit"/></g>',
      plant: '<path d="M40 62 Q36 44 44 34 Q40 22 52 16 Q64 22 60 34 Q68 44 64 62 Z" /><path d="M46 40 q-14 -4 -18 -14 q12 0 20 8" /><path d="M58 44 q14 -6 16 -16 q-12 2 -18 10" />',
      ghost: '<path d="M22 62 Q20 30 44 26 Q68 30 66 62 L58 56 L50 62 L42 56 L32 62 Z" opacity="0.85"/><circle cx="38" cy="40" r="2.4" fill="#e8f4ff"/><circle cx="52" cy="40" r="2.4" fill="#e8f4ff"/>',
      element: '<path d="M42 18 Q60 30 54 44 Q66 48 60 62 L32 62 Q26 46 38 40 Q30 30 42 18 Z" opacity="0.9"/>',
      human: '<g><circle cx="44" cy="24" r="8"/><path d="M30 62 L32 38 Q44 30 56 38 L58 62 Z"/><path d="M56 36 L74 22" stroke-width="4" stroke="inherit" fill="none"/></g>',
      construct: '<g><rect x="30" y="14" width="28" height="18" rx="3"/><rect x="24" y="36" width="40" height="26" rx="3"/><rect x="12" y="40" width="10" height="14" rx="2"/><rect x="66" y="40" width="10" height="14" rx="2"/><circle cx="39" cy="23" r="2.5" fill="#ffe9b0"/><circle cx="49" cy="23" r="2.5" fill="#ffe9b0"/></g>',
    };
    const color = elite ? '#5f3a44' : '#3f4a52';
    const glow = elite ? '<circle cx="44" cy="40" r="34" fill="none" stroke="#a04ab0" stroke-width="1.4" opacity="0.4" stroke-dasharray="5 4"/>' : '';
    return `<svg viewBox="0 0 88 66" class="fig-svg" aria-hidden="true"><g fill="${color}" stroke="${color}">${P[species] || P.beast}</g>${glow}</svg>`;
  },
  /** v18：主角剪影立绘（按大道区分持物） */
  player(dao) {
    const items = {
      sword: '<path d="M50 40 L70 20" stroke-width="3.5" fill="none"/>',
      pill: '<ellipse cx="66" cy="30" rx="7" ry="5" fill="#7c5cb0" stroke="#7c5cb0"/>',
      talisman: '<rect x="62" y="18" width="9" height="14" rx="1.5" fill="#c04b4b" stroke="#c04b4b"/>',
      body: '<circle cx="62" cy="26" r="6" fill="#a8862a" stroke="#a8862a"/>',
      array: '<polygon points="60,32 68,26 72,34 66,40" fill="none" stroke-width="2"/>',
      demonic: '<path d="M52 44 Q60 34 70 40 Q66 46 58 48 Z" fill="#7c2a22" stroke="#7c2a22"/>',
    };
    const item = items[dao] || '<path d="M50 40 L68 24" stroke-width="3" fill="none"/>';
    const color = '#4a5568';
    return `<svg viewBox="0 0 88 66" class="fig-svg" aria-hidden="true"><g fill="${color}" stroke="${color}">
      <circle cx="40" cy="22" r="8"/>
      <path d="M26 62 L28 36 Q40 28 52 36 L54 62 Z"/>
      <path d="M50 36 ${item.startsWith('<path') ? '' : ''}" />
      ${item}
    </g></svg>`;
  },
  /** v19：常驻修士的程序化肖像参数（宗门定袍色，性情定持物与发色——二十四人全覆盖） */
  SECT_ROBE: { qingyun: '#5a7a9a', danxia: '#6a9a7a', wanbao: '#9a8a5a', panyan: '#8a6a4a', zhoutian: '#4a6a9a' },
  TEMPER_LOOK: {
    '孤傲': { item: 'sword', hair: '#3a4a5a' }, '温婉': { item: 'herb', hair: '#8a6a4a' },
    '温润': { item: 'scroll', hair: '#4a4038' }, '冷厉': { item: 'blade', hair: '#2a2620' },
    '玲珑': { item: 'fan', hair: '#4a3a42' }, '豪爽': { item: 'none', hair: '#3a2e22' },
    '清冷': { item: 'qin', hair: '#d8dce2' }, '精明': { item: 'fan', hair: '#3a3028' },
    '古怪': { item: 'talisman', hair: '#c8c2b2' }, '淡泊': { item: 'scroll', hair: '#e0dccf' },
    '慈悲': { item: 'herb', hair: '#b8b2a2' }, '狡黠': { item: 'shadow', hair: '#2a2620' },
    '危险': { item: 'shadow', hair: '#1e1a24' }, '娇憨': { item: 'flute', hair: '#6a4a3a' },
    '市侩': { item: 'fan', hair: '#4a4038' }, '豪迈': { item: 'none', hair: '#3a2e22' },
    '儒雅': { item: 'scroll', hair: '#4a4038' }, '圆滑': { item: 'fan', hair: '#5a4a3a' },
    '憨直': { item: 'none', hair: '#3a3028' }, '飘逸': { item: 'flute', hair: '#c8d2da' },
    '癫狂': { item: 'wine', hair: '#c8c2b2' }, '侠气': { item: 'blade', hair: '#3a3226' },
  },
  npcLook(d) {
    if (!d) return null;
    const t = this.TEMPER_LOOK[d.temper] || { item: 'none', hair: '#4a4038' };
    return { robe: this.SECT_ROBE[d.sect] || '#7a7a6a', hair: t.hair, item: t.item, aura: this.SECT_ROBE[d.sect] || '#8a8a7a' };
  },
  /** v19：季节色调（孟春嫩/仲夏翠/季秋赭/隆冬灰，按游戏月叠加一层薄色） */
  SEASON_TINT: ['#a8c89a', '#8ab89a', '#c8a878', '#a8b0b8'],
  seasonOf(p) {
    const month = p ? Math.floor((p.day || 0) / 30) % 12 : 0;
    return month <= 2 ? 0 : month <= 5 ? 1 : month <= 8 ? 2 : 3;
  },

  /** v19：人物半身像（CHARACTERS.look 参数化渲染；剧情演出与人物志共用）
   *  look = { robe 袍色, hair 发色, item 标志物, aura 灵光色 } */
  portrait(look) {
    const L = look || {};
    const robe = L.robe || '#6a7a8a', hair = L.hair || '#4a4038', aura = L.aura || robe;
    const ITEMS = {
      herb:    '<path d="M64 40 q4 -8 10 -9 q-1 8 -6 11 q6 1 8 5 q-8 2 -12 -2 Z" fill="#5a8a4a" stroke="#3e6b34" stroke-width="1"/>',
      shadow:  '<path d="M56 22 q10 4 8 14 q8 2 6 10 q-10 2 -14 -4 q-6 -10 0 -20 Z" fill="#241c30" stroke="#241c30" stroke-width="1" opacity="0.9"/>',
      furnace: '<path d="M60 34 h12 l-2 14 q-4 3 -8 0 Z" fill="#7c2a22" stroke="#4a1812" stroke-width="1"/><circle cx="66" cy="30" r="2.4" fill="#e8a04a" stroke="none"/>',
      sword:   '<path d="M58 44 L74 18" stroke-width="2.6" fill="none"/><path d="M56 46 l4 -2" stroke-width="3" fill="none"/>',
      scroll:  '<rect x="58" y="30" width="14" height="10" rx="1.5" fill="#e8e2d0" stroke="#8a7a5a" stroke-width="1"/><path d="M61 33 h8 M61 36 h8" stroke="#8a7a5a" stroke-width="1" fill="none"/>',
      seal:    '<rect x="60" y="32" width="10" height="10" rx="1" fill="#8a7ab0" stroke="#5a4a7a" stroke-width="1"/><circle cx="65" cy="37" r="2.2" fill="#e8e2f4" stroke="none"/>',
      orb:     '<circle cx="66" cy="36" r="5.5" fill="#4a9aaa" stroke="#2a6a7a" stroke-width="1.2"/><circle cx="64" cy="34" r="1.6" fill="#d0f0f6" stroke="none"/>',
      jade:    '<circle cx="66" cy="36" r="5" fill="none" stroke="#5aa06a" stroke-width="2.4"/><circle cx="66" cy="36" r="1.8" fill="#8ac89a" stroke="none"/>',
      flute:   '<path d="M56 42 L74 34" stroke-width="2.2" fill="none"/>',
      wine:    '<path d="M58 32 q6 -4 12 0 l-2 12 q-4 2 -8 0 Z" fill="#8a5a2a" stroke="#5a3a1a" stroke-width="1"/>',
      fan:     '<path d="M58 40 q10 -12 16 -6 q-4 8 -12 10 Z" fill="#c9b68a" stroke="#8a7a5a" stroke-width="1"/>',
      blade:   '<path d="M58 42 Q68 34 76 22" stroke-width="3" fill="none"/>',
      qin:     '<rect x="56" y="34" width="18" height="7" rx="2" fill="#5a4432" stroke="#3a2c20" stroke-width="1"/><path d="M59 37 h12" stroke="#c9b68a" stroke-width="0.8" fill="none"/>',
      none:    '',
    };
    const item = ITEMS[L.item] || ITEMS.none;
    return `<svg viewBox="0 0 88 66" class="fig-svg portrait-svg" aria-hidden="true">
      <circle cx="44" cy="34" r="30" fill="${aura}" opacity="0.10"/>
      <circle cx="44" cy="34" r="30" fill="none" stroke="${aura}" stroke-width="0.8" opacity="0.28"/>
      <g stroke="${robe}" fill="${robe}">
        <path d="M18 66 L21 42 Q30 34 40 35 L52 36 Q62 35 68 44 L70 66 Z"/>
        <circle cx="40" cy="24" r="8.4" fill="#efe6d4"/>
        <path d="M31.5 22 Q33 12 40 12 Q47 12 48.5 22 Q46 17 40 17 Q34 17 31.5 22 Z" fill="${hair}" stroke="${hair}"/>
      </g>
      <g stroke="${hair}" stroke-width="1" fill="none" opacity="0.9">
        <circle cx="37" cy="24" r="0.9" fill="#3a3028" stroke="none"/><circle cx="43.5" cy="24" r="0.9" fill="#3a3028" stroke="none"/>
        <path d="M37.5 29 q2.5 1.6 5 0"/>
      </g>
      ${item}
    </svg>`;
  },
};
