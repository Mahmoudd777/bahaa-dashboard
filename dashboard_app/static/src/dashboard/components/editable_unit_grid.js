/** @odoo-module **/

import { Component, onWillUnmount, useRef, useState, xml } from "@odoo/owl";
import { WIDGETS } from "./widgets";
import {
    GRID_GAP,
    GRID_ROW_HEIGHT,
    applyDropToUnits,
    clampGridX,
    clampRows,
    clampSpan,
    computePanelInnerLayout,
    effectiveRows,
    effectiveSpan,
    gridSnapDelta,
    gridXAfterResize,
    innerCompGridStyle,
    nearestRowFromAnchors,
    panelInnerEntries,
    snapBesideAnchor,
    pixelRangeForGridX,
    pixelWidthForSpan,
    resizeLimits,
    rowSpanPixelHeight,
    sanitizeRows,
    sanitizeSpan,
    unitGridRect,
    unitGridStyle,
    unitLabel,
} from "./grid_math";

// All pure layout math lives in grid_math.js; re-export so existing imports
// (dashboard.js, tests) keep a single entry point.
export * from "./grid_math";

/** Viewport edge zone (px) that triggers auto-scroll while reordering. */
const DRAG_SCROLL_EDGE = 80;
const DRAG_SCROLL_MAX_STEP = 22;

/** Map pointer X to a 12-col start index (0 = right edge in RTL). */
export function gridColumnMetrics(gridEl) {
    if (!gridEl) {
        return null;
    }
    const style = getComputedStyle(gridEl);
    const padL = parseFloat(style.paddingLeft || 0);
    const padR = parseFloat(style.paddingRight || 0);
    const rect = gridEl.getBoundingClientRect();
    const gap = parseFloat(style.gap || style.columnGap || GRID_GAP) || GRID_GAP;
    const innerW = gridEl.clientWidth - padL - padR;
    const colWidth = Math.max(32, (innerW - gap * 11) / 12);
    return {
        rtl: style.direction === "rtl",
        contentLeft: rect.left + padL,
        colWidth,
        gap,
        step: colWidth + gap,
    };
}

/** Map pointer X to a 12-col start index (0 = right edge in RTL). */
export function clientXToGridX(clientX, gridEl, span, rtl) {
    const metrics = gridColumnMetrics(gridEl);
    if (!metrics) {
        return 0;
    }
    const isRtl = rtl ?? metrics.rtl;
    const n = sanitizeSpan(span);
    const relX = clientX - metrics.contentLeft;
    let bestGx = 0;
    let bestDist = Infinity;
    for (let gx = 0; gx <= 12 - n; gx++) {
        const range = pixelRangeForGridX(gx, n, { ...metrics, rtl: isRtl });
        const dist = relX < range.left
            ? range.left - relX
            : relX > range.right
                ? relX - range.right
                : 0;
        if (dist < bestDist || (dist === bestDist && gx > bestGx)) {
            bestDist = dist;
            bestGx = gx;
        }
    }
    return clampGridX(bestGx, span);
}

/** Map pointer Y to the grid row under the dragged card's top edge. */
export function clientYToGridY(clientY, gridEl, dragOffsetY = 0) {
    if (!gridEl) {
        return 0;
    }
    const style = getComputedStyle(gridEl);
    const rect = gridEl.getBoundingClientRect();
    const padT = parseFloat(style.paddingTop || 0);
    const gap = parseFloat(style.rowGap || style.gap || GRID_GAP) || GRID_GAP;
    const rowH = parseFloat(style.getPropertyValue("--row-h")) || GRID_ROW_HEIGHT;
    const step = rowH + gap;
    const relY = clientY - rect.top - padT - (dragOffsetY || 0) + (gridEl.scrollTop || 0);
    return Math.max(0, Math.floor(relY / step));
}

/** Same, but anchored to the real rendered cell edges: grid rows stretch
 *  with content, so the fixed-step formula above drifts several rows on tall
 *  grids (a drop "beside" a card landed well below it). Extrapolating from
 *  the nearest rendered edge keeps the mapping exact where it matters. */
export function clientYToGridYFromCells(clientY, gridEl, cellElements, units, dragIdx, dragOffsetY = 0) {
    if (!gridEl) {
        return 0;
    }
    const style = getComputedStyle(gridEl);
    const gap = parseFloat(style.rowGap || style.gap || GRID_GAP) || GRID_GAP;
    const rowH = parseFloat(style.getPropertyValue("--row-h")) || GRID_ROW_HEIGHT;
    const step = rowH + gap;
    const targetTop = clientY - (dragOffsetY || 0);
    const anchors = [];
    (cellElements || []).forEach((el, i) => {
        if (i === dragIdx || !units[i]) {
            return;
        }
        const r = unitGridRect(units[i]);
        const rect = el.getBoundingClientRect();
        anchors.push({ pixel: rect.top, row: r.y });
        anchors.push({ pixel: rect.bottom + gap, row: r.y + r.h });
    });
    const row = nearestRowFromAnchors(targetTop, anchors, step);
    return row != null ? row : clientYToGridY(clientY, gridEl, dragOffsetY);
}

