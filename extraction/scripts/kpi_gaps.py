# -*- coding: utf-8 -*-
"""Which indicators have no yearly targets at all."""
Kpi = env["albaha.kpi"].sudo()
Value = env["albaha.kpi.value"].sudo()
for record in Kpi.search([], order="code"):
    periods = Value.search_count([("kpi_id", "=", record.id),
                                  ("target_value", ">", 0)])
    if not periods:
        print("GAP %-8s %s" % (record.code, (record.name or "")[:66]))
print("GAP indicators without any target: %d of %d" % (
    len([k for k in Kpi.search([]) if not Value.search_count(
        [("kpi_id", "=", k.id), ("target_value", ">", 0)])]), Kpi.search_count([])))
