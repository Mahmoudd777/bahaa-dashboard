// Hand each initiative's slide text to the local model and ask for fields.
// The slide text arrives in PowerPoint z-order, so labels and values are
// interleaved out of reading order — that is what defeats a plain parser and
// what a model is actually good at.
import { readFileSync, writeFileSync, existsSync } from "fs";

const [, , SRC, OUT] = process.argv;
const URL = "http://127.0.0.1:8080/v1/chat/completions";
const KEY = process.env.LLM_KEY || "A3ACZDwnLdEVwU6muZIeO3U5A2uyBfZv";
const CACHE = OUT + ".cache.json";

const FIELDS = `{
  "code": "رقم المبادرة مثل 01.01",
  "name": "اسم المبادرة",
  "owner": "مالك المبادرة",
  "funder": "الجهة الممولة",
  "pillar": "الركيزة",
  "economy_color": "لون الاقتصاد",
  "objective": "الهدف الاستراتيجي المرتبط",
  "start_date": "تاريخ البداية بصيغة DD/MM/YYYY",
  "end_date": "تاريخ النهاية بصيغة DD/MM/YYYY",
  "budget_capital": "الموازنة الرأسمالية كرقم فقط بالريال",
  "budget_operational": "الموازنة التشغيلية كرقم فقط بالريال",
  "budget_total": "الموازنة الإجمالية كرقم فقط بالريال",
  "projects_count": "عدد مشاريع ومعالم المبادرة كرقم",
  "description": "وصف المبادرة",
  "problem": "المشكلة أو التحدي",
  "impact": "الأثر المتوقع",
  "outputs": "مخرجات المبادرة مفصولة بـ ؛",
  "operational_kpis": "المؤشرات التشغيلية مفصولة بـ ؛",
  "stakeholders": "أصحاب المصلحة مفصولة بـ ؛"
}`;

const SYS = `أنت مستخرج بيانات. تُعطى نصًا مبعثرًا من شرائح عرض عن مبادرة واحدة.
أعد كائن JSON واحدًا فقط بهذه المفاتيح، بدون أي شرح:
${FIELDS}
قواعد صارمة:
- لا تخترع أي قيمة. إذا لم تجد القيمة في النص اكتب "".
- الأرقام المالية: حوّل "12 مليون" إلى 12000000 و"600,000" إلى 600000.
- لا تختصر الوصف، انقله كما هو.`;

const slides = readFileSync(SRC, "utf8").replace(/^﻿/, "").replace(/\r/g, "")
  .split(/^=== SLIDE (\d+) ===$/m);

// group slide bodies by initiative code
const byCode = new Map();
for (let i = 1; i < slides.length; i += 2) {
  const body = slides[i + 1] || "";
  const m = body.match(/(\d{2}\.\d{2})\s*~\s*رقم المبادرة/);
  if (!m) continue;
  const code = m[1];
  byCode.set(code, (byCode.get(code) || "") + "\n" + body);
}

const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : {};

async function ask(code, text) {
  const body = {
    model: "qwen3.6-35b-a3b",
    chat_template_kwargs: { enable_thinking: false },
    temperature: 0,
    max_tokens: 2000,
    messages: [
      { role: "system", content: SYS },
      { role: "user", content: `رقم المبادرة: ${code}\n\n${text.slice(0, 14000)}` },
    ],
  };
  const r = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  const raw = (j.choices?.[0]?.message?.content || "").trim();
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s < 0 || e < 0) throw new Error("no JSON: " + raw.slice(0, 120));
  return JSON.parse(raw.slice(s, e + 1));
}

const codes = [...byCode.keys()].sort();
for (const code of codes) {
  if (cache[code]) continue;
  const t0 = Date.now();
  try {
    cache[code] = await ask(code, byCode.get(code));
    console.log(`${code} ok (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  } catch (err) {
    console.log(`${code} FAILED: ${err.message}`);
    cache[code] = { code, error: String(err.message).slice(0, 120) };
  }
  writeFileSync(CACHE, JSON.stringify(cache, null, 1), "utf8");
}

const cols = ["code", "name", "owner", "funder", "pillar", "economy_color", "objective",
  "start_date", "end_date", "budget_capital", "budget_operational", "budget_total",
  "projects_count", "description", "problem", "impact", "outputs", "operational_kpis", "stakeholders"];
const rows = codes.map((c) => cache[c] || { code: c });
const tsv = "﻿" + [cols.join("\t"),
  ...rows.map((r) => cols.map((k) => String(r[k] ?? "").replace(/[\t\n]/g, " ")).join("\t"))].join("\n");
writeFileSync(OUT, tsv, "utf8");

console.log(`\ninitiatives: ${rows.length}`);
for (const k of ["owner", "funder", "pillar", "objective", "start_date", "budget_total", "projects_count"]) {
  console.log(`  missing ${k}: ${rows.filter((r) => !r[k]).length}`);
}
