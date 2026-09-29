// Slide 146 sets the strategic risks against the steps that answer them,
// grouped by pillar. Each mitigation arrives as a bold head followed by its
// continuation, and each risk as a number followed by its text.
import {readFileSync, writeFileSync} from 'node:fs';
const runs = JSON.parse(readFileSync('all_slides.json', 'utf8'))['146'];

const PILLARS = ['السياحة', 'الزراعة والصناعات المرتبطة', 'الممكنات – هوية الباحة',
                 'الممكنات – المجتمع المحلي', 'الممكنات – المنظومة التمكينية'];
const CLEAN = {
  'الممكنات – هوية الباحة': 'هوية الباحة',
  'الممكنات – المجتمع المحلي': 'المجتمع المحلي',
  'الممكنات – المنظومة التمكينية': 'المنظومة التمكينية',
};

// Find where each pillar block starts.
const starts = [];
runs.forEach((run, i) => { if (PILLARS.includes(run.trim())) starts.push([i, run.trim()]); });

const blocks = [];
starts.forEach(([at, pillar], k) => {
  const end = k + 1 < starts.length ? starts[k + 1][0] : runs.length;
  const slice = runs.slice(at + 1, end);
  const mitigations = [], risks = [];
  for (let i = 0; i < slice.length; i++) {
    const run = slice[i].trim();
    if (/^\d{1,2}$/.test(run)) {
      const text = (slice[i + 1] || '').trim();
      if (text.length > 20) { risks.push({number: +run, text}); i++; }
      continue;
    }
    if (run.length < 12) continue;
    // A step and the clause that finishes it are separate runs; the clause
    // starts with a connective or a bracket rather than a new verb.
    const next = (slice[i + 1] || '').trim();
    if (next && /^[وبمأل(]|^مع\b|^بالتعاون|^وتصميم|^واستقطاب/.test(next) && !/^\d/.test(next)) {
      mitigations.push(run + ' ' + next);
      i++;
    } else {
      mitigations.push(run);
    }
  }
  blocks.push({pillar: CLEAN[pillar] || pillar, mitigations, risks});
});

const rows = [];
for (const block of blocks) {
  const oneToOne = block.mitigations.length === block.risks.length;
  block.risks.forEach((risk, i) => {
    rows.push({
      number: risk.number,
      pillar: block.pillar,
      risk: risk.text,
      mitigation: oneToOne ? block.mitigations[i] : block.mitigations.join(' ; '),
      join: oneToOne ? 'one-to-one' : 'pillar block',
    });
  });
  console.log(block.pillar.padEnd(28), 'risks', block.risks.length,
    '| mitigations', block.mitigations.length, oneToOne ? '-> paired' : '-> pillar block');
}

const esc = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
writeFileSync('sheets/41_strategic_risk_mitigation.csv',
  '\ufeff' + ['number,pillar,risk,mitigation,join'].concat(
    rows.map((r) => ['number', 'pillar', 'risk', 'mitigation', 'join'].map((c) => esc(r[c])).join(','))).join('\n') + '\n');
console.log('rows:', rows.length);
