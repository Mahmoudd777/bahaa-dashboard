from odoo import models, fields, api

class AlbhaRisk(models.Model):
    _name = 'albaha.risk'
    _description = 'A project-level risk (5x5 probability x impact)'

    name = fields.Char(string="Risk Title", required=True)
    code = fields.Char(string="Risk Code")
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    category = fields.Selection([
        ('technical', 'Technical'),
        ('financial', 'Financial'),
        ('regulatory', 'Regulatory'),
        ('operational', 'Operational'),
        ('external', 'External'),
        ('reputational', 'Reputational')
    ], string="Category", default='operational')
    probability = fields.Integer(string="Probability (1-5)", default=1)
    impact = fields.Integer(string="Impact (1-5)", default=1)
    risk_score = fields.Integer(string="Score", help="probability x impact")
    severity = fields.Selection([
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low')
    ], string="Severity", default='low')
    response_strategy = fields.Selection([
        ('mitigate', 'Mitigate'),
        ('transfer', 'Transfer'),
        ('accept', 'Accept'),
        ('avoid', 'Avoid')
    ], string="Response", default='mitigate')
    mitigation_plan = fields.Text(string="Mitigation Plan")
    owner_id = fields.Many2one('res.partner', string="Owner", ondelete='set null')
    target_close_date = fields.Date(string="Target Close Date")
    status = fields.Selection([
        ('open', 'Open'),
        ('mitigating', 'Mitigating'),
        ('closed', 'Closed')
    ], string="Status", default='open')
    issue_ids = fields.One2many('albaha.issue', 'parent_risk_id', string="Issues")

    @api.depends('probability', 'impact')
    def _compute_risk_score(self):
        for record in self:
            record.risk_score = record.probability * record.impact

class AlbhaIssue(models.Model):
    _name = 'albaha.issue'
    _description = 'An issue raised on a project'

    name = fields.Char(string="Issue Title", required=True)
    code = fields.Char(string="Issue Code")
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    parent_risk_id = fields.Many2one('albaha.risk', string="Parent Risk", ondelete='set null')
    priority = fields.Selection([
        ('p1', 'P1 - Critical'),
        ('p2', 'P2 - High'),
        ('p3', 'P3 - Medium'),
        ('p4', 'P4 - Low')
    ], string="Priority", default='p3')
    impact_on = fields.Char(string="Impact On")
    raised_date = fields.Date(string="Raised Date", required=True)
    resolution_date = fields.Date(string="Resolution Date")
    age_days = fields.Integer(string="Age (days)")
    resolution_plan = fields.Text(string="Resolution Plan")
    owner_id = fields.Many2one('res.partner', string="Owner", ondelete='set null')
    escalation_level = fields.Selection([
        ('none', 'None'),
        ('pm', 'Project Manager'),
        ('steerco', 'SteerCo'),
        ('sponsor', 'Sponsor')
    ], string="Escalation", default='none')
    status = fields.Selection([
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved')
    ], string="Status", default='open')

    @api.depends('raised_date', 'resolution_date')
    def _compute_age_days(self):
        today = fields.Date.context_today(self)
        for record in self:
            if record.raised_date and not record.resolution_date:
                record.age_days = max(0, (today - record.raised_date).days)
            elif record.raised_date and record.resolution_date:
                 # If resolved, age is calculated up to resolution date for tracking purposes
                record.age_days = max(0, (record.resolution_date - record.raised_date).days)
            else:
                record.age_days = 0

class AlbhaChangeRequest(models.Model):
    _name = 'albaha.change.request'
    _description = 'A change request on a project'

    name = fields.Char(string="Title", required=True)
    code = fields.Char(string="CR Code")
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    cr_type = fields.Selection([
        ('scope', 'Scope'),
        ('schedule', 'Schedule'),
        ('cost', 'Cost'),
        ('quality', 'Quality')
    ], string="Type", default='scope')
    requested_by = fields.Char(string="Requested By")
    justification = fields.Text(string="Justification")
    cost_impact_sar_m = fields.Float(string="Cost Impact (SAR m)")
    schedule_impact_days = fields.Integer(string="Schedule Impact (days)")
    approval_status = fields.Selection([
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ], string="Approval", default='draft')
    approved_by_committee = fields.Char(string="Approved By Committee")
    decision_date = fields.Date(string="Decision Date")

class AlbhaProjectDependency(models.Model):
    _name = 'albaha.project.dependency'
    _description = 'A dependency between two projects'

    name = fields.Char(string="Reference")
    predecessor_project_id = fields.Many2one('albaha.project', string="Predecessor Project", ondelete='cascade', required=True)
    successor_project_id = fields.Many2one('albaha.project', string="Successor Project", ondelete='cascade', required=True)
    dep_type = fields.Selection([
        ('fs', 'Finish-to-Start'),
        ('ss', 'Start-to-Start'),
        ('ff', 'Finish-to-Finish'),
        ('sf', 'Start-to-Finish')
    ], string="Type", default='fs')
    lag_days = fields.Integer(string="Lag (days)")
    criticality = fields.Selection([
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low')
    ], string="Criticality", default='medium')
    impact_if_breached = fields.Text(string="Impact If Breached")
    status = fields.Selection([
        ('active', 'Active'),
        ('onhold', 'On Hold'),
        ('closed', 'Closed')
    ], string="Status", default='active')
