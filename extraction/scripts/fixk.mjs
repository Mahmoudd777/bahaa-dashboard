import {readFileSync, writeFileSync} from 'node:fs';
const p = 'parse_kcodes.mjs';
let s = readFileSync(p, 'utf8');
const old = `  let current = null;
  for (const raw of runs) {
    const run = squeeze(raw);`;
const fresh = `  let current = null;
  for (let i = 0; i < runs.length; i++) {
    let run = squeeze(runs[i]);
    // One indicator's name is split where the deck breaks before "NPS".
    if (/[-–]$/.test(run) && kpiByName.has(squeeze(run + ' ' + (runs[i + 1] || '')))) {
      run = squeeze(run + ' ' + runs[i + 1]);
    }`;
if (!s.includes(old)) { console.log('anchor missing'); process.exit(1); }
s = s.replace(old, fresh);
writeFileSync(p, s);
console.log('ok');
