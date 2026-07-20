from odoo import models, fields

class AlbahaContract(models.Model):
    _name = 'albaha.contract'
    _description = 'A supplier contract resulting from a procurement'

    name = fields.Char(string="Contract Number", required=True)
    procurement_id = fields.Many2one('albaha.procurement', string="Procurement", ondelete='set null')
    supplier_id = fields.Many2one('res.partner', string="Supplier", ondelete='set null')
    contract_value_sar_m = fields.Float(string="Contract Value (SAR m)")
    currency = fields.Char(string="Currency", default="SAR")
    signed_date = fields.Date(string="Signed Date")
    start_date = fields.Date(string="Start Date")
    end_date = fields.Date(string="End Date")
    performance_guarantee_pct = fields.Float(string="Performance Guarantee %")
    sla_terms = fields.Text(string="SLA Terms")
    extensions_count = fields.Integer(string="Extensions Count")
    status = fields.Selection([
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('terminated', 'Terminated')
    ], string="Status", default='draft')

class AlbahaContract(models.Model):
    _inherit = 'albaha.contract' # Using inherit structure
    pass
