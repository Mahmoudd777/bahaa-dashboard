"""Data providers: compute each widget from the albaha_* models at runtime, for
the active date filter (context 'dash_filter': {mode,date,quarter,month}). Mode
'all' uses the stored computed roll-ups (fast path = today's behavior); the other
modes (uptodate / period / quarter) recompute every value for the chosen period
from the period-based fact tables (kpi.value, initiative.progress, budget, ...).
The seed `config` is used ONLY for presentation; there is no demo fallback.
"""
import datetime
from collections import defaultdict

from . import dashboard_filter as DF
from .dashboard_helpers import (
    rag_color, rag_level, fmt_num, QUALITY_AR, QUALITY_LEVEL,
    trend_delta, trend_delta_from_series,
)

rag_of = rag_level


def _flt(env):
    return env.context.get("dash_filter") or {
        "mode": "all", "date": datetime.date.today(), "quarter": "", "month": ""}


def _recs(env, model, domain=None, order=None, limit=None):
    if model not in env.registry.models:
        return env["dashboard.component"].browse()
    return env[model].search(domain or [], order=order, limit=limit)


def _frecs(env, model, period_field, kind, base_domain=None, order=None, limit=None):
    """Search with the active date-filter applied to `period_field` (kind q/m/date)."""
    dom = list(base_domain or []) + DF.domain(_flt(env), period_field, kind)
    return _recs(env, model, domain=dom, order=order, limit=limit)


def _sel_label(rec, field):
    return dict(rec._fields[field].selection).get(rec[field], "") if rec else ""


def _arg(comp):
    return comp.source.partition(":")[2]


def _record(model, rec):
    """Metadata for opening a single record in the detail modal."""
    return {"model": model, "id": rec.id}


def _aggregate(key, title, **params):
    """Metadata for opening a server-side aggregate line wizard."""
    data = {"key": key, "title": title}
    if params:
        data["params"] = params
    return data


# ---- period-aware value helpers ---------------------------------------------
def _series_pick(records, period_field, flt):
    """The value of a 'YYYY-Qn' series for the active filter (latest in range)."""
    vals = sorted(records, key=lambda r: r[period_field] or "")
    if not vals:
        return None
    m = flt["mode"]
    if m == "all":
        return vals[-1]
    if m == "uptodate":
        q = DF.quarter_of_date(flt["date"])
        cand = [v for v in vals if (v[period_field] or "") <= q]
        return cand[-1] if cand else None
    if m == "period":
        qf, qt = DF.quarter_of_date(flt["from"]), DF.quarter_of_date(flt["to"])
        cand = [v for v in vals if qf <= (v[period_field] or "") <= qt]
        return cand[-1] if cand else None
    cand = [v for v in vals if (v[period_field] or "") == flt["quarter"]]   # quarter
    return cand[-1] if cand else None


def kpi_at(kpi, flt):
    """(value, target, achievement_pct, rag) of a KPI for the active filter.

    Achievement always comes from `kpi.achievement_of()` so the direction
    ('lower is better') is honoured, and the RAG is banded from that same
    number rather than the hand-entered rag_status — a stored colour that
    contradicts the percentage beside it is what this replaces.
    """
    if flt["mode"] == "all":
        return (kpi.latest_value, kpi.target_value, kpi.achievement_pct, kpi.rag)
    v = _series_pick(kpi.value_ids, "period", flt)
    if not v:
        return (0.0, kpi.target_value or 0.0, 0.0, "grey")
    # The PERIOD's own target wins over the KPI's overall one. `target_value`
    # on the KPI is the end-of-strategy figure (2030), so preferring it scored
    # a Q2-2026 actual against a 2030 goal and made every in-flight indicator
    # look like it was failing. Compare like with like; fall back to the
    # overall target only when a period carries none.
    tgt = v.target_value or kpi.target_value or 0.0
    ach = kpi.achievement_of(v.actual_value, tgt)
    return (v.actual_value or 0.0, tgt, ach, rag_level(ach))


def initiative_at(init, flt):
    if flt["mode"] == "all":
        return (init.progress_pct or 0.0, init.rag_status or rag_level(init.progress_pct))
    p = _series_pick(init.progress_ids, "period", flt)
    if p:
        return (p.progress_pct or 0.0, p.rag_status or rag_level(p.progress_pct))
    return (0.0, "grey")


