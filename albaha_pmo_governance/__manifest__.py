{
    'name': 'Al-Baha PMO - Governance & Closure',
    'summary': 'PMO governance policies, steering decisions, lessons, closures, stakeholders, strategy alignment',
    'version': '19.0.1.0.0',
    'depends': ['base', 'mail', 'albaha_pmo'],
    'data': [
        'security/ir.model.access.csv',
        'views/00_menu_root.xml',
        'views/albaha_governance_views.xml',
        'views/albaha_steerco_views.xml',
        'views/albaha_lesson_views.xml',
        'views/albaha_closure_views.xml',
        'views/albaha_strategy_bridge_views.xml',
        'views/albaha_stakeholder_views.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
