Initiative = env["albaha.initiative"].sudo()
for record in Initiative.search([], order="code"):
    if not record.operational_kpis:
        print("OPK missing: %s %s" % (record.code, record.name[:60]))
