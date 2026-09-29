# -*- coding: utf-8 -*-
"""Record how many initiatives each programme carries, as the deck states it.

The figure is also countable from the initiatives themselves, which is the
point: the two have to agree, and they are written from the stated value only
once they do.
"""
import re

Program = env["albaha.program"].sudo()
Initiative = env["albaha.initiative"].sudo()

STATED = {
    "برنامج الباحة 365": 4,
    "برنامج خيرات الباحة": 5,
    "برنامج هوية الباحة وإحياء التراث": 3,
    "برنامج الارتقاء بجودة الحياة": 5,
    "برنامج تمكين الاستثمارات": 2,
}


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


wanted = {key_of(k): v for k, v in STATED.items()}
written, disagreed, unmatched = 0, [], []

for record in Program.search([]):
    stated = wanted.get(key_of(record.name))
    if stated is None:
        unmatched.append(record.name)
        continue
    actual = Initiative.search_count([("program_id", "=", record.id)])
    if actual != stated:
        disagreed.append("%s: deck says %d, database holds %d" % (
            record.name, stated, actual))
        continue
    if record.initiatives_count != stated:
        record.initiatives_count = stated
        written += 1

env.cr.commit()
records = Program.search([])
print("PRC written: %d" % written)
print("PRC programmes whose count disagrees: %s" % (disagreed or "none"))
print("PRC unmatched: %s" % (unmatched or "none"))
print("PRC total initiatives across programmes: %d (the strategy has %d)" % (
    sum(records.mapped("initiatives_count")), Initiative.search_count([])))
for record in records:
    print("PRC   %-34s %d initiatives, budget %.0f" % (
        record.name, record.initiatives_count, record.total_budget_sar_m))
