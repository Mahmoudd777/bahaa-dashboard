# -*- coding: utf-8 -*-
"""Load projects: the region's existing government ones, and the strategy's own.

Kept in separate categories on purpose. The government projects are 6.6bn
riyals of work by other entities; folding them in with the strategy's ~97m
would bury every figure the office is actually accountable for — the health
score, CPI and SPI would all be describing someone else's portfolio.
"""
import csv


def rows_of(path):
    """The sheets were written by two different scripts, one comma-separated
    and one tab-separated. Read the first line and use whichever it is."""
    with open(path, encoding="utf-8-sig") as fh:
        first = fh.readline()
        fh.seek(0)
        delim = "\t" if first.count("\t") > first.count(",") else ","
        return list(csv.DictReader(fh, delimiter=delim))


Project = env["albaha.project"].sudo()
Category = env["albaha.project.category"].sudo()
Initiative = env["albaha.initiative"].sudo()

sector_cat = Category.search([("code", "=", "sector_existing")], limit=1)
if not sector_cat:
    sector_cat = Category.create({
        "name": "المشاريع القطاعية القائمة",
        "code": "sector_existing",
        "tagline": "مشاريع الجهات الحكومية القائمة في المنطقة",
        "description": "مشاريع قائمة أو منجزة تنفذها جهات حكومية وقطاعية في منطقة الباحة، "
                       "مرصودة للاطلاع ولا تدخل ضمن حساب أداء مبادرات الاستراتيجية.",
        "color": "#1B7FA3",
        "icon": "layers",
        "sequence": 40,
    })
strategic_cat = Category.search([("code", "=", "strategic")], limit=1)

# ------------------------------------------- existing government projects
STATUS = {"منجز": ("green", 100.0, 100.0), "جاري": ("amber", 50.0, 50.0)}
made = updated = 0
for row in rows_of("/tmp/07_projects.csv"):
        name = (row["name"] or "").strip()[:200]
        if not name:
            continue
        health, actual, planned = STATUS.get(row["status"], ("grey", 0.0, 0.0))
        value = float(row["value_sar"] or 0) / 1000000.0
        vals = {
            "name": name,
            "owner_entity": row["entity"],
            "category_id": sector_cat.id,
            "baseline_cost_sar_m": value,
            # A completed project has spent its budget; one in progress has
            # not, and the deck does not say how much — left at zero rather
            # than invented.
            "actual_cost_to_date": value if row["status"] == "منجز" else 0.0,
            "health_status": health,
            "progress_pct": actual,
            "planned_pct": planned,
            "phase": "closing" if row["status"] == "منجز" else "executing",
        }
        rec = Project.search([("name", "=", name), ("owner_entity", "=", row["entity"])], limit=1)
        if rec:
            rec.write(vals)
            updated += 1
        else:
            Project.create(vals)
            made += 1
print("PRJ government projects: created %d, updated %d" % (made, updated))

# ------------------------------------------------ strategy-side projects
# Only the rows the deck itself calls a project. The other parent rows are
# components of one, and stay recorded as milestones.
made = updated = 0
for row in rows_of("/tmp/08_projects_strategy.csv"):
        name = (row["name"] or "").strip()[:200]
        if not name.startswith("مشروع"):
            continue
        init = Initiative.search([("code", "=", row["initiative"])], limit=1)
        vals = {
            "name": name,
            "category_id": strategic_cat.id if strategic_cat else False,
            "initiative_id": init.id if init else False,
            "strategic_pillar_id": init.pillar_id.id if init and init.pillar_id else False,
            "planned_start": init.start_date if init else False,
            "planned_end": init.end_date if init else False,
            "health_status": "grey",
            "phase": "planning",
        }
        rec = Project.search([("name", "=", name)], limit=1)
        if rec:
            rec.write(vals)
            updated += 1
        else:
            Project.create(vals)
            made += 1
print("PRJ strategy projects: created %d, updated %d" % (made, updated))

env.cr.commit()
print("PRJ total projects: %d" % Project.search_count([]))
for cat in Category.search([]):
    n = Project.search_count([("category_id", "=", cat.id)])
    total = sum(Project.search([("category_id", "=", cat.id)]).mapped("baseline_cost_sar_m"))
    print("PRJ   %-28s %3d projects, %.1f m" % (cat.name, n, total))
