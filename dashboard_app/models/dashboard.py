from odoo import api, fields, models
from odoo.exceptions import AccessError, MissingError, UserError

# Status / semantic colors shared by every theme (from the Figma design system).
# Brand colors (primary/accent/pattern) come from the dashboard.theme record.
STATUS_COLORS = {
    "success": "#00AB9D",
    "success_alt": "#11B14B",
    "warning": "#F0974F",
    "danger": "#FF5147",
    "delayed": "#FC0000",
    "text_primary": "#181D27",
    "text_secondary": "#414651",
    "text_tertiary": "#535862",
    "text_disabled": "#717680",
    "bg_tertiary": "#F5F5F5",
    "border": "#D5D7DA",
}

DEFAULT_BRAND = {
    "primary": "#5C4B43",
    "primary_dark": "#473932",
    "accent": "#00AB9D",
    "pattern": "brown",
}


def _darken(hex_color, factor=0.82):
    try:
        h = (hex_color or "").lstrip("#")
        r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
        return "#%02x%02x%02x" % (int(r * factor), int(g * factor), int(b * factor))
    except Exception:
        return hex_color or "#473932"


class DashboardDashboard(models.Model):
    _name = "dashboard.dashboard"
    _description = "Dashboard"
    _order = "sequence, id"

    name = fields.Char(required=True, translate=True)
    theme_id = fields.Many2one(
        "dashboard.theme", string="Theme", default=lambda self: self._default_theme()
    )
    is_default = fields.Boolean(
        string="Default dashboard",
        help="Used when a user has no specific dashboard assigned.",
    )
    is_template = fields.Boolean(
        string="Template",
        help="A shared template dashboard. Users get a personal copy of a "
        "template the first time their dashboard is edited.",
    )
    owner_user_id = fields.Many2one(
        "res.users", string="Owner", ondelete="cascade", index=True,
        help="If set, this is a personal per-user dashboard (a copy of a "
        "template). Edits affect only this user.",
    )
    sequence = fields.Integer(default=10)
    section_ids = fields.One2many("dashboard.section", "dashboard_id", string="Sections")
    active = fields.Boolean(default=True)

    @api.model
    def _personal_dashboard_for(self, user):
        """Return the user's OWN dashboard, cloning it from a template the first
        time. Each user edits an independent copy — changes never leak to
        others. Idempotent: returns the existing personal copy on later calls."""
        user = user.sudo()
        existing = self.sudo().search([("owner_user_id", "=", user.id)], limit=1)
        if existing:
            return existing
        # Source template: the user's currently-assigned dashboard, else default.
        template = user.dashboard_id or self.sudo().search(
            [("is_default", "=", True)], limit=1
        ) or self.sudo().search([("owner_user_id", "=", False)], limit=1)
        if not template:
            return self.browse()
        clone = self.sudo().create({
            "name": "%s — %s" % (template.name, user.name),
            "theme_id": template.theme_id.id,
            "owner_user_id": user.id,
            "is_default": False,
            "is_template": False,
            "sequence": template.sequence,
        })
        # Deep-copy sections + components explicitly (copy() does not reliably
        # duplicate the nested one2many chain).
        Section = self.env["dashboard.section"].sudo()
        for section in template.section_ids:
            new_sec = Section.create({
                "name": section.name,
                "dashboard_id": clone.id,
                "sequence": section.sequence,
                "visible": section.visible,
            })
            for comp in section.component_ids:
                comp.sudo().copy({"section_id": new_sec.id, "name": comp.name})
        # Point the user at their own copy from now on.
        user.write({"dashboard_id": clone.id})
        return clone

    def _default_theme(self):
        return self.env.ref("dashboard_app.theme_brown", raise_if_not_found=False)

    def _selection_label(self, rec, field_name):
        field = rec._fields.get(field_name)
        if not field or not getattr(field, "selection", None):
            return rec[field_name] or ""
        return dict(field.selection).get(rec[field_name], rec[field_name] or "")

    def _detail_registry(self):
        return {
            "albaha.kpi": self._get_kpi_detail,
            "albaha.objective": self._get_objective_detail,
            "albaha.pillar": self._get_pillar_detail,
            "albaha.program": self._get_program_detail,
            "albaha.regional.indicator": self._get_regional_indicator_detail,
            "albaha.initiative": self._get_initiative_detail,
            "albaha.strategic.risk": self._get_strategic_risk_detail,
            "albaha.decision": self._get_decision_detail,
            "albaha.steerco": self._get_steerco_detail,
        }

    def _aggregate_registry(self):
        return {
            "quality_low_kpi_values": self._aggregate_low_kpi_values,
            "quality_delayed_initiatives": self._aggregate_delayed_initiatives,
            "quality_late_projects": self._aggregate_late_projects,
            "quality_no_owner_objectives": self._aggregate_no_owner_objectives,
            "init_not_started": lambda params: self._aggregate_initiatives_by_status("not_started"),
            "init_at_risk": lambda params: self._aggregate_initiatives_by_status("amber"),
            "init_delayed": lambda params: self._aggregate_initiatives_by_status("red"),
            "init_on_track": lambda params: self._aggregate_initiatives_by_status("green"),
            "path_investment_kpis": self._aggregate_investment_kpis,
            "path_kpis_below_target": self._aggregate_kpis_below_target,
            "path_objectives_attention": self._aggregate_objectives_attention,
            "path_initiatives_attention": self._aggregate_initiatives_attention,
            "completion_year": self._aggregate_completion_year,
            "budget_records": self._aggregate_budget_records,
            "strategy_objectives": self._aggregate_strategy_objectives,
        }

    @api.model
    def get_record_detail(self, model, res_id, dashboard_filter=None):
        """Read-only drill-down payload for dashboard popups.

        Keep this endpoint intentionally narrow: each supported dashboard record
        type gets a purpose-built serializer instead of exposing generic reads.
        """
        if not self.env.user.sudo().dashboard_access:
            raise AccessError("Dashboard access is required.")

        from .dashboard_filter import normalize
        self = self.with_context(dash_filter=normalize(dashboard_filter))
        registry = self._detail_registry()
        if model not in registry:
            raise UserError("Unsupported dashboard detail model.")

        rec = self.env[model].sudo().browse(int(res_id or 0)).exists()
        if not rec:
            raise MissingError("The requested dashboard record no longer exists.")
        return registry[model](rec)

    @api.model
    def get_aggregate_records(self, aggregate, dashboard_filter=None):
        """Read-only list payload for aggregate dashboard cards.

        The browser sends only an aggregate key. Models, domains and columns stay
        server-side so the dashboard cannot be used as a generic read endpoint.
        """
        if not self.env.user.sudo().dashboard_access:
            raise AccessError("Dashboard access is required.")

        from .dashboard_filter import normalize
        self = self.with_context(dash_filter=normalize(dashboard_filter))
        aggregate = aggregate or {}
        key = aggregate.get("key")
        registry = self._aggregate_registry()
        if key not in registry:
            raise UserError("Unsupported dashboard aggregate.")

        payload = registry[key](aggregate.get("params") or {})
        payload.setdefault("title", aggregate.get("title") or "السجلات")
        payload.setdefault("subtitle", "")
        payload.setdefault("columns", [])
        payload.setdefault("rows", [])
        payload["total"] = len(payload["rows"])
        return payload

    def _search_records(self, model, domain=None, order=None):
        if model not in self.env.registry.models:
            return self.env["dashboard.component"].browse()
        return self.env[model].sudo().search(domain or [], order=order)

    def _line_rows(self, records, columns, row_builder, title, limit=80):
        rows = []
        for rec in records[:limit]:
            cells = row_builder(rec)
            fallback_title = getattr(rec, "display_name", False) or getattr(rec, "name", "") or str(rec.id)
            rows.append({
                "model": rec._name,
                "res_id": rec.id,
                "title": str(cells[0] or fallback_title) if cells else fallback_title,
                "cells": ["" if value in (None, False) else str(value) for value in cells],
            })
        return {
            "title": title,
            "subtitle": "%s سجل" % len(records),
            "columns": columns,
            "rows": rows,
            "truncated": len(records) > limit,
        }

    def _aggregate_low_kpi_values(self, params):
        from . import dashboard_filter as DF
        from .dashboard_helpers import QUALITY_AR, fmt_num
        from .dashboard_providers import _flt

        records = self._search_records(
            "albaha.kpi.value",
            [("rag_status", "in", ("grey", "red"))] + DF.domain(_flt(self.env), "period", "q"),
            order="period desc, id",
        )
        return self._line_rows(records, ["المؤشر", "الفترة", "القيمة", "المستهدف", "الجودة"], lambda r: [
            r.kpi_id.name,
            r.period,
            fmt_num(r.actual_value),
            fmt_num(r.target_value or r.kpi_id.target_value),
            QUALITY_AR.get(r.rag_status, r.rag_status or ""),
        ], "نقاط بيانات بجودة منخفضة")

    def _initiative_rows(self, records, title):
        from .dashboard_helpers import QUALITY_AR
        from .dashboard_providers import _flt, initiative_at

        return self._line_rows(records, ["المبادرة", "البرنامج", "الإنجاز", "الحالة", "المالك"], lambda r: [
            r.name,
            r.program_id.name,
            "%d%%" % int(round(initiative_at(r, _flt(self.env))[0])),
            QUALITY_AR.get(initiative_at(r, _flt(self.env))[1], initiative_at(r, _flt(self.env))[1]),
            r.owner_id.name,
        ], title)

    def _aggregate_delayed_initiatives(self, params):
        from .dashboard_providers import _flt, initiative_at

        flt = _flt(self.env)
        records = self._search_records("albaha.initiative", order="id").filtered(
            lambda r: initiative_at(r, flt)[1] == "red"
        )
        return self._initiative_rows(records, "مبادرات بتأخير متوقع")

    def _aggregate_late_projects(self, params):
        from .dashboard_helpers import fmt_num

        records = self._search_records("albaha.project", [("health_status", "=", "red")], order="id")
        return self._line_rows(records, ["المشروع", "البرنامج", "الإنجاز", "المدير", "آخر تحديث"], lambda r: [
            r.name,
            r.program_id.name,
            "%d%%" % int(round(r.progress_pct or 0)),
            r.manager_id.name,
            r.last_status_update or "",
        ], "مشاريع باحصائيات متأخرة")

    def _aggregate_no_owner_objectives(self, params):
        from .dashboard_helpers import QUALITY_AR
        from .dashboard_providers import _flt, objective_at

        flt = _flt(self.env)
        records = self._search_records("albaha.objective", [("owner_id", "=", False)], order="id")
        return self._line_rows(records, ["الهدف", "الكود", "الإنجاز", "الحالة"], lambda r: [
            r.name,
            r.code,
            "%d%%" % int(round(objective_at(r, flt)[0])),
            QUALITY_AR.get(objective_at(r, flt)[1], objective_at(r, flt)[1]),
        ], "اهداف/مؤشرات بدون مالك")

    def _aggregate_initiatives_by_status(self, status):
        from .dashboard_providers import _flt, initiative_at

        flt = _flt(self.env)
        records = self._search_records("albaha.initiative", order="id").filtered(lambda r: (
            not initiative_at(r, flt)[0] if status == "not_started" else initiative_at(r, flt)[1] == status
        ))
        titles = {
            "not_started": "مبادرات لم تبدأ",
            "amber": "مبادرات في خطر",
            "red": "مبادرات متأخرة",
            "green": "مبادرات على المسار",
        }
        return self._initiative_rows(records, titles.get(status, "المبادرات"))

    def _aggregate_investment_kpis(self, params):
        from . import dashboard_filter as DF
        from .dashboard_helpers import QUALITY_AR, fmt_num
        from .dashboard_providers import _flt

        records = self._search_records(
            "albaha.sector.kpi",
            [("domain", "=", "investment")] + DF.domain(_flt(self.env), "period", "q"),
            order="period desc, id",
        )
        return self._line_rows(records, ["المؤشر", "الفترة", "القيمة", "المستهدف", "الحالة"], lambda r: [
            r.indicator,
            r.period,
            fmt_num(r.value),
            fmt_num(r.target),
            QUALITY_AR.get(r.rag_status, r.rag_status or ""),
        ], "مؤشرات الاستثمار")

    def _aggregate_kpis_below_target(self, params):
        from .dashboard_helpers import QUALITY_AR, fmt_num
        from .dashboard_providers import _flt, kpi_at

        flt = _flt(self.env)
        records = self._search_records("albaha.kpi", order="id").filtered(lambda r: kpi_at(r, flt)[3] != "green")
        return self._line_rows(records, ["المؤشر", "القيمة", "المستهدف", "التحقيق", "الحالة"], lambda r: [
            r.name,
            fmt_num(kpi_at(r, flt)[0]),
            fmt_num(kpi_at(r, flt)[1]),
            "%d%%" % int(round(kpi_at(r, flt)[2])),
            QUALITY_AR.get(kpi_at(r, flt)[3], kpi_at(r, flt)[3]),
        ], "مؤشرات دون المستهدف")

    def _aggregate_objectives_attention(self, params):
        from .dashboard_helpers import QUALITY_AR
        from .dashboard_providers import _flt, objective_at

        flt = _flt(self.env)
        records = self._search_records("albaha.objective", order="id").filtered(lambda r: objective_at(r, flt)[1] != "green")
        return self._line_rows(records, ["الهدف", "الإنجاز", "الحالة", "المالك"], lambda r: [
            r.name,
            "%d%%" % int(round(objective_at(r, flt)[0])),
            QUALITY_AR.get(objective_at(r, flt)[1], objective_at(r, flt)[1]),
            r.owner_id.name,
        ], "أهداف تحتاج متابعة")

    def _aggregate_initiatives_attention(self, params):
        from .dashboard_providers import _flt, initiative_at

        flt = _flt(self.env)
        records = self._search_records("albaha.initiative", order="id").filtered(lambda r: initiative_at(r, flt)[1] != "green")
        return self._initiative_rows(records, "مبادرات تحتاج متابعة")

    def _aggregate_completion_year(self, params):
        from .dashboard_helpers import QUALITY_AR, fmt_num

        year = str((params or {}).get("year") or "")
        records = self._search_records("albaha.kpi.value", [("period", "like", year + "%")], order="period desc, id")
        return self._line_rows(records, ["المؤشر", "الفترة", "القيمة", "المستهدف", "الجودة"], lambda r: [
            r.kpi_id.name,
            r.period,
            fmt_num(r.actual_value),
            fmt_num(r.target_value or r.kpi_id.target_value),
            QUALITY_AR.get(r.rag_status, r.rag_status or ""),
        ], "قيم المؤشرات %s" % year)

    def _aggregate_budget_records(self, params):
        from . import dashboard_filter as DF
        from .dashboard_helpers import fmt_num
        from .dashboard_providers import _flt

        records = self._search_records("albaha.budget", DF.domain(_flt(self.env), "period_year_month", "m"), order="period_year_month desc, id")
        return self._line_rows(records, ["المشروع", "الفترة", "المعتمد", "المصروف", "المتبقي"], lambda r: [
            r.project_id.name,
            r.period_year_month,
            fmt_num(r.approved_amount),
            fmt_num(r.actual_spent),
            fmt_num(r.remaining_amount),
        ], "سجلات الموازنة")

    def _aggregate_strategy_objectives(self, params):
        from .dashboard_helpers import QUALITY_AR
        from .dashboard_providers import _flt, objective_at

        flt = _flt(self.env)
        records = self._search_records("albaha.objective", order="id")
        return self._line_rows(records, ["الهدف", "الإنجاز", "الحالة", "المالك"], lambda r: [
            r.name,
            "%d%%" % int(round(objective_at(r, flt)[0])),
            QUALITY_AR.get(objective_at(r, flt)[1], objective_at(r, flt)[1]),
            r.owner_id.name,
        ], "الأهداف الاستراتيجية")

    def _get_kpi_detail(self, kpi):
        from .dashboard_helpers import QUALITY_AR, QUALITY_LEVEL, fmt_num
        from .dashboard_providers import _flt, kpi_at

        self.ensure_one() if self else None
        val, tgt, ach, lvl = kpi_at(kpi, _flt(self.env))
        values = sorted(kpi.value_ids, key=lambda v: v.period or "", reverse=True)[:6]

        return {
            "model": kpi._name,
            "res_id": kpi.id,
            "title": kpi.name,
            "subtitle": kpi.name_en or kpi.code or "",
            "badge": {
                "label": QUALITY_AR.get(lvl, ""),
                "level": QUALITY_LEVEL.get(lvl, "none"),
            },
            "summary": [
                {"label": "القيمة الحالية", "value": fmt_num(val), "unit": kpi.unit or ""},
                {"label": "المستهدف", "value": fmt_num(tgt), "unit": kpi.unit or ""},
                {"label": "نسبة التحقيق", "value": "%s%%" % int(round(ach))},
            ],
            "sections": [
                {
                    "title": "بيانات المؤشر",
                    "items": [
                        {"label": "الكود", "value": kpi.code or "—"},
                        {"label": "النوع", "value": self._selection_label(kpi, "kpi_type") or "—"},
                        {"label": "الوحدة", "value": kpi.unit or "—"},
                        {"label": "الدورية", "value": self._selection_label(kpi, "frequency") or "—"},
                        {"label": "اتجاه التحسن", "value": self._selection_label(kpi, "direction") or "—"},
                    ],
                },
                {
                    "title": "خط الأساس والمستهدف",
                    "items": [
                        {"label": "خط الأساس", "value": fmt_num(kpi.baseline_value)},
                        {"label": "سنة الأساس", "value": kpi.baseline_year or "—"},
                        {"label": "قيمة المستهدف", "value": fmt_num(kpi.target_value)},
                        {"label": "سنة المستهدف", "value": kpi.target_year or "—"},
                    ],
                },
            ],
            "description": kpi.description or "",
            "formula": kpi.formula or "",
            "table": {
                "title": "آخر القراءات",
                "columns": ["الفترة", "القيمة", "المستهدف", "الانحراف", "الحالة"],
                "rows": [
                    [
                        v.period or "—",
                        fmt_num(v.actual_value),
                        fmt_num(v.target_value),
                        ("%s%%" % v.variance_pct) if v.variance_pct else "—",
                        dict(v._fields["rag_status"].selection).get(v.rag_status, "—"),
                    ]
                    for v in values
                ],
            },
        }

    def _get_objective_detail(self, obj):
        from .dashboard_helpers import QUALITY_AR, QUALITY_LEVEL, fmt_num
        from .dashboard_providers import _flt, objective_at

        pct, rag = objective_at(obj, _flt(self.env))
        return {
            "model": obj._name,
            "res_id": obj.id,
            "title": obj.name,
            "subtitle": obj.name_en or obj.code or "",
            "badge": {
                "label": QUALITY_AR.get(rag, ""),
                "level": QUALITY_LEVEL.get(rag, "none"),
            },
            "summary": [
                {"label": "نسبة الإنجاز", "value": "%s%%" % int(round(pct))},
                {"label": "المستهدف", "value": fmt_num(obj.target_value), "unit": obj.unit or ""},
                {"label": "الوزن", "value": "%s%%" % int(round(obj.weight_pct or 0))},
            ],
            "sections": [
                {
                    "title": "بيانات الهدف",
                    "items": [
                        {"label": "الكود", "value": obj.code or "—"},
                        {"label": "الركيزة", "value": obj.pillar_id.name or "—"},
                        {"label": "المالك", "value": obj.owner_id.name or "—"},
                        {"label": "الراعي", "value": obj.sponsor or "—"},
                        {"label": "الحالة", "value": self._selection_label(obj, "status") or "—"},
                    ],
                },
            ],
            "description": obj.description or "",
        }

    def _get_pillar_detail(self, pillar):
        from .dashboard_helpers import QUALITY_AR, QUALITY_LEVEL, fmt_num
        from .dashboard_providers import _flt, pillar_at

        pct, rag = pillar_at(self.env, pillar, _flt(self.env))
        return {
            "model": pillar._name,
            "res_id": pillar.id,
            "title": pillar.name,
            "subtitle": pillar.name_en or pillar.code or "",
            "badge": {
                "label": QUALITY_AR.get(rag, ""),
                "level": QUALITY_LEVEL.get(rag, "none"),
            },
            "summary": [
                {"label": "نسبة الإنجاز", "value": "%s%%" % int(round(pct))},
                {"label": "عدد الأهداف", "value": str(len(pillar.objective_ids))},
                {"label": "عدد البرامج", "value": str(len(pillar.program_ids))},
            ],
            "sections": [
                {
                    "title": "بيانات الركيزة",
                    "items": [
                        {"label": "الكود", "value": pillar.code or "—"},
                        {"label": "المكتب المالك", "value": pillar.owner_office or "—"},
                        {"label": "الحالة", "value": self._selection_label(pillar, "status") or "—"},
                        {"label": "رابط رؤية 2030", "value": pillar.vision_2030_link or "—"},
                    ],
                },
            ],
            "description": pillar.description or "",
        }

    def _get_program_detail(self, prog):
        from .dashboard_helpers import QUALITY_AR, QUALITY_LEVEL, fmt_num
        from .dashboard_providers import _flt, program_at

        pct, rag = program_at(self.env, prog, _flt(self.env))
        return {
            "model": prog._name,
            "res_id": prog.id,
            "title": prog.name,
            "subtitle": prog.name_en or prog.code or "",
            "badge": {
                "label": QUALITY_AR.get(rag, ""),
                "level": QUALITY_LEVEL.get(rag, "none"),
            },
            "summary": [
                {"label": "نسبة الإنجاز", "value": "%s%%" % int(round(pct))},
                {"label": "الموازنة", "value": fmt_num(prog.total_budget_sar_m), "unit": "M"},
                {"label": "عدد المبادرات", "value": str(prog.initiatives_count or 0)},
            ],
            "sections": [
                {
                    "title": "بيانات البرنامج",
                    "items": [
                        {"label": "الكود", "value": prog.code or "—"},
                        {"label": "الركيزة", "value": prog.pillar_id.name or "—"},
                        {"label": "المالك", "value": prog.lead_owner_id.name or "—"},
                        {"label": "البداية", "value": str(prog.start_date or "—")},
                        {"label": "النهاية", "value": str(prog.end_date or "—")},
                        {"label": "الحالة", "value": self._selection_label(prog, "status") or "—"},
                    ],
                },
            ],
            "description": prog.description or "",
        }

    def _get_regional_indicator_detail(self, indicator):
        from .dashboard_helpers import fmt_num

        pct = int(round((indicator.value / indicator.target * 100) if indicator.target else 0))
        return {
            "model": indicator._name,
            "res_id": indicator.id,
            "title": indicator.name,
            "subtitle": indicator.name_en or indicator.code or "",
            "badge": {
                "label": "%s%%" % pct,
                "level": "low" if pct >= 80 else ("mid" if pct >= 50 else "high"),
            },
            "summary": [
                {"label": "القيمة الحالية", "value": fmt_num(indicator.value), "unit": indicator.unit or ""},
                {"label": "خط الأساس", "value": fmt_num(indicator.baseline), "unit": indicator.unit or ""},
                {"label": "المستهدف", "value": fmt_num(indicator.target), "unit": indicator.unit or ""},
            ],
            "sections": [
                {
                    "title": "بيانات المؤشر",
                    "items": [
                        {"label": "الكود", "value": indicator.code or "—"},
                        {"label": "الفئة", "value": indicator.category or "—"},
                        {"label": "المصدر", "value": indicator.source or "—"},
                        {"label": "الاتجاه", "value": self._selection_label(indicator, "trend") or "—"},
                        {"label": "آخر تحديث", "value": str(indicator.last_updated or "—")},
                    ],
                },
            ],
        }

    def _get_initiative_detail(self, init):
        from .dashboard_helpers import QUALITY_AR, QUALITY_LEVEL, fmt_num
        from .dashboard_providers import _flt, initiative_at

        pct, rag = initiative_at(init, _flt(self.env))
        progress = sorted(init.progress_ids, key=lambda p: p.period or "", reverse=True)[:6]
        return {
            "model": init._name,
            "res_id": init.id,
            "title": init.name,
            "subtitle": init.name_en or init.code or "",
            "badge": {
                "label": QUALITY_AR.get(rag, ""),
                "level": QUALITY_LEVEL.get(rag, "none"),
            },
            "summary": [
                {"label": "نسبة الإنجاز", "value": "%s%%" % int(round(pct))},
                {"label": "الموازنة المنصرفة", "value": fmt_num(init.budget_consumed_sar_m), "unit": "M"},
                {"label": "إجمالي الموازنة", "value": fmt_num(init.budget_total_sar_m), "unit": "M"},
            ],
            "sections": [
                {
                    "title": "بيانات المبادرة",
                    "items": [
                        {"label": "الكود", "value": init.code or "—"},
                        {"label": "البرنامج", "value": init.program_id.name or "—"},
                        {"label": "الركيزة", "value": init.pillar_id.name or "—"},
                        {"label": "المالك", "value": init.owner_id.name or "—"},
                        {"label": "القطاع", "value": init.sector or "—"},
                        {"label": "الحالة", "value": self._selection_label(init, "status") or "—"},
                    ],
                },
                {
                    "title": "الجدول الزمني",
                    "items": [
                        {"label": "البداية", "value": str(init.start_date or "—")},
                        {"label": "النهاية", "value": str(init.end_date or "—")},
                    ],
                },
            ],
            "description": init.description or "",
            "table": {
                "title": "آخر تقارير التقدم",
                "columns": ["الفترة", "التقدم", "الحالة", "الرواية"],
                "rows": [
                    [
                        p.period or "—",
                        "%s%%" % int(round(p.progress_pct or 0)),
                        dict(p._fields["rag_status"].selection).get(p.rag_status, "—"),
                        (p.narrative or "—")[:80],
                    ]
                    for p in progress
                ],
            },
        }

    def _get_strategic_risk_detail(self, risk):
        lvl = risk.rag_status or "grey"
        badge_map = {"red": ("عالية الخطورة", "high"), "amber": ("متوسطة الخطورة", "mid"),
                     "green": ("منخفضة الخطورة", "low"), "grey": ("", "none")}
        badge_label, badge_level = badge_map.get(lvl, ("", "none"))
        return {
            "model": risk._name,
            "res_id": risk.id,
            "title": risk.name,
            "subtitle": risk.code or "",
            "badge": {"label": badge_label, "level": badge_level},
            "summary": [
                {"label": "الاحتمال", "value": str(risk.likelihood or "—")},
                {"label": "الأثر", "value": str(risk.impact or "—")},
                {"label": "درجة الخطر", "value": str(risk.risk_score or "—")},
            ],
            "sections": [
                {
                    "title": "بيانات الخطر",
                    "items": [
                        {"label": "الفئة", "value": self._selection_label(risk, "risk_category") or "—"},
                        {"label": "المبادرة", "value": risk.initiative_id.name or "—"},
                        {"label": "المالك", "value": risk.owner_id.name or "—"},
                        {"label": "تاريخ التعريف", "value": str(risk.identified_date or "—")},
                        {"label": "تاريخ المراجعة", "value": str(risk.review_date or "—")},
                        {"label": "الحالة", "value": self._selection_label(risk, "status") or "—"},
                    ],
                },
            ],
            "description": risk.mitigation_action or "",
        }

    def _get_decision_detail(self, decision):
        lvl_map = {"critical": "high", "high": "high", "medium": "mid", "low": "low"}
        return {
            "model": decision._name,
            "res_id": decision.id,
            "title": decision.name,
            "subtitle": decision.code or "",
            "badge": {
                "label": self._selection_label(decision, "priority") or "",
                "level": lvl_map.get(decision.priority, "mid"),
            },
            "summary": [
                {"label": "تاريخ القرار", "value": str(decision.decision_date or "—")},
                {"label": "تاريخ الاستحقاق", "value": str(decision.due_date or "—")},
                {"label": "الحالة", "value": self._selection_label(decision, "status") or "—"},
            ],
            "sections": [
                {
                    "title": "بيانات القرار",
                    "items": [
                        {"label": "اللجنة", "value": decision.committee_id.name or "—"},
                        {"label": "المسؤول", "value": decision.responsible_id.name or "—"},
                        {"label": "نطاق الأثر", "value": decision.impact_scope or "—"},
                    ],
                },
            ],
            "description": decision.description or "",
        }

    def _get_steerco_detail(self, steerco):
        return {
            "model": steerco._name,
            "res_id": steerco.id,
            "title": steerco.name,
            "subtitle": steerco.committee_name or "",
            "badge": {
                "label": self._selection_label(steerco, "execution_status") or "",
                "level": "mid",
            },
            "summary": [
                {"label": "تاريخ الاجتماع", "value": str(steerco.meeting_date or "—")},
                {"label": "تاريخ الاستحقاق", "value": str(steerco.due_date or "—")},
                {"label": "نوع القرار", "value": self._selection_label(steerco, "decision_type") or "—"},
            ],
            "sections": [
                {
                    "title": "بيانات القرار",
                    "items": [
                        {"label": "اللجنة", "value": steerco.committee_name or "—"},
                        {"label": "المسؤول", "value": steerco.accountable_id.name or "—"},
                        {"label": "مرجع CR", "value": steerco.linked_cr_ref or "—"},
                        {"label": "حالة التنفيذ", "value": self._selection_label(steerco, "execution_status") or "—"},
                    ],
                },
            ],
        }

    @api.model
    def _palette(self, theme=None, custom=None):
        """Full color palette = shared status colors + brand colors (from a
        dashboard.theme record, explicit custom dict, or the brown default)."""
        palette = dict(STATUS_COLORS)
        if custom:
            palette.update(custom)
        elif theme:
            palette.update(theme._palette())
        else:
            palette.update(DEFAULT_BRAND)
        return palette

    @api.model
    def get_layout(self, dashboard_id=None, dashboard_filter=None, target_user_id=None):
        """Single entry point the OWL client calls. Resolves the current user's
        dashboard, theme, visibility and welcome text, and returns the palette +
        an ordered tree of visible sections (tabs) -> visible components.

        ``dashboard_filter`` ({mode,date,quarter}) is normalized and put in the
        context so every provider computes for the selected period/date/quarter.

        ``target_user_id`` (admins only): load ANOTHER user's own dashboard —
        the admin sees exactly what that user sees and can edit it. The target's
        personal dashboard is created (a copy of a template) on first access."""
        from .dashboard_filter import normalize
        self = self.with_context(dash_filter=normalize(dashboard_filter))
        acting_user = self.env.user.sudo()

        # Editing another user's dashboard (from the user form's "open" button).
        target = None
        if target_user_id and self._user_can_edit_layout(acting_user):
            target = self.env["res.users"].sudo().browse(int(target_user_id)).exists()
        # The user whose dashboard/theme/visibility we render.
        user = target or acting_user

        if not user.dashboard_access and not target:
            return {
                "access": False,
                "theme": "",
                "sections": [],
                "colors": self._palette(),
                "can_edit": False,
            }

        if target:
            # Give the target their own copy (clone from template on first edit)
            # so admin edits never touch other users.
            dashboard = self._personal_dashboard_for(target)
        else:
            dashboard = self.browse(dashboard_id) if dashboard_id else user.dashboard_id
        if not dashboard:
            dashboard = self.search([("is_default", "=", True)], limit=1) or self.search([], limit=1)
        if not dashboard:
            return {
                "access": True,
                "sections": [],
                "colors": self._palette(),
                "can_edit": self._user_can_edit_layout(acting_user),
            }

        # Theme: per-user custom colors > per-user theme > dashboard theme.
        if user.dashboard_custom_theme and (user.dashboard_color_primary or user.dashboard_color_accent):
            primary = user.dashboard_color_primary or DEFAULT_BRAND["primary"]
            colors = self._palette(custom={
                "primary": primary,
                "primary_dark": _darken(primary),
                "accent": user.dashboard_color_accent or DEFAULT_BRAND["accent"],
                "pattern": "none",
            })
            theme_name = "custom"
        else:
            theme = user.dashboard_theme_id or dashboard.theme_id
            colors = self._palette(theme=theme)
            theme_name = (theme.name if theme else "Brown")

        # A personal dashboard IS the user's own copy — its visible fields are
        # authoritative, so the per-user hidden overlay (built for shared
        # templates) does not apply.
        if dashboard.owner_user_id:
            hidden_sections = set()
            hidden_components = set()
        else:
            hidden_sections = set(user.dashboard_hidden_section_ids.ids)
            hidden_components = set(user.dashboard_hidden_component_ids.ids)
        welcome = user.dashboard_welcome_text

        sections = []
        removed_sections = []
        for section in dashboard.section_ids:
            # A globally-hidden (removed) tab: offer it back in the edit "+ add",
            # with its content so it can be shown immediately on re-add.
            if not section.visible:
                sec_comps = [
                    c._serialize()
                    for c in section.component_ids.filtered("visible")
                    if c.component_type != "banner"
                ]
                removed_sections.append({
                    "id": section.id,
                    "name": section.name,
                    "components": sec_comps,
                    "units": self._build_units(sec_comps),
                })
                continue
            if section.id in hidden_sections:
                continue
            components = []
            removed_comps = []
            for comp in section.component_ids:
                if comp.component_type == "banner":
                    if comp.visible and comp.id not in hidden_components:
                        data = comp._serialize()
                        if welcome:
                            data["data"]["greeting"] = welcome
                        components.append(data)
                    continue
                if comp.visible and comp.id not in hidden_components:
                    components.append(comp._serialize())
                elif not comp.visible:
                    # Globally removed card — kept for the edit "+ add" panel.
                    removed_comps.append(comp._serialize())
            sections.append({
                "id": section.id,
                "name": section.name,
                "components": components,
                "units": self._build_units(components),
                # Units for the removed cards so the editor can re-add + render
                # them in place without a reload.
                "removed_units": self._build_units(removed_comps),
            })

        return {
            "access": True,
            "dashboard_id": dashboard.id,
            "name": dashboard.name,
            "theme": theme_name,
            "colors": colors,
            "sections": sections,
            "removed_sections": removed_sections,
            # The ACTING user's edit permission — an admin can edit a target
            # user's dashboard even though the target may not be an editor.
            "can_edit": self._user_can_edit_layout(acting_user),
            # Which user's dashboard is being edited (None = your own).
            "edit_user_id": target.id if target else False,
            "edit_user_name": target.name if target else "",
            # Concurrency token for save_layout_edits: a save started from an
            # older token is rejected instead of silently overwriting another
            # editor's layout.
            "layout_version": fields.Datetime.to_string(self._layout_version_dt(dashboard)) or "",
        }

    @api.model
    def _user_can_edit_layout(self, user=None):
        """Internal users with explicit dashboard edit permission."""
        user = user or self.env.user
        return bool(
            user.dashboard_access
            and user.dashboard_edit_access
            and not user.share
            and user.has_group("base.group_user")
        )

    @api.model
    def _layout_version_dt(self, dashboard):
        """Most recent layout write across the dashboard's components."""
        dates = [d for d in dashboard.section_ids.mapped("component_ids.write_date") if d]
        if dashboard.write_date:
            dates.append(dashboard.write_date)
        return max(dates) if dates else False

    @api.model
    def save_layout_edits(self, dashboard_id, sections, layout_version=None, visibility=None, target_user_id=None):
        """Persist component order and grid layout from dashboard edit mode.

        ``sections`` is a list of ``{"section_id": id, "items": [...]}``
        written in ONE call/transaction, so a failure saves nothing (no
        half-saved layout). Each item is a dict per component:
        {id, sequence, col_span, row_span, grid_x, grid_y}. Grouped panel
        outer layout is stored separately as group_* fields so child layout is
        not corrupted when the panel is resized as one unit.

        ``layout_version`` is the token issued by ``get_layout``; when another
        session saved this dashboard after the token was issued, the save is
        rejected so two editors cannot silently overwrite each other.

        ``visibility`` (optional) removes/re-adds cards and tabs:
        ``{"components": {id: bool}, "sections": {id: bool}}`` — written to the
        ``visible`` field BEFORE the layout items so a re-added card is editable.
        """
        acting_user = self.env.user.sudo()
        if not self._user_can_edit_layout(acting_user):
            raise AccessError("Dashboard layout edit permission is required.")

        if target_user_id:
            # Admin editing another user's own dashboard (its personal copy).
            target = self.env["res.users"].sudo().browse(int(target_user_id)).exists()
            if not target:
                raise UserError("Invalid target user.")
            dashboard = self._personal_dashboard_for(target)
        else:
            dashboard = self.browse(int(dashboard_id)).exists()
            if not dashboard:
                raise UserError("Invalid dashboard.")
            # Editors may only touch the dashboard they are assigned to (the same
            # one get_layout resolves for them) — not arbitrary dashboards by id.
            allowed_dashboard = (
                acting_user.dashboard_id
                or self.search([("is_default", "=", True)], limit=1)
                or self.search([], limit=1)
            )
            if dashboard != allowed_dashboard:
                raise AccessError("You can only edit the layout of your own dashboard.")

        if layout_version:
            current = self._layout_version_dt(dashboard)
            provided = fields.Datetime.from_string(layout_version)
            # The token is second-precise; compare at that granularity so a
            # save right after get_layout is not a false conflict.
            if current and provided and current.replace(microsecond=0) > provided:
                raise UserError(
                    "تم تعديل تخطيط اللوحة من جلسة أخرى أثناء التعديل — "
                    "أعد تحميل الصفحة ثم كرّر التعديلات."
                )

        Section = self.env["dashboard.section"]
        Component = self.env["dashboard.component"].sudo()

        # Apply visibility (remove / re-add) first so re-added cards are visible
        # and therefore pass the "editable" filter below.
        if visibility:
            for cid, vis in (visibility.get("components") or {}).items():
                comp = Component.browse(int(cid)).exists()
                if comp and comp.section_id.dashboard_id == dashboard and comp.component_type != "banner":
                    comp.visible = bool(vis)
            for sid, vis in (visibility.get("sections") or {}).items():
                sec = Section.sudo().browse(int(sid)).exists()
                if sec and sec.dashboard_id == dashboard:
                    sec.sudo().visible = bool(vis)
            self.env.flush_all()

        if not sections and not visibility:
            raise UserError("No layout changes to save.")

        saved = 0
        for payload in (sections or []):
            section = Section.browse(int(payload.get("section_id") or 0)).exists()
            items = payload.get("items") or []
            if not section or section.dashboard_id != dashboard:
                raise UserError("Invalid dashboard section.")
            if not items:
                continue

            allowed = {
                c.id: c
                for c in section.component_ids.filtered("visible")
                if c.component_type != "banner"
            }
            for entry in items:
                comp_id = int(entry.get("id") or 0)
                if comp_id not in allowed:
                    raise UserError("Component %s is not editable in this section." % comp_id)
                comp = allowed[comp_id]
                vals = {"sequence": int(entry.get("sequence") or 10)}
                span = int(entry.get("col_span") or comp.col_span or 3)
                if span < 1 or span > 12:
                    raise UserError("Invalid column width: %s" % span)
                vals["col_span"] = span
                row_span = int(entry.get("row_span") or comp.row_span or 1)
                if row_span < 1 or row_span > 12:
                    raise UserError("Invalid row height: %s" % row_span)
                vals["row_span"] = row_span
                column = entry.get("column")
                if column in ("full", "main", "side"):
                    vals["column"] = column
                if comp.group_key:
                    group_span = entry.get("group_col_span")
                    if group_span is not None:
                        group_span = int(group_span)
                        if group_span < 1 or group_span > 12:
                            raise UserError("Invalid group column width: %s" % group_span)
                        vals["group_col_span"] = group_span
                    group_rows = entry.get("group_row_span")
                    if group_rows is not None:
                        group_rows = int(group_rows)
                        if group_rows < 1 or group_rows > 12:
                            raise UserError("Invalid group row height: %s" % group_rows)
                        vals["group_row_span"] = group_rows
                    if "group_grid_x" in entry and entry.get("group_grid_x") is not None:
                        group_x = int(entry.get("group_grid_x"))
                        if group_x < 0 or group_x > 11:
                            raise UserError("Invalid group grid X: %s" % group_x)
                        vals["group_grid_x"] = group_x
                    if "group_grid_y" in entry and entry.get("group_grid_y") is not None:
                        group_y = int(entry.get("group_grid_y"))
                        if group_y < 0:
                            raise UserError("Invalid group grid Y: %s" % group_y)
                        vals["group_grid_y"] = group_y
                if "grid_x" in entry and entry.get("grid_x") is not None:
                    gx = int(entry.get("grid_x"))
                    if gx < 0 or gx > 11:
                        raise UserError("Invalid grid X: %s" % gx)
                    vals["grid_x"] = gx
                if "grid_y" in entry and entry.get("grid_y") is not None:
                    gy = int(entry.get("grid_y"))
                    if gy < 0:
                        raise UserError("Invalid grid Y: %s" % gy)
                    vals["grid_y"] = gy
                Component.browse(comp_id).write(vals)
                saved += 1
        return {"saved": saved}

    @api.model
    def _panel_outer_row_span(self, components):
        x = 0
        y = 0
        row_h = 1
        max_bottom = 0
        for comp in components:
            w = max(1, min(12, int(comp.get("col_span") or 12)))
            h = max(1, min(12, int(comp.get("row_span") or 1)))
            if x > 0 and x + w > 12:
                y += row_h
                x = 0
                row_h = h
            else:
                row_h = max(row_h, h)
            max_bottom = max(max_bottom, y + h)
            x += w
            if x >= 12:
                y += row_h
                x = 0
                row_h = 1
        return max(1, min(12, max_bottom + 1))

    @api.model
    def _build_units(self, components):
        """Fold a section's (already serialized) components into ordered render
        *units* for the OWL grid. A unit is either:
          - a ``panel``: components sharing a non-empty ``group_key`` rendered
            inside one titled box (spans the full 12 cols of its column), or
          - a ``comp``: a standalone component keeping its own ``col_span``.
        The banner is rendered full-bleed elsewhere, so it is skipped here.
        Order and column placement follow the components' sequence.
        """
        units = []
        panels_by_key = {}
        for comp in components:
            if comp["type"] == "banner":
                continue
            column = comp.get("column") or "full"
            key = comp.get("group_key")
            if key:
                panel = panels_by_key.get(key)
                if panel is None:
                    span = max(1, min(12, int(comp.get("group_col_span") or comp.get("col_span") or self._flow_span(column, 12))))
                    rows = max(1, min(12, int(comp.get("group_row_span") or comp.get("row_span") or 1)))
                    panel = {
                        "kind": "panel",
                        "key": "panel_%s" % key,
                        "column": column,
                        "col_span": span,
                        "row_span": rows,
                        "_has_group_row_span": comp.get("group_row_span") is not None,
                        "grid_x": comp.get("group_grid_x") if comp.get("group_grid_x") is not None else comp.get("grid_x"),
                        "grid_y": comp.get("group_grid_y") if comp.get("group_grid_y") is not None else comp.get("grid_y"),
                        "title": comp.get("group_title") or "",
                        "legend": comp.get("group_legend") or False,
                        "components": [],
                    }
                    panels_by_key[key] = panel
                    units.append(panel)
                # The panel inherits title/legend from whichever grouped
                # component carries them (typically the first).
                if not panel["title"] and comp.get("group_title"):
                    panel["title"] = comp["group_title"]
                if comp.get("group_legend"):
                    panel["legend"] = True
                panel["components"].append(comp)
                if not panel.get("_has_group_row_span"):
                    panel["row_span"] = self._panel_outer_row_span(panel["components"])
            else:
                span = max(1, min(12, int(comp.get("col_span") or self._flow_span(column, 3))))
                rows = max(1, min(12, int(comp.get("row_span") or 1)))
                units.append({
                    "kind": "comp",
                    "key": "comp_%s" % comp["id"],
                    "column": column,
                    "col_span": span,
                    "row_span": rows,
                    "grid_x": comp.get("grid_x"),
                    "grid_y": comp.get("grid_y"),
                    "comp": comp,
                })
        return units

    @api.model
    def _flow_span(self, column, base):
        """Effective 12-col span for the single flowing grid: side blocks are
        narrow, main blocks wide, full blocks keep their own span."""
        if column == "side":
            return 4
        if column == "main":
            return 8
        return base or 12
