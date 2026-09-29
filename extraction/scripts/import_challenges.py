# -*- coding: utf-8 -*-
"""Load appendix 7: the region's challenges and how the strategy answers them.

Each row names its planned initiatives in prose, several to a cell with no
separator, so they are matched by looking for each initiative's own name
inside the text. The raw wording is kept beside the links so nothing that
fails to match is lost.
"""
import csv

Challenge = env["albaha.challenge"].sudo()
Initiative = env["albaha.initiative"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def squeeze(text):
    return " ".join((text or "").split())


# The appendix writes the same initiative slightly differently from its card:
# "( DMMO )" against "(DMMO)", and one of them carries a "مشروع" prefix. Names
# are matched on letters alone so spacing and punctuation cannot break a link.
import re


def key_of(text):
    return re.sub(r"[^w؀-ۿ]", "", text or "")


initiatives = Initiative.search([])
# Longest first, so a name that contains another is matched before it.
# The two decks word one initiative differently: the cards deck calls 04.05
# "مشروع تطوير وتنفيذ برامج تنمية المهارات..." while the detailed document
# writes "تطوير برامج تنمية مهارات سكان منطقة الباحة...". Same initiative, so
# the second wording is matched onto it as well.
ALIASES = {
    "04.05": "تطوير برامج تنمية مهارات سكان منطقة الباحة في القطاعات ذات الميز التنافسية",
}

named = sorted(
    [(key_of(i.name), i) for i in initiatives if i.name] +
    [(key_of(ALIASES[i.code]), i) for i in initiatives if i.code in ALIASES],
    key=lambda pair: -len(pair[0]))

written, linked, unmatched_rows = 0, 0, 0
Challenge.search([]).unlink()

for row in rows_of("/tmp/26_challenges.csv"):
    challenge = squeeze(row.get("challenge"))
    if not challenge:
        continue
    text = squeeze(row.get("initiatives_text"))
    hay = key_of(text)
    matched = list({record.id for name, record in named if name and name in hay})
    if text and not matched:
        unmatched_rows += 1
    linked += len(matched)
    Challenge.create({
        "name": challenge,
        "dimension": squeeze(row.get("dimension")) or False,
        "mitigation": squeeze(row.get("mitigation")) or False,
        "initiative_ids": [(6, 0, matched)],
        "initiatives_text": text or False,
        "government_projects": squeeze(row.get("government_projects")) or False,
        "expected_impact": (row.get("expected_impact") or "").replace(" ; ", "\n") or False,
    })
    written += 1

env.cr.commit()

records = Challenge.search([])
print("CHL written: %d" % written)
print("CHL initiative links: %d, rows naming initiatives but matching none: %d"
      % (linked, unmatched_rows))
by_dimension = {}
for record in records:
    by_dimension.setdefault(record.dimension or "-", 0)
    by_dimension[record.dimension or "-"] += 1
for dimension, count in by_dimension.items():
    print("CHL %-34s %d" % (dimension, count))
print("CHL initiatives with at least one challenge: %d/%d" % (
    len(initiatives.filtered(lambda i: Challenge.search_count(
        [("initiative_ids", "in", i.id)]))), len(initiatives)))
