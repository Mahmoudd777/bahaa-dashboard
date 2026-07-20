from odoo import models, fields, api

class AlbahaStrategyBridge(models.Model):
    _name = 'albaha.strategy.bridge'
    _description = 'Alignment of a project to a strategic pillar and Vision 2030'
    _order = 'project_id, id'

    name = fields.Char(string='Reference')
    project_id = fields.Many2one('albaha.project', string='Project', ondelete='cascade', required=True)
    pillar_id = fields.Many2one('albaha.pillar', string='Strategic Pillar')
    vision2030_objective = fields.Char(string='Vision 2030 Objective')
    kpi_name = fields.Char(string='KPI Name')
    contribution_pct = fields.Float(string='Contribution %')
    baseline_value = fields.Float(string='Baseline Value')
    target_value = fields.Float(string='Target Value')
    measurement_unit = fields.Char(string='Measurement Unit')
