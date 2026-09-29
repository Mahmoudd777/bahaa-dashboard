// Walk EVERY table in the six decks and say which extractor claims it.
// Whatever no extractor claims is printed in full, so nothing hides behind a
// summary count.
import { readFileSync, readdirSync } from "fs";

const DIR = "client_data/text/";
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

// Each rule says: this shape of table is already pulled into that sheet.
const RULES = [
  [/مشاريع ومعالم المبادرة|مشاريع ومشاريع ومعالم المبادرة|مشاريع المبادرة/, "08/09 projects+milestones"],
  [/آليات التجنب المقترحة/, "10 risks"],
  [/خط الأساس \| سنة خط الأساس/, "05 kpi targets"],
  [/التعليل \| المستهدفات السنوية/, "11 methodology"],
  [/الطموح بحلول عام 2030|الطموح عام 2030/, "16 targets crosscheck"],
  [/المخاطر الرئيسية \| #/, "13 strategic risks"],
  [/نتيجة المواءمة/, "14 alignment"],
  [/^# \| اللجنة/, "15 committees"],
  [/ر\.س\.?‏? \|/, "07 government projects"],
  [/حالة المشروع الفرعية|^قيمة المشاريع \| عدد المشاريع|إجمالي قيمة المحفظة الاستثمارية/, "19 investment pipeline"],
  [/كمية الإنتاج \(طن\)/, "17 agriculture production"],
  [/عدد الزيارات \(مليون\)/, "18 tourism targets"],
  [/^\d عالي|^\d متوسط/, "narrative: risk scoring legend"],
  [/القطاع 1 \| تنافسية المنطقة/, "narrative: sector competitiveness"],
  [/الأثر المتوقع من المبادرات المخططة/, "narrative: impact analysis"],
  [/^# \| المحور \| الصيغة/, "narrative: media plan"],
  [/المبادئ التوجيهية|المبادئ التي تعمل عليها/, "narrative: guiding principles"],
  [/جازان|عسير \| مكة|القرب الجغرافي/, "narrative: regional benchmark"],
  [/عدد الملاحظات/, "narrative: committee remarks"],
  [/الترتيبات التنظيمية/, "narrative: org arrangements"],
  [/المخرجات الرئيسية \| الإجراء الرئيسي/, "narrative: phase outline"],
  [/الجهات المسؤولة \| البيان/, "narrative: escalation"],
];

const unclaimed = [];
let total = 0;
const claimed = new Map();

for (const file of readdirSync(DIR).filter((f) => /^\d\d\.txt$/.test(f))) {
  const slides = readFileSync(DIR + file, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
    .split(/^=== SLIDE (\d+) ===$/m);
  for (let i = 1; i < slides.length; i += 2) {
    const slide = slides[i];
    for (const block of (slides[i + 1] || "").split("--- TABLE ").slice(1)) {
      const rows = block.split("\n")
        .filter((l) => l.trim() && !/^\d+ ---$/.test(l.trim()) && !l.startsWith("---"));
      if (!rows.length) continue;
      total += 1;
      const text = rows.join("\n");
      const rule = RULES.find(([re]) => re.test(text));
      if (rule) {
        claimed.set(rule[1], (claimed.get(rule[1]) || 0) + 1);
      } else {
        unclaimed.push({ file, slide, rows: rows.length, head: norm(rows[0]).slice(0, 110),
                         second: norm(rows[1] || "").slice(0, 110) });
      }
    }
  }
}

console.log(`tables total: ${total}`);
for (const [k, v] of [...claimed].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(v).padStart(3)}  ${k}`);
}
console.log(`\nUNCLAIMED: ${unclaimed.length} tables`);
for (const u of unclaimed) {
  console.log(`\n[${u.file} slide ${u.slide}, ${u.rows} rows]`);
  console.log(`   ${u.head}`);
  if (u.second) console.log(`   ${u.second}`);
}
