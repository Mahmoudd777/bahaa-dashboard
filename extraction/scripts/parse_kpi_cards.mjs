// Every indicator card states its formula and its two cumulation rules. The
// formula sits before its label because the page is right to left; the rest
// follow theirs. Only 1 of 24 formulas had been read in, and neither
// cumulation rule.
import {readFileSync, writeFileSync} from 'node:fs';
const slides = JSON.parse(readFileSync('deck05.json', 'utf8'));

const after = (runs, label) => {
  const at = runs.indexOf(label);
  if (at < 0) return '';
  let value = (runs[at + 1] || '').trim();
  // "غير تراكمي" is sometimes split across two runs.
  if (value === 'غير') value = (value + ' ' + (runs[at + 2] || '')).trim();
  return value;
};
// A formula can run over several boxes ("… =" / "a ÷ b" / "× 100"), so the
// runs before its label are joined until another label is reached.
const LABELS = ["المستهدفات", "المؤشر", "مالك المؤشر", "وصف المؤشر",
                "دورية القياس", "قطبية المؤشر", "وحدة القياس", "مصدر البيانات",
                "الهدف الاستراتيجي", "خط الأساس", "سنة خط الأساس", "المستهدف"];
const before = (runs, label) => {
  const at = runs.indexOf(label);
  if (at < 1) return "";
  const parts = [];
  for (let i = at - 1; i >= 0 && parts.length < 6; i--) {
    const run = (runs[i] || "").trim();
    if (!run) continue;
    if (LABELS.includes(run) || run.startsWith("التراكمية")) break;
    parts.unshift(run);
    if (/=/.test(run)) break;   // the head of the formula
  }
  return parts.join(" ").replace(/s+/g, " ").trim();
};

const rows = [];
for (const [key, runs] of Object.entries(slides)) {
  if (!runs.includes('معادلة المؤشر')) continue;
  let name = after(runs, 'المؤشر');
  // A name ending in a dash continues into the next run ("… -" then "NPS").
  if (/[-–]\s*$/.test(name)) {
    const at = runs.indexOf('المؤشر');
    name = (name + ' ' + (runs[at + 2] || '')).trim();
  }
  if (!name) continue;
  const formula = before(runs, 'معادلة المؤشر');
  rows.push({
    slide: +key,
    name,
    // A formula run is prose containing "=" or a sum; anything shorter is a
    // stray label that happened to land there.
    formula: formula.length > 20 ? formula : '',
    cumulative_in_year: after(runs, 'التراكمية داخل السنة للمؤشر'),
    cumulative_annual: after(runs, 'التراكمية السنوية للمؤشر'),
    frequency: after(runs, 'دورية القياس'),
    direction: after(runs, 'قطبية المؤشر'),
    owner: after(runs, 'مالك المؤشر'),
  });
}

const esc = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
const cols = ['name', 'formula', 'cumulative_in_year', 'cumulative_annual',
              'frequency', 'direction', 'owner', 'slide'];
writeFileSync('sheets/34_kpi_card_fields.csv',
  '\ufeff' + [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n') + '\n');

console.log('cards:', rows.length);
console.log('with a formula:', rows.filter((r) => r.formula).length);
const tally = (f) => {
  const counts = {};
  for (const r of rows) counts[r[f] || '(blank)'] = (counts[r[f] || '(blank)'] || 0) + 1;
  return Object.entries(counts).map(([k, v]) => `${k}:${v}`).join('  ');
};
console.log('cumulative in year :', tally('cumulative_in_year'));
console.log('cumulative annual  :', tally('cumulative_annual'));
console.log('frequency          :', tally('frequency'));
console.log('direction          :', tally('direction'));
