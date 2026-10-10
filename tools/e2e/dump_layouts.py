# Every card as each user's own dashboard serves it, for the render harness.
import json, base64
out = {}
for uid in (2, 5, 6, 7):
    u = env['res.users'].browse(uid)
    lay = env(user=uid)['dashboard.dashboard'].get_layout()
    out[u.login] = {'uid': uid, 'name': u.name, 'colors': lay.get('colors') or {},
                    'sections': [{'name': s['name'], 'components': s['components']} for s in lay['sections']]}
with open('/tmp/layouts.json', 'w', encoding='utf-8') as fh:
    json.dump(out, fh, ensure_ascii=False, default=str)
css = env['ir.attachment'].sudo().search([('url', '=like', '/web/assets/%'), ('name', '=', 'web.assets_web.min.css')], limit=1)
open('/tmp/assets_web.min.css', 'wb').write(base64.b64decode(css.datas or b''))
print({k: sum(len(s['components']) for s in v['sections']) for k, v in out.items()}, 'css bytes', len(base64.b64decode(css.datas or b'')))
