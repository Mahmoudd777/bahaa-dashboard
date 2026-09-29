import {readFileSync, writeFileSync} from 'node:fs';
const p = 'D:/APPS/project/custom_addons/CLIENT_DATA.md';
let s = readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(nl);

const old = L([
  '- **No project-level detail for the *existing* investment portfolio.** The',
  '  14.83bn across 49 projects is given only as totals per stage; those projects',
  '  are not named. This is not true of the *pipeline*: the thirty opportunities',
  '  the office markets to the private sector are each named and costed (see',
  '  below).']);
const fresh = L([
  '- **Only partial project-level detail for the existing investment portfolio.**',
  '  The 14.83bn across 49 projects is given as totals per stage. Twenty of those',
  '  projects are named on two map slides — ten the office supports and ten run',
  '  by the region\u2019s cooperatives — and those are loaded. The source says',
  '  outright that its list is not exhaustive, and its named projects come to',
  '  9.9bn against the 14bn it states in the same breath, so the rest stay',
  '  unnamed.']);
if (!s.includes(old)) { console.log('portfolio bullet not found'); process.exit(1); }
s = s.replace(old, fresh);

s = s.replace('| Challenges and their mitigation | 41, across 8 dimensions | آليات معالجة التحديات |',
  L(['| Challenges and their mitigation | 41, across 8 dimensions | آليات معالجة التحديات |',
     '| Named investment projects | 20 (10 supported, 10 third-sector) | خرائط المشاريع الاستثمارية (صور) |']));

s = s.replace('## The field-by-field audit', L([
  '## Looking at the pictures',
  '',
  'Six sweeps read the decks as text. The seventh looked at them. The six decks',
  'hold 1,601 images, 868 of them distinct and large enough to carry anything;',
  'laid out on contact sheets they were examined one by one.',
  '',
  'Most are what you would expect: photographs of the region, renders, ministry',
  'logos, icons and patterns. Around sixty are something else — **screenshots of',
  'slides**, whose text is not in the presentation\u2019s XML at all and which every',
  'text-based sweep was therefore blind to.',
  '',
  'Two of them carry records:',
  '',
  '- **Ten investment projects the office supports**, named, with budgets from',
  '  55 million to 7.5 billion, their sector and their stage in the pipeline —',
  '  approved, out to market, contracted with land allocated, or under',
  '  construction.',
  '- **Ten third-sector projects** run by the region\u2019s agricultural, beekeeping',
  '  and housing cooperatives, each with its owner, its budget and how far along',
  '  it is. These are the first per-project completion figures in the whole body',
  '  of material.',
  '',
  'Both sets are other people\u2019s delivery, so they sit in categories that do not',
  'count toward the office\u2019s performance. One budget is printed malformed in the',
  'source itself \u2014 "18,000,00" \u2014 and is recorded with that noted rather than',
  'quietly corrected.',
  '',
  'The rest of the screenshots are the current-state assessment, the',
  'competitiveness and benchmarking analysis, the vision options and their',
  'scoring, official letters, an organisation chart, and reference slides lifted',
  'from other national strategies \u2014 analysis, not records. One of them, a',
  'summary of the five programmes, shows a different split of initiatives (4 and',
  '3 where the text says 5 and 2); three text sources and the initiative codes',
  'themselves agree against it, so it is an older iteration and the database',
  'follows the text.',
  '',
  '## The field-by-field audit']));

writeFileSync(p, s);
console.log('patched');
