Category = env["albaha.project.category"].sudo()
for record in Category.search([]):
    print("CAT %-34s code=%-18s counts=%s projects=%d" % (
        record.name, record.code, record.counts_toward_performance,
        env["albaha.project"].sudo().search_count([("category_id", "=", record.id)])))
