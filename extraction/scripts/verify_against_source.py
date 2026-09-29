# -*- coding: utf-8 -*-
"""Compare what is in the database against the bundle extracted from the decks.

Reports per record, not per table: a count that matches proves nothing if the
values behind it are wrong.
"""
import json

with open("/tmp/bundle.json", encoding="utf-8") as fh:
    src = json.load(fh)

KPI = env["albaha.kpi"].sudo()
KPIValue = env["albaha.kpi.value"].sudo()
Initiative = env["albaha.initiative"].sudo()
Milestone = env["albaha.milestone"].sudo()

problems = []
checked = 0


def near(a, b):
    if a is None and b in (None, 0, 0.0):
        return True
    if a is None or b is None:
        return False
    return abs(float(a) - float(b)) < 0.01


# ------------------------------------------------------------------ KPIs
for k in src["kpis"]:
    rec = KPI.search([("code", "=", k["code"])], limit=1)
    if not rec:
        problems.append("KPI %s missing entirely" % k["code"])
        continue
    checked += 1
    if rec.name.strip() != k["name"].strip():
        problems.append("KPI %s name differs\n     db : %s\n     src: %s"
                        % (k["code"], rec.name[:60], k["name"][:60]))
    if k.get("baseline_value") is not None and not near(k["baseline_value"], rec.baseline_value):
        problems.append("KPI %s baseline db=%s src=%s"
                        % (k["code"], rec.baseline_value, k["baseline_value"]))
    if k.get("direction") and rec.direction != k["direction"]:
        problems.append("KPI %s direction db=%s src=%s" % (k["code"], rec.direction, k["direction"]))
    if k.get("unit") and (rec.unit or "").strip() != k["unit"].strip():
        problems.append("KPI %s unit db=%s src=%s" % (k["code"], rec.unit, k["unit"]))
    if k.get("data_source") and not rec.data_source:
        problems.append("KPI %s data_source empty in db" % k["code"])

# --------------------------------------------------------- KPI targets
by_kpi = {}
for t in src["kpi_targets"]:
    by_kpi.setdefault(t["kpi"], {})[t["period"]] = t["target"]

tgt_checked, tgt_bad = 0, 0
for name, periods in by_kpi.items():
    rec = KPI.search([("name", "=", name)], limit=1)
    if not rec:
        problems.append("targets: no KPI named %s" % name[:40])
        continue
    for period, value in periods.items():
        v = KPIValue.search([("kpi_id", "=", rec.id), ("period", "=", period)], limit=1)
        tgt_checked += 1
        if not v:
            tgt_bad += 1
            problems.append("target missing: %s %s" % (name[:30], period))
        elif not near(value, v.target_value):
            tgt_bad += 1
            problems.append("target differs: %s %s db=%s src=%s"
                            % (name[:30], period, v.target_value, value))

# ----------------------------------------------------------- initiatives
for i in src["initiatives"]:
    rec = Initiative.search([("code", "=", i["code"])], limit=1)
    if not rec:
        problems.append("initiative %s missing" % i["code"])
        continue
    checked += 1
    if i.get("start_date"):
        want = i["start_date"]
        got = rec.start_date.strftime("%d/%m/%Y") if rec.start_date else None
        if got != want:
            problems.append("initiative %s start db=%s src=%s" % (i["code"], got, want))
    if i.get("budget_total") is not None:
        if not near(i["budget_total"] / 1000000.0, rec.budget_total_sar_m):
            problems.append("initiative %s budget db=%s m src=%s"
                            % (i["code"], rec.budget_total_sar_m, i["budget_total"]))
    if i.get("funder") and not rec.funder:
        problems.append("initiative %s funder empty in db" % i["code"])

# ------------------------------------------------------------ milestones
ms_src = len(src["milestones"])
ms_db = Milestone.search_count([("initiative_id", "!=", False)])
if ms_src != ms_db:
    problems.append("milestones: src=%d db=%d" % (ms_src, ms_db))

print("VERIFY records compared: %d" % checked)
print("VERIFY target values compared: %d (mismatched: %d)" % (tgt_checked, tgt_bad))
print("VERIFY milestones: src=%d db=%d" % (ms_src, ms_db))
print("VERIFY problems found: %d" % len(problems))
for p in problems[:25]:
    print("VERIFY   - " + p)
