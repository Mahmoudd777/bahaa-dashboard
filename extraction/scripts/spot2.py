Kpi = env["albaha.kpi"].sudo()
for needle in ["الزوار السياحيين", "التوصية بالوجهة", "رضا الزوار"]:
    record = Kpi.search([("name", "like", needle)], limit=1)
    periods = record.value_ids.sorted("period")
    print("SP2 %-20s frequency=%s periods=%d" % (needle, record.frequency, len(periods)))
    print("SP2    %s" % " ".join("%s:%g" % (v.period, v.target_value) for v in periods[:8]))
