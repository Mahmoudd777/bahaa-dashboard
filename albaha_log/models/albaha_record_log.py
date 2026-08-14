from odoo import api, fields, models
from odoo.exceptions import UserError


class AlbahaRecordLog(models.Model):
    """An append-only note attached to any albaha.* record.

    Deliberately generic (res_model + res_id) rather than a Many2one per model:
    39 models carry logs, and a reference pair is how Odoo itself hangs
    mail.message off arbitrary records.
    """

    _name = "albaha.record.log"
    _description = "Al-Baha Record Log"
    _order = "create_date desc, id desc"
    _rec_name = "note"

    res_model = fields.Char(string="النموذج", required=True, index=True, readonly=True)
    res_id = fields.Integer(string="معرّف السجل", required=True, index=True, readonly=True)
    note = fields.Text(string="الملاحظة", required=True, readonly=True)
    user_id = fields.Many2one(
        "res.users", string="بواسطة", required=True, readonly=True,
        default=lambda self: self.env.user, ondelete="restrict",
    )
    record_ref = fields.Char(string="السجل", compute="_compute_record_ref")
    model_label = fields.Char(string="نوع السجل", compute="_compute_record_ref")

    @api.depends("res_model", "res_id")
    def _compute_record_ref(self):
        # sudo: portal users hold no ACLs on albaha.* but must still see which
        # record a note belongs to. Only the display name is exposed.
        model_names = {}
        for log in self:
            label = model_names.get(log.res_model)
            if label is None:
                model = self.env["ir.model"].sudo().search(
                    [("model", "=", log.res_model)], limit=1)
                label = model.name or log.res_model or ""
                model_names[log.res_model] = label
            log.model_label = label
            ref = ""
            if log.res_model in self.env.registry.models and log.res_id:
                rec = self.env[log.res_model].sudo().browse(log.res_id).exists()
                ref = rec.display_name if rec else ""
            log.record_ref = ref

    # --- append-only -------------------------------------------------------
    # ir.model.access already denies write/unlink to everyone but group_system;
    # these overrides exist so the refusal is an intelligible Arabic message
    # rather than a bare AccessError, and so sudo'd code cannot quietly rewrite
    # history either.

    def write(self, vals):
        if not self.env.user.has_group("base.group_system"):
            raise UserError("سجل الملاحظات للقراءة فقط ولا يمكن تعديله بعد الحفظ.")
        return super().write(vals)

    def unlink(self):
        if not self.env.user.has_group("base.group_system"):
            raise UserError("لا يمكن حذف الملاحظات المسجلة.")
        return super().unlink()
