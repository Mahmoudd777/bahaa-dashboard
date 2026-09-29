# -*- coding: utf-8 -*-
"""Pin down the remaining gaps precisely before deciding what to do."""
Kpi = env["albaha.kpi"].sudo()
Value = env["albaha.kpi.value"].sudo()
print("== indicator periods with no target ==")
for record in Value.search([("target_value", "=", 0)]):
    print("G2 %-46s %s actual=%s" % (
        record.kpi_id.name[:46], record.period, record.actual_value))

print("== opportunities with no description ==")
for record in env["albaha.investment.opportunity"].sudo().search([]):
    if not record.description:
        print("G2 #%d %s (slides %s)" % (record.number, record.name[:44], record.source_reference))

print("== initiatives with no objective ==")
for record in env["albaha.initiative"].sudo().search([]):
    if not record.objective_id:
        print("G2 %s %s" % (record.code, record.name[:56]))

print("== sector indicators ==")
for record in env["albaha.sector.kpi"].sudo().search([]):
    print("G2 %-52s unit=%s value=%s" % (
        (record.name or "")[:52], record.unit or "-", record.value))

print("== decisions: distinct sources ==")
Decision = env["albaha.decision"].sudo()
kinds = {}
for record in Decision.search([]):
    kinds[record.decision_type or "-"] = kinds.get(record.decision_type or "-", 0) + 1
print("G2 decision types: %s" % kinds)
print("G2 sample: %s" % (Decision.search([], limit=1).name or "")[:80])
