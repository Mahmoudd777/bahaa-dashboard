/** @odoo-module **/

// Pure 12-column grid layout math for the dashboard (view + edit mode).
// Deliberately dependency-free so the placement logic can be unit-tested
// outside the Odoo asset pipeline (see static/tests/grid_math.test.js).

export const GRID_ROW_HEIGHT = 72;
export const GRID_GAP = 16;
export const DEFAULT_COL_SPAN = 3;
export const DEFAULT_ROW_SPAN = 1;
/** Extra outer rows reserved for a grouped panel title bar. */
export const PANEL_HEAD_ROWS = 1;
/** Fraction of a grid step needed before snapping to the next cell (reduces jumpiness). */
export const SNAP_BIAS = 0.38;

export function pixelWidthForSpan(span, metrics) {
    const n = Math.max(1, span);
    return n * metrics.colWidth + Math.max(0, n - 1) * metrics.gap;
}

export function pixelHeightForRows(rows, metrics) {
    return Math.max(1, rows) * metrics.rowStep;
}

/** Pixel height for a row_span including inter-row grid gaps (matches CSS grid placement). */
export function rowSpanPixelHeight(rows, metrics = {}) {
    const r = Math.max(1, Math.round(Number(rows) || 1));
    const rowStep = metrics.rowStep ?? metrics.rowH ?? GRID_ROW_HEIGHT;
    const gap = metrics.gap ?? GRID_GAP;
    return r * rowStep + Math.max(0, r - 1) * gap;
}

export function gridSnapDelta(pixels, step) {
    if (!step) {
        return 0;
    }
    const units = pixels / step;
    if (units >= 0) {
        return Math.floor(units + SNAP_BIAS);
    }
    return Math.ceil(units - SNAP_BIAS);
}

// Loose limits — only prevent invalid grid values, not widget-specific caps.
const RESIZE_LIMITS = { minW: 1, maxW: 12, minH: 1, maxH: 12 };

export function sanitizeSpan(value, fallback = DEFAULT_COL_SPAN) {
    const n = parseInt(value, 10);
    if (!n || n < 1) return fallback;
    return Math.min(12, n);
}

export function sanitizeRows(value, fallback = DEFAULT_ROW_SPAN) {
    const n = parseInt(value, 10);
    if (!n || n < 1) return fallback;
    return Math.min(12, n);
}

export function resizeLimits() {
    return RESIZE_LIMITS;
}

export function clampSpan(raw, unit) {
    const lim = resizeLimits();
    const fallback = unit ? effectiveSpan(unit) : DEFAULT_COL_SPAN;
    const n = Math.round(raw);
    if (!n || n < 1) return sanitizeSpan(fallback);
    return Math.max(lim.minW, Math.min(lim.maxW, n));
}

export function clampRows(raw, unit) {
    const lim = resizeLimits();
    const fallback = unit ? effectiveRows(unit) : DEFAULT_ROW_SPAN;
    const n = Math.round(raw);
    if (!n || n < 1) return sanitizeRows(fallback);
    return Math.max(lim.minH, Math.min(lim.maxH, n));
}

export function cloneUnits(units) {
    return JSON.parse(JSON.stringify(units || []));
}

function _spanValue(unit) {
    if (unit.col_span != null && unit.col_span > 0) {
        return sanitizeSpan(unit.col_span);
    }
    if (unit.kind === "panel") {
        if (unit.column === "side") return 4;
        if (unit.column === "main") return 8;
        return 12;
    }
    const comp = unit.comp || {};
    if (comp.col_span != null && comp.col_span > 0) {
        return sanitizeSpan(comp.col_span);
    }
    if (comp.column === "side") return 4;
    if (comp.column === "main") return 8;
    return DEFAULT_COL_SPAN;
}

function _rowValue(unit) {
    if (unit.kind === "panel" && (unit.components || []).length) {
        return panelOuterRowSpan(unit.components);
    }
    if (unit.row_span != null && unit.row_span > 0) {
        return sanitizeRows(unit.row_span);
    }
    if (unit.kind === "panel") {
        return DEFAULT_ROW_SPAN;
    }
    const comp = unit.comp || {};
    if (comp.row_span != null && comp.row_span > 0) {
        return sanitizeRows(comp.row_span);
    }
    return DEFAULT_ROW_SPAN;
}

