{
    'name': 'Al-Baha PMO - Risks & Issues',
    'summary': 'Project risks, issues, change requests, cross-project dependencies',
    'version': '19.0.1.0.0',
    'depends': ['base', 'mail', 'albaha_pmo'],
    'data': [
        'security/ir.model.access.csv',
        'views/00_menu_root.xml',
        'views/albaha_risk_views.xml',
        'views/albaha_issue_views.xml',
        'views/albaha_change_request_views.xml',
        'views/albaha_project_dependency_views.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
