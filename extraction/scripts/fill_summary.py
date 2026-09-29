# -*- coding: utf-8 -*-
"""Set each indicator's headline ambition, and one card's funder.

The dashboard falls back to `kpi.target_value` when a period carries no
target of its own, and that field was empty on all 24 — so the fallback had
nothing to fall back to. It is filled from the indicator's own final period,
which is the 2030 ambition the strategy states; for a quarterly indicator
that is its fourth quarter.

Nothing is invented: the value already exists on the period record, and the
indicators with no targets at all stay empty.
"""
import re

Kpi = env["albaha.kpi"].sudo()
Initiative = env["albaha.initiative"].sudo()

filled, skipped = 0, []
for record in Kpi.search([]):
    periods = record.value_ids.filtered(lambda v: v.target_value)
    if not periods:
        skipped.append(record.code)
        continue
    last = max(periods, key=lambda v: v.period)
    year = re.match(r"(\d{4})", last.period or "")
    if record.target_value:
        continue
    record.target_value = last.target_value
    if year:
        record.target_year = int(year.group(1))
    filled += 1

# 03.01's card states its funder twice, as owner and as funder; the reader
# took neither because the label and the value sit apart on that page.
initiative = Initiative.search([("code", "=", "03.01")], limit=1)
funder_written = False
if initiative and not initiative.funder:
    initiative.funder = "المكتب الاستراتيجي لتطوير منطقة الباحة"
    funder_written = True

env.cr.commit()
records = Kpi.search([])
print("SUMF headline targets filled: %d, now %d/%d" % (
    filled, len(records.filtered("target_value")), len(records)))
print("SUMF indicators with no target at all (unchanged): %s" % ", ".join(skipped))
print("SUMF 03.01 funder written: %s, initiatives with a funder: %d/%d" % (
    funder_written, len(Initiative.search([]).filtered("funder")),
    Initiative.search_count([])))
for record in records.filtered("target_value")[:4]:
    print("SUMF   %-42s %s by %s" % (
        record.name[:42], record.target_value, record.target_year))
