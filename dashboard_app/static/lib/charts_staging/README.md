# Charting libs — STAGED, NOT WIRED

These libraries are vendored here for a **future experiment** with a ks_dashboard_ninja-style
look. They are **deliberately not added to any assets bundle** in `__manifest__.py`, so they
have **zero effect** on the current dashboard, which keeps its bespoke CSS/SVG widgets.

## What's here
- `gridstack/` — **gridstack** (MIT, open). Drag-drop/resizable dashboard grid, the same lib
  ks uses for layout. Copied from the ks module (it's open-source; only ks's packaging is paid).

## What to add when we experiment (not copied — licensing)
- **Charts:** ks renders charts with **amCharts**, which ships under ks's paid **OPL-1**
  license — we must NOT copy it into this LGPL module. Use an **open** equivalent instead:
  - **Chart.js** (MIT) — lightweight, good for bar/line/doughnut. https://www.chartjs.org/
  - or **Apache ECharts** (Apache-2.0) — richer/interactive. https://echarts.apache.org/
  Drop the chosen lib in `charts_staging/<lib>/` and only then add it to a *separate*
  experimental assets bundle.

## Reference
ks_dashboard_ninja: `D:\GlobalSolutions\surveyingexperts17\surveyingexperts\ks_dashboard_ninja`
— see `static/src/js/charts_render_global_functions.js` (amCharts render) and
`models/ks_dashboard_ninja.py::ks_fetch_dashboard_data` (single-RPC compute) for the patterns
we already adopted on the data side.
