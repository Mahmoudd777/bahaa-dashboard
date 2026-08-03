import io

from odoo import api, fields, models
from odoo.exceptions import UserError

from .dashboard_filter import domain as filter_domain
from .dashboard_filter import normalize
from .dashboard_import_registry import get_target, list_targets

EXPORT_ROW_LIMIT = 5000
# wkhtmltopdf's RSS regularly exceeds 1 GB rendering large landscape tables; the
# droplet is 1 vCPU / 2 GB with no swap, so PDF gets its own, much lower cap.
EXPORT_ROW_LIMIT_PDF = 500


class DashboardExport(models.AbstractModel):
    _name = "dashboard.export"
    _description = "Dashboard Data Export"

    @api.model
    def get_export_targets(self):
        """RPC entry: whitelisted models the current user may export.

        No `albaha.*` model grants anything to base.group_portal — this
        deployment's security model is: gate on dashboard_access, then read
        via .sudo(). Mirrors dashboard_import.py's get_import_targets.
        """
        if not self.env.user.sudo().dashboard_access:
            return []
        return list_targets(self.sudo().env)

    @api.model
    def build_export_xlsx(self, target_key, dashboard_filter):
        """Generate an Excel export for the given target, filtered by dashboard_filter."""
        if not self.env.user.sudo().dashboard_access:
            raise UserError("يلزم الوصول إلى لوحة التحكم.")
        import xlsxwriter  # noqa: PLC0415

        spec = self._resolve_target(target_key)
        data = self._fetch_rows(spec, dashboard_filter)

        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {"in_memory": True})
        sheet = workbook.add_worksheet(spec["label"][:31])
        sheet.right_to_left()

        header_fmt = workbook.add_format(
            {"bold": True, "bg_color": "#5C4B43", "font_color": "#FFFFFF", "border": 1}
        )
        cell_fmt = workbook.add_format({"border": 1})
        note_fmt = workbook.add_format({"italic": True, "font_color": "#717680"})

        # SQL NULL never satisfies "<=", so a date filter silently drops
        # records with an empty date field. Surface that instead of hiding it.
        header_row = 0
        note = self._date_filter_note(spec, dashboard_filter)
        if note:
            sheet.write(header_row, 0, note, note_fmt)
            header_row += 2

        for col, header in enumerate(data["headers"]):
            sheet.write(header_row, col, header, header_fmt)
            sheet.set_column(col, col, 22)

        for r, row in enumerate(data["rows"], start=header_row + 1):
            for c, value in enumerate(row):
                sheet.write(r, c, value, cell_fmt)

        if data["truncated"]:
            sheet.write(
                header_row + len(data["rows"]) + 2, 0,
                "تم عرض أول %d سجل فقط، ولم يتم تضمين بقية السجلات." % data["row_limit"],
            )

        workbook.close()
        output.seek(0)
        return output.read()

    @api.model
    def build_export_pdf(self, target_key, dashboard_filter):
        """Generate a PDF export for the given target, filtered by dashboard_filter."""
        if not self.env.user.sudo().dashboard_access:
            raise UserError("يلزم الوصول إلى لوحة التحكم.")

        spec = self._resolve_target(target_key)
        data = self._fetch_rows(spec, dashboard_filter, row_limit=EXPORT_ROW_LIMIT_PDF)
        company = self.env.company
        logo = company.logo
        if isinstance(logo, bytes):
            logo = logo.decode()

        report_data = {
            "target_label": spec["label"],
            "headers": data["headers"],
            "rows": data["rows"],
            "truncated": data["truncated"],
            "row_limit": data["row_limit"],
            "filter_label": self._filter_label(spec, dashboard_filter),
            "date_filter_note": self._date_filter_note(spec, dashboard_filter),
            "generated_at": fields.Datetime.context_timestamp(self, fields.Datetime.now()).strftime(
                "%Y-%m-%d %H:%M"
            ),
            "company_name": company.name,
            "logo": logo,
        }
        # _get_report() already sudos internally so the report/paperformat
        # lookup is unrestricted while the evaluation context (and therefore
        # the report layout's language/direction) stays the current user's —
        # sudoing the whole call would make it render as OdooBot (LTR/en-US).
        content, _report_type = self.env["ir.actions.report"]._render_qweb_pdf(
            "dashboard_app.action_report_export", res_ids=[], data=report_data
        )
        return content

    @api.model
    def _resolve_target(self, target_key):
        spec = get_target(target_key)
        if not spec:
            raise UserError("نوع البيانات المحدد غير مدعوم.")
        if spec["model"] not in self.env.registry.models:
            raise UserError("نموذج البيانات غير متوفر في النظام.")
        return spec

    @api.model
    def _fetch_rows(self, spec, dashboard_filter, row_limit=EXPORT_ROW_LIMIT):
        model = self.env[spec["model"]].sudo()

        dom = []
        if spec.get("date_field"):
            dom = filter_domain(normalize(dashboard_filter), spec["date_field"], spec["date_kind"])

        field_names = [c["field"] for c in spec["columns"]]
        records = model.search(dom, limit=row_limit + 1)
        truncated = len(records) > row_limit
        records = records[:row_limit]
        raw = records.read(field_names) if records else []

        # Batch-resolve Many2one columns to their relation_lookup value (e.g.
        # "PIL-01") instead of Odoo's default (id, display_name) tuple.
        lookup_cache = {}
        for col in spec["columns"]:
            if col.get("relation") and col.get("relation_lookup"):
                fname = col["field"]
                ids = {vals[fname][0] for vals in raw if vals.get(fname)}
                if ids:
                    related = self.env[col["relation"]].sudo().browse(ids)
                    lookup_cache[fname] = {r.id: (r[col["relation_lookup"]] or "") for r in related}

        rows = []
        for vals in raw:
            row = []
            for col in spec["columns"]:
                fname = col["field"]
                val = vals.get(fname)
                if col.get("relation"):
                    row.append(lookup_cache.get(fname, {}).get(val[0], "") if val else "")
                    continue
                field = model._fields.get(fname)
                ftype = field.type if field else False
                if ftype == "selection":
                    row.append(self._selection_label(field, val))
                elif ftype in ("date", "datetime") and val:
                    row.append(str(val)[:10])
                elif val is False or val is None:
                    # Odoo's ORM only ever returns False for "unset", never
                    # None — but `0 == False` in Python, so a bare `in (False,
                    # None)` check would blank out genuine zero values too.
                    row.append("")
                else:
                    row.append(val)
            rows.append(row)

        return {
            "headers": [c["header"] for c in spec["columns"]],
            "rows": rows,
            "truncated": truncated,
            "row_limit": row_limit,
        }

    @api.model
    def _selection_label(self, field, value):
        if value is False or value is None:
            return ""
        # dict(field.selection) reads raw untranslated Python strings, so
        # labels would export as English inside an Arabic RTL document.
        # _description_selection() handles translation and callables.
        sel = field._description_selection(self.env)
        return dict(sel).get(value, value)

    @api.model
    def _date_filter_note(self, spec, dashboard_filter):
        """SQL NULL never satisfies "<=", so a date filter silently drops
        records with an empty date field. Only surface the note when a filter
        is genuinely in effect (not "all" mode) on a filterable target — the
        filter semantics themselves must stay identical to the dashboard's.
        """
        if not spec.get("date_field"):
            return False
        if normalize(dashboard_filter)["mode"] == "all":
            return False
        return "لا تشمل السجلات بدون تاريخ"

    @api.model
    def _filter_label(self, spec, dashboard_filter):
        if not spec.get("date_field"):
            return "هذا النوع من البيانات غير مرتبط بفترة زمنية"
        flt = normalize(dashboard_filter)
        mode = flt["mode"]
        if mode == "period":
            return "الفترة: من %s إلى %s" % (flt["from"], flt["to"])
        if mode == "quarter":
            year, qnum = flt["quarter"].split("-Q")
            return "الفترة: الربع %s من %s" % (qnum, year)
        if mode == "uptodate":
            return "حتى تاريخ: %s" % flt["date"]
        return "كل الفترات"
