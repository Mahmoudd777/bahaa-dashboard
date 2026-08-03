/** @odoo-module **/

import { Component, onWillStart, useState, xml } from "@odoo/owl";
import { rpc } from "@web/core/network/rpc";
import { useService } from "@web/core/utils/hooks";
import { ImportTargetPicker } from "./import_target_picker";

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

export class ExportModal extends Component {
    static template = xml`
        <div class="o_baha_modal__backdrop" t-on-click="() => props.onClose()">
            <div class="o_baha_modal o_baha_export_modal" t-on-click.stop="">
                <div class="o_baha_modal__header">
                    <h3 class="o_baha_modal__title">تصدير البيانات</h3>
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
                                            emptyMessage="'لا توجد أنواع بيانات متاحة للتصدير.'"
                                            onSelect.bind="selectTarget"/>
                    </t>
                    <t t-elif="state.step === 'period'">
                        <div class="o_baha_import_selected">
                            <span class="o_baha_import_selected__label">نوع البيانات:</span>
                            <strong t-esc="selectedLabel"/>
                            <button class="o_baha_btn o_baha_btn--text o_baha_import_selected__change"
                                    t-on-click="() => this.goToPick()">تغيير</button>
                        </div>
                        <t t-if="!selectedFilterable">
                            <p class="o_baha_export_period__hint">هذا النوع من البيانات غير مرتبط بفترة زمنية</p>
                        </t>
                        <t t-else="">
                            <div class="o_baha_filter__menu o_baha_export_period__modes">
                                <div class="o_baha_filter__opt"
                                     t-att-class="{'o_baha_filter__opt--active': state.filterMode==='uptodate'}"
                                     t-on-click="() => this.setMode('uptodate')">حتى تاريخ</div>
                                <div class="o_baha_filter__opt"
                                     t-att-class="{'o_baha_filter__opt--active': state.filterMode==='period'}"
                                     t-on-click="() => this.setMode('period')">فترة (من - إلى)</div>
                                <div class="o_baha_filter__opt"
                                     t-att-class="{'o_baha_filter__opt--active': state.filterMode==='quarter'}"
                                     t-on-click="() => this.setMode('quarter')">ربع سنة</div>
                            </div>
                            <div class="o_baha_export_period__controls">
                                <t t-if="state.filterMode === 'uptodate'">
                                    <input type="date" class="o_baha_export_period__date"
                                           t-att-value="state.date"
                                           t-on-input="(ev) => this.state.date = ev.target.value"/>
                                </t>
                                <t t-if="state.filterMode === 'period'">
                                    <input type="date" class="o_baha_export_period__date"
                                           t-att-value="state.from"
                                           t-on-input="(ev) => this.state.from = ev.target.value"/>
                                    <span class="o_baha_export_period__sep">←</span>
                                    <input type="date" class="o_baha_export_period__date"
                                           t-att-value="state.to"
                                           t-on-input="(ev) => this.state.to = ev.target.value"/>
                                </t>
                                <t t-if="state.filterMode === 'quarter'">
                                    <select class="o_baha_filter__yearsel" t-on-change="setYear">
                                        <t t-foreach="yearOptions" t-as="y" t-key="y">
                                            <option t-att-value="y" t-att-selected="y === state.year" t-esc="y"/>
                                        </t>
                                    </select>
                                    <t t-foreach="[1,2,3,4]" t-as="q" t-key="q">
                                        <button type="button" class="o_baha_qbtn"
                                                t-att-class="{ 'o_baha_qbtn--active': state.qnum === q }"
                                                t-on-click="() => this.setQuarter(q)">Q<t t-esc="q"/></button>
                                    </t>
                                </t>
                            </div>
                        </t>
                    </t>
                    <t t-elif="state.step === 'format'">
                        <div class="o_baha_import_selected">
                            <span class="o_baha_import_selected__label">نوع البيانات:</span>
                            <strong t-esc="selectedLabel"/>
                            <button class="o_baha_btn o_baha_btn--text o_baha_import_selected__change"
                                    t-on-click="() => this.goToPick()">تغيير</button>
                        </div>
                        <p class="o_baha_import_targets__hint">اختر صيغة التصدير:</p>
                        <div class="o_baha_export_formats">
                            <button type="button" class="o_baha_export_format"
                                    t-att-disabled="state.downloading"
                                    t-on-click="() => this.download('pdf')">
                                <i class="fa fa-file-pdf-o o_baha_export_format__icon"/>
                                <span class="o_baha_export_format__label">PDF</span>
                            </button>
                            <button type="button" class="o_baha_export_format"
                                    t-att-disabled="state.downloading"
                                    t-on-click="() => this.download('xlsx')">
                                <i class="fa fa-file-excel-o o_baha_export_format__icon"/>
                                <span class="o_baha_export_format__label">Excel</span>
                            </button>
                        </div>
                    </t>
                </div>

                <div class="o_baha_modal__footer">
                    <div class="o_baha_modal__footer-right">
                        <button class="o_baha_btn o_baha_btn--text" t-on-click="() => props.onClose()">إلغاء</button>
                        <t t-if="state.step === 'pick'">
                            <button class="o_baha_btn o_baha_btn--primary"
                                    t-att-disabled="!state.targetKey"
                                    t-on-click="() => this.goToPeriod()">التالي</button>
                        </t>
                        <t t-if="state.step === 'period'">
                            <button class="o_baha_btn o_baha_btn--primary"
                                    t-on-click="() => this.goToFormat()">التالي</button>
                        </t>
                    </div>
                </div>
            </div>
        </div>`;

