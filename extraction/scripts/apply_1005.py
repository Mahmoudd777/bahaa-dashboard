# The office's comments of 5 October 2026, applied to the three personal
# dashboards the users actually see (4 Prince, 5 CEO, 6 VP). Layout goes
# through dashboard.dashboard.save_layout_edits — the function the editor's
# save button calls — as admin editing each user's own copy.
import json

admin = env['res.users'].browse(2)
assert admin.dashboard_access and admin.dashboard_edit_access, 'admin cannot edit layouts'
Dash = env['dashboard.dashboard'].with_user(admin)
Comp = env['dashboard.component'].sudo()

# ---- snapshot, so every change below can be put back by hand
snap = []
for c in Comp.with_context(active_test=False).search([('section_id.dashboard_id', 'in', [4, 5, 6])]):
    snap.append({f: (c[f].id if hasattr(c[f], 'id') else c[f]) for f in (
        'id', 'section_id', 'name', 'visible', 'source', 'column', 'sequence',
        'col_span', 'row_span', 'grid_x', 'grid_y')} | {'config': c.config})
with open('/tmp/layout_before_1005.json', 'w', encoding='utf-8') as fh:
    json.dump({'components': snap, 'sections': [
        {'id': s.id, 'visible': s.visible} for s in env['dashboard.section'].search([('dashboard_id', 'in', [4, 5, 6])])
    ]}, fh, ensure_ascii=False, default=str)
print('snapshot:', len(snap), 'components')

langs = [code for code, _ in env['res.lang'].get_installed()]

def rename(comp, title):
    for lang in langs:
        comp.with_context(lang=lang).name = title
    cfg = comp.config
    data = json.loads(cfg) if isinstance(cfg, str) and cfg else (cfg or {})
    if isinstance(data, dict) and 'title' in data:
        data['title'] = title
        comp.config = json.dumps(data, ensure_ascii=False) if isinstance(cfg, str) else data

def cfg_of(comp):
    cfg = comp.config
    return json.loads(cfg) if isinstance(cfg, str) and cfg else dict(cfg or {})

def set_cfg(comp, data):
    comp.config = json.dumps(data, ensure_ascii=False) if isinstance(comp.config, str) else data

def item(c, **pos):
    c = Comp.browse(c) if isinstance(c, int) else c
    out = {'id': c.id, 'sequence': pos.pop('sequence', c.sequence),
           'col_span': c.col_span, 'row_span': c.row_span, 'grid_x': c.grid_x, 'grid_y': c.grid_y}
    out.update(pos)
    return out

GOALS, GAUGES, PILLARS = 'الأهداف الاستراتيجية الأربعة', 'أداء أهداف مستوى الركائز والممكنات', 'أداء الركائز والممكنات الاستراتيجية'

# =============================================================== Prince (4)
# One dashboard only: the second page goes. The empty technical-KPI box goes
# too (asked on 30 September), and the cards below it close the gap.
rename(Comp.browse(87), GOALS)
Dash.save_layout_edits(None, [{'section_id': 10, 'items': [
    item(86, grid_x=7, grid_y=0), item(89, grid_x=4, grid_y=0),
    item(88, grid_x=4, grid_y=16), item(90, grid_x=4, grid_y=37)]}],
    visibility={'components': {83: False}, 'sections': {11: False}}, target_user_id=5)

# ================================================================== CEO (5)
# Page 1: the regional-transformation figure comes off «مؤشرات عامة»; pillar
# and goal progress go to the top and the objective gauges move below them.
rename(Comp.browse(95), GAUGES)
rename(Comp.browse(100), PILLARS)
path = Comp.browse(96)
data = cfg_of(path)
data['items'] = [i for i in data.get('items', []) if (i.get('aggregate') or {}).get('key') != 'path_investment_kpis']
set_cfg(path, data)
goals5 = Comp.browse(87).copy({'section_id': 12, 'column': 'main', 'sequence': 7,
                               'col_span': 8, 'row_span': 40, 'grid_x': 4, 'grid_y': 33})
