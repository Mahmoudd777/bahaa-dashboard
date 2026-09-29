# -*- coding: utf-8 -*-
"""Spot-check a pillar's indicator targets against the strategic house deck."""
Kpi = env["albaha.kpi"].sudo()
for needle in ["وجهات الاستجمام", "الزوار السياحيين", "الإنفاق السياحي",
               "التوصية بالوجهة", "رضا الزوار"]:
    record = Kpi.search([("name", "like", needle)], limit=1)
    if not record:
        print("SPT %s not found" % needle)
        continue
    periods = record.value_ids.filtered(
        lambda v: v.period in ("2026", "2027", "2028", "2029", "2030")).sorted("period")
    print("SPT %-24s baseline %-8s  %s" % (
        needle, record.baseline_value,
        " ".join("%s=%g" % (v.period, v.target_value) for v in periods)))
