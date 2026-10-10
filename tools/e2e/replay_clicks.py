# Replays, on the server, every request the browser test's clicks made: each
# record popup and each list, as the user who clicked it. A list's rows open
# the record's full form in a new tab (openFullRecord), so for those the check
# is what the form needs: that this user may read that record.
# Input: /tmp/clicks.json from cards.spec.mjs.
import json
clicks = json.load(open('/tmp/clicks.json', encoding='utf-8'))
seen, fails, popups, lists, rows_opened = set(), [], 0, 0, 0
rows_notice = 0   # portal users: openFullRecord shows a notice by design
for c in clicks:
    D = env(user=c['uid'])['dashboard.dashboard']
    if c['kind'] == 'record':
        key = (c['uid'], 'r', c['rec']['model'], c['rec']['id'])
        if key in seen:
            continue
        seen.add(key)
        try:
            assert D.get_record_detail(c['rec']['model'], c['rec']['id']).get('title') is not None
            popups += 1
        except Exception as e:
            fails.append((c['login'], c['title'], 'popup', c['rec'], repr(e)[:160]))
    else:
        key = (c['uid'], 'a', json.dumps(c['agg'], sort_keys=True))
        if key in seen:
            continue
        seen.add(key)
        try:
            res = D.get_aggregate_records(c['agg'])
            lists += 1
            for row in res.get('rows') or []:
                if row.get('model') and row.get('res_id'):
                    # openFullRecord: a user outside the back office gets the
                    # notice «فتح السجل الكامل متاح من داخل النظام فقط», not a form.
                    if not env['res.users'].browse(c['uid']).has_group('base.group_user'):
                        rows_notice += 1
                        continue
                    try:
                        env[row['model']].with_user(c['uid']).browse(row['res_id']).check_access('read')
                        rows_opened += 1
                    except Exception as e:
                        fails.append((c['login'], c['title'], 'row in list', (row['model'], row['res_id']), repr(e)[:160]))
        except Exception as e:
            fails.append((c['login'], c['title'], 'list', c['agg'].get('key'), repr(e)[:160]))
print('distinct popups opened: %d, lists opened: %d, list rows opened as a form: %d, list rows showing the back-office notice (portal users): %d'
      % (popups, lists, rows_opened, rows_notice))
import collections
print('failures by (what, model, card):', dict(collections.Counter(
    (f[2], f[3][0] if isinstance(f[3], tuple) else str(f[3]), f[0].split('@')[0], f[1]) for f in fails)))
print('failures: %d' % len(fails))
for f in fails[:25]:
    print('  ', f)
