{
    'name': 'Al-Baha PMO - Delivery',
    'summary': 'Deliverables, WBS schedule tasks, resource allocation, health snapshots',
    'version': '19.0.1.0.0',
    'depends': ['base', 'mail', 'albaha_pmo'],
    'data': [
        'security/ir.model.access.csv',
        'views/00_menu_root.xml',
        'views/albaha_deliverable_views.xml',
        'views/albaha_schedule_task_views.xml',
        'views/albaha_resource_views.xml',
        'views/albaha_health_views.xml',
    ],
    'installable': True,
    'application': True,
    'license': 'LGPL-3',
}
