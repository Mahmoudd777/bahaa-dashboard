# -*- coding: utf-8 -*-
"""Read the phasing back and check it against the figures it must agree with."""
Program = env["albaha.program"].sudo()

for program in Program.search([]):
    plans = program.plan_ids.sorted("year_no")
    spend = sum(plans.mapped("budget_planned_sar_m"))
    flag = "ok" if abs(spend - program.total_budget_sar_m) < 0.01 else "MISMATCH"
    print("CHK %-40s card %5.1f  phased %5.1f  %s" % (
        program.name, program.total_budget_sar_m, spend, flag))
    print("CHK     spend by year:  %s" % " ".join(
        "%.1f" % p.budget_planned_sar_m for p in plans))
    print("CHK     return, annual: %s" % " ".join(
        "%.1f" % p.return_annual_sar_m for p in plans))

gdp = env["albaha.kpi"].sudo().search([("name", "like", "الناتج المحلي")], limit=1)
actuals = gdp.value_ids.filtered(lambda v: v.actual_value).sorted("period")
print("CHK GDP actuals: %s" % ", ".join(
    "%s=%s" % (v.period, v.actual_value) for v in actuals))
