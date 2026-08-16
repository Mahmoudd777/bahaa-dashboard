{
    "name": "Al-Baha Backend Theme",
    "summary": "Al-Baha Strategic Office brand theme for the Odoo backend",
    "description": """
Re-skins the Odoo backend in the Al-Baha Strategic Office brand so users moving
between the dashboard and the underlying records stay in one visual language.

Reuses the exact design tokens already defined by ``dashboard_app`` (brown
#5c4b43, teal #00ab9d, Tajawal) rather than inventing a second palette — the
drill-down from the dashboard ("فتح السجل الكامل") lands in the backend, so the
two surfaces have to match.

Styling only: no models, no views, no data. Uninstall to get stock Odoo back.
""",
    "version": "19.0.1.0.0",
    "category": "Themes/Backend",
    "author": "Al-Baha Strategic Office",
    "license": "LGPL-3",
    # dashboard_app ships the Tajawal woff2 files this theme references by URL.
    "depends": ["web", "dashboard_app"],
    "data": [
        "views/layout_templates.xml",
    ],
    "assets": {
        # Loaded before Odoo's own defaults so the brand colours feed every
        # component that paints itself from these variables.
        "web._assets_primary_variables": [
            (
                "prepend",
                "albaha_backend_theme/static/src/scss/variables.scss",
            ),
        ],
        "web.assets_backend": [
            "albaha_backend_theme/static/src/scss/backend.scss",
        ],
    },
    "installable": True,
    "application": False,
    "auto_install": False,
}
