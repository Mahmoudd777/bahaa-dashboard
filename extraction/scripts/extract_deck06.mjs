// Re-extract every milestone, risk and milestone description straight from the
// initiative cards, attributing each table to the initiative whose slide it
// sits on. The earlier load drifted: some rows ended up under the wrong
// initiative, which a per-initiative count exposes and a grand total hides.
import {readFileSync, writeFileSync} from 'node:fs';

const slides = JSON.parse(readFileSync('deck06.json', 'utf8'));
const lines = readFileSync('deck06_tables.txt', 'utf8').split(/\r?\n/);

const codeOf = new Map();
for (const [key, runs] of Object.entries(slides)) {
  let code = runs.find((r) => /^0[1-9]\.[0-9]{2}$/.test(r));
  if (!code) {
    const at = runs.findIndex((r, i) => /^0[1-9]\.[0-9]$/.test(r) && /^[0-9]$/.test(runs[i + 1] || ''));
    if (at >= 0) code = runs[at] + runs[at + 1];
  }
  if (code) codeOf.set(+key, code);
}

let current = null;
const tables = [];
for (const line of lines) {
  const m = line.match(/^### slide(\d+) table(\d+)/);
  if (m) { current = {slide: +m[1], rows: []}; tables.push(current); continue; }
  if (current && line.includes('|||')) current.rows.push(line.split('|||').map((c) => c.trim()));
}

const money = (text) => {
  const t = (text || '').replace(/,/g, '').trim();
  if (!t || /^[-–]+$/.test(t)) return 0;
  const m = t.match(/(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return /مليون/.test(t) ? n * 1_000_000 : n;
};

const milestones = [], risks = [], descriptions = [];
for (const table of tables) {
  const code = codeOf.get(table.slide);
  if (!code) continue;
  const width = table.rows[0].length;

  if (width >= 15) {
    for (const r of table.rows) {
      if (!r[0] || !/Q\s*\d|السنة/.test(r[1] || '')) continue;
      milestones.push({
        code, slide: table.slide, name: r[0],
        start_label: r[1], end_label: r[2],
        capital: money(r[3]), operational: money(r[4]),
        // A row naming a "مشروع" heads the group of milestones beneath it.
        is_project: /^مشروع\b/.test(r[0]) ? 'yes' : '',
      });
    }
  } else if (width === 5) {
    for (const r of table.rows) {
      if (!r[0] || !/^\d+$/.test((r[1] || '').trim())) continue;
      risks.push({
        code, slide: table.slide, name: r[4], mitigation: r[0],
        score: +r[1], impact: +r[2], likelihood: +r[3],
      });
    }
  } else if (width === 2) {
    for (const r of table.rows) {
      if (!r[0] || !r[1]) continue;
      descriptions.push({code, slide: table.slide, name: r[1], description: r[0]});
    }
  }
}

const esc = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
const write = (file, cols, rows) => writeFileSync(file,
  '\ufeff' + [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c] ?? '')).join(','))).join('\n') + '\n');

write('sheets/37_milestones_deck06.csv',
  ['code', 'name', 'start_label', 'end_label', 'capital', 'operational', 'is_project', 'slide'], milestones);
write('sheets/38_risks_deck06.csv',
  ['code', 'name', 'mitigation', 'score', 'impact', 'likelihood', 'slide'], risks);
write('sheets/39_milestone_descriptions.csv',
  ['code', 'name', 'description', 'slide'], descriptions);

console.log('milestones', milestones.length, '| risks', risks.length, '| descriptions', descriptions.length);
const badScore = risks.filter((r) => r.score !== r.impact * r.likelihood);
console.log('risks whose score is not impact x likelihood:', badScore.length);
const byCode = (rows) => rows.reduce((a, r) => (a[r.code] = (a[r.code] || 0) + 1, a), {});
console.log('parents (project rows):', milestones.filter((m) => m.is_project).length);
console.log('milestone budget total:',
  (milestones.filter((m) => !m.is_project).reduce((a, m) => a + m.capital + m.operational, 0) / 1e6).toFixed(2), 'million');
