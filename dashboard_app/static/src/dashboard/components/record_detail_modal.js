/** @odoo-module **/

import { Component, onMounted, useRef, xml } from "@odoo/owl";

export class RecordDetailModal extends Component {
    static template = xml`
        <div class="o_baha_modal__backdrop o_baha_detail_backdrop" t-on-click="() => props.onClose()">
            <div class="o_baha_modal o_baha_detail_modal" t-on-click.stop=""
                 t-ref="dialog" tabindex="-1" role="dialog" aria-modal="true">
                <div class="o_baha_modal__header o_baha_detail_modal__header">
                    <div>
                        <div class="o_baha_detail_modal__eyebrow">تفاصيل السجل</div>
                        <h3 class="o_baha_modal__title" t-esc="title"/>
                        <div t-if="subtitle" class="o_baha_detail_modal__subtitle" t-esc="subtitle"/>
                    </div>
                    <div class="o_baha_detail_modal__headtools">
                        <span t-if="badge.label" class="o_baha_badge" t-attf-class="o_baha_badge--{{badge.level or 'none'}}" t-esc="badge.label"/>
                        <button class="o_baha_modal__close" t-on-click="() => props.onClose()" aria-label="إغلاق">
                            <i class="fa fa-times"/>
                        </button>
                    </div>
                </div>

                <div class="o_baha_modal__body o_baha_detail_modal__body">
                    <t t-if="props.loading">
                        <div class="o_baha_detail_modal__state">
                            <i class="fa fa-spinner fa-spin"/>
                            <span>جارٍ تحميل التفاصيل...</span>
                        </div>
                    </t>
                    <t t-elif="props.error">
                        <div class="o_baha_detail_modal__state o_baha_detail_modal__state--error">
                            <i class="fa fa-exclamation-triangle"/>
                            <span t-esc="props.error"/>
                        </div>
                    </t>
                    <t t-else="">
                        <div class="o_baha_detail_summary">
                            <t t-foreach="detail.summary or []" t-as="item" t-key="item_index">
                                <div class="o_baha_detail_summary__card">
                                    <span class="o_baha_detail_summary__label" t-esc="item.label"/>
                                    <strong>
                                        <span t-esc="item.value"/>
                                        <small t-if="item.unit" t-esc="item.unit"/>
                                    </strong>
                                </div>
                            </t>
                        </div>

                        <div class="o_baha_detail_sections">
                            <t t-foreach="detail.sections or []" t-as="section" t-key="section_index">
                                <section class="o_baha_detail_section">
                                    <h4 t-esc="section.title"/>
                                    <dl>
                                        <t t-foreach="section.items or []" t-as="item" t-key="item_index">
                                            <div>
                                                <dt t-esc="item.label"/>
                                                <dd t-esc="item.value"/>
                                            </div>
                                        </t>
                                    </dl>
                                </section>
                            </t>
                        </div>

                        <section t-if="detail.description" class="o_baha_detail_text">
                            <h4>الوصف</h4>
                            <p t-esc="detail.description"/>
                        </section>

                        <section t-if="detail.formula" class="o_baha_detail_text">
                            <h4>طريقة القياس</h4>
                            <p t-esc="detail.formula"/>
                        </section>

                        <section t-if="detail.table and detail.table.rows and detail.table.rows.length" class="o_baha_detail_table">
                            <h4 t-esc="detail.table.title"/>
                            <table>
                                <thead>
                                    <tr>
                                        <t t-foreach="detail.table.columns or []" t-as="col" t-key="col_index">
                                            <th t-esc="col"/>
                                        </t>
                                    </tr>
                                </thead>
                                <tbody>
                                    <t t-foreach="detail.table.rows" t-as="row" t-key="row_index">
                                        <tr>
                                            <t t-foreach="row" t-as="cell" t-key="cell_index">
                                                <td t-esc="cell"/>
                                            </t>
                                        </tr>
                                    </t>
                                </tbody>
                            </table>
                        </section>
                    </t>
                </div>

                <div class="o_baha_modal__footer">
                    <button class="o_baha_btn o_baha_btn--ghost" t-on-click="() => props.onClose()">إغلاق</button>
                    <button t-if="canOpenFull" class="o_baha_btn o_baha_btn--primary" t-on-click="() => props.onOpenFull(detail)">
                        <i class="fa fa-external-link"/>
                        <span>فتح السجل الكامل</span>
                    </button>
                </div>
            </div>
        </div>`;

    static props = ["detail?", "loading?", "error?", "onClose", "onOpenFull?"];

    setup() {
        // See ComponentDetailModal: focus must leave the clicked card, or Esc
        // leaves a focus ring painted on it.
        this.dialogRef = useRef("dialog");
        onMounted(() => this.dialogRef.el && this.dialogRef.el.focus());
    }

    get detail() {
        return this.props.detail || {};
    }

    get title() {
        return this.detail.title || "تفاصيل السجل";
    }

    get subtitle() {
        return this.detail.subtitle || "";
    }

    get badge() {
        return this.detail.badge || {};
    }

    get canOpenFull() {
        return Boolean(this.props.onOpenFull && this.detail.model && this.detail.res_id && !this.props.loading && !this.props.error);
    }
}
