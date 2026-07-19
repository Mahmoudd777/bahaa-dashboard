// Regression tests for grid_math.js — the key scenario: a split row (tall
// card on one side, two stacked cards on the other) must survive drag & drop
// without a whole-tab reflow.
//
// Run with plain node (no Odoo needed):
//   node dashboard_app/static/tests/grid_math.test.mjs
// grid_math.js is dependency-free on purpose; it is copied to a temp .mjs so
// node accepts its ES-module syntax without a package.json.
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "src", "dashboard", "components", "grid_math.js");
const dst = join(mkdtempSync(join(tmpdir(), "baha-grid-")), "grid_math_under_test.mjs");
copyFileSync(src, dst);
const gm = await import(pathToFileURL(dst));

let failures = 0;
let passes = 0;
function check(label, cond, detail) {
    if (cond) {
        passes++;
        console.log(`ok   - ${label}`);
    } else {
        failures++;
        console.log(`FAIL - ${label}${detail ? " :: " + JSON.stringify(detail) : ""}`);
    }
}
function pos(u) {
    return { x: u.grid_x, y: u.grid_y, w: u.col_span, h: u.row_span };
}
function unit(id, x, y, w, h) {
    return {
        key: `u${id}`,
        column: "full",
        col_span: w,
        row_span: h,
        grid_x: x,
        grid_y: y,
        comp: { id, type: "stat_card", col_span: w, row_span: h, grid_x: x, grid_y: y, column: "full" },
    };
}

// The user's layout: tall card T beside a stacked pair A/B, card C below.
// (12-col grid; x is the logical start column.)
//   T: x0 w6 y0 h6      A: x6 w6 y0 h3
//                        B: x6 w6 y3 h3
//   C: x0 w6 y6 h2   (a column-width card — the thing the user drags around)
const baseline = () => [unit(1, 0, 0, 6, 6), unit(2, 6, 0, 6, 3), unit(3, 6, 3, 6, 3), unit(4, 0, 6, 6, 2)];

// --- 1. entering edit mode must not rearrange a clean stacked layout -------
{
    const { units, repaired } = gm.normalizeEditUnitsWithMeta(baseline());
    check("clean stacked layout: repaired flag is false", repaired === false);
    check("clean stacked layout: T untouched", JSON.stringify(pos(units[0])) === JSON.stringify({ x: 0, y: 0, w: 6, h: 6 }), pos(units[0]));
    check("clean stacked layout: B untouched", JSON.stringify(pos(units[2])) === JSON.stringify({ x: 6, y: 3, w: 6, h: 3 }), pos(units[2]));
}

// --- 2. corrupt layout (overlap, no placedIndex) is repaired + flagged -----
{
    const corrupt = baseline();
    corrupt[1].grid_y = 0;
    corrupt[1].grid_x = 0; // A now overlaps T
    corrupt[1].comp.grid_x = 0;
    const meta = {};
    const units = gm.sanitizeGridLayout(corrupt, { meta });
    check("corrupt layout: repaired flag true", meta.repaired === true);
    check("corrupt layout: no overlaps left", !gm.layoutHasProblems(units));
}

// --- 3. drop into the gap between the stacked pair (freePlace) -------------
{
    // Drag C (index 3) between A and B: freePlace at (x6, y3).
    const res = gm.applyDropToUnits(baseline(), 3, {
        index: 2,
        rowBreak: false,
        freePlace: true,
        gridX: 6,
        gridY: 3,
        anchorIndex: null,
    });
    check("stacked-gap drop: returns a result", !!res);
    const u = res.units;
    const byId = Object.fromEntries(u.map((x) => [x.comp.id, x]));
    check("stacked-gap drop: C lands at (6,3)", byId[4].grid_x === 6 && byId[4].grid_y === 3, pos(byId[4]));
    check("stacked-gap drop: B pushed below C (y=5)", byId[3].grid_x === 6 && byId[3].grid_y === 5, pos(byId[3]));
    check("stacked-gap drop: T did NOT move", byId[1].grid_x === 0 && byId[1].grid_y === 0 && byId[1].col_span === 6, pos(byId[1]));
    check("stacked-gap drop: A did NOT move", byId[2].grid_x === 6 && byId[2].grid_y === 0, pos(byId[2]));
    check("stacked-gap drop: no overlaps", !gm.layoutHasProblems(u));
}
// C width must be clamped to the drop column when wider than the slot
{
    const res = gm.applyDropToUnits(baseline(), 3, {
        index: 2, rowBreak: false, freePlace: true, gridX: gm.clampGridX(6, 12), gridY: 3, anchorIndex: null,
    });
    check("wide card into column: still no overlap", !gm.layoutHasProblems(res.units));
}

