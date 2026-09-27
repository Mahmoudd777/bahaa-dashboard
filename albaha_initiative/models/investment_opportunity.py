from odoo import models, fields, api


class AlbahaInvestmentOpportunity(models.Model):
    """An investment opportunity offered to the private sector.

    Thirty of these are set out in the appendix of the strategy's detailed
    document, each with its own feasibility study: what it is, which programme
    and initiative it serves, and what it is expected to return. They are not
    the office's own projects and carry none of its budget — they are the
    pipeline it markets — so they are kept apart from `albaha.project` and do
    not count towards delivery performance.
    """

    _name = 'albaha.investment.opportunity'
    _description = 'An investment opportunity with a feasibility study'
    _order = 'number, id'

    name = fields.Char(string='Name (Arabic)', required=True)
    # The source numbers them 1 to 30 and refers to them by that number.
    number = fields.Integer(string='Opportunity No.')
    description = fields.Text(string='Overview')
    program_id = fields.Many2one(
        'albaha.program', string='Program', ondelete='set null')
    initiative_id = fields.Many2one(
        'albaha.initiative', string='Initiative', ondelete='set null')

    # Expected impact by 2030
    visitors_k = fields.Float(
        string='Visitors (thousands)',
        help='Left empty where the study gives no visitor figure.')
    jobs_direct = fields.Integer(string='Direct Jobs')
    jobs_indirect = fields.Integer(string='Indirect Jobs')
    gdp_contribution_sar_m = fields.Float(string='GDP Contribution (SAR m)')

    # Financial case, modelled to 2050
    npv_sar_m = fields.Float(string='NPV (SAR m)')
    irr_pct = fields.Float(string='IRR %')
    payback_years = fields.Float(string='Payback Period (years)')

    # Revenue is charted for 2028 to 2032; the pages that plot it as a single
    # run rather than a series leave these empty.
    revenue_2028_sar_m = fields.Float(string='Revenue 2028 (SAR m)')
    revenue_2029_sar_m = fields.Float(string='Revenue 2029 (SAR m)')
    revenue_2030_sar_m = fields.Float(string='Revenue 2030 (SAR m)')
    revenue_2031_sar_m = fields.Float(string='Revenue 2031 (SAR m)')
    revenue_2032_sar_m = fields.Float(string='Revenue 2032 (SAR m)')

    jobs_total = fields.Integer(
        string='Total Jobs', compute='_compute_jobs_total', store=True)
    # Where the figures came from, so any of them can be checked against the
    # page that states it.
    source_reference = fields.Char(
        string='Source', help='The slides of the detailed document it is read from.')

    @api.depends('jobs_direct', 'jobs_indirect')
    def _compute_jobs_total(self):
        for record in self:
            record.jobs_total = record.jobs_direct + record.jobs_indirect
