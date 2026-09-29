// Milestones, attributed per TABLE rather than per slide.
//
// A slide does not always repeat its initiative number, and carrying the last
// seen number forward put one initiative's milestones under another — 02.03's
// animal-products work ended up inside 02.02. Each table names its own project
// in its first row, so that name is matched against the initiative names and
// only falls back to the slide's number when no match is found.
//
// The tables are three deep: project, component, milestone. The first row of a
// table is the project and repeats the total of the rows beneath it, so it is
// marked rather than counted again.
import { readFileSync, writeFileSync } from "fs";

const [, , OUT, NAMES, ...SRCS] = process.argv;
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
const key = (s) => norm(s).replace(/[()\[\]،,.\-–—"']/g, "").replace(/^(مشروع|تطوير|إطلاق)\s+/, "");

const initiatives = JSON.parse(readFileSync(NAMES, "utf8"));   // [{code,name}]
const named = initiatives.map((i) => ({ code: i.code, k: key(i.name) }));

function matchInitiative(projectName) {
  const k = key(projectName);
  if (!k) return null;
  let best = null, bestScore = 0;
  for (const cand of named) {
    // longest shared prefix, in words
    const a = k.split(" "), b = cand.k.split(" ");
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    if (n > bestScore) { bestScore = n; best = cand.code; }
  }
  return bestScore >= 3 ? best : null;   // three leading words in common
}

const rows = [];
for (const src of SRCS) {
  const slides = readFileSync(src, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
    .split(/^=== SLIDE (\d+) ===$/m);
  let lastCode = "";
  for (let i = 1; i < slides.length; i += 2) {
    const body = slides[i + 1] || "";
    const onSlide = (body.match(/(\d{2}\.\d{2})\s*~\s*رقم المبادرة/) || [])[1];
    if (onSlide) lastCode = onSlide;

    for (const block of body.split("--- TABLE ").slice(1)) {
      const lines = block.split("\n");
      if (!/مشاريع ومعالم المبادرة|مشاريع المبادرة/.test(lines[0] || "") &&
          !lines.some((l) => /مشاريع ومعالم المبادرة|مشاريع المبادرة/.test(l))) continue;

      const data = [];
      for (const line of lines) {
        const c = line.split("|").map(norm);
        if (c.length < 5) continue;
        const [name, start, end, capital, operational] = c;
        if (!name || /^(مشاريع ومعالم المبادرة|مشاريع المبادرة|Priority Milestones)$/.test(name)) continue;
        if (!/^Q\s*[1-4]/.test(start || "")) continue;
        data.push({ name, start, end, capital, operational });
      }
      if (!data.length) continue;

      const owner = matchInitiative(data[0].name) || onSlide || lastCode;
      if (!owner) continue;
      data.forEach((r, idx) => rows.push({ initiative: owner, is_project: idx === 0 ? 1 : 0, ...r }));
    }
  }
}

const seen = new Set();
const unique = rows.filter((r) => {
  const k = r.initiative + "|" + r.name;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const cols = ["initiative", "is_project", "name", "start", "end", "capital", "operational"];
writeFileSync(OUT, "﻿" + [cols.join("\t"),
  ...unique.map((r) => cols.map((c) => String(r[c]).replace(/\t/g, " ")).join("\t"))].join("\n"), "utf8");

const per = {};
for (const r of unique) per[r.initiative] = (per[r.initiative] || 0) + 1;
console.log(`rows: ${rows.length}, unique: ${unique.length}`);
console.log("per initiative:", JSON.stringify(per));
console.log("attributed by project name:", rows.filter((r) => r.is_project).length, "tables");
