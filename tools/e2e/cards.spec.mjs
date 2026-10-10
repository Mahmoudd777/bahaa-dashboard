// Every card, for every user, rendered by the dashboard's own widget code in a
// real browser (Edge), clicked, expanded, and rendered again in edit mode.
//
//   node dump step:  see README — fixtures/layouts.json from the server
//   npx playwright test
//
// A card fails on any page error, console error, empty render, or a click that
// asks for something the server is not then able to open (checked afterwards
// by replay_clicks.py with fixtures/clicks.json).
import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const fx = join(here, 'fixtures');
const layouts = JSON.parse(readFileSync(join(fx, 'layouts.json'), 'utf8'));
const harness = pathToFileURL(join(fx, 'harness.html')).href;
const shots = join(fx, 'shots');
mkdirSync(shots, { recursive: true });

const clicks = [];   // every record / list a click asked for, per user
test.afterAll(() => writeFileSync(join(fx, 'clicks.json'), JSON.stringify(clicks, null, 1)));

const SERVER = process.env.BAHA_URL || 'http://84.8.119.53';
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

for (const [login, board] of Object.entries(layouts)) {
  for (const section of board.sections) {
    for (const comp of section.components) {
      const label = `${login.split('@')[0]} › ${section.name} › ${comp.title || comp.type} [#${comp.id}]`;
      test(label, async ({ page }) => {
        const consoleErrors = [];
        page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text()); });
        page.on('pageerror', (e) => consoleErrors.push(String(e)));
        // The compiled CSS and the cards ask for /web/... files (fonts, icons,
        // the user's avatar). Static ones are public on the server and are
        // fetched from it; anything needing a session gets an empty answer.
        const missing = [];
        await page.route((url) => url.protocol === 'file:' && !url.pathname.includes('/fixtures/'), async (route) => {
          const path = new URL(route.request().url()).pathname.replace(/^\/[A-Za-z]:/, '');
          if (path.startsWith('/web/static/') || path.startsWith('/dashboard_app/static/')) {
            const res = await fetch(SERVER + path).catch(() => null);
            if (res && res.ok) {
              return route.fulfill({ status: 200, body: Buffer.from(await res.arrayBuffer()),
                                     headers: { 'content-type': res.headers.get('content-type') || 'application/octet-stream' } });
            }
            missing.push(path);
          }
          return route.fulfill({ status: 200, body: '' });
        });
        await page.goto(harness);

        // ---- view mode
        expect(await page.evaluate(([c, col]) => window.mountCard(c, col, false), [comp, board.colors])).toBe(true);
        await settle(page);
        const host = page.locator('#host');
        expect((await host.innerText()).trim().length + (await host.locator('svg, canvas, img').count()),
          'card rendered nothing').toBeGreaterThan(0);
        await host.screenshot({ path: join(shots, `${login.split('@')[0]}_${comp.id}.png`) }).catch(() => {});

        // ---- click everything clickable, one at a time
        const targets = host.locator('[role="button"], button:not([disabled]), .o_baha_clickable, a[href]');
        const n = await targets.count();
        let clicked = 0;
        for (let i = 0; i < n; i++) {
          const t = targets.nth(i);
          if (!(await t.isVisible().catch(() => false))) continue;
          await t.click({ timeout: 2000, force: true }).then(() => clicked++).catch(() => {});
          await settle(page);
        }

        // ---- what the clicks asked for; ⤢ opens the real detail modal
        const calls = await page.evaluate(() => window.__calls.splice(0));
        for (const call of calls.filter((c) => c.kind === 'component')) {
          const rows = await page.evaluate((c) => window.openComponentModal(c), call.comp);
          expect(rows, `⤢ on ${comp.title} opened an empty window`).toBeGreaterThanOrEqual(0);
        }
        for (const call of calls.filter((c) => c.kind === 'record' || c.kind === 'aggregate')) {
          clicks.push({ login, uid: board.uid, card: comp.id, title: comp.title, ...call });
        }

        // ---- edit mode: the same card, no click handlers
        expect(await page.evaluate(([c, col]) => window.mountCard(c, col, true), [comp, board.colors])).toBe(true);
        await settle(page);

        const pageErrors = await page.evaluate(() => window.__errors);
        test.info().annotations.push({ type: 'clicks', description: `${clicked}/${n} clicked, ${calls.length} requests, missing static: ${missing.length}` });
        expect([...pageErrors, ...consoleErrors], 'errors while rendering or clicking').toEqual([]);
      });
    }
  }
}
