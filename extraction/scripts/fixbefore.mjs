import {readFileSync, writeFileSync} from 'node:fs';
const p = 'parse_kpi_cards.mjs';
const lines = readFileSync(p, 'utf8').split('\n');
const a = lines.findIndex((l) => l.includes('const before = (runs, label)'));
const b = lines.findIndex((l, i) => i > a && l.trim() === '};');
const repl = [
  '// A formula can run over several boxes ("… =" / "a ÷ b" / "× 100"), so the',
  '// runs before its label are joined until another label is reached.',
  'const LABELS = ["المستهدفات", "المؤشر", "مالك المؤشر", "وصف المؤشر",',
  '                "دورية القياس", "قطبية المؤشر", "وحدة القياس", "مصدر البيانات",',
  '                "الهدف الاستراتيجي", "خط الأساس", "سنة خط الأساس", "المستهدف"];',
  'const before = (runs, label) => {',
  '  const at = runs.indexOf(label);',
  '  if (at < 1) return "";',
  '  const parts = [];',
  '  for (let i = at - 1; i >= 0 && parts.length < 6; i--) {',
  '    const run = (runs[i] || "").trim();',
  '    if (!run) continue;',
  '    if (LABELS.includes(run) || run.startsWith("التراكمية")) break;',
  '    parts.unshift(run);',
  '    if (/=/.test(run)) break;   // the head of the formula',
  '  }',
  '  return parts.join(" ").replace(/\s+/g, " ").trim();',
  '};',
];
lines.splice(a, b - a + 1, ...repl);
writeFileSync(p, lines.join('\n'));
console.log('ok');
