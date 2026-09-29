# -*- coding: utf-8 -*-
"""Give each milestone the description its card states.

The description table is keyed by the milestone's name within its initiative,
which is where the match is made. The deck repeats a card's tables across its
two pages, so the same description arrives more than once; identical copies
are harmless, and a copy that disagrees is reported rather than picked
between.
"""
import csv
import re

Milestone = env["albaha.milestone"].sudo()
Initiative = env["albaha.initiative"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


initiatives = {(i.code or "").strip(): i for i in Initiative.search([])}

wanted, conflicts = {}, []
for row in rows_of("/tmp/39_milestone_descriptions.csv"):
    key = (row["code"], key_of(row["name"]))
    text = " ".join((row.get("description") or "").split())
    if not text:
        continue
    if key in wanted and wanted[key] != text:
        conflicts.append(row["name"][:44])
        continue
    wanted[key] = text

written, unmatched = 0, []
for (code, name_key), text in wanted.items():
    initiative = initiatives.get(code)
    if not initiative:
        unmatched.append(code)
        continue
    match = None
    for record in Milestone.search([("initiative_id", "=", initiative.id)]):
        if key_of(record.name) == name_key:
            match = record
            break
    if not match:
        unmatched.append("%s / %s" % (code, text[:32]))
        continue
    if not match.description:
        match.description = text
        written += 1

env.cr.commit()

records = Milestone.search([("initiative_id", "!=", False)])
print("MSD descriptions in the cards: %d unique" % len(wanted))
print("MSD written: %d" % written)
print("MSD milestones with a description: %d/%d" % (
    len(records.filtered("description")), len(records)))
print("MSD copies that disagreed: %s" % (conflicts or "none"))
print("MSD described in the cards but no milestone to attach to: %d" % len(unmatched))
for line in unmatched[:10]:
    print("MSD   %s" % line)
