from odoo import models, fields, api

class AlbahaProject(models.Model):
    _name = 'albaha.project'
    _description = 'A project - the central PMO record'
    _order = 'program_id, id'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Project Code')
    # Optional: the region's existing government projects belong to outside
    # entities — the water authority, the municipality — and sit under no PMO
    # programme of ours. Requiring one meant they could not be recorded at all.
    program_id = fields.Many2one(
        'albaha.program.pmo',
        string='Program',
        ondelete='cascade',
    )
    # Projects delivered under a strategy initiative point back to it.
    initiative_id = fields.Many2one(
        'albaha.initiative',
        string='Initiative',
        ondelete='set null',
    )
    # Who is actually delivering it, for projects run outside this office.
    owner_entity = fields.Char(
        string='Delivering Entity',
        help='The body running the project, e.g. شركة المياه الوطنية.')
    project_type = fields.Char(string='Project Type')

    # Projects the office supports rather than runs are reported by where
    # they have got to — "معتمد — قيد التطوير والطرح", "متعاقد عليها وتم
    # تخصيص أراضيها" — which is a stage in the investment pipeline, not a
    # health rating. Kept as written so it is not flattened into one.
    delivery_stage = fields.Char(
        string='Stage',
        help="Where the project has reached, in the source's own words.")
    source_reference = fields.Char(
        string='Source',
        help='Where the record was read from, so any figure can be checked.')
    category_id = fields.Many2one(
        'albaha.project.category',
        string='Category',
        index=True,
        ondelete='set null',
        help='Strategic / enterprise / developmental - drives the executive-summary cards.'
    )
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
    # The written status the office asked to see on the projects page: what
    # moved, what was achieved, what is in the way, and why anything is late.
    # Written by the office; nothing in the strategy files supplies it.
    progress_summary = fields.Text(string='ملخص التقدم')
    achievements = fields.Text(string='أبرز الإنجازات')
    challenges = fields.Text(string='التحديات')
    delay_reason = fields.Text(string='أسباب التأخير')
    milestone_ids = fields.One2many(
        'albaha.milestone', 
        'project_id', 
        string='Milestones',
        readonly=True
    )
