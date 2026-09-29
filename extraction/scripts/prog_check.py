from collections import Counter
Project = env["albaha.project"].sudo()
records = Project.search([("initiative_id", "=", False)])
print("PRG government-side projects: %d" % len(records))
print("PRG progress values: %s" % Counter(records.mapped("progress_pct")).most_common(8))
print("PRG planned_pct values: %s" % Counter(records.mapped("planned_pct")).most_common(8))
print("PRG health/status: %s" % Counter(records.mapped("health_status")).most_common(6))
