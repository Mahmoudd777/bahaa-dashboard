from odoo import models, fields, api

class AlbhaScheduleTask(models.Model):
    _name = 'albaha.schedule.task'
    _description = 'A WBS schedule task (supports parent/child hierarchy)'

    name = fields.Char(string="Task Name", required=True)
    project_id = fields.Many2one('albaha.project', string="Project", ondelete='cascade', required=True)
    parent_task_id = fields.Many2one('albaha.schedule.task', string="Parent Task", ondelete='set null')
    wbs_code = fields.Char(string="WBS Code")
    baseline_start = fields.Date(string="Baseline Start")
    baseline_finish = fields.Date(string="Baseline Finish")
    actual_start = fields.Date(string="Actual Start")
    actual_finish = fields.Date(string="Actual Finish")
    duration_days = fields.Integer(string="Duration (days)")
    progress_pct = fields.Float(string="Progress %")
    is_critical_path = fields.Boolean(string="On Critical Path", default=False)
    slack_days = fields.Integer(string="Slack (days)")
