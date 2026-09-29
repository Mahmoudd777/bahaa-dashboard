# -*- coding: utf-8 -*-
"""Load the client's strategy data (extracted from their decks) into Odoo.

Idempotent: every record is matched on its code, so running this twice
updates rather than duplicates. Nothing here invents a value — a figure the
decks leave blank is left blank in the database too.
"""
import json
import datetime

BUNDLE = "/tmp/bundle.json"
with open(BUNDLE, encoding="utf-8") as fh:
    data = json.load(fh)

Pillar = env["albaha.pillar"].sudo()
Program = env["albaha.program"].sudo()
Objective = env["albaha.objective"].sudo()
KPI = env["albaha.kpi"].sudo()
KPIValue = env["albaha.kpi.value"].sudo()
Initiative = env["albaha.initiative"].sudo()
Milestone = env["albaha.milestone"].sudo()

log = []


def upsert(model, domain, values):
    rec = model.search(domain, limit=1)
    if rec:
        rec.write(values)
        return rec, False
    return model.create(values), True


# ---------------------------------------------------------------- pillars
pillars = {}
for p in data["pillars"]:
    rec, _ = upsert(Pillar, [("name", "=", p["name"])],
                    {"name": p["name"], "code": p["code"],
                     "description": p.get("description") or False})
    pillars[p["name"]] = rec
log.append("pillars: %d" % len(pillars))

# --------------------------------------------------------------- programs
programs = {}
for p in data["programs"]:
    vals = {"name": p["name"], "code": p["code"]}
    pillar = pillars.get(p["name"])
    if pillar:
        vals["pillar_id"] = pillar.id
    rec, _ = upsert(Program, [("code", "=", p["code"])], vals)
    programs[p["code"]] = rec
log.append("programs: %d" % len(programs))

# ------------------------------------------------------------- objectives
objectives = {}
for o in data["objectives"]:
    rec, _ = upsert(Objective, [("name", "=", o["name"])],
                    {"name": o["name"], "code": o["code"],
                     "description": o.get("description") or False})
    objectives[o["name"]] = rec
top_level = len(objectives)

# The strategic house also names objectives one level down ("تنمية الطلب
# السياحي..."), which is what the indicators are actually attached to. They
# only appear in that mapping, so they are created from it.
seq = 0
for row in data.get("objective_kpis", []):
    name = (row.get("objective") or "").strip()
    if not name or name in objectives:
        continue
    seq += 1
    rec, _ = upsert(Objective, [("name", "=", name)],
                    {"name": name, "code": "OBJ-S%02d" % seq})
    objectives[name] = rec
log.append("objectives: %d (top level: %d, sub: %d)"
           % (len(objectives), top_level, len(objectives) - top_level))


def find_objective(name):
    """Objectives are referenced by name, and the decks do not always spell
    them identically — match on a leading chunk before giving up."""
    if not name:
        return None
    if name in objectives:
        return objectives[name]
    head = name.strip()[:25]
    for key, rec in objectives.items():
        if key.startswith(head) or head in key:
            return rec
    return None


# -------------------------------------------------------------------- KPIs
kpis = {}
for k in data["kpis"]:
    vals = {
        "name": k["name"],
        "code": k["code"],
        "description": k.get("description") or False,
        "formula": k.get("formula") or False,
        "unit": k.get("unit") or False,
        "data_source": k.get("data_source") or False,
        "direction": k.get("direction") or "up",
        "frequency": k.get("frequency") or "annual",
        "cumulative_in_year": k.get("cumulative_in_year") or False,
        "cumulative_annual": k.get("cumulative_annual") or False,
    }
    if k.get("baseline_value") is not None:
        vals["baseline_value"] = k["baseline_value"]
    if k.get("baseline_year") is not None:
        vals["baseline_year"] = int(k["baseline_year"])
    obj = find_objective(k.get("objective"))
    if obj:
        vals["objective_id"] = obj.id
    rec, _ = upsert(KPI, [("code", "=", k["code"])], vals)
    kpis[k["name"]] = rec
log.append("kpis: %d (linked to an objective: %d)"
           % (len(kpis), sum(1 for r in kpis.values() if r.objective_id)))

# link objectives to KPIs from the strategic-house mapping
linked = 0
for row in data.get("objective_kpis", []):
    kpi = kpis.get(row.get("kpi"))
    if not kpi:
        head = (row.get("kpi") or "")[:25]
        kpi = next((r for n, r in kpis.items() if head and n.startswith(head)), None)
    obj = find_objective(row.get("objective"))
    if kpi and obj and not kpi.objective_id:
        kpi.objective_id = obj.id
        linked += 1
