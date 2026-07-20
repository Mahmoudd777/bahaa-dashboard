from odoo import models, fields, api

class AlbahaTransformation(models.Model):
    _name = 'albaha.transformation'
    _description = 'A regional transformation initiative'
    _order = 'id'

    name = fields.Char(string="Name (Arabic)", required=True)
    name_en = fields.Char(string="Name (English)")
    code = fields.Char(string="Transformation Code")
    description = fields.Text(string="Description")
    target_year = fields.Integer(string="Target Year")
    impact_level = fields.Selection([
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low')],
        string='Impact Level', default='high')
    sponsor_id = fields.Many2one('res.partner', string="Sponsor", ondelete='set null')
    progress_pct = fields.Float(string="Progress %")
    strategic_value = fields.Text(string="Strategic Value")
    rag_status = fields.Selection([
        ('green', 'Green'),
        ('amber', 'Amber'),
        ('red', 'Red'),
        ('grey', 'Grey')],
        string='RAG', default='grey')
    status = fields.Selection([
        ('active', 'Active'),
        ('onhold', 'On Hold'),
        ('closed', 'Closed')],
        string='Status', default='active')
