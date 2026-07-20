{
    'name': 'Al-Baha Strategy - KPIs',
    'summary': 'KPI register, time-series KPI values, regional indicators, sector KPIs',
    'version': '19.0.1.0.0',
    'depends': ['base', 'mail', 'albaha_strategy'],
    'data': [
        'security/ir.model.access.csv',
        'views/kpi_views.xml',
        'views/kpi_value_views.xml',
        'views/regional_indicator_views.xml',
        'views/sector_kpi_views.xml',
    ],
    'assets': {},
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
