from odoo import models, fields, api

class AlbahaKPI(models.Model):
    _name = 'albaha.kpi'
    _description = 'A key performance indicator definition'
    _order = 'id'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='KPI Code')
    description = fields.Text(string='Description')
    kpi_type = fields.Selection([
        ('outcome', 'Outcome'),
        ('output', 'Output'),
        ('input', 'Input'),
        ('impact', 'Impact')
    ], string='KPI Type', default='outcome')
    unit = fields.Char(string='Unit')
    baseline_value = fields.Float(string='Baseline Value')
    baseline_year = fields.Integer(string='Baseline Year')
    target_value = fields.Float(string='Target Value')
    target_year = fields.Integer(string='Target Year')
    frequency = fields.Selection([
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annual', 'Annual')
    ], string='Frequency', default='quarterly')
    direction = fields.Selection([
        ('up', 'Higher is better'),
        ('down', 'Lower is better')
    ], string='Direction', default='up')
    formula = fields.Text(string='Formula')
    value_ids = fields.One2many('albaha.kpi.value', 'kpi_id', string="Values")

    # --- dashboard roll-ups (latest reported period vs target) ---
    latest_value = fields.Float(string="Latest Value", compute="_compute_latest")
    achievement_pct = fields.Float(string="Achievement %", compute="_compute_latest")
    rag = fields.Selection(
        [('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')],
        string="RAG", compute="_compute_latest")

    @api.depends('value_ids.actual_value', 'value_ids.period',
                 'value_ids.rag_status', 'value_ids.target_value', 'target_value')
    def _compute_latest(self):
        for kpi in self:
            vals = kpi.value_ids.sorted(key=lambda v: v.period or '')
            last = vals[-1] if vals else False
            kpi.latest_value = last.actual_value if last else 0.0
            tgt = kpi.target_value or (last.target_value if last else 0.0)
            pct = (kpi.latest_value / tgt * 100.0) if tgt else 0.0
            kpi.achievement_pct = round(min(pct, 999.0), 1)
            kpi.rag = last.rag_status if (last and last.rag_status) else 'grey'

class AlbahaKPIValue(models.Model):
    _name = 'albaha.kpi.value'
    _description = 'A reported value of a KPI for a period (time series)'
    _order = 'kpi_id, period'

    name = fields.Char(string='Reference')
    kpi_id = fields.Many2one('albaha.kpi', string="KPI", ondelete='cascade', required=True)
    period = fields.Char(string='Period', required=True)
    period_type = fields.Selection([
        ('month', 'Month'),
        ('quarter', 'Quarter'),
        ('year', 'Year')
    ], string='Period Type', default='quarter')
    actual_value = fields.Float(string='Actual Value', required=True)
    target_value = fields.Float(string='Target Value')
    variance_pct = fields.Float(string='Variance %')
    rag_status = fields.Selection([
        ('green', 'Green'),
        ('amber', 'Amber'),
        ('red', 'Red'),
        ('grey', 'Grey')
    ], string='RAG', default='grey')
    comment = fields.Text(string='Comment')
    reported_by = fields.Char(string='Reported By')
    reported_date = fields.Date(string='Reported Date')
    approved_by = fields.Char(string='Approved By')
    approval_date = fields.Date(string='Approval Date')

class AlbahaRegionalIndicator(models.Model):
    _name = 'albaha.regional.indicator'
    _description = 'A region-level macro indicator'
    _order = 'category, id'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Indicator Code')
    category = fields.Char(string='Category', required=True)
    unit = fields.Char(string='Unit')
    value = fields.Float(string='Value')
    baseline = fields.Float(string='Baseline')
    target = fields.Float(string='Target')
    trend = fields.Selection([
        ('up', 'Up'),
        ('down', 'Down'),
        ('flat', 'Flat')
    ], string='Trend', default='flat')
    source = fields.Char(string='Source')
    last_updated = fields.Date(string='Last Updated')

class AlbahaSectorKPI(models.Model):
    _name = 'albaha.sector.kpi'
    _description = 'A sector KPI value (generic - covers economic, tourism, agriculture, quality-of-life, investment)'
    _order = 'domain, period'

    name = fields.Char(string='Reference')
    domain = fields.Selection([
        ('economic', 'Economic'),
        ('tourism', 'Tourism'),
        ('agriculture', 'Agriculture'),
        ('qol', 'Quality of Life'),
        ('investment', 'Investment')
    ], string='Domain', required=True, default='economic')
    sector_id = fields.Many2one('albaha.sector', string="Sector")
    period = fields.Char(string='Period', required=True)
    indicator = fields.Char(string='Indicator', required=True)
    value = fields.Float(string='Value')
    target = fields.Float(string='Target')
    unit = fields.Char(string='Unit')
    rag_status = fields.Selection([
        ('green', 'Green'),
        ('amber', 'Amber'),
        ('red', 'Red'),
        ('grey', 'Grey')
    ], string='RAG', default='grey')
    source = fields.Char(string='Source')
    reported_date = fields.Date(string='Reported Date')
