# -*- coding: utf-8 -*-
"""Second audit: internal consistency, not a re-run of the source comparison.

Looks for the things a count cannot show — truncated text, duplicates,
placeholder rows that slipped through, numbers that contradict each other.
"""
Initiative = env["albaha.initiative"].sudo()
Milestone = env["albaha.milestone"].sudo()
KPI = env["albaha.kpi"].sudo()
Value = env["albaha.kpi.value"].sudo()
Risk = env["albaha.risk"].sudo()
Objective = env["albaha.objective"].sudo()

issues = []
note = issues.append

# ---------------------------------------------------- junk / placeholder rows
for model, label in ((Initiative, "initiative"), (Milestone, "milestone"),
                     (KPI, "kpi"), (Risk, "risk"), (Objective, "objective")):
    for rec in model.search([]):
        n = (rec.name or "").strip()
        if not n:
            note("%s %s has an empty name" % (label, rec.id))
        elif n in ("-", "--", "N/A", "NA") or n.isdigit():
            note("%s %s name looks like a placeholder: %r" % (label, rec.id, n))
        elif len(n) < 4:
            note("%s %s name suspiciously short: %r" % (label, rec.id, n))

# ------------------------------------------------------------- duplicates
for model, label in ((Initiative, "initiative"), (KPI, "kpi")):
    seen = {}
    for rec in model.search([]):
        seen.setdefault((rec.name or "").strip(), []).append(rec.code or rec.id)
    for name, who in seen.items():
        if len(who) > 1:
            note("duplicate %s name %r -> %s" % (label, name[:40], who))

# milestones repeated inside one initiative
dups = 0
for init in Initiative.search([]):
    names = [m.name for m in Milestone.search([("initiative_id", "=", init.id)])]
    if len(names) != len(set(names)):
        dups += 1
        note("initiative %s has repeated milestone names" % init.code)
if not dups:
    print("AUDIT no repeated milestone names inside any initiative")

# ------------------------------------------------- milestone vs initiative
for init in Initiative.search([]):
    ms = Milestone.search([("initiative_id", "=", init.id)])
    if not ms:
        note("initiative %s has no milestones" % init.code)
        continue
    total = sum(m.budget_capital_sar + m.budget_operational_sar for m in ms)
    if init.budget_total_sar_m and total:
        declared = init.budget_total_sar_m * 1000000.0
        # milestone budgets should add up to roughly the initiative's own
        if abs(total - declared) / declared > 0.02:
            note("initiative %s: milestones sum to %.1fm but the card says %.1fm"
                 % (init.code, total / 1000000.0, init.budget_total_sar_m))
    # dates must sit inside the initiative's own window
    if init.start_date and init.end_date:
        out = [m for m in ms if m.planned_date and not (init.start_date <= m.planned_date <= init.end_date)]
        if out:
            note("initiative %s: %d milestone dates fall outside its window" % (init.code, len(out)))

# --------------------------------------------------------------- KPI values
for k in KPI.search([]):
    vals = Value.search([("kpi_id", "=", k.id)])
    periods = [v.period for v in vals]
    if len(periods) != len(set(periods)):
        note("kpi %s has duplicate periods" % k.code)
    if vals and k.frequency == "quarterly" and len(vals) < 8:
        note("kpi %s is quarterly but only has %d periods" % (k.code, len(vals)))
    neg = [v.period for v in vals if v.target_value and v.target_value < 0]
    if neg:
        note("kpi %s has negative targets: %s" % (k.code, neg))

# ------------------------------------------------------------------ risks
bad = Risk.search([]).filtered(lambda r: r.probability * r.impact != r.risk_score)
if bad:
    note("%d risks where score != probability x impact" % len(bad))
no_mit = Risk.search_count([("mitigation_plan", "=", False)])
if no_mit:
    note("%d risks with no mitigation recorded" % no_mit)

# ----------------------------------------------------------------- summary
print("AUDIT initiatives=%d milestones=%d kpis=%d values=%d risks=%d objectives=%d"
      % (Initiative.search_count([]), Milestone.search_count([]), KPI.search_count([]),
         Value.search_count([]), Risk.search_count([]), Objective.search_count([])))
print("AUDIT issues found: %d" % len(issues))
for i in issues[:30]:
    print("AUDIT   - " + i)
