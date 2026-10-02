# The office's dashboard comments of 30 September 2026, applied to the data.
# Each block prints what it found before it writes, so any of it can be put
# back by hand.
import json

admin = env['res.users'].browse(2)
Dash = env['dashboard.dashboard']
Comp = env['dashboard.component'].sudo()

# ---------------------------------------------------------------- 1 and 4
# Five project-category cards and the empty technical-KPI box come off the
# page. Hidden through the editor's own remove path, so they remain under
# "+ add" and nothing is deleted.
REMOVE_SOURCES = ['project_category_cards:%d' % i for i in range(1, 6)]
TECH_BOX = 'مؤشرات الاداء التقني الرئيسية'

def to_remove(dashboard_id):
    comps = Comp.search([('section_id.dashboard_id', '=', dashboard_id)])
    return comps.filtered(lambda c: c.source in REMOVE_SOURCES or c.name == TECH_BOX)

ceo = to_remove(2)
print('CEO dashboard, removing:', [(c.id, c.name, c.source or '') for c in ceo])
Dash.with_user(admin).save_layout_edits(
    2, [], visibility={'components': {c.id: False for c in ceo}})

# The VP dashboard has no user assigned, and save_layout_edits only lets a
# user edit the dashboard they are assigned to. This writes the one field
# that function writes.
vp = to_remove(3)
print('VP dashboard, removing:', [(c.id, c.name, c.source or '') for c in vp])
vp.write({'visible': False})

# ---------------------------------------------------------- 6, 7 and 8
RENAMES = {
    'الغايات الاستراتيجية الأربعة': 'الأهداف الاستراتيجية الأربعة',
    'أداء الأهداف الاستراتيجية': 'أداء أهداف مستوى الركائز والممكنات',
    'أداء الركائز الاستراتيجية': 'أداء الركائز والممكنات الاستراتيجية',
}
langs = [code for code, _ in env['res.lang'].get_installed()]
for comp in Comp.with_context(active_test=False).search([]):
    new = RENAMES.get(comp.name)
    if not new:
        continue
    print('rename', comp.id, '|', comp.name, '->', new)
    for lang in langs:
        comp.with_context(lang=lang).name = new
    # goals_list also carries its heading inside the config.
    cfg = comp.config
    was_text = isinstance(cfg, str)
    data = json.loads(cfg) if was_text and cfg else (cfg or {})
    if isinstance(data, dict) and data.get('title') in RENAMES:
        data['title'] = RENAMES[data['title']]
        comp.config = json.dumps(data, ensure_ascii=False) if was_text else data

# ------------------------------------------------------------------- 3
# Probability and impact as drawn on slide 147 of the detailed document,
# read from the position of each numbered circle on the 3x3 matrix.
MATRIX = {1: (2, 3), 2: (2, 2), 3: (3, 3), 4: (2, 3), 5: (3, 2), 6: (3, 3),
          7: (2, 3), 8: (3, 2), 9: (3, 3), 10: (3, 2), 11: (3, 3), 12: (3, 3)}
Risk = env['albaha.strategic.risk']
for n, (prob, imp) in sorted(MATRIX.items()):
    risk = Risk.search([('code', '=', 'SR-%02d' % n)])
    assert len(risk) == 1, n
    risk.write({'likelihood': prob, 'impact': imp})
env.flush_all()
for r in Risk.search([], order='code'):
    print(' ', r.code, 'P', r.likelihood, 'I', r.impact, 'score', r.risk_score, r.rag_status, '|', r.pillar_id.name)

# ------------------------------------------------------------------- 5
# The codes followed slide numbers in the indicator deck, so they began at
# KPI-02 and skipped KPI-11. Renumbered 01 to 24 in the same order.
Kpi = env['albaha.kpi']
kpis = Kpi.search([]).sorted(lambda k: k.code or '')
mapping = []
for i, kpi in enumerate(kpis, start=1):
    new = 'KPI-%02d' % i
    mapping.append((kpi.code, new, kpi.name))
    if kpi.code != new:
        kpi.code = new        # ascending, so a new code never meets an old one
print('KPI codes:', ' '.join('%s>%s' % (a[4:], b[4:]) for a, b, _ in mapping))
with open('/tmp/kpi_code_map.csv', 'w', encoding='utf-8-sig') as fh:
    fh.write('old_code,new_code,name\n')
    for a, b, name in mapping:
        fh.write('%s,%s,"%s"\n' % (a, b, (name or '').replace('"', '""')))

# ------------------------------------------------------------------- 9
init = env['albaha.initiative'].search([('code', '=', '02.04')])
assert len(init) == 1
print('02.04 dates before:', init.start_date, init.end_date)
init.end_date = '2029-03-31'

env.cr.commit()
print('--- after ---')
print('02.04:', init.start_date, init.end_date)
print('hidden on CEO:', sorted(Comp.search([('section_id.dashboard_id', '=', 2), ('visible', '=', False)]).mapped('name')))
print('hidden on VP :', sorted(Comp.search([('section_id.dashboard_id', '=', 3), ('visible', '=', False)]).mapped('name')))
print('codes now:', Kpi.search([], order='code').mapped('code')[0], '..', Kpi.search([], order='code').mapped('code')[-1],
      'distinct', len(set(Kpi.search([]).mapped('code'))))
