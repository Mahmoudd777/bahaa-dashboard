# -*- coding: utf-8 -*-
"""Give the pillar-level indicators the codes the strategy refers to them by.

The strategic house deck labels each one K<objective>.<n>. The codes were
rebuilt from the objectives and their indicators, then checked against the
fifteen actually printed — the two sets match exactly, which is what makes
the assignment safe.

The nine vision-level impact indicators carry no such code; the deck gives
them none.
"""
import csv

Kpi = env["albaha.kpi"].sudo()
Objective = env["albaha.objective"].sudo()

with open("/tmp/35_kpi_codes.csv", encoding="utf-8-sig") as fh:
    rows = list(csv.DictReader(fh))

written, mismatched = 0, []
for row in rows:
    record = Kpi.search([("code", "=", row["kpi_code"].strip())], limit=1)
    if not record:
        mismatched.append(row["kpi_code"])
        continue
    objective = Objective.search([("code", "=", row["objective"].strip())], limit=1)
    if objective and record.objective_id and record.objective_id != objective:
        mismatched.append("%s objective %s vs %s" % (
            record.code, record.objective_id.code, objective.code))
    if not record.kpi_number:
        record.kpi_number = row["kpi_number"].strip()
        written += 1

env.cr.commit()

records = Kpi.search([])
print("KCD written: %d" % written)
print("KCD problems: %s" % (mismatched or "none"))
print("KCD indicators with a code: %d of %d (the other %d are vision-level)" % (
    len(records.filtered("kpi_number")), len(records),
    len(records) - len(records.filtered("kpi_number"))))
for record in records.filtered("kpi_number").sorted("kpi_number"):
    print("KCD   %-7s %-8s %s" % (record.kpi_number, record.code, record.name[:46]))
