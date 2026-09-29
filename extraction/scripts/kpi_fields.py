# -*- coding: utf-8 -*-
"""How complete are the indicator records against their cards?"""
Kpi = env["albaha.kpi"].sudo()
records = Kpi.search([])
names = [f for f in Kpi._fields if not f.startswith(("create_", "write_", "__",
                                                     "display_name", "id"))]
for field in sorted(names):
    descriptor = Kpi._fields[field]
    if descriptor.type in ("one2many", "many2many"):
        continue
    filled = len(records.filtered(field))
    if filled < len(records):
        print("KFD %-24s %2d/%d" % (field, filled, len(records)))
print("KFD indicators: %d" % len(records))
