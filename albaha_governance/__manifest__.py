{
    'name': 'Al-Baha Strategy - Governance & Risk',
    'summary': 'Committees, decisions, reviews, strategic risks, transformation initiatives',
    'version': '19.0.1.0.0',
    'depends': ['base', 'mail', 'albaha_initiative'],
    'data': [
        'security/ir.model.access.csv',
        'views/00_menu_root.xml',
        'views/albaha_committee_views.xml',
        'views/albaha_decision_views.xml',
        'views/albaha_review_views.xml',
        'views/albaha_strategic_risk_views.xml',
        'views/albaha_transformation_views.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
