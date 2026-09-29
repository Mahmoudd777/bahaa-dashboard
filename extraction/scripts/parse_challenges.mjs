// Appendix 7 maps each challenge to how it is being addressed, which planned
// initiatives carry that work, and which existing government projects touch
// it. It runs over nine slides as one table.
//
// The dimension column is merged down its group, so it arrives filled on the
// first row only and is carried forward. Columns arrive right to left.
import {readFileSync, writeFileSync} from 'node:fs';

const text = readFileSync('challenges_raw.txt', 'utf8');
const initiativeNames = JSON.parse(readFileSync('cards.json', 'utf8'));

const rows = [];
let dimension = '';
for (const line of text.split(/\r?\n/)) {
  if (!line.includes('|||')) continue;
  const cells = line.split('|||').map((c) => c.trim());
  if (cells.length < 6) continue;
  if (cells[4] === 'التحدي') continue;                    // a repeated header
  const [impact, projects, initiatives, mitigation, challenge, dim] =
    [cells[0], cells[1], cells[2], cells[3], cells[4], cells[5]];
  if (dim) dimension = dim;
  if (!challenge) continue;
  rows.push({
    dimension,
    challenge,
    mitigation,
    initiatives_text: initiatives === '-' ? '' : initiatives,
    government_projects: projects === '-' ? '' : projects,
    expected_impact: impact.replace(/^•\s*/, '').split(/\s*•\s*/).filter(Boolean).join(' ; '),
  });
}

writeFileSync('challenges.json', JSON.stringify(rows, null, 1));

const cols = ['dimension', 'challenge', 'mitigation', 'initiatives_text',
              'government_projects', 'expected_impact'];
const esc = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
writeFileSync('sheets/26_challenges.csv',
  '\ufeff' + [cols.join(',')].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(','))).join('\n') + '\n');

const dims = {};
for (const r of rows) dims[r.dimension || '(none)'] = (dims[r.dimension || '(none)'] || 0) + 1;
console.log('challenges:', rows.length);
for (const [d, n] of Object.entries(dims)) console.log('  ', String(n).padStart(3), d);
console.log('with a mitigation:', rows.filter((r) => r.mitigation).length,
  '| naming an initiative:', rows.filter((r) => r.initiatives_text).length,
  '| naming a project:', rows.filter((r) => r.government_projects).length);
