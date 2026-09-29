import {readFileSync, writeFileSync} from 'node:fs';
const p = 'D:/APPS/project/custom_addons/CLIENT_DATA.md';
let s = readFileSync(p, 'utf8');
const nl = s.includes('\r\n') ? '\r\n' : '\n';
const L = (a) => a.join(nl);

s = s.replace('| Milestones | 165 (46 parents, 119 leaves) | جداول مشاريع ومعالم المبادرة |',
  L(['| Milestones | 165 (46 parents, 119 leaves) | جداول مشاريع ومعالم المبادرة |',
     '| Milestone descriptions | 144 of 165 | جداول وصف المبادرة |']));

s = s.replace('## The indicator cards', L([
  '## Counting the initiative cards table by table',
  '',
  'The 19 initiative cards hold three tables each: the milestones, the',
  'operational risks, and a second table describing every milestone in a',
  'sentence or two. Counting them per initiative rather than in total is what',
  'exposed a fault the totals had been hiding.',
  '',
  'The totals were right — 165 milestones and 43 risks, matching the cards',
  'exactly. But nine milestones and five risks sat under the wrong initiative:',
  "02.04's rows had been filed under 02.03, and 02.03's under 02.02. Reading",
  'each table against the slide it appears on fixed the attribution, and all 19',
  'initiatives now agree with their cards row for row. Nothing was deleted; the',
  'records were moved.',
  '',
  "Two pairs of milestones in 02.03 share a name. They are not duplicates: they",
  'are steps of two different projects, and each project\u2019s budget equals the',
  'sum of the steps beneath it — 600,000 and 400,000 respectively — which is',
  'what settles it.',
  '',
  'The descriptions are a separate table that rewords some titles, so they are',
  'matched by position within the initiative. That is only safe if the stored',
  'order matches the card, so every write was guarded by the name at that',
  'position; across the fifteen initiatives joined this way, not one position',
  'disagreed. The remaining four cards list a different number of descriptions',
  'than milestones — a step named in one table and not the other — so those are',
  'matched by name alone and 21 milestones are left without a description',
  'rather than given one that might belong to their neighbour.',
  '',
  '## The indicator cards']));

s = s.replace(
  L(['- **No owners as people.** Ownership is written as an entity ("المكتب',
     '  الاستراتيجي لتطوير منطقة الباحة"), never a named person, so no `res.partner`',
     '  links could be made.']),
  L(['- **No owners as people.** Ownership is written as an entity ("المكتب',
     '  الاستراتيجي لتطوير منطقة الباحة"), never a named person, so no `res.partner`',
     '  links could be made.',
     '- **The decks contradict themselves once.** The risk "عدم توفر الخدمات',
     '  اللوجستية" under 02.04 is printed on two pages of the same card, scored 3×2',
     '  on one and 3×3 on the other. The first is kept. Every other one of the 43',
     '  risks scores exactly probability × impact, on both printings.']));

writeFileSync(p, s);
console.log('patched');
