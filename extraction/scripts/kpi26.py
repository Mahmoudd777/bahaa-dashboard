Kpi = env["albaha.kpi"].sudo()
record = Kpi.search([("name", "like", "الاستثمارات الخاصة المنفذة")], limit=1)
if record:
    print("K26 %s" % record.name[:70])
    print("K26 baseline %s (%s), unit %s" % (
        record.baseline_value, record.baseline_year, record.unit))
    for v in record.value_ids.sorted("period"):
        print("K26   %s target=%s" % (v.period, v.target_value))
else:
    print("K26 not found")
