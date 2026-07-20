from odoo import models, fields, api

class AlbhaHealth(models.Model):
    _name = 'albaha.health'
    _description = 'A project health (RAG) snapshot'

    name = fields.Char(string="Reference")
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    snapshot_date = fields.Date(string="Snapshot Date", default=fields.Date.context_today)
    schedule_rag = fields.Selection([
        ('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')
    ], string='Schedule RAG', default='grey')
    cost_rag = fields.Selection([
        ('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')
    ], string='Cost RAG', default='grey')
    scope_rag = fields.Selection([
        ('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')
    ], string='Scope RAG', default='grey')
    risk_rag = fields.Selection([
        ('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')
    ], string='Risk RAG', default='grey')
    overall_rag = fields.Selection([
        ('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')
    ], string='Overall RAG', default='grey')
    trend = fields.Selection([
        ('up', 'Improving'), ('down', 'Declining'), ('flat', 'Stable')
    ], string='Trend', default='flat')
    narrative = fields.Text(string="Narrative")