/** Resolve drops on empty grid areas using live cell geometry (not stale grid_y). */
export function resolveVisualEmptyDrop(clientX, clientY, cellElements, units, dragIdx, gridEl, rtl, dragOffsetY = 0) {
    if (!gridEl || dragIdx == null || dragIdx === undefined) {
        return null;
    }
    const moved = units[dragIdx];
    if (!moved) {
        return null;
    }
    const span = effectiveSpan(moved);
    const gridX = clientXToGridX(clientX, gridEl, span, rtl);
    const gridY = clientYToGridYFromCells(clientY, gridEl, cellElements, units, dragIdx, dragOffsetY);
    // The pointer is over empty SCREEN space here (no cell under it). Even if
    // the logical rect grazes a neighbour's columns, place at the pointer —
    // the shared sanitize step pushes any collided card down, and the ghost
    // previews exactly that. Bailing out here used to degrade the drop into a
    // "new row below everything", which made cards impossible to place beside
    // a stacked pair.
    const allItems = (cellElements || []).map((el, index) => ({
        index,
        rect: el.getBoundingClientRect(),
        isDragged: index === dragIdx,
    }));
    if (!allItems.length) {
        return null;
    }

    const rowPad = 14;
    const rows = [];
    for (const item of allItems) {
        let row = rows.find((r) => Math.abs(r.top - item.rect.top) <= rowPad);
        if (!row) {
            row = { top: item.rect.top, bottom: item.rect.bottom, items: [] };
            rows.push(row);
        }
        row.top = Math.min(row.top, item.rect.top);
        row.bottom = Math.max(row.bottom, item.rect.bottom);
        row.items.push(item);
    }
    rows.sort((a, b) => a.top - b.top);

    const overlapsX = (rect) => clientX >= rect.left && clientX <= rect.right;

    // Horizontal gap beside a card on the same row.
    for (const row of rows) {
        if (clientY < row.top - rowPad || clientY > row.bottom + rowPad) {
            continue;
        }
        for (const item of row.items) {
            if (item.isDragged) {
                continue;
            }
            const beside = rtl
                ? clientX < item.rect.left - 2
                : clientX > item.rect.right + 2;
            if (beside) {
                const ar = unitGridRect(units[item.index]);
                return {
                    index: item.index + 1,
                    rowBreak: false,
                    // Snap flush beside the neighbour so it tucks in cleanly
                    // instead of overlapping it and shoving it down. keepGridX
                    // stops _withDropGridX from overwriting the snap with the
                    // raw pointer column.
                    gridX: snapBesideAnchor(span, ar.x, ar.w, gridX),
                    keepGridX: true,
                    gridY: ar.y,
                    freePlace: true,
                    anchorIndex: item.index,
                    lineTop: null,
                };
            }
        }
        const blocking = row.items.filter((item) => overlapsX(item.rect));
        const blockingOthers = blocking.filter((item) => !item.isDragged);

        if (!blockingOthers.length) {
            if (blocking.some((item) => item.isDragged)) {
                const others = row.items.filter((item) => !item.isDragged);
                return {
                    index: dragIdx,
                    rowBreak: false,
                    gridX,
                    gridY,
                    freePlace: true,
                    anchorIndex: others.length ? others[0].index : null,
                    lineTop: null,
                };
            }
            const anchors = row.items.filter((item) => !item.isDragged);
            const pool = anchors.length ? anchors : row.items;
            let anchor = pool[0];
            let bestDist = Infinity;
            for (const item of pool) {
                const cx = (item.rect.left + item.rect.right) / 2;
                const dist = Math.abs(clientX - cx);
                if (dist < bestDist) {
                    bestDist = dist;
                    anchor = item;
                }
            }
            // Dropping in the empty part of a card's row → tuck flush beside
            // that card on its row (not at the raw pointer column, which would
            // overlap it and push it down). This is the "put it next to these"
            // case, incl. RTL where the free space is on the card's far side.
            const ar = unitGridRect(units[anchor.index]);
            return {
                index: clientX < anchor.rect.left ? anchor.index : anchor.index + 1,
                rowBreak: false,
                gridX: snapBesideAnchor(span, ar.x, ar.w, gridX),
                keepGridX: true,
                gridY: ar.y,
                freePlace: true,
                anchorIndex: anchor.index,
                lineTop: null,
            };
        }
    }

    // Below a card column or an entire row (include dragged card geometry).
    let rowAbove = null;
    for (const row of rows) {
        if (clientY > row.bottom + 6) {
            rowAbove = row;
        }
    }
    if (rowAbove) {
        let anchor = rowAbove.items[0];
        for (const item of rowAbove.items) {
            if (overlapsX(item.rect)) {
                anchor = item;
                break;
            }
        }
        if (!rowAbove.items.some((item) => overlapsX(item.rect))) {
            let bestDist = Infinity;
            for (const item of rowAbove.items) {
                const cx = (item.rect.left + item.rect.right) / 2;
                const dist = Math.abs(clientX - cx);
                if (dist < bestDist) {
                    bestDist = dist;
                    anchor = item;
                }
            }
        }
        return {
            index: anchor.index + 1,
            rowBreak: true,
            gridX,
            gridY,
            freePlace: true,
            lineTop: rowAbove.bottom + 6,
        };
    }

    return null;
}

