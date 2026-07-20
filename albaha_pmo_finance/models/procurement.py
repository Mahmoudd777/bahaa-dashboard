from odoo import models, fields, api

class AlbahaProcurement(models.Model):
    _name = 'albaha.procurement'
    _description = 'A procurement record for a project'

    name = fields.Char(string="Reference", required=True)
    code = fields.Char(string="Procurement Code")
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    tender_ref_etimad = fields.Char(string="Etimad Tender Ref")
    procurement_type = fields.Selection([
        ('goods', 'Goods'),
        ('services', 'Services'),
        ('works', 'Works'),
        ('consultancy', 'Consultancy')
    ], string="Type", default='services')
    stage = fields.Selection([
        ('planning', 'Planning'),
        ('rfp', 'RFP Floated'),
        ('evaluation', 'Evaluation'),
        ('awarded', 'Awarded'),
        ('contracted', 'Contracted')
    ], string="Stage", default='planning')
    estimated_value_sar_m = fields.Float(string="Estimated Value (SAR m)")
    awarded_value_sar_m = fields.Float(string="Awarded Value (SAR m)")
    rfp_floated_date = fields.Date(string="RFP Floated Date")
    expected_award_date = fields.Date(string="Expected Award Date")
    awarded_supplier = fields.Char(string="Awarded Supplier")
    cycle_time_days = fields.Integer(string="Cycle Time (days)")
    contract_ids = fields.One2many('albaha.contract', 'procurement_id', string="Contracts")

class AlbahaProcurement(models.Model):
    _inherit = 'albaha.procurement' # Using inherit structure
    pass
