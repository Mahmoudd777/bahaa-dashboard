// The milestone table and the description table list the same items in the
// same order, but reword some titles ("وضع تصور للتجارب" against "تصميم
// التجارب"), so matching on names alone loses a third of them.
//
// Where an initiative's two tables hold the same number of rows, position is
// a safe join. Where they do not, position could attach a description to the
// wrong milestone, so those fall back to exact name matches and the rest are
// left blank and reported. A missing description is a gap; a wrong one is a
// lie.
import {readFileSync, writeFileSync} from 'node:fs';

const read = (file) => {
  const lines = readFileSync(file, 'utf8').replace(/^\ufeff/, '').trim().split(/\r?\n/);
  const cols = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, cols.length)
      .map((c) => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
  });
};

const key = (t) => (t || '').replace(/[^\w\u0600-\u06FF]/g, '');
const dedupe = (rows) => {
  const seen = new Set();
  return rows.filter((r) => {
    const k = key(r.name);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const milestones = read('sheets/37_milestones_deck06.csv');
const descriptions = read('sheets/39_milestone_descriptions.csv');

const byCode = (rows) => rows.reduce((a, r) => ((a[r.code] = a[r.code] || []).push(r), a), {});
const ms = byCode(milestones);
const ds = byCode(descriptions);

const out = [];
const report = [];
for (const code of Object.keys(ms).sort()) {
  const mine = dedupe(ms[code]);
  const theirs = dedupe(ds[code] || []);
  if (mine.length === theirs.length && theirs.length) {
    mine.forEach((m, i) => out.push({
      code, name: m.name, description: theirs[i].description, join: 'position',
    }));
    report.push(`${code} ${mine.length} milestones, joined by position`);
  } else {
    const byName = new Map(theirs.map((d) => [key(d.name), d.description]));
    let hit = 0;
    for (const m of mine) {
      const text = byName.get(key(m.name));
      if (text) { out.push({code, name: m.name, description: text, join: 'name'}); hit++; }
    }
    report.push(`${code} ${mine.length} milestones vs ${theirs.length} descriptions — by name only, ${hit} matched`);
  }
}

const esc = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
writeFileSync('sheets/40_milestone_descriptions_joined.csv',
  '\ufeff' + ['code,name,description,join'].concat(
    out.map((r) => ['code', 'name', 'description', 'join'].map((c) => esc(r[c])).join(','))).join('\n') + '\n');

console.log('pairs:', out.length, 'of', dedupe(milestones).length, 'milestones');
report.forEach((line) => console.log(' ', line));