/** Flow layout inside a grouped panel's inner 12-column grid. */
export function computePanelInnerLayout(components) {
    let x = 0;
    let y = 0;
    let rowH = 1;
    const positions = [];
    for (const comp of components || []) {
        const w = sanitizeSpan(comp?.col_span ?? 12);
        const h = sanitizeRows(comp?.row_span ?? 1);
        if (x > 0 && x + w > 12) {
            y += rowH;
            x = 0;
            rowH = h;
        } else {
            rowH = Math.max(rowH, h);
        }
        positions.push({ x, y, w, h, comp });
        x += w;
        if (x >= 12) {
            y += rowH;
            x = 0;
            rowH = 1;
        }
    }
    return positions;
}

/** Outer grid row span for a panel from its inner components. */
export function panelOuterRowSpan(components) {
    const positions = computePanelInnerLayout(components);
    if (!positions.length) {
        return DEFAULT_ROW_SPAN;
    }
    let maxBottom = 0;
    for (const pos of positions) {
        maxBottom = Math.max(maxBottom, pos.y + pos.h);
    }
    return Math.max(1, maxBottom + PANEL_HEAD_ROWS);
}

export function innerCompGridStyle(pos) {
    return `--span: ${pos.w}; --rows: ${pos.h}; --grid-x: ${pos.x}; --grid-y: ${pos.y};`;
}

export function panelInnerEntries(unit) {
    return computePanelInnerLayout(unit?.components || []).map((pos, compIndex) => ({
        ...pos,
        compIndex,
    }));
}

function sanitizePanelUnit(unit) {
    unit.col_span = sanitizeSpan(unit.col_span ?? 12);
    const outerX = clampGridX(unit.grid_x ?? 0, unit.col_span);
    const outerY = Math.max(0, Math.round(Number(unit.grid_y) || 0));
    unit.grid_x = outerX;
    unit.grid_y = outerY;
    for (const comp of unit.components || []) {
        comp.col_span = sanitizeSpan(comp.col_span ?? 12);
        comp.row_span = sanitizeRows(comp.row_span ?? 1);
        comp.grid_x = outerX;
        comp.grid_y = outerY;
    }
    unit.row_span = panelOuterRowSpan(unit.components);
}

export function effectiveSpan(unit) {
    return _spanValue(unit || {});
}

export function effectiveRows(unit) {
    return _rowValue(unit || {});
}

export function unitLabel(unit) {
    if (unit.kind === "panel") {
        return unit.title || "لوحة مجمّعة";
    }
    return (unit.comp && (unit.comp.title || unit.comp.type)) || "مكوّن";
}

export function clampGridX(x, span) {
    const w = sanitizeSpan(span);
    const n = Math.round(Number(x) || 0);
    return Math.max(0, Math.min(12 - w, n));
}

/** Vertical resize: n handle pins the bottom edge; s handle pins the top edge. */
export function gridYAfterResize(startY, startH, newH, axis) {
    const y0 = Math.max(0, Math.round(Number(startY) || 0));
    const sh = sanitizeRows(startH);
    const nh = sanitizeRows(newH);
    if (axis === "n") {
        return Math.max(0, y0 - (nh - sh));
    }
    return y0;
}

/** Horizontal resize: w handle pins the right edge; e handle pins the left edge (RTL grid). */
export function gridXAfterResize(startX, startW, newW, axis) {
    const w = sanitizeSpan(newW);
    const x0 = Math.round(Number(startX) || 0);
    const sw = sanitizeSpan(startW);
    if (axis === "w") {
        return clampGridX(x0, w);
    }
    if (axis === "e") {
        return clampGridX(x0 + (sw - w), w);
    }
    return clampGridX(x0, w);
}

