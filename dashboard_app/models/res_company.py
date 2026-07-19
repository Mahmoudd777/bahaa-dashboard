from odoo import fields, models


class ResCompany(models.Model):
    _inherit = "res.company"

    # Separate logo for the public/login/dashboard surfaces (typically a white
    # wordmark for dark backgrounds). The standard `logo` field stays as-is for
    # the back-office and PDF reports. Binary (not Image) so SVGs are stored
    # verbatim — Image processing rasterises SVG to a flat bitmap.
    website_logo = fields.Binary(
        string="Website Logo",
        attachment=True,
        help="Logo shown on the login page and the dashboard (dark backgrounds). "
        "The standard Logo field above is used for the back-office and PDF reports.",
    )
