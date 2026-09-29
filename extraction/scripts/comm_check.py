Committee = env["albaha.committee"].sudo()
for record in Committee.search([]):
    print("CMT %-46s tier=%-11s freq=%-10s scope=%s" % (
        record.name[:46], record.tier or "-", record.frequency or "-",
        "yes" if record.scope else "NO"))