export function pixelRangeForGridX(gx, span, metrics) {
    const n = sanitizeSpan(span);
    const physicalStart = metrics.rtl ? (12 - n - gx) : gx;
    const left = physicalStart * metrics.step;
    const width = n * metrics.colWidth + Math.max(0, n - 1) * metrics.gap;
    return { left, right: left + width, center: left + width / 2 };
}

function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
}

export function rectsOverlap(a, b) {
    return rangesOverlap(a.x, a.x + a.w, b.x, b.x + b.w)
        && rangesOverlap(a.y, a.y + a.h, b.y, b.y + b.h);
}

export function unitGridRect(unit) {
    const w = effectiveSpan(unit);
    const h = effectiveRows(unit);
    const x = clampGridX(unit.grid_x ?? 0, w);
    const y = Math.max(0, Math.round(Number(unit.grid_y) || 0));
    return { x, y, w, h };
}

export function isGridAreaEmpty(units, ignoredIndex, gridX, gridY, span, rows) {
    const candidate = {
        x: clampGridX(gridX, span),
        y: Math.max(0, Math.round(Number(gridY) || 0)),
        w: sanitizeSpan(span),
        h: sanitizeRows(rows),
    };
    return !(units || []).some((unit, index) => {
        if (index === ignoredIndex) {
            return false;
        }
        return rectsOverlap(candidate, unitGridRect(unit));
    });
}

/** Find the nearest open vertical slot in the chosen columns, preserving stacked side drops. */
export function firstFreeGridY(units, dragIdx, gridX, gridY, span, rows) {
    const x = clampGridX(gridX, span);
    const h = sanitizeRows(rows);
    const w = sanitizeSpan(span);
    const occupied = (units || [])
        .map((unit, index) => ({ index, ...unitGridRect(unit) }))
        .filter((rect) => rect.index !== dragIdx);
    const maxBottom = occupied.reduce((bottom, rect) => Math.max(bottom, rect.y + rect.h), 0);
    const startY = Math.max(0, Math.round(Number(gridY) || 0));

    for (let y = startY; y <= maxBottom + h + 12; y++) {
        const candidate = { x, y, w, h };
        if (!occupied.some((rect) => rectsOverlap(candidate, rect))) {
            return y;
        }
    }
    return startY;
}

/** Map a pixel Y to a grid row using known (pixel, row) anchor pairs taken
 *  from rendered cells. Grid rows stretch with content, so a fixed
 *  row-height formula drifts on tall grids — extrapolating a short distance
 *  from the NEAREST real edge stays accurate and snaps drops beside a card
 *  exactly onto that card's row. */
export function nearestRowFromAnchors(targetTop, anchors, step) {
    let best = null;
    for (const a of anchors || []) {
        const d = Math.abs(targetTop - a.pixel);
        if (!best || d < best.d) {
            best = { d, pixel: a.pixel, row: a.row };
        }
    }
    if (!best) {
        return null;
    }
    const rowDelta = step > 0 ? Math.round((targetTop - best.pixel) / step) : 0;
    return Math.max(0, best.row + rowDelta);
}

/** When dropping a card *beside* another one, snap it flush against that
 *  neighbour (no overlap, no gap) on whichever side has room and is nearest
 *  the pointer — so "put it next to these two" lands cleanly instead of
 *  overlapping and pushing the neighbour down. Falls back to the raw pointer
 *  column when neither side fits. */
export function snapBesideAnchor(span, anchorX, anchorW, pointerGridX) {
    const w = sanitizeSpan(span);
    const left = anchorX - w;                 // flush to the anchor's low-column side
    const right = anchorX + anchorW;          // flush to the anchor's high-column side
    const candidates = [];
    if (left >= 0) {
        candidates.push(left);
    }
    if (right + w <= 12) {
        candidates.push(right);
    }
    if (!candidates.length) {
        return clampGridX(pointerGridX, w);
    }
    let best = candidates[0];
    let bestDist = Infinity;
    for (const c of candidates) {
        const d = Math.abs(c - pointerGridX);
        if (d < bestDist) {
            bestDist = d;
            best = c;
        }
    }
    return clampGridX(best, w);
}

