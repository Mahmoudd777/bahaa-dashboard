# -*- coding: utf-8 -*-
"""Give the pillar-level objectives their description and their pillar.

The strategic house deck states both, one page per pillar. Neither had been
read in: eleven objectives carried no description and none of the fifteen was
linked to a pillar, so the house had a floor and a roof but nothing between.

The four vision-level objectives sit above the pillars and keep no pillar,
which is what the deck shows.
"""
import csv

Objective = env["albaha.objective"].sudo()
Pillar = env["albaha.pillar"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


pillars = {(p.name or "").strip(): p for p in Pillar.search([])}
described, placed, missing = 0, 0, []

for row in rows_of("/tmp/32_objective_detail.csv"):
    record = Objective.search([("code", "=", row["code"].strip())], limit=1)
    if not record:
        missing.append(row["code"])
        continue
    values = {}
    description = (row.get("description") or "").strip()
    if description and not record.description:
        values["description"] = description
        described += 1
    pillar = pillars.get((row.get("pillar") or "").strip())
    if pillar and not record.pillar_id:
        values["pillar_id"] = pillar.id
        placed += 1
    elif row.get("pillar") and not pillar:
        missing.append("pillar %s" % row["pillar"])
    if values:
        record.write(values)

env.cr.commit()

records = Objective.search([])
print("OBD not matched: %s" % (missing or "none"))
print("OBD descriptions written: %d, now %d/%d have one" % (
    described, len(records.filtered("description")), len(records)))
print("OBD pillars written: %d, now %d/%d are placed" % (
    placed, len(records.filtered("pillar_id")), len(records)))
for pillar in Pillar.search([]):
    under = records.filtered(lambda r, p=pillar: r.pillar_id == p)
    print("OBD   %-28s %d objectives" % (pillar.name, len(under)))
print("OBD above the pillars (vision level): %d" % len(
    records.filtered(lambda r: not r.pillar_id)))
