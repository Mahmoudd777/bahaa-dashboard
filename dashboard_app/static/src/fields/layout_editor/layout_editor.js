/** @odoo-module **/

import { Component, onWillStart, onWillUpdateProps, useState, xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

/**
 * Modern per-user visibility editor shown on the user form: each dashboard tab
 * is a card, each component a labelled on/off switch. Bound to
 * dashboard_hidden_component_ids; it also reads/writes dashboard_hidden_section_ids.
 * Uses the StaticList API (currentIds / addAndRemove) so it never corrupts the form.
 */
export class DashboardLayoutEditor extends Component {
    static template = xml`
        <div class="o_baha_le">
            <t t-if="!dashboardId">
                <div class="o_baha_le__hint">اختر لوحة أولاً لعرض التبويبات والمكوّنات القابلة للإظهار/الإخفاء.</div>
            </t>
            <t t-elif="!state.sections.length">
                <div class="o_baha_le__hint">لا توجد تبويبات في هذه اللوحة.</div>
            </t>
            <t t-else="">
                <t t-foreach="state.sections" t-as="sec" t-key="sec.id">
                    <div class="o_baha_le__section" t-att-class="{ 'o_baha_le__section--off': isSectionHidden(sec.id) }">
                        <div class="o_baha_le__shead">
                            <label class="o_baha_le__switch">
                                <input type="checkbox" t-att-checked="!isSectionHidden(sec.id)"
                                       t-on-change="() => this.toggleSection(sec.id)" t-att-disabled="props.readonly"/>
                                <span class="o_baha_le__slider"/>
                            </label>
                            <span class="o_baha_le__sname" t-esc="sec.name"/>
                            <span class="o_baha_le__count" t-esc="sec.components.length + ' مكوّن'"/>
                        </div>
                        <div class="o_baha_le__comps" t-if="!isSectionHidden(sec.id)">
                            <t t-foreach="sec.components" t-as="c" t-key="c.id">
                                <label class="o_baha_le__comp">
                                    <input type="checkbox" t-att-checked="!isCompHidden(c.id)"
                                           t-on-change="() => this.toggleComp(c.id)" t-att-disabled="props.readonly"/>
                                    <span class="o_baha_le__slider"/>
                                    <span class="o_baha_le__cname" t-esc="c.name"/>
                                    <span class="o_baha_le__ctype" t-esc="c.component_type"/>
                                </label>
                            </t>
                        </div>
                    </div>
                </t>
            </t>
        </div>`;

    static props = { ...standardFieldProps };

    setup() {
        this.orm = useService("orm");
        this.state = useState({ sections: [] });
        onWillStart(() => this.load(this.props));
        onWillUpdateProps((next) => {
            if (this._dashId(this.props) !== this._dashId(next)) {
                this.load(next);
            }
        });
    }

    _dashId(props) {
        const d = props.record.data.dashboard_id;
        if (!d) return false;
        return Array.isArray(d) ? d[0] : d.id || d;
    }
    get dashboardId() {
        return this._dashId(this.props);
    }

    async load(props) {
        const dId = this._dashId(props);
        if (!dId) {
            this.state.sections = [];
            return;
        }
        const secs = await this.orm.searchRead(
            "dashboard.section", [["dashboard_id", "=", dId]], ["name"], { order: "sequence, id" }
        );
        for (const s of secs) {
            s.components = await this.orm.searchRead(
                "dashboard.component", [["section_id", "=", s.id]], ["name", "component_type"],
                { order: "sequence, id" }
            );
        }
        this.state.sections = secs;
    }

    _list(field) {
        return this.props.record.data[field];
    }
    isCompHidden(id) {
        return this._list("dashboard_hidden_component_ids").currentIds.includes(id);
    }
    isSectionHidden(id) {
        return this._list("dashboard_hidden_section_ids").currentIds.includes(id);
    }
    toggleComp(id) {
        const f = this._list("dashboard_hidden_component_ids");
        f.addAndRemove(f.currentIds.includes(id) ? { remove: [id] } : { add: [id] });
    }
    toggleSection(id) {
        const f = this._list("dashboard_hidden_section_ids");
        f.addAndRemove(f.currentIds.includes(id) ? { remove: [id] } : { add: [id] });
    }
}

export const dashboardLayoutEditor = {
    component: DashboardLayoutEditor,
    supportedTypes: ["many2many"],
};

registry.category("fields").add("dashboard_layout_editor", dashboardLayoutEditor);