export function applyExplicitGridX(units, unitIndex, gridX, anchorIndex = null) {
    const unit = units[unitIndex];
    if (!unit) {
        return;
    }
    let gy = unit.grid_y ?? 0;
    if (anchorIndex != null && units[anchorIndex]) {
        gy = units[anchorIndex].grid_y ?? gy;
    }
    const gx = clampGridX(gridX, effectiveSpan(unit));
    syncUnitGridPos(unit, gx, gy);
}

export function applyExplicitGridPlacement(units, unitIndex, gridX, gridY) {
    const unit = units[unitIndex];
    if (!unit) {
        return;
    }
    const gx = clampGridX(gridX, effectiveSpan(unit));
    const gy = Math.max(0, Math.round(Number(gridY) || 0));
    syncUnitGridPos(unit, gx, gy);
}

/** Shrink row height to anchor when dropping beside a shorter card; keep height if already shorter or equal. */
export function matchRowSpanToAnchor(units, unitIndex, anchorIndex) {
    const unit = units[unitIndex];
    const anchor = units[anchorIndex];
    if (!unit || !anchor || unitIndex === anchorIndex) {
        return;
    }
    const unitRows = effectiveRows(unit);
    const anchorRows = effectiveRows(anchor);
    if (unitRows <= anchorRows) {
        return;
    }
    if (unit.kind === "panel" && (unit.components || []).length > 1) {
        const positions = computePanelInnerLayout(unit.components);
        let innerBottom = 0;
        for (const pos of positions) {
            innerBottom = Math.max(innerBottom, pos.y + pos.h);
        }
        const targetInner = Math.max(1, anchorRows - PANEL_HEAD_ROWS);
        const scale = innerBottom > 0 ? targetInner / innerBottom : 1;
        for (const comp of unit.components) {
            comp.row_span = Math.max(1, Math.round(sanitizeRows(comp.row_span ?? 1) * scale));
        }
        unit.row_span = panelOuterRowSpan(unit.components);
        return;
    }
    unit.row_span = anchorRows;
    if (unit.kind === "panel") {
        for (const comp of unit.components || []) {
            comp.row_span = anchorRows;
        }
    } else if (unit.comp) {
        unit.comp.row_span = anchorRows;
    }
}

/** Map a pre-drop unit index to its position after reorder splice. */
export function remapIndexAfterInsert(index, from, placeAt, didMove) {
    if (!didMove || index == null || index === undefined) {
        return index;
    }
    if (index === from) {
        return placeAt;
    }
    let i = index;
    if (index > from) {
        i -= 1;
    }
    if (i >= placeAt) {
        i += 1;
    }
    return i;
}

export function unitGridStyle(unit) {
    const span = effectiveSpan(unit);
    const rows = effectiveRows(unit);
    const gx = unit?.grid_x ?? 0;
    const gy = unit?.grid_y ?? 0;
    return `--span: ${span}; --rows: ${rows}; --grid-x: ${gx}; --grid-y: ${gy};`;
}

export function syncUnitGridPos(unit, x, y) {
    unit.grid_x = x;
    unit.grid_y = y;
    if (unit.kind === "panel") {
        for (const comp of unit.components || []) {
            comp.grid_x = x;
            comp.grid_y = y;
        }
    } else if (unit.comp) {
        unit.comp.grid_x = x;
        unit.comp.grid_y = y;
    }
}

function needsInitialFlow(units) {
    if (!units?.length) {
        return false;
    }
    if (units.some((u) => (u.grid_y ?? 0) > 0)) {
        return false;
    }
    if (units.length === 1) {
        return false;
    }
    return units.every((u) => (u.grid_x ?? 0) === 0);
}

function hasCollapsedColumnFlow(units) {
    const columnUnits = (units || []).filter((u) => u.column === "main" || u.column === "side");
    if (!columnUnits.length) {
        return false;
    }
    return columnUnits.every((unit) => effectiveSpan(unit) === 12 && (unit.grid_x ?? 0) === 0);
}

