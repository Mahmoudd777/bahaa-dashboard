/** @odoo-module **/

import { Component, onMounted, useRef, xml } from "@odoo/owl";

/** Render one table cell to plain text. Table rows carry rich cells
 *  ({type:"progress"|"badge"|"tag"}); the expanded view is a plain reading
 *  table, so they collapse to their readable value. */
function cellText(cell) {
    if (cell === null || cell === undefined) {
        return "";
    }
    if (typeof cell === "object") {
        if (cell.type === "progress") {
            return cell.value === undefined ? "" : `${cell.value}%`;
        }
        return cell.label ?? cell.text ?? "";
    }
    return String(cell);
}

/** Columns the expanded view can show, in display order. Widgets each carry a
 *  different subset, so the table is built from whichever keys are actually
 *  present — a gauge grid shows label/value/change, a KPI grid adds
 *  target/percentage, the risk list adds severity/date. */
const ITEM_COLUMNS = [
    { keys: ["_group"], label: "المجموعة" },
    { keys: ["label", "text"], label: "العنصر" },
    { keys: ["value"], label: "القيمة", unitKey: "unit" },
    { keys: ["target"], label: "المستهدف" },
    { keys: ["pct"], label: "النسبة", suffix: "%" },
    { keys: ["budget"], label: "الميزانية" },
    { keys: ["quality"], label: "الجودة" },
    { keys: ["severity"], label: "الخطورة" },
    { keys: ["tag"], label: "التصنيف" },
    { keys: ["date"], label: "التاريخ" },
    { keys: ["delta"], label: "التغير" },
    { keys: ["decision"], label: "القرار" },
];

function valueFor(item, col) {
    const key = col.keys.find((k) => item[k] !== undefined && item[k] !== null && item[k] !== "");
    if (!key) {
        return "";
    }
    let out = cellText(item[key]);
    if (col.unitKey && item[col.unitKey]) {
        out = `${out} ${item[col.unitKey]}`;
    }
    if (col.suffix) {
        out = `${out}${col.suffix}`;
    }
    return out;
}

/** Flatten one component into {title, columns, rows} for the expanded view.
 *  Handles the three shapes widgets use: a ready-made table (data_table),
 *  a flat item list (most cards), and grouped items (alerts panel). */
export function sectionForComponent(comp) {
    const data = (comp && comp.data) || {};
    const title = (comp && comp.title) || "";

    // Already tabular — keep the component's own columns.
    if (Array.isArray(data.rows) && data.rows.length) {
        return {
            title,
            columns: data.columns || [],
            rows: data.rows.map((r) => ({
                cells: (r.cells || []).map(cellText),
                record: r.record,
                aggregate: r.aggregate,
            })),
        };
    }

    let items = data.items || [];
    if (!items.length && Array.isArray(data.groups)) {
        items = data.groups.flatMap((g) =>
            (g.items || []).map((it) => ({ ...it, _group: g.title }))
        );
    }
    if (!items.length) {
        return { title, columns: [], rows: [] };
    }

    const cols = ITEM_COLUMNS.filter((col) =>
        items.some((it) => col.keys.some((k) => it[k] !== undefined && it[k] !== null && it[k] !== ""))
    );
    return {
        title,
        columns: cols.map((c) => c.label),
        rows: items.map((it) => ({
            cells: cols.map((c) => valueFor(it, c)),
            record: it.record,
            aggregate: it.aggregate,
        })),
    };
}

/** Every component under a layout unit: a plain card yields one section, a
 *  grouped panel yields one per inner component so the whole panel opens at
 *  once rather than card by card. */
export function sectionsForUnit(unit) {
    if (!unit) {
        return [];
    }
    if (unit.kind === "panel") {
        return (unit.components || []).map(sectionForComponent).filter((s) => s.rows.length);
    }
    return unit.comp ? [sectionForComponent(unit.comp)] : [];
}

/**
 * "Expand" wizard: shows everything a card holds in one reading view, instead
 * of making the user open items one at a time. Rows that map to a record stay
 * clickable and hand off to the existing single-record detail wizard.
 */
