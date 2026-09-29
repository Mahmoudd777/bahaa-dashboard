// The three remaining data sets in the detailed document, plus one that is a
// second copy of the KPI targets and is used to check the set already loaded.
import { readFileSync, writeFileSync } from "fs";

const SRC = "client_data/text/04.txt";
const OUT = "sheets/";
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
const csv = (name, cols, rows) => {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  writeFileSync(OUT + name, "﻿" + [cols.join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n"), "utf8");
  console.log(`${name.padEnd(30)} ${String(rows.length).padStart(3)} rows`);
};

const text = readFileSync(SRC, "utf8").replace(/^﻿/, "").replace(/\r/g, "");
const lines = text.split("\n");

// ------------------------------------------------- strategic risks by pillar
// "المخاطر الرئيسية | # | الركيزة الاستراتيجية" — the pillar is only written on
// the first row of each group, so it carries down.
const stratRisks = [];
let inRisks = false, pillar = "";
for (const line of lines) {
  const c = line.split("|").map(norm);
  if (c[0] === "المخاطر الرئيسية") { inRisks = true; pillar = ""; continue; }
  if (!inRisks) continue;
  if (c.length < 3 || !c[0]) { inRisks = false; continue; }
  if (c[2]) pillar = c[2];
  stratRisks.push({ pillar, number: c[1], risk: c[0] });
}
csv("13_strategic_risks.csv", ["pillar", "number", "risk"], stratRisks);

// ------------------------------------------------ alignment with government
const align = [];
let inAlign = false;
for (const line of lines) {
  const c = line.split("|").map(norm);
  if (c[0] === "نتيجة المواءمة") { inAlign = true; continue; }
  if (!inAlign) continue;
  if (c.length < 4 || !c[0]) { inAlign = false; continue; }
  align.push({ entity: c[3], date: c[2], status: c[1], result: c[0] });
}
csv("14_alignment.csv", ["entity", "date", "status", "result"], align);

// ------------------------------------------------------ committees / teams
const committees = [];
let inCom = false;
for (const line of lines) {
  const c = line.split("|").map(norm);
  if (c[0] === "#" && /اللجنة/.test(c[1] || "")) { inCom = true; continue; }
  if (!inCom) continue;
  if (c.length < 3 || !c[1]) { inCom = false; continue; }
  committees.push({ number: c[0], name: c[1], remit: c[2] });
}
csv("15_committees.csv", ["number", "name", "remit"], committees);

// -------------------------------------- second copy of the targets, to check
// "الطموح بحلول عام 2030 | 2029 | ... | خط الأساس | مؤشر الأداء الإستراتيجي"
const check = [];
let inAmb = false;
for (const line of lines) {
  const c = line.split("|").map(norm);
  if (c[0] === "الطموح بحلول عام 2030" || c[0] === "الطموح عام 2030 1") { inAmb = true; continue; }
  if (!inAmb) continue;
  if (c.length < 7 || !c[6]) { inAmb = false; continue; }
  const [y2030, y2029, y2028, y2027, y2026, baseline, kpi] = c;
  check.push({ kpi, baseline, y2026, y2027, y2028, y2029, y2030 });
}
csv("16_targets_crosscheck.csv", ["kpi", "baseline", "y2026", "y2027", "y2028", "y2029", "y2030"], check);
