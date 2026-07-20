from odoo import models, fields, api

class AlbhaPillar(models.Model):
    _name = 'albaha.pillar'
    _description = 'A strategic pillar of the Al-Baha regional strategy'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Pillar Code')
    description = fields.Text(string='Description')
    sequence = fields.Integer(string='Sequence', default=10)
    color_hex = fields.Char(string='Color')
    vision_2030_link = fields.Char(string='Vision 2030 Link')
    owner_office = fields.Char(string='Owner Office')
    status = fields.Selection([
        ('active', 'Active'),
        ('onhold', 'On Hold'),
        ('closed', 'Closed')
    ], string='Status', default='active')

    objective_ids = fields.One2many(
        'albaha.objective', 
        'pillar_id', 
        string='Objectives'
    )
    program_ids = fields.One2many(
        'albaha.program', 
        'pillar_id', 
        string='Programs'
    )

    @api.depends('sequence')
    def _compute_sequence(self):
        # Simple sequence handling if needed, though default=10 is set above
        pass

