// "بطاقات المؤشرات" -> one row per KPI + one row per (KPI, period) target.
//
// Two table shapes appear:
//   annual     : header [خط الأساس | سنة خط الأساس | العام | 2026 ... 2030]
//                values [26.3 | 2024 | المستهدف | 27.9 ... 31.6]
//   quarterly  : header row 1 carries the years with the merged cells blank,
//                header row 2 carries Q1..Q4, values row carries 20 targets.
import { readFileSync, writeFileSync } from "fs";

const [, , SRC, OUT_KPI, OUT_TGT] = process.argv;

const LABELS = [
  "المؤشر", "مالك المؤشر", "وصف المؤشر", "معادلة المؤشر", "وحدة القياس",
  "دورية القياس", "قطبية المؤشر", "مصدر البيانات", "الهدف الاستراتيجي",
  "التراكمية داخل السنة للمؤشر", "التراكمية السنوية للمؤشر", "المستهدفات",
];

const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

function parseTargets(lines) {
  // lines: the raw table rows already split on "|"
  const rows = lines.map((l) => l.split("|").map(norm));
  const head = rows[0] || [];
  const isQuarterly = (rows[1] || []).some((c) => /^Q[1-4]$/.test(c));

  if (!isQuarterly) {
    const vals = rows[1] || [];
    const out = [];
    head.forEach((h, i) => { if (/^20\d\d$/.test(h)) out.push([h, vals[i] || ""]); });
    return { baseline: vals[0] || "", baselineYear: vals[1] || "", targets: out };
  }

  // Forward-fill the year across its merged (blank) cells.
  let year = "";
  const years = head.map((c) => { if (/^20\d\d$/.test(c)) year = c; return year; });
  const qs = rows[1] || [];
  const vals = rows[2] || [];
  const out = [];
  qs.forEach((q, i) => {
    if (/^Q[1-4]$/.test(q) && years[i]) out.push([`${years[i]}-${q}`, vals[i] || ""]);
  });
  return { baseline: vals[0] || "", baselineYear: vals[1] || "", targets: out };
}

const slides = readFileSync(SRC, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
  .split(/^=== SLIDE (\d+) ===$/m);

const kpis = [];
const targets = [];

for (let i = 1; i < slides.length; i += 2) {
  const slide = slides[i];
  const body = slides[i + 1] || "";

  const tblBlock = body.match(/--- TABLE 1 ---\n([\s\S]*?)(?:\n--- |$)/);
  let t = { baseline: "", baselineYear: "", targets: [] };
  if (tblBlock) t = parseTargets(tblBlock[1].split("\n").filter((l) => l.trim()));

  const text = (body.match(/--- TEXT ---\n([\s\S]*)$/) || [, ""])[1];
  const parts = text.split("~").map(norm).filter(Boolean);
  const f = {};
  for (let p = 0; p < parts.length; p++) {
    if (!LABELS.includes(parts[p])) continue;
    const out = [];
    for (let q = p + 1; q < parts.length && !LABELS.includes(parts[q]); q++) out.push(parts[q]);
    if (out.length && !f[parts[p]]) f[parts[p]] = out.join(" ");
  }

  const name = norm((f["المؤشر"] || "").split(" مالك المؤشر")[0]);
  if (!name && !t.targets.length) continue;

  kpis.push({
    slide, name,
    owner: f["مالك المؤشر"] || "",
    description: f["وصف المؤشر"] || "",
    formula: f["معادلة المؤشر"] || "",
    unit: f["وحدة القياس"] || "",
    frequency: f["دورية القياس"] || "",
    direction: f["قطبية المؤشر"] || "",
    source: f["مصدر البيانات"] || "",
    objective: f["الهدف الاستراتيجي"] || "",
    cumulative_in_year: f["التراكمية داخل السنة للمؤشر"] || "",
    cumulative_annual: f["التراكمية السنوية للمؤشر"] || "",
    baseline: t.baseline, baseline_year: t.baselineYear,
    period_count: t.targets.length,
  });

  for (const [period, value] of t.targets) {
    targets.push({ slide, kpi: name, period, target: value });
  }
}

const tsv = (rows) => {
  const cols = Object.keys(rows[0]);
  return "﻿" + [cols.join("\t"),
    ...rows.map((r) => cols.map((c) => String(r[c]).replace(/\t/g, " ")).join("\t"))].join("\n");
};
writeFileSync(OUT_KPI, tsv(kpis), "utf8");
writeFileSync(OUT_TGT, tsv(targets), "utf8");

const withTargets = targets.filter((r) => r.target && r.target !== "-").length;
console.log(`KPIs: ${kpis.length}`);
console.log(`target rows: ${targets.length} (with a real value: ${withTargets})`);
console.log(`quarterly KPIs: ${kpis.filter((k) => k.period_count > 5).length}, annual: ${kpis.filter((k) => k.period_count && k.period_count <= 5).length}, no targets: ${kpis.filter((k) => !k.period_count).length}`);
for (const k of kpis) {
  console.log([k.slide, k.name.slice(0, 40), k.frequency, k.baseline || "-", k.baseline_year || "-", `periods=${k.period_count}`].join(" | "));
}
