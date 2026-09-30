"""Split the project-summary composites into one component per card.

`evm_panel` drew all three earned-value cards and `project_category_cards`
drew every category card from a single dashboard.component. The layout editor
moves components, so each whole row could only be moved and resized as one
block. Each card is now its own component, bound to one card with the
"provider:arg" source form (evm_panel:cpi, project_category_cards:2).

The seed is noupdate="1": on an existing database the upgrade creates the new
per-card records it declares, but leaves the old composite records as they
were. This turns each old composite into the first card of its set. Components
without a dashboard_app XML id (per-user copies of a dashboard) got no new
records from the seed, so their remaining cards are created here.

Only components whose source is still the bare provider name are touched, so
running this twice changes nothing.
"""
import logging

from odoo import SUPERUSER_ID, api

_logger = logging.getLogger(__name__)

EVM_CARDS = [("ev", "القيمة المكتسبة"), ("cpi", "انحراف التكلفة"), ("spi", "انحراف الجدول")]
CATEGORY_ROWS = 47


def _is_seeded(env, comp):
    return bool(env["ir.model.data"].search_count([
        ("model", "=", "dashboard.component"),
        ("res_id", "=", comp.id),
        ("module", "=", "dashboard_app"),
    ]))


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    Comp = env["dashboard.component"]
    touched_sections = env["dashboard.section"].browse()

    for comp in Comp.search([("source", "=", "evm_panel")]):
        seeded = _is_seeded(env, comp)
        key, name = EVM_CARDS[0]
        comp.write({"source": "evm_panel:%s" % key, "name": name, "col_span": 4})
        if not seeded:
            for offset, (key, name) in enumerate(EVM_CARDS[1:], start=1):
                comp.copy({"source": "evm_panel:%s" % key, "name": name,
                           "sequence": comp.sequence + offset})
        touched_sections |= comp.section_id

    categories = 0
    if "albaha.project.category" in env.registry.models:
        categories = env["albaha.project.category"].search_count([])
    for comp in Comp.search([("source", "=", "project_category_cards")]):
        seeded = _is_seeded(env, comp)
        comp.write({"source": "project_category_cards:0", "name": "تصنيف المشاريع 1",
                    "col_span": 4, "row_span": CATEGORY_ROWS})
        if not seeded:
            for index in range(1, max(1, categories)):
                comp.copy({"source": "project_category_cards:%d" % index,
                           "name": "تصنيف المشاريع %d" % (index + 1),
                           "sequence": comp.sequence + index})
        touched_sections |= comp.section_id

    # The tab's saved positions described three full-width rows. Clear them so
    # the flow layout places the new cards from their sequence instead of
    # stacking them on top of one another.
    if touched_sections:
        touched_sections.component_ids.write({"grid_x": 0, "grid_y": 0})
    _logger.info("project summary: split composites in %d sections", len(touched_sections))
