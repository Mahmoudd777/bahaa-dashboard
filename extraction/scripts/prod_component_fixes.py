# -*- coding: utf-8 -*-
"""Re-apply on prod the component fixes that were made on test.

Those changes were written straight into the test database rather than into
the seed data, so a fresh install does not have them. Everything here is
idempotent.
"""
import json

Comp = env["dashboard.component"].sudo()
done = []

# "مؤشرات قياس المسار" -> "مؤشرات عامة", without the RAG key: these are plain
# figures, not items tracked against a target.
recs = Comp.search([("component_type", "=", "stat_grid")]).filtered(
    lambda c: c.name and "قياس المسار" in c.name)
for r in recs:
    cfg = json.loads(r.config or "{}")
    cfg["hide_legend"] = True
    r.write({"name": "مؤشرات عامة", "config": json.dumps(cfg, ensure_ascii=False)})
done.append("general indicators renamed: %d" % len(recs))

# "احتمال تحقيق مستهدف 2026" promised a forecast it never computed, and pinned
# a year the filter can move away from.
recs = Comp.search([("source", "=", "kpi_forecast_bar")])
recs.write({"name": "نسبة تحقق المستهدف"})
done.append("forecast bar renamed: %d" % len(recs))

# Budget panel.
recs = Comp.search([("source", "=", "budget_split")])
recs.write({"name": "ملخص الميزانية"})
done.append("budget renamed: %d" % len(recs))

# "انحراف الميزانية" shared a provider with "تقدم البرامج الاستراتيجية", so both
# drew identical bars. Point it at the money instead.
recs = Comp.search([("source", "=", "programs_planned")]).filtered(
    lambda c: c.name and "انحراف" in c.name)
recs.write({"source": "budget_variance"})
done.append("budget variance rebound: %d" % len(recs))

# The short initiatives table listed all rows, same as the full one below it.
recs = Comp.search([("source", "=", "initiatives_table")]).filtered(
    lambda c: c.name and "حالة التنفيذ الكاملة" not in c.name)
for r in recs:
    cfg = json.loads(r.config or "{}")
    cfg["attention_only"] = True
    r.write({"name": "مبادرات تحتاج متابعة", "config": json.dumps(cfg, ensure_ascii=False)})
done.append("attention table: %d" % len(recs))

# Components repeated on more than one page of the same dashboard: keep the
# first, hide the rest. The client raised this one directly.
hidden = 0
for dash in env["dashboard.dashboard"].sudo().search([]):
    seen = {}
    for sec in dash.section_ids.sorted("sequence"):
        for comp in sec.component_ids.sorted("sequence"):
            if not comp.visible or comp.component_type == "banner":
                continue
            key = (comp.name, comp.component_type, comp.source)
            if key in seen:
                comp.visible = False
                hidden += 1
            else:
                seen[key] = comp.id
done.append("duplicate components hidden: %d" % hidden)

env.cr.commit()
for line in done:
    print("FIX " + line)
