from odoo import models, fields, api

class AlbahaBudget(models.Model):
    _name = 'albaha.budget'
    _description = 'A monthly budget snapshot for a project'

    name = fields.Char(string="Reference", required=True)
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    period_year_month = fields.Char(string="Period (YYYY-MM)", required=True)
    budget_category = fields.Char(string="Budget Category")
    approved_amount = fields.Float(string="Approved Amount (SAR m)")
    committed_amount = fields.Float(string="Committed Amount (SAR m)")
    actual_spent = fields.Float(string="Actual Spent (SAR m)")
    remaining_amount = fields.Float(string="Remaining Amount (SAR m)")
    variance_pct = fields.Float(string="Variance %")
    forecast_eac = fields.Float(string="Forecast EAC (SAR m)")

    @api.depends('approved_amount', 'committed_amount', 'actual_spent')
    def _compute_remaining_amount(self):
        for record in self:
            record.remaining_amount = record.approved_amount - record.committed_amount - record.actual_spent

class AlbahaBudget(models.Model):
    _inherit = 'albaha.budget' # Using inherit to ensure computed fields are handled correctly if needed, though direct definition is fine here.
    pass
