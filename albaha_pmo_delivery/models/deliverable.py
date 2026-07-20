from odoo import models, fields, api

class AlbhaDeliverable(models.Model):
    _name = 'albaha.deliverable'
    _description = 'A project deliverable'

    name = fields.Char(string="Deliverable Name", required=True)
    code = fields.Char(string="Deliverable Code")
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    category = fields.Char(string="Category")
    due_date = fields.Date(string="Due Date")
    accepted_date = fields.Date(string="Accepted Date")
    acceptance_criteria = fields.Text(string="Acceptance Criteria")
    quality_score = fields.Float(string="Quality Score")
    acceptance_status = fields.Selection([
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected')
    ], string='Acceptance Status', default='pending')
    approver_id = fields.Many2one('res.partner', string="Approver", ondelete='set null')
