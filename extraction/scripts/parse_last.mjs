// The last three data sets the coverage sweep turned up.
import { readFileSync, writeFileSync } from "fs";

const OUT = "sheets/";
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
// "4,4 80" appears in the deck for 4,480 — a stray space inside the number.
const num = (s) => {
  const t = norm(s).replace(/[,٬\s]/g, "");
  const m = t.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
};
const csv = (name, cols, rows) => {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  writeFileSync(OUT + name, "﻿" + [cols.join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n"), "utf8");
  console.log(`${name.padEnd(32)} ${String(rows.length).padStart(3)} rows`);
};

const read = (f) => readFileSync("client_data/text/" + f, "utf8").replace(/^﻿/, "").replace(/\r/g, "");
const all = read("03.txt") + "\n" + read("04.txt");
const lines = all.split("\n");

// ------------------------------------- agricultural production by product
const produce = [];
let inProd = false;
for (const line of lines) {
  if (/كمية الإنتاج \(طن\)/.test(line)) { inProd = true; continue; }
  if (!inProd) continue;
  const c = line.split("|").map(norm);
  if (c.length < 3 || !c[0] || /خط الأساس/.test(line)) {
    if (c.length < 3) inProd = false;
    continue;
  }
  const [name, base, target] = c;
  if (num(base) === null) continue;
  produce.push({ product: name, unit: "طن", baseline_2024: num(base), target_2030: num(target) });
}
const seenP = new Set();
csv("17_agriculture_production.csv", ["product", "unit", "baseline_2024", "target_2030"],
  produce.filter((r) => !seenP.has(r.product) && seenP.add(r.product)));

// ------------------------------------------------ tourism headline targets
const tourism = [];
for (let i = 0; i < lines.length; i++) {
  if (!/عدد الزيارات \(مليون\)/.test(lines[i])) continue;
  const row = (lines[i + 2] || "").split("|").map(norm);
  if (row.length < 7) continue;
  const v = row.slice(1).map(num);
  tourism.push(
    { measure: "عدد الزيارات", unit: "مليون زيارة", baseline_2025: v[0], target_2030: v[1] },
    { measure: "متوسط الإنفاق", unit: "ريال / زائر", baseline_2025: v[2], target_2030: v[3] },
    { measure: "عدد المفاتيح", unit: "مفتاح", baseline_2025: v[4], target_2030: v[5] },
  );
  break;
}
csv("18_tourism_targets.csv", ["measure", "unit", "baseline_2025", "target_2030"], tourism);

// ------------------------------------ existing investment portfolio pipeline
const pipeline = [];
let inPipe = false;
for (const line of lines) {
  const c = line.split("|").map(norm);
  if (c[0] === "حالة المشروع الفرعية") { inPipe = true; continue; }
  if (!inPipe) continue;
  if (c.length < 3 || !c[0]) { inPipe = false; continue; }
  const value = num(c[1]), count = num(c[2]);
  if (value === null || count === null) continue;
  pipeline.push({ stage: c[0], value_sar: value, projects: count });
}
// the same stages are listed per sector and then totalled; keep every row and
// let the sheet show the repetition rather than silently merging them
csv("19_investment_pipeline.csv", ["stage", "value_sar", "projects"], pipeline);

const totalValue = pipeline.reduce((s, r) => s + r.value_sar, 0);
const totalCount = pipeline.reduce((s, r) => s + r.projects, 0);
console.log(`\npipeline rows total ${(totalValue / 1e9).toFixed(2)}bn across ${totalCount} projects (includes sector subtotals)`);
