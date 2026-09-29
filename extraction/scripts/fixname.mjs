import {readFileSync, writeFileSync} from 'node:fs';
const p = 'parse_kpi_cards.mjs';
let s = readFileSync(p, 'utf8');
s = s.replace('  const name = after(runs, "المؤشر");',
  [
    '  let name = after(runs, "المؤشر");',
    '  // A name ending in a dash continues into the next run ("… - " / "NPS").',
    '  if (/[-–]\s*$/.test(name)) {',
    '    const at = runs.indexOf("المؤشر");',
    '    name = (name + " " + (runs[at + 2] || "")).trim();',
    '  }',
  ].join('\n'));
writeFileSync(p, s);
console.log(s.includes('continues into the next run') ? 'ok' : 'NOT PATCHED');
