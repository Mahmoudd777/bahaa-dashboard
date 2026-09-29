# -*- coding: utf-8 -*-
"""Compare each initiative's stored name against its own card title."""
import csv
import re

Initiative = env["albaha.initiative"].sudo()


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


with open("/tmp/28_initiative_titles.csv", encoding="utf-8-sig") as fh:
    titles = {r["code"]: r["name"].strip() for r in csv.DictReader(fh)}

for record in Initiative.search([], order="code"):
    card = titles.get((record.code or "").strip())
    if not card:
        print("NAM %s no card title" % record.code)
        continue
    stored, key = record.name or "", key_of(card)
    if key_of(stored) == key:
        print("NAM %s ok" % record.code)
    elif key in key_of(stored) or key_of(stored) in key:
        print("NAM %s SUBSET  db=%s" % (record.code, stored[:70]))
        print("NAM %s         card=%s" % (record.code, card[:70]))
    else:
        print("NAM %s DIFFERS db=%s" % (record.code, stored[:70]))
        print("NAM %s         card=%s" % (record.code, card[:70]))
