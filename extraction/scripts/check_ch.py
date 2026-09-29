Challenge = env["albaha.challenge"].sudo()
for record in Challenge.search([]):
    if record.initiatives_text and not record.initiative_ids:
        print("CHX unmatched: %s" % record.name[:60])
        print("CHX   text: %s" % (record.initiatives_text or "")[:200])
Initiative = env["albaha.initiative"].sudo()
for record in Initiative.search([]):
    if not Challenge.search_count([("initiative_ids", "in", record.id)]):
        print("CHX initiative with no challenge: %s %s" % (record.code, record.name[:55]))
