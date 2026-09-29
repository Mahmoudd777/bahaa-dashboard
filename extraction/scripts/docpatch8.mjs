import {readFileSync, writeFileSync} from 'node:fs';
const p = 'D:/APPS/project/custom_addons/CLIENT_DATA.md';
let s = readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(nl);

const anchor = '- **No spend against budget.**';
if (!s.includes(anchor)) { console.log('anchor missing'); process.exit(1); }
s = s.replace(anchor, L([
  '- **The government register gives a status, not a percentage.** Each of its',
  '  145 projects is marked منجز or جاري and nothing more. An earlier import',
  '  turned منجز into 100% — which is what completed means — and جاري into',
  '  **50%**, which nobody reported. That invented figure sat on 68 projects and',
  '  pulled every aggregate toward the middle; it has been cleared, and the',
  '  status is now kept in words instead. Fourteen projects do have a real',
  '  percentage: ten named on a map slide, between 4.23% and 92.5%, and four',
  '  cooperative projects.',
  anchor]));

s = s.replace('The rest of the screenshots are the current-state assessment,', L([
  'A third slide mattered for a different reason: it names ten government',
  'infrastructure projects with their actual completion, and nine of the ten',
  'were already loaded carrying a flat 50%. That is what exposed the invented',
  'percentage described above.',
  '',
  'The rest of the screenshots are the current-state assessment,']));

s = s.replace('| Named investment projects | 20 (10 supported, 10 third-sector) | خرائط المشاريع الاستثمارية (صور) |',
  L(['| Named investment projects | 20 (10 supported, 10 third-sector) | خرائط المشاريع الاستثمارية (صور) |',
     '| Infrastructure project progress | 10 named, real percentages | خريطة أبرز مشاريع البنية التحتية (صورة) |',
     '| Strategy record, vision and mission | 1 | البيت الاستراتيجي + بطاقة أداء (صور) |',
     '| Pillar focus areas | 7 | البيت الاستراتيجي (صورة) |']));

writeFileSync(p, s);
console.log('patched');
