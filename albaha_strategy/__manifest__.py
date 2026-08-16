{
    'name': 'Al-Baha Strategy - Core',
    'summary': 'Strategic backbone - pillars, objectives, programs, sectors for Al-Baha.',
    'description': """
        This module provides the core structure for tracking and managing 
        the strategic plan of Al-Baha, including Pillars, Objectives, Programs, 
        and economic Sectors.
    """,
    'author': 'Expert Developer',
    'website': 'http://www.example.com',
    'category': 'Business',
    'version': '19.0.1.0.0',
    'depends': ['base', 'mail'],
    'data': [
        # Security first — groups before the ACLs that reference them
        'security/albaha_groups.xml',
        'security/ir.model.access.csv',
        # Views and Menus (Order matters for dependencies)
        'views/albaha_pillar_views.xml',
        'views/albaha_objective_views.xml',
        'views/albaha_program_views.xml',
        'views/albaha_sector_views.xml',
        'views/res_users_views.xml',
    ],
    'license': 'LGPL-3',
    'application': True,
}
