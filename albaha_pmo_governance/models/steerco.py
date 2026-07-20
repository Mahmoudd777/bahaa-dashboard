from odoo import models, fields, api

class AlbahaSteerco(models.Model):
    _name = 'albaha.steerco'
    _description = 'A steering committee decision'
    _order = 'meeting_date desc, id'

    name = fields.Char(string='Decision Text', required=True)
    committee_name = fields.Char(string='Committee Name')
    meeting_date = fields.Date(string='Meeting Date')
    decision_type = fields.Selection([
        ('approval', 'Approval'),
        ('directive', 'Directive'),
        ('escalation', 'Escalation'),
        ('noted', 'Noted')
    ], string='Decision Type', default='approval')
    linked_cr_ref = fields.Char(string='Linked CR Reference')
    due_date = fields.Date(string='Due Date')
    accountable_id = fields.Many2one('res.partner', string='Accountable', ondelete='set null')
    execution_status = fields.Selection([
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('done', 'Done')
    ], string='Execution Status', default='open')
