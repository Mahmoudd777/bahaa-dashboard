# -*- coding: utf-8 -*-
"""Initiative 04.05 was stored under one of its own projects' names.

Its card lists "مشروع تطوير وتنفيذ برامج تنمية المهارات..." under
"مشاريع ومعالم المبادرة" — it is a project inside the initiative, not the
initiative. Three places state the real title and agree: the programmes deck,
the detailed document's card, and the title line of the card itself.
"""
CORRECT = ("تطوير برامج تنمية مهارات سكان منطقة الباحة في القطاعات ذات الميز "
           "التنافسية بالتعاون مع القطاعين الخاص وغير الربحي")

Initiative = env["albaha.initiative"].sudo()
record = Initiative.search([("code", "=", "04.05")], limit=1)
if not record:
    print("FIX 04.05 not found")
else:
    print("FIX was: %s" % record.name)
    record.name = CORRECT
    env.cr.commit()
    print("FIX now: %s" % record.name)
    # The old name is a project of this initiative; confirm it still exists
    # there so nothing was lost by renaming.
    Milestone = env["albaha.milestone"].sudo()
    kept = Milestone.search_count([("initiative_id", "=", record.id)])
    print("FIX milestones still attached: %d" % kept)
