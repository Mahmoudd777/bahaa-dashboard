/** @odoo-module **/

import { Component, onWillUnmount, useRef, xml } from "@odoo/owl";

/**
 * A record's detail as a floating, draggable window rather than a modal.
 *
 * Modals are wrong for this job: only one can be open, and the record opened
 * from inside the "expand" wizard rendered *behind* it. Executives comparing
 * two KPIs side by side need several open at once and need to move them, so
 * these are deliberately non-modal — no backdrop, page stays usable, and any
 * number can be on screen.
 *
 * Position lives in the parent's state (so it survives re-render), but the
 * drag itself writes straight to the element's style. Routing every
 * pointermove through reactive state would re-render the whole panel ~60
 * times a second for no benefit; state is only updated once, on release.
 */
export class FloatingDetailPanel extends Component {
    static template = xml`
        <div class="o_baha_float" t-ref="panel"
             t-attf-style="left:{{props.panel.x}}px; top:{{props.panel.y}}px; z-index:{{props.panel.z}};"
             t-on-pointerdown="() => props.onFocus(props.panel.id)"
             role="dialog" tabindex="-1">
            <div class="o_baha_float__head" t-on-pointerdown="startDrag">
                <div class="o_baha_float__titles">
                    <div class="o_baha_float__eyebrow">تفاصيل السجل</div>
                    <div class="o_baha_float__title" t-esc="title"/>
                    <div t-if="subtitle" class="o_baha_float__subtitle" t-esc="subtitle"/>
                </div>
                <div class="o_baha_float__headtools">
                    <span t-if="badge.label" class="o_baha_badge"
                          t-attf-class="o_baha_badge--{{badge.level or 'none'}}" t-esc="badge.label"/>
                    <button class="o_baha_float__close" t-on-click="() => props.onClose(props.panel.id)"
                            aria-label="إغلاق">
                        <i class="fa fa-times"/>
                    </button>
                </div>
            </div>

            <div class="o_baha_float__body">
                <t t-if="props.panel.loading">
                    <div class="o_baha_detail_modal__state">
                        <i class="fa fa-spinner fa-spin"/>
                        <span>جارٍ تحميل التفاصيل...</span>
                    </div>
                </t>
                <t t-elif="props.panel.error">
                    <div class="o_baha_detail_modal__state o_baha_detail_modal__state--error">
                        <i class="fa fa-exclamation-triangle"/>
                        <span t-esc="props.panel.error"/>
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

                    <section t-if="detail.table and detail.table.rows and detail.table.rows.length"
                             class="o_baha_detail_table">
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

            <div class="o_baha_float__foot">
                <button class="o_baha_btn o_baha_btn--ghost"
                        t-on-click="() => props.onClose(props.panel.id)">إغلاق</button>
                <button t-if="canOpenFull" class="o_baha_btn o_baha_btn--primary"
                        t-on-click="() => props.onOpenFull(detail)">
                    <i class="fa fa-external-link"/>
                    <span>فتح السجل الكامل</span>
                </button>
            </div>
        </div>`;

    static props = ["panel", "onClose", "onFocus", "onMove", "onOpenFull?"];

    setup() {
        this.panelRef = useRef("panel");
        this._stopDrag = null;
        // A panel can be closed mid-drag (Esc, or the parent dropping it);
        // without this the window-level listeners would outlive the component.
        onWillUnmount(() => this._stopDrag && this._stopDrag());
    }

    get detail() {
        return this.props.panel.detail || {};
    }
    get title() {
        return this.detail.title || this.props.panel.title || "تفاصيل السجل";
    }
    get subtitle() {
        return this.detail.subtitle || "";
    }
    get badge() {
        return this.detail.badge || {};
    }
    get canOpenFull() {
        const p = this.props.panel;
        return Boolean(
            this.props.onOpenFull && this.detail.model && this.detail.res_id && !p.loading && !p.error
        );
    }

    /** Keep a panel from being dragged fully off-screen — a window you cannot
     *  reach again is worse than one that will not move. */
    _clamp(x, y) {
        const el = this.panelRef.el;
        const w = el ? el.offsetWidth : 420;
        const MARGIN = 40;
        return {
            x: Math.max(MARGIN - w, Math.min(x, window.innerWidth - MARGIN)),
            y: Math.max(0, Math.min(y, window.innerHeight - MARGIN)),
        };
    }

    startDrag(ev) {
        // Let the close button behave like a button.
        if (ev.target.closest(".o_baha_float__close")) {
            return;
        }
        if (ev.button !== undefined && ev.button !== 0) {
            return;
        }
        ev.preventDefault();
        const el = this.panelRef.el;
        const startX = ev.clientX;
        const startY = ev.clientY;
        const origX = this.props.panel.x;
        const origY = this.props.panel.y;
        let last = { x: origX, y: origY };

        const onMove = (e) => {
            last = this._clamp(origX + (e.clientX - startX), origY + (e.clientY - startY));
            // Straight to the DOM: state is committed once, on release.
            el.style.left = `${last.x}px`;
            el.style.top = `${last.y}px`;
        };
        const onUp = () => {
            this._stopDrag();
            this.props.onMove(this.props.panel.id, last.x, last.y);
        };
        this._stopDrag = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            this._stopDrag = null;
            if (el) {
                el.classList.remove("o_baha_float--dragging");
            }
        };
        el.classList.add("o_baha_float--dragging");
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    }
}
