from odoo import models, fields, api

class AlbahaReview(models.Model):
    _name = 'albaha.review'
    _description = 'A periodic review of a strategy entity'
    _order = 'review_date desc, id'

    name = fields.Char(string="Reference")
    period = fields.Char(string="Period", required=True)
    entity_type = fields.Selection([
        ('pillar', 'Pillar'),
        ('program', 'Program'),
        ('initiative', 'Initiative'),
        ('kpi', 'KPI')],
        string='Entity Type', default='initiative')
    entity_ref = fields.Char(string="Entity Reference")
    reviewer_id = fields.Many2one('res.partner', string="Reviewer", ondelete='set null')
    review_date = fields.Date(string="Review Date", default=fields.Date.context_today)
    overall_rating = fields.Selection([
        ('green', 'Green'),
        ('amber', 'Amber'),
        ('red', 'Red')],
        string='Overall Rating', default='amber')
    findings = fields.Text(string="Findings")
    recommendations = fields.Text(string="Recommendations")
    approved = fields.Boolean(string="Approved", default=False)
