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

    # The decks phase each programme's spend and its expected return over the
    # five years of the strategy. Those figures live only inside the charts of
    # the detailed document, never in a table, so they are held here rather
    # than derived from the initiatives below the programme.
    plan_ids = fields.One2many(
        'albaha.program.plan', 'program_id', string='Yearly Plan')


class AlbahaProgramPlan(models.Model):
    _name = 'albaha.program.plan'
    _description = "A programme's planned spend and expected return for one year of the strategy"
    _order = 'program_id, year_no'

    program_id = fields.Many2one(
        'albaha.program', string='Program', required=True, ondelete='cascade')
    # The strategy phases by its own year ("السنة الأولى"), not by calendar
    # year; the calendar year is recorded beside it where the deck gives one.
    year_no = fields.Integer(string='Strategy Year', required=True)
    year_label = fields.Char(
        string='Year Label', help='The year as the source deck writes it.')
    calendar_year = fields.Integer(string='Calendar Year')
    budget_planned_sar_m = fields.Float(string='Planned Spend (SAR m)')
    # Reported cumulatively in the source — the return expected to have accrued
    # by the end of this year, not the year's own share.
    return_cumulative_sar_m = fields.Float(
        string='Expected Return, Cumulative (SAR m)')
    return_annual_sar_m = fields.Float(
        string='Expected Return This Year (SAR m)',
        compute='_compute_return_annual', store=True)

    @api.depends('year_no', 'return_cumulative_sar_m',
                 'program_id.plan_ids.year_no',
                 'program_id.plan_ids.return_cumulative_sar_m')
    def _compute_return_annual(self):
        for record in self:
            previous = record.program_id.plan_ids.filtered(
                lambda p, r=record: p.year_no == r.year_no - 1)
            before = previous[:1].return_cumulative_sar_m if previous else 0.0
            record.return_annual_sar_m = record.return_cumulative_sar_m - before
