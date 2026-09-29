# -*- coding: utf-8 -*-
"""Load each programme's spend phasing and expected return by year.

These figures exist nowhere in the decks' tables — only inside two charts of
the detailed document and their embedded workbooks. Two independent totals
check the reading: the phased spend adds to the strategy's stated 100 million,
and the fifth-year cumulative returns add to its stated 1,979.6 million.
"""
import csv

Program = env["albaha.program"].sudo()
Plan = env["albaha.program.plan"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def num(value):
    try:
        return float(str(value).strip() or 0)
    except ValueError:
        return 0.0


# The decks name two programmes differently in the charts than on their cards
# ("تعزيز هوية وارث الباحة" against "هوية الباحة وإحياء التراث"). Matching on
# the distinctive word rather than the whole name keeps the two in step.
ALIASES = {
    "برنامج تعزيز هوية وارث الباحة": "التراث",
    "برنامج تحفيز الاستثمارات الذكية": "الاستثمار",
}


def resolve(name, programs):
    program = programs.get(name)
    if program:
        return program
    needle = ALIASES.get(name)
    if not needle:
        return None
    matches = [p for key, p in programs.items() if needle in key]
    return matches[0] if len(matches) == 1 else None


programs = {p.name.strip(): p for p in Program.search([])}
missing, written = set(), 0

for row in rows_of("/tmp/23_program_plan.csv"):
    name = (row["program"] or "").strip()
    program = resolve(name, programs)
    if not program:
        missing.add(name)
        continue
    values = {
        "program_id": program.id,
        "year_no": int(row["year_no"]),
        "year_label": (row["year_label"] or "").strip(),
        "calendar_year": int(row["calendar_year"]),
        "budget_planned_sar_m": num(row["budget_planned_sar_m"]),
        "return_cumulative_sar_m": num(row["return_cumulative_sar_m"]),
    }
    existing = Plan.search(
        [("program_id", "=", program.id), ("year_no", "=", values["year_no"])], limit=1)
    if existing:
        existing.write(values)
    else:
        Plan.create(values)
    written += 1

env.cr.commit()

plans = Plan.search([])
spend = sum(plans.mapped("budget_planned_sar_m"))
returns = sum(p.return_cumulative_sar_m for p in plans if p.year_no == 5)
print("PLAN rows written: %d, rows now: %d" % (written, len(plans)))
print("PLAN programmes not found: %s" % (", ".join(sorted(missing)) or "none"))
print("PLAN phased spend total: %.1f (strategy budget says 100)" % spend)
print("PLAN return by year 5: %.1f (deck says 1979.6)" % returns)
for p in Program.search([]):
    years = p.plan_ids
    print("PLAN   %s: spend %.1f, return %.1f" % (
        p.name, sum(years.mapped("budget_planned_sar_m")),
        max(years.mapped("return_cumulative_sar_m") or [0.0])))
