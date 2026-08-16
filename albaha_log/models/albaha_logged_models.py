"""Attaches albaha.log.mixin to every albaha.* record model.

Kept in one file rather than scattered across the nine defining modules so the
coverage is auditable in a single place: if a model is missing here, it has no
log thread.
"""

from odoo import models

class AlbahaBudget(models.Model):
    _name = "albaha.budget"
    _inherit = ["albaha.budget", "albaha.log.mixin"]

class AlbahaChangeRequest(models.Model):
    _name = "albaha.change.request"
    _inherit = ["albaha.change.request", "albaha.log.mixin"]

class AlbahaClosure(models.Model):
    _name = "albaha.closure"
    _inherit = ["albaha.closure", "albaha.log.mixin"]

class AlbahaCommittee(models.Model):
    _name = "albaha.committee"
    _inherit = ["albaha.committee", "albaha.log.mixin"]

class AlbahaContract(models.Model):
    _name = "albaha.contract"
    _inherit = ["albaha.contract", "albaha.log.mixin"]

class AlbahaDecision(models.Model):
    _name = "albaha.decision"
    _inherit = ["albaha.decision", "albaha.log.mixin"]

class AlbahaDeliverable(models.Model):
    _name = "albaha.deliverable"
    _inherit = ["albaha.deliverable", "albaha.log.mixin"]

class AlbahaDependency(models.Model):
    _name = "albaha.dependency"
    _inherit = ["albaha.dependency", "albaha.log.mixin"]

class AlbahaFinancial(models.Model):
    _name = "albaha.financial"
    _inherit = ["albaha.financial", "albaha.log.mixin"]

class AlbahaGovernance(models.Model):
    _name = "albaha.governance"
    _inherit = ["albaha.governance", "albaha.log.mixin"]

class AlbahaHealth(models.Model):
    _name = "albaha.health"
    _inherit = ["albaha.health", "albaha.log.mixin"]

class AlbahaInitiative(models.Model):
    _name = "albaha.initiative"
    _inherit = ["albaha.initiative", "albaha.log.mixin"]

class AlbahaInitiativeProgress(models.Model):
    _name = "albaha.initiative.progress"
    _inherit = ["albaha.initiative.progress", "albaha.log.mixin"]

class AlbahaIssue(models.Model):
    _name = "albaha.issue"
    _inherit = ["albaha.issue", "albaha.log.mixin"]

class AlbahaKpi(models.Model):
    _name = "albaha.kpi"
    _inherit = ["albaha.kpi", "albaha.log.mixin"]

class AlbahaKpiValue(models.Model):
    _name = "albaha.kpi.value"
    _inherit = ["albaha.kpi.value", "albaha.log.mixin"]

class AlbahaLesson(models.Model):
    _name = "albaha.lesson"
    _inherit = ["albaha.lesson", "albaha.log.mixin"]

class AlbahaMilestone(models.Model):
    _name = "albaha.milestone"
    _inherit = ["albaha.milestone", "albaha.log.mixin"]

class AlbahaObjective(models.Model):
    _name = "albaha.objective"
    _inherit = ["albaha.objective", "albaha.log.mixin"]

class AlbahaPillar(models.Model):
    _name = "albaha.pillar"
    _inherit = ["albaha.pillar", "albaha.log.mixin"]

class AlbahaPortfolio(models.Model):
    _name = "albaha.portfolio"
    _inherit = ["albaha.portfolio", "albaha.log.mixin"]

class AlbahaProcurement(models.Model):
    _name = "albaha.procurement"
    _inherit = ["albaha.procurement", "albaha.log.mixin"]

class AlbahaProgram(models.Model):
    _name = "albaha.program"
    _inherit = ["albaha.program", "albaha.log.mixin"]

class AlbahaProgramPmo(models.Model):
    _name = "albaha.program.pmo"
    _inherit = ["albaha.program.pmo", "albaha.log.mixin"]

class AlbahaProject(models.Model):
    _name = "albaha.project"
    _inherit = ["albaha.project", "albaha.log.mixin"]

class AlbahaProjectDependency(models.Model):
    _name = "albaha.project.dependency"
    _inherit = ["albaha.project.dependency", "albaha.log.mixin"]

class AlbahaRegionalIndicator(models.Model):
    _name = "albaha.regional.indicator"
    _inherit = ["albaha.regional.indicator", "albaha.log.mixin"]

class AlbahaResource(models.Model):
    _name = "albaha.resource"
    _inherit = ["albaha.resource", "albaha.log.mixin"]

class AlbahaReview(models.Model):
    _name = "albaha.review"
    _inherit = ["albaha.review", "albaha.log.mixin"]

class AlbahaRisk(models.Model):
    _name = "albaha.risk"
    _inherit = ["albaha.risk", "albaha.log.mixin"]

class AlbahaScheduleTask(models.Model):
    _name = "albaha.schedule.task"
    _inherit = ["albaha.schedule.task", "albaha.log.mixin"]

class AlbahaSector(models.Model):
    _name = "albaha.sector"
    _inherit = ["albaha.sector", "albaha.log.mixin"]

class AlbahaSectorKpi(models.Model):
    _name = "albaha.sector.kpi"
    _inherit = ["albaha.sector.kpi", "albaha.log.mixin"]

class AlbahaStakeholder(models.Model):
    _name = "albaha.stakeholder"
    _inherit = ["albaha.stakeholder", "albaha.log.mixin"]

class AlbahaSteerco(models.Model):
    _name = "albaha.steerco"
    _inherit = ["albaha.steerco", "albaha.log.mixin"]

class AlbahaStrategicRisk(models.Model):
    _name = "albaha.strategic.risk"
    _inherit = ["albaha.strategic.risk", "albaha.log.mixin"]

class AlbahaStrategyBridge(models.Model):
    _name = "albaha.strategy.bridge"
    _inherit = ["albaha.strategy.bridge", "albaha.log.mixin"]

class AlbahaTransformation(models.Model):
    _name = "albaha.transformation"
    _inherit = ["albaha.transformation", "albaha.log.mixin"]

class AlbahaVisionAlignment(models.Model):
    _name = "albaha.vision.alignment"
    _inherit = ["albaha.vision.alignment", "albaha.log.mixin"]