// --- 4. row break below the stacked top card, tall straddler ---------------
{
    // Row break requested at y=3 (below A). T straddles → band moves below T
    // (y=6); C (previously y6) shifts down; A/B/T stay put.
    const units = baseline();
    const moved = unit(5, 0, 8, 6, 2);
    units.push(moved);
    gm.applyRowBreakAt(units, 4, 0, 3);
    const byId = Object.fromEntries(units.map((x) => [x.comp.id, x]));
    check("row break w/ straddler: moved lands below tall card (y=6)", byId[5].grid_y === 6, pos(byId[5]));
    check("row break w/ straddler: C shifted down by moved height", byId[4].grid_y === 8, pos(byId[4]));
    check("row break w/ straddler: T/A/B untouched",
        byId[1].grid_y === 0 && byId[2].grid_y === 0 && byId[3].grid_y === 3,
        [pos(byId[1]), pos(byId[2]), pos(byId[3])]);
}

// --- 5. row break must NOT compact/reflow predecessors any more ------------
{
    // Masonry gap on purpose: only A/B on the right, nothing at x<6 on y0..6.
    const units = [unit(1, 6, 0, 6, 3), unit(2, 6, 3, 6, 3), unit(3, 0, 6, 12, 2)];
    gm.applyRowBreakAt(units, 2, 0, 6);
    check("row break: masonry side gap preserved",
        units[0].grid_x === 6 && units[0].grid_y === 0 && units[1].grid_y === 3,
        [pos(units[0]), pos(units[1])]);
}

// --- 6. legacy row break (no breakY) appends below everything --------------
{
    const units = baseline();
    const moved = unit(5, 0, 0, 12, 2);
    units.push(moved);
    gm.applyRowBreakAt(units, 4, 0);
    check("legacy row break: appended below max bottom (y=8)", units[4].grid_y === 8, pos(units[4]));
}

// --- 7. resize collision resolved locally (placedIndex) --------------------
{
    // Grow A from h3 to h5 → overlaps B; B should slide down, T untouched.
    const units = baseline();
    units[1].row_span = 5;
    units[1].comp.row_span = 5;
    const out = gm.sanitizeGridLayout(units, { placedIndex: 1 });
    const byId = Object.fromEntries(out.map((x) => [x.comp.id, x]));
    check("resize: B pushed below grown A", byId[3].grid_y === 5, pos(byId[3]));
    check("resize: T untouched", byId[1].grid_x === 0 && byId[1].grid_y === 0 && byId[1].row_span === 6, pos(byId[1]));
    check("resize: no overlaps", !gm.layoutHasProblems(out));
}

// --- 8. anchored drop keeps unrelated units in place ------------------------
{
    // Move C beside T's row start: anchored on T (index 0), pointer at x... C
    // is w12 → clamped to x0 → overlaps T & A → both pushed below C? No: C is
    // the placed unit at T's row; T/A must move below, B follows. The point
    // here is only: result has no overlaps and stacked pair order survives.
    const res = gm.applyDropToUnits(baseline(), 3, {
        index: 0, rowBreak: false, gridX: 0, anchorIndex: 0,
    });
    check("anchored drop: no overlaps", !gm.layoutHasProblems(res.units));
    const byId = Object.fromEntries(res.units.map((x) => [x.comp.id, x]));
    check("anchored drop: stacked pair keeps A above B", byId[2].grid_y < byId[3].grid_y,
        [pos(byId[2]), pos(byId[3])]);
}

