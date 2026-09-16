"""Add the executive project summary tab to every existing executive dashboard.

The seed (data/demo_dashboard.xml) is noupdate="1", so on an existing database
its new section only lands on the two master dashboards it references. Per-user
copies were cloned long before this tab existed and would never get it. This
copies the master's section into each of them, once.

Runs after module data is loaded, so the master section already exists here;
any dashboard that already has a portfolio_health component is left untouched,
which keeps the migration idempotent and never duplicates the masters' tab.
"""
import logging

from odoo import SUPERUSER_ID, api

_logger = logging.getLogger(__name__)

SOURCES = ("portfolio_health", "evm_panel", "project_category_cards")


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    master = env.ref("dashboard_app.sec_ceo_projects", raise_if_not_found=False)
    if not master:
        _logger.warning("executive project summary: master section missing, nothing copied")
        return
    general = env.ref("dashboard_app.dashboard_general", raise_if_not_found=False)

    added = 0
    for dashboard in env["dashboard.dashboard"].search([]):
        if general and dashboard == general:
            continue
        components = dashboard.section_ids.component_ids
        if any(c.source in SOURCES for c in components):
            continue
        next_seq = max(dashboard.section_ids.mapped("sequence") or [0]) + 1
        section = master.copy({"dashboard_id": dashboard.id, "sequence": next_seq})
        # copy() does not follow component_ids (one2many), so carry them over.
        for comp in master.component_ids:
            comp.copy({"section_id": section.id})
        added += 1
    _logger.info("executive project summary: tab added to %s existing dashboards", added)
