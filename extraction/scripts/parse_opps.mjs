// The feasibility studies sit in the appendix of the detailed document, two
// slides per opportunity: an overview page and a financial page immediately
// after it. Nothing indexes them and no table holds their figures.
//
// Pairing is by that adjacency rather than by reading a number off each slide:
// three of the financial pages carry no title at all, and several titles are
// split across runs ("7." / "مركز الباحة الشتوي" / "الداخلي").
//
// Within a slide, labels and values are separate runs in z-order, not reading
// order. The impact block is stable: its two first labels are followed by
// their two values in the same order, then each label is followed by its own.
import {readFileSync, writeFileSync} from 'node:fs';

const slides = JSON.parse(readFileSync('opp_slides.json', 'utf8'));
const HEADINGS = ['نظرة عامة', 'الأثر الاقتصادي', 'صورة توضيحية', 'المؤشرات المالية', 'الأصول التابعة'];

// Reads "12. اسم", "12" + ". اسم", or "7." + "اسم" + "تكملة".
function titleOf(runs) {
  for (let i = 0; i < Math.min(runs.length, 4); i++) {
    let no = null, name = null, last = i;
    const whole = runs[i].match(/^\.?(\d{1,2})\s*\.?\s*([\u0600-\u06FF].{2,70})$/);
    if (whole) { no = +whole[1]; name = whole[2]; }
    else if (/^\.?\d{1,2}\.?$/.test(runs[i])) {
      no = parseInt(runs[i].replace(/\./g, ''), 10);
      for (let j = i + 1; j < Math.min(runs.length, i + 3); j++) {
        const m = runs[j].match(/^\.?\s*([\u0600-\u06FF].{2,70})$/);
        if (m) { name = m[1]; last = j; break; }
      }
    }
    if (no === null || !name || no < 1 || no > 40) continue;
    // A name can spill over several runs, so short Arabic runs keep being
    // taken until a heading ends the title.
    for (let j = last + 1; j < runs.length; j++) {
      const tail = runs[j];
      if (!/^[؀-ۿ]/.test(tail) || tail.length > 25) break;
      if (HEADINGS.some((h) => tail.includes(h))) break;
      name += " " + tail;
    }
    return {no, name: name.replace(/\s+/g, ' ').trim()};
  }
  return null;
}

const num = (s) => {
  if (s === undefined || s === null) return null;
  const t = String(s).replace(/,/g, '').replace(/٬/g, '').replace('%', '').trim();
  return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
};
const idx = (runs, needle) => runs.findIndex((r) => r.includes(needle));

function after(runs, needle, span = 6) {
  const at = idx(runs, needle);
  if (at < 0) return null;
  for (let i = at + 1; i < Math.min(runs.length, at + 1 + span); i++) {
    const v = num(runs[i]);
    if (v !== null) return v;
  }
  return null;
}