export class EditableUnitGrid extends Component {
    static template = xml`
        <div class="o_baha_dash__grid o_baha_dash__grid--edit"
             t-ref="grid"
             t-att-class="{ 'o_baha_edit_grid--dragging': props.dragIndex !== null and props.dragIndex !== undefined }"
             t-on-dragover.prevent="onGridDragOver"
             t-on-drop.prevent="onGridDrop">
            <div t-if="insertPreview.style"
                 class="o_baha_edit_drop_preview"
                 t-att-style="insertPreview.style"/>
            <div t-if="insertPreview.lineTop !== null"
                 class="o_baha_edit_row_insert"
                 t-attf-style="top: {{insertPreview.lineTop}}px;"/>
            <t t-foreach="props.units" t-as="unit" t-key="unit.key">
                <div class="o_baha_dash__cell o_baha_edit_cell"
                     t-att-class="cellClass(unit, unit_index)"
                     t-att-style="unitGridStyle(unit)">
                    <div class="o_baha_edit_cell__chrome"
                         draggable="true"
                         t-on-dragstart="(ev) => this.onDragStart(ev, unit_index)"
                         t-on-dragend="() => this.onDragEnd()">
                        <span class="o_baha_edit_cell__handle" title="اسحب لإعادة الترتيب">
                            <i class="fa fa-arrows"/>
                        </span>
                        <span class="o_baha_edit_cell__label" t-esc="unitLabel(unit)"/>
                        <span class="o_baha_edit_cell__span" t-esc="sizeLabel(unit)"/>
                    </div>
                    <div class="o_baha_edit_cell__body">
                        <t t-if="unit.kind === 'panel'">
                            <div class="o_baha_panel o_baha_panel--group o_baha_panel--edit">
                                <div class="o_baha_panel__head">
                                    <span class="o_baha_panel__title" t-esc="unit.title"/>
                                </div>
                                <div class="o_baha_panel__grid">
                                    <t t-foreach="panelInnerEntries(unit)" t-as="entry" t-key="entry.comp.id">
                                        <div class="o_baha_dash__cell o_baha_panel__inner_cell" t-att-style="innerCompGridStyle(entry)">
                                            <t t-component="props.widgetFor(entry.comp.type)" t-props="props.propsFor(entry.comp)"/>
                                        </div>
                                    </t>
                                </div>
                            </div>
                        </t>
                        <t t-else="">
                            <t t-component="props.widgetFor(unit.comp.type)" t-props="props.propsFor(unit.comp)"/>
                        </t>
                    </div>
                    <div class="o_baha_edit_cell__frame"/>
                    <div class="o_baha_edit_cell__resize_edge o_baha_edit_cell__resize_edge--n"
                         title="اسحب الحافة العلوية"
                         t-on-pointerdown="(ev) => this.onResizeStart(ev, unit_index, 'n')"
                         t-on-dragstart.stop.prevent=""/>
                    <div class="o_baha_edit_cell__resize_edge o_baha_edit_cell__resize_edge--e"
                         title="اسحب الحافة اليمنى"
                         t-on-pointerdown="(ev) => this.onResizeStart(ev, unit_index, 'e')"
                         t-on-dragstart.stop.prevent=""/>
                    <div class="o_baha_edit_cell__resize_edge o_baha_edit_cell__resize_edge--s"
                         title="اسحب الحافة السفلية"
                         t-on-pointerdown="(ev) => this.onResizeStart(ev, unit_index, 's')"
                         t-on-dragstart.stop.prevent=""/>
                    <div class="o_baha_edit_cell__resize_edge o_baha_edit_cell__resize_edge--w"
                         title="اسحب الحافة اليسرى"
                         t-on-pointerdown="(ev) => this.onResizeStart(ev, unit_index, 'w')"
                         t-on-dragstart.stop.prevent=""/>
                </div>
            </t>
        </div>`;

    static components = WIDGETS;
    static props = [
        "units",
        "widgetFor",
        "propsFor",
        "dragIndex",
        "dragInsertIndex",
        "onDragStart",
        "onDragOver",
        "onDrop",
        "onDragEnd",
        "onResize",
    ];

    setup() {
        this.gridRef = useRef("grid");
        this._resize = null;
        this._resizeEl = null;
        this._dragOffsetY = 0;
        this._dragAutoScroll = null;
        this._dragWheelScroll = null;
        this.insertPreview = useState({ lineTop: null, rowBreak: false, style: null });
        onWillUnmount(() => {
            this._stopResize();
            this._stopDragScroll();
        });
    }

    unitLabel(unit) {
        return unitLabel(unit);
    }

    effectiveSpan(unit) {
        return effectiveSpan(unit);
    }

    effectiveRows(unit) {
        return effectiveRows(unit);
    }

    sizeLabel(unit) {
        return `${effectiveSpan(unit)}×${effectiveRows(unit)}`;
    }

    innerSizeLabel(entry) {
        return `${entry.w}×${entry.h}`;
    }

    panelInnerEntries(unit) {
        return panelInnerEntries(unit);
    }

    innerCompGridStyle(entry) {
        return innerCompGridStyle(entry);
    }

    unitGridStyle(unit) {
        return unitGridStyle(unit);
    }

