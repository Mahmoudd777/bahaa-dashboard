# -*- coding: utf-8 -*-
"""Put every milestone and risk under the initiative whose card it appears on.

The cards were read slide by slide, so which initiative a table belongs to is
not in doubt. The loaded records had drifted: rows belonging to one initiative
sat under the one before it, which a per-initiative count exposes and a grand
total hides — the totals were right the whole time.

Records are moved, never deleted, and anything the cards show but the database
lacks is created afterwards.
"""
import csv
import re

Initiative = env["albaha.initiative"].sudo()
Milestone = env["albaha.milestone"].sudo()
Risk = env["albaha.risk"].sudo()

SEVERITY = [(15, "critical"), (9, "high"), (4, "medium"), (0, "low")]


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


initiatives = {(i.code or "").strip(): i for i in Initiative.search([])}

# Where each name belongs, according to the cards.
belongs_ms, belongs_rk = {}, {}
card_ms, card_rk = {}, {}
for row in rows_of("/tmp/37_milestones_deck06.csv"):
    belongs_ms.setdefault(key_of(row["name"]), set()).add(row["code"])
    card_ms.setdefault(row["code"], []).append(row)
for row in rows_of("/tmp/38_risks_deck06.csv"):
    belongs_rk.setdefault(key_of(row["name"]), set()).add(row["code"])
    card_rk.setdefault(row["code"], []).append(row)

moved_ms = moved_rk = created_ms = created_rk = 0
ambiguous = []

for record in Milestone.search([("initiative_id", "!=", False)]):
    where = belongs_ms.get(key_of(record.name))
    if not where:
        continue
    if record.initiative_id.code in where:
        continue
    if len(where) != 1:
        ambiguous.append(record.name[:50])
        continue
    target = initiatives.get(list(where)[0])
    if target:
        print("RAT milestone %-52s %s -> %s" % (
            record.name[:52], record.initiative_id.code, target.code))
        record.initiative_id = target.id
        moved_ms += 1

for record in Risk.search([("initiative_id", "!=", False)]):
    where = belongs_rk.get(key_of(record.name))
    if not where or record.initiative_id.code in where:
        continue
    if len(where) != 1:
        ambiguous.append(record.name[:50])
        continue
    target = initiatives.get(list(where)[0])
    if target:
        print("RAT risk %-56s %s -> %s" % (
            record.name[:56], record.initiative_id.code, target.code))
        record.initiative_id = target.id
        moved_rk += 1

env.cr.commit()

# Anything the cards show that is still not in the database.
for code, rows in card_ms.items():
    initiative = initiatives.get(code)
    if not initiative:
        continue
    have = {key_of(m.name) for m in Milestone.search([("initiative_id", "=", initiative.id)])}
    for row in rows:
        if key_of(row["name"]) in have:
            continue
        Milestone.create({
            "name": row["name"],
            "initiative_id": initiative.id,
            "planned_start_label": row["start_label"] or False,
            "planned_end_label": row["end_label"] or False,
            "budget_capital_sar": float(row["capital"] or 0),
            "budget_operational_sar": float(row["operational"] or 0),
        })
        have.add(key_of(row["name"]))
        created_ms += 1
        print("RAT created milestone %s under %s" % (row["name"][:52], code))

for code, rows in card_rk.items():
    initiative = initiatives.get(code)
    if not initiative:
        continue
    have = {key_of(r.name) for r in Risk.search([("initiative_id", "=", initiative.id)])}
    for row in rows:
        if key_of(row["name"]) in have:
            continue
        score = int(row["score"])
        Risk.create({
            "name": row["name"],
            "initiative_id": initiative.id,
            "probability": int(row["likelihood"]),
            "impact": int(row["impact"]),
            "risk_score": score,
            "severity": next(s for threshold, s in SEVERITY if score >= threshold),
            "mitigation_plan": row["mitigation"] or False,
        })
        have.add(key_of(row["name"]))
        created_rk += 1
        print("RAT created risk %s under %s" % (row["name"][:56], code))

env.cr.commit()
print("RAT moved %d milestones and %d risks; created %d milestones and %d risks"
      % (moved_ms, moved_rk, created_ms, created_rk))
print("RAT names appearing on more than one card, left alone: %s" % (ambiguous or "none"))
