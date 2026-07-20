from odoo import models, fields, api

class AlbahaInitiative(models.Model):
    _name = 'albaha.initiative'
    _description = 'A strategic initiative executed under a program'
    _order = 'program_id, id'

    # Selection Definitions (RAG)
    GREEN = (True, 'Green')
    AMBER = (True, 'Amber')
    RED = (True, 'Red')
    GREY = (True, 'Grey')

    # Selection Definitions (Status)
    ACTIVE = (True, 'Active')
    ONHOLD = (True, 'On Hold')
    CLOSED = (True, 'Closed')

    name = fields.Char(string="Name (Arabic)", required=True, help="Name of the initiative in Arabic.")
    name_en = fields.Char(string="Name (English)")
    code = fields.Char(string="Initiative Code", copy=False)
    program_id = fields.Many2one('albaha.program', string="Program", required=True, ondelete='cascade')
    pillar_id = fields.Many2one('albaha.pillar', string="Pillar", ondelete='set null')
    description = fields.Text(string="Description")
    sector = fields.Char(string="Sector")
    start_date = fields.Date(string="Start Date")
    end_date = fields.Date(string="End Date")
    budget_total_sar_m = fields.Float(string="Total Budget (SAR m)")
    budget_capital_sar_m = fields.Float(string="Capital Budget (SAR m)")
    budget_operational_sar_m = fields.Float(string="Operational Budget (SAR m)")
    budget_consumed_sar_m = fields.Float(string="Budget Consumed (SAR m)")
    progress_pct = fields.Float(string="Progress %")
    rag_status = fields.Selection([('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')], 
                                  string="RAG Status", default='grey')
    owner_id = fields.Many2one('res.partner', string="Owner", ondelete='set null')
    status = fields.Selection([('active', 'Active'), ('onhold', 'On Hold'), ('closed', 'Closed')], 
                                 string="Status", default='active')
    progress_ids = fields.One2many('albaha.initiative.progress', 'initiative_id', string="Progress History")

class AlbahaInitiativeProgress(models.Model):
    _name = 'albaha.initiative.progress'
    _description = 'A periodic progress snapshot for an initiative'
    _order = 'initiative_id, period'

    # Selection Definitions (RAG)
    GREEN = (True, 'Green')
    AMBER = (True, 'Amber')
    RED = (True, 'Red')
    GREY = (True, 'Grey')

    name = fields.Char(string="Reference")
    initiative_id = fields.Many2one('albaha.initiative', string="Initiative", required=True, ondelete='cascade')
    period = fields.Char(string="Period", required=True)
    progress_pct = fields.Float(string="Progress %")
    milestones_completed = fields.Integer(string="Milestones Completed")
    milestones_total = fields.Integer(string="Milestones Total")
    budget_consumed_pct = fields.Float(string="Budget Consumed %")
    rag_status = fields.Selection([('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')], 
                                  string="RAG Status", default='grey')
    narrative = fields.Text(string="Narrative")
    reported_by = fields.Char(string="Reported By")
    reported_date = fields.Date(string="Reported Date")

class AlbahaVisionAlignment(models.Model):
    _name = 'albaha.vision.alignment'
    _description = 'Alignment of an initiative to a Vision 2030 pillar/objective'
    _order = 'initiative_id, id'

    # Selection Definitions (Strength)
    HIGH = (True, 'High')
    MEDIUM = (True, 'Medium')
    LOW = (True, 'Low')

    name = fields.Char(string="Reference")
    initiative_id = fields.Many2one('albaha.initiative', string="Initiative", required=True, ondelete='cascade')
    vision_2030_pillar = fields.Char(string="Vision 2030 Pillar", required=True)
    vision_objective = fields.Char(string="Vision Objective")
    alignment_strength = fields.Selection([('high', 'High'), ('medium', 'Medium'), ('low', 'Low')], 
                                          string="Alignment Strength", default='medium')
    contribution_pct = fields.Float(string="Contribution %")
    rationale = fields.Text(string="Rationale")
    validated_by = fields.Char(string="Validated By")
    validation_date = fields.Date(string="Validation Date")

class AlbahaDependency(models.Model):
    _name = 'albaha.dependency'
    _description = 'A dependency between two initiatives'
    _order = 'id'

    # Selection Definitions (Type)
    FS = (True, 'Finish-to-Start')
    SS = (True, 'Start-to-Start')
    FF = (True, 'Finish-to-Finish')
    SF = (True, 'Start-to-Finish')

    # Selection Definitions (Criticality)
    HIGH_CRIT = (True, 'High')
    MEDIUM_CRIT = (True, 'Medium')
    LOW_CRIT = (True, 'Low')

    # Selection Definitions (Status)
    ACTIVE = (True, 'Active')
    ONHOLD = (True, 'On Hold')
    CLOSED = (True, 'Closed')


    name = fields.Char(string="Reference")
    source_initiative_id = fields.Many2one('albaha.initiative', string="Source Initiative", required=True, ondelete='cascade')
    target_initiative_id = fields.Many2one('albaha.initiative', string="Target Initiative", required=True, ondelete='cascade')
    dependency_type = fields.Selection([('fs', 'Finish-to-Start'), ('ss', 'Start-to-Start'), ('ff', 'Finish-to-Finish'), ('sf', 'Start-to-Finish')], 
                                         string="Type", default='fs')
    description = fields.Text(string="Description")
    criticality = fields.Selection([('high', 'High'), ('medium', 'Medium'), ('low', 'Low')], 
                                    string="Criticality", default='medium')
    status = fields.Selection([('active', 'Active'), ('onhold', 'On Hold'), ('closed', 'Closed')], 
                                 string="Status", default='active')
