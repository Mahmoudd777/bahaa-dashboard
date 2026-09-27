{
    'name': 'Al-Baha Strategy - Initiatives',
    'summary': 'Initiatives, their periodic progress, Vision-2030 alignment and dependencies',
    'version': '19.0.1.2.0',
    'depends': ['base', 'mail', 'albaha_strategy'],
    'data': [
        'security/ir.model.access.csv',
        'views/albaha_initiative_views.xml',
        'views/albaha_initiative_progress_views.xml',
        'views/albaha_vision_alignment_views.xml',
        'views/albaha_dependency_views.xml',
        'views/albaha_investment_opportunity_views.xml',
        'views/albaha_challenge_views.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
