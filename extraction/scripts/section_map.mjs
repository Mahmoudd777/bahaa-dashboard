// Every content slide repeats its section title as a run. Mapping slides to
// sections turns the deck's own table of contents into a coverage checklist,
// so a section can be shown to have been looked at rather than assumed.
import {readFileSync} from 'node:fs';
const slides = JSON.parse(readFileSync('all_slides.json', 'utf8'));

const SECTIONS = [
  'المقدمة',
  'التوجيهات والمبادئ الإرشادية',
  'المنهجية والموائمة',
  'المنهجية والمواءمة',
  'الوضع الراهن',
  'الميز التنافسية',
  'الرؤية والتوجهات الاستراتيجية',
  'المبادرات وخطة التنفيذ',
  'الميزانية التقديرية',
  'الحوكمة والنموذج التشغيلي',
  'خطة الإطلاق',
  'خطة التفعيل',
  'الملحقات',
];

const hits = new Map(SECTIONS.map((s) => [s, []]));
const unmapped = [];
for (const [key, runs] of Object.entries(slides)) {
  const n = +key;
  const found = SECTIONS.filter((s) => runs.some((r) => r === s || r === s + ' '));
  if (!found.length) { unmapped.push(n); continue; }
  for (const s of found) hits.get(s).push(n);
}

const ranges = (nums) => {
  if (!nums.length) return '-';
  nums.sort((a, b) => a - b);
  const out = []; let start = nums[0], prev = nums[0];
  for (const n of nums.slice(1)) {
    if (n === prev + 1) { prev = n; continue; }
    out.push(start === prev ? `${start}` : `${start}-${prev}`); start = prev = n;
  }
  out.push(start === prev ? `${start}` : `${start}-${prev}`);
  return out.join(', ');
};

for (const [s, nums] of hits) {
  console.log(String(nums.length).padStart(4), s.padEnd(34), ranges(nums).slice(0, 90));
}
console.log('\nslides with no section header:', unmapped.length);
console.log(ranges(unmapped).slice(0, 400));
