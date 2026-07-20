from odoo import models, fields, api

class AlbhaSector(models.Model):
    _name = 'albaha.sector'
    _description = 'An economic sector tracked by the strategy'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Sector Code')
    description = fields.Text(string='Description')
    contribution_pct_target = fields.Float(string='Contribution Target %')
    contribution_pct_current = fields.Float(string='Contribution Current %')
    primary_pillar_id = fields.Many2one(
        'albaha.pillar', 
        string='Primary Pillar', 
        ondelete='set null'
    )
    lead_owner_id = fields.Many2one(
        'res.partner', 
        string='Lead Owner', 
        ondelete='set null'
    )
    status = fields.Selection([
        ('active', 'Active'),
        ('onhold', 'On Hold'),
        ('closed', 'Closed')
    ], string='Status', default='active')