    cellClass(unit, index) {
        const cls = {};
        const insertAt = this.props.dragInsertIndex;
        const dragging = this.props.dragIndex;
        if (dragging === index) {
            cls["o_baha_edit_cell--dragging"] = true;
        }
        if (insertAt === index && dragging !== index) {
            cls["o_baha_edit_cell--drop-before"] = true;
        }
        if (insertAt === index + 1 && dragging !== index) {
            cls["o_baha_edit_cell--drop-after"] = true;
        }
        const lim = resizeLimits();
        const w = effectiveSpan(unit);
        const h = effectiveRows(unit);
        if (this._resize && this._resize.index === index) {
            cls["o_baha_edit_cell--resizing"] = true;
            if (w <= lim.minW || w >= lim.maxW) {
                cls["o_baha_edit_cell--at-limit-w"] = true;
            }
            if (h <= lim.minH || h >= lim.maxH) {
                cls["o_baha_edit_cell--at-limit-h"] = true;
            }
        }
        return cls;
    }

    onDragStart(ev, index) {
        ev.dataTransfer.effectAllowed = "move";
        ev.dataTransfer.setData("text/plain", String(index));
        const cell = ev.currentTarget?.closest?.(".o_baha_edit_cell");
        const rect = cell?.getBoundingClientRect?.();
        this._dragOffsetY = rect ? Math.max(0, ev.clientY - rect.top) : 0;
        this._startDragScroll();
        this.props.onDragStart(index);
    }

    _clearInsertPreview() {
        this.insertPreview.lineTop = null;
        this.insertPreview.rowBreak = false;
        this.insertPreview.style = null;
    }

    _clusterVisualRows(cells) {
        const rowPad = 18;
        const entries = cells.map((el, index) => ({
            index,
            rect: el.getBoundingClientRect(),
        }));
        entries.sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
        const rows = [];
        for (const entry of entries) {
            let row = rows.find((r) => Math.abs(r.top - entry.rect.top) <= rowPad);
            if (!row) {
                row = { top: entry.rect.top, bottom: entry.rect.bottom, indices: [] };
                rows.push(row);
            }
            row.top = Math.min(row.top, entry.rect.top);
            row.bottom = Math.max(row.bottom, entry.rect.bottom);
            row.indices.push(entry.index);
        }
        for (const row of rows) {
            row.indices.sort((a, b) => a - b);
        }
        rows.sort((a, b) => a.top - b.top);
        return rows;
    }

    _previewUnitForTarget(target) {
        const from = this.props.dragIndex;
        const source = this.props.units || [];
        if (from === null || from === undefined || !source[from]) {
            return null;
        }
        // Same code path as the real drop (dashboard.js onEditDrop), so the
        // ghost always previews exactly what the drop will commit.
        const result = applyDropToUnits(source, from, target);
        if (!result) {
            return null;
        }
        return result.units[result.placeAt] || null;
    }

    _dropPreviewStyle(target) {
        const unit = this._previewUnitForTarget(target);
        if (!unit) {
            return null;
        }
        const cells = [...(this.gridRef.el?.querySelectorAll(":scope > .o_baha_edit_cell") || [])];
        const sourceCell = cells[this.props.dragIndex];
        const sourceRect = sourceCell?.getBoundingClientRect();
        const previewHeight = sourceRect?.height ? Math.round(sourceRect.height) : null;
        return `${unitGridStyle(unit)}${previewHeight ? ` --preview-h: ${previewHeight}px;` : ""}`;
    }

    _applyInsertPreview(target) {
        this.insertPreview.lineTop = target.lineTop;
        this.insertPreview.rowBreak = target.rowBreak;
        this.insertPreview.style = this._dropPreviewStyle(target);
    }

    _withDropGridX(target, clientX) {
        const grid = this.gridRef.el;
        const units = this.props.units || [];
        const dragIdx = this.props.dragIndex;
        if (!grid || dragIdx == null || dragIdx === undefined || target.keepGridX) {
            return target;
        }
        const span = effectiveSpan(units[dragIdx]);
        const rtl = getComputedStyle(grid).direction === "rtl";
        return {
            ...target,
            gridX: clientXToGridX(clientX, grid, span, rtl),
        };
    }

    /** Drop on the lower half of a card: if a neighbour column continues below
     *  it (e.g. a tall card beside a stacked pair), insert below the card in
     *  ITS column only; a full row break there would land the card under the
     *  whole block and reflow unrelated cards. */
    _belowCellTarget(cellIdx, insertIndex, cellRect, lineTopFromY) {
        const units = this.props.units || [];
        const dragIdx = this.props.dragIndex;
        const cellGrid = unitGridRect(units[cellIdx] || {});
        const bandBottom = cellGrid.y + cellGrid.h;
        const movedSpan = effectiveSpan(units[dragIdx] || {});
        const hasDeeperMate = units.some((u, k) => {
            if (k === cellIdx || k === dragIdx) {
                return false;
            }
            const r = unitGridRect(u);
            return r.y < bandBottom && r.y + r.h > bandBottom;
        });
        if (hasDeeperMate) {
            return {
                index: insertIndex,
                rowBreak: false,
                freePlace: true,
                keepGridX: true,
                gridX: clampGridX(cellGrid.x, movedSpan),
                gridY: bandBottom,
                anchorIndex: null,
                lineTop: lineTopFromY(cellRect.bottom + 6),
            };
        }
        return {
            index: insertIndex,
            rowBreak: true,
            breakY: bandBottom,
            lineTop: lineTopFromY(cellRect.bottom + 6),
        };
    }

