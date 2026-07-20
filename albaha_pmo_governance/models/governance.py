from odoo import models, fields, api

class AlbahaGovernance(models.Model):
    _name = 'albaha.governance'
    _description = 'A PMO governance policy or reference document'
    _order = 'id'

    name = fields.Char(string='Policy Name', required=True)
    code = fields.Char(string='Policy Code')
    policy_type = fields.Selection([
        ('charter', 'Charter'),
        ('process', 'Process'),
        ('standard', 'Standard'),
        ('template', 'Template')
    ], string='Policy Type', default='process')
    version = fields.Char(string='Version')
    effective_date = fields.Date(string='Effective Date')
    document_url = fields.Char(string='Document URL')
    approver_id = fields.Many2one('res.partner', string='Approver', ondelete='set null')
