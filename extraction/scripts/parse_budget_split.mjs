// Each initiative card states its budget three ways: operational, capital and
// total, with "-" where a line does not apply. The value follows its label,
// and "مليون" closes it; anything else after the label means the line is
// empty. Read from the card because the card is where the split is stated —
// the programmes deck gives only the total.
import {readFileSync, writeFileSync} from 'node:fs';
const slides = JSON.parse(readFileSync('deck06.json', 'utf8'));

const amountAfter = (runs, label) => {
  const at = runs.indexOf(label);
  if (at < 0) return null;
  const value = runs[at + 1];
  if (value === undefined || /^[-–]$/.test(value)) return 0;
  const n = parseFloat(String(value).replace(/,/g, ''));
  if (!Number.isFinite(n)) return 0;
  // The amount is only an amount when "مليون" follows it.
  return /^مليو/.test(runs[at + 2] || '') ? n : 0;
};

const found = new Map();
for (const [key, runs] of Object.entries(slides)) {
  if (!runs.some((r) => r.includes('الموازنة التقديرية'))) continue;
  let code = runs.find((r) => /^0[1-9]\.[0-9]{2}$/.test(r));
  if (!code) {
    const at = runs.findIndex((r, i) => /^0[1-9]\.[0-9]$/.test(r) && /^[0-9]$/.test(runs[i + 1] || ''));
    if (at >= 0) code = runs[at] + runs[at + 1];
  }
  if (!code || found.has(code)) continue;
  found.set(code, {
    code,
    slide: +key,
    operational: amountAfter(runs, 'تشغيلية'),
    capital: amountAfter(runs, 'رأسمالية'),
    total: amountAfter(runs, 'إجمالي'),
  });
}

const out = [...found.values()].sort((a, b) => a.code.localeCompare(b.code));
writeFileSync('sheets/31_budget_split.csv',
  '\ufeff' + ['code,capital_sar_m,operational_sar_m,total_sar_m,slide'].concat(
    out.map((r) => `${r.code},${r.capital},${r.operational},${r.total},${r.slide}`)).join('\n') + '\n');

const sum = (f) => out.reduce((a, r) => a + r[f], 0);
console.log('cards:', out.length);
console.log('capital %s + operational %s = %s  (total column says %s)'.replace(/%s/g, () => ''),
  sum('capital'), '+', sum('operational'), '=', sum('capital') + sum('operational'),
  '| total column:', sum('total'));
const bad = out.filter((r) => Math.abs(r.capital + r.operational - r.total) > 0.01);
console.log('rows where capital + operational does not equal the total:',
  bad.map((r) => r.code).join(',') || 'none');
for (const r of out) console.log(' ', r.code, 'cap', String(r.capital).padStart(4), 'opex', String(r.operational).padStart(4), 'total', String(r.total).padStart(4));
