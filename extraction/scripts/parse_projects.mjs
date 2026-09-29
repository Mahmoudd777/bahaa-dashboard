// Existing government projects listed in the detailed strategy document.
// Rows read right-to-left: value (ر.س) | owning entity | status | project name.
// These tables have no header row — every line is data — which is why a scan
// for table headers missed them entirely.
import { readFileSync, writeFileSync } from "fs";

const [, , SRC, OUT] = process.argv;
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();

const money = (s) => {
  const m = norm(s).replace(/[,٬]/g, "").match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
};

// The document groups these under a sector heading; track the latest one seen
// so each project can carry the sector it belongs to.
const SECTOR_HINT = /القطاع|المحور|الركيزة/;

const slides = readFileSync(SRC, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
  .split(/^=== SLIDE (\d+) ===$/m);

const rows = [];
for (let i = 1; i < slides.length; i += 2) {
  const slide = slides[i];
  const body = slides[i + 1] || "";
  const text = (body.match(/--- TEXT ---\n([\s\S]*)$/) || [, ""])[1];
  const sector = (text.split("~").map(norm).find((p) => SECTOR_HINT.test(p)) || "").slice(0, 60);

  for (const line of body.split("\n")) {
    const c = line.split("|").map(norm);
    if (c.length < 4) continue;
    if (!/ر\.س/.test(c[0])) continue;
    const [value, entity, status, ...rest] = c;
    const name = rest.join(" ").trim();
    if (!name || !entity) continue;
    rows.push({
      name: name.slice(0, 200),
      entity,
      status,                       // منجز | جاري
      value_sar: money(value),
      sector,
      slide,
    });
  }
}

// The same lists are repeated on summary slides.
const seen = new Set();
const unique = rows.filter((r) => {
  const k = r.name + "|" + r.entity + "|" + r.value_sar;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const cols = ["name", "entity", "status", "value_sar", "sector", "slide"];
writeFileSync(OUT, "﻿" + [cols.join("\t"),
  ...unique.map((r) => cols.map((c) => String(r[c] ?? "").replace(/\t/g, " ")).join("\t"))].join("\n"), "utf8");

const total = unique.reduce((s, r) => s + (r.value_sar || 0), 0);
const byStatus = {};
for (const r of unique) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
console.log(`rows: ${rows.length}, unique: ${unique.length}`);
console.log("by status:", JSON.stringify(byStatus));
console.log("total value:", (total / 1e9).toFixed(2), "billion SAR");
console.log("without a value:", unique.filter((r) => r.value_sar === null).length);
for (const r of unique.slice(0, 5)) {
  console.log(`  ${(r.value_sar / 1e6).toFixed(1)}m | ${r.status} | ${r.entity.slice(0, 26)} | ${r.name.slice(0, 40)}`);
}
