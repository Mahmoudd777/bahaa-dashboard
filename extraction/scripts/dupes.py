# -*- coding: utf-8 -*-
"""Are any milestones duplicated within their initiative?

A card that runs over two slides repeats its heading row at the top of the
continuation, which an extractor can easily take twice.
"""
import re
from collections import defaultdict

Milestone = env["albaha.milestone"].sudo()


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


groups = defaultdict(list)
for record in Milestone.search([("initiative_id", "!=", False)]):
    groups[(record.initiative_id.code, key_of(record.name))].append(record)

duplicated = {k: v for k, v in groups.items() if len(v) > 1}
print("DUP milestone names duplicated within an initiative: %d" % len(duplicated))
for (code, _), records in sorted(duplicated.items()):
    budgets = ["%.0f" % (r.budget_capital_sar + r.budget_operational_sar) for r in records]
    dates = ["%s..%s" % (r.planned_start_label or "-", r.planned_end_label or "-") for r in records]
    print("DUP %s x%d  %s" % (code, len(records), records[0].name[:52]))
    print("DUP    budgets %s | periods %s" % (" / ".join(budgets), " / ".join(dates)))