export class ComponentDetailModal extends Component {
    static template = xml`
        <div class="o_baha_modal__backdrop o_baha_detail_backdrop" t-on-click="() => props.onClose()">
            <div class="o_baha_modal o_baha_detail_modal o_baha_lines_modal" t-on-click.stop=""
                 t-ref="dialog" tabindex="-1" role="dialog" aria-modal="true">
                <div class="o_baha_modal__header o_baha_detail_modal__header">
                    <div>
                        <div class="o_baha_detail_modal__eyebrow">عرض كامل البيانات</div>
                        <h3 class="o_baha_modal__title" t-esc="props.title"/>
                        <div t-if="totalRows" class="o_baha_detail_modal__subtitle">
                            <t t-esc="totalRows"/> عنصر
                        </div>
                    </div>
                    <button class="o_baha_modal__close" t-on-click="() => props.onClose()" aria-label="إغلاق">
                        <i class="fa fa-times"/>
                    </button>
                </div>

                <div class="o_baha_modal__body o_baha_detail_modal__body">
                    <t t-if="!totalRows">
                        <div class="o_baha_detail_modal__state">
                            <i class="fa fa-info-circle"/>
                            <span>لا توجد بيانات لعرضها في هذا المكوّن.</span>
                        </div>
                    </t>
                    <t t-else="">
                        <t t-foreach="filledSections" t-as="section" t-key="section_index">
                            <section class="o_baha_detail_table o_baha_lines_table">
                                <h4 t-if="filledSections.length > 1" t-esc="section.title"/>
                                <table>
                                    <thead>
                                        <tr>
                                            <t t-foreach="section.columns" t-as="col" t-key="col_index">
                                                <th t-esc="col"/>
                                            </t>
                                            <th t-if="canOpen" class="o_baha_lines_table__action">فتح</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <t t-foreach="section.rows" t-as="row" t-key="row_index">
                                            <tr>
                                                <t t-foreach="row.cells" t-as="cell" t-key="cell_index">
                                                    <td t-esc="cell"/>
                                                </t>
                                                <td t-if="canOpen" class="o_baha_lines_table__action">
                                                    <button t-if="isOpenable(row)"
                                                            class="o_baha_line_open"
                                                            title="فتح تفاصيل هذا السجل"
                                                            t-on-click="() => this.open(row)">
                                                        <i class="fa fa-external-link"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        </t>
                                    </tbody>
                                </table>
                            </section>
                        </t>
                    </t>
                </div>

                <div class="o_baha_modal__footer">
                    <button class="o_baha_btn o_baha_btn--ghost" t-on-click="() => props.onClose()">إغلاق</button>
                </div>
            </div>
        </div>`;

    static props = ["title", "sections", "onClose", "onOpenRecord?", "onOpenDrilldown?"];

    setup() {
        // Move focus into the dialog on open. Without this, focus stays on the
        // card that was clicked; closing with Esc switches the browser into
        // keyboard mode, so that still-focused card then matches :focus-visible
        // and paints a focus ring the user never asked for.
        this.dialogRef = useRef("dialog");
        onMounted(() => this.dialogRef.el && this.dialogRef.el.focus());
    }

    get filledSections() {
        return (this.props.sections || []).filter((s) => s.rows && s.rows.length);
    }

    get totalRows() {
        return this.filledSections.reduce((n, s) => n + s.rows.length, 0);
    }

    /** Only reserve the action column when something in here can be opened. */
    get canOpen() {
        return this.filledSections.some((s) => s.rows.some((r) => this.isOpenable(r)));
    }

    isOpenable(row) {
        return Boolean(row.record || row.aggregate);
    }

    open(row) {
        if (row.record && this.props.onOpenRecord) {
            this.props.onOpenRecord(row.record);
        } else if (row.aggregate && this.props.onOpenDrilldown) {
            this.props.onOpenDrilldown(row.aggregate);
        }
    }
}