/** Restore the legacy main/side two-column arrangement after bad full-width saves. */
export function repairColumnFlow(units) {
    if (!hasCollapsedColumnFlow(units)) {
        return false;
    }
    let fullY = 0;
    let mainY = 0;
    let sideY = 0;
    let columnsStarted = false;

    for (const unit of units || []) {
        const column = unit.column;
        const h = effectiveRows(unit);
        if (column === "main" || column === "side") {
            if (!columnsStarted) {
                mainY = fullY;
                sideY = fullY;
                columnsStarted = true;
            }
            if (column === "main") {
                unit.col_span = 8;
                if (unit.kind !== "panel" && unit.comp) {
                    unit.comp.col_span = 8;
                }
                syncUnitGridPos(unit, 0, mainY);
                mainY += h;
            } else {
                unit.col_span = 4;
                if (unit.kind !== "panel" && unit.comp) {
                    unit.comp.col_span = 4;
                }
                syncUnitGridPos(unit, 8, sideY);
                sideY += h;
            }
            continue;
        }

        if (columnsStarted) {
            fullY = Math.max(mainY, sideY);
            columnsStarted = false;
        }
        fullY = Math.max(fullY, (unit.grid_y ?? 0) + h);
    }
    return true;
}

/** True when grid_y values leave fully empty horizontal bands. */
export function layoutHasRowGaps(units) {
    if (!units?.length) {
        return false;
    }
    const groups = [...new Set(units.map((u) => Math.max(0, Math.round(Number(u.grid_y) || 0))))].sort(
        (a, b) => a - b
    );
    let coveredBottom = 0;
    for (const oldY of groups) {
        if (oldY > coveredBottom) {
            return true;
        }
        const maxH = Math.max(
            ...units
                .filter((u) => Math.max(0, Math.round(Number(u.grid_y) || 0)) === oldY)
                .map((u) => effectiveRows(u))
        );
        coveredBottom = Math.max(coveredBottom, oldY + maxH);
    }
    return false;
}

/** Remap grid_y only across fully empty horizontal bands; preserve masonry-style side gaps. */
export function compactGridRows(units) {
    if (!units?.length) {
        return units;
    }
    const rowStarts = [...new Set(units.map((u) => Math.max(0, Math.round(Number(u.grid_y) || 0))))].sort(
        (a, b) => a - b
    );
    let coveredBottom = 0;
    let removedRows = 0;
    const yMap = new Map();
    for (const oldY of rowStarts) {
        let newY = Math.max(0, oldY - removedRows);
        if (newY > coveredBottom) {
            removedRows += newY - coveredBottom;
            newY = coveredBottom;
        }
        yMap.set(oldY, newY);
        const maxH = Math.max(
            ...units
                .filter((u) => Math.max(0, Math.round(Number(u.grid_y) || 0)) === oldY)
                .map((u) => effectiveRows(u))
        );
        coveredBottom = Math.max(coveredBottom, newY + maxH);
    }
    for (const unit of units) {
        const oldY = Math.max(0, Math.round(Number(unit.grid_y) || 0));
        const newY = yMap.get(oldY) ?? 0;
        syncUnitGridPos(unit, clampGridX(unit.grid_x ?? 0, effectiveSpan(unit)), newY);
    }
    return units;
}

/** True when saved grid positions overlap or extend outside the 12-column grid. */
export function layoutHasProblems(units) {
    const rects = (units || []).map((unit, index) => ({ unit, index, ...unitGridRect(unit) }));
    for (const item of rects) {
        if ((item.unit.grid_x ?? 0) !== item.x) {
            return true;
        }
        if (item.x + item.w > 12) {
            return true;
        }
    }
    for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
            const a = rects[i];
            const b = rects[j];
            if (
                rangesOverlap(a.x, a.x + a.w, b.x, b.x + b.w)
                && rangesOverlap(a.y, a.y + a.h, b.y, b.y + b.h)
            ) {
                return true;
            }
        }
    }
    return false;
}

/** Resolve overlaps created by a drop/resize by pushing the collided
 *  neighbours (and transitively theirs) down, keeping the placed unit fixed. */
