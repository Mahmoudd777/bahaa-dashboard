/** @odoo-module **/

import { Component, onError, onMounted, onPatched, onWillUnmount, useRef, useState, xml } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { rpc } from "@web/core/network/rpc";
import { user } from "@web/core/user";
import { _t } from "@web/core/l10n/translation";
import { WIDGETS } from "./components/widgets";
import { ImportModal } from "./components/import_modal";
import { ExportModal } from "./components/export_modal";
import { AdvancedImportModal } from "./components/advanced_import_modal";
import { FloatingDetailPanel } from "./components/floating_detail_panel";
import { AggregateListModal } from "./components/aggregate_list_modal";
import {
    ComponentDetailModal,
    sectionForComponent,
    sectionsForUnit,
} from "./components/component_detail_modal";
import {
    cloneUnits,
    normalizeEditUnits,
    normalizeEditUnitsWithMeta,
    prepareUnitsForGrid,
    unitGridStyle,
    unitsToSaveItems,
} from "./components/grid_math";
import { GridstackEditor } from "./components/gridstack_editor";
import { UnitContent } from "./components/unit_content";
import { dispatchCloseOverlays } from "./components/click_helpers";
import { useReveal } from "./anim";

const INTERACTIVE_WIDGETS = new Set([
    "data_table", "gauge_card", "gauge_semi", "kpi_gauge_card", "stat_card",
    "progress_card", "budget_split_bar", "bar_h", "bar_h_planned", "bar_v",
    "goals_list", "list_cards", "alerts_panel", "gauge_grid", "stat_grid",
    "kpi_grid", "semi_grid",
]);

// Renders an ordered list of layout "units" (built server-side in get_layout)
// as a 12-column grid. A unit is either a titled "panel" wrapping its own
// inner 12-col grid of components, or a single standalone "comp" widget.
export class UnitGrid extends Component {
    static template = xml`
        <div class="o_baha_dash__grid">
            <t t-foreach="gridUnits()" t-as="unit" t-key="unit.key">
                <div class="o_baha_dash__cell" t-att-data-key="unit.key" t-att-style="unitStyle(unit)">
                    <UnitContent unit="unit" widgetFor="props.widgetFor" propsFor="props.propsFor"/>
                </div>
            </t>
        </div>`;

    unitStyle(unit) {
        return unitGridStyle(unit);
    }

    gridUnits() {
        return prepareUnitsForGrid(this.props.units);
    }

    static components = { UnitContent };
    static props = ["units", "widgetFor", "propsFor"];
}