rename(goals5, GOALS)
Dash.save_layout_edits(None, [
    {'section_id': 12, 'items': [
        item(100, column='main', sequence=5, col_span=8, row_span=33, grid_x=4, grid_y=0),
        item(goals5, sequence=7, grid_x=4, grid_y=33),
        item(95, sequence=10, grid_x=4, grid_y=73),
        item(97, sequence=30, grid_x=4, grid_y=140)]},
    # Page 2: programme progress to the top, the critical-risk list below.
    {'section_id': 13, 'items': [
        item(104, column='main', sequence=5, col_span=8, row_span=33, grid_x=4, grid_y=0),
        item(103, sequence=20, grid_x=4, grid_y=33),
        item(101, sequence=30, grid_x=4, grid_y=118)]},
    # Page 3: only the strategic-projects category is left (30 September).
    {'section_id': 14, 'items': [item(107, col_span=4)]},
], target_user_id=6)
# Page 3: earned value comes off; the cost and schedule indices stay.
Comp.browse(106).source = 'evm_panel:cpi,spi'
Comp.browse(107).source = 'project_category_cards:0'

# =================================================================== VP (6)
# Page 1: the four summary figures become the ones the office named, and the
# alerts panel gives way to pillar performance with programme progress below.
q = Comp.browse(109)
data = cfg_of(q)
new = [('quality_incomplete_kpis', 'عدد المؤشرات غير مكتملة البيانات'),
       ('quality_delayed_initiatives', 'عدد المبادرات المتأخرة'),
       ('quality_impact_on_track', 'نسبة مؤشرات الأثر الكلي على المسار'),
       ('quality_strategic_on_track', 'نسبة المؤشرات الاستراتيجية على المسار')]
for it, (key, label) in zip(data['items'], new):
    it['label'] = label
    it['aggregate'] = {'key': key, 'title': label}
set_cfg(q, data)
pillars6 = Comp.browse(116).copy({'section_id': 15, 'column': 'side', 'sequence': 30,
                                  'col_span': 4, 'row_span': 33, 'grid_x': 0, 'grid_y': 27})
rename(pillars6, PILLARS)
programs6 = Comp.browse(104).copy({'section_id': 15, 'column': 'side', 'sequence': 35,
                                   'col_span': 4, 'row_span': 33, 'grid_x': 0, 'grid_y': 60})
# Page 2: pillar performance gives way to initiative performance.
inits6 = Comp.browse(116).copy({'section_id': 16, 'sequence': 50, 'source': 'initiatives_bar',
                                'col_span': 4, 'row_span': 105, 'grid_x': 0, 'grid_y': 75})
rename(inits6, 'أداء المبادرات الاستراتيجية')
Dash.save_layout_edits(None, [
    {'section_id': 15, 'items': [item(pillars6), item(programs6)]},
    {'section_id': 16, 'items': [item(inits6)]},
    # Page 3: the target-achievement chart goes; meetings move up into its place.
    {'section_id': 17, 'items': [item(120, sequence=30, grid_x=0, grid_y=26)]},
    {'section_id': 18, 'items': [item(123, col_span=4)]},
], visibility={'components': {111: False, 116: False, 119: False}}, target_user_id=7)
Comp.browse(122).source = 'evm_panel:cpi,spi'
Comp.browse(123).source = 'project_category_cards:0'

env.cr.commit()
print('applied')

# =================================================================== verify
for uid, label in ((5, 'PRINCE'), (6, 'CEO'), (7, 'VP')):
    lay = env(user=uid)['dashboard.dashboard'].get_layout()
    print('====', label)
    for s in lay['sections']:
        cards = [c for c in s['components'] if c.get('component_type') != 'banner']
        print('  [%s]' % s['name'])
        for c in sorted(cards, key=lambda c: (c.get('grid_y') or 0, -(c.get('grid_x') or 0))):
            d = c.get('data') or {}
            extra = ''
            if d.get('items') and c.get('component_type') in ('stat_grid', 'evm_panel'):
                extra = ' -> ' + ' | '.join('%s=%s' % (i.get('label') or i.get('key'), i.get('value')) for i in d['items'])
            elif d.get('items'):
                extra = ' (%d items)' % len(d['items'])
            print('     y%-4s x%-2s w%-2s h%-3s %s%s' % (c.get('grid_y'), c.get('grid_x'), c.get('col_span'),
                                                    c.get('row_span'), c.get('title'), extra))
