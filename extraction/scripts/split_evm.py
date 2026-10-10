# The personal CEO and VP boards drew cost and schedule variance inside one
# component ("evm_panel:cpi,spi"), so neither could be moved on its own. The
# shared boards split earned value into one component per card on
# 30 September; this does the same here, using the same names those use.
import json
admin = env['res.users'].browse(2)
Dash = env['dashboard.dashboard'].with_user(admin)
Comp = env['dashboard.component'].sudo()
langs = [code for code, _ in env['res.lang'].get_installed()]
names = {c.source: c.name for c in Comp.browse([68, 69])}   # the shared board's own titles
print('titles used on the shared board:', names)

def rename(c, title):
    for lang in langs:
        c.with_context(lang=lang).name = title

for owner, cid in ((6, 106), (7, 122)):
    box = Comp.browse(cid)
    before = dict(source=box.source, x=box.grid_x, y=box.grid_y, w=box.col_span)
    box.source = 'evm_panel:cpi'
    rename(box, names.get('evm_panel:cpi') or 'انحراف التكلفة')
    spi = box.copy({'source': 'evm_panel:spi', 'sequence': box.sequence + 5})
    rename(spi, names.get('evm_panel:spi') or 'انحراف الجدول')
    Dash.save_layout_edits(None, [{'section_id': box.section_id.id, 'items': [
        {'id': box.id, 'sequence': box.sequence, 'col_span': 6, 'row_span': box.row_span, 'grid_x': 0, 'grid_y': before['y']},
        {'id': spi.id, 'sequence': spi.sequence, 'col_span': 6, 'row_span': box.row_span, 'grid_x': 6, 'grid_y': before['y']},
    ]}], target_user_id=owner)
    print('user %d: %s -> %d (cpi) + %d (spi), row y=%s' % (owner, before, box.id, spi.id, before['y']))
env.cr.commit()

for uid in (6, 7):
    lay = env(user=uid)['dashboard.dashboard'].get_layout()
    s = [s for s in lay['sections'] if 'مشاريع' in s['name']][0]
    print('user', uid, [(c['title'], c.get('grid_x'), c.get('col_span'), [i.get('key') for i in (c.get('data') or {}).get('items', [])])
                        for c in s['components'] if c.get('component_type') == 'evm_panel'])
