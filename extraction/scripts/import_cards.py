# -*- coding: utf-8 -*-
"""Fill the two card headings that were never read into the initiatives.

`contribution` and `target_audience` were added as fields but left empty on
all nineteen records. Both are stated plainly on the detailed cards. Anything
already filled is left alone — the earlier reading stays the primary source
and only blanks are written.
"""
import csv

Initiative = env["albaha.initiative"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


initiatives = {(i.code or "").strip(): i for i in Initiative.search([])}
filled = {"contribution": 0, "target_audience": 0,
          "problem_statement": 0, "expected_impact": 0, "outputs": 0}
missing = []

for row in rows_of("/tmp/25_initiative_cards.csv"):
    code = (row.get("code") or "").strip()
    record = initiatives.get(code)
    if not record:
        missing.append(code)
        continue
    values = {}
    for field in filled:
        text = (row.get(field) or "").strip()
        if text and not record[field]:
            values[field] = text
            filled[field] += 1
    if values:
        record.write(values)

env.cr.commit()

records = Initiative.search([])
print("CARD codes not found: %s" % (missing or "none"))
for field, count in filled.items():
    have = len(records.filtered(field))
    print("CARD %-20s wrote %2d, now filled %2d/%d" % (field, count, have, len(records)))
sample = records.filtered(lambda r: r.code == "01.01")[:1]
if sample:
    print("CARD 01.01 contribution: %s" % (sample.contribution or "")[:110])
    print("CARD 01.01 audience: %s" % (sample.target_audience or "")[:110])