def objective_at(obj, flt):
    if flt["mode"] == "all":
        return (obj.progress_pct or 0.0, obj.rag)
    achs = [kpi_at(k, flt)[2] for k in obj.kpi_ids]
    pct = round(sum(achs) / len(achs), 1) if achs else 0.0
    return (pct, rag_of(pct))


def _agg_at(env, model, link_field, rec_id, flt):
    inits = _recs(env, model, domain=[(link_field, "=", rec_id)])
    ps = [initiative_at(i, flt)[0] for i in inits]
    pct = round(sum(ps) / len(ps), 1) if ps else 0.0
    return (pct, rag_of(pct))


def pillar_at(env, pillar, flt):
    if flt["mode"] == "all":
        return (pillar.progress_pct or 0.0, pillar.rag)
    return _agg_at(env, "albaha.initiative", "pillar_id", pillar.id, flt)


def program_at(env, prog, flt):
    if flt["mode"] == "all":
        return (prog.progress_pct or 0.0, prog.rag)
    return _agg_at(env, "albaha.initiative", "program_id", prog.id, flt)


# ---- gauges / bars -----------------------------------------------------------
def objectives_gauges(comp, cfg, env):
    flt = _flt(env)
    items = []
    for o in _recs(env, "albaha.objective", order="id"):
        pct, rag = objective_at(o, flt)
        items.append({"label": o.name, "value": int(round(pct)),
                      "color": rag_color(rag), "trend": "up", "delta": "",
                      "record": _record("albaha.objective", o)})
    cfg["items"] = items
    return cfg


def pillars_bar(comp, cfg, env):
    flt = _flt(env)
    items = []
    for p in _recs(env, "albaha.pillar", order="sequence, id"):
        pct, rag = pillar_at(env, p, flt)
        items.append({"label": p.name, "value": int(round(pct)), "color": rag_color(rag),
                      "record": _record("albaha.pillar", p)})
    cfg["items"] = items
    cfg.setdefault("max", 100)
    return cfg


def programs_planned(comp, cfg, env):
    flt = _flt(env)
    items = []
    for p in _recs(env, "albaha.program", order="id"):
        pct, rag = program_at(env, p, flt)
        items.append({"label": p.name, "value": int(round(pct)),
                      "budget": "%s/%s" % (fmt_num(p.total_budget_sar_m), fmt_num(p.total_budget_sar_m)),
                      "color": rag_color(rag),
                      "record": _record("albaha.program", p)})
    cfg["items"] = items
    return cfg


def goals_list(comp, cfg, env):
    flt = _flt(env)
    items = []
    for o in _recs(env, "albaha.objective", order="id", limit=4):
        pct, rag = objective_at(o, flt)
        items.append({"label": o.name, "value": int(round(pct)),
                      "color": rag_color(rag), "trend": "up", "delta": "",
                      "record": _record("albaha.objective", o)})
    cfg["items"] = items
    return cfg


# ---- KPI widgets -------------------------------------------------------------
def kpi_grid(comp, cfg, env):
    flt = _flt(env)
    items = []
    for k in _recs(env, "albaha.kpi", order="id"):
        val, tgt, ach, lvl = kpi_at(k, flt)
        items.append({
            "label": k.name, "value": fmt_num(val), "target": fmt_num(tgt),
            "pct": int(round(ach)), "quality": QUALITY_AR.get(lvl, ""),
            "quality_level": QUALITY_LEVEL.get(lvl, "none"), "color": rag_color(lvl),
            "record": _record("albaha.kpi", k),
        })
    cfg["items"] = items
    return cfg


def kpi_table(comp, cfg, env):
    flt = _flt(env)
    rows = []
    for k in _recs(env, "albaha.kpi", order="id"):
        val, tgt, ach, lvl = kpi_at(k, flt)
        rows.append({"cells": [
            {"type": "badge", "label": QUALITY_AR.get(lvl, ""), "level": QUALITY_LEVEL.get(lvl, "none")},
            k.name, fmt_num(val), fmt_num(tgt),
            {"type": "progress", "value": int(round(ach)), "color": rag_color(lvl)},
            {"type": "tag", "label": k.code or ""},
        ], "status": "ok", "record": {"model": "albaha.kpi", "id": k.id}})
    cfg["rows"] = rows
    return cfg


