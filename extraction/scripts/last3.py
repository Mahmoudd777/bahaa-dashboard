# -*- coding: utf-8 -*-
print("== milestones with no computed date ==")
for record in env["albaha.milestone"].sudo().search([("planned_date", "=", False)]):
    print("L3 %-6s %-44s start=%s end=%s | initiative start=%s" % (
        record.initiative_id.code, record.name[:44],
        record.planned_start_label or "-", record.planned_end_label or "-",
        record.initiative_id.start_date))

print("== indicator without a target methodology ==")
for record in env["albaha.kpi"].sudo().search([]):
    if not record.target_methodology:
        print("L3 %s %s" % (record.code, record.name[:56]))

print("== projects with planned dates ==")
Project = env["albaha.project"].sudo()
dated = Project.search([("planned_start", "!=", False)])
print("L3 %d of %d have a planned start; categories: %s" % (
    len(dated), Project.search_count([]),
    set(dated.mapped("category_id.name"))))
print("L3 government projects with dates: %d" % Project.search_count([
    ("planned_start", "!=", False), ("initiative_id", "=", False)]))
