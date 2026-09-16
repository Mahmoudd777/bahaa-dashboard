from odoo import api, fields, models


class AlbahaProjectCategory(models.Model):
    """How a project is classified for the executive summary: strategic,
    enterprise, developmental.

    A model rather than a selection because each category is presented as its
    own card with a title, tagline, description, colour, icon and a "coming
    soon" state — content the office will want to reword or extend without a
    code change. It is a separate axis from project_type (the nature of the
    work: construction, technical, consultancy) and from portfolio (a grouping
    of programmes), so neither of those was bent to carry it.
    """

    _name = 'albaha.project.category'
    _description = 'Project Category (executive summary)'
    _order = 'sequence, id'

    name = fields.Char(string='Name', required=True)
    code = fields.Char(string='Code', required=True)
    tagline = fields.Char(
        string='Tagline',
        help='Small line shown above the name on the executive-summary card.')
    description = fields.Text(string='Description')
    color = fields.Char(
        string='Colour', default='#00AB9D',
        help='Hex colour used for the card accent and progress bar.')
    icon = fields.Selection([
        ('target', 'Target'),
        ('building', 'Building'),
        ('trend', 'Trend'),
        ('layers', 'Layers'),
    ], string='Icon', default='target', required=True)
    sequence = fields.Integer(string='Sequence', default=10)
    active = fields.Boolean(default=True)
    coming_soon = fields.Boolean(
        string='Coming Soon',
        help='Show the card greyed out with a "قيد التطوير" badge.')
    project_ids = fields.One2many('albaha.project', 'category_id', string='Projects')
    project_count = fields.Integer(string='Projects', compute='_compute_project_count')

    _code_unique = models.Constraint('unique(code)', 'The category code must be unique.')

    @api.depends('project_ids')
    def _compute_project_count(self):
        counts = {}
        if self.ids:
            groups = self.env['albaha.project']._read_group(
                [('category_id', 'in', self.ids)], ['category_id'], ['__count'])
            counts = {category.id: count for category, count in groups}
        for category in self:
            category.project_count = counts.get(category.id, 0)
