/** @odoo-module **/

import { Component, xml } from "@odoo/owl";

export class AggregateListModal extends Component {
    static template = xml`
        <div class="o_baha_modal__backdrop o_baha_detail_backdrop" t-on-click="() => props.onClose()">
            <div class="o_baha_modal o_baha_detail_modal o_baha_lines_modal" t-on-click.stop="">
                <div class="o_baha_modal__header o_baha_detail_modal__header">
                    <div>
                        <div class="o_baha_detail_modal__eyebrow">قائمة السجلات</div>
                        <h3 class="o_baha_modal__title" t-esc="title"/>
                        <div t-if="subtitle" class="o_baha_detail_modal__subtitle" t-esc="subtitle"/>
                    </div>
                    <button class="o_baha_modal__close" t-on-click="() => props.onClose()" aria-label="إغلاق">
                        <i class="fa fa-times"/>
                    </button>
                </div>

                <div class="o_baha_modal__body o_baha_detail_modal__body">
                    <t t-if="props.loading">
                        <div class="o_baha_detail_modal__state">
                            <i class="fa fa-spinner fa-spin"/>
                            <span>جارٍ تحميل السجلات...</span>
                        </div>
                    </t>
                    <t t-elif="props.error">
                        <div class="o_baha_detail_modal__state o_baha_detail_modal__state--error">
                            <i class="fa fa-exclamation-triangle"/>
                            <span t-esc="props.error"/>
                        </div>
                    </t>
                    <t t-elif="!rows.length">
                        <div class="o_baha_detail_modal__state">
                            <i class="fa fa-info-circle"/>
                            <span>لا توجد سجلات مطابقة لهذا المؤشر.</span>
                        </div>
                    </t>
                    <t t-else="">
                        <section class="o_baha_detail_table o_baha_lines_table">
                            <table>
                                <thead>
                                    <tr>
                                        <t t-foreach="columns" t-as="col" t-key="col_index">
                                            <th t-esc="col"/>
                                        </t>
                                        <th class="o_baha_lines_table__action">فتح</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <t t-foreach="rows" t-as="row" t-key="row.model + '-' + row.res_id">
                                        <tr>
                                            <t t-foreach="row.cells or []" t-as="cell" t-key="cell_index">
                                                <td t-esc="cell"/>
                                            </t>
                                            <td class="o_baha_lines_table__action">
                                                <button class="o_baha_line_open"
                                                        t-att-title="row.title"
                                                        t-on-click="() => props.onOpenRecord(row)">
                                                    <i class="fa fa-external-link"/>
                                                </button>
                                            </td>
                                        </tr>
                                    </t>
                                </tbody>
                            </table>
                        </section>
                        <div t-if="detail.truncated" class="o_baha_lines_modal__hint">
                            تم عرض أول 80 سجل فقط.
                        </div>
                    </t>
                </div>

                <div class="o_baha_modal__footer">
                    <button class="o_baha_btn o_baha_btn--ghost" t-on-click="() => props.onClose()">إغلاق</button>
                </div>
            </div>
        </div>`;

    static props = ["detail?", "loading?", "error?", "onClose", "onOpenRecord"];

    get detail() {
        return this.props.detail || {};
    }

    get title() {
        return this.detail.title || "قائمة السجلات";
    }

    get subtitle() {
        return this.detail.subtitle || "";
    }

    get columns() {
        return this.detail.columns || [];
    }

    get rows() {
        return this.detail.rows || [];
    }
}
