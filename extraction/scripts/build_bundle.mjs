// Collect everything parsed out of the client's decks into one bundle the
// import script on the server can read.
import { readFileSync, writeFileSync } from "fs";

const D = "client_data/";
const readTsv = (f) => {
  const [head, ...rows] = readFileSync(D + f, "utf8").replace(/^﻿/, "").replace(/\r/g, "").split("\n").filter(Boolean);
  const cols = head.split("\t");
  return rows.map((r) => Object.fromEntries(r.split("\t").map((v, i) => [cols[i], v])));
};
const readJson = (f) => JSON.parse(readFileSync(D + f, "utf8"));

const house = readJson("house.json");
const objectives = readJson("objectives.json");
const kpis = readTsv("kpis.tsv");
const targets = readTsv("kpi_targets.tsv");
const milestones = readTsv("milestones.tsv");
const initiatives = Object.values(readJson("initiatives_llm.tsv.cache.json"))
  .filter((r) => r && r.code && !r.error);

// Programmes are the first half of an initiative code (01.01 -> 01). The deck
// names its five groups as pillars, and the codes follow the same order.
const PROGRAMS = [
  { code: "01", name: "السياحة" },
  { code: "02", name: "الزراعة والصناعات المرتبطة" },
  { code: "03", name: "هوية الباحة" },
  { code: "04", name: "المجتمع المحلي" },
  { code: "05", name: "المنظومة التمكينية" },
];

// Numbers arrive as "26.3", "46%", "2,910", ">60%", "<4.0%", "-", "".
// Everything that is not a number becomes null rather than a guess, and the
// raw string is kept so nothing is silently lost.
function num(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim().replace(/[,٬]/g, "").replace(/[<>]/g, "").replace(/%/g, "");
  if (!s || s === "-" || s === "--" || /^(NA|N\/A)$/i.test(s)) return null;
  const m = s.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

// The baseline year is written as "2024", "Q1 2026", "نهاية الربع الأول من
// 2028" or "NA". Taking the first number found turned "Q1 2026" into 1, so
// only a four-digit year counts; anything else stays null and the original
// wording is carried in baseline_year_raw.
function yearOf(v) {
  const m = String(v ?? "").match(/\b(20\d{2})\b/);
  return m ? parseInt(m[1], 10) : null;
}

const DIRECTION = { "متزايدة": "up", "متناقصة": "down" };
const FREQUENCY = {
  "سنوي": "annual", "ربع سنوي": "quarterly", "نصف سنوي": "semiannual",
  "شهري": "monthly",
};
const CUMULATIVE = { "تراكمي": "cumulative", "غير تراكمي": "non_cumulative" };

const bundle = {
  pillars: house.pillars.map((p, i) => ({ code: `P${String(i + 1).padStart(2, "0")}`, ...p })),
  programs: PROGRAMS,
  objectives: objectives.map((o, i) => ({ code: `OBJ-${String(i + 1).padStart(2, "0")}`, ...o })),
  objective_kpis: house.objective_kpis || [],
  kpis: kpis.map((k) => ({
    name: k.name,
    code: `KPI-${String(k.slide).padStart(2, "0")}`,
    description: k.description,
    formula: k.formula,
    unit: k.unit,
    owner: k.owner,
    data_source: k.source,
    objective: k.objective,
    direction: DIRECTION[k.direction] || "up",
    frequency: FREQUENCY[k.frequency] || "annual",
    frequency_raw: k.frequency,
    cumulative_in_year: CUMULATIVE[k.cumulative_in_year] || null,
    cumulative_annual: CUMULATIVE[k.cumulative_annual] || null,
    baseline_value: num(k.baseline),
    baseline_raw: k.baseline,
    baseline_year: yearOf(k.baseline_year),
    baseline_year_raw: k.baseline_year,
  })),
  kpi_targets: targets
    .map((t) => ({ kpi: t.kpi, period: t.period, target: num(t.target), raw: t.target }))
    .filter((t) => t.target !== null),
  initiatives: initiatives.map((r) => ({
    code: r.code,
    name: r.name,
    owner: r.owner,
    funder: r.funder,
    pillar: (r.pillar || "").replace(/^ركيزة\s*/, ""),
    economy_color: r.economy_color,
    objective: r.objective,
    start_date: r.start_date,
    end_date: r.end_date,
    budget_capital: num(r.budget_capital),
    budget_operational: num(r.budget_operational),
    budget_total: num(r.budget_total),
    description: r.description,
    problem: r.problem,
    impact: r.impact,
    outputs: r.outputs,
    operational_kpis: r.operational_kpis,
    stakeholders: r.stakeholders,
  })),
  milestones: milestones.map((m) => ({
    initiative: m.initiative,
    name: m.name,
    start_label: m.start,
    end_label: m.end,
    capital: num(m.capital),
    operational: num(m.operational),
  })),
};

writeFileSync(D + "bundle.json", JSON.stringify(bundle, null, 1), "utf8");
for (const [k, v] of Object.entries(bundle)) console.log(`${k}: ${v.length}`);
console.log("\nkpis with a baseline number:", bundle.kpis.filter((k) => k.baseline_value !== null).length);
console.log("initiatives with a budget:", bundle.initiatives.filter((i) => i.budget_total !== null).length);
console.log("initiatives with both dates:", bundle.initiatives.filter((i) => i.start_date && i.end_date).length);
