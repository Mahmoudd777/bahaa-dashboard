# -*- coding: utf-8 -*-
"""Link each strategic risk to its pillar, from the register that states it.

The register table names the pillar against every risk number. Matching is on
the risk text, which is the same text the records were loaded from.
"""
import csv
import re

StrategicRisk = env["albaha.strategic.risk"].sudo()
Pillar = env["albaha.pillar"].sudo()


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


with open("/tmp/43_strategic_risk_pillars.csv", encoding="utf-8-sig") as fh:
    rows = list(csv.DictReader(fh))

pillars = {key_of(p.name): p for p in Pillar.search([])}
records = StrategicRisk.search([])
by_key = {key_of(r.name): r for r in records}

linked, missing = 0, []
for row in rows:
    pillar = pillars.get(key_of(row["pillar"]))
    key = key_of(row["risk"])
    record = by_key.get(key)
    if not record:
        record = next((r for k, r in by_key.items() if k[:30] and k[:30] == key[:30]), None)
    if not record:
        missing.append("%s %s" % (row["number"], row["risk"][:44]))
        continue
    if pillar and record.pillar_id != pillar:
        record.pillar_id = pillar.id
        linked += 1
    if not record.code:
        record.code = "SR-%02d" % int(row["number"])

env.cr.commit()
records = StrategicRisk.search([])
print("SRP linked: %d, now %d/%d have a pillar" % (
    linked, len(records.filtered("pillar_id")), len(records)))
print("SRP with a code: %d/%d" % (len(records.filtered("code")), len(records)))
print("SRP not found in the register: %s" % (missing or "none"))
for pillar in Pillar.search([]):
    print("SRP   %-28s %d" % (pillar.name, len(records.filtered(
        lambda r, p=pillar: r.pillar_id == p))))
