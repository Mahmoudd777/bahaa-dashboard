{
    "name": "Al-Baha Record Log",
    "version": "19.0.1.0.0",
    "summary": "Append-only notes attached to any Al-Baha record (who, when, where, what)",
    "category": "Productivity",
    "author": "Global Solutions",
    "license": "LGPL-3",
    # Every module that defines an albaha.* model, because the mixin is
    # inherited into all of them.
    "depends": [
        "base",
        "albaha_strategy",
        "albaha_kpi",
        "albaha_initiative",
        "albaha_governance",
        "albaha_pmo",
        "albaha_pmo_delivery",
        "albaha_pmo_finance",
        "albaha_pmo_governance",
        "albaha_pmo_risk",
    ],
    "data": [
        "security/ir.model.access.csv",
        "views/albaha_record_log_views.xml",
        "views/albaha_logged_form_views.xml",
    ],
    "installable": True,
    "application": False,
}
