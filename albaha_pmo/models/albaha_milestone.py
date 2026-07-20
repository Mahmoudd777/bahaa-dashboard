from odoo import models, fields, api

class AlbahaMilestone(models.Model):
    _name = 'albaha.milestone'
    _description = 'A milestone of a project'
    _order = 'project_id, planned_date'

    name = fields.Char(string='Milestone Name', required=True)
    code = fields.Char(string='Milestone Code')
    project_id = fields.Many2one(
        'albaha.project', 
        string='Project', 
        ondelete='cascade', 
        required=True
    )
    milestone_type = fields.Selection([
        ('gate', 'Gate'),
        ('deliverable', 'Deliverable'),
        ('payment', 'Payment'),
        ('review', 'Review')],
        string='Type', default='deliverable')
    planned_date = fields.Date(string='Planned Date')
    actual_date = fields.Date(string='Actual Date')
    status = fields.Selection([
        ('pending', 'Pending'),
        ('reached', 'Reached'),
        ('missed', 'Missed')],
        string='Status', default='pending')
    slippage_days = fields.Integer(string='Slippage (days)')
    weight_pct = fields.Float(string='Weight %')
    deliverable_ref = fields.Char(string='Deliverable Reference')
