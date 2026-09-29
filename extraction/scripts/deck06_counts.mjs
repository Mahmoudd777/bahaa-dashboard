// Count what the initiative cards actually contain, per initiative, so the
// loaded records can be checked against the source table by table rather than
// against one grand total that can hide offsetting errors.
import {readFileSync, writeFileSync} from 'node:fs';

const slides = JSON.parse(readFileSync('deck06.json', 'utf8'));
const lines = readFileSync('deck06_tables.txt', 'utf8').split(/\r?\n/);

// Which initiative each slide belongs to.
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

// The milestone tables head their first column three different ways, and a
// trailing totals row carries a budget with no name.
// Rather than trying to name every header variant — the milestone tables
// head their first column three different ways and carry a second header
// row of quarters plus an unnamed totals row — a row counts as data when it
// has the shape of data: a milestone needs a name and a period, a risk needs
// a name and a numeric score.
const isMilestone = (r) => r[0] && /Q\s*\d|السنة/.test(r[1] || '');
const isRisk = (r) => r[0] && /^\d+$/.test((r[1] || '').trim());
const seenRisk = new Set();
const per = new Map();
const bump = (code, key, n) => {
  if (!per.has(code)) per.set(code, {milestones: 0, risks: 0, descriptions: 0});
  per.get(code)[key] += n;
};

for (const table of tables) {
  const code = codeOf.get(table.slide);
  if (!code) { console.log('! no initiative for slide', table.slide); continue; }
  const width = table.rows[0].length;
  if (width >= 15) {
    bump(code, 'milestones', table.rows.filter(isMilestone).length);
  } else if (width === 5) {
        // A card that runs over two pages reprints its whole risk panel, so
    // the same risk arrives twice. Count each risk once per initiative.
    for (const r of table.rows.filter(isRisk)) {
      const k = code + '|' + (r[4] || '').replace(/[^w؀-ۿ]/g, '');
      if (seenRisk.has(k)) continue;
      seenRisk.add(k);
      bump(code, 'risks', 1);
    }
  } else if (width === 2) {
    bump(code, 'descriptions', table.rows.filter((r) => r[0] && r[1]).length);
  }
}

const rows = [...per.entries()].sort((a, b) => a[0].localeCompare(b[0]));
writeFileSync('sheets/36_deck06_counts.csv',
  '\ufeff' + ['code,milestones,risks,descriptions'].concat(
    rows.map(([code, c]) => `${code},${c.milestones},${c.risks},${c.descriptions}`)).join('\n') + '\n');

let totals = {milestones: 0, risks: 0, descriptions: 0};
for (const [code, c] of rows) {
  for (const k of Object.keys(totals)) totals[k] += c[k];
  console.log(' ', code, 'milestones', String(c.milestones).padStart(3),
    ' risks', String(c.risks).padStart(3), ' descriptions', String(c.descriptions).padStart(3));
}
console.log('TOTAL milestones', totals.milestones, 'risks', totals.risks, 'descriptions', totals.descriptions);
