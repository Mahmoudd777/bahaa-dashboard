// Risk matrices out of the detailed strategy document.
// Each table sits on a slide that names its initiative, and reads
// right-to-left: mitigation | score | impact | likelihood | risk.
import { readFileSync, writeFileSync } from "fs";

const OUT = process.argv[2];
const SRCS = process.argv.slice(3);
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

// Both the initiative cards and the detailed document carry risk matrices;
// read every source given and merge, since neither file has all of them.
const rows = [];
for (const src of SRCS) {
const slides = readFileSync(src, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
  .split(/^=== SLIDE (\d+) ===$/m);
let lastCode = "";
for (let i = 1; i < slides.length; i += 2) {
  const slide = slides[i];
  const body = slides[i + 1] || "";

  // Track the initiative across slides: the document runs one initiative's
  // section at a time, and a risk slide does not always repeat the number.
  const onSlide = (body.match(/(\d{2}\.\d{2})\s*~\s*رقم المبادرة/) || [])[1];
  if (onSlide) lastCode = onSlide;

  if (!body.includes("آليات التجنب المقترحة")) continue;
  const code = onSlide || lastCode;

  for (const block of body.split("--- TABLE ").slice(1)) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (!lines.some((l) => l.includes("آليات التجنب المقترحة"))) continue;
    for (const line of lines) {
      const c = line.split("|").map(norm);
      if (c.length < 5) continue;
      const [mitigation, score, impact, likelihood, risk] = c;
      // data rows only: the two header rows carry no numbers
      if (!/^\d+$/.test(score) || !/^\d+$/.test(impact) || !/^\d+$/.test(likelihood)) continue;
      if (!risk) continue;
      rows.push({
        initiative: code,
        slide,
        risk,
        likelihood: +likelihood,
        impact: +impact,
        score: +score,
        mitigation,
      });
    }
  }
}

}   // end of sources

// The same matrix is repeated on summary slides; keep one of each.
const seen = new Set();
const unique = rows.filter((r) => {
  const key = r.initiative + "|" + r.risk;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const cols = ["initiative", "risk", "likelihood", "impact", "score", "mitigation", "slide"];
writeFileSync(OUT, "﻿" + [cols.join("\t"),
  ...unique.map((r) => cols.map((c) => String(r[c]).replace(/\t/g, " ")).join("\t"))].join("\n"), "utf8");

console.log(`risk rows found: ${rows.length}, unique: ${unique.length}`);
const byInit = {};
for (const r of unique) byInit[r.initiative] = (byInit[r.initiative] || 0) + 1;
console.log("per initiative:", JSON.stringify(byInit));
console.log("score check (likelihood x impact):",
  unique.filter((r) => r.likelihood * r.impact !== r.score).length, "rows where the product does not match");
for (const r of unique.slice(0, 5)) {
  console.log(`  ${r.initiative} | ${r.likelihood}x${r.impact}=${r.score} | ${r.risk.slice(0, 46)}`);
}
