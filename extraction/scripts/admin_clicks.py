D = env(user=2)['dashboard.dashboard']
lay = D.get_layout()
new_titles = ('مؤشرات الأثر الكلي مع خط الأساس والمستهدف', 'مؤشرات اكتمال البيانات والمسار',
              'أداء المبادرات الاستراتيجية', 'ملخص المشاريع', 'ملخص تقدم المشاريع وحالتها وأسباب التأخير')
fails = 0
for s in lay['sections']:
    for c in s['components']:
        if c.get('title') not in new_titles:
            continue
        d = c.get('data') or {}
        refs = [it.get('record') for it in (d.get('items') or []) + (d.get('rows') or []) if it.get('record')]
        aggs = [it.get('aggregate') for it in d.get('items') or [] if it.get('aggregate')]
        ok_r = ok_a = 0
        for r in refs:
            try:
                ok_r += bool(D.get_record_detail(r['model'], r['id']).get('title'))
            except Exception as e:
                fails += 1; print('   record FAIL', r, e)
        for a in aggs:
            try:
                D.get_aggregate_records(a); ok_a += 1
            except Exception as e:
                fails += 1; print('   list FAIL', a.get('key'), e)
        print('%-44s popups %d/%d  lists %d/%d' % (c['title'], ok_r, len(refs), ok_a, len(aggs)))
print('failures:', fails)
