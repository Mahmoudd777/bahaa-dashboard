/** @odoo-module **/

import { Component, onMounted, onWillUnmount, onPatched, useRef, xml } from "@odoo/owl";
import { UnitContent } from "./unit_content";
import { cloneUnits, effectiveRows, effectiveSpan } from "./grid_math";

const GS_COLS = 12;
// Match the VIEW grid's vertical rhythm exactly. View uses `grid-auto-rows: 72px`
// with a 16px row-gap, i.e. an 88px pitch per row: a card of R rows is
// R*72 + (R-1)*16 = R*88 - 16 px tall, and a card at grid_y=Y sits at Y*88 px.
// Gridstack's item height is h*cellHeight and top is y*cellHeight, and its 8px
// content inset yields the same 16px gutter — so cellHeight MUST be 88 (not 72)
// for positions, heights and spacing to line up with the view grid.
const GS_CELL_H = 8;
const GS_MARGIN = 8;    // 8px content inset each side = 16px gutters (= view gap)

/**
 * Edit-mode grid backed by Gridstack.js. Renders each card with the SAME
 * `UnitContent` the view grid uses, so a card looks identical in both modes —
 * only a light drag/resize chrome overlays it. `sizeToContent` lets cards grow
 * to fit their content exactly like the view grid's `auto` rows, so nothing is
 * clipped.
 *
 * OWL/Gridstack DOM ownership: items are rendered once from a non-reactive
 * snapshot; OWL never re-positions them (its vdom never changes), so it does
 * not fight Gridstack's inline styles. Layout flows OUT via `props.onChange`.
 */
export class GridstackEditor extends Component {
    static template = xml`
        <div class="grid-stack o_baha_gs" t-ref="grid">
            <t t-foreach="items" t-as="unit" t-key="unit.key">
                <div class="grid-stack-item o_baha_gs_item" t-att-data-key="unit.key">
                    <div class="grid-stack-item-content o_baha_dash__cell o_baha_gs_cell">
                        <UnitContent unit="unit" widgetFor="props.widgetFor" propsFor="props.propsFor"/>
                        <div class="o_baha_gs_tag">
                            <i class="fa fa-arrows"/>
                            <span class="o_baha_gs_size" t-att-data-key="unit.key" t-esc="sizeLabel(unit)"/>
                        </div>
                        <button class="o_baha_gs_remove" title="إزالة البطاقة"
                                t-on-pointerdown.stop=""
                                t-on-mousedown.stop=""
                                t-on-click.stop="() => props.onRemove(unit.key)">
                            <i class="fa fa-times"/>
                        </button>
                    </div>
                </div>
            </t>
        </div>`;

    static components = { UnitContent };
    static props = ["units", "widgetFor", "propsFor", "float", "onChange", "onRemove"];

    setup() {
        this.gridRef = useRef("grid");
        this.items = cloneUnits(this.props.units || []);
        this.grid = null;
        this._appliedFloat = this.props.float;
        onMounted(() => this._init());
        onWillUnmount(() => this._destroy());
        onPatched(() => {
            if (this.grid && this.props.float !== this._appliedFloat) {
                this._appliedFloat = this.props.float;
                this.grid.float(this.props.float);
                if (!this.props.float) {
                    this.grid.compact();
                }
                this._emit();
            }
        });
    }

    sizeLabel(unit) {
        return `${effectiveSpan(unit)}×${effectiveRows(unit)}`;
    }

    _init() {
        const el = this.gridRef.el;
        const GridStack = window.GridStack;
        if (!el || !GridStack) {
            return;
        }
        for (const cell of el.querySelectorAll(":scope > .grid-stack-item")) {
            const unit = this.items.find((u) => u.key === cell.dataset.key);
            if (!unit) {
                continue;
            }
            cell.setAttribute("gs-x", unit.grid_x ?? 0);
            cell.setAttribute("gs-y", unit.grid_y ?? 0);
            cell.setAttribute("gs-w", effectiveSpan(unit));
            cell.setAttribute("gs-h", effectiveRows(unit));
        }
        // float:true on init loads exact saved positions (entering edit never
        // silently dirties); the user's gravity is applied right after.
        this.grid = GridStack.init(
            {
                column: GS_COLS,
                cellHeight: GS_CELL_H,
                margin: GS_MARGIN,
                float: true,
                animate: true,
                // The dashboard is right-to-left; the view grid places grid_x=0
                // on the RIGHT. Force Gridstack to match so positions/order are
                // identical between edit and view (grid_x semantics unchanged).
                rtl: true,
                // Drag by grabbing anywhere on the card (no separate title bar);
                // edges resize.
                resizable: { handles: "e, se, s, sw, w, n, ne, nw" },
                // Don't auto-scroll the page while dragging near the edges — it
                // races up/down and feels jumpy. The user scrolls manually
                // (mouse wheel) to reach off-screen positions instead.
                draggable: { scroll: false },
            },
            el
        );
        this.grid.float(this.props.float);
        this._appliedFloat = this.props.float;
        // Cards render at their saved size (row_span). cellHeight 88 = the view
        // grid's row pitch (72 row + 16 gap), so a card of R rows is the same
        // height in both modes — no content measuring, no surprises.
        this.grid.on("change", () => this._emit());
    }

    _emit() {
        if (!this.grid || !this.gridRef.el) {
            return;
        }
        const layout = {};
        for (const cell of this.gridRef.el.querySelectorAll(":scope > .grid-stack-item")) {
            const node = cell.gridstackNode;
            const key = cell.dataset.key;
            if (!node || !key) {
                continue;
            }
            layout[key] = {
                grid_x: node.x,
                grid_y: node.y,
                col_span: node.w,
                row_span: node.h,
            };
            const badge = cell.querySelector(".o_baha_gs_size");
            if (badge) {
                badge.textContent = `${node.w}×${node.h}`;
            }
        }
        this.props.onChange(layout);
    }

    _destroy() {
        if (this.grid) {
            this.grid.destroy(false);
            this.grid = null;
        }
    }
}
