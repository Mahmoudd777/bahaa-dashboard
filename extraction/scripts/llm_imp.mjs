// The register of directives and remarks from the strategic committee, one
// slide at a time. The text arrives in z-order with each column broken across
// fragments, which is why this goes to the model rather than a parser.
import { readFileSync, writeFileSync, existsSync } from "fs";

const [, , SRC, OUT] = process.argv;
const URL = "http://127.0.0.1:8080/v1/chat/completions";
const KEY = process.env.LLM_KEY || "A3ACZDwnLdEVwU6muZIeO3U5A2uyBfZv";
const CACHE = OUT + ".cache.json";

const SYS = readFileSync("p_imp.txt", "utf8");

const slides = readFileSync(SRC, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
  .split(/^=== SLIDE (\d+) ===$/m);

const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

async function ask(slide, text) {
  const r = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({
      model: "qwen3.6-35b-a3b",
      chat_template_kwargs: { enable_thinking: false },
      temperature: 0,
      max_tokens: 3000,
      messages: [{ role: "system", content: SYS }, { role: "user", content: text.slice(0, 12000) }],
    }),
  });
  const j = await r.json();
  const raw = (j.choices?.[0]?.message?.content || "").trim();
  const s = raw.indexOf("["), e = raw.lastIndexOf("]");
  if (s < 0 || e < 0) return [];
  return JSON.parse(raw.slice(s, e + 1));
}

for (let i = 1; i < slides.length; i += 2) {
  const slide = slides[i];
  if (cache[slide]) continue;
  try {
    cache[slide] = await ask(slide, slides[i + 1] || "");
    console.log(`slide ${slide}: ${cache[slide].length} entries`);
  } catch (err) {
    console.log(`slide ${slide}: FAILED ${String(err.message).slice(0, 80)}`);
    cache[slide] = [];
  }
  writeFileSync(CACHE, JSON.stringify(cache, null, 1), "utf8");
}

const rows = [];
for (const [slide, list] of Object.entries(cache)) {
  for (const r of list) {
    if (!(r.importance || "").trim()) continue;
    rows.push({ slide, ...r });
  }
}
const seen = new Set();
const unique = rows.filter((r) => {
  const k = (r.code || r.importance || "").slice(0, 60);
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const cols = ["slide", "code", "importance"];
const esc = (v) => {
  const s = String(v ?? "").replace(/\s+/g, " ");
  return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
writeFileSync(OUT, "﻿" + [cols.join(","),
  ...unique.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n"), "utf8");
console.log(`\nentries: ${rows.length}, unique: ${unique.length}`);
