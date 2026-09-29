# -*- coding: utf-8 -*-
"""Clear milestone dates that were derived from the wrong initiative.

Milestone dates are not in the decks: they are positions ("Q1 السنة الأولى")
turned into calendar dates using the initiative's start. When six milestones
were moved to 02.04 they kept dates computed from 02.03's start, which 02.04
does not share — 02.04 has no start date at all, which is why its other six
milestones have none.

A date derived from the wrong anchor is worse than no date, so these are
cleared. The labels they were derived from are untouched.
"""
Milestone = env["albaha.milestone"].sudo()
Initiative = env["albaha.initiative"].sudo()

cleared, checked = 0, 0
for initiative in Initiative.search([]):
    milestones = Milestone.search([("initiative_id", "=", initiative.id)])
    if initiative.start_date:
        continue
    for record in milestones:
        checked += 1
        if record.planned_date:
            print("FXD %s %-46s had %s, initiative has no start" % (
                initiative.code, record.name[:46], record.planned_date))
            record.planned_date = False
            cleared += 1

env.cr.commit()
all_of = Milestone.search([])
print("FXD milestones under an initiative with no start date: %d" % checked)
print("FXD dates cleared: %d" % cleared)
print("FXD milestones with a date: %d/%d" % (
    len(all_of.filtered("planned_date")), len(all_of)))
