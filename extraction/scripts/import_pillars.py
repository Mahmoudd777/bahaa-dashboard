# -*- coding: utf-8 -*-
"""Give each pillar its description, its mitigation steps, and its risks.

The pillars had names and nothing else: no description, and no link from the
twelve strategic risks to the pillar each threatens. All three are stated in
the strategic house deck and the risk register.
"""
import csv
import re

Pillar = env["albaha.pillar"].sudo()
StrategicRisk = env["albaha.strategic.risk"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


pillars = {key_of(p.name): p for p in Pillar.search([])}

described = 0
for row in rows_of("/tmp/42_pillars.csv"):
    pillar = pillars.get(key_of(row["name"]))
    if pillar and not pillar.description:
        pillar.description = row["description"].strip()
        described += 1

mitigations, linked, unmatched = 0, 0, []
seen_pillar = set()
for row in rows_of("/tmp/41_strategic_risk_mitigation.csv"):
    pillar = pillars.get(key_of(row["pillar"]))
    if not pillar:
        unmatched.append(row["pillar"])
        continue
    text = (row.get("pillar_mitigation") or "").strip()
    if text and pillar.id not in seen_pillar and not pillar.strategic_mitigation:
        pillar.strategic_mitigation = text.replace(" ؛ ", "\n")
        mitigations += 1
    seen_pillar.add(pillar.id)

    # Match the risk on its text; the register and the diagram word a couple
    # of them slightly differently, so a prefix is enough to identify it.
    needle = key_of(row["risk"])[:28]
    match = next((r for r in StrategicRisk.search([])
                  if needle and needle in key_of(r.name)), None)
    if match and not match.pillar_id:
        match.pillar_id = pillar.id
        linked += 1
    elif not match:
        unmatched.append("risk %s" % row["risk"][:40])

env.cr.commit()

all_pillars = Pillar.search([])
all_risks = StrategicRisk.search([])
print("PLR descriptions written: %d, now %d/%d" % (
    described, len(all_pillars.filtered("description")), len(all_pillars)))
print("PLR mitigation blocks written: %d, now %d/%d" % (
    mitigations, len(all_pillars.filtered("strategic_mitigation")), len(all_pillars)))
print("PLR strategic risks linked to a pillar: %d, now %d/%d" % (
    linked, len(all_risks.filtered("pillar_id")), len(all_risks)))
print("PLR unmatched: %s" % (unmatched or "none"))
for pillar in all_pillars:
    print("PLR   %-28s %d risks" % (
        pillar.name, len(all_risks.filtered(lambda r, p=pillar: r.pillar_id == p))))
