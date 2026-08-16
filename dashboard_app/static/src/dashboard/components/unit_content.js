/** @odoo-module **/

import { Component, xml } from "@odoo/owl";
import { WIDGETS } from "./widgets";
import { innerCompGridStyle, panelInnerEntries } from "./grid_math";

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
                            <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--ok"/>علي المسار</span>
                            <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--risk"/>متأخر</span>
                            <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--late"/>متأخر جدا</span>
                            <span class="o_baha_legend__item"><i class="o_baha_legend__dot o_baha_legend__dot--none"/>لم يتم القياس</span>
                        </div>
                        <button t-if="canExpand" class="o_baha_expand_btn"
                                title="عرض كامل البيانات"
                                t-on-click="expandAll">
                            <i class="fa fa-expand"/>
                        </button>
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

    entries() {
        return panelInnerEntries(this.props.unit);
    }
    innerStyle(entry) {
        return innerCompGridStyle(entry);
    }

    /** The expand handler lives on the widget props, so borrow it from any
     *  inner component — UnitContent itself is not given it directly. */
    get _expandHandler() {
        const first = (this.props.unit.components || [])[0];
        return first ? this.props.propsFor(first).onOpenComponent : undefined;
    }

    get canExpand() {
        return Boolean(this._expandHandler);
    }

    /** Expand the WHOLE panel: every inner component's data in one wizard,
     *  rather than one card at a time. */
    expandAll() {
        const handler = this._expandHandler;
        if (handler) {
            handler(this.props.unit);
        }
    }
}
