// Milestones from every deck that carries them.
// The initiative cards file only has these tables for a few initiatives; the
// detailed strategy document has them for all of them, so both are read and
// the results merged on (initiative, milestone name).
import { readFileSync, writeFileSync } from "fs";

const OUT = process.argv[2];
const SRCS = process.argv.slice(3);
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

const rows = [];
for (const src of SRCS) {
  const slides = readFileSync(src, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
    .split(/^=== SLIDE (\d+) ===$/m);
  let lastCode = "";
  let found = 0;
  for (let i = 1; i < slides.length; i += 2) {
    const body = slides[i + 1] || "";
    const onSlide = (body.match(/(\d{2}\.\d{2})\s*~\s*رقم المبادرة/) || [])[1];
    if (onSlide) lastCode = onSlide;
    if (!/مشاريع ومعالم المبادرة|مشاريع المبادرة/.test(body)) continue;
    const code = onSlide || lastCode;
    if (!code) continue;

    for (const line of body.split("\n")) {
      const c = line.split("|").map(norm);
      if (c.length < 5) continue;
      const [name, start, end, capital, operational] = c;
      if (!name || /^(مشاريع ومعالم المبادرة|مشاريع المبادرة|Priority Milestones)$/.test(name)) continue;
      // a data row starts with a quarter position, written "Q1" or "Q 1"
      if (!/^Q\s*[1-4]/.test(start || "")) continue;
      rows.push({ initiative: code, name, start, end, capital, operational, src: src.slice(-6) });
      found++;
    }
  }
  console.log(`${src.slice(-6)}: ${found} milestone rows`);
}

const seen = new Set();
const unique = rows.filter((r) => {
  const key = r.initiative + "|" + r.name;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const cols = ["initiative", "name", "start", "end", "capital", "operational"];
writeFileSync(OUT, "﻿" + [cols.join("\t"),
  ...unique.map((r) => cols.map((c) => String(r[c]).replace(/\t/g, " ")).join("\t"))].join("\n"), "utf8");

const per = {};
for (const r of unique) per[r.initiative] = (per[r.initiative] || 0) + 1;
console.log(`\ntotal: ${rows.length}, unique: ${unique.length}`);
console.log("per initiative:", JSON.stringify(per));
console.log("initiatives with none:",
  ["01.01","01.02","01.03","01.04","02.01","02.02","02.03","02.04","02.05",
   "03.01","03.02","03.03","04.01","04.02","04.03","04.04","04.05","05.01","05.02"]
    .filter((c) => !per[c]).join(", ") || "none");
