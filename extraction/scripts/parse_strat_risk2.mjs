// Slide 146 pairs the strategic risks with the steps that answer them, but it
// is a diagram: pillar labels sometimes follow their own steps and the shapes
// are nested in groups, so neither reading order nor coordinates give the
// grouping cleanly.
//
// The risk numbers do. They run 1 to 12, and the prose between one pillar's
// last risk and the next pillar's first risk is the next pillar's block of
// steps. Which pillar owns each number is stated outright in the table on the
// following slide.
//
// The deck does not draw a line from a step to a risk, so the steps are kept
// as the pillar's, not split between its risks.
import {readFileSync, writeFileSync} from 'node:fs';
const runs = JSON.parse(readFileSync('all_slides.json', 'utf8'))['146'];

const PILLAR_OF = {
  1: 'السياحة', 2: 'السياحة', 3: 'السياحة',
  4: 'الزراعة والصناعات المرتبطة', 5: 'الزراعة والصناعات المرتبطة', 6: 'الزراعة والصناعات المرتبطة',
  7: 'هوية الباحة', 8: 'هوية الباحة',
  9: 'المجتمع المحلي', 10: 'المجتمع المحلي',
  11: 'المنظومة التمكينية', 12: 'المنظومة التمكينية',
};
// The slide's own title and the navigation strip share the run list.
const NOISE = ['المخاطر الاستراتيجية', 'إجراءات التخفيف', 'الرؤية والتوجهات',
               'الخيارات الإستراتيجية', 'الرؤية المناطقية', 'مواءمة التوجهات',
               'البيت الاستراتيجي', 'الأثر الكلي', 'مؤشرات الأداء الاستراتيجية',
               'المصدر', 'الركيزة الاستراتيجية', 'أبرز المخاطر', 'أبرز خطوات',
               'التخفيف', 'الممكنات'];
// A pillar's own name sits inside its block and must not be read as a step.
const PILLAR_NAMES = [...new Set(Object.values(PILLAR_OF))];

const seen = new Map();
runs.forEach((raw, i) => {
  const run = raw.trim();
  if (!/^\d{1,2}$/.test(run)) return;
  const number = +run;
  if (!PILLAR_OF[number] || seen.has(number)) return;
  const text = (runs[i + 1] || '').trim();
  if (text.length < 20) return;
  seen.set(number, {number, text, at: i});
});
const risks = [...seen.values()].sort((a, b) => a.number - b.number);
const riskTexts = new Set(risks.map((r) => r.text));

const order = [];
const firstAt = new Map(), lastAt = new Map();
for (const risk of risks) {
  const pillar = PILLAR_OF[risk.number];
  if (!firstAt.has(pillar)) { firstAt.set(pillar, risk.at); order.push(pillar); }
  lastAt.set(pillar, risk.at + 1);
}

const steps = new Map();
order.forEach((pillar, k) => {
  const from = k === 0 ? 0 : lastAt.get(order[k - 1]) + 1;
  const picked = runs.slice(from, firstAt.get(pillar))
    .map((r) => r.trim())
    .filter((r) => r.length > 14 && !/^\d/.test(r) && !riskTexts.has(r) &&
                   !NOISE.some((n) => r.includes(n)) &&
                   !PILLAR_NAMES.includes(r));
  // Each step is written as a head and the clause that finishes it.
  const joined = [];
  for (let i = 0; i < picked.length; i += 2) {
    joined.push(picked[i + 1] ? picked[i] + ' ' + picked[i + 1] : picked[i]);
  }
  steps.set(pillar, joined);
});

const esc = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
const rows = risks.map((r) => ({
  number: r.number,
  pillar: PILLAR_OF[r.number],
  risk: r.text,
  pillar_mitigation: (steps.get(PILLAR_OF[r.number]) || []).join(' ؛ '),
}));
writeFileSync('sheets/41_strategic_risk_mitigation.csv',
  '\ufeff' + ['number,pillar,risk,pillar_mitigation'].concat(
    rows.map((r) => ['number', 'pillar', 'risk', 'pillar_mitigation'].map((c) => esc(r[c])).join(','))).join('\n') + '\n');

console.log('risks:', risks.length, '(expected 12), numbers:', risks.map((r) => r.number).join(','));
for (const pillar of order) {
  const list = steps.get(pillar) || [];
  console.log('\n##', pillar, '—', list.length, 'steps for',
    risks.filter((r) => PILLAR_OF[r.number] === pillar).length, 'risks');
  list.forEach((s) => console.log('   -', s.slice(0, 96)));
}
