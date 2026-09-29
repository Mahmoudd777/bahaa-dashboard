import {readFileSync, writeFileSync} from 'node:fs';
const p = 'D:/APPS/project/custom_addons/CLIENT_DATA.md';
let s = readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(nl);

s = s.replace(
  '| Investment opportunities | 30, with feasibility studies | دراسات الجدوى الاقتصادية للفرص الاستثمارية |',
  L(['| Investment opportunities | 30, with feasibility studies | دراسات الجدوى الاقتصادية للفرص الاستثمارية |',
     '| Challenges and their mitigation | 41, across 8 dimensions | آليات معالجة التحديات |']));

s = s.replace('## The investment opportunities', L([
  '## Reading the decks against their own contents page',
  '',
  'The detailed document has a table of contents — ten sections and fifteen',
  'appendices. Checking each one in turn, rather than searching for tables, is',
  'what turned up the two largest omissions: appendix 15, the thirty investment',
  'opportunities, and appendix 7, the challenges. Both hold their figures as',
  'slide text, so a sweep that looked only at tables could never have found them.',
  '',
  'Every appendix is now accounted for. Sections 8 to 10 — governance, launch and',
  'activation — are the national strategy lifecycle framework and carry no',
  'Al-Baha records.',
  '',
  '## The challenges',
  '',
  "Appendix 7 works through the region's challenges across eight dimensions —",
  'natural assets, real estate, the economic engine, urban planning,',
  'infrastructure, culture and heritage, demographics, and institutions. For each',
  'of its 41 challenges it states the mechanism chosen to address it, the planned',
  'initiatives that carry the work, and the existing government projects that',
  'already touch it.',
  '',
  'It is the link between the diagnosis and the portfolio — the reason each',
  'initiative exists. 125 initiative links were recovered, covering 18 of the 19',
  'initiatives; only 05.01, a coordination initiative, answers no specific',
  'challenge. The initiatives are named in prose, so the raw wording is kept',
  'beside the links.',
  '',
  '## The investment opportunities']));

const oldTail = L([
  'Analysis and narrative rather than records: regional benchmarks against عسير,',
  'الرياض and جازان; the launch communications plan; guiding principles; the',
  'escalation matrix; sector competitiveness scoring; committee remark counts;',
  'and the historical resolutions establishing the office (ق1/ل ش 5/1444هـ).']);
const newTail = L([
  'Analysis and narrative rather than records: regional benchmarks against عسير,',
  'الرياض and جازان; the launch communications plan; guiding principles; the',
  'escalation matrix; sector competitiveness scoring; committee remark counts; the',
  'national strategy lifecycle roles and responsibilities; and the historical',
  'resolutions establishing the office (ق1/ل ش 5/1444هـ).',
  '',
  'Also left: the **citizen workshop findings** (appendix 13). Five workshops were',
  'held with women, young people, and people working in investment, tourism and',
  'agriculture, producing 13 findings across three sectors, each sector linked to',
  'objectives and initiatives. The findings are quoted verbatim and the layout',
  'does not tie an individual quote to an individual objective, so loading them',
  'would mean inventing an attribution the source does not make. The same ground',
  'is covered, with proper per-row attribution, by the challenges above. They are',
  'kept in the sheets.',
  '',
  'Also left: the **two cinema projects** (appendix 14) — one open in Baljurashi',
  'Mall, one planned in Baha Mall for 2027. They are private ventures with no',
  'budget, dates or progress reported, so a project record would hold nothing but',
  'a name.']);
if (!s.includes(oldTail)) { console.log('tail not found'); process.exit(1); }
s = s.replace(oldTail, newTail);
writeFileSync(p, s);
console.log('patched');
