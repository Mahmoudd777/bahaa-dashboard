from odoo import models, fields, api

class AlbahaStakeholder(models.Model):
    _name = 'albaha.stakeholder'
    _description = 'A project/program stakeholder'
    _order = 'id'

    name = fields.Char(string='Full Name (Arabic)', required=True)
    code = fields.Char(string='Stakeholder Code')
    entity_name = fields.Char(string='Entity Name')
    role_title = fields.Char(string='Role / Title')
    stakeholder_type = fields.Selection([
        ('internal', 'Internal'),
        ('external', 'External'),
        ('government', 'Government'),
        ('partner', 'Partner')
    ], string='Type', default='internal')
    influence_level = fields.Selection([
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low')
    ], string='Influence', default='medium')
    interest_level = fields.Selection([
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low')
    ], string='Interest', default='medium')
    engagement_strategy = fields.Selection([
        ('manage_closely', 'Manage Closely'),
        ('keep_satisfied', 'Keep Satisfied'),
        ('keep_informed', 'Keep Informed'),
        ('monitor', 'Monitor')
    ], string='Engagement Strategy', default='keep_informed')
    contact_channel = fields.Char(string='Contact Channel')