log.append("kpis linked via the strategic house: %d" % linked)

# --------------------------------------------------------- KPI targets
# One row per (KPI, period). The decks carry targets only — no actuals have
# been reported yet — so actual_value stays 0 and the row is marked grey
# rather than pretending a zero was measured.
made = 0
for t in data["kpi_targets"]:
    kpi = kpis.get(t["kpi"])
    if not kpi:
        continue
    period = t["period"]
    period_type = "quarter" if "-Q" in period else "year"
    vals = {
        "kpi_id": kpi.id,
        "period": period,
        "period_type": period_type,
        "actual_value": 0.0,
        "target_value": t["target"],
        "rag_status": "grey",
    }
    upsert(KPIValue, [("kpi_id", "=", kpi.id), ("period", "=", period)], vals)
    made += 1
log.append("kpi target rows: %d" % made)

# ------------------------------------------------------------ initiatives


def as_date(s):
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.datetime.strptime(s.strip(), fmt).date()
        except Exception:
            pass
    return None


initiatives = {}
for i in data["initiatives"]:
    prog = programs.get(i["code"].split(".")[0])
    if not prog:
        continue
    vals = {
        "name": i.get("name") or i["code"],
        "code": i["code"],
        "program_id": prog.id,
        "description": i.get("description") or False,
        "funder": i.get("funder") or False,
        "economy_color": i.get("economy_color") or False,
        "problem_statement": i.get("problem") or False,
        "expected_impact": i.get("impact") or False,
        "outputs": i.get("outputs") or False,
        "operational_kpis": i.get("operational_kpis") or False,
        "stakeholders": i.get("stakeholders") or False,
    }
    pillar = pillars.get(i.get("pillar"))
    if pillar:
        vals["pillar_id"] = pillar.id
    obj = find_objective(i.get("objective"))
    if obj:
        vals["objective_id"] = obj.id
    start, end = as_date(i.get("start_date") or ""), as_date(i.get("end_date") or "")
    if start:
        vals["start_date"] = start
    if end:
        vals["end_date"] = end
    for src, dst in (("budget_total", "budget_total_sar_m"),
                     ("budget_capital", "budget_capital_sar_m"),
                     ("budget_operational", "budget_operational_sar_m")):
        if i.get(src) is not None:
            # Budgets arrive in riyals; the model stores millions.
            vals[dst] = i[src] / 1000000.0
    rec, _ = upsert(Initiative, [("code", "=", i["code"])], vals)
    initiatives[i["code"]] = rec
log.append("initiatives: %d" % len(initiatives))

# -------------------------------------------------------------- milestones
# Dates are written as a position in the plan ("Q2 السنة الثانية"), so they
# are resolved against the initiative's own start date. The label is kept
# alongside, so it stays visible that the date was derived and not given.
QUARTER = {"Q1": 0, "Q2": 3, "Q3": 6, "Q4": 9}
YEAR_WORD = {"الأولى": 0, "الثانية": 1, "الثالثة": 2, "الرابعة": 3, "الخامسة": 4}


def resolve(label, start):
    if not label or not start:
        return None
    q = None
    for key, months in QUARTER.items():
        if label.replace(" ", "").startswith(key):
            q = months
            break
    year_offset = next((v for w, v in YEAR_WORD.items() if w in label), None)
    if q is None or year_offset is None:
        return None
    month = start.month + q + year_offset * 12
    year = start.year + (month - 1) // 12
    return datetime.date(year, (month - 1) % 12 + 1, 1)


ms_made, ms_dated = 0, 0
for m in data["milestones"]:
    init = initiatives.get(m["initiative"])
    if not init:
        continue
    vals = {
        "name": m["name"][:200],
        "initiative_id": init.id,
        "planned_start_label": m.get("start_label") or False,
        "planned_end_label": m.get("end_label") or False,
        "budget_capital_sar": m.get("capital") or 0.0,
        "budget_operational_sar": m.get("operational") or 0.0,
    }
    planned = resolve(m.get("end_label"), init.start_date)
    if planned:
        vals["planned_date"] = planned
        ms_dated += 1
    upsert(Milestone, [("initiative_id", "=", init.id), ("name", "=", m["name"][:200])], vals)
    ms_made += 1
log.append("milestones: %d (dates resolved: %d)" % (ms_made, ms_dated))

env.cr.commit()
for line in log:
    print("IMPORT " + line)
