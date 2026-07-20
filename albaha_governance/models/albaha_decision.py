from odoo import models, fields, api

class AlbahaDecision(models.Model):
    _name = 'albaha.decision'
    _description = 'A decision taken by a committee'
    _order = 'decision_date desc, id'

    name = fields.Char(string="Title", required=True)
    code = fields.Char(string="Decision Code")
    committee_id = fields.Many2one('albaha.committee', string="Committee", ondelete='set null')
    decision_date = fields.Date(string="Decision Date", default=fields.Date.context_today)
    description = fields.Text(string="Description")
    impact_scope = fields.Char(string="Impact Scope")
    priority = fields.Selection([
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low')],
        string='Priority', default='medium')
    responsible_id = fields.Many2one('res.partner', string="Responsible", ondelete='set null')
    due_date = fields.Date(string="Due Date")
    status = fields.Selection([
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('done', 'Done')],
        string='Status', default='open')