    /**
     * Map pointer position to insert index (0..units.length).
     * Supports same-row gaps, between-row drops (new line), and bottom-half row break.
     */
    _resolveInsertTarget(clientX, clientY) {
        const grid = this.gridRef.el;
        const units = this.props.units || [];
        const dragIdx = this.props.dragIndex;
        const empty = { index: 0, rowBreak: false, lineTop: null, gridX: 0 };
        if (!grid || dragIdx === null || dragIdx === undefined) {
            return empty;
        }
        const cells = [...grid.querySelectorAll(":scope > .o_baha_edit_cell")];
        if (!cells.length) {
            return empty;
        }
        const gridRect = grid.getBoundingClientRect();
        const rtl = getComputedStyle(grid).direction === "rtl";
        const rowPad = 16;
        const gapReach = 320;
        const lineTopFromY = (y) => Math.round(y - gridRect.top + grid.scrollTop);
        const finish = (target) => {
            const t = this._withDropGridX(target, clientX);
            if (t.gridY == null) {
                // Pointer grid row: the anchored-drop fallback in
                // applyDropToUnits uses it instead of guessing from neighbours.
                t.gridY = clientYToGridYFromCells(clientY, grid, cells, units, dragIdx, this._dragOffsetY);
            }
            return t;
        };
        const rows = this._clusterVisualRows(cells);

        const dragCell = cells[dragIdx];
        if (dragCell) {
            const drect = dragCell.getBoundingClientRect();
            if (
                clientX >= drect.left && clientX <= drect.right
                && clientY >= drect.top && clientY <= drect.bottom
            ) {
                const midY = drect.top + drect.height * 0.55;
                if (clientY >= midY) {
                    return finish(this._belowCellTarget(dragIdx, dragIdx + 1, drect, lineTopFromY));
                }
                let anchorIndex = null;
                for (const row of rows) {
                    if (clientY < row.top - rowPad || clientY > row.bottom + rowPad) {
                        continue;
                    }
                    const others = row.indices.filter((i) => i !== dragIdx);
                    if (others.length) {
                        anchorIndex = others[0];
                    }
                    break;
                }
                return finish({
                    index: dragIdx,
                    rowBreak: false,
                    lineTop: null,
                    anchorIndex,
                });
            }
        }

        const overCellIndex = (() => {
            for (let i = 0; i < cells.length; i++) {
                if (i === dragIdx) {
                    continue;
                }
                const rect = cells[i].getBoundingClientRect();
                if (
                    clientX >= rect.left && clientX <= rect.right
                    && clientY >= rect.top && clientY <= rect.bottom
                ) {
                    return i;
                }
            }
            return null;
        })();

        if (overCellIndex === null) {
            const emptyTarget = resolveVisualEmptyDrop(
                clientX, clientY, cells, units, dragIdx, grid, rtl, this._dragOffsetY
            );
            if (emptyTarget) {
                return finish({
                    ...emptyTarget,
                    lineTop: emptyTarget.lineTop != null
                        ? lineTopFromY(emptyTarget.lineTop)
                        : null,
                });
            }
        }

        // Drop in the gutter between visual rows → insert on a new line.
        for (let r = 0; r < rows.length - 1; r++) {
            const gapTop = rows[r].bottom + 4;
            const gapBottom = rows[r + 1].top - 4;
            if (gapBottom <= gapTop) {
                continue;
            }
            if (clientY >= gapTop && clientY <= gapBottom) {
                const index = rows[r + 1].indices[0];
                const others = rows[r + 1].indices.filter((k) => k !== dragIdx);
                const breakY = others.length
                    ? Math.min(...others.map((k) => unitGridRect(units[k]).y))
                    : null;
                return finish({
                    index,
                    rowBreak: true,
                    breakY,
                    lineTop: lineTopFromY((gapTop + gapBottom) / 2),
                });
            }
        }

        // Above first row / below last row.
        if (rows.length && clientY < rows[0].top - rowPad) {
            return finish({
                index: 0,
                rowBreak: true,
                breakY: 0,
                lineTop: lineTopFromY(rows[0].top - 8),
            });
        }
        if (rows.length && clientY > rows[rows.length - 1].bottom + rowPad) {
            return finish({
                index: units.length,
                rowBreak: true,
                lineTop: lineTopFromY(rows[rows.length - 1].bottom + 8),
            });
        }

        for (let i = 0; i < cells.length; i++) {
            if (i === dragIdx) {
                continue;
            }
            const rect = cells[i].getBoundingClientRect();
            const onRow = clientY >= rect.top - rowPad && clientY <= rect.bottom + rowPad;
            if (!onRow) {
                continue;
            }

            if (clientX >= rect.left && clientX <= rect.right) {
                const midY = rect.top + rect.height * 0.55;
                if (clientY >= midY) {
                    return finish(this._belowCellTarget(i, i + 1, rect, lineTopFromY));
                }
                const midX = rect.left + rect.width / 2;
                const insertBefore = rtl ? clientX > midX : clientX < midX;
                return finish({
                    index: insertBefore ? i : i + 1,
                    rowBreak: false,
                    lineTop: null,
                    anchorIndex: i,
                });
            }

            const span = effectiveSpan(units[i]);
            if (span < 12) {
                const inFlowGap = rtl
                    ? clientX < rect.left && rect.left - clientX <= gapReach
                    : clientX > rect.right && clientX - rect.right <= gapReach;
                if (inFlowGap) {
                    return finish({
                        index: i + 1,
                        rowBreak: false,
                        lineTop: null,
                        anchorIndex: i,
                    });
                }
            }
        }

        for (let i = 0; i < cells.length; i++) {
            if (i === dragIdx) {
                continue;
            }
            const rect = cells[i].getBoundingClientRect();
            if (clientY < rect.top - rowPad) {
                return finish({
                    index: i,
                    rowBreak: true,
                    breakY: unitGridRect(units[i]).y,
                    lineTop: lineTopFromY(rect.top - 8),
                });
            }
        }
        return finish({
            index: units.length,
            rowBreak: true,
            lineTop: lineTopFromY(gridRect.height - 8),
        });
    }

