from odoo import models, fields, api

class AlbhaResource(models.Model):
    _name = 'albaha.resource'
    _description = 'A resource allocation on a project'

    name = fields.Char(string="Reference")
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    employee_id = fields.Many2one('res.partner', string="Employee", ondelete='set null')
    role_on_project = fields.Char(string="Role on Project")
    allocation_pct = fields.Float(string="Allocation %")
    start_date = fields.Date(string="Start Date")
    end_date = fields.Date(string="End Date")
    billable_rate_sar_hr = fields.Float(string="Billable Rate (SAR/hr)")
    utilization_actual = fields.Float(string="Actual Utilization %")
    conflict_flag = fields.Boolean(string="Conflict", default=False)
