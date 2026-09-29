# -*- coding: utf-8 -*-
"""Load the named investment projects found on two map slides.

Both slides are pictures: their text is not in the presentation's XML, so
every text-based sweep of the decks missed them. They name twenty projects —
ten investment projects the office supports, and ten third-sector projects
run by the region's cooperatives — with budgets, stages and, for the
cooperatives, how far along each one is.

Neither set is the office's own delivery, so both go under categories that do
not count toward performance. The first slide says outright that its list is
not exhaustive, which is why its total falls short of the 14 billion the same
slide states.
"""
import csv

Project = env["albaha.project"].sudo()
Category = env["albaha.project.category"].sudo()

DEFINITIONS = {
    "supported_investment": {
        "name": "المشاريع الاستثمارية المدعومة",
        "code": "supported_investment",
        "tagline": "بدعم المكتب الاستراتيجي",
        "description": "مشاريع استثمارية في المنطقة يدعمها المكتب الاستراتيجي "
                       "وينفذها القطاع الخاص. القائمة غير شاملة حسب المصدر.",
        "counts_toward_performance": False,
    },
    "third_sector": {
        "name": "مشاريع القطاع الثالث",
        "code": "third_sector",
        "tagline": "الجمعيات التعاونية",
        "description": "مشاريع استثمارية تنفذها الجمعيات التعاونية في المنطقة.",
        "counts_toward_performance": False,
    },
}


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def num(value):
    text = (value or "").strip()
    return float(text) if text else 0.0


categories = {}
for key, values in DEFINITIONS.items():
    record = Category.search([("code", "=", values["code"])], limit=1)
    if not record:
        record = Category.create(values)
    categories[key] = record

created, updated = 0, 0
for row in rows_of("/tmp/45_investment_projects.csv"):
    category = categories[row["category"]]
    name = row["name"].strip()
    values = {
        "name": name,
        "category_id": category.id,
        "owner_entity": (row.get("owner_entity") or "").strip() or False,
        "project_type": (row.get("sector") or "").strip() or False,
        # Budgets are printed in riyals; the model holds millions.
        "baseline_cost_sar_m": num(row.get("budget_sar")) / 1_000_000.0,
        "progress_pct": num(row.get("progress_pct")),
        "code": "%s-%02d" % (category.code[:3].upper(), int(row["number"])),
    }
    stage = " — ".join(x for x in [(row.get("status") or "").strip(),
                                    (row.get("stage") or "").strip()] if x)
    note = (row.get("note") or "").strip()
    values["delivery_stage"] = " | ".join(x for x in [stage, note] if x) or False
    values["source_reference"] = (
        "الوثيقة التفصيلية، خريطة المشاريع الاستثمارية"
        if row["category"] == "supported_investment"
        else "الوثيقة التفصيلية، خريطة مشاريع القطاع الثالث")

    existing = Project.search([("name", "=", name),
                               ("category_id", "=", category.id)], limit=1)
    if existing:
        existing.write(values)
        updated += 1
    else:
        Project.create(values)
        created += 1

env.cr.commit()

print("INV created %d, updated %d" % (created, updated))
for key, category in categories.items():
    under = Project.search([("category_id", "=", category.id)])
    print("INV %-34s %2d projects, %8.1f million, counts toward performance: %s" % (
        category.name, len(under), sum(under.mapped("baseline_cost_sar_m")),
        category.counts_toward_performance))
print("INV projects now: %d" % Project.search_count([]))
print("INV with a progress figure: %d" % Project.search_count([("progress_pct", ">", 0)]))
