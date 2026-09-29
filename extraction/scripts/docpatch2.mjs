import {readFileSync, writeFileSync} from 'node:fs';
const p = 'D:/APPS/project/custom_addons/CLIENT_DATA.md';
let s = readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(nl);

const old = L([
  '- **No budget for 11 of the 19 initiatives.** Their cards carry "-" in the',
  '  estimated-budget row. 02.04 has no budget line at all.']);
const fresh = L([
  '- **Ten initiatives carry no budget on purpose.** Their cards show "-" in the',
  '  estimated-budget row, which reads like missing data. It is not: the',
  '  programmes deck marks each of them مبادرة صفرية — delivered from the',
  "  office's own operating budget rather than from the strategy's hundred",
  '  million. They are flagged `zero_budget` so the dashboard does not present a',
  '  deliberate decision as a gap. The other nine add to exactly a hundred',
  '  million, split 12 capital against 88 operational.']);
if (!s.includes(old)) { console.log('budget bullet not found'); process.exit(1); }
s = s.replace(old, fresh);

s = s.replace('| Challenges and their mitigation | 41, across 8 dimensions | آليات معالجة التحديات |',
  L(['| Challenges and their mitigation | 41, across 8 dimensions | آليات معالجة التحديات |',
     '| Initiative budgets | 19 (9 funded, 10 zero-budget) | البرامج والمبادرات + بطاقات المبادرات |']));

s = s.replace('## The challenges', L([
  '## Where the budget figures come from, and how they check out',
  '',
  'No single page gives an initiative its budget. The programmes deck states',
  'each total and marks the ten zero-budget initiatives; the cards give the',
  'split between capital and operational. Read together they close three ways,',
  'and all three had to hold before the figures were written:',
  '',
  '- the nine funded initiatives add to 100 million, the stated strategy budget;',
  '- grouped by programme they give 57 / 38 / 5 / 0 / 0, matching each',
  "  programme's own budget;",
  '- the split comes to 12 capital against 88 operational, and every individual',
  '  initiative’s split equals its own total.',
  '',
  'Checking this way found three initiatives whose capital and operational',
  'figures were wrong — 01.02 had been recorded as 25 capital and 4.6',
  'operational against a total of 25, which reconciles with nothing. The totals',
  'themselves were already right.',
  '',
  '## The challenges']));

writeFileSync(p, s);
console.log('patched');
