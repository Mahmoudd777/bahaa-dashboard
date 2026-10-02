# The risk score became a stored compute after the rows already existed, so
# nothing had triggered it for them. Run it once, then check every comment.
Risk = env['albaha.strategic.risk']
risks = Risk.search([])
env.add_to_compute(Risk._fields['risk_score'], risks)
env.add_to_compute(Risk._fields['rag_status'], risks)
env.flush_all()
env.cr.commit()
for r in Risk.search([], order='code'):
    print(' ', r.code, 'P', r.likelihood, 'I', r.impact, '=', r.risk_score, r.rag_status)

from odoo.addons.dashboard_app.models import dashboard_providers as dp
admin = env['res.users'].browse(2)
aenv = env(user=admin.id)
Comp = aenv['dashboard.component'].sudo()

risk_tbl = Comp.browse(38)
out = dp.risks_table(risk_tbl, {}, aenv)
print('risk table columns:', out['columns'])
first = out['rows'][0]['cells']
print('first row: pillar=%s | P=%s I=%s score=%s (%s) | mitigation %d chars' % (
    first[0]['label'], first[3]['label'], first[4]['label'], first[5]['label'], first[5]['level'], len(first[6])))
print('row order by score:', [row['cells'][5]['label'] for row in out['rows']])

kpi_tbl = Comp.browse(25)
kout = dp.kpi_table(kpi_tbl, {}, aenv)
print('kpi table columns:', kout['columns'])
print('kpi codes shown:', [row['cells'][-1]['label'] for row in kout['rows']][:3], '...', kout['rows'][-1]['cells'][-1]['label'])

cards = dp.risks_cards(Comp.browse(29), {'count': 5}, aenv)
print('critical cards:', [(c['tag'], c['severity']) for c in cards['items']])

layout = aenv['dashboard.dashboard'].get_layout()
names = [c['name'] for s in layout['sections'] for c in s['components']]
print('visible cards on CEO dashboard:', len(names))
for bad in ('تصنيف المشاريع 2', 'تصنيف المشاريع 6', 'مؤشرات الاداء التقني الرئيسية',
            'الغايات الاستراتيجية الأربعة', 'أداء الأهداف الاستراتيجية', 'أداء الركائز الاستراتيجية'):
    print('   still on page? %-34s %s' % (bad, bad in names))
for good in ('تصنيف المشاريع 1', 'الأهداف الاستراتيجية الأربعة',
             'أداء أهداف مستوى الركائز والممكنات', 'أداء الركائز والممكنات الاستراتيجية'):
    print('   present?       %-34s %s' % (good, good in names))
