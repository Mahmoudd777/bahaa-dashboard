# Dashboard card test (Playwright)

Every card on every user's board, rendered by the dashboard's own widget code in
a real browser, clicked, expanded, and rendered again in edit mode — without
logging in. Then every popup and list those clicks ask for is replayed on the
server as the user who clicked.

```
# 1. on the server: each user's layout, the compiled CSS, OWL
scp dump_layouts.py baha2:/tmp/ && ssh baha2 'docker exec -i baha_odoo odoo shell -d baha --no-http < /tmp/dump_layouts.py'
#    then copy /tmp/layouts.json, /tmp/assets_web.min.css and the server's
#    web/static/lib/owl/owl.js into fixtures/
# 2. here
npm install
node build_harness.mjs
npx playwright test            # one test per card per user; fails on any error
# 3. replay what the clicks asked for (fixtures/clicks.json -> server /tmp)
ssh baha2 'docker exec -i baha_odoo odoo shell -d baha --no-http < /tmp/replay_clicks.py'
```

Runs in the installed Edge (`channel: 'msedge'`), so no browser download.
`WIDGETS_FILE=<path> node build_harness.mjs` builds from another copy of
widgets.js — against 47761c7 the four vertical-bar cards fail, which is how the
test was shown to catch the crash of 8 October.

`fixtures/` holds the client's data and is not committed.

What it does not cover: the real login and page shell (dashboard.js itself,
tabs, the grid). That needs a signed-in browser.
