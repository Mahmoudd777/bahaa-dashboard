Challenge = env["albaha.challenge"].sudo()
for record in Challenge.search([("dimension", "like", "التخطيط")]):
    print("CHU %s" % record.name[:90])
print("CHU ---")
for record in Challenge.search([("dimension", "like", "الحوكمة")]):
    print("CHU %s" % record.name[:90])
