/** @odoo-module **/

import { Component, onWillStart, useRef, useState, xml } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";
import { useService } from "@web/core/utils/hooks";
import { ImportTargetPicker } from "./import_target_picker";

export class ImportModal extends Component {
    static template = xml`
        <div class="o_baha_modal__backdrop" t-on-click="() => props.onClose()">
            <div class="o_baha_modal o_baha_import_modal" t-on-click.stop="">
                <div class="o_baha_modal__header">
                    <h3 class="o_baha_modal__title">استيراد البيانات</h3>
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
                        <ImportTargetPicker targets="state.targets"
                                            selectedKey="state.targetKey"
                                            onSelect.bind="selectTarget"/>
                    </t>
                    <t t-elif="state.step === 'upload'">
                        <div class="o_baha_import_selected">
                            <span class="o_baha_import_selected__label">نوع البيانات:</span>
                            <strong t-esc="selectedLabel"/>
                            <button class="o_baha_btn o_baha_btn--text o_baha_import_selected__change"
                                    t-on-click="() => this.goToPick()">تغيير</button>
                        </div>
                        <div class="o_baha_dropzone"
                             t-att-class="{ 'o_baha_dropzone--active': state.dragging }"
                             t-on-dragover.prevent="() => this.setDragging(true)"
                             t-on-dragleave.prevent="() => this.setDragging(false)"
                             t-on-drop.prevent="onDrop"
                             t-on-click="openPicker">
                            <i class="fa fa-cloud-upload o_baha_dropzone__icon"/>
                            <div class="o_baha_dropzone__title">اسحب الملف هنا أو اضغط للاختيار</div>
                            <div class="o_baha_dropzone__hint">Excel أو CSV — ملف واحد</div>
                            <input type="file" t-ref="fileInput"
                                   class="d-none" accept=".xlsx,.xls,.csv" t-on-change="onPick"/>
                        </div>
                        <div t-if="state.file" class="o_baha_filelist">
                            <div class="o_baha_filelist__item">
                                <i class="fa fa-file-excel-o o_baha_filelist__icon"/>
                                <span class="o_baha_filelist__name" t-esc="state.file.name"/>
                                <span class="o_baha_filelist__size" t-esc="humanSize(state.file.size)"/>
                                <button class="o_baha_filelist__remove" t-on-click="clearFile">
                                    <i class="fa fa-times"/>
                                </button>
                            </div>
                        </div>
                    </t>
                    <t t-elif="state.step === 'result'">
                        <div class="o_baha_import_result" t-att-class="resultClass">
                            <i t-att-class="resultIcon"/>
                            <h4 t-esc="resultTitle"/>
                            <p t-if="state.result">
                                <t t-if="state.result.created">تم إنشاء <strong t-esc="state.result.created"/> سجل. </t>
                                <t t-if="state.result.updated">تم تحديث <strong t-esc="state.result.updated"/> سجل.</t>
                            </p>
                            <div t-if="state.result and state.result.errors and state.result.errors.length"
                                 class="o_baha_import_errors">
                                <p>أخطاء التحقق:</p>
                                <ul>
                                    <t t-foreach="state.result.errors" t-as="err" t-key="err_index">
                                        <li>صف <t t-esc="err.row"/>: <t t-esc="err.message"/></li>
                                    </t>
                                </ul>
                            </div>
                        </div>
                    </t>
                </div>

                <div class="o_baha_modal__footer">
                    <t t-if="state.step === 'upload'">
                        <button class="o_baha_btn o_baha_btn--ghost" t-on-click="downloadTemplate">
                            <i class="fa fa-download"/>
                            <span>تنزيل القالب</span>
                        </button>
                    </t>
                    <div class="o_baha_modal__footer-right">
                        <button class="o_baha_btn o_baha_btn--text" t-on-click="() => props.onClose()">
                            <t t-if="state.step === 'result'">إغلاق</t>
                            <t t-else="">إلغاء</t>
                        </button>
                        <t t-if="state.step === 'pick'">
                            <button class="o_baha_btn o_baha_btn--primary"
                                    t-att-disabled="!state.targetKey"
                                    t-on-click="() => this.goToUpload()">
                                التالي
                            </button>
                        </t>
                        <t t-if="state.step === 'upload'">
                            <button class="o_baha_btn o_baha_btn--primary"
                                    t-att-disabled="!state.file || state.uploading"
                                    t-on-click="confirm">
                                <t t-if="state.uploading"><i class="fa fa-spinner fa-spin"/> جارٍ الاستيراد...</t>
                                <t t-else="">استيراد</t>
                            </button>
                        </t>
                        <t t-if="state.step === 'result' and state.result and !state.result.error_count">
                            <button class="o_baha_btn o_baha_btn--primary" t-on-click="() => props.onDone and props.onDone()">
                                تم
                            </button>
                        </t>
                    </div>
                </div>
            </div>
        </div>`;

