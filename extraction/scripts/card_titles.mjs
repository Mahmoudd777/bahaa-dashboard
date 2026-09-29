// On every initiative card the title sits immediately before the page marker
// "(3/1)". Reading it from that fixed position avoids mistaking one of the
// initiative's own projects, listed lower down the card, for its name.
import {readFileSync, writeFileSync} from 'node:fs';
const slides = JSON.parse(readFileSync('deck06.json', 'utf8'));

const titles = new Map();
for (const [key, runs] of Object.entries(slides)) {
  const marker = runs.findIndex((r) => /^\(\d+\/1\)$/.test(r));
  if (marker < 1) continue;
  let code = runs.find((r) => /^0[1-9]\.[0-9]{2}$/.test(r));
  if (!code) {
    const at = runs.findIndex((r, i) => /^0[1-9]\.[0-9]$/.test(r) && /^[0-9]$/.test(runs[i + 1] || ''));
    if (at >= 0) code = runs[at] + runs[at + 1];
  }
  // A long title is split over two or three runs, so fragments before the
  // marker are joined until a card label is reached.
  const LABELS = ["الجهة الممولة", "مالك المبادرة", "رقم المبادرة", "الوصف",
                  "لون الاقتصاد", "الارتباط الاستراتيجي", "الموازنة التقديرية"];
  const parts = [];
  for (let j = marker - 1; j >= 0 && parts.length < 3; j--) {
    const run = runs[j];
    if (!/^[؀-ۿ(]/.test(run)) break;
    if (LABELS.some((l) => run === l) || run.includes("المكتب الاستراتيجي")) break;
    if (run.length > 160) break;
    parts.unshift(run);
    if (parts.join(" ").length > 55 && /منطقة الباحة|الخاص|الربحي/.test(parts[0])) break;
  }
  const title = parts.join(" ").replace(/s+/g, " ").trim();
  if (!code || !title || title.length < 15) continue;
  titles.set(code, {code, title, slide: +key});
}

const out = [...titles.values()].sort((a, b) => a.code.localeCompare(b.code));
writeFileSync('sheets/28_initiative_titles.csv',
  '\ufeff' + ['code,name,slide'].concat(out.map((r) =>
    `${r.code},"${r.title.replace(/"/g, '""')}",${r.slide}`)).join('\n') + '\n');
console.log('titles:', out.length);
for (const r of out) console.log(r.code, '|', r.title);