def kpi_forecast_bar(comp, cfg, env):
    flt = _flt(env)
    items = []
    for k in _recs(env, "albaha.kpi", order="id"):
        _, _, ach, lvl = kpi_at(k, flt)
        items.append({"label": k.name, "value": int(round(ach)), "color": rag_color(lvl),
                      "record": _record("albaha.kpi", k)})
    cfg["items"] = items
    cfg.setdefault("max", 100)
    return cfg


def regional_semi(comp, cfg, env):
    items = []
    for r in _recs(env, "albaha.regional.indicator", order="id"):
        pct = int(round((r.value / r.target * 100) if r.target else 0))
        items.append({
            "label": r.name, "value": fmt_num(r.value), "unit": r.unit or "",
            "min": fmt_num(r.baseline), "max": fmt_num(r.target),
            "pct": min(max(pct, 0), 100), "color": rag_color(pct),
            "trend": r.trend if r.trend in ("up", "down") else "up", "delta": "",
            "record": _record("albaha.regional.indicator", r),
        })
    cfg["items"] = items
    return cfg


# ---- tables / cards ----------------------------------------------------------
def initiatives_table(comp, cfg, env):
    flt = _flt(env)
    rows = []
    for i in _recs(env, "albaha.initiative", order="id"):
        pct, lvl = initiative_at(i, flt)
        rows.append({"cells": [
            i.name,
            {"type": "tag", "label": i.program_id.name or ""},
            {"type": "progress", "value": int(round(pct)), "color": rag_color(lvl)},
            "%s/%s" % (fmt_num(i.budget_consumed_sar_m), fmt_num(i.budget_total_sar_m)),
            i.owner_id.name or "",
        ], "status": "ok", "record": _record("albaha.initiative", i)})
    cfg["rows"] = rows
    return cfg


def risks_table(comp, cfg, env):
    rows = []
    for r in _frecs(env, "albaha.strategic.risk", "identified_date", "date", order="risk_score desc"):
        lvl = r.rag_status or "amber"
        rows.append({"cells": [
            {"type": "tag", "label": _sel_label(r, "risk_category")},
            r.name, r.owner_id.name or "",
            {"type": "badge", "label": str(r.likelihood or ""), "level": "high" if (r.likelihood or 0) >= 4 else "mid"},
            {"type": "badge", "label": str(r.impact or ""), "level": "high" if (r.impact or 0) >= 4 else "mid"},
            {"type": "badge", "label": str(r.risk_score or ""), "level": lvl if lvl in ("high", "mid", "low") else "mid"},
            r.mitigation_action or "",
        ], "status": "ok", "record": _record("albaha.strategic.risk", r)})
    cfg["rows"] = rows
    return cfg


_SEV_AR = {"red": "عالية الخطورة", "amber": "متوسطة الخطورة", "green": "منخفضة الخطورة", "grey": ""}
_SEV_LVL = {"red": "high", "amber": "mid", "green": "low", "grey": "low"}


def risks_cards(comp, cfg, env):
    items = []
    for r in _frecs(env, "albaha.strategic.risk", "identified_date", "date",
                    order="risk_score desc", limit=cfg.get("count") or 5):
        lvl = r.rag_status or "amber"
        items.append({
            "severity": _SEV_AR.get(lvl, ""), "level": _SEV_LVL.get(lvl, "mid"),
            "tag": _sel_label(r, "risk_category"),
            "date": str(r.identified_date or ""), "text": r.name,
            "decision": ("القرار/الدعم المطلوب: " + r.mitigation_action) if r.mitigation_action else "",
            "record": _record("albaha.strategic.risk", r),
        })
    cfg["items"] = items
    return cfg


def decisions_cards(comp, cfg, env):
    lvl_map = {"critical": "high", "high": "high", "medium": "mid", "low": "low"}
    items = []
    for d in _frecs(env, "albaha.decision", "decision_date", "date",
                    order="decision_date desc", limit=cfg.get("count") or 6):
        items.append({
            "severity": _sel_label(d, "priority"), "level": lvl_map.get(d.priority, "mid"),
            "tag": d.code or d.name, "date": str(d.decision_date or ""),
            "text": d.description or d.name, "decision": "",
            "record": _record("albaha.decision", d),
        })
    cfg["items"] = items
    return cfg


