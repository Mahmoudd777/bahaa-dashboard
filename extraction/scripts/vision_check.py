# -*- coding: utf-8 -*-
"""Is the vision statement itself recorded anywhere?"""
for model in ("albaha.sector", "albaha.strategy.bridge", "albaha.transformation"):
    try:
        with env.cr.savepoint():
            print("VIS %-28s %d records" % (model, env[model].sudo().search_count([])))
    except Exception as error:
        print("VIS %-28s unreadable" % model)

hits = []
for model in sorted(n for n in env.registry.keys() if n.startswith("albaha.")):
    try:
        with env.cr.savepoint():
            Model = env[model].sudo()
            for field, descriptor in Model._fields.items():
                if descriptor.type not in ("char", "text"):
                    continue
                found = Model.search([(field, "like", "منطقة حيوية على مدار العام")], limit=1)
                if found:
                    hits.append("%s.%s" % (model, field))
    except Exception:
        continue
print("VIS the vision sentence appears in: %s" % (hits or "nowhere"))
