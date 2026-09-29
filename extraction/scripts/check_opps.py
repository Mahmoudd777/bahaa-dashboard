# -*- coding: utf-8 -*-
"""Read the opportunities back and check the links hold."""
Opportunity = env["albaha.investment.opportunity"].sudo()
records = Opportunity.search([], order="number")
print("OPPCHK count %d, numbers 1..%d contiguous: %s" % (
    len(records), max(records.mapped("number")),
    sorted(records.mapped("number")) == list(range(1, len(records) + 1))))
by_program = {}
for record in records:
    by_program.setdefault(record.program_id.name or "-", []).append(record)
for name, group in by_program.items():
    print("OPPCHK %-36s %2d opportunities, %5d direct jobs, NPV %7.1f" % (
        name, len(group), sum(o.jobs_direct for o in group),
        sum(o.npv_sar_m for o in group)))
worst = records.sorted("irr_pct")[:1]
best = records.sorted("irr_pct")[-1:]
print("OPPCHK IRR range %.1f%% (%s) to %.1f%% (%s)" % (
    worst.irr_pct, worst.name[:28], best.irr_pct, best.name[:28]))
print("OPPCHK with a revenue line: %d" % len(records.filtered("revenue_2030_sar_m")))
print("OPPCHK sample: %s | %s" % (records[0].name, records[0].source_reference))
