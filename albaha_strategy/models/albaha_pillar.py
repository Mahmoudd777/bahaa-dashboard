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

    # The strategy names the steps it will take against each pillar’s
    # strategic risks, and names them for the pillar rather than for any one
    # risk. Kept here for that reason: splitting them between the risks would
    # assert a pairing the source never makes.
    strategic_mitigation = fields.Text(
        string='Strategic Risk Mitigation',
        help="The steps the strategy sets against this pillar's strategic "
             "risks, as the source states them — for the pillar, not per risk.")
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

