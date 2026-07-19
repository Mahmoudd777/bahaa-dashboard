"""Whitelisted import targets for the dashboard import wizard.

Each target defines human-readable columns, sample rows, match keys for
create-or-update, and optional relation resolution rules. Only models listed
here can be imported through the dashboard — never arbitrary Odoo models.
"""

# Column spec keys:
#   header          – Arabic column title in the Excel template
#   field           – Odoo field name on the target model
#   required        – must be non-empty
#   relation        – comodel name for Many2one resolution
#   relation_lookup – field on the related model used for lookup (code/name)

IMPORT_TARGETS = {
    "pillar": {
        "key": "pillar",
        "label": "المحاور الاستراتيجية",
        "model": "albaha.pillar",
        "match_fields": ["code"],
        "columns": [
            {"header": "الكود", "field": "code", "required": True},
            {"header": "الاسم", "field": "name", "required": True},
            {"header": "الاسم بالإنجليزية", "field": "name_en"},
            {"header": "الوصف", "field": "description"},
            {"header": "الترتيب", "field": "sequence"},
            {"header": "اللون", "field": "color_hex"},
            {"header": "الحالة", "field": "status"},
        ],
        "samples": [
            ["PIL-01", "البنية التحتية الداعمة", "Supporting Infrastructure", "", "10", "#00AB9D", "active"],
        ],
    },
    "objective": {
        "key": "objective",
        "label": "الأهداف الاستراتيجية",
        "model": "albaha.objective",
        "match_fields": ["code"],
        "columns": [
            {"header": "الكود", "field": "code", "required": True},
            {"header": "الاسم", "field": "name", "required": True},
            {"header": "رمز المحور", "field": "pillar_id", "required": True,
             "relation": "albaha.pillar", "relation_lookup": "code"},
            {"header": "الاسم بالإنجليزية", "field": "name_en"},
            {"header": "المستهدف", "field": "target_value"},
            {"header": "الوحدة", "field": "unit"},
            {"header": "خط الأساس", "field": "baseline_value"},
            {"header": "سنة المستهدف", "field": "target_year"},
            {"header": "الوزن %", "field": "weight_pct"},
            {"header": "الحالة", "field": "status"},
        ],
        "samples": [
            ["OBJ-001", "هدف استراتيجي 1", "PIL-01", "Objective 1", "100", "%", "50", "2030", "10", "active"],
        ],
    },
    "program": {
        "key": "program",
        "label": "البرامج الاستراتيجية",
        "model": "albaha.program",
        "match_fields": ["code"],
        "columns": [
            {"header": "الكود", "field": "code", "required": True},
            {"header": "الاسم", "field": "name", "required": True},
            {"header": "رمز المحور", "field": "pillar_id", "required": True,
             "relation": "albaha.pillar", "relation_lookup": "code"},
            {"header": "الاسم بالإنجليزية", "field": "name_en"},
            {"header": "الموازنة (مليون ريال)", "field": "total_budget_sar_m"},
            {"header": "تاريخ البداية", "field": "start_date"},
            {"header": "تاريخ النهاية", "field": "end_date"},
            {"header": "الحالة", "field": "status"},
        ],
        "samples": [
            ["PRG-01", "برنامج التنمية", "PIL-01", "Development Program", "500", "2025-01-01", "2030-12-31", "active"],
        ],
    },
    "kpi": {
        "key": "kpi",
        "label": "مؤشرات الأداء",
        "model": "albaha.kpi",
        "match_fields": ["code"],
        "columns": [
            {"header": "الكود", "field": "code", "required": True},
            {"header": "الاسم", "field": "name", "required": True},
            {"header": "الاسم بالإنجليزية", "field": "name_en"},
            {"header": "النوع", "field": "kpi_type"},
            {"header": "الوحدة", "field": "unit"},
            {"header": "خط الأساس", "field": "baseline_value"},
            {"header": "سنة الأساس", "field": "baseline_year"},
            {"header": "المستهدف", "field": "target_value"},
            {"header": "سنة المستهدف", "field": "target_year"},
            {"header": "الدورية", "field": "frequency"},
            {"header": "الاتجاه", "field": "direction"},
        ],
        "samples": [
            ["KPI-01", "مؤشر الأداء 1", "KPI 1", "outcome", "%", "50", "2020", "100", "2030", "quarterly", "up"],
        ],
    },
    "kpi_value": {
        "key": "kpi_value",
        "label": "قيم المؤشرات",
        "model": "albaha.kpi.value",
        "match_fields": ["kpi_id", "period"],
        "columns": [
            {"header": "رمز المؤشر", "field": "kpi_id", "required": True,
             "relation": "albaha.kpi", "relation_lookup": "code"},
            {"header": "الفترة", "field": "period", "required": True},
            {"header": "القيمة الفعلية", "field": "actual_value", "required": True},
            {"header": "المستهدف", "field": "target_value"},
            {"header": "نوع الفترة", "field": "period_type"},
            {"header": "الحالة", "field": "rag_status"},
            {"header": "ملاحظة", "field": "comment"},
        ],
        "samples": [
            ["KPI-01", "2025-Q1", "75", "100", "quarter", "green", ""],
        ],
    },
    "regional_indicator": {
        "key": "regional_indicator",
        "label": "المؤشرات الإقليمية",
        "model": "albaha.regional.indicator",
        "match_fields": ["code"],
        "columns": [
            {"header": "الكود", "field": "code", "required": True},
            {"header": "الاسم", "field": "name", "required": True},
            {"header": "الفئة", "field": "category", "required": True},
            {"header": "الوحدة", "field": "unit"},
            {"header": "القيمة", "field": "value"},
            {"header": "خط الأساس", "field": "baseline"},
            {"header": "المستهدف", "field": "target"},
            {"header": "الاتجاه", "field": "trend"},
            {"header": "المصدر", "field": "source"},
        ],
        "samples": [
            ["REG-01", "مؤشر إقليمي 1", "اقتصادي", "%", "45", "30", "60", "up", "الهيئة"],
        ],
    },
    "initiative": {
        "key": "initiative",
        "label": "المبادرات",
        "model": "albaha.initiative",
        "match_fields": ["code"],
        "columns": [
            {"header": "الكود", "field": "code", "required": True},
            {"header": "الاسم", "field": "name", "required": True},
            {"header": "رمز البرنامج", "field": "program_id", "required": True,
             "relation": "albaha.program", "relation_lookup": "code"},
            {"header": "رمز المحور", "field": "pillar_id",
             "relation": "albaha.pillar", "relation_lookup": "code"},
            {"header": "تاريخ البداية", "field": "start_date"},
            {"header": "تاريخ النهاية", "field": "end_date"},
            {"header": "الموازنة الكلية", "field": "budget_total_sar_m"},
            {"header": "نسبة الإنجاز %", "field": "progress_pct"},
            {"header": "الحالة", "field": "status"},
            {"header": "RAG", "field": "rag_status"},
        ],
        "samples": [
            ["INIT-01", "مبادرة 1", "PRG-01", "PIL-01", "2025-01-01", "2026-12-31", "100", "35", "active", "amber"],
        ],
    },
    "initiative_progress": {
        "key": "initiative_progress",
        "label": "تقدم المبادرات",
        "model": "albaha.initiative.progress",
        "match_fields": ["initiative_id", "period"],
        "columns": [
            {"header": "رمز المبادرة", "field": "initiative_id", "required": True,
             "relation": "albaha.initiative", "relation_lookup": "code"},
            {"header": "الفترة", "field": "period", "required": True},
            {"header": "نسبة الإنجاز %", "field": "progress_pct"},
            {"header": "المعالم المكتملة", "field": "milestones_completed"},
            {"header": "إجمالي المعالم", "field": "milestones_total"},
            {"header": "RAG", "field": "rag_status"},
        ],
        "samples": [
            ["INIT-01", "2025-Q1", "40", "2", "5", "amber"],
        ],
    },
    "project": {
        "key": "project",
        "label": "المشاريع",
        "model": "albaha.project",
        "match_fields": ["code"],
        "columns": [
            {"header": "الكود", "field": "code", "required": True},
            {"header": "الاسم", "field": "name", "required": True},
            {"header": "رمز البرنامج", "field": "program_id", "required": True,
             "relation": "albaha.program.pmo", "relation_lookup": "code"},
            {"header": "الإنجاز %", "field": "progress_pct"},
            {"header": "الصحة", "field": "health_status"},
            {"header": "تاريخ البداية المخطط", "field": "planned_start"},
            {"header": "تاريخ النهاية المخطط", "field": "planned_end"},
            {"header": "الأولوية", "field": "priority"},
            {"header": "المرحلة", "field": "phase"},
        ],
        "samples": [
            ["PRJ-01", "مشروع 1", "PMO-01", "55", "green", "2025-01-01", "2026-06-30", "high", "executing"],
        ],
    },
    "budget": {
        "key": "budget",
        "label": "سجلات الموازنة",
        "model": "albaha.budget",
        "match_fields": ["project_id", "period_year_month"],
        "columns": [
            {"header": "رمز المشروع", "field": "project_id", "required": True,
             "relation": "albaha.project", "relation_lookup": "code"},
            {"header": "الفترة (YYYY-MM)", "field": "period_year_month", "required": True},
            {"header": "المرجع", "field": "name", "required": True},
            {"header": "فئة الموازنة", "field": "budget_category"},
            {"header": "المعتمد", "field": "approved_amount"},
            {"header": "المصروف", "field": "actual_spent"},
        ],
        "samples": [
            ["PRJ-01", "2025-06", "BUD-2025-06", "تشغيل", "10", "4.5"],
        ],
    },
    "strategic_risk": {
        "key": "strategic_risk",
        "label": "المخاطر الاستراتيجية",
        "model": "albaha.strategic.risk",
        "match_fields": ["code"],
        "columns": [
            {"header": "الكود", "field": "code", "required": True},
            {"header": "الوصف", "field": "name", "required": True},
            {"header": "رمز المبادرة", "field": "initiative_id",
             "relation": "albaha.initiative", "relation_lookup": "code"},
            {"header": "الفئة", "field": "risk_category"},
            {"header": "الاحتمالية", "field": "likelihood"},
            {"header": "الأثر", "field": "impact"},
            {"header": "إجراء التخفيف", "field": "mitigation_action"},
            {"header": "تاريخ التعريف", "field": "identified_date"},
            {"header": "الحالة", "field": "status"},
        ],
        "samples": [
            ["RSK-01", "خطر تشغيلي", "INIT-01", "operational", "3", "4", "خطة تخفيف", "2025-01-15", "open"],
        ],
    },
    "decision": {
        "key": "decision",
        "label": "القرارات",
        "model": "albaha.decision",
        "match_fields": ["code"],
        "columns": [
            {"header": "الكود", "field": "code", "required": True},
            {"header": "العنوان", "field": "name", "required": True},
            {"header": "تاريخ القرار", "field": "decision_date"},
            {"header": "الوصف", "field": "description"},
            {"header": "الأولوية", "field": "priority"},
            {"header": "تاريخ الاستحقاق", "field": "due_date"},
            {"header": "الحالة", "field": "status"},
        ],
        "samples": [
            ["DEC-01", "قرار تنفيذي", "2025-03-01", "وصف القرار", "high", "2025-06-30", "open"],
        ],
    },
    "steerco": {
        "key": "steerco",
        "label": "اجتماعات اللجنة التوجيهية",
        "model": "albaha.steerco",
        "match_fields": ["name", "meeting_date"],
        "columns": [
            {"header": "نص القرار", "field": "name", "required": True},
            {"header": "اسم اللجنة", "field": "committee_name"},
            {"header": "تاريخ الاجتماع", "field": "meeting_date"},
            {"header": "نوع القرار", "field": "decision_type"},
            {"header": "مرجع CR", "field": "linked_cr_ref"},
            {"header": "تاريخ الاستحقاق", "field": "due_date"},
            {"header": "حالة التنفيذ", "field": "execution_status"},
        ],
        "samples": [
            ["اعتماد الخطة السنوية", "لجنة التوجيه", "2025-04-10", "approval", "CR-2025-01", "2025-07-01", "open"],
        ],
    },
}


def get_target(key):
    return IMPORT_TARGETS.get(key)


def list_targets(env, require_create=False):
    """Return import targets whose model is installed and optionally creatable."""
    items = []
    for spec in IMPORT_TARGETS.values():
        model = spec["model"]
        if model not in env.registry.models:
            continue
        if require_create and not env[model].check_access_rights("create", raise_exception=False):
            continue
        items.append({
            "key": spec["key"],
            "label": spec["label"],
            "model": model,
            "columns": [c["header"] for c in spec["columns"]],
        })
    return sorted(items, key=lambda x: x["label"])
