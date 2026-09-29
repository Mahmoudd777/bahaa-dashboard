// The description table sits on the card page and the milestone table on a
// later page of the same card, both listing the same rows in the same order.
// So the join is positional within an initiative — but only where the two
// tables hold the same number of rows. Where they do not, position could
// attach a description to the wrong milestone, so those fall back to exact
// name matches: a missing description is a gap, a wrong one is a lie.
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
tables.sort((a, b) => a.slide - b.slide);

const ms = {}, ds = {};
for (const table of tables) {
  const code = codeOf.get(table.slide);
  if (!code) continue;
  const width = table.rows[0].length;
  if (width >= 15) {
    (ms[code] = ms[code] || []).push(
      ...table.rows.filter((r) => r[0] && /Q\s*\d|السنة/.test(r[1] || ''))
        .map((r) => ({name: r[0], slide: table.slide})));
  } else if (width === 2) {
    (ds[code] = ds[code] || []).push(
      ...table.rows.filter((r) => r[0] && r[1])
        .map((r) => ({name: r[1], description: r[0], slide: table.slide})));
  }
}

const key = (t) => (t || '').replace(/[^\w\u0600-\u06FF]/g, '');
const out = [], report = [];
for (const code of Object.keys(ms).sort()) {
  const mine = ms[code], theirs = ds[code] || [];
  if (mine.length === theirs.length && theirs.length) {
    mine.forEach((m, i) => out.push({
      code, index: i, name: m.name, description: theirs[i].description, join: 'position',
    }));
    report.push(`${code}  ${mine.length} rows — position`);
  } else {
    const byName = new Map(theirs.map((d) => [key(d.name), d.description]));
    let hit = 0;
    mine.forEach((m, i) => {
      const text = byName.get(key(m.name));
      if (text) { out.push({code, index: i, name: m.name, description: text, join: 'name'}); hit++; }
    });
    report.push(`${code}  ${mine.length} milestones vs ${theirs.length} descriptions — name only, ${hit} matched`);
  }
}

const esc = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
writeFileSync('sheets/40_milestone_descriptions_joined.csv',
  '\ufeff' + ['code,index,name,description,join'].concat(
    out.map((r) => ['code', 'index', 'name', 'description', 'join'].map((c) => esc(r[c])).join(','))).join('\n') + '\n');

console.log('pairs:', out.length, 'of', Object.values(ms).reduce((a, v) => a + v.length, 0), 'milestones');
report.forEach((l) => console.log(' ', l));
