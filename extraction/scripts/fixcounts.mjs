import {readFileSync, writeFileSync} from 'node:fs';
const p = 'deck06_counts.mjs';
let s = readFileSync(p, 'utf8');
const a = s.indexOf('const HEADER =');
const b = s.indexOf('const per = new Map();');
s = s.slice(0, a) + [
  '// Rather than trying to name every header variant — the milestone tables',
  '// head their first column three different ways and carry a second header',
  '// row of quarters plus an unnamed totals row — a row counts as data when it',
  '// has the shape of data: a milestone needs a name and a period, a risk needs',
  '// a name and a numeric score.',
  'const isMilestone = (r) => r[0] && /Q\s*\d|السنة/.test(r[1] || "");',
  'const isRisk = (r) => r[0] && /^\d+$/.test((r[1] || "").trim());',
  '',
].join('\n') + s.slice(b);
s = s.replace("bump(code, 'milestones', table.rows.filter((r) => r[0] && !HEADER.test(r[0])).length);",
  "bump(code, 'milestones', table.rows.filter(isMilestone).length);");
s = s.replace("bump(code, 'risks', table.rows.filter((r) => r[0] && !HEADER.test(r[0]) && r[1] && r[1] !== 'النتيجة').length);",
  "bump(code, 'risks', table.rows.filter(isRisk).length);");
writeFileSync(p, s);
console.log('ok');
