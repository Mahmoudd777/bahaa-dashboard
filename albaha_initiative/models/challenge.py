from odoo import models, fields


class AlbahaChallenge(models.Model):
    """A challenge facing the region, and how the strategy answers it.

    Appendix 7 of the detailed document works through the region's challenges
    one dimension at a time: what the challenge is, the mechanism chosen to
    address it, which planned initiatives carry that work, and which existing
    government projects already touch it. It is the link between the diagnosis
    and the portfolio — the reason each initiative exists — and it is stated
    nowhere else.
    """

    _name = 'albaha.challenge'
    _description = 'A regional challenge and the mechanism addressing it'
    _order = 'dimension, id'

    name = fields.Char(string='Challenge', required=True)
    # One of the eight dimensions the current-state assessment is built on.
    dimension = fields.Char(string='Dimension')
    mitigation = fields.Text(string='Mitigation Mechanism')
    initiative_ids = fields.Many2many(
        'albaha.initiative', string='Planned Initiatives')
    # The source names the initiatives in prose. The raw wording is kept
    # because a name that could not be matched would otherwise be lost.
    initiatives_text = fields.Text(string='Initiatives as Written')
    # Other entities' projects, named but not held as records here.
    government_projects = fields.Text(string='Existing Government Projects')
    expected_impact = fields.Text(string='Expected Impact', help='One per line.')
