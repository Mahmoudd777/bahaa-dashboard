# -*- coding: utf-8 -*-
"""The last two sets the image sweep turned up.

The English vision and mission, stated beside the Arabic on the page where
three candidate wordings were compared; and the three committees that govern
the office itself, which the organisation chart names and which are a
different thing from the six regional committees already recorded.
"""
Strategy = env["albaha.strategy"].sudo()
Committee = env["albaha.committee"].sudo()

VISION_EN = ("For Al-Baha to be a vibrant region all year round with a unique "
             "identity defined by its nature and heritage, and an icon for "
             "tourism in an environment that supports living with the best "
             "quality of life, business and investments.")
MISSION_EN = ("We aim to enhance quality of life, promote tourism, and foster "
              "economic growth through investments and visitors' attraction. "
              "To develop Al-Baha into a vibrant, sustainable region by "
              "leveraging its natural landscapes and cultural heritage.")

record = Strategy.search([], limit=1)
if record:
    if not record.vision_en:
        record.vision_en = VISION_EN
    if not record.mission_en:
        record.mission_en = MISSION_EN

OFFICE_COMMITTEES = [
    ("اللجنة الإشرافية للمكتب الاستراتيجي لتطوير منطقة الباحة", "strategic",
     "الإشراف على المكتب الاستراتيجي واعتماد توجهاته، وينبثق عنها أمانة اللجنة "
     "الإشرافية ولجنة الترشيحات والمكافآت ولجنة المراجعة."),
    ("لجنة الترشيحات والمكافآت", "strategic",
     "لجنة منبثقة عن اللجنة الإشرافية للمكتب الاستراتيجي."),
    ("لجنة المراجعة", "strategic",
     "لجنة منبثقة عن اللجنة الإشرافية للمكتب الاستراتيجي."),
]

created = 0
for name, tier, scope in OFFICE_COMMITTEES:
    if Committee.search_count([("name", "=", name)]):
        continue
    Committee.create({"name": name, "tier": tier, "scope": scope})
    created += 1

env.cr.commit()

print("FIN English vision recorded: %s, mission: %s" % (
    bool(record.vision_en), bool(record.mission_en)))
print("FIN office committees created: %d, committees now: %d" % (
    created, Committee.search_count([])))
for c in Committee.search([], order="tier, id"):
    print("FIN   %-9s %s" % (c.tier or "-", c.name[:56]))
