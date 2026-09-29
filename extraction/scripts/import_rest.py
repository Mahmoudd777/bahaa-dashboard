# -*- coding: utf-8 -*-
"""Load the data sets the coverage sweep turned up last.

Strategic risks, the alignment record with government bodies, the committees,
the agricultural and tourism headline targets, and the existing investment
portfolio.
"""
import csv
import datetime
import re


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        first = fh.readline()
        fh.seek(0)
        delim = "\t" if first.count("\t") > first.count(",") else ","
        return list(csv.DictReader(fh, delimiter=delim))


StratRisk = env["albaha.strategic.risk"].sudo()
Committee = env["albaha.committee"].sudo()
Decision = env["albaha.decision"].sudo()
SectorKpi = env["albaha.sector.kpi"].sudo()
Portfolio = env["albaha.portfolio"].sudo()
Pillar = env["albaha.pillar"].sudo()

# ------------------------------------------------------- strategic risks
# No likelihood or impact is given for these — they are named at pillar level
# as things that could derail the strategy, not scored. Left at zero rather
# than assigned a number nobody wrote.
n = 0
for row in rows_of("/tmp/13_strategic_risks.csv"):
    name = (row["risk"] or "").strip()
    if not name:
        continue
    pillar = Pillar.search([("name", "=", (row.get("pillar") or "").strip())], limit=1)
    vals = {"name": name[:250], "code": "SR-%02d" % int(row.get("number") or n + 1)}
    rec = StratRisk.search([("name", "=", name[:250])], limit=1)
    (rec.write(vals) if rec else StratRisk.create(vals))
    n += 1
print("REST strategic risks: %d" % n)

# ------------------------------------------------------------ committees
n = 0
for row in rows_of("/tmp/15_committees.csv"):
    name = (row["name"] or "").strip()
    if not name:
        continue
    vals = {"name": name[:200], "code": "COM-%02d" % int(row.get("number") or n + 1),
            "scope": row.get("remit") or False, "status": "active"}
    rec = Committee.search([("name", "=", name[:200])], limit=1)
    (rec.write(vals) if rec else Committee.create(vals))
    n += 1
print("REST committees: %d" % n)

# ----------------------------------------- alignment with government bodies
# Dates read "الخميس الموافق ل 10 سبتمبر 2026"; only the day, month and year
# are taken, and a row whose date cannot be read keeps its text in the body.
MONTHS = {"يناير": 1, "فبراير": 2, "مارس": 3, "أبريل": 4, "إبريل": 4, "مايو": 5, "يونيو": 6,
          "يوليو": 7, "أغسطس": 8, "سبتمبر": 9, "أكتوبر": 10, "نوفمبر": 11, "ديسمبر": 12}


def arabic_date(s):
    m = re.search(r"(\d{1,2})\s+(\S+)\s+(\d{4})", s or "")
    if not m or m.group(2) not in MONTHS:
        return None
    return datetime.date(int(m.group(3)), MONTHS[m.group(2)], int(m.group(1)))


n = 0
for row in rows_of("/tmp/14_alignment.csv"):
    entity = (row.get("entity") or "").strip()
    if not entity:
        continue
    title = "مواءمة مع %s" % entity
    vals = {
        "name": title[:200],
        "code": "ALN-%02d" % (n + 1),
        "description": "%s\n%s" % (row.get("result") or "", row.get("date") or ""),
        "impact_scope": entity[:200],
        # The alignment meetings are recorded as agreed outcomes, so they are done.
        "status": "done" if row.get("result") else "open",
    }
    d = arabic_date(row.get("date"))
    if d:
        vals["decision_date"] = d
    rec = Decision.search([("name", "=", title[:200])], limit=1)
    (rec.write(vals) if rec else Decision.create(vals))
    n += 1
print("REST alignment decisions: %d" % n)

# --------------------------------- agriculture and tourism headline targets
n = 0
for row in rows_of("/tmp/17_agriculture_production.csv"):
    name = (row["product"] or "").strip()
    if not name:
        continue
    vals = {"name": name[:120], "domain": "agriculture", "period": "2030",
            "indicator": ("كمية إنتاج %s" % name)[:200],
            "value": float(row["baseline_2024"] or 0), "target": float(row["target_2030"] or 0),
            "unit": row.get("unit") or "طن"}
    rec = SectorKpi.search([("indicator", "=", vals["indicator"]), ("period", "=", "2030")], limit=1)
    (rec.write(vals) if rec else SectorKpi.create(vals))
    n += 1
for row in rows_of("/tmp/18_tourism_targets.csv"):
    name = (row["measure"] or "").strip()
    if not name:
        continue
    vals = {"name": name[:120], "domain": "tourism", "period": "2030", "indicator": name[:200],
            "value": float(row["baseline_2025"] or 0), "target": float(row["target_2030"] or 0),
            "unit": row.get("unit") or ""}
    rec = SectorKpi.search([("indicator", "=", name[:200]), ("period", "=", "2030")], limit=1)
    (rec.write(vals) if rec else SectorKpi.create(vals))
    n += 1
print("REST sector indicators: %d" % n)

# ------------------------------------- existing investment portfolio, by stage
# The deck lists these per sector and then totals them, so the repeated rows
# are summed per stage here rather than stored one row per appearance.
stages = {}
for row in rows_of("/tmp/19_investment_pipeline.csv"):
    stage = (row["stage"] or "").strip()
    if not stage or stage == "قيمة المشاريع":
        continue
    v, c = stages.get(stage, (0.0, 0))
    stages[stage] = (v + float(row["value_sar"] or 0), c + int(float(row["projects"] or 0)))

for stage, (value, count) in stages.items():
    name = "المحفظة الاستثمارية القائمة — %s" % stage
    vals = {"name": name[:200], "code": "INV-%s" % stage[:12],
            "portfolio_type": "استثماري قائم", "total_budget_sar_m": value / 1000000.0,
            "status": "active"}
    rec = Portfolio.search([("name", "=", name[:200])], limit=1)
    (rec.write(vals) if rec else Portfolio.create(vals))
    print("REST   %-22s %8.1f m  %2d projects" % (stage, value / 1e6, count))

env.cr.commit()
print("REST portfolio stages: %d" % len(stages))
print("REST totals: strategic_risks=%d committees=%d decisions=%d sector_kpis=%d portfolios=%d"
      % (StratRisk.search_count([]), Committee.search_count([]), Decision.search_count([]),
         SectorKpi.search_count([]), Portfolio.search_count([])))
