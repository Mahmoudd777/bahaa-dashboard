from odoo import api, fields, models

# Editor-toggle field  ->  group XML id. Ticking a box adds the user to that
# model's editor group (write/create/delete); unticking removes them. Read
# access stays for every internal user via the module ACLs.
EDIT_GROUPS = {
    "albaha_can_edit_objective": "albaha_strategy.group_albaha_edit_objective",
    "albaha_can_edit_pillar": "albaha_strategy.group_albaha_edit_pillar",
    "albaha_can_edit_program": "albaha_strategy.group_albaha_edit_program",
    "albaha_can_edit_kpi": "albaha_strategy.group_albaha_edit_kpi",
    "albaha_can_edit_indicator": "albaha_strategy.group_albaha_edit_indicator",
    "albaha_can_edit_initiative": "albaha_strategy.group_albaha_edit_initiative",
    "albaha_can_edit_risk": "albaha_strategy.group_albaha_edit_risk",
    "albaha_can_edit_decision": "albaha_strategy.group_albaha_edit_decision",
    "albaha_can_edit_steerco": "albaha_strategy.group_albaha_edit_steerco",
}


class ResUsers(models.Model):
    _inherit = "res.users"

    albaha_can_edit_objective = fields.Boolean(
        string="تعديل الأهداف الاستراتيجية",
        compute="_compute_albaha_edit", inverse="_inverse_albaha_edit")
    albaha_can_edit_pillar = fields.Boolean(
        string="تعديل الركائز",
        compute="_compute_albaha_edit", inverse="_inverse_albaha_edit")
    albaha_can_edit_program = fields.Boolean(
        string="تعديل البرامج",
        compute="_compute_albaha_edit", inverse="_inverse_albaha_edit")
    albaha_can_edit_kpi = fields.Boolean(
        string="تعديل المؤشرات",
        compute="_compute_albaha_edit", inverse="_inverse_albaha_edit")
    albaha_can_edit_indicator = fields.Boolean(
        string="تعديل المؤشرات الإقليمية",
        compute="_compute_albaha_edit", inverse="_inverse_albaha_edit")
    albaha_can_edit_initiative = fields.Boolean(
        string="تعديل المبادرات",
        compute="_compute_albaha_edit", inverse="_inverse_albaha_edit")
    albaha_can_edit_risk = fields.Boolean(
        string="تعديل المخاطر الاستراتيجية",
        compute="_compute_albaha_edit", inverse="_inverse_albaha_edit")
    albaha_can_edit_decision = fields.Boolean(
        string="تعديل القرارات",
        compute="_compute_albaha_edit", inverse="_inverse_albaha_edit")
    albaha_can_edit_steerco = fields.Boolean(
        string="تعديل قرارات اللجان",
        compute="_compute_albaha_edit", inverse="_inverse_albaha_edit")

    def _albaha_group(self, xmlid):
        return self.env.ref(xmlid, raise_if_not_found=False)

    @api.depends("group_ids")
    def _compute_albaha_edit(self):
        groups = {f: self._albaha_group(x) for f, x in EDIT_GROUPS.items()}
        for user in self:
            for fname, grp in groups.items():
                user[fname] = bool(grp and grp in user.group_ids)

    def _inverse_albaha_edit(self):
        for user in self:
            # Build ONE command list and assign once. Assigning user.group_ids
            # repeatedly in a loop does not accumulate — each assignment
            # replaces the pending write, so only the last command would apply.
            cmds = []
            for fname, xmlid in EDIT_GROUPS.items():
                grp = self._albaha_group(xmlid)
                if not grp:
                    continue
                cmds.append((4, grp.id) if user[fname] else (3, grp.id))
            if cmds:
                user.group_ids = cmds
