// Builds fixtures/harness.html: the dashboard's own widget code, the server's
// own OWL, the server's compiled CSS, and a small runner that mounts any card
// exactly as dashboard.js does (propsFor) and records what its clicks ask for.
//
// No login is involved: the layouts come from fixtures/layouts.json, dumped on
// the server by dump_layouts.py as each user's get_layout().
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'dashboard_app', 'static', 'src', 'dashboard');
const fx = join(here, 'fixtures');

// Turn an ES module into plain script text: drop its imports, keep its
// declarations, strip `export`.
const unmodule = (code) => code
  .replace(/^import[\s\S]*?from\s+["'][^"']+["'];?\s*$/gm, '')
  .replace(/^export\s+(?=(class|const|function|let|async))/gm, '')
  .replace(/^export\s*\{[^}]*\};?\s*$/gm, '');

const helpers = unmodule(readFileSync(join(src, 'components', 'click_helpers.js'), 'utf8'));
// WIDGETS_FILE swaps in another copy of widgets.js, to prove the test catches a known-bad one.
const widgets = unmodule(readFileSync(process.env.WIDGETS_FILE || join(src, 'components', 'widgets.js'), 'utf8'));
const modal = unmodule(readFileSync(join(src, 'components', 'component_detail_modal.js'), 'utf8'));

// The same set dashboard.js hands click handlers to.
const dash = readFileSync(join(src, 'dashboard.js'), 'utf8');
const interactive = dash.match(/const INTERACTIVE_WIDGETS = new Set\(\[([\s\S]*?)\]\);/)[1];

const bundle = `
const { App, Component, markup, onMounted, onPatched, onWillUnmount, useEffect, useRef, useState,
        useExternalListener, xml } = owl;
const user = { name: "harness", userId: 2, isInternalUser: true };
${helpers}
const dispatchItemClick = openItem;
${widgets}
${modal}
const INTERACTIVE_WIDGETS = new Set([${interactive}]);
window.WIDGETS = WIDGETS;
window.sectionForComponent = sectionForComponent;
window.sectionsForUnit = sectionsForUnit;
window.ComponentDetailModal = ComponentDetailModal;
window.INTERACTIVE_WIDGETS = INTERACTIVE_WIDGETS;
`;

const runner = `
window.__calls = [];
window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e)));
window.addEventListener('unhandledrejection', (e) => window.__errors.push(String(e.reason && (e.reason.stack || e.reason.message) || e.reason)));

// Mirrors dashboard.js propsFor(comp) for a card in view (editing=false) or
// edit mode (editing=true).
function propsFor(comp, colors, editing) {
  const props = { comp, colors };
  if (!editing && INTERACTIVE_WIDGETS.has(comp.type)) {
    props.onOpenRecord = (rec) => window.__calls.push({ kind: 'record', rec });
    props.onOpenDrilldown = (agg) => window.__calls.push({ kind: 'aggregate', agg });
    props.onOpenComponent = (c) => window.__calls.push({ kind: 'component', comp: c });
  }
  if (comp.type === 'toolbar' || comp.type === 'banner') {
    props.onAction = (a) => window.__calls.push({ kind: 'action', a });
    props.canAdvancedImport = true;
  }
  if (comp.type === 'banner') {
    props.tabs = [{ id: 1, name: 'tab' }];
    props.activeIndex = 0;
    props.onSelectTab = () => {};
    props.filter = { mode: 'all' };
    props.onFilter = () => {};
    props.editing = editing;
    props.onRemoveTab = () => {};
    props.onRenameTab = () => {};
  }
  return props;
}

let current = null;
window.mountCard = async (comp, colors, editing) => {
  if (current) { current.destroy(); current = null; }
  const host = document.getElementById('host');
  host.innerHTML = '';
  host.style.width = Math.max(1, comp.col_span || 12) * 110 + 'px';
  const W = WIDGETS[comp.type];
  if (!W) { window.__errors.push('no widget for type ' + comp.type); return false; }
  const app = new App(W, { props: propsFor(comp, colors || {}, editing), test: true });
  current = app;
  await app.mount(host);
  return true;
};

// What the dashboard does with a ⤢ click: build the sections and open the modal.
window.openComponentModal = async (comp) => {
  const sections = comp.kind === 'panel' || comp.components ? sectionsForUnit(comp) : [sectionForComponent(comp)];
  const host = document.getElementById('modal');
  host.innerHTML = '';
  const app = new App(ComponentDetailModal, { props: {
    title: comp.title || comp.name || 'x', sections, onClose: () => {},
    onOpenRecord: (rec) => window.__calls.push({ kind: 'record', rec }),
    onOpenDrilldown: (agg) => window.__calls.push({ kind: 'aggregate', agg }),
  }, test: true });
  await app.mount(host);
  const rows = sections.reduce((n, s) => n + (s.rows || []).length, 0);
  app.destroy();
  return rows;
};
`;

const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>card harness</title>
<link rel="stylesheet" href="assets_web.min.css">
<style>body{margin:16px;background:#f5f5f5} #host{min-height:40px}</style>
</head><body>
<div class="o_baha_dash"><div id="host"></div><div id="modal"></div></div>
<script src="owl.js"></script>
<script>${bundle}</script>
<script>${runner}</script>
</body></html>`;

writeFileSync(join(fx, 'harness.html'), html, 'utf8');
console.log('harness.html written,', Math.round(html.length / 1024), 'KB');
