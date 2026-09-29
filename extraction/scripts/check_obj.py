# -*- coding: utf-8 -*-
Objective = env["albaha.objective"].sudo()
Kpi = env["albaha.kpi"].sudo()
records = Objective.search([], order="id")
print("OBJ count %d" % len(records))
print("OBJ with a description: %d" % len(records.filtered("description")))
print("OBJ with a code: %d" % len(records.filtered(lambda r: r.code)))
print("OBJ with a pillar: %d" % len(records.filtered("pillar_id")))
for record in records:
    linked = Kpi.search_count([("objective_id", "=", record.id)])
    print("OBJ  %-6s %-52s kpis %d  desc %s" % (
        record.code or "-", (record.name or "")[:52], linked,
        "yes" if record.description else "NO"))
print("OBJ kpis with an objective: %d/%d" % (
    Kpi.search_count([("objective_id", "!=", False)]), Kpi.search_count([])))
