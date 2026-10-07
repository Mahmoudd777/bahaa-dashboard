# Second half of the 5 October comments: the projects page on the CEO's and
# the VP's dashboards, and the Prince's board. Layout through save_layout_edits.
import json

admin = env['res.users'].browse(2)
Dash = env['dashboard.dashboard'].with_user(admin)
Comp = env['dashboard.component'].sudo()
langs = [code for code, _ in env['res.lang'].get_installed()]

snap = [{'id': c.id, 'visible': c.visible, 'source': c.source, 'sequence': c.sequence,
         'grid_x': c.grid_x, 'grid_y': c.grid_y, 'col_span': c.col_span, 'row_span': c.row_span}
        for c in Comp.search([('section_id.dashboard_id', 'in', [4, 5, 6])])]
with open('/tmp/layout_before_1005b.json', 'w', encoding='utf-8') as fh:
    json.dump(snap, fh, ensure_ascii=False)

def rename(comp, title):
    for lang in langs:
        comp.with_context(lang=lang).name = title

def item(c, **pos):
    out = {'id': c.id, 'sequence': pos.pop('sequence', c.sequence), 'col_span': c.col_span,
           'row_span': c.row_span, 'grid_x': c.grid_x, 'grid_y': c.grid_y}
    out.update(pos)
    return out

def new_card(template_id, section_id, ctype, source, title, config, **geo):
    vals = {'section_id': section_id, 'component_type': ctype, 'source': source,
            'group_key': False, 'visible': True}
    vals.update(geo)
    c = Comp.browse(template_id).copy(vals)
    c.config = json.dumps(config, ensure_ascii=False) if isinstance(c.config, str) else config
    rename(c, title)
    return c

COUNTS = {"cols": 4, "hide_head": True, "items": [
    {"label": "إجمالي عدد المشاريع", "value": "0", "icon": "fa-folder-open",
     "aggregate": {"key": "proj_total", "title": "إجمالي عدد المشاريع"}},
    {"label": "إجمالي عدد المشاريع المفعلة", "value": "0", "icon": "fa-play-circle",
     "aggregate": {"key": "proj_active", "title": "إجمالي عدد المشاريع المفعلة"}},
    {"label": "إجمالي عدد المشاريع على المسار", "value": "0", "icon": "fa-check-circle",
     "aggregate": {"key": "proj_on_track", "title": "إجمالي عدد المشاريع على المسار"}},
    {"label": "إجمالي عدد المشاريع المتأخرة", "value": "0", "icon": "fa-clock-o",
     "aggregate": {"key": "proj_delayed", "title": "إجمالي عدد المشاريع المتأخرة"}},
]}

# ---------------------------------------------- projects page, CEO and VP
for uid, sec, health, evm, cats in ((6, 14, 105, 106, 107), (7, 18, 121, 122, 123)):
    counts = new_card(96, sec, 'stat_grid', 'project_counts', 'ملخص المشاريع', COUNTS,
                      column='full', sequence=5, col_span=12, row_span=20, grid_x=0, grid_y=0)
    summary = new_card(103, sec, 'data_table', 'projects_summary',
                       'ملخص تقدم المشاريع وحالتها وأسباب التأخير', {},
                       column='full', sequence=40, col_span=12, row_span=60, grid_x=0, grid_y=0)
    Dash.save_layout_edits(None, [{'section_id': sec, 'items': [
        item(counts, sequence=5), item(Comp.browse(evm), sequence=20), item(summary, sequence=40)]}],
        visibility={'components': {health: False, cats: False}}, target_user_id=uid)

# ------------------------------------------------------------ Prince's board
# Impact indicators against baseline and target at the top, pillar progress
# under the completion figure; everything below moves down to make room.
impact = new_card(86, 10, 'bar_v', 'impact_bars', 'مؤشرات الأثر الكلي مع خط الأساس والمستهدف', {},
                  column='main', sequence=5, col_span=8, row_span=50, grid_x=4, grid_y=0)
pillars = new_card(100, 10, 'bar_h', 'pillars_bar', 'أداء الركائز والممكنات الاستراتيجية',
                   {"max": 100}, column='side', sequence=25, col_span=4, row_span=33, grid_x=0, grid_y=47)
Dash.save_layout_edits(None, [{'section_id': 10, 'items': [
    item(impact), item(pillars),
    item(Comp.browse(86), grid_y=50), item(Comp.browse(89), grid_y=50),
    item(Comp.browse(88), grid_y=66), item(Comp.browse(90), grid_y=87),
    item(Comp.browse(87), grid_y=80)]}], target_user_id=5)

env.cr.commit()
print('applied')

from odoo.addons.dashboard_app.models import dashboard_providers as dp
for uid, label in ((5, 'PRINCE'), (6, 'CEO'), (7, 'VP')):
    lay = env(user=uid)['dashboard.dashboard'].get_layout()
    print('====', label, '|', ' / '.join(s['name'] for s in lay['sections']))
    for s in lay['sections']:
        if label != 'PRINCE' and 'المشاريع' not in s['name']:
            continue
        for c in s['components']:
            if c.get('component_type') == 'banner':
                continue
            d = c.get('data') or {}
            print('   y%-4s x%-2s w%-2s h%-3s %s' % (c.get('grid_y'), c.get('grid_x'), c.get('col_span'), c.get('row_span'), c.get('title')))
            if c.get('title') == 'ملخص المشاريع':
                print('        ', [(i['label'], i['value']) for i in d.get('items', [])])
            if c.get('title', '').startswith('ملخص تقدم'):
                print('         columns:', d.get('columns'))
                r = (d.get('rows') or [{}])[0].get('cells')
                print('         first row:', [x if isinstance(x, str) else x.get('label') for x in r] if r else None, '| rows', len(d.get('rows') or []))
            if c.get('title', '').startswith('مؤشرات الأثر'):
                for it in d.get('items', []):
                    print('          %-46s %s' % (it['label'][:46], [b['label'] for b in it['bars']]))