def meetings_cards(comp, cfg, env):
    items = []
    for s in _frecs(env, "albaha.steerco", "meeting_date", "date",
                    order="meeting_date desc", limit=cfg.get("count") or 6):
        items.append({
            "severity": "", "level": "mid", "tag": s.committee_name or s.name,
            "date": str(s.meeting_date or ""), "text": s.name, "decision": "",
            "record": _record("albaha.steerco", s),
        })
    cfg["items"] = items
    return cfg


# ---- count / ratio panels ----------------------------------------------------
def path_indicators(comp, cfg, env):
    flt = _flt(env)
    kpis = _recs(env, "albaha.kpi")
    objs = _recs(env, "albaha.objective")
    inits = _recs(env, "albaha.initiative")
    inv = sum(_frecs(env, "albaha.sector.kpi", "period", "q",
                     base_domain=[("domain", "=", "investment")]).mapped("value"))
    kpi_met = sum(1 for k in kpis if kpi_at(k, flt)[3] == "green")
    obj_ok = sum(1 for o in objs if objective_at(o, flt)[1] == "green")
    init_ok = sum(1 for i in inits if initiative_at(i, flt)[1] == "green")
    computed = [
        {"value": fmt_num(inv) or "0", "delta": "", "since": "",
         "aggregate": _aggregate("path_investment_kpis", "مؤشرات الاستثمار")},
        {"value": "%d/%d" % (kpi_met, len(kpis)), "delta": "%d دون المستهدف" % (len(kpis) - kpi_met), "delta_dir": "down", "since": "",
         "aggregate": _aggregate("path_kpis_below_target", "مؤشرات دون المستهدف")},
        {"value": "%d/%d" % (obj_ok, len(objs)), "delta": "%d تحتاج متابعة" % (len(objs) - obj_ok), "delta_dir": "down", "since": "",
         "aggregate": _aggregate("path_objectives_attention", "أهداف تحتاج متابعة")},
        {"value": "%d/%d" % (init_ok, len(inits)), "delta": "%d متأخر" % (len(inits) - init_ok), "delta_dir": "down", "since": "",
         "aggregate": _aggregate("path_initiatives_attention", "مبادرات تحتاج متابعة")},
    ]
    items = cfg.get("items") or []
    for i, c in enumerate(computed):
        if i < len(items):
            items[i].update(c)
    cfg["items"] = items
    return cfg


def _init_status_vals(env, flt):
    inits = _recs(env, "albaha.initiative")
    rags = [initiative_at(i, flt) for i in inits]
    n = len(inits)
    return [
        sum(1 for pct, _ in rags if not pct),          # not started
        sum(1 for _, r in rags if r == "amber"),       # at risk
        sum(1 for _, r in rags if r == "red"),         # delayed
        sum(1 for _, r in rags if r == "green"),       # on track
    ], n


def initiative_status_counts(comp, cfg, env):
    flt = _flt(env)
    vals, n = _init_status_vals(env, flt)
    items = cfg.get("items") or []
    for i, v in enumerate(vals):
        if i < len(items):
            items[i]["value"] = "%d/%d" % (v, n)
            items[i]["aggregate"] = _aggregate(
                ["init_not_started", "init_at_risk", "init_delayed", "init_on_track"][i],
                items[i].get("label") or "حالة المبادرات",
            )
    cfg["items"] = items
    return cfg


def status_count_one(comp, cfg, env):
    flt = _flt(env)
    vals, n = _init_status_vals(env, flt)
    idx = int(_arg(comp) or 0)
    if idx < len(vals):
        cfg["value"] = "%d/%d" % (vals[idx], n)
        cfg["aggregate"] = _aggregate(
            ["init_not_started", "init_at_risk", "init_delayed", "init_on_track"][idx],
            cfg.get("label") or "حالة المبادرات",
        )
    return cfg


