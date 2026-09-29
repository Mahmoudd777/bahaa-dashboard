# -*- coding: utf-8 -*-
"""How much of each initiative's narrative actually made it into the record."""
Initiative = env["albaha.initiative"].sudo()
fields_to_check = [
    "problem_statement", "contribution", "target_audience", "expected_impact",
    "outputs", "operational_kpis", "stakeholders", "regional_importance",
    "funder", "economy_color", "objective_id",
]
records = Initiative.search([], order="code")
print("FLD initiatives: %d" % len(records))
for name in fields_to_check:
    filled = len(records.filtered(lambda r, n=name: r[n]))
    print("FLD %-22s filled %2d/%d" % (name, filled, len(records)))
sample = records.filtered(lambda r: r.code == "04.05")[:1]
if sample:
    print("FLD 04.05 stakeholders: %r" % (sample.stakeholders or "")[:300])
    print("FLD 04.05 outputs: %r" % (sample.outputs or "")[:200])
