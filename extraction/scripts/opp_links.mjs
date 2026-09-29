// Opportunity N sits on slide 555 + 2N — checked against six pages whose
// numbers are printed on them. Each page ends with the programme and the
// initiative it belongs to, written as loose digits because the deck sets
// the code in separate boxes: "0","4",".0","2" is 04.02.
import {readFileSync, writeFileSync} from 'node:fs';
const slides = JSON.parse(readFileSync('all_slides.json','utf8'));
const rows = [];
for (let n = 1; n <= 30; n++) {
  const runs = (slides[String(555 + 2*n)] || []).map((r)=>r.trim()).filter(Boolean);
  const at = runs.findIndex((r)=>/البرامج والمبادرات|ذات العلاقة/.test(r));
  const tail = at >= 0 ? runs.slice(at) : [];
  // Glue the loose digits back together and read every NN.NN in the tail.
  const glued = tail.join('');
  const codes = [...new Set((glued.match(/0[1-9]\s*\.?\s*0?[0-9]/g) || [])
    .map((c)=>c.replace(/[\s.]/g,''))
    .filter((c)=>c.length===4)
    .map((c)=>c.slice(0,2)+'.'+c.slice(2)))];
  const prog = tail.find((r)=>/^برنامج/.test(r)) ||
               tail[(tail.findIndex((r)=>r==='برنامج'))+1] || '';
  const title = (runs[1]||'').replace(/^\d+\s*\.?\s*/,'').trim();
  rows.push({n, title, prog: prog.replace(/^برنامج\s*/,''), codes: codes.join(' ')});
}
const esc=(v)=>(/[",\n]/.test(String(v))?'"'+String(v).replace(/"/g,'""')+'"':String(v));
writeFileSync('sheets/49_opportunity_links.csv','\ufeff'+['number,title,program,initiative_codes']
  .concat(rows.map((r)=>[r.n,esc(r.title),esc(r.prog),esc(r.codes)].join(','))).join('\n')+'\n');
for (const r of rows) console.log(String(r.n).padStart(2), (r.codes||'(none)').padEnd(14), r.title.slice(0,44));
console.log('\nwith an initiative code:', rows.filter((r)=>r.codes).length, 'of 30');
