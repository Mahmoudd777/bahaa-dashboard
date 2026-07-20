{
    'name': 'Al-Baha PMO - Finance',
    'summary': 'Budget tracking, EVM financials, procurement and contracts',
    'version': '19.0.1.0.0',
    'depends': ['base', 'mail', 'albaha_pmo'],
    'data': [
        'security/ir.model.access.csv',
        'views/00_menu_root.xml',
        'views/albaha_budget_views.xml',
        'views/albaha_financial_views.xml',
        'views/albaha_procurement_views.xml',
        'views/albaha_contract_views.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
