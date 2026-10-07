import json
from odoo.addons.dashboard_app.models import dashboard_providers as dp
for cid in (109, 96):
    c = env['dashboard.component'].sudo().browse(cid)
    cfg = c.config if isinstance(c.config, dict) else json.loads(c.config or '{}')
    out = dp.PROVIDERS[c.source.partition(':')[0]](c, cfg, env)
    print(c.name)
    for i in out['items']:
        print('   %-42s %-6s %s' % (i.get('label'), i.get('value'), i.get('delta', '')))
out = dp.evm_panel(env['dashboard.component'].sudo().browse(106), {}, env)
print('EV panel cards:', [i['key'] for i in out['items']])
lay = env(user=7)['dashboard.dashboard'].get_layout()
q = [c for s in lay['sections'] for c in s['components'] if c['id'] == 109][0]
print('as the VP sees it:', [(i.get('label'), i.get('value')) for i in q['data']['items']])
