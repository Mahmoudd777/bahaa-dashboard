# -*- coding: utf-8 -*-
"""Do the milestone budgets still add up to their initiative's budget?

Worth re-running now the initiative budgets have been corrected: a
reconciliation that failed before may have been failing on the wrong number.
"""
Initiative = env["albaha.initiative"].sudo()
Milestone = env["albaha.milestone"].sudo()

for record in Initiative.search([], order="code"):
    leaves = Milestone.search([("initiative_id", "=", record.id)])
    total = sum(m.budget_capital_sar + m.budget_operational_sar for m in leaves)
    # Milestone budgets are in riyals; initiative budgets in millions.
    total_m = total / 1_000_000.0 if total > 1000 else total
    flag = ""
    if record.budget_total_sar_m:
        diff = abs(total_m - record.budget_total_sar_m)
        flag = "ok" if diff < 0.05 else ("no milestone budgets" if total_m == 0
                                         else "DIFF %.2f" % diff)
    elif record.zero_budget:
        flag = "zero-budget" + (" but milestones total %.2f" % total_m if total_m else "")
    print("MS %-6s milestones %3d  initiative %6.1f  milestones %8.2f  %s" % (
        record.code, len(leaves), record.budget_total_sar_m, total_m, flag))
