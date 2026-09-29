# -*- coding: utf-8 -*-
"""Load the thirty investment opportunities and their feasibility studies.

They come from the appendix of the detailed document, two slides each. Every
record keeps the slides it was read from, so any figure can be checked against
the page that states it.
"""
import csv

Opportunity = env["albaha.investment.opportunity"].sudo()
Program = env["albaha.program"].sudo()
Initiative = env["albaha.initiative"].sudo()


def rows_of(path):
    with open(path, encoding="utf-8-sig") as fh:
        return list(csv.DictReader(fh))


def num(value):
    text = (value or "").strip()
    if not text:
        return 0.0
    try:
        return float(text)
    except ValueError:
        return 0.0


# The decks shorten two programme names in places, so matching is on the
# distinctive word rather than the whole string.
def find_program(name, programs):
    name = (name or "").strip()
    if not name:
        return None
    if name in programs:
        return programs[name]
    for needle in ("التراث", "الاستثمار", "جودة الحياة", "خيرات", "365"):
        if needle in name:
            matches = [p for key, p in programs.items() if needle in key]
            if len(matches) == 1:
                return matches[0]
    return None


programs = {p.name.strip(): p for p in Program.search([])}
initiatives = {(i.code or "").strip(): i for i in Initiative.search([])}

written, no_program, no_initiative = 0, [], []

for row in rows_of("/tmp/24_investment_opportunities.csv"):
    number = int(row["number"])
    program = find_program(row.get("program"), programs)
    if row.get("program") and not program:
        no_program.append(number)
    code = (row.get("initiative_code") or "").strip()
    initiative = initiatives.get(code)
    if code and not initiative:
        no_initiative.append(code)

    values = {
        "number": number,
        "name": row["name"].strip(),
        "description": (row.get("description") or "").strip() or False,
        "program_id": program.id if program else False,
        "initiative_id": initiative.id if initiative else False,
        "visitors_k": num(row.get("visitors_k")),
        "jobs_direct": int(num(row.get("jobs_direct"))),
        "jobs_indirect": int(num(row.get("jobs_indirect"))),
        "gdp_contribution_sar_m": num(row.get("gdp_contribution_sar_m")),
        "npv_sar_m": num(row.get("npv_sar_m")),
        "irr_pct": num(row.get("irr_pct")),
        "payback_years": num(row.get("payback_years")),
        "revenue_2028_sar_m": num(row.get("revenue_2028")),
        "revenue_2029_sar_m": num(row.get("revenue_2029")),
        "revenue_2030_sar_m": num(row.get("revenue_2030")),
        "revenue_2031_sar_m": num(row.get("revenue_2031")),
        "revenue_2032_sar_m": num(row.get("revenue_2032")),
        "source_reference": (row.get("source_reference") or "").strip() or False,
    }
    existing = Opportunity.search([("number", "=", number)], limit=1)
    if existing:
        existing.write(values)
    else:
        Opportunity.create(values)
    written += 1

env.cr.commit()

all_of = Opportunity.search([])
print("OPP written: %d, rows now: %d" % (written, len(all_of)))
print("OPP unmatched programmes: %s" % (no_program or "none"))
print("OPP unmatched initiative codes: %s" % (sorted(set(no_initiative)) or "none"))
print("OPP linked to a programme: %d, to an initiative: %d" % (
    len(all_of.filtered("program_id")), len(all_of.filtered("initiative_id"))))
print("OPP direct jobs %d, indirect %d, NPV %.1f m, GDP %.1f m" % (
    sum(all_of.mapped("jobs_direct")), sum(all_of.mapped("jobs_indirect")),
    sum(all_of.mapped("npv_sar_m")), sum(all_of.mapped("gdp_contribution_sar_m"))))
print("OPP without an IRR: %d" % len(all_of.filtered(lambda o: not o.irr_pct)))
