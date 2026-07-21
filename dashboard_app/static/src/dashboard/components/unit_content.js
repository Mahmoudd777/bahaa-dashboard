/** @odoo-module **/

import { Component, useState, xml } from "@odoo/owl";
import { WIDGETS } from "./widgets";
import { innerCompGridStyle, panelInnerEntries } from "./grid_math";
import { isClickable, openItem } from "./click_helpers";

/**
 * Renders the inner content of a single layout unit — a grouped `panel`
 * (titled box with its own inner grid) or a standalone `comp` widget.
 *
 * Shared by BOTH the view grid (UnitGrid) and the edit grid (GridstackEditor)
 * so a card looks pixel-identical in both modes; only the outer positioning /
 * drag chrome differs.
 */
export class UnitContent extends Component {
    static template = xml`
        <t t-if="props.unit.kind === 'panel'">
            <div class="o_baha_panel o_baha_panel--group">
                <div class="o_baha_panel__head">
                    <span class="o_baha_panel__title" t-esc="props.unit.title"/>
                    <div class="o_baha_panel__headtools">
                        <div class="o_baha_legend">
                            <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>مسار صحيح</span>
                            <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>في خطر</span>
                            <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر</span>
                        </div>
                        <i class="fa fa-expand o_baha_panel__expand"/>
                        <span class="o_baha_panel__menuwrap">
                            <i class="fa fa-ellipsis-v o_baha_panel__menu"
                               t-att-class="{ 'o_baha_panel__menu--active': drillItems.length,
                                              'o_baha_panel__menu--on': state.menuOpen }"
                               t-att-role="drillItems.length ? 'button' : undefined"
                               t-att-tabindex="drillItems.length ? 0 : undefined"
                               t-att-title="drillItems.length ? 'عرض بيانات هذا المكوّن' : ''"
                               t-on-click="toggleMenu"
                               t-on-keydown="onMenuKeydown"/>
                            <div t-if="state.menuOpen" class="o_baha_panel__dropdown">
                                <t t-foreach="drillItems" t-as="d" t-key="d_index">
                                    <button class="o_baha_panel__dropitem"
                                            t-on-click="() => this.pickDrill(d)">
                                        <i class="fa fa-table"/><span t-esc="d.label"/>
                                    </button>
                                </t>
                            </div>
                        </span>
                    </div>
                </div>
                <div class="o_baha_panel__grid">
                    <t t-foreach="entries()" t-as="entry" t-key="entry.comp.id">
                        <div class="o_baha_dash__cell o_baha_panel__inner_cell" t-att-style="innerStyle(entry)">
                            <t t-component="props.widgetFor(entry.comp.type)" t-props="props.propsFor(entry.comp)"/>
                        </div>
                    </t>
                </div>
            </div>
        </t>
        <t t-else="">
            <t t-component="props.widgetFor(props.unit.comp.type)" t-props="props.propsFor(props.unit.comp)"/>
        </t>`;

    static components = WIDGETS;
    static props = ["unit", "widgetFor", "propsFor"];

    setup() {
        this.state = useState({ menuOpen: false });
    }

    entries() {
        return panelInnerEntries(this.props.unit);
    }
    innerStyle(entry) {
        return innerCompGridStyle(entry);
    }

    /** Everything drillable inside this panel, gathered from its components.
     *  The panel's ⋮ is the ONLY way in — the cards and bars themselves are
     *  inert, so a figure never behaves like a hidden button. */
    get drillItems() {
        const out = [];
        for (const comp of this.props.unit.components || []) {
            for (const item of (comp.data && comp.data.items) || []) {
                if (isClickable(item)) {
                    out.push({
                        label: item.label || comp.title || "تفاصيل",
                        record: item.record,
                        aggregate: item.aggregate,
                    });
                }
            }
        }
        return out;
    }

    /** Handlers live on the widget props, so borrow them from any component. */
    _openHandlers() {
        const first = (this.props.unit.components || [])[0];
        const p = first ? this.props.propsFor(first) : {};
        return [p.onOpenRecord, p.onOpenDrilldown];
    }

    toggleMenu() {
        const items = this.drillItems;
        if (!items.length) {
            return;
        }
        if (items.length === 1) {
            this.pickDrill(items[0]);
            return;
        }
        this.state.menuOpen = !this.state.menuOpen;
    }
    onMenuKeydown(ev) {
        if (ev.key === "Enter" || ev.key === " ") {
            ev.preventDefault();
            this.toggleMenu();
        }
    }
    pickDrill(item) {
        this.state.menuOpen = false;
        const [onOpenRecord, onOpenDrilldown] = this._openHandlers();
        openItem(item, onOpenRecord, onOpenDrilldown);
    }
}
