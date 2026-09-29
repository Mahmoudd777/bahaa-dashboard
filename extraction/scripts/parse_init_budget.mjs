// The programmes deck opens with one page giving every initiative's budget.
// Nine carry an amount; the other ten are marked "مبادرة صفرية" — delivered
// from the office's own operating budget rather than from the strategy's
// hundred million. That distinction is stated nowhere else, and without it a
// zero-budget initiative is indistinguishable from one whose budget is simply
// missing.
//
// The page is a diagram, not a table: codes arrive split across runs
// ("0" "4" ".01"), so fragments are accumulated until they form a code.
import {readFileSync, writeFileSync} from 'node:fs';
const slides = JSON.parse(readFileSync('deck01.json', 'utf8'));
const runs = slides['2'];

const rows = [];
let fragment = '';
let pending = null;   // a code waiting for its name and budget

const flush = () => { fragment = ''; };

for (let i = 0; i < runs.length; i++) {
  const run = runs[i];

  // Accumulate digits and dots until they spell a code.
  if (/^[0-9.]{1,5}$/.test(run)) {
    fragment += run;
    const match = fragment.match(/(0[1-9])\.([0-9]{2})$/);
    if (match) {
      pending = {code: `${match[1]}.${match[2]}`, name: '', budget: null, zero: false};
      rows.push(pending);
      flush();
    } else if (fragment.length > 6) {
      flush();
    }
    continue;
  }
  flush();

  if (!pending) continue;
  if (run === 'مبادرة صفرية') { pending.zero = true; pending = null; continue; }
  if (run === 'الميزانية') {
    // "الميزانية" then the amount, which may itself be split ("2" "0").
    let amount = '';
    for (let j = i + 1; j < runs.length && amount.length < 3; j++) {
      if (/^[0-9]+$/.test(runs[j])) { amount += runs[j]; continue; }
      if (runs[j] === 'مليون') break;
      break;
    }
    if (amount) { pending.budget = parseInt(amount, 10); pending = null; }
    continue;
  }
  if (!pending.name && /^[\u0600-\u06FF]/.test(run) && run.length > 18) pending.name = run;
}

// The page lists each initiative once; keep the first reading of each code.
const seen = new Map();
for (const r of rows) if (!seen.has(r.code)) seen.set(r.code, r);
const out = [...seen.values()].sort((a, b) => a.code.localeCompare(b.code));

writeFileSync('sheets/30_initiative_budgets.csv',
  '\ufeff' + ['code,budget_sar_m,zero_budget'].concat(
    out.map((r) => `${r.code},${r.budget ?? ''},${r.zero ? 'yes' : ''}`)).join('\n') + '\n');

const total = out.reduce((a, r) => a + (r.budget || 0), 0);
console.log('initiatives found:', out.length);
console.log('with an amount:', out.filter((r) => r.budget).length,
  '| marked zero-budget:', out.filter((r) => r.zero).length,
  '| neither:', out.filter((r) => !r.budget && !r.zero).map((r) => r.code).join(',') || 'none');
console.log('budget total:', total, '(the strategy budget is 100)');
for (const r of out) {
  console.log(' ', r.code, (r.budget ? String(r.budget) + 'm' : r.zero ? 'صفرية' : '?').padEnd(8), r.name.slice(0, 60));
}
