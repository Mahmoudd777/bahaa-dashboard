# -*- coding: utf-8 -*-
"""Fill the operational indicators that were missed on two cards.

Only blanks are written; the earlier reading stays the primary source.
"""
import csv

Initiative = env["albaha.initiative"].sudo()
with open("/tmp/29_operational_kpis.csv", encoding="utf-8-sig") as fh:
    rows = list(csv.DictReader(fh))

written = 0
for row in rows:
    record = Initiative.search([("code", "=", (row["code"] or "").strip())], limit=1)
    text = (row.get("operational_kpis") or "").strip()
    if record and text and not record.operational_kpis:
        record.operational_kpis = text.replace(" ; ", "\n")
        written += 1
        print("OPK filled %s" % record.code)

env.cr.commit()
records = Initiative.search([])
print("OPK wrote %d, now filled %d/%d" % (
    written, len(records.filtered("operational_kpis")), len(records)))
