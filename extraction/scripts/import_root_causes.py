# -*- coding: utf-8 -*-
"""Give each challenge the root cause the diagnostic pages state for it."""
import csv

Challenge = env["albaha.challenge"].sudo()

with open("/tmp/47_root_causes.csv", encoding="utf-8-sig") as fh:
    rows = list(csv.DictReader(fh))

written, missing = 0, []
for row in rows:
    record = Challenge.browse(int(row["id"])).exists()
    if not record:
        missing.append(row["name"][:40])
        continue
    text = (row.get("root_cause") or "").strip()
    if text and not record.root_cause:
        record.root_cause = text
        written += 1

env.cr.commit()
records = Challenge.search([])
print("RTC written: %d, now %d/%d have a root cause" % (
    written, len(records.filtered("root_cause")), len(records)))
print("RTC ids not found: %s" % (missing or "none"))
for record in records.filtered(lambda r: not r.root_cause):
    print("RTC without one: %-28s %s" % (record.dimension or "-", record.name[:56]))
