# -*- coding: utf-8 -*-
"""Fill the indicator fields the cards state but the records never had.

Each of the 24 cards gives the indicator's formula and its two cumulation
rules — whether it accumulates within a year, and whether it accumulates
across years. Only one formula had been read in and neither rule, so the
dashboard could not tell a running total from a snapshot.

The frequency and direction already on record are checked against the cards
rather than overwritten; a disagreement is reported, not silently resolved.
"""
import csv
import re

Kpi = env["albaha.kpi"].sudo()

FREQUENCY = {"سنوي": "annual", "ربع سنوي": "quarterly", "نصف سنوي": "semiannual"}
CUMULATION = {"تراكمي": "cumulative", "غير تراكمي": "non_cumulative"}
DIRECTION = {"متزايدة": "up", "متناقصة": "down"}


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


records = Kpi.search([])
by_key = {}
for record in records:
    by_key.setdefault(key_of(record.name), []).append(record)

formulas = 0
counts = {"cumulative_in_year": 0, "cumulative_annual": 0}
unmatched, disagreements = [], []

for row in rows_of("/tmp/34_kpi_card_fields.csv"):
    candidates = by_key.get(key_of(row["name"]), [])
    if not candidates:
        unmatched.append(row["name"][:40])
        continue
    # Two indicators share a name; the card fields are identical for both, so
    # writing to each is correct.
    for record in candidates:
        values = {}
        formula = (row.get("formula") or "").strip()
        if formula and not record.formula:
            values["formula"] = formula
            formulas += 1
        # Both cumulation flags are selections, not booleans: an empty one
        # means nobody recorded the rule, which is not the same as "no".
        for field, column in (("cumulative_in_year", "cumulative_in_year"),
                              ("cumulative_annual", "cumulative_annual")):
            written = CUMULATION.get((row.get(column) or "").strip())
            if not written:
                continue
            if not record[field]:
                values[field] = written
                counts[field] += 1
            elif record[field] != written:
                disagreements.append("%s %s %s vs card %s" % (
                    record.code, field, record[field], written))
        want = FREQUENCY.get((row.get("frequency") or "").strip())
        if want and record.frequency and record.frequency != want:
            disagreements.append("%s frequency %s vs card %s" % (
                record.code, record.frequency, want))
        want = DIRECTION.get((row.get("direction") or "").strip())
        if want and record.direction and record.direction != want:
            disagreements.append("%s direction %s vs card %s" % (
                record.code, record.direction, want))

        if values:
            record.write(values)

env.cr.commit()

print("KPC unmatched cards: %s" % (unmatched or "none"))
print("KPC formulas written: %d, now %d/%d" % (
    formulas, len(records.filtered("formula")), len(records)))
for field in ("cumulative_in_year", "cumulative_annual"):
    print("KPC %-20s written %2d, now %2d/%d recorded" % (
        field, counts[field], len(records.filtered(field)), len(records)))
print("KPC disagreements with the card: %s" % (disagreements or "none"))
