# -*- coding: utf-8 -*-
"""One of the ten named infrastructure projects is not in the register table.

The map slide names it with its owner, budget and completion; the register in
the appendix does not list it. It is added so the ten are complete, under the
same category as the rest of the region's government work.
"""
Project = env["albaha.project"].sudo()
Category = env["albaha.project.category"].sudo()

category = Category.search([("code", "=", "sector_existing")], limit=1)
name = "استكمال ربط محافظتي العقيق والقرى"
existing = Project.search([("name", "=", name)], limit=1)
if existing:
    print("ADD already present")
else:
    Project.create({
        "name": name,
        "category_id": category.id if category else False,
        "owner_entity": "وزارة النقل والخدمات اللوجستية",
        "baseline_cost_sar_m": 330.0,
        "progress_pct": 84.0,
        "delivery_stage": "تحت التنفيذ",
        "source_reference": "الوثيقة التفصيلية، خريطة أبرز مشاريع البنية التحتية",
    })
    print("ADD created")

env.cr.commit()
print("ADD projects now: %d" % Project.search_count([]))
print("ADD government-side with a reported percentage: %d" % Project.search_count([
    ("initiative_id", "=", False), ("progress_pct", ">", 0), ("progress_pct", "<", 100)]))
