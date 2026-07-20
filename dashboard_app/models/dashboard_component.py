import json
import logging

from odoo import fields, models

_logger = logging.getLogger(__name__)

COMPONENT_TYPES = [
    ("banner", "Welcome Banner"),
    ("toolbar", "Toolbar / Filter"),
    ("gauge_card", "Gauge Card (ring)"),
    ("gauge_grid", "Gauge Grid (panel of rings)"),
    ("stat_grid", "Stat Grid (panel of stat cards)"),
    ("kpi_grid", "KPI Grid (panel of KPI cards)"),
    ("semi_grid", "Semi Grid (panel of semicircle gauges)"),
    ("gauge_semi", "Gauge (semicircle)"),
    ("kpi_gauge_card", "KPI Gauge Card"),
    ("stat_card", "Stat Card"),
    ("progress_card", "Progress Card"),
    ("budget_split_bar", "Budget Split Bar"),
    ("bar_h", "Horizontal Bar Chart"),
    ("bar_h_planned", "Horizontal Bar (planned vs actual)"),
    ("bar_v", "Vertical Bar Chart"),
    ("data_table", "Data Table"),
    ("goals_list", "Goals List"),
    ("list_cards", "List Cards (risk/actions)"),
    ("alerts_panel", "Alerts Panel"),
]


class DashboardComponent(models.Model):
    _name = "dashboard.component"
    _description = "Dashboard Component / Widget"
    _order = "sequence, id"

    name = fields.Char(required=True, translate=True)
    section_id = fields.Many2one(
        "dashboard.section", required=True, ondelete="cascade"
    )
    component_type = fields.Selection(
        selection=COMPONENT_TYPES, required=True
    )
    sequence = fields.Integer(default=10)
    col_span = fields.Integer(
        default=3,
        help="Width of the component on the 12-column dashboard grid.",
    )
    row_span = fields.Integer(
        default=11,
        help="Height of the component in dashboard grid rows (8px steps; "
             "11 steps = one legacy 88px row).",
    )
    grid_x = fields.Integer(
        help="Horizontal grid position (0-11). Empty means auto-flow.",
    )
    grid_y = fields.Integer(
        help="Vertical grid position. Empty means auto-flow.",
    )
    # --- Layout / grouping (panels + sidebar/main two-column composition) ---
    column = fields.Selection(
        selection=[("full", "Full width"), ("main", "Main column"), ("side", "Side column")],
        default="full",
        required=True,
        help="Which column this component (or its group) renders in. A section "
        "with any main/side component becomes a two-column layout; otherwise it "
        "stays a single flowing grid.",
    )
    group_key = fields.Char(
        help="Components in the same section sharing this key render together "
        "inside one titled panel (e.g. the 11 strategic-objective gauges).",
    )
    group_title = fields.Char(help="Title of the grouping panel (set on the group's first component).")
    group_legend = fields.Boolean(
        help="Show the status legend (مسار صحيح / في خطر / متأخر) on the group panel.",
    )
    group_col_span = fields.Integer(
        help="Outer width of the grouped panel. Inner component widths keep using col_span.",
    )
    group_row_span = fields.Integer(
        help="Outer height of the grouped panel when edited as a single unit.",
    )
    group_grid_x = fields.Integer(
        help="Outer horizontal grid position of the grouped panel.",
    )
    group_grid_y = fields.Integer(
        help="Outer vertical grid position of the grouped panel.",
    )
    visible = fields.Boolean(
        default=True, help="Hide this single component from the dashboard."
    )
    config = fields.Text(
        help="JSON config: labels, colors, targets, series for seed rendering.",
        default="{}",
    )

    # --- Pluggable data source (seed now, real models later) ---
    data_source = fields.Selection(
        selection=[("seed", "Seed (config JSON)"), ("model", "Odoo model")],
        default="seed",
        required=True,
    )
    model_id = fields.Many2one("ir.model", string="Source model")
    domain = fields.Char(default="[]")
    measure = fields.Char(help="Field to aggregate when data_source = model.")
    group_by = fields.Char(help="Field to group by when data_source = model.")
    source = fields.Char(
        help="Name of the data provider (see dashboard_providers.PROVIDERS) that "
        "builds this widget's data from the albaha_* models when data_source=model.",
    )

    def _parse_config(self):
        self.ensure_one()
        try:
            return json.loads(self.config or "{}")
        except (ValueError, TypeError):
            _logger.warning("dashboard.component %s has invalid config JSON", self.id)
            return {}

    def get_data(self):
        """Return the data dict the OWL widget renders — fully computed, never demo.

        ``model`` widgets run their provider (``source``), which computes the
        data from the albaha_* models; the seed ``config`` is used only for
        presentation (titles, columns, colors, layout). On any failure, or for an
        unbound widget, the data keys are emptied (``strip_values``) so a demo
        number can never appear. Only ``banner``/``toolbar`` (UI chrome) keep
        their config — greeting/role come from the user/company, not demo data.
        """
        self.ensure_one()
        from .dashboard_helpers import strip_values
        config = self._parse_config()
        if self.data_source == "model" and self.source:
            from .dashboard_providers import PROVIDERS
            # source is "provider" or "provider:arg" (arg binds one widget to one
            # record, e.g. the Nth indicator); the provider reads the arg.
            provider = PROVIDERS.get(self.source.partition(":")[0])
            if provider:
                try:
                    return provider(self, dict(config), self.env)
                except Exception:
                    _logger.exception(
                        "dashboard provider '%s' failed for component %s; empty state",
                        self.source, self.id)
            return strip_values(config)
        if self.component_type in ("banner", "toolbar"):
            return config
        return strip_values(config)

    def _serialize(self):
        self.ensure_one()
        return {
            "id": self.id,
            "type": self.component_type,
            "title": self.name,
            "col_span": self.col_span,
            "row_span": self.row_span or 11,
            "grid_x": self.grid_x,
            "grid_y": self.grid_y,
            "column": self.column,
            "group_key": self.group_key or "",
            "group_title": self.group_title or "",
            "group_legend": self.group_legend,
            "group_col_span": self.group_col_span,
            "group_row_span": self.group_row_span,
            "group_grid_x": self.group_grid_x,
            "group_grid_y": self.group_grid_y,
            "data": self.get_data(),
        }
