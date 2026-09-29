# -*- coding: utf-8 -*-
"""Tie each initiative to the pillar its card names.

The card's "الارتباط الاستراتيجي" row names a pillar for eleven of them. For
the other eight it says "الممكنات" — the enablers as a group, which is three
pillars, not one — or nothing at all, so those are left unlinked rather than
guessed at.

Note that three quality-of-life initiatives are tied to the tourism pillar:
entertainment centres, health tourism and the sports centre serve tourism
even though they sit under a different programme. Deriving the pillar from
the programme would have got those wrong.
"""
import csv
import re

Initiative = env["albaha.initiative"].sudo()
Pillar = env["albaha.pillar"].sudo()


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


with open("/tmp/44_initiative_pillar.csv", encoding="utf-8-sig") as fh:
    rows = list(csv.DictReader(fh))

pillars = {key_of(p.name): p for p in Pillar.search([])}
written, disagreed, left = 0, [], []

for row in rows:
    record = Initiative.search([("code", "=", row["code"].strip())], limit=1)
    if not record:
        continue
    named = (row.get("pillar") or "").strip()
    if not named:
        left.append("%s (%s)" % (row["code"], row.get("strategic_link") or "nothing stated"))
        continue
    pillar = pillars.get(key_of(named))
    if not pillar:
        continue
    if record.pillar_id and record.pillar_id != pillar:
        disagreed.append("%s stored %s, card says %s" % (
            row["code"], record.pillar_id.name, pillar.name))
    if record.pillar_id != pillar:
        record.pillar_id = pillar.id
        written += 1

env.cr.commit()

records = Initiative.search([])
print("IPL written: %d, now %d/%d linked" % (
    written, len(records.filtered("pillar_id")), len(records)))
print("IPL disagreed with what was stored: %s" % (disagreed or "none"))
print("IPL left unlinked (the card names no single pillar): %s" % ", ".join(left))
for pillar in Pillar.search([]):
    under = records.filtered(lambda r, p=pillar: r.pillar_id == p)
    if under:
        print("IPL   %-28s %s" % (pillar.name, ", ".join(under.mapped("code"))))
