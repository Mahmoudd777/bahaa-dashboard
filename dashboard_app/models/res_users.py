from odoo import api, fields, models


class ResUsers(models.Model):
    _inherit = "res.users"

    @api.model
    def _grant_dashboard_edit_access(self):
        """Data hook: ensure admin can use dashboard layout edit mode."""
        admin = self.env.ref("base.user_admin", raise_if_not_found=False)
        if admin and not admin.dashboard_edit_access:
            admin.sudo().write({"dashboard_edit_access": True})

    def action_open_user_dashboard(self):
        """Open THIS user's dashboard (as they see it) for an admin to edit.
        Opens the /dashboard page targeting this user; the admin can preview
        and use edit mode on the user's own (personal) dashboard copy."""
        self.ensure_one()
        return {
            "type": "ir.actions.act_url",
            "url": "/dashboard?edit_user=%s" % self.id,
            "target": "new",
        }

    # --- Per-user dashboard configuration (managed by admins on the user form) ---
    dashboard_access = fields.Boolean(
        string="Dashboard access",
        default=True,
        help="If unchecked, the user cannot open the dashboard.",
    )
    dashboard_edit_access = fields.Boolean(
        string="Dashboard layout edit",
        default=False,
        help="If checked, the user can rearrange and resize dashboard components "
        "from the dashboard edit mode (internal users only).",
    )
    dashboard_id = fields.Many2one(
        "dashboard.dashboard", string="Dashboard",
        help="Which dashboard layout this user sees. Falls back to the default dashboard.",
    )
    dashboard_theme_id = fields.Many2one("dashboard.theme", string="Theme")
    dashboard_custom_theme = fields.Boolean(string="Use custom colors")
    dashboard_color_primary = fields.Char(string="Primary color", default="#5C4B43")
    dashboard_color_accent = fields.Char(string="Accent color", default="#00AB9D")
    dashboard_welcome_text = fields.Char(
        string="Welcome text",
        help="Greeting shown in the dashboard header banner for this user.",
    )
    dashboard_hidden_section_ids = fields.Many2many(
        "dashboard.section",
        "dashboard_user_hidden_section_rel", "user_id", "section_id",
        string="Hidden tabs",
    )
    dashboard_hidden_component_ids = fields.Many2many(
        "dashboard.component",
        "dashboard_user_hidden_component_rel", "user_id", "component_id",
        string="Hidden components",
    )