const list = [];
for (const [key, runs] of Object.entries(slides)) {
  if (!runs.some((r) => r.includes('نظرة عامة'))) continue;
  const t = titleOf(runs);
  if (!t) { console.log('! no title on overview slide', key); continue; }

  const rec = {no: t.no, name: t.name, slide_overview: +key};
  const at = idx(runs, 'نظرة عامة');
  if (at >= 0 && runs[at + 1] && runs[at + 1].length > 25) rec.description = runs[at + 1];
  // The "related programmes and initiatives" box is laid out differently on
  // almost every page: the programme name is sometimes one run, sometimes
  // split ("برنامج" / "الارتقاء بجودة" / "الحياة"), and a code can arrive as
  // "04.0" + "2". Matching against the joined slide text avoids chasing each
  // layout.
  const PROGRAMS = [
    ["الباحة 365", "برنامج الباحة 365"],
    ["خيرات", "برنامج خيرات الباحة"],
    ["وارث الباحة", "برنامج هوية الباحة وإحياء التراث"],
    ["هوية الباحة", "برنامج هوية الباحة وإحياء التراث"],
    ["إحياء التراث", "برنامج هوية الباحة وإحياء التراث"],
    ["جودة الحياة", "برنامج الارتقاء بجودة الحياة"],
    ["الاستثمارات", "برنامج تمكين الاستثمارات"],
  ];
  const spaced = runs.join(' ').replace(/\s+/g, ' ');
  const hit = PROGRAMS.find(([needle]) => spaced.includes(needle));
  if (hit) rec.program = hit[1];
  // An initiative code is "04.02", but a page may split it as "04.0" + "2".
  let code = null;
  for (let i = 0; i < runs.length && !code; i++) {
    if (/^\d{2}\.\d{2}$/.test(runs[i])) code = runs[i];
    else if (/^\d{2}\.\d$/.test(runs[i]) && /^\d$/.test(runs[i + 1] || '')) {
      code = runs[i] + runs[i + 1];
    }
  }
  if (code) rec.initiative_code = code;

  const fin = slides[String(+key + 1)];
  if (fin && fin.some((r) => r.includes('الأثر الاقتصادي والاجتماعي'))) {
    rec.slide_financial = +key + 1;
    const vAt = idx(fin, 'الزوار (ألف زائر)');
    if (vAt >= 0) {           // fin[vAt+1] is the direct-jobs label
      rec.visitors_k = num(fin[vAt + 2]);
      rec.jobs_direct = num(fin[vAt + 3]);
    }
    rec.gdp_contribution_sar_m = after(fin, 'مساهمة الناتج المحلي');
    rec.jobs_indirect = after(fin, 'التوظيف الغير مباشر');
    rec.npv_sar_m = after(fin, 'القيمة الصافية الحالية', 8);
    rec.payback_years = after(fin, 'فترة الاسترداد');
    const irrAt = idx(fin, 'معدل العائد الداخلي');
    if (irrAt >= 0) {
      const window = fin.slice(irrAt, irrAt + 8);
      const joined = window.find((r) => /^\d+(\.\d+)?\s*%$/.test(r));
      rec.irr_pct = joined ? parseFloat(joined)
        : (window.map(num).find((v) => v !== null && v > 0 && v < 100) ?? null);
    }
    // Revenue is plotted against a descending run of year labels, which is
    // 2028-2032 on most pages and 2027-2032 on one, followed by one value per
    // year in the same order. Pages that write the years as a single run
    // carry no series and are left empty.
    const y = fin.findIndex((r, i) => r === "2032" && fin[i + 1] === "2031");
    if (y >= 0) {
      let span = 0;
      while (fin[y + span] === String(2032 - span)) span++;
      const vals = fin.slice(y + span, y + span + span).map(num);
      if (vals.every((v) => v !== null && (v < 1900 || v > 2100))) {
        vals.forEach((v, k) => { rec[`revenue_${2032 - k}`] = v; });
      }
    }
  }
  list.push(rec);
}

list.sort((a, b) => a.no - b.no);
writeFileSync('opps.json', JSON.stringify(list, null, 1));

const have = (f) => list.filter((o) => o[f] !== null && o[f] !== undefined).length;
console.log('opportunities:', list.length,
  '| numbers:', list.map((o) => o.no).join(','));
console.log('with jobs_direct:', have('jobs_direct'), ' npv:', have('npv_sar_m'),
  ' irr:', have('irr_pct'), ' revenue 2030:', have('revenue_2030'),
  ' programme:', have('program'));
for (const o of list) {
  console.log(`${String(o.no).padStart(2)} ${(o.name || '').slice(0, 30).padEnd(32)} vis ${String(o.visitors_k ?? '-').padStart(5)}  jobs ${String(o.jobs_direct ?? '-').padStart(5)}/${String(o.jobs_indirect ?? '-').padStart(5)}  gdp ${String(o.gdp_contribution_sar_m ?? '-').padStart(6)}  npv ${String(o.npv_sar_m ?? '-').padStart(6)}  irr ${String(o.irr_pct ?? '-').padStart(5)}  pay ${String(o.payback_years ?? '-').padStart(4)}`);
}
