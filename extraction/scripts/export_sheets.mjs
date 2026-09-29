// Write every extracted entity as its own CSV, so the whole set can be read
// and checked before anything is loaded.
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const D = "client_data/";
const OUT = "sheets/";
mkdirSync(OUT, { recursive: true });

const readTsv = (f) => {
  const lines = readFileSync(D + f, "utf8").replace(/^﻿/, "").replace(/\r/g, "").split("\n").filter(Boolean);
  const cols = lines[0].split("\t");
  return lines.slice(1).map((l) => Object.fromEntries(l.split("\t").map((v, i) => [cols[i], v])));
};
const bundle = JSON.parse(readFileSync(D + "bundle.json", "utf8"));

// Excel opens a UTF-8 CSV correctly only with the byte-order mark, and Arabic
// text is the whole point here.
function csv(name, cols, rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const body = [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
  writeFileSync(OUT + name, "﻿" + body, "utf8");
  console.log(`${name.padEnd(28)} ${String(rows.length).padStart(4)} rows`);
}

csv("01_pillars.csv", ["code", "name"], bundle.pillars);
// The four top-level objectives come from the vision deck; the ones a level
// down appear only in the strategic house, as the thing each indicator hangs
// off. Both belong in the same sheet, told apart by `level`.
const objectives = bundle.objectives.map((o) => ({ ...o, level: "رئيسي" }));
const known = new Set(objectives.map((o) => o.name.trim()));
let sub = 0;
for (const row of bundle.objective_kpis || []) {
  const name = (row.objective || "").trim();
  if (!name || known.has(name)) continue;
  known.add(name);
  sub += 1;
  objectives.push({ code: `OBJ-S${String(sub).padStart(2, "0")}`, name, description: "", level: "فرعي" });
}
csv("02_objectives.csv", ["code", "level", "name", "description"], objectives);
csv("12_objective_kpis.csv", ["objective", "kpi"], bundle.objective_kpis || []);
csv("03_programs.csv", ["code", "name"], bundle.programs);
csv("04_kpis.csv",
  ["code", "name", "unit", "direction", "frequency", "baseline_value", "baseline_year",
   "baseline_raw", "baseline_year_raw", "owner", "objective", "data_source", "formula",
   "cumulative_in_year", "cumulative_annual", "description"],
  bundle.kpis);
csv("05_kpi_targets.csv", ["kpi", "period", "target", "raw"], bundle.kpi_targets);
csv("06_initiatives.csv",
  ["code", "name", "owner", "funder", "pillar", "objective", "economy_color",
   "start_date", "end_date", "budget_capital", "budget_operational", "budget_total",
   "description", "problem", "impact", "outputs", "operational_kpis", "stakeholders"],
  bundle.initiatives);

const ms = readTsv("milestones_v3.tsv");
csv("08_projects_strategy.csv", ["initiative", "name", "start", "end", "capital", "operational"],
  ms.filter((m) => m.is_parent === "1"));
csv("09_milestones.csv", ["initiative", "parent", "name", "start", "end", "capital", "operational"],
  ms.filter((m) => m.is_parent !== "1"));

csv("10_risks.csv", ["initiative", "risk", "likelihood", "impact", "score", "mitigation"],
  readTsv("risks_all.tsv"));

const rat = JSON.parse(readFileSync(D + "rationale.json", "utf8"));
csv("11_kpi_methodology.csv", ["kpi", "method"],
  rat.map((r) => ({ kpi: r.kpi, method: (r.method || r.rationale || "").replace(/\s+/g, " ") })));

console.log("\n07_projects.csv was written by parse_projects.mjs (145 government projects).");
