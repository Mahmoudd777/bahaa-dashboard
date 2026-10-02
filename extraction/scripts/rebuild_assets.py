# Compiled bundles are cached as attachments and were last built before this
# change. Drop them and build them again here, so no visitor pays for it.
Att = env['ir.attachment'].sudo()
old = Att.search([('url', '=like', '/web/assets/%')])
print('dropping', len(old), 'compiled bundles')
old.unlink()
Q = env['ir.qweb'].sudo()
for bundle in ('web.assets_frontend', 'web.assets_frontend_lazy',
               'web.assets_frontend_minimal', 'web.assets_web'):
    for rtl in (False, True):
        b = Q._get_asset_bundle(bundle, css=True, js=True, rtl=rtl)
        b.css(); b.js()
env.cr.commit()
import base64
hits = {'o_baha_evm__val': 0, 'gap:0 10px': 0}
for a in Att.search([('url', '=like', '/web/assets/%')]):
    body = base64.b64decode(a.datas or b'').decode('utf-8', 'ignore')
    for needle in hits:
        if needle in body or needle.replace(':0 ', ': 0 ') in body:
            hits[needle] += 1
            print('  found %-18s in %s' % (needle, a.name))
print('rebuilt:', Att.search_count([('url', '=like', '/web/assets/%')]), 'bundles')
