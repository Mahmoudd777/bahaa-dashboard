from odoo import models, fields, api

class AlbahaStrategicRisk(models.Model):
    _name = 'albaha.strategic.risk'
    _description = 'A strategic risk on the risk register (5x5 probability x impact)'
    _order = 'risk_score desc, id'

    name = fields.Char(string="Risk Description", required=True)
    code = fields.Char(string="Risk Code")
    initiative_id = fields.Many2one('albaha.initiative', string="Initiative", ondelete='set null')
    risk_category = fields.Selection([
        ('technical', 'Technical'),
        ('financial', 'Financial'),
        ('regulatory', 'Regulatory'),
        ('operational', 'Operational'),
        ('external', 'External'),
        ('reputational', 'Reputational')],
        string='Category', default='operational')
    likelihood = fields.Integer(string="Likelihood (1-5)", default=1)
    impact = fields.Integer(string="Impact (1-5)", default=1)
    risk_score = fields.Integer(string="Score", help="likelihood x impact")
    rag_status = fields.Selection([
        ('green', 'Green'),
        ('amber', 'Amber'),
        ('red', 'Red'),
        ('grey', 'Grey')],
        string='RAG', default='grey')
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
            record.risk_score = record.likelihood * record.impact