    onGridDragOver(ev) {
        if (this.props.dragIndex === null || this.props.dragIndex === undefined) {
            return;
        }
        ev.dataTransfer.dropEffect = "move";
        this._autoScrollForDrag(ev);
        const target = this._resolveInsertTarget(ev.clientX, ev.clientY);
        this._applyInsertPreview(target);
        this.props.onDragOver(target.index);
    }

    onGridDrop(ev) {
        if (this.props.dragIndex === null || this.props.dragIndex === undefined) {
            return;
        }
        this._stopDragScroll();
        const target = this._resolveInsertTarget(ev.clientX, ev.clientY);
        this._dragOffsetY = 0;
        this._clearInsertPreview();
        this.props.onDrop({
            index: target.index,
            rowBreak: target.rowBreak,
            breakY: target.breakY,
            gridX: target.gridX,
            gridY: target.gridY,
            freePlace: target.freePlace,
            anchorIndex: target.anchorIndex,
        });
    }

    onDragEnd() {
        this._stopDragScroll();
        this._dragOffsetY = 0;
        this._clearInsertPreview();
        this.props.onDragEnd();
    }

    _scrollContainer() {
        let el = this.gridRef.el;
        while (el) {
            const style = getComputedStyle(el);
            const scrollable = /(auto|scroll|overlay)/.test(style.overflowY)
                && el.scrollHeight > el.clientHeight + 1;
            if (scrollable) {
                return el;
            }
            el = el.parentElement;
        }
        return document.scrollingElement || document.documentElement;
    }

    _scrollBy(container, deltaY) {
        if (!deltaY) {
            return;
        }
        container.scrollTop += deltaY;
    }

    _autoScrollForDrag(ev) {
        const container = this._scrollContainer();
        const y = ev.clientY;
        const vh = window.innerHeight;
        let delta = 0;
        if (y < DRAG_SCROLL_EDGE) {
            delta = -DRAG_SCROLL_MAX_STEP * (1 - Math.max(0, y) / DRAG_SCROLL_EDGE);
        } else if (y > vh - DRAG_SCROLL_EDGE) {
            delta = DRAG_SCROLL_MAX_STEP * (1 - Math.max(0, vh - y) / DRAG_SCROLL_EDGE);
        }
        this._scrollBy(container, delta);
    }

    _onDocumentDragOver = (ev) => {
        ev.preventDefault();
        this._autoScrollForDrag(ev);
    };

    _onDragWheel = (ev) => {
        const container = this._scrollContainer();
        this._scrollBy(container, ev.deltaY);
        ev.preventDefault();
    };

    _startDragScroll() {
        if (this._dragAutoScroll) {
            return;
        }
        this._dragAutoScroll = this._onDocumentDragOver;
        this._dragWheelScroll = this._onDragWheel;
        document.body.classList.add("o_baha_edit_dragging");
        document.addEventListener("dragover", this._dragAutoScroll);
        document.addEventListener("wheel", this._dragWheelScroll, { passive: false });
    }

    _stopDragScroll() {
        if (this._dragAutoScroll) {
            document.removeEventListener("dragover", this._dragAutoScroll);
            this._dragAutoScroll = null;
        }
        if (this._dragWheelScroll) {
            document.removeEventListener("wheel", this._dragWheelScroll);
            this._dragWheelScroll = null;
        }
        document.body.classList.remove("o_baha_edit_dragging");
    }

    _gridMetrics(innerGridEl) {
        const grid = innerGridEl || this.gridRef.el;
        if (!grid) {
            return { colWidth: 80, rowStep: GRID_ROW_HEIGHT, gap: GRID_GAP, rowH: GRID_ROW_HEIGHT };
        }
        const style = getComputedStyle(grid);
        const gap = parseFloat(style.gap || style.columnGap || GRID_GAP) || GRID_GAP;
        const padL = parseFloat(style.paddingLeft || 0);
        const padR = parseFloat(style.paddingRight || 0);
        const innerW = grid.clientWidth - padL - padR;
        const colWidth = Math.max(32, (innerW - gap * 11) / 12);
        const rowH = parseFloat(style.getPropertyValue("--inner-row-h") || style.getPropertyValue("--row-h")) || GRID_ROW_HEIGHT;
        return { colWidth, rowStep: rowH, gap, rowH };
    }

