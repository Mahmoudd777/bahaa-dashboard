Risk = env["albaha.risk"].sudo()
record = Risk.search([("name", "like", "الخدمات اللوجستية")], limit=1)
if record:
    print("RSK %s | initiative %s | probability %d x impact %d = %d (stored %d)" % (
        record.name[:46], record.initiative_id.code, record.probability,
        record.impact, record.probability * record.impact, record.risk_score))
wrong = [r for r in Risk.search([]) if r.risk_score != r.probability * r.impact]
print("RSK risks whose stored score is not probability x impact: %d" % len(wrong))
