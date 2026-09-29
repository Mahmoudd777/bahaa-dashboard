# -*- coding: utf-8 -*-
"""Fill indicator gaps from the ambitions table.

The KPI cards and the ambitions table in the detailed document describe the
same indicators. Where a card leaves a baseline or a yearly target blank and
the ambitions table states one, the stated value is taken. Nothing is
overwritten — only blanks are filled — so the cards stay the primary source.
"""
import csv
import re

KPI = env["albaha.kpi"].sudo()
Value = env["albaha.kpi.value"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def bare(s):
    s = re.sub(r"\(.*?\)", " ", s or "")
    return re.sub(r"[%\s\d\-–—_]", "", s)


def num(s):
    if not s:
        return None
    t = str(s).replace(",", "").replace("٬", "")
    t = re.sub(r"\(.*?\)", "", t).replace("%", "").replace(">", "").replace("<", "").strip()
    m = re.search(r"-?\d+(\.\d+)?", t)
    return float(m.group(0)) if m else None


def year_of(s):
    m = re.search(r"\b(19|20)\d{2}\b", str(s or ""))
    return int(m.group(0)) if m else None


kpis = KPI.search([])
index = {bare(k.name): k for k in kpis}

filled_baseline = filled_year = filled_targets = 0
report = []

for row in rows_of("/tmp/16_targets_crosscheck.csv"):
    key = bare(row.get("kpi"))
    rec = index.get(key)
    if not rec:
        rec = next((k for b, k in index.items() if key and b[:16] and b[:16] == key[:16]), None)
    if not rec:
        report.append("no match: %s" % (row.get("kpi") or "")[:46])
        continue

    base, byear = num(row.get("baseline")), year_of(row.get("baseline"))
    if base is not None and not rec.baseline_value:
        rec.baseline_value = base
        filled_baseline += 1
        report.append("%s baseline <- %s" % (rec.code, base))
    if byear and not rec.baseline_year:
        rec.baseline_year = byear
        filled_year += 1

    for year in ("2026", "2027", "2028", "2029", "2030"):
        target = num(row.get("y" + year))
        if target is None:
            continue
        existing = Value.search([("kpi_id", "=", rec.id), ("period", "=", year)], limit=1)
        if existing:
            continue
        # A quarterly indicator already carries its four periods per year; an
        # annual row on top of those would double-count the year.
        if Value.search_count([("kpi_id", "=", rec.id), ("period", "like", year + "-Q")]):
            continue
        Value.create({
            "kpi_id": rec.id, "period": year, "period_type": "year",
            "actual_value": 0.0, "target_value": target, "rag_status": "grey",
        })
        filled_targets += 1
        report.append("%s %s target <- %s" % (rec.code, year, target))

env.cr.commit()
print("GAP baselines filled: %d, baseline years filled: %d, targets added: %d"
      % (filled_baseline, filled_year, filled_targets))
for line in report[:25]:
    print("GAP   " + line)
print("GAP kpi values now: %d" % Value.search_count([]))
print("GAP kpis still without a baseline: %d" % KPI.search_count([("baseline_value", "=", 0)]))
