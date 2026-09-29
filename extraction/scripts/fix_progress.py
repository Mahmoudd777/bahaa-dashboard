# -*- coding: utf-8 -*-
"""Undo an invented progress figure, and load the ones that are real.

The government project register gives each project a status — منجز or جاري —
and no percentage at all. The import turned منجز into 100% and جاري into
**50%**. The first is what completed means; the second is a number nobody
reported, sitting on 68 projects and pulling every aggregate toward the
middle.

A map slide in the same document names ten of those projects with their
actual completion, between 4.23% and 92.5%. Those are written. The rest keep
their status, in words, and no percentage: "in progress" is what the source
says, and "half done" is not.
"""
import csv
import re

Project = env["albaha.project"].sudo()


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


with open("/tmp/46_infra_progress.csv", encoding="utf-8-sig") as fh:
    reported = list(csv.DictReader(fh))

records = Project.search([("initiative_id", "=", False)])
index = [(key_of(r.name), r) for r in records]

written, missing = 0, []
touched = set()
for row in reported:
    needle = key_of(row["name_fragment"])[:24]
    found = [r for key, r in index if needle and needle in key]
    if not found:
        missing.append(row["name_fragment"])
        continue
    record = found[0]
    record.write({
        "progress_pct": float(row["progress_pct"]),
        "delivery_stage": row["status"],
        "source_reference": "الوثيقة التفصيلية، خريطة أبرز مشاريع البنية التحتية",
    })
    touched.add(record.id)
    written += 1

# Everything else that was given the invented 50%.
cleared = 0
for record in records:
    if record.id in touched:
        continue
    if abs(record.progress_pct - 50.0) < 0.01 and abs(record.planned_pct - 50.0) < 0.01:
        record.write({
            "progress_pct": 0.0,
            "planned_pct": 0.0,
            "delivery_stage": record.delivery_stage or "جاري",
        })
        cleared += 1
    elif abs(record.progress_pct - 100.0) < 0.01 and not record.delivery_stage:
        record.delivery_stage = "منجز"

env.cr.commit()

records = Project.search([("initiative_id", "=", False)])
from collections import Counter
print("FPR real percentages written: %d" % written)
print("FPR not found in the register: %s" % (missing or "none"))
print("FPR invented 50%% cleared from: %d projects" % cleared)
print("FPR progress values now: %s" % Counter(records.mapped("progress_pct")).most_common(6))
print("FPR with a stage recorded: %d/%d" % (
    len(records.filtered("delivery_stage")), len(records)))
