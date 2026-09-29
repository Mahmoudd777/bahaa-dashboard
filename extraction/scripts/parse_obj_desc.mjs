// The strategic house deck devotes two pages to each pillar and, for every
// objective under it, gives a written description ("وصف الهدف") and the
// indicators that measure it. Neither the descriptions nor the objective's
// pillar were ever read into the records.
//
// The page is a diagram: an objective's name is followed by its description,
// which may itself be split where a phrase is emphasised. So the runs after a
// known objective name are collected until the next objective name, a known
// indicator name, or a column heading.
import {readFileSync, writeFileSync} from 'node:fs';
import {parse} from 'node:path';

const slides = JSON.parse(readFileSync('deck02.json', 'utf8'));

const csv = (path) => {
  const lines = readFileSync(path, 'utf8').replace(/^\ufeff/, '').trim().split(/\r?\n/);
  const cols = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, cols.length)
      .map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
  });
};

const objectives = csv('sheets/02_objectives.csv').filter((o) => o.level === 'فرعي');
const kpiNames = new Set(csv('sheets/04_kpis.csv').map((k) => k.name.trim()));
const HEADINGS = ['وصف الهدف', 'المؤشرات الاستراتيجية', 'الهدف', 'رمز الهدف',
                  'رمز المؤشر المرتبط', 'المصدر: تحليلات', 'الرؤية والتوجهات الاستراتيجية'];

// Two pages per pillar, in the order the deck presents them.
const PILLAR_OF_SLIDE = {
  3: 'السياحة', 4: 'السياحة',
  5: 'الزراعة والصناعات المرتبطة', 6: 'الزراعة والصناعات المرتبطة',
  7: 'هوية الباحة', 8: 'هوية الباحة',
  9: 'المجتمع المحلي', 10: 'المجتمع المحلي',
  11: 'المنظومة التمكينية', 12: 'المنظومة التمكينية',
};

const squeeze = (t) => (t || '').split(/\s+/).join(' ').trim();
const names = objectives.map((o) => squeeze(o.name));

const out = new Map();
for (const [key, runs] of Object.entries(slides)) {
  const pillar = PILLAR_OF_SLIDE[+key];
  if (!pillar) continue;
  for (let i = 0; i < runs.length; i++) {
    const here = squeeze(runs[i]);
    const objective = objectives.find((o) => squeeze(o.name) === here);
    if (!objective) continue;
    const parts = [];
    for (let j = i + 1; j < runs.length; j++) {
      const run = squeeze(runs[j]);
      if (!run) continue;
      if (names.includes(run)) break;
      if (kpiNames.has(run)) break;
      if (HEADINGS.some((h) => run === h || run.startsWith(h))) break;
      if (run.length < 12) break;
      parts.push(run);
      if (parts.join(' ').length > 700) break;
    }
    const description = parts.join(' ').replace(/\s*،\s*/g, '، ').trim();
    const existing = out.get(objective.code);
    if (!existing || description.length > existing.description.length) {
      out.set(objective.code, {code: objective.code, pillar, description, slide: +key});
    }
  }
}

const rows = [...out.values()].sort((a, b) => a.code.localeCompare(b.code));
const esc = (v) => (/[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v);
writeFileSync('sheets/32_objective_detail.csv',
  '\ufeff' + ['code,pillar,description,slide'].concat(
    rows.map((r) => [r.code, r.pillar, r.description, r.slide].map(esc).join(','))).join('\n') + '\n');

console.log('objectives matched:', rows.length, 'of', objectives.length);
const missing = objectives.filter((o) => !out.has(o.code)).map((o) => o.code);
console.log('not found on any page:', missing.join(',') || 'none');
for (const r of rows) {
  console.log(' ', r.code, '|', r.pillar.padEnd(26), '|', r.description.slice(0, 70));
}
