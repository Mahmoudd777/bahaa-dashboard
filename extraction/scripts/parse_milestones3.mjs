// Milestones attributed per PROJECT BLOCK, not per slide or per table.
//
// Slides in this block of the deck stop repeating the initiative number, so
// carrying the last one forward shifted whole groups by one initiative:
// 02.03's animal-products work sat under 02.02, and 02.04's food-industry work
// sat under 02.03. Both were wrong by name.
//
// A table holds several projects, each followed by its own milestones, and a
// parent's budget equals the sum of the rows beneath it. That arithmetic is
// what identifies a parent — no guessing from wording. Each parent's name is
// then matched to an initiative, so a block lands where its name says.
import { readFileSync, writeFileSync } from "fs";

const [, , OUT, NAMES, ...SRCS] = process.argv;
const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
const money = (v) => {
  const s = norm(v).replace(/,/g, "");
  if (!s || s.startsWith("-")) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};
const key = (s) => norm(s)
  .replace(/[()\[\]،,.\-–—"']/g, " ")
  .replace(/\s+/g, " ")
  .replace(/^(مشروع|وتجهيز)\s+/, "")
  .trim();

const initiatives = JSON.parse(readFileSync(NAMES, "utf8"));
const named = initiatives.map((i) => ({ code: i.code, words: key(i.name).split(" ") }));

// score = how many words of the initiative name appear in the project name
function matchInitiative(projectName) {
  const words = new Set(key(projectName).split(" "));
  let best = null, bestScore = 0;
  for (const cand of named) {
    const hits = cand.words.filter((w) => w.length > 2 && words.has(w)).length;
    const score = hits / Math.max(cand.words.length, 1);
    if (score > bestScore) { bestScore = score; best = cand.code; }
  }
  return bestScore >= 0.45 ? best : null;
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
      if (!/مشاريع ومعالم المبادرة|مشاريع المبادرة/.test(block)) continue;
      const data = [];
      for (const line of block.split("\n")) {
        const c = line.split("|").map(norm);
        if (c.length < 5) continue;
        const [name, start, end, capital, operational] = c;
        if (!name || /^(مشاريع ومعالم المبادرة|مشاريع المبادرة|Priority Milestones)$/.test(name)) continue;
        if (!/^Q\s*[1-4]/.test(start || "")) continue;
        data.push({ name, start, end, budget: money(capital) + money(operational), capital, operational });
      }
      if (!data.length) continue;

      // a row is a parent when its budget equals the sum of the rows after it,
      // up to the next row that also satisfies that
      const parents = [];
      for (let a = 0; a < data.length; a++) {
        let sum = 0;
        for (let b = a + 1; b < data.length; b++) {
          if (parents.includes(b)) break;
          sum += data[b].budget;
          if (data[a].budget > 0 && Math.abs(sum - data[a].budget) < 1) { parents.push(a); break; }
          if (sum > data[a].budget) break;
        }
      }
      if (!parents.includes(0)) parents.unshift(0);   // first row is always the project

      // group rows under the nearest preceding parent
      let owner = null, current = null;
      for (let a = 0; a < data.length; a++) {
        if (parents.includes(a)) {
          const m = matchInitiative(data[a].name);
          if (m) owner = m;
          current = data[a].name;
        }
        const code = owner || onSlide || lastCode;
        if (!code) continue;
        rows.push({
          initiative: code,
          is_parent: parents.includes(a) ? 1 : 0,
          parent: parents.includes(a) ? "" : current || "",
          name: data[a].name, start: data[a].start, end: data[a].end,
          capital: data[a].capital, operational: data[a].operational,
        });
      }
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

const cols = ["initiative", "is_parent", "parent", "name", "start", "end", "capital", "operational"];
writeFileSync(OUT, "﻿" + [cols.join("\t"),
  ...unique.map((r) => cols.map((c) => String(r[c]).replace(/\t/g, " ")).join("\t"))].join("\n"), "utf8");

const per = {}, sums = {};
for (const r of unique) {
  per[r.initiative] = (per[r.initiative] || 0) + 1;
  if (!r.is_parent) sums[r.initiative] = (sums[r.initiative] || 0) + money(r.capital) + money(r.operational);
}
console.log(`rows: ${rows.length}, unique: ${unique.length}`);
console.log("count per initiative:", JSON.stringify(per));
console.log("budget of leaf rows (millions):",
  JSON.stringify(Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, +(v / 1e6).toFixed(2)]))));
