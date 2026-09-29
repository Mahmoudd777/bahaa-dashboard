from odoo import models, fields, api


def rag_of(pct):
    """green/amber/red/grey from a 0-100 progress percentage."""
    if not pct:
        return 'grey'
    if pct >= 80:
        return 'green'
    if pct >= 50:
        return 'amber'
    return 'red'


class AlbahaObjectiveRollup(models.Model):
    _inherit = 'albaha.objective'

    kpi_ids = fields.Many2many(
        'albaha.kpi', string="Linked KPIs",
        help="KPIs measuring this objective; progress = their average achievement.")
    progress_pct = fields.Float(string="Progress %", compute="_compute_progress")
    rag = fields.Selection(
        [('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')],
        string="RAG", compute="_compute_progress")

    @api.depends('kpi_ids.achievement_pct', 'kpi_ids.value_ids.is_reported')
    def _compute_progress(self):
        for obj in self:
            # Only indicators with a reported result. One measured indicator
            # beside four unmeasured ones is not an objective at 20%: the four
            # are unknown, not zero, and averaging them in painted it red.
            kpis = obj.kpi_ids.filtered(lambda k: k.value_ids.filtered('is_reported'))
            obj.progress_pct = (
                round(sum(kpis.mapped('achievement_pct')) / len(kpis), 1) if kpis else 0.0)
            obj.rag = rag_of(obj.progress_pct) if kpis else 'grey'
