// Second pass. The first matched each run against whole stored values, so a
// sentence the deck splits across three text boxes counted as three misses.
// This one matches against the stored text as one corpus, by substring, which
// is how a split sentence actually has to be found.
import {readFileSync, writeFileSync} from 'node:fs';

const DECKS = {'01':'deck01.json','02':'deck02.json','03':'deck03.json',
               '04':'all_slides.json','05':'deck05.json','06':'deck06.json'};
const fold = (s) => (s||'')
  .replace(/[\u064B-\u0652\u0670\u0640]/g,'')
  .replace(/[\u0622\u0623\u0625]/g,'\u0627')
  .replace(/\u0649/g,'\u064A').replace(/\u0629/g,'\u0647')
  .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g,'')
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim().toLowerCase();

const corpus = ' ' + readFileSync('db_text.txt','utf8').split(/\r?\n/).map(fold).join(' | ') + ' ';

const CHROME = [
  /^[\d\s.,%٪\u0660-\u0669+()\/-]*$/, /^(q\s*\d|السنة)/i,
  /^فهرس|الإستراتيجي|^المقدمة|الرؤية والتوجهات|الخيارات الإستراتيجية|الرؤية المناطقية/,
  /مواءمة التوجهات|البيت الاستراتيجي|الأثر الكلي|^مؤشرات الأداء|^الملاحق|^المصدر|^المرجع|^الملحق/,
  /^بحث مكتبي|إستراتيجي إند|^غير شامل|^ملاحظ|^\(?\d\)|^تحليل/,
];
const EXCLUDED = [
  [/الخطة الإعلامية|خطة الإطلاق|المحتوى الإبداعي|خطة التواصل|الرسائل الإعلامية|مخطط المحتوى|تغريد|انفوجراف/, 'launch media plan'],
  [/ورش|الورشة|المشارك/, 'citizen workshops'],
  // The benchmark runs on two levels: the Saudi regions, and six international
  // case studies. Both are analysis; neither describes an Al-Baha record.
  [/عسير|جازان|المقارنة المعيارية|تنافسي|القرب الجغرافي/, 'benchmark: Saudi regions'],
  [/بوهيميا|التشيك|توسكانا|إيطاليا|ساكسونيا|ألمانيا|فيرمونت|أرديش|فرنسا|صلالة|عمان|سلافونيا|إيداهو|تينيسي|العين|ليبنو|أمريكا/, 'benchmark: international case studies'],
  [/سينما/, 'cinema projects'],
  [/المبادئ التوجيهية|مصفوفة التصعيد|الترتيبات التنظيمية|دورة حياة/, 'governance narrative'],
  [/العنقود|العناقيد|المخطط المكاني|النطاق العمراني/, 'spatial master plan'],
  [/الدروس المستفادة|الاستنتاجات|النتائج المحققة/, 'lessons drawn from the benchmark'],
];

const per={}; const orphans=[];
for (const [deck,file] of Object.entries(DECKS)) {
  const slides=JSON.parse(readFileSync(file,'utf8'));
  const p=per[deck]={runs:0,loaded:0,chrome:0,excluded:0,orphan:0};
  for (const [slide,runs] of Object.entries(slides)) {
    for (const raw of runs) {
      const run=(raw||'').trim(); if(!run) continue; p.runs++;
      const f=fold(run);
      if(!f||CHROME.some((r)=>r.test(run))){p.chrome++;continue;}
      // Short fragments are matched whole; longer prose is matched on its
      // opening clause, because a deck often trims a sentence's tail.
      const probe = f.length>70 ? f.split(' ').slice(0,8).join(' ') : f;
      if (corpus.includes(' '+probe) || corpus.includes(probe+' ')) {p.loaded++;continue;}
      const ex=EXCLUDED.find(([r])=>r.test(run));
      if(ex){p.excluded++;continue;}
      p.orphan++; orphans.push({deck,slide,run});
    }
  }
}
let T={runs:0,loaded:0,chrome:0,excluded:0,orphan:0};
console.log('deck   runs  loaded  chrome  excluded  UNACCOUNTED');
for(const [d,p] of Object.entries(per)){
  for(const k of Object.keys(T))T[k]+=p[k];
  console.log(`  ${d}  ${String(p.runs).padStart(5)}  ${String(p.loaded).padStart(6)}  ${String(p.chrome).padStart(6)}  ${String(p.excluded).padStart(8)}  ${String(p.orphan).padStart(11)}`);
}
console.log(`TOTAL  ${T.runs}  ${T.loaded}  ${T.chrome}  ${T.excluded}  ${T.orphan}`);
console.log(`accounted for: ${(100*(T.runs-T.orphan)/T.runs).toFixed(2)}%`);
writeFileSync('orphans2.txt',orphans.map((o)=>`${o.deck}/${o.slide}\t${o.run}`).join('\n'),'utf8');
console.log('leftovers >40 chars:',orphans.filter((o)=>o.run.length>40).length);
