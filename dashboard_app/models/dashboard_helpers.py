"""Small shared helpers for the data providers: RAG colors, deltas, number
formatting, period sorting. No Odoo deps — pure functions."""

# RAG -> hex, matching the dashboard's STATUS_COLORS (see dashboard.py).
RAG_HEX = {
    "green": "#00AB9D",
    "amber": "#F0974F",
    "red": "#FF5147",
    "grey": "#9aa0a6",
}
# Arabic quality labels used by the KPI tables, keyed by RAG.
QUALITY_AR = {"green": "عالية", "amber": "متوسطة", "red": "منخفضة", "grey": "لايوجد"}
# Badge "level" for the KPI quality cell (low = good/green badge).
QUALITY_LEVEL = {"green": "low", "amber": "mid", "red": "high", "grey": "none"}


def rag_level(pct):
    """0-100 percentage -> green/amber/red/grey."""
    if not pct:
        return "grey"
    if pct >= 80:
        return "green"
    if pct >= 50:
        return "amber"
    return "red"


def rag_color(level_or_pct):
    """Accepts a RAG string ('green'..) or a numeric pct; returns a hex color."""
    if isinstance(level_or_pct, (int, float)):
        level_or_pct = rag_level(level_or_pct)
    return RAG_HEX.get(level_or_pct or "grey", RAG_HEX["grey"])


def trend_delta(curr, prev):
    """(curr, prev) -> ('up'|'down', '2.5%'). Empty delta when no baseline."""
    if not prev:
        return ("up", "")
    diff = (curr or 0.0) - prev
    direction = "up" if diff >= 0 else "down"
    return (direction, "%.1f%%" % (abs(diff) / abs(prev) * 100.0))


def fmt_num(val):
    """Human number: 1.7M, 2.4B, 1,600."""
    if val is None:
        return ""
    n = float(val)
    for unit, div in (("B", 1e9), ("M", 1e6), ("K", 1e3)):
        if abs(n) >= div:
            return ("%.1f%s" % (n / div, unit)).replace(".0", "")
    if n == int(n):
        return "{:,}".format(int(n))
    return "%.1f" % n


def period_key(p):
    """Sort key for 'YYYY-Qn' / 'YYYY-MM' / 'YYYY' period strings."""
    return (p or "")


def period_year(p):
    """'2025-Q4' / '2025-12' / '2025' -> '2025'."""
    return (p or "")[:4]


def trend_delta_from_series(records, value_field, period_field="period"):
    """Latest two periods of a time series -> ('up'|'down', '2.5%').
    Empty delta when there is no prior period to compare against."""
    vals = sorted(records, key=lambda r: r[period_field] or "")
    if len(vals) < 2:
        return ("up", "")
    return trend_delta(vals[-1][value_field] or 0.0, vals[-2][value_field] or 0.0)


# Keys that carry presentation (kept on an empty widget) vs. data (emptied).
_LIST_VALUE_KEYS = ("items", "rows", "groups")
_SCALAR_BLANK_KEYS = ("spent_label", "remaining_label", "delta", "since")


def strip_values(cfg):
    """Return cfg with all *data* emptied but presentation (titles, columns,
    legend, cols, labels, colors, layout) kept — the no-data / never-demo state."""
    cfg = dict(cfg)
    for k in _LIST_VALUE_KEYS:
        if k in cfg:
            cfg[k] = []
    if "value" in cfg:
        cfg["value"] = "—"
    for k in ("pct", "spent_pct"):
        if k in cfg:
            cfg[k] = 0
    for k in _SCALAR_BLANK_KEYS:
        if k in cfg:
            cfg[k] = ""
    return cfg
