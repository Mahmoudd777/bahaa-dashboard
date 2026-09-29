// Sweep the slides that carry NO table, to see whether any hold structured
// data that the table-based inventory could not have seen. The KPI and
// initiative cards are themselves text, so this is where a gap could hide.
import { readFileSync, readdirSync } from "fs";

const DIR = "client_data/text/";
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

// Labels that mark a slide as carrying records rather than prose.
const DATA_LABELS = [
  "رقم المبادرة", "المؤشر", "مالك المؤشر", "خط الأساس", "الموازنة التقديرية",
  "مصدر البيانات", "دورية القياس", "المستهدف", "الجهة الممولة", "تاريخ البداية",
];

let totals = { slides: 0, withTable: 0, textOnly: 0, textWithLabels: 0, empty: 0 };
const suspects = [];

for (const file of readdirSync(DIR).filter((f) => /^\d\d\.txt$/.test(f))) {
  const parts = readFileSync(DIR + file, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
    .split(/^=== SLIDE (\d+) ===$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const slide = parts[i];
    const body = parts[i + 1] || "";
    totals.slides += 1;
    if (body.includes("--- TABLE")) { totals.withTable += 1; continue; }
    const text = norm((body.match(/--- TEXT ---\n([\s\S]*)$/) || [, ""])[1]);
    if (!text) { totals.empty += 1; continue; }
    totals.textOnly += 1;
    const hits = DATA_LABELS.filter((l) => text.includes(l));
    if (hits.length >= 2) {
      totals.textWithLabels += 1;
      suspects.push({ file, slide, hits: hits.join("،"), text: text.slice(0, 150) });
    }
  }
}

console.log(JSON.stringify(totals, null, 1));
console.log(`\ntext-only slides carrying record labels: ${suspects.length}`);
for (const s of suspects.slice(0, 25)) {
  console.log(`\n[${s.file} slide ${s.slide}] ${s.hits}`);
  console.log(`   ${s.text}`);
}
