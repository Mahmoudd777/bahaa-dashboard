from odoo import models, fields, api

class AlbahaPortfolio(models.Model):
    _name = 'albaha.portfolio'
    _description = 'A strategic portfolio grouping programs'
    _order = 'id'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Portfolio Code')
    portfolio_type = fields.Char(string='Portfolio Type')
    fiscal_year = fields.Char(string='Fiscal Year')
    total_budget_sar_m = fields.Float(string='Total Budget (SAR m)')
    sponsor_entity = fields.Char(string='Sponsor Entity')
    start_date = fields.Date(string='Start Date')
    end_date = fields.Date(string='End Date')
    kpi_target_pct = fields.Float(string='KPI Target %')
    status = fields.Selection([
        ('active', 'Active'),
        ('onhold', 'On Hold'),
        ('closed', 'Closed')],
        string='Status', default='active'
    )
    program_ids = fields.One2many(
        'albaha.program.pmo', 
        'portfolio_id', 
        string='Programs',
        readonly=True
    )