export class Dashboard extends Component {
    static template = xml`
        <div class="o_baha_dash" dir="rtl" t-att-style="colorVars" t-att-data-theme="state.layout and state.layout.theme">
            <div t-if="state.layout.edit_user_id" class="o_baha_asuser">
                <i class="fa fa-user-circle"/>
                <span>أنت تعرّض وتحرّر لوحة المستخدم: <b t-esc="state.layout.edit_user_name"/></span>
            </div>
            <t t-if="state.errorMsg">
                <div class="o_baha_dash__empty" style="flex-direction:column;color:#b00;padding:24px;text-align:center;">
                    <i class="fa fa-exclamation-triangle"/>
                    <div t-esc="state.errorMsg"/>
                </div>
            </t>
            <t t-elif="state.loading">
                <div class="o_baha_dash__loading">
                    <i class="fa fa-spinner fa-spin"/> جارٍ التحميل...
                </div>
            </t>
            <t t-elif="state.layout.access === false">
                <div class="o_baha_dash__empty">
                    <i class="fa fa-lock"/> لا تملك صلاحية الوصول إلى لوحة التحكم.
                </div>
            </t>
            <t t-elif="!state.layout.sections.length">
                <div class="o_baha_dash__empty">لا توجد عناصر لعرضها.</div>
            </t>
            <t t-else="">
                <!-- banner renders full-bleed on top, across tabs -->
                <t t-if="bannerComp"
                   t-component="widgetFor('banner')" t-props="propsFor(bannerComp)"/>

                <!-- tab bar (sections) — only when there is no banner to host them -->
                <div class="o_baha_tabs" t-if="!bannerComp and tabs.length > 1">
                    <t t-foreach="tabs" t-as="tab" t-key="tab.id">
                        <button class="o_baha_tab"
                                t-att-class="{ 'o_baha_tab--active': tab_index === state.activeTab }"
                                t-on-click="() => this.selectTab(tab_index)"
                                t-esc="tab.name"/>
                    </t>
                </div>

                <!-- active tab content -->
                <div class="o_baha_dash__section" t-ref="section" t-att-class="{ 'o_baha_dash__section--edit': state.editing }">
                    <t t-if="state.editing">
                        <GridstackEditor t-key="editGridKey"
                                         units="state.draftUnits"
                                         float="state.editFloat"
                                         widgetFor.bind="widgetFor"
                                         propsFor.bind="propsFor"
                                         onChange.bind="onGsChange"
                                         onRemove.bind="onRemoveUnit"
                                         moveTargets="moveTargets"
                                         onMove.bind="onMoveUnitToSection"/>
                    </t>
                    <t t-else="">
                        <UnitGrid units="activeUnits" widgetFor.bind="widgetFor" propsFor.bind="propsFor"/>
                    </t>
                </div>

                <t t-if="state.layout.can_edit and !state.loading">
                    <button t-if="!state.editing"
                            class="o_baha_edit_fab"
                            title="تعديل تخطيط اللوحة"
                            t-on-click="enterEditMode">
                        <i class="fa fa-pencil"/>
                    </button>
                    <div t-if="state.editing" class="o_baha_edit_toolbar">
                        <t t-if="state.confirmDiscard">
                            <span class="o_baha_edit_toolbar__hint o_baha_edit_toolbar__hint--warn">
                                <i class="fa fa-exclamation-triangle"/> <t t-esc="labels.confirmDiscard"/>
                            </span>
                            <div class="o_baha_edit_toolbar__actions">
                                <button class="o_baha_btn o_baha_btn--text" t-on-click="confirmDiscardNo" t-esc="labels.keepEditing"/>
                                <button class="o_baha_btn o_baha_btn--danger" t-on-click="confirmDiscardYes" t-esc="labels.discard"/>
                            </div>
                        </t>
                        <t t-else="">
                            <div t-if="state.addPanelOpen" class="o_baha_add_panel">
                                <div class="o_baha_add_panel__title">إضافة عنصر محذوف</div>
                                <div class="o_baha_add_panel__group" t-if="removedTabsForAdd.length">
                                    <div class="o_baha_add_panel__label">التبويبات</div>
                                    <t t-foreach="removedTabsForAdd" t-as="tab" t-key="'t'+tab.id">
                                        <button class="o_baha_add_item" t-on-click="() => this.onAddTab(tab.id)">
                                            <i class="fa fa-plus"/> <span t-esc="tab.name"/>
                                        </button>
                                    </t>
                                </div>
                                <div class="o_baha_add_panel__group" t-if="removedCardsForAdd.length">
                                    <div class="o_baha_add_panel__label">البطاقات (هذا التبويب)</div>
                                    <t t-foreach="removedCardsForAdd" t-as="card" t-key="'c'+card.key">
                                        <button class="o_baha_add_item" t-on-click="() => this.onAddUnit(card.key)">
                                            <i class="fa fa-plus"/> <span t-esc="card.name"/>
                                        </button>
                                    </t>
                                </div>
                                <div class="o_baha_add_panel__empty" t-if="!removedTabsForAdd.length and !removedCardsForAdd.length">
                                    لا توجد عناصر محذوفة
                                </div>
                            </div>
                            <span class="o_baha_edit_toolbar__hint">
                                <t t-if="state.editDirty" t-esc="labels.dirtyHint"/>
                                <t t-else="" t-esc="labels.idleHint"/>
                            </span>
                            <div class="o_baha_theme_wrap">
                                <button class="o_baha_gs_mode"
                                        t-att-class="{ 'o_baha_gs_mode--free': state.themeOpen }"
                                        title="اختيار مظهر جاهز أو إنشاء ألوان جديدة — تظهر فوراً للمعاينة"
                                        t-on-click="toggleThemePanel">
                                    <i class="fa fa-paint-brush"/>
                                    <span>المظهر</span>
                                </button>
                                <div t-if="state.themeOpen" class="o_baha_theme_panel">
                                    <div class="o_baha_theme_panel__title">مظاهر جاهزة</div>
                                    <div class="o_baha_theme_panel__presets">
                                        <t t-foreach="state.layout.themes or []" t-as="th" t-key="th.id">
                                            <button class="o_baha_theme_sw"
                                                    t-att-class="{ 'o_baha_theme_sw--on': !state.layout.custom_theme and state.layout.theme_id === th.id }"
                                                    t-on-click="() => this.pickPreset(th)">
                                                <span class="o_baha_theme_sw__dots">
                                                    <i t-attf-style="background:{{th.primary}}"/>
                                                    <i t-attf-style="background:{{th.accent}}"/>
                                                </span>
                                                <span t-esc="th.name"/>
                                            </button>
                                        </t>
                                    </div>
                                    <div class="o_baha_theme_panel__title">ألوان مخصصة</div>
                                    <div class="o_baha_theme_panel__custom">
                                        <label>
                                            <span>أساسي</span>
                                            <input type="color" t-att-value="state.layout.custom_primary"
                                                   t-on-input="(ev) => this.pickCustom(ev.target.value, null)"/>
                                        </label>
                                        <label>
                                            <span>مميّز</span>
                                            <input type="color" t-att-value="state.layout.custom_accent"
                                                   t-on-input="(ev) => this.pickCustom(null, ev.target.value)"/>
                                        </label>
                                    </div>
                                    <div class="o_baha_theme_panel__saveas">
                                        <input type="text" placeholder="اسم المظهر الجديد"
                                               t-att-value="state.themeName"
                                               t-on-input="(ev) => this.state.themeName = ev.target.value"/>
                                        <button class="o_baha_btn o_baha_btn--text"
                                                t-att-disabled="!state.themeName.trim() || state.themeSaving"
                                                t-on-click="saveAsPreset">حفظ كمظهر جاهز</button>
                                    </div>
                                    <div class="o_baha_theme_panel__actions">
                                        <button class="o_baha_btn o_baha_btn--text"
                                                t-on-click="revertTheme">تراجع</button>
                                        <button class="o_baha_btn o_baha_btn--primary"
                                                t-att-disabled="state.themeSaving"
                                                t-on-click="saveTheme">
                                            <t t-if="state.themeSaving"><i class="fa fa-spinner fa-spin"/></t>
                                            <t t-else="">حفظ المظهر</t>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button class="o_baha_gs_mode o_baha_gs_add"
                                    t-att-class="{ 'o_baha_gs_add--on': state.addPanelOpen }"
                                    title="إضافة بطاقة أو تبويب محذوف"
                                    t-on-click="toggleAddPanel">
                                <i class="fa fa-plus"/>
                                <span>إضافة</span>
                            </button>
                            <button class="o_baha_gs_mode"
                                    t-att-class="{ 'o_baha_gs_mode--free': state.editFloat }"
                                    t-att-title="state.editFloat ? labels.modeFreeHint : labels.modeCompactHint"
                                    t-on-click="toggleEditFloat">
                                <i t-att-class="state.editFloat ? 'fa fa-th-large' : 'fa fa-compress'"/>
                                <span t-esc="state.editFloat ? labels.modeFree : labels.modeCompact"/>
                            </button>
                            <div class="o_baha_edit_toolbar__actions">
                                <button class="o_baha_btn o_baha_btn--text" t-on-click="resetEditDraft" t-att-disabled="state.saving" t-esc="labels.reload"/>
                                <button class="o_baha_btn o_baha_btn--text" t-on-click="cancelEditMode" t-att-disabled="state.saving" t-esc="labels.cancel"/>
                                <button class="o_baha_btn o_baha_btn--primary"
                                        t-on-click="saveEditLayout"
                                        t-att-disabled="!state.editDirty || state.saving">
                                    <t t-if="state.saving"><i class="fa fa-spinner fa-spin"/> <t t-esc="labels.saving"/></t>
                                    <t t-else="" t-esc="labels.save"/>
                                </button>
                            </div>
                        </t>
                    </div>
                </t>
            </t>
            <ImportModal t-if="state.importOpen"
                         onClose="() => this.closeImport()"
                         onDone="() => this.onImportDone()"/>
            <ExportModal t-if="state.exportOpen"
                         onClose="() => this.closeExport()"
                         filter="state.filter"/>
            <AdvancedImportModal t-if="state.advancedImportOpen"
                                 onClose="() => this.closeAdvancedImport()"
                                 onConfirm="openAdvancedImport.bind(this)"/>
            <AggregateListModal t-if="state.aggregateList.open"
                                detail="state.aggregateList.detail"
                                loading="state.aggregateList.loading"
                                error="state.aggregateList.error"
                                onClose="() => this.closeAggregateList()"
                                onOpenRecord="openAggregateRecord.bind(this)"/>
            <ComponentDetailModal t-if="state.componentDetail.open"
                                  title="state.componentDetail.title"
                                  sections="state.componentDetail.sections"
                                  onClose="() => this.closeComponentDetail()"
                                  onOpenRecord="openRecordDetail.bind(this)"
                                  onOpenDrilldown="openDrilldown.bind(this)"/>
            <!-- Floating record windows sit above the wizards, so opening a row
                 from inside one brings the record out in front of it. -->
            <t t-foreach="state.detailPanels" t-as="panel" t-key="panel.id">
                <FloatingDetailPanel panel="panel"
                                     onClose.bind="closeDetailPanel"
                                     onFocus.bind="focusDetailPanel"
                                     onMove.bind="moveDetailPanel"
                                     onOpenFull="openFullRecord.bind(this)"/>
            </t>
        </div>`;

