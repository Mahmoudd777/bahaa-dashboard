from odoo import models, fields, api

class AlbahaCommittee(models.Model):
    _name = 'albaha.committee'
    _description = 'A governance committee'
    _order = 'id'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Committee Code')
    tier = fields.Selection([
        ('strategic', 'Strategic'),
        ('executive', 'Executive'),
        ('operational', 'Operational')],
        string='Tier', default='executive'
    )
    chair_id = fields.Many2one('res.partner', string="Chair", ondelete='set null')
    member_ids = fields.Many2many('res.partner', string="Members")
    members_count = fields.Integer(string="Members Count")
    frequency = fields.Selection([
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly')],
        string='Frequency', default='monthly')
    scope = fields.Text(string="Scope")
    status = fields.Selection([
        ('active', 'Active'),
        ('onhold', 'On Hold'),
        ('closed', 'Closed')],
        string='Status', default='active')

    @api.depends('member_ids')
    def _compute_members_count(self):
        for record in self:
            record.members_count = len(record.member_ids)
