import base64
import json
import logging
from datetime import date

from odoo import http
from odoo.http import request

from odoo.addons.web.controllers.home import Home
from odoo.addons.web.controllers.utils import is_user_internal

_logger = logging.getLogger(__name__)


class DashboardHome(Home):
    """Send portal (non-internal) users to the frontend dashboard page after
    login. Odoo blocks portal users from the backend (/web, /odoo), so they get
    the dashboard as a website page instead. Internal users keep Odoo's default
    (land in the backend web client, where they can navigate to other apps).
    """

    def _login_redirect(self, uid, redirect=None):
        if not is_user_internal(uid):
            if not redirect or redirect.startswith(("/web", "/odoo")):
                return "/dashboard"
        return super()._login_redirect(uid, redirect=redirect)

    @http.route("/web/login_successful", type="http", auth="user", website=True, sitemap=False)
    def login_successful_external_user(self, **kwargs):
        if request.session.uid and not is_user_internal(request.session.uid):
            return request.redirect("/dashboard")
        return super().login_successful_external_user(**kwargs)


class DashboardLogo(http.Controller):

    @http.route("/dashboard_app/website_logo", type="http", auth="public", sitemap=False)
    def website_logo(self, **kw):
        company = request.env["res.company"].sudo().search([], order="id", limit=1)
        if not company.website_logo:
            return request.not_found()
        return (
            request.env["ir.binary"]
            ._get_stream_from(company, "website_logo")
            .get_response()
        )


class DashboardPage(http.Controller):

    @http.route("/dashboard", type="http", auth="user", sitemap=False)
    def dashboard_page(self, **kw):
        return request.render("dashboard_app.dashboard_page")


class DashboardImportController(http.Controller):

    @http.route("/dashboard_app/import/template", type="http", auth="user", readonly=True)
    def import_template(self, target=None, mode="normal", **kwargs):
        """Stream a model-specific Excel template for the selected import target."""
        if not target:
            return request.make_response(
                "Missing target parameter",
                headers=[("Content-Type", "text/plain")],
                status=400,
            )
        try:
            content, spec = request.env["dashboard.import"].build_template_xlsx(target, mode)
        except Exception as err:
            return request.make_response(
                str(err),
                headers=[("Content-Type", "text/plain")],
                status=400,
            )
        prefix = "advanced_import" if mode == "advanced" else "import"
        filename = "%s_%s.xlsx" % (prefix, target)
        return request.make_response(
            content,
            headers=[
                ("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
                ("Content-Disposition", "attachment; filename=%s" % filename),
            ],
        )

    @http.route("/dashboard_app/import/upload", type="http", auth="user", methods=["POST"], csrf=True)
    def import_upload(self, **kwargs):
        """Parse uploaded file and import rows into the selected target model."""
        target = kwargs.get("target")
        if not target:
            return request.make_response(
                json.dumps({"error": "لم يتم تحديد نوع البيانات."}),
                headers=[("Content-Type", "application/json")],
            )

        files = request.httprequest.files.getlist("ufile")
        if not files:
            return request.make_response(
                json.dumps({"error": "لم يتم اختيار أي ملف."}),
                headers=[("Content-Type", "application/json")],
            )

        results = []
        try:
            for f in files:
                content = f.read()
                result = request.env["dashboard.import"].process_upload(target, content, f.filename)
                results.append(result)
        except Exception as err:
            return request.make_response(
                json.dumps({"error": str(err)}),
                headers=[("Content-Type", "application/json")],
            )

        if len(results) == 1:
            payload = results[0]
        else:
            payload = {
                "created": sum(r.get("created", 0) for r in results),
                "updated": sum(r.get("updated", 0) for r in results),
                "error_count": sum(r.get("error_count", 0) for r in results),
                "errors": [e for r in results for e in (r.get("errors") or [])],
                "files": len(results),
            }

        return request.make_response(
            json.dumps(payload),
            headers=[("Content-Type", "application/json")],
        )


class DashboardExportController(http.Controller):

    @http.route("/dashboard_app/export/download", type="http", auth="user", readonly=True)
    def export_download(self, target=None, export_format=None, filter=None, **kwargs):
        """Stream a PDF or Excel export of the selected target, date-filtered."""
        if not target:
            return request.make_response(
                "Missing target parameter",
                headers=[("Content-Type", "text/plain; charset=utf-8")],
                status=400,
            )
        if export_format not in ("xlsx", "pdf"):
            return request.make_response(
                "Invalid format parameter",
                headers=[("Content-Type", "text/plain; charset=utf-8")],
                status=400,
            )
        try:
            dashboard_filter = json.loads(filter) if filter else None
        except ValueError:
            dashboard_filter = None

        try:
            if export_format == "xlsx":
                content = request.env["dashboard.export"].build_export_xlsx(target, dashboard_filter)
                content_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            else:
                content = request.env["dashboard.export"].build_export_pdf(target, dashboard_filter)
                content_type = "application/pdf"
        except Exception:
            # Don't leak internal details (e.g. QWeb template ids) to the
            # browser — log the real exception server-side instead.
            _logger.exception("Dashboard export failed for target=%s format=%s", target, export_format)
            return request.make_response(
                "تعذّر إنشاء ملف التصدير. يرجى المحاولة لاحقًا أو التواصل مع الدعم الفني.",
                headers=[("Content-Type", "text/plain; charset=utf-8")],
                status=400,
            )

        filename = "export_%s_%s.%s" % (target, date.today().strftime("%Y%m%d"), export_format)
        return request.make_response(
            content,
            headers=[
                ("Content-Type", content_type),
                ("Content-Disposition", "attachment; filename=%s" % filename),
            ],
        )
