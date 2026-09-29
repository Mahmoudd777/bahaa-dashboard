import {readFileSync, writeFileSync} from 'node:fs';
const p = 'parse_strat_risk2.mjs';
let s = readFileSync(p, 'utf8');

s = s.replace("  const from = k === 0 ? 0 : lastOf.get(order[k - 1]);",
  "  // +1 so the previous pillar's last risk text does not bleed in.\n  const from = k === 0 ? 0 : lastOf.get(order[k - 1]) + 1;");

s = s.replace(`  const picked = runs.slice(from, to)
    .map((r) => r.trim())
    .filter((r) => r.length > 14 && !LABELS.includes(r) && !/^\d/.test(r));
  steps.set(pillar, picked);`,
`  const riskTexts = new Set(risks.map((r) => r.text));
  const picked = runs.slice(from, to)
    .map((r) => r.trim())
    .filter((r) => r.length > 14 && !LABELS.includes(r) && !/^\d/.test(r) &&
                   !riskTexts.has(r) && !BOILERPLATE.some((b) => r.includes(b)));
  // Each step is written as a head and the clause that finishes it.
  const joined = [];
  for (let i = 0; i < picked.length; i += 2) {
    joined.push(picked[i + 1] ? picked[i] + ' ' + picked[i + 1] : picked[i]);
  }
  steps.set(pillar, joined);`);

s = s.replace("const LABELS = ", [
  "// The slide's own title and the navigation strip sit in the same run list.",
  "const BOILERPLATE = ['المخاطر الاستراتيجية المحتملة', 'إجراءات التخفيف',",
  "                     'الرؤية والتوجهات', 'الخيارات الإستراتيجية', 'الرؤية المناطقية',",
  "                     'مواءمة التوجهات', 'البيت الاستراتيجي', 'الأثر الكلي',",
  "                     'مؤشرات الأداء الاستراتيجية', 'المصدر:'];",
  "const LABELS = ",
].join('\n'));

writeFileSync(p, s);
console.log('ok');