def quality_summary(comp, cfg, env):
    flt = _flt(env)
    low = len(_frecs(env, "albaha.kpi.value", "period", "q",
                     base_domain=[("rag_status", "in", ("grey", "red"))]))
    delayed = sum(1 for i in _recs(env, "albaha.initiative") if initiative_at(i, flt)[1] == "red")
    projs = _recs(env, "albaha.project")
    late = len(projs.filtered(lambda p: getattr(p, "health_status", "") == "red"))
    no_owner = len(_recs(env, "albaha.objective").filtered(lambda o: not o.owner_id))
    items = cfg.get("items") or []
    keys = [
        ("quality_low_kpi_values", "نقاط بيانات بجودة منخفضة"),
        ("quality_delayed_initiatives", "مبادرات بتأخير متوقع"),
        ("quality_late_projects", "مشاريع باحصائيات متأخرة"),
        ("quality_no_owner_objectives", "اهداف/مؤشرات بدون مالك"),
    ]
    for i, v in enumerate([low, delayed, late, no_owner]):
        if i < len(items):
            items[i]["value"] = str(v)
            items[i]["aggregate"] = _aggregate(keys[i][0], keys[i][1])
    cfg["items"] = items
    return cfg


def completion_stat(comp, cfg, env):
    flt = _flt(env)
    objs = _recs(env, "albaha.objective")
    pcts = [objective_at(o, flt)[0] for o in objs]
    done = int(round(sum(pcts) / len(pcts))) if pcts else 0
    items = cfg.get("items") or []
    for it in items:
        it["delta"], it["since"] = "", ""
    if items:
        items[0]["value"] = "%d%%" % done
    if len(items) > 1:
        items[1]["value"] = "—"
    cfg["items"] = items
    return cfg


def completion_by_year(comp, cfg, env):
    flt = _flt(env)
    by_year = defaultdict(list)
    for v in _recs(env, "albaha.kpi.value"):
        tgt = v.target_value or (v.kpi_id.target_value if v.kpi_id else 0.0)
        if tgt and v.kpi_id:
            # Via the KPI so a lower-is-better indicator does not drag the
            # yearly average the wrong way (see albaha.kpi.achievement_of).
            by_year[(v.period or "")[:4]].append(v.kpi_id.achievement_of(v.actual_value, tgt))
    items = []
    for year in sorted(by_year):
        if not DF.year_in_filter(flt, year):
            continue
        avg = sum(by_year[year]) / len(by_year[year])
        val = int(round(min(avg, 100)))
        items.append({"label": year, "value": val, "color": rag_color(avg),
                      "bars": [{"value": val, "color": rag_color(avg)}],
                      "aggregate": _aggregate("completion_year", "قيم المؤشرات %s" % year, year=year)})
    cfg["items"] = items
    cfg.setdefault("max", 100)
    return cfg


# ---- single values -----------------------------------------------------------
def budget_split(comp, cfg, env):
    flt = _flt(env)
    recs = _frecs(env, "albaha.budget", "period_year_month", "m")
    approved = sum(recs.mapped("approved_amount")) if recs else 0.0
    spent = sum(recs.mapped("actual_spent")) if recs else 0.0
    pct = int(round(spent / approved * 100)) if approved else 0
    cfg["spent_pct"] = pct
    cfg["spent_label"] = "%d%% (%s)" % (pct, fmt_num(spent))
    cfg["remaining_label"] = "%d%% (%s)" % (100 - pct, fmt_num(approved - spent))
    cfg["aggregate"] = _aggregate("budget_records", "سجلات الموازنة")
    return cfg


def investments_stat(comp, cfg, env):
    flt = _flt(env)
    recs = _frecs(env, "albaha.sector.kpi", "period", "q",
                  base_domain=[("domain", "=", "investment")])
    by_period = defaultdict(float)
    for r in recs:
        by_period[r.period] += (r.value or 0.0)
    periods = sorted(by_period)
    val = by_period[periods[-1]] if periods else 0.0
    cfg["value"] = fmt_num(val) if val else "—"
    if len(periods) >= 2:
        tr, dl = trend_delta(by_period[periods[-1]], by_period[periods[-2]])
        cfg["delta"], cfg["delta_dir"], cfg["since"] = dl, tr, "عن " + periods[-2]
    else:
        cfg["delta"], cfg["since"] = "", ""
    cfg["aggregate"] = _aggregate("path_investment_kpis", "مؤشرات الاستثمار")
    return cfg


def strategy_stat(comp, cfg, env):
    flt = _flt(env)
    objs = _recs(env, "albaha.objective")
    pcts = [objective_at(o, flt)[0] for o in objs]
    cfg["value"] = str(int(round(sum(pcts) / len(pcts)))) if pcts else "—"
    cfg["delta"], cfg["since"] = "", ""
    cfg["aggregate"] = _aggregate("strategy_objectives", "الأهداف الاستراتيجية")
    return cfg


