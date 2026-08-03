/** @odoo-module **/

import { Component, xml } from "@odoo/owl";

export class ImportTargetPicker extends Component {
    static template = xml`
        <div class="o_baha_import_targets">
            <p class="o_baha_import_targets__hint">
                <t t-esc="props.pickHint || 'اختر نوع البيانات التي تريد تحديثها:'"/>
            </p>
            <div class="o_baha_import_targets__grid">
                <t t-foreach="props.targets" t-as="t" t-key="t.key">
                    <button type="button"
                            class="o_baha_import_target"
                            t-att-class="{ 'o_baha_import_target--active': props.selectedKey === t.key }"
                            t-on-click="() => props.onSelect(t.key)">
                        <span class="o_baha_import_target__label" t-esc="t.label"/>
                        <span class="o_baha_import_target__model" t-esc="t.model"/>
                    </button>
                </t>
            </div>
            <p t-if="!props.targets.length" class="o_baha_import_targets__empty">
                <t t-esc="props.emptyMessage || 'لا توجد أنواع بيانات متاحة للاستيراد.'"/>
            </p>
        </div>`;

    static props = {
        targets: { type: Array },
        selectedKey: { type: String, optional: true },
        emptyMessage: { type: String, optional: true },
        pickHint: { type: String, optional: true },
        onSelect: Function,
    };
}
