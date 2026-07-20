from odoo import models, fields, api

class AlbahaLesson(models.Model):
    _name = 'albaha.lesson'
    _description = 'A lesson learned captured from a project'
    _order = 'id'

    name = fields.Char(string='Situation', required=True)
    code = fields.Char(string='Lesson Code')
    project_id = fields.Many2one('albaha.project', string='Project', ondelete='cascade', required=True)
    phase_captured = fields.Selection([
        ('initiating', 'Initiating'),
        ('planning', 'Planning'),
        ('executing', 'Executing'),
        ('closing', 'Closing')
    ], string='Phase Captured', default='executing')
    category = fields.Char(string='Category')
    root_cause = fields.Text(string='Root Cause')
    recommendation = fields.Text(string='Recommendation')
    applicability = fields.Char(string='Applicability')
    adopted_as_policy = fields.Boolean(string='Adopted as Policy', default=False)
    linked_policy_id = fields.Many2one('albaha.governance', string='Linked Policy', ondelete='set null')