    onResizeStart(ev, index, axis) {
        ev.preventDefault();
        ev.stopPropagation();
        const unit = this.props.units[index];
        const grid = this.gridRef.el;
        if (!unit || !grid || !axis) {
            return;
        }
        this._beginResize(ev, {
            mode: "outer",
            index,
            unit,
            axis,
            gridEl: grid,
            cellSelector: ".o_baha_edit_cell",
        });
    }

    _beginResize(ev, ctx) {
        const { unit, axis, gridEl, cellSelector } = ctx;
        const cellEl = ev.currentTarget.closest(cellSelector || ".o_baha_edit_cell");
        const handleEl = ev.currentTarget;
        const isRtl = getComputedStyle(this.gridRef.el).direction === "rtl";
        const startW = ctx.mode === "inner" ? sanitizeSpan(ctx.comp.col_span ?? 12) : effectiveSpan(unit);
        const startH = ctx.mode === "inner" ? sanitizeRows(ctx.comp.row_span ?? 1) : effectiveRows(unit);
        const metrics = this._gridMetrics(ctx.mode === "inner" ? gridEl : null);
        let startGridX = unit.grid_x ?? 0;
        if (ctx.mode === "inner") {
            const innerPos = computePanelInnerLayout(unit.components)[ctx.compIndex];
            startGridX = innerPos?.x ?? 0;
        }
        const cellRect = cellEl ? cellEl.getBoundingClientRect() : null;
        this._resizeEl = cellEl;
        this._resize = {
            ...ctx,
            handleEl,
            startX: ev.clientX,
            startY: ev.clientY,
            startW,
            startH,
            startGridX,
            startRect: cellRect
                ? {
                    left: cellRect.left,
                    right: cellRect.right,
                    top: cellRect.top,
                    bottom: cellRect.bottom,
                }
                : null,
            startPixelW: cellRect ? cellRect.width : pixelWidthForSpan(startW, metrics),
            startPixelH: rowSpanPixelHeight(startH, metrics),
            currentW: startW,
            currentH: startH,
            colWidth: metrics.colWidth,
            rowStep: metrics.rowStep,
            gap: metrics.gap,
            pointerId: ev.pointerId,
            rtl: isRtl,
        };
        if (handleEl.setPointerCapture) {
            try {
                handleEl.setPointerCapture(ev.pointerId);
            } catch {
                /* synthetic / unsupported pointer — resize still works via document listeners */
            }
        }
        document.body.classList.add("o_baha_edit_resizing");
        document.body.dataset.bahaResizeAxis = axis;
        if (cellEl) {
            cellEl.classList.add("o_baha_edit_cell--resizing");
        }
        document.addEventListener("pointermove", this._onResizeMove, { passive: false });
        document.addEventListener("pointerup", this._onResizeEnd);
        document.addEventListener("pointercancel", this._onResizeEnd);
    }

    _clampPixelWidth(rawW) {
        const lim = resizeLimits();
        const metrics = {
            colWidth: this._resize?.colWidth ?? 80,
            gap: this._resize?.gap ?? GRID_GAP,
        };
        const minW = pixelWidthForSpan(lim.minW, metrics);
        const maxW = pixelWidthForSpan(lim.maxW, metrics);
        return Math.max(minW, Math.min(maxW, rawW));
    }

    _clampPixelHeight(rawH) {
        const lim = resizeLimits();
        const metrics = {
            rowStep: this._resize?.rowStep ?? GRID_ROW_HEIGHT,
            gap: this._resize?.gap ?? GRID_GAP,
        };
        const minH = rowSpanPixelHeight(lim.minH, metrics);
        const maxH = rowSpanPixelHeight(lim.maxH, metrics);
        return Math.max(minH, Math.min(maxH, rawH));
    }

    /** Keep the opposite edge fixed while the dragged edge follows the pointer (vertical only). */
    _anchorTranslate(axis, pixelH) {
        const { startPixelH } = this._resize || {};
        const deltaH = (pixelH ?? startPixelH) - startPixelH;
        let ty = 0;
        if (axis === "n") {
            ty = -deltaH;
        }
        return { ty };
    }

    _applyResizePreview(w, h, pixelH) {
        const el = this._resizeEl;
        if (!el) {
            return;
        }
        const axis = this._resize?.axis;
        const startGridX = this._resize?.startGridX ?? 0;
        const startW = this._resize?.startW ?? w;
        el.style.setProperty("--span", String(w));
        el.style.setProperty("--rows", String(h));
        if (axis === "w" || axis === "e") {
            el.style.setProperty("--grid-x", String(gridXAfterResize(startGridX, startW, w, axis)));
        }
        if (pixelH != null && pixelH > 0) {
            const clamped = Math.round(this._clampPixelHeight(pixelH));
            el.style.minHeight = `${clamped}px`;
            pixelH = clamped;
        } else {
            const hExpr = `calc(${h} * var(--row-h, 72px) + max(0, ${h} - 1) * var(--grid-gap, 16px))`;
            el.style.minHeight = hExpr;
        }
        const { ty } = this._anchorTranslate(axis, pixelH);
        if (ty) {
            el.style.transform = `translateY(${Math.round(ty)}px)`;
        } else {
            el.style.removeProperty("transform");
        }
        const badge = el.querySelector(".o_baha_edit_cell__span");
        if (badge) {
            badge.textContent = `${w}×${h}`;
        }
    }

