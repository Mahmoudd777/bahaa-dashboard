from odoo import models, fields, api

class AlbahaFinancial(models.Model):
    _name = 'albaha.financial'
    _description = 'Earned Value Management (EVM) figures for a project period'

    name = fields.Char(string="Reference", required=True)
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    reporting_period = fields.Char(string="Reporting Period", required=True)
    pv_planned_value = fields.Float(string="PV - Planned Value")
    ev_earned_value = fields.Float(string="EV - Earned Value")
    ac_actual_cost = fields.Float(string="AC - Actual Cost")
    cpi = fields.Float(string="CPI")
    spi = fields.Float(string="SPI")
    eac = fields.Float(string="EAC")
    vac = fields.Float(string="VAC")
    burn_rate_monthly = fields.Float(string="Burn Rate (monthly)")

    @api.depends('ev_earned_value', 'ac_actual_cost', 'pv_planned_value')
    def _compute_metrics(self):
        for record in self:
            # CPI = EV / AC
            if record.ac_actual_cost != 0 and record.ev_earned_value is not None:
                record.cpi = record.ev_earned_value / record.ac_actual_cost
            else:
                record.cpi = 0.0

            # SPI = EV / PV
            if record.pv_planned_value != 0 and record.ev_earned_value is not None:
                record.spi = record.ev_earned_value / record.pv_planned_value
            else:
                record.spi = 0.0

            # EAC (Estimate at Completion) = AC / CPI
            if record.cpi != 0:
                record.eac = record.ac_actual_cost / record.cpi
            else:
                record.eac = 0.0

            # VAC (Variance at Completion) = BAC - EAC (Assuming BAC is implicitly handled or derived, using a simple placeholder calculation based on available fields for demonstration)
            # Since BAC isn't provided, we will leave it as a direct input/calculation if needed, but stick to the defined fields.
            pass

class AlbahaFinancial(models.Model):
    _inherit = 'albaha.financial' # Using inherit structure
    pass
