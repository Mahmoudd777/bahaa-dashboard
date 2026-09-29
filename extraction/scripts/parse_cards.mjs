// The detailed initiative cards run in reading order: a heading, then its
// paragraphs, until the next heading. Two of their headings were never read
// into the records — the contribution to the objective and the target
// audience — so all of them are taken again here and compared.
import {readFileSync, writeFileSync} from 'node:fs';
const slides = JSON.parse(readFileSync('all_slides.json', 'utf8'));

const HEADINGS = [
  ['description', 'وصف المبادرة'],
  ['problem_statement', 'المشكلة / التحدي'],
  ['contribution', 'المساهمة في تحقيق الهدف الاستراتيجي'],
  ['target_audience', 'الشريحة / الفئة المستهدفة'],
  ['expected_impact', 'الأثر المتوقع من المبادرة'],
  ['outputs', 'مخرجات المبادرة'],
  ['objective', 'الهدف الاستراتيجي المرتبط'],
  ['owner', 'مالك المبادرة'],
  ['number_label', 'رقم المبادرة'],
  ['alignment', 'المواءمة مع'],
  ['detail_label', 'الوصف'],
];

const isHeading = (run) =>
  HEADINGS.some(([, needle]) => run.startsWith(needle) || run === needle + ':');

const rows = [];
for (const [key, runs] of Object.entries(slides)) {
  if (!runs.some((r) => r.includes('المساهمة في تحقيق الهدف الاستراتيجي'))) continue;
  // Two cards split their number across runs ("02.0" + "3").
  let code = runs.find((r) => /^0[1-9].[0-9]{2}$/.test(r));
  if (!code) {
    const at = runs.findIndex((r, k) => /^0[1-9].[0-9]$/.test(r) && /^[0-9]$/.test(runs[k + 1] || ""));
    if (at >= 0) code = runs[at] + runs[at + 1];
  }
  const record = {slide: +key, code};

  for (const [field, needle] of HEADINGS) {
    const at = runs.findIndex((r) => r.startsWith(needle));
    if (at < 0) continue;
    const parts = [];
    for (let i = at + 1; i < runs.length; i++) {
      const run = runs[i];
      if (run === ':' || run === '') continue;        // a colon split off its heading
      if (isHeading(run)) break;
      // The tail of the card repeats the slide number and the title; a run of
      // digits alone marks where the content has ended.
      if (/^\d{1,4}$/.test(run)) break;
      parts.push(run);
      if (field === 'description' || field === 'contribution') break;  // single paragraph
    }
    if (parts.length) record[field] = parts.join(' ; ');
  }
  rows.push(record);
}

rows.sort((a, b) => (a.code || '').localeCompare(b.code || ''));
writeFileSync('cards.json', JSON.stringify(rows, null, 1));

const cols = ['code', 'contribution', 'target_audience', 'problem_statement',
              'expected_impact', 'outputs', 'slide'];
const esc = (v) => {
  const s = v === undefined || v === null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
writeFileSync('sheets/25_initiative_cards.csv',
  '\ufeff' + [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n') + '\n');

console.log('cards:', rows.length, 'codes:', rows.map((r) => r.code).join(' '));
for (const field of ['contribution', 'target_audience', 'problem_statement', 'expected_impact', 'outputs']) {
  console.log(field.padEnd(20), rows.filter((r) => r[field]).length + '/' + rows.length);
}
console.log('\n01.01 contribution:', (rows.find((r) => r.code === '01.01') || {}).contribution?.slice(0, 120));
console.log('01.01 audience:', (rows.find((r) => r.code === '01.01') || {}).target_audience?.slice(0, 160));
