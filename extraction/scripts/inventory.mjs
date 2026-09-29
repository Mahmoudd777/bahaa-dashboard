// Inventory of EVERY table in the six decks, grouped by its header row.
// The point is to see what exists before deciding what was loaded — the
// opposite of the order I worked in so far.
import { readFileSync, readdirSync } from "fs";

const DIR = "client_data/text/";
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

const kinds = new Map();   // header signature -> {count, rows, files, sample}

for (const file of readdirSync(DIR).filter((f) => /^\d\d\.txt$/.test(f))) {
  const slides = readFileSync(DIR + file, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
    .split(/^=== SLIDE (\d+) ===$/m);
  for (let i = 1; i < slides.length; i += 2) {
    for (const block of (slides[i + 1] || "").split("--- TABLE ").slice(1)) {
      // the block opens with "<n> ---", so the header is the line after it
      const lines = block.split("\n").filter((l) => l.trim() && !/^\d+ ---$/.test(l.trim()) && !l.startsWith("---"));
      if (!lines.length) continue;
      const sig = lines[0].split("|").map(norm).filter(Boolean).slice(0, 4).join(" | ").slice(0, 90);
      if (!sig) continue;
      const rec = kinds.get(sig) || { tables: 0, rows: 0, files: new Set(), sample: lines[1] || "" };
      rec.tables += 1;
      rec.rows += lines.length - 1;
      rec.files.add(file);
      kinds.set(sig, rec);
    }
  }
}

const sorted = [...kinds.entries()].sort((a, b) => b[1].rows - a[1].rows);
console.log("tables found:", [...kinds.values()].reduce((s, r) => s + r.tables, 0));
console.log("distinct table kinds:", kinds.size);
console.log("");
for (const [sig, rec] of sorted) {
  console.log(`${String(rec.tables).padStart(3)} tables / ${String(rec.rows).padStart(4)} rows  [${[...rec.files].join(",")}]  ${sig}`);
}
