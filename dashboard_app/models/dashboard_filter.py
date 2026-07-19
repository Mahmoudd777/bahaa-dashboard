"""Date-filter engine for the dashboard. The header sends a filter spec:
    {"mode": "uptodate"|"period"|"quarter"|"all", "date": "YYYY-MM-DD", "quarter": "YYYY-Qn"}
This module normalizes it and turns it into Odoo domains for the three kinds of
time field our models use:
    "q"    -> a Char period like 'YYYY-Qn'  (kpi.value, sector.kpi, initiative.progress)
    "m"    -> a Char period like 'YYYY-MM'  (budget.period_year_month)
    "date" -> a real Date field             (decision_date, identified_date, ...)
Modes: uptodate (<= the date), period (the month of the date), quarter (a whole
Qn of a year), all (no filter).
"""
import datetime


def _to_date(s):
    if isinstance(s, datetime.date):
        return s
    try:
        return datetime.date.fromisoformat((s or "")[:10])
    except Exception:
        return datetime.date.today()


def quarter_of_date(d):
    return "%d-Q%d" % (d.year, (d.month - 1) // 3 + 1)


def month_of_date(d):
    return "%d-%02d" % (d.year, d.month)


def quarter_months(q):
    y, qn = q.split("-Q")
    start = (int(qn) - 1) * 3 + 1
    return ["%d-%02d" % (int(y), start + i) for i in range(3)]


def quarter_bounds(q):
    y, qn = int(q.split("-Q")[0]), int(q.split("-Q")[1])
    start_m = (qn - 1) * 3 + 1
    start = datetime.date(y, start_m, 1)
    end_m = start_m + 2
    end = (datetime.date(y, 12, 31) if end_m == 12
           else datetime.date(y, end_m + 1, 1) - datetime.timedelta(days=1))
    return start, end


def _month_bounds(d):
    start = d.replace(day=1)
    nxt = (start.replace(day=28) + datetime.timedelta(days=4)).replace(day=1)
    return start, nxt - datetime.timedelta(days=1)


def normalize(flt):
    """Frontend spec -> normalized dict. Modes:
        uptodate -> uses 'date'
        period   -> a date range, uses 'from' and 'to'
        quarter  -> uses 'quarter' ('YYYY-Qn')
        all      -> internal default (no UI option) when no filter is sent
    """
    flt = flt or {}
    mode = flt.get("mode") or "all"
    if mode not in ("uptodate", "period", "quarter", "all"):
        mode = "all"
    d = _to_date(flt.get("date"))
    f = _to_date(flt.get("from")) if flt.get("from") else d
    t = _to_date(flt.get("to")) if flt.get("to") else d
    return {
        "mode": mode, "date": d, "from": f, "to": t,
        "quarter": flt.get("quarter") or quarter_of_date(d),
        "month": month_of_date(d),
    }


def domain(flt, field, kind):
    """Odoo domain for `field` (kind 'q'|'m'|'date') under the active mode.
    Empty list for mode 'all' (no filtering)."""
    mode = flt["mode"]
    if mode == "all":
        return []
    if mode == "period":                      # a date range from..to
        f, t = flt["from"], flt["to"]
        if kind == "q":
            return [(field, ">=", quarter_of_date(f)), (field, "<=", quarter_of_date(t))]
        if kind == "m":
            return [(field, ">=", month_of_date(f)), (field, "<=", month_of_date(t))]
        return [(field, ">=", f), (field, "<=", t)]
    if kind == "q":
        if mode == "uptodate":
            return [(field, "<=", quarter_of_date(flt["date"]))]
        return [(field, "=", flt["quarter"])]          # quarter
    if kind == "m":
        if mode == "uptodate":
            return [(field, "<=", flt["month"])]
        return [(field, "in", quarter_months(flt["quarter"]))]   # quarter
    if kind == "date":
        if mode == "uptodate":
            return [(field, "<=", flt["date"])]
        s, e = quarter_bounds(flt["quarter"])           # quarter
        return [(field, ">=", s), (field, "<=", e)]
    return []


def year_in_filter(flt, year):
    """Does a 'YYYY' string fall inside the active filter (for year series)?"""
    m = flt["mode"]
    if m == "all":
        return True
    if m == "uptodate":
        return year <= quarter_of_date(flt["date"])[:4]
    if m == "period":
        return quarter_of_date(flt["from"])[:4] <= year <= quarter_of_date(flt["to"])[:4]
    return year == flt["quarter"][:4]                   # quarter
