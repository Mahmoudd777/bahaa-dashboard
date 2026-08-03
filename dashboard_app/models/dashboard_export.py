import io

from odoo import api, fields, models
from odoo.exceptions import UserError

from .dashboard_filter import domain as filter_domain
from .dashboard_filter import normalize
from .dashboard_import_registry import get_target, list_targets

EXPORT_ROW_LIMIT = 5000


class DashboardExport(models.AbstractModel):
    _name = "dashboard.export"
    _description = "Dashboard Data Export"

    @api.model
    def get_export_targets(self):
        """RPC entry: whitelisted models the current user may export."""
        if not self.env.user.sudo().dashboard_access:
            return []
        return list_targets(self.env, require_read=True)

    @api.model
    def build_export_xlsx(self, target_key, dashboard_filter):
        """Generate an Excel export for the given target, filtered by dashboard_filter."""
        if not self.env.user.sudo().dashboard_access:
            raise UserError("Dashboard access is required.")
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

        for col, header in enumerate(data["headers"]):
            sheet.write(0, col, header, header_fmt)
            sheet.set_column(col, col, 22)

        for r, row in enumerate(data["rows"], start=1):
            for c, value in enumerate(row):
                sheet.write(r, c, value, cell_fmt)

        if data["truncated"]:
            sheet.write(
                len(data["rows"]) + 2, 0,
                "تم عرض أول %d سجل فقط، ولم يتم تضمين بقية السجلات." % EXPORT_ROW_LIMIT,
            )

        workbook.close()
        output.seek(0)
        return output.read()

    @api.model
    def build_export_pdf(self, target_key, dashboard_filter):
        """Generate a PDF export for the given target, filtered by dashboard_filter."""
        if not self.env.user.sudo().dashboard_access:
            raise UserError("Dashboard access is required.")

        spec = self._resolve_target(target_key)
        data = self._fetch_rows(spec, dashboard_filter)
        company = self.env.company
        logo = company.logo
        if isinstance(logo, bytes):
            logo = logo.decode()

        report_data = {
            "target_label": spec["label"],
            "headers": data["headers"],
            "rows": data["rows"],
            "truncated": data["truncated"],
            "filter_label": self._filter_label(spec, dashboard_filter),
            "generated_at": fields.Datetime.context_timestamp(self, fields.Datetime.now()).strftime(
                "%Y-%m-%d %H:%M"
            ),
            "company_name": company.name,
            "logo": logo,
        }
        content, _report_type = self.env["ir.actions.report"].sudo()._render_qweb_pdf(
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
        self.env[spec["model"]].check_access_rights("read")
        return spec

    @api.model
    def _fetch_rows(self, spec, dashboard_filter):
        model = self.env[spec["model"]]
        model.check_access_rights("read")
        model = model.sudo()

        dom = []
        if spec.get("date_field"):
            dom = filter_domain(normalize(dashboard_filter), spec["date_field"], spec["date_kind"])

        field_names = [c["field"] for c in spec["columns"]]
        records = model.search(dom, limit=EXPORT_ROW_LIMIT + 1)
        truncated = len(records) > EXPORT_ROW_LIMIT
        records = records[:EXPORT_ROW_LIMIT]
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
                elif val in (False, None):
                    row.append("")
                else:
                    row.append(val)
            rows.append(row)

        return {
            "headers": [c["header"] for c in spec["columns"]],
            "rows": rows,
            "truncated": truncated,
        }

    @api.model
    def _selection_label(self, field, value):
        if not value:
            return ""
        sel = field.selection
        if callable(sel) or not isinstance(sel, list):
            return value
        return dict(sel).get(value, value)

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
