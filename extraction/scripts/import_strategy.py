# -*- coding: utf-8 -*-
"""Record the strategy, and the focus areas its two main pillars are built on.

The vision and mission run across the top of the strategic house; the owner
and the 2026-2030 span come from the registration held by the National
Performance Center. Both pages are images, which is why no text sweep found
them.

The house also names seven focus areas beneath the two main pillars — four
kinds of tourism and three agricultural enablers. They are the layer between
a pillar and its objectives, and `albaha.sector` was built for exactly this
and had stood empty.
"""
Strategy = env["albaha.strategy"].sudo()
Pillar = env["albaha.pillar"].sudo()
Sector = env["albaha.sector"].sudo()

VISION = ("أن تكون الباحة منطقة حيوية على مدار العام، تبني على إمكانياتها "
          "السياحية والزراعية لتحسين جودة الحياة ورفع مساهمتها الاقتصادية")
MISSION = ("نهدف إلى تحسين جودة الحياة، وتعزيز السياحة، ودعم النمو الاقتصادي "
           "من خلال تحفيز الاستثمارات وجذب الزوار، وذلك لتطوير الباحة إلى "
           "منطقة حيوية ومستدامة من خلال الاستفادة من ممكناتها الطبيعية "
           "وتراثها الثقافي")

FOCUS_AREAS = [
    ("السياحة الصحية", "السياحة", "TOUR-01"),
    ("السياحة الطبيعية", "السياحة", "TOUR-02"),
    ("السياحة الرياضية", "السياحة", "TOUR-03"),
    ("السياحة الثقافية", "السياحة", "TOUR-04"),
    ("تمكين التحول الزراعي", "الزراعة والصناعات المرتبطة", "AGRI-01"),
    ("تمكين زراعة المحاصيل النوعية", "الزراعة والصناعات المرتبطة", "AGRI-02"),
    ("تمكين الصناعات التكميلية والتحويلية لقطاع الزراعة",
     "الزراعة والصناعات المرتبطة", "AGRI-03"),
]

record = Strategy.search([], limit=1)
values = {
    "name": "إستراتيجية تطوير منطقة الباحة",
    "owner_entity": "المكتب الاستراتيجي لتطوير منطقة الباحة",
    "vision": VISION,
    "mission": MISSION,
    "start_year": 2026,
    "end_year": 2030,
    "budget_sar_m": 100.0,
    "source_reference": "البيت الاستراتيجي وبطاقة التسجيل لدى مركز أداء (صور)",
}
if record:
    record.write(values)
else:
    record = Strategy.create(values)

pillars = Pillar.search([])
for pillar in pillars:
    if not pillar.strategy_id:
        pillar.strategy_id = record.id

by_name = {p.name.strip(): p for p in pillars}
created = 0
for name, pillar_name, code in FOCUS_AREAS:
    pillar = by_name.get(pillar_name)
    existing = Sector.search([("name", "=", name)], limit=1)
    if existing:
        continue
    Sector.create({
        "name": name,
        "code": code,
        "primary_pillar_id": pillar.id if pillar else False,
    })
    created += 1

env.cr.commit()

print("STR strategy: %s (%d-%d), budget %.0f m" % (
    record.name, record.start_year, record.end_year, record.budget_sar_m))
print("STR vision recorded: %s | mission recorded: %s" % (
    bool(record.vision), bool(record.mission)))
print("STR pillars linked to the strategy: %d/%d" % (
    len(pillars.filtered("strategy_id")), len(pillars)))
print("STR focus areas created: %d, total: %d" % (created, Sector.search_count([])))
for pillar in Pillar.search([]):
    under = Sector.search([("primary_pillar_id", "=", pillar.id)])
    if under:
        print("STR   %-28s %s" % (pillar.name, " | ".join(under.mapped("name"))))
