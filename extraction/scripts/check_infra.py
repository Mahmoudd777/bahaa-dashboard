# -*- coding: utf-8 -*-
"""Are the ten named infrastructure projects already among the loaded ones?"""
import re

Project = env["albaha.project"].sudo()

NAMES = [
    "توريد وتنفيذ أعمال خطوط أنابيب نقل مياه",
    "استكمال تنفيذ تطوير مطار الملك سعود بالباحة",
    "استكمال ربط محافظتي العقيق والقرى",
    "الأعمال المتبقية لمشروع الطرق الثانوية",
    "استكمالات بعض الطرق بمنطقة الباحة",
    "تزويد محطة الضخ في وادي عرده",
    "كلية الطب",
    "نقل المياه إلى عدد من الأودية",
    "محطة معالجة مياه الصرف الصحي بمحافظة المندق",
    "إنشاء المقرات البديلة",
]


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


records = Project.search([])
index = [(key_of(r.name), r) for r in records]
for needle in NAMES:
    k = key_of(needle)
    found = [r for key, r in index if k[:24] in key]
    if found:
        r = found[0]
        print("IFR FOUND   %-44s progress=%s cost=%s owner=%s" % (
            needle[:44], r.progress_pct, r.baseline_cost_sar_m, (r.owner_entity or "-")[:24]))
    else:
        print("IFR MISSING %s" % needle[:60])
