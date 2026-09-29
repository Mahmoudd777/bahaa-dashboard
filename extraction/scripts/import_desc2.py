# -*- coding: utf-8 -*-
"""Attach each milestone's description from its card.

The description table names some milestones differently from the milestone
table — the same item, reworded — so the join is by position within the
initiative. That is only safe if the stored milestones are in the same order
as the card, so each write is guarded: the milestone at that position must
carry the name the card gives it, or the row is reported and skipped.
"""
import csv
import re
from collections import defaultdict

Milestone = env["albaha.milestone"].sudo()
Initiative = env["albaha.initiative"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


by_code = defaultdict(list)
for row in rows_of("/tmp/40_milestone_descriptions_joined.csv"):
    by_code[row["code"]].append(row)

written, skipped, out_of_order = 0, 0, []
for code, rows in sorted(by_code.items()):
    initiative = Initiative.search([("code", "=", code)], limit=1)
    if not initiative:
        continue
    stored = Milestone.search([("initiative_id", "=", initiative.id)], order="id")
    for row in rows:
        index = int(row["index"])
        if row["join"] == "position":
            if index >= len(stored):
                skipped += 1
                continue
            record = stored[index]
            if key_of(record.name) != key_of(row["name"]):
                out_of_order.append("%s #%d: stored %s, card %s" % (
                    code, index, record.name[:34], row["name"][:34]))
                skipped += 1
                continue
        else:
            record = next((m for m in stored if key_of(m.name) == key_of(row["name"])), None)
            if not record:
                skipped += 1
                continue
        text = " ".join((row.get("description") or "").split())
        if text and not record.description:
            record.description = text
            written += 1

env.cr.commit()

all_of = Milestone.search([("initiative_id", "!=", False)])
print("MD2 written: %d, skipped: %d" % (written, skipped))
print("MD2 milestones with a description: %d/%d" % (
    len(all_of.filtered("description")), len(all_of)))
print("MD2 positions where the stored name did not match the card: %d" % len(out_of_order))
for line in out_of_order[:8]:
    print("MD2   %s" % line)
