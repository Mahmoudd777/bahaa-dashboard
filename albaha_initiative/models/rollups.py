from odoo import models, fields


def rag_of(pct):
    """green/amber/red/grey from a 0-100 progress percentage."""
    if not pct:
        return 'grey'
    if pct >= 80:
        return 'green'
    if pct >= 50:
        return 'amber'
    return 'red'


class AlbahaProgramRollup(models.Model):
    _inherit = 'albaha.program'

    progress_pct = fields.Float(string="Progress %", compute="_compute_progress")
    rag = fields.Selection(
        [('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')],
        string="RAG", compute="_compute_progress")

    def _compute_progress(self):
        Init = self.env['albaha.initiative']
        for prog in self:
            inits = Init.search([('program_id', '=', prog.id)]) if prog.id else Init
            prog.progress_pct = (
                round(sum(inits.mapped('progress_pct')) / len(inits), 1) if inits else 0.0)
            prog.rag = rag_of(prog.progress_pct)


class AlbahaPillarRollup(models.Model):
    _inherit = 'albaha.pillar'

    progress_pct = fields.Float(string="Progress %", compute="_compute_progress")
    rag = fields.Selection(
        [('green', 'Green'), ('amber', 'Amber'), ('red', 'Red'), ('grey', 'Grey')],
        string="RAG", compute="_compute_progress")

    def _compute_progress(self):
        Init = self.env['albaha.initiative']
        for pil in self:
            inits = Init.search([('pillar_id', '=', pil.id)]) if pil.id else Init
            pil.progress_pct = (
                round(sum(inits.mapped('progress_pct')) / len(inits), 1) if inits else 0.0)
            pil.rag = rag_of(pil.progress_pct)