    _clearResizePreview() {
        const el = this._resizeEl;
        const unit = this._resize?.unit;
        if (!el) {
            return;
        }
        el.style.removeProperty("min-height");
        el.style.removeProperty("transform");
        if (unit && this._resize?.mode === "inner") {
            const entry = panelInnerEntries(unit).find((item) => item.compIndex === this._resize.compIndex);
            if (entry) {
                for (const token of innerCompGridStyle(entry).split(";")) {
                    const part = token.trim();
                    if (!part) {
                        continue;
                    }
                    const sep = part.indexOf(":");
                    if (sep === -1) {
                        continue;
                    }
                    el.style.setProperty(part.slice(0, sep).trim(), part.slice(sep + 1).trim());
                }
                const badge = el.querySelector(".o_baha_edit_cell__span");
                if (badge) {
                    badge.textContent = this.innerSizeLabel(entry);
                }
            }
        } else if (unit) {
            for (const token of unitGridStyle(unit).split(";")) {
                const part = token.trim();
                if (!part) {
                    continue;
                }
                const sep = part.indexOf(":");
                if (sep === -1) {
                    continue;
                }
                el.style.setProperty(part.slice(0, sep).trim(), part.slice(sep + 1).trim());
            }
            const badge = el.querySelector(".o_baha_edit_cell__span");
            if (badge) {
                badge.textContent = this.sizeLabel(unit);
            }
        } else {
            el.style.removeProperty("--grid-x");
            el.style.removeProperty("--span");
            el.style.removeProperty("--rows");
        }
    }

    _widthFromPixelDelta(pixelDelta, colStep) {
        return gridSnapDelta(pixelDelta, colStep);
    }

    _onResizeMove = (ev) => {
        if (!this._resize) {
            return;
        }
        ev.preventDefault();
        const {
            startW, startH, startPixelW, startPixelH, startRect,
            colWidth, rowStep, gap, axis, unit, comp, mode,
        } = this._resize;
        const metrics = { colWidth, gap, rowStep };
        const colStep = colWidth + gap;
        const rowSnapStep = rowStep + gap;
        const sizeUnit = mode === "inner" ? comp : unit;
        let w = startW;
        let h = startH;
        let pixelW = startPixelW;
        let pixelH = startPixelH;

        if (axis === "e" && startRect) {
            pixelW = this._clampPixelWidth(ev.clientX - startRect.left);
            w = clampSpan(
                startW + this._widthFromPixelDelta(pixelW - startPixelW, colStep),
                sizeUnit
            );
        } else if (axis === "w" && startRect) {
            pixelW = this._clampPixelWidth(startRect.right - ev.clientX);
            w = clampSpan(
                startW + this._widthFromPixelDelta(pixelW - startPixelW, colStep),
                sizeUnit
            );
        } else if (axis === "s" && startRect) {
            pixelH = this._clampPixelHeight(ev.clientY - startRect.top);
            h = clampRows(
                startH + gridSnapDelta(pixelH - startPixelH, rowSnapStep),
                sizeUnit
            );
            pixelH = rowSpanPixelHeight(h, metrics);
        } else if (axis === "n" && startRect) {
            pixelH = this._clampPixelHeight(startRect.bottom - ev.clientY);
            h = clampRows(
                startH + gridSnapDelta(pixelH - startPixelH, rowSnapStep),
                sizeUnit
            );
            pixelH = rowSpanPixelHeight(h, metrics);
        }

        this._resize.currentW = w;
        this._resize.currentH = h;
        this._applyResizePreview(w, h, pixelH);
    };

    _releasePointerCapture() {
        const { handleEl, pointerId } = this._resize || {};
        if (handleEl?.releasePointerCapture && pointerId != null) {
            try {
                handleEl.releasePointerCapture(pointerId);
            } catch {
                /* already released */
            }
        }
    }

    _onResizeEnd = (ev) => {
        if (this._resize?.handleEl && ev?.pointerId != null) {
            try {
                this._resize.handleEl.releasePointerCapture(ev.pointerId);
            } catch {
                /* ignore */
            }
        }
        document.removeEventListener("pointermove", this._onResizeMove);
        document.removeEventListener("pointerup", this._onResizeEnd);
        document.removeEventListener("pointercancel", this._onResizeEnd);
        document.body.classList.remove("o_baha_edit_resizing");
        delete document.body.dataset.bahaResizeAxis;
        if (this._resizeEl) {
            this._resizeEl.classList.remove("o_baha_edit_cell--resizing");
        }
        if (this._resize) {
            const { index, compIndex, currentW, currentH, startW, startH, mode } = this._resize;
            if (currentW !== startW || currentH !== startH) {
                const payload = {
                    col_span: currentW,
                    row_span: currentH,
                    resizeAxis: this._resize.axis,
                };
                this.props.onResize(index, payload);
            }
            this._clearResizePreview();
        }
        this._resize = null;
        this._resizeEl = null;
    };

    _stopResize() {
        if (!this._resize) {
            return;
        }
        document.removeEventListener("pointermove", this._onResizeMove);
        document.removeEventListener("pointerup", this._onResizeEnd);
        document.removeEventListener("pointercancel", this._onResizeEnd);
        document.body.classList.remove("o_baha_edit_resizing");
        delete document.body.dataset.bahaResizeAxis;
        this._clearResizePreview();
        this._resize = null;
        this._resizeEl = null;
    }
}
