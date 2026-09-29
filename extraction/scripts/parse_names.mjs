// The stakeholder-map pages carry a clean pairing: the initiative's full title
// and its number, on every one of them. Two pages per initiative means each
// name is stated twice, so a misread shows up as a disagreement.
import {readFileSync, writeFileSync} from 'node:fs';
const slides = JSON.parse(readFileSync('all_slides.json', 'utf8'));

const found = new Map();
for (const [key, runs] of Object.entries(slides)) {
  const at = runs.findIndex((r) => r === 'رقم المبادرة');
  if (at < 0) continue;
  let code = null;
  if (/^0[1-9]\.[0-9]{2}$/.test(runs[at - 1] || '')) code = runs[at - 1];
  else if (/^[0-9]$/.test(runs[at - 1] || '') && /^0[1-9]\.[0-9]$/.test(runs[at - 2] || '')) {
    code = runs[at - 2] + runs[at - 1];
  }
  if (!code) continue;
  // The title is the longest run on the page that is not a bulleted body line.
  const title = runs
    .filter((r) => r.length > 30 && r.length < 140 && !r.startsWith('•') &&
                   !r.includes('تهدف المبادرة') && !r.includes(':'))
    .sort((a, b) => b.length - a.length)[0];
  if (!title) continue;
  if (!found.has(code)) found.set(code, new Map());
  const counts = found.get(code);
  counts.set(title, (counts.get(title) || 0) + 1);
}

const out = [];
for (const [code, counts] of [...found].sort()) {
  const ranked = [...counts].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
  out.push({code, name: ranked[0][0], agreed: ranked[0][1], variants: ranked.length});
}
writeFileSync('init_names_clean.json', JSON.stringify(out, null, 1));
console.log('codes:', out.length);
for (const r of out) console.log(r.code, r.agreed + 'x', r.variants > 1 ? '(variants ' + r.variants + ')' : '        ', r.name.slice(0, 88));
