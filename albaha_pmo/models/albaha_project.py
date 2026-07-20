from odoo import models, fields, api

class AlbahaProject(models.Model):
    _name = 'albaha.project'
    _description = 'A project - the central PMO record'
    _order = 'program_id, id'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Project Code')
    program_id = fields.Many2one(
        'albaha.program.pmo', 
        string='Program', 
        ondelete='cascade', 
        required=True
    )
    project_type = fields.Char(string='Project Type')
    manager_id = fields.Many2one(
        'res.partner', 
        string='Manager', 
        ondelete='set null'
    )
    sponsor_id = fields.Many2one(
        'res.partner', 
        string='Sponsor', 
        ondelete='set null'
    )
    strategic_pillar_id = fields.Many2one(
        'albaha.pillar', 
        string='Strategic Pillar', 
        ondelete='set null'
    )
    planned_start = fields.Date(string='Planned Start')
    planned_end = fields.Date(string='Planned End')
    actual_start = fields.Date(string='Actual Start')
    actual_end = fields.Date(string='Actual End')
    baseline_cost_sar_m = fields.Float(string='Baseline Cost (SAR m)')
    actual_cost_to_date = fields.Float(string='Actual Cost to Date (SAR m)')
    eac_forecast = fields.Float(string='EAC Forecast (SAR m)')
    progress_pct = fields.Float(string='Progress %')
    planned_pct = fields.Float(string='Planned %')
    health_status = fields.Selection([
        ('green', 'Green'),
        ('amber', 'Amber'),
        ('red', 'Red'),
        ('grey', 'Grey')],
        string='Health', default='grey')
    priority = fields.Selection([
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low')],
        string='Priority', default='medium')
    phase = fields.Selection([
        ('initiating', 'Initiating'),
        ('planning', 'Planning'),
        ('executing', 'Executing'),
        ('monitoring', 'Monitoring'),
        ('closing', 'Closing')],
        string='Phase', default='initiating')
    geo_location = fields.Char(string='Geo Location')
    last_status_update = fields.Date(string='Last Status Update')
    milestone_ids = fields.One2many(
        'albaha.milestone', 
        'project_id', 
        string='Milestones',
        readonly=True
    )