// --- 9. pointer-row fallback when no anchor ---------------------------------
{
    const res = gm.applyDropToUnits(baseline(), 3, {
        index: 2, rowBreak: false, gridX: 6, gridY: 3, anchorIndex: null,
    });
    const byId = Object.fromEntries(res.units.map((x) => [x.comp.id, x]));
    check("no-anchor drop: uses pointer row (y=3), not array neighbour", byId[4].grid_y === 3, pos(byId[4]));
    check("no-anchor drop: T untouched", byId[1].grid_y === 0 && byId[1].grid_x === 0, pos(byId[1]));
}

// --- 10. pixel→row mapping anchors to real cell edges -----------------------
{
    // Simulates stretched grid rows (real pixel positions drift from the
    // fixed-step formula): a drop right at a card's top must map to ITS row.
    const step = 88; // nominal row step
    const anchors = [
        { pixel: 100, row: 0 },   // top card top
        { pixel: 500, row: 4 },   // stretched: 4 rows took 400px (not 352)
        { pixel: 1800, row: 20 }, // الموازنة top — heavily drifted by now
        { pixel: 1976, row: 22 },
    ];
    check("anchor map: exact edge hit", gm.nearestRowFromAnchors(1800, anchors, step) === 20);
    check("anchor map: near edge snaps to it", gm.nearestRowFromAnchors(1815, anchors, step) === 20);
    check("anchor map: one row below nearest edge", gm.nearestRowFromAnchors(1800 + step, anchors, step) === 21);
    check("anchor map: empty anchors -> null", gm.nearestRowFromAnchors(100, [], step) === null);
}

// --- 11. snapBesideAnchor tucks a card flush against its neighbour ----------
{
    // The reported case: drop w4 card beside الموازنة (x8,w4). Only the low
    // side fits (x4); the high side (x12) has no room → must return 4.
    check("snap beside: w4 next to x8/w4 → x4", gm.snapBesideAnchor(4, 8, 4, 6) === 4, gm.snapBesideAnchor(4, 8, 4, 6));
    // Both sides fit → pick the one nearest the pointer column.
    check("snap beside: nearest side to pointer (low)", gm.snapBesideAnchor(2, 5, 2, 2) === 3, gm.snapBesideAnchor(2, 5, 2, 2));
    check("snap beside: nearest side to pointer (high)", gm.snapBesideAnchor(2, 5, 2, 9) === 7, gm.snapBesideAnchor(2, 5, 2, 9));
    // Neither side fits (anchor is full-width) → fall back to clamped pointer.
    check("snap beside: no room → clamped pointer", gm.snapBesideAnchor(4, 0, 12, 3) === gm.clampGridX(3, 4));
}

// --- 12. end-to-end: drop w4 card beside a stacked x8 pair sits flush -------
{
    // الموازنة/الاستثمارات stack at x8 (y0,y2), a wide card fills the left.
    const units = [unit(1, 0, 0, 8, 6), unit(2, 8, 0, 4, 2), unit(3, 8, 2, 4, 2), unit(4, 0, 6, 4, 3)];
    // Drop card 4 beside الموازنة: freePlace snapped to x4 at الموازنة's row.
    const res = gm.applyDropToUnits(units, 3, {
        index: 2, rowBreak: false, freePlace: true, gridX: 4, gridY: 0, anchorIndex: 1,
    });
    const byId = Object.fromEntries(res.units.map(u => [u.comp.id, u]));
    check("flush beside: card sits at x4,y0 next to الموازنة", byId[4].grid_x === 4 && byId[4].grid_y === 0, pos(byId[4]));
    check("flush beside: الموازنة stayed put", byId[2].grid_x === 8 && byId[2].grid_y === 0, pos(byId[2]));
    check("flush beside: الاستثمارات stayed put", byId[3].grid_x === 8 && byId[3].grid_y === 2, pos(byId[3]));
    check("flush beside: no overlaps", !gm.layoutHasProblems(res.units));
}

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures ? 1 : 0);
