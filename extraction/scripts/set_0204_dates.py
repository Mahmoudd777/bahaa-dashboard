# The office confirmed 31/03/2027 as the start of initiative 02.04, the same
# as its siblings 02.03 and 02.05. Its twelve milestones were left undated
# because their dates are positions counted from that start. They are resolved
# here by the rule import_client_data.py applies to every other initiative.
import datetime

QUARTER = {"Q1": 0, "Q2": 3, "Q3": 6, "Q4": 9}
YEAR_WORD = {"الأولى": 0, "الثانية": 1, "الثالثة": 2, "الرابعة": 3, "الخامسة": 4}


def resolve(label, start):
    if not label or not start:
        return None
    q = next((m for k, m in QUARTER.items() if label.replace(" ", "").startswith(k)), None)
    year_offset = next((v for w, v in YEAR_WORD.items() if w in label), None)
    if q is None or year_offset is None:
        return None
    month = start.month + q + year_offset * 12
    return datetime.date(start.year + (month - 1) // 12, (month - 1) % 12 + 1, 1)


init = env['albaha.initiative'].search([('code', '=', '02.04')])
assert len(init) == 1
print('before:', init.start_date, init.end_date)
init.start_date = datetime.date(2027, 3, 31)

dated = 0
for m in env['albaha.milestone'].search([('initiative_id', '=', init.id)], order='id'):
    assert not m.planned_date, 'already dated: %s' % m.id
    planned = resolve(m.planned_end_label, init.start_date)
    assert planned, 'unreadable label on %s: %r' % (m.id, m.planned_end_label)
    m.planned_date = planned
    dated += 1
    print('  %s  %-18s -> %s' % (m.id, m.planned_end_label, planned))

last = max(env['albaha.milestone'].search([('initiative_id', '=', init.id)]).mapped('planned_date'))
# The plan's final milestone should fall inside the end month the office gave.
assert (last.year, last.month) == (init.end_date.year, init.end_date.month), (last, init.end_date)
env.cr.commit()
print('after :', init.start_date, init.end_date, '| milestones dated', dated, '| last', last)
Ms = env['albaha.milestone']
print('undated milestones left anywhere:', Ms.search_count([('planned_date', '=', False)]), 'of', Ms.search_count([]))
