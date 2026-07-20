from odoo import models, fields, api

class AlbhaProgram(models.Model):
    _name = 'albaha.program'
    _description = 'A strategic program grouping initiatives under a pillar'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Program Code')
    pillar_id = fields.Many2one(
        'albaha.pillar', 
        string='Pillar', 
        ondelete='cascade', 
        required=True
    )
    description = fields.Text(string='Description')
    color_hex = fields.Char(string='Color')
    total_budget_sar_m = fields.Float(string='Total Budget (SAR m)')
    initiatives_count = fields.Integer(string='Initiatives Count')
    lead_owner_id = fields.Many2one(
        'res.partner', 
        string='Lead Owner', 
        ondelete='set null'
    )
    start_date = fields.Date(string='Start Date')
    end_date = fields.Date(string='End Date')
    status = fields.Selection([
        ('active', 'Active'),
        ('onhold', 'On Hold'),
        ('closed', 'Closed')
    ], string='Status', default='active')

