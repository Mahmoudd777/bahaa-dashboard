from odoo import fields, models


class DashboardTheme(models.Model):
    _name = "dashboard.theme"
    _description = "Dashboard Theme (color palette)"
    _order = "sequence, id"

    name = fields.Char(required=True, translate=True)
    sequence = fields.Integer(default=10)
    is_preset = fields.Boolean(default=True)
    active = fields.Boolean(default=True)

    # Brand colors driving the header + accents. Status colors (success/warning/
    # danger/...) are shared across themes (see STATUS_COLORS in dashboard.py).
    primary = fields.Char(string="Primary", default="#5C4B43")
    primary_dark = fields.Char(string="Primary (dark)", default="#473932")
    accent = fields.Char(string="Accent", default="#00AB9D")
    pattern = fields.Selection(
        selection=[("brown", "Brown"), ("aqua", "Aqua"), ("none", "None")],
        default="brown",
    )

    def _palette(self):
        """Brand colors of this theme, as a dict the OWL client merges with the
        shared status colors."""
        self.ensure_one()
        return {
            "primary": self.primary or "#5C4B43",
            "primary_dark": self.primary_dark or "#473932",
            "accent": self.accent or "#00AB9D",
            "pattern": self.pattern or "brown",
        }
