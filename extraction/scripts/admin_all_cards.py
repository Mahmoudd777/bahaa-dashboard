# Admin's board (the shared CEO board, dashboard 2) gets every card built for
# the users' boards that it does not already have, placed by subject across
# its four tabs. Layout goes through save_layout_edits as admin, on admin's
# own board. Nothing is removed; existing cards move down to make room.
import json
admin = env['res.users'].browse(2)
assert admin.dashboard_id.id == 2, admin.dashboard_id
Dash = env['dashboard.dashboard'].with_user(admin)
Comp = env['dashboard.component'].sudo()
langs = [code for code, _ in env['res.lang'].get_installed()]

snap = [{f: (c[f].id if hasattr(c[f], 'id') else c[f]) for f in ('id', 'section_id', 'visible', 'column', 'sequence', 'col_span', 'row_span', 'grid_x', 'grid_y')}
        for c in Comp.search([('section_id.dashboard_id', '=', 2)])]
with open('/tmp/admin_before.json', 'w', encoding='utf-8') as fh:
    json.dump(snap, fh, ensure_ascii=False)

def clone(src_id, section_id, title, **geo):
    vals = {'section_id': section_id, 'group_key': False, 'visible': True}
    vals.update(geo)
    c = Comp.browse(src_id).copy(vals)
    for lang in langs:
        c.with_context(lang=lang).name = title
    return c

def item(c, **pos):
    c = Comp.browse(c) if isinstance(c, int) else c
    out = {'id': c.id, 'sequence': c.sequence, 'col_span': c.col_span, 'row_span': c.row_span,
           'grid_x': c.grid_x, 'grid_y': c.grid_y}
    out.update(pos)
    return out

# ---------------------------------------------- tab 1: strategic overview
# The impact indicators go under the cards already there, in the main column.
impact = clone(132, 2, 'مؤشرات الأثر الكلي مع خط الأساس والمستهدف',
               column='main', sequence=130, col_span=8, row_span=50, grid_x=0, grid_y=247)

# --------------------------------- tab 2: indicators, initiatives, budget
# The four data-completeness and on-track figures across the top; everything
# else moves down by their height. Initiative performance under the
# initiative tables.
SHIFT = 26
completeness = clone(109, 3, 'مؤشرات اكتمال البيانات والمسار',
                     column='full', sequence=5, col_span=12, row_span=SHIFT, grid_x=0, grid_y=0)
tab2 = Comp.search([('section_id', '=', 3), ('visible', '=', True), ('id', '!=', completeness.id)])
inits = clone(127, 3, 'أداء المبادرات الاستراتيجية',
              column='main', sequence=60, col_span=8, row_span=105, grid_x=0, grid_y=187 + 33 + SHIFT)

# ------------------------------------------------ tab 4: project summary
# Project counts at the top, the per-project summary at the bottom.
TOP = 25
counts = clone(128, 8, 'ملخص المشاريع', column='full', sequence=5, col_span=12, row_span=TOP, grid_x=0, grid_y=0)
tab4 = Comp.search([('section_id', '=', 8), ('visible', '=', True), ('id', '!=', counts.id)])
summary = clone(129, 8, 'ملخص تقدم المشاريع وحالتها وأسباب التأخير',
                column='full', sequence=60, col_span=12, row_span=121, grid_x=0, grid_y=42 + 44 + TOP)

Dash.save_layout_edits(2, [
    {'section_id': 2, 'items': [item(impact)]},
    {'section_id': 3, 'items': [item(completeness), item(inits)] +
        [item(c, grid_y=(c.grid_y or 0) + SHIFT) for c in tab2]},
    {'section_id': 8, 'items': [item(counts), item(summary)] +
        [item(c, grid_y=(c.grid_y or 0) + TOP) for c in tab4]},
])
env.cr.commit()
print('applied')

lay = env(user=2)['dashboard.dashboard'].get_layout()
for s in lay['sections']:
    print('[%s]' % s['name'])
    for c in sorted(s['components'], key=lambda c: ((c.get('grid_y') or 0), c.get('grid_x') or 0)):
        if c.get('title') == 'ترحيب':
            continue
        d = c.get('data') or {}
        n = len(d.get('items') or d.get('rows') or [])
        print('   y%-4s x%-2s w%-2s h%-4s %s%s' % (c.get('grid_y'), c.get('grid_x'), c.get('col_span'), c.get('row_span'),
                                             c.get('title'), (' (%d)' % n) if n else ''))
