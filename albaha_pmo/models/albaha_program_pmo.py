from odoo import models, fields, api

class AlbahaProgramPMO(models.Model):
    _name = 'albaha.program.pmo'
    _description = 'A delivery program under a portfolio'
    _order = 'portfolio_id, id'

    name = fields.Char(string='Name (Arabic)', required=True)
    name_en = fields.Char(string='Name (English)')
    code = fields.Char(string='Program Code')
    portfolio_id = fields.Many2one(
        'albaha.portfolio', 
        string='Portfolio', 
        ondelete='cascade', 
        required=True
    )
    objective = fields.Text(string='Objective')
    manager_id = fields.Many2one(
        'res.partner', 
        string='Manager', 
        ondelete='set null'
    )
    sector = fields.Char(string='Sector')
    budget_sar_m = fields.Float(string='Budget (SAR m)')
    priority = fields.Selection([
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low')],
        string='Priority', default='medium')
    expected_benefit = fields.Text(string='Expected Benefit')
    status = fields.Selection([
        ('active', 'Active'),
        ('onhold', 'On Hold'),
        ('closed', 'Closed')],
        string='Status', default='active')
    project_ids = fields.One2many(
        'albaha.project', 
        'program_id', 
        string='Projects',
        readonly=True
    )
