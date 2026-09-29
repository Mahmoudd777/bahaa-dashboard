// "بطاقات المبادرات والمشاريع" -> initiatives + their milestones.
//
// Each initiative spans 3 slides sharing a "رقم المبادرة" (e.g. 01.01):
//   card 1 - summary: owner, funder, pillar, dates, budget split, description
//   card 2 - narrative: problem, contribution, audience, impact, outputs
//   card 3 - table: projects / milestones with dates and budget per line
// Slide text comes out in PowerPoint z-order, not reading order, so values are
// taken as "everything after a known label until the next known label".
import { readFileSync, writeFileSync } from "fs";

const [, , SRC, OUT_INIT, OUT_MS] = process.argv;

const LABELS = [
  "رقم المبادرة", "مالك المبادرة", "الجهة الممولة", "لون الاقتصاد",
  "الارتباط الاستراتيجي", "ركيزة", "تاريخ البداية", "تاريخ النهاية",
  "الموازنة التقديرية", "رأسمالية", "تشغيلية", "إجمالي", "الوصف",
  "المؤشرات التشغيلية للمبادرة", "أصحاب المصلحة", "مشاريع ومعالم المبادرة",
  "الهدف الاستراتيجي المرتبط", "وصف المبادرة:", "المشكلة / التحدي التي تهدف المبادرة إلى حلها:",
  "المساهمة في تحقيق الهدف الاستراتيجي:", "الشريحة / الفئة المستهدفة من المبادرة:",
  "الأثر المتوقع من المبادرة:", "مخرجات المبادرة",
];

const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
const clean = (s) => norm(s).replace(/^[:~\-\s]+|[:~\s]+$/g, "");

const slides = readFileSync(SRC, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
  .split(/^=== SLIDE (\d+) ===$/m);

const byCode = new Map();
const milestones = [];

for (let i = 1; i < slides.length; i += 2) {
  const slide = slides[i];
  const body = slides[i + 1] || "";
  const text = (body.match(/--- TEXT ---\n([\s\S]*?)(?:\n--- |$)/) || [, ""])[1];
  const parts = text.split("~").map(norm).filter(Boolean);

  const f = {};
  for (let p = 0; p < parts.length; p++) {
    if (!LABELS.includes(parts[p])) continue;
    const out = [];
    for (let q = p + 1; q < parts.length && !LABELS.includes(parts[q]); q++) out.push(parts[q]);
    if (out.length && !f[parts[p]]) f[parts[p]] = out.join(" ");
  }

  // the code sits BEFORE its label ("01.01 ~ رقم المبادرة")
  const codeIdx = parts.indexOf("رقم المبادرة");
  let code = "";
  for (let q = codeIdx - 1; q >= 0 && q > codeIdx - 4; q--) {
    if (/^\d{2}\.\d{2}$/.test(parts[q])) { code = parts[q]; break; }
  }
  if (!code) {
    const m = text.match(/(\d{2}\.\d{2})\s*~\s*رقم المبادرة/);
    if (m) code = m[1];
  }
  if (!code) continue;

  const rec = byCode.get(code) || { code, slides: [] };
  rec.slides.push(slide);
  const put = (k, v) => { if (v && !rec[k]) rec[k] = clean(v); };

  put("owner", f["مالك المبادرة"]);
  put("funder", f["الجهة الممولة"]);
  put("economy_color", f["لون الاقتصاد"]);
  put("pillar", f["ركيزة"]);
  put("start_date", f["تاريخ البداية"]);
  put("end_date", f["تاريخ النهاية"]);
  // Budgets read as "12 مليون" / "600,000" / "--". Anything after the number
  // is neighbouring slide text, not part of the figure.
  const money = (v) => {
    const m = norm(v).match(/^(-{1,2}|[\d.,]+)\s*(مليون|مليار|ألف)?/);
    if (!m || m[1].startsWith("-")) return "";
    return (m[1] + " " + (m[2] || "")).trim();
  };
  put("budget_capital", money(f["رأسمالية"]));
  put("budget_operational", money(f["تشغيلية"]));
  put("budget_total", money(f["إجمالي"]));

  // "الارتباط الاستراتيجي ~ ركيزة ~ <name>" — the pillar name follows the
  // word ركيزة, which itself follows the section label.
  const pIdx = parts.indexOf("ركيزة");
  if (pIdx > -1 && parts[pIdx + 1] && !LABELS.includes(parts[pIdx + 1])) {
    put("pillar", parts[pIdx + 1]);
  }
  put("objective", f["الهدف الاستراتيجي المرتبط"]);
  put("description", f["وصف المبادرة:"] || f["الوصف"]);
  put("problem", f["المشكلة / التحدي التي تهدف المبادرة إلى حلها:"]);
  put("contribution", f["المساهمة في تحقيق الهدف الاستراتيجي:"]);
  put("audience", f["الشريحة / الفئة المستهدفة من المبادرة:"]);
  put("impact", f["الأثر المتوقع من المبادرة:"]);
  put("outputs", f["مخرجات المبادرة"]);
  put("operational_kpis", f["المؤشرات التشغيلية للمبادرة"]);
  put("stakeholders", f["أصحاب المصلحة"]);
  byCode.set(code, rec);

  // milestone table (card 3): name | start | end | capital | operational | ...
  const tbl = (body.match(/--- TABLE 1 ---\n([\s\S]*?)(?:\n--- |$)/) || [, ""])[1];
  for (const line of tbl.split("\n")) {
    const c = line.split("|").map(norm);
    if (c.length < 5) continue;
    if (/^(مشاريع ومعالم المبادرة|Priority Milestones)$/.test(c[0]) || !c[0]) continue;
    if (!/^Q\s*\d/.test(c[1] || "")) continue;   // only rows with a real start
    milestones.push({
      initiative: code, name: c[0], start: c[1], end: c[2],
      capital: c[3] || "", operational: c[4] || "",
    });
  }
}

const inits = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
for (const r of inits) {
  r.name = (r.description || "").split(/[.،]/)[0].slice(0, 90);
  r.slides = r.slides.join(",");
}

const tsv = (rows, cols) => "﻿" + [cols.join("\t"),
  ...rows.map((r) => cols.map((c) => String(r[c] ?? "").replace(/\t/g, " ")).join("\t"))].join("\n");

const initCols = ["code", "name", "owner", "funder", "pillar", "objective", "economy_color",
  "start_date", "end_date", "budget_capital", "budget_operational", "budget_total",
  "description", "problem", "contribution", "audience", "impact", "outputs",
  "operational_kpis", "stakeholders", "slides"];
writeFileSync(OUT_INIT, tsv(inits, initCols), "utf8");
writeFileSync(OUT_MS, tsv(milestones, ["initiative", "name", "start", "end", "capital", "operational"]), "utf8");

console.log(`initiatives: ${inits.length}`);
console.log(`milestones  : ${milestones.length}`);
const miss = (k) => inits.filter((r) => !r[k]).length;
for (const k of ["owner", "funder", "pillar", "objective", "start_date", "end_date", "budget_total", "outputs"]) {
  console.log(`  missing ${k}: ${miss(k)} / ${inits.length}`);
}
console.log("\ncode | pillar | start -> end | total | milestones");
for (const r of inits) {
  const n = milestones.filter((m) => m.initiative === r.code).length;
  console.log([r.code, (r.pillar || "-").slice(0, 14), `${r.start_date || "-"} -> ${r.end_date || "-"}`,
               r.budget_total || "-", n].join(" | "));
}
