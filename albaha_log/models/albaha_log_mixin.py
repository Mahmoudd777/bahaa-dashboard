from odoo import fields, models


class AlbahaLogMixin(models.AbstractModel):
    """Gives a model its own log thread.

    The One2many hangs off albaha.record.log.res_id (an Integer) narrowed by a
    res_model domain — the same shape mail.thread uses for message_ids, which is
    what makes a single log table serve every albaha model.
    """

    _name = "albaha.log.mixin"
    _description = "Al-Baha Record Log Mixin"

    log_ids = fields.One2many(
        "albaha.record.log", "res_id",
        domain=lambda self: [("res_model", "=", self._name)],
        string="السجل",
        readonly=True,
    )
