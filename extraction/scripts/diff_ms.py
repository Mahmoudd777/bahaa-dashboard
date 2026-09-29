# -*- coding: utf-8 -*-
"""Name-by-name comparison of the loaded milestones and risks against the cards."""
import csv
import re

Initiative = env["albaha.initiative"].sudo()
Milestone = env["albaha.milestone"].sudo()
Risk = env["albaha.risk"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


deck_ms, deck_rk = {}, {}
for row in rows_of("/tmp/37_milestones_deck06.csv"):
    deck_ms.setdefault(row["code"], []).append(row["name"])
for row in rows_of("/tmp/38_risks_deck06.csv"):
    deck_rk.setdefault(row["code"], []).append(row["name"])

for code in ["02.02", "02.03", "02.04", "02.05"]:
    record = Initiative.search([("code", "=", code)], limit=1)
    loaded = {key_of(m.name): m.name for m in Milestone.search(
        [("initiative_id", "=", record.id)])}
    source = {key_of(n): n for n in deck_ms.get(code, [])}
    print("DIF %s milestones: loaded %d, card %d" % (code, len(loaded), len(source)))
    for key, name in loaded.items():
        if key not in source:
            print("DIF   loaded but NOT on this card: %s" % name[:70])
    for key, name in source.items():
        if key not in loaded:
            print("DIF   on the card but NOT loaded: %s" % name[:70])

    loaded_r = {key_of(r.name): r.name for r in Risk.search(
        [("initiative_id", "=", record.id)])}
    source_r = {key_of(n): n for n in deck_rk.get(code, [])}
    print("DIF %s risks: loaded %d, card %d" % (code, len(loaded_r), len(source_r)))
    for key, name in source_r.items():
        if key not in loaded_r:
            print("DIF   risk on the card but NOT loaded: %s" % name[:70])
