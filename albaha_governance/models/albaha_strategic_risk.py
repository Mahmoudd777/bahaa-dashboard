from odoo import models, fields, api

class AlbahaStrategicRisk(models.Model):
    _name = 'albaha.strategic.risk'
    _description = 'A strategic risk on the risk register (probability x impact)'
    _order = 'risk_score desc, id'

    name = fields.Char(string="Risk Description", required=True)
    code = fields.Char(string="Risk Code")
    initiative_id = fields.Many2one('albaha.initiative', string="Initiative", ondelete='set null')
    # The register groups the strategic risks by pillar and states which one
    # each belongs to. Nothing held that, so a risk could not be read against
    # the pillar it threatens.
    pillar_id = fields.Many2one(
        'albaha.pillar', string="Pillar", ondelete='set null')
    risk_category = fields.Selection([
        ('technical', 'Technical'),
        ('financial', 'Financial'),
        ('regulatory', 'Regulatory'),
        ('operational', 'Operational'),
        ('external', 'External'),
        ('reputational', 'Reputational')],
        string='Category', default='operational')
    # The strategy scores its risks on a 3x3 matrix — 1 low, 2 medium, 3 high
    # on each axis — not the 5x5 this model was first written for.
    likelihood = fields.Integer(string="Likelihood (1-3)", default=1)
    impact = fields.Integer(string="Impact (1-3)", default=1)
    # The method below always existed and was never attached to the field, so
    # the score stayed empty whatever the two numbers were.
    risk_score = fields.Integer(
        string="Score", compute='_compute_risk_score', store=True,
        help="likelihood x impact")
    rag_status = fields.Selection([
        ('green', 'Green'),
        ('amber', 'Amber'),
        ('red', 'Red'),
        ('grey', 'Grey')],
        string='RAG', compute='_compute_risk_score', store=True, readonly=False)
    mitigation_action = fields.Text(string="Mitigation Action")
    owner_id = fields.Many2one('res.partner', string="Owner", ondelete='set null')
    identified_date = fields.Date(string="Identified Date", default=fields.Date.context_today)
    review_date = fields.Date(string="Review Date")
    status = fields.Selection([
        ('open', 'Open'),
        ('mitigating', 'Mitigating'),
        ('closed', 'Closed')],
        string='Status', default='open')

    @api.depends('likelihood', 'impact')
    def _compute_risk_score(self):
        for record in self:
            score = (record.likelihood or 0) * (record.impact or 0)
            record.risk_score = score
            # The bands are the legend of the strategy's own matrix: only the
            # 3x3 corner "requires intervention"; the cells where both axes
            # are at least medium "require monitoring"; the rest need nothing.
            if not score:
                record.rag_status = 'grey'
            elif score >= 9:
                record.rag_status = 'red'
            elif score >= 4:
                record.rag_status = 'amber'
            else:
                record.rag_status = 'green'
