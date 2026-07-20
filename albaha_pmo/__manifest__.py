{
    'name': 'Al-Baha PMO - Core',
    'summary': 'Portfolio, programs, projects (central table) and milestones',
    'version': '19.0.1.0.0',
    'depends': ['base', 'mail', 'albaha_strategy'],
    'data': [
        'security/ir.model.access.csv',
        'views/00_menu_root.xml',
        'views/albaha_portfolio_views.xml',
        'views/albaha_program_pmo_views.xml',
        'views/albaha_project_views.xml',
        'views/albaha_milestone_views.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
