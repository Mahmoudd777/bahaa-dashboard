from odoo import models, fields, api

class AlbhaObjective(models.Model):
    _name = 'albaha.objective'
    _description = 'A strategic objective belonging to a pillar'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Objective Code')
    pillar_id = fields.Many2one(
        'albaha.pillar', 
        string='Pillar', 
        ondelete='cascade', 
        required=True
    )
    description = fields.Text(string='Description')
    target_value = fields.Float(string='Target Value')
    unit = fields.Char(string='Unit')
    baseline_value = fields.Float(string='Baseline Value')
    target_year = fields.Integer(string='Target Year')
    weight_pct = fields.Float(string='Weight %')
    sponsor = fields.Char(string='Sponsor')
    owner_id = fields.Many2one(
        'res.partner', 
        string='Owner', 
        ondelete='set null'
    )
    status = fields.Selection([
        ('active', 'Active'),
        ('onhold', 'On Hold'),
        ('closed', 'Closed')
    ], string='Status', default='active')

