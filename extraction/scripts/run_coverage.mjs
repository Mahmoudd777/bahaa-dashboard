// The coverage check that settles the question: not "did a sweep run", but
// "is every run of text in the six decks accounted for". A run is accounted
// for when it is loaded, when it is chrome the deck repeats on every page, or
// when it belongs to a section this project stated a reason for leaving.
// Whatever is left over is printed. The leftover count is the answer.
import {readFileSync, writeFileSync} from 'node:fs';

const DECKS = {'01':'deck01.json','02':'deck02.json','03':'deck03.json',
               '04':'all_slides.json','05':'deck05.json','06':'deck06.json'};

// Arabic is written with and without diacritics, with different alef forms and
// with tatweel. Two runs that differ only in those ways are the same text.
const fold = (s) => (s||'')
  .replace(/[\u064B-\u0652\u0670\u0640]/g,'')
  .replace(/[\u0622\u0623\u0625]/g,'\u0627')
  .replace(/\u0649/g,'\u064A').replace(/\u0629/g,'\u0647')
  .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g,'')
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();

const db = new Set();
for (const line of readFileSync('db_text.txt','utf8').split(/\r?\n/)) {
  const f = fold(line);
  if (f) { db.add(f); for (const w of f.split(' ')) if (w.length > 3) db.add(w); }
}

// Chrome: the navigation strip, the contents page and the section headers are
// reprinted on hundreds of pages. They are the deck's furniture, not its data.
const CHROME = [
  /^\d+([.,]\d+)?%?$/, /^[\d\s.,%٪-]+$/, /^(q\s*\d|السنة)/i,
  /فهرس|الإستراتيجي|المقدمة|الرؤية والتوجهات|الخيارات الإستراتيجية|الرؤية المناطقية/,
  /مواءمة التوجهات|البيت الاستراتيجي|الأثر الكلي|مؤشرات الأداء|الملاحق|المصدر|المرجع/,
  /^(م|#|أ|ب|ج|د|ه|و|ز)$/, /^[a-zA-Z\s.,%-]{0,3}$/,
];
// Sections this project stated a reason for not loading. CLIENT_DATA.md holds
// the reason for each; this list only has to recognise them.
const EXCLUDED = [
  [/الخطة الإعلامية|خطة الإطلاق|المحتوى الإبداعي|خطة التواصل|الرسائل الإعلامية|مخطط المحتوى/, 'launch media plan'],
  [/ورش|الورشة|المشاركون|المشاركين/, 'citizen workshops'],
  [/عسير|جازان|المقارنة المعيارية|تنافسية|القرب الجغرافي/, 'benchmarking'],
  [/سينما|السينما/, 'cinema projects'],
  [/المبادئ التوجيهية|مصفوفة التصعيد|الترتيبات التنظيمية|دورة حياة/, 'governance narrative'],
  [/العنقود|العناقيد|المخطط المكاني|النطاق العمراني/, 'spatial master plan'],
];

const per = {}; const orphans = [];
for (const [deck, file] of Object.entries(DECKS)) {
  const slides = JSON.parse(readFileSync(file,'utf8'));
  const p = per[deck] = {runs:0, loaded:0, chrome:0, excluded:0, orphan:0};
  for (const [slide, runs] of Object.entries(slides)) {
    for (const raw of runs) {
      const run = (raw||'').trim();
      if (!run) continue;
      p.runs++;
      const f = fold(run);
      if (!f || CHROME.some((r)=>r.test(run))) { p.chrome++; continue; }
      // Loaded when the run is a stored value, is contained in one, or when
      // every one of its content words appears in stored text.
      const words = f.split(' ').filter((w)=>w.length>3);
      if (db.has(f) || (words.length && words.every((w)=>db.has(w)))) { p.loaded++; continue; }
      const ex = EXCLUDED.find(([r])=>r.test(run));
      if (ex) { p.excluded++; continue; }
      p.orphan++; orphans.push({deck, slide, run});
    }
  }
}

let T={runs:0,loaded:0,chrome:0,excluded:0,orphan:0};
console.log('deck   runs  loaded  chrome  excluded  UNACCOUNTED');
for (const [d,p] of Object.entries(per)) {
  for (const k of Object.keys(T)) T[k]+=p[k];
  console.log(`  ${d}  ${String(p.runs).padStart(5)}  ${String(p.loaded).padStart(6)}  ${String(p.chrome).padStart(6)}  ${String(p.excluded).padStart(8)}  ${String(p.orphan).padStart(11)}`);
}
console.log(`TOTAL  ${T.runs}  ${T.loaded}  ${T.chrome}  ${T.excluded}  ${T.orphan}`);
console.log(`\naccounted for: ${(100*(T.runs-T.orphan)/T.runs).toFixed(2)}%`);
writeFileSync('orphans.txt', orphans.map((o)=>`${o.deck}/${o.slide}\t${o.run}`).join('\n'),'utf8');
// The longest leftovers first: a long run of prose is where real content hides.
const long = orphans.filter((o)=>o.run.length>40).sort((a,b)=>b.run.length-a.run.length);
console.log(`leftovers longer than 40 chars: ${long.length}`);
