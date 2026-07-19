/** @odoo-module **/

import { Component, onWillStart, useState, xml } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";
import { useService } from "@web/core/utils/hooks";
import { ImportTargetPicker } from "./import_target_picker";

export class AdvancedImportModal extends Component {
    static template = xml`
        <div class="o_baha_modal__backdrop" t-on-click="() => props.onClose()">
            <div class="o_baha_modal o_baha_import_modal" t-on-click.stop="">
                <div class="o_baha_modal__header">
                    <h3 class="o_baha_modal__title">استيراد متقدم</h3>
                    <button class="o_baha_modal__close" t-on-click="() => props.onClose()">
                        <i class="fa fa-times"/>
                    </button>
                </div>

                <div class="o_baha_modal__body">
                    <t t-if="state.loading">
                        <div class="o_baha_detail_modal__state">
                            <i class="fa fa-spinner fa-spin"/>
                            <span>جارٍ التحميل...</span>
                        </div>
                    </t>
                    <t t-elif="state.step === 'pick'">
                        <p class="o_baha_import_targets__hint">
                            اختر نوع البيانات، ثم نزّل قالبها المخصص قبل فتح معالج الاستيراد المتقدم في Odoo.
                        </p>
                        <ImportTargetPicker targets="state.targets"
                                            selectedKey="state.targetKey"
                                            emptyMessage="'الاستيراد المتقدم متاح فقط للمستخدمين الداخليين الذين لديهم صلاحية إنشاء على هذه النماذج.'"
                                            onSelect.bind="selectTarget"/>
                    </t>
                    <t t-elif="state.step === 'ready'">
                        <div class="o_baha_import_selected">
                            <span class="o_baha_import_selected__label">نوع البيانات:</span>
                            <strong t-esc="selectedTarget.label"/>
                            <span class="o_baha_import_selected__model" t-esc="selectedTarget.model"/>
                            <button class="o_baha_btn o_baha_btn--text o_baha_import_selected__change"
                                    t-on-click="goToPick">تغيير</button>
                        </div>
                        <div class="o_baha_advanced_template">
                            <div class="o_baha_advanced_template__icon">
                                <i class="fa fa-file-excel-o"/>
                            </div>
                            <div class="o_baha_advanced_template__content">
                                <h4>قالب مطابق لنموذج <t t-esc="selectedTarget.model"/></h4>
                                <p>
                                    نزّل القالب أولاً، عبّئ البيانات، ثم افتح استيراد Odoo المتقدم وارفع نفس الملف.
                                    عناوين الأعمدة في هذا القالب تستخدم أسماء الحقول المناسبة للنموذج لتسهيل المطابقة.
                                </p>
                            </div>
                        </div>
                        <div class="o_baha_import_columns">
                            <p>الأعمدة المتوقعة:</p>
                            <div class="o_baha_import_columns__list">
                                <t t-foreach="selectedTarget.columns" t-as="column" t-key="column_index">
                                    <span t-esc="column"/>
                                </t>
                            </div>
                        </div>
                    </t>
                </div>

                <div class="o_baha_modal__footer">
                    <t t-if="state.step === 'ready'">
                        <button class="o_baha_btn o_baha_btn--ghost" t-on-click="downloadTemplate">
                            <i class="fa fa-download"/>
                            <span>تنزيل قالب الاستيراد المتقدم</span>
                        </button>
                    </t>
                    <div class="o_baha_modal__footer-right">
                        <button class="o_baha_btn o_baha_btn--text" t-on-click="() => props.onClose()">
                            إلغاء
                        </button>
                        <t t-if="state.step === 'pick'">
                            <button class="o_baha_btn o_baha_btn--primary"
                                    t-att-disabled="!state.targetKey"
                                    t-on-click="goToReady">
                                التالي
                            </button>
                        </t>
                        <t t-if="state.step === 'ready'">
                            <button class="o_baha_btn o_baha_btn--primary"
                                    t-on-click="confirm">
                                فتح استيراد Odoo
                            </button>
                        </t>
                    </div>
                </div>
            </div>
        </div>`;

    static components = { ImportTargetPicker };
    static props = ["onClose", "onConfirm"];

    setup() {
        this.notification = useService("notification");
        this.state = useState({
            step: "pick",
            targets: [],
            targetKey: "",
            loading: true,
        });

        onWillStart(async () => {
            try {
                this.state.targets = await rpc(
                    "/web/dataset/call_kw/dashboard.import/get_import_targets",
                    { model: "dashboard.import", method: "get_import_targets", args: [], kwargs: { mode: "advanced" } }
                );
            } catch (e) {
                this.notification.add("تعذّر تحميل أنواع البيانات", { type: "danger" });
            } finally {
                this.state.loading = false;
            }
        });
    }

    selectTarget(key) {
        this.state.targetKey = key;
    }

    get selectedTarget() {
        return this.state.targets.find((t) => t.key === this.state.targetKey) || {};
    }

    goToPick() {
        this.state.step = "pick";
    }

    goToReady() {
        if (!this.state.targetKey) return;
        this.state.step = "ready";
    }

    downloadTemplate() {
        if (!this.state.targetKey) return;
        const link = document.createElement("a");
        const target = encodeURIComponent(this.state.targetKey);
        link.href = `/dashboard_app/import/template?target=${target}&mode=advanced`;
        link.download = `advanced_import_${this.state.targetKey}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    confirm() {
        const target = this.selectedTarget;
        if (!target.key) return;
        this.props.onConfirm(target);
    }
}