export function pushDownCollisions(units, fixedIndex) {
    if (!units?.length || !units[fixedIndex]) {
        return units;
    }
    const queue = [fixedIndex];
    let guard = units.length * units.length + 32;
    while (queue.length && guard-- > 0) {
        const idx = queue.shift();
        const a = unitGridRect(units[idx]);
        for (let j = 0; j < units.length; j++) {
            if (j === idx || j === fixedIndex) {
                continue;
            }
            const b = unitGridRect(units[j]);
            if (rectsOverlap(a, b)) {
                syncUnitGridPos(units[j], b.x, a.y + a.h);
                if (!queue.includes(j)) {
                    queue.push(j);
                }
            }
        }
    }
    return units;
}

/** Clamp invalid coordinates; repair overlaps locally around
 *  ``options.placedIndex`` (a just-dropped/resized unit) by pushing the
 *  collided neighbours down. Full reflow only remains as the fallback for
 *  genuinely corrupt saved layouts — it flattens masonry arrangements, so it
 *  must never run for an ordinary drop. ``options.meta.repaired`` reports
 *  whether such a destructive repair happened. */
export function sanitizeGridLayout(units, options = {}) {
    const copy = cloneUnits(units);
    for (const unit of copy) {
        if (unit.kind === "panel") {
            sanitizePanelUnit(unit);
            continue;
        }
        const w = effectiveSpan(unit);
        const h = effectiveRows(unit);
        unit.col_span = w;
        unit.row_span = h;
        const gx = clampGridX(unit.grid_x ?? 0, w);
        const gy = Math.max(0, Math.round(Number(unit.grid_y) || 0));
        syncUnitGridPos(unit, gx, gy);
        if (unit.comp) {
            unit.comp.col_span = w;
            unit.comp.row_span = h;
        }
    }
    let repaired = false;
    const initialFlow = needsInitialFlow(copy);
    if (initialFlow || layoutHasProblems(copy)) {
        if (!initialFlow && options.placedIndex != null && copy[options.placedIndex]) {
            pushDownCollisions(copy, options.placedIndex);
        }
        if (initialFlow || layoutHasProblems(copy)) {
            applyFlowLayout(copy);
            repaired = !initialFlow;
            for (const unit of copy) {
                if (unit.kind === "panel") {
                    sanitizePanelUnit(unit);
                }
            }
        }
    }
    if (repairColumnFlow(copy)) {
        repaired = true;
    }
    // View mode passes noCompact so intentional free-mode gaps survive; the
    // editor keeps compaction off too now that Gridstack owns placement.
    if (!options.noCompact) {
        compactGridRows(copy);
    }
    if (options.meta) {
        options.meta.repaired = repaired;
    }
    return copy;
}

/** Suggested row_span per widget type so edit mode shows full content (not 72px strips). */
const EDIT_MIN_ROWS_BY_TYPE = {
    data_table: 5,
    alerts_panel: 3,
    gauge_grid: 4,
    stat_grid: 2,
    kpi_grid: 3,
    goals_list: 3,
    list_cards: 4,
    budget_split_bar: 2,
    stat_card: 2,
    gauge_card: 2,
    gauge_semi: 2,
    kpi_gauge_card: 2,
    progress_card: 2,
};

function suggestedRowSpan(unit) {
    if (unit.kind === "panel") {
        const positions = computePanelInnerLayout(unit.components);
        let innerBottom = 0;
        for (const pos of positions) {
            innerBottom = Math.max(innerBottom, pos.y + pos.h);
        }
        return Math.max(2, innerBottom + PANEL_HEAD_ROWS);
    }
    const type = unit.comp?.type || "";
    return EDIT_MIN_ROWS_BY_TYPE[type] ?? 2;
}

