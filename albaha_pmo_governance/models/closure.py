from odoo import models, fields, api

class AlbahaClosure(models.Model):
    _name = 'albaha.closure'
    _description = 'A project closure record'
    _order = 'official_closure_date desc, id'

    name = fields.Char(string='Reference')
    project_id = fields.Many2one('albaha.project', string='Project', ondelete='cascade', required=True)
    official_closure_date = fields.Date(string='Official Closure Date')
    final_progress_pct = fields.Float(string='Final Progress %')
    final_cost = fields.Float(string='Final Cost (SAR m)')
    budget_variance_pct = fields.Float(string='Budget Variance %')
    schedule_variance_days = fields.Integer(string='Schedule Variance (days)')
    benefits_realization_pct = fields.Float(string='Benefits Realization %')
    closure_type = fields.Selection([
        ('normal', 'Normal'),
        ('early', 'Early'),
        ('cancelled', 'Cancelled')
    ], string='Closure Type', default='normal')
    sponsor_signoff = fields.Boolean(string='Sponsor Sign-off', default=False)
    archive_ref = fields.Char(string='Archive Reference')
