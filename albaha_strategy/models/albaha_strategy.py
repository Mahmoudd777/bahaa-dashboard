from odoo import api, fields, models


class AlbahaStrategy(models.Model):
    """The strategy itself.

    Everything else in this system hangs beneath the strategy — pillars,
    objectives, programmes, initiatives — but nothing recorded what the
    strategy is: its vision, its mission, who owns it, or the years it runs.
    All four are stated plainly, the vision and mission on the strategic house
    and the rest on the registration held by the National Performance Center.
    """

    _name = 'albaha.strategy'
    _description = 'The regional strategy and what it sets out to do'
    _order = 'id'

    name = fields.Char(string='Name', required=True)
    owner_entity = fields.Char(
        string='Owning Entity',
        help='The body that owns the strategy, as its registration names it.')
    vision = fields.Text(string='Vision')
    mission = fields.Text(string='Mission')
    # The deck states both in English beside the Arabic, on the page where
    # the three candidate wordings were compared and one was chosen.
    vision_en = fields.Text(string='Vision (English)')
    mission_en = fields.Text(string='Mission (English)')
    start_year = fields.Integer(string='Start Year')
    end_year = fields.Integer(string='End Year')
    budget_sar_m = fields.Float(string='Budget (SAR m)')
    source_reference = fields.Char(string='Source')

    pillar_ids = fields.One2many('albaha.pillar', 'strategy_id', string='Pillars')
    pillars_count = fields.Integer(
        string='Pillars', compute='_compute_counts', store=True)
    objectives_count = fields.Integer(
        string='Objectives', compute='_compute_counts', store=True)

    @api.depends('pillar_ids', 'pillar_ids.objective_ids')
    def _compute_counts(self):
        Objective = self.env['albaha.objective']
        for record in self:
            record.pillars_count = len(record.pillar_ids)
            record.objectives_count = Objective.search_count([])
