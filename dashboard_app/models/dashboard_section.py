from odoo import fields, models


class DashboardSection(models.Model):
    _name = "dashboard.section"
    _description = "Dashboard Section / Tab"
    _order = "sequence, id"

    name = fields.Char(required=True, translate=True)
    dashboard_id = fields.Many2one(
        "dashboard.dashboard", required=True, ondelete="cascade"
    )
    sequence = fields.Integer(default=10)
    visible = fields.Boolean(
        default=True, help="Hide the whole section/tab from the dashboard."
    )
    component_ids = fields.One2many(
        "dashboard.component", "section_id", string="Components"
    )
