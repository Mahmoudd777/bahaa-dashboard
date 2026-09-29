import {readFileSync, writeFileSync} from 'node:fs';
const p = 'import_kpi_cards.py';
let s = readFileSync(p, 'utf8');
const old = s.slice(s.indexOf('        if (row.get("cumulative_in_year")'),
                    s.indexOf('        want = FREQUENCY.get'));
const fresh = [
  '        # Both cumulation flags are selections, not booleans: an empty one',
  '        # means nobody recorded the rule, which is not the same as "no".',
  '        for field, column in (("cumulative_in_year", "cumulative_in_year"),',
  '                              ("cumulative_annual", "cumulative_annual")):',
  '            written = CUMULATION.get((row.get(column) or "").strip())',
  '            if not written:',
  '                continue',
  '            if not record[field]:',
  '                values[field] = written',
  '                counts[field] += 1',
  '            elif record[field] != written:',
  '                disagreements.append("%s %s %s vs card %s" % (',
  '                    record.code, field, record[field], written))',
  '',
].join('\n');
s = s.replace(old, fresh);
s = s.replace('FREQUENCY = {"سنوي": "annual", "ربع سنوي": "quarterly", "نصف سنوي": "semiannual"}',
  'FREQUENCY = {"سنوي": "annual", "ربع سنوي": "quarterly", "نصف سنوي": "semiannual"}\nCUMULATION = {"تراكمي": "cumulative", "غير تراكمي": "non_cumulative"}');
s = s.replace('formulas = cumulative_in = cumulative_annual = 0',
  'formulas = 0\ncounts = {"cumulative_in_year": 0, "cumulative_annual": 0}');
s = s.replace(`print("KPC cumulative-in-year set: %d, now %d/%d" % (
    cumulative_in, len(records.filtered("cumulative_in_year")), len(records)))
print("KPC cumulative-annual set: %d, now %d/%d" % (
    cumulative_annual, len(records.filtered("cumulative_annual")), len(records)))`,
  `for field in ("cumulative_in_year", "cumulative_annual"):
    print("KPC %-20s written %2d, now %2d/%d recorded" % (
        field, counts[field], len(records.filtered(field)), len(records)))`);
writeFileSync(p, s);
console.log('ok');
