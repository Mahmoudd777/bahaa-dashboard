# -*- coding: utf-8 -*-
"""What is on prod after the second review pass."""
counts = [
    ("Pillars", "albaha.pillar"), ("Objectives", "albaha.objective"),
    ("Programmes", "albaha.program"), ("Programme plan rows", "albaha.program.plan"),
    ("Indicators", "albaha.kpi"), ("Indicator periods", "albaha.kpi.value"),
    ("Initiatives", "albaha.initiative"), ("Milestones", "albaha.milestone"),
    ("Projects", "albaha.project"), ("Investment opportunities", "albaha.investment.opportunity"),
    ("Challenges", "albaha.challenge"), ("Operational risks", "albaha.risk"),
    ("Portfolios", "albaha.portfolio"),
]
for label, model in counts:
    try:
        print("SUM %-26s %d" % (label, env[model].sudo().search_count([])))
    except KeyError:
        print("SUM %-26s (no such model)" % label)

Initiative = env["albaha.initiative"].sudo()
records = Initiative.search([])
narrative = ["problem_statement", "contribution", "target_audience",
             "expected_impact", "outputs", "operational_kpis", "stakeholders"]
gaps = [f for f in narrative if len(records.filtered(f)) < len(records)]
print("SUM narrative fields below full: %s" % (gaps or "none"))
actuals = env["albaha.kpi.value"].sudo().search_count([("actual_value", ">", 0)])
print("SUM indicator periods carrying an actual: %d" % actuals)