/** Raise row_span from 1 when saved values are too small to show widget content in edit mode. */
export function ensureMinimumRowSpans(units) {
    let changed = false;
    for (const unit of units || []) {
        const current = sanitizeRows(unit.row_span ?? unit.comp?.row_span ?? 1);
        const suggested = suggestedRowSpan(unit);
        if (current < suggested) {
            changed = true;
            if (unit.kind === "panel") {
                for (const comp of unit.components || []) {
                    if (sanitizeRows(comp.row_span ?? 1) < 1) {
                        comp.row_span = 1;
                    }
                }
                unit.row_span = Math.max(suggested, panelOuterRowSpan(unit.components));
            } else {
                unit.row_span = suggested;
                if (unit.comp) {
                    unit.comp.row_span = suggested;
                }
            }
        }
    }
    return changed;
}

/** Normalize units when entering edit mode — keep saved sizes and gaps, only
 *  fix invalid/overlapping values (Gridstack owns compaction from here). */
export function normalizeEditUnits(units) {
    return sanitizeGridLayout(units, { noCompact: true });
}

/** Same, but reports whether a destructive repair (full reflow / column
 *  restore) actually changed the layout, so the UI can warn the user. */
export function normalizeEditUnitsWithMeta(units) {
    const meta = {};
    const copy = sanitizeGridLayout(units, { meta, noCompact: true });
    return {
        units: copy,
        repaired: Boolean(meta.repaired),
    };
}

/** Flow layout from array order; optional row break starts a row at gridX. */
export function computeFlowLayout(units, options = {}) {
    const rowBreakAt = options.rowBreakAt ?? null;
    const rowBreakGridX = options.rowBreakGridX ?? 0;
    let x = 0;
    let y = 0;
    let rowH = 1;
    return (units || []).map((unit, idx) => {
        const w = effectiveSpan(unit);
        const h = effectiveRows(unit);

        if (rowBreakAt === idx) {
            if (idx > 0) {
                y += rowH;
            }
            x = clampGridX(rowBreakGridX, w);
            rowH = h;
        } else if (x + w > 12) {
            y += rowH;
            x = 0;
            rowH = h;
        } else {
            rowH = Math.max(rowH, h);
        }

        const pos = { x, y, w, h };
        x += w;
        return pos;
    });
}

/** Insert one unit on its own new row band, shifting down only what is
 *  actually below the insertion line. ``breakY`` is the requested grid row
 *  (from the drop position); when a unit straddles that line (e.g. a tall
 *  card in another column) the band moves below it so the break stays clean.
 *  Without ``breakY`` the unit is appended below everything (legacy). */
export function applyRowBreakAt(units, placeAt, gridX, breakY = null) {
    const unit = units[placeAt];
    if (!unit) {
        return;
    }
    const movedH = effectiveRows(unit);
    let insertY;
    if (breakY == null) {
        insertY = 0;
        for (let i = 0; i < units.length; i++) {
            if (i === placeAt) {
                continue;
            }
            const r = unitGridRect(units[i]);
            insertY = Math.max(insertY, r.y + r.h);
        }
    } else {
        insertY = Math.max(0, Math.round(Number(breakY) || 0));
        let raised = true;
        while (raised) {
            raised = false;
            for (let i = 0; i < units.length; i++) {
                if (i === placeAt) {
                    continue;
                }
                const r = unitGridRect(units[i]);
                if (r.y < insertY && r.y + r.h > insertY) {
                    insertY = r.y + r.h;
                    raised = true;
                }
            }
        }
        for (let i = 0; i < units.length; i++) {
            if (i === placeAt) {
                continue;
            }
            const r = unitGridRect(units[i]);
            if (r.y >= insertY) {
                syncUnitGridPos(units[i], r.x, r.y + movedH);
            }
        }
    }
    syncUnitGridPos(unit, clampGridX(gridX, effectiveSpan(unit)), insertY);
}

/** Recompute and write grid_x/grid_y onto units (after reorder / row break). */
export function applyFlowLayout(units, options = {}) {
    const positions = computeFlowLayout(units, options);
    for (let i = 0; i < (units || []).length; i++) {
        syncUnitGridPos(units[i], positions[i].x, positions[i].y);
    }
    return units;
}

