import {readFileSync, writeFileSync} from 'node:fs';
const p = 'D:/APPS/project/custom_addons/CLIENT_DATA.md';
let s = readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(nl);

s = s.replace('| Objective descriptions and pillars | 11 | البيت الاستراتيجي |',
  L(['| Objective descriptions and pillars | 11 | البيت الاستراتيجي |',
     '| Indicator formulas and cumulation rules | 24 | بطاقات المؤشرات |',
     '| Official indicator codes (K1.1–K11.1) | 15 | البيت الاستراتيجي |']));

s = s.replace('## Where the budget figures come from, and how they check out', L([
  '## The indicator cards',
  '',
  "Each of the 24 cards states its indicator's formula and two separate",
  'cumulation rules: whether values accumulate within a year, and whether they',
  'accumulate across years. Only one formula had been read in and neither rule',
  'for any indicator, which left the dashboard unable to tell a running total',
  'from a snapshot — an error that produces figures looking perfectly plausible',
  'and wrong. All 24 now carry all three: 14 accumulate within the year, 11',
  'across years.',
  '',
  'The measurement frequency and direction already on record were checked',
  'against the cards rather than overwritten. They agreed everywhere.',
  '',
  'The strategy refers to a pillar-level indicator as K<objective>.<n>. Those',
  'codes were rebuilt from the objectives and their indicators and then checked',
  'against the fifteen printed in the deck — the two sets matched exactly, and',
  'every objective link implied by a code agreed with the one already stored.',
  'The nine vision-level impact indicators have no such code; the decks give',
  'them none.',
  '',
  '## Where the budget figures come from, and how they check out']));

writeFileSync(p, s);
console.log('patched');
