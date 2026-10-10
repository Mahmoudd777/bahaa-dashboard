// One-off: render one card with extra CSS on top of the server's, to preview a
// style change before it is deployed.  node preview.mjs <login> <card id> [css]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const [login, id, css] = process.argv.slice(2);
const layouts = JSON.parse(readFileSync('fixtures/layouts.json', 'utf8'));
const board = Object.entries(layouts).find(([k]) => k.startsWith(login))[1];
const comp = board.sections.flatMap((s) => s.components).find((c) => String(c.id) === id);
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
await page.route((u) => u.protocol === 'file:' && !u.pathname.includes('/fixtures/'), (r) => r.fulfill({ status: 200, body: '' }));
await page.goto(pathToFileURL('fixtures/harness.html').href);
if (css) await page.addStyleTag({ path: css });
await page.evaluate(([c, col]) => window.mountCard(c, col, false), [comp, board.colors]);
await page.waitForTimeout(300);
const out = `fixtures/preview_${login}_${id}${css ? '_new' : '_old'}.png`;
await page.locator('#host').screenshot({ path: out });
console.log(out, 'errors:', JSON.stringify(await page.evaluate(() => window.__errors)));
await browser.close();