    static components = { ...WIDGETS, ImportModal, ExportModal, AdvancedImportModal, FloatingDetailPanel, AggregateListModal, ComponentDetailModal, UnitGrid, GridstackEditor };
    static props = ["*"];

    setup() {
        // Access defensively: on the frontend public page some backend services
        // may not be present — never let setup throw (it would render nothing).
        this.notification = this.env.services.notification || { add: () => {} };
        this.action = this.env.services.action || null;
        // Restore the saved date filter (persists across refresh / re-open); first
        // time, default to "up to today" (there is no "all" option any more).
        let savedFilter = null;
        try { savedFilter = JSON.parse(localStorage.getItem("baha_dash_filter") || "null"); } catch (e) { /* ignore */ }
        if (!savedFilter || !savedFilter.mode) {
            savedFilter = { mode: "uptodate", date: new Date().toISOString().slice(0, 10) };
        }
        // Free placement is the default: in edit mode every card keeps its exact
        // position and size instead of being pulled up into empty space by
        // Gridstack's top gravity. An explicit user toggle still wins.
        let savedFloat = true;
        try {
            const storedFloat = localStorage.getItem("baha_dash_edit_float");
            if (storedFloat !== null) { savedFloat = storedFloat === "1"; }
        } catch (e) { /* ignore */ }
        // Admin opening another user's dashboard (from the user form button):
        // /dashboard?edit_user=<id>. All get_layout / save calls target that user.
        let editUserId = null;
        try { editUserId = new URLSearchParams(window.location.search).get("edit_user"); } catch (e) { /* ignore */ }
        this.editUserId = editUserId ? parseInt(editUserId, 10) : null;
        this.state = useState({
            layout: { sections: [], colors: {}, access: true },
            loading: true,
            importOpen: false,
            exportOpen: false,
            advancedImportOpen: false,
            // Record details are floating windows, not a modal: several can be
            // open at once so records can be compared side by side.
            detailPanels: [],
            aggregateList: { open: false, loading: false, detail: null, error: "" },
            componentDetail: { open: false, title: "", sections: [] },
            activeTab: 0,
            errorMsg: "",
            filter: savedFilter,
            editing: false,
            draftUnits: [],
            editDirty: false,
            editSession: 0,
            editFloat: savedFloat,
            themeOpen: false,
            themeSaving: false,
            themeName: "",
            dragIndex: null,
            dragInsertIndex: null,
            saving: false,
            confirmDiscard: null,
            addPanelOpen: false,
        });
        this._editLayoutDraft = null;
        this._editDraftsBySection = {};
        // Cards queued to change page on the next save: {componentId: sectionId}.
        this._pendingMoves = {};
        // Stacking counter for floating record panels. Starts above the modal
        // layer (2000) so a record always opens in front of the wizard that
        // spawned it — the bug that made "فتح" look like it did nothing.
        this._panelZ = 2500;

        // Entrance "blow up" animations: run once the section first renders, and
        // again whenever the active tab changes (re-reveals the new tab's blocks).
        this.sectionRef = useRef("section");
        this.reveal = useReveal(() => this.sectionRef.el);
        this._revealKey = null;
        onPatched(() => {
            if (!this.sectionRef.el) return;
            if (this._revealKey !== this.state.activeTab) {
                this._revealKey = this.state.activeTab;
                this.reveal.replay();
            }
        });

        onError((err) => {
            const e = (err && err.cause) || err;
            this.state.errorMsg = (e && (e.message || e.toString())) || "Render error";
            this.state.loading = false;
        });

        // Lock NON-internal users (portal / restricted) to the dashboard only:
        // hide the Odoo navbar so they cannot navigate elsewhere. Internal users
        // (admin / employees) keep the navbar and full Odoo access.
        this.locked = !user.isInternalUser;
        if (this.locked) {
            document.body.classList.add("o_baha_locked");
        }
        // Hide Odoo's default OdooBot chat bubble/popup while the dashboard is
        // shown — it's confusing on a client-facing view and isn't part of this app.
        document.body.classList.add("o_baha_dash_active");
        onWillUnmount(() => {
            if (this.locked) {
                document.body.classList.remove("o_baha_locked");
            }
            document.body.classList.remove("o_baha_edit_mode");
            document.body.classList.remove("o_baha_dash_active");
            document.removeEventListener("keydown", this._onGlobalKeyDown, true);
            window.removeEventListener("beforeunload", this._onBeforeUnload);
        });

        this._onGlobalKeyDown = (ev) => {
            if (ev.key === "Escape") {
                if (this.state.importOpen) {
                    ev.preventDefault();
                    this.closeImport();
                    return;
                }
                if (this.state.exportOpen) {
                    ev.preventDefault();
                    this.closeExport();
                    return;
                }
                if (this.state.advancedImportOpen) {
                    ev.preventDefault();
                    this.closeAdvancedImport();
                    return;
                }
                // Floating panels close one at a time, topmost first, so Esc
                // does not wipe out a comparison the user is mid-way through.
                if (this.state.detailPanels.length) {
                    ev.preventDefault();
                    const top = this.state.detailPanels.reduce((a, b) => (b.z > a.z ? b : a));
                    this.closeDetailPanel(top.id);
                    return;
                }
                if (this.state.componentDetail.open) {
                    ev.preventDefault();
                    this.closeComponentDetail();
                    return;
                }
                if (this.state.aggregateList.open) {
                    ev.preventDefault();
                    this.closeAggregateList();
                    return;
                }
                if (dispatchCloseOverlays()) {
                    ev.preventDefault();
                    return;
                }
                if (this.state.editing) {
                    ev.preventDefault();
                    if (this.state.confirmDiscard) {
                        this.confirmDiscardNo();
                    } else {
                        this.cancelEditMode();
                    }
                }
                return;
            }
            if (this.state.editing && (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
                ev.preventDefault();
                this.saveEditLayout();
            }
        };
        this._onBeforeUnload = (ev) => {
            if (this.state.editing && this.state.editDirty) {
                ev.preventDefault();
                ev.returnValue = "";
            }
        };
        document.addEventListener("keydown", this._onGlobalKeyDown, true);
        window.addEventListener("beforeunload", this._onBeforeUnload);

        // Load the layout from the server. Reusable so we can refresh on demand and
        // whenever the user returns to the dashboard — editing data elsewhere and
        // coming back shows fresh numbers without a manual reload. Race a timeout so
        // a hung request never leaves the page blank.
        this._loadingLayout = false;
        this.loadLayout = async (replay = false) => {
            if (this._loadingLayout) return;
            this._loadingLayout = true;
            try {
                const layout = await Promise.race([
                    rpc("/web/dataset/call_kw/dashboard.dashboard/get_layout",
                        { model: "dashboard.dashboard", method: "get_layout", args: [],
                          kwargs: { dashboard_filter: this.state.filter || null, target_user_id: this.editUserId || null } }),
                    new Promise((_, rej) => setTimeout(() => rej(new Error("RPC timeout (8s)")), 8000)),
                ]);
                this.state.layout = layout;
                this.state.errorMsg = "";
                if (this.state.editing) {
                    this._rehydrateEditDraftsFromLayout(true);
                }
                if (replay) {
                    this._revealKey = null;     // force the onPatched entrance replay
                }
            } catch (e) {
                if (this.state.loading) {
                    this.state.errorMsg = "تعذّر تحميل البيانات: " + (e.message || e);
                }
            } finally {
                this.state.loading = false;
                this._loadingLayout = false;
            }
        };
        onMounted(() => this.loadLayout());

        // Re-fetch when the dashboard tab/window regains focus (so an edit made in
        // another tab is reflected on return). Bound here, cleaned up on unmount.
        this._onVisible = () => {
            if (document.visibilityState === "visible" && !this.state.editing) {
                this.loadLayout();
            }
        };
        document.addEventListener("visibilitychange", this._onVisible);
        onWillUnmount(() => document.removeEventListener("visibilitychange", this._onVisible));
    }

    // Manual refresh (wire to a button / the ⋮ menu).
    refresh() {
        this.loadLayout();
    }

    widgetFor(type) {
        return WIDGETS[type];
    }

    get tabs() {
        const base = this.state.layout.sections || [];
        if (!this.state.editing) {
            return base;
        }
        // In edit mode, drop tabs removed this session and append re-added ones.
        const vis = this._editSectionVis || {};
        const shown = base.filter((s) => vis[s.id] !== false);
        const readded = (this.state.layout.removed_sections || []).filter((s) => vis[s.id] === true);
        return [...shown, ...readded];
    }
    get labels() {
        return {
            dirtyHint: _t("تغييرات غير محفوظة — Ctrl+S للحفظ (كل التبويبات)"),
            idleHint: _t("↔ للترتيب — بدّل التبويبات أثناء التعديل — Esc للإغلاق"),
            confirmDiscard: _t("لديك تغييرات غير محفوظة — هل تريد تجاهلها؟"),
            keepEditing: _t("متابعة التعديل"),
            discard: _t("تجاهل التغييرات"),
            reload: _t("إعادة تحميل"),
            cancel: _t("إلغاء"),
            save: _t("حفظ التخطيط"),
            saving: _t("جارٍ الحفظ..."),
            modeFree: _t("وضع حر"),
            modeCompact: _t("ترصيص تلقائي"),
            modeFreeHint: _t("الوضع الحر: تبقى البطاقات مكانها بالضبط حتى لو تركت فراغات. اضغط للتبديل إلى الترصيص التلقائي."),
            modeCompactHint: _t("الترصيص التلقائي: تُرصّ البطاقات للأعلى بلا فراغات. اضغط للتبديل إلى الوضع الحر."),
        };
    }
    get bannerComp() {
        for (const s of this.tabs) {
            for (const c of s.components || []) {
                if (c.type === "banner") return c;
            }
        }
        return null;
    }
    get activeSection() {
        return this.tabs[this.state.activeTab] || { components: [], units: [] };
    }
    get editGridKey() {
        const section = this.activeSection;
        return `${this.state.editSession}-${section.id || this.state.activeTab}`;
    }
    get activeUnits() {
        return this.activeSection.units || [];
    }
    get isTwoCol() {
        return this.activeUnits.some((u) => u.column === "main" || u.column === "side");
    }
    get sideUnits() {
        return this.activeUnits.filter((u) => u.column === "side");
    }
    get mainUnits() {
        return this.activeUnits.filter((u) => u.column === "main");
    }
    get fullUnits() {
        return this.activeUnits.filter((u) => u.column !== "main" && u.column !== "side");
    }
    // A full-width unit renders above the columns if it comes before the first
    // main/side unit, otherwise below them (so content can be appended at the end).
    _firstColIndex() {
        return this.activeUnits.findIndex((u) => u.column === "main" || u.column === "side");
    }
    get fullTopUnits() {
        const i = this._firstColIndex();
        return this.activeUnits.filter((u, idx) => (u.column !== "main" && u.column !== "side") && idx < i);
    }
    get fullBottomUnits() {
        const i = this._firstColIndex();
        return this.activeUnits.filter((u, idx) => (u.column !== "main" && u.column !== "side") && idx > i);
    }
    selectTab(index) {
        if (index === this.state.activeTab) {
            return;
        }
        if (this.state.editing) {
            this._persistCurrentTabDraft();
            this.state.activeTab = index;
            this.state.dragIndex = null;
            this.state.dragInsertIndex = null;
            this._loadTabDraftForEdit();
            return;
        }
        this.state.activeTab = index;
    }

    _syncGlobalEditDirty() {
        this.state.editDirty = Object.values(this._editDraftsBySection).some((draft) => draft.dirty);
    }

    /** Layout-only signature of a tab's server units (positions/sizes/order,
     *  not widget data) — used to detect that another session changed the
     *  layout under an unsaved local draft. */
    _layoutSig(units) {
        try {
            return JSON.stringify(unitsToSaveItems(units || []));
        } catch {
            return "";
        }
    }

    _persistCurrentTabDraft() {
        // With Gridstack, live edits already flow into
        // _editDraftsBySection[sectionId].units via onGsChange, so the draft is
        // always current — we must NOT overwrite it from the stale mount
        // snapshot. Only ensure a draft object exists for the current tab.
        const section = this.tabs[this.state.activeTab];
        const sectionId = section?.id;
        if (!sectionId) {
            return;
        }
        if (!this._editDraftsBySection[sectionId]) {
            this._editDraftsBySection[sectionId] = this._draftFor(section, normalizeEditUnits(section.units || []), false);
        }
    }

    _loadTabDraftForEdit() {
        const section = this.activeSection;
        const sectionId = section?.id;
        if (!sectionId) {
            return;
        }
        let draft = this._editDraftsBySection[sectionId];
        if (!draft) {
            draft = this._draftFor(section, normalizeEditUnits(section.units || []), false);
            this._editDraftsBySection[sectionId] = draft;
        }
        this._editLayoutDraft = cloneUnits(draft.units);
        this.state.draftUnits = this._editLayoutDraft;
        this.state.editSession = Date.now();
        this._syncGlobalEditDirty();
    }

    _rehydrateEditDraftsFromLayout(preserveDirty = false) {
        for (const tab of this.tabs) {
            const sectionId = tab.id;
            if (!sectionId) {
                continue;
            }
            if (preserveDirty && this._editDraftsBySection[sectionId]?.dirty) {
                // Keep the unsaved local draft, but tell the user when the
                // server layout changed underneath it (another session saved).
                const draft = this._editDraftsBySection[sectionId];
                const sig = this._layoutSig(tab.units);
                if (draft.baseSig && sig && draft.baseSig !== sig) {
                    draft.baseSig = sig;
                    this.notification.add(
                        _t('تغيّر تخطيط تبويب "%s" من جلسة أخرى — تعديلاتك غير المحفوظة ستستبدل ذلك عند الحفظ', tab.name),
                        { type: "warning" }
                    );
                }
                continue;
            }
            this._editDraftsBySection[sectionId] = this._draftFor(tab, normalizeEditUnits(tab.units || []), false);
        }
        this._loadTabDraftForEdit();
    }

    /** Build a per-tab edit draft: visible units (tagged _wasVisible) plus the
     *  removed cards for that tab (from get_layout), so the "+ add" panel and
     *  the save-time visibility diff have everything they need. */
    _draftFor(section, units, dirty) {
        (units || []).forEach((u) => { u._wasVisible = true; });
        const removedUnits = normalizeEditUnits((section && section.removed_units) || []);
        removedUnits.forEach((u) => { u._wasVisible = false; });
        return {
            units: units || [],
            removedUnits,
            dirty,
            baseSig: this._layoutSig(section && section.units),
        };
    }

    enterEditMode() {
        if (!this.state.layout.can_edit) return;
        const sectionId = this.activeSection?.id;
        if (!sectionId) return;
        const { units: normalized, repaired } = normalizeEditUnitsWithMeta(this.activeUnits);
        this._editDraftsBySection = {};
        this._editSectionVis = {};
        this._pendingMoves = {};
        this.state.addPanelOpen = false;
        this.state.editing = true;
        this.state.editDirty = repaired;
        this.state.editSession = Date.now();
        this.state.dragIndex = null;
        this.state.dragInsertIndex = null;
        this.state.confirmDiscard = null;
        this._editDraftsBySection[sectionId] = this._draftFor(this.activeSection, normalized, repaired);
        this._loadTabDraftForEdit();
        document.body.classList.add("o_baha_edit_mode");
        if (repaired) {
            this.notification.add(
                _t("تم إصلاح تخطيط البطاقات المحفوظ (كان فيه تداخل) — راجع الأحجام ثم احفظ التخطيط"),
                { type: "warning" }
            );
        }
    }

    /** Ask before throwing away unsaved edits; the actual discard happens in
     *  confirmDiscardYes(). Cancel/Reload with a clean draft skip the prompt. */
    cancelEditMode() {
        if (this.state.editDirty) {
            this.state.confirmDiscard = "cancel";
            return;
        }
        this._doCancelEditMode();
    }

    resetEditDraft() {
        const sectionId = this.activeSection?.id;
        if (sectionId && this._editDraftsBySection[sectionId]?.dirty) {
            this.state.confirmDiscard = "reset";
            return;
        }
        this._doResetEditDraft();
    }

    confirmDiscardYes() {
        const action = this.state.confirmDiscard;
        this.state.confirmDiscard = null;
        if (action === "cancel") {
            this._doCancelEditMode();
        } else if (action === "reset") {
            this._doResetEditDraft();
        }
    }

    confirmDiscardNo() {
        this.state.confirmDiscard = null;
    }

    _doCancelEditMode() {
        this.state.editing = false;
        this.state.draftUnits = [];
        this.state.editDirty = false;
        this.state.dragIndex = null;
        this.state.dragInsertIndex = null;
        this.state.confirmDiscard = null;
        this.state.addPanelOpen = false;
        this._editLayoutDraft = null;
        this._editDraftsBySection = {};
        this._editSectionVis = {};
        this._pendingMoves = {};
        document.body.classList.remove("o_baha_edit_mode");
    }

    _doResetEditDraft() {
        const sectionId = this.activeSection?.id;
        if (sectionId) {
            this._editDraftsBySection[sectionId] = this._draftFor(this.activeSection, normalizeEditUnits(this.activeUnits), false);
        }
        this._editSectionVis = {};
        this._loadTabDraftForEdit();
        this.state.dragIndex = null;
        this.state.dragInsertIndex = null;
    }

    /** Gridstack reports the whole tab's geometry (keyed by unit.key) on every
     *  move/resize. Fold it back into the active section's draft (positions
     *  only) and mark dirty. We update the persisted draft array in place and
     *  DON'T touch state.draftUnits, so the editor never re-renders mid-drag. */
    onGsChange(layout) {
        const sectionId = this.activeSection?.id;
        if (!sectionId) {
            return;
        }
        const draft = this._editDraftsBySection[sectionId];
        if (!draft) {
            return;
        }
        for (const unit of draft.units) {
            const p = layout[unit.key];
            if (!p) {
                continue;
            }
            unit.grid_x = p.grid_x;
            unit.grid_y = p.grid_y;
            unit.col_span = p.col_span;
            unit.row_span = p.row_span;
            // A panel moves/resizes as one outer box; unitsToSaveItems reads
            // these as the group_* fields, so the inner layout is preserved.
            if (unit.kind !== "panel" && unit.comp) {
                unit.comp.grid_x = p.grid_x;
                unit.comp.grid_y = p.grid_y;
                unit.comp.col_span = p.col_span;
                unit.comp.row_span = p.row_span;
            }
        }
        draft.dirty = true;
        if (!this.state.editDirty) {
            this.state.editDirty = true;
        }
    }

    /** Toggle free-placement (leave gaps) vs auto-compact (top gravity). The
     *  GridstackEditor reacts to the prop change via onPatched. Persisted per
     *  user in localStorage so it sticks across sessions. */
    toggleEditFloat() {
        this.state.editFloat = !this.state.editFloat;
        try { localStorage.setItem("baha_dash_edit_float", this.state.editFloat ? "1" : "0"); } catch (e) { /* ignore */ }
    }

    toggleAddPanel() {
        this.state.addPanelOpen = !this.state.addPanelOpen;
    }

    /** All dashboard.component ids under a unit (a panel wraps several). */
    _unitCompIds(unit) {
        if (unit.kind === "panel") {
            return (unit.components || []).map((c) => c.id).filter(Boolean);
        }
        return unit.comp && unit.comp.id ? [unit.comp.id] : [];
    }

    /** Remove a card from the active tab (× on the card). Moves it to the
     *  draft's removedUnits so it can be re-added; remounts the grid without it. */
    onRemoveUnit(key) {
        const sectionId = this.activeSection?.id;
        const draft = this._editDraftsBySection[sectionId];
        if (!draft) return;
        const idx = draft.units.findIndex((u) => u.key === key);
        if (idx < 0) return;
        const [unit] = draft.units.splice(idx, 1);
        draft.removedUnits = draft.removedUnits || [];
        draft.removedUnits.push(unit);
        draft.dirty = true;
        this._editLayoutDraft = cloneUnits(draft.units);
        this.state.draftUnits = this._editLayoutDraft;
        this.state.editSession = Date.now();     // force GridstackEditor remount
        this._syncGlobalEditDirty();
    }

    /** Other tabs this card could be moved to (everything but the current). */
    get moveTargets() {
        const current = this.activeSection?.id;
        return this.tabs
            .filter((t) => t.id && t.id !== current)
            .map((t) => ({ id: t.id, name: t.name }));
    }

    /** Move a card to another page. Seeded components are pinned to whichever
     *  page the seed put them on, which is only right until someone disagrees
     *  — so placement is the user's to change, not ours to fix by re-seeding.
     *
     *  The card leaves this tab's draft immediately and is queued for a
     *  section_id change at save time. It is NOT added to the target's draft:
     *  that draft may not be loaded, and re-fetching after the save is what
     *  gives the target its authoritative geometry. */
    onMoveUnitToSection(key, targetSectionId) {
        const sectionId = this.activeSection?.id;
        const draft = this._editDraftsBySection[sectionId];
        if (!draft || !targetSectionId || targetSectionId === sectionId) {
            return;
        }
        const idx = draft.units.findIndex((u) => u.key === key);
        if (idx < 0) {
            return;
        }
        const [unit] = draft.units.splice(idx, 1);
        for (const id of this._unitCompIds(unit)) {
            this._pendingMoves[id] = targetSectionId;
        }
        draft.dirty = true;
        this._editLayoutDraft = cloneUnits(draft.units);
        this.state.draftUnits = this._editLayoutDraft;
        this.state.editSession = Date.now();     // force GridstackEditor remount
        this._syncGlobalEditDirty();
        const target = this.tabs.find((t) => t.id === targetSectionId);
        this.notification.add(
            _t('سيتم نقل البطاقة إلى "%s" عند حفظ التخطيط', (target && target.name) || ""),
            { type: "info" }
        );
    }

    /** Re-add a previously removed card (+ in the add panel). */
    onAddUnit(key) {
        const sectionId = this.activeSection?.id;
        const draft = this._editDraftsBySection[sectionId];
        if (!draft || !draft.removedUnits) return;
        const idx = draft.removedUnits.findIndex((u) => u.key === key);
        if (idx < 0) return;
        const [unit] = draft.removedUnits.splice(idx, 1);
        draft.units.push(unit);
        draft.dirty = true;
        this._editLayoutDraft = cloneUnits(draft.units);
        this.state.draftUnits = this._editLayoutDraft;
        this.state.editSession = Date.now();
        this._syncGlobalEditDirty();
    }

    /** Remove a whole tab (× on the tab). Tracked in _editSectionVis; the tabs
     *  getter drops it, and we switch to a remaining tab. */
    onRemoveTab(sectionId) {
        if (!this._editSectionVis) this._editSectionVis = {};
        this._editSectionVis[sectionId] = false;
        this.state.editDirty = true;
        const tabs = this.tabs;
        if (this.state.activeTab >= tabs.length) {
            this.state.activeTab = Math.max(0, tabs.length - 1);
        }
        this.state.editSession = Date.now();
        this._loadTabDraftForEdit();
    }

    /** Re-add a removed tab (+ in the add panel) and switch to it. */
    onAddTab(sectionId) {
        if (!this._editSectionVis) this._editSectionVis = {};
        this._editSectionVis[sectionId] = true;
        this.state.editDirty = true;
        this.state.addPanelOpen = false;
        const tabs = this.tabs;
        const idx = tabs.findIndex((t) => t.id === sectionId);
        if (idx >= 0) {
            this.state.activeTab = idx;
        }
        this.state.editSession = Date.now();
        this._loadTabDraftForEdit();
    }

    /** Cards currently removed from the active tab (available to re-add). */
    get removedCardsForAdd() {
        const draft = this._editDraftsBySection[this.activeSection?.id];
        return ((draft && draft.removedUnits) || []).map((u) => ({
            key: u.key,
            name: (u.comp && (u.comp.title || u.comp.type)) || u.title || "بطاقة",
        }));
    }

    /** Tabs currently removed (available to re-add): globally-hidden ones not
     *  re-added this session + base tabs hidden this session. */
    get removedTabsForAdd() {
        const vis = this._editSectionVis || {};
        const hidden = (this.state.layout.removed_sections || []).filter((s) => vis[s.id] !== true);
        const sessionHidden = (this.state.layout.sections || []).filter((s) => vis[s.id] === false);
        return [...hidden, ...sessionHidden].map((s) => ({ id: s.id, name: s.name }));
    }

    /** Build the {components, sections} visibility diff for the save RPC. */
    _collectVisibilityChanges() {
        const components = {};
        const sections = {};
        for (const draft of Object.values(this._editDraftsBySection)) {
            for (const u of draft.units || []) {
                if (u._wasVisible === false) {
                    for (const id of this._unitCompIds(u)) components[id] = true;
                }
            }
            for (const u of draft.removedUnits || []) {
                if (u._wasVisible !== false) {
                    for (const id of this._unitCompIds(u)) components[id] = false;
                }
            }
        }
        for (const [sid, vis] of Object.entries(this._editSectionVis || {})) {
            sections[sid] = !!vis;
        }
        return { components, sections };
    }

    async saveEditLayout() {
        if (!this.state.editDirty || this.state.saving) return;
        this.state.saving = true;
        try {
            this._persistCurrentTabDraft();
            const dashboardId = this.state.layout.dashboard_id;
            // One RPC for all dirty tabs = one DB transaction: either every
            // tab is saved or none is (no half-saved layout on failure).
            const sections = this.tabs
                .filter((tab) => tab.id && this._editDraftsBySection[tab.id]?.dirty)
                .map((tab) => ({
                    section_id: tab.id,
                    items: unitsToSaveItems(this._editDraftsBySection[tab.id].units),
                }));
            const visibility = this._collectVisibilityChanges();
            const moves = { ...this._pendingMoves };
            const hasVis = Object.keys(visibility.components).length || Object.keys(visibility.sections).length;
            const hasMoves = Object.keys(moves).length;
            if (!sections.length && !hasVis && !hasMoves) {
                return;
            }
            await rpc("/web/dataset/call_kw/dashboard.dashboard/save_layout_edits", {
                model: "dashboard.dashboard",
                method: "save_layout_edits",
                args: [dashboardId, sections],
                kwargs: {
                    layout_version: this.state.layout.layout_version || null,
                    visibility,
                    moves,
                    target_user_id: this.editUserId || null,
                },
            });
            this._pendingMoves = {};
            for (const section of sections) {
                const draft = this._editDraftsBySection[section.section_id];
                if (draft) {
                    draft.dirty = false;
                }
            }
            this._editSectionVis = {};
            this._syncGlobalEditDirty();
            this.notification.add(_t("تم حفظ تخطيط اللوحة"), { type: "success" });
            await this.loadLayout(true);
        } catch (e) {
            const msg = (e && e.data && e.data.message) || e.message || _t("تعذّر حفظ التخطيط");
            this.notification.add(msg, { type: "danger" });
            // Nothing was persisted (atomic call): resync the base layout and
            // the version token; dirty drafts are preserved by the rehydrate.
            await this.loadLayout(true);
        } finally {
            this.state.saving = false;
        }
    }

    propsFor(comp) {
        const props = { comp, colors: this.state.layout.colors };
        if (!this.state.editing && INTERACTIVE_WIDGETS.has(comp.type)) {
            props.onOpenRecord = this.openRecordDetail.bind(this);
            props.onOpenDrilldown = this.openDrilldown.bind(this);
            // The ⤢ expand icon: opens everything this card holds at once.
            props.onOpenComponent = this.openComponentDetail.bind(this);
        }
        if (comp.type === "toolbar" || comp.type === "banner") {
            props.onAction = this.onAction.bind(this);
            props.canAdvancedImport = Boolean(user.isInternalUser && this.action);
        }
        if (comp.type === "banner") {
            props.tabs = this.tabs;
            props.activeIndex = this.state.activeTab;
            props.onSelectTab = this.selectTab.bind(this);
            props.filter = this.state.filter;
            props.onFilter = this.onFilter.bind(this);
            props.editing = this.state.editing;
            props.onRemoveTab = this.onRemoveTab.bind(this);
        }
        return props;
    }

    // Header date-filter changed -> reload data for the new period and replay the
    // entrance animation so the new numbers "blow up" again.
    onFilter(filter) {
        this.state.filter = filter;
        try { localStorage.setItem("baha_dash_filter", JSON.stringify(filter)); } catch (e) { /* ignore */ }
        this.loadLayout(true);
    }

    onAction(action) {
        if (action === "import") {
            this.state.importOpen = true;
        } else if (action === "advanced_import") {
            if (!user.isInternalUser) {
                this.notification.add("الاستيراد المتقدم متاح من داخل النظام فقط", { type: "warning" });
                return;
            }
            if (!this.action) {
                this.notification.add("الاستيراد المتقدم متاح من داخل النظام فقط", { type: "warning" });
                return;
            }
            this.state.advancedImportOpen = true;
        } else if (action === "export") {
            this.state.exportOpen = true;
        }
    }

    closeImport() {
        this.state.importOpen = false;
    }

    closeExport() {
        this.state.exportOpen = false;
    }

    closeAdvancedImport() {
        this.state.advancedImportOpen = false;
    }

    onImportDone() {
        this.closeImport();
        this.loadLayout(true);
    }

    openAdvancedImport(target) {
        if (!target || !target.model || !this.action) {
            return;
        }
        this.closeAdvancedImport();
        const hash = new URLSearchParams({
            action: "import",
            model: target.model,
        });
        const win = window.open(`/web#${hash.toString()}`, "_blank", "noopener");
        if (!win) {
            this.notification.add("لم يتم فتح نافذة جديدة. تحقق من إعدادات حظر النوافذ المنبثقة.", { type: "warning" });
        }
    }

    /** Open a record as a floating panel. Several can be open at once and each
     *  can be dragged, so two records can be put side by side and compared —
     *  which a single modal could never do. Re-opening the same record brings
     *  the existing panel forward instead of stacking a duplicate on top. */
    async openRecordDetail(record) {
        if (!record || !record.model || !record.id) {
            return;
        }
        const id = `${record.model}:${record.id}`;
        const existing = this.state.detailPanels.find((p) => p.id === id);
        if (existing) {
            this.focusDetailPanel(id);
            return;
        }

        // Cascade each new panel so it does not land exactly on the last one.
        const step = this.state.detailPanels.length % 6;
        const panel = {
            id,
            model: record.model,
            res_id: record.id,
            x: Math.max(16, Math.round(window.innerWidth / 2 - 230) + step * 28),
            y: Math.max(16, 96 + step * 28),
            z: ++this._panelZ,
            loading: true,
            error: "",
            detail: null,
        };
        this.state.detailPanels.push(panel);

        try {
            const detail = await Promise.race([
                rpc("/web/dataset/call_kw/dashboard.dashboard/get_record_detail",
                    { model: "dashboard.dashboard", method: "get_record_detail",
                      args: [record.model, record.id],
                      kwargs: { dashboard_filter: this.state.filter || null } }),
                new Promise((_, rej) => setTimeout(() => rej(new Error("RPC timeout (8s)")), 8000)),
            ]);
            // The panel may have been closed while the request was in flight.
            const live = this.state.detailPanels.find((p) => p.id === id);
            if (live) {
                live.detail = detail;
            }
        } catch (e) {
            const live = this.state.detailPanels.find((p) => p.id === id);
            if (live) {
                live.error = "تعذّر تحميل تفاصيل السجل";
            }
            this.notification.add(e.message || "تعذّر تحميل تفاصيل السجل", { type: "danger" });
        } finally {
            const live = this.state.detailPanels.find((p) => p.id === id);
            if (live) {
                live.loading = false;
            }
        }
    }

    closeDetailPanel(id) {
        const idx = this.state.detailPanels.findIndex((p) => p.id === id);
        if (idx >= 0) {
            this.state.detailPanels.splice(idx, 1);
        }
    }

    closeAllDetailPanels() {
        this.state.detailPanels.length = 0;
    }

    /** Raise a panel above its siblings when it is clicked. */
    focusDetailPanel(id) {
        const panel = this.state.detailPanels.find((p) => p.id === id);
        if (panel && panel.z !== this._panelZ) {
            panel.z = ++this._panelZ;
        }
    }

    moveDetailPanel(id, x, y) {
        const panel = this.state.detailPanels.find((p) => p.id === id);
        if (panel) {
            panel.x = x;
            panel.y = y;
        }
    }

    openFullRecord(detail) {
        if (!detail || !detail.model || !detail.res_id) {
            return;
        }
        if (!user.isInternalUser) {
            this.notification.add("فتح السجل الكامل متاح من داخل النظام فقط", { type: "warning" });
            return;
        }
        const hash = new URLSearchParams({
            model: detail.model,
            id: String(detail.res_id),
            view_type: "form",
        });
        window.open(`/web#${hash.toString()}`, "_blank", "noopener");
    }

    async openDrilldown(aggregate) {
        if (!aggregate || !aggregate.key) {
            return;
        }
        this.state.aggregateList.open = true;
        this.state.aggregateList.loading = true;
        this.state.aggregateList.error = "";
        this.state.aggregateList.detail = null;
        try {
            const detail = await Promise.race([
                rpc("/web/dataset/call_kw/dashboard.dashboard/get_aggregate_records",
                    { model: "dashboard.dashboard", method: "get_aggregate_records",
                      args: [aggregate],
                      kwargs: { dashboard_filter: this.state.filter || null } }),
                new Promise((_, rej) => setTimeout(() => rej(new Error("RPC timeout (8s)")), 8000)),
            ]);
            this.state.aggregateList.detail = detail;
        } catch (e) {
            this.state.aggregateList.error = "تعذّر تحميل قائمة السجلات";
            this.notification.add(e.message || "تعذّر تحميل قائمة السجلات", { type: "danger" });
        } finally {
            this.state.aggregateList.loading = false;
        }
    }

    closeAggregateList() {
        this.state.aggregateList.open = false;
        this.state.aggregateList.loading = false;
        this.state.aggregateList.detail = null;
        this.state.aggregateList.error = "";
    }

    openAggregateRecord(row) {
        if (!row || !row.model || !row.res_id) {
            return;
        }
        this.openFullRecord({ model: row.model, res_id: row.res_id });
    }

    /** The ⤢ expand icon on a card. Unlike the per-item drill-down, this shows
     *  the card's WHOLE dataset in one wizard — no picker, no choosing. The
     *  data is already loaded client-side, so this needs no RPC. */
    openComponentDetail(comp) {
        if (!comp) {
            return;
        }
        // A grouped panel expands to all of its inner components at once.
        const sections = comp.kind === "panel" || comp.components
            ? sectionsForUnit(comp)
            : [sectionForComponent(comp)];
        this.state.componentDetail.title = comp.title || comp.name || "تفاصيل المكوّن";
        this.state.componentDetail.sections = sections;
        this.state.componentDetail.open = true;
    }

    closeComponentDetail() {
        this.state.componentDetail.open = false;
        this.state.componentDetail.sections = [];
        this.state.componentDetail.title = "";
    }

    // ---- Theme picker (edit mode) -------------------------------------------
    // Selecting a preset or nudging a color rewrites state.layout.colors right
    // away, so colorVars re-renders and the change is visible instantly. Only
    // "حفظ المظهر" persists it; "تراجع" restores the palette we opened with.
    toggleThemePanel() {
        if (!this.state.themeOpen) {
            this._themeBackup = {
                colors: { ...(this.state.layout.colors || {}) },
                theme_id: this.state.layout.theme_id,
                custom_theme: this.state.layout.custom_theme,
                custom_primary: this.state.layout.custom_primary,
                custom_accent: this.state.layout.custom_accent,
            };
        }
        this.state.themeOpen = !this.state.themeOpen;
    }

    /** Same 0.82 darkening the server applies, so preview matches the save. */
    _darken(hex, factor = 0.82) {
        const h = String(hex || "").replace("#", "");
        if (h.length !== 6) {
            return hex;
        }
        const part = (i) => {
            const v = Math.round(parseInt(h.slice(i, i + 2), 16) * factor);
            return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0");
        };
        return `#${part(0)}${part(2)}${part(4)}`;
    }

    /** Override only the brand keys — status colors are shared across themes. */
    _previewBrand(brand) {
        this.state.layout.colors = { ...(this.state.layout.colors || {}), ...brand };
    }

    pickPreset(theme) {
        this.state.layout.custom_theme = false;
        this.state.layout.theme_id = theme.id;
        this._previewBrand({
            primary: theme.primary,
            primary_dark: theme.primary_dark,
            accent: theme.accent,
            pattern: theme.pattern,
        });
    }

    pickCustom(primary, accent) {
        const p = primary || this.state.layout.custom_primary;
        const a = accent || this.state.layout.custom_accent;
        this.state.layout.custom_theme = true;
        this.state.layout.custom_primary = p;
        this.state.layout.custom_accent = a;
        this._previewBrand({
            primary: p, primary_dark: this._darken(p), accent: a, pattern: "none",
        });
    }

    revertTheme() {
        const b = this._themeBackup;
        if (b) {
            this.state.layout.colors = { ...b.colors };
            this.state.layout.theme_id = b.theme_id;
            this.state.layout.custom_theme = b.custom_theme;
            this.state.layout.custom_primary = b.custom_primary;
            this.state.layout.custom_accent = b.custom_accent;
        }
        this.state.themeOpen = false;
    }

    /** Persist the current custom colours as a new named preset, so they can be
     *  picked again later alongside the shipped themes. */
    async saveAsPreset() {
        const name = (this.state.themeName || "").trim();
        if (!name) {
            return;
        }
        this.state.themeSaving = true;
        try {
            const res = await rpc("/web/dataset/call_kw/dashboard.dashboard/create_theme", {
                model: "dashboard.dashboard",
                method: "create_theme",
                args: [],
                kwargs: {
                    name,
                    primary: this.state.layout.custom_primary,
                    accent: this.state.layout.custom_accent,
                    target_user_id: this.editUserId || null,
                },
            });
            Object.assign(this.state.layout, {
                colors: res.colors,
                theme: res.theme,
                theme_id: res.theme_id,
                custom_theme: res.custom_theme,
                themes: res.themes,
            });
            this.state.themeName = "";
            this._themeBackup = null;
        } catch (e) {
            this.state.errorMsg = "تعذّر حفظ المظهر الجديد.";
        } finally {
            this.state.themeSaving = false;
        }
    }

    async saveTheme() {
        this.state.themeSaving = true;
        try {
            const custom = !!this.state.layout.custom_theme;
            const res = await rpc("/web/dataset/call_kw/dashboard.dashboard/save_theme", {
                model: "dashboard.dashboard",
                method: "save_theme",
                args: [],
                kwargs: {
                    theme_id: custom ? null : this.state.layout.theme_id || null,
                    use_custom: custom,
                    primary: this.state.layout.custom_primary,
                    accent: this.state.layout.custom_accent,
                    target_user_id: this.editUserId || null,
                },
            });
            Object.assign(this.state.layout, {
                colors: res.colors,
                theme: res.theme,
                theme_id: res.theme_id,
                custom_theme: res.custom_theme,
                custom_primary: res.custom_primary,
                custom_accent: res.custom_accent,
            });
            this._themeBackup = null;
            this.state.themeOpen = false;
        } catch (e) {
            this.state.errorMsg = "تعذّر حفظ المظهر.";
        } finally {
            this.state.themeSaving = false;
        }
    }

    get colorVars() {
        const colors = (this.state.layout && this.state.layout.colors) || {};
        return Object.entries(colors)
            .map(([key, val]) => `--dash-${key.replace(/_/g, "-")}: ${val}`)
            .join(";");
    }
}

// Backend client action (internal/admin — rendered inside the web client with navbar).
registry.category("actions").add("dashboard_app.main", Dashboard);
// Frontend/public component (portal users — mounted on the /dashboard website page,
// no Odoo backend chrome). Same component, two mount points.
registry.category("public_components").add("dashboard_app.dashboard", Dashboard);
