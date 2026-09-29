# -*- coding: utf-8 -*-
"""Correct the capital/operational split and mark the zero-budget initiatives.

The programmes deck gives each initiative's total and says which ten draw
nothing from the strategy budget; the cards give the split between capital and
operational. Three checks have to hold afterwards: every initiative's split
must equal its own total, the totals must add to a hundred million, and the
split must come to 12 capital against 88 operational.
"""
import csv

Initiative = env["albaha.initiative"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


splits = {r["code"]: r for r in rows_of("/tmp/31_budget_split.csv")}
flags = {r["code"]: r for r in rows_of("/tmp/30_initiative_budgets.csv")}

corrected, marked = [], []
for record in Initiative.search([], order="code"):
    code = (record.code or "").strip()
    values = {}

    split = splits.get(code)
    if split:
        capital = float(split["capital_sar_m"])
        operational = float(split["operational_sar_m"])
        total = float(split["total_sar_m"])
        if abs(record.budget_capital_sar_m - capital) > 0.01 or \
           abs(record.budget_operational_sar_m - operational) > 0.01:
            corrected.append("%s capital %.1f->%.1f, operational %.1f->%.1f" % (
                code, record.budget_capital_sar_m, capital,
                record.budget_operational_sar_m, operational))
            values["budget_capital_sar_m"] = capital
            values["budget_operational_sar_m"] = operational
        if abs(record.budget_total_sar_m - total) > 0.01:
            corrected.append("%s total %.1f->%.1f" % (
                code, record.budget_total_sar_m, total))
            values["budget_total_sar_m"] = total

    flag = flags.get(code)
    if flag and flag.get("zero_budget") == "yes" and not record.zero_budget:
        values["zero_budget"] = True
        marked.append(code)

    if values:
        record.write(values)

env.cr.commit()

records = Initiative.search([])
print("SPL corrections:")
for line in corrected:
    print("SPL   %s" % line)
print("SPL marked zero-budget: %s" % (", ".join(marked) or "none"))
print("SPL total %.1f = capital %.1f + operational %.1f" % (
    sum(records.mapped("budget_total_sar_m")),
    sum(records.mapped("budget_capital_sar_m")),
    sum(records.mapped("budget_operational_sar_m"))))
mismatched = records.filtered(lambda r: abs(
    r.budget_capital_sar_m + r.budget_operational_sar_m - r.budget_total_sar_m) > 0.01)
print("SPL initiatives whose split does not equal their total: %s"
      % (", ".join(mismatched.mapped("code")) or "none"))
print("SPL zero-budget flagged: %d, budget-bearing: %d" % (
    len(records.filtered("zero_budget")),
    len(records.filtered(lambda r: r.budget_total_sar_m > 0))))