    static components = { ImportTargetPicker };
    static props = ["onClose", "onDone?"];

    setup() {
        this.http = useService("http");
        this.notification = useService("notification");
        this.fileInputRef = useRef("fileInput");
        this.state = useState({
            step: "pick",
            targets: [],
            targetKey: "",
            file: null,
            dragging: false,
            uploading: false,
            loading: true,
            result: null,
        });
        this.rawFile = null;

        onWillStart(async () => {
            try {
                this.state.targets = await rpc(
                    "/web/dataset/call_kw/dashboard.import/get_import_targets",
                    { model: "dashboard.import", method: "get_import_targets", args: [], kwargs: { mode: "normal" } }
                );
            } catch (e) {
                this.notification.add("تعذّر تحميل أنواع البيانات", { type: "danger" });
            } finally {
                this.state.loading = false;
            }
        });
    }

    get selectedLabel() {
        const t = this.state.targets.find((x) => x.key === this.state.targetKey);
        return t ? t.label : "";
    }

    get resultClass() {
        if (!this.state.result) return "";
        return this.state.result.error_count ? "o_baha_import_result--error" : "o_baha_import_result--ok";
    }

    get resultIcon() {
        return this.state.result && this.state.result.error_count
            ? "fa fa-exclamation-triangle"
            : "fa fa-check-circle";
    }

    get resultTitle() {
        if (!this.state.result) return "";
        if (this.state.result.error_count) return "فشل الاستيراد";
        return "تم الاستيراد بنجاح";
    }

    selectTarget(key) {
        this.state.targetKey = key;
    }

    goToPick() {
        this.state.step = "pick";
        this.clearFile();
        this.state.result = null;
    }

    goToUpload() {
        if (!this.state.targetKey) return;
        this.state.step = "upload";
    }

    setDragging(value) {
        this.state.dragging = value;
    }

    openPicker() {
        this.fileInputRef.el.click();
    }

    onPick(ev) {
        const file = ev.target.files[0];
        if (file) this.setFile(file);
        ev.target.value = null;
    }

    onDrop(ev) {
        this.state.dragging = false;
        const file = ev.dataTransfer.files[0];
        if (file) this.setFile(file);
    }

    setFile(file) {
        this.rawFile = file;
        this.state.file = { name: file.name, size: file.size };
    }

    clearFile() {
        this.rawFile = null;
        this.state.file = null;
    }

    humanSize(bytes) {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    downloadTemplate() {
        if (!this.state.targetKey) return;
        const link = document.createElement("a");
        link.href = `/dashboard_app/import/template?target=${encodeURIComponent(this.state.targetKey)}`;
        link.download = `import_${this.state.targetKey}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
    }

    async confirm() {
        if (!this.rawFile || !this.state.targetKey || this.state.uploading) return;
        this.state.uploading = true;
        try {
            const res = await this.http.post(
                "/dashboard_app/import/upload",
                {
                    csrf_token: odoo.csrf_token,
                    target: this.state.targetKey,
                    ufile: this.rawFile,
                },
                "text"
            );
            const parsed = JSON.parse(res);
            if (parsed.error) throw new Error(parsed.error);
            this.state.result = parsed;
            this.state.step = "result";
            if (!parsed.error_count) {
                this.notification.add(
                    `تم استيراد ${parsed.created || 0} وتحديث ${parsed.updated || 0}`,
                    { type: "success" }
                );
            }
        } catch (e) {
            this.notification.add(e.message || "تعذّر استيراد الملف", { type: "danger" });
        } finally {
            this.state.uploading = false;
        }
    }
}
