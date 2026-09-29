// Each card slide carries its milestone table and its description table side
// by side, listing the same rows in the same order. Joining within one slide
// is tighter than joining across an initiative: it cannot drift between
// pages, and it keeps two milestones that merely share a step name apart.
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

const perSlide = new Map();
for (const table of tables) {
  const entry = perSlide.get(table.slide) || {};
  const width = table.rows[0].length;
  if (width >= 15) entry.milestones = table.rows.filter((r) => r[0] && /Q\s*\d|السنة/.test(r[1] || ''));
  else if (width === 2) entry.descriptions = table.rows.filter((r) => r[0] && r[1]);
  perSlide.set(table.slide, entry);
}

const out = [];
const report = [];
for (const [slide, entry] of [...perSlide].sort((a, b) => a[0] - b[0])) {
  const code = codeOf.get(slide);
  const ms = entry.milestones || [];
  const ds = entry.descriptions || [];
  if (!ms.length) continue;
  if (ms.length === ds.length) {
    ms.forEach((m, i) => out.push({slide, code, index: i, name: m[0], description: ds[i][0]}));
    report.push(`slide ${slide} (${code}) ${ms.length} rows, joined`);
  } else {
    report.push(`slide ${slide} (${code}) ${ms.length} milestones vs ${ds.length} descriptions — SKIPPED`);
  }
}

const esc = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
writeFileSync('sheets/40_milestone_descriptions_joined.csv',
  '\ufeff' + ['slide,code,index,name,description'].concat(
    out.map((r) => ['slide', 'code', 'index', 'name', 'description'].map((c) => esc(r[c])).join(','))).join('\n') + '\n');

console.log('joined rows:', out.length);
report.filter((l) => l.includes('SKIPPED')).forEach((l) => console.log(' ', l));
console.log('slides joined:', report.filter((l) => !l.includes('SKIPPED')).length,
  'of', report.length);