    static components = { ImportTargetPicker };
    static props = ["onClose", "filter?"];

    setup() {
        this.notification = useService("notification");
        const f = this.props.filter || { mode: "uptodate", date: todayISO() };
        const now = new Date();
        let qnum = Math.floor(now.getMonth() / 3) + 1, year = now.getFullYear();
        const qm = /^(\d{4})-Q([1-4])$/.exec(f.quarter || "");
        if (qm) { year = parseInt(qm[1], 10); qnum = parseInt(qm[2], 10); }
        this.state = useState({
            step: "pick",
            loading: true,
            targets: [],
            targetKey: "",
            filterMode: (f.mode === "all" ? "uptodate" : f.mode) || "uptodate",
            date: f.date || todayISO(),
            from: f.from || f.date || todayISO(),
            to: f.to || f.date || todayISO(),
            qnum, year,
            downloading: false,
        });

        onWillStart(async () => {
            try {
                this.state.targets = await rpc(
                    "/web/dataset/call_kw/dashboard.export/get_export_targets",
                    { model: "dashboard.export", method: "get_export_targets", args: [], kwargs: {} }
                );
            } catch (e) {
                this.notification.add("تعذّر تحميل أنواع البيانات", { type: "danger" });
            } finally {
                this.state.loading = false;
            }
        });
    }

    get selectedTarget() {
        return this.state.targets.find((t) => t.key === this.state.targetKey);
    }

    get selectedLabel() {
        const t = this.selectedTarget;
        return t ? t.label : "";
    }

    get selectedFilterable() {
        const t = this.selectedTarget;
        return t ? Boolean(t.filterable) : true;
    }

    get yearOptions() {
        const now = new Date().getFullYear();
        const ys = [];
        for (let y = now - 10; y <= now + 5; y++) ys.push(y);
        return ys;
    }

    selectTarget(key) {
        this.state.targetKey = key;
    }

    goToPick() {
        this.state.step = "pick";
    }

    goToPeriod() {
        if (!this.state.targetKey) return;
        this.state.step = "period";
    }

    goToFormat() {
        this.state.step = "format";
    }

    setMode(mode) {
        this.state.filterMode = mode;
    }

    setQuarter(q) {
        this.state.qnum = q;
        this.state.filterMode = "quarter";
    }

    setYear(ev) {
        this.state.year = parseInt(ev.target.value, 10);
    }

    // Same shape as Banner.emitFilter() in widgets.js — the backend already
    // knows how to normalize it.
    buildFilter() {
        const mode = this.state.filterMode;
        const f = { mode };
        if (mode === "period") { f.from = this.state.from; f.to = this.state.to; f.date = this.state.from; }
        else if (mode === "quarter") { f.quarter = this.state.year + "-Q" + this.state.qnum; f.date = this.state.year + "-01-01"; }
        else { f.date = this.state.date; }
        return f;
    }

    download(format) {
        if (!this.state.targetKey || this.state.downloading) return;
        this.state.downloading = true;
        try {
            const filter = this.selectedFilterable ? this.buildFilter() : {};
            const params = new URLSearchParams({
                target: this.state.targetKey,
                format,
                filter: JSON.stringify(filter),
            });
            const link = document.createElement("a");
            link.href = `/dashboard_app/export/download?${params.toString()}`;
            link.download = `export_${this.state.targetKey}.${format}`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            this.props.onClose();
        } finally {
            this.state.downloading = false;
        }
    }
}
