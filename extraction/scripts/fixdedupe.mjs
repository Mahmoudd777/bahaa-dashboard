import {readFileSync, writeFileSync} from 'node:fs';
const p = 'deck06_counts.mjs';
let s = readFileSync(p, 'utf8');
s = s.replace("bump(code, 'risks', table.rows.filter(isRisk).length);",
  [
    '    // A card that runs over two pages reprints its whole risk panel, so',
    '    // the same risk arrives twice. Count each risk once per initiative.',
    '    for (const r of table.rows.filter(isRisk)) {',
    "      const k = code + '|' + (r[4] || '').replace(/[^\w\u0600-\u06FF]/g, '');",
    '      if (seenRisk.has(k)) continue;',
    '      seenRisk.add(k);',
    "      bump(code, 'risks', 1);",
    '    }',
  ].join('\n'));
s = s.replace('const per = new Map();', 'const seenRisk = new Set();\nconst per = new Map();');
writeFileSync(p, s);
console.log('ok');
