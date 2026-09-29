# -*- coding: utf-8 -*-
"""What each initiative's budget currently says."""
Initiative = env["albaha.initiative"].sudo()
records = Initiative.search([], order="code")
total = 0.0
for record in records:
    total += record.budget_total_sar_m
    print("BUD %s  total %6.1f  capital %5.1f  operational %5.1f  program %s" % (
        record.code, record.budget_total_sar_m, record.budget_capital_sar_m,
        record.budget_operational_sar_m, (record.program_id.name or "-")[:26]))
print("BUD sum of initiative budgets: %.1f (strategy budget is 100)" % total)
print("BUD initiatives with a zero budget: %d" % len(
    records.filtered(lambda r: not r.budget_total_sar_m)))
