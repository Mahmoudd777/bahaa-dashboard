from odoo import models, fields, api
from odoo.exceptions import ValidationError

class AlbahaMilestone(models.Model):
    _name = 'albaha.milestone'
    _description = 'A milestone of a project'
    _order = 'initiative_id, project_id, planned_date, id'

    name = fields.Char(string='Milestone Name', required=True)
    code = fields.Char(string='Milestone Code')
    # A milestone hangs off a project OR an initiative. The strategy documents
    # list milestones under initiatives, before any project exists to carry
    # them, so project_id can no longer be required — the constraint below
    # keeps a milestone from floating free of both.
    project_id = fields.Many2one(
        'albaha.project',
        string='Project',
        ondelete='cascade',
    )
    initiative_id = fields.Many2one(
        'albaha.initiative',
        string='Initiative',
        ondelete='cascade',
    )
    # Milestone dates arrive as positions in the plan ("Q1 السنة الأولى")
    # rather than calendar dates, because the initiative's own start date is
    # what anchors them. Both are kept: the label as written, and the computed
    # date once the initiative has a start.
    planned_start_label = fields.Char(string='Planned Start (as written)')
    planned_end_label = fields.Char(string='Planned End (as written)')
    budget_capital_sar = fields.Float(string='Capital Budget (SAR)')
    budget_operational_sar = fields.Float(string='Operational Budget (SAR)')
    milestone_type = fields.Selection([
        ('gate', 'Gate'),
        ('deliverable', 'Deliverable'),
        ('payment', 'Payment'),
        ('review', 'Review')],
        string='Type', default='deliverable')
    planned_date = fields.Date(string='Planned Date')
    actual_date = fields.Date(string='Actual Date')
    status = fields.Selection([
        ('pending', 'Pending'),
        ('reached', 'Reached'),
        ('missed', 'Missed')],
        string='Status', default='pending')
    slippage_days = fields.Integer(string='Slippage (days)')
    weight_pct = fields.Float(string='Weight %')
    deliverable_ref = fields.Char(string='Deliverable Reference')

    @api.constrains('project_id', 'initiative_id')
    def _check_owner(self):
        """A milestone belongs to a project or an initiative — never neither.

        project_id used to be required, which was the only thing keeping
        orphans out. Now that it is optional, this takes over that job.
        """
        for record in self:
            if not record.project_id and not record.initiative_id:
                raise ValidationError(
                    "A milestone must belong to either a project or an initiative.")
