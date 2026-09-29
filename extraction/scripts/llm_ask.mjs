// Ask the local model one question about one extracted-slides file.
//   node llm_ask.mjs <text file> <prompt file> <out json> [maxChars]
import { readFileSync, writeFileSync } from "fs";

const [, , SRC, PROMPT, OUT, MAX = "60000"] = process.argv;
const URL = "http://127.0.0.1:8080/v1/chat/completions";
const KEY = process.env.LLM_KEY || "A3ACZDwnLdEVwU6muZIeO3U5A2uyBfZv";

const text = readFileSync(SRC, "utf8").replace(/^﻿/, "").replace(/\r/g, "").slice(0, +MAX);
const instruction = readFileSync(PROMPT, "utf8");

const r = await fetch(URL, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
  body: JSON.stringify({
    model: "qwen3.6-35b-a3b",
    chat_template_kwargs: { enable_thinking: false },
    temperature: 0,
    max_tokens: 6000,
    messages: [
      { role: "system", content: "أنت مستخرج بيانات دقيق. أعد JSON فقط بدون شرح. لا تخترع أي قيمة غير موجودة في النص؛ اترك الحقل \"\" إذا لم تجده." },
      { role: "user", content: `${instruction}\n\n--- النص ---\n${text}` },
    ],
  }),
});
const j = await r.json();
const raw = (j.choices?.[0]?.message?.content || "").trim();
const s = raw.search(/[[{]/), e = Math.max(raw.lastIndexOf("]"), raw.lastIndexOf("}"));
if (s < 0 || e < 0) {
  console.error("no JSON returned:", raw.slice(0, 300));
  process.exit(1);
}
const data = JSON.parse(raw.slice(s, e + 1));
writeFileSync(OUT, JSON.stringify(data, null, 1), "utf8");
console.log(`tokens: ${j.usage?.prompt_tokens} in / ${j.usage?.completion_tokens} out`);
console.log(JSON.stringify(data, null, 1).slice(0, 1500));
