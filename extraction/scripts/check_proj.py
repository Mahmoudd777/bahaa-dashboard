for uid in (6, 7):
    lay = env(user=uid)['dashboard.dashboard'].get_layout()
    s = [s for s in lay['sections'] if 'مشاريع' in s['name']][0]
    print('==== user', uid, s['name'])
    for c in s['components']:
        d = c.get('data') or {}
        print('   seq%-3s w%-2s h%-3s %s' % (c.get('sequence'), c.get('col_span'), c.get('row_span'), c.get('title')))
        if c.get('title') == 'ملخص المشاريع':
            print('        ', [(i['label'], i['value']) for i in d.get('items', [])])
        if c.get('title', '').startswith('ملخص تقدم'):
            print('         columns:', d.get('columns'))
            r = (d.get('rows') or [{}])[0].get('cells')
            print('         first row:', [x if isinstance(x, str) else x.get('label') for x in r], '| rows', len(d.get('rows') or []))
        if 'evm' in (c.get('component_type') or ''):
            print('         cards:', [i.get('key') for i in d.get('items', [])])
for code in ('KPI-01', 'KPI-05'):
    k = env['albaha.kpi'].search([('code', '=', code)])
    print(code, k.name, '| base', k.baseline_value, k.baseline_year, '| target', k.target_value, k.target_year, '| unit', k.unit)