/** Shared drop application used by both the live drag preview and the real
 *  drop, so what the ghost shows is exactly what the drop commits.
 *  ``target``: {index, rowBreak, breakY, gridX, gridY, freePlace, anchorIndex}.
 *  Returns {units, placeAt} or null for a no-op drop. */
export function applyDropToUnits(sourceUnits, from, target) {
    const units = cloneUnits(sourceUnits);
    const insertIndex = typeof target === "number" ? target : target?.index;
    if (from == null || insertIndex == null || !units[from]) {
        return null;
    }
    const t = typeof target === "object" && target !== null ? target : {};
    const rowBreak = Boolean(t.rowBreak);
    const hasPlacement = rowBreak || typeof target === "object";
    let to = Math.max(0, Math.min(insertIndex, units.length));
    if ((to === from || to === from + 1) && !hasPlacement) {
        return null;
    }
    if (to !== from) {
        const [moved] = units.splice(from, 1);
        if (from < to) {
            to -= 1;
        }
        units.splice(to, 0, moved);
    }
    const didMove = to !== from;
    const placeAt = didMove ? to : from;
    const anchorIndex = remapIndexAfterInsert(t.anchorIndex ?? null, from, placeAt, didMove);
    const dropGridX = t.gridX ?? 0;
    const freePlace = Boolean(t.freePlace) && t.gridY != null;

    if (freePlace) {
        applyExplicitGridPlacement(units, placeAt, dropGridX, t.gridY);
    } else if (rowBreak) {
        applyRowBreakAt(units, placeAt, dropGridX, t.breakY ?? null);
    } else {
        if (anchorIndex == null) {
            // No same-row anchor: use the pointer's grid row when known rather
            // than guessing from array neighbours (wrong with stacked cards).
            const unit = units[placeAt];
            if (t.gridY != null) {
                unit.grid_y = Math.max(0, Math.round(Number(t.gridY) || 0));
            } else {
                unit.grid_y = computeFlowLayout(units)[placeAt].y;
            }
        }
        applyExplicitGridX(units, placeAt, dropGridX, anchorIndex);
    }
    return {
        units: sanitizeGridLayout(units, { placedIndex: placeAt }),
        placeAt,
    };
}

/** Ensure view units have non-overlapping grid positions when DB values are
 *  missing/corrupt, but preserve intentional gaps (free-placement layouts). */
export function prepareUnitsForGrid(units) {
    return sanitizeGridLayout(units, { noCompact: true });
}

export function computeAutoLayout(units) {
    return computeFlowLayout(units);
}

export function unitsToSaveItems(units) {
    // noCompact: Gridstack already applied the chosen gravity (compact or
    // free), so we persist exactly what the user sees — free-mode gaps survive.
    const draft = sanitizeGridLayout(units, { noCompact: true });
    const items = [];
    let sequence = 10;
    for (let idx = 0; idx < draft.length; idx++) {
        const unit = draft[idx];
        const layoutValues = {
            col_span: sanitizeSpan(unit.col_span),
            row_span: sanitizeRows(unit.row_span),
            grid_x: unit.grid_x ?? 0,
            grid_y: unit.grid_y ?? 0,
            column: unit.column || (unit.comp && unit.comp.column) || "full",
        };
        if (unit.kind === "panel") {
            const panelComponents = unit.components || [];
            for (const comp of panelComponents) {
                items.push({
                    id: comp.id,
                    sequence,
                    col_span: sanitizeSpan(comp.col_span),
                    row_span: sanitizeRows(comp.row_span),
                    grid_x: unit.grid_x ?? 0,
                    grid_y: unit.grid_y ?? 0,
                    group_col_span: sanitizeSpan(unit.col_span),
                    group_row_span: sanitizeRows(unit.row_span),
                    group_grid_x: unit.grid_x ?? 0,
                    group_grid_y: unit.grid_y ?? 0,
                    column: unit.column || comp.column || "full",
                });
                sequence += 10;
            }
        } else if (unit.comp) {
            items.push({ id: unit.comp.id, sequence, ...layoutValues });
            sequence += 10;
        }
    }
    return items;
}
