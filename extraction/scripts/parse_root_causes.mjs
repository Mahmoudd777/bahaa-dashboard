// Eight diagnostic slides set each challenge against the root cause behind
// it. The challenge wording on those slides is identical to the appendix
// table the records were loaded from, so the pairing is made by finding each
// known challenge in the run list and taking what follows as its cause.
//
// A challenge can be split across runs, so the search joins runs until the
// known name is matched in full.
import {readFileSync, writeFileSync} from 'node:fs';

const slides = JSON.parse(readFileSync('all_slides.json', 'utf8'));
const SLIDES = [61, 63, 65, 67, 70, 72, 74, 76];

const rows = readFileSync('challenges_now.csv', 'utf8').replace(/^\ufeff/, '')
  .trim().split(/\r?\n/).slice(1)
  .map((line) => {
    const m = line.match(/^(\d+),([^,]*),(.*)$/);
    return {id: +m[1], dimension: m[2], name: m[3].replace(/^"|"$/g, '').replace(/""/g, '"')};
  });

const key = (t) => (t || '').replace(/[^\w\u0600-\u06FF]/g, '');
const known = rows.map((r) => ({...r, k: key(r.name)}));

const found = new Map();
for (const number of SLIDES) {
  const runs = (slides[String(number)] || []).map((r) => r.trim()).filter(Boolean);
  const start = runs.findIndex((r) => r === 'الأسباب الجذرية');
  if (start < 0) continue;
  const tail = runs.slice(start + 1);

  // Walk the tail; at each position try to match a known challenge, joining
  // up to three runs, then take the following runs as its cause until the
  // next challenge starts.
  let i = 0;
  while (i < tail.length) {
    let matched = null, span = 0;
    for (let n = 1; n <= 3 && i + n <= tail.length; n++) {
      const joined = key(tail.slice(i, i + n).join(' '));
      const hit = known.find((c) => c.k === joined);
      if (hit) { matched = hit; span = n; break; }
    }
    if (!matched) { i++; continue; }
    // Collect the cause: runs after the challenge, until another challenge.
    const cause = [];
    let j = i + span;
    while (j < tail.length) {
      let isNext = false;
      for (let n = 1; n <= 3 && j + n <= tail.length; n++) {
        if (known.some((c) => c.k === key(tail.slice(j, j + n).join(' ')))) { isNext = true; break; }
      }
      if (isNext) break;
      cause.push(tail[j]);
      j++;
    }
    const text = cause.join(' ').replace(/\s+/g, ' ').trim();
    if (text.length > 25 && !found.has(matched.id)) {
      found.set(matched.id, {id: matched.id, name: matched.name, slide: number, root_cause: text});
    }
    i = j;
  }
}

const out = [...found.values()];
const esc = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
writeFileSync('sheets/47_root_causes.csv',
  '\ufeff' + ['id,slide,name,root_cause'].concat(
    out.map((r) => ['id', 'slide', 'name', 'root_cause'].map((c) => esc(r[c])).join(','))).join('\n') + '\n');

console.log('root causes matched:', out.length, 'of', known.length);
const missing = known.filter((c) => !found.has(c.id));
console.log('without one:', missing.length);
missing.slice(0, 8).forEach((c) => console.log('  -', c.dimension, '|', c.name.slice(0, 58)));
