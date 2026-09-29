# -*- coding: utf-8 -*-
"""Give the strategy's own projects their programme.

Eleven projects belong to an initiative, and an initiative belongs to a
programme, so the link is the source's own structure rather than a guess. The
145 government projects belong to other entities and the decks give them no
programme, so they keep none.
"""
Project = env["albaha.project"].sudo()

written = 0
for record in Project.search([("initiative_id", "!=", False)]):
    programme = record.initiative_id.program_id
    if programme and record.program_id != programme:
        record.program_id = programme.id
        written += 1

env.cr.commit()
records = Project.search([])
print("PRJ programmes written: %d" % written)
print("PRJ projects with a programme: %d/%d" % (
    len(records.filtered("program_id")), len(records)))
print("PRJ projects with an initiative: %d" % len(records.filtered("initiative_id")))
for category in env["albaha.project.category"].sudo().search([]):
    under = records.filtered(lambda r, c=category: r.category_id == c)
    print("PRJ   %-30s %3d projects, counts toward performance: %s" % (
        category.name[:30], len(under), category.counts_toward_performance))