# ---- single-record widgets ---------------------------------------------------
def regional_semi_one(comp, cfg, env):
    recs = _recs(env, "albaha.regional.indicator", order="id")
    idx = int(_arg(comp) or 0)
    if idx < len(recs):
        r = recs[idx]
        pct = int(round((r.value / r.target * 100) if r.target else 0))
        cfg.update({
            "value": fmt_num(r.value), "min": fmt_num(r.baseline), "max": fmt_num(r.target),
            "pct": min(max(pct, 0), 100), "color": rag_color(pct), "delta": "",
            "trend": r.trend if r.trend in ("up", "down") else "up",
            "record": _record("albaha.regional.indicator", r),
        })
    else:
        cfg.update({"value": "—", "pct": 0, "delta": ""})
    return cfg


def objective_one(comp, cfg, env):
    recs = _recs(env, "albaha.objective", order="id")
    idx = int(_arg(comp) or 0)
    if idx < len(recs):
        obj = recs[idx]
        pct, rag = objective_at(obj, _flt(env))
        cfg.update({"value": int(round(pct)), "color": rag_color(rag), "trend": "up", "delta": "",
                    "record": _record("albaha.objective", obj)})
    else:
        cfg.update({"value": 0, "trend": "up", "delta": ""})
    return cfg


def alerts(comp, cfg, env):
    flt = _flt(env)
    groups = []
    no_owner = _recs(env, "albaha.objective").filtered(lambda o: not o.owner_id)
    if no_owner:
        groups.append({"title": "اهداف بدون مالك", "color": "#FF5147", "icon": "fa-user",
                       "items": [{"label": o.name, "value": "لامسؤول",
                                  "record": _record("albaha.objective", o)} for o in no_owner[:5]]})
    red = [i for i in _recs(env, "albaha.initiative") if initiative_at(i, flt)[1] == "red"]
    if red:
        groups.append({"title": "مبادرات في خطر", "color": "#F0974F", "icon": "fa-clock-o",
                       "items": [{"label": i.name, "value": "%d%%" % int(initiative_at(i, flt)[0]),
                                  "record": _record("albaha.initiative", i)} for i in red[:5]]})
    kpis = _recs(env, "albaha.kpi", order="id")
    if kpis:
        groups.append({"title": "توقع تحقيق", "color": "#00AB9D", "icon": "fa-line-chart",
                       "items": [{"label": k.name, "value": "%d%% من الهدف" % int(kpi_at(k, flt)[2]),
                                  "record": _record("albaha.kpi", k)} for k in kpis[:5]]})
    cfg["groups"] = groups
    return cfg


def banner(comp, cfg, env):
    flt = _flt(env)
    if flt["mode"] == "all":
        label = datetime.date.today().isoformat()
    elif flt["mode"] == "uptodate":
        label = "حتى " + flt["date"].isoformat()
    elif flt["mode"] == "period":
        label = "من %s إلى %s" % (flt["from"].isoformat(), flt["to"].isoformat())
    else:
        label = flt["quarter"]
    cfg["last_update"] = "آخر تحديث: " + label
    return cfg


PROVIDERS = {
    "banner": banner,
    "objectives_gauges": objectives_gauges,
    "pillars_bar": pillars_bar,
    "programs_planned": programs_planned,
    "goals_list": goals_list,
    "kpi_forecast_bar": kpi_forecast_bar,
    "kpi_grid": kpi_grid,
    "kpi_table": kpi_table,
    "regional_semi": regional_semi,
    "initiatives_table": initiatives_table,
    "risks_table": risks_table,
    "risks_cards": risks_cards,
    "decisions_cards": decisions_cards,
    "meetings_cards": meetings_cards,
    "path_indicators": path_indicators,
    "initiative_status_counts": initiative_status_counts,
    "status_count_one": status_count_one,
    "quality_summary": quality_summary,
    "completion_stat": completion_stat,
    "completion_by_year": completion_by_year,
    "budget_split": budget_split,
    "investments_stat": investments_stat,
    "strategy_stat": strategy_stat,
    "regional_semi_one": regional_semi_one,
    "objective_one": objective_one,
    "alerts": alerts,
}
