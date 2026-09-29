// The second page for each pillar carries a targets table as loose runs. Each
// row reads: the five yearly targets newest first, then the baseline, then the
// marker "(2025)", then the indicator's name. Anchoring on that marker is what
// makes the row recoverable — the values themselves give no clue where a row
// begins.
import {readFileSync, writeFileSync} from 'node:fs';
const slides = JSON.parse(readFileSync('deck02.json', 'utf8'));

const YEARS = [2030, 2029, 2028, 2027, 2026];
const num = (s) => {
  const t = String(s ?? '').replace(/,/g, '').replace('%', '').trim();
  return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
};

const rows = [];
for (const [key, runs] of Object.entries(slides)) {
  for (let i = 0; i < runs.length; i++) {
    if (runs[i] !== '(2025)') continue;
    const values = runs.slice(i - 6, i).map(num);
    if (values.length !== 6 || values.some((v) => v === null)) continue;
    let name = (runs[i + 1] || '').trim();
    // A unit sits in its own run after the name.
    const unit = (runs[i + 2] || '').trim();
    // Some names are split; join the following short run when it is not a unit.
    if (name.length < 16 && runs[i + 2] && !/^\(/.test(unit)) name = (name + ' ' + unit).trim();
    if (!name || name.length < 8) continue;
    rows.push({
      slide: +key,
      name,
      unit: /^\(/.test(unit) ? unit.replace(/[()]/g, '') : '',
      baseline: values[5],
      targets: Object.fromEntries(YEARS.map((y, k) => [y, values[k]])),
    });
  }
}

const esc = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
const header = ['kpi', 'unit', 'baseline_2025', ...YEARS.slice().reverse(), 'slide'];
writeFileSync('sheets/33_pillar_targets.csv',
  '\ufeff' + [header.join(',')].concat(rows.map((r) =>
    [r.name, r.unit, r.baseline, ...YEARS.slice().reverse().map((y) => r.targets[y]), r.slide]
      .map(esc).join(','))).join('\n') + '\n');

console.log('target rows:', rows.length);
for (const r of rows) {
  const rising = YEARS.slice().reverse().map((y) => r.targets[y]);
  console.log(' ', String(r.slide).padStart(2), r.name.slice(0, 46).padEnd(48),
    'base', String(r.baseline).padStart(7), '->', rising.join(' '));
}
