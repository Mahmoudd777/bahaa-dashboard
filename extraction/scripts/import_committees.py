# -*- coding: utf-8 -*-
"""Record each committee's chair and correct its meeting cadence.

Every committee had been left on the field's default of "monthly". The
arrangements state a cadence for four of the six — one of them quarterly —
and say nothing for the other two, so those are cleared: an empty frequency
is the honest reading.
"""
import re

Committee = env["albaha.committee"].sudo()

DETAIL = {
    "اللجنة التنفيذية لصيف الباحة": ("أمين المنطقة", None),
    "اللجنة التنفيذية للاستثمار في المنطقة": ("وكيل إمارة المنطقة", "quarterly"),
    "الفريق المشترك لمنطقة الباحة مع فريق وزارة الصحة": ("وكيل الإمارة ووكيل الوزارة", "monthly"),
    "الفريق المشترك لمنطقة الباحة مع فريق وزارة الموارد البشرية": ("وكيل الإمارة ووكيل الوزارة", "monthly"),
    "الفريق المشترك لمنطقة الباحة مع فريق منظومة وزارة السياحة": ("وكيل الإمارة ووكيل الوزارة", "monthly"),
    "لجنة ريادة الاعمال في منطقة الباحة": (None, None),
}


def key_of(text):
    return re.sub(r"[^\w\u0600-\u06FF]", "", text or "")


wanted = {key_of(k): v for k, v in DETAIL.items()}
chairs, cadences, cleared, unmatched = 0, 0, 0, []

for record in Committee.search([]):
    detail = wanted.get(key_of(record.name))
    if not detail:
        unmatched.append(record.name[:44])
        continue
    chair, frequency = detail
    values = {}
    if chair and not record.chair_role:
        values["chair_role"] = chair
        chairs += 1
    if frequency:
        if record.frequency != frequency:
            values["frequency"] = frequency
            cadences += 1
    elif record.frequency:
        values["frequency"] = False
        cleared += 1
    if values:
        record.write(values)

env.cr.commit()
records = Committee.search([])
print("CMI chairs recorded: %d, cadences corrected: %d, unfounded defaults cleared: %d"
      % (chairs, cadences, cleared))
print("CMI unmatched: %s" % (unmatched or "none"))
for record in records:
    print("CMI   %-46s chair=%-26s freq=%s" % (
        record.name[:46], record.chair_role or "(not stated)",
        record.frequency or "(not stated)"))
