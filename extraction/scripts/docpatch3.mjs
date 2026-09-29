import {readFileSync, writeFileSync} from 'node:fs';
const p = 'D:/APPS/project/custom_addons/CLIENT_DATA.md';
let s = readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(nl);

const old = L([
  '- **Milestone budgets do not add up to initiative budgets** for 01.02, 01.04',
  '  and 02.01 — the tables cover part of the work only. Five other initiatives',
  '  reconcile exactly, which is what shows the extraction is sound.']);
const fresh = L([
  '- **Milestone budgets cover only part of six initiatives.** 01.01, 02.05 and',
  '  03.01 reconcile to the riyal. The other six funded initiatives — 01.02,',
  '  01.04, 02.01, 02.02, 02.03 and 02.04 — list milestones worth less than the',
  '  initiative holds, because their tables name some of the work and not all of',
  '  it. The gap is the deck\u2019s, not the extraction\u2019s: two independent pages',
  '  state each initiative total and they agree with each other.',
  '- **Every zero-budget initiative has milestones worth zero**, all ten of them,',
  '  which is a check nobody designed: the flag comes from one page and the',
  '  milestone figures from another, and they agree without exception.']);
if (!s.includes(old)) { console.log('milestone bullet not found'); process.exit(1); }
s = s.replace(old, fresh);
writeFileSync(p, s);
console.log('patched');
