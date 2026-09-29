// The strategy refers to a pillar-level indicator by a code of the form
// K<objective>.<n> — the objective's position among the eleven, then the
// indicator's position under it. The pages list each objective followed by its
// indicators in that order, so the codes can be rebuilt and then checked: the
// set produced must be exactly the fifteen codes printed on the pages.
import {readFileSync, writeFileSync} from 'node:fs';
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

const squeeze = (t) => (t || '').split(/\s+/).join(' ').trim();
const objectives = csv('sheets/02_objectives.csv').filter((o) => o.level === 'فرعي');
const kpis = csv('sheets/04_kpis.csv');
const kpiByName = new Map(kpis.map((k) => [squeeze(k.name), k]));
const objectiveNames = objectives.map((o) => squeeze(o.name));

// Walk the first page of each pillar in order, collecting each objective's
// indicators in the order they appear after it.
const order = new Map();
for (const key of ['3', '5', '7', '9', '11']) {
  const runs = slides[key] || [];
  let current = null;
  for (let i = 0; i < runs.length; i++) {
    let run = squeeze(runs[i]);
    // One indicator's name is split where the deck breaks before "NPS".
    if (/[-–]$/.test(run) && kpiByName.has(squeeze(run + ' ' + (runs[i + 1] || '')))) {
      run = squeeze(run + ' ' + runs[i + 1]);
    }
    if (objectiveNames.includes(run)) {
      current = run;
      if (!order.has(run)) order.set(run, []);
      continue;
    }
    if (current && kpiByName.has(run) && !order.get(current).includes(run)) {
      order.get(current).push(run);
    }
  }
}

const rows = [];
objectives.forEach((objective, index) => {
  const list = order.get(squeeze(objective.name)) || [];
  list.forEach((kpiName, position) => {
    rows.push({
      code: `K${index + 1}.${position + 1}`,
      objective: objective.code,
      kpi: kpiName,
      kpi_code: kpiByName.get(kpiName).code,
    });
  });
});

const printed = new Set();
for (const runs of Object.values(slides)) {
  for (const run of runs) if (/^K\d+\.\d+$/.test(run.trim())) printed.add(run.trim());
}
const built = new Set(rows.map((r) => r.code));
const missing = [...printed].filter((c) => !built.has(c));
const extra = [...built].filter((c) => !printed.has(c));

const esc = (v) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
writeFileSync('sheets/35_kpi_codes.csv',
  '\ufeff' + ['kpi_number,objective,kpi_code,kpi'].concat(
    rows.map((r) => [r.code, r.objective, r.kpi_code, r.kpi].map(esc).join(','))).join('\n') + '\n');

console.log('codes printed on the pages:', printed.size, '| rebuilt:', built.size);
console.log('printed but not rebuilt:', missing.join(',') || 'none');
console.log('rebuilt but not printed:', extra.join(',') || 'none');
for (const r of rows) console.log(' ', r.code.padEnd(7), r.objective.padEnd(8), r.kpi_code.padEnd(8), r.kpi.slice(0, 54));
